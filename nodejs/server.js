/**
 * Global Payments GP API - Node.js
 *
 * Card payment processing using Global Payments GP API with client-side tokenization.
 * Includes multi-language and multi-currency support.
 */

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import * as dotenv from 'dotenv';
import crypto from 'crypto';
import {
    ServicesContainer,
    GpApiConfig,
    CreditCardData,
    Channel,
    Environment
} from 'globalpayments-api';
import LocaleService from './services/LocaleService.js';
import CurrencyConfig from './services/CurrencyConfig.js';
import TranslationService from './services/TranslationService.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.static('.'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware for locale/currency persistence
app.use(session({
    secret: process.env.SESSION_SECRET || 'gp-api-localization-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

/**
 * Configure GP API SDK
 */
function configureGpApi() {
    const config = new GpApiConfig();
    config.appId = process.env.GP_API_APP_ID || '';
    config.appKey = process.env.GP_API_APP_KEY || '';
    config.environment = Environment.TEST;
    config.channel = Channel.CardNotPresent;
    config.country = 'US';

    ServicesContainer.configureService(config);
}

// Initialize SDK
configureGpApi();

/**
 * POST /config - Generate GP API access token for frontend tokenization using manual HTTP request
 */
app.post('/config', async (req, res) => {
    try {
        // Get current locale and currency (with detection and fallbacks)
        const acceptLanguage = req.headers['accept-language'];
        const currentLocale = LocaleService.getCurrentLocale(req.session, acceptLanguage);
        const currentCurrency = LocaleService.getCurrentCurrency(req.session, acceptLanguage);

        // Generate nonce and secret for manual token request
        const nonce = crypto.randomBytes(16).toString('hex');
        const secret = crypto.createHash('sha512')
            .update(nonce + process.env.GP_API_APP_KEY)
            .digest('hex');

        const tokenRequest = {
            app_id: process.env.GP_API_APP_ID,
            nonce: nonce,
            secret: secret,
            grant_type: 'client_credentials',
            seconds_to_expire: 600,
            permissions: ['PMT_POST_Create_Single']
        };

        // Determine API endpoint (always sandbox/TEST for now)
        const apiEndpoint = 'https://apis.sandbox.globalpay.com/ucp/accesstoken';

        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-GP-Version': '2021-03-22'
            },
            body: JSON.stringify(tokenRequest)
        });

        const data = await response.json();

        if (!response.ok || !data.token) {
            throw new Error(data.error_description || 'Failed to generate access token');
        }

        res.json({
            success: true,
            data: {
                accessToken: data.token,
                locale: currentLocale,
                currency: currentCurrency,
                supportedLocales: LocaleService.getAllLocales(),
                supportedCurrencies: CurrencyConfig.getAllCurrencies()
            },
            message: 'Configuration retrieved successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error loading configuration: ' + error.message,
            error_code: 'CONFIG_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /process-payment - Process payment using GP API token with per-request SDK reconfiguration
 */
app.post('/process-payment', async (req, res) => {
    try {
        const { payment_token, amount, currency, locale } = req.body;

        // Update session with user preferences
        if (locale) {
            LocaleService.setSessionLocale(req.session, locale);
        }
        if (currency) {
            LocaleService.setSessionCurrency(req.session, currency);
        }

        // Validate required fields
        if (!payment_token || !amount) {
            const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);
            return res.status(400).json({
                success: false,
                message: TranslationService.t('validation.required', currentLocale),
                error_code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString()
            });
        }

        const chargeAmount = parseFloat(amount);
        if (chargeAmount <= 0) {
            const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);
            return res.status(400).json({
                success: false,
                message: TranslationService.t('error.invalid_amount', currentLocale),
                error_code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString()
            });
        }

        // Validate currency
        const chargeCurrency = CurrencyConfig.validateCurrency(currency || 'USD');
        if (!CurrencyConfig.isSupported(chargeCurrency)) {
            const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);
            return res.status(400).json({
                success: false,
                message: TranslationService.t('error.currency_not_supported', currentLocale, { currency: chargeCurrency }),
                error_code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString()
            });
        }

        // FIX: Reconfigure SDK per-request with dynamic country based on currency
        const countryCode = CurrencyConfig.getCountryCode(chargeCurrency);
        const paymentConfig = new GpApiConfig();
        paymentConfig.appId = process.env.GP_API_APP_ID || '';
        paymentConfig.appKey = process.env.GP_API_APP_KEY || '';
        paymentConfig.environment = Environment.TEST;
        paymentConfig.channel = Channel.CardNotPresent;
        paymentConfig.country = countryCode; // Dynamic country
        paymentConfig.permissions = ['PMT_POST_Create_Single'];

        ServicesContainer.configureService(paymentConfig);

        const card = new CreditCardData();
        card.token = payment_token;

        const response = await card.charge(chargeAmount)
            .withCurrency(chargeCurrency)
            .execute();

        // Simplified validation: check for 00 or SUCCESS response code
        if (response.responseCode === '00' || response.responseCode === 'SUCCESS') {
            const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);
            const successMessage = TranslationService.t('message.success', currentLocale);

            // Simplified response structure
            res.json({
                success: true,
                data: {
                    transactionId: response.transactionId || 'txn_' + Date.now(),
                    amount: chargeAmount,
                    currency: chargeCurrency,
                    status: response.responseMessage,
                    reference: response.referenceNumber || '',
                    timestamp: new Date().toISOString()
                },
                message: successMessage,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Transaction declined: ' + (response.responseMessage || 'Unknown error'));
        }

    } catch (error) {
        const statusCode = error.message?.includes('required') ? 400 : 500;
        const errorCode = statusCode === 400 ? 'API_ERROR' : 'SERVER_ERROR';
        const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);

        res.status(statusCode).json({
            success: false,
            message: TranslationService.t('error.payment_failed', currentLocale, { message: error.message }),
            error_code: errorCode,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /api/locale - Get current locale and currency settings
 */
app.get('/api/locale', (req, res) => {
    try {
        const acceptLanguage = req.headers['accept-language'];
        const currentLocale = LocaleService.getCurrentLocale(req.session, acceptLanguage);
        const currentCurrency = LocaleService.getCurrentCurrency(req.session, acceptLanguage);

        res.json({
            success: true,
            data: {
                locale: currentLocale,
                currency: currentCurrency,
                translations: TranslationService.getAllTranslations(currentLocale),
                supportedLocales: LocaleService.getAllLocales(),
                supportedCurrencies: CurrencyConfig.getAllCurrencies()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving locale: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/locale - Update locale and/or currency preferences
 */
app.post('/api/locale', (req, res) => {
    try {
        const { locale, currency } = req.body;

        if (locale) {
            LocaleService.setSessionLocale(req.session, locale);
        }

        if (currency) {
            LocaleService.setSessionCurrency(req.session, currency);
        }

        const acceptLanguage = req.headers['accept-language'];
        const currentLocale = LocaleService.getCurrentLocale(req.session, acceptLanguage);
        const currentCurrency = LocaleService.getCurrentCurrency(req.session, acceptLanguage);

        res.json({
            success: true,
            data: {
                locale: currentLocale,
                currency: currentCurrency,
                translations: TranslationService.getAllTranslations(currentLocale)
            },
            message: 'Locale preferences updated',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating locale: ' + error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('GP API card payment processing with localization ready');
    console.log(`Supported locales: ${LocaleService.getSupportedCodes().join(', ')}`);
    console.log(`Supported currencies: ${CurrencyConfig.getSupportedCodes().join(', ')}`);
});
