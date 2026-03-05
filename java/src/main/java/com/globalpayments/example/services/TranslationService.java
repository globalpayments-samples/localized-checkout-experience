package com.globalpayments.example.services;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.util.HashMap;
import java.util.Map;

/**
 * Translation Service
 * Handles server-side translation loading and parameter substitution
 */
public class TranslationService {

    private static final Map<String, Map<String, String>> translations = new HashMap<>();
    private static final Gson gson = new Gson();

    /**
     * Load translation file for a locale
     */
    public static Map<String, String> loadTranslations(String locale) {
        if (translations.containsKey(locale)) {
            return translations.get(locale);
        }

        try {
            String path = "/translations/" + locale + ".json";
            InputStream inputStream = TranslationService.class.getResourceAsStream(path);

            if (inputStream == null) {
                System.err.println("Translation file not found: " + path);
                // Fallback to English
                if (!locale.equals("en")) {
                    return loadTranslations("en");
                }
                return new HashMap<>();
            }

            InputStreamReader reader = new InputStreamReader(inputStream);
            Type type = new TypeToken<Map<String, String>>(){}.getType();
            Map<String, String> localeTranslations = gson.fromJson(reader, type);

            translations.put(locale, localeTranslations);
            reader.close();

            return localeTranslations;
        } catch (IOException e) {
            System.err.println("Failed to load translations for " + locale + ": " + e.getMessage());
            // Fallback to English
            if (!locale.equals("en")) {
                return loadTranslations("en");
            }
            return new HashMap<>();
        }
    }

    /**
     * Get all translations for a locale
     */
    public static Map<String, String> getAllTranslations(String locale) {
        return loadTranslations(locale);
    }

    /**
     * Translate a key with optional parameters
     */
    public static String translate(String key, String locale, Map<String, String> params) {
        Map<String, String> localeTranslations = loadTranslations(locale);
        String text = localeTranslations.get(key);

        // Fallback to English if translation not found
        if (text == null && !locale.equals("en")) {
            Map<String, String> enTranslations = loadTranslations("en");
            text = enTranslations.get(key);
        }

        if (text == null) {
            text = key;
        }

        // Replace parameters in the format %paramName%
        if (params != null) {
            for (Map.Entry<String, String> param : params.entrySet()) {
                text = text.replace("%" + param.getKey() + "%", param.getValue());
            }
        }

        return text;
    }

    /**
     * Translate a key without parameters
     */
    public static String translate(String key, String locale) {
        return translate(key, locale, null);
    }

    /**
     * Get translation with alias 't'
     */
    public static String t(String key, String locale, Map<String, String> params) {
        return translate(key, locale, params);
    }

    /**
     * Get translation with alias 't' without parameters
     */
    public static String t(String key, String locale) {
        return translate(key, locale, null);
    }
}
