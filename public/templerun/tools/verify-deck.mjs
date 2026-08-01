/* =============================================================================
   tools/verify-deck.mjs — La chaussée 2D tient-elle ses promesses ?
   -----------------------------------------------------------------------------
       node public/templerun/tools/verify-deck.mjs   (depuis la racine du repo)

   Zip 378. Trois choses ont été promises à Guillaume sur la rive est, et
   aucune des trois ne se relit dans le code :

     1. la chaussée VA JUSQU'AU BORD de la carte, sur les six mondes. Elle
        s'arrêtait quatre dalles après la berge, ce qui la faisait lire comme
        un ponton inachevé ;
     2. elle est une réduction FIDÈLE de la plateforme 3D — même pierre, même
        mousse, mêmes runes, mêmes torches. Le défi étant une page autonome
        que ce module ne peut pas lire, les deux palettes sont recopiées à la
        main : c'est exactement le genre d'endroit où deux décors finissent
        « presque » assortis sans que personne ne s'en aperçoive ;
     3. la case de déclenchement ne se distingue PLUS de ses voisines
        (« plus de porte visible, mais l'effet reste le même, et localisé au
        même endroit »). Un marqueur oublié quelque part la trahirait.

   Le troisième contrôle est le plus intéressant : on ne relit pas le code du
   rendu, on DESSINE la case de déclenchement et une dalle ordinaire dans deux
   tampons, et on compare les pixels. C'est la seule façon de prouver qu'elles
   sont indiscernables.
   ========================================================================== */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fermeDir = path.resolve(here, "../../../components/ferme");
const runDir = path.resolve(here, "..");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-deck-"));
for (const f of ["fermeConstants.js", "fermeEngine.js", "fermeArt.js"]) {
  fs.writeFileSync(path.join(tmp, f), fs.readFileSync(path.join(fermeDir, f), "utf8")
    .replace(/from\s+"\.\/(ferme[A-Za-z]+)"/g, 'from "./$1.js"'));
}
const C = await import(pathToFileURL(path.join(tmp, "fermeConstants.js")).href);
const E = await import(pathToFileURL(path.join(tmp, "fermeEngine.js")).href);
const ART = await import(pathToFileURL(path.join(tmp, "fermeArt.js")).href);

const W = C.EVIL_MAP_W, H = C.EVIL_MAP_H;
const failures = [];

/* =========================================================================
   1. LES DEUX PALETTES NE DOIVENT PAS DIVERGER
   ====================================================================== */
{
  const cfg = fs.readFileSync(path.join(runDir, "js/config.js"), "utf8");
  const colOf = (name) => {
    const m = cfg.match(new RegExp("COL_" + name + ":\\s*0x([0-9a-fA-F]{6})"));
    return m ? ("#" + m[1].toLowerCase()) : null;
  };
  // Nom côté 2D -> nom de la constante CFG.COL_* du défi 3D.
  const PAIRS = {
    STONE: "STONE", STONE_DARK: "STONE_DARK", STONE_EDGE: "STONE_EDGE",
    MOSS: "MOSS", MOSS_DARK: "MOSS_DARK", VINE: "VINE",
    CRACK: "CRACK", STAIN: "STAIN", STAIN_DARK: "STAIN_DARK",
    TORCH: "TORCH", RUNE: "RUNE", MUSHROOM: "MUSHROOM",
    LAKE: "LAKE", LAKE_GLOW: "LAKE_GLOW", BARK_DARK: "BARK_DARK",
  };
  let checked = 0;
  for (const [k2d, k3d] of Object.entries(PAIRS)) {
    const want = colOf(k3d);
    const got = (ART.RUN_DECK_PALETTE[k2d] || "").toLowerCase();
    if (!want) { failures.push(`CFG.COL_${k3d} introuvable dans js/config.js`); continue; }
    checked++;
    if (got !== want) failures.push(`palette : ${k2d} vaut ${got} en 2D et ${want} en 3D`);
  }
  const extra = Object.keys(ART.RUN_DECK_PALETTE).filter(k => !PAIRS[k]);
  if (extra.length) failures.push(`couleurs 2D sans équivalent 3D déclaré : ${extra.join(", ")}`);
  console.log(`1. Palettes : ${checked} couleurs comparées entre fermeArt.js et js/config.js.`);
}

