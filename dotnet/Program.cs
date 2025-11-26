/**
 * Global Payments GP API - .NET
 *
 * Card payment processing using Global Payments GP API with client-side tokenization.
 * Includes multi-language and multi-currency support.
 */

using GlobalPayments.Api;
using GlobalPayments.Api.Entities;
using GlobalPayments.Api.Entities.Enums;
using GlobalPayments.Api.PaymentMethods;
using GlobalPayments.Api.Services;
using GlobalPayments.Services;
using dotenv.net;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;
using System.Net;
using System.Net.Http;
using Environment = GlobalPayments.Api.Entities.Environment;

namespace CardPaymentSample;

public class Program
{
    public static void Main(string[] args)
    {
        DotEnv.Load();

        var builder = WebApplication.CreateBuilder(args);

        // Add session services
        builder.Services.AddDistributedMemoryCache();
        builder.Services.AddSession(options =>
        {
            options.IdleTimeout = TimeSpan.FromHours(24);
            options.Cookie.HttpOnly = true;
            options.Cookie.IsEssential = true;
        });

        var app = builder.Build();

        app.UseDefaultFiles();
        app.UseStaticFiles();

        // Enable session
        app.UseSession();

        ConfigureGpApi();

        ConfigureEndpoints(app);

        var port = System.Environment.GetEnvironmentVariable("PORT") ?? "8000";
        app.Urls.Add($"http://0.0.0.0:{port}");

        Console.WriteLine($"Server running at http://localhost:{port}");
        Console.WriteLine("GP API card payment processing with localization ready");
        Console.WriteLine($"Supported locales: {string.Join(", ", LocaleService.GetSupportedCodes())}");
        Console.WriteLine($"Supported currencies: {string.Join(", ", CurrencyConfig.GetSupportedCodes())}");

        app.Run();
    }

    private static void ConfigureGpApi()
    {
        var config = new GpApiConfig
        {
            AppId = System.Environment.GetEnvironmentVariable("GP_API_APP_ID"),
            AppKey = System.Environment.GetEnvironmentVariable("GP_API_APP_KEY"),
            Environment = Environment.TEST,
            Channel = Channel.CardNotPresent,
            Country = "US",
            Permissions = new[] { "PMT_POST_Create_Single" },
            AccessTokenInfo = new AccessTokenInfo
            {
                TransactionProcessingAccountName = "transaction_processing"
            }
        };

        ServicesContainer.ConfigureService(config);
    }

