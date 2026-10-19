# FullPage Saver

Extensión de Chrome Manifest V3 para:

- Guardar la pestaña web activa como archivo `.mhtml` usando la captura integrada de Chrome. El archivo reúne la página y los recursos que Chrome tenga cargados; se guarda localmente y se puede abrir en Chrome.
- Recorrer la pestaña activa, capturar su contenido visible en pantallas consecutivas y generar directamente un archivo PDF descargable, con texto seleccionable.
- Guardar varias pestañas de una vez (HTML o PDF, por separado o en un único PDF) y guardar en modo lectura.
- Exportar las páginas visibles de elementos `canvas` como un HTML autocontenido compatible con el conversor PDF de esta extensión.
- Importar uno o varios HTML guardados con imágenes de páginas serializadas en `canvas`, reordenarlos con arrastrar y soltar o con los botones de flecha, y preparar una vista de impresión para guardarlos como PDF.

## Instalar en Chrome

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y selecciona esta carpeta `extension-chrome`. Chrome mostrará los permisos que necesita la extensión para capturar la pestaña y descargar la copia. Si ya la habías instalado, pulsa el botón de recarga para instalar la versión 2.9.7.
4. Fija **FullPage Saver** en la barra de extensiones.
5. Abre la página, pulsa el icono de la extensión y elige **Guardar la página completa como PDF**. La extensión captura las pantallas mientras recorre la página, compone un PDF y abre el diálogo de Chrome para elegir dónde guardar el archivo. Puedes elegir papel y orientación antes de iniciar.
6. Para guardar una copia de archivo web en vez de PDF, selecciona **Archivar página web (.mht)**.

Para los PDF, abre la extensión, elige **Crear PDF desde HTML guardados**, añade archivos con el selector, con **Añadir carpeta** (todos los HTML de una carpeta de una vez, en orden por nombre) o arrastrándolos a la zona de carga, y configura las opciones. No hay límite de archivos. Los HTML que no contienen las páginas del documento (por ejemplo, guardados antes de que el visor las mostrara) no se pueden convertir: la vista previa los lista en un aviso con lo que hay que hacer. En **Archivos de salida**, puedes elegir un único PDF combinado o **PDF independiente por cada archivo**. Pulsa **Preparar vista previa**. En la pestaña nueva, **Descargar PDF** crea el PDF directamente (sin el diálogo de impresión). En el modo independiente el botón es **Descargar los N PDF** y guarda un PDF por cada archivo, sin preguntar, en la carpeta **FullPage Saver** de Descargas; el selector de archivo sirve para revisar cada uno antes. Cada PDF se llama como su HTML original; al juntar varios se sugiere un nombre (lo que tienen en común, por ejemplo «Apuntes Tema (3 archivos)», o «el primero y N más»). En **Nombre del PDF** se puede cambiar el de cada archivo antes de descargar. **Imprimir…** sigue disponible para usar el diálogo de Chrome. El generador de PDF está en `pdfwriter.js` y lo comparten la ventana de guardado y el conversor.

## Vista previa antes de guardar

Antes de generar el HTML o el PDF, la ventana de progreso se amplía y muestra la vista previa real de lo que se va a guardar. A la izquierda se puede:

- Elegir **Página completa** o **Solo el contenido** (quita cabecera, menús, barras laterales, pie, comentarios, cookies, publicidad y elementos flotantes).
- Marcar o desmarcar **partes de la página** detectadas: cabecera, menús, barras laterales, pie, comentarios, avisos de cookies, publicidad, botones flotantes, vídeos e imágenes. Las cookies, la publicidad y los botones flotantes vienen desmarcados.
- Marcar o desmarcar **secciones**, detectadas por los títulos (h1–h3) del contenido principal, con su jerarquía. Pulsar el nombre de una sección la muestra en la vista previa.
- **Añadir al documento**: portada con título, dirección y fecha; índice de secciones con enlaces; la dirección de cada enlace junto al texto; y una nota personal al principio.

