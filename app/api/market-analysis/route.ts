import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol')?.toUpperCase();

  if (!symbol) return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });

  try {
    // ดึงข้อมูลพื้นฐาน ข่าว และราคา จาก API ภายนอก
    const [priceRes, overviewRes, newsRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`),
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY}`),
      fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2026-06-01&to=2026-06-21&token=${process.env.FINNHUB_API_KEY}`)
    ]);

    const price = await priceRes.json();
    const fundamentals = await overviewRes.json();
    const news = await newsRes.json();

    // ตรวจสอบความถูกต้องของข้อมูล
    if (price.c === 0 && !fundamentals.Symbol) {
      throw new Error('Symbol not found or API limit reached');
    }

    return NextResponse.json({ symbol, price, fundamentals, news: news.slice(0, 5) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
