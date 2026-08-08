/* =============================================================================
   render-echelle.mjs — LES DÉCORS DE VALLEY TOWN, À CÔTÉ D'UN PERSONNAGE. (429)
   -----------------------------------------------------------------------------
   ⚠️⚠️ CE BANC RÉPOND À UN RETOUR PRÉCIS DE GUILLAUME (« attention à leur
   format, ils paraissent parfois très gros par rapport au joueur »), et il
   corrige un angle mort de tous les bancs de rendu précédents : ils dessinaient
   les meubles ENTRE EUX, sur leur vrai sol. C'est ce qu'il faut pour juger une
   palette et un ancrage — et ça ne dit RIEN d'une échelle. Un banc deux fois
   trop grand au milieu d'autres meubles deux fois trop grands a l'air juste.

   **Un décor ne se juge pas contre d'autres décors, il se juge contre le
   personnage qui s'en sert.** C'est le seul repère invariant du jeu : le
   fermier fait 23 pixels de haut peints, toujours, dans toutes les zones.

   Ce fichier met donc chaque décor à côté d'une fermière, sur la même ligne de
   sol, et imprime le rapport de hauteur avec le repère réel attendu. Les
   repères ne sont pas inventés : ce sont les proportions du monde physique,
   qu'un joueur reconnaît sans y penser et qui font qu'une ville « sonne » juste.

   Usage :  node tools/render-echelle.mjs
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

const CHAR = S.getChar("f", 1, false, false, false, false, false, false, null);
const CHAR_H = 23;          // hauteur PEINTE d'un personnage debout (mesurée, pas supposée)

/* ⚠️ LA HAIE N'EST PAS UN SPRITE. Elle est peinte à la main dans
   drawTownFrame, case par case. La recopier ici serait une duplication — mais
   l'alternative (ne pas la mesurer) reviendrait à laisser hors contrôle le
   décor le PLUS répandu de la ville, celui qui entoure les 27 parcelles. On la
   recopie donc, et on le dit : les six `fillRect` ci-dessous doivent rester
   identiques à ceux de drawTownFrame. */
function hedgeTile() {
  const v = makeCanvas(T, 24);
  const g = v.ctx, hy = 24;
  g.fillStyle = "rgba(20,34,16,0.28)"; g.fillRect(0, hy - 3, T, 3);
  g.fillStyle = "#2c5c2a"; g.fillRect(0, hy - 20, T, 18);
  g.fillStyle = "#3d7a36"; g.fillRect(0, hy - 20, T, 7);
  g.fillStyle = "#55a047"; g.fillRect(0, hy - 21, T, 3);
  return v;
}

function extent(im) {
  const px = im.__px || im.px;
  let top = 1e9, bot = -1, left = 1e9, right = -1;
  for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
    if (px[(y * im.width + x) * 4 + 3] > 8) {
      if (y < top) top = y; if (y > bot) bot = y;
      if (x < left) left = x; if (x > right) right = x;
    }
  }
  return { h: bot - top + 1, w: right - left + 1 };
}

/* ⚠️ LES REPÈRES SONT DES FAITS, PAS DES PRÉFÉRENCES. Chaque valeur est la
   hauteur réelle de l'objet rapportée à une personne de 1,70 m — c'est ce que
   l'œil vérifie sans y penser, et c'est pour ça qu'un décor faux « sonne »
   faux sans qu'on sache dire pourquoi. La fourchette est large (±35 %) : on
   cherche les erreurs d'un facteur deux, pas le centimètre. */
