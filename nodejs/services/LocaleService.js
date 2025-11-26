/**
 * Locale Service
 * Handles locale detection, validation, and management
 */

import CurrencyConfig from './CurrencyConfig.js';

class LocaleService {
  static supportedLocales = {
    en: {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      defaultCurrency: 'USD'
    },
    es: {
      code: 'es',
      name: 'Spanish',
      nativeName: 'Español',
      flag: '🇪🇸',
      defaultCurrency: 'EUR'
    },
    fr: {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      flag: '🇫🇷',
      defaultCurrency: 'EUR'
    },
    de: {
      code: 'de',
      name: 'German',
      nativeName: 'Deutsch',
      flag: '🇩🇪',
      defaultCurrency: 'EUR'
    },
    pt: {
      code: 'pt',
      name: 'Portuguese',
      nativeName: 'Português',
      flag: '🇵🇹',
      defaultCurrency: 'EUR'
    }
  };

  /**
   * Get all supported locales
   * @returns {Object} All locale configurations
   */
  static getAllLocales() {
    return this.supportedLocales;
  }

  /**
   * Get locale configuration
   * @param {string} code - Locale code
   * @returns {Object|null} Locale configuration or null
   */
  static getLocale(code) {
    const normalizedCode = code.toLowerCase().substring(0, 2);
    return this.supportedLocales[normalizedCode] || null;
  }

  /**
   * Check if locale is supported
   * @param {string} code - Locale code
   * @returns {boolean} True if supported
   */
  static isSupported(code) {
    const normalizedCode = code.toLowerCase().substring(0, 2);
    return !!this.supportedLocales[normalizedCode];
  }

  /**
   * Detect locale from Accept-Language header
   * @param {string|null} acceptLanguage - Accept-Language header value
   * @returns {string} Detected locale code (defaults to 'en')
   */
  static detectLocale(acceptLanguage) {
    if (!acceptLanguage) {
      return 'en';
    }

    // Parse Accept-Language header
    // Example: "en-US,en;q=0.9,es;q=0.8"
    const languages = [];
    const parts = acceptLanguage.split(',');

    parts.forEach(part => {
      const langParts = part.trim().split(';');
      const lang = langParts[0].toLowerCase().substring(0, 2);
      let quality = 1.0;

      if (langParts[1] && langParts[1].startsWith('q=')) {
        quality = parseFloat(langParts[1].substring(2));
      }

      languages.push({ lang, quality });
    });

    // Sort by quality
    languages.sort((a, b) => b.quality - a.quality);

    // Find first supported locale
    for (const { lang } of languages) {
      if (this.isSupported(lang)) {
        return lang;
      }
    }

    return 'en';
  }

  /**
   * Validate and normalize locale code
   * @param {string|null} code - Locale code
   * @returns {string} Valid locale code (defaults to 'en')
   */
  static validateLocale(code) {
    if (!code) {
      return 'en';
    }

    const normalizedCode = code.toLowerCase().substring(0, 2).trim();
    return this.isSupported(normalizedCode) ? normalizedCode : 'en';
  }

  /**
   * Get supported locale codes
   * @returns {Array<string>} Array of locale codes
   */
  static getSupportedCodes() {
    return Object.keys(this.supportedLocales);
  }

  /**
   * Get default currency for locale
   * @param {string} locale - Locale code
   * @returns {string} Currency code
   */
  static getDefaultCurrency(locale) {
    const localeData = this.getLocale(locale);
    return localeData ? localeData.defaultCurrency : 'USD';
  }

  /**
   * Get locale from session
   * @param {Object} session - Express session object
   * @returns {string|null} Locale from session
   */
  static getSessionLocale(session) {
    return session.locale || null;
  }

  /**
   * Set locale in session
   * @param {Object} session - Express session object
   * @param {string} locale - Locale code
   */
  static setSessionLocale(session, locale) {
    session.locale = this.validateLocale(locale);
  }

  /**
   * Get currency from session
   * @param {Object} session - Express session object
   * @returns {string|null} Currency from session
   */
  static getSessionCurrency(session) {
    return session.currency || null;
  }

  /**
   * Set currency in session
   * @param {Object} session - Express session object
   * @param {string} currency - Currency code
   */
  static setSessionCurrency(session, currency) {
    session.currency = CurrencyConfig.validateCurrency(currency);
  }

  /**
   * Get current locale with fallback logic
   * Priority: Session > Accept-Language > Default (en)
   * @param {Object} session - Express session object
   * @param {string|null} acceptLanguage - Accept-Language header
   * @returns {string} Current locale code
   */
  static getCurrentLocale(session, acceptLanguage) {
    // Check session
    const sessionLocale = this.getSessionLocale(session);
    if (sessionLocale) {
      return sessionLocale;
    }

    // Detect from browser
    const detected = this.detectLocale(acceptLanguage);

    // Save to session
    this.setSessionLocale(session, detected);

    return detected;
  }

  /**
   * Get current currency with fallback logic
   * Priority: Session > Locale default > USD
   * @param {Object} session - Express session object
   * @param {string|null} acceptLanguage - Accept-Language header
   * @returns {string} Current currency code
   */
  static getCurrentCurrency(session, acceptLanguage) {
    // Check session
    const sessionCurrency = this.getSessionCurrency(session);
    if (sessionCurrency) {
      return sessionCurrency;
    }

    // Use locale default
    const locale = this.getCurrentLocale(session, acceptLanguage);
    const defaultCurrency = this.getDefaultCurrency(locale);

    // Save to session
    this.setSessionCurrency(session, defaultCurrency);

    return defaultCurrency;
  }
}

export default LocaleService;
