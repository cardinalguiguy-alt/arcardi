/* =============================================================================
   verify-compo.mjs — LA COMPOSITION DES DÉCORS TIENT-ELLE DEBOUT ? (zip 440)
   -----------------------------------------------------------------------------
       node tools/verify-compo.mjs

   ⚠️⚠️ CE BANC EXISTE PARCE QUE GUILLAUME A VU « UN ARBRE SUR UN PONT » ET
   QU'AUCUN DES QUINZE AUTRES NE POUVAIT LE VOIR. La question utile n'était donc
   pas « où est le bogue » mais, comme les cinq fois précédentes, QUELLE
   GRANDEUR NE MESURE-T-ON PAS. La réponse tient en une phrase :

     LE GÉNÉRATEUR RAISONNE EN CASES, LE RENDU DESSINE DES SPRITES DE CINQ
     CASES DE LARGE, ET RIEN NE COMPARAIT LES DEUX.

   Un pont occupe UNE case dans `props` et en couvre CINQ à l'écran ; une
   clôture en occupe une et en couvre quatre. Tout ce qui est posé après tombe
   librement dans les quatre cases que le premier COUVRE sans les OCCUPER — et
   ça ne lève rien, ça ne bloque rien, ça ne casse aucun trajet. Ça se voit, et
   c'est tout. `render-parc` avait déjà attrapé UN cas de cette famille au 437
   (« aucun houppier ne flotte sur l'eau ») ; ce banc en fait la règle générale
   et l'applique aux 224×168 cases, pas à la fenêtre d'une planche.

   ⚠️ IL NE DESSINE RIEN, ET C'EST VOULU. Une planche montre une fenêtre ; la
   composition est un défaut de la SOMME (le §3 du README de la ferme : « un
   défaut de la SOMME ne se voit dans aucune ligne de code »), donc il faut le
   compter sur toute la carte. Les planches de `render-parc` restent le moyen
   de JUGER ; celui-ci est le moyen de TROUVER.

   ⚠️ CE QU'IL NE SAIT PAS MESURER, IL LE DIT (dernier chapitre). Les décors
   procéduraux — étal, kiosque, fontaine, statue, puits, tombe — n'ont pas de
   taille lisible hors de `fermeArt.js`, donc ils comptent pour une case. Un
   trou déclaré vaut mieux qu'un doublon silencieux : recopier leur largeur ici
   serait le paramètre qui double un paramètre du §8 de CLAUDE.md, dans l'outil
   censé nous en protéger.
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeEngine"]);
const C = mods.fermeConstants, E = mods.fermeEngine;

let fails = 0;
const ok = (cond, name, extra) => {
  console.log(`  ${cond ? "OK  " : "ÉCHEC"}   ${name}${extra ? "  —  " + extra : ""}`);
  if (!cond) fails++;
};
const title = (s) => console.log(`\n=== ${s} ===\n`);

const tw = E.generateTownWorld();
const W = tw.w, H = tw.h, id = (x, y) => y * W + x;
const g = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? tw.ground[id(x, y)] : -1);
const isTree = (x, y) => tw.objects[id(x, y)] === C.O_TREE || tw.objects[id(x, y)] === C.O_TREE2;
const props = tw.props || [];

/* Les trois familles de décors, par ce qu'elles ont le droit d'avoir SOUS elles.
   ⚠️ La liste des décors d'EAU est courte et explicite : ce sont les seuls qui
   se posent délibérément sur le lac (nénuphars, roseaux immergés, pas
   japonais). Tout le reste sur l'eau est un décor qui flotte. */
const ON_WATER = new Set(["lily", "reedsWater", "stepStones"]);
const GROUND_OK = new Set([C.G_GRASS, C.G_TOWN_LAWN]);

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  LA COMPOSITION DES DÉCORS DE VALLEY TOWN — zip 440           ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`\n${props.length} décors, ${tw.objects.reduce((a, o) => a + (o === C.O_TREE || o === C.O_TREE2 ? 1 : 0), 0)} arbres sur ${W}×${H} cases.`);

/* ─────────────────────────────────────────────────────────────────────────────
   1. RIEN N'EST POSÉ SUR UN OUVRAGE.
   ⚠️ C'est le contrôle qui aurait attrapé le défaut de Guillaume en une ligne.
   Un tablier de pont et un ponton sont du bois posé sur l'eau : il n'y pousse
   rien, et on n'y range rien. */
