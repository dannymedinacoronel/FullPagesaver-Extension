# FullPage Saver

> Este repositorio contiene la información y los paquetes de instalación. El código fuente es privado.

**Extensión de Chrome para guardar páginas web completas en HTML o PDF**, tal y como se ven: abre menús, carga todo el contenido, quita anuncios y avisos de cookies, y te deja elegir qué guardar antes de generar el archivo.

![FullPage Saver](docs/capturas/portada.png)

**[➜ Instalar desde la Chrome Web Store](https://chromewebstore.google.com/detail/fullpage-saver-%E2%80%93-guardar/igjphghlkmidddmnmlmdnhnepehpoena)** · o [manualmente con el paquete del Release](#opción-2-manualmente-con-el-paquete-del-release)

> Manifest V3 · JavaScript puro, sin dependencias ni código remoto · 7 idiomas · todo se procesa en el equipo del usuario.

## Funciones

**Guardar una página**
- **HTML autocontenido** (estilo SavePage WE): un único `.html` con imágenes, estilos y fuentes incrustados; el contenido de los iframes del mismo origen va dentro, y cada `canvas` se guarda como imagen.
- **PDF por capturas** con **texto seleccionable**: recorre la página, une las capturas sin franjas ni barras repetidas y añade una capa de texto invisible para poder copiar y buscar.
- **Visores de PDF** (PDF.js y similares): copia cada página de su canvas a tamaño original, con su texto.
- **MHT** con la función nativa de Chrome.

**Antes de guardar: vista previa**
- Marcar o desmarcar **secciones** (por títulos) y **partes** de la página: cabecera, menús, barras laterales, pie, comentarios, cookies, publicidad, botones flotantes, vídeos, imágenes.
- **Modo lectura**: solo el contenido, con una tipografía cómoda.
- **Resaltar**, **quitar párrafos** y **añadir notas** directamente sobre la vista previa.
- Portada, índice, direcciones de los enlaces y nota personal.
- Nombre del archivo editable y **tamaño del PDF** (ligero, normal o máxima calidad).

![Vista previa](docs/capturas/vista-previa.png)

**Más**
- **Varias pestañas** de una vez: un HTML o un PDF por pestaña, o todas en un único PDF.
- **Conversor de HTML guardados a PDF**, sin límite de archivos: añádelos uno a uno o una carpeta entera; un PDF por archivo (con su nombre original) o uno combinado.
- **Velocidad de captura** rápida, normal o lenta, y **repaso automático** de lo que no terminó de cargar (spinners, páginas en blanco).
- **Modo aplicación** para Gmail, Drive, Outlook…: no pulsa nada y recorre solo el panel principal.
- **Atajo de teclado**: Alt+Mayús+P guarda la pestaña en PDF.
- Tres **temas** (Moderno, Clásico y Rosa) con modo oscuro, y **7 idiomas**: español, català, English, français, português, Deutsch e italiano.

| Antes y después | Temas |
|---|---|
| ![Antes y después](docs/capturas/antes-despues.png) | ![Temas](docs/capturas/temas.png) |

## Instalar

Hay dos formas:

### Opción 1: desde la Chrome Web Store (recomendada)

Entra en **[FullPage Saver en la Chrome Web Store](https://chromewebstore.google.com/detail/fullpage-saver-%E2%80%93-guardar/igjphghlkmidddmnmlmdnhnepehpoena)** y pulsa **Añadir a Chrome**. Se actualiza sola cada vez que sale una versión nueva.

### Opción 2: manualmente, con el paquete del Release

1. Ve a **[Releases](../../releases/latest)** y descarga `fullpage-saver-2.9.7.zip`.
2. Descomprime el ZIP en una carpeta que no vayas a borrar (Chrome la lee desde ahí).
3. Abre `chrome://extensions` y activa el **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y elige la carpeta descomprimida (la que contiene `manifest.json`).
5. Fija FullPage Saver en la barra de extensiones.

Instalada así no se actualiza sola: para una versión nueva, descarga el ZIP del último Release, sustituye la carpeta y pulsa el botón de recargar de la extensión en `chrome://extensions`.

Para cambiar el atajo de teclado: `chrome://extensions/shortcuts`.

## Permisos

| Permiso | Para qué |
|---|---|
| `activeTab` | Leer, recorrer y capturar la pestaña cuando el usuario pulsa un botón de la extensión. |
| `scripting` | Ejecutar en esa pestaña el código que abre menús, la recorre y copia su contenido. |
| `downloads` | Guardar el archivo generado y mantener su nombre. |
| `pageCapture` | Generar el archivo `.mht`. |
| `<all_urls>` (opcional) | Solo se pide con un botón: para incrustar recursos de otros dominios en el HTML y para leer otras pestañas en «Varias pestañas». |

No se envía nada a ningún servidor, no hay analítica ni código remoto. El aviso legal y la política de privacidad van incluidos dentro de la extensión.

## Uso responsable

Guarda solo contenido sobre el que tengas derechos o permiso de su titular. El usuario es el único responsable del uso que haga de la extensión y de las copias que genere.

## Autor

Danny Medina Coronel · empresademkor@gmail.com

© 2026 Danny Medina Coronel. Todos los derechos reservados.
