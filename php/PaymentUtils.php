<?php

declare(strict_types=1);

/**
 * Payment Utilities Class - GP API
 *
 * Provides utility functions for payment processing using Global Payments GP API.
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

use Dotenv\Dotenv;
use GlobalPayments\Api\Entities\Address;
use GlobalPayments\Api\Entities\Enums\Channel;
use GlobalPayments\Api\Entities\Enums\Environment;
use GlobalPayments\Api\Entities\Enums\TransactionStatus;
use GlobalPayments\Api\Entities\GpApi\AccessTokenInfo;
use GlobalPayments\Api\PaymentMethods\CreditCardData;
use GlobalPayments\Api\ServiceConfigs\Gateways\GpApiConfig;
use GlobalPayments\Api\ServicesContainer;

class PaymentUtils
{
    /**
     * Configure the Global Payments SDK (GP API)
     *
     * @param string|null $countryCode Country code for GP API (defaults to 'US')
     */
    public static function configureSdk(?string $countryCode = null): void
    {
        $dotenv = Dotenv::createImmutable(__DIR__);
        $dotenv->load();

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

        ServicesContainer::configureService($config);
    }

    /**
     * Sanitize postal code by removing invalid characters
     */
    public static function sanitizePostalCode(?string $postalCode): string
    {
        if ($postalCode === null) {
            return '';
        }

        $sanitized = preg_replace('/[^a-zA-Z0-9-]/', '', $postalCode);
        return substr($sanitized, 0, 10);
    }

    /**
     * Process payment using Global Payments SDK (GP API)
     *
     * @param string $token Payment token from client-side tokenization
     * @param float $amount Payment amount
     * @param string $currency Currency code (USD, EUR, GBP, etc.)
     * @param array $billingData Billing information including ZIP code
     * @param string|null $countryCode Country code for GP API configuration
     * @param array|null $dccData DCC rate data if user accepted currency conversion
     * @return array Payment result data
     */
    public static function processPaymentWithToken(string $token, float $amount, string $currency, array $billingData, ?string $countryCode = null, ?array $dccData = null): array
    {
        try {
            // Convert amount to minor units (cents) for GP API
            // GP API expects amounts in the smallest currency unit
            require_once __DIR__ . '/services/CurrencyConfig.php';
            $decimals = \Services\CurrencyConfig::getDecimals($currency);
            $amountMinor = (int) round($amount * pow(10, $decimals));
            
            $card = new CreditCardData();
            $card->token = $token;

            $address = new Address();
            $address->postalCode = self::sanitizePostalCode($billingData['billing_zip'] ?? '');

            // Build charge request with amount in minor units
            $chargeBuilder = $card->charge($amountMinor)
                ->withCurrency($currency)
                ->withAddress($address);

            // Add DCC rate data if provided (user accepted DCC)
            if ($dccData !== null && isset($dccData['dccId'])) {
                $dccRateData = new \GlobalPayments\Api\Entities\DccRateData();
                $dccRateData->dccId = $dccData['dccId'];
                
                // IMPORTANT: DCC amounts must be in minor units (cents) for the API
                // Frontend sends amounts in major units (dollars), so convert them back
                require_once __DIR__ . '/services/CurrencyConfig.php';
                $cardHolderDecimals = \Services\CurrencyConfig::getDecimals($dccData['cardHolderCurrency'] ?? 'USD');
                $merchantDecimals = \Services\CurrencyConfig::getDecimals($dccData['merchantCurrency'] ?? 'USD');
                
                // Convert from major units to minor units and round to whole numbers
                $dccRateData->cardHolderAmount = isset($dccData['cardHolderAmount']) 
                    ? (string) round($dccData['cardHolderAmount'] * pow(10, $cardHolderDecimals))
                    : null;
                $dccRateData->cardHolderCurrency = $dccData['cardHolderCurrency'] ?? null;
                $dccRateData->cardHolderRate = $dccData['exchangeRate'] ?? null;
                
                $dccRateData->merchantAmount = isset($dccData['merchantAmount']) 
                    ? (string) round($dccData['merchantAmount'] * pow(10, $merchantDecimals))
                    : null;
                $dccRateData->merchantCurrency = $dccData['merchantCurrency'] ?? null;
                $dccRateData->marginRatePercentage = $dccData['marginRatePercentage'] ?? null;
                
                // Log DCC data for debugging
                error_log('=== DCC Payment Request ===');
                error_log('Charge Amount (major units): ' . $amount . ' ' . $currency);
                error_log('Charge Amount (minor units): ' . $amountMinor . ' ' . $currency);
                error_log('DCC ID: ' . $dccRateData->dccId);
                error_log('Merchant Amount (minor units): ' . $dccRateData->merchantAmount . ' ' . $dccRateData->merchantCurrency);
                error_log('Merchant Amount (major units): ' . $dccData['merchantAmount'] . ' ' . $dccRateData->merchantCurrency);
                error_log('CardHolder Amount (minor units): ' . $dccRateData->cardHolderAmount . ' ' . $dccRateData->cardHolderCurrency);
                error_log('CardHolder Amount (major units): ' . $dccData['cardHolderAmount'] . ' ' . $dccRateData->cardHolderCurrency);
                error_log('Exchange Rate: ' . $dccRateData->cardHolderRate);
                error_log('Margin Rate: ' . $dccRateData->marginRatePercentage);
                
                $chargeBuilder = $chargeBuilder->withDccRateData($dccRateData);
            }

            error_log('Executing charge request...');
            $response = $chargeBuilder->execute();
            
            // Log the response details
            error_log('=== Payment Response ===');
            error_log('Response Code: ' . ($response->responseCode ?? 'NULL'));
            error_log('Response Message: ' . ($response->responseMessage ?? 'NULL'));
            error_log('Transaction Status: ' . ($response->transactionStatus ?? 'NULL'));
            error_log('Transaction ID: ' . ($response->transactionId ?? 'NULL'));
            
            // Log DCC data from response
            if ($response->dccRateData !== null) {
                error_log('=== Response DCC Data ===');
                error_log('DCC ID: ' . ($response->dccRateData->dccId ?? 'NULL'));
                error_log('CardHolder Amount: ' . ($response->dccRateData->cardHolderAmount ?? 'NULL'));
                error_log('CardHolder Currency: ' . ($response->dccRateData->cardHolderCurrency ?? 'NULL'));
                error_log('Merchant Amount: ' . ($response->dccRateData->merchantAmount ?? 'NULL'));
                error_log('Merchant Currency: ' . ($response->dccRateData->merchantCurrency ?? 'NULL'));
                error_log('Exchange Rate: ' . ($response->dccRateData->cardHolderRate ?? 'NULL'));
            } else {
                error_log('No DCC data in response');
            }

            // Validate GP API response
            if ($response->responseCode === 'SUCCESS' &&
                $response->responseMessage === TransactionStatus::CAPTURED) {

                // Extract card details from tokenization response
                $cardDetails = $billingData['cardDetails'] ?? null;

                $result = [
                    'transactionId' => $response->transactionId ?? 'txn_' . uniqid(),
                    'amount' => $amount,
                    'currency' => $currency,
                    'status' => 'captured',
                    'response_code' => $response->responseCode,
                    'response_message' => $response->responseMessage ?? 'Approved',
                    'timestamp' => date('c'),
                    'paymentMethod' => [
                        'brand' => isset($cardDetails['cardType']) ? ucfirst($cardDetails['cardType']) : 'Unknown',
                        'last4' => $cardDetails['cardLast4'] ?? '',
                        'expiryMonth' => $cardDetails['expiryMonth'] ?? '',
                        'expiryYear' => $cardDetails['expiryYear'] ?? '',
                        'cardholderName' => $cardDetails['cardholderName'] ?? ''
                    ],
                    'gateway_response' => [
                        'auth_code' => $response->authorizationCode ?? '',
                        'reference_number' => $response->referenceNumber ?? ''
                    ]
                ];

                // Include DCC information if it was actually used (user chose cardholder currency)
                // Note: GP API may return dccRateData even when DCC wasn't used, so check if it was requested
                if ($dccData !== null && $response->dccRateData !== null) {
                    // Convert DCC amounts from minor units to major units for display
                    // Use fallback to currency param if response currencies are null
                    $cardHolderCurrency = $response->dccRateData->cardHolderCurrency ?? $currency;
                    $merchantCurrency = $response->dccRateData->merchantCurrency ?? $currency;
                    
                    $cardHolderDecimals = \Services\CurrencyConfig::getDecimals($cardHolderCurrency);
                    $merchantDecimals = \Services\CurrencyConfig::getDecimals($merchantCurrency);
                    
                    // Calculate merchant amount - use response value if available, otherwise use transaction amount
                    $merchantAmountValue = $response->dccRateData->merchantAmount !== null 
                        ? $response->dccRateData->merchantAmount / pow(10, $merchantDecimals)
                        : $amount;
                    
                    $result['dccUsed'] = true;
                    $result['dccInfo'] = [
                        'cardHolderAmount' => $response->dccRateData->cardHolderAmount / pow(10, $cardHolderDecimals),
                        'cardHolderCurrency' => $cardHolderCurrency,
                        'exchangeRate' => $response->dccRateData->cardHolderRate,
                        'merchantAmount' => $merchantAmountValue,
                        'merchantCurrency' => $merchantCurrency
                    ];
                }

                return $result;
            } else {
                throw new \Exception('Payment failed: ' . ($response->responseMessage ?? 'Unknown error'));
            }
        } catch (\Exception $e) {
            throw $e;
        }
    }

    /**
     * Send success response
     *
     * @param mixed $data Response data
     * @param string $message Success message
     * @param string|null $locale Locale for response formatting
     */
    public static function sendSuccessResponse($data, string $message = 'Operation completed successfully', ?string $locale = null): void
    {
        http_response_code(200);

        $response = [
            'success' => true,
            'data' => $data,
            'message' => $message,
            'timestamp' => date('c')
        ];

        if ($locale) {
            $response['locale'] = $locale;
        }

        echo json_encode($response);
        exit();
    }

    /**
     * Send JSON response (generic helper)
     *
     * @param array $data Response data array
     * @param int $statusCode HTTP status code
     */
    public static function sendJsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        echo json_encode($data);
        exit();
    }

    /**
     * Send error response
     */
    public static function sendErrorResponse(int $statusCode, string $message, string $errorCode = null): void
    {
        http_response_code($statusCode);

        $response = [
            'success' => false,
            'message' => $message,
            'timestamp' => date('c')
        ];

        if ($errorCode) {
            $response['error_code'] = $errorCode;
        }

        echo json_encode($response);
        exit();
    }

    /**
     * Handle CORS headers
     */
    public static function handleCORS(): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Content-Type: application/json');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit();
        }
    }

    /**
     * Parse JSON input for POST requests
     */
    public static function parseJsonInput(): array
    {
        $inputData = [];
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $rawInput = file_get_contents('php://input');
            if ($rawInput) {
                $inputData = json_decode($rawInput, true) ?? [];
            }
            $inputData = array_merge($_POST, $inputData);
        }
        return $inputData;
    }
}
