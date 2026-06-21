'use client';

import React, { useState } from 'react';
import { SearchAndNewsBento } from '../components/SearchAndNewsBento';
import { FundamentalBento } from '../components/FundamentalBento';
import { BentoMatrix } from '../components/BentoMatrix';

export default function HomeDashboard() {
  const [globalSymbol, setGlobalSymbol] = useState('GLW');

  return (
    <main className="min-h-screen bg-slate-950 p-4 space-y-6 max-w-7xl mx-auto pb-24">
      
      {/* Search Terminal Hub & AI News Grid Matrix */}
      <section>
        <SearchAndNewsBento currentSymbol={globalSymbol} onSymbolSearch={setGlobalSymbol} />
      </section>

      {/* Asset Financial Fundamental Metrics Grid */}
      <section>
        <h2 className="text-base font-bold text-slate-200 mb-2 pl-1">Financial Fundamentals</h2>
        <FundamentalBento symbol={globalSymbol} onSymbolChange={setGlobalSymbol} />
      </section>

      {/* Real-time Streaming Technical Evaluation Grid */}
      <section>
        <h2 className="text-base font-bold text-slate-200 mb-2 pl-1">Live Technical Analysis</h2>
        <BentoMatrix symbol={globalSymbol} />
      </section>

    </main>
  );
}
