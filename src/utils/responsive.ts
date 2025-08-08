import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enhanced device breakpoints
export const BREAKPOINTS = {
  xs: 360,      // Extra small phones
  sm: 480,      // Small phones
  md: 768,      // Tablets
  lg: 1024,     // Large tablets / Small desktops
  xl: 1200,     // Desktops
  xxl: 1440,    // Large desktops
};

// Screen dimensions with orientation support
export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  ratio: SCREEN_WIDTH / SCREEN_HEIGHT,
  isLandscape: SCREEN_WIDTH > SCREEN_HEIGHT,
  isPortrait: SCREEN_HEIGHT >= SCREEN_WIDTH,
};

// Enhanced device type detection
export const isExtraSmall = SCREEN_WIDTH < BREAKPOINTS.xs;
export const isSmall = SCREEN_WIDTH >= BREAKPOINTS.xs && SCREEN_WIDTH < BREAKPOINTS.sm;
export const isMedium = SCREEN_WIDTH >= BREAKPOINTS.sm && SCREEN_WIDTH < BREAKPOINTS.md;
export const isLarge = SCREEN_WIDTH >= BREAKPOINTS.md && SCREEN_WIDTH < BREAKPOINTS.lg;
export const isExtraLarge = SCREEN_WIDTH >= BREAKPOINTS.lg;

// Legacy compatibility
export const isSmallMobile = SCREEN_WIDTH < BREAKPOINTS.sm;
export const isMobile = SCREEN_WIDTH < BREAKPOINTS.md;
export const isTablet = SCREEN_WIDTH >= BREAKPOINTS.md && SCREEN_WIDTH < BREAKPOINTS.lg;
export const isDesktop = SCREEN_WIDTH >= BREAKPOINTS.lg;
export const isLargeTablet = SCREEN_WIDTH >= BREAKPOINTS.lg;

// Dynamic sizing functions
export const wp = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

export const hp = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Responsive font size
export const responsiveFont = (size: number): number => {
  const scale = SCREEN_WIDTH / 320;
  const newSize = size * scale;
  return Math.max(size * 0.8, PixelRatio.roundToNearestPixel(newSize));
};

// Responsive spacing
export const responsiveSpacing = (size: number): number => {
  if (isSmallMobile) return size * 0.8;
  if (isTablet) return size * 1.2;
  return size;
};

// Grid columns based on screen size
export const getGridColumns = (): number => {
  if (isSmallMobile) return 1;
  if (isMobile) return 2;
  if (isTablet) return 3;
  return 4;
};

// Card width based on screen size
export const getCardWidth = (columns: number = getGridColumns()): number => {
  const padding = responsiveSpacing(32); // Total horizontal padding
  const gap = responsiveSpacing(16) * (columns - 1); // Total gap between cards
  return (SCREEN_WIDTH - padding - gap) / columns;
};

// Enhanced responsive font scaling with better readability
export const scaleFont = (size: number): number => {
  if (isExtraSmall) return Math.max(12, size * 0.85);
  if (isSmall) return Math.max(14, size * 0.9);
  if (isMedium) return size;
  if (isLarge) return size * 1.1;
  return size * 1.15;
};

// Responsive spacing with better scaling
export const scaleSpacing = (size: number): number => {
  if (isExtraSmall) return size * 0.7;
  if (isSmall) return size * 0.85;
  if (isMedium) return size;
  if (isLarge) return size * 1.1;
  return size * 1.2;
};

// Touch target sizes for better mobile UX
export const TOUCH_TARGETS = {
  minimum: 44,
  comfortable: 48,
  spacious: 56,
};

export const getTouchTargetSize = (): number => {
  if (isExtraSmall || isSmall) return TOUCH_TARGETS.comfortable;
  if (isMedium) return TOUCH_TARGETS.comfortable;
  return TOUCH_TARGETS.spacious;
};

// Safe area and notch handling
export const getSafeAreaPadding = () => {
  const basePadding = {
    top: Platform.OS === 'ios' ? (SCREEN_HEIGHT >= 812 ? 44 : 20) : 0,
    bottom: Platform.OS === 'ios' ? (SCREEN_HEIGHT >= 812 ? 34 : 0) : 0,
  };
  
  return {
    paddingTop: basePadding.top,
    paddingBottom: basePadding.bottom,
  };
};

// Modal and overlay dimensions
export const getModalDimensions = () => {
  if (isSmallMobile) {
    return {
      width: wp(95),
      maxHeight: hp(85),
      borderRadius: 12,
    };
  }
  
  if (isMobile) {
    return {
      width: wp(90),
      maxHeight: hp(80),
      borderRadius: 16,
    };
  }
  
  return {
    width: Math.min(wp(70), 600),
    maxHeight: hp(75),
    borderRadius: 20,
  };
};

// Responsive grid layout
export const getResponsiveGrid = (itemCount: number) => {
  const columns = getGridColumns();
  const rows = Math.ceil(itemCount / columns);
  const itemWidth = getCardWidth(columns);
  
  return {
    columns,
    rows,
    itemWidth,
    gap: responsiveSpacing(16),
  };
};

// Responsive navigation dimensions
export const getNavigationDimensions = () => {
  if (isSmallMobile) {
    return {
      tabBarHeight: 60,
      headerHeight: 56,
      iconSize: 20,
      fontSize: 10,
    };
  }
  
  if (isMobile) {
    return {
      tabBarHeight: 65,
      headerHeight: 60,
      iconSize: 22,
      fontSize: 11,
    };
  }
  
  return {
    tabBarHeight: 70,
    headerHeight: 64,
    iconSize: 24,
    fontSize: 12,
  };
};

// Animation durations based on device performance
export const getAnimationDuration = () => {
  // Reduce animation duration on lower-end devices
  const pixelRatio = PixelRatio.get();
  const baseDuration = 300;
  
  if (pixelRatio < 2 || isExtraSmall) {
    return baseDuration * 0.7; // Faster animations for performance
  }
  
  return baseDuration;
};

// Typography scale
export const TYPOGRAPHY = {
  h1: scaleFont(32),
  h2: scaleFont(28),
  h3: scaleFont(24),
  h4: scaleFont(20),
  h5: scaleFont(18),
  h6: scaleFont(16),
  body1: scaleFont(16),
  body2: scaleFont(14),
  caption: scaleFont(12),
  overline: scaleFont(10),
};

// Spacing scale
export const SPACING = {
  xs: scaleSpacing(4),
  sm: scaleSpacing(8),
  md: scaleSpacing(16),
  lg: scaleSpacing(24),
  xl: scaleSpacing(32),
  xxl: scaleSpacing(48),
};

// Layout utilities
export const LAYOUT = {
  containerPadding: {
    horizontal: scaleSpacing(16),
    vertical: scaleSpacing(20),
  },
  cardSpacing: scaleSpacing(12),
  sectionSpacing: scaleSpacing(24),
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
};

// Device-specific optimizations
export const getDeviceOptimizations = () => {
  return {
    shouldUseHapticFeedback: Platform.OS === 'ios',
    shouldUseBlur: Platform.OS === 'ios' && !isSmall,
    maxImageQuality: isExtraSmall ? 0.7 : isSmall ? 0.8 : 1.0,
    shouldPreloadImages: !isExtraSmall,
  };
};
