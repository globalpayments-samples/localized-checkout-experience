package com.globalpayments.example;

import com.globalpayments.example.services.CurrencyConfig;
import com.globalpayments.example.services.LocaleService;
import com.globalpayments.example.services.TranslationService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.time.Instant;
import java.util.Map;

/**
 * Locale Management Servlet
 * Handles locale and currency preference management
 */
@WebServlet("/api/locale")
public class LocaleServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    /**
     * GET /api/locale - Get current locale and currency settings
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        try {
            HttpSession session = request.getSession(true);
            String acceptLanguage = request.getHeader("Accept-Language");

            String currentLocale = LocaleService.getCurrentLocale(session, acceptLanguage);
            String currentCurrency = LocaleService.getCurrentCurrency(session, acceptLanguage);

            JSONObject data = new JSONObject();
            data.put("locale", currentLocale);
            data.put("currency", currentCurrency);
            data.put("translations", TranslationService.getAllTranslations(currentLocale));
            data.put("supportedLocales", convertLocalesToJSON(LocaleService.getAllLocales()));
            data.put("supportedCurrencies", convertCurrenciesToJSON(CurrencyConfig.getAllCurrencies()));

            JSONObject jsonResponse = new JSONObject();
            jsonResponse.put("success", true);
            jsonResponse.put("data", data);
            jsonResponse.put("timestamp", Instant.now().toString());

            response.getWriter().write(jsonResponse.toString());

        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JSONObject errorResponse = new JSONObject();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error retrieving locale: " + e.getMessage());
            errorResponse.put("timestamp", Instant.now().toString());
            response.getWriter().write(errorResponse.toString());
        }
    }

    /**
     * POST /api/locale - Update locale and/or currency preferences
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Access-Control-Allow-Origin", "*");

        try {
            // Read request body
            StringBuilder sb = new StringBuilder();
            BufferedReader reader = request.getReader();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }

            JSONObject requestData = new JSONObject(sb.toString());
            HttpSession session = request.getSession(true);

            // Update locale if provided
            if (requestData.has("locale")) {
                String locale = requestData.getString("locale");
                LocaleService.setSessionLocale(session, locale);
            }

            // Update currency if provided
            if (requestData.has("currency")) {
                String currency = requestData.getString("currency");
                LocaleService.setSessionCurrency(session, currency);
            }

            String acceptLanguage = request.getHeader("Accept-Language");
            String currentLocale = LocaleService.getCurrentLocale(session, acceptLanguage);
            String currentCurrency = LocaleService.getCurrentCurrency(session, acceptLanguage);

            JSONObject data = new JSONObject();
            data.put("locale", currentLocale);
            data.put("currency", currentCurrency);
            data.put("translations", TranslationService.getAllTranslations(currentLocale));

            JSONObject jsonResponse = new JSONObject();
            jsonResponse.put("success", true);
            jsonResponse.put("data", data);
            jsonResponse.put("message", "Locale preferences updated");
            jsonResponse.put("timestamp", Instant.now().toString());

            response.getWriter().write(jsonResponse.toString());

        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            JSONObject errorResponse = new JSONObject();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error updating locale: " + e.getMessage());
            errorResponse.put("timestamp", Instant.now().toString());
            response.getWriter().write(errorResponse.toString());
        }
    }

    /**
     * OPTIONS - Handle CORS preflight requests
     */
    @Override
    protected void doOptions(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.setStatus(HttpServletResponse.SC_OK);
    }

    /**
     * Convert locales map to JSON object
     */
    private JSONObject convertLocalesToJSON(Map<String, LocaleService.Locale> locales) {
        JSONObject json = new JSONObject();
        for (Map.Entry<String, LocaleService.Locale> entry : locales.entrySet()) {
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
    private JSONObject convertCurrenciesToJSON(Map<String, CurrencyConfig.Currency> currencies) {
        JSONObject json = new JSONObject();
        for (Map.Entry<String, CurrencyConfig.Currency> entry : currencies.entrySet()) {
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
