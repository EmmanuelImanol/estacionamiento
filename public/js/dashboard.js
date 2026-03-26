import { ParkingAPI } from '../api.js';
import { moneda, formatearFechaHora, formatearSoloFecha, formatearSoloHora, minutosATexto, exportarCSV, verificarSesion, obtenerSesion } from './utils.js';

// ── Verificar sesión ──────────────────────────────────────────
if (!verificarSesion()) throw new Error('Sin sesión');
const { nombre, rol } = obtenerSesion();

document.getElementById('nombre-usuario').textContent = nombre;
const badgeEl = document.getElementById('badge-rol');
badgeEl.textContent = rol;
badgeEl.className   = `badge-rol badge-${rol}`;

if (rol === 'admin') {
    document.querySelectorAll('.solo-admin').forEach(el => el.style.display = 'block');
}

// ── Logout ────────────────────────────────────────────────────
document.getElementById('btn-logout')?.addEventListener('click', () => ParkingAPI.logout());

// ── Auto-refresco ─────────────────────────────────────────────
let intervaloRefresco = null;

function iniciarAutoRefresco() {
    detenerAutoRefresco();
    intervaloRefresco = setInterval(() => {
        cargarResumen();
        // Solo recargar sesiones si no hay filtro activo
        if (!filtroActivo()) cargarSesiones();
    }, 30000);
}

function detenerAutoRefresco() {
    if (intervaloRefresco) {
        clearInterval(intervaloRefresco);
        intervaloRefresco = null;
    }
}

function filtroActivo() {
    const desde = document.getElementById('filtro-desde')?.value;
    const hasta = document.getElementById('filtro-hasta')?.value;
    const hoy   = new Date().toISOString().slice(0, 10);
    return desde !== hoy || hasta !== hoy;
}

// ── Resumen del día ───────────────────────────────────────────
async function cargarResumen() {
    try {
        const d = await ParkingAPI.obtenerResumenDia();
        document.getElementById('stats-grid').innerHTML = `
            <div class="stat-card"><div class="stat-icon">🚗</div><div class="stat-valor">${d.total_autos_hoy}</div><div class="stat-label">Autos hoy</div></div>
            <div class="stat-card"><div class="stat-icon">🟢</div><div class="stat-valor">${d.autos_adentro}</div><div class="stat-label">Adentro ahora</div></div>
            <div class="stat-card"><div class="stat-icon">🏁</div><div class="stat-valor">${d.autos_salidos}</div><div class="stat-label">Salidas hoy</div></div>
            <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-valor">${moneda(d.ingresos_hoy)}</div><div class="stat-label">Ingresos hoy</div></div>
            <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-valor">${moneda(d.ticket_promedio)}</div><div class="stat-label">Ticket promedio</div></div>
        `;
    } catch (e) { console.error('Error resumen:', e); }
}

// ── Gráfica (solo admin) ──────────────────────────────────────
let graficaInstance = null;
let datosPorHora    = [];
let datosPorDia     = [];

async function cargarGrafica() {
    if (rol !== 'admin') return;
    try {
        const d  = await ParkingAPI.obtenerDatosGrafica();
        datosPorHora = d.por_hora;
        datosPorDia  = d.por_dia;
        renderGrafica('horas');
    } catch (e) { console.error('Error gráfica:', e); }
}

function renderGrafica(tipo) {
    const ctx = document.getElementById('grafica-ingresos')?.getContext('2d');
    if (!ctx) return;
    if (graficaInstance) graficaInstance.destroy();

    let labels, valores, label;

    if (tipo === 'horas') {
        const mapa = Object.fromEntries(datosPorHora.map(r => [r.hora, r.ingresos]));
        labels  = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        valores = labels.map((_, i) => parseFloat(mapa[i] || 0));
        label   = 'Ingresos por hora (hoy)';
    } else {
        labels  = datosPorDia.map(r => formatearSoloFecha(r.fecha + ' 00:00:00'));
        valores = datosPorDia.map(r => parseFloat(r.ingresos));
        label   = 'Ingresos últimos 7 días';
    }

    graficaInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label,
                data: valores,
                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                borderColor: 'rgba(37, 99, 235, 0.8)',
                borderWidth: 2,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => '$' + v.toLocaleString('es-MX') }
                }
            }
        }
    });
}

document.getElementById('tab-horas')?.addEventListener('click', () => {
    document.getElementById('tab-horas').classList.add('activo');
    document.getElementById('tab-dias').classList.remove('activo');
    renderGrafica('horas');
});

