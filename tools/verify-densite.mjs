/* =============================================================================
   verify-densite.mjs — UN SEUL GROS PIXEL DANS TOUTE LA VILLE (2026-09-25)
   -----------------------------------------------------------------------------
       node tools/verify-densite.mjs

   ⚠️⚠️ CE BANC EXISTE PARCE QUE L'AUDIT GRAPHIQUE DU 2026-09-25, FAIT EN JEU, A
   TROUVÉ TROIS DENSITÉS DE PIXEL À L'ÉCRAN EN MÊME TEMPS — et qu'aucun des
   quarante-huit bancs du dépôt ne pouvait le dire. Le décor procédural sort à
   1 px d'art = ZOOM px d'écran ; l'hôtel de ville à 1,1 px d'art par px source
   (un pixel sur dix doublé) ; le tribunal à 0,73 (un sur quatre sauté) ;
   l'église à 0,55 ET lissée, donc floue. Aucun `render-*` ne peut le voir : ils
   appellent du code, ils ne relisent pas un PNG (CLAUDE.md §9), et les trois
   monuments se dessinent dans la closure de la boucle de rendu.

   CE QU'IL TIENT (la « règle d'échelle unique », phase 1 de la feuille de route
   en tête de `components/ferme/README.md`) :
     1. tout `loadBitmap(...)` de `components/ferme/` passe par la table
        `TOWN_BITMAPS` (fermeConstants.js) — une échelle écrite dans une fonction
        de dessin est une échelle qu'aucun banc ne lit ;
     2. chaque PNG déclaré existe, et sa taille native est celle que la table
        annonce (un PNG regénéré sans ses repères déplace les murs du tribunal :
        `courtSpriteX` DÉRIVE la collision de ces nombres) ; le calque de nuit a
        la taille du jour ;
     3. UN PX SOURCE = UN NOMBRE ENTIER DE PX D'ART (`disp × grow / iw` entier),
        et aucun lissage — nulle part dans `components/ferme/` ;
     4. le faux canevas des bancs dessine les dégradés juste (ils ont été ajoutés
        le même jour pour ranimer `render-eau` et `render-parc`, et un outil qui
        ment est pire qu'un outil qui manque — CLAUDE.md §10).

   ⚠️⚠️ LE CLIQUET. Les trois monuments violent la règle 3 AUJOURD'HUI : c'est
   la phase 1, pas un oubli. Ils sont listés dans `EN_ATTENTE` et le banc les
   IMPRIME sans rougir — un banc rouge le jour de sa naissance ne pourrait plus
   rien dire du défaut suivant (CLAUDE.md §10). Mais il rougit :
     · si un bitmap NON listé viole la règle (le défaut revient ailleurs) ;
     · si un bitmap listé la RESPECTE (la phase 1 l'a corrigé : on le retire de
       la liste, sinon la liste ment et protégerait une régression future).
   La liste ne peut donc que rétrécir, et elle doit être vide à la fin de la
   phase 1.

   ⚠️ CE QU'IL NE MESURE PAS, ET IL LE DIT : le STYLE d'un bitmap (palette,
   cerne, lumière). Un PNG à la bonne densité peut rester une peinture collée
   sur du pixel art — les herbes hautes le sont (natives, donc conformes ici).
   Ça se juge à l'écran. Il ne voit pas non plus les échelles des PERSONNAGES
   (enfants, perron du tribunal) : hors champ par décision du 2026-09-25.
   ========================================================================== */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadFerme, makeCanvas } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const { fermeConstants: C } = await loadFerme(ROOT, ["fermeConstants"]);

let fails = 0;
const ok = (cond, name, extra) => {
  console.log(`  ${cond ? "OK  " : "ÉCHEC"}   ${name}${extra ? "  —  " + extra : ""}`);
  if (!cond) fails++;
};
const title = (s) => console.log(`\n=== ${s} ===\n`);

/* ⚠️ LA LISTE QUI NE PEUT QUE RÉTRÉCIR. Chaque entrée dit POURQUOI elle y est
   et QUI la retire. Ajouter une entrée ici pour faire passer le banc, c'est
   exactement ce qu'il existe pour empêcher. */
