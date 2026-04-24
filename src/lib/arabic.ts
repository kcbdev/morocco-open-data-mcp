/**
 * Morocco Open Data MCP - Arabic Text Processing Utilities
 * Handles Arabic text normalization, transliteration, and search optimization
 * Essential for Moroccan data which often contains Arabic, French, and transliterated text
 */

export interface ArabicNormalizationOptions {
  normalizeAlif?: boolean; // Normalize أ, إ, آ to ا
  normalizeHa?: boolean; // Normalize ة to ه
  normalizeYeh?: boolean; // Normalize ي, ى to ي
  normalizeKashida?: boolean; // Remove Tatweel (ـ)
  removeDiacritics?: boolean; // Remove Tashkeel (vowel marks)
  trimSpaces?: boolean; // Trim and normalize whitespace
}

export interface TransliterationOptions {
  style?: "ISO" | "Buckwalter" | "Simple";
  preserveCase?: boolean;
}

/**
 * Arabic diacritics (Tashkeel) Unicode ranges
 */
export const DIACRITICS_REGEX = /[\u064B-\u065F\u0670]/g;

/**
 * Tatweel (Kashida) character
 */
export const TATWEEL_REGEX = /\u0640/g;

/**
 * Arabic punctuation
 */
export const ARABIC_PUNCTUATION_REGEX =
  /[\u0600-\u0605\u0609-\u060A\u060C-\u060D\u061B\u061E\u061F\u066A-\u066D]/g;

/**
 * Normalize Arabic text for consistent comparison and search
 */
export function normalizeArabic(
  text: string,
  options: ArabicNormalizationOptions = {},
): string {
  const {
    normalizeAlif = true,
    normalizeHa = true,
    normalizeYeh = true,
    normalizeKashida = true,
    removeDiacritics = true,
    trimSpaces = true,
  } = options;

  if (!text) return "";

  let normalized = text;

  // Remove diacritics (Tashkeel)
  if (removeDiacritics) {
    normalized = normalized.replace(DIACRITICS_REGEX, "");
  }

  // Remove Tatweel (Kashida)
  if (normalizeKashida) {
    normalized = normalized.replace(TATWEEL_REGEX, "");
  }

  // Normalize Alif variants (أ, إ, آ -> ا)
  if (normalizeAlif) {
    normalized = normalized.replace(/[\u0622\u0623\u0625]/g, "\u0627");
  }

  // Normalize Ta Marbuta (ة -> ه)
  if (normalizeHa) {
    normalized = normalized.replace(/\u0629/g, "\u0647");
  }

  // Normalize Yeh variants (ى -> ي)
  if (normalizeYeh) {
    normalized = normalized.replace(/\u0649/g, "\u064A");
  }

  // Normalize whitespace
  if (trimSpaces) {
    normalized = normalized.replace(/\s+/g, " ").trim();
  }

  return normalized;
}

/**
 * Transliterate Arabic text to Latin script
 * Common styles: ISO 233, Buckwalter, or Simple phonetic
 */
export function transliterateArabic(
  text: string,
  options: TransliterationOptions = {},
): string {
  const { style = "Simple", preserveCase = false } = options;

  if (!text) return "";

  const transliterationMaps: Record<string, Record<string, string>> = {
    Simple: {
      ا: "a",
      أ: "a",
      إ: "a",
      آ: "aa",
      ب: "b",
      ت: "t",
      ث: "th",
      ج: "j",
      ح: "h",
      خ: "kh",
      د: "d",
      ذ: "dh",
      ر: "r",
      ز: "z",
      س: "s",
      ش: "sh",
      ص: "s",
      ض: "d",
      ط: "t",
      ظ: "z",
      ع: "a",
      غ: "gh",
      ف: "f",
      ق: "q",
      ك: "k",
      ل: "l",
      م: "m",
      ن: "n",
      ه: "h",
      و: "w",
      ي: "y",
      ة: "h",
      ى: "a",
      ء: "'",
      ؤ: "u",
      ئ: "i",
    },
    ISO: {
      ا: "ā",
      أ: "ʾa",
      إ: "ʾi",
      آ: "ʾā",
      ب: "b",
      ت: "t",
      ث: "ṯ",
      ج: "ǧ",
      ح: "ḥ",
      خ: "ḫ",
      د: "d",
      ذ: "ḏ",
      ر: "r",
      ز: "z",
      س: "s",
      ش: "š",
      ص: "ṣ",
      ض: "ḍ",
      ط: "ṭ",
      ظ: "ẓ",
      ع: "ʿ",
      غ: "ġ",
      ف: "f",
      ق: "q",
      ك: "k",
      ل: "l",
      م: "m",
      ن: "n",
      ه: "h",
      و: "w",
      ي: "y",
      ة: "ẗ",
      ى: "à",
      ء: "ʾ",
    },
    Buckwalter: {
      ا: "A",
      أ: ">",
      إ: "<",
      آ: "~",
      ب: "b",
      ت: "t",
      ث: "v",
      ج: "j",
      ح: "H",
      خ: "x",
      د: "d",
      ذ: "*",
      ر: "r",
      ز: "z",
      س: "s",
      ش: "$",
      ص: "S",
      ض: "D",
      ط: "T",
      ظ: "Z",
      ع: "E",
      غ: "g",
      ف: "f",
      ق: "q",
      ك: "k",
      ل: "l",
      م: "m",
      ن: "n",
      ه: "h",
      و: "w",
      ي: "y",
      ة: "p",
      ى: "Y",
      ء: ">",
      ؤ: "&",
      ئ: "}",
    },
  };

  const map = transliterationMaps[style] || transliterationMaps.Simple;
  let result = "";

  for (const char of text) {
    const transliterated = map[char] || char;
    result += preserveCase ? transliterated : transliterated.toLowerCase();
  }

  return result;
}

