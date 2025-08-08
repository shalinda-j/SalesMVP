import {
  Product,
  Sale,
  SaleItem,
  Payment,
  CreateProductInput,
  UpdateProductInput,
  CreateSaleInput,
  CreateSaleItemInput,
  CreatePaymentInput,
  DatabaseService
} from '../types';

/**
 * Web-compatible database implementation using IndexedDB
 * This is a fallback for web platform where SQLite is not available
 */
export class WebDatabase implements DatabaseService {
  private db: IDBDatabase | null = null;
  private dbName = 'SalesMVP';
  private version = 1;

  constructor() {}

  public async initialize(): Promise<void> {
    console.log('🌐 WebDatabase: Starting IndexedDB initialization...');
    
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        const error = new Error('IndexedDB is not supported in this browser');
        console.error('❌ WebDatabase:', error.message);
        reject(error);
        return;
      }

      console.log('🌐 WebDatabase: Opening IndexedDB...', { dbName: this.dbName, version: this.version });
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => {
        const error = new Error(`Failed to open IndexedDB: ${request.error?.message}`);
        console.error('❌ WebDatabase:', error.message, event);
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ WebDatabase: IndexedDB opened successfully');
        console.log('🌐 WebDatabase: Available object stores:', Array.from(this.db.objectStoreNames));
        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log('🔄 WebDatabase: Database upgrade needed, creating stores...');
        const db = (event.target as IDBOpenDBRequest).result;

        // Create products store
        if (!db.objectStoreNames.contains('products')) {
          console.log('🌐 WebDatabase: Creating products store...');
          const productsStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
          productsStore.createIndex('sku', 'sku', { unique: true });
        }

        // Create sales store
        if (!db.objectStoreNames.contains('sales')) {
          console.log('🌐 WebDatabase: Creating sales store...');
          const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
          salesStore.createIndex('timestamp', 'timestamp');
        }

        // Create sale_items store
        if (!db.objectStoreNames.contains('sale_items')) {
          console.log('🌐 WebDatabase: Creating sale_items store...');
          const saleItemsStore = db.createObjectStore('sale_items', { keyPath: 'id', autoIncrement: true });
          saleItemsStore.createIndex('sale_id', 'sale_id');
        }

        // Create payments store
        if (!db.objectStoreNames.contains('payments')) {
          console.log('🌐 WebDatabase: Creating payments store...');
          const paymentsStore = db.createObjectStore('payments', { keyPath: 'id', autoIncrement: true });
          paymentsStore.createIndex('sale_id', 'sale_id');
        }

        console.log('✅ WebDatabase: All IndexedDB stores created successfully');
      };

