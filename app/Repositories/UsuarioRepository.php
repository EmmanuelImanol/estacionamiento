<?php

namespace App\Repositories;

use App\Config\Database;
use App\Models\Usuario;
use PDO;

class UsuarioRepository
{
    private PDO $db;

    public function __construct()
    {
        $this->db = (new Database())->getConnection();
    }

    public function buscarPorEmail(string $email): ?Usuario
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM usuarios WHERE email = :email AND activo = 1 LIMIT 1"
        );
        $stmt->execute([':email' => $email]);
        $row = $stmt->fetch();
        return $row ? new Usuario($row) : null;
    }

    public function buscarPorId(int $id): ?Usuario
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM usuarios WHERE id = :id AND activo = 1 LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        return $row ? new Usuario($row) : null;
    }

    public function obtenerTodos(): array
    {
        $stmt = $this->db->query(
            "SELECT id, nombre, email, rol, activo, created_at 
             FROM usuarios ORDER BY created_at DESC"
        );
        return $stmt->fetchAll();
    }

    public function crear(string $nombre, string $email, string $password, string $rol): bool
    {
        // Verificar que el email no exista ya
        if ($this->buscarPorEmail($email)) return false;

        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $this->db->prepare(
            "INSERT INTO usuarios (nombre, email, password_hash, rol) 
             VALUES (:nombre, :email, :hash, :rol)"
        );
        return $stmt->execute([
            ':nombre' => $nombre,
            ':email'  => $email,
            ':hash'   => $hash,
            ':rol'    => $rol
        ]);
    }

    public function editar(int $id, string $nombre, string $email, string $rol, ?string $password): bool
    {
        // Verificar que el email no lo use otro usuario
        $stmt = $this->db->prepare(
            "SELECT id FROM usuarios WHERE email = :email AND id != :id LIMIT 1"
        );
        $stmt->execute([':email' => $email, ':id' => $id]);
        if ($stmt->fetch()) return false; // email duplicado

        if ($password) {
            $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
            $stmt = $this->db->prepare(
                "UPDATE usuarios SET nombre=:nombre, email=:email, rol=:rol, password_hash=:hash WHERE id=:id"
            );
            return $stmt->execute([
                ':nombre' => $nombre,
                ':email' => $email,
                ':rol'    => $rol,
                ':hash'  => $hash,
                ':id' => $id
            ]);
        }

        $stmt = $this->db->prepare(
            "UPDATE usuarios SET nombre=:nombre, email=:email, rol=:rol WHERE id=:id"
        );
        return $stmt->execute([
            ':nombre' => $nombre,
            ':email' => $email,
            ':rol'    => $rol,
            ':id'    => $id
        ]);
    }

    public function desactivar(int $id): bool
    {
        $stmt = $this->db->prepare(
            "UPDATE usuarios SET activo = 0 WHERE id = :id"
        );
        return $stmt->execute([':id' => $id]);
    }
}
