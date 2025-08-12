import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../stores/DatabaseFactory';
import {
  User,
  UserRole,
  UserPermissions,
  LoginCredentials,
  AuthSession,
  CreateUserInput,
  UpdateUserInput,
  AuditLog,
  ROLE_PERMISSIONS,
  UserProfile
} from '../types';

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;
  private readonly SESSION_TOKEN_KEY = 'auth_session_token';

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Initialize default admin user
  private async initializeDefaultAdmin(): Promise<void> {
    try {
      const users = await this.getAllUsers();
      const hasAdmin = users.some(user => user.role === 'admin');
      
      if (!hasAdmin) {
        const defaultAdmin: User = {
          id: 'admin-001',
          username: 'admin',
          email: 'admin@salesmvp.com',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // In production, this should be properly hashed
        await this.createUserWithPassword(defaultAdmin, 'admin123');
        
        console.log('🔐 Default admin user created: admin/admin123');
      }
    } catch (error) {
      console.error('Failed to initialize default admin:', error);
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      await this.logAudit('auth', 'login_attempt', { username: credentials.username });

      const user = await database.getUserByUsername(credentials.username);
      if (!user || !user.isActive) {
        throw new Error('Invalid username or password');
      }

      // In production, implement proper password hashing (bcrypt, etc.)
      const storedPassword = await this.getStoredPassword(user.id);
      if (storedPassword !== credentials.password) {
        await this.logAudit('auth', 'login_failed', { 
          username: credentials.username, 
          reason: 'invalid_password' 
        });
        throw new Error('Invalid username or password');
      }

      // Update last login
      await database.updateUser({ ...user, lastLogin: new Date() });

      // Create session
      const session: AuthSession = {
        user,
        token: this.generateSessionToken(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        permissions: ROLE_PERMISSIONS[user.role]
      };

      await this.saveSession(session);
      this.currentSession = session;

      // Ensure user profile exists
      await this.ensureUserProfile(user.id);

      await this.logAudit('auth', 'login_success', { 
        userId: user.id, 
        username: user.username 
      });

      return session;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.currentSession) {
        await database.deleteAuthSession(this.currentSession.token);
        await this.logAudit('auth', 'logout', { 
          userId: this.currentSession.user.id, 
          username: this.currentSession.user.username 
        });
      }
      
      // Clear the stored session token
      await AsyncStorage.removeItem(this.SESSION_TOKEN_KEY);
      this.currentSession = null;
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      if (this.currentSession) {
        // Check if session is still valid
        if (new Date() < this.currentSession.expiresAt) {
          return this.currentSession;
        } else {
          // Session expired
          await this.logout();
          return null;
        }
      }

      // Try to restore from AsyncStorage first
      const storedToken = await AsyncStorage.getItem(this.SESSION_TOKEN_KEY);
      if (storedToken) {
        // Try to restore from database using stored token
        const sessionData = await database.getAuthSession(storedToken);
        if (sessionData && new Date() < sessionData.expiresAt) {
          const user = await database.getUser(sessionData.userId);
          if (user) {
            this.currentSession = {
              user,
              token: sessionData.token,
              expiresAt: sessionData.expiresAt,
              permissions: ROLE_PERMISSIONS[user.role]
            };
            return this.currentSession;
          }
        } else {
          // Session is invalid, clear stored token
          await AsyncStorage.removeItem(this.SESSION_TOKEN_KEY);
        }
      }

      return null;
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const session = await this.getCurrentSession();
    return session ? session.user : null;
  }

  // User management methods
  async createUser(input: CreateUserInput, password: string): Promise<User> {
    try {
      // Check for duplicate username/email
      const existingUser = await database.getUserByUsername(input.username);
      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      const user = await database.createUser(input);
      await this.savePassword(user.id, password);

      // Ensure user profile exists
      await this.ensureUserProfile(user.id);

      await this.logAudit('user_management', 'user_created', {
        newUserId: user.id,
        username: user.username,
        role: user.role
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  private async createUserWithPassword(user: User, password: string): Promise<void> {
    await database.createUser({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });
    await this.savePassword(user.id, password);
  }

  async updateUser(input: UpdateUserInput): Promise<User> {
    try {
      const updatedUser = await database.updateUser(input);
      await this.logAudit('user_management', 'user_updated', {
        userId: input.id,
        updates: input
      });
      return updatedUser;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw new Error('Failed to update user');
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await database.getAllUsers();
    } catch (error) {
      console.error('Failed to get all users:', error);
      throw new Error('Failed to load users');
    }
  }

  async getUser(id: string): Promise<User | null> {
    try {
      return await database.getUser(id);
    } catch (error) {
      console.error('Failed to get user:', error);
      throw new Error('Failed to load user');
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const success = await database.deleteUser(id);
      if (success) {
        await this.logAudit('user_management', 'user_deleted', { userId: id });
      }
      return success;
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw new Error('Failed to delete user');
    }
  }

  // Password management
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const storedPassword = await this.getStoredPassword(userId);
      
      if (storedPassword !== oldPassword) {
        throw new Error('Current password is incorrect');
      }

      await this.savePassword(userId, newPassword);

      await this.logAudit('auth', 'password_changed', { userId });

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Audit logging
  private async logAudit(resource: string, action: string, details?: any): Promise<void> {
    try {
      const userId = this.currentSession?.user.id || null;
      await database.logAuditEvent(userId, action, resource, details);
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error for audit logging failures
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      return await database.getAuditLogs();
    } catch (error) {
      console.error('Get audit logs error:', error);
      return [];
    }
  }

  // Permission checking
  hasPermission(permission: keyof UserPermissions): boolean {
    if (!this.currentSession) {return false;}
    return this.currentSession.permissions[permission] || false;
  }

  requirePermission(permission: keyof UserPermissions): void {
    if (!this.hasPermission(permission)) {
      throw new Error(`Access denied: ${permission} permission required`);
    }
  }

  // Private helper methods
  private generateSessionToken(): string {
    return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveSession(session: AuthSession): Promise<void> {
    try {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await database.saveAuthSession(sessionId, session.user.id, session.token, session.expiresAt);
      
      // Also store the token in AsyncStorage for persistence
      await AsyncStorage.setItem(this.SESSION_TOKEN_KEY, session.token);
    } catch (error) {
      console.error('Failed to save session:', error);
      throw new Error('Failed to save session');
    }
  }

  private async savePassword(userId: string, password: string): Promise<void> {
    try {
      // In production, use proper password hashing (bcrypt, etc.)
      const passwordHash = password; // For now, store plain text (NOT for production!)
      const salt = 'default-salt'; // In production, generate unique salt
      
      await database.saveUserPassword(userId, passwordHash, salt);
    } catch (error) {
      console.error('Failed to save password:', error);
      throw new Error('Failed to save password');
    }
  }

  private async getStoredPassword(userId: string): Promise<string> {
    try {
      const passwordData = await database.getUserPassword(userId);
      if (!passwordData) {
        throw new Error('Password not found');
      }
      return passwordData.passwordHash; // In production, verify hash
    } catch (error) {
      console.error('Failed to get stored password:', error);
      throw new Error('Failed to retrieve password');
    }
  }

  // Initialize the service
  async initialize(): Promise<void> {
    try {
      await this.initializeDefaultAdmin();
      console.log('✅ AuthService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AuthService:', error);
      throw error;
    }
  }

  // Ensure user profile exists
  private async ensureUserProfile(userId: string): Promise<void> {
    try {
      const existingProfile = await database.getUserProfile(userId);
      if (!existingProfile) {
        // Create default user profile
        const defaultProfile: UserProfile = {
          id: `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId,
          avatar: undefined,
          phoneNumber: undefined,
          address: undefined,
          preferences: {
            theme: 'auto',
            notifications: true,
            language: 'en'
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await database.saveUserProfile(defaultProfile);
        console.log(`✅ Created default profile for user ${userId}`);
      }
    } catch (error) {
      console.error('Failed to ensure user profile:', error);
      // Don't throw error for profile creation failures
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
