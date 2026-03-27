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
use App\Controllers\ConfigController;
use App\Controllers\TurnosController;
use App\Middleware\AuthMiddleware;
use App\Views\JsonResponse;

$parkingController   = new ParkingController();
$authController      = new AuthController();
$dashboardController = new DashboardController();
$configController    = new ConfigController();
$turnosController    = new TurnosController();

$action    = $_GET['action']    ?? '';
$matricula = $_GET['matricula'] ?? null;

match ($action) {

    // ── Rutas PÚBLICAS ────────────────────────────────────────
    'login'  => $authController->login(),
    'logout' => $authController->logout(),

    // ── Operaciones ───────────────────────────────────────────
    'entrada' => (function () use ($parkingController, $matricula) {
        AuthMiddleware::verificar();
        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);
        $parkingController->registrarEntrada($matricula);
    })(),

    'salida' => (function () use ($parkingController, $matricula) {
        AuthMiddleware::verificar();
        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);
        $parkingController->registrarSalida($matricula);
    })(),

    'listar' => (function () use ($parkingController) {
        AuthMiddleware::verificar();
        $parkingController->listarActivos();
    })(),

    'clientes' => (function () use ($parkingController) {
        AuthMiddleware::verificar();
        $parkingController->registrarNuevoCliente();
    })(),

    'clientes.frecuentes' => (function () use ($parkingController) {
        AuthMiddleware::verificar();
        $parkingController->listarClientesFrecuentes();
    })(),

    'clientes.historial' => (function () use ($parkingController, $matricula) {
        AuthMiddleware::verificar();
        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);
        $parkingController->obtenerHistorial($matricula);
    })(),

    'tarifas' => (function () use ($parkingController) {
        AuthMiddleware::verificar();
        $parkingController->obtenerTarifas();
    })(),

    // ── Dashboard ─────────────────────────────────────────────
    'dashboard.resumen' => (function () use ($dashboardController) {
        AuthMiddleware::verificar();
        $dashboardController->obtenerResumen();
    })(),

    'dashboard.grafica' => (function () use ($dashboardController) {
        AuthMiddleware::soloAdmin();
        $dashboardController->obtenerGrafica();
    })(),

    'dashboard.sesiones' => (function () use ($dashboardController) {
        AuthMiddleware::verificar();
        $dashboardController->obtenerSesionesRecientes();
    })(),

    'dashboard.sesiones.filtro' => (function () use ($dashboardController) {
        AuthMiddleware::verificar();
        $dashboardController->obtenerSesionesFiltradas();
    })(),

    'dashboard.exportar' => (function () use ($dashboardController) {
        AuthMiddleware::verificar();
        $dashboardController->exportarSesiones();
    })(),

    // ── Usuarios (solo admin) ─────────────────────────────────
    'usuarios.listar'    => $authController->listarUsuarios(),
    'usuarios.crear'     => $authController->crearUsuario(),
    'usuarios.editar'    => $authController->editarUsuario(),
    'usuarios.desactivar'=> $authController->desactivarUsuario(),

    // ── Turnos ────────────────────────────────────────────────
    'turnos.listar' => (function () use ($turnosController) {
        AuthMiddleware::verificar();
        $turnosController->listarTurnos();
    })(),

    'turnos.activos' => (function () use ($turnosController) {
        AuthMiddleware::verificar();
        $turnosController->listarTurnosActivos();
    })(),

    'turnos.crear'    => $turnosController->crearTurno(),
    'turnos.editar'   => $turnosController->editarTurno(),
    'turnos.toggle'   => $turnosController->toggleTurno(),
    'turnos.entrada'  => $turnosController->registrarEntradaTurno(),
    'turnos.salida'   => $turnosController->registrarSalidaTurno(),

    'turnos.registros' => (function () use ($turnosController) {
        AuthMiddleware::verificar();
        $turnosController->registrosTurnos();
    })(),

    'turnos.stats' => (function () use ($turnosController) {
        AuthMiddleware::verificar();
        $turnosController->statsTurnos();
    })(),

    // ── Convenios ─────────────────────────────────────────────
    'convenios.listar' => (function () use ($turnosController) {
        AuthMiddleware::verificar();
        $turnosController->listarConvenios();
    })(),

    'convenios.activos' => (function () use ($turnosController) {
        AuthMiddleware::verificar();
        $turnosController->listarConveniosActivos();
    })(),

    'convenios.crear'   => $turnosController->crearConvenio(),
    'convenios.editar'  => $turnosController->editarConvenio(),
    'convenios.toggle'  => $turnosController->toggleConvenio(),
    'convenios.entrada' => $turnosController->registrarEntradaConvenio(),
    'convenios.salida'  => $turnosController->registrarSalidaConvenio(),

    'convenios.registros' => (function () use ($turnosController) {
        AuthMiddleware::verificar();
        $turnosController->registrosConvenios();
    })(),

    // ── Configuración ─────────────────────────────────────────
    'config.obtener' => (function () use ($configController) {
        AuthMiddleware::verificar();
        $configController->obtener();
    })(),

    'config.guardar' => $configController->guardar(),

    // ── Default ───────────────────────────────────────────────
    default => JsonResponse::send(['error' => 'Acción no válida'], 400),

};