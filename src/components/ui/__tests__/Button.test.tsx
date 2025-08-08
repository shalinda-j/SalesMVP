import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock theme
jest.mock('../../../styles/theme', () => ({
  theme: {
    colors: {
      primary: '#007AFF',
      secondary: '#5856D6',
      surface: '#FFFFFF',
      success: '#34C759',
      error: '#FF3B30',
    },
    borderRadius: {
      md: 8,
    },
    fontWeight: {
      semibold: '600',
    },
    fontSize: {
      sm: 14,
      md: 16,
      lg: 18,
    },
    spacing: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
    },
  },
}));

describe('Button', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />
    );

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not call onPress when disabled', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} disabled />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should not call onPress when loading', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={mockOnPress} loading />
    );

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should show loading indicator when loading', () => {
    const { getByTestId } = render(
      <Button title="Test Button" onPress={mockOnPress} loading />
    );

    expect(getByTestId('activity-indicator')).toBeTruthy();
  });

  it('should render with different variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'success', 'error'] as const;

    variants.forEach((variant) => {
      const { getByText } = render(
        <Button title={`${variant} Button`} onPress={mockOnPress} variant={variant} />
      );

      expect(getByText(`${variant} Button`)).toBeTruthy();
    });
  });

  it('should render with different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const { getByText } = render(
        <Button title={`${size} Button`} onPress={mockOnPress} size={size} />
      );

      expect(getByText(`${size} Button`)).toBeTruthy();
    });
  });

  it('should render with icon on left', () => {
    const { getByTestId } = render(
      <Button 
        title="Button with Icon" 
        onPress={mockOnPress} 
        icon="add" 
        iconPosition="left"
      />
    );

    expect(getByTestId('ionicons')).toBeTruthy();
  });

  it('should render with icon on right', () => {
    const { getByTestId } = render(
      <Button 
        title="Button with Icon" 
        onPress={mockOnPress} 
        icon="arrow-forward" 
        iconPosition="right"
      />
    );

    expect(getByTestId('ionicons')).toBeTruthy();
  });

  it('should apply fullWidth style when fullWidth is true', () => {
    const { getByTestId } = render(
      <Button 
        title="Full Width Button" 
        onPress={mockOnPress} 
        fullWidth 
        testID="full-width-button"
      />
    );

    const button = getByTestId('full-width-button');
    expect(button.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ width: '100%' })
      ])
    );
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const customTextStyle = { fontSize: 20 };

    const { getByTestId } = render(
      <Button 
        title="Custom Style Button" 
        onPress={mockOnPress} 
        style={customStyle}
        textStyle={customTextStyle}
        testID="custom-style-button"
      />
    );

    const button = getByTestId('custom-style-button');
    expect(button.props.style).toEqual(
      expect.arrayContaining([customStyle])
    );
  });

  it('should have correct accessibility properties', () => {
    const { getByRole } = render(
      <Button title="Accessible Button" onPress={mockOnPress} />
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByTestId } = render(
      <Button 
        title="Disabled Button" 
        onPress={mockOnPress} 
        disabled 
        testID="disabled-button"
      />
    );

    const button = getByTestId('disabled-button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});