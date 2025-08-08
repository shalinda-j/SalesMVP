import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Alert, TouchableOpacity, Vibration, Animated } from 'react-native';
import { Text, View } from '@/components/Themed';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera';
import { CameraState, ScanResult } from '@/src/types';

export default function POSScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraState, setCameraState] = useState<CameraState>({
    hasPermission: null,
    isScanning: true,
    error: null,
  });
  const [facing, setFacing] = useState<CameraType>('back');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  
  // Animation refs for scan feedback
  const scanFrameAnimation = useRef(new Animated.Value(1)).current;
  const scanSuccessAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCameraState(prev => ({
      ...prev,
      hasPermission: permission?.granted || false,
    }));
  }, [permission]);

  // Enhanced barcode scanning with error handling and feedback
  const handleBarcodeScanned = async (scanningResult: BarcodeScanningResult) => {
    if (!cameraState.isScanning || isProcessingScan) return;
    
    const { type, data } = scanningResult;
    
    // Prevent duplicate scans of the same code within 2 seconds
    if (lastScannedCode === data && Date.now() - scanCount < 2000) {
      return;
    }
    
    setIsProcessingScan(true);
    setCameraState(prev => ({ ...prev, isScanning: false }));
    
    try {
      // Validate barcode data
      const scanResult = await processBarcodeData(type, data);
      
      if (scanResult.success) {
        // Successful scan feedback
        await provideScanFeedback(true);
        setLastScannedCode(data);
        setScanCount(Date.now());
        setRetryCount(0);
        
        // Show success alert with barcode information
        Alert.alert(
          'Barcode Scanned Successfully',
          `Type: ${type}\nData: ${data}\nScans: ${scanCount + 1}`,
          [
            {
              text: 'Add to Cart',
              onPress: () => {
                // Placeholder for adding product to cart
                console.log('Adding product to cart:', data);
                resumeScanning();
              },
            },
            {
              text: 'Scan Again',
              onPress: resumeScanning,
            },
          ]
        );
      } else {
        // Failed scan feedback
        await provideScanFeedback(false);
        handleScanError(scanResult.error || 'Unknown scanning error');
      }
    } catch (error) {
      await provideScanFeedback(false);
      handleScanError(error instanceof Error ? error.message : 'Scanning failed');
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Process and validate barcode data
  const processBarcodeData = async (type: string, data: string): Promise<ScanResult> => {
    return new Promise((resolve) => {
      // Simulate processing delay
      setTimeout(() => {
        // Basic validation
        if (!data || data.trim().length === 0) {
          resolve({ success: false, error: 'Empty barcode data' });
          return;
        }
        
        if (data.length < 3) {
          resolve({ success: false, error: 'Barcode too short' });
          return;
        }
        
        // Check for supported barcode types
        const supportedTypes = ['qr', 'pdf417', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'];
        if (!supportedTypes.includes(type.toLowerCase())) {
          resolve({ success: false, error: `Unsupported barcode type: ${type}` });
          return;
        }
        
        // Simulate random processing failures for testing retry mechanism
        if (Math.random() < 0.1) { // 10% failure rate
          resolve({ success: false, error: 'Processing failed, please try again' });
          return;
        }
        
        resolve({ success: true, barcode: data });
      }, 500); // Simulate processing time
    });
  };

  // Handle scanning errors with retry mechanism
  const handleScanError = (error: string) => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    if (newRetryCount >= 3) {
      // Max retries reached
      Alert.alert(
        'Scanning Error',
        `${error}\n\nMax retries reached. Please check the barcode and try again.`,
        [
          {
            text: 'Reset and Try Again',
            onPress: () => {
              setRetryCount(0);
              setLastScannedCode(null);
              resumeScanning();
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setCameraState(prev => ({ ...prev, error: 'Scanning cancelled' })),
          },
        ]
      );
    } else {
      // Show retry option
      Alert.alert(
        'Scanning Error',
        `${error}\n\nRetry ${newRetryCount}/3`,
        [
          {
            text: 'Retry',
            onPress: resumeScanning,
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setCameraState(prev => ({ ...prev, error: 'Scanning cancelled' })),
          },
        ]
      );
    }
  };

  // Provide visual and haptic feedback for scan results
  const provideScanFeedback = async (success: boolean) => {
    try {
      if (success) {
        // Success feedback: green flash animation + vibration
        Vibration.vibrate(100);
        
        // Animate scan frame to green and back
        Animated.sequence([
          Animated.timing(scanSuccessAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(scanSuccessAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
        ]).start();
        
        // Optional: Play success sound (commented out to avoid audio permission issues)
        // try {
        //   const { sound } = await Audio.Sound.createAsync(
        //     require('@/assets/sounds/scan-success.mp3')
        //   );
        //   await sound.playAsync();
        // } catch (audioError) {
        //   console.log('Audio playback failed:', audioError);
        // }
      } else {
        // Error feedback: red flash + double vibration
        Vibration.vibrate([100, 100, 100]);
        
        // Animate scan frame to red and back
        Animated.sequence([
          Animated.timing(scanFrameAnimation, {
            toValue: 0.8,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(scanFrameAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start();
      }
    } catch (error) {
      console.log('Feedback error:', error);
    }
  };

  // Resume scanning after processing
  const resumeScanning = () => {
    setCameraState(prev => ({ 
      ...prev, 
      isScanning: true, 
      error: null 
    }));
    setIsProcessingScan(false);
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };



  if (cameraState.hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Point of Sale</Text>
        <Text style={styles.subtitle}>Requesting camera permissions...</Text>
      </View>
    );
  }

  if (cameraState.hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Point of Sale</Text>
        <Text style={styles.errorText}>Camera access is required for barcode scanning</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cameraState.error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Point of Sale</Text>
        <Text style={styles.errorText}>Camera Error: {cameraState.error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => setCameraState(prev => ({ ...prev, error: null }))}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Point of Sale</Text>
        <Text style={styles.subtitle}>
          {cameraState.isScanning ? 'Scan a barcode to add product' : 'Tap "Scan Again" to continue'}
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing={facing}
          onBarcodeScanned={cameraState.isScanning ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'pdf417', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
          }}
        >
          <View style={styles.cameraOverlay}>
            <Animated.View 
              style={[
                styles.scanFrame,
                {
                  borderColor: scanSuccessAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#00ff00', '#00ff00'],
                  }),
                  backgroundColor: scanSuccessAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['transparent', 'rgba(0, 255, 0, 0.2)'],
                  }),
                  transform: [{
                    scale: scanFrameAnimation,
                  }],
                },
              ]}
            />
            <Text style={styles.scanInstructions}>
              {isProcessingScan 
                ? 'Processing barcode...' 
                : cameraState.isScanning 
                  ? 'Position barcode within the frame'
                  : 'Tap "Resume Scanning" to continue'
              }
            </Text>
            {retryCount > 0 && (
              <Text style={styles.retryIndicator}>
                Retry {retryCount}/3
              </Text>
            )}
            {scanCount > 0 && (
              <Text style={styles.scanCounter}>
                Scans: {scanCount}
              </Text>
            )}
          </View>
        </CameraView>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, { opacity: isProcessingScan ? 0.5 : 1 }]} 
          onPress={toggleCameraFacing}
          disabled={isProcessingScan}
        >
          <Text style={styles.controlButtonText}>Flip Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            styles.scanButton,
            { opacity: isProcessingScan ? 0.5 : 1 }
          ]} 
          onPress={() => {
            if (isProcessingScan) return;
            setCameraState(prev => ({ ...prev, isScanning: !prev.isScanning }));
          }}
          disabled={isProcessingScan}
        >
          <Text style={styles.controlButtonText}>
            {isProcessingScan 
              ? 'Processing...' 
              : cameraState.isScanning 
                ? 'Pause Scanning' 
                : 'Resume Scanning'
            }
          </Text>
        </TouchableOpacity>
        
        {(retryCount > 0 || scanCount > 0) && (
          <TouchableOpacity 
            style={[styles.controlButton, styles.resetButton]} 
            onPress={() => {
              setRetryCount(0);
              setScanCount(0);
              setLastScannedCode(null);
              resumeScanning();
            }}
          >
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Shopping cart and checkout functionality will be added in future tasks
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: '#fff',
  },
  controlButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  scanButton: {
    backgroundColor: '#34C759',
  },
  resetButton: {
    backgroundColor: '#FF9500',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryIndicator: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    padding: 8,
    borderRadius: 6,
  },
  scanCounter: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    padding: 6,
    borderRadius: 6,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
