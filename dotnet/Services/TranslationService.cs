using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace GlobalPayments.Services
{
    /// <summary>
    /// Translation Service
    /// Handles server-side translation loading and parameter substitution
    /// </summary>
    public class TranslationService
    {
        private static readonly Dictionary<string, Dictionary<string, string>> Translations = new();

        /// <summary>
        /// Load translation file for a locale
        /// </summary>
        public static Dictionary<string, string> LoadTranslations(string locale)
        {
            if (Translations.ContainsKey(locale))
            {
                return Translations[locale];
            }

            try
            {
                string path = Path.Combine(Directory.GetCurrentDirectory(), "translations", $"{locale}.json");

                if (!File.Exists(path))
                {
                    Console.WriteLine($"Translation file not found: {path}");
                    // Fallback to English
                    if (locale != "en")
                    {
                        return LoadTranslations("en");
                    }
                    return new Dictionary<string, string>();
                }

                string json = File.ReadAllText(path);
                var localeTranslations = JsonSerializer.Deserialize<Dictionary<string, string>>(json);

                Translations[locale] = localeTranslations ?? new Dictionary<string, string>();
                return Translations[locale];
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to load translations for {locale}: {ex.Message}");
                // Fallback to English
                if (locale != "en")
                {
                    return LoadTranslations("en");
                }
                return new Dictionary<string, string>();
            }
        }

        /// <summary>
        /// Get all translations for a locale
        /// </summary>
        public static Dictionary<string, string> GetAllTranslations(string locale)
        {
            return LoadTranslations(locale);
        }

        /// <summary>
        /// Translate a key with optional parameters
        /// </summary>
        public static string Translate(string key, string locale, Dictionary<string, string> parameters = null)
        {
            var localeTranslations = LoadTranslations(locale);
            string text = localeTranslations.GetValueOrDefault(key);

            // Fallback to English if translation not found
            if (text == null && locale != "en")
            {
                var enTranslations = LoadTranslations("en");
                text = enTranslations.GetValueOrDefault(key) ?? key;
            }
            else if (text == null)
            {
                text = key;
            }

            // Replace parameters in the format %paramName%
            if (parameters != null)
            {
                foreach (var param in parameters)
                {
                    text = text.Replace($"%{param.Key}%", param.Value);
                }
            }

            return text;
        }

        /// <summary>
        /// Get translation with alias 't'
        /// </summary>
        public static string T(string key, string locale, Dictionary<string, string> parameters = null)
        {
            return Translate(key, locale, parameters);
        }
    }
}
