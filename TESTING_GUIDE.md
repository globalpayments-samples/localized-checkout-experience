# Localization Testing Guide

This guide provides comprehensive testing procedures for the multi-currency and multi-language checkout experience.

---

## Quick Start Testing

### 1. Setup

```bash
cd php
composer install
cp .env.sample .env
# Edit .env with your GP API credentials
php -S localhost:8000
```

### 2. Access the Application

Open your browser to: `http://localhost:8000/index-localized.html`

---

## Testing Checklist

### ✅ Backend API Testing

#### Test Config Endpoint

```bash
# Test basic config retrieval
curl -X GET http://localhost:8000/config.php | jq

# Expected response:
# {
#   "success": true,
#   "data": {
#     "accessToken": "PMT_...",
#     "locale": "en",
#     "currency": "USD",
#     "supportedLocales": {...},
#     "supportedCurrencies": {...}
#   }
# }
```

#### Test Locale Endpoint

```bash
# Get current locale
curl -X GET http://localhost:8000/get-locale.php | jq

# Update locale to Spanish
curl -X POST http://localhost:8000/get-locale.php \
  -H "Content-Type: application/json" \
  -d '{"locale": "es", "currency": "EUR"}' | jq

# Verify translations are in Spanish
curl -X GET http://localhost:8000/get-locale.php | jq '.data.translations'
```

#### Test Locale Detection

```bash
# Test with Spanish browser
curl -X GET http://localhost:8000/config.php \
  -H "Accept-Language: es-ES,es;q=0.9" | jq '.data.locale'
# Should return: "es"

# Test with French browser
curl -X GET http://localhost:8000/config.php \
  -H "Accept-Language: fr-FR,fr;q=0.9" | jq '.data.locale'
# Should return: "fr"

# Test with German browser
curl -X GET http://localhost:8000/config.php \
  -H "Accept-Language: de-DE,de;q=0.9" | jq '.data.locale'
# Should return: "de"
```

#### Test Currency Validation

```bash
# Valid currency
curl -X POST http://localhost:8000/process-payment.php \
  -H "Content-Type: application/json" \
  -d '{"currency": "EUR", "amount": 25}' | jq

# Invalid currency (should fallback to USD)
curl -X POST http://localhost:8000/process-payment.php \
  -H "Content-Type: application/json" \
  -d '{"currency": "INVALID", "amount": 25}' | jq
```

---

### ✅ Frontend UI Testing

#### Test Language Selector

1. **Open browser DevTools** (F12)
2. **Select each language** from dropdown:
   - English → All labels should be in English
   - Spanish → Labels change to Spanish ("Monto", "Procesar Pago")
   - French → Labels change to French ("Montant", "Traiter le Paiement")
   - German → Labels change to German ("Betrag", "Zahlung Verarbeiten")
   - Portuguese → Labels change to Portuguese ("Valor", "Processar Pagamento")

3. **Verify localStorage persistence:**
   ```javascript
   // In browser console
   localStorage.getItem('locale')  // Should show selected language
   ```

4. **Reload page** → Language should persist

#### Test Currency Selector

1. **Select each currency:**
   - USD → Symbol: $, Decimals: 2
   - EUR → Symbol: €, Decimals: 2
   - GBP → Symbol: £, Decimals: 2
   - CAD → Symbol: C$, Decimals: 2
   - AUD → Symbol: A$, Decimals: 2
   - JPY → Symbol: ¥, Decimals: 0

2. **Verify amount label updates** with currency symbol

3. **Verify localStorage persistence:**
   ```javascript
   // In browser console
   localStorage.getItem('currency')  // Should show selected currency
   ```

4. **Reload page** → Currency should persist

#### Test Independent Selection

Test these combinations to verify independence:

| Language | Currency | Expected Behavior |
|----------|----------|-------------------|
| English | USD | Default, all in English with $ |
| English | EUR | English labels, € symbol |
| Spanish | USD | Spanish labels, $ symbol |
| French | GBP | French labels, £ symbol |
| German | JPY | German labels, ¥ symbol, 0 decimals |
| Portuguese | CAD | Portuguese labels, C$ symbol |

#### Test Amount Formatting

1. **Select EUR currency** (uses comma as decimal separator)
   - Type: `25,50`
   - Should be accepted and formatted correctly

2. **Select USD currency** (uses period as decimal separator)
   - Type: `25.50`
   - Should be accepted and formatted correctly

