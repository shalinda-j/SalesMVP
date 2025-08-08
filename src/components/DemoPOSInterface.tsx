import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  isTablet,
  isSmallMobile,
  isExtraSmall,
  isMobile,
  TYPOGRAPHY,
  SPACING,
  LAYOUT,
  getTouchTargetSize,
  getResponsiveGrid,
  getModalDimensions,
  getSafeAreaPadding,
  getDeviceOptimizations,
  responsiveFont,
  responsiveSpacing,
  wp,
  hp,
  getGridColumns,
} from '../utils/responsive';
import {
  HapticFeedback,
  ToastManager,
  GestureHelpers,
  DateTimeHelpers,
  AccessibilityHelpers,
} from '../utils/ux';

// Demo data
const demoProducts = [
  { id: 1, name: 'Wireless Headphones', price: 89.99, sku: 'WH-001', stock_qty: 25 },
  { id: 2, name: 'Bluetooth Speaker', price: 45.99, sku: 'BS-002', stock_qty: 15 },
  { id: 3, name: 'Phone Case', price: 19.99, sku: 'PC-003', stock_qty: 50 },
  { id: 4, name: 'USB Cable', price: 12.99, sku: 'UC-004', stock_qty: 30 },
  { id: 5, name: 'Power Bank', price: 35.99, sku: 'PB-005', stock_qty: 20 },
  { id: 6, name: 'Screen Protector', price: 14.99, sku: 'SP-006', stock_qty: 40 },
];

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  sku: string;
}

