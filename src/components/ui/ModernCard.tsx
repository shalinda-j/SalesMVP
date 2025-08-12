import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Text,
} from 'react-native';
import { modernTheme, getSpacing } from '../../styles/modern-theme';

export interface ModernCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  margin = 'none',
  borderRadius = 'md',
  onPress,
  style,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      backgroundColor: modernTheme.colors.background.primary,
      borderRadius: modernTheme.borderRadius[borderRadius],
    };

    // Variant styles
    const variantStyles = {
      default: {
        ...modernTheme.shadows.sm,
        borderWidth: 0,
      },
      elevated: {
        ...modernTheme.shadows.lg,
        borderWidth: 0,
      },
      outlined: {
        borderWidth: 1,
        borderColor: modernTheme.colors.border.light,
        shadowOpacity: 0,
        elevation: 0,
      },
      flat: {
        shadowOpacity: 0,
        elevation: 0,
        borderWidth: 0,
      },
    };

    // Padding styles
    const paddingStyles = {
      none: { padding: 0 },
      sm: { padding: getSpacing('sm') },
      md: { padding: getSpacing('md') },
      lg: { padding: getSpacing('lg') },
      xl: { padding: getSpacing('xl') },
    };

    // Margin styles
    const marginStyles = {
      none: { margin: 0 },
      sm: { margin: getSpacing('sm') },
      md: { margin: getSpacing('md') },
      lg: { margin: getSpacing('lg') },
      xl: { margin: getSpacing('xl') },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
      ...paddingStyles[padding],
      ...marginStyles[margin],
      opacity: disabled ? 0.6 : 1,
    };
  };

  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[getCardStyle(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={onPress ? 0.95 : 1}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
    >
      {children}
    </CardContainer>
  );
};

// Specialized card components for common use cases
export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
}> = ({ title, value, subtitle, icon, color = modernTheme.colors.primary[500], children, style }) => (
  <ModernCard variant="elevated" padding="lg" style={style}>
    <View style={styles.metricContainer}>
      {icon && (
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
      )}
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  </ModernCard>
);

export const ProductCard: React.FC<{
  product: {
    name: string;
    price: number;
    sku?: string;
    stock?: number;
  };
  onPress?: () => void;
  variant?: 'default' | 'compact';
}> = ({ product, onPress, variant = 'default' }) => (
  <ModernCard
    variant="default"
    padding={variant === 'compact' ? 'sm' : 'md'}
    onPress={onPress}
    style={styles.productCard}
  >
    <View style={styles.productContent}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        {product.sku && (
          <Text style={styles.productSku}>SKU: {product.sku}</Text>
        )}
        {product.stock !== undefined && (
          <Text style={[
            styles.productStock,
            { color: product.stock > 0 ? modernTheme.colors.success[500] : modernTheme.colors.error[500] }
          ]}>
            Stock: {product.stock}
          </Text>
        )}
      </View>
      <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
    </View>
  </ModernCard>
);

const styles = StyleSheet.create({
  metricContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getSpacing('md'),
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: modernTheme.typography.fontSize.sm,
    color: modernTheme.colors.text.secondary,
    marginBottom: getSpacing('xs'),
  },
  metricValue: {
    fontSize: modernTheme.typography.fontSize['2xl'],
    fontWeight: modernTheme.typography.fontWeight.bold,
    marginBottom: getSpacing('xs'),
  },
  metricSubtitle: {
    fontSize: modernTheme.typography.fontSize.xs,
    color: modernTheme.colors.text.tertiary,
  },
  productCard: {
    marginBottom: getSpacing('sm'),
  },
  productContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: getSpacing('md'),
  },
  productName: {
    fontSize: modernTheme.typography.fontSize.md,
    fontWeight: modernTheme.typography.fontWeight.medium,
    color: modernTheme.colors.text.primary,
    marginBottom: getSpacing('xs'),
  },
  productSku: {
    fontSize: modernTheme.typography.fontSize.sm,
    color: modernTheme.colors.text.secondary,
    marginBottom: getSpacing('xs'),
  },
  productStock: {
    fontSize: modernTheme.typography.fontSize.sm,
    fontWeight: modernTheme.typography.fontWeight.medium,
  },
  productPrice: {
    fontSize: modernTheme.typography.fontSize.lg,
    fontWeight: modernTheme.typography.fontWeight.bold,
    color: modernTheme.colors.primary[500],
  },
});
