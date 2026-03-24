// js/utils.js — Utilidades compartidas entre todas las páginas

// ── Formateo de moneda ────────────────────────────────────────
export const moneda = (n) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);

// ── Formateo de fecha y hora ──────────────────────────────────
export function formatearFechaHora(fechaRaw) {
    if (!fechaRaw) return { fechaParte: '---', horaParte: '---', esAntiguo: false };
    const d       = new Date(fechaRaw.replace(' ', 'T'));
    const ahora   = new Date();
    const esAntiguo = ((ahora - d) / (1000 * 60 * 60)) >= 24;

    return {
        fechaParte: d.toLocaleDateString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }),
        horaParte: d.toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', hour12: true
        }),
        esAntiguo
    };
}

export function formatearSoloFecha(fechaRaw) {
    if (!fechaRaw) return '---';
    const d = new Date(fechaRaw.replace(' ', 'T'));
    return d.toLocaleDateString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
}

export function formatearSoloHora(fechaRaw) {
    if (!fechaRaw) return '---';
    const d = new Date(fechaRaw.replace(' ', 'T'));
    return d.toLocaleTimeString('es-MX', {
        hour: '2-digit', minute: '2-digit', hour12: true
    });
}

export function formatearFechaLarga(fechaRaw) {
    if (!fechaRaw) return '---';
    const d = new Date(fechaRaw.replace(' ', 'T'));
    return d.toLocaleDateString('es-MX', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
}

// ── Calcular tiempo transcurrido ──────────────────────────────
export function calcularEstancia(fechaEntrada) {
    const inicio        = new Date(fechaEntrada.replace(' ', 'T'));
    const ahora         = new Date();
    const minutosTotales = Math.floor((ahora - inicio) / 60000);

    if (minutosTotales < 1) return 'Menos de un minuto';
    const horas   = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;
}

export function minutosATexto(minutos) {
    if (!minutos) return '—';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Exportar a CSV ────────────────────────────────────────────
export function exportarCSV(datos, nombreArchivo, columnas) {
    if (!datos || !datos.length) return;

    const encabezado = columnas.map(c => `"${c.label}"`).join(',');
    const filas = datos.map(row =>
        columnas.map(c => {
            const val = row[c.key] ?? '';
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',')
    );

    const csvContent = [encabezado, ...filas].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${nombreArchivo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Verificar sesión ──────────────────────────────────────────
export function verificarSesion(redirigir = 'index.html') {
    if (!sessionStorage.getItem('usuario_nombre')) {
        window.location.href = redirigir;
        return false;
    }
    return true;
}

export function obtenerSesion() {
    return {
        nombre: sessionStorage.getItem('usuario_nombre') || '',
        rol:    sessionStorage.getItem('usuario_rol')    || '',
    };
}