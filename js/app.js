/**
 * FLEEK studio — js/app.js
 * Tecnología: Vanilla JS ES6+
 * Scope: Controlador principal de la SPA.
 *
 * Dependencias (en orden de carga):
 *   data/proyectos.js    → PROYECTOS[]
 *   js/router.js         → Router
 *   js/ui.js             → initNavbar, initScrollReveal, etc.
 *   js/hero-slideshow.js → HeroSlideshow
 *   js/lightbox.js       → Lightbox
 *   js/app.js            ← este archivo
 */

/* ============================================================
   CONSTANTES
   ============================================================ */

/**
 * PROYECTOS — cargados desde /api/proyectos al iniciar.
 * Ya no se usa la variable global de data/proyectos.js
 */
let PROYECTOS = [];

async function fetchProyectos() {
  try {
    const res = await fetch('/api/proyectos');
    const data = await res.json();
    PROYECTOS = Array.isArray(data) ? data : [];
  } catch {
    PROYECTOS = [];
  }
}

/** Patrón cíclico de columnas para el grid — se repite indefinidamente */
const PATRON_COLUMNAS = ['span-7', 'span-5', 'span-4', 'span-4', 'span-4', 'span-5', 'span-7'];

/** Patrón de filas para el mosaico de detalle */
const PATRON_FILAS    = ['full', '2-1', 'thirds', '1-2', 'half'];

/** Fotos por tipo de fila */
const FOTOS_POR_FILA  = { full: 1, '2-1': 2, thirds: 3, '1-2': 2, half: 2 };

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ============================================================
   VISTA: HOME
   ============================================================ */

async function renderHome(_params, hash) {
  document.querySelector('.navbar')?.style.removeProperty('display');
  document.querySelector('.navbar__drawer')?.style.removeProperty('display');
  await fetchProyectos();
  const app = document.getElementById('app');

  app.innerHTML = `
    ${renderHeroHTML()}
    <main id="main-content">
      ${renderProjectsHTML()}
      ${renderContactHTML()}
    </main>
    ${renderFooterHTML()}
  `;

  if (hash) {
    requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (target) window.scrollTo({ top: target.offsetTop - 52, behavior: 'smooth' });
    });
  } else {
    scrollToTop();
  }

  initModules({ hero: true, lightbox: false });
}

/* ============================================================
   VISTA: PROYECTO INDIVIDUAL
   ============================================================ */

async function renderProyecto({ id }) {
  document.querySelector('.navbar')?.style.removeProperty('display');
  document.querySelector('.navbar__drawer')?.style.removeProperty('display');
  await fetchProyectos();
  const proyecto = PROYECTOS.find(p => p.id === id);
  if (!proyecto) { render404(); return; }

  const idx  = PROYECTOS.indexOf(proyecto);
  const prev = PROYECTOS[idx - 1] || null;
  const next = PROYECTOS[idx + 1] || null;

  const app = document.getElementById('app');
  app.innerHTML = `
    <main id="main-content">
      ${renderProyectoHeaderHTML(proyecto)}
      ${renderMosaicoHTML(proyecto.fotos)}
      ${renderProyectoNavHTML(prev, next)}
    </main>
    ${renderFooterHTML()}
  `;

  document.title = `${proyecto.nombre} — FLEEK studio`;
  scrollToTop();
  initModules({ hero: false, lightbox: true });

  document.querySelector('.navbar')?.classList.add('scrolled');
  document.querySelector('.navbar')?.classList.remove('hero-active');
}

/* ============================================================
   VISTA: 404
   ============================================================ */

