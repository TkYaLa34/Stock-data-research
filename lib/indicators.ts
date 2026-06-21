/**
 * Mathematical logic and utility functions for calculating financial technical indicators.
 * Focuses on Support & Resistance, RSI, MACD, and Bollinger Bands.
 */

export interface HistoricalBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SupportResistanceLevels {
  pivot: number;
  s1: number;
  s2: number;
  s3: number;
  r1: number;
  r2: number;
  r3: number;
}

/**
 * Calculates Support and Resistance levels based on Standard Classic Pivot Points
 * using the high, low, and close of the previous period (commonly daily or weekly).
 */
export function calculatePivotPoints(high: number, low: number, close: number): SupportResistanceLevels {
  const pivot = (high + low + close) / 3;
  
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  
  const r2 = pivot + (high - low);
  const s2 = pivot - (high - low);
  
  const r3 = high + 2 * (pivot - low);
  const s3 = low - 2 * (high - pivot);
  
  return {
    pivot: Math.round(pivot * 100) / 100,
    s1: Math.round(s1 * 100) / 100,
    s2: Math.round(s2 * 100) / 100,
    s3: Math.round(s3 * 100) / 100,
    r1: Math.round(r1 * 100) / 100,
    r2: Math.round(r2 * 100) / 100,
    r3: Math.round(r3 * 100) / 100,
  };
}

/**
 * Calculates Support and Resistance levels based on Fibonacci Fibonacci numbers from previous period.
 */
export function calculateFibonacciPivots(high: number, low: number, close: number): SupportResistanceLevels {
  const pivot = (high + low + close) / 3;
  const range = high - low;
  
  const r1 = pivot + 0.382 * range;
  const s1 = pivot - 0.382 * range;
  
  const r2 = pivot + 0.618 * range;
  const s2 = pivot - 0.618 * range;
  
  const r3 = pivot + 1.000 * range;
  const s3 = pivot - 1.000 * range;
  
  return {
    pivot: Math.round(pivot * 100) / 100,
    s1: Math.round(s1 * 100) / 100,
    s2: Math.round(s2 * 100) / 100,
    s3: Math.round(s3 * 100) / 100,
    r1: Math.round(r1 * 100) / 100,
    r2: Math.round(r2 * 100) / 100,
    r3: Math.round(r3 * 100) / 100,
  };
}

/**
 * Calculates the Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Not enough data
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      sma.push(Math.round((sum / period) * 100) / 100);
    }
  }
  return sma;
}

/**
 * Calculates the Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  if (data.length === 0) return ema;
  
  const k = 2 / (period + 1);
  let prevEma = data[0]; // Start with first value
  
  ema.push(prevEma);
  
  for (let i = 1; i < data.length; i++) {
    const currentEma = data[i] * k + prevEma * (1 - k);
    ema.push(Math.round(currentEma * 100) / 100);
    prevEma = currentEma;
  }
  return ema;
}

/**
 * Calculates the Relative Strength Index (RSI) for a period (standard is 14)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (prices.length <= period) {
    return new Array(prices.length).fill(50); // Default neutral value
  }
  
  let gains = 0;
  let losses = 0;
  
  // First RSI value
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  rsi.push(NaN); // Fill for starting index changes
  for (let i = 1; i < period; i++) rsi.push(NaN);
  
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
  
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    let currentGain = change > 0 ? change : 0;
    let currentLoss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
  }
  
  // Fill missing initial lines smoothly for chart alignment
  for (let i = 0; i < period; i++) {
    rsi[i] = 50; 
  }
  return rsi;
}

/**
 * Calculates Bollinger Bands (SMA basis, 2 Standard Deviations)
 */
export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2): BollingerBands {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  
  const smaList = calculateSMA(prices, period);
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(prices[i]);
      middle.push(prices[i]);
      lower.push(prices[i]);
    } else {
      const sma = smaList[i];
      // Variance
      let sumSqDiff = 0;
      for (let j = 0; j < period; j++) {
        sumSqDiff += Math.pow(prices[i - j] - sma, 2);
      }
      const standardDeviation = Math.sqrt(sumSqDiff / period);
      
      middle.push(sma);
      upper.push(Math.round((sma + multiplier * standardDeviation) * 100) / 100);
      lower.push(Math.round((sma - multiplier * standardDeviation) * 100) / 100);
    }
  }
  
  return { upper, middle, lower };
}