/**
 * Check if text contains Arabic characters
 */
export function isArabic(text: string): boolean {
  const arabicRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  return arabicRange.test(text);
}

/**
 * Detect primary script of text (Arabic, Latin, Mixed)
 */
export function detectScript(
  text: string,
): "Arabic" | "Latin" | "Mixed" | "Unknown" {
  if (!text) return "Unknown";

  let arabicCount = 0;
  let latinCount = 0;

  for (const char of text) {
    const code = char.charCodeAt(0);

    // Arabic Unicode ranges
    if (
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff)
    ) {
      arabicCount++;
    }
    // Latin Unicode ranges
    else if (
      (code >= 0x0041 && code <= 0x005a) ||
      (code >= 0x0061 && code <= 0x007a) ||
      (code >= 0x00c0 && code <= 0x00ff)
    ) {
      latinCount++;
    }
  }

  if (arabicCount === 0 && latinCount === 0) return "Unknown";
  if (arabicCount > 0 && latinCount > 0) return "Mixed";
  if (arabicCount > latinCount) return "Arabic";
  return "Latin";
}

/**
 * Extract Arabic words from mixed text
 */
export function extractArabicWords(text: string): string[] {
  const arabicWordRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]+/g;
  const matches = text.match(arabicWordRegex);
  return matches || [];
}

/**
 * Extract Latin words from mixed text
 */
export function extractLatinWords(text: string): string[] {
  const latinWordRegex = /[a-zA-Z\u00C0-\u00FF]+/g;
  const matches = text.match(latinWordRegex);
  return matches || [];
}

/**
 * Moroccan Darija common words mapping (for search enhancement)
 */
export const DARIJA_COMMON_WORDS: Record<string, string[]> = {
  morocco: ["المغرب", "مغربي", "مغربية"],
  data: ["بيانات", "معلومات", "معطيات"],
  city: ["مدينة", "مدن"],
  region: ["جهة", "جهات", "إقليم"],
  population: ["سكان", "عدد السكان"],
  economy: ["اقتصاد", "اقتصادية"],
  finance: ["مالية", "مالي"],
  health: ["صحة", "صحي"],
  education: ["تعليم", "تربوي"],
  employment: ["شغل", "توظيف", "بطالة"],
  agriculture: ["فلاحة", "زراعة"],
  tourism: ["سياحة", "سياحي"],
  energy: ["طاقة", "كهرباء"],
  water: ["ماء", "مياه"],
  transport: ["نقل", "مواصلات"],
  housing: ["سكن", "إسكان"],
  trade: ["تجارة", "تجاري"],
  industry: ["صناعة", "صناعي"],
  environment: ["بيئة", "بيئي"],
  climate: ["مناخ", "طقس"],
};

/**
 * Expand search query with Darija/Arabic synonyms
 */
export function expandSearchQuery(query: string): string[] {
  const normalizedQuery = normalizeArabic(query.toLowerCase());
  const variants: Set<string> = new Set([query]);

  // Check for Darija common words
  for (const [english, arabicVariants] of Object.entries(DARIJA_COMMON_WORDS)) {
    if (
      normalizedQuery.includes(english) ||
      arabicVariants.some((v) => normalizeArabic(v).includes(normalizedQuery))
    ) {
      variants.add(english);
      arabicVariants.forEach((v) => variants.add(v));
    }
  }

  // Add transliterated version
  if (isArabic(query)) {
    variants.add(transliterateArabic(query));
  }

  return Array.from(variants);
}

/**
 * Compare two Arabic strings with fuzzy matching
 */
export function arabicStringSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeArabic(str1);
  const norm2 = normalizeArabic(str2);

  if (norm1 === norm2) return 1.0;

  // Levenshtein distance for similarity score
  const len1 = norm1.length;
  const len2 = norm2.length;

  if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
  if (len2 === 0) return 0.0;

  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLength = Math.max(len1, len2);

  return 1.0 - distance / maxLength;
}

/**
 * Format numbers with Arabic-Indic digits (optional for Moroccan context)
 */
export function toArabicIndicDigits(number: number | string): string {
  const arabicIndicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return number
    .toString()
    .replace(/\d/g, (d) => arabicIndicDigits[parseInt(d)]);
}

/**
 * Convert Arabic-Indic digits to standard digits
 */
export function fromArabicIndicDigits(text: string): string {
  const arabicIndicToStandard: Record<string, string> = {
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };

  return text.replace(/[٠-٩۰-۹]/g, (d) => arabicIndicToStandard[d]);
}

/**
 * Get right-to-left text direction info
 */
export function getTextDirection(text: string): "rtl" | "ltr" | "mixed" {
  const script = detectScript(text);

  switch (script) {
    case "Arabic":
      return "rtl";
    case "Latin":
      return "ltr";
    case "Mixed":
      // Determine by first strong directional character
      const arabicIndex = text.search(/[\u0600-\u06FF]/);
      const latinIndex = text.search(/[a-zA-Z]/);

      if (arabicIndex === -1) return "ltr";
      if (latinIndex === -1) return "rtl";

      return arabicIndex < latinIndex ? "rtl" : "ltr";
    default:
      return "ltr";
  }
}

/**
 * Clean and prepare text for search indexing
 */
export function prepareForSearch(text: string): string {
  // Normalize Arabic
  let prepared = normalizeArabic(text, {
    normalizeAlif: true,
    normalizeHa: true,
    normalizeYeh: true,
    normalizeKashida: true,
    removeDiacritics: true,
    trimSpaces: true,
  });

  // Convert Arabic-Indic digits
  prepared = fromArabicIndicDigits(prepared);

  // Lowercase for Latin text
  prepared = prepared.toLowerCase();

  return prepared;
}
