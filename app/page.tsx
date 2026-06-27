"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { StockProvider, useStock, PortfolioItem } from "../context/StockContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { AuthModal } from "../components/AuthModal";
import { StockData, HistoricalBar } from "../lib/stocks";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { CorrelationMatrix } from "../components/CorrelationMatrix";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  PieChart,
  Info,
  Calendar,
  DollarSign,
  X,
  Star,
  SlidersHorizontal,
  RefreshCw,
  Sliders,
  Edit2,
  Check,
  Layers,
  Search,
  Briefcase,
  Eye,
  BookOpen,
  AlertCircle,
  Percent,
  ChevronRight,
  Download,
  Bell,
  History,
  Newspaper,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Filter,
  Scale,
  LogOut,
  User,
  Compass
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Treemap
} from "recharts";

// --- CUSTOM MAP COMPONENT FOR RISK HEATMAPS ---
interface HeatMapProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  value?: number;
  volatility?: number;
  changePercent?: number;
  depth?: number;
}

const PortfolioTreeMapTile = (props: HeatMapProps) => {
  const { x = 0, y = 0, width = 0, height = 0, name = '', volatility = 0, changePercent = 0, depth = 0 } = props;
  if (depth !== 1) return null;

  const isPositive = changePercent >= 0;
  const isHighRisk = volatility > 2.5;
  const isModRisk = volatility > 1.5;

  let tileBg = "rgba(16, 185, 129, 0.15)";
  let strokeBg = "rgba(16, 185, 129, 0.3)";
  let badgeColor = "#10b981";

  if (isHighRisk) {
    tileBg = "rgba(239, 68, 68, 0.18)";
    strokeBg = "rgba(239, 68, 68, 0.4)";
    badgeColor = "#ef4444";
  } else if (isModRisk) {
    tileBg = "rgba(245, 158, 11, 0.15)";
    strokeBg = "rgba(245, 158, 11, 0.35)";
    badgeColor = "#f59e0b";
  }

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: tileBg,
          stroke: strokeBg,
          strokeWidth: 1.5,
        }}
        rx={6}
        ry={6}
      />
      {width > 48 && height > 35 && (
        <text
          x={x + 8}
          y={y + 18}
          fill="#FFFFFF"
          fontSize={11}
          fontWeight="bold"
          style={{ fontFamily: 'monospace' }}
        >
          {name}
        </text>
      )}
      {width > 65 && height > 50 && (
        <>
          <text
            x={x + 8}
            y={y + 32}
            fill="#a1a1aa"
            fontSize={9}
            style={{ fontFamily: 'sans-serif' }}
          >
            Vol: {volatility.toFixed(1)}%
          </text>
          <text
            x={x + 8}
            y={y + 44}
            fontSize={9}
            fontWeight="bold"
            fill={badgeColor}
            style={{ fontFamily: 'monospace' }}
          >
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </text>
        </>
      )}
    </g>
  );
};

// --- DYNAMIC TECHNICAL INDICATORS CALCULATOR ---
function calculateSMA(data: HistoricalBar[], period: number): number[] {
  const smaValues: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      smaValues.push(data[i].close); // fallback to raw close for early terms
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      smaValues.push(parseFloat((sum / period).toFixed(2)));
    }
  }
  return smaValues;
}

function calculateEMA(data: HistoricalBar[], period: number): number[] {
  const emaValues: number[] = [];
  if (data.length === 0) return [];
  
  const k = 2 / (period + 1);
  let ema = data[0].close; // initial fallback seed
  emaValues.push(ema);

  for (let i = 1; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    emaValues.push(parseFloat(ema.toFixed(2)));
  }
  return emaValues;
}

function calculateRSI(data: HistoricalBar[], period: number): number[] {
  const rsiValues: number[] = [];
  if (data.length === 0) return [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < 1) {
      rsiValues.push(50); // standard neutral starting point
      continue;
    }
    
    let gains = 0;
    let losses = 0;
    const actualLookback = Math.min(i, period);
    
    for (let j = 0; j < actualLookback; j++) {
      const currentIdx = i - j;
      const prevIdx = currentIdx - 1;
      const change = data[currentIdx].close - data[prevIdx].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / actualLookback;
    const avgLoss = losses / actualLookback;
    
    if (avgLoss === 0) {
      rsiValues.push(avgGain > 0 ? 100 : 50);
    } else {
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      rsiValues.push(parseFloat(rsi.toFixed(2)));
    }
  }
  return rsiValues;
}

