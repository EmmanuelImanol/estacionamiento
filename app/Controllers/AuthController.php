<?php

namespace App\Controllers;

use App\Middleware\AuthMiddleware;
use App\Repositories\UsuarioRepository;
use App\Views\JsonResponse;

class AuthController
{
    private UsuarioRepository $repo;

    public function __construct()
    {
        $this->repo = new UsuarioRepository();
    }

    public function login(): void
    {
        $data     = json_decode(file_get_contents('php://input'), true);
        $email    = trim($data['email']    ?? '');
        $password = trim($data['password'] ?? '');

        if (!$email || !$password) {
            JsonResponse::send(['error' => 'Email y contraseña requeridos'], 400);
        }

        $usuario = $this->repo->buscarPorEmail($email);

        if (!$usuario || !$usuario->verificarPassword($password)) {
            JsonResponse::send(['error' => 'Credenciales incorrectas'], 401);
        }

        // Guardamos en sesión
        $_SESSION['usuario_id']  = $usuario->id;
        $_SESSION['usuario_rol'] = $usuario->rol;
        $_SESSION['usuario_nombre'] = $usuario->nombre;

        JsonResponse::send([
            'status'  => 'success',
            'message' => 'Bienvenido, ' . $usuario->nombre,
            'data'    => [
                'nombre' => $usuario->nombre,
                'rol'    => $usuario->rol
            ]
        ]);
    }

    public function logout(): void
    {
        session_destroy();
        JsonResponse::send(['status' => 'success', 'message' => 'Sesión cerrada']);
    }

    public function crearUsuario(): void
    {
        // Solo el admin puede crear usuarios
        AuthMiddleware::soloAdmin();

        $data     = json_decode(file_get_contents('php://input'), true);
        $nombre   = trim($data['nombre']   ?? '');
        $email    = trim($data['email']    ?? '');
        $password = trim($data['password'] ?? '');
        $rol      = trim($data['rol']      ?? 'cajero');

        if (!$nombre || !$email || !$password) {
            JsonResponse::send(['error' => 'Todos los campos son requeridos'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            JsonResponse::send(['error' => 'Email inválido'], 400);
        }

        if (!in_array($rol, ['admin', 'cajero'])) {
            JsonResponse::send(['error' => 'Rol inválido'], 400);
        }

        if (strlen($password) < 8) {
            JsonResponse::send(['error' => 'La contraseña debe tener al menos 8 caracteres'], 400);
        }

        if ($this->repo->crear($nombre, $email, $password, $rol)) {
            JsonResponse::send([
                'status'  => 'success',
                'message' => "Usuario '$nombre' creado correctamente"
            ], 201);
        } else {
            JsonResponse::send(['error' => 'El email ya está registrado'], 409);
        }
    }

    public function listarUsuarios(): void
    {
        AuthMiddleware::soloAdmin();
        JsonResponse::send([
            'status' => 'success',
            'data'   => $this->repo->obtenerTodos()
        ]);
    }

    public function desactivarUsuario(): void
    {
        AuthMiddleware::soloAdmin();
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int)($data['id'] ?? 0);

        // No puede desactivarse a sí mismo
        if ($id === (int)$_SESSION['usuario_id']) {
            JsonResponse::send(['error' => 'No puedes desactivar tu propia cuenta'], 400);
        }

        if ($this->repo->desactivar($id)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Usuario desactivado']);
        } else {
            JsonResponse::send(['error' => 'No se pudo desactivar el usuario'], 500);
        }
    }

    public function editarUsuario(): void
    {
        AuthMiddleware::soloAdmin();

        $data     = json_decode(file_get_contents('php://input'), true);
        $id       = (int)   ($data['id']       ?? 0);
        $nombre   = trim($data['nombre']   ?? '');
        $email    = trim($data['email']    ?? '');
        $rol      = trim($data['rol']      ?? '');
        $password =          $data['password'] ?? null;

        if (!$id || !$nombre || !$email || !$rol) {
            JsonResponse::send(['error' => 'Datos incompletos'], 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            JsonResponse::send(['error' => 'Email inválido'], 400);
        }

        if (!in_array($rol, ['admin', 'cajero'])) {
            JsonResponse::send(['error' => 'Rol inválido'], 400);
        }

        if ($password && strlen($password) < 8) {
            JsonResponse::send(['error' => 'La contraseña debe tener al menos 8 caracteres'], 400);
        }

        if ($this->repo->editar($id, $nombre, $email, $rol, $password)) {
            JsonResponse::send(['status' => 'success', 'message' => 'Usuario actualizado correctamente']);
        } else {
            JsonResponse::send(['error' => 'El email ya está en uso por otro usuario'], 409);
        }
    }
}
