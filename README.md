# Localized Checkout Experience

Multi-language, multi-currency card payment processing using Global Payments GP API. This project demonstrates how to build a globally accessible checkout experience with automatic locale detection, independent language and currency selection, and session-based preference persistence.

## Features

- **Multi-Language Support**: 5 languages (English, Spanish, French, German, Portuguese)
- **Multi-Currency Support**: 6 currencies (USD, EUR, GBP, CAD, AUD, JPY)
- **Independent Selection**: Language and currency can be chosen independently
- **Automatic Locale Detection**: Detects browser language preferences via Accept-Language header
- **Session Persistence**: User preferences saved across page reloads
- **Client-Side Tokenization**: Secure card data handling with GP API JavaScript SDK
- **Localized Error Messages**: Error responses in user's selected language
- **Currency Formatting**: Locale-aware number and currency formatting
- **Dynamic Country Routing**: GP API routes payments based on selected currency

## Live Demo

Each implementation runs on `http://localhost:8000` with the same features:
- Language selector (English, Spanish, French, German, Portuguese)
- Currency selector (USD, EUR, GBP, CAD, AUD, JPY)
- Real-time currency formatting based on locale
- Localized UI elements and messages
- Session-based preference persistence

## Available Implementations

All implementations provide identical functionality with platform-specific best practices:

### [.NET Core](./dotnet/)
**Tech Stack**: ASP.NET Core Minimal API + GP API .NET SDK
**Session**: ASP.NET Core session middleware with distributed memory cache
**Token Generation**: SDK `GpApiService.GenerateTransactionKey()`
**Key Features**: Modern minimal API approach, 24-hour session timeout

### [Node.js](./nodejs/)
**Tech Stack**: Express.js + GP API Node.js SDK
**Session**: express-session middleware with memory store
**Token Generation**: SDK `GpApiService.generateTransactionKey()`
**Key Features**: ES6 modules, async/await patterns, production Redis example

### [Java](./java/)
**Tech Stack**: Jakarta EE Servlets + GP API Java SDK
**Session**: HttpSession with servlet container
**Token Generation**: SDK `GpApiService.generateTransactionKey()`
**Key Features**: Annotation-based servlets, Maven Cargo plugin, Tomcat deployment

### [PHP](./php/)
**Tech Stack**: Native PHP + GP API PHP SDK
**Session**: PHP native sessions
**Token Generation**: SDK `GpApiService::generateTransactionKey()`
**Key Features**: Symfony Translation component, PSR-12 compliant, built-in server routing

## Quick Start

