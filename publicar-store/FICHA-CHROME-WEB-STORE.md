# Publicar FullPage Saver en Chrome Web Store

## Pasos
1. Crea una cuenta de desarrollador en https://chrome.google.com/webstore/devconsole (pago único de 5 USD).
2. En **Configuración de la cuenta**, rellena el nombre del editor (Danny Medina Coronel) y el correo de contacto (empresademkor@gmail.com). En **Estado de comerciante** (lo exige el Reglamento de Servicios Digitales de la UE para publicar en Europa), declara **No comerciante**: la extensión es gratuita y no es una actividad profesional.
3. **Añadir elemento** → sube el ZIP de la extensión (`fullpage-saver-2.9.7.zip`).
4. Rellena la ficha con los textos de abajo.
5. Imágenes:
   - Icono: ya va dentro del ZIP (`icon128.png`).
   - Mosaico promocional pequeño 440×280: `promo-440x280.png`.
   - Mosaico de marquesina 1400×560 (PNG de 24 bits sin alfa): `marquesina-1400x560.png`.
   - **Capturas de pantalla (obligatorio, mínimo 1)**: 1280×800 o 640×400. Hazlas tú con la extensión funcionando (popup abierto + ventana de progreso).
   - **Vídeo promocional (opcional)**: la Store solo admite un enlace de YouTube. Sube `video-promo.mp4` a YouTube (puede ser «Oculto») y pega la URL en el campo **Vídeo promocional**.
6. Pestaña **Prácticas de privacidad**: pega las justificaciones de permisos, publica el texto de «Aviso legal y política de privacidad» de abajo (por ejemplo, en un GitHub Gist o Google Sites) y pega su URL. El mismo texto va dentro de la extensión en `legal.html`.
7. Enviar a revisión. Por el permiso `<all_urls>` la revisión puede tardar varios días.

## Ficha
**Nombre:** FullPage Saver – Guardar página completa en HTML y PDF

**Categoría:** Productividad (Herramientas)

**Idioma:** Español

**Descripción breve (≤132 caracteres):**
Guarda la página completa en HTML o PDF, con vista previa para elegir qué secciones incluir y quitar anuncios y avisos de cookies.

**Descripción completa:**
FullPage Saver guarda cualquier página web completa, tal y como la ves, en un único archivo HTML que puedes abrir sin conexión o convertir en PDF.

Con un clic, FullPage Saver:
• Abre automáticamente menús desplegables, acordeones y secciones contraídas.
• Recorre la página hasta el final para cargar todo el contenido diferido (lazy loading, scroll infinito, paneles con scroll propio).
• Incrusta imágenes, estilos y fuentes en un solo archivo .html autocontenido.
• Muestra todas las opciones de las listas desplegables en la copia.
• Prepara el archivo para imprimir: abre el HTML y pulsa Ctrl+P → «Guardar como PDF», sin contenido cortado.

NUEVO en la versión 2.9:
• Resalta texto, quita párrafos y añade notas directamente en la vista previa.
• Repaso automático: si algo no terminó de cargar, se vuelve a capturar solo.
• Elige el tamaño del PDF: ligero (para enviar por correo), normal o máxima calidad.
• Atajo de teclado Alt+Mayús+P para guardar la página en PDF al instante.

También:
• PDF con texto seleccionable: copia, busca (Ctrl+F) y subraya el texto del PDF.
• Modo lectura: guarda solo el contenido, con una tipografía cómoda y sin el diseño de la web.
• Varias pestañas a la vez: guarda las pestañas que elijas en HTML, en un PDF por pestaña o todas juntas en un único PDF.
• Velocidad de captura (rápida, normal o lenta): la lenta da mucho tiempo a las webs y documentos que tardan en cargar, para que no falte ninguna página.

