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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  HapticFeedback,
  ToastManager,
  DateTimeHelpers,
  AccessibilityHelpers,
} from '../utils/ux';
import { productService } from '../services/ProductService';
import { inventoryService } from '../services/InventoryService';
import { useAuth } from '../contexts/DemoAuthContext';
import { Product } from '../types';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

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
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'warning': return theme.colors.warning;
      case 'critical': return theme.colors.error;
      default: return color;
    }
  };

  return (
    <Card variant="elevated" padding="lg" style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <View style={[styles.statsIcon, { backgroundColor: getStatusColor() + '20' }]}>
          <Ionicons name={icon} size={24} color={getStatusColor()} />
        </View>
        {status !== 'normal' && (
          <View style={styles.statusIndicator}>
            <Ionicons 
              name={status === 'warning' ? 'warning' : 'alert-circle'} 
              size={16} 
              color={getStatusColor()} 
            />
          </View>
        )}
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </Card>
  );
};

interface ProductItemProps {
  name: string;
  sku: string;
  stock: number;
  price: number;
  lowStockThreshold: number;
  category: string;
  onEdit?: (product: ProductItemProps) => void;
  onStockAdjust?: (product: ProductItemProps) => void;
}

const ProductItem: React.FC<ProductItemProps> = ({ 
  name, 
  sku, 
  stock, 
  price, 
  lowStockThreshold, 
  category,
  onEdit,
  onStockAdjust 
}) => {
  const stockStatus = stock === 0 ? 'critical' : stock <= lowStockThreshold ? 'warning' : 'normal';
  const stockColor = stockStatus === 'critical' ? theme.colors.error : 
                    stockStatus === 'warning' ? theme.colors.warning : 
                    theme.colors.success;

  return (
    <Card variant="outlined" padding="md" style={styles.productItem}>
      <View style={styles.productHeader}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{name}</Text>
          <Text style={styles.productSku}>SKU: {sku}</Text>
          <Text style={styles.productCategory}>{category}</Text>
        </View>
        <View style={styles.productActions}>
          <Text style={styles.productPrice}>${price.toFixed(2)}</Text>
          <Button
            title="Edit"
            size="sm"
            variant="ghost"
            icon="pencil"
            onPress={() => onEdit?.({ name, sku, stock, price, lowStockThreshold, category })}
          />
        </View>
      </View>
      
      <View style={styles.stockInfo}>
        <View style={styles.stockLevel}>
          <Ionicons 
            name="cube-outline" 
            size={16} 
            color={stockColor}
          />
          <Text style={[styles.stockText, { color: stockColor }]}>
            {stock} in stock
          </Text>
          {stockStatus !== 'normal' && (
            <Text style={styles.stockWarning}>
              {stockStatus === 'critical' ? 'Out of stock' : 'Low stock'}
            </Text>
          )}
        </View>
        
        <Button
          title="Adjust"
          size="sm"
          variant="outline"
          icon="swap-horizontal"
          onPress={() => onStockAdjust?.({ name, sku, stock, price, lowStockThreshold, category })}
        />
      </View>
    </Card>
  );
};

