/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 442 — L'ENQUÊTE : « LA PARCELLE QUI N'EXISTE PAS ».
   ═══════════════════════════════════════════════════════════════════════════
   Ce fichier est la TABLE de l'enquête et ses règles pures. Il ne dessine rien,
   il n'appelle pas React, il n'ouvre aucun panneau : `FermeGame.js` le lit,
   `tools/verify-enquete.mjs` l'importe, et les textes vivent dans
   `fermeStrings.js` comme tout ce que le joueur lit.

   ⚠️⚠️ POURQUOI UN FICHIER DE PLUS, ALORS QUE §14 DE `CLAUDE.md` SE MÉFIE DES
   FICHIERS QUI POUSSENT. Parce que c'est exactement la forme que le 439 a
   inventée pour `HALL_TOPICS` et dont il a écrit la raison : *une quête = une
   ligne, pas un `if` de plus dans le composant.* L'enquête compte vingt-trois
   lieux, huit chapitres et trois codes ; écrite en conditions imbriquées dans
   `FermeGame.js` (déjà 24 000 lignes), elle serait illisible au premier ajout et
   AUCUN BANC NE POURRAIT L'APPELER — c'est-à-dire le piège n°1 du projet dans sa
   forme lente (436 : « un dessin qu'aucun banc ne peut appeler vieillit tout
   seul », vrai d'une règle autant que d'un dessin).

   ⚠️⚠️⚠️ LA RÈGLE DURE DU 439 EST TENUE ICI, ET ELLE EST LA PREMIÈRE : **UN
   PANNEAU QUI S'OUVRE À VOLONTÉ NE DOIT RIEN DONNER.** Lire un document ouvre
   un panneau, et un panneau s'ouvre autant de fois qu'on appuie sur E. Ce
   fichier ne décide donc JAMAIS d'une récompense : il dit quels indices existent
   et quand un chapitre est fini. C'est l'HÔTE qui inscrit l'indice (une fois —
   `clues[id]` est un dictionnaire, pas un compteur) et qui paie le chapitre au
   moment où il bascule. Marteler la touche devant un registre rapporte
   exactement zéro or, par construction et non par garde-fou.

   ⚠️⚠️ TOUT L'ÉTAT TIENT DANS `shared.enquete`, ET C'EST UN CHAMP DE PLUS DANS
   LE JSON DE `ferme_saves` — AUCUNE MIGRATION SQL, exactement comme `townChop`
   au 426, `wardrobe` au 427 et `forcedWorld` au 392. Absent d'une sauvegarde
   antérieure = enquête pas commencée, ce qui est le bon comportement.

   ⚠️ ET L'ENQUÊTE EST PARTAGÉE, PAS PERSONNELLE. Les quêtes de découverte
   (`C.QUESTS`) vivent dans `f.quests`, par fermier, parce qu'elles apprennent à
   jouer. Celle-ci est une histoire DU MONDE : deux joueurs la mènent ensemble,
   voient les mêmes indices tomber dans le même carnet, et le carnet dit QUI a
   trouvé quoi. C'est la seule forme qui rende le partage lisible — un second
   joueur qui regarde l'autre cocher sa propre liste ne joue pas, il assiste.

   ───────────────────────────────────────────────────────────────────────────
   L'HISTOIRE, EN SIX LIGNES (le détail est dans `components/ferme/README.md` §25)

   Valley Town compte 27 parcelles ; le terrain en porte 28. La vingt-huitième
   n'a pas été volée : elle a été DISSOUTE administrativement, et le loyer
   qu'elle produit toujours paie, depuis, le plancher du marché — celui qui
   garantit qu'on ne vend jamais moins cher en ville qu'au bac de la ferme.
   Celui qui l'a fait, Aurèle Chaband, géomètre-voyer, n'a rien caché : il a tout
   écrit, honnêtement, et déposé le registre aux scellés « à ouvrir à la première
   réclamation ». Personne n'a jamais réclamé. **Le secret n'a jamais été gardé :
   il a été rangé.** Et la propriétaire, Mathilde Ferrand, était VIVANTE le jour
   où sa parcelle a cessé d'exister.

   ⚠️ CE QUE L'ENQUÊTE ÉVITE, ET C'EST UNE CONSIGNE DE GUILLAUME : pas de mystère
   entretenu. À CHAQUE INSTANT le carnet dit en une phrase ce qu'on cherche
   (`ENQ_CHAPTERS[i].key` → `L.enq.goal[key]`). Ce qui est difficile est le
   RECOUPEMENT — trois inscriptions qui se contredisent, une règle de
   numérotation à appliquer sur le terrain, un chiffre dont la clé a été vue au
   premier chapitre sans qu'elle veuille dire quoi que ce soit — jamais le
   silence d'un personnage. Ombeline Reboul, l'archiviste, dit TOUT ce qu'elle
   sait dès la première phrase, à chaque fois. Ce qui bloque n'est jamais elle,
   c'est un document qui manque.
   ═══════════════════════════════════════════════════════════════════════════ */

