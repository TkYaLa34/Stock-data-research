import React from 'react';
import { PivotPoints, FibonacciLevels } from '../utils/technicalAnalysis';

interface BentoMatrixProps {
  symbol: string;
  currentPrice: number;
  pivots: PivotPoints;
  fib: FibonacciLevels;
}

export const BentoMatrix: React.FC<BentoMatrixProps> = ({ symbol, currentPrice, pivots, fib }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950 text-slate-100 min-h-screen">
      
      {/* Box 1: Asset Hero Overview */}
      <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
        <div>
          <span className="text-xs font-bold tracking-wider text-cyan-400 uppercase">Market Asset</span>
          <h1 className="text-4xl font-extrabold mt-1">{symbol}</h1>
        </div>
        <div className="mt-8">
          <p className="text-sm text-slate-400">Current Price</p>
          <p className="text-5xl font-mono font-bold tracking-tight text-emerald-400">${currentPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Box 2: Automatic Pivot Matrix (S1/P/R1) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-500"></span> Pivot Matrix
        </h3>
        <div className="space-y-3 font-mono">
          <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950">
            <span className="text-rose-400 font-bold">R1 (Resistance)</span>
            <span className="text-lg font-semibold">${pivots.r1}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-slate-800/50">
            <span className="text-amber-400 font-bold">P (Pivot Point)</span>
            <span className="text-lg font-semibold">${pivots.p}</span>
          </div>
          <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950">
            <span className="text-emerald-400 font-bold">S1 (Support)</span>
            <span className="text-lg font-semibold">${pivots.s1}</span>
          </div>
        </div>
      </div>

      {/* Box 3: Golden Ratio Fibonacci Levels */}
      <div className="md:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-500"></span> Fibonacci Levels
        </h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">23.6%</span>
            <span>${fib.level236}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-500">38.2%</span>
            <span>${fib.level382}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span className="text-slate-400 font-medium">50.0% (Mid)</span>
            <span className="text-cyan-400 font-bold">${fib.level500}</span>
          </div>
          <div className="flex justify-between pb-1">
            <span className="text-amber-400 font-medium">61.8% (Golden)</span>
            <span className="text-amber-400 font-bold">${fib.level618}</span>
          </div>
        </div>
      </div>

      {/* Box 4: AI Analyst Insights Placeholder */}
      <div className="md:col-span-2 bg-gradient-to-br from-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-semibold text-indigo-400 mb-2">✨ Gemini AI Market Sentiment</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          ราคาทดสอบระดับแนวรับสัญญานทางเทคนิค $S_1$ พร้อมปริมาณการซื้อขายหนาแน่น ดัชนี RSI บ่งชี้สภาวะ Oversold ในระยะสั้น เหมาะสำหรับนักลงทุนระยะสั้นพิจารณาจังหวะ Rebate หรืองัดกลยุทธ์ Swing Trade
        </p>
      </div>

    </div>
  );
};
