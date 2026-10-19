// Generador de PDF propio (PDF 1.4): cada hoja es una imagen JPEG con, si se
// quiere, una capa de texto invisible encima para poder seleccionar y buscar.
// Lo usan la ventana de guardado (save.js) y el conversor de HTML a PDF
// (preview.js).

function encodeText(value) {
  return new TextEncoder().encode(value);
}

// ---------- Capa de texto invisible (texto seleccionable en el PDF) ----------

// Ancho de los caracteres 32–126 de Helvetica, en milésimas del cuerpo.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584
];
// Caracteres de WinAnsiEncoding fuera de Latin-1.
const WIN_ANSI_EXTRA = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88, "‰": 0x89, "Š": 0x8a,
  "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f
};

// Código WinAnsi del carácter: cubre los siete idiomas de la extensión. Lo
// demás se cambia por su letra base (ā → a) o por «?».
function winAnsiCode(char) {
  const code = char.codePointAt(0);
  if ((code >= 32 && code <= 126) || (code >= 0xa0 && code <= 0xff)) return code;
  if (WIN_ANSI_EXTRA[char]) return WIN_ANSI_EXTRA[char];
  if (/\s/.test(char)) return 32;
  const base = char.normalize("NFD").codePointAt(0);
  return base >= 32 && base <= 126 ? base : 63;
}

function winAnsiWidth(code) {
  if (code >= 32 && code <= 126) return HELVETICA_WIDTHS[code - 32];
  const base = String.fromCharCode(code).normalize("NFD").codePointAt(0);
  return base >= 32 && base <= 126 ? HELVETICA_WIDTHS[base - 32] : 556;
}

// Texto invisible (modo 3) colocado encima de la imagen: no se ve, pero se
// puede seleccionar, copiar y buscar. Cada línea se estira (Tz) para ocupar
// exactamente el ancho que tiene en la captura. Las medidas van en puntos
// desde la esquina superior izquierda de la hoja.
function textLayerOps(runs, pageHeightPt) {
  if (!runs?.length) return "";
  let ops = "BT\n3 Tr\n";
  for (const run of runs) {
    const codes = Array.from(run.text, winAnsiCode);
    const natural = codes.reduce((total, code) => total + winAnsiWidth(code), 0);
    if (!natural || !(run.w > 0) || !(run.h > 0)) continue;
    const size = run.h * 0.85;
    const stretch = Math.min(1000, Math.max(5, run.w / (natural * size / 1000) * 100));
    const baseline = pageHeightPt - run.top - run.h * 0.8;
    const hex = codes.map(code => code.toString(16).padStart(2, "0")).join("");
    ops += `/F1 ${size.toFixed(2)} Tf ${stretch.toFixed(1)} Tz 1 0 0 1 ${run.x.toFixed(2)} ${baseline.toFixed(2)} Tm <${hex}> Tj\n`;
  }
  return `${ops}ET\n`;
}

