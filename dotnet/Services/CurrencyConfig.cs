using System.Collections.Generic;
using System.Globalization;

namespace GlobalPayments.Services
{
    /// <summary>
    /// Currency Configuration
    /// Manages currency metadata and formatting rules
    /// </summary>
    public class CurrencyConfig
    {
        public class Currency
        {
            public string Code { get; set; }
            public string Name { get; set; }
            public string Symbol { get; set; }
            public string SymbolPosition { get; set; }
            public int Decimals { get; set; }
            public string DecimalSeparator { get; set; }
            public string ThousandsSeparator { get; set; }
            public string Country { get; set; }
            public string Flag { get; set; }

            public Currency(string code, string name, string symbol, string symbolPosition,
                          int decimals, string decimalSeparator, string thousandsSeparator,
                          string country, string flag)
            {
                Code = code;
                Name = name;
                Symbol = symbol;
                SymbolPosition = symbolPosition;
                Decimals = decimals;
                DecimalSeparator = decimalSeparator;
                ThousandsSeparator = thousandsSeparator;
                Country = country;
                Flag = flag;
            }
        }

        private static readonly Dictionary<string, Currency> Currencies = new()
        {
            { "USD", new Currency("USD", "US Dollar", "$", "before", 2, ".", ",", "US", "🇺🇸") },
            { "EUR", new Currency("EUR", "Euro", "€", "after", 2, ",", ".", "GB", "🇪🇺") }, // GP API uses GB for EUR
            { "GBP", new Currency("GBP", "British Pound", "£", "before", 2, ".", ",", "GB", "🇬🇧") },
            { "CAD", new Currency("CAD", "Canadian Dollar", "C$", "before", 2, ".", ",", "CA", "🇨🇦") },
            { "AUD", new Currency("AUD", "Australian Dollar", "A$", "before", 2, ".", ",", "AU", "🇦🇺") },
            { "JPY", new Currency("JPY", "Japanese Yen", "¥", "before", 0, "", ",", "JP", "🇯🇵") }
        };

        /// <summary>
        /// Get all supported currencies
        /// </summary>
        public static Dictionary<string, Currency> GetAllCurrencies()
        {
            return new Dictionary<string, Currency>(Currencies);
        }

        /// <summary>
        /// Get currency configuration by code
        /// </summary>
        public static Currency GetCurrency(string code)
        {
            return Currencies.GetValueOrDefault(code.ToUpper());
        }

        /// <summary>
        /// Check if currency is supported
        /// </summary>
        public static bool IsSupported(string code)
        {
            return Currencies.ContainsKey(code.ToUpper());
        }

        /// <summary>
        /// Get country code for currency (for GP API configuration)
        /// </summary>
        public static string GetCountryCode(string currencyCode)
        {
            var currency = GetCurrency(currencyCode);
            return currency?.Country ?? "US";
        }

        /// <summary>
        /// Format amount according to currency rules
        /// </summary>
        public static string FormatAmount(decimal amount, string currencyCode)
        {
            var currency = GetCurrency(currencyCode);
            if (currency == null)
            {
                return amount.ToString("0.00");
            }

            // Format with proper decimal places
            string formatted = amount.ToString($"F{currency.Decimals}");

            // Replace decimal separator
            if (!string.IsNullOrEmpty(currency.DecimalSeparator) && currency.DecimalSeparator != ".")
            {
                formatted = formatted.Replace(".", currency.DecimalSeparator);
            }

            // Add thousands separator
            var parts = formatted.Split(new[] { '.', ',' });
            if (parts.Length > 0)
            {
                string integerPart = parts[0];
                var result = new System.Text.StringBuilder();
                int count = 0;

                for (int i = integerPart.Length - 1; i >= 0; i--)
                {
                    if (count > 0 && count % 3 == 0)
                    {
                        result.Insert(0, currency.ThousandsSeparator);
                    }
                    result.Insert(0, integerPart[i]);
                    count++;
                }

                if (currency.Decimals > 0 && parts.Length > 1)
                {
                    result.Append(currency.DecimalSeparator).Append(parts[1]);
                }

                formatted = result.ToString();
            }

            // Add currency symbol
            if (currency.SymbolPosition == "before")
            {
                return currency.Symbol + formatted;
            }
            else
            {
                return formatted + " " + currency.Symbol;
            }
        }

        /// <summary>
        /// Get supported currency codes
        /// </summary>
        public static IEnumerable<string> GetSupportedCodes()
        {
            return Currencies.Keys;
        }

        /// <summary>
        /// Validate and normalize currency code
        /// </summary>
        public static string ValidateCurrency(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return "USD";
            }

            string upperCode = code.ToUpper().Trim();
            return IsSupported(upperCode) ? upperCode : "USD";
        }
    }
}
