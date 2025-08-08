import { storageService } from './StorageService';
import {
  User,
  UserRole,
  UserPermissions,
  LoginCredentials,
  AuthSession,
  CreateUserInput,
  UpdateUserInput,
  AuditLog,
  ROLE_PERMISSIONS
} from '../types/auth';

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;
  
  // Storage keys
  private readonly SESSION_KEY = '@salesmvp_session';
  private readonly USERS_KEY = '@salesmvp_users';
  private readonly AUDIT_KEY = '@salesmvp_audit_logs';

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private constructor() {
    this.initializeDefaultAdmin();
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

      const users = await this.getAllUsers();
      const user = users.find(u => u.username === credentials.username && u.isActive);

      if (!user) {
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
      user.lastLogin = new Date();
      await this.updateUser({ ...user, lastLogin: user.lastLogin });

      // Create session
      const session: AuthSession = {
        user,
        token: this.generateSessionToken(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        permissions: ROLE_PERMISSIONS[user.role]
      };

      await this.saveSession(session);
      this.currentSession = session;

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
        await this.logAudit('auth', 'logout', { 
          userId: this.currentSession.user.id 
        });
      }

      await storageService.removeItem(this.SESSION_KEY);
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

      // Try to restore from storage
      const sessionData = await storageService.getItem(this.SESSION_KEY);
      if (sessionData) {
        const session: AuthSession = JSON.parse(sessionData);
        
        // Convert date strings back to Date objects
        session.expiresAt = new Date(session.expiresAt);
        session.user.createdAt = new Date(session.user.createdAt);
        session.user.updatedAt = new Date(session.user.updatedAt);
        if (session.user.lastLogin) {
          session.user.lastLogin = new Date(session.user.lastLogin);
        }

        if (new Date() < session.expiresAt) {
          this.currentSession = session;
          return session;
        } else {
          await this.logout();
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('Get current session error:', error);
      return null;
    }
  }

  // User management methods
  async createUser(input: CreateUserInput, password: string): Promise<User> {
    try {
      const users = await this.getAllUsers();
      
      // Check for duplicate username/email
      const existingUser = users.find(u => 
        u.username === input.username || u.email === input.email
      );
      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      const user: User = {
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        username: input.username,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      users.push(user);
      await this.saveUsers(users);
      await this.savePassword(user.id, password);

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
    const users = await this.getAllUsers();
    users.push(user);
    await this.saveUsers(users);
    await this.savePassword(user.id, password);
  }

  async updateUser(input: UpdateUserInput): Promise<User> {
    try {
      const users = await this.getAllUsers();
      const userIndex = users.findIndex(u => u.id === input.id);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      const updatedUser = {
        ...users[userIndex],
        ...input,
        updatedAt: new Date()
      };

      users[userIndex] = updatedUser;
      await this.saveUsers(users);

      await this.logAudit('user_management', 'user_updated', {
        userId: input.id,
        changes: input
      });

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const usersData = await storageService.getItem(this.USERS_KEY);
      if (!usersData) return [];

      const users = JSON.parse(usersData);
      return users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined
      }));
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Cannot delete the last admin user
      const users = await this.getAllUsers();
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      if (user.role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      const filteredUsers = users.filter(u => u.id !== userId);
      await this.saveUsers(filteredUsers);

      // Remove stored password
      await storageService.removeItem(`@password_${userId}`);

      await this.logAudit('user_management', 'user_deleted', {
        deletedUserId: userId,
        username: user.username
      });

      return true;
    } catch (error) {
      throw error;
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
  private async logAudit(action: string, resource: string, details?: any): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: this.currentSession?.user?.id || 'system',
        action,
        resource,
        details,
        timestamp: new Date()
      };

      const logs = await this.getAuditLogs();
      logs.push(auditLog);

      // Keep only last 1000 logs
      if (logs.length > 1000) {
        logs.splice(0, logs.length - 1000);
      }

      await storageService.setItem(this.AUDIT_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const logsData = await storageService.getItem(this.AUDIT_KEY);
      if (!logsData) return [];

      const logs = JSON.parse(logsData);
      return logs.map((log: any) => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch (error) {
      console.error('Get audit logs error:', error);
      return [];
    }
  }

  // Permission checking
  hasPermission(permission: keyof UserPermissions): boolean {
    if (!this.currentSession) return false;
    return this.currentSession.permissions[permission] || false;
  }

  requirePermission(permission: keyof UserPermissions): void {
    if (!this.hasPermission(permission)) {
      throw new Error(`Access denied: ${permission} permission required`);
    }
  }

  // Private helper methods
  private generateSessionToken(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private async saveSession(session: AuthSession): Promise<void> {
    await storageService.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  private async saveUsers(users: User[]): Promise<void> {
    await storageService.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  private async savePassword(userId: string, password: string): Promise<void> {
    // In production, hash the password with bcrypt or similar
    await storageService.setItem(`@password_${userId}`, password);
  }

  private async getStoredPassword(userId: string): Promise<string | null> {
    return await storageService.getItem(`@password_${userId}`);
  }
}

export const authService = AuthService.getInstance();
