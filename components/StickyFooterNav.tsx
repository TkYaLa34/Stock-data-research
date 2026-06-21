import React from 'react';
import { Home, Bell, BarChart2, Users } from 'lucide-react';

export const StickyFooterNav: React.FC = () => {
  return (
    <div id="sticky-footer-nav" className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 md:hidden">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        
        <button id="nav-btn-dashboard" className="flex flex-col items-center justify-center text-cyan-400 active:scale-95 transition-transform cursor-pointer">
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Dashboard</span>
        </button>

        <button id="nav-btn-screener" className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 active:scale-95 transition-transform cursor-pointer">
          <BarChart2 className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Screener</span>
        </button>

        <button id="nav-btn-alerts" className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 active:scale-95 transition-transform relative cursor-pointer">
          <Bell className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Alerts</span>
          <span className="absolute top-1 right-2 h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
        </button>

        <button id="nav-btn-community" className="flex flex-col items-center justify-center text-slate-400 hover:text-slate-200 active:scale-95 transition-transform cursor-pointer">
          <Users className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-medium">Community</span>
        </button>

      </div>
    </div>
  );
};
