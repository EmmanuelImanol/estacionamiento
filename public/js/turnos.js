// js/turnos.js
import { ParkingAPI } from '../api.js';
import { verificarSesion, moneda, formatearFechaHora, minutosATexto } from './utils.js';
import { toastExito, toastError } from './toast.js';

if (!verificarSesion()) throw new Error('Sin sesión');

const rol = sessionStorage.getItem('usuario_rol');

// ── Modal crear/editar turno ──────────────────────────────────
const modal      = document.getElementById('modal-turno');
const btnCerrar  = document.getElementById('btn-cerrar-modal-turno');
const btnCancel  = document.getElementById('btn-cancelar-turno');
const btnGuardar = document.getElementById('btn-guardar-turno');
const msgEl      = document.getElementById('modal-turno-msg');

function abrirModal(turno = null) {
    document.getElementById('turno-id').value            = turno?.id || '';
    document.getElementById('turno-nombre').value        = turno?.nombre || '';
    document.getElementById('turno-inicio').value        = turno?.hora_inicio?.slice(0,5) || '';
    document.getElementById('turno-fin').value           = turno?.hora_fin?.slice(0,5)   || '';
    document.getElementById('turno-precio').value        = turno?.precio_fijo   || '';
    document.getElementById('turno-minutos-extra').value = turno?.minutos_extra || 15;
    document.getElementById('turno-precio-extra').value  = turno?.precio_extra  || 4.00;
    document.getElementById('modal-turno-titulo').textContent = turno ? '✏️ Editar Turno' : '➕ Nuevo Turno';
    msgEl.className = 'usuario-msg oculto';
    modal.classList.remove('oculto');
}

const cerrar = () => modal.classList.add('oculto');
btnCerrar.onclick = cerrar;
btnCancel.onclick = cerrar;
modal.addEventListener('click', e => { if (e.target === modal) cerrar(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });

btnGuardar.onclick = async () => {
    const id    = document.getElementById('turno-id').value;
    const datos = {
        id:            id ? parseInt(id) : undefined,
        nombre:        document.getElementById('turno-nombre').value.trim(),
        hora_inicio:   document.getElementById('turno-inicio').value,
        hora_fin:      document.getElementById('turno-fin').value,
        precio_fijo:   parseFloat(document.getElementById('turno-precio').value),
        minutos_extra: parseInt(document.getElementById('turno-minutos-extra').value),
        precio_extra:  parseFloat(document.getElementById('turno-precio-extra').value),
    };

    if (!datos.nombre || !datos.hora_inicio || !datos.hora_fin || !datos.precio_fijo) {
        msgEl.textContent = '⚠️ Completa todos los campos obligatorios.';
        msgEl.className   = 'usuario-msg error';
        return;
    }

    btnGuardar.disabled    = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        if (id) { await ParkingAPI.editarTurno(datos); toastExito('Turno actualizado'); }
        else    { await ParkingAPI.crearTurno(datos);  toastExito('Turno creado correctamente'); }
        cerrar();
        cargarTurnos();
        cargarSelectTurnos();
    } catch (e) {
        msgEl.textContent = '❌ ' + e.message;
        msgEl.className   = 'usuario-msg error';
    } finally {
        btnGuardar.disabled    = false;
        btnGuardar.textContent = 'Guardar';
    }
};

// ── Tabla de turnos ───────────────────────────────────────────
async function cargarTurnos() {
    const tbody = document.getElementById('tbody-turnos');
    tbody.innerHTML = '<tr><td colspan="7" class="td-cargando">Cargando...</td></tr>';
    try {
        const turnos = await ParkingAPI.listarTurnos();
        if (!turnos.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="td-cargando">No hay turnos registrados</td></tr>';
            return;
        }
        tbody.innerHTML = turnos.map(t => `
            <tr>
                <td style="font-weight:600;">${t.nombre}</td>
                <td style="color:#6b7280; font-size:0.85rem;">${t.hora_inicio.slice(0,5)} — ${t.hora_fin.slice(0,5)}</td>
                <td style="font-weight:600; color:#059669;">$${parseFloat(t.precio_fijo).toFixed(2)}</td>
                <td style="color:#6b7280; font-size:0.85rem;">${t.minutos_extra} min</td>
                <td style="color:#6b7280; font-size:0.85rem;">$${parseFloat(t.precio_extra).toFixed(2)}</td>
                <td><span class="${t.activo == 1 ? 'badge-activo' : 'badge-inactivo'}">${t.activo == 1 ? 'Activo' : 'Inactivo'}</span></td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:0.4rem; justify-content:center;">
                        ${rol === 'admin' ? `
                        <button class="btn-editar btn-edit-turno" data-turno='${JSON.stringify(t)}'>✏️</button>
                        <button class="btn-danger btn-toggle-turno" data-id="${t.id}">${t.activo == 1 ? 'Desactivar' : 'Activar'}</button>
                        ` : '—'}
                    </div>
                </td>
            </tr>`).join('');

        tbody.querySelectorAll('.btn-edit-turno').forEach(btn =>
            btn.onclick = () => abrirModal(JSON.parse(btn.dataset.turno))
        );
        tbody.querySelectorAll('.btn-toggle-turno').forEach(btn =>
            btn.onclick = async () => {
                try { await ParkingAPI.toggleTurno(parseInt(btn.dataset.id)); cargarTurnos(); }
                catch (e) { toastError('Error', e.message); }
            }
        );
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="td-cargando" style="color:#ef4444;">Error al cargar</td></tr>';
    }
}

