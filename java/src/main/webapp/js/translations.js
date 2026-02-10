/**
 * Frontend Translations Module
 * Handles client-side localization for the payment form
 */

const translations = {
  en: {
    "page.title": "Global Payments - Localized Checkout",
    "page.description": "Complete your payment securely",
    "form.title": "Payment Information",
    "form.card_number": "Card Number",
    "form.card_number.placeholder": "1234 5678 9012 3456",
    "form.expiration_date": "Expiration Date",
    "form.expiration_date.placeholder": "MM/YY",
    "form.cvv": "CVV",
    "form.cvv.placeholder": "123",
    "form.billing_zip": "Billing ZIP Code",
    "form.billing_zip.placeholder": "12345",
    "form.amount": "Amount",
    "form.amount.placeholder": "10.00",
    "form.currency": "Merchant Currency",
    "form.currency.select": "Select Currency",
    "form.language": "Language",
    "form.language.select": "Select Language",
    "button.process_payment": "Process Payment",
    "button.processing": "Processing...",
    "button.cancel": "Cancel",
    "message.success": "Payment Successful!",
    "message.success.transaction_id": "Transaction ID: {transactionId}",
    "message.success.amount": "Amount: {amount}",
    "message.success.card": "Card: {cardType} ending in {last4}",
    "error.general": "An error occurred while processing your payment.",
    "error.invalid_amount": "Please enter a valid amount.",
    "error.invalid_card": "Please enter valid card information.",
    "error.invalid_expiry": "Please enter a valid expiration date.",
    "error.invalid_cvv": "Please enter a valid CVV code.",
    "error.invalid_zip": "Please enter a valid billing ZIP code.",
    "error.payment_failed": "Payment failed: {message}",
    "error.network": "Network error. Please check your connection and try again.",
    "error.currency_not_supported": "Currency {currency} is not supported.",
    "validation.required": "This field is required.",
    "validation.min_amount": "Minimum amount is {min}.",
    "validation.max_amount": "Maximum amount is {max}.",
    "currency.usd": "US Dollar",
    "currency.eur": "Euro",
    "currency.gbp": "British Pound",
    "currency.cad": "Canadian Dollar",
    "currency.aud": "Australian Dollar",
    "currency.jpy": "Japanese Yen",
    "language.en": "English",
    "language.es": "Spanish",
    "language.fr": "French",
    "language.de": "German",
    "language.pt": "Portuguese",
    "help.card_number": "Enter the 16-digit number on your card",
    "help.expiration": "Enter the expiration date as shown on your card",
    "help.cvv": "Enter the 3-digit security code on the back of your card",
    "help.billing_zip": "Enter the ZIP/postal code from your billing address"
  },
  es: {
    "page.title": "Global Payments - Pago Localizado",
    "page.description": "Complete su pago de forma segura",
    "form.title": "Información de Pago",
    "form.card_number": "Número de Tarjeta",
    "form.card_number.placeholder": "1234 5678 9012 3456",
    "form.expiration_date": "Fecha de Vencimiento",
    "form.expiration_date.placeholder": "MM/AA",
    "form.cvv": "CVV",
    "form.cvv.placeholder": "123",
    "form.billing_zip": "Código Postal",
    "form.billing_zip.placeholder": "12345",
    "form.amount": "Monto",
    "form.amount.placeholder": "10,00",
    "form.currency": "Moneda del Comerciante",
    "form.currency.select": "Seleccionar Moneda",
    "form.language": "Idioma",
    "form.language.select": "Seleccionar Idioma",
    "button.process_payment": "Procesar Pago",
    "button.processing": "Procesando...",
    "button.cancel": "Cancelar",
    "message.success": "¡Pago Exitoso!",
    "message.success.transaction_id": "ID de Transacción: {transactionId}",
    "message.success.amount": "Monto: {amount}",
    "message.success.card": "Tarjeta: {cardType} terminada en {last4}",
    "error.general": "Ocurrió un error al procesar su pago.",
    "error.invalid_amount": "Por favor ingrese un monto válido.",
    "error.invalid_card": "Por favor ingrese información de tarjeta válida.",
    "error.invalid_expiry": "Por favor ingrese una fecha de vencimiento válida.",
    "error.invalid_cvv": "Por favor ingrese un código CVV válido.",
    "error.invalid_zip": "Por favor ingrese un código postal válido.",
    "error.payment_failed": "Pago fallido: {message}",
    "error.network": "Error de red. Por favor verifique su conexión e intente nuevamente.",
    "error.currency_not_supported": "La moneda {currency} no es compatible.",
    "validation.required": "Este campo es obligatorio.",
    "validation.min_amount": "El monto mínimo es {min}.",
    "validation.max_amount": "El monto máximo es {max}.",
    "currency.usd": "Dólar Estadounidense",
    "currency.eur": "Euro",
    "currency.gbp": "Libra Esterlina",
    "currency.cad": "Dólar Canadiense",
    "currency.aud": "Dólar Australiano",
    "currency.jpy": "Yen Japonés",
    "language.en": "Inglés",
    "language.es": "Español",
    "language.fr": "Francés",
    "language.de": "Alemán",
    "language.pt": "Portugués",
    "help.card_number": "Ingrese el número de 16 dígitos de su tarjeta",
    "help.expiration": "Ingrese la fecha de vencimiento como aparece en su tarjeta",
    "help.cvv": "Ingrese el código de seguridad de 3 dígitos en el reverso de su tarjeta",
    "help.billing_zip": "Ingrese el código postal de su dirección de facturación"
  },
  fr: {
    "page.title": "Global Payments - Paiement Localisé",
    "page.description": "Complétez votre paiement en toute sécurité",
    "form.title": "Informations de Paiement",
    "form.card_number": "Numéro de Carte",
    "form.card_number.placeholder": "1234 5678 9012 3456",
    "form.expiration_date": "Date d'Expiration",
    "form.expiration_date.placeholder": "MM/AA",
    "form.cvv": "CVV",
    "form.cvv.placeholder": "123",
    "form.billing_zip": "Code Postal",
    "form.billing_zip.placeholder": "12345",
    "form.amount": "Montant",
    "form.amount.placeholder": "10,00",
    "form.currency": "Devise du Commerçant",
    "form.currency.select": "Sélectionner la Devise",
    "form.language": "Langue",
    "form.language.select": "Sélectionner la Langue",
    "button.process_payment": "Traiter le Paiement",
    "button.processing": "Traitement...",
    "button.cancel": "Annuler",
    "message.success": "Paiement Réussi !",
    "message.success.transaction_id": "ID de Transaction : {transactionId}",
    "message.success.amount": "Montant : {amount}",
    "message.success.card": "Carte : {cardType} se terminant par {last4}",
    "error.general": "Une erreur s'est produite lors du traitement de votre paiement.",
    "error.invalid_amount": "Veuillez entrer un montant valide.",
    "error.invalid_card": "Veuillez entrer des informations de carte valides.",
    "error.invalid_expiry": "Veuillez entrer une date d'expiration valide.",
    "error.invalid_cvv": "Veuillez entrer un code CVV valide.",
    "error.invalid_zip": "Veuillez entrer un code postal valide.",
    "error.payment_failed": "Échec du paiement : {message}",
    "error.network": "Erreur réseau. Veuillez vérifier votre connexion et réessayer.",
    "error.currency_not_supported": "La devise {currency} n'est pas prise en charge.",
    "validation.required": "Ce champ est obligatoire.",
    "validation.min_amount": "Le montant minimum est {min}.",
    "validation.max_amount": "Le montant maximum est {max}.",
    "currency.usd": "Dollar Américain",
    "currency.eur": "Euro",
    "currency.gbp": "Livre Sterling",
    "currency.cad": "Dollar Canadien",
    "currency.aud": "Dollar Australien",
    "currency.jpy": "Yen Japonais",
    "language.en": "Anglais",
    "language.es": "Espagnol",
    "language.fr": "Français",
    "language.de": "Allemand",
    "language.pt": "Portugais",
    "help.card_number": "Entrez le numéro à 16 chiffres de votre carte",
    "help.expiration": "Entrez la date d'expiration telle qu'elle apparaît sur votre carte",
    "help.cvv": "Entrez le code de sécurité à 3 chiffres au dos de votre carte",
    "help.billing_zip": "Entrez le code postal de votre adresse de facturation"
  },
  de: {
    "page.title": "Global Payments - Lokalisierte Kasse",
    "page.description": "Schließen Sie Ihre Zahlung sicher ab",
    "form.title": "Zahlungsinformationen",
    "form.card_number": "Kartennummer",
    "form.card_number.placeholder": "1234 5678 9012 3456",
    "form.expiration_date": "Ablaufdatum",
    "form.expiration_date.placeholder": "MM/JJ",
    "form.cvv": "CVV",
    "form.cvv.placeholder": "123",
    "form.billing_zip": "Postleitzahl",
    "form.billing_zip.placeholder": "12345",
    "form.amount": "Betrag",
    "form.amount.placeholder": "10,00",
    "form.currency": "Händlerwährung",
    "form.currency.select": "Währung Auswählen",
    "form.language": "Sprache",
    "form.language.select": "Sprache Auswählen",
    "button.process_payment": "Zahlung Verarbeiten",
    "button.processing": "Wird Verarbeitet...",
    "button.cancel": "Abbrechen",
    "message.success": "Zahlung Erfolgreich!",
    "message.success.transaction_id": "Transaktions-ID: {transactionId}",
    "message.success.amount": "Betrag: {amount}",
    "message.success.card": "Karte: {cardType} endend auf {last4}",
    "error.general": "Bei der Verarbeitung Ihrer Zahlung ist ein Fehler aufgetreten.",
    "error.invalid_amount": "Bitte geben Sie einen gültigen Betrag ein.",
    "error.invalid_card": "Bitte geben Sie gültige Karteninformationen ein.",
    "error.invalid_expiry": "Bitte geben Sie ein gültiges Ablaufdatum ein.",
    "error.invalid_cvv": "Bitte geben Sie einen gültigen CVV-Code ein.",
    "error.invalid_zip": "Bitte geben Sie eine gültige Postleitzahl ein.",
    "error.payment_failed": "Zahlung fehlgeschlagen: {message}",
    "error.network": "Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
    "error.currency_not_supported": "Die Währung {currency} wird nicht unterstützt.",
    "validation.required": "Dieses Feld ist erforderlich.",
    "validation.min_amount": "Der Mindestbetrag ist {min}.",
    "validation.max_amount": "Der Höchstbetrag ist {max}.",
    "currency.usd": "US-Dollar",
    "currency.eur": "Euro",
    "currency.gbp": "Britisches Pfund",
    "currency.cad": "Kanadischer Dollar",
    "currency.aud": "Australischer Dollar",
    "currency.jpy": "Japanischer Yen",
    "language.en": "Englisch",
    "language.es": "Spanisch",
    "language.fr": "Französisch",
    "language.de": "Deutsch",
    "language.pt": "Portugiesisch",
    "help.card_number": "Geben Sie die 16-stellige Nummer Ihrer Karte ein",
    "help.expiration": "Geben Sie das Ablaufdatum wie auf Ihrer Karte angegeben ein",
    "help.cvv": "Geben Sie den 3-stelligen Sicherheitscode auf der Rückseite Ihrer Karte ein",
    "help.billing_zip": "Geben Sie die Postleitzahl Ihrer Rechnungsadresse ein"
  },
  pt: {
    "page.title": "Global Payments - Pagamento Localizado",
    "page.description": "Complete seu pagamento com segurança",
    "form.title": "Informações de Pagamento",
    "form.card_number": "Número do Cartão",
    "form.card_number.placeholder": "1234 5678 9012 3456",
    "form.expiration_date": "Data de Validade",
    "form.expiration_date.placeholder": "MM/AA",
    "form.cvv": "CVV",
    "form.cvv.placeholder": "123",
    "form.billing_zip": "Código Postal",
    "form.billing_zip.placeholder": "12345",
    "form.amount": "Valor",
    "form.amount.placeholder": "10,00",
    "form.currency": "Moeda do Comerciante",
    "form.currency.select": "Selecionar Moeda",
    "form.language": "Idioma",
    "form.language.select": "Selecionar Idioma",
    "button.process_payment": "Processar Pagamento",
    "button.processing": "Processando...",
    "button.cancel": "Cancelar",
    "message.success": "Pagamento Bem-Sucedido!",
    "message.success.transaction_id": "ID da Transação: {transactionId}",
    "message.success.amount": "Valor: {amount}",
    "message.success.card": "Cartão: {cardType} terminado em {last4}",
    "error.general": "Ocorreu um erro ao processar seu pagamento.",
    "error.invalid_amount": "Por favor, insira um valor válido.",
    "error.invalid_card": "Por favor, insira informações de cartão válidas.",
    "error.invalid_expiry": "Por favor, insira uma data de validade válida.",
    "error.invalid_cvv": "Por favor, insira um código CVV válido.",
    "error.invalid_zip": "Por favor, insira um código postal válido.",
    "error.payment_failed": "Pagamento falhou: {message}",
    "error.network": "Erro de rede. Por favor, verifique sua conexão e tente novamente.",
    "error.currency_not_supported": "A moeda {currency} não é suportada.",
    "validation.required": "Este campo é obrigatório.",
    "validation.min_amount": "O valor mínimo é {min}.",
    "validation.max_amount": "O valor máximo é {max}.",
    "currency.usd": "Dólar Americano",
    "currency.eur": "Euro",
    "currency.gbp": "Libra Esterlina",
    "currency.cad": "Dólar Canadense",
    "currency.aud": "Dólar Australiano",
    "currency.jpy": "Iene Japonês",
    "language.en": "Inglês",
    "language.es": "Espanhol",
    "language.fr": "Francês",
    "language.de": "Alemão",
    "language.pt": "Português",
    "help.card_number": "Digite o número de 16 dígitos do seu cartão",
    "help.expiration": "Digite a data de validade conforme mostrado no seu cartão",
    "help.cvv": "Digite o código de segurança de 3 dígitos no verso do seu cartão",
    "help.billing_zip": "Digite o código postal do seu endereço de cobrança"
  }
};

// Current locale state
let currentLocale = 'en';

/**
 * Translate a key with optional parameters
 * @param {string} key - Translation key
 * @param {Object} params - Parameters to replace in translation (e.g., {amount: '$10.00'})
 * @returns {string} Translated text
 */
function t(key, params = {}) {
  let text = translations[currentLocale]?.[key] || translations.en[key] || key;

  // Replace parameters in the format {paramName}
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
  });

  return text;
}

/**
 * Set the current locale
 * @param {string} locale - Locale code (en, es, fr, de, pt)
 */
function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale;
    localStorage.setItem('locale', locale);
    return true;
  }
  return false;
}

/**
 * Get the current locale
 * @returns {string} Current locale code
 */
function getLocale() {
  return currentLocale;
}

/**
 * Initialize locale from localStorage or browser
 */
function initLocale() {
  // Try localStorage first
  const savedLocale = localStorage.getItem('locale');
  if (savedLocale && translations[savedLocale]) {
    currentLocale = savedLocale;
    return;
  }

  // Detect from browser
  const browserLang = navigator.language.split('-')[0];
  if (translations[browserLang]) {
    currentLocale = browserLang;
  }
}

// Initialize on load
initLocale();
