/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-26 — LA MÉTÉO (Valley Town ET la ferme ; un seul ciel, deux averses depuis le 2026-09-29 : § 3 bis).
   ╚══════════════════════════════════════════════════════════════════════════
   Ce qui remplace `E.isStormyDay(day)` (un jour sur sept, orage et pluie à
   pleine force de 6 h à 2 h, sans montée) — demande de Guillaume après la
   phase 5 : « plus de VARIÉTÉ d'intempéries — une pluie qui ne tombe pas
   violente d'emblée (ni systématiquement), un orage qui MONTE, des orages
   SECS, plus de pluie en automne qu'en été ; l'hiver, des ÉPISODES de neige
   à plusieurs intensités et tailles de flocons ; parfois de la grêle en
   automne et en hiver ; et au menu dev, COMMANDER la météo du jour ».

   LE MODÈLE (validé par Guillaume, « reco partout ») :
   - ⚠️ UNE PURE FONCTION DU NUMÉRO DE JOUR, DE LA SAISON ET DE L'HEURE DE JEU,
     comme les élections et le jour de marché : les deux joueurs voient la même
     averse à la seconde près, sans un message (§3 de CLAUDE.md). Seul le
     FORÇAGE du menu dev circule, dans le `p.state` qui part déjà (voir
     `applyForcedSky`, FermeGame.js).
   - Chaque jour reçoit 0 à 2 ÉPISODES (averse, pluie, orage, orage sec, grêle,
     neige faible/modérée/forte, ciel couvert), avec une heure de début, une
     montée, un palier et une descente.
   - Un épisode ne donne pas UN nombre mais des CANAUX (`rain`, `snow`, `hail`,
     `dark`, `bolts`, `near`, `wind`, `flake`), et chaque canal a SA fenêtre
     dans la montée : c'est ce qui fait qu'un orage MONTE — le ciel se couvre
     d'abord, les premiers éclairs sont lointains (`near` bas : éclair pâle,
     tonnerre tardif et sourd), la pluie arrive ensuite et les éclairs se
     rapprochent ; au départ, la pluie cesse avant que le ciel se dégage.
   - Ce fichier ne dessine rien et n'importe rien du jeu hormis les
     constantes : `tools/verify-meteo.mjs` le joue sur des milliers de jours.

   ⚠️⚠️ CE QUE LA FAUNE DOIT EN LIRE, ET COMMENT (faune.js) : une décision de
   créneau se prend à l'heure DU CRÉNEAU (`weatherAt` sur l'heure du créneau),
   jamais sur l'heure courante — sinon, quand l'orage monte, les cibles des
   créneaux PASSÉS changeraient et les bêtes sauteraient. C'est aussi pourquoi
   le forçage commence à SON heure (`at`) au lieu de réécrire la journée
   entière : il ne change rien de ce qui s'est déjà passé.
   ══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants";

/* Les genres de temps. `dev` : l'ordre des boutons du menu développeur.
   2026-10-05 : + `windy` (le coup de vent de la fin d'automne) et `giboulee` (l'averse
   brève sous le soleil de la fin d'hiver) — § 0 bis. */
export const WX_KINDS = ["clear", "overcast", "windy", "shower", "giboulee", "rain", "storm", "dryStorm", "hail", "snowLight", "snow", "snowHeavy"];

/* Les canaux, tous dans 0..1.
   rain / snow / hail : l'intensité de chaque précipitation ;
   dark  : l'assombrissement du ciel (1 = le ciel d'orage, `STORM_SKY`) ;
   bolts : la fréquence des éclairs (1 = un toutes les ~9 s) ;
   near  : la proximité de l'orage (0 = éclair pâle à l'horizon, tonnerre
           tardif et sourd ; 1 = au-dessus de la ville) ;
   wind  : l'inclinaison de la pluie, de la grêle, la dérive des flocons ;
   flake : la taille des flocons (0 = poudre fine, 1 = gros flocons mouillés). */
export const CHANNELS = ["rain", "snow", "hail", "dark", "bolts", "near", "wind", "flake"];
const ZERO = () => ({ rain: 0, snow: 0, hail: 0, dark: 0, bolts: 0, near: 0, wind: 0, flake: 0 });

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 0 bis. 2026-10-05 — LA FIN DE SAISON : L'HIVER QUI S'ADOUCIT, L'AUTOMNE QUI
   ║ ANNONCE L'HIVER.
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : « la météo doit être plus douce sur les derniers jours de l'hiver et
   préfigurer l'arrivée du printemps », précisé : « moins de neige, surtout du soleil,
   un peu de pluie, dans la même journée ; des bourgeons discrets sur les arbres » ;
   et « pareil pour la fin de l'automne où les feuilles tombent » — tranché avec lui :
   elle annonce l'hiver (plus froid, coups de vent, moins de grosses pluies tièdes),
   avec « une petite gelée légère au petit matin qui fond vite en fin de matinée », et
   « en tout cas pas de chutes de neige ».
   LA SAISON D'UN JOUR DEVIENT UNE ÉTIQUETTE : "winter" (le cœur de la saison, comme
   avant) ou "winter~7" (sa fin, au 7e cran sur 12). Elle traverse TOUT ce qui lisait
   la clé — les tirages, leurs caches, le manteau de neige, le sol mouillé, le froid du
   lac — sans changer une signature : un cache par (jour, saison) devient un cache par
   (jour, étiquette), et le manteau de la fin d'hiver intègre exactement les giboulées
   qu'on voit tomber (une neige qui fondrait sous une autre météo que la visible est le
   défaut qu'on évite ici).
   ⚠️⚠️ HORS DE LA FIN DE SAISON, RIEN NE BOUGE D'UN BIT : l'étiquette EST la clé, et
   chaque lecture de table passe par `seasonBase` / `seasonMix`, qui rendent la valeur
   d'avant telle quelle (pas un lerp à 0). Le banc le tient (`verify-meteo` § 10,
   l'empreinte des tirages d'avant).
   ⚠️ L'AVANCÉE EST QUANTIFIÉE (12 crans sur la fin de saison, ~6 h réelles chacun) et
   lue au DÉBUT du jour de jeu, comme la saison elle-même (`E.seasonTagAt`) : deux
   joueurs dont les horloges diffèrent d'une seconde lisent la même étiquette, donc le
   même tirage — sauf à la seconde exacte d'un changement de cran, comme la bascule de
   saison l'a toujours été.
   ⚠️ LA SEMAINE DES SAISONS COMMENCE LE LUNDI 0 h UTC (`C.SEASON_EPOCH`) : un vendredi
   soir tombe vers 68 % de la saison, un dimanche soir vers 97 %. La fin de saison part
   de `LATE_FROM` et monte en douceur (smoothstep) : un vendredi soir n'en a qu'un
   soupçon, un samedi soir la moitié, le dimanche presque tout. */
