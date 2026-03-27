<?php
namespace App\Repositories;

use App\Config\Database;
use PDO;

class TurnosRepository {
    private PDO $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    // ══════════════════════════════════════════════════════════
    // TURNOS
    // ══════════════════════════════════════════════════════════

    public function obtenerTurnos(): array {
        return $this->db->query(
            "SELECT * FROM turnos ORDER BY hora_inicio"
        )->fetchAll();
    }

    public function obtenerTurnosActivos(): array {
        return $this->db->query(
            "SELECT * FROM turnos WHERE activo = 1 ORDER BY hora_inicio"
        )->fetchAll();
    }

    public function crearTurno(array $datos): bool {
        $stmt = $this->db->prepare(
            "INSERT INTO turnos (nombre, hora_inicio, hora_fin, precio_fijo, precio_extra, minutos_extra)
             VALUES (:nombre, :hora_inicio, :hora_fin, :precio_fijo, :precio_extra, :minutos_extra)"
        );
        return $stmt->execute([
            ':nombre'        => $datos['nombre'],
            ':hora_inicio'   => $datos['hora_inicio'],
            ':hora_fin'      => $datos['hora_fin'],
            ':precio_fijo'   => $datos['precio_fijo'],
            ':precio_extra'  => $datos['precio_extra'],
            ':minutos_extra' => $datos['minutos_extra'],
        ]);
    }

    public function editarTurno(int $id, array $datos): bool {
        $stmt = $this->db->prepare(
            "UPDATE turnos SET nombre=:nombre, hora_inicio=:hora_inicio, hora_fin=:hora_fin,
             precio_fijo=:precio_fijo, precio_extra=:precio_extra, minutos_extra=:minutos_extra
             WHERE id=:id"
        );
        return $stmt->execute([
            ':nombre'        => $datos['nombre'],
            ':hora_inicio'   => $datos['hora_inicio'],
            ':hora_fin'      => $datos['hora_fin'],
            ':precio_fijo'   => $datos['precio_fijo'],
            ':precio_extra'  => $datos['precio_extra'],
            ':minutos_extra' => $datos['minutos_extra'],
            ':id'            => $id,
        ]);
    }

    public function toggleTurno(int $id): bool {
        $stmt = $this->db->prepare(
            "UPDATE turnos SET activo = NOT activo WHERE id = :id"
        );
        return $stmt->execute([':id' => $id]);
    }

    // ── Sesiones de turno ─────────────────────────────────────

    public function registrarEntradaTurno(int $turnoId, string $matricula, string $observaciones = ''): bool {
        $stmt = $this->db->prepare(
            "INSERT INTO turno_sessions (turno_id, matricula, hora_entrada, estado, observaciones)
             VALUES (:turno_id, :matricula, NOW(), 'ACTIVA', :observaciones)"
        );
        return $stmt->execute([
            ':turno_id'     => $turnoId,
            ':matricula'    => $matricula,
            ':observaciones'=> $observaciones ?: null,
        ]);
    }

    public function obtenerSesionActivaTurno(string $matricula): ?array {
        $stmt = $this->db->prepare(
            "SELECT ts.*, t.nombre AS turno_nombre, t.hora_fin AS turno_hora_fin,
                    t.precio_fijo, t.precio_extra, t.minutos_extra
             FROM turno_sessions ts
             INNER JOIN turnos t ON t.id = ts.turno_id
             WHERE ts.matricula = :matricula AND ts.estado = 'ACTIVA'
             ORDER BY ts.hora_entrada DESC LIMIT 1"
        );
        $stmt->execute([':matricula' => $matricula]);
        return $stmt->fetch() ?: null;
    }

    public function registrarSalidaTurno(int $sesionId, float $total, int $minutos): bool {
        $stmt = $this->db->prepare(
            "UPDATE turno_sessions
             SET hora_salida = NOW(), total_pagado = :total,
                 minutos_total = :minutos, estado = 'FINALIZADA'
             WHERE id = :id"
        );
        return $stmt->execute([
            ':total'   => $total,
            ':minutos' => $minutos,
            ':id'      => $sesionId,
        ]);
    }

