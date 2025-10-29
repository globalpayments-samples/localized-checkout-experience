# Localization Implementation Guide

This guide provides comprehensive instructions for implementing multi-currency and multi-language support across all platform implementations (PHP, Node.js, Java, .NET).

## Overview

The localization system supports:
- **5 Languages**: English (en), Spanish (es), French (fr), German (de), Portuguese (pt)
- **6 Currencies**: USD, EUR, GBP, CAD, AUD, JPY
- **Independent Selection**: Language and currency are independently selectable
- **Automatic Detection**: Browser language detection with manual override
- **Persistent Preferences**: User selections saved in session/localStorage

---

## Architecture

### Backend Components

1. **Locale Service**: Manages language detection, validation, and session storage
2. **Currency Config**: Defines currency metadata (symbol, decimals, formatting)
3. **Translation Service**: Handles server-side translations using translation files
4. **Dynamic SDK Configuration**: Configures GP API with appropriate country codes

### Frontend Components

1. **Translation Module**: Client-side i18n using JavaScript translation objects
2. **Currency Formatter**: Intl.NumberFormat-based currency formatting
3. **Locale/Currency Selectors**: Dropdown UI components for user selection
4. **Preference Persistence**: localStorage for client-side state management

---

## PHP Implementation (Reference)

### Directory Structure

```
php/
├── services/
│   ├── LocaleService.php      # Locale management
│   ├── CurrencyConfig.php     # Currency definitions
│   └── TranslationService.php # Translation handling
├── translations/
│   ├── en.json               # English translations
│   ├── es.json               # Spanish translations
│   ├── fr.json               # French translations
│   ├── de.json               # German translations
│   └── pt.json               # Portuguese translations
├── js/
│   ├── translations.js       # Frontend translations
│   └── currency-formatter.js # Currency formatting
├── config.php                # SDK configuration endpoint
├── process-payment.php       # Payment processing
├── get-locale.php            # Locale API endpoint
└── index.html                # Frontend UI
```

### Backend Setup

#### 1. Install Dependencies

```bash
composer require symfony/translation
```

#### 2. Locale Service Implementation

```php
<?php
namespace Services;

class LocaleService
{
    private static $supportedLocales = [
        'en' => ['code' => 'en', 'name' => 'English', 'defaultCurrency' => 'USD'],
        'es' => ['code' => 'es', 'name' => 'Spanish', 'defaultCurrency' => 'EUR'],
        'fr' => ['code' => 'fr', 'name' => 'French', 'defaultCurrency' => 'EUR'],
        'de' => ['code' => 'de', 'name' => 'German', 'defaultCurrency' => 'EUR'],
        'pt' => ['code' => 'pt', 'name' => 'Portuguese', 'defaultCurrency' => 'EUR']
    ];

    public static function getCurrentLocale(): string
    {
        // Priority: Session > Accept-Language > Default (en)
        $sessionLocale = $_SESSION['locale'] ?? null;
        if ($sessionLocale) return $sessionLocale;

        $acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? null;
        return self::detectLocale($acceptLanguage);
    }

    public static function detectLocale(?string $acceptLanguage): string
    {
        if (!$acceptLanguage) return 'en';

        // Parse Accept-Language header
        $languages = [];
        foreach (explode(',', $acceptLanguage) as $part) {
            $langParts = explode(';', trim($part));
            $lang = strtolower(substr($langParts[0], 0, 2));
            $quality = 1.0;
            if (isset($langParts[1]) && strpos($langParts[1], 'q=') === 0) {
                $quality = floatval(substr($langParts[1], 2));
            }
            $languages[$lang] = $quality;
        }

        arsort($languages);
        foreach (array_keys($languages) as $lang) {
            if (isset(self::$supportedLocales[$lang])) {
                return $lang;
            }
        }

        return 'en';
    }
}
```

#### 3. Currency Configuration

```php
<?php
namespace Services;

class CurrencyConfig
{
    private static $currencies = [
        'USD' => [
            'code' => 'USD',
            'symbol' => '$',
            'decimals' => 2,
            'country' => 'US'
        ],
        'EUR' => [
            'code' => 'EUR',
            'symbol' => '€',
            'decimals' => 2,
            'country' => 'GB'  // GP API uses GB for EUR
        ],
        // ... other currencies
    ];

    public static function getCountryCode(string $currencyCode): string
    {
        return self::$currencies[$currencyCode]['country'] ?? 'US';
    }

    public static function formatAmount(float $amount, string $currencyCode): string
    {
        $currency = self::$currencies[$currencyCode];
        $formatted = number_format(
            $amount,
            $currency['decimals'],
            $currency['decimalSeparator'],
            $currency['thousandsSeparator']
        );

        return $currency['symbolPosition'] === 'before'
            ? $currency['symbol'] . $formatted
            : $formatted . ' ' . $currency['symbol'];
    }
}
```

