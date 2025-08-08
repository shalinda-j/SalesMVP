import React from 'react';
import { ModernPOSInterface } from '@/src/components/ModernPOSInterface';
import { SafeAreaView, StyleSheet } from 'react-native';
import { theme } from '@/src/styles/theme';

export default function POSScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ModernPOSInterface />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
