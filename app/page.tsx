'use client';
import { useState } from 'react';
import { useFinancialAnalysis } from '../hooks/useFinancialAnalysis'; // นำเข้าฮุค

export default function HomeDashboard() {
  const [globalSymbol, setGlobalSymbol] = useState('AAPL'); // ตัวอย่างเริ่มต้น
  const { data, loading, error } = useFinancialAnalysis(globalSymbol);

  return (
    <main className="min-h-screen bg-slate-950 p-4">
      {/* 1. ส่วน Search ของคุณ */}
      {/* ส่ง setGlobalSymbol ไปให้ component ค้นหาของคุณเพื่อเปลี่ยนค่า */}
      
      {loading && <p className="text-white">กำลังวิเคราะห์ข้อมูล...</p>}
      
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* นำข้อมูลจาก data ไปแสดงใน Bento Card ของคุณ */}
          <div className="bg-slate-900 p-4 rounded-xl text-white">
            <h2 className="text-xl font-bold">{data.symbol}</h2>
            <p>ราคา: ${data.price?.c}</p>
          </div>
          {/* ใส่ FundamentalBento และ NewsCard ที่นี่ */}
        </div>
      )}
    </main>
  );
}
