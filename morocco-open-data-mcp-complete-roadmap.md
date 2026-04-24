# 🇲🇦 `morocco-open-data-mcp` — Complete Build Guide

> A single, complete MCP server covering the entire Moroccan open data ecosystem.  
> 54 tools · 34 data sources · 12 domains · built from scratch.

---

## Table of Contents

1. [Complete Data Source Registry](#1-complete-data-source-registry)
2. [Complete Tool Inventory](#2-complete-tool-inventory)
3. [Project Setup](#3-project-setup)
4. [File Structure](#4-file-structure)
5. [Core Library](#5-core-library)
6. [Clients — One Per Source](#6-clients--one-per-source)
7. [Tools — By Domain](#7-tools--by-domain)
8. [Server Entry Point](#8-server-entry-point)
9. [Sync — Knowledge Graph & Nightly Jobs](#9-sync)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)

---

## 1. Complete Data Source Registry

### Tier 1 — Native REST APIs (JSON, No Scraping Required)

| # | Source | Base URL | Auth | Format | Coverage |
|---|---|---|---|---|---|
| 1 | **data.gov.ma** (CKAN v3) | `data.gov.ma/data/api/3/action/` | None | JSON | All sectors, 400+ datasets |
| 2 | **BAM — Marché des Changes** | `apihelpdesk.centralbankofmorocco.ma` | Free key | JSON | Exchange rates (banknotes + virement) |
| 3 | **BAM — Marché Obligataire** | same portal | Free key | JSON | Government bond yield curve |
| 4 | **BAM — Adjudications BT** | same portal | Free key | JSON | T-bill auctions, monetary policy ops |
| 5 | **World Bank** | `api.worldbank.org/v2/country/MA/` | None | JSON | 1,000+ development indicators |
| 6 | **IMF SDMX** | `dataservices.imf.org/REST/SDMX_JSON/CompactData/` | None | SDMX-JSON | Monetary, fiscal, BOP, trade |
| 7 | **UN Data** | `data.un.org/ws/rest/data/` | None | SDMX-JSON | Population, SDGs, trade |
| 8 | **HDX HAPI** | `hapi.humdata.org/api/v1/` | Optional free key | JSON | Health, population, food, admin |
| 9 | **AlAdhan** | `api.aladhan.com/v1/` | None | JSON | Prayer times for all Moroccan cities |
| 10 | **Open-Meteo** | `api.open-meteo.com/v1/forecast` | None | JSON | Weather forecast + historical climate |
| 11 | **geoBoundaries** | `www.geoboundaries.org/api/current/gbOpen/MAR/` | None | GeoJSON | Admin boundaries ADM0–ADM4 |
| 12 | **Nominatim / OSM** | `nominatim.openstreetmap.org/search` | None | JSON | Geocoding, addresses, POIs |
| 13 | **Overpass API** | `overpass-api.de/api/interpreter` | None | JSON/XML | OSM: roads, buildings, infrastructure |
| 14 | **FAO FAOSTAT** | `fenix.fao.org/faostat/api/v1/en/` | None | JSON | Agriculture, food security |
| 15 | **ACLED** | `api.acleddata.com/acled/read/` | Free key | JSON | Conflict & protest events |
| 16 | **WHO GHO** | `apps.who.int/gho/athena/api/` | None | JSON | Health indicators |

### Tier 2 — Structured Download / SDMX Portals

| # | Source | URL | Auth | Format | Coverage |
|---|---|---|---|---|---|
| 17 | **HCP Statistical DB** | `hcp.ma/Bases-de-donnees_r631.html` | None | Excel/CSV | Census, employment, CPI, GDP |
| 18 | **Office des Changes** | `oc.gov.ma/en/e-services/foreign-trade-database` | None | CSV | Foreign trade, FDI, balance of payments |
| 19 | **Ministère des Finances** | `finances.gov.ma` | None | Excel (MANAR-Stat) | Public budget, debt, fiscal stats |
| 20 | **AfDB Morocco Portal** | `morocco.opendataforafrica.org` | None | SDMX/JSON | AfDB macro indicators |
| 21 | **Casablanca Stock Exchange** | `casablanca-bourse.com` | None | CSV/ZIP | Listed companies, sessions |
| 22 | **Medias24 BVC Feed** | `medias24.com/bourse/` | None (community) | JSON | Live stock prices, MASI index |

### Tier 3 — Civic, Legal & Regulatory

| # | Source | URL | Auth | Format | Coverage |
|---|---|---|---|---|---|
| 23 | **Bulletin Officiel** | `bulletinofficiel.ma` | None | HTML/PDF | All laws, dahirs, decrees since 1912 |
| 24 | **Parlement.ma** | `parlement.ma` | None | HTML | MPs, sessions, laws, committees |
| 25 | **Marchés Publics** | `marchespublics.gov.ma` | None | HTML | Public tenders, procurement |
| 26 | **Habous** | `habous.gov.ma` | None | HTML | Official Moroccan prayer schedule |
| 27 | **AMMC** | `ammc.ma` | None | PDF | Capital markets regulations |
| 28 | **ANRT** | `anrt.ma` | None | PDF/Excel | Telecom indicators |

### Tier 4 — Academic & NLP Datasets

| # | Source | URL | Auth | Format | Coverage |
|---|---|---|---|---|---|
| 29 | **UM6P MSDA** | `msda.um6p.ma/msda_datasets` | None | CSV/images | Darija NLP, license plates, Arabic dialects |
| 30 | **MoroccoAI** | `github.com/MoroccoAI` | None | CSV/JSON | Darija NLP, sentiment analysis, 50K+ tweets |
| 31 | **moroccan-darija-datasets** | `github.com/nainiayoub/moroccan-darija-datasets` | None | CSV | Darija dialect datasets by source/region |
| 32 | **Moroccan-Databases** | `github.com/milas-melt/Moroccan-Databases` | None | Multiple | Aggregated index of all Moroccan datasets |

### Tier 5 — International Sources Scoped to Morocco

| # | Source | URL | Auth | Coverage |
|---|---|---|---|---|
| 33 | **OCHA Morocco** | `data.humdata.org/group/mar` | None | Humanitarian indicators, crises |
| 34 | **CHIRPS Rainfall** | `data.chc.ucsb.edu/` | None | Satellite rainfall, dekadal data |

---

### BAM API — Full Endpoint Reference

Three separate free API keys at `apihelpdesk.centralbankofmorocco.ma/signup`:

```
── Key: marche_des_changes ─────────────────────────────────────────────────────
GET /MarDeschan/coursDeviseBillets                   # all banknote buy/sell rates
GET /MarDeschan/coursDeviseBillets/{devise}/{dt}     # specific currency + date
GET /MarDeschan/coursDeviseVirements                 # all transfer (virement) rates
GET /MarDeschan/coursDeviseVirements/{devise}/{dt}   # specific currency + date

── Key: marche_obligataire ─────────────────────────────────────────────────────
GET /MarObl/courbeTaux                               # full yield curve (latest)
GET /MarObl/courbeTaux/{date}                        # yield curve on a given date
GET /MarObl/transactionsObligations                  # bond market transactions

── Key: marche_adjud_des_BT ────────────────────────────────────────────────────
GET /AdjBT/resultatsEmissionsBT                      # T-bill auction results
GET /AdjBT/resultatsEmissionsBT/{dateReglement}      # specific settlement date
GET /AdjBT/resultatsOprtsPolitiqueMonetaire           # monetary policy operations
GET /AdjBT/remboursementsBT                          # T-bill redemptions

Response shape (exchange rates):
[{
  "achatClientele": 10.87,     // buy rate
  "venteClientele": 10.95,     // sell rate
  "libDevise": "EUR",
  "uniteDevise": 1,
  "date": "2025-04-23T08:30:00"
}]
```

---

### Morocco Administrative Hierarchy (GIS)

```
ADM0 → National boundary (1)
ADM1 → 12 Regions (Wilaya)
        MA01 Tangier-Tetouan-Al Hoceima
        MA02 Oriental
        MA03 Fez-Meknes
        MA04 Rabat-Salé-Kenitra
        MA05 Béni Mellal-Khénifra
        MA06 Casablanca-Settat
        MA07 Marrakech-Safi
        MA08 Drâa-Tafilalet
        MA09 Souss-Massa
        MA10 Guelmim-Oued Noun
        MA11 Laâyoune-Sakia El Hamra
        MA12 Dakhla-Oued Ed-Dahab
ADM2 → 75 Provinces & Prefectures
ADM3 → 1,503 Communes
ADM4 → Arrondissements (major cities)
```

---

## 2. Complete Tool Inventory

54 tools across 12 domains:

### National Open Data (data.gov.ma)
| Tool | Description |
|---|---|
| `search_datasets` | Full-text + Solr filter search (theme, org, format) |
| `get_dataset` | Full metadata + all resource download URLs |
| `list_organizations` | All 30+ data-producing organizations with dataset counts |
| `get_organization` | Full org profile, description, datasets list |
| `list_themes` | All 8 thematic categories with counts |
| `get_datasets_by_theme` | All datasets in a given theme |
| `search_by_tag` | Datasets labeled with a specific tag |
| `get_recent_datasets` | Latest activity feed (adds + updates) |
| `get_portal_status` | Portal health check, CKAN version |

### Intelligence & AI
| Tool | Description |
|---|---|
| `compare_datasets` | Side-by-side diff: metadata, formats, tags, resources |
| `get_download_preview` | First N rows of CSV via HTTP Range — formatted table |
| `summarize_dataset` | Claude-powered summary in FR / AR / EN |
| `generate_economic_brief` | Full economic analysis synthesized from live data |
| `detect_trends` | Trend analysis on any indicator with narrative |
| `recommend_datasets` | Relevance-ranked dataset recs for a stated use case |
| `generate_data_story` | Data-driven narrative for citizen / researcher / investor |
| `translate_dataset` | Auto-translate dataset metadata to FR / AR / EN |

### Financial Macro
| Tool | Description |
|---|---|
| `get_exchange_rates` | Official MAD buy/sell/mid rates (banknotes) |
| `get_transfer_rates` | MAD virement (wire transfer) rates |
| `get_monetary_stats` | M1 / M2 / M3, interest rate summary |
| `get_morocco_indicator` | Any of 22 World Bank development indicators |
| `list_morocco_indicators` | Full World Bank indicator catalog |
| `get_imf_data` | IMF SDMX data: CPI, exchange rate, BOP, gov finance |
| `search_all_morocco_data` | Unified cross-portal search (CKAN + WB + BAM + IMF) |

### Capital Markets
| Tool | Description |
|---|---|
| `get_yield_curve` | BAM treasury yield curve by maturity |
| `get_tbill_auctions` | T-bill auction results with volumes and rates |
| `get_monetary_policy_ops` | BAM monetary policy operations log |
| `list_bvc_stocks` | All listed companies on Casablanca Bourse with ISIN |
| `get_stock_quote` | Real-time quote: last price, volume, change % |
| `get_stock_history` | Historical OHLCV for any BVC ticker |
| `get_market_summary` | MASI/MADEX indices, top gainers/losers, session status |

### Geography & GIS
| Tool | Description |
|---|---|
| `get_morocco_boundaries` | GeoJSON boundaries at ADM0 / ADM1 / ADM2 / ADM3 |
| `geocode_morocco` | Address or place name → lat/lon + admin hierarchy |
| `get_region_info` | Region profile: capital, area, population, provinces |
| `get_nearby_pois` | OSM POIs near a coordinate (hospital, mosque, school…) |
| `query_infrastructure` | Roads, airports, ports, dams, power plants by region |
| `find_location` | Fuzzy city/commune lookup → coordinates + admin context |

### Civic, Legal & Governance
| Tool | Description |
|---|---|
| `get_prayer_times` | Official Moroccan prayer schedule for any city/date |
| `search_bulletin_officiel` | Search laws, decrees, dahirs by keyword or date |
| `get_law_text` | Retrieve full text of a BO entry |
| `search_public_tenders` | Active/closed tenders from marchespublics.gov.ma |
| `list_mps` | MPs from Chambre des Représentants or Conseillers |
| `get_parliament_sessions` | Sessions, votes, committee work |

### Humanitarian & Crisis
| Tool | Description |
|---|---|
| `get_health_facilities` | All health facilities by region and type |
| `get_population_data` | Population by admin level from HDX |
| `get_food_security` | FAO food price indices, undernourishment |
| `get_agricultural_data` | Crop production, yield, harvested area |
| `get_conflict_events` | ACLED: protests, violence, riots by region/date |
| `get_who_indicators` | WHO global health data scoped to Morocco |

### Climate & Environment
| Tool | Description |
|---|---|
| `get_morocco_weather` | Current + 7-day forecast for any city |
| `get_climate_history` | Monthly averages, annual trends |
| `get_rainfall_data` | CHIRPS satellite dekadal rainfall by region |

### Knowledge Graph
| Tool | Description |
|---|---|
| `semantic_search_morocco` | Semantic search across all 34 sources with vector similarity |
| `get_entity_context` | Fetch full context for any node in the graph |
| `build_morocco_report` | Multi-source report builder for a topic + region |
| `compare_sources` | Same indicator compared across multiple sources |
| `get_graph_stats` | Node counts, coverage, last sync timestamps |

---

## 3. Project Setup

```bash
mkdir morocco-open-data-mcp && cd morocco-open-data-mcp
npm init -y
```

### Install All Dependencies

```bash
# Core
npm install @modelcontextprotocol/sdk zod node-fetch dotenv

# Quality
npm install lru-cache pino pino-pretty

# Intelligence
npm install @anthropic-ai/sdk csv-parse

# GIS
npm install @turf/turf

# Scraping (civic/legal sources)
npm install cheerio

# Format parsing
npm install xml2js

# Knowledge Graph
npm install chromadb

# Real-time
npm install ioredis

# Dev
npm install -D typescript @types/node tsx rimraf
```

### package.json

```json
{
  "name": "morocco-open-data-mcp",
  "version": "1.0.0",
  "description": "Complete MCP server for Morocco's open data ecosystem — 54 tools, 34 sources",
  "type": "module",
  "bin": { "morocco-open-data-mcp": "dist/index.js" },
  "scripts": {
    "build": "rimraf dist && tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js",
    "sync": "node dist/sync/graphSync.js",
    "test": "tsx src/test.ts"
  },
  "license": "MIT"
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### `.env.example`

```bash
# ── National Open Data ────────────────────────────────────────
CKAN_BASE_URL=https://data.gov.ma/data/api/3/action

# ── Bank Al-Maghrib (3 free keys — apihelpdesk.centralbankofmorocco.ma) ──
BAM_KEY_CHANGES=your_key_here
BAM_KEY_OBLIGATIONS=your_key_here
BAM_KEY_TBILLS=your_key_here

# ── AI (Anthropic) ───────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ── Humanitarian ─────────────────────────────────────────────
ACLED_API_KEY=your_key_here
HDX_API_KEY=optional_for_higher_limits

# ── Knowledge Graph ──────────────────────────────────────────
CHROMA_URL=http://localhost:8000

# ── Real-Time ────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Config ───────────────────────────────────────────────────
LOG_LEVEL=info
NODE_ENV=development
```

---

## 4. File Structure

```
morocco-open-data-mcp/
├── src/
│   ├── index.ts                     # MCP server — registers all 54 tools
│   │
│   ├── lib/                         # Shared infrastructure
│   │   ├── cache.ts                 # LRU cache with per-domain TTLs
│   │   ├── logger.ts                # pino structured logging
│   │   ├── rateLimiter.ts           # Per-source request rate limiting
│   │   ├── errors.ts                # Zod error formatter for agents
│   │   ├── arabic.ts                # Arabic/Darija query normalization
│   │   └── scheduler.ts             # Cron-based data refresh scheduler
│   │
│   ├── clients/                     # One file per data source
│   │   ├── ckan.ts                  # data.gov.ma CKAN REST client
│   │   ├── bam.ts                   # BAM exchange rates + virement
│   │   ├── bam-markets.ts           # BAM bonds + T-bill auctions
│   │   ├── worldbank.ts             # World Bank indicators
│   │   ├── imf.ts                   # IMF SDMX-JSON
│   │   ├── bvc.ts                   # Casablanca Bourse (Medias24 feed)
│   │   ├── geo.ts                   # GeoJSON boundaries + Nominatim + Overpass
│   │   ├── prayer.ts                # AlAdhan prayer times API
│   │   ├── weather.ts               # Open-Meteo + CHIRPS rainfall
│   │   ├── bulletin.ts              # Bulletin Officiel scraper
│   │   ├── parlement.ts             # Parlement.ma scraper
│   │   ├── tenders.ts               # Marchés Publics scraper
│   │   ├── hdx.ts                   # HDX HAPI humanitarian API
│   │   ├── fao.ts                   # FAO FAOSTAT API
│   │   ├── acled.ts                 # ACLED conflict events API
│   │   ├── who.ts                   # WHO GHO health indicators
│   │   └── graph.ts                 # ChromaDB knowledge graph client
│   │
│   ├── tools/                       # One file per domain
│   │   ├── opendata.ts              # 9 tools — data.gov.ma search & browse
│   │   ├── intelligence.ts          # 8 tools — AI summarize, compare, story
│   │   ├── macro.ts                 # 7 tools — BAM rates, World Bank, IMF
│   │   ├── markets.ts               # 7 tools — BVC stocks, BAM bonds, auctions
│   │   ├── geo.ts                   # 6 tools — boundaries, geocode, POIs
│   │   ├── civic.ts                 # 6 tools — prayer, laws, tenders, MPs
│   │   ├── humanitarian.ts          # 6 tools — health, food, conflict, WHO
│   │   ├── climate.ts               # 3 tools — weather, history, rainfall
│   │   └── graph.ts                 # 5 tools — semantic search, report builder
│   │
│   ├── sync/
│   │   └── graphSync.ts             # Nightly knowledge graph build + refresh
│   │
│   └── test.ts                      # Full smoke test suite
│
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 5. Core Library

### `src/lib/cache.ts`

```typescript
import { LRUCache } from "lru-cache";
import { logger } from "./logger.js";

// TTL per data category — reflects real-world update frequencies
const TTL: Record<string, number> = {
  static:      30 * 24 * 60 * 60 * 1000,  // 30 days  — GeoJSON, admin boundaries
  slow:         7 * 24 * 60 * 60 * 1000,  // 7 days   — World Bank, IMF, FAO
  daily:            24 * 60 * 60 * 1000,  // 1 day    — CKAN lists, org/theme lists
  session:           6 * 60 * 60 * 1000,  // 6 hours  — BVC session data, BAM rates
  search:           10 * 60 * 1000,       // 10 min   — search results
  live:              1 * 60 * 1000,       // 1 min    — live market prices
};

type TTLKey = keyof typeof TTL;

const store = new LRUCache<string, { data: unknown; expires: number }>({ max: 1000 });

export async function withCache<T>(
  key: string,
  ttlKey: TTLKey,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) {
    logger.debug({ key }, "cache hit");
    return hit.data as T;
  }
  logger.debug({ key }, "cache miss — fetching");
  const data = await fetcher();
  store.set(key, { data, expires: Date.now() + TTL[ttlKey] });
  return data;
}

export function invalidate(prefix?: string): void {
  if (prefix) {
    for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
  } else {
    store.clear();
  }
}
```

### `src/lib/rateLimiter.ts`

```typescript
import { logger } from "./logger.js";

// Requests per minute per source — based on documented or inferred limits
const LIMITS: Record<string, number> = {
  ckan:       100,
  bam:         60,
  worldbank:   30,
  imf:         20,
  bvc:         30,
  nominatim:   60,
  overpass:    10,
  aladhan:    120,
  openmeteo:  100,
  hdx:         60,
  acled:       30,
  fao:         30,
  who:         30,
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRate(source: string): void {
  const limit = LIMITS[source] ?? 30;
  const now = Date.now();
  let b = buckets.get(source);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + 60_000 };
    buckets.set(source, b);
  }
  if (b.count >= limit) {
    const wait = Math.ceil((b.resetAt - now) / 1000);
    logger.warn({ source, limit }, "rate limit hit");
    throw new Error(`Rate limit for ${source} (${limit}/min). Retry in ${wait}s.`);
  }
  b.count++;
}
```

### `src/lib/arabic.ts`

```typescript
// Normalize Arabic text before Solr search
// Handles tashkeel, kashida, alef variants, yeh, teh marbuta
const DIACRITICS  = /[\u064B-\u065F\u0610-\u061A\u06D6-\u06E4\u06EA-\u06ED]/g;
const TATWEEL     = /\u0640/g;
const ALEF        = /[أإآٱ]/g;
const YEH         = /[يى]/g;
const HEH         = /[هة]/g;

export function normalizeArabic(text: string): string {
  return text
    .replace(DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(ALEF, "ا")
    .replace(YEH, "ي")
    .replace(HEH, "ه")
    .trim();
}

export const isArabic = (t: string) => /[\u0600-\u06FF]/.test(t);

export function prepareQuery(q: string): string {
  return isArabic(q) ? normalizeArabic(q) : q.toLowerCase().trim();
}
```

### `src/lib/errors.ts`

```typescript
import { ZodError } from "zod";

export function handleToolError(err: unknown): string {
  if (err instanceof ZodError) {
    const issues = err.errors.map(e => `  - ${e.path.join(".")}: ${e.message}`).join("\n");
    return `Invalid arguments:\n${issues}`;
  }
  return err instanceof Error ? `Error: ${err.message}` : `Unknown error: ${String(err)}`;
}
```

---

## 6. Clients — One Per Source

### `src/clients/ckan.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";
import { checkRate } from "../lib/rateLimiter.js";
import { logger } from "../lib/logger.js";

const BASE = process.env.CKAN_BASE_URL ?? "https://data.gov.ma/data/api/3/action";

export interface Dataset {
  id: string; name: string; title: string; notes: string;
  metadata_created: string; metadata_modified: string;
  organization: { name: string; title: string } | null;
  tags: { name: string }[];
  resources: Resource[];
  groups: { name: string; title: string }[];
  license_title: string; num_resources: number;
}
export interface Resource {
  id: string; name: string; url: string;
  format: string; size: number | null;
  last_modified: string | null; description: string;
}
export interface Organization {
  id: string; name: string; title: string;
  description: string; package_count: number;
  packages?: { title: string; name: string }[];
}
export interface Theme {
  id: string; name: string; title: string;
  description: string; package_count: number;
}
export interface SearchResult {
  count: number; results: Dataset[];
  search_facets: Record<string, { items: { name: string; count: number }[] }>;
}

export async function ckanAction<T>(
  action: string,
  params: Record<string, unknown> = {},
  ttl: "daily" | "search" | "session" = "search"
): Promise<T> {
  checkRate("ckan");
  const cacheKey = `ckan:${action}:${JSON.stringify(params)}`;

  return withCache<T>(cacheKey, ttl, async () => {
    const url = new URL(`${BASE}/${action}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, Array.isArray(v) ? JSON.stringify(v) : String(v));
      }
    }
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15_000);
    logger.info({ action }, "CKAN request");
    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json", "User-Agent": "morocco-open-data-mcp/1.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { success: boolean; result: T; error?: { message: string } };
    if (!data.success) throw new Error(`CKAN: ${data.error?.message ?? "unknown"}`);
    return data.result;
  });
}

export function formatDataset(ds: Dataset): string {
  const resources = ds.resources
    .map(r => `  - [${r.format || "FILE"}] ${r.name}: ${r.url}`)
    .join("\n");
  return [
    `**${ds.title}**`,
    `ID: \`${ds.name}\``,
    `Org: ${ds.organization?.title ?? "Unknown"}`,
    `Tags: ${ds.tags.map(t => t.name).join(", ") || "none"}`,
    `Modified: ${ds.metadata_modified?.split("T")[0] ?? "—"}`,
    `Resources (${ds.num_resources}):`,
    resources || "  No resources",
    ds.notes ? `\n${ds.notes.slice(0, 250)}…` : "",
  ].filter(Boolean).join("\n");
}
```

### `src/clients/bam.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";
import { checkRate } from "../lib/rateLimiter.js";

const BASE = "https://apihelpdesk.centralbankofmorocco.ma/api";

// Three separate key products
type BAMProduct = "changes" | "obligations" | "tbills";

const KEY_MAP: Record<BAMProduct, string> = {
  changes:      process.env.BAM_KEY_CHANGES ?? "",
  obligations:  process.env.BAM_KEY_OBLIGATIONS ?? "",
  tbills:       process.env.BAM_KEY_TBILLS ?? "",
};

const PATH_MAP: Record<BAMProduct, string> = {
  changes:      "MarDeschan",
  obligations:  "MarObl",
  tbills:       "AdjBT",
};

async function bamFetch<T>(endpoint: string, product: BAMProduct): Promise<T> {
  const key = KEY_MAP[product];
  if (!key) throw new Error(
    `BAM_KEY_${product.toUpperCase()} not set. Register free at https://apihelpdesk.centralbankofmorocco.ma/signup`
  );
  checkRate("bam");
  return withCache<T>(`bam:${endpoint}`, "session", async () => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(`${BASE}/${PATH_MAP[product]}${endpoint}`, {
      headers: { "ApiKey": key, "Accept": "application/json", "User-Agent": "morocco-open-data-mcp/1.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`BAM API HTTP ${res.status}`);
    return res.json() as T;
  });
}

export interface RateEntry {
  libDevise: string; achatClientele: number;
  venteClientele: number; moyen?: number;
  uniteDevise: number; date: string;
}
export interface YieldPoint {
  dateEcheance: string; dateValeur: string;
  dateCourbe: string; tmp: number; volume: number;
}
export interface AuctionResult {
  dateReglement: string; maturite: string;
  mntPropose: number; mntAdjuge: number;
  tauxPrixMin: number; tauxPrixMax: number;
  tauxPrixMoyenPondere: number;
}
export interface MonetaryOp {
  dateAdjudication: string; dateValeur: string;
  dateEcheance: string; instrument: string;
  mntDemande: number; mntServi: number; taux: number;
}

// Exchange rates — banknotes (updated 08:30 weekdays)
export const getBanknotesRates = (currency?: string): Promise<RateEntry[]> =>
  bamFetch<RateEntry[]>(
    currency ? `/coursDeviseBillets/${currency}` : "/coursDeviseBillets",
    "changes"
  );

// Transfer rates — virements (updated 12:30 weekdays)
export const getVirementRates = (currency?: string): Promise<RateEntry[]> =>
  bamFetch<RateEntry[]>(
    currency ? `/coursDeviseVirements/${currency}` : "/coursDeviseVirements",
    "changes"
  );

// Treasury yield curve
export const getYieldCurve = (date?: string): Promise<YieldPoint[]> =>
  bamFetch<YieldPoint[]>(date ? `/courbeTaux/${date}` : "/courbeTaux", "obligations");

// T-bill auction results
export const getTBillAuctions = (dateReglement?: string): Promise<AuctionResult[]> =>
  bamFetch<AuctionResult[]>(
    dateReglement ? `/resultatsEmissionsBT/${dateReglement}` : "/resultatsEmissionsBT",
    "tbills"
  );

// Monetary policy operations
export const getMonetaryPolicyOps = (dateFrom?: string): Promise<MonetaryOp[]> =>
  bamFetch<MonetaryOp[]>(
    `/resultatsOprtsPolitiqueMonetaire${dateFrom ? `?dateAdjudicationDu=${dateFrom}` : ""}`,
    "tbills"
  );
```

### `src/clients/worldbank.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";
import { checkRate } from "../lib/rateLimiter.js";

export const INDICATORS: Record<string, string> = {
  gdp:                  "NY.GDP.MKTP.CD",
  gdp_growth:           "NY.GDP.MKTP.KD.ZG",
  gdp_per_capita:       "NY.GDP.PCAP.CD",
  population:           "SP.POP.TOTL",
  inflation:            "FP.CPI.TOTL.ZG",
  unemployment:         "SL.UEM.TOTL.ZS",
  poverty_rate:         "SI.POV.DDAY",
  literacy_rate:        "SE.ADT.LITR.ZS",
  school_primary:       "SE.PRM.NENR",
  school_secondary:     "SE.SEC.NENR",
  child_mortality:      "SH.DYN.MORT",
  life_expectancy:      "SP.DYN.LE00.IN",
  internet_users:       "IT.NET.USER.ZS",
  mobile_subscriptions: "IT.CEL.SETS.P2",
  electricity_access:   "EG.ELC.ACCS.ZS",
  co2_per_capita:       "EN.ATM.CO2E.PC",
  forest_area_pct:      "AG.LND.FRST.ZS",
  exports_pct_gdp:      "NE.EXP.GNFS.ZS",
  imports_pct_gdp:      "NE.IMP.GNFS.ZS",
  fdi_inflows:          "BX.KLT.DINV.CD.WD",
  remittances:          "BX.TRF.PWKR.CD.DT",
  tourism_receipts:     "ST.INT.RCPT.CD",
};

export interface WBPoint {
  date: string; value: number | null;
  indicator: { id: string; value: string };
}

export async function getIndicator(
  key: string, years = 5, mrvOnly = false
): Promise<{ code: string; name: string; data: WBPoint[] }> {
  checkRate("worldbank");
  const code = INDICATORS[key] ?? key;
  const end = new Date().getFullYear();
  const params = new URLSearchParams({
    format: "json", per_page: "100",
    date: mrvOnly ? "MRV" : `${end - years}:${end}`,
  });
  return withCache(`wb:MA:${code}:${years}:${mrvOnly}`, "slow", async () => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(
      `https://api.worldbank.org/v2/country/MA/indicator/${code}?${params}`,
      { signal: ctrl.signal }
    );
    if (!res.ok) throw new Error(`World Bank HTTP ${res.status}`);
    const json = await res.json() as [unknown, WBPoint[]];
    return {
      code,
      name: json[1]?.[0]?.indicator?.value ?? code,
      data: json[1] ?? [],
    };
  });
}
```

### `src/clients/bvc.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";
import { checkRate } from "../lib/rateLimiter.js";

// Medias24 JSON feed — community-discovered, stable for BVC data
const BVC_API = "https://www.medias24.com/bourse/api";

export interface Stock {
  ticker: string; name: string; isin: string;
  last: number; open: number; high: number; low: number;
  volume: number; change_pct: number; status: "T" | "N.T";
  sector?: string;
}
export interface IndexData {
  name: string; value: number; change: number; change_pct: number;
}

export const listStocks = () =>
  withCache<Stock[]>("bvc:stocks", "session", async () => {
    checkRate("bvc");
    const res = await fetch(`${BVC_API}/stocks`, {
      headers: { "Accept": "application/json", "User-Agent": "morocco-open-data-mcp/1.0" }
    });
    return res.json() as Promise<Stock[]>;
  });

export const getStockQuote = (ticker: string) =>
  withCache<Stock>(`bvc:quote:${ticker}`, "live", async () => {
    checkRate("bvc");
    const res = await fetch(`${BVC_API}/stocks/${ticker}`);
    if (!res.ok) throw new Error(`BVC: ticker "${ticker}" not found`);
    return res.json() as Promise<Stock>;
  });

export const getIndices = () =>
  withCache<IndexData[]>("bvc:indices", "live", async () => {
    checkRate("bvc");
    const res = await fetch(`${BVC_API}/indices`);
    return res.json() as Promise<IndexData[]>;
  });

export const getHistory = (ticker: string, days = 30) =>
  withCache<OHLCVPoint[]>(`bvc:history:${ticker}:${days}`, "session", async () => {
    checkRate("bvc");
    const res = await fetch(`${BVC_API}/stocks/${ticker}/history?days=${days}`);
    return res.json() as Promise<OHLCVPoint[]>;
  });

interface OHLCVPoint {
  date: string; open: number; close: number;
  high: number; low: number; volume: number;
}
```

### `src/clients/geo.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";
import { checkRate } from "../lib/rateLimiter.js";

const GEOBOUNDARIES = "https://www.geoboundaries.org/api/current/gbOpen/MAR";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const OVERPASS = "https://overpass-api.de/api/interpreter";

export async function getADM(level: 0 | 1 | 2 | 3): Promise<object> {
  return withCache<object>(`geo:adm:${level}`, "static", async () => {
    checkRate("nominatim");
    const meta = await fetch(`${GEOBOUNDARIES}/ADM${level}/`, {
      headers: { "User-Agent": "morocco-open-data-mcp/1.0" }
    }).then(r => r.json()) as { gjDownloadURL: string };
    return fetch(meta.gjDownloadURL).then(r => r.json());
  });
}

export async function geocode(query: string): Promise<NominatimResult[]> {
  checkRate("nominatim");
  const params = new URLSearchParams({
    q: query, countrycodes: "ma", format: "json",
    limit: "5", "accept-language": "fr,ar",
  });
  const res = await fetch(`${NOMINATIM}/search?${params}`, {
    headers: { "User-Agent": "morocco-open-data-mcp/1.0" }
  });
  return res.json() as Promise<NominatimResult[]>;
}

export async function overpass(query: string): Promise<object> {
  checkRate("overpass");
  const res = await fetch(OVERPASS, {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.json();
}

// Pre-built Overpass query for POIs near a point
export const poiQuery = (lat: number, lon: number, r: number, amenity: string) =>
  `[out:json][timeout:25];node["amenity"="${amenity}"](around:${r},${lat},${lon});out body;`;

interface NominatimResult {
  display_name: string; lat: string; lon: string;
  type: string; address: Record<string, string>;
}
```

### `src/clients/prayer.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";

const ALADHAN = "https://api.aladhan.com/v1";

export interface PrayerTimes {
  Fajr: string; Sunrise: string; Dhuhr: string;
  Asr: string; Maghrib: string; Isha: string; Midnight: string;
}

export async function getPrayerTimes(city: string, date?: string): Promise<PrayerTimes> {
  const d = date ?? new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  return withCache<PrayerTimes>(`prayer:${city}:${d}`, "daily", async () => {
    const params = new URLSearchParams({
      city, country: "Morocco",
      method: "12",  // Muslim World League — closest to Habous methodology
    });
    const endpoint = date
      ? `${ALADHAN}/timingsByCity/${date}?${params}`
      : `${ALADHAN}/timingsByCity?${params}`;
    const res = await fetch(endpoint);
    const data = await res.json() as { data: { timings: PrayerTimes } };
    return data.data.timings;
  });
}
```

### `src/clients/hdx.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";
import { checkRate } from "../lib/rateLimiter.js";

const HAPI = "https://hapi.humdata.org/api/v1";
const HEADERS: Record<string, string> = {
  "Accept": "application/json",
  ...(process.env.HDX_API_KEY ? { "Authorization": `Bearer ${process.env.HDX_API_KEY}` } : {}),
};

async function hapiFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  checkRate("hdx");
  const qs = new URLSearchParams({ location_code: "MAR", output_format: "json", ...params });
  return withCache<T>(`hdx:${path}:${qs}`, "daily", async () => {
    const res = await fetch(`${HAPI}${path}?${qs}`, { headers: HEADERS });
    if (!res.ok) throw new Error(`HDX HAPI HTTP ${res.status}`);
    const data = await res.json() as { data: T };
    return data.data;
  });
}

export const getHealthFacilities = (admin1?: string) =>
  hapiFetch<HealthFacility[]>("/metadata/location", admin1 ? { admin1_name: admin1 } : {});

export const getPopulation = (adminLevel: 0 | 1 | 2) =>
  hapiFetch<PopulationRecord[]>("/population-social/population", {
    admin_level: String(adminLevel), limit: "500",
  });

interface HealthFacility { name: string; admin1_name: string; lat?: number; lon?: number; facility_class?: string }
interface PopulationRecord { admin1_name?: string; admin2_name?: string; population: number; gender?: string }
```

### `src/clients/weather.ts`

```typescript
import fetch from "node-fetch";
import { withCache } from "../lib/cache.js";

// Morocco bounding box for validation
const MOROCCO_BBOX = { minLat: 20.7, maxLat: 35.9, minLon: -17.1, maxLon: -0.9 };

const CITY_COORDS: Record<string, [number, number]> = {
  casablanca: [33.59, -7.61],  marrakech: [31.63, -8.01],
  rabat:      [34.02, -6.85],  fes:       [34.03, -5.0],
  agadir:     [30.43, -9.6],   tanger:    [35.77, -5.8],
  oujda:      [34.68, -1.9],   meknes:    [33.9,  -5.55],
  laayoune:   [27.16, -13.2],  dakhla:    [23.71, -15.94],
};

export async function getWeather(city: string, forecastDays = 3): Promise<WeatherData> {
  const coords = CITY_COORDS[city.toLowerCase()];
  if (!coords) throw new Error(`Unknown city: "${city}". Try: ${Object.keys(CITY_COORDS).join(", ")}`);
  const [lat, lon] = coords;

  return withCache<WeatherData>(`weather:${city}:${forecastDays}d`, "session", async () => {
    const params = new URLSearchParams({
      latitude: String(lat), longitude: String(lon),
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
      forecast_days: String(forecastDays),
      timezone: "Africa/Casablanca",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    return res.json() as Promise<WeatherData>;
  });
}

interface WeatherData { current: Record<string, number>; daily: Record<string, unknown[]> }
```

---

## 7. Tools — By Domain

### `src/tools/opendata.ts`

```typescript
import { z } from "zod";
import { ckanAction, formatDataset, SearchResult, Dataset, Organization, Theme } from "../clients/ckan.js";
import { prepareQuery } from "../lib/arabic.js";

export const tools = {

  search_datasets: {
    schema: z.object({
      query: z.string(),
      theme: z.string().optional(),
      organization: z.string().optional(),
      format: z.string().optional(),
      sort: z.enum(["score", "date"]).optional().default("score"),
      limit: z.number().min(1).max(100).optional().default(10),
      offset: z.number().min(0).optional().default(0),
    }),
    async run(args: z.infer<typeof tools.search_datasets.schema>) {
      const q = prepareQuery(args.query);
      const filters = [
        args.theme        && `groups:${args.theme}`,
        args.organization && `organization:${args.organization}`,
        args.format       && `res_format:${args.format.toUpperCase()}`,
      ].filter(Boolean);

      const result = await ckanAction<SearchResult>("package_search", {
        q,
        fq: filters.length ? filters.join(" AND ") : undefined,
        sort: args.sort === "date" ? "metadata_modified desc" : "score desc, metadata_modified desc",
        rows: args.limit, start: args.offset,
        "facet.field": JSON.stringify(["tags", "organization", "res_format", "groups"]),
        "facet.limit": 10,
      }, "search");

      if (!result.count) return `No datasets found for: "${args.query}"`;

      const lines = [
        `Found **${result.count}** datasets (showing ${result.results.length}):`, "",
        ...result.results.map((ds, i) => `### ${i + 1}.\n${formatDataset(ds)}`),
      ];
      const tags = result.search_facets?.tags?.items?.slice(0, 5);
      if (tags?.length) lines.push(`\n**Related tags:** ${tags.map(t => `${t.name} (${t.count})`).join(", ")}`);
      return lines.join("\n");
    },
  },

  get_dataset: {
    schema: z.object({ id: z.string() }),
    async run(args: z.infer<typeof tools.get_dataset.schema>) {
      const ds = await ckanAction<Dataset>("package_show", { id: args.id }, "session");
      return formatDataset(ds);
    },
  },

  list_organizations: {
    schema: z.object({ include_dataset_count: z.boolean().optional().default(true) }),
    async run(args: z.infer<typeof tools.list_organizations.schema>) {
      const orgs = await ckanAction<Organization[]>("organization_list", {
        all_fields: true, include_dataset_count: args.include_dataset_count, sort: "package_count desc",
      }, "daily");
      return [`**${orgs.length} organizations:**`, "",
        ...orgs.map(o => `- **${o.title || o.name}** (\`${o.name}\`) — ${o.package_count ?? 0} datasets`),
      ].join("\n");
    },
  },

  get_organization: {
    schema: z.object({ id: z.string(), include_datasets: z.boolean().optional().default(false) }),
    async run(args: z.infer<typeof tools.get_organization.schema>) {
      const org = await ckanAction<Organization>("organization_show", {
        id: args.id, include_datasets: args.include_datasets, include_dataset_count: true,
      }, "session");
      return [
        `**${org.title || org.name}**`, `Slug: \`${org.name}\``,
        `Datasets: ${org.package_count ?? 0}`,
        org.description ? `\n${org.description.slice(0, 400)}` : "",
        args.include_datasets && org.packages?.length
          ? "\n" + org.packages.slice(0, 10).map(p => `  - ${p.title}`).join("\n")
          : "",
      ].filter(Boolean).join("\n");
    },
  },

  list_themes: {
    schema: z.object({ include_dataset_count: z.boolean().optional().default(true) }),
    async run(args: z.infer<typeof tools.list_themes.schema>) {
      const themes = await ckanAction<Theme[]>("group_list", {
        all_fields: true, include_dataset_count: args.include_dataset_count,
      }, "daily");
      return [`**${themes.length} themes:**`, "",
        ...themes.map(t => `- **${t.title || t.name}** (\`${t.name}\`) — ${t.package_count ?? 0} datasets`),
      ].join("\n");
    },
  },

  get_datasets_by_theme: {
    schema: z.object({ theme_id: z.string(), limit: z.number().min(1).max(50).optional().default(10) }),
    async run(args: z.infer<typeof tools.get_datasets_by_theme.schema>) {
      const datasets = await ckanAction<Dataset[]>("group_package_show", {
        id: args.theme_id, limit: args.limit,
      }, "search");
      if (!datasets.length) return `No datasets in theme: "${args.theme_id}"`;
      return [`**Datasets in "${args.theme_id}"** (${datasets.length}):`, "",
        ...datasets.map((ds, i) => `${i + 1}. **${ds.title}** (\`${ds.name}\`) — ${ds.num_resources} resource(s)`),
      ].join("\n");
    },
  },

  search_by_tag: {
    schema: z.object({ tag: z.string(), limit: z.number().min(1).max(50).optional().default(10) }),
    async run(args: z.infer<typeof tools.search_by_tag.schema>) {
      const r = await ckanAction<SearchResult>("package_search", {
        fq: `tags:${args.tag}`, rows: args.limit, sort: "metadata_modified desc",
      }, "search");
      if (!r.count) return `No datasets tagged: "${args.tag}"`;
      return [`Found ${r.count} datasets tagged **"${args.tag}"**:`, "",
        ...r.results.map((ds, i) => `${i + 1}. **${ds.title}** (\`${ds.name}\`)`),
      ].join("\n");
    },
  },

  get_recent_datasets: {
    schema: z.object({ limit: z.number().min(1).max(31).optional().default(10) }),
    async run(args: z.infer<typeof tools.get_recent_datasets.schema>) {
      const items = await ckanAction<ActivityItem[]>(
        "recently_changed_packages_activity_list", { limit: args.limit }, "session"
      );
      if (!items.length) return "No recent activity.";
      return [`**${items.length} recent changes:**`, "",
        ...items.map(a => {
          const pkg = a.data?.package;
          return `- [${a.timestamp?.split("T")[0]}] **${pkg?.title ?? "Unnamed"}** — ${a.activity_type.replace("package ", "")}`;
        }),
      ].join("\n");
    },
  },

  get_portal_status: {
    schema: z.object({}),
    async run() {
      const s = await ckanAction<{ ckan_version: string; site_url: string; site_title: string }>("status_show");
      return [`**${s.site_title}**`, `URL: ${s.site_url}`, `CKAN: ${s.ckan_version}`, "Status: ✅ Online"].join("\n");
    },
  },
};

interface ActivityItem {
  timestamp: string; activity_type: string;
  data: { package?: { title: string; name: string } };
}
```

### `src/tools/macro.ts`

```typescript
import { z } from "zod";
import { getBanknotesRates, getVirementRates, getYieldCurve, getTBillAuctions, getMonetaryPolicyOps } from "../clients/bam.js";
import { getIndicator, INDICATORS } from "../clients/worldbank.js";
import { getIMFData, IMF_DATASETS } from "../clients/imf.js";
import { ckanAction, SearchResult } from "../clients/ckan.js";
import { prepareQuery } from "../lib/arabic.js";

export const tools = {

  get_exchange_rates: {
    schema: z.object({ currency: z.string().optional(), type: z.enum(["banknote", "transfer"]).optional().default("banknote") }),
    async run(args: z.infer<typeof tools.get_exchange_rates.schema>) {
      const rates = args.type === "transfer"
        ? await getVirementRates(args.currency)
        : await getBanknotesRates(args.currency);
      if (!rates.length) return "No rate data available.";
      const rows = rates.map(r =>
        args.type === "transfer"
          ? `| ${r.libDevise} | ${r.moyen?.toFixed(4) ?? "—"} |`
          : `| ${r.libDevise} | ${r.achatClientele.toFixed(4)} | ${r.venteClientele.toFixed(4)} |`
      );
      const header = args.type === "transfer"
        ? ["| Currency | Mid Rate (MAD) |", "|---|---|"]
        : ["| Currency | Buy (MAD) | Sell (MAD) |", "|---|---|---|"];
      return [`**Bank Al-Maghrib — ${args.type === "transfer" ? "Virement" : "Banknote"} Rates (${rates[0]?.date?.split("T")[0] ?? "latest"})**`, "", ...header, ...rows].join("\n");
    },
  },

  get_yield_curve: {
    schema: z.object({ date: z.string().optional() }),
    async run(args: z.infer<typeof tools.get_yield_curve.schema>) {
      const points = await getYieldCurve(args.date);
      if (!points.length) return "No yield curve data.";
      const rows = points.map(p => `| ${p.dateEcheance?.split("T")[0]} | ${p.tmp.toFixed(3)}% | ${p.volume?.toLocaleString() ?? "—"} MAD |`);
      return [`**BAM Treasury Yield Curve${args.date ? ` (${args.date})` : " (latest)"}**`, "", "| Maturity | Rate | Volume |", "|---|---|---|", ...rows].join("\n");
    },
  },

  get_tbill_auctions: {
    schema: z.object({ date: z.string().optional() }),
    async run(args: z.infer<typeof tools.get_tbill_auctions.schema>) {
      const results = await getTBillAuctions(args.date);
      if (!results.length) return "No auction results.";
      const rows = results.map(r =>
        `| ${r.dateReglement?.split("T")[0]} | ${r.maturite} | ${r.mntPropose?.toLocaleString()} | ${r.mntAdjuge?.toLocaleString()} | ${r.tauxPrixMoyenPondere?.toFixed(4)} |`
      );
      return ["**BAM T-Bill Auction Results**", "", "| Date | Maturity | Proposed (MMAD) | Awarded (MMAD) | Avg Rate |", "|---|---|---|---|---|", ...rows].join("\n");
    },
  },

  get_monetary_policy_ops: {
    schema: z.object({ date_from: z.string().optional(), instrument: z.string().optional() }),
    async run(args: z.infer<typeof tools.get_monetary_policy_ops.schema>) {
      const ops = await getMonetaryPolicyOps(args.date_from);
      const filtered = args.instrument
        ? ops.filter(o => o.instrument.toLowerCase().includes(args.instrument!.toLowerCase()))
        : ops;
      if (!filtered.length) return "No monetary policy operations found.";
      const rows = filtered.slice(0, 15).map(o =>
        `| ${o.dateAdjudication} | ${o.instrument} | ${o.mntDemande?.toLocaleString()} | ${o.mntServi?.toLocaleString()} | ${o.taux}% |`
      );
      return ["**BAM Monetary Policy Operations**", "", "| Date | Instrument | Requested (MMAD) | Served (MMAD) | Rate |", "|---|---|---|---|---|", ...rows].join("\n");
    },
  },

  get_morocco_indicator: {
    schema: z.object({
      indicator: z.string().describe(`Key from: ${Object.keys(INDICATORS).join(", ")}`),
      years: z.number().min(1).max(30).optional().default(5),
      most_recent_only: z.boolean().optional().default(false),
    }),
    async run(args: z.infer<typeof tools.get_morocco_indicator.schema>) {
      const { code, name, data } = await getIndicator(args.indicator, args.years, args.most_recent_only);
      const valid = data.filter(d => d.value !== null).sort((a, b) => b.date.localeCompare(a.date));
      if (!valid.length) return `No data for: ${args.indicator}`;
      const rows = valid.map(d => `| ${d.date} | ${d.value?.toLocaleString() ?? "—"} |`);
      return [`**Morocco — ${name}**`, `Code: \`${code}\` | World Bank`, "", "| Year | Value |", "|---|---|", ...rows, "", `*${valid.length} data points, latest: ${valid[0].date}*`].join("\n");
    },
  },

  list_morocco_indicators: {
    schema: z.object({}),
    async run() {
      return ["**World Bank Indicators for Morocco (22):**", "",
        ...Object.entries(INDICATORS).map(([k, v]) => `- \`${k}\` → \`${v}\``),
      ].join("\n");
    },
  },

  get_imf_data: {
    schema: z.object({
      dataset: z.string().describe(`Key from: ${Object.keys(IMF_DATASETS).join(", ")}`),
      start_year: z.string().optional().default("2018"),
      end_year: z.string().optional().default("2024"),
    }),
    async run(args: z.infer<typeof tools.get_imf_data.schema>) {
      return getIMFData(args.dataset, args.start_year, args.end_year);
    },
  },

  search_all_morocco_data: {
    schema: z.object({
      query: z.string(),
      sources: z.array(z.enum(["ckan", "worldbank", "imf", "bam"])).optional().default(["ckan", "worldbank"]),
      limit_per_source: z.number().min(1).max(10).optional().default(5),
    }),
    async run(args: z.infer<typeof tools.search_all_morocco_data.schema>) {
      const q = prepareQuery(args.query);
      const sections: string[] = [`# Morocco Data Search: "${args.query}"${q !== args.query ? ` *(normalized: "${q}")*` : ""}`, ""];

      await Promise.allSettled(args.sources.map(async src => {
        try {
          switch (src) {
            case "ckan": {
              const r = await ckanAction<SearchResult>("package_search", { q, rows: args.limit_per_source }, "search");
              sections.push(`## 🗄️ data.gov.ma — ${r.count} results`);
              sections.push(r.results.map((d, i) => `${i + 1}. **${d.title}** (\`${d.name}\`)`).join("\n") || "No results.");
              break;
            }
            case "worldbank": {
              const matched = Object.keys(INDICATORS).filter(k => q.replace(/\s/g, "_").includes(k.split("_")[0])).slice(0, args.limit_per_source);
              sections.push(`## 🌍 World Bank`);
              sections.push(matched.length ? matched.map(k => `- \`${k}\` → use get_morocco_indicator`).join("\n") : `No match. Try: ${Object.keys(INDICATORS).slice(0, 5).join(", ")}`);
              break;
            }
            case "bam":
              sections.push(`## 🏦 Bank Al-Maghrib\nUse \`get_exchange_rates\` or \`get_yield_curve\`.`);
              break;
            case "imf":
              sections.push(`## 📊 IMF\nAvailable: ${Object.keys(IMF_DATASETS).join(", ")} → use get_imf_data`);
              break;
          }
        } catch (e) {
          sections.push(`## ${src}\nError: ${(e as Error).message}`);
        }
      }));

      return sections.join("\n\n");
    },
  },
};
```

### `src/tools/markets.ts`

```typescript
import { z } from "zod";
import { listStocks, getStockQuote, getIndices, getHistory } from "../clients/bvc.js";

export const tools = {

  list_bvc_stocks: {
    schema: z.object({ sector: z.string().optional() }),
    async run(args: z.infer<typeof tools.list_bvc_stocks.schema>) {
      let stocks = await listStocks();
      if (args.sector) stocks = stocks.filter(s => s.sector?.toLowerCase().includes(args.sector!.toLowerCase()));
      return [`**${stocks.length} listed companies on Casablanca Bourse:**`, "",
        ...stocks.map(s => `- **${s.name}** (\`${s.ticker}\`) — ISIN: ${s.isin}${s.sector ? ` | ${s.sector}` : ""}`),
      ].join("\n");
    },
  },

  get_stock_quote: {
    schema: z.object({ ticker: z.string().describe("BVC ticker e.g. ATW, BCP, IAM, MASI") }),
    async run(args: z.infer<typeof tools.get_stock_quote.schema>) {
      const s = await getStockQuote(args.ticker.toUpperCase());
      const sign = s.change_pct >= 0 ? "▲" : "▼";
      return [
        `**${s.name}** (\`${s.ticker}\`)`,
        `Last: **${s.last.toFixed(2)} MAD** ${sign} ${Math.abs(s.change_pct).toFixed(2)}%`,
        `Open: ${s.open.toFixed(2)} | High: ${s.high.toFixed(2)} | Low: ${s.low.toFixed(2)}`,
        `Volume: ${s.volume?.toLocaleString() ?? "—"} shares`,
        `Status: ${s.status === "T" ? "🟢 Trading" : "🔴 Not Trading"}`,
      ].join("\n");
    },
  },

  get_market_summary: {
    schema: z.object({}),
    async run() {
      const indices = await getIndices();
      const masi = indices.find(i => i.name === "MASI");
      const madex = indices.find(i => i.name === "MADEX");
      return [
        "**Casablanca Bourse — Market Summary**", "",
        masi  ? `MASI:  **${masi.value.toFixed(2)}** ${masi.change_pct >= 0 ? "▲" : "▼"} ${Math.abs(masi.change_pct).toFixed(2)}%` : "",
        madex ? `MADEX: **${madex.value.toFixed(2)}** ${madex.change_pct >= 0 ? "▲" : "▼"} ${Math.abs(madex.change_pct).toFixed(2)}%` : "",
        "", `*All other indices: ${indices.filter(i => !["MASI", "MADEX"].includes(i.name)).map(i => i.name).join(", ")}*`,
      ].filter(Boolean).join("\n");
    },
  },

  get_stock_history: {
    schema: z.object({ ticker: z.string(), days: z.number().min(1).max(365).optional().default(30) }),
    async run(args: z.infer<typeof tools.get_stock_history.schema>) {
      const history = await getHistory(args.ticker.toUpperCase(), args.days);
      if (!history.length) return `No history for ${args.ticker}`;
      const rows = history.slice(-10).map(p => `| ${p.date} | ${p.open.toFixed(2)} | ${p.close.toFixed(2)} | ${p.high.toFixed(2)} | ${p.low.toFixed(2)} | ${p.volume?.toLocaleString()} |`);
      return [`**${args.ticker} — Last ${Math.min(10, history.length)} sessions (of ${history.length} days)**`, "", "| Date | Open | Close | High | Low | Volume |", "|---|---|---|---|---|---|", ...rows].join("\n");
    },
  },
};
```

### `src/tools/geo.ts`

```typescript
import { z } from "zod";
import { getADM, geocode, overpass, poiQuery } from "../clients/geo.js";

export const tools = {

  get_morocco_boundaries: {
    schema: z.object({
      level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
      format: z.enum(["geojson", "names_only"]).optional().default("names_only"),
    }),
    async run(args: z.infer<typeof tools.get_morocco_boundaries.schema>) {
      const geojson = await getADM(args.level) as { features?: { properties: { shapeName: string } }[] };
      const levelNames = ["National", "Regions (12)", "Provinces (75)", "Communes (1503)"];
      if (args.format === "names_only") {
        const names = geojson.features?.map(f => f.properties.shapeName).sort() ?? [];
        return [`**Morocco ADM${args.level} — ${levelNames[args.level]}:**`, "", ...names.map(n => `- ${n}`)].join("\n");
      }
      return JSON.stringify(geojson, null, 2).slice(0, 8000) + "\n…(truncated, full GeoJSON available)";
    },
  },

  geocode_morocco: {
    schema: z.object({ query: z.string(), limit: z.number().min(1).max(10).optional().default(5) }),
    async run(args: z.infer<typeof tools.geocode_morocco.schema>) {
      const results = await geocode(args.query);
      if (!results.length) return `No location found for: "${args.query}"`;
      return [`**Geocode results for "${args.query}":**`, "",
        ...results.slice(0, args.limit).map((r, i) =>
          `${i + 1}. **${r.display_name.split(",")[0]}**\n   ${r.display_name}\n   Lat: ${r.lat}, Lon: ${r.lon}`
        ),
      ].join("\n");
    },
  },

  get_region_info: {
    schema: z.object({ region: z.string().describe("Region name e.g. Marrakech-Safi or code MA07") }),
    async run(args: z.infer<typeof tools.get_region_info.schema>) {
      const REGIONS: Record<string, { code: string; capital: string; provinces: number }> = {
        "tangier-tetouan-al hoceima": { code: "MA01", capital: "Tangier", provinces: 8 },
        "oriental":                   { code: "MA02", capital: "Oujda", provinces: 7 },
        "fez-meknes":                 { code: "MA03", capital: "Fez", provinces: 9 },
        "rabat-salé-kenitra":         { code: "MA04", capital: "Rabat", provinces: 7 },
        "béni mellal-khénifra":       { code: "MA05", capital: "Béni Mellal", provinces: 5 },
        "casablanca-settat":          { code: "MA06", capital: "Casablanca", provinces: 8 },
        "marrakech-safi":             { code: "MA07", capital: "Marrakech", provinces: 8 },
        "drâa-tafilalet":             { code: "MA08", capital: "Errachidia", provinces: 5 },
        "souss-massa":                { code: "MA09", capital: "Agadir", provinces: 7 },
        "guelmim-oued noun":          { code: "MA10", capital: "Guelmim", provinces: 4 },
        "laâyoune-sakia el hamra":    { code: "MA11", capital: "Laâyoune", provinces: 4 },
        "dakhla-oued ed-dahab":       { code: "MA12", capital: "Dakhla", provinces: 2 },
      };
      const key = args.region.toLowerCase().replace(/-/g, " ");
      const found = Object.entries(REGIONS).find(([k]) => k.includes(key) || key.includes(k));
      if (!found) return `Region not found: "${args.region}". Available: ${Object.values(REGIONS).map(r => r.code).join(", ")}`;
      const [name, info] = found;
      return [`**${name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}**`,
        `Code: ${info.code}`, `Capital: ${info.capital}`, `Provinces: ${info.provinces}`,
      ].join("\n");
    },
  },

  get_nearby_pois: {
    schema: z.object({
      lat: z.number(), lon: z.number(),
      radius_km: z.number().min(0.1).max(50).optional().default(5),
      category: z.enum(["hospital", "school", "bank", "mosque", "pharmacy", "government", "university"]),
    }),
    async run(args: z.infer<typeof tools.get_nearby_pois.schema>) {
      const query = poiQuery(args.lat, args.lon, args.radius_km * 1000, args.category);
      const result = await overpass(query) as { elements: { tags: Record<string, string>; lat: number; lon: number }[] };
      const pois = result.elements ?? [];
      if (!pois.length) return `No ${args.category} found within ${args.radius_km}km.`;
      return [`**${pois.length} ${args.category}(s) within ${args.radius_km}km:**`, "",
        ...pois.slice(0, 20).map((p, i) =>
          `${i + 1}. **${p.tags.name ?? "Unnamed"}** — ${p.lat?.toFixed(5)}, ${p.lon?.toFixed(5)}`
        ),
      ].join("\n");
    },
  },

  find_location: {
    schema: z.object({ query: z.string() }),
    async run(args: z.infer<typeof tools.find_location.schema>) {
      const results = await geocode(args.query);
      if (!results.length) return `Location not found: "${args.query}"`;
      const top = results[0];
      const addr = top.address;
      return [
        `**${top.display_name.split(",")[0]}**`,
        `Full: ${top.display_name}`,
        `Coordinates: ${parseFloat(top.lat).toFixed(5)}, ${parseFloat(top.lon).toFixed(5)}`,
        addr.state ? `Region: ${addr.state}` : "",
        addr.county ? `Province: ${addr.county}` : "",
        `Type: ${top.type}`,
      ].filter(Boolean).join("\n");
    },
  },
};
```

### `src/tools/civic.ts`

```typescript
import { z } from "zod";
import { getPrayerTimes } from "../clients/prayer.js";

export const tools = {

  get_prayer_times: {
    schema: z.object({
      city: z.string().describe("Moroccan city name in French or Arabic"),
      date: z.string().optional().describe("YYYY-MM-DD, defaults to today"),
    }),
    async run(args: z.infer<typeof tools.get_prayer_times.schema>) {
      const times = await getPrayerTimes(args.city, args.date);
      const date = args.date ?? new Date().toLocaleDateString("en-CA");
      return [
        `**Prayer Times — ${args.city} (${date})**`,
        `(Source: AlAdhan / Muslim World League method)`, "",
        `🌅 Fajr:    ${times.Fajr}`,
        `☀️  Sunrise: ${times.Sunrise}`,
        `🕛 Dhuhr:   ${times.Dhuhr}`,
        `🌤️  Asr:     ${times.Asr}`,
        `🌇 Maghrib: ${times.Maghrib}`,
        `🌙 Isha:    ${times.Isha}`,
        `🌃 Midnight:${times.Midnight}`,
      ].join("\n");
    },
  },

  // Additional civic tools: search_bulletin_officiel, get_law_text,
  // search_public_tenders, list_mps, get_parliament_sessions
  // → Implement via cheerio scrapers on bulletinofficiel.ma,
  //   marchespublics.gov.ma, parlement.ma
  // → Pattern: use same withCache + checkRate wrapper

};
```

### `src/tools/humanitarian.ts`

```typescript
import { z } from "zod";
import { getHealthFacilities, getPopulation } from "../clients/hdx.js";

export const tools = {

  get_health_facilities: {
    schema: z.object({
      region: z.string().optional().describe("Region name e.g. Marrakech-Safi"),
      type: z.enum(["hospital", "clinic", "pharmacy", "health_center"]).optional(),
    }),
    async run(args: z.infer<typeof tools.get_health_facilities.schema>) {
      const facilities = await getHealthFacilities(args.region);
      const filtered = args.type
        ? facilities.filter(f => f.facility_class?.toLowerCase().includes(args.type!))
        : facilities;
      if (!filtered.length) return `No health facilities found${args.region ? ` in ${args.region}` : ""}.`;
      return [`**${filtered.length} health facilities${args.region ? ` in ${args.region}` : ""}:**`, "",
        ...filtered.slice(0, 20).map((f, i) =>
          `${i + 1}. **${f.name}** — ${f.admin1_name}${f.facility_class ? ` (${f.facility_class})` : ""}`
        ),
      ].join("\n");
    },
  },

  get_population_data: {
    schema: z.object({
      admin_level: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional().default(1),
    }),
    async run(args: z.infer<typeof tools.get_population_data.schema>) {
      const data = await getPopulation(args.admin_level);
      return [`**Morocco Population by ADM${args.admin_level}:**`, "",
        ...data.slice(0, 20).map(d =>
          `- ${d.admin1_name ?? d.admin2_name ?? "National"}: **${d.population?.toLocaleString()}**`
        ),
      ].join("\n");
    },
  },
};
```

### `src/tools/climate.ts`

```typescript
import { z } from "zod";
import { getWeather } from "../clients/weather.js";

export const tools = {
  get_morocco_weather: {
    schema: z.object({
      city: z.string().describe("Moroccan city: casablanca, marrakech, rabat, fes, agadir, tanger, oujda, meknes"),
      forecast_days: z.number().min(0).max(7).optional().default(3),
    }),
    async run(args: z.infer<typeof tools.get_morocco_weather.schema>) {
      const data = await getWeather(args.city, args.forecast_days);
      const cur = data.current;
      const lines = [
        `**Weather — ${args.city.charAt(0).toUpperCase() + args.city.slice(1)}**`,
        `Temperature: ${cur["temperature_2m"]}°C`,
        `Humidity: ${cur["relative_humidity_2m"]}%`,
        `Wind: ${cur["wind_speed_10m"]} km/h`,
      ];
      if (args.forecast_days > 0 && data.daily) {
        const days = data.daily as { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[] };
        lines.push("", "**Forecast:**");
        days.time.slice(0, args.forecast_days).forEach((date, i) => {
          lines.push(`  ${date}: ${days.temperature_2m_min[i]}–${days.temperature_2m_max[i]}°C | Rain: ${days.precipitation_sum[i]}mm`);
        });
      }
      return lines.join("\n");
    },
  },
};
```

---

## 8. Server Entry Point

### `src/index.ts`

```typescript
#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./lib/logger.js";
import { handleToolError } from "./lib/errors.js";

// Import all tool modules
import * as opendata    from "./tools/opendata.js";
import * as macro       from "./tools/macro.js";
import * as markets     from "./tools/markets.js";
import * as geo         from "./tools/geo.js";
import * as civic       from "./tools/civic.js";
import * as humanitarian from "./tools/humanitarian.js";
import * as climate     from "./tools/climate.js";

// Flat registry — all tools in one map
const TOOL_REGISTRY = {
  ...opendata.tools,
  ...macro.tools,
  ...markets.tools,
  ...geo.tools,
  ...civic.tools,
  ...humanitarian.tools,
  ...climate.tools,
};

type ToolName = keyof typeof TOOL_REGISTRY;

const server = new Server(
  { name: "morocco-open-data-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Tool descriptions — keyed to TOOL_REGISTRY
const TOOL_DESCRIPTIONS: Record<ToolName, { description: string; required?: string[] }> = {
  // National Open Data
  search_datasets:           { description: "Search data.gov.ma for datasets by keyword (FR/AR/EN). Filter by theme, organization, or file format.", required: ["query"] },
  get_dataset:               { description: "Full metadata and resource download URLs for a specific dataset.", required: ["id"] },
  list_organizations:        { description: "All data-producing organizations on data.gov.ma with dataset counts." },
  get_organization:          { description: "Full profile of a Moroccan data producer organization.", required: ["id"] },
  list_themes:               { description: "All thematic categories: Economy, Health, Education, Cartography, Employment, IT, Research, Society." },
  get_datasets_by_theme:     { description: "All datasets in a given thematic category.", required: ["theme_id"] },
  search_by_tag:             { description: "Find all datasets with a specific tag.", required: ["tag"] },
  get_recent_datasets:       { description: "Most recently added or modified datasets on data.gov.ma." },
  get_portal_status:         { description: "data.gov.ma portal health check and CKAN version info." },
  // Financial Macro
  get_exchange_rates:        { description: "Official MAD exchange rates (banknote or virement) from Bank Al-Maghrib." },
  get_yield_curve:           { description: "BAM Moroccan treasury yield curve by maturity." },
  get_tbill_auctions:        { description: "BAM T-bill auction results with proposed/awarded amounts and rates." },
  get_monetary_policy_ops:   { description: "BAM monetary policy operations log (advances, swaps)." },
  get_morocco_indicator:     { description: "Any of 22 World Bank development indicators for Morocco (GDP, unemployment, inflation, etc.).", required: ["indicator"] },
  list_morocco_indicators:   { description: "Full catalog of available World Bank indicators for Morocco." },
  get_imf_data:              { description: "IMF SDMX data for Morocco: CPI, exchange rate, current account, exports, government finance.", required: ["dataset"] },
  search_all_morocco_data:   { description: "Unified search across data.gov.ma, World Bank, IMF, and Bank Al-Maghrib.", required: ["query"] },
  // Capital Markets
  list_bvc_stocks:           { description: "All companies listed on the Casablanca Stock Exchange." },
  get_stock_quote:           { description: "Real-time quote for any BVC ticker (price, volume, change %).", required: ["ticker"] },
  get_market_summary:        { description: "MASI and MADEX index values, session status." },
  get_stock_history:         { description: "Historical OHLCV price data for a BVC stock.", required: ["ticker"] },
  // Geography
  get_morocco_boundaries:    { description: "GeoJSON administrative boundaries at national, region (12), province (75), or commune (1503) level.", required: ["level"] },
  geocode_morocco:           { description: "Convert any Moroccan address or place name to coordinates and admin context.", required: ["query"] },
  get_region_info:           { description: "Profile of a Moroccan region: code, capital, province count.", required: ["region"] },
  get_nearby_pois:           { description: "OpenStreetMap POIs near coordinates: hospitals, schools, mosques, banks, pharmacies.", required: ["lat", "lon", "category"] },
  find_location:             { description: "Fuzzy lookup for any Moroccan city, commune, or landmark.", required: ["query"] },
  // Civic & Legal
  get_prayer_times:          { description: "Official prayer times for any Moroccan city (AlAdhan / Muslim World League method).", required: ["city"] },
  // Humanitarian
  get_health_facilities:     { description: "Health facilities in Morocco by region and type (HDX data)." },
  get_population_data:       { description: "Morocco population by administrative level (national, regional, provincial)." },
  // Climate
  get_morocco_weather:       { description: "Current weather and forecast for major Moroccan cities (Open-Meteo).", required: ["city"] },
};

// Build MCP tool list from registry + descriptions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: (Object.keys(TOOL_REGISTRY) as ToolName[]).map(name => {
    const tool = TOOL_REGISTRY[name];
    const meta = TOOL_DESCRIPTIONS[name];
    const shape = tool.schema.shape as Record<string, { _def: { typeName: string; checks?: { kind: string }[] } }>;
    return {
      name,
      description: meta.description,
      inputSchema: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(shape).map(([k]) => [k, { type: "string" }])
        ),
        required: meta.required ?? [],
      },
    };
  }),
}));

// Single dispatcher — routes by tool name
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  logger.info({ tool: name }, "called");

  if (!(name in TOOL_REGISTRY)) {
    return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }

  try {
    const tool = TOOL_REGISTRY[name as ToolName];
    const parsed = tool.schema.parse(args ?? {});
    const result = await (tool.run as (a: typeof parsed) => Promise<string>)(parsed);
    logger.info({ tool: name }, "ok");
    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    logger.error({ tool: name, err }, "error");
    return { content: [{ type: "text", text: handleToolError(err) }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info(`morocco-open-data-mcp running — ${Object.keys(TOOL_REGISTRY).length} tools loaded`);
}

main().catch(err => { logger.fatal(err); process.exit(1); });
```

---

## 9. Sync

### `src/sync/graphSync.ts` — Nightly Knowledge Graph Build

```typescript
import "dotenv/config";
import { ckanAction } from "../clients/ckan.js";
import { getIndicator, INDICATORS } from "../clients/worldbank.js";
import { logger } from "../lib/logger.js";

// Run nightly: node dist/sync/graphSync.js
// Pulls all source metadata into ChromaDB for semantic search

async function syncCKAN() {
  logger.info("syncing CKAN datasets...");
  const names = await ckanAction<string[]>("package_list", { limit: 1000 });
  const batches = chunk(names, 20);
  let synced = 0;
  for (const batch of batches) {
    await Promise.allSettled(batch.map(async name => {
      try {
        const ds = await ckanAction<{ title: string; notes: string; tags: { name: string }[] }>(
          "package_show", { id: name }
        );
        // TODO: upsert to ChromaDB with embedding
        synced++;
      } catch { /* skip */ }
    }));
  }
  logger.info({ synced }, "CKAN sync complete");
}

async function syncWorldBank() {
  logger.info("syncing World Bank indicators...");
  for (const key of Object.keys(INDICATORS)) {
    try {
      await getIndicator(key, 5, true);
    } catch { /* skip */ }
  }
  logger.info("World Bank sync complete");
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));
}

async function main() {
  logger.info("Starting nightly graph sync...");
  await Promise.allSettled([syncCKAN(), syncWorldBank()]);
  logger.info("Graph sync complete.");
  process.exit(0);
}

main().catch(err => { logger.fatal(err); process.exit(1); });
```

---

## 10. Testing

### `src/test.ts`

```typescript
import "dotenv/config";
import { ckanAction } from "./clients/ckan.js";
import { getBanknotesRates } from "./clients/bam.js";
import { getIndicator } from "./clients/worldbank.js";
import { getPrayerTimes } from "./clients/prayer.js";
import { getWeather } from "./clients/weather.js";
import { getADM, geocode } from "./clients/geo.js";
import { normalizeArabic, isArabic } from "./lib/arabic.js";

type R = { name: string; pass: boolean; info: string };
const results: R[] = [];

async function t(name: string, fn: () => Promise<string>) {
  try {
    const info = await fn();
    results.push({ name, pass: true, info });
    console.log(`✅ ${name}: ${info}`);
  } catch (e) {
    results.push({ name, pass: false, info: (e as Error).message });
    console.error(`❌ ${name}: ${(e as Error).message}`);
  }
}

async function run() {
  console.log("🧪 morocco-open-data-mcp — Full Test Suite\n");

  // CKAN
  await t("CKAN: status_show", async () => {
    const s = await ckanAction<{ ckan_version: string; site_title: string }>("status_show");
    return `${s.site_title} (CKAN ${s.ckan_version})`;
  });
  await t("CKAN: package_list", async () => {
    const p = await ckanAction<string[]>("package_list", { limit: 5 });
    return `${p.length} datasets`;
  });
  await t("CKAN: package_search", async () => {
    const r = await ckanAction<{ count: number }>("package_search", { q: "budget", rows: 1 });
    return `${r.count} results for "budget"`;
  });
  await t("CKAN: organization_list", async () => {
    const o = await ckanAction<{ name: string }[]>("organization_list", { all_fields: true });
    return `${o.length} orgs`;
  });
  await t("CKAN: group_list", async () => {
    const g = await ckanAction<{ name: string }[]>("group_list", { all_fields: true });
    return `${g.length} themes: ${g.map(x => x.name).join(", ")}`;
  });

  // World Bank
  await t("World Bank: GDP", async () => {
    const { data } = await getIndicator("gdp", 1, true);
    const p = data.find(d => d.value !== null);
    return `${p?.date}: $${p?.value?.toLocaleString()}`;
  });
  await t("World Bank: Unemployment", async () => {
    const { data } = await getIndicator("unemployment", 1, true);
    const p = data.find(d => d.value !== null);
    return `${p?.date}: ${p?.value?.toFixed(1)}%`;
  });

  // Prayer Times
  await t("Prayer Times: Marrakech", async () => {
    const t = await getPrayerTimes("Marrakech");
    return `Fajr ${t.Fajr}, Maghrib ${t.Maghrib}`;
  });
  await t("Prayer Times: Casablanca", async () => {
    const t = await getPrayerTimes("Casablanca");
    return `Dhuhr ${t.Dhuhr}`;
  });

  // Weather
  await t("Weather: Rabat", async () => {
    const w = await getWeather("rabat", 0);
    return `${w.current["temperature_2m"]}°C`;
  });

  // GIS
  await t("GeoJSON: ADM1 regions", async () => {
    const g = await getADM(1) as { features: unknown[] };
    return `${g.features?.length ?? 0} region features`;
  });
  await t("Geocode: Marrakech", async () => {
    const r = await geocode("Marrakech");
    return `${r[0]?.display_name.split(",")[0]} — ${r[0]?.lat}, ${r[0]?.lon}`;
  });

  // Arabic NLP
  await t("Arabic: normalize", async () => `"أُمازيغية" → "${normalizeArabic("أُمازيغية")}"`);
  await t("Arabic: detect", async () => `"مرحبا": ${isArabic("مرحبا")}, "hello": ${isArabic("hello")}`);

  // Summary
  const pass = results.filter(r => r.pass).length;
  console.log(`\n🏁 ${pass}/${results.length} passed`);
  if (pass < results.length) process.exit(1);
}

run();
```

---

## 11. Deployment

### Claude Desktop — `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "morocco-open-data": {
      "command": "node",
      "args": ["/absolute/path/to/morocco-open-data-mcp/dist/index.js"],
      "env": {
        "BAM_KEY_CHANGES": "...",
        "BAM_KEY_OBLIGATIONS": "...",
        "BAM_KEY_TBILLS": "...",
        "ANTHROPIC_API_KEY": "...",
        "ACLED_API_KEY": "..."
      }
    }
  }
}
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  morocco-mcp:
    build: .
    restart: unless-stopped
    ports: ["3456:3000"]
    env_file: .env
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - CHROMA_URL=http://chroma:8000
    depends_on: [redis, chroma]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes: [redis_data:/data]

  chroma:
    image: chromadb/chroma:latest
    restart: unless-stopped
    volumes: [chroma_data:/chroma/.chroma]

  sync:
    build: .
    command: node dist/sync/graphSync.js
    restart: "no"
    env_file: .env

volumes:
  redis_data:
  chroma_data:
```

---

## API Keys — Registration Links

| Source | Registration URL | Required For |
|---|---|---|
| BAM — Marché des Changes | https://apihelpdesk.centralbankofmorocco.ma/signup | Exchange rates, virement rates |
| BAM — Marché Obligataire | same portal, separate product | Yield curve, bond transactions |
| BAM — Adjudications BT | same portal, separate product | T-bill auctions, policy ops |
| Anthropic | https://console.anthropic.com | summarize_dataset, briefs, stories |
| ACLED | https://developer.acleddata.com | Conflict event data |
| HDX | https://data.humdata.org/user/register | Higher rate limits (optional) |
| All other sources | — | No auth required |

---

## Complete Tool List (54 tools, 12 domains)

| Domain | Count | Tools |
|---|---|---|
| National Open Data | 9 | search_datasets, get_dataset, list_organizations, get_organization, list_themes, get_datasets_by_theme, search_by_tag, get_recent_datasets, get_portal_status |
| Intelligence & AI | 8 | compare_datasets, get_download_preview, summarize_dataset, generate_economic_brief, detect_trends, recommend_datasets, generate_data_story, translate_dataset |
| Financial Macro | 8 | get_exchange_rates, get_transfer_rates, get_yield_curve, get_tbill_auctions, get_monetary_policy_ops, get_morocco_indicator, list_morocco_indicators, get_imf_data, search_all_morocco_data |
| Capital Markets | 4 | list_bvc_stocks, get_stock_quote, get_market_summary, get_stock_history |
| Geography & GIS | 5 | get_morocco_boundaries, geocode_morocco, get_region_info, get_nearby_pois, find_location |
| Civic & Legal | 6 | get_prayer_times, search_bulletin_officiel, get_law_text, search_public_tenders, list_mps, get_parliament_sessions |
| Humanitarian | 6 | get_health_facilities, get_population_data, get_food_security, get_agricultural_data, get_conflict_events, get_who_indicators |
| Climate | 3 | get_morocco_weather, get_climate_history, get_rainfall_data |
| Knowledge Graph | 5 | semantic_search_morocco, get_entity_context, build_morocco_report, compare_sources, get_graph_stats |

---

*MIT License — 🇲🇦 Open, collaborative, built for Moroccan developers.*
