package com.globalpayments.example.services;

import java.text.NumberFormat;
import java.util.*;

/**
 * Currency Configuration
 * Manages currency metadata and formatting rules
 */
public class CurrencyConfig {

    public static class Currency {
        public String code;
        public String name;
        public String symbol;
        public String symbolPosition;
        public int decimals;
        public String decimalSeparator;
        public String thousandsSeparator;
        public String country;
        public String flag;

        public Currency(String code, String name, String symbol, String symbolPosition,
                       int decimals, String decimalSeparator, String thousandsSeparator,
                       String country, String flag) {
            this.code = code;
            this.name = name;
            this.symbol = symbol;
            this.symbolPosition = symbolPosition;
            this.decimals = decimals;
            this.decimalSeparator = decimalSeparator;
            this.thousandsSeparator = thousandsSeparator;
            this.country = country;
            this.flag = flag;
        }
    }

    private static final Map<String, Currency> currencies = new HashMap<>();

    static {
        currencies.put("USD", new Currency(
            "USD", "US Dollar", "$", "before",
            2, ".", ",", "US", "🇺🇸"
        ));
        currencies.put("EUR", new Currency(
            "EUR", "Euro", "€", "after",
            2, ",", ".", "GB", "🇪🇺"  // GP API uses GB for EUR processing
        ));
        currencies.put("GBP", new Currency(
            "GBP", "British Pound", "£", "before",
            2, ".", ",", "GB", "🇬🇧"
        ));
        currencies.put("CAD", new Currency(
            "CAD", "Canadian Dollar", "C$", "before",
            2, ".", ",", "CA", "🇨🇦"
        ));
        currencies.put("AUD", new Currency(
            "AUD", "Australian Dollar", "A$", "before",
            2, ".", ",", "AU", "🇦🇺"
        ));
        currencies.put("JPY", new Currency(
            "JPY", "Japanese Yen", "¥", "before",
            0, "", ",", "JP", "🇯🇵"
        ));
    }

    /**
     * Get all supported currencies
     */
    public static Map<String, Currency> getAllCurrencies() {
        return new HashMap<>(currencies);
    }

    /**
     * Get currency configuration by code
     */
    public static Currency getCurrency(String code) {
        return currencies.get(code.toUpperCase());
    }

    /**
     * Check if currency is supported
     */
    public static boolean isSupported(String code) {
        return currencies.containsKey(code.toUpperCase());
    }

    /**
     * Get country code for currency (for GP API configuration)
     */
    public static String getCountryCode(String currencyCode) {
        Currency currency = getCurrency(currencyCode);
        return currency != null ? currency.country : "US";
    }

    /**
     * Format amount according to currency rules
     */
    public static String formatAmount(double amount, String currencyCode) {
        Currency currency = getCurrency(currencyCode);
        if (currency == null) {
            return String.format("%.2f", amount);
        }

        // Format with proper decimal places
        String formatted = String.format("%." + currency.decimals + "f", amount);

        // Replace decimal separator
        if (!currency.decimalSeparator.isEmpty()) {
            formatted = formatted.replace(".", currency.decimalSeparator);
        }

        // Add thousands separator
        String[] parts = formatted.split("[,.]");
        if (parts.length > 0) {
            String integerPart = parts[0];
            StringBuilder result = new StringBuilder();
            int count = 0;
            for (int i = integerPart.length() - 1; i >= 0; i--) {
                if (count > 0 && count % 3 == 0) {
                    result.insert(0, currency.thousandsSeparator);
                }
                result.insert(0, integerPart.charAt(i));
                count++;
            }

            if (currency.decimals > 0 && parts.length > 1) {
                result.append(currency.decimalSeparator).append(parts[1]);
            }
            formatted = result.toString();
        }

        // Add currency symbol
        if ("before".equals(currency.symbolPosition)) {
            return currency.symbol + formatted;
        } else {
            return formatted + " " + currency.symbol;
        }
    }

    /**
     * Get supported currency codes
     */
    public static Set<String> getSupportedCodes() {
        return currencies.keySet();
    }

    /**
     * Validate and normalize currency code
     */
    public static String validateCurrency(String code) {
        if (code == null || code.trim().isEmpty()) {
            return "USD";
        }
        String upperCode = code.toUpperCase().trim();
        return isSupported(upperCode) ? upperCode : "USD";
    }
}