import * as C from "./fermeConstants.mjs";

/* ───────────────────────────────────────────────────────────────────────────
   1. LES LIEUX. Un lieu = un endroit du monde où l'on appuie sur E et où l'on
   lit quelque chose. `id` sert de clé partout : état partagé, textes, carnet.

   ⚠️ `zone` ET `spot` NE SONT PAS DE LA DÉCORATION, C'EST CE QUI EMPÊCHE LE
   PIÈGE DES DEUX CARTES (§4 de `CLAUDE.md`). L'hôte vérifie qu'une découverte
   arrive bien de la bonne ZONE avant de regarder la moindre distance — la
   discipline exacte d'`atMarket` (431). Une borne de la ferme et une borne de la
   ville ont des `id` différents ET des zones différentes : il n'existe aucun
   chemin de code qui puisse prendre l'une pour l'autre.

   ⚠️⚠️ `req` EST UNE CONDITION D'INFORMATION, PAS UNE CONDITION DE CHAPITRE.
   C'est la différence qui fait qu'on peut jouer DANS LE DÉSORDRE — demande
   explicite du chantier. On peut lire n'importe quel document à n'importe quel
   moment ; le seul cas où un lieu refuse de livrer, c'est quand il n'y a
   physiquement rien à y lire tant qu'on ignore ce qu'on cherche : on ne
   consulte pas une filiation sans un nom, et on ne dépose pas une réclamation
   sans les pièces. Un chapitre, lui, ne barre jamais une porte.
   ─────────────────────────────────────────────────────────────────────────── */
export const ENQ_SITES = [
  // ── L'accroche, dehors, là où tout le monde passe.
  { id: "avis",      zone: "town",  spot: "newsBoard" },
  { id: "cours",     zone: "court", spot: "priceBoard" },
  // ── Chapitre 2 : le terrain contre le papier.
  { id: "plan",      zone: "court", spot: "wallMap" },
  { id: "cotes",     zone: "court", spot: "registerStand", room: "surveyor" },
  { id: "borneOrigine", zone: "farm",  spot: "farmStone" },
  { id: "borneQuai",    zone: "town", spot: "boundStone", mark: "quai" },
  { id: "borneVerger",  zone: "town", spot: "boundStone", mark: "verger" },
  { id: "borneBois",    zone: "town", spot: "boundStone", mark: "bois" },
  { id: "fiche",     code: "A" },   // délivré par le fichier du cadastre, pas par un lieu
  // ── Chapitre 3 : mettre un nom dessus.
  { id: "mariages",  zone: "court", spot: "registerStand", room: "civil" },
  { id: "ombeline",  zone: "court", spot: "archivistNPC" },
  { id: "note",      zone: "court", spot: "docBox", room: "cityarch", mark: "note" },
  // ── Chapitre 4 : trois inscriptions qui ne disent pas la même date.
  { id: "cloche",    zone: "court", spot: "bellRope" },
  { id: "orgue",     zone: "court", spot: "organWing" },
  { id: "tombe",     zone: "town",  spot: "grave" },
  { id: "reglement", zone: "court", spot: "bylaw" },
  { id: "acte",      code: "B" },   // délivré par le répertoire du notaire
  // ── Chapitre 5 : le carton des scellés.
  { id: "coffre",    zone: "court", spot: "strongbox", req: ["acte"] },
  // ── Chapitre 6 : le chiffre.
  { id: "registre",  code: "C" },   // délivré par le déchiffrement
  // ── Chapitre 7 : l'héritier.
  { id: "pv",        zone: "court", spot: "docBox", room: "cityarch", mark: "pv" },
  { id: "filiation", zone: "court", spot: "registerStand", room: "civil", req: ["note", "registre"] },
];
export const ENQ_SITE = Object.fromEntries(ENQ_SITES.map(s => [s.id, s]));

