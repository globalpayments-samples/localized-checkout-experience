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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * DCC Rate Lookup Servlet - GP API
 *
 * Retrieves Dynamic Currency Conversion rates for international cardholders.
 */

@WebServlet("/get-dcc-rate")
public class GetDccRateServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private final Dotenv dotenv = Dotenv.load();

    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response) {
        setCORSHeaders(response);
        response.setStatus(HttpServletResponse.SC_OK);
    }

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        setCORSHeaders(response);
        response.setContentType("application/json");

        try {
            HttpSession session = request.getSession(true);
            String acceptLanguage = request.getHeader("Accept-Language");

            // Read and parse JSON request body
            BufferedReader reader = request.getReader();
            String jsonBody = reader.lines().collect(Collectors.joining(System.lineSeparator()));
            JSONObject requestData = new JSONObject(jsonBody);

            // Update session with user preferences
            if (requestData.has("locale")) {
                LocaleService.setSessionLocale(session, requestData.getString("locale"));
            }
            if (requestData.has("currency")) {
                LocaleService.setSessionCurrency(session, requestData.getString("currency"));
            }

            // Get current locale and currency
            String currentLocale = LocaleService.getCurrentLocale(session, acceptLanguage);

            // Validate required fields
            if (!requestData.has("payment_token") || !requestData.has("amount") || !requestData.has("currency")) {
                sendError(response, 400, 
                    TranslationService.t("validation.required", currentLocale), 
                    "VALIDATION_ERROR");
                return;
            }

            String paymentToken = requestData.getString("payment_token");
            String currentCurrency = CurrencyConfig.validateCurrency(requestData.getString("currency"));
            
            // Handle amount as either string or number from JSON
            BigDecimal amount;
            try {
                amount = requestData.getBigDecimal("amount");
            } catch (Exception e) {
                // Fallback to parsing as string if needed
                amount = new BigDecimal(requestData.getString("amount"));
            }

            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                sendError(response, 400,
                    TranslationService.t("error.invalid_amount", currentLocale),
                    "VALIDATION_ERROR");
                return;
            }

            // Validate currency is supported
            if (!CurrencyConfig.isSupported(currentCurrency)) {
                sendError(response, 400,
                    TranslationService.t("error.currency_not_supported", currentLocale,
                        Map.of("currency", currentCurrency)),
                    "VALIDATION_ERROR");
                return;
            }

            // Get country code for currency
            String countryCode = CurrencyConfig.getCountryCode(currentCurrency);

            // Configure SDK for DCC rate lookup
            GpApiConfig dccConfig = new GpApiConfig();
            dccConfig.setAppId(dotenv.get("GP_API_APP_ID"));
            dccConfig.setAppKey(dotenv.get("GP_API_APP_KEY"));
            dccConfig.setEnvironment(Environment.TEST);
            dccConfig.setChannel(Channel.CardNotPresent);
            dccConfig.setCountry(countryCode);

            ServicesContainer.configureService(dccConfig);

            // Create card instance with token
            CreditCardData card = new CreditCardData();
            card.setToken(paymentToken);

            // Get DCC rate information
            Transaction dccDetails = card.getDccRate()
                .withAmount(amount)
                .withCurrency(currentCurrency)
                .execute();

            // Check if DCC is available for this card
            if ("AVAILABLE".equals(dccDetails.getResponseMessage()) && 
                dccDetails.getDccRateData() != null) {
                
                var dccData = dccDetails.getDccRateData();
                
                // Log DCC rate response for debugging
                System.out.println("=== DCC Rate Lookup Response ===");
                System.out.println("Amount requested: " + amount + " " + currentCurrency);
                System.out.println("Merchant Amount: " + dccData.getMerchantAmount() + " " + dccData.getMerchantCurrency());
                System.out.println("CardHolder Amount: " + dccData.getCardHolderAmount() + " " + dccData.getCardHolderCurrency());
                System.out.println("Exchange Rate: " + dccData.getCardHolderRate());
                System.out.println("Margin Rate: " + dccData.getMarginRatePercentage());
                System.out.println("DCC ID: " + dccData.getDccId());
                
                JSONObject dccInfo = new JSONObject();
                dccInfo.put("merchantAmount", dccData.getMerchantAmount());
                dccInfo.put("merchantCurrency", dccData.getMerchantCurrency());
                dccInfo.put("cardHolderAmount", dccData.getCardHolderAmount());
                dccInfo.put("cardHolderCurrency", dccData.getCardHolderCurrency());
                dccInfo.put("exchangeRate", dccData.getCardHolderRate());
                dccInfo.put("marginRatePercentage", dccData.getMarginRatePercentage());
                dccInfo.put("exchangeRateSource", dccData.getExchangeRateSourceName());
                dccInfo.put("commissionPercentage", dccData.getCommissionPercentage());
                dccInfo.put("dccId", dccData.getDccId());

                JSONObject result = new JSONObject();
                result.put("success", true);
                result.put("dccAvailable", true);
                result.put("data", dccInfo);
                result.put("message", "DCC rate retrieved successfully");
                result.put("timestamp", Instant.now().toString());

                response.getWriter().write(result.toString());
            } else {
                // DCC not available for this card
                JSONObject result = new JSONObject();
                result.put("success", true);
                result.put("dccAvailable", false);
                result.put("message", "DCC not available for this card");
                result.put("timestamp", Instant.now().toString());

                response.getWriter().write(result.toString());
            }

        } catch (ApiException e) {
            HttpSession session = request.getSession(true);
            String acceptLanguage = request.getHeader("Accept-Language");
            String currentLocale = LocaleService.getCurrentLocale(session, acceptLanguage);
            
            // Check if this is a "not allowed" error (common for cards that don't support DCC)
            String errorMessage = e.getMessage();
            if (errorMessage != null && 
                (errorMessage.contains("not allowed") || 
                 errorMessage.contains("not available") ||
                 errorMessage.contains("502"))) {
                
                // DCC not available - return success with dccAvailable: false
                JSONObject result = new JSONObject();
                result.put("success", true);
                result.put("dccAvailable", false);
                result.put("message", "DCC not available for this card/currency combination");
                result.put("timestamp", Instant.now().toString());
                
                response.setStatus(200);
                response.getWriter().write(result.toString());
            } else {
                // Log the error for debugging
                System.err.println("DCC API Exception: " + errorMessage);
                e.printStackTrace();
                
                sendError(response, 500,
                    TranslationService.t("error.payment_failed", currentLocale,
                        Map.of("message", errorMessage)),
                    "DCC_ERROR");
            }
        } catch (Exception e) {
            HttpSession session = request.getSession(true);
            String acceptLanguage = request.getHeader("Accept-Language");
            String currentLocale = LocaleService.getCurrentLocale(session, acceptLanguage);
            
            // Log the error for debugging
            System.err.println("DCC General Exception: " + e.getMessage());
            e.printStackTrace();
            
            sendError(response, 500,
                "DCC lookup failed: " + e.getMessage(),
                "SERVER_ERROR");
        }
    }

    private void sendError(HttpServletResponse response, int statusCode, 
                          String message, String errorCode) throws IOException {
        response.setStatus(statusCode);
        
        JSONObject error = new JSONObject();
        error.put("success", false);
        error.put("dccAvailable", false);
        error.put("message", message);
        error.put("error_code", errorCode);
        error.put("timestamp", Instant.now().toString());
        
        response.getWriter().write(error.toString());
    }

    private void setCORSHeaders(HttpServletResponse response) {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Language");
        response.setHeader("Access-Control-Max-Age", "3600");
    }
}
