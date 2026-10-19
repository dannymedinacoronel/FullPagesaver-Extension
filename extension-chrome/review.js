// Vista previa antes de guardar: el usuario elige qué partes y secciones
// incluir y puede añadir portada, índice, direcciones de enlaces y una nota.
// Lo usa save.js en la ventana de progreso, que se amplía mientras tanto.

const PART_ORDER = ["header", "nav", "aside", "footer", "comments", "cookies", "ads", "floating", "media", "images"];
// Por sentido común, lo que casi nadie quiere guardar viene desmarcado.
const DEFAULT_HIDDEN_PARTS = ["cookies", "ads", "floating"];
const READER_HIDDEN_PARTS = ["header", "nav", "aside", "footer", "comments", "cookies", "ads", "floating"];

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => (
  { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]
));

// ---------- Aplicar la selección ----------

function choicesSelectors(choices) {
  const selectors = choices.excludedSections.map(id => `[data-fps-sec~="${id}"]`);
  for (const part of choices.hiddenParts) {
    if (part === "images") selectors.push("img", "picture");
    else selectors.push(`[data-fps-part="${part}"]`);
  }
  // Párrafos, imágenes o tablas quitados a mano en la vista previa.
  for (const id of choices.annotations?.removed || []) selectors.push(`[data-fps-id="${id}"]`);
  return selectors;
}

const emptyAnnotations = () => ({ highlights: [], removed: [], notes: [] });

// Resaltados y notas de la vista previa. Cada elemento de la página lleva un
// número (data-fps-id, puesto al analizarla) que se conserva en la copia, así
// que una marca se puede repetir en la vista previa, en el HTML final y en la
// propia pestaña antes de capturar el PDF. Es autónoma porque también se
// inyecta en la pestaña.
function applyAnnotationsInDoc(annotations, doc = document) {
  const MARK_STYLE = "background: #fde047; color: inherit; padding: 0 1px; border-radius: 2px; box-decoration-break: clone; -webkit-box-decoration-break: clone;";
  const NOTE_STYLE = "box-sizing: border-box; margin: 10px 0; padding: 10px 14px; border-left: 4px solid #f59e0b; border-radius: 8px; background: #fff8eb; color: #3f2d07; font: 15px/1.5 'Segoe UI', system-ui, sans-serif; white-space: pre-wrap; text-align: left;";
  const byId = id => doc.querySelector(`[data-fps-id="${id}"]`);
  const highlight = (element, start, end, key) => {
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const parts = [];
    let offset = 0;
    for (let node = walker.nextNode(); node && offset < end; node = walker.nextNode()) {
      const from = Math.max(start, offset);
      const to = Math.min(end, offset + node.data.length);
      if (to > from) parts.push([node, from - offset, to - offset]);
      offset += node.data.length;
    }
    for (const [node, from, to] of parts) {
      if (!/\S/.test(node.data.slice(from, to)) || node.parentElement?.closest("script, style")) continue;
      const range = doc.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const mark = doc.createElement("mark");
      mark.setAttribute("data-fps-mark", key);
      mark.setAttribute("style", MARK_STYLE);
      range.surroundContents(mark);
    }
  };
  for (const item of annotations.highlights || []) {
    const element = byId(item.id);
    if (!element) continue;
    // Si el texto se ha movido un poco (la copia no es idéntica), se busca.
    let start = item.start;
    const text = element.textContent;
    if (text.slice(start, start + item.text.length) !== item.text) start = text.indexOf(item.text);
    if (start < 0) continue;
    highlight(element, start, start + item.text.length, item.key);
  }
  for (const note of annotations.notes || []) {
    const element = byId(note.id);
    if (!element) continue;
    const box = doc.createElement("div");
    box.setAttribute("data-fps-note", note.key);
    box.setAttribute("style", NOTE_STYLE);
    box.textContent = note.text;
    element.after(box);
  }
}

// Quita los resaltados y notas (para volver a pintarlos o dejar la pestaña
// como estaba). También autónoma.
function clearAnnotationsInDoc(doc = document) {
  doc.querySelectorAll("[data-fps-note]").forEach(note => note.remove());
  doc.querySelectorAll("mark[data-fps-mark]").forEach(mark => {
    const parent = mark.parentNode;
    mark.replaceWith(...mark.childNodes);
    parent?.normalize();
  });
}

const LINKS_CSS = "a[href^=\"http\"]::after { content: \" (\" attr(href) \")\"; font-size: .8em; font-weight: normal; color: #5b6475; word-break: break-all; }";

// CSS que oculta lo desmarcado: para la vista previa y para capturar el PDF.
function choicesCss(choices) {
  const rules = [];
  const selectors = choicesSelectors(choices);
  if (selectors.length) rules.push(`${selectors.join(",\n")} { display: none !important; }`);
  if (choices.extras.links) rules.push(LINKS_CSS);
  return rules.join("\n");
}

function includedSections(info, choices) {
  return info.sections.filter(section => !choices.excludedSections.includes(section.id));
}

