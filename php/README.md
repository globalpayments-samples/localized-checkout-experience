# Localized Checkout Experience - PHP Implementation

GP API-based card payment processing with multi-currency and multi-language support using Global Payments PHP SDK.

## Features

- **Client-Side Tokenization**: Secure card data capture using GP API JavaScript SDK
- **Server-Side Payment Processing**: Token-based payment charging via GP API
- **Multi-Currency Support**: Process payments in USD, EUR, GBP, CAD, AUD, JPY
- **Multi-Language Support**: Interface available in English, Spanish, French, German, Portuguese
- **Independent Selection**: Currency and language can be chosen independently
- **Automatic Locale Detection**: Browser language detection with manual override
- **Currency Formatting**: Locale-aware number and currency formatting using Intl API
- **Session Persistence**: User preferences saved across sessions
- **Card Details Management**: Automatic extraction and return of card metadata
- **CORS Support**: Cross-origin request handling for frontend integration
- **Error Handling**: Comprehensive exception handling with localized error messages
- **Postal Code Validation**: Input sanitization for billing addresses

---

## Files

### Core Files
- `config.php` - Generates GP API access tokens with locale/currency information
- `process-payment.php` - Processes payments with localization support
- `get-locale.php` - API endpoint for locale and currency management
- `PaymentUtils.php` - Utility class for SDK configuration and payment operations
- `.env.sample` - Environment configuration template
- `index.html` - Frontend payment form with localization features

### Localization Services
- `services/LocaleService.php` - Locale detection, validation, and session management
- `services/CurrencyConfig.php` - Currency metadata and formatting rules
- `services/TranslationService.php` - Server-side translation handling

### Translation Files
- `translations/en.json` - English translations
- `translations/es.json` - Spanish translations
- `translations/fr.json` - French translations
- `translations/de.json` - German translations
- `translations/pt.json` - Portuguese translations

### Frontend JavaScript
- `js/translations.js` - Client-side i18n module
- `js/currency-formatter.js` - Currency formatting utilities

---

## API Endpoints

### GET /config.php
Generates GP API access token with locale/currency configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "PMT_...",
    "locale": "en",
    "currency": "USD",
    "supportedLocales": {
      "en": {"code": "en", "name": "English", "defaultCurrency": "USD"},
      "es": {"code": "es", "name": "Spanish", "defaultCurrency": "EUR"}
    },
    "supportedCurrencies": {
      "USD": {"code": "USD", "symbol": "$", "decimals": 2, "country": "US"},
      "EUR": {"code": "EUR", "symbol": "€", "decimals": 2, "country": "GB"}
    }
  }
}
```

### GET /get-locale.php
Retrieves current locale and currency settings with translations.

**Response:**
```json
{
  "success": true,
  "data": {
    "locale": "en",
    "currency": "USD",
    "supportedLocales": {...},
    "supportedCurrencies": {...},
    "translations": {
      "form.amount": "Amount",
      "button.process_payment": "Process Payment"
    }
  }
}
```

### POST /get-locale.php
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
    "translations": {
      "form.amount": "Monto",
      "button.process_payment": "Procesar Pago"
    }
  }
}
```

### POST /process-payment.php
Processes card payment with localization support.

**Request:**
```json
{
  "payment_token": "PMT_...",
  "amount": 25.00,
  "currency": "EUR",
  "locale": "es",
  "billing_zip": "12345",
  "cardDetails": {
    "cardType": "visa",
    "cardLast4": "9299",
    "expiryMonth": "12",
    "expiryYear": "2025",
    "cardholderName": "Test User"
  }
}
```

**Response:**
```json
{
  "success": true,
  "locale": "es",
  "message": "¡Pago Exitoso!",
  "data": {
    "transactionId": "TRN_...",
    "amount": 25.00,
    "currency": "EUR",
    "status": "captured",
    "paymentMethod": {
      "brand": "Visa",
      "last4": "9299",
      "expiryMonth": "12",
      "expiryYear": "2025"
    }
  }
}
```

---

## Requirements

- **PHP 7.4+** with extensions:
  - `json` - JSON encoding/decoding
  - `session` - Session management
  - `intl` (optional) - Enhanced locale support
- **Composer** - Dependency management
- **Global Payments PHP SDK** - Payment processing
- **Symfony Translation Component** - Localization
- **GP API Credentials** - Sandbox or production

---

## Setup

1. **Copy environment configuration**
   ```bash
   cp .env.sample .env
   ```

2. **Add GP API credentials to `.env`**
   ```env
   GP_API_APP_ID=your_app_id
   GP_API_APP_KEY=your_app_key
   ```

3. **Install dependencies**
   ```bash
   composer install
   ```
   This will install:
   - `globalpayments/php-sdk` - Global Payments SDK
   - `symfony/translation` - Translation framework
   - `vlucas/phpdotenv` - Environment configuration

4. **Configure web server**
   - Point document root to `php/` directory
   - Ensure PHP session support is enabled
   - Enable URL rewriting if needed

5. **Verify localization setup**
   ```bash
   # Check translation files exist
   ls translations/
   # Should show: en.json es.json fr.json de.json pt.json

   # Check services directory
   ls services/
   # Should show: LocaleService.php CurrencyConfig.php TranslationService.php
   ```