#### 4. Translation Service

```php
<?php
namespace Services;

use Symfony\Component\Translation\Translator;
use Symfony\Component\Translation\Loader\JsonFileLoader;

class TranslationService
{
    private static $translator = null;

    private static function getTranslator(string $locale = 'en'): Translator
    {
        if (self::$translator === null) {
            self::$translator = new Translator($locale);
            self::$translator->addLoader('json', new JsonFileLoader());

            foreach (['en', 'es', 'fr', 'de', 'pt'] as $loc) {
                $filePath = __DIR__ . "/../translations/{$loc}.json";
                if (file_exists($filePath)) {
                    self::$translator->addResource('json', $filePath, $loc);
                }
            }
        }
        return self::$translator;
    }

    public static function t(string $key, array $params = [], ?string $locale = null): string
    {
        if ($locale === null) {
            $locale = LocaleService::getCurrentLocale();
        }
        $translator = self::getTranslator($locale);
        return $translator->trans($key, $params);
    }
}
```

#### 5. Payment Processing with Localization

```php
<?php
// process-payment.php

require_once 'services/LocaleService.php';
require_once 'services/CurrencyConfig.php';
require_once 'services/TranslationService.php';

use Services\LocaleService;
use Services\CurrencyConfig;
use Services\TranslationService;

// Get locale and currency from request
$inputData = json_decode(file_get_contents('php://input'), true);
$locale = $inputData['locale'] ?? null;
$currency = $inputData['currency'] ?? null;

// Update session preferences
if ($locale) LocaleService::setSessionLocale($locale);
if ($currency) LocaleService::setSessionCurrency($currency);

// Get current values with fallbacks
$currentLocale = LocaleService::getCurrentLocale();
$currentCurrency = CurrencyConfig::validateCurrency($currency);
$countryCode = CurrencyConfig::getCountryCode($currentCurrency);

// Configure SDK with dynamic country
PaymentUtils::configureSdk($countryCode);

// Process payment with localized messages
try {
    $result = PaymentUtils::processPaymentWithToken(
        $inputData['payment_token'],
        $amount,
        $currentCurrency,
        $inputData,
        $countryCode
    );

    $successMessage = TranslationService::t('message.success', [], $currentLocale);
    PaymentUtils::sendSuccessResponse($result, $successMessage, $currentLocale);
} catch (Exception $e) {
    $errorMessage = TranslationService::t('error.payment_failed',
        ['%message%' => $e->getMessage()], $currentLocale);
    PaymentUtils::sendErrorResponse(400, $errorMessage, 'API_ERROR');
}
```

### Frontend Setup

#### 1. Translation Module (JavaScript)

```javascript
// js/translations.js

const translations = {
  en: {
    "form.amount": "Amount",
    "button.process_payment": "Process Payment",
    "error.invalid_amount": "Please enter a valid amount.",
    // ... more translations
  },
  es: {
    "form.amount": "Monto",
    "button.process_payment": "Procesar Pago",
    "error.invalid_amount": "Por favor ingrese un monto válido.",
    // ... more translations
  }
  // ... other languages
};

let currentLocale = 'en';

function t(key, params = {}) {
  let text = translations[currentLocale]?.[key] || translations.en[key] || key;
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
  });
  return text;
}

function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale;
    localStorage.setItem('locale', locale);
    updateUITranslations();
    return true;
  }
  return false;
}
```

#### 2. Currency Formatter (JavaScript)

```javascript
// js/currency-formatter.js

const currencyConfig = {
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  // ... other currencies
};

let currentCurrency = 'USD';

function formatCurrency(amount, currency = currentCurrency, locale = 'en') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currencyConfig[currency].decimals,
    maximumFractionDigits: currencyConfig[currency].decimals
  }).format(amount);
}

function setCurrency(currency) {
  if (currencyConfig[currency]) {
    currentCurrency = currency;
    localStorage.setItem('currency', currency);
    updateCurrencyUI();
    return true;
  }
  return false;
}
```

