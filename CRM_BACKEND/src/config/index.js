import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const required = [
  'MONGO_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'PUBLIC_TOKEN_SECRET',
  'CLIENT_URL',
  'API_URL',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

const config = {
  env: process.env.NODE_ENV,
  port: Number(process.env.PORT),
  mongoUri: process.env.MONGO_URI,

  // Redis is optional — off until you set USE_REDIS=true and REDIS_URL
  redis: {
    enabled: process.env.USE_REDIS === 'true',
    url: process.env.REDIS_URL || '',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  publicToken: {
    secret: process.env.PUBLIC_TOKEN_SECRET,
    expiresIn: process.env.PUBLIC_TOKEN_EXPIRES_IN,
  },

  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  },

  urls: {
    client: process.env.CLIENT_URL,
    api: process.env.API_URL,
  },

  duffel: {
    apiKey: process.env.DUFFEL_API_KEY,
    env: process.env.DUFFEL_ENV,
    baseUrl: process.env.DUFFEL_BASE_URL,
    useMock: process.env.USE_MOCK_DUFFEL === 'true',
  },

  /**
   * Active flight search backend: duffel | flightmcp | serpapi | mock
   * Default duffel keeps existing deployments unchanged.
   */
  flightProvider: (process.env.FLIGHT_PROVIDER || 'duffel').toLowerCase(),

  flightmcp: {
    apiKey: process.env.FLIGHT_MCP_API_KEY || '',
    url:
      process.env.FLIGHT_MCP_URL ||
      'https://flight-mcp.com/v1/flights/search',
    currency: process.env.FLIGHT_MCP_CURRENCY || '',
    locale: process.env.FLIGHT_MCP_LOCALE || 'en-US',
    pointOfSaleCountry: process.env.FLIGHT_MCP_POS_COUNTRY || 'US',
    maxResults: Number(process.env.FLIGHT_MCP_MAX_RESULTS) || 20,
    cacheTtlSeconds: Number(process.env.FLIGHT_MCP_CACHE_TTL) || 300,
    timeoutMs: Number(process.env.FLIGHT_MCP_TIMEOUT_MS) || 30_000,
  },

  /** SerpApi Google Flights — quote/compare only (US CRM defaults). */
  serpapi: {
    apiKey: process.env.SERPAPI_API_KEY || '',
    baseUrl: process.env.SERPAPI_BASE_URL || 'https://serpapi.com/search',
    gl: process.env.SERPAPI_GL || 'us',
    hl: process.env.SERPAPI_HL || 'en',
    currency: process.env.SERPAPI_CURRENCY || 'USD',
    deepSearch: process.env.SERPAPI_DEEP_SEARCH === 'true',
    timeoutMs: Number(process.env.SERPAPI_TIMEOUT_MS) || 45_000,
  },

  pricing: {
    defaultMarkup: Number(process.env.DEFAULT_MARKUP),
    // Empty MERCHANT_FEE_PERCENT → Number('') === 0; treat as unset and fall back to 2
    merchantFeePercent: (() => {
      const raw = process.env.MERCHANT_FEE_PERCENT;
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        return 2;
      }
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : 2;
    })(),
    defaultCurrency: process.env.DEFAULT_CURRENCY || 'USD',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ,
  },

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
    adminFirstName: process.env.SEED_ADMIN_FIRST_NAME,
    adminLastName: process.env.SEED_ADMIN_LAST_NAME,
    agencyName: process.env.SEED_AGENCY_NAME,
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
    publicMax: Number(process.env.PUBLIC_RATE_LIMIT_MAX) || 30,
  },
};

export default config;
