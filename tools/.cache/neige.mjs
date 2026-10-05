/* ╔══════════════════════════════════════════════════════════════════════════
   ║ PHASE 12a (2026-09-28) — LA NEIGE DE VALLEY TOWN : CE QUI TOMBE, CE QUI
   ║ TIENT, CE QU'ON Y LAISSE.
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume : « la neige ultra réaliste avec traces etc » ; puis « toute ton
   énergie dans une belle neige, très réaliste, avec de belles traces de pas,
   qui ne s'effacent pas tout de suite (calculées en local pour l'instant),
   pour les résidents et les players ». Décisions du jour (toutes prises) :
   l'épaisseur est une PURE FONCTION de la météo passée ; les traces sont
   LOCALES ; toits en calque fabriqué hors ligne ; arbres à TROIS ÉTATS (nu,
   légèrement enneigé, alourdi) dont la neige tombe des branches ; fonte
   réaliste ; circulation implicite sur les rues, et piquets à neige.

   CE FICHIER EST PUR (il ne dessine rien à l'écran, n'importe rien du jeu hormis
   les constantes et la météo) — `tools/verify-neige.mjs` le joue :
   · §2 LE MANTEAU : l'épaisseur au sol (au soleil, à l'ombre, sur la chaussée
     déneigée, dans les congères du chasse-neige), sur les toits (chauffés ou
     non) et la charge des arbres, INTÉGRÉES sur les jours passés depuis
     `meteo.js` — rien ne circule sur le réseau (§3 de CLAUDE.md) : deux joueurs
     voient la même épaisseur, calculée chacun chez soi.
   · §4-§6 LE SOL : un CHAMP DE HAUTEUR au pixel d'art (le manteau × ce que la
     case reçoit : l'abri d'un arbre, l'ombre, la congère au vent d'un mur, les
     ornières d'une rue, la marche d'un escalier), éclairé comme un relief
     (lumière du nord-ouest, comme tout le projet). Les empreintes CREUSENT ce
     même champ : c'est ce qui les rend vraies — une trace se lit par l'ombre de
     sa paroi nord-ouest et l'arête claire de sa paroi sud-est, et dans deux
     centimètres de neige, le pas va jusqu'au pavé.
   · §7 LES EMPREINTES, locales (décision de Guillaume) : chaque client creuse
     ce qu'il voit marcher. Elles ne s'effacent pas avec le temps : la neige
     fraîche les COMBLE (en proportion de ce qui tombe), le vent les adoucit à
     peine. Un passage répété devient un chemin tassé — sans une ligne de plus.
   · §8 LE CHAPEAU DE NEIGE d'un sprite (mobilier) : lu dans ses pixels.

   ⚠️ LA LUMIÈRE VIENT DU NORD-OUEST (DESSIN.md). Une paroi qui regarde le
   nord-ouest est claire : le fond d'une empreinte est dans l'ombre au nord-ouest
   et s'éclaire au sud-est. Les ombres de la neige sont BLEUES — c'est la
   première chose qui fait « neige » et pas « peinture blanche ».
   ⚠️ LA VALEUR SE QUANTIFIE EN PALIERS DE PALETTE (six tons), comme partout :
   aucun dégradé continu, aucun pixel tiré au hasard à chaque image. Le relief
   vient de FORMES (une empreinte, une congère, un bourrelet), pas d'un bruit.
   ══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants.mjs";
import * as WX from "./meteo.mjs";

const T = C.TILE;

/* ── 1. LES RÉGLAGES ────────────────────────────────────────────────────────
   En CENTIMÈTRES et en HEURES DE JEU (une heure de jeu = 48 s réelles). Aucun
   n'a été joué : ils sont posés par déduction, et le banc imprime ce qu'ils
   donnent (épaisseur après chaque genre de neige, jours pour fondre). */
export const NEIGE = {
  WINDOW_DAYS: 4,          // on remonte quatre jours de météo (au-delà, le manteau part de zéro)
  STEP_MIN: 6,             // pas d'intégration (minutes de jeu)
  /* La chute : 3,2 cm/h à pleine intensité ; l'exposant sépare les genres — la
     neige fine (0,3) pose ~0,5 cm/h, la modérée (0,6) ~1,5 cm/h. Mesuré au
     banc : un hiver blanc à midi deux jours sur trois, 30 cm au plus fort
     (4,2 cm/h en donnait 44 : une ville ensevelie). */
  FALL_CM_H: 3.2, FALL_EXP: 1.5,
  SETTLE_H: 0.004,         // tassement : ~8 % de l'épaisseur par journée
  /* La fonte au soleil (cm/h au plein soleil de midi), l'air doux de la saison
     (cm/h, jour et nuit), la pluie (cm/h à pleine averse). L'hiver n'a pas d'air
     doux : seuls le soleil et la pluie font fondre. */
  SUN_MELT: { winter: 0.9, spring: 2.6, summer: 6, autumn: 1.6 },
  WARM_MELT: { winter: 0, spring: 1.4, summer: 5, autumn: 0.7 },
  /* 2026-10-05 — LA FIN DE L'HIVER (meteo.js § 0 bis) : ce que valent la fonte au soleil,
     l'air doux et la fonte de la glace au DERNIER jour de l'hiver ; on y glisse depuis
     les valeurs d'hiver à mesure que la fin de saison avance (`WX.seasonMixTo`). Un
     soleil déjà plus fort, un air à peine doux : la neige recule au soleil, tient à
     l'ombre des murs et des arbres. Réglé au banc (`verify-meteo` § 12, « la neige recule ») —
     le premier jet visait les valeurs du printemps et ne laissait plus rien dès le
     samedi matin. Mesuré sur un hiver joué d'un bout à l'autre : à 70 % de la saison,
     19 % des midis blancs au soleil et 48 % à l'ombre (avant : 57 et 76) ; à 80 %, 16
     et 29 ; ensuite, les neiges de la fin d'hiver poudrent et fondent. ⚠️ Depuis
     l'ajustement de Guillaume (meteo.js, `LATE_ODDS` / `LATE_SNOW_CUT` : des chutes pas
     trop rares jusqu'au dimanche matin, mais moins fortes), mesuré à la fin de chaque
     chute : le samedi soir (83 %), 28 % des jours neigent, et 8 chutes sur 10 laissent
     un voile (≥ 0,3 cm), 4 sur 10 blanchissent (≥ 1,5 cm) ; le dimanche matin (91 %),
     23 %, une sur deux et une sur quatre. Le lac ne prend plus après 60 %. */
  SUN_MELT_LATE: { winter: 1.4 },
  WARM_MELT_LATE: { winter: 0.15 },
  ICE_WARM_LATE: { winter: 0.12 },
  RAIN_MELT: 2.4,
  SHADE_SUN: 0.2,          // à l'ombre (au sud-est d'un mur, d'une haie, d'un arbre) : un cinquième du soleil
  /* La chaussée : la circulation (qu'on ne voit pas) et le chasse-neige.
     Elle ne garde jamais plus de `ROAD_CAP` : le reste part en CONGÈRE sur le
     bord (`berm`), qui fond comme la neige à l'ombre (tassée et salie). */
  ROAD_CAP: 2.4, ROAD_MELT: 0.45, ROAD_SUN: 1.4,
  /* Les toits : une maison CHAUFFÉE fond par dessous ; l'église, la mairie et le
     tribunal (froids) gardent leur neige plus longtemps. */
  ROOF_HEAT: 0.16, ROOF_SUN: 1.25, ROOF_MAX: 30,
  /* La charge des arbres (0..1) : elle monte avec la chute et tombe au vent, au
     soleil, à la pluie — et d'elle-même (les branches se déchargent). Un
     conifère la garde bien plus longtemps qu'un feuillu nu. */
  TREE_GAIN: 0.45, TREE_BASE: 0.35, TREE_BASE_CONIFER: 0.12, TREE_WIND: 0.6, TREE_SUN: 1.2, TREE_RAIN: 3,
  /* Les trois états des arbres (Guillaume : « nu, légèrement enneigé, alourdi »). */
  STATE_LIGHT: 0.14, STATE_HEAVY: 0.5,
  /* Les ombres portées sur la neige (§5) : un ouvrage de h px porte son ombre à
     h·K px vers l'est et h·K·KY vers le sud (la lumière vient du nord-ouest). */
  SHADOW_K: 0.45, SHADOW_KY: 0.8,
  /* ⚠️ 2026-09-30 — LA GLACE DE L'ÉTANG DU PARC (Guillaume : « l'étang doit être gelé
     en hiver » ; tranché : « froid cumulé »). Une épaisseur en cm, intégrée avec le
     manteau : elle ne prend QUE l'hiver, vite par nuit claire (le rayonnement), plus
     lentement sous un ciel couvert, à peine de jour ; le soleil (faible l'hiver) et la
     pluie la rongent, l'air doux des autres saisons la fait partir en quelques heures.
     Réglé au banc (la vraie météo d'hiver, trente jours) : une nuit claire prend
     ~1,5 cm (tout sauf le plus creux), une nuit couverte ~0,6 cm (le pourtour), un
     beau jour d'hiver en rend ~0,5 — il faut DEUX nuits froides pour prendre le
     centre ; une journée de pluie défait une glace mince. (Premier jet deux fois plus
     rapide : tout l'étang gelait dès la première nuit, ce n'était plus du froid
     cumulé.)
     Chaque pixel gèle à SON seuil (`glace.js`, `iceThreshold`) : de 0,12 cm au bord à
     1,6 cm au plus creux — la glace part des berges et gagne le centre. */
  ICE_NIGHT: 0.05, ICE_NIGHT_CLEAR: 0.08, ICE_DAY: 0.02, ICE_SNOW: 0.03,
  ICE_SUN: 0.12, ICE_RAIN: 0.6, ICE_WARM: { winter: 0, spring: 0.8, summer: 3, autumn: 0.5 }, ICE_MAX: 12,
  ICE_T0: 0.12, ICE_T1: 1.6,
  /* ⚠️⚠️ 2026-10-04 — LE LAC DU SUD NE LIT PAS `ice`, ET C'EST UNE MESURE, PAS UN GOÛT
     (Guillaume : « gelé occasionnellement » ; tranché : « rarement, depuis la rive »).
     `ice` est intégré sur la fenêtre du manteau, qui REPART DE ZÉRO quatre jours plus
     tôt à 6 h : il monte tout le jour et perd ~1,2 cm d'un coup à chaque changement
     de jour. Seuillé, il faisait geler et dégeler le lac TOUS LES JOURS, quatre
     minutes réelles à chaque fois (mesuré sur 900 jours d'hiver) — une dent de scie
     de la fenêtre, pas une vague de froid.
     Le lac lit donc `lakeCold` : le gain net de glace (la MÊME formule que l'étang,
     `iceRate`) sommé sur les QUATRE DERNIERS JOURS ENTIERS, de cette heure-ci à
     cette heure-ci — une fenêtre glissante calée sur la journée n'oscille plus,
     elle ne bouge qu'avec le temps qu'il fait. Mesuré sur 1 200 jours d'hiver :
     p75 5,14, p90 5,54, p95 5,75, p99 6,25, au plus 6,92. Seuils : la rive prend à
     `LAKE_K0`, le large (au-delà de `LAKE_DREF` cases de toute terre) à `LAKE_K1`.
     `verify-neige` imprime ce que ça donne : la part de l'hiver où l'on peut patiner,
     la fréquence et la durée des vagues. */
  LAKE_K0: 5.35, LAKE_K1: 6.35, LAKE_DREF: 7,
};
/* Les secondes RÉELLES par heure de jeu : le « retard » des carpes (`iceLag`) se compte
   dans le temps de la faune, qui est le temps réel (faune.js, `env.t`). */
const REAL_S_PER_GAME_H = 60 * (C.DAY_REAL_MS / 1000) / (C.DAY_END_MIN - C.DAY_START_MIN);
/* La part de l'étang prise par la glace (0..1) : la même rampe que les seuils des
   pixels, bruit compris (± 0,15 cm). Une approximation d'aire, pas un compte : elle ne
   sert qu'à ralentir les carpes et à poser la neige sur la glace. */
export function iceCover(ice) {
  const a = NEIGE.ICE_T0 - 0.1, b = NEIGE.ICE_T1 + 0.15;
  return smooth01((ice - a) / (b - a));
}
/* Le soleil : lever et coucher par saison, en heures — depuis la phase 12c, LA table du
   ciel (`C.SUN_HOURS`) : la fonte et la lumière ne peuvent plus diverger. */
/* 2026-09-29 (phase 12c) : LA table du lever et du coucher, celle du ciel (fermeConstants.js).
   2026-10-05 : lue par l'ÉTIQUETTE de la saison (`WX.sunHoursOfTag`, meteo.js § 0 bis) —
   la table telle quelle au cœur de la saison, l'interpolation du ciel à sa fin. */
export function sunAt(hour, season) {
  const [a, b] = WX.sunHoursOfTag(season);
  const h = ((hour % 24) + 24) % 24;
  if (h <= a || h >= b) return 0;
  const s = Math.sin(Math.PI * (h - a) / (b - a));
  return s * Math.sqrt(s);              // un soleil bas chauffe peu
}
/* La chute, en cm par heure de jeu, pour une intensité `snow` (0..1). */
export const fallRate = (snow) => (snow > 0 ? NEIGE.FALL_CM_H * Math.pow(snow, NEIGE.FALL_EXP) : 0);

/* ── 2. LE MANTEAU ─────────────────────────────────────────────────────────
   L'état : g (sol ouvert, au soleil), s (sol à l'ombre), r (chaussée), berm
   (congère du chasse-neige), rh (toit chauffé), rc (toit froid), tl / tc
   (charge des feuillus / des conifères), since (minutes de jeu depuis la
   dernière vraie chute). Tout en cm, sauf les charges. */
/* 2026-09-30 : `ice` (cm, l'étang), `si` (cm de neige posée SUR la glace — celle qui
   tombe dans l'eau libre y fond), `iceLag` (secondes réelles de « temps gelé » : les
   carpes vivent à `t − iceLag`, donc ralentissent avec la glace et se figent quand elle
   couvre tout, sans jamais sauter). ⚠️ UN CHAMP DE PLUS SE DÉCLARE DANS LES DEUX
   LIGNES : `clonePack` recopie champ par champ, un champ oublié s'effacerait (§4). */
const zeroPack = () => ({ g: 0, s: 0, r: 0, berm: 0, rh: 0, rc: 0, tl: 0, tc: 0, since: 1e6, ice: 0, si: 0, iceLag: 0 });
const clonePack = (p) => ({ g: p.g, s: p.s, r: p.r, berm: p.berm, rh: p.rh, rc: p.rc, tl: p.tl, tc: p.tc, since: p.since, ice: p.ice, si: p.si, iceLag: p.iceLag });
function relax(v, gain, unload, dtH) {
  const k = gain + unload;
  if (k <= 0) return v;
  const eq = gain / k;
  return eq + (v - eq) * Math.exp(-k * dtH);
}
/* La glace (voir `NEIGE.ICE_*`) : ce qu'elle gagne (cm/h) sous le temps `W` à l'heure
   `hour`. La nuit se lit au soleil BRUT (avant les nuages) ; la clarté du ciel, à
   `dark`. 2026-10-04 : sortie de `packStep` pour que le lac (`lakeCold`) somme la
   MÊME grandeur que l'étang intègre — deux formules auraient divergé au premier
   réglage. Les opérations sont celles d'avant, dans le même ordre : l'étang n'a pas
   bougé d'un bit (`render-glace`). */
