import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/AuthService';
import { database } from '../stores/DatabaseFactory';

export const AuthScreen: React.FC = () => {
  const [showRegister, setShowRegister] = useState(false);
  const { isAuthenticated } = useAuth();

  // Initialize database and auth service on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database first
        await database.initialize();
        
        // Then initialize auth service
        await authService.initialize();
      } catch (error) {
        Alert.alert('Initialization Error', 'Failed to initialize application. Please restart the app.');
      }
    };

    initializeApp();
  }, []);

  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  const handleBackToLogin = () => {
    setShowRegister(false);
  };

  const handleRegisterPress = () => {
    setShowRegister(true);
  };

  // Don't render anything if user is authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      {showRegister ? (
        <RegisterScreen
          onRegisterSuccess={handleRegisterSuccess}
          onBackToLogin={handleBackToLogin}
        />
      ) : (
        <LoginScreen onRegisterPress={handleRegisterPress} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