    public function calcularCobroTurno(array $sesion): array {
        $entrada  = new \DateTime($sesion['hora_entrada']);
        $salida   = new \DateTime();
        $finTurno = new \DateTime($entrada->format('Y-m-d') . ' ' . $sesion['turno_hora_fin']);

        // Si el turno cruza medianoche
        if ($sesion['turno_hora_fin'] < date('H:i:s', strtotime($sesion['hora_entrada']))) {
            $finTurno->modify('+1 day');
        }

        $precioFijo   = (float) $sesion['precio_fijo'];
        $precioExtra  = (float) $sesion['precio_extra'];
        $minutosExtra = (int)   $sesion['minutos_extra'];
        $minutos      = (int) (($salida->getTimestamp() - $entrada->getTimestamp()) / 60);

        if ($salida <= $finTurno) {
            return [
                'monto'   => $precioFijo,
                'minutos' => $minutos,
                'detalle' => "Turno {$sesion['turno_nombre']} — precio fijo",
            ];
        }

        $minutosExcedidos = ($salida->getTimestamp() - $finTurno->getTimestamp()) / 60;
        $fracciones       = ceil($minutosExcedidos / $minutosExtra);
        $extra            = min($fracciones * $precioExtra, $precioFijo);
        $total            = $precioFijo + $extra;

        return [
            'monto'   => round($total, 2),
            'minutos' => $minutos,
            'detalle' => "Turno {$sesion['turno_nombre']} + {$fracciones} fracciones extra",
        ];
    }

