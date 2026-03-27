import { ParkingAPI } from '../api.js';

// ── Verificar que sea admin ───────────────────────────────────
const rol = sessionStorage.getItem('usuario_rol');
if (rol !== 'admin') window.location.href = 'index.html';

// ── Helpers ───────────────────────────────────────────────────
const fecha = s => s
    ? new Date(s.replace(' ', 'T')).toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      })
    : '—';

function mostrarMensaje(id, texto, tipo) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texto;
    el.className   = `usuario-msg ${tipo}`;
}

function ocultarMensaje(id) {
    const el = document.getElementById(id);
    if (el) el.className = 'usuario-msg oculto';
}

// ── Modal de edición ──────────────────────────────────────────
const modal        = document.getElementById('modal-editar');
const btnCerrar    = document.getElementById('btn-cerrar-modal');
const btnCancelar  = document.getElementById('btn-cancelar-edicion');

function abrirModal(usuario) {
    document.getElementById('edit-id').value       = usuario.id;
    document.getElementById('edit-nombre').value   = usuario.nombre;
    document.getElementById('edit-email').value    = usuario.email;
    document.getElementById('edit-rol').value      = usuario.rol;
    document.getElementById('edit-password').value = '';
    ocultarMensaje('edit-msg');
    modal.classList.remove('oculto');
    document.getElementById('edit-nombre').focus();
}

function cerrarModal() {
    modal.classList.add('oculto');
}

btnCerrar.addEventListener('click', cerrarModal);
btnCancelar.addEventListener('click', cerrarModal);
modal.addEventListener('click', e => { if (e.target === modal) cerrarModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });

// Guardar edición
document.getElementById('btn-guardar-edicion').addEventListener('click', async () => {
    const id       = parseInt(document.getElementById('edit-id').value);
    const nombre   = document.getElementById('edit-nombre').value.trim();
    const email    = document.getElementById('edit-email').value.trim();
    const rolNuevo = document.getElementById('edit-rol').value;
    const password = document.getElementById('edit-password').value;

    ocultarMensaje('edit-msg');

    if (!nombre || !email) {
        mostrarMensaje('edit-msg', '⚠️ Nombre y correo son obligatorios.', 'error');
        return;
    }

    if (password && password.length < 8) {
        mostrarMensaje('edit-msg', '⚠️ La contraseña debe tener al menos 8 caracteres.', 'error');
        return;
    }

    const btn = document.getElementById('btn-guardar-edicion');
    btn.disabled    = true;
    btn.textContent = 'Guardando...';

    try {
        await ParkingAPI.editarUsuario(id, nombre, email, rolNuevo, password || null);
        cerrarModal();
        mostrarMensaje('usuario-msg', '✅ Usuario actualizado correctamente.', 'exito');
        cargarUsuarios();
    } catch (e) {
        mostrarMensaje('edit-msg', '❌ ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Guardar cambios';
    }
});

// ── Cargar tabla de usuarios ──────────────────────────────────
async function cargarUsuarios() {
    const tbody = document.getElementById('tbody-usuarios');
    tbody.innerHTML = '<tr><td colspan="6" class="td-cargando">Cargando...</td></tr>';

    try {
        const usuarios = await ParkingAPI.listarUsuarios();

        if (!usuarios.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="td-cargando">No hay usuarios registrados</td></tr>';
            return;
        }

        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td style="font-weight:600;">${u.nombre}</td>
                <td style="color:#6b7280; font-size:0.82rem;">${u.email}</td>
                <td><span class="badge-rol badge-${u.rol}">${u.rol}</span></td>
                <td style="color:#9ca3af; font-size:0.82rem;">${fecha(u.created_at)}</td>
                <td>
                    <span class="${u.activo == 1 ? 'badge-activo' : 'badge-inactivo'}">
                        ${u.activo == 1 ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td style="text-align:center;">
                    <div style="display:flex; gap:0.4rem; justify-content:center;">
                        ${u.activo == 1 ? `
                            <button class="btn-editar" 
                                data-id="${u.id}"
                                data-nombre="${u.nombre}"
                                data-email="${u.email}"
                                data-rol="${u.rol}">
                                ✏️
                            </button>
                            <button class="btn-danger btn-desactivar" data-id="${u.id}">
                                Desactivar
                            </button>
                        ` : `<span style="color:#d1d5db; font-size:0.8rem;">—</span>`}
                    </div>
                </td>
            </tr>
        `).join('');

        // Evento editar
        tbody.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => {
                abrirModal({
                    id:     btn.dataset.id,
                    nombre: btn.dataset.nombre,
                    email:  btn.dataset.email,
                    rol:    btn.dataset.rol,
                });
            });
        });

        // Evento desactivar
        tbody.querySelectorAll('.btn-desactivar').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('¿Desactivar este usuario?')) return;
                try {
                    await ParkingAPI.desactivarUsuario(parseInt(btn.dataset.id));
                    mostrarMensaje('usuario-msg', '✅ Usuario desactivado.', 'exito');
                    cargarUsuarios();
                } catch (e) {
                    mostrarMensaje('usuario-msg', '❌ ' + e.message, 'error');
                }
            });
        });

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="td-cargando" style="color:#ef4444;">Error al cargar usuarios</td></tr>`;
    }
}

// ── Crear usuario ─────────────────────────────────────────────
document.getElementById('btn-crear-usuario').addEventListener('click', async () => {
    const nombre   = document.getElementById('u-nombre').value.trim();
    const email    = document.getElementById('u-email').value.trim();
    const password = document.getElementById('u-password').value;
    const rolNuevo = document.getElementById('u-rol').value;

    ocultarMensaje('usuario-msg');

    if (!nombre || !email || !password) {
        mostrarMensaje('usuario-msg', '⚠️ Completa todos los campos.', 'error');
        return;
    }

    if (password.length < 8) {
        mostrarMensaje('usuario-msg', '⚠️ La contraseña debe tener al menos 8 caracteres.', 'error');
        return;
    }

    const btn = document.getElementById('btn-crear-usuario');
    btn.disabled    = true;
    btn.textContent = 'Creando...';

    try {
        const res = await ParkingAPI.crearUsuario(nombre, email, password, rolNuevo);
        mostrarMensaje('usuario-msg', '✅ ' + res.message, 'exito');
        document.getElementById('u-nombre').value   = '';
        document.getElementById('u-email').value    = '';
        document.getElementById('u-password').value = '';
        document.getElementById('u-rol').value      = 'cajero';
        cargarUsuarios();
    } catch (e) {
        mostrarMensaje('usuario-msg', '❌ ' + e.message, 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'Crear Usuario';
    }
});

document.getElementById('btn-refrescar-usuarios').addEventListener('click', cargarUsuarios);

// ── Inicializar ───────────────────────────────────────────────
cargarUsuarios();
