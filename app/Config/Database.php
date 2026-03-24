<?php
namespace App\Config;

use PDO;
use PDOException;

class Database {
    private string $host;
    private string $db_name;
    private string $username;
    private string $password;
    private ?PDO $conn = null;

    public function __construct() {
        // Cargar .env manualmente (sin dependencias externas)
        $this->cargarEnv();

        $this->host     = $_ENV['DB_HOST'] ?? '127.0.0.1';
        $this->db_name  = $_ENV['DB_NAME'] ?? 'estacionamiento_db';
        $this->username = $_ENV['DB_USER'] ?? 'root';
        $this->password = $_ENV['DB_PASS'] ?? '';
    }

    private function cargarEnv(): void {
        $envFile = dirname(__DIR__, 2) . '/.env';

        if (!file_exists($envFile)) return;

        $lineas = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lineas as $linea) {
            // Ignorar comentarios
            if (str_starts_with(trim($linea), '#')) continue;

            if (str_contains($linea, '=')) {
                [$clave, $valor] = explode('=', $linea, 2);
                $clave = trim($clave);
                $valor = trim($valor);
                $_ENV[$clave] = $valor;
                putenv("$clave=$valor");
            }
        }
    }

    public function getConnection(): PDO {
        if ($this->conn === null) {
            try {
                $dsn = "mysql:host={$this->host};dbname={$this->db_name};charset=utf8mb4";
                $this->conn = new PDO($dsn, $this->username, $this->password);
                $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                $this->conn->exec("SET time_zone = '-06:00'");
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Error de conexión a la base de datos']);
                exit;
            }
        }
        return $this->conn;
    }
}