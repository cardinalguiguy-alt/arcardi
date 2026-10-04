/* ═══════════════════════════════════════════════════════════════════════════
   LE TABLEAU DES NOUVELLES — LA GAZETTE ET LES PETITES ANNONCES — 2026-10-04
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « le notice board mérite un meilleur usage et un
   meilleur niveau de détail », puis, sur l'usage : « gazette, petites annonces
   parfois, et aussi occasionnellement utilité pour les quêtes ».
   ⚠️⚠️ TOUT CE QUI S'AFFICHE SE DÉDUIT ; SEUL CE QUI A ÉTÉ LIVRÉ S'ÉCRIT.
     · LA GAZETTE est recomposée chaque jour depuis l'état que tout le monde a
       déjà (la quête, les résidents, la météo, le maire, le voyage d'Eduardo,
       la médaille) : zéro message, zéro champ.
     · LES ANNONCES sont TIRÉES de (graine de la ferme, jour) : les deux joueurs
       lisent les mêmes, le même jour, sans qu'aucune ne circule. Ce qui ne se
       déduit pas, c'est QUI en a honoré une : `shared.board = { day, done }`,
       un champ de plus du JSON de `ferme_saves` (AUCUNE migration Supabase), et
       il se vide de lui-même au changement de jour.
   ⚠️ L'HÔTE ARBITRE LA LIVRAISON (§3) : il retire tout de suite ce qu'il faut du
   sac de celui qui livre, et paie la caisse commune. Ce fichier ne donne rien —
   il rend `{ ok, take, reward }`, `FermeGame` applique (règle du 431).
   ⚠️ PAS DE SPOIL DE LA QUÊTE (consigne de QUETE.md) : avant l'avis de
   l'observatoire, la gazette ne parle que du port ensablé ; jamais d'étoile.
   ═══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants";

/* Un générateur pur, indexé par (graine, jour, sel) : le même partout. */
export function boardHash(seed, day, salt) {
  let h = ((seed | 0) * 374761393 + (day | 0) * 668265263 + (salt | 0) * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ── LES PETITES ANNONCES ────────────────────────────────────────────────────
   ⚠️ SEULEMENT DES BIENS QUE TOUTE FERME PEUT AVOIR LE JOUR MÊME : les quatre
   légumes (les graines s'achètent), les œufs (une poule coûte 48 or), le poisson,
   le bois et la pierre. Une annonce « cherche de la laine » sur une ferme sans
   brebis serait une porte qu'on montre fermée — et la tirer selon les animaux
   présents ferait changer les annonces du jour quand on en achète un.
   `unit` : la valeur d'une unité, au prix du bac (légumes, œufs) ou estimée
   (poisson, bois, pierre — qui ne se vendent pas au bac). */
export const AD_GOODS = [
  { key: "crop0", kind: "crop", idx: 0, min: 4, max: 24 },
  { key: "crop1", kind: "crop", idx: 1, min: 3, max: 18 },
  { key: "crop2", kind: "crop", idx: 2, min: 3, max: 14 },
  { key: "crop3", kind: "crop", idx: 3, min: 2, max: 8 },
  { key: "egg",   kind: "product", idx: 0, min: 3, max: 12 },
  { key: "fish",  kind: "fish", unit: 90, min: 2, max: 7 },
  { key: "wood",  kind: "wood", unit: 9, min: 20, max: 90 },
  { key: "stone", kind: "stone", unit: 11, min: 15, max: 70 },
];
export function adUnit(good) {
  if (good.kind === "crop") return (C.CROPS[good.idx] || {}).sell || 50;
  if (good.kind === "product") return (C.ANIMALS[good.idx] || {}).sell || 100;
  return good.unit || 10;
}
/* Combien d'annonces aujourd'hui — « parfois » : un jour sur trois rien, la
   plupart du temps une, rarement deux. Jamais sans un résident pour l'écrire. */
export const AD_DAY_WEIGHTS = [0.34, 0.46, 0.2];
export const AD_PREMIUM_MIN = 1.45, AD_PREMIUM_SPAN = 0.4;   // payé 1,45 à 1,85 fois sa valeur : ça vaut le détour, ça ne remplace pas le marché

export function boardAdsOfDay(seed, day, residentRids) {
  const rids = [...new Set((residentRids || []).filter(r => Number.isInteger(r)))].sort((a, b) => a - b);
  if (!rids.length || (day | 0) < 1) return [];
  const u = boardHash(seed, day, 1);
  let n = 0, acc = 0;
  for (let i = 0; i < AD_DAY_WEIGHTS.length; i++) { acc += AD_DAY_WEIGHTS[i]; if (u < acc) { n = i; break; } n = i; }
  n = Math.min(n, rids.length);
  const out = [], usedR = new Set(), usedG = new Set();
  for (let k = 0; k < n; k++) {
    let ri = Math.floor(boardHash(seed, day, 10 + k) * rids.length);
    for (let t = 0; t < rids.length && usedR.has(rids[ri]); t++) ri = (ri + 1) % rids.length;
    let gi = Math.floor(boardHash(seed, day, 20 + k) * AD_GOODS.length);
    for (let t = 0; t < AD_GOODS.length && usedG.has(gi); t++) gi = (gi + 1) % AD_GOODS.length;
    usedR.add(rids[ri]); usedG.add(gi);
    const good = AD_GOODS[gi], unit = adUnit(good);
    const value = 450 + boardHash(seed, day, 30 + k) * 1600;
    const qty = Math.max(good.min, Math.min(good.max, Math.round(value / unit)));
    const prem = AD_PREMIUM_MIN + boardHash(seed, day, 40 + k) * AD_PREMIUM_SPAN;
    const reward = Math.max(50, Math.round(qty * unit * prem / 10) * 10);
    out.push({ id: "d" + (day | 0) + "-" + k, day: day | 0, rid: rids[ri], good: good.key, qty, reward,
               why: Math.floor(boardHash(seed, day, 50 + k) * 1000) });
  }
  return out;
}
export function adGood(key) { return AD_GOODS.find(g => g.key === key) || null; }
/* Ce que le sac contient de ce bien. */
export function adHave(inv, key) {
  const g = adGood(key); if (!g || !inv) return 0;
  if (g.kind === "crop") return (inv.crops && inv.crops[g.idx]) | 0;
  if (g.kind === "product") return (inv.products && inv.products[g.idx]) | 0;
  if (g.kind === "fish") return (inv.fish || []).reduce((a, b) => a + (b | 0), 0);
  if (g.kind === "wood") return inv.wood | 0;
  if (g.kind === "stone") return inv.stone | 0;
  return 0;
}
/* Retire `qty` du sac (le poisson : les espèces les plus nombreuses d'abord, pour
   ne pas vider la seule prise rare). Rend `false` sans rien toucher s'il manque. */
export function adTake(inv, key, qty) {
  const g = adGood(key);
  if (!g || adHave(inv, key) < qty) return false;
  if (g.kind === "crop") inv.crops[g.idx] -= qty;
  else if (g.kind === "product") inv.products[g.idx] -= qty;
  else if (g.kind === "wood") inv.wood -= qty;
  else if (g.kind === "stone") inv.stone -= qty;
  else if (g.kind === "fish") {
    let left = qty;
    while (left > 0) {
      let best = -1;
      for (let i = 0; i < inv.fish.length; i++) if ((inv.fish[i] | 0) > 0 && (best < 0 || inv.fish[i] > inv.fish[best])) best = i;
      if (best < 0) return false;
      inv.fish[best]--; left--;
    }
  }
  return true;
}

/* L'état partagé : qui a honoré quoi, AUJOURD'HUI. ⚠️ Migration qui reconstruit,
   champ par champ (piège du §4) ; un jour périmé repart vide. */
export function migrateBoard(saved, day) {
  const b = saved && typeof saved === "object" ? saved : {};
  const d = day == null ? (b.day | 0) : (day | 0);
  const done = {};
  if ((b.day | 0) === d && b.done && typeof b.done === "object") {
    for (const [k, v] of Object.entries(b.done)) if (/^d\d+-\d$/.test(k) && typeof v === "string") done[k] = v.slice(0, 24);
  }
  return { day: d, done };
}
/* L'arbitre (hôte) : rend ce qu'il faut appliquer, n'applique rien de ce qui
   est hors de `board` — le sac et la caisse sont à l'appelant. */
export function resolveBoardDeliver(board, ads, adId, inv, who) {
  const ad = (ads || []).find(a => a.id === adId);
  if (!ad) return { ok: false, why: "gone" };
  if (board.done[adId]) return { ok: false, why: "taken", by: board.done[adId] };
  if (adHave(inv, ad.good) < ad.qty) return { ok: false, why: "short" };
  return { ok: true, ad };
}

/* ── LA GAZETTE ───────────────────────────────────────────────────────────────
   Des DESCRIPTEURS ({ key, args }) que `fermeStrings.js` met en mots — un banc
   peut ainsi vérifier que chaque clé produite a son texte, dans les deux
   langues, sans repli (piège du stub menteur). `w` est un petit état déjà lu
   par l'appelant : on ne passe pas le monde entier à une fonction de mise en
   page. */
export const GAZETTE_FILLERS = 6;
export function gazetteOfDay(w) {
  const day = w.day | 0;
  let head = null;
  const q = w.quest || {};
  if (w.medalDay != null && day - w.medalDay <= 1) head = { key: "launch" };
  else if (q.finale) head = { key: "finale" };
  else if (q.wreck) head = { key: "wreck" };
  else if (q.townFall) head = { key: "meteor" };
  else if (q.fallen) head = { key: "fallen" };
  else if (q.warned) head = { key: "warned" };
  else if (q.yardTaken) head = { key: "yardTaken", args: [q.yardBy || ""] };
  else if (q.yardOffer) head = { key: "yardOffer" };
  else if (w.electionToday) head = { key: "election", args: [w.mayorKey] };
  else if (w.newcomer) head = { key: "newcomer", args: [w.newcomer] };
  else head = { key: "filler" + Math.floor(boardHash(w.seed, day, 77) * GAZETTE_FILLERS) };
  const briefs = [];
  briefs.push(w.tomorrow ? { key: "wxTomorrow", args: [w.tomorrow.kind, w.tomorrow.part] } : { key: "wxFine" });
  if (w.mayorKey) briefs.push({ key: "mayor", args: [w.mayorKey, w.nextElection] });
  if (w.voyagerAway) briefs.push({ key: "voyage" });
  if (w.inTown > 0) briefs.push({ key: "inTown", args: [w.inTown] });
  if (w.candles > 0) briefs.push({ key: "candles", args: [w.candles] });
  if (w.medal) briefs.push({ key: "medal", args: [w.medal.n] });
  if (w.ads > 0) briefs.push({ key: "ads", args: [w.ads] });
  return { day, head, briefs };
}
export const GAZETTE_HEAD_KEYS = ["launch", "finale", "wreck", "meteor", "fallen", "warned", "yardTaken", "yardOffer", "election", "newcomer",
  ...Array.from({ length: GAZETTE_FILLERS }, (_, i) => "filler" + i)];
export const GAZETTE_BRIEF_KEYS = ["wxTomorrow", "wxFine", "mayor", "voyage", "inTown", "candles", "medal", "ads"];
