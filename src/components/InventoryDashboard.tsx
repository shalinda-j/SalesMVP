import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/DemoAuthContext';
import { inventoryService } from '../services/InventoryService';
import {
  InventoryMetrics,
  StockAlert,
  StockAdjustment,
  Supplier,
  PurchaseOrder,
  StockAdjustmentInput,
} from '../types/inventory';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color, onPress }) => (
  <TouchableOpacity 
    style={[styles.metricCard, { borderLeftColor: color }]} 
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.metricHeader}>
      <Text style={[styles.metricIcon, { color }]}>{icon}</Text>
      <View style={styles.metricInfo}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  </TouchableOpacity>
);

interface AlertCardProps {
  alert: StockAlert;
  onMarkAsRead: (alertId: string) => void;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert, onMarkAsRead }) => {
  const getAlertColor = (type: StockAlert['alertType']) => {
    switch (type) {
      case 'out_of_stock': return '#dc3545';
      case 'low_stock': return '#fd7e14';
      case 'overstock': return '#6f42c1';
      case 'expired': return '#dc3545';
      case 'damaged': return '#6c757d';
      default: return '#17a2b8';
    }
  };

  const getAlertIcon = (type: StockAlert['alertType']) => {
    switch (type) {
      case 'out_of_stock': return '🚫';
      case 'low_stock': return '⚠️';
      case 'overstock': return '📈';
      case 'expired': return '⏰';
      case 'damaged': return '🔧';
      default: return '🔔';
    }
  };

  return (
    <View style={[styles.alertCard, { borderLeftColor: getAlertColor(alert.alertType) }]}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertIcon}>{getAlertIcon(alert.alertType)}</Text>
        <View style={styles.alertInfo}>
          <Text style={styles.alertMessage}>{alert.message}</Text>
          <Text style={styles.alertTime}>
            {alert.createdAt.toLocaleDateString()} at {alert.createdAt.toLocaleTimeString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.markReadButton}
          onPress={() => onMarkAsRead(alert.id)}
        >
          <Text style={styles.markReadText}>✓</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const InventoryDashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [recentAdjustments, setRecentAdjustments] = useState<StockAdjustment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  useEffect(() => {
    loadInventoryData();
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);

      // Check permissions
      if (!hasPermission('canViewInventory')) {
        Alert.alert('Access Denied', 'You do not have permission to view inventory data.');
        return;
      }

      // Load all inventory data
      const [
        inventoryMetrics,
        stockAlerts,
        stockAdjustments,
        suppliersData,
        purchaseOrdersData,
      ] = await Promise.all([
        inventoryService.getInventoryMetrics(),
        inventoryService.getUnreadAlerts(),
        inventoryService.getAllStockAdjustments(),
        inventoryService.getAllSuppliers(),
        inventoryService.getAllPurchaseOrders(),
      ]);

      setMetrics(inventoryMetrics);
      setAlerts(stockAlerts);
      setRecentAdjustments(stockAdjustments.slice(-10).reverse()); // Last 10 adjustments
      setSuppliers(suppliersData.filter(s => s.isActive));
      setPurchaseOrders(purchaseOrdersData.slice(-5).reverse()); // Last 5 POs

    } catch (error) {
      console.error('Failed to load inventory data:', error);
      Alert.alert('Error', 'Failed to load inventory data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInventoryData();
  };

  const handleMarkAlertAsRead = async (alertId: string) => {
    try {
      await inventoryService.markAlertAsRead(alertId);
      setAlerts(alerts.filter(alert => alert.id !== alertId));
    } catch (error) {
      Alert.alert('Error', 'Failed to mark alert as read');
    }
  };

  const handleStockAdjustment = () => {
    if (!hasPermission('canAdjustStock')) {
      Alert.alert('Access Denied', 'You do not have permission to adjust stock levels.');
      return;
    }
    setShowAdjustmentModal(true);
  };

  const handleCreateSupplier = () => {
    if (!hasPermission('canManageSuppliers')) {
      Alert.alert('Access Denied', 'You do not have permission to manage suppliers.');
      return;
    }
    Alert.alert('Feature Coming Soon', 'Supplier management interface will be available soon.');
  };

  const handleCreatePurchaseOrder = () => {
    if (!hasPermission('canManageSuppliers')) {
      Alert.alert('Access Denied', 'You do not have permission to create purchase orders.');
      return;
    }
    Alert.alert('Feature Coming Soon', 'Purchase order creation will be available soon.');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading inventory data...</Text>
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
        <Text style={styles.title}>📦 Inventory Management</Text>
        <Text style={styles.subtitle}>Welcome back, {user?.firstName}</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleStockAdjustment}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Adjust Stock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCreateSupplier}>
            <Text style={styles.actionIcon}>🏢</Text>
            <Text style={styles.actionText}>Add Supplier</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleCreatePurchaseOrder}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>New PO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inventory Metrics */}
      {metrics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Overview</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Total Products"
              value={metrics.totalProducts}
              icon="📦"
              color="#007bff"
            />
            <MetricCard
              title="Total Value"
              value={`$${metrics.totalValue.toLocaleString()}`}
              icon="💰"
              color="#28a745"
            />
            <MetricCard
              title="Low Stock Items"
              value={metrics.lowStockItems}
              subtitle="Need attention"
              icon="⚠️"
              color="#fd7e14"
            />
            <MetricCard
              title="Out of Stock"
              value={metrics.outOfStockItems}
              subtitle="Critical"
              icon="🚫"
              color="#dc3545"
            />
          </View>
        </View>
      )}

      {/* Stock Alerts */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚨 Stock Alerts ({alerts.length})</Text>
          {alerts.slice(0, 5).map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkAsRead={handleMarkAlertAsRead}
            />
          ))}
          {alerts.length > 5 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All {alerts.length} Alerts</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Top Moving Products */}
      {metrics && metrics.topMovingProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Top Moving Products</Text>
          {metrics.topMovingProducts.slice(0, 5).map((product, index) => (
            <View key={product.productId} style={styles.productCard}>
              <View style={styles.productRank}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.productName}</Text>
                <Text style={styles.productStats}>
                  {product.unitsSold} units sold • ${product.revenue.toFixed(2)} revenue
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Active Suppliers */}
      {suppliers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏢 Active Suppliers ({suppliers.length})</Text>
          <View style={styles.suppliersContainer}>
            {suppliers.slice(0, 3).map(supplier => (
              <View key={supplier.id} style={styles.supplierCard}>
                <Text style={styles.supplierName}>{supplier.name}</Text>
                <Text style={styles.supplierContact}>{supplier.contactPerson}</Text>
                <Text style={styles.supplierPhone}>{supplier.phone}</Text>
              </View>
            ))}
          </View>
          {suppliers.length > 3 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Suppliers</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Recent Purchase Orders */}
      {purchaseOrders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Recent Purchase Orders</Text>
          {purchaseOrders.map(po => (
            <View key={po.id} style={styles.poCard}>
              <View style={styles.poHeader}>
                <Text style={styles.poNumber}>{po.orderNumber}</Text>
                <Text style={[styles.poStatus, { color: getStatusColor(po.status) }]}>
                  {po.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.poAmount}>${po.totalAmount.toFixed(2)}</Text>
              <Text style={styles.poDate}>
                {po.orderDate.toLocaleDateString()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Stock Adjustments */}
      {recentAdjustments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Recent Stock Adjustments</Text>
          {recentAdjustments.slice(0, 5).map(adjustment => (
            <View key={adjustment.id} style={styles.adjustmentCard}>
              <View style={styles.adjustmentHeader}>
                <Text style={styles.adjustmentType}>
                  {adjustment.adjustmentType.charAt(0).toUpperCase() + adjustment.adjustmentType.slice(1)}
                </Text>
                <Text style={styles.adjustmentTime}>
                  {adjustment.timestamp.toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.adjustmentReason}>{adjustment.reason}</Text>
              <Text style={styles.adjustmentChange}>
                {adjustment.quantityBefore} → {adjustment.quantityAfter} 
                ({adjustment.quantityChanged > 0 ? '+' : ''}{adjustment.quantityChanged})
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// Helper function to get status colors
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'draft': return '#6c757d';
    case 'sent': return '#007bff';
    case 'confirmed': return '#28a745';
    case 'shipped': return '#17a2b8';
    case 'received': return '#28a745';
    case 'cancelled': return '#dc3545';
    default: return '#6c757d';
  }
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  metricsGrid: {
    gap: 15,
  },
  metricCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  metricInfo: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  alertCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  markReadButton: {
    backgroundColor: '#28a745',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markReadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  productRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  rankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  suppliersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  supplierCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  supplierContact: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  supplierPhone: {
    fontSize: 12,
    color: '#999',
  },
  poCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  poStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  poAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  poDate: {
    fontSize: 12,
    color: '#666',
  },
  adjustmentCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adjustmentType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  adjustmentTime: {
    fontSize: 12,
    color: '#666',
  },
  adjustmentReason: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  adjustmentChange: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007bff',
  },
  viewAllButton: {
    marginTop: 10,
    padding: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#007bff',
    fontWeight: '600',
  },
});
