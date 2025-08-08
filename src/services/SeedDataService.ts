import { Product } from '../types';
import { productService } from './ProductService';
import { salesService } from './SimpleSalesService';

export class SeedDataService {
  private static instance: SeedDataService;

  private constructor() {}

  public static getInstance(): SeedDataService {
    if (!SeedDataService.instance) {
      SeedDataService.instance = new SeedDataService();
    }
    return SeedDataService.instance;
  }

  async seedSampleProducts(): Promise<void> {
    try {
      const existingProducts = await productService.getAllProducts();
      if (existingProducts.length > 0) {
        console.log('🌱 Products already seeded, skipping...');
        return;
      }

      const sampleProducts: Omit<Product, 'id'>[] = [
        {
          name: 'Premium Coffee Blend',
          sku: 'COFFEE-001',
          price: 12.99,
          cost: 6.50,
          stock_qty: 50,
          category: 'Beverages',
          description: 'Rich and aromatic coffee blend perfect for morning starts',
          barcode: '1234567890123',
          tax_rate: 0.08,
        },
        {
          name: 'Organic Green Tea',
          sku: 'TEA-002',
          price: 8.50,
          cost: 4.25,
          stock_qty: 30,
          category: 'Beverages',
          description: 'Refreshing organic green tea with natural antioxidants',
          barcode: '1234567890124',
          tax_rate: 0.08,
        },
        {
          name: 'Artisan Chocolate Bar',
          sku: 'CHOC-003',
          price: 6.75,
          cost: 3.00,
          stock_qty: 25,
          category: 'Snacks',
          description: '70% dark chocolate crafted by local artisans',
          barcode: '1234567890125',
          tax_rate: 0.08,
        },
        {
          name: 'Fresh Croissant',
          sku: 'BAKERY-004',
          price: 3.25,
          cost: 1.50,
          stock_qty: 15,
          category: 'Bakery',
          description: 'Buttery, flaky croissant baked fresh daily',
          barcode: '1234567890126',
          tax_rate: 0.08,
        },
        {
          name: 'Wireless Bluetooth Headphones',
          sku: 'TECH-005',
          price: 89.99,
          cost: 45.00,
          stock_qty: 8,
          category: 'Electronics',
          description: 'High-quality wireless headphones with noise cancellation',
          barcode: '1234567890127',
          tax_rate: 0.08,
        },
        {
          name: 'Notebook - Lined',
          sku: 'STAT-006',
          price: 4.50,
          cost: 2.25,
          stock_qty: 40,
          category: 'Stationery',
          description: 'A5 lined notebook with durable cover',
          barcode: '1234567890128',
          tax_rate: 0.08,
        },
        {
          name: 'Energy Drink',
          sku: 'DRINK-007',
          price: 2.99,
          cost: 1.20,
          stock_qty: 60,
          category: 'Beverages',
          description: 'Natural energy drink with vitamins and caffeine',
          barcode: '1234567890129',
          tax_rate: 0.08,
        },
        {
          name: 'Protein Bar - Vanilla',
          sku: 'HEALTH-008',
          price: 3.75,
          cost: 1.80,
          stock_qty: 35,
          category: 'Health',
          description: '20g protein bar with natural vanilla flavoring',
          barcode: '1234567890130',
          tax_rate: 0.08,
        },
        {
          name: 'USB-C Charging Cable',
          sku: 'TECH-009',
          price: 15.99,
          cost: 8.00,
          stock_qty: 20,
          category: 'Electronics',
          description: '2-meter USB-C fast charging cable',
          barcode: '1234567890131',
          tax_rate: 0.08,
        },
        {
          name: 'Hand Sanitizer',
          sku: 'CARE-010',
          price: 4.25,
          cost: 2.10,
          stock_qty: 45,
          category: 'Personal Care',
          description: '70% alcohol hand sanitizer - 250ml',
          barcode: '1234567890132',
          tax_rate: 0.08,
        },
      ];

      console.log('🌱 Seeding sample products...');
      
      for (const productData of sampleProducts) {
        await productService.addProduct(productData);
      }

      console.log(`✅ Successfully seeded ${sampleProducts.length} sample products!`);
    } catch (error) {
      console.error('❌ Failed to seed sample products:', error);
      throw new Error('Failed to seed sample data');
    }
  }

  async seedSampleSales(): Promise<void> {
    try {
      const existingSales = await salesService.getAllSales();
      if (existingSales.length > 0) {
        console.log('🌱 Sales already seeded, skipping...');
        return;
      }

      console.log('🌱 Seeding sample sales...');
      await salesService.addSampleSales();
      console.log('✅ Successfully seeded sample sales!');
    } catch (error) {
      console.error('❌ Failed to seed sample sales:', error);
      throw new Error('Failed to seed sample sales');
    }
  }

  async clearAllData(): Promise<void> {
    try {
      console.log('🗑️ Clearing all sample data...');
      
      // Clear sales first (they depend on products)
      await salesService.clearAllSales();
      
      // Then clear products
      const products = await productService.getAllProducts();
      for (const product of products) {
        await productService.deleteProduct(product.id);
      }

      console.log('✅ All data cleared successfully!');
    } catch (error) {
      console.error('❌ Failed to clear data:', error);
      throw new Error('Failed to clear sample data');
    }
  }

  async seedAllData(): Promise<void> {
    try {
      console.log('🌱 Seeding all sample data...');
      await this.seedSampleProducts();
      await this.seedSampleSales();
      console.log('✅ All sample data seeded successfully!');
    } catch (error) {
      console.error('❌ Failed to seed all data:', error);
      throw error;
    }
  }

  async reseedData(): Promise<void> {
    try {
      console.log('🔄 Reseeding all data...');
      await this.clearAllData();
      await this.seedAllData();
      console.log('✅ Data reseeded successfully!');
    } catch (error) {
      console.error('❌ Failed to reseed data:', error);
      throw error;
    }
  }

  // Helper method to get sample product SKUs for testing
  getSampleSkus(): string[] {
    return [
      'COFFEE-001', 'TEA-002', 'CHOC-003', 'BAKERY-004', 'TECH-005',
      'STAT-006', 'DRINK-007', 'HEALTH-008', 'TECH-009', 'CARE-010'
    ];
  }

  // Helper method to add a single test product
  async addTestProduct(name: string, price: number): Promise<Product> {
    const sku = `TEST-${Date.now()}`;
    const productData: Omit<Product, 'id'> = {
      name,
      sku,
      price,
      cost: price * 0.5, // 50% margin
      stock_qty: 10,
      tax_rate: 0.08,
      category: 'Test',
      description: `Test product: ${name}`,
      barcode: `TEST${Date.now()}`,
    };

    return await productService.addProduct(productData);
  }
}

export const seedDataService = SeedDataService.getInstance();
