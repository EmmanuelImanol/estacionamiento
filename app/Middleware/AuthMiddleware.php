<?php
namespace App\Middleware;

use App\Views\JsonResponse;

class AuthMiddleware {

    // Verifica que haya sesión activa
    public static function verificar(): void {
        if (empty($_SESSION['usuario_id'])) {
            JsonResponse::send(['error' => 'No autorizado. Inicia sesión.'], 401);
        }
    }

    // Solo administradores
    public static function soloAdmin(): void {
        self::verificar();
        if ($_SESSION['usuario_rol'] !== 'admin') {
            JsonResponse::send(['error' => 'Acceso denegado. Se requiere rol administrador.'], 403);
        }
    }
}