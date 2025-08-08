// Platform-agnostic storage service
// Handles web localStorage fallback for AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class StorageService {
  private static instance: StorageService;
  
  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  private isWeb(): boolean {
    return Platform.OS === 'web';
  }

  private getWebStorage() {
    // Fallback to in-memory storage if localStorage is not available
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    
    // In-memory fallback for web environments without localStorage
    const memoryStorage = new Map<string, string>();
    return {
      getItem: (key: string) => memoryStorage.get(key) || null,
      setItem: (key: string, value: string) => memoryStorage.set(key, value),
      removeItem: (key: string) => memoryStorage.delete(key),
      clear: () => memoryStorage.clear(),
    };
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        return storage.getItem(key);
      }
      
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`StorageService.getItem error for key ${key}:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        storage.setItem(key, value);
        return;
      }
      
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`StorageService.setItem error for key ${key}:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        storage.removeItem(key);
        return;
      }
      
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`StorageService.removeItem error for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        storage.clear();
        return;
      }
      
      await AsyncStorage.clear();
    } catch (error) {
      console.error('StorageService.clear error:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        if (storage instanceof Map) {
          return Array.from(storage.keys());
        } else {
          return Object.keys(storage);
        }
      }
      
      const keys = await AsyncStorage.getAllKeys();
      return [...keys];
    } catch (error) {
      console.error('StorageService.getAllKeys error:', error);
      return [];
    }
  }

  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        return keys.map(key => [key, storage.getItem(key)]);
      }
      
      const result = await AsyncStorage.multiGet(keys);
      return result as [string, string | null][];
    } catch (error) {
      console.error('StorageService.multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  }

  async multiSet(keyValuePairs: [string, string][]): Promise<void> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        keyValuePairs.forEach(([key, value]) => {
          storage.setItem(key, value);
        });
        return;
      }
      
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('StorageService.multiSet error:', error);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    try {
      if (this.isWeb()) {
        const storage = this.getWebStorage();
        keys.forEach(key => {
          storage.removeItem(key);
        });
        return;
      }
      
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('StorageService.multiRemove error:', error);
    }
  }
}

export const storageService = StorageService.getInstance();
