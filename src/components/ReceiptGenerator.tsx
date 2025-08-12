import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { businessConfigService } from '../services/BusinessConfigService';

interface ReceiptItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tax: number;
}

interface ReceiptData {
  saleId: number;
  timestamp: string;
  items: ReceiptItem[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  paymentMethod: string;
  paymentAmount: number;
  change: number;
}

interface ReceiptGeneratorProps {
  sale: any; // SaleResult from SalesService
  onClose: () => void;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  sale,
  onClose,
}) => {
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    initializeReceipt();
  }, [sale]);

  const initializeReceipt = async () => {
    try {
      setLoading(true);
      
      // Load business info
      const business = await businessConfigService.getBusinessInfo();
      setBusinessInfo(business);

      // Extract receipt data from sale
      if (sale && sale.receiptData) {
        setReceiptData(sale.receiptData);
      } else {
        // Fallback: create receipt data from sale
        const items: ReceiptItem[] = sale.saleItems?.map((item: any) => ({
          name: item.product?.name || 'Unknown Product',
          sku: item.product?.sku || 'N/A',
          quantity: item.qty,
          unitPrice: item.unit_price,
          total: item.qty * item.unit_price,
          tax: (item.qty * item.unit_price) * 0.08, // Default tax rate
        })) || [];

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const totalTax = items.reduce((sum, item) => sum + item.tax, 0);
        const grandTotal = sale.sale?.total || subtotal + totalTax;
        const paymentAmount = sale.payments?.[0]?.amount || grandTotal;
        const change = Math.max(0, paymentAmount - grandTotal);

        setReceiptData({
          saleId: sale.sale?.id || 0,
          timestamp: sale.sale?.timestamp || new Date().toISOString(),
          items,
          subtotal,
          totalTax,
          grandTotal,
          paymentMethod: sale.payments?.[0]?.method || 'cash',
          paymentAmount,
          change
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!receiptData) {
      return;
    }

    try {
      const receiptText = generateReceiptText();
      await Share.share({
        message: receiptText,
        title: 'Receipt'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const generateReceiptText = (): string => {
    if (!receiptData || !businessInfo) {
      return '';
    }

    let text = `${businessInfo.businessName || 'Your Business'}\n`;
    text += `${businessInfo.businessAddress || 'Business Address'}\n`;
    text += `Phone: ${businessInfo.businessPhone || 'N/A'}\n`;
    text += `Email: ${businessInfo.businessEmail || 'N/A'}\n`;
    text += `\nReceipt #${receiptData.saleId}\n`;
    text += `Date: ${new Date(receiptData.timestamp).toLocaleString()}\n`;
    text += `\nItems:\n`;
    text += `--------------------------------\n`;
    
    receiptData.items.forEach(item => {
      text += `${item.name}\n`;
      text += `  ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.total.toFixed(2)}\n`;
    });
    
    text += `\n--------------------------------\n`;
    text += `Subtotal: $${receiptData.subtotal.toFixed(2)}\n`;
    text += `Tax: $${receiptData.totalTax.toFixed(2)}\n`;
    text += `Total: $${receiptData.grandTotal.toFixed(2)}\n`;
    text += `Payment Method: ${receiptData.paymentMethod.toUpperCase()}\n`;
    text += `Amount Paid: $${receiptData.paymentAmount.toFixed(2)}\n`;
    if (receiptData.change > 0) {
      text += `Change: $${receiptData.change.toFixed(2)}\n`;
    }
    text += `\nThank you for choosing our products!\n`;
    text += `We appreciate your business.\n`;
    text += `Please visit us again!\n`;
    
    return text;
  };

  if (loading) {
    return (
      <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Generating Receipt...</Text>
        </View>
      </Modal>
    );
  }

  if (!receiptData || !businessInfo) {
    return (
      <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={styles.errorText}>Failed to generate receipt</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receipt</Text>
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Receipt Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Business Information */}
          <View style={styles.businessSection}>
            <Text style={styles.businessName}>{businessInfo.businessName || 'Your Business'}</Text>
            <Text style={styles.businessAddress}>{businessInfo.businessAddress || 'Business Address'}</Text>
            <Text style={styles.businessContact}>
              Phone: {businessInfo.businessPhone || 'N/A'} | Email: {businessInfo.businessEmail || 'N/A'}
            </Text>
          </View>

          {/* Receipt Details */}
          <View style={styles.receiptDetails}>
            <Text style={styles.receiptNumber}>Receipt #{receiptData.saleId}</Text>
            <Text style={styles.receiptDate}>
              {new Date(receiptData.timestamp).toLocaleString()}
            </Text>
          </View>

          {/* Items Table */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.headerItem}>Item</Text>
              <Text style={styles.headerQty}>Qty</Text>
              <Text style={styles.headerPrice}>Price</Text>
              <Text style={styles.headerTotal}>Total</Text>
            </View>
            
            {receiptData.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                </View>
                <Text style={styles.itemQty}>{item.quantity}</Text>
                <Text style={styles.itemPrice}>${item.unitPrice.toFixed(2)}</Text>
                <Text style={styles.itemTotal}>${item.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>${receiptData.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>${receiptData.totalTax.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.grandTotalLabel}>Total:</Text>
              <Text style={styles.grandTotalValue}>${receiptData.grandTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Payment Method:</Text>
              <Text style={styles.totalValue}>{receiptData.paymentMethod.toUpperCase()}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Amount Paid:</Text>
              <Text style={styles.totalValue}>${receiptData.paymentAmount.toFixed(2)}</Text>
            </View>
            {receiptData.change > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Change:</Text>
                <Text style={styles.totalValue}>${receiptData.change.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Thank You Message */}
          <View style={styles.thankYouSection}>
            <Text style={styles.thankYouTitle}>Thank you for choosing our products!</Text>
            <Text style={styles.thankYouMessage}>
              We appreciate your business and hope you had a great shopping experience.
            </Text>
            <Text style={styles.thankYouMessage}>
              Please visit us again soon!
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  businessSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  businessContact: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  receiptDetails: {
    alignItems: 'center',
    marginBottom: 24,
  },
  receiptNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  itemsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
  },
  headerItem: {
    flex: 2,
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
  headerQty: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  headerPrice: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  headerTotal: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  itemInfo: {
    flex: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  itemSku: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  itemQty: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
  },
  itemPrice: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'right',
  },
  itemTotal: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'right',
  },
  totalsSection: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  totalValue: {
    fontSize: 14,
    color: theme.colors.text,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  thankYouSection: {
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  thankYouTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  thankYouMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
