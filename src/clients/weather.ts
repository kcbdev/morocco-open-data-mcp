/**
 * Morocco Open Data MCP - Weather API Client
 * Client for OpenWeatherMap API - Weather data for Moroccan cities and regions
 * Documentation: https://openweathermap.org/api
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
import {
  DataSourceError,
  NotFoundError,
  TimeoutError,
  ConfigurationError,
} from "../lib/errors.js";

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

// Moroccan cities with coordinates
export const MOROCCAN_CITIES: Record<
  string,
  { lat: number; lon: number; name: string; nameAr?: string }
> = {
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
  private readonly client: AxiosInstance;
  private readonly config: WeatherConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  constructor(config: WeatherConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OPENWEATHER_API_KEY,
      baseUrl: config.baseUrl || "https://api.openweathermap.org/data",
      timeout: config.timeout || 15000,
    };

    if (!this.config.apiKey) {
      console.warn(
        "[Weather] No API key provided. Some endpoints may not work.",
      );
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

    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error),
    );
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.code === "ECONNABORTED") {
        throw new TimeoutError("Weather API request timeout", "WEATHER");
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError("Location not found in weather API", "WEATHER");
      }

      if (axiosError.response?.status === 401) {
        throw new ConfigurationError("Weather API key is invalid");
      }

      throw new DataSourceError(
        `Weather API error: ${axiosError.message}`,
        "WEATHER",
        axiosError.response?.status || 502,
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : "Unknown weather API error",
      "WEATHER",
    );
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, unknown>,
    useCache: boolean = true,
    cacheTTL: number = 600,
  ): Promise<T> {
    // Check rate limit
    if (this.rateLimiter) {
      const allowed = await this.rateLimiter.checkLimit("weather");
      if (!allowed) {
        throw new DataSourceError(
          "Weather API rate limit exceeded",
          "WEATHER",
          429,
        );
      }
      await this.rateLimiter.recordRequest("weather");
    }

    // Check cache
    const cacheKey = `weather:${endpoint}:${JSON.stringify(params)}`;
    if (useCache && this.cache) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Make request
    const response = await this.client.get<T>(endpoint, {
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
  async getCurrentWeatherByCity(cityName: string): Promise<WeatherData> {
    return this.request<WeatherData>(
      "/2.5/weather",
      { q: cityName },
      true,
      600, // 10 minutes cache for current weather
    );
  }

  /**
   * Get current weather by coordinates
   */
  async getCurrentWeatherByCoords(
    lat: number,
    lon: number,
  ): Promise<WeatherData> {
    return this.request<WeatherData>("/2.5/weather", { lat, lon }, true, 600);
  }

  /**
   * Get weather for a specific Moroccan city
   */
  async getWeatherForMoroccanCity(
    cityKey: string,
  ): Promise<WeatherData & { cityInfo: { nameAr?: string } }> {
    const city = MOROCCAN_CITIES[cityKey.toLowerCase()];

    if (!city) {
      throw new NotFoundError(
        `City not found: ${cityKey}. Available cities: ${Object.keys(MOROCCAN_CITIES).join(", ")}`,
        "WEATHER",
      );
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
  async getAllMoroccanCitiesWeather(): Promise<
    Array<
      WeatherData & {
        cityKey: string;
        cityInfo: (typeof MOROCCAN_CITIES)[string];
      }
    >
  > {
    const promises = Object.entries(MOROCCAN_CITIES).map(
      async ([key, city]) => {
        try {
          const weather = await this.getCurrentWeatherByCoords(
            city.lat,
            city.lon,
          );
          return {
            ...weather,
            cityKey: key,
            cityInfo: city,
          };
        } catch (error) {
          console.error(`Failed to fetch weather for ${city.name}:`, error);
          return null;
        }
      },
    );

    const results = await Promise.all(promises);
    return results.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  /**
   * Get 5-day weather forecast for a city
   */
  async getForecast(cityName: string): Promise<WeatherForecast> {
    return this.request<WeatherForecast>(
      "/2.5/forecast",
      { q: cityName },
      true,
      1800, // 30 minutes cache for forecasts
    );
  }

  /**
   * Get 5-day forecast for a Moroccan city
   */
  async getForecastForMoroccanCity(cityKey: string): Promise<WeatherForecast> {
    const city = MOROCCAN_CITIES[cityKey.toLowerCase()];

    if (!city) {
      throw new NotFoundError(`City not found: ${cityKey}`, "WEATHER");
    }

    return this.request<WeatherForecast>(
      "/2.5/forecast",
      { lat: city.lat, lon: city.lon },
      true,
      1800,
    );
  }

  /**
   * Get air pollution data for a location
   */
  async getAirPollution(lat: number, lon: number): Promise<AirPollutionData> {
    return this.request<AirPollutionData>(
      "/2.5/air_pollution",
      { lat, lon },
      true,
      1800,
    );
  }

  /**
   * Get air pollution for a Moroccan city
   */
  async getAirPollutionForCity(cityKey: string): Promise<AirPollutionData> {
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
  async getHistoricalWeather(
    lat: number,
    lon: number,
    dt: number,
  ): Promise<HistoricalWeather> {
    return this.request<HistoricalWeather>(
      "/3.0/onecall/timemachine",
      { lat, lon, dt },
      true,
      3600,
    );
  }

  /**
   * Get current weather and forecast with alerts (One Call API 3.0)
   * Requires subscription plan
   */
  async getOneCallWeather(
    lat: number,
    lon: number,
    exclude?: string[],
  ): Promise<WeatherWithAlerts> {
    const params: Record<string, unknown> = { lat, lon };

    if (exclude && exclude.length > 0) {
      params.exclude = exclude.join(",");
    }

    const weather = await this.request<HistoricalWeather>(
      "/3.0/onecall",
      params,
      true,
      600,
    );

    // Alerts are included in the One Call response
    const alerts: WeatherAlert[] = (weather as any).alerts || [];

    return {
      weather,
      alerts,
    };
  }

  /**
   * Search for cities by name
   */
  async searchCities(
    query: string,
    limit: number = 5,
  ): Promise<
    Array<{
      name: string;
      local_names?: Record<string, string>;
      lat: number;
      lon: number;
      country: string;
      state?: string;
    }>
  > {
    const response = await this.client.get<
      Array<{
        name: string;
        local_names?: Record<string, string>;
        lat: number;
        lon: number;
        country: string;
        state?: string;
      }>
    >("/2.5/direct", {
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
  async searchMoroccanCities(
    query: string,
    limit: number = 5,
  ): Promise<
    Array<{
      name: string;
      local_names?: Record<string, string>;
      lat: number;
      lon: number;
      country: string;
    }>
  > {
    const response = await this.client.get<
      Array<{
        name: string;
        local_names?: Record<string, string>;
        lat: number;
        lon: number;
        country: string;
      }>
    >("/2.5/direct", {
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
  async getCoordinates(
    cityName: string,
  ): Promise<{
    lat: number;
    lon: number;
    name: string;
    country: string;
  } | null> {
    const results = await this.searchCities(cityName, 1);
    return results[0] || null;
  }

  /**
   * Reverse geocode coordinates to city name
   */
  async reverseGeocode(
    lat: number,
    lon: number,
    limit: number = 1,
  ): Promise<
    Array<{
      name: string;
      local_names?: Record<string, string>;
      lat: number;
      lon: number;
      country: string;
      state?: string;
    }>
  > {
    const response = await this.client.get<
      Array<{
        name: string;
        local_names?: Record<string, string>;
        lat: number;
        lon: number;
        country: string;
        state?: string;
      }>
    >("/2.5/reverse", {
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
  convertTemperature(
    temp: number,
    from: "C" | "F" | "K",
    to: "C" | "F" | "K",
  ): number {
    let celsius: number;

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
  getArabicWeatherDescription(condition: string): string {
    const translations: Record<string, string> = {
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
  getAQIDescription(aqi: number): string {
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
  async isAvailable(): Promise<boolean> {
    try {
      await this.getCurrentWeatherByCity("Casablanca");
      return true;
    } catch {
      return false;
    }
  }
}

// Default weather client instance
export const defaultWeatherClient = new WeatherClient();
