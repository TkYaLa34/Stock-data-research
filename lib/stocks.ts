export interface HistoricalBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  marketCap: string; // e.g., "3.4T"
  marketCapValue: number; // raw value for sorting
  peRatio: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  revenueGrowth: number;
  volatility: number; // high-low range percent average
  timestamp: string;
  historical: HistoricalBar[];
}

export const STOCKS_DB: Record<string, StockData> = {
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Consumer Electronics",
    currentPrice: 228.50,
    change: 4.25,
    changePercent: 1.89,
    marketCap: "3.48T",
    marketCapValue: 3480000000000,
    peRatio: 31.4,
    grossMargin: 46.2,
    operatingMargin: 30.7,
    netMargin: 25.8,
    revenueGrowth: 5.4,
    volatility: 1.6,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 220.10, high: 222.50, low: 219.00, close: 221.30, volume: 52000000 },
      { date: "06-11", open: 221.50, high: 223.80, low: 220.50, close: 222.90, volume: 46000000 },
      { date: "06-12", open: 223.00, high: 225.40, low: 221.80, close: 224.50, volume: 48000000 },
      { date: "06-15", open: 224.20, high: 226.10, low: 223.40, close: 225.80, volume: 50000000 },
      { date: "06-16", open: 226.00, high: 228.00, low: 225.10, close: 227.10, volume: 51000000 },
      { date: "06-17", open: 227.00, high: 229.40, low: 226.50, close: 228.50, volume: 54000000 }
    ]
  },
  MSFT: {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Infrastructure Software",
    currentPrice: 442.10,
    change: -2.30,
    changePercent: -0.52,
    marketCap: "3.28T",
    marketCapValue: 3280000000000,
    peRatio: 35.8,
    grossMargin: 70.1,
    operatingMargin: 44.6,
    netMargin: 36.4,
    revenueGrowth: 15.6,
    volatility: 1.2,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 435.00, high: 439.10, low: 434.20, close: 437.80, volume: 21000000 },
      { date: "06-11", open: 438.00, high: 442.50, low: 437.00, close: 441.20, volume: 19000000 },
      { date: "06-12", open: 442.05, high: 445.00, low: 440.10, close: 443.90, volume: 22000000 },
      { date: "06-15", open: 444.00, high: 446.80, low: 442.20, close: 445.40, volume: 18000000 },
      { date: "06-16", open: 445.20, high: 445.90, low: 441.50, close: 444.40, volume: 20000000 },
      { date: "06-17", open: 444.10, high: 444.80, low: 440.20, close: 442.10, volume: 23000000 }
    ]
  },
  NVDA: {
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Semiconductors",
    currentPrice: 135.20,
    change: 8.40,
    changePercent: 6.62,
    marketCap: "3.32T",
    marketCapValue: 3320000000000,
    peRatio: 68.2,
    grossMargin: 76.0,
    operatingMargin: 62.1,
    netMargin: 55.4,
    revenueGrowth: 115.0,
    volatility: 3.8,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 120.40, high: 124.90, low: 119.50, close: 123.10, volume: 220000000 },
      { date: "06-11", open: 123.50, high: 128.20, low: 122.80, close: 127.40, volume: 190000000 },
      { date: "06-12", open: 128.00, high: 130.50, low: 126.20, close: 129.80, volume: 205000000 },
      { date: "06-15", open: 130.20, high: 132.80, low: 128.50, close: 131.20, volume: 185000000 },
      { date: "06-16", open: 131.50, high: 134.20, low: 130.00, close: 133.50, volume: 210000000 },
      { date: "06-17", open: 133.00, high: 136.50, low: 131.20, close: 135.20, volume: 250000000 }
    ]
  },
  TSLA: {
    symbol: "TSLA",
    name: "Tesla Inc.",
    exchange: "NASDAQ",
    sector: "Automotive",
    industry: "Auto Manufacturers",
    currentPrice: 187.40,
    change: -5.10,
    changePercent: -2.65,
    marketCap: "598B",
    marketCapValue: 598000000000,
    peRatio: 52.1,
    grossMargin: 18.4,
    operatingMargin: 5.5,
    netMargin: 4.8,
    revenueGrowth: -8.2,
    volatility: 3.5,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 195.00, high: 196.80, low: 190.20, close: 191.10, volume: 85000000 },
      { date: "06-11", open: 191.50, high: 194.20, low: 188.40, close: 190.40, volume: 72000000 },
      { date: "06-12", open: 190.10, high: 192.50, low: 186.10, close: 188.20, volume: 78000000 },
      { date: "06-15", open: 188.50, high: 191.80, low: 185.00, close: 189.90, volume: 81000000 },
      { date: "06-16", open: 190.20, high: 193.00, low: 186.80, close: 192.50, volume: 69000000 },
      { date: "06-17", open: 191.80, high: 192.40, low: 185.20, close: 187.40, volume: 92000000 }
    ]
  },
  JPM: {
    symbol: "JPM",
    name: "JPMorgan Chase & Co.",
    exchange: "NYSE",
    sector: "Financials",
    industry: "Diversified Banks",
    currentPrice: 195.80,
    change: 1.15,
    changePercent: 0.59,
    marketCap: "560B",
    marketCapValue: 560000000000,
    peRatio: 12.3,
    grossMargin: 100.0, // standardized
    operatingMargin: 42.1,
    netMargin: 31.2,
    revenueGrowth: 8.5,
    volatility: 0.9,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 192.00, high: 194.50, low: 191.80, close: 193.40, volume: 11000000 },
      { date: "06-11", open: 193.10, high: 195.00, low: 192.50, close: 194.10, volume: 9500000 },
      { date: "06-12", open: 194.50, high: 196.20, low: 193.80, close: 195.00, volume: 10500000 },
      { date: "06-15", open: 194.80, high: 195.80, low: 193.20, close: 194.20, volume: 8800000 },
      { date: "06-16", open: 194.00, high: 195.60, low: 193.10, close: 194.65, volume: 9200000 },
      { date: "06-17", open: 194.90, high: 196.40, low: 194.00, close: 195.80, volume: 12100000 }
    ]
  },
  GLW: {
    symbol: "GLW",
    name: "Corning Inc.",
    exchange: "NYSE",
    sector: "Technology",
    industry: "Electronic Components",
    currentPrice: 38.60,
    change: 1.45,
    changePercent: 3.90,
    marketCap: "32.8B",
    marketCapValue: 32800000000,
    peRatio: 18.5,
    grossMargin: 34.5,
    operatingMargin: 15.2,
    netMargin: 11.8,
    revenueGrowth: 2.1,
    volatility: 2.2,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 36.80, high: 37.40, low: 36.50, close: 37.10, volume: 4800000 },
      { date: "06-11", open: 37.00, high: 37.60, low: 36.85, close: 37.25, volume: 4100000 },
      { date: "06-12", open: 37.30, high: 38.10, low: 37.20, close: 37.85, volume: 4400000 },
      { date: "06-15", open: 37.90, high: 38.40, low: 37.60, close: 38.15, volume: 3900000 },
      { date: "06-16", open: 38.05, high: 38.25, low: 37.50, close: 37.15, volume: 5200000 },
      { date: "06-17", open: 37.25, high: 38.90, low: 37.10, close: 38.60, volume: 6800000 }
    ]
  },
  LLY: {
    symbol: "LLY",
    name: "Eli Lilly & Co.",
    exchange: "NYSE",
    sector: "Healthcare",
    industry: "Drug Manufacturers",
    currentPrice: 885.00,
    change: 18.20,
    changePercent: 2.10,
    marketCap: "841B",
    marketCapValue: 841000000000,
    peRatio: 115.4,
    grossMargin: 79.2,
    operatingMargin: 32.4,
    netMargin: 22.1,
    revenueGrowth: 26.0,
    volatility: 1.8,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 855.00, high: 871.00, low: 851.00, close: 865.00, volume: 3500000 },
      { date: "06-11", open: 866.00, high: 875.00, low: 860.00, close: 871.50, volume: 2900000 },
      { date: "06-12", open: 872.00, high: 882.00, low: 868.00, close: 879.00, volume: 3100000 },
      { date: "06-15", open: 878.00, high: 884.00, low: 870.00, close: 877.20, volume: 2700000 },
      { date: "06-16", open: 876.50, high: 880.00, low: 868.00, close: 873.10, volume: 3300000 },
      { date: "06-17", open: 874.00, high: 888.50, low: 871.20, close: 885.00, volume: 4400000 }
    ]
  },
  NEE: {
    symbol: "NEE",
    name: "NextEra Energy",
    exchange: "NYSE",
    sector: "Utilities",
    industry: "Regulated Electric",
    currentPrice: 72.10,
    change: -0.45,
    changePercent: -0.62,
    marketCap: "148B",
    marketCapValue: 148000000000,
    peRatio: 19.8,
    grossMargin: 82.5,
    operatingMargin: 25.1,
    netMargin: 18.6,
    revenueGrowth: 4.8,
    volatility: 1.1,
    timestamp: "2026-06-22 16:00:00 EST",
    historical: [
      { date: "06-08", open: 71.50, high: 72.85, low: 71.20, close: 72.40, volume: 8200000 },
      { date: "06-11", open: 72.50, high: 73.10, low: 72.15, close: 72.80, volume: 7100000 },
      { date: "06-12", open: 72.75, high: 73.50, low: 72.40, close: 73.15, volume: 7500000 },
      { date: "06-15", open: 73.20, high: 73.35, low: 72.50, close: 72.90, volume: 6800000 },
      { date: "06-16", open: 72.85, high: 73.00, low: 72.10, close: 72.55, volume: 7200000 },
      { date: "06-17", open: 72.50, high: 72.70, low: 71.85, close: 72.10, volume: 8400000 }
    ]
  }
};
