import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { CartItem } from '../types';

interface PaymentProcessorProps {
  visible: boolean;
  cart: CartItem[];
  total: number;
  tax: number;
  onClose: () => void;
  onPaymentComplete: (paymentMethod: 'cash' | 'card' | 'digital', amount: number) => void;
}

export const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  visible,
  cart,
  total,
  tax,
  onClose,
  onPaymentComplete
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const subtotal = total - tax;
  const change = paymentMethod === 'cash' ? Math.max(0, parseFloat(cashReceived || '0') - total) : 0;
  const isValidPayment = paymentMethod !== 'cash' || parseFloat(cashReceived || '0') >= total;

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setPaymentMethod('cash');
      setCashReceived(total.toFixed(2)); // Default to exact amount
      setProcessing(false);
    }
  }, [visible, total]);

  const handlePayment = async () => {
    if (!isValidPayment) {
      Alert.alert('Invalid Payment', 'Payment amount must be at least the total amount.');
      return;
    }

    setProcessing(true);
    
    try {
      const paymentAmount = paymentMethod === 'cash' 
        ? parseFloat(cashReceived) 
        : total;

      // Simulate processing delay for card payments
      if (paymentMethod === 'card') {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      onPaymentComplete(paymentMethod, paymentAmount);
    } catch (error) {
      Alert.alert('Payment Error', 'Payment processing failed. Please try again.');
      setProcessing(false);
    }
  };

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount.toFixed(2));
  };

  const quickCashAmounts = [
    total, // Exact change
    Math.ceil(total), // Round up to nearest dollar
    Math.ceil(total / 5) * 5, // Round up to nearest $5
    Math.ceil(total / 10) * 10, // Round up to nearest $10
    Math.ceil(total / 20) * 20, // Round up to nearest $20
  ].filter((amount, index, arr) => arr.indexOf(amount) === index && amount > 0); // Remove duplicates

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={processing}>
            <Text style={[styles.cancelText, processing && styles.disabledText]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.content}>
          {/* Order Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items ({cart.length}):</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
            {tax > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax:</Text>
                <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.paymentMethodSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.methodButtons}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  paymentMethod === 'cash' && styles.methodButtonActive
                ]}
                onPress={() => setPaymentMethod('cash')}
                disabled={processing}
              >
                <Text style={[
                  styles.methodButtonText,
                  paymentMethod === 'cash' && styles.methodButtonTextActive
                ]}>💵 Cash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  paymentMethod === 'card' && styles.methodButtonActive
                ]}
                onPress={() => setPaymentMethod('card')}
                disabled={processing}
              >
                <Text style={[
                  styles.methodButtonText,
                  paymentMethod === 'card' && styles.methodButtonTextActive
                ]}>💳 Card</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  paymentMethod === 'digital' && styles.methodButtonActive
                ]}
                onPress={() => setPaymentMethod('digital')}
                disabled={processing}
              >
                <Text style={[
                  styles.methodButtonText,
                  paymentMethod === 'digital' && styles.methodButtonTextActive
                ]}>📱 Digital</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cash Payment Details */}
          {paymentMethod === 'cash' && (
            <View style={styles.cashSection}>
              <Text style={styles.sectionTitle}>Cash Received</Text>
              
              {/* Quick Amount Buttons */}
              <View style={styles.quickAmountsContainer}>
                {quickCashAmounts.slice(0, 4).map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => handleQuickCash(amount)}
                    disabled={processing}
                  >
                    <Text style={styles.quickAmountText}>${amount.toFixed(0)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[
                  styles.cashInput,
                  !isValidPayment && styles.inputError
                ]}
                value={cashReceived}
                onChangeText={setCashReceived}
                placeholder="0.00"
                keyboardType="numeric"
                editable={!processing}
              />
              
              {!isValidPayment && (
                <Text style={styles.errorText}>
                  Insufficient amount. Minimum: ${total.toFixed(2)}
                </Text>
              )}

              {/* Change Display */}
              {isValidPayment && change > 0 && (
                <View style={styles.changeContainer}>
                  <Text style={styles.changeLabel}>Change:</Text>
                  <Text style={styles.changeValue}>${change.toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Card/Digital Payment Info */}
          {(paymentMethod === 'card' || paymentMethod === 'digital') && (
            <View style={styles.cardSection}>
              <Text style={styles.cardInfo}>
                {paymentMethod === 'card' 
                  ? '💳 Present or insert card when ready'
                  : '📱 Customer will pay via digital wallet'
                }
              </Text>
              <Text style={styles.cardAmount}>Amount: ${total.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Process Payment Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.processButton,
              !isValidPayment && styles.buttonDisabled,
              processing && styles.buttonProcessing
            ]}
            onPress={handlePayment}
            disabled={!isValidPayment || processing}
          >
            <Text style={styles.processButtonText}>
              {processing 
                ? (paymentMethod === 'card' ? 'Processing Card...' : 'Processing...')
                : `Process ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)} Payment`
              }
            </Text>
          </TouchableOpacity>
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
  disabledText: {
    opacity: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  spacer: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summarySection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalRow: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    marginTop: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#666',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  paymentMethodSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  methodButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  methodButtonActive: {
    borderColor: '#27ae60',
    backgroundColor: '#e8f5e8',
  },
  methodButtonText: {
    fontSize: 16,
    color: '#666',
  },
  methodButtonTextActive: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  cashSection: {
    marginBottom: 20,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  cashInput: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#d4edda',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  changeLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
  },
  changeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#155724',
  },
  cardSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  cardInfo: {
    fontSize: 16,
    color: '#495057',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  processButton: {
    backgroundColor: '#27ae60',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonProcessing: {
    backgroundColor: '#3498db',
  },
  processButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
