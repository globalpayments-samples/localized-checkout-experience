# Localized Checkout Experience - Java Implementation

GP API-based card payment processing with multi-currency and multi-language support using Global Payments Java SDK.

## Features

- **Client-Side Tokenization**: Secure card data capture using GP API JavaScript SDK
- **Server-Side Payment Processing**: Token-based payment charging via GP API
- **Multi-Currency Support**: Process payments in USD, EUR, GBP, CAD, AUD, JPY
- **Multi-Language Support**: Interface available in English, Spanish, French, German, Portuguese
- **Independent Selection**: Currency and language can be chosen independently
- **Automatic Locale Detection**: Browser language detection with manual override
- **Currency Formatting**: Locale-aware number and currency formatting using Intl API
- **Session Persistence**: User preferences saved across sessions using HttpSession
- **Card Details Management**: Automatic extraction and return of card metadata
- **CORS Support**: Cross-origin request handling for frontend integration
- **Error Handling**: Comprehensive exception handling with localized error messages
- **Jakarta EE Servlets**: Modern servlet-based architecture with annotations

## Requirements

- Java 11 or later (tested with Java 23)
- Maven 3.6 or later
- Global Payments account and GP API credentials
- Dependencies (auto-installed via Maven):
  - globalpayments-sdk (14.2.20)
  - jakarta.servlet-api (5.0.0)
  - dotenv-java (3.0.0)
  - gson (2.10.1)

## Files

### Core Files
- `src/main/java/com/globalpayments/example/ProcessPaymentServlet.java` - Main servlet with API endpoints and SDK configuration
- `src/main/java/com/globalpayments/example/LocaleServlet.java` - Locale preference management servlet
- `src/main/webapp/index.html` - Frontend payment form with localization features
- `src/main/webapp/WEB-INF/web.xml` - Web application configuration
- `.env.sample` - Environment configuration template
- `pom.xml` - Maven dependencies and build configuration
- `run.sh` - Convenience script to run the application

### Localization Services
- `src/main/java/com/globalpayments/example/services/LocaleService.java` - Locale detection, validation, and session management
- `src/main/java/com/globalpayments/example/services/CurrencyConfig.java` - Currency metadata and formatting rules
- `src/main/java/com/globalpayments/example/services/TranslationService.java` - Server-side translation handling

### Translation Files
- `src/main/resources/translations/en.json` - English translations
- `src/main/resources/translations/es.json` - Spanish translations
- `src/main/resources/translations/fr.json` - French translations
- `src/main/resources/translations/de.json` - German translations
- `src/main/resources/translations/pt.json` - Portuguese translations

### Frontend JavaScript
- `src/main/webapp/js/translations.js` - Client-side i18n module
- `src/main/webapp/js/currency-formatter.js` - Currency formatting utilities

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
   ```

   Get your credentials from: https://developer.globalpay.com/

4. **Install dependencies**:
   ```bash
   mvn clean install
   ```

5. **Run the application**:
   ```bash
   ./run.sh
   ```
   Or manually:
   ```bash
   mvn cargo:run
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
                      → Server updates HttpSession
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

This implementation uses Jakarta EE HttpSession to persist user preferences:

**Configuration** (in `ProcessPaymentServlet.java`):
```java
HttpSession session = request.getSession(true);
session.setAttribute("locale", locale);
session.setAttribute("currency", currency);
```

**Session Data Stored:**
- `locale` - User's selected language code
- `currency` - User's selected currency code

**Persistence:**
- Session timeout configured in `web.xml` (default: 30 minutes)
- Memory-based session storage (servlet container default)
- Session survives browser restart (via JSESSIONID cookie)

**Production Considerations:**
- Configure persistent session store (Redis, database) in servlet container
- Set appropriate session timeout in `web.xml`:
  ```xml
  <session-config>
      <session-timeout>1440</session-timeout> <!-- 24 hours -->
  </session-config>
  ```
- Configure secure cookies in production
- Use session clustering for multi-server deployments

## Token Generation Approach

Java implementation uses **manual HTTP token generation** instead of SDK abstraction:

```java
// Generate nonce and secret
String nonce = generateNonce(); // 16 random bytes
String secret = hashSecret(nonce, appKey); // SHA-512 hash

// Build token request JSON
JSONObject tokenRequest = new JSONObject();
tokenRequest.put("app_id", appId);
tokenRequest.put("nonce", nonce);
tokenRequest.put("secret", secret);
tokenRequest.put("grant_type", "client_credentials");
tokenRequest.put("seconds_to_expire", 600);
tokenRequest.put("permissions", new String[]{"PMT_POST_Create_Single"});

// Manual HTTP POST to GP API
URL url = new URL("https://apis.sandbox.globalpay.com/ucp/accesstoken");
HttpURLConnection conn = (HttpURLConnection) url.openConnection();
conn.setRequestMethod("POST");
conn.setRequestProperty("Content-Type", "application/json");
conn.setRequestProperty("X-GP-Version", "2021-03-22");
```

**Why Manual Approach?**
- Direct control over token generation parameters
- Explicit nonce and secret handling
- Consistent with .NET and Node.js implementations
- Alternative: PHP SDK has `generateTransactionKey()` method

## Servlet Configuration

This implementation uses Jakarta EE servlet annotations:

```java
@WebServlet(urlPatterns = {"/process-payment", "/config"})
public class ProcessPaymentServlet extends HttpServlet {
    // Servlet handles multiple endpoints
}
```

