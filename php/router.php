<?php
/**
 * Router for PHP Built-in Server
 * 
 * This file routes requests to the appropriate PHP scripts
 * when using php -S
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Route mapping
$routes = [
    '/config' => 'config.php',
    '/get-locale' => 'get-locale.php',
    '/get-dcc-rate' => 'get-dcc-rate.php',
    '/process-payment' => 'process-payment.php',
];

// If the route exists in our mapping, include the target file
if (isset($routes[$uri])) {
    require $routes[$uri];
    return true;
}

// If it's a static file that exists, let PHP serve it
if (file_exists(__DIR__ . $uri)) {
    return false;
}

// Default to index.html for other requests
if ($uri === '/' || $uri === '') {
    require 'index.html';
    return true;
}

// 404 for everything else
http_response_code(404);
echo json_encode(['success' => false, 'message' => 'Not found']);
return true;
