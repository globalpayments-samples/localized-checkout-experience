# Localized Checkout Experience - Node.js Implementation

GP API-based card payment processing with multi-currency and multi-language support using Global Payments Node.js SDK.

## Features

- **Client-Side Tokenization**: Secure card data capture using GP API JavaScript SDK
- **Server-Side Payment Processing**: Token-based payment charging via GP API
- **Multi-Currency Support**: Process payments in USD, EUR, GBP, CAD, AUD, JPY
- **Multi-Language Support**: Interface available in English, Spanish, French, German, Portuguese
- **Independent Selection**: Currency and language can be chosen independently
- **Automatic Locale Detection**: Browser language detection with manual override
- **Currency Formatting**: Locale-aware number and currency formatting using Intl API
- **Session Persistence**: User preferences saved across sessions using express-session middleware
- **Card Details Management**: Automatic extraction and return of card metadata
- **CORS Support**: Cross-origin request handling for frontend integration
- **Error Handling**: Comprehensive exception handling with localized error messages
- **ES6 Modules**: Modern JavaScript module system with import/export syntax

## Requirements

- Node.js 14.x or later
- npm (Node Package Manager)
- Global Payments account and GP API credentials
- npm packages (auto-installed):
  - globalpayments-api (^3.10.6)
  - express (^4.18.2)
  - express-session (^1.17.3)
  - cors (^2.8.5)
  - dotenv (^16.3.1)

## Files

### Core Files
- `server.js` - Main Express application with API endpoints and SDK configuration
- `index.html` - Frontend payment form with localization features
- `.env.sample` - Environment configuration template
- `run.sh` - Convenience script to run the application
- `package.json` - Dependencies and scripts

### Localization Services
- `services/LocaleService.js` - Locale detection, validation, and session management
- `services/CurrencyConfig.js` - Currency metadata and formatting rules
- `services/TranslationService.js` - Server-side translation handling

### Translation Files
- `translations/en.json` - English translations
- `translations/es.json` - Spanish translations
- `translations/fr.json` - French translations
- `translations/de.json` - German translations
- `translations/pt.json` - Portuguese translations

### Frontend JavaScript
- `wwwroot/js/translations.js` - Client-side i18n module
- `wwwroot/js/currency-formatter.js` - Currency formatting utilities

## Setup

1. **Clone or navigate to this directory**

2. **Copy `.env.sample` to `.env`**:
   ```bash
   cp .env.sample .env
   ```

3. **Update `.env` with your GP API credentials**:
   ```env
   GP_API_APP_ID=your_gp_api_app_id_here
   GP_API_APP_KEY=your_gp_api_app_key_here
   GP_API_ENVIRONMENT=sandbox
   SESSION_SECRET=your_session_secret_key_here
   ```

   Get your credentials from: https://developer.globalpayments.com/

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Run the application**:
   ```bash
   ./run.sh
   ```
   Or manually:
   ```bash
   npm start
   ```

6. **Open in browser**:
   ```
   http://localhost:8000
   ```

## API Endpoints

### POST /config
Generates GP API access token with locale/currency configuration for client-side SDK initialization.

