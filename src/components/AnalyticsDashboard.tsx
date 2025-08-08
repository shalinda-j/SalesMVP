import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  RefreshControl
} from 'react-native';
import {
  analyticsService,
  DailySummary,
  TimeRangeAnalytics,
  ProductAnalytics
} from '../services/AnalyticsService';
import { SalesChart } from './SalesChart';
import { RecentTransactions } from './RecentTransactions';

type TimeRange = 'today' | 'week' | 'month' | 'custom';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  growth?: number;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, growth, icon }) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
    {growth !== undefined && (
      <View style={styles.growthContainer}>
        <Text style={[
          styles.growthText,
          growth >= 0 ? styles.positiveGrowth : styles.negativeGrowth
        ]}>
          {growth >= 0 ? '↗️' : '↘️'} {Math.abs(growth).toFixed(1)}%
        </Text>
      </View>
    )}
  </View>
);

interface TopProductProps {
  product: ProductAnalytics;
  rank: number;
}

const TopProductItem: React.FC<TopProductProps> = ({ product, rank }) => (
  <View style={styles.productItem}>
    <View style={styles.productRank}>
      <Text style={styles.rankText}>#{rank}</Text>
    </View>
    <View style={styles.productInfo}>
      <Text style={styles.productName}>{product.productName}</Text>
      <Text style={styles.productStats}>
        {product.totalQuantitySold} sold • ${product.totalRevenue.toFixed(2)} revenue
      </Text>
    </View>
    <View style={styles.productValue}>
      <Text style={styles.productPrice}>${product.averagePrice.toFixed(2)}</Text>
      <Text style={styles.productSales}>{product.salesCount} sales</Text>
    </View>
  </View>
);