### Prerequisites
- Global Payments account with GP API credentials ([Get credentials](https://developer.globalpayments.com/))
- Development environment for your chosen language

### Setup (Any Implementation)

1. **Navigate to your language directory**:
   ```bash
   cd dotnet/    # or nodejs/, java/, php/
   ```

2. **Copy environment template**:
   ```bash
   cp .env.sample .env
   ```

3. **Add your GP API credentials** to `.env`:
   ```env
   GP_API_APP_ID=your_gp_api_app_id_here
   GP_API_APP_KEY=your_gp_api_app_key_here
   GP_API_ENVIRONMENT=sandbox
   ```

4. **Run the application**:
   ```bash
   ./run.sh
   ```

5. **Open in browser**:
   ```
   http://localhost:8000
   ```

## How It Works

### 1. Locale Detection Flow
```
User opens page
   ↓
Frontend: POST /config with Accept-Language header
   ↓
Backend: Detect locale from header (e.g., "es-ES" → "es")
   ↓
Backend: Check session for saved preference
   ↓
Backend: Return locale + currency + translations + access token
   ↓
Frontend: Initialize UI with detected/saved preferences
```

### 2. Language/Currency Change Flow
```
User selects new language or currency
   ↓
Frontend: POST /api/locale with {locale, currency}
   ↓
Backend: Update session storage
   ↓
Backend: Return new translations
   ↓
Frontend: Update UI without page reload
```

### 3. Payment Processing Flow
```
User enters card details
   ↓
GP API JavaScript SDK: Tokenize card (client-side)
   ↓
Frontend: POST /process-payment with token + amount + currency + locale
   ↓
Backend: Reconfigure SDK with currency-specific country code
   ↓
Backend: Process payment via GP API
   ↓
Backend: Return localized success/error message
   ↓
Frontend: Display message in user's language
```

## Supported Languages

| Code | Language | Native Name | Default Currency | Flag |
|------|----------|-------------|------------------|------|
| en | English | English | USD | 🇺🇸 |
| es | Spanish | Español | EUR | 🇪🇸 |
| fr | French | Français | EUR | 🇫🇷 |
| de | German | Deutsch | EUR | 🇩🇪 |
| pt | Portuguese | Português | EUR | 🇵🇹 |

## Supported Currencies

| Code | Currency | Symbol | Decimals | Country Code |
|------|----------|--------|----------|--------------|
| USD | US Dollar | $ | 2 | US |
| EUR | Euro | € | 2 | GB |
| GBP | British Pound | £ | 2 | GB |
| CAD | Canadian Dollar | C$ | 2 | CA |
| AUD | Australian Dollar | A$ | 2 | AU |
| JPY | Japanese Yen | ¥ | 0 | JP |

## API Endpoints (All Implementations)

### POST /config
Generate GP API access token with locale/currency configuration.

**Request Headers**:
```
Accept-Language: es-ES,es;q=0.9,en;q=0.8
```

**Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "PMT_...",
    "locale": "es",
    "currency": "EUR",
    "supportedLocales": {...},
    "supportedCurrencies": {...}
  }
}
```

### GET /api/locale
Get current user's locale and currency preferences.

### POST /api/locale
Update user's locale and currency preferences.

**Request**:
```json
{
  "locale": "fr",
  "currency": "CAD"
}
```

### POST /process-payment
Process payment with localized preferences.

**Request**:
```json
{
  "payment_token": "PMT_xxx",
  "amount": 25.00,
  "currency": "EUR",
  "locale": "es"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_xxx",
    "amount": 25.00,
    "currency": "EUR",
    "status": "CAPTURED"
  },
  "message": "¡Pago Exitoso!"
}
```

## Testing

### Test Cards (All Currencies)

**Visa - Successful**:
- Number: `4263 9826 4026 9299`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)

**Visa - Declined**:
- Number: `4000120000001154`

**Mastercard - Successful**:
- Number: `5425 2334 2424 1200`

### Testing Scenarios

**Test 1: Automatic Locale Detection**
1. Set browser language to Spanish
2. Open application
3. Verify UI displays in Spanish
4. Verify default currency is EUR

**Test 2: Independent Language/Currency**
1. Select "English" language
2. Select "JPY" currency
3. Verify amount displays as "¥2,500" (no decimals)
4. Process payment
5. Verify success message in English

**Test 3: Session Persistence**
1. Select "Français" and "CAD"
2. Reload page (F5)
3. Verify French + CAD persisted
4. Close browser
5. Reopen within session timeout
6. Verify preferences still saved

**Test 4: Currency Formatting**
- USD: `$25.00` (symbol before, period decimal)
- EUR: `25,00 €` (symbol after, comma decimal)
- JPY: `¥2500` (no decimal places)

## Implementation Comparison

### Token Generation

All implementations use the SDK's `generateTransactionKey()` method for consistent, secure token generation:

**PHP**:
```php
$accessTokenInfo = GpApiService::generateTransactionKey($config);
$accessToken = $accessTokenInfo->accessToken;
```

**.NET**:
```csharp
var accessTokenInfo = GpApiService.GenerateTransactionKey(config);
var accessToken = accessTokenInfo.Token;
```

**Java**:
```java
var accessTokenInfo = GpApiService.generateTransactionKey(config);
String accessToken = accessTokenInfo.getAccessToken();
```

**Node.js**:
```javascript
const accessTokenInfo = await GpApiService.generateTransactionKey(config);
const accessToken = accessTokenInfo.accessToken;
```

This approach provides consistent behavior across all platforms with proper SDK integration.

### Session Management

| Platform | Technology | Default Timeout | Production Options |
|----------|-----------|-----------------|-------------------|
| .NET | ASP.NET Core Session | 24 hours | Redis, SQL Server |
| Node.js | express-session | 24 hours | Redis, MongoDB |
| Java | HttpSession | 30 minutes | Redis, Database |
| PHP | Native Sessions | 24 minutes | Redis, Memcached |

## Project Structure

```
localized-checkout-experience/
├── dotnet/                   # .NET Core implementation
│   ├── Services/            # LocaleService, CurrencyConfig, TranslationService
│   ├── translations/        # JSON translation files
│   ├── wwwroot/            # Frontend assets
│   └── Program.cs          # Main application
├── nodejs/                  # Node.js implementation
│   ├── services/           # Localization services
│   ├── translations/       # JSON translation files
│   └── server.js          # Express application
├── java/                   # Java implementation
│   └── src/main/
│       ├── java/          # Servlets and services
│       ├── resources/     # Translation files
│       └── webapp/        # Frontend assets
├── php/                    # PHP implementation
│   ├── services/          # Localization classes
│   ├── translations/      # JSON translation files
│   └── *.php             # Endpoints
└── README.md             # This file
```

## Adding New Languages

To add a new language (e.g., Italian):

1. **Create translation file**: `translations/it.json`
2. **Update LocaleService**: Add Italian to supported locales
3. **Update frontend translations**: Add Italian to `js/translations.js`
4. **Update HTML**: Add Italian option to language selector

See individual implementation READMEs for language-specific details.

## Adding New Currencies

To add a new currency (e.g., Swiss Franc):

1. **Update CurrencyConfig**: Add CHF with country code "CH"
2. **Update frontend formatter**: Add CHF to currency configurations
3. **Update HTML**: Add CHF option to currency selector
4. **Verify GP API support**: Ensure GP API supports country code

## Architecture Highlights

### Localization Services

All implementations include three core services:

**LocaleService**:
- Detects locale from Accept-Language header
- Manages session-based locale/currency storage
- Provides locale validation and fallbacks

**CurrencyConfig**:
- Defines currency metadata (symbol, decimals, country)
- Maps currencies to GP API country codes
- Provides currency validation

**TranslationService**:
- Loads translations from JSON files
- Provides key-based translation lookup
- Supports parameterized messages

### Session-Based Persistence

User preferences stored in server-side sessions:
- `locale` - Selected language code (e.g., "es")
- `currency` - Selected currency code (e.g., "EUR")

Benefits:
- Survives page reloads
- Works without client-side storage
- Supports multiple tabs/windows
- Configurable timeout periods

### Dynamic SDK Configuration

Each payment request reconfigures the SDK with currency-specific country code:

```javascript
// User selects EUR
const countryCode = CurrencyConfig.getCountryCode("EUR"); // Returns "GB"
config.country = countryCode;
ServicesContainer.configureService(config);
```

This ensures GP API routes payments to the correct regional endpoint.

## Security Considerations

All implementations follow security best practices:

- **No Card Data on Server**: Token-based payments only (PCI DSS compliant)
- **Environment Variables**: Credentials stored in `.env` files (not committed)
- **CORS Configuration**: Configurable cross-origin support
- **Input Validation**: Amount, currency, and locale validation
- **Error Handling**: Sanitized error messages (no sensitive data leaked)

### Production Enhancements

Add these for production deployments:

- **Rate Limiting**: Prevent brute force attacks on payment endpoints
- **CSRF Protection**: Implement anti-CSRF tokens
- **Security Headers**: Add Content-Security-Policy, X-Frame-Options, etc.
- **Logging**: Comprehensive request/response logging
- **HTTPS**: TLS required for payment processing
- **Session Store**: Use Redis/database instead of memory
- **Secrets Management**: Use vault services (AWS Secrets Manager, Azure Key Vault)

## Troubleshooting

### "ACTION_NOT_AUTHORIZED" Error (40004)

**Cause**: Invalid or incorrect GP API credentials

**Solution**:
1. Verify `.env` has correct `GP_API_APP_ID` and `GP_API_APP_KEY`
2. Ensure credentials are for GP API (not Portico/Heartland)
3. Check credentials at https://developer.globalpayments.com/
4. Verify environment is set to `sandbox` for test credentials

### Session Not Persisting

**Cause**: Session configuration or cookie issues

**Solution**:
1. Enable cookies in browser
2. Check session timeout configuration
3. For production, use persistent session store (Redis)
4. Verify session middleware is properly configured

### Currency Formatting Incorrect

**Cause**: Browser doesn't support Intl.NumberFormat

**Solution**:
1. Update browser to latest version
2. Check browser console for Intl errors
3. Verify locale codes are correct (e.g., "en" not "en-US")

## Resources

- [Global Payments Developer Portal](https://developer.globalpayments.com/)
- [GP API Documentation](https://developer.globalpayments.com/api/references-overview)
- [GP API Reference](https://developer.globalpayments.com/api/references-overview)
- [Test Cards](https://developer.globalpayments.com/resources/test-cards)
- [Accept-Language Header Spec](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language)
- [Intl.NumberFormat API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)

## Platform-Specific Documentation

For detailed implementation-specific information:

- [.NET Implementation Guide](./dotnet/README.md) - 546 lines
- [Node.js Implementation Guide](./nodejs/README.md) - 594 lines
- [Java Implementation Guide](./java/README.md) - 605 lines
- [PHP Implementation Guide](./php/README.md) - 409 lines

Each guide includes:
- Complete setup instructions
- API endpoint documentation
- Session management details
- Testing procedures
- Troubleshooting guides
- Security considerations

## License

MIT License - See LICENSE file for details
