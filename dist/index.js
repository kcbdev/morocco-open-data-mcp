/**
 * Morocco Open Data MCP Server
 *
 * A Model Context Protocol (MCP) server providing unified access to Moroccan
 * government data sources, financial markets, GIS, and more.
 *
 * Supports both stdio and HTTP SSE transport.
 *
 * @version 1.0.0
 * @author Morocco Open Data Initiative
 * @license MIT
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "http";
import { URL } from "url";
// Import clients
import { CKANClient } from "./clients/ckan.js";
import { BAMClient } from "./clients/bam.js";
import { WorldBankClient } from "./clients/worldbank.js";
import { BVCClient } from "./clients/bvc.js";
import { defaultPrayerClient, MOROCCO_CITIES } from "./clients/prayer.js";
import { defaultCache } from "./lib/cache.js";
import { initializeRateLimiter, defaultRateLimiter, } from "./lib/rateLimiter.js";
import { ValidationError, toMCPError } from "./lib/errors.js";
// Server configuration
const SERVER_NAME = "morocco-open-data";
const SERVER_VERSION = "1.0.0";
const SERVER_DESCRIPTION = "MCP server for Morocco Open Data - Providing unified access to Moroccan government data sources, financial markets, GIS, and more";
// HTTP Server configuration
const HTTP_PORT = parseInt(process.env.MCP_PORT || "3000");
const HTTP_HOST = process.env.MCP_HOST || "0.0.0.0";
const TRANSPORT_MODE = process.env.MCP_TRANSPORT || "auto"; // "stdio", "http", or "auto"
// Store active SSE connections
const sseConnections = new Map();
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
const tools = [
    // === OPEN DATA TOOLS ===
    {
        name: "search_datasets",
        description: "Search for datasets on Morocco's national open data portal (data.gov.ma). Supports Arabic, French, and English queries.",
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
        description: "Get detailed information about a specific dataset from data.gov.ma",
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
        description: "Get current exchange rates from Bank Al-Maghrib (Morocco's central bank)",
        inputSchema: {
            type: "object",
            properties: {
                currency: {
                    type: "string",
                    description: "Specific currency code (e.g., USD, EUR). Leave empty for all currencies",
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
        description: "Get key interest rates and monetary policy rates from Bank Al-Maghrib",
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
        description: "Get inflation and consumer price index data from Bank Al-Maghrib",
        inputSchema: {
            type: "object",
            properties: {
                year: { type: "string", description: "Year (default: current year)" },
            },
        },
    },
    {
        name: "get_money_supply",
        description: "Get money supply aggregates (M1, M2, M3) from Bank Al-Maghrib",
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
        description: "Get World Bank development indicators for Morocco (GDP, population, poverty, etc.)",
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
        description: "Get comprehensive economic summary for Morocco from World Bank (GDP, inflation, unemployment, trade, etc.)",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    // === CAPITAL MARKETS TOOLS ===
    {
        name: "get_stock_quotes",
        description: "Get stock quotes from Casablanca Stock Exchange (Bourse de Casablanca)",
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
        description: "Get today's market summary from Casablanca Stock Exchange (indices, top gainers/losers, volume)",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "get_market_indices",
        description: "Get all market indices from Casablanca Stock Exchange (MASI, MASIX, etc.)",
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
        description: "Get government and corporate bond quotes from Casablanca Stock Exchange",
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
        description: "Get detailed company information from Casablanca Stock Exchange",
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
                    description: "Language: 'ar' for Arabic, 'fr' for French, 'en' for English",
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
        description: "Get Islamic prayer times for Moroccan cities (Fajr, Dhuhr, Asr, Maghrib, Isha)",
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
        description: "Search humanitarian datasets for Morocco from Humanitarian Data Exchange (HDX)",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query (e.g., 'earthquake', 'refugees', 'health')",
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
        description: "Get climate and weather data for Morocco (temperature, precipitation, etc.)",
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
        description: "Get environmental indicators for Morocco (CO2 emissions, renewable energy, forest area)",
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
        description: "Search the Morocco knowledge graph for entities and relationships",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search query" },
                type: {
                    type: "string",
                    description: "Entity type filter (organization, person, location, event)",
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
const server = new Server({
    name: SERVER_NAME,
    version: SERVER_VERSION,
}, {
    capabilities: {
        tools: {},
    },
});
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
    }
    catch (error) {
        const mcpError = toMCPError(error, { source: name });
        console.error(`[MCP] Tool error: ${name}`, mcpError);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: mcpError.message,
                        code: mcpError.code,
                        source: mcpError.source,
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
});
// Tool dispatcher
async function callTool(name, args) {
    switch (name) {
        // === OPEN DATA TOOLS ===
        case "search_datasets":
            return clients.ckan.searchPackages(args.query, {
                rows: args.limit || 10,
                fq: args.organization
                    ? `organization:${args.organization}`
                    : undefined,
            });
        case "get_dataset":
            return clients.ckan.getPackage(args.id);
        case "list_organizations":
            return clients.ckan.listOrganizations({
                all_fields: true,
                limit: args.limit || 50,
            });
        case "search_by_tag":
            return clients.ckan.searchByTag(args.tag);
        // === FINANCIAL TOOLS ===
        case "get_exchange_rates":
            if (args.currency) {
                return clients.bam.getExchangeRate(args.currency, args.date);
            }
            return clients.bam.getExchangeRates(args.date);
        case "get_interest_rates":
            if (args.type === "key") {
                return clients.bam.getKeyInterestRate();
            }
            return clients.bam.getInterestRates();
        case "get_inflation_data":
            return clients.bam.getInflationData(args.year);
        case "get_money_supply":
            return clients.bam.getMoneySupply(args.startDate, args.endDate);
        case "get_treasury_bills":
            return clients.bam.getTreasuryBills({
                type: args.type,
                limit: args.limit || 10,
            });
        case "get_world_bank_indicators":
            return clients.worldBank.getData(args.indicator, {
                startDate: args.years?.split(":")[0],
                endDate: args.years?.split(":")[1],
            });
        case "get_morocco_economic_summary":
            return clients.worldBank.getMoroccoIndicatorsSummary();
        // === CAPITAL MARKETS TOOLS ===
        case "get_stock_quotes":
            if (args.symbols && Array.isArray(args.symbols)) {
                return clients.bvc.getQuotes(args.symbols);
            }
            return clients.bvc.getAllQuotes();
        case "get_market_summary":
            return clients.bvc.getMarketSummary();
        case "get_market_indices":
            if (args.index) {
                return clients.bvc.getIndex(args.index);
            }
            return clients.bvc.getIndices();
        case "get_bond_quotes":
            if (args.type === "government") {
                return clients.bvc.getGovernmentBonds();
            }
            else if (args.type === "corporate") {
                return clients.bvc.getCorporateBonds();
            }
            return clients.bvc.getBonds();
        case "get_company_info":
            return clients.bvc.getCompanyInfo(args.symbol);
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
            const city = args.city.toLowerCase();
            const cityData = MOROCCO_CITIES[city];
            if (!cityData) {
                throw new ValidationError(`City not found: ${args.city}`, "city");
            }
            return cityData;
        }
        case "search_cities":
            return clients.prayer.searchCities(args.query);
        // === PRAYER TIMES TOOLS ===
        case "get_prayer_times": {
            const result = await clients.prayer.getByCity(args.city, args.date);
            return result;
        }
        case "get_weekly_prayer_times":
            return clients.prayer.getWeekly(args.city);
        case "get_next_prayer":
            return clients.prayer.getNextPrayer(args.city);
        case "list_prayer_cities":
            return clients.prayer.listCities();
        // === HUMANITARIAN TOOLS ===
        case "get_humanitarian_datasets":
            // HDX client would be implemented here
            return {
                message: "HDX integration pending - searching HDX.org for Morocco datasets",
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
            const indicator = args.indicator || "all";
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
// HTTP Server for SSE transport
async function startHttpServer() {
    const httpServer = createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        // CORS headers for all responses
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        // SSE endpoint for MCP clients
        if (url.pathname === "/sse" && req.method === "GET") {
            console.error(`[HTTP] New SSE connection from ${req.socket.remoteAddress}`);
            const transport = new SSEServerTransport("/message", res);
            sseConnections.set(transport.sessionId, transport);
            transport.onclose = () => {
                console.error(`[HTTP] SSE connection closed: ${transport.sessionId}`);
                sseConnections.delete(transport.sessionId);
            };
            await server.connect(transport);
            return;
        }
        // Message endpoint for MCP communication
        if (url.pathname === "/message" && req.method === "POST") {
            const sessionId = url.searchParams.get("sessionId");
            if (!sessionId) {
                res.writeHead(400).end("sessionId required");
                return;
            }
            const transport = sseConnections.get(sessionId);
            if (!transport) {
                res.writeHead(404).end("Session not found");
                return;
            }
            await transport.handlePostMessage(req, res);
            return;
        }
        // Health check endpoint
        if (url.pathname === "/health" || url.pathname === "/") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                status: "healthy",
                server: SERVER_NAME,
                version: SERVER_VERSION,
                tools: tools.length,
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        // MCP endpoint for Streamable HTTP (alternative to SSE)
        if (url.pathname === "/mcp" && req.method === "POST") {
            console.error(`[HTTP] MCP request from ${req.socket.remoteAddress}`);
            // For streamable HTTP, we'd handle the request here
            res
                .writeHead(501)
                .end("Streamable HTTP not yet implemented - use /sse endpoint");
            return;
        }
        // 404 for everything else
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
            error: "Not found",
            endpoints: {
                sse: "GET /sse - SSE transport for MCP clients",
                message: "POST /message?sessionId=xxx - Message endpoint",
                health: "GET /health - Health check",
                mcp: "POST /mcp - Streamable HTTP (coming soon)",
            },
        }));
    });
    return new Promise((resolve, reject) => {
        httpServer.listen(HTTP_PORT, HTTP_HOST, () => {
            console.error(`[HTTP] MCP Server listening on http://${HTTP_HOST}:${HTTP_PORT}`);
            console.error(`[HTTP] SSE endpoint: http://${HTTP_HOST}:${HTTP_PORT}/sse`);
            console.error(`[HTTP] Health check: http://${HTTP_HOST}:${HTTP_PORT}/health`);
            console.error(`[HTTP] MCP endpoint: http://${HTTP_HOST}:${HTTP_PORT}/mcp`);
            resolve();
        });
        httpServer.on("error", reject);
    });
}
// Start stdio server (for Claude Desktop integration)
async function startStdioServer() {
    console.error(`[stdio] Starting MCP server with stdio transport`);
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[stdio] Server connected and ready`);
}
// Main entry point
async function main() {
    console.error(`╔═══════════════════════════════════════════════════════════╗`);
    console.error(`║   ${SERVER_NAME.padEnd(51)} ║`);
    console.error(`║   v${SERVER_VERSION.padEnd(48)} ║`);
    console.error(`╚═══════════════════════════════════════════════════════════╝`);
    console.error(`[MCP] ${SERVER_DESCRIPTION}`);
    console.error(``);
    try {
        // Auto-detect transport mode based on environment
        let useHttp = false;
        if (TRANSPORT_MODE === "http") {
            useHttp = true;
        }
        else if (TRANSPORT_MODE === "stdio") {
            useHttp = false;
        }
        else {
            // Auto mode: use HTTP if MCP_PORT is set and we're not in a TTY
            useHttp = !!process.env.MCP_PORT && !process.stdout.isTTY;
        }
        if (useHttp) {
            await startHttpServer();
            // Keep the process alive for HTTP server
            console.error(`[MCP] Server running in HTTP mode - waiting for connections...`);
        }
        else {
            await startStdioServer();
            // Stdio mode - process will stay alive while connected
        }
    }
    catch (error) {
        console.error(`[MCP] Fatal error:`, error);
        process.exit(1);
    }
}
main().catch((error) => {
    console.error(`[MCP] Unhandled error:`, error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map