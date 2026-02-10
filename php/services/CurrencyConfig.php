<?php

namespace Services;

class CurrencyConfig
{
    private static $currencies = [
        'USD' => [
            'code' => 'USD',
            'name' => 'US Dollar',
            'symbol' => '$',
            'symbolPosition' => 'before',
            'decimals' => 2,
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'country' => 'US',
            'flag' => '🇺🇸'
        ],
        'EUR' => [
            'code' => 'EUR',
            'name' => 'Euro',
            'symbol' => '€',
            'symbolPosition' => 'after',
            'decimals' => 2,
            'decimalSeparator' => ',',
            'thousandsSeparator' => '.',
            'country' => 'GB', // GP API uses GB for EUR processing
            'flag' => '🇪🇺'
        ],
        'GBP' => [
            'code' => 'GBP',
            'name' => 'British Pound',
            'symbol' => '£',
            'symbolPosition' => 'before',
            'decimals' => 2,
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'country' => 'GB',
            'flag' => '🇬🇧'
        ],
        'CAD' => [
            'code' => 'CAD',
            'name' => 'Canadian Dollar',
            'symbol' => 'C$',
            'symbolPosition' => 'before',
            'decimals' => 2,
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'country' => 'CA',
            'flag' => '🇨🇦'
        ],
        'AUD' => [
            'code' => 'AUD',
            'name' => 'Australian Dollar',
            'symbol' => 'A$',
            'symbolPosition' => 'before',
            'decimals' => 2,
            'decimalSeparator' => '.',
            'thousandsSeparator' => ',',
            'country' => 'AU',
            'flag' => '🇦🇺'
        ],
        'JPY' => [
            'code' => 'JPY',
            'name' => 'Japanese Yen',
            'symbol' => '¥',
            'symbolPosition' => 'before',
            'decimals' => 0,
            'decimalSeparator' => '',
            'thousandsSeparator' => ',',
            'country' => 'JP',
            'flag' => '🇯🇵'
        ]
    ];

    /**
     * Get all supported currencies
     *
     * @return array
     */
    public static function getAllCurrencies(): array
    {
        return self::$currencies;
    }

    /**
     * Get currency configuration by code
     *
     * @param string $code Currency code (USD, EUR, etc.)
     * @return array|null Currency configuration or null if not found
     */
    public static function getCurrency(string $code): ?array
    {
        $code = strtoupper($code);
        return self::$currencies[$code] ?? null;
    }

    /**
     * Check if currency is supported
     *
     * @param string $code Currency code
     * @return bool
     */
    public static function isSupported(string $code): bool
    {
        return isset(self::$currencies[strtoupper($code)]);
    }

    /**
     * Get country code for currency (for GP API configuration)
     *
     * @param string $currencyCode Currency code
     * @return string Country code
     */
    public static function getCountryCode(string $currencyCode): string
    {
        $currency = self::getCurrency($currencyCode);
        return $currency ? $currency['country'] : 'US';
    }

    /**
     * Get number of decimal places for currency
     *
     * @param string $currencyCode Currency code
     * @return int Number of decimals
     */
    public static function getDecimals(string $currencyCode): int
    {
        $currency = self::getCurrency($currencyCode);
        return $currency ? $currency['decimals'] : 2;
    }

    /**
     * Format amount according to currency rules
     *
     * @param float $amount Amount to format
     * @param string $currencyCode Currency code
     * @return string Formatted amount with currency symbol
     */
    public static function formatAmount(float $amount, string $currencyCode): string
    {
        $currency = self::getCurrency($currencyCode);
        if (!$currency) {
            return number_format($amount, 2);
        }

        $formatted = number_format(
            $amount,
            $currency['decimals'],
            $currency['decimalSeparator'],
            $currency['thousandsSeparator']
        );

        if ($currency['symbolPosition'] === 'before') {
            return $currency['symbol'] . $formatted;
        } else {
            return $formatted . ' ' . $currency['symbol'];
        }
    }

    /**
     * Get supported currency codes
     *
     * @return array
     */
    public static function getSupportedCodes(): array
    {
        return array_keys(self::$currencies);
    }

    /**
     * Validate and normalize currency code
     *
     * @param string|null $code Currency code
     * @return string Valid currency code (defaults to USD)
     */
    public static function validateCurrency(?string $code): string
    {
        if (!$code) {
            return 'USD';
        }

        $code = strtoupper(trim($code));
        return self::isSupported($code) ? $code : 'USD';
    }
}
