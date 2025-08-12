import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

interface BarcodeScannerProps {
  visible: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onScan,
  onClose,
}) => {
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const handleManualEntry = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode('');
      setShowManualEntry(false);
    } else {
      Alert.alert('Error', 'Please enter a valid barcode');
    }
  };

  const handleDemoScan = () => {
    // Simulate a barcode scan with a demo barcode
    const demoBarcodes = ['123456789', '987654321', '456789123', '789123456'];
    const randomBarcode = demoBarcodes[Math.floor(Math.random() * demoBarcodes.length)];
    onScan(randomBarcode);
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Barcode Scanner</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.cameraPlaceholder}>
            <Ionicons name="scan" size={80} color={theme.colors.primary} />
            <Text style={styles.placeholderText}>
              Camera Scanner Unavailable
            </Text>
            <Text style={styles.placeholderSubtext}>
              Please use manual entry or demo scan
            </Text>
          </View>

          <View style={styles.actions}>
                         <TouchableOpacity
               style={styles.actionButton}
               onPress={() => setShowManualEntry(true)}
             >
               <Ionicons name="create" size={24} color={theme.colors.surface} />
               <Text style={styles.actionButtonText}>Manual Entry</Text>
             </TouchableOpacity>

             <TouchableOpacity
               style={[styles.actionButton, styles.demoButton]}
               onPress={handleDemoScan}
             >
               <Ionicons name="play" size={24} color={theme.colors.surface} />
               <Text style={styles.actionButtonText}>Demo Scan</Text>
             </TouchableOpacity>
          </View>
        </View>

        {/* Manual Entry Modal */}
        <Modal
          visible={showManualEntry}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowManualEntry(false)}
        >
          <View style={styles.manualEntryContainer}>
            <View style={styles.manualEntryHeader}>
              <Text style={styles.manualEntryTitle}>Manual Barcode Entry</Text>
              <TouchableOpacity
                onPress={() => setShowManualEntry(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.manualEntryContent}>
              <Text style={styles.inputLabel}>Enter Barcode:</Text>
              <TextInput
                style={styles.barcodeInput}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                placeholder="e.g., 123456789"
                keyboardType="numeric"
                autoFocus
                maxLength={20}
              />

              <View style={styles.manualEntryActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => {
                    setShowManualEntry(false);
                    setManualBarcode('');
                  }}
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleManualEntry}
                >
                  <Text style={styles.actionButtonText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraPlaceholder: {
    alignItems: 'center',
    marginBottom: 40,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  demoButton: {
    backgroundColor: theme.colors.secondary,
  },
  cancelButton: {
    backgroundColor: theme.colors.error,
  },
     actionButtonText: {
     color: theme.colors.surface,
     fontSize: 16,
     fontWeight: '600',
   },
  manualEntryContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  manualEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  manualEntryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  manualEntryContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  barcodeInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    marginBottom: 32,
  },
  manualEntryActions: {
    flexDirection: 'row',
    gap: 16,
  },
});
