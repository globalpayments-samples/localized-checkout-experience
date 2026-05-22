# Localized Checkout Experience

> Build a localized, multi-currency card checkout using GP API tokenization across Node.js, PHP, Java, and .NET.

## Critical Patterns

1. **Generate single-use client tokens in `/config` before any charge call.** Node.js `server.js` uses `GpApiService.generateTransactionKey()`, PHP `config.php` uses `GpApiService::generateTransactionKey()`, Java `ProcessPaymentServlet.handleGetConfig()` uses `GpApiService.generateTransactionKey()`, and .NET `Program.ConfigureEndpoints()` uses `GpApiService.GenerateTransactionKey()`. The returned `accessToken` is for browser-side tokenization only; `/process-payment` consumes a `payment_token`, not raw card data.
2. **Country routing is driven by `CurrencyConfig`, and EUR intentionally maps to `GB`.** PHP `CurrencyConfig::getCountryCode()`, Java `CurrencyConfig.getCountryCode()`, and .NET `CurrencyConfig.GetCountryCode()` feed the GP API config before token generation and charging. If you change currency support, update the country mapping at the same time or GP API will be configured for the wrong region.
3. **Node.js is not behavior-identical to the other stacks.** `nodejs/server.js` validates currency but hard-codes `config.country = 'US'` in both `/config` and `/process-payment`; PHP, Java, and .NET reconfigure with `CurrencyConfig::getCountryCode()` / `getCountryCode()` / `GetCountryCode()`. Do not document all implementations as dynamically country-routed without calling out this divergence.
4. **Locale persistence lives in server session helpers, not in the frontend.** Each stack resolves locale as Session → `Accept-Language` → `en`, and currency as Session → locale default → `USD`, using `getCurrentLocale()` / `GetCurrentLocale()` and `getCurrentCurrency()` / `GetCurrentCurrency()`. If you bypass `/api/locale` or `get-locale.php`, reload persistence breaks.

## Repository Structure

### Node.js (Express + GP API Node SDK)
- [`nodejs/server.js`](nodejs/server.js) — canonical Node implementation; `getGpEnvironment()`, `getSessionSecret()`, `app.post('/config')`, `app.post('/process-payment')`, `app.get('/api/locale')`, `app.post('/api/locale')`.
- [`nodejs/services/LocaleService.js`](nodejs/services/LocaleService.js) — locale/session rules; `detectLocale()`, `validateLocale()`, `getCurrentLocale()`, `getCurrentCurrency()`, `setSessionLocale()`, `setSessionCurrency()`.
- [`nodejs/services/CurrencyConfig.js`](nodejs/services/CurrencyConfig.js) — currency metadata; `getCountryCode()`, `validateCurrency()`, `formatAmount()`.
- [`nodejs/services/TranslationService.js`](nodejs/services/TranslationService.js) — translation loading; `loadTranslations()`, `translate()`, `t()`.
- [`nodejs/index.html`](nodejs/index.html) — frontend entry point; calls `/config`, `/api/locale`, and `/process-payment`.
- Storage layer — `express-session` memory store configured in `server.js`.

### PHP (native PHP + GP API PHP SDK)
- [`php/PaymentUtils.php`](php/PaymentUtils.php) — canonical PHP helper; `configureSdk()`, `sanitizePostalCode()`, `processPaymentWithToken()`, `handleCORS()`, `parseJsonInput()`, `sendSuccessResponse()`, `sendErrorResponse()`.
- [`php/config.php`](php/config.php) — config endpoint; generates the browser token with `GpApiService::generateTransactionKey()`.
- [`php/get-locale.php`](php/get-locale.php) — locale endpoint; GET returns current locale/currency, POST updates session-backed preferences.
- [`php/process-payment.php`](php/process-payment.php) — payment endpoint; calls `PaymentUtils::configureSdk()` and `PaymentUtils::processPaymentWithToken()`.
- [`php/services/LocaleService.php`](php/services/LocaleService.php) — locale/session rules; `detectLocale()`, `getCurrentLocale()`, `getCurrentCurrency()`, `setSessionLocale()`, `setSessionCurrency()`.
- [`php/services/CurrencyConfig.php`](php/services/CurrencyConfig.php) — currency metadata; `getCountryCode()`, `validateCurrency()`, `formatAmount()`.
- [`php/services/TranslationService.php`](php/services/TranslationService.php) — translation loading; `translate()`, `t()`, `getAllTranslations()`.
- [`php/index.html`](php/index.html) — frontend entry point; calls `config.php`, `get-locale.php`, and `process-payment.php`.
- Storage layer — native PHP session storage via `LocaleService::ensureSession()`.

