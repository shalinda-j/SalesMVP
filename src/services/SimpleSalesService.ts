import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple interfaces matching our component usage
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
}

export interface Sale {
  id: string;
  timestamp: Date;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital';
  amountPaid: number;
  cashier?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

class SimpleSalesService {
  private readonly SALES_STORAGE_KEY = 'sales_';

  // Complete a sale and store it
  async completeSale(
    cart: CartItem[],
    paymentMethod: 'cash' | 'card' | 'digital',
    amountPaid: number,
    subtotal: number,
    tax: number,
    discount: number = 0,
    cashier?: string
  ): Promise<Sale> {
    if (cart.length === 0) {
      throw new Error('Cannot complete sale with empty cart');
    }

    const total = subtotal + tax - discount;
    
    if (amountPaid < total) {
      throw new Error(`Insufficient payment. Required: $${total.toFixed(2)}, Received: $${amountPaid.toFixed(2)}`);
    }

    const sale: Sale = {
      id: this.generateSaleId(),
      timestamp: new Date(),
      items: [...cart], // Clone the cart items
      subtotal,
      tax,
      discount,
      total,
      paymentMethod,
      amountPaid,
      cashier,
      status: 'completed'
    };

    try {
      // Store the sale
      await AsyncStorage.setItem(
        `${this.SALES_STORAGE_KEY}${sale.id}`,
        JSON.stringify({
          ...sale,
          timestamp: sale.timestamp.toISOString() // Convert Date to string for storage
        })
      );

      console.log(`✅ Sale completed: ${sale.id} - $${sale.total.toFixed(2)} via ${paymentMethod}`);
      return sale;
    } catch (error) {
      console.error('Failed to save sale:', error);
      throw new Error('Failed to complete sale');
    }
  }

  // Get all sales (for analytics)
  async getAllSales(): Promise<Sale[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const saleKeys = keys.filter(key => key.startsWith(this.SALES_STORAGE_KEY));
      
      const salesData = await AsyncStorage.multiGet(saleKeys);
      const sales: Sale[] = [];
      
      salesData.forEach(([key, value]) => {
        if (value) {
          const sale = JSON.parse(value);
          sale.timestamp = new Date(sale.timestamp); // Convert back to Date object
          sales.push(sale);
        }
      });
      
      return sales.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to get all sales:', error);
      throw new Error('Failed to retrieve sales data');
    }
  }

  // Get sales within a date range
  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    try {
      const allSales = await this.getAllSales();
      
      return allSales.filter(sale => {
        const saleDate = new Date(sale.timestamp);
        return saleDate >= startDate && saleDate <= endDate;
      });
    } catch (error) {
      console.error('Failed to get sales by date range:', error);
      throw new Error('Failed to retrieve sales data for date range');
    }
  }

  // Get sales for a specific date (helper method)
  async getSalesForDate(date: Date): Promise<Sale[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    return this.getSalesByDateRange(startOfDay, endOfDay);
  }

  // Get today's sales
  async getTodaysSales(): Promise<Sale[]> {
    return this.getSalesForDate(new Date());
  }

  // Get a specific sale by ID
  async getSale(saleId: string): Promise<Sale | null> {
    try {
      const saleData = await AsyncStorage.getItem(`${this.SALES_STORAGE_KEY}${saleId}`);
      if (!saleData) return null;

      const sale = JSON.parse(saleData);
      sale.timestamp = new Date(sale.timestamp);
      return sale;
    } catch (error) {
      console.error('Failed to get sale:', error);
      return null;
    }
  }

  // Delete all sales (for testing/reset purposes)
  async clearAllSales(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const saleKeys = keys.filter(key => key.startsWith(this.SALES_STORAGE_KEY));
      
      if (saleKeys.length > 0) {
        await AsyncStorage.multiRemove(saleKeys);
      }
      
      console.log(`✅ Cleared ${saleKeys.length} sales from storage`);
    } catch (error) {
      console.error('Failed to clear sales:', error);
      throw new Error('Failed to clear sales data');
    }
  }

  // Calculate cart totals (helper method)
  calculateCartTotals(
    cart: CartItem[],
    taxRate: number = 0.08
  ): {
    subtotal: number;
    tax: number;
    total: number;
  } {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return { subtotal, tax, total };
  }

  // Generate unique sale ID
  private generateSaleId(): string {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `SALE_${timestamp}_${random}`;
  }

  // Get sales statistics for a date range
  async getSalesStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalTax: number;
    averageTransaction: number;
    paymentMethodBreakdown: {
      cash: { count: number; amount: number };
      card: { count: number; amount: number };
      digital: { count: number; amount: number };
    };
  }> {
    try {
      let sales: Sale[];
      
      if (startDate && endDate) {
        sales = await this.getSalesByDateRange(startDate, endDate);
      } else {
        sales = await this.getAllSales();
      }

      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
      const totalTax = sales.reduce((sum, sale) => sum + sale.tax, 0);
      const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

      const paymentMethodBreakdown = {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        digital: { count: 0, amount: 0 }
      };

      sales.forEach(sale => {
        paymentMethodBreakdown[sale.paymentMethod].count++;
        paymentMethodBreakdown[sale.paymentMethod].amount += sale.total;
      });

      return {
        totalSales,
        totalRevenue,
        totalTax,
        averageTransaction,
        paymentMethodBreakdown
      };
    } catch (error) {
      console.error('Failed to get sales statistics:', error);
      throw new Error('Failed to calculate sales statistics');
    }
  }

  // Add sample data for testing
  async addSampleSales(): Promise<void> {
    const sampleProducts = [
      { id: '1', name: 'Coffee', price: 4.50, sku: 'COFFEE001' },
      { id: '2', name: 'Sandwich', price: 8.99, sku: 'SAND001' },
      { id: '3', name: 'Pastry', price: 3.25, sku: 'PAST001' },
      { id: '4', name: 'Tea', price: 3.50, sku: 'TEA001' },
      { id: '5', name: 'Salad', price: 12.50, sku: 'SALAD001' },
    ];

    const paymentMethods: ('cash' | 'card' | 'digital')[] = ['cash', 'card', 'digital'];
    const numberOfSales = 20;

    for (let i = 0; i < numberOfSales; i++) {
      // Create random cart
      const cart: CartItem[] = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per sale

      for (let j = 0; j < numItems; j++) {
        const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity

        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          sku: product.sku
        });
      }

      // Calculate totals
      const { subtotal, tax, total } = this.calculateCartTotals(cart);
      
      // Random payment method and amount
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const amountPaid = paymentMethod === 'cash' 
        ? total + (Math.floor(Math.random() * 10)) // Add some change for cash
        : total; // Exact amount for card/digital

      // Random timestamp within last 30 days
      const randomDate = new Date();
      randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
      randomDate.setHours(
        8 + Math.floor(Math.random() * 12), // 8 AM to 8 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      const sale: Sale = {
        id: this.generateSaleId(),
        timestamp: randomDate,
        items: cart,
        subtotal,
        tax,
        discount: 0,
        total,
        paymentMethod,
        amountPaid,
        cashier: 'Demo User',
        status: 'completed'
      };

      // Store the sale
      await AsyncStorage.setItem(
        `${this.SALES_STORAGE_KEY}${sale.id}`,
        JSON.stringify({
          ...sale,
          timestamp: sale.timestamp.toISOString()
        })
      );
    }

    console.log(`✅ Added ${numberOfSales} sample sales`);
  }
}

export const salesService = new SimpleSalesService();