/* 2026-10-05 — `season` est une ÉTIQUETTE (meteo.js § 0 bis). La glace ne prend que
   l'hiver (sa BASE) ; l'air doux, le soleil et la fonte glissent vers ceux de la saison
   suivante à mesure que la fin de saison avance (`WX.seasonMix`) — la fin de l'hiver
   rend le lac, l'étang et la neige au printemps qui vient, au lieu de les lui laisser
   d'un coup le lundi. Au cœur de la saison, les valeurs exactes d'avant. */
export function iceRate(W, hour, season) {
  const N = NEIGE;
  const sun = sunAt(hour, season) * Math.max(0, 1 - 1.25 * W.dark) * Math.max(0, 1 - 3 * W.snow);
  const sun0 = sunAt(hour, season);
  let grow = 0;
  if (WX.seasonBase(season) === "winter") {
    grow = sun0 <= 0 ? N.ICE_NIGHT + N.ICE_NIGHT_CLEAR * Math.max(0, 1 - W.dark) : N.ICE_DAY * (1 - sun0);
    if (W.snow > 0.05) grow += N.ICE_SNOW;
  }
  const iceMelt = sun * N.ICE_SUN + W.rain * N.ICE_RAIN + WX.seasonMixTo(N.ICE_WARM, N.ICE_WARM_LATE, season, 0);
  return grow - iceMelt;
}
/* Un pas de `dtH` heures sous le temps `W`, à l'heure `hour`. */
export function packStep(st, W, dtH, hour, season) {
  const N = NEIGE;
  const f = fallRate(W.snow);
  /* Le soleil : caché par le ciel (`dark`) et nul quand il neige. */
  const sun = sunAt(hour, season) * Math.max(0, 1 - 1.25 * W.dark) * Math.max(0, 1 - 3 * W.snow);
  const warm = WX.seasonMixTo(N.WARM_MELT, N.WARM_MELT_LATE, season, 0), rain = W.rain * N.RAIN_MELT;
  const sunM = sun * WX.seasonMixTo(N.SUN_MELT, N.SUN_MELT_LATE, season, 0);
  const mOpen = sunM + warm + rain, mShade = sunM * N.SHADE_SUN + warm + rain;
  st.g = Math.max(0, st.g + (f - mOpen) * dtH - st.g * N.SETTLE_H * dtH);
  st.s = Math.max(0, st.s + (f - mShade) * dtH - st.s * N.SETTLE_H * dtH);
  st.r = Math.max(0, st.r + (f - (sunM * N.ROAD_SUN + warm + rain + N.ROAD_MELT)) * dtH);
  if (st.r > N.ROAD_CAP) { st.berm += st.r - N.ROAD_CAP; st.r = N.ROAD_CAP; }
  st.berm = Math.max(0, st.berm - mShade * 0.8 * dtH);
  st.rh = Math.min(N.ROOF_MAX, Math.max(0, st.rh + (f - (sunM * N.ROOF_SUN + warm + rain + N.ROOF_HEAT)) * dtH));
  st.rc = Math.min(N.ROOF_MAX, Math.max(0, st.rc + (f - (sunM * N.ROOF_SUN * 0.9 + warm + rain)) * dtH));
  const gain = f * N.TREE_GAIN;
  const unl = W.wind * N.TREE_WIND + sun * N.TREE_SUN + W.rain * N.TREE_RAIN + warm * 0.8;
  st.tl = relax(st.tl, gain, N.TREE_BASE + unl, dtH);
  st.tc = relax(st.tc, gain, N.TREE_BASE_CONIFER + unl, dtH);
  st.since = f > 0.25 ? 0 : st.since + dtH * 60;
  st.ice = Math.min(N.ICE_MAX, Math.max(0, st.ice + iceRate(W, hour, season) * dtH));
  const cov = iceCover(st.ice);
  /* La neige sur la glace : ce qui tombe sur la part gelée, fondu comme le sol ouvert,
     jamais plus que le sol (elle ne s'y accumule pas mieux) ; une glace qui s'en va
     l'emporte. */
  st.si = Math.max(0, st.si + (f * cov - mOpen) * dtH - st.si * N.SETTLE_H * dtH);
  st.si = cov < 0.05 ? 0 : Math.min(st.si, st.g);
  st.iceLag += cov * dtH * REAL_S_PER_GAME_H;
  return st;
}
const DAY_A = C.DAY_START_MIN, DAY_B = C.DAY_END_MIN;
/* Une journée entière, de `DAY_START_MIN` à `DAY_END_MIN`. ⚠️ La nuit de 2 h à
   6 h n'existe pas dans le jeu (le jour suivant repart à 6 h) : on ne l'intègre
   pas, sinon le manteau fondrait dans une nuit que personne ne voit. */
function integrate(st, day, season, force, t0, t1, place) {
  const S = NEIGE.STEP_MIN;
  for (let t = t0; t + S <= t1 + 1e-9; t += S) {
    const W = WX.weatherAt(day, t + S / 2, season, force, place);
    packStep(st, W, S / 60, (t + S / 2) / 60, season);
  }
  return st;
}
/* ⚠️ MIS EN CACHE PAR (jour, saisons des jours remontés, forçage) : le passé ne
   change jamais, et « aujourd'hui » avance par PAS FIXES depuis 6 h — deux
   clients (ou deux images) qui demandent la même minute rendent le même
   nombre au bit près, quelle que soit la cadence à laquelle ils l'ont lue. */
const packMemo = new Map();
/* `seasonOfDay(d)` → "winter"… : la saison de CE jour-là (le jeu la lit à
   l'heure réelle de son début, `seasonAt(dayStartAt − k·DAY_REAL_MS)` — une
   saison qui bascule laisse fondre la neige de la semaine d'avant au lieu de
   l'effacer d'un coup). `force` : le forçage du menu dev (meteo.js). */
export function snowPack(day, tm, seasonOfDay, force, place) {
  day = Math.max(1, day | 0);
  const d0 = Math.max(1, day - NEIGE.WINDOW_DAYS);
  const keys = [];
  for (let d = d0; d <= day; d++) keys.push(seasonOfDay(d));
  const fk = force ? `${force.day}:${force.kind}:${Math.round(force.at * 10)}` : "";
  const key = `${day}|${keys.join(",")}|${fk}|${place === "farm" ? "farm" : "town"}`;
  let rec = packMemo.get(key);
  if (!rec) {
    const st = zeroPack();
    for (let d = d0; d < day; d++) integrate(st, d, keys[d - d0], force, DAY_A, DAY_B, place);
    rec = { start: st, cur: clonePack(st), at: DAY_A };
    if (packMemo.size > 24) packMemo.clear();
    packMemo.set(key, rec);
  }
  const season = keys[keys.length - 1];
  const S = NEIGE.STEP_MIN;
  const t = Math.max(DAY_A, Math.min(DAY_B, tm));
  const tq = DAY_A + Math.floor((t - DAY_A) / S) * S;
  if (tq < rec.at) { rec.cur = clonePack(rec.start); rec.at = DAY_A; }
  if (tq > rec.at) { integrate(rec.cur, day, season, force, rec.at, tq, place); rec.at = tq; }
  const out = clonePack(rec.cur);
  if (t > rec.at + 1e-6) {
    const W = WX.weatherAt(day, (rec.at + t) / 2, season, force, place);
    packStep(out, W, (t - rec.at) / 60, ((rec.at + t) / 2) / 60, season);
  }
  return out;
}

/* ── 2 bis. LE FROID DU LAC (2026-10-04) ─────────────────────────────────────
   Le gain net de glace (`iceRate`, cm) sommé sur les QUATRE DERNIERS JOURS ENTIERS,
   de l'heure `tm` du jour `day − 4` à l'heure `tm` du jour `day` — le pourquoi est
   sur `NEIGE.LAKE_K0`. Non borné (un dégel le fait descendre sous zéro) : c'est
   une mesure du froid, pas une épaisseur.
   ⚠️ MÉMOÏSÉ PAR JOUR : la somme cumulée d'une journée (un pas par `STEP_MIN`) ne
   dépend que de sa météo, de sa saison et du forçage s'il la touche ; une image
   n'en lit que cinq entrées et une interpolation. Deux joueurs lisent donc le même
   nombre au bit près, comme le manteau (§3). */
const lakeMemo = new Map();
function lakeDayCum(d, season, force, place) {
  const forced = force && force.day === d;
  const fk = forced ? `${force.kind}:${Math.round(force.at * 10)}` : "";
  const key = `${d}|${season}|${fk}|${place === "farm" ? "farm" : "town"}`;
  let cum = lakeMemo.get(key);
  if (!cum) {
    const S = NEIGE.STEP_MIN, n = Math.round((DAY_B - DAY_A) / S);
    cum = new Float64Array(n + 1);
    for (let k = 0; k < n; k++) {
      const tm = DAY_A + (k + 0.5) * S;
      cum[k + 1] = cum[k] + iceRate(WX.weatherAt(d, tm, season, forced ? force : null, place), tm / 60, season) * (S / 60);
    }
    if (lakeMemo.size > 48) lakeMemo.clear();
    lakeMemo.set(key, cum);
  }
  return cum;
}
export function lakeCold(day, tm, seasonOfDay, force, place) {
  day = Math.max(1, day | 0);
  const S = NEIGE.STEP_MIN;
  const u = (Math.max(DAY_A, Math.min(DAY_B, tm)) - DAY_A) / S;
  const k = Math.min(Math.floor(u), Math.round((DAY_B - DAY_A) / S) - 1), f = u - k;
  const at = (cum) => cum[k] + (cum[k + 1] - cum[k]) * f;     // la somme du jour jusqu'à `tm`
  let sum = 0;
  for (let d = day - 4; d <= day; d++) {
    if (d < 1) continue;
    const cum = lakeDayCum(d, seasonOfDay(d), force, place);
    if (d === day - 4) sum += cum[cum.length - 1] - at(cum);   // ce qui reste de ce jour-là après `tm`
    else if (d === day) sum += at(cum);
    else sum += cum[cum.length - 1];
  }
  return sum;
}
/* L'état d'un arbre (0 nu, 1 légèrement enneigé, 2 alourdi) et le fondu entre
   deux états. `jit` (0..1, un hachage de la case) décale les seuils d'un arbre
   à l'autre : sous une neige qui monte, les arbres ne basculent pas tous à la
   même seconde (ce qui se lirait comme un défaut d'affichage — le « cœur qui
   bat » des arbres du 438). Rend { a, b, k } : dessiner l'état `a`, puis
   l'état `b` par-dessus à l'opacité `k`. */
export function treeSnowMix(load, jit) {
  const N = NEIGE, j = (jit - 0.5) * 0.08, w = 0.06;
  const l1 = N.STATE_LIGHT + j, l2 = N.STATE_HEAVY + j;
  if (load < l1 - w) return { a: 0, b: 0, k: 0 };
  if (load < l1 + w) return { a: 0, b: 1, k: smooth01((load - (l1 - w)) / (2 * w)) };
  if (load < l2 - w) return { a: 1, b: 1, k: 0 };
  if (load < l2 + w) return { a: 1, b: 2, k: smooth01((load - (l2 - w)) / (2 * w)) };
  return { a: 2, b: 2, k: 0 };
}
function smooth01(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
/* Le même fondu entre trois niveaux, pour une ÉPAISSEUR (cm) : les clôtures, les
   haies, les potagers — rien (< 0,8 cm), une neige légère, une neige épaisse
   (> 5 cm). `jit` décale le seuil d'un ouvrage à l'autre. */
export function depthSnowMix(cm, jit) {
  const j = ((jit || 0.5) - 0.5) * 0.6, w = 0.5;
  const l1 = 0.8 + j, l2 = 5 + j * 3;
  if (cm < l1 - w) return { a: 0, b: 0, k: 0 };
  if (cm < l1 + w) return { a: 0, b: 1, k: smooth01((cm - (l1 - w)) / (2 * w)) };
  if (cm < l2 - 1) return { a: 1, b: 1, k: 0 };
  if (cm < l2 + 1) return { a: 1, b: 2, k: smooth01((cm - (l2 - 1)) / 2) };
  return { a: 2, b: 2, k: 0 };
}

/* ── 3. LE HACHAGE, LE BRUIT, LE BRUIT BLEU ─────────────────────────────────
   Du bruit DE VALEUR à la coordonnée monde (px d'art) : le même pixel a la
   même valeur dans toutes les parcelles et chez les deux joueurs. */
export function h32(x, y, s) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x165667b1, 0x85ebca77) ^ Math.imul(s | 0, 0xc2b2ae3d);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; h = Math.imul(h, 0x297a2d39); h ^= h >>> 15;
  return h >>> 0;
}
const u01 = (x, y, s) => h32(x, y, s) / 4294967296;
function vnoise(x, y, sc, s) {
  const fx = x / sc, fy = y / sc, ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = u01(ix, iy, s), b = u01(ix + 1, iy, s), c = u01(ix, iy + 1, s), d = u01(ix + 1, iy + 1, s);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;   // 0..1
}
/* LE BRUIT BLEU, 64 × 64 : le SEUIL DU TRAMAGE. ⚠️ C'est lui, et pas un bruit
   blanc, qui fait le grain poudreux : un bruit blanc AGGLUTINE ses pixels (des
   grumeaux, puis des trous — le « crépi » du premier jet), un bruit bleu les
   ÉCARTE régulièrement, sans motif lisible (une trame de Bayer, elle, se lit
   comme une grille). Construit par remplissage des vides (la seconde moitié de
   « void-and-cluster », Ulichney 1993) : à chaque rang, le pixel le plus loin de
   tous les précédents — énergie gaussienne torique, départage par hachage.
   ~30 ms, une fois ; la même table chez tous les clients. */
let BLUE = null;
export function blueNoise() {
  if (BLUE) return BLUE;
  const N = 64, NN = N * N, R = 5, s2 = 2 * 1.7 * 1.7;
  const E = new Float32Array(NN), on = new Uint8Array(NN), rank = new Uint16Array(NN);
  const K = [];
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) K.push(dx, dy, Math.exp(-(dx * dx + dy * dy) / s2));
  for (let i = 0; i < NN; i++) E[i] = u01(i % N, (i / N) | 0, 91) * 1e-4;
  for (let r = 0; r < NN; r++) {
    let best = 0, bv = Infinity;
    for (let i = 0; i < NN; i++) if (!on[i] && E[i] < bv) { bv = E[i]; best = i; }
    on[best] = 1; rank[best] = r;
    const bx = best % N, by = (best / N) | 0;
    for (let k = 0; k < K.length; k += 3) E[((by + K[k + 1]) & 63) * N + ((bx + K[k]) & 63)] += K[k + 2];
  }
  BLUE = new Uint8Array(NN);
  for (let i = 0; i < NN; i++) BLUE[i] = Math.floor(rank[i] * 256 / NN);
  return BLUE;
}

