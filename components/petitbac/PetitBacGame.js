"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import { CATEGORY_POOL, CAT_COUNT_OPTIONS, DEFAULT_CAT_COUNT, drawCategories, drawOne, catLabel, guessIcon } from "@/lib/petitbacCategories";
import { loadFavorites, saveFavorite, deleteFavorite } from "@/lib/petitbacFavorites";

/* ==========================================================================
   PETIT BAC (Scattergories) — 2 joueurs et plus, FR/EN.

   Pattern réseau : hôte arbitre, copie conforme de Chromatik/Président.
   Les joueurs envoient des tentatives en broadcast ; SEUL l'hôte fait
   évoluer l'état et rediffuse `state`. Pas de bots : ce jeu repose sur
   le jugement humain des réponses.

   Écran d'accueil (demande 2026-07, AVANT la 1ère manche uniquement) :
   purement LOCAL à l'hôte, même pattern que le choix de table/objectif
   de Yahtzee/10000 (rien ne transite tant que ce n'est pas confirmé) :
   1. il choisit un NOMBRE de catégories (CAT_COUNT_OPTIONS) ou charge une
      liste favorite sauvegardée (voir lib/petitbacFavorites.js) ;
   2. un tirage aléatoire de ce nombre de catégories est proposé (banque
      commune, voir lib/petitbacCategories.js — inspirée de Scattergories,
      savoir commun uniquement) ; l'hôte peut PERMUTER (🔀) n'importe
      quelle ligne pour une autre catégorie au hasard (= la désapprouver
      et la remplacer), ou la PERSONNALISER en tapant son propre libellé ;
   3. il peut sauvegarder la liste obtenue comme favorite, ou lancer la
      partie — qui diffuse alors `categories` dans l'état initial, comme
      `letter`. Les manches suivantes (rejouer) réutilisent la même liste
      de catégories pour toute la session, seule la lettre change.

   Déroulé d'une manche (stage diffusé dans l'état) :
   - "write"  : une lettre est tirée, chacun remplit sa grille en local
                (les saisies ne transitent PAS pendant l'écriture). Le
                premier joueur qui clique "J'ai fini" envoie ses réponses
                et déclenche un compte à rebours de 10 secondes pour les
                autres (deadline = horodatage hôte diffusé). À zéro,
                chaque client soumet automatiquement ce qui est tapé ;
                l'hôte a un filet de sécurité (deadline + 2,5s) pour les
                clients muets/déconnectés (réponses vides).
   - "review" : toutes les grilles sont révélées dans un tableau commun.
                Barème LIBRE, arbitré par les humains : réponse unique
                acceptée = 4 pts (retouche 2026-07, était 2), réponses
                identiques = 1 pt chacun, vide ou refusée = 0. Proposition
                automatique : vide → 0, ne commence pas par la lettre →
                refusée, doublons (comparaison sans accents/majuscules) →
                1 pt. L'HÔTE peut toucher n'importe quelle case non vide
                pour inverser accepté/refusé (c'est lui qui tranche les
                litiges à voix haute avec les autres). Les points se
                recalculent en direct chez tout le monde (calcul
                déterministe côté client à partir de answers + letter +
                overrides).
   - "done"   : points gelés dans l'état (gains) et versés au score du
                salon (chaque client insère SON gain, comme au Président).
                Rejouer = nouvelle lettre jamais tirée dans la session.

   Confidentialité : pendant "write", rien ne transite. À partir de la
   soumission, l'état complet (réponses incluses) transite en broadcast —
   même modèle de confiance que les mains de Chromatik/Président.

   Reprise après rechargement (gameSync) : l'état diffusé est persisté par
   l'hôte ; un joueur qui recharge PENDANT l'écriture perd sa saisie
   locale (compromis assumé, cf. lib/gameSync.js) mais retrouve la manche.
   L'écran d'accueil, lui, N'EST PAS persisté (comme le choix de table de
   10000/Yahtzee) : un hôte qui recharge PENDANT la configuration recommence
   simplement ce petit écran, sans conséquence sur une partie déjà lancée.
   ========================================================================== */

const GAME_ID = "petitbac";

// Jouable de 2 à 10 joueurs HUMAINS (demande 2026-07) : au-delà de 10, les
// premiers arrivés jouent, les suivants regardent (spectateurs) — le tableau
// de correction resterait illisible à 12+ colonnes.
const MAX_SEATS = 10;

