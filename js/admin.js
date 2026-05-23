/**
 * FLEEK studio — js/admin.js
 * Tecnología: Vanilla JS ES6+
 * Scope: Panel de administración completo.
 *        Login, dashboard, CRUD de proyectos,
 *        subida y reordenamiento de fotos.
 *
 * Se monta en el #app cuando la ruta es /admin
 * Dependencias: router.js (ya cargado en index.html)
 */

/* ============================================================
   ESTADO GLOBAL DEL ADMIN
   ============================================================ */
const AdminState = {
  user:      null,
  proyectos: [],
  drawerMode: null,   // 'nuevo' | 'editar'
  editingId:  null,
  pendingDeleteId: null,
  dragSrcIndex: null,
};

/* ============================================================
   API HELPERS
   ============================================================ */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, { credentials: 'include', ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

/* ============================================================
   TOAST
   ============================================================ */
function toast(msg, type = 'success') {
  const container = document.getElementById('admin-toasts');
  if (!container) return;

  const t = document.createElement('div');
  t.className = `admin-toast admin-toast--${type}`;
  t.textContent = msg;
  container.appendChild(t);

  requestAnimationFrame(() => t.classList.add('visible'));

  setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => t.remove(), 400);
  }, 3200);
}

/* ============================================================
   RENDER — LOGIN
   ============================================================ */
function renderLogin() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="admin-login">
      <div class="admin-login__box">
        <div class="admin-login__logo">
          <img src="imgs/FLEEK_Completo-01.png" alt="FLEEK studio" />
        </div>
        <h1 class="admin-login__title">Panel de administración</h1>
        <p class="admin-login__sub">Ingresá tus credenciales para continuar.</p>

        <div class="admin-login__error" id="login-error"></div>

        <div class="admin-login__form">
          <div class="form-field">
            <label for="admin-user">Usuario</label>
            <input type="text" id="admin-user" autocomplete="username" placeholder="admin" />
          </div>
          <div class="form-field">
            <label for="admin-pass">Contraseña</label>
            <input type="password" id="admin-pass" autocomplete="current-password" placeholder="••••••••" />
          </div>
          <button class="btn btn--primary" id="login-btn" style="width:100%;justify-content:center;margin-top:0.5rem;">
            Ingresar
          </button>
        </div>
      </div>
    </div>
    <div class="admin-toast-container" id="admin-toasts"></div>
  `;

  const btn      = document.getElementById('login-btn');
  const errorEl  = document.getElementById('login-error');
  const userIn   = document.getElementById('admin-user');
  const passIn   = document.getElementById('admin-pass');

  async function doLogin() {
    const username = userIn.value.trim();
    const password = passIn.value;
    if (!username || !password) return;

    btn.disabled = true;
    btn.textContent = 'Ingresando…';
    errorEl.classList.remove('visible');

    try {
      const data = await apiFetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      AdminState.user = data.username;
      renderDashboard();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('visible');
      btn.disabled = false;
      btn.textContent = 'Ingresar';
    }
  }

  btn.addEventListener('click', doLogin);
  passIn.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

/* ============================================================
   RENDER — DASHBOARD
   ============================================================ */
function renderDashboard() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="admin-layout">

      <!-- Sidebar -->
      <aside class="admin-sidebar">
        <div class="admin-sidebar__logo">
          <img src="imgs/FLEEK_Completo-01.png" alt="FLEEK studio" />
        </div>
        <nav class="admin-sidebar__nav">
          <button class="admin-nav__item active" data-view="proyectos">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/>
              <rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
            Proyectos
          </button>
          <a class="admin-nav__item" href="/" target="_blank">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2H2v12h12v-4M9 2h5v5M14 2L8 8"/>
            </svg>
            Ver sitio
          </a>
        </nav>
        <div class="admin-sidebar__footer">
          <div class="admin-sidebar__user" id="admin-username">${AdminState.user || ''}</div>
          <button class="admin-btn-logout" id="btn-logout">Cerrar sesión</button>
        </div>
      </aside>

      <!-- Main -->
      <div class="admin-main">
        <div class="admin-topbar">
          <button class="admin-topbar__burger" id="btn-sidebar-open" aria-label="Abrir menú">
            <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2 4h14M2 9h14M2 14h14"/>
            </svg>
          </button>
          <span class="admin-topbar__title">Proyectos</span>
          <button class="btn btn--primary" id="btn-nuevo" style="font-size:var(--text-sm);">
            + Nuevo proyecto
          </button>
        </div>
        <div class="admin-content">
          <div id="projects-list-container">
            <div class="admin-empty">
              <svg class="admin-empty__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2">
                <rect x="4" y="4" width="32" height="32" rx="4"/>
                <path d="M4 14h32M14 4v10"/>
              </svg>
              <p class="admin-empty__text">Cargando proyectos…</p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Drawer — Nuevo / Editar proyecto -->
    <div class="admin-overlay" id="drawer-overlay"></div>
    <div class="admin-drawer" id="project-drawer">
      <div class="admin-drawer__header">
        <span class="admin-drawer__title" id="drawer-title">Nuevo proyecto</span>
        <button class="admin-btn-icon" id="btn-close-drawer">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M1 1l12 12M13 1L1 13"/>
          </svg>
        </button>
      </div>
      <div class="admin-drawer__body" id="drawer-body"></div>
      <div class="admin-drawer__footer">
        <button class="btn btn--ghost" id="btn-cancel-drawer">Cancelar</button>
        <button class="btn btn--primary" id="btn-save-drawer">Guardar proyecto</button>
      </div>
    </div>

    <!-- Confirm delete -->
    <div class="admin-confirm" id="confirm-modal">
      <div class="admin-confirm__box">
        <h3 class="admin-confirm__title">Eliminar proyecto</h3>
        <p class="admin-confirm__text" id="confirm-text">
          Esta acción eliminará el proyecto y todas sus fotos permanentemente.
        </p>
        <div class="admin-confirm__actions">
          <button class="btn btn--ghost" id="btn-confirm-cancel">Cancelar</button>
          <button class="btn btn--primary" id="btn-confirm-ok"
            style="background:var(--admin-danger);">
            Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Sidebar overlay (mobile) -->
    <div class="admin-sidebar-overlay" id="sidebar-overlay"></div>

    <!-- Toasts -->
    <div class="admin-toast-container" id="admin-toasts"></div>
  `;

  bindDashboardEvents();
  loadProyectos();
}

