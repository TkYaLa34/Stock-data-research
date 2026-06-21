import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Dynamic initialization using process.env
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the workspace environmental secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Mock news data bank representing latest scraped raw headlines related to sectors
const NEWS_ARCHIVE: { [key: string]: string[] } = {
  GLW: [
    "Corning Inc. announces massive shipment of newly developed bendable glass to major smartphone manufacturer.",
    "Industrial fiber optic demand surges 12% YoY, boosting Corning's optical communications segment.",
    "Analysts raise target margin on GLW ahead of Q3 earnings citing robust raw glass inventory controls.",
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
    "Visa launches local financial literacy initiative supporting boutique technology startups."
  ],
  XOM: [
    "ExxonMobil advances carbon recovery pilot facility in premium deep-sea drilling block.",
    "Crude prices fluctuate as global freight routes report minor weather bottlenecks.",
    "Energy sector analysts note strong net operating cash flows from XOM's high-efficiency wells.",
    "Refining margin benchmarks adjust with seasonal transition in European fuel pipelines.",
    "XOM schedules routine exploration inspection in Atlantic shelf zone."
  ],
  DEFAULT: [
    "Federal Reserve holds baseline lending targets steady as primary inflation indicators taper toward normal thresholds.",
    "Tech index leads broader indexes on afternoon rally led by high-efficiency server hardware manufacturers.",
    "Global raw commodity networks report strong supply balances, soothing intermediate processing margins.",
    "Sovereign bond indices remain in tight range as volume metrics indicate institutional portfolio rebalancing.",
    "Retail digital commerce platforms report healthy consumer transaction rates during flash sales."
  ]
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbol = (body.symbol || "GLW").toUpperCase();
    
    // Choose active headlines set
    const headlines = NEWS_ARCHIVE[symbol] || NEWS_ARCHIVE.DEFAULT;
    
    // Bullet string
    const inputBulletPoints = headlines.map((h, i) => `${i + 1}. ${h}`).join("\n");
    
    const client = getGeminiClient();
    
    const prompt = `
YOU ARE A HIGHLY REGARDED FINANCIAL ANALYST.
Below are raw, un-curated financial news headlines pertaining to the ticker of interest: [${symbol}].

RAW HEADLINES:
${inputBulletPoints}

Please compile and synthesize these headlines into an elegant, professional, and bite-sized bulleted summary (exactly 3 high-impact bullet items, with brief descriptive bold headers).
Focus deeply on:
- "Why the asset is moving"
- The fundamental catalyst involved
- What this means for Short-term vs. Long-term positions.

Keep your response professional, objective, and dense with precise financial terminology. Avoid fluff, self-promotion, or generic disclaimers. Avoid referring to yourself as an AI assistant.
`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });

    const summaryText = response.text || "Unable to generate dynamic news analysis at this time.";
    
    return NextResponse.json({
      success: true,
      symbol,
      summary: summaryText,
      sourceHeadlines: headlines
    });
    
  } catch (err: any) {
    console.error("AI Daily News summary route failure:", err);
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || "Internal server error performing news synthesis." 
      },
      { status: 500 }
    );
  }
}
