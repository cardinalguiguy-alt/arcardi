/* =============================================================================
   render-assise.mjs — LA POSE ASSISE, SUR SON BANC. (zip 428)
   -----------------------------------------------------------------------------
   ⚠️⚠️ CE BANC EXISTE PARCE QUE LA POSE PRÉCÉDENTE A SURVÉCU TROIS ZIPS SANS
   QUE PERSONNE NE LA REGARDE. Elle vivait dans la closure de drawCharacter,
   dans FermeGame.js : le seul moyen de la voir était de lancer le jeu, d'aller
   à Valley Town, d'attendre qu'un résident choisisse un banc, et d'être à
   portée. Autant dire jamais. On y a donc gardé un buste tronqué à mi-cuisse en
   croyant avoir une pose assise.
   Depuis le 428 la pose est dans `fermeArt.drawSeated`, et CE FICHIER APPELLE
   EXACTEMENT LA MÊME FONCTION que le jeu. Ce qu'on voit ici est ce que le
   joueur verra, au pixel près — c'est toute la différence avec un banc qui
   « refait à peu près » le dessin.

   ⚠️ ET ON LA JUGE SUR SON BANC, PAS SUR FOND UNI. Une pose assise n'est juste
   que RELATIVEMENT à l'assise : trois pixels trop haut et le personnage flotte,
   trois trop bas et il traverse la planche. Le banc est donc dessiné ici avec
   le même ancrage que drawTownFrame (sprite 32×32 centré sur la case, posé sur
   le bord bas), et l'assis avec le même décalage de 0,45 case vers le sud.

   ⚠️ La comparaison DEBOUT / ASSIS est côte à côte, et c'est le seul contrôle
   qui compte : une silhouette assise doit être nettement plus courte qu'une
   silhouette debout. Si les deux font la même hauteur, la pose est ratée même
   si chaque pixel est joli.

   Usage :  node tools/render-assise.mjs
   ========================================================================== */

import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, makeCanvas, writePNG, scale, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "tools", "out");

installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt"]);
const A = mods.fermeArt;
const C = mods.fermeConstants;
const S = A.buildSprites();
const T = 16;

// La dalle de la place, où sont la plupart des bancs (drawTownFrame).
const PAVE = [0xb3, 0xb2, 0xb8];

/* Une vignette = une case de banc plus ce qu'il faut autour. On y reproduit le
   MÊME calcul que le jeu :
     - le banc : sprite centré en x sur la case, bord bas à (by + 1) * T ;
     - l'assis : ancre à (by + 0.45) * T, donc py = by*T + 7 (arrondi) ;
     - debout  : ancre à la case du dessous, sprite complet de 24 px.
   Tout écart avec ces trois lignes rendrait la vignette décorative. */
function vignette(sheet, label, seated) {
  const W = 44, H = 52;
  const v = makeCanvas(W, H);
  v.ctx.fillStyle = `rgba(${PAVE[0]},${PAVE[1]},${PAVE[2]},1)`;
  v.ctx.fillRect(0, 0, W, H);
  const bx = W / 2, byPix = 34;          // le bord bas de la case du banc
  const bench = S.plazaBench;
  // L'ombre du mobilier, comme drawTownFrame.
  v.ctx.fillStyle = "rgba(20,26,16,0.22)";
  v.ctx.fillRect(bx - bench.width * 0.28, byPix - 4, bench.width * 0.56, 3);
  v.ctx.drawImage(bench, bx - bench.width / 2, byPix - bench.height);
  const px = Math.round(bx - 8);
  if (seated) {
    // py = (by + 0.45) * T avec (by + 1) * T = byPix  →  py = byPix - 0.55 * T
    const py = Math.round(byPix - 0.55 * T);
    A.drawSeated(v.ctx, sheet, 0, px, py);
  } else {
    // Debout, DEVANT le banc (une case plus au sud) : l'ancre est à byPix,
    // et le sprite complet monte de 8 px au-dessus, comme dans le jeu.
    v.ctx.fillStyle = "rgba(0,0,0,0.25)";
    v.ctx.fillRect(px + 2, byPix + 14, 12, 2);
    v.ctx.drawImage(sheet, 0, 0, 16, 24, px, byPix - 8, 16, 24);
  }
  return v;
}

/* Deux nombres pour juger sans regarder : la hauteur réellement peinte et la
   largeur maximale. ⚠️ ILS NE REMPLACENT PAS L'IMAGE, ils la complètent — le
   §8 dit que la statistique qui compte n'est pas la moyenne, et ici ce qui
   compte c'est de repérer une pose qui déborde de son cadre (le canevas
   DÉCOUPE en silence, c'est comme ça que le haut-de-forme est sorti décapité
   au 427). */
function extent(im) {
  let top = 1e9, bot = -1, left = 1e9, right = -1;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    const a = im.px[(y * im.width + x) * 4 + 3];
    if (a > 8) { if (y < top) top = y; if (y > bot) bot = y; if (x < left) left = x; if (x > right) right = x; }
  }
  return { h: bot - top + 1, w: right - left + 1, top, bot };
}