/* ───────────────────────────────────────────────────────────────────────────
   2. LES CHAPITRES. `need` est la liste d'indices qui le closent ; `reward` est
   payé UNE FOIS, par l'hôte, au moment exact du basculement.

   ⚠️ LE CHAPITRE N'EST PAS UNE PORTE, C'EST UN COMPTEUR. Il ne verrouille rien
   (voir la note de `req` plus haut) : il dit seulement où l'on en est et ce
   qu'on cherche. Un joueur qui tombe sur l'indice du chapitre 4 pendant le
   chapitre 2 le garde ; le chapitre 4 se fermera tout seul le jour où il aura
   ses quatre pièces. C'est ce qui rend le désordre jouable au lieu d'être
   toléré.
   ⚠️ `ENQ_CH_DONE` (= longueur) vaut « enquête terminée ». On ne teste jamais
   un numéro de chapitre écrit en dur ailleurs qu'ici. */
export const ENQ_CHAPTERS = [
  { key: "halle",    need: ["avis", "cours"],                                      reward: 300 },
  { key: "cote",     need: ["plan", "cotes", "borneOrigine", "borneQuai", "borneVerger", "borneBois", "fiche"], reward: 700 },
  { key: "nom",      need: ["mariages", "ombeline", "note"],                       reward: 700 },
  { key: "date",     need: ["cloche", "orgue", "tombe", "reglement", "acte"],      reward: 900 },
  { key: "scelles",  need: ["coffre"],                                             reward: 900 },
  { key: "chiffre",  need: ["registre"],                                           reward: 1100 },
  { key: "heritier", need: ["pv", "filiation"],                                    reward: 1100 },
  { key: "depot",    need: [],                                                     reward: 0 },
];
export const ENQ_CH_DONE = ENQ_CHAPTERS.length;

/* ───────────────────────────────────────────────────────────────────────────
   3. LES TROIS CODES.

   ⚠️⚠️ AUCUN DES TROIS NE SE DEVINE, ET AUCUN NE SE BRUTE-FORCE UTILEMENT — ce
   n'est pas un anti-triche (le dépôt est public, et un jeu à deux amis n'a rien
   à protéger), c'est une exigence de PLAISIR : un code qu'on peut trouver en
   tapant au hasard n'apprend rien, et un code qu'on ne peut trouver qu'en
   lisant l'auteur dans les yeux est une punition. Les trois se déduisent de
   documents lisibles, et chacun d'une façon différente :

   • A — UNE COTE CADASTRALE, par la GÉOGRAPHIE. Le registre du géomètre donne
     la règle (« on numérote d'ouest en est, sans trou ») ; deux bornes du
     terrain donnent des numéros (25 au quai, 27 au verger) ; le plan mural dit
     que la section s'arrête à 27, et que la dernière est le verger. La borne du
     BOIS, plus à l'est que le verger, est martelée. La règle et la pierre se
     contredisent, et c'est tout le sujet du jeu en une déduction : **le sol
     n'est pas d'accord avec le papier.**  →  VT-3-28.

   • B — UNE ANNÉE, par la CHRONOLOGIE. Trois inscriptions qui datent la même
     personne (la cloche : an 41 ; la plaque du facteur d'orgues : an 39 ; la
     tombe nettoyée : an 42) et un règlement affiché chez le notaire (« une
     dissolution est datée du jour de son DÉPÔT, non du jour de la décision ; le
     dépôt suit la décision d'un an franc »). Le double de la note dit an 41.
     Donc la décision est de l'an 40 — et Mathilde Ferrand est morte en 42.
     **Elle était vivante quand sa parcelle a cessé d'exister.**  →  40.

   • C — UN MOT-CLÉ, par la MÉMOIRE. Chaband écrit : « la clé est là où j'ai mis
     mon nom pour la dernière fois ». Sa dernière borne est celle de la ferme, et
     sous la mousse elle ne porte pas son nom à lui.  →  MATHILDE.
     ⚠️ C'EST LA MEILLEURE PIÈCE DU DISPOSITIF ET ELLE NE COÛTE RIEN : le joueur
     a lu ce mot au CHAPITRE 2, où il ne voulait rien dire. Quatre chapitres plus
     tard il devient la clé. Celui qui l'a noté n'a rien à refaire ; celui qui ne
     l'a pas noté doit retraverser les deux cartes — et c'est très bien, il
     découvrira qu'il connaît le chemin par cœur.

   ⚠️ `accept` EST UNE LISTE DE FORMES NORMALISÉES, jamais une regex. Un joueur
   qui tape « vt-3-28 », « VT328 » ou « 328 » a la bonne réponse ; lui répondre
   « non » parce qu'il a mis un tiret serait le « le jeu propose puis refuse »
   du 426, sur la seule chose qu'il a cherchée pendant vingt minutes. */