// ── Select de turnos activos para el registro ─────────────────
async function cargarSelectTurnos() {
    try {
        const turnos = await ParkingAPI.listarTurnosActivos();
        const sel    = document.getElementById('reg-turno-select');
        const fil    = document.getElementById('filtro-turno-id');
        sel.innerHTML = '<option value="">Selecciona un turno...</option>';
        fil.innerHTML = '<option value="">Todos los turnos</option>';
        turnos.forEach(t => {
            const opt1 = new Option(`${t.nombre} (${t.hora_inicio.slice(0,5)}-${t.hora_fin.slice(0,5)}) $${t.precio_fijo}`, t.id);
            const opt2 = new Option(t.nombre, t.id);
            sel.appendChild(opt1);
            fil.appendChild(opt2);
        });
    } catch (e) { console.error(e); }
}

// ── Registro entrada / salida ─────────────────────────────────
function mostrarMsg(texto, tipo) {
    const el = document.getElementById('reg-turno-msg');
    el.textContent = texto;
    el.className   = `usuario-msg ${tipo}`;
}

document.getElementById('btn-entrada-turno').onclick = async () => {
    const turnoId   = parseInt(document.getElementById('reg-turno-select').value);
    const matricula = document.getElementById('reg-turno-matricula').value.trim().toUpperCase();
    const obs       = document.getElementById('reg-turno-obs').value.trim();

    if (!turnoId) { mostrarMsg('⚠️ Selecciona un turno.', 'error'); return; }
    if (!matricula || !/^[A-Z0-9]{3,10}$/.test(matricula)) { mostrarMsg('⚠️ Matrícula inválida.', 'error'); return; }

    try {
        await ParkingAPI.entradaTurno(turnoId, matricula, obs);
        mostrarMsg(`✅ Entrada registrada — ${matricula}`, 'exito');
        document.getElementById('reg-turno-matricula').value = '';
        document.getElementById('reg-turno-obs').value       = '';
        cargarRegistros();
    } catch (e) { mostrarMsg('❌ ' + e.message, 'error'); }
};

document.getElementById('btn-salida-turno').onclick = async () => {
    const matricula = document.getElementById('reg-turno-matricula').value.trim().toUpperCase();
    if (!matricula) { mostrarMsg('⚠️ Ingresa la matrícula.', 'error'); return; }

    try {
        const res = await ParkingAPI.salidaTurno(matricula);
        const d   = res.data;
        const fmt = new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(d.total_pagar);
        mostrarMsg(`✅ Salida — ${matricula} | ${d.tiempo_minutos} min | ${fmt}`, 'exito');
        document.getElementById('reg-turno-matricula').value = '';
        cargarRegistros();
    } catch (e) { mostrarMsg('❌ ' + e.message, 'error'); }
};

// ── Tabla de registros ────────────────────────────────────────
async function cargarRegistros(turnoId = null) {
    const tbody = document.getElementById('tbody-registros-turnos');
    tbody.innerHTML = '<tr><td colspan="7" class="td-cargando">Cargando...</td></tr>';
    try {
        const registros = await ParkingAPI.registrosTurnos(turnoId);
        if (!registros.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="td-cargando">Sin sesiones registradas</td></tr>';
            return;
        }
        const hora  = s => s ? new Date(s.replace(' ','T')).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—';
        const fecha = s => s ? new Date(s.replace(' ','T')).toLocaleDateString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';

        tbody.innerHTML = registros.map(r => `
            <tr>
                <td><span class="badge-matricula">${r.matricula}</span></td>
                <td style="font-size:0.85rem; font-weight:600;">${r.turno_nombre}</td>
                <td>
                    <div style="font-size:0.75rem; color:#9ca3af;">${fecha(r.hora_entrada)}</div>
                    <div style="font-weight:600;">${hora(r.hora_entrada)}</div>
                </td>
                <td style="color:#6b7280;">${hora(r.hora_salida)}</td>
                <td style="color:#6b7280;">${r.minutos_total ? r.minutos_total + ' min' : '—'}</td>
                <td style="font-weight:600; color:${r.total_pagado > 0 ? '#059669' : '#6b7280'};">
                    ${r.total_pagado > 0 ? '$'+parseFloat(r.total_pagado).toFixed(2) : '—'}
                </td>
                <td><span class="${r.estado === 'ACTIVA' ? 'badge-activo' : 'badge-inactivo'}">${r.estado}</span></td>
            </tr>`).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="td-cargando" style="color:#ef4444;">Error al cargar</td></tr>';
    }
}

document.getElementById('filtro-turno-id').onchange = e => cargarRegistros(e.target.value || null);
document.getElementById('btn-refrescar-registros').onclick = () => {
    const id = document.getElementById('filtro-turno-id').value;
    cargarRegistros(id || null);
};

// ── Inicializar ───────────────────────────────────────────────
if (rol === 'admin') {
    document.getElementById('btn-nuevo-turno').onclick = () => abrirModal();
} else {
    document.getElementById('btn-nuevo-turno').style.display = 'none';
}

document.getElementById('btn-refrescar').onclick = cargarTurnos;

cargarTurnos();
cargarSelectTurnos();
cargarRegistros();