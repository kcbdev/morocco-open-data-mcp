# 🇲🇦 Morocco Open Data MCP Server

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server providing unified access to Moroccan government data sources, financial markets, geographic information, and more.

## 📋 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Available Tools](#available-tools)
- [Usage Examples](#usage-examples)
- [Data Sources](#data-sources)
- [Deployment](#deployment)
- [Development](#development)
- [API Keys](#api-keys)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🏛️ National Open Data
- Access to [data.gov.ma](https://data.gov.ma) - Morocco's national open data portal
- Search datasets in Arabic, French, and English
- Browse by organization, tags, and categories
- Download resources in various formats (CSV, JSON, XML, etc.)

### 💰 Financial & Macroeconomic Data
- **Bank Al-Maghrib (Central Bank)**
  - Exchange rates (daily updates)
  - Key interest rates and monetary policy
  - Inflation and consumer price indices
  - Money supply aggregates (M1, M2, M3)
  - Treasury bills auction results
  - Foreign reserves data

- **Casablanca Stock Exchange (BVC)**
  - Real-time stock quotes
  - Market indices (MASI, MASIX, etc.)
  - Company information and financials
  - Government and corporate bonds
  - Market statistics and trading data

### 🌍 International Data
- **World Bank Indicators**
  - GDP and economic growth
  - Population and demographics
  - Poverty and social indicators
  - Trade and balance of payments
  - Environmental statistics

### 🕌 Islamic Services
- Prayer times for all major Moroccan cities
- Weekly and monthly prayer schedules
- Qibla direction calculations
- Hijri calendar integration

### 🗺️ Geography & GIS
- Administrative divisions (12 regions)
- City coordinates and metadata
- Searchable city database
- Regional information in multiple languages

### 🤝 Humanitarian & Crisis Data
- Humanitarian Data Exchange (HDX) integration
- Emergency response datasets
- Refugee and displacement data
- Health and education statistics

### 🌱 Climate & Environment
- Climate data and weather patterns
- Environmental indicators
- CO2 emissions tracking
- Renewable energy statistics

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn
- Claude Desktop (for MCP integration)

### 1. Clone the Repository
```bash
cd "MoroccoOpenData MCP"
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Build the Server
```bash
npm run build
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your API keys
```

### 5. Test the Server
```bash
npm test
```

### 6. Run the Server
```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

## 📦 Installation

### Using npm
```bash
npm install -g morocco-open-data-mcp
```

### From Source
```bash
git clone https://github.com/your-org/morocco-open-data-mcp.git
cd morocco-open-data-mcp
npm install
npm run build
```

### Using Docker
```bash
# Build the image
docker build -t morocco-open-data-mcp .

# Run the container
docker run -d \
  --name morocco-mcp \
  -e BAM_KEY_CHANGES=your_key \
  -e BAM_KEY_OBLIGATIONS=your_key \
  morocco-open-data-mcp
```

### Using Docker Compose
```bash
# Create .env file with your API keys
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BAM_KEY_CHANGES` | Bank Al-Maghrib API key for exchange rates | Required for BAM data |
| `BAM_KEY_OBLIGATIONS` | BAM API key for government obligations | Required for obligations |
| `BAM_KEY_TBILLS` | BAM API key for treasury bills | Required for T-bills |
| `WORLD_BANK_API_KEY` | World Bank API key | Optional (some endpoints) |
| `ACLED_API_KEY` | ACLED API key for crisis data | Optional |
| `OPENWEATHER_API_KEY` | OpenWeatherMap API key | Optional |
| `CACHE_TTL_DEFAULT` | Default cache TTL (seconds) | 3600 |
| `CACHE_TTL_SHORT` | Short-term cache TTL (seconds) | 300 |
| `CACHE_TTL_LONG` | Long-term cache TTL (seconds) | 86400 |
| `RATE_LIMIT_DEFAULT` | Default rate limit (req/min) | 60 |
| `RATE_LIMIT_STRICT` | Strict rate limit (req/min) | 10 |

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "morocco-open-data": {
      "command": "node",
      "args": ["/path/to/morocco-open-data-mcp/dist/index.js"],
      "env": {
        "BAM_KEY_CHANGES": "your_key_here",
        "BAM_KEY_OBLIGATIONS": "your_key_here",
        "BAM_KEY_TBILLS": "your_key_here"
      }
    }
  }
}
```

## 🛠️ Available Tools

### Open Data (data.gov.ma)
| Tool | Description |
|------|-------------|
| `search_datasets` | Search for datasets on Morocco's open data portal |
| `get_dataset` | Get detailed information about a specific dataset |
| `list_organizations` | List all data-publishing organizations |
| `search_by_tag` | Search datasets by tag |

### Financial & Macroeconomic
| Tool | Description |
|------|-------------|
| `get_exchange_rates` | Get current exchange rates from Bank Al-Maghrib |
| `get_interest_rates` | Get key interest rates and monetary policy rates |
| `get_inflation_data` | Get inflation and CPI data |
| `get_money_supply` | Get money supply aggregates (M1, M2, M3) |
| `get_treasury_bills` | Get treasury bills auction results |
| `get_world_bank_indicators` | Get World Bank development indicators |
| `get_morocco_economic_summary` | Get comprehensive economic summary |

### Capital Markets
| Tool | Description |
|------|-------------|
| `get_stock_quotes` | Get stock quotes from Casablanca Stock Exchange |
| `get_market_summary` | Get today's market summary |
| `get_market_indices` | Get market indices (MASI, MASIX, etc.) |
| `get_bond_quotes` | Get government and corporate bond quotes |
| `get_company_info` | Get detailed company information |

### Geography & GIS
| Tool | Description |
|------|-------------|
| `get_morocco_regions` | Get all administrative regions of Morocco |
| `get_city_coordinates` | Get coordinates for Moroccan cities |
| `search_cities` | Search for cities by name or region |

### Prayer Times
| Tool | Description |
|------|-------------|
| `get_prayer_times` | Get prayer times for a specific date |
| `get_weekly_prayer_times` | Get prayer times for the next 7 days |
| `get_next_prayer` | Get the next upcoming prayer time |
| `list_prayer_cities` | List all available Moroccan cities |

### Humanitarian & Crisis
| Tool | Description |
|------|-------------|
| `get_humanitarian_datasets` | Search humanitarian datasets from HDX |

### Climate & Environment
| Tool | Description |
|------|-------------|
| `get_climate_data` | Get climate and weather data |
| `get_environmental_indicators` | Get environmental indicators (CO2, renewable energy, etc.) |

### Knowledge Graph
| Tool | Description |
|------|-------------|
| `search_knowledge_graph` | Search the Morocco knowledge graph |
| `get_data_sources` | Get list of all available data sources |

## 📖 Usage Examples

### Example 1: Search for Economic Datasets
```
Search for datasets about Morocco's economy on data.gov.ma
```

### Example 2: Get Current Exchange Rates
```
What's the current exchange rate for EUR to MAD?
Show me all exchange rates from Bank Al-Maghrib
```

### Example 3: Stock Market Information
```
Get me the current stock price for Attijariwafa Bank
Show me today's market summary from Casablanca Stock Exchange
What are the top gainers today?
```

### Example 4: Prayer Times
```
What are the prayer times for today in Marrakech?
When is the next prayer in Rabat?
Show me the weekly prayer schedule for Casablanca
```

### Example 5: Economic Indicators
```
Get Morocco's GDP growth rate for the last 5 years
Show me the current inflation rate
What's the unemployment rate in Morocco?
```

### Example 6: Geographic Data
```
List all regions of Morocco with their capitals
What are the coordinates of Fes?
Search for cities in the Souss-Massa region
```

## 📊 Data Sources

### Tier 1 - Native REST APIs
| Source | Type | Status |
|--------|------|--------|
| data.gov.ma | CKAN API | ✅ Active |
| Bank Al-Maghrib | REST API | ✅ Active |
| Casablanca Stock Exchange | REST API | ✅ Active |
| World Bank | REST API | ✅ Active |
| Aladhan (Prayer Times) | REST API | ✅ Active |

### Tier 2 - Structured Downloads
| Source | Type | Status |
|--------|------|--------|
| HCP (High Commission for Planning) | Portal | 🔄 Pending |
| Ministry of Economy & Finance | Portal | 🔄 Pending |
| Ministry of Health | Portal | 🔄 Pending |

### Tier 3 - International Sources
| Source | Type | Status |
|--------|------|--------|
| Humanitarian Data Exchange | API | 🔄 Pending |
| ACLED (Crisis Data) | API | 🔄 Pending |
| OpenWeatherMap | API | 🔄 Pending |

## 🚢 Deployment

### Production Deployment with Docker

1. **Build the production image:**
```bash
docker build -t morocco-open-data-mcp:latest --target production .
```

2. **Run with environment variables:**
```bash
docker run -d \
  --name morocco-mcp \
  --restart unless-stopped \
  -e NODE_ENV=production \
  -e BAM_KEY_CHANGES=your_key \
  -e BAM_KEY_OBLIGATIONS=your_key \
  -e BAM_KEY_TBILLS=your_key \
  -e CACHE_TTL_DEFAULT=3600 \
  -e RATE_LIMIT_DEFAULT=60 \
  morocco-open-data-mcp:latest
```

3. **Monitor the container:**
```bash
docker logs -f morocco-mcp
docker stats morocco-mcp
```

### Kubernetes Deployment (Optional)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: morocco-mcp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: morocco-mcp
  template:
    metadata:
      labels:
        app: morocco-mcp
    spec:
      containers:
      - name: mcp-server
        image: morocco-open-data-mcp:latest
        env:
        - name: NODE_ENV
          value: "production"
        - name: BAM_KEY_CHANGES
          valueFrom:
            secretKeyRef:
              name: mcp-secrets
              key: bam-key-changes
        resources:
          limits:
            cpu: "1"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "128Mi"
```

## 👨‍💻 Development

### Project Structure
```
morocco-open-data-mcp/
├── src/
│   ├── clients/          # API clients for each data source
│   │   ├── ckan.ts       # data.gov.ma client
│   │   ├── bam.ts        # Bank Al-Maghrib client
│   │   ├── worldbank.ts  # World Bank client
│   │   ├── bvc.ts        # Casablanca Stock Exchange client
│   │   ├── prayer.ts     # Prayer times client
│   │   ├── geo.ts        # Geography/GIS client
│   │   ├── hdx.ts        # Humanitarian Data Exchange client
│   │   └── weather.ts    # Weather API client
│   ├── tools/            # MCP tool implementations
│   ├── lib/              # Core utilities
│   │   ├── cache.ts      # Caching layer
│   │   ├── rateLimiter.ts # Rate limiting
│   │   ├── arabic.ts     # Arabic text processing
│   │   └── errors.ts     # Error handling
│   ├── sync/             # Data synchronization jobs
│   ├── index.ts          # Main server entry point
│   └── test.ts           # Test suite
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

### Development Commands

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run sync jobs manually
npm run sync

# Start production server
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with external APIs disabled
SKIP_EXTERNAL_APIS=true npm test

# Run specific test file
npx tsx src/test.ts
```

## 🔑 API Keys

### Required API Keys

#### Bank Al-Maghrib (BAM)
- **Registration:** Visit [Bank Al-Maghrib](https://www.bkam.ma) and request API access
- **Endpoints:** Exchange rates, treasury bills, government obligations
- **Rate Limits:** 30 requests/minute

#### World Bank
- **Registration:** [World Bank Data Connect](https://datahelpdesk.worldbank.org/dataconnect/)
- **Free tier:** 60 requests/minute
- **Documentation:** [World Bank API Docs](https://datahelpdesk.worldbank.org/knowledgebase/topics/125589)

#### Optional API Keys

| Service | Purpose | Registration |
|---------|---------|--------------|
| ACLED | Crisis/conflict data | [ACLED](https://acleddata.com/api/) |
| OpenWeatherMap | Weather data | [OpenWeatherMap](https://openweathermap.org/api) |
| HDX | Humanitarian data | [HDX](https://data.humdata.org/) |

## 🐛 Troubleshooting

### Common Issues

#### 1. "Module not found" errors
```bash
# Rebuild the project
rm -rf dist/
npm run build
```

#### 2. API rate limit errors
- Check your rate limit status in logs
- Increase `RATE_LIMIT_DEFAULT` in .env
- Implement request caching

#### 3. BAM API authentication errors
- Verify API keys are correct
- Check if keys have expired
- Ensure keys have correct permissions

#### 4. Claude Desktop integration issues
- Verify path to `dist/index.js` is correct
- Check Claude Desktop logs
- Restart Claude Desktop after config changes

### Debug Mode

Enable verbose logging:
```bash
NODE_ENV=development DEBUG=* npm run dev
```

### Health Checks

```bash
# Check if server is running
node -e "console.log('MCP server healthy')"

# Check API availability
# The server will log status of all data sources on startup
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

### Code Style

- Follow TypeScript best practices
- Use ESLint rules (coming soon)
- Write meaningful commit messages
- Add tests for new features
- Update documentation

### Areas for Contribution

- [ ] Additional data sources (ministries, agencies)
- [ ] More geographic data (provinces, communes)
- [ ] Historical data archives
- [ ] Data visualization tools
- [ ] Arabic/French language improvements
- [ ] Performance optimizations
- [ ] Documentation translations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Morocco Open Data Initiative

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/your-org/morocco-open-data-mcp/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-org/morocco-open-data-mcp/discussions)
- **Email:** info@morocco-opendata.ma (placeholder)

## 🙏 Acknowledgments

- **Bank Al-Maghrib** - For providing financial and economic data
- **data.gov.ma** - Morocco's national open data portal
- **World Bank** - For development indicators and statistics
- **Casablanca Stock Exchange** - For market data
- **Aladhan API** - For prayer times services
- **MCP Project** - For the Model Context Protocol framework

---

Built with ❤️ for Morocco's open data community