import { database } from '../stores/Database';
import { productService } from './ProductService';
import { salesService } from './SimpleSalesService';
import {
  IAnalyticsService,
  SalesAnalytics,
  ProductAnalytics,
  InventoryAnalytics,
  FinancialAnalytics,
  CustomerAnalytics,
  TimePeriod,
  PeriodType,
  KPIMetric,
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsMetricType
} from '../types/Analytics';

// Legacy interfaces for backward compatibility
export interface DailySummary {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalTax: number;
  averageTransaction: number;
  paymentMethods: {
    cash: { count: number; amount: number };
    card: { count: number; amount: number };
    digital: { count: number; amount: number };
  };
}

export interface TimeRangeAnalytics {
  startDate: Date;
  endDate: Date;
  totalSales: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  averageTransaction: number;
  topProducts: ProductAnalytics[];
  dailyBreakdown: DailySummary[];
  paymentMethodBreakdown: {
    cash: { count: number; amount: number; percentage: number };
    card: { count: number; amount: number; percentage: number };
    digital: { count: number; amount: number; percentage: number };
  };
}

export interface HourlyAnalytics {
  hour: number;
  salesCount: number;
  revenue: number;
}

class AnalyticsService implements IAnalyticsService {
  private static instance: AnalyticsService;

  private constructor() {}

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  // Get today's sales summary
  async getTodaysSummary(): Promise<DailySummary> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    return this.getDailySummary(startOfDay, endOfDay);
  }

  // Get daily summary for specific date range
  async getDailySummary(startDate: Date, endDate: Date): Promise<DailySummary> {
    const sales = await salesService.getSalesByDateRange(startDate, endDate);

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totals.grandTotal, 0);
    const totalTax = sales.reduce((sum, sale) => sum + sale.totals.taxTotal, 0);
    const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method breakdown
    const paymentMethods = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      digital: { count: 0, amount: 0 }
    };

    sales.forEach(sale => {
      const paymentType = sale.tenders[0]?.type || 'other';
      if (paymentType === 'cash' || paymentType === 'card' || paymentType === 'digital') {
        paymentMethods[paymentType].count++;
        paymentMethods[paymentType].amount += sale.totals.grandTotal;
      }
    });

    return {
      date: startDate.toISOString().split('T')[0],
      totalSales,
      totalRevenue,
      totalTax,
      averageTransaction,
      paymentMethods
    };
  }

  // Get analytics for a specific time range
  async getTimeRangeAnalytics(startDate: Date, endDate: Date): Promise<TimeRangeAnalytics> {
    const sales = await salesService.getSalesByDateRange(startDate, endDate);

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totals.grandTotal, 0);
    const totalTax = sales.reduce((sum, sale) => sum + sale.totals.taxTotal, 0);
    const totalDiscount = sales.reduce((sum, sale) => sum + sale.totals.discountTotal, 0);
    const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method breakdown
    const paymentBreakdown = {
      cash: { count: 0, amount: 0, percentage: 0 },
      card: { count: 0, amount: 0, percentage: 0 },
      digital: { count: 0, amount: 0, percentage: 0 }
    };

    sales.forEach(sale => {
      const paymentType = sale.tenders[0]?.type || 'other';
      if (paymentType === 'cash' || paymentType === 'card' || paymentType === 'digital') {
        paymentBreakdown[paymentType].count++;
        paymentBreakdown[paymentType].amount += sale.totals.grandTotal;
      }
    });

    // Calculate percentages
    Object.keys(paymentBreakdown).forEach(method => {
      const methodData = paymentBreakdown[method as keyof typeof paymentBreakdown];
      methodData.percentage = totalRevenue > 0 ? (methodData.amount / totalRevenue) * 100 : 0;
    });

    // Get top products
    const topProducts = await this.getTopProducts(startDate, endDate, 10);

    // Get daily breakdown
    const dailyBreakdown = await this.getDailyBreakdown(startDate, endDate);

    return {
      startDate,
      endDate,
      totalSales,
      totalRevenue,
      totalTax,
      totalDiscount,
      averageTransaction,
      topProducts,
      dailyBreakdown,
      paymentMethodBreakdown: paymentBreakdown
    };
  }

  // Get top-selling products
  async getTopProducts(startDate: Date, endDate: Date, limit: number = 10): Promise<ProductAnalytics[]> {
    const sales = await salesService.getSalesByDateRange(startDate, endDate);

    // Aggregate product data
    const productMap = new Map<string, ProductAnalytics>();

    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.productId.toString();

        if (productMap.has(key)) {
          const existing = productMap.get(key)!;
          existing.total_sold += item.quantity;
          existing.total_revenue += item.price * item.quantity;
        } else {
          productMap.set(key, {
            product_id: item.productId.toString(),
            product_name: item.name,
            sku: item.sku || '',
            total_sold: item.quantity,
            total_revenue: item.price * item.quantity,
            total_profit: 0, // Will be calculated later
            profit_margin: 0, // Will be calculated later
            average_selling_price: item.price,
            stock_level: 0, // Will be fetched later
            turnover_rate: 0, // Will be calculated later
            rank: 0
          });
        }
      }
    }

    // Calculate total_profit, profit_margin, stock_level, turnover_rate, rank
    for (const [key, productData] of productMap.entries()) {
      const product = await productService.getProduct(parseInt(key));
      if (product) {
        productData.total_profit = productData.total_revenue - (product.cost * productData.total_sold);
        productData.profit_margin = productData.total_revenue > 0 ? (productData.total_profit / productData.total_revenue) * 100 : 0;
        productData.stock_level = product.stock_qty;
        productData.turnover_rate = product.stock_qty > 0 ? productData.total_sold / product.stock_qty : 0;
      }
    }

    // Sort by total_revenue and assign ranks
    const sortedProducts = Array.from(productMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);

    sortedProducts.forEach((product, index) => {
      product.rank = index + 1;
    });

    return sortedProducts.slice(0, limit);
  }

  // Get daily breakdown for date range
  async getDailyBreakdown(startDate: Date, endDate: Date): Promise<DailySummary[]> {
    const dailyData: DailySummary[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59);

      const dailySummary = await this.getDailySummary(dayStart, dayEnd);
      dailyData.push(dailySummary);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyData;
  }

  // Get hourly breakdown for a specific date
  async getHourlyBreakdown(date: Date): Promise<HourlyAnalytics[]> {
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const sales = await salesService.getSalesByDateRange(startOfDay, endOfDay);

    // Initialize hourly data (24 hours)
    const hourlyData: HourlyAnalytics[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      salesCount: 0,
      revenue: 0
    }));

    // Aggregate sales by hour
    sales.forEach(sale => {
      const hour = sale.timestamp.getHours();
      hourlyData[hour].salesCount++;
      hourlyData[hour].revenue += sale.totals.grandTotal;
    });

    return hourlyData;
  }

  // Get week-over-week comparison
  async getWeekOverWeekComparison(): Promise<{
    currentWeek: DailySummary;
    previousWeek: DailySummary;
    growth: {
      sales: number;
      revenue: number;
      averageTransaction: number;
    };
  }> {
    const now = new Date();
    const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const currentWeekEnd = new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    const previousWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousWeekEnd = new Date(currentWeekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const currentWeek = await this.getDailySummary(currentWeekStart, currentWeekEnd);
    const previousWeek = await this.getDailySummary(previousWeekStart, previousWeekEnd);

    const growth = {
      sales: previousWeek.totalSales > 0 
        ? ((currentWeek.totalSales - previousWeek.totalSales) / previousWeek.totalSales) * 100 
        : 0,
      revenue: previousWeek.totalRevenue > 0 
        ? ((currentWeek.totalRevenue - previousWeek.totalRevenue) / previousWeek.totalRevenue) * 100 
        : 0,
      averageTransaction: previousWeek.averageTransaction > 0 
        ? ((currentWeek.averageTransaction - previousWeek.averageTransaction) / previousWeek.averageTransaction) * 100 
        : 0
    };

    return {
      currentWeek,
      previousWeek,
      growth
    };
  }

  // Get month-over-month comparison
  async getMonthOverMonthComparison(): Promise<{
    currentMonth: DailySummary;
    previousMonth: DailySummary;
    growth: {
      sales: number;
      revenue: number;
      averageTransaction: number;
    };
  }> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const currentMonth = await this.getDailySummary(currentMonthStart, currentMonthEnd);
    const previousMonth = await this.getDailySummary(previousMonthStart, previousMonthEnd);

    const growth = {
      sales: previousMonth.totalSales > 0 
        ? ((currentMonth.totalSales - previousMonth.totalSales) / previousMonth.totalSales) * 100 
        : 0,
      revenue: previousMonth.totalRevenue > 0 
        ? ((currentMonth.totalRevenue - previousMonth.totalRevenue) / previousMonth.totalRevenue) * 100 
        : 0,
      averageTransaction: previousMonth.averageTransaction > 0 
        ? ((currentMonth.averageTransaction - previousMonth.averageTransaction) / previousMonth.averageTransaction) * 100 
        : 0
    };

    return {
      currentMonth,
      previousMonth,
      growth
    };
  }

  // Get sales trends for charting
  async getSalesTrends(days: number = 30): Promise<{
    labels: string[];
    salesData: number[];
    revenueData: number[];
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const dailyBreakdown = await this.getDailyBreakdown(startDate, endDate);

    return {
      labels: dailyBreakdown.map(day => {
        const date = new Date(day.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      salesData: dailyBreakdown.map(day => day.totalSales),
      revenueData: dailyBreakdown.map(day => day.totalRevenue)
    };
  }

  // Export analytics data as CSV
  async exportAnalyticsCSV(startDate: Date, endDate: Date): Promise<string> {
    const analytics = await this.getTimeRangeAnalytics(startDate, endDate);
    
    let csv = 'Type,Metric,Value\n';
    csv += `Summary,Total Sales,${analytics.totalSales}\n`;
    csv += `Summary,Total Revenue,$${analytics.totalRevenue.toFixed(2)}\n`;
    csv += `Summary,Total Tax,$${analytics.totalTax.toFixed(2)}\n`;
    csv += `Summary,Total Discount,$${analytics.totalDiscount.toFixed(2)}\n`;
    csv += `Summary,Average Transaction,$${analytics.averageTransaction.toFixed(2)}\n`;
    csv += '\n';

    csv += 'Product Name,Quantity Sold,Revenue,Average Price,Sales Count\n';
    analytics.topProducts.forEach(product => {
      csv += `${product.product_name},${product.total_sold},$${product.total_revenue.toFixed(2)},$${product.average_selling_price.toFixed(2)},${product.rank}\n`;
    });

    csv += '\n';
    csv += 'Payment Method,Count,Amount,Percentage\n';
    Object.entries(analytics.paymentMethodBreakdown).forEach(([method, data]) => {
      csv += `${method.toUpperCase()},${data.count},$${data.amount.toFixed(2)},${data.percentage.toFixed(1)}%\n`;
    });

    return csv;
  }

  // Enhanced Analytics Methods (implementing IAnalyticsService)
  public async getSalesAnalytics(period: TimePeriod): Promise<SalesAnalytics> {
    try {
      const sales = await this.getSalesInPeriod(period);
      
      const totalSales = sales.reduce((sum, sale) => sum + sale.totals.grandTotal, 0);
      const totalTransactions = sales.length;
      const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
      
      // Calculate total items sold
      let totalItemsSold = 0;
      let grossProfit = 0;

      for (const sale of sales) {
        const saleItems = await database.getSaleItems(Number(sale.id) || 0);
        totalItemsSold += saleItems.reduce((sum, item) => sum + item.qty, 0);
        
        // Calculate gross profit for this sale
        for (const item of saleItems) {
          const product = await productService.getProduct(item.product_id);
          if (product) {
            const itemProfit = (item.unit_price - product.cost) * item.qty;
            grossProfit += itemProfit;
          }
        }
      }

      const netProfit = grossProfit; // Simplified - in real app would subtract expenses
      const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

      // Calculate growth rate by comparing to previous period
      const previousPeriod = this.getPreviousPeriod(period);
      const previousSales = await this.getSalesInPeriod(previousPeriod);
      const previousTotalSales = previousSales.reduce((sum, sale) => sum + sale.totals.grandTotal, 0);
      const growthRate = previousTotalSales > 0 ? 
        ((totalSales - previousTotalSales) / previousTotalSales) * 100 : 0;

      return {
        period,
        total_sales: totalSales,
        total_transactions: totalTransactions,
        average_transaction_value: averageTransactionValue,
        total_items_sold: totalItemsSold,
        gross_profit: grossProfit,
        net_profit: netProfit,
        profit_margin: profitMargin,
        growth_rate: growthRate
      };
    } catch (error) {
      console.error('Error calculating sales analytics:', error);
      throw error;
    }
  }

  public async getProductAnalytics(period: TimePeriod, limit: number = 20): Promise<ProductAnalytics[]> {
    try {
      const products = await productService.getAllProducts();
      const sales = await this.getSalesInPeriod(period);
      const productAnalytics: ProductAnalytics[] = [];

      for (const product of products) {
        let totalSold = 0;
        let totalRevenue = 0;
        let totalProfit = 0;

        // Calculate metrics for this product
        for (const sale of sales) {
          const saleItems = await database.getSaleItems(Number(sale.id) || 0);
          for (const item of saleItems) {
            if (item.product_id === product.id) {
              totalSold += item.qty;
              totalRevenue += item.unit_price * item.qty;
              totalProfit += (item.unit_price - product.cost) * item.qty;
            }
          }
        }

        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const averageSellingPrice = totalSold > 0 ? totalRevenue / totalSold : 0;
        const turnoverRate = product.stock_qty > 0 ? totalSold / product.stock_qty : 0;

        productAnalytics.push({
          product_id: product.id.toString(),
          product_name: product.name,
          sku: product.sku,
          total_sold: totalSold,
          total_revenue: totalRevenue,
          total_profit: totalProfit,
          profit_margin: profitMargin,
          average_selling_price: averageSellingPrice,
          stock_level: product.stock_qty,
          turnover_rate: turnoverRate,
          rank: 0
        });
      }

      // Sort by total revenue and assign ranks
      productAnalytics.sort((a, b) => b.total_revenue - a.total_revenue);
      productAnalytics.forEach((product, index) => {
        product.rank = index + 1;
      });

      return productAnalytics.slice(0, limit);
    } catch (error) {
      console.error('Error calculating product analytics:', error);
      throw error;
    }
  }

  public async getInventoryAnalytics(): Promise<InventoryAnalytics> {
    try {
      const products = await productService.getAllProducts();
      
      const totalProducts = products.length;
      const totalStockValue = products.reduce((sum, p) => sum + (p.stock_qty * p.cost), 0);
      const averageStockLevel = totalProducts > 0 ? 
        products.reduce((sum, p) => sum + p.stock_qty, 0) / totalProducts : 0;

      const LOW_STOCK_THRESHOLD = 10;
      const OVERSTOCK_THRESHOLD = 100;

      const lowStockItems = products.filter(p => p.stock_qty <= LOW_STOCK_THRESHOLD && p.stock_qty > 0).length;
      const outOfStockItems = products.filter(p => p.stock_qty === 0).length;
      const overstockedItems = products.filter(p => p.stock_qty >= OVERSTOCK_THRESHOLD).length;

      const currentPeriod = this.getCurrentMonthPeriod();
      const productAnalytics = await this.getProductAnalytics(currentPeriod, 1000);

      const averageTurnoverRate = productAnalytics.length > 0 ?
        productAnalytics.reduce((sum, p) => sum + p.turnover_rate, 0) / productAnalytics.length : 0;

      const daysOfInventory = averageTurnoverRate > 0 ? 365 / (averageTurnoverRate * 12) : 0;

      const slowMovingProducts = productAnalytics
        .filter(p => p.turnover_rate < averageTurnoverRate * 0.5)
        .slice(0, 10);

      const fastMovingProducts = productAnalytics
        .filter(p => p.turnover_rate > averageTurnoverRate * 1.5)
        .slice(0, 10);

      return {
        total_products: totalProducts,
        total_stock_value: totalStockValue,
        average_stock_level: averageStockLevel,
        low_stock_items: lowStockItems,
        out_of_stock_items: outOfStockItems,
        overstocked_items: overstockedItems,
        turnover_rate: averageTurnoverRate,
        days_of_inventory: daysOfInventory,
        slow_moving_products: slowMovingProducts,
        fast_moving_products: fastMovingProducts
      };
    } catch (error) {
      console.error('Error calculating inventory analytics:', error);
      throw error;
    }
  }

  public async getFinancialAnalytics(period: TimePeriod): Promise<FinancialAnalytics> {
    try {
      const salesAnalytics = await this.getSalesAnalytics(period);
      const totalRevenue = salesAnalytics.total_sales;
      const grossProfit = salesAnalytics.gross_profit;
      
      const sales = await this.getSalesInPeriod(period);
      let totalCOGS = 0;

      for (const sale of sales) {
        const saleItems = await database.getSaleItems(Number(sale.id) || 0);
        for (const item of saleItems) {
          const product = await productService.getProduct(item.product_id);
          if (product) {
            totalCOGS += product.cost * item.qty;
          }
        }
      }

      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const operatingExpenses = totalRevenue * 0.1;
      const netProfit = grossProfit - operatingExpenses;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const cashFlow = netProfit;
      const breakEvenPoint = grossMargin > 0 ? (operatingExpenses * 100) / grossMargin : 0;
      const roi = operatingExpenses > 0 ? (netProfit / operatingExpenses) * 100 : 0;

      return {
        period,
        total_revenue: totalRevenue,
        total_cost_of_goods: totalCOGS,
        gross_profit: grossProfit,
        gross_margin: grossMargin,
        operating_expenses: operatingExpenses,
        net_profit: netProfit,
        net_margin: netMargin,
        cash_flow: cashFlow,
        break_even_point: breakEvenPoint,
        roi: roi
      };
    } catch (error) {
      console.error('Error calculating financial analytics:', error);
      throw error;
    }
  }

  public async getCustomerAnalytics(period: TimePeriod): Promise<CustomerAnalytics> {
    try {
      const sales = await this.getSalesInPeriod(period);
      const totalCustomers = sales.length;
      const newCustomers = Math.floor(totalCustomers * 0.7);
      const returningCustomers = totalCustomers - newCustomers;
      const customerRetentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.totals.grandTotal, 0);
      const averageOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      const averageCustomerLifetimeValue = averageOrderValue * 2.5;
      const purchaseFrequency = 1.2;

      const customerSegments = [
        {
          segment_name: 'High Value',
          customer_count: Math.floor(totalCustomers * 0.2),
          total_revenue: totalRevenue * 0.6,
          average_order_value: averageOrderValue * 3,
          purchase_frequency: 2.5
        },
        {
          segment_name: 'Regular',
          customer_count: Math.floor(totalCustomers * 0.5),
          total_revenue: totalRevenue * 0.3,
          average_order_value: averageOrderValue * 0.8,
          purchase_frequency: 1.2
        },
        {
          segment_name: 'Occasional',
          customer_count: Math.floor(totalCustomers * 0.3),
          total_revenue: totalRevenue * 0.1,
          average_order_value: averageOrderValue * 0.4,
          purchase_frequency: 0.6
        }
      ];

      return {
        total_customers: totalCustomers,
        new_customers: newCustomers,
        returning_customers: returningCustomers,
        customer_retention_rate: customerRetentionRate,
        average_customer_lifetime_value: averageCustomerLifetimeValue,
        average_order_value: averageOrderValue,
        purchase_frequency: purchaseFrequency,
        customer_segments: customerSegments
      };
    } catch (error) {
      console.error('Error calculating customer analytics:', error);
      throw error;
    }
  }

  public async getKPIMetrics(period: TimePeriod): Promise<KPIMetric[]> {
    try {
      const salesAnalytics = await this.getSalesAnalytics(period);
      const financialAnalytics = await this.getFinancialAnalytics(period);
      const inventoryAnalytics = await this.getInventoryAnalytics();

      return [
        {
          id: 'total_sales',
          name: 'Total Sales',
          value: salesAnalytics.total_sales,
          unit: '$',
          change: salesAnalytics.growth_rate || 0,
          change_percentage: salesAnalytics.growth_rate || 0,
          trend: (salesAnalytics.growth_rate || 0) >= 0 ? 'up' : 'down',
          color: '#27ae60',
          icon: '💰',
          description: 'Total revenue for the period'
        },
        {
          id: 'total_transactions',
          name: 'Transactions',
          value: salesAnalytics.total_transactions,
          unit: '',
          change: 0,
          change_percentage: 0,
          trend: 'stable',
          color: '#3498db',
          icon: '🛒',
          description: 'Number of completed transactions'
        },
        {
          id: 'profit_margin',
          name: 'Profit Margin',
          value: financialAnalytics.gross_margin,
          unit: '%',
          change: 0,
          change_percentage: 0,
          trend: 'stable',
          color: '#9b59b6',
          icon: '📊',
          description: 'Gross profit as percentage of sales'
        }
      ];
    } catch (error) {
      console.error('Error calculating KPI metrics:', error);
      throw error;
    }
  }

  public async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    const startTime = Date.now();
    
    try {
      let data: any[] = [];
      
      for (const metric of query.metrics) {
        switch (metric) {
          case AnalyticsMetricType.DAILY_SALES:
            const dailyData = await this.getDailySalesData(query.time_period);
            data = data.concat(dailyData);
            break;
          case AnalyticsMetricType.PRODUCT_SALES:
            const productData = await this.getProductAnalytics(query.time_period);
            data = data.concat(productData);
            break;
        }
      }

      const executionTime = Date.now() - startTime;
      
      return {
        query,
        data,
        total_records: data.length,
        execution_time: executionTime,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error executing analytics query:', error);
      throw error;
    }
  }

  // Helper methods
  private async getSalesInPeriod(period: TimePeriod) {
    const allSales = await salesService.getAllSales();
    return allSales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      const startDate = new Date(period.start_date);
      const endDate = new Date(period.end_date);
      return saleDate >= startDate && saleDate <= endDate;
    });
  }

  private getPreviousPeriod(period: TimePeriod): TimePeriod {
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    const duration = end.getTime() - start.getTime();
    
    return {
      start_date: new Date(start.getTime() - duration).toISOString(),
      end_date: new Date(end.getTime() - duration).toISOString(),
      period_type: period.period_type,
      label: `Previous ${period.label}`
    };
  }

  private getCurrentMonthPeriod(): TimePeriod {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
      start_date: startOfMonth.toISOString(),
      end_date: endOfMonth.toISOString(),
      period_type: PeriodType.MONTH,
      label: 'Current Month'
    };
  }

  private async getDailySalesData(period: TimePeriod) {
    const sales = await this.getSalesInPeriod(period);
    const dailyData = new Map<string, number>();
    
    sales.forEach(sale => {
      const date = new Date(sale.timestamp).toISOString().split('T')[0];
      dailyData.set(date, (dailyData.get(date) || 0) + sale.totals.grandTotal);
    });
    
    return Array.from(dailyData.entries()).map(([date, total]) => ({
      date,
      value: total,
      metric: AnalyticsMetricType.DAILY_SALES
    }));
  }

  // Utility methods for date period calculations
  public static createPeriod(type: PeriodType, offset: number = 0): TimePeriod {
    const now = new Date();
    let start: Date, end: Date, label: string;

    switch (type) {
      case PeriodType.DAY:
        start = new Date(now);
        start.setDate(start.getDate() + offset);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        label = offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : `${Math.abs(offset)} days ago`;
        break;
      
      case PeriodType.WEEK:
        const dayOfWeek = now.getDay();
        start = new Date(now);
        start.setDate(start.getDate() - dayOfWeek + (offset * 7));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        label = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : `${Math.abs(offset)} weeks ago`;
        break;
      
      case PeriodType.MONTH:
        start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
        end.setHours(23, 59, 59, 999);
        label = offset === 0 ? 'This Month' : offset === -1 ? 'Last Month' : `${Math.abs(offset)} months ago`;
        break;
      
      default:
        start = new Date(now);
        end = new Date(now);
        label = 'Today';
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      period_type: type,
      label
    };
  }
}

// Export singleton instance
export const analyticsService = AnalyticsService.getInstance();
export { AnalyticsService };