#### 3. HTML Integration

```html
<!DOCTYPE html>
<html lang="en" id="html-root">
<head>
    <meta charset="UTF-8">
    <title data-i18n="page.title">Global Payments - Localized Checkout</title>
</head>
<body>
    <!-- Language Selector -->
    <select id="language-selector" onchange="handleLanguageChange(this.value)">
        <option value="en">🇺🇸 English</option>
        <option value="es">🇪🇸 Español</option>
        <option value="fr">🇫🇷 Français</option>
        <option value="de">🇩🇪 Deutsch</option>
        <option value="pt">🇵🇹 Português</option>
    </select>

    <!-- Currency Selector -->
    <select id="currency-selector" onchange="handleCurrencyChange(this.value)">
        <option value="USD">🇺🇸 USD - US Dollar</option>
        <option value="EUR">🇪🇺 EUR - Euro</option>
        <option value="GBP">🇬🇧 GBP - British Pound</option>
        <option value="CAD">🇨🇦 CAD - Canadian Dollar</option>
        <option value="AUD">🇦🇺 AUD - Australian Dollar</option>
        <option value="JPY">🇯🇵 JPY - Japanese Yen</option>
    </select>

    <!-- Payment Form -->
    <form id="payment-form">
        <label for="amount" data-i18n="form.amount">Amount</label>
        <input type="number" id="amount" required>

        <button type="submit" data-i18n="button.process_payment">
            Process Payment
        </button>
    </form>

    <script src="js/translations.js"></script>
    <script src="js/currency-formatter.js"></script>
    <script src="https://js.globalpay.com/4.1.11/globalpayments.js"></script>
    <script>
        // Initialize localization
        initLocale();
        initCurrency();

        // Update UI on page load
        updateUITranslations();
        document.getElementById('language-selector').value = getLocale();
        document.getElementById('currency-selector').value = getCurrency();

        // Handle language change
        function handleLanguageChange(locale) {
            setLocale(locale);
            document.getElementById('html-root').setAttribute('lang', locale);
        }

        // Handle currency change
        function handleCurrencyChange(currency) {
            setCurrency(currency);
        }

        // Update all translatable UI elements
        function updateUITranslations() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = t(key);
            });
        }

        // Payment form submission
        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const amount = document.getElementById('amount').value;
            const locale = getLocale();
            const currency = getCurrency();

            try {
                const response = await fetch('/process-payment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        payment_token: paymentToken,
                        amount: amount,
                        currency: currency,
                        locale: locale,
                        billing_zip: billingZip
                    })
                });

                const result = await response.json();

                if (result.success) {
                    alert(t('message.success'));
                } else {
                    alert(t('error.payment_failed', { message: result.message }));
                }
            } catch (error) {
                alert(t('error.network'));
            }
        });
    </script>
</body>
</html>
```

---

## Node.js Implementation Template

### Backend Setup

```javascript
// services/localeService.js

const supportedLocales = {
  en: { code: 'en', name: 'English', defaultCurrency: 'USD' },
  es: { code: 'es', name: 'Spanish', defaultCurrency: 'EUR' },
  fr: { code: 'fr', name: 'French', defaultCurrency: 'EUR' },
  de: { code: 'de', name: 'German', defaultCurrency: 'EUR' },
  pt: { code: 'pt', name: 'Portuguese', defaultCurrency: 'EUR' }
};

function getCurrentLocale(req) {
  // Priority: Session > Accept-Language > Default
  if (req.session.locale) {
    return req.session.locale;
  }

  const acceptLanguage = req.headers['accept-language'];
  return detectLocale(acceptLanguage);
}

function detectLocale(acceptLanguage) {
  if (!acceptLanguage) return 'en';

  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, q = 'q=1.0'] = lang.trim().split(';');
      return {
        code: code.substring(0, 2).toLowerCase(),
        quality: parseFloat(q.split('=')[1])
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const lang of languages) {
    if (supportedLocales[lang.code]) {
      return lang.code;
    }
  }

  return 'en';
}

module.exports = { getCurrentLocale, detectLocale, supportedLocales };
```

