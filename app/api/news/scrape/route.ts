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
    console.log(`[Scraper API] Global limit reached. Bypassing Gemini API for the next 15 minutes.`);
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

// Scrape live financial news from RSS feeds
async function fetchAndParseScrapedNews(symbol: string, name: string): Promise<any[]> {
  try {
    // Search Google News specifically for Reuters, Bloomberg, CNBC, Financial Times, WSJ or MarketWatch articles
    const query = `${symbol} stock (site:reuters.com OR site:bloomberg.com OR site:cnbc.com OR site:wsj.com OR site:ft.com OR site:marketwatch.com)`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    
    let response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      },
      next: { revalidate: 180 } // cache for 3 minutes
    });

    let xmlText = "";
    if (response.ok) {
      xmlText = await response.text();
    }

    // Fallback search if the strict publisher query returned too few articles
    const itemRegexTest = /<item>([\s\S]*?)<\/item>/g;
    const initialMatches = xmlText.match(itemRegexTest);
    
    if (!response.ok || !initialMatches || initialMatches.length < 3) {
      console.log(`Strict search returned few results. Trying general search for: ${symbol} stock news`);
      const generalQuery = `${symbol} stock news`;
      const fallbackRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(generalQuery)}&hl=en-US&gl=US&ceid=US:en`;
      
      const fallbackResponse = await fetch(fallbackRssUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        },
        next: { revalidate: 180 }
      });
      if (fallbackResponse.ok) {
        xmlText = await fallbackResponse.text();
      }
    }

    const items: any[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null && items.length < 5) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      
      if (titleMatch && linkMatch) {
        const rawTitle = titleMatch[1].trim();
        const link = linkMatch[1].trim();
        const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
        const sourceName = sourceMatch ? sourceMatch[1].trim() : "Financial News";
        
        // Clean title (remove " - Source" or " - source" from the end)
        let cleanTitle = rawTitle;
        const sourceSuffixIndex = rawTitle.lastIndexOf(" - ");
        if (sourceSuffixIndex !== -1) {
          cleanTitle = rawTitle.substring(0, sourceSuffixIndex).trim();
        }
        
        // Parse publication date to relative string (e.g., "3h ago")
        let relativeTime = "Recently";
        if (pubDateStr) {
          try {
            const pubDate = new Date(pubDateStr);
            const now = new Date();
            const diffMs = now.getTime() - pubDate.getTime();
            const diffMins = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
              relativeTime = `${diffDays}d ago`;
            } else if (diffHours > 0) {
              relativeTime = `${diffHours}h ago`;
            } else if (diffMins > 0) {
              relativeTime = `${diffMins}m ago`;
            } else {
              relativeTime = "Just now";
            }
          } catch {
            relativeTime = "Recently";
          }
        }
        
        items.push({
          id: `scraped-${items.length + 1}`,
          title: cleanTitle,
          link,
          time: relativeTime,
          source: sourceName
        });
      }
    }

    return items;
  } catch (err) {
    console.error("Scraping and RSS parsing failed:", err);
    return [];
  }
}

// Generate fallback financial analysis locally in case Gemini is offline or ratelimited
function getLocalFallbackScrapedSummaries(scrapedItems: any[], symbol: string, name: string) {
  return scrapedItems.map((item, idx) => {
    const textToAnalyze = (item.title + " " + item.source).toLowerCase();
    
    const isUp = textToAnalyze.match(/(rise|climb|gain|rally|up|surge|beat|positive|growth|high|soar|higher|expand)/i);
    const isDown = textToAnalyze.match(/(fall|drop|loss|slump|down|plunge|miss|negative|low|decline|retreat|lower|shrink)/i);
    
    let sentiment = "neutral";
    let impactScore = 50;
    
    if (isUp) {
      sentiment = "positive";
      impactScore = 68 + Math.floor(Math.random() * 20);
    } else if (isDown) {
      sentiment = "negative";
      impactScore = 65 + Math.floor(Math.random() * 25);
    }
    
    const summary = `Recent developments reported by ${item.source} details shifting activity surrounding ${name} (${symbol}). Market participants are actively digesting the operational announcements and sector changes, closely examining support thresholds.`;
    
    const keyTakeaways = [
      `Article published ${item.time} by ${item.source} outlines key updates for ${symbol}.`,
      `Traders monitor the technical levels and volume trends following this news.`,
      `Broader sector correlations remain intact as investors adjust risk exposures.`
    ];
    
    const marketImpactAnalysis = sentiment === "positive" 
      ? `Likely to encourage short-term tactical bidding as support levels solidify.`
      : sentiment === "negative"
      ? `May present minor resistance as traders manage portfolios and risk benchmarks.`
      : `Broadly neutral; coordinates with existing market consensus and structural trends.`;
      
    return {
      id: item.id,
      title: item.title,
      source: item.source,
      time: item.time,
      link: item.link,
      summary,
      keyTakeaways,
      sentiment,
      marketImpactAnalysis,
      impactScore
    };
  });
}

// Simulated highly realistic fallback articles if RSS fetching itself fails
function getBackupArticles(symbol: string, name: string): any[] {
  const sources = ["Bloomberg", "CNBC", "Reuters", "The Wall Street Journal", "MarketWatch"];
  return [
    {
      id: "scraped-backup-1",
      title: `${symbol} Institutional Demand Accelerates on New Market Integration Forecasts`,
      source: sources[0],
      time: "45m ago",
      link: "https://www.bloomberg.com/markets"
    },
    {
      id: "scraped-backup-2",
      title: `${name} Operational Outlook Strengthens as Global Headwinds Decelerate`,
      source: sources[2],
      time: "2h ago",
      link: "https://www.reuters.com/business"
    },
    {
      id: "scraped-backup-3",
      title: `Analysts Debate Valuation Targets for ${symbol} Following Recent Earnings Pivot`,
      source: sources[1],
      time: "4h ago",
      link: "https://www.cnbc.com/finance"
    },
    {
      id: "scraped-backup-4",
      title: `How Shifting Yield Curves are Altering Institutional Allocations for ${name}`,
      source: sources[3],
      time: "1d ago",
      link: "https://www.wsj.com/market-data"
    }
  ];
}

export async function POST(req: NextRequest) {
  let symbol = "";
  let name = "";
  
  try {
    const body = await req.json();
    symbol = (body.symbol || "").trim().toUpperCase();
    name = (body.name || symbol).trim();
  } catch (err) {
    console.log("Parsing scrape body warning:", err);
  }

  if (!symbol) {
    return NextResponse.json({ error: "Stock symbol is required" }, { status: 400 });
  }

  // 1. Scrape real headlines
  let scrapedArticles = await fetchAndParseScrapedNews(symbol, name);
  let isUsingBackupArticles = false;
  
  if (scrapedArticles.length === 0) {
    console.log(`Failed to scrape live RSS for ${symbol}. Using highly realistic backing articles.`);
    scrapedArticles = getBackupArticles(symbol, name);
    isUsingBackupArticles = true;
  }

  // 2. Setup Gemini Generation
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("Gemini API key is not configured. Falling back to local analysis.");
    const fallbackNews = getLocalFallbackScrapedSummaries(scrapedArticles, symbol, name);
    return NextResponse.json({ 
      news: fallbackNews, 
      source: "local-fallback",
      isUsingBackupArticles 
    });
  }

  const generateWithGemini = async (modelName: string) => {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { "User-Agent": "aistudio-build" }
      }
    });

    const prompt = `You are an elite financial analyst and investment researcher. Analyze these ${scrapedArticles.length} financial news articles scraped for ${symbol} (${name}).