export const SEASON_ORDER = ["spring", "summer", "autumn", "winter"];   // l'ordre de `C.SEASONS`
export const nextSeason = (k) => SEASON_ORDER[(SEASON_ORDER.indexOf(k) + 1) % 4];
export const LATE_SEASONS = ["winter", "autumn"];
export const LATE_FROM = 0.55;
export const LATE_STEPS = 12;
const LATE_STEP = (1 - LATE_FROM) / LATE_STEPS;
/* La part de « fin de saison » (0..1) à l'avancée `p` (0..1), pour les deux saisons qui en ont une. */
export function lateWeight(key, p) {
  if (!LATE_SEASONS.includes(key)) return 0;
  const t = (p - LATE_FROM) / (1 - LATE_FROM);
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}
/* L'étiquette d'une saison à l'avancée `p`. */
export function seasonTag(key, p) {
  if (!LATE_SEASONS.includes(key) || !(p >= LATE_FROM)) return key;
  return key + "~" + Math.min(LATE_STEPS, 1 + Math.floor((p - LATE_FROM) / LATE_STEP));
}
/* Ce que dit une étiquette : la saison, l'avancée au MILIEU de son cran (null hors fin
   de saison), la part de fin de saison. Mis en mémo (le manteau la lit à chaque pas). */
const tagMemo = new Map();
function tagInfo(tag) {
  let t = tagMemo.get(tag);
  if (t) return t;
  const i = typeof tag === "string" ? tag.indexOf("~") : -1;
  if (i < 0) t = { base: tag, p: null, w: 0 };
  else {
    const base = tag.slice(0, i), k = Math.max(1, Math.min(LATE_STEPS, parseInt(tag.slice(i + 1), 10) || 1));
    const p = LATE_FROM + (k - 0.5) * LATE_STEP;
    t = { base, p, w: lateWeight(base, p) };
  }
  if (tagMemo.size > 256) tagMemo.clear();
  tagMemo.set(tag, t);
  return t;
}
export const seasonBase = (tag) => tagInfo(tag).base;
export const tagProgress = (tag) => tagInfo(tag).p;
export const seasonLate = (tag) => tagInfo(tag).w;
/* Une table par saison, lue à l'étiquette : la valeur de la saison, glissée vers celle
   de la suivante par la fin de saison. ⚠️ Hors fin de saison, la valeur EXACTE de la
   table : c'est ce qui garde les bancs d'avant au bit près. */
export function seasonMix(table, tag, dflt) {
  const t = tagInfo(tag), v0 = table[t.base] != null ? table[t.base] : dflt;
  if (!t.w) return v0;
  const n = table[nextSeason(t.base)], v1 = n != null ? n : dflt;
  return v0 + (v1 - v0) * t.w;
}
/* La même lecture, vers une CIBLE PROPRE à la fin de la saison (`lateTable[base]`)
   plutôt que vers la saison suivante — absente, on retombe sur `seasonMix`.
   ⚠️ Pourquoi elle existe (mesuré, `verify-meteo` § 12) : l'air doux du
   PRINTEMPS (1,4 cm/h, jour et nuit) appliqué en plein à la fin de l'hiver ne laissait
   plus un centimètre de neige, même à l'ombre, dès le samedi matin, et le lac ne
   gelait plus jamais — « moins de neige » était devenu « plus de neige ». */
export function seasonMixTo(table, lateTable, tag, dflt) {
  const t = tagInfo(tag);
  if (!t.w || !lateTable || lateTable[t.base] == null) return seasonMix(table, tag, dflt);
  const v0 = table[t.base] != null ? table[t.base] : dflt;
  return v0 + (lateTable[t.base] - v0) * t.w;
}
/* Le lever et le coucher (heures) d'une étiquette : la table de la saison, et en fin de
   saison l'interpolation du ciel (`C.sunHoursOf`) à l'avancée du cran — le soleil qui
   fond la neige de la fin d'hiver se lève à l'heure de celui qu'on voit. */
export function sunHoursOfTag(tag) {
  const t = tagInfo(tag), h = C.SUN_HOURS[t.base] || C.SUN_HOURS.spring;
  if (t.p == null) return h;
  const n = C.SUN_HOURS[nextSeason(t.base)] || h, k = 0.5 - 0.5 * Math.cos(Math.PI * (t.p - 0.5));
  return [h[0] + (n[0] - h[0]) * k, h[1] + (n[1] - h[1]) * k];
}

/* ── 1. CE QUE FAIT CHAQUE GENRE ─────────────────────────────────────────────
   `peak(r)` : les valeurs au palier (r ∈ [0,1[ tiré par épisode, pour que deux
   averses ne se ressemblent pas). `win` : pour chaque canal, [a, b, fa, fb] —
   il monte entre a et b (fractions de la montée) et descend entre fa et fb
   (fractions de la descente). Défaut [0, 1, 0, 1].
   `rise`, `hold`, `fall` : fourchettes en MINUTES DE JEU (un jour de jeu =
   1 200 minutes = 16 minutes réelles ; une minute de jeu = 0,8 s réelle). */
