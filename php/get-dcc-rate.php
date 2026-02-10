<?php

declare(strict_types=1);

/**
 * DCC Rate Lookup Script - GP API
 *
 * This script retrieves Dynamic Currency Conversion (DCC) rates for international cardholders.
 * It allows displaying currency conversion options before processing the payment.
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
use GlobalPayments\Api\PaymentMethods\CreditCardData;
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
    if (!isset($inputData['payment_token'], $inputData['amount'], $inputData['currency'])) {
        throw new ApiException(TranslationService::t('validation.required', [], $currentLocale));
    }

    $paymentToken = $inputData['payment_token'];
    $amountMajor = floatval($inputData['amount']); // Amount in major units (dollars)
    $currentCurrency = CurrencyConfig::validateCurrency($inputData['currency']);

    // Validate amount
    if ($amountMajor <= 0) {
        throw new ApiException(TranslationService::t('error.invalid_amount', [], $currentLocale));
    }

    // Validate currency is supported
    if (!CurrencyConfig::isSupported($currentCurrency)) {
        throw new ApiException(TranslationService::t('error.currency_not_supported', ['%currency%' => $currentCurrency], $currentLocale));
    }

    // Convert amount to minor units (cents) for GP API
    // GP API expects amounts in the smallest currency unit
    $decimals = CurrencyConfig::getDecimals($currentCurrency);
    $amountMinor = (int) round($amountMajor * pow(10, $decimals));

    // Get country code for currency (for GP API configuration)
    $countryCode = CurrencyConfig::getCountryCode($currentCurrency);

    // Initialize SDK with dynamic country configuration
    PaymentUtils::configureSdk($countryCode);

    // Create card instance with token
    $card = new CreditCardData();
    $card->token = $inputData['payment_token'];

    // Get DCC rate information (send amount in minor units)
    $dccDetails = $card->getDccRate()
        ->withAmount($amountMinor)
        ->withCurrency($currentCurrency)
        ->execute();

    // Check if DCC is available for this card
    if ($dccDetails->responseMessage === 'AVAILABLE' && $dccDetails->dccRateData !== null) {
        $dccData = $dccDetails->dccRateData;
        
        // Convert amounts from minor units (cents) to major units (dollars)
        // GP API returns amounts in minor units (smallest currency unit)
        $merchantCurrencyDecimals = CurrencyConfig::getDecimals($dccData->merchantCurrency);
        $cardHolderCurrencyDecimals = CurrencyConfig::getDecimals($dccData->cardHolderCurrency);
        
        $merchantAmountMajor = $dccData->merchantAmount / pow(10, $merchantCurrencyDecimals);
        $cardHolderAmountMajor = $dccData->cardHolderAmount / pow(10, $cardHolderCurrencyDecimals);
        
        // Log DCC rate response for debugging
        error_log('=== DCC Rate Lookup Response ===');
        error_log('Amount requested (major): ' . $amountMajor . ' ' . $currentCurrency);
        error_log('Amount sent to API (minor): ' . $amountMinor . ' ' . $currentCurrency);
        error_log('Merchant Amount (minor units): ' . $dccData->merchantAmount . ' ' . $dccData->merchantCurrency);
        error_log('Merchant Amount (major units): ' . $merchantAmountMajor . ' ' . $dccData->merchantCurrency);
        error_log('CardHolder Amount (minor units): ' . $dccData->cardHolderAmount . ' ' . $dccData->cardHolderCurrency);
        error_log('CardHolder Amount (major units): ' . $cardHolderAmountMajor . ' ' . $dccData->cardHolderCurrency);
        error_log('Exchange Rate: ' . $dccData->cardHolderRate);
        error_log('Margin Rate: ' . $dccData->marginRatePercentage);
        error_log('DCC ID: ' . $dccData->dccId);
        
        PaymentUtils::sendJsonResponse([
            'success' => true,
            'dccAvailable' => true,
            'data' => [
                'merchantAmount' => $merchantAmountMajor,
                'merchantCurrency' => $dccData->merchantCurrency,
                'cardHolderAmount' => $cardHolderAmountMajor,
                'cardHolderCurrency' => $dccData->cardHolderCurrency,
                'exchangeRate' => $dccData->cardHolderRate,
                'marginRatePercentage' => $dccData->marginRatePercentage,
                'exchangeRateSource' => $dccData->exchangeRateSourceName,
                'commissionPercentage' => $dccData->commissionPercentage,
                'dccId' => $dccData->dccId
            ],
            'message' => 'DCC rate retrieved successfully',
            'timestamp' => date('c')
        ]);
    } else {
        // DCC not available for this card
        PaymentUtils::sendJsonResponse([
            'success' => true,
            'dccAvailable' => false,
            'message' => 'DCC not available for this card',
            'timestamp' => date('c')
        ]);
    }

} catch (ApiException $e) {
    // Check if this is a "not allowed" error (common for cards that don't support DCC)
    $errorMessage = $e->getMessage();
    $errorCode = $e->getCode();
    
    if (strpos($errorMessage, 'not allowed') !== false || 
        strpos($errorMessage, 'not available') !== false ||
        $errorCode == 502) {
        
        // DCC not available - return success with dccAvailable: false
        PaymentUtils::sendJsonResponse([
            'success' => true,
            'dccAvailable' => false,
            'message' => 'DCC not available for this card/currency combination',
            'timestamp' => date('c')
        ]);
    } else {
        // Handle DCC lookup errors with localized message
        $currentLocale = LocaleService::getCurrentLocale();
        $localizedMessage = TranslationService::t('error.payment_failed', ['%message%' => $errorMessage], $currentLocale);
        PaymentUtils::sendErrorResponse(500, $localizedMessage, 'DCC_ERROR');
    }
} catch (Exception $e) {
    // Handle general errors
    $currentLocale = LocaleService::getCurrentLocale();
    $errorMessage = TranslationService::t('error.general', [], $currentLocale);
    PaymentUtils::sendErrorResponse(500, $errorMessage . ': ' . $e->getMessage(), 'SERVER_ERROR');
}
