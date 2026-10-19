const status = document.querySelector("#status");
const picker = document.querySelector("#language-picker");
const mainView = document.querySelector("#main-view");
const languageSelect = document.querySelector("#language-select");

// Chrome no deja que ninguna extensión ejecute código en su tienda.
const BLOCKED_HOSTS = /^(chromewebstore\.google\.com|chrome\.google\.com)$/i;

async function startJob(mode) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//i.test(tab.url || "")) {
      throw new Error(t("popup.errNotWeb"));
    }
    const { hostname, pathname } = new URL(tab.url);
    if (BLOCKED_HOSTS.test(hostname) && (hostname !== "chrome.google.com" || pathname.startsWith("/webstore"))) {
      throw new Error(t("popup.errStore"));
    }
    const params = new URLSearchParams({
      tab: String(tab.id),
      mode,
      paper: document.querySelector("#paper").value,
      orientation: document.querySelector("#orientation").value,
      speed: speedSelect.value
    });
    // El trabajo corre en una ventana propia: el popup se cierra al perder el
    // foco y antes cortaba la captura y la descarga.
    await chrome.windows.create({
      url: chrome.runtime.getURL(`save.html?${params}`),
      type: "popup",
      width: 440,
      height: 340,
      focused: true
    });
    window.close();
  } catch (error) {
    status.textContent = error.message;
    status.dataset.error = "true";
  }
}

// ---------- Idioma ----------

function showMain() {
  picker.hidden = true;
  mainView.hidden = false;
  languageSelect.value = currentLang;
}

// Primera vez: pantalla para elegir idioma. El idioma del navegador sale
// destacado y el título se muestra también en inglés.
function showPicker() {
  const list = document.querySelector("#language-list");
  list.replaceChildren();
  for (const lang of LANGS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice language-choice";
    if (lang.code === currentLang) button.classList.add("choice-primary");
    button.setAttribute("role", "listitem");
    button.lang = lang.code;
    button.innerHTML = '<span class="lang-code" aria-hidden="true"></span><span class="choice-copy"><strong></strong></span><svg class="choice-arrow" aria-hidden="true"><use href="#i-chevron"/></svg>';
    button.querySelector(".lang-code").textContent = lang.code.toUpperCase();
    button.querySelector("strong").textContent = lang.name;
    button.addEventListener("click", () => {
      setLang(lang.code);
      showMain();
    });
    list.append(button);
  }
  const englishTitle = M["welcome.title"][LANGS.findIndex(lang => lang.code === "en")];
  document.querySelector("#welcome-subtitle").textContent = currentLang === "en" ? "" : englishTitle;
  picker.hidden = false;
  mainView.hidden = true;
}

for (const lang of LANGS) {
  languageSelect.add(new Option(lang.name, lang.code));
}
languageSelect.addEventListener("change", () => {
  setLang(languageSelect.value);
  status.textContent = "";
});

// Papel, orientación y velocidad del PDF: se recuerdan los últimos elegidos
// (también los usa el atajo de teclado).
const speedSelect = document.querySelector("#speed");
for (const [selector, key, fallback] of [["#paper", "fps-paper", "A4"], ["#orientation", "fps-orientation", "portrait"], ["#speed", "fps-speed", "normal"]]) {
  const select = document.querySelector(selector);
  try {
    select.value = localStorage.getItem(key) || fallback;
  } catch {}
  if (!select.value) select.value = fallback;
  select.addEventListener("change", () => {
    try {
      localStorage.setItem(key, select.value);
    } catch {}
  });
}

// El atajo de teclado asignado, en la ayuda del botón del PDF.
chrome.commands?.getAll?.().then(commands => {
  const shortcut = commands.find(command => command.name === "save-pdf")?.shortcut;
  if (shortcut) document.querySelector("#save-pdf").title = t("popup.shortcut", { keys: shortcut });
}).catch(() => {});

// Tema visual
const themeSelect = document.querySelector("#theme-select");
themeSelect.value = storedTheme();
themeSelect.addEventListener("change", () => setTheme(themeSelect.value));

if (storedLang()) showMain();
else showPicker();

document.querySelector("#save-html").addEventListener("click", () => startJob("html"));
document.querySelector("#save-pdf").addEventListener("click", () => startJob("pdf"));
document.querySelector("#save-page").addEventListener("click", () => startJob("mht"));
// Varias pestañas: la ventana de progreso pide el permiso y las muestra.
document.querySelector("#save-tabs").addEventListener("click", async () => {
  const win = await chrome.windows.getCurrent();
  const params = new URLSearchParams({
    batch: "1",
    window: String(win.id),
    paper: document.querySelector("#paper").value,
    orientation: document.querySelector("#orientation").value,
    speed: speedSelect.value
  });
  await chrome.windows.create({
    url: chrome.runtime.getURL(`save.html?${params}`),
    type: "popup",
    width: 440,
    height: 340,
    focused: true
  });
  window.close();
});
document.querySelector("#open-pdf").addEventListener("click", async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("pdf.html") });
  window.close();
});