const lerp = (a, b, t) => a + (b - a) * t;
const KIND = {
  overcast: {
    peak: (r) => ({ dark: lerp(0.22, 0.34, r) }),
    rise: [50, 90], hold: [240, 640], fall: [60, 120], win: {},
  },
  /* L'averse : courte, jamais violente. La pluie commence en bruine (elle
     arrive au quart de la montée) — « une pluie qui ne tombe pas violente
     d'emblée ». */
  shower: {
    peak: (r) => ({ rain: lerp(0.28, 0.5, r), dark: lerp(0.3, 0.42, r), wind: lerp(0.1, 0.35, r) }),
    rise: [25, 45], hold: [25, 90], fall: [20, 40],
    win: { dark: [0, 0.8, 0.2, 1], rain: [0.25, 1, 0, 0.8] },
  },
  /* La pluie de fond (surtout l'automne) : longue, elle MONTE de la bruine à
     l'averse franche sur une à deux minutes réelles. */
  rain: {
    peak: (r) => ({ rain: lerp(0.55, 0.8, r), dark: lerp(0.42, 0.55, r), wind: lerp(0.15, 0.45, r) }),
    rise: [70, 130], hold: [180, 460], fall: [60, 120],
    win: { dark: [0, 0.65, 0.35, 1], rain: [0.3, 1, 0, 0.8], wind: [0.4, 1, 0, 0.8] },
  },
  /* L'orage : le ciel d'abord, les éclairs lointains, puis la pluie et les
     éclairs proches. `near` suit la pluie (c'est la même masse nuageuse). */
  storm: {
    peak: (r) => ({ rain: lerp(0.85, 1, r), dark: lerp(0.85, 1, r), bolts: lerp(0.75, 1, r), near: 1, wind: lerp(0.6, 1, r) }),
    rise: [110, 170], hold: [80, 230], fall: [100, 160],
    win: { dark: [0, 0.5, 0.4, 1], bolts: [0.08, 0.7, 0.1, 1], rain: [0.5, 1, 0, 0.55], near: [0.4, 1, 0, 0.6], wind: [0.45, 1, 0, 0.6] },
  },
  /* L'orage sec : des éclairs, un ciel à peine assombri, pas une goutte. Il
     reste LOIN (near ≤ 0,6) : c'est l'orage de chaleur qu'on regarde passer
     sur l'horizon un soir d'été. */
  dryStorm: {
    peak: (r) => ({ dark: lerp(0.3, 0.42, r), bolts: lerp(0.55, 0.85, r), near: lerp(0.2, 0.6, r), wind: lerp(0.2, 0.5, r) }),
    rise: [70, 120], hold: [70, 190], fall: [70, 120],
    win: { bolts: [0.2, 1, 0, 0.8], near: [0.4, 1, 0, 0.7] },
  },
  /* La grêle : brève et brutale, avec un peu de pluie. */
  hail: {
    peak: (r) => ({ hail: lerp(0.7, 1, r), rain: lerp(0.2, 0.4, r), dark: lerp(0.55, 0.7, r), wind: lerp(0.4, 0.8, r) }),
    rise: [12, 22], hold: [14, 36], fall: [12, 22],
    win: { dark: [0, 0.6, 0.4, 1], hail: [0.4, 1, 0, 0.7], rain: [0.2, 1, 0, 1] },
  },
  /* La neige, trois intensités — et la TAILLE des flocons les accompagne :
     une neige fine tombe en poudre, une forte en gros flocons. */
  snowLight: {
    peak: (r) => ({ snow: lerp(0.22, 0.38, r), dark: lerp(0.16, 0.26, r), flake: lerp(0, 0.25, r), wind: lerp(0, 0.2, r) }),
    rise: [50, 90], hold: [120, 420], fall: [50, 90],
    win: { snow: [0.3, 1, 0, 0.8], flake: [0.3, 1, 0, 0.8] },
  },
  snow: {
    peak: (r) => ({ snow: lerp(0.5, 0.72, r), dark: lerp(0.28, 0.4, r), flake: lerp(0.35, 0.65, r), wind: lerp(0.1, 0.35, r) }),
    rise: [60, 110], hold: [150, 460], fall: [60, 110],
    win: { snow: [0.3, 1, 0, 0.8], flake: [0.3, 1, 0, 0.8] },
  },
  snowHeavy: {
    peak: (r) => ({ snow: lerp(0.88, 1, r), dark: lerp(0.45, 0.58, r), flake: lerp(0.7, 1, r), wind: lerp(0.45, 0.8, r) }),
    rise: [80, 140], hold: [120, 360], fall: [80, 140],
    win: { dark: [0, 0.6, 0.4, 1], snow: [0.35, 1, 0, 0.75], flake: [0.35, 1, 0, 0.75], wind: [0.4, 1, 0, 0.8] },
  },
  /* 2026-10-05 — LA GIBOULÉE (la fin de l'hiver, § 0 bis) : une averse BRÈVE sous un
     ciel qui reste clair — le soleil ne se cache presque pas (`dark` bas : une averse,
     même légère, monte à 0,3-0,42), la pluie arrive vite, franche, poussée par le vent,
     et repart aussi vite. Elle vient PAR SÉRIES dans la même journée (`dayWeather`) :
     c'est la journée « surtout du soleil, un peu de pluie » de Guillaume, pas un jour
     gris. Elle ne remplit pas les ornières (`pluie.js`, seuil 0,5) : elle mouille. */
  giboulee: {
    peak: (r) => ({ rain: lerp(0.3, 0.5, r), dark: lerp(0.1, 0.2, r), wind: lerp(0.3, 0.6, r) }),
    rise: [8, 14], hold: [10, 28], fall: [10, 18],
    win: { dark: [0, 0.6, 0.35, 1], rain: [0.3, 1, 0, 0.7], wind: [0.15, 1, 0, 0.85] },
  },
  /* 2026-10-05 — LE COUP DE VENT (la fin de l'automne, § 0 bis) : du vent, un ciel à
     peine voilé, pas une goutte. C'est lui qui arrache les dernières feuilles et
     soulève le tapis (`feuilles.js` lit `wind`). */
  windy: {
    peak: (r) => ({ wind: lerp(0.62, 0.95, r), dark: lerp(0.06, 0.16, r) }),
    rise: [40, 80], hold: [140, 420], fall: [50, 100],
    win: { wind: [0.1, 1, 0, 0.9] },
  },
};

/* ── 2. LES CHANCES, SAISON PAR SAISON ───────────────────────────────────────
   Poids sur 100 (le reste est « beau temps »). Décisions de Guillaume : plus de
   pluie à l'automne qu'en été ; l'été, surtout des orages (dont des secs) ;
   l'hiver, des épisodes de neige de trois intensités ; de la grêle parfois,
   automne et hiver. Chances d'un jour avec précipitation, lues au banc
   (`verify-meteo`) plutôt que recopiées ici. */
export const SEASON_ODDS = {
  spring: { overcast: 12, shower: 22, rain: 10, storm: 5, dryStorm: 1 },
  summer: { overcast: 6, shower: 6, rain: 2, storm: 10, dryStorm: 9 },
  autumn: { overcast: 14, shower: 14, rain: 27, storm: 8, dryStorm: 1, hail: 6 },
  winter: { overcast: 14, rain: 3, hail: 5, snowLight: 20, snow: 16, snowHeavy: 8 },
};
/* 2026-10-05 — LES CHANCES DE LA FIN DE SAISON (§ 0 bis), vers lesquelles glissent
   celles de la saison (`oddsOf`, au poids `seasonLate`) :
   · la fin de l'hiver — « moins de neige, surtout du soleil, un peu de pluie, dans la
     même journée » : un jour sur trois est une journée de GIBOULÉES (deux à trois
     averses brèves entre des éclaircies) ;
     ⚠️ 2026-10-05, AJUSTEMENT DE GUILLAUME : « la part des jours de neige devient bien
     trop faible à partir de vendredi ; garder des chutes de neige pas trop rares jusqu'à
     samedi soir et dimanche matin — diminuer leur occurrence mais SURTOUT LEUR
     INTENSITÉ ». Premier réglage : la neige passait de 44 % des jours à 8 %. Désormais
     elle vise 21 % (~28 % le samedi soir, ~23 % le dimanche matin), presque toujours
     FINE (la tempête disparaît) — et chaque chute de la fin d'hiver tombe moins fort
     (`LATE_SNOW_CUT`, dans `dayWeather`). La place est prise sur les jours GRIS
     (couvert 8 → 5), pas sur les giboulées ni le soleil ;
   · la fin de l'automne — « pas de chutes de neige » (il n'y en a déjà pas l'automne) ;
     plus de ciels clairs et froids (ce sont eux qui posent la gelée du matin, § 10),
     des COUPS DE VENT qui arrachent les dernières feuilles, moins de pluies de fond. */
