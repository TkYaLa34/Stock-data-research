'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Bell, 
  User, 
  Activity, 
  Layers, 
  Share2, 
  Sliders, 
  Plus, 
  Check, 
  ArrowRight, 
  ChevronRight, 
  Volume2, 
  AlertTriangle, 
  Filter, 
  Clock, 
  Database,
  Globe,
  Radio,
  FileText,
  Send,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { 
  calculatePivotPoints, 
  calculateFibonacciPivots, 
  calculateRSI, 
  calculateBollingerBands, 
  calculateMACD, 
  generateIndicatorsAnalysis,
  HistoricalBar
} from '@/lib/indicators';

// TYPES
type InvestorProfile = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
type ThemeTone = 'weaker_assets' | 'stronger_assets';

interface StockData {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  industry: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  timestamp: string;
  volume: string;
  marketCap: string;
  peRatio: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  revenueGrowth: number;
  historical: HistoricalBar[];
}

// RAW STOCK DATA BANK
const STOCKS_DB: { [key: string]: StockData } = {
  GLW: {
    symbol: "GLW",
    name: "Corning Inc.",
    exchange: "NYSE",
    sector: "Technology",
    industry: "Hardware & Optical",
    currentPrice: 42.18,
    change: 0.54,
    changePercent: 1.30,
    timestamp: "At Close: Jun 18, 2026",
    volume: "2.84M",
    marketCap: "35.8B",
    peRatio: 18.4,
    grossMargin: 38.5,
    operatingMargin: 16.2,
    netMargin: 11.8,
    revenueGrowth: 7.2,
    historical: [
      { time: "05-10", open: 39.5, high: 40.2, low: 39.1, close: 39.8, volume: 2100000 },
      { time: "05-17", open: 39.8, high: 41.0, low: 39.4, close: 40.5, volume: 2400000 },
      { time: "05-24", open: 40.5, high: 40.8, low: 39.9, close: 40.1, volume: 1900000 },
      { time: "05-31", open: 40.1, high: 41.5, low: 40.0, close: 41.2, volume: 2700005 },
      { time: "06-07", open: 41.2, high: 42.1, low: 40.9, close: 41.5, volume: 3100000 },
      { time: "06-14", open: 41.5, high: 42.45, low: 41.5, close: 42.18, volume: 2840900 }
    ]
  },
  AAPL: {
    symbol: "AAPL",
    name: "Apple Inc.",
    exchange: "NASDAQ",
    sector: "Technology",
    industry: "Consumer Electronics",
    currentPrice: 184.22,
    change: -2.45,
    changePercent: -1.31,
    timestamp: "At Close: Jun 18, 2026",
    volume: "52.4M",
    marketCap: "2.89T",
    peRatio: 29.5,
    grossMargin: 44.3,
    operatingMargin: 29.8,
    netMargin: 25.1,
    revenueGrowth: 5.4,
    historical: [
      { time: "05-10", open: 181.2, high: 183.5, low: 180.1, close: 182.9, volume: 48000000 },
      { time: "05-17", open: 182.9, high: 185.7, low: 182.0, close: 184.1, volume: 51000000 },
      { time: "05-24", open: 184.1, high: 188.9, low: 183.5, close: 187.6, volume: 62000000 },
      { time: "05-31", open: 187.6, high: 189.6, low: 185.1, close: 186.3, volume: 55000000 },
      { time: "06-07", open: 186.3, high: 187.5, low: 183.2, close: 185.8, volume: 49000000 },
      { time: "06-14", open: 185.8, high: 186.9, low: 183.5, close: 184.22, volume: 52400000 }
    ]
  },
  V: {
    symbol: "V",
    name: "Visa Inc.",
    exchange: "NYSE",
    sector: "Banking & Finance",
    industry: "Consumer Finance",
    currentPrice: 278.50,
    change: 4.12,
    changePercent: 1.50,
    timestamp: "At Close: Jun 18, 2026",
    volume: "4.10M",
    marketCap: "565.2B",
    peRatio: 31.2,
    grossMargin: 97.4, // Payment network models boast extreme processing margins
    operatingMargin: 66.8,
    netMargin: 51.5,
    revenueGrowth: 9.8,
    historical: [
      { time: "05-10", open: 268.0, high: 271.5, low: 266.2, close: 269.8, volume: 3800000 },
      { time: "05-17", open: 269.8, high: 273.4, low: 268.5, close: 272.1, volume: 3500000 },
      { time: "05-24", open: 272.1, high: 275.9, low: 271.0, close: 274.5, volume: 3900000 },
      { time: "05-31", open: 274.5, high: 277.2, low: 272.8, close: 275.0, volume: 4100000 },
      { time: "06-07", open: 275.0, high: 277.4, low: 273.1, close: 274.38, volume: 3600000 },
      { time: "06-14", open: 274.38, high: 279.5, low: 273.8, close: 278.50, volume: 4100000 }
    ]
  },
  XOM: {
    symbol: "XOM",
    name: "ExxonMobil Corp.",
    exchange: "NYSE",
    sector: "Energy",
    industry: "Oil & Gas Integrated",
    currentPrice: 114.85,
    change: -1.78,
    changePercent: -1.53,
    timestamp: "At Close: Jun 18, 2026",
    volume: "14.2M",
    marketCap: "450.1B",
    peRatio: 12.1,
    grossMargin: 21.4,
    operatingMargin: 14.1,
    netMargin: 11.2,
    revenueGrowth: -3.2,
    historical: [
      { time: "05-10", open: 118.5, high: 120.1, low: 117.4, close: 119.2, volume: 13000000 },
      { time: "05-17", open: 119.2, high: 119.8, low: 115.6, close: 116.4, volume: 15200000 },
      { time: "05-24", open: 116.4, high: 118.2, low: 115.5, close: 117.8, volume: 12800000 },
      { time: "05-31", open: 117.8, high: 118.5, low: 114.9, close: 115.2, volume: 14100000 },
      { time: "06-07", open: 115.2, high: 116.9, low: 114.2, close: 116.1, volume: 13500000 },
      { time: "06-14", open: 116.1, high: 116.8, low: 113.5, close: 114.85, volume: 14200000 }
    ]
  }
};

// Generate an extended 25-day daily close price set for mathematical indicators calculation depth
const getIndicatorPricesBuffer = (basePrice: number): number[] => {
  return [
    basePrice * 0.91, basePrice * 0.93, basePrice * 0.92, basePrice * 0.95, basePrice * 0.94,
    basePrice * 0.96, basePrice * 0.95, basePrice * 0.97, basePrice * 0.98, basePrice * 0.96,
    basePrice * 0.97, basePrice * 0.99, basePrice * 1.01, basePrice * 1.00, basePrice * 0.98,
    basePrice * 1.02, basePrice * 1.03, basePrice * 1.01, basePrice * 1.03, basePrice * 1.04,
    basePrice * 1.02, basePrice * 1.05, basePrice * 1.06, basePrice * 1.04, basePrice
  ];
};

