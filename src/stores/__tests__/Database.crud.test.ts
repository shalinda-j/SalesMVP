import { database, Database } from '../Database';
import { Product, Sale, SaleItem, Payment } from '../../types';

// Mock expo-sqlite for CRUD tests
const mockDb = {
  execAsync: jest.fn(() => Promise.resolve()),
  runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(() => Promise.resolve([])),
  closeAsync: jest.fn(() => Promise.resolve())
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb))
}));

// Simple test to verify CRUD operations are implemented
describe('Database CRUD Operations', () => {
  let db: Database;

  beforeAll(async () => {
    db = Database.getInstance();
    await db.initialize();
  });

  afterAll(async () => {
    await db.close();
  });

  describe('Product CRUD', () => {
    test('should have all Product CRUD methods', () => {
      expect(typeof db.createProduct).toBe('function');
      expect(typeof db.getProduct).toBe('function');
      expect(typeof db.getProductBySku).toBe('function');
      expect(typeof db.getAllProducts).toBe('function');
      expect(typeof db.updateProduct).toBe('function');
      expect(typeof db.deleteProduct).toBe('function');
    });
  });

  describe('Sale CRUD', () => {
    test('should have all Sale CRUD methods', () => {
      expect(typeof db.createSale).toBe('function');
      expect(typeof db.getSale).toBe('function');
      expect(typeof db.getAllSales).toBe('function');
      expect(typeof db.getSalesByDate).toBe('function');
      expect(typeof db.updateSaleStatus).toBe('function');
      expect(typeof db.deleteSale).toBe('function');
    });
  });

  describe('SaleItem CRUD', () => {
    test('should have all SaleItem CRUD methods', () => {
      expect(typeof db.createSaleItem).toBe('function');
      expect(typeof db.getSaleItem).toBe('function');
      expect(typeof db.getSaleItems).toBe('function');
      expect(typeof db.updateSaleItem).toBe('function');
      expect(typeof db.deleteSaleItem).toBe('function');
    });
  });

  describe('Payment CRUD', () => {
    test('should have all Payment CRUD methods', () => {
      expect(typeof db.createPayment).toBe('function');
      expect(typeof db.getPayment).toBe('function');
      expect(typeof db.getPayments).toBe('function');
      expect(typeof db.updatePayment).toBe('function');
      expect(typeof db.deletePayment).toBe('function');
    });
  });

  describe('Transaction Management', () => {
    test('should have transaction support', () => {
      expect(typeof db.executeTransaction).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      const newDb = new (Database as any)();
      
      try {
        await newDb.createProduct({
          sku: 'TEST001',
          name: 'Test Product',
          price: 10.99,
          cost: 5.50
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe('NO_CONNECTION');
      }
    });
  });
});