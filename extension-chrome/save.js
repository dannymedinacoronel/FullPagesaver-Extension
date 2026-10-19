const params = new URLSearchParams(location.search);
const TARGET_TAB_ID = Number(params.get("tab"));
const MODE = params.get("mode") || "html";
// Varias pestañas: se eligen en esta ventana entre las de la ventana WINDOW_ID.
const BATCH = params.get("batch") === "1";
const WINDOW_ID = Number(params.get("window"));
// Ajustes del popup: llegan en la dirección o, desde el atajo de teclado, se
// toman los últimos que se eligieron en el popup.
const storedSetting = key => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const PAPER = params.get("paper") || storedSetting("fps-paper") || "A4";
const ORIENTATION = params.get("orientation") || storedSetting("fps-orientation") || "portrait";
const status = document.querySelector("#status");
const MAX_CAPTURES = 120;
// En páginas tipo aplicación (bandejas, feeds) la lista no acaba nunca.
const APP_MAX_CAPTURES = 15;
const SCROLL_STEP = 0.9;
// Chrome permite como mucho dos captureVisibleTab por segundo.
const CAPTURE_INTERVAL_MS = 520;
// Velocidad elegida en el popup. Afecta a las tres fases:
// - Preparar la página (recorrerla para que cargue): prepareStepMs de pausa
//   en cada pantalla, prepareEndMs al llegar al final y prepareMaxMs en total.
// - Cada captura: settleMs de pausa mínima tras desplazarse y, después,
//   espera a que no quede nada cargando (spinners, imágenes) y a que la página
//   lleve quietMs sin cambiar, como mucho maxWaitMs. endWaitMs al final por si
//   llega más contenido.
// - Visores de PDF: viewerMaxMs para que se pinte cada página, viewerBlankMs
//   esperando si sale en blanco y viewerExtraMs de margen al terminar.
// La rápida no espera nada de más (solo el límite de Chrome de dos capturas
// por segundo); la lenta da mucho tiempo a las webs que tardan en cargar.
const SPEEDS = {
  fast: {
    settleMs: 40, maxWaitMs: 0, quietMs: 0, endWaitMs: 200,
    prepareStepMs: 25, prepareEndMs: 120, prepareMaxMs: 20_000, prepareScreens: 40,
    viewerMaxMs: 15_000, viewerBlankMs: 0, viewerExtraMs: 0, snapshotPageMs: 2000
  },
  normal: {
    settleMs: 400, maxWaitMs: 4000, quietMs: 300, endWaitMs: 800,
    prepareStepMs: 80, prepareEndMs: 300, prepareMaxMs: 40_000, prepareScreens: 60,
    viewerMaxMs: 30_000, viewerBlankMs: 5000, viewerExtraMs: 250, snapshotPageMs: 5000
  },
  slow: {
    settleMs: 2500, maxWaitMs: 20_000, quietMs: 1500, endWaitMs: 3000,
    prepareStepMs: 1200, prepareEndMs: 2500, prepareMaxMs: 240_000, prepareScreens: 120,
    viewerMaxMs: 90_000, viewerBlankMs: 30_000, viewerExtraMs: 2000, snapshotPageMs: 20_000
  }
};
const SPEED = SPEEDS[params.get("speed") || storedSetting("fps-speed")] || SPEEDS.normal;

const PAPER_SIZES = {
  A4: [210, 297],
  Letter: [215.9, 279.4],
  A3: [297, 420],
  Legal: [215.9, 355.6]
};

function setStatus(message, isError = false) {
  status.textContent = message;
  status.dataset.error = String(isError);
}

function safeFileName(value) {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 150);
  return cleaned || "pagina-web";
}

async function getTargetTab() {
  const tab = await chrome.tabs.get(TARGET_TAB_ID);
  if (!tab?.id) {
    throw new Error(t("err.tabNotFound"));
  }
  if (!/^https?:\/\//i.test(tab.url || "")) {
    throw new Error(t("err.httpOnly"));
  }
  return tab;
}

async function readPageMetrics(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const root = document.scrollingElement || document.documentElement;
      // Sin las barras de scroll de la ventana (en modo estándar, clientWidth
      // del <html> es el ancho visible sin la barra).
      const standards = document.compatMode === "CSS1Compat";
      const viewport = {
        left: 0,
        top: 0,
        right: standards && document.documentElement.clientWidth ? document.documentElement.clientWidth : window.innerWidth,
        bottom: standards && document.documentElement.clientHeight ? document.documentElement.clientHeight : window.innerHeight
      };

      // Rectángulo visible del elemento en coordenadas de la pestaña: suma el
      // desplazamiento de los iframes y recorta por los ancestros con overflow.
      const visibleRect = (element, frame) => {
        const view = element.ownerDocument.defaultView;
        const rect = element.getBoundingClientRect();
        let left = Math.max(frame.clip.left, frame.offsetX + rect.left);
        let top = Math.max(frame.clip.top, frame.offsetY + rect.top);
        let right = Math.min(frame.clip.right, frame.offsetX + rect.right);
        let bottom = Math.min(frame.clip.bottom, frame.offsetY + rect.bottom);
        for (let ancestor = element.parentElement; ancestor && right > left && bottom > top; ancestor = ancestor.parentElement) {
          const style = view.getComputedStyle(ancestor);
          if (/(hidden|clip|auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
            const ancestorRect = ancestor.getBoundingClientRect();
            left = Math.max(left, frame.offsetX + ancestorRect.left);
            top = Math.max(top, frame.offsetY + ancestorRect.top);
            right = Math.min(right, frame.offsetX + ancestorRect.right);
            bottom = Math.min(bottom, frame.offsetY + ancestorRect.bottom);
          }
        }
        return { left, top, right, bottom };
      };

      // Documento principal más los iframes del mismo origen (visores PDF.js
      // y similares meten el área desplazable dentro de iframes anidados).
      const frames = [];
      const visitFrame = frame => {
        frames.push(frame);
        Array.from(frame.doc.querySelectorAll("iframe, frame")).forEach((element, index) => {
          let inner = null;
          try {
            inner = element.contentDocument;
          } catch {}
          if (!inner?.documentElement) return;
          const clip = visibleRect(element, frame);
          if (clip.right - clip.left < 100 || clip.bottom - clip.top < 100) return;
          const rect = element.getBoundingClientRect();
          visitFrame({
            doc: inner,
            path: [...frame.path, index],
            offsetX: frame.offsetX + rect.left + element.clientLeft,
            offsetY: frame.offsetY + rect.top + element.clientTop,
            clip
          });
        });
      };
      visitFrame({ doc: document, path: [], offsetX: 0, offsetY: 0, clip: viewport });

      const candidates = [];
      for (const frame of frames) {
        const view = frame.doc.defaultView;
        for (const element of frame.doc.querySelectorAll("body *")) {
          if (["select", "textarea", "option", "iframe", "frame"].includes(element.localName)) continue;
          if (element.clientHeight <= 100 || element.scrollHeight <= element.clientHeight + 8) continue;
          if (element.clientWidth / Math.max(1, element.clientHeight) <= 0.45) continue;
          if (!/auto|scroll|overlay/.test(view.getComputedStyle(element).overflowY)) continue;
          // Recorta al área de contenido para no capturar las barras de scroll.
          const visible = visibleRect(element, frame);
          const box = element.getBoundingClientRect();
          visible.right = Math.min(visible.right, frame.offsetX + box.left + element.clientLeft + element.clientWidth);
          visible.bottom = Math.min(visible.bottom, frame.offsetY + box.top + element.clientTop + element.clientHeight);
          const width = visible.right - visible.left;
          const height = visible.bottom - visible.top;
          if (width <= 100 || height <= 100) continue;
          candidates.push({ element, frame, visible, area: width * height });
        }
      }
      // Entre las áreas grandes se prefiere la más anidada: un visor dentro de
      // un iframe es el contenido real aunque la página tenga otro contenedor.
      const largest = Math.max(0, ...candidates.map(candidate => candidate.area));
      candidates.sort((first, second) => {
        const firstMain = first.area >= largest * 0.5;
        const secondMain = second.area >= largest * 0.5;
        if (firstMain !== secondMain) return firstMain ? -1 : 1;
        if (firstMain && first.frame.path.length !== second.frame.path.length) {
          return second.frame.path.length - first.frame.path.length;
        }
        return second.area - first.area;
      });

      const chosen = candidates[0];
      const target = chosen ? chosen.element : root;
      let selector = "";

      if (chosen) {
        const parts = [];
        let current = target;
        while (current && current !== chosen.frame.doc.documentElement) {
          if (current.id) {
            parts.unshift(`#${CSS.escape(current.id)}`);
            break;
          }
          const sameTag = Array.from(current.parentElement?.children || [])
            .filter(sibling => sibling.localName === current.localName);
          const position = sameTag.indexOf(current) + 1;
          parts.unshift(`${current.localName}:nth-of-type(${position})`);
          current = current.parentElement;
        }
        selector = parts.join(" > ");
      }

      const { left, top, right, bottom } = chosen ? chosen.visible : viewport;

      return {
        title: document.title,
        selector,
        framePath: chosen ? chosen.frame.path : [],
        isDocument: !chosen,
        layoutViewportWidth: window.innerWidth,
        viewportWidth: Math.max(0, right - left),
        viewportHeight: Math.max(0, bottom - top),
        cropLeft: left,
        cropTop: top,
        clientHeight: target.clientHeight,
        documentHeight: target.scrollHeight,
        scrollY: chosen ? target.scrollTop : window.scrollY
      };
    }
  });
  if (!result?.result?.viewportWidth || !result.result.viewportHeight || !result.result.documentHeight) {
    throw new Error(t("err.noScrollArea"));
  }
  return result.result;
}

async function scrollPage(tabId, metrics, y) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: (selector, isDocument, requestedY, framePath) => {
      if (isDocument) {
        const root = document.scrollingElement || document.documentElement;
        const documentElement = document.documentElement;
        const body = document.body;
        const originalRootBehavior = root.style.scrollBehavior;
        const originalHtmlBehavior = documentElement.style.scrollBehavior;
        const originalBodyBehavior = body?.style.scrollBehavior;
        root.style.scrollBehavior = "auto";
        documentElement.style.scrollBehavior = "auto";
        if (body) body.style.scrollBehavior = "auto";
        window.scrollTo(0, requestedY);
        const actualY = window.scrollY;
        const height = root.scrollHeight;
        root.style.scrollBehavior = originalRootBehavior;
        documentElement.style.scrollBehavior = originalHtmlBehavior;
        if (body) body.style.scrollBehavior = originalBodyBehavior;
        return { y: actualY, height };
      }
      let doc = document;
      for (const index of framePath) {
        const frame = doc.querySelectorAll("iframe, frame")[index];
        try {
          doc = frame?.contentDocument;
        } catch {
          doc = null;
        }
        if (!doc) return null;
      }
      const element = doc.querySelector(selector);
      if (!element) return null;
      const originalBehavior = element.style.scrollBehavior;
      element.style.scrollBehavior = "auto";
      element.scrollTop = requestedY;
      const actualY = element.scrollTop;
      element.style.scrollBehavior = originalBehavior;
      return { y: actualY, height: element.scrollHeight };
    },
    args: [metrics.selector, metrics.isDocument, y, metrics.framePath]
  });
  if (typeof result?.result?.y !== "number") {
    throw new Error(t("err.scrollFailed"));
  }
  return result.result;
}

