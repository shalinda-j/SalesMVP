import { storageService } from './StorageService';
import {
  Supplier,
  SupplierProduct,
  StockAdjustment,
  StockAlert,
  InventorySnapshot,
  PurchaseOrder,
  PurchaseOrderItem,
  StockMovement,
  InventoryProduct,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseOrderInput,
  StockAdjustmentInput,
  InventoryMetrics,
} from '../types/inventory';

class InventoryService {
  private static instance: InventoryService;
  
  // Storage keys
  private readonly SUPPLIERS_KEY = '@salesmvp_suppliers';
  private readonly SUPPLIER_PRODUCTS_KEY = '@salesmvp_supplier_products';
  private readonly STOCK_ADJUSTMENTS_KEY = '@salesmvp_stock_adjustments';
  private readonly STOCK_ALERTS_KEY = '@salesmvp_stock_alerts';
  private readonly INVENTORY_SNAPSHOTS_KEY = '@salesmvp_inventory_snapshots';
  private readonly PURCHASE_ORDERS_KEY = '@salesmvp_purchase_orders';
  private readonly PURCHASE_ORDER_ITEMS_KEY = '@salesmvp_purchase_order_items';
  private readonly STOCK_MOVEMENTS_KEY = '@salesmvp_stock_movements';

  static getInstance(): InventoryService {
    if (!InventoryService.instance) {
      InventoryService.instance = new InventoryService();
    }
    return InventoryService.instance;
  }

  // === SUPPLIER MANAGEMENT ===

