<?php
session_start();
date_default_timezone_set('America/Mexico_City');

// ── Cargar .env para CORS ─────────────────────────────────────
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $linea) {
        if (str_starts_with(trim($linea), '#')) continue;
        if (str_contains($linea, '=')) {
            [$k, $v] = explode('=', $linea, 2);
            $_ENV[trim($k)] = trim($v);
        }
    }
}

// ── CORS restringido ──────────────────────────────────────────
$allowedOrigin = $_ENV['ALLOWED_ORIGIN'] ?? 'http://127.0.0.1:8000';
$origin        = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin === $allowedOrigin) {
    header("Access-Control-Allow-Origin: $allowedOrigin");
}

header('Content-Type: application/json');
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Access-Control-Allow-Credentials: true");

// ── Errores solo a log, nunca al cliente ──────────────────────
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// ── Capturar excepciones y devolverlas como JSON ──────────────
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
    error_log($e->getMessage() . ' en ' . $e->getFile() . ':' . $e->getLine());
    exit;
});

// ── Preflight OPTIONS ─────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ── Autoloader ────────────────────────────────────────────────
spl_autoload_register(function ($class) {
    $path         = str_replace(['App\\', '\\'], ['app/', '/'], $class) . '.php';
    $rutaCompleta = __DIR__ . '/' . $path;
    if (file_exists($rutaCompleta)) {
        require_once $rutaCompleta;
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Clase no encontrada: ' . basename($rutaCompleta)]);
        exit;
    }
});

use App\Controllers\ParkingController;
use App\Controllers\AuthController;
use App\Controllers\DashboardController;
use App\Middleware\AuthMiddleware;
use App\Views\JsonResponse;

$parkingController   = new ParkingController();
$authController      = new AuthController();
$dashboardController = new DashboardController();

$action    = $_GET['action']    ?? '';
$matricula = $_GET['matricula'] ?? null;

switch ($action) {

    // ── Rutas PÚBLICAS ────────────────────────────────────────
    case 'login':
        $authController->login();
        break;

    case 'logout':
        $authController->logout();
        break;

    // ── Rutas PROTEGIDAS ──────────────────────────────────────
    case 'entrada':
        AuthMiddleware::verificar();
        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);
        $parkingController->registrarEntrada($matricula);
        break;

    case 'salida':
        AuthMiddleware::verificar();
        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);
        $parkingController->registrarSalida($matricula);
        break;

    case 'listar':
        AuthMiddleware::verificar();
        $parkingController->listarActivos();
        break;

    case 'clientes':
        AuthMiddleware::verificar();
        $parkingController->registrarNuevoCliente();
        break;

    case 'clientes.frecuentes':
        AuthMiddleware::verificar();
        $parkingController->listarClientesFrecuentes();
        break;

    case 'clientes.historial':
        AuthMiddleware::verificar();
        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);
        $parkingController->obtenerHistorial($matricula);
        break;

    // ── Dashboard ─────────────────────────────────────────────
    case 'dashboard.resumen':
        AuthMiddleware::verificar();
        $dashboardController->obtenerResumen();
        break;

    case 'dashboard.grafica':
        AuthMiddleware::soloAdmin();
        $dashboardController->obtenerGrafica();
        break;

    case 'dashboard.sesiones':
        AuthMiddleware::verificar();
        $dashboardController->obtenerSesionesRecientes();
        break;

    case 'dashboard.sesiones.filtro':
        AuthMiddleware::verificar();
        $dashboardController->obtenerSesionesFiltradas();
        break;

    case 'dashboard.exportar':
        AuthMiddleware::verificar();
        $dashboardController->exportarSesiones();
        break;

    // ── Solo Admin ────────────────────────────────────────────
    case 'usuarios.listar':
        $authController->listarUsuarios();
        break;

    case 'usuarios.crear':
        $authController->crearUsuario();
        break;

    case 'usuarios.editar':
        $authController->editarUsuario();
        break;

    case 'usuarios.desactivar':
        $authController->desactivarUsuario();
        break;

    default:
        JsonResponse::send(['error' => 'Acción no válida'], 400);
        break;
}