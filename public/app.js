import { ParkingAPI } from './api.js';
import { generarTicketPDF, generarComprobanteSalidaPDF } from './js/ticket.js';
import { toastExito, toastError, toastAviso } from './js/toast.js';

class ParkingApp {
  #form;
  #inputMatricula;
  #divResultado;
  #accionActual = 'entrada';
  #tbodyVehiculos;
  #modal;
  #btnConfirmarModal;
  #btnCancelarModal;
  #matriculaSeleccionada = '';
  #inputBusqueda;
  #vehiculosTodos = [];
  #buscadorConfigurado = false;

  constructor() {
    if (!sessionStorage.getItem('usuario_nombre')) {
      window.location.href = 'index.html';
      return;
    }
    this.#init();
  }

  #init() {
    // Referencias al DOM
    this.#form              = document.getElementById('parking-form');
    this.#inputMatricula    = document.getElementById('matricula');
    this.#divResultado      = document.getElementById('resultado');
    this.#tbodyVehiculos    = document.getElementById('tbody-vehiculos');
    this.#modal             = document.getElementById('modal-salida');
    this.#btnConfirmarModal = document.getElementById('btn-modal-confirmar');
    this.#btnCancelarModal  = document.getElementById('btn-modal-cancelar');
    this.#inputBusqueda     = document.getElementById('input-busqueda');

    if (!this.#form || !this.#divResultado || !this.#modal) {
      console.error('Error: No se encontraron elementos críticos del DOM.');
      return;
    }

    // Eventos del modal
    if (this.#btnCancelarModal) {
      this.#btnCancelarModal.onclick = () => this.#modal.classList.add('oculto');
    }

