// js/configuracion.js
import { ParkingAPI } from '../api.js';
import { verificarSesion } from './utils.js';
import { toastExito, toastError } from './toast.js';

if (!verificarSesion()) throw new Error('Sin sesión');

// ── Helpers ───────────────────────────────────────────────────
function hexARgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return {r, g, b};
}

function mostrarMsg(texto, tipo) {
    const el = document.getElementById('config-msg');
    el.textContent = texto;
    el.className   = `usuario-msg ${tipo}`;
}

// ── Toggle helper ─────────────────────────────────────────────
function configurarToggle(trackId, inputId) {
    const track = document.getElementById(trackId);
    const input = document.getElementById(inputId);

    const actualizar = (val) => {
        track.classList.toggle('activo', val === '1');
        input.value = val;
    };

    track.addEventListener('click', () => {
        const nuevo = input.value === '1' ? '0' : '1';
        actualizar(nuevo);
        actualizarPreview();
    });

    return actualizar;
}

const setQR        = configurarToggle('track-qr',        'ticket_mostrar_qr');
const setFrecuente = configurarToggle('track-frecuente', 'ticket_mostrar_frecuente');

// Función genérica para toggles de tarifas
function setToggle(trackId, inputId, valor) {
    const track = document.getElementById(trackId);
    const input = document.getElementById(inputId);
    if (!track || !input) return;
    track.classList.toggle('activo', valor === '1');
    input.value = valor;
    track.addEventListener('click', () => {
        const nuevo = input.value === '1' ? '0' : '1';
        track.classList.toggle('activo', nuevo === '1');
        input.value = nuevo;
    });
}

// ── Sincronizar color picker ──────────────────────────────────
const colorPicker = document.getElementById('ticket_color');
const colorHex    = document.getElementById('ticket_color_hex');

colorPicker.addEventListener('input', () => {
    colorHex.value = colorPicker.value.toUpperCase();
    actualizarPreview();
});

colorHex.addEventListener('input', () => {
    const val = colorHex.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        colorPicker.value = val;
        actualizarPreview();
    }
});

// Actualizar preview al cambiar cualquier campo de texto
document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"]')
    .forEach(el => el.addEventListener('input', () => {
        if (document.getElementById('preview-ticket-entrada')) actualizarPreview();
    }));

// ── Cargar configuración ──────────────────────────────────────
async function cargarConfig() {
    try {
        const config = await ParkingAPI.obtenerConfig();

        const campos = [
            'negocio_nombre', 'negocio_rfc', 'negocio_direccion',
            'negocio_ciudad', 'negocio_telefono', 'negocio_email',
            'tarifa_por_hora', 'ticket_titulo_entrada', 'ticket_titulo_salida',
            'ticket_pie_entrada', 'ticket_pie_salida', 'ticket_color'
        ];

        campos.forEach(clave => {
            const el = document.getElementById(clave);
            if (el && config[clave] !== undefined) el.value = config[clave];
        });

        // Color picker
        if (config.ticket_color) {
            colorPicker.value = config.ticket_color;
            colorHex.value    = config.ticket_color.toUpperCase();
        }

        // Toggles ticket
        setQR(config.ticket_mostrar_qr || '1');
        setFrecuente(config.ticket_mostrar_frecuente || '1');

        // Tarifas — toggles
        setToggle('track-normal-activa',   'tarifa_normal_activa',   config.tarifa_normal_activa   || '1');
        setToggle('track-fraccion-activa', 'tarifa_fraccion_activa', config.tarifa_fraccion_activa || '0');
        setToggle('track-nocturna-activa', 'tarifa_nocturna_activa', config.tarifa_nocturna_activa || '0');
        setToggle('track-dia-activa',      'tarifa_dia_activa',      config.tarifa_dia_activa      || '0');

        // Tarifas — campos numéricos y horarios
        const camposTarifas = [
            'tarifa_normal_precio', 'tarifa_fraccion_minutos', 'tarifa_fraccion_precio',
            'tarifa_nocturna_precio', 'tarifa_nocturna_hora_inicio', 'tarifa_nocturna_hora_fin',
            'tarifa_dia_maximo'
        ];
        camposTarifas.forEach(clave => {
            const el = document.getElementById(clave);
            if (el && config[clave] !== undefined) el.value = config[clave];
        });

        actualizarPreview();
    } catch (e) {
        toastError('Error', 'No se pudo cargar la configuración');
    }
}

