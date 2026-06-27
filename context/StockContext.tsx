"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { STOCKS_DB, StockData, HistoricalBar } from "../lib/stocks";

export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
}

interface StockContextProps {
  selectedSymbol: string;
  selectedStock: StockData;
  stocks: Record<string, StockData>;
  watchlist: string[];
  portfolioItems: PortfolioItem[];
  totalPortfolioValue: number;
  totalPortfolioCost: number;
  totalPortfolioGain: number;
  totalPortfolioGainPercent: number;
  
  // Slate controls
  selectSymbol: (symbol: string) => void;
  updateStockMetrics: (symbol: string, updatedFields: Partial<StockData>) => void;
  toggleWatchlist: (symbol: string) => void;
  addPortfolioItem: (symbol: string, shares: number, purchasePrice: number, purchaseDate: string) => void;
  deletePortfolioItem: (id: string) => void;
  clearPortfolio: () => void;
  resetAllData: () => void;
  triggerToast: (message: string, type?: "success" | "info" | "warning") => void;
  toast: { message: string; show: boolean; type: "success" | "info" | "warning" } | null;
  executeRebalanceTrades: (trades: { symbol: string; sharesDiff: number; price: number }[]) => void;
}

const StockContext = createContext<StockContextProps | undefined>(undefined);

