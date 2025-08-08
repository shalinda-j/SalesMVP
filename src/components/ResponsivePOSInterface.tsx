import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { productService } from '../services/ProductService';
import { salesService, CartItem, Sale } from '../services/SimpleSalesService';
import { seedDataService } from '../services/SeedDataService';
import { theme } from '../styles/theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { 
  isTablet, 
  isMobile, 
  isSmallMobile, 
  getGridColumns, 
  getCardWidth, 
  wp, 
  hp, 
  responsiveFont,
  responsiveSpacing 
} from '../utils/responsive';

export const ResponsivePOSInterface: React.FC = () => {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [taxRate, setTaxRate] = useState(0.08);
  const [showCart, setShowCart] = useState(false);
  const [cartAnimation] = useState(new Animated.Value(0));

  // Screen orientation handling
  const [screenData, setScreenData] = useState(Dimensions.get('window'));

  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };
    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
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

  // Add product to cart with animation
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

    // Animate cart badge
    Animated.sequence([
      Animated.timing(cartAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cartAnimation, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
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

  // Process checkout
  const handleCheckout = async () => {
    try {
      const sale = await salesService.completeSale(
        cart,
        'cash',
        total,
        subtotal,
        tax,
        0,
        'System'
      );

      setCurrentSale(sale);
      setCart([]);
      setShowCart(false);
      Alert.alert('Sale Complete', `Payment of $${total.toFixed(2)} processed successfully!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to process sale. Please try again.');
    }
  };

  // Render product item with responsive design
  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const cardWidth = getCardWidth();
    return (
      <TouchableOpacity
        style={[styles.productCard, { width: cardWidth }]}
        onPress={() => addToCart(item)}
        activeOpacity={0.8}
      >
        <Card variant="elevated" padding="md" style={styles.productCardInner}>
          <View style={styles.productHeader}>
            <View style={styles.productBadge}>
              <Ionicons name="cube" size={responsiveFont(16)} color={theme.colors.primary} />
            </View>
            <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          </View>
          
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
          
          <View style={styles.productFooter}>
            <Text style={styles.stockText}>Stock: {item.stock_qty}</Text>
            <TouchableOpacity
              style={styles.addToCartButton}
              onPress={() => addToCart(item)}
            >
              <Ionicons name="add" size={responsiveFont(16)} color={theme.colors.surface} />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  // Render cart item
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card variant="outlined" padding="md" style={styles.cartItemCard}>
      <View style={styles.cartItemContent}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
          {item.sku && <Text style={styles.cartItemSku}>SKU: {item.sku}</Text>}
          <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
        </View>
        
        <View style={styles.cartItemActions}>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
            >
              <Ionicons name="remove" size={responsiveFont(14)} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{item.quantity}</Text>
            
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
            >
              <Ionicons name="add" size={responsiveFont(14)} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.id)}
          >
            <Ionicons name="trash" size={responsiveFont(14)} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.cartItemFooter}>
        <Text style={styles.cartItemTotal}>
          Total: ${(item.price * item.quantity).toFixed(2)}
        </Text>
      </View>
    </Card>
  );

  // Mobile cart modal
  const renderMobileCart = () => (
    <Modal
      visible={showCart}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCart(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Cart Header */}
        <View style={styles.cartModalHeader}>
          <TouchableOpacity onPress={() => setShowCart(false)}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.cartModalTitle}>Shopping Cart ({cart.length})</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={clearCart}>
              <Text style={styles.clearCartText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cart Content */}
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <Ionicons 
              name="basket-outline" 
              size={64} 
              color={theme.colors.textLight} 
            />
            <Text style={styles.emptyCartText}>Your cart is empty</Text>
            <Text style={styles.emptyCartSubtext}>
              Add products to get started
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              style={styles.cartModalList}
              contentContainerStyle={styles.cartModalListContent}
              showsVerticalScrollIndicator={false}
            />

            {/* Cart Summary */}
            <Card variant="elevated" padding="lg" style={styles.cartSummaryModal}>
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

              <Button
                title={`Checkout - $${total.toFixed(2)}`}
                variant="success"
                size="lg"
                icon="card-outline"
                fullWidth
                onPress={handleCheckout}
              />
            </Card>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Point of Sale</Text>
            <Text style={styles.subtitle}>Modern POS System</Text>
          </View>
          
          {/* Cart Button for Mobile */}
          {isMobile && (
            <TouchableOpacity
              style={styles.cartButton}
              onPress={() => setShowCart(true)}
            >
              <Animated.View
                style={[
                  styles.cartButtonContent,
                  {
                    transform: [
                      {
                        scale: cartAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="basket" size={24} color={theme.colors.surface} />
                {cart.length > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cart.length}</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Section */}
      <Card variant="glass" padding="lg" style={styles.searchCard}>
        <Input
          label="Search Products"
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search"
          placeholder="Enter product name or SKU..."
          variant="filled"
        />
        
        <View style={styles.actionButtons}>
          <Button
            title="Scan"
            variant="primary"
            icon="barcode-outline"
            onPress={() => {}}
            style={styles.actionButton}
          />
          <Button
            title="Manual"
            variant="secondary"
            icon="add-circle-outline"
            onPress={() => {}}
            style={styles.actionButton}
          />
        </View>
      </Card>

      {/* Products Grid */}
      <View style={styles.productsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={getGridColumns()}
            key={getGridColumns()} // Force re-render on orientation change
            style={styles.productsList}
            contentContainerStyle={styles.productsListContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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
              <Ionicons 
                name="basket-outline" 
                size={48} 
                color={theme.colors.textLight} 
              />
              <Text style={styles.emptyCartText}>Cart is empty</Text>
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
      {isMobile && renderMobileCart()}
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
    fontSize: responsiveFont(theme.fontSize.xxl),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: responsiveFont(theme.fontSize.md),
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  cartButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
    padding: responsiveSpacing(12),
    position: 'relative',
  },
  cartButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: theme.colors.surface,
    fontSize: responsiveFont(10),
    fontWeight: theme.fontWeight.bold,
  },
  searchCard: {
    marginHorizontal: responsiveSpacing(theme.spacing.lg),
    marginTop: responsiveSpacing(theme.spacing.lg),
    marginBottom: responsiveSpacing(theme.spacing.md),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: responsiveSpacing(theme.spacing.md),
    marginTop: responsiveSpacing(theme.spacing.md),
  },
  actionButton: {
    flex: 1,
  },
  productsContainer: {
    flex: 1,
    paddingHorizontal: responsiveSpacing(theme.spacing.lg),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: responsiveFont(theme.fontSize.md),
    color: theme.colors.textSecondary,
  },
  productsList: {
    flex: 1,
  },
  productsListContent: {
    paddingBottom: responsiveSpacing(theme.spacing.xl),
  },
  productCard: {
    marginBottom: responsiveSpacing(theme.spacing.md),
    marginHorizontal: responsiveSpacing(theme.spacing.xs),
  },
  productCardInner: {
    height: hp(22),
    justifyContent: 'space-between',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveSpacing(theme.spacing.sm),
  },
  productBadge: {
    width: responsiveSpacing(32),
    height: responsiveSpacing(32),
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: responsiveFont(theme.fontSize.md),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: responsiveSpacing(theme.spacing.xs),
  },
  productSku: {
    fontSize: responsiveFont(theme.fontSize.sm),
    color: theme.colors.textSecondary,
    marginBottom: responsiveSpacing(theme.spacing.md),
  },
  productPrice: {
    fontSize: responsiveFont(theme.fontSize.lg),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: responsiveFont(theme.fontSize.sm),
    color: theme.colors.textSecondary,
  },
  addToCartButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.round,
    width: responsiveSpacing(28),
    height: responsiveSpacing(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tablet Cart Styles
  tabletCart: {
    position: 'absolute',
    right: responsiveSpacing(theme.spacing.lg),
    top: hp(20),
    bottom: responsiveSpacing(theme.spacing.lg),
    width: wp(35),
    maxWidth: 400,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsiveSpacing(theme.spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cartTitle: {
    fontSize: responsiveFont(theme.fontSize.lg),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  clearCartText: {
    color: theme.colors.error,
    fontSize: responsiveFont(theme.fontSize.md),
    fontWeight: theme.fontWeight.medium,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsiveSpacing(theme.spacing.xl),
  },
  emptyCartText: {
    fontSize: responsiveFont(theme.fontSize.lg),
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: responsiveSpacing(theme.spacing.md),
    textAlign: 'center',
  },
  emptyCartSubtext: {
    fontSize: responsiveFont(theme.fontSize.md),
    color: theme.colors.textLight,
    marginTop: responsiveSpacing(theme.spacing.xs),
    textAlign: 'center',
  },
  cartList: {
    flex: 1,
    padding: responsiveSpacing(theme.spacing.md),
  },
  cartSummary: {
    margin: responsiveSpacing(theme.spacing.md),
    marginTop: 0,
  },
  // Mobile Cart Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  cartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsiveSpacing(theme.spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cartModalTitle: {
    fontSize: responsiveFont(theme.fontSize.lg),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  cartModalList: {
    flex: 1,
  },
  cartModalListContent: {
    padding: responsiveSpacing(theme.spacing.lg),
  },
  cartSummaryModal: {
    margin: responsiveSpacing(theme.spacing.lg),
    marginTop: 0,
  },
  // Cart Item Styles
  cartItemCard: {
    marginBottom: responsiveSpacing(theme.spacing.sm),
  },
  cartItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsiveSpacing(theme.spacing.md),
  },
  cartItemInfo: {
    flex: 1,
    marginRight: responsiveSpacing(theme.spacing.md),
  },
  cartItemName: {
    fontSize: responsiveFont(theme.fontSize.md),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  cartItemSku: {
    fontSize: responsiveFont(theme.fontSize.sm),
    color: theme.colors.textSecondary,
    marginTop: responsiveSpacing(theme.spacing.xs),
  },
  cartItemPrice: {
    fontSize: responsiveFont(theme.fontSize.sm),
    color: theme.colors.textSecondary,
    marginTop: responsiveSpacing(theme.spacing.xs),
  },
  cartItemActions: {
    alignItems: 'flex-end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: responsiveSpacing(theme.spacing.sm),
    marginBottom: responsiveSpacing(theme.spacing.sm),
  },
  quantityButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    width: responsiveSpacing(32),
    height: responsiveSpacing(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: responsiveFont(theme.fontSize.md),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    minWidth: responsiveSpacing(30),
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    width: responsiveSpacing(32),
    height: responsiveSpacing(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemFooter: {
    alignItems: 'flex-end',
  },
  cartItemTotal: {
    fontSize: responsiveFont(theme.fontSize.md),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  // Summary Styles
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsiveSpacing(theme.spacing.sm),
  },
  summaryLabel: {
    fontSize: responsiveFont(theme.fontSize.md),
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: responsiveFont(theme.fontSize.md),
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: responsiveSpacing(theme.spacing.md),
    marginBottom: responsiveSpacing(theme.spacing.lg),
  },
  totalLabel: {
    fontSize: responsiveFont(theme.fontSize.lg),
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: responsiveFont(theme.fontSize.xl),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
});