// Bloque de portada, nota e índice que se añade al principio del HTML.
function extrasHtml(info, choices) {
  const { cover, toc } = choices.extras;
  const note = choices.extras.note ? choices.extras.noteText.trim() : "";
  const sections = includedSections(info, choices);
  if (!cover && !note && !(toc && sections.length)) return "";
  const font = "font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;";
  let html = `<div id="fps-extras" style="${font} box-sizing: border-box; max-width: 900px; margin: 24px auto 32px; padding: 28px 32px; border: 1px solid #dfe3ee; border-radius: 16px; background: #ffffff; color: #0f172a; line-height: 1.5; text-align: left;">`;
  if (cover) {
    html += `<div style="height: 6px; margin: -28px -32px 22px; border-radius: 16px 16px 0 0; background: linear-gradient(90deg, #14b8a6, #4f46e5);"></div>`;
    html += `<div style="font-size: 28px; font-weight: 800; letter-spacing: -.02em; line-height: 1.2;">${escapeHtml(info.title || "")}</div>`;
    html += `<div style="margin-top: 8px; font-size: 13px; color: #475569;">${escapeHtml(t("cover.source"))}: <a href="${escapeHtml(info.url || "")}" style="color: #4f46e5; word-break: break-all;">${escapeHtml(info.url || "")}</a></div>`;
    html += `<div style="margin-top: 2px; font-size: 13px; color: #475569;">${escapeHtml(t("cover.saved", { date: new Date().toLocaleString(currentLang) }))}</div>`;
  }
  if (note) {
    html += `<div style="margin-top: 18px; padding: 14px 16px; border-left: 4px solid #f59e0b; border-radius: 8px; background: #fff8eb; color: #3f2d07;"><div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;">${escapeHtml(t("cover.note"))}</div><div style="margin-top: 4px; font-size: 15px;">${escapeHtml(note).replace(/\n/g, "<br>")}</div></div>`;
  }
  if (toc && sections.length) {
    const minLevel = Math.min(...sections.map(section => section.level));
    html += `<div style="margin-top: 20px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #475569;">${escapeHtml(t("cover.toc"))}</div>`;
    html += sections.map(section => `<div style="padding: 3px 0 3px ${(section.level - minLevel) * 18}px; font-size: 15px;"><a href="#fps-${section.id}" data-fps-toc="${section.id}" style="color: #1e293b; text-decoration: none;">${escapeHtml(section.label)}</a></div>`).join("");
  }
  return `${html}</div>`;
}

// ---------- Modo lectura ----------

const READER_CSS = `
:root { color-scheme: light; }
html { background: #f7f5f0; }
body { margin: 0; padding: 48px 20px 80px; color: #1f2328; font: 19px/1.7 Georgia, "Iowan Old Style", "Times New Roman", serif; }
.fps-reader { max-width: 720px; margin: 0 auto; overflow-wrap: break-word; }
.fps-reader h1, .fps-reader h2, .fps-reader h3, .fps-reader h4, .fps-reader h5, .fps-reader h6 { margin: 1.6em 0 .55em; color: #111; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; line-height: 1.25; }
.fps-reader h1 { margin-top: .3em; font-size: 2.1em; letter-spacing: -.01em; }
.fps-reader h2 { font-size: 1.5em; }
.fps-reader h3 { font-size: 1.25em; }
.fps-reader p, .fps-reader ul, .fps-reader ol, .fps-reader dl, .fps-reader blockquote, .fps-reader pre, .fps-reader table, .fps-reader figure { margin: 0 0 1.1em; }
.fps-reader img, .fps-reader video, .fps-reader svg, .fps-reader picture { max-width: 100%; height: auto; }
.fps-reader img, .fps-reader video { display: block; margin: 1.2em auto; border-radius: 6px; }
.fps-reader a { color: #1d4ed8; }
.fps-reader blockquote { margin-left: 0; padding-left: 1em; border-left: 4px solid #d8d3c8; color: #4b5563; }
.fps-reader pre, .fps-reader code { border-radius: 4px; background: #eeebe3; font-family: Consolas, "Courier New", monospace; font-size: .85em; }
.fps-reader pre { padding: 1em; overflow-x: auto; white-space: pre-wrap; }
.fps-reader table { width: 100%; border-collapse: collapse; font-size: .9em; }
.fps-reader th, .fps-reader td { padding: .4em .6em; border: 1px solid #d8d3c8; text-align: left; vertical-align: top; }
.fps-reader figcaption { color: #6b7280; font-size: .85em; text-align: center; }
.fps-reader hr { margin: 2em 0; border: 0; border-top: 1px solid #d8d3c8; }
.fps-reader mark { padding: 0 1px; border-radius: 2px; background: #fde047; color: inherit; }
.fps-reader [data-fps-note] { margin: 1em 0; padding: .7em 1em; border-left: 4px solid #f59e0b; border-radius: 8px; background: #fff8eb; color: #3f2d07; font: 16px/1.5 "Segoe UI", system-ui, sans-serif; white-space: pre-wrap; }
@media print { html, body { background: #fff; } body { padding: 0; } }`;

// Atributos que se conservan: lo demás (clases, estilos, eventos…) es diseño
// de la web y se quita.
const READER_ATTRIBUTES = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "id", "lang", "dir", "datetime", "cite", "start", "type", "poster", "controls", "data-fps-head", "data-fps-sec", "data-fps-id", "data-fps-mark", "data-fps-note"]);
const READER_REMOVE = "script, style, link, noscript, template, iframe, frame, object, embed, form, button, input, select, textarea, dialog, [hidden], svg[aria-hidden=true], a svg, picture source, meta";

