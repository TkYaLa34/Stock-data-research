import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Maintain a static record of models that hit quota limits during runtime to prevent slow, useless requests.
const globalForRateLimits = global as typeof globalThis & {
  rateLimitedModels?: Map<string, number>;
  isQuotaExhausted?: boolean;
  quotaExhaustedTime?: number;
};

if (!globalForRateLimits.rateLimitedModels) {
  globalForRateLimits.rateLimitedModels = new Map<string, number>();
}

const RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown

const isModelRateLimited = (modelName: string): boolean => {
  if (globalForRateLimits.isQuotaExhausted && globalForRateLimits.quotaExhaustedTime) {
    if (Date.now() - globalForRateLimits.quotaExhaustedTime < RATE_LIMIT_COOLDOWN_MS) {
      return true;
    } else {
      globalForRateLimits.isQuotaExhausted = false;
    }
  }
  const limitTime = globalForRateLimits.rateLimitedModels?.get(modelName);
  if (!limitTime) return false;
  if (Date.now() - limitTime > RATE_LIMIT_COOLDOWN_MS) {
    globalForRateLimits.rateLimitedModels?.delete(modelName);
    return false;
  }
  return true;
};

const markModelRateLimited = (modelName: string, isQuota: boolean = false) => {
  if (isQuota) {
    globalForRateLimits.isQuotaExhausted = true;
    globalForRateLimits.quotaExhaustedTime = Date.now();
    console.log(`[News Feed] Global limit reached. Bypassing Gemini API for the next 15 minutes.`);
  } else {
    globalForRateLimits.rateLimitedModels?.set(modelName, Date.now());
  }
};

const getFriendlyErrorMessage = (errMsg: string, modelName: string): string => {
  const lowerMsg = errMsg.toLowerCase();
  if (lowerMsg.includes("429") || lowerMsg.includes("quota") || lowerMsg.includes("resource_exhausted")) {
    return `Model ${modelName} has hit daily/rate limits.`;
  }
  return `Model ${modelName} is busy or temporarily offline.`;
};

// Fallback generator for realistic news when Gemini API is not configured or fails
function getFallbackNews(symbol: string, name: string, price: number, change: number) {
  const isUp = change >= 0;
  const changeAbs = Math.abs(change).toFixed(2);
  
  const sources = ["Bloomberg", "CNBC", "Reuters", "The Wall Street Journal", "MarketWatch", "FT.com"];
  
  if (isUp) {
    return [
      {
        id: "fb-1",
        title: `${symbol} Shares Climb ${changeAbs}% Following Positive Analyst Upgrades`,
        source: sources[0],
        time: "45m ago",
        summary: `Wall Street analysts cited strong consumer demand and expanding margins as key drivers for revising their target pricing upward for ${name}.`,
        sentiment: "positive",
        impactScore: 82
      },
      {
        id: "fb-2",
        title: `${name} Unveils Next-Gen AI System for Enterprise Operations`,
        source: sources[1],
        time: "2h ago",
        summary: `The immediate market reaction reflects optimism around new recurring high-margin software revenue streams, pushing the price to $${price.toFixed(2)}.`,
        sentiment: "positive",
        impactScore: 90
      },
      {
        id: "fb-3",
        title: `Tech Sector Rallies as Volume Spikes in ${symbol} Long Positions`,
        source: sources[2],
        time: "4h ago",
        summary: `Institutional block orders were detected in morning trading, driving positive momentum across peers and solidifying key support levels.`,
        sentiment: "positive",
        impactScore: 75
      },
      {
        id: "fb-4",
        title: `What's Next For ${symbol} After Today's Resilient Breakthrough?`,
        source: sources[4],
        time: "5h ago",
        summary: `Market commentators evaluate historical support and resistance zones, suggesting the rally could establish a higher baseline for the upcoming quarter.`,
        sentiment: "neutral",
        impactScore: 50
      },
      {
        id: "fb-5",
        title: `Global Logistics Efficiencies Boost ${name} Profitability Outlook`,
        source: sources[3],
        time: "1d ago",
        summary: `Supply chain cost reductions are materializing faster than anticipated, leading to improved net profit margin expectations.`,
        sentiment: "positive",
        impactScore: 78
      }
    ];
  } else {
    return [
      {
        id: "fb-1",
        title: `${symbol} Faces Pressure, Slumping ${changeAbs}% Amid Sector Rotation`,
        source: sources[0],
        time: "1h ago",
        summary: `Investors are shifting capital away from high-beta stocks into defensive assets, impacting ${name} despite solid underlying fundamentals.`,
        sentiment: "negative",
        impactScore: 78
      },
      {
        id: "fb-2",
        title: `${name} Supply Constraints Spark Short-Term Growth Concerns`,
        source: sources[2],
        time: "3h ago",
        summary: `Slight manufacturing bottlenecks in overseas facilities could defer some delivery timelines into next quarter, causing minor retail panic.`,
        sentiment: "negative",
        impactScore: 85
      },
      {
        id: "fb-3",
        title: `Insider Trading Activity Analysis for ${symbol} Stocks`,
        source: sources[4],
        time: "6h ago",
        summary: `Standard pre-planned executive stock liquidation filings trigger automated algorithmic selling, though analysts advise keeping focus on core earnings.`,
        sentiment: "neutral",
        impactScore: 45
      },
      {
        id: "fb-4",
        title: `Options Market Signals Support Near Current levels for ${symbol}`,
        source: sources[1],
        time: "1d ago",
        summary: `Priced options data shows a high density of defensive put-writing, suggesting institutional investors anticipate a price floor around current trading ranges.`,
        sentiment: "positive",
        impactScore: 60
      },
      {
        id: "fb-5",
        title: `Macro Headwinds and Inflation Fears Drag on ${name} Valuation`,
        source: sources[3],
        time: "1d ago",
        summary: `Broader market correction triggers systemic index-selling, leading to an overextended pullback on several growth names including ${symbol}.`,
        sentiment: "negative",
        impactScore: 72
      }
    ];
  }
}

