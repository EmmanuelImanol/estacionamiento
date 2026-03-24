<?php
namespace App\Models;

use DateTime;

class ParkingSession {
    private string $matricula;
    private DateTime $horaEntrada;
    private ?DateTime $horaSalida = null;

    // Ahora horaEntrada es opcional. Si no se envía, asume que es un nuevo registro (ahora).
    public function __construct(string $matricula, ?string $horaEntrada = null) {
        $this->matricula = $matricula;
        $this->horaEntrada = $horaEntrada ? new DateTime($horaEntrada) : new DateTime();
    }

    public function registrarSalida(): void {
        $this->horaSalida = new DateTime();
    }

    public function getMinutosTranscurridos(): int {
        if (!$this->horaSalida) {
            return 0; // Aún no ha salido
        }
        $intervalo = $this->horaEntrada->diff($this->horaSalida);
        // Convertimos todo el tiempo a minutos
        return ($intervalo->days * 24 * 60) + ($intervalo->h * 60) + $intervalo->i;
    }

    public function getMatricula(): string { return $this->matricula; }
    public function getHoraEntrada(): string { return $this->horaEntrada->format('Y-m-d H:i:s'); }
    public function getHoraSalida(): ?string { return $this->horaSalida ? $this->horaSalida->format('Y-m-d H:i:s') : null; }
}