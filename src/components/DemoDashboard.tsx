import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { 
  isTablet, 
  isSmallMobile,
  isExtraSmall,
  isMobile,
  scaleFont,
  scaleSpacing,
  TYPOGRAPHY,
  SPACING,
  LAYOUT,
  getTouchTargetSize,
  getResponsiveGrid,
  getDeviceOptimizations,
} from '../utils/responsive';
import {
  HapticFeedback,
  ToastManager,
  GestureHelpers,
  DateTimeHelpers,
  AccessibilityHelpers,
} from '../utils/ux';

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

export const DemoDashboard: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const handleRefresh = async () => {
    setRefreshing(true);
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
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good afternoon!</Text>
          <Text style={styles.subtitle}>Sales MVP Demo Dashboard</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            title="Export"
            size="sm"
            variant="outline"
            icon="download-outline"
            onPress={() => {
              HapticFeedback.light();
              ToastManager.info('Export feature coming soon!');
            }}
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

      {/* Recent Sales */}
      <Card variant="elevated" padding="none" style={styles.recentSalesCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Recent Sales</Text>
          <Button
            title="View All"
            size="sm"
            variant="ghost"
            icon="chevron-forward"
            onPress={() => {
              HapticFeedback.light();
              ToastManager.info(`Viewing all sales transactions...`);
            }}
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

      {/* Demo Notice */}
      <Card variant="glass" padding="lg" style={styles.demoNotice}>
        <View style={styles.demoHeader}>
          <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
          <Text style={styles.demoTitle}>Demo Mode</Text>
        </View>
        <Text style={styles.demoText}>
          This is a demonstration of the Sales MVP interface. All data shown is sample data for testing purposes.
        </Text>
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
    flexDirection: isExtraSmall ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isExtraSmall ? 'flex-start' : 'center',
    paddingHorizontal: LAYOUT.containerPadding.horizontal,
    paddingVertical: LAYOUT.containerPadding.vertical,
    paddingBottom: SPACING.lg,
    gap: isExtraSmall ? SPACING.md : 0,
  },
  greeting: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body2,
    color: theme.colors.textSecondary,
    marginTop: SPACING.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    minHeight: getTouchTargetSize(),
  },
  periodSelector: {
    flexDirection: isExtraSmall ? 'column' : 'row',
    gap: SPACING.sm,
    paddingHorizontal: LAYOUT.containerPadding.horizontal,
    marginBottom: SPACING.lg,
  },
  periodButton: {
    flex: isExtraSmall ? 0 : 1,
    minHeight: getTouchTargetSize(),
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: LAYOUT.containerPadding.horizontal,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    flex: isExtraSmall ? 1 : isTablet ? 0 : 1,
    minWidth: isExtraSmall ? '100%' : isMobile ? '47%' : isTablet ? 250 : '30%',
    maxWidth: isExtraSmall ? '100%' : isMobile ? '47%' : isTablet ? 300 : '32%',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  metricIcon: {
    width: getTouchTargetSize(),
    height: getTouchTargetSize(),
    borderRadius: LAYOUT.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: theme.colors.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: LAYOUT.borderRadius.sm,
  },
  changeText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: theme.fontWeight.semibold,
  },
  metricTitle: {
    fontSize: TYPOGRAPHY.caption,
    color: theme.colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.h4,
    fontWeight: theme.fontWeight.bold,
    marginBottom: SPACING.xs,
  },
  metricSubtitle: {
    fontSize: TYPOGRAPHY.overline,
    color: theme.colors.textLight,
  },
  recentSalesCard: {
    marginHorizontal: LAYOUT.containerPadding.horizontal,
    marginBottom: SPACING.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: getTouchTargetSize(),
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.h5,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.text,
  },
  salesList: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    minHeight: getTouchTargetSize() * 0.8, // Slightly smaller for list items
  },
  saleInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: TYPOGRAPHY.body1,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.text,
  },
  saleDetails: {
    fontSize: TYPOGRAPHY.body2,
    color: theme.colors.textSecondary,
    marginTop: SPACING.xs,
  },
  saleAmount: {
    fontSize: TYPOGRAPHY.body1,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.success,
  },
  demoNotice: {
    marginHorizontal: LAYOUT.containerPadding.horizontal,
    marginBottom: SPACING.xl,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  demoTitle: {
    fontSize: TYPOGRAPHY.h6,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.primary,
  },
  demoText: {
    fontSize: TYPOGRAPHY.body2,
    color: theme.colors.textSecondary,
    lineHeight: TYPOGRAPHY.body2 * 1.4,
  },
});
