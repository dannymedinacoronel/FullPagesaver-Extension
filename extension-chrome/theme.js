// Temas visuales y partículas decorativas. Se carga en el <head> de cada
// página para aplicar el tema antes de pintar. El tema se guarda en
// localStorage (compartido por todas las páginas de la extensión).
const THEMES = ["modern", "classic", "pink"];
const THEME_KEY = "fps-theme";

function storedTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return THEMES.includes(theme) ? theme : "modern";
  } catch {
    return "modern";
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.dispatchEvent(new CustomEvent("fps-themechange", { detail: theme }));
}

function setTheme(theme) {
  if (!THEMES.includes(theme)) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
  applyTheme(theme);
}

applyTheme(storedTheme());

// Si se cambia el tema en el popup, las demás páginas abiertas lo siguen.
window.addEventListener("storage", event => {
  if (event.key === THEME_KEY) applyTheme(storedTheme());
});

// ---------- Partículas ----------
// Puntos de luz que suben despacio y parpadean; en el tema rosa se mezclan
// destellos de cuatro puntas. Los colores y la cantidad salen de variables
// CSS del tema (--particles, --particle-hero, --particle-page,
// --particle-sparkles), así cada tema decide su aspecto o las desactiva.

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function readParticleStyle(kind) {
  const style = getComputedStyle(document.documentElement);
  const enabled = style.getPropertyValue("--particles").trim() !== "0";
  const color = style.getPropertyValue(kind === "hero" ? "--particle-hero" : "--particle-page").trim() || "255 255 255";
  const sparkles = Number(style.getPropertyValue("--particle-sparkles").trim() || 0);
  return { enabled, color, sparkles };
}

function startParticles(host) {
  const kind = host.dataset.particles === "hero" ? "hero" : "page";
  const canvas = document.createElement("canvas");
  canvas.className = `particles particles-${kind}`;
  canvas.setAttribute("aria-hidden", "true");
  if (kind === "hero") host.prepend(canvas);
  else document.body.prepend(canvas);
  const context = canvas.getContext("2d");

  let width = 0;
  let height = 0;
  let particles = [];
  let style = readParticleStyle(kind);
  let frame = 0;
  let last = performance.now();

  const spawn = (anywhere = true) => {
    const sparkle = Math.random() < style.sparkles;
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      r: sparkle ? 2.2 + Math.random() * 2.6 : 0.7 + Math.random() * (kind === "hero" ? 1.9 : 2.4),
      vy: -(6 + Math.random() * (kind === "hero" ? 14 : 18)),
      sway: 6 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.6 + Math.random() * 1.6,
      alpha: kind === "hero" ? 0.35 + Math.random() * 0.5 : 0.18 + Math.random() * 0.32,
      sparkle
    };
  };

  const resize = () => {
    const rect = kind === "hero" ? host.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const density = kind === "hero" ? 1 / 1400 : 1 / 16000;
    const count = Math.round(Math.min(kind === "hero" ? 40 : 90, width * height * density));
    particles = Array.from({ length: count }, () => spawn(true));
  };

  const drawSparkle = (x, y, r) => {
    context.beginPath();
    context.moveTo(x, y - r * 2);
    context.quadraticCurveTo(x, y, x + r * 2, y);
    context.quadraticCurveTo(x, y, x, y + r * 2);
    context.quadraticCurveTo(x, y, x - r * 2, y);
    context.quadraticCurveTo(x, y, x, y - r * 2);
    context.fill();
  };

  const draw = (now, move) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    context.clearRect(0, 0, width, height);
    if (!style.enabled) return;
    const time = now / 1000;
    for (const particle of particles) {
      if (move) {
        particle.y += particle.vy * dt;
        if (particle.y < -12) Object.assign(particle, spawn(false));
      }
      const x = particle.x + Math.sin(time * 0.6 + particle.phase) * particle.sway;
      const glow = particle.alpha * (0.55 + 0.45 * Math.sin(time * particle.twinkle + particle.phase));
      context.fillStyle = `rgb(${style.color} / ${glow * 0.35})`;
      context.beginPath();
      context.arc(x, particle.y, particle.r * 2.6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = `rgb(${style.color} / ${glow})`;
      if (particle.sparkle) {
        drawSparkle(x, particle.y, particle.r);
      } else {
        context.beginPath();
        context.arc(x, particle.y, particle.r, 0, Math.PI * 2);
        context.fill();
      }
    }
  };

  const loop = now => {
    draw(now, true);
    frame = requestAnimationFrame(loop);
  };

  const restart = () => {
    cancelAnimationFrame(frame);
    style = readParticleStyle(kind);
    resize();
    last = performance.now();
    if (!style.enabled) {
      context.clearRect(0, 0, width, height);
    } else if (reducedMotion.matches || document.hidden) {
      draw(last, false);
    } else {
      frame = requestAnimationFrame(loop);
    }
  };

  new ResizeObserver(() => restart()).observe(kind === "hero" ? host : document.documentElement);
  document.addEventListener("fps-themechange", restart);
  document.addEventListener("visibilitychange", restart);
  reducedMotion.addEventListener?.("change", restart);
  restart();
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-particles]").forEach(startParticles);
});
