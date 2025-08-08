import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  responsiveSpacing 
} from '../utils/responsive';

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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const metrics = [
    {
      title: 'Today\'s Sales',
      value: '$2,847.50',
      subtitle: 'From 43 transactions',
      icon: 'cash' as const,
      color: theme.colors.success,
      change: { value: 12.5, isPositive: true }
    },
    {
      title: 'Active Products',
      value: '247',
      subtitle: '12 low stock',
      icon: 'cube' as const,
      color: theme.colors.primary,
      change: { value: 3.2, isPositive: true }
    },
    {
      title: 'Customers',
      value: '89',
      subtitle: 'Today',
      icon: 'people' as const,
      color: theme.colors.secondary,
      change: { value: 5.1, isPositive: false }
    },
    {
      title: 'Avg. Order',
      value: '$66.22',
      subtitle: 'Per transaction',
      icon: 'trending-up' as const,
      color: theme.colors.warning,
      change: { value: 8.3, isPositive: true }
    }
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

  const recentSales = [
    { id: 1, customer: 'John Doe', amount: 84.50, time: '2:30 PM', items: 3 },
    { id: 2, customer: 'Sarah Smith', amount: 156.00, time: '2:15 PM', items: 7 },
    { id: 3, customer: 'Mike Johnson', amount: 42.25, time: '1:45 PM', items: 2 },
    { id: 4, customer: 'Emily Brown', amount: 78.90, time: '1:20 PM', items: 4 },
    { id: 5, customer: 'David Wilson', amount: 231.75, time: '12:55 PM', items: 12 }
  ];

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

        <View style={styles.salesList}>
          {recentSales.map((sale) => (
            <View key={sale.id} style={styles.saleItem}>
              <View style={styles.saleInfo}>
                <Text style={styles.customerName}>{sale.customer}</Text>
                <Text style={styles.saleDetails}>
                  {sale.items} items • {sale.time}
                </Text>
              </View>
              <Text style={styles.saleAmount}>${sale.amount.toFixed(2)}</Text>
            </View>
          ))}
        </View>
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
