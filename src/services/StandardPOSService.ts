import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CartItem,
  RetailTransaction,
  SaleLineItem,
  TenderLineItem,
  TransactionTotals,
  TenderType,
  ReceiptData,
  POSService,
  TaxComponent,
  DiscountComponent,
} from '../types';
import { productService } from './ProductService';

export class StandardPOSService implements POSService {
  private readonly SALES_STORAGE_KEY = 'sales_';
  private readonly CART_STORAGE_KEY = 'pos_cart_';

  // Cart Management
  addToCart(cart: CartItem[], product: any, quantity: number = 1): CartItem[] {
    const existingItemIndex = cart.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedCart = [...cart];
      updatedCart[existingItemIndex] = {
        ...updatedCart[existingItemIndex],
        quantity: updatedCart[existingItemIndex].quantity + quantity
      };
      return updatedCart;
    } else {
      // Add new item
      const newItem: CartItem = {
        id: `${product.id}_${Date.now()}`, // Generate unique ID
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: quantity,
        unitPrice: product.price,
        description: product.name
      };
      return [...cart, newItem];
    }
  }

  removeFromCart(cart: CartItem[], itemId: string | number): CartItem[] {
    return cart.filter(item => item.id !== itemId);
  }

  updateCartQuantity(cart: CartItem[], itemId: string | number, quantity: number): CartItem[] {
    if (quantity <= 0) {
      return this.removeFromCart(cart, itemId);
    }
    
    return cart.map(item => 
      item.id === itemId 
        ? { ...item, quantity } 
        : item
    );
  }

  // Cart Calculations
  calculateCartTotals(cart: CartItem[], taxRate: number = 0.08): {
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
  } {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal,
      tax,
      total,
      itemCount
    };
  }

  // Transaction Processing
  async processTransaction(
    cart: CartItem[], 
    paymentMethod: TenderType, 
    amount: number
  ): Promise<RetailTransaction> {
    if (cart.length === 0) {
      throw new Error('Cannot process transaction with empty cart');
    }

    const { subtotal, tax, total } = this.calculateCartTotals(cart);
    
    if (amount < total) {
      throw new Error(`Insufficient payment. Required: $${total.toFixed(2)}, Received: $${amount.toFixed(2)}`);
    }

    // Build standardized line items
    const items: SaleLineItem[] = cart.map((item, idx) => {
      const net = item.price * item.quantity;
      const lineTax = net * 0.08; // Default tax rate per line
      
      return {
        id: `${idx + 1}`,
        lineNumber: idx + 1,
        productId: item.productId,
        sku: item.sku,
        description: item.name,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        price: item.price,
        discounts: [],
        taxes: [{
          id: 'tax',
          name: 'Sales Tax',
          rate: 0.08,
          amount: lineTax
        }],
        lineTotal: { 
          net, 
          tax: lineTax, 
          gross: net + lineTax 
        },
      };
    });

    const tenders: TenderLineItem[] = [
      {
        id: '1',
        type: paymentMethod,
        amount: amount,
      },
      // Change (if any) represented as negative tender amount
      ...(amount - total > 0
        ? [{ id: 'change', type: 'cash' as const, amount: -(amount - total) }]
        : []),
    ];

    const totals: TransactionTotals = {
      subTotal: subtotal,
      discountTotal: 0,
      taxTotal: tax,
      grandTotal: total,
      currency: 'USD',
    };

    const transaction: RetailTransaction = {
      id: this.generateTransactionId(),
      businessDate: new Date().toISOString().slice(0, 10),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      timestamp: new Date(),
      status: 'completed',
      operatorId: 'cashier_001', // Default cashier ID
      items,
      tenders,
      totals,
    };

    try {
      // Store the transaction
      await AsyncStorage.setItem(
        `${this.SALES_STORAGE_KEY}${transaction.id}`,
        JSON.stringify(transaction)
      );

      console.log(`✅ Transaction completed: ${transaction.id} - $${transaction.totals.grandTotal.toFixed(2)} via ${paymentMethod}`);
      return transaction;
    } catch (error) {
      console.error('Failed to save transaction:', error);
      throw new Error('Failed to complete transaction');
    }
  }

  // Receipt Generation
  generateReceipt(transaction: RetailTransaction): ReceiptData {
    return {
      transaction,
      storeInfo: {
        name: 'SalesMVP Store',
        address: '123 Main Street, City, State 12345',
        phone: '(555) 123-4567',
        website: 'www.salesmvp.com'
      },
      cashierInfo: {
        name: 'Cashier',
        id: transaction.operatorId || 'cashier_001'
      }
    };
  }

  // Cart Persistence
  async saveCart(cart: CartItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }

  async loadCart(): Promise<CartItem[]> {
    try {
      const cartData = await AsyncStorage.getItem(this.CART_STORAGE_KEY);
      return cartData ? JSON.parse(cartData) : [];
    } catch (error) {
      console.error('Failed to load cart:', error);
      return [];
    }
  }

  async clearCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CART_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear cart:', error);
    }
  }

  // Transaction History
  async getAllTransactions(): Promise<RetailTransaction[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const salesKeys = keys.filter(key => key.startsWith(this.SALES_STORAGE_KEY));
      
      if (salesKeys.length === 0) {return [];}

      const transactions = await AsyncStorage.multiGet(salesKeys);
      return transactions
        .map(([key, value]) => value ? JSON.parse(value) : null)
        .filter(Boolean)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    } catch (error) {
      console.error('Failed to load transactions:', error);
      return [];
    }
  }

  async getTransaction(id: string): Promise<RetailTransaction | null> {
    try {
      const transactionData = await AsyncStorage.getItem(`${this.SALES_STORAGE_KEY}${id}`);
      return transactionData ? JSON.parse(transactionData) : null;
    } catch (error) {
      console.error('Failed to load transaction:', error);
      return null;
    }
  }

  // Utility Methods
  private generateTransactionId(): string {
    return `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Product Search
  async searchProducts(query: string): Promise<any[]> {
    try {
      const allProducts = await productService.getAllProducts();
      return allProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.sku.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Failed to search products:', error);
      return [];
    }
  }

  // Statistics
  async getTransactionStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalTransactions: number;
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
      const transactions = await this.getAllTransactions();
      
      const filteredTransactions = transactions.filter(txn => {
        const txnDate = new Date(txn.startTime);
        if (startDate && txnDate < startDate) {return false;}
        if (endDate && txnDate > endDate) {return false;}
        return true;
      });

      const totalTransactions = filteredTransactions.length;
      const totalRevenue = filteredTransactions.reduce((sum, txn) => sum + txn.totals.grandTotal, 0);
      const totalTax = filteredTransactions.reduce((sum, txn) => sum + txn.totals.taxTotal, 0);
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      const paymentMethodBreakdown = {
        cash: { count: 0, amount: 0 },
        card: { count: 0, amount: 0 },
        digital: { count: 0, amount: 0 }
      };

      filteredTransactions.forEach(txn => {
        txn.tenders.forEach(tender => {
          if (tender.amount > 0) { // Only count payments, not change
            const method = tender.type as keyof typeof paymentMethodBreakdown;
            if (paymentMethodBreakdown[method]) {
              paymentMethodBreakdown[method].count++;
              paymentMethodBreakdown[method].amount += tender.amount;
            }
          }
        });
      });

      return {
        totalTransactions,
        totalRevenue,
        totalTax,
        averageTransaction,
        paymentMethodBreakdown
      };
    } catch (error) {
      console.error('Failed to get transaction statistics:', error);
      return {
        totalTransactions: 0,
        totalRevenue: 0,
        totalTax: 0,
        averageTransaction: 0,
        paymentMethodBreakdown: {
          cash: { count: 0, amount: 0 },
          card: { count: 0, amount: 0 },
          digital: { count: 0, amount: 0 }
        }
      };
    }
  }
}

// Export singleton instance
export const standardPOSService = new StandardPOSService();