document.getElementById('tab-dias')?.addEventListener('click', () => {
    document.getElementById('tab-dias').classList.add('activo');
    document.getElementById('tab-horas').classList.remove('activo');
    renderGrafica('dias');
});

// ── Sesiones con filtro ───────────────────────────────────────
let sesionesActuales = [];

async function cargarSesiones(desde = null, hasta = null, estado = '') {
    const tbody = document.getElementById('tbody-sesiones');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9ca3af;">Cargando...</td></tr>';

    try {
        let sesiones, totalIngresos = 0, totalSesiones = 0;

        if (desde && hasta) {
            const res = await ParkingAPI.obtenerSesionesFiltradas(desde, hasta, estado);
            sesiones      = res.sesiones;
            totalIngresos = res.total_ingresos;
            totalSesiones = res.total_sesiones;
        } else {
            sesiones      = await ParkingAPI.obtenerSesionesRecientes();
            totalSesiones = sesiones.length;
            totalIngresos = sesiones
                .filter(s => s.estado === 'FINALIZADA')
                .reduce((sum, s) => sum + parseFloat(s.total_pagado || 0), 0);
        }

        sesionesActuales = sesiones;

        // Actualizar totales del filtro
        const resumenFiltro = document.getElementById('resumen-filtro');
        if (resumenFiltro) {
            resumenFiltro.innerHTML = `
                <span>${totalSesiones} sesiones</span>
                <span style="font-weight:700; color:#2563eb;">${moneda(totalIngresos)}</span>
            `;
        }

        if (!sesiones.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#9ca3af;">Sin resultados</td></tr>';
            return;
        }

        tbody.innerHTML = sesiones.map(s => {
            const entrada = formatearFechaHora(s.hora_entrada);
            const estadoClass = s.estado === 'ACTIVA' ? 'estado-ACTIVA' : 'estado-FINALIZADA';
            return `
                <tr>
                    <td><span class="badge-matricula">${s.matricula}</span></td>
                    <td style="color:#6b7280;">
                        ${s.conductor}
                        ${s.observaciones ? `<div style="font-size:0.72rem;color:#9ca3af;margin-top:2px;">${s.observaciones}</div>` : ''}
                    </td>
                    <td>
                        <div style="font-size:0.75rem; color:#9ca3af;">${entrada.fechaParte}</div>
                        <div style="font-weight:600;">${entrada.horaParte}</div>
                    </td>
                    <td>${formatearSoloHora(s.hora_salida)}</td>
                    <td style="color:#6b7280;">${minutosATexto(s.minutos)}</td>
                    <td style="font-weight:600;">${s.total_pagado ? moneda(s.total_pagado) : '—'}</td>
                    <td><span class="estado-badge ${estadoClass}">${s.estado}</span></td>
                </tr>`;
        }).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Error al cargar</td></tr>';
    }
}

// ── Inicializar filtros ───────────────────────────────────────
function inicializarFiltros() {
    const hoy      = new Date().toISOString().slice(0, 10);
    const inputDesde  = document.getElementById('filtro-desde');
    const inputHasta  = document.getElementById('filtro-hasta');
    const selectEstado = document.getElementById('filtro-estado');
    const btnFiltrar  = document.getElementById('btn-filtrar');
    const btnLimpiar  = document.getElementById('btn-limpiar-filtro');
    const btnExportar = document.getElementById('btn-exportar-csv');

    if (!inputDesde || !inputHasta) return;

    inputDesde.value = hoy;
    inputHasta.value = hoy;

    btnFiltrar?.addEventListener('click', () => {
        const desde  = inputDesde.value;
        const hasta  = inputHasta.value;
        const estado = selectEstado?.value || '';

        if (!desde || !hasta) return;
        detenerAutoRefresco(); // Pausar auto-refresco al filtrar
        cargarSesiones(desde, hasta, estado);
    });

    btnLimpiar?.addEventListener('click', () => {
        inputDesde.value = hoy;
        inputHasta.value = hoy;
        if (selectEstado) selectEstado.value = '';
        cargarSesiones();
        iniciarAutoRefresco();
    });

    btnExportar?.addEventListener('click', () => {
        const desde  = inputDesde.value || hoy;
        const hasta  = inputHasta.value || hoy;
        ParkingAPI.exportarCSV(desde, hasta);
    });
}

// ── Refrescar manual ──────────────────────────────────────────
document.getElementById('btn-refrescar')?.addEventListener('click', () => {
    cargarResumen();
    cargarSesiones();
});

// ── Inicializar ───────────────────────────────────────────────
cargarResumen();
cargarGrafica();
cargarSesiones();
inicializarFiltros();
iniciarAutoRefresco();