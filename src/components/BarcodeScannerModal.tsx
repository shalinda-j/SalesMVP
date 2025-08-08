import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { theme } from '../styles/theme';
import { Button } from './ui/Button';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (data: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onBarcodeScanned,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      if (!permission?.granted) {
        requestPermission();
      }
    }
  }, [visible, permission]);

  const handleBarcodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (!isScanning) return;
    setIsScanning(false);
    onBarcodeScanned(scanningResult.data);
  };

  if (!permission && visible) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <Text style={styles.text}>Requesting for camera permission</Text>
          <Button title="Close" onPress={onClose} />
        </View>
      </Modal>
    );
  }

  if (!permission?.granted && visible) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.container}>
          <Text style={styles.text}>No access to camera</Text>
          <Button title="Allow Camera" onPress={requestPermission} />
          <Button title="Close" onPress={onClose} variant="secondary" />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417", "ean13", "ean8", "code128", "code39", "upc_a", "upc_e"],
          }}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructions}>Position barcode within the frame</Text>
          <Button title="Cancel" onPress={onClose} style={styles.cancelButton} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.lg,
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 50,
  },
});
