import { seedDataService } from './SeedDataService';
import { productService } from './ProductService';
import { salesService } from './SimpleSalesService';

class DemoService {
  private static instance: DemoService;

  private constructor() {}

  public static getInstance(): DemoService {
    if (!DemoService.instance) {
      DemoService.instance = new DemoService();
    }
    return DemoService.instance;
  }

  async setupDemoData(): Promise<void> {
    try {
      console.log('🚀 Setting up demo environment...');

      // Clear any existing data first
      await seedDataService.clearAllData();

      // Seed products and sales
      await seedDataService.seedAllData();

      console.log('✅ Demo environment setup complete!');
    } catch (error) {
      console.error('❌ Failed to setup demo data:', error);
      throw error;
    }
  }

  async tearDownDemoData(): Promise<void> {
    try {
      console.log('🧹 Tearing down demo environment...');
      await seedDataService.clearAllData();
      console.log('✅ Demo environment torn down successfully!');
    } catch (error) {
      console.error('❌ Failed to tear down demo data:', error);
      throw error;
    }
  }

  async checkDemoData(): Promise<void> {
    const products = await productService.getAllProducts();
    const sales = await salesService.getAllSales();

    console.log(`📊 Demo Data Status:
      - Products: ${products.length}
      - Sales: ${sales.length}
    `);
  }
}

export const demoService = DemoService.getInstance();

