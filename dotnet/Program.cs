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

    private static void ConfigureEndpoints(WebApplication app)
    {
        app.MapPost("/config", (HttpContext context) =>
        {
            try
            {
                // Get current locale and currency (with detection and fallbacks)
                var session = context.Session;
                var acceptLanguage = context.Request.Headers["Accept-Language"].ToString();
                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);
                var currentCurrency = LocaleService.GetCurrentCurrency(session, acceptLanguage);
                var countryCode = CurrencyConfig.GetCountryCode(currentCurrency);

                // Configure GP API to generate access token for client-side use
                // NOTE: Matching PHP configuration exactly (no SecondsToExpire, no AccessTokenInfo)
                var config = new GpApiConfig
                {
                    AppId = System.Environment.GetEnvironmentVariable("GP_API_APP_ID"),
                    AppKey = System.Environment.GetEnvironmentVariable("GP_API_APP_KEY"),
                    Environment = Environment.TEST,
                    Channel = Channel.CardNotPresent,
                    Country = countryCode,
                    Permissions = new[] { "PMT_POST_Create_Single" }
                };

                // Configure service first (matching PHP behavior - PHP calls ServicesContainer::configureService before generateTransactionKey)
                ServicesContainer.ConfigureService(config);

                // Generate access token using SDK
                var accessTokenInfo = GpApiService.GenerateTransactionKey(config);

                // Debug logging - compare token with PHP implementation
                Console.WriteLine($"[DEBUG /config] Country: {countryCode}");
                Console.WriteLine($"[DEBUG /config] Token type: {accessTokenInfo?.GetType().Name}");
                Console.WriteLine($"[DEBUG /config] Token length: {accessTokenInfo?.Token?.Length ?? 0}");
                Console.WriteLine($"[DEBUG /config] Token preview: {(accessTokenInfo?.Token?.Length > 50 ? accessTokenInfo.Token.Substring(0, 50) + "..." : accessTokenInfo?.Token ?? "NULL")}");

                if (string.IsNullOrEmpty(accessTokenInfo?.Token))
                {
                    throw new Exception("Failed to generate access token");
                }

                return Results.Ok(new
                {
                    success = true,
                    data = new
                    {
                        accessToken = accessTokenInfo.Token,
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

        app.MapPost("/get-dcc-rate", async (HttpContext context) =>
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

                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);

                // Validate required fields
                if (!requestData.TryGetProperty("payment_token", out var tokenElement) ||
                    !requestData.TryGetProperty("amount", out var amtElement) ||
                    !requestData.TryGetProperty("currency", out var currElement))
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = TranslationService.T("validation.required", currentLocale),
                        error_code = "VALIDATION_ERROR",
                        timestamp = DateTime.UtcNow.ToString("o")
                    }, statusCode: 400);
                }

                var paymentToken = tokenElement.GetString() ?? "";
                var currency = currElement.GetString() ?? "USD";
                var amount = amtElement.GetDecimal();

                if (string.IsNullOrEmpty(paymentToken) || amount <= 0 || string.IsNullOrEmpty(currency))
                {
                    return Results.Json(new
                    {
                        success = false,
                        message = TranslationService.T("validation.required", currentLocale),
                        error_code = "VALIDATION_ERROR",
                        timestamp = DateTime.UtcNow.ToString("o")
                    }, statusCode: 400);
                }

                // Validate currency and get country code
                var validatedCurrency = CurrencyConfig.ValidateCurrency(currency);
                var countryCode = CurrencyConfig.GetCountryCode(validatedCurrency);

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

                // Configure SDK for DCC rate lookup
                var dccConfig = new GpApiConfig
                {
                    AppId = System.Environment.GetEnvironmentVariable("GP_API_APP_ID"),
                    AppKey = System.Environment.GetEnvironmentVariable("GP_API_APP_KEY"),
                    Environment = Environment.TEST,
                    Channel = Channel.CardNotPresent,
                    Country = countryCode
                };

                ServicesContainer.ConfigureService(dccConfig);

                var card = new CreditCardData
                {
                    Token = paymentToken
                };

                // Get DCC rate information
                var dccDetails = await card.GetDccRate()
                    .WithAmount(amount)
                    .WithCurrency(validatedCurrency)
                    .ExecuteAsync();

                // Check if DCC is available for this card
                if (dccDetails.ResponseMessage == "AVAILABLE" && dccDetails.DccRateData != null)
                {
                    var dccData = dccDetails.DccRateData;
                    
                    // Log DCC rate response for debugging
                    Console.WriteLine("=== DCC Rate Lookup Response ===");
                    Console.WriteLine($"Amount requested: {amount} {validatedCurrency}");
                    Console.WriteLine($"Merchant Amount: {dccData.MerchantAmount} {dccData.MerchantCurrency}");
                    Console.WriteLine($"CardHolder Amount: {dccData.CardHolderAmount} {dccData.CardHolderCurrency}");
                    Console.WriteLine($"Exchange Rate: {dccData.CardHolderRate}");
                    Console.WriteLine($"Margin Rate: {dccData.MarginRatePercentage}");
                    Console.WriteLine($"DCC ID: {dccData.DccId}");
                    
                    return Results.Ok(new
                    {
                        success = true,
                        dccAvailable = true,
                        data = new
                        {
                            merchantAmount = dccData.MerchantAmount,
                            merchantCurrency = dccData.MerchantCurrency,
                            cardHolderAmount = dccData.CardHolderAmount,
                            cardHolderCurrency = dccData.CardHolderCurrency,
                            exchangeRate = dccData.CardHolderRate,
                            marginRatePercentage = dccData.MarginRatePercentage,
                            exchangeRateSource = dccData.ExchangeRateSourceName,
                            commissionPercentage = dccData.CommissionPercentage,
                            dccId = dccData.DccId
                        },
                        message = "DCC rate retrieved successfully",
                        timestamp = DateTime.UtcNow.ToString("o")
                    });
                }
                else
                {
                    // DCC not available for this card
                    return Results.Ok(new
                    {
                        success = true,
                        dccAvailable = false,
                        message = "DCC not available for this card",
                        timestamp = DateTime.UtcNow.ToString("o")
                    });
                }
            }
            catch (Exception ex)
            {
                var session = context.Session;
                var acceptLanguage = context.Request.Headers["Accept-Language"].ToString();
                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);

                // Check if this is a "not allowed" error (common for cards that don't support DCC)
                var errorMessage = ex.Message;
                if (errorMessage != null &&
                    (errorMessage.Contains("not allowed", StringComparison.OrdinalIgnoreCase) ||
                     errorMessage.Contains("not available", StringComparison.OrdinalIgnoreCase) ||
                     errorMessage.Contains("502")))
                {
                    // DCC not available - return success with dccAvailable: false
                    return Results.Ok(new
                    {
                        success = true,
                        dccAvailable = false,
                        message = "DCC not available for this card/currency combination",
                        timestamp = DateTime.UtcNow.ToString("o")
                    });
                }

                return Results.Json(new
                {
                    success = false,
                    dccAvailable = false,
                    message = TranslationService.T("error.payment_failed", currentLocale,
                        new Dictionary<string, string> { { "message", errorMessage } }),
                    error_code = "DCC_ERROR",
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
                var billingZip = requestData.TryGetProperty("billing_zip", out var zipElement) ?
                    zipElement.GetString() ?? "" : "";

                var currentLocale = LocaleService.GetCurrentLocale(session, acceptLanguage);

                // Validate currency and get country code
                var validatedCurrency = CurrencyConfig.ValidateCurrency(currency);
                var countryCode = CurrencyConfig.GetCountryCode(validatedCurrency);

                // Reconfigure ServicesContainer with the same country as token generation
                // Minimal config matching PHP PaymentUtils::configureSdk() - no Permissions or AccessTokenInfo
                var paymentConfig = new GpApiConfig
                {
                    AppId = System.Environment.GetEnvironmentVariable("GP_API_APP_ID"),
                    AppKey = System.Environment.GetEnvironmentVariable("GP_API_APP_KEY"),
                    Environment = Environment.TEST,
                    Channel = Channel.CardNotPresent,
                    Country = countryCode
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

                var address = new Address
                {
                    PostalCode = billingZip
                };

                // Build charge request
                var chargeBuilder = card.Charge(amount)
                    .WithCurrency(validatedCurrency)
                    .WithAddress(address);

                // Add DCC rate data if provided (user accepted DCC)
                if (requestData.TryGetProperty("dccData", out var dccDataElement) &&
                    dccDataElement.ValueKind == JsonValueKind.Object)
                {
                    // Round amounts to whole numbers (minor units must be integers)
                    var cardHolderAmount = Math.Round(dccDataElement.GetProperty("cardHolderAmount").GetDouble()).ToString();
                    var merchantAmount = Math.Round(dccDataElement.GetProperty("merchantAmount").GetDouble()).ToString();
                    
                    var dccData = new DccRateData
                    {
                        DccId = dccDataElement.GetProperty("dccId").GetString(),
                        CardHolderAmount = cardHolderAmount,
                        CardHolderCurrency = dccDataElement.GetProperty("cardHolderCurrency").GetString(),
                        CardHolderRate = dccDataElement.GetProperty("exchangeRate").GetString(),
                        MerchantAmount = merchantAmount,
                        MerchantCurrency = dccDataElement.GetProperty("merchantCurrency").GetString(),
                        MarginRatePercentage = dccDataElement.GetProperty("marginRatePercentage").GetString()
                    };
                    
                    // Log DCC data for debugging
                    Console.WriteLine("=== DCC Payment Request ===");
                    Console.WriteLine($"Charge Amount: {amount} {validatedCurrency}");
                    Console.WriteLine($"DCC ID: {dccData.DccId}");
                    Console.WriteLine($"Merchant Amount: {dccData.MerchantAmount} {dccData.MerchantCurrency}");
                    Console.WriteLine($"CardHolder Amount: {dccData.CardHolderAmount} {dccData.CardHolderCurrency}");
                    Console.WriteLine($"Exchange Rate: {dccData.CardHolderRate}");
                    Console.WriteLine($"Margin Rate: {dccData.MarginRatePercentage}");
                    
                    chargeBuilder = chargeBuilder.WithDccRateData(dccData);
                }

                var response = chargeBuilder.Execute();

                // Simplified validation: check for 00 or SUCCESS response code
                if (response.ResponseCode == "00" || response.ResponseCode == "SUCCESS")
                {
                    var transactionId = response.TransactionId;
                    if (string.IsNullOrEmpty(transactionId))
                    {
                        transactionId = $"txn_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
                    }

                    var successMessage = TranslationService.T("message.success", currentLocale);

                    // Build response data
                    var responseData = new Dictionary<string, object>
                    {
                        { "transactionId", transactionId },
                        { "amount", amount },
                        { "currency", validatedCurrency },
                        { "status", response.ResponseMessage ?? "Captured" },
                        { "reference", response.ReferenceNumber ?? "" },
                        { "timestamp", DateTime.UtcNow.ToString("o") }
                    };

                    // Include DCC information if it was used
                    if (response.DccRateData != null)
                    {
                        responseData.Add("dccUsed", true);
                        responseData.Add("dccInfo", new
                        {
                            cardHolderAmount = response.DccRateData.CardHolderAmount,
                            cardHolderCurrency = response.DccRateData.CardHolderCurrency,
                            exchangeRate = response.DccRateData.CardHolderRate,
                            merchantAmount = response.DccRateData.MerchantAmount,
                            merchantCurrency = response.DccRateData.MerchantCurrency
                        });
                    }

                    // Simplified response structure
                    return Results.Ok(new
                    {
                        success = true,
                        data = responseData,
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
