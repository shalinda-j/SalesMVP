import { Platform } from 'react-native';
import { Database } from './Database';
import { WebDatabase } from './WebDatabase';
import { DatabaseService } from '../types';

/**
 * Factory class to create the appropriate database instance based on platform
 */
class DatabaseFactory {
  private static instance: DatabaseService | null = null;

  public static getInstance(): DatabaseService {
    if (!DatabaseFactory.instance) {
      try {
        if (Platform.OS === 'web') {
          console.log('🌐 Creating WebDatabase instance for web platform');
          DatabaseFactory.instance = new WebDatabase();
        } else {
          console.log('📱 Creating SQLite Database instance for native platform');
          DatabaseFactory.instance = Database.getInstance();
        }
      } catch (error) {
        console.error('❌ Failed to create database instance:', error);
        // Fallback to WebDatabase if SQLite fails
        console.log('🔄 Falling back to WebDatabase...');
        DatabaseFactory.instance = new WebDatabase();
      }
    }
    return DatabaseFactory.instance;
  }

  /**
   * Force creation of a new instance (for testing)
   */
  public static createInstance(forceWeb: boolean = false): DatabaseService {
    try {
      if (forceWeb || Platform.OS === 'web') {
        return new WebDatabase();
      } else {
        return Database.getInstance();
      }
    } catch (error) {
      console.error('❌ Failed to create database instance:', error);
      return new WebDatabase();
    }
  }

  /**
   * Reset instance (for testing)
   */
  public static reset(): void {
    DatabaseFactory.instance = null;
  }
}

// Export the database instance
export const database = DatabaseFactory.getInstance();
