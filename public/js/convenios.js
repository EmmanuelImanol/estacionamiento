// js/convenios.js
import { ParkingAPI } from '../api.js';
import { verificarSesion } from './utils.js';
import { toastExito, toastError } from './toast.js';

if (!verificarSesion()) throw new Error('Sin sesión');

const rol = sessionStorage.getItem('usuario_rol');

// ── Modal CRUD ────────────────────────────────────────────────
const modal      = document.getElementById('modal-convenio');
const btnCerrar  = document.getElementById('btn-cerrar-modal-convenio');
const btnCancel  = document.getElementById('btn-cancelar-convenio');
const btnGuardar = document.getElementById('btn-guardar-convenio');
const msgEl      = document.getElementById('modal-convenio-msg');

function abrirModal(convenio = null) {
    document.getElementById('convenio-id').value       = convenio?.id || '';
    document.getElementById('convenio-empresa').value  = convenio?.nombre_empresa || '';
    document.getElementById('convenio-horas').value    = convenio?.horas_gratuitas || '';
    document.getElementById('convenio-contacto').value = convenio?.contacto || '';
    document.getElementById('convenio-notas').value    = convenio?.notas || '';
    document.getElementById('modal-convenio-titulo').textContent = convenio
        ? '✏️ Editar Convenio' : '➕ Nuevo Convenio';
    msgEl.className = 'usuario-msg oculto';
    modal.classList.remove('oculto');
    document.getElementById('convenio-empresa').focus();
}

const cerrarModal = () => modal.classList.add('oculto');
btnCerrar.onclick = cerrarModal;
btnCancel.onclick = cerrarModal;
modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });

btnGuardar.onclick = async () => {
    const id    = document.getElementById('convenio-id').value;
    const datos = {
        id:               id ? parseInt(id) : undefined,
        nombre_empresa:   document.getElementById('convenio-empresa').value.trim(),
        horas_gratuitas:  parseFloat(document.getElementById('convenio-horas').value),
        contacto:         document.getElementById('convenio-contacto').value.trim(),
        notas:            document.getElementById('convenio-notas').value.trim(),
    };

    if (!datos.nombre_empresa || isNaN(datos.horas_gratuitas)) {
        msgEl.textContent = '⚠️ Nombre y horas gratuitas son obligatorios.';
        msgEl.className   = 'usuario-msg error';
        return;
    }

    btnGuardar.disabled    = true;
    btnGuardar.textContent = 'Guardando...';

    try {
        if (id) {
            await ParkingAPI.editarConvenio(datos);
            toastExito('Convenio actualizado');
        } else {
            await ParkingAPI.crearConvenio(datos);
            toastExito('Convenio creado correctamente');
        }
        cerrarModal();
        await cargarConvenios();
        await cargarSelectConvenios();
    } catch (e) {
        msgEl.textContent = '❌ ' + e.message;
        msgEl.className   = 'usuario-msg error';
    } finally {
        btnGuardar.disabled    = false;
        btnGuardar.textContent = 'Guardar';
    }
};

// ── Tabla de convenios ────────────────────────────────────────
async function cargarConvenios() {
    const tbody = document.getElementById('tbody-convenios');
    tbody.innerHTML = '<tr><td colspan="6" class="td-cargando">Cargando...</td></tr>';

    try {
        const convenios = await ParkingAPI.listarConvenios();

        if (!convenios.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="td-cargando">No hay convenios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = convenios.map(c => `
            <tr>
                <td style="font-weight:600;">${c.nombre_empresa}</td>
                <td>
                    <span class="badge-visitas">${c.horas_gratuitas}h gratis</span>
                </td>
                <td style="color:var(--text-muted); font-size:0.82rem;">${c.contacto || '—'}</td>
                <td style="color:var(--text-faint); font-size:0.8rem;">${c.notas || '—'}</td>
                <td>
                    <span class="${c.activo == 1 ? 'badge-activo' : 'badge-inactivo'}">
                        ${c.activo == 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:0.4rem; justify-content:center;">
                        ${rol === 'admin' ? `
                        <button class="btn-editar btn-edit-convenio" data-id="${c.id}"
                                data-convenio='${JSON.stringify(c)}'>
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-danger btn-toggle-convenio" data-id="${c.id}">
                            ${c.activo == 1 ? 'Desactivar' : 'Activar'}
                        </button>` : '—'}
                    </div>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-edit-convenio').forEach(btn => {
            btn.onclick = () => abrirModal(JSON.parse(btn.dataset.convenio));
        });

        tbody.querySelectorAll('.btn-toggle-convenio').forEach(btn => {
            btn.onclick = async () => {
                try {
                    await ParkingAPI.toggleConvenio(parseInt(btn.dataset.id));
                    cargarConvenios();
                } catch (e) { toastError('Error', e.message); }
            };
        });

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" class="td-cargando" style="color:#ef4444;">Error al cargar</td></tr>';
    }
}

// ── Select de convenios (registro + filtro) ───────────────────
async function cargarSelectConvenios() {
    try {
        const convenios = await ParkingAPI.listarConveniosActivos();

        // Select del formulario de registro
        const selectReg = document.getElementById('reg-convenio-select');
        if (selectReg) {
            selectReg.innerHTML = '<option value="">Selecciona un convenio...</option>';
            convenios.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.nombre_empresa} (${c.horas_gratuitas}h gratis)`;
                selectReg.appendChild(opt);
            });
        }

        // Select del filtro de registros
        const selectFiltro = document.getElementById('filtro-convenio-id');
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="">Todos los convenios</option>';
            convenios.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.nombre_empresa;
                selectFiltro.appendChild(opt);
            });
        }
    } catch (e) { console.error(e); }
}

