<?php
namespace App\Models;

use App\Repositories\ConfigRepository;

class TarifaCalculator {

    private array $config;

    public function __construct() {
        $repo         = new ConfigRepository();
        $this->config = $repo->obtenerTodas();
    }

    private function cfg(string $clave, string $defecto = ''): string {
        return $this->config[$clave] ?? $defecto;
    }

    // ── Calcular monto según minutos y hora de entrada ────────
    public function calcularMonto(int $minutosTranscurridos, string $horaEntrada): array {
        $horaEntradaH = (int) date('H', strtotime($horaEntrada));
        $horaEntradaM = (int) date('i', strtotime($horaEntrada));
        $horaEntradaDecimal = $horaEntradaH + ($horaEntradaM / 60);

        // ── 1. Fracción (tolerancia) ──────────────────────────
        $fraccionActiva  = $this->cfg('tarifa_fraccion_activa', '1') === '1';
        $fraccionMinutos = (int) $this->cfg('tarifa_fraccion_minutos', '15');
        $fraccionPrecio  = (float) $this->cfg('tarifa_fraccion_precio', '10.00');

        if ($fraccionActiva && $minutosTranscurridos <= $fraccionMinutos) {
            return [
                'monto'     => 0.00,
                'tipo'      => 'fraccion',
                'detalle'   => "Dentro de los {$fraccionMinutos} min de gracia",
                'gratuito'  => true,
            ];
        }

        // ── 2. Tarifa nocturna ────────────────────────────────
        $nocturnaActiva = $this->cfg('tarifa_nocturna_activa', '1') === '1';
        $nocturnaPrecio = (float) $this->cfg('tarifa_nocturna_precio', '15.00');
        $nocturnaInicio = $this->cfg('tarifa_nocturna_hora_inicio', '21:00');
        $nocturnaFin    = $this->cfg('tarifa_nocturna_hora_fin', '07:00');

        if ($nocturnaActiva && $this->esHoraNocturna($horaEntradaDecimal, $nocturnaInicio, $nocturnaFin)) {
            $horas  = ceil($minutosTranscurridos / 60);
            $monto  = $horas * $nocturnaPrecio;
            $monto  = $this->aplicarTopesDia($monto);
            return [
                'monto'   => round($monto, 2),
                'tipo'    => 'nocturna',
                'detalle' => "Tarifa nocturna ({$nocturnaInicio} - {$nocturnaFin})",
                'gratuito' => false,
            ];
        }

        // ── 3. Tarifa normal ──────────────────────────────────
        $normalPrecio = (float) $this->cfg('tarifa_normal_precio', '25.50');
        $horas        = ceil($minutosTranscurridos / 60);
        $monto        = $horas * $normalPrecio;

        // Aplicar fracción si aplica (cobro reducido primeros minutos)
        if ($fraccionActiva && $minutosTranscurridos <= 60) {
            $monto = $fraccionPrecio + (($horas - 1) * $normalPrecio);
            $monto = max($monto, $fraccionPrecio);
        }

        $monto = $this->aplicarTopesDia($monto);

        return [
            'monto'   => round($monto, 2),
            'tipo'    => 'normal',
            'detalle' => "Tarifa normal — {$horas}h × \${$normalPrecio}",
            'gratuito' => false,
        ];
    }

    // ── Aplicar tope de día completo ──────────────────────────
    private function aplicarTopesDia(float $monto): float {
        $diaActivo = $this->cfg('tarifa_dia_activa', '1') === '1';
        $diaMaximo = (float) $this->cfg('tarifa_dia_maximo', '120.00');

        if ($diaActivo && $monto > $diaMaximo) {
            return $diaMaximo;
        }
        return $monto;
    }

    // ── Verificar si es horario nocturno ──────────────────────
    private function esHoraNocturna(float $hora, string $inicio, string $fin): bool {
        $inicioH = (float) str_replace(':', '.', $inicio);
        $finH    = (float) str_replace(':', '.', $fin);

        // Nocturna cruza medianoche (ej. 21:00 - 07:00)
        if ($inicioH > $finH) {
            return $hora >= $inicioH || $hora < $finH;
        }
        return $hora >= $inicioH && $hora < $finH;
    }

    // ── Obtener resumen de tarifas para el frontend ───────────
    public function obtenerResumen(): array {
        return [
            'normal' => [
                'activa'  => $this->cfg('tarifa_normal_activa', '1') === '1',
                'precio'  => (float) $this->cfg('tarifa_normal_precio', '25.50'),
                'etiqueta'=> 'Tarifa normal',
            ],
            'fraccion' => [
                'activa'  => $this->cfg('tarifa_fraccion_activa', '1') === '1',
                'minutos' => (int) $this->cfg('tarifa_fraccion_minutos', '15'),
                'precio'  => (float) $this->cfg('tarifa_fraccion_precio', '10.00'),
                'etiqueta'=> 'Fracción / tolerancia',
            ],
            'nocturna' => [
                'activa'  => $this->cfg('tarifa_nocturna_activa', '1') === '1',
                'precio'  => (float) $this->cfg('tarifa_nocturna_precio', '15.00'),
                'inicio'  => $this->cfg('tarifa_nocturna_hora_inicio', '21:00'),
                'fin'     => $this->cfg('tarifa_nocturna_hora_fin', '07:00'),
                'etiqueta'=> 'Tarifa nocturna',
            ],
            'dia_completo' => [
                'activa'  => $this->cfg('tarifa_dia_activa', '1') === '1',
                'maximo'  => (float) $this->cfg('tarifa_dia_maximo', '120.00'),
                'etiqueta'=> 'Tope día completo',
            ],
        ];
    }
}