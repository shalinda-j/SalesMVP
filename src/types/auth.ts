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
