import { 
  CloudConfig,
  ICloudSyncService,
  SyncOperation,
  SyncStats,
  ConflictResolution,
  DeviceInfo,
  SyncQueueItem,
  SyncMetadata,
  CloudError,
  SyncError,
  ConflictError
} from '../types/Cloud';
import { cloudNetworkService } from './CloudNetworkService';
import { storageService } from './StorageService';

class CloudSyncService implements ICloudSyncService {
  private static instance: CloudSyncService;
  private isInitialized = false;
  private config: CloudConfig | null = null;
  private syncQueue: Map<string, SyncQueueItem> = new Map();
  private listeners: Set<(stats: SyncStats) => void> = new Set();
  private isProcessingQueue = false;
  private deviceInfo: DeviceInfo | null = null;
  private syncStats: SyncStats = {
    lastSyncAt: null,
    pendingOperations: 0,
    completedOperations: 0,
    failedOperations: 0,
    conflictsResolved: 0,
    totalDataSynced: 0,
    averageSyncTime: 0,
    isOnline: false,
    lastOnlineAt: null
  };

  private constructor() {
    this.setupNetworkMonitoring();
  }

  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  public async initialize(config: CloudConfig): Promise<void> {
    if (this.isInitialized) {
      console.warn('CloudSyncService already initialized');
      return;
    }

    this.config = config;
    
    // Initialize device info
    await this.initializeDeviceInfo();
    
    // Load persisted sync data
    await this.loadSyncData();
    
    // Start background sync processing
    this.startBackgroundSync();
    
    this.isInitialized = true;
    console.log('☁️ CloudSyncService initialized with provider:', config.provider);
  }

  private setupNetworkMonitoring(): void {
    cloudNetworkService.onStatusChange((status) => {
      const wasOnline = this.syncStats.isOnline;
      this.syncStats.isOnline = status.isOnline;
      
      if (!wasOnline && status.isOnline) {
        this.syncStats.lastOnlineAt = new Date().toISOString();
        console.log('🔄 Network came online, starting sync...');
        this.processQueue();
      }
      
      this.notifyListeners();
    });
  }

  private async initializeDeviceInfo(): Promise<void> {
    const deviceId = await this.getDeviceId();
    const platform = this.getPlatform();
    const appVersion = await this.getAppVersion();
    
    this.deviceInfo = {
      deviceId,
      deviceName: await this.getDeviceName(),
      platform,
      appVersion,
      lastSyncAt: null,
      isActive: true,
      registeredAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString()
    };
    
    // Register device with cloud
    await this.registerDevice(this.deviceInfo);
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await StorageService.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await StorageService.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private getPlatform(): 'web' | 'ios' | 'android' {
    // Simple platform detection
    if (typeof window !== 'undefined') {
      return 'web';
    }
    // In a real React Native app, you would use Platform.OS
    return 'web'; // Default fallback
  }

  private async getAppVersion(): Promise<string> {
    // In a real app, this would come from app config or package.json
    return '1.0.0';
  }

  private async getDeviceName(): Promise<string> {
    // Get a friendly device name
    if (typeof window !== 'undefined') {
      return `${navigator.platform} - ${navigator.userAgent.split(' ')[0]}`;
    }
    return 'Unknown Device';
  }

  private async loadSyncData(): Promise<void> {
    try {
      // Load sync stats
      const savedStats = await StorageService.getItem('sync_stats');
      if (savedStats) {
        this.syncStats = { ...this.syncStats, ...JSON.parse(savedStats) };
      }
      
      // Load sync queue
      const savedQueue = await StorageService.getItem('sync_queue');
      if (savedQueue) {
        const queueData = JSON.parse(savedQueue) as SyncQueueItem[];
        queueData.forEach(item => {
          this.syncQueue.set(item.id, item);
        });
        this.syncStats.pendingOperations = this.syncQueue.size;
      }
      
      console.log(`🔄 Loaded ${this.syncQueue.size} pending sync operations`);
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  }

  private async saveSyncData(): Promise<void> {
    try {
      await StorageService.setItem('sync_stats', JSON.stringify(this.syncStats));
      await StorageService.setItem('sync_queue', JSON.stringify(Array.from(this.syncQueue.values())));
    } catch (error) {
      console.error('Failed to save sync data:', error);
    }
  }

  private startBackgroundSync(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      if (cloudNetworkService.isOnline() && !this.isProcessingQueue) {
        this.processQueue();
      }
    }, 30000);
    
    // Update heartbeat every 5 minutes
    setInterval(() => {
      this.updateHeartbeat();
    }, 300000);
  }