---

## Localization Configuration

### Supported Languages
- **English** (en) - Default currency: USD
- **Spanish** (es) - Default currency: EUR
- **French** (fr) - Default currency: EUR
- **German** (de) - Default currency: EUR
- **Portuguese** (pt) - Default currency: EUR

### Supported Currencies
- **USD** - US Dollar ($) - Country: US
- **EUR** - Euro (€) - Country: GB
- **GBP** - British Pound (£) - Country: GB
- **CAD** - Canadian Dollar (C$) - Country: CA
- **AUD** - Australian Dollar (A$) - Country: AU
- **JPY** - Japanese Yen (¥) - Country: JP

### How It Works

1. **Locale Detection**: System detects user language from `Accept-Language` header
2. **Currency Selection**: Users can choose any currency independently of language
3. **Session Persistence**: Preferences saved in PHP session
4. **Dynamic Configuration**: GP API country code automatically set based on currency
5. **Translation**: All messages (errors, success, forms) translated to selected language
6. **Formatting**: Currency amounts formatted according to locale rules (decimal separators, etc.)

---

## Usage Examples

### Basic Payment Flow (English/USD)
```javascript
// Frontend automatically detects English browser
// Default currency: USD
// User enters: 25.00
// Transaction processed in USD with US country code
```

### Spanish User with EUR
```javascript
// User selects Spanish (es) and Euro (EUR)
// Form labels appear in Spanish
// Amount input uses comma for decimal: "25,00"
// Transaction processed in EUR with GB country code
// Success message: "¡Pago Exitoso!"
```

### German User with USD
```javascript
// User selects German (de) but keeps USD
// Form labels appear in German
// Amount formatted as US: "25.00"
// Transaction processed in USD with US country code
// Demonstrates independent currency/language selection
```

---

## Adding New Languages

1. **Create translation file**
   ```bash
   cp translations/en.json translations/it.json
   ```

2. **Translate all strings in `it.json`**
   ```json
   {
     "form.amount": "Importo",
     "button.process_payment": "Elabora Pagamento",
     ...
   }
   ```

3. **Add locale to `LocaleService.php`**
   ```php
   private static $supportedLocales = [
       // ... existing locales
       'it' => [
           'code' => 'it',
           'name' => 'Italian',
           'nativeName' => 'Italiano',
           'flag' => '🇮🇹',
           'defaultCurrency' => 'EUR'
       ]
   ];
   ```

4. **Update frontend `translations.js`**
   ```javascript
   const translations = {
       // ... existing translations
       it: {
           "form.amount": "Importo",
           "button.process_payment": "Elabora Pagamento",
           ...
       }
   };
   ```

---

## Adding New Currencies

1. **Add currency to `CurrencyConfig.php`**
   ```php
   'CHF' => [
       'code' => 'CHF',
       'name' => 'Swiss Franc',
       'symbol' => 'CHF',
       'symbolPosition' => 'after',
       'decimals' => 2,
       'decimalSeparator' => '.',
       'thousandsSeparator' => ',',
       'country' => 'CH',
       'flag' => '🇨🇭'
   ]
   ```

2. **Update frontend `currency-formatter.js`**
   ```javascript
   const currencyConfig = {
       // ... existing currencies
       CHF: {
           code: 'CHF',
           symbol: 'CHF',
           decimals: 2,
           country: 'CH',
           flag: '🇨🇭'
       }
   };
   ```

3. **Verify GP API supports the currency** - Check with Global Payments that your merchant account supports the new currency

---

## Testing

### Manual Testing

1. **Test different languages**
   - Open browser console
   - Change `Accept-Language` header
   - Verify correct language detected

2. **Test different currencies**
   - Select each currency from dropdown
   - Verify symbol and formatting correct
   - Process test payment

3. **Test combinations**
   - English + EUR
   - Spanish + USD
   - French + GBP
   - Verify independence of selection

### Test Cards

Use Global Payments test cards:
- **Visa**: 4263 9826 4026 9299 (CVV: 123, Exp: 12/25)
- **Mastercard**: 5425 2334 2424 1200 (CVV: 123, Exp: 12/25)
- **Amex**: 374101000000608 (CVV: 1234, Exp: 12/25)

---

## Troubleshooting

### Translations not loading
**Symptom**: UI appears in English regardless of language selection

**Solution**: Check translation files exist and are valid JSON
```bash
php -r "json_decode(file_get_contents('translations/es.json'));"
```

### Currency not formatting correctly
**Symptom**: Amount shows wrong decimal separator or symbol

**Solution**: Verify currency config matches CurrencyConfig.php
```php
print_r(CurrencyConfig::getCurrency('EUR'));
```

### Session not persisting
**Symptom**: Locale/currency resets on page reload

**Solution**: Ensure sessions are enabled
```php
// Add to beginning of scripts
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
```

### GP API rejects transaction
**Symptom**: Payment fails with currency or country error

**Solution**: Verify country code mapping is correct
```
USD → US
EUR → GB (for GP API multi-currency)
GBP → GB
CAD → CA
AUD → AU
JPY → JP
```

---

## Additional Documentation

- [Global Payments API Documentation](https://developer.globalpayments.com/api/references-overview)
- [GP API Reference](https://developer.globalpayments.com/api/references-overview)
