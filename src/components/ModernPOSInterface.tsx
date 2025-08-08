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
import { BarcodeScannerModal } from './BarcodeScannerModal';
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

export const ModernPOSInterface: React.FC = () => {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [taxRate, setTaxRate] = useState(0.08);
  const [isScannerVisible, setIsScannerVisible] = useState(false);

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
      Alert.alert('Sale Complete', `Payment of $${total.toFixed(2)} processed successfully!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to process sale. Please try again.');
    }
  };

  const handleBarcodeScanned = (scannedData: string) => {
    setIsScannerVisible(false);
    const product = products.find(p => p.sku === scannedData);
    if (product) {
      addToCart(product);
    } else {
      Alert.alert('Product Not Found', `No product found with SKU: ${scannedData}`);
    }
  };

  // Render product item
  const renderProduct = ({ item }: { item: Product }) => (
    <Card 
      variant="elevated" 
      padding="md" 
      style={styles.productCard}
      onPress={() => addToCart(item)}
    >
      <View style={styles.productHeader}>
        <View style={styles.productBadge}>
          <Ionicons name="cube" size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
      </View>
      
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productSku}>SKU: {item.sku}</Text>
      
      <View style={styles.productFooter}>
        <Text style={styles.stockText}>Stock: {item.stock_qty}</Text>
        <Button
          title="Add"
          size="sm"
          variant="primary"
          icon="add"
          onPress={() => addToCart(item)}
        />
      </View>
    </Card>
  );

  // Render cart item
  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card variant="outlined" padding="md" style={styles.cartItemCard}>
      <View style={styles.cartItemHeader}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          {item.sku && <Text style={styles.cartItemSku}>SKU: {item.sku}</Text>}
          <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
        </View>
        
        <View style={styles.quantityControls}>
          <Button
            title="-"
            size="sm"
            variant="outline"
            onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
          />
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <Button
            title="+"
            size="sm"
            variant="outline"
            onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
          />
        </View>
      </View>

      <View style={styles.cartItemFooter}>
        <Text style={styles.cartItemTotal}>
          Total: ${(item.price * item.quantity).toFixed(2)}
        </Text>
        <Button
          title="Remove"
          size="sm"
          variant="error"
          icon="trash"
          onPress={() => removeFromCart(item.id)}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Modern POS</Text>
            <Text style={styles.subtitle}>Sales Management System</Text>
          </View>
          <View style={styles.headerActions}>
            <Button
              title="Settings"
              size="sm"
              variant="ghost"
              icon="settings-outline"
              onPress={() => {}}
            />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Left Panel - Products */}
        <View style={[styles.leftPanel, isTablet && styles.leftPanelTablet]}>
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
                title="Scan Barcode"
                variant="primary"
                icon="barcode-outline"
                onPress={() => setIsScannerVisible(true)}
                style={styles.actionButton}
              />
              <Button
                title="Add Manual"
                variant="secondary"
                icon="add-circle-outline"
                onPress={() => {}}
                style={styles.actionButton}
              />
            </View>
          </Card>

          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={isTablet ? 3 : 2}
            style={styles.productList}
            contentContainerStyle={styles.productListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* Right Panel - Cart */}
        <View style={[styles.rightPanel, isTablet && styles.rightPanelTablet]}>
          <Card variant="elevated" padding="none" style={styles.cartCard}>
            {/* Cart Header */}
            <View style={styles.cartHeader}>
              <Text style={styles.cartTitle}>
                Shopping Cart ({cart.length} items)
              </Text>
              {cart.length > 0 && (
                <Button
                  title="Clear All"
                  size="sm"
                  variant="ghost"
                  icon="trash-outline"
                  onPress={clearCart}
                />
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
                <ScrollView 
                  style={styles.cartList}
                  showsVerticalScrollIndicator={false}
                >
                  {cart.map(item => (
                    <View key={item.id} style={styles.cartItemWrapper}>
                      {renderCartItem({ item })}
                    </View>
                  ))}
                </ScrollView>

                {/* Cart Summary */}
                <Card variant="glass" padding="lg" style={styles.cartSummary}>
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
          </Card>
        </View>
      </View>

      <BarcodeScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
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
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  content: {
    flex: 1,
    flexDirection: isTablet ? 'row' : 'column',
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  leftPanel: {
    flex: 2,
    minHeight: isTablet ? 'auto' : 400,
  },
  leftPanelTablet: {
    flex: 2,
  },
  rightPanel: {
    flex: 1,
    minHeight: isTablet ? 'auto' : 300,
  },
  rightPanelTablet: {
    flex: 1,
    minWidth: 400,
  },
  searchCard: {
    marginBottom: theme.spacing.lg,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  productList: {
    flex: 1,
  },
  productListContent: {
    gap: theme.spacing.md,
  },
  productCard: {
    flex: 1,
    margin: theme.spacing.xs,
    minWidth: isTablet ? 200 : 150,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  productBadge: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  productSku: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  productPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  cartCard: {
    flex: 1,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cartTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyCartText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyCartSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
  },
  cartList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  cartItemWrapper: {
    marginBottom: theme.spacing.sm,
  },
  cartItemCard: {
    marginBottom: theme.spacing.xs,
  },
  cartItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  cartItemInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  cartItemName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  cartItemSku: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  cartItemPrice: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  quantityText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemTotal: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.success,
  },
  cartSummary: {
    margin: theme.spacing.md,
    marginTop: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  summaryValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  totalLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.success,
  },
});