export const LATE_SNOW_CUT = 0.55;   // la part d'intensité qu'une chute de neige perd au dernier jour de l'hiver
export const LATE_ODDS = {
  winter: { overcast: 5, rain: 2, hail: 1, snowLight: 16, snow: 5, snowHeavy: 0, giboulee: 34 },
  autumn: { overcast: 18, shower: 12, rain: 11, storm: 2, dryStorm: 0, hail: 4, windy: 14 },
};
/* Les chances d'une étiquette. ⚠️ Hors fin de saison, l'OBJET de `SEASON_ODDS` lui-même :
   le tirage parcourt ses clés dans le même ordre, donc tire le même jour au bit près.
   En fin de saison, les clés de la saison d'abord (même ordre), puis celles qu'ajoute
   la fin (giboulée, coup de vent), à un poids qui part de zéro. */
const oddsMemo = new Map();
function oddsOf(tag) {
  const t = tagInfo(tag), odds = SEASON_ODDS[t.base] || SEASON_ODDS.spring, late = LATE_ODDS[t.base];
  if (!t.w || !late) return odds;
  let hit = oddsMemo.get(tag);
  if (hit) return hit;
  hit = {};
  for (const k of Object.keys(odds)) hit[k] = odds[k] + ((late[k] || 0) - odds[k]) * t.w;
  for (const k of Object.keys(late)) if (!(k in hit)) hit[k] = late[k] * t.w;
  if (oddsMemo.size > 64) oddsMemo.clear();
  oddsMemo.set(tag, hit);
  return hit;
}
/* L'heure où l'épisode peut ARRIVER (début de la montée), en minutes de jeu.
   L'orage d'été vient l'après-midi et le soir ; le reste, n'importe quand.
   2026-10-05 : la première giboulée vient le matin — les suivantes s'enchaînent
   (`dayWeather`), il faut leur laisser la journée. */
const START = {
  storm: [12 * 60, 20 * 60], dryStorm: [15 * 60, 22 * 60],
  giboulee: [7 * 60, 10 * 60 + 30],
  default: [C.DAY_START_MIN + 20, 21 * 60],
};
const DAY_A = C.DAY_START_MIN, DAY_B = C.DAY_END_MIN - 10;

function hash32(a, b) {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca77)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h ^= h >>> 12; h = Math.imul(h, 0x297a2d39) >>> 0; h ^= h >>> 15;
  return h >>> 0;
}
const u01 = (day, k) => hash32(day, k) / 4294967296;
const inR = (range, u) => range[0] + (range[1] - range[0]) * u;

/* Un épisode : { kind, t0, rise, hold, fall, p (valeurs au palier) }.
   `salt` : pour que deux épisodes du même jour ne tirent pas les mêmes nombres. */
function makeEpisode(kind, day, salt, t0Range) {
  const K = KIND[kind];
  const rise = inR(K.rise, u01(day, salt + 1)), hold = inR(K.hold, u01(day, salt + 2)), fall = inR(K.fall, u01(day, salt + 3));
  const tr = t0Range || START[kind] || START.default;
  let t0 = inR(tr, u01(day, salt + 4));
  // ⚠️ Un épisode FINIT dans la journée : à la bascule du jour, le suivant
  // repart de zéro, et un rideau de pluie coupé net à 2 h se verrait.
  if (t0 + rise + hold + fall > DAY_B) t0 = Math.max(DAY_A, DAY_B - (rise + hold + fall));
  const p = { ...ZERO(), ...K.peak(u01(day, salt + 5)) };
  return { kind, t0, rise, hold, fall, p };
}

/* ── 3. LE TEMPS D'UNE JOURNÉE ───────────────────────────────────────────────
   Mis en cache par (jour, saison) : la boucle de rendu le lit plusieurs fois
   par image, et le tirage ne change jamais. */