  async createSupplier(input: CreateSupplierInput, userId: string): Promise<Supplier> {
    try {
      const suppliers = await this.getAllSuppliers();
      
      // Check for duplicate name
      const existingSupplier = suppliers.find(s => 
        s.name.toLowerCase() === input.name.toLowerCase() && s.isActive
      );
      if (existingSupplier) {
        throw new Error('Supplier with this name already exists');
      }

      const supplier: Supplier = {
        id: `supplier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...input,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      suppliers.push(supplier);
      await this.saveSuppliers(suppliers);

      // Log supplier creation
      await this.logStockMovement({
        productId: 'system',
        movementType: 'adjustment',
        quantity: 0,
        userId,
        notes: `Supplier created: ${supplier.name}`,
        referenceId: supplier.id
      });

      console.log(`📦 Created supplier: ${supplier.name}`);
      return supplier;
    } catch (error) {
      throw error;
    }
  }

  async updateSupplier(input: UpdateSupplierInput, userId: string): Promise<Supplier> {
    try {
      const suppliers = await this.getAllSuppliers();
      const supplierIndex = suppliers.findIndex(s => s.id === input.id);
      
      if (supplierIndex === -1) {
        throw new Error('Supplier not found');
      }

      const updatedSupplier = {
        ...suppliers[supplierIndex],
        ...input,
        updatedAt: new Date()
      };

      suppliers[supplierIndex] = updatedSupplier;
      await this.saveSuppliers(suppliers);

      console.log(`📦 Updated supplier: ${updatedSupplier.name}`);
      return updatedSupplier;
    } catch (error) {
      throw error;
    }
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const suppliersData = await storageService.getItem(this.SUPPLIERS_KEY);
      if (!suppliersData) {return [];}

      const suppliers = JSON.parse(suppliersData);
      return suppliers.map((supplier: any) => ({
        ...supplier,
        createdAt: new Date(supplier.createdAt),
        updatedAt: new Date(supplier.updatedAt)
      }));
    } catch (error) {
      console.error('Get suppliers error:', error);
      return [];
    }
  }

  async getSupplier(id: string): Promise<Supplier | null> {
    const suppliers = await this.getAllSuppliers();
    return suppliers.find(s => s.id === id) || null;
  }

  async deleteSupplier(id: string, userId: string): Promise<boolean> {
    try {
      const supplier = await this.getSupplier(id);
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      // Check if supplier has any products or purchase orders
      const supplierProducts = await this.getSupplierProducts(id);
      const purchaseOrders = await this.getPurchaseOrdersBySupplier(id);
      
      if (supplierProducts.length > 0 || purchaseOrders.length > 0) {
        // Soft delete - mark as inactive
        await this.updateSupplier({ id, isActive: false }, userId);
        console.log(`📦 Deactivated supplier: ${supplier.name}`);
        return true;
      }

      // Hard delete if no dependencies
      const suppliers = await this.getAllSuppliers();
      const filteredSuppliers = suppliers.filter(s => s.id !== id);
      await this.saveSuppliers(filteredSuppliers);

      console.log(`📦 Deleted supplier: ${supplier.name}`);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // === STOCK ADJUSTMENT & TRACKING ===

  async adjustStock(input: StockAdjustmentInput, userId: string): Promise<StockAdjustment> {
    try {
      // Get current product info (assuming we have a product service)
      // For now, we'll create a mock product lookup
      const quantityBefore = await this.getCurrentStockLevel(input.productId);
      
      let quantityAfter: number;
      let quantityChanged: number;

      switch (input.adjustmentType) {
        case 'increase':
          quantityChanged = Math.abs(input.quantity);
          quantityAfter = quantityBefore + quantityChanged;
          break;
        case 'decrease':
          quantityChanged = -Math.abs(input.quantity);
          quantityAfter = Math.max(0, quantityBefore + quantityChanged);
          break;
        case 'correction':
          quantityAfter = input.quantity;
          quantityChanged = quantityAfter - quantityBefore;
          break;
        default:
          quantityChanged = input.quantity - quantityBefore;
          quantityAfter = input.quantity;
      }

      const adjustment: StockAdjustment = {
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        productId: input.productId,
        userId,
        adjustmentType: input.adjustmentType,
        quantityBefore,
        quantityAfter,
        quantityChanged,
        reason: input.reason,
        notes: input.notes,
        timestamp: new Date()
      };

      // Save adjustment
      const adjustments = await this.getAllStockAdjustments();
      adjustments.push(adjustment);
      await this.saveStockAdjustments(adjustments);

      // Log stock movement
      await this.logStockMovement({
        productId: input.productId,
        movementType: 'adjustment',
        quantity: quantityChanged,
        userId,
        notes: input.reason,
        referenceId: adjustment.id
      });

      // Check for stock alerts after adjustment
      await this.checkStockAlerts(input.productId, quantityAfter);

      console.log(`📊 Stock adjusted for product ${input.productId}: ${quantityBefore} → ${quantityAfter}`);
      return adjustment;
    } catch (error) {
      throw error;
    }
  }

  async getAllStockAdjustments(): Promise<StockAdjustment[]> {
    try {
      const data = await storageService.getItem(this.STOCK_ADJUSTMENTS_KEY);
      if (!data) {return [];}

      const adjustments = JSON.parse(data);
      return adjustments.map((adj: any) => ({
        ...adj,
        timestamp: new Date(adj.timestamp)
      }));
    } catch (error) {
      console.error('Get stock adjustments error:', error);
      return [];
    }
  }

  async getStockAdjustmentsByProduct(productId: string): Promise<StockAdjustment[]> {
    const adjustments = await this.getAllStockAdjustments();
    return adjustments.filter(adj => adj.productId === productId);
  }

  // === STOCK ALERTS ===

  async checkStockAlerts(productId: string, currentStock: number): Promise<void> {
    try {
      // Get reorder point for product (mock implementation)
      const reorderPoint = await this.getReorderPoint(productId);
      const alerts = await this.getAllStockAlerts();
      
      // Remove existing alerts for this product
      const filteredAlerts = alerts.filter(alert => 
        alert.productId !== productId || alert.isRead
      );

      // Create new alerts if needed
      if (currentStock === 0) {
        const outOfStockAlert: StockAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId,
          alertType: 'out_of_stock',
          currentLevel: currentStock,
          message: `Product is out of stock`,
          isRead: false,
          createdAt: new Date()
        };
        filteredAlerts.push(outOfStockAlert);
      } else if (currentStock <= reorderPoint) {
        const lowStockAlert: StockAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          productId,
          alertType: 'low_stock',
          threshold: reorderPoint,
          currentLevel: currentStock,
          message: `Stock level (${currentStock}) is below reorder point (${reorderPoint})`,
          isRead: false,
          createdAt: new Date()
        };
        filteredAlerts.push(lowStockAlert);
      }

      await this.saveStockAlerts(filteredAlerts);
    } catch (error) {
      console.error('Check stock alerts error:', error);
    }
  }

  async getAllStockAlerts(): Promise<StockAlert[]> {
    try {
      const data = await storageService.getItem(this.STOCK_ALERTS_KEY);
      if (!data) {return [];}

      const alerts = JSON.parse(data);
      return alerts.map((alert: any) => ({
        ...alert,
        createdAt: new Date(alert.createdAt),
        resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
      }));
    } catch (error) {
      console.error('Get stock alerts error:', error);
      return [];
    }
  }

  async getUnreadAlerts(): Promise<StockAlert[]> {
    const alerts = await this.getAllStockAlerts();
    return alerts.filter(alert => !alert.isRead);
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      const alerts = await this.getAllStockAlerts();
      const alertIndex = alerts.findIndex(alert => alert.id === alertId);
      
      if (alertIndex !== -1) {
        alerts[alertIndex].isRead = true;
        alerts[alertIndex].resolvedAt = new Date();
        await this.saveStockAlerts(alerts);
      }
    } catch (error) {
      console.error('Mark alert as read error:', error);
    }
  }

  // === PURCHASE ORDERS ===

  async createPurchaseOrder(input: CreatePurchaseOrderInput, userId: string): Promise<PurchaseOrder> {
    try {
      const purchaseOrders = await this.getAllPurchaseOrders();
      
      // Generate order number
      const orderNumber = `PO-${Date.now().toString().slice(-8)}`;
      
      // Calculate totals
      let totalAmount = 0;
      const orderItems: PurchaseOrderItem[] = [];

      for (const item of input.items) {
        const itemTotal = item.quantity * item.unitPrice;
        totalAmount += itemTotal;

        const orderItem: PurchaseOrderItem = {
          id: `poi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          purchaseOrderId: '', // Will be set after PO creation
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          quantityReceived: 0
        };
        orderItems.push(orderItem);
      }

      const purchaseOrder: PurchaseOrder = {
        id: `po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        supplierId: input.supplierId,
        orderNumber,
        status: 'draft',
        orderDate: new Date(),
        expectedDeliveryDate: input.expectedDeliveryDate,
        totalAmount,
        taxes: 0, // Can be calculated based on business rules
        shippingCost: 0,
        discount: 0,
        notes: input.notes,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update order items with PO ID
      orderItems.forEach(item => {
        item.purchaseOrderId = purchaseOrder.id;
      });

      // Save PO and items
      purchaseOrders.push(purchaseOrder);
      await this.savePurchaseOrders(purchaseOrders);
      await this.savePurchaseOrderItems(orderItems);

      console.log(`📋 Created purchase order: ${orderNumber}`);
      return purchaseOrder;
    } catch (error) {
      throw error;
    }
  }

  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    try {
      const data = await storageService.getItem(this.PURCHASE_ORDERS_KEY);
      if (!data) {return [];}

      const orders = JSON.parse(data);
      return orders.map((order: any) => ({
        ...order,
        orderDate: new Date(order.orderDate),
        expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : undefined,
        actualDeliveryDate: order.actualDeliveryDate ? new Date(order.actualDeliveryDate) : undefined,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt)
      }));
    } catch (error) {
      console.error('Get purchase orders error:', error);
      return [];
    }
  }

  async getPurchaseOrdersBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    const orders = await this.getAllPurchaseOrders();
    return orders.filter(order => order.supplierId === supplierId);
  }

  // === INVENTORY METRICS ===

  async getInventoryMetrics(): Promise<InventoryMetrics> {
    try {
      // Mock implementation - in real app, this would query actual product data
      const alerts = await this.getAllStockAlerts();
      const movements = await this.getAllStockMovements();
      
      const lowStockAlerts = alerts.filter(alert => 
        alert.alertType === 'low_stock' && !alert.isRead
      );
      
      const outOfStockAlerts = alerts.filter(alert => 
        alert.alertType === 'out_of_stock' && !alert.isRead
      );

      return {
        totalProducts: 100, // Mock data
        totalValue: 25000.00,
        lowStockItems: lowStockAlerts.length,
        outOfStockItems: outOfStockAlerts.length,
        avgTurnoverRate: 2.5,
        topMovingProducts: [
          { productId: '1', productName: 'Coca Cola 350ml', unitsSold: 150, revenue: 450.00 },
          { productId: '2', productName: 'Bread Loaf', unitsSold: 120, revenue: 360.00 },
          { productId: '3', productName: 'Milk 1L', unitsSold: 100, revenue: 400.00 }
        ],
        slowMovingProducts: [
          { productId: '10', productName: 'Premium Coffee', daysSinceLastSale: 15, stockLevel: 25 },
          { productId: '11', productName: 'Artisan Chocolate', daysSinceLastSale: 12, stockLevel: 8 }
        ]
      };
    } catch (error) {
      console.error('Get inventory metrics error:', error);
      throw error;
    }
  }

  // === STOCK MOVEMENTS ===

  async logStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): Promise<void> {
    try {
      const stockMovement: StockMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...movement,
        timestamp: new Date()
      };

      const movements = await this.getAllStockMovements();
      movements.push(stockMovement);
      await this.saveStockMovements(movements);
    } catch (error) {
      console.error('Log stock movement error:', error);
    }
  }

  async getAllStockMovements(): Promise<StockMovement[]> {
    try {
      const data = await storageService.getItem(this.STOCK_MOVEMENTS_KEY);
      if (!data) {return [];}

      const movements = JSON.parse(data);
      return movements.map((movement: any) => ({
        ...movement,
        timestamp: new Date(movement.timestamp)
      }));
    } catch (error) {
      console.error('Get stock movements error:', error);
      return [];
    }
  }

  // === HELPER METHODS ===

  private async getCurrentStockLevel(productId: string): Promise<number> {
    // Mock implementation - in real app, this would query the product database
    return Math.floor(Math.random() * 50) + 10; // Random stock level for demo
  }

  private async getReorderPoint(productId: string): Promise<number> {
    // Mock implementation - in real app, this would be stored with the product
    return 10; // Default reorder point
  }

  async getSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
    // Mock implementation
    return [];
  }

  // === STORAGE HELPERS ===

  private async saveSuppliers(suppliers: Supplier[]): Promise<void> {
    await storageService.setItem(this.SUPPLIERS_KEY, JSON.stringify(suppliers));
  }

  private async saveStockAdjustments(adjustments: StockAdjustment[]): Promise<void> {
    await storageService.setItem(this.STOCK_ADJUSTMENTS_KEY, JSON.stringify(adjustments));
  }

  private async saveStockAlerts(alerts: StockAlert[]): Promise<void> {
    await storageService.setItem(this.STOCK_ALERTS_KEY, JSON.stringify(alerts));
  }

  private async savePurchaseOrders(orders: PurchaseOrder[]): Promise<void> {
    await storageService.setItem(this.PURCHASE_ORDERS_KEY, JSON.stringify(orders));
  }

  private async savePurchaseOrderItems(items: PurchaseOrderItem[]): Promise<void> {
    const existingItems = await this.getAllPurchaseOrderItems();
    const updatedItems = [...existingItems, ...items];
    await storageService.setItem(this.PURCHASE_ORDER_ITEMS_KEY, JSON.stringify(updatedItems));
  }

  private async getAllPurchaseOrderItems(): Promise<PurchaseOrderItem[]> {
    try {
      const data = await storageService.getItem(this.PURCHASE_ORDER_ITEMS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      return [];
    }
  }

  private async saveStockMovements(movements: StockMovement[]): Promise<void> {
    await storageService.setItem(this.STOCK_MOVEMENTS_KEY, JSON.stringify(movements));
  }
}

export const inventoryService = InventoryService.getInstance();
