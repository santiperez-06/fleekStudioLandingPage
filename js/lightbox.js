/**
 * ESTUDIO — lightbox.js
 * Tecnología: JavaScript ES6+ Vanilla
 * Scope: Lightbox para el mosaico de fotos del proyecto.
 *        Navegación con teclado, touch swipe y click.
 *
 * Dependencias: Ninguna
 * Llamado desde: proyecto.html (defer)
 */

class Lightbox {
  constructor() {
    this.el        = document.querySelector('.lightbox');
    this.imgEl     = this.el?.querySelector('.lightbox__img');
    this.counterEl = this.el?.querySelector('.lightbox__counter');
    this.closeBtn  = this.el?.querySelector('.lightbox__close');
    this.prevBtn   = this.el?.querySelector('.lightbox__btn--prev');
    this.nextBtn   = this.el?.querySelector('.lightbox__btn--next');

    // Recopilar todas las imágenes del mosaico en orden DOM
    this.images = [...document.querySelectorAll('.mosaic-item img')].map(img => ({
      src: img.src,
      alt: img.alt,
    }));

    this.current = 0;

    if (!this.el || this.images.length === 0) return;
    this._bind();
  }

  open(index) {
    this.current = index;
    this._show();
    this.el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.el.classList.remove('open');
    document.body.style.overflow = '';
  }

  prev() {
    this.current = (this.current - 1 + this.images.length) % this.images.length;
    this._show();
  }

  next() {
    this.current = (this.current + 1) % this.images.length;
    this._show();
  }

  _show() {
    const { src, alt } = this.images[this.current];

    // Fade out → swap → fade in
    this.imgEl.style.opacity = '0';
    this.imgEl.style.transform = 'scale(0.97)';

    setTimeout(() => {
      this.imgEl.src = src;
      this.imgEl.alt = alt;
      this.imgEl.style.opacity = '';
      this.imgEl.style.transform = '';
    }, 160);

    if (this.counterEl) {
      this.counterEl.textContent = `${this.current + 1} / ${this.images.length}`;
    }
  }

  _bind() {
    // Click en cada ítem del mosaico
    document.querySelectorAll('.mosaic-item').forEach((item, i) => {
      item.addEventListener('click', () => this.open(i));
    });

    // Botones
    this.closeBtn?.addEventListener('click', () => this.close());
    this.prevBtn?.addEventListener('click', () => this.prev());
    this.nextBtn?.addEventListener('click', () => this.next());

    // Click en el fondo (fuera de la imagen)
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });

    // Teclado
    document.addEventListener('keydown', (e) => {
      if (!this.el.classList.contains('open')) return;
      if (e.key === 'Escape')      this.close();
      if (e.key === 'ArrowLeft')   this.prev();
      if (e.key === 'ArrowRight')  this.next();
    });

    // Touch swipe
    let touchStartX = 0;
    this.el.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    this.el.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) {
        dx < 0 ? this.next() : this.prev();
      }
    }, { passive: true });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Lightbox();
});