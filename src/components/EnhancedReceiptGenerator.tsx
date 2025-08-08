import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Sale } from '../services/SimpleSalesService';
import { documentService } from '../services/DocumentService';
import { businessConfigService } from '../services/BusinessConfigService';
import { Receipt, DocumentGenerationOptions, BusinessInfo } from '../types/documents';

interface EnhancedReceiptGeneratorProps {
  sale: Sale;
  onClose: () => void;
  onPrint?: () => void;
  onEmail?: (email: string) => void;
}

export const EnhancedReceiptGenerator: React.FC<EnhancedReceiptGeneratorProps> = ({
  sale,
  onClose,
  onPrint,
  onEmail
}) => {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptHTML, setReceiptHTML] = useState<string>('');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptFormat, setReceiptFormat] = useState<'standard' | 'thermal' | 'email'>('standard');
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    initializeReceipt();
  }, [sale]);

  useEffect(() => {
    if (receipt) {
      regenerateReceipt();
    }
  }, [receiptFormat, receipt]);

  const initializeReceipt = async () => {
    try {
      setLoading(true);
      
      // Load business info
      const business = await businessConfigService.getBusinessInfo();
      setBusinessInfo(business);

      // Generate receipt using DocumentService
      const options: DocumentGenerationOptions = {
        format: receiptFormat,
      };

      const result = await documentService.generateReceipt(sale, options);
      
      if (result.success) {
        const generatedReceipt = await documentService.getReceipt(result.documentId);
        if (generatedReceipt) {
          setReceipt(generatedReceipt);
          setReceiptHTML(result.documentUrl || '');
          console.log('✅ Enhanced Receipt Generated:', generatedReceipt.documentNumber);
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to generate receipt');
      }
    } catch (error) {
      console.error('Failed to initialize receipt:', error);
      Alert.alert('Error', 'Failed to generate receipt');
    } finally {
      setLoading(false);
    }
  };

  const regenerateReceipt = async () => {
    if (!receipt) return;

    try {
      const options: DocumentGenerationOptions = {
        format: receiptFormat,
      };

      const result = await documentService.generateReceipt(sale, options);
      
      if (result.success) {
        setReceiptHTML(result.documentUrl || '');
      }
    } catch (error) {
      console.error('Failed to regenerate receipt:', error);
    }
  };

  const handleShare = async () => {
    try {
      if (!receipt) return;

      const receiptText = generatePlainTextReceipt();
      await Share.share({
        message: receiptText,
        title: `Receipt ${receipt.documentNumber}`,
      });
    } catch (error) {
      Alert.alert('Share Error', 'Failed to share receipt');
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      Alert.alert('Print Receipt', 'Printing functionality would be implemented here');
    }
  };

  const handleEmail = () => {
    if (emailAddress && emailAddress.includes('@')) {
      sendEmail();
    } else {
      setShowEmailModal(true);
    }
  };

  const sendEmail = async () => {
    try {
      if (!receipt || !emailAddress) return;

      const options: DocumentGenerationOptions = {
        format: 'email',
        delivery: {
          email: {
            to: emailAddress,
            subject: `Receipt ${receipt.documentNumber} from ${businessInfo?.name || 'Sales MVP'}`,
            message: `Dear Customer,\n\nThank you for your purchase! Please find your receipt attached.\n\nBest regards,\n${businessInfo?.name || 'Sales MVP'}`,
          },
        },
      };

      const result = await documentService.generateReceipt(sale, options);
      
      if (result.success) {
        Alert.alert('Email Sent', `Receipt has been sent to ${emailAddress}`);
        if (onEmail) {
          onEmail(emailAddress);
        }
      } else {
        Alert.alert('Email Error', result.error || 'Failed to send receipt');
      }
    } catch (error) {
      Alert.alert('Email Error', 'Failed to send receipt email');
    } finally {
      setShowEmailModal(false);
    }
  };

  const generatePlainTextReceipt = (): string => {
    if (!receipt || !businessInfo) return '';

    const divider = '================================';
    const smallDivider = '--------------------------------';
    
    let text = `
${divider}
         ${businessInfo.name.toUpperCase()}
${divider}

Receipt #: ${receipt.documentNumber}
Date: ${receipt.createdAt.toLocaleString()}

${smallDivider}
           ITEMS
${smallDivider}
`;

    // Add items
    receipt.lineItems.forEach((item) => {
      text += `${item.description}\n`;
      text += `  ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.total.toFixed(2)}\n`;
      if (item.sku) {
        text += `  SKU: ${item.sku}\n`;
      }
      text += '\n';
    });

    // Add totals
    text += `${smallDivider}
Subtotal: $${receipt.subtotal.toFixed(2)}`;

    if (receipt.taxTotal > 0) {
      text += `\nTax: $${receipt.taxTotal.toFixed(2)}`;
    }

    if (receipt.discountTotal > 0) {
      text += `\nDiscount: -$${receipt.discountTotal.toFixed(2)}`;
    }

    text += `\nTOTAL: $${receipt.grandTotal.toFixed(2)}

${smallDivider}
           PAYMENT
${smallDivider}`;

    // Add payments
    receipt.payments.forEach((payment, index) => {
      text += `\nPayment ${index + 1}: ${payment.method.toUpperCase()}`;
      text += `\nAmount: $${payment.amount.toFixed(2)}`;
    });

    if (receipt.changeAmount > 0) {
      text += `\nChange: $${receipt.changeAmount.toFixed(2)}`;
    }

    text += `\n\n${divider}
     Thank you for your business!
         Please come again!
${divider}
`;

    return text;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#2c3e50" />
        <Text style={styles.loadingText}>Generating enhanced receipt...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Enhanced Receipt {receipt?.documentNumber}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Format Selector */}
      <View style={styles.formatSelector}>
        <Text style={styles.formatLabel}>Format:</Text>
        <View style={styles.formatButtons}>
          {['standard', 'thermal', 'email'].map((format) => (
            <TouchableOpacity
              key={format}
              style={[
                styles.formatButton,
                receiptFormat === format && styles.formatButtonActive,
              ]}
              onPress={() => setReceiptFormat(format as any)}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  receiptFormat === format && styles.formatButtonTextActive,
                ]}
              >
                {format.charAt(0).toUpperCase() + format.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Receipt Display */}
      <ScrollView style={styles.receiptContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.receipt, receiptFormat === 'thermal' && styles.thermalReceipt]}>
          {/* Business Header */}
          {businessInfo && (
            <View style={styles.businessHeader}>
              <Text style={styles.businessName}>{businessInfo.name}</Text>
              <Text style={styles.businessAddress}>
                {businessInfo.address.street}
              </Text>
              <Text style={styles.businessAddress}>
                {businessInfo.address.city}, {businessInfo.address.state} {businessInfo.address.zipCode}
              </Text>
              <Text style={styles.businessContact}>
                {businessInfo.contact.phone} | {businessInfo.contact.email}
              </Text>
              {businessInfo.contact.website && (
                <Text style={styles.businessContact}>{businessInfo.contact.website}</Text>
              )}
            </View>
          )}

          {/* Receipt Info */}
          {receipt && (
            <View style={styles.receiptInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Receipt #:</Text>
                <Text style={styles.infoValue}>{receipt.documentNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date:</Text>
                <Text style={styles.infoValue}>
                  {receipt.createdAt.toLocaleDateString()} {receipt.createdAt.toLocaleTimeString()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Sale ID:</Text>
                <Text style={styles.infoValue}>{receipt.saleId}</Text>
              </View>
            </View>
          )}

          {/* Items */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>ITEMS</Text>
          <View style={styles.divider} />

          {receipt?.lineItems.map((item, index) => (
            <View key={index} style={styles.item}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.description}</Text>
                <Text style={styles.itemTotal}>${item.total.toFixed(2)}</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemQuantity}>
                  {item.quantity} × ${item.unitPrice.toFixed(2)}
                </Text>
                {item.sku && (
                  <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                )}
              </View>
            </View>
          ))}

          {/* Totals */}
          {receipt && (
            <>
              <View style={styles.divider} />
              <View style={styles.totals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal:</Text>
                  <Text style={styles.totalValue}>${receipt.subtotal.toFixed(2)}</Text>
                </View>

                {receipt.taxTotal > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax:</Text>
                    <Text style={styles.totalValue}>${receipt.taxTotal.toFixed(2)}</Text>
                  </View>
                )}

                {receipt.discountTotal > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Discount:</Text>
                    <Text style={styles.totalValue}>-${receipt.discountTotal.toFixed(2)}</Text>
                  </View>
                )}

                <View style={[styles.totalRow, styles.grandTotal]}>
                  <Text style={styles.grandTotalLabel}>TOTAL:</Text>
                  <Text style={styles.grandTotalValue}>${receipt.grandTotal.toFixed(2)}</Text>
                </View>
              </View>

              {/* Payments */}
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>PAYMENT</Text>
              <View style={styles.divider} />

              <View style={styles.payment}>
                {receipt.payments.map((payment, index) => (
                  <View key={index} style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>
                      {payment.method.toUpperCase()}:
                    </Text>
                    <Text style={styles.paymentValue}>${payment.amount.toFixed(2)}</Text>
                  </View>
                ))}

                {receipt.changeAmount > 0 && (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Change:</Text>
                    <Text style={styles.changeValue}>${receipt.changeAmount.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </>
          )}

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

      {/* Email Modal */}
      <Modal visible={showEmailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.emailModal}>
            <Text style={styles.emailModalTitle}>Email Receipt</Text>
            
            <TextInput
              style={styles.emailInput}
              placeholder="Enter email address"
              value={emailAddress}
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.emailModalButtons}>
              <TouchableOpacity
                style={[styles.emailModalButton, styles.cancelButton]}
                onPress={() => setShowEmailModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.emailModalButton, styles.sendButton]}
                onPress={sendEmail}
                disabled={!emailAddress || !emailAddress.includes('@')}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
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
  formatSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 15,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  formatButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
  },
  formatButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  formatButtonText: {
    fontSize: 14,
    color: '#666',
  },
  formatButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
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
  thermalReceipt: {
    maxWidth: 280,
    alignSelf: 'center',
  },
  businessHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  businessName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 5,
  },
  businessAddress: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  businessContact: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 2,
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
    borderTopWidth: 2,
    borderTopColor: '#2c3e50',
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
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#495057',
    fontWeight: '600',
  },
  // Email Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    minWidth: 300,
    maxWidth: '90%',
  },
  emailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  emailModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emailModalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#27ae60',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
