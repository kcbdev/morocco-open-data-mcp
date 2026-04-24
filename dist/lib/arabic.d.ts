/**
 * Morocco Open Data MCP - Arabic Text Processing Utilities
 * Handles Arabic text normalization, transliteration, and search optimization
 * Essential for Moroccan data which often contains Arabic, French, and transliterated text
 */
export interface ArabicNormalizationOptions {
    normalizeAlif?: boolean;
    normalizeHa?: boolean;
    normalizeYeh?: boolean;
    normalizeKashida?: boolean;
    removeDiacritics?: boolean;
    trimSpaces?: boolean;
}
export interface TransliterationOptions {
    style?: "ISO" | "Buckwalter" | "Simple";
    preserveCase?: boolean;
}
/**
 * Arabic diacritics (Tashkeel) Unicode ranges
 */
export declare const DIACRITICS_REGEX: RegExp;
/**
 * Tatweel (Kashida) character
 */
export declare const TATWEEL_REGEX: RegExp;
/**
 * Arabic punctuation
 */
export declare const ARABIC_PUNCTUATION_REGEX: RegExp;
/**
 * Normalize Arabic text for consistent comparison and search
 */
export declare function normalizeArabic(text: string, options?: ArabicNormalizationOptions): string;
/**
 * Transliterate Arabic text to Latin script
 * Common styles: ISO 233, Buckwalter, or Simple phonetic
 */
export declare function transliterateArabic(text: string, options?: TransliterationOptions): string;
/**
 * Check if text contains Arabic characters
 */
export declare function isArabic(text: string): boolean;
/**
 * Detect primary script of text (Arabic, Latin, Mixed)
 */
export declare function detectScript(text: string): "Arabic" | "Latin" | "Mixed" | "Unknown";
/**
 * Extract Arabic words from mixed text
 */
export declare function extractArabicWords(text: string): string[];
/**
 * Extract Latin words from mixed text
 */
export declare function extractLatinWords(text: string): string[];
/**
 * Moroccan Darija common words mapping (for search enhancement)
 */
export declare const DARIJA_COMMON_WORDS: Record<string, string[]>;
/**
 * Expand search query with Darija/Arabic synonyms
 */
export declare function expandSearchQuery(query: string): string[];
/**
 * Compare two Arabic strings with fuzzy matching
 */
export declare function arabicStringSimilarity(str1: string, str2: string): number;
/**
 * Format numbers with Arabic-Indic digits (optional for Moroccan context)
 */
export declare function toArabicIndicDigits(number: number | string): string;
/**
 * Convert Arabic-Indic digits to standard digits
 */
export declare function fromArabicIndicDigits(text: string): string;
/**
 * Get right-to-left text direction info
 */
export declare function getTextDirection(text: string): "rtl" | "ltr" | "mixed";
/**
 * Clean and prepare text for search indexing
 */
export declare function prepareForSearch(text: string): string;
//# sourceMappingURL=arabic.d.ts.map