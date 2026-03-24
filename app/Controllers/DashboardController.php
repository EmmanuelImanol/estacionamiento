<?php
namespace App\Controllers;

use App\Config\Database;
use App\Middleware\AuthMiddleware;
use App\Views\JsonResponse;
use PDO;

class DashboardController {
    private PDO $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    // ── Resumen del día ───────────────────────────────────────
    public function obtenerResumen(): void {
        AuthMiddleware::verificar();

        $resumen = $this->db->query("SELECT * FROM vista_resumen_dia")->fetch();
        $ticket  = $this->db->query(
            "SELECT 
                COALESCE(MAX(total_pagado), 0) AS ticket_maximo,
                COALESCE(AVG(total_pagado), 0) AS ticket_promedio
             FROM parking_sessions
             WHERE estado = 'FINALIZADA' AND DATE(hora_salida) = CURDATE()"
        )->fetch();

        JsonResponse::send([
            'status' => 'success',
            'data'   => [
                'total_autos_hoy' => (int)   ($resumen['total_autos_hoy']  ?? 0),
                'autos_adentro'   => (int)   ($resumen['autos_adentro']    ?? 0),
                'autos_salidos'   => (int)   ($resumen['autos_salidos']    ?? 0),
                'ingresos_hoy'    => (float) ($resumen['ingresos_hoy']     ?? 0),
                'ticket_maximo'   => (float) ($ticket['ticket_maximo']     ?? 0),
                'ticket_promedio' => (float) ($ticket['ticket_promedio']   ?? 0),
            ]
        ]);
    }

    // ── Gráfica ───────────────────────────────────────────────
    public function obtenerGrafica(): void {
        $porHora = $this->db->query("SELECT * FROM vista_ingresos_por_hora")->fetchAll();

        $porDia  = $this->db->query(
            "SELECT DATE(hora_salida) AS fecha,
                    COUNT(*) AS cantidad,
                    SUM(total_pagado) AS ingresos
             FROM parking_sessions
             WHERE estado = 'FINALIZADA'
               AND hora_salida >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
             GROUP BY DATE(hora_salida)
             ORDER BY fecha"
        )->fetchAll();

        JsonResponse::send([
            'status' => 'success',
            'data'   => ['por_hora' => $porHora, 'por_dia' => $porDia]
        ]);
    }

    // ── Sesiones recientes ────────────────────────────────────
    public function obtenerSesionesRecientes(): void {
        AuthMiddleware::verificar();

        $limite = $_SESSION['usuario_rol'] === 'admin' ? 20 : 10;

        $stmt = $this->db->prepare(
            "SELECT ps.matricula, ps.hora_entrada, ps.hora_salida,
                    ps.total_pagado, ps.estado,
                    COALESCE(c.nombre, 'Desconocido') AS conductor
             FROM parking_sessions ps
             LEFT JOIN clientes c ON ps.matricula = c.matricula
             ORDER BY ps.hora_entrada DESC
             LIMIT :limite"
        );
        $stmt->bindValue(':limite', $limite, PDO::PARAM_INT);
        $stmt->execute();

        JsonResponse::send(['status' => 'success', 'data' => $stmt->fetchAll()]);
    }

    // ── Sesiones con filtro por fecha ─────────────────────────
    public function obtenerSesionesFiltradas(): void {
        AuthMiddleware::verificar();

        $desde  = $_GET['desde']  ?? date('Y-m-d');
        $hasta  = $_GET['hasta']  ?? date('Y-m-d');
        $estado = $_GET['estado'] ?? '';

        // Validar fechas
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) $desde = date('Y-m-d');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta))  $hasta = date('Y-m-d');

        $whereEstado = '';
        $params      = [':desde' => $desde, ':hasta' => $hasta . ' 23:59:59'];

        if (in_array($estado, ['ACTIVA', 'FINALIZADA'])) {
            $whereEstado      = "AND ps.estado = :estado";
            $params[':estado'] = $estado;
        }

        $stmt = $this->db->prepare(
            "SELECT ps.matricula, ps.hora_entrada, ps.hora_salida,
                    ps.total_pagado, ps.estado,
                    COALESCE(c.nombre, 'Desconocido') AS conductor,
                    TIMESTAMPDIFF(MINUTE, ps.hora_entrada, ps.hora_salida) AS minutos
             FROM parking_sessions ps
             LEFT JOIN clientes c ON ps.matricula = c.matricula
             WHERE ps.hora_entrada BETWEEN :desde AND :hasta
             $whereEstado
             ORDER BY ps.hora_entrada DESC"
        );
        $stmt->execute($params);
        $sesiones = $stmt->fetchAll();

        // Totales del rango
        $total_ingresos = array_sum(array_column(
            array_filter($sesiones, fn($s) => $s['estado'] === 'FINALIZADA'),
            'total_pagado'
        ));

        JsonResponse::send([
            'status' => 'success',
            'data'   => [
                'sesiones'       => $sesiones,
                'total_ingresos' => round($total_ingresos, 2),
                'total_sesiones' => count($sesiones),
            ]
        ]);
    }

    // ── Exportar CSV ──────────────────────────────────────────
    public function exportarSesiones(): void {
        AuthMiddleware::verificar();

        $desde = $_GET['desde'] ?? date('Y-m-d');
        $hasta = $_GET['hasta'] ?? date('Y-m-d');

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) $desde = date('Y-m-d');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta))  $hasta = date('Y-m-d');

        $stmt = $this->db->prepare(
            "SELECT ps.matricula, COALESCE(c.nombre, 'Sin nombre') AS conductor,
                    ps.hora_entrada, ps.hora_salida, ps.estado,
                    COALESCE(ps.total_pagado, 0) AS total_pagado,
                    TIMESTAMPDIFF(MINUTE, ps.hora_entrada, ps.hora_salida) AS minutos
             FROM parking_sessions ps
             LEFT JOIN clientes c ON ps.matricula = c.matricula
             WHERE ps.hora_entrada BETWEEN :desde AND :hasta
             ORDER BY ps.hora_entrada DESC"
        );
        $stmt->execute([':desde' => $desde, ':hasta' => $hasta . ' 23:59:59']);
        $sesiones = $stmt->fetchAll();

        // Cambiar header a CSV
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="sesiones-' . $desde . '-' . $hasta . '.csv"');
        header('Content-Type: application/json', true); // limpiar el json header previo

        // Reiniciar headers correctamente
        if (!headers_sent()) {
            header_remove('Content-Type');
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="sesiones-' . $desde . '_' . $hasta . '.csv"');
        }

        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM UTF-8

        fputcsv($output, ['Matrícula', 'Conductor', 'Entrada', 'Salida', 'Minutos', 'Total', 'Estado']);

        foreach ($sesiones as $s) {
            fputcsv($output, [
                $s['matricula'],
                $s['conductor'],
                $s['hora_entrada'],
                $s['hora_salida']  ?? '',
                $s['minutos']      ?? '',
                '$' . number_format($s['total_pagado'], 2),
                $s['estado'],
            ]);
        }

        fclose($output);
        exit;
    }
}