**Headers Required:**
- Accept-Language: (optional) Browser language for locale detection

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "PMT_...",
    "locale": "en",
    "currency": "USD",
    "supportedLocales": {
      "en": {"code": "en", "name": "English", "nativeName": "English", "defaultCurrency": "USD"},
      "es": {"code": "es", "name": "Spanish", "nativeName": "Español", "defaultCurrency": "EUR"},
      "fr": {"code": "fr", "name": "French", "nativeName": "Français", "defaultCurrency": "EUR"},
      "de": {"code": "de", "name": "German", "nativeName": "Deutsch", "defaultCurrency": "EUR"},
      "pt": {"code": "pt", "name": "Portuguese", "nativeName": "Português", "defaultCurrency": "EUR"}
    },
    "supportedCurrencies": {
      "USD": {"code": "USD", "symbol": "$", "decimals": 2, "country": "US"},
      "EUR": {"code": "EUR", "symbol": "€", "decimals": 2, "country": "GB"},
      "GBP": {"code": "GBP", "symbol": "£", "decimals": 2, "country": "GB"},
      "CAD": {"code": "CAD", "symbol": "C$", "decimals": 2, "country": "CA"},
      "AUD": {"code": "AUD", "symbol": "A$", "decimals": 2, "country": "AU"},
      "JPY": {"code": "JPY", "symbol": "¥", "decimals": 0, "country": "JP"}
    }
  },
  "message": "Configuration retrieved successfully",
  "timestamp": "2025-11-25T..."
}
```

### GET /api/locale
Retrieves current user's locale and currency settings with translations.

**Response:**
```json
{
  "success": true,
  "data": {
    "locale": "en",
    "currency": "USD",
    "translations": {
      "form.amount": "Amount",
      "button.process_payment": "Process Payment",
      "message.success": "Payment Successful!"
    },
    "supportedLocales": {...},
    "supportedCurrencies": {...}
  },
  "timestamp": "2025-11-25T..."
}
```

### POST /api/locale
Updates user locale and currency preferences.

**Request:**
```json
{
  "locale": "es",
  "currency": "EUR"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "locale": "es",
    "currency": "EUR",
    "translations": {...}
  },
  "message": "Locale preferences updated",
  "timestamp": "2025-11-25T..."
}
```

### POST /process-payment
Processes a payment with the provided token and localized preferences.

**Request:**
```json
{
  "payment_token": "PMT_xxx",
  "amount": 25.00,
  "currency": "EUR",
  "locale": "es"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "transactionId": "txn_xxx",
    "amount": 25.00,
    "currency": "EUR",
    "status": "CAPTURED",
    "reference": "ref_xxx",
    "timestamp": "2025-11-25T..."
  },
  "message": "¡Pago Exitoso!",
  "timestamp": "2025-11-25T..."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Pago fallido: Fondos insuficientes",
  "error_code": "API_ERROR",
  "timestamp": "2025-11-25T..."
}
```

## Localization Configuration

### Supported Languages
- **en** (English) - Default currency: USD
- **es** (Spanish/Español) - Default currency: EUR
- **fr** (French/Français) - Default currency: EUR
- **de** (German/Deutsch) - Default currency: EUR
- **pt** (Portuguese/Português) - Default currency: EUR

### Supported Currencies
- **USD** (US Dollar) - Symbol: $, Decimals: 2, Country: US
- **EUR** (Euro) - Symbol: €, Decimals: 2, Country: GB
- **GBP** (British Pound) - Symbol: £, Decimals: 2, Country: GB
- **CAD** (Canadian Dollar) - Symbol: C$, Decimals: 2, Country: CA
- **AUD** (Australian Dollar) - Symbol: A$, Decimals: 2, Country: AU
- **JPY** (Japanese Yen) - Symbol: ¥, Decimals: 0, Country: JP

### Locale Detection Priority
1. Session storage (if user previously selected)
2. Accept-Language HTTP header (browser preference)
3. Default: English (en)

### Currency Detection Priority
1. Session storage (if user previously selected)
2. Default currency for detected locale
3. Default: USD

## How It Works

### 1. Initial Page Load
```
Browser → POST /config → Server generates GP API token
                       → Detects locale from Accept-Language header
                       → Returns token + locale/currency + translations
Frontend → Initializes GP API SDK with token
        → Sets UI language based on locale
        → Formats currency based on currency code
```

### 2. Language/Currency Change
```
User selects language → POST /api/locale with new preferences
                      → Server updates express-session
                      → Returns new translations
Frontend → Updates UI with new language
```

### 3. Payment Processing
```
User enters card → GP API SDK tokenizes (client-side)
                 → Returns payment_token
Frontend → POST /process-payment with token + amount + currency + locale
Server → Reconfigures SDK with dynamic country code based on currency
      → Processes payment
      → Returns localized success/error message
```

## Session Management

This implementation uses express-session middleware to persist user preferences:

**Configuration** (in `server.js`):
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET || 'gp-api-localization-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
```

**Session Data Stored:**
- `locale` - User's selected language code
- `currency` - User's selected currency code

**Persistence:**
- 24-hour timeout
- Memory-based session storage (default)
- Secure cookies in production (HTTPS required)
- Cookie survives browser restart

**Production Considerations:**
- Use persistent session store (Redis, MongoDB) instead of memory store
- Enable `secure: true` with HTTPS
- Consider `httpOnly` and `sameSite` cookie options

