import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Product } from '../types';
import { productService } from '../services/ProductService';
import { BarcodeScanner } from './BarcodeScanner';

interface EnhancedProductSearchProps {
  visible: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  onAddManualProduct?: () => void;
  placeholder?: string;
  title?: string;
}

export const EnhancedProductSearch: React.FC<EnhancedProductSearchProps> = ({
  visible,
  onClose,
  onProductSelect,
  onAddManualProduct,
  placeholder = "Search products by name or SKU...",
  title = "Search Products"
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [searchMode, setSearchMode] = useState<'all' | 'search'>('all');
  
  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (visible) {
      loadProducts();
      setSearchQuery('');
      setSearchMode('all');
    }
  }, [visible]);

  useEffect(() => {
    // Debounce search when query changes
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const allProducts = await productService.getAllProducts();
      setProducts(allProducts);
      setFilteredProducts(allProducts);
    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const performSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
      setSearchMode('all');
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.sku.toLowerCase() === query // Exact SKU match
    );

    setFilteredProducts(filtered);
    setSearchMode('search');
  };

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    onClose();
  };

  const handleBarcodeScanned = (barcode: string) => {
    // Set the barcode as search query to trigger search
    setSearchQuery(barcode);
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productItem}
      onPress={() => handleProductSelect(item)}
    >
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productSku}>SKU: {item.sku}</Text>
        <View style={styles.productDetails}>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          <Text style={styles.productStock}>Stock: {item.stock_qty}</Text>
        </View>
      </View>
      <View style={styles.selectButton}>
        <Text style={styles.selectButtonText}>Select</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#27ae60" />
          <Text style={styles.emptyText}>Loading products...</Text>
        </View>
      );
    }

    if (searchMode === 'search' && filteredProducts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found</Text>
          <Text style={styles.emptySubtext}>
            Try searching with different keywords or scan a barcode
          </Text>
          {onAddManualProduct && (
            <TouchableOpacity
              style={styles.addManualButton}
              onPress={() => {
                onClose();
                onAddManualProduct();
              }}
            >
              <Text style={styles.addManualButtonText}>Add Manual Product</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products in catalog</Text>
          <Text style={styles.emptySubtext}>
            Add products to your inventory first
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Search Controls */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder={placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
            
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => setShowScanner(true)}
            >
              <Text style={styles.scanButtonText}>📷 Scan</Text>
            </TouchableOpacity>
          </View>

          {/* Search Results Info */}
          {searchMode === 'search' && (
            <View style={styles.searchInfo}>
              <Text style={styles.searchInfoText}>
                {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''} for "{searchQuery}"
              </Text>
              {filteredProducts.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>Show All</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Product List */}
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.productList}
            contentContainerStyle={filteredProducts.length === 0 ? styles.emptyListContainer : undefined}
            ListEmptyComponent={renderEmptyState()}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />

          {/* Action Buttons */}
          {onAddManualProduct && (
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={styles.manualProductButton}
                onPress={() => {
                  onClose();
                  onAddManualProduct();
                }}
              >
                <Text style={styles.manualProductButtonText}>
                  + Add Manual Product
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cancelButton: {
    minWidth: 60,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    minWidth: 60,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  scanButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInfoText: {
    fontSize: 14,
    color: '#666',
  },
  clearSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  productList: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  emptyListContainer: {
    flex: 1,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  productStock: {
    fontSize: 12,
    color: '#666',
  },
  selectButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  selectButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addManualButton: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  addManualButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionBar: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  manualProductButton: {
    backgroundColor: '#17a2b8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualProductButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
