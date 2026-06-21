/**
 * Database Schema Definitions (Targeting PostgreSQL with Drizzle-style TypeScript types)
 * And high-performance Redis cached data design.
 * 
 * Target: Handles User Profiles, Watchlists, Custom Price Alerts, Sector mappings,
 * and caching strategies for real-time tickers.
 */

// --- SECTION 1: RELATIONAL DATABASE SCHEMA (PostgreSQL) ---

/**
 * 1. USER PROFILE TABLE
 * Stores account login state and investor profile classifications.
 */
export const usersSchema = `
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

/**
 * 2. INVESTOR PREFERENCE ENGINE TABLE
 * Customizes the UI dashboard, active indicator streams, and chart default structures
 * based on user investment classification.
 */
export const userProfilesSchema = `
CREATE TYPE investor_profile_enum AS ENUM ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM');

CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  trading_profile investor_profile_enum DEFAULT 'MEDIUM_TERM' NOT NULL,
  sectors_of_interest VARCHAR(100)[] DEFAULT ARRAY['Tech', 'Data Center', 'Energy']::VARCHAR[],
  alert_email_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  alert_webhook_url VARCHAR(512), -- Webhook / Discord Integration link
  modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

/**
 * 3. WATCHLIST TABLE
 * Organizes columns of watched tickers.
 */
export const watchlistsSchema = `
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'My Watchlist' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(user_id, name)
);
`;

/**
 * 4. WATCHLIST ITEMS TABLE
 * Tracks individual stock/crypto assets subscribed to each watchlist.
 */
export const watchlistItemsSchema = `
CREATE TABLE watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(watchlist_id, symbol)
);
`;

/**
 * 5. TECHNICAL AND PRICE ALERTS TABLE
 * Stores triggers configured by short and medium-term investors.
 * Triggers on absolute target value, breaking S1/S2/R1/R2 lines, or RSI cross conditions.
 */
export const priceAlertsSchema = `
CREATE TYPE alert_condition_enum AS ENUM ('ABOVE', 'BELOW', 'BREAK_RESISTANCE', 'BREAK_SUPPORT', 'RSI_OVERSOLD', 'RSI_OVERBOUGHT');

CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  condition_type alert_condition_enum NOT NULL,
  target_price DECIMAL(12, 4), -- optional threshold for static ABOVE / BELOW triggers
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_triggered BOOLEAN DEFAULT FALSE NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

/**
 * 6. BULK FUNDAMENTAL SCRAPE STORAGE (For Long-Term Valuation Filtering)
 * Caches dense, fundamental statements such as Operating Margins and P/E ratios in PostgreSQL
 * to optimize advanced screening queries.
 */
export const assetFundamentalsSchema = `
CREATE TABLE asset_fundamentals (
  symbol VARCHAR(20) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  sector VARCHAR(100) NOT NULL,
  industry VARCHAR(150),
  gross_margin DECIMAL(6, 2),        -- (Gross Profit / Revenue) * 100
  operating_margin DECIMAL(6, 2),    -- (Operating Income / Revenue) * 100
  net_margin DECIMAL(6, 2),          -- (Net Income / Revenue) * 100
  pe_ratio DECIMAL(10, 2),           -- Price to Earnings
  eps DECIMAL(10, 2),                -- Earnings Per Share
  revenue_growth_yoy DECIMAL(6, 2),  -- Year-over-Year Revenue Growth %
  market_cap DECIMAL(20, 2),         -- Total market capitalisation value
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;


// --- SECTION 2: HIGH-PERFORMANCE REDIS SCHEMA (Caching Strategy) ---

/**
 * For handling real-time price feeds of Nasdaq/NYSE/Crypto assets in high volume,
 * relational reads are too latent. We document the Redis structural namespaces:
 * 
 * 1. REAL-TIME TICKER DATA (String key caching JSON payload)
 *    Namespace: "ticker:{Symbol}"
 *    TTL: 120 Seconds (Dynamic fallback cache)
 *    Payload:
 *    {
 *       "symbol": "GLW",
 *       "price": 42.18,
 *       "change": 0.54,
 *       "change_percent": 1.30,
 *       "high": 42.45,
 *       "low": 41.80,
 *       "volume": 2840900,
 *       "last_trade_time": 1781878800000 -- Unix timestamp of last trade (e.g. Jun 18, 2026)
 *    }
 * 
 * 2. POPULAR INDEX RIBBON STATUS (Hash data structure for rapid loading)
 *    Namespace: "market:indices"
 *    Fields: "NDAQ", "DJI", "SPX", "BTC"
 *    Value Format (String): "4218.45|12.18|0.29|1781878800000" -- "Price|Change|Change%|Timestamp"
 * 
 * 3. TECHNICAL LEVEL PRE-CALCULATIONS (String caching Pivot lines)
 *    Namespace: "technical_pivot:{timeframe}:{Symbol}"
 *    TTL: 24 Hours
 *    Value Format (JSON):
 *    {
 *       "pivot": 41.54,
 *       "s1": 40.22, "s2": 39.10, "s3": 37.50,
 *       "r1": 42.88, "r2": 43.90, "r3": 45.10,
 *       "generated_at": "2026-06-18T16:00:00Z"
 *    }
 */

export const redisCacheKeysExample = {
  tickerKey: (symbol: string) => `ticker:${symbol.toUpperCase()}`,
  marketIndicesKey: "market:indices",
  pivotsKey: (symbol: string, tf: string = '1d') => `technical_pivot:${tf}:${symbol.toUpperCase()}`
};