// Oculta (o vuelve a mostrar) los elementos fijos o pegajosos que quedan
// encima del área capturada: cabeceras, barras y botones flotantes saldrían
// repetidos en cada captura como franjas en el PDF.
async function setOverlaysHidden(tabId, metrics, hidden) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (framePath, selector, hide, crop) => {
      const chain = [];
      let doc = document;
      let offsetX = 0;
      let offsetY = 0;
      for (let level = 0; doc; level++) {
        const frame = level < framePath.length ? doc.querySelectorAll("iframe, frame")[framePath[level]] : null;
        chain.push({ doc, frame, offsetX, offsetY });
        if (!frame) break;
        const rect = frame.getBoundingClientRect();
        offsetX += rect.left + frame.clientLeft;
        offsetY += rect.top + frame.clientTop;
        try {
          doc = frame.contentDocument;
        } catch {
          doc = null;
        }
      }

      for (const { doc: current, frame, offsetX: x, offsetY: y } of chain) {
        if (!hide) {
          current.querySelectorAll("[data-fps-hidden]").forEach(element => {
            const previous = element.getAttribute("data-fps-hidden");
            element.style.removeProperty("visibility");
            if (previous) element.style.setProperty("visibility", previous.split("|")[0], previous.split("|")[1] || "");
            element.removeAttribute("data-fps-hidden");
          });
          continue;
        }
        const view = current.defaultView;
        const inner = frame || (selector ? current.querySelector(selector) : null);
        for (const element of current.querySelectorAll("body *")) {
          if (!/fixed|sticky/.test(view.getComputedStyle(element).position)) continue;
          if (inner && element.contains(inner)) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) continue;
          const overlaps = x + rect.left < crop.right && x + rect.right > crop.left
            && y + rect.top < crop.bottom && y + rect.bottom > crop.top;
          if (!overlaps) continue;
          // Si el elemento contiene el área que se recorre, no es una barra.
          if (rect.height >= (crop.bottom - crop.top) * 0.9 && rect.width >= (crop.right - crop.left) * 0.9) continue;
          const previous = element.style.getPropertyValue("visibility");
          element.setAttribute("data-fps-hidden", previous ? `${previous}|${element.style.getPropertyPriority("visibility")}` : "");
          element.style.setProperty("visibility", "hidden", "important");
        }
      }
    },
    args: [metrics.framePath, metrics.selector, hidden, {
      left: metrics.cropLeft,
      top: metrics.cropTop,
      right: metrics.cropLeft + metrics.viewportWidth,
      bottom: metrics.cropTop + metrics.viewportHeight
    }]
  });
}

// Se inyecta en la página. Devuelve cada línea de texto que se ve en la zona
// capturada (crop) con su posición en px CSS del contenido (la misma
// referencia que las capturas), para la capa de texto seleccionable del PDF.
// Se llama justo después de cada captura, con el área desplazada a scrollY:
// así el texto es el mismo que sale en la imagen aunque la web cargue
// contenido mientras se recorre.
function collectTextInTab(framePath, selector, isDocument, crop, scrollY) {
  const MAX_WORDS = 150_000;
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "SELECT", "OPTION", "TITLE", "TEMPLATE"]);
  const runs = [];
  let words = 0;
  let run = null;
  const flush = () => {
    if (run?.text.trim()) {
      runs.push([run.text.trim(), +(run.left - crop.left).toFixed(1), +(run.top - crop.top + scrollY).toFixed(1),
        +(run.right - run.left).toFixed(1), +(run.bottom - run.top).toFixed(1)]);
    }
    run = null;
  };

  const walk = (doc, root, offsetX, offsetY, clip) => {
    const visibility = new Map();
    const isVisible = element => {
      if (!visibility.has(element)) {
        visibility.set(element, element.checkVisibility
          ? element.checkVisibility({ visibilityProperty: true, opacityProperty: true })
          : true);
      }
      return visibility.get(element);
    };
    const range = doc.createRange();
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let node = walker.currentNode; node && words < MAX_WORDS; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.localName === "iframe" || node.localName === "frame") {
          let inner = null;
          try {
            inner = node.contentDocument;
          } catch {}
          if (inner?.body) {
            const rect = node.getBoundingClientRect();
            const x = offsetX + rect.left + node.clientLeft;
            const y = offsetY + rect.top + node.clientTop;
            // Lo que cabe en la caja del iframe (y en la de su marco padre):
            // su propio scroll no se recorre.
            const box = { left: x, top: y, right: x + node.clientWidth, bottom: y + node.clientHeight };
            const inside = clip === crop ? box : {
              left: Math.max(clip.left, box.left), top: Math.max(clip.top, box.top),
              right: Math.min(clip.right, box.right), bottom: Math.min(clip.bottom, box.bottom)
            };
            flush();
            walk(inner, inner.body, x, y, inside);
          }
        }
        continue;
      }
      const parent = node.parentElement;
      if (!parent || SKIP.has(parent.tagName) || !/\S/.test(node.data)) continue;
      // Nodos enteros fuera de la zona capturada: no se miden palabra a palabra.
      range.selectNodeContents(node);
      const nodeBox = range.getBoundingClientRect();
      if (offsetY + nodeBox.bottom <= crop.top || offsetY + nodeBox.top >= crop.bottom) continue;
      if (!isVisible(parent)) continue;
      for (const match of node.data.matchAll(/\S+/g)) {
        if (++words > MAX_WORDS) break;
        range.setStart(node, match.index);
        range.setEnd(node, match.index + match[0].length);
        const rect = Array.from(range.getClientRects()).find(box => box.width > 0 && box.height > 0);
        if (!rect) continue;
        const left = offsetX + rect.left;
        const top = offsetY + rect.top;
        const right = offsetX + rect.right;
        const bottom = offsetY + rect.bottom;
        // Fuera del marco que lo contiene o a los lados del área capturada.
        if (right <= clip.left || left >= clip.right || right <= crop.left || left >= crop.right) continue;
        if (clip !== crop && (bottom <= clip.top || top >= clip.bottom)) continue;
        // Cada palabra va con la captura en la que se ve (por su centro).
        const middle = (top + bottom) / 2;
        if (middle < crop.top || middle >= crop.bottom) continue;
        const height = bottom - top;
        const sameLine = run && Math.abs(top - run.top) < height * 0.5 && left >= run.right - 2 && left - run.right < height * 3;
        if (!sameLine) {
          flush();
          run = { text: match[0], left, top, right, bottom };
          continue;
        }
        // Espacio solo si hay hueco: «palabra<b>junta</b>» sigue pegada.
        run.text += (left - run.right > height * 0.12 ? " " : "") + match[0];
        run.right = right;
        run.top = Math.min(run.top, top);
        run.bottom = Math.max(run.bottom, bottom);
      }
    }
    flush();
  };

  let doc = document;
  let offsetX = 0;
  let offsetY = 0;
  for (const index of framePath) {
    const frame = doc.querySelectorAll("iframe, frame")[index];
    let next = null;
    try {
      next = frame?.contentDocument;
    } catch {}
    if (!next) return [];
    const rect = frame.getBoundingClientRect();
    offsetX += rect.left + frame.clientLeft;
    offsetY += rect.top + frame.clientTop;
    doc = next;
  }
  const root = isDocument ? doc.body : doc.querySelector(selector);
  if (!root) return [];
  walk(doc, root, offsetX, offsetY, crop);
  return runs;
}

async function collectText(tabId, metrics, scrollY) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectTextInTab,
      args: [metrics.framePath, metrics.selector, metrics.isDocument, {
        left: metrics.cropLeft,
        top: metrics.cropTop,
        right: metrics.cropLeft + metrics.viewportWidth,
        bottom: metrics.cropTop + metrics.viewportHeight
      }, scrollY]
    });
    return Array.isArray(result?.result) ? result.result : [];
  } catch {
    // Sin texto el PDF sigue siendo válido: solo no se podrá seleccionar.
    return [];
  }
}

function delay(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

// Se inyecta en la página. Cuenta lo que sigue cargando en la zona que se va
// a capturar: spinners, barras de progreso, esqueletos de carga y elementos
// marcados como ocupados, e imágenes visibles sin terminar de descargar.
// Devuelve también cuánto tiempo lleva la página sin cambiar (sin nodos ni
// textos nuevos), con un MutationObserver que se instala la primera vez.
function pendingLoadsInTab(framePath, crop) {
  const LOADERS = "[aria-busy=true], [role=progressbar], progress, [class*=spinner i], [class*=loader i], [class*=loading i], [class*=skeleton i], [class*=shimmer i], [id*=spinner i], [id*=loader i], [id*=loading i]";
  let pending = 0;
  if (!window.fpsChanges) {
    window.fpsChanges = { last: Date.now(), docs: new WeakSet() };
  }
  const watch = doc => {
    if (window.fpsChanges.docs.has(doc)) return;
    window.fpsChanges.docs.add(doc);
    new MutationObserver(() => {
      window.fpsChanges.last = Date.now();
    }).observe(doc.documentElement, { childList: true, subtree: true, characterData: true });
  };
  const check = (doc, offsetX, offsetY) => {
    watch(doc);
    const inView = element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4
        && offsetX + rect.left < crop.right && offsetX + rect.right > crop.left
        && offsetY + rect.top < crop.bottom && offsetY + rect.bottom > crop.top;
    };
    const shown = element => !element.checkVisibility || element.checkVisibility({ visibilityProperty: true, opacityProperty: true });
    for (const element of doc.querySelectorAll(LOADERS)) {
      // Un contenedor grande con «loading» en la clase suele ser la página
      // entera (body.loading…), no un indicador.
      const rect = element.getBoundingClientRect();
      if (rect.width * rect.height > (crop.right - crop.left) * (crop.bottom - crop.top) * 0.6) continue;
      if (inView(element) && shown(element)) pending++;
    }
    for (const image of doc.images) {
      if (!image.complete && image.getAttribute("src") && inView(image) && shown(image)) pending++;
    }
  };
  let doc = document;
  let offsetX = 0;
  let offsetY = 0;
  check(doc, 0, 0);
  for (const index of framePath) {
    const frame = doc.querySelectorAll("iframe, frame")[index];
    try {
      doc = frame?.contentDocument;
    } catch {
      doc = null;
    }
    if (!doc) break;
    const rect = frame.getBoundingClientRect();
    offsetX += rect.left + frame.clientLeft;
    offsetY += rect.top + frame.clientTop;
    check(doc, offsetX, offsetY);
  }
  return { pending, quietFor: Date.now() - window.fpsChanges.last };
}

// Espera a que la zona visible termine de cargar, como mucho SPEED.maxWaitMs.
// Devuelve true si ha tenido que esperar.
// Devuelve { waited, pending }: pending indica que al acabar la espera aún
// quedaba algo cargando (esa captura se repasa al final). Con maxMs = 0 solo
// mira una vez, sin esperar.
async function waitForPageToLoad(tabId, metrics, maxMs = SPEED.maxWaitMs, quietMs = SPEED.quietMs) {
  const crop = {
    left: metrics.cropLeft,
    top: metrics.cropTop,
    right: metrics.cropLeft + metrics.viewportWidth,
    bottom: metrics.cropTop + metrics.viewportHeight
  };
  const started = Date.now();
  let waited = false;
  while (true) {
    let state;
    try {
      const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: pendingLoadsInTab, args: [metrics.framePath, crop] });
      state = result?.result;
    } catch {
      return { waited, pending: false };
    }
    if (!state || (!state.pending && state.quietFor >= quietMs)) return { waited, pending: false };
    if (Date.now() - started >= maxMs) return { waited, pending: state.pending > 0 };
    if (!waited) setStatus(t("status.waitingLoad"));
    waited = true;
    await delay(200);
  }
}

// Repaso: cuánto se espera, como mínimo, a cada captura que no terminó de cargar.
const REPAIR_WAIT_MS = 10_000;

