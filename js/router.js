/**
 * ESTUDIO — js/router.js
 * Tecnología: Vanilla JS — History API (pushState / popstate)
 * Scope: Enrutamiento client-side sin recarga de página.
 *        Intercepta clicks en <a> internos y resuelve rutas.
 *
 * Rutas:
 *   /                  → renderHome()     en app.js
 *   /proyectos/:id     → renderProyecto() en app.js
 *
 * Dependencias: debe cargarse antes de app.js
 */

const Router = (() => {

  const _routes = {};

  /** Registrar una ruta: Router.on('/proyectos/:id', handler) */
  function on(pattern, handler) {
    _routes[pattern] = handler;
  }

  /** Navegar a una ruta sin recargar */
  function navigate(path) {
    window.history.pushState({}, '', path);
    _resolve(path);
  }

  /** Resolver la ruta actual contra las rutas registradas */
  function _resolve(path) {
    // Separar pathname del hash (/#proyectos → path='/', hash='proyectos')
    const [pathname, hash] = path.split('#');

    for (const pattern in _routes) {
      const { match, params } = _matchPattern(pattern, pathname);
      if (match) {
        _routes[pattern](params, hash || null);
        return;
      }
    }

    // Sin match → 404
    if (_routes['*']) _routes['*']({}, null);
  }

  /** Compara una ruta con un patrón y extrae params */
  function _matchPattern(pattern, path) {
    const keys = [];
    const regexStr = pattern
      .replace(/\//g, '\\/')
      .replace(/:([^/]+)/g, (_, key) => { keys.push(key); return '([^/]+)'; });
    const match = path.match(new RegExp(`^${regexStr}\\/?$`));
    if (!match) return { match: false, params: {} };
    const params = {};
    keys.forEach((key, i) => params[key] = decodeURIComponent(match[i + 1]));
    return { match: true, params };
  }

  /** Inicializar: interceptar clicks y escuchar popstate */
  function init() {
    // Interceptar clicks en links internos
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      // Solo rutas internas que empiezan con /
      if (!href || !href.startsWith('/')) return;
      // Ignorar links con target="_blank" o download
      if (a.target === '_blank' || a.hasAttribute('download')) return;
      e.preventDefault();
      navigate(href);
    });

    // Botón atrás / adelante del navegador
    window.addEventListener('popstate', () => {
      _resolve(window.location.pathname + window.location.hash);
    });

    // Resolver la ruta inicial al cargar la página
    _resolve(window.location.pathname + window.location.hash);
  }

  return { on, navigate, init };

})();