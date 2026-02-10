<?php

declare(strict_types=1);

/**
 * Card Payment Processing Script - GP API
 *
 * This script demonstrates card payment processing using the Global Payments GP API SDK.
 * It handles tokenized card data and billing information to process payments
 * securely through the Global Payments API.
 *
 * PHP version 7.4 or higher
 *
 * @category  Payment_Processing
 * @package   GlobalPayments_Sample
 * @author    Global Payments
 * @license   MIT License
 * @link      https://github.com/globalpayments
 */

require_once 'vendor/autoload.php';
require_once 'PaymentUtils.php';
require_once 'services/LocaleService.php';
require_once 'services/CurrencyConfig.php';
require_once 'services/TranslationService.php';

use GlobalPayments\Api\Entities\Exceptions\ApiException;
use Services\LocaleService;
use Services\CurrencyConfig;
use Services\TranslationService;

ini_set('display_errors', '0');

// Handle CORS first
PaymentUtils::handleCORS();

try {
    // Parse JSON input
    $inputData = PaymentUtils::parseJsonInput();

    // Handle locale and currency from request
    $locale = $inputData['locale'] ?? null;
    $currency = $inputData['currency'] ?? null;

    // Update session with user preferences
    if ($locale) {
        LocaleService::setSessionLocale($locale);
    }
    if ($currency) {
        LocaleService::setSessionCurrency($currency);
    }

    // Get current locale and currency (with fallbacks)
    $currentLocale = LocaleService::getCurrentLocale();
    $currentCurrency = $currency ? CurrencyConfig::validateCurrency($currency) : LocaleService::getCurrentCurrency();

    // Validate required fields
    if (!isset($inputData['payment_token'], $inputData['billing_zip'], $inputData['amount'])) {
        throw new ApiException(TranslationService::t('error.general', [], $currentLocale));
    }

    // Validate currency
    if (!CurrencyConfig::isSupported($currentCurrency)) {
        throw new ApiException(TranslationService::t('error.currency_not_supported', ['%currency%' => $currentCurrency], $currentLocale));
    }

    // Parse and validate amount
    $amount = floatval($inputData['amount']);
    if ($amount <= 0) {
        throw new ApiException(TranslationService::t('error.invalid_amount', [], $currentLocale));
    }

    // Get country code for currency (for GP API configuration)
    $countryCode = CurrencyConfig::getCountryCode($currentCurrency);

    // Initialize SDK with dynamic country configuration
    PaymentUtils::configureSdk($countryCode);

    // Get DCC data if provided
    $dccData = $inputData['dccData'] ?? null;

    // Process payment using GP API with dynamic currency and country
    $result = PaymentUtils::processPaymentWithToken(
        $inputData['payment_token'],
        $amount,
        $currentCurrency,
        $inputData,
        $countryCode,
        $dccData
    );

    // Send success response with localized message
    $successMessage = TranslationService::t('message.success', [], $currentLocale);
    PaymentUtils::sendSuccessResponse($result, $successMessage, $currentLocale);

} catch (ApiException $e) {
    // Handle payment processing errors with localized message
    $currentLocale = LocaleService::getCurrentLocale();
    $errorMessage = TranslationService::t('error.payment_failed', ['%message%' => $e->getMessage()], $currentLocale);
    PaymentUtils::sendErrorResponse(400, $errorMessage, 'API_ERROR');
} catch (Exception $e) {
    // Handle general errors
    $currentLocale = LocaleService::getCurrentLocale();
    $errorMessage = TranslationService::t('error.general', [], $currentLocale);
    PaymentUtils::sendErrorResponse(500, $errorMessage, 'SERVER_ERROR');
}
