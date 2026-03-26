export class ParkingAPI {
  static #BASE_URL = 'api.php';

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