### Java (Jakarta Servlets + GP API Java SDK)
- [`java/src/main/java/com/globalpayments/example/ProcessPaymentServlet.java`](java/src/main/java/com/globalpayments/example/ProcessPaymentServlet.java) — canonical Java payment/config controller; `init()`, `doPost()`, `handleGetConfig()`, `handleProcessPayment()`, `setCORSHeaders()`.
- [`java/src/main/java/com/globalpayments/example/LocaleServlet.java`](java/src/main/java/com/globalpayments/example/LocaleServlet.java) — locale controller; `doGet()`, `doPost()`, `doOptions()`, `convertLocalesToJSON()`, `convertCurrenciesToJSON()`.
- [`java/src/main/java/com/globalpayments/example/services/LocaleService.java`](java/src/main/java/com/globalpayments/example/services/LocaleService.java) — locale/session rules; `detectLocale()`, `getCurrentLocale()`, `getCurrentCurrency()`, `setSessionLocale()`, `setSessionCurrency()`.
- [`java/src/main/java/com/globalpayments/example/services/CurrencyConfig.java`](java/src/main/java/com/globalpayments/example/services/CurrencyConfig.java) — currency metadata; `getCountryCode()`, `validateCurrency()`, `formatAmount()`.
- [`java/src/main/java/com/globalpayments/example/services/TranslationService.java`](java/src/main/java/com/globalpayments/example/services/TranslationService.java) — translation loading; `loadTranslations()`, `translate()`, `t()`.
- [`java/src/main/webapp/index.html`](java/src/main/webapp/index.html) — frontend entry point; calls `/config`, `/api/locale`, and `/process-payment`.
- Storage layer — `HttpSession` in `LocaleServlet` and `ProcessPaymentServlet`.

### .NET (ASP.NET Core Minimal API + GP API .NET SDK)
- [`dotnet/Program.cs`](dotnet/Program.cs) — canonical .NET implementation; `Main()`, `ConfigureGpApi()`, `ConfigureEndpoints()`, `ConfigurePaymentEndpoint()`.
- [`dotnet/Services/LocaleService.cs`](dotnet/Services/LocaleService.cs) — locale/session rules; `DetectLocale()`, `GetCurrentLocale()`, `GetCurrentCurrency()`, `SetSessionLocale()`, `SetSessionCurrency()`.
- [`dotnet/Services/CurrencyConfig.cs`](dotnet/Services/CurrencyConfig.cs) — currency metadata; `GetCountryCode()`, `ValidateCurrency()`, `FormatAmount()`.
- [`dotnet/Services/TranslationService.cs`](dotnet/Services/TranslationService.cs) — translation loading; `LoadTranslations()`, `Translate()`, `T()`.
- [`dotnet/wwwroot/index.html`](dotnet/wwwroot/index.html) — frontend entry point; calls `/config`, `/api/locale`, and `/process-payment`.
- Storage layer — ASP.NET Core session middleware backed by `AddDistributedMemoryCache()` in `Program.Main()`.

### Shared
- [`README.md`](README.md) — high-level project overview.
- [`docker-compose.yml`](docker-compose.yml) — multi-service compose file, but it still declares `python`, `go`, and `tests` services that do not exist in this repo.
- [`docker-run.sh`](docker-run.sh) — helper script built around the same stale compose assumptions.
- [`index.html`](index.html) — generic root sample page; not the active frontend for any of the four checked-in implementations.
- Present implementations: `nodejs/`, `php/`, `java/`, `dotnet/`. Absent despite compose references: `python/`, `go/`, `tests/`, `playwright.config.js`.

