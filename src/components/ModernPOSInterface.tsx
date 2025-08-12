import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, CartItem } from '../types';
import { productService } from '../services/ProductService';
import { standardPOSService } from '../services/StandardPOSService';
import { salesService } from '../services/SalesService';
import { seedDataService } from '../services/SeedDataService';
import { modernTheme, getTypography, getSpacing } from '../styles/modern-theme';
import { ModernButton } from './ui/ModernButton';
import { ModernCard } from './ui/ModernCard';
import { PaymentProcessor } from './PaymentProcessor';
import { ReceiptGenerator } from './ReceiptGenerator';

export const ModernPOSInterface: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'products' | 'cart'>('products');
  const [showPayment, setShowPayment] = useState(false);
  const [currentSale, setCurrentSale] = useState<any>(null);

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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotals = standardPOSService.calculateCartTotals(cart, 0.08);

  const addToCart = (product: Product) => {
    const updatedCart = standardPOSService.addToCart(cart, product, 1);
    setCart(updatedCart);
    setActiveView('cart');
  };

  const updateQuantity = (itemId: string | number, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(itemId);
    } else {
      const updatedCart = standardPOSService.updateCartQuantity(cart, itemId, quantity);
      setCart(updatedCart);
    }
  };

  const removeFromCart = (itemId: string | number) => {
    const updatedCart = standardPOSService.removeFromCart(cart, itemId);
    setCart(updatedCart);
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before processing payment.');
      return;
    }
    setShowPayment(true);
  };

  const handlePaymentComplete = async (paymentMethod: 'cash' | 'card' | 'digital', amount: number) => {
    try {
      // Convert POS CartItem to SalesService CartItem
      const salesCartItems = cart.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }
        return {
          product,
          quantity: item.quantity
        };
      });

      const saleResult = await salesService.processSale(salesCartItems, paymentMethod, amount);
      setCurrentSale(saleResult);
      setCart([]);
      setShowPayment(false);
      setActiveView('products'); // Changed from setShowReceipt(true) to setActiveView('products')
    } catch (error) {
      Alert.alert('Payment Error', error instanceof Error ? error.message : 'Payment processing failed');
    }
  };

  const handleReceiptClose = () => {
    setActiveView('products'); // Changed from setShowReceipt(false) to setActiveView('products')
    setCurrentSale(null);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ModernCard
      variant="default"
      padding="md"
      onPress={() => addToCart(item)}
      style={styles.productItem}
    >
      <View style={styles.productContent}>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
        </View>
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
      </View>
    </ModernCard>
  );

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemSku}>SKU: {item.sku}</Text>
      </View>
      <View style={styles.cartItemControls}>
        <ModernButton
          title="−"
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
          variant="outline"
          size="sm"
        />
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <ModernButton
          title="+"
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
          variant="outline"
          size="sm"
        />
        <Text style={styles.cartItemTotal}>
          ${(item.price * item.quantity).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Point of Sale</Text>
        <View style={styles.headerActions}>
          <ModernButton
            title={activeView === 'products' ? 'Cart' : 'Products'}
            onPress={() => setActiveView(activeView === 'products' ? 'cart' : 'products')}
            variant="primary"
            size="sm"
            icon={
              <Ionicons
                name={activeView === 'products' ? 'cart-outline' : 'grid-outline'}
                size={20}
                color={modernTheme.colors.text.inverse}
              />
            }
          />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {activeView === 'products' ? (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.productsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.cartContainer}>
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.cartList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      {/* Cart Summary */}
      {activeView === 'cart' && cart.length > 0 && (
        <View style={styles.cartSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total:</Text>
            <Text style={styles.totalValue}>${cartTotals.total.toFixed(2)}</Text>
          </View>
          <ModernButton
            title="Process Payment"
            onPress={handlePayment}
            variant="primary"
            size="lg"
            icon={
              <Ionicons
                name="card-outline"
                size={24}
                color={modernTheme.colors.text.inverse}
              />
            }
            fullWidth
          />
        </View>
      )}

      {/* Payment Modal */}
      <PaymentProcessor
        visible={showPayment}
        cart={cart}
        total={cartTotals.total}
        tax={cartTotals.tax}
        onClose={() => setShowPayment(false)}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Receipt Modal */}
      {currentSale && (
        <ReceiptGenerator
          sale={currentSale}
          onClose={handleReceiptClose}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernTheme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getSpacing('lg'),
    backgroundColor: modernTheme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.border.light,
  },
  title: {
    ...getTypography('2xl', 'bold'),
    color: modernTheme.colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: getSpacing('sm'),
  },
  mainContent: {
    flex: 1,
  },
  productsList: {
    padding: getSpacing('lg'),
  },
  productItem: {
    flex: 1,
    margin: getSpacing('xs'),
  },
  productContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: getSpacing('sm'),
  },
  productName: {
    ...getTypography('md', 'medium'),
    color: modernTheme.colors.text.primary,
    marginBottom: getSpacing('xs'),
  },
  productSku: {
    ...getTypography('xs', 'regular'),
    color: modernTheme.colors.text.secondary,
  },
  productPrice: {
    ...getTypography('lg', 'bold'),
    color: modernTheme.colors.primary[500],
  },
  cartContainer: {
    flex: 1,
  },
  cartList: {
    padding: getSpacing('lg'),
  },
  cartItem: {
    backgroundColor: modernTheme.colors.background.primary,
    borderRadius: modernTheme.borderRadius.md,
    padding: getSpacing('md'),
    marginBottom: getSpacing('sm'),
    ...modernTheme.shadows.sm,
  },
  cartItemInfo: {
    marginBottom: getSpacing('sm'),
  },
  cartItemName: {
    ...getTypography('md', 'medium'),
    color: modernTheme.colors.text.primary,
    marginBottom: getSpacing('xs'),
  },
  cartItemSku: {
    ...getTypography('xs', 'regular'),
    color: modernTheme.colors.text.secondary,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityText: {
    ...getTypography('md', 'medium'),
    color: modernTheme.colors.text.primary,
    marginHorizontal: getSpacing('sm'),
  },
  cartItemTotal: {
    ...getTypography('md', 'bold'),
    color: modernTheme.colors.primary[500],
  },
  cartSummary: {
    backgroundColor: modernTheme.colors.background.primary,
    padding: getSpacing('lg'),
    borderTopWidth: 1,
    borderTopColor: modernTheme.colors.border.light,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing('lg'),
  },
  summaryLabel: {
    ...getTypography('lg', 'bold'),
    color: modernTheme.colors.text.primary,
  },
  totalValue: {
    ...getTypography('lg', 'bold'),
    color: modernTheme.colors.primary[500],
  },
});
