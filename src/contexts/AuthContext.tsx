import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Alert } from 'react-native';
import { User, UserPermissions, LoginCredentials, AuthState, AuthAction } from '../types/auth';
import { authService } from '../services/AuthService';

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  permissions: null,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        permissions: action.payload.permissions,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        permissions: null,
        error: action.payload.error,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        permissions: null,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload.user,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

// Context type
interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  permissions: UserPermissions | null;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  
  // Permission helpers
  hasPermission: (permission: keyof UserPermissions) => boolean;
  requirePermission: (permission: keyof UserPermissions) => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on app start
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const session = await authService.getCurrentSession();
      if (session) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: session.user,
            permissions: session.permissions,
          },
        });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      console.error('Session check failed:', error);
      dispatch({ type: 'LOGOUT' });
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const session = await authService.login(credentials);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: session.user,
          permissions: session.permissions,
        },
      });

      // Show welcome message
      Alert.alert(
        '🎉 Login Successful',
        `Welcome back, ${session.user.firstName}!\nRole: ${session.user.role.toUpperCase()}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: { error: errorMessage },
      });
      
      Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
      
      Alert.alert('Logged Out', 'You have been successfully logged out.', [
        { text: 'OK' }
      ]);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still dispatch logout to clear state
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!state.permissions) {return false;}
    return state.permissions[permission] || false;
  };

  const requirePermission = (permission: keyof UserPermissions): boolean => {
    const hasAccess = hasPermission(permission);
    if (!hasAccess) {
      Alert.alert(
        'Access Denied',
        `You don't have permission to perform this action.\nRequired: ${permission}`,
        [{ text: 'OK' }]
      );
    }
    return hasAccess;
  };

  const value: AuthContextType = {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    permissions: state.permissions,
    error: state.error,

    // Actions
    login,
    logout,
    clearError,
    
    // Helpers
    hasPermission,
    requirePermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Higher-order component for protected routes
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
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

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
