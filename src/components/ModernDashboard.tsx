import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { database } from '../stores/Database';
import { Sale } from '../types';
import { theme } from '../styles/theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  isTablet,
  isMobile,
  isSmallMobile,
  getGridColumns,
  wp,
  hp,
  responsiveFont,
  responsiveSpacing,
} from '../utils/responsive';

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
  change?: {
    value: number;
    isPositive: boolean;
  };
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color,
  change 
}) => (
  <Card variant="elevated" padding="lg" style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      {change && (
        <View style={styles.changeIndicator}>
          <Ionicons 
            name={change.isPositive ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={change.isPositive ? theme.colors.success : theme.colors.error} 
          />
          <Text style={[
            styles.changeText,
            { color: change.isPositive ? theme.colors.success : theme.colors.error }
          ]}>
            {Math.abs(change.value)}%
          </Text>
        </View>
      )}
    </View>
    
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
  </Card>
);

interface QuickActionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, icon, color, onPress }) => (
  <Card variant="outlined" padding="lg" style={styles.quickAction} onPress={onPress}>
    <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.quickActionTitle}>{title}</Text>
  </Card>
);

export const ModernDashboard: React.FC = () => {
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
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const loadDashboardData = useCallback(async () => {
    try {
      setError(null);
      await database.initialize();
      const today = format(new Date(), 'yyyy-MM-dd');
      const summary = await database.getSalesSummaryByDate(today);
      setSalesSummary(summary);
      const allSales = await database.getAllSales();
      setRecentSales(allSales.slice(0, 5));
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

  const metrics = [
    {
      title: "Today's Sales",
      value: `$${salesSummary.totalRevenue.toFixed(2)}`,
      subtitle: `From ${salesSummary.transactionCount} transactions`,
      icon: 'cash' as const,
      color: theme.colors.success,
    },
    {
      title: 'Avg. Order Value',
      value: `$${salesSummary.averageTransaction.toFixed(2)}`,
      subtitle: 'Per transaction',
      icon: 'trending-up' as const,
      color: theme.colors.warning,
    },
    {
      title: 'Total Transactions',
      value: salesSummary.transactionCount,
      subtitle: 'Today',
      icon: 'receipt' as const,
      color: theme.colors.primary,
    },
    {
      title: 'Customers',
      value: '89', // This is still hardcoded as we don't have customer data yet
      subtitle: 'Today',
      icon: 'people' as const,
      color: theme.colors.secondary,
    },
  ];

  const quickActions = [
    {
      title: 'New Sale',
      icon: 'add-circle' as const,
      color: theme.colors.success,
      onPress: () => {}
    },
    {
      title: 'Add Product',
      icon: 'cube' as const,
      color: theme.colors.primary,
      onPress: () => {}
    },
    {
      title: 'View Reports',
      icon: 'bar-chart' as const,
      color: theme.colors.secondary,
      onPress: () => {}
    },
    {
      title: 'Settings',
      icon: 'settings' as const,
      color: theme.colors.textSecondary,
      onPress: () => {}
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        <View>
          <Text style={styles.greeting}>Good afternoon!</Text>
          <Text style={styles.subtitle}>Here's what's happening in your business</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            title="Export"
            size="sm"
            variant="outline"
            icon="download-outline"
            onPress={() => {}}
          />
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month'] as const).map((period) => (
          <Button
            key={period}
            title={period.charAt(0).toUpperCase() + period.slice(1)}
            size="sm"
            variant={selectedPeriod === period ? 'primary' : 'ghost'}
            onPress={() => setSelectedPeriod(period)}
            style={styles.periodButton}
          />
        ))}
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </View>

      {/* Quick Actions */}
      <Card variant="glass" padding="lg" style={styles.quickActionsCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <QuickAction key={index} {...action} />
          ))}
        </View>
      </Card>

      {/* Recent Sales */}
      <Card variant="elevated" padding="none" style={styles.recentSalesCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <Button
            title="View All"
            size="sm"
            variant="ghost"
            icon="chevron-forward"
            onPress={() => {}}
          />
        </View>

        {recentSales.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={theme.colors.textLight} />
            <Text style={styles.emptyStateText}>No sales recorded yet</Text>
          </View>
        ) : (
          <View style={styles.salesList}>
            {recentSales.map((sale) => (
              <View key={sale.id} style={styles.saleItem}>
                <View style={styles.saleInfo}>
                  <Text style={styles.customerName}>Sale #{sale.id}</Text>
                  <Text style={styles.saleDetails}>
                    {format(new Date(sale.timestamp), 'h:mm a')}
                  </Text>
                </View>
                <Text style={styles.saleAmount}>${sale.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Sales Chart Placeholder */}
      <Card variant="elevated" padding="lg" style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Sales Trend</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons 
            name="bar-chart-outline" 
            size={48} 
            color={theme.colors.textLight}
          />
          <Text style={styles.chartPlaceholderText}>
            Chart visualization will appear here
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: isSmallMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isSmallMobile ? 'flex-start' : 'flex-start',
    padding: responsiveSpacing(theme.spacing.xl),
    paddingBottom: responsiveSpacing(theme.spacing.lg),
    gap: isSmallMobile ? responsiveSpacing(theme.spacing.md) : 0,
  },
  greeting: {
    fontSize: responsiveFont(theme.fontSize.xxl),
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: responsiveFont(theme.fontSize.md),
    color: theme.colors.textSecondary,
    marginTop: responsiveSpacing(theme.spacing.xs),
  },
  headerActions: {
    flexDirection: 'row',
    gap: responsiveSpacing(theme.spacing.sm),
  },
  periodSelector: {
    flexDirection: 'row',
    gap: responsiveSpacing(theme.spacing.sm),
    paddingHorizontal: responsiveSpacing(theme.spacing.xl),
    marginBottom: responsiveSpacing(theme.spacing.lg),
  },
  periodButton: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: responsiveSpacing(theme.spacing.md),
    paddingHorizontal: responsiveSpacing(theme.spacing.xl),
    marginBottom: responsiveSpacing(theme.spacing.lg),
  },
  metricCard: {
    flex: isSmallMobile ? 1 : isTablet ? 0 : 1,
    minWidth: isSmallMobile ? '100%' : isTablet ? wp(22) : '47%',
    maxWidth: isSmallMobile ? '100%' : isTablet ? wp(25) : '47%',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  changeText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
  },
  metricTitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  metricValue: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    marginBottom: theme.spacing.xs,
  },
  metricSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textLight,
  },
  quickActionsCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickAction: {
    flex: isTablet ? 0 : 1,
    minWidth: isTablet ? 150 : '47%',
    maxWidth: isTablet ? 200 : '47%',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  quickActionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
    textAlign: 'center',
  },
  recentSalesCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  salesList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  saleInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  saleDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  saleAmount: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.success,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  chartCard: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  chartPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  chartPlaceholderText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textLight,
    marginTop: theme.spacing.sm,
  },
});