    this.#modal.addEventListener('click', (e) => {
      if (e.target === this.#modal) this.#modal.classList.add('oculto');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.#modal.classList.contains('oculto')) {
        this.#modal.classList.add('oculto');
      }
    });

    this.#btnConfirmarModal.onclick = async () => {
      if (this.#matriculaSeleccionada) {
        this.#modal.classList.add('oculto');
        await this.#ejecutarSalidaDirecta(this.#matriculaSeleccionada);
        this.#matriculaSeleccionada = '';
      }
    };

    // Buscador sticky
    const buscadorEl = document.getElementById('buscador-sticky');
    window.addEventListener('scroll', () => {
      buscadorEl?.classList.toggle('scrolled', window.scrollY > 10);
    });

    this.#inicializarModalCliente();
    this.#inicializarEventos();
    this.#cargarLista();
  }

  // ── Lógica ────────────────────────────────────────────────────

  async #ejecutarSalidaDirecta(matricula) {
    const accionAnterior = this.#accionActual;
    this.#accionActual   = 'salida';
    try {
      const respuesta = await ParkingAPI.procesarAccion('salida', matricula);
      this.#mostrarExito(respuesta);
      await this.#cargarLista();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      this.#mostrarError(error.message);
    } finally {
      this.#accionActual = accionAnterior;
    }
  }

  #configurarBuscador() {
    if (!this.#inputBusqueda) return;
    this.#inputBusqueda.addEventListener('input', (e) => {
      const termino  = e.target.value.toUpperCase();
      const filtrados = this.#vehiculosTodos.filter(v =>
        v.matricula.toUpperCase().includes(termino)
      );
      this.#renderizarTabla(filtrados);
    });
  }

  // ── Formateo ──────────────────────────────────────────────────

  #calcularEstancia(fechaEntrada) {
    const inicio        = new Date(fechaEntrada.replace(' ', 'T'));
    const ahora         = new Date();
    const difMs         = ahora - inicio;
    const minutosTotales = Math.floor(difMs / 60000);

    if (minutosTotales < 1) return 'Menos de un minuto';
    const horas   = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;
  }

  #formatearFechaHora(fechaRaw) {
    if (!fechaRaw) return { fechaParte: '---', horaParte: '---', esAntiguo: false };
    const fechaEntrada = new Date(fechaRaw.replace(' ', 'T'));
    const ahora        = new Date();
    const esAntiguo    = ((ahora - fechaEntrada) / (1000 * 60 * 60)) >= 24;

    const fechaParte = fechaEntrada.toLocaleDateString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const horaParte = fechaEntrada.toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    return { fechaParte, horaParte, esAntiguo };
  }

  // ── Eventos ───────────────────────────────────────────────────

  #inicializarEventos() {
    this.#form.onsubmit = async (e) => {
      e.preventDefault();

      const accion    = e.submitter?.dataset.action || this.#accionActual;
      const matricula = this.#inputMatricula.value.trim().toUpperCase();

      // Botón buscar — no hace submit normal
      if (accion === 'buscar') {
        if (!matricula) {
          this.#mostrarError('Ingresa una matrícula para buscar.');
          return;
        }
        await this.#buscarMatricula(matricula);
        return;
      }

      this.#accionActual = accion;

      if (!matricula || !/^[A-Z0-9]{3,10}$/.test(matricula)) {
        this.#mostrarError('Ingresa una matrícula válida (3 a 10 caracteres alfanuméricos).');
        return;
      }

      this.#mostrarCargando();
      try {
        const respuesta = await ParkingAPI.procesarAccion(this.#accionActual, matricula);
        this.#mostrarExito(respuesta);
        this.#inputMatricula.value = '';
        await this.#cargarLista();
      } catch (error) {
        this.#mostrarError(error.message);
      }
    };
  }

  async #buscarMatricula(matricula) {
    this.#mostrarCargando();

    // 1. Buscar en la tabla de activos
    const enTabla = this.#vehiculosTodos.find(
      v => v.matricula.toUpperCase() === matricula
    );

    if (enTabla) {
      // Resaltar la fila en la tabla
      this.#resaltarFila(matricula);
      this.#divResultado.className = 'resultado';
      this.#divResultado.innerHTML = `
        <p style="color:#10b981; font-weight:bold;">🟢 Vehículo encontrado en el estacionamiento</p>
        <div class="ticket-row">
          <span>Matrícula:</span> <strong>${matricula}</strong>
        </div>
        <div class="ticket-row">
          <span>Entrada:</span>
          <span>${this.#formatearFechaHora(enTabla.hora_entrada).horaParte}</span>
        </div>
        <div class="ticket-row">
          <span>Tiempo:</span>
          <span>${this.#calcularEstancia(enTabla.hora_entrada)}</span>
        </div>
        <div style="margin-top:0.75rem;">
          <button id="btn-cobrar-desde-busqueda"
            style="width:100%; padding:0.6rem; background:#10b981; color:white;
                   border:none; border-radius:6px; font-weight:600; cursor:pointer;
                   font-size:0.875rem;">
            🏁 Registrar Salida Ahora
          </button>
        </div>
      `;

      document.getElementById('btn-cobrar-desde-busqueda').onclick = async () => {
        await this.#ejecutarSalidaDirecta(matricula);
      };

      return;
    }

    // 2. No está en la tabla — buscar historial
    try {
      const historial = await ParkingAPI.obtenerHistorialCliente(matricula);

      if (!historial.length) {
        this.#divResultado.className = 'resultado error';
        this.#divResultado.innerHTML = `
          <p><strong>🔍 No encontrado:</strong> La matrícula <strong>${matricula}</strong>
          no está en el estacionamiento ni tiene historial registrado.</p>
        `;
        return;
      }

      // Mostrar última visita
      const ultima = historial[0];
      const { fechaParte, horaParte } = this.#formatearFechaHora(ultima.hora_entrada);
      const monedaFmt = new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: 'MXN'
      }).format(ultima.total_pagado || 0);

      const filas = historial.slice(0, 5).map(h => {
        const e = this.#formatearFechaHora(h.hora_entrada);
        const monto = h.total_pagado
          ? new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(h.total_pagado)
          : '—';
        const mins = h.minutos
          ? `${Math.floor(h.minutos/60)}h ${h.minutos%60}m`
          : '—';
        return `
          <tr>
            <td style="padding:3px 6px; font-size:0.75rem; color:#6b7280;">${e.fechaParte}</td>
            <td style="padding:3px 6px; font-size:0.75rem;">${e.horaParte}</td>
            <td style="padding:3px 6px; font-size:0.75rem; color:#6b7280;">${mins}</td>
            <td style="padding:3px 6px; font-size:0.75rem; font-weight:600;">${monto}</td>
          </tr>`;
      }).join('');

      this.#divResultado.className = 'resultado';
      this.#divResultado.innerHTML = `
        <p style="color:#2563eb; font-weight:bold;">
          🔍 <strong>${matricula}</strong> — fuera del estacionamiento
        </p>
        <div style="margin-top:8px; border-top:1px solid #e5e7eb; padding-top:8px;">
          <p style="font-size:0.75rem; font-weight:600; color:#6b7280;
                    text-transform:uppercase; margin-bottom:6px;">
            Últimas visitas
          </p>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:3px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">Fecha</th>
                <th style="padding:3px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">Hora</th>
                <th style="padding:3px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">Tiempo</th>
                <th style="padding:3px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">Total</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
        </div>
      `;

    } catch (e) {
      this.#divResultado.className = 'resultado error';
      this.#divResultado.innerHTML = `<p><strong>Error:</strong> No se pudo consultar el historial.</p>`;
    }
  }

  #resaltarFila(matricula) {
    // Scroll a la tabla
    this.#tbodyVehiculos?.closest('table')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Resaltar la fila correspondiente
    const filas = this.#tbodyVehiculos?.querySelectorAll('tr');
    filas?.forEach(fila => {
      const badge = fila.querySelector('.badge-matricula');
      if (badge?.textContent.trim() === matricula) {
        fila.style.background   = '#fef3c7';
        fila.style.transition   = 'background 0.3s';
        // Quitar el resaltado después de 3 segundos
        setTimeout(() => {
          fila.style.background = '';
        }, 3000);
      }
    });
  }

  async #cargarLista() {
    try {
      this.#vehiculosTodos = await ParkingAPI.obtenerVehiculosActivos();
      this.#renderizarTabla(this.#vehiculosTodos);
      if (!this.#buscadorConfigurado) {
        this.#configurarBuscador();
        this.#buscadorConfigurado = true;
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  #renderizarTabla(vehiculos) {
    if (!this.#tbodyVehiculos) return;
    if (!vehiculos || vehiculos.length === 0) {
      this.#tbodyVehiculos.innerHTML = `
        <tr>
          <td colspan="3" style="text-align:center; padding:2rem; color:#6b7280;">
            No hay vehículos
          </td>
        </tr>`;
      return;
    }

    this.#tbodyVehiculos.innerHTML = vehiculos.map(v => {
      const { fechaParte, horaParte, esAntiguo } = this.#formatearFechaHora(v.hora_entrada);
      return `
        <tr data-raw-fecha="${v.hora_entrada}">
          <td><span class="badge-matricula">${v.matricula}</span></td>
          <td style="padding:0.75rem 0.5rem;">
            <div style="font-size:0.8rem; color:${esAntiguo ? '#ef4444' : '#6b7280'};
                        font-weight:${esAntiguo ? 'bold' : 'normal'};">
              ${esAntiguo ? '⚠️ ' : ''}${fechaParte}
            </div>
            <div style="font-size:0.95rem; font-weight:600;">${horaParte}</div>
          </td>
          <td>
            <button class="btn-tabla-salida" data-matricula="${v.matricula}">Cobrar</button>
          </td>
        </tr>`;
    }).join('');

    this.#vincularEventosTabla();
  }

  #vincularEventosTabla() {
    const botones = this.#tbodyVehiculos.querySelectorAll('.btn-tabla-salida');
    botones.forEach(btn => {
      btn.onclick = () => {
        this.#matriculaSeleccionada = btn.getAttribute('data-matricula');
        const fechaRaw = btn.closest('tr').getAttribute('data-raw-fecha');
        const { fechaParte, horaParte, esAntiguo } = this.#formatearFechaHora(fechaRaw);

        document.getElementById('modal-matricula-texto').innerText = this.#matriculaSeleccionada;
        document.getElementById('modal-entrada-texto').innerText   = `${fechaParte} - ${horaParte}`;

        const elTiempo       = document.getElementById('modal-tiempo-texto');
        elTiempo.innerText   = this.#calcularEstancia(fechaRaw);
        elTiempo.style.color = esAntiguo ? '#ef4444' : '#2563eb';

        this.#modal.classList.remove('oculto');
      };
    });
  }

  // ── UI ────────────────────────────────────────────────────────

  #mostrarCargando() {
    this.#divResultado.className = 'resultado oculto';
    this.#divResultado.innerHTML = '';
  }

  #mostrarError(m) {
    toastError('Error', m);
    this.#divResultado.className = 'resultado oculto';
  }

  #mostrarExito(r) {
    this.#divResultado.className = 'resultado';
    this.#divResultado.classList.remove('oculto');

    const moneda = new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN'
    }).format(r.data.total_pagar || 0);

    if (this.#accionActual === 'entrada') {
      const esFrecuente     = r.data.es_frecuente     || false;
      const nombreConductor = r.data.nombre_conductor || 'Nuevo Cliente';
      const matricula       = r.data.matricula;
      const visitas         = r.data.visitas          || 1;
      const historial       = r.data.historial        || [];

      // Badge superior
      let badgeHTML = '';
      if (esFrecuente) {
        badgeHTML = `
          <div style="background:#fef3c7; color:#92400e; padding:10px; border-radius:8px;
                      margin-bottom:12px; font-size:0.85rem; text-align:center;
                      border:1px solid #fde68a;">
            ⭐ <strong>Cliente Frecuente</strong> —
            <span style="font-weight:600;">${visitas} visitas</span>
          </div>`;
      } else {
        badgeHTML = `
          <div style="background:#f3f4f6; color:#374151; padding:10px; border-radius:8px;
                      margin-bottom:12px; font-size:0.85rem; text-align:center;
                      border:1px solid #e5e7eb;">
            👤 <strong>Primera visita</strong><br>
            <button id="btn-registrar-cliente"
              style="margin-top:5px; padding:2px 8px; font-size:0.7rem; cursor:pointer;
                     background:white; border:1px solid #ccc; border-radius:4px;">
              📝 Registrar Nombre
            </button>
          </div>`;
      }

      // Historial de visitas
      let historialHTML = '';
      if (esFrecuente && historial.length > 0) {
        const filas = historial.map(h => {
          const entrada = this.#formatearFechaHora(h.hora_entrada);
          const monto   = h.total_pagado
            ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
                .format(h.total_pagado)
            : '—';
          const tiempo = h.minutos
            ? `${Math.floor(h.minutos / 60)}h ${h.minutos % 60}m`
            : '—';
          return `
            <tr>
              <td style="padding:4px 6px; font-size:0.75rem; color:#6b7280;">
                ${entrada.fechaParte}
              </td>
              <td style="padding:4px 6px; font-size:0.75rem;">${entrada.horaParte}</td>
              <td style="padding:4px 6px; font-size:0.75rem; color:#6b7280;">${tiempo}</td>
              <td style="padding:4px 6px; font-size:0.75rem; font-weight:600;">${monto}</td>
            </tr>`;
        }).join('');

        historialHTML = `
          <div style="margin-top:12px; border-top:1px solid #e5e7eb; padding-top:10px;">
            <p style="font-size:0.75rem; font-weight:600; color:#6b7280;
                      margin-bottom:6px; text-transform:uppercase;">
              Últimas visitas
            </p>
            <div style="overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse;">
                <thead>
                  <tr style="background:#f9fafb;">
                    <th style="padding:4px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">
                      Fecha
                    </th>
                    <th style="padding:4px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">
                      Hora
                    </th>
                    <th style="padding:4px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">
                      Tiempo
                    </th>
                    <th style="padding:4px 6px; font-size:0.7rem; color:#9ca3af; text-align:left;">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>${filas}</tbody>
              </table>
            </div>
          </div>`;
      }

      this.#divResultado.innerHTML = `
        ${badgeHTML}
        <p style="color:#10b981; font-weight:bold;">✅ ${r.message}</p>
        <div class="ticket-row">
          <span>Matrícula:</span> <strong>${matricula}</strong>
        </div>
        <div class="ticket-row">
          <span>Conductor:</span>
          <span id="nombre-conductor-texto">${nombreConductor}</span>
        </div>
        <div class="ticket-row">
          <span>Hora:</span>
          <span>${this.#formatearFechaHora(r.data.hora_entrada).horaParte}</span>
        </div>
        ${historialHTML}
        <div style="margin-top:1rem; border-top:1px dashed #e5e7eb; padding-top:1rem;">
          <button id="btn-descargar-ticket"
            style="width:100%; padding:0.65rem; background:#2563eb; color:white;
                   border:none; border-radius:6px; font-weight:600; cursor:pointer;
                   font-size:0.875rem;">
            📄 Descargar Ticket PDF
          </button>
        </div>
      `;

      if (!esFrecuente) {
        document.getElementById('btn-registrar-cliente').onclick =
          () => this.#registrarNombreCliente(matricula);
      }

      document.getElementById('btn-descargar-ticket').onclick = async () => {
        const btn    = document.getElementById('btn-descargar-ticket');
        btn.textContent = '⏳ Generando PDF...';
        btn.disabled    = true;
        try {
          await generarTicketPDF({
            matricula,
            hora_entrada:     r.data.hora_entrada,
            nombre_conductor: nombreConductor,
            es_frecuente:     esFrecuente,
          });
        } finally {
          btn.textContent = '📄 Descargar Ticket PDF';
          btn.disabled    = false;
        }
      };

    } else {
      this.#divResultado.innerHTML = `
        <p style="color:#2563eb; font-weight:bold;">👋 ${r.message}</p>
        <div class="ticket-row">
          <span>Matrícula:</span> <strong>${r.data.matricula}</strong>
        </div>
        <div class="ticket-row ticket-total"
             style="border-top:1px dashed #ddd; margin-top:10px; padding-top:10px;">
          <span>Total a Pagar:</span>
          <strong style="font-size:1.2rem;">${moneda}</strong>
        </div>
        <div style="margin-top:1rem; border-top:1px dashed #e5e7eb; padding-top:1rem;">
          <button id="btn-descargar-comprobante"
            style="width:100%; padding:0.65rem; background:#059669; color:white;
                   border:none; border-radius:6px; font-weight:600; cursor:pointer;
                   font-size:0.875rem;">
            📄 Descargar Comprobante PDF
          </button>
        </div>
      `;

      document.getElementById('btn-descargar-comprobante').onclick = async () => {
        const btn    = document.getElementById('btn-descargar-comprobante');
        btn.textContent = '⏳ Generando PDF...';
        btn.disabled    = true;
        try {
          generarComprobanteSalidaPDF({
            matricula:        r.data.matricula,
            hora_entrada:     r.data.hora_entrada,
            hora_salida:      r.data.hora_salida,
            tiempo_minutos:   r.data.tiempo_minutos,
            total_pagar:      r.data.total_pagar,
            nombre_conductor: r.data.nombre_conductor || 'No registrado',
          });
        } finally {
          btn.textContent = '📄 Descargar Comprobante PDF';
          btn.disabled    = false;
        }
      };
    }
  }

  #inicializarModalCliente() {
    const modal       = document.getElementById('modal-cliente');
    const btnCerrar   = document.getElementById('btn-cerrar-modal-cliente');
    const btnCancelar = document.getElementById('btn-cancelar-modal-cliente');
    const btnGuardar  = document.getElementById('btn-guardar-modal-cliente');
    const inputNombre = document.getElementById('modal-cliente-nombre');
    const msgEl       = document.getElementById('modal-cliente-msg');

    if (!modal) return;

    const cerrar = () => {
      modal.classList.add('oculto');
      inputNombre.value   = '';
      msgEl.style.display = 'none';
    };

    btnCerrar.onclick   = cerrar;
    btnCancelar.onclick = cerrar;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrar();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('oculto')) cerrar();
    });

    inputNombre.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnGuardar.click();
    });

    btnGuardar.onclick = async () => {
      const nombre = inputNombre.value.trim();

      if (!nombre) {
        msgEl.textContent = '⚠️ Ingresa un nombre.';
        msgEl.className   = 'modal-msg error';
        msgEl.style.display = 'block';
        return;
      }

      const matricula        = document.getElementById('modal-cliente-matricula').textContent;
      btnGuardar.disabled    = true;
      btnGuardar.textContent = 'Guardando...';

      try {
        const response = await ParkingAPI.guardarCliente(matricula, nombre);

        if (response.status === 'success') {
          const textoNombre = document.getElementById('nombre-conductor-texto');
          if (textoNombre) textoNombre.textContent = nombre;

          const alertBox = document.getElementById('btn-registrar-cliente')?.parentElement;
          if (alertBox) {
            alertBox.style.background = '#dcfce7';
            alertBox.style.color      = '#166534';
            alertBox.style.border     = '1px solid #a7f3d0';
            alertBox.innerHTML        = '⭐ <strong>Cliente Registrado</strong>';
          }

          cerrar();
        }
      } catch (error) {
        msgEl.textContent   = '❌ No se pudo guardar. Intenta de nuevo.';
        msgEl.className     = 'modal-msg error';
        msgEl.style.display = 'block';
      } finally {
        btnGuardar.disabled    = false;
        btnGuardar.textContent = 'Guardar';
      }
    };
  }

  async #registrarNombreCliente(matricula) {
    const modal = document.getElementById('modal-cliente');
    document.getElementById('modal-cliente-matricula').textContent = matricula;
    document.getElementById('modal-cliente-nombre').value          = '';
    document.getElementById('modal-cliente-msg').style.display     = 'none';
    modal.classList.remove('oculto');
    setTimeout(() => {
      document.getElementById('modal-cliente-nombre').focus();
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => { new ParkingApp(); });