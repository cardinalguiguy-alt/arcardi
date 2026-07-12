/* ==========================================================================
   petitbacCategories — banque de catégories "Petit Bac" (Categories),
   inspirée des catégories classiques de Scattergories : uniquement du
   savoir commun, rien d'obscur (pas de "élément chimique" ou "capitale
   de micro-état"), pour que TOUT LE MONDE puisse répondre vite.

   Chaque entrée : { id (stable, sert de clé réseau), icon (emoji),
   fr, en (libellés bilingues) }. Le composant PetitBacGame résout le
   libellé affiché via catLabel() ci-dessous : priorité à un texte
   personnalisé par l'hôte (cat.custom), sinon la traduction de la langue
   du client, avec repli sur le français.

   Utilisé par la nouvelle page d'accueil du jeu (demande 2026-07) : l'hôte
   choisit un nombre de catégories, un tirage aléatoire est proposé, et il
   peut approuver, permuter (swap) ou personnaliser chaque ligne avant de
   lancer la partie — voir components/petitbac/PetitBacGame.js.
   ========================================================================== */

export const CATEGORY_POOL = [
  { id: "fname",     icon: "👩", fr: "Prénom féminin",                       en: "Girl's name" },
  { id: "mname",     icon: "👨", fr: "Prénom masculin",                      en: "Boy's name" },
  { id: "job",       icon: "🛠️", fr: "Métier",                               en: "Job" },
  { id: "sport",     icon: "⚽", fr: "Sport",                                en: "Sport" },
  { id: "place",     icon: "🗺️", fr: "Pays ou ville",                        en: "Country or city" },
  { id: "brand",     icon: "🏷️", fr: "Marque",                               en: "Brand" },
  { id: "animal",    icon: "🐾", fr: "Animal",                               en: "Animal" },
  { id: "food",      icon: "🍎", fr: "Fruit ou légume",                      en: "Fruit or vegetable" },
  { id: "color",     icon: "🎨", fr: "Couleur",                              en: "Color" },
  { id: "bodypart",  icon: "👃", fr: "Partie du corps",                      en: "Body part" },
  { id: "instrument",icon: "🎸", fr: "Instrument de musique",                en: "Musical instrument" },
  { id: "movie",     icon: "🎬", fr: "Film ou série",                        en: "Movie or TV show" },
  { id: "hero",      icon: "🦸", fr: "Super-héros ou personnage de fiction", en: "Superhero or fictional character" },
  { id: "vehicle",   icon: "🚗", fr: "Moyen de transport",                   en: "Mode of transport" },
  { id: "object",    icon: "🏠", fr: "Objet de la maison",                   en: "Household object" },
  { id: "clothing",  icon: "👕", fr: "Vêtement",                             en: "Piece of clothing" },
  { id: "drink",     icon: "🥤", fr: "Boisson",                              en: "Drink" },
  { id: "dessert",   icon: "🍰", fr: "Dessert",                              en: "Dessert" },
  { id: "hobby",     icon: "🎯", fr: "Loisir ou passe-temps",                en: "Hobby" },
  { id: "feeling",   icon: "😊", fr: "Émotion",                              en: "Feeling or emotion" },
  { id: "game",      icon: "🎲", fr: "Jeu (société ou vidéo)",               en: "Board or video game" },
  { id: "insect",    icon: "🐝", fr: "Insecte",                              en: "Insect" },
  { id: "bird",      icon: "🐦", fr: "Oiseau",                               en: "Bird" },
  { id: "flower",    icon: "🌸", fr: "Fleur ou plante",                      en: "Flower or plant" },
  { id: "kitchen",   icon: "🍳", fr: "Ustensile de cuisine",                 en: "Kitchen utensil" },
  { id: "toy",       icon: "🧸", fr: "Jouet",                                en: "Toy" },
  { id: "tool",      icon: "🔧", fr: "Outil",                                en: "Tool" },
  { id: "celebrity", icon: "⭐", fr: "Personnalité célèbre",                 en: "Famous person" },
  { id: "language",  icon: "🗣️", fr: "Langue",                               en: "Language" },
  { id: "musicgenre",icon: "🎵", fr: "Style de musique",                     en: "Music genre" },
  { id: "holiday",   icon: "🎉", fr: "Fête ou célébration",                  en: "Holiday or celebration" },
  { id: "creature",  icon: "🐉", fr: "Créature fantastique",                 en: "Fantasy creature" },
  { id: "space",     icon: "🪐", fr: "Chose liée à l'espace",                en: "Space-related thing" },
  { id: "beach",     icon: "🏖️", fr: "Chose trouvée à la plage",             en: "Something found at the beach" },
  { id: "schoolbag", icon: "🎒", fr: "Chose dans un cartable",               en: "Something in a school bag" },
  { id: "round",     icon: "⚪", fr: "Chose ronde",                          en: "Something round" },
  { id: "cold",      icon: "❄️", fr: "Chose froide",                         en: "Something cold" },
  { id: "school",    icon: "📚", fr: "Matière scolaire",                     en: "School subject" },
  { id: "weather",   icon: "☀️", fr: "Phénomène météo",                      en: "Weather phenomenon" },
  { id: "dance",     icon: "💃", fr: "Style de danse",                       en: "Dance style" },
  { id: "vacation",  icon: "🏝️", fr: "Chose qu'on fait en vacances",        en: "Something you do on vacation" },
  { id: "uniform",   icon: "👮", fr: "Métier avec un uniforme",              en: "Job with a uniform" },
  { id: "sky",       icon: "🌈", fr: "Chose vue dans le ciel",               en: "Something seen in the sky" },
  { id: "dish",      icon: "🍝", fr: "Plat",                                 en: "Dish or meal" },
];

