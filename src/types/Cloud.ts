// Cloud Integration Types for Phase 6

export interface CloudConfig {
  provider: 'firebase' | 'supabase' | 'custom';
  apiUrl: string;
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export interface CloudUser {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  tenantId?: string;
  customClaims?: Record<string, any>;
}

export interface CloudAuthResult {
  user: CloudUser | null;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  error?: string;
}

export interface SyncMetadata {
  id: string;
  entityType: 'product' | 'sale' | 'user' | 'inventory' | 'supplier' | 'settings';
  entityId: string;
  version: number;
  lastModified: string;
  lastModifiedBy: string;
  deviceId: string;
  operation: 'create' | 'update' | 'delete';
  conflictResolved: boolean;
  syncStatus: 'pending' | 'synced' | 'error' | 'conflict';
  retryCount: number;
  errorMessage?: string;
}

export interface SyncOperation {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  localData?: any;
  cloudData?: any;
  timestamp: string;
  deviceId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

export interface ConflictResolution {
  conflictId: string;
  entityType: string;
  entityId: string;
  localVersion: any;
  cloudVersion: any;
  resolution: 'use_local' | 'use_cloud' | 'merge' | 'manual';
  resolvedData?: any;
  resolvedBy?: string;
  resolvedAt?: string;
  autoResolved: boolean;
}

export interface SyncStats {
  lastSyncAt: string | null;
  pendingOperations: number;
  completedOperations: number;
  failedOperations: number;
  conflictsResolved: number;
  totalDataSynced: number;
  averageSyncTime: number;
  isOnline: boolean;
  lastOnlineAt: string | null;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'web' | 'ios' | 'android';
  appVersion: string;
  lastSyncAt: string | null;
  isActive: boolean;
  userId?: string;
  registeredAt: string;
  lastHeartbeat: string;
}

export interface CloudBackupInfo {
  backupId: string;
  timestamp: string;
  size: number;
  entities: {
    products: number;
    sales: number;
    users: number;
    suppliers: number;
    inventory: number;
  };
  compressionRatio: number;
  encryptionEnabled: boolean;
  deviceId: string;
  userId: string;
  status: 'creating' | 'completed' | 'failed';
  errorMessage?: string;
}

export interface CloudRestoreInfo {
  restoreId: string;
  backupId: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  entitiesRestored: {
    products: number;
    sales: number;
    users: number;
    suppliers: number;
    inventory: number;
  };
  errorMessage?: string;
  userId: string;
  deviceId: string;
}

export interface TenantInfo {
  tenantId: string;
  name: string;
  description?: string;
  businessType: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactInfo?: {
    email: string;
    phone: string;
    website?: string;
  };
  settings: {
    currency: string;
    timezone: string;
    dateFormat: string;
    taxRate: number;
    receiptSettings: any;
  };
  ownerId: string;
  members: Array<{
    userId: string;
    role: 'owner' | 'admin' | 'manager' | 'cashier';
    joinedAt: string;
    isActive: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  subscription?: {
    plan: 'free' | 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired';
    startDate: string;
    endDate?: string;
    features: string[];
  };
}

export interface CloudQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'not-in' | 'contains';
    value: any;
  }>;
  select?: string[];
}

export interface CloudQueryResult<T> {
  data: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
  executionTime: number;
}

export interface CloudOperationResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTime: number;
    operationId: string;
    timestamp: string;
  };
}

export interface NetworkStatus {
  isOnline: boolean;
  connectionType: 'none' | 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  isInternetReachable: boolean | null;
  details?: {
    strength?: number;
    bandwidth?: number;
    latency?: number;
  };
}

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  priority: 'low' | 'normal' | 'high' | 'critical';
  dependencies?: string[];
  retryPolicy: {
    maxRetries: number;
    backoffStrategy: 'linear' | 'exponential' | 'fixed';
    baseDelay: number;
  };
  createdAt: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
}

// Service Interfaces

