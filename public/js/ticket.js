// js/ticket.js

// ── Cargar configuración del servidor ─────────────────────────
let _config = null;

async function obtenerConfig() {
    if (_config) return _config;
    try {
        const url = new URL('/estacionamiento/api.php', window.location.origin);
        url.searchParams.append('action', 'config.obtener');
        const res  = await fetch(url);
        const data = await res.json();
        _config    = data.data || {};
    } catch (e) {
        _config = {};
    }
    return _config;
}

function cfg(clave, defecto = '') {
    return _config?.[clave] ?? defecto;
}

// ══════════════════════════════════════════════════════════════
//  TICKET DE ENTRADA
// ══════════════════════════════════════════════════════════════
export async function generarTicketPDF(datos) {
    await obtenerConfig();
    const { matricula, hora_entrada, nombre_conductor, es_frecuente } = datos;

    const color         = cfg('ticket_color', '#2D3748');
    const mostrarQR     = cfg('ticket_mostrar_qr', '1') === '1';
    const mostrarFrec   = cfg('ticket_mostrar_frecuente', '1') === '1';
    const titulo        = cfg('ticket_titulo_entrada', 'TICKET DE ENTRADA');
    const pieMsg        = cfg('ticket_pie_entrada', 'Conserve este ticket hasta la salida');
    const tarifa        = cfg('tarifa_por_hora', '25.50');
    const negNombre     = cfg('negocio_nombre', 'Estacionamiento');
    const negRfc        = cfg('negocio_rfc', '');
    const negDir        = cfg('negocio_direccion', '');
    const negCiudad     = cfg('negocio_ciudad', '');
    const negTel        = cfg('negocio_telefono', '');
    const negEmail      = cfg('negocio_email', '');

    let qrDataURL = null;
    if (mostrarQR) {
        const qrData = [matricula, hora_entrada, nombre_conductor || 'N/A', es_frecuente ? '1' : '0'].join('|');
        qrDataURL = await generarQRDataURL(qrData);
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 215] });

    const ancho  = 80;
    const margen = 8;
    let y = 0;

    const rr = parseInt(color.slice(1,3),16);
    const gg = parseInt(color.slice(3,5),16);
    const bb = parseInt(color.slice(5,7),16);

    // ── Header ───────────────────────────────────────────────
    doc.setFillColor(rr, gg, bb);
    doc.rect(0, 0, ancho, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(negNombre.toUpperCase(), ancho / 2, 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 200, 220);
    doc.text(titulo, ancho / 2, 19, { align: 'center' });
    y = 34;

    // ── Matrícula ─────────────────────────────────────────────
    doc.setFillColor(247, 248, 250);
    doc.setDrawColor(rr, gg, bb);
    doc.setLineWidth(0.5);
    doc.roundedRect(margen, y - 6, ancho - margen * 2, 16, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(rr, gg, bb);
    doc.text(matricula, ancho / 2, y + 5, { align: 'center' });
    y += 18;

    // ── Separador ─────────────────────────────────────────────
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margen, y, ancho - margen, y);
    y += 7;

    // ── Conductor ─────────────────────────────────────────────
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('CONDUCTOR', margen, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(nombre_conductor || 'No registrado', margen, y);

    if (es_frecuente && mostrarFrec) {
        doc.setFillColor(254, 243, 199);
        doc.setDrawColor(251, 191, 36);
        doc.setLineWidth(0.3);
        doc.roundedRect(ancho - margen - 24, y - 5, 24, 7, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(146, 64, 14);
        doc.text('FRECUENTE', ancho - margen - 12, y - 0.5, { align: 'center' });
    }
    y += 10;

    // ── Hora de entrada ───────────────────────────────────────
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('HORA DE ENTRADA', margen, y);
    y += 5;
    const fe = formatearFecha(hora_entrada);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    doc.text(fe.fecha, margen, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(rr, gg, bb);
    doc.text(fe.hora, margen, y);
    y += 10;

    // ── Separador punteado ────────────────────────────────────
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.setLineDash([1.5, 1.5]);
    doc.line(margen, y, ancho - margen, y);
    doc.setLineDash([]);
    y += 8;

    // ── QR Code ───────────────────────────────────────────────
    if (mostrarQR && qrDataURL) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(150, 150, 150);
        doc.text('ESCANEAR AL SALIR', ancho / 2, y, { align: 'center' });
        y += 4;
        const qrSize = 40;
        doc.addImage(qrDataURL, 'PNG', (ancho - qrSize) / 2, y, qrSize, qrSize);
        y += qrSize + 6;
    }

    // ── Nota ──────────────────────────────────────────────────
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margen, y, ancho - margen, y);
    y += 5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text(pieMsg, ancho / 2, y, { align: 'center' });
    y += 4;
    doc.text(`Tarifa: $${tarifa} MXN / hora`, ancho / 2, y, { align: 'center' });
    y += 8;

    // ── Datos del negocio ─────────────────────────────────────
    agregarDatosNegocio(doc, ancho, margen, y, negNombre, negRfc, negDir, negCiudad, negTel, negEmail, rr, gg, bb);

    doc.save(`ticket-entrada-${matricula}-${Date.now()}.pdf`);
}

// ══════════════════════════════════════════════════════════════
//  COMPROBANTE DE SALIDA
// ══════════════════════════════════════════════════════════════
export async function generarComprobanteSalidaPDF(datos) {
    await obtenerConfig();
    const {
        matricula,
        hora_entrada,
        hora_salida,
        tiempo_minutos,
        total_pagar,
        nombre_conductor,
    } = datos;

    const titulo    = cfg('ticket_titulo_salida', 'COMPROBANTE DE SALIDA');
    const pieMsg    = cfg('ticket_pie_salida', 'Gracias por su visita');
    const tarifa    = cfg('tarifa_por_hora', '25.50');
    const negNombre = cfg('negocio_nombre', 'Estacionamiento');
    const negRfc    = cfg('negocio_rfc', '');
    const negDir    = cfg('negocio_direccion', '');
    const negCiudad = cfg('negocio_ciudad', '');
    const negTel    = cfg('negocio_telefono', '');
    const negEmail  = cfg('negocio_email', '');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 240]
    });

    const ancho  = 80;
    const margen = 8;
    let y = 0;

    // ── Header verde ─────────────────────────────────────────
    doc.setFillColor(5, 150, 105); // verde esmeralda
    doc.rect(0, 0, ancho, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(negNombre.toUpperCase(), ancho / 2, 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(167, 243, 208);
    doc.text(titulo, ancho / 2, 19, { align: 'center' });
    y = 34;

    // ── Matrícula ─────────────────────────────────────────────
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.5);
    doc.roundedRect(margen, y - 6, ancho - margen * 2, 16, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105);
    doc.text(matricula, ancho / 2, y + 5, { align: 'center' });
    y += 18;

    // ── Separador ─────────────────────────────────────────────
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margen, y, ancho - margen, y);
    y += 7;

    // ── Conductor ─────────────────────────────────────────────
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('CONDUCTOR', margen, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text(nombre_conductor || 'No registrado', margen, y);
    y += 10;

    // ── Hora entrada y salida ─────────────────────────────────
    const fe = formatearFecha(hora_entrada);
    const fs = formatearFecha(hora_salida);

    // Entrada
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('HORA DE ENTRADA', margen, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(fe.fecha, margen, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(45, 55, 72);
    doc.text(fe.hora, margen, y);
    y += 9;

    // Salida
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('HORA DE SALIDA', margen, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(fs.fecha, margen, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text(fs.hora, margen, y);
    y += 10;

    // ── Tiempo total ──────────────────────────────────────────
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margen, y, ancho - margen, y);
    y += 6;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('TIEMPO EN ESTACIONAMIENTO', margen, y);
    y += 5;

    const horas   = Math.floor(tiempo_minutos / 60);
    const minutos = tiempo_minutos % 60;
    const tiempoTexto = horas > 0
        ? `${horas} hora${horas > 1 ? 's' : ''} ${minutos} min`
        : `${minutos} minutos`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(45, 55, 72);
    doc.text(tiempoTexto, margen, y);
    y += 10;

    // ── Total a pagar ─────────────────────────────────────────
    doc.setFillColor(5, 150, 105);
    doc.roundedRect(margen, y - 4, ancho - margen * 2, 18, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('TOTAL PAGADO', ancho / 2, y + 2, { align: 'center' });

    const monedaFormato = new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: 'MXN'
    }).format(total_pagar || 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(monedaFormato, ancho / 2, y + 11, { align: 'center' });
    y += 22;

    // ── Nota ──────────────────────────────────────────────────
    doc.setDrawColor(210, 210, 210);
    doc.setLineDash([1, 1]);
    doc.line(margen, y, ancho - margen, y);
    doc.setLineDash([]);
    y += 6;

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text(pieMsg, ancho / 2, y, { align: 'center' });
    y += 4;
    doc.text(`Tarifa: $${tarifa} MXN / hora`, ancho / 2, y, { align: 'center' });
    y += 8;

    // ── Datos del negocio ─────────────────────────────────────
    agregarDatosNegocio(doc, ancho, margen, y, negNombre, negRfc, negDir, negCiudad, negTel, negEmail, 5, 150, 105);

    doc.save(`comprobante-salida-${matricula}-${Date.now()}.pdf`);
}

// ══════════════════════════════════════════════════════════════
//  HELPERS COMPARTIDOS
// ══════════════════════════════════════════════════════════════
function agregarDatosNegocio(doc, ancho, margen, y, nombre, rfc, dir, ciudad, tel, email, r, g, b) {
    doc.setDrawColor(210, 210, 210);
    doc.setLineDash([1, 1]);
    doc.line(margen, y, ancho - margen, y);
    doc.setLineDash([]);
    y += 6;

    doc.setFillColor(248, 250, 252);
    doc.rect(0, y - 3, ancho, 55, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(nombre || 'Estacionamiento', ancho / 2, y + 2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    if (rfc)    doc.text(`RFC: ${rfc}`, ancho / 2, y + 8, { align: 'center' });
    y += 13;

    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    if (dir)    doc.text(dir,    ancho / 2, y,     { align: 'center' }), y += 4;
    if (ciudad) doc.text(ciudad, ancho / 2, y,     { align: 'center' }), y += 4;
    if (tel)    doc.text(tel,    ancho / 2, y,     { align: 'center' }), y += 4;
    if (email)  doc.text(email,  ancho / 2, y,     { align: 'center' }), y += 4;
    y += 4;

    const altoPDF = doc.internal.pageSize.getHeight();
    doc.setFillColor(r ?? 45, g ?? 55, b ?? 72);
    doc.rect(0, altoPDF - 3, ancho, 3, 'F');
}

function generarQRDataURL(texto) {
    return new Promise((resolve) => {
        const div = document.createElement('div');
        div.style.cssText = 'position:absolute; left:-9999px; top:-9999px;';
        document.body.appendChild(div);

        new QRCode(div, {
            text: texto,
            width: 256,
            height: 256,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.L
        });

        setTimeout(() => {
            const canvas  = div.querySelector('canvas');
            const img     = div.querySelector('img');
            const dataURL = canvas
                ? canvas.toDataURL('image/png')
                : (img ? img.src : '');
            document.body.removeChild(div);
            resolve(dataURL);
        }, 150);
    });
}

function formatearFecha(fechaRaw) {
    if (!fechaRaw) return { fecha: '---', hora: '---' };
    const d = new Date(fechaRaw.replace(' ', 'T'));
    return {
        fecha: d.toLocaleDateString('es-MX', {
            day: '2-digit', month: 'long', year: 'numeric'
        }),
        hora: d.toLocaleTimeString('es-MX', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        })
    };
}