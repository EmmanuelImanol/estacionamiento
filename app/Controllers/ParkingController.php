<?php

namespace App\Controllers;

use App\Models\ParkingSession;
use App\Models\TarifaCalculator;
use App\Repositories\ParkingRepository;
use App\Repositories\TurnosRepository;
use App\Views\JsonResponse;

class ParkingController
{
    private TarifaCalculator  $calculadora;
    private ParkingRepository $repository;
    private TurnosRepository  $turnosRepo;

    public function __construct()
    {
        $this->calculadora = new TarifaCalculator();
        $this->repository  = new ParkingRepository();
        $this->turnosRepo  = new TurnosRepository();
    }

    public function registrarEntrada(string $matricula): void
    {
        $sesionExistente = $this->repository->obtenerSesionActiva($matricula);
        if ($sesionExistente) {
            JsonResponse::send(['error' => 'El vehículo ya se encuentra en el estacionamiento'], 400);
        }

        $cliente     = $this->repository->buscarOCrearCliente($matricula);
        $esNuevo     = $cliente['visitas'] === 1;
        $esFrecuente = $cliente['visitas'] > 1;
        $nombre      = $cliente['nombre'] ?? null;

        // Observaciones opcionales desde GET o POST
        $observaciones = trim($_GET['observaciones'] ?? '');

        $historial = [];
        if ($esFrecuente) {
            $historial = $this->repository->obtenerHistorialCliente($matricula);
        }

        $sesion = new ParkingSession($matricula);

        if ($this->repository->guardarEntrada($sesion, $observaciones)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Entrada registrada en base de datos',
                'data'    => [
                    'matricula'        => $sesion->getMatricula(),
                    'hora_entrada'     => $sesion->getHoraEntrada(),
                    'es_frecuente'     => $esFrecuente,
                    'es_nuevo'         => $esNuevo,
                    'nombre_conductor' => $nombre ?? 'Nuevo Cliente',
                    'visitas'          => $cliente['visitas'],
                    'ultima_visita'    => $cliente['ultima_visita'],
                    'historial'        => $historial,
                    'observaciones'    => $observaciones,
                ]
            ], 201);
        } else {
            JsonResponse::send(['error' => 'Error al guardar en la base de datos'], 500);
        }
    }

    public function registrarSalida(string $matricula): void
    {
        $sesionGuardada = $this->repository->obtenerSesionActiva($matricula);

        if (!$sesionGuardada) {
            JsonResponse::send(['error' => 'No se encontró un registro de entrada activo para esta matrícula'], 404);
        }

        $sesionGuardada->registrarSalida();

        $minutos    = $sesionGuardada->getMinutosTranscurridos();
        $turnoId    = $sesionGuardada->getTurnoId();
        $convenioId = $sesionGuardada->getConvenioId();

        // Calcular según tipo de tarifa asignada
        if ($turnoId) {
            $resultado = $this->turnosRepo->calcularCobro(
                $turnoId,
                $sesionGuardada->getHoraEntrada(),
                $sesionGuardada->getHoraSalida()
            );
        } elseif ($convenioId) {
            $tarifaNormal = (float) ($this->calculadora->obtenerResumen()['normal']['precio'] ?? 25.50);
            $resultado    = $this->turnosRepo->calcularCobroConvenio($convenioId, $minutos, $tarifaNormal);
        } else {
            $resultado = $this->calculadora->calcularMonto($minutos, $sesionGuardada->getHoraEntrada());
        }

        $totalPagar = $resultado['monto'];
        $tipoTarifa = $resultado['tipo'] ?? 'normal';
        $detalle    = $resultado['detalle'] ?? '';

        if ($this->repository->actualizarSalida($sesionGuardada, $totalPagar, $tipoTarifa)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Salida registrada correctamente',
                'data'    => [
                    'matricula'      => $sesionGuardada->getMatricula(),
                    'hora_entrada'   => $sesionGuardada->getHoraEntrada(),
                    'hora_salida'    => $sesionGuardada->getHoraSalida(),
                    'tiempo_minutos' => $minutos,
                    'total_pagar'    => $totalPagar,
                    'tarifa_tipo'    => $tipoTarifa,
                    'tarifa_detalle' => $detalle,
                    'gratuito'       => $resultado['gratuito'] ?? false,
                ]
            ]);
        } else {
            JsonResponse::send(['error' => 'Error al actualizar la base de datos'], 500);
        }
    }

    public function listarActivos(): void
    {
        JsonResponse::send(['status' => 'success', 'data' => $this->repository->obtenerTodasActivas()]);
    }

    public function listarClientesFrecuentes(): void
    {
        JsonResponse::send(['status' => 'success', 'data' => $this->repository->obtenerClientesFrecuentes()]);
    }

    public function obtenerHistorial(string $matricula): void
    {
        JsonResponse::send(['status' => 'success', 'data' => $this->repository->obtenerHistorialCliente($matricula)]);
    }

    public function obtenerTarifas(): void
    {
        JsonResponse::send(['status' => 'success', 'data' => $this->calculadora->obtenerResumen()]);
    }

    public function registrarNuevoCliente(): void
    {
        $data      = json_decode(file_get_contents('php://input'), true);
        $matricula = $data['matricula'] ?? null;
        $nombre    = $data['nombre']    ?? null;

        if (!$matricula || !$nombre) {
            JsonResponse::send(['error' => 'Datos incompletos'], 400);
        }

        if ($this->repository->guardarCliente($matricula, $nombre)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Cliente registrado: ' . $nombre]);
        } else {
            JsonResponse::send(['error' => 'Error al registrar cliente'], 500);
        }
    }
}