export const ENQ_CODES = {
  A: { grants: "fiche",    accept: ["VT328", "328"] },
  B: { grants: "acte",     accept: ["40", "AN40", "L40"] },
  C: { grants: "registre", accept: ["MATHILDE", "MATHILDEFERRAND"] },
};
/* La forme normalisée d'une réponse : majuscules, sans accent, sans rien qui ne
   soit lettre ou chiffre. ⚠️ ELLE EST PARTAGÉE PAR LE JEU ET PAR LE BANC — deux
   normalisations pour la même saisie, c'est la divergence en attente du §8, et
   son symptôme serait « ça marche chez toi et pas chez moi ». */
export function enqNorm(s) {
  return String(s == null ? "" : s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]/g, "");
}
export function enqCodeOk(code, input) {
  const c = ENQ_CODES[code];
  if (!c) return false;
  const n = enqNorm(input);
  return n.length > 0 && c.accept.includes(n);
}

/* ───────────────────────────────────────────────────────────────────────────
   4. LE CHIFFRE DE CHABAND — un Vigenère sur A–Z, et il est VRAI.

   ⚠️⚠️ ON CHIFFRE LE TEXTE CLAIR AU LIEU D'ÉCRIRE DU CHARABIA À LA MAIN, et ce
   n'est pas de la coquetterie. Un charabia écrit à la main est un SECOND texte à
   tenir d'accord avec le premier (§8) : le jour où l'on corrige une phrase du
   registre, la version chiffrée continue de dire l'ancienne, et personne ne s'en
   aperçoit puisque personne ne la lit. Ici il n'existe qu'un texte ; l'autre est
   calculé. Et le banc vérifie l'aller-retour, ce qu'aucune relecture ne peut
   faire sur du charabia.
   ⚠️ On chiffre en MAJUSCULES SANS ACCENT parce que c'est ainsi qu'on écrit une
   page chiffrée à la main : garder les accents et la casse laisserait la forme
   des mots visible, c'est-à-dire un chiffre qui a l'air d'un chiffre sans en
   être un. Tout ce qui n'est pas une lettre (espaces, ponctuation, chiffres)
   passe tel quel : c'est le comportement d'un carré de Vigenère, et ça garde la
   page LISIBLE comme page — on doit voir que c'est un texte, pas une bouillie. */
export const ENQ_CIPHER_KEY = "MATHILDE";
function vigenere(text, key, dir) {
  const k = enqNorm(key);
  if (!k) return text;
  const src = String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  let out = "", j = 0;
  for (const ch of src) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) {
      const s = k.charCodeAt(j % k.length) - 65;
      out += String.fromCharCode(65 + ((c - 65 + dir * s + 26) % 26));
      j++;
    } else out += ch;
  }
  return out;
}
export function enqCipher(text, key) { return vigenere(text, key || ENQ_CIPHER_KEY, 1); }
export function enqDecipher(text, key) { return vigenere(text, key || ENQ_CIPHER_KEY, -1); }

