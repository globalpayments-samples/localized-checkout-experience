<?php

namespace Services;

class LocaleService
{
    private static $supportedLocales = [
        'en' => [
            'code' => 'en',
            'name' => 'English',
            'nativeName' => 'English',
            'flag' => '🇺🇸',
            'defaultCurrency' => 'USD'
        ],
        'es' => [
            'code' => 'es',
            'name' => 'Spanish',
            'nativeName' => 'Español',
            'flag' => '🇪🇸',
            'defaultCurrency' => 'EUR'
        ],
        'fr' => [
            'code' => 'fr',
            'name' => 'French',
            'nativeName' => 'Français',
            'flag' => '🇫🇷',
            'defaultCurrency' => 'EUR'
        ],
        'de' => [
            'code' => 'de',
            'name' => 'German',
            'nativeName' => 'Deutsch',
            'flag' => '🇩🇪',
            'defaultCurrency' => 'EUR'
        ],
        'pt' => [
            'code' => 'pt',
            'name' => 'Portuguese',
            'nativeName' => 'Português',
            'flag' => '🇵🇹',
            'defaultCurrency' => 'EUR'
        ]
    ];

    /**
     * Get all supported locales
     *
     * @return array
     */
    public static function getAllLocales(): array
    {
        return self::$supportedLocales;
    }

    /**
     * Get locale configuration
     *
     * @param string $code Locale code
     * @return array|null
     */
    public static function getLocale(string $code): ?array
    {
        $code = strtolower(substr($code, 0, 2)); // Normalize to 2-letter code
        return self::$supportedLocales[$code] ?? null;
    }

    /**
     * Check if locale is supported
     *
     * @param string $code Locale code
     * @return bool
     */
    public static function isSupported(string $code): bool
    {
        $code = strtolower(substr($code, 0, 2));
        return isset(self::$supportedLocales[$code]);
    }

    /**
     * Detect locale from Accept-Language header
     *
     * @param string|null $acceptLanguage Accept-Language header value
     * @return string Detected locale code (defaults to 'en')
     */
    public static function detectLocale(?string $acceptLanguage): string
    {
        if (!$acceptLanguage) {
            return 'en';
        }

        // Parse Accept-Language header
        // Example: "en-US,en;q=0.9,es;q=0.8"
        $languages = [];
        $parts = explode(',', $acceptLanguage);

        foreach ($parts as $part) {
            $langParts = explode(';', trim($part));
            $lang = strtolower(substr($langParts[0], 0, 2));
            $quality = 1.0;

            if (isset($langParts[1]) && strpos($langParts[1], 'q=') === 0) {
                $quality = floatval(substr($langParts[1], 2));
            }

            $languages[$lang] = $quality;
        }

        // Sort by quality
        arsort($languages);

        // Find first supported locale
        foreach (array_keys($languages) as $lang) {
            if (self::isSupported($lang)) {
                return $lang;
            }
        }

        return 'en';
    }

    /**
     * Validate and normalize locale code
     *
     * @param string|null $code Locale code
     * @return string Valid locale code (defaults to 'en')
     */
    public static function validateLocale(?string $code): string
    {
        if (!$code) {
            return 'en';
        }

        $code = strtolower(substr(trim($code), 0, 2));
        return self::isSupported($code) ? $code : 'en';
    }

    /**
     * Get supported locale codes
     *
     * @return array
     */
    public static function getSupportedCodes(): array
    {
        return array_keys(self::$supportedLocales);
    }

    /**
     * Get default currency for locale
     *
     * @param string $locale Locale code
     * @return string Currency code
     */
    public static function getDefaultCurrency(string $locale): string
    {
        $localeData = self::getLocale($locale);
        return $localeData ? $localeData['defaultCurrency'] : 'USD';
    }

    /**
     * Start session if not already started
     */
    private static function ensureSession(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Get locale from session
     *
     * @return string|null
     */
    public static function getSessionLocale(): ?string
    {
        self::ensureSession();
        return $_SESSION['locale'] ?? null;
    }

    /**
     * Set locale in session
     *
     * @param string $locale Locale code
     */
    public static function setSessionLocale(string $locale): void
    {
        self::ensureSession();
        $_SESSION['locale'] = self::validateLocale($locale);
    }

    /**
     * Get currency from session
     *
     * @return string|null
     */
    public static function getSessionCurrency(): ?string
    {
        self::ensureSession();
        return $_SESSION['currency'] ?? null;
    }

    /**
     * Set currency in session
     *
     * @param string $currency Currency code
     */
    public static function setSessionCurrency(string $currency): void
    {
        self::ensureSession();
        $_SESSION['currency'] = CurrencyConfig::validateCurrency($currency);
    }

    /**
     * Get current locale with fallback logic
     * Priority: Session > Accept-Language > Default (en)
     *
     * @return string
     */
    public static function getCurrentLocale(): string
    {
        // Check session
        $sessionLocale = self::getSessionLocale();
        if ($sessionLocale) {
            return $sessionLocale;
        }

        // Detect from browser
        $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? null;
        $detected = self::detectLocale($acceptLanguage);

        // Save to session
        self::setSessionLocale($detected);

        return $detected;
    }

    /**
     * Get current currency with fallback logic
     * Priority: Session > Locale default > USD
     *
     * @return string
     */
    public static function getCurrentCurrency(): string
    {
        // Check session
        $sessionCurrency = self::getSessionCurrency();
        if ($sessionCurrency) {
            return $sessionCurrency;
        }

        // Use locale default
        $locale = self::getCurrentLocale();
        $defaultCurrency = self::getDefaultCurrency($locale);

        // Save to session
        self::setSessionCurrency($defaultCurrency);

        return $defaultCurrency;
    }
}
