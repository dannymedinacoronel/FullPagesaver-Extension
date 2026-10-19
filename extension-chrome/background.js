// Atajo de teclado (Alt+Mayús+P por defecto; se cambia en
// chrome://extensions/shortcuts): guarda la pestaña activa en PDF. La ventana
// de progreso usa el papel, la orientación y la velocidad elegidos por última
// vez en el popup.
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== "save-pdf") return;
  const target = tab?.id ? tab : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!target?.id) return;
  const params = new URLSearchParams({ tab: String(target.id), mode: "pdf" });
  await chrome.windows.create({
    url: chrome.runtime.getURL(`save.html?${params}`),
    type: "popup",
    width: 440,
    height: 340,
    focused: true
  });
});

// ---------- Nombre de las descargas ----------

// Otras extensiones que intervienen en las descargas (gestores de descargas,
// antivirus…) hacen que Chrome olvide el nombre que pide FullPage Saver y
// guarde el archivo con un identificador («cb5d5c0d-….pdf»). Por eso las
// páginas de la extensión avisan aquí del nombre de cada descarga antes de
// empezarla, y se le vuelve a indicar a Chrome al decidir el nombre.
const downloadNames = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "fps-download-name" || sender.id !== chrome.runtime.id) return;
  downloadNames.set(message.url, message.filename);
  // Por si la descarga no llega a empezar.
  setTimeout(() => downloadNames.delete(message.url), 120_000);
  sendResponse(true);
});

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const filename = downloadNames.get(item.url) || downloadNames.get(item.finalUrl);
  // Las descargas que no son de la extensión no se tocan.
  if (!filename || item.byExtensionId !== chrome.runtime.id) return;
  downloadNames.delete(item.url);
  suggest({ filename, conflictAction: "uniquify" });
});
