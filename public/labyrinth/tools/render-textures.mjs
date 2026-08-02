/* =============================================================================
   render-textures.mjs — ÉCRIRE TOUTES LES TEXTURES EN PNG, POUR LES REGARDER.
   -----------------------------------------------------------------------------
   L'outil réclamé quatre zips de suite et jamais écrit. Il rend, dans
   tools/out/ :

     * chaque texture à sa taille réelle ;
     * chaque texture CARRELÉE 3×3 — c'est le seul moyen de voir la couture et
       la répétition, et la répétition est le défaut n°1 des textures peintes
       par code ;
     * la planche de contact, tout côte à côte.

   Usage :  node tools/render-textures.mjs
            node tools/render-textures.mjs mur         (une seule)
   ========================================================================== */

import path from "path";
import { load, ROOT } from "./lib-play.mjs";
import { surface, writePNG, scale, tile, stats, seam } from "./lib-raster.mjs";

const OUT = path.join(ROOT, "tools", "out");
const { CFG, Paint } = load(["js/config.js", "js/paint.js"]);

const only = process.argv[2];

/* Chaque entrée : nom, taille, fonction, et si la texture est CARRELÉE dans le
   jeu (auquel cas on écrit aussi la planche 3×3 et on mesure la couture). */
const JOBS = [
  { n: "mur-a", w: CFG.TEX_WALL, h: CFG.TEX_WALL, rep: true, f: (c, W, H) => Paint.wall(c, CFG, W, H, 1) },
  { n: "mur-b", w: CFG.TEX_WALL, h: CFG.TEX_WALL, rep: true, f: (c, W, H) => Paint.wall(c, CFG, W, H, 7) },
  { n: "mur-relief", w: CFG.TEX_WALL, h: CFG.TEX_WALL, rep: true, f: (c, W, H) => Paint.wallBump(c, CFG, W, H, 1) },
  { n: "sol", w: CFG.TEX_FLOOR, h: CFG.TEX_FLOOR, rep: true, f: (c, W, H) => Paint.floor(c, CFG, W, H, 3) },
  { n: "sol-relief", w: CFG.TEX_FLOOR, h: CFG.TEX_FLOOR, rep: true, f: (c, W, H) => Paint.floorBump(c, CFG, W, H, 3) },
  { n: "ciel", w: 1024, h: 256, f: (c, W, H) => Paint.sky(c, CFG, W, H) },
  { n: "lac", w: 128, h: 128, rep: true, f: (c, W, H) => Paint.lake(c, CFG, W, H) },
  { n: "bois", w: 32, h: 128, rep: true, f: (c, W, H) => Paint.wood(c, CFG, W, H) },
  { n: "stele", w: 96, h: 192, f: (c, W, H) => Paint.rune(c, CFG, W, H) },
  { n: "carte", w: 192, h: 144, f: (c, W, H) => Paint.mapSheet(c, CFG, W, H) },
  { n: "flamme", w: 32, h: 48, f: (c, W, H) => Paint.flame(c, CFG, W, H, 0) },
  { n: "craie-fleche", w: 64, h: 64, f: (c, W, H) => Paint.chalk(c, CFG, W, H, 0) },
  { n: "craie-croix", w: 64, h: 64, f: (c, W, H) => Paint.chalk(c, CFG, W, H, 1) },
];

console.log("\n=== textures du labyrinthe → tools/out/ ===\n");
console.log("nom            taille     moyenne  écart   niveaux  couture x/y");
console.log("-".repeat(70));

let worstSeam = 0;
for (const j of JOBS) {
  if (only && !j.n.includes(only)) continue;
  const s = surface(j.w, j.h);
  j.f(s.ctx, j.w, j.h);

  const st = stats(s.px, j.w, j.h);
  const sm = j.rep ? seam(s.px, j.w, j.h) : null;
  if (sm) worstSeam = Math.max(worstSeam, sm.x, sm.y);

  // 1× pour l'aspect réel, ×N pour regarder le pixel de près.
  const k = Math.max(1, Math.round(384 / Math.max(j.w, j.h)));
  const big = scale(s.px, j.w, j.h, k);
  writePNG(path.join(OUT, `tex-${j.n}.png`), big.px, big.W, big.H);
  if (j.rep) {
    const t = tile(s.px, j.w, j.h, 3, 3);
    writePNG(path.join(OUT, `tile-${j.n}.png`), t.px, t.W, t.H);
  }

  console.log(
    j.n.padEnd(14) +
    `${j.w}×${j.h}`.padEnd(11) +
    st.mean.toFixed(1).padStart(6) +
    st.sd.toFixed(1).padStart(8) +
    String(st.distinct).padStart(8) +
    (sm ? `   ${sm.x.toFixed(1)} / ${sm.y.toFixed(1)}` : "     —"));
}

console.log("-".repeat(70));
console.log(`
LIRE CE TABLEAU :
  écart   — l'écart-type de luminance. Sous 10, la texture est PLATE : à
            l'écran elle donnera un aplat, et aucune lumière ne la rattrapera.
            Une maçonnerie éclairée aux torches se tient entre 16 et 34.
  niveaux — combien de niveaux de gris distincts occupent plus de 0,04 % de la
            surface. Sous 20, c'est du poster ; au-dessus de 60, il y a du
            grain, donc de la matière.
  couture — écart moyen entre les bords opposés. Au-dessus de ~14 on VOIT la
            grille quand la texture est répétée. Pire ici : ${worstSeam.toFixed(1)}.

Les PNG sont dans tools/out/. tile-*.png montre la texture RÉPÉTÉE 3×3 :
c'est là qu'on voit ce qu'on ne peut pas voir sur une tuile seule — une tache
mémorable qui revient tous les six mètres à l'écran.
`);
