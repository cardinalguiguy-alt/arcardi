/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-25 (phase 3 de la feuille de route graphique) — LA LUMIÈRE.
   ╚══════════════════════════════════════════════════════════════════════════
   Ce qui remplace le « voile de nuit » (`drawNightVeil`, 429) : un aplat
   `rgba(8,10,30)` jusqu'à 0,85, percé de trous en `destination-out` — des
   cercles de PLEIN JOUR, gris, lissés, qui traversaient les murs, et sous
   lequel les calques de nuit des monuments disparaissaient (dessinés AVANT le
   voile, donc éteints par lui).

   LE MODÈLE (décisions de Guillaume, 2026-09-25 : « reco partout ») :
   - UNE seule nuit pour la ferme ET la ville — sinon, en prenant le train, on
     passe d'une nuit à une autre ;
   - une nuit de LUNE, bleutée, où l'on lit encore les silhouettes : la scène
     est MULTIPLIÉE par une couleur de ciel qui dépend de l'heure (aube rose,
     midi neutre, heure dorée, nuit bleue), au lieu d'être recouverte ;
   - la lumière des lampes S'AJOUTE à ce ciel dans un tampon de lumière, en
     PALIERS calés sur le gros pixel du dessin (le tampon est à la résolution
     de l'art, pas de l'écran), avec un tramage d'un pixel entre deux paliers ;
   - les murs l'ARRÊTENT : un bâtiment porte une ombre, et une lampe derrière
     lui n'éclaire pas sa façade ;
   - les fenêtres s'allument selon l'HEURE (pure fonction du temps et de la
     case, comme les lanternes : rien ne circule sur le réseau, §3).

   ⚠️ CE FICHIER EST PUR, SAUF `makeLightRenderer` (qui reçoit sa fabrique de
   canevas). `tools/verify-lumiere.mjs` l'importe et joue la courbe du ciel,
   les horaires, les anneaux et les ombres — rien de tout ça ne vit dans la
   closure de la boucle de rendu (§4 de CLAUDE.md : une fonction qui y vit
   n'existe pour aucun banc).
   ══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants.mjs";

/* ── 1. LE CIEL ─────────────────────────────────────────────────────────────
   Un multiplicateur [r, g, b] (1 = la couleur peinte, telle quelle). Les
   instants-clés sont DÉRIVÉS des bornes de l'aube et du crépuscule
   (`DAWN_*_MIN`, `DUSK_*_MIN`, `DEEP_END_MIN`) : les déplacer déplace la
   teinte avec elles (§8 : un paramètre qui en double un autre diverge).
   ⚠️ La journée de jeu va de 6h00 à 26h00 (2h du matin, `DAY_*_MIN`) : une
   heure au-delà de 1440 est normale, c'est la nuit d'après minuit. */
export const SKY_DAY = [1, 1, 1];
export const SKY_NIGHT = [0.30, 0.35, 0.56];      // lune : on lit les silhouettes (décision 2 : « nuit de lune »)
const SKY_DAWN = [0.62, 0.52, 0.66];              // 6h00 : bleu qui rosit
const SKY_MORNING = [1.0, 0.88, 0.80];            // 6h30 : première lumière, chaude
/* ⚠️ Vu en jeu le 2026-09-25 : (0,98 / 0,72 / 0,58) au coucher et (0,68 / 0,52 /
   0,64) à 20h se lisaient comme un FILTRE orange puis violet posé sur l'écran.
   Adoucis d'un tiers : on sent l'heure, on ne regarde pas à travers un verre. */
const SKY_GOLD = [1.0, 0.93, 0.80];               // l'heure dorée
const SKY_SUNSET = [1.0, 0.80, 0.66];             // le soleil se couche
const SKY_DUSK = [0.72, 0.60, 0.70];              // 20h : mauve
const SKY_BLUE_HOUR = [0.42, 0.42, 0.64];         // l'heure bleue
export function skyKeys() {
  const DS = C.DAWN_START_MIN, DE = C.DAWN_END_MIN;
  const KS = C.DUSK_START_MIN, KM = C.DUSK_MID_MIN, KD = C.DEEP_END_MIN;
  return [
    [0, SKY_NIGHT], [DS, SKY_NIGHT],
    [(DS + DE) / 2, SKY_DAWN], [DE, SKY_MORNING], [DE + 90, SKY_DAY],
    [KS, SKY_DAY], [KS + 0.35 * (KM - KS), SKY_GOLD], [KS + 0.7 * (KM - KS), SKY_SUNSET],
    [KM, SKY_DUSK], [(KM + KD) / 2, SKY_BLUE_HOUR], [KD, SKY_NIGHT], [48 * 60, SKY_NIGHT],
  ];
}
const KEYS = skyKeys();
export function skyAt(tmin) {
  const t = Math.max(0, Math.min(KEYS[KEYS.length - 1][0], tmin));
  for (let i = 1; i < KEYS.length; i++) {
    const [t1, c1] = KEYS[i];
    if (t <= t1) {
      const [t0, c0] = KEYS[i - 1], k = t1 > t0 ? (t - t0) / (t1 - t0) : 1;
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return SKY_NIGHT.slice();
}
export const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/* ⚠️ L'OBSCURITÉ SE DÉDUIT DU CIEL, ELLE NE SE RÈGLE PLUS À CÔTÉ. L'ancienne
   `nightAlpha()` (0 à 0,85) décide encore QUAND les lanternes et les vitraux
   s'allument ; elle était une seconde courbe de la nuit, écrite à la main à
   côté de celle qu'on voit. Elle en est maintenant une LECTURE : 0 en plein
   jour, 0,85 (l'ancien plafond, pour que ses seuils gardent leur sens) sous le
   ciel de lune. */
export const NIGHT_MAX = 0.85;
export function nightFromSky(sky) {
  const k = (1 - lum(sky)) / (1 - lum(SKY_NIGHT));
  return NIGHT_MAX * Math.max(0, Math.min(1, k));
}

/* ── 1 bis. L'ORAGE ET SES ÉCLAIRS ─────────────────────────────────────────
   L'orage n'est plus un voile gris posé par-dessus : il ASSOMBRIT le ciel,
   donc les lampes, elles, restent vives. L'éclair est une pure fonction du
   temps réel et du jour — deux joueurs voient le même à l'horloge près, sans
   un message (§3).
   ⚠️ 2026-09-26 (météo) : l'assombrissement est un DEGRÉ (`dark`, 0..1, lu dans
   `meteo.js`) et la fréquence des éclairs une COTE par seconde (`odds`) : un
   orage qui monte assombrit peu à peu et tonne de plus en plus souvent. */
export const STORM_SKY = [0.70, 0.73, 0.80];
const FLASH_SLOT_MS = 1000;       // une chance d'éclair par seconde…
const FLASH_ODDS = 1 / 26;        // … soit un éclair toutes les ~26 s en moyenne
const FLASH_LEN_MS = 720;
function hash32(a, b) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be5ab, 0x85ebca77)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}
/* La forme d'un éclair : un premier coup franc, un creux, une réplique plus
   faible, puis la décroissance. `dt` en ms depuis le coup. */
export function flashShape(dt) {
  if (dt < 0 || dt >= FLASH_LEN_MS) return 0;
  if (dt < 70) return 1;
  if (dt < 120) return 0.18;
  if (dt < 200) return 0.72;
  return 0.72 * Math.pow(1 - (dt - 200) / (FLASH_LEN_MS - 200), 2);
}
/* L'instant du coup dans la seconde `s`, ou -1 s'il n'y en a pas. ⚠️ Le
   tirage (`h % 1000`) ne dépend pas de la cote : quand la cote monte, les
   coups déjà tirés restent à leur place et d'autres s'y ajoutent — un éclair
   ne « saute » pas d'une seconde à l'autre pendant que l'orage monte. */
function strikeIn(s, day, odds) {
  const h = hash32(s, day * 7919 + 17);
  if ((h % 1000) / 1000 >= odds) return -1;
  return s * FLASH_SLOT_MS + (hash32(h, 3) % 600);
}
export function flashAt(nowMs, day, odds = FLASH_ODDS) {
  if (!(odds > 0)) return 0;
  const slot = Math.floor(nowMs / FLASH_SLOT_MS);
  let best = 0;
  for (let s = slot - 1; s <= slot; s++) {
    const at = strikeIn(s, day, odds);
    if (at >= 0) best = Math.max(best, flashShape(nowMs - at));
  }
  return best;
}
/* Les coups tombés dans ]fromMs, toMs] — le MÊME tirage que `flashAt`, pour
   que chaque tonnerre réponde à un éclair qu'on a vu (FermeGame.js). */
export function strikesIn(fromMs, toMs, day, odds) {
  const out = [];
  if (!(odds > 0) || !(toMs > fromMs)) return out;
  const s0 = Math.floor(fromMs / FLASH_SLOT_MS) - 1, s1 = Math.floor(toMs / FLASH_SLOT_MS);
  for (let s = s0; s <= s1 && s - s0 < 3600; s++) { // borné à une heure : le jeu ne regarde que deux secondes en arrière
    const at = strikeIn(s, day, odds);
    if (at > fromMs && at <= toMs) out.push({ at, u: (hash32(s, day * 131 + 7) % 1000) / 1000 });
  }
  return out;
}
/* Le ciel d'une image : l'heure, l'orage, l'éclair. `dark` : 0..1 (un
   booléen vaut 0 ou 1, pour les anciens appelants et les bancs). */
export function skyLight(tmin, dark, flash) {
  const s = skyAt(tmin);
  const d = dark === true ? 1 : Math.max(0, Math.min(1, +dark || 0));
  if (d > 0) for (let k = 0; k < 3; k++) s[k] *= 1 - (1 - STORM_SKY[k]) * d;
  if (flash > 0) {
    const F = [0.92, 0.95, 1.0];
    for (let k = 0; k < 3; k++) if (F[k] > s[k]) s[k] += (F[k] - s[k]) * flash * 0.85;
  }
  return s;
}

/* ── 2. QUI S'ALLUME, ET QUAND ──────────────────────────────────────────────
   ⚠️ LE PRÉDICAT D'UNE LANTERNE EST ÉCRIT UNE FOIS : son DESSIN (verre allumé
   ou éteint) et sa LUMIÈRE (le halo dans le tampon) le lisent tous les deux.
   Avant ce fichier, le dessin l'appelait et la liste des halos poussait TOUS
   les lampadaires dès la tombée du jour : un lampadaire au verre éteint
   éclairait déjà la rue (§4, « une condition recopiée à côté du prédicat qui
   la nomme a déjà divergé »). Seuil tiré du HACHAGE de la case (phase 2) :
   elles s'allument échelonnées au crépuscule et s'éteignent dans l'ordre
   inverse à l'aube. */
export function lampLit(x, y, nightA) {
  return nightA > 0.02 + 0.03 * (((x * 7 + y * 13) >>> 0) % 5);
}
/* Une fenêtre de maison (décision 4 : « selon l'heure seulement »). Elle
   s'allume au crépuscule, APRÈS les lanternes, et s'éteint entre 22h00 et
   1h30 selon la maison et la pièce ; une sur trois se rallume au petit matin,
   tant qu'il fait sombre. ⚠️ Un propriétaire qui DORT a ses fenêtres noires :
   le drapeau `sleeping` voyage déjà dans le paquet de position (les « Zzz »
   de la ville le lisent), donc ça ne coûte aucun champ. */
export function windowLit(house, win, tmin, nightA, asleep) {
  if (asleep || nightA <= 0) return false;
  const h = hash32(house * 31 + 7, win * 131 + 3);
  if (nightA <= 0.06 + 0.035 * (h % 6)) return false;      // pas encore assez sombre pour cette pièce
  const offAt = 22 * 60 + (h >>> 3) % 211;                  // 22h00 → 1h30 (au-delà de 1440 : après minuit)
  if (tmin < 12 * 60) return (h >>> 11) % 3 === 0;          // le petit matin d'une nouvelle journée : les lève-tôt
  return tmin < offAt;
}

/* ── 2 bis. LES FENÊTRES DES MONUMENTS (phase 6c, 2026-09-26) ─────────────
   Guillaume : « l'éclairage des fenêtres des grands bâtiments doit être plus
   travaillé, plus réaliste, plus beau » — puis « un peu tout ça » (fenêtres
   inégales, profondeur, vie selon l'heure, vitraux colorés).
   ⚠️ UNE SEULE DESCRIPTION DES BAIES, LUE PAR DEUX PROGRAMMES : le script qui
   CUIT le calque de nuit (`tools/build-monument-glow.mjs` : teinte, profondeur,
   silhouettes — ce qui ne change pas) et le jeu qui ÉTEINT, à l'heure, les baies
   dont la pièce est vide (`monumentWindowLevel` + `monumentWindowPath`). Avant,
   les régions vivaient dans le script seul, et « une fenêtre sur deux éteinte »
   y était CUITE : la même pièce restait vide toutes les nuits de la partie.
   Coordonnées en px du CRAN 3 (`W3`×`H3`), où elles ont été relevées sur la
   peinture ; chaque cran les rapporte par proportion. `room` : la pièce (les
   baies d'une même pièce s'allument ensemble), `kind` : la recette du script,
   `maxL` : le plafond de luminance du verre (vitres sombres). */
export const MONUMENT_WINDOWS = {
  church: {
    W3: 634, H3: 604,
    wins: [
      { k: "disc", cx: 318, cy: 311, r: 47, kind: "stained", room: "nave" },                 // la rosace
      { k: "rect", x0: 268, y0: 343, x1: 368, y1: 408, kind: "stained", room: "nave" },      // l'arcature sous la rosace
      { k: "arch", x0: 191, x1: 229, y0: 324, y1: 428, kind: "stained", room: "nave" },      // grande lancette ouest
      { k: "arch", x0: 407, x1: 445, y0: 324, y1: 428, kind: "stained", room: "nave" },      // grande lancette est
      { k: "arch", x0: 196, x1: 228, y0: 476, y1: 558, kind: "stained", room: "aisle" },     // lancette basse ouest (bas-côté)
      { k: "arch", x0: 409, x1: 441, y0: 476, y1: 558, kind: "stained", room: "aisle" },     // lancette basse est
    ],
  },
  townhall: {
    W3: 634, H3: 571,
    wins: [
      // Les baies relevées sur leur cadre de fer (colonnes sombres mesurées à
      // la rangée 420) : la peinture n'est pas symétrique au pixel.
      { k: "arch", x0: 108, x1: 160, y0: 336, y1: 461, kind: "curtain", room: "office-w" },  // grande baie ouest (état civil)
      { k: "arch", x0: 466, x1: 518, y0: 336, y1: 461, kind: "curtain", room: "office-e" },  // grande baie est (bureau du maire)
      { k: "arch", x0: 28, x1: 50, y0: 346, y1: 461, kind: "curtain", room: "stair-w" },     // baie étroite ouest
      { k: "arch", x0: 577, x1: 601, y0: 346, y1: 461, kind: "curtain", room: "stair-e" },   // baie étroite est
      { k: "rect", x0: 280, y0: 98, x1: 356, y1: 142, kind: "pane", maxL: 120, room: "always" }, // le lanternon
      { k: "disc", cx: 241, cy: 424, r: 13, kind: "lantern", room: "always" },               // lanterne murale ouest
      { k: "disc", cx: 388, cy: 424, r: 13, kind: "lantern", room: "always" },               // lanterne murale est
      { k: "disc", cx: 316, cy: 240, r: 24, kind: "clock", room: "always" },                 // le cadran
    ],
  },
  courthouse: {
    W3: 845, H3: 783,
    wins: [
      // Les ailes, deux étages, deux fenêtres par aile : huit bureaux, chacun
      // sa soirée (plus de quinconce cuit — voir l'en-tête).
      ...[[79, 111], [167, 199], [652, 680], [740, 768]].flatMap(([x0, x1], i) => [
        { k: "rect", x0, y0: 342, x1, y1: 406, kind: "pane", maxL: 118, room: "wing" + i + "u" },
        { k: "rect", x0, y0: 467, x1, y1: 536, kind: "pane", maxL: 118, room: "wing" + i + "d" },
      ]),
      // Les cinq baies du portique — la salle des pas perdus.
      ...[[252, 283], [332, 363], [410, 436], [487, 515], [567, 592]].map(([x0, x1]) =>
        ({ k: "rect", x0, y0: 347, x1, y1: 405, kind: "pane", maxL: 104, room: "hall" })),
      // Les deux fenêtres cintrées du soubassement : la loge du gardien à
      // l'ouest, le greffe à l'est.
      { k: "arch", x0: 79, x1: 109, y0: 600, y1: 676, kind: "pane", maxL: 112, room: "lodge" },
      { k: "arch", x0: 739, x1: 769, y0: 600, y1: 676, kind: "pane", maxL: 112, room: "clerk" },
      // L'imposte au-dessus de la porte (un demi-disque : les claveaux sont de la pierre).
      { k: "arch", x0: 403, x1: 445, y0: 453, y1: 477, kind: "pane", maxL: 96, room: "hall" },
      // Les deux lampadaires peints en haut de la volée.
      { k: "disc", cx: 202, cy: 488, r: 14, kind: "lantern", room: "always" },
      { k: "disc", cx: 645, cy: 488, r: 14, kind: "lantern", room: "always" },
    ],
  },
};
/* Un point (px du cran 3) est-il dans la baie ? Une `arch` est un rectangle
   coiffé d'un demi-cercle, pour ne pas allumer la pierre des écoinçons. */
export function monumentWindowHas(w, x, y) {
  if (w.k === "rect") return x >= w.x0 && x < w.x1 && y >= w.y0 && y < w.y1;
  if (w.k === "arch") {
    if (x < w.x0 || x >= w.x1 || y >= w.y1) return false;
    const R = (w.x1 - w.x0) / 2, cy = w.y0 + R;
    return y >= cy || Math.hypot(x - (w.x0 + R), y - cy) <= R;
  }
  return Math.hypot(x - w.cx, y - w.cy) <= w.r;
}
/* Le tracé de la baie dans un contexte 2D, à l'échelle `s` (px du cran → px
   du canevas visé), agrandi de `pad` px pour couvrir le bord tramé. */
export function monumentWindowPath(ctx, w, sx, sy, pad = 1) {
  ctx.beginPath();
  if (w.k === "disc") { ctx.ellipse(w.cx * sx, w.cy * sy, w.r * sx + pad, w.r * sy + pad, 0, 0, Math.PI * 2); return; }
  const x0 = w.x0 * sx - pad, x1 = w.x1 * sx + pad, y1 = w.y1 * sy + pad;
  if (w.k === "rect") { ctx.rect(x0, w.y0 * sy - pad, x1 - x0, y1 - (w.y0 * sy - pad)); return; }
  const R = (x1 - x0) / 2, cy = w.y0 * sy - pad + R;
  ctx.moveTo(x0, y1); ctx.lineTo(x0, cy);
  ctx.ellipse(x0 + R, cy, R, R * sy / sx, 0, Math.PI, 0);
  ctx.lineTo(x1, y1); ctx.closePath();
}
/* ⚠️ LA VIE DES PIÈCES, UNE PURE FONCTION DE L'HEURE ET DU JOUR (le patron du
   jour de marché et des élections) : les deux joueurs voient la même mairie
   s'éteindre à la même minute, sans un message. `tmin` : l'heure du jeu
   (`E.gameTimeMin`, de 360 à 1560 — au-delà de 1440, après minuit), `day` : le
   numéro du jour, qui change la soirée de chaque bureau d'une nuit à l'autre.
   Rend la force de la baie (0 éteinte, 1 pleine) ; le crépuscule lui-même
   (`nightA`) est appliqué par l'appelant, comme avant. */
const MIN_ = (h, m = 0) => h * 60 + m;
export function monumentWindowLevel(key, w, tmin, day) {
  const room = w.room;
  if (room === "always") return 1;
  const h = hash32(day * 97 + key.length * 13, room.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const early = tmin < MIN_(12);                      // le petit matin, avant qu'il fasse jour
  if (key === "church") {
    /* Vêpres de 18h à 21h, un office du soir tiré certains jours jusqu'à 23h ;
       ensuite la lampe du sanctuaire et quelques cierges : la nef reste à
       peine lumineuse toute la nuit. Les bas-côtés s'éteignent après l'office.
       Messe du matin à 6h30. */
    const vig = (hash32(day * 131 + 5, 71) % 5) === 0 ? MIN_(23) : MIN_(21, 15);
    if (early) return tmin >= MIN_(6, 30) ? 1 : (room === "nave" ? 0.3 : 0);
    if (tmin < vig) return 1;
    return room === "nave" ? 0.3 : 0.12;
  }
  if (key === "townhall") {
    if (early) return (room === "stair-w" && tmin >= MIN_(6, 15)) ? 1 : 0;  // le concierge ouvre
    /* Les bureaux ferment à 19h ; chacun tire son heure supplémentaire du soir
       (0 à 3h), et un soir sur quatre le bureau du maire veille jusqu'à 23h30. */
    if (room === "office-e" && (h % 4) === 0) return tmin < MIN_(23, 30) ? 1 : 0;
    if (room.startsWith("office")) return tmin < MIN_(19) + (h >>> 4) % 181 ? 1 : 0;
    return tmin < MIN_(21, 30) + (h >>> 6) % 60 ? 0.85 : 0;             // les escaliers, veilleuse plus pâle
  }
  // Le tribunal.
  if (room === "hall") return tmin < MIN_(21) ? 1 : (tmin < MIN_(24) ? 0.28 : 0);   // la veilleuse des pas perdus
  if (room === "lodge") return early ? (tmin >= MIN_(6) ? 1 : 0) : (tmin < MIN_(23, 30) ? 1 : 0);
  if (room === "clerk") return !early && tmin < MIN_(19, 30) + (h >>> 5) % 90 ? 0.9 : 0;
  // Les huit bureaux des ailes : trois sur cinq occupés ce soir, chacun jusqu'à sa propre heure.
  if (early || (h % 5) >= 3) return 0;
  return tmin < MIN_(19) + (h >>> 7) % 271 ? 1 : 0;
}
/* Le vacillement des cierges de l'église (appliqué à tout le calque : une
   nef éclairée à la bougie bouge d'un seul souffle). Somme de sinus lents,
   ±7 % : visible sans clignoter. `t` en ms réelles. */
export function candleFlicker(t) {
  const s = t / 1000;
  return 1 + 0.035 * Math.sin(s * 2.1) + 0.022 * Math.sin(s * 5.3 + 1.7) + 0.013 * Math.sin(s * 11.9 + 0.4);
}

/* ── 3. UNE SOURCE : DES ANNEAUX EN PALIERS ─────────────────────────────────
   Le profil continu, puis cinq paliers ; le haut de chaque palier est tramé
   en damier sur un pixel de large (`LIGHT_DITHER`), la manière dont le pixel
   art fond une lumière sans dégradé. Les anneaux se calculent UNE fois par
   rayon et par couleur, en données (pas de dégradé radial : le faux canevas
   des bancs et le jeu voient le même pixel). */
export const LIGHT_BANDS = 5;
export const LIGHT_DITHER = 0.22;
export function lightLevel(d) {
  if (d >= 1) return 0;
  return Math.pow(1 - d * d, 1.5);
}
/* Le palier d'un pixel (0..LIGHT_BANDS), à la distance `d` (0..1) et à la
   parité de damier `odd`. */
export function lightBand(d, odd) {
  const v = lightLevel(d) * LIGHT_BANDS;
  let k = Math.floor(v);
  if (odd && v - k > 1 - LIGHT_DITHER) k++;
  return Math.min(LIGHT_BANDS, k);
}
/* Couleurs AJOUTÉES au ciel (le tampon est additif puis multiplié). Presque
   pas de bleu, et nettement moins de vert que de rouge : sous un ciel de lune
   (0,30 / 0,35 / 0,56), le centre d'une lampe vaut alors ≈ (1,00 / 0,85 / 0,64),
   une lumière orangée. ⚠️ PREMIER JET, vu en jeu le 2026-09-25 : (1 / 0,72 /
   0,24) faisait saturer le vert AVEC le rouge — le pavé de la place sortait
   jaune-vert délavé, une lumière de sodium plutôt qu'une flamme. */
export const LIGHT_COLORS = {
  lamp: [0.72, 0.50, 0.08],
  torch: [0.78, 0.44, 0.04],
  window: [0.62, 0.42, 0.10],
  door: [0.60, 0.42, 0.12],
  head: [1.0, 0.95, 0.78],
  // 2026-09-26 (phase 5) — la luciole : un jaune-VERT froid (≈ 560 nm), pas une flamme.
  firefly: [0.50, 0.78, 0.12],
};
/* Les pixels RGBA d'un anneau de rayon `R` (px d'art) : couleur pleine, alpha
   = palier. Taille (2R+1)². Pur — le banc le mesure. */
export function ringPixels(R, rgb) {
  const S = 2 * R + 1, px = new Uint8ClampedArray(S * S * 4);
  const cr = Math.round(rgb[0] * 255), cg = Math.round(rgb[1] * 255), cb = Math.round(rgb[2] * 255);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const d = Math.hypot(x - R, y - R) / (R + 0.5);
    const b = lightBand(d, (x + y) & 1);
    if (!b) continue;
    const o = (y * S + x) * 4;
    px[o] = cr; px[o + 1] = cg; px[o + 2] = cb; px[o + 3] = Math.round(255 * b / LIGHT_BANDS);
  }
  return px;
}

/* ── 4. LES OMBRES DES BÂTIMENTS ────────────────────────────────────────────
   Un bâtiment est son EMPRISE au sol (un rectangle, en px monde déjà
   remontés de son altitude). Chaque bord qui tourne le dos à la lampe projette
   un quadrilatère d'ombre jusqu'à `far` — leur union est l'ombre portée, et
   elle n'inclut jamais l'emprise elle-même.
   ⚠️ L'EMPRISE N'EST ÉCLAIRÉE QUE PAR UNE LAMPE DEVANT ELLE (`litFromFront`) :
   la façade qu'on voit regarde le SUD. Une lampe derrière ou à côté éclaire
   un mur qu'on ne voit pas — le rendu efface alors la SILHOUETTE du sprite
   dans la lumière de cette lampe (sinon un réverbère planté derrière une
   maison allumait son toit, qui est dessiné par-dessus la rue de derrière). */
export function litFromFront(ly, rect) { return ly >= rect.y1 - 0.5; }
export function shadowQuads(lx, ly, rect, far) {
  const { x0, y0, x1, y1 } = rect;
  const edges = [];
  if (ly > y0) edges.push([x0, y0, x1, y0]);   // le bord nord tourne le dos à une lampe plus au sud
  if (ly < y1) edges.push([x1, y1, x0, y1]);   // le bord sud, à une lampe plus au nord
  if (lx > x0) edges.push([x0, y1, x0, y0]);   // le bord ouest, à une lampe plus à l'est
  if (lx < x1) edges.push([x1, y0, x1, y1]);   // le bord est, à une lampe plus à l'ouest
  const out = [];
  for (const [ax, ay, bx, by] of edges) {
    const pa = project(lx, ly, ax, ay, far), pb = project(lx, ly, bx, by, far);
    out.push([[ax, ay], [bx, by], pb, pa]);
  }
  return out;
}
function project(lx, ly, x, y, far) {
  const dx = x - lx, dy = y - ly, n = Math.hypot(dx, dy) || 1;
  return [x + dx / n * far, y + dy / n * far];
}
/* Un point est-il dans l'ombre de ce bâtiment ? (banc) */
export function pointInShadow(lx, ly, rect, px, py) {
  if (px > rect.x0 && px < rect.x1 && py > rect.y0 && py < rect.y1) return false;
  // Le segment lampe → point coupe-t-il l'emprise ?
  let t0 = 0, t1 = 1;
  const dx = px - lx, dy = py - ly;
  for (const [p, q] of [[-dx, lx - rect.x0], [dx, rect.x1 - lx], [-dy, ly - rect.y0], [dy, rect.y1 - ly]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return t0 < t1;
}

/* ── 5. LE RENDU ────────────────────────────────────────────────────────────
   `view` : la transformation de la caméra, `écran = zm·monde − R`.
   `frame` : ce que la scène a déclaré pendant sa passe de dessin —
     sky      [r,g,b]                     le ciel de l'image
     night    0..1                        l'obscurité (force du halo des lampes)
     lights   [{ x, y, r, c, k }]         sources au sol : px monde, rayon en cases
     heads    [{ x, y, r, k }]            verres allumés : px monde, rayon en px d'art
     occluders[{ x0, y0, x1, y1, mask }]  emprises en px monde ; `mask` =
                                          { img, x, y, w, h } en px monde
     glows    [{ img, x, y, w, h, k }]    calques de nuit en px monde, ajoutés
                                          au TAMPON (maisons : même grille)
     screenGlows [{ img, x, y, w, h, k }] calques de nuit en px ÉCRAN (monuments
                                          à 1:1, phase 1), ajoutés APRÈS
   ⚠️ Trois canevas pour tout le jeu (tampon, brouillon d'une source, halo),
   plus un par anneau en cache — jamais un par source ni par image (§10 : sur
   iPad, c'est le NOMBRE de canevas qui tue, pas leur taille). */
/* Les robes des insectes des lampadaires, du plus pâle au plus sombre
   (`lampMotes`, faune.js, tire l'index). */
const MOTE_COLORS = ["#fff0c4", "#f2dc9a", "#d6b67a", "#a8845a", "#6e5238", "#443022", "#241910"];
export function makeLightRenderer(makeCanvas) {
  const rings = new Map();
  let L = null, Lg = null, S = null, Sg = null;
  const ring = (R, key) => {
    const id = R + "|" + key;
    let c = rings.get(id);
    if (!c) {
      const sz = 2 * R + 1;
      c = makeCanvas(sz, sz);
      const g = c.getContext("2d"), im = g.createImageData(sz, sz);
      im.data.set(ringPixels(R, LIGHT_COLORS[key] || LIGHT_COLORS.lamp));
      g.putImageData(im, 0, 0);
      rings.set(id, c);
    }
    return c;
  };
  function draw(ctx, view, frame) {
    const sky = frame.sky;
    if (sky[0] >= 0.999 && sky[1] >= 0.999 && sky[2] >= 0.999) return;   // plein jour : rien à faire
    const zm = view.zm;
    const ox = Math.floor(view.Rx / zm), oy = Math.floor(view.Ry / zm);
    const Lw = Math.ceil(view.W / zm) + 2, Lh = Math.ceil(view.H / zm) + 2;
    if (!L) { L = makeCanvas(Lw, Lh); Lg = L.getContext("2d"); }
    if (L.width < Lw || L.height < Lh) { L.width = Math.max(L.width, Lw); L.height = Math.max(L.height, Lh); }
    Lg.setTransform(1, 0, 0, 1, 0, 0);
    Lg.globalAlpha = 1;
    Lg.globalCompositeOperation = "copy";
    Lg.fillStyle = `rgb(${Math.round(sky[0] * 255)},${Math.round(sky[1] * 255)},${Math.round(sky[2] * 255)})`;
    Lg.fillRect(0, 0, Lw, Lh);
    Lg.globalCompositeOperation = "lighter";
    Lg.imageSmoothingEnabled = false;
    const occ = frame.occluders || [];
    /* ⚠️ UNE LAMPE NE SE VOIT PAS AU SOLEIL COUCHANT. Allumée dès le début du
       crépuscule (`lampLit`), elle ajoutait sa pleine lumière à un ciel déjà
       rouge : le rouge saturait, seul le vert montait, et la flaque tournait au
       VERT CITRON sous le ciel orange (vu en jeu le 2026-09-25). Sa force suit
       donc l'obscurité, pleine à partir des deux tiers de la nuit. */
    const dusk = Math.max(0, Math.min(1, (frame.night == null ? 1 : frame.night) / 0.65));
    for (const lt of frame.lights || []) {
      const R = Math.max(2, Math.round(lt.r * C.TILE));
      const lx = Math.round(lt.x) - ox, ly = Math.round(lt.y) - oy;
      if (lx + R < 0 || ly + R < 0 || lx - R > Lw || ly - R > Lh) continue;
      const rg = ring(R, lt.c || "lamp");
      const near = occ.filter((o) => o.x1 > lt.x - R && o.x0 < lt.x + R && o.y1 > lt.y - R && o.y0 < lt.y + R);
      Lg.globalAlpha = Math.max(0, Math.min(1, (lt.k == null ? 1 : lt.k) * dusk));
      if (!near.length) { Lg.drawImage(rg, lx - R, ly - R); continue; }
      // Brouillon : l'anneau, moins les ombres et les silhouettes, puis ajouté.
      const sz = 2 * R + 1;
      if (!S) { S = makeCanvas(sz, sz); Sg = S.getContext("2d"); }
      if (S.width < sz || S.height < sz) { S.width = Math.max(S.width, sz); S.height = Math.max(S.height, sz); }
      Sg.setTransform(1, 0, 0, 1, 0, 0);
      Sg.globalCompositeOperation = "copy";
      Sg.imageSmoothingEnabled = false;
      Sg.drawImage(rg, 0, 0);
      Sg.globalCompositeOperation = "destination-out";
      Sg.fillStyle = "#000";
      const bx = Math.round(lt.x) - R, by = Math.round(lt.y) - R;   // origine du brouillon, en px monde
      for (const o of near) {
        for (const q of shadowQuads(lt.x, lt.y, o, 3 * R)) {
          Sg.beginPath();
          Sg.moveTo(q[0][0] - bx, q[0][1] - by);
          for (let k = 1; k < 4; k++) Sg.lineTo(q[k][0] - bx, q[k][1] - by);
          Sg.closePath(); Sg.fill();
        }
        if (o.mask && !litFromFront(lt.y, o)) Sg.drawImage(o.mask.img, o.mask.x - bx, o.mask.y - by, o.mask.w, o.mask.h);
      }
      Lg.drawImage(S, 0, 0, sz, sz, lx - R, ly - R, sz, sz);
    }
    for (const gl of frame.glows || []) {
      Lg.globalAlpha = Math.max(0, Math.min(1, gl.k));
      if (Lg.globalAlpha > 0.01) Lg.drawImage(gl.img, gl.x - ox, gl.y - oy, gl.w, gl.h);
    }
    for (const hd of frame.heads || []) {
      Lg.globalAlpha = Math.max(0, Math.min(1, hd.k == null ? 1 : hd.k));
      const R = Math.max(1, Math.round(hd.r));
      Lg.drawImage(ring(R, "head"), Math.round(hd.x) - ox - R, Math.round(hd.y) - oy - R);
    }
    Lg.globalAlpha = 1;
    Lg.globalCompositeOperation = "source-over";
    // Le tampon, agrandi au plus proche voisin et calé sur la grille de l'art,
    // MULTIPLIE la scène.
    const dx = ox * zm - view.Rx, dy = oy * zm - view.Ry;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(L, 0, 0, Lw, Lh, dx, dy, Lw * zm, Lh * zm);
    // Les calques de nuit des monuments (1 px d'image = 1 px d'écran) : ajoutés
    // APRÈS, à la force qui rend à leurs vitres la couleur peinte.
    ctx.globalCompositeOperation = "lighter";
    const lift = 1 - lum(sky);
    for (const gl of frame.screenGlows || []) {
      ctx.globalAlpha = Math.max(0, Math.min(1, gl.k * lift));
      if (ctx.globalAlpha > 0.01) ctx.drawImage(gl.img, gl.x, gl.y, gl.w, gl.h);
    }
    // Le halo des verres, sur la grille de l'art : c'est ce qui fait qu'une
    // lampe BRILLE au lieu d'être seulement moins sombre que la rue.
    const nk = Math.max(0, Math.min(1, frame.night == null ? 1 : frame.night));
    if (nk > 0.02) for (const hd of frame.heads || []) {
      const R = Math.max(4, Math.round(hd.r * 2.6));
      ctx.globalAlpha = 0.34 * nk * (hd.k == null ? 1 : hd.k);
      const hx = Math.round(hd.x) - R, hy = Math.round(hd.y) - R;
      ctx.drawImage(ring(R, "lamp"), 0, 0, 2 * R + 1, 2 * R + 1, hx * zm - view.Rx, hy * zm - view.Ry, (2 * R + 1) * zm, (2 * R + 1) * zm);
    }
    /* 2026-09-26 (phase 5) — LES LUCIOLES : un point vif sur la grille de l'art
       et un petit halo en paliers, AJOUTÉS après le ciel (sinon la nuit les
       éteindrait comme le reste). `k` porte l'éclair : elles ne brillent pas en
       continu (décision de Guillaume : « un petit halo qui clignote légèrement »). */
    if (nk > 0.02) for (const sp of frame.sparks || []) {
      const k = Math.max(0, Math.min(1, sp.k)) * nk;
      if (k < 0.02) continue;
      /* 2026-09-26 — les insectes des lampadaires (`lampMotes`, faune.js) : un
         pixel d'art et, quand il file, sa traînée d'un pixel. Pas de halo : ils
         ne brillent pas, ils ACCROCHENT la lumière de la lampe. */
      if (sp.mote) {
        /* ⚠️ DEUX MODES SELON LA ROBE (2026-09-26, nuit) : un insecte brun-noir
           AJOUTÉ à la scène (`lighter`) n'ajoute presque rien — il serait
           invisible ; il se peint donc par-dessus (`source-over`), en silhouette
           sur le halo, plein (k porte déjà la distance au verre). Les pâles
           gardent l'additif : ils ACCROCHENT la lumière, et peints par-dessus à
           demi-opacité ils ternissaient (vu en jeu). */
        const X = Math.round(sp.x), Y = Math.round(sp.y), X2 = Math.round(sp.x2), Y2 = Math.round(sp.y2);
        const ci = sp.c | 0, dark = ci >= 4;
        if (dark) ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = MOTE_COLORS[ci] || MOTE_COLORS[0];
        const a = dark ? Math.min(1, 1.3 * k) : 0.85 * k;
        if (X2 !== X || Y2 !== Y) { ctx.globalAlpha = 0.4 * a; ctx.fillRect(X2 * zm - view.Rx, Y2 * zm - view.Ry, zm, zm); }
        ctx.globalAlpha = a;
        ctx.fillRect(X * zm - view.Rx, Y * zm - view.Ry, zm, zm);
        if (dark) ctx.globalCompositeOperation = "lighter";
        continue;
      }
      const R = sp.refl ? 1 : 2;
      const hx = Math.round(sp.x) - R, hy = Math.round(sp.y) - R;
      ctx.globalAlpha = 0.55 * k;
      ctx.drawImage(ring(R, "firefly"), 0, 0, 2 * R + 1, 2 * R + 1, hx * zm - view.Rx, hy * zm - view.Ry, (2 * R + 1) * zm, (2 * R + 1) * zm);
      ctx.globalAlpha = (sp.refl ? 0.6 : 1) * k;
      ctx.fillStyle = sp.refl ? "#b6d86a" : "#eaff8a";
      ctx.fillRect(Math.round(sp.x) * zm - view.Rx, Math.round(sp.y) * zm - view.Ry, zm, zm);
    }
    ctx.restore();
  }
  return { draw };
}
