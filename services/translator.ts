import { translations } from './translations.ts';

type LanguageKey = keyof typeof translations;

export const getTranslator = (lang: string) => {
    const language = (lang || 'en') as LanguageKey;

    const t = (key: string): string => {
        // Fallback logic: current lang -> english -> key
        return translations[language]?.[key] || translations['en']?.[key] || key;
    };

    return { t, currentLang: language };
};