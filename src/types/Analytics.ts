// Analytics and reporting types

export interface AnalyticsData {
  id: string;
  date: string;
  metric_type: AnalyticsMetricType;
  value: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export enum AnalyticsMetricType {
  DAILY_SALES = 'DAILY_SALES',
  WEEKLY_SALES = 'WEEKLY_SALES',
  MONTHLY_SALES = 'MONTHLY_SALES',
  PRODUCT_SALES = 'PRODUCT_SALES',
  CATEGORY_SALES = 'CATEGORY_SALES',
  HOURLY_SALES = 'HOURLY_SALES',
  INVENTORY_VALUE = 'INVENTORY_VALUE',
  INVENTORY_TURNOVER = 'INVENTORY_TURNOVER',
  GROSS_PROFIT = 'GROSS_PROFIT',
  NET_PROFIT = 'NET_PROFIT',
  AVERAGE_TRANSACTION = 'AVERAGE_TRANSACTION',
  CUSTOMER_COUNT = 'CUSTOMER_COUNT',
  ITEMS_PER_SALE = 'ITEMS_PER_SALE'
}

export interface SalesAnalytics {
  period: TimePeriod;
  total_sales: number;
  total_transactions: number;
  average_transaction_value: number;
  total_items_sold: number;
  gross_profit: number;
  net_profit: number;
  profit_margin: number;
  growth_rate?: number;
  comparison_period?: SalesAnalytics;
}

export interface ProductAnalytics {
  product_id: string;
  product_name: string;
  sku: string;
  total_sold: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
  average_selling_price: number;
  stock_level: number;
  turnover_rate: number;
  rank: number;
}

export interface InventoryAnalytics {
  total_products: number;
  total_stock_value: number;
  average_stock_level: number;
  low_stock_items: number;
  out_of_stock_items: number;
  overstocked_items: number;
  turnover_rate: number;
  days_of_inventory: number;
  slow_moving_products: ProductAnalytics[];
  fast_moving_products: ProductAnalytics[];
}

export interface FinancialAnalytics {
  period: TimePeriod;
  total_revenue: number;
  total_cost_of_goods: number;
  gross_profit: number;
  gross_margin: number;
  operating_expenses: number;
  net_profit: number;
  net_margin: number;
  cash_flow: number;
  break_even_point: number;
  roi: number;
}

export interface CustomerAnalytics {
  total_customers: number;
  new_customers: number;
  returning_customers: number;
  customer_retention_rate: number;
  average_customer_lifetime_value: number;
  average_order_value: number;
  purchase_frequency: number;
  customer_segments: CustomerSegment[];
}

export interface CustomerSegment {
  segment_name: string;
  customer_count: number;
  total_revenue: number;
  average_order_value: number;
  purchase_frequency: number;
}

export interface TimePeriod {
  start_date: string;
  end_date: string;
  period_type: PeriodType;
  label: string;
}

export enum PeriodType {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM'
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
}

export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
  icon: string;
  description?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  data_source: string;
  refresh_interval?: number;
}

export enum WidgetType {
  KPI_CARD = 'KPI_CARD',
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  TABLE = 'TABLE',
  GAUGE = 'GAUGE',
  MAP = 'MAP',
  TEXT = 'TEXT'
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfig {
  chart_type?: string;
  color_scheme?: string[];
  show_legend?: boolean;
  show_labels?: boolean;
  time_period?: TimePeriod;
  filters?: Record<string, any>;
  aggregation?: 'sum' | 'avg' | 'count' | 'max' | 'min';
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  cell_width: number;
  cell_height: number;
  margin: number;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  template_id?: string;
  parameters: ReportParameter[];
  schedule?: ReportSchedule;
  format: ReportFormat;
  recipients?: string[];
  created_by: string;
  created_at: string;
  last_generated?: string;
}

export enum ReportType {
  SALES_SUMMARY = 'SALES_SUMMARY',
  PRODUCT_PERFORMANCE = 'PRODUCT_PERFORMANCE',
  INVENTORY_REPORT = 'INVENTORY_REPORT',
  FINANCIAL_STATEMENT = 'FINANCIAL_STATEMENT',
  CUSTOMER_ANALYSIS = 'CUSTOMER_ANALYSIS',
  PROFIT_LOSS = 'PROFIT_LOSS',
  CUSTOM = 'CUSTOM'
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
  HTML = 'HTML'
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select';
  value: any;
  required: boolean;
  options?: string[];
}

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  day_of_week?: number;
  day_of_month?: number;
  time: string;
  timezone: string;
  enabled: boolean;
  last_run?: string;
  next_run: string;
}

export enum ScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export interface ReportData {
  report_id: string;
  generated_at: string;
  parameters: Record<string, any>;
  data: any;
  file_path?: string;
  file_size?: number;
}

export interface AnalyticsQuery {
  metrics: AnalyticsMetricType[];
  dimensions?: string[];
  filters?: AnalyticsFilter[];
  time_period: TimePeriod;
  group_by?: string[];
  order_by?: string[];
  limit?: number;
}

export interface AnalyticsFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_EQUAL = 'GREATER_EQUAL',
  LESS_EQUAL = 'LESS_EQUAL',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  LIKE = 'LIKE',
  BETWEEN = 'BETWEEN'
}

export interface AnalyticsResult {
  query: AnalyticsQuery;
  data: any[];
  total_records: number;
  execution_time: number;
  generated_at: string;
}

// Service interfaces
export interface IAnalyticsService {
  getSalesAnalytics(period: TimePeriod): Promise<SalesAnalytics>;
  getProductAnalytics(period: TimePeriod, limit?: number): Promise<ProductAnalytics[]>;
  getInventoryAnalytics(): Promise<InventoryAnalytics>;
  getFinancialAnalytics(period: TimePeriod): Promise<FinancialAnalytics>;
  getCustomerAnalytics(period: TimePeriod): Promise<CustomerAnalytics>;
  executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult>;
  getKPIMetrics(period: TimePeriod): Promise<KPIMetric[]>;
}

export interface IReportingService {
  generateReport(reportId: string, parameters?: Record<string, any>): Promise<ReportData>;
  createReport(report: Omit<Report, 'id' | 'created_at'>): Promise<Report>;
  updateReport(reportId: string, updates: Partial<Report>): Promise<Report>;
  deleteReport(reportId: string): Promise<boolean>;
  getReports(): Promise<Report[]>;
  getReport(reportId: string): Promise<Report | null>;
  scheduleReport(reportId: string, schedule: ReportSchedule): Promise<boolean>;
  exportReport(reportData: ReportData, format: ReportFormat): Promise<string>;
}

export interface IDashboardService {
  getDashboard(dashboardId: string): Promise<Dashboard | null>;
  getDashboards(): Promise<Dashboard[]>;
  createDashboard(dashboard: Omit<Dashboard, 'id' | 'created_at' | 'updated_at'>): Promise<Dashboard>;
  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Promise<Dashboard>;
  deleteDashboard(dashboardId: string): Promise<boolean>;
  getWidgetData(widgetId: string): Promise<any>;
}

export interface IChartService {
  generateChartData(type: WidgetType, query: AnalyticsQuery): Promise<ChartData>;
  getAvailableChartTypes(): WidgetType[];
  validateChartConfig(type: WidgetType, config: WidgetConfig): boolean;
}
