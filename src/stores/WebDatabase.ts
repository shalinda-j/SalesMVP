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
  DatabaseService,
  User,
  CreateUserInput,
  UpdateUserInput,
  BusinessSettings,
  UserProfile,
  AuditLog
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
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn('⚠️ WebDatabase: Not in browser environment, skipping initialization');
        resolve();
        return;
      }
      
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

        // Create users store
        if (!db.objectStoreNames.contains('users')) {
          console.log('🌐 WebDatabase: Creating users store...');
          const usersStore = db.createObjectStore('users', { keyPath: 'id' });
          usersStore.createIndex('username', 'username', { unique: true });
          usersStore.createIndex('email', 'email', { unique: true });
        }

        // Create user_passwords store
        if (!db.objectStoreNames.contains('user_passwords')) {
          console.log('🌐 WebDatabase: Creating user_passwords store...');
          const userPasswordsStore = db.createObjectStore('user_passwords', { keyPath: 'userId' });
        }

        // Create auth_sessions store
        if (!db.objectStoreNames.contains('auth_sessions')) {
          console.log('🌐 WebDatabase: Creating auth_sessions store...');
          const authSessionsStore = db.createObjectStore('auth_sessions', { keyPath: 'id' });
          authSessionsStore.createIndex('token', 'token', { unique: true });
          authSessionsStore.createIndex('userId', 'userId');
        }

        // Create audit_logs store
        if (!db.objectStoreNames.contains('audit_logs')) {
          console.log('🌐 WebDatabase: Creating audit_logs store...');
          const auditLogsStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          auditLogsStore.createIndex('userId', 'userId');
          auditLogsStore.createIndex('timestamp', 'timestamp');
        }

        // Create business_settings store
        if (!db.objectStoreNames.contains('business_settings')) {
          console.log('🌐 WebDatabase: Creating business_settings store...');
          const businessSettingsStore = db.createObjectStore('business_settings', { keyPath: 'id' });
        }

        // Create user_profiles store
        if (!db.objectStoreNames.contains('user_profiles')) {
          console.log('🌐 WebDatabase: Creating user_profiles store...');
          const userProfilesStore = db.createObjectStore('user_profiles', { keyPath: 'id' });
          userProfilesStore.createIndex('userId', 'userId', { unique: true });
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
      // If we're not in a browser environment, throw a more descriptive error
      if (typeof window === 'undefined') {
        throw new Error('Database not available in server-side environment');
      }
      throw new Error('Database not initialized. Please call initialize() first.');
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

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
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

  // User management operations
  public async createUser(input: CreateUserInput): Promise<User> {
    const db = this.getDb();
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');

    const user: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(user);
      
      request.onsuccess = () => {
        resolve(user);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to create user'));
      };
    });
  }

  public async getUser(id: string): Promise<User | null> {
    const db = this.getDb();
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get user'));
      };
    });
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    const db = this.getDb();
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');
    const index = store.index('username');

    return new Promise((resolve, reject) => {
      const request = index.get(username);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get user by username'));
      };
    });
  }

  public async getAllUsers(): Promise<User[]> {
    const db = this.getDb();
    const transaction = db.transaction(['users'], 'readonly');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get all users'));
      };
    });
  }

  public async updateUser(input: UpdateUserInput): Promise<User> {
    const db = this.getDb();
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const getRequest = store.get(input.id);
      
      getRequest.onsuccess = () => {
        const existingUser = getRequest.result;
        if (!existingUser) {
          reject(new Error('User not found'));
          return;
        }

        const updatedUser: User = {
          ...existingUser,
          ...input,
          updatedAt: new Date()
        };

        const putRequest = store.put(updatedUser);
        
        putRequest.onsuccess = () => {
          resolve(updatedUser);
        };
        
        putRequest.onerror = () => {
          reject(new Error('Failed to update user'));
        };
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to get user for update'));
      };
    });
  }

  public async deleteUser(id: string): Promise<boolean> {
    const db = this.getDb();
    const transaction = db.transaction(['users'], 'readwrite');
    const store = transaction.objectStore('users');

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to delete user'));
      };
    });
  }

  // Password management
  public async saveUserPassword(userId: string, passwordHash: string, salt: string): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction(['user_passwords'], 'readwrite');
    const store = transaction.objectStore('user_passwords');

    return new Promise((resolve, reject) => {
      const request = store.put({ userId, passwordHash, salt });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to save user password'));
      };
    });
  }

  public async getUserPassword(userId: string): Promise<{ passwordHash: string; salt: string } | null> {
    const db = this.getDb();
    const transaction = db.transaction(['user_passwords'], 'readonly');
    const store = transaction.objectStore('user_passwords');

    return new Promise((resolve, reject) => {
      const request = store.get(userId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get user password'));
      };
    });
  }

  // Session management
  public async saveAuthSession(sessionId: string, userId: string, token: string, expiresAt: Date): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction(['auth_sessions'], 'readwrite');
    const store = transaction.objectStore('auth_sessions');

    return new Promise((resolve, reject) => {
      const request = store.put({
        id: sessionId,
        userId,
        token,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to save auth session'));
      };
    });
  }

  public async getAuthSession(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  } | null> {
    const db = this.getDb();
    const transaction = db.transaction(['auth_sessions'], 'readonly');
    const store = transaction.objectStore('auth_sessions');
    const index = store.index('token');

    return new Promise((resolve, reject) => {
      const request = index.get(token);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        resolve({
          id: result.id,
          userId: result.userId,
          token: result.token,
          expiresAt: new Date(result.expiresAt),
          createdAt: new Date(result.createdAt)
        });
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get auth session'));
      };
    });
  }

  public async deleteAuthSession(token: string): Promise<boolean> {
    const db = this.getDb();
    const transaction = db.transaction(['auth_sessions'], 'readwrite');
    const store = transaction.objectStore('auth_sessions');
    const index = store.index('token');

    return new Promise((resolve, reject) => {
      const getRequest = index.getKey(token);
      
      getRequest.onsuccess = () => {
        const key = getRequest.result;
        if (!key) {
          resolve(false);
          return;
        }

        const deleteRequest = store.delete(key);
        
        deleteRequest.onsuccess = () => {
          resolve(true);
        };
        
        deleteRequest.onerror = () => {
          reject(new Error('Failed to delete auth session'));
        };
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to get auth session key'));
      };
    });
  }

  public async cleanExpiredSessions(): Promise<number> {
    const db = this.getDb();
    const transaction = db.transaction(['auth_sessions'], 'readwrite');
    const store = transaction.objectStore('auth_sessions');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const sessions = request.result || [];
        const now = new Date();
        const expiredSessions = sessions.filter(session => new Date(session.expiresAt) < now);
        
        let deletedCount = 0;
        expiredSessions.forEach(session => {
          const deleteRequest = store.delete(session.id);
          deleteRequest.onsuccess = () => {
            deletedCount++;
          };
        });
        
        resolve(deletedCount);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to clean expired sessions'));
      };
    });
  }

  // Audit logging
  public async logAuditEvent(userId: string | null, action: string, resource: string, details?: any, ipAddress?: string): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction(['audit_logs'], 'readwrite');
    const store = transaction.objectStore('audit_logs');

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: userId || '',
      action,
      resource,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      timestamp: new Date()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(auditLog);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to log audit event'));
      };
    });
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    const db = this.getDb();
    const transaction = db.transaction(['audit_logs'], 'readonly');
    const store = transaction.objectStore('audit_logs');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get audit logs'));
      };
    });
  }

  // Business settings and user profile
  public async getBusinessSettings(): Promise<BusinessSettings | null> {
    const db = this.getDb();
    const transaction = db.transaction(['business_settings'], 'readonly');
    const store = transaction.objectStore('business_settings');

    return new Promise((resolve, reject) => {
      const request = store.get('default');
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get business settings'));
      };
    });
  }

  public async saveBusinessSettings(settings: BusinessSettings): Promise<BusinessSettings> {
    const db = this.getDb();
    const transaction = db.transaction(['business_settings'], 'readwrite');
    const store = transaction.objectStore('business_settings');

    return new Promise((resolve, reject) => {
      const request = store.put(settings);
      
      request.onsuccess = () => {
        resolve(settings);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to save business settings'));
      };
    });
  }

  public async getUserProfile(userId: string): Promise<UserProfile | null> {
    const db = this.getDb();
    const transaction = db.transaction(['user_profiles'], 'readonly');
    const store = transaction.objectStore('user_profiles');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.get(userId);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get user profile'));
      };
    });
  }

  public async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    const db = this.getDb();
    const transaction = db.transaction(['user_profiles'], 'readwrite');
    const store = transaction.objectStore('user_profiles');

    return new Promise((resolve, reject) => {
      const request = store.put(profile);
      
      request.onsuccess = () => {
        resolve(profile);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to save user profile'));
      };
    });
  }
}
