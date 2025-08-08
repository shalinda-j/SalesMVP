// Sync-related types and interfaces

export interface SyncMetadata {
  id: string;
  table_name: string;
  record_id: string;
  operation: SyncOperation;
  data_snapshot: string; // JSON string of the data
  created_at: string;
  synced_at?: string;
  device_id: string;
  sync_status: SyncStatus;
  retry_count: number;
  conflict_resolution?: ConflictResolution;
  version: number;
}

export enum SyncOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
  RESOLVED = 'RESOLVED'
}

export enum ConflictResolution {
  LOCAL_WINS = 'LOCAL_WINS',
  REMOTE_WINS = 'REMOTE_WINS',
  MERGE = 'MERGE',
  MANUAL = 'MANUAL'
}

export interface SyncConfig {
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  max_retry_attempts: number;
  conflict_resolution_strategy: ConflictResolution;
  device_id: string;
  last_sync_timestamp?: string;
  cloud_storage_endpoint?: string;
  cloud_auth_token?: string;
}

export interface CloudSyncData {
  device_id: string;
  timestamp: string;
  version: number;
  data: {
    products?: any[];
    sales?: any[];
    users?: any[];
    business_config?: any;
  };
  metadata: {
    total_records: number;
    checksum: string;
    schema_version: string;
  };
}

export interface SyncConflict {
  id: string;
  table_name: string;
  record_id: string;
  local_data: any;
  remote_data: any;
  local_version: number;
  remote_version: number;
  created_at: string;
  resolution_strategy?: ConflictResolution;
  resolved_data?: any;
}

export interface BackupData {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  size_bytes: number;
  device_id: string;
  data: {
    products: any[];
    sales: any[];
    users: any[];
    business_config: any;
    receipts: any[];
    sync_config: SyncConfig;
  };
  metadata: {
    app_version: string;
    schema_version: string;
    total_records: number;
    checksum: string;
  };
}

export interface ExportOptions {
  format: 'CSV' | 'JSON' | 'EXCEL';
  tables: string[];
  date_range?: {
    start: string;
    end: string;
  };
  include_metadata?: boolean;
  file_name?: string;
}

export interface ImportResult {
  success: boolean;
  total_records: number;
  imported_records: number;
  skipped_records: number;
  error_records: number;
  errors: string[];
  warnings: string[];
}

export interface NetworkState {
  is_online: boolean;
  connection_type: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  is_metered: boolean;
  signal_strength?: number;
}

export interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  table_name: string;
  record_id: string;
  data: any;
  priority: number;
  created_at: string;
  retry_count: number;
  last_error?: string;
}

export interface SyncStats {
  total_pending: number;
  total_syncing: number;
  total_synced: number;
  total_failed: number;
  total_conflicts: number;
  last_sync_time?: string;
  sync_speed_records_per_second?: number;
  estimated_time_remaining?: number;
}

// Service interfaces
export interface ISyncService {
  startSync(): Promise<void>;
  stopSync(): Promise<void>;
  syncTable(tableName: string): Promise<void>;
  resolveConflict(conflictId: string, resolution: ConflictResolution, resolvedData?: any): Promise<void>;
  getSyncStats(): Promise<SyncStats>;
  getConflicts(): Promise<SyncConflict[]>;
}

export interface ICloudStorageService {
  upload(data: CloudSyncData): Promise<boolean>;
  download(deviceId?: string): Promise<CloudSyncData | null>;
  authenticate(token: string): Promise<boolean>;
  getStorageInfo(): Promise<{ used: number; available: number }>;
}

export interface IBackupService {
  createBackup(name: string, description?: string): Promise<BackupData>;
  restoreBackup(backupId: string): Promise<boolean>;
  listBackups(): Promise<BackupData[]>;
  deleteBackup(backupId: string): Promise<boolean>;
  validateBackup(backupData: BackupData): Promise<boolean>;
}

export interface IExportService {
  exportData(options: ExportOptions): Promise<string>; // Returns file path or data string
  exportProducts(format: 'CSV' | 'JSON'): Promise<string>;
  exportSales(format: 'CSV' | 'JSON', dateRange?: { start: string; end: string }): Promise<string>;
  exportBusinessConfig(format: 'JSON'): Promise<string>;
}

export interface IImportService {
  importData(filePath: string, format: 'CSV' | 'JSON'): Promise<ImportResult>;
  importProducts(filePath: string, format: 'CSV' | 'JSON'): Promise<ImportResult>;
  validateImportData(filePath: string, format: 'CSV' | 'JSON'): Promise<{ valid: boolean; errors: string[] }>;
}

export interface INetworkService {
  getNetworkState(): Promise<NetworkState>;
  onNetworkChange(callback: (state: NetworkState) => void): void;
  removeNetworkListener(callback: (state: NetworkState) => void): void;
}