// ── Registro entrada / salida ─────────────────────────────────
const msgReg = document.getElementById('reg-convenio-msg');

function mostrarMsgReg(texto, tipo = 'error') {
    if (!msgReg) return;
    msgReg.textContent = texto;
    msgReg.className   = `usuario-msg ${tipo}`;
}
function ocultarMsgReg() {
    if (!msgReg) return;
    msgReg.className = 'usuario-msg oculto';
}

document.getElementById('btn-entrada-convenio')?.addEventListener('click', async () => {
    const convenioId = document.getElementById('reg-convenio-select')?.value;
    const matricula  = document.getElementById('reg-convenio-matricula')?.value.trim().toUpperCase();
    const obs        = document.getElementById('reg-convenio-obs')?.value.trim();

    if (!convenioId) { mostrarMsgReg('⚠️ Selecciona un convenio.'); return; }
    if (!matricula)  { mostrarMsgReg('⚠️ Ingresa una matrícula.'); return; }

    ocultarMsgReg();
    try {
        const res = await ParkingAPI.entradaConvenio(convenioId, matricula, obs);
        toastExito('Entrada registrada', `${matricula} ingresó con convenio`);
        mostrarMsgReg(`✅ Entrada registrada: ${matricula}`, 'exito');
        document.getElementById('reg-convenio-matricula').value = '';
        document.getElementById('reg-convenio-obs').value       = '';
        cargarRegistros();
    } catch (e) {
        mostrarMsgReg('❌ ' + e.message);
        toastError('Error', e.message);
    }
});

document.getElementById('btn-salida-convenio')?.addEventListener('click', async () => {
    const convenioId = document.getElementById('reg-convenio-select')?.value;
    const matricula  = document.getElementById('reg-convenio-matricula')?.value.trim().toUpperCase();

    if (!convenioId) { mostrarMsgReg('⚠️ Selecciona un convenio.'); return; }
    if (!matricula)  { mostrarMsgReg('⚠️ Ingresa una matrícula.'); return; }

    ocultarMsgReg();
    try {
        const res = await ParkingAPI.salidaConvenio(matricula);
        const total = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
            .format(res.data?.total_pagar || 0);
        toastExito('Salida registrada', `${matricula} — Total: ${total}`);
        mostrarMsgReg(`✅ Salida registrada: ${matricula} — ${total}`, 'exito');
        document.getElementById('reg-convenio-matricula').value = '';
        document.getElementById('reg-convenio-obs').value       = '';
        cargarRegistros();
    } catch (e) {
        mostrarMsgReg('❌ ' + e.message);
        toastError('Error', e.message);
    }
});

// ── Registros de sesiones ─────────────────────────────────────
async function cargarRegistros(convenioId = null) {
    const tbody = document.getElementById('tbody-registros-convenios');
    tbody.innerHTML = '<tr><td colspan="7" class="td-cargando">Cargando...</td></tr>';

    try {
        const registros = await ParkingAPI.registrosConvenios(convenioId);

        if (!registros.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="td-cargando">Sin registros</td></tr>';
            return;
        }

        const moneda = n => new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n || 0);
        const hora   = s => s ? new Date(s.replace(' ','T')).toLocaleTimeString('es-MX',
            { hour:'2-digit', minute:'2-digit', hour12:true }) : '—';
        const fecha  = s => s ? new Date(s.replace(' ','T')).toLocaleDateString('es-MX',
            { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';

        tbody.innerHTML = registros.map(r => `
            <tr>
                <td><span class="badge-matricula">${r.matricula}</span></td>
                <td style="font-weight:600; font-size:0.85rem;">${r.nombre_empresa}</td>
                <td>
                    <div style="font-size:0.75rem; color:#94a3b8;">${fecha(r.hora_entrada)}</div>
                    <div style="font-weight:600;">${hora(r.hora_entrada)}</div>
                </td>
                <td style="color:#64748b;">${hora(r.hora_salida)}</td>
                <td><span class="badge-visitas">${r.horas_gratuitas}h gratis</span></td>
                <td style="font-weight:600; color:${r.total_pagado > 0 ? '#059669' : '#64748b'};">
                    ${r.total_pagado > 0 ? moneda(r.total_pagado) : 'Sin cobro'}
                </td>
                <td>
                    <span class="${r.estado === 'ACTIVA' ? 'badge-activo' : 'badge-inactivo'}">
                        ${r.estado}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" class="td-cargando" style="color:#ef4444;">Error al cargar</td></tr>';
    }
}

// ── Eventos ───────────────────────────────────────────────────
if (rol === 'admin') {
    document.getElementById('btn-nuevo-convenio').onclick = () => abrirModal();
} else {
    document.getElementById('btn-nuevo-convenio').style.display = 'none';
}

document.getElementById('btn-refrescar').onclick = cargarConvenios;
document.getElementById('btn-refrescar-registros').onclick = () => {
    const id = document.getElementById('filtro-convenio-id').value;
    cargarRegistros(id || null);
};
document.getElementById('filtro-convenio-id').onchange = e => {
    cargarRegistros(e.target.value || null);
};

// ── Inicializar ───────────────────────────────────────────────
cargarConvenios();
cargarSelectConvenios();
cargarRegistros();