async function captureFullPage(tab, maxCaptures = MAX_CAPTURES) {
  const metrics = await readPageMetrics(tab.id);
  const viewHeight = metrics.isDocument ? metrics.viewportHeight : metrics.clientHeight;
  let documentHeight = metrics.documentHeight;
  let position = 0;
  let lastPosition = -1;
  let stalledPasses = 0;
  let lastShot = 0;
  const captures = [];
  let truncated = false;
  let repaired = 0;
  const textByCapture = [];

  try {
    while (true) {
      // Listas infinitas (feeds, bandejas de correo): se entrega lo capturado.
      if (captures.length >= maxCaptures) {
        truncated = true;
        break;
      }
      // Scroll y altura actual en la misma llamada.
      const target = Math.min(position, Math.max(0, documentHeight - viewHeight));
      let { y: scrollY, height } = await scrollPage(tab.id, metrics, target);
      setStatus(t("status.capturing", { n: captures.length + 1 }));
      // Pausa mínima para que se pinte (según la velocidad elegida) y, si hay
      // spinners o imágenes cargando, espera a que terminen.
      await delay(SPEED.settleMs);
      const loading = await waitForPageToLoad(tab.id, metrics);
      if (loading.waited) {
        // Lo que ha cargado puede haber movido la página: se vuelve a colocar.
        ({ y: scrollY, height } = await scrollPage(tab.id, metrics, target));
        setStatus(t("status.capturing", { n: captures.length + 1 }));
      }
      documentHeight = Math.max(documentHeight, height);
      // Límite de Chrome: dos capturas por segundo.
      await delay(Math.max(0, CAPTURE_INTERVAL_MS - (Date.now() - lastShot)));
      const screenshotUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 95 });
      lastShot = Date.now();
      if (!screenshotUrl?.startsWith("data:image/")) {
        throw new Error(t("err.noScreenshot"));
      }
      captures.push({ dataUrl: await cropCapture(screenshotUrl, metrics, metrics.layoutViewportWidth), scrollY, pending: loading.pending });
      // El texto de esta captura, tal y como sale en la imagen.
      textByCapture.push(await collectText(tab.id, metrics, scrollY));
      // Las barras fijas salen solo en la primera captura.
      if (captures.length === 1) await setOverlaysHidden(tab.id, metrics, true);

      stalledPasses = scrollY === lastPosition ? stalledPasses + 1 : 0;
      if (stalledPasses >= 2) throw new Error(t("err.stalled"));
      lastPosition = scrollY;

      if (scrollY >= documentHeight - viewHeight - 2) {
        // Al final: una sola comprobación por si llega más contenido.
        await delay(SPEED.endWaitMs);
        const check = await scrollPage(tab.id, metrics, scrollY);
        if (check.height <= documentHeight + 2) break;
        documentHeight = check.height;
      }
      position = scrollY + metrics.viewportHeight * SCROLL_STEP;
    }

    // Repaso automático: las capturas que se hicieron con algo todavía
    // cargando (spinners, imágenes) se repiten al final con más tiempo. Si
    // sigue sin cargar, se queda la que había.
    const unfinished = captures.map((capture, index) => (capture.pending ? index : -1)).filter(index => index >= 0);
    for (const [number, index] of unfinished.entries()) {
      setStatus(t("status.repairing", { n: number + 1, total: unfinished.length }));
      const capture = captures[index];
      await scrollPage(tab.id, metrics, capture.scrollY);
      await delay(Math.max(SPEED.settleMs, 600));
      const loading = await waitForPageToLoad(tab.id, metrics, Math.max(SPEED.maxWaitMs, REPAIR_WAIT_MS), Math.max(SPEED.quietMs, 500));
      if (loading.pending) continue;
      const { y } = await scrollPage(tab.id, metrics, capture.scrollY);
      if (Math.abs(y - capture.scrollY) > 1) continue;
      await delay(Math.max(SPEED.settleMs, CAPTURE_INTERVAL_MS - (Date.now() - lastShot)));
      const screenshotUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 95 });
      lastShot = Date.now();
      if (!screenshotUrl?.startsWith("data:image/")) continue;
      captures[index] = { dataUrl: await cropCapture(screenshotUrl, metrics, metrics.layoutViewportWidth), scrollY: y, pending: false };
      textByCapture[index] = await collectText(tab.id, metrics, y);
      repaired++;
    }
  } finally {
    await setOverlaysHidden(tab.id, metrics, false);
    await scrollPage(tab.id, metrics, metrics.scrollY);
  }

  // Donde dos capturas se solapan, en el PDF queda la imagen de la siguiente:
  // el texto de esa franja se toma también de la siguiente.
  const text = textByCapture.flatMap((runs, index) => {
    const nextStart = captures[index + 1]?.scrollY;
    return nextStart === undefined ? runs : runs.filter(([, , y, , h]) => y + h / 2 < nextStart);
  });

  return {
    captures,
    truncated,
    repaired,
    text,
    title: metrics.title,
    viewportWidth: metrics.viewportWidth,
    documentHeight,
    layoutViewportWidth: metrics.layoutViewportWidth
  };
}

async function cropCapture(screenshotUrl, metrics, layoutViewportWidth) {
  const image = await loadCapture(screenshotUrl);
  const scale = image.naturalWidth / layoutViewportWidth;
  const left = Math.max(0, Math.round(metrics.cropLeft * scale));
  const top = Math.max(0, Math.round(metrics.cropTop * scale));
  const width = Math.min(
    image.naturalWidth - left,
    Math.round(metrics.viewportWidth * scale)
  );
  const height = Math.min(
    image.naturalHeight - top,
    Math.round(metrics.viewportHeight * scale)
  );
  if (!width || !height) {
    throw new Error(t("err.notVisible"));
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error(t("err.crop"));
  }
  context.drawImage(image, left, top, width, height, 0, 0, width, height);
  // Sin pérdida: el JPEG se aplica una sola vez al componer cada hoja; si se
  // comprime también aquí se notan las uniones entre capturas.
  return canvas.toDataURL("image/png");
}

async function loadCapture(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t("err.readCapture")));
    image.src = dataUrl;
  });
}

// Tamaño y calidad del PDF elegidos en la vista previa: calidad del JPEG y
// ancho máximo de cada hoja en píxeles.
const PDF_QUALITIES = {
  light: { jpeg: 0.62, maxWidth: 1100 },
  normal: { jpeg: 0.86, maxWidth: Infinity },
  max: { jpeg: 0.95, maxWidth: Infinity }
};
const pdfQuality = () => PDF_QUALITIES[storedQuality()] || PDF_QUALITIES.normal;

function canvasToJpegBytes(canvas, quality = pdfQuality().jpeg) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) {
        reject(new Error(t("err.compress")));
        return;
      }
      try {
        resolve(new Uint8Array(await blob.arrayBuffer()));
      } catch (error) {
        reject(error);
      }
    }, "image/jpeg", quality);
  });
}

// Devuelve { bytes, width, height }: con «Ligero» la hoja se reduce.
async function makePdfPage(captures, pageStart, pageHeight, documentHeight) {
  const width = captures[0].image.naturalWidth;
  const scale = Math.min(1, pdfQuality().maxWidth / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.max(1, Math.round(pageHeight * scale));
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    throw new Error(t("err.pdfPage"));
  }
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const pageEnd = Math.min(pageStart + pageHeight, documentHeight);
  for (const capture of captures) {
    const captureStart = Math.round(capture.scrollY * capture.scale);
    const captureEnd = captureStart + capture.image.naturalHeight;
    const overlapStart = Math.max(pageStart, captureStart);
    const overlapEnd = Math.min(pageEnd, captureEnd);
    if (overlapEnd <= overlapStart) continue;

    const sourceY = overlapStart - captureStart;
    const destinationY = overlapStart - pageStart;
    const segmentHeight = overlapEnd - overlapStart;
    context.drawImage(
      capture.image,
      0,
      sourceY,
      width,
      segmentHeight,
      0,
      destinationY * scale,
      canvas.width,
      segmentHeight * scale
    );
  }

  return { bytes: await canvasToJpegBytes(canvas), width: canvas.width, height: canvas.height };
}

// ---------- Visores de páginas (PDF.js y similares) ----------

// Se inyecta en la página. Busca las páginas del visor dentro del área
// desplazable elegida. Con pageIndex = -1 solo las cuenta; si no, lleva esa
// página a la vista, espera a que se pinte y devuelve su canvas como JPEG.
async function viewerPageInTab(selector, framePath, pageIndex, timing) {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let doc = document;
  for (const index of framePath) {
    let next = null;
    try {
      next = doc.querySelectorAll("iframe, frame")[index]?.contentDocument;
    } catch {}
    if (!next) return null;
    doc = next;
  }
  const container = selector ? doc.querySelector(selector) : doc.body;
  if (!container) return null;
  const pages = Array.from(container.querySelectorAll("[data-page-number]")).filter(page =>
    !page.closest(".thumbnail, #thumbnailView, #sidebarContainer")
    && !page.parentElement?.closest("[data-page-number]")
    && (page.classList.contains("page") || page.querySelector("canvas")));
  if (pageIndex < 0) return { count: pages.length };

  const page = pages[pageIndex];
  if (!page) return null;
  const ready = () => {
    const candidate = page.querySelector(".canvasWrapper canvas") || page.querySelector("canvas");
    const loaded = !page.classList.contains("page") || page.getAttribute("data-loaded") === "true";
    return candidate?.width && candidate.height && loaded ? candidate : null;
  };
  // Si ya está pintada no hace falta moverse; si no, se lleva a la vista y se
  // comprueba cada 40 ms hasta que el visor termina de pintarla.
  let canvas = ready();
  if (!canvas) {
    page.scrollIntoView({ block: "start" });
    for (const deadline = Date.now() + timing.maxMs; !canvas && Date.now() < deadline;) {
      await sleep(40);
      canvas = ready();
    }
  }
  if (!canvas) return { error: "not-painted" };

  // Algunos visores crean el canvas antes de dibujar en él: si sale en blanco,
  // se espera (según la velocidad) a que aparezca el contenido.
  const isBlank = source => {
    try {
      const sample = doc.createElement("canvas");
      sample.width = 64;
      sample.height = 64;
      const context = sample.getContext("2d", { willReadFrequently: true });
      context.drawImage(source, 0, 0, 64, 64);
      const data = context.getImageData(0, 0, 64, 64).data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 10 && (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240)) return false;
      }
      return true;
    } catch {
      return false;
    }
  };
  if (timing.blankMs && isBlank(canvas)) {
    page.scrollIntoView({ block: "start" });
    for (const deadline = Date.now() + timing.blankMs; Date.now() < deadline;) {
      await sleep(100);
      canvas = ready() || canvas;
      if (!isBlank(canvas)) break;
    }
  }
  if (timing.extraMs) {
    await sleep(timing.extraMs);
    canvas = ready() || canvas;
  }

  // Capa de texto de PDF.js (si la hay): posición de cada trozo relativa a la
  // página, para que el texto se pueda seleccionar también en la copia.
  const textLayer = page.querySelector(".textLayer");
  if (textLayer && !textLayer.querySelector("span")) {
    for (const deadline = Date.now() + 1500; !textLayer.querySelector("span") && Date.now() < deadline;) await sleep(40);
  }
  const pageBox = canvas.getBoundingClientRect();
  const text = [];
  if (textLayer && pageBox.width && pageBox.height) {
    for (const span of textLayer.querySelectorAll("span")) {
      if (span.querySelector("span") || !/\S/.test(span.textContent)) continue;
      const box = span.getBoundingClientRect();
      if (!box.width || !box.height) continue;
      text.push([span.textContent.replace(/\s+/g, " ").trim(),
        (box.left - pageBox.left) / pageBox.width, (box.top - pageBox.top) / pageBox.height,
        box.width / pageBox.width, box.height / pageBox.height]);
    }
  }

  // PDF.js deja el tamaño original de la página (en puntos) en su estilo:
  // "width: round(down, var(--total-scale-factor) * 595.27557px, ...)".
  const sizes = Array.from((page.getAttribute("style") || "").matchAll(/\*\s*([\d.]+)px/g), match => Number(match[1]));
  // Fondo blanco por si el canvas tiene zonas transparentes.
  const flat = doc.createElement("canvas");
  flat.width = canvas.width;
  flat.height = canvas.height;
  const context = flat.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, flat.width, flat.height);
  try {
    context.drawImage(canvas, 0, 0);
    return {
      dataUrl: flat.toDataURL("image/jpeg", 0.95),
      blank: isBlank(canvas),
      width: canvas.width,
      height: canvas.height,
      widthPt: sizes.length >= 2 ? sizes[0] : null,
      heightPt: sizes.length >= 2 ? sizes[1] : null,
      text
    };
  } catch {
    return { error: "tainted" };
  }
}

// Códigos de error que devuelve viewerPageInTab (se ejecuta en la página y no
// tiene acceso a las traducciones).
const VIEWER_ERRORS = { "not-painted": "err.viewerNotPainted", tainted: "err.viewerTainted" };

const VIEWER_TIMING = { maxMs: SPEED.viewerMaxMs, blankMs: SPEED.viewerBlankMs, extraMs: SPEED.viewerExtraMs };
// Para el repaso de las páginas que salieron en blanco: más tiempo.
const VIEWER_REPAIR_TIMING = {
  maxMs: SPEED.viewerMaxMs,
  blankMs: Math.max(SPEED.viewerBlankMs, REPAIR_WAIT_MS),
  extraMs: Math.max(SPEED.viewerExtraMs, 500)
};

async function runViewerPage(tabId, metrics, pageIndex, timing = VIEWER_TIMING) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: viewerPageInTab,
    args: [metrics.selector, metrics.framePath, pageIndex, timing]
  });
  return result?.result;
}

