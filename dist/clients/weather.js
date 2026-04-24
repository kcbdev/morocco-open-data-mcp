/**
 * Morocco Open Data MCP - Weather API Client
 * Client for OpenWeatherMap API - Weather data for Moroccan cities and regions
 * Documentation: https://openweathermap.org/api
 */
import axios from "axios";
import { DataSourceError, NotFoundError, TimeoutError, ConfigurationError, } from "../lib/errors.js";
// Moroccan cities with coordinates
export const MOROCCAN_CITIES = {
    casablanca: {
        lat: 33.5731,
        lon: -7.5898,
        name: "Casablanca",
        nameAr: "الدار البيضاء",
    },
    rabat: { lat: 34.0209, lon: -6.8416, name: "Rabat", nameAr: "الرباط" },
    marrakech: { lat: 31.6295, lon: -7.9811, name: "Marrakech", nameAr: "مراكش" },
    fes: { lat: 34.0181, lon: -5.0078, name: "Fes", nameAr: "فاس" },
    tangier: { lat: 35.7595, lon: -5.834, name: "Tangier", nameAr: "طنجة" },
    agadir: { lat: 30.4278, lon: -9.5981, name: "Agadir", nameAr: "أكادير" },
    meknes: { lat: 33.8935, lon: -5.5473, name: "Meknes", nameAr: "مكناس" },
    oujda: { lat: 34.6814, lon: -1.9076, name: "Oujda", nameAr: "وجدة" },
    kenitra: { lat: 34.261, lon: -6.5802, name: "Kenitra", nameAr: "القنيطرة" },
    tetouan: { lat: 35.5889, lon: -5.3626, name: "Tetouan", nameAr: "تطوان" },
    safim: { lat: 32.2994, lon: -9.2372, name: "Safi", nameAr: "آسفي" },
    Mohammadia: {
        lat: 33.6866,
        lon: -7.3833,
        name: "Mohammadia",
        nameAr: "المحمدية",
    },
    Khouribga: {
        lat: 32.8811,
        lon: -6.9063,
        name: "Khouribga",
        nameAr: "خريبكة",
    },
    El_Jadida: {
        lat: 33.2316,
        lon: -8.5007,
        name: "El Jadida",
        nameAr: "الجديدة",
    },
    Taza: { lat: 34.2133, lon: -4.0103, name: "Taza", nameAr: "تازة" },
    Nador: { lat: 35.1681, lon: -2.9333, name: "Nador", nameAr: "الناظور" },
    Settat: { lat: 33.0013, lon: -7.6164, name: "Settat", nameAr: "سطات" },
    Ksar_El_Kebir: {
        lat: 35.0017,
        lon: -5.9078,
        name: "Ksar El Kebir",
        nameAr: "القصر الكبير",
    },
    Khemisset: {
        lat: 33.8244,
        lon: -6.0661,
        name: "Khemisset",
        nameAr: "الخميسات",
    },
    Guelmim: { lat: 28.987, lon: -10.0574, name: "Guelmim", nameAr: "كلميم" },
    Laayoune: { lat: 27.1536, lon: -13.1994, name: "Laayoune", nameAr: "العيون" },
    Dakhla: { lat: 23.7156, lon: -15.9573, name: "Dakhla", nameAr: "الداخلة" },
    Ifrane: { lat: 33.5228, lon: -5.1106, name: "Ifrane", nameAr: "إفران" },
    Azrou: { lat: 33.4346, lon: -5.2206, name: "Azrou", nameAr: "أزرو" },
    Chefchaouen: {
        lat: 35.1689,
        lon: -5.2636,
        name: "Chefchaouen",
        nameAr: "شفشاون",
    },
    Essaouira: {
        lat: 31.5085,
        lon: -9.7595,
        name: "Essaouira",
        nameAr: "الصويرة",
    },
    Taroudant: {
        lat: 30.4739,
        lon: -8.8028,
        name: "Taroudant",
        nameAr: "تارودانت",
    },
    Ouarzazate: {
        lat: 30.9335,
        lon: -6.937,
        name: "Ouarzazate",
        nameAr: "ورزازات",
    },
    Zagora: { lat: 30.3472, lon: -5.8372, name: "Zagora", nameAr: "زاكورة" },
    Errachidia: {
        lat: 31.9314,
        lon: -4.4244,
        name: "Errachidia",
        nameAr: "الرشيدية",
    },
};
export class WeatherClient {
    client;
    config;
    cache;
    rateLimiter;
    constructor(config = {}) {
        this.config = {
            apiKey: config.apiKey || process.env.OPENWEATHER_API_KEY,
            baseUrl: config.baseUrl || "https://api.openweathermap.org/data",
            timeout: config.timeout || 15000,
        };
        if (!this.config.apiKey) {
            console.warn("[Weather] No API key provided. Some endpoints may not work.");
        }
        this.cache = config.cache;
        this.rateLimiter = config.rateLimiter;
        this.client = axios.create({
            baseURL: this.config.baseUrl,
            timeout: this.config.timeout,
            headers: {
                "Content-Type": "application/json",
            },
        });
        this.client.interceptors.response.use((response) => response, (error) => this.handleError(error));
    }
    handleError(error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error;
            if (axiosError.code === "ECONNABORTED") {
                throw new TimeoutError("Weather API request timeout", "WEATHER");
            }
            if (axiosError.response?.status === 404) {
                throw new NotFoundError("Location not found in weather API", "WEATHER");
            }
            if (axiosError.response?.status === 401) {
                throw new ConfigurationError("Weather API key is invalid");
            }
            throw new DataSourceError(`Weather API error: ${axiosError.message}`, "WEATHER", axiosError.response?.status || 502);
        }
        throw new DataSourceError(error instanceof Error ? error.message : "Unknown weather API error", "WEATHER");
    }
    async request(endpoint, params, useCache = true, cacheTTL = 600) {
        // Check rate limit
        if (this.rateLimiter) {
            const allowed = await this.rateLimiter.checkLimit("weather");
            if (!allowed) {
                throw new DataSourceError("Weather API rate limit exceeded", "WEATHER", 429);
            }
            await this.rateLimiter.recordRequest("weather");
        }
        // Check cache
        const cacheKey = `weather:${endpoint}:${JSON.stringify(params)}`;
        if (useCache && this.cache) {
            const cached = await this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }
        // Make request
        const response = await this.client.get(endpoint, {
            params: {
                ...params,
                appid: this.config.apiKey,
                units: "metric",
            },
        });
        // Cache successful response
        if (useCache && this.cache) {
            await this.cache.set(cacheKey, response.data, cacheTTL);
        }
        return response.data;
    }
    /**
     * Get current weather for a city by name
     */
    async getCurrentWeatherByCity(cityName) {
        return this.request("/2.5/weather", { q: cityName }, true, 600);
    }
    /**
     * Get current weather by coordinates
     */
    async getCurrentWeatherByCoords(lat, lon) {
        return this.request("/2.5/weather", { lat, lon }, true, 600);
    }
    /**
     * Get weather for a specific Moroccan city
     */
    async getWeatherForMoroccanCity(cityKey) {
        const city = MOROCCAN_CITIES[cityKey.toLowerCase()];
        if (!city) {
            throw new NotFoundError(`City not found: ${cityKey}. Available cities: ${Object.keys(MOROCCAN_CITIES).join(", ")}`, "WEATHER");
        }
        const weather = await this.getCurrentWeatherByCoords(city.lat, city.lon);
        return {
            ...weather,
            cityInfo: {
                nameAr: city.nameAr,
            },
        };
    }
    /**
     * Get weather for all major Moroccan cities
     */
    async getAllMoroccanCitiesWeather() {
        const promises = Object.entries(MOROCCAN_CITIES).map(async ([key, city]) => {
            try {
                const weather = await this.getCurrentWeatherByCoords(city.lat, city.lon);
                return {
                    ...weather,
                    cityKey: key,
                    cityInfo: city,
                };
            }
            catch (error) {
                console.error(`Failed to fetch weather for ${city.name}:`, error);
                return null;
            }
        });
        const results = await Promise.all(promises);
        return results.filter((r) => r !== null);
    }
    /**
     * Get 5-day weather forecast for a city
     */
    async getForecast(cityName) {
        return this.request("/2.5/forecast", { q: cityName }, true, 1800);
    }
    /**
     * Get 5-day forecast for a Moroccan city
     */
    async getForecastForMoroccanCity(cityKey) {
        const city = MOROCCAN_CITIES[cityKey.toLowerCase()];
        if (!city) {
            throw new NotFoundError(`City not found: ${cityKey}`, "WEATHER");
        }
        return this.request("/2.5/forecast", { lat: city.lat, lon: city.lon }, true, 1800);
    }
    /**
     * Get air pollution data for a location
     */
    async getAirPollution(lat, lon) {
        return this.request("/2.5/air_pollution", { lat, lon }, true, 1800);
    }
    /**
     * Get air pollution for a Moroccan city
     */
    async getAirPollutionForCity(cityKey) {
        const city = MOROCCAN_CITIES[cityKey.toLowerCase()];
        if (!city) {
            throw new NotFoundError(`City not found: ${cityKey}`, "WEATHER");
        }
        return this.getAirPollution(city.lat, city.lon);
    }
    /**
     * Get historical weather data (One Call API 3.0)
     * Requires subscription plan
     */
    async getHistoricalWeather(lat, lon, dt) {
        return this.request("/3.0/onecall/timemachine", { lat, lon, dt }, true, 3600);
    }
    /**
     * Get current weather and forecast with alerts (One Call API 3.0)
     * Requires subscription plan
     */
    async getOneCallWeather(lat, lon, exclude) {
        const params = { lat, lon };
        if (exclude && exclude.length > 0) {
            params.exclude = exclude.join(",");
        }
        const weather = await this.request("/3.0/onecall", params, true, 600);
        // Alerts are included in the One Call response
        const alerts = weather.alerts || [];
        return {
            weather,
            alerts,
        };
    }
    /**
     * Search for cities by name
     */
    async searchCities(query, limit = 5) {
        const response = await this.client.get("/2.5/direct", {
            params: {
                q: query,
                limit,
                appid: this.config.apiKey,
            },
        });
        return response.data;
    }
    /**
     * Search specifically for Moroccan cities
     */
    async searchMoroccanCities(query, limit = 5) {
        const response = await this.client.get("/2.5/direct", {
            params: {
                q: query,
                limit,
                appid: this.config.apiKey,
                country: "MA",
            },
        });
        return response.data;
    }
    /**
     * Get geographic coordinates for a city name
     */
    async getCoordinates(cityName) {
        const results = await this.searchCities(cityName, 1);
        return results[0] || null;
    }
    /**
     * Reverse geocode coordinates to city name
     */
    async reverseGeocode(lat, lon, limit = 1) {
        const response = await this.client.get("/2.5/reverse", {
            params: {
                lat,
                lon,
                limit,
                appid: this.config.apiKey,
            },
        });
        return response.data;
    }
    /**
     * Get temperature unit conversion helper
     */
    convertTemperature(temp, from, to) {
        let celsius;
        // Convert to Celsius first
        switch (from) {
            case "F":
                celsius = ((temp - 32) * 5) / 9;
                break;
            case "K":
                celsius = temp - 273.15;
                break;
            default:
                celsius = temp;
        }
        // Convert from Celsius to target
        switch (to) {
            case "F":
                return (celsius * 9) / 5 + 32;
            case "K":
                return celsius + 273.15;
            default:
                return celsius;
        }
    }
    /**
     * Get weather condition description in Arabic (basic translation)
     */
    getArabicWeatherDescription(condition) {
        const translations = {
            "clear sky": "سماء صافية",
            "few clouds": "غيوم قليلة",
            "scattered clouds": "غيوم متفرقة",
            "broken clouds": "غيوم متكسرة",
            "shower rain": "مطر غزير",
            rain: "مطر",
            thunderstorm: "عاصفة رعدية",
            snow: "ثلج",
            mist: "ضباب",
            smoke: "دخان",
            haze: "ضباب خفيف",
            dust: "غبار",
            fog: "ضباب كثيف",
            sand: "رمل",
            ash: "رماد",
            squall: "هبة رياح",
            tornado: "إعصار",
        };
        return translations[condition.toLowerCase()] || condition;
    }
    /**
     * Get AQI description from numeric value
     */
    getAQIDescription(aqi) {
        const scale = [
            { level: 1, description: "Good", descriptionAr: "جيد" },
            { level: 2, description: "Fair", descriptionAr: "معتدل" },
            { level: 3, description: "Moderate", descriptionAr: "متوسط" },
            { level: 4, description: "Poor", descriptionAr: "سيء" },
            { level: 5, description: "Very Poor", descriptionAr: "سيء جداً" },
        ];
        return scale[aqi - 1]?.description || "Unknown";
    }
    /**
     * Check if weather API is available
     */
    async isAvailable() {
        try {
            await this.getCurrentWeatherByCity("Casablanca");
            return true;
        }
        catch {
            return false;
        }
    }
}
// Default weather client instance
export const defaultWeatherClient = new WeatherClient();
//# sourceMappingURL=weather.js.map