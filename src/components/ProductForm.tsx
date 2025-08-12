import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { Product, CreateProductInput } from '../types';
import { productService } from '../services/ProductService';

interface ProductFormProps {
  product?: Product; // If editing an existing product
  onSave: (product: Product) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ 
  product, 
  onSave, 
  onCancel 
}) => {
  const [sku, setSku] = useState(product?.sku || '');
  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [cost, setCost] = useState(product?.cost.toString() || '');
  const [stockQty, setStockQty] = useState(product?.stock_qty.toString() || '0');
  const [taxRate, setTaxRate] = useState((product?.tax_rate || 0).toString());
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const isEditing = !!product;

  // Auto-generate SKU for new products
  useEffect(() => {
    if (!isEditing && !sku && name) {
      generateSku();
    }
  }, [name, isEditing, sku]);

  const generateSku = async () => {
    if (!name) {
      return;
    }
    
    try {
      const firstLetter = name.charAt(0).toUpperCase();
      const nextSku = await productService.generateNextSku(firstLetter);
      setSku(nextSku);
    } catch (error) {
      // SKU generation failed, user can enter manually
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else if (!/^[A-Z0-9]+$/i.test(sku)) {
      newErrors.sku = 'SKU can only contain letters and numbers';
    }

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      newErrors.price = 'Valid price is required';
    }

    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum < 0) {
      newErrors.cost = 'Valid cost is required';
    }

    const stockNum = parseInt(stockQty);
    if (isNaN(stockNum) || stockNum < 0) {
      newErrors.stockQty = 'Valid stock quantity is required';
    }

    const taxNum = parseFloat(taxRate);
    if (isNaN(taxNum) || taxNum < 0 || taxNum > 1) {
      newErrors.taxRate = 'Tax rate must be between 0 and 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {return;}

    setLoading(true);
    try {
      let savedProduct: Product;

      if (isEditing) {
        // Update existing product
        savedProduct = await productService.updateProduct({
          id: product.id,
          sku: sku.trim(),
          name: name.trim(),
          price: parseFloat(price),
          cost: parseFloat(cost),
          stock_qty: parseInt(stockQty),
          tax_rate: parseFloat(taxRate)
        });
      } else {
        // Create new product
        savedProduct = await productService.createProduct({
          sku: sku.trim(),
          name: name.trim(),
          price: parseFloat(price),
          cost: parseFloat(cost),
          stock_qty: parseInt(stockQty),
          tax_rate: parseFloat(taxRate)
        });
      }

      onSave(savedProduct);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save product'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>
          {isEditing ? 'Edit Product' : 'Add New Product'}
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>SKU *</Text>
          <TextInput
            style={[styles.input, errors.sku ? styles.inputError : null]}
            value={sku}
            onChangeText={setSku}
            placeholder="e.g., F001, E001"
            autoCapitalize="characters"
            maxLength={20}
          />
          {errors.sku && <Text style={styles.errorText}>{errors.sku}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Product Name *</Text>
          <TextInput
            style={[styles.input, errors.name ? styles.inputError : null]}
            value={name}
            onChangeText={setName}
            placeholder="Enter product name"
            maxLength={100}
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
            <Text style={styles.label}>Cost * ($)</Text>
            <TextInput
              style={[styles.input, errors.cost ? styles.inputError : null]}
              value={cost}
              onChangeText={setCost}
              placeholder="0.00"
              keyboardType="numeric"
            />
            {errors.cost && <Text style={styles.errorText}>{errors.cost}</Text>}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Stock Quantity *</Text>
            <TextInput
              style={[styles.input, errors.stockQty ? styles.inputError : null]}
              value={stockQty}
              onChangeText={setStockQty}
              placeholder="0"
              keyboardType="numeric"
            />
            {errors.stockQty && <Text style={styles.errorText}>{errors.stockQty}</Text>}
          </View>

          <View style={[styles.formGroup, styles.halfWidth]}>
            <Text style={styles.label}>Tax Rate (0-1)</Text>
            <TextInput
              style={[styles.input, errors.taxRate ? styles.inputError : null]}
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="0.08"
              keyboardType="numeric"
            />
            {errors.taxRate && <Text style={styles.errorText}>{errors.taxRate}</Text>}
          </View>
        </View>

        {/* Profit Margin Display */}
        {price && cost && !isNaN(parseFloat(price)) && !isNaN(parseFloat(cost)) && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Profit Margin: ${(parseFloat(price) - parseFloat(cost)).toFixed(2)} 
              ({(((parseFloat(price) - parseFloat(cost)) / parseFloat(price)) * 100).toFixed(1)}%)
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.buttonDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: '#e8f5e8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