// ── Preview ───────────────────────────────────────────────────
function actualizarPreview() {
    const color        = colorPicker.value || '#2D3748';
    const nombre       = document.getElementById('negocio_nombre').value   || 'Estacionamiento';
    const rfc          = document.getElementById('negocio_rfc').value       || 'RFC';
    const telefono     = document.getElementById('negocio_telefono').value  || 'Tel';
    const tituloEnt    = document.getElementById('ticket_titulo_entrada').value || 'TICKET DE ENTRADA';
    const tituloSal    = document.getElementById('ticket_titulo_salida').value  || 'COMPROBANTE DE SALIDA';
    const pieEnt       = document.getElementById('ticket_pie_entrada').value    || 'Conserve este ticket';
    const pieSal       = document.getElementById('ticket_pie_salida').value     || 'Gracias por su visita';
    const mostrarQR    = document.getElementById('ticket_mostrar_qr').value === '1';
    const mostrarFrec  = document.getElementById('ticket_mostrar_frecuente').value === '1';
    const tarifa       = document.getElementById('tarifa_por_hora').value || '25.50';

    const {r, g, b}    = hexARgb(color);
    const colorLight   = `rgba(${r},${g},${b},0.08)`;

    // ── Preview entrada ───────────────────────────────────────
    document.getElementById('preview-ticket-entrada').innerHTML = `
        <div class="preview-header" style="background:${color};">
            <div class="preview-header-title">${nombre.toUpperCase()}</div>
            <div class="preview-header-sub">${tituloEnt}</div>
        </div>
        <div class="preview-body">
            <div class="preview-matricula"
                 style="background:${colorLight}; border-color:${color}; color:${color};">
                ABC1234
            </div>
            ${mostrarFrec ? `
            <div style="background:#fef3c7; border:1px solid #fde68a; border-radius:3px;
                        padding:2px 4px; text-align:center; font-size:0.58rem;
                        color:#92400e; margin-bottom:5px;">
                ⭐ CLIENTE FRECUENTE
            </div>` : ''}
            <div class="preview-row">
                <span class="preview-label">CONDUCTOR</span>
                <span class="preview-value">Juan Pérez</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">ENTRADA</span>
                <span class="preview-value">10:30 a.m.</span>
            </div>
            ${mostrarQR ? `
            <div style="text-align:center; margin:5px 0 2px;">
                <div style="font-size:0.55rem; color:#9ca3af; margin-bottom:3px;">ESCANEAR AL SALIR</div>
                <div class="preview-qr"></div>
            </div>` : ''}
            <div class="preview-footer">${pieEnt}<br>Tarifa: $${tarifa} MXN / hora</div>
        </div>
        <div class="preview-negocio">
            <div class="preview-negocio-nombre">${nombre}</div>
            <div class="preview-negocio-dato">${rfc}</div>
            <div class="preview-negocio-dato">${telefono}</div>
        </div>
        <div class="preview-franja" style="background:${color};"></div>
    `;

    // ── Preview salida ────────────────────────────────────────
    document.getElementById('preview-ticket-salida').innerHTML = `
        <div class="preview-header" style="background:#059669;">
            <div class="preview-header-title">${nombre.toUpperCase()}</div>
            <div class="preview-header-sub">${tituloSal}</div>
        </div>
        <div class="preview-body">
            <div class="preview-matricula"
                 style="background:#f0fdf4; border-color:#059669; color:#059669;">
                ABC1234
            </div>
            <div class="preview-row">
                <span class="preview-label">ENTRADA</span>
                <span class="preview-value">10:30 a.m.</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">SALIDA</span>
                <span class="preview-value" style="color:#059669;">11:45 a.m.</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">TIEMPO</span>
                <span class="preview-value">1h 15min</span>
            </div>
            <div class="preview-total" style="background:#059669;">
                <div class="preview-total-label">TOTAL PAGADO</div>
                $${(parseFloat(tarifa) * 2).toFixed(2)} MXN
            </div>
            <div class="preview-footer">${pieSal}<br>Tarifa: $${tarifa} MXN / hora</div>
        </div>
        <div class="preview-negocio">
            <div class="preview-negocio-nombre">${nombre}</div>
            <div class="preview-negocio-dato">${rfc}</div>
            <div class="preview-negocio-dato">${telefono}</div>
        </div>
        <div class="preview-franja" style="background:#059669;"></div>
    `;
}