const EN_ATTENTE = {
  /* VIDE DEPUIS LE 2026-09-25 (fin de la phase 1) : l'église, l'hôtel de ville
     et le tribunal sont passés en `grid: "screen"` (une image par cran de zoom,
     1 px d'image = 1 px d'écran). Toute entrée ajoutée ici désormais est un
     retour en arrière, et doit dire pourquoi. */
};

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(12) !== 0x49484452) throw new Error("pas un PNG : " + file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
const pub = (url) => path.join(ROOT, "public", url.replace(/^\//, ""));
const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9 && Math.round(v) >= 1;

const T = C.TOWN_BITMAPS;
ok(T && typeof T === "object", "la table TOWN_BITMAPS existe", T ? Object.keys(T).join(", ") : "absente");

/* ─────────────────────────────────────────────────────────────────────────── */
title("1. tout bitmap passe par la table");
{
  const dir = path.join(ROOT, "components", "ferme");
  const calls = [];
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    /* L'argument se lit en ÉQUILIBRANT les parenthèses : un motif `[^)]*`
       coupait `C.townBitmapMip(SB, z).day` à sa première parenthèse fermante. */
    for (let at = src.indexOf("loadBitmap("); at >= 0; at = src.indexOf("loadBitmap(", at + 1)) {
      let i = at + "loadBitmap(".length, depth = 1;
      const start = i;
      while (i < src.length && depth > 0) { if (src[i] === "(") depth++; else if (src[i] === ")") depth--; i++; }
      const arg = src.slice(start, i - 1).trim();
      if (f === "bitmapAssets.js" && /^url$/.test(arg)) continue; // la définition elle-même
      calls.push({ f, arg });
    }
  }
  /* `want.day` / `mip.glow` : les deux appels de `screenBitmapPick` /
     `drawScreenExactBitmap` (FermeGame.js), dont l'URL sort de `townBitmapMip`. */
  const tableRef = /^(SB\.(day|glow)|C\.TOWN_BITMAPS\.\w+\.(day|glow)|want\.day|mip\.glow|C\.townBitmapMip\(SB, \w+\)\.(day|glow))$/;
  const grassTpl = "`/town/${variant}.png`";
  const stray = calls.filter(c => !tableRef.test(c.arg) && c.arg !== grassTpl);
  /* « Un banc qui compte des occurrences doit publier combien il en a LUES »
     (CLAUDE.md §10) : sans ce nombre, un motif qui ne matche rien passerait vert. */
  /* Le NOMBRE d'appels change avec le code (6 à la phase 0, 3 depuis que les
     monuments passent tous par `screenBitmapPick`/`drawScreenExactBitmap`) : on
     exige donc les appels NOMMÉS, ce qui prouve à la fois que le motif lit bien
     le source et que les trois chemins de chargement existent. */
  const args = calls.map(c => c.arg);
  ok(args.includes("want.day") && args.includes("mip.glow") && args.includes(grassTpl),
     "appels à loadBitmap lus, dont les trois attendus", `${calls.length} appel(s) : ${args.join(" · ")}`);
  ok(stray.length === 0, "aucun loadBitmap avec une URL écrite en dur",
     stray.length ? stray.map(c => `${c.f}: ${c.arg}`).join(" · ") : "0");
  const fg = fs.readFileSync(path.join(dir, "FermeGame.js"), "utf8");
  const hardGrow = [...fg.matchAll(/const GROW = [0-9.]+/g)].length;
  ok(hardGrow === 0, "aucun `const GROW = <nombre>` dans FermeGame.js", `${hardGrow} trouvé(s)`);
  /* Le lissage : un seul endroit a le droit d'écrire `true`, et c'est la
     table (`SB.smooth`). Un `= true` littéral est une exception invisible. */
  let smoothTrue = 0;
  for (const f of fs.readdirSync(dir).filter(n => n.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    smoothTrue += [...src.matchAll(/imageSmoothingEnabled\s*=\s*true/g)].length;
  }
  ok(smoothTrue === 0, "aucun `imageSmoothingEnabled = true` littéral", `${smoothTrue} trouvé(s)`);
}

/* ─────────────────────────────────────────────────────────────────────────── */
title("2. les PNG déclarés existent, à la taille annoncée");
{
  for (const [k, b] of Object.entries(T)) {
    if (b.grid === "screen") {
      /* Une image PAR CRAN, à la taille d'écran exacte que `townBitmapMip`
         assigne — la même fonction que le dessin et le script de fabrication. */
      for (const z of b.zooms) {
        const m = C.townBitmapMip(b, z);
        const f = pub(m.day), ok1 = fs.existsSync(f);
        const s1 = ok1 ? pngSize(f) : null;
        ok(ok1 && s1.w === m.w && s1.h === m.h, `${k} cran ${z} : ${m.day} à ${m.w}×${m.h} px d'écran`, s1 ? `PNG ${s1.w}×${s1.h}` : "absent");
        if (m.glow) {
          const g = pub(m.glow), gs = fs.existsSync(g) ? pngSize(g) : null;
          ok(gs && gs.w === m.w && gs.h === m.h, `${k} cran ${z} : calque de nuit à la même taille`, gs ? `${gs.w}×${gs.h}` : "absent");
        }
      }
      continue;
    }
    if (b.prefix) {
      const d = path.dirname(pub(b.prefix)), base = path.basename(b.prefix);
      const files = fs.readdirSync(d).filter(n => n.startsWith(base) && n.endsWith(".png"));
      ok(files.length > 0, `${k} : la famille existe`, `${files.length} PNG « ${base}* »`);
      continue;
    }
    const f = pub(b.day);
    const exists = fs.existsSync(f);
    ok(exists, `${k} : ${b.day} existe`);
    if (!exists) continue;
    const s = pngSize(f);
    ok(s.w === b.iw && s.h === b.ih, `${k} : taille native conforme à la table`, `PNG ${s.w}×${s.h}, table ${b.iw}×${b.ih}`);
    if (b.glow) {
      const g = pub(b.glow);
      const gs = fs.existsSync(g) ? pngSize(g) : null;
      ok(gs && gs.w === s.w && gs.h === s.h, `${k} : le calque de nuit a la taille du jour`, gs ? `${gs.w}×${gs.h}` : "absent");
    }
  }
}

/* ⚠️ AUCUN PNG ORPHELIN DANS `public/town/`. Le jour où un monument change de
   fabrication (phase 1 : une image de 384 px → cinq crans), l'ancienne image
   reste sur le disque, téléchargeable, et plus personne ne sait qu'elle ne sert
   à rien. Tout PNG du dossier doit être nommé par la table. */
{
  const refd = new Set();
  for (const b of Object.values(T)) {
    if (b.grid === "screen") for (const z of b.zooms) { const m = C.townBitmapMip(b, z); refd.add(m.day); if (m.glow) refd.add(m.glow); }
    else if (!b.prefix) { if (b.day) refd.add(b.day); if (b.glow) refd.add(b.glow); }
  }
  const dir = path.join(ROOT, "public", "town");
  const all = fs.readdirSync(dir).filter(n => n.endsWith(".png"));
  const orphans = all.filter(n => !refd.has("/town/" + n) && !Object.values(T).some(b => b.prefix && ("/town/" + n).startsWith(b.prefix)));
  ok(orphans.length === 0, "aucun PNG orphelin dans public/town/", `${all.length} PNG lus${orphans.length ? " — ORPHELINS : " + orphans.join(", ") : ""}`);
}

/* ─────────────────────────────────────────────────────────────────────────── */
title("3. un px source = un nombre entier de px d'art, sans lissage");
{
  const pending = [], conform = [];
  /* Les crans d'un bitmap `"screen"` doivent couvrir TOUS les zooms du jeu :
     un cran manquant = le fondu de secours (mis à l'échelle, lissé) pour de bon
     à ce zoom-là. La liste se lit dans le source, jamais recopiée ici. */
  const fg = fs.readFileSync(path.join(ROOT, "components", "ferme", "FermeGame.js"), "utf8");
  const zm = /const ZOOM_LEVELS = \[([0-9,\s]+)\]/.exec(fg);
  const gameZooms = zm ? zm[1].split(",").map(v => +v.trim()) : [];
  ok(gameZooms.length >= 3, "les crans de zoom du jeu sont lus dans FermeGame.js", gameZooms.join(", ") || "introuvables");
  ok(/function drawScreenExactBitmap\(/.test(fg) && /imageSmoothingEnabled = !exact/.test(fg),
     "le dessin « 1 px d'image = 1 px d'écran » existe, et ne lisse QUE hors cran exact");
  for (const [k, b] of Object.entries(T)) {
    if (b.grid === "screen") {
      const missing = gameZooms.filter(z => !b.zooms.includes(z));
      const good = missing.length === 0 && !b.smooth;
      if (EN_ATTENTE[k]) { ok(!good, `${k} est encore en attente — sinon, le retirer de EN_ATTENTE`); pending.push(`${k} (${EN_ATTENTE[k]})`); }
      else { ok(good, `${k} : une image par cran de zoom, sans lissage`, missing.length ? `crans manquants : ${missing.join(", ")}` : `crans ${b.zooms.join(", ")} (grille écran)`); if (good) conform.push(k + " (écran)"); }
      continue;
    }
    const ratio = b.disp == null ? 1 : (b.disp * b.grow) / b.iw;
    const good = isInt(ratio) && !b.smooth;
    const desc = `${ratio.toFixed(3)} px d'art par px source${b.smooth ? ", lissé" : ""}`;
    if (EN_ATTENTE[k]) {
      ok(!good, `${k} est encore en attente — sinon, le retirer de EN_ATTENTE`, desc);
      pending.push(`${k} (${EN_ATTENTE[k]})`);
    } else {
      ok(good, `${k} respecte la règle`, desc);
      if (good) conform.push(k);
    }
  }
  for (const k of Object.keys(EN_ATTENTE)) ok(k in T, `l'entrée en attente « ${k} » existe dans la table`);
  console.log(`\n  conformes : ${conform.join(", ") || "aucun"}`);
  console.log(`  EN ATTENTE (${pending.length}) : ${pending.join(" · ") || "aucun — la phase 1 est finie"}`);
}

/* ─────────────────────────────────────────────────────────────────────────── */
title("4. le faux canevas dessine les dégradés juste");
{
  const { ctx, px, width: W } = makeCanvas(21, 21);
  const at = (x, y) => Array.from(px.slice((y * W + x) * 4, (y * W + x) * 4 + 4));
  // Linéaire horizontal rouge → bleu sur [0,20] : milieu mi-chemin, bords purs, « pad » au-delà.
  const g = ctx.createLinearGradient(0, 0, 20, 0);
  g.addColorStop(0, "#ff0000"); g.addColorStop(1, "#0000ff");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 21, 1);
  const mid = at(10, 0), left = at(0, 0), right = at(20, 0);
  ok(Math.abs(mid[0] - mid[2]) <= 13 && mid[0] > 100 && mid[2] > 100, "linéaire : le milieu est mi-rouge mi-bleu", `rvb ${mid.slice(0, 3)}`);
  ok(left[0] > 240 && left[2] < 15, "linéaire : le départ est rouge", `rvb ${left.slice(0, 3)}`);
  ok(right[2] > 240 && right[0] < 15, "linéaire : le pixel au-delà de l'arrivée garde la dernière couleur", `rvb ${right.slice(0, 3)}`);
  // Radial concentrique opaque au centre → transparent au bord : l'alpha décroît.
  const r = ctx.createRadialGradient(10, 10, 0, 10, 10, 10);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = r; ctx.fillRect(0, 2, 21, 19);
  /* Le pixel (10,10) a son CENTRE en (10,5 ; 10,5), à 0,71 px du centre du
     cercle : α attendu 255 × (1 − 0,071) ≈ 237, pas 255. Un premier jet exigeait
     > 240 et accusait un dégradé juste — la leçon « un banc se falsifie », à
     l'envers : on calcule ce que la bonne réponse DOIT valoir avant de borner. */
  const c = at(10, 10)[3], half = at(15, 10)[3], out = at(20, 20)[3];
  ok(c >= 230 && half > 90 && half < 170 && out === 0, "radial : opaque au centre, moitié à mi-rayon, rien hors du cercle", `α ${c} · ${half} · ${out}`);
  // Le contrat du fichier : ce qui n'est pas implémenté JETTE.
  let threw = false;
  try { ctx.createPattern(null, "repeat"); } catch (e) { threw = true; }
  ok(threw, "createPattern jette toujours (non implémenté, dit tel quel)");
}

console.log(fails ? `\n${fails} CONTRÔLE(S) EN ÉCHEC\n` : "\nTout est bon.\n");
process.exit(fails === 0 ? 0 : 1);