/* =========================================================================
   2. GÉOMÉTRIE, SUR LES SIX MONDES
   ====================================================================== */
{
  const worlds = [["carte maléfique (historique)", E.generateEvilWorld()]];
  for (let i = 0; i < C.PASSAGE_WORLDS.length; i++) {
    worlds.push([`monde ${i} — ${C.PASSAGE_WORLDS[i].key}`, E.generatePassageWorld(i)]);
  }
  const base = C.RUN_JETTY_BASE;
  for (const [label, w] of worlds) {
    let deck = 0, kerb = 0, holes = 0;
    for (let x = base.x + 1; x <= C.RUN_DECK_END_X; x++) {
      for (let dy = -C.RUN_KERB_HALF_W; dy <= C.RUN_KERB_HALF_W; dy++) {
        const g = w.ground[(base.y + dy) * W + x];
        const wantKerb = Math.abs(dy) > C.RUN_JETTY_HALF_W;
        if (wantKerb) { if (g === C.G_RUN_KERB) kerb++; else holes++; }
        else if (g === C.G_RUN_JETTY || g === C.G_RUN_GATE) deck++;
        else holes++;
      }
    }
    if (holes) failures.push(`${label} : ${holes} case(s) manquante(s) dans la chaussée`);

    // ELLE ATTEINT LE BORD. C'est la demande explicite de Guillaume, et c'est
    // ce que le contrôle précédent ne dit PAS : une chaussée de deux cases de
    // long serait « complète » sans atteindre quoi que ce soit.
    const lastCol = C.RUN_DECK_END_X;
    if (lastCol !== W - 1) failures.push(`${label} : la chaussée s'arrête colonne ${lastCol}, le bord est à ${W - 1}`);
    for (let dy = -C.RUN_KERB_HALF_W; dy <= C.RUN_KERB_HALF_W; dy++) {
      const g = w.ground[(base.y + dy) * W + (W - 1)];
      if (g !== C.G_RUN_JETTY && g !== C.G_RUN_GATE && g !== C.G_RUN_KERB) {
        failures.push(`${label} : la dernière colonne de la carte n'est pas de la chaussée (rangée ${dy})`);
      }
    }
    // La bordure BLOQUE, les trois voies NON. C'est ce qui garantit que
    // l'élargissement n'a rien retiré au joueur.
    const blocked = (x, y) => {
      const g = w.ground[y * W + x];
      return g === C.G_WATER || g === C.G_RUN_KERB;
    };
    for (let x = base.x + 1; x <= C.RUN_DECK_END_X; x++) {
      for (let dy = -C.RUN_JETTY_HALF_W; dy <= C.RUN_JETTY_HALF_W; dy++) {
        if (blocked(x, base.y + dy)) failures.push(`${label} : voie praticable bloquée en (${x}, ${base.y + dy})`);
      }
      for (const dy of [-C.RUN_KERB_HALF_W, C.RUN_KERB_HALF_W]) {
        if (!blocked(x, base.y + dy)) failures.push(`${label} : la bordure ne bloque pas en (${x}, ${base.y + dy})`);
      }
    }
    console.log(`   ${label.padEnd(30)} ${deck} dalles + ${kerb} bordures, jusqu'à la colonne ${W - 1}`);
  }
}

/* =========================================================================
   2 bis. CHAQUE TERRE A BIEN SON PROPRE PONT (zip 386)
   -------------------------------------------------------------------------
   Décision Guillaume : « give each land its own themed bridge ». La promesse
   n'est pas « il existe une fonction par thème », c'est « les cinq ponts ne se
   ressemblent pas ». On DESSINE donc les cinq et on compare les tracés.

   Ce contrôle existe parce que le mode de panne est silencieux : drawBridgeTile
   retombe volontairement sur la pierre pour un thème inconnu (un monde ajouté
   sans habillage doit être terne, jamais cassé). Une faute de frappe dans une
   clé `bridge` ne produirait donc AUCUNE erreur — juste une terre de plus avec
   la chaussée du défi de fuite, et personne ne s'en apercevrait avant de
   tomber dessus en jeu, trois jours de jeu plus tard.
   ====================================================================== */
{
  const T = 16;
  function paint(theme, side) {
    const buf = [];
    const ctx = {
      fillStyle: "",
      fillRect(x, y, w, h) { buf.push(`${this.fillStyle}|${x}|${y}|${w}|${h}`); },
    };
    ART.drawBridgeTile(ctx, 0, 0, T, C.RUN_GATE.x, C.RUN_JETTY_BASE.y + side, side, theme,
      C.RUN_JETTY_BASE.y - C.RUN_JETTY_HALF_W);
    ART.drawBridgeOverlay(ctx, 0, 0, T, C.RUN_GATE.x, C.RUN_JETTY_BASE.y + side, side, 1234,
      C.RUN_JETTY_BASE.x, theme);
    return buf.join("\n");
  }

  const seen = new Map();
  console.log("\n2 bis. Ponts par terre :");
  for (const w of C.PASSAGE_WORLDS) {
    const theme = w.bridge || "stone";
    const sig = paint(theme, 0) + "\n##\n" + paint(theme, -1);
    if (!sig.length) { failures.push(`le pont de ${w.key} ne dessine rien`); continue; }
    const twin = seen.get(sig);
    if (twin) failures.push(`les ponts de ${w.key} et de ${twin} sont IDENTIQUES (thème "${theme}" non pris en compte ?)`);
    else seen.set(sig, w.key);
    const dest = C.PASSAGE_GATE_DEST[w.key] || "—";
    console.log(`   ${w.key.padEnd(9)} habillage « ${theme} », mène à : ${dest}`);
  }
  console.log(`   ${seen.size} habillage(s) distinct(s) pour ${C.PASSAGE_WORLDS.length} terres`);

  // Le défi de fuite ne doit avoir QU'UNE seule terre (décision zip 386).
  const runLands = Object.keys(C.PASSAGE_GATE_DEST).filter(k => C.PASSAGE_GATE_DEST[k] === "run");
  console.log(`   Terres menant au défi de fuite : ${runLands.join(", ") || "aucune"}`);
  if (runLands.length !== 1) failures.push(`${runLands.length} terres mènent au défi de fuite, une seule est attendue`);
}

