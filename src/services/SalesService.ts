import { database } from '../stores/DatabaseFactory';
import { Sale, SaleItem, Payment, Product, CreateSaleInput, CreateSaleItemInput, CreatePaymentInput } from '../types';
import { productService } from './ProductService';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleResult {
  sale: Sale;
  saleItems: SaleItem[];
  payments: Payment[];
  receiptData: ReceiptData;
}

export interface ReceiptData {
  saleId: number;
  timestamp: string;
  items: {
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    total: number;
    tax: number;
  }[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  paymentMethod: string;
  paymentAmount: number;
  change: number;
}

export class SalesService {
  private static instance: SalesService;

  private constructor() {}

  public static getInstance(): SalesService {
    if (!SalesService.instance) {
      SalesService.instance = new SalesService();
    }
    return SalesService.instance;
  }

  /**
   * Process a complete sale transaction
   */
  public async processSale(
    cart: CartItem[], 
    paymentMethod: 'cash' | 'card' | 'digital',
    paymentAmount: number
  ): Promise<SaleResult> {
    if (cart.length === 0) {
      throw new Error('Cannot process empty cart');
    }

    try {
      // Calculate totals
      const { subtotal, totalTax, grandTotal } = this.calculateTotals(cart);

      // Validate payment
      if (paymentAmount < grandTotal) {
        throw new Error(`Insufficient payment. Required: $${grandTotal.toFixed(2)}, Received: $${paymentAmount.toFixed(2)}`);
      }

      // Use transaction to ensure atomicity
      return await database.executeTransaction(async () => {
        // 1. Create sale record
        const saleInput: CreateSaleInput = {
          total: grandTotal,
          tax_total: totalTax,
          status: 'completed'
        };

        const sale = await database.createSale(saleInput);

        // 2. Create sale items
        const saleItems: SaleItem[] = [];
        for (const cartItem of cart) {
          const saleItemInput: CreateSaleItemInput = {
            sale_id: sale.id,
            product_id: cartItem.product.id,
            qty: cartItem.quantity,
            unit_price: cartItem.product.price
          };

          const saleItem = await database.createSaleItem(saleItemInput);
          saleItems.push(saleItem);

          // Update product stock
          const newStock = cartItem.product.stock_qty - cartItem.quantity;
          if (newStock < 0) {
            console.warn(`Warning: Product "${cartItem.product.name}" stock will be negative: ${newStock}`);
          }
          await productService.updateStock(cartItem.product.id, Math.max(0, newStock));
        }

        // 3. Create payment record
        const paymentInput: CreatePaymentInput = {
          sale_id: sale.id,
          method: paymentMethod,
          amount: paymentAmount,
          reference: paymentMethod === 'cash' ? undefined : `${paymentMethod.toUpperCase()}_${Date.now()}`
        };

        const payment = await database.createPayment(paymentInput);

        // 4. Generate receipt data
        const receiptData = this.generateReceiptData(sale, cart, paymentMethod, paymentAmount);

        console.log(`✅ Sale completed: $${grandTotal.toFixed(2)} via ${paymentMethod}`);

        return {
          sale,
          saleItems,
          payments: [payment],
          receiptData
        };
      });

    } catch (error) {
      console.error('❌ Sale processing failed:', error);
      throw error;
    }
  }

  /**
   * Calculate cart totals
   */
  public calculateTotals(cart: CartItem[]): {
    subtotal: number;
    totalTax: number;
    grandTotal: number;
    itemBreakdown: Array<{
      product: Product;
      quantity: number;
      itemSubtotal: number;
      itemTax: number;
      itemTotal: number;
    }>;
  } {
    let subtotal = 0;
    let totalTax = 0;
    const itemBreakdown: Array<{
      product: Product;
      quantity: number;
      itemSubtotal: number;
      itemTax: number;
      itemTotal: number;
    }> = [];

    for (const item of cart) {
      const itemSubtotal = item.product.price * item.quantity;
      const itemTax = itemSubtotal * item.product.tax_rate;
      const itemTotal = itemSubtotal + itemTax;

      subtotal += itemSubtotal;
      totalTax += itemTax;

      itemBreakdown.push({
        product: item.product,
        quantity: item.quantity,
        itemSubtotal,
        itemTax,
        itemTotal
      });
    }

    const grandTotal = subtotal + totalTax;

    return {
      subtotal,
      totalTax,
      grandTotal,
      itemBreakdown
    };
  }

  /**
   * Generate receipt data
   */
  private generateReceiptData(
    sale: Sale, 
    cart: CartItem[], 
    paymentMethod: string, 
    paymentAmount: number
  ): ReceiptData {
    const items = cart.map(item => ({
      name: item.product.name,
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.product.price,
      total: item.product.price * item.quantity,
      tax: item.product.price * item.quantity * item.product.tax_rate
    }));

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const totalTax = items.reduce((sum, item) => sum + item.tax, 0);
    const grandTotal = sale.total;
    const change = paymentAmount - grandTotal;

    return {
      saleId: sale.id,
      timestamp: sale.timestamp,
      items,
      subtotal,
      totalTax,
      grandTotal,
      paymentMethod,
      paymentAmount,
      change
    };
  }

