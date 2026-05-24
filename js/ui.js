/**
 * ESTUDIO — ui.js
 * Tecnología: JavaScript ES6+ (Vanilla) — IntersectionObserver API
 * Scope: Comportamiento de navbar (scroll + hero detection),
 *        animaciones de scroll-entry (reveal),
 *        mobile drawer, formulario de contacto.
 *
 * Dependencias: Ninguna (vanilla JS puro)
 * Llamado desde: index.html (defer)
 */

/* ============================================================
   NAVBAR — scroll state + hero detection
   ============================================================ */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const hero = document.querySelector('.hero');

  // IntersectionObserver para detectar si el hero es visible
  // (más eficiente que escuchar scroll continuamente)
  if (hero) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        navbar.classList.toggle('hero-active', entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    heroObserver.observe(hero);
  }

  // Clase 'scrolled' para borde inferior
  const scrollObserver = new IntersectionObserver(
    ([entry]) => {
      // Sentinel element al top de la página
      navbar.classList.toggle('scrolled', !entry.isIntersecting);
    },
    { threshold: 1.0 }
  );

  // Crear sentinel invisible al inicio del body
  const sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none';
  document.body.prepend(sentinel);
  scrollObserver.observe(sentinel);

  // Hide on scroll down, show on scroll up
  let lastY = 0;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y > lastY && y > 80) {
        navbar.classList.add('hidden');
      } else {
        navbar.classList.remove('hidden');
      }
      lastY = y;
      ticking = false;
    });
  }, { passive: true });
}

/* ============================================================
   MOBILE DRAWER — hamburger menu
   ============================================================ */
function initMobileDrawer() {
  const burger = document.querySelector('.navbar__burger');
  const drawer = document.querySelector('.navbar__drawer');
  if (!burger || !drawer) return;

  let open = false;

  burger.addEventListener('click', () => {
    open = !open;
    drawer.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';

    // Animar las barras del burger → X
    const bars = burger.querySelectorAll('span');
    if (open) {
      bars[0].style.transform = 'translateY(6.5px) rotate(45deg)';
      bars[1].style.opacity = '0';
      bars[2].style.transform = 'translateY(-6.5px) rotate(-45deg)';
    } else {
      bars[0].style.transform = '';
      bars[1].style.opacity = '';
      bars[2].style.transform = '';
    }
  });

  // Cerrar al hacer click en un link del drawer
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      const bars = burger.querySelectorAll('span');
      bars[0].style.transform = '';
      bars[1].style.opacity = '';
      bars[2].style.transform = '';
      open = false;
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

/* ============================================================
   SCROLL REVEAL — IntersectionObserver
   ============================================================ */
function initScrollReveal() {
  const elements = document.querySelectorAll('.reveal');
  if (elements.length === 0) return;

  // Aplicar delays al grupo de elementos hermanos
  // via atributo data-delay (ms)
  elements.forEach(el => {
    const delay = el.dataset.delay;
    if (delay) el.style.setProperty('--delay', delay);
    if (delay) el.style.transitionDelay = `${delay}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Unobserve para no repetir la animación
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    }
  );

  elements.forEach(el => observer.observe(el));
}

/* ============================================================
   STAGGER — animar hijos en cascada
   Agregar class .stagger-group al contenedor,
   los hijos con .stagger-item reciben delays automáticos
   ============================================================ */
function initStagger() {
  document.querySelectorAll('.stagger-group').forEach(group => {
    const items = group.querySelectorAll('.stagger-item');
    items.forEach((item, i) => {
      item.style.transitionDelay = `${i * 80}ms`;
    });
  });
}

/* ============================================================
   SMOOTH SCROLL — links internos con offset navbar
   ============================================================ */
function initSmoothScroll() {
  const navHeight = 52; // height del navbar

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();

      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}

/* ============================================================
   CONTACTO FORM — validación básica + feedback
   ============================================================ */
function initContactForm() {
  const form = document.querySelector('.contact__form');
  if (!form) return;

  const btn = form.querySelector('.btn--primary');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fields = form.querySelectorAll('[required]');
    let valid = true;

    fields.forEach(field => {
      field.style.borderColor = '';
      if (!field.value.trim()) {
        field.style.borderColor = 'var(--pale-red-text)';
        valid = false;
      }
    });

    if (!valid) return;

    // Estado de carga
    const originalText = btn.textContent;
    btn.textContent = 'Enviando…';
    btn.disabled = true;

    try {
      /**
       * BACKEND HOOK:
       * Reemplazar la siguiente línea con el endpoint real.
       * Opciones recomendadas (ver README.md):
       *   - Formspree:  fetch('https://formspree.io/f/YOUR_ID', ...)
       *   - Resend API: endpoint propio en /api/contact
       *   - Netlify Forms: agregar netlify attr al form
       */
      await new Promise(resolve => setTimeout(resolve, 1200)); // DEMO

      btn.textContent = 'Mensaje enviado';
      form.reset();
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 3000);
    } catch (err) {
      btn.textContent = 'Error al enviar';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
      }, 3000);
    }
  });
}

/* ============================================================
   CURSOR PERSONALIZADO (opcional — desktop only)
   ============================================================ */
function initCustomCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // no en touch

  const cursor = document.createElement('div');
  cursor.style.cssText = `
    position: fixed;
    width: 6px;
    height: 6px;
    background: var(--ink, #111);
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transition: transform 0.2s ease, opacity 0.2s ease;
    transform: translate(-50%, -50%);
    opacity: 0;
  `;
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';
    cursor.style.opacity = '1';
  });

  // Escalar en links y botones
  document.querySelectorAll('a, button, [role="button"]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(3)';
      cursor.style.opacity = '0.3';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      cursor.style.opacity = '1';
    });
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initScrollReveal();
  initStagger();
  initSmoothScroll();
  initContactForm();
  //initCustomCursor();
});