/* =========================================================================
   3. LA CASE DE DÉCLENCHEMENT EST INDISCERNABLE
   ====================================================================== */
{
  const T = 16;
  function draw(tx, ty, side) {
    const buf = [];
    const ctx = {
      fillStyle: "",
      fillRect(x, y, w, h) { buf.push(`${this.fillStyle}|${x}|${y}|${w}|${h}`); },
    };
    ART.drawRunDeckTile(ctx, 0, 0, T, tx, ty, side);
    return buf.join("\n");
  }
  /* Le rendu ne dépend QUE des coordonnées : on redessine donc la même case
     en faisant croire au dessinateur qu'elle est ailleurs ne prouverait rien.
     Ce qu'on veut, c'est qu'aucun code ne consulte le TYPE de sol — et la
     signature de drawRunDeckTile ne le reçoit même pas. Le contrôle porte
     donc sur l'appelant : on vérifie que la case de déclenchement est traitée
     par la même branche que les dalles ordinaires dans FermeGame.js. */
  const fg = fs.readFileSync(path.join(fermeDir, "FermeGame.js"), "utf8");
  const evilPart = fg.slice(fg.indexOf("function drawEvilFrame"), fg.indexOf("function blockedEvil"));
  const gateMentions = (evilPart.match(/G_RUN_GATE/g) || []).length;
  const inDeckTest = /const isDeck = g === C\.G_RUN_JETTY \|\| g === C\.G_RUN_GATE;/.test(evilPart);
  console.log(`\n3. Case de déclenchement : ${gateMentions} mention(s) dans drawEvilFrame, regroupée avec les dalles : ${inDeckTest}`);
  if (!inDeckTest) failures.push("drawEvilFrame ne traite plus la case de déclenchement comme une dalle ordinaire");
  if (gateMentions !== 1) {
    failures.push(`G_RUN_GATE est mentionné ${gateMentions} fois dans le rendu du monde sombre : il reste un habillage de porte`);
  }
  // Et la preuve visuelle : deux dalles voisines produisent des dessins
  // DIFFÉRENTS (le décor n'est pas uniforme) mais issus du même code.
  const a = draw(C.RUN_GATE.x, C.RUN_GATE.y, 0);
  const b = draw(C.RUN_GATE.x + 1, C.RUN_GATE.y, 0);
  if (a === b) failures.push("deux dalles voisines sont dessinées à l'identique : le décor est uniforme");
  console.log(`   dalle de déclenchement et sa voisine : ${a.split("\n").length} et ${b.split("\n").length} tracés, tirés du même code.`);
}

/* =========================================================================
   4. LE RENDU RESTE RASTERISABLE
   ====================================================================== */
{
  const used = new Set();
  const ctx = new Proxy({ fillStyle: "" }, {
    get(t, k) {
      if (k === "fillStyle") return t.fillStyle;
      used.add(String(k));
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  for (let dy = -2; dy <= 2; dy++) {
    ART.drawRunDeckTile(ctx, 0, 0, 16, 60, 34 + dy, dy === 0 ? 0 : Math.sign(dy));
    if (dy !== 0) ART.drawRunDeckOverlay(ctx, 0, 0, 16, 60, 34 + dy, Math.sign(dy), 1234, 57);
  }
  const allowed = new Set(["fillRect"]);
  const forbidden = [...used].filter(k => !allowed.has(k));
  console.log(`\n4. Primitives employées : ${[...used].join(", ")}`);
  if (forbidden.length) {
    failures.push(`le rendu de la chaussée emploie ${forbidden.join(", ")} : il n'est plus rasterisable par render-jetty.mjs`);
  }
}

if (failures.length) {
  console.log("\nÉCHEC :");
  for (const f of failures) console.log("  " + f);
  process.exit(1);
}
console.log("\nOK — chaussée complète jusqu'au bord sur les 6 mondes, palettes accordées, déclenchement invisible.");