// Si el área desplazable es un visor de páginas, cada página del PDF se saca
// de su propio canvas: misma nitidez que en pantalla, sin uniones ni barras.
async function captureViewerPages(tab) {
  const metrics = await readPageMetrics(tab.id);
  const info = await runViewerPage(tab.id, metrics, -1);
  if (!info?.count) return null;

  const pages = [];
  try {
    for (let index = 0; index < info.count; index++) {
      setStatus(t("status.viewerCopying", { n: index + 1, total: info.count }));
      const page = await runViewerPage(tab.id, metrics, index);
      if (!page?.dataUrl) {
        throw new Error(t("err.viewerPage", { n: index + 1, reason: t(VIEWER_ERRORS[page?.error] || "err.viewerUnreadable") }));
      }
      pages.push(page);
    }
    // Repaso automático: las páginas que salieron en blanco se vuelven a
    // copiar dándoles más tiempo. Si siguen en blanco (página vacía de
    // verdad), se quedan así.
    const blank = pages.map((page, index) => (page.blank ? index : -1)).filter(index => index >= 0);
    for (const [number, index] of blank.entries()) {
      setStatus(t("status.repairing", { n: number + 1, total: blank.length }));
      const page = await runViewerPage(tab.id, metrics, index, VIEWER_REPAIR_TIMING);
      if (page?.dataUrl && !page.blank) pages[index] = page;
    }
  } finally {
    await scrollPage(tab.id, metrics, metrics.scrollY);
  }
  return { pages, title: metrics.title };
}


// Imagen de una página del visor con la calidad elegida: con «Ligero» se
// reduce y se comprime más; si no, se usa tal cual.
async function viewerPageImage(page) {
  const quality = pdfQuality();
  if (quality.maxWidth === Infinity) return { bytes: dataUrlToBytes(page.dataUrl), width: page.width, height: page.height };
  const image = await loadCapture(page.dataUrl);
  const scale = Math.min(1, quality.maxWidth / image.naturalWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
  return { bytes: await canvasToJpegBytes(canvas, quality.jpeg), width: canvas.width, height: canvas.height };
}

// Hojas del PDF a partir de las páginas de un visor, a su tamaño original.
async function viewerPdfPages(pages) {
  const [paperWidthMm] = PAPER_SIZES[PAPER] || PAPER_SIZES.A4;
  const paperWidthPt = paperWidthMm * 72 / 25.4;
  return Promise.all(pages.map(async page => {
    const pageWidthPt = page.widthPt || paperWidthPt;
    const pageHeightPt = page.heightPt || pageWidthPt * page.height / page.width;
    const image = await viewerPageImage(page);
    return {
      width: image.width,
      height: image.height,
      bytes: image.bytes,
      pageWidthPt,
      pageHeightPt,
      text: (page.text || []).map(([text, x, y, w, h]) => ({
        text, x: x * pageWidthPt, top: y * pageHeightPt, w: w * pageWidthPt, h: h * pageHeightPt
      }))
    };
  }));
}

async function createViewerPdf(pages) {
  const [paperWidthMm] = PAPER_SIZES[PAPER] || PAPER_SIZES.A4;
  return createPdfBlob(await viewerPdfPages(pages), paperWidthMm, paperWidthMm);
}

// Hojas del PDF a partir de las capturas, cada una con su tamaño en puntos y
// su capa de texto (por eso se pueden unir hojas de varias pestañas).
async function composePdfPages(captureResult, orientation) {
  if (!captureResult.captures.length) {
    throw new Error(t("err.noCaptures"));
  }

  setStatus(t("status.preparingCaptures"));
  const captures = [];
  for (const capture of captureResult.captures) {
    const image = await loadCapture(capture.dataUrl);
    captures.push({
      ...capture,
      image,
      scale: image.naturalWidth / captureResult.viewportWidth
    });
  }

  const paper = PAPER;
  const [shortSide, longSide] = PAPER_SIZES[paper] || PAPER_SIZES.A4;
  const pageWidthMm = orientation === "landscape" ? longSide : shortSide;
  const pageHeightMm = orientation === "landscape" ? shortSide : longSide;
  const pixelsPerCssPixel = captures[0].scale;
  const pageHeightPx = Math.ceil(
    captures[0].image.naturalWidth * pageHeightMm / pageWidthMm
  );
  const documentHeightPx = Math.ceil(
    captureResult.documentHeight * pixelsPerCssPixel
  );
  const pageCount = Math.max(1, Math.ceil(documentHeightPx / pageHeightPx));
  const pageWidthPt = pageWidthMm * 72 / 25.4;
  const pageHeightPt = pageHeightMm * 72 / 25.4;
  const ptPerCss = pageWidthPt / captureResult.viewportWidth;
  const pageHeightCss = pageHeightPx / pixelsPerCssPixel;

  // Cada línea va a la hoja en la que cae su centro.
  const textByPage = Array.from({ length: pageCount }, () => []);
  for (const [text, x, y, w, h] of captureResult.text || []) {
    const index = Math.floor((y + h / 2) / pageHeightCss);
    if (index < 0 || index >= pageCount) continue;
    textByPage[index].push({ text, x: x * ptPerCss, top: (y - index * pageHeightCss) * ptPerCss, w: w * ptPerCss, h: h * ptPerCss });
  }

  const jpegPages = [];
  for (let index = 0; index < pageCount; index++) {
    setStatus(t("status.composing", { n: index + 1, total: pageCount }));
    const pageRasterHeight = Math.min(
      pageHeightPx,
      documentHeightPx - index * pageHeightPx
    );
    const width = captures[0].image.naturalWidth;
    const sheet = await makePdfPage(captures, index * pageHeightPx, pageRasterHeight, documentHeightPx);
    jpegPages.push({
      width: sheet.width,
      height: sheet.height,
      bytes: sheet.bytes,
      pageWidthPt,
      pageHeightPt,
      imageHeightPt: pageWidthPt * pageRasterHeight / width,
      text: textByPage[index]
    });
  }
  return { pages: jpegPages, pageWidthMm, pageHeightMm };
}

// Portada de la vista previa: hoja del mismo tamaño de papel.
function coverPdfPage(cover, pageWidthMm, pageHeightMm) {
  return {
    width: cover.width,
    height: cover.height,
    bytes: dataUrlToBytes(cover.dataUrl),
    pageWidthPt: pageWidthMm * 72 / 25.4,
    pageHeightPt: pageHeightMm * 72 / 25.4
  };
}

async function createPdf(captureResult, orientation, cover = null) {
  const { pages, pageWidthMm, pageHeightMm } = await composePdfPages(captureResult, orientation);
  if (cover) pages.unshift(coverPdfPage(cover, pageWidthMm, pageHeightMm));
  return createPdfBlob(pages, pageWidthMm, pageHeightMm);
}

// ---------- Detección del tipo de página ----------

// Se inyecta en la página. Distingue una web normal de una «aplicación»
// (Gmail, Drive, Outlook, Slack…): muchas ventanas y paneles con scroll
// propio, listas infinitas o virtualizadas y botones que abren menús. En
// esas páginas no se pulsa nada y solo se recorre el panel principal.
function detectPageInTab() {
  const KNOWN_APPS = [
    [/^mail\.google\.com$/, "Gmail"],
    [/^drive\.google\.com$/, "Google Drive"],
    [/^docs\.google\.com$/, "Google Docs"],
    [/^(calendar|meet|chat|keep|photos|contacts)\.google\.com$/, "Google"],
    [/^outlook\.(live|office|office365)\.com$/, "Outlook"],
    [/^teams\.(microsoft|live)\.com$/, "Microsoft Teams"],
    [/(^|\.)onedrive\.live\.com$|(^|\.)sharepoint\.com$/, "OneDrive"],
    [/(^|\.)slack\.com$/, "Slack"],
    [/^web\.whatsapp\.com$/, "WhatsApp"],
    [/^web\.telegram\.org$/, "Telegram"],
    [/^discord\.com$/, "Discord"],
    [/(^|\.)notion\.(so|site)$/, "Notion"],
    [/^trello\.com$/, "Trello"],
    [/(^|\.)figma\.com$/, "Figma"],
    [/^app\.asana\.com$/, "Asana"],
    [/(^|\.)atlassian\.net$/, "Atlassian"],
    [/^(www\.)?(x|twitter|facebook|instagram|linkedin|tiktok)\.com$/, "red social"]
  ];
  const host = location.hostname.toLowerCase();
  const known = KNOWN_APPS.find(([pattern]) => pattern.test(host));

  const visible = element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0
      && rect.top < innerHeight && rect.left < innerWidth;
  };
  const root = document.scrollingElement || document.documentElement;
  const rootScrolls = root.scrollHeight > innerHeight + 60;
  let panes = 0;
  for (const element of document.querySelectorAll("body *")) {
    if (element.clientHeight < 150 || element.clientWidth < 150) continue;
    if (element.scrollHeight <= element.clientHeight + 40) continue;
    if (!/auto|scroll|overlay/.test(getComputedStyle(element).overflowY)) continue;
    if (visible(element)) panes++;
  }
  const frames = Array.from(document.querySelectorAll("iframe")).filter(frame => {
    const rect = frame.getBoundingClientRect();
    return rect.width > 120 && rect.height > 120 && visible(frame);
  }).length;
  const shell = !rootScrolls && panes >= 2;
  const app = Boolean(known) || shell || frames >= 3;
  return {
    app,
    name: known ? known[1] : (location.hostname || document.title || "web"),
    reason: known ? "known" : shell ? "panes" : frames >= 3 ? "frames" : "normal",
    panes,
    frames
  };
}

async function detectPage(tabId) {
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: detectPageInTab });
    return result?.result || { app: false };
  } catch {
    return { app: false };
  }
}

// ---------- Preparación: abrir menús y recorrer hasta el final ----------