// Lettres classiques du petit bac : on écarte K, Q, W, X, Y, Z (trop
// punitives dans les deux langues).
const LETTERS = "ABCDEFGHIJLMNOPRSTUV".split("");

// Normalisation pour comparer les réponses : minuscules, sans accents,
// espaces réduits. "Émilie " et "emilie" comptent comme identiques.
function norm(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
}

function pickLetter(used) {
  const pool = LETTERS.filter(l => !used.includes(l));
  const from = pool.length ? pool : LETTERS; // session épuisée : on recommence
  return from[Math.floor(Math.random() * from.length)];
}

/* Calcul DÉTERMINISTE des statuts et points d'une manche, identique chez
   tous les clients (aucun tirage, aucune horloge) :
   - status par case : "empty" | "ok" | "no"
   - pts par case, BARÈME 2026-07 (demande explicite) : réponse correcte
     unique +2, réponse identique à un autre joueur +1 chacun, vide ou
     refusée 0 — et l'HÔTE peut accorder un BONUS de +1 sur n'importe quelle
     réponse acceptée (réponse brillante/originale, tranché à voix haute).
   `categories` = liste de catégories de LA manche (choisies sur l'écran
   d'accueil, diffusées dans l'état réseau — voir startRound plus bas).
   `overrides` = décisions manuelles de l'hôte ({ "pid|catId": "ok"|"no" }).
   `bonuses`   = bonus hôte ({ "pid|catId": true }), +1 par case acceptée. */
function computeReview(seats, answers, letter, overrides, categories, bonuses) {
  const bon = bonuses || {};
  const cats = categories || [];
  const L = letter.toLowerCase();
  const cells = {}; // "pid|cat" -> { raw, status }
  for (const cat of cats) {
    for (const seat of seats) {
      const raw = (answers[seat.id] || {})[cat.id] || "";
      const n = norm(raw);
      let status;
      if (!n) status = "empty";
      else {
        const ov = overrides["" + seat.id + "|" + cat.id];
        if (ov) status = ov;
        else status = n.startsWith(L) ? "ok" : "no"; // proposition auto, l'hôte peut inverser
      }
      cells["" + seat.id + "|" + cat.id] = { raw, n, status };
    }
  }
  const pts = {};
  const totals = {};
  seats.forEach(s => { totals[s.id] = 0; });
  for (const cat of cats) {
    // Doublons parmi les réponses ACCEPTÉES de cette catégorie uniquement.
    const counts = {};
    for (const seat of seats) {
      const c = cells["" + seat.id + "|" + cat.id];
      if (c.status === "ok") counts[c.n] = (counts[c.n] || 0) + 1;
    }
    for (const seat of seats) {
      const kk = "" + seat.id + "|" + cat.id;
      const c = cells[kk];
      const p = c.status === "ok" ? (counts[c.n] > 1 ? 1 : 2) + (bon[kk] ? 1 : 0) : 0;
      pts[kk] = p;
      totals[seat.id] += p;
    }
  }
  return { cells, pts, totals };
}

