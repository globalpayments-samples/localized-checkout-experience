package com.globalpayments.example;

import com.global.api.ServicesContainer;
import com.global.api.entities.Transaction;
import com.global.api.entities.enums.Channel;
import com.global.api.entities.enums.Environment;
import com.global.api.entities.exceptions.ApiException;
import com.global.api.entities.exceptions.ConfigurationException;
import com.global.api.paymentMethods.CreditCardData;
import com.global.api.serviceConfigs.GpApiConfig;
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
import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
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
     * Generates a random nonce for access token request
     */
    private String generateNonce() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    /**
     * Creates SHA-512 hash of nonce + appKey
     */
    private String hashSecret(String nonce, String appKey) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-512");
        byte[] hash = digest.digest((nonce + appKey).getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
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
     * Generates access token with manual HTTP request
     */
    private void handleGetConfig(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        try {
            // Get current locale and currency (with detection and fallbacks)
            HttpSession session = request.getSession(true);
            String acceptLanguage = request.getHeader("Accept-Language");
            String currentLocale = LocaleService.getCurrentLocale(session, acceptLanguage);
            String currentCurrency = LocaleService.getCurrentCurrency(session, acceptLanguage);

            // Generate nonce and secret for manual token request
            String nonce = generateNonce();
            String secret = hashSecret(nonce, dotenv.get("GP_API_APP_KEY"));

            // Build token request JSON
            JSONObject tokenRequest = new JSONObject();
            tokenRequest.put("app_id", dotenv.get("GP_API_APP_ID"));
            tokenRequest.put("nonce", nonce);
            tokenRequest.put("secret", secret);
            tokenRequest.put("grant_type", "client_credentials");
            tokenRequest.put("seconds_to_expire", 600);
            tokenRequest.put("permissions", new String[]{"PMT_POST_Create_Single"});

            // Determine API endpoint (always sandbox/TEST for now)
            String apiEndpoint = "https://apis.sandbox.globalpay.com/ucp/accesstoken";

            // Make API request
            URL url = new URL(apiEndpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("X-GP-Version", "2021-03-22");
            conn.setDoOutput(true);

            // Send request
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = tokenRequest.toString().getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            // Read response (handle compressed responses such as gzip/deflate)
            int responseCode = conn.getResponseCode();
            java.io.InputStream rawStream = responseCode == 200 ? conn.getInputStream() : conn.getErrorStream();
            String contentEncoding = conn.getHeaderField("Content-Encoding");
            java.io.InputStream effectiveStream = rawStream;
            String responseBody = null;
            try {
                if (contentEncoding != null) {
                    String enc = contentEncoding.toLowerCase();
                    if (enc.contains("gzip")) {
                        effectiveStream = new java.util.zip.GZIPInputStream(rawStream);
                    } else if (enc.contains("deflate")) {
                        effectiveStream = new java.util.zip.InflaterInputStream(rawStream);
                    }
                }

                BufferedReader br = new BufferedReader(new java.io.InputStreamReader(effectiveStream, StandardCharsets.UTF_8));
                responseBody = br.lines().collect(Collectors.joining());
                br.close();
            } finally {
                try { if (rawStream != null) rawStream.close(); } catch (Exception _e) { /* ignore */ }
            }

            if (responseCode != 200) {
                throw new Exception("Failed to generate access token: " + responseBody);
            }

            // Parse response
            JSONObject tokenResponse = new JSONObject(responseBody);
            String token = tokenResponse.getString("token");

            JSONObject responseObj = new JSONObject();
            responseObj.put("success", true);

            JSONObject dataObj = new JSONObject();
            dataObj.put("accessToken", token);
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

            // FIX: Reconfigure SDK per-request with dynamic country based on currency
            GpApiConfig paymentConfig = new GpApiConfig();
            paymentConfig.setAppId(dotenv.get("GP_API_APP_ID"));
            paymentConfig.setAppKey(dotenv.get("GP_API_APP_KEY"));
            paymentConfig.setEnvironment(Environment.TEST);
            paymentConfig.setChannel(Channel.CardNotPresent);
            paymentConfig.setCountry(countryCode); // Dynamic country
            paymentConfig.setPermissions(new String[]{"PMT_POST_Create_Single"});

            ServicesContainer.configureService(paymentConfig);

            CreditCardData card = new CreditCardData();
            card.setToken(paymentToken);

            Transaction transaction = card.charge(amount)
                    .withCurrency(validatedCurrency)
                    .execute();

            // Simplified validation: check for 00 or SUCCESS response code
            String responseCode = transaction.getResponseCode();
            if ("00".equals(responseCode) || "SUCCESS".equals(responseCode)) {
                String transactionId = transaction.getTransactionId();
                if (transactionId == null || transactionId.isEmpty()) {
                    transactionId = "txn_" + System.currentTimeMillis();
                }

                JSONObject responseObj = new JSONObject();
                responseObj.put("success", true);

                // Simplified response structure
                JSONObject dataObj = new JSONObject();
                dataObj.put("transactionId", transactionId);
                dataObj.put("amount", amount);
                dataObj.put("currency", validatedCurrency);
                dataObj.put("status", transaction.getResponseMessage());
                dataObj.put("reference", transaction.getReferenceNumber() != null ?
                    transaction.getReferenceNumber() : "");
                dataObj.put("timestamp", Instant.now().toString());
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
