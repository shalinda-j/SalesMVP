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

// Mock expo-barcode-scanner
jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
    Constants: {
      BarCodeType: {
        qr: 'qr',
        pdf417: 'pdf417',
        aztec: 'aztec',
        ean13: 'ean13',
        ean8: 'ean8',
        upc_e: 'upc_e',
        code39: 'code39',
        code93: 'code93',
        code128: 'code128',
        code39mod43: 'code39mod43',
        codabar: 'codabar',
        interleaved2of5: 'interleaved2of5',
        itf14: 'itf14',
        datamatrix: 'datamatrix',
      },
    },
  },
}));

// Mock React Native components that might cause issues
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => 'StatusBar');
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Global test setup
global.__DEV__ = true;