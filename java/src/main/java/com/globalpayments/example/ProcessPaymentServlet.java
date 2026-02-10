package com.globalpayments.example;

import com.global.api.ServicesContainer;
import com.global.api.entities.Transaction;
import com.global.api.entities.DccRateData;
import com.global.api.entities.enums.Channel;
import com.global.api.entities.enums.Environment;
import com.global.api.entities.exceptions.ApiException;
import com.global.api.entities.exceptions.ConfigurationException;
import com.global.api.paymentMethods.CreditCardData;
import com.global.api.serviceConfigs.GpApiConfig;
import com.global.api.services.GpApiService;
import com.globalpayments.example.services.CurrencyConfig;
import com.globalpayments.example.services.LocaleService;
import com.globalpayments.example.services.TranslationService;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.stream.Collectors;

/**
 * Global Payments GP API - Java
 *
 * Card payment processing using Global Payments GP API with client-side tokenization.
 */

@WebServlet(urlPatterns = {"/process-payment", "/config"})
public class ProcessPaymentServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private final Dotenv dotenv = Dotenv.load();

    /**
     * Initializes the servlet and configures the Global Payments SDK.
     */
    @Override
    public void init() throws ServletException {
        try {
            GpApiConfig config = new GpApiConfig();
            config.setAppId(dotenv.get("GP_API_APP_ID"));
            config.setAppKey(dotenv.get("GP_API_APP_KEY"));
            config.setEnvironment(Environment.TEST);
            config.setChannel(Channel.CardNotPresent);
            config.setCountry("US");

            ServicesContainer.configureService(config);
        } catch (ConfigurationException e) {
            throw new ServletException("Failed to configure Global Payments SDK", e);
        }
    }

    /**
     * Handles POST requests to /config endpoint.
     * Generates GP API access token for frontend tokenization using manual HTTP request.
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        setCORSHeaders(response);
        response.setContentType("application/json");

        String path = request.getServletPath();

        if ("/config".equals(path)) {
            handleGetConfig(request, response);
        } else if ("/process-payment".equals(path)) {
            handleProcessPayment(request, response);
        }
    }

    /**
     * Handles /config endpoint
     * Generates access token using SDK
     */
    private void handleGetConfig(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try {
            // Get current locale and currency (with detection and fallbacks)
            HttpSession session = request.getSession(true);
            String acceptLanguage = request.getHeader("Accept-Language");
            String currentLocale = LocaleService.getCurrentLocale(session, acceptLanguage);
            String currentCurrency = LocaleService.getCurrentCurrency(session, acceptLanguage);
            String countryCode = CurrencyConfig.getCountryCode(currentCurrency);

            // Configure GP API to generate access token for client-side use
            GpApiConfig config = new GpApiConfig();
            config.setAppId(dotenv.get("GP_API_APP_ID"));
            config.setAppKey(dotenv.get("GP_API_APP_KEY"));
            config.setEnvironment(Environment.TEST);
            config.setChannel(Channel.CardNotPresent);
            config.setCountry(countryCode);
            config.setPermissions(new String[]{"PMT_POST_Create_Single"});
            config.setSecondsToExpire(600);

            // Generate access token using SDK
            var accessTokenInfo = GpApiService.generateTransactionKey(config);

            if (accessTokenInfo == null || accessTokenInfo.getAccessToken() == null) {
                throw new Exception("Failed to generate access token");
            }

            JSONObject responseObj = new JSONObject();
            responseObj.put("success", true);

            JSONObject dataObj = new JSONObject();
            dataObj.put("accessToken", accessTokenInfo.getAccessToken());
            dataObj.put("locale", currentLocale);
            dataObj.put("currency", currentCurrency);
            dataObj.put("supportedLocales", convertLocalesToJSON(LocaleService.getAllLocales()));
            dataObj.put("supportedCurrencies", convertCurrenciesToJSON(CurrencyConfig.getAllCurrencies()));
            responseObj.put("data", dataObj);

            responseObj.put("message", "Configuration retrieved successfully");
            responseObj.put("timestamp", Instant.now().toString());

            response.getWriter().write(responseObj.toString());

        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JSONObject errorObj = new JSONObject();
            errorObj.put("success", false);
            errorObj.put("message", "Error loading configuration: " + e.getMessage());
            errorObj.put("error_code", "CONFIG_ERROR");
            errorObj.put("timestamp", Instant.now().toString());
            response.getWriter().write(errorObj.toString());
        }
    }

    /**
     * Handles OPTIONS requests for CORS preflight.
     */
    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setCORSHeaders(response);
        response.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * Sets CORS headers for cross-origin requests.
     */
    private void setCORSHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    /**
     * Handles /process-payment endpoint
     * Processes payment using GP API token with per-request SDK reconfiguration
     */
    private void handleProcessPayment(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try {
            // Parse JSON request body
            BufferedReader reader = request.getReader();
            String requestBody = reader.lines().collect(Collectors.joining());
            JSONObject requestData = new JSONObject(requestBody);

            String paymentToken = requestData.optString("payment_token", "");
            String currency = requestData.optString("currency", "USD");
            BigDecimal amount = requestData.optBigDecimal("amount", BigDecimal.ZERO);

            if (paymentToken.isEmpty() || amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ApiException("Missing required fields");
            }

            // Validate currency and get country code
            String validatedCurrency = CurrencyConfig.validateCurrency(currency);
            String countryCode = CurrencyConfig.getCountryCode(validatedCurrency);

            // Reconfigure SDK per-request with dynamic country based on currency
            // Minimal config matching PHP PaymentUtils::configureSdk() - no Permissions
            GpApiConfig paymentConfig = new GpApiConfig();
            paymentConfig.setAppId(dotenv.get("GP_API_APP_ID"));
            paymentConfig.setAppKey(dotenv.get("GP_API_APP_KEY"));
            paymentConfig.setEnvironment(Environment.TEST);
            paymentConfig.setChannel(Channel.CardNotPresent);
            paymentConfig.setCountry(countryCode);

            ServicesContainer.configureService(paymentConfig);

            CreditCardData card = new CreditCardData();
            card.setToken(paymentToken);

            // Build charge request
            var chargeBuilder = card.charge(amount).withCurrency(validatedCurrency);

            // Add DCC rate data if provided (user accepted DCC)
            if (requestData.has("dccData") && !requestData.isNull("dccData")) {
                JSONObject dccDataJson = requestData.getJSONObject("dccData");
                
                DccRateData dccRateData = new DccRateData();
                dccRateData.setDccId(dccDataJson.optString("dccId"));
                
                // Parse cardHolderAmount - handle both number and string from JSON
                BigDecimal cardHolderAmount;
                try {
                    cardHolderAmount = dccDataJson.getBigDecimal("cardHolderAmount");
                } catch (Exception e) {
                    cardHolderAmount = new BigDecimal(dccDataJson.optString("cardHolderAmount", "0"));
                }
                // Round to whole number (minor units must be integers)
                cardHolderAmount = cardHolderAmount.setScale(0, java.math.RoundingMode.HALF_UP);
                dccRateData.setCardHolderAmount(cardHolderAmount);
                
                dccRateData.setCardHolderCurrency(dccDataJson.optString("cardHolderCurrency"));
                dccRateData.setCardHolderRate(dccDataJson.optString("exchangeRate"));
                
                // Parse merchantAmount - handle both number and string from JSON
                BigDecimal merchantAmount;
                try {
                    merchantAmount = dccDataJson.getBigDecimal("merchantAmount");
                } catch (Exception e) {
                    merchantAmount = new BigDecimal(dccDataJson.optString("merchantAmount", "0"));
                }
                // Round to whole number (minor units must be integers)
                merchantAmount = merchantAmount.setScale(0, java.math.RoundingMode.HALF_UP);
                dccRateData.setMerchantAmount(merchantAmount);
                
                dccRateData.setMerchantCurrency(dccDataJson.optString("merchantCurrency"));
                dccRateData.setMarginRatePercentage(dccDataJson.optString("marginRatePercentage"));
                
                // Log DCC data for debugging
                System.out.println("=== DCC Payment Request ===");
                System.out.println("Charge Amount: " + amount + " " + validatedCurrency);
                System.out.println("DCC ID: " + dccRateData.getDccId());
                System.out.println("Merchant Amount: " + dccRateData.getMerchantAmount() + " " + dccRateData.getMerchantCurrency());
                System.out.println("CardHolder Amount: " + dccRateData.getCardHolderAmount() + " " + dccRateData.getCardHolderCurrency());
                System.out.println("Exchange Rate: " + dccRateData.getCardHolderRate());
                System.out.println("Margin Rate: " + dccRateData.getMarginRatePercentage());
                
                chargeBuilder = chargeBuilder.withDccRateData(dccRateData);
            }

            Transaction transaction = chargeBuilder.execute();

            // Simplified validation: check for 00 or SUCCESS response code
            String responseCode = transaction.getResponseCode();
            if ("00".equals(responseCode) || "SUCCESS".equals(responseCode)) {
                String transactionId = transaction.getTransactionId();
                if (transactionId == null || transactionId.isEmpty()) {
                    transactionId = "txn_" + System.currentTimeMillis();
                }

                JSONObject responseObj = new JSONObject();
                responseObj.put("success", true);

                // Build response data
                JSONObject dataObj = new JSONObject();
                dataObj.put("transactionId", transactionId);
                dataObj.put("amount", amount);
                dataObj.put("currency", validatedCurrency);
                dataObj.put("status", transaction.getResponseMessage());
                dataObj.put("reference", transaction.getReferenceNumber() != null ?
                    transaction.getReferenceNumber() : "");
                dataObj.put("timestamp", Instant.now().toString());

                // Include DCC information if it was used
                if (transaction.getDccRateData() != null) {
                    dataObj.put("dccUsed", true);
                    
                    JSONObject dccInfoObj = new JSONObject();
                    dccInfoObj.put("cardHolderAmount", transaction.getDccRateData().getCardHolderAmount());
                    dccInfoObj.put("cardHolderCurrency", transaction.getDccRateData().getCardHolderCurrency());
                    dccInfoObj.put("exchangeRate", transaction.getDccRateData().getCardHolderRate());
                    dccInfoObj.put("merchantAmount", transaction.getDccRateData().getMerchantAmount());
                    dccInfoObj.put("merchantCurrency", transaction.getDccRateData().getMerchantCurrency());
                    
                    dataObj.put("dccInfo", dccInfoObj);
                }

                responseObj.put("data", dataObj);

                responseObj.put("message", "Payment processed successfully");
                responseObj.put("timestamp", Instant.now().toString());

                response.getWriter().write(responseObj.toString());
            } else {
                throw new Exception("Transaction declined: " + transaction.getResponseMessage());
            }

        } catch (ApiException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            JSONObject errorObj = new JSONObject();
            errorObj.put("success", false);
            errorObj.put("message", "Payment processing failed: " + e.getMessage());
            errorObj.put("error_code", "API_ERROR");
            errorObj.put("timestamp", Instant.now().toString());
            response.getWriter().write(errorObj.toString());
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JSONObject errorObj = new JSONObject();
            errorObj.put("success", false);
            errorObj.put("message", "Server error: " + e.getMessage());
            errorObj.put("error_code", "SERVER_ERROR");
            errorObj.put("timestamp", Instant.now().toString());
            response.getWriter().write(errorObj.toString());
        }
    }

    /**
     * Convert locales map to JSON object
     */
    private JSONObject convertLocalesToJSON(java.util.Map<String, LocaleService.Locale> locales) {
        JSONObject json = new JSONObject();
        for (java.util.Map.Entry<String, LocaleService.Locale> entry : locales.entrySet()) {
            LocaleService.Locale locale = entry.getValue();
            JSONObject localeObj = new JSONObject();
            localeObj.put("code", locale.code);
            localeObj.put("name", locale.name);
            localeObj.put("nativeName", locale.nativeName);
            localeObj.put("flag", locale.flag);
            localeObj.put("defaultCurrency", locale.defaultCurrency);
            json.put(entry.getKey(), localeObj);
        }
        return json;
    }

    /**
     * Convert currencies map to JSON object
     */
    private JSONObject convertCurrenciesToJSON(java.util.Map<String, CurrencyConfig.Currency> currencies) {
        JSONObject json = new JSONObject();
        for (java.util.Map.Entry<String, CurrencyConfig.Currency> entry : currencies.entrySet()) {
            CurrencyConfig.Currency currency = entry.getValue();
            JSONObject currencyObj = new JSONObject();
            currencyObj.put("code", currency.code);
            currencyObj.put("name", currency.name);
            currencyObj.put("symbol", currency.symbol);
            currencyObj.put("symbolPosition", currency.symbolPosition);
            currencyObj.put("decimals", currency.decimals);
            currencyObj.put("decimalSeparator", currency.decimalSeparator);
            currencyObj.put("thousandsSeparator", currency.thousandsSeparator);
            currencyObj.put("country", currency.country);
            currencyObj.put("flag", currency.flag);
            json.put(entry.getKey(), currencyObj);
        }
        return json;
    }
}