const dayCache = new Map();
export function dayWeather(day, season) {
  const key = (day | 0) + ":" + season;
  const hit = dayCache.get(key);
  if (hit) return hit;
  /* 2026-10-05 : `season` est une ÉTIQUETTE (§ 0 bis) — la saison, ou sa fin. */
  const base = seasonBase(season);
  const odds = oddsOf(season);
  let pick = null, acc = 0;
  const roll = u01(day, 11) * 100;
  for (const k of Object.keys(odds)) { acc += odds[k]; if (roll < acc) { pick = k; break; } }
  const eps = [];
  if (pick) {
    const main = makeEpisode(pick, day, 100);
    eps.push(main);
    /* 2026-10-05 — LES GIBOULÉES VIENNENT PAR SÉRIES : une ou deux de plus après la
       première, chacune après une éclaircie de 110 à 260 minutes de jeu (une minute et
       demie à trois minutes et demie réelles), jamais après 19 h. Premier réglage
       (trois de plus, éclaircies de 70 à 190 min) : 3,8 averses par jour — plus « un
       peu de pluie ». ⚠️ Des sels neufs (61-62, 700-805) : les autres tirages du jour
       n'en voient rien. */
    if (pick === "giboulee") {
      let end = main.t0 + main.rise + main.hold + main.fall;
      for (let j = 0; j < 2; j++) {
        const at = end + inR([110, 260], u01(day, 61 + j));
        if (at > 19 * 60) break;
        const ep = makeEpisode("giboulee", day, 700 + 100 * j, [at, at + 20]);
        eps.push(ep);
        end = ep.t0 + ep.rise + ep.hold + ep.fall;
      }
    }
    /* Un orage d'automne ou d'hiver lâche parfois une GRÊLE à son plus fort. */
    if (pick === "storm" && (base === "autumn" || base === "winter") && u01(day, 21) < 0.4) {
      const at = main.t0 + main.rise * 0.8;
      eps.push(makeEpisode("hail", day, 200, [at, at + main.hold * 0.5]));
    }
    /* Une averse ou une neige appelle parfois une seconde, plus tard. */
    if ((pick === "shower" || pick === "snowLight" || pick === "snow") && u01(day, 23) < 0.35) {
      const after = main.t0 + main.rise + main.hold + main.fall + 90;
      if (after < 21 * 60) eps.push(makeEpisode(pick, day, 300, [after, Math.min(22 * 60, after + 240)]));
    }
    /* 2026-10-05 (ajustement de Guillaume, voir `LATE_ODDS`) — LES NEIGES DE LA FIN D'HIVER
       TOMBENT MOINS FORT : l'intensité de chaque chute est rognée de `LATE_SNOW_CUT` × la
       part de fin de saison (−37 % le samedi soir, −49 % le dimanche matin). Elles restent
       des neiges qu'on voit tomber ; elles ne posent plus qu'un voile qui fond. ⚠️ Au cœur
       de l'hiver (part nulle), rien n'est touché : l'empreinte du banc tient. */
    const late = seasonLate(season);
    if (late > 0 && base === "winter") {
      for (const e of eps) if (SNOW_KINDS.includes(e.kind)) e.p = { ...e.p, snow: e.p.snow * (1 - LATE_SNOW_CUT * late) };
    }
  }
  const out = { day: day | 0, season, eps };
  if (dayCache.size > 64) dayCache.clear();
  dayCache.set(key, out);
  return out;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 3 bis. 2026-09-29 — DEUX LIEUX SOUS LE MÊME CIEL, PAS SOUS LA MÊME AVERSE.
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : « une cohérence météo ferme/ville mais qui ne soit pas toujours
   simultanée (bien que fréquemment la même). Par exemple il peut pleuvoir sur
   l'une et pas sur l'autre au même moment de la journée. Mais s'il neige, alors
   synchroniser les deux. » Fréquence choisie par lui : UN JOUR SUR CINQ.
   ⚠️ LA VILLE EST LA RÉFÉRENCE ET NE BOUGE PAS D'UN BIT : `dayWeather` reste son
   tirage, donc tout ce qui la lisait (neige, pluie, faune, lumière, bancs) lit
   exactement le même ciel qu'avant. La ferme en DÉRIVE le sien (`placeDayWeather`) —
   une pure fonction du jour et de la saison, comme le reste : les deux joueurs
   voient la même averse sur la ferme, sans un message (§3 de CLAUDE.md).
   ⚠️⚠️ LA NEIGE N'A PAS DE LIEU : un jour où la ville a un épisode de neige, la
   ferme a le MÊME jour, épisodes compris, et aucune divergence ne tire jamais de
   neige (`allowedHere`). La neige tombe donc ensemble ou pas du tout. Ce qui peut
   encore différer sous la neige, c'est la FONTE (une pluie sur un seul des deux
   lieux) — et l'hiver, une divergence n'ajoute jamais de pluie (voir plus bas).
   Trois formes de divergence, pour qu'un jour différent reste un jour COHÉRENT :
   · LE FRONT PASSE PLUS TÔT OU PLUS TARD (le même temps, décalé de 40 à 150 min) :
     l'averse de la ville arrive sur la ferme une heure avant ou après ;
   · UNE INTENSITÉ VOISINE (`NEIGHBOR`) : pluie ici, averse là ; orage ici, pluie là ;
   · UN TEMPS PROPRE : il pleut sur l'un, il fait sec sur l'autre. */
export const PLACES = ["town", "farm"];
/* La zone d'un joueur → son lieu. Tout ce qui n'est pas la ferme est en ville :
   le tribunal, la mairie, l'église (on y voit la ville par les fenêtres). */
export const placeOf = (zone) => (zone === "farm" ? "farm" : "town");
export const PLACE_SPLIT = 0.2;                    // un jour sur cinq (Guillaume, 2026-09-29)
export const SNOW_KINDS = ["snowLight", "snow", "snowHeavy"];
const isSnowKind = (k) => SNOW_KINDS.includes(k);
const WET_KINDS = new Set(["shower", "rain", "storm", "hail", "giboulee"]);
/* L'intensité voisine de chaque genre (`null` : le beau temps).
   2026-10-05 : la giboulée a pour voisins le beau temps et le couvert (l'hiver, une
   divergence n'ajoute jamais de pluie — voir `allowedHere`) ; le coup de vent, le
   couvert et le calme. */
const NEIGHBOR = {
  overcast: ["shower", null], shower: ["rain", "overcast"], rain: ["shower", "storm"],
  storm: ["rain", "dryStorm"], dryStorm: ["overcast", "storm"], hail: ["shower", "overcast"],
  giboulee: [null, "overcast"], windy: ["overcast", null],
};
/* Ce qu'une divergence a le droit de tirer : jamais de neige ; seulement des genres
   de la saison (ou le couvert) ; et L'HIVER, JAMAIS DE PLUIE EN PLUS — elle ferait
   fondre la neige d'un seul des deux lieux, et le manteau que la neige a posé
   ensemble se séparerait en deux paysages. 2026-10-05 : `season` est une étiquette ;
   « la saison » est sa base, et ses genres sont ceux de ses chances (`oddsOf`). */
function allowedHere(k, season) {
  if (k === null || k === "overcast") return true;
  if (isSnowKind(k)) return false;
  if (seasonBase(season) === "winter") return k === "hail";
  return oddsOf(season)[k] > 0 || k === "shower";
}
/* Un épisode décalé de `dt` minutes, gardé dans la journée (il FINIT dans la
   journée, comme dans `makeEpisode`). */
function shiftEp(ep, dt) {
  const len = ep.rise + ep.hold + ep.fall;
  return { ...ep, t0: Math.max(DAY_A, Math.min(DAY_B - len, ep.t0 + dt)) };
}
const placeCache = new Map();
/* Le front décalé de 40 à 150 min. ⚠️ Un épisode qui remplit toute la journée ne
   se décale pas : on prend alors l'autre sens ; rend null s'il ne bouge toujours
   pas de 30 min (la divergence prend alors une autre forme). */
