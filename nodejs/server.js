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
import {
    ServicesContainer,
    GpApiConfig,
    GpApiService,
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

/**
 * Get GP API environment from configuration
 * Defaults to TEST if not specified or invalid
 */
function getGpEnvironment() {
    const envValue = process.env.GP_API_ENVIRONMENT?.toLowerCase();
    if (envValue === 'production' || envValue === 'prod') {
        return Environment.PRODUCTION;
    }
    return Environment.TEST;
}

/**
 * Get session secret with production validation
 */
function getSessionSecret() {
    if (process.env.SESSION_SECRET) {
        return process.env.SESSION_SECRET;
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET environment variable must be set in production');
    }
    console.warn('Warning: Using default session secret. Set SESSION_SECRET in production.');
    return 'dev-only-session-secret-key';
}

// Middleware
app.use(cors());
app.use(express.static('.'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware for locale/currency persistence
app.use(session({
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

/**
 * POST /config - Generate GP API access token for frontend tokenization using SDK
 */
app.post('/config', async (req, res) => {
    try {
        // Get current locale and currency (with detection and fallbacks)
        const acceptLanguage = req.headers['accept-language'];
        const currentLocale = LocaleService.getCurrentLocale(req.session, acceptLanguage);
        const currentCurrency = LocaleService.getCurrentCurrency(req.session, acceptLanguage);

        // Configure GP API to generate access token for client-side use
        const config = new GpApiConfig();
        config.appId = process.env.GP_API_APP_ID || '';
        config.appKey = process.env.GP_API_APP_KEY || '';
        config.environment = getGpEnvironment();
        config.channel = Channel.CardNotPresent;
        config.country = 'US';
        config.permissions = ['PMT_POST_Create_Single'];
        config.secondsToExpire = 600;

        // Generate access token using SDK
        const accessTokenInfo = await GpApiService.generateTransactionKey(config);

        if (!accessTokenInfo || !accessTokenInfo.accessToken) {
            throw new Error('Failed to generate access token');
        }

        res.json({
            success: true,
            data: {
                accessToken: accessTokenInfo.accessToken,
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
 * POST /get-dcc-rate - Get Dynamic Currency Conversion rate for international cardholders
 */
app.post('/get-dcc-rate', async (req, res) => {
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
        if (!payment_token || !amount || !currency) {
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
        const chargeCurrency = CurrencyConfig.validateCurrency(currency);
        if (!CurrencyConfig.isSupported(chargeCurrency)) {
            const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);
            return res.status(400).json({
                success: false,
                message: TranslationService.t('error.currency_not_supported', currentLocale, { currency: chargeCurrency }),
                error_code: 'VALIDATION_ERROR',
                timestamp: new Date().toISOString()
            });
        }

        // Get country code based on currency for proper routing
        const countryCode = CurrencyConfig.getCountryCode(chargeCurrency);

        // Configure SDK for DCC rate lookup
        const dccConfig = new GpApiConfig();
        dccConfig.appId = process.env.GP_API_APP_ID || '';
        dccConfig.appKey = process.env.GP_API_APP_KEY || '';
        dccConfig.environment = getGpEnvironment();
        dccConfig.channel = Channel.CardNotPresent;
        dccConfig.country = countryCode;

        ServicesContainer.configureService(dccConfig);

        const card = new CreditCardData();
        card.token = payment_token;

        // Get DCC rate information
        const dccDetails = await card.getDccRate()
            .withAmount(chargeAmount)
            .withCurrency(chargeCurrency)
            .execute();

        // Check if DCC is available for this card
        if (dccDetails.responseMessage === 'AVAILABLE' && dccDetails.dccRateData) {
            const dccData = dccDetails.dccRateData;
            
            // Log DCC rate response for debugging
            console.log('=== DCC Rate Lookup Response ===');
            console.log(`Amount requested: ${chargeAmount} ${chargeCurrency}`);
            console.log(`Merchant Amount: ${dccData.merchantAmount} ${dccData.merchantCurrency}`);
            console.log(`CardHolder Amount: ${dccData.cardHolderAmount} ${dccData.cardHolderCurrency}`);
            console.log(`Exchange Rate: ${dccData.cardHolderRate}`);
            console.log(`Margin Rate: ${dccData.marginRatePercentage}`);
            console.log(`DCC ID: ${dccData.dccId}`);
            
            res.json({
                success: true,
                dccAvailable: true,
                data: {
                    merchantAmount: dccData.merchantAmount,
                    merchantCurrency: dccData.merchantCurrency,
                    cardHolderAmount: dccData.cardHolderAmount,
                    cardHolderCurrency: dccData.cardHolderCurrency,
                    exchangeRate: dccData.cardHolderRate,
                    marginRatePercentage: dccData.marginRatePercentage,
                    exchangeRateSource: dccData.exchangeRateSourceName,
                    commissionPercentage: dccData.commissionPercentage,
                    dccId: dccData.dccId
                },
                message: 'DCC rate retrieved successfully',
                timestamp: new Date().toISOString()
            });
        } else {
            // DCC not available for this card
            res.json({
                success: true,
                dccAvailable: false,
                message: 'DCC not available for this card',
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);
        
        // Check if this is a "not allowed" error (common for cards that don't support DCC)
        const errorMessage = error.message || '';
        if (errorMessage.toLowerCase().includes('not allowed') ||
            errorMessage.toLowerCase().includes('not available') ||
            errorMessage.includes('502')) {
            
            // DCC not available - return success with dccAvailable: false
            return res.json({
                success: true,
                dccAvailable: false,
                message: 'DCC not available for this card/currency combination',
                timestamp: new Date().toISOString()
            });
        }
        
        res.status(500).json({
            success: false,
            dccAvailable: false,
            message: TranslationService.t('error.payment_failed', currentLocale, { message: errorMessage }),
            error_code: 'DCC_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /process-payment - Process payment using GP API token with per-request SDK reconfiguration
 */
app.post('/process-payment', async (req, res) => {
    try {
        const { payment_token, amount, currency, locale, dccData } = req.body;

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

        // Get country code based on currency for proper routing
        const countryCode = CurrencyConfig.getCountryCode(chargeCurrency);

        // Reconfigure SDK per-request - minimal config matching PHP PaymentUtils::configureSdk()
        // No Permissions set for payment processing (only for token generation in /config)
        const paymentConfig = new GpApiConfig();
        paymentConfig.appId = process.env.GP_API_APP_ID || '';
        paymentConfig.appKey = process.env.GP_API_APP_KEY || '';
        paymentConfig.environment = getGpEnvironment();
        paymentConfig.channel = Channel.CardNotPresent;
        paymentConfig.country = countryCode;

        ServicesContainer.configureService(paymentConfig);

        const card = new CreditCardData();
        card.token = payment_token;

        // Build charge request
        let chargeBuilder = card.charge(chargeAmount).withCurrency(chargeCurrency);
        
        // Add DCC rate data if provided (user accepted DCC)
        if (dccData && dccData.dccId) {
            const { DccRateData } = await import('globalpayments-api');
            const dccRateData = new DccRateData();
            dccRateData.dccId = dccData.dccId;
            
            // Round amounts to whole numbers (minor units must be integers)
            dccRateData.cardHolderAmount = Math.round(dccData.cardHolderAmount);
            dccRateData.cardHolderCurrency = dccData.cardHolderCurrency;
            dccRateData.cardHolderRate = dccData.exchangeRate;
            dccRateData.merchantAmount = Math.round(dccData.merchantAmount);
            dccRateData.merchantCurrency = dccData.merchantCurrency;
            dccRateData.marginRatePercentage = dccData.marginRatePercentage;
            
            // Log DCC data for debugging
            console.log('=== DCC Payment Request ===');
            console.log(`Charge Amount: ${chargeAmount} ${chargeCurrency}`);
            console.log(`DCC ID: ${dccRateData.dccId}`);
            console.log(`Merchant Amount: ${dccRateData.merchantAmount} ${dccRateData.merchantCurrency}`);
            console.log(`CardHolder Amount: ${dccRateData.cardHolderAmount} ${dccRateData.cardHolderCurrency}`);
            console.log(`Exchange Rate: ${dccRateData.cardHolderRate}`);
            console.log(`Margin Rate: ${dccRateData.marginRatePercentage}`);
            
            chargeBuilder = chargeBuilder.withDccRateData(dccRateData);
        }

        const response = await chargeBuilder.execute();

        // Simplified validation: check for 00 or SUCCESS response code
        if (response.responseCode === '00' || response.responseCode === 'SUCCESS') {
            const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);
            const successMessage = TranslationService.t('message.success', currentLocale);

            // Simplified response structure
            const responseData = {
                transactionId: response.transactionId || 'txn_' + Date.now(),
                amount: chargeAmount,
                currency: chargeCurrency,
                status: response.responseMessage,
                reference: response.referenceNumber || '',
                timestamp: new Date().toISOString()
            };

            // Include DCC information if it was used
            if (response.dccRateData) {
                responseData.dccUsed = true;
                responseData.dccInfo = {
                    cardHolderAmount: response.dccRateData.cardHolderAmount,
                    cardHolderCurrency: response.dccRateData.cardHolderCurrency,
                    exchangeRate: response.dccRateData.cardHolderRate,
                    merchantAmount: response.dccRateData.merchantAmount,
                    merchantCurrency: response.dccRateData.merchantCurrency
                };
            }

            res.json({
                success: true,
                data: responseData,
                message: successMessage,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Transaction declined: ' + (response.responseMessage || 'Unknown error'));
        }

    } catch (error) {
        const currentLocale = LocaleService.getCurrentLocale(req.session, req.headers['accept-language']);

        // Determine appropriate status code and error code based on error type
        let statusCode = 500;
        let errorCode = 'SERVER_ERROR';

        const errorMessage = error.message || '';
        if (errorMessage.includes('declined') || errorMessage.includes('Declined')) {
            statusCode = 400;
            errorCode = 'PAYMENT_DECLINED';
        } else if (errorMessage.includes('Invalid') || errorMessage.includes('Missing')) {
            statusCode = 400;
            errorCode = 'VALIDATION_ERROR';
        } else if (error.name === 'ApiException' || error.name === 'GatewayException') {
            statusCode = 400;
            errorCode = 'API_ERROR';
        }

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
    const envName = process.env.GP_API_ENVIRONMENT === 'production' ? 'PRODUCTION' : 'SANDBOX';
    console.log(`Server running at http://localhost:${port}`);
    console.log(`GP API Environment: ${envName}`);
    console.log('GP API card payment processing with localization ready');
    console.log(`Supported locales: ${LocaleService.getSupportedCodes().join(', ')}`);
    console.log(`Supported currencies: ${CurrencyConfig.getSupportedCodes().join(', ')}`);
});
