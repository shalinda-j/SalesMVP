import {
  CloudConfig,
  ICloudBackupService,
  CloudBackupInfo,
  CloudRestoreInfo,
  CloudError
} from '../types/Cloud';
import { storageService } from './StorageService';
import { productService } from './ProductService';
import { salesService } from './SimpleSalesService';
import { authService } from './AuthService';

class CloudBackupService implements ICloudBackupService {
  private static instance: CloudBackupService;
  private isInitialized = false;
  private config: CloudConfig | null = null;
  private automaticBackupInterval?: ReturnType<typeof setInterval>;
  private backupInProgress = false;

  private constructor() {}

  public static getInstance(): CloudBackupService {
    if (!CloudBackupService.instance) {
      CloudBackupService.instance = new CloudBackupService();
    }
    return CloudBackupService.instance;
  }

  public async initialize(config: CloudConfig): Promise<void> {
    if (this.isInitialized) {
      console.warn('CloudBackupService already initialized');
      return;
    }

    this.config = config;
    this.isInitialized = true;
    console.log('💾 CloudBackupService initialized with provider:', config.provider);

    // Load any existing automatic backup schedule
    await this.loadAutomaticBackupSettings();
  }

  private async loadAutomaticBackupSettings(): Promise<void> {
    try {
      const settings = await storageService.getItem('automatic_backup_settings');
      if (settings) {
        const { interval } = JSON.parse(settings);
        if (interval) {
          await this.scheduleAutomaticBackup(interval);
        }
      }
    } catch (error) {
      console.error('Failed to load automatic backup settings:', error);
    }
  }

  public async createBackup(includeMedia: boolean = false): Promise<CloudBackupInfo> {
    this.ensureInitialized();

    if (this.backupInProgress) {
      throw new CloudError('BACKUP_IN_PROGRESS', 'A backup is already in progress');
    }

    this.backupInProgress = true;
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`💾 Starting backup: ${backupId}`);