  private async updateHeartbeat(): Promise<void> {
    if (this.deviceInfo) {
      this.deviceInfo.lastHeartbeat = new Date().toISOString();
      // In a real implementation, this would update the cloud database
      console.log('💓 Device heartbeat updated');
    }
  }

  public async syncUp(entityType: string, data: any[]): Promise<SyncStats> {
    this.ensureInitialized();
    
    console.log(`⬆️ Syncing up ${data.length} ${entityType} items`);
    const startTime = Date.now();
    
    try {
      // Create sync operations for each item
      const operations = data.map(item => this.createSyncOperation('create', entityType, item));
      
      // Add to queue
      for (const operation of operations) {
        await this.addToQueue(operation, 'normal');
      }
      
      // Process queue if online
      if (cloudNetworkService.isOnline()) {
        await this.processQueue();
      }
      
      const executionTime = Date.now() - startTime;
      this.syncStats.averageSyncTime = (this.syncStats.averageSyncTime + executionTime) / 2;
      this.syncStats.totalDataSynced += data.length;
      
      await this.saveSyncData();
      this.notifyListeners();
      
      return this.syncStats;
    } catch (error) {
      console.error(`Failed to sync up ${entityType}:`, error);
      throw new SyncError(`Sync up failed for ${entityType}`, operations[0]);
    }
  }

  public async syncDown(entityType: string, lastSyncAt?: string): Promise<any[]> {
    this.ensureInitialized();
    
    if (!cloudNetworkService.isOnline()) {
      console.log('📱 Offline: returning empty sync down result');
      return [];
    }
    
    console.log(`⬇️ Syncing down ${entityType} since ${lastSyncAt || 'beginning'}`);
    
    try {
      // In a real implementation, this would fetch from cloud database
      // For now, return empty array as placeholder
      const cloudData: any[] = [];
      
      this.syncStats.lastSyncAt = new Date().toISOString();
      await this.saveSyncData();
      this.notifyListeners();
      
      return cloudData;
    } catch (error) {
      console.error(`Failed to sync down ${entityType}:`, error);
      throw new SyncError(`Sync down failed for ${entityType}`, this.createSyncOperation('create', entityType, {}));
    }
  }

  public async fullSync(): Promise<SyncStats> {
    this.ensureInitialized();
    
    console.log('🔄 Starting full synchronization...');
    const startTime = Date.now();
    
    try {
      if (!cloudNetworkService.isOnline()) {
        throw new SyncError('Cannot perform full sync while offline', this.createSyncOperation('create', 'all', {}));
      }
      
      // Process all pending operations first
      await this.processQueue();
      
      // Sync down all entity types
      const entityTypes = ['products', 'sales', 'users', 'suppliers', 'inventory'];
      
      for (const entityType of entityTypes) {
        await this.syncDown(entityType, this.syncStats.lastSyncAt || undefined);
      }
      
      const executionTime = Date.now() - startTime;
      this.syncStats.averageSyncTime = executionTime;
      this.syncStats.lastSyncAt = new Date().toISOString();
      
      await this.saveSyncData();
      this.notifyListeners();
      
      console.log(`✅ Full sync completed in ${executionTime}ms`);
      return this.syncStats;
    } catch (error) {
      console.error('Full sync failed:', error);
      this.syncStats.failedOperations++;
      throw error;
    }
  }

