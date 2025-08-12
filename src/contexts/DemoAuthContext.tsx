import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPermissions, LoginCredentials, AuthState } from '../types/auth';

// Demo user data
const DEMO_USER: User = {
  id: 'demo-user-1',
  username: 'demo',
  email: 'demo@salesmp.com',
  firstName: 'Demo',
  lastName: 'User',
  role: 'admin' as any,
  isActive: true,
  lastLogin: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEMO_PERMISSIONS: UserPermissions = {
  // POS Operations
  canProcessSales: true,
  canRefundSales: true,
  canDiscountItems: true,
  canVoidTransactions: true,
  
  // Inventory Management
  canManageProducts: true,
  canViewInventory: true,
  canAdjustStock: true,
  canManageSuppliers: true,
  
  // Reporting & Analytics
  canViewReports: true,
  canExportData: true,
  canViewSalesAnalytics: true,
  
  // System Administration
  canManageUsers: true,
  canManageSettings: true,
  canAccessAuditLogs: true,
  canBackupData: true,
};

// Context type
interface DemoAuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  permissions: UserPermissions | null;
  error: string | null;

  // Actions (simplified for demo)
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  
  // Permission helpers
  hasPermission: (permission: keyof UserPermissions) => boolean;
  requirePermission: (permission: keyof UserPermissions) => boolean;
}

// Create context
const DemoAuthContext = createContext<DemoAuthContextType | undefined>(undefined);

// Demo Auth provider component
interface DemoAuthProviderProps {
  children: React.ReactNode;
}

export const DemoAuthProvider: React.FC<DemoAuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Always authenticated in demo
  const [isLoading, setIsLoading] = useState(false);
  const [user] = useState<User>(DEMO_USER);
  const [permissions] = useState<UserPermissions>(DEMO_PERMISSIONS);
  const [error, setError] = useState<string | null>(null);

  // Simulate initial auth check
  useEffect(() => {
    setIsLoading(true);
    // Simulate loading time
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setIsAuthenticated(true);
    }, 500);

    return () => clearTimeout(timeout);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    // Simulate login delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In demo mode, always succeed
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const logout = async () => {
    setIsLoading(true);
    
    // Simulate logout delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsAuthenticated(false);
    setIsLoading(false);
  };

  const clearError = () => {
    setError(null);
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!permissions) {return false;}
    return permissions[permission] || false;
  };

  const requirePermission = (permission: keyof UserPermissions): boolean => {
    const hasAccess = hasPermission(permission);
    if (!hasAccess) {
      setError(`Access denied: ${permission} permission required`);
    }
    return hasAccess;
  };

  const value: DemoAuthContextType = {
    // State
    isAuthenticated,
    isLoading,
    user,
    permissions,
    error,

    // Actions
    login,
    logout,
    clearError,
    
    // Helpers
    hasPermission,
    requirePermission,
  };

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>;
};

// Custom hook to use demo auth context
export const useDemoAuth = (): DemoAuthContextType => {
  const context = useContext(DemoAuthContext);
  if (context === undefined) {
    throw new Error('useDemoAuth must be used within a DemoAuthProvider');
  }
  return context;
};

// For compatibility with existing useAuth calls, create an alias
export const useAuth = useDemoAuth;

// Higher-order component for protected routes (compatible with existing RequireAuth)
interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  permission?: keyof UserPermissions;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ 
  children, 
  fallback,
  permission 
}) => {
  const { isAuthenticated, isLoading, hasPermission } = useDemoAuth();

  if (isLoading) {
    return fallback || null;
  }

  if (!isAuthenticated) {
    return fallback || null;
  }

  if (permission && !hasPermission(permission)) {
    return fallback || null;
  }

  return <>{children}</>;
};