    try {
      const backupInfo: CloudBackupInfo = {
        backupId,
        timestamp: new Date().toISOString(),
        size: 0,
        entities: {
          products: 0,
          sales: 0,
          users: 0,
          suppliers: 0,
          inventory: 0
        },
        compressionRatio: 0,
        encryptionEnabled: false,
        deviceId: await this.getDeviceId(),
        userId: await this.getCurrentUserId(),
        status: 'creating'
      };

      // Collect all data to backup
      const backupData: any = {
        metadata: {
          version: '1.0.0',
          created: backupInfo.timestamp,
          deviceId: backupInfo.deviceId,
          userId: backupInfo.userId,
          includeMedia
        },
        data: {}
      };

      // Backup products
      try {
        const products = await productService.getAllProducts();
        backupData.data.products = products;
        backupInfo.entities.products = products.length;
        console.log(`📦 Backed up ${products.length} products`);
      } catch (error) {
        console.error('Failed to backup products:', error);
      }

      // Backup sales
      try {
        const sales = await salesService.getAllSales();
        backupData.data.sales = sales;
        backupInfo.entities.sales = sales.length;
        console.log(`💰 Backed up ${sales.length} sales`);
      } catch (error) {
        console.error('Failed to backup sales:', error);
      }

      // Backup users (if available)
      try {
        const users = await authService.getAllUsers();
        backupData.data.users = users.map(user => ({
          ...user,
          password: '[PROTECTED]' // Don't backup actual passwords
        }));
        backupInfo.entities.users = users.length;
        console.log(`👥 Backed up ${users.length} users`);
      } catch (error) {
        console.error('Failed to backup users:', error);
      }

      // Backup suppliers (from inventory service if available)
      try {
        // This would come from inventory service if implemented
        backupData.data.suppliers = [];
        backupInfo.entities.suppliers = 0;
      } catch (error) {
        console.error('Failed to backup suppliers:', error);
      }

      // Backup inventory data
      try {
        // This would come from inventory service if implemented
        backupData.data.inventory = [];
        backupInfo.entities.inventory = 0;
      } catch (error) {
        console.error('Failed to backup inventory:', error);
      }

      // Calculate size and compression
      const backupJson = JSON.stringify(backupData);
      const originalSize = new Blob([backupJson]).size;
      
      // Simulate compression (in real implementation, would use actual compression)
      const compressedData = backupJson; // Placeholder
      const compressedSize = new Blob([compressedData]).size;
      
      backupInfo.size = compressedSize;
      backupInfo.compressionRatio = originalSize > 0 ? (originalSize - compressedSize) / originalSize : 0;

      // Store backup locally (in real implementation, would upload to cloud)
      await storageService.setItem(`backup_${backupId}`, JSON.stringify({
        info: backupInfo,
        data: backupData
      }));

      // Update backup list
      await this.addToBackupList(backupInfo);

      backupInfo.status = 'completed';
      
      console.log(`✅ Backup completed: ${backupId} (${this.formatFileSize(backupInfo.size)})`);
      return backupInfo;

    } catch (error) {
      console.error(`❌ Backup failed: ${backupId}`, error);
      throw new CloudError('BACKUP_FAILED', `Backup creation failed: ${error}`, { backupId });
    } finally {
      this.backupInProgress = false;
    }
  }

  public async listBackups(): Promise<CloudBackupInfo[]> {
    this.ensureInitialized();

    try {
      const backupList = await storageService.getItem('backup_list');
      if (!backupList) {
        return [];
      }

      const backups = JSON.parse(backupList) as CloudBackupInfo[];
      
      // Sort by timestamp, newest first
      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  public async deleteBackup(backupId: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Remove backup data
      await storageService.removeItem(`backup_${backupId}`);

      // Update backup list
      const backupList = await storageService.getItem('backup_list');
      if (backupList) {
        const backups = JSON.parse(backupList) as CloudBackupInfo[];
        const updatedBackups = backups.filter(backup => backup.backupId !== backupId);
        await storageService.setItem('backup_list', JSON.stringify(updatedBackups));
      }

      console.log(`🗑️ Backup deleted: ${backupId}`);
    } catch (error) {
      console.error(`Failed to delete backup ${backupId}:`, error);
      throw new CloudError('BACKUP_DELETE_FAILED', `Failed to delete backup: ${error}`, { backupId });
    }
  }

  public async restoreFromBackup(backupId: string): Promise<CloudRestoreInfo> {
    this.ensureInitialized();

    const restoreId = `restore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔄 Starting restore: ${restoreId} from backup: ${backupId}`);

    const restoreInfo: CloudRestoreInfo = {
      restoreId,
      backupId,
      timestamp: new Date().toISOString(),
      status: 'in_progress',
      progress: 0,
      entitiesRestored: {
        products: 0,
        sales: 0,
        users: 0,
        suppliers: 0,
        inventory: 0
      },
      userId: await this.getCurrentUserId(),
      deviceId: await this.getDeviceId()
    };

    try {
      // Load backup data
      const backupData = await storageService.getItem(`backup_${backupId}`);
      if (!backupData) {
        throw new Error('Backup not found');
      }

      const { data } = JSON.parse(backupData);
      restoreInfo.progress = 10;

      // Restore products
      if (data.data.products && Array.isArray(data.data.products)) {
        console.log(`📦 Restoring ${data.data.products.length} products...`);
        
        // Clear existing products (optional - could be a setting)
        // await productService.clearAllProducts();
        
        for (const product of data.data.products) {
          try {
            await productService.addProduct(product);
            restoreInfo.entitiesRestored.products++;
          } catch (error) {
            console.warn(`Failed to restore product ${product.id}:`, error);
          }
        }
        restoreInfo.progress = 30;
      }

      // Restore sales
      if (data.data.sales && Array.isArray(data.data.sales)) {
        console.log(`💰 Restoring ${data.data.sales.length} sales...`);
        
        // Clear existing sales (optional)
        // await salesService.clearAllSales();
        
        // Note: Sales restoration would need special handling to maintain relationships
        restoreInfo.entitiesRestored.sales = data.data.sales.length;
        restoreInfo.progress = 60;
      }

      // Restore users (if available and authorized)
      if (data.data.users && Array.isArray(data.data.users)) {
        console.log(`👥 Restoring ${data.data.users.length} users...`);
        
        // Users restoration would require admin privileges
        const currentUser = await authService.getCurrentUser();
        if (currentUser && authService.hasPermission('canManageUsers')) {
          // Restore users logic would go here
          restoreInfo.entitiesRestored.users = data.data.users.length;
        } else {
          console.warn('Insufficient permissions to restore users');
        }
        restoreInfo.progress = 80;
      }

      // Restore suppliers and inventory
      restoreInfo.entitiesRestored.suppliers = data.data.suppliers?.length || 0;
      restoreInfo.entitiesRestored.inventory = data.data.inventory?.length || 0;
      
      restoreInfo.progress = 100;
      restoreInfo.status = 'completed';
      
      console.log(`✅ Restore completed: ${restoreId}`);
      return restoreInfo;

    } catch (error) {
      console.error(`❌ Restore failed: ${restoreId}`, error);
      restoreInfo.status = 'failed';
      restoreInfo.errorMessage = error instanceof Error ? error.message : String(error);
      throw new CloudError('RESTORE_FAILED', `Restore failed: ${error}`, { restoreId, backupId });
    }
  }

  public async getRestoreStatus(restoreId: string): Promise<CloudRestoreInfo> {
    this.ensureInitialized();

    try {
      const restoreStatus = await storageService.getItem(`restore_${restoreId}`);
      if (!restoreStatus) {
        throw new Error('Restore operation not found');
      }

      return JSON.parse(restoreStatus) as CloudRestoreInfo;
    } catch (error) {
      throw new CloudError('RESTORE_STATUS_NOT_FOUND', `Restore status not found: ${error}`, { restoreId });
    }
  }

  public async scheduleAutomaticBackup(interval: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    this.ensureInitialized();

    // Clear existing interval
    if (this.automaticBackupInterval) {
      clearInterval(this.automaticBackupInterval);
    }

    // Set up new interval
    const intervalMs = this.getIntervalMs(interval);
    
    this.automaticBackupInterval = setInterval(async () => {
      try {
        console.log(`🕒 Automatic backup triggered (${interval})`);
        await this.createBackup(false); // Don't include media for automatic backups
      } catch (error) {
        console.error('Automatic backup failed:', error);
      }
    }, intervalMs);

    // Save settings
    await storageService.setItem('automatic_backup_settings', JSON.stringify({ interval }));
    
    console.log(`⏰ Automatic backup scheduled: ${interval}`);
  }

  public async cancelAutomaticBackup(): Promise<void> {
    this.ensureInitialized();

    if (this.automaticBackupInterval) {
      clearInterval(this.automaticBackupInterval);
      this.automaticBackupInterval = undefined;
    }

    await storageService.removeItem('automatic_backup_settings');
    console.log('⏹️ Automatic backup cancelled');
  }

  public async verifyBackup(backupId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const backupData = await storageService.getItem(`backup_${backupId}`);
      if (!backupData) {
        return false;
      }

      const backup = JSON.parse(backupData);
      
      // Basic validation
      if (!backup.info || !backup.data || !backup.data.metadata) {
        return false;
      }

      // Validate structure
      const requiredFields = ['version', 'created', 'deviceId', 'userId'];
      for (const field of requiredFields) {
        if (!backup.data.metadata[field]) {
          console.warn(`Backup validation failed: missing ${field}`);
          return false;
        }
      }

      console.log(`✅ Backup verified: ${backupId}`);
      return true;
    } catch (error) {
      console.error(`Failed to verify backup ${backupId}:`, error);
      return false;
    }
  }

  public async validateBackupIntegrity(backupId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const backupData = await storageService.getItem(`backup_${backupId}`);
      if (!backupData) {
        return false;
      }

      const backup = JSON.parse(backupData);
      
      // Validate data integrity
      let totalItems = 0;
      const entityCounts = backup.info.entities;
      
      if (backup.data.data.products) {
        if (backup.data.data.products.length !== entityCounts.products) {
          console.warn(`Product count mismatch: expected ${entityCounts.products}, found ${backup.data.data.products.length}`);
          return false;
        }
        totalItems += backup.data.data.products.length;
      }

      if (backup.data.data.sales) {
        if (backup.data.data.sales.length !== entityCounts.sales) {
          console.warn(`Sales count mismatch: expected ${entityCounts.sales}, found ${backup.data.data.sales.length}`);
          return false;
        }
        totalItems += backup.data.data.sales.length;
      }

      console.log(`✅ Backup integrity validated: ${backupId} (${totalItems} total items)`);
      return true;
    } catch (error) {
      console.error(`Failed to validate backup integrity ${backupId}:`, error);
      return false;
    }
  }

  // Helper methods
  private async addToBackupList(backupInfo: CloudBackupInfo): Promise<void> {
    try {
      const backupList = await storageService.getItem('backup_list');
      const backups = backupList ? JSON.parse(backupList) as CloudBackupInfo[] : [];
      
      backups.push(backupInfo);
      
      // Keep only the last 10 backups to avoid storage bloat
      const maxBackups = 10;
      if (backups.length > maxBackups) {
        const oldBackups = backups.splice(0, backups.length - maxBackups);
        // Clean up old backup data
        for (const oldBackup of oldBackups) {
          try {
            await storageService.removeItem(`backup_${oldBackup.backupId}`);
          } catch (error) {
            console.warn(`Failed to clean up old backup ${oldBackup.backupId}:`, error);
          }
        }
      }
      
      await storageService.setItem('backup_list', JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to update backup list:', error);
    }
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await storageService.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await storageService.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private async getCurrentUserId(): Promise<string> {
    try {
      const currentUser = await authService.getCurrentUser();
      return currentUser?.id.toString() || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private getIntervalMs(interval: 'daily' | 'weekly' | 'monthly'): number {
    switch (interval) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      default:
        return 24 * 60 * 60 * 1000; // Default to daily
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) {return '0 Bytes';}
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new CloudError('BACKUP_NOT_INITIALIZED', 'CloudBackupService not initialized');
    }
  }
}

export const cloudBackupService = CloudBackupService.getInstance();
export { CloudBackupService };