**Benefits:**
- No explicit `web.xml` servlet mapping needed
- Clean annotation-based configuration
- Modern Jakarta EE approach
- Easy to add new endpoints

## Usage Examples

### Example 1: English with USD
1. User opens page → Detects English browser → Shows English UI with USD currency
2. Enters test card `4263970000005262`
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
   cp src/main/resources/translations/en.json src/main/resources/translations/it.json
   ```

2. **Translate all keys** in `it.json`:
   ```json
   {
     "form.amount": "Importo",
     "button.process_payment": "Elabora Pagamento",
     "message.success": "Pagamento Riuscito!"
   }
   ```

3. **Update LocaleService.java** - Add to supported locales:
   ```java
   private static final Map<String, LocaleInfo> SUPPORTED_LOCALES = Map.of(
       // ... existing locales
       "it", new LocaleInfo("it", "Italian", "Italiano", "EUR")
   );
   ```

4. **Update frontend** `src/main/webapp/js/translations.js`:
   ```javascript
   const translations = {
       // ... existing
       it: { /* Italian translations */ }
   };
   ```

5. **Update HTML** language selector in `src/main/webapp/index.html`:
   ```html
   <option value="it">🇮🇹 Italiano</option>
   ```

## Adding New Currencies

1. **Update CurrencyConfig.java**:
   ```java
   private static final Map<String, CurrencyInfo> SUPPORTED_CURRENCIES = Map.of(
       // ... existing
       "CHF", new CurrencyInfo("CHF", "CHF", 2, "CH")
   );
   ```

2. **Update frontend** `src/main/webapp/js/currency-formatter.js`:
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
- Card Number: `4263970000005262`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)

**Visa - Declined (Insufficient Funds)**:
- Card Number: `4000120000001154`

**Mastercard - Successful**:
- Card Number: `5425230000004415`

### Testing Different Locales
1. Change browser language to Spanish (es)
2. Reload page
3. Verify UI is in Spanish
4. Verify default currency is EUR

### Testing Session Persistence
1. Select language: French, currency: CAD
2. Reload page (F5)
3. Verify French + CAD are still selected
4. Close tab, reopen within session timeout
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
3. Check credentials at https://developer.globalpay.com/

### Issue: "ACTION_NOT_AUTHORIZED" error (40004)

**Cause**: Credentials not recognized by GP API

**Solution**:
- Ensure you're using GP API credentials (not Heartland/Portico)
- Verify APP_ID and APP_KEY are correct
- Check environment is set to `sandbox` for test credentials

### Issue: Session not persisting

**Cause**: Session configuration issue or timeout

**Solution**:
1. Verify session timeout in `web.xml`:
   ```xml
   <session-config>
       <session-timeout>30</session-timeout>
   </session-config>
   ```
2. Check browser cookies are enabled
3. Clear browser cache and cookies
4. Verify JSESSIONID cookie is being set

### Issue: Currency formatting incorrect

**Cause**: Browser doesn't support Intl.NumberFormat or incorrect locale

**Solution**:
1. Update browser to latest version
2. Check browser console for Intl errors
3. Verify locale code is correct (e.g., `en`, not `en-US`)

### Issue: Translations not loading

**Cause**: Translation file missing or malformed JSON

**Solution**:
1. Verify translation file exists: `src/main/resources/translations/{locale}.json`
2. Validate JSON syntax (use JSON validator)
3. Check browser console for JSON parsing errors
4. Ensure translation keys match frontend expectations

### Issue: Maven build failures

**Cause**: Dependency issues or Java version mismatch

**Solution**:
1. Clean and rebuild:
   ```bash
   mvn clean install -U
   ```
2. Verify Java version:
   ```bash
   java -version  # Should be 11 or later
   ```
3. Check Maven version:
   ```bash
   mvn -version  # Should be 3.6 or later
   ```

### Issue: Port 8000 already in use

**Cause**: Another application using port 8000

**Solution**:
1. Stop other application using port 8000
2. Or change port in `pom.xml`:
   ```xml
   <cargo.servlet.port>8080</cargo.servlet.port>
   ```

## Security Considerations

This is a demonstration implementation. For production use, add:

- **Input Validation**: Validate all user inputs (amount, currency codes, locale codes)
- **Rate Limiting**: Prevent brute force attacks on payment endpoint
- **CSRF Protection**: Implement CSRF tokens for state-changing operations
- **Security Headers**: Add security headers via servlet filters
  ```java
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'self'");
  ```
- **Logging**: Implement comprehensive request/response logging with SLF4J/Logback
- **PCI Compliance**: Ensure no card data touches your server (token-based only)
- **HTTPS**: Use TLS in production (required for payment processing)
- **Environment Variables**: Use secure secrets management (AWS Secrets Manager, Azure Key Vault)
- **Session Security**: Configure secure, HTTP-only cookies in production
- **CORS**: Configure CORS properly for production domains

## Links

- [Global Payments Developer Portal](https://developer.globalpay.com/)
- [GP API Documentation](https://developer.globalpay.com/api)
- [Java SDK Documentation](https://github.com/globalpayments/java-sdk)
- [GP API JavaScript SDK](https://developer.globalpay.com/sdks/javascript)
- [Jakarta EE Documentation](https://jakarta.ee/)
- [Apache Maven Documentation](https://maven.apache.org/)

## License

MIT License - See LICENSE file for details