  /**
   * Generate formatted receipt text
   */
  public generateReceiptText(receiptData: ReceiptData, storeName: string = "SalesMVP Store"): string {
    const lines: string[] = [];
    const width = 40; // Receipt width for formatting

    // Header
    lines.push("=".repeat(width));
    lines.push(this.centerText(storeName.toUpperCase(), width));
    lines.push(this.centerText("SALES RECEIPT", width));
    lines.push("=".repeat(width));
    lines.push("");

    // Sale info
    lines.push(`Sale #: ${receiptData.saleId}`);
    lines.push(`Date: ${new Date(receiptData.timestamp).toLocaleString()}`);
    lines.push("");

    // Items
    lines.push("ITEMS:");
    lines.push("-".repeat(width));
    
    for (const item of receiptData.items) {
      // Product name and SKU
      lines.push(`${item.name} (${item.sku})`);
      
      // Quantity, price, total
      const qtyPriceText = `${item.quantity} x $${item.unitPrice.toFixed(2)}`;
      const totalText = `$${item.total.toFixed(2)}`;
      lines.push(`${qtyPriceText}${" ".repeat(width - qtyPriceText.length - totalText.length)}${totalText}`);
      
      // Tax if applicable
      if (item.tax > 0) {
        const taxText = `Tax: $${item.tax.toFixed(2)}`;
        lines.push(`${" ".repeat(width - taxText.length)}${taxText}`);
      }
      lines.push("");
    }

    // Totals
    lines.push("-".repeat(width));
    lines.push(this.rightAlignText(`Subtotal: $${receiptData.subtotal.toFixed(2)}`, width));
    
    if (receiptData.totalTax > 0) {
      lines.push(this.rightAlignText(`Tax: $${receiptData.totalTax.toFixed(2)}`, width));
    }
    
    lines.push("=".repeat(width));
    lines.push(this.rightAlignText(`TOTAL: $${receiptData.grandTotal.toFixed(2)}`, width));
    lines.push("");

    // Payment
    lines.push(`Payment (${receiptData.paymentMethod.toUpperCase()}): $${receiptData.paymentAmount.toFixed(2)}`);
    
    if (receiptData.change > 0) {
      lines.push(`Change: $${receiptData.change.toFixed(2)}`);
    }
    
    lines.push("");
    lines.push("=".repeat(width));
    lines.push(this.centerText("Thank you for your business!", width));
    lines.push("=".repeat(width));

    return lines.join('\n');
  }

  /**
   * Get sales statistics
   */
  public async getSalesStats(dateFrom?: Date, dateTo?: Date): Promise<{
    totalSales: number;
    totalRevenue: number;
    averageTransaction: number;
    topProducts: Array<{
      product: Product;
      totalQuantity: number;
      totalRevenue: number;
    }>;
    salesByPaymentMethod: { [method: string]: number };
  }> {
    try {
      const sales = await database.getAllSales();
      
      // Filter by date if provided
      let filteredSales = sales.filter(sale => sale.status === 'completed');
      if (dateFrom) {
        filteredSales = filteredSales.filter(sale => 
          new Date(sale.timestamp) >= dateFrom
        );
      }
      if (dateTo) {
        filteredSales = filteredSales.filter(sale => 
          new Date(sale.timestamp) <= dateTo
        );
      }

      const totalSales = filteredSales.length;
      const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
      const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Get top products (this is a simplified version)
      const topProducts: Array<{
        product: Product;
        totalQuantity: number;
        totalRevenue: number;
      }> = [];

      // Sales by payment method (simplified - would need to join with payments table)
      const salesByPaymentMethod: { [method: string]: number } = {
        cash: 0,
        card: 0,
        digital: 0
      };

      return {
        totalSales,
        totalRevenue,
        averageTransaction,
        topProducts,
        salesByPaymentMethod
      };

    } catch (error) {
      console.error('Failed to get sales stats:', error);
      throw new Error('Failed to load sales statistics');
    }
  }

  /**
   * Void/cancel a sale
   */
  public async voidSale(saleId: number, reason: string): Promise<void> {
    try {
      const sale = await database.getSale(saleId);
      if (!sale) {
        throw new Error('Sale not found');
      }

      if (sale.status === 'cancelled') {
        throw new Error('Sale already cancelled');
      }

      // Update sale status
      await database.updateSaleStatus(saleId, 'cancelled');

      // Restore product stock
      const saleItems = await database.getSaleItems(saleId);
      for (const item of saleItems) {
        const product = await database.getProduct(item.product_id);
        if (product) {
          const newStock = product.stock_qty + item.qty;
          await productService.updateStock(product.id, newStock);
        }
      }

      console.log(`✅ Sale #${saleId} voided. Reason: ${reason}`);
    } catch (error) {
      console.error('Failed to void sale:', error);
      throw error;
    }
  }

  // Helper methods for receipt formatting
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return " ".repeat(leftPad) + text + " ".repeat(rightPad);
  }

  private rightAlignText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    return " ".repeat(padding) + text;
  }
}

// Export singleton instance
export const salesService = SalesService.getInstance();