function render404() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <main id="main-content" style="min-height:80vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1.5rem;text-align:center;padding:4rem 1.5rem;">
      <p style="font-family:var(--font-mono);font-size:var(--text-xs);letter-spacing:0.1em;text-transform:uppercase;color:var(--ink-muted);">404</p>
      <h1 style="font-family:var(--font-serif);font-size:var(--text-4xl);font-weight:bold;letter-spacing:-0.04em;color:var(--ink);">Página no encontrada</h1>
      <a href="/" class="btn btn--ghost" style="margin-top:1rem;">Volver al inicio</a>
    </main>
    ${renderFooterHTML()}
  `;
  document.title = 'Página no encontrada — FLEEK studio';
  scrollToTop();
  initModules({ hero: false, lightbox: false });
}

/* ============================================================
   GENERADORES DE HTML — NAVBAR (estático, no se re-renderiza)
   ============================================================ */

/* La navbar vive en el HTML del shell (index.html) y nunca
   se reemplaza — por eso no tiene función de render acá.   */

/* ============================================================
   GENERADORES DE HTML — HOME
   ============================================================ */

function renderHeroHTML() {
  const destacados = PROYECTOS.filter(p => p.destacado);

  const slides = destacados.map((p, i) => `
    <div class="hero__slide" data-project="${p.nombre} — ${p.año}">
      <img
        src="${p.heroImg}"
        alt="${p.nombre}"
        width="1920" height="1080"
        loading="${i === 0 ? 'eager' : 'lazy'}"
        ${i === 0 ? 'fetchpriority="high"' : ''}
      />
    </div>
  `).join('');

  const dots = destacados.map((_, i) => `
    <button class="hero__dot${i === 0 ? ' active' : ''}" role="tab" aria-label="Proyecto ${i + 1}"></button>
  `).join('');

  return `
    <section class="hero" aria-label="Proyectos destacados">
      <div class="hero__slides">${slides}</div>
      <span class="hero__slide-label" aria-hidden="true"></span>
      <div class="hero__indicators" role="tablist" aria-label="Navegar proyectos">${dots}</div>
      <div class="hero__progress" aria-hidden="true"></div>
      <div class="hero__content">
      </div>
    </section>
  `;
}

function renderProjectsHTML() {
  const cards = PROYECTOS.map((p, i) => {
    const colClass = PATRON_COLUMNAS[i % PATRON_COLUMNAS.length];
    return `
      <article class="project-card ${colClass} stagger-item reveal" role="listitem">
        <div class="project-card__image">
          <img src="${p.portada}" alt="${p.nombre}" loading="lazy" />
        </div>
        <div class="project-card__overlay" aria-hidden="true"></div>
        <div class="project-card__info">
          <div class="project-card__name">${p.nombre}</div>
          <div class="project-card__year">${p.año}</div>
        </div>
        <a href="/proyectos/${p.id}" class="project-card__link" aria-label="Ver proyecto ${p.nombre}"></a>
      </article>
    `;
  }).join('');

  return `
    <section class="section section--surface" id="proyectos" aria-labelledby="projects-title">
      <div class="container">
        <div class="section__header reveal">
          <h2 class="section__title" id="projects-title">OBRAS SELECCIONADAS</h2>
        </div>
        <div class="projects__grid stagger-group" role="list">
          ${cards}
        </div>
      </div>
    </section>
  `;
}

function renderContactHTML() {
  return `
    <section class="section" id="contacto" aria-labelledby="contact-title">
      <div class="container">
        <div class="section__header reveal">
          <p class="section__label">Hablemos</p>
          <h2 class="section__title" id="contact-title">
            ¿Tenés un<br/>proyecto en mente?
          </h2>
        </div>
        <div class="contact__grid">
          <form class="contact__form" action="/api/contact" aria-label="Formulario de contacto" novalidate>
            <div class="form-field">
              <label for="name">Nombre completo</label>
              <input type="text" id="name" name="name" placeholder="Paula Ramírez" required autocomplete="name"/>
            </div>
            <div class="form-field">
              <label for="email">Correo electrónico</label>
              <input type="email" id="email" name="email" placeholder="paula@correo.com" required autocomplete="email"/>
            </div>
            <div class="form-field">
              <label for="type">Tipo de proyecto</label>
              <select id="type" name="type" required>
                <option value="" disabled selected>Seleccionar…</option>
                <option value="residencial">Residencial</option>
                <option value="comercial">Comercial</option>
                <option value="institucional">Institucional</option>
                <option value="reforma">Reforma / Remodelación</option>
                <option value="consulta">Consulta técnica</option>
              </select>
            </div>
            <div class="form-field">
              <label for="message">Contanos sobre tu proyecto</label>
              <textarea id="message" name="message" placeholder="Ubicación, superficie aproximada, programa, plazo estimado…" required></textarea>
            </div>
            <button type="submit" class="btn btn--primary" style="width:fit-content;margin-top:0.5rem;">
              Enviar consulta
            </button>
          </form>
          <div class="contact__info reveal" data-delay="100">
            <div class="contact__detail">
              <div class="contact__detail-label">Teléfono</div>
              <div class="contact__detail-value">
                <a href="tel:+541148000000">+54 11 4800-0000</a>
              </div>
              <div class="contact__detail-label">Teléfono</div>
              <div class="contact__detail-value">
                <a href="tel:+541148000000">+54 11 4800-0000</a>
              </div>
            </div>
            <div class="contact__detail">
              <div class="contact__detail-label">Email</div>
              <div class="contact__detail-value">
                <a href="mailto:hola@fleek-studio.com">hola@fleek-studio.com</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

