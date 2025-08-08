import { User, CreateUserInput } from '../types/auth';
import { authService } from './AuthService';

class DemoUserService {
  private static instance: DemoUserService;

  static getInstance(): DemoUserService {
    if (!DemoUserService.instance) {
      DemoUserService.instance = new DemoUserService();
    }
    return DemoUserService.instance;
  }

  async initializeDemoUsers(): Promise<void> {
    try {
      console.log('🧪 Initializing demo users for Phase 4...');
      
      const existingUsers = await authService.getAllUsers();
      
      // Define demo users
      const demoUsers: Array<{ user: CreateUserInput; password: string }> = [
        {
          user: {
            username: 'manager',
            email: 'manager@salesmvp.com',
            firstName: 'John',
            lastName: 'Manager',
            role: 'manager'
          },
          password: 'manager123'
        },
        {
          user: {
            username: 'cashier',
            email: 'cashier@salesmvp.com', 
            firstName: 'Jane',
            lastName: 'Cashier',
            role: 'cashier'
          },
          password: 'cashier123'
        },
        {
          user: {
            username: 'sarah',
            email: 'sarah@salesmvp.com',
            firstName: 'Sarah',
            lastName: 'Wilson',
            role: 'manager'
          },
          password: 'sarah123'
        },
        {
          user: {
            username: 'mike',
            email: 'mike@salesmvp.com',
            firstName: 'Mike',
            lastName: 'Johnson',
            role: 'cashier'
          },
          password: 'mike123'
        },
        {
          user: {
            username: 'lisa',
            email: 'lisa@salesmvp.com',
            firstName: 'Lisa',
            lastName: 'Chen',
            role: 'cashier'
          },
          password: 'lisa123'
        }
      ];

      // Create users that don't exist
      for (const { user, password } of demoUsers) {
        const exists = existingUsers.some(u => 
          u.username === user.username || u.email === user.email
        );

        if (!exists) {
          try {
            const newUser = await authService.createUser(user, password);
            console.log(`✅ Created demo user: ${newUser.username} (${newUser.role})`);
          } catch (error) {
            console.warn(`⚠️ Failed to create user ${user.username}:`, error);
          }
        } else {
          console.log(`ℹ️ Demo user ${user.username} already exists`);
        }
      }

      console.log('🎉 Demo users initialization complete!');
      
      // Log available demo accounts
      this.logDemoCredentials();

    } catch (error) {
      console.error('❌ Failed to initialize demo users:', error);
    }
  }

  private logDemoCredentials(): void {
    console.log('\n🔐 DEMO CREDENTIALS:\n');
    console.log('👑 ADMIN ACCESS:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Permissions: Full system access\n');
    
    console.log('👔 MANAGER ACCESS:');
    console.log('   Username: manager');
    console.log('   Password: manager123');
    console.log('   Username: sarah');
    console.log('   Password: sarah123');
    console.log('   Permissions: POS + Inventory + Reports\n');
    
    console.log('🧑‍💼 CASHIER ACCESS:');
    console.log('   Username: cashier');
    console.log('   Password: cashier123');
    console.log('   Username: mike');
    console.log('   Password: mike123');
    console.log('   Username: lisa');
    console.log('   Password: lisa123');
    console.log('   Permissions: POS operations only\n');
  }

  // Get demo user info for testing
  getDemoCredentials() {
    return {
      admin: { username: 'admin', password: 'admin123', role: 'admin' },
      managers: [
        { username: 'manager', password: 'manager123', role: 'manager' },
        { username: 'sarah', password: 'sarah123', role: 'manager' }
      ],
      cashiers: [
        { username: 'cashier', password: 'cashier123', role: 'cashier' },
        { username: 'mike', password: 'mike123', role: 'cashier' },
        { username: 'lisa', password: 'lisa123', role: 'cashier' }
      ]
    };
  }

  // Utility method to create a custom demo user
  async createCustomDemoUser(
    username: string,
    email: string,
    firstName: string,
    lastName: string,
    role: 'admin' | 'manager' | 'cashier',
    password: string
  ): Promise<User> {
    const userInput: CreateUserInput = {
      username,
      email,
      firstName,
      lastName,
      role
    };

    return await authService.createUser(userInput, password);
  }

  // Test authentication with demo users
  async testDemoLogin(username: string, password: string): Promise<boolean> {
    try {
      const session = await authService.login({ username, password });
      console.log(`✅ Demo login test successful for ${username} (${session.user.role})`);
      await authService.logout();
      return true;
    } catch (error) {
      console.error(`❌ Demo login test failed for ${username}:`, error);
      return false;
    }
  }

  // Run authentication tests for all demo users
  async runDemoTests(): Promise<void> {
    console.log('🧪 Running demo user authentication tests...');
    
    const credentials = this.getDemoCredentials();
    
    // Test admin
    await this.testDemoLogin(credentials.admin.username, credentials.admin.password);
    
    // Test managers
    for (const manager of credentials.managers) {
      await this.testDemoLogin(manager.username, manager.password);
    }
    
    // Test cashiers
    for (const cashier of credentials.cashiers) {
      await this.testDemoLogin(cashier.username, cashier.password);
    }
    
    console.log('🎉 Demo tests completed!');
  }
}

export const demoUserService = DemoUserService.getInstance();
