/*
  La vitrine : langues, theme, activation, journal des versions (cahier §7).

  Le site ne conserve rien. La page de confirmation et le PDF sont les deux
  copies qui partent chez l'utilisateur, et il n'y en aura pas d'autres : le
  site n'a ni adresse a qui ecrire, ni compte a retrouver.
*/

/**
 * Les langues servies. Ajouter une langue : poser /lang/<code>.json, puis
 * ecrire son code ici. Rien d'autre - les textes vivent tous dans les
 * catalogues, jamais dans la page.
 */
const LANGUAGES = ['en', 'fr'];

const LANGUAGE_KEY = 'lobby.site.lang';
const THEME_KEY = 'lobby.site.theme';

/* ----- le theme ----- */

function readTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;

  // Sans choix, celui du systeme : la vitrine s'accorde au bureau qui l'ouvre.
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/*
  Les captures existent en deux versions, comme l'application : montrer la
  fenetre sombre sur une page claire donnait un trou noir au milieu de la page.
*/
function dressShots(theme) {
  for (const image of document.querySelectorAll('img[data-dark]')) {
    const wanted = theme === 'light' ? image.dataset.light : image.dataset.dark;
    if (wanted && image.getAttribute('src') !== wanted) image.setAttribute('src', wanted);
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  dressShots(theme);
}

applyTheme(readTheme());

document.querySelector('#theme')?.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

/* ----- la page ouverte ----- */

/*
  Le lien de la page courante se marque ici plutot que dans chaque page : six
  fichiers a corriger a chaque ajout, c'etait six occasions de se tromper.
  Servie a la racine, l'adresse peut ne porter aucun nom : c'est alors l'accueil.
*/
function markCurrentPage() {
  const here = location.pathname.split('/').pop() || 'index.html';

  for (const link of document.querySelectorAll('.links a')) {
    const target = link.getAttribute('href');
    if (target === here) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

markCurrentPage();

/* ----- le menu des pages, sur ecran etroit ----- */

/*
  Sous 900 px la rangee de liens laisse la place a un bouton. Le menu se ferme
  aussi quand on choisit la page ou l'on est deja : aucune navigation ne
  viendrait alors le refermer, et il resterait ouvert sur la page qu'il cache.
*/
const header = document.querySelector('.top');
const burger = document.querySelector('#menu');

function shutMenu() {
  if (!header) return;
  header.dataset.menu = 'shut';
  burger?.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', awayFromMenu);
  document.removeEventListener('keydown', escapeMenu);
}

function openMenu() {
  if (!header) return;
  closeLanguages();
  header.dataset.menu = 'open';
  burger?.setAttribute('aria-expanded', 'true');

  // Le clic qui vient d'ouvrir arriverait sinon jusqu'a l'ecoute, et le
  // refermerait dans le meme geste.
  setTimeout(() => {
    document.addEventListener('pointerdown', awayFromMenu);
    document.addEventListener('keydown', escapeMenu);
  }, 0);
}

function awayFromMenu(event) {
  if (!header?.contains(event.target)) shutMenu();
}

function escapeMenu(event) {
  if (event.key === 'Escape') shutMenu();
}

burger?.addEventListener('click', () => {
  if (header?.dataset.menu === 'open') shutMenu();
  else openMenu();
});

for (const link of document.querySelectorAll('.links a')) {
  link.addEventListener('click', shutMenu);
}

/* ----- les langues ----- */

/** La langue demandee, ou celle du navigateur, ou l'anglais. */
function wantedLanguage() {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored && LANGUAGES.includes(stored)) return stored;

  for (const tag of navigator.languages ?? [navigator.language ?? 'en']) {
    const code = tag.slice(0, 2).toLowerCase();
    if (LANGUAGES.includes(code)) return code;
  }

  return LANGUAGES[0];
}

/*
  Les drapeaux du choix de la langue.

  Une langue n'est pas un pays, mais un drapeau se reconnait d'un coup d'oeil
  la ou deux lettres se lisent. La table dit quel pays represente quelle
  langue, et c'est le seul endroit ou ce choix est fait. Le cadre est 24 x 16.
*/
const FLAGS = {
  fr:
    '<rect width="8" height="16" fill="#0055A4"/>' +
    '<rect x="8" width="8" height="16" fill="#FFFFFF"/>' +
    '<rect x="16" width="8" height="16" fill="#EF4135"/>',
  en:
    '<rect width="24" height="16" fill="#012169"/>' +
    '<path d="M0 0 24 16M24 0 0 16" stroke="#FFFFFF" stroke-width="3.2"/>' +
    '<path d="M0 0 24 16M24 0 0 16" stroke="#C8102E" stroke-width="1.8"/>' +
    '<path d="M12 0v16M0 8h24" stroke="#FFFFFF" stroke-width="5.2"/>' +
    '<path d="M12 0v16M0 8h24" stroke="#C8102E" stroke-width="3.1"/>',
};

const picker = document.querySelector('#lang');
const pickerMenu = document.querySelector('#lang-menu');

/** Le nom d'une langue, ecrit dans cette langue. */
function languageName(code) {
  try {
    return new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function flag(code) {
  const drapeau = FLAGS[code];
  return drapeau
    ? `<svg class="flag" width="20" height="14" viewBox="0 0 24 16" aria-hidden="true">${drapeau}</svg>`
    : '';
}

let words = {};

function say(key) {
  return words[key];
}

/**
 * Une cle et ses parametres nommes. La phrase entiere appartient au
 * traducteur : l'ordre des mots n'est pas le meme partout, et coller deux
 * morceaux ici l'imposerait a toutes les langues.
 */
function fill(key, values) {
  const template = say(key);
  if (template === undefined) return undefined;
  return template.replace(/{(\w+)}/g, (whole, name) => (name in values ? String(values[name]) : whole));
}

/**
 * Pose les textes du catalogue sur la page.
 *
 * Deux ecritures : `data-t` remplace le contenu d'un element, `data-t-attr`
 * remplit un attribut - « placeholder:activate.placeholder ». Une cle absente
 * laisse en place ce que la page portait deja, plutot qu'un vide.
 */
function dress() {
  for (const node of document.querySelectorAll('[data-t]')) {
    const text = say(node.dataset.t);
    if (text !== undefined) node.textContent = text;
  }

  for (const node of document.querySelectorAll('[data-t-attr]')) {
    for (const pair of node.dataset.tAttr.split(';')) {
      const [attribute, key] = pair.split(':');
      const text = say(key);
      if (text !== undefined) node.setAttribute(attribute, text);
    }
  }
}

async function speak(language) {
  try {
    const response = await fetch(`lang/${language}.json`);
    if (!response.ok) return;
    words = await response.json();
  } catch {
    // Catalogue injoignable : la page garde les textes qu'elle porte deja.
    return;
  }

  document.documentElement.lang = language;
  localStorage.setItem(LANGUAGE_KEY, language);

  if (picker) picker.innerHTML = `${flag(language)}<span>${languageName(language)}</span>`;

  dress();
  showVersions();
  showBuild();
}

/*
  La liste des langues, remplie depuis LANGUAGES.

  Chaque langue se nomme dans sa propre langue : on cherche « français » a la
  lettre f, pas « French » a la lettre F. Le nom vient du navigateur, ce qui
  evite d'entretenir une table de noms de langues a cote des catalogues.
*/
function fillLanguages() {
  if (!pickerMenu) return;

  for (const code of LANGUAGES) {
    const choice = document.createElement('button');
    choice.type = 'button';
    choice.className = 'choice';
    choice.setAttribute('role', 'option');
    choice.dataset.lang = code;
    choice.innerHTML = `${flag(code)}<span>${languageName(code)}</span>`;
    choice.addEventListener('click', () => {
      closeLanguages();
      void speak(code);
    });
    pickerMenu.append(choice);
  }
}

function openLanguages() {
  if (!pickerMenu || !picker) return;
  pickerMenu.hidden = false;
  picker.setAttribute('aria-expanded', 'true');

  // L'ecoute commence au tour suivant : le clic qui vient d'ouvrir le menu
  // arriverait sinon jusqu'a elle, et le refermerait dans le meme geste.
  setTimeout(() => {
    document.addEventListener('pointerdown', awayFromLanguages);
    document.addEventListener('keydown', escapeLanguages);
  }, 0);
}

function closeLanguages() {
  if (!pickerMenu || !picker) return;
  pickerMenu.hidden = true;
  picker.setAttribute('aria-expanded', 'false');
  document.removeEventListener('pointerdown', awayFromLanguages);
  document.removeEventListener('keydown', escapeLanguages);
}

function awayFromLanguages(event) {
  if (!pickerMenu?.contains(event.target) && event.target !== picker) closeLanguages();
}

function escapeLanguages(event) {
  if (event.key === 'Escape') closeLanguages();
}

fillLanguages();
picker?.addEventListener('click', () => {
  if (pickerMenu?.hidden) openLanguages();
  else closeLanguages();
});

/* ----- l'activation ----- */

/*
  Rien a activer pendant l'acces anticipe : chaque module valide s'ouvre sans
  jeton. Le formulaire a donc quitte la page, et son code avec lui. Le site est
  servi comme des fichiers, sans rien qui s'execute : il ne pourrait repondre a
  aucune demande, et un bouton qui echoue vaut moins que pas de bouton du tout.
*/

/* ----- le journal des versions ----- */

const list = document.querySelector('#versions-list');
const stamp = document.querySelector('#versions-stamp');
const stampWhen = document.querySelector('#versions-when');
const publishedTitle = document.querySelector('#versions-out');
const nextBlock = document.querySelector('#versions-next');
const comingList = document.querySelector('#versions-coming');

const KILOBYTE = 1000;
const MEGABYTE = 1000000;

/* Ce que le PC a repondu, garde pour le redire dans l'autre langue. */
let catalogue = null;

function line(text) {
  const item = document.createElement('li');
  item.textContent = text ?? '';
  return item;
}

/*
  La taille, dite dans la langue lue et son abreviation avec. Intl porte les
  unites de chaque langue ; une table maison en aurait oublie une des la
  troisieme.
*/
function weigh(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '';

  const large = bytes >= MEGABYTE;
  return new Intl.NumberFormat(document.documentElement.lang, {
    style: 'unit',
    unit: large ? 'megabyte' : 'kilobyte',
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(bytes / (large ? MEGABYTE : KILOBYTE));
}

function dateOf(moment) {
  const date = new Date(moment);
  if (Number.isNaN(date.valueOf())) return '';

  return new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'long' }).format(date);
}

/*
  Le nom du module, celui que le produit affiche deja - « module.<identifiant> »
  dans le socle. L'identifiant reste visible a cote, en retrait : c'est lui
  qu'on lit dans le Manager, et un visiteur qui compare les deux doit s'y
  reconnaitre. Sans libelle, il parait seul plutot que de laisser un vide.
*/
function dressModule(node, id) {
  const name = say(`${'module'}.${id}`);
  node.textContent = name ?? id;

  if (name === undefined) return;

  const ident = document.createElement('span');
  ident.className = 'ident';
  ident.textContent = id;
  node.append(' ', ident);
}

function showVersions() {
  if (!list) return;

  list.replaceChildren();
  comingList?.replaceChildren();

  const items = catalogue?.items;
  const published = Array.isArray(items) && items.length > 0;
  const soon = catalogue?.coming ?? [];

  /*
    Sans reponse, la page ne garde que sa ligne d'attente : des titres poses
    au-dessus de listes vides auraient dit « casse » la ou il faut lire
    « pas encore ».
  */
  if (stamp) stamp.hidden = !published;
  if (publishedTitle) publishedTitle.hidden = !published;
  if (nextBlock) nextBlock.hidden = !published || soon.length === 0;

  if (catalogue === null) {
    list.append(line(say('versions.unreachable')));
    return;
  }

  if (!published) {
    list.append(line(say('versions.empty')));
    return;
  }

  if (stampWhen) stampWhen.textContent = dateOf(catalogue.generated);

  for (const item of items) {
    const row = document.createElement('li');

    const who = document.createElement('span');
    who.className = 'who';
    dressModule(who, item.id ?? '');

    const version = document.createElement('span');
    version.className = 'version';
    version.textContent = item.version ?? '';

    const size = document.createElement('span');
    size.className = 'size';
    size.textContent = weigh(item.size);

    row.append(who, version, size);

    // La note est rare : lui reserver une colonne laissait quinze lignes
    // trouees. Elle prend donc sa propre ligne, le jour ou elle existe.
    if (item.note) {
      const note = document.createElement('span');
      note.className = 'note';
      note.textContent = item.note;
      row.append(note);
    }

    list.append(row);
  }

  for (const id of soon) {
    const chip = document.createElement('li');
    dressModule(chip, id);
    comingList?.append(chip);
  }
}

/*
  Ce que le site sert, en clair sous le bouton.

  Le numero de version ne bouge pas d'une publication a l'autre : sans la date
  et l'empreinte, deux installeurs ne se distinguent pas, et on reinstalle
  celui d'hier sans le savoir. L'empreinte se compare a celle du fichier
  telecharge, que Windows donne par « Get-FileHash ».
*/
let build = null;

async function readBuild() {
  try {
    const response = await fetch('api/build.json');
    build = response.ok ? await response.json() : null;
  } catch {
    // Sans identite lisible, la page sert toujours a telecharger : elle se
    // tait plutot que de montrer une ligne vide.
    build = null;
  }

  showBuild();
}

function showBuild() {
  // « stamp » nomme deja la date du catalogue, plus haut : celui-ci est
  // l'identite de l'installeur, et deux noms proches se confondraient.
  const mark = document.getElementById('build');
  if (!mark) return;

  const digest = typeof build?.digest === 'string' ? build.digest : '';
  const date = typeof build?.built === 'string' ? new Date(build.built) : null;
  if (digest === '' || date === null || Number.isNaN(date.getTime())) {
    mark.hidden = true;
    return;
  }

  const said = fill('download.build', {
    date: date.toLocaleDateString(document.documentElement.lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    digest: digest.slice(0, 16),
  });

  if (said === undefined) return;

  mark.textContent = said;
  mark.hidden = false;
}

async function readVersions() {
  try {
    const response = await fetch('api/versions');
    catalogue = response.ok ? ((await response.json())?.manifest ?? null) : null;
  } catch {
    // Un journal injoignable ne casse pas la page : le reste du site sert
    // toujours a telecharger et a activer.
    catalogue = null;
  }

  showVersions();
}

await speak(wantedLanguage());
await readVersions();
await readBuild();