// Convierte el documento en una versión de lectura: solo el contenido
// principal, con una tipografía cómoda y sin el diseño de la web.
function makeReader(doc, info) {
  const source = doc.querySelector("[data-fps-root]") || doc.querySelector("article, main, [role=main]") || doc.body;
  const article = doc.createElement("article");
  article.className = "fps-reader";
  // Los canvas se guardaron como imagen de fondo: aquí pasan a ser <img>.
  source.querySelectorAll("canvas").forEach(canvas => {
    const url = (canvas.getAttribute("style") || "").match(/background-image:\s*url\(["']?([^"')]+)["']?\)/)?.[1];
    if (!url) return;
    const image = doc.createElement("img");
    image.setAttribute("src", url);
    canvas.replaceWith(image);
  });
  article.append(...source.childNodes);
  article.querySelectorAll(READER_REMOVE).forEach(element => element.remove());
  for (const element of article.querySelectorAll("*")) {
    if (element.localName === "img" && !element.getAttribute("src")) {
      const candidate = (element.getAttribute("srcset") || element.getAttribute("data-src") || "").trim().split(/\s+/)[0];
      if (candidate) element.setAttribute("src", candidate);
    }
    for (const { name } of Array.from(element.attributes)) {
      if (!READER_ATTRIBUTES.has(name)) element.removeAttribute(name);
    }
  }
  // Envoltorios que se han quedado vacíos.
  const keep = "img, video, audio, picture, svg, table, hr, br";
  for (const element of Array.from(article.querySelectorAll("div, span, section, p, li, figure, a")).reverse()) {
    if (!element.textContent.trim() && !element.matches(keep) && !element.querySelector(keep) && !element.id) element.remove();
  }
  if (!article.querySelector("h1") && info.title) {
    const title = doc.createElement("h1");
    title.textContent = info.title;
    article.prepend(title);
  }
  const head = doc.head;
  head.querySelectorAll(":scope > :not(title)").forEach(element => element.remove());
  head.insertAdjacentHTML("afterbegin", "<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
  const style = doc.createElement("style");
  style.textContent = READER_CSS;
  head.append(style);
  for (const element of [doc.documentElement, doc.body]) {
    for (const { name } of Array.from(element.attributes)) {
      if (name !== "lang" && name !== "dir") element.removeAttribute(name);
    }
  }
  doc.body.replaceChildren(article);
}

// Transformación de cada marco del HTML final: quita lo desmarcado y añade
// los extras. Se hace antes de incrustar recursos, así no se descarga nada
// de lo que no se va a guardar.
function choicesTransform(info, choices) {
  const selectors = choicesSelectors(choices).join(",");
  return (html, position) => {
    if (position !== 0 && !selectors && !choices.extras.links) return html;
    const doc = new DOMParser().parseFromString(html, "text/html");
    // Primero las marcas (los números de los elementos aún no han cambiado).
    if (position === 0 && choices.annotations) applyAnnotationsInDoc(choices.annotations, doc);
    if (selectors) doc.querySelectorAll(selectors).forEach(element => element.remove());
    if (choices.reader && position === 0) makeReader(doc, info);
    if (choices.extras.links) {
      const style = doc.createElement("style");
      style.textContent = LINKS_CSS;
      doc.head.append(style);
    }
    if (position === 0) {
      // Anclas para el índice.
      doc.querySelectorAll("[data-fps-head]").forEach(heading => {
        const anchor = doc.createElement("a");
        anchor.id = `fps-${heading.getAttribute("data-fps-head")}`;
        heading.prepend(anchor);
      });
      const extras = extrasHtml(info, choices);
      if (extras) doc.body.insertAdjacentHTML("afterbegin", extras);
      // Los números solo sirven mientras se edita.
      if (!choices.keepIds) doc.querySelectorAll("[data-fps-id]").forEach(element => element.removeAttribute("data-fps-id"));
    }
    const prefix = html.match(/^\s*<!DOCTYPE[^>]*>\s*(<!--[\s\S]*?-->\s*)?/i)?.[0] || "<!DOCTYPE html>\n";
    return prefix + doc.documentElement.outerHTML;
  };
}

// ---------- Portada como imagen (para los PDF) ----------

async function makeCoverPage(info, choices, sections, ratio = 297 / 210) {
  const width = 1240;
  const height = Math.round(width * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, width, height);
  const band = g.createLinearGradient(0, 0, width, 0);
  band.addColorStop(0, "#14b8a6");
  band.addColorStop(1, "#4f46e5");
  g.fillStyle = band;
  g.fillRect(0, 0, width, 18);

  const margin = 110;
  const maxWidth = width - margin * 2;
  let y = 170;
  const font = (weight, size) => `${weight} ${size}px "Segoe UI", system-ui, sans-serif`;
  const wrap = (text, size, weight) => {
    g.font = font(weight, size);
    const lines = [];
    for (const paragraph of String(text).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const test = line ? `${line} ${word}` : word;
        if (g.measureText(test).width <= maxWidth) {
          line = test;
          continue;
        }
        if (g.measureText(word).width <= maxWidth) {
          lines.push(line);
          line = word;
          continue;
        }
        // Palabras más anchas que la línea (direcciones): se cortan por caracteres.
        let chunk = line ? `${line} ` : "";
        for (const char of word) {
          if (g.measureText(chunk + char).width > maxWidth && chunk) {
            lines.push(chunk);
            chunk = "";
          }
          chunk += char;
        }
        line = chunk;
      }
      lines.push(line);
    }
    return lines;
  };
  const draw = (text, size, weight, color, gap = 1.3) => {
    for (const line of wrap(text, size, weight)) {
      if (y > height - 120) return false;
      g.font = font(weight, size);
      g.fillStyle = color;
      g.fillText(line, margin, y);
      y += size * gap;
    }
    return true;
  };

  if (choices.extras.cover) {
    draw(info.title || "", 58, 800, "#0f172a", 1.18);
    y += 18;
    draw(`${t("cover.source")}: ${info.url || ""}`, 24, 500, "#4f46e5");
    draw(t("cover.saved", { date: new Date().toLocaleString(currentLang) }), 24, 500, "#64748b");
    y += 30;
  }
  const note = choices.extras.note ? choices.extras.noteText.trim() : "";
  if (note) {
    const lines = wrap(note, 26, 500);
    const boxHeight = Math.min(lines.length, 12) * 26 * 1.4 + 70;
    g.fillStyle = "#fff8eb";
    g.fillRect(margin - 24, y - 40, maxWidth + 48, boxHeight);
    g.fillStyle = "#f59e0b";
    g.fillRect(margin - 24, y - 40, 8, boxHeight);
    draw(t("cover.note").toUpperCase(), 20, 700, "#92400e");
    for (const line of lines.slice(0, 12)) draw(line, 26, 500, "#3f2d07", 1.4);
    y += 40;
  }
  if (choices.extras.toc && sections.length) {
    draw(t("cover.toc").toUpperCase(), 22, 700, "#475569");
    y += 6;
    const minLevel = Math.min(...sections.map(section => section.level));
    for (const section of sections) {
      if (y > height - 140) {
        draw("…", 26, 500, "#64748b");
        break;
      }
      g.font = font(section.level === minLevel ? 650 : 500, 26);
      g.fillStyle = "#1e293b";
      let label = section.label;
      const indent = (section.level - minLevel) * 34;
      while (g.measureText(label).width > maxWidth - indent && label.length > 4) label = `${label.slice(0, -2)}…`;
      g.fillText(label, margin + indent, y);
      y += 40;
    }
  }
  g.font = font(600, 18);
  g.fillStyle = "#94a3b8";
  g.fillText("FullPage Saver", margin, height - 60);
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.92), width, height };
}

