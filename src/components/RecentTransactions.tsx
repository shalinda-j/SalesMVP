import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { RetailTransaction } from '../types/pos';
import { salesService } from '../services/SimpleSalesService';

interface RecentTransactionsProps {
  limit?: number;
  showTitle?: boolean;
  onTransactionPress?: (sale: RetailTransaction) => void;
}

interface TransactionItemProps {
  sale: RetailTransaction;
  onPress?: (sale: RetailTransaction) => void;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ sale, onPress }) => {
  const formatTime = (timestamp: Date): string => {
    const now = new Date();
    const saleDate = new Date(timestamp);
    const diffMs = now.getTime() - saleDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {return 'Just now';}
    if (diffMins < 60) {return `${diffMins}m ago`;}
    if (diffHours < 24) {return `${diffHours}h ago`;}
    if (diffDays < 7) {return `${diffDays}d ago`;}
    
    return saleDate.toLocaleDateString();
  };

  const getPaymentMethodIcon = (method: string): string => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'digital': return '📱';
      default: return '💰';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  return (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => onPress?.(sale)}
      activeOpacity={0.7}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionId}>
            Sale #{sale.id?.toString().padStart(4, '0') || 'N/A'}
          </Text>
          <Text style={styles.transactionTime}>
            {formatTime(sale.timestamp)}
          </Text>
        </View>
        
        <View style={styles.transactionAmount}>
          <Text style={styles.amountText}>
            ${sale.totals.grandTotal.toFixed(2)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(sale.status) }]}>
            <Text style={styles.statusText}>
              {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.itemsInfo}>
          <Text style={styles.itemsCount}>
            {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
          </Text>
          {sale.items.slice(0, 2).map((item, index) => (
            <Text key={index} style={styles.itemName}>
              {item.quantity}x {item.name}
            </Text>
          ))}
          {sale.items.length > 2 && (
            <Text style={styles.moreItems}>
              +{sale.items.length - 2} more
            </Text>
          )}
        </View>

        <View style={styles.paymentInfo}>
          <Text style={styles.paymentMethod}>
            {getPaymentMethodIcon(sale.tenders[0]?.type || 'other')} {sale.tenders[0]?.type.toUpperCase() || 'N/A'}
          </Text>
          {sale.totals.taxTotal > 0 && (
            <Text style={styles.taxInfo}>
              Tax: ${sale.totals.taxTotal.toFixed(2)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  limit = 10,
  showTitle = true,
  onTransactionPress,
}) => {
  const [transactions, setTransactions] = useState<RetailTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const allSales = await salesService.getAllSales();
      
      // Sort by timestamp descending (most recent first) and limit
      const recentSales = allSales
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      setTransactions(recentSales);
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setError('Failed to load recent transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const handleTransactionPress = (sale: RetailTransaction) => {
    if (onTransactionPress) {
      onTransactionPress(sale);
    } else {
      // Default action: show transaction details
      Alert.alert(
        `Transaction #${sale.id?.toString().padStart(4, '0') || 'N/A'}`,
        `Amount: $${sale.totals.grandTotal.toFixed(2)}\n` +
        `Items: ${sale.items.length}\n` +
        `Payment: ${sale.tenders[0]?.type.toUpperCase() || 'N/A'}
` +
        `Status: ${sale.status}\n` +
        `Date: ${sale.timestamp.toLocaleString()}`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🧾</Text>
      <Text style={styles.emptyTitle}>No Transactions Yet</Text>
      <Text style={styles.emptySubtitle}>
        Completed sales will appear here
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadTransactions}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && transactions.length === 0) {
    return (
      <View style={styles.container}>
        {showTitle && <Text style={styles.title}>Recent Transactions</Text>}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showTitle && (
        <View style={styles.header}>
          <Text style={styles.title}>Recent Transactions</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={transactions}
          renderItem={({ item }) => (
            <TransactionItem 
              sale={item} 
              onPress={handleTransactionPress}
            />
          )}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            transactions.length === 0 ? styles.emptyContainer : undefined
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  refreshButtonText: {
    fontSize: 14,
    color: '#007bff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  transactionItem: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemsInfo: {
    flex: 1,
  },
  itemsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  itemName: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 1,
  },
  moreItems: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  paymentInfo: {
    alignItems: 'flex-end',
  },
  paymentMethod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 2,
  },
  taxInfo: {
    fontSize: 12,
    color: '#6c757d',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
