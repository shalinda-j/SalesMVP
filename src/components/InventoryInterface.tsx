import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  Alert,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  HapticFeedback,
  ToastManager,
} from '../utils/ux';
import { productService } from '../services/ProductService';
import { useAuth } from '../contexts/AuthContext';
import { Product, CreateProductInput } from '../types';

const { width } = Dimensions.get('window');
const isTablet = width > 768;
const isSmallPhone = width < 380;

interface InventoryStatsProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  status?: 'normal' | 'warning' | 'critical';
}

const InventoryStats: React.FC<InventoryStatsProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  status = 'normal' 
}) => (
  <Card variant="elevated" padding="lg" style={styles.statsCard}>
    <View style={styles.statsHeader}>
      <View style={[styles.statsIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      {status !== 'normal' && (
        <View style={[
          styles.statusIndicator,
          { backgroundColor: status === 'warning' ? theme.colors.warning : theme.colors.error }
        ]} />
      )}
    </View>
    <Text style={styles.statsTitle}>{title}</Text>
    <Text style={[styles.statsValue, { color }]}>{value}</Text>
  </Card>
);

interface ProductItemProps {
  product: Product;
  onEdit: (product: Product) => void;
  onStockAdjust: (product: Product) => void;
}

const ProductItem: React.FC<ProductItemProps> = ({
  product,
  onEdit,
  onStockAdjust
}) => {
  const getStockStatus = () => {
    if (product.stock_qty === 0) {return { status: 'critical', color: theme.colors.error, text: 'Out of Stock' };}
    if (product.stock_qty <= 10) {return { status: 'warning', color: theme.colors.warning, text: 'Low Stock' };}
    return { status: 'normal', color: theme.colors.success, text: 'In Stock' };
  };

  const stockStatus = getStockStatus();

  return (
    <Card variant="outlined" padding="md" style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productSku}>SKU: {product.sku}</Text>
          <Text style={styles.productCategory}>{product.category || 'General'}</Text>
        </View>
        <View style={styles.productPrice}>
          <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.productDetails}>
        <View style={styles.stockInfo}>
          <Text style={styles.stockLabel}>Stock Level:</Text>
          <Text style={[styles.stockValue, { color: stockStatus.color }]}>
            {product.stock_qty} units
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.statusText}>{stockStatus.text}</Text>
          </View>
        </View>
        
        <Text style={styles.lastUpdated}>
          Cost: ${product.cost.toFixed(2)} | Tax: {(product.tax_rate * 100).toFixed(1)}%
        </Text>
      </View>
      
      <View style={styles.productActions}>
        <Button
          title="Edit"
          variant="outline"
          size="sm"
          onPress={() => onEdit(product)}
          style={styles.actionButton}
        />
        <Button
          title="Adjust Stock"
          variant="primary"
          size="sm"
          onPress={() => onStockAdjust(product)}
          style={styles.actionButton}
        />
      </View>
    </Card>
  );
};