3. **Select JPY currency** (0 decimal places)
   - Type: `2500`
   - Should show no decimal places

---

### ✅ Payment Processing Testing

#### Test with Global Payments Test Cards

**Visa Success:**
- Card: 4263970000005262
- CVV: 123
- Expiry: 12/25

**Mastercard Success:**
- Card: 5425230000004415
- CVV: 123
- Expiry: 12/25

**Amex Success:**
- Card: 374101000000608
- CVV: 1234
- Expiry: 12/25

#### Test Each Currency

1. **USD Test**
   - Select: English + USD
   - Amount: 25.00
   - Card: Visa test card
   - Submit → Should succeed
   - Verify: Transaction shows in USD

2. **EUR Test**
   - Select: Spanish + EUR
   - Amount: 25,00 (comma separator)
   - Card: Mastercard test card
   - Submit → Should succeed
   - Verify: Transaction shows in EUR
   - Verify: Success message in Spanish

3. **GBP Test**
   - Select: French + GBP
   - Amount: 25.00
   - Card: Visa test card
   - Submit → Should succeed
   - Verify: Transaction shows in GBP
   - Verify: Success message in French

4. **CAD Test**
   - Select: English + CAD
   - Amount: 25.00
   - Card: Mastercard test card
   - Submit → Should succeed
   - Verify: Transaction shows in CAD

5. **AUD Test**
   - Select: German + AUD
   - Amount: 25,00
   - Card: Visa test card
   - Submit → Should succeed
   - Verify: Transaction shows in AUD
   - Verify: Success message in German

6. **JPY Test**
   - Select: Portuguese + JPY
   - Amount: 2500 (no decimals)
   - Card: Amex test card
   - Submit → Should succeed
   - Verify: Transaction shows in JPY (0 decimals)
   - Verify: Success message in Portuguese

---

### ✅ Session Persistence Testing

#### Test Backend Session

1. **Set locale via API:**
   ```bash
   curl -X POST http://localhost:8000/get-locale.php \
     -H "Content-Type: application/json" \
     -d '{"locale": "es", "currency": "EUR"}' \
     -c cookies.txt
   ```

2. **Verify persistence:**
   ```bash
   curl -X GET http://localhost:8000/get-locale.php \
     -b cookies.txt | jq '.data.locale'
   # Should return: "es"
   ```

3. **Process payment with session:**
   ```bash
   curl -X POST http://localhost:8000/process-payment.php \
     -b cookies.txt \
     -H "Content-Type: application/json" \
     -d '{
       "payment_token": "PMT_test",
       "amount": 25,
       "billing_zip": "12345"
     }' | jq
   # Should use ES locale from session
   ```

#### Test Frontend localStorage

1. **Set language to Spanish** in UI
2. **Check console:**
   ```javascript
   localStorage.getItem('locale')  // Should be 'es'
   localStorage.getItem('currency')  // Should be 'EUR' (default for es)
   ```

3. **Close browser tab** (not just refresh)
4. **Reopen:** `http://localhost:8000/index-localized.html`
5. **Verify:** Language selector shows Spanish, UI is in Spanish

---

### ✅ Error Handling Testing

#### Test Invalid Amount

1. **Enter amount:** `-5`
2. **Submit**
3. **Expected:** Error message in selected language
   - EN: "Please enter a valid amount."
   - ES: "Por favor ingrese un monto válido."
   - FR: "Veuillez entrer un montant valide."

#### Test Invalid Card

1. **Use invalid card:** 4111111111111111
2. **Submit**
3. **Expected:** Error message in selected language

#### Test Network Error

1. **Open DevTools → Network tab**
2. **Go offline** (throttle to "Offline")
3. **Submit payment**
4. **Expected:** Network error message in selected language
   - EN: "Network error. Please check your connection and try again."
   - ES: "Error de red. Por favor verifique su conexión e intente nuevamente."

---

### ✅ Cross-Browser Testing

Test in the following browsers:

#### Chrome/Edge (Chromium)
- [ ] Language detection works
- [ ] Currency formatting correct
- [ ] Intl.NumberFormat works
- [ ] LocalStorage persists
- [ ] Payments process successfully

#### Firefox
- [ ] Language detection works
- [ ] Currency formatting correct
- [ ] Intl.NumberFormat works
- [ ] LocalStorage persists
- [ ] Payments process successfully

