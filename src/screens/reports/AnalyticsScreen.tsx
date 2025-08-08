import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { AnalyticsDashboard } from '../../components/AnalyticsDashboard';
import { analyticsService, AnalyticsService } from '../../services/AnalyticsService';
import { demoService } from '../../services/DemoService';
import {
  SalesAnalytics,
  ProductAnalytics,
  InventoryAnalytics,
  FinancialAnalytics,
  CustomerAnalytics,
  KPIMetric,
  TimePeriod,
  PeriodType
} from '../../types/Analytics';

const { width } = Dimensions.get('window');

interface AnalyticsScreenState {
  isLoading: boolean;
  refreshing: boolean;
  isDemoMode: boolean;
  selectedPeriod: TimePeriod;
  salesAnalytics: SalesAnalytics | null;
  productAnalytics: ProductAnalytics[];
  inventoryAnalytics: InventoryAnalytics | null;
  financialAnalytics: FinancialAnalytics | null;
  customerAnalytics: CustomerAnalytics | null;
  kpiMetrics: KPIMetric[];
  error: string | null;
}

export const AnalyticsScreen: React.FC = () => {
  const [state, setState] = useState<AnalyticsScreenState>({
    isLoading: true,
    refreshing: false,
    isDemoMode: false,
    selectedPeriod: AnalyticsService.createPeriod(PeriodType.MONTH),
    salesAnalytics: null,
    productAnalytics: [],
    inventoryAnalytics: null,
    financialAnalytics: null,
    customerAnalytics: null,
    kpiMetrics: [],
    error: null
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [state.selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const [
        salesData,
        productData,
        inventoryData,
        financialData,
        customerData,
        kpiData
      ] = await Promise.all([
        analyticsService.getSalesAnalytics(state.selectedPeriod),
        analyticsService.getProductAnalytics(state.selectedPeriod, 10),
        analyticsService.getInventoryAnalytics(),
        analyticsService.getFinancialAnalytics(state.selectedPeriod),
        analyticsService.getCustomerAnalytics(state.selectedPeriod),
        analyticsService.getKPIMetrics(state.selectedPeriod)
      ]);

      setState(prev => ({
        ...prev,
        salesAnalytics: salesData,
        productAnalytics: productData,
        inventoryAnalytics: inventoryData,
        financialAnalytics: financialData,
        customerAnalytics: customerData,
        kpiMetrics: kpiData,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load analytics data',
        isLoading: false
      }));
    }
  };

  const handleRefresh = async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadAnalyticsData();
    setState(prev => ({ ...prev, refreshing: false }));
  };

  const toggleDemoMode = async () => {
    try {
      if (!state.isDemoMode) {
        await demoService.setupDemoData();
      } else {
        await demoService.tearDownDemoData();
      }
      
      setState(prev => ({ ...prev, isDemoMode: !prev.isDemoMode }));
      await loadAnalyticsData();
    } catch (error) {
      Alert.alert('Demo Mode Error', 'Failed to toggle demo mode');
    }
  };

  const changePeriod = (periodType: PeriodType, offset: number = 0) => {
    const newPeriod = AnalyticsService.createPeriod(periodType, offset);
    setState(prev => ({ ...prev, selectedPeriod: newPeriod }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const renderKPICard = (kpi: KPIMetric) => (
    <View key={kpi.id} style={styles.kpiCard}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiIcon}>{kpi.icon}</Text>
        <Text style={styles.kpiName}>{kpi.name}</Text>
      </View>
      <Text style={styles.kpiValue}>
        {kpi.unit === '$' ? formatCurrency(kpi.value) : 
         kpi.unit === '%' ? formatPercent(kpi.value) : 
         kpi.value.toLocaleString()}
        {kpi.unit && kpi.unit !== '$' && kpi.unit !== '%' && ` ${kpi.unit}`}
      </Text>
      {kpi.change_percentage !== 0 && (
        <View style={[styles.kpiChange, kpi.trend === 'up' ? styles.positive : styles.negative]}>
          <Text style={styles.kpiChangeText}>
            {kpi.trend === 'up' ? '↗️' : kpi.trend === 'down' ? '↘️' : '➡️'} {formatPercent(Math.abs(kpi.change_percentage))}
          </Text>
        </View>
      )}
      <Text style={styles.kpiDescription}>{kpi.description}</Text>
    </View>
  );

  const renderSalesSection = () => {
    if (!state.salesAnalytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Sales Performance</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Sales</Text>
            <Text style={styles.metricValue}>{formatCurrency(state.salesAnalytics.total_sales)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Transactions</Text>
            <Text style={styles.metricValue}>{state.salesAnalytics.total_transactions}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Avg Transaction</Text>
            <Text style={styles.metricValue}>{formatCurrency(state.salesAnalytics.average_transaction_value)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Growth Rate</Text>
            <Text style={[
              styles.metricValue,
              state.salesAnalytics.growth_rate >= 0 ? styles.positive : styles.negative
            ]}>
              {formatPercent(state.salesAnalytics.growth_rate)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTopProductsSection = () => {
    if (state.productAnalytics.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏆 Top Products</Text>
        {state.productAnalytics.slice(0, 5).map((product) => (
          <View key={product.product_id} style={styles.productItem}>
            <View style={styles.productRank}>
              <Text style={styles.rankText}>#{product.rank}</Text>
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.product_name}</Text>
              <Text style={styles.productDetails}>
                {product.total_sold} sold • {formatCurrency(product.total_revenue)} revenue
              </Text>
            </View>
            <View style={styles.productMetrics}>
              <Text style={styles.productProfit}>{formatPercent(product.profit_margin)}</Text>
              <Text style={styles.productProfitLabel}>Margin</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderFinancialSection = () => {
    if (!state.financialAnalytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Financial Overview</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Revenue</Text>
            <Text style={styles.metricValue}>{formatCurrency(state.financialAnalytics.total_revenue)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Gross Profit</Text>
            <Text style={styles.metricValue}>{formatCurrency(state.financialAnalytics.gross_profit)}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Net Margin</Text>
            <Text style={styles.metricValue}>{formatPercent(state.financialAnalytics.net_margin)}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>ROI</Text>
            <Text style={styles.metricValue}>{formatPercent(state.financialAnalytics.roi)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderInventorySection = () => {
    if (!state.inventoryAnalytics) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📦 Inventory Insights</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Total Products</Text>
            <Text style={styles.metricValue}>{state.inventoryAnalytics.total_products}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Stock Value</Text>
            <Text style={styles.metricValue}>{formatCurrency(state.inventoryAnalytics.total_stock_value)}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Low Stock</Text>
            <Text style={[styles.metricValue, styles.warning]}>{state.inventoryAnalytics.low_stock_items}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Out of Stock</Text>
            <Text style={[styles.metricValue, styles.danger]}>{state.inventoryAnalytics.out_of_stock_items}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (state.isLoading && !state.refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading analytics data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Analytics & Reporting</Text>
        <View style={styles.demoToggle}>
          <Text style={styles.demoLabel}>Demo Mode</Text>
          <Switch
            value={state.isDemoMode}
            onValueChange={toggleDemoMode}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={state.isDemoMode ? '#007bff' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <Text style={styles.periodLabel}>Period: {state.selectedPeriod.label}</Text>
        <View style={styles.periodButtons}>
          <TouchableOpacity 
            style={styles.periodButton} 
            onPress={() => changePeriod(PeriodType.DAY)}
          >
            <Text style={styles.periodButtonText}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.periodButton} 
            onPress={() => changePeriod(PeriodType.WEEK)}
          >
            <Text style={styles.periodButtonText}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.periodButton} 
            onPress={() => changePeriod(PeriodType.MONTH)}
          >
            <Text style={styles.periodButtonText}>This Month</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Display */}
      {state.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{state.error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAnalyticsData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* KPI Cards */}
      {state.kpiMetrics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Key Metrics</Text>
          <View style={styles.kpiGrid}>
            {state.kpiMetrics.map(renderKPICard)}
          </View>
        </View>
      )}

      {/* Analytics Sections */}
      {renderSalesSection()}
      {renderTopProductsSection()}
      {renderFinancialSection()}
      {renderInventorySection()}

      {/* Legacy Dashboard Component */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Detailed Dashboard</Text>
        <AnalyticsDashboard />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  demoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  demoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  periodSelector: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007bff',
    borderRadius: 6,
    alignItems: 'center',
  },
  periodButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#fff3cd',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#856404',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: (width - 64) / 2,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  kpiIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  kpiName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  kpiChange: {
    marginBottom: 8,
  },
  kpiChangeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  kpiDescription: {
    fontSize: 12,
    color: '#999',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  productRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productDetails: {
    fontSize: 14,
    color: '#666',
  },
  productMetrics: {
    alignItems: 'flex-end',
  },
  productProfit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  productProfitLabel: {
    fontSize: 12,
    color: '#999',
  },
  positive: {
    color: '#28a745',
  },
  negative: {
    color: '#dc3545',
  },
  warning: {
    color: '#ffc107',
  },
  danger: {
    color: '#dc3545',
  },
});