```javascript
// services/currencyConfig.js

const currencyConfig = {
  USD: { code: 'USD', symbol: '$', decimals: 2, country: 'US' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, country: 'GB' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, country: 'GB' },
  CAD: { code: 'CAD', symbol: 'C$', decimals: 2, country: 'CA' },
  AUD: { code: 'AUD', symbol: 'A$', decimals: 2, country: 'AU' },
  JPY: { code: 'JPY', symbol: '¥', decimals: 0, country: 'JP' }
};

function getCountryCode(currencyCode) {
  return currencyConfig[currencyCode]?.country || 'US';
}

function validateCurrency(currency) {
  return currencyConfig[currency] ? currency : 'USD';
}

module.exports = { currencyConfig, getCountryCode, validateCurrency };
```

```javascript
// translations/index.js

const fs = require('fs');
const path = require('path');

const translations = {};

// Load translation files
['en', 'es', 'fr', 'de', 'pt'].forEach(locale => {
  const filePath = path.join(__dirname, `${locale}.json`);
  translations[locale] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
});

function translate(key, params = {}, locale = 'en') {
  let text = translations[locale]?.[key] || translations.en[key] || key;

  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`%${param}%`, 'g'), params[param]);
  });

  return text;
}

module.exports = { translate, translations };
```

```javascript
// server.js

const express = require('express');
const session = require('express-session');
const { getCurrentLocale } = require('./services/localeService');
const { getCountryCode, validateCurrency } = require('./services/currencyConfig');
const { translate } = require('./translations');
const GlobalPayments = require('globalpayments-api');

const app = express();
app.use(express.json());
app.use(session({ secret: 'your-secret', resave: false, saveUninitialized: true }));

app.post('/process-payment', async (req, res) => {
  try {
    const { locale, currency, payment_token, amount, billing_zip } = req.body;

    // Update session preferences
    if (locale) req.session.locale = locale;
    if (currency) req.session.currency = currency;

    // Get current locale and currency
    const currentLocale = getCurrentLocale(req);
    const currentCurrency = validateCurrency(currency || req.session.currency);
    const countryCode = getCountryCode(currentCurrency);

    // Configure GP API with dynamic country
    const config = new GlobalPayments.ServicesConfig();
    config.appId = process.env.GP_API_APP_ID;
    config.appKey = process.env.GP_API_APP_KEY;
    config.environment = 'test';
    config.channel = 'CNP';
    config.country = countryCode;

    GlobalPayments.ServicesContainer.configureService(config);

    // Process payment
    const card = new GlobalPayments.CreditCardData();
    card.token = payment_token;

    const address = new GlobalPayments.Address();
    address.postalCode = billing_zip;

    const response = await card.charge(amount)
      .withCurrency(currentCurrency)
      .withAddress(address)
      .execute();

    res.json({
      success: true,
      message: translate('message.success', {}, currentLocale),
      data: {
        transactionId: response.transactionId,
        amount: amount,
        currency: currentCurrency
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: translate('error.payment_failed', { message: error.message }, currentLocale)
    });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

---

## Java Implementation Template

### Backend Setup

```java
// LocaleService.java
package com.globalpayments.services;

import java.util.*;
import javax.servlet.http.HttpServletRequest;

public class LocaleService {
    private static final Map<String, LocaleInfo> SUPPORTED_LOCALES = new HashMap<>();

    static {
        SUPPORTED_LOCALES.put("en", new LocaleInfo("en", "English", "USD"));
        SUPPORTED_LOCALES.put("es", new LocaleInfo("es", "Spanish", "EUR"));
        SUPPORTED_LOCALES.put("fr", new LocaleInfo("fr", "French", "EUR"));
        SUPPORTED_LOCALES.put("de", new LocaleInfo("de", "German", "EUR"));
        SUPPORTED_LOCALES.put("pt", new LocaleInfo("pt", "Portuguese", "EUR"));
    }

    public static String getCurrentLocale(HttpServletRequest request) {
        // Priority: Session > Accept-Language > Default
        String sessionLocale = (String) request.getSession().getAttribute("locale");
        if (sessionLocale != null && SUPPORTED_LOCALES.containsKey(sessionLocale)) {
            return sessionLocale;
        }

        String acceptLanguage = request.getHeader("Accept-Language");
        return detectLocale(acceptLanguage);
    }

    public static String detectLocale(String acceptLanguage) {
        if (acceptLanguage == null || acceptLanguage.isEmpty()) {
            return "en";
        }

        String[] languages = acceptLanguage.split(",");
        for (String lang : languages) {
            String langCode = lang.trim().substring(0, Math.min(2, lang.length())).toLowerCase();
            if (SUPPORTED_LOCALES.containsKey(langCode)) {
                return langCode;
            }
        }

        return "en";
    }

