/* =============================================================================
   verify-pont.mjs — LE PASSANT RESTE-T-IL ENTRE LES DEUX GARDE-CORPS ? (441)
   -----------------------------------------------------------------------------
       node tools/verify-pont.mjs

   ⚠️⚠️ CE BANC EXISTE PARCE QUE GUILLAUME A DIT « RÉPARE LES BUGS DE TRAVERSÉE
   DES PONTS » ET QU'AUCUN DES SEIZE AUTRES NE POUVAIT LES VOIR. La question
   utile n'était donc pas « où est le bogue » mais, comme les six fois
   précédentes, QUELLE GRANDEUR NE MESURE-T-ON PAS. La réponse tient en une
   ligne, et elle n'était écrite nulle part :

     ON MESURAIT QUE LE TABLIER MONTE (`verify-vallee`, 20 cases) ET QU'IL NE
     TOUCHE PAS LA COLLISION (idem, 0 case polluée). PERSONNE NE COMPARAIT LA
     CLÉ DE TRI DU PASSANT À CELLES DES DEUX MOITIÉS DU PONT.

   Or c'est exactement là qu'était le défaut. Le 439 a coupé le sprite en deux
   et posé leurs clés à ±TOWN_SORT_EPS (0,02) de part et d'autre des rangées du
   tablier : c'est cette marge, et rien d'autre, qui met le passant DEVANT le
   garde-corps du fond sur la rangée nord. Puis le 439 a versé la flèche de
   l'arc (jusqu'à 7 px) dans l'ALTITUDE du passant — et `pushE` classe par
   `wy − altitude × TOWN_ELEV_PX`. Sept est trois cent cinquante fois deux
   centièmes : sur TOUTE la portée des DEUX ponts, rangée nord, le fermier
   repassait derrière le garde-corps du fond et disparaissait entièrement.
   Mesuré en jouant, pas déduit : seule l'étiquette de son nom restait visible.

   ⚠️ CE BANC N'AURAIT RIEN VU S'IL AVAIT RECOPIÉ LES FORMULES. C'est le §3 du
   439 (« un banc qui repeint juge sa propre maquette ») : les trois clés
   vivaient dans la closure de la boucle de rendu, donc un banc n'avait d'autre
   choix que de les réécrire — et une formule réécrite est une formule qui ne
   diverge jamais d'elle-même. Elles sont sorties dans `fermeConstants.js`
   (`townDepthKey`, `townBridgeDepthKeys`, `townWalkerDepthKey`), le jeu les
   APPELLE, ce banc les APPELLE, et c'est ce partage qui fait la mesure.

   ⚠️ CE QU'IL NE MESURE PAS, ET IL LE DIT : il ne dessine rien. Il ne peut donc
   pas voir un garde-corps mal découpé (TOWN_BRIDGE_SPLIT_Y) ni un tablier mal
   ancré (TOWN_BRIDGE_DROP_PX) — ça, c'est `render-parc.mjs` et l'œil. Il mesure
   l'ORDRE, qui est la seule chose qui rendait le pont infranchissable au regard.
   ========================================================================== */
import fs from "fs";
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
const W = tw.w, H = tw.h;
const el = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : tw.elev[y * W + x]);
const gr = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? -1 : tw.ground[y * W + x]);
const arch = E.townArchRise(tw);
const ar = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : (arch[y * W + x] || 0));
const bridges = (tw.props || []).filter(p => p.kind === "archBridge");

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║  LA TRAVERSÉE DES PONTS DE VALLEY TOWN — zip 441              ║");
console.log("╚══════════════════════════════════════════════════════════════╝");
console.log(`\n${bridges.length} pont(s), portée ${C.TOWN_BRIDGE_SPAN} cases, flèche ${C.TOWN_BRIDGE_ARCH_PX} px, marge de tri ${C.TOWN_SORT_EPS}.`);

ok(bridges.length > 0, "il y a des ponts à mesurer", bridges.map(b => `(${b.x},${b.y})`).join(" "));

/* ─────────────────────────────────────────────────────────────────────────────
   1. LE PASSANT EST STRICTEMENT ENTRE LES DEUX MOITIÉS, SUR CHAQUE CASE.
   ⚠️ C'EST LE CONTRÔLE QUI AURAIT ATTRAPÉ LE DÉFAUT EN UNE LIGNE. Le tablier
   fait deux rangées (`pr.y − 1` au nord, `pr.y` au sud) : les deux comptent, et
   c'est la rangée NORD qui était fausse — celle où la marge est la plus mince.
   ─────────────────────────────────────────────────────────────────────────── */
