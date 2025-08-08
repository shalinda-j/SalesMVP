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
    DatabaseService
} from '../types';

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
            this.db = await SQLite.openDatabaseAsync('salesMVP.db');
            await this.createTables();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            throw new DatabaseError({
                code: 'INIT_ERROR',
                message: 'Failed to initialize database'
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
            throw new DatabaseError({
                code: 'NO_CONNECTION',
                message: 'Database not initialized. Call initialize() first.'
            });
        }
        return this.db;
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