import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from '../Card';

// Mock theme
jest.mock('../../../styles/theme', () => ({
  theme: {
    colors: {
      card: '#FFFFFF',
      borderLight: '#E5E5E7',
      border: '#D1D1D6',
    },
    borderRadius: {
      lg: 12,
    },
    spacing: {
      md: 8,
      lg: 12,
      xl: 16,
    },
  },
}));

describe('Card', () => {
  it('should render children', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );

    expect(getByText('Card Content')).toBeTruthy();
  });

  it('should render as TouchableOpacity when onPress is provided', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <Card onPress={mockOnPress} testID="pressable-card">
        <Text>Pressable Card</Text>
      </Card>
    );

    const card = getByTestId('pressable-card');
    fireEvent.press(card);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should render as View when onPress is not provided', () => {
    const { getByTestId } = render(
      <Card testID="static-card">
        <Text>Static Card</Text>
      </Card>
    );

    const card = getByTestId('static-card');
    expect(card.type).toBe('View');
  });

  it('should apply default variant styles', () => {
    const { getByTestId } = render(
      <Card testID="default-card">
        <Text>Default Card</Text>
      </Card>
    );

    const card = getByTestId('default-card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderWidth: 1,
          borderColor: '#E5E5E7',
        })
      ])
    );
  });

  it('should apply elevated variant styles', () => {
    const { getByTestId } = render(
      <Card variant="elevated" testID="elevated-card">
        <Text>Elevated Card</Text>
      </Card>
    );

    const card = getByTestId('elevated-card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderWidth: 2,
          borderColor: '#D1D1D6',
        })
      ])
    );
  });

  it('should apply outlined variant styles', () => {
    const { getByTestId } = render(
      <Card variant="outlined" testID="outlined-card">
        <Text>Outlined Card</Text>
      </Card>
    );

    const card = getByTestId('outlined-card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderWidth: 1,
          borderColor: '#D1D1D6',
        })
      ])
    );
  });

  it('should apply glass variant styles', () => {
    const { getByTestId } = render(
      <Card variant="glass" testID="glass-card">
        <Text>Glass Card</Text>
      </Card>
    );

    const card = getByTestId('glass-card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        })
      ])
    );
  });

  it('should apply different padding sizes', () => {
    const paddingSizes = ['none', 'sm', 'md', 'lg'] as const;
    const expectedPadding = [0, 8, 12, 16];

    paddingSizes.forEach((padding, index) => {
      const { getByTestId } = render(
        <Card padding={padding} testID={`${padding}-padding-card`}>
          <Text>{padding} Padding Card</Text>
        </Card>
      );

      const card = getByTestId(`${padding}-padding-card`);
      expect(card.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            padding: expectedPadding[index],
          })
        ])
      );
    });
  });

  it('should apply custom styles', () => {
    const customStyle = { backgroundColor: 'red', margin: 10 };

    const { getByTestId } = render(
      <Card style={customStyle} testID="custom-style-card">
        <Text>Custom Style Card</Text>
      </Card>
    );

    const card = getByTestId('custom-style-card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([customStyle])
    );
  });

  it('should have correct base styles', () => {
    const { getByTestId } = render(
      <Card testID="base-card">
        <Text>Base Card</Text>
      </Card>
    );

    const card = getByTestId('base-card');
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
        })
      ])
    );
  });
});