title("1. rien n'est posé sur un ouvrage");
{
  const treesOnDeck = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (isTree(x, y) && g(x, y) === C.G_BRIDGE) treesOnDeck.push(`(${x},${y})`);
  }
  ok(treesOnDeck.length === 0, "aucun arbre sur un tablier de pont ou sur le ponton",
    treesOnDeck.length ? treesOnDeck.join(" ") : "0 arbre");

  const propsOnDeck = props.filter(p => p.kind !== "archBridge" && g(p.x, p.y) === C.G_BRIDGE);
  ok(propsOnDeck.length === 0, "aucun décor sur un tablier de pont ou sur le ponton",
    propsOnDeck.length ? propsOnDeck.map(p => `${p.kind}(${p.x},${p.y})`).join(" ") : "0 décor");

  const treesOnPaving = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = g(x, y);
    if (isTree(x, y) && (t === C.G_PATH || t === C.G_PATH_STONE || t === C.G_WATER)) treesOnPaving.push(`(${x},${y})`);
  }
  ok(treesOnPaving.length === 0, "aucun arbre au milieu d'une allée, d'un dallage ou de l'eau",
    treesOnPaving.length ? treesOnPaving.slice(0, 8).join(" ") : "0 arbre");

  /* ⚠️ ON N'EXIGE L'HERBE QUE DES DÉCORS DE JARDIN (`gard`), et la raison est
     dans `addGarden` : ce sont les seuls qui soient SEMÉS. Le mobilier de place
     est posé sur des axes dallés connus, et il a le droit d'être sur sa dalle. */
  const gardOffGrass = props.filter(p => p.gard && !ON_WATER.has(p.kind) && !GROUND_OK.has(g(p.x, p.y)));
  ok(gardOffGrass.length === 0, "aucun décor semé ailleurs que sur de l'herbe",
    gardOffGrass.length ? gardOffGrass.map(p => `${p.kind}(${p.x},${p.y})`).join(" ") : "0 décor");

  const wetProps = props.filter(p => !ON_WATER.has(p.kind) && g(p.x, p.y) === C.G_WATER);
  ok(wetProps.length === 0, "aucun décor les pieds dans l'eau",
    wetProps.length ? wetProps.map(p => `${p.kind}(${p.x},${p.y})`).join(" ") : "0 décor");
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. L'EMPRISE DESSINÉE D'UN PONT VAUT EXACTEMENT SON TABLIER.
   ⚠️ CE CONTRÔLE EST LA RAISON D'ÊTRE DE `TOWN_BRIDGE_SPAN`. Jusqu'au 439 la
   portée était dite à trois endroits : le sprite (81 px = 5 cases), l'arc
   (`ARCH_SPAN = 3`, 5 cases montées) et le tablier posé par le générateur — 5
   au lac, 7 au parc. Deux disaient 5, un disait 7, personne ne comparait, et il
   restait une case de planches nues à chaque bout du pont du parc. */
