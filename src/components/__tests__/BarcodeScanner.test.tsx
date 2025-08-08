import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { BarcodeScanner } from '../BarcodeScanner';
import { productService } from '../../services/ProductService';
import { Product } from '../../types';

// Mock dependencies
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
}));

jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: {
    Constants: {
      BarCodeType: {
        ean13: 'ean13',
        ean8: 'ean8',
        upc_a: 'upc_a',
        upc_e: 'upc_e',
        code128: 'code128',
        code39: 'code39',
        qr: 'qr',
      },
    },
  },
}));

jest.mock('../../services/ProductService', () => ({
  productService: {
    getProductBySku: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockProduct: Product = {
  id: 1,
  sku: 'TEST001',
  name: 'Test Product',
  price: 10.99,
  cost: 5.50,
  stock_qty: 100,
  tax_rate: 0.08,
};

describe('BarcodeScanner', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn(),
    onProductFound: jest.fn(),
    onBarcodeScanned: jest.fn(),
    onManualSearch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const { getByText } = render(<BarcodeScanner {...mockProps} />);
    
    expect(getByText('Requesting camera permission...')).toBeTruthy();
  });

  it('should request camera permission on mount', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });

    render(<BarcodeScanner {...mockProps} />);

    await waitFor(() => {
      expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
    });
  });

  it('should show permission request when permission denied', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { getByText } = render(<BarcodeScanner {...mockProps} />);

    await waitFor(() => {
      expect(getByText('Camera permission is required to scan barcodes')).toBeTruthy();
      expect(getByText('Request Permission')).toBeTruthy();
    });
  });

  it('should show alert when permission is denied', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });

    render(<BarcodeScanner {...mockProps} />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission Required',
        'Please enable camera access to scan barcodes',
        expect.any(Array)
      );
    });
  });

  it('should call onClose when cancel button is pressed', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { getByText } = render(<BarcodeScanner {...mockProps} />);

    await waitFor(() => {
      const cancelButton = getByText('Cancel');
      fireEvent.press(cancelButton);
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  it('should handle successful barcode scan with existing product', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    
    (productService.getProductBySku as jest.Mock).mockResolvedValue(mockProduct);

    const { getByTestId } = render(<BarcodeScanner {...mockProps} />);

    // Simulate barcode scan
    const scanner = getByTestId('barcode-scanner');
    fireEvent(scanner, 'onBarCodeScanned', { data: 'TEST001' });

    await waitFor(() => {
      expect(productService.getProductBySku).toHaveBeenCalledWith('TEST001');
      expect(mockProps.onBarcodeScanned).toHaveBeenCalledWith('TEST001');
      expect(mockProps.onProductFound).toHaveBeenCalledWith(mockProduct);
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  it('should handle barcode scan with non-existing product', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    
    (productService.getProductBySku as jest.Mock).mockResolvedValue(null);

    const { getByTestId } = render(<BarcodeScanner {...mockProps} />);

    // Simulate barcode scan
    const scanner = getByTestId('barcode-scanner');
    fireEvent(scanner, 'onBarCodeScanned', { data: 'UNKNOWN001' });

    await waitFor(() => {
      expect(productService.getProductBySku).toHaveBeenCalledWith('UNKNOWN001');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Product Not Found',
        'No product found with barcode: UNKNOWN001',
        expect.any(Array)
      );
    });
  });

  it('should handle barcode lookup error', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
    
    (productService.getProductBySku as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(<BarcodeScanner {...mockProps} />);

    // Simulate barcode scan
    const scanner = getByTestId('barcode-scanner');
    fireEvent(scanner, 'onBarCodeScanned', { data: 'TEST001' });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Lookup Error',
        'Failed to find product. Try scanning again or search manually.',
        expect.any(Array)
      );
    });
  });

  it('should call onManualSearch when manual search button is pressed', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });

    const { getByText } = render(<BarcodeScanner {...mockProps} />);

    await waitFor(() => {
      const manualSearchButton = getByText('Manual Search');
      fireEvent.press(manualSearchButton);
      expect(mockProps.onClose).toHaveBeenCalled();
      expect(mockProps.onManualSearch).toHaveBeenCalled();
    });
  });

  it('should not be visible when visible prop is false', () => {
    const { queryByTestId } = render(
      <BarcodeScanner {...mockProps} visible={false} />
    );

    // Modal should not be rendered when visible is false
    expect(queryByTestId('barcode-scanner-modal')).toBeFalsy();
  });
});