<?php
namespace App\Models;

class PriceCalculator {
    private float $tarifaPorHora;

    public function __construct(float $tarifaPorHora = 20.00) {
        $this->tarifaPorHora = $tarifaPorHora;
    }

    public function calcularMonto(int $minutosTranscurridos): float {
        // Se cobra por hora completa o fracción
        $horasACobrar = ceil($minutosTranscurridos / 60);
        return $horasACobrar * $this->tarifaPorHora;
    }
}