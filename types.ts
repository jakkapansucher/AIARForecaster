
export interface CSVRow {
  bacode?: string;
  accountclass?: string; // Key for aggregation/segmentation
  customer?: string;
  billPeriod?: string; // Key for Time Series (YYYYMM)
  amount: number; // Value to aggregate
  paymenttype?: string;
  docType?: string;
  ratecat?: string;
  trsg?: string;
  mru?: string;
  duedatefirst?: string;
}

export interface MonthlyData {
  date: string; // Format: YYYY-MM
  amount: number;
}

export interface ParsedDataSet {
  totalByDate: MonthlyData[];
  byClass: Record<string, MonthlyData[]>; // Aggregated data: { "Class A": [{date: '2024-01', amount: 1000}, ...] }
  availableClasses: string[];
}

export interface ForecastResult {
  forecast: MonthlyData[];
  reasoning: string;
  trend: string;
}

export interface ChartDataPoint {
  date: string;
  actual: number | null;
  forecast: number | null;
}

export enum AppState {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
