import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BarcodeScanner } from '../BarcodeScanner';

// Mock the theme
jest.mock('../../styles/theme', () => ({
  theme: {
    colors: {
      primary: '#6C63FF',
      secondary: '#FF6B6B',
      error: '#FF6B6B',
      background: '#F8F9FE',
      surface: '#FFFFFF',
      text: '#2C3E50',
      textSecondary: '#7F8C8D',
      border: '#E8ECEF',
    },
  },
}));

describe('BarcodeScanner', () => {
  const mockProps = {
    visible: true,
    onScan: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(<BarcodeScanner {...mockProps} />);
    
    expect(getByText('Barcode Scanner')).toBeTruthy();
    expect(getByText('Camera Scanner Unavailable')).toBeTruthy();
    expect(getByText('Manual Entry')).toBeTruthy();
    expect(getByText('Demo Scan')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByText } = render(
      <BarcodeScanner {...mockProps} visible={false} />
    );
    
    expect(queryByText('Barcode Scanner')).toBeNull();
  });

  it('calls onClose when close button is pressed', () => {
    const { getByText } = render(<BarcodeScanner {...mockProps} />);
    
    fireEvent.press(getByText('Barcode Scanner'));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('shows manual entry modal when manual entry button is pressed', () => {
    const { getByText } = render(<BarcodeScanner {...mockProps} />);
    
    fireEvent.press(getByText('Manual Entry'));
    
    expect(getByText('Manual Barcode Entry')).toBeTruthy();
    expect(getByText('Enter Barcode:')).toBeTruthy();
  });

  it('calls onScan with demo barcode when demo scan is pressed', () => {
    const { getByText } = render(<BarcodeScanner {...mockProps} />);
    
    fireEvent.press(getByText('Demo Scan'));
    
    expect(mockProps.onScan).toHaveBeenCalledWith(
      expect.stringMatching(/^(123456789|987654321|456789123|789123456)$/)
    );
  });

  it('handles manual barcode entry correctly', async () => {
    const { getByText, getByPlaceholderText } = render(
      <BarcodeScanner {...mockProps} />
    );
    
    // Open manual entry modal
    fireEvent.press(getByText('Manual Entry'));
    
    // Enter barcode
    const input = getByPlaceholderText('e.g., 123456789');
    fireEvent.changeText(input, '123456789');
    
    // Submit
    fireEvent.press(getByText('Scan'));
    
    expect(mockProps.onScan).toHaveBeenCalledWith('123456789');
  });

  it('shows error when manual entry is empty', () => {
    const { getByText } = render(<BarcodeScanner {...mockProps} />);
    
    // Open manual entry modal
    fireEvent.press(getByText('Manual Entry'));
    
    // Try to submit empty barcode
    fireEvent.press(getByText('Scan'));
    
    // Should not call onScan
    expect(mockProps.onScan).not.toHaveBeenCalled();
  });

  it('closes manual entry modal when cancel is pressed', () => {
    const { getByText, queryByText } = render(<BarcodeScanner {...mockProps} />);
    
    // Open manual entry modal
    fireEvent.press(getByText('Manual Entry'));
    expect(getByText('Manual Barcode Entry')).toBeTruthy();
    
    // Cancel
    fireEvent.press(getByText('Cancel'));
    
    // Modal should be closed
    expect(queryByText('Manual Barcode Entry')).toBeNull();
  });
});