export const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('today');
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [analytics, setAnalytics] = useState<TimeRangeAnalytics | null>(null);
  const [weekComparison, setWeekComparison] = useState<any>(null);
  const [monthComparison, setMonthComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Always load today's summary for quick stats
      const today = await analyticsService.getTodaysSummary();
      setTodaySummary(today);

      // Load analytics for selected time range
      let startDate: Date, endDate: Date;
      const now = new Date();

      switch (timeRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = now;
          break;
        default:
          startDate = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
          endDate = now;
      }

      const analyticsData = await analyticsService.getTimeRangeAnalytics(startDate, endDate);
      setAnalytics(analyticsData);

      // Load comparison data
      const weekComp = await analyticsService.getWeekOverWeekComparison();
      setWeekComparison(weekComp);

      const monthComp = await analyticsService.getMonthOverMonthComparison();
      setMonthComparison(monthComp);

    } catch (error) {
      console.error('Failed to load analytics:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const handleExportCSV = async () => {
    if (!analytics) return;

    try {
      const csvData = await analyticsService.exportAnalyticsCSV(
        analytics.startDate,
        analytics.endDate
      );

      await Share.share({
        message: csvData,
        title: `Analytics Export - ${timeRange}`
      });
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export analytics data');
    }
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const getTimeRangeLabel = (): string => {
    switch (timeRange) {
      case 'today': return "Today's Performance";
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      default: return 'Analytics';
    }
  };

  if (loading && !analytics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sales Analytics</Text>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
          <Text style={styles.exportButtonText}>📊 Export</Text>
        </TouchableOpacity>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            style={[
              styles.timeRangeButton,
              timeRange === range && styles.timeRangeButtonActive
            ]}
            onPress={() => setTimeRange(range)}
          >
            <Text style={[
              styles.timeRangeText,
              timeRange === range && styles.timeRangeTextActive
            ]}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Stats - Always show today's performance */}
      {todaySummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Sales Today"
              value={todaySummary.totalSales.toString()}
              subtitle="transactions"
              icon="📊"
            />
            <MetricCard
              title="Revenue Today"
              value={formatCurrency(todaySummary.totalRevenue)}
              subtitle="total sales"
              icon="💰"
            />
            <MetricCard
              title="Avg Transaction"
              value={formatCurrency(todaySummary.averageTransaction)}
              subtitle="per sale"
              icon="🧾"
            />
            <MetricCard
              title="Tax Collected"
              value={formatCurrency(todaySummary.totalTax)}
              subtitle="today"
              icon="🏛️"
            />
          </View>
        </View>
      )}

      {/* Main Analytics for Selected Time Range */}
      {analytics && (
        <>
          {/* Overview Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{getTimeRangeLabel()}</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                title="Total Sales"
                value={analytics.totalSales.toString()}
                subtitle="transactions"
                growth={weekComparison?.growth.sales}
                icon="📈"
              />
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(analytics.totalRevenue)}
                subtitle="gross sales"
                growth={weekComparison?.growth.revenue}
                icon="💵"
              />
              <MetricCard
                title="Avg Transaction"
                value={formatCurrency(analytics.averageTransaction)}
                subtitle="per sale"
                growth={weekComparison?.growth.averageTransaction}
                icon="📊"
              />
              <MetricCard
                title="Tax Collected"
                value={formatCurrency(analytics.totalTax)}
                subtitle="total tax"
                icon="🏛️"
              />
            </View>
          </View>

          {/* Payment Methods Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={styles.paymentMethodsContainer}>
              {Object.entries(analytics.paymentMethodBreakdown).map(([method, data]) => (
                <View key={method} style={styles.paymentMethod}>
                  <View style={styles.paymentMethodHeader}>
                    <Text style={styles.paymentMethodName}>
                      {method === 'cash' ? '💵 Cash' : 
                       method === 'card' ? '💳 Card' : '📱 Digital'}
                    </Text>
                    <Text style={styles.paymentMethodPercentage}>
                      {data.percentage.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.paymentMethodDetails}>
                    <Text style={styles.paymentMethodCount}>
                      {data.count} transactions
                    </Text>
                    <Text style={styles.paymentMethodAmount}>
                      {formatCurrency(data.amount)}
                    </Text>
                  </View>
                  <View style={[
                    styles.paymentMethodBar,
                    { width: `${data.percentage}%` }
                  ]} />
                </View>
              ))}
            </View>
          </View>

          {/* Top Products */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Selling Products</Text>
            {analytics.topProducts.length > 0 ? (
              <View style={styles.topProductsContainer}>
                {analytics.topProducts.slice(0, 5).map((product, index) => (
                  <TopProductItem
                    key={product.productId}
                    product={product}
                    rank={index + 1}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No sales data available</Text>
              </View>
            )}
          </View>

          {/* Sales Trends Chart */}
          {analytics.dailyBreakdown && analytics.dailyBreakdown.length > 0 && (
            <View style={styles.section}>
              <SalesChart
                title={`Sales Trend - ${getTimeRangeLabel()}`}
                data={analytics.dailyBreakdown.map(day => ({
                  label: new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
                  value: day.totalRevenue,
                  subtitle: `${day.totalSales} sales`
                }))}
                type="line"
                color="#28a745"
                height={200}
                showValues={true}
              />
            </View>
          )}

          {/* Growth Comparison */}
          {(weekComparison || monthComparison) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Growth Comparison</Text>
              
              {weekComparison && (
                <View style={styles.comparisonContainer}>
                  <Text style={styles.comparisonTitle}>Week over Week</Text>
                  <View style={styles.comparisonMetrics}>
                    <View style={styles.comparisonMetric}>
                      <Text style={styles.comparisonLabel}>Sales</Text>
                      <Text style={[
                        styles.comparisonValue,
                        weekComparison.growth.sales >= 0 ? styles.positiveGrowth : styles.negativeGrowth
                      ]}>
                        {weekComparison.growth.sales >= 0 ? '+' : ''}{weekComparison.growth.sales.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.comparisonMetric}>
                      <Text style={styles.comparisonLabel}>Revenue</Text>
                      <Text style={[
                        styles.comparisonValue,
                        weekComparison.growth.revenue >= 0 ? styles.positiveGrowth : styles.negativeGrowth
                      ]}>
                        {weekComparison.growth.revenue >= 0 ? '+' : ''}{weekComparison.growth.revenue.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {monthComparison && (
                <View style={styles.comparisonContainer}>
                  <Text style={styles.comparisonTitle}>Month over Month</Text>
                  <View style={styles.comparisonMetrics}>
                    <View style={styles.comparisonMetric}>
                      <Text style={styles.comparisonLabel}>Sales</Text>
                      <Text style={[
                        styles.comparisonValue,
                        monthComparison.growth.sales >= 0 ? styles.positiveGrowth : styles.negativeGrowth
                      ]}>
                        {monthComparison.growth.sales >= 0 ? '+' : ''}{monthComparison.growth.sales.toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.comparisonMetric}>
                      <Text style={styles.comparisonLabel}>Revenue</Text>
                      <Text style={[
                        styles.comparisonValue,
                        monthComparison.growth.revenue >= 0 ? styles.positiveGrowth : styles.negativeGrowth
                      ]}>
                        {monthComparison.growth.revenue >= 0 ? '+' : ''}{monthComparison.growth.revenue.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Recent Transactions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <View style={styles.recentTransactionsContainer}>
              <RecentTransactions 
                limit={5} 
                showTitle={false}
                onTransactionPress={(sale) => {
                  Alert.alert(
                    `Transaction #${sale.id.toString().padStart(4, '0')}`,
                    `Amount: $${sale.total.toFixed(2)}\n` +
                    `Items: ${sale.items.length}\n` +
                    `Payment: ${sale.paymentMethod.toUpperCase()}\n` +
                    `Status: ${sale.status}\n` +
                    `Date: ${sale.timestamp.toLocaleString()}`,
                    [{ text: 'OK' }]
                  );
                }}
              />
            </View>
          </View>
        </>
      )}
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
  },
  loadingText: {
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
  exportButton: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  timeRangeButtonActive: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  timeRangeText: {
    color: '#666',
    fontWeight: '600',
  },
  timeRangeTextActive: {
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  growthContainer: {
    marginTop: 8,
  },
  growthText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  positiveGrowth: {
    color: '#28a745',
  },
  negativeGrowth: {
    color: '#dc3545',
  },
  paymentMethodsContainer: {
    gap: 15,
  },
  paymentMethod: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  paymentMethodPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007bff',
  },
  paymentMethodDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethodCount: {
    fontSize: 14,
    color: '#666',
  },
  paymentMethodAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  paymentMethodBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    backgroundColor: '#007bff',
    borderRadius: 3,
  },
  topProductsContainer: {
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  productRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
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
  productStats: {
    fontSize: 14,
    color: '#666',
  },
  productValue: {
    alignItems: 'flex-end',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  productSales: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  comparisonContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  comparisonMetrics: {
    flexDirection: 'row',
    gap: 20,
  },
  comparisonMetric: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
  recentTransactionsContainer: {
    maxHeight: 400,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