#### Safari
- [ ] Language detection works
- [ ] Currency formatting correct
- [ ] Intl.NumberFormat works
- [ ] LocalStorage persists
- [ ] Payments process successfully

---

### ✅ Translation Completeness Testing

#### Verify All Strings Translate

**Test in Spanish (es):**
```javascript
// In browser console with Spanish selected
document.querySelectorAll('[data-i18n]').forEach(el => {
  const key = el.getAttribute('data-i18n');
  const text = el.textContent.trim();

  // Should NOT contain English words
  if (text.includes('Amount') || text.includes('Process Payment')) {
    console.error('Untranslated element:', key, text);
  }
});
```

**Repeat for each language:**
- French: Check for "Amount", "Process Payment"
- German: Check for "Amount", "Process Payment"
- Portuguese: Check for "Amount", "Process Payment"

---

### ✅ Performance Testing

#### Test Page Load Time

```javascript
// In browser console
window.performance.timing.loadEventEnd - window.performance.timing.navigationStart
// Should be < 3000ms (3 seconds)
```

#### Test Language Switch Performance

```javascript
// Measure language switch time
const start = performance.now();
handleLanguageChange('es');
const end = performance.now();
console.log(`Language switch took: ${end - start}ms`);
// Should be < 500ms
```

#### Test Currency Switch Performance

```javascript
// Measure currency switch time (includes form reinitialization)
const start = performance.now();
handleCurrencyChange('EUR');
const end = performance.now();
console.log(`Currency switch took: ${end - start}ms`);
// Should be < 2000ms (includes GP API config reload)
```

---

### ✅ Security Testing

#### Test Input Sanitization

1. **Test XSS in amount field:**
   - Enter: `<script>alert('XSS')</script>`
   - Submit
   - Expected: Should be sanitized, no alert

2. **Test XSS in billing ZIP:**
   - Enter: `<img src=x onerror=alert('XSS')>`
   - Submit
   - Expected: Should be sanitized

#### Test CORS Headers

```bash
# Test CORS from different origin
curl -X POST http://localhost:8000/process-payment.php \
  -H "Origin: http://example.com" \
  -H "Content-Type: application/json" \
  -d '{"amount": 25}' \
  -v 2>&1 | grep "Access-Control"

# Should see:
# Access-Control-Allow-Origin: *
```

---

### ✅ Accessibility Testing

#### Test Keyboard Navigation

1. **Tab through form fields** → All should be reachable
2. **Select language with keyboard** → Arrow keys + Enter
3. **Select currency with keyboard** → Arrow keys + Enter
4. **Submit with Enter key** → Form submits

#### Test Screen Reader

1. **Enable screen reader** (VoiceOver on Mac, NVDA on Windows)
2. **Navigate form** → All labels should be announced correctly
3. **Change language** → Announcements should update to new language

---

## Automated Testing Script

Save this as `test-localization.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Localization Implementation"
echo "======================================="

BASE_URL="http://localhost:8000"

# Test 1: Config endpoint
echo "✓ Test 1: Config endpoint"
curl -s -X GET "$BASE_URL/config.php" | jq -e '.success' > /dev/null && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 2: Locale endpoint GET
echo "✓ Test 2: Locale endpoint (GET)"
curl -s -X GET "$BASE_URL/get-locale.php" | jq -e '.success' > /dev/null && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 3: Locale endpoint POST
echo "✓ Test 3: Locale endpoint (POST)"
curl -s -X POST "$BASE_URL/get-locale.php" \
  -H "Content-Type: application/json" \
  -d '{"locale":"es","currency":"EUR"}' | jq -e '.success' > /dev/null && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 4: Spanish locale detection
echo "✓ Test 4: Spanish locale detection"
LOCALE=$(curl -s -X GET "$BASE_URL/config.php" -H "Accept-Language: es-ES" | jq -r '.data.locale')
[ "$LOCALE" = "es" ] && echo "  ✅ PASS" || echo "  ❌ FAIL (got: $LOCALE)"

# Test 5: French locale detection
echo "✓ Test 5: French locale detection"
LOCALE=$(curl -s -X GET "$BASE_URL/config.php" -H "Accept-Language: fr-FR" | jq -r '.data.locale')
[ "$LOCALE" = "fr" ] && echo "  ✅ PASS" || echo "  ❌ FAIL (got: $LOCALE)"

# Test 6: Translation files exist
echo "✓ Test 6: Translation files exist"
FILES=("en.json" "es.json" "fr.json" "de.json" "pt.json")
PASS=true
for file in "${FILES[@]}"; do
  [ -f "translations/$file" ] || PASS=false
done
[ "$PASS" = true ] && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 7: Service files exist
echo "✓ Test 7: Service files exist"
FILES=("services/LocaleService.php" "services/CurrencyConfig.php" "services/TranslationService.php")
PASS=true
for file in "${FILES[@]}"; do
  [ -f "$file" ] || PASS=false
done
[ "$PASS" = true ] && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Test 8: JavaScript modules exist
echo "✓ Test 8: JavaScript modules exist"
FILES=("js/translations.js" "js/currency-formatter.js")
PASS=true
for file in "${FILES[@]}"; do
  [ -f "$file" ] || PASS=false
done
[ "$PASS" = true ] && echo "  ✅ PASS" || echo "  ❌ FAIL"

echo ""
echo "✅ Testing complete!"
echo "For full manual testing, open: $BASE_URL/index-localized.html"
```

