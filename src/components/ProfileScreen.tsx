import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/ProfileService';
import { theme } from '../styles/theme';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  UserProfile,
  BusinessSettings,
  UpdateUserProfileInput,
  UpdateBusinessSettingsInput
} from '../types';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showBusinessSettings, setShowBusinessSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    phoneNumber: '',
    address: '',
    theme: 'auto' as 'light' | 'dark' | 'auto',
    notifications: true,
    language: 'en'
  });

  const [businessForm, setBusinessForm] = useState({
    businessName: '',
    businessAddress: '',
    businessPhone: '',
    businessEmail: '',
    currency: 'USD',
    currencySymbol: '$',
    taxRate: '0.08',
    timezone: 'UTC',
    language: 'en'
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  const loadProfileData = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const [profile, settings] = await Promise.all([
        profileService.getUserProfile(user.id),
        profileService.getBusinessSettings()
      ]);

      setUserProfile(profile);
      setBusinessSettings(settings);

      // Initialize forms with current data
      if (profile) {
        setProfileForm({
          phoneNumber: profile.phoneNumber || '',
          address: profile.address || '',
          theme: profile.preferences.theme,
          notifications: profile.preferences.notifications,
          language: profile.preferences.language
        });
      }

      if (settings) {
        setBusinessForm({
          businessName: settings.businessName,
          businessAddress: settings.businessAddress,
          businessPhone: settings.businessPhone,
          businessEmail: settings.businessEmail,
          currency: settings.currency,
          currencySymbol: settings.currencySymbol,
          taxRate: settings.taxRate.toString(),
          timezone: settings.timezone,
          language: settings.language
        });
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) {
      return;
    }

    try {
      setLoading(true);
      const updatedProfile = await profileService.updateUserProfile(user.id, {
        phoneNumber: profileForm.phoneNumber,
        address: profileForm.address,
        preferences: {
          theme: profileForm.theme,
          notifications: profileForm.notifications,
          language: profileForm.language
        }
      });

      setUserProfile(updatedProfile);
      setShowEditProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBusinessSettings = async () => {
    try {
      setLoading(true);
      const updatedSettings = await profileService.updateBusinessSettings({
        businessName: businessForm.businessName,
        businessAddress: businessForm.businessAddress,
        businessPhone: businessForm.businessPhone,
        businessEmail: businessForm.businessEmail,
        currency: businessForm.currency,
        currencySymbol: businessForm.currencySymbol,
        taxRate: parseFloat(businessForm.taxRate),
        timezone: businessForm.timezone,
        language: businessForm.language
      });

      setBusinessSettings(updatedSettings);
      setShowBusinessSettings(false);
      Alert.alert('Success', 'Business settings updated successfully');
    } catch (error) {
      console.error('Failed to update business settings:', error);
      Alert.alert('Error', 'Failed to update business settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) {
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const success = await profileService.changePassword(
        user.id,
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (success) {
        setShowChangePassword(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        Alert.alert('Success', 'Password changed successfully');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    if (!user) {
      return;
    }

    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to update your avatar.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.uri.trim() !== '') {
          // Validate URI format
          if (asset.uri.startsWith('file://') || asset.uri.startsWith('content://') || asset.uri.startsWith('http')) {
            const updatedProfile = await profileService.updateAvatar(user.id, asset.uri);
            setUserProfile(updatedProfile);
            Alert.alert('Success', 'Avatar updated successfully');
          } else {
            Alert.alert('Error', 'Invalid image format');
          }
        } else {
          Alert.alert('Error', 'No image selected');
        }
      }
    } catch (error) {
      console.error('Failed to pick avatar:', error);
      Alert.alert('Error', 'Failed to update avatar. Please try again.');
    }
  };

  const handlePickLogo = async () => {
    try {
      // Request permission first
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to update your business logo.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [2, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.uri.trim() !== '') {
          // Validate URI format
          if (asset.uri.startsWith('file://') || asset.uri.startsWith('content://') || asset.uri.startsWith('http')) {
            const updatedSettings = await profileService.updateBusinessLogo(asset.uri);
            setBusinessSettings(updatedSettings);
            Alert.alert('Success', 'Business logo updated successfully');
          } else {
            Alert.alert('Error', 'Invalid image format');
          }
        } else {
          Alert.alert('Error', 'No image selected');
        }
      }
    } catch (error) {
      console.error('Failed to pick logo:', error);
      Alert.alert('Error', 'Failed to update business logo. Please try again.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile & Settings</Text>
          <Text style={styles.subtitle}>Manage your account and business</Text>
        </View>

        {/* User Profile Section */}
        <Card variant="elevated" padding="lg" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Personal Profile</Text>
            <Button
              title="Edit"
              variant="outline"
              size="sm"
              onPress={() => setShowEditProfile(true)}
            />
          </View>

          <View style={styles.profileInfo}>
            <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar}>
              {userProfile?.avatar ? (
                <Image 
                  source={{ uri: userProfile.avatar }} 
                  style={styles.avatar}
                  onError={() => {
                    console.log('Failed to load avatar image');
                    // Optionally reset the avatar if it fails to load
                    // setUserProfile(prev => prev ? { ...prev, avatar: undefined } : prev);
                  }}
                  resizeMode="cover"
                  defaultSource={require('../../assets/images/icon.png')}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={32} color={theme.colors.textLight} />
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={16} color={theme.colors.surface} />
              </View>
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userRole}>{user.role.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone:</Text>
              <Text style={styles.detailValue}>
                {userProfile?.phoneNumber || 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>
                {userProfile?.address || 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Theme:</Text>
              <Text style={styles.detailValue}>
                {userProfile?.preferences.theme || 'Auto'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Business Settings Section */}
        <Card variant="elevated" padding="lg" style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={24} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Business Settings</Text>
            <Button
              title="Edit"
              variant="outline"
              size="sm"
              onPress={() => setShowBusinessSettings(true)}
            />
          </View>

          <View style={styles.businessInfo}>
            <TouchableOpacity style={styles.logoContainer} onPress={handlePickLogo}>
              {businessSettings?.businessLogo ? (
                <Image 
                  source={{ uri: businessSettings.businessLogo }} 
                  style={styles.logo}
                  onError={() => {
                    console.log('Failed to load business logo');
                    // Optionally reset the logo if it fails to load
                    // setBusinessSettings(prev => prev ? { ...prev, businessLogo: undefined } : prev);
                  }}
                  resizeMode="cover"
                  defaultSource={require('../../assets/images/icon.png')}
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="business" size={32} color={theme.colors.textLight} />
                </View>
              )}
              <View style={styles.logoOverlay}>
                <Ionicons name="camera" size={16} color={theme.colors.surface} />
              </View>
            </TouchableOpacity>

            <View style={styles.businessDetails}>
              <Text style={styles.businessName}>
                {businessSettings?.businessName || 'Business Name Not Set'}
              </Text>
              <Text style={styles.businessAddress}>
                {businessSettings?.businessAddress || 'Address Not Set'}
              </Text>
              <Text style={styles.businessContact}>
                {businessSettings?.businessPhone || 'Phone Not Set'} • {businessSettings?.businessEmail || 'Email Not Set'}
              </Text>
            </View>
          </View>

          <View style={styles.businessDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Currency:</Text>
              <Text style={styles.detailValue}>
                {businessSettings?.currencySymbol} ({businessSettings?.currency})
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tax Rate:</Text>
              <Text style={styles.detailValue}>
                {businessSettings ? `${(businessSettings.taxRate * 100).toFixed(1)}%` : 'Not set'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Timezone:</Text>
              <Text style={styles.detailValue}>
                {businessSettings?.timezone || 'Not set'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Quick Actions */}
        <Card variant="outlined" padding="lg" style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <Button
            title="Change Password"
            variant="outline"
            icon="lock-closed"
            onPress={() => setShowChangePassword(true)}
            style={styles.actionButton}
          />
          
                     <Button
             title="Logout"
             variant="outline"
             icon="log-out-outline"
             onPress={handleLogout}
             style={styles.logoutButton}
           />
        </Card>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditProfile(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditProfile(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile} disabled={loading}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <KeyboardAvoidingView 
            style={styles.modalContent} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Input
              label="Phone Number"
              value={profileForm.phoneNumber}
              onChangeText={(text) => setProfileForm(prev => ({ ...prev, phoneNumber: text }))}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            <Input
              label="Address"
              value={profileForm.address}
              onChangeText={(text) => setProfileForm(prev => ({ ...prev, address: text }))}
              placeholder="Enter address"
              multiline
            />
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Notifications</Text>
              <Switch
                value={profileForm.notifications}
                onValueChange={(value) => setProfileForm(prev => ({ ...prev, notifications: value }))}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Business Settings Modal */}
      <Modal
        visible={showBusinessSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBusinessSettings(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBusinessSettings(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Business Settings</Text>
            <TouchableOpacity onPress={handleUpdateBusinessSettings} disabled={loading}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <KeyboardAvoidingView 
            style={styles.modalContent} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Input
              label="Business Name"
              value={businessForm.businessName}
              onChangeText={(text) => setBusinessForm(prev => ({ ...prev, businessName: text }))}
              placeholder="Enter business name"
            />
            <Input
              label="Business Address"
              value={businessForm.businessAddress}
              onChangeText={(text) => setBusinessForm(prev => ({ ...prev, businessAddress: text }))}
              placeholder="Enter business address"
              multiline
            />
            <Input
              label="Business Phone"
              value={businessForm.businessPhone}
              onChangeText={(text) => setBusinessForm(prev => ({ ...prev, businessPhone: text }))}
              placeholder="Enter business phone"
              keyboardType="phone-pad"
            />
            <Input
              label="Business Email"
              value={businessForm.businessEmail}
              onChangeText={(text) => setBusinessForm(prev => ({ ...prev, businessEmail: text }))}
              placeholder="Enter business email"
              keyboardType="email-address"
            />
            <Input
              label="Tax Rate (0-1)"
              value={businessForm.taxRate}
              onChangeText={(text) => setBusinessForm(prev => ({ ...prev, taxRate: text }))}
              placeholder="0.08"
              keyboardType="numeric"
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowChangePassword(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={handleChangePassword} disabled={loading}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <KeyboardAvoidingView 
            style={styles.modalContent} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Input
              label="Current Password"
              value={passwordForm.currentPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
              placeholder="Enter current password"
              secureTextEntry
            />
            <Input
              label="New Password"
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
              placeholder="Enter new password"
              secureTextEntry
            />
            <Input
              label="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
              placeholder="Confirm new password"
              secureTextEntry
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 12,
    flex: 1,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  profileDetails: {
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    position: 'relative',
    marginRight: 16,
  },
  logo: {
    width: 100,
    height: 50,
    borderRadius: 8,
  },
  logoPlaceholder: {
    width: 100,
    height: 50,
    borderRadius: 8,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessDetails: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  businessAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  businessContact: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  actionButton: {
    marginBottom: 12,
  },
  logoutButton: {
    borderColor: theme.colors.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.error,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  saveText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  switchLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: 50,
  },
});
