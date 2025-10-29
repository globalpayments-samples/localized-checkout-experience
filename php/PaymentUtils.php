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
        $config->country = $countryCode ?? 'US';

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
     * @return array Payment result data
     */
    public static function processPaymentWithToken(string $token, float $amount, string $currency, array $billingData, ?string $countryCode = null): array
    {
        try {
            $card = new CreditCardData();
            $card->token = $token;

            $address = new Address();
            $address->postalCode = self::sanitizePostalCode($billingData['billing_zip'] ?? '');

            $response = $card->charge($amount)
                ->withCurrency($currency)
                ->withAddress($address)
                ->execute();

            // Validate GP API response
            if ($response->responseCode === 'SUCCESS' &&
                $response->responseMessage === TransactionStatus::CAPTURED) {

                // Extract card details from tokenization response
                $cardDetails = $billingData['cardDetails'] ?? null;

                return [
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