title("1. le passant reste entre les deux garde-corps");
{
  let deck = 0, behindFar = 0, beforeNear = 0;
  const worst = { far: Infinity, near: Infinity };
  for (const b of bridges) {
    const k = C.townBridgeDepthKeys(b.y, el(b.x, b.y));
    for (const row of [b.y - 1, b.y]) {
      for (let x = b.x - C.TOWN_BRIDGE_SPAN; x <= b.x + C.TOWN_BRIDGE_SPAN; x++) {
        if (gr(x, row) !== C.G_BRIDGE) continue;   // on ne juge que le tablier
        deck++;
        const w = C.townWalkerDepthKey(row, el(x, row));
        if (!(w > k.far)) behindFar++;
        if (!(w < k.near)) beforeNear++;
        worst.far = Math.min(worst.far, w - k.far);
        worst.near = Math.min(worst.near, k.near - w);
      }
    }
  }
  ok(deck > 0, "des cases de tablier ont été trouvées", deck + " case(s)");
  ok(behindFar === 0, "⚠️ aucune case ne met le passant DERRIÈRE le garde-corps du fond",
    behindFar + " case(s) fautive(s) · marge minimale " + worst.far.toFixed(2) + " px");
  ok(beforeNear === 0, "aucune case ne met le passant DEVANT le garde-corps du devant",
    beforeNear + " case(s) fautive(s) · marge minimale " + worst.near.toFixed(2) + " px");
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. LA MÊME MESURE, AVEC LE DÉFAUT DU 439 REMIS EN PLACE.
   ⚠️ CE CONTRÔLE MESURE LE COÛT DE LA FAUTE, ET C'EST SA RAISON D'ÊTRE : un
   banc qui passe au vert sans jamais avoir pu passer au rouge ne prouve rien
   (leçon du 439). On rejoue donc explicitement la clé fautive — flèche versée
   dans l'altitude — et on EXIGE qu'elle casse. Le jour où quelqu'un remet la
   flèche dans `pushE(…, ey, …)`, ce chiffre-ci et le contrôle 1 disent la même
   chose, et on saura tout de suite laquelle des deux grandeurs a bougé.
   ─────────────────────────────────────────────────────────────────────────── */
title("2. la faute du 439, rejouée : combien de cases coûtait-elle ?");
{
  let hidden = 0, deck = 0;
  for (const b of bridges) {
    const k = C.townBridgeDepthKeys(b.y, el(b.x, b.y));
    for (const row of [b.y - 1, b.y]) {
      for (let x = b.x - C.TOWN_BRIDGE_SPAN; x <= b.x + C.TOWN_BRIDGE_SPAN; x++) {
        if (gr(x, row) !== C.G_BRIDGE) continue;
        deck++;
        // la clé telle que le 439 la calculait : altitude = case + flèche/EP
        const bad = C.townWalkerDepthKey(row, el(x, row) + ar(x, row) / C.TOWN_ELEV_PX);
        if (!(bad > k.far)) hidden++;
      }
    }
  }
  ok(hidden > 0, "⚠️ la clé fautive cache bien le passant (sinon ce banc ne prouverait rien)",
    hidden + " / " + deck + " case(s) de tablier");
  console.log(`\n  → le défaut vu en jouant coûtait ${hidden} case(s) de tablier sur ${deck}.`);
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. LA FLÈCHE RESTE UNE GRANDEUR DE DESSIN.
   Reprise du contrôle du 439 (il vit dans `verify-vallee`), gardée ici parce
   que c'est l'autre moitié de la même règle et qu'on veut les lire ensemble :
   l'arc monte à l'image, il ne monte NI la collision NI le rang.
   ─────────────────────────────────────────────────────────────────────────── */
title("3. la flèche ne touche ni l'altitude ni la portée");
{
  let polluted = 0, risen = 0, summit = 0, offDeck = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const a = ar(x, y);
    if (!a) continue;
    risen++;
    summit = Math.max(summit, a);
    if (el(x, y) !== 0) polluted++;
    if (gr(x, y) !== C.G_BRIDGE) offDeck++;
  }
  ok(risen > 0, "le dos d'âne existe", risen + " case(s) montée(s)");
  ok(summit === C.TOWN_BRIDGE_ARCH_PX, "la flèche atteint son sommet déclaré",
    summit + " / " + C.TOWN_BRIDGE_ARCH_PX + " px");
  ok(polluted === 0, "⚠️ aucune case montée n'a d'altitude de collision",
    polluted + " case(s) polluée(s)");
  /* ⚠️ Le profil déborde d'une case de chaque côté (il retombe à ZÉRO aux deux
     têtes, voir TOWN_BRIDGE_ARCH_SPAN) : ces deux cases-là valent 0 et ne sont
     donc pas comptées. Tout ce qui monte doit être du tablier. */
  ok(offDeck === 0, "tout ce qui monte est bien du tablier",
    offDeck + " case(s) hors tablier");
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. GARDE-FOU DE SOURCE — LA FLÈCHE NE REVIENT PAS DANS UNE ALTITUDE.
   ⚠️ CE CONTRÔLE EST UNE ANALYSE DE TEXTE, ET IL LE DIT. Les chapitres 1 à 3
   mesurent des DONNÉES : ils ne peuvent pas voir ce que la boucle de rendu
   passe réellement à `pushE`, parce que ce code vit dans une closure (§4 de
   CLAUDE.md). Ils passeraient donc au vert si quelqu'un reversait la flèche
   dans l'altitude — c'est-à-dire précisément le jour où on en aurait besoin.
   Il surveille une LISTE NOMMÉE de symboles, comme `verify-scope.mjs` : ce
   n'est pas un analyseur, c'est un garde-fou de dix lignes sur la faute exacte
   qui a été payée. Un trou déclaré vaut mieux qu'une promesse silencieuse.
   ─────────────────────────────────────────────────────────────────────────── */
title("4. garde-fou de source : la flèche n'est pas une altitude");
{
  const src = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
  const LIFT = /(archPxTown|playerArchPxTown|TOWN_JUMP_ARC_PX)/;
  const bad = [];
  const lines = src.split("\n");
  let seen = 0;
  lines.forEach((ln, i) => {
    const at = ln.indexOf("pushE(");
    if (at < 0) return;
    seen++;
    /* Les arguments de `pushE` : (wy, ey, fn, liftPx). On isole le DEUXIÈME,
       l'altitude — le seul dans lequel une hauteur d'image n'a rien à faire.
       La découpe est naïve (une virgule de premier niveau) et suffit : les
       appels du fichier passent tous une expression simple en altitude.
       ⚠️ ON PREND TOUTE LA FIN DE LIGNE, SANS S'ARRÊTER AU POINT-VIRGULE. Le
       premier jet de ce banc écrivait `/pushE\(([^;]*)$/` : ancré sur la fin de
       ligne, ce motif ne peut PAS matcher une ligne qui se termine par `;`,
       c'est-à-dire tous les appels tenant sur une seule ligne — soit la quasi-
       totalité d'entre eux. Il annonçait « 0 appel fautif » en n'ayant regardé
       que les appels coupés en deux lignes, et il est passé au vert sur une
       faute injectée exprès. C'est le stub menteur du §10 de CLAUDE.md, commis
       dans le garde-fou lui-même : d'où le compte d'appels VUS ci-dessous, qui
       est la seule façon de s'apercevoir qu'un scanner ne scanne rien. */
    const args = ln.slice(at + 6);
    let depth = 0, start = -1, end = -1;
    for (let k = 0; k < args.length; k++) {
      const ch = args[k];
      if (ch === "(" || ch === "[") depth++;
      else if (ch === ")" || ch === "]") depth--;
      else if (ch === "," && depth === 0) { if (start < 0) start = k + 1; else { end = k; break; } }
    }
    if (start < 0) return;
    const ey = args.slice(start, end < 0 ? args.length : end);
    if (LIFT.test(ey)) bad.push(`${i + 1}: ${ey.trim()}`);
  });
  ok(seen >= 25, "le scanner voit bien les appels à pushE", seen + " appel(s) lu(s)");
  ok(bad.length === 0, "⚠️ aucune hauteur d'image n'est passée en ALTITUDE à pushE",
    bad.length ? bad.join(" | ") : `0 appel fautif sur ${seen} lus`);

  /* Et la réciproque : la flèche doit bien être passée QUELQUE PART, sinon on
     a « corrigé » le tri en supprimant le dos d'âne — ce qui passerait les
     quatre chapitres au vert pour un pont redevenu plat. */
  const lifts = (src.match(/pushE\([^;]*,\s*(archPxTown|playerArchPxTown|pLift|myLift|pl|tl)\s*\)/g) || []).length;
  ok(lifts >= 6, "…et elle est bien passée en décalage d'image à tout ce qui marche dessus",
    lifts + " appel(s) avec un décalage");
}

console.log(fails === 0 ? "\n✅ Tous les contrôles passent.\n" : `\n❌ ${fails} contrôle(s) en échec.\n`);
process.exit(fails === 0 ? 0 : 1);