// Se inyecta en la página. Abre desplegables/acordeones y baja hasta el final
// para forzar la carga diferida; después vuelve arriba. En modo aplicación no
// pulsa nada y solo recorre el panel principal, con un límite corto.
// timing: pausas según la velocidad elegida (stepMs en cada pantalla, endMs al
// llegar al final, maxMs en total y como mucho screens pantallas por panel).
async function preparePageInTab(appMode, timing) {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clicked = new WeakSet();
  const deadline = Date.now() + (appMode ? Math.min(timing.maxMs, 8_000 + timing.stepMs * 10) : timing.maxMs);
  const MAX_CLICKS = 60;
  const MAX_SCREENS = appMode ? 10 : timing.screens;
  let clicks = 0;

  // Zonas donde un clic abre menús, ventanas o cambia de vista: nunca se tocan.
  const RISKY = [
    "nav", "header", "footer", "[role=navigation]", "[role=banner]", "[role=menubar]", "[role=menu]",
    "[role=menuitem]", "[role=toolbar]", "[role=tablist]", "[role=tab]", "[role=tree]", "[role=dialog]",
    "[role=alertdialog]", "[role=listbox]", "[role=combobox]", "[role=grid]", "[aria-modal=true]"
  ].join(",");

  const isVisible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";

  const expand = () => {
    let opened = 0;
    document.querySelectorAll("details:not([open])").forEach(element => {
      element.open = true;
      opened++;
    });
    if (appMode) return opened;
    document.querySelectorAll(".collapse:not(.show)").forEach(element => {
      if (element.closest(RISKY)) return;
      element.classList.add("show");
      opened++;
    });
    for (const element of document.querySelectorAll('[aria-expanded="false"]')) {
      if (clicks >= MAX_CLICKS) break;
      if (clicked.has(element) || !isVisible(element)) continue;
      if (element.matches("select, input, textarea")) continue;
      // Abre un menú o una ventana emergente, no un acordeón.
      const popup = element.getAttribute("aria-haspopup");
      if (popup && popup !== "false") continue;
      if (element.closest(RISKY)) continue;
      const link = element.closest("a[href]");
      if (link && !/^(#|javascript:)/i.test(link.getAttribute("href") || "")) continue;
      if (element.closest("form") && element.matches("button[type=submit], button:not([type])") && !element.hasAttribute("aria-controls")) continue;
      clicked.add(element);
      clicks++;
      try {
        element.click();
        opened++;
      } catch {}
    }
    return opened;
  };

  // Áreas con scroll de la página y de sus iframes del mismo origen. Los
  // visores de páginas (PDF.js) se saltan: se recorren página a página al
  // copiarlos, que es mucho más rápido.
  const scrollTargets = () => {
    const targets = [];
    const visit = doc => {
      const view = doc.defaultView;
      const root = doc.scrollingElement || doc.documentElement;
      if (root.scrollHeight > view.innerHeight + 8) targets.push({ element: root, view, isRoot: true, area: view.innerWidth * view.innerHeight });
      for (const element of doc.querySelectorAll("body *")) {
        if (element.localName === "iframe" || element.localName === "frame") {
          let frameDoc = null;
          try {
            frameDoc = element.contentDocument;
          } catch {}
          if (frameDoc?.documentElement && element.getClientRects().length) visit(frameDoc);
          continue;
        }
        if (element.clientHeight <= 100 || element.scrollHeight <= element.clientHeight + 8) continue;
        if (!/auto|scroll|overlay/.test(view.getComputedStyle(element).overflowY)) continue;
        if (!element.getClientRects().length) continue;
        if (element.querySelector("[data-page-number] canvas, .page[data-page-number]")) continue;
        targets.push({ element, view, isRoot: false, area: element.clientWidth * element.clientHeight });
      }
    };
    visit(document);
    // En modo aplicación solo el panel más grande (la lista o el contenido).
    if (appMode) return targets.sort((a, b) => b.area - a.area).slice(0, 1);
    return targets;
  };

  // Baja a saltos de casi una pantalla (así todo pasa por la vista y se
  // dispara la carga diferida) y al final espera un momento por si llega
  // más contenido. Con un tope de pantallas para listas infinitas.
  const scrollToEnd = async ({ element, view, isRoot }) => {
    const viewHeight = () => (isRoot ? view.innerHeight : element.clientHeight);
    let lastHeight = element.scrollHeight;
    let calm = 0;
    let screens = 0;
    while (Date.now() < deadline && screens < MAX_SCREENS) {
      const max = element.scrollHeight - viewHeight();
      if (element.scrollTop >= max - 2) {
        await sleep(timing.endMs);
        if (element.scrollHeight === lastHeight) {
          if (++calm >= 2) break;
        } else {
          calm = 0;
          lastHeight = element.scrollHeight;
        }
        continue;
      }
      element.scrollTop = Math.min(element.scrollTop + viewHeight() * 0.9, max);
      screens++;
      await sleep(timing.stepMs);
      lastHeight = element.scrollHeight;
    }
    element.scrollTop = 0;
  };

  expand();
  await sleep(120);
  for (const target of scrollTargets()) await scrollToEnd(target);
  // Segunda vuelta solo si al recorrer aparecieron menús nuevos.
  if (!appMode && expand()) {
    await sleep(150);
    for (const target of scrollTargets()) await scrollToEnd(target);
  }
  window.scrollTo(0, 0);
  await sleep(80);
  return true;
}

async function preparePage(tabId, page) {
  setStatus(page?.app ? t("status.appMode", { name: page.name }) : t("status.preparing"));
  await chrome.scripting.executeScript({
    target: { tabId },
    func: preparePageInTab,
    args: [Boolean(page?.app), { stepMs: SPEED.prepareStepMs, endMs: SPEED.prepareEndMs, maxMs: SPEED.prepareMaxMs, screens: SPEED.prepareScreens }]
  });
}

// ---------- Análisis de secciones para la vista previa ----------

// Se inyecta en la página. Marca con atributos las partes (cabecera, menús,
// publicidad…) y las secciones del contenido (por sus títulos) para poder
// mostrarlas u ocultarlas en la vista previa y en el resultado.
//   data-fps-part="nav"     → parte de la página
//   data-fps-sec="s0 s3"    → secciones a las que pertenece (anidadas)
//   data-fps-head="s3"      → título de la sección (para el índice)
function analyzeSectionsInTab() {
  for (const element of document.querySelectorAll("[data-fps-sec], [data-fps-part], [data-fps-head], [data-fps-root], [data-fps-id]")) {
    element.removeAttribute("data-fps-sec");
    element.removeAttribute("data-fps-part");
    element.removeAttribute("data-fps-head");
    element.removeAttribute("data-fps-root");
    element.removeAttribute("data-fps-id");
  }
  const text = element => (element.innerText || element.textContent || "").replace(/\s+/g, " ").trim();
  const visible = element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
  const area = element => {
    const rect = element.getBoundingClientRect();
    return rect.width * rect.height;
  };
  const viewportArea = innerWidth * innerHeight;

  // Contenido principal: el <main>/<article> visible más grande, o el body.
  const root = Array.from(document.querySelectorAll("main, [role=main], article"))
    .filter(visible)
    .sort((a, b) => area(b) - area(a))[0] || document.body;
  // Para el modo lectura.
  if (root !== document.body) root.setAttribute("data-fps-root", "");
  // Cada elemento lleva un número que se conserva en la copia: así lo que se
  // marca en la vista previa (resaltar, quitar, notas) se encuentra después
  // en el HTML final y en la pestaña al capturar el PDF.
  Array.from(document.body?.querySelectorAll("*") || []).forEach((element, index) => element.setAttribute("data-fps-id", index));
  const insideArticle = element => Boolean(element.parentElement?.closest("article, main, [role=main]"));

  // ---------- Partes de la página ----------
  const counts = {};
  const markPart = (element, part) => {
    if (!element || element === document.body || element === document.documentElement) return;
    if (element.contains(root) || element.closest("[data-fps-part]") || !visible(element)) return;
    element.setAttribute("data-fps-part", part);
    counts[part] = (counts[part] || 0) + 1;
  };
  const each = (selector, part, filter = () => true) => {
    for (const element of document.querySelectorAll(selector)) {
      if (filter(element)) markPart(element, part);
    }
  };

  each("#onetrust-banner-sdk, #onetrust-consent-sdk, #CybotCookiebotDialog, .cc-window, .cky-consent-container, [aria-label*=cookie i], [id*=cookie i], [class*=cookie i], [id*=consent i], [class*=consent i], [id*=gdpr i], [class*=gdpr i]",
    "cookies", element => {
      if (text(element).length < 20 || insideArticle(element)) return false;
      const name = `${typeof element.className === "string" ? element.className : ""} ${element.id}`;
      let fixed = false;
      for (let node = element, depth = 0; node && depth < 4; node = node.parentElement, depth++) {
        if (/fixed|sticky/.test(getComputedStyle(node).position)) fixed = true;
      }
      // Que se comporte como un aviso, no una «cookie-card» de una receta.
      return fixed || element.matches("[role=dialog], [aria-modal=true]") || /banner|consent|notice|popup|modal|dialog|cmp|gdpr|onetrust|cookiebot/i.test(name);
    });
  const AD_TOKEN = /^(ad|ads|adv|advert|adverts|advertisement|adslot|ad-slot|ad-container|ad-wrapper|adunit|ad-unit|ad-banner|banner-ad|adsbygoogle|sponsored|sponsor)$/i;
  each("iframe[src*=doubleclick], iframe[src*=googlesyndication], iframe[src*=amazon-adsystem], iframe[id^=google_ads], ins.adsbygoogle, [id^=div-gpt-ad], [data-ad-slot], [data-adunit], [data-ad]", "ads");
  each("[class], [id]", "ads", element => {
    const tokens = `${typeof element.className === "string" ? element.className : ""} ${element.id}`.split(/\s+/);
    return tokens.some(token => AD_TOKEN.test(token));
  });
  each("header, [role=banner]", "header", element => !insideArticle(element));
  each("nav, [role=navigation]", "nav", element => !element.parentElement?.closest("article"));
  each("aside, [role=complementary]", "aside", element => !element.parentElement?.closest("article"));
  each("footer, [role=contentinfo]", "footer", element => !insideArticle(element));
  each("#comments, #disqus_thread, [id*=comments i], [class*=comments i], [class*=comment-list i]", "comments",
    element => text(element).length > 30 && area(element) > 2000);
  // Botones y ventanas flotantes (chat, «volver arriba», barras fijas).
  for (const element of document.querySelectorAll("body *")) {
    const position = getComputedStyle(element).position;
    if ((position === "fixed" || position === "sticky") && area(element) < viewportArea * 0.35) markPart(element, "floating");
  }
  each("video, audio, embed, object", "media");
  each("iframe", "media", frame => {
    try {
      return !frame.contentDocument;
    } catch {
      return true;
    }
  });
  const images = Array.from(root.querySelectorAll("img, picture")).filter(visible).length;

  // ---------- Secciones ----------
  const sections = [];
  const addToken = (element, id) => {
    element.setAttribute("data-fps-sec", `${element.getAttribute("data-fps-sec") || ""} ${id}`.trim());
  };
  const levelOf = heading => Number(heading.tagName[1]);
  const headingSelector = level => Array.from({ length: level }, (_, i) => `h${i + 1}`).join(",");
  // Un hermano cierra la sección si es (o contiene) un título del mismo nivel o superior.
  const closes = (node, level) => (/^H[1-6]$/.test(node.tagName) ? levelOf(node) <= level : Boolean(node.querySelector(headingSelector(level))));

  let headings = Array.from(root.querySelectorAll("h1, h2, h3"))
    .filter(heading => visible(heading) && text(heading) && !heading.closest("[data-fps-part]"));
  if (headings.length > 60) headings = headings.filter(heading => heading.tagName !== "H3");
  headings = headings.slice(0, 60);

  headings.forEach((heading, index) => {
    const id = `s${index}`;
    const level = levelOf(heading);
    heading.setAttribute("data-fps-head", id);
    const box = heading.closest("section, article");
    if (box && box !== root && !box.contains(root) && box.querySelector("h1, h2, h3, h4, h5, h6") === heading) {
      addToken(box, id);
    } else {
      // El título y sus hermanos siguientes hasta el próximo título de su nivel.
      let start = heading;
      while (start.parentElement && start.parentElement !== root && start.parentElement !== document.body
        && start.parentElement.children.length === 1) start = start.parentElement;
      for (let node = start; node; node = node.nextElementSibling) {
        if (node !== start && closes(node, level)) break;
        addToken(node, id);
      }
    }
    sections.push({ id, label: text(heading).slice(0, 100), level });
  });

  // Sin títulos: los bloques grandes del contenido principal.
  if (!sections.length) {
    let container = root;
    while (container.children.length === 1) container = container.children[0];
    Array.from(container.children)
      .filter(element => visible(element) && !element.closest("[data-fps-part]") && element.offsetHeight > 60 && text(element).length > 30)
      .slice(0, 40)
      .forEach((element, index) => {
        const id = `b${index}`;
        addToken(element, id);
        sections.push({ id, label: text(element).slice(0, 80), level: 2 });
      });
  }

  return { title: document.title, url: location.href, sections, parts: counts, images };
}

async function analyzeSections(tabId) {
  setStatus(t("status.analyzing"));
  try {
    const [result] = await chrome.scripting.executeScript({ target: { tabId }, func: analyzeSectionsInTab });
    return result?.result || { sections: [], parts: {}, images: 0 };
  } catch {
    return { sections: [], parts: {}, images: 0 };
  }
}

// Aplica en la pestaña el CSS de la selección (para la captura en PDF), o lo
// quita junto con las marcas al terminar. Recorre también los iframes del
// mismo origen.
async function applyChoicesInTab(tabId, css) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: cssText => {
      const visit = doc => {
        doc.getElementById("fps-choices")?.remove();
        if (cssText) {
          const style = doc.createElement("style");
          style.id = "fps-choices";
          style.textContent = cssText;
          (doc.head || doc.documentElement).append(style);
        }
        doc.querySelectorAll("iframe, frame").forEach(frame => {
          try {
            if (frame.contentDocument?.documentElement) visit(frame.contentDocument);
          } catch {}
        });
      };
      visit(document);
    },
    args: [css]
  }).catch(() => {});
}

// Resaltados y notas de la vista previa en la propia pestaña, para el PDF
// (lo quitado a mano ya va en el CSS de la selección).
async function applyAnnotationsInTab(tabId, annotations) {
  if (!annotations?.highlights.length && !annotations?.notes.length) return;
  await chrome.scripting.executeScript({ target: { tabId }, func: applyAnnotationsInDoc, args: [annotations] }).catch(() => {});
}

async function clearChoicesInTab(tabId) {
  await applyChoicesInTab(tabId, "");
  await chrome.scripting.executeScript({ target: { tabId }, func: clearAnnotationsInDoc }).catch(() => {});
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      for (const element of document.querySelectorAll("[data-fps-sec], [data-fps-part], [data-fps-head], [data-fps-root], [data-fps-id]")) {
        element.removeAttribute("data-fps-sec");
        element.removeAttribute("data-fps-part");
        element.removeAttribute("data-fps-head");
        element.removeAttribute("data-fps-root");
        element.removeAttribute("data-fps-id");
      }
    }
  }).catch(() => {});
}

