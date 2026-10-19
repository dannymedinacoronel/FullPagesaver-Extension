const fileInput = document.querySelector("#file-input");
const folderInput = document.querySelector("#folder-input");
const dropZone = document.querySelector("#drop-zone");
const fileList = document.querySelector("#file-list");
const emptyState = document.querySelector("#empty-state");
const fileCount = document.querySelector("#file-count");
const clearButton = document.querySelector("#clear-files");
const prepareButton = document.querySelector("#prepare");
const scopeSelect = document.querySelector("#scope");
const outputModeSelect = document.querySelector("#output-mode");
const status = document.querySelector("#status");

const selectedFiles = [];
let draggedFileId = null;
let idCounter = 0;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.dataset.error = String(isError);
}

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function renderQueue() {
  fileList.replaceChildren();
  selectedFiles.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "file-item";
    item.draggable = true;
    item.dataset.fileId = entry.id;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";
    handle.title = t("pdf.dragHandle");
    handle.setAttribute("aria-hidden", "true");

    const details = document.createElement("div");
    details.className = "file-details";
    const name = document.createElement("div");
    name.className = "file-name";
    name.textContent = entry.file.name;
    name.title = entry.file.name;
    const size = document.createElement("div");
    size.className = "file-size";
    size.textContent = formatFileSize(entry.file.size);
    details.append(name, size);

    const actions = document.createElement("div");
    actions.className = "file-actions";
    const up = document.createElement("button");
    up.className = "file-action";
    up.type = "button";
    up.textContent = "↑";
    up.title = t("pdf.moveUp");
    up.setAttribute("aria-label", t("pdf.moveUpAria", { name: entry.file.name }));
    up.disabled = index === 0;
    up.addEventListener("click", () => moveFile(index, index - 1));
    const down = document.createElement("button");
    down.className = "file-action";
    down.type = "button";
    down.textContent = "↓";
    down.title = t("pdf.moveDown");
    down.setAttribute("aria-label", t("pdf.moveDownAria", { name: entry.file.name }));
    down.disabled = index === selectedFiles.length - 1;
    down.addEventListener("click", () => moveFile(index, index + 1));
    const remove = document.createElement("button");
    remove.className = "file-action remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = t("pdf.remove");
    remove.setAttribute("aria-label", t("pdf.removeAria", { name: entry.file.name }));
    remove.addEventListener("click", () => removeFile(entry.id));
    actions.append(up, down, remove);
    item.append(handle, details, actions);
    fileList.append(item);
  });

  const hasFiles = selectedFiles.length > 0;
  fileCount.textContent = String(selectedFiles.length);
  emptyState.hidden = hasFiles;
  clearButton.disabled = !hasFiles;
  prepareButton.disabled = !hasFiles;
  scopeSelect.replaceChildren(new Option(t("pdf.allFiles"), "all"));
  selectedFiles.forEach(entry => {
    scopeSelect.add(new Option(entry.file.name, entry.id));
  });
  scopeSelect.disabled = !hasFiles;
  prepareButton.textContent = hasFiles
    ? t("pdf.prepareN", { n: selectedFiles.length })
    : t("pdf.preparePreview");
}

function addFiles(fileCollection, { fromFolder = false } = {}) {
  // De una carpeta solo interesan sus HTML (las imágenes, carpetas «_files»… se ignoran).
  let candidates = Array.from(fileCollection);
  if (fromFolder) {
    candidates = candidates
      .filter(file => /\.html?$/i.test(file.name))
      .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name, currentLang, { numeric: true, sensitivity: "base" }));
  }
  let added = 0;
  const rejected = [];
  const duplicates = [];

  for (const file of candidates) {
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      rejected.push(file.name);
      continue;
    }
    if (selectedFiles.some(entry => entry.file.name === file.name
      && entry.file.size === file.size
      && entry.file.lastModified === file.lastModified)) {
      duplicates.push(file.name);
      continue;
    }
    selectedFiles.push({ id: `file-${++idCounter}`, file });
    added++;
  }

  renderQueue();
  const messages = [];
  if (candidates.length > 1) messages.push(t("pdf.selectedCount", { n: candidates.length }));
  if (added) messages.push(t("pdf.added", { n: added }));
  if (duplicates.length) messages.push(t("pdf.duplicates", { list: duplicates.join(", ") }));
  if (rejected.length) messages.push(t("pdf.rejected", { list: rejected.join(", ") }));
  setStatus(messages.join(" ") || t(fromFolder ? "pdf.folderEmpty" : "pdf.noneAdded"));
}