  public async addToQueue(operation: SyncOperation, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: operation.id,
      operation,
      priority,
      retryPolicy: {
        maxRetries: priority === 'critical' ? 10 : 3,
        backoffStrategy: 'exponential',
        baseDelay: 1000
      },
      createdAt: new Date().toISOString()
    };
    
    this.syncQueue.set(operation.id, queueItem);
    this.syncStats.pendingOperations = this.syncQueue.size;
    
    await this.saveSyncData();
    this.notifyListeners();
    
    console.log(`➕ Added ${operation.entityType} operation to sync queue (${priority} priority)`);
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !cloudNetworkService.isOnline()) {
      return;
    }
    
    this.isProcessingQueue = true;
    console.log(`🔄 Processing sync queue: ${this.syncQueue.size} operations`);
    
    try {
      // Sort queue items by priority and creation time
      const sortedItems = Array.from(this.syncQueue.values()).sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      
      for (const queueItem of sortedItems) {
        try {
          await this.processQueueItem(queueItem);
          
          // Remove from queue on success
          this.syncQueue.delete(queueItem.id);
          this.syncStats.completedOperations++;
          this.syncStats.pendingOperations = this.syncQueue.size;
          
        } catch (error) {
          console.error(`Failed to process queue item ${queueItem.id}:`, error);
          
          // Handle retries
          if (queueItem.operation.retryCount < queueItem.retryPolicy.maxRetries) {
            queueItem.operation.retryCount++;
            queueItem.operation.errorMessage = error instanceof Error ? error.message : String(error);
            
            // Calculate delay for next retry
            const delay = this.calculateRetryDelay(queueItem);
            queueItem.scheduledAt = new Date(Date.now() + delay).toISOString();
            
            console.log(`🔄 Retry ${queueItem.operation.retryCount}/${queueItem.retryPolicy.maxRetries} scheduled for ${queueItem.scheduledAt}`);
          } else {
            // Max retries reached, mark as failed
            this.syncQueue.delete(queueItem.id);
            this.syncStats.failedOperations++;
            this.syncStats.pendingOperations = this.syncQueue.size;
            
            console.error(`❌ Operation ${queueItem.id} failed after ${queueItem.retryPolicy.maxRetries} retries`);
          }
        }
      }
      
      await this.saveSyncData();
      this.notifyListeners();
      
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processQueueItem(queueItem: SyncQueueItem): Promise<void> {
    const { operation } = queueItem;
    
    // Check if item is scheduled for later
    if (queueItem.scheduledAt && new Date(queueItem.scheduledAt) > new Date()) {
      return; // Skip this item for now
    }
    
    queueItem.startedAt = new Date().toISOString();
    operation.status = 'processing';
    
    // In a real implementation, this would perform the actual cloud operation
    // For now, simulate the operation
    await this.simulateCloudOperation(operation);
    
    operation.status = 'completed';
    queueItem.completedAt = new Date().toISOString();
    
    console.log(`✅ Completed ${operation.operation} ${operation.entityType} operation`);
  }

  private async simulateCloudOperation(operation: SyncOperation): Promise<void> {
    // Simulate network delay
    const delay = 500 + Math.random() * 1500; // 500-2000ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.05) { // 5% failure rate
      throw new Error('Simulated cloud operation failure');
    }
    
    console.log(`☁️ Simulated ${operation.operation} ${operation.entityType} operation completed`);
  }

  private calculateRetryDelay(queueItem: SyncQueueItem): number {
    const { retryPolicy, operation } = queueItem;
    const { backoffStrategy, baseDelay } = retryPolicy;
    const attempt = operation.retryCount;
    
    switch (backoffStrategy) {
      case 'linear':
        return baseDelay * attempt;
      case 'exponential':
        return baseDelay * Math.pow(2, attempt);
      case 'fixed':
      default:
        return baseDelay;
    }
  }

  public async clearQueue(): Promise<void> {
    this.syncQueue.clear();
    this.syncStats.pendingOperations = 0;
    await this.saveSyncData();
    this.notifyListeners();
    console.log('🗑️ Sync queue cleared');
  }

  public async resolveConflict(conflict: ConflictResolution): Promise<void> {
    this.ensureInitialized();
    
    console.log(`🔀 Resolving conflict for ${conflict.entityType}:${conflict.entityId}`);
    
    try {
      // Mark conflict as resolved
      conflict.resolvedAt = new Date().toISOString();
      conflict.autoResolved = conflict.resolution !== 'manual';

      // Apply the conflict resolution
      switch (conflict.resolution) {
        case 'use_local':
          // Keep local version, update cloud
          await this.addToQueue(
            this.createSyncOperation('update', conflict.entityType, conflict.localVersion),
            'high'
          );
          break;
          
        case 'use_cloud':
          // Keep cloud version, update local storage
          await StorageService.setItem(
            `${conflict.entityType}_${conflict.entityId}`,
            JSON.stringify(conflict.cloudVersion)
          );
          break;
          
        case 'merge':
          // Use merged data
          if (conflict.resolvedData) {
            await StorageService.setItem(
              `${conflict.entityType}_${conflict.entityId}`,
              JSON.stringify(conflict.resolvedData)
            );
            await this.addToQueue(
              this.createSyncOperation('update', conflict.entityType, conflict.resolvedData),
              'high'
            );
          }
          break;
          
        case 'manual':
          // Wait for manual resolution
          console.log('⏳ Manual conflict resolution required');
          return;
      }
      
      this.syncStats.conflictsResolved++;
      await this.saveSyncData();
      this.notifyListeners();
      
      console.log(`✅ Conflict resolved using ${conflict.resolution} strategy`);
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw new ConflictError('Conflict resolution failed', conflict);
    }
  }

  public async getConflicts(): Promise<ConflictResolution[]> {
    this.ensureInitialized();
    
    try {
      const conflicts = await StorageService.getItem('sync_conflicts');
      return conflicts ? JSON.parse(conflicts) : [];
    } catch (error) {
      console.error('Failed to get conflicts:', error);
      return [];
    }
  }

  public async getSyncStats(): Promise<SyncStats> {
    return { ...this.syncStats };
  }

  public onSyncStatusChanged(callback: (stats: SyncStats) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current stats
    callback(this.syncStats);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  public async registerDevice(info: DeviceInfo): Promise<void> {
    this.ensureInitialized();
    
    try {
      // In a real implementation, this would register with cloud database
      await StorageService.setItem('device_info', JSON.stringify(info));
      console.log(`📱 Device registered: ${info.deviceName} (${info.platform})`);
    } catch (error) {
      console.error('Failed to register device:', error);
      throw new CloudError('DEVICE_REGISTRATION_FAILED', 'Failed to register device', { info });
    }
  }

  public async getDevices(): Promise<DeviceInfo[]> {
    this.ensureInitialized();
    
    try {
      // In a real implementation, this would fetch from cloud database
      // For now, return current device only
      return this.deviceInfo ? [this.deviceInfo] : [];
    } catch (error) {
      console.error('Failed to get devices:', error);
      return [];
    }
  }

  private createSyncOperation(operation: 'create' | 'update' | 'delete', entityType: string, data: any): SyncOperation {
    return {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      entityType,
      entityId: data.id || `temp_${Date.now()}`,
      localData: data,
      timestamp: new Date().toISOString(),
      deviceId: this.deviceInfo?.deviceId || 'unknown',
      userId: data.userId || 'unknown',
      status: 'pending',
      retryCount: 0
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.syncStats);
      } catch (error) {
        console.error('Error in sync status listener:', error);
      }
    });
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new CloudError('SYNC_NOT_INITIALIZED', 'CloudSyncService not initialized');
    }
  }
}

export const cloudSyncService = CloudSyncService.getInstance();
export { CloudSyncService };