/**
 * Calculates MACD (12, 26, 9)
 */
export interface MACDResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

export function calculateMACD(prices: number[], shortPeriod: number = 12, longPeriod: number = 26, signalPeriod: number = 9): MACDResult {
  const shortEma = calculateEMA(prices, shortPeriod);
  const longEma = calculateEMA(prices, longPeriod);
  
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(Math.round((shortEma[i] - longEma[i]) * 100) / 100);
  }
  
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    histogram.push(Math.round((macdLine[i] - signalLine[i]) * 100) / 100);
  }
  
  return { macdLine, signalLine, histogram };
}

/**
 * Evaluates stock indicators to produce dynamic multi-indicator buy/sell signals
 */
export interface TradingSignal {
  recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  rsiValue: number;
  macdAction: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL';
  bollingerState: 'OVERBOUGHT' | 'OVERSOLD' | 'NORMAL';
  score: number; // -100 to +100
}

export function generateIndicatorsAnalysis(prices: number[]): TradingSignal {
  if (prices.length < 30) {
    return {
      recommendation: 'NEUTRAL',
      rsiValue: 50,
      macdAction: 'NEUTRAL',
      bollingerState: 'NORMAL',
      score: 0
    };
  }
  
  const currentPrice = prices[prices.length - 1];
  
  // Calculate RSI
  const rsiList = calculateRSI(prices);
  const currentRsi = rsiList[rsiList.length - 1] || 50;
  
  // Calculate MACD
  const macd = calculateMACD(prices);
  const curMacd = macd.macdLine[macd.macdLine.length - 1];
  const curSignal = macd.signalLine[macd.signalLine.length - 1];
  const prevMacd = macd.macdLine[macd.macdLine.length - 2];
  const prevSignal = macd.signalLine[macd.signalLine.length - 2];
  
  let macdAction: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL' = 'NEUTRAL';
  if (prevMacd <= prevSignal && curMacd > curSignal) {
    macdAction = 'BULLISH_CROSS';
  } else if (prevMacd >= prevSignal && curMacd < curSignal) {
    macdAction = 'BEARISH_CROSS';
  }
  
  // Calculate Bollinger Bands
  const bb = calculateBollingerBands(prices, 20, 2);
  const bbUpper = bb.upper[bb.upper.length - 1];
  const bbLower = bb.lower[bb.lower.length - 1];
  
  let bollingerState: 'OVERBOUGHT' | 'OVERSOLD' | 'NORMAL' = 'NORMAL';
  if (currentPrice >= bbUpper * 0.98) {
    bollingerState = 'OVERBOUGHT';
  } else if (currentPrice <= bbLower * 1.02) {
    bollingerState = 'OVERSOLD';
  }
  
  // Score compilation
  let score = 0;
  
  // RSI scoring
  if (currentRsi < 30) score += 40; // oversold, great buy
  else if (currentRsi < 40) score += 20; // light buy
  else if (currentRsi > 70) score -= 40; // overbought, sell
  else if (currentRsi > 60) score -= 20; // light sell
  
  // MACD scoring
  if (macdAction === 'BULLISH_CROSS') score += 30;
  if (macdAction === 'BEARISH_CROSS') score -= 30;
  // Trend-aligned momentum
  if (curMacd > curSignal) score += 10;
  else score -= 10;
  
  // Bollinger bands scoring
  if (bollingerState === 'OVERSOLD') score += 20;
  if (bollingerState === 'OVERBOUGHT') score -= 20;
  
  let recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL';
  if (score >= 50) recommendation = 'STRONG_BUY';
  else if (score >= 15) recommendation = 'BUY';
  else if (score <= -50) recommendation = 'STRONG_SELL';
  else if (score <= -15) recommendation = 'SELL';
  
  return {
    recommendation,
    rsiValue: currentRsi,
    macdAction,
    bollingerState,
    score
  };
}
