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
  description?: string;
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

// Authentication and user management types
export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface UserPermissions {
  // POS Operations
  canProcessSales: boolean;
  canRefundSales: boolean;
  canDiscountItems: boolean;
  canVoidTransactions: boolean;
  
  // Inventory Management
  canManageProducts: boolean;
  canViewInventory: boolean;
  canAdjustStock: boolean;
  canManageSuppliers: boolean;
  
  // Reporting & Analytics
  canViewReports: boolean;
  canExportData: boolean;
  canViewSalesAnalytics: boolean;
  
  // System Administration
  canManageUsers: boolean;
  canManageSettings: boolean;
  canAccessAuditLogs: boolean;
  canBackupData: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: Date;
  permissions: UserPermissions;
}

export interface CreateUserInput {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserInput {
  id: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  lastLogin?: Date;
}

export interface PasswordResetRequest {
  email: string;
  resetToken?: string;
  newPassword?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  details?: any;
  ipAddress?: string;
  timestamp: Date;
}

// Role-based permission defaults
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    // Full access to everything
    canProcessSales: true,
    canRefundSales: true,
    canDiscountItems: true,
    canVoidTransactions: true,
    canManageProducts: true,
    canViewInventory: true,
    canAdjustStock: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canViewSalesAnalytics: true,
    canManageUsers: true,
    canManageSettings: true,
    canAccessAuditLogs: true,
    canBackupData: true,
  },
  manager: {
    // Management level access
    canProcessSales: true,
    canRefundSales: true,
    canDiscountItems: true,
    canVoidTransactions: true,
    canManageProducts: true,
    canViewInventory: true,
    canAdjustStock: true,
    canManageSuppliers: true,
    canViewReports: true,
    canExportData: true,
    canViewSalesAnalytics: true,
    canManageUsers: false, // Cannot manage other users
    canManageSettings: false, // Cannot change system settings
    canAccessAuditLogs: true,
    canBackupData: false,
  },
  cashier: {
    // Basic POS operations only
    canProcessSales: true,
    canRefundSales: false, // Requires manager approval
    canDiscountItems: false, // Requires manager approval
    canVoidTransactions: false, // Requires manager approval
    canManageProducts: false,
    canViewInventory: true, // Can check stock levels
    canAdjustStock: false,
    canManageSuppliers: false,
    canViewReports: false,
    canExportData: false,
    canViewSalesAnalytics: false,
    canManageUsers: false,
    canManageSettings: false,
    canAccessAuditLogs: false,
    canBackupData: false,
  },
};

// Authentication states
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  permissions: UserPermissions | null;
  error: string | null;
}

// Authentication actions
export type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; permissions: UserPermissions } }
  | { type: 'LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: { user: User } }
  | { type: 'CLEAR_ERROR' };

// Database operation types
export interface CreateProductInput {
  sku: string;
  name: string;
  price: number;
  cost: number;
  stock_qty?: number;
  tax_rate?: number;
}

export interface UpdateProductInput {
  id: number;
  sku?: string;
  name?: string;
  price?: number;
  cost?: number;
  stock_qty?: number;
  tax_rate?: number;
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
  isInitialized(): boolean;
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

  // User management operations
  createUser(input: CreateUserInput): Promise<User>;
  getUser(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUser(input: UpdateUserInput): Promise<User>;
  deleteUser(id: string): Promise<boolean>;

  // Password management
  saveUserPassword(userId: string, passwordHash: string, salt: string): Promise<void>;
  getUserPassword(userId: string): Promise<{ passwordHash: string; salt: string } | null>;

  // Session management
  saveAuthSession(sessionId: string, userId: string, token: string, expiresAt: Date): Promise<void>;
  getAuthSession(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
  } | null>;
  deleteAuthSession(token: string): Promise<boolean>;
  cleanExpiredSessions(): Promise<number>;

  // Audit logging
  logAuditEvent(userId: string | null, action: string, resource: string, details?: any, ipAddress?: string): Promise<void>;
  getAuditLogs(): Promise<AuditLog[]>;

  // Business settings and user profile
  getBusinessSettings(): Promise<BusinessSettings | null>;
  saveBusinessSettings(settings: BusinessSettings): Promise<BusinessSettings>;
  getUserProfile(userId: string): Promise<UserProfile | null>;
  saveUserProfile(profile: UserProfile): Promise<UserProfile>;
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

// Re-export standardized POS types aligned with NRF ARTS RetailTransaction
// See: src/types/pos.ts
export * from './pos';

// Re-export standard CartItem type for consistency
export { CartItem } from './pos';

// Business Settings and Profile Management
export interface BusinessSettings {
  id: string;
  businessName: string;
  businessLogo?: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  timezone: string;
  language: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  userId: string;
  avatar?: string;
  phoneNumber?: string;
  address?: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    language: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateBusinessSettingsInput {
  businessName?: string;
  businessLogo?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  currency?: string;
  currencySymbol?: string;
  taxRate?: number;
  timezone?: string;
  language?: string;
}

export interface UpdateUserProfileInput {
  avatar?: string;
  phoneNumber?: string;
  address?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: boolean;
    language?: string;
  };
}