/* ============================================================
   BIND EVENTS — DASHBOARD
   ============================================================ */
function bindDashboardEvents() {
  const sidebar        = document.querySelector('.admin-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  document.getElementById('btn-sidebar-open').addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
  });

  sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    AdminState.user = null;
    renderLogin();
  });

  document.getElementById('btn-nuevo').addEventListener('click', () => openDrawer('nuevo'));

  document.getElementById('drawer-overlay').addEventListener('click', closeDrawer);
  document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
  document.getElementById('btn-cancel-drawer').addEventListener('click', closeDrawer);

  document.getElementById('btn-save-drawer').addEventListener('click', saveProyecto);

  document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('btn-confirm-ok').addEventListener('click', async () => {
    if (!AdminState.pendingDeleteId) return;
    await doEliminar(AdminState.pendingDeleteId);
    closeConfirm();
  });
}

/* ============================================================
   LOAD — LISTA DE PROYECTOS
   ============================================================ */
async function loadProyectos() {
  try {
    AdminState.proyectos = await apiFetch('/api/admin/proyectos');
    renderProjectsList();
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderProjectsList() {
  const container = document.getElementById('projects-list-container');
  const proyectos = AdminState.proyectos;

  if (proyectos.length === 0) {
    container.innerHTML = `
      <div class="admin-empty">
        <svg class="admin-empty__icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="4" y="4" width="32" height="32" rx="4"/>
          <path d="M4 14h32M14 4v10"/>
        </svg>
        <p class="admin-empty__text">No hay proyectos todavía. Creá el primero.</p>
      </div>
    `;
    return;
  }

  const rows = proyectos.map(p => `
    <div class="admin-project-row" data-id="${p.id}">
      <img
        class="admin-project-row__thumb"
        src="${p.portada || ''}"
        alt="${p.nombre}"
        onerror="this.style.background='var(--surface)';this.removeAttribute('src')"
      />
      <div class="admin-project-row__info">
        <div class="admin-project-row__name">
          ${p.nombre}
          ${p.destacado ? '<span class="admin-badge" style="margin-left:6px;">Hero</span>' : ''}
        </div>
        <div class="admin-project-row__meta">${p.ubicacion} · ${p.año} · ${p.fotos?.length || 0} fotos</div>
      </div>
      <div class="admin-project-row__actions">
        <button class="admin-btn-icon btn-edit" data-id="${p.id}" title="Editar">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z"/>
          </svg>
        </button>
        <button class="admin-btn-icon admin-btn-icon--danger btn-delete" data-id="${p.id}" title="Eliminar">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 4h10M5 4V2h4v2M5.5 7v4M8.5 7v4M3 4l1 8h6l1-8"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `<div class="admin-projects-list">${rows}</div>`;

  container.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openDrawer('editar', btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => openConfirm(btn.dataset.id));
  });
}

/* ============================================================
   DRAWER — NUEVO / EDITAR
   ============================================================ */
function openDrawer(mode, id = null) {
  AdminState.drawerMode = mode;
  AdminState.editingId  = id;

  const proyecto = id ? AdminState.proyectos.find(p => p.id === id) : null;

  document.getElementById('drawer-title').textContent =
    mode === 'nuevo' ? 'Nuevo proyecto' : `Editar · ${proyecto?.nombre}`;

  renderDrawerBody(proyecto);

  document.getElementById('project-drawer').classList.add('open');
  document.getElementById('drawer-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('project-drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  document.body.style.overflow = '';
  AdminState.drawerMode = null;
  AdminState.editingId  = null;
}

function renderDrawerBody(proyecto = null) {
  const body = document.getElementById('drawer-body');

  body.innerHTML = `
    <!-- Datos básicos -->
    <div class="admin-form-section">
      <p class="admin-form-section__title">Datos del proyecto</p>

      <div class="form-field">
        <label for="f-nombre">Nombre</label>
        <input type="text" id="f-nombre" placeholder="Kotaro" value="${proyecto?.nombre || ''}" />
      </div>

      <div class="admin-form-row">
        <div class="form-field">
          <label for="f-ubicacion">Ubicación</label>
          <input type="text" id="f-ubicacion" placeholder="Palermo, Buenos Aires" value="${proyecto?.ubicacion || ''}" />
        </div>
        <div class="form-field">
          <label for="f-año">Año</label>
          <input type="number" id="f-año" placeholder="2025" value="${proyecto?.año || new Date().getFullYear()}" min="1900" max="2100" />
        </div>
      </div>

      <div class="form-field">
        <label for="f-descripcion">Descripción</label>
        <textarea id="f-descripcion" rows="4" placeholder="Descripción del proyecto…">${proyecto?.descripcion || ''}</textarea>
      </div>

      <label class="admin-toggle">
        <input type="checkbox" id="f-destacado" ${proyecto?.destacado ? 'checked' : ''} />
        <div class="admin-toggle__track"><div class="admin-toggle__thumb"></div></div>
        <span class="admin-toggle__label">Mostrar en hero slideshow</span>
      </label>
    </div>

    <!-- Fotos -->
    <div class="admin-form-section">
      <p class="admin-form-section__title">Fotos del proyecto</p>

      <!-- Grid de fotos existentes (solo en modo editar) -->
      ${proyecto ? `<div class="admin-photos-grid" id="photos-grid">${renderPhotoItems(proyecto)}</div>` : ''}

      <!-- Dropzone para subir nuevas fotos -->
      <div class="admin-dropzone" id="dropzone">
        <svg class="admin-dropzone__icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M16 22V10M10 16l6-6 6 6"/>
          <rect x="4" y="4" width="24" height="24" rx="4"/>
        </svg>
        <p class="admin-dropzone__text">
          ${proyecto ? 'Subir más fotos' : 'Subir fotos del proyecto'}
        </p>
        <p class="admin-dropzone__sub">JPG, PNG, WebP — máx. 20 MB por foto</p>
        <input type="file" id="f-fotos" multiple accept="image/jpeg,image/png,image/webp,image/avif" />
      </div>

      <!-- Preview de fotos nuevas (antes de guardar) -->
      <div class="admin-photos-grid" id="new-photos-grid" style="display:none;margin-top:var(--space-2);"></div>
    </div>
  `;

  // Toggle visual del switch
  const toggleInput = document.getElementById('f-destacado');
  const toggleTrack = toggleInput.parentElement.querySelector('.admin-toggle__track');

  toggleInput.addEventListener('change', () => {
    toggleTrack.style.background = toggleInput.checked ? 'var(--ink)' : '';
    const thumb = toggleTrack.querySelector('.admin-toggle__thumb');
    thumb.style.transform = toggleInput.checked ? 'translateX(16px)' : '';
  });

  // Init estado inicial del toggle
  if (proyecto?.destacado) {
    toggleTrack.style.background = 'var(--ink)';
    toggleTrack.querySelector('.admin-toggle__thumb').style.transform = 'translateX(16px)';
  }

  bindDropzone(proyecto);
  if (proyecto) bindPhotoDragDrop(proyecto);
}

/* ---- Render fotos del proyecto existente ---- */
function renderPhotoItems(proyecto) {
  if (!proyecto.fotos || proyecto.fotos.length === 0) return '';

  return proyecto.fotos.map((src, i) => `
    <div class="admin-photo-item" draggable="true" data-index="${i}" data-src="${src}">
      <img src="${src}" alt="Foto ${i + 1}" onerror="this.style.opacity=0.3" />
      <div class="admin-photo-item__order">${i + 1}</div>
      ${i === 0 || src === proyecto.portada ? '<div class="admin-photo-item__portada">Portada</div>' : ''}
      <div class="admin-photo-item__actions">
        <button class="admin-photo-btn btn-set-portada" data-src="${src}" title="Usar como portada">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="6" cy="6" r="5"/>
            <circle cx="6" cy="6" r="2" fill="currentColor"/>
          </svg>
        </button>
        <button class="admin-photo-btn admin-photo-btn--danger btn-del-foto" data-index="${i}" title="Eliminar foto">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 3h8M4 3V2h4v1M4.5 5.5v3M7.5 5.5v3M2.5 3l.8 7h5.4l.8-7"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/* ---- Dropzone — preview local antes de subir ---- */
function bindDropzone(proyecto) {
  const dropzone   = document.getElementById('dropzone');
  const fileInput  = document.getElementById('f-fotos');
  const previewGrid = document.getElementById('new-photos-grid');
  let pendingFiles = [];

  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFiles([...e.dataTransfer.files]);
  });

  fileInput.addEventListener('change', () => handleFiles([...fileInput.files]));

  function handleFiles(files) {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (images.length === 0) return;

    pendingFiles.push(...images);
    previewGrid.style.display = 'grid';
    previewGrid.innerHTML = '';

    pendingFiles.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'admin-photo-item';
      item.innerHTML = `<div class="admin-photo-item__order">${i + 1}</div>`;
      const img = document.createElement('img');
      img.src = URL.createObjectURL(f);
      img.onload = () => URL.revokeObjectURL(img.src);
      item.appendChild(img);

      const delBtn = document.createElement('div');
      delBtn.className = 'admin-photo-item__actions';
      delBtn.innerHTML = `
        <button class="admin-photo-btn admin-photo-btn--danger" title="Quitar">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 2l8 8M10 2L2 10"/>
          </svg>
        </button>
      `;
      delBtn.querySelector('button').addEventListener('click', () => {
        pendingFiles.splice(i, 1);
        handleFiles([]);
      });
      item.appendChild(delBtn);
      previewGrid.appendChild(item);
    });

    // Guardar referencia para el save
    dropzone._pendingFiles = pendingFiles;
  }
}

