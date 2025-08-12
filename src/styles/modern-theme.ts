import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
const isSmallPhone = width < 380;

export const modernTheme = {
  colors: {
    // Primary Brand Colors
    primary: {
      50: '#E3F2FD',
      100: '#BBDEFB',
      200: '#90CAF9',
      300: '#64B5F6',
      400: '#42A5F5',
      500: '#2196F3', // Main primary
      600: '#1E88E5',
      700: '#1976D2',
      800: '#1565C0',
      900: '#0D47A1',
    },
    
    // Secondary Brand Colors
    secondary: {
      50: '#F3E5F5',
      100: '#E1BEE7',
      200: '#CE93D8',
      300: '#BA68C8',
      400: '#AB47BC',
      500: '#9C27B0', // Main secondary
      600: '#8E24AA',
      700: '#7B1FA2',
      800: '#6A1B9A',
      900: '#4A148C',
    },

    // Success Colors
    success: {
      50: '#E8F5E8',
      100: '#C8E6C9',
      200: '#A5D6A7',
      300: '#81C784',
      400: '#66BB6A',
      500: '#4CAF50', // Main success
      600: '#43A047',
      700: '#388E3C',
      800: '#2E7D32',
      900: '#1B5E20',
    },

    // Warning Colors
    warning: {
      50: '#FFF8E1',
      100: '#FFECB3',
      200: '#FFE082',
      300: '#FFD54F',
      400: '#FFCA28',
      500: '#FFC107', // Main warning
      600: '#FFB300',
      700: '#FFA000',
      800: '#FF8F00',
      900: '#FF6F00',
    },

    // Error Colors
    error: {
      50: '#FFEBEE',
      100: '#FFCDD2',
      200: '#EF9A9A',
      300: '#E57373',
      400: '#EF5350',
      500: '#F44336', // Main error
      600: '#E53935',
      700: '#D32F2F',
      800: '#C62828',
      900: '#B71C1C',
    },

    // Neutral Colors
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#EEEEEE',
      300: '#E0E0E0',
      400: '#BDBDBD',
      500: '#9E9E9E',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },

    // Background Colors
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FA',
      tertiary: '#F1F3F4',
      overlay: 'rgba(0, 0, 0, 0.5)',
      modal: 'rgba(0, 0, 0, 0.3)',
    },

    // Text Colors
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
      tertiary: '#999999',
      disabled: '#CCCCCC',
      inverse: '#FFFFFF',
      link: '#2196F3',
    },

    // Border Colors
    border: {
      light: '#E0E0E0',
      medium: '#BDBDBD',
      dark: '#9E9E9E',
      focus: '#2196F3',
      error: '#F44336',
    },

    // Shadow Colors
    shadow: {
      light: 'rgba(0, 0, 0, 0.1)',
      medium: 'rgba(0, 0, 0, 0.15)',
      dark: 'rgba(0, 0, 0, 0.2)',
    },
  },

  // Typography System
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
      monospace: 'SpaceMono',
    },

    fontSize: {
      xs: isSmallPhone ? 10 : 12,
      sm: isSmallPhone ? 12 : 14,
      md: isSmallPhone ? 14 : 16,
      lg: isSmallPhone ? 16 : 18,
      xl: isSmallPhone ? 18 : 20,
      '2xl': isSmallPhone ? 20 : 24,
      '3xl': isSmallPhone ? 24 : 30,
      '4xl': isSmallPhone ? 28 : 36,
      '5xl': isSmallPhone ? 32 : 48,
    },

    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
    },

    fontWeight: {
      light: '300',
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
  },

  // Spacing System
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
    '4xl': 96,
  },

  // Border Radius System
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  // Shadow System
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 12,
    },
  },

  // Animation System
  animations: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 350,
      slower: 500,
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },

  // Layout System
  layout: {
    maxWidth: {
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
    container: {
      padding: isTablet ? 32 : 16,
    },
  },

  // Component-specific styles
  components: {
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
    },
    button: {
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      minHeight: 44, // Touch target minimum
    },
    input: {
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
    },
    modal: {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      margin: 20,
      padding: 24,
    },
  },

  // Responsive breakpoints
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },

  // Device-specific adjustments
  device: {
    isTablet,
    isSmallPhone,
    width,
    height,
  },
} as const;

export type ModernTheme = typeof modernTheme;

// Utility functions for theme usage
export const getResponsiveValue = <T>(
  mobile: T,
  tablet: T,
  theme: ModernTheme = modernTheme
): T => {
  return theme.device.isTablet ? tablet : mobile;
};

export const getColor = (
  colorPath: string,
  theme: ModernTheme = modernTheme
): string => {
  const path = colorPath.split('.');
  let value: any = theme.colors;
  
  for (const key of path) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Color path "${colorPath}" not found in theme`);
      return theme.colors.neutral[500];
    }
  }
  
  return value;
};

export const getSpacing = (
  size: keyof ModernTheme['spacing'],
  theme: ModernTheme = modernTheme
): number => {
  return theme.spacing[size];
};

export const getTypography = (
  size: keyof ModernTheme['typography']['fontSize'],
  weight: keyof ModernTheme['typography']['fontWeight'] = 'regular',
  theme: ModernTheme = modernTheme
) => {
  return {
    fontSize: theme.typography.fontSize[size],
    fontFamily: theme.typography.fontFamily[weight as keyof typeof theme.typography.fontFamily],
    fontWeight: theme.typography.fontWeight[weight],
    lineHeight: theme.typography.fontSize[size] * theme.typography.lineHeight.normal,
  };
};
