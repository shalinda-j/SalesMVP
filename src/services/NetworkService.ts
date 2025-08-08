import NetInfo from '@react-native-community/netinfo';
import { NetworkState, INetworkService } from '../types/Sync';

class NetworkService implements INetworkService {
  private static instance: NetworkService;
  private listeners: ((state: NetworkState) => void)[] = [];
  private currentState: NetworkState | null = null;
  private unsubscribe: (() => void) | null = null;

  private constructor() {
    this.initializeNetworkMonitoring();
  }

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      // Get initial state
      const initialState = await NetInfo.fetch();
      this.currentState = this.mapNetInfoState(initialState);

      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener((state) => {
        const networkState = this.mapNetInfoState(state);
        
        // Only trigger listeners if state actually changed
        if (!this.currentState || this.hasStateChanged(this.currentState, networkState)) {
          this.currentState = networkState;
          this.notifyListeners(networkState);
        }
      });
    } catch (error) {
      console.error('Failed to initialize network monitoring:', error);
      // Fallback to unknown state
      this.currentState = {
        is_online: false,
        connection_type: 'unknown',
        is_metered: false
      };
    }
  }

  private mapNetInfoState(netInfoState: any): NetworkState {
    const connectionType = this.mapConnectionType(netInfoState.type);
    
    return {
      is_online: netInfoState.isConnected === true && netInfoState.isInternetReachable === true,
      connection_type: connectionType,
      is_metered: netInfoState.details?.isConnectionExpensive === true,
      signal_strength: netInfoState.details?.strength || undefined
    };
  }

  private mapConnectionType(type: string | null): NetworkState['connection_type'] {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      case 'wimax':
      case 'vpn':
      case 'other':
      default:
        return 'unknown';
    }
  }

  private hasStateChanged(oldState: NetworkState, newState: NetworkState): boolean {
    return (
      oldState.is_online !== newState.is_online ||
      oldState.connection_type !== newState.connection_type ||
      oldState.is_metered !== newState.is_metered
    );
  }

  private notifyListeners(state: NetworkState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in network state listener:', error);
      }
    });
  }

  public async getNetworkState(): Promise<NetworkState> {
    if (this.currentState) {
      return this.currentState;
    }

    try {
      // If we don't have cached state, fetch it
      const state = await NetInfo.fetch();
      const networkState = this.mapNetInfoState(state);
      this.currentState = networkState;
      return networkState;
    } catch (error) {
      console.error('Failed to get network state:', error);
      return {
        is_online: false,
        connection_type: 'unknown',
        is_metered: false
      };
    }
  }

  public onNetworkChange(callback: (state: NetworkState) => void): void {
    if (!this.listeners.includes(callback)) {
      this.listeners.push(callback);
      
      // Immediately call with current state if available
      if (this.currentState) {
        try {
          callback(this.currentState);
        } catch (error) {
          console.error('Error in network state callback:', error);
        }
      }
    }
  }

  public removeNetworkListener(callback: (state: NetworkState) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public isOnline(): boolean {
    return this.currentState?.is_online === true;
  }

  public getConnectionType(): NetworkState['connection_type'] {
    return this.currentState?.connection_type || 'unknown';
  }

  public isMetered(): boolean {
    return this.currentState?.is_metered === true;
  }

  public shouldSyncOnCurrentConnection(respectMetered: boolean = true): boolean {
    if (!this.isOnline()) {
      return false;
    }

    if (respectMetered && this.isMetered()) {
      // On metered connections, be more conservative about syncing
      return false;
    }

    return true;
  }

  public getSignalStrength(): number | undefined {
    return this.currentState?.signal_strength;
  }

  /**
   * Cleanup network monitoring
   */
  public cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
    this.currentState = null;
  }

  /**
   * Wait for network connection
   */
  public async waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.removeNetworkListener(onConnectionChange);
        resolve(false);
      }, timeoutMs);

      const onConnectionChange = (state: NetworkState) => {
        if (state.is_online) {
          clearTimeout(timeout);
          this.removeNetworkListener(onConnectionChange);
          resolve(true);
        }
      };

      this.onNetworkChange(onConnectionChange);
    });
  }

  /**
   * Test actual internet connectivity by making a lightweight request
   */
  public async testConnectivity(): Promise<boolean> {
    if (!this.isOnline()) {
      return false;
    }

    try {
      // Try a lightweight request to test actual connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      return response.status === 204;
    } catch (error) {
      console.warn('Connectivity test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const networkService = NetworkService.getInstance();
export { NetworkService };
