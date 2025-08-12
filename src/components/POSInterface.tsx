import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, CartItem, RetailTransaction } from '../types';
import { productService } from '../services/ProductService';
import { standardPOSService } from '../services/StandardPOSService';
import { seedDataService } from '../services/SeedDataService';
import { BarcodeScanner } from './BarcodeScanner';

const { width, height } = Dimensions.get('window');

// Responsive utilities
const isMobile = width < 768;
const isSmallMobile = width < 480;
const scaleFont = (size: number) => isSmallMobile ? size * 0.9 : isMobile ? size * 0.95 : size;
const scaleSpacing = (size: number) => isSmallMobile ? size * 0.8 : isMobile ? size * 0.9 : size;
const getTouchTargetSize = () => 44; // Minimum touch target size
const getSafeAreaPadding = () => ({
  paddingTop: Platform.OS === 'ios' ? (height >= 812 ? 44 : 20) : 0,
  paddingBottom: Platform.OS === 'ios' ? (height >= 812 ? 34 : 0) : 0,
});

export const POSInterface: React.FC = () => {
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<RetailTransaction | null>(null);
  const [activeView, setActiveView] = useState<'products' | 'cart'>('products');

  // Load products
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const allProducts = await productService.getAllProducts();
      if (allProducts.length === 0) {
        await seedDataService.seedSampleProducts();
        const seededProducts = await productService.getAllProducts();
        setProducts(seededProducts);
      } else {
        setProducts(allProducts);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
    }
  };

  // Filter products
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart calculations
  const cartTotals = standardPOSService.calculateCartTotals(cart, 0.08);

  // Add to cart
  const addToCart = (product: Product) => {
    const updatedCart = standardPOSService.addToCart(cart, product, 1);
    setCart(updatedCart);
    Alert.alert('Added', `${product.name} added to cart`);
  };

  // Update quantity
  const updateQuantity = (itemId: string | number, quantity: number) => {
    const updatedCart = standardPOSService.updateCartQuantity(cart, itemId, quantity);
    setCart(updatedCart);
  };

  // Remove from cart
  const removeFromCart = (itemId: string | number) => {
    const updatedCart = standardPOSService.removeFromCart(cart, itemId);
    setCart(updatedCart);
  };

  // Handle barcode scan
  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.sku === barcode);
    if (product) {
      addToCart(product);
      setShowScanner(false);
    } else {
      Alert.alert('Not Found', `Product with barcode ${barcode} not found`);
    }
  };

  // Process payment
  const handlePayment = async (method: 'cash' | 'card' | 'digital', amount: number) => {
    try {
      const transaction = await standardPOSService.processTransaction(cart, method, amount);
      setCurrentTransaction(transaction);
      setCart([]);
      setShowPayment(false);
      setShowReceipt(true);
      Alert.alert('Success', 'Transaction completed!');
    } catch (error) {
      Alert.alert('Error', 'Payment failed');
    }
  };

  // Render product
  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productSku}>SKU: {item.sku}</Text>
        <Text style={styles.productStock}>Stock: {item.stock_qty}</Text>
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCart(item)}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render cart item
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={20} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Ionicons name="trash" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Professional POS System</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.scanButton} onPress={() => setShowScanner(true)}>
            <Ionicons name="barcode" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.cartButton} 
            onPress={() => setActiveView(activeView === 'products' ? 'cart' : 'products')}
          >
            <Ionicons name="basket" size={24} color="white" />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products or scan barcode..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Mobile Navigation Tabs */}
      {isMobile && (
        <View style={styles.mobileTabs}>
          <TouchableOpacity
            style={[styles.tabButton, activeView === 'products' && styles.tabButtonActive]}
            onPress={() => setActiveView('products')}
          >
            <Ionicons 
              name="grid-outline" 
              size={20} 
              color={activeView === 'products' ? '#007AFF' : '#8E8E93'} 
            />
            <Text style={[styles.tabText, activeView === 'products' && styles.tabTextActive]}>
              Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeView === 'cart' && styles.tabButtonActive]}
            onPress={() => setActiveView('cart')}
          >
            <Ionicons 
              name="cart-outline" 
              size={20} 
              color={activeView === 'cart' ? '#007AFF' : '#8E8E93'} 
            />
            <Text style={[styles.tabText, activeView === 'cart' && styles.tabTextActive]}>
              Cart ({cart.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {activeView === 'products' ? (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={isMobile ? 1 : 2}
            contentContainerStyle={styles.productsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.cartContainer}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="basket-outline" size={64} color="#8E8E93" />
                <Text style={styles.emptyCartText}>Cart is empty</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={cart}
                  renderItem={renderCartItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.cartList}
                  showsVerticalScrollIndicator={false}
                />
                <View style={styles.cartSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>${cartTotals.subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax:</Text>
                    <Text style={styles.summaryValue}>${cartTotals.tax.toFixed(2)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>${cartTotals.total.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.checkoutButton}
                    onPress={() => setShowPayment(true)}
                  >
                    <Text style={styles.checkoutButtonText}>Checkout</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      {/* Barcode Scanner */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Payment Modal */}
      <Modal visible={showPayment} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment</Text>
            <TouchableOpacity onPress={() => setShowPayment(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paymentContent}>
            <Text style={styles.paymentAmount}>Total: ${cartTotals.total.toFixed(2)}</Text>
            <TouchableOpacity 
              style={styles.paymentMethod}
              onPress={() => handlePayment('cash', cartTotals.total)}
            >
              <Text style={styles.paymentMethodText}>Cash Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.paymentMethod}
              onPress={() => handlePayment('card', cartTotals.total)}
            >
              <Text style={styles.paymentMethodText}>Card Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.paymentMethod}
              onPress={() => handlePayment('digital', cartTotals.total)}
            >
              <Text style={styles.paymentMethodText}>Digital Payment</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Receipt Modal */}
      <Modal visible={showReceipt} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Receipt</Text>
            <TouchableOpacity onPress={() => setShowReceipt(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.receiptContent}>
            <Text style={styles.receiptTitle}>Transaction Complete!</Text>
            <Text style={styles.receiptAmount}>${currentTransaction?.totals.grandTotal.toFixed(2)}</Text>
            <Text style={styles.receiptId}>ID: {currentTransaction?.id}</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingHorizontal: scaleSpacing(20),
    paddingVertical: scaleSpacing(16),
    paddingTop: getSafeAreaPadding().paddingTop + scaleSpacing(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    gap: scaleSpacing(12),
  },
  scanButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: scaleSpacing(8),
    borderRadius: scaleSpacing(8),
    minWidth: getTouchTargetSize(),
    minHeight: getTouchTargetSize(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: scaleSpacing(8),
    borderRadius: scaleSpacing(8),
    position: 'relative',
    minWidth: getTouchTargetSize(),
    minHeight: getTouchTargetSize(),
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: scaleFont(12),
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: scaleSpacing(16),
    backgroundColor: 'white',
  },
  searchInput: {
    backgroundColor: '#F2F2F7',
    padding: scaleSpacing(12),
    borderRadius: scaleSpacing(8),
    fontSize: scaleFont(16),
    minHeight: getTouchTargetSize(),
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaleSpacing(12),
    gap: scaleSpacing(8),
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  tabText: {
    fontSize: scaleFont(14),
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  productsList: {
    padding: scaleSpacing(8),
  },
  productCard: {
    backgroundColor: 'white',
    margin: scaleSpacing(8),
    padding: scaleSpacing(16),
    borderRadius: scaleSpacing(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: getTouchTargetSize() * 1.5,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(4),
  },
  productSku: {
    fontSize: scaleFont(12),
    color: '#8E8E93',
    marginBottom: scaleSpacing(2),
  },
  productStock: {
    fontSize: scaleFont(12),
    color: '#8E8E93',
    marginBottom: scaleSpacing(4),
  },
  productPrice: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    color: '#007AFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: getTouchTargetSize(),
    height: getTouchTargetSize(),
    borderRadius: getTouchTargetSize() / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartContainer: {
    flex: 1,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCartText: {
    fontSize: scaleFont(18),
    color: '#8E8E93',
    marginTop: scaleSpacing(16),
  },
  cartList: {
    flex: 1,
    padding: scaleSpacing(16),
  },
  cartItem: {
    backgroundColor: 'white',
    padding: scaleSpacing(16),
    borderRadius: scaleSpacing(12),
    marginBottom: scaleSpacing(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartItemInfo: {
    marginBottom: scaleSpacing(12),
  },
  cartItemName: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    marginBottom: scaleSpacing(4),
  },
  cartItemPrice: {
    fontSize: scaleFont(14),
    color: '#8E8E93',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    minWidth: getTouchTargetSize(),
    minHeight: getTouchTargetSize(),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: scaleSpacing(8),
  },
  removeButton: {
    minWidth: getTouchTargetSize(),
    minHeight: getTouchTargetSize(),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: scaleSpacing(8),
  },
  quantityText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    marginHorizontal: scaleSpacing(16),
    minWidth: 30,
    textAlign: 'center',
  },
  cartSummary: {
    backgroundColor: 'white',
    padding: scaleSpacing(20),
    borderTopLeftRadius: scaleSpacing(20),
    borderTopRightRadius: scaleSpacing(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaleSpacing(8),
  },
  summaryLabel: {
    fontSize: scaleFont(16),
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: scaleSpacing(12),
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: scaleSpacing(8),
  },
  totalLabel: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: scaleFont(20),
    fontWeight: 'bold',
    color: '#007AFF',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    padding: scaleSpacing(16),
    borderRadius: scaleSpacing(12),
    alignItems: 'center',
    marginTop: scaleSpacing(16),
    minHeight: getTouchTargetSize(),
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: scaleFont(18),
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    backgroundColor: 'white',
    paddingHorizontal: scaleSpacing(20),
    paddingVertical: scaleSpacing(16),
    paddingTop: getSafeAreaPadding().paddingTop + scaleSpacing(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: scaleFont(18),
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#007AFF',
    fontSize: scaleFont(16),
    minWidth: getTouchTargetSize(),
    minHeight: getTouchTargetSize(),
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  paymentContent: {
    flex: 1,
    padding: scaleSpacing(20),
    justifyContent: 'center',
  },
  paymentAmount: {
    fontSize: scaleFont(32),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: scaleSpacing(32),
  },
  paymentMethod: {
    backgroundColor: 'white',
    padding: scaleSpacing(20),
    borderRadius: scaleSpacing(12),
    marginBottom: scaleSpacing(16),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: getTouchTargetSize() * 2,
  },
  paymentMethodText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  receiptContent: {
    flex: 1,
    padding: scaleSpacing(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    marginBottom: scaleSpacing(16),
  },
  receiptAmount: {
    fontSize: scaleFont(48),
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: scaleSpacing(16),
  },
  receiptId: {
    fontSize: scaleFont(16),
    color: '#8E8E93',
  },
});