## Token Generation Approach

Node.js implementation uses the **SDK's `generateTransactionKey()` method** for secure token generation:

```javascript
import { GpApiConfig, GpApiService, Channel, Environment } from 'globalpayments-api';

// Configure GP API for token generation
const config = new GpApiConfig();
config.appId = process.env.GP_API_APP_ID || '';
config.appKey = process.env.GP_API_APP_KEY || '';
config.environment = Environment.TEST;
config.channel = Channel.CardNotPresent;
config.country = 'US';
config.permissions = ['PMT_POST_Create_Single'];
config.secondsToExpire = 600;

// Generate access token using SDK
const accessTokenInfo = await GpApiService.generateTransactionKey(config);
const accessToken = accessTokenInfo.accessToken;
```

**Benefits of SDK Approach:**
- Consistent behavior with other SDK implementations
- Proper error handling built into SDK
- Automatic nonce and secret generation
- Matches PHP, .NET, and Java implementations

## Usage Examples

### Example 1: English with USD
1. User opens page → Detects English browser → Shows English UI with USD currency
2. Enters test card `4263 9826 4026 9299`
3. Clicks "Process Payment"
4. Receives: "Payment Successful! Transaction ID: txn_xxx"

### Example 2: Spanish with EUR
1. User selects "Español" from language dropdown
2. UI updates to Spanish
3. User selects "EUR" from currency dropdown
4. Amount shows as "25,00 €" (European formatting)
5. Enters test card
6. Clicks "Procesar Pago"
7. Receives: "¡Pago Exitoso! ID de transacción: txn_xxx"

### Example 3: English with JPY (Different Locale and Currency)
1. User selects "English" language
2. User selects "JPY" currency
3. Amount shows as "¥2,500" (no decimals for JPY)
4. Processes payment
5. GP API routes to Japan (JP country code)

## Adding New Languages

1. **Create translation file**:
   ```bash
   cp translations/en.json translations/it.json
   ```

2. **Translate all keys** in `translations/it.json`:
   ```json
   {
     "form.amount": "Importo",
     "button.process_payment": "Elabora Pagamento",
     "message.success": "Pagamento Riuscito!"
   }
   ```

3. **Update services/LocaleService.js** - Add to supported locales:
   ```javascript
   const SUPPORTED_LOCALES = {
       // ... existing locales
       it: {
           code: 'it',
           name: 'Italian',
           nativeName: 'Italiano',
           defaultCurrency: 'EUR'
       }
   };
   ```

4. **Update frontend** `wwwroot/js/translations.js`:
   ```javascript
   const translations = {
       // ... existing
       it: { /* Italian translations */ }
   };
   ```

5. **Update HTML** language selector in `index.html`:
   ```html
   <option value="it">🇮🇹 Italiano</option>
   ```

## Adding New Currencies

1. **Update services/CurrencyConfig.js**:
   ```javascript
   const SUPPORTED_CURRENCIES = {
       // ... existing
       CHF: {
           code: 'CHF',
           symbol: 'CHF',
           decimals: 2,
           country: 'CH'
       }
   };
   ```

2. **Update frontend** `wwwroot/js/currency-formatter.js`:
   ```javascript
   const currencies = {
       // ... existing
       CHF: { code: 'CHF', symbol: 'CHF', decimals: 2, country: 'CH' }
   };
   ```

3. **Update HTML** currency selector:
   ```html
   <option value="CHF">🇨🇭 CHF - Swiss Franc (CHF)</option>
   ```

4. **Verify GP API support** for the country code

## Testing

### Test Cards (All Currencies)
Use these test cards for different scenarios:

**Visa - Successful**:
- Card Number: `4263 9826 4026 9299`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)

**Visa - Declined (Insufficient Funds)**:
- Card Number: `4000120000001154`

**Mastercard - Successful**:
- Card Number: `5425 2334 2424 1200`

### Testing Different Locales
1. Change browser language to Spanish (es)
2. Reload page
3. Verify UI is in Spanish
4. Verify default currency is EUR

### Testing Session Persistence
1. Select language: French, currency: CAD
2. Reload page (F5)
3. Verify French + CAD are still selected
4. Close tab, reopen within 24 hours
5. Verify preferences persisted

