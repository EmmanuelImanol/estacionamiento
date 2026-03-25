<?php
namespace App\Controllers;

use App\Middleware\AuthMiddleware;
use App\Repositories\ConfigRepository;
use App\Views\JsonResponse;

class ConfigController {
    private ConfigRepository $repo;

    public function __construct() {
        $this->repo = new ConfigRepository();
    }

    public function obtener(): void {
        AuthMiddleware::verificar();
        JsonResponse::send([
            'status' => 'success',
            'data'   => $this->repo->obtenerTodas()
        ]);
    }

    public function guardar(): void {
        AuthMiddleware::soloAdmin();

        $data = json_decode(file_get_contents('php://input'), true);

        if (!$data || !is_array($data)) {
            JsonResponse::send(['error' => 'Datos inválidos'], 400);
        }

        // Claves permitidas (whitelist)
        $permitidas = [
            'negocio_nombre', 'negocio_rfc', 'negocio_direccion',
            'negocio_ciudad', 'negocio_telefono', 'negocio_email',
            'tarifa_por_hora',
            'ticket_titulo_entrada', 'ticket_titulo_salida',
            'ticket_pie_entrada', 'ticket_pie_salida',
            'ticket_mostrar_qr', 'ticket_mostrar_frecuente',
            'ticket_color',
            // Tarifas
            'tarifa_normal_precio', 'tarifa_normal_activa',
            'tarifa_fraccion_minutos', 'tarifa_fraccion_precio', 'tarifa_fraccion_activa',
            'tarifa_nocturna_precio', 'tarifa_nocturna_hora_inicio',
            'tarifa_nocturna_hora_fin', 'tarifa_nocturna_activa',
            'tarifa_dia_maximo', 'tarifa_dia_activa',
        ];

        // Filtrar solo las claves permitidas
        $filtrado = array_filter(
            $data,
            fn($k) => in_array($k, $permitidas),
            ARRAY_FILTER_USE_KEY
        );

        // Validar tarifa
        if (isset($filtrado['tarifa_por_hora'])) {
            $tarifa = floatval($filtrado['tarifa_por_hora']);
            if ($tarifa <= 0) {
                JsonResponse::send(['error' => 'La tarifa debe ser mayor a 0'], 400);
            }
            $filtrado['tarifa_por_hora'] = number_format($tarifa, 2, '.', '');
        }

        // Validar color hex
        if (isset($filtrado['ticket_color'])) {
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $filtrado['ticket_color'])) {
                JsonResponse::send(['error' => 'Color inválido, usa formato #RRGGBB'], 400);
            }
        }

        if ($this->repo->guardarVarias($filtrado)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Configuración guardada correctamente'
            ]);
        } else {
            JsonResponse::send(['error' => 'Error al guardar la configuración'], 500);
        }
    }
}