/* ── 4. CE QUE REÇOIT CHAQUE CASE ──────────────────────────────────────────
   Trois champs À LA CASE, calculés une fois par carte (mémo) et lus en
   bilinéaire au pixel (une ombre ne s'arrête pas au bord d'une case) :
   · `shelter` — la part de la chute qui arrive au sol : moins sous la couronne
     d'un arbre (la neige reste dans les branches) ;
   · `shade` — l'ombre, au SUD-EST de ce qui se dresse (la lumière du jeu vient
     du nord-ouest) : la neige y tient plus longtemps (§2, `s`), et elle y est
     plus bleue ;
   · `drift` — la CONGÈRE : le vent pousse les flocons vers l'est (`meteo.js`,
     `wind` fait dériver la neige qui tombe vers la droite) ; elle s'entasse à
     l'abri d'un mur, d'une haie, d'une maison (à l'est), et le côté exposé (à
     l'ouest) est balayé. */
export const TREE_CANOPY_R = { young: 0.9, planted: 0.9, adult: 1.4, short: 1.9, tall: 2.1 };
const FIELD_MEMO = new WeakMap();
/* `trees` : [{ x, y, r }] (cases) — les couronnes, fournies par l'appelant (qui
   connaît les tailles, fermeArt.js). `tall(i)` : la case i porte un ouvrage qui
   se dresse (maison, mur, haie, clôture…). */
export function snowTileFields(tw, trees, tall) {
  const hit = FIELD_MEMO.get(tw);
  if (hit) return hit;
  const W = tw.w, H = tw.h, N = W * H;
  const shelter = new Float32Array(N).fill(1), shade = new Float32Array(N), drift = new Float32Array(N);
  for (const t of trees) {
    const R = t.r || TREE_CANOPY_R[t.size] || 1.4, R2 = Math.ceil(R + 1);
    for (let dy = -R2; dy <= R2; dy++) for (let dx = -R2; dx <= R2; dx++) {
      const x = t.x + dx, y = t.y + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x;
      // L'abri : sous la couronne, centrée un peu au nord du pied (elle monte à l'écran).
      const d = Math.hypot(dx, dy + 0.6) / R;
      if (d < 1) shelter[i] = Math.min(shelter[i], 0.42 + 0.58 * d * d);
      // L'ombre : la couronne décalée d'une case au sud-est.
      const e = Math.hypot(dx - 0.9, dy - 0.6) / (R * 0.95);
      if (e < 1) shade[i] = Math.max(shade[i], 0.75 * (1 - e * e));
    }
  }
  const isTall = new Uint8Array(N);
  for (let i = 0; i < N; i++) isTall[i] = tall(i) ? 1 : 0;
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? isTall[y * W + x] : 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (isTall[i]) continue;
    let sh = shade[i];
    if (at(x - 1, y - 1)) sh = Math.max(sh, 0.85);
    if (at(x - 1, y)) sh = Math.max(sh, 0.7);
    if (at(x, y - 1)) sh = Math.max(sh, 0.55);
    if (at(x - 2, y - 1) || at(x - 2, y)) sh = Math.max(sh, 0.4);
    shade[i] = sh;
    let dr = 0;
    if (at(x - 1, y)) dr += 0.45;
    else if (at(x - 2, y)) dr += 0.22;
    if (at(x - 1, y - 1) || at(x - 1, y + 1)) dr += 0.12;
    if (at(x + 1, y)) dr -= 0.18;
    drift[i] = dr;
  }
  /* ⚠️ LISSÉS (deux flous de 3 × 3) : un champ à la case, lu en bilinéaire,
     dessinait des rectangles — la rampe d'une congère suivait le bord des cases,
     et l'éclairage du relief en faisait des bandes bleues (vu en jeu). */
  const blur = (F) => {
    const tmp = new Float32Array(N);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let a = 0, n = 0;
        for (let d = -1; d <= 1; d++) { const xx = x + d; if (xx >= 0 && xx < W) { a += F[y * W + xx]; n++; } }
        tmp[y * W + x] = a / n;
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let a = 0, n = 0;
        for (let d = -1; d <= 1; d++) { const yy = y + d; if (yy >= 0 && yy < H) { a += tmp[yy * W + x]; n++; } }
        F[y * W + x] = a / n;
      }
    }
  };
  blur(shade); blur(drift);
  // Sous un ouvrage, rien ne se dépose (le flou y a fait couler ses voisins).
  for (let i = 0; i < N; i++) if (isTall[i]) { drift[i] = 0; }
  const out = { shelter, shade, drift, W, H };
  FIELD_MEMO.set(tw, out);
  return out;
}
function bil(F, W, H, fx, fy) {
  const x = fx - 0.5, y = fy - 0.5, ix = Math.floor(x), iy = Math.floor(y), tx = x - ix, ty = y - iy;
  const g = (xx, yy) => F[Math.min(H - 1, Math.max(0, yy)) * W + Math.min(W - 1, Math.max(0, xx))];
  const a = g(ix, iy), b = g(ix + 1, iy), c = g(ix, iy + 1), d = g(ix + 1, iy + 1);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/* ── 5. LA PARCELLE : CE QUI NE CHANGE PAS ─────────────────────────────────
   Une parcelle = CH × CH px d'art (8 × 8 cases), plus une marge d'un pixel (le
   relief a besoin des voisins pour s'éclairer : sans elle, une couture tous
   les 128 px). Par pixel, tout ce qui ne dépend pas de l'épaisseur :
   · sa CLASSE et ce qu'il REÇOIT (l'abri d'un arbre, la congère) ;
   · le RELIEF DU SOL sous la neige (`lump` : les touffes, les mottes, les
     cailloux — une neige mince les épouse, une épaisse les noie), les RIDES DU
     VENT (`rip` : des crêtes nord-sud, le vent vient de l'ouest, par plaques),
     l'ONDULATION large (`und`) et le bruit FIN (`fine` : l'herbe qui perce) ;
   · les OMBRES PORTÉES (`cast`) : au sud-est de tout ce qui se dresse (la
     lumière du jeu vient du nord-ouest), à la hauteur de l'ouvrage — ajourées
     sous une clôture (on lit sa hauteur au voxel), en dentelle sous un arbre nu
     (on projette son dessin). Et l'OCCLUSION (`ao`) : la neige s'assombrit au
     pied de ce qui se dresse, de tous côtés ;
   · sous les arbres, les DÉBRIS tombés sur la neige (`deb` : brindilles,
     feuilles sèches, aiguilles, cônes, pompons de mimosa) et les CRATÈRES des
     paquets tombés des branches (`pit`).
   ⚠️ STOCKÉ SERRÉ (un octet par grandeur et par pixel, avec son échelle) : une
   parcelle en flottants pesait 350 Ko, et on en garde une centaine. */
export const CH = 128;
export const SZ = CH + 2;
/* 2026-09-29 — `TILLED` : la terre labourée de la FERME (le champ, arrosé ou non,
   l'herbe qui repousse). Guillaume : « neige fine, sillons lisibles » — la neige
   remplit le creux des sillons et laisse la crête de terre à nu, jamais plus de
   quelques centimètres (§6) : on voit toujours où l'on a travaillé. */
export const CL = { NONE: 0, GRASS: 1, LAWN: 2, SOFT: 3, STONE: 4, STREET: 5, STAIR: 6, DECK: 7, RAIL: 8, SHORE: 9, TILLED: 10 };
const Q_RECV = 100;
export const Q_AUX = 32;
/* La marge des ombres portées au nord-ouest : 40 px × SHADOW_K, plus la pénombre. */
const MG = 24, MA = 5;
/* Le relief du sol sous la neige, par classe (cm) : la prairie est bosselée,
   la pelouse l'est à peine, une dalle ne l'est pas. */
const LUMP_CM = [0, 3.2, 1.3, 1.6, 0, 0, 0, 0, 0, 2.4, 0];
/* Les débris : brindille sombre, brindille, feuille brune, feuille fauve,
   aiguilles sombres, aiguilles, cône, pompon de mimosa, rameau de bouleau. */
const DEBRIS = ["", "#3d3029", "#584536", "#83582f", "#a37744", "#2a4030", "#3c593a", "#5a3e28", "#e0bb33", "#7a4335"].map((s) => (s ? [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)] : null));
/* `env` : { waterAt(wx, wy), stairTread(x, y, lx, ly) → 0..1 (la marche : 1 sur
   le giron éclairé, 0 sur la contremarche), jointAt(x, y, lx, ly) → 0..1 (un
   joint de dallage ou de pavés), casterAt(wx, wy) → px (ce qui se dresse),
   treeShadow(t, k, ky) → l'ombre projetée d'un arbre, trees, fields (§4) }.
   ⚠️ 2026-09-29 — `classify(x, y, i, g, lx, ly, wx, wy)` : UNE AUTRE CARTE QUE LA
   VILLE (la ferme, `A.farmSnowEnv`) dit elle-même ce qu'est chacun de ses pixels —
   { c, r, ax } ou null (pas de neige : l'eau, le passage sombre). Sans lui, la
   lecture de la ville ci-dessous (fontaine, rails, rues, marches) ; avec lui, AUCUNE
   constante de la ville n'est lue — le piège des deux cartes (§4 de CLAUDE.md) :
   la fontaine de la ville tombe au milieu d'un pré de la ferme. */
/* ⚠️ 2026-09-29 — `only` : { st, px0, py0, px1, py1 } (pixels de la parcelle, marge
   comprise). Au lieu de tout rebâtir, ne REFAIT QUE la lecture du sol de ces pixels
   dans une parcelle existante (classe, réception, sillons, bruit, ordre de
   couverture) — ni ombres portées, ni arbres, qui ne dépendent que des OBJETS. C'est
   ce qui rend le labour sous la neige gratuit sur la ferme : rebâtir une parcelle
   coûte 14 à 80 ms (mesuré), la lecture d'une case et de ses voisines quelques-unes. */
