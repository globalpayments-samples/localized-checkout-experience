/**
 * Translation Service
 * Handles server-side translation loading and parameter substitution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TranslationService {
  static translations = {};

  /**
   * Load translation file for a locale
   * @param {string} locale - Locale code
   * @returns {Object} Translation dictionary
   */
  static loadTranslations(locale) {
    if (this.translations[locale]) {
      return this.translations[locale];
    }

    try {
      const filePath = path.join(__dirname, '..', 'translations', `${locale}.json`);
      const data = fs.readFileSync(filePath, 'utf8');
      this.translations[locale] = JSON.parse(data);
      return this.translations[locale];
    } catch (error) {
      console.error(`Failed to load translations for ${locale}:`, error.message);
      // Fallback to English
      if (locale !== 'en') {
        return this.loadTranslations('en');
      }
      return {};
    }
  }

  /**
   * Get all translations for a locale
   * @param {string} locale - Locale code
   * @returns {Object} Translation dictionary
   */
  static getAllTranslations(locale) {
    return this.loadTranslations(locale);
  }

  /**
   * Translate a key with optional parameters
   * @param {string} key - Translation key
   * @param {string} locale - Locale code
   * @param {Object} params - Parameters to replace (e.g., {amount: '$10.00'})
   * @returns {string} Translated text
   */
  static translate(key, locale, params = {}) {
    const translations = this.loadTranslations(locale);
    let text = translations[key];

    // Fallback to English if translation not found
    if (!text && locale !== 'en') {
      const enTranslations = this.loadTranslations('en');
      text = enTranslations[key] || key;
    } else if (!text) {
      text = key;
    }

    // Replace parameters in the format %paramName%
    Object.keys(params).forEach(param => {
      const regex = new RegExp(`%${param}%`, 'g');
      text = text.replace(regex, params[param]);
    });

    return text;
  }

  /**
   * Get translation with alias 't'
   * @param {string} key - Translation key
   * @param {string} locale - Locale code
   * @param {Object} params - Parameters to replace
   * @returns {string} Translated text
   */
  static t(key, locale, params = {}) {
    return this.translate(key, locale, params);
  }
}

export default TranslationService;