/* ───────────────────────────────────────────────────────────────────────────
   5. LE COFFRE À DEUX SERRURES — la seule porte de ce chantier qui demande
   VRAIMENT deux personnes, et la raison pour laquelle elle existe.

   ⚠️⚠️ ELLE N'EST PAS UN CAPRICE DE COOPÉRATION, ELLE EST L'HISTOIRE. Un coffre
   municipal a deux clés confiées à deux agents précisément pour qu'un seul homme
   ne puisse pas l'ouvrir ; Chaband a contourné cette règle en DÉPOSANT le
   registre au lieu de le cacher, et les joueurs doivent, eux, respecter la règle
   pour le ressortir. La mécanique dit le thème sans une ligne de dialogue.

   ⚠️ LES DEUX SERRURES NE SONT PAS DANS LA MÊME PIÈCE, NI AU MÊME NIVEAU : une
   au greffe (rez-de-chaussée), une chez l'huissier (étage), et le coffre est aux
   scellés (sous-sol). Deux serrures côte à côte se tournent en marchant : ce
   n'est plus une règle à deux, c'est un bouton en deux morceaux.

   ⚠️⚠️ ET LA FENÊTRE EST MESURÉE, PAS CHOISIE. `tools/verify-enquete.mjs` rejoue
   le trajet d'un joueur SEUL, image par image, avec la vraie collision et la
   vraie course (Maj) : il imprime le temps du meilleur trajet et échoue si la
   fenêtre le rend impossible OU si elle est si large qu'elle ne demande plus
   rien. Un seuil réglé à l'œil ici, c'est le seuil d'axe du taxi au 434 —
   parfaitement défendable et faux dès que la géométrie bouge.
   ⚠️ Le solo N'EST PAS BLOQUÉ, et c'est une contrainte dure : à deux c'est un
   geste et un éclat de rire, seul c'est un sprint qu'on rate une fois ou deux.
   Une enquête qui marche à deux et bloque seul n'est pas plus finie qu'une
   enquête qui marche seul et casse à deux. */
export const ENQ_LOCK_SIDES = ["greffe", "huissier"];
export const ENQ_LOCK_WINDOW_MS = 22000;

/* ───────────────────────────────────────────────────────────────────────────
   6. LA FIN — deux issues, aucune n'est « la bonne ».

   ⚠️⚠️ C'EST UN ARBITRAGE DE JEU, PAS UNE MORALE. Restituer la parcelle rend le
   marché LIBRE : la cote peut enfin descendre sous le prix du bac, et sa hausse
   est plus large. Maintenir le fonds garde le plancher et le RELÈVE. L'un est
   plus rentable si l'on sait lire le tableau des cours quatre jours à l'avance
   (438) ; l'autre est plus sûr si l'on vend ce qu'on a quand on l'a. Un joueur
   qui choisit « maintenir » ne choisit pas le mal, il choisit la sécurité — et
   il le paie d'une tombe qui restera sans nom, ce qu'Ombeline dira une fois.
   ⚠️ La décision est DÉFINITIVE. Une fin qu'on peut refaire n'est pas une
   décision, c'est un menu.
   ⚠️⚠️ ET ELLE TOUCHE `marketRate`, DONC ELLE TOUCHE LA RÈGLE LA PLUS
   DANGEREUSE DU PROJET (§11 du README : « le cours ne doit dépendre QUE du
   jour »). Elle ne l'enfreint pas, et il faut dire exactement pourquoi : la
   règle interdit une dépendance à un état PROPRE À UN JOUEUR (son stock, son or,
   sa saison locale), parce que les deux écrans afficheraient alors des prix
   différents en ayant chacun l'air cohérent. `enquete.outcome` est un état
   PARTAGÉ, arbitré par l'hôte et persisté : les deux clients lisent le même
   octet, donc la même cote. Le contrôle de déterminisme de `verify-vallee`
   reste vrai, et `verify-enquete` en ajoute un qui compare les deux issues. */
export const ENQ_OUTCOMES = ["restore", "keep"];
export const ENQ_REWARD = { restore: 3000, keep: 5000 };
export const ENQ_MARKET_DROP = 0.22;   // restitution : la cote peut descendre de 22 % sous le bac
export const ENQ_MARKET_SPREAD_MULT = 1.6;  // ... et monter 60 % plus haut qu'avant
export const ENQ_MARKET_FLOOR = 0.08;  // maintien : le plancher n'est plus à +0 % mais à +8 %

/* Le modificateur de marché, sous la forme que `marketRate` attend. ⚠️ IL SORT
   D'ICI ET DE NULLE PART AILLEURS : deux endroits qui décideraient « ce que
   l'enquête fait au marché » finiraient par ne pas dire la même chose, et le
   symptôme serait deux joueurs qui se disputent sur le prix du blé — le défaut
   le plus cher et le moins visible d'un jeu à deux (§11). */
export function enqMarketMod(shared) {
  const o = (shared && shared.enquete && shared.enquete.outcome) || null;
  if (o === "restore") return { lo: -ENQ_MARKET_DROP, mult: ENQ_MARKET_SPREAD_MULT };
  if (o === "keep") return { lo: ENQ_MARKET_FLOOR, mult: 1 };
  return null;
}