export function buildChunkStatic(tw, cx, cy, env, only) {
  const W = tw.w, H = tw.h, NP = SZ * SZ;
  const P0 = only ? only.st : null;
  const cls = P0 ? P0.cls : new Uint8Array(NP), recv = P0 ? P0.recv : new Uint8Array(NP), shade = P0 ? P0.shade : new Uint8Array(NP), aux = P0 ? P0.aux : new Uint8Array(NP);
  const fine = P0 ? P0.fine : new Int8Array(NP), und = P0 ? P0.und : new Int8Array(NP), lump = P0 ? P0.lump : new Uint8Array(NP), rip = P0 ? P0.rip : new Int8Array(NP);
  const cast = P0 ? P0.cast : new Uint8Array(NP), ao = P0 ? P0.ao : new Uint8Array(NP), deb = P0 ? P0.deb : new Uint8Array(NP), pit = P0 ? P0.pit : new Int8Array(NP), cov = P0 ? P0.cov : new Uint8Array(NP);
  /* 2026-09-29 (audit pluie) — LE CANIVEAU VU DEPUIS LA BORDURE, lu par `pluie.js` seul (la
     neige ne le lit pas : ses congères gardent `aux`). `aux` mesure la distance au bord de la
     BANDE de rue, et la bordure (`kerbW`, 4 px, fermeArt.js) occupe justement ces pixels-là :
     la pluie posait son caniveau SUR la pierre levée — vu en jeu, le filet clair courait sur
     le trottoir. `gut` : 0 ailleurs, 255 sur la bordure, 1 + la distance au pied de la bordure
     (1 = le premier pixel de chaussée contre elle), par côté, et seulement là où une bordure
     est dessinée (le voisin n'est pas dallé, même test que `drawTownRoadTile`). */
  const gut = P0 ? P0.gut : new Uint8Array(NP);
  const pavedT = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const gg = tw.ground[y * W + x];
    return gg === C.G_PATH || gg === C.G_PATH_STONE;
  };
  const F = env.fields;
  const BN = blueNoise();
  const ox = cx * CH - 1, oy = cy * CH - 1;
  /* Le sens et les voies d'une rue (les ornières) : par case, en mémo local. */
  const laneMemo = new Map();
  const isStreet = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    const i = y * W + x;
    if (tw.ground[i] !== C.G_PATH || !tw.road) return false;
    const rd = tw.road[i];
    return rd === C.TR_ASPHALT || rd === C.TR_COBBLE;
  };
  const lanes = (x, y) => {
    const k = y * W + x;
    let v = laneMemo.get(k);
    if (v) return v;
    const horiz = (isStreet(x - 1, y) || isStreet(x + 1, y)) && !(isStreet(x, y - 1) && isStreet(x, y + 1) && !(isStreet(x - 1, y) && isStreet(x + 1, y)));
    let a, b;
    if (horiz) { a = y; while (isStreet(x, a - 1) && y - a < 6) a--; b = y; while (isStreet(x, b + 1) && b - y < 6) b++; }
    else { a = x; while (isStreet(a - 1, y) && x - a < 6) a--; b = x; while (isStreet(b + 1, y) && b - x < 6) b++; }
    v = { horiz, a: a * T, b: (b + 1) * T };
    laneMemo.set(k, v);
    return v;
  };
  const pyA = only ? Math.max(0, only.py0) : 0, pyB = only ? Math.min(SZ - 1, only.py1) : SZ - 1;
  const pxA = only ? Math.max(0, only.px0) : 0, pxB = only ? Math.min(SZ - 1, only.px1) : SZ - 1;
  for (let py = pyA; py <= pyB; py++) for (let px = pxA; px <= pxB; px++) {
    const wx = ox + px, wy = oy + py, o = py * SZ + px;
    const x = Math.floor(wx / T), y = Math.floor(wy / T);
    if (only) { gut[o] = 0; aux[o] = 0; }
    if (x < 0 || y < 0 || x >= W || y >= H) { cls[o] = CL.NONE; continue; }
    const i = y * W + x, g = tw.ground[i], lx = wx - x * T, ly = wy - y * T;
    let c = CL.GRASS, r = 1, ax = 0;
    if (env.classify) {
      const k = env.classify(x, y, i, g, lx, ly, wx, wy);
      if (!k) { cls[o] = CL.NONE; continue; }
      c = k.c; r = k.r == null ? 1 : k.r; ax = k.ax || 0;
    } else {
    const inFtn = x >= C.TOWN_FOUNTAIN.x && x < C.TOWN_FOUNTAIN.x + 2 && y >= C.TOWN_FOUNTAIN.y && y < C.TOWN_FOUNTAIN.y + 2;
    if (!inFtn && env.waterAt(wx, wy)) { cls[o] = CL.NONE; continue; }
    if (g === C.G_TOWN_LAWN) c = CL.LAWN;
    else if (g === C.G_PATH_STONE || inFtn) { c = CL.STONE; r = 0.92; ax = env.jointAt(x, y, lx, ly); }
    else if (g === C.G_TOWN_STAIR) { c = CL.STAIR; ax = env.stairTread(x, y, lx, ly); r = 0.1 + 0.95 * ax; }
    else if (g === C.G_BRIDGE) { c = CL.DECK; ax = (ly % 4 === 3) ? 0 : 1; r = ax ? 0.95 : 0.35; }
    else if (g === C.G_PATH) {
      const rd = tw.road ? tw.road[i] : C.TR_NONE;
      if (rd === C.TR_ASPHALT || rd === C.TR_COBBLE) {
        c = CL.STREET;
        /* ⚠️ LES ORNIÈRES : deux par voie, aux mêmes fractions que les traces
           polies du goudron (`drawTownRoadTile`, 0,28 et 0,72 de la voie) — une
           voie au-delà de trois cases de large, deux voies. Elles ONDULENT (un
           bruit lissé le long de la rue, ±1 px) : une trace de pneu tirée à la
           règle se lit comme une peinture au sol. `aux` : 1 dans une ornière,
           0,5 sur le bourrelet de neige fondue qui la borde, 2 + la distance
           au bord (px) près d'un trottoir (la congère du chasse-neige). */
        const L = lanes(x, y);
        const s = L.horiz ? wy : wx, along = L.horiz ? wx : wy, wPx = L.b - L.a, nl = wPx >= 3 * T ? 2 : 1, lw = wPx / nl;
        const rel = s - L.a, lane = Math.min(nl - 1, Math.floor(rel / lw));
        const wob = (vnoise(along, lane * 131 + (L.horiz ? 0 : 7), 13, 7) - 0.5) * 2.6;
        const d1 = Math.abs(rel - (lane * lw + 0.28 * lw + wob)), d2 = Math.abs(rel - (lane * lw + 0.72 * lw + wob));
        const dt = Math.min(d1, d2);
        const edge = Math.min(rel, wPx - rel);
        ax = dt < 1.6 ? 1 : dt < 2.9 ? 0.5 : 0;
        if (edge < 5.9) ax = 2 + edge;
        const ta = Math.floor(L.a / T), tb = Math.floor(L.b / T);
        const kA = L.horiz ? !pavedT(x, ta - 1) : !pavedT(ta - 1, y), kB = L.horiz ? !pavedT(x, tb) : !pavedT(tb, y);
        const dA = kA ? rel - C.TOWN_KERB_PX : 1e9, dB = kB ? (wPx - 1 - rel) - C.TOWN_KERB_PX : 1e9, dk = Math.min(dA, dB);
        gut[py * SZ + px] = dk < 0 ? 255 : dk < 8 ? 1 + dk : 0;
      } else c = CL.SOFT;
    }
    else if (g === C.G_WATER) c = CL.GRASS;                // la rive gagnée par la berge
    if (x >= C.TOWN_RAIL_X && x <= C.TOWN_RAIL_X + 1) {
      // Les rails : le champignon d'acier (deux colonnes par voie) ne garde pas la neige.
      const col = (x - C.TOWN_RAIL_X) * T + lx;
      if (col === 7 || col === 8 || col === 23 || col === 24) { c = CL.RAIL; r = 0; }
    }
    }
    /* La berge — celle de la ville (`tw.shore`), ou la classe SHORE qu'une autre
       carte a donnée (le sable des rives de la ferme). */
    if ((tw.shore ? tw.shore[i] > 0 : c === CL.SHORE) && c !== CL.STREET && c !== CL.STAIR) {
      // La berge : la neige s'arrête un pixel avant la ligne d'eau, et s'amincit en s'en approchant.
      let near = 0;
      for (let d = 1; d <= 2 && !near; d++) if (env.waterAt(wx + d, wy) || env.waterAt(wx - d, wy) || env.waterAt(wx, wy + d) || env.waterAt(wx, wy - d)) near = d;
      if (near) { c = CL.SHORE; r *= near === 1 ? 0.35 : 0.7; }
    }
    const fx = wx / T, fy = wy / T;
    /* La congère est SCULPTÉE : le vent la creuse et la gonfle par endroits
       (un bruit large en module la hauteur) — un bourrelet régulier le long
       d'une haie se lirait comme un trottoir. */
    const shel = bil(F.shelter, F.W, F.H, fx, fy), dr = bil(F.drift, F.W, F.H, fx, fy) * (0.55 + 0.9 * vnoise(wx, wy, 14, 17));
    if (c !== CL.STREET) r *= shel * (1 + dr);
    /* 2026-09-29 — LA FONTE D'UN CRATÈRE CHAUD (`setMelts`, makeSnowField) : un trou
       brûlant ne garde pas la neige, et sa lisière s'effrange (l'ordre de couverture,
       §6, fait le reste : la terre mouillée apparaît pixel par pixel). */
    if (env.meltAt) { const mk = env.meltAt(wx + 0.5, wy + 0.5); if (mk < 1) r *= mk; }
    cls[o] = c; recv[o] = Math.round(Math.min(2.55, r) * Q_RECV); aux[o] = Math.round(Math.min(7.9, ax) * Q_AUX);
    shade[o] = Math.round(Math.min(1, bil(F.shade, F.W, F.H, fx, fy)) * 255);
    /* Le bruit fin : l'herbe perce une neige mince en BRINS (plus haut que
       large), la pierre en taches. */
    const blade = c === CL.GRASS || c === CL.SHORE;
    const fn = blade ? u01(wx, Math.floor(wy / 2) + (wx & 1), 11) * 0.55 + vnoise(wx, wy, 3, 12) * 0.45
                     : vnoise(wx, wy, 2.5, 13) * 0.6 + vnoise(wx, wy, 6, 14) * 0.4;
    fine[o] = Math.round((fn * 2 - 1) * 127);
    und[o] = Math.round(((vnoise(wx, wy, 22, 15) * 0.65 + vnoise(wx, wy, 9, 16) * 0.35) * 2 - 1) * 127);
    /* LES MOTTES : une bosse douce au plus par maille de 7 px (une sur deux),
       rayon 1,6 à 3,8 px — les touffes de la prairie, les cailloux, les mottes
       de terre, que la neige épouse. */
    let lu = 0;
    const mx = Math.floor(wx / 7), my = Math.floor(wy / 7);
    for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      const hh = h32(mx + k, my + j, 51);
      if ((hh & 255) > 140) continue;
      const bx = (mx + k) * 7 + ((hh >>> 8) & 7) * 0.85, by = (my + j) * 7 + ((hh >>> 11) & 7) * 0.85;
      const rr = 1.6 + ((hh >>> 14) & 15) / 15 * 2.2, amp = 0.35 + ((hh >>> 18) & 15) / 15 * 0.65;
      const q = ((wx + 0.5 - bx) ** 2 + (wy + 0.5 - by) ** 2) / (rr * rr);
      if (q < 1) { const v = amp * (1 - q) * (1 - q); if (v > lu) lu = v; }
    }
    lump[o] = Math.round(lu * 255);
    /* LES RIDES DU VENT (sastrugi) : des crêtes à peu près nord-sud (le vent
       vient de l'ouest), qui ondulent, au profil DISSYMÉTRIQUE — pente douce au
       vent, raide sous le vent — et par PLAQUES (là où le vent a pris). */
    const ph = (wx + (vnoise(wx, wy, 19, 33) - 0.5) * 16 + 3.5 * Math.sin(wy / 11 + wx * 0.04)) / 15;
    const fr = ph - Math.floor(ph), prof = fr < 0.62 ? fr / 0.62 : (1 - fr) / 0.38;
    const pv = vnoise(wx, wy, 26, 32), patch = pv < 0.45 ? 0 : pv > 0.75 ? 1 : (pv - 0.45) / 0.3;
    rip[o] = Math.round((prof - 0.5) * 2 * patch * 127);
    /* L'ORDRE DE COUVERTURE (Guillaume : « le dépôt et la fonte très
       progressifs ») : l'épaisseur qu'il faut ICI pour que le sol ne se voie
       plus, en fraction de la plage (§6). Des PLAQUES (bruit large : la neige
       prend d'abord par taches, fond par taches), un GRAIN (le bruit bleu : la
       lisière d'une plaque s'effrange pixel par pixel), et l'herbe dont les
       brins retiennent les premiers flocons. */
    const pk2 = vnoise(wx, wy, 13, 71) * 0.6 + vnoise(wx, wy, 5, 72) * 0.4;
    const ramp = Math.max(0, Math.min(1, (pk2 - 0.2) / 0.6));   // plus de contraste : des plaques, pas un semis
    cov[o] = Math.round(Math.max(0, Math.min(1, ramp * 0.74 + (BN[(wy & 63) * 64 + (wx & 63)] / 256) * 0.16 + (1 - fn) * (blade ? 0.12 : 0.06))) * 255);
  }
  if (only) return P0;
  /* ── LES OMBRES PORTÉES ET L'OCCLUSION ──────────────────────────────────
     La hauteur de ce qui se dresse, sur la parcelle et ses marges (au
     nord-ouest, d'où viennent les ombres ; de tous côtés, pour l'occlusion).
     Pour chaque pixel on remonte vers la lumière : un ouvrage de hauteur h,
     à t pas de là, le couvre si h·K ≥ t (pénombre d'un pas et demi). */
  const K = NEIGE.SHADOW_K, KY = NEIGE.SHADOW_KY;
  const GW = SZ + MG + MA, GH = SZ + MG + MA, gx0 = ox - MG, gy0 = oy - MG;
  const cH = new Uint8Array(GW * GH);
  let anyC = false;
  if (env.casterAt) {
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const v = env.casterAt(gx0 + x, gy0 + y);
      if (v) { cH[y * GW + x] = v; anyC = true; }
    }
  }
  if (anyC) {
    const TMAX = Math.ceil(40 * K) + 2;
    for (let py = 0; py < SZ; py++) for (let px = 0; px < SZ; px++) {
      const gx = px + MG, gy = py + MG, o = py * SZ + px;
      if (cH[gy * GW + gx]) continue;                       // sous l'ouvrage même
      let s = 0;
      for (let t = 1; t <= TMAX; t++) {
        const qx = gx - t, qy = gy - Math.round(t * KY);
        if (qx < 0 || qy < 0) break;
        const h = cH[qy * GW + qx];
        if (!h) continue;
        const v = (h * K - t) / 1.5 + 0.5;
        if (v > s) { s = v; if (s >= 1) { s = 1; break; } }
      }
      let a = 0;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const h = cH[(gy + dy) * GW + gx + dx];
        if (!h) continue;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 4.6) continue;
        const v = (1 - d / 5.2) * (1 - d / 5.2) * Math.min(1, h / 9);
        if (v > a) a = v;
      }
      cast[o] = Math.round(s * 255); ao[o] = Math.round(a * 255);
    }
  }
  /* ── LES ARBRES : leur ombre, leurs débris, les cratères de leurs paquets. */
  const cxw = cx * CH, cyw = cy * CH;
  for (const t of env.trees || []) {
    const R = (t.r || TREE_CANOPY_R[t.size] || 1.4) * T * 0.95;
    const tx = t.x * T + 8, ty = t.y * T + 14;
    if (tx + 70 < cxw - 1 || tx - R - 2 > cxw + CH + 1 || ty + 50 < cyw - 1 || ty - R - 2 > cyw + CH + 1) continue;
    const sh = env.treeShadow ? env.treeShadow(t, K, KY) : null;
    if (sh) {
      const sx0 = t.x * T + sh.ox - ox, sy0 = t.y * T + sh.oy - oy;
      for (let y = 0; y < sh.h; y++) {
        const py = sy0 + y;
        if (py < 0 || py >= SZ) continue;
        for (let x = 0; x < sh.w; x++) {
          const px = sx0 + x;
          if (px < 0 || px >= SZ) continue;
          const v = sh.a[y * sh.w + x];
          if (!v) continue;
          const o = py * SZ + px, w = Math.round(v * 0.9);
          if (w > cast[o]) cast[o] = w;
        }
      }
    }
    // Les débris sur la neige, sous la couronne ; plus serrés près du tronc.
    const sp = t.ever ? (t.kind === 6 ? [8, 8, 5] : [5, 6, 6, 7]) : t.kind === 2 ? [9, 1, 2] : [1, 2, 2, 3, 4];
    const x0 = Math.max(0, Math.floor(tx - R - ox)), x1 = Math.min(SZ - 1, Math.ceil(tx + R - ox));
    const y0 = Math.max(0, Math.floor(ty - R - oy)), y1 = Math.min(SZ - 1, Math.ceil(ty + R * 0.8 - oy));
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
      const wx = ox + px, wy = oy + py;
      const d = Math.hypot(wx + 0.5 - tx, (wy + 0.5 - ty) / 0.8) / R;
      if (d >= 1) continue;
      const p = 0.045 * Math.pow(1 - d, 1.3) + (d < 0.22 ? 0.03 : 0);
      const hh = h32(wx, wy, 41);
      if (hh / 4294967296 >= p) continue;
      const code = sp[(hh >>> 5) % sp.length], o = py * SZ + px;
      deb[o] = code;
      // Une brindille, une aiguille : deux pixels, dans un sens tiré.
      if ((code === 1 || code === 2 || code === 9 || code === 5) && (hh & 16)) {
        const dir = [[1, 0], [0, 1], [1, 1], [1, -1]][(hh >>> 9) & 3], qx = px + dir[0], qy = py + dir[1];
        if (qx >= 0 && qy >= 0 && qx < SZ && qy < SZ) deb[qy * SZ + qx] = code;
      }
    }
    // Les cratères des paquets tombés des branches : deux à cinq par arbre.
    const hn = h32(t.x, t.y, 43), np = 2 + (hn % 4);
    for (let k = 0; k < np; k++) {
      const hk = h32(t.x * 7 + k, t.y * 3 + k, 44);
      const ang = (hk & 1023) / 1024 * Math.PI * 2, rad = (0.3 + ((hk >>> 10) & 255) / 255 * 0.6) * R;
      const pcx = tx + Math.cos(ang) * rad - ox, pcy = ty + Math.sin(ang) * rad * 0.8 - oy;
      const pr = 1.3 + ((hk >>> 18) & 7) / 7 * 0.9;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const px = Math.round(pcx) + dx, py = Math.round(pcy) + dy;
        if (px < 0 || py < 0 || px >= SZ || py >= SZ) continue;
        const q = Math.hypot(px + 0.5 - pcx, (py + 0.5 - pcy) * 1.15) / pr;
        const o = py * SZ + px;
        if (q < 1) pit[o] = Math.max(pit[o], Math.round(55 * (1 - q * q)));
        else if (q < 1.6 && pit[o] <= 0) pit[o] = Math.min(pit[o], -Math.round(22 * (1 - (q - 1) / 0.6)));
      }
    }
  }
  return { cx, cy, cls, recv, shade, aux, fine, und, lump, rip, cast, ao, deb, pit, cov, gut };
}

