/**
 * Currency Configuration
 * Manages currency metadata and formatting rules
 */

class CurrencyConfig {
  static currencies = {
    USD: {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      symbolPosition: 'before',
      decimals: 2,
      decimalSeparator: '.',
      thousandsSeparator: ',',
      country: 'US',
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
      country: 'GB', // GP API uses GB for EUR processing
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
      country: 'GB',
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
      country: 'CA',
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
      country: 'AU',
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
      country: 'JP',
      flag: '🇯🇵'
    }
  };

  /**
   * Get all supported currencies
   * @returns {Object} All currency configurations
   */
  static getAllCurrencies() {
    return this.currencies;
  }

  /**
   * Get currency configuration by code
   * @param {string} code - Currency code (USD, EUR, etc.)
   * @returns {Object|null} Currency configuration or null
   */
  static getCurrency(code) {
    const upperCode = code.toUpperCase();
    return this.currencies[upperCode] || null;
  }

  /**
   * Check if currency is supported
   * @param {string} code - Currency code
   * @returns {boolean} True if supported
   */
  static isSupported(code) {
    return !!this.currencies[code.toUpperCase()];
  }

  /**
   * Get country code for currency (for GP API configuration)
   * @param {string} currencyCode - Currency code
   * @returns {string} Country code
   */
  static getCountryCode(currencyCode) {
    const currency = this.getCurrency(currencyCode);
    return currency ? currency.country : 'US';
  }

  /**
   * Format amount according to currency rules
   * @param {number} amount - Amount to format
   * @param {string} currencyCode - Currency code
   * @returns {string} Formatted amount with currency symbol
   */
  static formatAmount(amount, currencyCode) {
    const currency = this.getCurrency(currencyCode);
    if (!currency) {
      return amount.toFixed(2);
    }

    // Format with proper decimal places and separators
    const parts = amount.toFixed(currency.decimals).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSeparator);
    const decimalPart = parts[1];

    let formatted = integerPart;
    if (currency.decimals > 0 && decimalPart) {
      formatted += currency.decimalSeparator + decimalPart;
    }

    // Add currency symbol
    if (currency.symbolPosition === 'before') {
      return currency.symbol + formatted;
    } else {
      return formatted + ' ' + currency.symbol;
    }
  }

  /**
   * Get supported currency codes
   * @returns {Array<string>} Array of currency codes
   */
  static getSupportedCodes() {
    return Object.keys(this.currencies);
  }

  /**
   * Validate and normalize currency code
   * @param {string|null} code - Currency code
   * @returns {string} Valid currency code (defaults to USD)
   */
  static validateCurrency(code) {
    if (!code) {
      return 'USD';
    }

    const upperCode = code.toUpperCase().trim();
    return this.isSupported(upperCode) ? upperCode : 'USD';
  }
}

export default CurrencyConfig;