## API Surface

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/config` | Node.js, Java, and .NET: generate a GP API browser token plus locale/currency metadata. |
| GET | `/config.php` | PHP: generate the same browser token plus locale/currency metadata. |
| GET | `/api/locale` | Node.js, Java, and .NET: read current locale, current currency, supported sets, and translations. |
| POST | `/api/locale` | Node.js, Java, and .NET: update locale and/or currency in session. |
| GET | `/get-locale.php` | PHP: read current locale, current currency, supported sets, and translations. |
| POST | `/get-locale.php` | PHP: update locale and/or currency in session. |
| POST | `/process-payment` | Node.js, Java, and .NET: charge a tokenized card in the selected currency. |
| POST | `/process-payment.php` | PHP: charge a tokenized card in the selected currency and include card metadata in the response. |

## Environment Variables

```bash
GP_API_APP_ID=...          # GP API app ID used by every backend
GP_API_APP_KEY=...         # GP API app key used by every backend
GP_API_ENVIRONMENT=sandbox # Present in every checked-in .env.sample
```

Notes:
- `nodejs/.env.sample` additionally defines `SESSION_SECRET` for `getSessionSecret()` in `nodejs/server.js`; the other implementations do not include it.
- `PORT` is a runtime override read by Node.js, PHP, and .NET, but it is not listed in the checked-in `.env.sample` files.
- All checked-in `.env.sample` files expose `GP_API_*`; none expose the `PUBLIC_API_KEY` / `SECRET_API_KEY` names still referenced by `docker-compose.yml` and `docker-run.sh`.
- Java always loads `.env` with `Dotenv.load()` and uses `cargo.servlet.port` in `pom.xml` for its default listener.

## Test Cards / Sandbox Credentials

Use GP API sandbox credentials from the Global Payments developer portal: <https://developer.globalpay.com/>.

| Scenario | Card | Notes |
|---|---|---|
| Visa success | `4263970000005262` | Canonical GP-API sandbox Visa |
| Mastercard success | `5425230000004415` | Canonical GP-API sandbox Mastercard |
| Additional repo docs | `4263 9826 4026 9299`, `4000 1200 0000 1154`, `5425 2334 2424 1200` | Still appear in the current READMEs, so treat those as inconsistent repo docs until they are normalized |

## Architecture Summary

**Tokenization flow:** browser `index.html` → `/config` or `config.php` → `GpApiService.generateTransactionKey()` / `GenerateTransactionKey()` → frontend GP JS SDK tokenizes card → backend receives `payment_token`.

**Locale flow:** `Accept-Language` header → `LocaleService.detectLocale()` / `DetectLocale()` → session persistence via `setSessionLocale()` / `SetSessionLocale()` and `setSessionCurrency()` / `SetSessionCurrency()` → translated response payload.

**Charge flow:** `/process-payment` or `process-payment.php` → `CurrencyConfig.validateCurrency()` → SDK reconfiguration (`configureSdk()`, `ServicesContainer.configureService()`) → `charge()` / `Charge()` → localized success or error message.

## Security Notes

This is demo code. All backends allow `Access-Control-Allow-Origin: *`, use in-memory or default container sessions, and expose no auth or CSRF protection. `dotnet/Program.cs` also logs `/config` token details to stdout, and Node.js falls back to a hard-coded development session secret outside production.

## How to Run

```bash
cd nodejs && ./run.sh   # installs deps, starts Express on :8000 by default
cd php && ./run.sh      # installs deps, starts PHP built-in server on :8000 by default
cd java && ./run.sh     # runs mvn clean package cargo:run on :8000 by default
cd dotnet && ./run.sh   # runs dotnet restore && dotnet run on :8000 by default
```

Do not rely on `docker-compose up` as the primary path without first fixing `docker-compose.yml`: it references missing `python`, `go`, and `tests` assets and passes `PUBLIC_API_KEY` / `SECRET_API_KEY` env vars that the checked-in code does not read.

## How to Verify

```bash
# Node.js / Java / .NET config token
curl -X POST http://localhost:8000/config
# Expected: {"success":true,"data":{"accessToken":"PMT_...","locale":"en","currency":"USD",...}}

# Node.js / Java / .NET locale read
curl http://localhost:8000/api/locale
# Expected: {"success":true,"data":{"locale":"en","currency":"USD","translations":{...},...}}

# Node.js / Java / .NET locale update
curl -X POST http://localhost:8000/api/locale -H 'Content-Type: application/json' -d '{"locale":"fr","currency":"CAD"}'
# Expected: {"success":true,"data":{"locale":"fr","currency":"CAD","translations":{...}},"message":"Locale preferences updated",...}

# PHP config token
curl http://localhost:8000/config.php
# Expected: {"success":true,"data":{"accessToken":"PMT_...","locale":"en","currency":"USD",...}}

# PHP locale read
curl http://localhost:8000/get-locale.php
# Expected: {"success":true,"data":{"locale":"en","currency":"USD","translations":{...},...}}

# PHP locale update
curl -X POST http://localhost:8000/get-locale.php -H 'Content-Type: application/json' -d '{"locale":"fr","currency":"CAD"}'
# Expected: {"success":true,"data":{"locale":"fr","currency":"CAD","translations":{...}},"message":"Locale settings updated successfully",...}

# Charge endpoints require a real GP browser token (`payment_token`) from the frontend SDK.
curl -X POST http://localhost:8000/process-payment -H 'Content-Type: application/json' -d '{"payment_token":"PMT_xxx","amount":25.00,"currency":"USD"}'
# Expected: {"success":true,"data":{"transactionId":"...","amount":25.00,"currency":"USD",...},"message":"..."}

curl -X POST http://localhost:8000/process-payment.php -H 'Content-Type: application/json' -d '{"payment_token":"PMT_xxx","billing_zip":"12345","amount":25.00,"currency":"USD"}'
# Expected: {"success":true,"locale":"en","data":{"transactionId":"...","amount":25,"currency":"USD",...},"message":"..."}
```

A plain curl request cannot mint a valid payment token by itself; open the implementation-specific `index.html` in a browser to exercise hosted fields and produce a real `payment_token`.

## Making Changes

All four checked-in implementations should stay semantically aligned, but the route surface is not identical because PHP keeps `.php` endpoints. Apply behavior changes in `nodejs/`, `php/`, `java/`, and `dotnet/` together, and do not add Python or Go work just because `docker-compose.yml` mentions them.

Do not modify these shared files in isolation unless the same change is intended repo-wide: `README.md`, `docker-compose.yml`, `docker-run.sh`, and the root `index.html`. The per-language frontend files live inside each implementation directory and should be updated there instead.

Keep the `GP_API_*` keys aligned across all `.env.sample` files. If you add a new required server env var, update every implementation's sample or explicitly document why only one stack needs it.

## SDK Versions

- Node.js: `globalpayments-api` `^3.10.6`
- PHP: `globalpayments/php-sdk` `^13.1`
- Java: `com.heartlandpaymentsystems:globalpayments-sdk` `14.2.20`
- .NET: `GlobalPayments.Api` `9.0.16`
