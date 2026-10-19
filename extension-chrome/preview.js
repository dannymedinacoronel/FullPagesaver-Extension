const summary = document.querySelector("#summary");
const status = document.querySelector("#status");
const pagesElement = document.querySelector("#pages");
const printButton = document.querySelector("#print");
const deleteButton = document.querySelector("#delete-job");
const fileSelect = document.querySelector("#file-select");
const downloadButton = document.querySelector("#download");
const nameInput = document.querySelector("#pdf-name");
// Nombre con el que se guardará cada PDF (uno por archivo, o uno si se juntan).
let pdfNames = [];
const jobId = new URLSearchParams(location.search).get("job");

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pagina-completa-pdf", 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(t("pv.dbOpen")));
  });
}

async function readJob(id) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction("jobs", "readonly").objectStore("jobs").get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error(t("pv.dbRead")));
    });
  } finally {
    database.close();
  }
}

async function deleteJob(id) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("jobs", "readwrite");
      transaction.objectStore("jobs").delete(id);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error(t("pv.dbDelete")));
    });
  } finally {
    database.close();
  }
}

function pageDimensions(paper, orientation) {
  const sizes = {
    A4: [210, 297],
    Letter: [215.9, 279.4],
    A3: [297, 420],
    Legal: [215.9, 355.6]
  };
  const [shortSide, longSide] = sizes[paper] || sizes.A4;
  return orientation === "landscape"
    ? [longSide, shortSide]
    : [shortSide, longSide];
}

// Nombre de un archivo sin la extensión (.html, .htm…).
const baseName = name => String(name || "").replace(/\.[^.]+$/, "").trim();

// Nombre sugerido al juntar varios HTML: lo que tienen en común al principio
// («Tema A», «Tema B» → «Tema»), o el primero «y N más».
function suggestCombinedName(sources) {
  const names = sources.map(baseName).filter(Boolean);
  if (names.length <= 1) return names[0] || t("pv.combinedName", { n: sources.length });
  let prefix = names[0];
  for (const name of names) {
    while (prefix && !name.toLowerCase().startsWith(prefix.toLowerCase())) prefix = prefix.slice(0, -1);
  }
  prefix = prefix.replace(/[\s\-_.,·:;(]+$/, "").trim();
  return prefix.length >= 3
    ? t("pv.combinedPrefix", { name: prefix, n: names.length })
    : t("pv.combinedSuggest", { name: names[0], n: names.length - 1 });
}

function getOutputFiles(job) {
  if (Array.isArray(job.files) && job.files.length) return job.files;
  return [{ name: job.title, pages: job.pages || [] }];
}

function updateSelectedFile(job, files, failuresByFile) {
  const selectedIndex = Number(fileSelect.value) || 0;
  const file = files[selectedIndex];
  if (!file) {
    printButton.disabled = true;
    summary.textContent = t("pv.noFiles");
    status.textContent = t("pv.goBack");
    return;
  }

  for (const page of pagesElement.children) {
    page.hidden = page.dataset.fileIndex !== String(selectedIndex);
  }
  nameInput.value = pdfNames[selectedIndex] || "";
  nameInput.disabled = false;
  const failures = failuresByFile[selectedIndex] || 0;
  const pageCount = file.pages.length;
  summary.textContent = job.files
    ? t("pv.summaryMulti", { i: selectedIndex + 1, total: files.length, pages: pageCount, name: file.name })
    : t("pv.summary", { pages: pageCount, name: file.name });
  document.title = `${file.name.replace(/\.[^.]+$/, "")} - PDF`;
  status.textContent = failures
    ? t("pv.failed", { n: failures })
    : t("pv.ready");
  printButton.disabled = failures > 0 || pageCount === 0;
  const totalFailures = failuresByFile.reduce((sum, value) => sum + value, 0);
  downloadButton.disabled = totalFailures > 0 || !files.some(item => item.pages.length);
  downloadButton.textContent = job.files ? t("pv.downloadAll", { n: files.length }) : t("pv.download");
}

// ---------- Descargar los PDF directamente ----------

// Cada hoja se dibuja como en la vista previa (papel, margen y ajuste) a
// 150 ppp y se guarda con el generador de PDF de la extensión: sin pasar por
// el diálogo de impresión y con un archivo por cada HTML si se pide así.
const SHEET_DPI = 150;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(t("pv.imageError")));
    image.src = src;
  });
}

