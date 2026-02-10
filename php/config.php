<?php

declare(strict_types=1);

/**
 * Configuration Endpoint - GP API
 *
 * This script provides configuration information for the client-side SDK,
 * including GP API access token for frontend tokenization.
 *
 * PHP version 7.4 or higher
 *
 * @category  Configuration
 * @package   GlobalPayments_Sample
 * @author    Global Payments
 * @license   MIT License
 * @link      https://github.com/globalpayments
 */

require_once 'vendor/autoload.php';
require_once 'services/LocaleService.php';
require_once 'services/CurrencyConfig.php';

use Dotenv\Dotenv;
use GlobalPayments\Api\ServiceConfigs\Gateways\GpApiConfig;
use GlobalPayments\Api\ServicesContainer;
use GlobalPayments\Api\Entities\Enums\Environment;
use GlobalPayments\Api\Entities\Enums\Channel;
use GlobalPayments\Api\Services\GpApiService;
use GlobalPayments\Api\Entities\GpApi\AccessTokenInfo;
use Services\LocaleService;
use Services\CurrencyConfig;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

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

// Allow GET and POST methods
if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
    exit;
}

try {
    // Get current locale and currency (with detection and fallbacks)
    $currentLocale = LocaleService::getCurrentLocale();
    $currentCurrency = LocaleService::getCurrentCurrency();

    // Configure GP API to generate access token for client-side use
    $config = new GpApiConfig();
    $config->appId = $_ENV['GP_API_APP_ID'] ?? '';
    $config->appKey = $_ENV['GP_API_APP_KEY'] ?? '';
    $config->environment = Environment::TEST;
    $config->channel = Channel::CardNotPresent;
    // Use US country for demo credentials - they don't support all regions
    $config->country = 'US';
    
    // Set up access token info for DCC account
    $config->accessTokenInfo = new AccessTokenInfo();
    $config->accessTokenInfo->transactionProcessingAccountName = 'dcc';
    
    // Set permissions for client-side tokenization
    $config->permissions = ['PMT_POST_Create_Single'];
    
    // Set token expiration (10 minutes)
    $config->secondsToExpire = 600;

    // Configure service to establish connection
    ServicesContainer::configureService($config);

    // Generate session token for client-side tokenization
    $sessionToken = GpApiService::generateTransactionKey($config);

    if (is_object($sessionToken) && isset($sessionToken->accessToken)) {
        $accessToken = $sessionToken->accessToken;
    } else {
        throw new Exception('Invalid session token response format');
    }

    if (empty($accessToken)) {
        throw new Exception('Failed to generate session token');
    }

    // Return configuration with locale/currency info
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'accessToken' => $accessToken,
            'locale' => $currentLocale,
            'currency' => $currentCurrency,
            'supportedLocales' => LocaleService::getAllLocales(),
            'supportedCurrencies' => CurrencyConfig::getAllCurrencies()
        ],
        'message' => 'Configuration retrieved successfully',
        'timestamp' => date('c')
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading configuration: ' . $e->getMessage(),
        'error_code' => 'CONFIG_ERROR',
        'timestamp' => date('c')
    ]);
}
