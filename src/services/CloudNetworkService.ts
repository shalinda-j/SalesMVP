import { NetworkStatus, CloudOperationResult } from '../types/Cloud';
import { networkService } from './NetworkService';

class CloudNetworkService {
  private static instance: CloudNetworkService;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private currentStatus: NetworkStatus = {
    isOnline: true,
    connectionType: 'unknown',
    isInternetReachable: null
  };
  private checkInterval?: NodeJS.Timeout;
  private readonly CONNECTIVITY_CHECK_URL = 'https://www.google.com/favicon.ico';
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.initialize();
  }

  public static getInstance(): CloudNetworkService {
    if (!CloudNetworkService.instance) {
      CloudNetworkService.instance = new CloudNetworkService();
    }
    return CloudNetworkService.instance;
  }

  private async initialize(): Promise<void> {
    // Listen to the existing network service
    networkService.onNetworkChange((state) => {
      this.updateStatusFromNetworkService(state);
    });

    // Initial connectivity check
    await this.checkCloudConnectivity();

    // Set up periodic cloud-specific checks
    this.startPeriodicChecks();

    // Listen to browser online/offline events (web platform)
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private updateStatusFromNetworkService(networkState: any): void {
    const newStatus: NetworkStatus = {
      isOnline: networkState.is_online,
      connectionType: this.mapConnectionType(networkState.connection_type),
      isInternetReachable: networkState.is_online,
      details: {
        strength: networkState.signal_strength
      }
    };

    this.updateStatus(newStatus);
  }

  private mapConnectionType(type: string): 'none' | 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    switch (type) {
      case 'wifi': return 'wifi';
      case 'cellular': return 'cellular';
      case 'ethernet': return 'ethernet';
      case 'unknown': return 'unknown';
      default: return 'unknown';
    }
  }

  private handleOnline = async (): Promise<void> => {
    console.log('🌐 CloudNetwork: Browser reports online');
    await this.checkCloudConnectivity();
  };

  private handleOffline = (): void => {
    console.log('🌐 CloudNetwork: Browser reports offline');
    this.updateStatus({
      ...this.currentStatus,
      isOnline: false,
      connectionType: 'none',
      isInternetReachable: false
    });
  };

  private startPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkCloudConnectivity();
    }, this.CHECK_INTERVAL);
  }

  private stopPeriodicChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  private async checkCloudConnectivity(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check if we can reach the internet
      const response = await fetch(this.CONNECTIVITY_CHECK_URL, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Determine connection quality based on latency
      const strength = this.calculateSignalStrength(latency);
      const bandwidth = this.estimateBandwidth(latency);

      const newStatus: NetworkStatus = {
        isOnline: true,
        connectionType: this.getConnectionType(),
        isInternetReachable: true,
        details: {
          strength,
          bandwidth,
          latency
        }
      };

      this.updateStatus(newStatus);
      console.log(`🌐 CloudNetwork: Connected (${latency}ms latency, ${strength}% strength)`);
    } catch (error) {
      const newStatus: NetworkStatus = {
        isOnline: false,
        connectionType: 'none',
        isInternetReachable: false
      };

      this.updateStatus(newStatus);
      console.log('🌐 CloudNetwork: Disconnected -', error);
    }
  }

  private getConnectionType(): 'none' | 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    // Use the existing network service if available
    const existingType = networkService.getConnectionType();
    return this.mapConnectionType(existingType);
  }

  private calculateSignalStrength(latency: number): number {
    // Calculate signal strength based on latency
    // Lower latency = higher strength
    if (latency < 50) return 100;
    if (latency < 100) return 90;
    if (latency < 200) return 80;
    if (latency < 500) return 60;
    if (latency < 1000) return 40;
    if (latency < 2000) return 20;
    return 10;
  }

  private estimateBandwidth(latency: number): number {
    // Rough bandwidth estimation based on latency
    // This is a very simplified estimation
    if (latency < 50) return 100; // High speed
    if (latency < 100) return 50; // Good speed
    if (latency < 200) return 25; // Medium speed
    if (latency < 500) return 10; // Low speed
    return 5; // Very low speed
  }

  private updateStatus(newStatus: NetworkStatus): void {
    const statusChanged = JSON.stringify(this.currentStatus) !== JSON.stringify(newStatus);
    
    this.currentStatus = newStatus;

    if (statusChanged) {
      // Notify all listeners
      this.listeners.forEach(listener => {
        try {
          listener(newStatus);
        } catch (error) {
          console.error('Error in cloud network status listener:', error);
        }
      });
    }
  }

  // Public API
  public getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public isOnline(): boolean {
    return this.currentStatus.isOnline;
  }

  public isInternetReachable(): boolean {
    return this.currentStatus.isInternetReachable === true;
  }

  public getConnectionType(): 'none' | 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    return this.currentStatus.connectionType;
  }

  public getLatency(): number | undefined {
    return this.currentStatus.details?.latency;
  }

  public getSignalStrength(): number | undefined {
    return this.currentStatus.details?.strength;
  }

  public getBandwidth(): number | undefined {
    return this.currentStatus.details?.bandwidth;
  }

  public async forceCheck(): Promise<NetworkStatus> {
    await this.checkCloudConnectivity();
    return this.getStatus();
  }

  public onStatusChange(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async waitForOnline(timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isOnline()) {
        resolve(true);
        return;
      }

      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.onStatusChange((status) => {
        if (status.isOnline) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  public async testLatency(url: string = this.CONNECTIVITY_CHECK_URL): Promise<number> {
    try {
      const startTime = Date.now();
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return Date.now() - startTime;
    } catch (error) {
      throw new Error('Failed to test latency: ' + error);
    }
  }

  public async testCloudEndpoint(url: string): Promise<CloudOperationResult> {
    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000)
      });
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: response.ok,
        metadata: {
          executionTime,
          operationId: `connectivity-test-${Date.now()}`,
          timestamp: new Date().toISOString()
        },
        error: response.ok ? undefined : {
          code: `HTTP_${response.status}`,
          message: `HTTP ${response.status}: ${response.statusText}`,
          details: { url, status: response.status }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown network error',
          details: { url, error: String(error) }
        },
        metadata: {
          executionTime: 0,
          operationId: `connectivity-test-error-${Date.now()}`,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  public setCheckInterval(interval: number): void {
    if (interval < 5000) {
      console.warn('Cloud network check interval should be at least 5 seconds');
      return;
    }
    
    this.stopPeriodicChecks();
    if (interval > 0) {
      this.checkInterval = setInterval(() => {
        this.checkCloudConnectivity();
      }, interval);
    }
  }

  public shouldUseCloudOperations(): boolean {
    return this.isOnline() && this.isInternetReachable();
  }

  public getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    if (!this.isOnline()) return 'offline';
    
    const latency = this.getLatency();
    if (!latency) return 'good'; // Default if we don't have latency data
    
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 1000) return 'fair';
    return 'poor';
  }

  public destroy(): void {
    this.stopPeriodicChecks();
    this.listeners.clear();

    // Remove browser event listeners
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

export const cloudNetworkService = CloudNetworkService.getInstance();
export { CloudNetworkService };