// Nombres de catégories proposés sur l'écran d'accueil : 6 (rapide) à 14
// (proche d'une grille Scattergories complète), 8 en repère par défaut
// (comportement historique du jeu, avant cette page d'accueil).
export const CAT_COUNT_OPTIONS = [6, 8, 10, 12, 14];
export const DEFAULT_CAT_COUNT = 8;

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tire `count` catégories distinctes de la banque, en excluant les ids
// déjà présents dans `excludeIds` si la banque le permet (repli sur la
// banque entière si elle est trop petite pour respecter l'exclusion).
export function drawCategories(count, excludeIds = []) {
  const pool = CATEGORY_POOL.filter(c => !excludeIds.includes(c.id));
  const from = pool.length >= count ? pool : CATEGORY_POOL;
  return shuffled(from).slice(0, count).map(c => ({ ...c, custom: null }));
}

// Tire UNE catégorie de remplacement, absente de `excludeIds` (utilisé
// par le bouton "🔀 permuter" d'une ligne précise de l'écran d'accueil).
export function drawOne(excludeIds = []) {
  const pool = CATEGORY_POOL.filter(c => !excludeIds.includes(c.id));
  const from = pool.length ? pool : CATEGORY_POOL;
  const pick = from[Math.floor(Math.random() * from.length)];
  return { ...pick, custom: null };
}

// Libellé affiché : texte personnalisé de l'hôte en priorité, sinon la
// traduction de la langue du client, avec repli sur le français.
export function catLabel(cat, lang) {
  if (!cat) return "";
  if (cat.custom && cat.custom.trim()) return cat.custom.trim();
  return (lang === "en" ? cat.en : cat.fr) || cat.fr || cat.en || cat.id;
}