export const DemoPOSInterface: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCart, setShowCart] = useState(false);
  const taxRate = 0.08;

  // Filter products based on search query
  const filteredProducts = demoProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Add product to cart
  const addToCart = useCallback((product: typeof demoProducts[0]) => {
    HapticFeedback.medium();
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
      ToastManager.success(`Added another ${product.name} to cart`);
    } else {
      const cartItem: CartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        sku: product.sku
      };
      setCart([...cart, cartItem]);
      ToastManager.success(`${product.name} added to cart`);
    }
  }, [cart]);

  // Update cart item quantity
  const updateCartQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else {
      setCart(cart.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
  };

  // Checkout
  const handleCheckout = () => {
    Alert.alert(
      'Demo Checkout',
      `Total: $${total.toFixed(2)}\n\nThis is a demo - no actual payment processed.`,
      [
        { text: 'OK', onPress: () => {
          setCart([]);
          setShowCart(false);
        }}
      ]
    );
  };

  // Render product item
  const renderProduct = ({ item }: { item: typeof demoProducts[0] }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => addToCart(item)}
      activeOpacity={0.8}
    >
      <Card variant="elevated" padding="md">
        <View style={styles.productHeader}>
          <View style={styles.productBadge}>
            <Ionicons name="cube" size={16} color={theme.colors.primary} />
          </View>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        </View>
        
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productSku}>SKU: {item.sku}</Text>
        
        <View style={styles.productFooter}>
          <Text style={styles.stockText}>Stock: {item.stock_qty}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addToCart(item)}
          >
            <Ionicons name="add" size={14} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>
      </Card>
    </TouchableOpacity>
  );

  // Render cart item
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card variant="outlined" padding="md" style={styles.cartItemCard}>
      <View style={styles.cartItemContent}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
        </View>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
          >
            <Ionicons name="remove" size={12} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
          >
            <Ionicons name="add" size={12} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.cartItemTotal}>
        Total: ${(item.price * item.quantity).toFixed(2)}
      </Text>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Sales MVP Demo</Text>
            <Text style={styles.subtitle}>Modern POS System</Text>
          </View>
          
          {/* Cart Button for Mobile */}
          {isMobile && (
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => setShowCart(true)}
            >
              <Ionicons name="basket" size={24} color={theme.colors.surface} />
              {cart.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search */}
      <Card variant="glass" padding="lg" style={styles.searchCard}>
        <Input
          label="Search Products"
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          placeholder="Enter product name or SKU..."
          variant="filled"
        />
      </Card>

      {/* Products Grid */}
      <View style={styles.productsContainer}>
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          numColumns={getGridColumns()}
          key={getGridColumns()}
          style={styles.productsList}
          contentContainerStyle={styles.productsListContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Tablet Cart Panel */}
      {isTablet && (
        <Card variant="elevated" padding="none" style={styles.tabletCart}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart ({cart.length})</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart}>
                <Text style={styles.clearCartText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <Ionicons name="basket-outline" size={48} color={theme.colors.textLight} />
              <Text style={styles.emptyCartText}>Cart is empty</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.id.toString()}
                style={styles.cartList}
              />

              <Card variant="glass" padding="lg" style={styles.cartSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax:</Text>
                  <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                </View>

                <Button
                  title={`Checkout - $${total.toFixed(2)}`}
                  variant="success"
                  size="lg"
                  fullWidth
                  onPress={handleCheckout}
                />
              </Card>
            </>
          )}
        </Card>
      )}

      {/* Mobile Cart Modal */}
      {isMobile && (
        <Modal
          visible={showCart}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCart(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.cartModalHeader}>
              <TouchableOpacity onPress={() => setShowCart(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.cartModalTitle}>Cart ({cart.length})</Text>
              {cart.length > 0 && (
                <TouchableOpacity onPress={clearCart}>
                  <Text style={styles.clearCartText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="basket-outline" size={64} color={theme.colors.textLight} />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <Text style={styles.emptyCartSubtext}>Add products to get started</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={cart}
                  renderItem={renderCartItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.cartModalList}
                  contentContainerStyle={styles.cartModalListContent}
                />

                <Card variant="elevated" padding="lg" style={styles.cartSummaryModal}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax:</Text>
                    <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
                  </View>

                  <Button
                    title={`Checkout - $${total.toFixed(2)}`}
                    variant="success"
                    size="lg"
                    fullWidth
                    onPress={handleCheckout}
                  />
                </Card>
              </>
            )}
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    paddingVertical: responsiveSpacing(theme.spacing.lg),
    paddingHorizontal: responsiveSpacing(theme.spacing.xl),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: responsiveFont(14),
    color: theme.colors.textSecondary,
    marginTop: scaleSpacing(4),
  },
  cartButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
    padding: scaleSpacing(8),
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -hp(0.5),
    right: -hp(0.5),
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: scaleSpacing(20),
    height: scaleSpacing(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: theme.colors.surface,
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.bold,
  },
  searchCard: {
    marginHorizontal: scaleSpacing(12),
    marginTop: scaleSpacing(12),
    marginBottom: scaleSpacing(8),
  },
  productsContainer: {
    flex: 1,
    paddingHorizontal: scaleSpacing(12),
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingBottom: scaleSpacing(12),
  },
  productCard: {
    flex: 1,
    margin: scaleSpacing(8),
    minHeight: hp(18),
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(8),
  },
  productBadge: {
    width: scaleSpacing(24),
    height: scaleSpacing(24),
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: scaleSpacing(4),
  },
  productSku: {
    fontSize: responsiveFont(14),
    color: theme.colors.textSecondary,
    marginBottom: scaleSpacing(8),
  },
  productPrice: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: responsiveFont(14),
    color: theme.colors.textSecondary,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
    width: scaleSpacing(24),
    height: scaleSpacing(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tablet Cart Styles
  tabletCart: {
    position: 'absolute',
    right: scaleSpacing(12),
    top: hp(18),
    bottom: scaleSpacing(12),
    width: scaleSpacing(24),
    maxWidth: 400,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scaleSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cartTitle: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  clearCartText: {
    color: theme.colors.error,
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.medium,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSpacing(12),
  },
  emptyCartText: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: scaleSpacing(8),
    textAlign: 'center',
  },
  emptyCartSubtext: {
    fontSize: responsiveFont(14),
    color: theme.colors.textLight,
    marginTop: scaleSpacing(4),
    textAlign: 'center',
  },
  cartList: {
    flex: 1,
    padding: scaleSpacing(8),
  },
  cartSummary: {
    margin: scaleSpacing(8),
    marginTop: scaleSpacing(8),
  },
  // Mobile Cart Modal
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scaleSpacing(8),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cartModalTitle: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  cartModalList: {
    flex: 1,
  },
  cartModalListContent: {
    padding: scaleSpacing(8),
  },
  cartSummaryModal: {
    margin: scaleSpacing(12),
    marginTop: scaleSpacing(8),
  },
  // Cart Item Styles
  cartItemCard: {
    marginBottom: scaleSpacing(8),
  },
  cartItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(8),
  },
  cartItemInfo: {
    flex: 1,
    marginRight: scaleSpacing(8),
  },
  cartItemName: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  cartItemPrice: {
    fontSize: responsiveFont(14),
    color: theme.colors.textSecondary,
    marginTop: scaleSpacing(4),
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSpacing(8),
  },
  quantityButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    width: scaleSpacing(24),
    height: scaleSpacing(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    minWidth: scaleSpacing(20),
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
    textAlign: 'right',
  },
  // Summary Styles
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSpacing(8),
  },
  summaryLabel: {
    fontSize: responsiveFont(14),
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: scaleSpacing(8),
    marginBottom: scaleSpacing(12),
  },
  totalLabel: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: responsiveFont(14),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
});
