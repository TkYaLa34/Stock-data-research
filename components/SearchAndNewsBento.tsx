import React, { useState, useEffect } from 'react';
import { Search, Newspaper, ChevronDown, ChevronUp, TrendingUp, RefreshCw } from 'lucide-react';

interface SearchAndNewsBentoProps {
  currentSymbol: string;
  onSymbolSearch: (newSymbol: string) => void;
}

export const SearchAndNewsBento: React.FC<SearchAndNewsBentoProps> = ({ currentSymbol, onSymbolSearch }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(currentSymbol);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const fetchAnalyzedNews = async (symbolToFetch: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news-analysis?symbol=${symbolToFetch}`);
      const result = await res.json();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Failed to connect to the AI news intelligence bridge.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyzedNews(currentSymbol);
    setInputValue(currentSymbol);
  }, [currentSymbol]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSymbolSearch(inputValue.toUpperCase().trim());
    }
  };

  return (
    <div className="w-full bg-slate-950 text-slate-100 p-1">
      
      {/* Search & Control Hub Box */}
      <div className="mb-6 p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">AI Financial Signal Terminal</h2>
            <p className="text-[11px] text-slate-500">Enter stock or ETF symbol to track market sentiment</p>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-96">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search e.g., AAPL, TSLA, SPY, GLW"
              className="w-full bg-slate-950 border border-slate-800 text-sm pl-10 pr-4 py-2 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
          <button 
            type="submit" 
            className="bg-cyan-600 hover:bg-cyan-500 active:scale-95 transition-transform text-xs font-bold px-5 py-2 rounded-xl"
          >
            Search
          </button>
        </form>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="text-center p-12 text-slate-400 text-xs animate-pulse flex items-center justify-center gap-2 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
          <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" /> 
          <span>Gemini AI is fetching latest news and analyzing sentiment parameters...</span>
        </div>
      )}
      {error && <div className="text-center p-8 text-rose-400 text-xs border border-rose-950/40 bg-rose-950/10 rounded-xl">⚠️ {error}</div>}

      {/* Bento Layout Result Matrix */}
      {!loading && !error && data && data.newsItems && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
          
          {/* Interactive News Cards Stream */}
          <div className="md:col-span-2 space-y-3">
            {data.newsItems.map((item: any, idx: number) => {
              const isExpanded = expandedIndex === idx;
              const isBullish = item.sentiment === 'BULLISH';
              const isBearish = item.sentiment === 'BEARISH';
              
              return (
                <div 
                  key={idx} 
                  className={`bg-slate-900 border transition-all duration-200 rounded-xl overflow-hidden cursor-pointer ${isExpanded ? 'border-cyan-500/50 shadow-lg shadow-cyan-950/20' : 'border-slate-800 hover:border-slate-700'}`}
                  onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                >
                  <div className="p-4 flex justify-between items-start gap-3 select-none">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {isBullish && <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">🟢 BULLISH</span>}
                        {isBearish && <span className="text-[9px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-md border border-rose-500/20">🔴 BEARISH</span>}
                        {!isBullish && !isBearish && <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md">🟡 NEUTRAL</span>}
                        <span className="text-[10px] text-slate-500">Impact Score: {item.impactScore}/10</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-200 leading-snug">{item.headline}</h3>
                    </div>
                    <button className="text-slate-500 mt-1">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 bg-slate-950/40 text-xs text-slate-400 leading-relaxed animate-fadeIn">
                      <p className="font-semibold text-slate-300 mb-1">📝 AI Analysis Summary:</p>
                      {item.aiSummary}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sentiment Convergence Box */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">News Convergence</span>
              <h4 className="text-sm font-bold text-slate-300 mt-0.5">Crowd Sentiment Summary</h4>
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Aggregated raw news metadata for <span className="text-cyan-400 font-bold">{data.symbol}</span> evaluated against large language model semantic weights to identify prevailing momentum vectors.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-medium">Primary Signal</p>
                  <p className="text-xs font-bold text-emerald-400">Bullish Momentum</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-600">{data.generatedAt}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