En el PDF desde un visor (PDF.js) la vista previa muestra las páginas en miniatura para elegir cuáles incluir (también por rango, por ejemplo «1-3, 5») y se puede añadir portada y nota. En el HTML solo se incrustan los recursos de lo que se guarda. Al terminar, la pestaña queda exactamente como estaba. Código: `review.js`, `review.css` y las funciones `analyzeSectionsInTab`, `applyChoicesInTab` y `clearChoicesInTab` de `save.js`.

## Modo lectura

En la vista previa, el interruptor **Modo lectura** cambia la copia por una versión limpia: solo el contenido principal (con sus títulos, imágenes, tablas y listas), con una tipografía cómoda y sin el diseño, los menús ni los anuncios de la web. Se pueden seguir quitando secciones y añadir portada, índice o nota. En HTML se guarda esa versión; en PDF, la pestaña la muestra mientras se captura y luego vuelve a quedar como estaba, sin recargarse. Código: `makeReader` en `review.js` y `applyReaderInTab`/`restoreReaderInTab` en `save.js`.

## PDF con texto seleccionable

Los PDF por capturas llevan, encima de cada imagen, una capa de texto invisible colocada en la misma posición que el texto de la página: se puede seleccionar, copiar y buscar (Ctrl+F) en cualquier lector de PDF. El texto se lee de la página después de cada captura (`collectTextInTab`) y cada línea se ajusta a su ancho real. Los PDF copiados de un visor (PDF.js) usan la capa de texto del propio visor. Se usa la fuente Helvetica del PDF con codificación WinAnsi, que cubre los siete idiomas de la extensión; los caracteres de otros alfabetos se sustituyen por «?» en la capa de texto (la imagen se ve igual).

## Velocidad de captura del PDF

Junto al papel y la orientación, el popup tiene **Velocidad** (se recuerda la última elegida). Afecta a la preparación de la página, a cada captura y a las páginas de los visores de PDF:

| | Rápida | Normal (por defecto) | Lenta |
|---|---|---|---|
| Pausa tras cada desplazamiento | 0,04 s | 0,4 s | 2,5 s |
| Espera a spinners, imágenes y a que la página deje de cambiar | no | hasta 4 s (0,3 s sin cambios) | hasta 20 s (1,5 s sin cambios) |
| Preparar la página (pausa por pantalla / al final / máximo) | 0,025 s / 0,12 s / 20 s | 0,08 s / 0,3 s / 40 s | 1,2 s / 2,5 s / 4 min |
| Visor de PDF: página en blanco | no espera | hasta 5 s | hasta 30 s, y 2 s de margen por página |

Rápida no espera nada de más (solo el límite de Chrome de dos capturas por segundo). Normal y Lenta solo alargan la espera si algo sigue cargando, salvo las pausas fijas de la tabla. El texto seleccionable se lee después de cada captura, así que coincide con lo que sale en la imagen aunque la web cargue contenido mientras se recorre. Código: `SPEEDS`, `pendingLoadsInTab` y `waitForPageToLoad` en `save.js`.

## Repaso automático

Si al hacer una captura todavía había algo cargando en pantalla (spinners, imágenes sin descargar), al terminar la extensión vuelve solo a esas partes, espera hasta 10 s a que carguen y las captura otra vez; si siguen sin cargar, se queda la captura que había. En los visores de PDF hace lo mismo con las páginas que salieron en blanco. Funciona en cualquier velocidad, también en Rápida, y el mensaje final dice cuántas capturas se repitieron.

## Tamaño del PDF

En la vista previa de un PDF se elige **Ligero** (hojas de 1100 px y JPEG más comprimido: más o menos la mitad de tamaño, ideal para enviar por correo), **Normal** o **Máxima** (JPEG de más calidad). Se recuerda la última elección. También está en la vista previa de páginas de un visor y en **Varias pestañas** cuando el formato es PDF.

## Resaltar, quitar y anotar

