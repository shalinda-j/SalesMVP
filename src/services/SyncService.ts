import { v4 as uuidv4 } from 'uuid';
import { database } from '../stores/Database';
import { networkService } from './NetworkService';
import { cloudStorageService } from './CloudStorageService';
import {
  ISyncService,
  SyncMetadata,
  SyncOperation,
  SyncStatus,
  ConflictResolution,
  SyncConflict,
  SyncStats,
  SyncConfig,
  CloudSyncData,
  SyncQueueItem
} from '../types/Sync';
import { productService } from './ProductService';
import { salesService } from './SimpleSalesService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class SyncService implements ISyncService {
  private static instance: SyncService;
  private isRunning = false;
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private deviceId: string;
  private config: SyncConfig;
  private syncQueue: SyncQueueItem[] = [];

  private readonly CONFIG_KEY = 'SYNC_CONFIG';
  private readonly DEVICE_ID_KEY = 'DEVICE_ID';

  private constructor() {
    this.deviceId = '';
    this.config = this.getDefaultConfig();
    this.initialize();
  }

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize device ID
      await this.initializeDeviceId();
      
      // Load sync configuration
      await this.loadConfig();
      
      // Start network monitoring
      networkService.onNetworkChange((state) => {
        if (state.is_online && this.config.auto_sync_enabled) {
          this.startPeriodicSync();
        } else {
          this.stopPeriodicSync();
        }
      });

      console.log('SyncService initialized with device ID:', this.deviceId);
    } catch (error) {
      console.error('Failed to initialize SyncService:', error);
    }
  }

  private async initializeDeviceId(): Promise<void> {
    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);
      
      if (!deviceId) {
        deviceId = uuidv4();
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
      }
      
      this.deviceId = deviceId;
    } catch (error) {
      console.error('Failed to initialize device ID:', error);
      // Fallback to timestamp-based ID
      this.deviceId = `device_${Date.now()}`;
    }
  }

  private getDefaultConfig(): SyncConfig {
    return {
      auto_sync_enabled: true,
      sync_interval_minutes: 5,
      max_retry_attempts: 3,
      conflict_resolution_strategy: ConflictResolution.LOCAL_WINS,
      device_id: this.deviceId
    };
  }

  private async loadConfig(): Promise<void> {
    try {
      const configString = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configString) {
        this.config = { ...this.getDefaultConfig(), ...JSON.parse(configString) };
      } else {
        await this.saveConfig();
      }
    } catch (error) {
      console.error('Failed to load sync config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save sync config:', error);
    }
  }

  public async startSync(): Promise<void> {
    if (this.isRunning) {
      console.log('Sync is already running');
      return;
    }

    try {
      this.isRunning = true;
      console.log('Starting sync service...');

      // Initial sync
      await this.performFullSync();
      
      // Start periodic sync if auto-sync is enabled
      if (this.config.auto_sync_enabled) {
        this.startPeriodicSync();
      }

      console.log('Sync service started successfully');
    } catch (error) {
      console.error('Failed to start sync service:', error);
      this.isRunning = false;
    }
  }

  public async stopSync(): Promise<void> {
    this.isRunning = false;
    this.stopPeriodicSync();
    console.log('Sync service stopped');
  }

  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const intervalMs = this.config.sync_interval_minutes * 60 * 1000;
    this.syncInterval = setInterval(async () => {
      try {
        await this.performIncrementalSync();
      } catch (error) {
        console.error('Periodic sync failed:', error);
      }
    }, intervalMs);
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private async performFullSync(): Promise<void> {
    console.log('Performing full sync...');
    
    try {
      // Upload local data to cloud
      await this.uploadLocalData();
      
      // Download remote data and merge
      await this.downloadRemoteData();
      
      // Process sync queue
      await this.processSyncQueue();
      
      // Update last sync timestamp
      this.config.last_sync_timestamp = new Date().toISOString();
      await this.saveConfig();
      
      console.log('Full sync completed successfully');
    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  private async performIncrementalSync(): Promise<void> {
    console.log('Performing incremental sync...');
    
    try {
      // Only sync changes since last sync
      await this.uploadPendingChanges();
      await this.downloadRecentChanges();
      await this.processSyncQueue();
      
      this.config.last_sync_timestamp = new Date().toISOString();
      await this.saveConfig();
      
      console.log('Incremental sync completed successfully');
    } catch (error) {
      console.error('Incremental sync failed:', error);
    }
  }

  private async uploadLocalData(): Promise<void> {
    try {
      const products = await productService.getAllProducts();
      const sales = await salesService.getAllSales();
      
      const cloudData: CloudSyncData = {
        device_id: this.deviceId,
        timestamp: new Date().toISOString(),
        version: 1,
        data: {
          products,
          sales
        },
        metadata: {
          total_records: products.length + sales.length,
          checksum: this.calculateChecksum({ products, sales }),
          schema_version: '1.0.0'
        }
      };

      const success = await cloudStorageService.uploadWithRetry(cloudData);
      if (!success) {
        throw new Error('Failed to upload local data to cloud');
      }
    } catch (error) {
      console.error('Failed to upload local data:', error);
      throw error;
    }
  }

  private async uploadPendingChanges(): Promise<void> {
    // In a real implementation, this would track and upload only changed records
    // For simplicity, we'll do a full upload for now
    await this.uploadLocalData();
  }

  private async downloadRemoteData(): Promise<void> {
    try {
      const remoteData = await cloudStorageService.download();
      
      if (!remoteData || remoteData.device_id === this.deviceId) {
        console.log('No remote data to download or data is from same device');
        return;
      }

      // Merge remote data with local data
      await this.mergeRemoteData(remoteData);
    } catch (error) {
      console.error('Failed to download remote data:', error);
      throw error;
    }
  }

  private async downloadRecentChanges(): Promise<void> {
    // For now, just do a full download
    await this.downloadRemoteData();
  }

  private async mergeRemoteData(remoteData: CloudSyncData): Promise<void> {
    try {
      console.log('Merging remote data from device:', remoteData.device_id);
      
      // For simplicity, we'll use a "remote wins" strategy for this demo
      // In production, this would implement proper conflict resolution
      
      if (remoteData.data.products) {
        // Merge products (for demo, just add missing ones)
        const localProducts = await productService.getAllProducts();
        const localSKUs = new Set(localProducts.map(p => p.sku));
        
        for (const remoteProduct of remoteData.data.products) {
          if (!localSKUs.has(remoteProduct.sku)) {
            try {
              await productService.createProduct({
                sku: remoteProduct.sku,
                name: remoteProduct.name,
                price: remoteProduct.price,
                cost: remoteProduct.cost,
                stock_qty: remoteProduct.stock_qty,
                tax_rate: remoteProduct.tax_rate
              });
              console.log('Added remote product:', remoteProduct.name);
            } catch (error) {
              console.warn('Failed to add remote product:', error);
            }
          }
        }
      }
      
      // Note: For sales data, we typically wouldn't merge from other devices
      // as they represent device-specific transactions
      
      console.log('Remote data merge completed');
    } catch (error) {
      console.error('Failed to merge remote data:', error);
      throw error;
    }
  }

  private async processSyncQueue(): Promise<void> {
    // Process any queued sync operations
    for (const item of this.syncQueue) {
      try {
        await this.processSyncQueueItem(item);
        // Remove from queue after successful processing
        this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
      } catch (error) {
        console.error('Failed to process sync queue item:', error);
        item.retry_count++;
        item.last_error = error instanceof Error ? error.message : 'Unknown error';
        
        if (item.retry_count >= this.config.max_retry_attempts) {
          console.error('Max retries reached for sync item:', item.id);
          this.syncQueue = this.syncQueue.filter(q => q.id !== item.id);
        }
      }
    }
  }

  private async processSyncQueueItem(item: SyncQueueItem): Promise<void> {
    // Process individual sync queue items
    // This would handle create/update/delete operations
    console.log('Processing sync queue item:', item.operation, item.table_name);
  }

  public async syncTable(tableName: string): Promise<void> {
    console.log('Syncing table:', tableName);
    
    try {
      switch (tableName) {
        case 'products':
          await this.syncProducts();
          break;
        case 'sales':
          await this.syncSales();
          break;
        default:
          console.warn('Unknown table for sync:', tableName);
      }
    } catch (error) {
      console.error(`Failed to sync table ${tableName}:`, error);
      throw error;
    }
  }

  private async syncProducts(): Promise<void> {
    // Sync products table specifically
    const products = await productService.getAllProducts();
    console.log(`Syncing ${products.length} products`);
  }

  private async syncSales(): Promise<void> {
    // Sync sales table specifically
    const sales = await salesService.getAllSales();
    console.log(`Syncing ${sales.length} sales`);
  }

  public async resolveConflict(
    conflictId: string,
    resolution: ConflictResolution,
    resolvedData?: any
  ): Promise<void> {
    console.log('Resolving conflict:', conflictId, resolution);
    
    // In a real implementation, this would apply the resolution
    // and update the database with the resolved data
  }

  public async getSyncStats(): Promise<SyncStats> {
    return {
      total_pending: this.syncQueue.length,
      total_syncing: 0,
      total_synced: 0,
      total_failed: 0,
      total_conflicts: 0,
      last_sync_time: this.config.last_sync_timestamp
    };
  }

  public async getConflicts(): Promise<SyncConflict[]> {
    // Return any unresolved conflicts
    return [];
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public getConfig(): SyncConfig {
    return { ...this.config };
  }

  public async updateConfig(updates: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfig();
    
    // Restart sync if needed
    if (this.isRunning && updates.auto_sync_enabled !== undefined) {
      if (updates.auto_sync_enabled) {
        this.startPeriodicSync();
      } else {
        this.stopPeriodicSync();
      }
    }
  }

  public isOnline(): boolean {
    return networkService.isOnline();
  }

  public getNetworkState() {
    return networkService.getNetworkState();
  }

  private calculateChecksum(data: any): string {
    // Simple checksum calculation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Add operation to sync queue
   */
  public queueSyncOperation(
    operation: SyncOperation,
    tableName: string,
    recordId: string,
    data: any,
    priority: number = 1
  ): void {
    const queueItem: SyncQueueItem = {
      id: uuidv4(),
      operation,
      table_name: tableName,
      record_id: recordId,
      data,
      priority,
      created_at: new Date().toISOString(),
      retry_count: 0
    };
    
    this.syncQueue.push(queueItem);
    
    // Sort by priority (higher priority first)
    this.syncQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Force immediate sync
   */
  public async forceSyncNow(): Promise<void> {
    if (!networkService.isOnline()) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.performFullSync();
  }

  /**
   * Clear all sync data and start fresh
   */
  public async resetSync(): Promise<void> {
    this.syncQueue = [];
    this.config.last_sync_timestamp = undefined;
    await this.saveConfig();
    console.log('Sync data reset');
  }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
export { SyncService };
