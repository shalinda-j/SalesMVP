/*
  POS Sale Types aligned with NRF ARTS RetailTransaction concepts
  References:
  - OMG/NRF ARTS Retail Operational Data Model: Retail Transaction, TenderLineItem
  - https://www.omg.org/retail-depository/arts-odm-73/

  Notes:
  - This schema is simplified for mobile POS while keeping terminology consistent.
  - It maps cleanly to existing local DB tables (`sales`, `sale_items`, `payments`).
*/

export type CurrencyCode = string; // e.g., "USD", "EUR"

export type TenderType =
  | 'cash'
  | 'card'
  | 'digital' // wallets (UPI, Apple Pay, etc.)
  | 'store_credit'
  | 'other';

export interface TaxComponent {
  id?: string;
  name: string; // e.g., VAT, GST
  rate: number; // 0.00 - 1.00
  amount: number; // tax monetary amount
}

export interface DiscountComponent {
  id?: string;
  type: 'amount' | 'percent';
  value: number; // amount or percent value
  reason?: string;
}

// RetailTradeItemLineItem (simplified)
export interface SaleLineItem {
  id?: string;
  lineNumber: number;
  productId: number; // maps to Product.id
  sku?: string;
  description?: string;
  name: string; // Added for compatibility with other parts of the app
  quantity: number;
  unitPrice: number; // pre-tax unit price
  price: number; // Added for compatibility with other parts of the app
  discounts?: DiscountComponent[];
  taxes?: TaxComponent[];
  lineTotal: {
    net: number; // subtotal after line discounts, before tax
    tax: number; // total taxes for the line
    gross: number; // net + tax
  };
}

// TenderLineItem (simplified)
export interface TenderLineItem {
  id?: string;
  type: TenderType;
  amount: number; // positive for payment, negative for change given
  reference?: string; // last4, txn id, etc.
}

export interface TransactionTotals {
  subTotal: number; // sum of line net
  discountTotal: number; // total across all discounts (header + lines)
  taxTotal: number; // sum of all tax components
  grandTotal: number; // payable amount (subTotal - discounts + tax)
  currency: CurrencyCode;
}

// RetailTransaction (header)
export interface RetailTransaction {
  id?: string; // local UUID
  sequence?: number; // incrementing number (optional)
  businessDate: string; // ISO date yyyy-mm-dd
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  timestamp: Date; // Added for compatibility with Sale type
  status: 'inProgress' | 'completed' | 'voided' | 'returned';
  customerId?: string;
  operatorId?: string; // cashier
  workstationId?: string; // device id
  items: SaleLineItem[];
  tenders: TenderLineItem[];
  totals: TransactionTotals;
  notes?: string;
}

// Standard CartItem type for UI state management
export interface CartItem {
  id: string | number;
  productId: number;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  unitPrice?: number; // alias for price
  description?: string; // alias for name
}

// Helper: minimal cart item used in UI state (legacy compatibility)
export interface CartItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  sku?: string;
  description?: string;
}

// Standard POS State interface
export interface POSState {
  cart: CartItem[];
  currentTransaction: RetailTransaction | null;
  isProcessing: boolean;
  error: string | null;
  searchQuery: string;
  taxRate: number;
  discount: number;
}

// Standard POS Actions interface
export interface POSActions {
  addToCart: (product: any, quantity?: number) => void;
  removeFromCart: (itemId: string | number) => void;
  updateCartQuantity: (itemId: string | number, quantity: number) => void;
  clearCart: () => void;
  processPayment: (paymentMethod: TenderType, amount: number) => Promise<RetailTransaction>;
  voidTransaction: (transactionId: string) => Promise<void>;
  searchProducts: (query: string) => void;
}

// Standard POS Component Props
export interface POSComponentProps {
  state: POSState;
  actions: POSActions;
  products: any[];
  loading?: boolean;
}

// Standard Payment Processing interface
export interface PaymentProcessorProps {
  cart: CartItem[];
  total: number;
  onPaymentComplete: (transaction: RetailTransaction) => void;
  onPaymentCancel: () => void;
  onPaymentError: (error: string) => void;
}

// Standard Receipt interface
export interface ReceiptData {
  transaction: RetailTransaction;
  storeInfo?: {
    name: string;
    address?: string;
    phone?: string;
    website?: string;
  };
  cashierInfo?: {
    name: string;
    id: string;
  };
}

export interface BuildTransactionInput {
  items: CartItemInput[];
  headerDiscounts?: DiscountComponent[];
  tenders?: TenderLineItem[];
  currency?: CurrencyCode;
}

// Standard POS Service interface
export interface POSService {
  addToCart(cart: CartItem[], product: any, quantity?: number): CartItem[];
  removeFromCart(cart: CartItem[], itemId: string | number): CartItem[];
  updateCartQuantity(cart: CartItem[], itemId: string | number, quantity: number): CartItem[];
  calculateCartTotals(cart: CartItem[], taxRate?: number): {
    subtotal: number;
    tax: number;
    total: number;
    itemCount: number;
  };
  processTransaction(cart: CartItem[], paymentMethod: TenderType, amount: number): Promise<RetailTransaction>;
  generateReceipt(transaction: RetailTransaction): ReceiptData;
}