title("2. l'ouvrage couvre exactement son tablier");
{
  const bridges = props.filter(p => p.kind === "archBridge");
  ok(bridges.length === 2, "les deux ponts sont posés", bridges.length + " pont(s)");
  for (const b of bridges) {
    const deck = [];
    for (let x = 0; x < W; x++) if (g(x, b.y) === C.G_BRIDGE) deck.push(x);
    // On ne garde que la nappe contiguë qui contient le pont.
    let a = b.x, z = b.x;
    while (deck.includes(a - 1)) a--;
    while (deck.includes(z + 1)) z++;
    const covered = [];
    for (let x = a - 3; x <= z + 3; x++) if (C.townPropCovers("archBridge", b.x, b.y, x, b.y)) covered.push(x);
    ok(covered.length === z - a + 1 && covered[0] === a && covered[covered.length - 1] === z,
      `pont (${b.x},${b.y}) : l'ouvrage dessiné couvre le tablier, ni plus ni moins`,
      `tablier x${a}→${z} (${z - a + 1}), ouvrage x${covered[0]}→${covered[covered.length - 1]} (${covered.length})`);
    ok(z - a + 1 === C.TOWN_BRIDGE_SPAN, `pont (${b.x},${b.y}) : le tablier fait la portée déclarée`,
      `${z - a + 1} / ${C.TOWN_BRIDGE_SPAN} cases`);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. RIEN NE POUSSE DANS UN OUVRAGE.
   ⚠️ C'est la forme générale du défaut de Guillaume, et la seule qui demande de
   connaître le DESSIN : le tronc d'un arbre ne doit jamais tomber dans le corps
   d'un décor construit. Un arbre DERRIÈRE une clôture est juste (c'est de la
   profondeur) ; un arbre DEDANS ne l'est pas, et les deux ne se distinguent que
   par l'emprise du sprite. */
title("3. rien ne pousse dans le corps d'un décor");
{
  /* ⚠️⚠️ 2026-09-05 — LA VÉGÉTATION BASSE EST EXEMPTÉE, ET C'EST LA RÈGLE PRISE AU
     MOT PLUTÔT QU'UN TROU DEDANS. L'en-tête ci-dessus dit « le corps d'un décor
     CONSTRUIT » : ce qu'on interdit, c'est un tronc planté dans une clôture, un
     banc, un lampadaire — un ouvrage qui a un dedans. `C.TOWN_SOFT_PROPS` (les
     sept sortes qu'on TRAVERSE, 2026-09-02) n'a pas de dedans, par construction :
     elle plie au passage et ralentit sans arrêter. Une touffe d'herbe au pied
     d'un arbre n'est pas un défaut de composition, c'est ce que fait l'herbe.

     ⚠️ CE CONTRÔLE EST RESTÉ ROUGE PLUSIEURS JOURS SANS QUE PERSONNE LE SACHE :
     il rejetait trois placements — clump(21,3), grassTuft(198,3), goldBush(205,3)
     — apparus avec la végétation basse, c'est-à-dire qu'il jugeait un CADET sur
     une règle écrite pour ses aînés solides (leçon symétrique du §10 de
     `CLAUDE.md`). *Ce qu'on retire n'est pas la mesure, c'est un cas dont on peut
     nommer la raison* — même geste que l'exemption des ouvrages LINÉAIRES au §4
     ci-dessous, et qu'`archBridge`/les nénuphars au 439.
     ⚠️ L'EXEMPTION EST ÉTROITE ET FALSIFIÉE : un arbre dans le corps d'un décor
     solide reste un défaut, et le contrôle rougit toujours si on en plante un. */
  const bad = [];
  for (const p of props) {
    if (!C.TOWN_PROP_ART[p.kind]) continue;
    if (C.TOWN_SOFT_PROPS.has(p.kind)) continue;
    const b = C.townPropBox(p.kind, p.x, p.y);
    for (let y = Math.floor(b.y0); y <= p.y; y++) {
      for (let x = Math.floor(b.x0); x <= Math.ceil(b.x1); x++) {
        if (!isTree(x, y)) continue;
        if (C.townPropCovers(p.kind, p.x, p.y, x, y)) bad.push(`${p.kind}(${p.x},${p.y})←arbre(${x},${y})`);
      }
    }
  }
  ok(bad.length === 0, "aucun arbre dans l'emprise dessinée d'un décor",
    bad.length ? bad.slice(0, 10).join(" ") : "0 arbre");
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. DEUX DÉCORS NE S'INTERPÉNÈTRENT PAS.
   ⚠️ On mesure le recouvrement des CORPS, pas des cases : deux objets peints
   côte à côte se chevauchent d'un pixel sans que ça se voie. Le seuil est celui
   de `townPropCovers` — la moitié d'une case — et c'est le seul du projet. */
title("4. deux décors ne s'interpénètrent pas");
{
  /* ⚠️⚠️ ZIP 447 — DEUX TRONÇONS DU MÊME OUVRAGE LINÉAIRE ONT LE DROIT DE SE
     TOUCHER, ET C'EST UNE PRÉCISION DE LA RÈGLE, PAS UN TROU DEDANS. Le §5
     ci-dessous dit déjà qu'un garde-corps, une murette ou une haie sont des
     ouvrages CONTINUS — « ce qui en fait un garde-corps est le fait qu'il
     court ». Or continu veut dire jointif : une rambarde faite de tuiles d'une
     case se recouvre forcément d'un tronçon à l'autre, et l'exiger disjointe
     reviendrait à exiger qu'elle soit trouée.
     ⚠️ L'EXEMPTION EST ÉTROITE : même famille ET famille linéaire. Un massif
     planté dans une rambarde reste un défaut, un banc dans une haie aussi —
     c'est-à-dire que tout ce que ce contrôle attrapait, il l'attrape encore.
     Ce qu'on retire n'est pas la mesure, c'est un cas dont on peut nommer la
     raison (même geste qu'au 439 sur `archBridge` et les nénuphars). */
  /* ⚠️ 2026-09-01 — `stoneBlock` REJOINT LA FAMILLE, ET C'EST UN CHANGEMENT
     D'EMPLOI, PAS UNE TOLÉRANCE. Il ne servait nulle part jusqu'ici ; le
     parapet du belvédère en fait une file continue de blocs, c'est-à-dire un
     ouvrage LINÉAIRE au sens exact du §5 ci-dessous — il court, et ce qui en
     fait un garde-corps est le fait qu'il court. L'exemption reste étroite :
     même famille, et un massif planté dans le parapet reste un défaut. */
  const CONTINU = new Set(["fence", "lowWall", "hedgeRow", "benchWall", "stoneBlock"]);
  const seen = new Set(), bad = [];
  for (const p of props) {
    if (!C.TOWN_PROP_ART[p.kind]) continue;
    for (const q of props) {
      if (p === q || !C.TOWN_PROP_ART[q.kind]) continue;
      if (p.kind === q.kind && CONTINU.has(p.kind)) continue;
      if (Math.abs(p.x - q.x) > 6 || Math.abs(p.y - q.y) > 5) continue;
      const key = [p.x, p.y, q.x, q.y].sort().join(",");
      if (seen.has(key)) continue;
      // Le corps de q recouvre-t-il la case d'ancrage de p, et réciproquement ?
      if (C.townPropCovers(q.kind, q.x, q.y, p.x, p.y) || C.townPropCovers(p.kind, p.x, p.y, q.x, q.y)) {
        seen.add(key);
        bad.push(`${p.kind}(${p.x},${p.y})×${q.kind}(${q.x},${q.y})`);
      }
    }
  }
  ok(bad.length === 0, "aucun décor n'est planté dans le corps d'un autre",
    bad.length ? bad.slice(0, 10).join(" ") : "0 paire");
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. UN OUVRAGE LINÉAIRE N'A PAS DE TRONÇON ISOLÉ.
   ⚠️⚠️ CELUI-CI N'EST PAS UNE ERREUR DE GÉOMÉTRIE, C'EST UNE ERREUR DE SENS, et
   c'est pour ça qu'aucun contrôle de case ne pouvait l'attraper : une clôture
   de quatre cases posée seule au milieu d'un pré est parfaitement légale, elle
   n'empiète sur rien, elle ne bloque rien — et elle ne PROTÈGE rien, donc elle
   ne veut rien dire. Un garde-corps est un ouvrage CONTINU ; ce qui en fait un
   garde-corps est le fait qu'il court. Même chose pour une murette et pour une
   rangée de haie. */
title("5. un ouvrage linéaire court, il ne se pose pas tout seul");
{
  const LINEAR = ["fence", "lowWall", "hedgeRow", "benchWall", "stoneBlock"];
  for (const kind of LINEAR) {
    const list = props.filter(p => p.kind === kind);
    if (!list.length) { console.log(`  ····   ${kind} : aucun posé`); continue; }
    const b = C.townPropBox(kind, 0, 0);
    const reach = Math.ceil(b.x1 - b.x0) + 1;      // deux tronçons se suivent s'ils se touchent
    const lone = list.filter(p => !list.some(q => q !== p && Math.abs(q.x - p.x) <= reach && Math.abs(q.y - p.y) <= 2));
    ok(lone.length === 0, `${kind} : aucun tronçon isolé`,
      `${list.length} tronçon(s), ${lone.length} isolé(s)` + (lone.length ? " : " + lone.map(p => `(${p.x},${p.y})`).join(" ") : ""));
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. CE QUE CE BANC NE SAIT PAS MESURER.
   ⚠️ Il l'imprime À CHAQUE LANCEMENT, et ce n'est pas de la coquetterie : c'est
   la seule chose qui empêche de croire que « verify-compo passe » veut dire
   « la composition est bonne ». Le §14.6 de CLAUDE.md, appliqué à un banc plutôt
   qu'à une doc. */
title("6. ce que ce banc ne mesure pas");
{
  const kinds = new Map();
  for (const p of props) kinds.set(p.kind, (kinds.get(p.kind) || 0) + 1);
  const unknown = [...kinds.entries()].filter(([k]) => !C.TOWN_PROP_ART[k]).sort((a, b) => b[1] - a[1]);
  console.log("  Décors procéduraux (taille illisible hors de fermeArt.js), comptés pour UNE case :");
  console.log("    " + (unknown.length ? unknown.map(([k, n]) => `${k}×${n}`).join(" · ") : "aucun"));
  console.log("  → un arbre planté dans un étal ou dans le kiosque ne serait PAS vu ici.");
  const known = [...kinds.entries()].filter(([k]) => C.TOWN_PROP_ART[k]).reduce((a, [, n]) => a + n, 0);
  console.log(`\n  Mesurés : ${known} décors sur ${props.length}.`);
}

console.log(fails ? `\n❌ ${fails} contrôle(s) en échec.\n` : "\n✅ Tous les contrôles passent.\n");
process.exit(fails ? 1 : 0);
