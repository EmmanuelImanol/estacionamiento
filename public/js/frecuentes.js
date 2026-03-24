import { ParkingAPI } from '../api.js';
import { moneda, formatearSoloFecha, formatearSoloHora, minutosATexto, exportarCSV, verificarSesion } from './utils.js';

if (!verificarSesion()) throw new Error('Sin sesión');

// ── Estado ────────────────────────────────────────────────────
let clientesTodos = [];

// ── Cargar clientes ───────────────────────────────────────────
async function cargarClientes() {
    const tbody = document.getElementById('tbody-clientes');
    tbody.innerHTML = `<tr><td colspan="7" class="td-cargando">Cargando...</td></tr>`;

    try {
        clientesTodos = await ParkingAPI.obtenerClientesFrecuentes();
        renderizarTabla(clientesTodos);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" class="td-cargando" style="color:#ef4444;">Error al cargar</td></tr>`;
    }
}

function renderizarTabla(clientes) {
    const tbody = document.getElementById('tbody-clientes');

    if (!clientes.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="td-cargando">No hay clientes registrados</td></tr>`;
        return;
    }

    tbody.innerHTML = clientes.map(c => `
        <tr>
            <td>
                <span class="badge-matricula">${c.matricula}</span>
            </td>
            <td style="font-weight:600;">
                ${c.nombre !== 'Sin nombre'
                    ? c.nombre
                    : `<span style="color:#9ca3af; font-style:italic;">Sin nombre</span>`
                }
            </td>
            <td>
                <span style="background:#eff6ff; color:#1d4ed8; padding:0.15rem 0.5rem;
                             border-radius:999px; font-size:0.78rem; font-weight:700;">
                    ${c.visitas} visitas
                </span>
            </td>
            <td style="color:#6b7280;">${c.sesiones_totales}</td>
            <td style="font-weight:600; color:#059669;">${moneda(c.total_gastado)}</td>
            <td style="color:#9ca3af; font-size:0.82rem;">
                ${formatearSoloFecha(c.ultima_visita || c.ultima_entrada)}
            </td>
            <td style="text-align:center;">
                <button class="btn-editar btn-ver-historial"
                        data-matricula="${c.matricula}"
                        data-nombre="${c.nombre}">
                    Ver
                </button>
            </td>
        </tr>
    `).join('');

    // Eventos
    tbody.querySelectorAll('.btn-ver-historial').forEach(btn => {
        btn.addEventListener('click', () => {
            abrirHistorial(btn.dataset.matricula, btn.dataset.nombre);
        });
    });
}

// ── Buscador ──────────────────────────────────────────────────
document.getElementById('input-busqueda').addEventListener('input', (e) => {
    const termino = e.target.value.toUpperCase();
    const filtrados = clientesTodos.filter(c =>
        c.matricula.toUpperCase().includes(termino) ||
        (c.nombre || '').toUpperCase().includes(termino)
    );
    renderizarTabla(filtrados);
});

// ── Modal historial ───────────────────────────────────────────
const modal = document.getElementById('modal-historial');

async function abrirHistorial(matricula, nombre) {
    document.getElementById('modal-historial-matricula').textContent = matricula;
    document.getElementById('historial-conductor').innerHTML = `
        👤 <strong>${nombre !== 'Sin nombre' ? nombre : 'Sin nombre registrado'}</strong>
    `;

    const tbody = document.getElementById('tbody-historial');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#9ca3af;">Cargando...</td></tr>';
    modal.classList.remove('oculto');

    try {
        const historial = await ParkingAPI.obtenerHistorialCliente(matricula);

        if (!historial.length) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#9ca3af;">Sin sesiones registradas</td></tr>';
            return;
        }

        tbody.innerHTML = historial.map(h => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:0.65rem 1rem; color:#64748b; font-size:0.82rem;">
                    ${formatearSoloFecha(h.hora_entrada)}
                </td>
                <td style="padding:0.65rem 1rem; font-weight:500;">
                    ${formatearSoloHora(h.hora_entrada)}
                </td>
                <td style="padding:0.65rem 1rem; color:#64748b;">
                    ${formatearSoloHora(h.hora_salida)}
                </td>
                <td style="padding:0.65rem 1rem; color:#64748b;">
                    ${minutosATexto(h.minutos)}
                </td>
                <td style="padding:0.65rem 1rem; font-weight:700;
                           color:${h.total_pagado ? '#059669' : '#9ca3af'};">
                    ${h.total_pagado ? moneda(h.total_pagado) : '—'}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#ef4444;">Error al cargar historial</td></tr>';
    }
}

function cerrarHistorial() { modal.classList.add('oculto'); }

document.getElementById('btn-cerrar-historial').addEventListener('click', cerrarHistorial);
document.getElementById('btn-cerrar-historial-footer').addEventListener('click', cerrarHistorial);
modal.addEventListener('click', (e) => { if (e.target === modal) cerrarHistorial(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarHistorial(); });

// ── Exportar CSV ──────────────────────────────────────────────
document.getElementById('btn-exportar').addEventListener('click', () => {
    exportarCSV(clientesTodos, 'clientes-frecuentes', [
        { key: 'matricula',      label: 'Matrícula' },
        { key: 'nombre',         label: 'Nombre' },
        { key: 'visitas',        label: 'Visitas' },
        { key: 'sesiones_totales', label: 'Sesiones' },
        { key: 'total_gastado',  label: 'Total gastado' },
        { key: 'ultima_visita',  label: 'Última visita' },
    ]);
});

document.getElementById('btn-refrescar').addEventListener('click', cargarClientes);

// ── Inicializar ───────────────────────────────────────────────
cargarClientes();