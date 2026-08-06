"use client";

/* ==========================================================================
   REALTIMEQUOTA — compteur local de consommation Supabase Realtime.
   ==========================================================================
   POURQUOI CE FICHIER EXISTE
   --------------------------
   Le plan gratuit Supabase plafonne à 2 000 000 de messages Realtime par mois.
   Ce plafond a déjà été dépassé une fois (près de 7 M/mois), ce qui a imposé
   une migration complète vers un nouveau projet en août 2026.

   Or Supabase n'offre AUCUNE alerte de seuil : la doc « Control your costs »
   dit explicitement que le Spend Cap « doesn't allow for fine-grained cost
   control, such as [...] receiving notifications when certain costs are
   reached », et le Spend Cap lui-même est réservé au plan Pro. Sur le plan
   gratuit, la notification arrive APRÈS le dépassement — exactement la
   mauvaise surprise qu'on cherche à éviter.

   Ce module est donc le seul garde-fou automatique possible : il compte côté
   navigateur, cumule par mois calendaire dans localStorage, et permet
   d'afficher un badge d'alerte avant d'être dans le mur.

   LA RÈGLE DE FACTURATION (doc Supabase, vérifiée août 2026)
   ----------------------------------------------------------
   C'est contre-intuitif et c'est toute la subtilité du calcul :

     Broadcast  : 1 message facturé pour l'ENVOI
                  + 1 message facturé PAR CLIENT ABONNÉ qui le reçoit.
     postgres_changes : 1 message PAR CLIENT qui écoute l'événement.

   Donc un seul `send()` sur un canal `self:true` avec 2 joueurs coûte 3
   messages (1 envoi + 2 réceptions, l'émetteur étant lui-même abonné). Le même
   `send()` en `self:false` coûte 2 messages. C'est ce qui valide le
   « FIX 243 : self:false (-33 % à 2j) » de FermeGame : 3 -> 2 = -33 % exact.

   CONSÉQUENCE : seul le NOMBRE de `send()` compte, jamais la taille des
   payloads. Toute optimisation qui allège un message sans en réduire le
   nombre ne rapporte RIEN sur le quota.

   PORTÉE DE LA MESURE
   -------------------
   L'instrumentation est posée sur Ferme Vallée de Verre et sur les échecs, qui
   représentent à eux deux l'écrasante majorité du trafic (la ferme seule pèse
   ~99 % : une soirée de 10 mini-jeux tour par tour coûte ~10 000 messages,
   contre ~100 000 pour UNE heure de ferme à 2 joueurs). Le chiffre affiché est
   donc une estimation basse mais représentative, et il est étiqueté comme telle.

   Ce compteur ne voit évidemment que CE navigateur. Le vrai total, tous
   joueurs confondus, reste sur la page Usage de Supabase — ce compteur sert à
   savoir quand aller la regarder, pas à la remplacer.
   ========================================================================== */

const STORAGE_KEY = "arcardi_rt_quota_v1";

// Quota mensuel du plan gratuit.
export const MONTHLY_QUOTA = 2_000_000;

// Seuils d'alerte du badge. Volontairement bas : ce compteur sous-estime (il
// ignore les mini-jeux non instrumentés et ne voit qu'un seul navigateur),
// donc mieux vaut alerter tôt.
export const WARN_RATIO = 0.60;
export const DANGER_RATIO = 0.85;

function currentPeriod() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

function emptyState() {
  return { period: currentPeriod(), messages: 0, sends: 0, byKey: {}, startedAt: Date.now() };
}

function read() {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const st = JSON.parse(raw);
    // Changement de mois calendaire -> remise à zéro (le quota Supabase est
    // mensuel). On ne conserve pas d'historique : ce n'est pas un outil
    // d'analyse, juste un garde-fou.
    if (!st || st.period !== currentPeriod()) return emptyState();
    return st;
  } catch (e) {
    // localStorage indisponible (navigation privée, quota plein, iframe
    // cloisonnée) : on dégrade silencieusement vers un compteur en mémoire.
    return emptyState();
  }
}

function write(st) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); } catch (e) { /* ignoré, cf. read() */ }
}