function shiftedFront(town, day) {
  const main = town.eps[0];
  if (!main) return null;
  const mag = inR([40, 150], u01(day, 47)), sg = u01(day, 45) < 0.5 ? -1 : 1;
  let moved = town.eps.map((e) => shiftEp(e, sg * mag));
  if (Math.abs(moved[0].t0 - main.t0) < 30) moved = town.eps.map((e) => shiftEp(e, -sg * mag));
  return Math.abs(moved[0].t0 - main.t0) >= 30 ? moved : null;
}
/* La part de jours mouillés d'une saison (épisode principal), lue dans ses chances. */
function wetShare(season) {
  const odds = oddsOf(season);
  let w = 0;
  for (const k of Object.keys(odds)) if (WET_KINDS.has(k)) w += odds[k] / 100;
  return w;
}
export function placeDayWeather(day, season, place) {
  const town = dayWeather(day, season);
  if (place !== "farm") return town;
  const key = (day | 0) + ":" + season;
  const hit = placeCache.get(key);
  if (hit) return hit;
  let eps = town.eps, form = "same";
  if (!town.eps.some((e) => isSnowKind(e.kind)) && u01(day, 41) < PLACE_SPLIT) {
    const r = u01(day, 43);
    const main = town.eps[0] || null;
    if (town.eps.some((e) => WET_KINDS.has(e.kind))) {
      /* ── LA VILLE EST MOUILLÉE. 1. Le front décalé (40 %) ; 2. l'intensité voisine
         (35 %), à la même heure à ±30 min ; 3. le reste : sec sur la ferme. */
      const moved = r < 0.4 ? shiftedFront(town, day) : null;
      if (moved) { eps = moved; form = "shift"; }
      if (form === "same" && r < 0.75) {
        const cands = (NEIGHBOR[main.kind] || []).filter((k) => allowedHere(k, season));
        if (cands.length) {
          const nk = cands[Math.floor(u01(day, 49) * cands.length) % cands.length];
          eps = nk ? [makeEpisode(nk, day, 500, [Math.max(DAY_A, main.t0 - 30), main.t0 + 30])] : [];
          form = "neighbor";
        }
      }
      if (form === "same") { eps = u01(day, 51) < 0.6 ? [] : [makeEpisode("overcast", day, 600)]; form = "own"; }
    } else {
      /* ── LA VILLE EST SÈCHE. ⚠️⚠️ LE MÊME CLIMAT DES DEUX CÔTÉS : le premier jet
         mouillait la ferme à CHAQUE jour sec divergent, et elle sortait pluvieuse un
         jour d'été sur trois contre un sur six en ville (mesuré : 31,9 % contre
         18,1 %). Un jour sec de la ville ne devient donc pluvieux sur la ferme
         qu'avec la probabilité qui ÉQUILIBRE les jours mouillés que la divergence
         assèche (≈ 0,355 par jour mouillé divergent : le quart « sec » plus la part
         sèche des voisins) ; les autres divergent par le CIEL — le couvert décalé,
         ou couvert d'un côté et dégagé de l'autre. L'hiver, « mouillé » n'est que
         de la grêle (`allowedHere`). */
      const w = wetShare(season), q = Math.min(1, 0.355 * w / Math.max(0.05, 1 - w));
      const pool = Object.keys(oddsOf(season)).filter((k) => WET_KINDS.has(k) && allowedHere(k, season));
      if (r < q && pool.length) {
        const odds = oddsOf(season);
        let tot = 0, acc = 0, pick = pool[0];
        for (const k of pool) tot += odds[k];
        const roll = u01(day, 55) * tot;
        for (const k of pool) { acc += odds[k]; if (roll < acc) { pick = k; break; } }
        eps = [makeEpisode(pick, day, 600)];
        form = "own";
      } else {
        const moved = u01(day, 57) < 0.5 ? shiftedFront(town, day) : null;
        if (moved) { eps = moved; form = "shift"; }
        else { eps = main ? [] : [makeEpisode("overcast", day, 600)]; form = "sky"; }
      }
    }
  }
  const out = { day: day | 0, season, eps, place: "farm", form };
  if (placeCache.size > 64) placeCache.clear();
  placeCache.set(key, out);
  return out;
}

/* ── 4. L'ENVELOPPE D'UN CANAL ───────────────────────────────────────────── */
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function chanEnv(ep, t, w) {
  const [a, b, fa, fb] = w || [0, 1, 0, 1];
  const r0 = ep.t0 + a * ep.rise, r1 = ep.t0 + b * ep.rise;
  const tf = ep.t0 + ep.rise + ep.hold;
  const f0 = tf + fa * ep.fall, f1 = tf + fb * ep.fall;
  if (t < r0 || t >= f1) return 0;
  if (t < r1) return smooth((t - r0) / Math.max(1e-6, r1 - r0));
  if (t < f0) return 1;
  return 1 - smooth((t - f0) / Math.max(1e-6, f1 - f0));
}
function epAt(ep, t, out) {
  const win = KIND[ep.kind].win;
  for (const c of CHANNELS) {
    if (!ep.p[c]) continue;
    const v = ep.p[c] * chanEnv(ep, t, win[c]);
    if (c === "near") continue; // voir plus bas : la proximité suit l'épisode qui porte les éclairs
    if (v > out[c]) out[c] = v;
  }
  // La proximité est celle de l'épisode dont les éclairs dominent.
  if (ep.p.bolts) {
    const b = ep.p.bolts * chanEnv(ep, t, win.bolts);
    if (b >= out._b) { out._b = b; out.near = ep.p.near * chanEnv(ep, t, win.near); }
  }
  return out;
}

/* ── 5. LE FORÇAGE DU MENU DEV ───────────────────────────────────────────────
   `force` : { day, kind, at } (`at` en minutes de jeu). ⚠️ Il COMMENCE à son
   heure : le temps naturel s'efface en `FORCE_BLEND` minutes de jeu, et le
   genre commandé MONTE avec sa propre montée — commander un orage, c'est le
   voir arriver (comme Guillaume l'a demandé : « un orage qui monte »), pas le
   recevoir sur la tête. Il tient jusqu'à la fin de la journée ; le lendemain,
   `force.day` ne correspond plus et la rotation normale revient d'elle-même. */
export const FORCE_BLEND = 45;
/* 2026-10-05 — UNE GIBOULÉE COMMANDÉE GARDE SA NATURE : des averses brèves séparées
   d'éclaircies, jusqu'au soir. Tenue d'un bloc comme les autres genres, elle serait
   une averse ensoleillée de quatorze heures — un genre qui n'existe pas. */
export function forcedEpisodes(force) {
  if (!force || !KIND[force.kind]) return [];
  const K = KIND[force.kind];
  const p = { ...ZERO(), ...K.peak(0.6) };
  const mid = (r) => (r[0] + r[1]) / 2;
  if (force.kind === "giboulee") {
    const out = [], len = mid(K.rise) + mid(K.hold) + mid(K.fall);
    for (let t = force.at; t + len <= DAY_B; t += len + 80) out.push({ kind: force.kind, t0: t, rise: mid(K.rise), hold: mid(K.hold), fall: mid(K.fall), p });
    return out;
  }
  return [{ kind: force.kind, t0: force.at, rise: mid(K.rise), hold: 1e9, fall: 1, p }];
}
export function forcedEpisode(force) {
  return forcedEpisodes(force)[0] || null;
}
export function normalizeForce(f) {
  if (!f || typeof f !== "object") return null;
  const kind = WX_KINDS.includes(f.kind) ? f.kind : null;
  const day = f.day | 0, at = +f.at;
  if (!kind || day <= 0 || !isFinite(at)) return null;
  return { day, kind, at };
}