/* ⚠️ L'HÉRITIER EST UN CANDIDAT DU VIVIER FIXE, ET C'EST LA DÉCISION
   ANTI-EXPLOIT DU 439 RÉUTILISÉE TELLE QUELLE. Le tirer dans les résidents de la
   ferme aurait paru plus riche et aurait été la même faille qu'un maire tiré
   dans le roster : accueillir ou renvoyer quelqu'un aurait changé l'héritier EN
   COURS D'ENQUÊTE, et une réclamation déposée hier aurait désigné quelqu'un
   d'autre aujourd'hui.
   ⚠️⚠️ ET IL EST « BONNEFOY », CELUI DONT LE PROGRAMME EST « L'ORDRE ET LES
   COMPTES ». Ce n'est pas un clin d'œil gratuit : c'est la seule ironie que
   l'histoire pouvait produire toute seule, et elle se paie au dernier chapitre
   quand `mayorOf(day)` le désigne comme maire en exercice — l'héritier devient
   alors juge et partie, le notaire le DIT, et ça ne coûte pas un octet de plus
   puisque le maire du jour est déjà une pure fonction du jour. Un jour sur cinq
   environ, la dernière scène n'est pas la même. */
export const ENQ_HEIR_KEY = "bonnefoy";

/* ───────────────────────────────────────────────────────────────────────────
   7. L'ÉTAT PARTAGÉ ET SES RÈGLES PURES.
   ─────────────────────────────────────────────────────────────────────────── */
export function newEnquete() {
  return { ch: 0, clues: {}, codes: {}, lock: {}, signs: [], outcome: null, doneAt: 0, told: {} };
}
/* ⚠️ LA REPRISE EST TOLÉRANTE, PAS CONFIANTE. Une sauvegarde d'avant ce zip n'a
   pas le champ (enquête neuve, bon comportement) ; une sauvegarde ABÎMÉE ne doit
   pas faire planter le chargement d'une ferme entière pour une histoire
   secondaire. On reconstruit donc chaque sous-objet plutôt que de faire
   confiance à sa forme — c'est la leçon de `migrateStation`. */
export function migrateEnquete(saved) {
  const e = newEnquete();
  if (!saved || typeof saved !== "object") return e;
  e.ch = Math.max(0, Math.min(ENQ_CH_DONE, saved.ch | 0));
  if (saved.clues && typeof saved.clues === "object") {
    for (const id of Object.keys(saved.clues)) {
      if (!ENQ_SITE[id]) continue;                       // un indice inconnu = une version d'après : on l'ignore
      const v = saved.clues[id] || {};
      e.clues[id] = { by: String(v.by || "?").slice(0, 24), at: +v.at || 0 };
    }
  }
  if (saved.codes && typeof saved.codes === "object") {
    for (const k of Object.keys(ENQ_CODES)) if (saved.codes[k]) e.codes[k] = true;
  }
  if (saved.lock && typeof saved.lock === "object") {
    for (const s of ENQ_LOCK_SIDES) if (+saved.lock[s]) e.lock[s] = +saved.lock[s];
  }
  if (Array.isArray(saved.signs)) e.signs = saved.signs.filter(x => typeof x === "string").slice(0, 8);
  if (ENQ_OUTCOMES.includes(saved.outcome)) e.outcome = saved.outcome;
  e.doneAt = +saved.doneAt || 0;
  if (saved.told && typeof saved.told === "object") for (const k of Object.keys(saved.told)) if (saved.told[k]) e.told[k] = true;
  return e;
}
export function enqStarted(e) { return !!(e && (e.ch > 0 || Object.keys(e.clues || {}).length)); }
export function enqDone(e) { return !!(e && e.outcome); }
export function enqHas(e, id) { return !!(e && e.clues && e.clues[id]); }
/* Ce qui manque au chapitre courant, dans l'ordre de la table — c'est ce que le
   carnet affiche, et c'est aussi ce qui fait qu'on sait toujours quoi chercher. */
