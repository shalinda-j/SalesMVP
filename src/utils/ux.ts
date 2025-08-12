import React from 'react';
import { Platform, Vibration, Alert } from 'react-native';
import { getDeviceOptimizations, getAnimationDuration } from './responsive';

// Haptic feedback utility
export class HapticFeedback {
  static light() {
    try {
      const { shouldUseHapticFeedback } = getDeviceOptimizations();
      if (shouldUseHapticFeedback && Platform.OS === 'ios') {
        // iOS haptic feedback would require expo-haptics
        // For now, use vibration as fallback
        Vibration.vibrate(10);
      } else if (Platform.OS === 'android') {
        Vibration.vibrate(50);
      }
      // Web platform - do nothing, no vibration support
    } catch (error) {
      // Silently ignore haptic feedback errors
      console.debug('Haptic feedback not available:', error);
    }
  }

  static medium() {
    try {
      const { shouldUseHapticFeedback } = getDeviceOptimizations();
      if (shouldUseHapticFeedback && Platform.OS === 'ios') {
        Vibration.vibrate(25);
      } else if (Platform.OS === 'android') {
        Vibration.vibrate(100);
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }

  static heavy() {
    try {
      const { shouldUseHapticFeedback } = getDeviceOptimizations();
      if (shouldUseHapticFeedback && Platform.OS === 'ios') {
        Vibration.vibrate(50);
      } else if (Platform.OS === 'android') {
        Vibration.vibrate(200);
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }

  static success() {
    try {
      const { shouldUseHapticFeedback } = getDeviceOptimizations();
      if (shouldUseHapticFeedback && Platform.OS !== 'web') {
        Vibration.vibrate([0, 50, 50, 50]);
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }

  static error() {
    try {
      const { shouldUseHapticFeedback } = getDeviceOptimizations();
      if (shouldUseHapticFeedback && Platform.OS !== 'web') {
        Vibration.vibrate([0, 100, 100, 100, 100, 100]);
      }
    } catch (error) {
      console.debug('Haptic feedback not available:', error);
    }
  }
}

// Enhanced loading states
export const LoadingStates = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type LoadingState = typeof LoadingStates[keyof typeof LoadingStates];

// Toast notification utility
export class ToastManager {
  static show(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') {
    try {
      const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌',
      };

      Alert.alert(
        `${icons[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        message,
        [{ text: 'OK', style: 'default' }]
      );

      // Add haptic feedback based on type
      switch (type) {
        case 'success':
          HapticFeedback.success();
          break;
        case 'error':
          HapticFeedback.error();
          break;
        case 'warning':
          HapticFeedback.medium();
          break;
        default:
          HapticFeedback.light();
      }
    } catch (error) {
      console.error('Toast notification failed:', error);
      // Fallback to console log
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }

  static success(message: string) {
    this.show(message, 'success');
  }

  static error(message: string) {
    this.show(message, 'error');
  }

  static warning(message: string) {
    this.show(message, 'warning');
  }

  static info(message: string) {
    this.show(message, 'info');
  }
}

// Animation helpers
export const AnimationHelpers = {
  // Spring animation config
  spring: {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  },

  // Timing animation config  
  timing: {
    duration: getAnimationDuration(),
    useNativeDriver: true,
  },

  // Fade animations
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },

  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },

  // Scale animations
  scaleIn: {
    from: { scale: 0.8, opacity: 0 },
    to: { scale: 1, opacity: 1 },
  },

  scaleOut: {
    from: { scale: 1, opacity: 1 },
    to: { scale: 0.8, opacity: 0 },
  },

  // Slide animations
  slideInFromBottom: {
    from: { translateY: 100, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
  },

  slideOutToBottom: {
    from: { translateY: 0, opacity: 1 },
    to: { translateY: 100, opacity: 0 },
  },
};

// Gesture helpers
export const GestureHelpers = {
  // Debounce function for preventing rapid taps
  debounce: <T extends (...args: any[]) => void>(func: T, delay: number = 300): T => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return ((...args: any[]) => {
      if (timeoutId) {clearTimeout(timeoutId);}
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    }) as T;
  },

  // Throttle function for limiting function calls
  throttle: <T extends (...args: any[]) => void>(func: T, delay: number = 100): T => {
    let lastCall = 0;
    return ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(null, args);
      }
    }) as T;
  },

  // Double tap handler
  createDoubleTapHandler: (onSingleTap?: () => void, onDoubleTap?: () => void, delay: number = 300) => {
    let lastTap = 0;
    let singleTapTimeout: ReturnType<typeof setTimeout> | undefined;

    return () => {
      const now = Date.now();
      const timeSinceLast = now - lastTap;

      if (timeSinceLast < delay && timeSinceLast > 0) {
        // Double tap detected
        if (singleTapTimeout) {clearTimeout(singleTapTimeout);}
        onDoubleTap?.();
        HapticFeedback.light();
      } else {
        // Potentially single tap
        singleTapTimeout = setTimeout(() => {
          onSingleTap?.();
          HapticFeedback.light();
        }, delay);
      }

      lastTap = now;
    };
  },
};

// Accessibility helpers
export const AccessibilityHelpers = {
  // Generate accessible labels
  generateAccessibilityLabel: (label: string, hint?: string): { accessibilityLabel: string; accessibilityHint?: string } => {
    return {
      accessibilityLabel: label,
      ...(hint && { accessibilityHint: hint }),
    };
  },

  // Common accessibility roles
  roles: {
    button: 'button',
    link: 'link',
    text: 'text',
    image: 'image',
    header: 'header',
    summary: 'summary',
    tab: 'tab',
  } as const,

  // Semantic props for better screen reader support
  getSemanticProps: (
    label: string,
    role: string = 'button',
    hint?: string,
    state?: { selected?: boolean; disabled?: boolean; expanded?: boolean }
  ) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: role as any,
    ...(hint && { accessibilityHint: hint }),
    ...(state?.selected && { accessibilityState: { selected: true } }),
    ...(state?.disabled && { accessibilityState: { disabled: true } }),
    ...(state?.expanded !== undefined && { accessibilityState: { expanded: state.expanded } }),
  }),
};

// Form validation helpers
export const ValidationHelpers = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  },

  required: (value: string): boolean => {
    return value.trim().length > 0;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },

  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  numeric: (value: string): boolean => {
    return /^\d+$/.test(value);
  },

  decimal: (value: string): boolean => {
    return /^\d+(\.\d{1,2})?$/.test(value);
  },
};

// Performance optimization helpers
export const PerformanceHelpers = {
  // Lazy loading helper
  createLazyLoader: <T>(loader: () => Promise<T>) => {
    let promise: Promise<T> | null = null;
    
    return (): Promise<T> => {
      if (!promise) {
        promise = loader();
      }
      return promise;
    };
  },

  // Image optimization
  getOptimizedImageProps: (uri: string, width?: number, height?: number) => {
    const { maxImageQuality } = getDeviceOptimizations();
    
    return {
      source: { uri },
      ...(width && { width }),
      ...(height && { height }),
      resizeMode: 'cover' as const,
      // In a real app, you might add image quality optimization here
      quality: maxImageQuality,
    };
  },

  // Memory management
  createMemoizedFunction: <T extends (...args: any[]) => any>(fn: T, keyGenerator?: (...args: Parameters<T>) => string): T => {
    const cache = new Map<string, ReturnType<T>>();
    
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
};

// Error handling utilities
export const ErrorHandlers = {
  // Network error handler
  handleNetworkError: (error: any) => {
    if (error.message?.includes('Network')) {
      ToastManager.error('Network connection failed. Please check your internet connection.');
    } else if (error.status === 401) {
      ToastManager.error('Session expired. Please log in again.');
    } else if (error.status >= 500) {
      ToastManager.error('Server error. Please try again later.');
    } else {
      ToastManager.error('An unexpected error occurred. Please try again.');
    }
  },

  // Validation error handler
  handleValidationError: (errors: Record<string, string[]>) => {
    const firstError = Object.values(errors)[0]?.[0];
    if (firstError) {
      ToastManager.warning(firstError);
    }
  },

  // Generic error boundary
  createErrorBoundary: (onError?: (error: Error, errorInfo: any) => void) => {
    return class ErrorBoundary extends React.Component {
      constructor(props: any) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      componentDidCatch(error: Error, errorInfo: any) {
        console.error('Error caught by boundary:', error, errorInfo);
        onError?.(error, errorInfo);
        ToastManager.error('Something went wrong. Please restart the app.');
      }

      render() {
        if ((this.state as any).hasError) {
          return null; // You could return a fallback UI here
        }

        return (this.props as any).children;
      }
    };
  },
};

// Date and time utilities for better UX
export const DateTimeHelpers = {
  // Format relative time (e.g., "2 minutes ago")
  formatRelativeTime: (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {return 'Just now';}
    if (diffMinutes < 60) {return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;}
    if (diffHours < 24) {return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;}
    if (diffDays < 7) {return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;}
    
    return date.toLocaleDateString();
  },

  // Format date in a readable format
  formatDate: (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  },

  // Format currency with locale support
  formatCurrency: (amount: number, currency: string = 'USD', locale: string = 'en-US'): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  },

  // Format numbers with appropriate precision
  formatNumber: (num: number, precision?: number): string => {
    if (precision !== undefined) {
      return num.toFixed(precision);
    }
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    
    return num.toString();
  },
};