const CASES = [
  /* ⚠️ LE REPÈRE DU BANC A ÉTÉ CORRIGÉ À 0,75 APRÈS COUP, ET L'ERREUR ÉTAIT
     DANS LE REPÈRE, PAS DANS LE DESSIN. Physiquement, un dossier de banc fait
     0,85 m contre 1,70 m pour un adulte, soit 0,5. Mais ce banc-là est vu de
     TROIS QUARTS : son assise s'avance vers la caméra, et cette profondeur se
     dépense en pixels VERTICAUX comme n'importe quelle hauteur. Un objet plat
     (une tombe, un panneau) tient son ratio physique ; un objet qui a du volume
     vers l'avant paraît toujours plus haut. Corriger le banc pour satisfaire le
     chiffre l'aurait écrasé. */
  ["banc", S.plazaBench, 0.75, "dossier à hauteur de hanche, vu de trois quarts"],
  ["haie de jardin", hedgeTile(), 1.05, "on ne voit pas par-dessus, tout juste"],
  ["fontaine", S.plazaFountain, 1.60, "vasque à la taille, jet au-dessus de la tête"],
  ["lampadaire", S.plazaLamp, 2.20, "la lanterne est hors de portée"],
  ["puits", S.townWell, 1.30, "margelle basse, toit au-dessus de la tête"],
  ["tombe", S.townGrave, 0.75, "une stèle arrive à la poitrine"],
  ["jardinière", S.townPlanter, 0.55, "on s'y assoit presque"],
  ["caisse", S.townCrate, 0.65, "on la porte à deux mains"],
  ["étal", S.townStalls[0], 2.10, "on passe dessous sans se baisser"],
  ["kiosque", S.townKiosk, 3.20, "un pavillon où l'on tient debout"],
  ["panneau de rue", S.townStreetSign, 1.50, "on lit sans lever la tête"],
  ["statue", S.townStatue, 2.40, "socle plus figure"],
  ["maison", S.townHouses[0], 4.20, "deux niveaux plus toit"],
  ["église", S.church, 6.50, "le clocher domine tout"],
  ["mairie", S.townHall2, 5.60, "beffroi compris"],
  ["tribunal", S.courthouse, 6.00, "fronton néoclassique"],
  ["gare", S.station, 3.60, "un quai couvert"],
  ["Maison Garfield", S.townBoutique, 4.00, "une belle adresse, pas un monument"],
  ["salon", S.townSalon, 3.40, "un commerce de rue"],
];

console.log("\n=== zip 429 — l'échelle des décors de Valley Town ===\n");
console.log("Repère : un fermier debout fait 23 px peints.\n");
console.log("décor              px     ×perso   attendu   écart    lecture");
console.log("-".repeat(78));
const wrong = [];
for (const [name, im, want, why] of CASES) {
  if (!im) { console.log(`${name.padEnd(18)} SPRITE MANQUANT`); wrong.push(name); continue; }
  const e = extent(im);
  const ratio = e.h / CHAR_H;
  const err = ratio / want;
  const flag = (err > 1.35 || err < 0.65) ? " ⚠️" : "";
  if (flag) wrong.push(`${name} (×${ratio.toFixed(1)} au lieu de ×${want})`);
  console.log(`${name.padEnd(18)}${String(e.h).padStart(4)}${("×" + ratio.toFixed(2)).padStart(9)}${("×" + want.toFixed(2)).padStart(10)}${(err >= 1 ? "+" : "") + ((err - 1) * 100).toFixed(0).padStart(6)}%${flag}   ${why}`);
}
console.log("");
if (wrong.length) console.log(`⚠️  hors fourchette : ${wrong.join(" · ")}\n`);
else console.log("Toutes les échelles tiennent dans la fourchette attendue.\n");

/* La planche : chaque décor avec une fermière DEBOUT à côté, sur la même ligne
   de sol. ⚠️ La ligne de sol est tracée : sans elle, on ne voit pas qu'un objet
   flotte, et « flotter » est l'autre moitié du problème d'échelle. */
{
  const pad = 8, cellH = 200;
  const cells = CASES.filter(c2 => c2[1]);
  const widths = cells.map(c2 => Math.max(46, extent(c2[1]).w + 30));
  const total = widths.reduce((a, b) => a + b + pad, pad);
  const sh = makeCanvas(total, cellH + 26);
  sh.ctx.fillStyle = "rgba(92,140,86,1)"; sh.ctx.fillRect(0, 0, sh.width, sh.height);
  const ground = cellH;
  sh.ctx.fillStyle = "rgba(0,0,0,0.30)"; sh.ctx.fillRect(0, ground, sh.width, 1);
  let cx = pad;
  cells.forEach(([name, im], i) => {
    const w = widths[i];
    sh.ctx.drawImage(CHAR, 0, 0, 16, 24, cx, ground - 23, 16, 24);
    sh.ctx.drawImage(im, cx + 20, ground - im.height);
    cx += w + pad;
  });
  const up = scale(sh.px, sh.width, sh.height, 3);
  writePNG(path.join(OUT, "echelle-ville-429.png"), up.px, up.W, up.H);
}
console.log("Écrit : echelle-ville-429.png  (chaque décor à côté d'une fermière)\n");