export function enqMissing(e) {
  const ch = ENQ_CHAPTERS[Math.min(e ? e.ch | 0 : 0, ENQ_CH_DONE - 1)];
  if (!ch) return [];
  return ch.need.filter(id => !enqHas(e, id));
}
/* ⚠️⚠️ LA BASCULE EST UNE BOUCLE, PAS UN `if`. Un joueur qui joue dans le
   désordre peut fermer DEUX chapitres avec un seul indice — celui qui manquait
   au 4 alors que le 3 était déjà complet depuis dix minutes. Écrite en simple
   test, la fonction aurait avancé d'un cran par découverte, et l'enquête serait
   restée bloquée un chapitre en arrière sans que rien ne le signale : le carnet
   aurait réclamé un document déjà dans le carnet. Rend la liste des chapitres
   FRANCHIS, pour que l'hôte paie chacun d'eux une fois. */
export function enqAdvance(e) {
  const crossed = [];
  let guard = 0;
  while (e.ch < ENQ_CH_DONE && guard++ < ENQ_CH_DONE + 2) {
    const ch = ENQ_CHAPTERS[e.ch];
    if (!ch.need.every(id => enqHas(e, id))) break;
    if (ch.key === "depot") break;    // le dernier ne se ferme qu'au dépôt, pas par accumulation
    crossed.push(ch);
    e.ch++;
  }
  return crossed;
}

/* ───────────────────────────────────────────────────────────────────────────
   8. LES RÉSOLVEURS — le côté HÔTE, pur, sans réseau ni React.
   Ils rendent tous `{ ok, toast, crossed, gold }` ; c'est `FermeGame` qui
   diffuse. ⚠️ AUCUN NE CRÉDITE `shared.money` LUI-MÊME : ils annoncent un
   `gold`, l'hôte l'applique. Le double crédit du 431 (trois résolveurs qui
   payaient eux-mêmes, trois qui rendaient un delta) a coûté un contrôle de banc
   dédié — on ne recommence pas.
   ─────────────────────────────────────────────────────────────────────────── */

/* Un indice trouvé. ⚠️ IDEMPOTENT PAR CONSTRUCTION : `clues` est un
   dictionnaire, le re-trouver écrit la même clé. C'est ce qui autorise le
   panneau à s'ouvrir autant de fois qu'on veut sans payer deux fois. */
export function resolveEnqClue(e, id, who, now) {
  const site = ENQ_SITE[id];
  if (!site) return { ok: false };
  if (site.req && !site.req.every(r => enqHas(e, r))) return { ok: false, locked: true };
  if (enqHas(e, id)) return { ok: true, already: true, crossed: [], gold: 0 };
  e.clues[id] = { by: String(who || "?").slice(0, 24), at: now };
  const crossed = enqAdvance(e);
  return { ok: true, crossed, gold: crossed.reduce((a, c) => a + c.reward, 0) };
}
export function resolveEnqCode(e, code, input, who, now) {
  const c = ENQ_CODES[code];
  if (!c) return { ok: false };
  if (!enqCodeOk(code, input)) return { ok: false, wrong: true };
  e.codes[code] = true;
  return resolveEnqClue(e, c.grants, who, now);
}
/* Les deux serrures. ⚠️ L'HÔTE DATE, PAS LE CLIENT — règle du §3 (« ne jamais
   comparer une horloge hôte à une horloge invité »). Deux clients dont les
   horloges diffèrent de trois secondes ouvriraient, ou n'ouvriraient pas, selon
   celui qui a tourné en premier. Ici les deux dates viennent de la même horloge,
   celle de l'arbitre. */
export function resolveEnqLock(e, side, who, now) {
  if (!ENQ_LOCK_SIDES.includes(side)) return { ok: false };
  if (enqHas(e, "coffre")) return { ok: true, already: true, crossed: [], gold: 0 };
  e.lock[side] = now;
  const other = ENQ_LOCK_SIDES.find(s => s !== side);
  const t = e.lock[other] | 0;
  if (!t || now - t > ENQ_LOCK_WINDOW_MS) return { ok: true, armed: true, crossed: [], gold: 0 };
  const r = resolveEnqClue(e, "coffre", who, now);
  return { ...r, opened: !r.already };
}
/* La signature de la réclamation. ⚠️ ELLE EST NOMINATIVE, ET C'EST LE SEUL
   ENDROIT DE L'ENQUÊTE OÙ « À DEUX » EST UNE RÈGLE ÉCRITE plutôt qu'un confort :
   un dépôt exige deux témoins. Solo, la ville en fournit un — le formulaire le
   dit, l'archiviste contresigne, et personne n'attend un ami qui n'est pas là.
   Un jeu qui exige un second joueur pour finir est un jeu qu'on ne finit pas. */