/* ── 6. LE TEMPS QU'IL FAIT ──────────────────────────────────────────────────
   `tm` : minutes de jeu (`E.gameTimeMin`). Rend les huit canaux.
   `place` : "town" (défaut : le ciel de référence) ou "farm" (§ 3 bis).
   ⚠️ Le forçage du menu dev vaut pour les DEUX lieux : commander un orage, c'est
   le commander sur toute la carte du jeu. */
export function weatherAt(day, tm, season, force, place) {
  const out = ZERO(); out._b = 0;
  for (const ep of placeDayWeather(day, season, place).eps) epAt(ep, tm, out);
  if (force && force.day === (day | 0) && tm >= force.at) {
    const k = smooth((tm - force.at) / FORCE_BLEND);
    for (const c of CHANNELS) out[c] *= 1 - k;
    out._b *= 1 - k;
    for (const fe of forcedEpisodes(force)) epAt(fe, tm, out);
  }
  /* La taille des flocons n'a de sens que s'il neige : sans neige, elle
     retombe à 0 (sinon un « flake » résiduel d'une descente décalée ferait
     tomber de gros flocons au début de la suivante). */
  /* ⚠️ La fenêtre de `flake` est donc celle de `snow` dans chaque genre de neige
     (verify-meteo §3 : avec une fenêtre plus large, la taille retombait à 0 d'un
     coup à la dernière seconde de neige). */
  if (out.snow <= 0) out.flake = 0;
  delete out._b;
  return out;
}
/* Même chose depuis un horodatage réel (ms), pour qui raisonne en temps réel
   (les créneaux de la faune). Avant le début du jour courant, c'est la
   VEILLE qu'on lit. */
export function weatherAtMs(ms, dayStartAt, day, seasonOf, force, place) {
  let d = day | 0, ds = dayStartAt;
  if (ms < ds && d > 1) { d -= 1; ds -= C.DAY_REAL_MS; }
  const tm = Math.min(C.DAY_END_MIN, C.DAY_START_MIN + ((ms - ds) / C.DAY_REAL_MS) * (C.DAY_END_MIN - C.DAY_START_MIN));
  return weatherAt(d, tm, typeof seasonOf === "function" ? seasonOf(ds) : seasonOf, force, place);
}

/* ── 7. CE QUE LE MONDE EN FAIT ──────────────────────────────────────────── */
/* Mouillé au point qu'on s'abrite (0..1) : la faune s'y abrite au-dessus de
   `SHELTER_AT`, les papillons et les lucioles s'effacent en proportion. Un
   orage sec sans pluie chasse aussi les bêtes quand il est proche. */
export function wetness(W) {
  return Math.min(1, Math.max(W.rain, W.hail * 1.2, W.snow * 0.6, W.bolts * W.near * 0.8));
}
export const SHELTER_AT = 0.3;
/* Les éclairs : une chance par seconde (`lumiere.js`, `flashAt`) ; à `bolts`
   = 1, un toutes les ~9 s (l'ancien orage : un toutes les 26 s, toute la
   journée). */
export const BOLT_ODDS_MAX = 1 / 9;
export const boltOdds = (W) => W.bolts * BOLT_ODDS_MAX;
/* L'éclat d'un éclair selon la distance : pâle à l'horizon, franc au-dessus. */
export const flashGain = (W) => 0.3 + 0.7 * W.near;
/* Le tonnerre : le son voyage à 340 m/s, la lumière non. Repris du monde
   maléfique (`public/templerun/js/config.js`, 410) : 1,2 à 3,4 s, et un coup
   qui tarde est un coup lointain, donc plus sourd. Au-delà, on l'étire : un
   orage à l'horizon gronde cinq à six secondes après son éclair. */
export function thunderFor(near, u) {
  const far = 1 - near;
  return { delayMs: 1200 + far * 4200 + u * 900, volume: 0.9 - far * 0.55 };
}

/* ── 8. LA PRÉVISION DU MATIN (le chat, au lever du jour) ────────────────────
   Rend { kind, part } pour l'épisode principal, ou null s'il fait beau.
   `part` : "morning" (< 12 h), "afternoon" (< 17 h), "evening" (< 21 h), "night".
   `place` : le lieu (§ 3 bis) — la ville par défaut. */
export function forecast(day, season, place) {
  const { eps } = placeDayWeather(day, season, place);
  if (!eps.length) return null;
  const ep = eps[0];
  const t = ep.t0 + ep.rise * 0.5;
  const part = t < 12 * 60 ? "morning" : t < 17 * 60 ? "afternoon" : t < 21 * 60 ? "evening" : "night";
  return { kind: ep.kind, part };
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 9. 2026-10-05 — LA TEMPÉRATURE, EN DIRECT.
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : « indiquer la température en direct ». Une PURE FONCTION de l'avancée
   de l'année, de l'heure, du temps qu'il fait, du jour et du lieu — comme la météo :
   les deux joueurs lisent le même chiffre sans un message (§3 de CLAUDE.md).
   ⚠️⚠️ ELLE SE DÉDUIT DU CIEL, ELLE NE LE COMMANDE PAS : la neige tombe parce que le
   tirage l'a dit, et la température en tient compte (il neige ⇒ zéro au plus ; il
   pleut ⇒ il ne gèle pas). L'inverse aurait demandé de refaire la neige, la glace et
   tous les bancs qui les tiennent — pour un chiffre lu en coin d'écran. La seule
   chose qu'elle commande est un DESSIN : la gelée blanche (§ 10).
   · L'ANNÉE (`phase` : l'indice de la saison + son avancée, 0..4 depuis le premier
     jour du printemps) : une moyenne journalière lue sur seize points, un par quart
     de saison, interpolée en Catmull-Rom périodique. ⚠️ CONTINUE D'UNE SAISON À
     L'AUTRE : le dernier jour de l'hiver et le premier du printemps ont la même
     température — c'est la fin de l'hiver qui remonte (+2 °C de moyenne), pas le
     printemps qui saute. Même chose à la fin de l'automne (+3), qui descend.
   · LA JOURNÉE : le minimum juste après le lever, le maximum entre 14 et 16 h, puis
     la décroissance de la nuit ; le lever et le coucher sont ceux du ciel
     (`C.sunHoursOf`, même interpolation). L'amplitude est celle de la saison (6,5 °C
     de part et d'autre l'été, 3,5 l'hiver), rognée par les nuages : un ciel couvert
     garde la chaleur la nuit et la bloque le jour.
   · LE TEMPS : la pluie et la grêle rafraîchissent ; il ne gèle pas sous la pluie ;
     la neige plafonne (0,5 °C sous une neige fine, −1,7 sous une tempête).
   · LE JOUR : un écart propre à chaque jour de jeu (±4 °C au plus, le plus souvent
     ±1,5), tiré de son numéro — deux journées d'hiver ne se ressemblent pas, et une
     fin d'automne n'a pas de gelée tous les matins.
   · LE LIEU : la ferme, en rase campagne, perd jusqu'à un degré de plus au petit
     matin (la ville garde sa chaleur) — c'est là que la gelée prend le mieux.
   Le banc (`verify-meteo` § 11) imprime les moyennes, minima et maxima par moment de
   l'année, et tient la continuité, la neige et la pluie. */
