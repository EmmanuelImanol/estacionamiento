<?php

namespace App\Controllers;

use App\Models\ParkingSession;
use App\Models\PriceCalculator;
use App\Repositories\ParkingRepository;
use App\Views\JsonResponse;

class ParkingController
{
    private PriceCalculator  $calculadora;
    private ParkingRepository $repository;

    public function __construct()
    {
        $this->calculadora = new PriceCalculator(25.50);
        $this->repository  = new ParkingRepository();
    }

    // ── Entrada ───────────────────────────────────────────────────

    public function registrarEntrada(string $matricula): void
    {
        // Validar si ya hay sesión activa
        $sesionExistente = $this->repository->obtenerSesionActiva($matricula);
        if ($sesionExistente) {
            JsonResponse::send(['error' => 'El vehículo ya se encuentra en el estacionamiento'], 400);
        }

        // Buscar o crear cliente — siempre incrementa visitas
        $cliente     = $this->repository->buscarOCrearCliente($matricula);
        $esNuevo     = $cliente['visitas'] === 1;
        $esFrecuente = $cliente['visitas'] > 1;
        $nombre      = $cliente['nombre'] ?? null;

        // Obtener historial si es frecuente
        $historial = [];
        if ($esFrecuente) {
            $historial = $this->repository->obtenerHistorialCliente($matricula);
        }

        $sesion = new ParkingSession($matricula);

        if ($this->repository->guardarEntrada($sesion)) {
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
                ]
            ], 201);
        } else {
            JsonResponse::send(['error' => 'Error al guardar en la base de datos'], 500);
        }
    }

    // ── Salida ────────────────────────────────────────────────────

    public function registrarSalida(string $matricula): void
    {
        $sesionGuardada = $this->repository->obtenerSesionActiva($matricula);

        if (!$sesionGuardada) {
            JsonResponse::send(['error' => 'No se encontró un registro de entrada activo para esta matrícula'], 404);
        }

        $sesionGuardada->registrarSalida();

        $minutos    = $sesionGuardada->getMinutosTranscurridos();
        $totalPagar = $this->calculadora->calcularMonto($minutos);

        if ($this->repository->actualizarSalida($sesionGuardada, $totalPagar)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Salida registrada correctamente',
                'data'    => [
                    'matricula'     => $sesionGuardada->getMatricula(),
                    'hora_entrada'  => $sesionGuardada->getHoraEntrada(),
                    'hora_salida'   => $sesionGuardada->getHoraSalida(),
                    'tiempo_minutos' => $minutos,
                    'total_pagar'   => $totalPagar
                ]
            ]);
        } else {
            JsonResponse::send(['error' => 'Error al actualizar la base de datos'], 500);
        }
    }

    // ── Listados ──────────────────────────────────────────────────

    public function listarActivos(): void
    {
        $vehiculos = $this->repository->obtenerTodasActivas();
        JsonResponse::send([
            'status' => 'success',
            'data'   => $vehiculos
        ]);
    }

    public function listarClientesFrecuentes(): void
    {
        JsonResponse::send([
            'status' => 'success',
            'data'   => $this->repository->obtenerClientesFrecuentes()
        ]);
    }

    public function obtenerHistorial(string $matricula): void
    {
        JsonResponse::send([
            'status' => 'success',
            'data'   => $this->repository->obtenerHistorialCliente($matricula)
        ]);
    }

    // ── Clientes ──────────────────────────────────────────────────

    public function registrarNuevoCliente(): void
    {
        $data      = json_decode(file_get_contents('php://input'), true);
        $matricula = $data['matricula'] ?? null;
        $nombre    = $data['nombre']    ?? null;

        if (!$matricula || !$nombre) {
            JsonResponse::send(['error' => 'Datos incompletos'], 400);
        }

        if ($this->repository->guardarCliente($matricula, $nombre)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => 'Cliente registrado: ' . $nombre
            ]);
        } else {
            JsonResponse::send(['error' => 'Error al registrar cliente'], 500);
        }
    }
}