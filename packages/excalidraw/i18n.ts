import fallbackLangData from "./locales/en.json";
import percentages from "./locales/percentages.json";
import { useAtomValue, editorJotaiStore, atom } from "./editor-jotai";
import type { NestedKeyOf } from "./utility-types";

const COMPLETION_THRESHOLD = 85;

export interface Language {
  code: string;
  label: string;
  rtl?: boolean;
}

export type TranslationKeys = NestedKeyOf<typeof fallbackLangData>;

export const defaultLang = { code: "en", label: "English" };

export const languages: Language[] = [
  defaultLang,
  ...[
    { code: "ar-SA", label: "العربية", rtl: true },
    { code: "bg-BG", label: "Български" },
    { code: "ca-ES", label: "Català" },
    { code: "cs-CZ", label: "Česky" },
    { code: "de-DE", label: "Deutsch" },
    { code: "el-GR", label: "Ελληνικά" },
    { code: "es-ES", label: "Español" },
    { code: "eu-ES", label: "Euskara" },
    { code: "fa-IR", label: "فارسی", rtl: true },
    { code: "fi-FI", label: "Suomi" },
    { code: "fr-FR", label: "Français" },
    { code: "gl-ES", label: "Galego" },
    { code: "he-IL", label: "עברית", rtl: true },
    { code: "hi-IN", label: "हिन्दी" },
    { code: "hu-HU", label: "Magyar" },
    { code: "id-ID", label: "Bahasa Indonesia" },
    { code: "it-IT", label: "Italiano" },
    { code: "ja-JP", label: "日本語" },
    { code: "kab-KAB", label: "Taqbaylit" },
    { code: "kk-KZ", label: "Қазақ тілі" },
    { code: "ko-KR", label: "한국어" },
    { code: "ku-TR", label: "Kurdî" },
    { code: "lt-LT", label: "Lietuvių" },
    { code: "lv-LV", label: "Latviešu" },
    { code: "my-MM", label: "Burmese" },
    { code: "nb-NO", label: "Norsk bokmål" },
    { code: "nl-NL", label: "Nederlands" },
    { code: "nn-NO", label: "Norsk nynorsk" },
    { code: "oc-FR", label: "Occitan" },
    { code: "pa-IN", label: "ਪੰਜਾਬੀ" },
    { code: "pl-PL", label: "Polski" },
    { code: "pt-BR", label: "Português Brasileiro" },
    { code: "pt-PT", label: "Português" },
    { code: "ro-RO", label: "Română" },
    { code: "ru-RU", label: "Русский" },
    { code: "sk-SK", label: "Slovenčina" },
    { code: "sv-SE", label: "Svenska" },
    { code: "sl-SI", label: "Slovenščina" },
    { code: "tr-TR", label: "Türkçe" },
    { code: "uk-UA", label: "Українська" },
    { code: "zh-CN", label: "简体中文" },
    { code: "zh-TW", label: "繁體中文" },
    { code: "vi-VN", label: "Tiếng Việt" },
    { code: "mr-IN", label: "मराठी" },
    { code: "ml-IN", label: "മലയാളം" },
  ]
    .filter(
      (lang) =>
        (percentages as Record<string, number>)[lang.code] >=
        COMPLETION_THRESHOLD,
    )
    .sort((left, right) => (left.label > right.label ? 1 : -1)),
];

const TEST_LANG_CODE = "__test__";
if (import.meta.env.DEV) {
  languages.unshift(
    { code: TEST_LANG_CODE, label: "test language" },
    {
      code: `${TEST_LANG_CODE}.rtl`,
      label: "\u{202a}test language (rtl)\u{202c}",
      rtl: true,
    },
  );
}

let currentLang: Language = defaultLang;
let currentLangData = {};

export const setLanguage = async (lang: Language) => {
  currentLang = lang;
  document.documentElement.dir = currentLang.rtl ? "rtl" : "ltr";
  document.documentElement.lang = currentLang.code;

  if (lang.code.startsWith(TEST_LANG_CODE)) {
    currentLangData = {};
  } else {
    try {
      currentLangData = await import(`./locales/${currentLang.code}.json`);
    } catch (error: any) {
      console.error(`Failed to load language ${lang.code}:`, error.message);
      currentLangData = fallbackLangData;
    }
  }

  editorJotaiStore.set(editorLangCodeAtom, lang.code);
};

export const getLanguage = () => currentLang;

const findPartsForData = (data: any, parts: string[]) => {
  for (let index = 0; index < parts.length; ++index) {
    const part = parts[index];
    if (data[part] === undefined) {
      return undefined;
    }
    data = data[part];
  }
  if (typeof data !== "string") {
    return undefined;
  }
  return data;
};

export const t = (
  path: NestedKeyOf<typeof fallbackLangData>,
  replacement?: { [key: string]: string | number } | null,
  fallback?: string,
) => {
  if (currentLang.code.startsWith(TEST_LANG_CODE)) {
    const name = replacement
      ? `${path}(${JSON.stringify(replacement).slice(1, -1)})`
      : path;
    return `\u{202a}[[${name}]]\u{202c}`;
  }

  const parts = path.split(".");
  let translation =
    findPartsForData(currentLangData, parts) ||
    findPartsForData(fallbackLangData, parts) ||
    fallback;
  if (translation === undefined) {
    const errorMessage = `Can't find translation for ${path}`;
    // in production, don't blow up the app on a missing translation key
    if (import.meta.env.PROD) {
      console.warn(errorMessage);
      return "";
    }
    throw new Error(errorMessage);
  }

  if (replacement) {
    for (const key in replacement) {
      translation = translation.replace(`{{${key}}}`, String(replacement[key]));
    }
  }
  return translation;
};

/** @private atom used solely to rerender components using `useI18n` hook */
const editorLangCodeAtom = atom(defaultLang.code);

// Should be used in components that fall under these cases:
// - component is rendered as an <Excalidraw> child
// - component is rendered internally by <Excalidraw>, but the component
//   is memoized w/o being updated on `langCode`, `AppState`, or `UIAppState`
export const useI18n = () => {
  const langCode = useAtomValue(editorLangCodeAtom);
  return { t, langCode };
};