Encima de la vista previa hay cuatro herramientas: **Navegar**, **Resaltar** (seleccionas texto y queda en amarillo), **Quitar** (pulsas un párrafo, imagen o tabla y desaparece; se ve atenuado para poder recuperarlo con otro clic) y **Añadir nota** (pulsas un párrafo y escribes una nota que sale debajo). **Deshacer** va quitando lo último. Funciona en HTML, en PDF y en modo lectura. Al analizar la página cada elemento recibe un número (`data-fps-id`) que se conserva en la copia, así que las marcas se repiten en el HTML final y en la propia pestaña antes de capturar el PDF; al terminar se quitan los números, los resaltados y las notas de la pestaña. Código: `applyAnnotationsInDoc` y `clearAnnotationsInDoc` en `review.js`.

En la vista previa, **Intro** equivale a pulsar Guardar. Arriba está **Nombre del archivo**, ya relleno con el título de la página (o del documento del visor): se guarda con ese nombre, que también aparece en el cuadro «Guardar como» de Chrome.

## Atajo de teclado

**Alt+Mayús+P** (Opción+Mayús+P en Mac) guarda la pestaña activa en PDF sin abrir el menú, con el papel, la orientación y la velocidad elegidos por última vez en el popup. Se puede cambiar en `chrome://extensions/shortcuts`. No se usan Ctrl+O ni Ctrl+Mayús+O porque en Chrome son «Abrir archivo» y el administrador de marcadores; Chrome tampoco admite combinaciones con Ctrl+Alt en las extensiones. Código: `background.js` y `commands` en el manifest.

## Varias pestañas

**Varias pestañas** en el popup abre la lista de pestañas web de la ventana. Se marcan las que se quieran y se elige el formato: un HTML por pestaña, un PDF por pestaña o todas en un único PDF; además, si se quitan publicidad, cookies y botones flotantes, y si se usa el modo lectura. La extensión activa cada pestaña por turno, la guarda y al final vuelve a la pestaña en la que estabas. Los archivos sueltos van sin preguntar a la carpeta **FullPage Saver** dentro de Descargas; el PDF único se guarda con el diálogo de Chrome. Para leer otras pestañas hace falta el acceso opcional a los sitios, que se pide con un botón la primera vez.

## Valoración

Tras 5 guardados correctos, la ventana de progreso muestra una vez una invitación discreta a valorar la extensión en la Chrome Web Store (con «Más tarde» y «No, gracias»). El recuento se guarda solo en el almacenamiento local.

## Idiomas

La primera vez que se abre la extensión aparece una pantalla para elegir idioma: español, català, English, français, português, Deutsch o italiano. Toda la interfaz (popup, ventana de progreso, conversor, vista previa y aviso legal) usa ese idioma y se puede cambiar en cualquier momento con el selector «🌐 Idioma» del popup. La elección se guarda en el almacenamiento local de la extensión. Los textos están en `i18n.js` (cada texto con sus 7 traducciones en el orden de `LANGS`) y el aviso legal en `legal-i18n.js`. El nombre y la descripción que muestra Chrome se traducen con `_locales` según el idioma del navegador.

## Temas

El selector de la paleta del popup cambia el aspecto de todas las pantallas: **Moderno** (degradado verde azulado e índigo, con partículas de luz), **Clásico** (el diseño anterior, plano en blanco y azul, sin partículas) y **Rosa** (degradado rosa con destellos). Moderno y Rosa siguen el modo oscuro del sistema. La elección se guarda en el almacenamiento local de la extensión y las páginas abiertas se actualizan al momento. Las partículas se pausan cuando la pestaña no está visible y se quedan quietas si el sistema pide reducir el movimiento. Todo está en `theme.js` y en los bloques `[data-theme]` de cada hoja de estilos.

## Webs tipo aplicación (Gmail, Drive…)

Antes de actuar, la extensión detecta si la página es una «aplicación»: webs conocidas (Gmail, Google Drive/Docs/Calendar, Outlook, Teams, OneDrive, Slack, WhatsApp, Telegram, Discord, Notion, Trello, Figma, Asana, Atlassian y redes sociales) o cualquier página que no hace scroll pero tiene varios paneles con scroll propio o muchos iframes visibles. En ese modo no pulsa ningún botón, recorre solo el panel principal con un límite corto, no copia los iframes ocultos y, si la lista es infinita, entrega el PDF con las primeras 15 pantallas en vez de fallar. En las webs normales los clics también son prudentes: nunca toca menús, barras de herramientas, navegación, pestañas, diálogos ni botones que abren ventanas emergentes, con un máximo de 60 clics y 40 pantallas por panel.

