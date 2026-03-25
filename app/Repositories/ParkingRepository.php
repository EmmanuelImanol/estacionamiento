<?php

namespace App\Repositories;

use App\Config\Database;
use App\Models\ParkingSession;
use DateTime;
use PDO;

class ParkingRepository
{
    private PDO $db;

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    // ── Clientes ─────────────────────────────────────────────────

    public function buscarOCrearCliente(string $matricula): array
    {
        // Buscar si ya existe
        $stmt = $this->db->prepare(
            "SELECT matricula, nombre, visitas, ultima_visita 
             FROM clientes WHERE matricula = :matricula LIMIT 1"
        );
        $stmt->execute([':matricula' => $matricula]);
        $cliente = $stmt->fetch();

        if ($cliente) {
            // Existe — incrementar visitas y actualizar última visita
            $stmt = $this->db->prepare(
                "UPDATE clientes 
                 SET visitas = visitas + 1, ultima_visita = NOW() 
                 WHERE matricula = :matricula"
            );
            $stmt->execute([':matricula' => $matricula]);
            $cliente['visitas'] += 1;
            return $cliente;
        }

        // No existe — crear registro aunque sea sin nombre
        $stmt = $this->db->prepare(
            "INSERT INTO clientes (matricula, nombre, visitas, ultima_visita) 
             VALUES (:matricula, NULL, 1, NOW())"
        );
        $stmt->execute([':matricula' => $matricula]);

        return [
            'matricula'     => $matricula,
            'nombre'        => null,
            'visitas'       => 1,
            'ultima_visita' => date('Y-m-d H:i:s')
        ];
    }

    public function guardarCliente(string $matricula, string $nombre): bool
    {
        $sql  = "INSERT INTO clientes (matricula, nombre, visitas, ultima_visita) 
                 VALUES (:matricula, :nombre, 1, NOW())
                 ON DUPLICATE KEY UPDATE nombre = :nombre";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':matricula' => $matricula,
            ':nombre'    => $nombre
        ]);
    }

    public function obtenerHistorialCliente(string $matricula): array
    {
        $stmt = $this->db->prepare(
            "SELECT 
                ps.hora_entrada,
                ps.hora_salida,
                ps.total_pagado,
                ps.estado,
                TIMESTAMPDIFF(MINUTE, ps.hora_entrada, ps.hora_salida) AS minutos
             FROM parking_sessions ps
             WHERE ps.matricula = :matricula
             ORDER BY ps.hora_entrada DESC
             LIMIT 10"
        );
        $stmt->execute([':matricula' => $matricula]);
        return $stmt->fetchAll();
    }

    public function obtenerClientesFrecuentes(): array
    {
        $stmt = $this->db->query(
            "SELECT * FROM vista_clientes_frecuentes LIMIT 50"
        );
        return $stmt->fetchAll();
    }

    // ── Sesiones ─────────────────────────────────────────────────

    public function guardarEntrada(ParkingSession $sesion): bool
    {
        $query = "INSERT INTO parking_sessions (matricula, hora_entrada, estado) 
                  VALUES (:matricula, NOW(), 'ACTIVA')";
        $stmt  = $this->db->prepare($query);
        return $stmt->execute([
            ':matricula' => $sesion->getMatricula(),
        ]);
    }

    public function obtenerSesionActiva(string $matricula): ?ParkingSession
    {
        $query = "SELECT * FROM parking_sessions 
                  WHERE matricula = :matricula AND estado = 'ACTIVA' LIMIT 1";
        $stmt  = $this->db->prepare($query);
        $stmt->execute([':matricula' => $matricula]);
        $row = $stmt->fetch();

        if ($row) {
            return new ParkingSession($row['matricula'], $row['hora_entrada']);
        }

        return null;
    }

    public function actualizarSalida(ParkingSession $sesion, float $totalPagado, string $tipoTarifa = 'normal'): bool
    {
        $query = "UPDATE parking_sessions 
                  SET hora_salida = :hora_salida, 
                      total_pagado = :total_pagado,
                      tarifa_tipo = :tarifa_tipo,
                      estado = 'FINALIZADA' 
                  WHERE matricula = :matricula AND estado = 'ACTIVA'";
        $stmt  = $this->db->prepare($query);
        return $stmt->execute([
            ':hora_salida'   => $sesion->getHoraSalida(),
            ':total_pagado'  => $totalPagado,
            ':tarifa_tipo'   => $tipoTarifa,
            ':matricula'     => $sesion->getMatricula()
        ]);
    }

    public function obtenerTodasActivas(): array
    {
        $query = "SELECT matricula, hora_entrada 
                  FROM parking_sessions 
                  WHERE estado = 'ACTIVA' 
                  ORDER BY hora_entrada DESC";
        $stmt  = $this->db->query($query);
        return $stmt->fetchAll();
    }

    public static function formatearFechaMx(string $fechaSQL): string
    {
        if (!$fechaSQL) return "---";
        $fecha = new DateTime($fechaSQL);
        return $fecha->format('d/m/Y H:i:s');
    }
}