/* La pose seule, sans banc et sans fond : c'est la seule façon de MESURER sa
   hauteur, puisque sur le banc elle se confond avec l'assise. */
function poseOnly(sheet, seated) {
  const v = makeCanvas(16, 32);
  if (seated) A.drawSeated(v.ctx, sheet, 0, 0, 8);
  else v.ctx.drawImage(sheet, 0, 0, 16, 24, 0, 0, 16, 24);
  return v;
}

console.log("\n=== zip 428 — la pose assise → tools/out/ ===\n");

/* ⚠️ ON L'ÉPROUVE SUR TOUT CE QUI PEUT S'ASSEOIR, pas sur un personnage.
   Découper les jambes dans la feuille du personnage n'a d'intérêt que si ça
   marche pour la salopette, la combinaison d'apiculteur et les articles de la
   Maison Garfield — dont la teinte est CUITE dans la feuille. Si l'un d'eux
   sort faux, c'est la recette qui est fausse, pas ce cas-là. */
const CASES = [
  ["fermiere", S.getChar("f", 1, false, false, false, false, false, false, null)],
  ["fermier", S.getChar("m", 0, false, false, false, false, false, false, null)],
  ["salopette", S.getChar("m", 3, true, false, false, false, false, false, null)],
  ["casquette", S.getChar("f", 5, false, true, false, false, false, false, null)],
  ["apiculteur", S.getChar("m", 2, false, false, true, false, false, false, null)],
  ["fromager", S.getChar("f", 6, false, false, false, false, true, false, null)],
  ["sucrier", S.getChar("m", 7, false, false, false, false, false, true, null)],
  ["garde-robe", S.getChar("f", 1, false, false, false, false, false, false, "w3158")],
];

console.log("cas               debout   assis   écart   largeur assise");
console.log("-".repeat(60));
const suspects = [];
for (const [name, sh] of CASES) {
  const st = extent(poseOnly(sh, false)), si = extent(poseOnly(sh, true));
  const ratio = si.h / st.h;
  console.log(`${name.padEnd(18)}${String(st.h).padStart(5)}${String(si.h).padStart(8)}${(ratio * 100).toFixed(0).padStart(7)}%${String(si.w).padStart(12)}`);
  /* ⚠️⚠️ LA FOURCHETTE A ÉTÉ CORRIGÉE PAR LA MESURE, ET L'ERREUR MÉRITE D'ÊTRE
     ÉCRITE. Premier jet : « une silhouette assise fait 65 à 85 % de la debout »,
     par analogie avec un corps humain vu de face. Faux dans CETTE projection :
     assis sur un banc, les cuisses partent vers la caméra (donc ne comptent
     presque pas en hauteur) mais les MOLLETS restent verticaux et les pieds
     touchent toujours le sol. La seule hauteur réellement perdue est celle de
     l'assise, quatre pixels. Une pose juste fait donc 80 à 90 % — et une pose
     qui descendrait à 70 % serait un personnage enfoncé dans le banc.
     ⚠️ Le vrai contrôle du raccourci n'est pas ici mais dans l'image : ces
     bornes n'attrapent qu'un décalage grossier. */
  if (ratio > 0.92 || ratio < 0.78) suspects.push(`${name} (${(ratio * 100).toFixed(0)} %)`);
  // Et la pose ne doit jamais être plus large que le personnage : les mollets
  // sont RÉTRÉCIS, un débord voudrait dire que les tranches sont mal calées.
  if (si.w > st.w) suspects.push(`${name} déborde en largeur`);
}
if (suspects.length) console.log(`\n⚠️  suspects : ${suspects.join(", ")}`);
else console.log("\nToutes les poses assises tiennent dans les proportions attendues.");

/* La planche : pour chaque cas, DEBOUT à gauche, ASSIS à droite, sur le banc.
   ⚠️ Agrandie six fois. À l'échelle 1 on ne voit rien d'une pose de 18 px, et
   un banc de rendu qu'on ne peut pas lire ne sert à rien (leçon du 427). */
{
  const pad = 4, cellW = 44, cellH = 52;
  const cols = 4, rows = Math.ceil(CASES.length / cols);
  const sh = makeCanvas(cols * (cellW * 2 + pad * 2) + pad, rows * (cellH + pad + 8) + pad);
  sh.ctx.fillStyle = "rgba(60,60,66,1)"; sh.ctx.fillRect(0, 0, sh.width, sh.height);
  CASES.forEach(([name, sheet], i) => {
    const cx = pad + (i % cols) * (cellW * 2 + pad * 2);
    const cy = pad + Math.floor(i / cols) * (cellH + pad + 8);
    sh.ctx.drawImage(vignette(sheet, name, false), cx, cy);
    sh.ctx.drawImage(vignette(sheet, name, true), cx + cellW + pad, cy);
  });
  const up = scale(sh.px, sh.width, sh.height, 6);
  writePNG(path.join(OUT, "assise-428.png"), up.px, up.W, up.H);
}
console.log("\nÉcrit : assise-428.png  (debout | assis, sur le banc de la place)\n");
