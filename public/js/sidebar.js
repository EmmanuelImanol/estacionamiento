export function inicializarSidebar(paginaActual) {
    const nombre = sessionStorage.getItem('usuario_nombre') || '';
    const rol    = sessionStorage.getItem('usuario_rol')    || '';

    if (!nombre && paginaActual !== 'login') {
        window.location.href = 'index.html';
        return;
    }

    // ── Aplicar modo oscuro guardado ─────────────────────────
    const modoOscuro = localStorage.getItem('dark-mode') === 'true';
    if (modoOscuro) document.body.classList.add('dark-mode');

    // ── Inyectar sidebar ──────────────────────────────────────
    document.getElementById('sidebar').innerHTML = `
        <a href="home.html" class="sidebar-brand">
            <div class="sidebar-brand-icon">🅿</div>
            <div class="sidebar-brand-text">
                <span class="sidebar-brand-name">Estacionamiento</span>
                <span class="sidebar-brand-sub">El Centro</span>
            </div>
        </a>

        <nav class="sidebar-nav">
            <span class="sidebar-section-label">Principal</span>

            <a href="home.html" class="sidebar-link ${paginaActual === 'home' ? 'active' : ''}">
                <span class="sidebar-link-icon">⌂</span>
                <span class="sidebar-link-label">Inicio</span>
            </a>

            <a href="operaciones.html" class="sidebar-link ${paginaActual === 'operaciones' ? 'active' : ''}">
                <span class="sidebar-link-icon">🎫</span>
                <span class="sidebar-link-label">Entrada / Salida</span>
                <span class="sidebar-badge-counter zero" id="badge-activos">0</span>
            </a>

            <div class="sidebar-divider"></div>
            <span class="sidebar-section-label">Reportes</span>

            <a href="dashboard.html" class="sidebar-link ${paginaActual === 'dashboard' ? 'active' : ''}">
                <span class="sidebar-link-icon">▦</span>
                <span class="sidebar-link-label">Dashboard</span>
            </a>

            <a href="frecuentes.html" class="sidebar-link ${paginaActual === 'frecuentes' ? 'active' : ''}">
                <span class="sidebar-link-icon">★</span>
                <span class="sidebar-link-label">Frecuentes</span>
            </a>

            ${rol === 'admin' ? `
            <div class="sidebar-divider"></div>
            <span class="sidebar-section-label">Administración</span>

            <a href="usuarios.html" class="sidebar-link ${paginaActual === 'usuarios' ? 'active' : ''}">
                <span class="sidebar-link-icon">◈</span>
                <span class="sidebar-link-label">Usuarios</span>
                <span class="sidebar-link-badge">Admin</span>
            </a>

            <a href="configuracion.html" class="sidebar-link ${paginaActual === 'configuracion' ? 'active' : ''}">
                <span class="sidebar-link-icon">⚙</span>
                <span class="sidebar-link-label">Configuración</span>
            </a>
            ` : ''}

            <div class="sidebar-divider"></div>

            <!-- Toggle modo oscuro -->
            <div class="dark-toggle" id="dark-toggle" title="Cambiar tema">
                <span class="sidebar-link-icon">◑</span>
                <span class="dark-toggle-label">Modo oscuro</span>
                <div class="dark-toggle-track ${modoOscuro ? 'activo' : ''}" id="dark-track">
                    <div class="dark-toggle-thumb"></div>
                </div>
            </div>
        </nav>

        <div class="sidebar-footer">
            <div class="sidebar-avatar">${nombre.charAt(0).toUpperCase()}</div>
            <div class="sidebar-user-info">
                <div class="sidebar-user-name">${nombre}</div>
                <div class="sidebar-user-rol">${rol}</div>
            </div>
            <button class="sidebar-logout-btn" id="sidebar-logout-btn" title="Cerrar sesión">⏻</button>
        </div>
    `;

    // ── Topbar móvil ─────────────────────────────────────────
    document.getElementById('mobile-topbar').innerHTML = `
        <button class="hamburger" id="hamburger" aria-label="Menú">
            <span></span><span></span><span></span>
        </button>
        <a href="home.html" class="mobile-topbar-brand">
            <span style="font-size:1.2rem;">🅿</span>
            <span class="mobile-topbar-title">Estacionamiento</span>
        </a>
        <span class="sidebar-badge-counter zero" id="badge-activos-mobile"
              style="margin-left:auto; margin-right:0.5rem;">0</span>
    `;

    // ── Hamburger ─────────────────────────────────────────────
    const sidebar    = document.getElementById('sidebar');
    const overlay    = document.getElementById('sidebar-overlay');
    const hamburger  = document.getElementById('hamburger');

    const abrirSidebar  = () => { sidebar.classList.add('open');    overlay.classList.add('visible');    hamburger?.classList.add('open'); };
    const cerrarSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); hamburger?.classList.remove('open'); };

    hamburger?.addEventListener('click', () =>
        sidebar.classList.contains('open') ? cerrarSidebar() : abrirSidebar()
    );
    overlay?.addEventListener('click', cerrarSidebar);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarSidebar(); });
    sidebar.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => { if (window.innerWidth <= 768) cerrarSidebar(); });
    });

    // ── Logout ────────────────────────────────────────────────
    document.getElementById('sidebar-logout-btn')?.addEventListener('click', async () => {
        try {
            const url = new URL('/estacionamiento/api.php', window.location.origin);
            url.searchParams.append('action', 'logout');
            await fetch(url);
        } finally {
            sessionStorage.clear();
            window.location.href = 'index.html';
        }
    });

    // ── Modo oscuro ───────────────────────────────────────────
    document.getElementById('dark-toggle')?.addEventListener('click', () => {
        const activo = document.body.classList.toggle('dark-mode');
        localStorage.setItem('dark-mode', activo);
        document.getElementById('dark-track')?.classList.toggle('activo', activo);
    });

    // ── Contador de autos en tiempo real ──────────────────────
    async function actualizarContador() {
        try {
            const url = new URL('/estacionamiento/api.php', window.location.origin);
            url.searchParams.append('action', 'listar');
            const res  = await fetch(url);
            const data = await res.json();
            const cant = data?.data?.length || 0;

            const badges = [
                document.getElementById('badge-activos'),
                document.getElementById('badge-activos-mobile'),
            ];

            badges.forEach(badge => {
                if (!badge) return;
                badge.textContent = cant;
                badge.classList.toggle('zero', cant === 0);
            });
        } catch (e) { /* silencioso */ }
    }

    actualizarContador();
    setInterval(actualizarContador, 30000);

    // ── Scroll #usuarios ──────────────────────────────────────
    if (window.location.hash === '#usuarios') {
        setTimeout(() => {
            document.getElementById('seccion-usuarios')?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }
}
