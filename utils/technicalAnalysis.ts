export interface MarketData {
  high: number;
  low: number;
  close: number;
  currentPrice: number;
}

export interface PivotPoints {
  p: number;
  r1: number;
  s1: number;
}

export interface FibonacciLevels {
  level236: number;
  level382: number;
  level500: number;
  level618: number;
}

/**
 * คำนวณ Standard Pivot Points (Classic Method)
 */
export function calculatePivotPoints(data: MarketData): PivotPoints {
  const { high, low, close } = data;
  const p = (high + low + close) / 3;
  const r1 = (2 * p) - low;
  const s1 = (2 * p) - high;

  return { 
    p: Number(p.toFixed(2)), 
    r1: Number(r1.toFixed(2)), 
    s1: Number(s1.toFixed(2)) 
  };
}

/**
 * คำนวณระดับ Fibonacci Retracement จาก High และ Low
 */
export function calculateFibonacci(data: MarketData): FibonacciLevels {
  const { high, low } = data;
  const diff = high - low;

  return {
    level236: Number((high - diff * 0.236).toFixed(2)),
    level382: Number((high - diff * 0.382).toFixed(2)),
    level500: Number((high - diff * 0.500).toFixed(2)),
    level618: Number((high - diff * 0.618).toFixed(2)),
  };
}
