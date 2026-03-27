export class ParkingAPI {
  static #BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '/api.php'
    : '/estacionamiento/api.php';

  // ── Operaciones ───────────────────────────────────────────────

  static async procesarAccion(accion, matricula, observaciones = '') {
    try {
      const url = new URL(this.#BASE_URL, window.location.origin);
      url.searchParams.append('action', accion);
      url.searchParams.append('matricula', matricula);
      if (observaciones) url.searchParams.append('observaciones', observaciones);

      const response = await fetch(url);
      const data     = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error en el servidor');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  static async obtenerVehiculosActivos() {
    try {
      const url = new URL(this.#BASE_URL, window.location.origin);
      url.searchParams.append('action', 'listar');

      const response = await fetch(url);
      const data     = await response.json();

      if (!response.ok) throw new Error(data.error);
      return data.data;
    } catch (error) {
      console.error('Error al obtener la lista:', error);
      return [];
    }
  }

  // ── Clientes ──────────────────────────────────────────────────

  static async guardarCliente(matricula, nombre) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'clientes');

    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ matricula, nombre })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Error al guardar cliente');
    }
    return await res.json();
  }

  static async obtenerClientesFrecuentes() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'clientes.frecuentes');
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }

  static async obtenerHistorialCliente(matricula) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'clientes.historial');
    url.searchParams.append('matricula', matricula);
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }

  // ── Auth ──────────────────────────────────────────────────────

  static async login(email, password) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'login');

    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
    return data;
  }

  static async logout() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'logout');
    await fetch(url);
    sessionStorage.clear();
    window.location.href = 'index.html';
  }

  // ── Usuarios ──────────────────────────────────────────────────

  static async listarUsuarios() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'usuarios.listar');
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }

  static async crearUsuario(nombre, email, password, rol) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'usuarios.crear');
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nombre, email, password, rol })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  static async editarUsuario(body) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'usuarios.editar');
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al editar usuario');
    return data;
  }

  static async desactivarUsuario(id) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'usuarios.desactivar');
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  static async entradaTurno(turnoId, matricula, observaciones = '') {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.entrada');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({turno_id: turnoId, matricula, observaciones}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async salidaTurno(matricula) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.salida');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({matricula}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async registrosTurnos(turnoId = null) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.registros');
    if (turnoId) url.searchParams.append('turno_id', turnoId);
    const res = await fetch(url); const data = await res.json();
    if (!res.ok) throw new Error(data.error); return data.data;
  }

  static async entradaConvenio(convenioId, matricula, observaciones = '') {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.entrada');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({convenio_id: convenioId, matricula, observaciones}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async salidaConvenio(matricula) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.salida');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({matricula}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  // ── Turnos ────────────────────────────────────────────────────
  static async listarTurnos() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.listar');
    const res = await fetch(url); const data = await res.json();
    if (!res.ok) throw new Error(data.error); return data.data;
  }

  static async listarTurnosActivos() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.activos');
    const res = await fetch(url); const data = await res.json();
    if (!res.ok) throw new Error(data.error); return data.data;
  }

  static async crearTurno(datos) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.crear');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(datos) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async editarTurno(datos) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.editar');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(datos) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async toggleTurno(id) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.toggle');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  // ── Convenios ─────────────────────────────────────────────────
  static async listarConvenios() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.listar');
    const res = await fetch(url); const data = await res.json();
    if (!res.ok) throw new Error(data.error); return data.data;
  }

  static async registrosConvenios(convenioId = null) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.registros');
    if (convenioId) url.searchParams.append('convenio_id', convenioId);
    const res = await fetch(url); const data = await res.json();
    if (!res.ok) throw new Error(data.error); return data.data;
  }

  static async listarConveniosActivos() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.activos');
    const res = await fetch(url); const data = await res.json();
    if (!res.ok) throw new Error(data.error); return data.data;
  }

  static async crearConvenio(datos) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.crear');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(datos) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async editarConvenio(datos) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.editar');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(datos) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async toggleConvenio(id) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'convenios.toggle');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  static async asignarTurnoConvenio(matricula, turnoId = null, convenioId = null) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'turnos.asignar');
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({matricula, turno_id: turnoId, convenio_id: convenioId}) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error); return data;
  }

  // ── Configuración ─────────────────────────────────────────────
  static async obtenerConfig() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'config.obtener');
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }

  static async guardarConfig(datos) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'config.guardar');
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  }

  static async obtenerResumenDia() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'dashboard.resumen');
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }

  static async obtenerDatosGrafica() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'dashboard.grafica');
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }

  static async obtenerSesionesFiltradas(desde, hasta, estado = '') {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'dashboard.sesiones.filtro');
    url.searchParams.append('desde', desde);
    url.searchParams.append('hasta', hasta);
    if (estado) url.searchParams.append('estado', estado);
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }

  static exportarCSV(desde, hasta) {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'dashboard.exportar');
    url.searchParams.append('desde', desde);
    url.searchParams.append('hasta', hasta);
    window.open(url.toString(), '_blank');
  }

  static async obtenerSesionesRecientes() {
    const url = new URL(this.#BASE_URL, window.location.origin);
    url.searchParams.append('action', 'dashboard.sesiones');
    const res  = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.data;
  }
}
