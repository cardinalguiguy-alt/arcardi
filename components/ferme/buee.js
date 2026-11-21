/* =============================================================================
   buee.js — LA BUÉE DU SOUFFLE PAR TEMPS FROID (2026-11-21).
   -----------------------------------------------------------------------------
   Un ajout de l'après-midi libre du 2026-11-21 (« be free, sois inventif »), dans la suite des personnages « soignés » : quand il fait
   froid, chacun — joueurs et habitants — souffle un petit nuage blanc, qui sort de la bouche, s'étire dans le sens du regard, monte un
   peu, part avec le vent et se défait. C'est l'hiver qu'on lit sur les gens, et pas seulement sur le sol.
   · LE FROID : `breathK(temp)` — rien au-dessus de 7 °C, plein à −1 °C et en dessous (la buée se voit dès que l'air est frais et
     humide ; on la garde discrète en demi-saison). La température est celle du lieu où l'on est (meteo.js § 9, lue une fois par
     seconde par l'horloge du HUD) : aucun message, rien ne circule (§3).
   · LE RYTHME : une expiration toutes les ~3,4 s au repos, ~2,2 s en marche ; chaque personnage a sa phase (un hachage de son
     identifiant) — une foule ne souffle pas en chœur. Le nuage vit 1,25 s.
   · LA FORME : au PIXEL FIN (un demi-pixel d'art, le pixel du trait simple), des aplats blancs, sans contour ni dégradé : un noyau
     plus dense et des bords qui s'effilochent — chaque souffle tire ses quelques pixels de bord d'un hachage (souffle, pixel), donc il
     ne grouille pas d'une image à l'autre et deux souffles ne se ressemblent pas.
   · LE SENS : de face, il part de côté à hauteur de bouche et monte le long de la tête (vers nous et vers le haut à la fois : à
     l'écran, il s'écarte) ; de dos, de derrière la tête, d'un côté ; de profil, devant la bouche. Le vent (0..1) le pousse vers la
     droite de l'écran, comme la fumée des cheminées (fumee.js).
   ⚠️ AUCUNE HORLOGE LUE ICI : l'appelant passe le temps (secondes, `performance.now()` de CETTE machine — seules des durées comptent).
   Désactivable : menu dev, « Ajouts de la nuit du 21 novembre » (`AJOUTS.breath`, FermeGame.js). Banc : `tools/verify-buee.mjs`.
   ========================================================================== */

