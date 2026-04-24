/**
 * Morocco Open Data MCP - Weather API Client
 * Client for OpenWeatherMap API - Weather data for Moroccan cities and regions
 * Documentation: https://openweathermap.org/api
 */
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
export interface WeatherConfig {
    apiKey?: string;
    baseUrl?: string;
    timeout?: number;
    cache?: Cache;
    rateLimiter?: RateLimiter;
}
export interface WeatherData {
    coord: {
        lon: number;
        lat: number;
    };
    weather: Array<{
        id: number;
        main: string;
        description: string;
        icon: string;
    }>;
    main: {
        temp: number;
        feels_like: number;
        temp_min: number;
        temp_max: number;
        pressure: number;
        humidity: number;
        sea_level?: number;
        grnd_level?: number;
    };
    visibility: number;
    wind: {
        speed: number;
        deg: number;
        gust?: number;
    };
    clouds: {
        all: number;
    };
    dt: number;
    sys: {
        type?: number;
        id?: number;
        country: string;
        sunrise: number;
        sunset: number;
    };
    timezone: number;
    id: number;
    name: string;
    cod: number;
}
export interface WeatherForecast {
    cod: string;
    message: number;
    cnt: number;
    list: Array<{
        dt: number;
        main: {
            temp: number;
            feels_like: number;
            temp_min: number;
            temp_max: number;
            pressure: number;
            sea_level: number;
            grnd_level: number;
            humidity: number;
            temp_kf: number;
        };
        weather: Array<{
            id: number;
            main: string;
            description: string;
            icon: string;
        }>;
        clouds: {
            all: number;
        };
        wind: {
            speed: number;
            deg: number;
            gust: number;
        };
        visibility: number;
        pop: number;
        rain?: {
            "3h": number;
        };
        sys: {
            pod: string;
        };
        dt_txt: string;
    }>;
    city: {
        id: number;
        name: string;
        coord: {
            lat: number;
            lon: number;
        };
        country: string;
        population: number;
        timezone: number;
        sunrise: number;
        sunset: number;
    };
}
export interface AirPollutionData {
    coord: {
        lon: number;
        lat: number;
    };
    list: Array<{
        main: {
            aqi: number;
        };
        components: {
            co: number;
            no: number;
            no2: number;
            o3: number;
            so2: number;
            pm2_5: number;
            pm10: number;
            nh3: number;
        };
        dt: number;
    }>;
}
export interface HistoricalWeather {
    lat: number;
    lon: number;
    timezone: string;
    timezone_offset: number;
    current: {
        dt: number;
        sunrise: number;
        sunset: number;
        temp: number;
        feels_like: number;
        pressure: number;
        humidity: number;
        dew_point: number;
        uvi: number;
        clouds: number;
        visibility: number;
        wind_speed: number;
        wind_deg: number;
        weather: Array<{
            id: number;
            main: string;
            description: string;
            icon: string;
        }>;
    };
    hourly: Array<{
        dt: number;
        temp: number;
        feels_like: number;
        pressure: number;
        humidity: number;
        dew_point: number;
        uvi: number;
        clouds: number;
        visibility: number;
        wind_speed: number;
        wind_deg: number;
        wind_gust: number;
        weather: Array<{
            id: number;
            main: string;
            description: string;
            icon: string;
        }>;
        pop: number;
        rain?: {
            "1h": number;
        };
    }>;
    daily: Array<{
        dt: number;
        sunrise: number;
        sunset: number;
        moonrise: number;
        moonset: number;
        moon_phase: number;
        temp: {
            min: number;
            max: number;
            morn: number;
            day: number;
            eve: number;
            night: number;
        };
        feels_like: {
            morn: number;
            day: number;
            eve: number;
            night: number;
        };
        pressure: number;
        humidity: number;
        dew_point: number;
        wind_speed: number;
        wind_deg: number;
        wind_gust: number;
        weather: Array<{
            id: number;
            main: string;
            description: string;
            icon: string;
        }>;
        clouds: number;
        pop: number;
        rain?: number;
        uvi: number;
    }>;
}
export interface WeatherAlert {
    sender_name: string;
    event: string;
    start: number;
    end: number;
    description: string;
    tags: string[];
}
export interface WeatherWithAlerts {
    weather: HistoricalWeather;
    alerts: WeatherAlert[];
}
export declare const MOROCCAN_CITIES: Record<string, {
    lat: number;
    lon: number;
    name: string;
    nameAr?: string;
}>;
export declare class WeatherClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    constructor(config?: WeatherConfig);
    private handleError;
    private request;
    /**
     * Get current weather for a city by name
     */
    getCurrentWeatherByCity(cityName: string): Promise<WeatherData>;
    /**
     * Get current weather by coordinates
     */
    getCurrentWeatherByCoords(lat: number, lon: number): Promise<WeatherData>;
    /**
     * Get weather for a specific Moroccan city
     */
    getWeatherForMoroccanCity(cityKey: string): Promise<WeatherData & {
        cityInfo: {
            nameAr?: string;
        };
    }>;
    /**
     * Get weather for all major Moroccan cities
     */
    getAllMoroccanCitiesWeather(): Promise<Array<WeatherData & {
        cityKey: string;
        cityInfo: (typeof MOROCCAN_CITIES)[string];
    }>>;
    /**
     * Get 5-day weather forecast for a city
     */
    getForecast(cityName: string): Promise<WeatherForecast>;
    /**
     * Get 5-day forecast for a Moroccan city
     */
    getForecastForMoroccanCity(cityKey: string): Promise<WeatherForecast>;
    /**
     * Get air pollution data for a location
     */
    getAirPollution(lat: number, lon: number): Promise<AirPollutionData>;
    /**
     * Get air pollution for a Moroccan city
     */
    getAirPollutionForCity(cityKey: string): Promise<AirPollutionData>;
    /**
     * Get historical weather data (One Call API 3.0)
     * Requires subscription plan
     */
    getHistoricalWeather(lat: number, lon: number, dt: number): Promise<HistoricalWeather>;
    /**
     * Get current weather and forecast with alerts (One Call API 3.0)
     * Requires subscription plan
     */
    getOneCallWeather(lat: number, lon: number, exclude?: string[]): Promise<WeatherWithAlerts>;
    /**
     * Search for cities by name
     */
    searchCities(query: string, limit?: number): Promise<Array<{
        name: string;
        local_names?: Record<string, string>;
        lat: number;
        lon: number;
        country: string;
        state?: string;
    }>>;
    /**
     * Search specifically for Moroccan cities
     */
    searchMoroccanCities(query: string, limit?: number): Promise<Array<{
        name: string;
        local_names?: Record<string, string>;
        lat: number;
        lon: number;
        country: string;
    }>>;
    /**
     * Get geographic coordinates for a city name
     */
    getCoordinates(cityName: string): Promise<{
        lat: number;
        lon: number;
        name: string;
        country: string;
    } | null>;
    /**
     * Reverse geocode coordinates to city name
     */
    reverseGeocode(lat: number, lon: number, limit?: number): Promise<Array<{
        name: string;
        local_names?: Record<string, string>;
        lat: number;
        lon: number;
        country: string;
        state?: string;
    }>>;
    /**
     * Get temperature unit conversion helper
     */
    convertTemperature(temp: number, from: "C" | "F" | "K", to: "C" | "F" | "K"): number;
    /**
     * Get weather condition description in Arabic (basic translation)
     */
    getArabicWeatherDescription(condition: string): string;
    /**
     * Get AQI description from numeric value
     */
    getAQIDescription(aqi: number): string;
    /**
     * Check if weather API is available
     */
    isAvailable(): Promise<boolean>;
}
export declare const defaultWeatherClient: WeatherClient;
//# sourceMappingURL=weather.d.ts.map