// Modo lectura en PDF: mientras se captura, la pestaña muestra la versión de
// lectura en lugar de su contenido (con sus estilos desactivados). Después
// se devuelve todo tal cual estaba, sin recargar la página.
async function applyReaderInTab(tabId, html) {
  setStatus(t("status.reader"));
  await chrome.scripting.executeScript({
    target: { tabId },
    func: async readerHtml => {
      if (window.fpsReaderSaved) return;
      const parsed = new DOMParser().parseFromString(readerHtml, "text/html");
      const root = document.documentElement;
      const saved = {
        body: document.body,
        sheets: [],
        adopted: null,
        style: root.getAttribute("style"),
        className: root.getAttribute("class")
      };
      for (const sheet of document.styleSheets) {
        if (!sheet.disabled) {
          sheet.disabled = true;
          saved.sheets.push(sheet);
        }
      }
      try {
        saved.adopted = document.adoptedStyleSheets;
        document.adoptedStyleSheets = [];
      } catch {}
      root.removeAttribute("style");
      root.removeAttribute("class");
      const style = document.createElement("style");
      style.id = "fps-reader-style";
      style.textContent = parsed.querySelector("style")?.textContent || "";
      (document.head || root).append(style);
      const body = document.importNode(parsed.body, true);
      saved.body.replaceWith(body);
      window.fpsReaderSaved = saved;
      window.scrollTo(0, 0);
      // Las imágenes tienen que estar cargadas antes de capturar.
      const pending = Array.from(body.querySelectorAll("img"))
        .filter(image => !image.complete)
        .map(image => new Promise(resolve => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        }));
      await Promise.race([Promise.all(pending), new Promise(resolve => setTimeout(resolve, 5000))]);
    },
    args: [html]
  });
}

async function restoreReaderInTab(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const saved = window.fpsReaderSaved;
      if (!saved) return;
      document.body.replaceWith(saved.body);
      document.getElementById("fps-reader-style")?.remove();
      saved.sheets.forEach(sheet => {
        sheet.disabled = false;
      });
      try {
        if (saved.adopted) document.adoptedStyleSheets = saved.adopted;
      } catch {}
      const root = document.documentElement;
      if (saved.style !== null) root.setAttribute("style", saved.style);
      if (saved.className !== null) root.setAttribute("class", saved.className);
      delete window.fpsReaderSaved;
    }
  }).catch(() => {});
}

// ---------- Copia HTML autocontenida ----------

