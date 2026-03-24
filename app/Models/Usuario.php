<?php
namespace App\Models;

class Usuario {
    public int    $id;
    public string $nombre;
    public string $email;
    public string $passwordHash;
    public string $rol;
    public bool   $activo;

    public function __construct(array $data) {
        $this->id           = (int)  $data['id'];
        $this->nombre       =        $data['nombre'];
        $this->email        =        $data['email'];
        $this->passwordHash =        $data['password_hash'];
        $this->rol          =        $data['rol'];
        $this->activo       = (bool) $data['activo'];
    }

    public function verificarPassword(string $password): bool {
        return password_verify($password, $this->passwordHash);
    }

    public function esAdmin(): bool {
        return $this->rol === 'admin';
    }
}