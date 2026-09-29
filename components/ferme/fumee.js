/* ╔══════════════════════════════════════════════════════════════════════════
   ║ PHASE 12c (2026-09-29) — LES CHEMINÉES QUI FUMENT.
   ╚══════════════════════════════════════════════════════════════════════════
   Valley Town avait des cheminées peintes sur cinq de ses modèles de maisons (S1,
   S2, S3, N1, N2) et aucune n'avait jamais rien rejeté : un toit d'hiver sans
   fumée dit « personne n'habite ici », alors que ses fenêtres s'allument le soir.

   CE FICHIER EST PUR (il ne dessine rien à l'écran) — `tools/verify-jour.mjs` le
   joue. Deux fonctions, et rien d'autre :
   · `chimneyLevel` : le feu de CETTE maison, à CETTE heure, sous CETTE saison — une
     pure fonction du temps et de la maison (§3 : rien ne circule, deux joueurs
     voient la même cheminée fumer) ;
   · `smokePuffs` : les bouffées d'un tuyau à l'instant `t`, SANS ÉTAT — chaque
     bouffée est calculée depuis son heure de naissance (un entier, le rang de la
     bouffée), jamais avancée image par image. Une fumée qu'on simule se fige
     quand l'onglet est masqué et repart en avalanche à son retour ; une fumée
     qu'on LIT dans l'horloge est toujours à sa place, et coûte cinq bouffées par
     tuyau.

   ⚠️ CE QUI FUME, ET POURQUOI : une maison HABITÉE seulement (comme ses fenêtres :
   une maison à vendre est froide) ; l'hiver toute la journée, l'automne matin et
   soir, le printemps le soir chez une maison sur cinq, l'été presque jamais —
   sauf un soir de pluie, où quelques-uns rallument (`chill`, le temps qu'il fait
   pousse tout le monde vers le poêle). Le feu tombe la nuit (il n'y a plus que des
   braises après minuit) et remonte à l'aube. Chaque maison a son seuil : le poêle
   qui tire bien fume plus tôt et plus tard que celui qui tire mal, et une rue ne
   fume jamais d'un seul bloc. ========================================================================== */

const hash32 = (a, b) => {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be5ab, 0x85ebca77)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; h ^= h >>> 15;
  return h >>> 0;
};
const u01 = (a, b) => hash32(a, b) / 4294967296;

/* ── 1. LE FEU ─────────────────────────────────────────────────────────────
   `SEASON_FIRE` : l'envie de feu de la saison (0..1). `dayPart(tmin)` : la part du
   jour (le poêle du matin, la journée qui retombe, la longue soirée, les braises).
   `tmin` : minutes de la journée de jeu (6 h = 360 → 2 h = 1560). */
export const SEASON_FIRE = { winter: 1, autumn: 0.72, spring: 0.34, summer: 0.07 };
export function dayPart(tmin) {
  const h = tmin / 60;
  if (h < 6) return 0.3;
  if (h < 9.5) return 1;                                    // le poêle du matin
  if (h < 11) return 1 - 0.55 * (h - 9.5) / 1.5;            // il retombe
  if (h < 16) return 0.45;                                  // la journée : un feu d'entretien
  if (h < 17.5) return 0.45 + 0.55 * (h - 16) / 1.5;        // on le relance avant la nuit
  if (h < 23) return 1;                                     // la soirée
  return Math.max(0.12, 1 - 0.88 * (h - 23) / 3);           // il meurt : des braises
}
/* Le feu (0..1) de la maison `hi` (son rang, stable) : 0 = rien, 1 = plein tuyau.
   `asleep` : le propriétaire dort, le feu est bas. `chill` (0..0.3) : le temps qu'il
   fait — pluie, neige, ciel noir — qui remet du monde devant son poêle. */
export function chimneyLevel(hi, tmin, season, asleep, chill = 0) {
  const base = SEASON_FIRE[season] != null ? SEASON_FIRE[season] : 0.4;
  const lv = base * dayPart(tmin) * (asleep ? 0.75 : 1) + Math.max(0, Math.min(0.3, chill));
  const thr = 0.1 + 0.55 * u01(hi * 37 + 5, 611);            // le poêle qui tire bien fume avant les autres
  const x = (lv - thr) / 0.22;
  return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
}
/* Le temps qu'il fait, en `chill` : de quoi allumer un feu un soir d'été. */
export const chillOf = (W) => Math.min(0.3, 0.3 * W.rain + 0.2 * W.snow + 0.12 * W.dark);

/* ── 2. LES BOUFFÉES ───────────────────────────────────────────────────────
   Une bouffée naît à l'heure `n · P + jitter` (P la période, qui suit le feu : une
   bouffée toutes les 1,9 s à peine allumé, toutes les 0,45 s à plein tuyau), monte
   en s'accélérant à peine, glisse au vent et ondule, gonfle de 1 à 4 px, pâlit.
   Elle vit `SMOKE_LIFE` secondes. `key` : la cheminée (un entier : sa maison, son
   tuyau) — deux tuyaux d'un même toit ne respirent pas ensemble.
   `windK` : 0..1 (le vent de `meteo.js`) ; `out` reçoit { dx, dy, r, a } — des px
   depuis la bouche du tuyau, dy vers le HAUT, a en 0..1. */
export const SMOKE_LIFE = 4.4;
export function smokePuffs(key, level, tSec, windK, out) {
  out.length = 0;
  if (!(level > 0.02)) return out;
  const P = 1.9 - 1.45 * Math.min(1, level);
  const n1 = Math.floor(tSec / P), n0 = Math.floor((tSec - SMOKE_LIFE) / P) - 1;
  for (let n = n1; n >= n0; n--) {
    const h = hash32(key * 131 + n, 907);
    const born = n * P + ((h & 1023) / 1024) * P * 0.5;
    const age = tSec - born;
    if (age < 0 || age >= SMOKE_LIFE) continue;
    const ph = ((h >>> 10) & 1023) / 1024 * 6.283;
    const dx = (0.25 + windK * 1.3) * 7 * age + Math.sin(age * 1.35 + ph) * (0.5 + age * 0.55);
    const dy = 8.5 * age + 0.55 * age * age;
    const life = age / SMOKE_LIFE;
    const a = 0.72 * Math.min(1, age / 0.45) * Math.pow(1 - life, 1.5) * Math.min(1, 0.35 + level * 0.9);
    out.push({ dx, dy, r: 1 + 3.2 * Math.min(1, age / 3.2), a });
  }
  return out;
}
