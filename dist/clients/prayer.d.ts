/**
 * Morocco Open Data MCP - Prayer Times Client
 * Client for Islamic prayer times API - Morocco cities
 * Documentation: https://aladhan.com/prayer-times-api
 */
import { Cache } from "../lib/cache.js";
import { RateLimiter } from "../lib/rateLimiter.js";
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
export declare const MOROCCO_CITIES: Record<string, PrayerLocation>;
export declare const MOROCCO_PRAYER_METHOD: {
    id: number;
    name: string;
    nameAr: string;
    params: {
        fajr: number;
        isha: number;
    };
};
export declare class PrayerClient {
    private readonly client;
    private readonly config;
    private readonly cache?;
    private readonly rateLimiter?;
    constructor(config?: PrayerConfig);
    private handleError;
    private request;
    /**
     * Get prayer times for a specific date and coordinates
     */
    getByCoordinates(latitude: number, longitude: number, date?: string, method?: number): Promise<PrayerTimesData>;
    /**
     * Get prayer times for a Moroccan city
     */
    getByCity(cityName: string, date?: string): Promise<{
        location: PrayerLocation;
        prayers: PrayerTimesData;
    }>;
    /**
     * Get today's prayer times for a city
     */
    getToday(cityName: string): Promise<{
        location: PrayerLocation;
        prayers: PrayerTimes;
    }>;
    /**
     * Get prayer times for the next 7 days
     */
    getWeekly(cityName: string): Promise<WeeklyPrayerTimes>;
    /**
     * Get prayer times for entire month
     */
    getMonthly(cityName: string, year?: number, month?: number): Promise<MonthlyPrayerTimes>;
    /**
     * Get next prayer time from current time
     */
    getNextPrayer(cityName: string): Promise<{
        nextPrayer: string;
        nextPrayerAr: string;
        time: string;
        timeRemaining: string;
        location: PrayerLocation;
    }>;
    /**
     * Get current prayer status
     */
    getCurrentPrayerStatus(cityName: string): Promise<{
        currentPrayer?: string;
        currentPrayerAr?: string;
        nextPrayer: string;
        nextPrayerAr: string;
        timeRemaining: string;
        location: PrayerLocation;
    }>;
    /**
     * List all available Moroccan cities
     */
    listCities(): Array<{
        key: string;
        name: string;
        nameAr: string;
        region: string;
    }>;
    /**
     * Search for cities by name
     */
    searchCities(query: string): Array<{
        key: string;
        name: string;
        nameAr: string;
        region: string;
    }>;
    /**
     * Format prayer times from API response
     */
    private formatPrayerTimes;
    /**
     * Check if Prayer API is available
     */
    isAvailable(): Promise<boolean>;
}
export declare const defaultPrayerClient: PrayerClient;
//# sourceMappingURL=prayer.d.ts.map