export interface ICloudAuthService {
  initialize(config: CloudConfig): Promise<void>;
  signIn(email: string, password: string): Promise<CloudAuthResult>;
  signUp(email: string, password: string, displayName?: string): Promise<CloudAuthResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<CloudUser | null>;
  refreshToken(): Promise<CloudAuthResult>;
  resetPassword(email: string): Promise<void>;
  updateProfile(updates: Partial<CloudUser>): Promise<CloudUser>;
  deleteAccount(): Promise<void>;
  onAuthStateChanged(callback: (user: CloudUser | null) => void): () => void;
}

export interface ICloudDatabaseService {
  initialize(config: CloudConfig): Promise<void>;
  
  // CRUD operations
  create<T>(collection: string, data: T): Promise<CloudOperationResult>;
  read<T>(collection: string, id: string): Promise<T | null>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<CloudOperationResult>;
  delete(collection: string, id: string): Promise<CloudOperationResult>;
  
  // Query operations
  query<T>(collection: string, options?: CloudQueryOptions): Promise<CloudQueryResult<T>>;
  
  // Real-time subscriptions
  subscribe<T>(collection: string, callback: (data: T[]) => void, options?: CloudQueryOptions): () => void;
  
  // Batch operations
  batch(operations: Array<{
    operation: 'create' | 'update' | 'delete';
    collection: string;
    id?: string;
    data?: any;
  }>): Promise<CloudOperationResult>;
  
  // Transaction support
  transaction<T>(callback: (transaction: any) => Promise<T>): Promise<T>;
}

export interface ICloudSyncService {
  initialize(config: CloudConfig): Promise<void>;
  
  // Sync operations
  syncUp(entityType: string, data: any[]): Promise<SyncStats>;
  syncDown(entityType: string, lastSyncAt?: string): Promise<any[]>;
  fullSync(): Promise<SyncStats>;
  
  // Conflict resolution
  resolveConflict(conflict: ConflictResolution): Promise<void>;
  getConflicts(): Promise<ConflictResolution[]>;
  
  // Sync monitoring
  getSyncStats(): Promise<SyncStats>;
  onSyncStatusChanged(callback: (stats: SyncStats) => void): () => void;
  
  // Device management
  registerDevice(info: DeviceInfo): Promise<void>;
  getDevices(): Promise<DeviceInfo[]>;
  
  // Queue management
  addToQueue(operation: SyncOperation, priority?: 'low' | 'normal' | 'high' | 'critical'): Promise<void>;
  processQueue(): Promise<void>;
  clearQueue(): Promise<void>;
}

export interface ICloudBackupService {
  initialize(config: CloudConfig): Promise<void>;
  
  // Backup operations
  createBackup(includeMedia?: boolean): Promise<CloudBackupInfo>;
  listBackups(): Promise<CloudBackupInfo[]>;
  deleteBackup(backupId: string): Promise<void>;
  
  // Restore operations
  restoreFromBackup(backupId: string): Promise<CloudRestoreInfo>;
  getRestoreStatus(restoreId: string): Promise<CloudRestoreInfo>;
  
  // Automated backup
  scheduleAutomaticBackup(interval: 'daily' | 'weekly' | 'monthly'): Promise<void>;
  cancelAutomaticBackup(): Promise<void>;
  
  // Backup verification
  verifyBackup(backupId: string): Promise<boolean>;
  validateBackupIntegrity(backupId: string): Promise<boolean>;
}

export interface ICloudStorageService {
  initialize(config: CloudConfig): Promise<void>;
  
  // File operations
  upload(path: string, file: File | Blob, metadata?: any): Promise<string>;
  download(path: string): Promise<Blob>;
  delete(path: string): Promise<void>;
  
  // Metadata operations
  getMetadata(path: string): Promise<any>;
  updateMetadata(path: string, metadata: any): Promise<void>;
  
  // List operations
  list(path: string, options?: { maxResults?: number; pageToken?: string }): Promise<{
    items: Array<{ name: string; size: number; updated: string }>;
    nextPageToken?: string;
  }>;
  
  // URL generation
  getDownloadURL(path: string, expiresIn?: number): Promise<string>;
  getUploadURL(path: string, expiresIn?: number): Promise<string>;
}

// Error Types
export class CloudError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CloudError';
  }
}

export class SyncError extends Error {
  constructor(
    message: string,
    public operation: SyncOperation,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    public conflict: ConflictResolution
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}