export const StockProvider = ({ children }: { children: ReactNode }) => {
  // 1. Core Stock Data States (with dynamic runtime memory modifications)
  const [stocks, setStocks] = useState<Record<string, StockData>>(STOCKS_DB);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("AAPL");
  
  // 2. Watchlist State
  const [watchlist, setWatchlist] = useState<string[]>([]);

  // 3. Persistent Local Storage Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  // 4. Alert & Toast System state inside context
  const [toast, setToast] = useState<{ message: string; show: boolean; type: "success" | "info" | "warning" } | null>(null);

  // Trigger alert toast helper
  const triggerToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, show: true, type });
  };

  // Close toast automatically
  useEffect(() => {
    if (toast?.show) {
      const timer = setTimeout(() => {
        setToast((prev) => prev ? { ...prev, show: false } : null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load persistent localStorage states on component mount Safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load Watchlist
      const storedWatchlist = localStorage.getItem("dashboard_watchlist");
      if (storedWatchlist) {
        try {
          setWatchlist(JSON.parse(storedWatchlist));
        } catch (e) {
          console.error("Error reading watchlist from storage", e);
        }
      }

      // Load Portfolio
      const storedPortfolio = localStorage.getItem("dashboard_portfolio_items");
      if (storedPortfolio) {
        try {
          setPortfolioItems(JSON.parse(storedPortfolio));
        } catch (e) {
          console.error("Error reading portfolio from storage", e);
        }
      }

      // Load Stock Overrides
      const storedOverrides = localStorage.getItem("dashboard_stock_overrides");
      if (storedOverrides) {
        try {
          const overrides: Record<string, Partial<StockData>> = JSON.parse(storedOverrides);
          setStocks((prev) => {
            const updated = { ...prev };
            Object.keys(overrides).forEach((sym) => {
              if (updated[sym]) {
                updated[sym] = {
                  ...updated[sym],
                  ...overrides[sym],
                  // Re-evaluate dependent fields like total change and percentage if price changes
                  change: overrides[sym].currentPrice !== undefined 
                    ? parseFloat((overrides[sym].currentPrice - (updated[sym].currentPrice - updated[sym].change)).toFixed(2))
                    : updated[sym].change,
                  changePercent: overrides[sym].currentPrice !== undefined
                    ? parseFloat(((overrides[sym].currentPrice - (updated[sym].currentPrice - updated[sym].change)) / (updated[sym].currentPrice - updated[sym].change || 1) * 100).toFixed(2))
                    : updated[sym].changePercent,
                };
              }
            });
            return updated;
          });
        } catch (e) {
          console.error("Error reading stock overrides", e);
        }
      }
    }
  }, []);

  // Fetch all stocks on mount from real-time API
  useEffect(() => {
    const fetchAllSymbols = async () => {
      const symbols = Object.keys(STOCKS_DB);
      await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const response = await fetch("/api/stocks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbol })
            });
            if (response.ok) {
              const json = await response.json();
              if (json.data) {
                setStocks((prev) => {
                  const storedOverrides = localStorage.getItem("dashboard_stock_overrides");
                  let overrides: Record<string, Partial<StockData>> = {};
                  if (storedOverrides) {
                    try { overrides = JSON.parse(storedOverrides); } catch (e) {}
                  }
                  const currentOverride = overrides[symbol] || {};
                  const finalData = {
                    ...json.data,
                    ...currentOverride,
                    change: currentOverride.currentPrice !== undefined 
                      ? parseFloat((currentOverride.currentPrice - (json.data.currentPrice - json.data.change)).toFixed(2))
                      : json.data.change,
                    changePercent: currentOverride.currentPrice !== undefined
                      ? parseFloat(((currentOverride.currentPrice - (json.data.currentPrice - json.data.change)) / (json.data.currentPrice - json.data.change || 1) * 100).toFixed(2))
                      : json.data.changePercent,
                  };
                  return {
                    ...prev,
                    [symbol]: finalData
                  };
                });
              }
            }
          } catch (e) {
            console.error("Mount fetch failed for", symbol, e);
          }
        })
      );
    };
    fetchAllSymbols();
  }, []);

  // Fetch active symbol real-time ticks background polling every 10 seconds
  useEffect(() => {
    let active = true;

    const fetchRealtimeData = async (symbol: string) => {
      try {
        const response = await fetch("/api/stocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol })
        });
        if (!response.ok) throw new Error("HTTP error");
        const json = await response.json();
        
        if (active && json.data) {
          setStocks((prev) => {
            const storedOverrides = localStorage.getItem("dashboard_stock_overrides");
            let overrides: Record<string, Partial<StockData>> = {};
            if (storedOverrides) {
              try { overrides = JSON.parse(storedOverrides); } catch (e) {}
            }
            
            const currentOverride = overrides[symbol] || {};
            const finalData = {
              ...json.data,
              ...currentOverride,
              change: currentOverride.currentPrice !== undefined 
                ? parseFloat((currentOverride.currentPrice - (json.data.currentPrice - json.data.change)).toFixed(2))
                : json.data.change,
              changePercent: currentOverride.currentPrice !== undefined
                ? parseFloat(((currentOverride.currentPrice - (json.data.currentPrice - json.data.change)) / (json.data.currentPrice - json.data.change || 1) * 100).toFixed(2))
                : json.data.changePercent,
            };

            return {
              ...prev,
              [symbol]: finalData
            };
          });
        }
      } catch (err) {
        console.error("Failed to background fetch stock data for", symbol, err);
      }
    };

    fetchRealtimeData(selectedSymbol);

    const interval = setInterval(() => {
      fetchRealtimeData(selectedSymbol);
    }, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedSymbol]);


  // Listen to external/auth changes to dashboard_watchlist
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleSync = () => {
      const storedWatchlist = localStorage.getItem("dashboard_watchlist");
      if (storedWatchlist) {
        try {
          setWatchlist(JSON.parse(storedWatchlist));
        } catch (e) {}
      } else {
        setWatchlist([]);
      }
    };

    window.addEventListener("storage", handleSync);
    window.addEventListener("auth_watchlist_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("auth_watchlist_updated", handleSync);
    };
  }, []);

  // Sync Watchlist changes to local storage
  const toggleWatchlist = (symbol: string) => {
    let nextWatchlist: string[];
    if (watchlist.includes(symbol)) {
      nextWatchlist = watchlist.filter((s) => s !== symbol);
      triggerToast(`Removed ${symbol} from watchlist`, "info");
    } else {
      nextWatchlist = [...watchlist, symbol];
      triggerToast(`Added ${symbol} to watchlist`, "success");
    }
    setWatchlist(nextWatchlist);
    localStorage.setItem("dashboard_watchlist", JSON.stringify(nextWatchlist));

    // Sync with active user session in localStorage if present
    const activeSession = localStorage.getItem("auth_active_session");
    if (activeSession) {
      try {
        const sessionUser = JSON.parse(activeSession);
        sessionUser.watchlist = nextWatchlist;
        localStorage.setItem("auth_active_session", JSON.stringify(sessionUser));
        
        const rawUsers = localStorage.getItem("auth_registered_users");
        if (rawUsers) {
          const usersList = JSON.parse(rawUsers);
          const updatedUsersList = usersList.map((u: any) => {
            if (u.profile.id === sessionUser.id) {
              return { ...u, profile: sessionUser };
            }
            return u;
          });
          localStorage.setItem("auth_registered_users", JSON.stringify(updatedUsersList));
        }
      } catch (e) {
        console.error("Sync active session error", e);
      }
    }

    // Dispatch custom update event so AuthContext is notified if loaded
    window.dispatchEvent(new Event("auth_watchlist_updated"));
  };

  // Change Selected Asset
  const selectSymbol = (symbol: string) => {
    if (stocks[symbol]) {
      setSelectedSymbol(symbol);
      triggerToast(`Active view loaded for ${symbol}`, "info");
    }
  };

  // Update metrics dynamically inside context - saves to local storage!
  const updateStockMetrics = (symbol: string, updatedFields: Partial<StockData>) => {
    if (!stocks[symbol]) return;

    setStocks((prev) => {
      const originalStock = STOCKS_DB[symbol] || prev[symbol];
      
      const newPrice = updatedFields.currentPrice !== undefined ? updatedFields.currentPrice : prev[symbol].currentPrice;
      const basePrice = originalStock.currentPrice - originalStock.change; // historical closing baseline
      
      const parsedChange = Number((newPrice - basePrice).toFixed(2));
      const parsedChangePercent = Number(((newPrice - basePrice) / (basePrice || 1) * 100).toFixed(2));

      const mergedStock: StockData = {
        ...prev[symbol],
        ...updatedFields,
        change: updatedFields.currentPrice !== undefined ? parsedChange : prev[symbol].change,
        changePercent: updatedFields.currentPrice !== undefined ? parsedChangePercent : prev[symbol].changePercent,
      };

      const updatedStocks = {
        ...prev,
        [symbol]: mergedStock,
      };

      // Persist this override
      const storedOverrides = localStorage.getItem("dashboard_stock_overrides");
      let overrides: Record<string, Partial<StockData>> = {};
      if (storedOverrides) {
        try { overrides = JSON.parse(storedOverrides); } catch (e) {}
      }
      overrides[symbol] = {
        ...(overrides[symbol] || {}),
        ...updatedFields,
      };
      localStorage.setItem("dashboard_stock_overrides", JSON.stringify(overrides));

      return updatedStocks;
    });

    triggerToast(`Updated financial metrics for ${symbol}`, "success");
  };

  // Persistent Portfolio Tracker - Add Item
  const addPortfolioItem = (symbol: string, shares: number, purchasePrice: number, purchaseDate: string) => {
    const stockName = stocks[symbol]?.name || `${symbol} Corp`;
    const newItem: PortfolioItem = {
      id: `holding-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      symbol: symbol.toUpperCase(),
      name: stockName,
      shares,
      purchase_price: purchasePrice,
      purchase_date: purchaseDate || new Date().toISOString().split("T")[0]
    };

    const updatedPortfolio = [...portfolioItems, newItem];
    setPortfolioItems(updatedPortfolio);
    localStorage.setItem("dashboard_portfolio_items", JSON.stringify(updatedPortfolio));
    triggerToast(`Saved ${shares} shares of ${symbol} to portfolio!`, "success");
  };

  // Persistent Portfolio Tracker - Delete Item
  const deletePortfolioItem = (id: string) => {
    const deleted = portfolioItems.find((item) => item.id === id);
    const updatedPortfolio = portfolioItems.filter((item) => item.id !== id);
    setPortfolioItems(updatedPortfolio);
    localStorage.setItem("dashboard_portfolio_items", JSON.stringify(updatedPortfolio));
    if (deleted) {
      triggerToast(`Removed holding position for ${deleted.symbol}`, "info");
    }
  };

  // Persistent Portfolio Tracker - Clear All
  const clearPortfolio = () => {
    setPortfolioItems([]);
    localStorage.removeItem("dashboard_portfolio_items");
    triggerToast("Cleared all portfolio positions", "warning");
  };

  // Reset entire dashboard back to stock defaults
  const resetAllData = () => {
    setStocks(STOCKS_DB);
    setWatchlist([]);
    setPortfolioItems([]);
    setSelectedSymbol("AAPL");
    localStorage.removeItem("dashboard_watchlist");
    localStorage.removeItem("dashboard_portfolio_items");
    localStorage.removeItem("dashboard_stock_overrides");
    triggerToast("Reset entire dashboard model to original system defaults", "warning");
  };

  // Execute a series of buys/sells to achieve target allocation
  const executeRebalanceTrades = (trades: { symbol: string; sharesDiff: number; price: number }[]) => {
    let updated = portfolioItems.map(item => ({ ...item }));
    
    trades.forEach((trade) => {
      const { symbol, sharesDiff, price } = trade;
      if (sharesDiff > 0) {
        const stockName = stocks[symbol]?.name || `${symbol} Corp`;
        const newItem: PortfolioItem = {
          id: `holding-${Date.now()}-${Math.floor(Math.random() * 1000)}-${symbol}`,
          symbol: symbol.toUpperCase(),
          name: stockName,
          shares: Number(sharesDiff.toFixed(4)),
          purchase_price: price,
          purchase_date: new Date().toISOString().split("T")[0]
        };
        updated.push(newItem);
      } else if (sharesDiff < 0) {
        let sharesToSell = Math.abs(sharesDiff);
        
        // Find matching items for this symbol in updated
        const symbolItems = updated.filter(item => item.symbol === symbol);
        // Sort FIFO
        symbolItems.sort((a, b) => a.purchase_date.localeCompare(b.purchase_date));
        
        for (const item of symbolItems) {
          if (sharesToSell <= 0) break;
          
          const itemInUpdated = updated.find(u => u.id === item.id);
          if (!itemInUpdated) continue;
          
          if (itemInUpdated.shares <= sharesToSell) {
            sharesToSell -= itemInUpdated.shares;
            updated = updated.filter(u => u.id !== item.id);
          } else {
            itemInUpdated.shares = Number((itemInUpdated.shares - sharesToSell).toFixed(4));
            sharesToSell = 0;
          }
        }
      }
    });
    
    setPortfolioItems(updated);
    localStorage.setItem("dashboard_portfolio_items", JSON.stringify(updated));
    triggerToast("Portfolio successfully rebalanced!", "success");
  };

  // --- DYNAMIC CALCULATORS ---
  // Re-compute portfolio parameters in real-time when stock price changes or holdings change!
  let totalPortfolioValue = 0;
  let totalPortfolioCost = 0;

  portfolioItems.forEach((item) => {
    const currentPrice = stocks[item.symbol]?.currentPrice || item.purchase_price;
    totalPortfolioValue += item.shares * currentPrice;
    totalPortfolioCost += item.shares * item.purchase_price;
  });

  const totalPortfolioGain = totalPortfolioValue - totalPortfolioCost;
  const totalPortfolioGainPercent = totalPortfolioCost > 0
    ? (totalPortfolioGain / totalPortfolioCost) * 100
    : 0;

  const selectedStock = stocks[selectedSymbol] || STOCKS_DB.AAPL;

  return (
    <StockContext.Provider
      value={{
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
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (context === undefined) {
    throw new Error("useStock must be used within a StockProvider");
  }
  return context;
};
