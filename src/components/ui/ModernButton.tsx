import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { modernTheme, getTypography, getSpacing } from '../../styles/modern-theme';

export interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right' | 'center';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: modernTheme.borderRadius.md,
      ...modernTheme.shadows.sm,
    };

    // Size styles
    const sizeStyles = {
      sm: {
        paddingVertical: getSpacing('sm'),
        paddingHorizontal: getSpacing('md'),
        minHeight: 36,
      },
      md: {
        paddingVertical: getSpacing('md'),
        paddingHorizontal: getSpacing('lg'),
        minHeight: 44,
      },
      lg: {
        paddingVertical: getSpacing('lg'),
        paddingHorizontal: getSpacing('xl'),
        minHeight: 52,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: isDisabled ? modernTheme.colors.neutral[300] : modernTheme.colors.primary[500],
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: isDisabled ? modernTheme.colors.neutral[300] : modernTheme.colors.secondary[500],
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: isDisabled ? modernTheme.colors.neutral[300] : modernTheme.colors.primary[500],
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
      danger: {
        backgroundColor: isDisabled ? modernTheme.colors.neutral[300] : modernTheme.colors.error[500],
        borderWidth: 0,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      width: fullWidth ? '100%' : undefined,
      opacity: isDisabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...getTypography(size === 'sm' ? 'sm' : 'md', 'medium'),
      textAlign: 'center',
    };

    const variantTextStyles = {
      primary: {
        color: modernTheme.colors.text.inverse,
      },
      secondary: {
        color: modernTheme.colors.text.inverse,
      },
      outline: {
        color: isDisabled ? modernTheme.colors.text.disabled : modernTheme.colors.primary[500],
      },
      ghost: {
        color: isDisabled ? modernTheme.colors.text.disabled : modernTheme.colors.primary[500],
      },
      danger: {
        color: modernTheme.colors.text.inverse,
      },
    };

    return {
      ...baseTextStyle,
      ...variantTextStyles[variant],
    };
  };

  const getIconStyle = (): ViewStyle => {
    const iconSpacing = getSpacing('sm');
    return {
      marginLeft: iconPosition === 'right' ? iconSpacing : 0,
      marginRight: iconPosition === 'left' ? iconSpacing : 0,
    };
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'outline' || variant === 'ghost'
              ? modernTheme.colors.primary[500]
              : modernTheme.colors.text.inverse
          }
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={getIconStyle()}>{icon}</View>
          )}
          {title && <Text style={[getTextStyle(), textStyle]}>{title}</Text>}
          {icon && iconPosition === 'right' && (
            <View style={getIconStyle()}>{icon}</View>
          )}
          {icon && iconPosition === 'center' && (
            <View style={getIconStyle()}>{icon}</View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