/* ── 6. LA PARCELLE : LE RENDU ─────────────────────────────────────────────
   LA LUMIÈRE, pas une palette posée à la main : chaque pixel a une SURFACE
   (le relief du sol + l'épaisseur, creusée par les pas), donc une normale ;
   il reçoit le CIEL (l'ambiante, bleue, que l'occlusion rogne au pied des
   murs) et le SOLEIL (direct, depuis le nord-ouest, qu'arrêtent les ombres
   portées et, dans un creux profond, sa propre paroi). La valeur obtenue
   tombe sur une RAMPE de onze tons, du creux bleu-violet à l'éclat d'un blanc
   chaud, TRAMÉE PAR LE BRUIT BLEU (§3) : un dégradé devient un grain fin au
   lieu d'une courbe de niveau (le « camouflage » du premier jet, vu en jeu),
   et un aplat reçoit, à peine décalé du ton, le GRAIN POUDREUX qui le fait
   neige et pas peinture. Deux rampes : au SOLEIL (ombres franchement bleues,
   éclats chauds) et sous un CIEL COUVERT (gris bleuté, ombres molles) ; `P.sun`
   (0..1) passe de l'une à l'autre — la nuit, le couvert, que le ciel de
   `lumiere.js` multiplie ensuite comme toute la scène. */
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const SNOW_TONES = ["#8b9dbb", "#a9b8d0", "#c3cfe0", "#d9e2ed", "#e9eff6", "#f7f9fc"].map(hex);
export const SLUSH_TONES = ["#6d7079", "#868a93", "#9ea2aa", "#b5b8be", "#c9cbd0", "#dcdee1"].map(hex);
export const RAMP_SUN = ["#4b5a84", "#5c6e9a", "#6f83b0", "#8598c3", "#9badd3", "#b2c3e1", "#c8d6ed", "#dce6f5", "#edf2fa", "#f8fafd", "#fffdf6"].map(hex);
const RAMP_GREY = ["#555c6e", "#646c80", "#747c90", "#848c9f", "#949cae", "#a4abbc", "#b4bac9", "#c4c9d6", "#d3d8e2", "#e0e4ec", "#eaedf3"].map(hex);
/* La neige de la chaussée : tassée, salie par la boue qui remonte — un gris
   CHAUD (brun), plus sombre que la neige de la même lumière. */
const RAMP_SLUSH = ["#3c3a38", "#4d4a46", "#5f5b56", "#716c66", "#847f78", "#97928b", "#aaa59e", "#bbb7b1", "#cbc8c3", "#d8d6d2", "#e3e2df"].map(hex);
const WINTER_GRASS = [158, 146, 96];      // l'herbe dormante : olive paille
const rampMemo = new Map();
function rampFor(which, sun) {
  const k = which + Math.round(sun * 10);
  let r = rampMemo.get(k);
  if (r) return r;
  const s = Math.round(sun * 10) / 10;
  if (which === "s") r = RAMP_SUN.map((c, i) => c.map((v, j) => Math.round(RAMP_GREY[i][j] + (v - RAMP_GREY[i][j]) * s)));
  else r = RAMP_SLUSH.map((c) => c.map((v) => Math.round(v * (0.94 + 0.06 * s))));
  rampMemo.set(k, r);
  return r;
}
/* La lumière du nord-ouest, à ~44° au-dessus de l'horizon (normée). */
const LX = -0.52, LY = -0.46, LZ = 0.72;
const RELIEF_GAIN = 3.2;
const PX_CM = 7.4;                           // un pixel d'art ≈ 7,4 cm (13,5 px/m)
/* L'OMBRE PROPRE se calcule sous un soleil BAS (~21°, celui de l'hiver) et non
   sous celui de l'éclairage (~44°) : sous le second, une empreinte de 10 cm ne
   s'ombre même pas elle-même, et c'est l'ombre au fond d'un pas qui le fait lire. */
const TAN_D = 0.38 * Math.SQRT2 * PX_CM;      // la montée d'un rayon par pas diagonal (cm)
/* `pack` : le manteau (§2), `P` : les réglages de l'image — { winter, frost
   (0..1, la gelée blanche du matin), wetRoad (0..1), sun (0..1) }. `imp` : les
   empreintes (§7, ou null). Écrit les pixels RGBA de la parcelle dans `out`
   (CH × CH × 4) et rend la liste des éclats possibles (les « paillettes » qui
   scintillent au soleil, dessinées à part, à chaque image). */
export function renderChunk(st, pack, P, imp, out) {
  const NP = SZ * SZ, Dp = new Float32Array(NP), Sf = new Float32Array(NP);
  const ox = st.cx * CH - 1, oy = st.cy * CH - 1;
  const G = pack.g, Sd = pack.s;
  const sun = P.sun == null ? 1 : Math.max(0, Math.min(1, P.sun));
  const BN = blueNoise();
  /* Les bosses du sol traversent une neige mince et se noient dans une
     épaisse ; les rides du vent, elles, ne naissent que dans une neige assez
     profonde pour être soufflée ; l'ondulation large grandit avec elle. */
  const drape = Math.exp(-G / 11), ripA = Math.min(1, Math.max(0, (G - 3) / 9)) * 1.1, undA = Math.min(1.6, 0.25 + G * 0.07);
  for (let o = 0; o < NP; o++) {
    const c = st.cls[o];
    if (!c || c === CL.RAIL) continue;
    const f1 = st.fine[o] / 127, f2 = st.und[o] / 127, ax = st.aux[o] / Q_AUX;
    let d, rel = 0;
    if (c === CL.STREET) {
      /* LA CHAUSSÉE : une neige fondue en plaques (elle ne couvre jamais d'un
         tenant), chassée des ornières, relevée en bourrelet à leur bord. */
      /* LA CHAUSSÉE : de la neige TASSÉE (grise, salie), fondue en boue brune
         dans les ornières, relevée en bourrelet à leur bord. Quand elle
         s'amincit, elle part d'abord entre les ornières (tramé), puis dans les
         ornières : il reste une chaussée mouillée. */
      d = pack.r * Math.max(0, Math.min(1.6, 0.8 + 0.5 * f2 + 0.25 * f1));
      if (ax === 1) d *= 0.7;
      else if (ax === 0.5) d *= 1.3;
      if (ax >= 2 && pack.berm > 0.2) {
        /* La congère du chasse-neige, contre le trottoir : un bourrelet de
           quatre pixels, haut au bord, qui retombe vers la chaussée — en MOTTES
           (le chasse-neige casse la neige, il ne la lisse pas). */
        const e = ax - 2, prof = e < 1.5 ? 0.85 : e < 2.5 ? 1 : e < 3.5 ? 0.72 : e < 4.5 ? 0.38 : 0.12;
        const clod = 0.6 + 0.8 * (st.lump[o] / 255) + 0.25 * f2;
        d += Math.min(30, 2 + pack.berm * 0.6) * prof * clod;
      }
    } else {
      /* À l'ombre, la neige fond moins vite : l'ombre de la case, et au pixel
         l'ombre PORTÉE (§5) — à la fonte, le manteau survit dans l'ombre bleue
         des arbres et des maisons, et la dessine en blanc sur l'herbe. */
      const base = G + (Sd - G) * Math.max(st.shade[o] / 255, 0.9 * st.cast[o] / 255);
      d = base * (st.recv[o] / Q_RECV);
      /* ⚠️ 2026-09-29 — une ride du vent demande de la neige : là où le sol ne reçoit
         presque rien (le fond d'un cratère chaud, `setMelts`), elle en posait quand même
         jusqu'à 4 mm — des flocons au fond d'un trou brûlant (vu au banc). Sans effet au-delà
         d'un tiers de réception, c'est-à-dire partout en ville. */
      const rp = c === CL.GRASS || c === CL.LAWN || c === CL.SHORE || c === CL.SOFT ? (st.rip[o] / 127) * ripA * Math.min(1, st.recv[o] / Q_RECV * 3) : 0;
      d += rp * 0.35;
      /* 2026-09-29 — LE CHAMP LABOURÉ (Guillaume : « neige fine, sillons lisibles »).
         `ax` : 1 au creux du sillon, 0 sur la crête. La neige COMBLE le creux et
         laisse la crête presque nue ; les deux sont BORNÉS (3,2 cm au creux, une
         poussière de 3 mm sur la crête — à 1 cm, mesuré par `render-neige-ferme`, les
         trois quarts de la crête blanchissaient et le champ redevenait un pré) : même
         sous une tempête, le champ reste une rayure blanche et brune — on voit où l'on
         a labouré, arrosé, semé. La crête porte le relief (elle accroche la lumière). */
      if (c === CL.TILLED) {
        d = ax ? Math.min(3.2, d * 1.25) : Math.min(0.3, d * 0.4);
        rel = (1 - ax) * 1.5;
      }
      /* Les joints d'un dallage se remplissent les premiers : sous une neige
         mince, le dessin des pierres apparaît en creux blanc. */
      if (c === CL.STONE && base < 3) d += ax * Math.min(base, 3 - base) * 0.8;
      rel += (st.lump[o] / 255) * LUMP_CM[c] * drape;
      // Sur une motte, une neige mince est soufflée : son sommet perce le premier.
      if (rel > 0) d -= rel * 0.45 * Math.max(0, 1 - base / 7);
      /* ⚠️ LE RELIEF QUI S'ÉCLAIRE EST FORCÉ (×RELIEF_GAIN) : à 7,4 cm le pixel,
         une ride de 1 cm ou une motte de 2 cm ne tournent pas d'un demi-ton — un
         manteau physiquement juste serait un aplat. L'épaisseur (ce qui
         couvre, ce que creuse un pas) reste vraie ; seule la lumière exagère. */
      rel = (rel + rp * 0.55 + f2 * undA) * RELIEF_GAIN;
    }
    if (st.pit[o] && G > 1.5) d *= 1 - st.pit[o] / 100 * Math.min(1, (pack.tl + pack.tc) * 1.2 + 0.25);
    /* ⚠️ LE FOND D'UN PAS : sous une neige épaisse, il reste de la neige TASSÉE —
       le relief s'y creuse (la surface descend) mais le sol ne s'y voit pas
       (premier jet : de l'herbe verte au fond de chaque pas dans 12 cm, vu en
       jeu). Sous une neige mince (< 3 cm), le pas va bien jusqu'au sol. */
    const d0 = d;
    if (imp) {
      const k = imp((o % SZ) - 1, ((o / SZ) | 0) - 1);
      /* ⚠️ 2026-09-29 — sur la crête d'un labour, le bourrelet d'un pas (k < 0) ne relève
         pas une neige qui n'y est pas : il posait des taches blanches sur la terre nue. */
      if (k && !(k < 0 && c === CL.TILLED)) d *= 1 - k / 100;
    }
    if (d < 0) d = 0;
    Dp[o] = d0 > 3 ? Math.max(d, Math.min(d0, 3.2)) : d; Sf[o] = d + rel;
  }
  const RS = rampFor("s", sun), RL = rampFor("l", sun);
  const sunK = 0.18 + 0.42 * sun, ambK = 1 - sunK;
  /* LA COUVERTURE, PROGRESSIVE : un pixel est couvert quand l'épaisseur locale
     dépasse SON seuil — de COV0 (les brins, les creux : les premiers flocons y
     tiennent) à COV0 + COVR (les dessus de dalle, les plaques tardives) ; la
     pierre, qui garde la chaleur, demande plus que l'herbe. À la fonte, le même
     ordre à l'envers : les plaques s'ouvrent, s'élargissent, se rejoignent. */
  const COV0 = 0.06, COVR = 2.5, CLS_COV = [1, 1, 1.05, 1.1, 1.5, 1, 1.35, 0.85, 1, 1.1, 0.7];
  const falling = !!P.falling;
  const dout = out;
  const glints = [];
  const wx0 = st.cx * CH, wy0 = st.cy * CH;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
    const o = (y + 1) * SZ + (x + 1), q = (y * CH + x) * 4;
    const c = st.cls[o], dd = Dp[o];
    const wx = wx0 + x, wy = wy0 + y;
    const b1 = BN[(wy & 63) * 64 + (wx & 63)] / 256;
    const b2 = BN[((wy + 29) & 63) * 64 + ((wx + 17) & 63)] / 256;
    /* La lisière d'une neige mince est tramée, pas fondue en transparence : le
       sol apparaît PIXEL PAR PIXEL, comme sous une vraie neige qui s'amincit. */
    /* La chaussée : des PLAQUES de neige fondue (l'ordre de couverture, pas le
       bruit bleu seul — sous un centimètre, un seuil au pixel la semait de sel). */
    const need = c === CL.STREET ? 0.22 + 0.6 * st.cov[o] / 255 : (COV0 + COVR * Math.pow(st.cov[o] / 255, 1.3)) * CLS_COV[c];
    if (!c || c === CL.RAIL || dd < need) {
      dout[q + 3] = 0;
      /* LE SOL MOUILLÉ AUTOUR DES PLAQUES : là où la neige vient de partir (ou
         s'amincit sans couvrir), la terre et l'herbe sont trempées, plus
         sombres ; pendant la chute, elles sont au contraire saupoudrées. */
      /* 2026-09-29 — et le sol DÉGELÉ d'un cratère chaud (réception nulle sous un
         manteau : `setMelts`) est détrempé par l'eau de fonte — sans quoi l'anneau
         dégagé montrait une herbe d'été vive, une pelouse posée dans la neige. */
      const thawed = !st.recv[o] && c !== CL.NONE && G > 0.3;
      if (c && c !== CL.RAIL && c !== CL.STREET && (dd > 0.02 || thawed)) {
        const r = thawed ? 0.9 : Math.min(1, dd / need);
        if (falling) { if (b1 < r * 0.5) { dout[q] = 236; dout[q + 1] = 241; dout[q + 2] = 248; dout[q + 3] = 150; } }
        else { dout[q] = 24; dout[q + 1] = 30; dout[q + 2] = 36; dout[q + 3] = Math.round(34 + 50 * r); }
        continue;
      }
      if (c === CL.GRASS || c === CL.LAWN || c === CL.SHORE || c === CL.TILLED) {
        /* L'HIVER SANS NEIGE : l'herbe dort (olive paille), et le matin la
           gelée blanche givre les brins — et les crêtes d'un labour (2026-09-29 :
           la terre ne « dort » pas, elle ne prend que la gelée).
           2026-10-05 — LA GELÉE DE CE PIXEL passe de celle du soleil (`P.frost`) à celle
           de l'ombre (`P.frostShade`, meteo.js § 10) selon l'ombre qu'il reçoit (celle de
           la case et l'ombre portée) : au matin, elle recule d'abord au soleil et ne
           reste que dans les ombres bleues des murs, des haies et des arbres. */
        const shK = Math.max(st.shade[o] / 255, st.cast[o] / 255);
        const fr = P.frostShade == null ? P.frost : P.frost + (P.frostShade - P.frost) * Math.min(1, shK * 1.25);
        if (fr > 0.02 && st.fine[o] / 127 > 0.55 - fr * 0.9 && (c !== CL.TILLED || !st.aux[o])) { dout[q] = 226; dout[q + 1] = 234; dout[q + 2] = 242; dout[q + 3] = Math.round(150 * Math.min(1, fr * 1.4)); }
        else if (P.winter && c !== CL.TILLED) { dout[q] = WINTER_GRASS[0]; dout[q + 1] = WINTER_GRASS[1]; dout[q + 2] = WINTER_GRASS[2]; dout[q + 3] = 96; }
      } else if (c === CL.STREET && P.wetRoad > 0.02) {
        /* La chaussée mouillée, plus sombre dans les ornières où l'eau de fonte
           reste (et où les pneus ont chassé la neige). */
        const inTrack = st.aux[o] === Q_AUX;
        dout[q] = 22; dout[q + 1] = 26; dout[q + 2] = 34; dout[q + 3] = Math.round((inTrack ? 100 : 52) * P.wetRoad);
      }
      continue;
    }
    /* LA NORMALE, sur la surface (cm → px). */
    const sx = (Sf[o + 1] - Sf[o - 1]) / (2 * PX_CM), sy = (Sf[o + SZ] - Sf[o - SZ]) / (2 * PX_CM);
    const ndl = (-sx * LX - sy * LY + LZ) / Math.sqrt(sx * sx + sy * sy + 1);
    /* L'OMBRE PROPRE : dans un creux (une empreinte, le pied d'une congère),
       la paroi du nord-ouest cache le soleil. On remonte trois pas vers lui. */
    let self = 0;
    const kmax = Math.min(3, x + 1, y + 1);
    for (let k = 1; k <= kmax; k++) {
      const r = Sf[o - k * (SZ + 1)] - Sf[o] - k * TAN_D;
      if (r > self) self = r;
    }
    self = Math.min(1, self / 3);
    /* LE CREUX reçoit moins de ciel : la surface sous la moyenne de ses voisines
       à deux pixels (le fond d'un pas, le pied d'une congère). */
    let cav = 0;
    if (x > 0 && y > 0 && x < CH - 1 && y < CH - 1) cav = Math.max(0, (Sf[o - 2] + Sf[o + 2] + Sf[o - 2 * SZ] + Sf[o + 2 * SZ]) / 4 - Sf[o]);
    const castA = st.cast[o] / 255, aoA = st.ao[o] / 255;
    const direct = sunK * Math.max(0, ndl) / LZ * (1 - castA * 0.94) * (1 - self);
    const amb = ambK * (1 - 0.42 * aoA) * (1 - Math.min(0.45, cav / 14)) * (0.9 + 0.1 * Math.min(1, ndl / LZ));
    const v = amb + direct;
    let idx = 8 + (v - 1) * (v < 1 ? 7.2 : 4.2);
    // Une neige mince laisse deviner le sol : un ton plus bas à la lisière.
    if (dd < need + 0.8) idx -= (need + 0.8 - dd) * 1.2;
    // Une vieille neige (plusieurs jours sans chute) est plus grise, plus grenue.
    if (pack.since > 1200) idx -= Math.min(0.6, (pack.since - 1200) / 2400);
    /* LE GRAIN : un second bruit bleu, d'un tiers de ton — un pixel sur quinze
       environ s'écarte d'un cran (0,62 au premier réglage : un sur six, vu en
       jeu comme une neige de télévision). Plus franc là où la surface tourne
       (une ride, une motte), presque nul sur un plat lisse. */
    idx += (b2 - 0.5) * (0.34 + Math.min(0.3, Math.abs(sx) + Math.abs(sy)));
    let ti = Math.floor(idx + b1);
    ti = ti < 0 ? 0 : ti > 10 ? 10 : ti;
    const lit = direct / Math.max(0.01, sunK);
    let col;
    if (c === CL.STREET) {
      const a2 = st.aux[o], berm = a2 >= 2 * Q_AUX && pack.berm > 0.2, hd = h32(wx, wy, 61);
      /* La congère : de la neige, salie en surface (une motte sur sept a la
         couleur de la boue). L'ornière : la boue brune, piquée d'eau sombre.
         Entre les deux : la neige tassée, grise, semée de boue. */
      if (berm) col = hd % 7 ? RS[Math.max(0, ti - 1)] : RL[Math.max(0, ti - 2)];
      else if (a2 === Q_AUX) col = b2 < 0.08 ? RL[Math.max(0, ti - 5)] : RL[Math.max(0, Math.min(10, ti - 1))];
      else if (a2 === Q_AUX >> 1) col = RS[Math.max(0, ti - 1)];
      else col = hd % 13 ? RS[Math.max(0, ti - 2)] : RL[Math.max(0, ti)];
    } else {
      // LES PAILLETTES FIXES : quelques cristaux qui renvoient le soleil.
      if (sun > 0.3 && lit > 0.85 && ti >= 8 && (h32(wx, wy, 33) % 71) === 0) ti = 10;
      col = RS[ti];
      /* Les débris tombés des arbres, posés sur la neige — une neige fraîche
         en cache les trois quarts, ils réapparaissent à mesure qu'elle vieillit. */
      const db = st.deb[o];
      if (db && dd > 0.8 && (h32(wx, wy, 45) % 100) < 100 * Math.min(1, 0.25 + (pack.since || 0) / 600)) col = DEBRIS[db];
    }
    dout[q] = col[0]; dout[q + 1] = col[1]; dout[q + 2] = col[2]; dout[q + 3] = 255;
    if (ti >= 8 && c !== CL.STREET && lit > 0.8 && dd > 1.5 && (h32(wx, wy, 21) % 41) === 0) glints.push([wx, wy, h32(x, y, 22) % 1000]);
  }
  return glints;
}
/* L'épaisseur au pied d'un personnage ou d'un décor (cm) — pour enfoncer ses
   pieds dans la neige. Approchée à la case (classe du sol, abri, ombre). */
