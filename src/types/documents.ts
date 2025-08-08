// Document Types for Receipt and Invoice Generation

export type DocumentType = 'receipt' | 'invoice' | 'refund_receipt';
export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type TemplateFormat = 'thermal' | 'standard' | 'email' | 'pdf';

// Business Configuration
export interface BusinessInfo {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  tax: {
    registrationNumber?: string;
    taxIdNumber?: string;
    gstNumber?: string;
  };
  branding: {
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

// Customer Information
export interface CustomerInfo {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

// Document Line Items
export interface DocumentLineItem {
  id: string;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  subtotal: number;
  total: number;
  sku?: string;
}

// Payment Information
export interface PaymentInfo {
  method: 'cash' | 'card' | 'digital' | 'check' | 'bank_transfer';
  amount: number;
  reference?: string;
  cardLast4?: string;
  approvalCode?: string;
  timestamp: Date;
}

// Base Document Interface
export interface BaseDocument {
  id: string;
  documentNumber: string;
  type: DocumentType;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  
  // Business and Customer
  businessInfo: BusinessInfo;
  customerInfo?: CustomerInfo;
  
  // Financial Details
  lineItems: DocumentLineItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  
  // Metadata
  notes?: string;
  internalNotes?: string;
  tags?: string[];
}

// Receipt Specific
export interface Receipt extends BaseDocument {
  type: 'receipt' | 'refund_receipt';
  saleId: string;
  payments: PaymentInfo[];
  changeAmount: number;
  receiptFormat: TemplateFormat;
  printedAt?: Date;
  emailedAt?: Date;
  refundReason?: string; // for refund receipts
}

// Invoice Specific
export interface Invoice extends BaseDocument {
  type: 'invoice';
  invoiceDate: Date;
  dueDate: Date;
  dueDays: number;
  
  // Payment Terms
  paymentTerms: string;
  paymentInstructions?: string;
  
  // Invoice Status
  sentAt?: Date;
  paidAt?: Date;
  paidAmount?: number;
  remainingBalance: number;
  
  // References
  poNumber?: string;
  referenceNumber?: string;
}

// Template Configuration
export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  format: TemplateFormat;
  isDefault: boolean;
  
  // Layout Configuration
  layout: {
    width: number;
    margin: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    fontSize: {
      header: number;
      body: number;
      footer: number;
    };
    showLogo: boolean;
    showQRCode: boolean;
    showBarcode: boolean;
  };
  
  // Content Configuration
  content: {
    headerText?: string;
    footerText?: string;
    termsAndConditions?: string;
    thankYouMessage?: string;
    returnPolicy?: string;
    
    // Field visibility
    showCustomerInfo: boolean;
    showItemDetails: boolean;
    showTaxBreakdown: boolean;
    showPaymentDetails: boolean;
  };
  
  // Styling
  styling: {
    colors: {
      primary: string;
      secondary: string;
      text: string;
      accent: string;
    };
    fonts: {
      header: string;
      body: string;
      monospace: string;
    };
    spacing: {
      lineHeight: number;
      sectionSpacing: number;
    };
  };
}

// Document Generation Options
export interface DocumentGenerationOptions {
  templateId?: string;
  format: TemplateFormat;
  includeQRCode?: boolean;
  includeBarcode?: boolean;
  customHeader?: string;
  customFooter?: string;
  
  // Delivery options
  delivery?: {
    email?: {
      to: string;
      subject?: string;
      message?: string;
    };
    sms?: {
      to: string;
      message?: string;
    };
    print?: {
      printerName?: string;
      copies?: number;
    };
  };
}

// Document Search and Filter
export interface DocumentFilter {
  type?: DocumentType;
  status?: DocumentStatus;
  dateRange?: {
    from: Date;
    to: Date;
  };
  customerName?: string;
  amountRange?: {
    min: number;
    max: number;
  };
  tags?: string[];
  searchQuery?: string;
}

// Document Statistics
export interface DocumentStats {
  totalDocuments: number;
  totalRevenue: number;
  averageAmount: number;
  
  byType: {
    receipts: number;
    invoices: number;
    refunds: number;
  };
  
  byStatus: {
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    cancelled: number;
  };
  
  recentActivity: {
    documentsThisWeek: number;
    revenueThisWeek: number;
    averageThisWeek: number;
  };
}

// Service Response Types
export interface DocumentGenerationResult {
  success: boolean;
  documentId: string;
  documentUrl?: string;
  pdfBuffer?: Buffer;
  error?: string;
}

export interface DocumentDeliveryResult {
  success: boolean;
  deliveryMethod: 'email' | 'sms' | 'print';
  recipient: string;
  timestamp: Date;
  error?: string;
}

// Configuration Types
export interface DocumentSettings {
  defaultTemplate: {
    receipt: string;
    invoice: string;
  };
  
  numbering: {
    receiptPrefix: string;
    invoicePrefix: string;
    receiptNextNumber: number;
    invoiceNextNumber: number;
    resetPeriod: 'never' | 'yearly' | 'monthly';
  };
  
  defaultTerms: {
    paymentDays: number;
    paymentTerms: string;
    returnPolicy: string;
    termsAndConditions: string;
  };
  
  emailSettings: {
    fromName: string;
    fromEmail: string;
    replyTo: string;
    templates: {
      receipt: {
        subject: string;
        body: string;
      };
      invoice: {
        subject: string;
        body: string;
      };
    };
  };
  
  smsSettings: {
    enabled: boolean;
    provider: string;
    fromNumber: string;
    templates: {
      receipt: string;
      invoice: string;
    };
  };
}
