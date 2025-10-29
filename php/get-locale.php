<?php

declare(strict_types=1);

/**
 * Locale Management Endpoint
 *
 * This script handles locale and currency preference management.
 * It supports both GET (retrieve current settings) and POST (update settings).
 *
 * PHP version 7.4 or higher
 *
 * @category  Localization
 * @package   GlobalPayments_Sample
 * @author    Global Payments
 * @license   MIT License
 * @link      https://github.com/globalpayments
 */

require_once 'vendor/autoload.php';
require_once 'services/LocaleService.php';
require_once 'services/CurrencyConfig.php';
require_once 'services/TranslationService.php';

use Services\LocaleService;
use Services\CurrencyConfig;
use Services\TranslationService;

// Set response headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        // Get current locale and currency
        $currentLocale = LocaleService::getCurrentLocale();
        $currentCurrency = LocaleService::getCurrentCurrency();

        // Get all translations for current locale
        $translations = TranslationService::getAllTranslations($currentLocale);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'locale' => $currentLocale,
                'currency' => $currentCurrency,
                'supportedLocales' => LocaleService::getAllLocales(),
                'supportedCurrencies' => CurrencyConfig::getAllCurrencies(),
                'translations' => $translations
            ],
            'message' => 'Locale settings retrieved successfully',
            'timestamp' => date('c')
        ]);

    } elseif ($method === 'POST') {
        // Parse JSON input
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON input');
        }

        // Update locale if provided
        if (isset($data['locale'])) {
            $locale = LocaleService::validateLocale($data['locale']);
            LocaleService::setSessionLocale($locale);
        }

        // Update currency if provided
        if (isset($data['currency'])) {
            $currency = CurrencyConfig::validateCurrency($data['currency']);
            LocaleService::setSessionCurrency($currency);
        }

        // Get updated settings
        $currentLocale = LocaleService::getCurrentLocale();
        $currentCurrency = LocaleService::getCurrentCurrency();
        $translations = TranslationService::getAllTranslations($currentLocale);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'locale' => $currentLocale,
                'currency' => $currentCurrency,
                'translations' => $translations
            ],
            'message' => 'Locale settings updated successfully',
            'timestamp' => date('c')
        ]);

    } else {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed',
            'error_code' => 'METHOD_NOT_ALLOWED'
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage(),
        'error_code' => 'SERVER_ERROR',
        'timestamp' => date('c')
    ]);
}
