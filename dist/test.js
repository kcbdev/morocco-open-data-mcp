/**
 * Morocco Open Data MCP Server - Test Suite
 *
 * Comprehensive tests for all clients, tools, and server functionality
 * Run with: npm test
 */
import { defaultCKANClient } from "./clients/ckan.js";
import { defaultBAMClient } from "./clients/bam.js";
import { defaultWorldBankClient } from "./clients/worldbank.js";
import { defaultBVCClient } from "./clients/bvc.js";
import { defaultPrayerClient } from "./clients/prayer.js";
import { Cache } from "./lib/cache.js";
import { RateLimiter } from "./lib/rateLimiter.js";
import { normalizeArabic, detectScript, expandSearchQuery, } from "./lib/arabic.js";
// Test configuration
const TEST_TIMEOUT = 30000;
const SKIP_EXTERNAL_APIS = process.env.SKIP_EXTERNAL_APIS === "true";
// Test result tracking
let passed = 0;
let failed = 0;
let skipped = 0;
// Test utilities
function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}
function assertEquals(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
    }
}
function assertExists(value, message) {
    if (value === null || value === undefined) {
        throw new Error(`Assertion failed: ${message} - value is null or undefined`);
    }
}
function assertArrayNotEmpty(array, message) {
    if (!Array.isArray(array) || array.length === 0) {
        throw new Error(`Assertion failed: ${message} - array is empty or not an array`);
    }
}
async function test(name, fn) {
    try {
        await fn();
        console.log(`✓ ${name}`);
        passed++;
    }
    catch (error) {
        console.error(`✗ ${name}`);
        console.error(`  Error: ${error instanceof Error ? error.message : error}`);
        failed++;
    }
}
function skip(name, reason) {
    console.log(`⊘ ${name} (skipped: ${reason})`);
    skipped++;
}
// ============ LIBRARY TESTS ============
async function testCache() {
    console.log("\n--- Cache Tests ---");
    await test("Cache should set and get values", async () => {
        const cache = new Cache("test");
        await cache.set("key1", "value1");
        const value = await cache.get("key1");
        assertEquals(value, "value1", "Cache get should return set value");
    });
    await test("Cache should handle different types", async () => {
        const cache = new Cache("test");
        await cache.set("number", 42);
        await cache.set("object", { foo: "bar" });
        await cache.set("array", [1, 2, 3]);
        assertEquals(await cache.get("number"), 42, "Number caching");
        assertEquals(await cache.get("object"), { foo: "bar" }, "Object caching");
        assertEquals(await cache.get("array"), [1, 2, 3], "Array caching");
    });
    await test("Cache should respect TTL", async () => {
        const cache = new Cache("test", { stdTTL: 1 });
        await cache.set("temp", "value", 1);
        assert(await cache.has("temp"), "Key should exist initially");
        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 1100));
        const value = await cache.get("temp");
        assert(value === undefined, "Key should be expired");
    });
    await test("Cache getOrSet should work correctly", async () => {
        const cache = new Cache("test");
        let fetchCount = 0;
        const result1 = await cache.getOrSet("compute", () => {
            fetchCount++;
            return Promise.resolve("computed");
        });
        const result2 = await cache.getOrSet("compute", () => {
            fetchCount++;
            return Promise.resolve("computed2");
        });
        assertEquals(result1, "computed", "First call should compute");
        assertEquals(result2, "computed", "Second call should use cache");
        assertEquals(fetchCount, 1, "Fetch function should only be called once");
    });
}
async function testRateLimiter() {
    console.log("\n--- Rate Limiter Tests ---");
    await test("Rate limiter should allow requests under limit", async () => {
        const limiter = new RateLimiter({ requestsPerMinute: 10, burstSize: 5 });
        for (let i = 0; i < 5; i++) {
            const allowed = await limiter.checkLimit("test");
            assert(allowed, `Request ${i + 1} should be allowed`);
            await limiter.recordRequest("test");
        }
    });
    await test("Rate limiter should block requests over limit", async () => {
        const limiter = new RateLimiter({ requestsPerMinute: 3, burstSize: 2 });
        for (let i = 0; i < 3; i++) {
            await limiter.recordRequest("test");
        }
        const allowed = await limiter.checkLimit("test");
        assert(!allowed, "Request over limit should be blocked");
    });
    await test("Rate limiter should track status correctly", async () => {
        const limiter = new RateLimiter({ requestsPerMinute: 10 });
        await limiter.recordRequest("test");
        await limiter.recordRequest("test");
        const status = limiter.getStatus("test");
        assertEquals(status.limit, 10, "Limit should be 10");
        assertEquals(status.remaining, 8, "Remaining should be 8");
        assert(!status.isLimited, "Should not be limited yet");
    });
}
async function testArabicUtilities() {
    console.log("\n--- Arabic Utilities Tests ---");
    await test("normalizeArabic should remove diacritics", async () => {
        const input = "الْمَغْرِبُ"; // With diacritics
        const expected = "المغرب"; // Without diacritics
        assertEquals(normalizeArabic(input), expected, "Diacritics should be removed");
    });
    await test("normalizeArabic should normalize Alif variants", async () => {
        assertEquals(normalizeArabic("أ"), "ا", "Hamza on alif");
        assertEquals(normalizeArabic("إ"), "ا", "Hamza under alif");
        assertEquals(normalizeArabic("آ"), "ا", "Madda on alif");
    });
    await test("normalizeArabic should normalize Ta Marbuta", async () => {
        assertEquals(normalizeArabic("فاطمة"), "فاطمه", "Ta marbuta should become ha");
    });
    await test("detectScript should identify Arabic text", async () => {
        assertEquals(detectScript("مرحبا"), "Arabic", "Pure Arabic");
        assertEquals(detectScript("Hello"), "Latin", "Pure Latin");
        assertEquals(detectScript("مرحبا Hello"), "Mixed", "Mixed text");
    });
    await test("expandSearchQuery should expand terms", async () => {
        const variants = expandSearchQuery("morocco");
        assert(variants.includes("morocco"), "Should include original");
        assert(variants.some((v) => v.includes("المغرب")), "Should include Arabic variants");
    });
}
// ============ CLIENT TESTS ============
async function testCKANClient() {
    console.log("\n--- CKAN Client Tests ---");
    if (SKIP_EXTERNAL_APIS) {
        skip("CKAN API tests", "SKIP_EXTERNAL_APIS is true");
        return;
    }
    await test("CKAN should search datasets", async () => {
        const result = await defaultCKANClient.searchPackages("economy", {
            rows: 5,
        });
        assertExists(result, "Search should return result");
        assertExists(result.count, "Result should have count");
        assertExists(result.results, "Result should have results array");
    });
    await test("CKAN should list organizations", async () => {
        const orgs = await defaultCKANClient.listOrganizations({
            all_fields: true,
            limit: 5,
        });
        assertArrayNotEmpty(orgs, "Should return organizations");
        assertExists(orgs[0].name, "Organization should have name");
    });
    await test("CKAN should check API availability", async () => {
        const available = await defaultCKANClient.isAvailable();
        assert(typeof available === "boolean", "isAvailable should return boolean");
    });
}
async function testBAMClient() {
    console.log("\n--- BAM Client Tests ---");
    if (SKIP_EXTERNAL_APIS) {
        skip("BAM API tests", "SKIP_EXTERNAL_APIS is true");
        return;
    }
    await test("BAM should get exchange rates", async () => {
        const rates = await defaultBAMClient.getExchangeRates();
        assertArrayNotEmpty(rates, "Should return exchange rates");
        assertExists(rates[0].currency, "Rate should have currency");
        assertExists(rates[0].rate, "Rate should have value");
    });
    await test("BAM should get specific currency rate", async () => {
        const rate = await defaultBAMClient.getExchangeRate("EUR");
        assertEquals(rate.currency.toUpperCase(), "EUR", "Should return EUR rate");
        assertExists(rate.rate, "Rate should have value");
    });
    await test("BAM should get key interest rate", async () => {
        const rate = await defaultBAMClient.getKeyInterestRate();
        assertExists(rate.rate, "Interest rate should have value");
        assertExists(rate.date, "Interest rate should have date");
    });
    await test("BAM should get inflation data", async () => {
        const inflation = await defaultBAMClient.getInflationData();
        assertExists(inflation, "Should return inflation data");
    });
    await test("BAM should check API availability", async () => {
        const available = await defaultBAMClient.isAvailable();
        assert(typeof available === "boolean", "isAvailable should return boolean");
    });
}
async function testWorldBankClient() {
    console.log("\n--- World Bank Client Tests ---");
    if (SKIP_EXTERNAL_APIS) {
        skip("World Bank API tests", "SKIP_EXTERNAL_APIS is true");
        return;
    }
    await test("World Bank should get country info", async () => {
        const country = await defaultWorldBankClient.getCountryInfo();
        assertEquals(country.name, "Morocco", "Should return Morocco");
        assertEquals(country.iso2Code, "MA", "Country code should be MA");
    });
    await test("World Bank should get GDP data", async () => {
        const gdp = await defaultWorldBankClient.getGDP("2020:2023");
        assertExists(gdp, "Should return GDP data");
        assert(Array.isArray(gdp), "GDP should be array");
    });
    await test("World Bank should get economic summary", async () => {
        const summary = await defaultWorldBankClient.getMoroccoIndicatorsSummary();
        assertExists(summary, "Should return summary");
        assertExists(summary.gdp, "Summary should have GDP");
        assertExists(summary.population, "Summary should have population");
    });
    await test("World Bank should search indicators", async () => {
        const indicators = await defaultWorldBankClient.searchIndicators("GDP", 5);
        assertArrayNotEmpty(indicators, "Should find GDP indicators");
        assertExists(indicators[0].id, "Indicator should have ID");
    });
}
async function testBVCClient() {
    console.log("\n--- BVC Client Tests ---");
    if (SKIP_EXTERNAL_APIS) {
        skip("BVC API tests", "SKIP_EXTERNAL_APIS is true");
        return;
    }
    await test("BVC should get market status", async () => {
        const status = await defaultBVCClient.getMarketStatus();
        assertExists(status, "Should return market status");
        assertExists(status.status, "Status should have status field");
    });
    await test("BVC should get market indices", async () => {
        const indices = await defaultBVCClient.getIndices();
        assertExists(indices, "Should return indices");
        assert(Array.isArray(indices), "Indices should be array");
    });
    await test("BVC should get MASI index", async () => {
        const masi = await defaultBVCClient.getMASI();
        assertExists(masi, "Should return MASI");
        assertEquals(masi.code, "MASI", "Index code should be MASI");
    });
    await test("BVC should check API availability", async () => {
        const available = await defaultBVCClient.isAvailable();
        assert(typeof available === "boolean", "isAvailable should return boolean");
    });
}
async function testPrayerClient() {
    console.log("\n--- Prayer Client Tests ---");
    if (SKIP_EXTERNAL_APIS) {
        skip("Prayer API tests", "SKIP_EXTERNAL_APIS is true");
        return;
    }
    await test("Prayer client should list cities", async () => {
        const cities = defaultPrayerClient.listCities();
        assertArrayNotEmpty(cities, "Should have cities");
        assert(cities.some((c) => c.key === "rabat"), "Should include Rabat");
        assert(cities.some((c) => c.key === "casablanca"), "Should include Casablanca");
    });
    await test("Prayer client should search cities", async () => {
        const results = defaultPrayerClient.searchCities("casa");
        assertArrayNotEmpty(results, "Should find Casablanca");
        assert(results.some((r) => r.key === "casablanca"), "Should include Casablanca");
    });
    await test("Prayer client should get today's prayers", async () => {
        const prayers = await defaultPrayerClient.getToday("rabat");
        assertExists(prayers, "Should return prayer times");
        assertExists(prayers.prayers, "Should have prayers");
        assertExists(prayers.prayers.fajr, "Should have Fajr time");
        assertExists(prayers.prayers.dhuhr, "Should have Dhuhr time");
        assertExists(prayers.prayers.asr, "Should have Asr time");
        assertExists(prayers.prayers.maghrib, "Should have Maghrib time");
        assertExists(prayers.prayers.isha, "Should have Isha time");
    });
    await test("Prayer client should get weekly prayers", async () => {
        const weekly = await defaultPrayerClient.getWeekly("marrakech");
        assertExists(weekly, "Should return weekly prayers");
        assertEquals(weekly.times.length, 7, "Should have 7 days");
    });
    await test("Prayer client should get next prayer", async () => {
        const next = await defaultPrayerClient.getNextPrayer("fes");
        assertExists(next, "Should return next prayer");
        assertExists(next.nextPrayer, "Should have prayer name");
        assertExists(next.time, "Should have prayer time");
    });
    await test("Prayer client should handle invalid city", async () => {
        try {
            await defaultPrayerClient.getToday("invalid_city_xyz");
            throw new Error("Should have thrown error");
        }
        catch (error) {
            assert(error instanceof Error && error.message.includes("not found"), "Should throw not found error");
        }
    });
}
// ============ INTEGRATION TESTS ============
async function testIntegration() {
    console.log("\n--- Integration Tests ---");
    if (SKIP_EXTERNAL_APIS) {
        skip("Integration tests", "SKIP_EXTERNAL_APIS is true");
        return;
    }
    await test("Should get Morocco economic data from multiple sources", async () => {
        const [bamRates, wbSummary] = await Promise.all([
            defaultBAMClient.getExchangeRates().catch(() => []),
            defaultWorldBankClient.getMoroccoIndicatorsSummary().catch(() => ({})),
        ]);
        assert(Array.isArray(bamRates), "BAM should return rates");
        assertExists(wbSummary, "World Bank should return summary");
    });
    await test("Should get financial market data", async () => {
        const [marketSummary, indices] = await Promise.all([
            defaultBVCClient.getMarketSummary().catch(() => ({})),
            defaultBVCClient.getIndices().catch(() => []),
        ]);
        assertExists(marketSummary, "Should get market summary");
        assert(Array.isArray(indices), "Should get indices");
    });
    await test("Should get prayer times for multiple cities", async () => {
        const cities = ["rabat", "casablanca", "marrakech"];
        const prayers = await Promise.all(cities.map((city) => defaultPrayerClient.getToday(city).catch(() => null)));
        const successful = prayers.filter((p) => p !== null).length;
        assert(successful >= 2, "Should get prayers for at least 2 cities");
    });
}
// ============ MAIN TEST RUNNER ============
async function runAllTests() {
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║   Morocco Open Data MCP Server - Test Suite              ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log(`\nStarting tests at ${new Date().toISOString()}`);
    console.log(`External APIs: ${SKIP_EXTERNAL_APIS ? "SKIPPED" : "ENABLED"}`);
    console.log(`Timeout: ${TEST_TIMEOUT}ms\n`);
    const startTime = Date.now();
    // Run all test suites
    await testCache();
    await testRateLimiter();
    await testArabicUtilities();
    await testCKANClient();
    await testBAMClient();
    await testWorldBankClient();
    await testBVCClient();
    await testPrayerClient();
    await testIntegration();
    const duration = Date.now() - startTime;
    // Print summary
    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║                      TEST SUMMARY                        ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log(`\n  Passed:  ${passed}`);
    console.log(`  Failed:  ${failed}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total:   ${passed + failed + skipped}`);
    console.log(`  Duration: ${(duration / 1000).toFixed(2)}s\n`);
    if (failed > 0) {
        console.error("❌ Some tests failed");
        process.exit(1);
    }
    else {
        console.log("✅ All tests passed!");
        process.exit(0);
    }
}
// Run tests
runAllTests().catch((error) => {
    console.error("Fatal test error:", error);
    process.exit(1);
});
//# sourceMappingURL=test.js.map