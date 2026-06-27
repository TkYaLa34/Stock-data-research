"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Scale,
  HelpCircle,
  Check,
  Sliders,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Star,
  Info,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from "recharts";
import { StockData, HistoricalBar } from "../lib/stocks";
import { PortfolioItem } from "../context/StockContext";

interface CorrelationMatrixProps {
  stocks: Record<string, StockData>;
  watchlist: string[];
  portfolioItems: PortfolioItem[];
  selectSymbol: (symbol: string) => void;
}

// Pearson Correlation Calculation helper
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  if (denX === 0 || denY === 0) return 0;
  return parseFloat((num / Math.sqrt(denX * denY)).toFixed(4));
}

export function CorrelationMatrix({
  stocks,
  watchlist,
  portfolioItems,
  selectSymbol
}: CorrelationMatrixProps) {
  // Selection types
  type FilterMode = "all" | "watchlist" | "portfolio" | "custom";
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  
  // Custom checked stock symbols
  const allSymbols = useMemo(() => Object.keys(stocks), [stocks]);
  const [customSelected, setCustomSelected] = useState<Record<string, boolean>>(() => {
    // Default to first 5 stocks checked
    const initial: Record<string, boolean> = {};
    Object.keys(stocks).forEach((symbol, idx) => {
      initial[symbol] = idx < 5;
    });
    return initial;
  });

  // Calculate active symbols based on filterMode
  const activeSymbols = useMemo(() => {
    switch (filterMode) {
      case "all":
        return allSymbols;
      case "watchlist":
        return watchlist.length > 0 ? watchlist : [];
      case "portfolio":
        const uniquePortfolioSymbols = Array.from(new Set(portfolioItems.map(item => item.symbol)));
        return uniquePortfolioSymbols.filter(symbol => stocks[symbol] !== undefined);
      case "custom":
        return allSymbols.filter(symbol => customSelected[symbol]);
      default:
        return allSymbols;
    }
  }, [filterMode, allSymbols, watchlist, portfolioItems, stocks, customSelected]);

  // Clicked pair for the co-movement chart
  const [selectedPair, setSelectedPair] = useState<[string, string] | null>(() => {
    const symbols = Object.keys(stocks);
    if (symbols.length >= 2) {
      return [symbols[0], symbols[1]];
    }
    return null;
  });

  // Calculate correlation matrix
  const matrix = useMemo(() => {
    const results: Record<string, Record<string, number>> = {};
    
    activeSymbols.forEach(symbolA => {
      results[symbolA] = {};
      activeSymbols.forEach(symbolB => {
        if (symbolA === symbolB) {
          results[symbolA][symbolB] = 1.0;
          return;
        }

        const stockA = stocks[symbolA];
        const stockB = stocks[symbolB];

        if (!stockA || !stockB) {
          results[symbolA][symbolB] = 0;
          return;
        }

        // Sort both by date to align returns
        const histA = [...(stockA.historical || [])].sort((a, b) => a.date.localeCompare(b.date));
        const histB = [...(stockB.historical || [])].sort((a, b) => a.date.localeCompare(b.date));

        // Daily percentage changes
        const returnsA: Record<string, number> = {};
        for (let i = 1; i < histA.length; i++) {
          const prev = histA[i - 1].close;
          const curr = histA[i].close;
          if (prev > 0) returnsA[histA[i].date] = (curr - prev) / prev;
        }

        const returnsB: Record<string, number> = {};
        for (let i = 1; i < histB.length; i++) {
          const prev = histB[i - 1].close;
          const curr = histB[i].close;
          if (prev > 0) returnsB[histB[i].date] = (curr - prev) / prev;
        }

        // Align daily returns
        const commonDates = Object.keys(returnsA).filter(date => returnsB[date] !== undefined);

        if (commonDates.length >= 2) {
          const x = commonDates.map(d => returnsA[d]);
          const y = commonDates.map(d => returnsB[d]);
          results[symbolA][symbolB] = pearsonCorrelation(x, y);
        } else {
          // Absolute price fallback if returns cannot be aligned
          const pricesA: Record<string, number> = {};
          histA.forEach(h => pricesA[h.date] = h.close);
          const pricesB: Record<string, number> = {};
          histB.forEach(h => pricesB[h.date] = h.close);

          const commonPriceDates = Object.keys(pricesA).filter(date => pricesB[date] !== undefined);
          if (commonPriceDates.length >= 2) {
            const x = commonPriceDates.map(d => pricesA[d]);
            const y = commonPriceDates.map(d => pricesB[d]);
            results[symbolA][symbolB] = pearsonCorrelation(x, y);
          } else {
            results[symbolA][symbolB] = 0;
          }
        }
      });
    });

    return results;
  }, [activeSymbols, stocks]);

  // Find strongest positive and negative correlations
  const insights = useMemo(() => {
    if (activeSymbols.length < 2) return null;

    let strongestPositive = { symA: "", symB: "", r: -2.0 };
    let strongestNegative = { symA: "", symB: "", r: 2.0 };
    let sumCorrelation = 0;
    let totalPairsCount = 0;

    for (let i = 0; i < activeSymbols.length; i++) {
      for (let j = i + 1; j < activeSymbols.length; j++) {
        const symA = activeSymbols[i];
        const symB = activeSymbols[j];
        const r = matrix[symA]?.[symB] ?? 0;

        sumCorrelation += r;
        totalPairsCount++;

        if (r > strongestPositive.r) {
          strongestPositive = { symA, symB, r };
        }
        if (r < strongestNegative.r) {
          strongestNegative = { symA, symB, r };
        }
      }
    }

    const averageCorrelation = totalPairsCount > 0 ? sumCorrelation / totalPairsCount : 0;

    return {
      strongestPositive,
      strongestNegative,
      averageCorrelation
    };
  }, [activeSymbols, matrix]);

  // Normalized co-movement chart data
  const chartData = useMemo(() => {
    if (!selectedPair) return [];
    const [symA, symB] = selectedPair;
    const stockA = stocks[symA];
    const stockB = stocks[symB];

    if (!stockA || !stockB) return [];

    const histA = [...(stockA.historical || [])].sort((a, b) => a.date.localeCompare(b.date));
    const histB = [...(stockB.historical || [])].sort((a, b) => a.date.localeCompare(b.date));

    // Align dates
    const datesA = new Set(histA.map(h => h.date));
    const commonDates = histB.map(h => h.date).filter(date => datesA.has(date));

    if (commonDates.length === 0) return [];

    // Find starting prices on the first common date to normalize to 100
    const startA = histA.find(h => h.date === commonDates[0])?.close || 1;
    const startB = histB.find(h => h.date === commonDates[0])?.close || 1;

    return commonDates.map(date => {
      const priceA = histA.find(h => h.date === date)?.close || 0;
      const priceB = histB.find(h => h.date === date)?.close || 0;

      const normA = (priceA / startA) * 100;
      const normB = (priceB / startB) * 100;

      return {
        date,
        [symA]: parseFloat(normA.toFixed(2)),
        [symB]: parseFloat(normB.toFixed(2))
      };
    });
  }, [selectedPair, stocks]);

  // Color-coding helper for correlation
  const getCellBgColor = (r: number) => {
    const abs = Math.abs(r);
    if (r > 0) {
      // Teal-blue for positive co-movement
      return `rgba(59, 130, 246, ${Math.max(0.04, abs * 0.75)})`;
    } else {
      // Crimson-rose for negative co-movement
      return `rgba(239, 68, 68, ${Math.max(0.04, abs * 0.75)})`;
    }
  };

  const getCellTextColor = (r: number) => {
    const abs = Math.abs(r);
    if (abs > 0.6) return "text-white font-black";
    if (abs > 0.3) return "text-zinc-200 font-semibold";
    return "text-zinc-400 font-normal";
  };

  const toggleCustomSymbol = (symbol: string) => {
    setCustomSelected(prev => ({
      ...prev,
      [symbol]: !prev[symbol]
    }));
  };

  const handleCellClick = (symA: string, symB: string) => {
    setSelectedPair([symA, symB]);
  };

  const getRelationshipDescriptor = useCallback((r: number, symA: string, symB: string) => {
    const nameA = stocks[symA]?.name || symA;
    const nameB = stocks[symB]?.name || symB;
    
    if (r > 0.7) {
      return {
        title: "Strong Positive Co-Movement",
        desc: `${symA} and ${symB} show high systemic co-movement (+${r.toFixed(2)} correlation). This indicates strong tech or sector beta alignment. When one rallies, the other typically follows. While profitable in bull runs, holding both increases downside concentration risk.`,
        colorClass: "text-blue-400 border-blue-500/20 bg-blue-950/20",
        icon: <Zap className="h-4 w-4 text-blue-400" />
      };
    }
    if (r > 0.3) {
      return {
        title: "Moderate Positive Co-Movement",
        desc: `${symA} and ${symB} are moderately correlated (+${r.toFixed(2)} correlation). They share standard macroeconomic drivers but retain sufficient specific business autonomy to provide mild offset buffers.`,
        colorClass: "text-teal-400 border-teal-500/20 bg-teal-950/20",
        icon: <TrendingUp className="h-4 w-4 text-teal-400" />
      };
    }
    if (r >= -0.3 && r <= 0.3) {
      return {
        title: "Independent / Low Correlation",
        desc: `${symA} and ${symB} are statistically independent (${r.toFixed(2)} correlation). This is a textbook diversification pairing. Moves in ${symA} have zero influence on ${symB}, providing a magnificent stabilizer in periods of high volatility.`,
        colorClass: "text-emerald-400 border-emerald-500/20 bg-emerald-950/20",
        icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />
      };
    }
    if (r >= -0.7) {
      return {
        title: "Moderate Negative Correlation",
        desc: `${symA} and ${symB} exhibit inverse relation (-${Math.abs(r).toFixed(2)} correlation). Ideal for partial hedging setups. Often, capital rotated out of ${symA} shifts into ${symB}, providing organic risk insulation.`,
        colorClass: "text-amber-400 border-amber-500/20 bg-amber-950/20",
        icon: <TrendingDown className="h-4 w-4 text-amber-400" />
      };
    }
    return {
      title: "Strong Inverse Hedge Correlation",
      desc: `${symA} and ${symB} show a powerful negative correlation (-${Math.abs(r).toFixed(2)} correlation). This is an elite portfolio stabilizer. When ${symA} encounters high friction, ${symB} acts as a direct flight-to-safety shield, preserving portfolio equity.`,
      colorClass: "text-rose-400 border-rose-500/20 bg-rose-950/20",
      icon: <AlertCircle className="h-4 w-4 text-rose-400" />
    };
  }, [stocks]);

  const currentPairCorrelation = useMemo(() => {
    if (!selectedPair) return 0;
    const [symA, symB] = selectedPair;
    return matrix[symA]?.[symB] ?? (symA === symB ? 1.0 : 0.0);
  }, [selectedPair, matrix]);

  const activeRelationship = useMemo(() => {
    if (!selectedPair) return null;
    return getRelationshipDescriptor(currentPairCorrelation, selectedPair[0], selectedPair[1]);
  }, [selectedPair, currentPairCorrelation, getRelationshipDescriptor]);

  return (
    <div className="space-y-6">
      {/* 1. Header and Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "watchlist", "portfolio", "custom"] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                setFilterMode(mode);
                // Reset selected pair to first 2 active elements if necessary
                const targetSymbols = mode === "all" ? allSymbols : 
                                      mode === "watchlist" ? watchlist : 
                                      mode === "portfolio" ? Array.from(new Set(portfolioItems.map(i => i.symbol))) : 
                                      allSymbols.filter(s => customSelected[s]);
                if (targetSymbols.length >= 2) {
                  setSelectedPair([targetSymbols[0], targetSymbols[1]]);
                }
              }}
              className={`px-3 py-1 text-[10px] uppercase font-mono font-bold tracking-wider rounded-md border transition-all cursor-pointer ${
                filterMode === mode
                  ? "bg-blue-600 border-blue-500 text-white shadow-md"
                  : "bg-zinc-950 border-zinc-850 hover:bg-zinc-900 text-zinc-400"
              }`}
            >
              {mode === "all" && "All Market Assets"}
              {mode === "watchlist" && `Watchlist (${watchlist.length})`}
              {mode === "portfolio" && "Portfolio Holdings"}
              {mode === "custom" && "Custom Selector"}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
          <Info className="h-3 w-3 text-zinc-600" />
          Pearson coefficient based on aligned historical close return changes
        </div>
      </div>

      {/* Custom Selector Pill Row */}
      {filterMode === "custom" && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
          <span className="text-[9px] uppercase text-zinc-500 font-mono font-bold mr-2">Select tickers:</span>
          {allSymbols.map((symbol) => (
            <button
              key={symbol}
              onClick={() => toggleCustomSymbol(symbol)}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                customSelected[symbol]
                  ? "bg-zinc-900 border-blue-500/50 text-blue-400 font-bold"
                  : "bg-zinc-950 border-zinc-900 text-zinc-600 hover:text-zinc-400"
              }`}
            >
              <div className={`h-2 w-2 rounded-full ${customSelected[symbol] ? "bg-blue-500" : "bg-zinc-800"}`} />
              {symbol}
            </button>
          ))}
        </div>
      )}

      {/* Main Grid: Heatmap Matrix + Side Diagnostics */}
      {activeSymbols.length < 2 ? (
        <div className="border border-dashed border-zinc-850 bg-zinc-950/20 rounded-2xl p-10 text-center text-zinc-500 py-16 space-y-3">
          <AlertCircle className="h-8 w-8 text-zinc-700 mx-auto" />
          <h4 className="text-sm font-bold text-zinc-300 font-mono uppercase">Insufficient Assets Selected</h4>
          <p className="max-w-md mx-auto text-xs text-zinc-600 font-sans">
            Please add or select at least 2 assets to compile a statistically valid returns correlation matrix.
            {filterMode === "watchlist" && " (Your active watchlist is currently empty. Star tickers in the screener to populate this filter.)"}
            {filterMode === "portfolio" && " (No holdings recorded. Log simulated trades in the Portfolio ledger to analyze them here.)"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* 1. HEATMAP MATRIX GRID */}
          <div className="xl:col-span-7 bg-[#050508] border border-zinc-900/60 p-4 rounded-xl shadow-inner flex flex-col justify-between overflow-x-auto min-w-full">
            <div className="w-full">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    {/* Top-Left empty header block */}
                    <th className="p-2 border-b border-r border-zinc-900/60 text-[10px] font-mono font-black text-left text-zinc-500 bg-zinc-950/40 select-none uppercase">
                      Asset Correlation
                    </th>
                    {activeSymbols.map(sym => (
                      <th
                        key={sym}
                        className="p-2 border-b border-zinc-900/60 font-mono text-[10px] font-black text-slate-300 hover:bg-zinc-900/40 cursor-pointer"
                        onClick={() => selectSymbol(sym)}
                      >
                        {sym}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSymbols.map(symA => (
                    <tr key={symA} className="hover:bg-zinc-950/30">
                      {/* Left row header */}
                      <td
                        className="p-2 border-r border-zinc-900/60 font-mono text-[10px] font-black text-slate-300 text-left bg-zinc-950/40 hover:bg-zinc-900/40 cursor-pointer"
                        onClick={() => selectSymbol(symA)}
                      >
                        {symA}
                      </td>
                      {/* Grid Cells */}
                      {activeSymbols.map(symB => {
                        const r = matrix[symA]?.[symB] ?? 0;
                        const isSelf = symA === symB;
                        const isSelected = selectedPair && 
                          ((selectedPair[0] === symA && selectedPair[1] === symB) || 
                           (selectedPair[0] === symB && selectedPair[1] === symA));

                        return (
                          <td
                            key={`${symA}-${symB}`}
                            onClick={() => handleCellClick(symA, symB)}
                            style={{ backgroundColor: getCellBgColor(r) }}
                            className={`p-3 text-[11px] font-mono border border-zinc-900/40 transition-all cursor-pointer relative select-none ${getCellTextColor(r)} ${
                              isSelected 
                                ? "ring-2 ring-blue-500/80 ring-inset scale-[0.98] z-10" 
                                : "hover:brightness-125"
                            }`}
                          >
                            {isSelf ? "1.00" : (r >= 0 ? `+${r.toFixed(2)}` : r.toFixed(2))}
                            {isSelected && (
                              <div className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-blue-400" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scale Indicator */}
            <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 uppercase mt-4 select-none pt-3 border-t border-zinc-900">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-12 bg-gradient-to-r from-red-600/70 to-red-600/10 rounded" />
                <span>Inverse (-1.0)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-zinc-800" />
                <span>Uncorrelated (0.0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-12 bg-gradient-to-r from-blue-600/10 to-blue-600/75 rounded" />
                <span>Positive (+1.0)</span>
              </div>
            </div>
          </div>

          {/* 2. DYNAMIC REAL-TIME INSIGHT DIAGNOSTICS */}
          <div className="xl:col-span-5 flex flex-col justify-between space-y-4">
            
            {/* Portfolio Diversification Health Summary */}
            {insights && (
              <div className="bg-[#09090d] border border-zinc-900 p-4 rounded-xl flex flex-col justify-between h-full space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                      Active Asset Portfolio Health
                    </h4>
                    <p className="text-xs font-black text-white font-mono mt-1">
                      Avg Pairwise Correlation:{" "}
                      <span className={
                        insights.averageCorrelation > 0.5 ? "text-amber-450" :
                        insights.averageCorrelation < 0.2 ? "text-emerald-450" : "text-blue-450"
                      }>
                        {insights.averageCorrelation >= 0 ? "+" : ""}{insights.averageCorrelation.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <Scale className="h-5 w-5 text-zinc-600" />
                </div>

                {/* Score Dial / Rating Bar */}
                <div className="bg-zinc-950 p-3 border border-zinc-900 rounded-lg space-y-1">
                  <div className="flex justify-between text-[9px] font-mono font-bold">
                    <span className="text-emerald-500">DIVERSIFIED</span>
                    <span className="text-blue-500">BALANCED</span>
                    <span className="text-amber-500">CONCENTRATED</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        insights.averageCorrelation > 0.5 ? "bg-amber-500" :
                        insights.averageCorrelation < 0.2 ? "bg-emerald-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.max(10, Math.min(100, ((insights.averageCorrelation + 1) / 2) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Actionable Insights and Explanations */}
                <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
                  {insights.averageCorrelation > 0.5 ? (
                    <span>
                      <strong>Warning: High Risk Concentration.</strong> Your active assets move tightly in parallel.
                      A sector correction is highly likely to draw down all positions simultaneously.
                      Consider adding counter-cyclical buffers such as <strong>NEE</strong> (Utilities) or <strong>JPM</strong> (Financials) to establish true risk hedging.
                    </span>
                  ) : insights.averageCorrelation < 0.2 ? (
                    <span>
                      <strong>Excellent Risk Dispersion.</strong> Your assets are statistically independent.
                      Idiosyncratic business dynamics drive each position, creating a solid capital shield
                      against market-wide flash crashes. Great configuration.
                    </span>
                  ) : (
                    <span>
                      <strong>Healthy Portfolio Balance.</strong> Your positions offer solid capital growth characteristics
                      without excessive downside lock-step exposure. Market sector rotations are likely to offset
                      shocks organically.
                    </span>
                  )}
                </p>

                {/* Pair Extremes */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-2 border-t border-zinc-900">
                  <div className="bg-zinc-950 p-2 border border-zinc-900/60 rounded-lg">
                    <span className="text-[8px] text-zinc-500 uppercase block">Strongest Synergy</span>
                    <div className="flex justify-between items-center mt-1 text-xs">
                      <span className="font-bold text-white">
                        {insights.strongestPositive.symA} / {insights.strongestPositive.symB}
                      </span>
                      <span className="text-blue-450 font-bold font-mono">
                        +{insights.strongestPositive.r.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-zinc-950 p-2 border border-zinc-900/60 rounded-lg">
                    <span className="text-[8px] text-zinc-500 uppercase block">Most Diversifying</span>
                    <div className="flex justify-between items-center mt-1 text-xs">
                      <span className="font-bold text-white">
                        {insights.strongestNegative.symA} / {insights.strongestNegative.symB}
                      </span>
                      <span className="text-rose-450 font-bold font-mono">
                        {insights.strongestNegative.r.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DUAL-AXIS OVERLAY PERFORMANCE EXPLORER */}
      {selectedPair && activeSymbols.includes(selectedPair[0]) && activeSymbols.includes(selectedPair[1]) && (
        <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl p-4 space-y-4" id="co-movement-explorer">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-zinc-900">
            <div>
              <h4 className="text-xs font-mono font-bold tracking-widest text-[#f8fafc] uppercase flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin-slow" />
                Asset Co-Movement explorer: {selectedPair[0]} & {selectedPair[1]}
              </h4>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                Relative performance normalized to 100 on common start date to isolate asset tracking efficiency.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-zinc-500 uppercase">Pearson Coefficient:</span>
              <span className={`px-2 py-0.5 rounded font-black ${
                currentPairCorrelation > 0.5 ? "bg-blue-950/40 border border-blue-900 text-blue-400" :
                currentPairCorrelation < -0.3 ? "bg-rose-950/40 border border-rose-900 text-rose-400" :
                "bg-emerald-950/40 border border-emerald-900 text-emerald-400"
              }`}>
                {currentPairCorrelation >= 0 ? `+${currentPairCorrelation.toFixed(2)}` : currentPairCorrelation.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            {/* Relationship Text Descriptor Block */}
            {activeRelationship && (
              <div className={`lg:col-span-4 p-4 rounded-xl border flex flex-col justify-between h-full space-y-2.5 transition-all duration-300 ${activeRelationship.colorClass}`}>
                <div className="flex items-center gap-2">
                  {activeRelationship.icon}
                  <h5 className="text-xs font-mono font-black uppercase text-white">
                    {activeRelationship.title}
                  </h5>
                </div>
                <p className="text-[10px] leading-relaxed font-sans text-zinc-300">
                  {activeRelationship.desc}
                </p>
                <div className="pt-2 border-t border-zinc-900/30 flex items-center justify-between text-[9px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-zinc-500" />
                    Double click to screener
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectSymbol(selectedPair[0])}
                      className="hover:text-white underline cursor-pointer"
                    >
                      View {selectedPair[0]}
                    </button>
                    <button
                      onClick={() => selectSymbol(selectedPair[1])}
                      className="hover:text-white underline cursor-pointer"
                    >
                      View {selectedPair[1]}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recharts Relative Chart Area */}
            <div className="lg:col-span-8 bg-[#050508] border border-zinc-900/60 p-4 rounded-xl">
              {chartData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-zinc-600 text-xs italic font-sans">
                  Calculating time series alignment... No overlay available.
                </div>
              ) : (
                <div className="h-44 w-full font-mono text-[9px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="date" stroke="var(--chart-text)" />
                      <YAxis
                        stroke="var(--chart-text)"
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#09090d", borderColor: "#27272a", borderRadius: "10px" }}
                        labelStyle={{ fontWeight: "black", color: "var(--text-main)" }}
                        formatter={(value: any, name: any) => [`${parseFloat(value).toFixed(1)}%`, name]}
                      />
                      <Legend verticalAlign="top" height={24} iconSize={8} />
                      <Line
                        type="monotone"
                        dataKey={selectedPair[0]}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey={selectedPair[1]}
                        stroke="#f43f5e"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        strokeDasharray="4 4"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
