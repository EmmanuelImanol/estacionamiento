<?php
// router.php — Solo para desarrollo local
// Uso: php -S 127.0.0.1:8000 router.php

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Redirigir /api.php al archivo real en la raíz
if ($uri === '/api.php') {
    chdir(__DIR__);
    require __DIR__ . '/api.php';
    return true;
}

// Raíz → index.html
if ($uri === '/' || $uri === '') {
    require __DIR__ . '/public/index.html';
    return true;
}

// Buscar el archivo en public/
$archivo = __DIR__ . '/public' . $uri;

if (file_exists($archivo) && !is_dir($archivo)) {
    // Detectar tipo MIME
    $ext  = strtolower(pathinfo($archivo, PATHINFO_EXTENSION));
    $mime = match($ext) {
        'css'  => 'text/css',
        'js'   => 'application/javascript',
        'html' => 'text/html',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        default => 'text/plain',
    };
    header("Content-Type: $mime");
    readfile($archivo);
    return true;
}

// Fallback a index.html
require __DIR__ . '/public/index.html';
return true;