/* ============================================================
   GENERADORES DE HTML — PROYECTO INDIVIDUAL
   ============================================================ */

function renderProyectoHeaderHTML(p) {
  return `
    <section class="project-header">
      <div class="container">
        <div class="project-header__inner">
          <div>
            <div class="project-header__eyebrow reveal">
              <a href="/#proyectos">Proyectos</a>
              <span>›</span>
              <span>${p.nombre}</span>
            </div>
            <h1 class="project-header__title reveal" data-delay="80">${p.nombre}</h1>
          </div>
          <div class="project-header__meta reveal" data-delay="160">
            <div class="project-meta-item">
              <div class="project-meta-item__label">Ubicación</div>
              <div class="project-meta-item__value">${p.ubicacion}</div>
            </div>
            <div class="project-meta-item">
              <div class="project-meta-item__label">Año</div>
              <div class="project-meta-item__value">${p.año}</div>
            </div>
          </div>
          ${p.descripcion ? `<p class="project-header__description reveal" data-delay="220">${p.descripcion}</p>` : ''}
        </div>
      </div>
    </section>
  `;
}

function renderMosaicoHTML(fotos) {
  if (!fotos || fotos.length === 0) return '';

  const zoomIcon = `
    <div class="mosaic-item__zoom" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="6.5" cy="6.5" r="4.5"/>
        <path d="M10 10l3 3"/>
        <path d="M5 6.5h3M6.5 5v3"/>
      </svg>
    </div>
  `;

  let rows = '';
  let i = 0;
  let filaIdx = 0;

  while (i < fotos.length) {
    const tipo     = PATRON_FILAS[filaIdx % PATRON_FILAS.length];
    const cantidad = FOTOS_POR_FILA[tipo];
    const lote     = fotos.slice(i, i + cantidad);
    if (lote.length === 0) break;

    const tipoReal = lote.length === 1 ? 'full' : lote.length === 2 ? 'half' : tipo;

    const items = lote.map(src => `
      <div class="mosaic-item">
        <img src="${src}" alt="" loading="lazy" />
        ${zoomIcon}
      </div>
    `).join('');

    rows += `<div class="mosaic-row mosaic-row--${tipoReal} reveal">${items}</div>`;
    i += lote.length;
    filaIdx++;
  }

  return `
    <section class="project-mosaic" aria-label="Fotos del proyecto">
      <div class="container">${rows}</div>
    </section>
    ${renderLightboxHTML()}
  `;
}

