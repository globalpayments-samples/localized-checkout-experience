package com.globalpayments.example.services;

import jakarta.servlet.http.HttpSession;
import java.util.*;

/**
 * Locale Service
 * Handles locale detection, validation, and management
 */
public class LocaleService {

    public static class Locale {
        public String code;
        public String name;
        public String nativeName;
        public String flag;
        public String defaultCurrency;

        public Locale(String code, String name, String nativeName, String flag, String defaultCurrency) {
            this.code = code;
            this.name = name;
            this.nativeName = nativeName;
            this.flag = flag;
            this.defaultCurrency = defaultCurrency;
        }
    }

    private static final Map<String, Locale> supportedLocales = new HashMap<>();

    static {
        supportedLocales.put("en", new Locale("en", "English", "English", "🇺🇸", "USD"));
        supportedLocales.put("es", new Locale("es", "Spanish", "Español", "🇪🇸", "EUR"));
        supportedLocales.put("fr", new Locale("fr", "French", "Français", "🇫🇷", "EUR"));
        supportedLocales.put("de", new Locale("de", "German", "Deutsch", "🇩🇪", "EUR"));
        supportedLocales.put("pt", new Locale("pt", "Portuguese", "Português", "🇵🇹", "EUR"));
    }

    /**
     * Get all supported locales
     */
    public static Map<String, Locale> getAllLocales() {
        return new HashMap<>(supportedLocales);
    }

    /**
     * Get locale configuration
     */
    public static Locale getLocale(String code) {
        String normalizedCode = code.toLowerCase().substring(0, Math.min(2, code.length()));
        return supportedLocales.get(normalizedCode);
    }

    /**
     * Check if locale is supported
     */
    public static boolean isSupported(String code) {
        String normalizedCode = code.toLowerCase().substring(0, Math.min(2, code.length()));
        return supportedLocales.containsKey(normalizedCode);
    }

    /**
     * Detect locale from Accept-Language header
     */
    public static String detectLocale(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isEmpty()) {
            return "en";
        }

        // Parse Accept-Language header
        // Example: "en-US,en;q=0.9,es;q=0.8"
        Map<String, Double> languages = new HashMap<>();
        String[] parts = acceptLanguage.split(",");

        for (String part : parts) {
            String[] langParts = part.trim().split(";");
            String lang = langParts[0].toLowerCase().substring(0, Math.min(2, langParts[0].length()));
            double quality = 1.0;

            if (langParts.length > 1 && langParts[1].startsWith("q=")) {
                try {
                    quality = Double.parseDouble(langParts[1].substring(2));
                } catch (NumberFormatException e) {
                    quality = 1.0;
                }
            }

            languages.put(lang, quality);
        }

        // Sort by quality and find first supported locale
        return languages.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .map(Map.Entry::getKey)
            .filter(LocaleService::isSupported)
            .findFirst()
            .orElse("en");
    }

    /**
     * Validate and normalize locale code
     */
    public static String validateLocale(String code) {
        if (code == null || code.trim().isEmpty()) {
            return "en";
        }
        String normalizedCode = code.toLowerCase().substring(0, Math.min(2, code.length())).trim();
        return isSupported(normalizedCode) ? normalizedCode : "en";
    }

    /**
     * Get supported locale codes
     */
    public static Set<String> getSupportedCodes() {
        return supportedLocales.keySet();
    }

    /**
     * Get default currency for locale
     */
    public static String getDefaultCurrency(String locale) {
        Locale localeData = getLocale(locale);
        return localeData != null ? localeData.defaultCurrency : "USD";
    }

    /**
     * Get locale from session
     */
    public static String getSessionLocale(HttpSession session) {
        Object locale = session.getAttribute("locale");
        return locale != null ? (String) locale : null;
    }

    /**
     * Set locale in session
     */
    public static void setSessionLocale(HttpSession session, String locale) {
        session.setAttribute("locale", validateLocale(locale));
    }

    /**
     * Get currency from session
     */
    public static String getSessionCurrency(HttpSession session) {
        Object currency = session.getAttribute("currency");
        return currency != null ? (String) currency : null;
    }

    /**
     * Set currency in session
     */
    public static void setSessionCurrency(HttpSession session, String currency) {
        session.setAttribute("currency", CurrencyConfig.validateCurrency(currency));
    }

    /**
     * Get current locale with fallback logic
     * Priority: Session > Accept-Language > Default (en)
     */
    public static String getCurrentLocale(HttpSession session, String acceptLanguage) {
        // Check session
        String sessionLocale = getSessionLocale(session);
        if (sessionLocale != null) {
            return sessionLocale;
        }

        // Detect from browser
        String detected = detectLocale(acceptLanguage);

        // Save to session
        setSessionLocale(session, detected);

        return detected;
    }

    /**
     * Get current currency with fallback logic
     * Priority: Session > Locale default > USD
     */
    public static String getCurrentCurrency(HttpSession session, String acceptLanguage) {
        // Check session
        String sessionCurrency = getSessionCurrency(session);
        if (sessionCurrency != null) {
            return sessionCurrency;
        }

        // Use locale default
        String locale = getCurrentLocale(session, acceptLanguage);
        String defaultCurrency = getDefaultCurrency(locale);

        // Save to session
        setSessionCurrency(session, defaultCurrency);

        return defaultCurrency;
    }
}