// ---------- Interfaz ----------

// Nombre del archivo en la cabecera, ya relleno (título de la página o del
// documento). value = null lo oculta (varias pestañas).
function setFileNameField(value, extension = "") {
  const field = document.querySelector(".rv-name");
  const input = document.querySelector("#rv-filename");
  field.hidden = value === null;
  input.value = value || "";
  document.querySelector("#rv-filename-ext").textContent = extension;
  input.onkeydown = event => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.querySelector("#rv-save").click();
    }
  };
}

// Si se escribe la extensión, no se repite («apuntes.pdf» → «apuntes»).
const chosenFileName = () => document.querySelector("#rv-filename").value.trim().replace(/\.(pdf|html?|mht)$/i, "");

function setReviewVisible(visible) {
  document.body.classList.toggle("reviewing", visible);
  document.querySelector("#review").hidden = !visible;
}

function checkboxRow({ id, label, count, checked, level = 0, extraClass = "", action = "" }) {
  return `<label class="rv-row ${extraClass}" style="--level: ${level}">
    <input type="checkbox" data-id="${escapeHtml(id)}" ${checked ? "checked" : ""}>
    <span class="rv-label" ${action ? `data-action="${action}" data-target="${escapeHtml(id)}"` : ""}>${escapeHtml(label)}</span>
    ${count ? `<span class="rv-count">${count}</span>` : ""}
  </label>`;
}

function extrasBlock(hasSections) {
  return `<section class="rv-group">
      <h3>${escapeHtml(t("rv.extras"))}</h3>
      ${checkboxRow({ id: "cover", label: t("ex.cover"), checked: false })}
      ${hasSections ? checkboxRow({ id: "toc", label: t("ex.toc"), checked: false }) : ""}
      ${checkboxRow({ id: "links", label: t("ex.links"), checked: false })}
      ${checkboxRow({ id: "note", label: t("ex.note"), checked: false })}
      <textarea id="rv-note" rows="3" placeholder="${escapeHtml(t("ex.notePlaceholder"))}" hidden></textarea>
    </section>`;
}