    static class LocaleInfo {
        String code;
        String name;
        String defaultCurrency;

        LocaleInfo(String code, String name, String defaultCurrency) {
            this.code = code;
            this.name = name;
            this.defaultCurrency = defaultCurrency;
        }
    }
}
```

```java
// CurrencyConfig.java
package com.globalpayments.services;

import java.util.HashMap;
import java.util.Map;

public class CurrencyConfig {
    private static final Map<String, CurrencyInfo> CURRENCIES = new HashMap<>();

    static {
        CURRENCIES.put("USD", new CurrencyInfo("USD", "$", 2, "US"));
        CURRENCIES.put("EUR", new CurrencyInfo("EUR", "€", 2, "GB"));
        CURRENCIES.put("GBP", new CurrencyInfo("GBP", "£", 2, "GB"));
        CURRENCIES.put("CAD", new CurrencyInfo("CAD", "C$", 2, "CA"));
        CURRENCIES.put("AUD", new CurrencyInfo("AUD", "A$", 2, "AU"));
        CURRENCIES.put("JPY", new CurrencyInfo("JPY", "¥", 0, "JP"));
    }

    public static String getCountryCode(String currencyCode) {
        CurrencyInfo currency = CURRENCIES.get(currencyCode);
        return currency != null ? currency.country : "US";
    }

    public static String validateCurrency(String currency) {
        return CURRENCIES.containsKey(currency) ? currency : "USD";
    }

    static class CurrencyInfo {
        String code;
        String symbol;
        int decimals;
        String country;

        CurrencyInfo(String code, String symbol, int decimals, String country) {
            this.code = code;
            this.symbol = symbol;
            this.decimals = decimals;
            this.country = country;
        }
    }
}
```

```java
// ProcessPaymentServlet.java
package com.globalpayments.example;

import com.globalpayments.api.*;
import com.globalpayments.services.*;
import javax.servlet.http.*;
import java.io.*;

@WebServlet("/process-payment")
public class ProcessPaymentServlet extends HttpServlet {
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        // Parse JSON request
        JsonObject jsonRequest = parseJsonRequest(request);
        String locale = jsonRequest.getString("locale", null);
        String currency = jsonRequest.getString("currency", null);

        // Update session preferences
        if (locale != null) {
            request.getSession().setAttribute("locale", locale);
        }
        if (currency != null) {
            request.getSession().setAttribute("currency", currency);
        }

        // Get current locale and currency
        String currentLocale = LocaleService.getCurrentLocale(request);
        String currentCurrency = CurrencyConfig.validateCurrency(currency);
        String countryCode = CurrencyConfig.getCountryCode(currentCurrency);

        try {
            // Configure GP API
            GpApiConfig config = new GpApiConfig();
            config.setAppId(System.getenv("GP_API_APP_ID"));
            config.setAppKey(System.getenv("GP_API_APP_KEY"));
            config.setEnvironment(Environment.TEST);
            config.setChannel(Channel.CardNotPresent);
            config.setCountry(countryCode);

            ServicesContainer.configureService(config);

            // Process payment
            CreditCardData card = new CreditCardData();
            card.setToken(jsonRequest.getString("payment_token"));

            Address address = new Address();
            address.setPostalCode(jsonRequest.getString("billing_zip"));

            Transaction result = card.charge(jsonRequest.getDouble("amount"))
                .withCurrency(currentCurrency)
                .withAddress(address)
                .execute();

            // Send success response
            response.setContentType("application/json");
            response.getWriter().write(createSuccessResponse(result, currentLocale));

        } catch (Exception e) {
            response.setStatus(400);
            response.getWriter().write(createErrorResponse(e.getMessage(), currentLocale));
        }
    }
}
```

---

## .NET Implementation Template

### Backend Setup

```csharp
// LocaleService.cs
using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Http;

public class LocaleService
{
    private static readonly Dictionary<string, LocaleInfo> SupportedLocales = new()
    {
        { "en", new LocaleInfo { Code = "en", Name = "English", DefaultCurrency = "USD" } },
        { "es", new LocaleInfo { Code = "es", Name = "Spanish", DefaultCurrency = "EUR" } },
        { "fr", new LocaleInfo { Code = "fr", Name = "French", DefaultCurrency = "EUR" } },
        { "de", new LocaleInfo { Code = "de", Name = "German", DefaultCurrency = "EUR" } },
        { "pt", new LocaleInfo { Code = "pt", Name = "Portuguese", DefaultCurrency = "EUR" } }
    };

