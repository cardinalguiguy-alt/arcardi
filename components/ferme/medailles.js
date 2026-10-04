/* ═══════════════════════════════════════════════════════════════════════════
   LES MÉDAILLES DE LA FERME — 2026-10-04
   ───────────────────────────────────────────────────────────────────────────
   Demande de Guillaume : « finir la quête doit donner une médaille à la ferme »,
   puis, sur sa forme : « une insigne dans un menu, indiquant qu'on a fini cette
   quête. Car il y en aura d'autres. Ce sera aussi là que l'on pourra rejouer la
   quête pour le fun sans perdre le succès. »
   ⚠️⚠️ D'OÙ UN MODULE À PART, ET PAS UN CHAMP DE `shared.star` : rejouer la quête
   remet `star` à NEUF (`Q.newStar()`, le même geste que « Wipe it » du menu dev).
   Une médaille rangée dans `star` serait effacée par le geste même qui doit la
   préserver. Elle vit donc dans `shared.medals`, un champ de plus du JSON de
   `ferme_saves` — AUCUNE MIGRATION SUPABASE, même chemin que `wardrobe` (427).
   ⚠️ LA MÉDAILLE APPARTIENT À LA FERME, PAS À UN JOUEUR (« une médaille à la
   ferme ») : un seul dossier par quête, avec QUI était là le jour où elle a été
   gagnée — c'est le souvenir de la soirée, pas un score individuel.
   ⚠️ CE FICHIER NE FAIT QUE DÉCLARER, MIGRER ET ÉCRIRE. C'est l'hôte qui décide
   QUAND la quête est finie (`FermeGame.js`, à l'inauguration) : la règle qui dit
   « finie » reste dans `quete.js`, jamais recopiée ici.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Le catalogue : une ligne par quête qui peut donner une médaille. L'ordre est
   celui de l'affichage. `icon` est le dessin de l'insigne (voir `drawMedal`),
   pas un emoji : une médaille se regarde. */
export const MEDAL_QUESTS = [
  { id: "star", ribbon: ["#1d2f6b", "#f2d36b", "#1d2f6b"], metal: "gold", emblem: "star" },
];
export const MEDAL_IDS = MEDAL_QUESTS.map(q => q.id);

/* ⚠️ UNE MIGRATION RECONSTRUIT, ELLE NE RÉPARE PAS (piège du §4 : « un résolveur
   qui écrit un champ neuf doit être livré dans le même geste que sa déclaration
   ET sa migration »). Tout champ écrit par `awardMedal` est relu ici, un par un. */
export function migrateMedals(saved) {
  const out = {};
  const src = saved && typeof saved === "object" ? saved : {};
  for (const id of MEDAL_IDS) {
    const m = src[id];
    if (!m || typeof m !== "object" || !(+m.at > 0)) continue;
    out[id] = {
      at: +m.at,                                           // la PREMIÈRE fois : c'est la date de la médaille
      last: Math.max(+m.at, +m.last || 0),                 // la dernière fois qu'on l'a refinie
      n: Math.max(1, Math.min(999, m.n | 0)),              // combien de fois la quête a été achevée
      day: Math.max(0, m.day | 0),                         // le jour de jeu de la première fois
      by: Array.isArray(m.by) ? m.by.filter(x => typeof x === "string").map(x => x.slice(0, 24)).slice(0, 8) : [],
    };
  }
  return out;
}
export function medalHas(medals, id) { return !!(medals && medals[id] && medals[id].at); }
export function medalCount(medals) { return MEDAL_IDS.filter(id => medalHas(medals, id)).length; }

/* Écrit la médaille, ou compte une fois de plus si elle est déjà là (une partie
   rejouée « pour le fun »). Idempotent PAR FIN : l'appelant passe la date de la
   fin (`e.finale.inaugAt`), et la même date ne compte jamais deux fois — l'hôte
   peut donc rappeler cette fonction sans risque après chaque requête. */
export function awardMedal(medals, id, finishedAt, names, day) {
  if (!MEDAL_IDS.includes(id) || !(+finishedAt > 0)) return { ok: false };
  const m = medals[id];
  if (!m) {
    medals[id] = { at: +finishedAt, last: +finishedAt, n: 1, day: Math.max(0, day | 0),
                   by: (names || []).filter(Boolean).map(x => String(x).slice(0, 24)).slice(0, 8) };
    return { ok: true, first: true };
  }
  if (+finishedAt <= m.last) return { ok: true, already: true };
  m.last = +finishedAt;
  m.n = Math.min(999, (m.n | 0) + 1);
  return { ok: true, again: true };
}