// Se inyecta en la página. Igual que SavePage WE, copia también el contenido
// de los iframes del mismo origen (como srcdoc) y guarda cada canvas como
// imagen de fondo. Devuelve un documento por marco: el 0 es la página y los
// demás se referencian como "fps-frame:N". Los recursos van marcados como
// "fps-res:N" y las hojas externas que no se pudieron leer como "fps-css:N".
// pageWaitMs: cuánto se espera a que se pinte cada página de un visor.
async function snapshotPageInTab(pageWaitMs = 4000) {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const urls = [];
  const index = new Map();
  const externalCss = [];
  const token = (value, base) => {
    let absolute;
    try {
      absolute = new URL(value, base).href;
    } catch {
      return value;
    }
    if (!/^https?:/i.test(absolute)) return absolute;
    if (!index.has(absolute)) {
      index.set(absolute, urls.length);
      urls.push(absolute);
    }
    return `fps-res:${index.get(absolute)}`;
  };
  const cssUrls = (text, base) => text.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/g,
    (match, quote, value) => (/^(data|blob|#)/i.test(value.trim()) ? match : `url("${token(value.trim(), base)}")`)
  );
  // Los marcos tienen sus propias clases CSSImportRule, por eso no se usa instanceof.
  const sheetText = (sheet, base) => Array.from(sheet.cssRules).map(rule => {
    if (rule.constructor.name === "CSSImportRule" && rule.styleSheet) {
      try {
        return sheetText(rule.styleSheet, rule.styleSheet.href || base);
      } catch {
        return rule.cssText;
      }
    }
    return cssUrls(rule.cssText, base);
  }).join("\n");
  const safeCss = text => text.replace(/<\/style/gi, "<\\/style");
  const frameDocument = frame => {
    try {
      const doc = frame.contentDocument;
      return doc?.documentElement ? doc : null;
    } catch {
      return null;
    }
  };
  // Iframes ocultos (las aplicaciones como Gmail tienen decenas para su
  // funcionamiento interno): ni se recorren ni se copian.
  const visibleFrame = frame => {
    const rect = frame.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1 && frame.ownerDocument.defaultView.getComputedStyle(frame).visibility !== "hidden";
  };
  const allDocuments = (doc = document, list = []) => {
    list.push(doc);
    doc.querySelectorAll("iframe, frame").forEach(frame => {
      const inner = visibleFrame(frame) ? frameDocument(frame) : null;
      if (inner) allDocuments(inner, list);
    });
    return list;
  };
  // Canvas grandes (páginas de visores) en JPEG sobre fondo blanco: se
  // codifica mucho más rápido que PNG y pesa varias veces menos. Los
  // pequeños, que pueden tener transparencia, siguen en PNG.
  const canvasImage = canvas => {
    try {
      if (!canvas.width || !canvas.height) return null;
      if (canvas.width * canvas.height < 250_000) return canvas.toDataURL("image/png");
      const flat = canvas.ownerDocument.createElement("canvas");
      flat.width = canvas.width;
      flat.height = canvas.height;
      const context = flat.getContext("2d");
      context.fillStyle = "#fff";
      context.fillRect(0, 0, flat.width, flat.height);
      context.drawImage(canvas, 0, 0);
      return flat.toDataURL("image/jpeg", 0.9);
    } catch {
      return null;
    }
  };

  // Los visores tipo PDF.js solo mantienen pintadas las páginas cercanas a la
  // vista. Se salta a cada página que falta, se espera a que se pinte y se
  // guarda su imagen (junto con las vecinas que ya estén pintadas).
  const pageImages = new Map();
  const isLoaded = page => {
    const canvas = page.querySelector(".canvasWrapper canvas") || page.querySelector("canvas");
    return canvas?.width && (!page.classList.contains("page") || page.getAttribute("data-loaded") === "true") ? canvas : null;
  };
  const viewerPages = doc => Array.from(doc.querySelectorAll("[data-page-number]")).filter(page =>
    !page.closest(".thumbnail, #thumbnailView, #sidebarContainer")
    && !page.parentElement?.closest("[data-page-number]")
    && (page.classList.contains("page") || page.querySelector("canvas")));
  const rememberPages = pages => {
    for (const page of pages) {
      if (pageImages.has(page)) continue;
      const canvas = isLoaded(page);
      if (!canvas) continue;
      const dataUrl = canvasImage(canvas);
      if (dataUrl) pageImages.set(page, { dataUrl, width: canvas.width, height: canvas.height });
    }
  };
  const scrollParents = element => {
    const list = [];
    for (let node = element.parentElement; node; node = node.parentElement) {
      if (node.scrollHeight > node.clientHeight) list.push([node, node.scrollTop]);
    }
    return list;
  };
  const deadline = Date.now() + Math.max(120_000, pageWaitMs * 30);
  for (const doc of allDocuments()) {
    const pages = viewerPages(doc);
    if (!pages.length) continue;
    const saved = scrollParents(pages[0]);
    rememberPages(pages);
    for (const page of pages) {
      if (pageImages.has(page) || Date.now() > deadline) continue;
      page.scrollIntoView({ block: "start" });
      for (const limit = Date.now() + pageWaitMs; !isLoaded(page) && Date.now() < limit;) await sleep(40);
      rememberPages(pages);
    }
    for (const [node, top] of saved) node.scrollTop = top;
  }

  const canvasStyle = (style, dataUrl) => `${style ? `${style.replace(/;?\s*$/, ";")} ` : ""}`
    + `background-image: url(${dataUrl}) !important; background-size: 100% 100% !important; `
    + "background-repeat: no-repeat !important; background-position: center center !important;";
  const frames = [];

  const serialize = doc => {
    const position = frames.length;
    frames.push("");
    const view = doc.defaultView;
    const base = doc.baseURI;
    const live = Array.from(doc.querySelectorAll("*"));
    const copy = doc.documentElement.cloneNode(true);
    const copies = [copy, ...copy.querySelectorAll("*")];
    const removals = [];
    const replacements = [];

    live.forEach((element, livePosition) => {
      const clone = copies[livePosition];
      if (!clone) return;
      const tag = element.localName;

      for (const attribute of Array.from(clone.attributes)) {
        if (/^on/i.test(attribute.name)) clone.removeAttribute(attribute.name);
      }
      if (/url\(/i.test(clone.getAttribute("style") || "")) {
        clone.setAttribute("style", cssUrls(clone.getAttribute("style"), base));
      }

      if (tag === "script" || tag === "noscript" || tag === "base" || (tag === "link" && /preload|prefetch|modulepreload|manifest/i.test(element.rel))) {
        removals.push(clone);
      } else if (tag === "meta" && (element.hasAttribute("charset") || /content-type|content-security-policy|refresh/i.test(element.httpEquiv))) {
        removals.push(clone);
      } else if (tag === "link" && /stylesheet/i.test(element.rel) && element.href) {
        const style = doc.createElement("style");
        if (element.media) style.media = element.media;
        try {
          style.textContent = safeCss(sheetText(element.sheet, element.href));
        } catch {
          style.textContent = `fps-css:${externalCss.length}`;
          externalCss.push(element.href);
        }
        replacements.push([clone, style]);
      } else if (tag === "link" && /icon/i.test(element.rel) && element.href) {
        clone.setAttribute("href", token(element.href, base));
      } else if (tag === "style") {
        try {
          clone.textContent = safeCss(sheetText(element.sheet, base));
        } catch {
          clone.textContent = safeCss(cssUrls(element.textContent, base));
        }
      } else if (tag === "img") {
        const source = element.currentSrc || element.dataset.src || element.dataset.lazySrc || element.src;
        if (source) clone.setAttribute("src", token(source, base));
        clone.removeAttribute("srcset");
        clone.removeAttribute("sizes");
        clone.removeAttribute("loading");
      } else if (tag === "source" && element.parentElement?.localName === "picture") {
        removals.push(clone);
      } else if (tag === "video" && element.poster) {
        clone.setAttribute("poster", token(element.poster, base));
      } else if (tag === "a" && element.getAttribute("href") && !element.getAttribute("href").startsWith("#")) {
        clone.setAttribute("href", element.href);
      } else if (tag === "iframe" || tag === "frame") {
        const shown = visibleFrame(element);
        const inner = shown ? frameDocument(element) : null;
        if (!shown) {
          clone.removeAttribute("src");
          clone.removeAttribute("srcdoc");
        } else if (inner) {
          // El contenido va dentro del propio archivo: sin esto el iframe
          // vuelve a pedir la URL original, que fuera del sitio se rechaza.
          if (element.src) clone.setAttribute("data-fps-src", element.src);
          clone.removeAttribute("src");
          clone.setAttribute("srcdoc", `fps-frame:${serialize(inner)}`);
        } else if (element.src) {
          clone.setAttribute("src", element.src);
        }
      } else if (tag === "input") {
        if (/checkbox|radio/i.test(element.type)) {
          if (element.checked) clone.setAttribute("checked", "");
          else clone.removeAttribute("checked");
        } else if (element.type !== "password") {
          clone.setAttribute("value", element.value);
        }
      } else if (tag === "textarea") {
        clone.textContent = element.value;
      } else if (tag === "select") {
        const optionCopies = clone.querySelectorAll("option");
        Array.from(element.options).forEach((option, optionIndex) => {
          const optionCopy = optionCopies[optionIndex];
          if (!optionCopy) return;
          if (option.selected) optionCopy.setAttribute("selected", "");
          else optionCopy.removeAttribute("selected");
        });
        if (element.options.length > 1) {
          // Lista visible con todas las opciones del desplegable.
          const list = doc.createElement("ul");
          list.className = "fps-options";
          Array.from(element.options).forEach(option => {
            const item = doc.createElement("li");
            item.textContent = option.text;
            if (option.selected) item.className = "fps-selected";
            list.append(item);
          });
          clone.after(list);
        }
      } else if (tag === "canvas") {
        const page = element.closest("[data-page-number]");
        const dataUrl = (page && pageImages.get(page)?.dataUrl) || canvasImage(element);
        if (dataUrl) {
          clone.setAttribute("width", element.width);
          clone.setAttribute("height", element.height);
          clone.setAttribute("style", canvasStyle(clone.getAttribute("style"), dataUrl));
        }
      }

      // Página del visor que ya no tiene canvas porque se descargó al salir
      // de la vista: se repone con la imagen guardada durante el recorrido.
      if (pageImages.has(element) && !element.querySelector("canvas")) {
        const saved = pageImages.get(element);
        const canvas = doc.createElement("canvas");
        canvas.setAttribute("width", saved.width);
        canvas.setAttribute("height", saved.height);
        canvas.setAttribute("style", canvasStyle("position: absolute; inset: 0; width: 100%; height: 100%; display: block;", saved.dataUrl));
        clone.querySelectorAll(".loadingIcon").forEach(icon => icon.remove());
        clone.append(canvas);
      }

      if (tag !== "html" && element.scrollHeight > element.clientHeight + 8
        && /auto|scroll|hidden/.test(view.getComputedStyle(element).overflowY)) {
        clone.classList.add("fps-grow");
        for (let parent = clone.parentElement; parent && parent !== copy; parent = parent.parentElement) {
          parent.classList.add("fps-grow");
        }
      }
    });
    removals.forEach(element => element.remove());
    replacements.forEach(([from, to]) => from.replaceWith(to));

    const head = copy.querySelector("head") || copy.insertBefore(doc.createElement("head"), copy.firstChild);
    if (doc.adoptedStyleSheets?.length) {
      try {
        const adopted = doc.createElement("style");
        adopted.textContent = safeCss(doc.adoptedStyleSheets.map(sheet => sheetText(sheet, base)).join("\n"));
        head.append(adopted);
      } catch {}
    }
    const charset = doc.createElement("meta");
    charset.setAttribute("charset", "utf-8");
    head.prepend(charset);
    const extra = doc.createElement("style");
    extra.textContent = `
    ul.fps-options{margin:4px 0 8px;padding:6px 10px 6px 26px;border:1px dashed #9aa4b2;border-radius:6px;font-size:12px;background:#f7f8fa;color:#222}
    ul.fps-options .fps-selected{font-weight:700}
    @media print{
      html,body{height:auto!important;overflow:visible!important}
      .fps-grow{height:auto!important;max-height:none!important;overflow:visible!important}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }`;
    head.append(extra);

    const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>\n` : "";
    frames[position] = `${doctype}${copy.outerHTML}`;
    return position;
  };

  serialize(document);
  const note = `<!-- Guardado con FullPage Saver desde ${location.href.replace(/--/g, "")} el ${new Date().toISOString()} -->\n`;
  frames[0] = frames[0].startsWith("<!DOCTYPE")
    ? frames[0].replace("\n", `\n${note}`)
    : `<!DOCTYPE html>\n${note}${frames[0]}`;
  return {
    frames,
    urls,
    externalCss,
    title: document.title
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function runLimited(items, limit, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const current = next++;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

async function snapshotTab(tab) {
  setStatus(t("status.copyingContent"));
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: snapshotPageInTab,
    args: [SPEED.snapshotPageMs]
  });
  const snapshot = result?.result;
  if (!snapshot?.frames?.length) {
    throw new Error(t("err.readContent"));
  }
  return snapshot;
}

// Monta el HTML final a partir de la copia. Con embed: false deja los
// recursos enlazados (vista previa instantánea); con transform se aplica la
// selección del usuario a cada marco antes de descargar nada, así solo se
// incrustan los recursos de lo que se va a guardar.
async function assembleHtml(snapshot, { embed = true, transform = null } = {}) {
  const frames = transform ? snapshot.frames.map((html, position) => transform(html, position)) : snapshot.frames;
  const urls = [...snapshot.urls];
  const index = new Map(urls.map((url, position) => [url, position]));
  const token = (value, base) => {
    let absolute;
    try {
      absolute = new URL(value, base).href;
    } catch {
      return value;
    }
    if (!/^https?:/i.test(absolute)) return absolute;
    if (!index.has(absolute)) {
      index.set(absolute, urls.length);
      urls.push(absolute);
    }
    return `fps-res:${index.get(absolute)}`;
  };
  const cssUrls = (text, base) => text.replace(
    /url\(\s*(['"]?)([^'")]+)\1\s*\)/g,
    (match, quote, value) => (/^(data|blob|#)/i.test(value.trim()) ? match : `url("${token(value.trim(), base)}")`)
  );
  const fetchCss = async (url, depth = 0) => {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return "";
      let text = await response.text();
      if (depth < 2) {
        const imports = [...text.matchAll(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/g)];
        for (const match of imports) {
          text = text.replace(match[0], await fetchCss(new URL(match[1], url).href, depth + 1));
        }
      }
      return cssUrls(text, url);
    } catch {
      return "";
    }
  };
  const usedTokens = (texts, pattern) => new Set(texts.flatMap(text => Array.from(text.matchAll(pattern), match => Number(match[1]))));

  const cssTexts = new Array(snapshot.externalCss.length);
  const dataUrls = new Array(urls.length);
  if (embed) {
    const cssNeeded = [...usedTokens(frames, /fps-css:(\d+)/g)];
    setStatus(t("status.stylesheets", { n: cssNeeded.length }));
    await Promise.all(cssNeeded.map(async position => {
      cssTexts[position] = await fetchCss(snapshot.externalCss[position]);
    }));
    const needed = [...usedTokens([...frames, ...cssTexts.filter(Boolean)], /fps-res:(\d+)/g)];
    let done = 0;
    await runLimited(needed, 16, async position => {
      try {
        const response = await fetch(urls[position], { credentials: "include" });
        if (response.ok) dataUrls[position] = await blobToDataUrl(await response.blob());
      } catch {}
      done++;
      if (done % 5 === 0 || done === needed.length) {
        setStatus(t("status.embedding", { n: done, total: needed.length }));
      }
    });
    setStatus(t("status.generatingHtml"));
  }

  // Cada marco se completa por separado y se mete escapado en el srcdoc de su
  // padre, como hace SavePage WE.
  const escapeAttribute = text => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const built = new Map();
  const buildFrame = position => {
    if (built.has(position)) return built.get(position);
    const html = frames[position]
      // Hoja que no se pudo descargar (o vista previa): queda enlazada para
      // que la copia mantenga el estilo con conexión.
      .replace(/fps-css:(\d+)/g, (match, cssPosition) => (cssTexts[cssPosition] || `@import url("${snapshot.externalCss[cssPosition]}");`).replace(/<\/style/gi, "<\\/style"))
      .replace(/fps-res:(\d+)/g, (match, resource) => dataUrls[resource] || urls[resource] || "")
      .replace(/fps-frame:(\d+)/g, (match, child) => escapeAttribute(buildFrame(Number(child))));
    built.set(position, html);
    return html;
  };
  return buildFrame(0);
}

async function buildHtml(tab) {
  const snapshot = await snapshotTab(tab);
  return { html: await assembleHtml(snapshot), title: snapshot.title || tab.title };
}

// ---------- Permiso opcional para recursos de otros dominios ----------

// El acceso a todos los sitios es opcional: activeTab basta para leer y
// capturar la pestaña. Solo el HTML lo necesita, para descargar las imágenes,
// estilos y fuentes que la página carga desde otros dominios. Chrome exige un
// clic del usuario para pedirlo, así que se pregunta en esta ventana.
const ALL_SITES = { origins: ["<all_urls>"] };

async function askResourcePermission() {
  if (await chrome.permissions.contains(ALL_SITES)) return true;
  const box = document.querySelector("#permission");
  box.hidden = false;
  setStatus(t("perm.missing"));
  const win = await chrome.windows.getCurrent();
  await chrome.windows.update(win.id, { height: 560 }).catch(() => {});
  const granted = await new Promise(resolve => {
    document.querySelector("#grant").addEventListener("click", async () => {
      try {
        resolve(await chrome.permissions.request(ALL_SITES));
      } catch {
        resolve(false);
      }
    }, { once: true });
    document.querySelector("#skip").addEventListener("click", () => resolve(false), { once: true });
  });
  box.hidden = true;
  await chrome.windows.update(win.id, { height: 340 }).catch(() => {});
  return granted;
}

// ---------- Descargas ----------

// Chrome lee el archivo desde esta ventana: si se cierra antes de que acabe
// de guardarse, el archivo queda vacío o cortado («error al cargar el
// documento PDF»). Por eso se espera aquí a que la descarga termine.
async function download(blob, filename, { ask = true } = {}) {
  const { url: objectUrl, cleanup } = await prepareDownloadUrl(blob, filename);
  await registerDownloadName(objectUrl, filename);
  const downloadId = await chrome.downloads.download({ url: objectUrl, filename, saveAs: ask, conflictAction: "uniquify" });
  if (downloadId === undefined) {
    cleanup();
    throw new Error(t("err.download"));
  }
  setStatus(t("status.saving"));
  const warnOnClose = event => {
    event.preventDefault();
    event.returnValue = "";
  };
  window.addEventListener("beforeunload", warnOnClose);
  try {
    const state = await new Promise(resolve => {
      const listener = delta => {
        if (delta.id !== downloadId || !delta.state) return;
        if (delta.state.current !== "in_progress") {
          chrome.downloads.onChanged.removeListener(listener);
          resolve(delta.state.current);
        }
      };
      chrome.downloads.onChanged.addListener(listener);
      // Por si terminó antes de empezar a escuchar.
      chrome.downloads.search({ id: downloadId }).then(([item]) => {
        if (item && item.state !== "in_progress") {
          chrome.downloads.onChanged.removeListener(listener);
          resolve(item.state);
        }
      });
    });
    if (state === "interrupted") {
      const [item] = await chrome.downloads.search({ id: downloadId });
      // Mensaje completo: se muestra tal cual, sin «No se pudo completar».
      throw Object.assign(new Error(item?.error === "USER_CANCELED"
        ? t("err.downloadCanceled")
        : t("err.downloadFailed", { reason: item?.error || "?" })), { complete: true });
    }
  } finally {
    window.removeEventListener("beforeunload", warnOnClose);
    window.setTimeout(cleanup, 60_000);
  }
}

// La ventana de progreso se amplía para la vista previa y luego vuelve a su tamaño.
async function resizeWindow(large) {
  try {
    const win = await chrome.windows.getCurrent();
    if (!large) {
      await chrome.windows.update(win.id, { width: 440, height: 340 });
      return;
    }
    const width = Math.min(1280, screen.availWidth - 40);
    const height = Math.min(880, screen.availHeight - 40);
    await chrome.windows.update(win.id, {
      width,
      height,
      left: Math.round((screen.availLeft || 0) + (screen.availWidth - width) / 2),
      top: Math.round((screen.availTop || 0) + (screen.availHeight - height) / 2),
      focused: true
    });
  } catch {}
}

async function review(open) {
  setStatus(t("status.waitingReview"));
  await resizeWindow(true);
  try {
    const choices = await open();
    if (!choices) throw Object.assign(new Error(t("err.canceled")), { complete: true });
    return choices;
  } finally {
    setReviewVisible(false);
    await resizeWindow(false);
  }
}

const hasNote = extras => Boolean(extras.note && extras.noteText.trim());
const NO_EXTRAS = { cover: false, toc: false, links: false, note: false, noteText: "" };

// Captura en PDF de una página ya preparada y analizada, con la selección
// aplicada. En modo lectura la pestaña muestra la versión de lectura mientras
// tanto. Devuelve la captura; la pestaña queda como estaba.
async function capturePagePdf(tab, page, docInfo, choices, previewHtml) {
  try {
    if (choices.reader) {
      const readerHtml = choicesTransform(docInfo, { ...choices, extras: NO_EXTRAS })(previewHtml, 0);
      await applyReaderInTab(tab.id, readerHtml);
    } else {
      // Lo desmarcado se oculta en la propia pestaña antes de capturarla y
      // se pintan los resaltados y notas.
      await applyChoicesInTab(tab.id, choicesCss(choices));
      await applyAnnotationsInTab(tab.id, choices.annotations);
    }
    setStatus(t("status.capturingPage"));
    // La versión de lectura es un documento normal: no hace falta el límite
    // de las aplicaciones.
    return await captureFullPage(tab, page.app && !choices.reader ? APP_MAX_CAPTURES : MAX_CAPTURES);
  } finally {
    await restoreReaderInTab(tab.id);
  }
}

async function run() {
  const tab = await getTargetTab();
  document.querySelector("#page-title").textContent = tab.title || tab.url;

  if (MODE === "mht") {
    setStatus(t("status.mht"));
    const archive = await chrome.pageCapture.saveAsMHTML({ tabId: tab.id });
    if (!archive?.size) throw new Error(t("err.mht"));
    await download(new Blob([archive], { type: "multipart/related" }), `${safeFileName(tab.title || "pagina-web")}.mht`);
    return t("done.mht");
  }

  const embedAll = MODE === "html" ? await askResourcePermission() : true;
  // Web normal o aplicación con muchos paneles (Gmail, Drive…): decide cuánto
  // se toca y se recorre la página.
  const page = await detectPage(tab.id);

  if (MODE === "pdf") {
    // Un visor de páginas se copia directamente: no hace falta recorrer antes
    // toda la página. Luego se eligen las páginas en la vista previa.
    const viewer = await captureViewerPages(tab);
    if (viewer) {
      const choice = await review(() => openPagesReview({ pages: viewer.pages, fileName: safeFileName(viewer.title || tab.title || "documento") }));
      const pages = choice.selected.map(index => viewer.pages[index]);
      if (choice.extras.cover || hasNote(choice.extras)) {
        const first = pages[0];
        const ratio = first.widthPt && first.heightPt ? first.heightPt / first.widthPt : first.height / first.width;
        const cover = await makeCoverPage({ title: viewer.title, url: tab.url }, choice, [], ratio);
        pages.unshift({ ...cover, widthPt: first.widthPt || null, heightPt: first.widthPt ? first.widthPt * ratio : null });
      }
      setStatus(t("status.viewerDone", { n: choice.selected.length }));
      await download(await createViewerPdf(pages), `${safeFileName(choice.fileName || viewer.title)}.pdf`);
      return t("done.viewerPdf", { n: choice.selected.length });
    }
  }

  await preparePage(tab.id, page);
  const info = await analyzeSections(tab.id);
  const docInfo = { ...info, title: info.title || tab.title, url: tab.url };
  try {
    const snapshot = await snapshotTab(tab);
    const previewHtml = await assembleHtml(snapshot, { embed: false });
    const choices = await review(() => openReview({ mode: MODE, info: docInfo, previewHtml, fileName: safeFileName(snapshot.title || tab.title || "pagina-web") }));

    if (MODE === "pdf") {
      const captureResult = await capturePagePdf(tab, page, docInfo, choices, previewHtml);
      setStatus(t("status.captured", { n: captureResult.captures.length }));
      let cover = null;
      if (choices.extras.cover || choices.extras.toc || hasNote(choices.extras)) {
        const [shortSide, longSide] = PAPER_SIZES[PAPER] || PAPER_SIZES.A4;
        const ratio = ORIENTATION === "landscape" ? shortSide / longSide : longSide / shortSide;
        cover = await makeCoverPage(docInfo, choices, includedSections(docInfo, choices), ratio);
      }
      const pdf = await createPdf(captureResult, ORIENTATION, cover);
      await download(pdf, `${safeFileName(choices.fileName || captureResult.title)}.pdf`);
      const message = captureResult.truncated
        ? t("done.pdfPartial", { n: captureResult.captures.length })
        : t("done.pdf", { n: captureResult.captures.length });
      return captureResult.repaired ? `${message} ${t("done.repaired", { n: captureResult.repaired })}` : message;
    }

    const html = await assembleHtml(snapshot, { embed: true, transform: choicesTransform(docInfo, choices) });
    // Con el tipo text/html Chrome en Windows cambia la extensión a .htm.
    await download(new Blob([html], { type: "application/octet-stream" }), `${safeFileName(choices.fileName || snapshot.title || tab.title)}.html`);
    return embedAll ? t("done.html") : t("done.htmlLinked");
  } finally {
    // La pestaña vuelve a quedar como estaba.
    await clearChoicesInTab(tab.id);
  }
}

// ---------- Varias pestañas ----------

const STORE_PAGE = /^https?:\/\/(chromewebstore\.google\.com|chrome\.google\.com\/webstore)/i;

// Para leer otras pestañas (no solo la activa) hace falta el acceso a los
// sitios. Chrome lo pide con un clic del usuario, en esta ventana.
async function askBatchPermission() {
  if (await chrome.permissions.contains(ALL_SITES)) return true;
  const box = document.querySelector("#permission");
  box.querySelector("p").textContent = t("perm.batchText");
  box.querySelector("#grant strong").textContent = t("perm.batchGrant");
  box.querySelector("#skip strong").textContent = t("rv.cancel");
  box.querySelector("#skip .choice-copy > span")?.remove();
  box.hidden = false;
  setStatus(t("batch.needPermission"));
  const win = await chrome.windows.getCurrent();
  await chrome.windows.update(win.id, { height: 520 }).catch(() => {});
  const granted = await new Promise(resolve => {
    document.querySelector("#grant").addEventListener("click", async () => {
      try {
        resolve(await chrome.permissions.request(ALL_SITES));
      } catch {
        resolve(false);
      }
    }, { once: true });
    document.querySelector("#skip").addEventListener("click", () => resolve(false), { once: true });
  });
  box.hidden = true;
  await chrome.windows.update(win.id, { height: 340 }).catch(() => {});
  return granted;
}

// Guarda una pestaña sin vista previa, con las opciones elegidas para todas.
// Devuelve un archivo (HTML o PDF) o, para el PDF único, sus hojas.
async function saveTabAutomatically(tab, options) {
  const page = await detectPage(tab.id);
  if (options.format !== "html") {
    const viewer = await captureViewerPages(tab);
    if (viewer) {
      const pages = await viewerPdfPages(viewer.pages);
      if (options.format === "merged") return { pages };
      const [paperWidthMm] = PAPER_SIZES[PAPER] || PAPER_SIZES.A4;
      return { blob: createPdfBlob(pages, paperWidthMm, paperWidthMm), name: `${safeFileName(viewer.title || tab.title)}.pdf` };
    }
  }
  await preparePage(tab.id, page);
  const info = await analyzeSections(tab.id);
  const docInfo = { ...info, title: info.title || tab.title, url: tab.url };
  const choices = {
    hiddenParts: options.clean ? DEFAULT_HIDDEN_PARTS.filter(part => info.parts[part]) : [],
    excludedSections: [],
    extras: NO_EXTRAS,
    reader: options.reader
  };
  try {
    if (options.format === "html") {
      const snapshot = await snapshotTab(tab);
      const html = await assembleHtml(snapshot, { embed: true, transform: choicesTransform(docInfo, choices) });
      return { blob: new Blob([html], { type: "application/octet-stream" }), name: `${safeFileName(snapshot.title || tab.title)}.html` };
    }
    // La versión de lectura se monta desde la copia de la página.
    const previewHtml = options.reader ? await assembleHtml(await snapshotTab(tab), { embed: false }) : "";
    const captureResult = await capturePagePdf(tab, page, docInfo, choices, previewHtml);
    if (options.format === "merged") return { pages: (await composePdfPages(captureResult, ORIENTATION)).pages };
    return { blob: await createPdf(captureResult, ORIENTATION), name: `${safeFileName(captureResult.title || tab.title)}.pdf` };
  } finally {
    await clearChoicesInTab(tab.id);
  }
}

async function runBatch() {
  const heading = document.querySelector("#page-title");
  heading.textContent = t("batch.title");
  if (!await askBatchPermission()) throw Object.assign(new Error(t("batch.noPermission")), { complete: true });

  const tabs = (await chrome.tabs.query({ windowId: WINDOW_ID }))
    .filter(tab => /^https?:\/\//i.test(tab.url || "") && !STORE_PAGE.test(tab.url));
  if (!tabs.length) throw Object.assign(new Error(t("batch.noTabs")), { complete: true });
  const options = await review(() => openTabsReview({ tabs }));

  const [original] = await chrome.tabs.query({ active: true, windowId: WINDOW_ID });
  const total = options.tabIds.length;
  const merged = [];
  const failed = [];
  let saved = 0;
  try {
    for (const [index, tabId] of options.tabIds.entries()) {
      let tab;
      try {
        tab = await chrome.tabs.get(tabId);
        heading.textContent = t("batch.progress", { n: index + 1, total });
        setStatus(tab.title || tab.url);
        // La captura en PDF y la carga diferida necesitan la pestaña visible.
        await chrome.tabs.update(tab.id, { active: true });
        await delay(450);
        const result = await saveTabAutomatically(tab, options);
        if (result.pages) {
          merged.push(...result.pages);
        } else {
          // Sin preguntar dónde: todos los archivos van juntos a Descargas.
          await download(result.blob, `FullPage Saver/${result.name}`, { ask: false });
        }
        saved++;
      } catch (error) {
        failed.push(tab?.title || String(tabId));
        console.warn("FullPage Saver:", tab?.url, error);
      }
    }
  } finally {
    if (original?.id) await chrome.tabs.update(original.id, { active: true }).catch(() => {});
    await chrome.windows.update((await chrome.windows.getCurrent()).id, { focused: true }).catch(() => {});
  }

  heading.textContent = t("batch.title");
  if (!saved) throw Object.assign(new Error(t("batch.noneSaved", { list: failed.join(" · ") })), { complete: true });
  if (options.format === "merged") {
    setStatus(t("status.composing", { n: merged.length, total: merged.length }));
    const [shortSide, longSide] = PAPER_SIZES[PAPER] || PAPER_SIZES.A4;
    const [widthMm, heightMm] = ORIENTATION === "landscape" ? [longSide, shortSide] : [shortSide, longSide];
    await download(createPdfBlob(merged, widthMm, heightMm), `${safeFileName(t("batch.mergedName", { n: saved }))}.pdf`);
  }
  const message = options.format === "merged"
    ? t("batch.doneMerged", { n: saved, total })
    : t("batch.done", { n: saved, total });
  return failed.length ? `${message} ${t("batch.failed", { list: failed.join(" · ") })}` : message;
}

// ---------- Pedir una valoración ----------

// Después de unos cuantos guardados correctos se invita, una sola vez y con
// opción de no volver a verlo, a valorar la extensión en la Chrome Web Store.
const RATE_KEY = "fps-rate";
const RATE_AFTER = 5;

function maybeAskForRating() {
  let data = {};
  try {
    data = JSON.parse(localStorage.getItem(RATE_KEY)) || {};
  } catch {}
  data.saves = (data.saves || 0) + 1;
  const store = () => {
    try {
      localStorage.setItem(RATE_KEY, JSON.stringify(data));
    } catch {}
  };
  store();
  if (data.state || data.saves < (data.next || RATE_AFTER)) return;

  const card = document.querySelector("#rate");
  card.hidden = false;
  chrome.windows.getCurrent()
    .then(win => chrome.windows.update(win.id, { height: 500 }))
    .catch(() => {});
  const close = () => {
    card.hidden = true;
    store();
    chrome.windows.getCurrent()
      .then(win => chrome.windows.update(win.id, { height: 340 }))
      .catch(() => {});
  };
  document.querySelector("#rate-yes").onclick = () => {
    data.state = "rated";
    chrome.tabs.create({ url: `https://chromewebstore.google.com/detail/${chrome.runtime.id}/reviews` });
    close();
  };
  document.querySelector("#rate-later").onclick = () => {
    data.next = data.saves + 10;
    close();
  };
  document.querySelector("#rate-never").onclick = () => {
    data.state = "never";
    close();
  };
}

document.querySelector("#close").addEventListener("click", () => window.close());

(BATCH ? runBatch() : run())
  .then(message => {
    setStatus(message);
    document.body.dataset.state = "done";
    maybeAskForRating();
  })
  .catch(error => {
    const message = error.message || "";
    if (error.complete) {
      setStatus(message, true);
      document.body.dataset.state = "error";
      return;
    }
    // Páginas en las que Chrome no deja actuar a ninguna extensión.
    if (/gallery cannot be scripted|cannot be scripted|Cannot access (contents of|a chrome)|ExtensionsSettings policy/i.test(message)) {
      setStatus(t("err.blockedPage"), true);
    } else if (/permission|activeTab/i.test(message)) {
      setStatus(t("err.noAccess"), true);
    } else {
      setStatus(t("err.generic", { msg: message || t("err.unknown") }), true);
    }
    document.body.dataset.state = "error";
  });
