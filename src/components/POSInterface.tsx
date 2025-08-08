import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  SafeAreaView,
  TextInput
} from 'react-native';
import { Product } from '../types';
import { productService } from '../services/ProductService';
import { salesService, CartItem, Sale } from '../services/SimpleSalesService';
import { PaymentProcessor } from './PaymentProcessor';
import { ReceiptGenerator } from './ReceiptGenerator';
import { EnhancedReceiptGenerator } from './EnhancedReceiptGenerator';
import { ManualProductEntry } from './ManualProductEntry';
import { BarcodeScanner } from './BarcodeScanner';
import { EnhancedProductSearch } from './EnhancedProductSearch';
import { seedDataService } from '../services/SeedDataService';
import { SyncStatusIndicator } from './SyncStatusIndicator';
import { syncService } from '../services/SyncService';

export const POSInterface: React.FC = () => {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [taxRate, setTaxRate] = useState(0.08); // 8% default tax rate
  const [showEnhancedReceipt, setShowEnhancedReceipt] = useState(false);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      // Check if we need to seed sample data
      const allProducts = await productService.getAllProducts();
      
      // If no products exist, seed sample data
      if (allProducts.length === 0) {
        await seedDataService.seedSampleProducts();
        const seededProducts = await productService.getAllProducts();
        setProducts(seededProducts);
      } else {
        setProducts(allProducts);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Add product to cart
  const addToCart = (product: Product, quantity: number = 1) => {
    const productIdStr = product.id.toString();
    const existingItem = cart.find(item => item.id === productIdStr);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === productIdStr
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      const cartItem: CartItem = {
        id: productIdStr,
        name: product.name,
        price: product.price,
        quantity,
        sku: product.sku
      };
      setCart([...cart, cartItem]);
    }
  };

  // Add manual product to cart (temporary, not saved to catalog)
  const addManualProductToCart = (productData: {
    name: string;
    price: number;
    quantity: number;
  }) => {
    const manualItem: CartItem = {
      id: `manual_${Date.now()}`, // Generate temporary ID
      name: productData.name,
      price: productData.price,
      quantity: productData.quantity,
      sku: undefined // Manual products don't have SKUs
    };
    setCart([...cart, manualItem]);
  };

  // Update cart item quantity
  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Clear entire cart
  const clearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear the entire cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setCart([])
        }
      ]
    );
  };

  // Process payment and complete sale
  const handlePaymentComplete = async (paymentMethod: 'cash' | 'card' | 'digital', amountPaid: number) => {
    try {
      const sale = await salesService.completeSale(
        cart,
        paymentMethod,
        amountPaid,
        subtotal,
        tax,
        0, // discount
        'System' // cashier
      );

      setCurrentSale(sale);
      setCart([]);
      setShowPayment(false);
      setShowReceipt(true);

      Alert.alert('Sale Complete', `Payment of $${amountPaid.toFixed(2)} processed successfully!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to process sale. Please try again.');
    }
  };

  // Handle receipt actions
  const handlePrintReceipt = () => {
    Alert.alert('Print Receipt', 'Print functionality would be implemented here');
  };

  const handleEmailReceipt = (email: string) => {
    Alert.alert('Email Receipt', `Receipt would be sent to ${email}`);
  };

  // Handle barcode scanner
  const handleBarcodeProductFound = (product: Product) => {
    addToCart(product);
    Alert.alert('Product Added', `${product.name} added to cart`);
  };

  const handleBarcodeScanned = (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    // This is handled automatically by the BarcodeScanner component
  };

  const handleManualSearchFromBarcode = () => {
    setShowBarcodeScanner(false);
    setShowProductSearch(true);
  };

  // Handle enhanced product search
  const handleProductSelect = (product: Product) => {
    addToCart(product);
  };

  // Render product item
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => addToCart(item)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productSku}>SKU: {item.sku}</Text>
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCart(item)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render cart item
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        {item.sku && <Text style={styles.cartItemSku}>SKU: {item.sku}</Text>}
        <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
      </View>
      
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
        >
          <Text style={styles.quantityButtonText}>-</Text>
        </TouchableOpacity>
        
        <Text style={styles.quantityText}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.cartItemTotal}>
        <Text style={styles.cartItemTotalText}>
          ${(item.price * item.quantity).toFixed(2)}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales MVP - POS</Text>
        <SyncStatusIndicator style={styles.syncIndicator} />
      </View>

      <View style={styles.content}>
        {/* Left Panel - Products */}
        <View style={styles.leftPanel}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Enhanced Search and Barcode Scanner Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowBarcodeScanner(true)}
            >
              <Text style={styles.scanButtonText}>📷 Scan Barcode</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowProductSearch(true)}
            >
              <Text style={styles.searchButtonText}>🔍 Search Products</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => setShowManualEntry(true)}
          >
            <Text style={styles.manualEntryButtonText}>➕ Add Manual Product</Text>
          </TouchableOpacity>

          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            style={styles.productList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Right Panel - Cart */}
        <View style={styles.rightPanel}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart ({cart.length} items)</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearCartText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>Add products to get started</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.id}
                style={styles.cartList}
                showsVerticalScrollIndicator={false}
              />

              {/* Cart Summary */}
              <View style={styles.cartSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax ({(taxRate * 100).toFixed(1)}%):</Text>
                  <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={() => setShowPayment(true)}
                >
                  <Text style={styles.checkoutButtonText}>
                    Checkout - ${total.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Payment Modal */}
      <PaymentProcessor
        visible={showPayment}
        cart={cart}
        total={total}
        tax={tax}
        onClose={() => setShowPayment(false)}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Standard Receipt Modal */}
      {currentSale && (
        <Modal
          visible={showReceipt}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowReceipt(false)}
        >
          <View style={{ flex: 1 }}>
            {/* Receipt Type Selector */}
            <View style={{ flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#e9ecef' }}>
              <TouchableOpacity
                style={[styles.receiptTypeButton, !showEnhancedReceipt && styles.receiptTypeButtonActive]}
                onPress={() => setShowEnhancedReceipt(false)}
              >
                <Text style={[styles.receiptTypeText, !showEnhancedReceipt && styles.receiptTypeTextActive]}>Standard</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.receiptTypeButton, showEnhancedReceipt && styles.receiptTypeButtonActive]}
                onPress={() => setShowEnhancedReceipt(true)}
              >
                <Text style={[styles.receiptTypeText, showEnhancedReceipt && styles.receiptTypeTextActive]}>Enhanced</Text>
              </TouchableOpacity>
            </View>

            {/* Receipt Content */}
            {showEnhancedReceipt ? (
              <EnhancedReceiptGenerator
                sale={currentSale}
                onClose={() => setShowReceipt(false)}
                onPrint={handlePrintReceipt}
                onEmail={handleEmailReceipt}
              />
            ) : (
              <ReceiptGenerator
                sale={currentSale}
                onClose={() => setShowReceipt(false)}
                onPrint={handlePrintReceipt}
                onEmail={handleEmailReceipt}
              />
            )}
          </View>
        </Modal>
      )}

      {/* Manual Product Entry Modal */}
        <ManualProductEntry
        visible={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onAddProduct={(product: Product) => {
          addManualProductToCart({
            name: product.name,
            price: product.price,
            quantity: product.stock_qty
          });
        }}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onProductFound={handleBarcodeProductFound}
        onBarcodeScanned={handleBarcodeScanned}
        onManualSearch={handleManualSearchFromBarcode}
      />

      {/* Enhanced Product Search Modal */}
      <EnhancedProductSearch
        visible={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onProductSelect={handleProductSelect}
        onAddManualProduct={() => {
          setShowProductSearch(false);
          setShowManualEntry(true);
        }}
        title="Add Product to Cart"
        placeholder="Search by name, SKU, or scan barcode..."
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  syncIndicator: {
    // Sync indicator will use its own styling
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 2,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e9ecef',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  manualEntryButton: {
    backgroundColor: '#17a2b8',
    margin: 15,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualEntryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 10,
    gap: 10,
  },
  scanButton: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchButton: {
    flex: 1,
    backgroundColor: '#9b59b6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  productList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#27ae60',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: '#fff',
    flexDirection: 'column',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  clearCartText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#999',
  },
  cartList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  cartItemSku: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  quantityButton: {
    backgroundColor: '#dee2e6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    alignItems: 'flex-end',
  },
  cartItemTotalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    marginTop: 4,
    padding: 4,
  },
  removeButtonText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  cartSummary: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  checkoutButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  receiptTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginHorizontal: 5,
    borderRadius: 5,
  },
  receiptTypeButtonActive: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  receiptTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  receiptTypeTextActive: {
    color: '#fff',
  },
});