    /// <summary>
    /// Generates a random nonce for access token request
    /// </summary>
    private static string GenerateNonce()
    {
        var bytes = new byte[16];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }
        return BitConverter.ToString(bytes).Replace("-", "").ToLower();
    }

    /// <summary>
    /// Creates SHA-512 hash of nonce + appKey
    /// </summary>
    private static string HashSecret(string nonce, string appKey)
    {
        using (var sha512 = SHA512.Create())
        {
            var bytes = Encoding.UTF8.GetBytes(nonce + appKey);
            var hash = sha512.ComputeHash(bytes);
            return BitConverter.ToString(hash).Replace("-", "").ToLower();
        }
    }

    private static void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost("/config", async (HttpContext context) =>
        {
            try
            {
                // Get current locale and currency (with detection and fallbacks)
                var session = context.Session;
                var acceptLanguage = context.Request.Headers["Accept-Language"].ToString();
                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);
                var currentCurrency = LocaleService.GetCurrentCurrency(session, acceptLanguage);

                // Generate nonce and secret for manual token request
                var nonce = GenerateNonce();
                var secret = HashSecret(nonce, System.Environment.GetEnvironmentVariable("GP_API_APP_KEY") ?? "");

                // Build token request
                var tokenRequest = new
                {
                    app_id = System.Environment.GetEnvironmentVariable("GP_API_APP_ID"),
                    nonce = nonce,
                    secret = secret,
                    grant_type = "client_credentials",
                    seconds_to_expire = 600,
                    permissions = new[] { "PMT_POST_Create_Single" }
                };

                // Determine API endpoint (always sandbox/TEST for now)
                var apiEndpoint = "https://apis.sandbox.globalpay.com/ucp/accesstoken";

                // Make API request with automatic decompression
                using var handler = new HttpClientHandler
                {
                    AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate
                };

                using var httpClient = new HttpClient(handler);
                httpClient.DefaultRequestHeaders.Add("X-GP-Version", "2021-03-22");
                httpClient.DefaultRequestHeaders.AcceptEncoding.Add(new System.Net.Http.Headers.StringWithQualityHeaderValue("gzip"));
                httpClient.DefaultRequestHeaders.AcceptEncoding.Add(new System.Net.Http.Headers.StringWithQualityHeaderValue("deflate"));

                var jsonContent = JsonSerializer.Serialize(tokenRequest);
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

                var response = await httpClient.PostAsync(apiEndpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"Failed to generate access token: {responseBody}");
                }

                // Parse response
                var tokenResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
                var token = tokenResponse.GetProperty("token").GetString();
                var expiresIn = tokenResponse.TryGetProperty("seconds_to_expire", out var exp) ? exp.GetInt32() : 600;

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        accessToken = token,
                        locale = currentLocale,
                        currency = currentCurrency,
                        supportedLocales = LocaleService.GetAllLocales(),
                        supportedCurrencies = CurrencyConfig.GetAllCurrencies()
                    },
                    message = "Configuration retrieved successfully",
                    timestamp = DateTime.UtcNow.ToString("o")
                });
            }
            catch (Exception e)
            {
                return Results.Json(new
                {
                    success = false,
                    message = $"Error loading configuration: {e.Message}",
                    error_code = "CONFIG_ERROR",
                    timestamp = DateTime.UtcNow.ToString("o")
                }, statusCode: 500);
            }
        });

        // GET /api/locale - Get current locale and currency settings
        app.MapGet("/api/locale", (HttpContext context) =>
        {
            try
            {
                var session = context.Session;
                var acceptLanguage = context.Request.Headers["Accept-Language"].ToString();
                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);
                var currentCurrency = LocaleService.GetCurrentCurrency(session, acceptLanguage);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        locale = currentLocale,
                        currency = currentCurrency,
                        translations = TranslationService.GetAllTranslations(currentLocale),
                        supportedLocales = LocaleService.GetAllLocales(),
                        supportedCurrencies = CurrencyConfig.GetAllCurrencies()
                    },
                    timestamp = DateTime.UtcNow.ToString("o")
                });
            }
            catch (Exception e)
            {
                return Results.Json(new
                {
                    success = false,
                    message = $"Error retrieving locale: {e.Message}",
                    timestamp = DateTime.UtcNow.ToString("o")
                }, statusCode: 500);
            }
        });

        // POST /api/locale - Update locale and/or currency preferences
        app.MapPost("/api/locale", async (HttpContext context) =>
        {
            try
            {
                using var reader = new StreamReader(context.Request.Body);
                var body = await reader.ReadToEndAsync();
                var requestData = JsonSerializer.Deserialize<JsonElement>(body);

                var session = context.Session;

                // Update locale if provided
                if (requestData.TryGetProperty("locale", out var localeElement))
                {
                    var locale = localeElement.GetString();
                    if (!string.IsNullOrEmpty(locale))
                    {
                        LocaleService.SetSessionLocale(session, locale);
                    }
                }

                // Update currency if provided
                if (requestData.TryGetProperty("currency", out var currencyElement))
                {
                    var currency = currencyElement.GetString();
                    if (!string.IsNullOrEmpty(currency))
                    {
                        LocaleService.SetSessionCurrency(session, currency);
                    }
                }

                var acceptLanguage = context.Request.Headers["Accept-Language"].ToString();
                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);
                var currentCurrency = LocaleService.GetCurrentCurrency(session, acceptLanguage);

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        locale = currentLocale,
                        currency = currentCurrency,
                        translations = TranslationService.GetAllTranslations(currentLocale)
                    },
                    message = "Locale preferences updated",
                    timestamp = DateTime.UtcNow.ToString("o")
                });
            }
            catch (Exception e)
            {
                return Results.Json(new
                {
                    success = false,
                    message = $"Error updating locale: {e.Message}",
                    timestamp = DateTime.UtcNow.ToString("o")
                }, statusCode: 500);
            }
        });

        ConfigurePaymentEndpoint(app);
    }

    private static void ConfigurePaymentEndpoint(WebApplication app)
    {
        app.MapPost("/process-payment", async (HttpContext context) =>
        {
            try
            {
                using var reader = new StreamReader(context.Request.Body);
                var body = await reader.ReadToEndAsync();
                var requestData = JsonSerializer.Deserialize<JsonElement>(body);

                var session = context.Session;
                var acceptLanguage = context.Request.Headers["Accept-Language"].ToString();

                // Update session with user preferences
                if (requestData.TryGetProperty("locale", out var localeElement))
                {
                    var locale = localeElement.GetString();
                    if (!string.IsNullOrEmpty(locale))
                    {
                        LocaleService.SetSessionLocale(session, locale);
                    }
                }

                if (requestData.TryGetProperty("currency", out var sessionCurrElement))
                {
                    var sessionCurr = sessionCurrElement.GetString();
                    if (!string.IsNullOrEmpty(sessionCurr))
                    {
                        LocaleService.SetSessionCurrency(session, sessionCurr);
                    }
                }

                var paymentToken = requestData.GetProperty("payment_token").GetString() ?? "";
                var currency = requestData.TryGetProperty("currency", out var currElement) ?
                    currElement.GetString() ?? "USD" : "USD";
                var amount = requestData.TryGetProperty("amount", out var amtElement) ?
                    amtElement.GetDecimal() : 0;

                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);

                // Validate currency and get country code
                var validatedCurrency = CurrencyConfig.ValidateCurrency(currency);
                var countryCode = CurrencyConfig.GetCountryCode(validatedCurrency);

                // Reconfigure ServicesContainer with the same country as token generation
                var paymentConfig = new GpApiConfig
                {
                    AppId = System.Environment.GetEnvironmentVariable("GP_API_APP_ID"),
                    AppKey = System.Environment.GetEnvironmentVariable("GP_API_APP_KEY"),
                    Environment = Environment.TEST,
                    Channel = Channel.CardNotPresent,
                    Country = countryCode,
                    Permissions = new[] { "PMT_POST_Create_Single" },
                    AccessTokenInfo = new AccessTokenInfo
                    {
                        TransactionProcessingAccountName = "transaction_processing"
                    }
                };

                ServicesContainer.ConfigureService(paymentConfig);

                if (string.IsNullOrEmpty(paymentToken) || amount <= 0)
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = TranslationService.T("validation.required", currentLocale),
                        error_code = "VALIDATION_ERROR",
                        timestamp = DateTime.UtcNow.ToString("o")
                    }, statusCode: 400);
                }

                // Check if currency is supported
                if (!CurrencyConfig.IsSupported(validatedCurrency))
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = TranslationService.T("error.currency_not_supported", currentLocale,
                            new Dictionary<string, string> { { "currency", validatedCurrency } }),
                        error_code = "VALIDATION_ERROR",
                        timestamp = DateTime.UtcNow.ToString("o")
                    }, statusCode: 400);
                }

                var card = new CreditCardData
                {
                    Token = paymentToken
                };

                var response = card.Charge(amount)
                    .WithCurrency(validatedCurrency)
                    .Execute();

                // Simplified validation: check for 00 or SUCCESS response code
                if (response.ResponseCode == "00" || response.ResponseCode == "SUCCESS")
                {
                    var transactionId = response.TransactionId;
                    if (string.IsNullOrEmpty(transactionId))
                    {
                        transactionId = $"txn_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
                    }

                    var successMessage = TranslationService.T("message.success", currentLocale);

                    // Simplified response structure
                    return Results.Ok(new
                    {
                        success = true,
                        data = new
                        {
                            transactionId = transactionId,
                            amount = amount,
                            currency = validatedCurrency,
                            status = response.ResponseMessage,
                            reference = response.ReferenceNumber ?? "",
                            timestamp = DateTime.UtcNow.ToString("o")
                        },
                        message = successMessage,
                        timestamp = DateTime.UtcNow.ToString("o")
                    });
                }
                else
                {
                    throw new Exception($"Transaction declined: {response.ResponseMessage}");
                }
            }
            catch (ApiException ex)
            {
                return Results.Json(new
                {
                    success = false,
                    message = $"Payment processing failed: {ex.Message}",
                    error_code = "API_ERROR",
                    timestamp = DateTime.UtcNow.ToString("o")
                }, statusCode: 400);
            }
            catch (Exception ex)
            {
                return Results.Json(new
                {
                    success = false,
                    message = $"Server error: {ex.Message}",
                    error_code = "SERVER_ERROR",
                    timestamp = DateTime.UtcNow.ToString("o")
                }, statusCode: 500);
            }
        });
    }
}
