import { database } from '../stores/DatabaseFactory';
import {
  UserProfile,
  BusinessSettings,
  UpdateUserProfileInput,
  UpdateBusinessSettingsInput
} from '../types';

class ProfileService {
  private static instance: ProfileService;

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  // User Profile Methods
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await database.getUserProfile(userId);
    } catch (error) {
      console.error('Failed to get user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, profile: UpdateUserProfileInput): Promise<UserProfile> {
    try {
      const existingProfile = await this.getUserProfile(userId);
      if (!existingProfile) {
        throw new Error('User profile not found');
      }

      const updatedProfile: UserProfile = {
        ...existingProfile,
        ...profile,
        preferences: {
          ...existingProfile.preferences,
          ...profile.preferences
        },
        updatedAt: new Date()
      };

      return await database.saveUserProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  }

  async createUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const newProfile: UserProfile = {
        id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        avatar: profile.avatar,
        phoneNumber: profile.phoneNumber,
        address: profile.address,
        preferences: profile.preferences || {
          theme: 'auto',
          notifications: true,
          language: 'en'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return await database.saveUserProfile(newProfile);
    } catch (error) {
      console.error('Failed to create user profile:', error);
      throw error;
    }
  }

  // Business Settings Methods
  async getBusinessSettings(): Promise<BusinessSettings | null> {
    try {
      return await database.getBusinessSettings();
    } catch (error) {
      console.error('Failed to get business settings:', error);
      throw error;
    }
  }

  async updateBusinessSettings(settings: UpdateBusinessSettingsInput): Promise<BusinessSettings> {
    try {
      const existing = await this.getBusinessSettings();
      if (!existing) {
        throw new Error('Business settings not found');
      }

      const updatedSettings: BusinessSettings = {
        ...existing,
        ...settings,
        updatedAt: new Date()
      };

      return await database.saveBusinessSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update business settings:', error);
      throw error;
    }
  }

  async createBusinessSettings(settings: Partial<BusinessSettings>): Promise<BusinessSettings> {
    try {
      const newSettings: BusinessSettings = {
        id: 'default',
        businessName: settings.businessName || 'SalesMVP Store',
        businessLogo: settings.businessLogo,
        businessAddress: settings.businessAddress || '123 Business St, City, State 12345',
        businessPhone: settings.businessPhone || '+1 (555) 123-4567',
        businessEmail: settings.businessEmail || 'contact@salesmvp.com',
        currency: settings.currency || 'USD',
        currencySymbol: settings.currencySymbol || '$',
        taxRate: settings.taxRate || 0.08,
        timezone: settings.timezone || 'UTC',
        language: settings.language || 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return await database.saveBusinessSettings(newSettings);
    } catch (error) {
      console.error('Failed to create business settings:', error);
      throw error;
    }
  }

  // Initialize default business settings
  async initializeDefaultBusinessSettings(): Promise<void> {
    try {
      const existing = await this.getBusinessSettings();
      if (!existing) {
        await this.createBusinessSettings({
          businessName: 'SalesMVP Store',
          businessAddress: '123 Business St, City, State 12345',
          businessPhone: '+1 (555) 123-4567',
          businessEmail: 'contact@salesmvp.com',
          currency: 'USD',
          currencySymbol: '$',
          taxRate: 0.08,
          timezone: 'UTC',
          language: 'en'
        });
        console.log('✅ Default business settings created');
      }
    } catch (error) {
      console.error('Failed to initialize default business settings:', error);
    }
  }

  // Avatar and Logo Management
  async updateAvatar(userId: string, avatarUri: string): Promise<UserProfile> {
    try {
      return await this.updateUserProfile(userId, { avatar: avatarUri });
    } catch (error) {
      console.error('Failed to update avatar:', error);
      throw error;
    }
  }

  async updateBusinessLogo(logoUri: string): Promise<BusinessSettings> {
    try {
      return await this.updateBusinessSettings({ businessLogo: logoUri });
    } catch (error) {
      console.error('Failed to update business logo:', error);
      throw error;
    }
  }

  // Password Management
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // This would typically involve the AuthService for password validation
      // For now, we'll just return true as a placeholder
      console.log(`Password change requested for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  }

  // Currency and Localization
  async updateCurrency(currency: string, currencySymbol: string): Promise<BusinessSettings> {
    try {
      return await this.updateBusinessSettings({ currency, currencySymbol });
    } catch (error) {
      console.error('Failed to update currency:', error);
      throw error;
    }
  }

  async updateLanguage(language: string): Promise<BusinessSettings> {
    try {
      return await this.updateBusinessSettings({ language });
    } catch (error) {
      console.error('Failed to update language:', error);
      throw error;
    }
  }

  // Theme and Preferences
  async updateUserTheme(userId: string, theme: 'light' | 'dark' | 'auto'): Promise<UserProfile> {
    try {
      const profile = await this.getUserProfile(userId);
      const preferences = profile?.preferences || { theme: 'auto', notifications: true, language: 'en' };
      
      return await this.updateUserProfile(userId, {
        preferences: { ...preferences, theme }
      });
    } catch (error) {
      console.error('Failed to update user theme:', error);
      throw error;
    }
  }

  async updateNotificationSettings(userId: string, notifications: boolean): Promise<UserProfile> {
    try {
      const profile = await this.getUserProfile(userId);
      const preferences = profile?.preferences || { theme: 'auto', notifications: true, language: 'en' };
      
      return await this.updateUserProfile(userId, {
        preferences: { ...preferences, notifications }
      });
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const profileService = ProfileService.getInstance();