export const BUEE = {
  T_NONE: 7,          // °C : au-dessus, aucune buée
  T_FULL: -1,         // °C : en dessous, la buée pleine
  PERIOD: [3.4, 2.2], // s entre deux expirations : au repos, en marche
  LIFE: 1.25,         // s : la vie d'un nuage
  ALPHA: 0.8,         // l'opacité du noyau, au plus froid
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function hash32(a, b) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
const u01 = (h) => (h >>> 8) / 16777216;
export function idSeed(id) {
  const s = String(id == null ? "" : id);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/* La force de la buée à `temp` °C (0..1). */
export function breathK(temp) {
  if (typeof temp !== "number" || !isFinite(temp)) return 0;
  return clamp01((BUEE.T_NONE - temp) / (BUEE.T_NONE - BUEE.T_FULL));
}

/* Le souffle en cours à `tSec` pour le personnage `seed` : null, ou { u (0..1, l'âge relatif), n (le numéro du souffle) }. La période
   suit l'allure ; la phase reste celle du personnage (passer du repos à la marche ne fait pas sauter un nuage au milieu de sa vie : le
   nuage en cours se lit sur la période du moment, et un changement d'allure peut au pire l'avancer d'une fraction). */
export function breathAt(tSec, seed, moving) {
  const P = moving ? BUEE.PERIOD[1] : BUEE.PERIOD[0];
  const t = tSec + u01(hash32(seed, 7)) * P;
  const n = Math.floor(t / P), age = t - n * P;
  // un souffle sur six, un peu plus court (on reprend son souffle autrement) : la régularité d'un métronome se voit
  const life = BUEE.LIFE * (u01(hash32(seed, n)) < 0.17 ? 0.7 : 1);
  if (age > life) return null;
  return { u: age / life, n };
}

/* Les pixels fins d'un nuage (en DEMI-pixels d'art, relatifs à son centre) à l'âge `u`, pour le souffle `n` de `seed` :
   [[dx, dy, dense]] — une forme PLEINE (un nuage, pas une moucheture : la première version, trouée au hasard, se lisait comme une tache
   sur le vêtement), au bord légèrement bosselé (fixe pour ce souffle), qui grandit, puis se défait par la fin (`u` > 0,7). */
export function puffCells(u, seed, n) {
  const out = [];
  const grow = u < 0.4 ? u / 0.4 : 1;
  const rx = 1.2 + grow * 2.3 + u * 0.8, ry = 0.9 + grow * 1.5 + u * 0.4;
  const thin = u < 0.7 ? 0 : (u - 0.7) / 0.3;           // il se défait : des trous, de plus en plus
  const R = Math.ceil(rx) + 1, Ry = Math.ceil(ry) + 1, hs = hash32(seed, n * 131 + 17);
  for (let dy = -Ry; dy <= Ry; dy++) for (let dx = -R; dx <= R; dx++) {
    const e = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    if (e > 1.2) continue;
    const h = u01(hash32(hs, (dx + 16) * 37 + (dy + 16)));
    if (e > 0.8 && h < 0.5) continue;                    // le bord bosselé
    if (h < thin * 0.85) continue;                       // la fin
    out.push([dx, dy, e < 0.42 && thin < 0.4]);
  }
  return out;
}

/* Où va le nuage : la bouche (`mx`, `my`, px d'art), le regard (`face` : "down" | "up" | "right" | "left"), l'âge `u`, le vent, le
   côté `side` (±1 : de face et de dos, un souffle part d'un côté de la tête, le suivant souvent de l'autre). Rend le centre, px d'art.
   De face, le souffle va vers nous ET monte : à l'écran, il reste à hauteur de bouche et s'écarte — c'est en s'écartant qu'il se
   détache sur le fond au lieu de tacher le vêtement. */
export function puffCenter(mx, my, face, u, wind, side = 1) {
  const go = 1.2 + u * 3.2, rise = u * 1.4, drift = (wind || 0) * u * 4;
  if (face === "down") return [mx + side * (1.2 + u * 3.6) + drift, my + 0.8 - u * 2.4];
  // de dos, il sort de derrière la tête : il naît au-delà de la silhouette (la tête fait ±5 px d'art), à hauteur de bouche, et monte
  if (face === "up") return [mx + side * (5.5 + u * 2.6) + drift, my - 0.5 - u * 2.6];
  if (face === "right") return [mx + go + drift, my - rise];
  return [mx - go + drift, my - rise];
}
export const sideOf = (seed, n) => (u01(hash32(seed + 1, n)) < 0.5 ? -1 : 1);

/* LE DESSIN : sur le contexte du monde (px d'art, la transformation du zoom déjà posée). `k` la force (breathK), `tSec` le temps.
   ⚠️ AU PIXEL D'ÉCRAN ENTIER : un demi-pixel d'art fait 1,5 px d'écran au cran 3, et le navigateur en lisse les bords (§4, « à échelle
   non entière ») — le nuage devenait flou. On pose donc des carrés d'écran d'un CÔTÉ ENTIER (`cell` = zoom / 2 arrondi), calés sur
   leur propre grille, la transformation remise à l'identité le temps du dessin (comme les feuilles des personnages, `drawCharHD`). */
export function drawBreath(ctx, { mx, my, face, tSec, seed, moving, k, wind }) {
  if (!(k > 0.01)) return;
  const b = breathAt(tSec, seed, moving);
  if (!b) return;
  const cells = puffCells(b.u, seed, b.n);
  if (!cells.length) return;
  const [cx, cy] = puffCenter(mx, my, face, b.u, wind, sideOf(seed, b.n));
  // l'opacité : elle monte vite, puis s'éteint avec la vie
  const a = BUEE.ALPHA * k * (b.u < 0.12 ? b.u / 0.12 : 1 - Math.pow((b.u - 0.12) / 0.88, 1.8));
  if (a <= 0.01) return;
  const M = ctx.getTransform ? ctx.getTransform() : null;
  const z = M ? M.a : 1, cell = Math.max(1, Math.round(z / 2));
  const sx0 = M ? Math.round((M.e + cx * z) / cell) * cell : cx, sy0 = M ? Math.round((M.f + cy * z) / cell) * cell : cy;
  ctx.save();
  if (M) ctx.setTransform(1, 0, 0, 1, 0, 0);
  const put = (dense) => { for (const [dx, dy, d] of cells) if (d === dense) ctx.fillRect(sx0 + dx * cell, sy0 + dy * cell, cell, cell); };
  ctx.fillStyle = "#e8eef5"; ctx.globalAlpha = a * 0.7; put(false);
  ctx.fillStyle = "#f6f9fc"; ctx.globalAlpha = a; put(true);
  ctx.restore();
}