async function makeSheet(src, options) {
  const [widthMm, heightMm] = pageDimensions(options.paper, options.orientation);
  const px = mm => Math.round(mm / 25.4 * SHEET_DPI);
  const canvas = document.createElement("canvas");
  canvas.width = px(widthMm);
  canvas.height = px(heightMm);
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const image = await loadImage(src);
  const margin = px(options.margin || 0);
  const boxWidth = canvas.width - margin * 2;
  const boxHeight = canvas.height - margin * 2;
  const fitScale = options.fit === "cover"
    ? Math.max(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight)
    : Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight);
  const width = image.naturalWidth * fitScale;
  const height = image.naturalHeight * fitScale;
  context.save();
  context.beginPath();
  context.rect(margin, margin, boxWidth, boxHeight);
  context.clip();
  context.drawImage(image, margin + (boxWidth - width) / 2, margin + (boxHeight - height) / 2, width, height);
  context.restore();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error(t("pv.imageError"));
  return {
    width: canvas.width,
    height: canvas.height,
    bytes: new Uint8Array(await blob.arrayBuffer()),
    pageWidthPt: widthMm * 72 / 25.4,
    pageHeightPt: heightMm * 72 / 25.4
  };
}

function safeFileName(value) {
  const cleaned = String(value || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
    .slice(0, 150);
  return cleaned || "documento";
}

// Espera a que Chrome termine de guardar el archivo (si la página se cerrara
// antes, el PDF quedaría vacío).
async function saveBlob(blob, filename, ask) {
  const { url, cleanup } = await prepareDownloadUrl(blob, filename);
  await registerDownloadName(url, filename);
  try {
    const id = await chrome.downloads.download({ url, filename, saveAs: ask, conflictAction: "uniquify" });
    if (id === undefined) throw new Error(t("pv.downloadCanceled"));
    await new Promise(resolve => {
      const listener = delta => {
        if (delta.id === id && delta.state && delta.state.current !== "in_progress") {
          chrome.downloads.onChanged.removeListener(listener);
          resolve();
        }
      };
      chrome.downloads.onChanged.addListener(listener);
      chrome.downloads.search({ id }).then(([item]) => {
        if (item && item.state !== "in_progress") {
          chrome.downloads.onChanged.removeListener(listener);
          resolve();
        }
      });
    });
  } finally {
    setTimeout(cleanup, 60_000);
  }
}

async function downloadJob(job) {
  // Cada archivo con su posición en la lista (la de su nombre en pdfNames).
  const files = getOutputFiles(job).map((file, position) => ({ ...file, position })).filter(file => file.pages.length);
  const separate = Boolean(job.files);
  const [widthMm, heightMm] = pageDimensions(job.options.paper, job.options.orientation);
  downloadButton.disabled = true;
  printButton.disabled = true;
  try {
    for (const [index, file] of files.entries()) {
      const sheets = [];
      for (const [pageIndex, page] of file.pages.entries()) {
        status.textContent = separate
          ? t("pv.buildingMulti", { i: index + 1, total: files.length, n: pageIndex + 1, pages: file.pages.length })
          : t("pv.building", { n: pageIndex + 1, pages: file.pages.length });
        sheets.push(await makeSheet(page.src, job.options));
      }
      const pdf = createPdfBlob(sheets, widthMm, heightMm);
      // Varios archivos: van todos juntos, sin preguntar, a una carpeta de Descargas.
      // Con el nombre que se ve en «Nombre del PDF» (el del HTML original o
      // el sugerido, si no se ha cambiado).
      const name = safeFileName(pdfNames[file.position] || baseName(file.name));
      if (separate) await saveBlob(pdf, `FullPage Saver/${name}.pdf`, false);
      else await saveBlob(pdf, `${name}.pdf`, true);
    }
    status.textContent = separate ? t("pv.downloadedMulti", { n: files.length }) : t("pv.downloaded");
  } catch (error) {
    status.textContent = t("pv.downloadError", { msg: error.message });
  } finally {
    downloadButton.disabled = false;
    printButton.disabled = false;
  }
}

async function renderJob(job) {
  const [width, height] = pageDimensions(job.options.paper, job.options.orientation);
  document.documentElement.style.setProperty("--sheet-width", `${width}mm`);
  document.documentElement.style.setProperty("--sheet-height", `${height}mm`);
  document.documentElement.style.setProperty("--sheet-margin", `${job.options.margin}mm`);
  document.documentElement.style.setProperty(
    "--image-fit",
    job.options.fit === "cover" ? "cover" : "contain"
  );
  const orientation = job.options.orientation === "landscape" ? "landscape" : "portrait";
  const printStyle = document.createElement("style");
  printStyle.textContent = `@page { size: ${job.options.paper} ${orientation}; margin: 0; }`;
  document.head.append(printStyle);

  const files = getOutputFiles(job);
  pdfNames = job.files
    ? files.map(file => baseName(file.name))
    : [suggestCombinedName([...new Set(files[0].pages.map(page => page.source))])];
  if (job.files) {
    fileSelect.replaceChildren();
    for (const [index, file] of files.entries()) {
      fileSelect.add(new Option(`${index + 1}. ${file.name}`, String(index)));
    }
    fileSelect.hidden = false;
  }

  const failuresByFile = new Array(files.length).fill(0);
  await Promise.all(files.flatMap((file, fileIndex) =>
    file.pages.map((pageData, pageIndex) => new Promise(resolve => {
      const page = document.createElement("section");
      page.className = "page";
      if (pageIndex === file.pages.length - 1) {
        page.classList.add("is-last-in-file");
      }
      page.dataset.fileIndex = String(fileIndex);
      page.setAttribute("aria-label", t("pv.pageLabel", { name: file.name, n: pageIndex + 1 }));
      const image = document.createElement("img");
      image.src = pageData.src;
      image.alt = t("pv.pageLabel", { name: file.name, n: pageIndex + 1 });
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => {
        failuresByFile[fileIndex]++;
        resolve();
      }, { once: true });
      page.append(image);
      pagesElement.append(page);
    }))
  ));

  fileSelect.value = "0";
  updateSelectedFile(job, files, failuresByFile);
  fileSelect.addEventListener("change", () => {
    updateSelectedFile(job, files, failuresByFile);
  });
}