Vista previa antes de guardar:
• Mira cómo quedará el documento antes de generarlo.
• Marca o desmarca secciones y partes de la página: cabecera, menús, barras laterales, pie, comentarios, imágenes, vídeos…
• La publicidad, los avisos de cookies y los botones flotantes se quitan solos (puedes volver a incluirlos).
• Botones rápidos «Página completa» y «Solo el contenido».
• Añade una portada con título, dirección y fecha, un índice de secciones, las direcciones de los enlaces o una nota personal.
• En los visores de PDF, elige qué páginas guardar (por ejemplo, «1-3, 5»).

Además:
• Captura completa como PDF con tamaño de papel y orientación configurables.
• Archivo web .mht generado por Chrome.
• Conversor de HTML a PDF sin límite de archivos: añádelos uno a uno o una carpeta entera, ordénalos arrastrando y descárgalos todos en un PDF o un PDF por archivo, con su nombre original.
• Modo inteligente para webs tipo aplicación (Gmail, Drive, Outlook…): no pulsa botones y guarda solo el panel principal.
• Tres temas visuales (Moderno, Clásico y Rosa) con modo oscuro automático.
• Disponible en español, català, English, français, português, Deutsch e italiano: eliges el idioma la primera vez que la abres.

Privacidad: todo se procesa en tu equipo. FullPage Saver no envía páginas ni datos a ningún servidor, no usa analítica y no recopila información personal.

Uso responsable: guarda solo contenido sobre el que tengas derechos o permiso de su titular. El usuario es el único responsable del uso que haga de la extensión y de las copias que genere; el desarrollador no se hace responsable de usos indebidos. Consulta el aviso legal completo en la política de privacidad.

Desarrollada por Danny Medina Coronel · empresademkor@gmail.com

## Prácticas de privacidad (textos para pegar)

**Descripción de la finalidad única:**
Guardar la página web que el usuario está viendo como un archivo local completo (HTML autocontenido, PDF o MHT) cuando el usuario lo pide pulsando un botón de la extensión.

**Motivo del permiso activeTab:**
Acceder a la pestaña activa solo cuando el usuario abre la extensión y elige guardar, para saber qué página guardar (título y dirección) y poder copiarla.

**Motivo del permiso downloads:**
Guardar en el equipo del usuario el archivo HTML, PDF o MHT generado. Chrome muestra el diálogo «Guardar como» para que el usuario elija dónde guardarlo.

**Motivo del permiso pageCapture:**
Generar la copia de archivo web .mht con la función nativa de Chrome (chrome.pageCapture.saveAsMHTML) cuando el usuario elige «Archivar página web (.mht)».

**Motivo del permiso scripting:**
Ejecutar, en la pestaña que el usuario quiere guardar y solo cuando pulsa un botón, el código de la extensión que abre menús desplegables, recorre la página hasta el final (también dentro de sus iframes) para cargar el contenido diferido y copia su contenido para generar el archivo HTML o PDF.

**Motivo del permiso de host (<all_urls>, opcional):**
No es un permiso fijo: se declara en optional_host_permissions y la extensión solo lo pide, con un botón y el diálogo de Chrome, cuando el usuario guarda una página en HTML o usa «Guardar varias pestañas». Sirve para descargar las imágenes, hojas de estilo y fuentes que la página carga desde otros dominios o CDN e incrustarlas en el archivo guardado, y para leer y guardar las pestañas que el usuario marca en «Guardar varias pestañas» (que no son la pestaña activa). Para leer, recorrer y capturar la pestaña basta activeTab. Si el usuario no lo concede, la extensión funciona igual y esos recursos quedan enlazados. No se envía nada a ningún servidor.

**¿Utilizas código remoto?** No, no utilizo código remoto. (Si el formulario pide motivo: «Todo el código JavaScript va incluido en el paquete de la extensión; no se carga ni ejecuta código externo».)

**Uso de datos:** no marques ninguna casilla de datos recopilados: todo se procesa en el equipo del usuario y no se transmite nada. Marca las tres certificaciones:
- No vendo ni transfiero datos de usuario a terceros, fuera de los casos de uso aprobados.
- No uso ni transfiero datos de usuario para fines no relacionados con la finalidad única del elemento.
- No uso ni transfiero datos de usuario para determinar la solvencia ni con fines de préstamo.

