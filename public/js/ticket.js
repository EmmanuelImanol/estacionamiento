// js/ticket.js

// ══════════════════════════════════════════════════════════════
//  TICKET DE ENTRADA
// ══════════════════════════════════════════════════════════════
export async function generarTicketPDF(datos) {
    const { matricula, hora_entrada, nombre_conductor, es_frecuente } = datos;

    const qrData = [
        matricula,
        hora_entrada,
        nombre_conductor || 'N/A',
        es_frecuente ? '1' : '0'
    ].join('|');

    const qrDataURL = await generarQRDataURL(qrData);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 215]
    });

    const ancho  = 80;
    const margen = 8;
    let y = 0;

    // ── Header ───────────────────────────────────────────────
    doc.setFillColor(45, 55, 72);
    doc.rect(0, 0, ancho, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('ESTACIONAMIENTO', ancho / 2, 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 174, 192);
    doc.text('TICKET DE ENTRADA', ancho / 2, 19, { align: 'center' });
    y = 34;

    // ── Matrícula ─────────────────────────────────────────────
    doc.setFillColor(247, 248, 250);
    doc.setDrawColor(45, 55, 72);
    doc.setLineWidth(0.5);
    doc.roundedRect(margen, y - 6, ancho - margen * 2, 16, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(45, 55, 72);
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

    if (es_frecuente) {
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
    doc.setTextColor(45, 55, 72);
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
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text('ESCANEAR AL SALIR', ancho / 2, y, { align: 'center' });
    y += 4;
    const qrSize = 40;
    doc.addImage(qrDataURL, 'PNG', (ancho - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 6;

    // ── Nota ──────────────────────────────────────────────────
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margen, y, ancho - margen, y);
    y += 5;
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(170, 170, 170);
    doc.text('Conserve este ticket hasta la salida', ancho / 2, y, { align: 'center' });
    y += 4;
    doc.text('Tarifa: $25.50 MXN / hora', ancho / 2, y, { align: 'center' });
    y += 8;

    // ── Datos del negocio ─────────────────────────────────────
    agregarDatosNegocio(doc, ancho, margen, y);

    doc.save(`ticket-entrada-${matricula}-${Date.now()}.pdf`);
}

// ══════════════════════════════════════════════════════════════
//  COMPROBANTE DE SALIDA
// ══════════════════════════════════════════════════════════════
export function generarComprobanteSalidaPDF(datos) {
    const {
        matricula,
        hora_entrada,
        hora_salida,
        tiempo_minutos,
        total_pagar,
        nombre_conductor,
    } = datos;

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
    doc.text('ESTACIONAMIENTO', ancho / 2, 11, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(167, 243, 208);
    doc.text('COMPROBANTE DE SALIDA', ancho / 2, 19, { align: 'center' });
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
    doc.text('Gracias por su visita', ancho / 2, y, { align: 'center' });
    y += 4;
    doc.text('Tarifa: $25.50 MXN / hora', ancho / 2, y, { align: 'center' });
    y += 8;

    // ── Datos del negocio ─────────────────────────────────────
    agregarDatosNegocio(doc, ancho, margen, y);

    doc.save(`comprobante-salida-${matricula}-${Date.now()}.pdf`);
}

// ══════════════════════════════════════════════════════════════
//  HELPERS COMPARTIDOS
// ══════════════════════════════════════════════════════════════
function agregarDatosNegocio(doc, ancho, margen, y) {
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
    doc.text('Estacionamiento El Centro', ancho / 2, y + 2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text('RFC: ECE-850312-AB3', ancho / 2, y + 8, { align: 'center' });
    y += 13;

    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('Av. Reforma No. 123, Col. Centro', ancho / 2, y, { align: 'center' });
    y += 4;
    doc.text('Ciudad de Mexico, CDMX, C.P. 06000', ancho / 2, y, { align: 'center' });
    y += 4;
    doc.text('Tel: (55) 1234-5678', ancho / 2, y, { align: 'center' });
    y += 4;
    doc.text('contacto@elcentro.com.mx', ancho / 2, y, { align: 'center' });
    y += 8;

    const altoPDF = doc.internal.pageSize.getHeight();
    doc.setFillColor(45, 55, 72);
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