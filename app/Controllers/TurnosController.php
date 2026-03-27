<?php
namespace App\Controllers;

use App\Middleware\AuthMiddleware;
use App\Repositories\TurnosRepository;
use App\Repositories\ConfigRepository;
use App\Views\JsonResponse;

class TurnosController {
    private TurnosRepository $repo;

    public function __construct() {
        $this->repo = new TurnosRepository();
    }

    // ══════════════════════════════════════════════════════════
    // TURNOS
    // ══════════════════════════════════════════════════════════

    public function listarTurnos(): void {
        AuthMiddleware::verificar();
        JsonResponse::send(['status' => 'success', 'data' => $this->repo->obtenerTurnos()]);
    }

    public function listarTurnosActivos(): void {
        AuthMiddleware::verificar();
        JsonResponse::send(['status' => 'success', 'data' => $this->repo->obtenerTurnosActivos()]);
    }

    public function crearTurno(): void {
        AuthMiddleware::soloAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data['nombre'] || !$data['hora_inicio'] || !$data['hora_fin'] || !isset($data['precio_fijo'])) {
            JsonResponse::send(['error' => 'Datos incompletos'], 400);
        }
        if ($this->repo->crearTurno($data)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Turno creado'], 201);
        } else {
            JsonResponse::send(['error' => 'Error al crear el turno'], 500);
        }
    }

    public function editarTurno(): void {
        AuthMiddleware::soloAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int) ($data['id'] ?? 0);
        if (!$id) JsonResponse::send(['error' => 'ID requerido'], 400);
        if ($this->repo->editarTurno($id, $data)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Turno actualizado']);
        } else {
            JsonResponse::send(['error' => 'Error al actualizar'], 500);
        }
    }

    public function toggleTurno(): void {
        AuthMiddleware::soloAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int) ($data['id'] ?? 0);
        if ($this->repo->toggleTurno($id)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Estado actualizado']);
        } else {
            JsonResponse::send(['error' => 'Error al actualizar'], 500);
        }
    }

    public function registrarEntradaTurno(): void {
        AuthMiddleware::verificar();
        $data      = json_decode(file_get_contents('php://input'), true);
        $turnoId   = (int) ($data['turno_id']   ?? 0);
        $matricula = trim($data['matricula']     ?? '');
        $obs       = trim($data['observaciones'] ?? '');

        if (!$turnoId || !$matricula) {
            JsonResponse::send(['error' => 'turno_id y matricula requeridos'], 400);
        }

        // Verificar que no tenga sesión activa en este módulo
        if ($this->repo->obtenerSesionActivaTurno($matricula)) {
            JsonResponse::send(['error' => 'El vehículo ya tiene una sesión de turno activa'], 400);
        }

        if ($this->repo->registrarEntradaTurno($turnoId, $matricula, $obs)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Entrada de turno registrada',
                'data'    => ['matricula' => $matricula, 'hora_entrada' => date('Y-m-d H:i:s')]
            ], 201);
        } else {
            JsonResponse::send(['error' => 'Error al registrar la entrada'], 500);
        }
    }

    public function registrarSalidaTurno(): void {
        AuthMiddleware::verificar();
        $data      = json_decode(file_get_contents('php://input'), true);
        $matricula = trim($data['matricula'] ?? '');

        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);

        $sesion = $this->repo->obtenerSesionActivaTurno($matricula);
        if (!$sesion) {
            JsonResponse::send(['error' => 'No se encontró sesión de turno activa'], 404);
        }

        $resultado = $this->repo->calcularCobroTurno($sesion);

        if ($this->repo->registrarSalidaTurno((int) $sesion['id'], $resultado['monto'], $resultado['minutos'])) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Salida de turno registrada',
                'data'    => [
                    'matricula'      => $matricula,
                    'hora_entrada'   => $sesion['hora_entrada'],
                    'hora_salida'    => date('Y-m-d H:i:s'),
                    'tiempo_minutos' => $resultado['minutos'],
                    'total_pagar'    => $resultado['monto'],
                    'detalle'        => $resultado['detalle'],
                ]
            ]);
        } else {
            JsonResponse::send(['error' => 'Error al registrar la salida'], 500);
        }
    }

    public function registrosTurnos(): void {
        AuthMiddleware::verificar();
        $turnoId = isset($_GET['turno_id']) ? (int) $_GET['turno_id'] : null;
        JsonResponse::send(['status' => 'success', 'data' => $this->repo->obtenerRegistrosTurnos($turnoId)]);
    }

    public function statsTurnos(): void {
        AuthMiddleware::verificar();
        JsonResponse::send(['status' => 'success', 'data' => $this->repo->obtenerStatsTurnos()]);
    }

    // ══════════════════════════════════════════════════════════
    // CONVENIOS
    // ══════════════════════════════════════════════════════════

    public function listarConvenios(): void {
        AuthMiddleware::verificar();
        JsonResponse::send(['status' => 'success', 'data' => $this->repo->obtenerConvenios()]);
    }

    public function listarConveniosActivos(): void {
        AuthMiddleware::verificar();
        JsonResponse::send(['status' => 'success', 'data' => $this->repo->obtenerConveniosActivos()]);
    }

    public function crearConvenio(): void {
        AuthMiddleware::soloAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data['nombre_empresa'] || !isset($data['horas_gratuitas'])) {
            JsonResponse::send(['error' => 'Datos incompletos'], 400);
        }
        if ($this->repo->crearConvenio($data)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Convenio creado'], 201);
        } else {
            JsonResponse::send(['error' => 'Error al crear el convenio'], 500);
        }
    }

    public function editarConvenio(): void {
        AuthMiddleware::soloAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int) ($data['id'] ?? 0);
        if (!$id) JsonResponse::send(['error' => 'ID requerido'], 400);
        if ($this->repo->editarConvenio($id, $data)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Convenio actualizado']);
        } else {
            JsonResponse::send(['error' => 'Error al actualizar'], 500);
        }
    }

    public function toggleConvenio(): void {
        AuthMiddleware::soloAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int) ($data['id'] ?? 0);
        if ($this->repo->toggleConvenio($id)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Estado actualizado']);
        } else {
            JsonResponse::send(['error' => 'Error al actualizar'], 500);
        }
    }

    public function registrarEntradaConvenio(): void {
        AuthMiddleware::verificar();
        $data       = json_decode(file_get_contents('php://input'), true);
        $convenioId = (int) ($data['convenio_id'] ?? 0);
        $matricula  = trim($data['matricula']      ?? '');
        $obs        = trim($data['observaciones']  ?? '');

        if (!$convenioId || !$matricula) {
            JsonResponse::send(['error' => 'convenio_id y matricula requeridos'], 400);
        }

        // Buscar datos del convenio
        $convenios = $this->repo->obtenerConvenios();
        $convenio  = array_filter($convenios, fn($c) => (int)$c['id'] === $convenioId);
        $convenio  = array_values($convenio)[0] ?? null;

        if (!$convenio) JsonResponse::send(['error' => 'Convenio no encontrado'], 404);

        if ($this->repo->obtenerSesionActivaConvenio($matricula)) {
            JsonResponse::send(['error' => 'El vehículo ya tiene una sesión de convenio activa'], 400);
        }

        if ($this->repo->registrarEntradaConvenio($convenioId, $matricula, (float)$convenio['horas_gratuitas'], $obs)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Entrada de convenio registrada',
                'data'    => [
                    'matricula'       => $matricula,
                    'hora_entrada'    => date('Y-m-d H:i:s'),
                    'nombre_empresa'  => $convenio['nombre_empresa'],
                    'horas_gratuitas' => $convenio['horas_gratuitas'],
                ]
            ], 201);
        } else {
            JsonResponse::send(['error' => 'Error al registrar la entrada'], 500);
        }
    }

    public function registrarSalidaConvenio(): void {
        AuthMiddleware::verificar();
        $data      = json_decode(file_get_contents('php://input'), true);
        $matricula = trim($data['matricula'] ?? '');

        if (!$matricula) JsonResponse::send(['error' => 'Matrícula requerida'], 400);

        $sesion = $this->repo->obtenerSesionActivaConvenio($matricula);
        if (!$sesion) {
            JsonResponse::send(['error' => 'No se encontró sesión de convenio activa'], 404);
        }

        // Tarifa normal desde config
        $config      = (new ConfigRepository())->obtenerTodas();
        $tarifaNormal = (float) ($config['tarifa_normal_precio'] ?? 25.50);

        $resultado = $this->repo->calcularCobroConvenio($sesion, $tarifaNormal);

        if ($this->repo->registrarSalidaConvenio((int) $sesion['id'], $resultado['monto'], $resultado['minutos'])) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Salida de convenio registrada',
                'data'    => [
                    'matricula'       => $matricula,
                    'hora_entrada'    => $sesion['hora_entrada'],
                    'hora_salida'     => date('Y-m-d H:i:s'),
                    'tiempo_minutos'  => $resultado['minutos'],
                    'total_pagar'     => $resultado['monto'],
                    'horas_gratuitas' => $sesion['horas_gratuitas'],
                    'detalle'         => $resultado['detalle'],
                ]
            ]);
        } else {
            JsonResponse::send(['error' => 'Error al registrar la salida'], 500);
        }
    }

    public function registrosConvenios(): void {
        AuthMiddleware::verificar();
        $convenioId = isset($_GET['convenio_id']) ? (int) $_GET['convenio_id'] : null;
        JsonResponse::send(['status' => 'success', 'data' => $this->repo->obtenerRegistrosConvenios($convenioId)]);
    }
}