import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay, endOfDay } from 'date-fns';
import { database } from '../../src/stores/Database';
import { Sale } from '../../src/types';

interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  averageTransaction: number;
  transactionCount: number;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color 
}) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <View style={styles.metricHeader}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
  </View>
);

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
      
      // Initialize database if not already done
      await database.initialize();
      
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

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
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Today's Sales Summary</Text>
        <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={24} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Metrics Grid */}
      <View style={styles.metricsContainer}>
        <MetricCard
          title="Total Sales"
          value={salesSummary.totalSales}
          subtitle={`${salesSummary.transactionCount} completed`}
          icon="receipt"
          color="#007AFF"
        />
        
        <MetricCard
          title="Revenue"
          value={`$${salesSummary.totalRevenue.toFixed(2)}`}
          subtitle="Today's total"
          icon="cash"
          color="#34C759"
        />
        
        <MetricCard
          title="Avg Transaction"
          value={`$${salesSummary.averageTransaction.toFixed(2)}`}
          subtitle="Per completed sale"
          icon="trending-up"
          color="#FF9500"
        />
        
        <MetricCard
          title="Transactions"
          value={salesSummary.transactionCount}
          subtitle="Completed today"
          icon="checkmark-circle"
          color="#5856D6"
        />
      </View>

      {/* Recent Sales */}
      <View style={styles.recentSalesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <Ionicons name="time" size={20} color="#8E8E93" />
        </View>
        
        {recentSales.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyStateText}>No sales recorded yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Sales will appear here once transactions are completed
            </Text>
          </View>
        ) : (
          <View style={styles.salesList}>
            {recentSales.map((sale) => (
              <View key={sale.id} style={styles.saleItem}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleId}>Sale #{sale.id}</Text>
                  <Text style={styles.saleTime}>
                    {format(new Date(sale.timestamp), 'h:mm a')}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(sale.status) }
                  ]}>
                    <Text style={styles.statusText}>{sale.status}</Text>
                  </View>
                </View>
                <View style={styles.saleAmounts}>
                  <Text style={styles.saleTotal}>${sale.total.toFixed(2)}</Text>
                  <Text style={styles.saleTax}>Tax: ${sale.tax_total.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStatusColor = (status: Sale['status']): string => {
  switch (status) {
    case 'completed':
      return '#34C759';
    case 'pending':
      return '#FF9500';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#8E8E93',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#FF3B30',
    flex: 1,
  },
  metricsContainer: {
    padding: 16,
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
  },
  recentSalesContainer: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    marginTop: 8,
  },
  salesList: {
    padding: 16,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  saleInfo: {
    flex: 1,
  },
  saleId: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  saleTime: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  saleAmounts: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  saleTax: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