// Vista previa de una página web: devuelve la selección o null si se cancela.
function openReview({ mode, info, previewHtml, fileName = "" }) {
  return new Promise(resolve => {
    const side = document.querySelector("#rv-side");
    const frame = document.querySelector("#rv-frame");
    const pagesGrid = document.querySelector("#rv-pages");
    const summary = document.querySelector("#rv-summary");
    const saveButton = document.querySelector("#rv-save");
    const error = document.querySelector("#rv-error");
    pagesGrid.hidden = true;
    frame.hidden = false;
    error.textContent = "";

    const partCount = part => (part === "images" ? info.images : info.parts[part]) || 0;
    const parts = PART_ORDER.filter(part => partCount(part) > 0);
    const state = {
      hiddenParts: new Set(DEFAULT_HIDDEN_PARTS.filter(part => parts.includes(part))),
      excludedSections: new Set(),
      extras: { cover: false, toc: false, links: false, note: false, noteText: "" },
      reader: false,
      annotations: emptyAnnotations()
    };
    const choices = () => ({
      hiddenParts: [...state.hiddenParts],
      excludedSections: [...state.excludedSections],
      extras: { ...state.extras },
      reader: state.reader,
      annotations: structuredClone(state.annotations),
      fileName: chosenFileName()
    });

    side.innerHTML = `
      <div class="rv-presets" role="group">
        <button type="button" class="rv-preset" data-preset="full">${escapeHtml(t("rv.presetFull"))}</button>
        <button type="button" class="rv-preset" data-preset="reader">${escapeHtml(t("rv.presetReader"))}</button>
      </div>
      <label class="rv-switch">
        <input type="checkbox" data-id="reader">
        <span><strong>${escapeHtml(t("rv.reader"))}</strong><small>${escapeHtml(t("rv.readerDesc"))}</small></span>
      </label>
      ${mode === "pdf" ? qualityBlock() : ""}
      ${parts.length ? `<section class="rv-group" data-group="parts"><h3>${escapeHtml(t("rv.parts"))}</h3>
        ${parts.map(part => checkboxRow({ id: `part:${part}`, label: t(`part.${part}`), count: partCount(part), checked: !state.hiddenParts.has(part) })).join("")}
      </section>` : ""}
      <section class="rv-group" data-group="sections">
        <div class="rv-group-head"><h3>${escapeHtml(t("rv.sections"))}</h3>
          ${info.sections.length ? `<span><button type="button" class="rv-link" data-all="1">${escapeHtml(t("rv.all"))}</button> · <button type="button" class="rv-link" data-all="0">${escapeHtml(t("rv.none"))}</button></span>` : ""}
        </div>
        ${info.sections.length
          ? `<div class="rv-sections">${info.sections.map(section => checkboxRow({ id: `sec:${section.id}`, label: section.label, level: Math.max(0, section.level - Math.min(...info.sections.map(s => s.level))), checked: true, action: "goto" })).join("")}</div>`
          : `<p class="rv-empty">${escapeHtml(t("rv.noSections"))}</p>`}
      </section>
      ${extrasBlock(info.sections.length > 0)}`;

    const note = side.querySelector("#rv-note");
    if (mode === "pdf") bindQuality(side.querySelector("[data-group=quality]"));
    const frameDocs = () => {
      const docs = [];
      const visit = doc => {
        if (!doc?.documentElement) return;
        docs.push(doc);
        doc.querySelectorAll("iframe").forEach(inner => {
          try {
            visit(inner.contentDocument);
          } catch {}
        });
      };
      try {
        visit(frame.contentDocument);
      } catch {}
      return docs;
    };

    // En modo lectura la vista previa es otro documento: se rehace solo cuando
    // cambia lo que se incluye (los extras los pone update()).
    let shownKey = "";
    const refreshFrame = () => {
      const current = choices();
      const key = state.reader ? JSON.stringify([current.hiddenParts, current.excludedSections]) : "";
      if (key === shownKey) return;
      shownKey = key;
      const noExtras = { cover: false, toc: false, links: false, note: false, noteText: "" };
      // Las marcas se pintan al cargar el marco (onload), como en la vista normal.
      frame.srcdoc = state.reader
        ? choicesTransform(info, { ...current, extras: noExtras, annotations: null, keepIds: true })(previewHtml, 0)
        : previewHtml;
    };

    const update = () => {
      const current = choices();
      // Lo quitado a mano se ve atenuado (no oculto) para poder recuperarlo.
      const css = choicesCss({ ...current, annotations: null });
      for (const doc of frameDocs()) {
        let style = doc.getElementById("fps-choices");
        if (!style) {
          style = doc.createElement("style");
          style.id = "fps-choices";
          (doc.head || doc.documentElement).append(style);
        }
        style.textContent = css;
      }
      const top = frame.contentDocument;
      if (top?.body) {
        top.getElementById("fps-extras")?.remove();
        const extras = extrasHtml(info, current);
        if (extras) top.body.insertAdjacentHTML("afterbegin", extras);
      }
      const included = includedSections(info, current).length;
      summary.textContent = info.sections.length
        ? t("rv.summary", { n: included, total: info.sections.length })
        : t("rv.subtitle");
      side.querySelectorAll("[data-preset]").forEach(button => {
        const hidden = button.dataset.preset === "reader" ? READER_HIDDEN_PARTS : DEFAULT_HIDDEN_PARTS;
        const expected = new Set(hidden.filter(part => parts.includes(part)));
        const active = expected.size === state.hiddenParts.size && [...expected].every(part => state.hiddenParts.has(part));
        button.classList.toggle("is-active", active);
      });
      saveButton.textContent = mode === "pdf" ? t("rv.savePdf") : t("rv.saveHtml");
    };

    const syncChecks = () => {
      side.querySelectorAll("input[type=checkbox]").forEach(input => {
        const [kind, value] = input.dataset.id.split(":");
        if (kind === "part") input.checked = !state.hiddenParts.has(value);
        if (kind === "sec") input.checked = !state.excludedSections.has(value);
      });
    };

    side.onchange = event => {
      const input = event.target.closest("input[type=checkbox]");
      if (!input) return;
      const [kind, value] = input.dataset.id.split(":");
      if (kind === "reader") {
        state.reader = input.checked;
      } else if (kind === "part") {
        if (input.checked) state.hiddenParts.delete(value);
        else state.hiddenParts.add(value);
      } else if (kind === "sec") {
        if (input.checked) state.excludedSections.delete(value);
        else state.excludedSections.add(value);
      } else {
        state.extras[kind] = input.checked;
        if (kind === "note") {
          note.hidden = !input.checked;
          if (input.checked) note.focus();
        }
      }
      error.textContent = "";
      refreshFrame();
      update();
    };
    note.oninput = () => {
      state.extras.noteText = note.value;
      update();
    };
    side.onclick = event => {
      const preset = event.target.closest("[data-preset]");
      if (preset) {
        const hidden = preset.dataset.preset === "reader" ? READER_HIDDEN_PARTS : DEFAULT_HIDDEN_PARTS;
        state.hiddenParts = new Set(hidden.filter(part => parts.includes(part)));
        syncChecks();
        refreshFrame();
        update();
        return;
      }
      const all = event.target.closest("[data-all]");
      if (all) {
        state.excludedSections = all.dataset.all === "1" ? new Set() : new Set(info.sections.map(section => section.id));
        syncChecks();
        refreshFrame();
        update();
        return;
      }
      // Pulsar el nombre de una sección la muestra en la vista previa.
      const label = event.target.closest("[data-action=goto]");
      if (label) {
        event.preventDefault();
        const id = label.dataset.target.split(":")[1];
        const target = frame.contentDocument?.querySelector(`[data-fps-head="${id}"]`) || frame.contentDocument?.querySelector(`[data-fps-sec~="${id}"]`);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          target.classList.add("fps-flash");
          setTimeout(() => target.classList.remove("fps-flash"), 1200);
        }
      }
    };

    // ---------- Marcar en la vista previa: resaltar, quitar y anotar ----------
    const tools = document.querySelector("#rv-tools");
    const toolHint = document.querySelector("#rv-tools-hint");
    const undoButton = document.querySelector("#rv-undo");
    const BLOCKS = "p, li, h1, h2, h3, h4, h5, h6, blockquote, pre, figure, table, img, picture, video, dd, dt, tr";
    const history = [];
    let tool = "none";
    let nextKey = 1;
    let hovered = null;
    tools.hidden = false;

    // Bloque que se quita o junto al que va la nota: un párrafo, imagen,
    // tabla… de la página (con su número), o una nota ya puesta.
    const blockOf = target => {
      if (!target?.closest) return null;
      const placed = target.closest("[data-fps-note]");
      if (placed) return placed;
      const numbered = (target.closest(BLOCKS) || target).closest("[data-fps-id]");
      return numbered && !numbered.closest("#fps-extras") ? numbered : null;
    };
    const renderAnnotations = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;
      clearAnnotationsInDoc(doc);
      applyAnnotationsInDoc(state.annotations, doc);
      let style = doc.getElementById("fps-annotation-style");
      if (!style) {
        style = doc.createElement("style");
        style.id = "fps-annotation-style";
        (doc.head || doc.documentElement).append(style);
      }
      const removed = state.annotations.removed.map(id => `[data-fps-id="${id}"]`).join(",");
      style.textContent = ".fps-hover { outline: 2px dashed #6366f1 !important; outline-offset: 2px; cursor: pointer !important; }"
        + "html[data-fps-tool=highlight] body { cursor: text; }"
        + (removed ? `${removed} { opacity: .28 !important; outline: 2px dashed #ef4444 !important; outline-offset: 2px; }` : "");
      doc.documentElement.dataset.fpsTool = tool;
      const count = state.annotations.highlights.length + state.annotations.removed.length + state.annotations.notes.length;
      undoButton.disabled = !history.length;
      undoButton.textContent = count ? `${t("ann.undo")} (${count})` : t("ann.undo");
    };
    const setTool = name => {
      tool = name;
      tools.querySelectorAll("[data-tool]").forEach(button => button.classList.toggle("is-active", button.dataset.tool === tool));
      toolHint.textContent = tool === "none" ? "" : t(`ann.${tool}Hint`);
      hovered?.classList.remove("fps-hover");
      hovered = null;
      if (frame.contentDocument?.documentElement) frame.contentDocument.documentElement.dataset.fpsTool = tool;
    };
    tools.onclick = event => {
      const button = event.target.closest("[data-tool]");
      if (button) setTool(button.dataset.tool);
      if (!event.target.closest("#rv-undo")) return;
      const last = history.pop();
      if (!last) return;
      const list = state.annotations;
      if (last.type === "highlight") list.highlights = list.highlights.filter(item => item.key !== last.key);
      if (last.type === "note") list.notes = list.notes.filter(item => item.key !== last.key);
      if (last.type === "deleteNote") list.notes.push(last.note);
      if (last.type === "remove") {
        list.removed = list.removed.filter(id => id !== last.id);
        if (last.wasRemoved) list.removed.push(last.id);
      }
      renderAnnotations();
    };
    const bindTools = doc => {
      // Resaltar: al soltar el ratón después de seleccionar texto.
      doc.addEventListener("mouseup", () => {
        if (tool !== "highlight") return;
        const selection = doc.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const text = range.toString();
        let container = range.commonAncestorContainer;
        if (container.nodeType !== Node.ELEMENT_NODE) container = container.parentElement;
        const element = container?.closest("[data-fps-id]");
        selection.removeAllRanges();
        if (!text.trim() || !element || element.closest("#fps-extras")) return;
        const before = doc.createRange();
        before.selectNodeContents(element);
        before.setEnd(range.startContainer, range.startOffset);
        const key = `h${nextKey++}`;
        state.annotations.highlights.push({ key, id: element.getAttribute("data-fps-id"), start: before.toString().length, text });
        history.push({ type: "highlight", key });
        renderAnnotations();
      });
      doc.addEventListener("mouseover", event => {
        if (tool !== "remove" && tool !== "note") return;
        const block = blockOf(event.target);
        if (block === hovered) return;
        hovered?.classList.remove("fps-hover");
        hovered = block;
        hovered?.classList.add("fps-hover");
      });
      // Quitar y anotar: con un clic sobre el bloque.
      doc.addEventListener("click", event => {
        if (tool !== "remove" && tool !== "note") return;
        event.preventDefault();
        event.stopPropagation();
        const block = blockOf(event.target);
        if (!block) return;
        const list = state.annotations;
        if (block.matches("[data-fps-note]")) {
          const placed = list.notes.find(item => item.key === block.getAttribute("data-fps-note"));
          list.notes = list.notes.filter(item => item !== placed);
          if (placed) history.push({ type: "deleteNote", note: placed });
        } else if (tool === "remove") {
          const id = block.getAttribute("data-fps-id");
          const wasRemoved = list.removed.includes(id);
          list.removed = wasRemoved ? list.removed.filter(item => item !== id) : [...list.removed, id];
          history.push({ type: "remove", id, wasRemoved });
        } else {
          const text = window.prompt(t("ann.notePrompt"));
          if (!text?.trim()) return;
          const key = `n${nextKey++}`;
          list.notes.push({ key, id: block.getAttribute("data-fps-id"), text: text.trim() });
          history.push({ type: "note", key });
        }
        hovered = null;
        renderAnnotations();
      }, true);
    };
    setTool("none");

    frame.onload = () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      bindTools(doc);
      renderAnnotations();
      const flash = doc.createElement("style");
      flash.textContent = ".fps-flash { outline: 3px solid #f59e0b !important; outline-offset: 4px; transition: outline-color .3s; }";
      (doc.head || doc.documentElement).append(flash);
      // Enlaces del índice dentro de la vista previa: se desplaza en vez de navegar.
      doc.addEventListener("click", event => {
        const link = event.target.closest("a");
        if (!link) return;
        event.preventDefault();
        const id = link.dataset.fpsToc;
        if (id) doc.querySelector(`[data-fps-head="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      update();
      // Los marcos internos cargan después: se les aplica la selección también.
      doc.querySelectorAll("iframe").forEach(inner => inner.addEventListener("load", update));
    };
    frame.srcdoc = previewHtml;

    const finish = value => {
      document.querySelector("#rv-cancel").onclick = null;
      saveButton.onclick = null;
      frame.onload = null;
      tools.onclick = null;
      tools.hidden = true;
      resolve(value);
    };
    document.querySelector("#rv-cancel").onclick = () => finish(null);
    saveButton.onclick = () => {
      const current = choices();
      if (info.sections.length && !includedSections(info, current).length) {
        error.textContent = t("err.nothingSelected");
        return;
      }
      finish(current);
    };

    setFileNameField(fileName, mode === "pdf" ? ".pdf" : ".html");
    update();
    setReviewVisible(true);
  });
}

// Vista previa de las páginas de un visor de PDF: devuelve las elegidas.
function openPagesReview({ pages, fileName = "" }) {
  return new Promise(resolve => {
    const side = document.querySelector("#rv-side");
    const frame = document.querySelector("#rv-frame");
    const grid = document.querySelector("#rv-pages");
    const summary = document.querySelector("#rv-summary");
    const saveButton = document.querySelector("#rv-save");
    const error = document.querySelector("#rv-error");
    frame.hidden = true;
    grid.hidden = false;
    error.textContent = "";
    const selected = new Set(pages.map((_, index) => index));
    const extras = { cover: false, toc: false, links: false, note: false, noteText: "" };

    side.innerHTML = `
      <section class="rv-group">
        <div class="rv-group-head"><h3>${escapeHtml(t("rv.pages"))}</h3>
          <span><button type="button" class="rv-link" data-all="1">${escapeHtml(t("rv.all"))}</button> · <button type="button" class="rv-link" data-all="0">${escapeHtml(t("rv.none"))}</button></span>
        </div>
        <label class="rv-range"><span>${escapeHtml(t("rv.range"))}</span>
          <input id="rv-range" type="text" placeholder="${escapeHtml(t("rv.rangePlaceholder"))}" autocomplete="off"></label>
      </section>
      <section class="rv-group">
        <h3>${escapeHtml(t("rv.extras"))}</h3>
        ${checkboxRow({ id: "cover", label: t("ex.cover"), checked: false })}
        ${checkboxRow({ id: "note", label: t("ex.note"), checked: false })}
        <textarea id="rv-note" rows="3" placeholder="${escapeHtml(t("ex.notePlaceholder"))}" hidden></textarea>
      </section>
      ${qualityBlock()}`;
    bindQuality(side.querySelector("[data-group=quality]"));

    grid.innerHTML = pages.map((page, index) => `
      <button type="button" class="rv-page is-on" data-index="${index}" aria-pressed="true">
        <img src="${page.dataUrl}" alt="">
        <span class="rv-page-check" aria-hidden="true">✓</span>
        <span class="rv-page-number">${escapeHtml(t("rv.pageN", { n: index + 1 }))}</span>
      </button>`).join("");

    const update = () => {
      grid.querySelectorAll(".rv-page").forEach(button => {
        const on = selected.has(Number(button.dataset.index));
        button.classList.toggle("is-on", on);
        button.setAttribute("aria-pressed", String(on));
      });
      summary.textContent = t("rv.pagesSummary", { n: selected.size, total: pages.length });
      saveButton.textContent = t("rv.savePdf");
    };
    const parseRange = value => {
      const result = new Set();
      for (const part of value.split(/[,;\s]+/).filter(Boolean)) {
        const [from, to] = part.split("-").map(Number);
        if (!from) continue;
        for (let n = from; n <= (to || from); n++) if (n >= 1 && n <= pages.length) result.add(n - 1);
      }
      return result;
    };

    grid.onclick = event => {
      const button = event.target.closest(".rv-page");
      if (!button) return;
      const index = Number(button.dataset.index);
      if (selected.has(index)) selected.delete(index);
      else selected.add(index);
      error.textContent = "";
      update();
    };
    side.onclick = event => {
      const all = event.target.closest("[data-all]");
      if (!all) return;
      selected.clear();
      if (all.dataset.all === "1") pages.forEach((_, index) => selected.add(index));
      update();
    };
    side.oninput = event => {
      if (event.target.id === "rv-range") {
        const range = parseRange(event.target.value);
        if (range.size) {
          selected.clear();
          range.forEach(index => selected.add(index));
          update();
        }
      } else if (event.target.id === "rv-note") {
        extras.noteText = event.target.value;
      }
    };
    side.onchange = event => {
      const input = event.target.closest("input[type=checkbox]");
      if (!input) return;
      extras[input.dataset.id] = input.checked;
      if (input.dataset.id === "note") side.querySelector("#rv-note").hidden = !input.checked;
    };

    const finish = value => {
      document.querySelector("#rv-cancel").onclick = null;
      saveButton.onclick = null;
      resolve(value);
    };
    document.querySelector("#rv-cancel").onclick = () => finish(null);
    saveButton.onclick = () => {
      if (!selected.size) {
        error.textContent = t("err.nothingSelected");
        return;
      }
      finish({ selected: [...selected].sort((a, b) => a - b), extras: { ...extras }, fileName: chosenFileName() });
    };

    setFileNameField(fileName, ".pdf");
    update();
    setReviewVisible(true);
  });
}

// Varias pestañas: el usuario marca cuáles guardar y cómo. Devuelve
// { tabIds, format, clean, reader } o null si se cancela.
function openTabsReview({ tabs }) {
  return new Promise(resolve => {
    const side = document.querySelector("#rv-side");
    const frame = document.querySelector("#rv-frame");
    const grid = document.querySelector("#rv-pages");
    const summary = document.querySelector("#rv-summary");
    const saveButton = document.querySelector("#rv-save");
    const error = document.querySelector("#rv-error");
    frame.hidden = true;
    grid.hidden = false;
    grid.classList.add("rv-tabs");
    error.textContent = "";
    const selected = new Set(tabs.map(tab => tab.id));
    const options = { format: "html", clean: true, reader: false };

    const formatRow = (value, label) => `<label class="rv-row">
        <input type="radio" name="rv-format" value="${value}" ${options.format === value ? "checked" : ""}>
        <span class="rv-label">${escapeHtml(label)}</span>
      </label>`;
    side.innerHTML = `
      <section class="rv-group" style="margin-top: 0">
        <h3>${escapeHtml(t("rv.format"))}</h3>
        ${formatRow("html", t("fmt.html"))}
        ${formatRow("pdf", t("fmt.pdf"))}
        ${formatRow("merged", t("fmt.merged"))}
      </section>
      <section class="rv-group">
        <h3>${escapeHtml(t("rv.options"))}</h3>
        ${checkboxRow({ id: "clean", label: t("opt.clean"), checked: true })}
      </section>
      ${qualityBlock()}
      <label class="rv-switch">
        <input type="checkbox" data-id="reader">
        <span><strong>${escapeHtml(t("rv.reader"))}</strong><small>${escapeHtml(t("rv.readerDesc"))}</small></span>
      </label>
      <section class="rv-group">
        <div class="rv-group-head"><h3>${escapeHtml(t("rv.tabs"))}</h3>
          <span><button type="button" class="rv-link" data-all="1">${escapeHtml(t("rv.all"))}</button> · <button type="button" class="rv-link" data-all="0">${escapeHtml(t("rv.none"))}</button></span>
        </div>
        <p class="rv-empty">${escapeHtml(t("batch.hint"))}</p>
      </section>`;

    const host = url => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return url;
      }
    };
    grid.innerHTML = tabs.map(tab => `
      <button type="button" class="rv-tab is-on" data-id="${tab.id}" aria-pressed="true">
        <span class="rv-tab-icon">${/^https?:/i.test(tab.favIconUrl || "") ? `<img src="${escapeHtml(tab.favIconUrl)}" alt="">` : escapeHtml(host(tab.url).slice(0, 1).toUpperCase())}</span>
        <span class="rv-tab-copy"><strong>${escapeHtml(tab.title || tab.url)}</strong><span>${escapeHtml(host(tab.url))}</span></span>
        <span class="rv-page-check" aria-hidden="true">✓</span>
      </button>`).join("");
    const qualityGroup = side.querySelector("[data-group=quality]");
    bindQuality(qualityGroup);
    grid.querySelectorAll(".rv-tab-icon img").forEach(image => {
      image.onerror = () => image.remove();
    });

    const update = () => {
      grid.querySelectorAll(".rv-tab").forEach(button => {
        const on = selected.has(Number(button.dataset.id));
        button.classList.toggle("is-on", on);
        button.setAttribute("aria-pressed", String(on));
      });
      summary.textContent = t("rv.tabsSummary", { n: selected.size, total: tabs.length });
      qualityGroup.hidden = options.format === "html";
      saveButton.textContent = options.format === "html" ? t("rv.saveHtml") : t("rv.savePdf");
    };

    grid.onclick = event => {
      const button = event.target.closest(".rv-tab");
      if (!button) return;
      const id = Number(button.dataset.id);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      error.textContent = "";
      update();
    };
    side.onclick = event => {
      const all = event.target.closest("[data-all]");
      if (!all) return;
      selected.clear();
      if (all.dataset.all === "1") tabs.forEach(tab => selected.add(tab.id));
      update();
    };
    side.onchange = event => {
      if (event.target.name === "rv-format") options.format = event.target.value;
      else if (event.target.dataset.id) options[event.target.dataset.id] = event.target.checked;
      update();
    };

    const finish = value => {
      document.querySelector("#rv-cancel").onclick = null;
      saveButton.onclick = null;
      grid.classList.remove("rv-tabs");
      resolve(value);
    };
    document.querySelector("#rv-cancel").onclick = () => finish(null);
    saveButton.onclick = () => {
      if (!selected.size) {
        error.textContent = t("err.noTabSelected");
        return;
      }
      // En el orden de las pestañas de la ventana.
      finish({ tabIds: tabs.filter(tab => selected.has(tab.id)).map(tab => tab.id), ...options });
    };

    // Cada pestaña se guarda con su propio título.
    setFileNameField(null);
    update();
    setReviewVisible(true);
  });
}

// ---------- Tamaño y calidad del PDF ----------

const QUALITY_KEY = "fps-quality";
const QUALITY_LEVELS = ["light", "normal", "max"];

function storedQuality() {
  try {
    const value = localStorage.getItem(QUALITY_KEY);
    return QUALITY_LEVELS.includes(value) ? value : "normal";
  } catch {
    return "normal";
  }
}

function qualityBlock() {
  return `<section class="rv-group" data-group="quality">
      <h3>${escapeHtml(t("rv.quality"))}</h3>
      <div class="rv-presets rv-quality" role="group">
        ${QUALITY_LEVELS.map(level => `<button type="button" class="rv-preset" data-quality="${level}">${escapeHtml(t(`quality.${level}`))}</button>`).join("")}
      </div>
      <p class="rv-empty rv-quality-hint"></p>
    </section>`;
}

// La elección se recuerda para la próxima vez.
function bindQuality(group) {
  if (!group) return;
  const paint = () => {
    const level = storedQuality();
    group.querySelectorAll("[data-quality]").forEach(button => button.classList.toggle("is-active", button.dataset.quality === level));
    group.querySelector(".rv-quality-hint").textContent = t(`quality.${level}Hint`);
  };
  group.addEventListener("click", event => {
    const button = event.target.closest("[data-quality]");
    if (!button) return;
    try {
      localStorage.setItem(QUALITY_KEY, button.dataset.quality);
    } catch {}
    paint();
  });
  paint();
}

// Intro guarda desde la vista previa (salvo escribiendo en un campo).
document.addEventListener("keydown", event => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  if (!document.body.classList.contains("reviewing") || event.target.closest?.("textarea, input, button, select")) return;
  event.preventDefault();
  document.querySelector("#rv-save")?.click();
});