// État en mémoire : on n'écrit sur le disque qu'au plus une fois par seconde
// (voir flush) — sans ça, un hôte de ferme à 10 send/s ferait 10 écritures
// localStorage SYNCHRONES par seconde, ce qui bloquerait le thread principal
// et ferait tomber le framerate du jeu. Le coût d'une seconde perdue en cas
// de fermeture brutale est négligeable pour un compteur de budget.
let mem = null;
let lastFlush = 0;
const listeners = new Set();

function state() {
  if (!mem) mem = read();
  else if (mem.period !== currentPeriod()) mem = emptyState(); // passage de minuit le 1er du mois
  return mem;
}

function flush(force) {
  const now = Date.now();
  if (!force && now - lastFlush < 1000) return;
  lastFlush = now;
  write(state());
}

/* --------------------------------------------------------------------------
   API DE COMPTAGE
   -------------------------------------------------------------------------- */

/**
 * Enregistre le coût facturé d'UN `send()` de broadcast.
 *
 * @param {number} recipients  nombre de clients abonnés qui vont RECEVOIR le
 *                             message. Sur un canal `self:false`, c'est le
 *                             nombre d'AUTRES joueurs. Sur un canal
 *                             `self:true`, c'est ce nombre + 1 (soi-même).
 * @param {string} key         étiquette lisible pour le détail (ex. "pos",
 *                             "apply:wolves", "chess:clock").
 */
export function noteSend(recipients, key) {
  const st = state();
  const cost = 1 + Math.max(0, recipients | 0); // 1 pour l'envoi + 1 par récepteur
  st.messages += cost;
  st.sends += 1;
  if (key) st.byKey[key] = (st.byKey[key] || 0) + cost;
  flush(false);
  notify(st);
  return cost;
}

/** Instantané courant (lecture seule). */
export function snapshot() {
  const st = state();
  return {
    period: st.period,
    messages: st.messages,
    sends: st.sends,
    quota: MONTHLY_QUOTA,
    ratio: st.messages / MONTHLY_QUOTA,
    level: st.messages >= MONTHLY_QUOTA * DANGER_RATIO ? "danger"
      : st.messages >= MONTHLY_QUOTA * WARN_RATIO ? "warn"
        : "ok",
    byKey: { ...st.byKey },
  };
}

/** Remet le compteur du mois à zéro (usage manuel/debug). */
export function reset() {
  mem = emptyState();
  flush(true);
  notify(mem);
}

/* --------------------------------------------------------------------------
   ABONNEMENT POUR LE BADGE
   -------------------------------------------------------------------------- */

// Le badge ne doit PAS se redessiner à chaque message (jusqu'à 10/s) : on
// notifie au plus une fois par seconde, et uniquement si le pourcentage
// affiché a réellement bougé.
let lastNotifyAt = 0;
let lastNotifiedPct = -1;

function notify(st) {
  const now = Date.now();
  if (now - lastNotifyAt < 1000) return;
  const pct = Math.floor((st.messages / MONTHLY_QUOTA) * 1000); // dixièmes de %
  if (pct === lastNotifiedPct) return;
  lastNotifyAt = now;
  lastNotifiedPct = pct;
  const snap = snapshot();
  listeners.forEach(fn => { try { fn(snap); } catch (e) { /* un badge cassé ne doit pas casser le jeu */ } });
}

export function subscribeQuota(fn) {
  listeners.add(fn);
  try { fn(snapshot()); } catch (e) { /* idem */ }
  return () => listeners.delete(fn);
}

/* --------------------------------------------------------------------------
   ACCÈS CONSOLE
   -------------------------------------------------------------------------- */

if (typeof window !== "undefined") {
  // `__arcardiQuota()` affiche le tableau, `__arcardiQuota(true)` remet à zéro.
  window.__arcardiQuota = (doReset) => {
    if (doReset) { reset(); return "compteur remis à zéro"; }
    const s = snapshot();
    return {
      mois: s.period,
      messages_estimés: s.messages,
      quota: s.quota,
      pourcentage: +(s.ratio * 100).toFixed(1),
      niveau: s.level,
      envois: s.sends,
      détail: Object.entries(s.byKey).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ type: k, messages: n })),
      note: "Estimation locale (ferme + échecs, ce navigateur uniquement). Le total réel est sur la page Usage de Supabase.",
    };
  };
  // Sauvegarde de dernière minute : le flush est throttlé à 1 s, on force à la
  // fermeture pour ne pas perdre la dernière seconde de comptage.
  window.addEventListener("pagehide", () => flush(true));
}