export function depthAtTile(tw, pack, fields, x, y) {
  if (x < 0 || y < 0 || x >= tw.w || y >= tw.h) return 0;
  const i = y * tw.w + x, g = tw.ground[i];
  if (g === C.G_WATER) return 0;
  if (g === C.G_PATH && tw.road && (tw.road[i] === C.TR_ASPHALT || tw.road[i] === C.TR_COBBLE)) return pack.r;
  const sh = fields ? fields.shade[i] : 0, se = fields ? fields.shelter[i] : 1;
  return (pack.g + (pack.s - pack.g) * sh) * se;
}

/* ── 7. LES EMPREINTES ─────────────────────────────────────────────────────
   Une empreinte creuse une FRACTION du manteau local (en %, −100..100 — un
   négatif soulève : le bourrelet de neige chassée sur le côté d'une trace).
   ⚠️ UNE FRACTION, PAS DES CENTIMÈTRES : quand le manteau fond, la trace
   garde sa forme au lieu de disparaître d'un coup ; quand il en tombe, elle se
   COMBLE en proportion (`fillPrints` : la fraction est multipliée par le
   rapport des épaisseurs, avant / après la chute). Un pas s'enfonce de
   2 cm + 70 % de la neige : dans 3 cm, il touche le sol ; dans 25 cm, il laisse
   un plancher tassé. */
export function footSink(depthCm, k) {
  if (depthCm <= 0.3) return 0;
  return Math.min(1, (2 + 0.7 * depthCm) / depthCm) * k;
}
/* Les semelles, en px d'art : demi-longueur, demi-largeur, écart entre les
   pieds, pas (entre deux pieds successifs), enfoncement relatif. */
export const PRINTS = {
  /* ⚠️ L'écart entre les pieds est ÉLARGI (1,3 → 2,4 px) : à 1,3, les deux
     rangées se confondaient en un pointillé (vu en jeu, au zoom 2). Une trace
     de pas se lit par ses deux files décalées. */
  boot:  { a: 1.8, b: 1.0, gap: 2.4, stride: 9.5, k: 1, rim: 0.25 },
  child: { a: 1.3, b: 0.75, gap: 1.8, stride: 6.5, k: 0.85, rim: 0.2 },
  hoof:  { a: 0.9, b: 0.9, gap: 2.0, stride: 11, k: 1, rim: 0.2, pair: true },
  paw:   { a: 0.55, b: 0.55, gap: 0.0, stride: 3.2, k: 0.8, rim: 0 },
  dog:   { a: 0.6, b: 0.6, gap: 1.1, stride: 4.2, k: 0.8, rim: 0 },
  bird:  { a: 0.5, b: 0.4, gap: 0.8, stride: 1.8, k: 0.45, rim: 0 },
  duck:  { a: 0.8, b: 0.7, gap: 1.2, stride: 2.6, k: 0.5, rim: 0 },
  // Le paquet tombé d'une branche : un petit cratère, son bourrelet de poudre.
  plop:  { a: 1.3, b: 1.1, gap: 0, stride: 0, k: 0.45, rim: 0.5 },
};
/* Creuse une semelle à (wx, wy) (px d'art, le CENTRE de l'empreinte), dans le
   sens (ux, uy) normé. `put(wx, wy, pct)` : écrit dans la carte des
   empreintes (le max pour un creux, le min pour un bourrelet). */
export function stampPrint(put, wx, wy, ux, uy, p, frac) {
  const R = Math.ceil(Math.max(p.a, p.b) + 1.5);
  const cx = Math.floor(wx), cy = Math.floor(wy);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    let cov = 0, ring = 0;
    /* Couverture sur 3 × 3 sous-échantillons : le bord de la semelle devient
       une pente, que le relief éclaire (sinon un rectangle de pixels). */
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
      const X = cx + dx + (sx + 0.5) / 3 - wx, Y = cy + dy + (sy + 0.5) / 3 - wy;
      const u = (X * ux + Y * uy) / p.a, v = (-X * uy + Y * ux) / p.b;
      const r = u * u + v * v;
      if (r <= 1) cov++;
      else if (r <= 2.4) ring++;
    }
    if (cov) put(cx + dx, cy + dy, Math.round(100 * frac * (0.35 + 0.65 * cov / 9)));
    else if (ring && p.rim) put(cx + dx, cy + dy, -Math.round(100 * frac * p.rim * ring / 9));
  }
}

/* ── 7 bis. L'HIVER DU MOBILIER VÉGÉTAL ────────────────────────────────────
   Guillaume (checklist de la phase 12) : « l'hiver ne change rien en ville :
   herbe, fleurs, feuillage ». Un buisson jaune en fleur dans la neige se lit
   comme un défaut avant de se lire comme un buisson. On HIVERNE donc son
   dessin, pixel par pixel, sans rien redessiner (la silhouette reste la sienne,
   le banc et le jeu lisent la même) :
   · une FLEUR (couleur saturée qui n'est ni un vert ni un brun) devient une
     tige sèche — brun gris, à la valeur de la fleur (le volume reste lisible) ;
   · un feuillage CADUC (`bare` : forsythia, massifs fleuris, rosiers) devient
     une masse de brindilles brun violacé ; un PERSISTANT (`ever` : lavande,
     buis taillé) ternit et s'assombrit ; une GRAMINÉE (`straw`) jaunit en
     paille ; un POT (`pot`) garde son contenant et perd ses fleurs.
   ⚠️ Le contenant (terre cuite, bois, pierre) n'est jamais touché : il est peu
   saturé, ou brun — ce qui n'est ni une fleur ni une feuille reste tel quel. */
const TWIG = [[74, 62, 58], [98, 84, 78], [124, 110, 102], [152, 138, 128]];
const STRAW = [[118, 98, 58], [150, 128, 78], [180, 158, 100], [206, 186, 128]];
export function winterizePixels(src, w, h, mode, seed) {
  const out = new Uint8ClampedArray(src);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (out[o + 3] < 8) continue;
    const r = src[o], g = src[o + 1], b = src[o + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, v = mx / 255;
    let hue = 0;
    if (mx !== mn) {
      if (mx === r) hue = ((g - b) / (mx - mn) + 6) % 6;
      else if (mx === g) hue = (b - r) / (mx - mn) + 2;
      else hue = (r - g) / (mx - mn) + 4;
      hue *= 60;
    }
    const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
    const green = sat > 0.18 && hue >= 62 && hue <= 175;
    // Le brun d'une tige ou d'un pot ; un jaune d'or à l'ombre (40° et plus) reste une fleur.
    const brown = hue >= 14 && hue < 40 && v < 0.58;
    // Une fleur : saturée, ou d'un rose / mauve pâle (le rose d'un pétale n'est saturé qu'à 25 %).
    const flower = !green && !brown && v > 0.3 && (sat > 0.34 || (sat > 0.18 && (hue > 275 || hue < 12)));
    const pick4 = (P) => P[Math.max(0, Math.min(3, Math.floor(lum * 4.4 - 0.2 + ((h32(i % w, (i / w) | 0, seed) & 3) - 1.5) * 0.18)))];
    let c = null;
    /* Un caduc en hiver est AJOURÉ : un pixel de feuillage sur quatre devient un
       vide (la neige du sol passe entre les brindilles) — sans quoi le massif se
       lit comme une motte de terre (vu en jeu). Le bord du bas reste plein : le
       pied du buisson touche le sol. */
    if ((flower || green) && mode === "bare" && (i / w | 0) < h - 3 && (h32(i % w, (i / w) | 0, seed + 5) & 3) === 0) { out[o + 3] = 0; continue; }
    if (flower) c = mode === "straw" ? pick4(STRAW) : pick4(TWIG);
    else if (green) {
      if (mode === "bare") c = pick4(TWIG);
      else if (mode === "straw") c = pick4(STRAW);
      else {
        // Le persistant ternit : la moitié de sa saturation, un cran plus sombre, un peu vers l'olive.
        const k = 0.5, gray = lum * 255;
        c = [Math.round((r + (gray - r) * k) * 0.86 + 6), Math.round((g + (gray - g) * k) * 0.84), Math.round((b + (gray - b) * k) * 0.84)];
      }
    }
    if (c) { out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; }
  }
  return out;
}
/* Le genre d'hiver d'un décor (null : il ne change pas). ⚠️ Les BUIS (`shrub`,
   `grassTuft`, `topiary`, `hedgeRow` — buis.js) n'y sont plus : leur hiver est dans leur
   dessin (un persistant terni, pas des brindilles de caduc ni de la paille). */
export const WINTER_PROP_MODE = {
  goldBush: "bare", clump: "bare", roseBox: "bare",
  lavender: "ever", hedgeAngle: "ever", bonsai: "ever",
  reedTuft: "straw", potReeds: "straw", tallGrass: "straw",
  flowerTrough: "pot", potPink: "pot", flowerCart: "pot", bloomBed: "pot", bloomRow: "pot",   // 2026-09-29 : plus `planter` — la planche 3 a son propre hiver (jardinière de terre nue)
  /* 2026-09-28 (soir) — `C.TOWN_BUIS_LEGACY` (fermeConstants.js) : les anciens dessins
     (avant « buis », 5969306) reprennent leur hiver d'alors — l'arbuste en brindilles,
     le buis sur tige et la haie du quai en persistant, la bande verte en paille. */
  ...(C.TOWN_BUIS_LEGACY ? { shrub: "bare", topiary: "ever", hedgeRow: "ever", grassTuft: "straw" } : {}),
};

/* ── 8. LE CHAPEAU DE NEIGE D'UN SPRITE ─────────────────────────────────────
   Lu dans les pixels du sprite : tout pixel opaque dont le voisin du DESSUS
   est vide porte de la neige — sur `thick` pixels vers le bas (elle couvre le
   dessus de l'objet, vu en 3/4) et `up` pixels au-dessus (son épaisseur), avec
   un cerne froid au-dessus (DESSIN.md : un cerne sert aussi sur fond clair —
   un banc enneigé sur un sol enneigé se perdrait sans lui). Les bords
   s'arrondissent : une colonne isolée prend moins de neige que ses voisines.
   `lvl` : 1 léger, 2 épais. Rend { w, h, pad, px } (RGBA), `pad` rangées
   ajoutées en haut. `bury` : les rangées du bas à enfouir (la neige au pied).
   `k` (2026-10-02, les lampadaires « grille écran ») : combien de px de l'image
   valent un PIXEL D'ART — 1 pour un sprite natif (le défaut : strictement
   l'ancien dessin), 3 pour une image posée au pixel d'écran au cran 3. Les
   épaisseurs (au-dessus, en dessous, enfouissement) sont des pixels d'ART, donc
   multipliées par `k`, et le tirage de chaque colonne se fait par pixel d'ART
   (`x / k`) : un grain d'un pixel d'écran serait du bruit, pas de la neige. */