function moveFile(from, to) {
  if (to < 0 || to >= selectedFiles.length) return;
  const [entry] = selectedFiles.splice(from, 1);
  selectedFiles.splice(to, 0, entry);
  renderQueue();
}

function removeFile(id) {
  const index = selectedFiles.findIndex(entry => entry.id === id);
  if (index !== -1) selectedFiles.splice(index, 1);
  renderQueue();
}

fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

folderInput.addEventListener("change", () => {
  addFiles(folderInput.files, { fromFolder: true });
  folderInput.value = "";
});

dropZone.addEventListener("click", event => {
  if (event.target.closest("label")) return;
  fileInput.click();
});

dropZone.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

for (const type of ["dragenter", "dragover"]) {
  dropZone.addEventListener(type, event => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
}
for (const type of ["dragleave", "drop"]) {
  dropZone.addEventListener(type, event => {
    event.preventDefault();
    if (type === "drop") addFiles(event.dataTransfer.files);
    dropZone.classList.remove("is-dragging");
  });
}

fileList.addEventListener("dragstart", event => {
  const item = event.target.closest(".file-item");
  if (!item) return;
  draggedFileId = item.dataset.fileId;
  item.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedFileId);
});

fileList.addEventListener("dragover", event => {
  const target = event.target.closest(".file-item");
  if (!target || !draggedFileId) return;
  event.preventDefault();
  fileList.querySelectorAll(".is-over").forEach(item => item.classList.remove("is-over"));
  target.classList.add("is-over");
});

fileList.addEventListener("drop", event => {
  const target = event.target.closest(".file-item");
  if (!draggedFileId || !target) return;
  event.preventDefault();
  const from = selectedFiles.findIndex(entry => entry.id === draggedFileId);
  const to = selectedFiles.findIndex(entry => entry.id === target.dataset.fileId);
  if (from !== -1 && to !== -1) moveFile(from, to);
  draggedFileId = null;
});

fileList.addEventListener("dragend", () => {
  draggedFileId = null;
  fileList.querySelectorAll(".is-dragging, .is-over").forEach(item => {
    item.classList.remove("is-dragging", "is-over");
  });
});

clearButton.addEventListener("click", () => {
  selectedFiles.splice(0, selectedFiles.length);
  renderQueue();
  setStatus(t("pdf.cleared"));
});

function findCanvasImage(canvas) {
  const savedImage = canvas.getAttribute("data-savepage-canvasdatauri");
  if (savedImage?.startsWith("data:image/")) return savedImage;
  const background = canvas.getAttribute("style") || "";
  const match = background.match(/url\(["']?(data:image\/[^"')]+)["']?\)/i);
  return match ? match[1] : null;
}

function collectPageImages(html, images, depth = 0) {
  if (depth > 16) {
    throw new Error(t("pdf.tooManyFrames"));
  }
  const parsed = new DOMParser().parseFromString(html, "text/html");
  for (const element of parsed.querySelectorAll("canvas, iframe[srcdoc]")) {
    if (element.localName === "canvas") {
      const src = findCanvasImage(element);
      if (src) {
        images.push({
          src,
          width: Number(element.getAttribute("width")) || null,
          height: Number(element.getAttribute("height")) || null
        });
      }
    } else {
      collectPageImages(element.getAttribute("srcdoc"), images, depth + 1);
    }
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("pagina-completa-pdf", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("jobs", { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(t("pdf.dbOpen")));
  });
}

async function saveJob(job) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction("jobs", "readwrite");
      const store = transaction.objectStore("jobs");
      const existingJobs = store.getAll();
      existingJobs.onsuccess = () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        for (const existing of existingJobs.result) {
          if (existing.createdAt < cutoff) store.delete(existing.id);
        }
        store.put(job);
      };
      existingJobs.onerror = () => {
        transaction.abort();
        reject(existingJobs.error || new Error(t("pdf.dbClean")));
      };
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error(t("pdf.dbSave")));
      transaction.onabort = () => reject(transaction.error || new Error(t("pdf.dbAbort")));
    });
  } finally {
    database.close();
  }
}

