import { Database, DatabaseError } from '../Database';
import { CreateProductInput, CreateSaleInput, CreateSaleItemInput, CreatePaymentInput } from '../../types';

// Mock expo-sqlite
const mockDb = {
  execAsync: jest.fn(),
  runAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  getAllAsync: jest.fn(),
  closeAsync: jest.fn(),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve(mockDb)),
}));

describe('Database', () => {
  let database: Database;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Get a fresh instance for each test
    database = Database.getInstance();
  });

  afterEach(async () => {
    // Clean up after each test
    await database.close();
  });

  describe('initialization', () => {
    it('should initialize database and create tables', async () => {
      mockDb.execAsync.mockResolvedValue(undefined);

      await database.initialize();

      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS products')
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sales')
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sale_items')
      );
      expect(mockDb.execAsync).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS payments')
      );
    });

    it('should throw DatabaseError if initialization fails', async () => {
      mockDb.execAsync.mockRejectedValue(new Error('Database error'));

      await expect(database.initialize()).rejects.toThrow(DatabaseError);
    });
  });

  describe('Product operations', () => {
    beforeEach(async () => {
      mockDb.execAsync.mockResolvedValue(undefined);
      await database.initialize();
    });

    it('should create a product successfully', async () => {
      const productInput: CreateProductInput = {
        sku: 'TEST001',
        name: 'Test Product',
        price: 10.99,
        cost: 5.50,
        stock_qty: 100,
        tax_rate: 0.08,
      };

      const mockProduct = {
        id: 1,
        ...productInput,
      };

      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1 });
      mockDb.getFirstAsync.mockResolvedValue(mockProduct);

      const result = await database.createProduct(productInput);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO products'),
        [productInput.sku, productInput.name, productInput.price, productInput.cost, productInput.stock_qty, productInput.tax_rate]
      );
      expect(result).toEqual(mockProduct);
    });

    it('should get product by ID', async () => {
      const mockProduct = {
        id: 1,
        sku: 'TEST001',
        name: 'Test Product',
        price: 10.99,
        cost: 5.50,
        stock_qty: 100,
        tax_rate: 0.08,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockProduct);

      const result = await database.getProduct(1);

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE id = ?',
        [1]
      );
      expect(result).toEqual(mockProduct);
    });

    it('should get product by SKU', async () => {
      const mockProduct = {
        id: 1,
        sku: 'TEST001',
        name: 'Test Product',
        price: 10.99,
        cost: 5.50,
        stock_qty: 100,
        tax_rate: 0.08,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockProduct);

      const result = await database.getProductBySku('TEST001');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        'SELECT * FROM products WHERE sku = ?',
        ['TEST001']
      );
      expect(result).toEqual(mockProduct);
    });

    it('should get all products', async () => {
      const mockProducts = [
        { id: 1, sku: 'TEST001', name: 'Product 1', price: 10.99, cost: 5.50, stock_qty: 100, tax_rate: 0.08 },
        { id: 2, sku: 'TEST002', name: 'Product 2', price: 15.99, cost: 8.00, stock_qty: 50, tax_rate: 0.08 },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockProducts);

      const result = await database.getAllProducts();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith('SELECT * FROM products ORDER BY name');
      expect(result).toEqual(mockProducts);
    });

    it('should delete product', async () => {
      mockDb.runAsync.mockResolvedValue({ changes: 1 });

      const result = await database.deleteProduct(1);

      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM products WHERE id = ?', [1]);
      expect(result).toBe(true);
    });
  });

  describe('Sale operations', () => {
    beforeEach(async () => {
      mockDb.execAsync.mockResolvedValue(undefined);
      await database.initialize();
    });

    it('should create a sale successfully', async () => {
      const saleInput: CreateSaleInput = {
        total: 25.99,
        tax_total: 2.08,
        status: 'completed',
      };

      const mockSale = {
        id: 1,
        timestamp: '2023-01-01 12:00:00',
        ...saleInput,
      };

      mockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1 });
      mockDb.getFirstAsync.mockResolvedValue(mockSale);

      const result = await database.createSale(saleInput);

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sales'),
        [saleInput.total, saleInput.tax_total, saleInput.status]
      );
      expect(result).toEqual(mockSale);
    });

    it('should get sales by date', async () => {
      const mockSales = [
        { id: 1, timestamp: '2023-01-01 12:00:00', total: 25.99, tax_total: 2.08, status: 'completed' },
        { id: 2, timestamp: '2023-01-01 14:30:00', total: 15.50, tax_total: 1.24, status: 'completed' },
      ];

      mockDb.getAllAsync.mockResolvedValue(mockSales);

      const result = await database.getSalesByDate('2023-01-01');

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE DATE(timestamp) = DATE(?)'),
        ['2023-01-01']
      );
      expect(result).toEqual(mockSales);
    });

    it('should get sales summary by date', async () => {
      const mockSummary = {
        total_sales: 5,
        completed_sales: 4,
        total_revenue: 150.75,
        average_transaction: 37.69,
      };

      mockDb.getFirstAsync.mockResolvedValue(mockSummary);

      const result = await database.getSalesSummaryByDate('2023-01-01');

      expect(result).toEqual({
        totalSales: 5,
        totalRevenue: 150.75,
        averageTransaction: 37.69,
        transactionCount: 4,
      });
    });
  });

  describe('Transaction handling', () => {
    beforeEach(async () => {
      mockDb.execAsync.mockResolvedValue(undefined);
      await database.initialize();
    });

    it('should execute transaction successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await database.executeTransaction(mockOperation);

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockOperation).toHaveBeenCalledWith(mockDb);
      expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT');
      expect(result).toBe('success');
    });

    it('should rollback transaction on error', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(database.executeTransaction(mockOperation)).rejects.toThrow('Operation failed');

      expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION');
      expect(mockDb.execAsync).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Error handling', () => {
    it('should throw DatabaseError when database is not initialized', async () => {
      const uninitializedDb = Database.getInstance();

      await expect(uninitializedDb.getProduct(1)).rejects.toThrow(DatabaseError);
    });
  });
});