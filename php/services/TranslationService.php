<?php

namespace Services;

use Symfony\Component\Translation\Translator;
use Symfony\Component\Translation\Loader\JsonFileLoader;

class TranslationService
{
    private static $translator = null;
    private static $translationsPath = __DIR__ . '/../translations';

    /**
     * Initialize the translator
     *
     * @param string $locale Current locale
     * @return Translator
     */
    private static function getTranslator(string $locale = 'en'): Translator
    {
        if (self::$translator === null) {
            self::$translator = new Translator($locale);
            self::$translator->addLoader('json', new JsonFileLoader());

            // Load translation files for all supported locales
            $supportedLocales = LocaleService::getSupportedCodes();

            foreach ($supportedLocales as $loc) {
                $filePath = self::$translationsPath . "/{$loc}.json";
                if (file_exists($filePath)) {
                    self::$translator->addResource('json', $filePath, $loc);
                }
            }
        } else {
            // Update locale if different
            if (self::$translator->getLocale() !== $locale) {
                self::$translator->setLocale($locale);
            }
        }

        return self::$translator;
    }

    /**
     * Translate a message
     *
     * @param string $key Translation key
     * @param array $parameters Parameters to replace in translation
     * @param string|null $locale Locale to use (null = use current)
     * @return string Translated message
     */
    public static function translate(string $key, array $parameters = [], ?string $locale = null): string
    {
        if ($locale === null) {
            $locale = LocaleService::getCurrentLocale();
        }

        $translator = self::getTranslator($locale);
        return $translator->trans($key, $parameters);
    }

    /**
     * Alias for translate
     *
     * @param string $key Translation key
     * @param array $parameters Parameters to replace
     * @param string|null $locale Locale to use
     * @return string Translated message
     */
    public static function t(string $key, array $parameters = [], ?string $locale = null): string
    {
        return self::translate($key, $parameters, $locale);
    }

    /**
     * Get all translations for a locale
     *
     * @param string|null $locale Locale code (null = current)
     * @return array Translations array
     */
    public static function getAllTranslations(?string $locale = null): array
    {
        if ($locale === null) {
            $locale = LocaleService::getCurrentLocale();
        }

        $filePath = self::$translationsPath . "/{$locale}.json";

        if (!file_exists($filePath)) {
            return [];
        }

        $content = file_get_contents($filePath);
        return json_decode($content, true) ?? [];
    }

    /**
     * Set custom translations path
     *
     * @param string $path Path to translations directory
     */
    public static function setTranslationsPath(string $path): void
    {
        self::$translationsPath = $path;
        self::$translator = null; // Reset translator to reload files
    }
}