function orderFiles() {
  const files = [...selectedFiles];
  if (document.querySelector("#order").value === "name") {
    files.sort((a, b) => a.file.name.localeCompare(b.file.name, currentLang, { sensitivity: "base" }));
  }
  return files;
}

document.querySelector("#order").addEventListener("change", () => {
  if (document.querySelector("#order").value === "name") {
    selectedFiles.sort((a, b) =>
      a.file.name.localeCompare(b.file.name, currentLang, { sensitivity: "base" })
    );
    renderQueue();
  }
});

prepareButton.addEventListener("click", async () => {
  if (selectedFiles.length === 0) {
    setStatus(t("pdf.needFile"), true);
    return;
  }
  prepareButton.disabled = true;
  setStatus(t("pdf.reading", { n: selectedFiles.length }));
  const files = orderFiles();
  const preparedFiles = [];
  const failures = [];
  // Archivos sin páginas del documento: se avisan también en la vista previa.
  const skipped = [];
  try {
    for (const entry of files) {
      try {
        const images = [];
        collectPageImages(await entry.file.text(), images);
        if (images.length === 0) {
          failures.push(t("pdf.noCanvas", { name: entry.file.name }));
          skipped.push(entry.file.name);
        } else {
          preparedFiles.push({ id: entry.id, name: entry.file.name, images });
        }
      } catch (error) {
        failures.push(`${entry.file.name}: ${error.message}`);
      }
    }

    if (preparedFiles.length === 0) {
      setStatus(failures.join(" ") || t("pdf.noPages"), true);
      return;
    }

    const scope = scopeSelect.value;
    const filesToExport = scope === "all"
      ? preparedFiles
      : preparedFiles.filter(file => file.id === scope);
    if (filesToExport.length === 0) {
      setStatus(t("pdf.chosenEmpty"), true);
      return;
    }
    const options = {
      paper: document.querySelector("#paper").value,
      orientation: document.querySelector("#orientation").value,
      margin: Number(document.querySelector("#margin").value),
      fit: document.querySelector("#fit").value
    };
    const independent = outputModeSelect.value === "separate";
    const outputFiles = filesToExport.map(file => ({
      name: file.name,
      pages: file.images.map(image => ({ ...image, source: file.name }))
    }));
    const pages = outputFiles.flatMap(file => file.pages);
    const job = {
      id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      title: independent
        ? t("pdf.jobSeparate", { n: outputFiles.length })
        : filesToExport.map(file => file.name).join(", "),
      options,
      skipped,
      total: files.length,
      ...(independent
        ? { files: outputFiles }
        : { pages })
    };
    await saveJob(job);
    await chrome.tabs.create({ url: chrome.runtime.getURL(`preview.html?job=${encodeURIComponent(job.id)}`) });
    setStatus(
      independent
        ? t("pdf.readySeparate", { n: outputFiles.length }) + (failures.length ? t("pdf.skipped", { list: failures.join(" ") }) : "")
        : t("pdf.readyCombined", { files: filesToExport.length, pages: pages.length }) + (failures.length ? t("pdf.skipped", { list: failures.join(" ") }) : "")
    );
  } catch (error) {
    setStatus(t("pdf.prepareError", { msg: error.message }), true);
  } finally {
    prepareButton.disabled = selectedFiles.length === 0;
  }
});

renderQueue();