export const InventoryInterface: React.FC = () => {
  const { hasPermission } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    stock: '',
    category: '',
    taxRate: '0.08'
  });

  // Initialize database and load real product data
  const initializeAndLoadProducts = useCallback(async () => {
    if (!hasPermission('canViewInventory')) {
      return;
    }

    try {
      // First, ensure database is initialized
      const { database } = await import('../stores/DatabaseFactory');
      
      // Initialize the database if it hasn't been initialized yet
      if (database && typeof database.initialize === 'function') {
        try {
          await database.initialize();
        } catch (initError) {
          // Database initialization failed, continue with fallback
        }
      }
      
      // Try to load products
      try {
        const products = await productService.getAllProducts();
        setProducts(products);
        
        // Calculate stats
        const stats = await productService.getProductStats();
        setInventoryStats({
          totalProducts: stats.totalProducts,
          totalValue: Math.round(stats.totalValue),
          lowStockItems: stats.lowStockCount,
          outOfStockItems: products.filter(p => p.stock_qty === 0).length
        });
      } catch (productError) {
        setProducts([]);
        setInventoryStats({
          totalProducts: 0,
          totalValue: 0,
          lowStockItems: 0,
          outOfStockItems: 0
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load inventory data');
    }
  }, [hasPermission]);

  useEffect(() => {
    initializeAndLoadProducts();
  }, [initializeAndLoadProducts]);

  const handleRefresh = async () => {
    HapticFeedback.light();
    setRefreshing(true);
    await initializeAndLoadProducts();
    setRefreshing(false);
    ToastManager.success('Inventory refreshed');
  };

  const handleAddProduct = () => {
    if (!hasPermission('canManageProducts')) {
      Alert.alert('Access Denied', 'You do not have permission to add products');
      return;
    }
    HapticFeedback.medium();
    setShowAddProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    if (!hasPermission('canManageProducts')) {
      Alert.alert('Access Denied', 'You do not have permission to edit products');
      return;
    }
    HapticFeedback.medium();
    Alert.alert('Edit Product', `Edit functionality for ${product.name} would be implemented here`);
  };

  const handleStockAdjustment = (product: Product) => {
    if (!hasPermission('canAdjustStock')) {
      Alert.alert('Access Denied', 'You do not have permission to adjust stock levels');
      return;
    }
    HapticFeedback.medium();
    Alert.alert('Adjust Stock', `Stock adjustment for ${product.name} would be implemented here`);
  };

  const handleBulkImport = () => {
    if (!hasPermission('canManageProducts')) {
      Alert.alert('Access Denied', 'You do not have permission to import products');
      return;
    }
    HapticFeedback.medium();
    Alert.alert('Bulk Import', 'Bulk import functionality would be implemented here');
  };

  const handleStockReport = () => {
    if (!hasPermission('canViewReports')) {
      Alert.alert('Access Denied', 'You do not have permission to view reports');
      return;
    }
    HapticFeedback.medium();
    Alert.alert('Stock Report', 'Stock report generation would be implemented here');
  };

  const handleReorderAlert = () => {
    if (!hasPermission('canManageProducts')) {
      Alert.alert('Access Denied', 'You do not have permission to manage reorder alerts');
      return;
    }
    HapticFeedback.medium();
    Alert.alert('Reorder Alerts', 'Reorder alert management would be implemented here');
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
      await initializeAndLoadProducts();
      
      ToastManager.success('Product added successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add product');
    }
  };

  const displayStats = [
    {
      title: 'Total Products',
      value: inventoryStats.totalProducts,
      icon: 'cube' as const,
      color: theme.colors.primary,
      status: 'normal' as const
    },
    {
      title: 'Total Value',
      value: `$${inventoryStats.totalValue.toLocaleString()}`,
      icon: 'cash' as const,
      color: theme.colors.success,
      status: 'normal' as const
    },
    {
      title: 'Low Stock Items',
      value: inventoryStats.lowStockItems,
      icon: 'warning' as const,
      color: theme.colors.warning,
      status: inventoryStats.lowStockItems > 0 ? 'warning' as const : 'normal' as const
    },
    {
      title: 'Out of Stock',
      value: inventoryStats.outOfStockItems,
      icon: 'close-circle' as const,
      color: theme.colors.error,
      status: inventoryStats.outOfStockItems > 0 ? 'critical' as const : 'normal' as const
    }
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedFilter === 'all') {return matchesSearch;}
    if (selectedFilter === 'low') {return matchesSearch && product.stock_qty <= 10 && product.stock_qty > 0;}
    if (selectedFilter === 'out') {return matchesSearch && product.stock_qty === 0;}
    
    return matchesSearch;
  });

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductItem 
      product={item}
      onEdit={handleEditProduct}
      onStockAdjust={handleStockAdjustment}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inventory Management</Text>
          <Text style={styles.subtitle}>Track and manage your products</Text>
        </View>
        <Button
          title="Add Product"
          size="sm"
          variant="primary"
          icon="add"
          onPress={handleAddProduct}
          style={styles.addButton}
        />
      </View>

      {/* Main Scrollable Content */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {displayStats.map((stat, index) => (
                <InventoryStats key={index} {...stat} />
              ))}
            </View>

            {/* Search and Filters */}
            <Card variant="glass" padding="lg" style={styles.searchCard}>
              <Input
                label="Search Products"
                value={searchQuery}
                onChangeText={setSearchQuery}
                leftIcon="search"
                placeholder="Search by name or SKU..."
                variant="filled"
              />
              
              <View style={styles.filterButtons}>
                <Button
                  title="All"
                  variant={selectedFilter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => setSelectedFilter('all')}
                  style={styles.filterButton}
                />
                <Button
                  title="Low Stock"
                  variant={selectedFilter === 'low' ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => setSelectedFilter('low')}
                  style={styles.filterButton}
                />
                <Button
                  title="Out of Stock"
                  variant={selectedFilter === 'out' ? 'primary' : 'outline'}
                  size="sm"
                  onPress={() => setSelectedFilter('out')}
                  style={styles.filterButton}
                />
              </View>
            </Card>

            {/* Quick Actions */}
            <Card variant="outlined" padding="lg" style={styles.quickActionsCard}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <Button
                  title="Bulk Import"
                  variant="outline"
                  icon="cloud-upload"
                  onPress={handleBulkImport}
                  style={styles.quickActionButton}
                />
                <Button
                  title="Stock Report"
                  variant="outline"
                  icon="document-text"
                  onPress={handleStockReport}
                  style={styles.quickActionButton}
                />
                <Button
                  title="Reorder Alert"
                  variant="outline"
                  icon="notifications"
                  onPress={handleReorderAlert}
                  style={styles.quickActionButton}
                />
              </View>
            </Card>

            {/* Section Title */}
            <View style={styles.productList}>
              <Text style={styles.sectionTitle}>
                Products ({filteredProducts.length})
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <Card variant="outlined" padding="lg" style={styles.emptyState}>
            <Ionicons 
              name="cube-outline" 
              size={48} 
              color={theme.colors.textLight}
            />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>
              {products.length === 0 
                ? 'Add your first product to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </Text>
            {products.length === 0 && (
              <Button
                title="Add First Product"
                variant="primary"
                onPress={handleAddProduct}
                style={styles.emptyStateButton}
              />
            )}
          </Card>
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
            <Input
              label="Product Name *"
              value={newProductForm.name}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, name: text }))}
              placeholder="Enter product name"
              variant="filled"
            />
            <Input
              label="SKU *"
              value={newProductForm.sku}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, sku: text }))}
              placeholder="Enter SKU"
              variant="filled"
            />
            <Input
              label="Price * ($)"
              value={newProductForm.price}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, price: text }))}
              placeholder="0.00"
              keyboardType="numeric"
              variant="filled"
            />
            <Input
              label="Cost * ($)"
              value={newProductForm.cost}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, cost: text }))}
              placeholder="0.00"
              keyboardType="numeric"
              variant="filled"
            />
            <Input
              label="Initial Stock"
              value={newProductForm.stock}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, stock: text }))}
              placeholder="0"
              keyboardType="numeric"
              variant="filled"
            />
            <Input
              label="Category"
              value={newProductForm.category}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, category: text }))}
              placeholder="Enter category"
              variant="filled"
            />
            <Input
              label="Tax Rate (0-1)"
              value={newProductForm.taxRate}
              onChangeText={(text) => setNewProductForm(prev => ({ ...prev, taxRate: text }))}
              placeholder="0.08"
              keyboardType="numeric"
              variant="filled"
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    minWidth: 120,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statsCard: {
    width: isTablet ? '48%' : '100%',
    minHeight: 120,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchCard: {
    margin: 16,
    marginTop: 0,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  filterButton: {
    flex: 1,
  },
  quickActionsCard: {
    margin: 16,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
  },
  productList: {
    padding: 16,
    paddingTop: 0,
  },
  productCard: {
    marginBottom: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  productPrice: {
    marginLeft: 12,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  productDetails: {
    marginBottom: 12,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  stockValue: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.surface,
    fontWeight: '500',
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyStateButton: {
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.error,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  saveText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  spacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  addProductButton: {
    marginTop: 24,
  },
  flatListContent: {
    paddingBottom: 20,
  },
});
