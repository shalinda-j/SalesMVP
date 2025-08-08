// Advanced inventory management types

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplierSKU: string;
  supplierPrice: number;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  isPreferred: boolean;
  lastOrderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  userId: string; // Who made the adjustment
  adjustmentType: 'increase' | 'decrease' | 'correction' | 'damage' | 'theft' | 'return';
  quantityBefore: number;
  quantityAfter: number;
  quantityChanged: number;
  reason: string;
  notes?: string;
  timestamp: Date;
}

export interface StockAlert {
  id: string;
  productId: string;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock' | 'expired' | 'damaged';
  threshold?: number;
  currentLevel: number;
  message: string;
  isRead: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface InventorySnapshot {
  id: string;
  productId: string;
  userId: string; // Who took the snapshot
  quantityOnHand: number;
  quantityReserved: number; // For pending orders
  quantityAvailable: number;
  lastSoldDate?: Date;
  turnoverRate: number; // Items sold per day
  daysOfStock: number; // How many days of stock remaining
  reorderPoint: number;
  snapshotDate: Date;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  orderNumber: string;
  status: 'draft' | 'sent' | 'confirmed' | 'shipped' | 'received' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  totalAmount: number;
  taxes: number;
  shippingCost: number;
  discount: number;
  notes?: string;
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  quantityReceived: number;
  notes?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  movementType: 'sale' | 'purchase' | 'adjustment' | 'transfer' | 'return' | 'damage';
  quantity: number; // Positive for inbound, negative for outbound
  unitCost?: number;
  totalCost?: number;
  referenceId?: string; // Sale ID, PO ID, etc.
  userId: string;
  notes?: string;
  timestamp: Date;
}

// Enhanced Product with inventory features
export interface InventoryProduct {
  id: number;
  sku: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  
  // Inventory tracking
  stockQty: number;
  reservedQty: number; // For pending orders
  availableQty: number; // stockQty - reservedQty
  
  // Reorder management
  reorderPoint: number;
  reorderQuantity: number;
  maxStockLevel?: number;
  
  // Supplier info
  primarySupplierId?: string;
  lastPurchaseDate?: Date;
  lastPurchasePrice?: number;
  
  // Sales analytics
  lastSoldDate?: Date;
  averageDailySales: number;
  turnoverRate: number;
  
  // Product info
  barcode?: string;
  weight?: number;
  dimensions?: string;
  expiryDate?: Date;
  batchNumber?: string;
  location?: string; // Warehouse location
  
  // Flags
  isActive: boolean;
  isTracked: boolean; // Whether to track inventory
  allowNegativeStock: boolean;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Form inputs
export interface CreateSupplierInput {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  id: string;
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  notes?: string;
  isActive?: boolean;
}

export interface CreatePurchaseOrderInput {
  supplierId: string;
  expectedDeliveryDate?: Date;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export interface StockAdjustmentInput {
  productId: string;
  adjustmentType: StockAdjustment['adjustmentType'];
  quantity: number; // New quantity or change amount
  reason: string;
  notes?: string;
}

// Dashboard/Analytics types
export interface InventoryMetrics {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  avgTurnoverRate: number;
  topMovingProducts: {
    productId: string;
    productName: string;
    unitsSold: number;
    revenue: number;
  }[];
  slowMovingProducts: {
    productId: string;
    productName: string;
    daysSinceLastSale: number;
    stockLevel: number;
  }[];
}

export interface InventoryReport {
  reportType: 'stock_level' | 'turnover' | 'valuation' | 'alerts' | 'movements';
  generatedAt: Date;
  generatedBy: string;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  data: any; // Specific to report type
  summary: {
    totalItems: number;
    totalValue?: number;
    keyInsights: string[];
  };
}

// Component props
export interface InventoryDashboardProps {
  showAlerts?: boolean;
  showMetrics?: boolean;
  refreshInterval?: number;
}

export interface StockAdjustmentModalProps {
  isVisible: boolean;
  product: InventoryProduct | null;
  onClose: () => void;
  onAdjustment: (adjustment: StockAdjustmentInput) => Promise<void>;
}

export interface SupplierManagerProps {
  showCreateForm?: boolean;
  selectedSupplierId?: string;
  onSupplierSelect?: (supplier: Supplier) => void;
}
