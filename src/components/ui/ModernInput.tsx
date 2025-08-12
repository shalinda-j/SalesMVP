import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modernTheme, getTypography, getSpacing } from '../../styles/modern-theme';

export interface ModernInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'phone';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'filled';
  disabled?: boolean;
  required?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'number-pad';
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  helperText,
  error,
  type = 'text',
  size = 'md',
  variant = 'default',
  disabled = false,
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  autoCapitalize = 'none',
  autoCorrect = false,
  keyboardType = 'default',
  returnKeyType = 'done',
  onSubmitEditing,
  onBlur,
  onFocus,
  style,
  inputStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const hasError = !!error;
  const isDisabled = disabled;

  const getInputStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      borderRadius: modernTheme.borderRadius.md,
      borderWidth: 1,
      backgroundColor: modernTheme.colors.background.primary,
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
      default: {
        borderColor: isFocused 
          ? modernTheme.colors.primary[500] 
          : hasError 
            ? modernTheme.colors.error[500] 
            : modernTheme.colors.border.light,
        backgroundColor: modernTheme.colors.background.primary,
      },
      outlined: {
        borderColor: isFocused 
          ? modernTheme.colors.primary[500] 
          : hasError 
            ? modernTheme.colors.error[500] 
            : modernTheme.colors.border.medium,
        backgroundColor: 'transparent',
      },
      filled: {
        borderColor: 'transparent',
        backgroundColor: isFocused 
          ? modernTheme.colors.background.primary 
          : modernTheme.colors.background.secondary,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: isDisabled ? 0.6 : 1,
    };
  };

  const getTextInputStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...getTypography(size === 'sm' ? 'sm' : 'md', 'regular'),
      color: modernTheme.colors.text.primary,
      flex: 1,
    };

    if (multiline) {
      return {
        ...baseTextStyle,
        textAlignVertical: 'top',
        paddingTop: getSpacing('sm'),
      };
    }

    return baseTextStyle;
  };

  const getLabelStyle = (): TextStyle => {
    return {
      ...getTypography('sm', 'medium'),
      color: hasError 
        ? modernTheme.colors.error[500] 
        : isFocused 
          ? modernTheme.colors.primary[500] 
          : modernTheme.colors.text.secondary,
      marginBottom: getSpacing('xs'),
    };
  };

  const getHelperTextStyle = (): TextStyle => {
    return {
      ...getTypography('xs', 'regular'),
      color: hasError 
        ? modernTheme.colors.error[500] 
        : modernTheme.colors.text.tertiary,
      marginTop: getSpacing('xs'),
    };
  };

  const getIconStyle = (): ViewStyle => {
    const iconSize = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
    return {
      width: iconSize,
      height: iconSize,
      marginRight: leftIcon ? getSpacing('sm') : 0,
      marginLeft: rightIcon ? getSpacing('sm') : 0,
    };
  };

  const getIconContainerStyle = (): ViewStyle => {
    return {
      width: size === 'sm' ? 16 : size === 'lg' ? 24 : 20,
      height: size === 'sm' ? 16 : size === 'lg' ? 24 : 20,
      marginRight: leftIcon ? getSpacing('sm') : 0,
      marginLeft: rightIcon ? getSpacing('sm') : 0,
    };
  };

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleRightIconPress = () => {
    if (isPassword) {
      setShowPassword(!showPassword);
    } else {
      onRightIconPress?.();
    }
  };

  const getKeyboardType = () => {
    if (keyboardType !== 'default') {return keyboardType;}
    
    switch (type) {
      case 'email':
        return 'email-address';
      case 'number':
        return 'numeric';
      case 'phone':
        return 'phone-pad';
      default:
        return 'default';
    }
  };

  const getSecureTextEntry = () => {
    return isPassword && !showPassword;
  };

  const getRightIcon = () => {
    if (isPassword) {
      return showPassword ? 'eye-off' : 'eye';
    }
    return rightIcon;
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={getLabelStyle()}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View style={getInputStyle()}>
        {leftIcon && (
          <View style={getIconContainerStyle()}>
            <Ionicons
              name={leftIcon}
              size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              color={modernTheme.colors.text.secondary}
            />
          </View>
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={modernTheme.colors.text.tertiary}
          style={[getTextInputStyle(), inputStyle]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={getKeyboardType()}
          returnKeyType={returnKeyType}
          secureTextEntry={getSecureTextEntry()}
          editable={!isDisabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityHint={accessibilityHint}
          accessibilityRole="text"
          accessibilityState={{ disabled: isDisabled }}
        />
        
        {(rightIcon || isPassword) && (
          <TouchableOpacity
            onPress={handleRightIconPress}
            disabled={isDisabled}
            style={getIconContainerStyle()}
            accessibilityRole="button"
            accessibilityLabel={isPassword ? 'Toggle password visibility' : 'Action button'}
          >
            <Ionicons
              name={getRightIcon() as keyof typeof Ionicons.glyphMap}
              size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20}
              color={modernTheme.colors.text.secondary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {(helperText || error) && (
        <Text style={getHelperTextStyle()}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: getSpacing('md'),
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  required: {
    color: modernTheme.colors.error[500],
  },
});