/* Premier réglage mesuré au banc : un après-midi d'été à 29 °C de moyenne (le cœur de
   l'été à 22) — une canicule permanente. Ramené à 19,5 : ~26 °C l'après-midi. */
const T_YEAR = [4, 6.5, 10, 13, 15.5, 18, 19.5, 18.5, 16, 12.5, 9.5, 6.5, 1.5, -3, -4.5, -1.5];
/* La moyenne journalière (°C) à l'avancée `phase` de l'année. */
export function yearMeanAt(phase) {
  const N = T_YEAR.length, x = (((phase % 4) + 4) % 4) * (N / 4), i = Math.floor(x), f = x - i;
  const P = (k) => T_YEAR[((k % N) + N) % N];
  const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
  return 0.5 * (2 * p1 + (p2 - p0) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (3 * p1 - p0 - 3 * p2 + p3) * f * f * f);
}
/* La demi-amplitude du jour (°C) par ciel moyen. */
export const yearAmpAt = (phase) => 4.9 + 1.3 * Math.cos(2 * Math.PI * (phase - 1.5) / 4);
/* Le lever et le coucher à l'avancée `phase` — l'interpolation de `C.sunHoursOf`. */
export function sunHoursAtPhase(phase) {
  const t = (((phase % 4) + 4) % 4) - 0.5, i0 = Math.floor(t), f = t - i0;
  const a = C.SUN_HOURS[SEASON_ORDER[((i0 % 4) + 4) % 4]], b = C.SUN_HOURS[SEASON_ORDER[(((i0 + 1) % 4) + 4) % 4]];
  const k = 0.5 - 0.5 * Math.cos(Math.PI * f);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}
/* La forme du jour, −1 au plus froid (juste après le lever) à +1 au plus chaud, à
   l'heure `h` (6..26). Avant le minimum du matin, c'est encore la nuit d'avant. */
export function dayShape(h, rise, set) {
  const hMin = rise + 0.3, hMax = rise + 0.62 * (set - rise) + 0.6;
  const x = h < hMin ? h + 24 : h;
  if (x <= hMax) return -Math.cos(Math.PI * (x - hMin) / (hMax - hMin));
  const L = hMin + 24 - hMax, TAU = 4.5;
  return 1 - 2 * (1 - Math.exp(-(x - hMax) / TAU)) / (1 - Math.exp(-L / TAU));
}
/* L'écart du jour `day` (°C), triangulaire sur ±4. Sels 71-72 : neufs. */
export const dayAnomaly = (day) => (u01(day, 71) + u01(day, 72) - 1) * 4;
/* La température de l'air (°C, non arrondie) : `phase` (`E.seasonPhaseAt`), `hour`
   (6..26, heure de jeu), `W` (les canaux de `weatherAt` à cet instant ET à ce lieu),
   `place` ("town" | "farm"), `day` (le jour de jeu). */
export function temperatureAt(phase, hour, W, place, day) {
  const [rise, set] = sunHoursAtPhase(phase);
  const amp0 = yearAmpAt(phase), cloud = Math.min(1, (W.dark || 0) / 0.45);
  const s = dayShape(hour, rise, set);
  let T = yearMeanAt(phase) + dayAnomaly(day) + amp0 * (1.15 - 0.75 * cloud) * s;
  if (place === "farm" && s < 0) T += s;
  T -= (1.2 + 1.6 * amp0 / 6.5) * (W.rain || 0) + 2 * (W.hail || 0);
  if (W.rain > 0) { const k = smooth(W.rain / 0.15); T += (Math.max(T, 0.8 + 1.5 * W.rain) - T) * k; }
  if (W.snow > 0) { const k = smooth(W.snow / 0.12); T += (Math.min(T, 0.5 - 2.2 * W.snow) - T) * k; }
  return T;
}
/* L'affichage : un entier, sans « −0 ». */
export function tempRound(T) {
  const r = Math.round(T);
  return r === 0 ? 0 : r;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 10. 2026-10-05 — LA GELÉE BLANCHE, LUE DANS LA TEMPÉRATURE.
   ╚══════════════════════════════════════════════════════════════════════════
   Avant : l'hiver seulement, de l'aube à 10 h 12, quel que soit le froid. Guillaume
   veut « une petite gelée légère au petit matin qui fond vite en fin de matinée »
   pour annoncer l'hiver à la fin de l'automne : elle se lit donc dans l'air. Elle
   prend quand il passe sous `FROST_T` par ciel clair, et fond quand il se réchauffe —
   D'ABORD AU SOLEIL (une surface qui le reçoit est plus chaude que l'air :
   `FROST_SUN_WARM` degrés au plein soleil), EN DERNIER À L'OMBRE des murs, des haies
   et des arbres : le matin, la gelée recule et ne reste que dans les ombres bleues.
   Rend { sun, shade } (0..1) ; `neige.js` (`renderChunk`) passe de l'une à l'autre au
   pixel, par l'ombre qu'il reçoit.
   ⚠️ LE CIEL QUI COMPTE LE MATIN EST CELUI DE L'AUBE (`Wdawn`) : une gelée posée par
   une nuit claire ne s'efface pas parce qu'un nuage passe à neuf heures. La pluie,
   elle, l'efface : elle la fond. */
export const FROST_T = 0.5, FROST_SPAN = 2.2, FROST_SUN_WARM = 3.4;
export function frostOf(T, sunRaw, W, Wdawn, hour) {
  const clearNow = Math.max(0, 1 - 1.6 * W.dark);
  const clear = hour < 13 && Wdawn ? Math.max(clearNow, Math.max(0, 1 - 1.6 * Wdawn.dark)) : clearNow;
  if (W.rain > 0.05 || W.hail > 0.05 || clear <= 0) return { sun: 0, shade: 0 };
  const sunEff = (sunRaw || 0) * Math.max(0, 1 - 1.25 * W.dark);
  const f = (t) => Math.max(0, Math.min(1, (FROST_T - t) / FROST_SPAN)) * clear;
  return { sun: f(T + FROST_SUN_WARM * sunEff), shade: f(T) };
}