    public function obtenerRegistrosTurnos(?int $turnoId = null): array {
        $where  = $turnoId ? "AND ts.turno_id = :turno_id" : "";
        $params = $turnoId ? [':turno_id' => $turnoId] : [];

        $stmt = $this->db->prepare(
            "SELECT ts.*, t.nombre AS turno_nombre, t.precio_fijo
             FROM turno_sessions ts
             INNER JOIN turnos t ON t.id = ts.turno_id
             WHERE 1=1 $where
             ORDER BY ts.hora_entrada DESC
             LIMIT 100"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function obtenerStatsTurnos(): array {
        return $this->db->query(
            "SELECT t.nombre,
                    COUNT(ts.id) AS sesiones,
                    COALESCE(SUM(ts.total_pagado), 0) AS total
             FROM turnos t
             LEFT JOIN turno_sessions ts ON ts.turno_id = t.id
                 AND DATE(ts.hora_entrada) = CURDATE()
                 AND ts.estado = 'FINALIZADA'
             GROUP BY t.id, t.nombre
             ORDER BY t.hora_inicio"
        )->fetchAll();
    }

    // ══════════════════════════════════════════════════════════
    // CONVENIOS
    // ══════════════════════════════════════════════════════════

    public function obtenerConvenios(): array {
        return $this->db->query(
            "SELECT * FROM convenios ORDER BY nombre_empresa"
        )->fetchAll();
    }

    public function obtenerConveniosActivos(): array {
        return $this->db->query(
            "SELECT * FROM convenios WHERE activo = 1 ORDER BY nombre_empresa"
        )->fetchAll();
    }

    public function crearConvenio(array $datos): bool {
        $stmt = $this->db->prepare(
            "INSERT INTO convenios (nombre_empresa, horas_gratuitas, contacto, notas)
             VALUES (:nombre, :horas, :contacto, :notas)"
        );
        return $stmt->execute([
            ':nombre'   => $datos['nombre_empresa'],
            ':horas'    => $datos['horas_gratuitas'],
            ':contacto' => $datos['contacto'] ?? null,
            ':notas'    => $datos['notas']    ?? null,
        ]);
    }

    public function editarConvenio(int $id, array $datos): bool {
        $stmt = $this->db->prepare(
            "UPDATE convenios SET nombre_empresa=:nombre, horas_gratuitas=:horas,
             contacto=:contacto, notas=:notas WHERE id=:id"
        );
        return $stmt->execute([
            ':nombre'   => $datos['nombre_empresa'],
            ':horas'    => $datos['horas_gratuitas'],
            ':contacto' => $datos['contacto'] ?? null,
            ':notas'    => $datos['notas']    ?? null,
            ':id'       => $id,
        ]);
    }

    public function toggleConvenio(int $id): bool {
        $stmt = $this->db->prepare(
            "UPDATE convenios SET activo = NOT activo WHERE id = :id"
        );
        return $stmt->execute([':id' => $id]);
    }

    // ── Sesiones de convenio ──────────────────────────────────

    public function registrarEntradaConvenio(int $convenioId, string $matricula, float $horasGratuitas, string $observaciones = ''): bool {
        $stmt = $this->db->prepare(
            "INSERT INTO convenio_sessions (convenio_id, matricula, hora_entrada, horas_gratuitas, estado, observaciones)
             VALUES (:convenio_id, :matricula, NOW(), :horas, 'ACTIVA', :observaciones)"
        );
        return $stmt->execute([
            ':convenio_id'   => $convenioId,
            ':matricula'     => $matricula,
            ':horas'         => $horasGratuitas,
            ':observaciones' => $observaciones ?: null,
        ]);
    }

    public function obtenerSesionActivaConvenio(string $matricula): ?array {
        $stmt = $this->db->prepare(
            "SELECT cs.*, c.nombre_empresa, c.horas_gratuitas AS horas_convenio
             FROM convenio_sessions cs
             INNER JOIN convenios c ON c.id = cs.convenio_id
             WHERE cs.matricula = :matricula AND cs.estado = 'ACTIVA'
             ORDER BY cs.hora_entrada DESC LIMIT 1"
        );
        $stmt->execute([':matricula' => $matricula]);
        return $stmt->fetch() ?: null;
    }

    public function registrarSalidaConvenio(int $sesionId, float $total, int $minutos): bool {
        $stmt = $this->db->prepare(
            "UPDATE convenio_sessions
             SET hora_salida = NOW(), total_pagado = :total,
                 minutos_total = :minutos, estado = 'FINALIZADA'
             WHERE id = :id"
        );
        return $stmt->execute([
            ':total'   => $total,
            ':minutos' => $minutos,
            ':id'      => $sesionId,
        ]);
    }

    public function calcularCobroConvenio(array $sesion, float $tarifaNormal): array {
        $entrada        = new \DateTime($sesion['hora_entrada']);
        $salida         = new \DateTime();
        $minutos        = (int) (($salida->getTimestamp() - $entrada->getTimestamp()) / 60);
        $horasGratuitas = (float) $sesion['horas_gratuitas'];
        $minutosGratis  = $horasGratuitas * 60;
        $minutosACobrar = max(0, $minutos - $minutosGratis);
        $horasACobrar   = ceil($minutosACobrar / 60);
        $monto          = round($horasACobrar * $tarifaNormal, 2);

        return [
            'monto'   => $monto,
            'minutos' => $minutos,
            'detalle' => "{$sesion['nombre_empresa']} — {$horasGratuitas}h gratis",
        ];
    }

    public function obtenerRegistrosConvenios(?int $convenioId = null): array {
        $where  = $convenioId ? "AND cs.convenio_id = :convenio_id" : "";
        $params = $convenioId ? [':convenio_id' => $convenioId] : [];

        $stmt = $this->db->prepare(
            "SELECT cs.*, c.nombre_empresa, c.horas_gratuitas AS horas_convenio
             FROM convenio_sessions cs
             INNER JOIN convenios c ON c.id = cs.convenio_id
             WHERE 1=1 $where
             ORDER BY cs.hora_entrada DESC
             LIMIT 100"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }
}