export function snowCapPixels(src, w, h, lvl, seed, bury, k = 1) {
  const kk = Math.max(1, Math.round(k));
  const pad = (lvl >= 2 ? 3 : 2) * kk, H2 = h + pad;
  const px = new Uint8ClampedArray(w * H2 * 4);
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 96;
  const put = (x, y, c, a) => {
    if (x < 0 || x >= w || y < -pad || y >= h) return;
    const q = ((y + pad) * w + x) * 4;
    if (px[q + 3] >= a && a < 255) return;
    px[q] = c[0]; px[q + 1] = c[1]; px[q + 2] = c[2]; px[q + 3] = a;
  };
  const S = SNOW_TONES;
  let tops = [];
  const runOf = new Map();   // `kk` > 1 : la largeur du dessus (sa pente), qui borne aussi l'épaisseur de la neige
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (op(x, y) && !op(x, y - 1)) tops.push([x, y]);
  /* À taille d'écran (`kk` > 1), chaque marche d'une silhouette en pente est un « dessus » d'un pixel :
     le flanc du pied d'un candélabre se bordait d'un pointillé blanc (vu en jeu, 2026-10-02), alors que
     la neige ne tient que sur du presque plat. Un dessus compte s'il fait au moins 1,2 pixel d'art de
     large (la pente se lit dans la longueur de la marche : 1 px = 45° ; les sommets d'un bras courbe en ont 5 à 8
     au cran 5, les flancs du pied 1 à 2 — mesuré sur l'image, un seuil à 2 pixels d'art effaçait toute la neige des bras). Sans effet sur un sprite natif
     (`kk` = 1, où une marche d'un pixel EST un pixel d'art et le dessin reste celui d'avant). */
  if (kk > 1) {
    const isTop = new Uint8Array(w * h);
    for (const [x, y] of tops) isTop[y * w + x] = 1;
    tops = tops.filter(([x, y]) => {
      let a = x, b = x;
      while (a > 0 && isTop[y * w + a - 1]) a--;
      while (b < w - 1 && isTop[y * w + b + 1]) b++;
      runOf.set(y * w + x, b - a + 1);
      return b - a + 1 >= Math.max(2, Math.round(kk * 1.2));
    });
  }
  const topSet = new Set(tops.map(([x, y]) => y * w + x));
  for (const [x, y] of tops) {
    const nL = topSet.has(y * w + x - 1) || topSet.has((y - 1) * w + x - 1) || topSet.has((y + 1) * w + x - 1);
    const nR = topSet.has(y * w + x + 1) || topSet.has((y - 1) * w + x + 1) || topSet.has((y + 1) * w + x + 1);
    const inner = nL && nR;
    const jit = h32(kk === 1 ? x : Math.floor(x / kk), kk === 1 ? y : Math.floor(y / kk), seed) % 3;
    let up = (lvl >= 2 ? (inner ? (jit === 0 ? 1 : 2) : 1) : (inner && jit === 0 ? 1 : 0)) * kk;
    /* Une couche de neige n'est pas plus haute que la moitié de ce qui la porte est large : sur le sommet
       d'un bras courbe de 6 px, dix pixels de neige faisaient un bloc blanc posé dessus (vu hors jeu, 2026-10-02). */
    if (kk > 1) up = Math.min(up, Math.max(1, Math.round(runOf.get(y * w + x) * 0.5)));
    let down = (lvl >= 2 ? 2 : 1) * kk;
    /* À taille d'écran, la neige ne doit pas COUVRIR un objet fin : sur un bras de fer de 3 px, quatre pixels
       de neige le blanchissaient entièrement, et sur un fond clair il disparaissait (vu en jeu, 2026-10-02). Elle
       reste sur le dessus : au plus la moitié de la hauteur d'objet qui tient sous ce pixel. */
    if (kk > 1) { let vr = 0; while (vr < down * 2 && op(x, y + vr)) vr++; down = Math.min(down, Math.max(1, vr >> 1)); }
    for (let j = 1; j <= up; j++) put(x, y - j, j === up ? S[5] : S[4], 255);
    for (let j = 0; j < down; j++) if (op(x, y + j)) put(x, y + j, j === 0 && !up ? S[5] : j === down - 1 ? S[2] : S[4], 255);
    /* Le cerne froid, au-dessus — LÉGER : à pleine force (premier jet), sur un sol
       blanc il se lisait comme un arc bleu qui flotte au-dessus de l'objet. */
    const cy = y - up - 1;
    if (!op(x, cy)) put(x, cy, [128, 146, 178], 70);
  }
  if (bury > 0) {
    // Le pied enfoui : les `bury` dernières rangées opaques de chaque colonne.
    const bu = bury * kk, lows = new Int32Array(w).fill(-1);
    let floor = -1;
    for (let x = 0; x < w; x++) {
      for (let y = h - 1; y >= 0; y--) if (op(x, y)) { lows[x] = y; break; }
      if (lows[x] > floor) floor = lows[x];
    }
    for (let x = 0; x < w; x++) {
      const low = lows[x];
      if (low < 0) continue;
      /* À taille d'écran, seules les colonnes qui touchent le SOL s'enfouissent : le bas d'une lanterne
         suspendue est le point le plus bas de SA colonne, mais il n'est pas dans la neige (vu en jeu,
         2026-10-02 : du blanc sous le verre). Le sprite natif garde sa règle (`kk` = 1). */
      if (kk > 1 && low < floor - 2 * kk) continue;
      for (let j = 0; j < bu; j++) if (op(x, low - j)) put(x, low - j, j === bu - 1 ? S[4] : S[3], 255);
    }
  }
  return { w, h: H2, pad, px };
}

/* ── 8 bis. LA NEIGE D'UN TOIT DESSINÉ EN CODE (la gare, le kiosque…) ───────
   Le pendant, à l'exécution, de `tools/build-snow-roofs.mjs` pour un sprite
   procédural : dans le haut du dessin (`roofFrac`), les pixels de tuile (rouge,
   brune) ou d'ardoise RELIÉS au bord supérieur de la silhouette (une porte
   rouge plus bas n'en est pas) blanchissent, à la valeur de leur peinture ; un
   bourrelet déborde de l'égout. `lvl` : 1 légère (le haut de chaque rang),
   2 épaisse. Rend les pixels RGBA d'un calque de même taille. */
export function snowRoofPixels(src, w, h, lvl, roofFrac) {
  const out = new Uint8ClampedArray(w * h * 4);
  const N = w * h, yMax = Math.round(h * (roofFrac || 0.5));
  const op = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 96;
  const roofy = (i) => {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sa = mx ? (mx - mn) / mx : 0, v = mx / 255;
    let hu = 0;
    if (mx !== mn) { if (mx === r) hu = ((g - b) / (mx - mn) + 6) % 6; else if (mx === g) hu = (b - r) / (mx - mn) + 2; else hu = (r - g) / (mx - mn) + 4; hu *= 60; }
    const tile = (hu >= 340 || hu <= 32) && sa > 0.35 && v > 0.22 && v < 0.92;
    const slate = v >= 0.16 && v <= 0.74 && ((hu >= 180 && hu <= 262 && sa >= 0.06 && sa <= 0.44) || (hu >= 270 && sa < 0.24));
    return tile || slate;
  };
  const m = new Uint8Array(N), q = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < yMax; y++) {
    const i = y * w + x;
    if (op(x, y) && !op(x, y - 1) && roofy(i)) { m[i] = 1; q.push(i); }
  }
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= yMax) continue;
      const j = yy * w + xx;
      if (m[j] || !op(xx, yy) || !roofy(j)) continue;
      m[j] = 1; q.push(j);
    }
  }
  let lo = 255, hi = 0;
  for (let i = 0; i < N; i++) if (m[i]) { const l = src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11; if (l < lo) lo = l; if (l > hi) hi = l; }
  const put = (x, y, idx) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const c = RAMP_SUN[Math.max(0, Math.min(10, Math.round(idx)))], o = (y * w + x) * 4;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!m[i]) continue;
    const t = Math.max(0, Math.min(1, (src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11 - lo) / Math.max(1, hi - lo)));
    const top = !(y > 0 && m[i - w]);
    if (lvl >= 2) {
      put(x, y, 5.8 + t * 3 + (top ? 1 : 0) + ((h32(x, y, 31) & 3) - 1.5) * 0.2);
      if (top && !op(x, y - 1)) put(x, y - 1, 9.2);
    } else if (top || t > 0.5 - (h32(x >> 1, y >> 1, 33) & 7) * 0.04) put(x, y, 6.8 + t * 2);
  }
  // Le bourrelet de l'égout (épaisse) : sous le dernier pixel de toit de chaque colonne.
  if (lvl >= 2) for (let x = 0; x < w; x++) {
    let yb = -1;
    for (let y = yMax - 1; y >= 0; y--) if (m[y * w + x]) { yb = y; break; }
    if (yb >= 0 && op(x, yb + 1) && !m[(yb + 1) * w + x]) put(x, yb + 1, 4.8);
  }
  return out;
}

/* ── 8 ter. LA NEIGE D'UNE VOLÉE PEINTE D'UN TENANT (le grand escalier) ─────
   Chaque GIRON (la marche, éclairée — plus clair que la moyenne de la peinture)
   blanchit ; la contremarche (plus sombre, elle regarde le sud) reste de
   pierre, sauf son nez qui porte le bourrelet. Légère : un giron sur deux
   pixels, par plaques. Rend les pixels RGBA d'un calque de même taille. */
export function snowStairPixels(src, w, h, lvl) {
  const out = new Uint8ClampedArray(w * h * 4);
  const lum = (i) => src[i * 4] * 0.3 + src[i * 4 + 1] * 0.59 + src[i * 4 + 2] * 0.11;
  let sum = 0, n = 0;
  for (let i = 0; i < w * h; i++) if (src[i * 4 + 3] > 96) { sum += lum(i); n++; }
  const mean = n ? sum / n : 128;
  const put = (x, y, idx) => {
    const c = RAMP_SUN[Math.max(0, Math.min(10, Math.round(idx)))], o = (y * w + x) * 4;
    out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255;
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (src[i * 4 + 3] <= 96) continue;
    const l = lum(i);
    if (l < mean - 4) continue;
    const below = y + 1 < h && src[(i + w) * 4 + 3] > 96 ? lum(i + w) : l;
    const nose = below < l - 14;                         // le bord du giron, au-dessus de la contremarche
    const t = Math.max(0, Math.min(1, (l - mean) / 60));
    if (lvl >= 2) put(x, y, nose ? 6.2 : 7.6 + t * 1.6 + ((h32(x, y, 37) & 3) - 1.5) * 0.25);
    else if (nose || (h32(x >> 1, y, 39) & 3)) put(x, y, nose ? 6.8 : 8 + t);
  }
  return out;
}

/* ── 9. LE CHAMP DE NEIGE D'UNE CARTE (ce que le jeu garde) ────────────────
   Les parcelles rendues vivent dans UN atlas (§10 de CLAUDE.md : sur iPad
   c'est le NOMBRE de canevas qui compte) ; celles qu'on ne voit plus cèdent
   leur place (LRU). Les EMPREINTES, elles, restent en mémoire même quand leur
   parcelle quitte l'atlas : on retrouve ses traces en revenant sur ses pas.
   `env` : { makeCanvas(w, h), waterAt, stairTread, jointAt, trees, tall }.
   ⚠️ Le rendu est ÉTALÉ (`update(budgetMs)`) : quand l'épaisseur change d'un
   cran, les parcelles visibles se refont en quelques images, jamais toutes
   dans la même. */
