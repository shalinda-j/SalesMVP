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
  Modal,
  Dimensions
} from 'react-native';
import {
  NetworkStatus,
  SyncStats,
  CloudBackupInfo,
  DeviceInfo,
  ConflictResolution
} from '../types/Cloud';
import { cloudNetworkService } from '../services/CloudNetworkService';
import { cloudSyncService } from '../services/CloudSyncService';
import { cloudBackupService } from '../services/CloudBackupService';
import { demoService } from '../services/DemoService';
import { wp, hp, responsiveFont, scaleSpacing } from '../utils/responsive';

const { width } = Dimensions.get('window');

interface CloudManagementScreenState {
  isLoading: boolean;
  refreshing: boolean;
  networkStatus: NetworkStatus;
  syncStats: SyncStats;
  backups: CloudBackupInfo[];
  devices: DeviceInfo[];
  conflicts: ConflictResolution[];
  cloudEnabled: boolean;
  autoSync: boolean;
  autoBackup: boolean;
  modalVisible: boolean;
  modalContent: 'sync' | 'backup' | 'conflicts' | 'devices' | null;
  selectedBackup: CloudBackupInfo | null;
  syncInProgress: boolean;
  backupInProgress: boolean;
}

export const CloudManagementScreen: React.FC = () => {
  const [state, setState] = useState<CloudManagementScreenState>({
    isLoading: true,
    refreshing: false,
    networkStatus: {
      isOnline: false,
      connectionType: 'unknown',
      isInternetReachable: null
    },
    syncStats: {
      lastSyncAt: null,
      pendingOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      conflictsResolved: 0,
      totalDataSynced: 0,
      averageSyncTime: 0,
      isOnline: false,
      lastOnlineAt: null
    },
    backups: [],
    devices: [],
    conflicts: [],
    cloudEnabled: false,
    autoSync: true,
    autoBackup: false,
    modalVisible: false,
    modalContent: null,
    selectedBackup: null,
    syncInProgress: false,
    backupInProgress: false
  });

  useEffect(() => {
    loadCloudData();
    setupListeners();
  }, []);

  const loadCloudData = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const [
        networkStatus,
        syncStats,
        backups,
        devices,
        conflicts
      ] = await Promise.all([
        cloudNetworkService.forceCheck(),
        cloudSyncService.getSyncStats(),
        cloudBackupService.listBackups(),
        cloudSyncService.getDevices(),
        cloudSyncService.getConflicts()
      ]);

      setState(prev => ({
        ...prev,
        networkStatus,
        syncStats,
        backups,
        devices,
        conflicts,
        isLoading: false
      }));
    } catch (error) {
      console.error('Failed to load cloud data:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setupListeners = () => {
    // Network status listener
    const unsubscribeNetwork = cloudNetworkService.onStatusChange((status) => {
      setState(prev => ({ ...prev, networkStatus: status }));
    });

    // Sync status listener
    const unsubscribeSync = cloudSyncService.onSyncStatusChanged((stats) => {
      setState(prev => ({ ...prev, syncStats: stats }));
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeNetwork();
      unsubscribeSync();
    };
  };

  const handleRefresh = async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadCloudData();
    setState(prev => ({ ...prev, refreshing: false }));
  };

  const handleCloudToggle = async (enabled: boolean) => {
    setState(prev => ({ ...prev, cloudEnabled: enabled }));
    
    if (enabled) {
      // Initialize cloud services with demo config
      const config = {
        provider: 'firebase' as const,
        apiUrl: 'https://demo-api.example.com',
        apiKey: 'demo-api-key',
        projectId: 'sales-mvp-demo'
      };

      try {
        await cloudSyncService.initialize(config);
        await cloudBackupService.initialize(config);
        Alert.alert('Success', 'Cloud services enabled successfully');
      } catch (error) {
        Alert.alert('Error', 'Failed to enable cloud services');
        setState(prev => ({ ...prev, cloudEnabled: false }));
      }
    } else {
      Alert.alert('Info', 'Cloud services disabled');
    }
  };

  const handleSync = async () => {
    if (!state.cloudEnabled || state.syncInProgress) return;

    setState(prev => ({ ...prev, syncInProgress: true }));
    
    try {
      await cloudSyncService.fullSync();
      Alert.alert('Success', 'Data synchronization completed');
    } catch (error) {
      Alert.alert('Error', 'Synchronization failed: ' + error);
    } finally {
      setState(prev => ({ ...prev, syncInProgress: false }));
    }
  };

  const handleBackup = async () => {
    if (!state.cloudEnabled || state.backupInProgress) return;

    setState(prev => ({ ...prev, backupInProgress: true }));
    
    try {
      const backup = await cloudBackupService.createBackup(false);
      Alert.alert('Success', `Backup created: ${backup.backupId}`);
      await loadCloudData(); // Refresh backup list
    } catch (error) {
      Alert.alert('Error', 'Backup failed: ' + error);
    } finally {
      setState(prev => ({ ...prev, backupInProgress: false }));
    }
  };

  const handleRestore = async (backup: CloudBackupInfo) => {
    Alert.alert(
      'Confirm Restore',
      `Are you sure you want to restore from backup created on ${new Date(backup.timestamp).toLocaleDateString()}?\n\nThis will replace your current data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              const restore = await cloudBackupService.restoreFromBackup(backup.backupId);
              Alert.alert('Success', `Data restored: ${restore.restoreId}`);
            } catch (error) {
              Alert.alert('Error', 'Restore failed: ' + error);
            }
          }
        }
      ]
    );
  };

  const handleDeleteBackup = async (backup: CloudBackupInfo) => {
    Alert.alert(
      'Delete Backup',
      `Are you sure you want to delete backup from ${new Date(backup.timestamp).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cloudBackupService.deleteBackup(backup.backupId);
              await loadCloudData();
              Alert.alert('Success', 'Backup deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete backup: ' + error);
            }
          }
        }
      ]
    );
  };

  const openModal = (content: 'sync' | 'backup' | 'conflicts' | 'devices') => {
    setState(prev => ({ ...prev, modalVisible: true, modalContent: content }));
  };

  const closeModal = () => {
    setState(prev => ({ ...prev, modalVisible: false, modalContent: null, selectedBackup: null }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getConnectionQualityColor = (quality: string): string => {
    switch (quality) {
      case 'excellent': return '#28a745';
      case 'good': return '#17a2b8';
      case 'fair': return '#ffc107';
      case 'poor': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderStatusCard = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>☁️ Cloud Status</Text>
        <Switch
          value={state.cloudEnabled}
          onValueChange={handleCloudToggle}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={state.cloudEnabled ? '#007bff' : '#f4f3f4'}
        />
      </View>
      
      {state.cloudEnabled && (
        <View style={styles.cardContent}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Network:</Text>
            <View style={styles.statusValue}>
              <View style={[
                styles.statusDot,
                { backgroundColor: state.networkStatus.isOnline ? '#28a745' : '#dc3545' }
              ]} />
              <Text style={styles.statusText}>
                {state.networkStatus.isOnline ? 'Online' : 'Offline'}
                {state.networkStatus.details?.latency && ` (${state.networkStatus.details.latency}ms)`}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text style={styles.statusText}>
              {state.networkStatus.connectionType.charAt(0).toUpperCase() + state.networkStatus.connectionType.slice(1)}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Quality:</Text>
            <Text style={[
              styles.statusText,
              { color: getConnectionQualityColor(cloudNetworkService.getConnectionQuality()) }
            ]}>
              {cloudNetworkService.getConnectionQuality().charAt(0).toUpperCase() + cloudNetworkService.getConnectionQuality().slice(1)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderSyncCard = () => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => openModal('sync')}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔄 Synchronization</Text>
          <Text style={styles.cardValue}>{state.syncStats.pendingOperations} pending</Text>
        </View>
      </TouchableOpacity>
      
      {state.cloudEnabled && (
        <View style={styles.cardContent}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last Sync:</Text>
            <Text style={styles.statusText}>
              {state.syncStats.lastSyncAt ? 
                new Date(state.syncStats.lastSyncAt).toLocaleString() : 
                'Never'
              }
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Completed:</Text>
            <Text style={styles.statusText}>{state.syncStats.completedOperations}</Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Failed:</Text>
            <Text style={[styles.statusText, { color: '#dc3545' }]}>
              {state.syncStats.failedOperations}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, !state.networkStatus.isOnline && styles.disabledButton]}
            onPress={handleSync}
            disabled={!state.networkStatus.isOnline || state.syncInProgress}
          >
            {state.syncInProgress ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBackupCard = () => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => openModal('backup')}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>💾 Backups</Text>
          <Text style={styles.cardValue}>{state.backups.length} backups</Text>
        </View>
      </TouchableOpacity>
      
      {state.cloudEnabled && (
        <View style={styles.cardContent}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Latest:</Text>
            <Text style={styles.statusText}>
              {state.backups[0] ? 
                new Date(state.backups[0].timestamp).toLocaleDateString() : 
                'None'
              }
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Auto Backup:</Text>
            <Switch
              value={state.autoBackup}
              onValueChange={(value) => {
                setState(prev => ({ ...prev, autoBackup: value }));
                if (value) {
                  cloudBackupService.scheduleAutomaticBackup('daily');
                } else {
                  cloudBackupService.cancelAutomaticBackup();
                }
              }}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={state.autoBackup ? '#007bff' : '#f4f3f4'}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleBackup}
            disabled={state.backupInProgress}
          >
            {state.backupInProgress ? (
              <ActivityIndicator size="small" color="#007bff" />
            ) : (
              <Text style={[styles.actionButtonText, { color: '#007bff' }]}>Create Backup</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderConflictsCard = () => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => openModal('conflicts')}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>⚠️ Conflicts</Text>
          <Text style={[
            styles.cardValue,
            state.conflicts.length > 0 ? { color: '#dc3545' } : undefined
          ]}>
            {state.conflicts.length} conflicts
          </Text>
        </View>
      </TouchableOpacity>
      
      {state.conflicts.length > 0 && (
        <View style={styles.cardContent}>
          <Text style={styles.statusText}>
            There are data conflicts that require resolution.
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.warningButton]}
            onPress={() => openModal('conflicts')}
          >
            <Text style={styles.actionButtonText}>Resolve Conflicts</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBackupModal = () => (
    <Modal visible={state.modalVisible && state.modalContent === 'backup'} animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>💾 Backup Management</Text>
          <TouchableOpacity onPress={closeModal}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {state.backups.map((backup) => (
            <View key={backup.backupId} style={styles.backupItem}>
              <View style={styles.backupInfo}>
                <Text style={styles.backupDate}>
                  {new Date(backup.timestamp).toLocaleString()}
                </Text>
                <Text style={styles.backupSize}>
                  {formatFileSize(backup.size)} • {backup.entities.products + backup.entities.sales} items
                </Text>
                <Text style={styles.backupDetails}>
                  Products: {backup.entities.products}, Sales: {backup.entities.sales}, Users: {backup.entities.users}
                </Text>
              </View>
              
              <View style={styles.backupActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => handleRestore(backup)}
                >
                  <Text style={styles.actionButtonText}>Restore</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerButton]}
                  onPress={() => handleDeleteBackup(backup)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {state.backups.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No backups available</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  if (state.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading cloud services...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>☁️ Cloud Management</Text>
        <Text style={styles.subtitle}>Synchronization, backup, and cloud services</Text>
      </View>

      {renderStatusCard()}
      {renderSyncCard()}
      {renderBackupCard()}
      {renderConflictsCard()}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔧 Quick Actions</Text>
        <View style={styles.cardContent}>
          <TouchableOpacity
            style={[styles.actionButton, styles.demoButton]}
            onPress={async () => {
              try {
                await demoService.setupDemoData();
                Alert.alert('Success', 'Demo data setup completed');
                await loadCloudData();
              } catch (error) {
                Alert.alert('Error', 'Demo setup failed: ' + error);
              }
            }}
          >
            <Text style={styles.actionButtonText}>🚀 Setup Demo Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => {
              cloudSyncService.clearQueue();
              Alert.alert('Success', 'Sync queue cleared');
              loadCloudData();
            }}
          >
            <Text style={[styles.actionButtonText, { color: '#007bff' }]}>🗑️ Clear Sync Queue</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderBackupModal()}
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
    fontSize: responsiveFont(16),
    color: '#666',
  },
  header: {
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
  subtitle: {
    fontSize: responsiveFont(14),
    color: '#666',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: scaleSpacing(16),
    marginBottom: 0,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardValue: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: '#666',
  },
  cardContent: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: responsiveFont(14),
    color: '#666',
    fontWeight: '500',
  },
  statusValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: responsiveFont(14),
    color: '#333',
  },
  actionButton: {
    paddingVertical: scaleSpacing(10),
    paddingHorizontal: scaleSpacing(16),
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#007bff',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  primaryButton: {
    backgroundColor: '#28a745',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  demoButton: {
    backgroundColor: '#17a2b8',
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: responsiveFont(14),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  backupItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  backupInfo: {
    marginBottom: 12,
  },
  backupDate: {
    fontSize: responsiveFont(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  backupSize: {
    fontSize: responsiveFont(14),
    color: '#666',
    marginBottom: 4,
  },
  backupDetails: {
    fontSize: 12,
    color: '#999',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: responsiveFont(16),
    color: '#999',
  },
});