printButton.addEventListener("click", () => window.print());
nameInput.addEventListener("input", () => {
  pdfNames[Number(fileSelect.value) || 0] = nameInput.value;
});
let loadedJob = null;
downloadButton.addEventListener("click", () => {
  if (loadedJob) downloadJob(loadedJob);
});

deleteButton.addEventListener("click", async () => {
  if (!jobId) return;
  deleteButton.disabled = true;
  try {
    await deleteJob(jobId);
    pagesElement.replaceChildren();
    fileSelect.replaceChildren();
    fileSelect.hidden = true;
    printButton.disabled = true;
    downloadButton.disabled = true;
    loadedJob = null;
    summary.textContent = t("pv.deleted");
    status.textContent = t("pv.deletedDesc");
  } catch (error) {
    status.textContent = t("pv.deleteError", { msg: error.message });
    deleteButton.disabled = false;
  }
});

// Archivos que se quedaron fuera porque no tienen las páginas del documento.
function showSkipped(job) {
  const box = document.querySelector("#skipped");
  if (!job.skipped?.length) return;
  box.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = t("pv.skippedTitle", { n: job.skipped.length, total: job.total || job.skipped.length });
  const hint = document.createElement("div");
  hint.textContent = t("pv.skippedHint");
  const list = document.createElement("ul");
  for (const name of job.skipped) {
    const item = document.createElement("li");
    item.textContent = name;
    list.append(item);
  }
  box.append(title, hint, list);
  box.hidden = false;
}

async function init() {
  if (!jobId) {
    summary.textContent = t("pv.noJob");
    status.textContent = t("pv.goBack");
    return;
  }

  try {
    const job = await readJob(jobId);
    if (!job) {
      summary.textContent = t("pv.gone");
      status.textContent = t("pv.goBack");
      return;
    }
    loadedJob = job;
    showSkipped(job);
    await renderJob(job);
  } catch (error) {
    summary.textContent = t("pv.openError");
    status.textContent = error.message;
  }
}

init();
