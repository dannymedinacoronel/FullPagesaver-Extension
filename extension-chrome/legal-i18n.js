// Aviso legal, términos de uso y política de privacidad en cada idioma.
// La versión en español es la de referencia.
const MAIL = '<a href="mailto:empresademkor@gmail.com">empresademkor@gmail.com</a>';
const OWNER = "<strong>Danny Medina Coronel</strong>";

const LEGAL = {
  es: {
    h1: "Aviso legal, términos de uso y privacidad",
    updated: "Última actualización: 15 de octubre de 2026",
    t1: "Titular", p1: `FullPage Saver es una extensión gratuita desarrollada y publicada por ${OWNER}, que actúa como particular y no como comerciante.`, contact: "Contacto",
    t2: "Qué hace la extensión", p2: "FullPage Saver es una herramienta que guarda en el equipo del usuario una copia local (HTML, PDF o MHT) de la página web que el propio usuario está viendo y decide guardar. No aloja, publica ni distribuye contenido de terceros.",
    t3: "Responsabilidad del usuario", p3: "<strong>El usuario es el único responsable del uso que haga de la extensión y de las copias que genere.</strong> Al usarla, el usuario se compromete a:",
    l3: [
      "Guardar solo contenido sobre el que tenga derechos, permiso del titular o un uso permitido por la ley (por ejemplo, la copia privada en los términos legales).",
      "Respetar la propiedad intelectual e industrial, los términos de uso de cada sitio web y la normativa de protección de datos.",
      "No usar la extensión para eludir medidas tecnológicas de protección, contraseñas, restricciones de acceso ni sistemas anticopia.",
      "No distribuir, publicar, vender ni compartir con terceros las copias obtenidas sin autorización de sus titulares."
    ],
    t4: "Exención de responsabilidad",
    p4: [
      "La extensión se ofrece gratuitamente «tal cual», sin garantías de ningún tipo, incluidas las de funcionamiento ininterrumpido, ausencia de errores, exactitud de las copias o adecuación a un fin concreto.",
      "En la máxima medida permitida por la ley, el titular <strong>no se hace responsable</strong> del uso que los usuarios hagan de la extensión ni de los archivos que generen con ella, de las infracciones de derechos de terceros cometidas por los usuarios, ni de los daños o perjuicios directos o indirectos, pérdida de datos o de información derivados del uso o de la imposibilidad de uso de la extensión.",
      "Esta exención no limita la responsabilidad que, según la ley aplicable, no pueda excluirse, ni los derechos que la normativa de consumidores reconozca al usuario."
    ],
    t5: "Sin relación con otros sitios", p5: "FullPage Saver no está afiliada, patrocinada ni respaldada por ninguno de los sitios web en los que se use. Las marcas y contenidos de esos sitios pertenecen a sus respectivos titulares.",
    t6: "Política de privacidad", resp: "Responsable",
    p6: [
      "FullPage Saver <strong>no recopila, almacena, transmite ni vende datos personales</strong>. El contenido de las páginas que el usuario decide guardar se procesa exclusivamente en su navegador y se guarda solo en su equipo, mediante la descarga que él mismo confirma. La extensión no usa analítica, publicidad, cookies de seguimiento ni código remoto.",
      "Para incrustar imágenes, estilos y fuentes en la copia, la extensión los descarga directamente desde los servidores de origen de la página, igual que al visitarla; esos servidores reciben la dirección IP del usuario como en cualquier visita.",
      "Los datos temporales del conversor PDF, el idioma y el tema elegidos y el número de guardados (para la invitación a valorar la extensión) se guardan en el almacenamiento local de la extensión, no salen del equipo y el usuario puede borrarlos en cualquier momento con «Eliminar datos temporales» o desinstalando la extensión.",
      `Como el titular no trata datos personales de los usuarios, no hay datos que consultar, rectificar o suprimir. Para cualquier consulta sobre privacidad o para ejercer los derechos que reconoce el Reglamento General de Protección de Datos (RGPD), se puede escribir a ${MAIL}. El usuario también puede presentar una reclamación ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).`
    ],
    t7: "Legislación aplicable", p7: "Este aviso se rige por la legislación española, sin perjuicio de los derechos que la normativa de su país de residencia reconozca al usuario consumidor.",
    t8: "Contacto y avisos de infracción", p8: `Para dudas, sugerencias o para comunicar un uso indebido, escribe a ${MAIL}.`,
    prevail: ""
  },
  ca: {
    h1: "Avís legal, condicions d'ús i privadesa",
    updated: "Darrera actualització: 15 d'octubre de 2026",
    t1: "Titular", p1: `FullPage Saver és una extensió gratuïta desenvolupada i publicada per ${OWNER}, que actua com a particular i no com a comerciant.`, contact: "Contacte",
    t2: "Què fa l'extensió", p2: "FullPage Saver és una eina que desa a l'equip de l'usuari una còpia local (HTML, PDF o MHT) de la pàgina web que el mateix usuari està veient i decideix desar. No allotja, publica ni distribueix contingut de tercers.",
    t3: "Responsabilitat de l'usuari", p3: "<strong>L'usuari és l'únic responsable de l'ús que faci de l'extensió i de les còpies que generi.</strong> En fer-la servir, l'usuari es compromet a:",
    l3: [
      "Desar només contingut sobre el qual tingui drets, permís del titular o un ús permès per la llei (per exemple, la còpia privada en els termes legals).",
      "Respectar la propietat intel·lectual i industrial, les condicions d'ús de cada lloc web i la normativa de protecció de dades.",
      "No fer servir l'extensió per eludir mesures tecnològiques de protecció, contrasenyes, restriccions d'accés ni sistemes anticòpia.",
      "No distribuir, publicar, vendre ni compartir amb tercers les còpies obtingudes sense autorització dels seus titulars."
    ],
    t4: "Exempció de responsabilitat",
    p4: [
      "L'extensió s'ofereix gratuïtament «tal com és», sense garanties de cap mena, incloses les de funcionament ininterromput, absència d'errors, exactitud de les còpies o adequació a una finalitat concreta.",
      "En la màxima mesura permesa per la llei, el titular <strong>no es fa responsable</strong> de l'ús que els usuaris facin de l'extensió ni dels fitxers que generin amb ella, de les infraccions de drets de tercers comeses pels usuaris, ni dels danys o perjudicis directes o indirectes, pèrdua de dades o d'informació derivats de l'ús o de la impossibilitat d'ús de l'extensió.",
      "Aquesta exempció no limita la responsabilitat que, segons la llei aplicable, no es pugui excloure, ni els drets que la normativa de consumidors reconegui a l'usuari."
    ],
    t5: "Sense relació amb altres llocs", p5: "FullPage Saver no està afiliada, patrocinada ni avalada per cap dels llocs web on es faci servir. Les marques i continguts d'aquests llocs pertanyen als seus respectius titulars.",
    t6: "Política de privadesa", resp: "Responsable",
    p6: [
      "FullPage Saver <strong>no recull, emmagatzema, transmet ni ven dades personals</strong>. El contingut de les pàgines que l'usuari decideix desar es processa exclusivament al seu navegador i es desa només al seu equip, mitjançant la baixada que ell mateix confirma. L'extensió no fa servir analítica, publicitat, galetes de seguiment ni codi remot.",
      "Per incrustar imatges, estils i fonts a la còpia, l'extensió els baixa directament dels servidors d'origen de la pàgina, igual que en visitar-la; aquests servidors reben l'adreça IP de l'usuari com en qualsevol visita.",
      "Les dades temporals del convertidor PDF, l'idioma i el tema triats i el nombre de desaments (per a la invitació a valorar l'extensió) es desen a l'emmagatzematge local de l'extensió, no surten de l'equip i l'usuari les pot esborrar en qualsevol moment amb «Elimina les dades temporals» o desinstal·lant l'extensió.",
      `Com que el titular no tracta dades personals dels usuaris, no hi ha dades per consultar, rectificar o suprimir. Per a qualsevol consulta sobre privadesa o per exercir els drets que reconeix el Reglament General de Protecció de Dades (RGPD), es pot escriure a ${MAIL}. L'usuari també pot presentar una reclamació davant l'Agència Espanyola de Protecció de Dades (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).`
    ],
    t7: "Legislació aplicable", p7: "Aquest avís es regeix per la legislació espanyola, sens perjudici dels drets que la normativa del seu país de residència reconegui a l'usuari consumidor.",
    t8: "Contacte i avisos d'infracció", p8: `Per a dubtes, suggeriments o per comunicar un ús indegut, escriu a ${MAIL}.`,
    prevail: "Aquesta és una traducció. En cas de discrepància, preval la versió en castellà."
  },
  en: {
    h1: "Legal notice, terms of use and privacy",
    updated: "Last updated: 15 October 2026",
    t1: "Owner", p1: `FullPage Saver is a free extension developed and published by ${OWNER}, acting as a private individual and not as a trader.`, contact: "Contact",
    t2: "What the extension does", p2: "FullPage Saver is a tool that saves, on the user's computer, a local copy (HTML, PDF or MHT) of the web page the user is viewing and chooses to save. It does not host, publish or distribute third-party content.",
    t3: "User responsibility", p3: "<strong>The user is solely responsible for how they use the extension and the copies they create.</strong> By using it, the user agrees to:",
    l3: [
      "Only save content they have rights to, permission from the owner, or a use permitted by law (for example, private copying under the legal terms).",
      "Respect intellectual and industrial property, each website's terms of use and data protection law.",
      "Not use the extension to circumvent technological protection measures, passwords, access restrictions or copy-protection systems.",
      "Not distribute, publish, sell or share with third parties the copies obtained without the owners' authorisation."
    ],
    t4: "Disclaimer",
    p4: [
      "The extension is provided free of charge “as is”, without warranties of any kind, including uninterrupted operation, absence of errors, accuracy of the copies or fitness for a particular purpose.",
      "To the maximum extent permitted by law, the owner <strong>accepts no liability</strong> for how users use the extension or the files they create with it, for infringements of third-party rights committed by users, or for any direct or indirect damage, loss of data or information arising from the use of, or inability to use, the extension.",
      "This disclaimer does not limit any liability that cannot be excluded under applicable law, nor the rights granted to the user by consumer protection law."
    ],
    t5: "No affiliation with other sites", p5: "FullPage Saver is not affiliated with, sponsored or endorsed by any of the websites on which it is used. The trademarks and content of those sites belong to their respective owners.",
    t6: "Privacy policy", resp: "Data controller",
    p6: [
      "FullPage Saver <strong>does not collect, store, transmit or sell personal data</strong>. The content of the pages the user chooses to save is processed exclusively in their browser and saved only on their computer, through the download they confirm. The extension does not use analytics, advertising, tracking cookies or remote code.",
      "To embed images, styles and fonts in the copy, the extension downloads them directly from the page's origin servers, just as when visiting it; those servers receive the user's IP address as in any visit.",
      "The PDF converter's temporary data the chosen language and theme, and the number of saves (for the invitation to rate the extension) are kept in the extension's local storage, never leave the computer, and the user can delete them at any time with “Delete temporary data” or by uninstalling the extension.",
      `As the owner does not process users' personal data, there is no data to access, rectify or erase. For any privacy question, or to exercise the rights granted by the General Data Protection Regulation (GDPR), write to ${MAIL}. The user may also lodge a complaint with the Spanish Data Protection Agency (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).`
    ],
    t7: "Governing law", p7: "This notice is governed by Spanish law, without prejudice to the rights granted to consumers by the law of their country of residence.",
    t8: "Contact and infringement reports", p8: `For questions, suggestions or to report misuse, write to ${MAIL}.`,
    prevail: "This is a translation. In case of discrepancy, the Spanish version prevails."
  },
  fr: {
    h1: "Mentions légales, conditions d'utilisation et confidentialité",
    updated: "Dernière mise à jour : 15 octobre 2026",
    t1: "Titulaire", p1: `FullPage Saver est une extension gratuite développée et publiée par ${OWNER}, qui agit en tant que particulier et non en tant que professionnel.`, contact: "Contact",
    t2: "Ce que fait l'extension", p2: "FullPage Saver est un outil qui enregistre sur l'ordinateur de l'utilisateur une copie locale (HTML, PDF ou MHT) de la page web que l'utilisateur consulte et décide d'enregistrer. Elle n'héberge, ne publie ni ne distribue de contenu de tiers.",
    t3: "Responsabilité de l'utilisateur", p3: "<strong>L'utilisateur est seul responsable de l'usage qu'il fait de l'extension et des copies qu'il crée.</strong> En l'utilisant, l'utilisateur s'engage à :",
    l3: [
      "N'enregistrer que du contenu sur lequel il détient des droits, l'autorisation du titulaire ou un usage permis par la loi (par exemple, la copie privée dans les conditions légales).",
      "Respecter la propriété intellectuelle et industrielle, les conditions d'utilisation de chaque site web et la réglementation sur la protection des données.",
      "Ne pas utiliser l'extension pour contourner des mesures techniques de protection, des mots de passe, des restrictions d'accès ou des systèmes anti-copie.",
      "Ne pas distribuer, publier, vendre ni partager avec des tiers les copies obtenues sans l'autorisation de leurs titulaires."
    ],
    t4: "Exonération de responsabilité",
    p4: [
      "L'extension est fournie gratuitement « en l'état », sans garantie d'aucune sorte, notamment de fonctionnement ininterrompu, d'absence d'erreurs, d'exactitude des copies ou d'adéquation à un usage particulier.",
      "Dans toute la mesure permise par la loi, le titulaire <strong>décline toute responsabilité</strong> quant à l'usage que les utilisateurs font de l'extension ou des fichiers qu'ils créent avec elle, aux atteintes aux droits de tiers commises par les utilisateurs, ainsi qu'aux dommages directs ou indirects, pertes de données ou d'informations résultant de l'utilisation ou de l'impossibilité d'utiliser l'extension.",
      "Cette exonération ne limite pas la responsabilité qui ne peut être exclue selon la loi applicable, ni les droits reconnus à l'utilisateur par le droit de la consommation."
    ],
    t5: "Aucun lien avec d'autres sites", p5: "FullPage Saver n'est ni affiliée, ni parrainée, ni approuvée par aucun des sites web sur lesquels elle est utilisée. Les marques et contenus de ces sites appartiennent à leurs titulaires respectifs.",
    t6: "Politique de confidentialité", resp: "Responsable du traitement",
    p6: [
      "FullPage Saver <strong>ne collecte, ne stocke, ne transmet ni ne vend de données personnelles</strong>. Le contenu des pages que l'utilisateur choisit d'enregistrer est traité exclusivement dans son navigateur et enregistré uniquement sur son ordinateur, via le téléchargement qu'il confirme lui-même. L'extension n'utilise ni analyse, ni publicité, ni cookies de suivi, ni code distant.",
      "Pour intégrer images, styles et polices dans la copie, l'extension les télécharge directement depuis les serveurs d'origine de la page, comme lors d'une visite ; ces serveurs reçoivent l'adresse IP de l'utilisateur comme pour toute visite.",
      "Les données temporaires du convertisseur PDF, la langue et le thème choisis ainsi que le nombre d'enregistrements (pour l'invitation à noter l'extension) sont conservés dans le stockage local de l'extension, ne quittent pas l'ordinateur et l'utilisateur peut les supprimer à tout moment avec « Supprimer les données temporaires » ou en désinstallant l'extension.",
      `Le titulaire ne traitant pas de données personnelles des utilisateurs, il n'existe aucune donnée à consulter, rectifier ou effacer. Pour toute question relative à la confidentialité ou pour exercer les droits prévus par le Règlement général sur la protection des données (RGPD), écrivez à ${MAIL}. L'utilisateur peut également déposer une réclamation auprès de l'Agence espagnole de protection des données (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).`
    ],
    t7: "Droit applicable", p7: "Les présentes mentions sont régies par le droit espagnol, sans préjudice des droits reconnus au consommateur par la loi de son pays de résidence.",
    t8: "Contact et signalement d'infractions", p8: `Pour toute question, suggestion ou pour signaler un usage abusif, écrivez à ${MAIL}.`,
    prevail: "Ceci est une traduction. En cas de divergence, la version espagnole prévaut."
  },
  pt: {
    h1: "Aviso legal, termos de utilização e privacidade",
    updated: "Última atualização: 15 de outubro de 2026",
    t1: "Titular", p1: `O FullPage Saver é uma extensão gratuita desenvolvida e publicada por ${OWNER}, que atua como particular e não como comerciante.`, contact: "Contacto",
    t2: "O que faz a extensão", p2: "O FullPage Saver é uma ferramenta que guarda no computador do utilizador uma cópia local (HTML, PDF ou MHT) da página web que o próprio utilizador está a ver e decide guardar. Não aloja, publica nem distribui conteúdo de terceiros.",
    t3: "Responsabilidade do utilizador", p3: "<strong>O utilizador é o único responsável pelo uso que fizer da extensão e das cópias que gerar.</strong> Ao utilizá-la, o utilizador compromete-se a:",
    l3: [
      "Guardar apenas conteúdo sobre o qual tenha direitos, autorização do titular ou uma utilização permitida por lei (por exemplo, a cópia privada nos termos legais).",
      "Respeitar a propriedade intelectual e industrial, os termos de utilização de cada site e a legislação de proteção de dados.",
      "Não utilizar a extensão para contornar medidas tecnológicas de proteção, palavras-passe, restrições de acesso ou sistemas anticópia.",
      "Não distribuir, publicar, vender nem partilhar com terceiros as cópias obtidas sem autorização dos respetivos titulares."
    ],
    t4: "Exclusão de responsabilidade",
    p4: [
      "A extensão é disponibilizada gratuitamente «tal como está», sem garantias de qualquer tipo, incluindo funcionamento ininterrupto, ausência de erros, exatidão das cópias ou adequação a um fim específico.",
      "Na máxima medida permitida por lei, o titular <strong>não se responsabiliza</strong> pelo uso que os utilizadores façam da extensão nem pelos ficheiros que gerem com ela, pelas violações de direitos de terceiros cometidas pelos utilizadores, nem pelos danos diretos ou indiretos, perda de dados ou de informação decorrentes do uso ou da impossibilidade de uso da extensão.",
      "Esta exclusão não limita a responsabilidade que, nos termos da lei aplicável, não possa ser excluída, nem os direitos que a legislação de defesa do consumidor reconheça ao utilizador."
    ],
    t5: "Sem relação com outros sites", p5: "O FullPage Saver não é afiliado, patrocinado nem apoiado por nenhum dos sites em que é utilizado. As marcas e os conteúdos desses sites pertencem aos respetivos titulares.",
    t6: "Política de privacidade", resp: "Responsável",
    p6: [
      "O FullPage Saver <strong>não recolhe, armazena, transmite nem vende dados pessoais</strong>. O conteúdo das páginas que o utilizador decide guardar é processado exclusivamente no seu navegador e guardado apenas no seu computador, através da transferência que ele próprio confirma. A extensão não utiliza análise, publicidade, cookies de rastreio nem código remoto.",
      "Para incorporar imagens, estilos e tipos de letra na cópia, a extensão descarrega-os diretamente dos servidores de origem da página, tal como ao visitá-la; esses servidores recebem o endereço IP do utilizador como em qualquer visita.",
      "Os dados temporários do conversor PDF, o idioma e o tema escolhidos e o número de gravações (para o convite a avaliar a extensão) são guardados no armazenamento local da extensão, não saem do computador e o utilizador pode apagá-los a qualquer momento com «Eliminar dados temporários» ou desinstalando a extensão.",
      `Como o titular não trata dados pessoais dos utilizadores, não existem dados para consultar, retificar ou apagar. Para qualquer questão sobre privacidade ou para exercer os direitos reconhecidos pelo Regulamento Geral sobre a Proteção de Dados (RGPD), pode escrever para ${MAIL}. O utilizador pode ainda apresentar reclamação junto da Agência Espanhola de Proteção de Dados (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).`
    ],
    t7: "Legislação aplicável", p7: "Este aviso rege-se pela legislação espanhola, sem prejuízo dos direitos que a legislação do país de residência reconheça ao utilizador consumidor.",
    t8: "Contacto e denúncias de infrações", p8: `Para dúvidas, sugestões ou para comunicar um uso indevido, escreva para ${MAIL}.`,
    prevail: "Esta é uma tradução. Em caso de divergência, prevalece a versão em espanhol."
  },
  de: {
    h1: "Impressum, Nutzungsbedingungen und Datenschutz",
    updated: "Zuletzt aktualisiert: 15. Oktober 2026",
    t1: "Anbieter", p1: `FullPage Saver ist eine kostenlose Erweiterung, entwickelt und veröffentlicht von ${OWNER}, der als Privatperson und nicht als Unternehmer handelt.`, contact: "Kontakt",
    t2: "Was die Erweiterung macht", p2: "FullPage Saver ist ein Werkzeug, das auf dem Computer des Nutzers eine lokale Kopie (HTML, PDF oder MHT) der Webseite speichert, die der Nutzer gerade ansieht und speichern möchte. Es werden keine Inhalte Dritter gehostet, veröffentlicht oder verbreitet.",
    t3: "Verantwortung des Nutzers", p3: "<strong>Der Nutzer ist allein für die Nutzung der Erweiterung und der von ihm erstellten Kopien verantwortlich.</strong> Mit der Nutzung verpflichtet sich der Nutzer:",
    l3: [
      "Nur Inhalte zu speichern, an denen er Rechte hat, für die er eine Erlaubnis des Rechteinhabers hat oder deren Nutzung gesetzlich erlaubt ist (z. B. Privatkopie im gesetzlichen Rahmen).",
      "Das geistige und gewerbliche Eigentum, die Nutzungsbedingungen jeder Website und das Datenschutzrecht zu beachten.",
      "Die Erweiterung nicht zu nutzen, um technische Schutzmaßnahmen, Passwörter, Zugangsbeschränkungen oder Kopierschutzsysteme zu umgehen.",
      "Die erstellten Kopien nicht ohne Zustimmung der Rechteinhaber zu verbreiten, zu veröffentlichen, zu verkaufen oder an Dritte weiterzugeben."
    ],
    t4: "Haftungsausschluss",
    p4: [
      "Die Erweiterung wird kostenlos „wie besehen“ bereitgestellt, ohne Gewährleistung jeglicher Art, insbesondere für ununterbrochenen Betrieb, Fehlerfreiheit, Genauigkeit der Kopien oder Eignung für einen bestimmten Zweck.",
      "Soweit gesetzlich zulässig, <strong>übernimmt der Anbieter keine Haftung</strong> für die Nutzung der Erweiterung oder der damit erstellten Dateien durch die Nutzer, für Verletzungen von Rechten Dritter durch die Nutzer sowie für unmittelbare oder mittelbare Schäden, Daten- oder Informationsverluste, die aus der Nutzung oder der Unmöglichkeit der Nutzung der Erweiterung entstehen.",
      "Dieser Ausschluss beschränkt weder eine Haftung, die nach geltendem Recht nicht ausgeschlossen werden kann, noch die Rechte, die das Verbraucherschutzrecht dem Nutzer gewährt."
    ],
    t5: "Keine Verbindung zu anderen Websites", p5: "FullPage Saver steht in keiner Verbindung zu den Websites, auf denen die Erweiterung verwendet wird, und wird von ihnen weder gesponsert noch unterstützt. Die Marken und Inhalte dieser Websites gehören ihren jeweiligen Inhabern.",
    t6: "Datenschutzerklärung", resp: "Verantwortlicher",
    p6: [
      "FullPage Saver <strong>erhebt, speichert, überträgt oder verkauft keine personenbezogenen Daten</strong>. Der Inhalt der Seiten, die der Nutzer speichern möchte, wird ausschließlich in seinem Browser verarbeitet und nur auf seinem Computer gespeichert, über den Download, den er selbst bestätigt. Die Erweiterung verwendet keine Analyse, Werbung, Tracking-Cookies oder Fremdcode.",
      "Um Bilder, Stile und Schriften in die Kopie einzubetten, lädt die Erweiterung sie direkt von den Ursprungsservern der Seite herunter, wie bei einem normalen Besuch; diese Server erhalten dabei wie bei jedem Besuch die IP-Adresse des Nutzers.",
      "Die temporären Daten des PDF-Konverters die gewählte Sprache, das Design und die Anzahl der Speichervorgänge (für die Einladung zur Bewertung) werden im lokalen Speicher der Erweiterung abgelegt, verlassen den Computer nicht und können jederzeit mit „Temporäre Daten löschen“ oder durch Deinstallation der Erweiterung gelöscht werden.",
      `Da der Anbieter keine personenbezogenen Daten der Nutzer verarbeitet, gibt es keine Daten, die eingesehen, berichtigt oder gelöscht werden könnten. Für Fragen zum Datenschutz oder zur Ausübung der Rechte nach der Datenschutz-Grundverordnung (DSGVO) schreibe an ${MAIL}. Der Nutzer kann außerdem Beschwerde bei der spanischen Datenschutzbehörde einlegen (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).`
    ],
    t7: "Anwendbares Recht", p7: "Für diesen Hinweis gilt spanisches Recht, unbeschadet der Rechte, die das Recht des Wohnsitzlandes dem Verbraucher gewährt.",
    t8: "Kontakt und Meldung von Verstößen", p8: `Für Fragen, Vorschläge oder zur Meldung von Missbrauch schreibe an ${MAIL}.`,
    prevail: "Dies ist eine Übersetzung. Im Zweifel ist die spanische Fassung maßgeblich."
  },
  it: {
    h1: "Note legali, condizioni d'uso e privacy",
    updated: "Ultimo aggiornamento: 15 ottobre 2026",
    t1: "Titolare", p1: `FullPage Saver è un'estensione gratuita sviluppata e pubblicata da ${OWNER}, che agisce come privato e non come professionista.`, contact: "Contatto",
    t2: "Cosa fa l'estensione", p2: "FullPage Saver è uno strumento che salva sul computer dell'utente una copia locale (HTML, PDF o MHT) della pagina web che l'utente sta visualizzando e decide di salvare. Non ospita, pubblica né distribuisce contenuti di terzi.",
    t3: "Responsabilità dell'utente", p3: "<strong>L'utente è l'unico responsabile dell'uso che fa dell'estensione e delle copie che genera.</strong> Utilizzandola, l'utente si impegna a:",
    l3: [
      "Salvare solo contenuti su cui ha diritti, l'autorizzazione del titolare o un uso consentito dalla legge (ad esempio la copia privata nei termini di legge).",
      "Rispettare la proprietà intellettuale e industriale, le condizioni d'uso di ogni sito web e la normativa sulla protezione dei dati.",
      "Non usare l'estensione per aggirare misure tecnologiche di protezione, password, restrizioni di accesso o sistemi anticopia.",
      "Non distribuire, pubblicare, vendere né condividere con terzi le copie ottenute senza l'autorizzazione dei rispettivi titolari."
    ],
    t4: "Esclusione di responsabilità",
    p4: [
      "L'estensione è offerta gratuitamente «così com'è», senza garanzie di alcun tipo, comprese quelle di funzionamento ininterrotto, assenza di errori, esattezza delle copie o idoneità a uno scopo particolare.",
      "Nella misura massima consentita dalla legge, il titolare <strong>non è responsabile</strong> dell'uso che gli utenti fanno dell'estensione o dei file generati con essa, delle violazioni di diritti di terzi commesse dagli utenti, né dei danni diretti o indiretti, perdita di dati o di informazioni derivanti dall'uso o dall'impossibilità di usare l'estensione.",
      "Questa esclusione non limita la responsabilità che, secondo la legge applicabile, non può essere esclusa, né i diritti riconosciuti all'utente dalla normativa a tutela dei consumatori."
    ],
    t5: "Nessun legame con altri siti", p5: "FullPage Saver non è affiliata, sponsorizzata né approvata da alcuno dei siti web in cui viene utilizzata. I marchi e i contenuti di tali siti appartengono ai rispettivi titolari.",
    t6: "Informativa sulla privacy", resp: "Titolare del trattamento",
    p6: [
      "FullPage Saver <strong>non raccoglie, conserva, trasmette né vende dati personali</strong>. Il contenuto delle pagine che l'utente decide di salvare viene elaborato esclusivamente nel suo browser e salvato solo sul suo computer, tramite il download che egli stesso conferma. L'estensione non utilizza analisi, pubblicità, cookie di tracciamento né codice remoto.",
      "Per incorporare immagini, stili e font nella copia, l'estensione li scarica direttamente dai server di origine della pagina, come durante una visita; tali server ricevono l'indirizzo IP dell'utente come in qualsiasi visita.",
      "I dati temporanei del convertitore PDF, la lingua e il tema scelti e il numero di salvataggi (per l'invito a valutare l'estensione) sono conservati nella memoria locale dell'estensione, non lasciano il computer e l'utente può eliminarli in qualsiasi momento con «Elimina dati temporanei» o disinstallando l'estensione.",
      `Poiché il titolare non tratta dati personali degli utenti, non ci sono dati da consultare, rettificare o cancellare. Per qualsiasi domanda sulla privacy o per esercitare i diritti previsti dal Regolamento generale sulla protezione dei dati (GDPR), scrivi a ${MAIL}. L'utente può inoltre presentare reclamo all'Agenzia spagnola per la protezione dei dati (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).`
    ],
    t7: "Legge applicabile", p7: "Le presenti note sono disciplinate dalla legge spagnola, fatti salvi i diritti riconosciuti al consumatore dalla legge del suo paese di residenza.",
    t8: "Contatti e segnalazioni di violazioni", p8: `Per dubbi, suggerimenti o per segnalare un uso improprio, scrivi a ${MAIL}.`,
    prevail: "Questa è una traduzione. In caso di discrepanza prevale la versione spagnola."
  }
};

