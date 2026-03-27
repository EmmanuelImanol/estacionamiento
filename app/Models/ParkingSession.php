<?php
namespace App\Models;

use DateTime;

class ParkingSession {
    private string    $matricula;
    private DateTime  $horaEntrada;
    private ?DateTime $horaSalida = null;
    private ?int      $turnoId    = null;
    private ?int      $convenioId = null;

    public function __construct(string $matricula, ?string $horaEntrada = null, ?int $turnoId = null, ?int $convenioId = null) {
        $this->matricula   = $matricula;
        $this->horaEntrada = $horaEntrada ? new DateTime($horaEntrada) : new DateTime();
        $this->turnoId     = $turnoId;
        $this->convenioId  = $convenioId;
    }

    public function registrarSalida(): void {
        $this->horaSalida = new DateTime();
    }

    public function getMinutosTranscurridos(): int {
        if (!$this->horaSalida) return 0;
        $intervalo = $this->horaEntrada->diff($this->horaSalida);
        return ($intervalo->days * 24 * 60) + ($intervalo->h * 60) + $intervalo->i;
    }

    public function getMatricula(): string   { return $this->matricula; }
    public function getHoraEntrada(): string { return $this->horaEntrada->format('Y-m-d H:i:s'); }
    public function getHoraSalida(): ?string { return $this->horaSalida?->format('Y-m-d H:i:s'); }
    public function getTurnoId(): ?int       { return $this->turnoId; }
    public function getConvenioId(): ?int    { return $this->convenioId; }
}