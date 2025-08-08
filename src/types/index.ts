// Core database entity interfaces

export interface Product {
  id: number;
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock_qty: number;
  tax_rate: number;
  category?: string;
}

export interface Sale {
  id: number;
  timestamp: string;
  total: number;
  tax_total: number;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  qty: number;
  unit_price: number;
}

export interface Payment {
  id: number;
  sale_id: number;
  method: 'cash' | 'card' | 'digital';
  amount: number;
  reference?: string;
}

// Database operation types
export interface CreateProductInput {
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock_qty?: number;
  tax_rate?: number;
  category?: string;
}

export interface UpdateProductInput {
  id: number;
  sku?: string;
  name?: string;
  price?: number;
  cost?: number;
  stock_qty?: number;
  tax_rate?: number;
  category?: string;
}

export interface CreateSaleInput {
  total: number;
  tax_total: number;
  status?: 'pending' | 'completed' | 'cancelled';
}

export interface CreateSaleItemInput {
  sale_id: number;
  product_id: number;
  qty: number;
  unit_price: number;
}

export interface CreatePaymentInput {
  sale_id: number;
  method: 'cash' | 'card' | 'digital';
  amount: number;
  reference?: string;
}

// Component prop types
export interface CameraViewProps {
  onBarcodeScanned: (barcode: string) => void;
  isScanning: boolean;
}

export interface ProductScannerProps {
  onProductFound: (product: Product) => void;
  onError: (error: string) => void;
}

export interface SaleInterfaceProps {
  items: SaleItem[];
  products: Product[];
  onAddItem: (productId: number, qty: number) => void;
  onRemoveItem: (itemId: number) => void;
  onCheckout: (paymentMethod: Payment['method']) => void;
}

export interface SalesSummaryProps {
  totalSales: number;
  totalRevenue: number;
  averageTransaction: number;
  date: string;
}

export interface RecentTransactionsProps {
  sales: Sale[];
  onSaleSelect: (saleId: number) => void;
}

// Component state types
export interface POSScreenState {
  isScanning: boolean;
  currentSale: {
    items: SaleItem[];
    total: number;
    tax_total: number;
  };
  error: string | null;
  loading: boolean;
}

export interface DashboardScreenState {
  salesSummary: {
    totalSales: number;
    totalRevenue: number;
    averageTransaction: number;
  };
  recentSales: Sale[];
  loading: boolean;
  error: string | null;
}

export interface CameraState {
  hasPermission: boolean | null;
  isScanning: boolean;
  error: string | null;
}

// Database service types
export interface DatabaseService {
  // Database management
  initialize(): Promise<void>;
  getStats(): Promise<{
    totalProducts: number;
    totalSales: number;
    totalRevenue: number;
  }>;
  getSalesSummaryByDate(date: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    averageTransaction: number;
    transactionCount: number;
  }>;
  executeTransaction<T>(operations: (db: any) => Promise<T>): Promise<T>;

  // Product operations
  createProduct(input: CreateProductInput): Promise<Product>;
  getProduct(id: number): Promise<Product | null>;
  getProductBySku(sku: string): Promise<Product | null>;
  getAllProducts(): Promise<Product[]>;
  updateProduct(input: UpdateProductInput): Promise<Product>;
  deleteProduct(id: number): Promise<boolean>;

  // Sale operations
  createSale(input: CreateSaleInput): Promise<Sale>;
  getSale(id: number): Promise<Sale | null>;
  getAllSales(): Promise<Sale[]>;
  getSalesByDate(date: string): Promise<Sale[]>;
  updateSaleStatus(id: number, status: Sale['status']): Promise<Sale>;
  deleteSale(id: number): Promise<boolean>;

  // Sale item operations
  createSaleItem(input: CreateSaleItemInput): Promise<SaleItem>;
  getSaleItem(id: number): Promise<SaleItem | null>;
  getSaleItems(saleId: number): Promise<SaleItem[]>;
  updateSaleItem(id: number, qty: number, unit_price: number): Promise<SaleItem>;
  deleteSaleItem(id: number): Promise<boolean>;

  // Payment operations
  createPayment(input: CreatePaymentInput): Promise<Payment>;
  getPayment(id: number): Promise<Payment | null>;
  getPayments(saleId: number): Promise<Payment[]>;
  updatePayment(id: number, amount: number, reference?: string): Promise<Payment>;
  deletePayment(id: number): Promise<boolean>;
}

// Utility types
export type DatabaseTable = 'products' | 'sales' | 'sale_items' | 'payments';

export interface DatabaseError {
  code: string;
  message: string;
  table?: DatabaseTable;
}

// Navigation types
export interface TabNavigationState {
  activeTab: 'pos' | 'dashboard';
}

// Barcode scanner types
export interface BarcodeData {
  type: string;
  data: string;
}

export interface ScanResult {
  success: boolean;
  barcode?: string;
  error?: string;
}