import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert
} from 'react-native';
import { syncService } from '../services/SyncService';
import { networkService } from '../services/NetworkService';
import { NetworkState, SyncStats } from '../types/Sync';

interface SyncStatusIndicatorProps {
  style?: any;
  showDetails?: boolean;
  onPress?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  style,
  showDetails = false,
  onPress
}) => {
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    initializeStatus();
    setupListeners();
    
    return () => {
      // Cleanup listeners when component unmounts
      networkService.removeNetworkListener(handleNetworkChange);
    };
  }, []);

  const initializeStatus = async () => {
    try {
      const networkState = await networkService.getNetworkState();
      const syncStats = await syncService.getSyncStats();
      
      setNetworkState(networkState);
      setSyncStats(syncStats);
    } catch (error) {
      console.error('Failed to initialize sync status:', error);
    }
  };

  const setupListeners = () => {
    // Listen to network changes
    networkService.onNetworkChange(handleNetworkChange);

    // Poll sync stats periodically
    const interval = setInterval(async () => {
      try {
        const stats = await syncService.getSyncStats();
        setSyncStats(stats);
      } catch (error) {
        console.error('Failed to update sync stats:', error);
      }
    }, 5000); // Update every 5 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  };

  const handleNetworkChange = (state: NetworkState) => {
    setNetworkState(state);
  };

  const startPulseAnimation = () => {
    setIsSyncing(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    setIsSyncing(false);
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const getStatusColor = (): string => {
    if (!networkState?.is_online) {
      return '#e74c3c'; // Red for offline
    }
    
    if (syncStats?.total_failed && syncStats.total_failed > 0) {
      return '#f39c12'; // Orange for errors
    }
    
    if (syncStats?.total_pending && syncStats.total_pending > 0) {
      return '#3498db'; // Blue for pending sync
    }
    
    return '#27ae60'; // Green for synced
  };

  const getStatusText = (): string => {
    if (!networkState?.is_online) {
      return 'Offline';
    }
    
    if (isSyncing) {
      return 'Syncing...';
    }
    
    if (syncStats?.total_failed && syncStats.total_failed > 0) {
      return `${syncStats.total_failed} Failed`;
    }
    
    if (syncStats?.total_pending && syncStats.total_pending > 0) {
      return `${syncStats.total_pending} Pending`;
    }
    
    return 'Synced';
  };

  const getStatusIcon = (): string => {
    if (!networkState?.is_online) {
      return '📱'; // Offline
    }
    
    if (isSyncing) {
      return '🔄'; // Syncing
    }
    
    if (syncStats?.total_failed && syncStats.total_failed > 0) {
      return '⚠️'; // Warning
    }
    
    if (syncStats?.total_pending && syncStats.total_pending > 0) {
      return '⏳'; // Pending
    }
    
    return '✅'; // Synced
  };

  const handlePress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    // Default behavior: force sync or show status
    if (!networkState?.is_online) {
      Alert.alert(
        'Offline Mode',
        'You are currently offline. Data will sync when connection is restored.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      startPulseAnimation();
      await syncService.forceSyncNow();
      Alert.alert('Sync Complete', 'Data has been synchronized successfully.');
    } catch (error) {
      Alert.alert('Sync Failed', 'Failed to synchronize data. Please try again.');
      console.error('Manual sync failed:', error);
    } finally {
      stopPulseAnimation();
    }
  };

  const renderBasicStatus = () => (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: getStatusColor() }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.content, { opacity: pulseAnim }]}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </Animated.View>
    </TouchableOpacity>
  );

  const renderDetailedStatus = () => (
    <TouchableOpacity
      style={[styles.detailedContainer, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <Animated.View style={[styles.statusBadge, 
          { backgroundColor: getStatusColor(), opacity: pulseAnim }
        ]}>
          <Text style={styles.statusBadgeText}>{getStatusIcon()}</Text>
        </Animated.View>
        <Text style={styles.title}>Sync Status</Text>
      </View>
      
      <View style={styles.detailsRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[styles.value, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      <View style={styles.detailsRow}>
        <Text style={styles.label}>Network:</Text>
        <Text style={styles.value}>
          {networkState?.is_online ? 
            `${networkState.connection_type.toUpperCase()}${networkState.is_metered ? ' (Metered)' : ''}` : 
            'Offline'
          }
        </Text>
      </View>
      
      {syncStats?.last_sync_time && (
        <View style={styles.detailsRow}>
          <Text style={styles.label}>Last Sync:</Text>
          <Text style={styles.value}>
            {new Date(syncStats.last_sync_time).toLocaleTimeString()}
          </Text>
        </View>
      )}
      
      {syncStats && syncStats.total_pending > 0 && (
        <View style={styles.detailsRow}>
          <Text style={styles.label}>Pending:</Text>
          <Text style={styles.value}>{syncStats.total_pending} items</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return showDetails ? renderDetailedStatus() : renderBasicStatus();
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  icon: {
    fontSize: 14,
    marginRight: 4
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  detailedContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 200
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  statusBadgeText: {
    fontSize: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  }
});

export default SyncStatusIndicator;