**Make it executable and run:**
```bash
chmod +x test-localization.sh
./test-localization.sh
```

---

## Common Issues & Solutions

### Issue: Translations not loading

**Symptom:** UI shows translation keys instead of text (e.g., "form.amount")

**Solution:**
1. Check browser console for errors
2. Verify `js/translations.js` is loaded: View source, check `<script>` tags
3. Test in console:
   ```javascript
   typeof t  // Should be 'function'
   t('form.amount')  // Should return translated text
   ```

### Issue: Currency not formatting

**Symptom:** Amount shows as plain number without symbol

**Solution:**
1. Check if `currency-formatter.js` is loaded
2. Test in console:
   ```javascript
   formatCurrency(25, 'EUR', 'fr')  // Should return '25,00 €'
   ```
3. Check browser supports Intl API:
   ```javascript
   typeof Intl.NumberFormat  // Should be 'function'
   ```

### Issue: Locale not persisting

**Symptom:** Language resets to English on page reload

**Solution:**
1. Check localStorage:
   ```javascript
   localStorage.getItem('locale')  // Should show selected locale
   ```
2. Check if cookies/sessions are enabled
3. Clear browser data and try again

### Issue: Payment fails with currency error

**Symptom:** GP API rejects transaction with currency/country error

**Solution:**
1. Verify country code mapping in `CurrencyConfig.php`:
   ```php
   print_r(CurrencyConfig::getCountryCode('EUR'));
   // Should output: GB
   ```
2. Check GP API credentials support the currency
3. Verify merchant account is configured for multi-currency

---

## Test Coverage Report Template

After completing all tests, fill out this report:

```markdown
## Localization Test Report

**Date:** YYYY-MM-DD
**Tester:** Your Name
**Environment:** localhost / staging / production

### Backend Tests
- [ ] Config endpoint returns locale/currency
- [ ] Locale endpoint GET works
- [ ] Locale endpoint POST updates session
- [ ] All 5 languages detected correctly
- [ ] All 6 currencies validated
- [ ] Session persistence works

### Frontend Tests
- [ ] Language selector updates UI
- [ ] Currency selector updates formatting
- [ ] localStorage persists preferences
- [ ] All translations display correctly
- [ ] Independent selection works

### Payment Tests
- [ ] USD payment succeeds
- [ ] EUR payment succeeds
- [ ] GBP payment succeeds
- [ ] CAD payment succeeds
- [ ] AUD payment succeeds
- [ ] JPY payment succeeds

### Cross-Browser Tests
- [ ] Chrome/Edge works
- [ ] Firefox works
- [ ] Safari works

### Issues Found
1. [Describe issue]
2. [Describe issue]

### Overall Status
- ✅ PASS
- ⚠️ PASS WITH ISSUES
- ❌ FAIL

### Notes
[Additional notes]
```

---

## Next Steps After Testing

1. **Fix any issues found** during testing
2. **Update documentation** with any discoveries
3. **Create production deployment plan**
4. **Set up monitoring** for locale/currency usage
5. **Plan for additional languages/currencies**

---

For questions or issues, refer to:
- `LOCALIZATION_GUIDE.md` - Implementation details
- `php/README.md` - PHP-specific setup
- `IMPLEMENTATION_SUMMARY.md` - Project overview