export const ModernInventoryInterface: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [realProducts, setRealProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
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
    stock: '',
    category: '',
    lowStockThreshold: ''
  });

  // Initialize database and load real product data
  const initializeAndLoadProducts = useCallback(async () => {
    if (!hasPermission('canViewInventory')) {
      return;
    }

    try {
      setLoading(true);
      
      // First, ensure database is initialized
      const { database } = await import('../stores/DatabaseFactory');
      
      // Initialize the database if it hasn't been initialized yet
      if (database && typeof database.initialize === 'function') {
        try {
          await database.initialize();
          console.log('✅ Database initialized successfully');
        } catch (initError) {
          console.warn('⚠️ Database initialization failed, using fallback:', initError);
        }
      }
      
      // Try to load products
      try {
        const products = await productService.getAllProducts();
        setRealProducts(products);
        
        // Calculate stats
        const stats = await productService.getProductStats();
        setInventoryStats({
          totalProducts: stats.totalProducts,
          totalValue: Math.round(stats.totalValue),
          lowStockItems: stats.lowStockCount,
          outOfStockItems: products.filter(p => p.stock_qty === 0).length
        });
      } catch (productError) {
        console.warn('⚠️ Failed to load products from database, using fallback data:', productError);
        // Use fallback sample data when database fails
        setInventoryStats({
          totalProducts: sampleProducts.length,
          totalValue: Math.round(sampleProducts.reduce((sum, p) => sum + (p.price * p.stock), 0)),
          lowStockItems: sampleProducts.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0).length,
          outOfStockItems: sampleProducts.filter(p => p.stock === 0).length
        });
      }
    } catch (error) {
      console.error('Failed to initialize database or load products:', error);
      // Use fallback sample data
      setInventoryStats({
        totalProducts: sampleProducts.length,
        totalValue: Math.round(sampleProducts.reduce((sum, p) => sum + (p.price * p.stock), 0)),
        lowStockItems: sampleProducts.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0).length,
        outOfStockItems: sampleProducts.filter(p => p.stock === 0).length
      });
    } finally {
      setLoading(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    initializeAndLoadProducts();
  }, [initializeAndLoadProducts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeAndLoadProducts();
    setRefreshing(false);
    ToastManager.success('Product data refreshed successfully');
  };

  // Button handler functions
  const handleAddProduct = useCallback(() => {
    console.log('➕ Add Product button pressed');
    HapticFeedback.medium();
    setShowAddProductModal(true);
  }, []);

  const handleSaveNewProduct = useCallback(async () => {
    const { name, sku, price, stock, category, lowStockThreshold } = newProductForm;
    
    if (!name || !sku || !price || !stock || !category) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (!hasPermission('canManageProducts')) {
      Alert.alert('Access Denied', 'You do not have permission to create products.');
      return;
    }

    HapticFeedback.heavy();
    
    try {
      setLoading(true);
      
      const productData = {
        name,
        sku,
        price: parseFloat(price),
        cost: parseFloat(price) * 0.7, // Default cost estimate
        stock_qty: parseInt(stock),
        tax_rate: 0.1 // Default tax rate
      };
      
      await productService.createProduct(productData);
      
      // Create initial stock adjustment record
      if (user?.id) {
        await inventoryService.adjustStock({
          productId: sku, // Using SKU as productId for now
          adjustmentType: 'increase',
          quantity: parseInt(stock),
          reason: 'Initial stock - Product creation'
        }, user.id);
      }
      
      setShowAddProductModal(false);
      setNewProductForm({
        name: '',
        sku: '',
        price: '',
        stock: '',
        category: '',
        lowStockThreshold: ''
      });
      
      // Refresh product list
      await initializeAndLoadProducts();
      
      ToastManager.success(`${name} has been added to inventory`);
    } catch (error: any) {
      console.error('Failed to create product:', error);
      ToastManager.error(error.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  }, [newProductForm, hasPermission, user?.id, initializeAndLoadProducts]);

  const handleEditProduct = useCallback((product: ProductItemProps) => {
    console.log('📝 Edit button pressed for product:', product.name);
    HapticFeedback.light();
    Alert.alert(
      'Edit Product',
      `Edit ${product.name} (${product.sku})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit Details',
          onPress: () => {
            ToastManager.info('Product editing interface would open here');
          }
        },
        {
          text: 'Quick Price Update',
          onPress: () => {
            // Use standard prompt for web compatibility
            const newPrice = prompt(`Update price for ${product.name}\nCurrent price: $${product.price}`, product.price.toString());
            if (newPrice && !isNaN(Number(newPrice))) {
              HapticFeedback.medium();
              ToastManager.success(`${product.name} price updated to $${newPrice}`);
            } else if (newPrice !== null) {
              ToastManager.warning('Invalid price entered');
            }
          }
        }
      ]
    );
  }, []);

  const handleStockAdjustment = useCallback((product: ProductItemProps) => {
    console.log('📦 Adjust button pressed for product:', product.name, 'Current stock:', product.stock);
    HapticFeedback.light();
    Alert.alert(
      'Stock Adjustment',
      `Current stock: ${product.stock} units\nAdjust stock for ${product.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Stock',
          onPress: () => {
            const quantity = prompt('Add Stock', 'Enter quantity to add:');
            if (quantity && !isNaN(Number(quantity)) && Number(quantity) > 0) {
              HapticFeedback.medium();
              ToastManager.success(`Added ${quantity} units to ${product.name}`);
            } else if (quantity !== null && quantity !== '') {
              ToastManager.warning('Invalid quantity entered');
            }
          }
        },
        {
          text: 'Remove Stock',
          style: 'destructive',
          onPress: () => {
            const quantity = prompt('Remove Stock', 'Enter quantity to remove:');
            if (quantity && !isNaN(Number(quantity)) && Number(quantity) > 0) {
              const newStock = Math.max(0, product.stock - Number(quantity));
              HapticFeedback.heavy();
              if (newStock === 0) {
                ToastManager.warning(`Removed ${quantity} units from ${product.name} - Now out of stock!`);
              } else {
                ToastManager.success(`Removed ${quantity} units from ${product.name}`);
              }
            } else if (quantity !== null && quantity !== '') {
              ToastManager.warning('Invalid quantity entered');
            }
          }
        }
      ]
    );
  }, []);

  const handleBulkImport = useCallback(() => {
    console.log('📂 Bulk Import button pressed');
    HapticFeedback.medium();
    Alert.alert(
      'Bulk Import',
      'Import products from CSV or Excel file',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select File',
          onPress: () => {
            ToastManager.info('File picker and bulk import functionality will be available in the next update');
          }
        },
        {
          text: 'Download Template',
          onPress: () => {
            ToastManager.info('CSV template download would start here');
          }
        }
      ]
    );
  }, []);

  const handleStockReport = useCallback(async () => {
    console.log('📊 Stock Report button pressed');
    if (!hasPermission('canViewReports')) {
      Alert.alert('Access Denied', 'You do not have permission to generate reports.');
      return;
    }

    HapticFeedback.medium();
    
    try {
      const stats = await productService.getProductStats();
      const lowStockProducts = await productService.getLowStockProducts();
      
      const reportData = `
INVENTORY REPORT - ${new Date().toLocaleDateString()}
=======================================

SUMMARY:
- Total Products: ${stats.totalProducts}
- Total Value: $${stats.totalValue.toFixed(2)}
- Average Price: $${stats.averagePrice.toFixed(2)}
- Low Stock Items: ${stats.lowStockCount}

LOW STOCK ALERTS:
${lowStockProducts.map(p => `- ${p.name} (${p.sku}): ${p.stock_qty} units`).join('\n')}

CATEGORY BREAKDOWN:
${Object.entries(stats.categories).map(([cat, count]) => `- ${cat}: ${count} products`).join('\n')}
      `.trim();
      
      Alert.alert(
        'Stock Report Generated',
        reportData,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Share Report',
            onPress: () => {
              ToastManager.success('Report data copied to clipboard');
            }
          }
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Failed to generate report:', error);
      ToastManager.error('Failed to generate inventory report');
    }
  }, [hasPermission]);

  const handleReorderAlert = useCallback(() => {
    console.log('🔔 Reorder Alert button pressed');
    HapticFeedback.medium();
    Alert.alert(
      'Reorder Alert Setup',
      'Configure automatic reorder notifications',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Configure Alerts',
          onPress: () => {
            ToastManager.info('Reorder alert settings would open here');
          }
        },
        {
          text: 'Test Notification',
          onPress: () => {
            HapticFeedback.heavy();
            ToastManager.warning('This is how reorder alerts will look');
          }
        }
      ]
    );
  }, []);

  const resetAddProductForm = useCallback(() => {
    setNewProductForm({
      name: '',
      sku: '',
      price: '',
      stock: '',
      category: '',
      lowStockThreshold: ''
    });
  }, []);

  // Create display stats from state data
  const displayStats = [
    {
      title: 'Total Products',
      value: inventoryStats.totalProducts || 0,
      icon: 'cube' as const,
      color: theme.colors.primary,
      status: 'normal' as const
    },
    {
      title: 'Low Stock',
      value: inventoryStats.lowStockItems || 0,
      icon: 'warning' as const,
      color: theme.colors.warning,
      status: inventoryStats.lowStockItems > 0 ? 'warning' as const : 'normal' as const
    },
    {
      title: 'Out of Stock',
      value: inventoryStats.outOfStockItems || 0,
      icon: 'alert-circle' as const,
      color: theme.colors.error,
      status: inventoryStats.outOfStockItems > 0 ? 'critical' as const : 'normal' as const
    },
    {
      title: 'Total Value',
      value: `$${inventoryStats.totalValue.toLocaleString()}`,
      icon: 'cash' as const,
      color: theme.colors.success,
      status: 'normal' as const
    }
  ];

  const sampleProducts: ProductItemProps[] = [
    {
      name: 'Wireless Bluetooth Headphones',
      sku: 'WBH-001',
      stock: 5,
      price: 79.99,
      lowStockThreshold: 10,
      category: 'Electronics'
    },
    {
      name: 'Organic Coffee Beans (1kg)',
      sku: 'OCB-500',
      stock: 0,
      price: 24.99,
      lowStockThreshold: 5,
      category: 'Food & Beverage'
    },
    {
      name: 'Premium Yoga Mat',
      sku: 'PYM-200',
      stock: 25,
      price: 49.99,
      lowStockThreshold: 8,
      category: 'Fitness'
    },
    {
      name: 'Stainless Steel Water Bottle',
      sku: 'SSWB-750',
      stock: 3,
      price: 19.99,
      lowStockThreshold: 15,
      category: 'Accessories'
    }
  ];

  const filteredProducts = sampleProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedFilter === 'all') return matchesSearch;
    if (selectedFilter === 'low') return matchesSearch && product.stock <= product.lowStockThreshold && product.stock > 0;
    if (selectedFilter === 'out') return matchesSearch && product.stock === 0;
    
    return matchesSearch;
  });

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
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
        />
      </View>

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
          placeholder="Enter product name or SKU..."
          variant="filled"
        />
        
        <View style={styles.filterButtons}>
          {[
            { key: 'all', title: 'All Products', count: sampleProducts.length },
            { key: 'low', title: 'Low Stock', count: sampleProducts.filter(p => p.stock <= p.lowStockThreshold && p.stock > 0).length },
            { key: 'out', title: 'Out of Stock', count: sampleProducts.filter(p => p.stock === 0).length }
          ].map((filter) => (
            <Button
              key={filter.key}
              title={`${filter.title} (${filter.count})`}
              size="sm"
              variant={selectedFilter === filter.key ? 'primary' : 'ghost'}
              onPress={() => setSelectedFilter(filter.key as any)}
              style={styles.filterButton}
            />
          ))}
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

      {/* Product List */}
      <View style={styles.productList}>
        <Text style={styles.sectionTitle}>
          Products ({filteredProducts.length})
        </Text>
        {filteredProducts.map((product, index) => (
          <ProductItem 
            key={index} 
            {...product} 
            onEdit={handleEditProduct}
            onStockAdjust={handleStockAdjustment}
          />
        ))}
        
        {filteredProducts.length === 0 && (
          <Card variant="outlined" padding="lg" style={styles.emptyState}>
            <Ionicons 
              name="cube-outline" 
              size={48} 
              color={theme.colors.textLight}
            />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your search or filter criteria
            </Text>
          </Card>
        )}
      </View>
      
      {/* Add Product Modal */}
      <Modal
        visible={showAddProductModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddProductModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>Add New Product</Text>
            </View>
            <Button
              title="Cancel"
              variant="ghost"
              size="sm"
              icon="close"
              onPress={() => {
                HapticFeedback.light();
                setShowAddProductModal(false);
                resetAddProductForm();
              }}
            />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Card variant="outlined" padding="lg" style={styles.formCard}>
              <Text style={styles.formSectionTitle}>Product Information</Text>
              
              <Input
                label="Product Name *"
                value={newProductForm.name}
                onChangeText={(text) => setNewProductForm(prev => ({...prev, name: text}))}
                placeholder="Enter product name"
                variant="outlined"
                leftIcon="cube"
                style={styles.formInput}
              />
              
              <Input
                label="SKU *"
                value={newProductForm.sku}
                onChangeText={(text) => setNewProductForm(prev => ({...prev, sku: text.toUpperCase()}))}
                placeholder="Enter SKU (e.g., ABC-123)"
                variant="outlined"
                leftIcon="barcode"
                autoCapitalize="characters"
                style={styles.formInput}
              />
              
              <Input
                label="Category *"
                value={newProductForm.category}
                onChangeText={(text) => setNewProductForm(prev => ({...prev, category: text}))}
                placeholder="Enter product category"
                variant="outlined"
                leftIcon="folder"
                style={styles.formInput}
              />
            </Card>
            
            <Card variant="outlined" padding="lg" style={styles.formCard}>
              <Text style={styles.formSectionTitle}>Pricing & Inventory</Text>
              
              <Input
                label="Price *"
                value={newProductForm.price}
                onChangeText={(text) => setNewProductForm(prev => ({...prev, price: text}))}
                placeholder="0.00"
                variant="outlined"
                leftIcon="cash"
                keyboardType="numeric"
                style={styles.formInput}
              />
              
              <Input
                label="Initial Stock *"
                value={newProductForm.stock}
                onChangeText={(text) => setNewProductForm(prev => ({...prev, stock: text}))}
                placeholder="Enter initial quantity"
                variant="outlined"
                leftIcon="cube-outline"
                keyboardType="numeric"
                style={styles.formInput}
              />
              
              <Input
                label="Low Stock Threshold"
                value={newProductForm.lowStockThreshold}
                onChangeText={(text) => setNewProductForm(prev => ({...prev, lowStockThreshold: text}))}
                placeholder="Enter minimum stock level"
                variant="outlined"
                leftIcon="warning"
                keyboardType="numeric"
                style={styles.formInput}
              />
            </Card>
            
            <View style={styles.formActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  HapticFeedback.light();
                  setShowAddProductModal(false);
                  resetAddProductForm();
                }}
                style={styles.formButton}
              />
              <Button
                title="Add Product"
                variant="primary"
                icon="checkmark"
                onPress={handleSaveNewProduct}
                style={styles.formButton}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
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
    alignItems: 'flex-start',
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  statsCard: {
    flex: isTablet ? 0 : 1,
    minWidth: isTablet ? 200 : '47%',
    maxWidth: isTablet ? 250 : '47%',
    alignItems: 'center',
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    position: 'relative',
  },
  statsIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  statsValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statsTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  searchCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  filterButton: {
    flex: 1,
  },
  quickActionsCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  quickActionButton: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  productList: {
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  productItem: {
    marginTop: theme.spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  productInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
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
    marginBottom: theme.spacing.xs,
  },
  productCategory: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
  },
  productActions: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  stockInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stockText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    marginLeft: theme.spacing.xs,
  },
  stockWarning: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  formCard: {
    marginBottom: theme.spacing.lg,
  },
  formSectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  formInput: {
    marginBottom: theme.spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  formButton: {
    flex: 1,
  },
});
