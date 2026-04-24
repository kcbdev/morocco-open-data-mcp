/**
 * Morocco Open Data MCP - Prayer Times Client
 * Client for Islamic prayer times API - Morocco cities
 * Documentation: https://aladhan.com/prayer-times-api
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
import { DataSourceError, NotFoundError, TimeoutError } from "../lib/errors.js";

export interface PrayerConfig {
  baseUrl?: string;
  timeout?: number;
  cache?: Cache;
  rateLimiter?: RateLimiter;
}

export interface PrayerTimes {
  date: string;
  hijriDate: string;
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  imsak?: string;
  midnight?: string;
  firstThird?: string;
  lastThird?: string;
}

export interface PrayerMethod {
  id: number;
  name: string;
  nameAr?: string;
  params: {
    fajr: number;
    isha: number;
    maghrib?: number;
    asr?: number;
  };
}

export interface PrayerLocation {
  city: string;
  cityAr?: string;
  region: string;
  regionAr?: string;
  country: string;
  countryAr?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface PrayerResponse {
  code: number;
  status: string;
  data: PrayerTimesData;
}

export interface PrayerTimesData {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Maghrib: string;
    Isha: string;
    Imsak?: string;
    Midnight?: string;
    Firstthird?: string;
    Lastthird?: string;
  };
  date: {
    readable: string;
    hijri: {
      date: string;
      month: {
        number: number;
        en: string;
        ar: string;
      };
      year: string;
      weekday: {
        en: string;
        ar: string;
      };
    };
    gregorian: {
      date: string;
      month: {
        number: number;
        en: string;
      };
      year: string;
      weekday: {
        en: string;
      };
    };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
      params: {
        Fajr: number;
        Isha: number;
      };
    };
    latitudeAdjustmentMethod: string;
    midnightMode: string;
    school: string;
    offset: {
      Imsak?: number;
      Fajr?: number;
      Sunrise?: number;
      Dhuhr?: number;
      Asr?: number;
      Maghrib?: number;
      Sunset?: number;
      Isha?: number;
      Midnight?: number;
    };
  };
}

export interface WeeklyPrayerTimes {
  location: PrayerLocation;
  times: Array<{
    date: string;
    hijriDate: string;
    weekday: string;
    weekdayAr: string;
    prayers: PrayerTimes;
  }>;
}

export interface MonthlyPrayerTimes {
  location: PrayerLocation;
  month: number;
  year: number;
  hijriMonth: string;
  times: PrayerTimes[];
}

// Major Moroccan cities with coordinates
export const MOROCCO_CITIES: Record<string, PrayerLocation> = {
  rabat: {
    city: "Rabat",
    cityAr: "الرباط",
    region: "Rabat-Salé-Kénitra",
    regionAr: "الرباط سلا القنيطرة",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 34.0209,
    longitude: -6.8416,
    timezone: "Africa/Casablanca",
  },
  casablanca: {
    city: "Casablanca",
    cityAr: "الدار البيضاء",
    region: "Casablanca-Settat",
    regionAr: "الدار البيضاء سطات",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 33.5731,
    longitude: -7.5898,
    timezone: "Africa/Casablanca",
  },
  marrakech: {
    city: "Marrakech",
    cityAr: "مراكش",
    region: "Marrakech-Safi",
    regionAr: "مراكش آسفي",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 31.6295,
    longitude: -7.9811,
    timezone: "Africa/Casablanca",
  },
  fez: {
    city: "Fez",
    cityAr: "فاس",
    region: "Fès-Meknès",
    regionAr: "فاس مكناس",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 34.0181,
    longitude: -5.0078,
    timezone: "Africa/Casablanca",
  },
  tanger: {
    city: "Tangier",
    cityAr: "طنجة",
    region: "Tanger-Tétouan-Al Hoceïma",
    regionAr: "طنجة تطوان الحسيمة",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 35.7595,
    longitude: -5.834,
    timezone: "Africa/Casablanca",
  },
  agadir: {
    city: "Agadir",
    cityAr: "أكادير",
    region: "Souss-Massa",
    regionAr: "سوس ماسة",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 30.4278,
    longitude: -9.5981,
    timezone: "Africa/Casablanca",
  },
  meknes: {
    city: "Meknes",
    cityAr: "مكناس",
    region: "Fès-Meknès",
    regionAr: "فاس مكناس",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 33.8935,
    longitude: -5.5473,
    timezone: "Africa/Casablanca",
  },
  oujda: {
    city: "Oujda",
    cityAr: "وجدة",
    region: "Oriental",
    regionAr: "الشرق",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 34.6867,
    longitude: -1.9114,
    timezone: "Africa/Casablanca",
  },
  kenitra: {
    city: "Kenitra",
    cityAr: "القنيطرة",
    region: "Rabat-Salé-Kénitra",
    regionAr: "الرباط سلا القنيطرة",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 34.261,
    longitude: -6.5802,
    timezone: "Africa/Casablanca",
  },
  tetouan: {
    city: "Tetouan",
    cityAr: "تطوان",
    region: "Tanger-Tétouan-Al Hoceïma",
    regionAr: "طنجة تطوان الحسيمة",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 35.5889,
    longitude: -5.3626,
    timezone: "Africa/Casablanca",
  },
  safi: {
    city: "Safi",
    cityAr: "آسفي",
    region: "Marrakech-Safi",
    regionAr: "مراكش آسفي",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 32.2994,
    longitude: -9.2372,
    timezone: "Africa/Casablanca",
  },
  essaoира: {
    city: "Essaouira",
    cityAr: "الصويرة",
    region: "Marrakech-Safi",
    regionAr: "مراكش آسفي",
    country: "Morocco",
    countryAr: "المغرب",
    latitude: 31.5085,
    longitude: -9.7595,
    timezone: "Africa/Casablanca",
  },
};

// Morocco uses Umm al-Qura calculation method typically
export const MOROCCO_PRAYER_METHOD = {
  id: 3, // Muslim World League is commonly used in Morocco
  name: "Muslim World League",
  nameAr: "رابطة العالم الإسلامي",
  params: {
    fajr: 18,
    isha: 17,
  },
};

export class PrayerClient {
  private readonly client: AxiosInstance;
  private readonly config: PrayerConfig;
  private readonly cache?: Cache;
  private readonly rateLimiter?: RateLimiter;

  constructor(config: PrayerConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || "https://api.aladhan.com/v1",
      timeout: config.timeout || 30000,
    };

    this.cache = config.cache;
    this.rateLimiter = config.rateLimiter;

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
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
        throw new TimeoutError("Prayer API request timeout", "PRAYER");
      }

      if (axiosError.response?.status === 404) {
        throw new NotFoundError("Location not found", "PRAYER");
      }

      throw new DataSourceError(
        `Prayer API error: ${axiosError.message}`,
        "PRAYER",
        axiosError.response?.status || 502,
      );
    }

    throw new DataSourceError(
      error instanceof Error ? error.message : "Unknown Prayer API error",
      "PRAYER",
    );
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    useCache: boolean = true,
    cacheTTL?: number,
  ): Promise<T> {
    // Check rate limit
    if (this.rateLimiter) {
      const allowed = await this.rateLimiter.checkLimit("prayer");
      if (!allowed) {
        throw new DataSourceError(
          "Prayer API rate limit exceeded",
          "PRAYER",
          429,
        );
      }
      await this.rateLimiter.recordRequest("prayer");
    }

    // Check cache
    const cacheKey = `prayer:${endpoint}:${JSON.stringify(params || {})}`;
    if (useCache && this.cache) {
      const cached = await this.cache.get<PrayerResponse>(cacheKey);
      if (cached && cached.code === 200) {
        return cached.data as unknown as T;
      }
    }

    // Make request
    const response = await this.client.get<PrayerResponse>(endpoint, {
      params,
    });

    if (response.data.code !== 200) {
      throw new DataSourceError(
        `Prayer API returned error: ${response.data.status}`,
        "PRAYER",
      );
    }

    // Cache successful response
    if (useCache && this.cache) {
      await this.cache.set(cacheKey, response.data, cacheTTL);
    }

    return response.data.data as unknown as T;
  }

  /**
   * Get prayer times for a specific date and coordinates
   */
  async getByCoordinates(
    latitude: number,
    longitude: number,
    date: string = new Date().toISOString().split("T")[0],
    method: number = MOROCCO_PRAYER_METHOD.id,
  ): Promise<PrayerTimesData> {
    return this.request<PrayerTimesData>(`/timings/${date}`, {
      latitude,
      longitude,
      method,
      timezone: "Africa/Casablanca",
      school: "shafi", // Common in Morocco
    });
  }

  /**
   * Get prayer times for a Moroccan city
   */
  async getByCity(
    cityName: string,
    date: string = new Date().toISOString().split("T")[0],
  ): Promise<{ location: PrayerLocation; prayers: PrayerTimesData }> {
    const normalizedCity = cityName.toLowerCase().trim();
    const location = MOROCCO_CITIES[normalizedCity];

    if (!location) {
      throw new NotFoundError(
        `City not found: ${cityName}. Available cities: ${Object.keys(MOROCCO_CITIES).join(", ")}`,
        "PRAYER",
      );
    }

    const prayers = await this.getByCoordinates(
      location.latitude,
      location.longitude,
      date,
    );

    return { location, prayers };
  }

  /**
   * Get today's prayer times for a city
   */
  async getToday(
    cityName: string,
  ): Promise<{ location: PrayerLocation; prayers: PrayerTimes }> {
    const today = new Date().toISOString().split("T")[0];
    const result = await this.getByCity(cityName, today);

    return {
      location: result.location,
      prayers: this.formatPrayerTimes(result.prayers),
    };
  }

  /**
   * Get prayer times for the next 7 days
   */
  async getWeekly(cityName: string): Promise<WeeklyPrayerTimes> {
    const normalizedCity = cityName.toLowerCase().trim();
    const location = MOROCCO_CITIES[normalizedCity];

    if (!location) {
      throw new NotFoundError(`City not found: ${cityName}`, "PRAYER");
    }

    const today = new Date();
    const times: WeeklyPrayerTimes["times"] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const prayers = await this.getByCoordinates(
        location.latitude,
        location.longitude,
        dateStr,
      );

      times.push({
        date: dateStr,
        hijriDate: prayers.date.hijri.date,
        weekday: prayers.date.gregorian.weekday.en,
        weekdayAr: prayers.date.hijri.weekday.ar,
        prayers: this.formatPrayerTimes(prayers),
      });
    }

    return {
      location,
      times,
    };
  }

  /**
   * Get prayer times for entire month
   */
  async getMonthly(
    cityName: string,
    year?: number,
    month?: number,
  ): Promise<MonthlyPrayerTimes> {
    const normalizedCity = cityName.toLowerCase().trim();
    const location = MOROCCO_CITIES[normalizedCity];

    if (!location) {
      throw new NotFoundError(`City not found: ${cityName}`, "PRAYER");
    }

    const today = new Date();
    const targetYear = year || today.getFullYear();
    const targetMonth = month || today.getMonth() + 1;

    const data = await this.request<PrayerTimesData>(
      `/calendar/${targetYear}/${targetMonth}`,
      {
        latitude: location.latitude,
        longitude: location.longitude,
        method: MOROCCO_PRAYER_METHOD.id,
        timezone: "Africa/Casablanca",
        school: "shafi",
      },
    );

    return {
      location,
      month: targetMonth,
      year: targetYear,
      hijriMonth:
        (data as unknown as PrayerTimesData[])[0]?.date.hijri.month.en || "",
      times: (data as unknown as PrayerTimesData[]).map((d) =>
        this.formatPrayerTimes(d),
      ),
    };
  }

  /**
   * Get next prayer time from current time
   */
  async getNextPrayer(cityName: string): Promise<{
    nextPrayer: string;
    nextPrayerAr: string;
    time: string;
    timeRemaining: string;
    location: PrayerLocation;
  }> {
    const today = await this.getToday(cityName);
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: "Fajr", nameAr: "الفجر", time: today.prayers.fajr },
      { name: "Sunrise", nameAr: "الشروق", time: today.prayers.sunrise },
      { name: "Dhuhr", nameAr: "الظهر", time: today.prayers.dhuhr },
      { name: "Asr", nameAr: "العصر", time: today.prayers.asr },
      { name: "Maghrib", nameAr: "المغرب", time: today.prayers.maghrib },
      { name: "Isha", nameAr: "العشاء", time: today.prayers.isha },
    ];

    for (const prayer of prayers) {
      const [hours, minutes] = prayer.time.split(":").map(Number);
      const prayerTime = hours * 60 + minutes;

      if (prayerTime > currentTime) {
        const remaining = prayerTime - currentTime;
        const hoursRemaining = Math.floor(remaining / 60);
        const minutesRemaining = remaining % 60;

        return {
          nextPrayer: prayer.name,
          nextPrayerAr: prayer.nameAr,
          time: prayer.time,
          timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
          location: today.location,
        };
      }
    }

    // If all prayers have passed, next is Fajr tomorrow
    return {
      nextPrayer: "Fajr",
      nextPrayerAr: "الفجر",
      time: today.prayers.fajr,
      timeRemaining: "Until tomorrow",
      location: today.location,
    };
  }

  /**
   * Get current prayer status
   */
  async getCurrentPrayerStatus(cityName: string): Promise<{
    currentPrayer?: string;
    currentPrayerAr?: string;
    nextPrayer: string;
    nextPrayerAr: string;
    timeRemaining: string;
    location: PrayerLocation;
  }> {
    const today = await this.getToday(cityName);
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = [
      { name: "Fajr", nameAr: "الفجر", time: today.prayers.fajr },
      { name: "Sunrise", nameAr: "الشروق", time: today.prayers.sunrise },
      { name: "Dhuhr", nameAr: "الظهر", time: today.prayers.dhuhr },
      { name: "Asr", nameAr: "العصر", time: today.prayers.asr },
      { name: "Maghrib", nameAr: "المغرب", time: today.prayers.maghrib },
      { name: "Isha", nameAr: "العشاء", time: today.prayers.isha },
    ];

    let currentPrayerIndex = -1;
    let nextPrayerIndex = 0;

    for (let i = 0; i < prayers.length; i++) {
      const [hours, minutes] = prayers[i].time.split(":").map(Number);
      const prayerTime = hours * 60 + minutes;

      if (prayerTime <= currentTime) {
        currentPrayerIndex = i;
        nextPrayerIndex = i + 1;
      } else {
        break;
      }
    }

    const nextPrayer = prayers[nextPrayerIndex] || prayers[0];
    const [nextHours, nextMinutes] = nextPrayer.time.split(":").map(Number);
    const nextPrayerTime = nextHours * 60 + nextMinutes;
    const remaining =
      nextPrayerTime > currentTime
        ? nextPrayerTime - currentTime
        : 24 * 60 - currentTime + nextPrayerTime;

    const hoursRemaining = Math.floor(remaining / 60);
    const minutesRemaining = remaining % 60;

    return {
      currentPrayer:
        currentPrayerIndex >= 0 ? prayers[currentPrayerIndex].name : undefined,
      currentPrayerAr:
        currentPrayerIndex >= 0
          ? prayers[currentPrayerIndex].nameAr
          : undefined,
      nextPrayer: nextPrayer.name,
      nextPrayerAr: nextPrayer.nameAr,
      timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
      location: today.location,
    };
  }

  /**
   * List all available Moroccan cities
   */
  listCities(): Array<{
    key: string;
    name: string;
    nameAr: string;
    region: string;
  }> {
    return Object.entries(MOROCCO_CITIES).map(([key, city]) => ({
      key,
      name: city.city,
      nameAr: city.cityAr || "",
      region: city.region,
    }));
  }

  /**
   * Search for cities by name
   */
  searchCities(
    query: string,
  ): Array<{ key: string; name: string; nameAr: string; region: string }> {
    const normalizedQuery = query.toLowerCase().trim();
    return this.listCities().filter(
      (city) =>
        city.name.toLowerCase().includes(normalizedQuery) ||
        city.nameAr?.includes(query) ||
        city.key.includes(normalizedQuery),
    );
  }

  /**
   * Format prayer times from API response
   */
  private formatPrayerTimes(data: PrayerTimesData): PrayerTimes {
    return {
      date: data.date.gregorian.date,
      hijriDate: data.date.hijri.date,
      fajr: data.timings.Fajr,
      sunrise: data.timings.Sunrise,
      dhuhr: data.timings.Dhuhr,
      asr: data.timings.Asr,
      maghrib: data.timings.Maghrib,
      isha: data.timings.Isha,
      imsak: data.timings.Imsak,
      midnight: data.timings.Midnight,
      firstThird: data.timings.Firstthird,
      lastThird: data.timings.Lastthird,
    };
  }

  /**
   * Check if Prayer API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.getByCity("rabat");
      return true;
    } catch {
      return false;
    }
  }
}

// Default Prayer client instance
export const defaultPrayerClient = new PrayerClient();
