import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const aiStudioKey = process.env.GEMINI_API_KEY || '';
const finnhubKey = process.env.FINNHUB_API_KEY || 'demo';

const ai = new GoogleGenAI({ apiKey: aiStudioKey });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || 'GLW').toUpperCase();

  try {
    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const newsResponse = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${oneWeekAgo}&to=${today}&token=${finnhubKey}`,
      { next: { revalidate: 300 } }
    );
    const rawNews = await newsResponse.json();
    const topNews = Array.isArray(rawNews) ? rawNews.slice(0, 3) : [];

    if (topNews.length === 0) {
      return NextResponse.json({ error: 'No recent news found for this target asset.' }, { status: 404 });
    }

    const promptInstructions = `
      Analyze market sentiment for ${symbol} based on the following news objects:
      ${JSON.stringify(topNews.map(n => ({ headline: n.headline, summary: n.summary })))}
      
      Respond STRICTLY with a valid JSON array matching this typescript schema format. No markdown blocks, no text preambles:
      [
        {
          "headline": "Translate headline neatly to concise Thai language text",
          "aiSummary": "1-2 sentences summarizing core market impact details in Thai language",
          "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
          "impactScore": "numerical string 1 to 10"
        }
      ]
    `;

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptInstructions,
    });

    const aiText = aiResponse.text?.trim() || '[]';
    const analyzedNews = JSON.parse(aiText);

    return NextResponse.json({
      symbol,
      newsItems: analyzedNews,
      generatedAt: new Date().toLocaleTimeString('th-TH')
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