export function resolveEnqSign(e, playerId, soloAllowed) {
  if (!playerId) return { ok: false };
  if (!e.signs.includes(playerId)) e.signs.push(playerId);
  return { ok: true, enough: e.signs.length >= 2 || !!soloAllowed, count: e.signs.length };
}
export function enqCanFile(e) {
  return enqHas(e, "acte") && enqHas(e, "registre") && enqHas(e, "pv") && enqHas(e, "filiation");
}
export function resolveEnqFile(e, outcome, now) {
  if (!ENQ_OUTCOMES.includes(outcome)) return { ok: false };
  if (e.outcome) return { ok: false, already: true };
  if (!enqCanFile(e)) return { ok: false, missing: true };
  e.outcome = outcome;
  e.doneAt = now;
  e.ch = ENQ_CH_DONE;
  return { ok: true, gold: ENQ_REWARD[outcome] | 0 };
}

/* ───────────────────────────────────────────────────────────────────────────
   9. LA GÉOGRAPHIE DE L'ENQUÊTE, DÉRIVÉE ET NON ÉCRITE.

   ⚠️⚠️ LES TROIS BORNES DE LA VILLE NE PORTENT PAS DE COORDONNÉES, ELLES
   PORTENT UNE ANCRE. Le §8 de `CLAUDE.md` est sans appel là-dessus : une
   position réglée à la main est une position qui penchera, et celles-ci se
   rapportent à des lieux qui ont DÉJÀ bougé (le parc a reculé de huit cases au
   437, le bois a été creusé au 440). Le générateur part de l'ancre et cherche la
   première case libre en spirale — donc déplacer le verger déplace sa borne, et
   personne n'a rien à retoucher.
   ⚠️ Aucun tirage : `generateTownWorld` partage UN générateur, y puiser
   déplacerait tout le mobilier posé après (leçon du 435 sur l'étang). La
   recherche est un balayage déterministe. */
export const ENQ_STONE_ANCHORS = [
  { mark: "quai",   x: () => C.TOWN_PIER.x + C.TOWN_PIER.w + 5, y: () => C.TOWN_PIER.y - 4 },
  { mark: "verger", x: () => C.TOWN_ORCHARD.x + 2,              y: () => C.TOWN_ORCHARD.y + 2 },
  { mark: "bois",   x: () => C.TOWN_WOOD.x + 40,                y: () => C.TOWN_WOOD.y + 6 },
];
/* La borne d'ORIGINE est à la ferme, près de la gare, et son emplacement est le
   seul de l'enquête qui soit écrit en dur — parce qu'il n'existe à la ferme
   aucun « lieu » dont on puisse le dériver, et parce que `STATION_CLEAR` garantit
   que ces cases-là sont dégagées à chaque chargement (voir `clearStationArea`).
   ⚠️ ELLE NE BLOQUE PAS. Un décor solide de plus sur une carte que les joueurs
   labourent depuis des mois, c'est une case qui change de sens sans prévenir ; et
   une borne qu'on peut traverser ne casse rien, puisqu'on ne fait que la lire.
   ⚠️ `verify-enquete` regénère la ferme et vérifie que la case est libre,
   praticable, et distincte de la boutique, du bac, du panneau de gare et du
   seuil de la maison. Une constante de position se contrôle, elle ne se relit
   pas. */
export const ENQ_FARM_STONE = { x: 9, y: 31 };

/* ⚠️ LA TOMBE SANS NOM SE DÉSIGNE PAR UN RANG, PAS PAR UNE CASE. Le cimetière
   pose seize tombes par une double boucle ; en nommer une par ses coordonnées
   aurait été juste jusqu'au premier déplacement de l'enclos (il a bougé au 434,
   quand l'allée a été recentrée). On trie les tombes comme on les lit — du nord
   au sud, puis d'ouest en est — et on prend la SEPTIÈME. Le rang survit à tout
   ce à quoi une coordonnée ne survit pas. */
export const ENQ_GRAVE_RANK = 6;   // index 0-based : la septième tombe
export function enqGraveOf(tw) {
  const g = (tw && tw.props || []).filter(p => p.kind === "grave");
  g.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return g[Math.min(ENQ_GRAVE_RANK, g.length - 1)] || null;
}