function calculateMACD(
  data: HistoricalBar[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macdLine: number[]; signalLine: number[]; histogram: number[] } {
  const fileLength = data.length;
  if (fileLength === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  const f = Math.max(1, parseInt(fastPeriod as any) || 2);
  const s = Math.max(2, parseInt(slowPeriod as any) || 5);
  const sig = Math.max(1, parseInt(signalPeriod as any) || 3);

  const fastEma = calculateEMA(data, f);
  const slowEma = calculateEMA(data, s);

  const macdLine: number[] = [];
  for (let i = 0; i < fileLength; i++) {
    macdLine.push(parseFloat((fastEma[i] - (slowEma[i] !== undefined ? slowEma[i] : fastEma[i])).toFixed(2)));
  }

  const signalLine: number[] = [];
  if (macdLine.length > 0) {
    const k = 2 / (sig + 1);
    let sigEma = macdLine[0];
    signalLine.push(sigEma);
    for (let i = 1; i < macdLine.length; i++) {
      sigEma = macdLine[i] * k + sigEma * (1 - k);
      signalLine.push(parseFloat(sigEma.toFixed(2)));
    }
  }

  const histogram: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    const sigVal = signalLine[i] !== undefined ? signalLine[i] : macdLine[i];
    histogram.push(parseFloat((macdLine[i] - sigVal).toFixed(2)));
  }

  return { macdLine, signalLine, histogram };
}

function calculateBollingerBands(data: HistoricalBar[], period: number = 5): { middle: number; upper: number; lower: number } {
  if (!data || data.length === 0) return { middle: 0, upper: 0, lower: 0 };
  const lastIdx = data.length - 1;
  const actualPeriod = Math.min(data.length, period);
  
  // Calculate SMA (Middle Band)
  let sum = 0;
  for (let i = 0; i < actualPeriod; i++) {
    sum += data[lastIdx - i].close;
  }
  const middle = sum / actualPeriod;
  
  // Calculate Standard Deviation
  let varianceSum = 0;
  for (let i = 0; i < actualPeriod; i++) {
    const diff = data[lastIdx - i].close - middle;
    varianceSum += diff * diff;
  }
  const stdDev = Math.sqrt(varianceSum / actualPeriod);
  
  return {
    middle: parseFloat(middle.toFixed(2)),
    upper: parseFloat((middle + 2 * stdDev).toFixed(2)),
    lower: parseFloat((middle - 2 * stdDev).toFixed(2))
  };
}

// --- DEDICATED MASTER CONSOLE APP COMPONENT ---
function DashboardConsole() {
  const {
    selectedSymbol,
    selectedStock,
    stocks,
    watchlist,
    portfolioItems,
    totalPortfolioValue,
    totalPortfolioCost,
    totalPortfolioGain,
    totalPortfolioGainPercent,
    selectSymbol,
    updateStockMetrics,
    toggleWatchlist,
    addPortfolioItem,
    deletePortfolioItem,
    clearPortfolio,
    resetAllData,
    triggerToast,
    toast,
    executeRebalanceTrades,
  } = useStock();

  const {
    user,
    openAuthModal,
    logOut,
  } = useAuth();

  // --- LEDGER SORTING STATE ---
  const [ledgerSortBy, setLedgerSortBy] = useState<"value" | "date" | "gain">("value");

  // Force dark mode on mount to ensure user is always in dark mode as requested
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.remove("light");
      localStorage.removeItem("dashboard-theme");
    }
  }, []);

  // --- SORTED PORTFOLIO ITEMS FOR PERSISTENT LEDGER ---
  const sortedPortfolioItems = useMemo(() => {
    const items = [...portfolioItems];
    return items.sort((a, b) => {
      if (ledgerSortBy === "value") {
        const priceA = stocks[a.symbol]?.currentPrice || a.purchase_price;
        const valueA = a.shares * priceA;
        const priceB = stocks[b.symbol]?.currentPrice || b.purchase_price;
        const valueB = b.shares * priceB;
        return valueB - valueA;
      }
      if (ledgerSortBy === "date") {
        return b.purchase_date.localeCompare(a.purchase_date);
      }
      if (ledgerSortBy === "gain") {
        const priceA = stocks[a.symbol]?.currentPrice || a.purchase_price;
        const costA = a.shares * a.purchase_price;
        const valueA = a.shares * priceA;
        const gainPercentA = ((valueA - costA) / (costA || 1)) * 100;

        const priceB = stocks[b.symbol]?.currentPrice || b.purchase_price;
        const costB = b.shares * b.purchase_price;
        const valueB = b.shares * priceB;
        const gainPercentB = ((valueB - costB) / (costB || 1)) * 100;

        return gainPercentB - gainPercentA;
      }
      return 0;
    });
  }, [portfolioItems, ledgerSortBy, stocks]);

  // --- EXPORT PORTFOLIO TRANSACTION RECORD AS CSV ---
  const exportPortfolioToCSV = () => {
    if (portfolioItems.length === 0) {
      triggerToast("No portfolio items to export", "warning");
      return;
    }

    // CSV Headers matching existing portfolio tracking metrics
    const headers = [
      "Transaction ID",
      "Symbol",
      "Company Name",
      "Shares Purchased",
      "Purchase Price ($)",
      "Purchase Date",
      "Total Initial Cost ($)",
      "Current Unit Price ($)",
      "Current Position Value ($)",
      "Net Capital Gain ($)",
      "Gain Percentage (%)"
    ];

    // CSV Data mapped from live portfolio items matched with current market prices
    const rows = portfolioItems.map((item) => {
      const currentPrice = stocks[item.symbol]?.currentPrice || item.purchase_price;
      const totalCost = item.shares * item.purchase_price;
      const totalValue = item.shares * currentPrice;
      const itemGain = totalValue - totalCost;
      const itemGainPercent = (itemGain / (totalCost || 1)) * 100;

      return [
        item.id,
        item.symbol,
        `"${item.name.replace(/"/g, '""')}"`, // escape quotes for CSV safely
        item.shares,
        item.purchase_price.toFixed(2),
        item.purchase_date,
        totalCost.toFixed(2),
        currentPrice.toFixed(2),
        totalValue.toFixed(2),
        itemGain.toFixed(2),
        `${itemGainPercent.toFixed(2)}%`
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `portfolio_ledger_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast("Portfolio exported as CSV successfully", "success");
    } catch (err) {
      console.error("Failed to generate CSV export", err);
      triggerToast("Failed to export portfolio", "warning");
    }
  };

  // --- SCREENER LOCAL STATES ---
  const ALL_SECTORS = ["Technology", "Healthcare", "Financials", "Utilities", "Automotive"];
  const [screenerSearchText, setScreenerSearchText] = useState("");
  const [screenerSectors, setScreenerSectors] = useState<string[]>(ALL_SECTORS);
  const [screenerPeRange, setScreenerPeRange] = useState("All");
  const [screenerVolLimit, setScreenerVolLimit] = useState(4.0);
  const [screenerSortBy, setScreenerSortBy] = useState<"symbol" | "price" | "change" | "pe">("symbol");

  // --- TRANSACTION FORM LOCAL STATES ---
  const [tradeShares, setTradeShares] = useState("50");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeDate, setTradeDate] = useState("2026-06-23");
  const [quickAddModalStock, setQuickAddModalStock] = useState<StockData | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // --- NEWS FEED STATES ---
  const [newsFeed, setNewsFeed] = useState<any[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [showNewsPanel, setShowNewsPanel] = useState(true);
  const [newsRefreshTrigger, setNewsRefreshTrigger] = useState(0);
  const [newsFeedType, setNewsFeedType] = useState<"simulated" | "live">("live");
  const [expandedNewsId, setExpandedNewsId] = useState<string | null>(null);
  const [hubSentimentFilter, setHubSentimentFilter] = useState<"all" | "positive" | "negative" | "neutral">("all");
  const [hubSortOrder, setHubSortOrder] = useState<"recency" | "impact">("impact");

  // --- PORTFOLIO REBALANCING STATES ---
  const [rebalanceTargets, setRebalanceTargets] = useState<Record<string, number>>({});
  const [rebalanceCapitalInput, setRebalanceCapitalInput] = useState("10000");
  const [rebalanceNewSymbol, setRebalanceNewSymbol] = useState("");

  // --- SIMULATION WORKBENCH OVERRIDE FORM STATES ---
  const [simPrice, setSimPrice] = useState("");
  const [simPe, setSimPe] = useState("");
  const [simGross, setSimGross] = useState("");
  const [simNet, setSimNet] = useState("");
  const [simGrowth, setSimGrowth] = useState("");
  const [targetPrices, setTargetPrices] = useState<Record<string, number>>({});
  const [targetPriceInput, setTargetPriceInput] = useState("");

  // Load target prices and other client-side-only variables on mount to align hydration perfectly
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("stock_target_prices");
        if (saved) {
          setTargetPrices(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Failed to load target prices from localStorage", e);
      }
      try {
        const savedTargets = localStorage.getItem("dashboard_rebalance_targets");
        if (savedTargets) {
          setRebalanceTargets(JSON.parse(savedTargets));
        }
      } catch (e) {
        console.error("Failed to load rebalancing targets from localStorage", e);
      }
      setTradeDate(new Date().toISOString().split("T")[0]);
    }
  }, []);

  // --- CHART EXTRA CONTROLS ---
  const [selectedChartMetric, setSelectedChartMetric] = useState<"close" | "spread">("close");
  const [showSMA, setShowSMA] = useState(false);
  const [showEMA, setShowEMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [rsiPeriod, setRsiPeriod] = useState(3);
  const [showMACD, setShowMACD] = useState(false);
  const [macdFast, setMacdFast] = useState(2);
  const [macdSlow, setMacdSlow] = useState(5);
  const [macdSignalPeriod, setMacdSignalPeriod] = useState(3);
  const [heatmapViewMode, setHeatmapViewMode] = useState<"grid" | "scatter" | "treemap" | "correlation">("grid");

  // Update simulator state when selected stock switches
  useEffect(() => {
    if (selectedStock) {
      setSimPrice(selectedStock.currentPrice.toString());
      setSimPe(selectedStock.peRatio.toString());
      setSimGross(selectedStock.grossMargin.toString());
      setSimNet(selectedStock.netMargin.toString());
      setSimGrowth(selectedStock.revenueGrowth.toString());
      setTradePrice(selectedStock.currentPrice.toString());
      const target = targetPrices[selectedStock.symbol];
      setTargetPriceInput(target ? target.toString() : "");
    }
  }, [
    selectedStock,
    targetPrices
  ]);

  // Fetch news feed whenever selected stock symbol changes
  useEffect(() => {
    if (!selectedStock) return;
    
    let isMounted = true;
    const fetchNews = async () => {
      setIsNewsLoading(true);
      setNewsError(null);
      if (isMounted) {
        setExpandedNewsId(null); // collapse expanded items on refresh
      }
      try {
        const endpoint = newsFeedType === "live" ? "/api/news/scrape" : "/api/news";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: selectedStock.symbol,
            name: selectedStock.name,
            price: selectedStock.currentPrice,
            changePercent: selectedStock.changePercent
          })
        });
        if (!response.ok) {
          throw new Error("Failed to fetch news feed");
        }
        const data = await response.json();
        if (isMounted) {
          setNewsFeed(data.news || []);
        }
      } catch (err: any) {
        console.error(err);
        if (isMounted) {
          setNewsError(err.message || "Failed to load news headlines");
        }
      } finally {
        if (isMounted) {
          setIsNewsLoading(false);
        }
      }
    };

    fetchNews();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStock?.symbol, newsRefreshTrigger, newsFeedType]);

  // --- AI ANALYST HUB METRICS AND FILTERS ---
  const hubStats = useMemo(() => {
    if (!newsFeed || newsFeed.length === 0) {
      return {
        consensus: "NEUTRAL / INSUFFICIENT DATA",
        consensusColor: "text-zinc-400 bg-zinc-950 border-zinc-900",
        avgImpact: 0,
        posCount: 0,
        negCount: 0,
        neuCount: 0,
        totalCount: 0,
        consensusPercent: 0,
      };
    }

    let totalScore = 0;
    let pos = 0;
    let neg = 0;
    let neu = 0;

    newsFeed.forEach((item) => {
      totalScore += item.impactScore || 50;
      if (item.sentiment === "positive") pos++;
      else if (item.sentiment === "negative") neg++;
      else neu++;
    });

    const total = newsFeed.length;
    const avgImpact = Math.round(totalScore / total);
    
    let consensus = "STABILIZED CONSOLIDATING / NEUTRAL";
    let consensusColor = "text-zinc-350 bg-zinc-950 border-zinc-900";
    let consensusPercent = 50;

    if (pos > neg && pos >= neu) {
      const intensity = pos / total;
      consensusPercent = Math.round(50 + intensity * 50);
      if (intensity > 0.6) {
        consensus = "STRONG ACCUMULATING / BULLISH";
        consensusColor = "text-emerald-400 bg-emerald-950/40 border-emerald-900/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]";
      } else {
        consensus = "TACTICAL ACCUMULATING / MODERATELY BULLISH";
        consensusColor = "text-emerald-350 bg-emerald-950/20 border-emerald-900/20";
      }
    } else if (neg > pos && neg >= neu) {
      const intensity = neg / total;
      consensusPercent = Math.round(50 + intensity * 50);
      if (intensity > 0.6) {
        consensus = "LIQUIDATION FORECAST / STRONGLY BEARISH";
        consensusColor = "text-rose-400 bg-rose-950/40 border-rose-900/30 shadow-[0_0_12px_rgba(239,68,68,0.08)]";
      } else {
        consensus = "MINOR PULLBACK / CAUTIOUS BEARISH";
        consensusColor = "text-rose-350 bg-rose-950/20 border-rose-900/20";
      }
    }

    return {
      consensus,
      consensusColor,
      avgImpact,
      posCount: pos,
      negCount: neg,
      neuCount: neu,
      totalCount: total,
      consensusPercent,
    };
  }, [newsFeed]);

  const filteredHubNews = useMemo(() => {
    let result = [...newsFeed];

    if (hubSentimentFilter !== "all") {
      result = result.filter(item => item.sentiment === hubSentimentFilter);
    }

    if (hubSortOrder === "impact") {
      result.sort((a, b) => (b.impactScore || 0) - (a.impactScore || 0));
    }

    return result;
  }, [newsFeed, hubSentimentFilter, hubSortOrder]);

  // --- PORTFOLIO REBALANCING HELPER METHODS & CALCULATIONS ---
  const saveRebalanceTargets = (newTargets: Record<string, number>) => {
    setRebalanceTargets(newTargets);
    localStorage.setItem("dashboard_rebalance_targets", JSON.stringify(newTargets));
  };

  const holdingsBySymbol = useMemo(() => {
    const map: Record<string, { shares: number; value: number; cost: number }> = {};
    portfolioItems.forEach(item => {
      const price = stocks[item.symbol]?.currentPrice || item.purchase_price;
      if (!map[item.symbol]) {
        map[item.symbol] = { shares: 0, value: 0, cost: 0 };
      }
      map[item.symbol].shares += item.shares;
      map[item.symbol].value += item.shares * price;
      map[item.symbol].cost += item.shares * item.purchase_price;
    });
    return map;
  }, [portfolioItems, stocks]);

  const rebalanceSymbols = useMemo(() => {
    const symbols = new Set<string>();
    Object.keys(holdingsBySymbol).forEach(sym => symbols.add(sym));
    Object.keys(rebalanceTargets).forEach(sym => {
      if (rebalanceTargets[sym] > 0) {
        symbols.add(sym);
      }
    });
    return Array.from(symbols);
  }, [holdingsBySymbol, rebalanceTargets]);

  const handleEqualWeight = () => {
    const symbols = rebalanceSymbols.length > 0 ? rebalanceSymbols : Object.keys(stocks).slice(0, 5);
    if (symbols.length === 0) return;
    const equalPct = parseFloat((100 / symbols.length).toFixed(2));
    const newTargets: Record<string, number> = {};
    symbols.forEach(sym => {
      newTargets[sym] = equalPct;
    });
    const sum = Object.values(newTargets).reduce((a, b) => a + b, 0);
    if (sum !== 100 && symbols.length > 0) {
      const diff = parseFloat((100 - sum).toFixed(2));
      const lastSym = symbols[symbols.length - 1];
      newTargets[lastSym] = parseFloat((newTargets[lastSym] + diff).toFixed(2));
    }
    saveRebalanceTargets(newTargets);
    triggerToast("Distributed weights equally across active assets!", "info");
  };

  const handleNormalizeWeights = () => {
    const totalCurrentWeight = Object.values(rebalanceTargets).reduce((a, b) => a + b, 0);
    if (totalCurrentWeight === 0) {
      handleEqualWeight();
      return;
    }
    const newTargets: Record<string, number> = {};
    const symbols = Object.keys(rebalanceTargets);
    symbols.forEach(sym => {
      const currentVal = rebalanceTargets[sym] || 0;
      newTargets[sym] = parseFloat(((currentVal / totalCurrentWeight) * 100).toFixed(2));
    });
    const sum = Object.values(newTargets).reduce((a, b) => a + b, 0);
    if (sum !== 100 && symbols.length > 0) {
      const diff = parseFloat((100 - sum).toFixed(2));
      const lastSym = symbols[symbols.length - 1];
      newTargets[lastSym] = parseFloat((newTargets[lastSym] + diff).toFixed(2));
    }
    saveRebalanceTargets(newTargets);
    triggerToast("Normalized target weights proportionally to 100%!", "success");
  };

  const handleUpdateTargetWeight = (symbol: string, val: number) => {
    const cleanedVal = Math.max(0, Math.min(100, parseFloat(val.toString()) || 0));
    saveRebalanceTargets({
      ...rebalanceTargets,
      [symbol]: cleanedVal
    });
  };

  const handleRemoveSymbolTarget = (symbol: string) => {
    const next = { ...rebalanceTargets };
    delete next[symbol];
    saveRebalanceTargets(next);
    triggerToast(`Removed ${symbol} from target allocation`, "info");
  };

  const handleAddSymbolTarget = (symbol: string) => {
    const cleanSym = symbol.toUpperCase().trim();
    if (!stocks[cleanSym]) {
      triggerToast(`Symbol ${cleanSym} is not supported in this workstation`, "warning");
      return;
    }
    saveRebalanceTargets({
      ...rebalanceTargets,
      [cleanSym]: rebalanceTargets[cleanSym] || 0
    });
    setRebalanceNewSymbol("");
    triggerToast(`Added ${cleanSym} to target list`, "success");
  };

  // Rebalancing Calculations Engine
  const rebalanceCalculations = useMemo(() => {
    const activeCapital = totalPortfolioValue > 0 ? totalPortfolioValue : Number(rebalanceCapitalInput) || 10000;
    
    return rebalanceSymbols.map(sym => {
      const currentShares = holdingsBySymbol[sym]?.shares || 0;
      const price = stocks[sym]?.currentPrice || 0;
      const currentValue = currentShares * price;
      const currentWeight = totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0;
      
      const targetWeight = rebalanceTargets[sym] || 0;
      const targetValue = activeCapital * (targetWeight / 100);
      const valueDiff = targetValue - currentValue;
      const sharesDiff = price > 0 ? valueDiff / price : 0;
      
      return {
        symbol: sym,
        price,
        currentShares,
        currentValue,
        currentWeight,
        targetWeight,
        targetValue,
        valueDiff,
        sharesDiff,
      };
    });
  }, [rebalanceSymbols, holdingsBySymbol, stocks, rebalanceTargets, totalPortfolioValue, rebalanceCapitalInput]);

  const targetWeightsSum = useMemo(() => {
    return Object.values(rebalanceTargets).reduce((a, b) => a + b, 0);
  }, [rebalanceTargets]);

  const hasRebalanceTrades = useMemo(() => {
    return rebalanceCalculations.some(calc => Math.abs(calc.sharesDiff) >= 0.01);
  }, [rebalanceCalculations]);

  const availableAddSymbols = useMemo(() => {
    return Object.keys(stocks).filter(sym => !rebalanceSymbols.includes(sym));
  }, [stocks, rebalanceSymbols]);

  // --- FILTERED SCREENING LOGIC ---
  const filteredStocks = useMemo(() => {
    return Object.values(stocks).filter((stock) => {
      // 1. Text Search Filter (Symbol, Corporate Name or Sector)
      const matchesSearch =
        stock.symbol.toLowerCase().includes(screenerSearchText.toLowerCase()) ||
        stock.name.toLowerCase().includes(screenerSearchText.toLowerCase()) ||
        stock.sector.toLowerCase().includes(screenerSearchText.toLowerCase());

      // 2. Sector Selection Filter
      const matchesSector = screenerSectors.includes(stock.sector);

      // 3. P/E Multiple Segment Filter
      let matchesPe = true;
      if (screenerPeRange === "Undervalued") {
        matchesPe = stock.peRatio < 20;
      } else if (screenerPeRange === "CoreValue") {
        matchesPe = stock.peRatio >= 20 && stock.peRatio <= 40;
      } else if (screenerPeRange === "Premium") {
        matchesPe = stock.peRatio > 40;
      }

      // 4. Volatility Threshold boundary
      const matchesVol = stock.volatility <= screenerVolLimit;

      return matchesSearch && matchesSector && matchesPe && matchesVol;
    }).sort((a, b) => {
      if (screenerSortBy === "price") return b.currentPrice - a.currentPrice;
      if (screenerSortBy === "change") return b.changePercent - a.changePercent;
      if (screenerSortBy === "pe") return b.peRatio - a.peRatio;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [stocks, screenerSearchText, screenerSectors, screenerPeRange, screenerVolLimit, screenerSortBy]);

  // --- UNIQUE DYNAMIC METRICS FOR SELECTED STOCK ---
  const activeSma = useMemo(() => {
    return calculateSMA(selectedStock.historical, 3);
  }, [selectedStock.historical]);

  const activeEma = useMemo(() => {
    return calculateEMA(selectedStock.historical, 3);
  }, [selectedStock.historical]);

  const activeRsi = useMemo(() => {
    return calculateRSI(selectedStock.historical, rsiPeriod);
  }, [selectedStock.historical, rsiPeriod]);

  const activeMacd = useMemo(() => {
    return calculateMACD(selectedStock.historical, macdFast, macdSlow, macdSignalPeriod);
  }, [selectedStock.historical, macdFast, macdSlow, macdSignalPeriod]);

  // Merge technical indicators into chart array
  const formattedChartData = useMemo(() => {
    return selectedStock.historical.map((bar, index) => ({
      ...bar,
      smaValue: activeSma[index],
      emaValue: activeEma[index],
      rsiValue: activeRsi[index],
      macdLine: activeMacd.macdLine[index],
      macdSignal: activeMacd.signalLine[index],
      macdHist: activeMacd.histogram[index],
      highLowSpread: parseFloat((bar.high - bar.low).toFixed(2))
    }));
  }, [selectedStock.historical, activeSma, activeEma, activeRsi, activeMacd]);
  
  const technicalSuggestions = useMemo(() => {
    const historical = selectedStock.historical;
    if (!historical || historical.length === 0) {
      return {
        rsi: { value: 50, signal: "Neutral", desc: "No historical data to calculate RSI.", score: 0 },
        macd: { diff: 0, signal: "Neutral", desc: "No historical data to calculate MACD.", score: 0 },
        bb: { price: 0, middle: 0, upper: 0, lower: 0, signal: "Neutral", desc: "No historical data to calculate Bollinger Bands.", score: 0 },
        score: 0,
        rating: "NEUTRAL",
        recommendation: "Hold / Wait for Crossover",
        ratingColor: "text-zinc-400 bg-zinc-950/60 border-zinc-900",
        ratingBanner: "bg-zinc-950/20 text-zinc-400 border-zinc-900"
      };
    }

    const latestPrice = selectedStock.currentPrice;

    // 1. Calculate RSI Suggestions
    const rsiList = calculateRSI(historical, 5); // Use 5-period for responsiveness on short datasets
    const rsiVal = rsiList.length > 0 ? rsiList[rsiList.length - 1] : 50;
    let rsiSignal = "Neutral";
    let rsiDesc = "Consolidating. RSI is in standard neutral territory.";
    let rsiScore = 0; // -100 for bearish, +100 for bullish

    if (rsiVal >= 70) {
      rsiSignal = "Overbought (Bearish)";
      rsiDesc = `Technical overextension detected (RSI: ${rsiVal}). Downward mean reversion or consolidation is highly probable.`;
      rsiScore = -100;
    } else if (rsiVal <= 30) {
      rsiSignal = "Oversold (Bullish)";
      rsiDesc = `Sellers exhausted (RSI: ${rsiVal}). High statistical probability of local support bounce.`;
      rsiScore = 100;
    } else {
      if (rsiVal > 55) {
        rsiSignal = "Moderate Bullish Bias";
        rsiDesc = `Moderate upward strength (RSI: ${rsiVal}). Momentum supports immediate minor bids.`;
        rsiScore = 30;
      } else if (rsiVal < 45) {
        rsiSignal = "Moderate Bearish Bias";
        rsiDesc = `Moderate downward pressure (RSI: ${rsiVal}). Ticker showing minor technical decay.`;
        rsiScore = -30;
      }
    }

    // 2. Calculate MACD Suggestions
    const macdResult = calculateMACD(historical, 2, 5, 3); // responsive parameters
    const macdLine = macdResult.macdLine;
    const signalLine = macdResult.signalLine;
    const lIdx = macdLine.length - 1;
    const mVal = lIdx >= 0 ? macdLine[lIdx] : 0;
    const sVal = lIdx >= 0 && signalLine[lIdx] !== undefined ? signalLine[lIdx] : 0;
    const macdDiff = mVal - sVal;
    
    let macdSignal = "Neutral";
    let macdDesc = "MACD line and signal are converged. Trend momentum is currently flat.";
    let macdScore = 0;

    if (macdDiff > 0.05) {
      macdSignal = "Bullish Crossover";
      macdDesc = "MACD line crossed above the signal line. Upward trend acceleration is active.";
      macdScore = 80;
    } else if (macdDiff < -0.05) {
      macdSignal = "Bearish Crossover";
      macdDesc = "MACD line crossed below the signal line. Distribution is accelerating, short-term caution advised.";
      macdScore = -80;
    }

    // 3. Calculate Bollinger Bands
    const bb = calculateBollingerBands(historical, 5);
    let bbSignal = "Neutral";
    let bbDesc = `Trading within standard deviation bands (Middle: $${bb.middle}).`;
    let bbScore = 0;

    if (latestPrice >= bb.upper - (bb.upper - bb.middle) * 0.1) {
      bbSignal = "Resistance Contact (Bearish)";
      bbDesc = `Asset is hugging the upper Bollinger Band ($${bb.upper}). Overextended prices indicate potential profit-taking.`;
      bbScore = -90;
    } else if (latestPrice <= bb.lower + (bb.middle - bb.lower) * 0.1) {
      bbSignal = "Support Contact (Bullish)";
      bbDesc = `Asset is contacting the lower Bollinger Band ($${bb.lower}). Accumulation zone indicates high probability bounce.`;
      bbScore = 90;
    } else {
      if (latestPrice > bb.middle) {
        bbSignal = "Bullish Channel";
        bbDesc = `Asset is positive, maintaining trading support above the middle band line ($${bb.middle}).`;
        bbScore = 40;
      } else if (latestPrice < bb.middle) {
        bbSignal = "Bearish Channel";
        bbDesc = `Asset is weak, trading below the middle band baseline ($${bb.middle}).`;
        bbScore = -40;
      }
    }

    // Overall Technical Consensus Calculation
    const totalScore = rsiScore + macdScore + bbScore;
    let rating = "NEUTRAL";
    let recommendation = "Hold / Wait for Crossover";
    let ratingColor = "text-zinc-400 bg-zinc-950/60 border-zinc-900";
    let ratingBanner = "bg-zinc-950/20 text-zinc-400 border-zinc-900";

    if (totalScore >= 120) {
      rating = "STRONG BUY";
      recommendation = "Optimal long accumulation. Indicators reflect a strong bullish confluence with support holding.";
      ratingColor = "text-emerald-400 bg-emerald-950/30 border-emerald-900/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] font-extrabold";
      ratingBanner = "bg-emerald-950/10 border-emerald-900/20 text-emerald-400";
    } else if (totalScore >= 40) {
      rating = "BUY";
      recommendation = "Upward bias is supported by moving averages. Look for tactical entry on minor intraday pullbacks.";
      ratingColor = "text-teal-400 bg-teal-950/30 border-teal-900/30 font-extrabold";
      ratingBanner = "bg-teal-950/10 border-teal-900/20 text-teal-400";
    } else if (totalScore <= -120) {
      rating = "STRONG SELL";
      recommendation = "Highly overextended or undergoing major technical distribution. Risk-off and lock profits.";
      ratingColor = "text-rose-400 bg-rose-950/30 border-rose-900/30 shadow-[0_0_15px_rgba(239,68,68,0.1)] font-extrabold";
      ratingBanner = "bg-rose-950/10 border-rose-900/20 text-rose-450";
    } else if (totalScore <= -40) {
      rating = "SELL";
      recommendation = "Technical breakdown. Sellers controlling the channel; expect continued local resistance.";
      ratingColor = "text-orange-400 bg-orange-950/30 border-orange-900/30 font-extrabold";
      ratingBanner = "bg-orange-950/10 border-orange-900/20 text-orange-400";
    }

    return {
      rsi: { value: rsiVal, signal: rsiSignal, desc: rsiDesc, score: rsiScore },
      macd: { diff: parseFloat(macdDiff.toFixed(3)), signal: macdSignal, desc: macdDesc, score: macdScore },
      bb: { price: latestPrice, middle: bb.middle, upper: bb.upper, lower: bb.lower, signal: bbSignal, desc: bbDesc, score: bbScore },
      score: totalScore,
      rating,
      recommendation,
      ratingColor,
      ratingBanner
    };
  }, [selectedStock]);
  
  // --- PORTFOLIO DYNAMIC HISTORICAL VALUATION OVER TIME ---
  const portfolioHistoryData = useMemo(() => {
    if (portfolioItems.length === 0) return [];

    const datesSet = new Set<string>();
    portfolioItems.forEach((item) => {
      const stock = stocks[item.symbol];
      if (stock && stock.historical) {
        stock.historical.forEach((bar) => {
          datesSet.add(bar.date);
        });
      }
    });

    const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b));

    return sortedDates.map((date) => {
      let totalValue = 0;
      portfolioItems.forEach((item) => {
        const stock = stocks[item.symbol];
        if (stock && stock.historical) {
          const barForDate = stock.historical.find((bar) => bar.date === date);
          if (barForDate) {
            totalValue += item.shares * barForDate.close;
          } else {
            totalValue += item.shares * (stock.currentPrice || item.purchase_price);
          }
        } else {
          totalValue += item.shares * item.purchase_price;
        }
      });

      return {
        date,
        value: parseFloat(totalValue.toFixed(2))
      };
    });
  }, [portfolioItems, stocks]);

  // --- SAVE SCREENER ASSET QUICK SELECTION ADD TO PORTFOLIO ---
  const initQuickAdd = (stock: StockData) => {
    setQuickAddModalStock(stock);
    setTradePrice(stock.currentPrice.toString());
    setTradeShares("100");
    setTradeDate(new Date().toISOString().split("T")[0]);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddModalStock) return;
    
    const sharesNum = parseInt(tradeShares, 10);
    const priceNum = parseFloat(tradePrice);

    if (isNaN(sharesNum) || sharesNum <= 0) {
      triggerToast("Shares amount must be a positive integer.", "warning");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      triggerToast("Cost Per Share must be a positive number.", "warning");
      return;
    }

    addPortfolioItem(quickAddModalStock.symbol, sharesNum, priceNum, tradeDate);
    setQuickAddModalStock(null);
  };

  // --- SIMULATION VALUE APPLY ---
  const applySimOverride = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPrice = parseFloat(simPrice);
    const updatedPe = parseFloat(simPe);
    const updatedGross = parseFloat(simGross);
    const updatedNet = parseFloat(simNet);
    const updatedGrowth = parseFloat(simGrowth);
    const updatedTarget = targetPriceInput !== "" ? parseFloat(targetPriceInput) : NaN;

    if (
      isNaN(updatedPrice) || updatedPrice <= 0 ||
      isNaN(updatedPe) || updatedPe < 0 ||
      isNaN(updatedGross) || updatedGross < 0 ||
      isNaN(updatedNet) ||
      isNaN(updatedGrowth)
    ) {
      triggerToast("Please check that all overrides are valid numerical quantities.", "warning");
      return;
    }

    if (!isNaN(updatedTarget) && updatedTarget <= 0) {
      triggerToast("Target price must be empty or a positive number.", "warning");
      return;
    }

    const newTargetPrices = { ...targetPrices };
    if (!isNaN(updatedTarget)) {
      newTargetPrices[selectedStock.symbol] = updatedTarget;
      setTargetPrices(newTargetPrices);
      if (typeof window !== "undefined") {
        localStorage.setItem("stock_target_prices", JSON.stringify(newTargetPrices));
      }

      if (updatedPrice >= updatedTarget) {
        triggerToast(`🎯 Target Price Met! ${selectedStock.symbol} at $${updatedPrice.toFixed(2)} meets/exceeds your target of $${updatedTarget.toFixed(2)}!`, "success");
      } else {
        triggerToast(`Target Price set to $${updatedTarget.toFixed(2)} for ${selectedStock.symbol}`, "info");
      }
    } else {
      delete newTargetPrices[selectedStock.symbol];
      setTargetPrices(newTargetPrices);
      if (typeof window !== "undefined") {
        localStorage.setItem("stock_target_prices", JSON.stringify(newTargetPrices));
      }
      triggerToast(`Cleared Target Price for ${selectedStock.symbol}`, "info");
    }

    updateStockMetrics(selectedStock.symbol, {
      currentPrice: updatedPrice,
      peRatio: updatedPe,
      grossMargin: updatedGross,
      netMargin: updatedNet,
      revenueGrowth: updatedGrowth
    });
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#040406] text-slate-100 relative selection:bg-blue-600/30 selection:text-white pb-12">
      
      {/* GLOW DECORATIVE BLOCKS */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* --- DASHBOARD HEADER PANEL --- */}
      <header className="border-b border-zinc-800 bg-[#08080c]/90 sticky top-0 z-40 backdrop-blur" id="page-header">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/10">
              <div className="h-full w-full bg-[#08080c] rounded-[10px] flex items-center justify-center">
                <Layers className="h-5 w-5 text-blue-400 rotate-12" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent font-sans">
                  STOCK PORTFOLIO INTELLIGENCE
                </h1>
                <span className="text-[9px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase">
                  v3-Context
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">
                PERSISTENT SECURE LEDGER & DYNAMIC MULTI-VARIABLE SCREENER SYSTEM
              </p>
            </div>
          </div>

          {/* PORTFOLIO SUMMARY WIDGET */}
          <div className="flex flex-wrap items-center gap-4 bg-zinc-950/60 border border-zinc-850 px-4 py-2.5 rounded-xl">
            <div className="flex items-center p-1 rounded-lg bg-blue-500/5 border border-blue-500/10" id="port-val-badge">
              <Briefcase className="h-4 w-4 text-blue-400 mr-2" />
              <div className="text-left">
                <span className="text-[8px] text-zinc-500 block font-mono font-bold">TOTAL PORTFOLIO HOLDINGS</span>
                <span className="text-sm font-black font-mono text-slate-100">
                  <AnimatedNumber value={totalPortfolioValue} />
                </span>
              </div>
            </div>

            <div className="text-left min-w-[110px]" id="port-yield">
              <span className="text-[8px] text-zinc-500 block font-mono font-bold">ACTIVE VALUE GAIN</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-black font-mono ${totalPortfolioGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  <AnimatedNumber value={totalPortfolioGain} showSign={true} />
                </span>
                <span className={`text-[10px] font-mono px-1.5 rounded-full ${totalPortfolioGain >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {totalPortfolioGain >= 0 ? "▲" : "▼"} {totalPortfolioGainPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={resetAllData}
                title="Clears overrides, watchlists, and persistent trades back to default context."
                className="p-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-450 hover:text-rose-450 border border-zinc-800 hover:border-rose-950/40 rounded-lg transition-all text-xs font-mono font-bold flex items-center gap-1 cursor-pointer h-9"
              >
                <RefreshCw className="h-3 w-3" />
                Reset Sandbox
              </button>

              {!user ? (
                <button
                  onClick={() => openAuthModal("login")}
                  className="px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-500/15 rounded-lg transition-all text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10 h-9"
                  id="header-signin-btn"
                >
                  <User className="h-3.5 w-3.5" />
                  Sign In
                </button>
              ) : (
                <div className="flex items-center gap-2 border-l border-zinc-800 pl-2.5" id="header-profile-block">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-[7px] text-zinc-500 font-mono font-bold leading-none">HORIZON</span>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 leading-normal">{user.investmentHorizon}</span>
                  </div>

                  <button
                    onClick={() => openAuthModal("profile")}
                    title="Manage Profile Preferences"
                    className="flex items-center gap-1.5 p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg transition-all cursor-pointer h-9 text-left"
                    id="header-profile-btn"
                  >
                    <div className="h-5 w-5 rounded overflow-hidden relative border border-zinc-800 bg-zinc-950 shrink-0">
                      <Image
                        src={user.avatarUrl}
                        alt={user.displayName}
                        fill
                        sizes="20px"
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="hidden md:flex flex-col">
                      <span className="text-[10px] font-sans font-bold leading-none text-zinc-200">{user.displayName}</span>
                      <span className="text-[8px] font-mono leading-none text-zinc-500">@{user.username}</span>
                    </div>
                  </button>

                  <button
                    onClick={logOut}
                    title="De-authorize and Log Out"
                    className="p-2 bg-zinc-950 hover:bg-zinc-900 text-zinc-500 hover:text-rose-400 border border-zinc-900 rounded-lg transition-all cursor-pointer h-9 w-9 flex items-center justify-center"
                    id="header-logout-btn"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </header>

      {/* --- REAL-TIME HORIZONTAL TICKER BANNER --- */}
      <div className="bg-zinc-950 border-b border-zinc-900 overflow-x-auto py-1.5 scrollbar-thin px-4 select-none">
        <div className="max-w-[1600px] mx-auto flex items-center gap-6 whitespace-nowrap text-xs text-zinc-400 font-mono">
          <span className="text-zinc-500 font-extrabold flex items-center gap-1 select-none">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> COMPONENT INDEX:
          </span>
          {Object.values(stocks).map((st) => {
            const isSel = selectedSymbol === st.symbol;
            return (
              <div
                key={st.symbol}
                onClick={() => selectSymbol(st.symbol)}
                className={`flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded transition-all ${
                  isSel ? "bg-blue-600/10 border border-blue-500/30 text-white font-bold" : "hover:text-white"
                }`}
              >
                <span>{st.symbol}</span>
                <span className="text-zinc-300 font-bold">${st.currentPrice.toFixed(2)}</span>
                <span className={st.changePercent >= 0 ? "text-emerald-450 text-[11px]" : "text-rose-455 text-[11px]"}>
                  {st.changePercent >= 0 ? "+" : ""}{st.changePercent}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- ROLLING NEWS / AI SUMMARY LINE --- */}
      <div className="bg-zinc-950 border-b border-zinc-900/70 overflow-hidden py-1 px-4 relative flex items-center select-none h-8 font-mono">
        <div className="flex items-center gap-1.5 bg-zinc-950 pr-4 border-r border-zinc-900 z-10 shrink-0 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
          <span className="text-[9px] font-black tracking-widest text-[#f1f5f9] uppercase flex items-center gap-1.5 animate-pulse">
            <Sparkles className="h-3 w-3 text-blue-400" />
            LIVE AI ANALYST TRANSMISSION:
          </span>
        </div>
        
        <div className="relative flex-1 overflow-hidden h-full flex items-center">
          {isNewsLoading ? (
            <span className="text-[10px] text-zinc-500 animate-pulse pl-4 flex items-center gap-1.5">
              <span className="h-1 w-1 bg-zinc-500 rounded-full animate-bounce" />
              Scraping & synthesizing live financial headlines...
            </span>
          ) : newsError ? (
            <span className="text-[10px] text-rose-455 pl-4 flex items-center gap-1.5">
              ⚠️ news services currently offline. utilizing fallback channels.
            </span>
          ) : newsFeed.length === 0 ? (
            <span className="text-[10px] text-zinc-500 pl-4">
              No recent intelligence feeds for {selectedStock?.symbol}. Open News Feed to trigger manual fetch.
            </span>
          ) : (
            <div className="w-full relative overflow-hidden flex items-center">
              <div className="animate-marquee whitespace-nowrap flex items-center gap-8 pl-4">
                {/* Double content to create seamless infinite scroll */}
                {[...newsFeed, ...newsFeed].map((item, idx) => {
                  const sentimentSymbol = item.sentiment === "positive" ? "▲" : item.sentiment === "negative" ? "▼" : "◆";
                  const sentimentColor = item.sentiment === "positive" ? "text-emerald-400" : item.sentiment === "negative" ? "text-rose-400" : "text-zinc-400";
                  return (
                    <button
                      key={`${item.id}-marquee-${idx}`}
                      type="button"
                      onClick={() => {
                        setExpandedNewsId(item.id);
                        // Scroll the AI Analyst Hub into view!
                        const element = document.getElementById("ai-analyst-hub-card");
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className="flex items-center gap-2 hover:text-blue-400 cursor-pointer text-left focus:outline-none shrink-0 transition-colors"
                    >
                      <span className={`text-[9px] font-black ${sentimentColor} flex items-center gap-0.5`}>
                        {sentimentSymbol} {item.source}
                      </span>
                      <span className="text-[10px] text-zinc-300 font-sans font-medium">
                        {item.title}
                      </span>
                      <span className="text-[8px] bg-zinc-900 border border-zinc-800 text-zinc-500 px-1 py-0.2 rounded font-mono">
                        Impact: {item.impactScore}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- TOAST SYSTEM EMITTER --- */}
      {toast?.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`shadow-2xl border flex items-center gap-3 px-4 py-3 rounded-xl max-w-sm ${
            toast.type === "success" ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-200" :
            toast.type === "warning" ? "bg-amber-950/95 border-amber-550/30 text-amber-200" :
            "bg-blue-950/95 border-blue-500/30 text-blue-200"
          }`}>
            <Info className="h-4 w-4 shrink-0" />
            <div className="text-xs font-semibold">{toast.message}</div>
          </div>
        </div>
      )}

      {/* --- PRIMARY TASK WORKSPACE MATRIX LAYOUT --- */}
      <main className="max-w-[1600px] mx-auto w-full px-4 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: MULTI-VARIABLE SCREENER & ASSET SELECTOR     */}
        {/* ========================================================= */}
        <section className="col-span-1 lg:col-span-3 space-y-6 flex flex-col">
          
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-4 shadow-xl" id="screener-panel">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-bold tracking-widest text-[#f8fafc] uppercase flex items-center gap-2 font-mono">
                  <SlidersHorizontal className="h-4 w-4 text-blue-400" />
                  Equity Screener
                </h2>
                <p className="text-[10px] text-zinc-500 font-sans">Filter assets based on sector and financial ratios</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-850 rounded text-zinc-400 font-bold">
                {filteredStocks.length} Results
              </span>
            </div>

            {/* SELECTION SEARCH FILTER */}
            <div className="relative mb-3 font-sans">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search symbol, name, or sector..."
                value={screenerSearchText}
                onChange={(e) => setScreenerSearchText(e.target.value)}
                className="w-full bg-[#050508] border border-zinc-800 text-xs rounded-xl px-9 py-2.5 text-white placeholder-zinc-500 outline-none focus:border-blue-500 transition-colors"
              />
              {screenerSearchText && (
                <button
                  onClick={() => setScreenerSearchText("")}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* USER HORIZON PROFILE-ALIGNED RECOMMENDATIONS BANNER */}
            {user && (
              <div className="mb-3.5 p-3 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-xl flex items-start gap-2.5 font-sans" id="horizon-recommendation-bar">
                <Compass className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-mono font-bold text-indigo-300 tracking-wider flex items-center gap-1">
                    Profile Aligned: {user.investmentHorizon} Focus
                  </span>
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    {user.investmentHorizon === "Short-Term" && (
                      "Your strategy highlights highly volatile, high-volume tickers (like TSLA, NVDA) optimized for momentum trading and intraday spread opportunities."
                    )}
                    {user.investmentHorizon === "Medium-Term" && (
                      "Your strategy targets solid growth-oriented entities (like AAPL, MSFT, AMZN) with stable earnings, medium valuations, and robust trailing technical trends."
                    )}
                    {user.investmentHorizon === "Long-Term" && (
                      "Your strategy emphasizes low-beta defensive value assets, key index representations, and secure dividend yield profiles suitable for capital preservation."
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[8px] font-mono font-bold text-indigo-500 bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-900/30">
                      Recommended Focus: {
                        user.investmentHorizon === "Short-Term" ? "High Volatility / Momentum" :
                        user.investmentHorizon === "Medium-Term" ? "Core Tech / Balanced Growth" :
                        "Defensive Value / Low Beta"
                      }
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREENER FILTER CONTROLS */}
            <div className="space-y-3 pt-3 border-t border-zinc-900">
              
              {/* Sector Filters - Multiselect Checkbox List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-450 block font-bold">SECTOR DIVISION</label>
                </div>
                <div className="grid grid-cols-1 gap-1.5 font-mono text-[11px] bg-[#050508] border border-zinc-850 rounded-lg p-2.5">
                  {/* Select/Deselect All Checkbox */}
                  {(() => {
                    const allSelected = screenerSectors.length === ALL_SECTORS.length;
                    const noneSelected = screenerSectors.length === 0;
                    const isIndeterminate = !allSelected && !noneSelected;
                    return (
                      <label
                        className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-white transition-colors group select-none pb-1.5 mb-1.5 border-b border-zinc-900"
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => {
                              if (allSelected) {
                                setScreenerSectors([]);
                              } else {
                                setScreenerSectors(ALL_SECTORS);
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${
                            allSelected || isIndeterminate
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "border-zinc-700 bg-zinc-950 group-hover:border-zinc-500"
                          }`}>
                            {allSelected && (
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                              </svg>
                            )}
                            {isIndeterminate && (
                              <div className="w-1.5 h-0.5 bg-white rounded-sm" />
                            )}
                          </div>
                        </div>
                        <span className="leading-none font-bold text-zinc-300">
                          Select/Deselect All
                        </span>
                      </label>
                    );
                  })()}

                  {ALL_SECTORS.map((sec) => {
                    const isChecked = screenerSectors.includes(sec);
                    return (
                      <label
                        key={sec}
                        className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:text-white transition-colors group select-none py-0.5"
                      >
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setScreenerSectors(screenerSectors.filter((s) => s !== sec));
                              } else {
                                setScreenerSectors([...screenerSectors, sec]);
                              }
                            }}
                            className="sr-only"
                          />
                          <div className={`w-3.5 h-3.5 rounded border transition-all flex items-center justify-center ${
                            isChecked
                              ? "bg-blue-600 border-blue-500 text-white"
                              : "border-zinc-700 bg-zinc-950 group-hover:border-zinc-500"
                          }`}>
                            {isChecked && (
                              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                                <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="leading-none">
                          {sec === "Technology" ? "Tech" : sec === "Healthcare" ? "Health" : sec === "Financials" ? "Financ" : sec}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Valuation & PE ratios Filter */}
              <div>
                <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-455 block font-bold mb-1.5">P/E MULTIPLE CATEGORY</label>
                <select
                  value={screenerPeRange}
                  onChange={(e) => setScreenerPeRange(e.target.value)}
                  className="w-full bg-[#050508] border border-zinc-850 text-xs rounded-lg px-2.5 py-2 text-zinc-300 outline-none focus:border-blue-500"
                >
                  <option value="All">All Valuation Horizons</option>
                  <option value="Undervalued">Undervalued Index (&lt; 20 P/E)</option>
                  <option value="CoreValue">Core Value Bracket (20-40 P/E)</option>
                  <option value="Premium">High Growth Premium (&gt; 40 P/E)</option>
                </select>
              </div>

              {/* Volatility Threshold Regulator */}
              <div>
                <div className="flex justify-between items-center pb-1">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-455 block font-bold">MAX INTRADAY FLUIDITY (VOL)</label>
                  <span className="text-[10px] text-blue-400 font-mono font-bold">{screenerVolLimit.toFixed(1)}%</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.1"
                  value={screenerVolLimit}
                  onChange={(e) => setScreenerVolLimit(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Sorting trigger */}
              <div className="flex items-center justify-between font-mono text-[9px] pt-1 uppercase">
                <span className="text-zinc-500 font-bold">ORDER BY:</span>
                <div className="flex gap-1.5 select-none text-zinc-400">
                  <span
                    onClick={() => setScreenerSortBy("symbol")}
                    className={`cursor-pointer hover:text-white ${screenerSortBy === "symbol" ? "text-blue-400 font-extrabold underline" : ""}`}
                  >
                    Name
                  </span>
                  <span>•</span>
                  <span
                    onClick={() => setScreenerSortBy("price")}
                    className={`cursor-pointer hover:text-white ${screenerSortBy === "price" ? "text-blue-400 font-extrabold underline" : ""}`}
                  >
                    Price
                  </span>
                  <span>•</span>
                  <span
                    onClick={() => setScreenerSortBy("change")}
                    className={`cursor-pointer hover:text-white ${screenerSortBy === "change" ? "text-blue-400 font-extrabold underline" : ""}`}
                  >
                    Yield
                  </span>
                  <span>•</span>
                  <span
                    onClick={() => setScreenerSortBy("pe")}
                    className={`cursor-pointer hover:text-white ${screenerSortBy === "pe" ? "text-blue-400 font-extrabold underline" : ""}`}
                  >
                    P/E
                  </span>
                </div>
              </div>

              {/* Reset Button */}
              <button
                type="button"
                onClick={() => {
                  setScreenerSectors(ALL_SECTORS);
                  setScreenerVolLimit(4.0);
                  setScreenerSearchText("");
                  setScreenerPeRange("All");
                }}
                className="group w-full mt-2 py-2 px-3 bg-[#0d0d12] hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg flex items-center justify-center gap-2 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-98"
                id="reset-screener-filters"
              >
                <RefreshCw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-500 text-blue-500" />
                RESET FILTERS TO DEFAULT
              </button>

            </div>
          </div>

          {/* SCREENER LIST SELECTOR RESULTS */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-4 flex-1">
            <h3 className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-zinc-400 mb-2 block">SCREENED ACTIVE EQUITIES</h3>
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {filteredStocks.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  <AlertCircle className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                  No assets meet defined constraints
                </div>
              ) : (
                filteredStocks.map((stock) => {
                  const isActive = selectedSymbol === stock.symbol;
                  const isWatch = watchlist.includes(stock.symbol);
                  return (
                    <div
                      key={stock.symbol}
                      className={`group p-2.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                        isActive 
                          ? "bg-blue-600/5 border-blue-500/40" 
                          : "bg-[#050508]/80 border-zinc-900 hover:border-zinc-800"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="cursor-pointer" onClick={() => selectSymbol(stock.symbol)}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-white text-xs tracking-wider uppercase group-hover:text-blue-300">
                              {stock.symbol}
                            </span>
                            <span className="text-[8px] font-semibold text-zinc-500 uppercase px-1 rounded bg-zinc-900 truncate max-w-[80px]">
                              {stock.sector}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 block font-sans font-medium truncate max-w-[130px] my-0.5">
                            {stock.name}
                          </span>
                        </div>

                        {/* Interactive triggers */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleWatchlist(stock.symbol)}
                            className={`p-1 rounded cursor-pointer hover:bg-zinc-900 transition-colors ${isWatch ? "text-yellow-500" : "text-zinc-600"}`}
                          >
                            <Star className="h-3.5 w-3.5 fill-current" />
                          </button>
                          <button
                            onClick={() => initQuickAdd(stock)}
                            title="Directly add simulated trades to persistent ledger state"
                            className="p-1 rounded cursor-pointer text-zinc-650 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Spark Ratios Bar */}
                      <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-zinc-900/60 font-mono text-[10px]">
                        <span className="font-bold text-slate-100">${stock.currentPrice.toFixed(2)}</span>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-zinc-550 block font-bold">P/E: <strong className="text-zinc-350">{stock.peRatio}x</strong></span>
                          
                          <span className={`font-black ${stock.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {stock.changePercent >= 0 ? "▲" : "▼"} {stock.changePercent.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>

        {/* ========================================================= */}
        {/* CENTER COLUMN: INTEL INTELLIGENCE CONSOLE & INTERACTIVE   */}
        {/* ========================================================= */}
        <section className="col-span-1 lg:col-span-6 space-y-6">
          
          {/* CORPORATE SUMMARY BOARD WITH KEY OVERVIEW METRICS */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-5 shadow-xl">
            
            {(() => {
              const currentTargetPrice = targetPrices[selectedStock.symbol];
              const isTargetMet = currentTargetPrice && selectedStock.currentPrice >= currentTargetPrice;
              
              return (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pb-4 mb-4 border-b border-zinc-900">
                  
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black font-mono bg-blue-600/10 border border-blue-500/20 px-2.5 py-0.5 rounded text-blue-405 uppercase">
                        {selectedStock.symbol}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-semibold">{selectedStock.exchange} | {selectedStock.industry}</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white font-sans mt-1">
                      {selectedStock.name}
                    </h2>
                    {(() => {
                      const selectedStockTrades = portfolioItems.filter(
                        (item) => item.symbol.toUpperCase() === selectedStock.symbol.toUpperCase()
                      );
                      return (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <button
                            onClick={() => setShowHistoryModal(true)}
                            className="group text-[10px] font-mono text-blue-400 hover:text-blue-300 font-bold bg-blue-950/20 hover:bg-blue-950/40 border border-blue-900/30 hover:border-blue-800/50 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5"
                            id="btn-stock-history"
                          >
                            <History className="h-3 w-3 text-blue-400 group-hover:rotate-[-180deg] transition-transform duration-500" />
                            TRANSACTION LOG ({selectedStockTrades.length})
                          </button>

                          <button
                            onClick={() => setShowNewsPanel(!showNewsPanel)}
                            className={`group text-[10px] font-mono font-bold px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 border ${
                              showNewsPanel
                                ? "text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 border-emerald-900/30 hover:border-emerald-800/50"
                                : "text-zinc-400 bg-zinc-950/40 hover:bg-zinc-900/40 border-zinc-900/30 hover:border-zinc-800/50"
                            }`}
                            id="btn-toggle-news-feed"
                          >
                            <Newspaper className="h-3 w-3 transition-transform" />
                            NEWS FEED {showNewsPanel ? "ON" : "OFF"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-black font-mono tracking-tight transition-all duration-300 rounded-xl px-2.5 py-1 ${
                      isTargetMet
                        ? "text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] animate-pulse"
                        : "text-white"
                    }`}>
                      ${selectedStock.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    
                    <div className="flex items-center gap-1.5 justify-end mt-1">
                      <span className={`text-xs font-black font-mono ${selectedStock.change >= 0 ? "text-emerald-450" : "text-rose-455"}`}>
                        {selectedStock.change >= 0 ? "+" : ""}{selectedStock.change.toFixed(2)}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        selectedStock.change >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {selectedStock.changePercent >= 0 ? "+" : ""}{selectedStock.changePercent.toFixed(2)}%
                      </span>
                    </div>

                    {currentTargetPrice !== undefined && (
                      <div className={`mt-2 inline-flex items-center gap-1 text-[9px] font-mono font-bold px-2 py-0.5 rounded border transition-all ${
                        isTargetMet
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse"
                          : "bg-indigo-500/5 text-indigo-400 border-indigo-500/20"
                      }`} id="target-alert-indicator">
                        <Bell className="h-2.5 w-2.5 shrink-0" />
                        Target: ${currentTargetPrice.toFixed(2)} {isTargetMet && " (MET)"}
                      </div>
                    )}
                  </div>

                </div>
              );
            })()}

            <div className="flex flex-col xl:flex-row gap-5">
              <div className="flex-1 min-w-0 space-y-4">

                {/* TECHNICAL RECHARTS CANVAS PORTAL */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3 text-xs bg-zinc-950/60 border border-zinc-900 p-1.5 rounded-xl font-mono">
                
                {/* Metric Swapper */}
                <div className="flex bg-[#050508] p-1 border border-zinc-900 rounded-lg text-[9px] font-bold">
                  <button
                    onClick={() => setSelectedChartMetric("close")}
                    className={`px-2.5 py-1 rounded cursor-pointer transition-all ${selectedChartMetric === "close" ? "bg-blue-600 text-white" : "text-zinc-400"}`}
                  >
                    CLOSE PRICE
                  </button>
                  <button
                    onClick={() => setSelectedChartMetric("spread")}
                    className={`px-2.5 py-1 rounded cursor-pointer transition-all ${selectedChartMetric === "spread" ? "bg-blue-600 text-white" : "text-zinc-400"}`}
                  >
                    INTRADAY SPREAD
                  </button>
                </div>

                {/* Technical Index Overlays */}
                <div className="flex items-center gap-2.5 text-[10px] flex-wrap md:flex-nowrap">
                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showSMA}
                      onChange={() => setShowSMA(!showSMA)}
                      className="rounded border-zinc-800 text-blue-600 focus:ring-0"
                    />
                    <span className="text-zinc-400">3-Period SMA</span>
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showEMA}
                      onChange={() => setShowEMA(!showEMA)}
                      className="rounded border-zinc-800 text-blue-100 focus:ring-0"
                    />
                    <span className="text-zinc-400">3-Period EMA</span>
                  </label>

                  <label className="flex items-center gap-1 cursor-pointer select-none" id="rsi-indicator-toggle">
                    <input
                      type="checkbox"
                      checked={showRSI}
                      onChange={() => setShowRSI(!showRSI)}
                      className="rounded border-zinc-800 text-[#10b981] focus:ring-0"
                    />
                    <span className="text-zinc-400">RSI ({rsiPeriod}p)</span>
                  </label>

                  {/* Period Micro-Selector */}
                  {showRSI && (
                    <div className="flex items-center gap-1.5 bg-[#050508] border border-zinc-850 px-1.5 py-0.5 rounded text-[8px]" id="rsi-period-container">
                      <span className="text-zinc-550 lowercase">set p:</span>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={rsiPeriod}
                        onChange={(e) => setRsiPeriod(Math.max(1, Math.min(5, parseInt(e.target.value) || 3)))}
                        className="w-5 bg-transparent text-center text-emerald-400 font-bold border-none p-0 focus:ring-0 select-all"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-1 cursor-pointer select-none" id="macd-indicator-toggle">
                    <input
                      type="checkbox"
                      checked={showMACD}
                      onChange={() => setShowMACD(!showMACD)}
                      className="rounded border-zinc-800 text-purple-500 focus:ring-0"
                    />
                    <span className="text-zinc-400">MACD ({macdFast},{macdSlow},{macdSignalPeriod})</span>
                  </label>

                  {showMACD && (
                    <div className="flex items-center gap-1 bg-[#050508] border border-zinc-850 px-1.5 py-0.5 rounded text-[8px] space-x-1" id="macd-periods-container">
                      <span className="text-zinc-550 lowercase">f:</span>
                      <input
                        type="number"
                        min="1"
                        max="3"
                        value={macdFast}
                        onChange={(e) => setMacdFast(Math.max(1, Math.min(3, parseInt(e.target.value) || 2)))}
                        className="w-4 bg-transparent text-center text-purple-400 font-bold border-none p-0 focus:ring-0 select-all"
                      />
                      <span className="text-zinc-550 lowercase font-mono">s:</span>
                      <input
                        type="number"
                        min="4"
                        max="6"
                        value={macdSlow}
                        onChange={(e) => setMacdSlow(Math.max(4, Math.min(6, parseInt(e.target.value) || 5)))}
                        className="w-4 bg-transparent text-center text-purple-400 font-bold border-none p-0 focus:ring-0 select-all"
                      />
                      <span className="text-zinc-550 lowercase font-mono">sig:</span>
                      <input
                        type="number"
                        min="2"
                        max="4"
                        value={macdSignalPeriod}
                        onChange={(e) => setMacdSignalPeriod(Math.max(2, Math.min(4, parseInt(e.target.value) || 3)))}
                        className="w-4 bg-transparent text-center text-purple-400 font-bold border-none p-0 focus:ring-0 select-all"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* MAIN GRAPH CANVAS */}
              <div className="h-56 w-full font-mono text-[9px]">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedChartMetric === "close" ? (
                    <AreaChart key={`areachart-${showRSI}-${showMACD}-${showSMA}-${showEMA}`} data={formattedChartData} margin={{ top: 10, right: (showRSI || showMACD) ? 30 : 10, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="date" stroke="var(--chart-text)" />
                      <YAxis yAxisId="left" stroke="var(--chart-text)" domain={["auto", "auto"]} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981"
                        domain={[0, 100]}
                        ticks={[0, 30, 50, 70, 100]}
                        hide={!showRSI}
                      />
                      <YAxis
                        yAxisId="macd"
                        orientation="right"
                        stroke="#a855f7"
                        domain={["auto", "auto"]}
                        hide={!showMACD}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--tooltip-bg)", borderColor: "var(--tooltip-border)", borderRadius: "10px" }}
                        labelStyle={{ fontWeight: "black", color: "var(--text-main)" }}
                      />
                      <Legend verticalAlign="top" height={24} iconSize={8} />
                      <Area yAxisId="left" name="Day Closing Mark ($)" type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClose)" />
                      <Line yAxisId="left" name="Simple Moving Avg" type="monotone" dataKey="smaValue" stroke="#eab308" strokeWidth={1.5} dot={false} strokeDasharray="4 4" hide={!showSMA} />
                      <Line yAxisId="left" name="Exponential Moving Avg" type="monotone" dataKey="emaValue" stroke="#ec4899" strokeWidth={1.5} dot={false} hide={!showEMA} />
                      <Line yAxisId="right" name={`RSI Signal (${rsiPeriod}-period)`} type="monotone" dataKey="rsiValue" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} hide={!showRSI} />
                      <Line yAxisId="macd" name="MACD Line" type="monotone" dataKey="macdLine" stroke="#a855f7" strokeWidth={1.5} dot={{ r: 2 }} hide={!showMACD} />
                      <Line yAxisId="macd" name="MACD Signal" type="monotone" dataKey="macdSignal" stroke="#f43f5e" strokeWidth={1.5} dot={{ r: 2 }} strokeDasharray="3 3" hide={!showMACD} />
                    </AreaChart>
                  ) : (
                    <LineChart data={formattedChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="var(--chart-grid)" />
                      <XAxis dataKey="date" stroke="var(--chart-text)" />
                      <YAxis stroke="var(--chart-text)" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--tooltip-bg)", borderColor: "var(--tooltip-border)" }}
                        labelStyle={{ color: "var(--text-main)" }}
                      />
                      <Legend verticalAlign="top" height={24} iconSize={8} />
                      <Line name="High-Low Spread ($)" type="monotone" dataKey="highLowSpread" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* KEY METRICS SCOREBOX GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-zinc-900 text-xs font-mono">
              <div className="bg-zinc-950 p-2 border border-zinc-900 rounded-xl">
                <span className="text-[8px] text-zinc-500 block font-bold uppercase">MARKET CAPACITY</span>
                <span className="text-xs font-black text-white">{selectedStock.marketCap}</span>
              </div>
              <div className="bg-zinc-950 p-2 border border-zinc-900 rounded-xl">
                <span className="text-[8px] text-zinc-500 block font-bold uppercase">PRICE-EARNING RATIO</span>
                <span className="text-xs font-black text-rose-400">{selectedStock.peRatio}x</span>
              </div>
              <div className="bg-zinc-950 p-2 border border-zinc-900 rounded-xl">
                <span className="text-[8px] text-zinc-500 block font-bold uppercase">GROSS MARGIN RATE</span>
                <span className="text-xs font-black text-emerald-400">{selectedStock.grossMargin}%</span>
              </div>
              <div className="bg-zinc-950 p-2 border border-zinc-900 rounded-xl">
                <span className="text-[8px] text-zinc-500 block font-bold uppercase">REVENUE GROWTH</span>
                <span className={`text-xs font-black ${selectedStock.revenueGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedStock.revenueGrowth >= 0 ? "+" : ""}{selectedStock.revenueGrowth}%
                </span>
              </div>
            </div>

              </div>

              {/* NEWS FEED PANEL */}
              {showNewsPanel && (
                <div className="w-full xl:w-80 shrink-0 border-t xl:border-t-0 xl:border-l border-zinc-900 pt-4 xl:pt-0 xl:pl-4 flex flex-col space-y-4 font-sans" id="stock-news-panel">
                  <div className="flex justify-between items-center pb-1 border-b border-zinc-900">
                    <span className="text-[10px] font-bold tracking-widest text-[#f1f5f9] uppercase font-mono flex items-center gap-1.5">
                      <Newspaper className="h-3.5 w-3.5 text-blue-400" />
                      FINANCIAL NEWS
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewsRefreshTrigger(prev => prev + 1)}
                      disabled={isNewsLoading}
                      className="p-1 rounded bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-900 cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center"
                      title="Refresh news headlines"
                      id="news-refresh-btn"
                    >
                      <RefreshCw className={`h-3 w-3 ${isNewsLoading ? "animate-spin text-blue-405" : ""}`} />
                    </button>
                  </div>

                  {/* Dynamic News Mode Toggle Segment */}
                  <div className="grid grid-cols-2 p-0.5 bg-zinc-950 border border-zinc-900 rounded-lg text-[9px] font-mono">
                    <button
                      type="button"
                      onClick={() => setNewsFeedType("live")}
                      className={`py-1 rounded text-center transition-all cursor-pointer font-bold ${
                        newsFeedType === "live"
                          ? "bg-blue-950/40 text-blue-400 border border-blue-900/30"
                          : "text-zinc-500 hover:text-zinc-350"
                      }`}
                    >
                      LIVE SCRAPED
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewsFeedType("simulated")}
                      className={`py-1 rounded text-center transition-all cursor-pointer font-bold ${
                        newsFeedType === "simulated"
                          ? "bg-blue-950/40 text-blue-400 border border-blue-900/30"
                          : "text-zinc-500 hover:text-zinc-350"
                      }`}
                    >
                      AI SIMULATED
                    </button>
                  </div>

                  {isNewsLoading ? (
                    <div className="space-y-3 py-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse space-y-2 border-b border-zinc-900/40 pb-2.5">
                          <div className="h-3.5 bg-zinc-900 rounded w-5/6" />
                          <div className="flex justify-between">
                            <div className="h-2 bg-zinc-900 rounded w-1/4" />
                            <div className="h-2 bg-zinc-900 rounded w-1/6" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : newsError ? (
                    <div className="border border-zinc-900/60 bg-zinc-950/40 rounded-xl p-4 text-center font-mono text-[10px] py-6 space-y-2">
                      <p className="text-rose-455">{newsError}</p>
                      <button
                        type="button"
                        onClick={() => setNewsRefreshTrigger(prev => prev + 1)}
                        className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded bg-zinc-900 hover:bg-zinc-850 text-blue-400 hover:text-blue-300 border border-zinc-800 cursor-pointer"
                      >
                        Retry Load
                      </button>
                    </div>
                  ) : newsFeed.length === 0 ? (
                    <div className="border border-zinc-900/60 bg-zinc-950/40 rounded-xl p-4 text-center text-zinc-500 font-mono text-[10px] py-8">
                      No live headlines scraped for {selectedStock.symbol}.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 divide-y divide-zinc-900/40" id="news-scroll-container">
                      {newsFeed.map((item) => {
                        const isExpanded = expandedNewsId === item.id;
                        const sentimentColor =
                          item.sentiment === "positive"
                            ? "text-emerald-400 bg-emerald-950/30 border-emerald-900/20"
                            : item.sentiment === "negative"
                            ? "text-rose-450 bg-rose-950/30 border-rose-900/20"
                            : "text-zinc-400 bg-zinc-900/50 border-zinc-800/30";
                        
                        return (
                          <div 
                            key={item.id} 
                            className="pt-3 first:pt-0 space-y-2 group cursor-pointer transition-all duration-250"
                            onClick={() => setExpandedNewsId(isExpanded ? null : item.id)}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="text-[8px] font-mono font-medium text-blue-400/80 uppercase tracking-wider">
                                {item.source}
                              </span>
                              <span className="text-[8px] font-mono text-zinc-600">
                                {item.time}
                              </span>
                            </div>
                            
                            <div className="flex items-start justify-between gap-1.5">
                              <h4 className={`text-[10.5px] font-bold leading-snug transition-colors duration-200 ${isExpanded ? "text-blue-400" : "text-white group-hover:text-blue-300"}`}>
                                {item.title}
                              </h4>
                              <ChevronDown className={`h-3 w-3 shrink-0 text-zinc-600 transition-transform duration-250 ${isExpanded ? "rotate-180 text-blue-400" : "group-hover:text-zinc-400"}`} />
                            </div>

                            {!isExpanded ? (
                              <p className="text-[9.5px] text-zinc-400 leading-relaxed line-clamp-2">
                                {item.summary}
                              </p>
                            ) : (
                              <div className="space-y-2.5 pb-1 text-[9.5px] animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                                {/* Summary Paragraph */}
                                <p className="text-zinc-300 leading-relaxed bg-zinc-950/60 p-2 rounded border border-zinc-900/50 font-sans">
                                  {item.summary}
                                </p>

                                {/* Key Takeaways */}
                                {item.keyTakeaways && Array.isArray(item.keyTakeaways) && (
                                  <div className="space-y-1 bg-zinc-950/20 p-1.5 rounded">
                                    <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">Key Takeaways</span>
                                    <ul className="space-y-1 pl-1">
                                      {item.keyTakeaways.map((point: string, pIdx: number) => (
                                        <li key={pIdx} className="text-zinc-400 leading-normal flex items-start gap-1.5">
                                          <span className="text-blue-400 mt-0.5 font-bold">▪</span>
                                          <span>{point}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Market Impact analysis block */}
                                {item.marketImpactAnalysis && (
                                  <div className="space-y-1 p-2 rounded bg-zinc-950 border border-zinc-900">
                                    <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">Market Impact Analysis</span>
                                    <p className="text-zinc-400 italic font-sans leading-relaxed">
                                      {item.marketImpactAnalysis}
                                    </p>
                                  </div>
                                )}

                                {/* Open Original Source */}
                                {item.link && (
                                  <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between px-2.5 py-1.5 text-[8.5px] font-mono font-bold uppercase rounded bg-zinc-950 hover:bg-zinc-900 text-blue-400 hover:text-blue-300 border border-zinc-900 cursor-pointer transition-all"
                                  >
                                    <span>Open Source on {item.source}</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 pt-0.5">
                              <span className={`text-[8px] font-mono font-bold uppercase px-1 py-0.2 rounded border ${sentimentColor}`}>
                                {item.sentiment}
                              </span>
                              <span className="text-[8px] font-mono text-zinc-550">
                                Impact: <strong className="text-zinc-350">{item.impactScore}%</strong>
                              </span>
                              {newsFeedType === "live" && (
                                <span className="text-[8px] font-mono text-blue-400/60 ml-auto bg-blue-950/20 border border-blue-950/40 px-1 rounded uppercase font-bold tracking-wider">
                                  LIVE RSS
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[8px] font-mono text-zinc-600 border-t border-zinc-900/60 pt-2.5 flex items-center justify-between">
                    <span>{newsFeedType === "live" ? "Real-time news scraper" : "Dynamic simulation engine"}</span>
                    <span className="text-blue-400 font-bold bg-blue-950/10 border border-blue-950/30 px-1 rounded uppercase tracking-wider">GEMINI MULTI-MODEL</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ======================================================== */}
          {/* AI ANALYST HUB (COMPREHENSIVE PIPELINE PANEL)            */}
          {/* ======================================================== */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-5 shadow-xl space-y-5" id="ai-analyst-hub-card">
            
            {/* Header section with sparkles */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-zinc-900">
              <div className="flex gap-2.5 items-start">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                  <Sparkles className="h-4 w-4 animate-pulse text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-widest text-[#f1f5f9] uppercase font-mono flex items-center gap-1.5">
                    AI Analyst Hub
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                    Real-time corporate news scraper & multi-model LLM market impact pipeline.
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 font-mono text-[9px] bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg">
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-zinc-400 font-extrabold uppercase">PIPELINE: ONLINE</span>
              </div>
            </div>

            {/* AI CONSENSUS ANALYSIS GAUGES */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900/60">
              
              {/* Consensus Pill */}
              <div className="col-span-1 md:col-span-5 flex flex-col justify-center space-y-1.5">
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Calculated Consensus Rating</span>
                <div className={`text-[10.5px] font-mono font-black border px-3 py-2 rounded-lg text-center uppercase tracking-wide transition-all ${hubStats.consensusColor}`}>
                  {hubStats.consensus}
                </div>
              </div>

              {/* Proportions segment */}
              <div className="col-span-1 md:col-span-4 flex flex-col justify-center space-y-1.5">
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Story Catalyst Distribution</span>
                <div className="flex items-center gap-2 h-6 rounded-lg overflow-hidden border border-zinc-900/60 p-0.5 bg-zinc-950 text-[9px] font-mono select-none">
                  {hubStats.totalCount === 0 ? (
                    <div className="w-full text-center text-zinc-650">No Stories Feed</div>
                  ) : (
                    <>
                      {hubStats.posCount > 0 && (
                        <div 
                          style={{ width: `${(hubStats.posCount / hubStats.totalCount) * 100}%` }}
                          className="bg-emerald-950/40 hover:bg-emerald-950/60 border border-emerald-900/30 text-emerald-400 font-black flex items-center justify-center transition-all h-full rounded cursor-help"
                          title={`${hubStats.posCount} Positive stories`}
                        >
                          +{hubStats.posCount}
                        </div>
                      )}
                      {hubStats.neuCount > 0 && (
                        <div 
                          style={{ width: `${(hubStats.neuCount / hubStats.totalCount) * 100}%` }}
                          className="bg-zinc-900/50 hover:bg-zinc-900/70 border border-zinc-800/40 text-zinc-400 font-bold flex items-center justify-center transition-all h-full rounded cursor-help"
                          title={`${hubStats.neuCount} Neutral stories`}
                        >
                          {hubStats.neuCount}
                        </div>
                      )}
                      {hubStats.negCount > 0 && (
                        <div 
                          style={{ width: `${(hubStats.negCount / hubStats.totalCount) * 100}%` }}
                          className="bg-rose-950/40 hover:bg-rose-950/60 border border-rose-900/30 text-rose-400 font-black flex items-center justify-center transition-all h-full rounded cursor-help"
                          title={`${hubStats.negCount} Negative stories`}
                        >
                          -{hubStats.negCount}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Mean impact score meter */}
              <div className="col-span-1 md:col-span-3 flex flex-col justify-center space-y-1.5">
                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Weighted Catalyst Score</span>
                <div className="flex items-center justify-between border border-zinc-900 p-2 rounded-lg bg-zinc-950">
                  <div className="text-xl font-mono font-black text-white">
                    {hubStats.avgImpact}<span className="text-[10px] text-zinc-500 font-normal">/100</span>
                  </div>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase font-bold text-right leading-none">
                    {hubStats.avgImpact >= 70 ? (
                      <span className="text-emerald-400">HIGH OUTLOOK</span>
                    ) : hubStats.avgImpact <= 35 ? (
                      <span className="text-rose-400">VOLATILITY ALERT</span>
                    ) : (
                      <span className="text-blue-400">STABLE CORE</span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* AI CORPORATE SUMMARY SYNTHESIS */}
            {newsFeed.length > 0 && (
              <div className="p-3 bg-blue-950/5 border border-blue-950/20 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-blue-400 animate-pulse" />
                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-blue-400 font-extrabold">Corporate Catalyst Synthesis</span>
                </div>
                <p className="text-[10px] text-zinc-350 font-sans leading-relaxed">
                  Our financial news extraction pipelines indicate that <strong className="text-blue-300">{selectedStock.name} ({selectedStock.symbol})</strong> is experiencing a {hubStats.posCount > hubStats.negCount ? "constructive" : hubStats.negCount > hubStats.posCount ? "pressured" : "neutral"} trading backdrop. 
                  {hubStats.posCount > hubStats.negCount ? (
                    ` Strategic updates across institutional portals underscore solid core pricing power and resilient demand parameters. Analysts anticipate technical support to hold around moving averages as bidder volume absorbs the positive fundamental developments.`
                  ) : hubStats.negCount > hubStats.posCount ? (
                    ` Broader macro headwinds and operational headlines are prompting a tactical re-allocation of institutional assets. Technical resistance remains tight, and traders are monitoring support bands to establish key consolidation points.`
                  ) : (
                    ` The equilibrium between bullish and bearish catalysts indicates a classic consolidation phase. Current trading indexes reflect a balanced market consensus with participants digesting recent micro developments while awaiting broader sector directions.`
                  )}
                </p>
              </div>
            )}

            {/* AUTOMATED TECHNICAL ANALYSIS SUGGESTIONS */}
            <div className="p-4 bg-zinc-950/35 border border-zinc-900 rounded-xl space-y-4" id="ai-technical-suggestions-container">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-zinc-900/40">
                <div className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-[#f1f5f9]">Algorithmic Technical Suggestions</span>
                </div>
                <div className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${technicalSuggestions.ratingBanner}`}>
                  CONSENSUS: {technicalSuggestions.rating}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* RSI INDICATOR CARD */}
                <div className="bg-[#050508] border border-zinc-900/80 p-3 rounded-lg flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-zinc-400">Relative Strength (RSI)</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      technicalSuggestions.rsi.score > 0 ? "text-emerald-400 bg-emerald-950/20" :
                      technicalSuggestions.rsi.score < 0 ? "text-rose-400 bg-rose-950/20" : "text-zinc-500 bg-zinc-950"
                    }`}>
                      {technicalSuggestions.rsi.signal}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-zinc-400 leading-normal font-sans">
                    {technicalSuggestions.rsi.desc}
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 flex justify-between items-center pt-1 border-t border-zinc-900/50">
                    <span>Active value (5p):</span>
                    <span className="font-extrabold text-zinc-300">{technicalSuggestions.rsi.value}</span>
                  </div>
                </div>

                {/* MACD CROSSOVER CARD */}
                <div className="bg-[#050508] border border-zinc-900/80 p-3 rounded-lg flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-zinc-400">MACD Crossover</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      technicalSuggestions.macd.score > 0 ? "text-emerald-400 bg-emerald-950/20" :
                      technicalSuggestions.macd.score < 0 ? "text-rose-400 bg-rose-950/20" : "text-zinc-500 bg-zinc-950"
                    }`}>
                      {technicalSuggestions.macd.signal}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-zinc-400 leading-normal font-sans">
                    {technicalSuggestions.macd.desc}
                  </p>
                  <div className="text-[10px] font-mono text-zinc-500 flex justify-between items-center pt-1 border-t border-zinc-900/50">
                    <span>MACD-Signal spread:</span>
                    <span className={`font-extrabold ${technicalSuggestions.macd.diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {technicalSuggestions.macd.diff > 0 ? "+" : ""}{technicalSuggestions.macd.diff}
                    </span>
                  </div>
                </div>

                {/* BOLLINGER BANDS CARD */}
                <div className="bg-[#050508] border border-zinc-900/80 p-3 rounded-lg flex flex-col justify-between space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-zinc-400">Bollinger Bands (5p)</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      technicalSuggestions.bb.score > 0 ? "text-emerald-400 bg-emerald-950/20" :
                      technicalSuggestions.bb.score < 0 ? "text-rose-400 bg-rose-950/20" : "text-zinc-500 bg-zinc-950"
                    }`}>
                      {technicalSuggestions.bb.signal}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-zinc-400 leading-normal font-sans">
                    {technicalSuggestions.bb.desc}
                  </p>
                  <div className="text-[9.5px] font-mono text-zinc-500 grid grid-cols-3 text-center gap-1 pt-1 border-t border-zinc-900/50">
                    <div>
                      <div className="text-[7.5px] text-zinc-600">LOWER</div>
                      <div className="text-zinc-400">${technicalSuggestions.bb.lower}</div>
                    </div>
                    <div>
                      <div className="text-[7.5px] text-zinc-600">MIDDLE</div>
                      <div className="text-zinc-400">${technicalSuggestions.bb.middle}</div>
                    </div>
                    <div>
                      <div className="text-[7.5px] text-zinc-600">UPPER</div>
                      <div className="text-zinc-450">${technicalSuggestions.bb.upper}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${technicalSuggestions.ratingColor}`}>
                <div className="space-y-0.5">
                  <div className="text-[9px] font-mono tracking-widest uppercase font-black opacity-85">Consensus Recommendation</div>
                  <p className="text-[10px] opacity-90 leading-relaxed font-sans font-medium">
                    {technicalSuggestions.recommendation}
                  </p>
                </div>
                <div className="shrink-0 bg-black/40 border border-white/5 rounded px-3 py-2 text-center w-full sm:w-auto">
                  <div className="text-[7.5px] font-mono text-zinc-400 uppercase tracking-widest">Composite Index</div>
                  <div className="text-sm font-mono font-black mt-0.5">
                    {technicalSuggestions.score > 0 ? "+" : ""}{technicalSuggestions.score}
                  </div>
                </div>
              </div>
            </div>

            {/* PIPELINE CONTROL BAR: FILTERS & SORT */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-zinc-950/20 p-2 border border-zinc-900/50 rounded-xl">
              
              {/* Sentiment filter pills */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[8px] font-mono font-bold text-zinc-550 uppercase tracking-wider px-1">Filter:</span>
                <button
                  type="button"
                  onClick={() => setHubSentimentFilter("all")}
                  className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold border transition-all cursor-pointer ${
                    hubSentimentFilter === "all"
                      ? "bg-zinc-800 text-white border-zinc-700"
                      : "bg-zinc-950 text-zinc-500 border-zinc-900/60 hover:text-zinc-350"
                  }`}
                >
                  ALL ({hubStats.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHubSentimentFilter("positive")}
                  className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold border transition-all cursor-pointer ${
                    hubSentimentFilter === "positive"
                      ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/30"
                      : "bg-zinc-950 text-zinc-500 border-zinc-900/60 hover:text-emerald-500/80"
                  }`}
                >
                  BULLISH ({hubStats.posCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHubSentimentFilter("negative")}
                  className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold border transition-all cursor-pointer ${
                    hubSentimentFilter === "negative"
                      ? "bg-rose-950/40 text-rose-455 border-rose-900/30"
                      : "bg-zinc-950 text-zinc-500 border-zinc-900/60 hover:text-rose-500/80"
                  }`}
                >
                  BEARISH ({hubStats.negCount})
                </button>
                <button
                  type="button"
                  onClick={() => setHubSentimentFilter("neutral")}
                  className={`px-2 py-1 rounded text-[8.5px] font-mono font-bold border transition-all cursor-pointer ${
                    hubSentimentFilter === "neutral"
                      ? "bg-zinc-900 text-zinc-300 border-zinc-800"
                      : "bg-zinc-950 text-zinc-500 border-zinc-900/60 hover:text-zinc-350"
                  }`}
                >
                  NEUTRAL ({hubStats.neuCount})
                </button>
              </div>

              {/* Sorting triggers */}
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono font-bold text-zinc-550 uppercase tracking-wider">Sort:</span>
                <div className="grid grid-cols-2 p-0.5 bg-zinc-950 border border-zinc-900 rounded-lg text-[8px] font-mono">
                  <button
                    type="button"
                    onClick={() => setHubSortOrder("impact")}
                    className={`px-2.5 py-1 rounded text-center transition-all cursor-pointer font-bold ${
                      hubSortOrder === "impact"
                        ? "bg-blue-950/40 text-blue-400 border-blue-900/30"
                        : "text-zinc-500 hover:text-zinc-350"
                    }`}
                  >
                    BY IMPACT
                  </button>
                  <button
                    type="button"
                    onClick={() => setHubSortOrder("recency")}
                    className={`px-2.5 py-1 rounded text-center transition-all cursor-pointer font-bold ${
                      hubSortOrder === "recency"
                        ? "bg-blue-950/40 text-blue-400 border-blue-900/30"
                        : "text-zinc-500 hover:text-zinc-350"
                    }`}
                  >
                    BY RECENCY
                  </button>
                </div>
              </div>

            </div>

            {/* STORIES LIST ACCORDION */}
            {isNewsLoading ? (
              <div className="space-y-4 py-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="border border-zinc-900 bg-zinc-950/20 p-4 rounded-xl space-y-3 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-20 bg-zinc-800 rounded" />
                      <div className="h-2 w-12 bg-zinc-800 rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-zinc-850 rounded" />
                    <div className="h-3 w-full bg-zinc-900 rounded" />
                    <div className="h-3 w-5/6 bg-zinc-900 rounded" />
                  </div>
                ))}
              </div>
            ) : newsError ? (
              <div className="border border-rose-950/40 bg-rose-950/10 p-5 rounded-xl text-center space-y-3">
                <AlertCircle className="h-6 w-6 text-rose-455 mx-auto animate-bounce" />
                <h4 className="text-xs font-bold text-rose-200 font-mono uppercase">Pipeline Execution Exception</h4>
                <p className="text-[10px] text-rose-300 font-sans max-w-md mx-auto leading-relaxed">
                  The news scraper encountered a validation timeout: {newsError}. Standard simulated model channels remain operational.
                </p>
                <button
                  type="button"
                  onClick={() => setNewsRefreshTrigger(prev => prev + 1)}
                  className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-800 rounded-lg text-[9px] font-mono font-bold transition-all cursor-pointer"
                >
                  RECONNECT NEWS FEED
                </button>
              </div>
            ) : filteredHubNews.length === 0 ? (
              <div className="border border-zinc-900/60 bg-zinc-950/40 rounded-xl p-8 text-center text-zinc-500 font-mono text-[10px] py-12">
                No articles match the current filter criteria for {selectedStock.symbol}. Try selecting another filter or refresh the feed.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredHubNews.map((item) => {
                  const isExpanded = expandedNewsId === item.id;
                  const sentimentColor =
                    item.sentiment === "positive"
                      ? "text-emerald-450 bg-emerald-950/30 border-emerald-900/20 shadow-[0_0_10px_rgba(16,185,129,0.03)]"
                      : item.sentiment === "negative"
                      ? "text-rose-455 bg-rose-950/30 border-rose-900/20 shadow-[0_0_10px_rgba(239,68,68,0.03)]"
                      : "text-zinc-400 bg-zinc-900/40 border-zinc-800/30";

                  const sentimentLabel = 
                    item.sentiment === "positive" ? "▲ BULLISH CATALYST" : 
                    item.sentiment === "negative" ? "▼ BEARISH CATALYST" : 
                    "◆ NEUTRAL IMPACT";

                  return (
                    <div 
                      key={item.id}
                      className={`border rounded-xl p-4 transition-all duration-300 cursor-pointer select-none ${
                        isExpanded
                          ? "bg-zinc-950 border-zinc-850/80 shadow-[inset_0_1px_3px_rgba(255,255,255,0.02)]"
                          : "bg-zinc-950/30 border-zinc-900/60 hover:bg-zinc-950/60 hover:border-zinc-850/60"
                      }`}
                      onClick={() => setExpandedNewsId(isExpanded ? null : item.id)}
                    >
                      {/* Top bar with source & time */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-extrabold text-blue-400/80 uppercase tracking-wider bg-blue-950/10 border border-blue-900/15 px-1.5 py-0.5 rounded">
                            {item.source}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-500 font-bold">
                            {item.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${sentimentColor}`}>
                            {sentimentLabel}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 font-extrabold">
                            IMPACT: <strong className="text-zinc-350">{item.impactScore}%</strong>
                          </span>
                        </div>
                      </div>

                      {/* Title & Chevron */}
                      <div className="flex items-start justify-between gap-4">
                        <h4 className={`text-[11.5px] font-black leading-snug tracking-normal transition-colors duration-250 ${
                          isExpanded ? "text-blue-400 font-bold" : "text-white group-hover:text-blue-300"
                        }`}>
                          {item.title}
                        </h4>
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-550 transition-transform duration-250 ${
                          isExpanded ? "rotate-180 text-blue-400" : ""
                        }`} />
                      </div>

                      {/* Brief overview summary when collapsed */}
                      {!isExpanded && (
                        <p className="text-[10px] text-zinc-400 font-sans leading-relaxed mt-2 line-clamp-2">
                          {item.summary}
                        </p>
                      )}

                      {/* Detailed insights expanded view */}
                      {isExpanded && (
                        <div className="mt-3.5 pt-3.5 border-t border-zinc-900/60 space-y-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Core analytical summary */}
                          <div className="space-y-1.5">
                            <span className="text-[8.5px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Executive Analysis Summary</span>
                            <p className="text-[10.5px] text-zinc-300 font-sans leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-900 font-medium">
                              {item.summary}
                            </p>
                          </div>

                          {/* 3 Bulleted takeaways */}
                          {item.keyTakeaways && Array.isArray(item.keyTakeaways) && (
                            <div className="space-y-2">
                              <span className="text-[8.5px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Analyst Takeaways & Milestones</span>
                              <div className="grid grid-cols-1 gap-2">
                                {item.keyTakeaways.map((point: string, pIdx: number) => (
                                  <div key={pIdx} className="flex items-start gap-2.5 bg-zinc-950/20 p-2.5 rounded-lg border border-zinc-900/30">
                                    <span className="text-[11px] font-black font-mono text-blue-405 bg-blue-950/40 border border-blue-900/20 h-5 w-5 rounded-full flex items-center justify-center shrink-0 font-extrabold">
                                      {pIdx + 1}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                                      {point}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Deep Market impact analysis */}
                          {item.marketImpactAnalysis && (
                            <div className="space-y-1.5">
                              <span className="text-[8.5px] font-mono font-bold text-zinc-500 uppercase tracking-widest block font-black">Market Impact Vectors</span>
                              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900 space-y-1.5">
                                <p className="text-[10px] text-zinc-400 italic font-sans leading-relaxed">
                                  {item.marketImpactAnalysis}
                                </p>
                                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                                  <div 
                                    style={{ width: `${item.impactScore}%` }}
                                    className={`h-full rounded-full ${
                                      item.sentiment === "positive" ? "bg-emerald-500/80" :
                                      item.sentiment === "negative" ? "bg-rose-500/80" : "bg-zinc-500/80"
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Original link */}
                          {item.link && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between px-3.5 py-2.5 text-[9px] font-mono font-bold uppercase rounded-lg bg-zinc-950 hover:bg-zinc-900 text-blue-400 hover:text-blue-300 border border-zinc-900 cursor-pointer transition-all"
                            >
                              <span>Verify coverage on original publisher ({item.source})</span>
                              <ExternalLink className="h-3.5 w-3.5 animate-pulse text-blue-400" />
                            </a>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-[8.5px] font-mono text-zinc-650 border-t border-zinc-900 pt-3.5 flex flex-col sm:flex-row justify-between items-center gap-1.5">
              <span>Financial pipeline runs on direct RSS feeds integrated with Google News</span>
              <span className="text-zinc-500">Pipeline refresh matches manual ticker updates</span>
            </div>

          </div>

          {/* ======================================================== */}
          {/* DYNAMIC METRIC OVERRIDE WORKBENCH (CONTEXT METRIC EDIT)  */}
          {/* ======================================================== */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-5 shadow-xl" id="workbench-pane">
            
            <div className="flex gap-2.5 items-start mb-4 pb-3 border-b border-zinc-900">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-widest text-[#f1f5f9] uppercase font-mono">
                  Metric Interactive Workbench
                </h3>
                <p className="text-[10px] text-zinc-500 font-sans">
                  Edit and simulate variable stock ratings. Context propagates updates dynamically across all charts, widgets, and lists.
                </p>
              </div>
            </div>

            <form onSubmit={applySimOverride} className="space-y-4">
              
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                
                <div className="space-y-1 font-sans">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-450 block font-bold">SHARE PRICE ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={simPrice}
                    onChange={(e) => setSimPrice(e.target.value)}
                    className="w-full bg-[#050508] border border-zinc-800 text-xs rounded-xl px-2.5 py-2 text-white font-mono focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-450 block font-bold">P/E RATIO (X)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={simPe}
                    onChange={(e) => setSimPe(e.target.value)}
                    className="w-full bg-[#050508] border border-zinc-800 text-xs rounded-xl px-2.5 py-2 text-white font-mono focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-450 block font-bold">GROSS MARGIN (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={simGross}
                    onChange={(e) => setSimGross(e.target.value)}
                    className="w-full bg-[#050508] border border-zinc-800 text-xs rounded-xl px-2.5 py-2 text-white font-mono focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-450 block font-bold">NET MARGIN (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simNet}
                    onChange={(e) => setSimNet(e.target.value)}
                    className="w-full bg-[#050508] border border-zinc-800 text-xs rounded-xl px-2.5 py-2 text-white font-mono focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-450 block font-bold">GROWTH RATE (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={simGrowth}
                    onChange={(e) => setSimGrowth(e.target.value)}
                    className="w-full bg-[#050508] border border-zinc-800 text-xs rounded-xl px-2.5 py-2 text-white font-mono focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1 font-sans" id="target-price-field-wrapper">
                  <label className="text-[8px] uppercase tracking-wider font-mono text-indigo-400 block font-bold flex items-center gap-1">
                    <Bell className="h-2.5 w-2.5 text-indigo-400" />
                    TARGET PRICE ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="Alert target..."
                    value={targetPriceInput}
                    onChange={(e) => setTargetPriceInput(e.target.value)}
                    className="w-full bg-[#050508] border border-indigo-950/40 text-xs rounded-xl px-2.5 py-2 text-indigo-300 placeholder-zinc-700 font-mono focus:border-indigo-500/70 focus:ring-0 transition-colors"
                  />
                </div>

              </div>

              <div className="flex justify-between items-center bg-[#050508] border border-dashed border-zinc-800 p-3 rounded-xl">
                
                <div className="flex items-center gap-1.5 text-zinc-400 text-[10px]">
                  <AlertCircle className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span>Value indices will compile instantly within your browser local sandbox.</span>
                </div>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 text-white rounded-lg px-4 py-2 font-mono font-bold text-xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                >
                  <Check className="h-3.5 w-3.5" />
                  APPLY SIMULATION
                </button>

              </div>

            </form>

          </div>

          {/* PORTFOLIO REBALANCING MODULE */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-5 shadow-xl space-y-5 animate-fade-in" id="portfolio-rebalancing-card">
            
            <div className="flex justify-between items-start md:items-center gap-2 flex-wrap pb-3 border-b border-zinc-900">
              <div>
                <h2 className="text-sm font-bold tracking-widest text-indigo-400 uppercase flex items-center gap-2 font-mono">
                  <Scale className="h-4 w-4 text-indigo-400" />
                  Portfolio Rebalancing Engine
                </h2>
                <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                  Suggests precise buy/sell actions to align holdings with custom target allocations
                </p>
              </div>
              
              <div className="flex items-center gap-1.5">
                {targetWeightsSum === 100 ? (
                  <span className="text-[9px] font-bold font-mono bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg">
                    ✓ BALANCED (100%)
                  </span>
                ) : (
                  <span className="text-[9px] font-bold font-mono bg-amber-950/40 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg">
                    ⚠️ UNBALANCED ({targetWeightsSum.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>

            {/* SANDBOX CAPITAL ALLOCATOR IF EMPTY PORTFOLIO */}
            {totalPortfolioValue === 0 && (
              <div className="bg-indigo-950/10 border border-dashed border-indigo-900/30 p-4 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-indigo-450 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-indigo-300 font-sans">Simulation & Empty Ledger Mode</h3>
                    <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                      Your portfolio ledger is currently empty. Define a simulated allocation capital below to model and deploy a fresh balanced target portfolio instantly!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="space-y-1 w-full max-w-[180px]">
                    <label className="text-[8px] uppercase tracking-wider font-mono text-zinc-500 block font-bold">Simulated Capital ($)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-xs text-zinc-600 font-mono font-bold">$</span>
                      <input
                        type="number"
                        min="1"
                        step="100"
                        value={rebalanceCapitalInput}
                        onChange={(e) => setRebalanceCapitalInput(e.target.value)}
                        className="w-full bg-[#050508] border border-zinc-800 text-xs rounded-xl pl-7 pr-2.5 py-2 text-white font-mono focus:border-indigo-500 focus:ring-0 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ALLOCATION MATRIX TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-zinc-900 text-[9px] font-mono tracking-wider text-zinc-500 uppercase">
                    <th className="pb-2 font-bold">Asset</th>
                    <th className="pb-2 text-right font-bold">Market Price</th>
                    <th className="pb-2 text-right font-bold">Current Allocation</th>
                    <th className="pb-2 text-center font-bold px-4">Target Weight</th>
                    <th className="pb-2 text-right font-bold">Delta</th>
                    <th className="pb-2 text-right font-bold">Trade Sug.</th>
                    <th className="pb-2 text-center font-bold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-950/40 text-xs font-sans">
                  {rebalanceCalculations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-zinc-600 italic text-[10px]">
                        No configured assets in target allocation. Add assets below to design your portfolio.
                      </td>
                    </tr>
                  ) : (
                    rebalanceCalculations.map((calc) => {
                      const valueDiffSign = calc.valueDiff >= 0 ? "+" : "";
                      const sharesDiffSign = calc.sharesDiff >= 0 ? "+" : "";
                      const isHold = Math.abs(calc.sharesDiff) < 0.01;
                      
                      return (
                        <tr key={calc.symbol} className="hover:bg-zinc-900/10 transition-colors group">
                          {/* Asset Info */}
                          <td className="py-3 font-semibold text-zinc-200">
                            <button
                              onClick={() => selectSymbol(calc.symbol)}
                              className="font-mono bg-zinc-900/50 hover:bg-indigo-950/30 border border-zinc-800 hover:border-indigo-800/40 px-2 py-0.5 rounded text-zinc-300 hover:text-indigo-400 font-bold transition-all text-left uppercase text-[10px] cursor-pointer"
                            >
                              {calc.symbol}
                            </button>
                            <span className="text-[10px] text-zinc-500 block font-normal mt-0.5 truncate max-w-[110px]">
                              {stocks[calc.symbol]?.name || `${calc.symbol} Corp`}
                            </span>
                          </td>

                          {/* Market Price */}
                          <td className="py-3 text-right font-mono text-zinc-300">
                            ${calc.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Current Allocation */}
                          <td className="py-3 text-right">
                            <div className="font-mono text-zinc-200">
                              ${calc.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                              {calc.currentWeight.toFixed(1)}%
                            </div>
                          </td>

                          {/* Target Weight Modifier */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1 max-w-[130px] mx-auto">
                              <button
                                type="button"
                                onClick={() => handleUpdateTargetWeight(calc.symbol, calc.targetWeight - 1)}
                                className="h-6 w-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded flex items-center justify-center font-bold text-xs select-none transition-all cursor-pointer"
                              >
                                -
                              </button>
                              <div className="relative flex items-center justify-center max-w-[55px]">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={calc.targetWeight === 0 ? "0" : calc.targetWeight}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                    handleUpdateTargetWeight(calc.symbol, val);
                                  }}
                                  className="w-full bg-[#050508] border border-zinc-800 text-center text-xs rounded px-1 py-1 text-white font-mono focus:border-indigo-500 focus:ring-0 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="absolute right-1 text-[9px] text-zinc-500 font-mono select-none">%</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateTargetWeight(calc.symbol, calc.targetWeight + 1)}
                                className="h-6 w-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded flex items-center justify-center font-bold text-xs select-none transition-all cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Delta */}
                          <td className="py-3 text-right">
                            <span className={`font-mono font-bold text-[10px] ${calc.targetWeight - calc.currentWeight >= 0.05 ? "text-emerald-455 font-black" : calc.targetWeight - calc.currentWeight <= -0.05 ? "text-rose-455 font-black" : "text-zinc-500"}`}>
                              {(calc.targetWeight - calc.currentWeight) >= 0 ? "+" : ""}{(calc.targetWeight - calc.currentWeight).toFixed(1)}%
                            </span>
                            <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                              {valueDiffSign}${Math.abs(calc.valueDiff).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </td>

                          {/* Suggested Action */}
                          <td className="py-3 text-right font-mono font-bold">
                            {isHold ? (
                              <span className="text-zinc-500 text-[10px] bg-zinc-950/40 border border-zinc-900 px-2 py-0.5 rounded">
                                HOLD
                              </span>
                            ) : calc.sharesDiff > 0 ? (
                              <div className="text-emerald-455 text-[10px]">
                                <span className="bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">
                                  BUY {Math.abs(calc.sharesDiff).toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <div className="text-rose-455 text-[10px]">
                                <span className="bg-rose-950/20 border border-rose-900/30 px-2 py-0.5 rounded">
                                  SELL {Math.abs(calc.sharesDiff).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Delete Item Target */}
                          <td className="py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveSymbolTarget(calc.symbol)}
                              className="text-zinc-600 hover:text-rose-400 p-1 rounded hover:bg-zinc-900 transition-all cursor-pointer"
                              title="Remove target specification"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ACTION FOOTER BAR */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-zinc-900">
              
              {/* Left Side: Add stocks / Allocation controls */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {availableAddSymbols.length > 0 && (
                  <div className="flex items-center gap-1">
                    <select
                      value={rebalanceNewSymbol}
                      onChange={(e) => handleAddSymbolTarget(e.target.value)}
                      className="bg-[#050508] border border-zinc-800 text-[10px] rounded px-2.5 py-1 text-zinc-300 font-mono focus:border-indigo-500 transition-colors"
                    >
                      <option value="">+ Add stock asset...</option>
                      {availableAddSymbols.map((sym) => (
                        <option key={sym} value={sym}>
                          {sym} - {stocks[sym]?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleEqualWeight}
                  className="text-[10px] font-bold font-mono border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded transition-all cursor-pointer"
                >
                  EQUAL WEIGHT
                </button>

                <button
                  type="button"
                  onClick={handleNormalizeWeights}
                  className="text-[10px] font-bold font-mono border border-zinc-800 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 px-2.5 py-1 rounded transition-all cursor-pointer"
                >
                  NORMALIZE (100%)
                </button>
              </div>

              {/* Right Side: Execute Actions */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {targetWeightsSum !== 100 && (
                  <span className="text-[9px] text-zinc-500 font-mono italic text-right">
                    Sum must equal 100% to execute
                  </span>
                )}
                
                <button
                  type="button"
                  disabled={targetWeightsSum !== 100 || !hasRebalanceTrades}
                  onClick={() => {
                    const trades = rebalanceCalculations
                      .filter(calc => Math.abs(calc.sharesDiff) >= 0.01)
                      .map(calc => ({
                        symbol: calc.symbol,
                        sharesDiff: calc.sharesDiff,
                        price: calc.price,
                      }));
                    
                    if (trades.length === 0) return;
                    
                    if (confirm(`Execute ${trades.length} rebalancing transactions instantly? This will update your durable portfolio ledger.`)) {
                      executeRebalanceTrades(trades);
                    }
                  }}
                  className={`font-mono font-bold text-xs rounded-lg px-4 py-2 flex items-center gap-1.5 transition-all ${
                    targetWeightsSum === 100 && hasRebalanceTrades
                      ? "bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 text-white cursor-pointer"
                      : "bg-zinc-900 text-zinc-650 border border-zinc-800/50 cursor-not-allowed"
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${targetWeightsSum === 100 && hasRebalanceTrades ? "animate-spin" : ""}`} />
                  EXECUTE REBALANCE TRADES
                </button>
              </div>

            </div>

          </div>

        </section>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: PERSISTENT TRANSACTION LEDGER & PORTFOLIO   */}
        {/* ========================================================= */}
        <section className="col-span-1 lg:col-span-3 space-y-6">
          
          {/* PORTFOLIO TRANSACTION LEDGER PANEL */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-4 shadow-xl">
            
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-bold tracking-widest text-[#f8fafc] uppercase flex items-center gap-2 font-mono">
                  <PieChart className="h-4 w-4 text-blue-400" />
                  PERSISTENT LEDGER
                </h2>
                <p className="text-[10px] text-zinc-500 font-sans">Durable tracker with local storage auto-sync</p>
              </div>
              
              {portfolioItems.length > 0 && (
                <div className="flex items-center gap-2" id="ledger-header-actions">
                  <button
                    onClick={exportPortfolioToCSV}
                    className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/40 px-2 py-0.5 rounded transition-all"
                    id="btn-export-portfolio"
                  >
                    <Download className="h-3 w-3" />
                    Export CSV
                  </button>
                  <button
                    onClick={clearPortfolio}
                    className="text-[10px] font-mono text-zinc-500 hover:text-rose-400 p-1 cursor-pointer"
                    id="btn-clear-portfolio"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* LEDGER SORTING CONTROLS */}
            {portfolioItems.length > 0 && (
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-900/50 font-mono text-[10px]" id="ledger-sort-bar">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span>Sort by:</span>
                  <select
                    value={ledgerSortBy}
                    onChange={(e) => setLedgerSortBy(e.target.value as any)}
                    className="bg-zinc-950 border border-zinc-900 rounded px-2 py-0.5 text-zinc-200 outline-none cursor-pointer focus:border-zinc-700 text-[10px] h-6 font-mono"
                    id="ledger-sort-select"
                  >
                    <option value="value">Current Total Value</option>
                    <option value="date">Purchase Date</option>
                    <option value="gain">Gain Percentage</option>
                  </select>
                </div>
                <div className="text-[9px] text-zinc-500 font-sans">
                  {portfolioItems.length} position{portfolioItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            {/* TRANSACTIONS LIST DISPLAY */}
            <div className="space-y-2 mb-4 overflow-y-auto max-h-[290px] pr-1" id="transactions-bin">
              {portfolioItems.length === 0 ? (
                <div className="border border-zinc-900 bg-zinc-950/40 rounded-2xl p-6 text-center text-zinc-500 text-xs">
                  <Info className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
                  Portfolio ledger is currently empty. Add simulated trades using screener + items or manual widgets.
                </div>
              ) : (
                sortedPortfolioItems.map((item) => {
                  const currentPrice = stocks[item.symbol]?.currentPrice || item.purchase_price;
                  const totalCost = item.shares * item.purchase_price;
                  const totalValue = item.shares * currentPrice;
                  const itemGain = totalValue - totalCost;
                  const itemGainPercent = (itemGain / (totalCost || 1)) * 100;
                  const isPositive = itemGain >= 0;

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 bg-zinc-950/80 border border-zinc-900 rounded-xl hover:border-zinc-800 transition-colors flex justify-between items-center font-mono text-[10px]"
                    >
                      <div className="max-w-[70%]">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => selectSymbol(item.symbol)}
                            className="text-xs font-black text-white hover:text-blue-400 cursor-pointer hover:underline"
                          >
                            {item.symbol}
                          </span>
                          <span className="text-[8px] text-zinc-500 uppercase font-bold bg-zinc-900 border border-zinc-850 px-1 rounded">
                            {item.shares} SHRS
                          </span>
                        </div>
                        
                        <div className="text-zinc-500 mt-0.5 text-[8px]">
                          Buy: ${item.purchase_price.toFixed(2)} on {item.purchase_date}
                        </div>
                      </div>

                      <div className="text-right flex flex-col justify-center items-end">
                        <span className="font-bold text-white">${totalValue.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                        
                        <div className="flex items-center gap-1">
                          <span className={`text-[9px] font-black ${isPositive ? "text-emerald-450" : "text-rose-455"}`}>
                            {isPositive ? "+" : ""}{itemGainPercent.toFixed(1)}%
                          </span>
                          <button
                            onClick={() => deletePortfolioItem(item.id)}
                            className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* QUICK FORM MANUAL ADD TRANSACTION */}
            <div className="border-t border-zinc-900 pt-3">
              <span className="text-[9px] uppercase tracking-wider font-mono text-zinc-450 block font-bold mb-2">RECORD MANUAL TRADE</span>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                addPortfolioItem(selectedSymbol, Number(tradeShares) || 10, Number(tradePrice) || selectedStock.currentPrice, tradeDate);
              }} className="space-y-2">
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5 font-sans">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase font-black">Shares</span>
                    <input
                      type="number"
                      step="any"
                      value={tradeShares}
                      onChange={(e) => setTradeShares(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                  <div className="space-y-0.5 font-sans">
                    <span className="text-[8px] font-mono text-zinc-500 uppercase font-black">Cost ($)</span>
                    <input
                      type="number"
                      step="any"
                      value={tradePrice}
                      onChange={(e) => setTradePrice(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded px-2 py-1 text-xs text-zinc-300 font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-mono font-bold text-[10px] uppercase rounded px-3 py-1 cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Save Asset
                  </button>
                </div>

              </form>
            </div>

          </div>

          {/* PORTFOLIO HISTORICAL PERFORMANCE CHART */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-4 shadow-xl" id="portfolio-performance-card">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-sm font-bold tracking-widest text-[#f8fafc] uppercase flex items-center gap-2 font-mono">
                  <TrendingUp className="h-4 w-4 text-emerald-450" />
                  Portfolio Trend
                </h2>
                <p className="text-[10px] text-zinc-500 font-sans">
                  Total market value over time based on transaction history
                </p>
              </div>
              {portfolioItems.length > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-1.5 py-0.5 rounded">
                  <AnimatedNumber value={totalPortfolioValue} />
                </span>
              )}
            </div>

            {portfolioItems.length === 0 ? (
              <div className="border border-zinc-900 bg-zinc-950/40 rounded-2xl p-6 text-center text-zinc-500 text-xs py-8">
                <Info className="h-6 w-6 text-zinc-700 mx-auto mb-2" />
                No transactions recorded. Add simulated trades in the ledger to render the balance trajectory.
              </div>
            ) : (
              <div className="h-40 w-full font-mono text-[9px] mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioHistoryData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="date" stroke="var(--chart-text)" />
                    <YAxis
                      stroke="var(--chart-text)"
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--tooltip-bg)", borderColor: "var(--tooltip-border)", borderRadius: "10px" }}
                      labelStyle={{ fontWeight: "black", color: "var(--text-main)" }}
                      formatter={(value: any) => [`$${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Portfolio Value"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4, stroke: "#10b981", strokeWidth: 1.5, fill: "var(--tooltip-bg)" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* DYNAMIC WATCHLIST SIDEBAR WATCH LIST PANEL */}
          <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-4 shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold tracking-widest text-[#f8fafc] uppercase flex items-center gap-2 font-mono">
                <Star className="h-4 w-4 text-yellow-550 fill-current text-yellow-550" />
                Active Watchlist
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono font-bold">
                {watchlist.length} Tickers
              </span>
            </div>

            <div className="space-y-1.5">
              {watchlist.length === 0 ? (
                <p className="text-[10px] text-zinc-600 font-sans italic text-center py-4">
                  Star any stocks in the screener table to monitor high-priority items.
                </p>
              ) : (
                watchlist.map((symKey) => {
                  const stock = stocks[symKey];
                  if (!stock) return null;
                  return (
                    <div
                      key={symKey}
                      onClick={() => selectSymbol(symKey)}
                      className="p-2 hover:bg-zinc-900/60 transition-all border border-zinc-900/40 hover:border-zinc-800 rounded-xl flex justify-between items-center cursor-pointer"
                    >
                      <div>
                        <span className="font-mono text-xs font-black text-white px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-900 inline-block mr-2">
                          {stock.symbol}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-sans select-none truncate max-w-[120px]">
                          {stock.name}
                        </span>
                      </div>

                      <div className="text-right font-mono text-[10px]">
                        <span className="font-bold text-white block">${stock.currentPrice.toFixed(2)}</span>
                        <span className={`text-[9px] font-black ${stock.changePercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </section>

      </main>

      {/* ========================================================= */}
      {/* SECTOR VOLATILITY AND RISK RISK MAP HEAT DESIGNS           */}
      {/* ========================================================= */}
      <section className="max-w-[1600px] mx-auto w-full px-4 mt-6">
        <div className="bg-[#09090d] border border-zinc-900 rounded-2xl p-5 shadow-xl">
          
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-3 border-b border-zinc-900">
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 font-mono">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                Cross-Sector Risk Variance Analytics
              </h3>
              <p className="text-[10px] text-zinc-500 font-sans">
                Dynamic risk categorization based on interactive asset valuation metrics.
              </p>
            </div>

            {/* Matrix Display Mode Swappers */}
            <div className="flex bg-[#050508] p-1 border border-zinc-900 rounded-lg text-[9px] font-mono font-bold">
              <button
                onClick={() => setHeatmapViewMode("grid")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${heatmapViewMode === "grid" ? "bg-blue-600 text-white" : "text-zinc-400"}`}
              >
                RISK STATUS GRID
              </button>
              <button
                onClick={() => setHeatmapViewMode("scatter")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${heatmapViewMode === "scatter" ? "bg-blue-600 text-white" : "text-zinc-400"}`}
              >
                PROBABILITY SCATTER
              </button>
              <button
                onClick={() => setHeatmapViewMode("treemap")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${heatmapViewMode === "treemap" ? "bg-blue-600 text-white" : "text-zinc-400"}`}
              >
                RISK TREEMAP
              </button>
              <button
                onClick={() => setHeatmapViewMode("correlation")}
                className={`px-2.5 py-1 rounded transition-all cursor-pointer ${heatmapViewMode === "correlation" ? "bg-blue-600 text-white" : "text-zinc-400"}`}
              >
                ASSET CORRELATION
              </button>
            </div>
          </div>

          {/* DYNAMIC CALCULATOR LOGIC FOR SYSTEM GRAPHING */}
          {(() => {
            // Aggregate metrics by sector
            const sectorMetricsMap: Record<string, { totalVol: number; count: number; meanPe: number; totalChange: number; stocksList: StockData[] }> = {};

            Object.values(stocks).forEach((st) => {
              if (!sectorMetricsMap[st.sector]) {
                sectorMetricsMap[st.sector] = { totalVol: 0, count: 0, meanPe: 0, totalChange: 0, stocksList: [] };
              }
              sectorMetricsMap[st.sector].totalVol += st.volatility;
              sectorMetricsMap[st.sector].count += 1;
              sectorMetricsMap[st.sector].meanPe += st.peRatio;
              sectorMetricsMap[st.sector].totalChange += st.changePercent;
              sectorMetricsMap[st.sector].stocksList.push(st);
            });

            const computedRiskGrid = Object.keys(sectorMetricsMap).map((secKey) => {
              const meta = sectorMetricsMap[secKey];
              const avgVol = parseFloat((meta.totalVol / meta.count).toFixed(2));
              const avgPe = parseFloat((meta.meanPe / meta.count).toFixed(1));
              const avgChange = parseFloat((meta.totalChange / meta.count).toFixed(2));

              let riskTier: "HIGH" | "MODERATE" | "LOW" = "LOW";
              if (avgVol > 2.5) riskTier = "HIGH";
              else if (avgVol > 1.5) riskTier = "MODERATE";

              return {
                sector: secKey,
                avgVol,
                avgPe,
                avgChange,
                riskTier,
                assetCount: meta.count,
                assets: meta.stocksList,
              };
            });

            return (
              <div>
                
                {/* 1. GRID OF CARDS WITH METRICS HEAT INDICATIONS */}
                {heatmapViewMode === "grid" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {computedRiskGrid.map((row) => (
                      <div
                        key={row.sector}
                        className={`p-3.5 rounded-xl border bg-zinc-950/40 font-mono text-[10px] ${
                          row.riskTier === "HIGH" ? "border-rose-500/20 shadow-lg shadow-rose-950/5" :
                          row.riskTier === "MODERATE" ? "border-amber-500/20 shadow-lg shadow-amber-950/5" :
                          "border-emerald-500/10"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-black text-white">{row.sector}</span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            row.riskTier === "HIGH" ? "bg-rose-500/10 text-rose-450 border border-rose-500/20" :
                            row.riskTier === "MODERATE" ? "bg-amber-500/10 text-amber-440 border border-amber-500/20" :
                            "bg-emerald-500/10 text-emerald-440 border border-emerald-500/20"
                          }`}>
                            {row.riskTier} RISK
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 my-3 text-center">
                          <div className="bg-[#050508] p-1.5 border border-zinc-900 rounded-lg">
                            <span className="text-[7.5px] text-zinc-550 block font-bold">AVG VOLATILITY</span>
                            <span className="text-[12px] text-slate-200 font-extrabold">{row.avgVol.toFixed(1)}%</span>
                          </div>
                          <div className="bg-[#050508] p-1.5 border border-zinc-900 rounded-lg">
                            <span className="text-[7.5px] text-zinc-550 block font-bold">AVG REVS YIELD</span>
                            <span className={`text-[12px] font-extrabold ${row.avgChange >= 0 ? "text-emerald-450" : "text-rose-455"}`}>
                              {row.avgChange >= 0 ? "+" : ""}{row.avgChange}%
                            </span>
                          </div>
                        </div>

                        {/* List assets of this sector */}
                        <div className="space-y-1">
                          <span className="text-[7.5px] text-zinc-500 uppercase block font-bold">EXPOSURE DETAIL</span>
                          {row.assets.map((ast) => (
                            <div
                              key={ast.symbol}
                              onClick={() => selectSymbol(ast.symbol)}
                              className="px-2 py-1 bg-zinc-950 rounded border border-zinc-900/60 hover:border-zinc-850 flex justify-between items-center cursor-pointer"
                            >
                              <span className="font-extrabold text-[#f1f5f9]">{ast.symbol}</span>
                              <span className="text-zinc-450">Vol: {ast.volatility.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>

                      </div>
                    ))}
                  </div>
                )}

                {/* 2. RECHARTS SCATTER MATRIX OF STOCK SYMBOLS VS FINANCIALS */}
                {heatmapViewMode === "scatter" && (
                  <div className="bg-[#050508] border border-zinc-900 p-4 rounded-xl">
                    <div className="h-64 w-full font-mono text-[9px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                          <XAxis type="number" dataKey="volatility" name="Volatility" unit="%" stroke="var(--chart-text)" domain={[1.0, 4.0]} />
                          <YAxis type="number" dataKey="changePercent" name="Day Return" unit="%" stroke="var(--chart-text)" />
                          <ZAxis type="number" dataKey="peRatio" name="P/E Multiple" range={[80, 500]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "#09090d", borderColor: "#27272a", borderRadius: "10px" }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const info = payload[0].payload as StockData;
                                return (
                                  <div className="p-3 bg-[#09090d] border border-zinc-800 rounded-xl space-y-1 text-slate-300 font-sans text-xs">
                                    <p className="font-black text-white">{info.symbol} ({info.name})</p>
                                    <p className="text-[10px] text-zinc-500">Sector: {info.sector}</p>
                                    <p>Volatility Metric: <strong className="font-mono text-zinc-100">{info.volatility}%</strong></p>
                                    <p className={info.changePercent >= 0 ? "text-emerald-450" : "text-rose-455"}>
                                      Day Return: {info.changePercent >= 0 ? "+" : ""}{info.changePercent}%
                                    </p>
                                    <p className="text-[10px] font-mono text-zinc-500">Bubble Size: {info.peRatio}x P/E</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter name="Risk Metrics Grid" data={Object.values(stocks)}>
                            {Object.values(stocks).map((entry, idx) => {
                              const bubbleColor = entry.volatility > 2.5 ? "#f43f5e" : entry.volatility > 1.5 ? "#f59e0b" : "#10b981";
                              return (
                                <Cell
                                  key={`cell-${idx}`}
                                  fill={bubbleColor}
                                  fillOpacity={0.6}
                                  stroke={bubbleColor}
                                  strokeWidth={1}
                                  className="cursor-pointer"
                                  onClick={() => selectSymbol(entry.symbol)}
                                />
                              );
                            })}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center items-center gap-6 text-[9px] text-zinc-400 font-mono mt-3 select-none">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span>Low Volatility Zone (&lt;1.5%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>Moderate Buffer Zone (1.5% - 2.5%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>High Tail-Risk Sector (&gt;2.5%)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. RECHARTS RISK TREEMAP PORTFOLIO BOX */}
                {heatmapViewMode === "treemap" && (
                  <div className="bg-[#050508] border border-zinc-900 p-4 rounded-xl">
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                          data={[
                            {
                              name: "Risk Segments",
                              children: Object.values(stocks).map((st) => ({
                                name: st.symbol,
                                size: (st.peRatio || 20) * 10,
                                volatility: st.volatility,
                                changePercent: st.changePercent,
                              })),
                            },
                          ]}
                          dataKey="size"
                          aspectRatio={4 / 3}
                          stroke="#040406"
                          fill="#3b82f6"
                          content={<PortfolioTreeMapTile />}
                        />
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* 4. FINANCIAL RETURNS CORRELATION MATRIX HEATMAP */}
                {heatmapViewMode === "correlation" && (
                  <div className="bg-transparent rounded-xl">
                    <CorrelationMatrix
                      stocks={stocks}
                      watchlist={watchlist}
                      portfolioItems={portfolioItems}
                      selectSymbol={selectSymbol}
                    />
                  </div>
                )}

              </div>
            );
          })()}

        </div>
      </section>

      {/* --- QUICK SELECTION ADD TO PORTFOLIO DIALOG BOX --- */}
      {quickAddModalStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0e0e12] border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden font-sans">
            <div className="h-1 w-full bg-blue-600" />

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Log Position holding
                  </h3>
                  <p className="text-[10px] text-zinc-500">Record persistent local storage trade coordinates</p>
                </div>
                <button
                  onClick={() => setQuickAddModalStock(null)}
                  className="p-1 rounded bg-[#1c1c24] text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Asset Snapshot */}
              <div className="bg-[#050508] p-3 rounded-xl border border-zinc-900 flex justify-between items-center">
                <div>
                  <span className="font-mono text-xs font-black bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-blue-400 uppercase">
                    {quickAddModalStock.symbol}
                  </span>
                  <p className="text-[11px] font-bold text-white mt-1.5 truncate max-w-[150px]">{quickAddModalStock.name}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-slate-100 block">${quickAddModalStock.currentPrice.toFixed(2)}</span>
                  <span className={`font-mono text-[9px] ${quickAddModalStock.changePercent >= 0 ? "text-emerald-450" : "text-rose-455"}`}>
                    {quickAddModalStock.changePercent >= 0 ? "+" : ""}{quickAddModalStock.changePercent}%
                  </span>
                </div>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleQuickAddSubmit} className="space-y-3 font-mono text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block">Shares quantity</span>
                    <input
                      type="number"
                      value={tradeShares}
                      onChange={(e) => setTradeShares(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-zinc-500 font-bold block">Cost basis ($)</span>
                    <input
                      type="number"
                      step="any"
                      value={tradePrice}
                      onChange={(e) => setTradePrice(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-zinc-500 font-bold block">Acquisition Date</span>
                  <input
                    type="date"
                    value={tradeDate}
                    onChange={(e) => setTradeDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded px-2.5 py-1.5 text-zinc-300 outline-none"
                  />
                </div>

                {/* Simulated Pricing cost preview block */}
                {(() => {
                  const valTotal = (Number(tradeShares) || 0) * (Number(tradePrice) || 0);
                  return (
                    <div className="bg-blue-600/5 border border-blue-500/10 p-2.5 rounded-xl flex justify-between items-center text-zinc-450">
                      <span>Total Purchase Cost:</span>
                      <span className="text-blue-400 font-black">${valTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setQuickAddModalStock(null)}
                    className="flex-1 py-1.5 rounded-lg bg-zinc-900 border border-zinc-850 text-zinc-400 font-bold cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 rounded-lg bg-blue-600 text-white font-bold cursor-pointer hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/15"
                  >
                    Log Trade
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* --- TRANSACTION HISTORY DIALOG BOX --- */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" id="transaction-history-modal">
          <div className="bg-[#0e0e12] border border-zinc-800 rounded-2xl w-full max-w-xl shadow-2xl relative overflow-hidden font-sans">
            <div className="h-1 w-full bg-blue-600" />

            <div className="p-5 space-y-4">
              {/* Modal Title Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <History className="h-4 w-4 text-blue-400" />
                    Transaction History: {selectedStock.symbol}
                  </h3>
                  <p className="text-[10px] text-zinc-500">Chronological ledger of logged acquisitions for {selectedStock.name}</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1 rounded bg-[#1c1c24] text-zinc-400 hover:text-white border border-zinc-800 cursor-pointer transition-colors"
                  id="close-history-modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Transactions List */}
              {(() => {
                const stockTrades = portfolioItems.filter(
                  (item) => item.symbol.toUpperCase() === selectedStock.symbol.toUpperCase()
                );

                // Default sort is chronological (oldest to newest)
                const sortedTrades = [...stockTrades].sort((a, b) => {
                  return new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
                });

                if (sortedTrades.length === 0) {
                  return (
                    <div className="border border-zinc-900 bg-zinc-950/40 rounded-xl p-8 text-center text-zinc-500 text-xs font-mono py-12">
                      <Info className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                      No past transactions logged for {selectedStock.symbol} ({selectedStock.name}).
                      <p className="text-[10px] text-zinc-600 mt-1">Add holdings in the Quick Selection modal or the persistent ledger to track positions.</p>
                    </div>
                  );
                }

                // Calculate summary metrics for this stock's logged trades
                const totalShares = sortedTrades.reduce((sum, t) => sum + t.shares, 0);
                const totalCost = sortedTrades.reduce((sum, t) => sum + (t.shares * t.purchase_price), 0);
                const avgPrice = totalCost / (totalShares || 1);
                const currentValue = totalShares * selectedStock.currentPrice;
                const netGain = currentValue - totalCost;
                const netGainPercent = (netGain / (totalCost || 1)) * 100;

                return (
                  <div className="space-y-4">
                    {/* Summary Card for selected stock position */}
                    <div className="grid grid-cols-3 gap-2.5 bg-zinc-950/80 border border-zinc-900 rounded-xl p-3 font-mono text-[10px] text-zinc-400">
                      <div>
                        <span className="text-zinc-500 block text-[8px] font-bold uppercase">Total Position</span>
                        <span className="text-white font-black">{totalShares.toLocaleString()} Shares</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[8px] font-bold uppercase">Avg Cost Basis</span>
                        <span className="text-white font-black">${avgPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[8px] font-bold uppercase">Net Unrealized P&L</span>
                        <span className={`font-black ${netGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          ${netGain.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({netGainPercent >= 0 ? "+" : ""}{netGainPercent.toFixed(2)}%)
                        </span>
                      </div>
                    </div>

                    {/* Table-like chronological trade records */}
                    <div className="border border-zinc-900 rounded-xl overflow-hidden bg-zinc-950/50">
                      <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-zinc-900/30 border-b border-zinc-900 text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                        <div className="col-span-3">Acquisition Date</div>
                        <div className="col-span-3 text-right">Shares (Vol)</div>
                        <div className="col-span-3 text-right">Acq. Price</div>
                        <div className="col-span-2 text-right">P&L Status</div>
                        <div className="col-span-1 text-right">Action</div>
                      </div>

                      <div className="max-h-[220px] overflow-y-auto divide-y divide-zinc-900">
                        {sortedTrades.map((trade) => {
                          const tradeGain = (selectedStock.currentPrice - trade.purchase_price) * trade.shares;
                          const tradeGainPercent = ((selectedStock.currentPrice - trade.purchase_price) / (trade.purchase_price || 1)) * 100;
                          
                          return (
                            <div key={trade.id} className="grid grid-cols-12 gap-1 px-3 py-2.5 items-center font-mono text-[10px] hover:bg-zinc-900/10 transition-colors">
                              <div className="col-span-3 text-zinc-300 flex items-center gap-1.5">
                                <Calendar className="h-3 w-3 text-zinc-600" />
                                {trade.purchase_date}
                              </div>
                              <div className="col-span-3 text-right text-slate-100 font-bold font-mono">
                                {trade.shares.toLocaleString()}
                              </div>
                              <div className="col-span-3 text-right text-zinc-300 font-mono">
                                ${trade.purchase_price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                              </div>
                              <div className={`col-span-2 text-right font-bold font-mono ${tradeGain >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {tradeGainPercent >= 0 ? "+" : ""}{tradeGainPercent.toFixed(1)}%
                              </div>
                              <div className="col-span-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => deletePortfolioItem(trade.id)}
                                  className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 cursor-pointer transition-colors inline-flex justify-center items-center"
                                  title="Delete this transaction"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 text-xs rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold font-mono cursor-pointer transition-all"
                >
                  CLOSE DIALOG
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Wrap complete console layout in standard StockProvider state container
export default function FinancialIntelligencePortal() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleResizeObserverError = (e: ErrorEvent) => {
      const msg = e.message || "";
      if (
        msg.includes("ResizeObserver loop limit exceeded") ||
        msg.includes("ResizeObserver loop completed with undelivered notifications") ||
        msg.includes("Script error")
      ) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    };

    let originalOnError: typeof window.onerror = null;

    if (typeof window !== "undefined") {
      window.addEventListener("error", handleResizeObserverError);
      
      originalOnError = window.onerror;
      window.onerror = function (message, source, lineno, colno, error) {
        const msg = String(message || "");
        if (
          msg.includes("ResizeObserver") ||
          msg.includes("Script error") ||
          msg.includes("loop limit exceeded")
        ) {
          return true; // prevent default error handling
        }
        if (originalOnError) {
          return originalOnError.apply(this, [message, source, lineno, colno, error]);
        }
        return false;
      };

      // Also suppress unhandled promise rejections for ResizeObserver or Script errors
      const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
        const reason = e.reason;
        const msg = reason ? String(reason.message || reason) : "";
        if (
          msg.includes("ResizeObserver") ||
          msg.includes("Script error") ||
          msg.includes("loop limit exceeded")
        ) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      };
      window.addEventListener("unhandledrejection", handleUnhandledRejection);

      return () => {
        window.removeEventListener("error", handleResizeObserverError);
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
        if (window.onerror === window.onerror) {
          window.onerror = originalOnError;
        }
      };
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#030303] text-zinc-500 font-sans flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          <p className="text-xs font-mono select-none tracking-widest text-zinc-650 uppercase animate-pulse">Initializing Financial Intelligence Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <StockProvider>
        <DashboardConsole />
        <AuthModal />
      </StockProvider>
    </AuthProvider>
  );
}
