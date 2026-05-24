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
   VISTA: CONTACTO
   ============================================================ */

async function renderContacto() {
  document.querySelector('.navbar')?.style.removeProperty('display');
  document.querySelector('.navbar__drawer')?.style.removeProperty('display');
  const app = document.getElementById('app');

  app.innerHTML = `
    <main id="main-content">
      ${renderContactHTML()}
    </main>
    ${renderFooterHTML()}
  `;

  document.title = 'Contacto — FLEEK studio';
  scrollToTop();
  initModules({ hero: false, lightbox: false });
  document.querySelector('.navbar')?.classList.add('scrolled');
  document.querySelector('.navbar')?.classList.remove('hero-active');
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
  const cards = PROYECTOS.map((p) => {
    return `
      <article class="project-card stagger-item reveal" role="listitem">
        <div class="project-card__image">
          <img src="${p.portada}" alt="${p.nombre}" loading="lazy" />
        </div>
        <div class="project-card__overlay" aria-hidden="true"></div>
        <div class="project-card__info">
          <div class="project-card__name">${p.nombre}</div>
          <div class="project-card__year">${p.ubicacion} - ${p.año}</div>
        </div>
        <a href="/obras/${p.id}" class="project-card__link" aria-label="Ver proyecto ${p.nombre}"></a>
      </article>
    `;
  }).join('');

  return `
    <section class="section section--surface" id="obras" aria-labelledby="projects-title">
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
              <div class="contact__detail-label">Teléfonos</div>
              <div class="contact__detail-value">
                <a href="tel:+541141593104">+54 11 4159-3104</a>
              </div>
              <div class="contact__detail-value">
                <a href="tel:+541163531798">+54 11 6353-1798</a>
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
              <a href="/#obras">Obras</a>
              <span>›</span>
              <span>${p.nombre}</span>
            </div>
            <h1 class="project-header__title reveal" data-delay="80">${p.nombre}</h1>
          </div>
          <div class="project-header__meta reveal" data-delay="160">
            ${p.ubicacion ? `<div class="project-meta-item"><div class="project-meta-item__label">Ubicación</div><div class="project-meta-item__value">${p.ubicacion}</div></div>` : ''}
            ${p.año      ? `<div class="project-meta-item"><div class="project-meta-item__label">Año</div><div class="project-meta-item__value">${p.año}</div></div>` : ''}
            ${p.tipologia ? `<div class="project-meta-item"><div class="project-meta-item__label">Tipología</div><div class="project-meta-item__value">${p.tipologia}</div></div>` : ''}
            ${p.tamaño   ? `<div class="project-meta-item"><div class="project-meta-item__label">Tamaño</div><div class="project-meta-item__value">${p.tamaño}</div></div>` : ''}
            ${p.proyecto ? `<div class="project-meta-item"><div class="project-meta-item__label">Proyecto</div><div class="project-meta-item__value">${p.proyecto}</div></div>` : ''}
            ${p.fotografia ? `<div class="project-meta-item"><div class="project-meta-item__label">Fotografía</div><div class="project-meta-item__value">${p.fotografia}</div></div>` : ''}
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

  const items = fotos.map((src, idx) => `
    <div class="mosaic-item reveal" data-index="${idx}">
      <img src="${src}" alt="" loading="lazy" />
      ${zoomIcon}
    </div>
  `).join('');

  return `
    <section class="project-mosaic" aria-label="Fotos del proyecto">
      <div class="container">
        <div class="mosaic-grid">${items}</div>
      </div>
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
    <a href="/obras/${prev.id}" class="project-nav__item project-nav__item--prev">
      <span class="project-nav__label">Anterior</span>
      <span class="project-nav__name">${prev.nombre}</span>
      <span class="project-nav__location">${prev.ubicacion}</span>
    </a>
  ` : '<div></div>';

  const nextHTML = next ? `
    <a href="/obras/${next.id}" class="project-nav__item project-nav__item--next">
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
          <div class="footer__brand">
            <div class="footer__logo"></div>
            <div class="footer__col">
              <span class="footer__col-title">Contacto</span>
              <a href="mailto:hola@fleek-studio.com">hola@fleek-studio.com</a>
            </div>
          </div>
          <div class="footer__col footer__col--social">
            <a href="https://www.instagram.com/fleekestudio/" target="_blank" rel="noopener" aria-label="Instagram">
              <svg class="footer__ig" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4.5"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </a>
          </div>
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
   VISTA: NOSOTROS
   ============================================================ */

async function renderNosotros() {
  document.querySelector('.navbar')?.style.removeProperty('display');
  document.querySelector('.navbar__drawer')?.style.removeProperty('display');
  const app = document.getElementById('app');

  app.innerHTML = `
    <main id="main-content">
      <div class="about-page__top-img">
        <img src="/imgs/abouttop.jpeg" alt="Fleek studio — espacio" />
      </div>
      <section class="about-page__content">
        <div class="container">
          <div class="about-page__grid">
            <div class="about-page__logo-col">
              <div class="about-page__isologo"></div>
            </div>
            <div class="about-page__text-col">
              <p class="about-page__lead">Somos Manuel y Martín, los fundadores de Fleek Architecture + Construction.</p>
              <p class="about-page__body">Nos especializamos en el diseño, la construcción y la gestión de proyectos arquitectónicos y comerciales, con un enfoque en la calidad, la eficiencia y la innovación. Nos apasiona crear espacios funcionales y distintivos que respondan a las necesidades específicas de cada cliente. En Fleek, combinamos experiencia técnica y creatividad para desarrollar soluciones personalizadas que destacan por su precisión y durabilidad. Desde proyectos gastronómicos y de retail hasta oficinas corporativas, abordamos cada obra con compromiso, profesionalismo y atención al detalle, garantizando resultados que transformen ideas en realidad.</p>
            </div>
          </div>
        </div>
      </section>
      <div class="about-page__bottom-img">
        <img src="/imgs/aboutbottom.jpeg" alt="Fleek studio — obra" />
      </div>
    </main>
    ${renderFooterHTML()}
  `;

  document.title = 'Nosotros — FLEEK studio';
  scrollToTop();
  initModules({ hero: false, lightbox: false });
  document.querySelector('.navbar')?.classList.add('scrolled');
  document.querySelector('.navbar')?.classList.remove('hero-active');
}

/* ============================================================
   ARRANQUE
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  Router.on('/',              renderHome);
  Router.on('/nosotros',      renderNosotros);
  Router.on('/contacto',      renderContacto);
  Router.on('/obras/:id', renderProyecto);
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