For each article, analyze and generate:
1. An elegant, professional summary (exactly 1-2 sentences focusing on what happened and why).
2. Exactly 3 distinct, high-quality bullet-point key takeaways.
3. Market impact sentiment: "positive", "negative", or "neutral" depending on the core story.
4. A concise, professional Market Impact Analysis sentence (explaining who benefits, who is harmed, and how it impacts ${symbol}'s stock).
5. An impact score (integer from 1 to 100 indicating importance).

Scraped articles to analyze:
${scrapedArticles.map((item, idx) => `
[Article #${idx + 1}]
Title: ${item.title}
Source: ${item.source}
Time: ${item.time}
Link: ${item.link}
`).join("\n")}

You MUST return a perfectly structured JSON object adhering exactly to the specified schema, preserving the link, source, title, and time properties from the input list.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: "You are an elite Wall Street financial journalist and stock market analyst. Generate highly precise, realistic, and company-specific news analysis in perfect JSON format.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            news: {
              type: Type.ARRAY,
              description: "Array of summarized news articles with deep takeaway details.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  source: { type: Type.STRING },
                  time: { type: Type.STRING },
                  link: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  keyTakeaways: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  sentiment: { type: Type.STRING },
                  marketImpactAnalysis: { type: Type.STRING },
                  impactScore: { type: Type.INTEGER }
                },
                required: ["id", "title", "source", "time", "link", "summary", "keyTakeaways", "sentiment", "marketImpactAnalysis", "impactScore"]
              }
            }
          },
          required: ["news"]
        }
      }
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("Empty response text received from Gemini model");
    }

    const parsed = JSON.parse(rawText.trim());
    
    // Map parsed results back to include the correct scraped links in case LLM missed them
    if (parsed.news && Array.isArray(parsed.news)) {
      parsed.news = parsed.news.map((item: any, idx: number) => {
        const original = scrapedArticles[idx] || scrapedArticles[0];
        return {
          ...item,
          id: item.id || `scraped-${idx + 1}`,
          link: item.link || original.link,
          source: item.source || original.source,
          time: item.time || original.time
        };
      });
    }

    return parsed.news;
  };

  // Try sequentially through a cascade of models for ultimate robustness
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    if (isModelRateLimited(currentModel)) {
      console.log(`[Scraper API] Skipping model ${currentModel} because it is currently marked as rate-limited.`);
      continue;
    }
    try {
      console.log(`[Scraper API] Attempting news summarization with model: ${currentModel}`);
      const news = await generateWithGemini(currentModel);
      console.log(`[Scraper API] Successfully generated news summarization with model: ${currentModel}`);
      return NextResponse.json({ 
        news, 
        source: `gemini-${currentModel}`,
        isUsingBackupArticles
      });
    } catch (err: any) {
      const isLast = i === modelsToTry.length - 1;
      const errMsg = err?.message || String(err);
      
      // If we see RESOURCE_EXHAUSTED, 429, or quota errors, mark this model as rate-limited
      if (errMsg.includes("429") || errMsg.toLowerCase().includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
        console.log(`[Scraper API] Model ${currentModel} returned quota notice. Marking global quota as exhausted for 15 minutes.`);
        markModelRateLimited(currentModel, true);
      }
      
      const friendlyMsg = getFriendlyErrorMessage(errMsg, currentModel);
      console.log(`[Scraper API] ${friendlyMsg} ${isLast ? "All fallback options completed." : "Trying next model..."}`);
      if (!isLast) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }
  }

  // Ultimate fallback to high-quality stock-specific fallback news generator if all fail
  console.log("[Scraper API] All models in cascade were busy. Rendering high-quality stock-specific fallback news.");
  const fallbackNews = getLocalFallbackScrapedSummaries(scrapedArticles, symbol, name);
  return NextResponse.json({ 
    news: fallbackNews, 
    source: "local-fallback",
    isUsingBackupArticles,
    error: "AI news generation services currently experiencing high demand" 
  });
}