export function makeSnowField(tw, env) {
  let fields = snowTileFields(tw, env.trees || [], env.tall || (() => false));
  const envS = { ...env, fields };
  /* Les fontes (`setMelts`) : 0 dans le disque, 1 au-delà d'une fois et demie son
     rayon, un bruit lent entre les deux (une lisière ronde au compas se lirait). */
  let melts = [], meltKey = "";
  envS.meltAt = (wx, wy) => {
    let k = 1;
    for (const m of melts) {
      const dx = wx - m.x, dy = (wy - m.y) / 0.86, R = m.r * 1.5 + 2;
      if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
      const d = Math.hypot(dx, dy) / m.r + (vnoise(wx, wy, 6, 93) - 0.5) * 0.35;
      const v = d <= 1 ? 0 : d >= 1.5 ? 1 : (d - 1) / 0.5;
      if (v < k) k = v;
    }
    return k;
  };
  const NX = Math.ceil(tw.w * T / CH), NY = Math.ceil(tw.h * T / CH);
  const ATL = 2048, PER = ATL / CH, NSLOT = PER * PER;
  let atlas = null, ag = null, scratch = null;
  const chunks = new Map();      // clé → { st, slot, ver, dirty, glints, use }
  const prints = new Map();      // clé → Int8Array(CH × CH) : les empreintes (%)
  const printCum = new Map();    // clé → la chute cumulée à laquelle ses empreintes ont été comblées
  const free = [];
  for (let s = NSLOT - 1; s >= 0; s--) free.push(s);
  let pack = zeroPack(), P = { winter: false, frost: 0, wetRoad: 0 }, ver = 1, pkey = "", frame = 0, cum = 0;
  const key = (cx, cy) => cy * NX + cx;
  const ensureAtlas = () => {
    if (atlas) return;
    atlas = env.makeCanvas(ATL, ATL);
    ag = atlas.getContext("2d");
    scratch = ag.createImageData(CH, CH);
  };
  /* Comble les empreintes d'une parcelle de ce qui est tombé depuis la
     dernière fois : la fraction creusée baisse comme le rapport des
     épaisseurs (une trace de 10 cm sous 10 cm de neige fraîche est à moitié
     pleine). */
  const fill = (k) => {
    const a = prints.get(k);
    if (!a) return;
    const d = cum - (printCum.get(k) || 0);
    if (d < 0.08) return;
    printCum.set(k, cum);
    const f = Math.pow(Math.max(0, 1 - d / Math.max(1.5, pack.g + d)), 1.2);
    let any = false;
    for (let i = 0; i < a.length; i++) {
      if (!a[i]) continue;
      a[i] = Math.round(a[i] * f);
      if (a[i]) any = true;
    }
    if (!any) { prints.delete(k); printCum.delete(k); }
  };
  const impFor = (cx, cy) => {
    const arr = [];
    let some = false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const k2 = cx + i >= 0 && cy + j >= 0 && cx + i < NX && cy + j < NY ? key(cx + i, cy + j) : -1;
      if (k2 >= 0) fill(k2);
      const a = k2 >= 0 ? prints.get(k2) : null;
      arr.push(a || null);
      if (a) some = true;
    }
    if (!some) return null;
    return (lx, ly) => {
      const i = lx < 0 ? 0 : lx >= CH ? 2 : 1, j = ly < 0 ? 0 : ly >= CH ? 2 : 1;
      const a = arr[j * 3 + i];
      if (!a) return 0;
      return a[(ly < 0 ? ly + CH : ly >= CH ? ly - CH : ly) * CH + (lx < 0 ? lx + CH : lx >= CH ? lx - CH : lx)];
    };
  };
  const renderOne = (cx, cy, ch) => {
    ensureAtlas();
    if (!ch.st) ch.st = buildChunkStatic(tw, cx, cy, envS);
    if (ch.slot < 0) {
      if (!free.length) {
        // La plus ancienne parcelle invisible rend sa place.
        let worst = null;
        for (const c2 of chunks.values()) if (c2.slot >= 0 && c2.use < frame - 1 && (!worst || c2.use < worst.use)) worst = c2;
        if (!worst) return false;
        free.push(worst.slot); worst.slot = -1; worst.ver = 0;
      }
      ch.slot = free.pop();
    }
    ch.glints = renderChunk(ch.st, pack, P, impFor(cx, cy), scratch.data);
    ag.putImageData(scratch, (ch.slot % PER) * CH, Math.floor(ch.slot / PER) * CH);
    ch.ver = ver; ch.dirty = false;
    return true;
  };
  const evict = () => {
    if (chunks.size > 140) {
      const old = [...chunks.values()].filter((c2) => c2.use < frame - 60).sort((p, q) => p.use - q.use);
      for (const c2 of old.slice(0, chunks.size - 140)) { if (c2.slot >= 0) free.push(c2.slot); chunks.delete(key(c2.cx, c2.cy)); }
    }
  };
  const api = {
    fields,
    /* Le manteau et les réglages de l'image. Une parcelle se refait quand
       l'épaisseur a bougé d'un cran (2 mm), pas à chaque image. */
    setParams(pk, p) {
      pack = pk; P = p;
      const q = (v, s) => Math.round(v / s);
      /* ⚠️ UN PAS FIN dans la plage où la neige couvre ou découvre (sous 4 cm) :
         un cran de 2 mm y basculait d'un coup un dixième des pixels — le dépôt
         et la fonte doivent être PROGRESSIFS (Guillaume). */
      const fineQ = (v) => (v < 4 ? q(v, 0.04) : 100 + q(v, 0.2));
      // 2026-10-05 : + la gelée de l'ombre (`frostShade`, meteo.js § 10), au même pas que celle du soleil.
      const k = [fineQ(pk.g), fineQ(pk.s), p.falling ? 1 : 0, q(pk.r, 0.2), q(pk.berm, 0.5), q(p.frost, 0.1), q(p.frostShade == null ? -1 : p.frostShade, 0.1), p.winter ? 1 : 0, q(p.wetRoad, 0.1), q(p.sun == null ? 1 : p.sun, 0.1), q(pk.tl + pk.tc, 0.25)].join(",");
      if (k !== pkey) { pkey = k; ver++; }
      if (pk.g + pk.s + pk.berm < 0.05 && prints.size) { prints.clear(); printCum.clear(); }
    },
    /* Ce qui vient de tomber (cm) : comble les traces. */
    addFall(cm) { if (cm > 0) cum += cm; },
    fallCum() { return cum; },
    /* Les parcelles que la vue touche cette image (cases). */
    view(x0, y0, x1, y1) {
      frame++;
      const a = Math.max(0, Math.floor(x0 * T / CH)), b = Math.min(NX - 1, Math.floor((x1 + 1) * T / CH));
      const c = Math.max(0, Math.floor(y0 * T / CH)), d = Math.min(NY - 1, Math.floor((y1 + 1) * T / CH));
      for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {
        const k = key(cx, cy);
        let ch = chunks.get(k);
        if (!ch) { ch = { st: null, slot: -1, ver: 0, dirty: true, glints: [], use: frame, cx, cy }; chunks.set(k, ch); }
        ch.use = frame;
      }
    },
    /* Refait ce qui doit l'être, dans la limite de `budgetMs`. Les parcelles
       JAMAIS rendues passent d'abord (sinon un trou), puis les périmées. */
    update(budgetMs, now) {
      const t0 = now();
      const todo = [];
      for (const ch of chunks.values()) if (ch.use === frame && (ch.slot < 0 || ch.ver !== ver || ch.dirty)) todo.push(ch);
      todo.sort((p, q) => (p.slot < 0 ? 0 : 1) - (q.slot < 0 ? 0 : 1));
      for (const ch of todo) {
        if (!renderOne(ch.cx, ch.cy, ch)) break;
        if (now() - t0 > budgetMs) break;
      }
      evict();
    },
    /* Les parcelles invisibles oublient leur statique au-delà de cent quarante
       (appelé par `update`, et par `pluie.js` quand la neige ne tourne pas). */
    evict() { evict(); },
    /* La cellule de la case (x, y) dans l'atlas, ou null. */
    cell(x, y) {
      const cx = Math.floor(x * T / CH), cy = Math.floor(y * T / CH);
      const ch = chunks.get(key(cx, cy));
      if (!ch || ch.slot < 0) return null;
      return { img: atlas, sx: (ch.slot % PER) * CH + (x * T - cx * CH), sy: Math.floor(ch.slot / PER) * CH + (y * T - cy * CH) };
    },
    /* Les éclats des parcelles visibles, en px monde. */
    glints() {
      const out = [];
      for (const ch of chunks.values()) if (ch.use === frame && ch.slot >= 0 && ch.ver === ver) for (const g of ch.glints) out.push(g);
      return out;
    },
    depthAt(wx, wy) {
      const x = Math.floor(wx / T), y = Math.floor(wy / T), d = depthAtTile(tw, pack, fields, x, y);
      /* 2026-09-29 — une autre carte peut dire que sa case garde moins de neige (le
         champ labouré de la ferme, `env.depthScale`) : les pieds s'y enfoncent moins. */
      return env.depthScale ? d * env.depthScale(x, y) : d;
    },
    /* ╔══════════════════════════════════════════════════════════════════════
       ║ 2026-09-29 — UNE CARTE QUI CHANGE SOUS LA NEIGE (la ferme).
       ╚══════════════════════════════════════════════════════════════════════
       La ville ne change jamais de sol ; la ferme, si : on laboure, on pave, on
       coupe un arbre, on pose une clôture. Ce qui a changé est rebâti À LA
       DEMANDE : `invalidate` oublie le statique des parcelles qui touchent ces
       cases (avec la marge des ombres portées et des congères — trois cases), et
       `refreshFields` refait l'abri, l'ombre et la congère de la carte entière
       (les arbres ont pu changer ; ~1 ms sur la ferme). Les EMPREINTES restent. */
    invalidate(x0, y0, x1, y1) {
      const M = 3;
      const a = Math.max(0, Math.floor((x0 - M) * T / CH)), b = Math.min(NX - 1, Math.floor((x1 + M + 1) * T / CH));
      const c = Math.max(0, Math.floor((y0 - M) * T / CH)), d = Math.min(NY - 1, Math.floor((y1 + M + 1) * T / CH));
      for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {
        const ch = chunks.get(key(cx, cy));
        if (ch) { ch.st = null; ch.dirty = true; }
      }
    },
    /* ╔══════════════════════════════════════════════════════════════════════
       ║ 2026-09-29 — LES FONTES : les cratères chauds de la quête (Guillaume :
       ║ « les animations de cratères et la quête jouables avec la neige »).
       ╚══════════════════════════════════════════════════════════════════════
       `list` : [{ x, y, r }] en px monde (le centre et le rayon de la terre nue ;
       la neige revient entre r et 1,5 r, effrangée par un bruit lent). Rien n'est
       rebâti tant que la liste ne change pas ; quand elle change, les parcelles
       touchées oublient leur statique et se rebâtissent UNE PAR IMAGE dans le budget
       de `update` — ⚠️ relire d'un coup le disque du grand cratère de la ville
       coûtait 260 ms (mesuré), un à-coup en pleine cinématique d'impact. */
    setMelts(list) {
      const next = (list || []).filter((m) => m && m.r > 0).map((m) => ({ x: Math.round(m.x), y: Math.round(m.y), r: Math.round(m.r) }));
      const k = next.map((m) => `${m.x},${m.y},${m.r}`).join(";");
      if (k === meltKey) return;
      const touched = melts.concat(next);
      melts = next; meltKey = k;
      for (const m of touched) {
        const R = m.r * 1.6 + T;
        api.invalidate(Math.floor((m.x - R) / T), Math.floor((m.y - R) / T), Math.floor((m.x + R) / T), Math.floor((m.y + R) / T));
      }
    },
    /* Un changement de SOL seul (labour, pavage, l'herbe qui repousse) : on relit le
       sol des pixels de ces cases et de leurs voisines (la berge lit l'eau d'à côté)
       dans les parcelles existantes, sans rebâtir leurs ombres. */
    invalidateGround(x0, y0, x1, y1) {
      const X0 = (x0 - 1) * T, Y0 = (y0 - 1) * T, X1 = (x1 + 2) * T - 1, Y1 = (y1 + 2) * T - 1;
      const a = Math.max(0, Math.floor((X0 - 1) / CH)), b = Math.min(NX - 1, Math.floor((X1 + 1) / CH));
      const c = Math.max(0, Math.floor((Y0 - 1) / CH)), d = Math.min(NY - 1, Math.floor((Y1 + 1) / CH));
      for (let cy = c; cy <= d; cy++) for (let cx = a; cx <= b; cx++) {
        const ch = chunks.get(key(cx, cy));
        if (!ch || !ch.st) continue;
        const ox = cx * CH - 1, oy = cy * CH - 1;
        buildChunkStatic(tw, cx, cy, envS, { st: ch.st, px0: X0 - ox, py0: Y0 - oy, px1: X1 - ox, py1: Y1 - oy });
        ch.dirty = true;
      }
    },
    refreshFields() {
      if (env.refresh) env.refresh();
      FIELD_MEMO.delete(tw);
      fields = snowTileFields(tw, env.trees || [], env.tall || (() => false));
      envS.fields = fields; envS.trees = env.trees; api.fields = fields;
    },
    /* 2026-09-29 (phase 12b) — LA PLUIE LIT LE MÊME SOL : ce que la parcelle sait de chaque pixel
       (sa classe, ses joints, ses ornières, ses creux, l'ombre qu'elle reçoit) ne dépend pas
       de la neige, et le construire coûte assez cher pour ne pas le faire deux fois. `pluie.js`
       le demande ici ; il reste dans la même table de parcelles (donc sous le même plafond). */
    staticOf(cx, cy) {
      const k = key(cx, cy);
      let ch = chunks.get(k);
      if (!ch) { ch = { st: null, slot: -1, ver: 0, dirty: true, glints: [], use: frame, cx, cy }; chunks.set(k, ch); }
      if (!ch.st) ch.st = buildChunkStatic(tw, cx, cy, envS);
      ch.use = frame;
      return ch.st;
    },
    chunkCount: () => ({ nx: NX, ny: NY }),
    /* Creuse une empreinte (§7). `frac` : la fraction du manteau (0..1). */
    stamp(p, wx, wy, ux, uy, frac) {
      if (frac <= 0) return;
      stampPrint((x, y, pct) => {
        if (x < 0 || y < 0 || x >= tw.w * T || y >= tw.h * T) return;
        const cx = Math.floor(x / CH), cy = Math.floor(y / CH), k = key(cx, cy);
        let a = prints.get(k);
        if (!a) { a = new Int8Array(CH * CH); prints.set(k, a); printCum.set(k, cum); }
        else fill(k);
        const o = (y - cy * CH) * CH + (x - cx * CH), v = Math.max(-100, Math.min(100, pct));
        if (v > 0 ? v > a[o] : (a[o] <= 0 && v < a[o])) a[o] = v;
        const ch = chunks.get(k);
        if (ch) ch.dirty = true;
        // Une empreinte au bord d'une parcelle change aussi le relief de la voisine.
        const lx = x - cx * CH, ly = y - cy * CH;
        if (lx === 0 || ly === 0 || lx === CH - 1 || ly === CH - 1) {
          for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const n = chunks.get(key(cx + ddx, cy + ddy));
            if (n) n.dirty = true;
          }
        }
      }, wx, wy, ux, uy, p, frac);
    },
    /* Le champ est refait quand la cuisson de l'eau arrive (FermeGame.js) : il
       reprend les empreintes de l'ancien. */
    carryPrints: true,
    _prints: () => ({ prints, printCum, cum }),
    adoptPrints(o) {
      const q = o._prints();
      for (const [k, a] of q.prints) prints.set(k, a);
      for (const [k, c] of q.printCum) printCum.set(k, c);
      cum = q.cum;
    },
    // Comble toutes les parcelles d'empreintes de ce qui est tombé (un banc s'en sert ; le jeu comble à la demande).
    fillAll() { for (const k of [...prints.keys()]) fill(k); },
    printCount() { let n = 0; for (const a of prints.values()) for (let i = 0; i < a.length; i++) if (a[i] > 0) n++; return n; },
    clearPrints() { prints.clear(); printCum.clear(); for (const ch of chunks.values()) ch.dirty = true; },
    stats() { return { chunks: chunks.size, prints: prints.size, slots: NSLOT - free.length }; },
  };
  return api;
}

/* ── 10. LES MARCHEURS ──────────────────────────────────────────────────────
   Chaque client suit ce qu'il voit marcher et y pose des pas : la distance
   parcourue s'accumule ; tous les `stride` px, un pied (gauche, puis droit)
   se pose, en retrait de ce qui a été dépassé (la trace ne dépend pas de la
   cadence d'image). Un saut de plus de deux cases (téléport, changement de
   zone) remet le marcheur à zéro : pas de traînée à travers la ville. */
export function makeWalkers() {
  const m = new Map();
  return {
    step(id, kind, wx, wy, now, field, sinkK) {
      const p = PRINTS[kind] || PRINTS.boot;
      let w = m.get(id);
      if (!w) { w = { x: wx, y: wy, acc: 0, side: 1, ux: 0, uy: 1, t: now }; m.set(id, w); return; }
      w.t = now;
      const dx = wx - w.x, dy = wy - w.y, d = Math.hypot(dx, dy);
      if (d > 2 * T) { w.x = wx; w.y = wy; w.acc = 0; return; }
      if (d < 1e-3) return;
      // Le cap, lissé : un personnage qui tourne ne pose pas un pied en travers.
      w.ux = w.ux * 0.4 + (dx / d) * 0.6; w.uy = w.uy * 0.4 + (dy / d) * 0.6;
      const n = Math.hypot(w.ux, w.uy) || 1; w.ux /= n; w.uy /= n;
      w.acc += d;
      while (w.acc >= p.stride) {
        w.acc -= p.stride;
        const back = w.acc;
        const cx = wx - (dx / d) * back, cy = wy - (dy / d) * back;
        const depth = field.depthAt(cx, cy);
        const frac = footSink(depth, p.k * (sinkK || 1));
        if (frac > 0) {
          const off = p.gap * 0.5 * w.side;
          field.stamp(p, cx - w.uy * off, cy + w.ux * off, w.ux, w.uy, frac);
          if (p.pair) field.stamp(p, cx + w.uy * off + w.ux * 2.5, cy - w.ux * off + w.uy * 2.5, w.ux, w.uy, frac);
        }
        w.side = -w.side;
      }
      w.x = wx; w.y = wy;
    },
    /* Oublie les marcheurs qu'on n'a pas vus depuis `ms`. */
    prune(now, ms) { for (const [k, w] of m) if (now - w.t > ms) m.delete(k); },
    size() { return m.size; },
  };
}