**URL de la política de privacidad:** la del aviso legal publicado (ver más abajo).

---

## Aviso legal y política de privacidad (publícala y pega la URL)

**Aviso legal, términos de uso y política de privacidad de FullPage Saver** — última actualización: 15 de octubre de 2026

**1. Titular.** FullPage Saver es una extensión gratuita desarrollada y publicada por **Danny Medina Coronel**, que actúa como particular y no como comerciante. Contacto: empresademkor@gmail.com

**2. Qué hace la extensión.** Guarda en el equipo del usuario una copia local (HTML, PDF o MHT) de la página web que el propio usuario está viendo y decide guardar. No aloja, publica ni distribuye contenido de terceros.

**3. Responsabilidad del usuario.** El usuario es el único responsable del uso que haga de la extensión y de las copias que genere. Al usarla, se compromete a:
- Guardar solo contenido sobre el que tenga derechos, permiso del titular o un uso permitido por la ley (por ejemplo, la copia privada en los términos legales).
- Respetar la propiedad intelectual e industrial, los términos de uso de cada sitio web y la normativa de protección de datos.
- No usar la extensión para eludir medidas tecnológicas de protección, contraseñas, restricciones de acceso ni sistemas anticopia.
- No distribuir, publicar, vender ni compartir con terceros las copias obtenidas sin autorización de sus titulares.

**4. Exención de responsabilidad.** La extensión se ofrece gratuitamente «tal cual», sin garantías de ningún tipo, incluidas las de funcionamiento ininterrumpido, ausencia de errores, exactitud de las copias o adecuación a un fin concreto. En la máxima medida permitida por la ley, el titular no se hace responsable del uso que los usuarios hagan de la extensión ni de los archivos que generen con ella, de las infracciones de derechos de terceros cometidas por los usuarios, ni de los daños o perjuicios directos o indirectos, pérdida de datos o de información derivados del uso o de la imposibilidad de uso de la extensión. Esta exención no limita la responsabilidad que, según la ley aplicable, no pueda excluirse, ni los derechos que la normativa de consumidores reconozca al usuario.

**5. Sin relación con otros sitios.** FullPage Saver no está afiliada, patrocinada ni respaldada por ninguno de los sitios web en los que se use. Las marcas y contenidos de esos sitios pertenecen a sus respectivos titulares.

**6. Política de privacidad.** Responsable: Danny Medina Coronel · empresademkor@gmail.com

FullPage Saver no recopila, almacena, transmite ni vende datos personales. El contenido de las páginas que el usuario decide guardar se procesa exclusivamente en su navegador y se guarda solo en su equipo, mediante la descarga que él mismo confirma. La extensión no usa analítica, publicidad, cookies de seguimiento ni código remoto.

Para incrustar imágenes, estilos y fuentes en la copia, la extensión los descarga directamente desde los servidores de origen de la página, igual que al visitarla; esos servidores reciben la dirección IP del usuario como en cualquier visita.

Los datos temporales del conversor PDF, el idioma y el tema elegidos y el número de guardados (para la invitación a valorar la extensión) se guardan en el almacenamiento local de la extensión, no salen del equipo y el usuario puede borrarlos en cualquier momento con «Eliminar datos temporales» o desinstalando la extensión.

Como el titular no trata datos personales de los usuarios, no hay datos que consultar, rectificar o suprimir. Para cualquier consulta sobre privacidad o para ejercer los derechos que reconoce el Reglamento General de Protección de Datos (RGPD), se puede escribir a empresademkor@gmail.com. El usuario también puede presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).

**7. Legislación aplicable.** Este aviso se rige por la legislación española, sin perjuicio de los derechos que la normativa de su país de residencia reconozca al usuario consumidor.

**8. Contacto y avisos de infracción.** Para dudas, sugerencias o para comunicar un uso indebido, escribe a empresademkor@gmail.com.