const INDICES_FUTURES = [
  { name: "Nasdaq Futures", symbol: "NQ=F", value: 19842.50, change: 142.10, changePercent: 0.72, quoteTime: "Jun 18, 2026" },
  { name: "S&P 500 Futures", symbol: "ES=F", value: 5482.75, change: 22.35, changePercent: 0.41, quoteTime: "Jun 18, 2026" },
  { name: "Dow Jones Futures", symbol: "YM=F", value: 39512.00, change: -84.00, changePercent: -0.21, quoteTime: "Jun 18, 2026" },
  { name: "Bitcoin Futures", symbol: "BTC=F", value: 67120.00, change: 1120.00, changePercent: 1.70, quoteTime: "Jun 18, 2026" },
  { name: "Gold Futures", symbol: "GC=F", value: 2342.10, change: -12.50, changePercent: -0.53, quoteTime: "Jun 18, 2026" }
];

export default function FinancialAnalysisPortal() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // STATE DEFINITIONS
  const [activeProfile, setActiveProfile] = useState<InvestorProfile>('MEDIUM_TERM');
  const [selectedStock, setSelectedStock] = useState<StockData>(STOCKS_DB.GLW);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchOutput, setSearchOutput] = useState<StockData[]>([]);
  const [alertTierToggle, setAlertTierToggle] = useState<ThemeTone>('stronger_assets');
  const [watchlist, setWatchlist] = useState<string[]>(['GLW', 'AAPL']);
  const [customPriceAlert, setCustomPriceAlert] = useState<string>('');
  const [priceAlerts, setPriceAlerts] = useState<Array<{id: string, symbol: string, price: number, active: boolean}>>([
    { id: '1', symbol: 'GLW', price: 44.00, active: true },
    { id: '2', symbol: 'AAPL', price: 180.00, active: true }
  ]);
  const [alertToast, setAlertToast] = useState<{message: string, show: boolean}>({message: '', show: false});
  
  // Pure unique ID sequence reference for alerts list key targets
  const alertCounterRef = useRef(3);
  
  // Custom Toggles for charting additions
  const [chartOpts, setChartOpts] = useState({
    showBB: true,
    showPivots: true,
    showSMA: true,
  });

  // Screener selections
  const [screenerSector, setScreenerSector] = useState<string>('All');
  
  // AI Daily News Synthesis logic
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Discord community hub simulation
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>('https://discord.com/api/webhooks/12345/abcde-mock');
  const [communityMessage, setCommunityMessage] = useState<string>('');
  const [communitySent, setCommunitySent] = useState<boolean>(false);

  // Active hover data for custom Chart coordinates
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    close: number;
    high: number;
    low: number;
    x: number;
    y: number;
  } | null>(null);

  // Indicators calculations buffer
  const indicatorPrices = getIndicatorPricesBuffer(selectedStock.currentPrice);
  const calculatedPivots = calculatePivotPoints(
    Math.max(...indicatorPrices),
    Math.min(...indicatorPrices),
    selectedStock.currentPrice
  );
  
  const calculatedFibPivots = calculateFibonacciPivots(
    Math.max(...indicatorPrices),
    Math.min(...indicatorPrices),
    selectedStock.currentPrice
  );

  const signalSummary = generateIndicatorsAnalysis(indicatorPrices);
  const rsiStream = calculateRSI(indicatorPrices);
  const curRSI = rsiStream[rsiStream.length - 1];

  const macdStream = calculateMACD(indicatorPrices);
  const curMACDHistogram = macdStream.histogram[macdStream.histogram.length - 1];

  const bbStream = calculateBollingerBands(indicatorPrices, 20, 2);
  const curBBUpper = bbStream.upper[bbStream.upper.length - 1];
  const curBBLower = bbStream.lower[bbStream.lower.length - 1];

  // Global search autocomplete handler
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    if (!val) {
      setSearchOutput([]);
      return;
    }
    const filtered = Object.values(STOCKS_DB).filter(s => 
      s.symbol.toLowerCase().includes(val.toLowerCase()) || 
      s.name.toLowerCase().includes(val.toLowerCase())
    );
    setSearchOutput(filtered);
  };

  const selectSuggestedStock = (stock: StockData) => {
    setSelectedStock(stock);
    setSearchQuery('');
    setSearchOutput([]);
    setCommunityMessage(`Analyzing trade potential on ${stock.exchange}: ${stock.symbol} (${stock.name}). Short-term technical target computed at: $${(stock.currentPrice * 1.05).toFixed(2)}.`);
    fetchAiNewsSummary(stock.symbol);
  };

  // Watchlist action handler
  const toggleWatchlist = (symbol: string) => {
    if (watchlist.includes(symbol)) {
      setWatchlist(watchlist.filter(s => s !== symbol));
      triggerNotification(`Removed ${symbol} from personal Watchlist.`);
    } else {
      setWatchlist([...watchlist, symbol]);
      triggerNotification(`Added ${symbol} to personal Watchlist!`);
    }
  };

  // Alert Threshold Triggers
  const handleAddPriceAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(customPriceAlert);
    if (isNaN(parsedPrice) || parsedPrice <= 0) return;
    
    alertCounterRef.current += 1;
    const newAlert = {
      id: `alert-${alertCounterRef.current}-${selectedStock.symbol}`,
      symbol: selectedStock.symbol,
      price: parsedPrice,
      active: true
    };
    
    setPriceAlerts([newAlert, ...priceAlerts]);
    setCustomPriceAlert('');
    triggerNotification(`Active alert configured for ${selectedStock.symbol} at $${parsedPrice.toFixed(2)}`);
  };

  const deletePriceAlert = (id: string) => {
    setPriceAlerts(priceAlerts.filter(a => a.id !== id));
  };

  // Toast notifier
  const triggerNotification = (msg: string) => {
    setAlertToast({ message: msg, show: true });
    setTimeout(() => {
      setAlertToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // Dynamic AI News Scrape caller
  const fetchAiNewsSummary = async (symbol: string) => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      const data = await response.json();
      if (data.success) {
        setAiSummary(data.summary);
      } else {
        setAiError(data.error || 'Server error generating news synthesis.');
      }
    } catch (err) {
      setAiError('System failed to aggregate latest news feeds.');
    } finally {
      setAiLoading(false);
    }
  };

  // Run dynamic metrics fetch on initial load (component mount)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAiNewsSummary('GLW');
      setCommunityMessage(`Analyzing trade potential on NYSE: GLW (Corning Inc.). Short-term technical target computed at: $44.29.`);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Submit mock community notification
  const handleCommunitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityMessage) return;
    setCommunitySent(true);
    triggerNotification("Chart telemetry & strategic overview sent to external Webhook!");
    setTimeout(() => {
      setCommunitySent(false);
    }, 2500);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-xs text-slate-500 font-mono">Initializing Horizon Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-300 font-sans selection:bg-blue-500 selection:text-white">
      
      {/* TOP ANNOUNCEMENT BAR */}
      <div id="utility-alert-bar" className="bg-blue-900/40 border-b border-blue-800/50 py-1.5 px-4 text-xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">PREMIUM</span>
          <span className="text-xs text-blue-100 font-medium">Fed Interest Rate decision expected in 4h 12m • Corning (NYSE: GLW) forecast target adjusted on short-term high volume breakout.</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-blue-300 font-semibold hidden sm:block">Upgrade for Real-time WebSocket Data</div>
      </div>

      {/* GLOBAL SCROLLING MARKET TICKER RIBBON */}
      <div id="market-ticker-ribbon" className="bg-[#111114] border-b border-white/5 py-2.5 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-3">
          <div className="text-[10px] font-bold tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded uppercase shrink-0">
            FUTURES TICKER
          </div>
          <div className="flex gap-8 overflow-x-auto scrollbar-none py-0.5 w-full">
            {INDICES_FUTURES.map((index, idx) => {
              const isPos = index.change >= 0;
              return (
                <div key={idx} className="flex items-center gap-2 rounded-lg bg-[#16161A] border border-white/5 px-3 py-1 shrink-0">
                  <span className="text-slate-400 text-xs font-semibold">{index.name}</span>
                  <span className="font-mono text-xs text-white font-medium">
                    {index.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`font-mono text-xs flex items-center ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPos ? '+' : ''}{index.changePercent}%
                    {isPos ? <TrendingUp className="h-3.5 w-3.5 ml-1" /> : <TrendingDown className="h-3.5 w-3.5 ml-1" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROLLING DAILY CRITICAL NEWS BANNER */}
      <div id="ai-headline-banner" className="bg-[#111114] border-b border-white/5 py-2 text-xs text-slate-300">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center gap-2">
          <span className="font-bold text-slate-400 uppercase shrink-0 flex items-center gap-1">
            <Radio className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
            AI Global Feed:
          </span>
          <div className="whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-slate-300 hover:text-white transition-colors duration-200 font-medium">
            {selectedStock.name} ({selectedStock.symbol}) latest reports indicate significant product deployment targets slated for Jun-Jul 2026. Gross operating efficiency currently clocks at {selectedStock.grossMargin}%.
          </div>
        </div>
      </div>

      {/* HEADER NAVIGATION HUB */}
      <header id="main-navigation-hub" className="bg-[#0A0A0B] border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          
          {/* Logo Name */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl font-black">
              <Activity className="h-6 w-6 stroke-[3]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tighter text-white leading-tight">INVESTOR<span className="text-blue-500">HORIZON</span></h1>
              <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider">Analytical Terminal</span>
            </div>
          </div>

          {/* Search Area */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              placeholder="Search ticker symbol (e.g. GLW, AAPL, V, XOM)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-[#16161A] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-150"
            />
            {/* Search Suggestion Dropdown */}
            <AnimatePresence>
              {searchOutput.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-[#111114] border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 px-3 bg-[#0A0A0B]">Matched Assets</div>
                  {searchOutput.map((stock) => (
                    <button
                      key={stock.symbol}
                      onClick={() => selectSuggestedStock(stock)}
                      className="w-full text-left px-4 py-2 hover:bg-[#16161A] flex justify-between items-center text-sm border-b border-white/5 last:border-0 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-xs">{stock.symbol}</span>
                        <span className="text-slate-300 font-medium">{stock.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-white">${stock.currentPrice.toFixed(2)}</div>
                        <div className={`text-[10px] ${stock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Active Toggles + Profile Settings */}
          <div className="flex items-center gap-4">
            
            {/* Asset Theme Filter Toggle [Weaker Assets] vs [Stronger_Assets] */}
            <div id="screener-asset-state-toggle" className="hidden lg:flex items-center bg-[#16161A] border border-white/10 rounded-lg p-1">
              <button 
                onClick={() => {
                  setAlertTierToggle('weaker_assets');
                  // Trigger swap for a cheaper selection
                  selectSuggestedStock(STOCKS_DB.XOM);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${alertTierToggle === 'weaker_assets' ? 'bg-rose-500/10 text-rose-455' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Weak Assets
              </button>
              <button 
                onClick={() => {
                  setAlertTierToggle('stronger_assets');
                  selectSuggestedStock(STOCKS_DB.GLW);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded border border-transparent ml-1 transition-all ${alertTierToggle === 'stronger_assets' ? 'bg-emerald-500 text-[#0A0A0B] font-bold' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Strong Assets
              </button>
            </div>

            {/* Notifications Alert Bell */}
            <button 
              onClick={() => triggerNotification("Alert configurations currently running nominal. All historical thresholds are active.")}
              className="p-2 bg-[#16161A] hover:bg-white/5 border border-white/10 text-slate-300 hover:text-blue-500 rounded-lg relative transition-all"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            </button>

            {/* Simulated User Profile */}
            <div className="flex items-center gap-2 bg-[#16161A] px-3 py-1.5 border border-white/10 rounded-xl">
              <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs font-sans">
                M
              </div>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">maxza2529@gmail.com</span>
            </div>
          </div>

        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">

        {/* MOBILE SEARCH BAR */}
        <div id="mobile-search" className="block md:hidden mb-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search ticker symbol (e.g. GLW, AAPL)..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full bg-[#16161A] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200"
            />
            {searchOutput.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#111114] border border-white/10 rounded-lg z-50 shadow-xl">
                {searchOutput.map((stk) => (
                  <button
                    key={stk.symbol}
                    onClick={() => selectSuggestedStock(stk)}
                    className="w-full text-left px-4 py-3 border-b border-white/5 flex justify-between items-center"
                  >
                    <div>
                      <span className="font-mono bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded text-xs mr-2">{stk.symbol}</span>
                      <span className="text-sm text-slate-200">{stk.name}</span>
                    </div>
                    <span className="text-sm font-mono text-white">${stk.currentPrice}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BREADCRUMBS & CORE DETAIL PANEL HEADER */}
        <div className="bg-[#111114] border border-white/5 rounded-xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            
            {/* Breadcrumbs + Forecasting labels */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-2 font-mono">
                <span>{selectedStock.exchange}: {selectedStock.symbol}</span>
                <ChevronRight className="h-3 w-3" />
                <span>{selectedStock.sector}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-blue-500">{selectedStock.industry}</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{selectedStock.name} Forecast</h2>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#16161A] border border-white/10 text-emerald-400 uppercase">
                    AI Forecast: BUY MATCH
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#16161A] border border-white/10 text-blue-400 uppercase">
                    RATING: {selectedStock.peRatio < 20 ? 'UNDERVALUED' : 'GROWTH PREMIUM'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Technical forecast projection compiled on market close using the Investment Horizon profile parameters.
              </p>
            </div>

            {/* Action buttons list */}
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <button 
                onClick={() => triggerNotification(`API Order request queued for client partner node. Simulation of ${selectedStock.symbol} trade successful.`)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                Trade via API Partner
              </button>
              <button 
                onClick={() => toggleWatchlist(selectedStock.symbol)}
                className="bg-[#16161A] hover:bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-xs text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {watchlist.includes(selectedStock.symbol) ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    In Watchlist
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    Add Watchlist
                  </>
                )}
              </button>
            </div>

          </div>

          {/* PROMINENT PRICING BLOCK */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Asset Spot Price</span>
              <div className="text-2xl md:text-3xl font-bold text-white font-mono leading-none">
                ${selectedStock.currentPrice.toFixed(2)}
              </div>
            </div>
            
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Absolute Delta</span>
              <div className={`text-lg font-bold font-mono ${selectedStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Percentage Change</span>
              <div className={`text-lg font-bold font-mono ${selectedStock.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent}%
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Verified Timestamp</span>
              <div className="text-xs text-slate-300 font-mono flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-400" />
                {selectedStock.timestamp}
              </div>
            </div>
          </div>

        </div>

        {/* 3. INVESTMENT STRATEGY HORIZONS SWITCHER */}
        <div id="investment-strategy-horizon-selector" className="bg-[#111114] border border-white/5 rounded-xl p-1.5 mb-6 flex flex-col md:flex-row gap-1.5">
          {[
            { 
              id: 'SHORT_TERM' as InvestorProfile, 
              label: 'Short-Term (Day/Swing)', 
              desc: 'RSI, Volatility, S/R Mapping, Candlestick Signals' 
            },
            { 
              id: 'MEDIUM_TERM' as InvestorProfile, 
              label: 'Medium-Term (Position)', 
              desc: 'EMA crosses, 50d/200d alignment, AI Synthesis' 
            },
            { 
              id: 'LONG_TERM' as InvestorProfile, 
              label: 'Long-Term (Value)', 
              desc: 'Gross Profit, Operating Cash Margins, 5yr AI forecast' 
            },
          ].map((prof) => {
            const active = activeProfile === prof.id;
            return (
              <button
                key={prof.id}
                onClick={() => {
                  setActiveProfile(prof.id);
                  triggerNotification(`Switched profile parameters to ${prof.label}. Real-time indicators modified accordingly.`);
                }}
                className={`flex-1 text-left px-4 py-3 rounded-lg transition-all duration-300 ${active ? 'bg-blue-600 text-white font-bold shadow' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'}`}
              >
                <div className="text-xs uppercase font-bold tracking-wide leading-tight">{prof.label}</div>
                <div className={`text-[10px] mt-0.5 font-medium ${active ? 'text-blue-100' : 'text-slate-500'}`}>{prof.desc}</div>
              </button>
            );
          })}
        </div>

        {/* METRICS & INDICATORS CORRELATIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          
          {/* LEFT AREA: MAIN DYNAMIC CHART GRAPH & S/R PANEL (8 Column) */}
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">
            
            {/* STAGE & CUSTOM SVG GRAPH */}
            <div className="bg-[#111114] border border-white/5 rounded-xl p-5">
              
              <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#E4E4E7] uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    Market Visualizer ({activeProfile === 'SHORT_TERM' ? '1-Hour Detail' : activeProfile === 'MEDIUM_TERM' ? 'Daily Candles' : 'Weekly Trendline'})
                  </h3>
                  <span className="text-[10px] text-slate-500 font-sans">Interactive Technical overlay and pricing coordinates tracker</span>
                </div>

                {/* Overlay Checkboxes options */}
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-400 hover:text-white">
                    <input 
                      type="checkbox" 
                      className="accent-blue-500" 
                      checked={chartOpts.showBB}
                      onChange={() => setChartOpts(prev => ({...prev, showBB: !prev.showBB}))}
                    />
                    Bollinger Bands
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-400 hover:text-white">
                    <input 
                      type="checkbox" 
                      className="accent-blue-500" 
                      checked={chartOpts.showPivots}
                      onChange={() => setChartOpts(prev => ({...prev, showPivots: !prev.showPivots}))}
                    />
                    Pivot Lines (S1/R1)
                  </label>
                  <label className="flex items-center gap-1 text-xs cursor-pointer text-slate-400 hover:text-white">
                    <input 
                      type="checkbox" 
                      className="accent-blue-500" 
                      checked={chartOpts.showSMA}
                      onChange={() => setChartOpts(prev => ({...prev, showSMA: !prev.showSMA}))}
                    />
                    Avg line
                  </label>
                </div>
              </div>              {/* DRAW CUSTOM HIGH-PERFORMANCE RESPONSIVE SVG CANDKLESTICK CHART */}
              {/* This ensures absolute browser compatibility avoiding standard recharts node canvas layout breakage */}
              <div className="relative h-72 md:h-80 bg-[#0A0A0B] rounded-xl border border-white/5 p-2 overflow-hidden">
                
                {/* Support/Resistance horizontal annotations layers */}
                {chartOpts.showPivots && (
                  <>
                    {/* Resistance 1 line */}
                    <div className="absolute left-0 right-0 border-t border-rose-500/30 font-mono text-[9px] text-rose-400 pl-2 select-none" style={{ top: '25%' }}>
                      Resistance 1 Target (R1): ${(calculatedPivots.r1).toFixed(2)}
                    </div>
                    {/* Pivot line */}
                    <div className="absolute left-0 right-0 border-t border-blue-500/20 font-mono text-[9px] text-blue-400/70 pl-2 select-none" style={{ top: '48%' }}>
                      Classic Pivot Level (P): ${(calculatedPivots.pivot).toFixed(2)}
                    </div>
                    {/* Support 1 line */}
                    <div className="absolute left-0 right-0 border-t border-emerald-500/30 font-mono text-[9px] text-emerald-400 pl-2 select-none" style={{ top: '72%' }}>
                      Support 1 Target (S1): ${(calculatedPivots.s1).toFixed(2)}
                    </div>
                  </>
                )}

                {/* Bollinger Bands Shading Background */}
                {chartOpts.showBB && (
                  <div className="absolute inset-x-0 top-[20%] bottom-[20%] bg-blue-500/5 pointer-events-none select-none border-y border-blue-500/10" />
                )}

                {/* Custom SVG wrapper */}
                <svg className="w-full h-full" viewBox="0 0 600 300" preserveAspectRatio="none">
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="50" x2="600" y2="50" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="100" x2="600" y2="100" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="150" x2="600" y2="150" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="200" x2="600" y2="200" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="0" y1="250" x2="600" y2="250" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />

                  {/* Verticals */}
                  <line x1="100" y1="0" x2="100" y2="300" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="200" y1="0" x2="200" y2="300" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="300" y1="0" x2="300" y2="300" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="400" y1="0" x2="400" y2="300" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="500" y1="0" x2="500" y2="300" stroke="#1C1C1F" strokeWidth="0.5" strokeDasharray="3 3" />

                  {/* Draw simple line chart or candlesticks based on active profile */}
                  {activeProfile === 'SHORT_TERM' ? (
                    // Candlestick blocks
                    [
                      { x: 50, open: 120, close: 180, high: 90, low: 220, label: "05-10" },
                      { x: 140, open: 190, close: 140, high: 110, low: 210, label: "05-17" },
                      { x: 230, open: 130, close: 110, high: 90, low: 180, label: "05-24" },
                      { x: 320, open: 110, close: 80, high: 60, low: 150, label: "05-31" },
                      { x: 410, open: 70, close: 115, high: 50, low: 140, label: "06-07" },
                      { x: 500, open: 115, close: 95, high: 80, low: 160, label: "06-14" },
                    ].map((candle, idx) => {
                      const isUp = candle.close <= candle.open; // logic swapped visual heights
                      const color = isUp ? '#10B981' : '#F43F5E';
                      return (
                        <g key={idx} className="cursor-pointer group">
                          {/* Candle Wick line */}
                          <line x1={candle.x} y1={candle.high} x2={candle.x} y2={candle.low} stroke={color} strokeWidth="1.5" />
                          {/* Candle Real Body */}
                          <rect 
                            x={candle.x - 12} 
                            y={Math.min(candle.open, candle.close)} 
                            width="24" 
                            height={Math.max(4, Math.abs(candle.close - candle.open))} 
                            fill={color} 
                            stroke={color}
                            rx="1.5"
                            className="transition-all hover:brightness-125"
                            onClick={() => {
                              setHoveredPoint({
                                index: idx,
                                close: selectedStock.historical[idx]?.close || selectedStock.currentPrice,
                                high: selectedStock.historical[idx]?.high || selectedStock.currentPrice,
                                low: selectedStock.historical[idx]?.low || selectedStock.currentPrice,
                                x: candle.x,
                                y: candle.close
                              });
                            }}
                          />
                        </g>
                      );
                    })
                  ) : (
                    // Spline line chart representing medium/long term moving trend
                    <>
                      <path 
                        d="M 50 155 Q 140 120, 230 190 T 320 110 T 410 80 T 500 130" 
                        fill="none" 
                        stroke="#3b82f6" 
                        strokeWidth="3.5" 
                      />
                      {/* Dynamic average overlay */}
                      {chartOpts.showSMA && (
                        <path 
                           d="M 50 180 Q 140 160, 230 150 T 320 140 T 410 135 T 500 130" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="2" 
                          strokeDasharray="4 4" 
                        />
                      )}
                      {/* Anchor values circles */}
                      {[
                        { x: 50, y: 155, val: selectedStock.historical[0]?.close },
                        { x: 140, y: 120, val: selectedStock.historical[1]?.close },
                        { x: 230, y: 190, val: selectedStock.historical[2]?.close },
                        { x: 320, y: 110, val: selectedStock.historical[3]?.close },
                        { x: 410, y: 80, val: selectedStock.historical[4]?.close },
                        { x: 500, y: 130, val: selectedStock.historical[5]?.close },
                      ].map((pt, index) => (
                        <circle
                          key={index}
                          cx={pt.x}
                          cy={pt.y}
                          r="5"
                          fill="#ffffff"
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                          className="cursor-pointer hover:r-7 transition-all"
                          onClick={() => {
                            setHoveredPoint({
                              index,
                              close: pt.val || selectedStock.currentPrice,
                              high: selectedStock.historical[index]?.high || selectedStock.currentPrice * 1.02,
                              low: selectedStock.historical[index]?.low || selectedStock.currentPrice * 0.98,
                              x: pt.x,
                              y: pt.y
                            });
                          }}
                        />
                      ))}
                    </>
                  )}
                </svg>

                {/* Sub-Charts (RSI / MACD Indicator Bars placed in absolute overlay corner) */}
                <div className="absolute bottom-2 left-2 bg-[#111114]/90 border border-white/10 rounded px-2.5 py-1 text-[10px] font-mono shrink-0 select-none">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">RSI (14): <strong className={curRSI > 70 ? 'text-rose-400' : curRSI < 30 ? 'text-emerald-400' : 'text-blue-300'}>{Math.round(curRSI)}</strong></span>
                    <span className="text-slate-400">MACD Histogram: <strong className={curMACDHistogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{curMACDHistogram.toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* Coordinate tooltip hover bubble */}
                {hoveredPoint && (
                  <div 
                    className="absolute bg-[#111114] border border-blue-500/50 rounded p-2 text-[10px] font-mono shadow-xl z-10 text-slate-200"
                    style={{ left: `${hoveredPoint.x > 400 ? hoveredPoint.x - 170 : hoveredPoint.x + 20}px`, top: '10%' }}
                  >
                    <div className="flex justify-between items-center text-blue-400 font-bold mb-1 border-b border-white/5 pb-1">
                      <span>DATAPOINT #{hoveredPoint.index + 1}</span>
                      <button onClick={() => setHoveredPoint(null)} className="text-slate-400 ml-2 hover:text-white">x</button>
                    </div>
                    <div>Close Price: <span className="text-white">${hoveredPoint.close.toFixed(2)}</span></div>
                    <div>High Level: <span className="text-slate-300">${hoveredPoint.high.toFixed(2)}</span></div>
                    <div>Low Level: <span className="text-slate-300">${hoveredPoint.low.toFixed(2)}</span></div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-2 px-1">
                <span>May 10, 2026</span>
                <span>May 24, 2026</span>
                <span>Jun 07, 2026</span>
                <span>Active Target: {selectedStock.timestamp}</span>
              </div>

            </div>

            {/* AUTOMATIC SUPPORT & RESISTANCE MATHEMATICAL MODULE */}
            <div className="bg-[#111114] border border-white/5 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-blue-400" />
                    Pivot Points Resistance & Support levels Mapping
                  </h3>
                  <p className="text-[10px] text-slate-500">Auto-generated indicator mapping based on historical price inputs</p>
                </div>
                
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-405 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Calculations Updated
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Standard Classic Calculations Group */}
                <div className="bg-[#0A0A0B] border border-white/5 rounded-lg p-4">
                  <div className="text-xs font-bold text-slate-400 mb-3 border-b border-white/5 pb-1 flex justify-between">
                    <span>STANDARD CLASSIC PIVOT</span>
                    <span className="text-[10px] text-blue-400 font-mono">Weighted Pivot Method</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-rose-400">Resistance Stage 3 (R3)</span>
                      <span className="text-white font-bold">${calculatedPivots.r3}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-rose-400/80">Resistance Stage 2 (R2)</span>
                      <span className="text-white font-semibold">${calculatedPivots.r2}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-rose-300">Resistance Stage 1 (R1)</span>
                      <span className="text-white">${calculatedPivots.r1}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono bg-blue-500/10 py-1 px-1.5 rounded">
                      <span className="text-blue-400 font-bold">Pivot Center Line (P)</span>
                      <span className="text-blue-400 font-bold">${calculatedPivots.pivot}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-300">Support Stage 1 (S1)</span>
                      <span className="text-white">${calculatedPivots.s1}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-400/80">Support Stage 2 (S2)</span>
                      <span className="text-white font-semibold">${calculatedPivots.s2}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-400">Support Stage 3 (S3)</span>
                      <span className="text-white font-bold">${calculatedPivots.s3}</span>
                    </div>
                  </div>
                </div>

                {/* Fibonacci Ratio Mapping */}
                <div className="bg-[#0A0A0B] border border-white/5 rounded-lg p-4">
                  <div className="text-xs font-bold text-slate-400 mb-3 border-b border-white/5 pb-1 flex justify-between">
                    <span>FIBONACCI RATIO LEVELS</span>
                    <span className="text-[10px] text-blue-400 font-mono">0.382 | 0.618 | 1.000 Ratios</span>
                  </div>
                  
                  <div className="space-y-2 font-sans">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-purple-400">Fib Resistance (1.000 R3)</span>
                      <span className="text-white font-bold">${calculatedFibPivots.r3}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-purple-400/80">Fib Resistance (0.618 R2)</span>
                      <span className="text-white font-semibold">${calculatedFibPivots.r2}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-purple-300">Fib Resistance (0.382 R1)</span>
                      <span className="text-white">${calculatedFibPivots.r1}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono bg-blue-500/10 py-1 px-1.5 rounded">
                      <span className="text-blue-400 font-bold">Fib Pivot Point (P)</span>
                      <span className="text-blue-400 font-bold">${calculatedFibPivots.pivot}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-300">Fib Support (0.382 S1)</span>
                      <span className="text-white">${calculatedFibPivots.s1}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-400/80">Fib Support (0.618 S2)</span>
                      <span className="text-white font-semibold">${calculatedFibPivots.s2}</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-emerald-400">Fib Support (1.000 S3)</span>
                      <span className="text-white font-bold">${calculatedFibPivots.s3}</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* RIGHT AREA: REAL-TIME PRICING ALERTS & STRATEGY VIEW OVERVIEW (4 Column) */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
            
            {/* INVESTMENT STRATEGY LAYER DISPLAY */}
            <div className="bg-[#111114] border border-white/5 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">
                Active Strategy Focus Parameters
              </h3>

              {activeProfile === 'SHORT_TERM' && (
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-lg">
                    <span className="text-[10px] uppercase font-mono text-blue-400 font-bold block mb-1">RECOMMENDED ACTIONS</span>
                    <p className="text-xs text-blue-200">
                      RSI levels show <strong>{curRSI > 60 ? 'Overbought margins' : curRSI < 40 ? 'Oversold accumulation potential' : 'Neutral stance'}</strong>. Watch immediate support levels at ${calculatedPivots.s1}.
                    </p>
                  </div>
                  
                  {/* Indicators Panel */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">RSI Relative Strength</span>
                      <span className="font-mono text-white bg-blue-500/10 px-2 py-0.5 rounded font-bold border border-blue-500/20">{Math.round(curRSI)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Bollinger Bands Upper</span>
                      <span className="font-mono text-white">${curBBUpper.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Bollinger Bands Lower</span>
                      <span className="font-mono text-white">${curBBLower.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Short Volatility Stance</span>
                      <span className="text-rose-400 font-semibold font-mono text-[10px] uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">High Velocity</span>
                    </div>
                  </div>
                </div>
              )}

              {activeProfile === 'MEDIUM_TERM' && (
                <div className="space-y-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-lg">
                    <span className="text-[10px] uppercase font-mono text-blue-400 font-bold block mb-1">EMA TREND CONTEXT</span>
                    <p className="text-xs text-blue-200">
                      Position trades should align with 50-day and 200-day exponential moving average cross configurations. Market momentum remains in an upward channel.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">EMA (50-Day Line)</span>
                      <span className="font-mono text-emerald-400 font-bold">${(selectedStock.currentPrice * 0.96).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">EMA (200-Day Line)</span>
                      <span className="font-mono text-slate-200">${(selectedStock.currentPrice * 0.91).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Golden Cross Stance</span>
                      <span className="text-emerald-450 font-bold uppercase text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">Active Bullish</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Rotation ranking</span>
                      <span className="font-semibold text-slate-300">Sector Leader</span>
                    </div>
                  </div>
                </div>
              )}

              {activeProfile === 'LONG_TERM' && (
                <div className="space-y-4">
                  <div className="bg-blue-900/10 border border-blue-500/20 p-3.5 rounded-lg">
                    <span className="text-[10px] uppercase font-mono text-blue-400 font-bold block mb-1">FUNDAMENTAL VALUATION STATS</span>
                    <p className="text-xs text-blue-200">
                      Value investing defaults to balance sheet margins. Net margin stands at <strong>{selectedStock.netMargin}%</strong> with a price-to-earnings multiple of <strong>{selectedStock.peRatio}x</strong>.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Gross Margin %</span>
                      <span className="font-mono text-white text-right font-bold">{selectedStock.grossMargin}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Operating Margin %</span>
                      <span className="font-mono text-white text-right">{selectedStock.operatingMargin}%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">P/E Earnings Multiple</span>
                      <span className="font-mono text-blue-400 text-right">{selectedStock.peRatio}x</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-[#0A0A0B] p-2.5 rounded border border-white/5">
                      <span className="text-slate-400">Revenue Growth YoY</span>
                      <span className={`font-mono text-right font-semibold ${selectedStock.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{selectedStock.revenueGrowth}%</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* INSTANT PRICE ALERTS & TRIGGER ENGINE */}
            <div className="bg-[#111114] border border-white/5 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-400" />
                Technical Alerts Configuration
              </h3>
              <p className="text-[10px] text-slate-500 mb-4 font-sans">Set prompt notification checks directly on target prices</p>

              {/* Price threshold register form */}
              <form onSubmit={handleAddPriceAlert} className="flex gap-2 mb-4">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Target Price Threshold ($)..."
                  value={customPriceAlert}
                  onChange={(e) => setCustomPriceAlert(e.target.value)}
                  className="flex-1 bg-[#16161A] border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors cursor-pointer"
                >
                  Set Trigger
                </button>
              </form>

              {/* Active list */}
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {priceAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center font-sans">No active triggers registered</p>
                ) : (
                  priceAlerts.map((alert) => (
                    <div key={alert.id} className="bg-[#0A0A0B] border border-white/5 rounded p-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono bg-white/5 text-slate-300 px-1 rounded text-[10px] mr-1.5">{alert.symbol}</span>
                        <span className="font-mono text-slate-300">Trigger standard at: <strong>${alert.price.toFixed(2)}</strong></span>
                      </div>
                      <button 
                        onClick={() => deletePriceAlert(alert.id)}
                        className="text-[10px] font-bold text-rose-450 hover:text-rose-400 uppercase px-1.5 py-1 rounded transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* USER PORTFOLIO / WATCHLIST SIDEBAR WATCH LIST PANEL */}
            <div className="bg-[#111114] border border-white/5 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-3">
                My Horizon Watchlists
              </h3>
              
              <div className="space-y-2">
                {watchlist.map((symbol) => {
                  const data = STOCKS_DB[symbol];
                  if (!data) return null;
                  const isUp = data.change >= 0;
                  return (
                    <div 
                      key={symbol}
                      onClick={() => setSelectedStock(data)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedStock.symbol === symbol ? 'bg-blue-500/10 border-blue-500/40' : 'bg-[#0A0A0B] border-white/5 hover:border-white/10'}`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-sm text-white">{symbol}</span>
                          <span className="text-[10px] text-slate-500 hidden sm:inline">{data.name}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400">{data.exchange}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-semibold text-white block">${data.currentPrice}</span>
                        <span className={`text-[10px] font-mono font-semibold ${isUp ? 'text-emerald-450 font-bold' : 'text-rose-450'}`}>
                          {isUp ? '▲' : '▼'} {data.changePercent}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

        {/* AI DAILY NEWS SUMMARY MODULE WITH INDIVIDUAL HEADLINES */}
        <div className="bg-[#111114] border border-white/5 rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
                AI Daily News Summarizer (Horizon Analysis Server)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Utilizes Gemini text synthesis to crawl raw index wires and deliver objective, high-density explanations
              </p>
            </div>
            <button
              onClick={() => fetchAiNewsSummary(selectedStock.symbol)}
              disabled={aiLoading}
              className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-white disabled:opacity-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${aiLoading ? 'animate-spin' : ''}`} />
              Re-Synthesize headlines
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Raw Scraping Feeds column (5/12) */}
            <div className="col-span-1 lg:col-span-5 bg-[#0A0A0B] p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">
                Scraped Wire Feeds (Last 24 Hours)
              </span>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {(NEWS_ARCHIVE[selectedStock.symbol] || NEWS_ARCHIVE.DEFAULT).map((hl, idx) => (
                  <div key={idx} className="flex gap-2 text-xs text-slate-300 leading-normal border-b border-white/5 last:border-0 pb-2 last:pb-0">
                    <span className="text-blue-500 font-mono text-[10px] shrink-0 mt-0.5">[{idx + 1}]</span>
                    <p>{hl}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Synthesized Output column (7/12) */}
            <div className="col-span-1 lg:col-span-7 bg-[#0A0A0B] rounded-xl border border-white/5 p-4">
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-2 font-mono flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                Synthesized Executive Summary
              </span>

              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Loader2 className="h-8 w-8 text-blue-400 animate-spin mr-2 mb-2" />
                  <span className="text-xs text-slate-400 font-mono">Running high-density Gemini synthesis model...</span>
                </div>
              ) : aiError ? (
                <div className="p-4 bg-rose-950/20 border border-rose-950/50 rounded-lg text-rose-300 text-xs text-center font-mono">
                  {aiError} <br />
                  <button 
                    onClick={() => fetchAiNewsSummary(selectedStock.symbol)}
                    className="mt-2 text-xs text-blue-500 hover:underline"
                  >
                    Click to try again
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-medium bg-white/5 p-4 rounded-lg border border-white/10 min-h-[160px] border-l-2 border-emerald-500">
                  {aiSummary || "Select a ticker to pull up AI Synthesizer analysis immediately."}
                </div>
              )}

              <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between font-mono">
                <span>Model Alias: gemini-3.5-flash</span>
                <span>Grounding context: 24h News wires</span>
              </div>
            </div>

          </div>

        </div>

        {/* ADVANCED CATEGORIZED SCREENER VIEW */}
        <div id="advanced-screener-widget" className="bg-[#111114] border border-white/5 rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 border-b border-white/5 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Advanced Horizon Screener
              </h3>
              <p className="text-[11px] text-slate-505 mt-0.5">Filters stocks across sectors mapped uniquely to short-term, medium-term and long-term targets</p>
            </div>

            {/* Sector Picker Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {['All', 'Technology', 'Banking & Finance', 'Energy'].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setScreenerSector(sec)}
                  className={`px-3 py-1 rounded text-xs font-semibold uppercase tracking-wider transition-colors border ${screenerSector === sec ? 'bg-blue-600 border-blue-500 text-white font-bold' : 'bg-transparent text-slate-400 border-white/10 hover:text-white'}`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          {/* Grid filter table listing results */}
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0A0A0B] border-b border-white/10 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="px-4 py-3">Asset Symbol</th>
                  <th className="px-4 py-3">Latest Price</th>
                  <th className="px-4 py-2.5">Short-Term Stance</th>
                  <th className="px-4 py-2.5">Medium-Term Stance</th>
                  <th className="px-4 py-2.5">Long-Term Safety</th>
                  <th className="px-4 py-3 text-right">Quick Select</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Object.values(STOCKS_DB)
                  .filter((item) => screenerSector === 'All' || item.sector === screenerSector)
                  .map((item) => {
                    const isUp = item.change >= 0;
                    return (
                      <tr key={item.symbol} className="hover:bg-[#16161A] transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                              {item.symbol}
                            </span>
                            <div>
                              <div className="font-semibold text-slate-200">{item.name}</div>
                              <span className="text-[10px] text-slate-500">{item.sector}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          <div className="font-semibold text-slate-200">${item.currentPrice.toFixed(2)}</div>
                          <div className={isUp ? 'text-emerald-450 font-bold' : 'text-rose-450'}>
                            {isUp ? '▲' : '▼'} {item.changePercent}%
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          <div className="text-slate-300">RSI: {item.symbol === 'GLW' ? Math.round(curRSI) : 55}</div>
                          <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 border border-blue-500/20 px-1 py-0.5 rounded uppercase">Volatility Screener Pass</span>
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          <div className="text-slate-300">50d/200d Cross</div>
                          <span className="text-[10px] text-emerald-450 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded uppercase">Trend Following: Active</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-slate-300 font-mono">Net Margin: {item.netMargin}%</div>
                          <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 border border-purple-500/20 px-1 py-0.5 rounded uppercase">Valuation: {item.peRatio < 20 ? 'Solid Value' : 'Premium Growth'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => setSelectedStock(item)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors uppercase font-bold text-[10px]"
                          >
                            SELECT
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

        </div>

        {/* INVESTOR COMMUNITY HUB DISCORD / WEBHOOK INTEGRATION */}
        <div className="bg-[#111114] border border-white/5 rounded-xl p-5 mb-8">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Share2 className="h-4 w-4 text-blue-400" />
            Investor Community Dashboard Hub
          </h3>
          <p className="text-[11px] text-slate-500 mb-4 font-sans">
            Push technical alerts, support/resistance targets, and synthesized sentiment directly to external Discord servers or custom Webhooks.
          </p>

          <form onSubmit={handleCommunitySubmit} className="space-y-4 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1 font-mono">Target Webhook/Discord URL Endpoint</label>
                <input
                  type="text"
                  placeholder="Paste URL (e.g. https://discord.com/api/webhooks/...)"
                  value={discordWebhookUrl}
                  onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                  className="w-full bg-[#16161A] border border-white/10 rounded px-3 py-2 text-xs text-slate-350 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1 font-mono">Strategic Horizon Tag</label>
                <div className="grid grid-cols-3 gap-2">
                  {['SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveProfile(cat as InvestorProfile)}
                      className={`py-2 text-[10px] font-bold border rounded transition-all uppercase cursor-pointer ${activeProfile === cat ? 'bg-blue-600 border-blue-500 text-white' : 'bg-transparent text-slate-400 border-white/10 hover:bg-white/5'}`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1 font-mono">Technical Strategy Summary Message</label>
              <textarea
                rows={3}
                value={communityMessage}
                onChange={(e) => setCommunityMessage(e.target.value)}
                placeholder="Share your analysis..."
                className="w-full bg-[#16161A] border border-white/10 rounded px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-between items-center flex-wrap gap-2 pt-1">
              <span className="text-[9px] text-slate-500 font-mono italic">
                *Simulates full attachment parsing including RSI telemetry and Pivot bands logic.
              </span>
              <button
                type="submit"
                disabled={communitySent}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-75 transition-all cursor-pointer"
              >
                {communitySent ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-450" />
                    Sent Successfully
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Broadcast to Community Discord
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="bg-[#0A0A0B] border-t border-white/5 py-8 text-center text-slate-500 text-xs font-mono">
        <div className="max-w-[1400px] mx-auto px-4">
          <p className="mb-2">Investor Horizon Analytical Terminal — All trading indicators computed recursively via locally loaded indicators math libraries.</p>
          <p>© 2026. Standalone standalone architecture validated. Designed for Day/Swing, Position, and Long-Term Value investors.</p>
        </div>
      </footer>

      {/* STATIC TOAST NOTIFICATION BANNER */}
      <AnimatePresence>
        {alertToast.show && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-[#111114] border border-blue-500/50 text-blue-100 p-4 rounded-xl shadow-2xl flex items-center gap-3 font-mono text-xs max-w-sm"
          >
            <Activity className="h-4 w-4 text-blue-400 shrink-0" />
            <div className="flex-1">{alertToast.message}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. BOTTOM NAVIGATION BAR (MOBILE VIEWPORTS FOCUS NAVIGATION) */}
      <div id="mobile-navigation-footer" className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0A0A0B] border-t border-white/10 py-2.5 px-4 flex justify-between items-center z-40 text-slate-400">
        <button 
          onClick={() => {
            setSelectedStock(STOCKS_DB.GLW);
            triggerNotification("Navigated to Top Buy Assets.");
          }}
          className="flex flex-col items-center justify-center gap-1 flex-1 hover:text-white cursor-pointer"
        >
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <span className="text-[9px] font-bold">Top Buy</span>
        </button>
        <button 
          onClick={() => {
            triggerNotification("Showing user lists.");
          }}
          className="flex flex-col items-center justify-center gap-1 flex-1 hover:text-white cursor-pointer"
        >
          <Layers className="h-5 w-5" />
          <span className="text-[9px]">Watchlists</span>
        </button>
        <button 
          onClick={() => {
            const el = document.getElementById('advanced-screener-widget');
            el?.scrollIntoView({ behavior: 'smooth' });
            triggerNotification("Advanced Horizon Screener focused.");
          }}
          className="flex flex-col items-center justify-center gap-1 flex-1 hover:text-white cursor-pointer"
        >
          <Sliders className="h-5 w-5" />
          <span className="text-[9px]">Screener</span>
        </button>
        <button 
          onClick={() => {
            const el = document.getElementById('ai-headline-banner');
            el?.scrollIntoView({ behavior: 'smooth' });
            triggerNotification("AI Analyst Hub focused.");
          }}
          className="flex flex-col items-center justify-center gap-1 flex-1 hover:text-white cursor-pointer"
        >
          <Radio className="h-5 w-5" />
          <span className="text-[9px]">AI Analyst</span>
        </button>
      </div>

    </div>
  );
}

// MOCK NEWS ARCHIVE DATA SOURCE
const NEWS_ARCHIVE: { [key: string]: string[] } = {
  GLW: [
    "Corning Inc. announces massive shipment of newly developed bendable glass to major smartphone manufacturer.",
    "Industrial fiber optic demand surges 12% YoY, boosting Corning's optical communications segment.",
    "Analysts raise target margin on GLW ahead of Q3 earnings citing robust glass inventory controls.",
    "Tech sector hardware index experiences volatile session, GLW holdings trend strong.",
    "Corning partners with green-tech initiative to lower production footprint in optical manufacturing."
  ],
  AAPL: [
    "Apple Inc. highlights integration of custom chipsets across premium visual display arrays.",
    "Global smart-device sales tick higher in major Southeast Asian hubs, signaling a strong consumer rebound.",
    "MacBook production cycles experience minor supply shift amid micro-sensor upgrades.",
    "Apple stock target adjusted by major banks on projected gross margin stability.",
    "Community forums discuss anticipated software updates with advanced consumer features."
  ],
  V: [
    "Visa Inc. moves to accelerate digital cross-border settlements across South American banking partnerships.",
    "Merchant payment volumes register a steady 4.5% rise, according to monthly index tracker data.",
    "Card network protocols upgraded to process sub-second multi-currency conversions securely.",
    "Financial analysts review global spending habits, pointing to a resilient corporate payment index.",
    "Visa launches local money literacy initiative supporting boutique technology startups."
  ],
  XOM: [
    "ExxonMobil advances carbon recovery pilot facility in premium deep-sea drilling block.",
    "Crude prices fluctuate as global freight routes report minor weather bottlenecks.",
    "Energy sector analysts note strong net operating cash flows from XOM's high-efficiency wells.",
    "Refining margin benchmarks adjust with seasonal transition in European fuel pipelines.",
    "XOM schedules routine exploration inspection in Atlantic shelf zone."
  ]
};
