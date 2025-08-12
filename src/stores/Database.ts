import * as SQLite from 'expo-sqlite';
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
    BusinessSettings,
    UserProfile,
    AuditLog
} from '../types';
import {
    User,
    UserRole,
    CreateUserInput,
    UpdateUserInput
} from '../types/auth';

class Database implements DatabaseService {
    private db: SQLite.SQLiteDatabase | null = null;
    private static instance: Database;

    private constructor() { }

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    /**
     * Initialize the database connection and create tables
     */
    public async initialize(): Promise<void> {
        try {
            console.log('Opening SQLite database...');
            this.db = await SQLite.openDatabaseAsync('salesMVP.db');
            console.log('SQLite database opened successfully');
            
            console.log('Creating database tables...');
            await this.createTables();
            console.log('Database tables created successfully');
            
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            this.db = null; // Reset on failure
            throw new DatabaseError({
                code: 'INIT_ERROR',
                message: `Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    /**
     * Create all required database tables
     */
    private async createTables(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        try {
            console.log('Creating users table...');
            // Create users table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'cashier')),
          is_active INTEGER DEFAULT 1,
          last_login DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Create user_passwords table for secure password storage
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_passwords (
          user_id TEXT PRIMARY KEY,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);

            // Create auth_sessions table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);

            // Create audit_logs table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          details TEXT,
          ip_address TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        );
      `);

            // Create products table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sku TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          cost REAL NOT NULL,
          stock_qty INTEGER DEFAULT 0,
          tax_rate REAL DEFAULT 0.0
        );
      `);

            // Create sales table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          total REAL NOT NULL,
          tax_total REAL NOT NULL,
          status TEXT DEFAULT 'completed'
        );
      `);

            // Create sale_items table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          qty INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          FOREIGN KEY (sale_id) REFERENCES sales (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        );
      `);

            // Create payments table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_id INTEGER NOT NULL,
          method TEXT NOT NULL,
          amount REAL NOT NULL,
          reference TEXT,
          FOREIGN KEY (sale_id) REFERENCES sales (id)
        );
      `);