function renderLegal() {
  const L = LEGAL[currentLang] || LEGAL.es;
  document.querySelector("#legal").innerHTML = `
    <h1>${L.h1}</h1>
    <p class="updated">FullPage Saver · ${L.updated}</p>
    ${L.prevail ? `<p class="updated">${L.prevail}</p>` : ""}
    <h2>1. ${L.t1}</h2>
    <p>${L.p1}<br>${L.contact}: ${MAIL}</p>
    <h2>2. ${L.t2}</h2>
    <p>${L.p2}</p>
    <h2>3. ${L.t3}</h2>
    <div class="highlight"><p>${L.p3}</p><ul>${L.l3.map(item => `<li>${item}</li>`).join("")}</ul></div>
    <h2>4. ${L.t4}</h2>
    ${L.p4.map(text => `<p>${text}</p>`).join("")}
    <h2>5. ${L.t5}</h2>
    <p>${L.p5}</p>
    <h2>6. ${L.t6}</h2>
    <p><strong>${L.resp}:</strong> Danny Medina Coronel · ${MAIL}</p>
    ${L.p6.map(text => `<p>${text}</p>`).join("")}
    <h2>7. ${L.t7}</h2>
    <p>${L.p7}</p>
    <h2>8. ${L.t8}</h2>
    <p>${L.p8}</p>`;
}

renderLegal();
document.addEventListener("fps-langchange", renderLegal);
