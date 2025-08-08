import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { RequireAuth } from '@/src/contexts/DemoAuthContext';
import { ModernInventoryInterface } from '../../src/components/ModernInventoryInterface';

export default function InventoryScreen() {
  return (
    <RequireAuth 
      permission="canViewInventory"
      fallback={
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedText}>
            🔒 Access Denied
          </Text>
          <Text style={styles.accessDeniedSubtext}>
            You need inventory permissions to view this section.
          </Text>
        </View>
      }
    >
      <View style={styles.container}>
        <ModernInventoryInterface />
      </View>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