    public static string GetCurrentLocale(HttpContext context)
    {
        // Priority: Session > Accept-Language > Default
        var sessionLocale = context.Session.GetString("locale");
        if (!string.IsNullOrEmpty(sessionLocale) && SupportedLocales.ContainsKey(sessionLocale))
        {
            return sessionLocale;
        }

        var acceptLanguage = context.Request.Headers["Accept-Language"].ToString();
        return DetectLocale(acceptLanguage);
    }

    public static string DetectLocale(string acceptLanguage)
    {
        if (string.IsNullOrEmpty(acceptLanguage))
        {
            return "en";
        }

        var languages = acceptLanguage.Split(',')
            .Select(lang => lang.Trim().Substring(0, Math.Min(2, lang.Length)).ToLower())
            .Where(code => SupportedLocales.ContainsKey(code));

        return languages.FirstOrDefault() ?? "en";
    }

    public class LocaleInfo
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public string DefaultCurrency { get; set; }
    }
}
```

```csharp
// CurrencyConfig.cs
using System.Collections.Generic;

public class CurrencyConfig
{
    private static readonly Dictionary<string, CurrencyInfo> Currencies = new()
    {
        { "USD", new CurrencyInfo { Code = "USD", Symbol = "$", Decimals = 2, Country = "US" } },
        { "EUR", new CurrencyInfo { Code = "EUR", Symbol = "€", Decimals = 2, Country = "GB" } },
        { "GBP", new CurrencyInfo { Code = "GBP", Symbol = "£", Decimals = 2, Country = "GB" } },
        { "CAD", new CurrencyInfo { Code = "CAD", Symbol = "C$", Decimals = 2, Country = "CA" } },
        { "AUD", new CurrencyInfo { Code = "AUD", Symbol = "A$", Decimals = 2, Country = "AU" } },
        { "JPY", new CurrencyInfo { Code = "JPY", Symbol = "¥", Decimals = 0, Country = "JP" } }
    };

    public static string GetCountryCode(string currencyCode)
    {
        return Currencies.ContainsKey(currencyCode) ? Currencies[currencyCode].Country : "US";
    }

    public static string ValidateCurrency(string currency)
    {
        return Currencies.ContainsKey(currency) ? currency : "USD";
    }

    public class CurrencyInfo
    {
        public string Code { get; set; }
        public string Symbol { get; set; }
        public int Decimals { get; set; }
        public string Country { get; set; }
    }
}
```

```csharp
// Program.cs
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using GlobalPayments.Api;
using GlobalPayments.Api.Entities;
using GlobalPayments.Api.PaymentMethods;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSession();
var app = builder.Build();

app.UseSession();

app.MapPost("/process-payment", async (HttpContext context) =>
{
    var requestBody = await JsonSerializer.DeserializeAsync<PaymentRequest>(context.Request.Body);

    // Update session preferences
    if (!string.IsNullOrEmpty(requestBody.Locale))
    {
        context.Session.SetString("locale", requestBody.Locale);
    }
    if (!string.IsNullOrEmpty(requestBody.Currency))
    {
        context.Session.SetString("currency", requestBody.Currency);
    }

    // Get current locale and currency
    var currentLocale = LocaleService.GetCurrentLocale(context);
    var currentCurrency = CurrencyConfig.ValidateCurrency(requestBody.Currency);
    var countryCode = CurrencyConfig.GetCountryCode(currentCurrency);

    try
    {
        // Configure GP API
        var config = new GpApiConfig
        {
            AppId = Environment.GetEnvironmentVariable("GP_API_APP_ID"),
            AppKey = Environment.GetEnvironmentVariable("GP_API_APP_KEY"),
            Environment = Entities.Environment.TEST,
            Channel = Channel.CardNotPresent,
            Country = countryCode
        };

        ServicesContainer.ConfigureService(config);

        // Process payment
        var card = new CreditCardData
        {
            Token = requestBody.PaymentToken
        };

        var address = new Address
        {
            PostalCode = requestBody.BillingZip
        };

        var response = card.Charge(requestBody.Amount)
            .WithCurrency(currentCurrency)
            .WithAddress(address)
            .Execute();

        return Results.Json(new
        {
            success = true,
            message = "Payment processed successfully",
            data = new
            {
                transactionId = response.TransactionId,
                amount = requestBody.Amount,
                currency = currentCurrency
            }
        });
    }
    catch (Exception ex)
    {
        return Results.Json(new
        {
            success = false,
            message = $"Payment failed: {ex.Message}"
        });
    }
});