/* ---- Drag & drop para reordenar fotos existentes ---- */
function bindPhotoDragDrop(proyecto) {
  const grid = document.getElementById('photos-grid');
  if (!grid) return;

  // Botones de portada y eliminar
  grid.querySelectorAll('.btn-set-portada').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await apiFetch(`/api/admin/proyectos/${proyecto.id}/portada`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ portada: btn.dataset.src, heroImg: btn.dataset.src }),
        });
        const p = AdminState.proyectos.find(x => x.id === proyecto.id);
        if (p) p.portada = btn.dataset.src;
        // Refrescar el render del grid
        grid.innerHTML = renderPhotoItems({ ...proyecto, portada: btn.dataset.src });
        bindPhotoDragDrop({ ...proyecto, portada: btn.dataset.src });
        toast('Portada actualizada');
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  grid.querySelectorAll('.btn-del-foto').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta foto?')) return;
      try {
        const res = await apiFetch(`/api/admin/proyectos/${proyecto.id}/fotos/${btn.dataset.index}`, {
          method: 'DELETE',
        });
        const p = AdminState.proyectos.find(x => x.id === proyecto.id);
        if (p) p.fotos = res.fotos;
        grid.innerHTML = renderPhotoItems({ ...proyecto, fotos: res.fotos });
        bindPhotoDragDrop({ ...proyecto, fotos: res.fotos });
        toast('Foto eliminada');
      } catch (err) { toast(err.message, 'error'); }
    });
  });

  // Drag reorder
  let dragSrc = null;

  grid.querySelectorAll('.admin-photo-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrc = item;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => item.classList.add('dragging'), 0);
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => { e.preventDefault(); item.classList.add('drag-over'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', async e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      if (dragSrc === item) return;

      const allItems = [...grid.querySelectorAll('.admin-photo-item')];
      const fromIdx  = allItems.indexOf(dragSrc);
      const toIdx    = allItems.indexOf(item);

      const fotos = [...proyecto.fotos];
      const [moved] = fotos.splice(fromIdx, 1);
      fotos.splice(toIdx, 0, moved);

      try {
        await apiFetch(`/api/admin/proyectos/${proyecto.id}/fotos/orden`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ fotos }),
        });
        const p = AdminState.proyectos.find(x => x.id === proyecto.id);
        if (p) p.fotos = fotos;
        proyecto.fotos = fotos;
        grid.innerHTML = renderPhotoItems(proyecto);
        bindPhotoDragDrop(proyecto);
        toast('Orden guardado');
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

/* ============================================================
   SAVE PROYECTO (nuevo o editar)
   ============================================================ */
async function saveProyecto() {
  const btn         = document.getElementById('btn-save-drawer');
  const nombre      = document.getElementById('f-nombre')?.value.trim();
  const ubicacion   = document.getElementById('f-ubicacion')?.value.trim();
  const año         = document.getElementById('f-año')?.value;
  const destacado   = document.getElementById('f-destacado')?.checked;
  const descripcion = document.getElementById('f-descripcion')?.value.trim();
  const dropzone  = document.getElementById('dropzone');
  const pendingFiles = dropzone?._pendingFiles || [];

  if (!nombre || !ubicacion || !año) {
    toast('Completá nombre, ubicación y año.', 'error');
    return;
  }

  btn.disabled = true;

  try {
    let proyectoId;

    if (AdminState.drawerMode === 'nuevo') {
      // 1. Crear proyecto sin fotos
      btn.textContent = 'Creando proyecto…';
      const fd = new FormData();
      fd.append('nombre',      nombre);
      fd.append('ubicacion',   ubicacion);
      fd.append('anio',        año);
      fd.append('destacado',   destacado);
      fd.append('descripcion', descripcion);
      const nuevo = await apiFetch('/api/admin/proyectos', { method: 'POST', body: fd });
      AdminState.proyectos.push(nuevo);
      proyectoId = nuevo.id;
    } else {
      // Editar datos
      btn.textContent = 'Guardando…';
      await apiFetch(`/api/admin/proyectos/${AdminState.editingId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre, ubicacion, anio: año, destacado, descripcion }),
      });
      proyectoId = AdminState.editingId;
    }

    // 2. Subir fotos en lotes de 5
    if (pendingFiles.length > 0) {
      const BATCH = 5;
      for (let i = 0; i < pendingFiles.length; i += BATCH) {
        const lote = pendingFiles.slice(i, i + BATCH);
        btn.textContent = `Subiendo fotos ${i + 1}–${Math.min(i + BATCH, pendingFiles.length)} de ${pendingFiles.length}…`;
        const fd = new FormData();
        lote.forEach(f => fd.append('fotos', f));
        await apiFetch(`/api/admin/proyectos/${proyectoId}/fotos`, { method: 'POST', body: fd });
      }
    }

    // 3. Refrescar datos locales
    const updated = await apiFetch('/api/admin/proyectos');
    AdminState.proyectos = updated;

    toast(AdminState.drawerMode === 'nuevo'
      ? `Proyecto "${nombre}" creado`
      : 'Proyecto actualizado'
    );
    renderProjectsList();
    closeDrawer();

  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar proyecto';
  }
}

/* ============================================================
   ELIMINAR PROYECTO
   ============================================================ */
function openConfirm(id) {
  const proyecto = AdminState.proyectos.find(p => p.id === id);
  AdminState.pendingDeleteId = id;
  document.getElementById('confirm-text').textContent =
    `Vas a eliminar "${proyecto?.nombre}" y todas sus fotos. Esta acción no se puede deshacer.`;
  document.getElementById('confirm-modal').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-modal').classList.remove('open');
  AdminState.pendingDeleteId = null;
}

async function doEliminar(id) {
  try {
    await apiFetch(`/api/admin/proyectos/${id}`, { method: 'DELETE' });
    AdminState.proyectos = AdminState.proyectos.filter(p => p.id !== id);
    renderProjectsList();
    toast('Proyecto eliminado');
  } catch (err) {
    toast(err.message, 'error');
  }
}

/* ============================================================
   RENDER ADMIN — punto de entrada desde app.js
   Verifica sesión y muestra login o dashboard
   ============================================================ */
async function renderAdmin() {
  // Verificar si hay sesión activa
  try {
    const data = await apiFetch('/api/auth/me');
    AdminState.user = data.username;
    renderDashboard();
  } catch {
    renderLogin();
  }
}