/* ===== Emoji "intelligent" pour les catégories personnalisées (2026-07) ===
   Quand l'hôte remplace le libellé d'une catégorie tirée au sort (ex. "Titre
   de chanson" -> "Prénom féminin"), l'emoji d'origine (🎵) ne colle plus :
   on devine un emoji adapté par mots-clés (FR + EN mélangés — une seule
   table pour les deux langues), avec repli sur ✏️ si rien ne matche.
   ORDRE IMPORTANT : du plus spécifique ("prénom féminin") au plus générique
   ("prénom"). Déterministe : recalculé à chaque frappe côté hôte, puis
   FIGÉ dans l'objet catégorie diffusé — tous les clients voient le même. */
const ICON_RULES = [
  ["👩", /f[ée]minin|femme|girl|woman|fille/i],
  ["👨", /masculin|homme|boy|man|gar[çc]on/i],
  ["👶", /pr[ée]nom|first name|name/i],
  ["🎵", /chanson|musique|song|music|titre|m[ée]lodie|groupe|band|chanteur|singer/i],
  ["🎬", /film|s[ée]rie|movie|show|cin[ée]|acteur|actor|dessin anim[ée]|cartoon/i],
  ["📖", /livre|roman|book|novel|auteur|author|[ée]crivain|writer|po[èe]te|poet|bd|manga/i],
  ["⚽", /sport|[ée]quipe|team|athl[èe]te|athlete|club|foot/i],
  ["🐾", /animal|b[êe]te|mammif[èe]re|mammal|pet/i],
  ["🐟", /poisson|fish|mer\b|marin|sea/i],
  ["🐦", /oiseau|bird/i],
  ["🐝", /insecte|insect/i],
  ["🌸", /fleur|plante|flower|plant|arbre|tree/i],
  ["🍎", /fruit|l[ée]gume|vegetable/i],
  ["🍝", /plat|nourriture|dish|meal|food|cuisine|recette|recipe/i],
  ["🍰", /dessert|g[âa]teau|cake|sucrerie|sweet|bonbon|candy/i],
  ["🥤", /boisson|drink|cocktail|jus|juice/i],
  ["🗺️", /pays|ville|country|city|capitale|capital|r[ée]gion|region|lieu|place|continent/i],
  ["🏷️", /marque|brand|enseigne|magasin|store|shop/i],
  ["🛠️", /m[ée]tier|profession|job|travail|work/i],
  ["🎨", /couleur|colou?r|peintre|painter|art/i],
  ["👃", /corps|body|organe|organ/i],
  ["🎸", /instrument/i],
  ["🦸", /h[ée]ros|hero|personnage|character|fiction|jeu vid[ée]o|video game/i],
  ["🚗", /transport|v[ée]hicule|vehicle|voiture|car\b/i],
  ["🏠", /objet|object|maison|house|meuble|furniture/i],
  ["👕", /v[êe]tement|clothing|clothes|habit|mode|fashion/i],
  ["⭐", /c[ée]l[èe]bre|celebrity|famous|star|personnalit[ée]/i],
  ["🗣️", /langue|language/i],
  ["🎉", /f[êe]te|holiday|c[ée]l[ée]bration/i],
  ["🐉", /cr[ée]ature|creature|fantastique|fantasy|monstre|monster|mythologie|mytholog/i],
  ["🪐", /espace|space|plan[èe]te|planet|[ée]toile/i],
  ["🏖️", /plage|beach|vacances|vacation|[ée]t[ée]\b/i],
  ["📚", /mati[èe]re|scolaire|school|[ée]cole/i],
  ["☀️", /m[ée]t[ée]o|weather|climat/i],
  ["💃", /danse|dance/i],
  ["🎲", /jeu|game/i],
  ["🔧", /outil|tool/i],
  ["🧸", /jouet|toy/i],
  ["😊", /[ée]motion|feeling|sentiment/i],
  ["❄️", /froid|cold|hiver|winter|neige|snow/i],
  ["⚪", /rond|round|forme|shape/i],
];
export function guessIcon(text) {
  const s = (text || "").trim();
  if (!s) return null;
  for (const [icon, re] of ICON_RULES) { if (re.test(s)) return icon; }
  return "✏️";
}
