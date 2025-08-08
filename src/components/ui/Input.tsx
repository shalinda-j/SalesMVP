import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../styles/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  size = 'md',
  containerStyle,
  value,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedLabel = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    animateLabel(1);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (!value) {
      animateLabel(0);
    }
    onBlur?.(e);
  };

  const animateLabel = (toValue: number) => {
    Animated.timing(animatedLabel, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const labelStyle = {
    position: 'absolute' as const,
    left: leftIcon ? 45 : 16,
    top: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [size === 'sm' ? 12 : size === 'md' ? 16 : 20, -8],
    }),
    fontSize: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.fontSize.md, theme.fontSize.sm],
    }),
    color: animatedLabel.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.textLight, isFocused ? theme.colors.primary : theme.colors.textSecondary],
    }),
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 4,
  };

  const inputHeight = size === 'sm' ? 40 : size === 'md' ? 48 : 56;
  const iconSize = size === 'sm' ? 18 : size === 'md' ? 20 : 24;

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.inputContainer,
          styles[variant],
          { height: inputHeight },
          isFocused && styles.focused,
          error && styles.error,
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <Ionicons 
              name={leftIcon} 
              size={iconSize} 
              color={isFocused ? theme.colors.primary : theme.colors.textLight}
            />
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            { paddingLeft: leftIcon ? 40 : 16 },
            { paddingRight: rightIcon ? 40 : 16 },
          ]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={theme.colors.textLight}
          {...props}
        />

        {label && (
          <Animated.Text style={labelStyle}>
            {label}
          </Animated.Text>
        )}

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
          >
            <Ionicons 
              name={rightIcon} 
              size={iconSize} 
              color={isFocused ? theme.colors.primary : theme.colors.textLight}
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text style={[styles.helperText, error && styles.errorText]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    position: 'relative',
  },
  input: {
    flex: 1,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
  },

  // Variants
  default: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  outlined: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  filled: {
    backgroundColor: theme.colors.background,
    borderWidth: 0,
  },

  // States
  focused: {
    borderColor: theme.colors.primary,
  },
  error: {
    borderColor: theme.colors.error,
  },

  // Icons
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    padding: 4,
  },

  // Helper text
  helperText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
  },
});
