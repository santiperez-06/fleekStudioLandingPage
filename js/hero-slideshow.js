/**
 * ESTUDIO — hero-slideshow.js
 * Tecnología: JavaScript ES6+ (Vanilla)
 * Scope: Manejo del slideshow fullscreen del hero.
 *        Autoplay, pausa on hover, navegación por teclado,
 *        indicadores interactivos, barra de progreso.
 *
 * Dependencias: Ninguna (vanilla JS puro)
 * Llamado desde: index.html (defer)
 */

class HeroSlideshow {
  /**
   * @param {Object} config
   * @param {string} config.slidesSelector   - Selector de los slides
   * @param {string} config.dotsSelector     - Selector de los dots
   * @param {string} config.progressSelector - Selector de la barra de progreso
   * @param {string} config.labelSelector    - Selector del label lateral
   * @param {number} config.interval         - ms entre slides (default 5000)
   */
  constructor(config = {}) {
    this.slidesEl    = document.querySelectorAll(config.slidesSelector || '.hero__slide');
    this.dotsEl      = document.querySelectorAll(config.dotsSelector   || '.hero__dot');
    this.progressEl  = document.querySelector(config.progressSelector  || '.hero__progress');
    this.labelEl     = document.querySelector(config.labelSelector     || '.hero__slide-label');
    this.heroEl      = document.querySelector('.hero');

    this.interval    = config.interval || 5000;
    this.current     = 0;
    this.total       = this.slidesEl.length;
    this.timer       = null;
    this.progressAnim = null;
    this.isPaused    = false;

    if (this.total === 0) return;

    this._init();
  }

  _init() {
    // Arrancar con slide aleatorio
    this.current = Math.floor(Math.random() * this.total);

    this._activateSlide(this.current);
    this._startProgress();
    this._scheduleNext();
    this._bindEvents();

    // Marcar hero como cargado para animar el texto
    setTimeout(() => this.heroEl?.classList.add('hero--loaded'), 100);
  }

  /** Activa el slide indicado y actualiza UI */
  _activateSlide(index) {
    this.slidesEl.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    this.dotsEl.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    // Actualizar label con el nombre del proyecto
    if (this.labelEl) {
      const label = this.slidesEl[index]?.dataset.project || '';
      this.labelEl.textContent = label;
    }
  }

  /** Avanza al siguiente slide (circular) */
  _next() {
    this.current = (this.current + 1) % this.total;
    this._activateSlide(this.current);
    this._resetProgress();
    this._startProgress();
    this._scheduleNext();
  }

  /** Va a un slide específico */
  goTo(index) {
    if (index === this.current) return;
    clearTimeout(this.timer);
    this.current = index;
    this._activateSlide(this.current);
    this._resetProgress();
    this._startProgress();
    this._scheduleNext();
  }

  /** Programa el próximo cambio automático */
  _scheduleNext() {
    clearTimeout(this.timer);
    if (!this.isPaused) {
      this.timer = setTimeout(() => this._next(), this.interval);
    }
  }

  /** Inicia la animación de la barra de progreso */
  _startProgress() {
    if (!this.progressEl) return;
    this.progressEl.style.transition = `width ${this.interval}ms linear`;
    // Force reflow
    void this.progressEl.offsetWidth;
    this.progressEl.style.width = '100%';
  }

  /** Resetea la barra de progreso */
  _resetProgress() {
    if (!this.progressEl) return;
    this.progressEl.style.transition = 'none';
    this.progressEl.style.width = '0%';
  }

  /** Bind de eventos: hover, dots, teclado, touch */
  _bindEvents() {
    // Pausa al hacer hover sobre el hero
    this.heroEl?.addEventListener('mouseenter', () => {
      this.isPaused = true;
      clearTimeout(this.timer);
      if (this.progressEl) {
        const computedWidth = getComputedStyle(this.progressEl).width;
        const containerWidth = this.progressEl.parentElement?.offsetWidth || 1;
        this.progressEl.style.transition = 'none';
        this.progressEl.style.width = computedWidth;
      }
    });

    this.heroEl?.addEventListener('mouseleave', () => {
      this.isPaused = false;
      this._resetProgress();
      this._startProgress();
      this._scheduleNext();
    });

    // Clicks en los dots
    this.dotsEl.forEach((dot, i) => {
      dot.addEventListener('click', () => this.goTo(i));
    });

    // Navegación por teclado
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') this._next();
      if (e.key === 'ArrowLeft') {
        clearTimeout(this.timer);
        this.current = (this.current - 1 + this.total) % this.total;
        this._activateSlide(this.current);
        this._resetProgress();
        this._startProgress();
        this._scheduleNext();
      }
    });

    // Swipe en touch
    let touchStartX = 0;
    this.heroEl?.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    this.heroEl?.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        dx < 0 ? this._next() : this.goTo((this.current - 1 + this.total) % this.total);
      }
    }, { passive: true });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new HeroSlideshow({ interval: 5000 });
});