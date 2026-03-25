<?php
namespace App\Repositories;

use App\Config\Database;
use PDO;

class ConfigRepository {
    private PDO $db;

    public function __construct() {
        $this->db = (new Database())->getConnection();
    }

    // Obtener todas las configuraciones como array clave => valor
    public function obtenerTodas(): array {
        $stmt = $this->db->query("SELECT clave, valor FROM configuracion ORDER BY clave");
        $rows  = $stmt->fetchAll();
        $config = [];
        foreach ($rows as $row) {
            $config[$row['clave']] = $row['valor'];
        }
        return $config;
    }

    // Obtener un valor específico con fallback
    public function obtener(string $clave, string $defecto = ''): string {
        $stmt = $this->db->prepare(
            "SELECT valor FROM configuracion WHERE clave = :clave LIMIT 1"
        );
        $stmt->execute([':clave' => $clave]);
        $row = $stmt->fetch();
        return $row ? $row['valor'] : $defecto;
    }

    // Guardar múltiples configuraciones a la vez
    public function guardarVarias(array $datos): bool {
        $stmt = $this->db->prepare(
            "INSERT INTO configuracion (clave, valor)
             VALUES (:clave, :valor)
             ON DUPLICATE KEY UPDATE valor = :valor, updated_at = NOW()"
        );

        $this->db->beginTransaction();
        try {
            foreach ($datos as $clave => $valor) {
                $stmt->execute([':clave' => $clave, ':valor' => $valor]);
            }
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log('Config save error: ' . $e->getMessage());
            return false;
        }
    }
}