      request.onblocked = (event) => {
        console.warn('⚠️ WebDatabase: IndexedDB upgrade blocked:', event);
      };
    });
  }

  private getDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Product operations
  public async createProduct(input: CreateProductInput): Promise<Product> {
    const db = this.getDb();
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');

    const productData = {
      ...input,
      stock_qty: input.stock_qty || 0,
      tax_rate: input.tax_rate || 0.0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(productData);
      
      request.onsuccess = () => {
        resolve({
          id: request.result as number,
          ...productData
        });
      };
      
      request.onerror = () => {
        reject(new Error('Failed to create product'));
      };
    });
  }

  public async getProduct(id: number): Promise<Product | null> {
    const db = this.getDb();
    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get product'));
      };
    });
  }

  public async getProductBySku(sku: string): Promise<Product | null> {
    const db = this.getDb();
    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');
    const index = store.index('sku');

    return new Promise((resolve, reject) => {
      const request = index.get(sku);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get product by SKU'));
      };
    });
  }

  public async getAllProducts(): Promise<Product[]> {
    const db = this.getDb();
    const transaction = db.transaction(['products'], 'readonly');
    const store = transaction.objectStore('products');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get all products'));
      };
    });
  }

  public async updateProduct(input: UpdateProductInput): Promise<Product> {
    const product = await this.getProduct(input.id);
    if (!product) {
      throw new Error('Product not found');
    }

    const updatedProduct = { ...product, ...input };
    
    const db = this.getDb();
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');

    return new Promise((resolve, reject) => {
      const request = store.put(updatedProduct);
      
      request.onsuccess = () => {
        resolve(updatedProduct);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to update product'));
      };
    });
  }

  public async deleteProduct(id: number): Promise<boolean> {
    const db = this.getDb();
    const transaction = db.transaction(['products'], 'readwrite');
    const store = transaction.objectStore('products');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete product'));
      };
    });
  }

  // Sale operations
  public async createSale(input: CreateSaleInput): Promise<Sale> {
    const db = this.getDb();
    const transaction = db.transaction(['sales'], 'readwrite');
    const store = transaction.objectStore('sales');

    const saleData = {
      ...input,
      timestamp: new Date().toISOString(),
      status: input.status || 'completed'
    };

    return new Promise((resolve, reject) => {
      const request = store.add(saleData);
      
      request.onsuccess = () => {
        resolve({
          id: request.result as number,
          ...saleData
        });
      };
      
      request.onerror = () => {
        reject(new Error('Failed to create sale'));
      };
    });
  }

  public async getSale(id: number): Promise<Sale | null> {
    const db = this.getDb();
    const transaction = db.transaction(['sales'], 'readonly');
    const store = transaction.objectStore('sales');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get sale'));
      };
    });
  }

  public async getAllSales(): Promise<Sale[]> {
    const db = this.getDb();
    const transaction = db.transaction(['sales'], 'readonly');
    const store = transaction.objectStore('sales');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Sort by timestamp descending
        const sales = request.result.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sales);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get all sales'));
      };
    });
  }

  public async getSalesByDate(date: string): Promise<Sale[]> {
    const sales = await this.getAllSales();
    const targetDate = new Date(date).toDateString();
    
    return sales.filter(sale => 
      new Date(sale.timestamp).toDateString() === targetDate
    );
  }

  public async updateSaleStatus(id: number, status: Sale['status']): Promise<Sale> {
    const sale = await this.getSale(id);
    if (!sale) {
      throw new Error('Sale not found');
    }

    const updatedSale = { ...sale, status };
    
    const db = this.getDb();
    const transaction = db.transaction(['sales'], 'readwrite');
    const store = transaction.objectStore('sales');

    return new Promise((resolve, reject) => {
      const request = store.put(updatedSale);
      
      request.onsuccess = () => {
        resolve(updatedSale);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to update sale status'));
      };
    });
  }

  public async deleteSale(id: number): Promise<boolean> {
    // Delete related items first
    const saleItems = await this.getSaleItems(id);
    for (const item of saleItems) {
      await this.deleteSaleItem(item.id);
    }

    const payments = await this.getPayments(id);
    for (const payment of payments) {
      await this.deletePayment(payment.id);
    }

    // Delete the sale
    const db = this.getDb();
    const transaction = db.transaction(['sales'], 'readwrite');
    const store = transaction.objectStore('sales');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete sale'));
      };
    });
  }

  // Simplified implementations for other methods to make this work
  public async createSaleItem(input: CreateSaleItemInput): Promise<SaleItem> {
    const db = this.getDb();
    const transaction = db.transaction(['sale_items'], 'readwrite');
    const store = transaction.objectStore('sale_items');

    return new Promise((resolve, reject) => {
      const request = store.add(input);
      
      request.onsuccess = () => {
        resolve({
          id: request.result as number,
          ...input
        });
      };
      
      request.onerror = () => {
        reject(new Error('Failed to create sale item'));
      };
    });
  }

  public async getSaleItem(id: number): Promise<SaleItem | null> {
    const db = this.getDb();
    const transaction = db.transaction(['sale_items'], 'readonly');
    const store = transaction.objectStore('sale_items');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get sale item'));
      };
    });
  }

  public async getSaleItems(saleId: number): Promise<SaleItem[]> {
    const db = this.getDb();
    const transaction = db.transaction(['sale_items'], 'readonly');
    const store = transaction.objectStore('sale_items');
    const index = store.index('sale_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(saleId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get sale items'));
      };
    });
  }

  public async updateSaleItem(id: number, qty: number, unit_price: number): Promise<SaleItem> {
    const saleItem = await this.getSaleItem(id);
    if (!saleItem) {
      throw new Error('Sale item not found');
    }

    const updatedItem = { ...saleItem, qty, unit_price };
    
    const db = this.getDb();
    const transaction = db.transaction(['sale_items'], 'readwrite');
    const store = transaction.objectStore('sale_items');

    return new Promise((resolve, reject) => {
      const request = store.put(updatedItem);
      
      request.onsuccess = () => {
        resolve(updatedItem);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to update sale item'));
      };
    });
  }

  public async deleteSaleItem(id: number): Promise<boolean> {
    const db = this.getDb();
    const transaction = db.transaction(['sale_items'], 'readwrite');
    const store = transaction.objectStore('sale_items');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete sale item'));
      };
    });
  }

  // Payment operations (simplified)
  public async createPayment(input: CreatePaymentInput): Promise<Payment> {
    const db = this.getDb();
    const transaction = db.transaction(['payments'], 'readwrite');
    const store = transaction.objectStore('payments');

    return new Promise((resolve, reject) => {
      const request = store.add(input);
      
      request.onsuccess = () => {
        resolve({
          id: request.result as number,
          ...input
        });
      };
      
      request.onerror = () => {
        reject(new Error('Failed to create payment'));
      };
    });
  }

  public async getPayment(id: number): Promise<Payment | null> {
    const db = this.getDb();
    const transaction = db.transaction(['payments'], 'readonly');
    const store = transaction.objectStore('payments');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get payment'));
      };
    });
  }

  public async getPayments(saleId: number): Promise<Payment[]> {
    const db = this.getDb();
    const transaction = db.transaction(['payments'], 'readonly');
    const store = transaction.objectStore('payments');
    const index = store.index('sale_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(saleId);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get payments'));
      };
    });
  }

  public async updatePayment(id: number, amount: number, reference?: string): Promise<Payment> {
    const payment = await this.getPayment(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const updatedPayment = { ...payment, amount, reference };
    
    const db = this.getDb();
    const transaction = db.transaction(['payments'], 'readwrite');
    const store = transaction.objectStore('payments');

    return new Promise((resolve, reject) => {
      const request = store.put(updatedPayment);
      
      request.onsuccess = () => {
        resolve(updatedPayment);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to update payment'));
      };
    });
  }

  public async deletePayment(id: number): Promise<boolean> {
    const db = this.getDb();
    const transaction = db.transaction(['payments'], 'readwrite');
    const store = transaction.objectStore('payments');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete payment'));
      };
    });
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Web database connection closed');
    }
  }

  public async executeTransaction<T>(operations: (db: any) => Promise<T>): Promise<T> {
    // For simplicity, just execute the operations without transaction wrapper
    // In a real implementation, you'd want proper transaction handling
    return operations(this.db);
  }

  public async getStats(): Promise<{
    totalProducts: number;
    totalSales: number;
    totalRevenue: number;
  }> {
    const products = await this.getAllProducts();
    const sales = await this.getAllSales();
    const totalRevenue = sales
      .filter(sale => sale.status === 'completed')
      .reduce((sum, sale) => sum + sale.total, 0);

    return {
      totalProducts: products.length,
      totalSales: sales.length,
      totalRevenue
    };
  }

  public async getSalesSummaryByDate(date: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    averageTransaction: number;
    transactionCount: number;
  }> {
    try {
      const allSales = await this.getAllSales();
      
      // Filter sales by date (comparing just the date part)
      const salesForDate = allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp).toISOString().split('T')[0];
        return saleDate === date;
      });

      const completedSales = salesForDate.filter(sale => sale.status === 'completed');
      const totalRevenue = completedSales.reduce((sum, sale) => sum + sale.total, 0);
      const transactionCount = completedSales.length;
      const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

      return {
        totalSales: salesForDate.length,
        totalRevenue,
        averageTransaction,
        transactionCount,
      };
    } catch (error) {
      console.error('Failed to get sales summary by date:', error);
      throw error;
    }
  }
}