export default function PetitBacGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro");
  const [seats, setSeats] = useState([]);
  const [letter, setLetter] = useState(null);
  const [used, setUsed] = useState([]);
  const [stage, setStage] = useState("write");
  const [answers, setAnswers] = useState({});      // pid -> {catId: raw}
  const [overrides, setOverrides] = useState({});  // "pid|cat" -> "ok"|"no"
  const [bonuses, setBonuses] = useState({});      // "pid|cat" -> true (bonus hôte +1)
  const [deadline, setDeadline] = useState(null);  // ts hôte du couperet 10s
  const [firstBy, setFirstBy] = useState(null);
  const [gains, setGains] = useState(null);        // gelés au stage "done"
  const [categories, setCategories] = useState([]); // liste choisie sur l'écran d'accueil, figée pour la session
  const [channelReady, setChannelReady] = useState(false);

  // ----- Écran d'accueil (hôte uniquement, avant la 1ère manche) --------
  // Tout ce bloc est LOCAL, jamais diffusé tant que l'hôte n'a pas cliqué
  // "Lancer la partie" (voir startRound). "count" = choix du nombre de
  // catégories ; "review" = tirage proposé, approuvable/permutable/
  // personnalisable ligne par ligne.
  const [setupStep, setSetupStep] = useState("count"); // "count" | "review"
  const [setupCandidates, setSetupCandidates] = useState([]); // [{id,icon,fr,en,custom}]
  const [favorites, setFavorites] = useState([]);
  const [favNameDraft, setFavNameDraft] = useState("");
  const [showFavPanel, setShowFavPanel] = useState(false);

  useEffect(() => { setFavorites(loadFavorites()); }, []);

  // Saisie STRICTEMENT locale pendant l'écriture (rien ne transite).
  const [draft, setDraft] = useState({});
  const [now, setNow] = useState(Date.now());

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const draftRef = useRef({});
  const submittedRef = useRef(false);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false); // posé à true dès qu'on est passé en "playing" (restore ou lancement hôte)
  const restoredRef = useRef(false);
  const failsafeTimer = useRef(null);

  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => {
    stateRef.current = { seats, letter, used, stage, answers, overrides, bonuses, deadline, firstBy, gains, categories };
  }, [seats, letter, used, stage, answers, overrides, bonuses, deadline, firstBy, gains, categories]);

  function applyLocalState(s, opts = {}) {
    setSeats(s.seats || []); setLetter(s.letter || null); setUsed(s.used || []);
    setStage(s.stage || "write"); setAnswers(s.answers || {});
    setOverrides(s.overrides || {}); setBonuses(s.bonuses || {}); setDeadline(s.deadline || null);
    setFirstBy(s.firstBy || null); setGains(s.gains || null);
    setCategories(s.categories || []);
    if (opts.newRound) { setDraft({}); submittedRef.current = false; savedResultRef.current = false; }
  }

  function persist(s) {
    if (!isHost) return;
    saveGameState(room.id, GAME_ID, { phase: "playing", ...s });
  }

  useEffect(() => {
    const ch = supabase.channel(GAME_ID + "_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      applyLocalState(payload, { newRound: true });
      setPhase("playing");
      persist(payload);
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyLocalState(payload);
      persist(payload);
    });

    ch.on("broadcast", { event: "submit_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostApplySubmit(payload.seatId, payload.answers);
    });

    ch.on("broadcast", { event: "mark_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostToggleMark(payload.cellKey);
    });

    ch.on("broadcast", { event: "bonus_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostToggleBonus(payload.cellKey);
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved) {
            // Un rechargement en pleine écriture repart d'une grille locale
            // vide (compromis gameSync) mais retrouve la manche en cours.
            applyLocalState(saved);
            setPhase("playing");
            autoStartedRef.current = true;
            submittedRef.current = !!(saved.answers || {})[me.id];
            if (isHost) armFailsafe(saved);
          }
        }
      }
    });

    return () => {
      clearTimeout(failsafeTimer.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // Horloge d'affichage du compte à rebours (250ms suffit largement).
  useEffect(() => {
    if (!deadline || stage !== "write") return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [deadline, stage]);

  // Couperet côté client : à zéro, je soumets automatiquement ma grille
  // telle quelle (même partiellement vide).
  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  useEffect(() => {
    if (stage !== "write" || !deadline || submittedRef.current) return;
    if (!seats.find(x => x.id === me.id)) return;
    if (Date.now() >= deadline) doSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, deadline, stage]);

  function broadcastNewState(next) {
    channelRef.current.send({ type: "broadcast", event: "state", payload: next });
  }

  // ----- Côté hôte -----------------------------------------------------

  // Filet de sécurité : peu après la deadline, on bascule en revue avec ce
  // qu'on a (les absents/déconnectés comptent des grilles vides). Sans ça,
  // un client fermé pendant l'écriture gèlerait la manche.
  function armFailsafe(s) {
    clearTimeout(failsafeTimer.current);
    if (!s.deadline || s.stage !== "write") return;
    const wait = Math.max(0, s.deadline - Date.now()) + 2500;
    failsafeTimer.current = setTimeout(() => {
      const cur = stateRef.current;
      if (!cur || cur.stage !== "write") return;
      hostGoReview(cur);
    }, wait);
  }

  function hostGoReview(s) {
    clearTimeout(failsafeTimer.current);
    const next = { ...s, stage: "review", deadline: null, overrides: {}, bonuses: {} };
    broadcastNewState(next);
  }

  function hostApplySubmit(seatId, subAnswers) {
    const s = stateRef.current;
    if (!s || s.stage !== "write") return;
    if (!s.seats.find(x => x.id === seatId)) return;
    if (s.answers[seatId]) return; // déjà soumis : première soumission ferme la grille
    const answers = { ...s.answers, [seatId]: subAnswers || {} };
    const isFirst = !s.deadline;
    const next = {
      ...s, answers,
      deadline: isFirst ? Date.now() + 10500 : s.deadline, // 10s + petite marge réseau
      firstBy: isFirst ? seatId : s.firstBy,
    };
    const allIn = next.seats.every(x => next.answers[x.id]);
    if (allIn) { hostGoReview(next); return; }
    broadcastNewState(next);
    armFailsafe(next);
  }

  function hostToggleMark(cellKey) {
    const s = stateRef.current;
    if (!s || s.stage !== "review") return;
    const [pid, catId] = cellKey.split("|");
    const raw = (s.answers[pid] || {})[catId] || "";
    if (!norm(raw)) return; // une case vide reste à 0, rien à arbitrer
    const { cells } = computeReview(s.seats, s.answers, s.letter, s.overrides, s.categories, s.bonuses);
    const cur = cells[cellKey]?.status;
    const overrides = { ...s.overrides, [cellKey]: cur === "ok" ? "no" : "ok" };
    // Une réponse refusée perd son éventuel bonus (jamais de +1 sur un 0).
    const bonuses = { ...s.bonuses };
    if (cur === "ok") delete bonuses[cellKey];
    broadcastNewState({ ...s, overrides, bonuses });
  }

  // Bonus hôte +1 (demande 2026-07) : l'hôte peut distinguer une réponse
  // particulièrement brillante d'un +1 supplémentaire — uniquement sur une
  // case ACCEPTÉE, à bascule (re-cliquer retire le bonus).
  function hostToggleBonus(cellKey) {
    const s = stateRef.current;
    if (!s || s.stage !== "review") return;
    const { cells } = computeReview(s.seats, s.answers, s.letter, s.overrides, s.categories, s.bonuses);
    if (cells[cellKey]?.status !== "ok") return;
    const bonuses = { ...s.bonuses };
    if (bonuses[cellKey]) delete bonuses[cellKey];
    else bonuses[cellKey] = true;
    broadcastNewState({ ...s, bonuses });
  }

  function hostValidateScores() {
    const s = stateRef.current;
    if (!s || s.stage !== "review") return;
    const { totals } = computeReview(s.seats, s.answers, s.letter, s.overrides, s.categories, s.bonuses);
    broadcastNewState({ ...s, stage: "done", gains: totals });
  }

  // `cats` : liste de catégories de la manche — obligatoire au tout premier
  // lancement (fournie par l'écran d'accueil), sinon reprise de la session
  // précédente (rejouer garde la même liste, seule la lettre change).
  function startRound(prev, cats) {
    const usedPrev = prev?.used || [];
    // Plafond de 10 sièges (demande 2026-07) : les joueurs au-delà des 10
    // premiers suivent la manche en spectateurs.
    const seatsNow = prev?.seats
      || players.slice(0, MAX_SEATS).map(p => ({ id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar }));
    const L = pickLetter(usedPrev);
    const initial = {
      seats: seatsNow, letter: L,
      used: (usedPrev.length >= LETTERS.length ? [] : usedPrev).concat(L),
      stage: "write", answers: {}, overrides: {}, bonuses: {}, deadline: null, firstBy: null, gains: null,
      categories: cats || prev?.categories || [],
    };
    autoStartedRef.current = true;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: initial });
  }

  // ----- Écran d'accueil : actions de l'hôte -----------------------------
  function pickCount(n) {
    setSetupCandidates(drawCategories(n));
    setSetupStep("review");
  }
  function regenerateAll() {
    setSetupCandidates(cands => drawCategories(cands.length));
  }
  function swapOne(idx) {
    setSetupCandidates(cands => {
      const next = cands.slice();
      next[idx] = drawOne(cands.map(c => c.id));
      return next;
    });
  }
  function customizeOne(idx, text) {
    setSetupCandidates(cands => {
      const next = cands.slice();
      const cur = next[idx];
      // Emoji "intelligent" (demande 2026-07) : l'emoji suit la NATURE de la
      // saisie de l'hôte — "Titre de chanson" -> "Prénom féminin" remplace
      // 🎵 par 👩 automatiquement. baseIcon conserve l'emoji d'origine pour
      // le restaurer si l'hôte efface son texte ou si rien ne matche mieux.
      const baseIcon = cur.baseIcon || cur.icon;
      const guessed = text.trim() ? guessIcon(text) : null;
      next[idx] = {
        ...cur,
        custom: text,
        baseIcon,
        icon: guessed && guessed !== "✏️" ? guessed : (text.trim() ? (guessed || baseIcon) : baseIcon),
      };
      return next;
    });
  }
  function loadFavoriteList(fav) {
    setSetupCandidates(fav.categories.map(c => ({ ...c })));
    setSetupStep("review");
    setShowFavPanel(false);
  }
  function saveCurrentAsFavorite() {
    const name = favNameDraft.trim();
    if (!name) return;
    setFavorites(saveFavorite(name, setupCandidates));
    setFavNameDraft("");
  }
  function removeFavorite(id) {
    setFavorites(deleteFavorite(id));
  }
  function confirmSetupAndStart() {
    if (!setupCandidates.length || !channelReady) return;
    startRound(null, setupCandidates);
  }

  // ----- Côté joueur ----------------------------------------------------

  function doSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    channelRef.current?.send({
      type: "broadcast", event: "submit_attempt",
      payload: { seatId: me.id, answers: { ...draftRef.current } },
    });
  }

  function askMark(cellKey) {
    if (!isHost) return; // l'hôte arbitre (à voix haute avec les autres !)
    channelRef.current?.send({ type: "broadcast", event: "mark_attempt", payload: { cellKey } });
  }

  function rejouer() {
    if (!isHost || stage !== "done") return;
    startRound(stateRef.current);
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // Victoire/défaite ARCARDI du salon, une fois, à la validation finale.
  // Gagne qui a le total le plus haut (le meilleur des totaux gains[]) —
  // égalité = tous gagnants, comme ailleurs sur le site.
  useEffect(() => {
    if (stage !== "done" || !gains || savedResultRef.current) return;
    if (!seats.find(x => x.id === me.id)) return;
    savedResultRef.current = true;
    const best = Math.max(...seats.map(s => gains[s.id] || 0));
    const won = (gains[me.id] || 0) === best;
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, gains]);

  const isPlayer = !!seats.find(x => x.id === me.id);
  const iSubmitted = submittedRef.current || !!answers[me.id];
  const review = stage !== "write" && letter
    ? computeReview(seats, answers, letter, overrides, categories, bonuses) : null;

  function askBonus(cellKey) {
    if (!isHost) return;
    channelRef.current?.send({ type: "broadcast", event: "bonus_attempt", payload: { cellKey } });
  }

  let content;

  if (phase !== "playing" && isHost) {
    // ----- Écran d'accueil (hôte) : choix du nombre puis revue du tirage --
    if (players.length < 2) {
      content = <p className="muted">{t("pbNeedTwo")}</p>;
    } else if (setupStep === "count") {
      content = (
        <div className="pb-setup">
          <p className="pb-setup-lead">{t("pbSetupCountLead")}</p>
          {players.length > MAX_SEATS && (
            <p className="muted" style={{ textAlign: "center", fontSize: 12, margin: "0 0 12px" }}>
              {t("pbMaxSeatsNote")}
            </p>
          )}
          <div className="pb-setup-counts">
            {CAT_COUNT_OPTIONS.map(n => (
              <button key={n} className={"btn" + (n === DEFAULT_CAT_COUNT ? "" : " ghost")} style={{ width: "auto", padding: "12px 20px" }} onClick={() => pickCount(n)}>
                {n}
              </button>
            ))}
          </div>
          {favorites.length > 0 && (
            <button className="btn ghost pb-fav-toggle" style={{ width: "auto", padding: "10px 18px", marginTop: 14 }} onClick={() => setShowFavPanel(v => !v)}>
              📂 {t("pbFavToggle")} ({favorites.length})
            </button>
          )}
          {showFavPanel && (
            <div className="pb-fav-list">
              {favorites.map(f => (
                <div key={f.id} className="pb-fav-row">
                  <span className="pb-fav-name">⭐ {f.name}</span>
                  <span className="muted pb-fav-count">{f.categories.length} {t("pbCatsWord")}</span>
                  <button className="btn ghost" style={{ width: "auto", padding: "6px 12px" }} onClick={() => loadFavoriteList(f)}>{t("pbFavLoad")}</button>
                  <button className="btn ghost pb-fav-del" style={{ width: "auto", padding: "6px 10px" }} onClick={() => removeFavorite(f.id)}>🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    } else {
      content = (
        <div className="pb-setup">
          <p className="pb-setup-lead">{t("pbSetupReviewLead")}</p>
          <div className="pb-setup-list">
            {setupCandidates.map((cat, idx) => (
              <div className="pb-setup-row" key={cat.id + "_" + idx}>
                <span className="pb-setup-icon">{cat.icon}</span>
                <input
                  type="text"
                  className="pb-setup-input"
                  maxLength={40}
                  value={cat.custom != null ? cat.custom : catLabel(cat, lang)}
                  onChange={e => customizeOne(idx, e.target.value)}
                />
                <button className="pb-setup-swap" title={t("pbSetupSwap")} onClick={() => swapOne(idx)}>🔀</button>
              </div>
            ))}
          </div>
          <div className="pb-setup-actions">
            <button className="btn ghost" style={{ width: "auto", padding: "10px 18px" }} onClick={regenerateAll}>🎲 {t("pbSetupRegenAll")}</button>
            <button className="btn ghost" style={{ width: "auto", padding: "10px 18px" }} onClick={() => setSetupStep("count")}>↩ {t("pbSetupBack")}</button>
          </div>
          <div className="pb-setup-savebar">
            <input
              type="text"
              className="pb-setup-favinput"
              placeholder={t("pbSetupFavPlaceholder")}
              maxLength={30}
              value={favNameDraft}
              onChange={e => setFavNameDraft(e.target.value)}
            />
            <button className="btn ghost" style={{ width: "auto", padding: "10px 16px" }} disabled={!favNameDraft.trim()} onClick={saveCurrentAsFavorite}>⭐ {t("pbSetupFavSave")}</button>
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={confirmSetupAndStart}>▶ {t("pbSetupStart")}</button>
        </div>
      );
    }
  } else if (phase !== "playing") {
    // Invités : l'hôte configure l'écran d'accueil (choix des catégories),
    // rien à faire ici qu'attendre — voir bloc host ci-dessus.
    content = players.length < 2
      ? <p className="muted">{t("pbNeedTwo")}</p>
      : <p className="muted">{t("pbWaitingHostSetup")}</p>;
  } else if (stage === "write") {
    content = (
      <div>
        <div className="pb-letterbar">
          <span className="pb-letter">{letter}</span>
          <div className="pb-letterinfo">
            <b>{t("pbWriteTitle")}</b>
            <span className="muted">{t("pbWriteHint")}</span>
          </div>
          {deadline && (
            <span className={"pb-timer" + (remaining <= 3 ? " hot" : "")}>⏱ {remaining}s</span>
          )}
        </div>

        {deadline && (
          <p className="muted" style={{ textAlign: "center", fontSize: 12.5, margin: "0 0 8px" }}>
            ⚡ <b>{seats.find(x => x.id === firstBy)?.username}</b> {t("pbFirstDone")}
          </p>
        )}

        {isPlayer && !iSubmitted && (
          <>
            <div className="pb-grid">
              {categories.map(cat => (
                <label key={cat.id} className="pb-row">
                  <span className="pb-cat">{cat.icon} {catLabel(cat, lang)}</span>
                  <input
                    type="text"
                    maxLength={40}
                    placeholder={letter + "…"}
                    value={draft[cat.id] || ""}
                    onChange={e => setDraft(d => ({ ...d, [cat.id]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            <button className="btn" style={{ marginTop: 14 }} onClick={doSubmit}>
              ✅ {t("pbDone")}
            </button>
            <p className="muted" style={{ textAlign: "center", fontSize: 12, marginTop: 6 }}>{t("pbDoneHint")}</p>
          </>
        )}

        {isPlayer && iSubmitted && (
          <p style={{ textAlign: "center", fontWeight: 800, margin: "22px 0" }}>
            📨 {t("pbSubmitted")}<br />
            <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
              {t("pbWaitingOthers")} ({seats.filter(x => answers[x.id]).length}/{seats.length})
            </span>
          </p>
        )}

        {!isPlayer && <p className="muted" style={{ textAlign: "center" }}>{t("chromatikSpectating")}</p>}
      </div>
    );
  } else {
    // ----- Revue commune + podium (stages "review" et "done") -----------
    const doneTotals = stage === "done" && gains ? gains : review.totals;
    const ranking = seats.slice().sort((a, b) => (doneTotals[b.id] || 0) - (doneTotals[a.id] || 0));

    content = (
      <div>
        <h2 style={{ textAlign: "center", fontFamily: "'Bungee'", fontSize: 16, marginBottom: 4 }}>
          {stage === "done" ? "🏁 " + t("pbDoneTitle") : "🔎 " + t("pbReviewTitle")}
          {" — "}<span className="pb-letter-inline">{letter}</span>
        </h2>
        {stage === "review" && (
          <p className="muted" style={{ textAlign: "center", fontSize: 12.5, margin: "0 0 10px" }}>
            {isHost ? t("pbReviewHintHost") : t("pbReviewHintGuest")}
          </p>
        )}

        <div className="pb-tablewrap">
          <table className="pb-table">
            <thead>
              <tr>
                <th></th>
                {seats.map(s => (
                  <th key={s.id} className={s.id === me.id ? "me" : ""}>{s.avatar}<br />{s.username}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id}>
                  <th className="pb-cathead">{cat.icon} {catLabel(cat, lang)}</th>
                  {seats.map(s => {
                    const kk = "" + s.id + "|" + cat.id;
                    const cell = review.cells[kk];
                    const p = review.pts[kk];
                    const hasBonus = !!bonuses[kk];
                    // Barème 2026-07 : partagé = 1 (2 avec bonus), unique = 2
                    // (3 avec bonus) — la classe suit le statut de PARTAGE,
                    // pas le total (le bonus a sa propre étoile).
                    const isShared = cell.status === "ok" && p - (hasBonus ? 1 : 0) === 1;
                    const cls = "pb-cell "
                      + (cell.status === "empty" ? "empty" : cell.status === "no" ? "refused" : isShared ? "shared" : "unique")
                      + (hasBonus ? " bonused" : "")
                      + (isHost && stage === "review" && cell.status !== "empty" ? " clickable" : "");
                    return (
                      <td key={kk} className={cls}
                        onClick={() => stage === "review" && askMark(kk)}
                        title={isHost && stage === "review" && cell.status !== "empty" ? t("pbTapToToggle") : undefined}>
                        <span className="pb-answer">{cell.raw || "—"}</span>
                        <span className="pb-pts">{cell.status === "no" ? "🚫" : p > 0 ? "+" + p : "0"}{hasBonus ? " ⭐" : ""}</span>
                        {/* Bonus hôte +1 (demande 2026-07) : petite étoile
                            cliquable, distincte du basculement accepté/refusé
                            (stopPropagation) — hôte, en revue, cases OK. */}
                        {isHost && stage === "review" && cell.status === "ok" && (
                          <button
                            type="button"
                            className={"pb-bonus-btn" + (hasBonus ? " on" : "")}
                            title={t("pbBonusTip")}
                            onClick={e => { e.stopPropagation(); askBonus(kk); }}
                          >⭐</button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="pb-totalrow">
                <th className="pb-cathead">Σ</th>
                {seats.map(s => (
                  <td key={s.id}><b>{doneTotals[s.id] || 0}</b></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {stage === "review" && (
          <div className="pres-actions" style={{ marginTop: 14 }}>
            {isHost
              ? <button className="btn" style={{ width: "auto", padding: "12px 26px", marginTop: 0 }} onClick={hostValidateScores}>
                  🧮 {t("pbValidate")}
                </button>
              : <p className="muted">{t("pbWaitValidate")}</p>}
          </div>
        )}

        {stage === "done" && (
          <div style={{ marginTop: 14 }}>
            <div className="pres-podium">
              {ranking.map((s, i) => (
                <div key={s.id} className={"pres-podium-row" + (i === 0 ? " first" : "") + (s.id === me.id ? " me" : "")}>
                  <span className="place">{i + 1}</span>
                  <span>{s.avatar}</span>
                  <span className="name">{s.username}</span>
                  <b className="pts">+{doneTotals[s.id] || 0}</b>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
              {isHost ? (
                <>
                  <button className="btn" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={rejouer}>🔁 {t("c4Rejouer")}</button>
                  <button className="btn ghost" style={{ width: "auto", padding: "12px 22px", marginTop: 0 }} onClick={backToRoom}>🏠 {t("c4BackToRoom")}</button>
                </>
              ) : (
                <p className="muted">{t("c4RejouerWait")}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: "min(860px, 94vw)" }}>
      <h1>{t("pbTitle")}</h1>
      <Crossfade id={phase + ":" + stage}>{content}</Crossfade>
    </div>
  );
}