app.Run();

record PaymentRequest(string PaymentToken, decimal Amount, string Currency, string Locale, string BillingZip);
```

---

## Translation Files Format

All translation files should be JSON with the following structure:

```json
{
  "page.title": "Translated Page Title",
  "form.amount": "Translated Amount Label",
  "button.process_payment": "Translated Button Text",
  "error.payment_failed": "Translated error: %message%",
  "message.success": "Translated success message"
}
```

Parameter substitution uses:
- **PHP/Symfony**: `%parameter%` format
- **JavaScript**: `{parameter}` format
- **Java/C#**: Use `String.format()` or string interpolation

---

## Testing Checklist

### Backend Testing

- [ ] Locale detection from Accept-Language header
- [ ] Session persistence of locale/currency preferences
- [ ] Translation service returns correct strings for each locale
- [ ] Currency validation rejects unsupported codes
- [ ] Country code mapping works for all 6 currencies
- [ ] GP API configuration uses correct country code
- [ ] Payment processing works with all 6 currencies
- [ ] Error messages returned in correct language

### Frontend Testing

- [ ] Language selector updates UI immediately
- [ ] Currency selector updates amount formatting
- [ ] localStorage persists user preferences
- [ ] Browser language detection works on first visit
- [ ] Intl.NumberFormat displays correct currency symbols
- [ ] Amount input respects decimal separators (. vs ,)
- [ ] Form labels translate correctly
- [ ] Success/error messages appear in selected language

### Integration Testing

- [ ] Full payment flow in English (USD)
- [ ] Full payment flow in Spanish (EUR)
- [ ] Full payment flow in French (EUR)
- [ ] Full payment flow in German (EUR)
- [ ] Full payment flow in Portuguese (EUR)
- [ ] Currency change without language change (e.g., English + EUR)
- [ ] Language change without currency change (e.g., French + USD)
- [ ] Session persistence across page reloads
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

---

## Deployment Considerations

### Environment Variables

Ensure these are set for all environments:

```bash
GP_API_APP_ID=your_app_id
GP_API_APP_KEY=your_app_key
```

### Production Configuration

- Change GP API environment from `TEST` to `PRODUCTION`
- Enable HTTPS for all API calls
- Implement proper CORS headers
- Add rate limiting to prevent abuse
- Log locale/currency selections for analytics
- Monitor transaction success rates by currency
- Set up error tracking by language

### Performance Optimization

- Cache translation files (don't reload on every request)
- Use CDN for frontend JavaScript files
- Minify JavaScript and CSS
- Enable gzip compression for text files
- Consider using a translation CDN for dynamic updates

---

## Troubleshooting

### Issue: Translations not loading

**Solution**: Check translation file paths and ensure JSON is valid
```bash
# Validate JSON
php -r "json_decode(file_get_contents('translations/en.json'));"
```

### Issue: Currency not formatting correctly

**Solution**: Verify Intl API support and fallback logic
```javascript
console.log(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(100));
```

### Issue: GP API rejects currency

**Solution**: Verify merchant account supports the currency and country code is correct
```
USD → US
EUR → GB (for GP API)
GBP → GB
CAD → CA
AUD → AU
JPY → JP
```

### Issue: Session not persisting locale

**Solution**: Ensure session middleware is configured correctly
```php
// PHP
session_start();

// Node.js
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

// .NET
builder.Services.AddSession();
app.UseSession();
```

---

## Additional Resources

- [GP API Documentation](https://developer.globalpay.com/api)
- [Symfony Translation Component](https://symfony.com/doc/current/translation.html)
- [i18next Documentation](https://www.i18next.com/)
- [Intl.NumberFormat API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [BCP 47 Language Tags](https://www.rfc-editor.org/info/bcp47)

---

## Support

For questions or issues with localization implementation:
1. Check this guide for implementation patterns
2. Review the PHP reference implementation
3. Test with Global Payments test cards
4. Contact Global Payments support for SDK-specific issues
