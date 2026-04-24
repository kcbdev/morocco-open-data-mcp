/**
 * Morocco Open Data MCP Server
 *
 * A Model Context Protocol (MCP) server providing unified access to Moroccan
 * government data sources, financial markets, GIS, humanitarian data, and more.
 *
 * @version 1.0.0
 * @author Morocco Open Data Initiative
 * @license MIT
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// Import clients
import { CKANClient } from "./clients/ckan.js";
import { BAMClient } from "./clients/bam.js";
import { WorldBankClient } from "./clients/worldbank.js";
import { BVCClient } from "./clients/bvc.js";
import { defaultPrayerClient, MOROCCO_CITIES } from "./clients/prayer.js";
import { defaultCache } from "./lib/cache.js";
import {
  initializeRateLimiter,
  defaultRateLimiter,
} from "./lib/rateLimiter.js";
import { ValidationError, toMCPError } from "./lib/errors.js";

// Server configuration
const SERVER_NAME = "morocco-open-data";
const SERVER_VERSION = "1.0.0";
const SERVER_DESCRIPTION =
  "MCP server for Morocco Open Data - Providing unified access to Moroccan government data sources, financial markets, GIS, and more";

// Initialize clients with shared cache and rate limiter
const cache = defaultCache;
const rateLimiter = defaultRateLimiter;

// Initialize rate limits for all sources
initializeRateLimiter(rateLimiter);

const clients = {
  ckan: new CKANClient({ cache, rateLimiter }),
  bam: new BAMClient({ cache, rateLimiter }),
  worldBank: new WorldBankClient({ cache, rateLimiter }),
  bvc: new BVCClient({ cache, rateLimiter }),
  prayer: defaultPrayerClient,
};

// Tool definitions
const tools: Tool[] = [
  // === OPEN DATA TOOLS ===
  {
    name: "search_datasets",
    description:
      "Search for datasets on Morocco's national open data portal (data.gov.ma). Supports Arabic, French, and English queries.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (supports Arabic, French, English)",
        },
        limit: {
          type: "number",
          description: "Number of results (default: 10)",
          default: 10,
        },
        organization: {
          type: "string",
          description: "Filter by organization ID",
        },
        format: {
          type: "string",
          description: "Filter by resource format (CSV, JSON, XML, etc.)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_dataset",
    description:
      "Get detailed information about a specific dataset from data.gov.ma",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Dataset ID or name" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_organizations",
    description: "List all organizations publishing data on data.gov.ma",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of results",
          default: 50,
        },
      },
    },
  },
  {
    name: "search_by_tag",
    description: "Search datasets by tag on data.gov.ma",
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "Tag to search for" },
        limit: {
          type: "number",
          description: "Number of results",
          default: 20,
        },
      },
      required: ["tag"],
    },
  },

  // === FINANCIAL & MACROECONOMIC TOOLS ===
  {
    name: "get_exchange_rates",
    description:
      "Get current exchange rates from Bank Al-Maghrib (Morocco's central bank)",
    inputSchema: {
      type: "object",
      properties: {
        currency: {
          type: "string",
          description:
            "Specific currency code (e.g., USD, EUR). Leave empty for all currencies",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
      },
    },
  },
  {
    name: "get_interest_rates",
    description:
      "Get key interest rates and monetary policy rates from Bank Al-Maghrib",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Rate type: 'key' for main rate, 'all' for all rates",
          default: "all",
        },
      },
    },
  },
  {
    name: "get_inflation_data",
    description:
      "Get inflation and consumer price index data from Bank Al-Maghrib",
    inputSchema: {
      type: "object",
      properties: {
        year: { type: "string", description: "Year (default: current year)" },
      },
    },
  },
  {
    name: "get_money_supply",
    description:
      "Get money supply aggregates (M1, M2, M3) from Bank Al-Maghrib",
    inputSchema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "get_treasury_bills",
    description: "Get treasury bills auction results from Bank Al-Maghrib",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Bill type (e.g., '13 weeks', '26 weeks', '52 weeks')",
        },
        limit: {
          type: "number",
          description: "Number of results",
          default: 10,
        },
      },
    },
  },
  {
    name: "get_world_bank_indicators",
    description:
      "Get World Bank development indicators for Morocco (GDP, population, poverty, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        indicator: {
          type: "string",
          description: "Indicator code (e.g., 'NY.GDP.MKTP.CD' for GDP)",
        },
        years: {
          type: "string",
          description: "Year range (e.g., '2010:2023') or 'latest'",
        },
      },
      required: ["indicator"],
    },
  },
  {
    name: "get_morocco_economic_summary",
    description:
      "Get comprehensive economic summary for Morocco from World Bank (GDP, inflation, unemployment, trade, etc.)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // === CAPITAL MARKETS TOOLS ===
  {
    name: "get_stock_quotes",
    description:
      "Get stock quotes from Casablanca Stock Exchange (Bourse de Casablanca)",
    inputSchema: {
      type: "object",
      properties: {
        symbols: {
          type: "array",
          items: { type: "string" },
          description: "Stock symbols (e.g., ['ATW', 'IAM', 'BCP'])",
        },
      },
    },
  },
  {
    name: "get_market_summary",
    description:
      "Get today's market summary from Casablanca Stock Exchange (indices, top gainers/losers, volume)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_market_indices",
    description:
      "Get all market indices from Casablanca Stock Exchange (MASI, MASIX, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        index: {
          type: "string",
          description: "Specific index code (e.g., 'MASI', 'MASIX')",
        },
      },
    },
  },
  {
    name: "get_bond_quotes",
    description:
      "Get government and corporate bond quotes from Casablanca Stock Exchange",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Bond type: 'government', 'corporate', or 'all'",
          default: "all",
        },
      },
    },
  },
  {
    name: "get_company_info",
    description:
      "Get detailed company information from Casablanca Stock Exchange",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Stock symbol (e.g., 'ATW' for Attijariwafa Bank)",
        },
      },
      required: ["symbol"],
    },
  },

  // === GEOGRAPHY & GIS TOOLS ===
  {
    name: "get_morocco_regions",
    description: "Get all administrative regions of Morocco with metadata",
    inputSchema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description:
            "Language: 'ar' for Arabic, 'fr' for French, 'en' for English",
          default: "en",
        },
      },
    },
  },
  {
    name: "get_city_coordinates",
    description: "Get coordinates and administrative info for Moroccan cities",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name (e.g., 'Casablanca', 'Rabat')",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "search_cities",
    description: "Search for Moroccan cities by name or region",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        region: { type: "string", description: "Filter by region" },
      },
    },
  },

  // === PRAYER TIMES TOOLS ===
  {
    name: "get_prayer_times",
    description:
      "Get Islamic prayer times for Moroccan cities (Fajr, Dhuhr, Asr, Maghrib, Isha)",
    inputSchema: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City name (e.g., 'Rabat', 'Casablanca', 'Marrakech')",
        },
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "get_weekly_prayer_times",
    description: "Get prayer times for the next 7 days for a Moroccan city",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
      },
      required: ["city"],
    },
  },
  {
    name: "get_next_prayer",
    description: "Get the next upcoming prayer time for a Moroccan city",
    inputSchema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" },
      },
      required: ["city"],
    },
  },
  {
    name: "list_prayer_cities",
    description: "List all Moroccan cities available for prayer times",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // === HUMANITARIAN & CRISIS TOOLS ===
  {
    name: "get_humanitarian_datasets",
    description:
      "Search humanitarian datasets for Morocco from Humanitarian Data Exchange (HDX)",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g., 'earthquake', 'refugees', 'health')",
        },
        limit: {
          type: "number",
          description: "Number of results",
          default: 10,
        },
      },
    },
  },

  // === CLIMATE & ENVIRONMENT TOOLS ===
  {
    name: "get_climate_data",
    description:
      "Get climate and weather data for Morocco (temperature, precipitation, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or region name" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
      },
    },
  },
  {
    name: "get_environmental_indicators",
    description:
      "Get environmental indicators for Morocco (CO2 emissions, renewable energy, forest area)",
    inputSchema: {
      type: "object",
      properties: {
        indicator: {
          type: "string",
          description: "Indicator type: 'co2', 'renewable', 'forest', 'all'",
        },
      },
    },
  },

  // === KNOWLEDGE GRAPH TOOLS ===
  {
    name: "search_knowledge_graph",
    description:
      "Search the Morocco knowledge graph for entities and relationships",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        type: {
          type: "string",
          description:
            "Entity type filter (organization, person, location, event)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_data_sources",
    description: "Get list of all available data sources and their status",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error(`[MCP] Listing ${tools.length} tools`);
  return { tools };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  console.error(`[MCP] Calling tool: ${name}`, args);

  try {
    const result = await callTool(name, args || {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const mcpError = toMCPError(error, { source: name });
    console.error(`[MCP] Tool error: ${name}`, mcpError);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: mcpError.message,
              code: mcpError.code,
              source: mcpError.source,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

// Tool dispatcher
async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    // === OPEN DATA TOOLS ===
    case "search_datasets":
      return clients.ckan.searchPackages(args.query as string, {
        rows: (args.limit as number) || 10,
        fq: (args.organization as string)
          ? `organization:${args.organization}`
          : undefined,
      });

    case "get_dataset":
      return clients.ckan.getPackage(args.id as string);

    case "list_organizations":
      return clients.ckan.listOrganizations({
        all_fields: true,
        limit: (args.limit as number) || 50,
      });

    case "search_by_tag":
      return clients.ckan.searchByTag(args.tag as string);

    // === FINANCIAL TOOLS ===
    case "get_exchange_rates":
      if (args.currency) {
        return clients.bam.getExchangeRate(
          args.currency as string,
          args.date as string,
        );
      }
      return clients.bam.getExchangeRates(args.date as string);

    case "get_interest_rates":
      if (args.type === "key") {
        return clients.bam.getKeyInterestRate();
      }
      return clients.bam.getInterestRates();

    case "get_inflation_data":
      return clients.bam.getInflationData(args.year as string);

    case "get_money_supply":
      return clients.bam.getMoneySupply(
        args.startDate as string,
        args.endDate as string,
      );

    case "get_treasury_bills":
      return clients.bam.getTreasuryBills({
        type: args.type as string,
        limit: (args.limit as number) || 10,
      });

    case "get_world_bank_indicators":
      return clients.worldBank.getData(args.indicator as string, {
        startDate: (args.years as string)?.split(":")[0],
        endDate: (args.years as string)?.split(":")[1],
      });

    case "get_morocco_economic_summary":
      return clients.worldBank.getMoroccoIndicatorsSummary();

    // === CAPITAL MARKETS TOOLS ===
    case "get_stock_quotes":
      if (args.symbols && Array.isArray(args.symbols)) {
        return clients.bvc.getQuotes(args.symbols as string[]);
      }
      return clients.bvc.getAllQuotes();

    case "get_market_summary":
      return clients.bvc.getMarketSummary();

    case "get_market_indices":
      if (args.index) {
        return clients.bvc.getIndex(args.index as string);
      }
      return clients.bvc.getIndices();

    case "get_bond_quotes":
      if (args.type === "government") {
        return clients.bvc.getGovernmentBonds();
      } else if (args.type === "corporate") {
        return clients.bvc.getCorporateBonds();
      }
      return clients.bvc.getBonds();

    case "get_company_info":
      return clients.bvc.getCompanyInfo(args.symbol as string);

    // === GEOGRAPHY TOOLS ===
    case "get_morocco_regions": {
      const lang = args.language || "en";
      // Morocco's 12 regions
      const regions = [
        {
          name: "Tanger-Tétouan-Al Hoceïma",
          nameAr: "طنجة تطوان الحسيمة",
          capital: "Tangier",
        },
        { name: "Oriental", nameAr: "الشرق", capital: "Oujda" },
        { name: "Fès-Meknès", nameAr: "فاس مكناس", capital: "Fez" },
        {
          name: "Rabat-Salé-Kénitra",
          nameAr: "الرباط سلا القنيطرة",
          capital: "Rabat",
        },
        {
          name: "Béni Mellal-Khénifra",
          nameAr: "بني ملال خنيفرة",
          capital: "Beni Mellal",
        },
        {
          name: "Casablanca-Settat",
          nameAr: "الدار البيضاء سطات",
          capital: "Casablanca",
        },
        { name: "Marrakech-Safi", nameAr: "مراكش آسفي", capital: "Marrakech" },
        {
          name: "Drâa-Tafilalet",
          nameAr: "درعة تافيلالت",
          capital: "Errachidia",
        },
        { name: "Souss-Massa", nameAr: "سوس ماسة", capital: "Agadir" },
        {
          name: "Guelmim-Oued Noun",
          nameAr: "كلميم واد نون",
          capital: "Guelmim",
        },
        {
          name: "Laâyoune-Sakia El Hamra",
          nameAr: "العيون الساقية الحمراء",
          capital: "Laayoune",
        },
        {
          name: "Dakhla-Oued Ed-Dahab",
          nameAr: "الداخلة وادي الذهب",
          capital: "Dakhla",
        },
      ];
      return regions.map((r) => ({
        name: lang === "ar" ? r.nameAr : r.name,
        capital: r.capital,
      }));
    }

    case "get_city_coordinates": {
      const city = (args.city as string).toLowerCase();
      const cityData = MOROCCO_CITIES[city];
      if (!cityData) {
        throw new ValidationError(`City not found: ${args.city}`, "city");
      }
      return cityData;
    }

    case "search_cities":
      return clients.prayer.searchCities(args.query as string);

    // === PRAYER TIMES TOOLS ===
    case "get_prayer_times": {
      const result = await clients.prayer.getByCity(
        args.city as string,
        args.date as string,
      );
      return result;
    }

    case "get_weekly_prayer_times":
      return clients.prayer.getWeekly(args.city as string);

    case "get_next_prayer":
      return clients.prayer.getNextPrayer(args.city as string);

    case "list_prayer_cities":
      return clients.prayer.listCities();

    // === HUMANITARIAN TOOLS ===
    case "get_humanitarian_datasets":
      // HDX client would be implemented here
      return {
        message:
          "HDX integration pending - searching HDX.org for Morocco datasets",
        query: args.query,
        limit: args.limit,
      };

    // === CLIMATE TOOLS ===
    case "get_climate_data":
      // Weather client would be implemented here
      return {
        message: "Climate data integration pending",
        location: args.location,
      };

    case "get_environmental_indicators": {
      const indicator = (args.indicator as string) || "all";
      if (indicator === "all" || indicator === "co2") {
        const co2 = await clients.worldBank.getCO2Emissions().catch(() => []);
        return { co2: co2[0] };
      }
      return { message: "Indicator not found" };
    }

    // === KNOWLEDGE GRAPH TOOLS ===
    case "search_knowledge_graph":
      return {
        message: "Knowledge graph search pending implementation",
        query: args.query,
        type: args.type,
      };

    case "get_data_sources":
      return {
        sources: [
          {
            name: "data.gov.ma",
            type: "CKAN",
            status: "active",
            description: "Morocco National Open Data Portal",
          },
          {
            name: "Bank Al-Maghrib",
            type: "REST API",
            status: "active",
            description: "Morocco Central Bank",
          },
          {
            name: "Casablanca Stock Exchange",
            type: "REST API",
            status: "active",
            description: "Bourse de Casablanca",
          },
          {
            name: "World Bank",
            type: "REST API",
            status: "active",
            description: "World Bank Open Data",
          },
          {
            name: "Aladhan Prayer Times",
            type: "REST API",
            status: "active",
            description: "Islamic Prayer Times API",
          },
        ],
      };

    default:
      throw new ValidationError(`Unknown tool: ${name}`, "tool_name");
  }
}

// Start server
async function main() {
  console.error(`[MCP] Starting ${SERVER_NAME} v${SERVER_VERSION}`);
  console.error(`[MCP] Description: ${SERVER_DESCRIPTION}`);

  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[MCP] Server connected and ready`);
  } catch (error) {
    console.error(`[MCP] Fatal error:`, error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[MCP] Unhandled error:`, error);
  process.exit(1);
});