function renderLightboxHTML() {
  return `
    <div class="lightbox" role="dialog" aria-modal="true" aria-label="Vista ampliada de foto">
      <button class="lightbox__close" aria-label="Cerrar">
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M1 1l12 12M13 1L1 13"/>
        </svg>
      </button>
      <button class="lightbox__btn lightbox__btn--prev" aria-label="Foto anterior">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M11 4L6 9l5 5"/>
        </svg>
      </button>
      <div class="lightbox__img-wrap">
        <img class="lightbox__img" src="" alt="" />
      </div>
      <button class="lightbox__btn lightbox__btn--next" aria-label="Foto siguiente">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M7 4l5 5-5 5"/>
        </svg>
      </button>
      <span class="lightbox__counter" aria-live="polite"></span>
    </div>
  `;
}

function renderProyectoNavHTML(prev, next) {
  const prevHTML = prev ? `
    <a href="/proyectos/${prev.id}" class="project-nav__item project-nav__item--prev">
      <span class="project-nav__label">Anterior</span>
      <span class="project-nav__name">${prev.nombre}</span>
      <span class="project-nav__location">${prev.ubicacion}</span>
    </a>
  ` : '<div></div>';

  const nextHTML = next ? `
    <a href="/proyectos/${next.id}" class="project-nav__item project-nav__item--next">
      <span class="project-nav__label">Siguiente</span>
      <span class="project-nav__name">${next.nombre}</span>
      <span class="project-nav__location">${next.ubicacion}</span>
    </a>
  ` : '<div></div>';

  return `
    <nav class="project-nav" aria-label="Proyectos anterior y siguiente">
      <div class="container">
        <div class="project-nav__inner">
          ${prevHTML}
          ${nextHTML}
        </div>
      </div>
    </nav>
  `;
}

function renderFooterHTML() {
  return `
    <footer class="footer" role="contentinfo">
      <div class="container">
        <div class="footer__inner">
          <span class="footer__copy">© 2026 FLEEK studio — Todos los derechos reservados</span>
          <ul class="footer__links">
            <li><a href="https://www.instagram.com/fleekestudio/" target="_blank" rel="noopener">Instagram</a></li>
          </ul>
        </div>
      </div>
    </footer>
  `;
}

/* ============================================================
   INICIALIZACIÓN DE MÓDULOS
   ============================================================ */

function initModules({ hero, lightbox }) {
  if (typeof initScrollReveal === 'function') initScrollReveal();
  if (typeof initStagger      === 'function') initStagger();
  if (typeof initContactForm  === 'function') initContactForm();

  if (hero     && typeof HeroSlideshow !== 'undefined') new HeroSlideshow({ interval: 5000 });
  if (lightbox && typeof Lightbox      !== 'undefined') new Lightbox();
}

/* ============================================================
   ARRANQUE
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  Router.on('/',              renderHome);
  Router.on('/proyectos/:id', renderProyecto);
  Router.on('/admin',         () => {
    // Ocultar navbar en el panel de admin
    document.querySelector('.navbar')?.style.setProperty('display', 'none');
    document.querySelector('.navbar__drawer')?.style.setProperty('display', 'none');

    if (!document.getElementById('admin-css')) {
      const link = document.createElement('link');
      link.id   = 'admin-css';
      link.rel  = 'stylesheet';
      link.href = 'css/admin.css';
      document.head.appendChild(link);
    }
    if (typeof renderAdmin === 'function') {
      renderAdmin();
    } else {
      const script = document.createElement('script');
      script.src = 'js/admin.js';
      script.onload = () => renderAdmin();
      document.body.appendChild(script);
    }
  });
  Router.on('*', render404);

  Router.init();

  if (typeof initNavbar       === 'function') initNavbar();
  if (typeof initMobileDrawer === 'function') initMobileDrawer();
  if (typeof initSmoothScroll === 'function') initSmoothScroll();
  if (typeof initCustomCursor === 'function') initCustomCursor();
});