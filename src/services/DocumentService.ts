import {
  Receipt,
  Invoice,
  DocumentTemplate,
  DocumentGenerationOptions,
  DocumentGenerationResult,
  DocumentLineItem,
  PaymentInfo,
  BusinessInfo,
  CustomerInfo,
  TemplateFormat,
  DocumentFilter,
  DocumentStats,
} from '../types/documents';
import { Sale, CartItem } from '../services/SimpleSalesService';
import { businessConfigService } from './BusinessConfigService';
import { StorageService } from './StorageService';

export class DocumentService {
  private static instance: DocumentService;
  private storage: StorageService;
  private readonly RECEIPTS_KEY = 'receipts_';
  private readonly INVOICES_KEY = 'invoices_';
  private readonly TEMPLATES_KEY = 'document_templates';

  private constructor() {
    this.storage = StorageService.getInstance();
  }

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  // Receipt Generation
  async generateReceipt(
    sale: Sale,
    options: DocumentGenerationOptions = { format: 'standard' }
  ): Promise<DocumentGenerationResult> {
    try {
      const businessInfo = await businessConfigService.getBusinessInfo();
      const receiptNumber = await businessConfigService.getNextReceiptNumber();

      // Convert sale data to receipt format
      const receipt: Receipt = {
        id: `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentNumber: receiptNumber,
        type: 'receipt',
        status: 'sent',
        createdAt: new Date(),
        updatedAt: new Date(),

        // Business and Customer
        businessInfo,
        customerInfo: this.extractCustomerInfo(sale),

        // Convert sale items to document line items
        lineItems: this.convertSaleItemsToLineItems(sale.items),
        subtotal: sale.subtotal,
        taxTotal: sale.tax,
        discountTotal: sale.discount,
        grandTotal: sale.total,

        // Receipt specific
        saleId: sale.id,
        payments: this.convertSalePayments(sale),
        changeAmount: Math.max(0, sale.amountPaid - sale.total),
        receiptFormat: options.format,
        printedAt: options.format === 'thermal' ? new Date() : undefined,
        emailedAt: options.delivery?.email ? new Date() : undefined,

        // Metadata
        notes: `Generated from sale ${sale.id}`,
        tags: ['pos_receipt', 'auto_generated'],
      };

      // Store the receipt
      await this.storage.setItem(`${this.RECEIPTS_KEY}${receipt.id}`, JSON.stringify({
        ...receipt,
        createdAt: receipt.createdAt.toISOString(),
        updatedAt: receipt.updatedAt.toISOString(),
        printedAt: receipt.printedAt?.toISOString(),
        emailedAt: receipt.emailedAt?.toISOString(),
      }));

      console.log(`✅ Receipt generated: ${receiptNumber}`);

      return {
        success: true,
        documentId: receipt.id,
        documentUrl: this.generateReceiptHTML(receipt, options),
      };

    } catch (error) {
      console.error('Failed to generate receipt:', error);
      return {
        success: false,
        documentId: '',
        error: (error as Error).message || 'Failed to generate receipt',
      };
    }
  }

  // Invoice Generation
  async generateInvoice(
    saleData: {
      lineItems: DocumentLineItem[];
      customerInfo: CustomerInfo;
      notes?: string;
      dueDate?: Date;
    },
    options: DocumentGenerationOptions = { format: 'pdf' }
  ): Promise<DocumentGenerationResult> {
    try {
      const businessInfo = await businessConfigService.getBusinessInfo();
      const documentSettings = await businessConfigService.getDocumentSettings();
      const invoiceNumber = await businessConfigService.getNextInvoiceNumber();
      
      const invoiceDate = new Date();
      const dueDate = saleData.dueDate || new Date(Date.now() + documentSettings.defaultTerms.paymentDays * 24 * 60 * 60 * 1000);

      // Calculate totals
      const subtotal = saleData.lineItems.reduce((sum, item) => sum + item.subtotal, 0);
      const taxTotal = saleData.lineItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const discountTotal = saleData.lineItems.reduce((sum, item) => sum + item.discount, 0);
      const grandTotal = subtotal + taxTotal - discountTotal;

      const invoice: Invoice = {
        id: `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentNumber: invoiceNumber,
        type: 'invoice',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),

        // Business and Customer
        businessInfo,
        customerInfo: saleData.customerInfo,

        // Financial Details
        lineItems: saleData.lineItems,
        subtotal,
        taxTotal,
        discountTotal,
        grandTotal,

        // Invoice specific
        invoiceDate,
        dueDate,
        dueDays: documentSettings.defaultTerms.paymentDays,
        paymentTerms: documentSettings.defaultTerms.paymentTerms,
        remainingBalance: grandTotal,

        // Metadata
        notes: saleData.notes || 'Invoice for services/products provided',
        tags: ['invoice', 'outstanding'],
      };

      // Store the invoice
      await this.storage.setItem(`${this.INVOICES_KEY}${invoice.id}`, JSON.stringify({
        ...invoice,
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        sentAt: invoice.sentAt?.toISOString(),
        paidAt: invoice.paidAt?.toISOString(),
      }));

      console.log(`✅ Invoice generated: ${invoiceNumber}`);

      return {
        success: true,
        documentId: invoice.id,
        documentUrl: this.generateInvoiceHTML(invoice, options),
      };

    } catch (error) {
      console.error('Failed to generate invoice:', error);
      return {
        success: false,
        documentId: '',
        error: (error as Error).message || 'Failed to generate invoice',
      };
    }
  }

  // Document Retrieval
  async getReceipt(receiptId: string): Promise<Receipt | null> {
    try {
      const receiptData = await this.storage.getItem(`${this.RECEIPTS_KEY}${receiptId}`);
      if (!receiptData) return null;

      const receipt = JSON.parse(receiptData);
      return {
        ...receipt,
        createdAt: new Date(receipt.createdAt),
        updatedAt: new Date(receipt.updatedAt),
        printedAt: receipt.printedAt ? new Date(receipt.printedAt) : undefined,
        emailedAt: receipt.emailedAt ? new Date(receipt.emailedAt) : undefined,
      };
    } catch (error) {
      console.error('Failed to get receipt:', error);
      return null;
    }
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const invoiceData = await this.storage.getItem(`${this.INVOICES_KEY}${invoiceId}`);
      if (!invoiceData) return null;

      const invoice = JSON.parse(invoiceData);
      return {
        ...invoice,
        createdAt: new Date(invoice.createdAt),
        updatedAt: new Date(invoice.updatedAt),
        invoiceDate: new Date(invoice.invoiceDate),
        dueDate: new Date(invoice.dueDate),
        sentAt: invoice.sentAt ? new Date(invoice.sentAt) : undefined,
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined,
      };
    } catch (error) {
      console.error('Failed to get invoice:', error);
      return null;
    }
  }

  // Document Listing and Search
  async getAllReceipts(filter?: DocumentFilter): Promise<Receipt[]> {
    try {
      const keys = await this.storage.getAllKeys();
      const receiptKeys = keys.filter(key => key.startsWith(this.RECEIPTS_KEY));
      
      const receipts: Receipt[] = [];
      for (const key of receiptKeys) {
        const receiptData = await this.storage.getItem(key);
        if (receiptData) {
          const receipt = JSON.parse(receiptData);
          receipts.push({
            ...receipt,
            createdAt: new Date(receipt.createdAt),
            updatedAt: new Date(receipt.updatedAt),
            printedAt: receipt.printedAt ? new Date(receipt.printedAt) : undefined,
            emailedAt: receipt.emailedAt ? new Date(receipt.emailedAt) : undefined,
          });
        }
      }

      return this.filterDocuments(receipts, filter);
    } catch (error) {
      console.error('Failed to get receipts:', error);
      return [];
    }
  }

  async getAllInvoices(filter?: DocumentFilter): Promise<Invoice[]> {
    try {
      const keys = await this.storage.getAllKeys();
      const invoiceKeys = keys.filter(key => key.startsWith(this.INVOICES_KEY));
      
      const invoices: Invoice[] = [];
      for (const key of invoiceKeys) {
        const invoiceData = await this.storage.getItem(key);
        if (invoiceData) {
          const invoice = JSON.parse(invoiceData);
          invoices.push({
            ...invoice,
            createdAt: new Date(invoice.createdAt),
            updatedAt: new Date(invoice.updatedAt),
            invoiceDate: new Date(invoice.invoiceDate),
            dueDate: new Date(invoice.dueDate),
            sentAt: invoice.sentAt ? new Date(invoice.sentAt) : undefined,
            paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined,
          });
        }
      }

      return this.filterDocuments(invoices, filter);
    } catch (error) {
      console.error('Failed to get invoices:', error);
      return [];
    }
  }

  // Document Statistics
  async getDocumentStats(): Promise<DocumentStats> {
    try {
      const [receipts, invoices] = await Promise.all([
        this.getAllReceipts(),
        this.getAllInvoices(),
      ]);

      const allDocuments = [...receipts, ...invoices];
      const totalRevenue = allDocuments.reduce((sum, doc) => sum + doc.grandTotal, 0);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentDocuments = allDocuments.filter(doc => doc.createdAt >= oneWeekAgo);

      return {
        totalDocuments: allDocuments.length,
        totalRevenue,
        averageAmount: allDocuments.length > 0 ? totalRevenue / allDocuments.length : 0,

        byType: {
          receipts: receipts.filter(r => r.type === 'receipt').length,
          invoices: invoices.length,
          refunds: receipts.filter(r => r.type === 'refund_receipt').length,
        },

        byStatus: {
          draft: allDocuments.filter(d => d.status === 'draft').length,
          sent: allDocuments.filter(d => d.status === 'sent').length,
          paid: allDocuments.filter(d => d.status === 'paid').length,
          overdue: invoices.filter(i => i.dueDate < new Date() && i.status !== 'paid').length,
          cancelled: allDocuments.filter(d => d.status === 'cancelled').length,
        },

        recentActivity: {
          documentsThisWeek: recentDocuments.length,
          revenueThisWeek: recentDocuments.reduce((sum, doc) => sum + doc.grandTotal, 0),
          averageThisWeek: recentDocuments.length > 0 
            ? recentDocuments.reduce((sum, doc) => sum + doc.grandTotal, 0) / recentDocuments.length 
            : 0,
        },
      };
    } catch (error) {
      console.error('Failed to get document stats:', error);
      throw new Error('Failed to calculate document statistics');
    }
  }

  // Template Generation (HTML for now, could be extended to PDF)
  private generateReceiptHTML(receipt: Receipt, options: DocumentGenerationOptions): string {
    const business = receipt.businessInfo;
    const customer = receipt.customerInfo;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt ${receipt.documentNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: ${options.format === 'thermal' ? '280px' : '600px'}; 
            margin: 0 auto; 
            padding: 20px;
            font-size: ${options.format === 'thermal' ? '12px' : '14px'};
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid ${business.branding.primaryColor}; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
          }
          .business-name { 
            font-size: ${options.format === 'thermal' ? '16px' : '24px'}; 
            font-weight: bold; 
            color: ${business.branding.primaryColor}; 
            margin-bottom: 10px; 
          }
          .receipt-number { 
            font-size: ${options.format === 'thermal' ? '14px' : '18px'}; 
            font-weight: bold; 
            margin: 20px 0; 
          }
          .line-item { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px dotted #ccc; 
          }
          .totals { 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 2px solid ${business.branding.primaryColor}; 
          }
          .total-line { 
            display: flex; 
            justify-content: space-between; 
            padding: 5px 0; 
          }
          .grand-total { 
            font-weight: bold; 
            font-size: ${options.format === 'thermal' ? '14px' : '16px'}; 
            border-top: 1px solid #000; 
            margin-top: 10px; 
            padding-top: 10px; 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #ccc; 
            color: #666; 
            font-size: ${options.format === 'thermal' ? '10px' : '12px'}; 
          }
          @media print {
            body { margin: 0; padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-name">${business.name}</div>
          <div>${business.address.street}</div>
          <div>${business.address.city}, ${business.address.state} ${business.address.zipCode}</div>
          <div>${business.contact.phone} | ${business.contact.email}</div>
        </div>

        <div class="receipt-number">
          Receipt #${receipt.documentNumber}
        </div>
        
        <div>Date: ${receipt.createdAt.toLocaleDateString()} ${receipt.createdAt.toLocaleTimeString()}</div>
        ${customer ? `<div>Customer: ${customer.name}</div>` : ''}

        <div style="margin: 20px 0;">
    `;

    // Add line items
    receipt.lineItems.forEach(item => {
      html += `
        <div class="line-item">
          <div>
            <div>${item.description}</div>
            <div style="font-size: ${options.format === 'thermal' ? '10px' : '12px'}; color: #666;">
              ${item.quantity} x $${item.unitPrice.toFixed(2)}
              ${item.sku ? ` (${item.sku})` : ''}
            </div>
          </div>
          <div>$${item.total.toFixed(2)}</div>
        </div>
      `;
    });

    html += `
        </div>

        <div class="totals">
          <div class="total-line">
            <div>Subtotal:</div>
            <div>$${receipt.subtotal.toFixed(2)}</div>
          </div>
          <div class="total-line">
            <div>Tax:</div>
            <div>$${receipt.taxTotal.toFixed(2)}</div>
          </div>
          ${receipt.discountTotal > 0 ? `
          <div class="total-line">
            <div>Discount:</div>
            <div>-$${receipt.discountTotal.toFixed(2)}</div>
          </div>
          ` : ''}
          <div class="total-line grand-total">
            <div>Total:</div>
            <div>$${receipt.grandTotal.toFixed(2)}</div>
          </div>
        </div>

        <div style="margin: 20px 0;">
    `;

    // Add payment information
    receipt.payments.forEach(payment => {
      html += `
        <div class="total-line">
          <div>${payment.method.toUpperCase()} Payment:</div>
          <div>$${payment.amount.toFixed(2)}</div>
        </div>
      `;
    });

    if (receipt.changeAmount > 0) {
      html += `
        <div class="total-line">
          <div>Change:</div>
          <div>$${receipt.changeAmount.toFixed(2)}</div>
        </div>
      `;
    }

    html += `
        </div>

        <div class="footer">
          <div>Thank you for your business!</div>
          ${business.contact.website ? `<div>Visit us at ${business.contact.website}</div>` : ''}
          <div style="margin-top: 10px;">
            Items may be returned within 30 days with receipt.
          </div>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  private generateInvoiceHTML(invoice: Invoice, options: DocumentGenerationOptions): string {
    const business = invoice.businessInfo;
    const customer = invoice.customerInfo;

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.documentNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 40px; 
            font-size: 14px; 
            line-height: 1.6;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start; 
            margin-bottom: 40px; 
            border-bottom: 3px solid ${business.branding.primaryColor}; 
            padding-bottom: 20px;
          }
          .business-info { flex: 1; }
          .business-name { 
            font-size: 28px; 
            font-weight: bold; 
            color: ${business.branding.primaryColor}; 
            margin-bottom: 10px; 
          }
          .invoice-info { 
            text-align: right; 
            flex: 1;
          }
          .invoice-number { 
            font-size: 24px; 
            font-weight: bold; 
            color: ${business.branding.primaryColor}; 
            margin-bottom: 10px; 
          }
          .billing-section { 
            display: flex; 
            justify-content: space-between; 
            margin: 40px 0; 
          }
          .bill-to, .invoice-details { 
            flex: 1; 
            margin-right: 40px;
          }
          .bill-to h3, .invoice-details h3 { 
            margin-bottom: 15px; 
            color: ${business.branding.primaryColor}; 
            border-bottom: 1px solid ${business.branding.primaryColor}; 
            padding-bottom: 5px;
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0; 
          }
          .items-table th, .items-table td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #ddd; 
          }
          .items-table th { 
            background-color: ${business.branding.primaryColor}; 
            color: white; 
            font-weight: bold;
          }
          .items-table tr:nth-child(even) { 
            background-color: #f9f9f9; 
          }
          .totals-section { 
            float: right; 
            width: 300px; 
            margin-top: 30px;
          }
          .total-line { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px dotted #ccc;
          }
          .grand-total { 
            font-weight: bold; 
            font-size: 18px; 
            border-top: 2px solid ${business.branding.primaryColor}; 
            border-bottom: 2px solid ${business.branding.primaryColor}; 
            margin-top: 10px; 
            padding: 15px 0;
            color: ${business.branding.primaryColor};
          }
          .footer { 
            clear: both; 
            margin-top: 60px; 
            padding-top: 30px; 
            border-top: 2px solid ${business.branding.primaryColor}; 
            text-align: center;
          }
          .payment-terms { 
            background-color: #f8f9fa; 
            padding: 20px; 
            margin: 30px 0; 
            border-left: 4px solid ${business.branding.accentColor};
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="business-info">
            <div class="business-name">${business.name}</div>
            <div>${business.address.street}</div>
            <div>${business.address.city}, ${business.address.state} ${business.address.zipCode}</div>
            <div>${business.address.country}</div>
            <div style="margin-top: 10px;">
              <div>Phone: ${business.contact.phone}</div>
              <div>Email: ${business.contact.email}</div>
              ${business.contact.website ? `<div>Web: ${business.contact.website}</div>` : ''}
            </div>
            ${business.tax.taxIdNumber ? `<div style="margin-top: 10px;">Tax ID: ${business.tax.taxIdNumber}</div>` : ''}
          </div>
          
          <div class="invoice-info">
            <div class="invoice-number">INVOICE</div>
            <div class="invoice-number">${invoice.documentNumber}</div>
            <div style="margin-top: 20px;">
              <div><strong>Invoice Date:</strong> ${invoice.invoiceDate.toLocaleDateString()}</div>
              <div><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div class="billing-section">
          <div class="bill-to">
            <h3>Bill To:</h3>
            ${customer ? `
            <div><strong>${customer.name}</strong></div>
            ${customer.email ? `<div>${customer.email}</div>` : ''}
            ${customer.phone ? `<div>${customer.phone}</div>` : ''}
            ${customer.address?.street ? `
            <div style="margin-top: 10px;">
              <div>${customer.address.street}</div>
              <div>${customer.address.city}, ${customer.address.state} ${customer.address.zipCode}</div>
              ${customer.address.country ? `<div>${customer.address.country}</div>` : ''}
            </div>
            ` : ''}
            ` : '<div>Walk-in Customer</div>'}
          </div>
          
          <div class="invoice-details">
            <h3>Invoice Details:</h3>
            <div><strong>Payment Terms:</strong> ${invoice.paymentTerms}</div>
            <div><strong>Amount Due:</strong> $${invoice.remainingBalance.toFixed(2)}</div>
            ${invoice.poNumber ? `<div><strong>PO Number:</strong> ${invoice.poNumber}</div>` : ''}
            ${invoice.referenceNumber ? `<div><strong>Reference:</strong> ${invoice.referenceNumber}</div>` : ''}
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Tax</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Add line items
    invoice.lineItems.forEach(item => {
      html += `
        <tr>
          <td>
            <div><strong>${item.description}</strong></div>
            ${item.sku ? `<div style="font-size: 12px; color: #666;">SKU: ${item.sku}</div>` : ''}
          </td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
          <td style="text-align: right;">$${item.taxAmount.toFixed(2)}</td>
          <td style="text-align: right;"><strong>$${item.total.toFixed(2)}</strong></td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>

        <div class="totals-section">
          <div class="total-line">
            <div>Subtotal:</div>
            <div>$${invoice.subtotal.toFixed(2)}</div>
          </div>
          <div class="total-line">
            <div>Tax Total:</div>
            <div>$${invoice.taxTotal.toFixed(2)}</div>
          </div>
          ${invoice.discountTotal > 0 ? `
          <div class="total-line">
            <div>Discount:</div>
            <div>-$${invoice.discountTotal.toFixed(2)}</div>
          </div>
          ` : ''}
          <div class="total-line grand-total">
            <div>Total Amount:</div>
            <div>$${invoice.grandTotal.toFixed(2)}</div>
          </div>
        </div>

        <div class="payment-terms">
          <h3 style="margin-top: 0; color: ${business.branding.primaryColor};">Payment Information</h3>
          <p><strong>Terms:</strong> ${invoice.paymentTerms}</p>
          ${invoice.paymentInstructions ? `<p><strong>Instructions:</strong> ${invoice.paymentInstructions}</p>` : ''}
          <p>Please remit payment by <strong>${invoice.dueDate.toLocaleDateString()}</strong></p>
        </div>

        ${invoice.notes ? `
        <div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
          <h4 style="margin-top: 0; color: ${business.branding.primaryColor};">Notes:</h4>
          <p style="margin-bottom: 0;">${invoice.notes}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p>Thank you for your business!</p>
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            This invoice was generated electronically and is valid without signature.
          </p>
        </div>
      </body>
      </html>
    `;

    return html;
  }

  // Helper Methods
  private extractCustomerInfo(sale: Sale): CustomerInfo | undefined {
    // For now, return undefined since SimpleSalesService doesn't store customer info
    // This could be enhanced later to extract from sale metadata
    return undefined;
  }

  private convertSaleItemsToLineItems(saleItems: CartItem[]): DocumentLineItem[] {
    return saleItems.map(item => ({
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productId: item.id.startsWith('manual_') ? undefined : parseInt(item.id),
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      taxRate: 0.08, // Default 8%, could be enhanced to get from product data
      taxAmount: item.price * item.quantity * 0.08,
      discount: 0,
      subtotal: item.price * item.quantity,
      total: item.price * item.quantity * 1.08,
      sku: item.sku,
    }));
  }

  private convertSalePayments(sale: Sale): PaymentInfo[] {
    return [{
      method: sale.paymentMethod,
      amount: sale.amountPaid,
      timestamp: sale.timestamp,
    }];
  }

  private filterDocuments<T extends Receipt | Invoice>(documents: T[], filter?: DocumentFilter): T[] {
    if (!filter) return documents;

    return documents.filter(doc => {
      if (filter.type && doc.type !== filter.type) return false;
      if (filter.status && doc.status !== filter.status) return false;
      
      if (filter.dateRange) {
        const docDate = doc.createdAt;
        if (docDate < filter.dateRange.from || docDate > filter.dateRange.to) return false;
      }
      
      if (filter.customerName && doc.customerInfo) {
        const customerName = doc.customerInfo.name.toLowerCase();
        if (!customerName.includes(filter.customerName.toLowerCase())) return false;
      }
      
      if (filter.amountRange) {
        if (doc.grandTotal < filter.amountRange.min || doc.grandTotal > filter.amountRange.max) return false;
      }
      
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const searchableText = `${doc.documentNumber} ${doc.notes || ''} ${doc.customerInfo?.name || ''}`.toLowerCase();
        if (!searchableText.includes(query)) return false;
      }
      
      return true;
    });
  }
}

// Export singleton instance
export const documentService = DocumentService.getInstance();
