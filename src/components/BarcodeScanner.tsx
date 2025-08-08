import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Product } from '../types';
import { productService } from '../services/ProductService';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
  onBarcodeScanned?: (barcode: string) => void;
  onManualSearch?: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onClose,
  onProductFound,
  onBarcodeScanned,
  onManualSearch,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent rapid scanning
  const lastScanRef = useRef<number>(0);
  const SCAN_COOLDOWN = 2000; // 2 seconds between scans

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access to scan barcodes',
          [
            { text: 'Cancel', onPress: onClose },
            { text: 'Settings', onPress: () => {
              // On web, we can't open settings, so just show instructions
              Alert.alert(
                'Enable Camera',
                'Please enable camera access in your browser settings and refresh the page.'
              );
            }}
          ]
        );
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      setHasPermission(false);
      setError('Failed to request camera permission');
    }
  };

  const handleBarcodeScanned = async (result: BarCodeScannerResult) => {
    const now = Date.now();
    
    // Prevent rapid scanning
    if (now - lastScanRef.current < SCAN_COOLDOWN) {
      return;
    }
    
    lastScanRef.current = now;
    setIsScanning(false);
    setLoading(true);
    setError(null);

    const barcode = result.data;
    console.log('Barcode scanned:', barcode);

    try {
      // First, notify parent of barcode if callback provided
      onBarcodeScanned?.(barcode);

      // Try to find product by SKU (assuming barcode = SKU for now)
      const product = await productService.getProductBySku(barcode);
      
      if (product) {
        onProductFound(product);
        onClose();
      } else {
        // Product not found - show options
        Alert.alert(
          'Product Not Found',
          `No product found with barcode: ${barcode}`,
          [
            { 
              text: 'Scan Again', 
              onPress: () => {
                setIsScanning(true);
                setLoading(false);
              }
            },
            { 
              text: 'Search Manually', 
              onPress: () => {
                onClose();
                onManualSearch?.();
              }
            },
            { text: 'Cancel', onPress: onClose }
          ]
        );
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
      setError('Failed to lookup product');
      Alert.alert(
        'Lookup Error',
        'Failed to find product. Try scanning again or search manually.',
        [
          { 
            text: 'Scan Again', 
            onPress: () => {
              setIsScanning(true);
              setLoading(false);
              setError(null);
            }
          },
          { text: 'Cancel', onPress: onClose }
        ]
      );
    }
  };

  const renderPermissionRequest = () => (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionText}>
        Camera permission is required to scan barcodes
      </Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={requestCameraPermission}
      >
        <Text style={styles.permissionButtonText}>Request Permission</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onClose}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Camera Error</Text>
      <Text style={styles.errorSubtext}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setError(null);
          requestCameraPermission();
        }}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={onClose}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <BarCodeScanner
        onBarCodeScanned={isScanning ? handleBarcodeScanned : undefined}
        style={styles.scanner}
        barCodeTypes={[
          BarCodeScanner.Constants.BarCodeType.ean13,
          BarCodeScanner.Constants.BarCodeType.ean8,
          BarCodeScanner.Constants.BarCodeType.upc_a,
          BarCodeScanner.Constants.BarCodeType.upc_e,
          BarCodeScanner.Constants.BarCodeType.code128,
          BarCodeScanner.Constants.BarCodeType.code39,
          BarCodeScanner.Constants.BarCodeType.qr,
        ]}
      />
      
      {/* Scanning overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlayLeft} />
          <View style={styles.scanningArea}>
            <View style={styles.scanningFrame} />
            <Text style={styles.scanInstructions}>
              Position barcode within the frame
            </Text>
          </View>
          <View style={styles.overlayRight} />
        </View>
        <View style={styles.overlayBottom} />
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Looking up product...</Text>
        </View>
      )}

      {/* Control buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            onClose();
            onManualSearch?.();
          }}
        >
          <Text style={styles.controlButtonText}>Manual Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.cancelControlButton}
          onPress={onClose}
        >
          <Text style={styles.cancelControlButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (hasPermission === null) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      );
    }

    if (hasPermission === false) {
      return renderPermissionRequest();
    }

    if (error) {
      return renderError();
    }

    return renderScanner();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {renderContent()}
      </View>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerContainer: {
    flex: 1,
  },
  scanner: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlayLeft: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayRight: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanningArea: {
    width: width * 0.7,
    height: width * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningFrame: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#27ae60',
    borderRadius: 10,
  },
  scanInstructions: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelControlButton: {
    backgroundColor: 'rgba(231,76,60,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelControlButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#95a5a6',
  },
  cancelButtonText: {
    color: '#95a5a6',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
