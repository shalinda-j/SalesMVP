import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal
} from 'react-native';
import { Product } from '../types';
import { productService } from '../services/ProductService';
import { ProductForm } from './ProductForm';

interface ProductListProps {
  onProductSelect?: (product: Product) => void;
  selectable?: boolean;
}

export const ProductList: React.FC<ProductListProps> = ({
  onProductSelect,
  selectable = false
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [stats, setStats] = useState<{
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
  } | null>(null);

  useEffect(() => {
    loadProducts();
    loadStats();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery]);

  const loadProducts = async () => {
    try {
      const productList = await productService.getAllProducts();
      setProducts(productList);
    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const productStats = await productService.getProductStats();
      setStats(productStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)
      );
      setFilteredProducts(filtered);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProducts(), loadStats()]);
    setRefreshing(false);
  };

  const handleProductPress = (product: Product) => {
    if (selectable && onProductSelect) {
      onProductSelect(product);
    } else {
      // Show product details or edit
      setEditingProduct(product);
      setShowForm(true);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleSaveProduct = (product: Product) => {
    setShowForm(false);
    setEditingProduct(null);
    handleRefresh();
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await productService.deleteProduct(product.id);
              handleRefresh();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const isLowStock = item.stock_qty <= 10;
    const profitMargin = item.price - item.cost;
    const profitPercentage = (profitMargin / item.price) * 100;

    return (
      <TouchableOpacity
        style={[styles.productItem, isLowStock && styles.lowStockItem]}
        onPress={() => handleProductPress(item)}
        onLongPress={() => !selectable && handleDeleteProduct(item)}
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productSku}>{item.sku}</Text>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            <Text style={styles.cost}>Cost: ${item.cost.toFixed(2)}</Text>
          </View>
          
          <View style={styles.stockContainer}>
            <Text style={[styles.stock, isLowStock && styles.lowStock]}>
              Stock: {item.stock_qty}
            </Text>
            {isLowStock && <Text style={styles.lowStockWarning}>⚠️ Low</Text>}
          </View>
        </View>

        <View style={styles.productFooter}>
          <Text style={styles.profit}>
            Profit: ${profitMargin.toFixed(2)} ({profitPercentage.toFixed(1)}%)
          </Text>
          {item.tax_rate > 0 && (
            <Text style={styles.tax}>
              Tax: {(item.tax_rate * 100).toFixed(1)}%
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalProducts}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>${stats.totalValue.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, stats.lowStockCount > 0 && styles.warningText]}>
              {stats.lowStockCount}
            </Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
        </View>
      )}

      {!selectable && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
          <Text style={styles.addButtonText}>+ Add Product</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.resultCount}>
        {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProductItem}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowForm(false)}
      >
        <ProductForm
          product={editingProduct || undefined}
          onSave={handleSaveProduct}
          onCancel={() => setShowForm(false)}
        />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchContainer: {
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e78b7',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  warningText: {
    color: '#e74c3c',
  },
  addButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  productItem: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  lowStockItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: 'flex-start',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  cost: {
    fontSize: 12,
    color: '#666',
  },
  stockContainer: {
    alignItems: 'flex-end',
  },
  stock: {
    fontSize: 14,
    fontWeight: '600',
  },
  lowStock: {
    color: '#e74c3c',
  },
  lowStockWarning: {
    fontSize: 10,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profit: {
    fontSize: 12,
    color: '#666',
  },
  tax: {
    fontSize: 12,
    color: '#666',
  },
});
