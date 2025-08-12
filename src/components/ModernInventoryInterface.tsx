import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  SafeAreaView,
  RefreshControl,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, CreateProductInput } from '../types';
import { productService } from '../services/ProductService';
import { seedDataService } from '../services/SeedDataService';
import { modernTheme, getTypography, getSpacing } from '../styles/modern-theme';
import { ModernButton } from './ui/ModernButton';
import { ModernCard } from './ui/ModernCard';
import { ModernInput } from './ui/ModernInput';

interface InventoryStats {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

export const ModernInventoryInterface: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    stock: '',
    category: '',
    taxRate: '0.08'
  });

  const loadProducts = useCallback(async () => {
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
      Alert.alert('Error', 'Failed to load inventory');
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const getInventoryStats = (): InventoryStats => {
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.stock_qty > 0 && p.stock_qty <= 10).length;
    const outOfStockItems = products.filter(p => p.stock_qty === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock_qty), 0);

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalValue,
    };
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) {return { status: 'out-of-stock', color: modernTheme.colors.error[500], icon: 'close-circle' };}
    if (stock <= 10) {return { status: 'low-stock', color: modernTheme.colors.warning[500], icon: 'warning' };}
    return { status: 'in-stock', color: modernTheme.colors.success[500], icon: 'checkmark-circle' };
  };

  const handleAddProduct = () => {
    setShowAddProductModal(true);
  };

  const handleSaveProduct = async () => {
    try {
      // Validate form
      if (!newProductForm.name.trim() || !newProductForm.sku.trim() || !newProductForm.price || !newProductForm.cost) {
        Alert.alert('Validation Error', 'Please fill in all required fields');
        return;
      }

      const price = parseFloat(newProductForm.price);
      const cost = parseFloat(newProductForm.cost);
      const stock = parseInt(newProductForm.stock) || 0;
      const taxRate = parseFloat(newProductForm.taxRate) || 0.08;

      if (isNaN(price) || price < 0) {
        Alert.alert('Validation Error', 'Please enter a valid price');
        return;
      }

      if (isNaN(cost) || cost < 0) {
        Alert.alert('Validation Error', 'Please enter a valid cost');
        return;
      }

      const productInput: CreateProductInput = {
        name: newProductForm.name.trim(),
        sku: newProductForm.sku.trim().toUpperCase(),
        price,
        cost,
        stock_qty: stock,
        tax_rate: taxRate
      };

      await productService.createProduct(productInput);
      
      // Reset form and close modal
      setNewProductForm({
        name: '',
        sku: '',
        price: '',
        cost: '',
        stock: '',
        category: '',
        taxRate: '0.08'
      });
      setShowAddProductModal(false);
      
      // Refresh the product list
      await loadProducts();
      
      Alert.alert('Success', 'Product added successfully');
    } catch (error) {
      console.error('Failed to add product:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add product');
    }
  };

  const handleEditProduct = (product: Product) => {
    Alert.alert('Edit Product', `Edit ${product.name} - will be implemented in the next update.`);
  };

  const handleStockAdjustment = (product: Product) => {
    Alert.alert('Stock Adjustment', `Adjust stock for ${product.name} - will be implemented in the next update.`);
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const stockStatus = getStockStatus(item.stock_qty);
    
    return (
      <ModernCard
        variant="default"
        padding="md"
        style={styles.productItem}
      >
        <View style={styles.productContent}>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productSku}>SKU: {item.sku}</Text>
            <View style={styles.stockInfo}>
              <Ionicons 
                name={stockStatus.icon as keyof typeof Ionicons.glyphMap} 
                size={16} 
                color={stockStatus.color} 
              />
              <Text style={[styles.stockText, { color: stockStatus.color }]}>
                Stock: {item.stock_qty}
              </Text>
            </View>
          </View>
          <View style={styles.productActions}>
            <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
            <View style={styles.actionButtons}>
              <ModernButton
                title="Edit"
                onPress={() => handleEditProduct(item)}
                variant="ghost"
                size="sm"
                icon={
                  <Ionicons
                    name="create-outline"
                    size={16}
                    color={modernTheme.colors.primary[500]}
                  />
                }
                style={styles.actionButton}
              />
              <ModernButton
                title="Stock"
                onPress={() => handleStockAdjustment(item)}
                variant="ghost"
                size="sm"
                icon={
                  <Ionicons
                    name="add-circle-outline"
                    size={16}
                    color={modernTheme.colors.primary[500]}
                  />
                }
                style={styles.actionButton}
              />
            </View>
          </View>
        </View>
      </ModernCard>
    );
  };

  const stats = getInventoryStats();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>Manage your product catalog</Text>
        </View>
        <ModernButton
          title="Add Product"
          onPress={handleAddProduct}
          variant="primary"
          size="sm"
          icon={
            <Ionicons
              name="add-outline"
              size={20}
              color={modernTheme.colors.text.inverse}
            />
          }
        />
      </View>



      {/* Main Scrollable Content */}
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Stats Cards */}
            <View style={styles.statsContainer}>
              <ModernCard variant="elevated" padding="md" style={styles.statCard}>
                <View style={styles.statContent}>
                  <Ionicons name="cube" size={24} color={modernTheme.colors.primary[500]} />
                  <Text style={styles.statValue}>{stats.totalProducts}</Text>
                  <Text style={styles.statLabel}>Total Products</Text>
                </View>
              </ModernCard>

              <ModernCard variant="elevated" padding="md" style={styles.statCard}>
                <View style={styles.statContent}>
                  <Ionicons name="warning" size={24} color={modernTheme.colors.warning[500]} />
                  <Text style={styles.statValue}>{stats.lowStockItems}</Text>
                  <Text style={styles.statLabel}>Low Stock</Text>
                </View>
              </ModernCard>

              <ModernCard variant="elevated" padding="md" style={styles.statCard}>
                <View style={styles.statContent}>
                  <Ionicons name="close-circle" size={24} color={modernTheme.colors.error[500]} />
                  <Text style={styles.statValue}>{stats.outOfStockItems}</Text>
                  <Text style={styles.statLabel}>Out of Stock</Text>
                </View>
              </ModernCard>

              <ModernCard variant="elevated" padding="md" style={styles.statCard}>
                <View style={styles.statContent}>
                  <Ionicons name="cash" size={24} color={modernTheme.colors.success[500]} />
                  <Text style={styles.statValue}>${stats.totalValue.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Total Value</Text>
                </View>
              </ModernCard>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <Text style={styles.productCount}>{products.length} items</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons 
              name="cube-outline" 
              size={48} 
              color={modernTheme.colors.text.tertiary} 
            />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first product to get started
            </Text>
            <ModernButton
              title="Add Product"
              onPress={handleAddProduct}
              variant="primary"
              size="md"
              icon={
                <Ionicons
                  name="add-outline"
                  size={20}
                  color={modernTheme.colors.text.inverse}
                />
              }
              style={styles.emptyStateButton}
            />
          </View>
        }
        contentContainerStyle={styles.flatListContent}
      />

      {/* Add Product Modal */}
      <Modal
        visible={showAddProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddProductModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddProductModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add New Product</Text>
            <TouchableOpacity onPress={handleSaveProduct}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <ModernInput
              label="Product Name *"
              value={newProductForm.name}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, name: text }))}
              placeholder="Enter product name"
            />
            <ModernInput
              label="SKU *"
              value={newProductForm.sku}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, sku: text }))}
              placeholder="Enter SKU"
            />
            <ModernInput
              label="Price * ($)"
              value={newProductForm.price}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, price: text }))}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <ModernInput
              label="Cost * ($)"
              value={newProductForm.cost}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, cost: text }))}
              placeholder="0.00"
              keyboardType="numeric"
            />
            <ModernInput
              label="Initial Stock"
              value={newProductForm.stock}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, stock: text }))}
              placeholder="0"
              keyboardType="numeric"
            />
            <ModernInput
              label="Category"
              value={newProductForm.category}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, category: text }))}
              placeholder="Enter category"
            />
            <ModernInput
              label="Tax Rate (0-1)"
              value={newProductForm.taxRate}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, taxRate: text }))}
              placeholder="0.08"
              keyboardType="numeric"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerContent: {
    flex: 1,
  },
  title: {
    ...getTypography('2xl', 'bold'),
    color: modernTheme.colors.text.primary,
    marginBottom: getSpacing('xs'),
  },
  subtitle: {
    ...getTypography('sm', 'regular'),
    color: modernTheme.colors.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: getSpacing('lg'),
    gap: getSpacing('md'),
  },
  statCard: {
    flex: 1,
    minWidth: 150,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    ...getTypography('2xl', 'bold'),
    color: modernTheme.colors.text.primary,
    marginTop: getSpacing('sm'),
    marginBottom: getSpacing('xs'),
  },
  statLabel: {
    ...getTypography('xs', 'regular'),
    color: modernTheme.colors.text.secondary,
    textAlign: 'center',
  },
  productsContainer: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getSpacing('lg'),
    backgroundColor: modernTheme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.border.light,
  },
  sectionTitle: {
    ...getTypography('lg', 'semibold'),
    color: modernTheme.colors.text.primary,
  },
  productCount: {
    ...getTypography('sm', 'regular'),
    color: modernTheme.colors.text.secondary,
  },
  productsList: {
    padding: getSpacing('lg'),
  },
  productItem: {
    marginBottom: getSpacing('md'),
  },
  productContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: getSpacing('md'),
  },
  productName: {
    ...getTypography('md', 'medium'),
    color: modernTheme.colors.text.primary,
    marginBottom: getSpacing('xs'),
  },
  productSku: {
    ...getTypography('sm', 'regular'),
    color: modernTheme.colors.text.secondary,
    marginBottom: getSpacing('xs'),
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockText: {
    ...getTypography('sm', 'medium'),
    marginLeft: getSpacing('xs'),
  },
  productActions: {
    alignItems: 'flex-end',
  },
  productPrice: {
    ...getTypography('lg', 'bold'),
    color: modernTheme.colors.primary[500],
    marginBottom: getSpacing('sm'),
  },
  actionButtons: {
    flexDirection: 'row',
    gap: getSpacing('xs'),
  },
  actionButton: {
    minWidth: 36,
    minHeight: 36,
  },
  emptyState: {
    alignItems: 'center',
    padding: getSpacing('xl'),
  },
  emptyStateText: {
    ...getTypography('md', 'medium'),
    color: modernTheme.colors.text.secondary,
    marginTop: getSpacing('md'),
  },
  emptyStateSubtext: {
    ...getTypography('sm', 'regular'),
    color: modernTheme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: getSpacing('sm'),
    marginBottom: getSpacing('lg'),
  },
  emptyStateButton: {
    minWidth: 200,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: modernTheme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getSpacing('lg'),
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.border.light,
  },
  cancelText: {
    fontSize: 16,
    color: modernTheme.colors.error[500],
  },
  modalTitle: {
    ...getTypography('lg', 'semibold'),
    color: modernTheme.colors.text.primary,
  },
  saveText: {
    fontSize: 16,
    color: modernTheme.colors.primary[500],
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: getSpacing('lg'),
  },
  flatListContent: {
    paddingBottom: getSpacing('lg'),
  },
});