// ── Guardar ───────────────────────────────────────────────────
document.getElementById('btn-guardar-todo').addEventListener('click', async () => {
    const btn = document.getElementById('btn-guardar-todo');
    btn.disabled    = true;
    btn.textContent = '⏳ Guardando...';

    const datos = {
        negocio_nombre:           document.getElementById('negocio_nombre').value.trim(),
        negocio_rfc:              document.getElementById('negocio_rfc').value.trim(),
        negocio_direccion:        document.getElementById('negocio_direccion').value.trim(),
        negocio_ciudad:           document.getElementById('negocio_ciudad').value.trim(),
        negocio_telefono:         document.getElementById('negocio_telefono').value.trim(),
        negocio_email:            document.getElementById('negocio_email').value.trim(),
        tarifa_por_hora:          document.getElementById('tarifa_por_hora').value,
        ticket_titulo_entrada:    document.getElementById('ticket_titulo_entrada').value.trim(),
        ticket_titulo_salida:     document.getElementById('ticket_titulo_salida').value.trim(),
        ticket_pie_entrada:       document.getElementById('ticket_pie_entrada').value.trim(),
        ticket_pie_salida:        document.getElementById('ticket_pie_salida').value.trim(),
        ticket_color:             colorPicker.value,
        ticket_mostrar_qr:        document.getElementById('ticket_mostrar_qr').value,
        ticket_mostrar_frecuente: document.getElementById('ticket_mostrar_frecuente').value,
        // Tarifas
        tarifa_normal_precio:          document.getElementById('tarifa_normal_precio')?.value          || '',
        tarifa_normal_activa:          document.getElementById('tarifa_normal_activa')?.value          || '1',
        tarifa_fraccion_minutos:       document.getElementById('tarifa_fraccion_minutos')?.value       || '',
        tarifa_fraccion_precio:        document.getElementById('tarifa_fraccion_precio')?.value        || '',
        tarifa_fraccion_activa:        document.getElementById('tarifa_fraccion_activa')?.value        || '0',
        tarifa_nocturna_precio:        document.getElementById('tarifa_nocturna_precio')?.value        || '',
        tarifa_nocturna_hora_inicio:   document.getElementById('tarifa_nocturna_hora_inicio')?.value   || '',
        tarifa_nocturna_hora_fin:      document.getElementById('tarifa_nocturna_hora_fin')?.value      || '',
        tarifa_nocturna_activa:        document.getElementById('tarifa_nocturna_activa')?.value        || '0',
        tarifa_dia_maximo:             document.getElementById('tarifa_dia_maximo')?.value             || '',
        tarifa_dia_activa:             document.getElementById('tarifa_dia_activa')?.value             || '0',
    };

    try {
        await ParkingAPI.guardarConfig(datos);
        toastExito('Configuración guardada', 'Los cambios se aplicarán en los próximos tickets');
    } catch (e) {
        toastError('Error', e.message);
    } finally {
        btn.disabled    = false;
        btn.textContent = '💾 Guardar cambios';
    }
});

document.getElementById('btn-preview')?.addEventListener('click', actualizarPreview);

// ── Inicializar ───────────────────────────────────────────
cargarConfig();
