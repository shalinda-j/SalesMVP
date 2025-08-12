// Basic Jest setup for React Native testing

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(),
    runAsync: jest.fn(),
    getFirstAsync: jest.fn(),
    getAllAsync: jest.fn(),
    closeAsync: jest.fn(),
  })),
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    Constants: {
      Type: {
        back: 'back',
        front: 'front',
      },
    },
  },
}));

// Mock expo-barcode-scanner (removed as package is no longer used)

// Mock React Native components that might cause issues
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => 'StatusBar');
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Global test setup
global.__DEV__ = true;