using Microsoft.AspNetCore.Http;
using System.Collections.Generic;
using System.Linq;

namespace GlobalPayments.Services
{
    /// <summary>
    /// Locale Service
    /// Handles locale detection, validation, and management
    /// </summary>
    public class LocaleService
    {
        public class Locale
        {
            public string Code { get; set; }
            public string Name { get; set; }
            public string NativeName { get; set; }
            public string Flag { get; set; }
            public string DefaultCurrency { get; set; }

            public Locale(string code, string name, string nativeName, string flag, string defaultCurrency)
            {
                Code = code;
                Name = name;
                NativeName = nativeName;
                Flag = flag;
                DefaultCurrency = defaultCurrency;
            }
        }

        private static readonly Dictionary<string, Locale> SupportedLocales = new()
        {
            { "en", new Locale("en", "English", "English", "🇺🇸", "USD") },
            { "es", new Locale("es", "Spanish", "Español", "🇪🇸", "EUR") },
            { "fr", new Locale("fr", "French", "Français", "🇫🇷", "EUR") },
            { "de", new Locale("de", "German", "Deutsch", "🇩🇪", "EUR") },
            { "pt", new Locale("pt", "Portuguese", "Português", "🇵🇹", "EUR") }
        };

        /// <summary>
        /// Get all supported locales
        /// </summary>
        public static Dictionary<string, Locale> GetAllLocales()
        {
            return new Dictionary<string, Locale>(SupportedLocales);
        }

        /// <summary>
        /// Get locale configuration
        /// </summary>
        public static Locale GetLocale(string code)
        {
            string normalizedCode = code.ToLower().Substring(0, System.Math.Min(2, code.Length));
            return SupportedLocales.GetValueOrDefault(normalizedCode);
        }

        /// <summary>
        /// Check if locale is supported
        /// </summary>
        public static bool IsSupported(string code)
        {
            string normalizedCode = code.ToLower().Substring(0, System.Math.Min(2, code.Length));
            return SupportedLocales.ContainsKey(normalizedCode);
        }

        /// <summary>
        /// Detect locale from Accept-Language header
        /// </summary>
        public static string DetectLocale(string acceptLanguage)
        {
            if (string.IsNullOrEmpty(acceptLanguage))
            {
                return "en";
            }

            // Parse Accept-Language header
            // Example: "en-US,en;q=0.9,es;q=0.8"
            var languages = new Dictionary<string, double>();
            var parts = acceptLanguage.Split(',');

            foreach (var part in parts)
            {
                var langParts = part.Trim().Split(';');
                string lang = langParts[0].ToLower().Substring(0, System.Math.Min(2, langParts[0].Length));
                double quality = 1.0;

                if (langParts.Length > 1 && langParts[1].StartsWith("q="))
                {
                    double.TryParse(langParts[1].Substring(2), out quality);
                }

                languages[lang] = quality;
            }

            // Sort by quality and find first supported locale
            var sortedLanguages = languages.OrderByDescending(x => x.Value);
            foreach (var lang in sortedLanguages)
            {
                if (IsSupported(lang.Key))
                {
                    return lang.Key;
                }
            }

            return "en";
        }

        /// <summary>
        /// Validate and normalize locale code
        /// </summary>
        public static string ValidateLocale(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return "en";
            }

            string normalizedCode = code.ToLower().Substring(0, System.Math.Min(2, code.Length)).Trim();
            return IsSupported(normalizedCode) ? normalizedCode : "en";
        }

        /// <summary>
        /// Get supported locale codes
        /// </summary>
        public static IEnumerable<string> GetSupportedCodes()
        {
            return SupportedLocales.Keys;
        }

        /// <summary>
        /// Get default currency for locale
        /// </summary>
        public static string GetDefaultCurrency(string locale)
        {
            var localeData = GetLocale(locale);
            return localeData?.DefaultCurrency ?? "USD";
        }

        /// <summary>
        /// Get locale from session
        /// </summary>
        public static string GetSessionLocale(ISession session)
        {
            return session.GetString("locale");
        }

        /// <summary>
        /// Set locale in session
        /// </summary>
        public static void SetSessionLocale(ISession session, string locale)
        {
            session.SetString("locale", ValidateLocale(locale));
        }

        /// <summary>
        /// Get currency from session
        /// </summary>
        public static string GetSessionCurrency(ISession session)
        {
            return session.GetString("currency");
        }

        /// <summary>
        /// Set currency in session
        /// </summary>
        public static void SetSessionCurrency(ISession session, string currency)
        {
            session.SetString("currency", CurrencyConfig.ValidateCurrency(currency));
        }

        /// <summary>
        /// Get current locale with fallback logic
        /// Priority: Session > Accept-Language > Default (en)
        /// </summary>
        public static string GetCurrentLocale(ISession session, string acceptLanguage)
        {
            // Check session
            string sessionLocale = GetSessionLocale(session);
            if (!string.IsNullOrEmpty(sessionLocale))
            {
                return sessionLocale;
            }

            // Detect from browser
            string detected = DetectLocale(acceptLanguage);

            // Save to session
            SetSessionLocale(session, detected);

            return detected;
        }

        /// <summary>
        /// Get current currency with fallback logic
        /// Priority: Session > Locale default > USD
        /// </summary>
        public static string GetCurrentCurrency(ISession session, string acceptLanguage)
        {
            // Check session
            string sessionCurrency = GetSessionCurrency(session);
            if (!string.IsNullOrEmpty(sessionCurrency))
            {
                return sessionCurrency;
            }

            // Use locale default
            string locale = GetCurrentLocale(session, acceptLanguage);
            string defaultCurrency = GetDefaultCurrency(locale);

            // Save to session
            SetSessionCurrency(session, defaultCurrency);

            return defaultCurrency;
        }
    }
}