export async function POST(req: NextRequest) {
  let reqSymbol = "";
  let reqName = "";
  let reqPrice = 150.0;
  let reqChangePercent = 0.0;

  try {
    const body = await req.json();
    reqSymbol = body.symbol || "";
    reqName = body.name || reqSymbol;
    reqPrice = body.price !== undefined ? Number(body.price) : 150.0;
    reqChangePercent = body.changePercent !== undefined ? Number(body.changePercent) : 0.0;
  } catch (parseError) {
    console.log("Parsing request JSON body info:", parseError);
  }

  if (!reqSymbol) {
    return NextResponse.json({ error: "Stock symbol is required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Return beautiful fallback news immediately if API key isn't provided
    const fallbackNews = getFallbackNews(reqSymbol, reqName, reqPrice, reqChangePercent);
    return NextResponse.json({ news: fallbackNews, source: "fallback" });
  }

  // Define helper to generate content with Gemini
  const generateWithGemini = async (modelName: string) => {
    // Initialize Google GenAI on the server
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const isUp = reqChangePercent >= 0;
    const directionText = isUp ? "upward rally" : "downward correction";

    const prompt = `Generate exactly 5 highly realistic, professional, and diverse financial news headlines with summaries for the stock symbol: ${reqSymbol} (${reqName}).
The stock is currently trading at $${reqPrice.toFixed(2)} with a price change of ${isUp ? '+' : ''}${reqChangePercent.toFixed(2)}% today.
Create news items that provide high-quality context and reasons explaining this ${directionText} of ${reqChangePercent.toFixed(2)}% today.
Do not use generic placeholders.
Create varied, realistic financial publication sources (e.g., Bloomberg, CNBC, Reuters, The Wall Street Journal, MarketWatch, Financial Times).
Each news item should have:
1. id: unique string e.g. "news-1"
2. title: realistic, professional news headline specific to this stock.
3. source: news publication name.
4. time: relative time of publication (e.g., '30m ago', '2h ago', '4h ago', '1d ago').
5. summary: 1-2 professional sentences explaining the news details and its relationship to the company's business or industry context.
6. sentiment: "positive", "negative", or "neutral" depending on the headline content.
7. impactScore: an integer from 1 to 100 indicating market impact.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "You are an elite Wall Street financial journalist and stock market analyst. Generate highly precise, realistic, and company-specific news items in perfect JSON format adhering strictly to the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            news: {
              type: Type.ARRAY,
              description: "Array of generated news headlines with summaries.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  source: { type: Type.STRING },
                  time: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  sentiment: { type: Type.STRING },
                  impactScore: { type: Type.INTEGER }
                },
                required: ["id", "title", "source", "time", "summary", "sentiment", "impactScore"]
              }
            }
          },
          required: ["news"]
        }
      }
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("No response text from Gemini API");
    }

    const data = JSON.parse(rawText.trim());
    return data.news;
  };

  // Try sequentially through a cascade of models for ultimate robustness
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    if (isModelRateLimited(currentModel)) {
      console.log(`[News Feed] Skipping model ${currentModel} because it is currently marked as rate-limited.`);
      continue;
    }
    try {
      console.log(`[News Feed] Attempting news generation with model: ${currentModel}`);
      const news = await generateWithGemini(currentModel);
      console.log(`[News Feed] Successfully generated news with model: ${currentModel}`);
      return NextResponse.json({ news, source: `gemini-${currentModel}` });
    } catch (err: any) {
      const isLast = i === modelsToTry.length - 1;
      const errMsg = err?.message || String(err);
      
      // If we see RESOURCE_EXHAUSTED, 429, or quota errors, mark this model as rate-limited
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        console.log(`[News Feed] Model ${currentModel} returned quota notice. Marking global quota as exhausted for 15 minutes.`);
        markModelRateLimited(currentModel, true);
      }
      
      const friendlyMsg = getFriendlyErrorMessage(errMsg, currentModel);
      console.log(`[News Feed] ${friendlyMsg} ${isLast ? "All fallback options completed." : "Trying next model..."}`);
      if (!isLast) {
        // Short pause before next model attempt to let spikes clear
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }
  }

  // Ultimate fallback to high-quality stock-specific fallback news generator if all fail
  console.log("[News Feed] All models in cascade were busy. Rendering high-quality stock-specific fallback news.");
  const fallbackNews = getFallbackNews(reqSymbol, reqName, reqPrice, reqChangePercent);
  return NextResponse.json({ 
    news: fallbackNews, 
    source: "error-fallback", 
    error: "AI news generation services currently experiencing high demand" 
  });
}
