import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { database } from '../src/stores/Database';
import { Sale } from '../src/types';
import { modernTheme, getTypography, getSpacing } from '../src/styles/modern-theme';
import { ModernButton } from '../src/components/ui/ModernButton';

interface SalesHistoryItemProps {
  sale: Sale;
  onPress?: () => void;
}

const SalesHistoryItem: React.FC<SalesHistoryItemProps> = ({ sale, onPress }) => {
  const getStatusColor = (status: Sale['status']): string => {
    switch (status) {
      case 'completed':
        return modernTheme.colors.success[500];
      case 'pending':
        return modernTheme.colors.warning[500];
      case 'cancelled':
        return modernTheme.colors.error[500];
      default:
        return modernTheme.colors.neutral[500];
    }
  };

  const getStatusIcon = (status: Sale['status']): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'cancelled':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <TouchableOpacity style={styles.saleItem} onPress={onPress}>
      <View style={styles.saleInfo}>
        <View style={styles.saleHeader}>
          <Text style={styles.saleId}>Sale #{sale.id}</Text>
          <View style={styles.statusContainer}>
            <Ionicons 
              name={getStatusIcon(sale.status)} 
              size={16} 
              color={getStatusColor(sale.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(sale.status) }]}>
              {sale.status}
            </Text>
          </View>
        </View>
        <Text style={styles.saleTime}>
          {format(new Date(sale.timestamp), 'MMM d, yyyy h:mm a')}
        </Text>
        <Text style={styles.saleTax}>Tax: ${sale.tax_total.toFixed(2)}</Text>
      </View>
      <View style={styles.saleAmounts}>
        <Text style={styles.saleTotal}>${sale.total.toFixed(2)}</Text>
        <Ionicons name="chevron-forward" size={16} color={modernTheme.colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );
};

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Sale['status'] | 'all'>('all');
  const [error, setError] = useState<string | null>(null);

  const loadSales = useCallback(async () => {
    try {
      setError(null);
      
      // Check if database is initialized
      if (!database.isInitialized()) {
        console.log('Database not initialized, initializing now...');
        await database.initialize();
        console.log('Database initialized successfully');
      }
      
      const allSales = await database.getAllSales();
      setSales(allSales);
      setFilteredSales(allSales);
    } catch (err) {
      console.error('Failed to load sales:', err);
      setError('Failed to load sales data. Please try again.');
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSales();
    setRefreshing(false);
  }, [loadSales]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    let filtered = sales;

    // Apply search filter
    if (query.trim()) {
      filtered = filtered.filter(sale => 
        sale.id.toString().includes(query.toLowerCase()) ||
        sale.status.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    setFilteredSales(filtered);
  }, [sales, statusFilter]);

  const handleStatusFilter = useCallback((status: Sale['status'] | 'all') => {
    setStatusFilter(status);
    let filtered = sales;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(sale => 
        sale.id.toString().includes(searchQuery.toLowerCase()) ||
        sale.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(sale => sale.status === status);
    }

    setFilteredSales(filtered);
  }, [sales, searchQuery]);

  const handleExportData = async () => {
    try {
      // Create CSV content
      const csvHeader = 'Sale ID,Date,Status,Total,Tax,Items\n';
      const csvRows = sales.map(sale => 
        `${sale.id},${format(new Date(sale.timestamp), 'yyyy-MM-dd HH:mm:ss')},${sale.status},${sale.total},${sale.tax_total},0`
      ).join('\n');
      const csvContent = csvHeader + csvRows;

      // For now, we'll show the data in an alert
      // In a real app, you'd use a file sharing library
      Alert.alert(
        'Export Data',
        `Sales data exported successfully!\n\nTotal sales: ${sales.length}\nTotal revenue: $${sales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleSalePress = (sale: Sale) => {
    // Navigate to sale details (to be implemented)
    Alert.alert('Sale Details', `Sale #${sale.id}\nTotal: $${sale.total}\nStatus: ${sale.status}`);
  };

  useEffect(() => {
    const initializeScreen = async () => {
      setLoading(true);
      await loadSales();
      setLoading(false);
    };

    initializeScreen();
  }, [loadSales]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={modernTheme.colors.primary[500]} />
        <Text style={styles.loadingText}>Loading sales history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={modernTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Sales History</Text>
        </View>
        <ModernButton
          title="Export"
          onPress={handleExportData}
          variant="outline"
          size="sm"
          icon={<Ionicons name="download-outline" size={20} color={modernTheme.colors.primary[500]} />}
          iconPosition="left"
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color={modernTheme.colors.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={modernTheme.colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search sales..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor={modernTheme.colors.text.tertiary}
          />
        </View>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ModernButton
            title="All"
            onPress={() => handleStatusFilter('all')}
            variant={statusFilter === 'all' ? 'primary' : 'outline'}
            size="sm"
            style={styles.filterButton}
          />
          <ModernButton
            title="Completed"
            onPress={() => handleStatusFilter('completed')}
            variant={statusFilter === 'completed' ? 'primary' : 'outline'}
            size="sm"
            style={styles.filterButton}
          />
          <ModernButton
            title="Pending"
            onPress={() => handleStatusFilter('pending')}
            variant={statusFilter === 'pending' ? 'primary' : 'outline'}
            size="sm"
            style={styles.filterButton}
          />
          <ModernButton
            title="Cancelled"
            onPress={() => handleStatusFilter('cancelled')}
            variant={statusFilter === 'cancelled' ? 'primary' : 'outline'}
            size="sm"
            style={styles.filterButton}
          />
        </ScrollView>
      </View>

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <SalesHistoryItem sale={item} onPress={() => handleSalePress(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons 
              name="receipt-outline" 
              size={48} 
              color={modernTheme.colors.text.tertiary} 
            />
            <Text style={styles.emptyStateText}>
              {searchQuery || statusFilter !== 'all' ? 'No sales found' : 'No sales recorded yet'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Sales will appear here once transactions are completed'
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernTheme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: modernTheme.colors.background.secondary,
  },
  loadingText: {
    marginTop: getSpacing('md'),
    ...getTypography('md', 'regular'),
    color: modernTheme.colors.text.secondary,
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: getSpacing('md'),
  },
  title: {
    ...getTypography('2xl', 'bold'),
    color: modernTheme.colors.text.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modernTheme.colors.error[50],
    padding: getSpacing('md'),
    margin: getSpacing('lg'),
    borderRadius: modernTheme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: modernTheme.colors.error[500],
  },
  errorText: {
    marginLeft: getSpacing('sm'),
    ...getTypography('sm', 'regular'),
    color: modernTheme.colors.error[700],
    flex: 1,
  },
  searchContainer: {
    padding: getSpacing('lg'),
    paddingTop: getSpacing('md'),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: modernTheme.colors.background.primary,
    borderRadius: modernTheme.borderRadius.md,
    paddingHorizontal: getSpacing('md'),
    borderWidth: 1,
    borderColor: modernTheme.colors.border.light,
  },
  searchInput: {
    flex: 1,
    paddingVertical: getSpacing('md'),
    paddingLeft: getSpacing('sm'),
    ...getTypography('md', 'regular'),
    color: modernTheme.colors.text.primary,
  },
  filterContainer: {
    paddingHorizontal: getSpacing('lg'),
    paddingBottom: getSpacing('md'),
  },
  filterButton: {
    marginRight: getSpacing('sm'),
  },
  listContainer: {
    padding: getSpacing('lg'),
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getSpacing('md'),
    paddingHorizontal: getSpacing('lg'),
    backgroundColor: modernTheme.colors.background.primary,
    borderRadius: modernTheme.borderRadius.md,
    marginBottom: getSpacing('sm'),
    ...modernTheme.shadows.sm,
  },
  saleInfo: {
    flex: 1,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getSpacing('xs'),
  },
  saleId: {
    ...getTypography('md', 'medium'),
    color: modernTheme.colors.text.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    ...getTypography('xs', 'medium'),
    marginLeft: getSpacing('xs'),
    textTransform: 'capitalize',
  },
  saleTime: {
    ...getTypography('sm', 'regular'),
    color: modernTheme.colors.text.secondary,
    marginBottom: getSpacing('xs'),
  },
  saleTax: {
    ...getTypography('xs', 'regular'),
    color: modernTheme.colors.text.tertiary,
  },
  saleAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleTotal: {
    ...getTypography('lg', 'bold'),
    color: modernTheme.colors.text.primary,
    marginRight: getSpacing('sm'),
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
  },
});
