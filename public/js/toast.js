// js/toast.js — Sistema de notificaciones toast

let contenedor = null;

function obtenerContenedor() {
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.className = 'toast-container';
        document.body.appendChild(contenedor);
    }
    return contenedor;
}

function iconoPor(tipo) {
    const iconos = { exito: '✓', error: '✕', aviso: '!', info: 'i' };
    return iconos[tipo] || 'i';
}

export function toast(titulo, mensaje = '', tipo = 'info', duracion = 4000) {
    const ct      = obtenerContenedor();
    const el      = document.createElement('div');
    el.className  = `toast toast-${tipo}`;
    el.style.position = 'relative';
    el.innerHTML  = `
        <div class="toast-icono">${iconoPor(tipo)}</div>
        <div class="toast-contenido">
            <div class="toast-titulo">${titulo}</div>
            ${mensaje ? `<div class="toast-mensaje">${mensaje}</div>` : ''}
        </div>
        <button class="toast-cerrar">✕</button>
        <div class="toast-progress" style="--duracion:${duracion}ms"></div>
    `;

    ct.appendChild(el);

    const cerrar = () => {
        el.classList.add('saliendo');
        el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    el.querySelector('.toast-cerrar').onclick = cerrar;
    el.onclick = (e) => { if (!e.target.closest('.toast-cerrar')) cerrar(); };

    if (duracion > 0) setTimeout(cerrar, duracion);

    return { cerrar };
}

// Atajos
export const toastExito  = (titulo, msg, dur) => toast(titulo, msg, 'exito', dur);
export const toastError  = (titulo, msg, dur) => toast(titulo, msg, 'error', dur);
export const toastAviso  = (titulo, msg, dur) => toast(titulo, msg, 'aviso', dur);
export const toastInfo   = (titulo, msg, dur) => toast(titulo, msg, 'info',  dur);