// Cada página puede traer su propio tamaño en puntos (pageWidthPt/pageHeightPt,
// y entonces la imagen la llena) o la altura de la imagen (imageHeightPt); si
// no, se usa el papel elegido. Con text, lleva su capa de texto.
function createPdfBlob(jpegPages, pageWidthMm, pageHeightMm) {
  const pageCount = jpegPages.length;
  const fontObjectId = 3 + pageCount * 3;
  const objectCount = fontObjectId;
  const objects = new Array(objectCount + 1);
  objects[fontObjectId] = { parts: [encodeText("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")] };

  objects[1] = { parts: [encodeText("<< /Type /Catalog /Pages 2 0 R >>")] };
  objects[2] = {
    parts: [
      encodeText(
        `<< /Type /Pages /Kids [${jpegPages.map((_, index) => `${3 + index * 3} 0 R`).join(" ")}] /Count ${pageCount} >>`
      )
    ]
  };

  jpegPages.forEach((jpeg, index) => {
    const pageWidthPt = jpeg.pageWidthPt || pageWidthMm * 72 / 25.4;
    const pageHeightPt = jpeg.pageHeightPt || pageHeightMm * 72 / 25.4;
    const pageObjectId = 3 + index * 3;
    const imageObjectId = pageObjectId + 1;
    const contentObjectId = pageObjectId + 2;
    objects[pageObjectId] = {
      parts: [
        encodeText(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(3)} ${pageHeightPt.toFixed(3)}] /Resources << /XObject << /Im0 ${imageObjectId} 0 R >> /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`
        )
      ]
    };
    objects[imageObjectId] = {
      parts: [
        encodeText(
          `<< /Type /XObject /Subtype /Image /Width ${jpeg.width} /Height ${jpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.bytes.length} >>\nstream\n`
        ),
        jpeg.bytes,
        encodeText("\nendstream")
      ]
    };
    // Una página con tamaño propio se llena entera: el redondeo del canvas
    // dejaría una línea blanca abajo.
    const imageHeightPt = jpeg.imageHeightPt || jpeg.pageHeightPt || pageWidthPt * jpeg.height / jpeg.width;
    const content = encodeText(
      `q\n${pageWidthPt.toFixed(3)} 0 0 ${imageHeightPt.toFixed(3)} 0 ${(pageHeightPt - imageHeightPt).toFixed(3)} cm\n/Im0 Do\nQ\n${textLayerOps(jpeg.text, pageHeightPt)}`
    );
    objects[contentObjectId] = {
      parts: [
        encodeText(`<< /Length ${content.length} >>\nstream\n`),
        content,
        encodeText("\nendstream")
      ]
    };
  });

  const chunks = [encodeText("%PDF-1.4\n")];
  const offsets = new Array(objectCount + 1).fill(0);
  let byteOffset = chunks[0].length;
  for (let id = 1; id <= objectCount; id++) {
    offsets[id] = byteOffset;
    const objectParts = [
      encodeText(`${id} 0 obj\n`),
      ...objects[id].parts,
      encodeText("\nendobj\n")
    ];
    chunks.push(...objectParts);
    byteOffset += objectParts.reduce((total, part) => total + part.length, 0);
  }

  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= objectCount; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(encodeText(xref));
  return new Blob(chunks, { type: "application/pdf" });
}

// Dirección temporal para descargar un archivo que ya lleva su nombre.
function namedObjectUrl(blob, filename) {
  const name = String(filename).split("/").pop();
  return URL.createObjectURL(new File([blob], name, { type: blob.type || "application/octet-stream" }));
}

// Dirección de descarga cuyo final es el nombre del archivo. Con un blob: la
// dirección es un identificador y, si otra extensión interviene en las
// descargas (gestores de descargas, antivirus…), Chrome guarda el archivo con
// ese identificador («cb5d5c0d-….pdf»). Con un archivo temporal de la
// extensión (filesystem:…/Nombre.pdf), Chrome toma el nombre de la propia
// dirección. Si el sistema de archivos temporal no está disponible, se usa un
// blob. Devuelve { url, cleanup }: cleanup borra el temporal al terminar.
async function prepareDownloadUrl(blob, filename) {
  const name = String(filename).split("/").pop();
  const request = window.requestFileSystem || window.webkitRequestFileSystem;
  if (request) {
    try {
      const call = (method, ...args) => new Promise((resolve, reject) => method(...args, resolve, reject));
      const system = await call(request.bind(window), window.TEMPORARY, Math.max(blob.size * 2, 10 * 1024 * 1024));
      const folder = await call(system.root.getDirectory.bind(system.root), `fps-${crypto.randomUUID()}`, { create: true });
      const entry = await call(folder.getFile.bind(folder), name, { create: true });
      await new Promise((resolve, reject) => entry.createWriter(writer => {
        writer.onwriteend = resolve;
        writer.onerror = () => reject(writer.error);
        writer.write(blob);
      }, reject));
      return {
        url: entry.toURL(),
        cleanup: () => folder.removeRecursively(() => {}, () => {})
      };
    } catch {}
  }
  const url = namedObjectUrl(blob, filename);
  return { url, cleanup: () => URL.revokeObjectURL(url) };
}

// Avisa al service worker del nombre de una descarga para que lo mantenga
// aunque otra extensión intervenga en las descargas (ver background.js).
async function registerDownloadName(url, filename) {
  try {
    await chrome.runtime.sendMessage({ type: "fps-download-name", url, filename });
  } catch {}
}

function dataUrlToBytes(dataUrl) {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
