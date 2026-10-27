// Menú móvil, selector de idioma y visor de capturas. Sin dependencias.
(() => {
  const menuBtn = document.getElementById("menu-btn");
  const nav = document.getElementById("nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Cierra el selector de idioma al pulsar fuera.
  document.addEventListener("click", (event) => {
    document.querySelectorAll("details.lang[open]").forEach((details) => {
      if (!details.contains(event.target)) {
        details.removeAttribute("open");
      }
    });
  });

  // El vídeo de YouTube solo se carga al pulsar reproducir (youtube-nocookie).
  document.querySelectorAll(".video").forEach((video) => {
    video.querySelector(".video-play").addEventListener("click", () => {
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${video.dataset.video}?autoplay=1&rel=0`;
      frame.title = video.dataset.title;
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      video.replaceChildren(frame);
    });
  });

  const box = document.getElementById("lightbox");
  if (box) {
    const image = box.querySelector("img");
    const caption = box.querySelector("p");
    document.querySelectorAll(".shot-btn").forEach((button) => {
      button.addEventListener("click", () => {
        image.src = button.dataset.full;
        image.alt = button.dataset.cap;
        caption.textContent = button.dataset.cap;
        box.showModal();
      });
    });
    box.addEventListener("click", (event) => {
      if (event.target === box) {
        box.close();
      }
    });
  }
})();
