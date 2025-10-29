/**
 * Currency Formatting Module
 * Handles currency-specific formatting and display using Intl.NumberFormat
 */

// Currency configuration matching backend
const currencyConfig = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    symbolPosition: 'before',
    decimals: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    flag: '🇺🇸'
  },
  EUR: {
    code: 'EUR',
    name: 'Euro',
    symbol: '€',
    symbolPosition: 'after',
    decimals: 2,
    decimalSeparator: ',',
    thousandsSeparator: '.',
    flag: '🇪🇺'
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    symbolPosition: 'before',
    decimals: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    flag: '🇬🇧'
  },
  CAD: {
    code: 'CAD',
    name: 'Canadian Dollar',
    symbol: 'C$',
    symbolPosition: 'before',
    decimals: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    flag: '🇨🇦'
  },
  AUD: {
    code: 'AUD',
    name: 'Australian Dollar',
    symbol: 'A$',
    symbolPosition: 'before',
    decimals: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    flag: '🇦🇺'
  },
  JPY: {
    code: 'JPY',
    name: 'Japanese Yen',
    symbol: '¥',
    symbolPosition: 'before',
    decimals: 0,
    decimalSeparator: '',
    thousandsSeparator: ',',
    flag: '🇯🇵'
  }
};

// Current currency state
let currentCurrency = 'USD';

/**
 * Format amount using Intl.NumberFormat for accurate localization
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (USD, EUR, etc.)
 * @param {string} locale - Locale for formatting (en, fr, de, etc.)
 * @returns {string} Formatted amount with currency symbol
 */
function formatCurrency(amount, currency = currentCurrency, locale = 'en') {
  const config = currencyConfig[currency];
  if (!config) {
    return amount.toString();
  }

  // Map locale to BCP 47 language tag
  const localeMap = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'pt': 'pt-PT'
  };

  const intlLocale = localeMap[locale] || 'en-US';

  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals
    }).format(amount);
  } catch (e) {
    // Fallback to manual formatting if Intl fails
    return formatCurrencyManual(amount, currency);
  }
}

/**
 * Manual currency formatting fallback
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount
 */
function formatCurrencyManual(amount, currency = currentCurrency) {
  const config = currencyConfig[currency];
  if (!config) {
    return amount.toString();
  }

  const formatted = amount.toFixed(config.decimals)
    .replace('.', config.decimalSeparator)
    .replace(/\B(?=(\d{3})+(?!\d))/g, config.thousandsSeparator);

  if (config.symbolPosition === 'before') {
    return config.symbol + formatted;
  } else {
    return formatted + ' ' + config.symbol;
  }
}

/**
 * Get currency configuration
 * @param {string} currency - Currency code
 * @returns {Object|null} Currency configuration object
 */
function getCurrencyConfig(currency) {
  return currencyConfig[currency] || null;
}

/**
 * Set current currency
 * @param {string} currency - Currency code
 * @returns {boolean} Success status
 */
function setCurrency(currency) {
  if (currencyConfig[currency]) {
    currentCurrency = currency;
    localStorage.setItem('currency', currency);
    return true;
  }
  return false;
}

/**
 * Get current currency
 * @returns {string} Current currency code
 */
function getCurrency() {
  return currentCurrency;
}

/**
 * Get all supported currencies
 * @returns {Object} All currency configurations
 */
function getAllCurrencies() {
  return currencyConfig;
}

/**
 * Get supported currency codes
 * @returns {Array} Array of currency codes
 */
function getSupportedCurrencies() {
  return Object.keys(currencyConfig);
}

/**
 * Initialize currency from localStorage or default
 */
function initCurrency() {
  const savedCurrency = localStorage.getItem('currency');
  if (savedCurrency && currencyConfig[savedCurrency]) {
    currentCurrency = savedCurrency;
  }
}

/**
 * Format amount input with proper decimal separators
 * @param {string} value - Input value
 * @param {string} currency - Currency code
 * @returns {string} Formatted input value
 */
function formatInputAmount(value, currency = currentCurrency) {
  const config = currencyConfig[currency];
  if (!config) return value;

  // Remove all non-numeric except decimal separator
  let cleaned = value.replace(/[^\d.,]/g, '');

  // Handle decimal separator based on currency
  if (config.decimalSeparator === ',') {
    // Replace any period with comma
    cleaned = cleaned.replace(/\./g, ',');
    // Ensure only one comma
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      cleaned = parts[0] + ',' + parts.slice(1).join('');
    }
  } else {
    // Replace any comma with period
    cleaned = cleaned.replace(/,/g, '.');
    // Ensure only one period
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
  }

  return cleaned;
}

/**
 * Parse amount input to float
 * @param {string} value - Input value
 * @param {string} currency - Currency code
 * @returns {number} Parsed float value
 */
function parseInputAmount(value, currency = currentCurrency) {
  const config = currencyConfig[currency];
  if (!config) return parseFloat(value) || 0;

  // Normalize to use period as decimal separator
  let normalized = value.replace(/[^\d.,]/g, '');

  if (config.decimalSeparator === ',') {
    // Replace comma with period for parsing
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    // Remove commas (thousands separator)
    normalized = normalized.replace(/,/g, '');
  }

  return parseFloat(normalized) || 0;
}

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
function getCurrencySymbol(currency = currentCurrency) {
  return currencyConfig[currency]?.symbol || '$';
}

/**
 * Update amount label with currency symbol
 * @param {string} currency - Currency code
 */
function updateAmountLabel(currency = currentCurrency) {
  const config = currencyConfig[currency];
  if (!config) return;

  const label = document.querySelector('label[for="amount"]');
  if (label) {
    label.textContent = t('form.amount') + ' (' + config.symbol + ')';
  }
}

// Initialize on load
initCurrency();