## Notas

- El archivo MHTML lo genera Chrome con `chrome.pageCapture.saveAsMHTML`; representa la pestaña y los recursos capturados por Chrome, no todos los resultados posibles de controles interactivos. Una lista desplegable que hace nuevas llamadas solo muestra los datos de la opción abierta y cargada en el momento de guardar. Para conservar varias opciones, guárdalas desde la función de exportación original de la aplicación o desde su fuente/servidor autorizado.
- El PDF directo se compone en el navegador. Si el área desplazable es un visor de páginas (PDF.js y similares, también dentro de iframes del mismo origen), cada página se copia de su propio canvas a su tamaño original: sin uniones ni barras repetidas. En el resto de páginas se une una serie de capturas consecutivas del área visible; los elementos fijos (cabeceras, botones flotantes) solo aparecen en la primera captura. Mantén Chrome en primer plano y no cambies de pestaña mientras captura. La ventana de progreso espera a que Chrome termine de guardar el archivo: si se cierra antes, el archivo puede quedar vacío o cortado. Cada hoja es una imagen con una capa de texto invisible, así que el texto se puede seleccionar y buscar. Por seguridad y memoria, el límite es de 120 pantallas.
- El HTML se guarda como SavePage WE: un único archivo .html sin scripts, con estilos, imágenes y fuentes incrustados, el contenido de los iframes del mismo origen dentro de `srcdoc` y cada `canvas` guardado como imagen. En visores tipo PDF.js se recorren todas las páginas para guardarlas aunque el visor ya las haya descargado. Es compatible con el conversor PDF de esta extensión. Los iframes de otros dominios se mantienen con su dirección original.
- Para la conversión a PDF, cada imagen guardada en el HTML se ajusta a una hoja. Los controles del diálogo de impresión (por ejemplo, destino y escala) siguen perteneciendo a Chrome.
- Permisos: para leer, recorrer y capturar la pestaña basta `activeTab` (se concede al abrir la extensión). El acceso a todos los sitios es opcional: solo se pide, con un botón, al guardar en HTML (para incrustar imágenes, estilos y fuentes de otros dominios; sin él, esos recursos quedan enlazados) y al usar **Varias pestañas** (para leer las pestañas que no son la activa).
- Nombres de las descargas: si otra extensión interviene en las descargas (gestores de descargas, antivirus…), Chrome ignora el nombre que pide la extensión y, con una dirección blob:, guarda el archivo con un identificador («cb5d5c0d-….pdf»). Por eso cada archivo se escribe antes en el almacenamiento temporal de la extensión y se descarga desde una dirección filesystem: que termina en su nombre, de la que Chrome lo toma (`prepareDownloadUrl` en `pdfwriter.js`); además, `background.js` le confirma el nombre a Chrome. Si esa otra extensión se instaló después, el archivo conserva el nombre pero puede ir a la carpeta de Descargas en lugar de a «FullPage Saver».
- La extensión no envía archivos ni páginas a un servidor. Los datos de la vista previa se guardan en IndexedDB local de la extensión; usa **Eliminar datos temporales** al terminar si quieres borrarlos.

## Aviso legal

FullPage Saver es una extensión gratuita de **Danny Medina Coronel** (empresademkor@gmail.com), que actúa como particular. Se ofrece «tal cual», sin garantías. El usuario es el único responsable del uso que haga de la extensión y de las copias que genere: debe guardar solo contenido sobre el que tenga derechos o permiso, respetar la propiedad intelectual y los términos de cada sitio, y no eludir medidas de protección ni restricciones de acceso. En la máxima medida permitida por la ley, el titular no se hace responsable de usos indebidos ni de los daños derivados del uso de la extensión. El texto completo, con la política de privacidad, está en `legal.html` (enlazado desde el popup).
