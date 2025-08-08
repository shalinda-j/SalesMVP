import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { theme } from '../../styles/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onPress,
}) => {
  const cardStyles = [
    styles.card,
    styles[variant],
    styles[padding],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
  },
  
  // Variants
  default: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  elevated: {
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  outlined: {
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },

  // Padding
  none: {
    padding: 0,
  },
  sm: {
    padding: theme.spacing.md,
  },
  md: {
    padding: theme.spacing.lg,
  },
  lg: {
    padding: theme.spacing.xl,
  },
});
