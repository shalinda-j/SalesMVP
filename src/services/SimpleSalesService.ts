import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RetailTransaction,
  SaleLineItem,
  TenderLineItem,
  TransactionTotals,
  CartItemInput,
} from '../types';

class SimpleSalesService {
  private readonly SALES_STORAGE_KEY = 'sales_';

  // Complete a sale and store it
  async completeSale(
    cart: CartItemInput[],
    paymentMethod: 'cash' | 'card' | 'digital',
    amountPaid: number,
    subtotal: number,
    tax: number,
    discount: number = 0,
    cashier?: string
  ): Promise<RetailTransaction> {
    if (cart.length === 0) {
      throw new Error('Cannot complete sale with empty cart');
    }

    const total = subtotal + tax - discount;
    
    if (amountPaid < total) {
      throw new Error(`Insufficient payment. Required: $${total.toFixed(2)}, Received: $${amountPaid.toFixed(2)}`);
    }

    // Build standardized line items
    const items: SaleLineItem[] = cart.map((c, idx) => {
      const net = c.unitPrice * c.quantity;
      const lineTax = 0; // tax per-line not tracked here
      return {
        id: `${idx + 1}`,
        lineNumber: idx + 1,
        productId: c.productId,
        sku: c.sku,
        description: c.description,
        name: c.description || `Product ${c.productId}`, // Use description as name, or a default
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        price: c.unitPrice, // Map unitPrice to price
        discounts: discount > 0 ? [{ id: 'header', type: 'amount', value: 0 }] : [],
        taxes: [],
        lineTotal: { net, tax: lineTax, gross: net + lineTax },
      };
    });

    const tenders: TenderLineItem[] = [
      {
        id: '1',
        type: paymentMethod,
        amount: amountPaid,
      },
      // Change (if any) represented as negative tender amount
      ...(amountPaid - total > 0
        ? [{ id: 'change', type: 'cash' as const, amount: -(amountPaid - total) }]
        : []),
    ];

    const totals: TransactionTotals = {
      subTotal: subtotal,
      discountTotal: discount,
      taxTotal: tax,
      grandTotal: total,
      currency: 'USD',
    };

    const sale: RetailTransaction = {
      id: this.generateSaleId(),
      businessDate: new Date().toISOString().slice(0, 10),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      timestamp: new Date(), // Add this
      status: 'completed',
      operatorId: cashier,
      items,
      tenders,
      totals,
    };

    try {
      // Store the sale
      await AsyncStorage.setItem(
        `${this.SALES_STORAGE_KEY}${sale.id}`,
        JSON.stringify(sale)
      );

      console.log(`✅ Sale completed: ${sale.id} - $${sale.totals.grandTotal.toFixed(2)} via ${paymentMethod}`);
      return sale;
    } catch (error) {
      console.error('Failed to save sale:', error);
      throw new Error('Failed to complete sale');
    }
  }

  // Get all sales (for analytics)
  async getAllSales(): Promise<RetailTransaction[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const saleKeys = keys.filter(key => key.startsWith(this.SALES_STORAGE_KEY));
      
      const salesData = await AsyncStorage.multiGet(saleKeys);
      const sales: RetailTransaction[] = [];
      
      salesData.forEach(([key, value]) => {
        if (value) {
          const sale = JSON.parse(value);
          sales.push(sale);
        }
      });
      
      return sales.sort((a, b) => new Date(b.endTime ?? b.startTime).getTime() - new Date(a.endTime ?? a.startTime).getTime());
    } catch (error) {
      console.error('Failed to get all sales:', error);
      throw new Error('Failed to retrieve sales data');
    }
  }

  // Get sales within a date range
  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<RetailTransaction[]> {
    try {
      const allSales = await this.getAllSales();
      
      return allSales.filter(sale => {
        const saleDate = new Date(sale.endTime ?? sale.startTime);
        return saleDate >= startDate && saleDate <= endDate;
      });
    } catch (error) {
      console.error('Failed to get sales by date range:', error);
      throw new Error('Failed to retrieve sales data for date range');
    }
  }

  // Get sales for a specific date (helper method)
  async getSalesForDate(date: Date): Promise<RetailTransaction[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    return this.getSalesByDateRange(startOfDay, endOfDay);
  }

  // Get today's sales
  async getTodaysSales(): Promise<RetailTransaction[]> {
    return this.getSalesForDate(new Date());
  }

  // Get a specific sale by ID
  async getSale(saleId: string): Promise<RetailTransaction | null> {
    try {
      const saleData = await AsyncStorage.getItem(`${this.SALES_STORAGE_KEY}${saleId}`);
      if (!saleData) {return null;}

      const sale = JSON.parse(saleData);
      return sale as RetailTransaction;
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
    cart: CartItemInput[],
    taxRate: number = 0.08
  ): {
    subtotal: number;
    tax: number;
    total: number;
  } {
    const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
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
      let sales: RetailTransaction[];
      
      if (startDate && endDate) {
        sales = await this.getSalesByDateRange(startDate, endDate);
      } else {
        sales = await this.getAllSales();
      }

      const totalSales = sales.length;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.totals.grandTotal, 0);
      const totalTax = sales.reduce((sum, sale) => sum + sale.totals.taxTotal, 0);
      const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

      const paymentMethodBreakdown = {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        digital: { count: 0, amount: 0 }
      };

      sales.forEach(sale => {
        sale.tenders.forEach(t => {
          const type = (t.type === 'cash' || t.type === 'card' || t.type === 'digital') ? t.type : 'other';
          if (type === 'other') {return;}
          paymentMethodBreakdown[type].count++;
          paymentMethodBreakdown[type].amount += Math.max(0, t.amount);
        });
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
      const cart: CartItemInput[] = [];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per sale

      for (let j = 0; j < numItems; j++) {
        const product = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 quantity

        cart.push({
          productId: parseInt(product.id, 10),
          description: product.name,
          unitPrice: product.price,
          quantity,
          sku: product.sku,
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

      const items: SaleLineItem[] = cart.map((c, idx) => ({
        id: `${idx + 1}`,
        lineNumber: idx + 1,
        productId: c.productId,
        sku: c.sku,
        description: c.description,
        name: c.description || `Product ${c.productId}`, // Use description as name, or a default
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        price: c.unitPrice, // Map unitPrice to price
        lineTotal: { net: c.unitPrice * c.quantity, tax: 0, gross: c.unitPrice * c.quantity },
      }));

      const sale: RetailTransaction = {
        id: this.generateSaleId(),
        businessDate: randomDate.toISOString().slice(0, 10),
        startTime: randomDate.toISOString(),
        endTime: randomDate.toISOString(),
        timestamp: randomDate, // Add this
        status: 'completed',
        operatorId: 'Demo User',
        items,
        tenders: [{ id: '1', type: paymentMethod, amount: amountPaid }],
        totals: { subTotal: subtotal, discountTotal: 0, taxTotal: tax, grandTotal: total, currency: 'USD' },
      };

      // Store the sale
      await AsyncStorage.setItem(
        `${this.SALES_STORAGE_KEY}${sale.id}`,
        JSON.stringify(sale)
      );
    }

    console.log(`✅ Added ${numberOfSales} sample sales`);
  }
}

export const salesService = new SimpleSalesService();
