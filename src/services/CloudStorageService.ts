import AsyncStorage from '@react-native-async-storage/async-storage';
import { CloudSyncData, ICloudStorageService } from '../types/Sync';
import { networkService } from './NetworkService';

class CloudStorageService implements ICloudStorageService {
  private static instance: CloudStorageService;
  private authToken: string | null = null;
  private cloudEndpoint: string | null = null;

  // For demo purposes, we'll use AsyncStorage as "cloud" storage
  // In production, this would be replaced with actual cloud APIs
  private readonly CLOUD_STORAGE_KEY = 'CLOUD_SYNC_DATA';
  private readonly AUTH_TOKEN_KEY = 'CLOUD_AUTH_TOKEN';
  private readonly CLOUD_ENDPOINT_KEY = 'CLOUD_ENDPOINT';

  private constructor() {
    this.loadAuthConfig();
  }

  public static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  private async loadAuthConfig(): Promise<void> {
    try {
      this.authToken = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
      this.cloudEndpoint = await AsyncStorage.getItem(this.CLOUD_ENDPOINT_KEY);
    } catch (error) {
      console.error('Failed to load auth config:', error);
    }
  }

  public async authenticate(token: string, endpoint?: string): Promise<boolean> {
    try {
      // In a real implementation, this would validate the token with the cloud service
      this.authToken = token;
      if (endpoint) {
        this.cloudEndpoint = endpoint;
      }

      // Store auth info for persistence
      await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, token);
      if (endpoint) {
        await AsyncStorage.setItem(this.CLOUD_ENDPOINT_KEY, endpoint);
      }

      // For demo purposes, always return true
      // In production, validate token with actual cloud service
      return true;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  public async upload(data: CloudSyncData): Promise<boolean> {
    try {
      // Check network connectivity
      const networkState = await networkService.getNetworkState();
      if (!networkState.is_online) {
        throw new Error('No internet connection');
      }

      // In a real implementation, this would upload to actual cloud storage
      // For demo purposes, we'll store in AsyncStorage with device-specific keys
      const storageKey = `${this.CLOUD_STORAGE_KEY}_${data.device_id}`;
      const serializedData = JSON.stringify(data);
      
      await AsyncStorage.setItem(storageKey, serializedData);
      
      console.log(`Data uploaded for device ${data.device_id}, size: ${serializedData.length} bytes`);
      return true;
    } catch (error) {
      console.error('Upload failed:', error);
      return false;
    }
  }

  public async download(deviceId?: string): Promise<CloudSyncData | null> {
    try {
      // Check network connectivity
      const networkState = await networkService.getNetworkState();
      if (!networkState.is_online) {
        throw new Error('No internet connection');
      }

      if (deviceId) {
        // Download specific device data
        const storageKey = `${this.CLOUD_STORAGE_KEY}_${deviceId}`;
        const serializedData = await AsyncStorage.getItem(storageKey);
        
        if (serializedData) {
          return JSON.parse(serializedData) as CloudSyncData;
        }
      } else {
        // Download latest data from any device
        // For demo purposes, we'll look for any stored sync data
        const allKeys = await AsyncStorage.getAllKeys();
        const cloudKeys = allKeys.filter(key => key.startsWith(this.CLOUD_STORAGE_KEY));
        
        if (cloudKeys.length > 0) {
          // Get the most recent one
          let latestData: CloudSyncData | null = null;
          let latestTimestamp = 0;
          
          for (const key of cloudKeys) {
            const serializedData = await AsyncStorage.getItem(key);
            if (serializedData) {
              const data = JSON.parse(serializedData) as CloudSyncData;
              const timestamp = new Date(data.timestamp).getTime();
              
              if (timestamp > latestTimestamp) {
                latestTimestamp = timestamp;
                latestData = data;
              }
            }
          }
          
          return latestData;
        }
      }

      return null;
    } catch (error) {
      console.error('Download failed:', error);
      return null;
    }
  }

  public async getStorageInfo(): Promise<{ used: number; available: number }> {
    try {
      // For demo purposes, calculate storage used by our sync data
      const allKeys = await AsyncStorage.getAllKeys();
      const cloudKeys = allKeys.filter(key => key.startsWith(this.CLOUD_STORAGE_KEY));
      
      let totalUsed = 0;
      for (const key of cloudKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalUsed += data.length;
        }
      }

      // Mock available storage (in a real implementation, this would come from cloud provider)
      const mockAvailable = 100 * 1024 * 1024; // 100MB
      
      return {
        used: totalUsed,
        available: mockAvailable - totalUsed
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { used: 0, available: 0 };
    }
  }

  public async listDevices(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cloudKeys = allKeys.filter(key => key.startsWith(this.CLOUD_STORAGE_KEY));
      
      const devices = cloudKeys.map(key => {
        const deviceId = key.replace(`${this.CLOUD_STORAGE_KEY}_`, '');
        return deviceId;
      });
      
      return [...new Set(devices)]; // Remove duplicates
    } catch (error) {
      console.error('Failed to list devices:', error);
      return [];
    }
  }

  public async deleteDeviceData(deviceId: string): Promise<boolean> {
    try {
      const storageKey = `${this.CLOUD_STORAGE_KEY}_${deviceId}`;
      await AsyncStorage.removeItem(storageKey);
      return true;
    } catch (error) {
      console.error('Failed to delete device data:', error);
      return false;
    }
  }

  public async clearAllData(): Promise<boolean> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cloudKeys = allKeys.filter(key => key.startsWith(this.CLOUD_STORAGE_KEY));
      
      await AsyncStorage.multiRemove(cloudKeys);
      return true;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return false;
    }
  }

  public isAuthenticated(): boolean {
    return this.authToken !== null;
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public getCloudEndpoint(): string | null {
    return this.cloudEndpoint;
  }

  public async logout(): Promise<void> {
    this.authToken = null;
    this.cloudEndpoint = null;
    
    await AsyncStorage.multiRemove([
      this.AUTH_TOKEN_KEY,
      this.CLOUD_ENDPOINT_KEY
    ]);
  }

  /**
   * For production implementations, this would handle:
   * - OAuth/JWT token refresh
   * - Rate limiting and retry logic
   * - Compression of large data sets
   * - Encryption of sensitive data
   * - Chunked uploads for large datasets
   * - Delta sync (only sync changes)
   */
  public async uploadWithRetry(
    data: CloudSyncData, 
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<boolean> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await this.upload(data);
        if (success) {
          return true;
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`Upload attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = delayMs * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error('Upload failed after all retries:', lastError);
    return false;
  }

  /**
   * Test connection to cloud service
   */
  public async testConnection(): Promise<boolean> {
    try {
      const networkState = await networkService.getNetworkState();
      if (!networkState.is_online) {
        return false;
      }

      // For demo purposes, always return true if network is available
      // In production, this would ping the actual cloud service
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cloudStorageService = CloudStorageService.getInstance();
export { CloudStorageService };
