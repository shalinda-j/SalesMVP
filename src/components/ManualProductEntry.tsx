import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Product } from '../types';

interface ManualProductEntryProps {
  visible: boolean;
  onClose: () => void;
  onAddProduct: (product: Product) => void;
}

export const ManualProductEntry: React.FC<ManualProductEntryProps> = ({
  visible,
  onClose,
  onAddProduct
}) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [taxRate, setTaxRate] = useState('0.08');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const resetForm = () => {
    setName('');
    setPrice('');
    setQuantity('1');
    setTaxRate('0.08');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Valid price is required';
    }

    const qtyNum = parseInt(quantity);
    if (!quantity || isNaN(qtyNum) || qtyNum <= 0) {
      newErrors.quantity = 'Valid quantity is required';
    }

    const taxNum = parseFloat(taxRate);
    if (isNaN(taxNum) || taxNum < 0 || taxNum > 1) {
      newErrors.taxRate = 'Tax rate must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdd = () => {
    if (!validateForm()) return;

    // Create a temporary product object for the cart
    // This won't be saved to the database, just used for the current transaction
    const temporaryProduct: Product = {
      id: Date.now(), // Temporary ID
      sku: `MANUAL_${Date.now()}`,
      name: name.trim(),
      price: parseFloat(price),
      cost: parseFloat(price) * 0.7, // Assume 30% profit margin
      stock_qty: parseInt(quantity),
      tax_rate: parseFloat(taxRate)
    };

    onAddProduct(temporaryProduct);
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manual Entry</Text>
          <TouchableOpacity onPress={handleAdd}>
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Add a custom product to this sale only
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Product Name *</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Custom Service, Misc Item"
              maxLength={100}
              autoFocus
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Price * ($)</Text>
              <TextInput
                style={[styles.input, errors.price ? styles.inputError : null]}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="numeric"
              />
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>

            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={[styles.input, errors.quantity ? styles.inputError : null]}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="1"
                keyboardType="numeric"
              />
              {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tax Rate (0-1)</Text>
            <TextInput
              style={[styles.input, errors.taxRate ? styles.inputError : null]}
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="0.08"
              keyboardType="numeric"
            />
            {errors.taxRate && <Text style={styles.errorText}>{errors.taxRate}</Text>}
            <Text style={styles.helpText}>
              Enter as decimal (e.g., 0.08 for 8%, 0 for no tax)
            </Text>
          </View>

          {/* Preview */}
          {name && price && !errors.price && (
            <View style={styles.previewBox}>
              <Text style={styles.previewTitle}>Preview:</Text>
              <Text style={styles.previewText}>
                {name} - ${parseFloat(price || '0').toFixed(2)}
                {parseFloat(taxRate || '0') > 0 && (
                  <Text> (+ {(parseFloat(taxRate || '0') * 100).toFixed(1)}% tax)</Text>
                )}
              </Text>
              <Text style={styles.previewText}>
                Quantity: {quantity}
              </Text>
              <Text style={styles.previewTotal}>
                Total: ${(
                  parseFloat(price || '0') * 
                  parseInt(quantity || '1') * 
                  (1 + parseFloat(taxRate || '0'))
                ).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Manual entries are for this sale only and won't be saved to your product catalog.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cancelText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addText: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 5,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  previewBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  previewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  previewTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: '#e8f4f8',
    padding: 15,
    borderRadius: 8,
    marginTop: 'auto',
  },
  infoText: {
    fontSize: 14,
    color: '#2980b9',
    textAlign: 'center',
  },
});
