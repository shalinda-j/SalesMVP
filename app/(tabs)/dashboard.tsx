import React from 'react';
import { ModernDashboard } from '@/src/components/ModernDashboard';
import { SafeAreaView, StyleSheet } from 'react-native';
import { theme } from '@/src/styles/theme';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModernDashboard />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
