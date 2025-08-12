import { database } from '../stores/DatabaseFactory';
import { seedDataService } from './SeedDataService';
import { profileService } from './ProfileService';

export class DatabaseInitService {
  private static instance: DatabaseInitService;
  private isInitialized = false;
  private isInitializing = false;

  private constructor() {}

  public static getInstance(): DatabaseInitService {
    if (!DatabaseInitService.instance) {
      DatabaseInitService.instance = new DatabaseInitService();
    }
    return DatabaseInitService.instance;
  }

  /**
   * Initialize database and seed with sample data if needed
   */
  public async initializeApp(): Promise<void> {
    if (this.isInitialized) {
      console.log('📱 App already initialized');
      return;
    }

    if (this.isInitializing) {
      console.log('⏳ App initialization in progress...');
      return;
    }

    try {
      this.isInitializing = true;
      console.log('🚀 Starting app initialization...');

      // Step 1: Initialize database
      console.log('1️⃣ Initializing database...');
      console.log('Database instance type:', typeof database, database.constructor.name);
      
      await database.initialize();
      console.log('✅ Database initialization completed');

      // Step 2: Seed sample data in development
      if (__DEV__) {
        console.log('2️⃣ Seeding sample data (development mode)...');
        try {
          await seedDataService.seedSampleProducts();
          console.log('✅ Sample data seeding completed');
        } catch (seedError) {
          console.warn('⚠️ Sample data seeding failed, but continuing:', seedError);
        }
      }

      // Step 2.5: Initialize profile and business settings
      console.log('2️⃣.5️⃣ Initializing profile and business settings...');
      try {
        await profileService.initializeDefaultBusinessSettings();
        console.log('✅ Profile and business settings initialized');
      } catch (profileError) {
        console.warn('⚠️ Profile initialization failed, but continuing:', profileError);
      }

      // Step 3: Verify initialization
      console.log('3️⃣ Getting database stats...');
      const stats = await database.getStats();
      console.log('3️⃣ Verification complete:', {
        totalProducts: stats.totalProducts,
        totalSales: stats.totalSales,
        totalRevenue: stats.totalRevenue
      });

      this.isInitialized = true;
      console.log('✅ App initialization completed successfully!');

    } catch (error) {
      console.error('💥 App initialization failed:', error);
      const err = error as Error;
      console.error('Error details:', {
        name: err.name || 'UnknownError',
        message: err.message || 'An unknown error occurred',
        stack: err.stack || 'No stack trace available'
      });
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Reset database and re-initialize (for development/testing)
   */
  public async resetAndReinitialize(): Promise<void> {
    try {
      console.log('🔄 Resetting database...');
      
      // Clear all data
      await seedDataService.clearAllData();
      
      // Reset initialization flag
      this.isInitialized = false;
      
      // Re-initialize
      await this.initializeApp();
      
      console.log('✅ Database reset and re-initialization complete!');
    } catch (error) {
      console.error('❌ Failed to reset database:', error);
      throw error;
    }
  }

  /**
   * Check if app is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get database stats for debugging
   */
  public async getDebugInfo() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }

    try {
      const stats = await database.getStats();
      const products = await database.getAllProducts();
      const sales = await database.getAllSales();

      return {
        status: 'initialized',
        stats,
        sampleProducts: products.slice(0, 3).map(p => ({ sku: p.sku, name: p.name })),
        recentSales: sales.slice(0, 3).map(s => ({ id: s.id, total: s.total, status: s.status }))
      };
    } catch (error) {
      const err = error as Error;
      return {
        status: 'error',
        error: err.message || 'An unknown error occurred'
      };
    }
  }
}

// Export singleton instance
export const databaseInitService = DatabaseInitService.getInstance();