            // Create sync metadata table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          data_snapshot TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          synced_at DATETIME,
          device_id TEXT NOT NULL,
          sync_status TEXT DEFAULT 'PENDING',
          retry_count INTEGER DEFAULT 0,
          conflict_resolution TEXT,
          version INTEGER DEFAULT 1
        );
      `);

            // Create business_settings table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS business_settings (
          id TEXT PRIMARY KEY,
          business_name TEXT NOT NULL,
          business_logo TEXT,
          business_address TEXT NOT NULL,
          business_phone TEXT NOT NULL,
          business_email TEXT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          currency_symbol TEXT NOT NULL DEFAULT '$',
          tax_rate REAL NOT NULL DEFAULT 0.08,
          timezone TEXT NOT NULL DEFAULT 'UTC',
          language TEXT NOT NULL DEFAULT 'en',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Create user_profiles table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          avatar TEXT,
          phone_number TEXT,
          address TEXT,
          preferences TEXT NOT NULL DEFAULT '{"theme":"auto","notifications":true,"language":"en"}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);

            // Create sync conflicts table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id TEXT PRIMARY KEY,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          local_data TEXT,
          remote_data TEXT,
          local_version INTEGER,
          remote_version INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolution_strategy TEXT,
          resolved_data TEXT
        );
      `);

            // Create sync config table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

            // Create sync queue table
            await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id TEXT PRIMARY KEY,
          operation TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT,
          priority INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          retry_count INTEGER DEFAULT 0,
          last_error TEXT
        );
      `);

            console.log('All database tables created successfully');
        } catch (error) {
            console.error('Failed to create tables:', error);
            throw new DatabaseError({
                code: 'TABLE_CREATION_ERROR',
                message: 'Failed to create database tables'
            });
        }
    }

    /**
     * Get database connection
     */
    private getConnection(): SQLite.SQLiteDatabase {
        if (!this.db) {
            console.error('Database not initialized. Attempting to initialize...');
            throw new DatabaseError({
                code: 'NO_CONNECTION',
                message: 'Database not initialized. Call initialize() first.'
            });
        }
        return this.db;
    }

    /**
     * Check if database is initialized
     */
    public isInitialized(): boolean {
        return this.db !== null;
    }

    // Product operations
    public async createProduct(input: CreateProductInput): Promise<Product> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync(
                `INSERT INTO products (sku, name, price, cost, stock_qty, tax_rate) 
         VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    input.sku,
                    input.name,
                    input.price,
                    input.cost,
                    input.stock_qty || 0,
                    input.tax_rate || 0.0
                ]
            );

            const product = await this.getProduct(result.lastInsertRowId);
            if (!product) {
                throw new Error('Failed to retrieve created product');
            }

            return product;
        } catch (error) {
            console.error('Failed to create product:', error);
            throw new DatabaseError({
                code: 'CREATE_PRODUCT_ERROR',
                message: 'Failed to create product',
                table: 'products'
            });
        }
    }

    public async getProduct(id: number): Promise<Product | null> {
        const db = this.getConnection();

        try {
            const result = await db.getFirstAsync<Product>(
                'SELECT * FROM products WHERE id = ?',
                [id]
            );

            return result || null;
        } catch (error) {
            console.error('Failed to get product:', error);
            throw new DatabaseError({
                code: 'GET_PRODUCT_ERROR',
                message: 'Failed to retrieve product',
                table: 'products'
            });
        }
    }

    public async getProductBySku(sku: string): Promise<Product | null> {
        const db = this.getConnection();

        try {
            const result = await db.getFirstAsync<Product>(
                'SELECT * FROM products WHERE sku = ?',
                [sku]
            );

            return result || null;
        } catch (error) {
            console.error('Failed to get product by SKU:', error);
            throw new DatabaseError({
                code: 'GET_PRODUCT_BY_SKU_ERROR',
                message: 'Failed to retrieve product by SKU',
                table: 'products'
            });
        }
    }

    public async getAllProducts(): Promise<Product[]> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync<Product>('SELECT * FROM products ORDER BY name');
            return result;
        } catch (error) {
            console.error('Failed to get all products:', error);
            throw new DatabaseError({
                code: 'GET_ALL_PRODUCTS_ERROR',
                message: 'Failed to retrieve all products',
                table: 'products'
            });
        }
    }

    public async updateProduct(input: UpdateProductInput): Promise<Product> {
        const db = this.getConnection();

        try {
            const updates: string[] = [];
            const values: any[] = [];

            if (input.sku !== undefined) {
                updates.push('sku = ?');
                values.push(input.sku);
            }
            if (input.name !== undefined) {
                updates.push('name = ?');
                values.push(input.name);
            }
            if (input.price !== undefined) {
                updates.push('price = ?');
                values.push(input.price);
            }
            if (input.cost !== undefined) {
                updates.push('cost = ?');
                values.push(input.cost);
            }
            if (input.stock_qty !== undefined) {
                updates.push('stock_qty = ?');
                values.push(input.stock_qty);
            }
            if (input.tax_rate !== undefined) {
                updates.push('tax_rate = ?');
                values.push(input.tax_rate);
            }

            if (updates.length === 0) {
                throw new Error('No fields to update');
            }

            values.push(input.id);

            await db.runAsync(
                `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
                values
            );

            const product = await this.getProduct(input.id);
            if (!product) {
                throw new Error('Failed to retrieve updated product');
            }

            return product;
        } catch (error) {
            console.error('Failed to update product:', error);
            throw new DatabaseError({
                code: 'UPDATE_PRODUCT_ERROR',
                message: 'Failed to update product',
                table: 'products'
            });
        }
    }

    public async deleteProduct(id: number): Promise<boolean> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync('DELETE FROM products WHERE id = ?', [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Failed to delete product:', error);
            throw new DatabaseError({
                code: 'DELETE_PRODUCT_ERROR',
                message: 'Failed to delete product',
                table: 'products'
            });
        }
    }

    // Sale operations
    public async createSale(input: CreateSaleInput): Promise<Sale> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync(
                `INSERT INTO sales (total, tax_total, status) VALUES (?, ?, ?)`,
                [input.total, input.tax_total, input.status || 'completed']
            );

            const sale = await this.getSale(result.lastInsertRowId);
            if (!sale) {
                throw new Error('Failed to retrieve created sale');
            }

            return sale;
        } catch (error) {
            console.error('Failed to create sale:', error);
            throw new DatabaseError({
                code: 'CREATE_SALE_ERROR',
                message: 'Failed to create sale',
                table: 'sales'
            });
        }
    }

    public async getSale(id: number): Promise<Sale | null> {
        const db = this.getConnection();

        try {
            const result = await db.getFirstAsync<Sale>(
                'SELECT * FROM sales WHERE id = ?',
                [id]
            );

            return result || null;
        } catch (error) {
            console.error('Failed to get sale:', error);
            throw new DatabaseError({
                code: 'GET_SALE_ERROR',
                message: 'Failed to retrieve sale',
                table: 'sales'
            });
        }
    }

    public async getAllSales(): Promise<Sale[]> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync<Sale>(
                'SELECT * FROM sales ORDER BY timestamp DESC'
            );
            return result;
        } catch (error) {
            console.error('Failed to get all sales:', error);
            throw new DatabaseError({
                code: 'GET_ALL_SALES_ERROR',
                message: 'Failed to retrieve all sales',
                table: 'sales'
            });
        }
    }

    public async getSalesByDate(date: string): Promise<Sale[]> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync<Sale>(
                `SELECT * FROM sales 
         WHERE DATE(timestamp) = DATE(?) 
         ORDER BY timestamp DESC`,
                [date]
            );
            return result;
        } catch (error) {
            console.error('Failed to get sales by date:', error);
            throw new DatabaseError({
                code: 'GET_SALES_BY_DATE_ERROR',
                message: 'Failed to retrieve sales by date',
                table: 'sales'
            });
        }
    }

    public async updateSaleStatus(id: number, status: Sale['status']): Promise<Sale> {
        const db = this.getConnection();

        try {
            await db.runAsync(
                'UPDATE sales SET status = ? WHERE id = ?',
                [status, id]
            );

            const sale = await this.getSale(id);
            if (!sale) {
                throw new Error('Failed to retrieve updated sale');
            }

            return sale;
        } catch (error) {
            console.error('Failed to update sale status:', error);
            throw new DatabaseError({
                code: 'UPDATE_SALE_STATUS_ERROR',
                message: 'Failed to update sale status',
                table: 'sales'
            });
        }
    }

    public async deleteSale(id: number): Promise<boolean> {
        const db = this.getConnection();

        try {
            // Use transaction to ensure data integrity when deleting sale and related items
            return await this.executeTransaction(async (db) => {
                // Delete related sale items first
                await db.runAsync('DELETE FROM sale_items WHERE sale_id = ?', [id]);
                
                // Delete related payments
                await db.runAsync('DELETE FROM payments WHERE sale_id = ?', [id]);
                
                // Delete the sale
                const result = await db.runAsync('DELETE FROM sales WHERE id = ?', [id]);
                
                return result.changes > 0;
            });
        } catch (error) {
            console.error('Failed to delete sale:', error);
            throw new DatabaseError({
                code: 'DELETE_SALE_ERROR',
                message: 'Failed to delete sale',
                table: 'sales'
            });
        }
    }
    // Sale item operations
    public async createSaleItem(input: CreateSaleItemInput): Promise<SaleItem> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync(
                `INSERT INTO sale_items (sale_id, product_id, qty, unit_price) 
         VALUES (?, ?, ?, ?)`,
                [input.sale_id, input.product_id, input.qty, input.unit_price]
            );

            const saleItem = await db.getFirstAsync<SaleItem>(
                'SELECT * FROM sale_items WHERE id = ?',
                [result.lastInsertRowId]
            );

            if (!saleItem) {
                throw new Error('Failed to retrieve created sale item');
            }

            return saleItem;
        } catch (error) {
            console.error('Failed to create sale item:', error);
            throw new DatabaseError({
                code: 'CREATE_SALE_ITEM_ERROR',
                message: 'Failed to create sale item',
                table: 'sale_items'
            });
        }
    }

    public async getSaleItem(id: number): Promise<SaleItem | null> {
        const db = this.getConnection();

        try {
            const result = await db.getFirstAsync<SaleItem>(
                'SELECT * FROM sale_items WHERE id = ?',
                [id]
            );

            return result || null;
        } catch (error) {
            console.error('Failed to get sale item:', error);
            throw new DatabaseError({
                code: 'GET_SALE_ITEM_ERROR',
                message: 'Failed to retrieve sale item',
                table: 'sale_items'
            });
        }
    }

    public async getSaleItems(saleId: number): Promise<SaleItem[]> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync<SaleItem>(
                'SELECT * FROM sale_items WHERE sale_id = ?',
                [saleId]
            );
            return result;
        } catch (error) {
            console.error('Failed to get sale items:', error);
            throw new DatabaseError({
                code: 'GET_SALE_ITEMS_ERROR',
                message: 'Failed to retrieve sale items',
                table: 'sale_items'
            });
        }
    }

    public async updateSaleItem(id: number, qty: number, unit_price: number): Promise<SaleItem> {
        const db = this.getConnection();

        try {
            await db.runAsync(
                'UPDATE sale_items SET qty = ?, unit_price = ? WHERE id = ?',
                [qty, unit_price, id]
            );

            const saleItem = await this.getSaleItem(id);
            if (!saleItem) {
                throw new Error('Failed to retrieve updated sale item');
            }

            return saleItem;
        } catch (error) {
            console.error('Failed to update sale item:', error);
            throw new DatabaseError({
                code: 'UPDATE_SALE_ITEM_ERROR',
                message: 'Failed to update sale item',
                table: 'sale_items'
            });
        }
    }

    public async deleteSaleItem(id: number): Promise<boolean> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync('DELETE FROM sale_items WHERE id = ?', [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Failed to delete sale item:', error);
            throw new DatabaseError({
                code: 'DELETE_SALE_ITEM_ERROR',
                message: 'Failed to delete sale item',
                table: 'sale_items'
            });
        }
    }

    // Payment operations
    public async createPayment(input: CreatePaymentInput): Promise<Payment> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync(
                `INSERT INTO payments (sale_id, method, amount, reference) 
         VALUES (?, ?, ?, ?)`,
                [input.sale_id, input.method, input.amount, input.reference || null]
            );

            const payment = await db.getFirstAsync<Payment>(
                'SELECT * FROM payments WHERE id = ?',
                [result.lastInsertRowId]
            );

            if (!payment) {
                throw new Error('Failed to retrieve created payment');
            }

            return payment;
        } catch (error) {
            console.error('Failed to create payment:', error);
            throw new DatabaseError({
                code: 'CREATE_PAYMENT_ERROR',
                message: 'Failed to create payment',
                table: 'payments'
            });
        }
    }

    public async getPayment(id: number): Promise<Payment | null> {
        const db = this.getConnection();

        try {
            const result = await db.getFirstAsync<Payment>(
                'SELECT * FROM payments WHERE id = ?',
                [id]
            );

            return result || null;
        } catch (error) {
            console.error('Failed to get payment:', error);
            throw new DatabaseError({
                code: 'GET_PAYMENT_ERROR',
                message: 'Failed to retrieve payment',
                table: 'payments'
            });
        }
    }

    public async getPayments(saleId: number): Promise<Payment[]> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync<Payment>(
                'SELECT * FROM payments WHERE sale_id = ?',
                [saleId]
            );
            return result;
        } catch (error) {
            console.error('Failed to get payments:', error);
            throw new DatabaseError({
                code: 'GET_PAYMENTS_ERROR',
                message: 'Failed to retrieve payments',
                table: 'payments'
            });
        }
    }

    public async updatePayment(id: number, amount: number, reference?: string): Promise<Payment> {
        const db = this.getConnection();

        try {
            await db.runAsync(
                'UPDATE payments SET amount = ?, reference = ? WHERE id = ?',
                [amount, reference || null, id]
            );

            const payment = await this.getPayment(id);
            if (!payment) {
                throw new Error('Failed to retrieve updated payment');
            }

            return payment;
        } catch (error) {
            console.error('Failed to update payment:', error);
            throw new DatabaseError({
                code: 'UPDATE_PAYMENT_ERROR',
                message: 'Failed to update payment',
                table: 'payments'
            });
        }
    }

    public async deletePayment(id: number): Promise<boolean> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync('DELETE FROM payments WHERE id = ?', [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Failed to delete payment:', error);
            throw new DatabaseError({
                code: 'DELETE_PAYMENT_ERROR',
                message: 'Failed to delete payment',
                table: 'payments'
            });
        }
    }

    /**
     * Close database connection
     */
    public async close(): Promise<void> {
        if (this.db) {
            await this.db.closeAsync();
            this.db = null;
            console.log('Database connection closed');
        }
    }

    /**
     * Execute a transaction with rollback support
     */
    public async executeTransaction<T>(
        operations: (db: SQLite.SQLiteDatabase) => Promise<T>
    ): Promise<T> {
        const db = this.getConnection();

        try {
            await db.execAsync('BEGIN TRANSACTION');
            const result = await operations(db);
            await db.execAsync('COMMIT');
            return result;
        } catch (error) {
            await db.execAsync('ROLLBACK');
            console.error('Transaction rolled back:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     */
    public async getStats(): Promise<{
        totalProducts: number;
        totalSales: number;
        totalRevenue: number;
    }> {
        const db = this.getConnection();

        try {
            const productCount = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM products'
            );

            const salesCount = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM sales'
            );

            const revenue = await db.getFirstAsync<{ total: number }>(
                'SELECT SUM(total) as total FROM sales WHERE status = "completed"'
            );

            return {
                totalProducts: productCount?.count || 0,
                totalSales: salesCount?.count || 0,
                totalRevenue: revenue?.total || 0
            };
        } catch (error) {
            console.error('Failed to get database stats:', error);
            throw new DatabaseError({
                code: 'GET_STATS_ERROR',
                message: 'Failed to retrieve database statistics'
            });
        }
    }

    /**
     * Get sales summary for a specific date
     */
    public async getSalesSummaryByDate(date: string): Promise<{
        totalSales: number;
        totalRevenue: number;
        averageTransaction: number;
        transactionCount: number;
    }> {
        const db = this.getConnection();

        try {
            const summary = await db.getFirstAsync<{
                total_sales: number;
                completed_sales: number;
                total_revenue: number;
                average_transaction: number;
            }>(
                `SELECT 
                    COUNT(*) as total_sales,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sales,
                    COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) as total_revenue,
                    COALESCE(AVG(CASE WHEN status = 'completed' THEN total END), 0) as average_transaction
                 FROM sales 
                 WHERE DATE(timestamp) = DATE(?)`,
                [date]
            );

            return {
                totalSales: summary?.total_sales || 0,
                totalRevenue: summary?.total_revenue || 0,
                averageTransaction: summary?.average_transaction || 0,
                transactionCount: summary?.completed_sales || 0,
            };
        } catch (error) {
            console.error('Failed to get sales summary by date:', error);
            throw new DatabaseError({
                code: 'GET_SALES_SUMMARY_ERROR',
                message: 'Failed to retrieve sales summary',
                table: 'sales'
            });
        }
    }

    // ==================== USER MANAGEMENT METHODS ====================

    /**
     * Get all users
     */
    public async getAllUsers(): Promise<User[]> {
        const db = this.getConnection();

        try {
            const users = await db.getAllAsync<{
                id: string;
                username: string;
                email: string;
                first_name: string;
                last_name: string;
                role: string;
                is_active: number;
                last_login: string | null;
                created_at: string;
                updated_at: string;
            }>('SELECT * FROM users ORDER BY created_at DESC');

            return users.map(user => ({
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role as UserRole,
                isActive: Boolean(user.is_active),
                lastLogin: user.last_login ? new Date(user.last_login) : undefined,
                createdAt: new Date(user.created_at),
                updatedAt: new Date(user.updated_at)
            }));
        } catch (error) {
            console.error('Failed to get all users:', error);
            throw new DatabaseError({
                code: 'GET_USERS_ERROR',
                message: 'Failed to retrieve users',
                table: 'users'
            });
        }
    }

    /**
     * Get user by ID
     */
    public async getUser(id: string): Promise<User | null> {
        const db = this.getConnection();

        try {
            const user = await db.getFirstAsync<{
                id: string;
                username: string;
                email: string;
                first_name: string;
                last_name: string;
                role: string;
                is_active: number;
                last_login: string | null;
                created_at: string;
                updated_at: string;
            }>('SELECT * FROM users WHERE id = ?', [id]);

            if (!user) {return null;}

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role as UserRole,
                isActive: Boolean(user.is_active),
                lastLogin: user.last_login ? new Date(user.last_login) : undefined,
                createdAt: new Date(user.created_at),
                updatedAt: new Date(user.updated_at)
            };
        } catch (error) {
            console.error('Failed to get user:', error);
            throw new DatabaseError({
                code: 'GET_USER_ERROR',
                message: 'Failed to retrieve user',
                table: 'users'
            });
        }
    }

    /**
     * Get user by username
     */
    public async getUserByUsername(username: string): Promise<User | null> {
        const db = this.getConnection();

        try {
            const user = await db.getFirstAsync<{
                id: string;
                username: string;
                email: string;
                first_name: string;
                last_name: string;
                role: string;
                is_active: number;
                last_login: string | null;
                created_at: string;
                updated_at: string;
            }>('SELECT * FROM users WHERE username = ?', [username]);

            if (!user) {return null;}

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                role: user.role as UserRole,
                isActive: Boolean(user.is_active),
                lastLogin: user.last_login ? new Date(user.last_login) : undefined,
                createdAt: new Date(user.created_at),
                updatedAt: new Date(user.updated_at)
            };
        } catch (error) {
            console.error('Failed to get user by username:', error);
            throw new DatabaseError({
                code: 'GET_USER_BY_USERNAME_ERROR',
                message: 'Failed to retrieve user by username',
                table: 'users'
            });
        }
    }

    /**
     * Create new user
     */
    public async createUser(input: CreateUserInput): Promise<User> {
        const db = this.getConnection();

        try {
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const now = new Date().toISOString();

            await db.runAsync(
                `INSERT INTO users (id, username, email, first_name, last_name, role, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    input.username,
                    input.email,
                    input.firstName,
                    input.lastName,
                    input.role,
                    1, // is_active
                    now,
                    now
                ]
            );

            return {
                id: userId,
                username: input.username,
                email: input.email,
                firstName: input.firstName,
                lastName: input.lastName,
                role: input.role,
                isActive: true,
                createdAt: new Date(now),
                updatedAt: new Date(now)
            };
        } catch (error) {
            console.error('Failed to create user:', error);
            throw new DatabaseError({
                code: 'CREATE_USER_ERROR',
                message: 'Failed to create user',
                table: 'users'
            });
        }
    }

    /**
     * Update user
     */
    public async updateUser(input: UpdateUserInput): Promise<User> {
        const db = this.getConnection();

        try {
            const existingUser = await this.getUser(input.id);
            if (!existingUser) {
                throw new DatabaseError({
                    code: 'USER_NOT_FOUND',
                    message: 'User not found',
                    table: 'users'
                });
            }

            const updates: string[] = [];
            const values: any[] = [];

            if (input.username !== undefined) {
                updates.push('username = ?');
                values.push(input.username);
            }
            if (input.email !== undefined) {
                updates.push('email = ?');
                values.push(input.email);
            }
            if (input.firstName !== undefined) {
                updates.push('first_name = ?');
                values.push(input.firstName);
            }
            if (input.lastName !== undefined) {
                updates.push('last_name = ?');
                values.push(input.lastName);
            }
            if (input.role !== undefined) {
                updates.push('role = ?');
                values.push(input.role);
            }
            if (input.isActive !== undefined) {
                updates.push('is_active = ?');
                values.push(input.isActive ? 1 : 0);
            }
            if (input.lastLogin !== undefined) {
                updates.push('last_login = ?');
                values.push(input.lastLogin.toISOString());
            }

            updates.push('updated_at = ?');
            values.push(new Date().toISOString());
            values.push(input.id);

            if (updates.length > 1) { // Only update if there are actual changes
                // Filter out undefined values and their corresponding updates
                const filteredUpdates: string[] = [];
                const filteredValues: any[] = [];
                
                for (let i = 0; i < updates.length; i++) {
                    if (values[i] !== undefined) {
                        filteredUpdates.push(updates[i]);
                        filteredValues.push(values[i]);
                    }
                }
                
                if (filteredUpdates.length > 0) {
                    await db.runAsync(
                        `UPDATE users SET ${filteredUpdates.join(', ')} WHERE id = ?`,
                        filteredValues
                    );
                }
            }

            return await this.getUser(input.id) as User;
        } catch (error) {
            console.error('Failed to update user:', error);
            throw new DatabaseError({
                code: 'UPDATE_USER_ERROR',
                message: 'Failed to update user',
                table: 'users'
            });
        }
    }

    /**
     * Delete user
     */
    public async deleteUser(id: string): Promise<boolean> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync('DELETE FROM users WHERE id = ?', [id]);
            return result.changes > 0;
        } catch (error) {
            console.error('Failed to delete user:', error);
            throw new DatabaseError({
                code: 'DELETE_USER_ERROR',
                message: 'Failed to delete user',
                table: 'users'
            });
        }
    }

    /**
     * Save user password
     */
    public async saveUserPassword(userId: string, passwordHash: string, salt: string): Promise<void> {
        const db = this.getConnection();

        try {
            const now = new Date().toISOString();
            
            await db.runAsync(
                `INSERT OR REPLACE INTO user_passwords (user_id, password_hash, salt, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, passwordHash, salt, now, now]
            );
        } catch (error) {
            console.error('Failed to save user password:', error);
            throw new DatabaseError({
                code: 'SAVE_PASSWORD_ERROR',
                message: 'Failed to save user password',
                table: 'user_passwords'
            });
        }
    }

    /**
     * Get user password hash
     */
    public async getUserPassword(userId: string): Promise<{ passwordHash: string; salt: string } | null> {
        const db = this.getConnection();

        try {
            const password = await db.getFirstAsync<{
                password_hash: string;
                salt: string;
            }>('SELECT password_hash, salt FROM user_passwords WHERE user_id = ?', [userId]);

            return password ? {
                passwordHash: password.password_hash,
                salt: password.salt
            } : null;
        } catch (error) {
            console.error('Failed to get user password:', error);
            throw new DatabaseError({
                code: 'GET_PASSWORD_ERROR',
                message: 'Failed to retrieve user password',
                table: 'user_passwords'
            });
        }
    }

    /**
     * Save auth session
     */
    public async saveAuthSession(sessionId: string, userId: string, token: string, expiresAt: Date): Promise<void> {
        const db = this.getConnection();

        try {
            await db.runAsync(
                `INSERT INTO auth_sessions (id, user_id, token, expires_at, created_at)
                 VALUES (?, ?, ?, ?, ?)`,
                [sessionId, userId, token, expiresAt.toISOString(), new Date().toISOString()]
            );
        } catch (error) {
            console.error('Failed to save auth session:', error);
            throw new DatabaseError({
                code: 'SAVE_SESSION_ERROR',
                message: 'Failed to save authentication session',
                table: 'auth_sessions'
            });
        }
    }

    /**
     * Get auth session by token
     */
    public async getAuthSession(token: string): Promise<{
        id: string;
        userId: string;
        token: string;
        expiresAt: Date;
        createdAt: Date;
    } | null> {
        const db = this.getConnection();

        try {
            const session = await db.getFirstAsync<{
                id: string;
                user_id: string;
                token: string;
                expires_at: string;
                created_at: string;
            }>('SELECT * FROM auth_sessions WHERE token = ?', [token]);

            if (!session) {return null;}

            return {
                id: session.id,
                userId: session.user_id,
                token: session.token,
                expiresAt: new Date(session.expires_at),
                createdAt: new Date(session.created_at)
            };
        } catch (error) {
            console.error('Failed to get auth session:', error);
            throw new DatabaseError({
                code: 'GET_SESSION_ERROR',
                message: 'Failed to retrieve authentication session',
                table: 'auth_sessions'
            });
        }
    }

    /**
     * Delete auth session
     */
    public async deleteAuthSession(token: string): Promise<boolean> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync('DELETE FROM auth_sessions WHERE token = ?', [token]);
            return result.changes > 0;
        } catch (error) {
            console.error('Failed to delete auth session:', error);
            throw new DatabaseError({
                code: 'DELETE_SESSION_ERROR',
                message: 'Failed to delete authentication session',
                table: 'auth_sessions'
            });
        }
    }

    /**
     * Clean expired sessions
     */
    public async cleanExpiredSessions(): Promise<number> {
        const db = this.getConnection();

        try {
            const result = await db.runAsync('DELETE FROM auth_sessions WHERE expires_at < ?', [new Date().toISOString()]);
            return result.changes;
        } catch (error) {
            console.error('Failed to clean expired sessions:', error);
            throw new DatabaseError({
                code: 'CLEAN_SESSIONS_ERROR',
                message: 'Failed to clean expired sessions',
                table: 'auth_sessions'
            });
        }
    }

    /**
     * Log audit event
     */
    public async logAuditEvent(
        userId: string | null,
        action: string,
        resource: string,
        details?: any,
        ipAddress?: string
    ): Promise<void> {
        const db = this.getConnection();

        try {
            const auditId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            await db.runAsync(
                `INSERT INTO audit_logs (id, user_id, action, resource, details, ip_address, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    auditId,
                    userId,
                    action,
                    resource,
                    details ? JSON.stringify(details) : null,
                    ipAddress || null,
                    new Date().toISOString()
                ]
            );
        } catch (error) {
            console.error('Failed to log audit event:', error);
            // Don't throw error for audit logging failures
        }
    }

    // Business Settings Methods
    /**
     * Get business settings
     */
    public async getBusinessSettings(): Promise<BusinessSettings | null> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync('SELECT * FROM business_settings LIMIT 1');
            if (result.length === 0) {
                return null;
            }

            const row = result[0] as any;
            return {
                id: row.id,
                businessName: row.business_name,
                businessLogo: row.business_logo,
                businessAddress: row.business_address,
                businessPhone: row.business_phone,
                businessEmail: row.business_email,
                currency: row.currency,
                currencySymbol: row.currency_symbol,
                taxRate: row.tax_rate,
                timezone: row.timezone,
                language: row.language,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            };
        } catch (error) {
            console.error('Failed to get business settings:', error);
            throw new DatabaseError({
                code: 'GET_BUSINESS_SETTINGS_ERROR',
                message: 'Failed to retrieve business settings',
                table: 'business_settings'
            });
        }
    }

    /**
     * Create or update business settings
     */
    public async saveBusinessSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
        const db = this.getConnection();

        try {
            const existing = await this.getBusinessSettings();
            
            if (existing) {
                // Update existing settings
                const updates = [];
                const values = [];
                
                if (settings.businessName !== undefined) {
                    updates.push('business_name = ?');
                    values.push(settings.businessName);
                }
                if (settings.businessLogo !== undefined) {
                    updates.push('business_logo = ?');
                    values.push(settings.businessLogo);
                }
                if (settings.businessAddress !== undefined) {
                    updates.push('business_address = ?');
                    values.push(settings.businessAddress);
                }
                if (settings.businessPhone !== undefined) {
                    updates.push('business_phone = ?');
                    values.push(settings.businessPhone);
                }
                if (settings.businessEmail !== undefined) {
                    updates.push('business_email = ?');
                    values.push(settings.businessEmail);
                }
                if (settings.currency !== undefined) {
                    updates.push('currency = ?');
                    values.push(settings.currency);
                }
                if (settings.currencySymbol !== undefined) {
                    updates.push('currency_symbol = ?');
                    values.push(settings.currencySymbol);
                }
                if (settings.taxRate !== undefined) {
                    updates.push('tax_rate = ?');
                    values.push(settings.taxRate);
                }
                if (settings.timezone !== undefined) {
                    updates.push('timezone = ?');
                    values.push(settings.timezone);
                }
                if (settings.language !== undefined) {
                    updates.push('language = ?');
                    values.push(settings.language);
                }

                updates.push('updated_at = ?');
                values.push(new Date().toISOString());
                values.push(existing.id);

                await db.runAsync(
                    `UPDATE business_settings SET ${updates.join(', ')} WHERE id = ?`,
                    values
                );

                return await this.getBusinessSettings() as BusinessSettings;
            } else {
                // Create new settings
                const settingsId = `business-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                await db.runAsync(
                    `INSERT INTO business_settings (
                        id, business_name, business_logo, business_address, business_phone, 
                        business_email, currency, currency_symbol, tax_rate, timezone, language
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        settingsId,
                        settings.businessName || 'My Business',
                        settings.businessLogo || null,
                        settings.businessAddress || '',
                        settings.businessPhone || '',
                        settings.businessEmail || '',
                        settings.currency || 'USD',
                        settings.currencySymbol || '$',
                        settings.taxRate || 0.08,
                        settings.timezone || 'UTC',
                        settings.language || 'en'
                    ]
                );

                return await this.getBusinessSettings() as BusinessSettings;
            }
        } catch (error) {
            console.error('Failed to save business settings:', error);
            throw new DatabaseError({
                code: 'SAVE_BUSINESS_SETTINGS_ERROR',
                message: 'Failed to save business settings',
                table: 'business_settings'
            });
        }
    }

    // User Profile Methods
    /**
     * Get user profile
     */
    public async getUserProfile(userId: string): Promise<UserProfile | null> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);
            if (result.length === 0) {
                return null;
            }

            const row = result[0] as any;
            return {
                id: row.id,
                userId: row.user_id,
                avatar: row.avatar,
                phoneNumber: row.phone_number,
                address: row.address,
                preferences: JSON.parse(row.preferences),
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at)
            };
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw new DatabaseError({
                code: 'GET_USER_PROFILE_ERROR',
                message: 'Failed to retrieve user profile',
                table: 'user_profiles'
            });
        }
    }

    /**
     * Create or update user profile
     */
    public async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
        const db = this.getConnection();

        try {
            const existing = await this.getUserProfile(profile.userId);
            
            if (existing) {
                // Update existing profile
                const updates = [];
                const values = [];
                
                if (profile.avatar !== undefined) {
                    updates.push('avatar = ?');
                    values.push(profile.avatar);
                }
                if (profile.phoneNumber !== undefined) {
                    updates.push('phone_number = ?');
                    values.push(profile.phoneNumber);
                }
                if (profile.address !== undefined) {
                    updates.push('address = ?');
                    values.push(profile.address);
                }
                if (profile.preferences !== undefined) {
                    updates.push('preferences = ?');
                    values.push(JSON.stringify(profile.preferences));
                }

                updates.push('updated_at = ?');
                values.push(new Date().toISOString());
                values.push(existing.id);

                await db.runAsync(
                    `UPDATE user_profiles SET ${updates.join(', ')} WHERE id = ?`,
                    values
                );

                return await this.getUserProfile(profile.userId) as UserProfile;
            } else {
                // Create new profile
                const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                
                await db.runAsync(
                    `INSERT INTO user_profiles (
                        id, user_id, avatar, phone_number, address, preferences
                    ) VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        profileId,
                        profile.userId,
                        profile.avatar || null,
                        profile.phoneNumber || null,
                        profile.address || null,
                        JSON.stringify(profile.preferences || {
                            theme: 'auto',
                            notifications: true,
                            language: 'en'
                        })
                    ]
                );

                return await this.getUserProfile(profile.userId) as UserProfile;
            }
        } catch (error) {
            console.error('Failed to save user profile:', error);
            throw new DatabaseError({
                code: 'SAVE_USER_PROFILE_ERROR',
                message: 'Failed to save user profile',
                table: 'user_profiles'
            });
        }
    }

    /**
     * Get audit logs
     */
    public async getAuditLogs(): Promise<AuditLog[]> {
        const db = this.getConnection();

        try {
            const result = await db.getAllAsync('SELECT * FROM audit_logs ORDER BY timestamp DESC');
            return result.map((row: any) => ({
                id: row.id,
                userId: row.user_id,
                action: row.action,
                resource: row.resource,
                details: row.details ? JSON.parse(row.details) : null,
                ipAddress: row.ip_address,
                timestamp: new Date(row.timestamp)
            }));
        } catch (error) {
            console.error('Failed to get audit logs:', error);
            throw new DatabaseError({
                code: 'GET_AUDIT_LOGS_ERROR',
                message: 'Failed to retrieve audit logs',
                table: 'audit_logs'
            });
        }
    }
}

// Custom error class for database operations
class DatabaseError extends Error {
    public code: string;
    public table?: string;

    constructor(error: { code: string; message: string; table?: string }) {
        super(error.message);
        this.name = 'DatabaseError';
        this.code = error.code;
        this.table = error.table;
    }
}

// Export singleton instance
export const database = Database.getInstance();

// Export the class for testing purposes
export { Database, DatabaseError };