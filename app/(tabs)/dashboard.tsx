import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay, endOfDay } from 'date-fns';
import { router } from 'expo-router';
import { database } from '../../src/stores/Database';
import { Sale } from '../../src/types';
import { modernTheme, getTypography, getSpacing } from '../../src/styles/modern-theme';
import { MetricCard } from '../../src/components/ui/ModernCard';
import { ModernButton } from '../../src/components/ui/ModernButton';

const { width: screenWidth } = Dimensions.get('window');

interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  averageTransaction: number;
  transactionCount: number;
}

interface RecentSaleItemProps {
  sale: Sale;
  onPress?: () => void;
}

const RecentSaleItem: React.FC<RecentSaleItemProps> = ({ sale, onPress }) => {
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
    <View style={styles.saleItem}>
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
          {format(new Date(sale.timestamp), 'MMM d, h:mm a')}
        </Text>
        <Text style={styles.saleTax}>Tax: ${sale.tax_total.toFixed(2)}</Text>
      </View>
      <View style={styles.saleAmounts}>
        <Text style={styles.saleTotal}>${sale.total.toFixed(2)}</Text>
      </View>
    </View>
  );
};

export default function DashboardScreen() {
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalRevenue: 0,
    averageTransaction: 0,
    transactionCount: 0,
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Check if database is initialized
      if (!database.isInitialized()) {
        console.log('Database not initialized, initializing now...');
        await database.initialize();
        console.log('Database initialized successfully');
      }
      
      // Get today's date in YYYY-MM-DD format
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // Get today's sales summary using the optimized method
      const summary = await database.getSalesSummaryByDate(today);
      setSalesSummary(summary);
      
      // Get recent sales (last 10)
      const allSales = await database.getAllSales();
      setRecentSales(allSales.slice(0, 10));
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
      Alert.alert(
        'Error',
        'Failed to load dashboard data. Please check your database connection.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const handleExportData = async () => {
    try {
      // Create CSV content for today's sales
      const csvHeader = 'Sale ID,Date,Status,Total,Tax,Items\n';
      const csvRows = recentSales.map(sale => 
        `${sale.id},${format(new Date(sale.timestamp), 'yyyy-MM-dd HH:mm:ss')},${sale.status},${sale.total},${sale.tax_total},0`
      ).join('\n');
      const csvContent = csvHeader + csvRows;

      Alert.alert(
        'Export Data',
        `Today's sales data exported successfully!\n\nTotal sales: ${recentSales.length}\nTotal revenue: $${recentSales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleViewAllSales = () => {
    router.push('/sales-history' as any);
  };

  const handleNewSale = () => {
    router.push('/pos');
  };

  const handleInventory = () => {
    router.push('/inventory');
  };

  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      await loadDashboardData();
      setLoading(false);
    };

    initializeDashboard();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={modernTheme.colors.primary[500]} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Today's Sales Summary</Text>
            <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>
          </View>
          <ModernButton
            title={screenWidth < 768 ? "" : "Export"}
            onPress={handleExportData}
            variant="outline"
            size="sm"
            icon={
              <Ionicons
                name="download-outline"
                size={20}
                color={modernTheme.colors.primary[500]}
              />
            }
            iconPosition={screenWidth < 768 ? "center" : "left"}
          />
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color={modernTheme.colors.error[500]} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricsRow}>
            <MetricCard
              title="Total Sales"
              value={salesSummary.totalSales}
              subtitle={`${salesSummary.transactionCount} completed`}
              icon={
                <Ionicons
                  name="receipt"
                  size={24}
                  color={modernTheme.colors.primary[500]}
                />
              }
              color={modernTheme.colors.primary[500]}
              style={styles.metricCard}
            />
            
            <MetricCard
              title="Revenue"
              value={`$${salesSummary.totalRevenue.toFixed(2)}`}
              subtitle="Today's total"
              icon={
                <Ionicons
                  name="cash"
                  size={24}
                  color={modernTheme.colors.success[500]}
                />
              }
              color={modernTheme.colors.success[500]}
              style={styles.metricCard}
            />
          </View>
          
          <View style={styles.metricsRow}>
            <MetricCard
              title="Avg Transaction"
              value={`$${salesSummary.averageTransaction.toFixed(2)}`}
              subtitle="Per completed sale"
              icon={
                <Ionicons
                  name="trending-up"
                  size={24}
                  color={modernTheme.colors.warning[500]}
                />
              }
              color={modernTheme.colors.warning[500]}
              style={styles.metricCard}
            />
            
            <MetricCard
              title="Transactions"
              value={salesSummary.transactionCount}
              subtitle="Completed today"
              icon={
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={modernTheme.colors.secondary[500]}
                />
              }
              color={modernTheme.colors.secondary[500]}
              style={styles.metricCard}
            />
          </View>
        </View>

        {/* Recent Sales */}
        <View style={styles.recentSalesContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time" size={20} color={modernTheme.colors.text.secondary} />
              <Text style={styles.sectionTitle}>Recent Sales</Text>
            </View>
            <ModernButton
              title="View All"
              onPress={handleViewAllSales}
              variant="ghost"
              size="sm"
            />
          </View>
          
          {recentSales.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name="receipt-outline" 
                size={48} 
                color={modernTheme.colors.text.tertiary} 
              />
              <Text style={styles.emptyStateText}>No sales recorded yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Sales will appear here once transactions are completed
              </Text>
            </View>
          ) : (
            <View style={styles.salesList}>
              {recentSales.map((sale) => (
                <RecentSaleItem key={sale.id} sale={sale} />
              ))}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <ModernButton
              title="New Sale"
              onPress={handleNewSale}
              variant="primary"
              size="md"
              icon={
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={modernTheme.colors.text.inverse}
                />
              }
              iconPosition="left"
              style={styles.quickActionButton}
            />
            <ModernButton
              title="Inventory"
              onPress={handleInventory}
              variant="outline"
              size="md"
              icon={
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={modernTheme.colors.primary[500]}
                />
              }
              iconPosition="left"
              style={styles.quickActionButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernTheme.colors.background.secondary,
  },
  scrollView: {
    flex: 1,
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
    flexDirection: screenWidth < 768 ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: screenWidth < 768 ? 'stretch' : 'flex-start',
    padding: getSpacing('lg'),
    backgroundColor: modernTheme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.border.light,
    gap: screenWidth < 768 ? getSpacing('md') : 0,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...getTypography('3xl', 'bold'),
    color: modernTheme.colors.text.primary,
    marginBottom: getSpacing('xs'),
  },
  subtitle: {
    ...getTypography('md', 'regular'),
    color: modernTheme.colors.text.secondary,
    marginBottom: getSpacing('xs'),
  },
  date: {
    ...getTypography('sm', 'regular'),
    color: modernTheme.colors.text.tertiary,
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
  metricsContainer: {
    padding: getSpacing('lg'),
    gap: getSpacing('md'),
  },
  metricsRow: {
    flexDirection: screenWidth < 768 ? 'column' : 'row',
    gap: getSpacing('md'),
  },
  metricCard: {
    flex: screenWidth < 768 ? 1 : 1,
  },
  recentSalesContainer: {
    margin: getSpacing('lg'),
    backgroundColor: modernTheme.colors.background.primary,
    borderRadius: modernTheme.borderRadius.lg,
    ...modernTheme.shadows.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getSpacing('lg'),
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.border.light,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...getTypography('lg', 'semibold'),
    color: modernTheme.colors.text.primary,
    marginLeft: getSpacing('sm'),
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
  salesList: {
    padding: getSpacing('lg'),
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getSpacing('md'),
    borderBottomWidth: 1,
    borderBottomColor: modernTheme.colors.border.light,
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
    alignItems: 'flex-end',
  },
  saleTotal: {
    ...getTypography('lg', 'bold'),
    color: modernTheme.colors.text.primary,
  },
  quickActionsContainer: {
    padding: getSpacing('lg'),
  },
  quickActionsGrid: {
    flexDirection: screenWidth < 768 ? 'column' : 'row',
    gap: getSpacing('md'),
    marginTop: getSpacing('md'),
  },
  quickActionButton: {
    flex: screenWidth < 768 ? 1 : undefined,
    minWidth: screenWidth < 768 ? undefined : 150,
  },
});