### Testing Currency Formatting
- USD: `$25.00` (before, period decimal)
- EUR: `25,00 €` (after, comma decimal)
- JPY: `¥2500` (no decimals)

### Manual API Testing
```bash
# Get config
curl -X POST http://localhost:8000/config \
  -H "Accept-Language: es-ES,es;q=0.9"

# Process payment
curl -X POST http://localhost:8000/process-payment \
  -H "Content-Type: application/json" \
  -d '{
    "payment_token": "PMT_xxx",
    "amount": 25.00,
    "currency": "EUR",
    "locale": "es"
  }'
```

## Troubleshooting

### Issue: "Error loading configuration: Failed to generate access token"

**Cause**: Invalid GP API credentials

**Solution**:
1. Verify `.env` file exists and has correct variables:
   ```env
   GP_API_APP_ID=your_actual_app_id
   GP_API_APP_KEY=your_actual_app_key
   ```
2. Verify credentials are for GP API (not Portico/Heartland)
3. Check credentials at https://developer.globalpayments.com/

### Issue: "ACTION_NOT_AUTHORIZED" error (40004)

**Cause**: Credentials not recognized by GP API

**Solution**:
- Ensure you're using GP API credentials (not Heartland/Portico)
- Verify APP_ID and APP_KEY are correct
- Check environment is set to `sandbox` for test credentials

### Issue: Session not persisting

**Cause**: Session configuration issue or memory store limitations

**Solution**:
1. Verify express-session middleware is configured in `server.js`
2. Check browser console for cookie errors
3. Enable cookies in browser
4. For production, use persistent session store (Redis/MongoDB):
   ```javascript
   import RedisStore from 'connect-redis';
   import { createClient } from 'redis';

   const redisClient = createClient();
   redisClient.connect().catch(console.error);

   app.use(session({
       store: new RedisStore({ client: redisClient }),
       secret: process.env.SESSION_SECRET,
       resave: false,
       saveUninitialized: false
   }));
   ```

### Issue: Currency formatting incorrect

**Cause**: Browser doesn't support Intl.NumberFormat or incorrect locale

**Solution**:
1. Update browser to latest version
2. Check browser console for Intl errors
3. Verify locale code is correct (e.g., `en`, not `en-US`)

### Issue: Translations not loading

**Cause**: Translation file missing or malformed JSON

**Solution**:
1. Verify translation file exists: `translations/{locale}.json`
2. Validate JSON syntax (use JSON validator)
3. Check browser console for JSON parsing errors
4. Ensure translation keys match frontend expectations

### Issue: ES6 module errors

**Cause**: Missing `"type": "module"` in package.json

**Solution**:
1. Verify `package.json` contains:
   ```json
   {
     "type": "module"
   }
   ```
2. Use `.js` extension for all imports
3. Use `import` instead of `require()`

## Security Considerations

This is a demonstration implementation. For production use, add:

- **Input Validation**: Validate all user inputs (amount, currency codes, locale codes)
- **Rate Limiting**: Prevent brute force attacks on payment endpoint
- **CSRF Protection**: Implement CSRF tokens for state-changing operations
- **Security Headers**: Add helmet middleware for security headers
  ```javascript
  import helmet from 'helmet';
  app.use(helmet());
  ```
- **Logging**: Implement comprehensive request/response logging
- **PCI Compliance**: Ensure no card data touches your server (token-based only)
- **HTTPS**: Use TLS in production (required for payment processing)
- **Environment Variables**: Use secure secrets management (AWS Secrets Manager, Azure Key Vault)
- **Session Store**: Use Redis or database-backed sessions (not memory store)
- **CORS**: Configure CORS properly for production domains

## Links

- [Global Payments Developer Portal](https://developer.globalpayments.com/)
- [GP API Documentation](https://developer.globalpayments.com/api/references-overview)
- [Node.js SDK Documentation](https://github.com/globalpayments/node-sdk)
- [GP API Reference](https://developer.globalpayments.com/api/references-overview)
- [Express.js Documentation](https://expressjs.com/)
- [express-session Documentation](https://github.com/expressjs/session)

## License

MIT License - See LICENSE file for details
