import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { Sale, CartItem } from '../services/SimpleSalesService';

interface ReceiptGeneratorProps {
  sale: Sale;
  onClose: () => void;
  onPrint?: () => void;
  onEmail?: (email: string) => void;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  sale,
  onClose,
  onPrint,
  onEmail
}) => {
  const formatDateTime = (dateTime: Date): string => {
    return dateTime.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const generateReceiptText = (): string => {
    const divider = '================================';
    const smallDivider = '--------------------------------';
    
    let receipt = `
${divider}
         SALES RECEIPT
${divider}

Receipt #: ${sale.id}
Date: ${formatDateTime(sale.timestamp)}
Cashier: ${sale.cashier || 'System'}

${smallDivider}
           ITEMS
${smallDivider}
`;

    // Add each item
    sale.items.forEach((item: CartItem) => {
      const itemTotal = item.price * item.quantity;
      receipt += `${item.name}\n`;
      receipt += `  ${item.quantity} x $${item.price.toFixed(2)} = $${itemTotal.toFixed(2)}\n`;
      if (item.sku) {
        receipt += `  SKU: ${item.sku}\n`;
      }
      receipt += '\n';
    });

    // Add totals
    receipt += `${smallDivider}
Subtotal: $${sale.subtotal.toFixed(2)}`;

    if (sale.tax > 0) {
      receipt += `\nTax: $${sale.tax.toFixed(2)}`;
    }

    if (sale.discount > 0) {
      receipt += `\nDiscount: -$${sale.discount.toFixed(2)}`;
    }

    receipt += `\nTOTAL: $${sale.total.toFixed(2)}

${smallDivider}
           PAYMENT
${smallDivider}
Payment Method: ${sale.paymentMethod.toUpperCase()}`;

    if (sale.paymentMethod === 'cash') {
      receipt += `\nCash Received: $${sale.amountPaid.toFixed(2)}`;
      const change = sale.amountPaid - sale.total;
      if (change > 0) {
        receipt += `\nChange: $${change.toFixed(2)}`;
      }
    } else {
      receipt += `\nAmount Charged: $${sale.amountPaid.toFixed(2)}`;
    }

    receipt += `\n\n${divider}
     Thank you for your business!
         Please come again!
${divider}
`;

    return receipt;
  };

  const handleShare = async () => {
    try {
      const receiptText = generateReceiptText();
      await Share.share({
        message: receiptText,
        title: `Receipt #${sale.id}`
      });
    } catch (error) {
      Alert.alert('Share Error', 'Failed to share receipt');
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      Alert.alert('Print', 'Print functionality not implemented');
    }
  };

  const handleEmail = () => {
    if (onEmail) {
      Alert.prompt(
        'Email Receipt',
        'Enter email address:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send',
            onPress: (email) => {
              if (email && email.includes('@')) {
                onEmail(email);
              } else {
                Alert.alert('Invalid Email', 'Please enter a valid email address');
              }
            }
          }
        ],
        'plain-text'
      );
    } else {
      Alert.alert('Email', 'Email functionality not implemented');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipt</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.receiptContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.receipt}>
          {/* Store Header */}
          <View style={styles.storeHeader}>
            <Text style={styles.storeName}>SALES MVP</Text>
            <Text style={styles.storeInfo}>Point of Sale System</Text>
          </View>

          {/* Receipt Info */}
          <View style={styles.receiptInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Receipt #:</Text>
              <Text style={styles.infoValue}>{sale.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{formatDateTime(sale.timestamp)}</Text>
            </View>
            {sale.cashier && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Cashier:</Text>
                <Text style={styles.infoValue}>{sale.cashier}</Text>
              </View>
            )}
          </View>

          {/* Items */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>ITEMS</Text>
          <View style={styles.divider} />

          {sale.items.map((item: CartItem, index: number) => {
            const itemTotal = item.price * item.quantity;
            return (
              <View key={index} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTotal}>${itemTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>
                    {item.quantity} × ${item.price.toFixed(2)}
                  </Text>
                  {item.sku && (
                    <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Totals */}
          <View style={styles.divider} />
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>${sale.subtotal.toFixed(2)}</Text>
            </View>

            {sale.tax > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax:</Text>
                <Text style={styles.totalValue}>${sale.tax.toFixed(2)}</Text>
              </View>
            )}

            {sale.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount:</Text>
                <Text style={styles.totalValue}>-${sale.discount.toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>TOTAL:</Text>
              <Text style={styles.grandTotalValue}>${sale.total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>PAYMENT</Text>
          <View style={styles.divider} />

          <View style={styles.payment}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Method:</Text>
              <Text style={styles.paymentValue}>{sale.paymentMethod.toUpperCase()}</Text>
            </View>

            {sale.paymentMethod === 'cash' ? (
              <>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Cash Received:</Text>
                  <Text style={styles.paymentValue}>${sale.amountPaid.toFixed(2)}</Text>
                </View>
                {sale.amountPaid > sale.total && (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Change:</Text>
                    <Text style={styles.changeValue}>
                      ${(sale.amountPaid - sale.total).toFixed(2)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Amount Charged:</Text>
                <Text style={styles.paymentValue}>${sale.amountPaid.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Thank you for your business!</Text>
            <Text style={styles.footerText}>Please come again!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionButtonText}>📤 Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
          <Text style={styles.actionButtonText}>🖨️ Print</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleEmail}>
          <Text style={styles.actionButtonText}>📧 Email</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 5,
  },
  receiptContainer: {
    flex: 1,
    padding: 20,
  },
  receipt: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  storeInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  receiptInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  item: {
    marginBottom: 15,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemDetails: {
    marginTop: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemSku: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  totals: {
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  grandTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  payment: {
    marginTop: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  changeValue: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
});
