"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby, recordMatchResult } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import Die from "./Die";
import {
  UPPER_IDS, LOWER_IDS, ALL_IDS, UPPER_BONUS_THRESHOLD, UPPER_BONUS_VALUE,
  freshCard, scoreCategory, applyScore, upperSubtotal, hasUpperBonus,
  cardTotal, isCardComplete, filledCount, isYahtzeeRoll,
} from "./scoring";
import { playDiceShuffle, playConfirmChime, stopSound, playGameWin, playGameLose } from "@/lib/sfx";

/* ==========================================================================
   YAHTZEE — jeu de dés au tour par tour, 1 à N joueurs.

   Pattern réseau : hôte arbitre, identique à Chromatik / Puissance 4.
   Les joueurs envoient des `move_attempt` en broadcast ; SEUL l'hôte les
   valide, calcule le résultat et rediffuse l'état via `state`.

   Point crucial pour un jeu de dés : l'ALÉATOIRE n'existe que chez l'hôte.
   Aucun client ne lance jamais ses propres dés — il demande un lancer,
   l'hôte tire les valeurs et les diffuse. Impossible que deux écrans
   voient des dés différents, et impossible de tricher en relançant
   localement.

   Toute la logique de score vit dans ./scoring.js (pur, déterministe,
   couvert par la suite de vérifications du script de contrôle). Ce
   fichier-ci ne contient QUE l'orchestration réseau et l'affichage.

   Deux garde-fous d'ergonomie contre les erreurs irréversibles :
   - inscrire une catégorie demande DEUX gestes (sélection, puis bouton
     Valider) — jamais de score inscrit sur un simple clic ;
   - chaque catégorie libre affiche en temps réel ce qu'elle rapporterait
     avec les dés actuels, pour choisir en connaissance de cause.
   ========================================================================== */

const GAME_ID = "yahtzee";
const DICE_COUNT = 5;
const ROLLS_PER_TURN = 3;
const NO_HELD = Object.freeze([false, false, false, false, false]);

// Libellés : clé i18n par catégorie (l'ordre d'affichage vient de scoring.js).
const CAT_LABEL_KEY = {
  ones: "yzOnes", twos: "yzTwos", threes: "yzThrees",
  fours: "yzFours", fives: "yzFives", sixes: "yzSixes",
  threeKind: "yzThreeKind", fourKind: "yzFourKind", fullHouse: "yzFullHouse",
  smallStraight: "yzSmallStraight", largeStraight: "yzLargeStraight",
  yahtzee: "yzYahtzee", chance: "yzChance",
};
// Abréviations compactes pour les mini scoring boards des adversaires.
const CAT_ABBR = {
  ones: "1", twos: "2", threes: "3", fours: "4", fives: "5", sixes: "6",
  threeKind: "3K", fourKind: "4K", fullHouse: "FH",
  smallStraight: "SS", largeStraight: "LS", yahtzee: "YZ", chance: "CH",
};

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

// Position/rotation de repos d'un dé sur la table, façon dé réellement
// lancé qui retombe de travers, à une distance variable de ses voisins —
// jamais parfaitement alignés en rangée. Purement cosmétique et 100% local
// à CHAQUE client (chacun voit une dispersion différente, comme deux
// personnes regardant le même dé sous un angle différent) — n'a aucune
// incidence sur la valeur réelle du dé, qui elle vient toujours de l'hôte.
//
// Correctif 2026-07 (demande explicite "les dés ne doivent pas être coupés
// par les bords... c'est une bordure sur laquelle les dés doivent
// rebondir. Et pareil entre eux, les dés ne peuvent pas se superposer, il
// faut qu'ils s'entrechoquent") : avant, chaque dé recevait un décalage
// ALÉATOIRE INDÉPENDANT (±32px/±45px), sans la moindre notion de la taille
// réelle de la zone de lancer ni des autres dés — rien n'empêchait deux dés
// de se chevaucher, ni un dé de déborder du plateau sur un petit écran.
// resolveDiceLayout() calcule maintenant la position de TOUS les dés d'un
// coup, en pixels RÉELS (mesurés dans le DOM, donc toujours justes quel que
// soit le clamp() responsive appliqué), avec deux contraintes : rester
// strictement à l'intérieur de la zone ("rebond" = simple bornage, jamais
// de dépassement) et ne jamais se chevaucher (les dés qui se chevauchent —
// assimilés à des cercles — se "repoussent" à l'écart l'un de l'autre par
// petites touches, jusqu'à convergence). Les dés GARDÉS (lockedMask) ne
// bougent jamais eux-mêmes ; les autres dés doivent les contourner.
const DIE_GAP_PX = 5;     // écart minimal visible entre deux dés une fois posés
const TRAY_EDGE_PX = 4;   // marge de sécurité avant le bord de la zone

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function resolveDiceLayout({ trayW, trayH, dieSize, prev, lockedMask }) {
  const r = dieSize / 2;
  const maxX = Math.max(4, trayW / 2 - r - TRAY_EDGE_PX);
  const maxY = Math.max(4, trayH / 2 - r - TRAY_EDGE_PX);
  const minDist = dieSize + DIE_GAP_PX;

  const pts = prev.map((p, i) => {
    if (lockedMask[i]) {
      // Dé gardé : reste où il était, juste re-borné (au cas où la zone
      // aurait changé de taille entre-temps, ex. redimensionnement fenêtre).
      return { tx: clamp(p?.tx || 0, -maxX, maxX), ty: clamp(p?.ty || 0, -maxY, maxY) };
    }
    // Dé qui vient d'être (re)lancé : nouveau départ aléatoire dans la zone.
    return { tx: (Math.random() * 2 - 1) * maxX * 0.75, ty: (Math.random() * 2 - 1) * maxY * 0.75 };
  });

  for (let iter = 0; iter < 150; iter++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].tx - pts[i].tx, dy = pts[j].ty - pts[i].ty;
        let dist = Math.hypot(dx, dy);
        if (dist < minDist) {
          moved = true;
          if (dist < 0.01) dist = 0.01;
          const push = (minDist - dist) / 2;
          const ux = dx / dist, uy = dy / dist;
          if (!lockedMask[i]) { pts[i].tx -= ux * push; pts[i].ty -= uy * push; }
          if (!lockedMask[j]) { pts[j].tx += ux * push; pts[j].ty += uy * push; }
        }
      }
      if (!lockedMask[i]) {
        pts[i].tx = clamp(pts[i].tx, -maxX, maxX);
        pts[i].ty = clamp(pts[i].ty, -maxY, maxY);
      }
    }
    if (!moved) break;
  }

  return pts.map((p, i) => ({
    tx: Math.round(p.tx), ty: Math.round(p.ty),
    trot: lockedMask[i] ? (prev[i]?.trot ?? 0) : Math.round((Math.random() - 0.5) * 84),
  }));
}
// Rangée par défaut AVANT le premier lancer (dés "?" fantômes) ou entre deux
// tours (dice===null) : un simple alignement propre, sans avoir besoin de
// mesurer le DOM (pas encore de vrais dés à disperser/faire collisionner).
// Espacement fixe raisonnable — la zone de lancer est toujours assez large
// pour l'accueillir confortablement (voir .yz-tray min-height/padding).
const GHOST_ROW = [-92, -46, 0, 46, 92].map(tx => ({ tx, ty: 0, trot: 0 }));

function shuffleSeats(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealFreshState(seats) {
  const cards = {};
  seats.forEach(s => { cards[s.id] = freshCard(); });
  return {
    seats, cards,
    turnIdx: 0,
    dice: null,            // null = le joueur du tour n'a pas encore lancé
    held: NO_HELD.slice(),
    rollsLeft: ROLLS_PER_TURN,
    finished: false,
    winners: [],
    lastAction: null,
  };
}

export default function YahtzeeGame({ room, me, isHost, players, t, lang, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro -> playing (la table ne disparaît jamais)
  const [seats, setSeats] = useState([]);
  const [cards, setCards] = useState({});
  const [turnIdx, setTurnIdx] = useState(0);
  const [dice, setDice] = useState(null);
  const [held, setHeld] = useState(NO_HELD.slice());
  const [rollsLeft, setRollsLeft] = useState(ROLLS_PER_TURN);
  const [finished, setFinished] = useState(false);
  const [winners, setWinners] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [channelReady, setChannelReady] = useState(false);

  // Locaux au joueur (jamais diffusés TELS QUELS au sens "état de vérité" —
  // myHeld part bien sur le réseau au moment du lancer, ET, depuis le
  // correctif ci-dessous, à chaque clic aussi, mais purement à titre
  // d'aperçu cosmétique, voir livePreview) :
  const [myHeld, setMyHeld] = useState(NO_HELD.slice()); // dés gardés, envoyé au moment du lancer
  // Correctif (demande explicite "cette information doit aussi être visible
  // pour les autres joueurs, en direct") : avant, la sélection des dés
  // gardés (myHeld) était purement locale au joueur actif jusqu'au PROCHAIN
  // lancer — les autres joueurs/spectateurs ne voyaient donc rien bouger
  // tant que le lancer suivant n'était pas arrivé. `livePreview` (reçu via
  // l'événement broadcast "hold_preview", envoyé à chaque clic par
  // toggleHold) porte { seatId, held } du joueur actif EN TEMPS RÉEL, purement
  // cosmétique (n'affecte jamais l'arbitrage — la vérité du coup reste le
  // `held` envoyé avec le move_attempt "roll") : réinitialisé dès qu'un
  // nouvel état de vérité arrive (nouveau lancer, nouveau tour, nouvelle
  // manche), pour ne jamais laisser un aperçu obsolète traîner.
  const [livePreview, setLivePreview] = useState(null);
  // Correctif 2026-07 (demande explicite "aussi simple que ça") : plus de
  // sélection en deux temps — cliquer une case du tableau score IMMÉDIATEMENT
  // et termine le tour. L'ancienne barre de confirmation fixe en bas d'écran
  // ("message parasite en dessous de la zone de jeu") a été supprimée avec
  // l'état pendingCat qui la pilotait.
  const [rollSeq, setRollSeq] = useState(0);              // incrément à chaque lancer -> relance l'animation CSS
  const [scatter, setScatter] = useState(GHOST_ROW);
  // Correctif 2026-07 : la dispersion des dés se calcule désormais en deux
  // temps — applyLocalState() note QUELS dés viennent d'être relancés
  // (freshMaskRef) et incrémente scatterJob ; un useLayoutEffect séparé
  // (plus bas) mesure alors la vraie taille DOM de la zone de lancer et
  // d'un dé, et appelle resolveDiceLayout() pour poser tous les dés sans
  // dépassement ni chevauchement. Deux passes nécessaires car le calcul a
  // besoin du DOM déjà rendu (tailles réelles), inaccessible au moment où
  // applyLocalState() reçoit l'état réseau.
  const [scatterJob, setScatterJob] = useState(0);
  const freshMaskRef = useRef([true, true, true, true, true]); // true = doit être repositionné
  const trayElRef = useRef(null);
  const [myWin, setMyWin] = useState(false);
  const [bonusFlash, setBonusFlash] = useState(false);    // bandeau +100 Yahtzee supplémentaire

  // Mélange avant révélation : ~1s de "brassage" visuel + sonore avant que
  // les vraies valeurs (déjà connues, déjà dans `dice`) ne s'affichent.
  // Purement cosmétique et 100% local à chaque client — la vérité du coup
  // (dice/held/rollsLeft) est appliquée immédiatement en arrière-plan, donc
  // aucun risque de désynchro avec l'arbitrage de l'hôte.
  const [shuffling, setShuffling] = useState(false);
  const [shuffleFaces, setShuffleFaces] = useState([1, 1, 1, 1, 1]);
  // Célébration Yahtzee : null, ou { kind: "yahtzee" | "yahtzeeSix", key }.
  const [celebration, setCelebration] = useState(null);
  // Bannière de fin de partie, propre à CHAQUE joueur selon son résultat :
  // null, "win" ou "lose" (voir l'effet "Sauvegarde du score" plus bas).
  const [endBanner, setEndBanner] = useState(null);

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const flashTimer = useRef(null);
  const shuffleTimerRef = useRef(null);
  const shuffleIntervalRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const shuffleAudioRef = useRef(null);     // nœud <audio> en cours, pour pouvoir le couper
  const shuffleActiveRef = useRef(false);   // true dès le clic local, évite un second démarrage
  const latestRollPayloadRef = useRef(null); // vraies valeurs, dès qu'on les connaît
  const endBannerTimerRef = useRef(null);

  // Miroir de l'état pour les handlers de broadcast (closures figées sinon).
  useEffect(() => {
    stateRef.current = { seats, cards, turnIdx, dice, held, rollsLeft, finished, winners };
  }, [seats, cards, turnIdx, dice, held, rollsLeft, finished, winners]);

  function applyLocalState(s, extra = {}) {
    // Un nouvel état de VÉRITÉ arrive (nouveau lancer, nouveau tour, nouvelle
    // manche) : tout aperçu "en direct" plus ancien (livePreview) est
    // désormais obsolète — le `held` qui vient d'arriver fait foi.
    setLivePreview(null);
    setSeats(s.seats); setCards(s.cards); setTurnIdx(s.turnIdx);
    setDice(s.dice); setHeld(s.held || NO_HELD.slice());
    setRollsLeft(s.rollsLeft); setFinished(!!s.finished);
    setWinners(s.winners || []); setLastAction(s.lastAction || null);
    // Sync des dés gardés locaux : après MON lancer, l'état qui revient est
    // la vérité (utile aussi après un rechargement en plein tour).
    setMyHeld(s.held || NO_HELD.slice());
    // deferReveal : la reprise/animation de tumble sera déclenchée plus tard
    // par finishShuffle(), une fois le mélange sonore/visuel joué.
    if (s.lastAction?.type === "roll" && !extra.deferReveal) setRollSeq(n => n + 1);

    // Dispersion réaliste sur la table : on se base sur les drapeaux "gardé"
    // (held) de l'action de lancer elle-même — pas sur une comparaison des
    // valeurs, qui se tromperait dans le cas rare où un dé relancé retombe
    // par coïncidence sur la même face qu'avant. Seuls les dés RÉELLEMENT
    // relancés (held=false au moment du lancer) reçoivent une nouvelle
    // position ; les dés gardés restent exactement où ils étaient.
    // Correctif 2026-07 : le calcul RÉEL (bornage + anti-chevauchement) a
    // besoin du DOM déjà rendu (voir resolveDiceLayout) — on se contente ici
    // de noter quels dés sont "frais" et de déclencher le useLayoutEffect
    // dédié (scatterJob) qui fera le calcul juste après.
    if (s.dice) {
      const isRollAction = s.lastAction?.type === "roll";
      if (isRollAction) {
        freshMaskRef.current = s.dice.map((_, i) => !(s.held ? s.held[i] === true : false));
        setScatterJob(n => n + 1);
      }
    } else {
      setScatter(GHOST_ROW);
    }

    if (s.lastAction?.type === "score" && s.lastAction.extraYahtzee && s.lastAction.seatId === me.id) {
      setBonusFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setBonusFlash(false), 3200);
    }
    if (extra.resetGain) {
      setMyWin(false); savedResultRef.current = false;
      clearTimeout(endBannerTimerRef.current);
      setEndBanner(null);
    }
  }

  // Correctif 2026-07 : calcule la position RÉELLE des dés (bornée à la
  // zone de lancer, sans chevauchement) une fois le DOM à jour — measure
  // en pixels via trayElRef (la zone .yz-dice remplit maintenant tout
  // l'intérieur rembourré de sa .yz-tray, voir CSS) et la taille d'un dé
  // déjà rendu. useLayoutEffect plutôt que useEffect : la nouvelle position
  // est appliquée AVANT la peinture du navigateur, donc pas de flash visible
  // à une position provisoire.
  useLayoutEffect(() => {
    if (scatterJob === 0) return;
    const trayEl = trayElRef.current;
    if (!trayEl) return;
    const dieEl = trayEl.querySelector(".yz-die");
    const dieSize = dieEl ? dieEl.getBoundingClientRect().width : 56;
    const trayW = trayEl.clientWidth, trayH = trayEl.clientHeight;
    if (!trayW || !trayH) return;
    setScatter(prev => resolveDiceLayout({
      trayW, trayH, dieSize, prev, lockedMask: freshMaskRef.current.map(fresh => !fresh),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scatterJob]);

  // Petite fête : Yahtzee (5 dés identiques) — encore plus si ce sont 5 six,
  // le lancer le plus rare et le plus payant du jeu.
  function triggerCelebration(kind) {
    clearTimeout(celebrationTimerRef.current);
    setCelebration({ kind, key: Date.now() });
    const duration = kind === "yahtzeeSix" ? 10000 : 3600;
    celebrationTimerRef.current = setTimeout(() => setCelebration(null), duration);
  }

  // Mélange avant révélation : démarre DÈS LE CLIC côté acteur (zéro latence
  // perçue), et au pire dès la réception du broadcast côté spectateurs qui
  // n'ont rien cliqué. La vérité (dice/held/rollsLeft) est appliquée TOUT DE
  // SUITE dès qu'elle arrive (aucun risque pour l'arbitrage de l'hôte, qui se
  // base sur stateRef à jour) ; seule la révélation VISUELLE + le son sont
  // repoussés d'~1s, pendant laquelle les dés non gardés affichent des faces
  // aléatoires en boucle. Le son démarre pile avec le mélange et est coupé
  // pile à la révélation — jamais de son qui continue sur des dés déjà posés.
  function beginShuffle(diceCount) {
    clearTimeout(shuffleTimerRef.current);
    clearInterval(shuffleIntervalRef.current);
    stopSound(shuffleAudioRef.current);
    shuffleActiveRef.current = true;
    setShuffling(true);
    shuffleAudioRef.current = playDiceShuffle(diceCount);
    shuffleIntervalRef.current = setInterval(() => {
      setShuffleFaces([0, 1, 2, 3, 4].map(() => 1 + Math.floor(Math.random() * 6)));
    }, 100);
    shuffleTimerRef.current = setTimeout(finishShuffle, 1000);
  }

  function finishShuffle() {
    if (!latestRollPayloadRef.current) {
      // Les vraies valeurs ne sont pas encore arrivées (latence réseau
      // inhabituelle) : on retente un peu plus tard plutôt que de révéler
      // n'importe quoi. Le son continue jusque-là, très bref surcroît.
      shuffleTimerRef.current = setTimeout(finishShuffle, 120);
      return;
    }
    clearInterval(shuffleIntervalRef.current);
    stopSound(shuffleAudioRef.current);
    shuffleAudioRef.current = null;
    shuffleActiveRef.current = false;
    setShuffling(false);
    setRollSeq(n => n + 1); // déclenche l'animation de tumble avec les vraies valeurs
    const finalDice = latestRollPayloadRef.current;
    latestRollPayloadRef.current = null;
    if (isYahtzeeRoll(finalDice)) {
      triggerCelebration(finalDice[0] === 6 ? "yahtzeeSix" : "yahtzee");
    }
  }

  // Double-clic (ou clic pressé) pendant le mélange : écourte l'animation et
  // le son, présente les dés tout de suite (dès que la vraie valeur est là).
  function skipShuffle() {
    if (!shuffling) return;
    stopSound(shuffleAudioRef.current);
    shuffleAudioRef.current = null;
    clearInterval(shuffleIntervalRef.current);
    clearTimeout(shuffleTimerRef.current);
    finishShuffle();
  }

  function persist(s) {
    if (!isHost) return;
    saveGameState(room.id, GAME_ID, { phase: "playing", ...s });
  }

  useEffect(() => {
    const ch = supabase.channel(GAME_ID + "_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      // Nouvelle manche : on coupe tout mélange/célébration en cours pour ne
      // pas les laisser déborder sur la table fraîchement redistribuée.
      clearTimeout(shuffleTimerRef.current);
      clearInterval(shuffleIntervalRef.current);
      stopSound(shuffleAudioRef.current);
      shuffleAudioRef.current = null;
      shuffleActiveRef.current = false;
      latestRollPayloadRef.current = null;
      setShuffling(false);
      clearTimeout(celebrationTimerRef.current);
      setCelebration(null);
      applyLocalState(payload, { resetGain: true });
      setPhase("playing");
      persist(payload);
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      persist(payload);
      if (payload.lastAction?.type === "roll") {
        applyLocalState(payload, { deferReveal: true });
        latestRollPayloadRef.current = payload.dice;
        // Si CE client a déjà démarré le mélange à son propre clic, on ne
        // fait que transmettre la vraie valeur (déjà fait ci-dessus) — le
        // mélange en cours ira jusqu'à son terme tout seul. Sinon (un autre
        // joueur/spectateur découvre le lancer par le réseau), on démarre
        // le mélange maintenant, avec le même dosage de son (few/many).
        if (!shuffleActiveRef.current) {
          const rollingCount = (payload.held || NO_HELD).filter(h => !h).length;
          beginShuffle(rollingCount);
        }
      } else {
        applyLocalState(payload);
      }
    });

    ch.on("broadcast", { event: "move_attempt" }, ({ payload }) => {
      if (!isHost) return;
      hostApplyMove(payload.seatId, payload.action);
    });

    // Aperçu EN DIRECT de la sélection des dés (demande explicite) : envoyé
    // par n'importe quel client (pas seulement l'hôte — purement cosmétique,
    // n'affecte jamais l'arbitrage réel du coup), reçu par tous, y compris
    // l'émetteur lui-même (self:true) — sans conséquence puisque ce dernier
    // affiche toujours SA propre sélection via myHeld, jamais via
    // livePreview (voir diceRow plus bas).
    ch.on("broadcast", { event: "hold_preview" }, ({ payload }) => {
      setLivePreview(payload);
    });

    ch.subscribe(status => {
      if (status === "SUBSCRIBED") {
        setChannelReady(true);
        if (!restoredRef.current) {
          restoredRef.current = true;
          const saved = readGameState(room, GAME_ID);
          if (saved) {
            applyLocalState(saved);
            setPhase("playing");
            autoStartedRef.current = true;
          }
        }
      }
    });

    return () => {
      clearTimeout(flashTimer.current);
      clearTimeout(shuffleTimerRef.current);
      clearInterval(shuffleIntervalRef.current);
      clearTimeout(celebrationTimerRef.current);
      stopSound(shuffleAudioRef.current);
      clearTimeout(endBannerTimerRef.current);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id, isHost]);

  // ----- Arbitrage (hôte uniquement) ---------------------------------------
  function broadcastNewState(next) {
    channelRef.current.send({ type: "broadcast", event: "state", payload: next });
  }

  function hostApplyMove(seatId, action) {
    const s = stateRef.current;
    if (!s || s.finished || !s.seats.length) return;
    const currentSeat = s.seats[s.turnIdx];
    if (!currentSeat || currentSeat.id !== seatId) return; // pas son tour : refus silencieux

    if (action.type === "roll") {
      if (s.rollsLeft <= 0) return;
      // Premier lancer du tour : les 5 dés partent, quoi qu'annonce `held`
      // (il n'y a rien à garder puisque rien n'a encore été lancé).
      const firstRoll = s.dice === null;
      const heldNow = firstRoll
        ? NO_HELD.slice()
        : NO_HELD.map((_, i) => action.held?.[i] === true); // normalisation stricte en booléens
      const newDice = [];
      for (let i = 0; i < DICE_COUNT; i++) {
        newDice.push(!firstRoll && heldNow[i] ? s.dice[i] : rollDie());
      }
      const next = {
        seats: s.seats, cards: s.cards, turnIdx: s.turnIdx,
        dice: newDice, held: heldNow, rollsLeft: s.rollsLeft - 1,
        finished: false, winners: [],
        lastAction: { type: "roll", seatId },
      };
      broadcastNewState(next);
      return;
    }

    if (action.type === "score") {
      if (s.dice === null) return; // il faut avoir lancé au moins une fois
      const card = s.cards[seatId];
      if (!card) return;
      const result = applyScore(card, action.catId, s.dice);
      if (!result) return; // catégorie inconnue ou déjà remplie : refus

      const newCards = { ...s.cards, [seatId]: result.card };
      const allDone = s.seats.every(seat => isCardComplete(newCards[seat.id]));

      let next;
      if (allDone) {
        // Fin de partie : totaux définitifs, gagnant(s) au score max
        // (l'égalité est possible et gérée : plusieurs vainqueurs).
        const totals = s.seats.map(seat => ({ id: seat.id, total: cardTotal(newCards[seat.id]) }));
        const best = Math.max(...totals.map(x => x.total));
        next = {
          seats: s.seats, cards: newCards, turnIdx: s.turnIdx,
          dice: s.dice, held: s.held, rollsLeft: 0,
          finished: true,
          winners: totals.filter(x => x.total === best).map(x => x.id),
          lastAction: { type: "score", seatId, catId: action.catId, extraYahtzee: result.gainedExtraYahtzee },
        };
      } else {
        // Tour suivant : on saute les feuilles déjà complètes (n'arrive que
        // si les joueurs ont un nombre de cases inégal — impossible avec ce
        // flux, mais la boucle bornée protège contre tout état corrompu).
        let ti = s.turnIdx;
        for (let hop = 0; hop < s.seats.length; hop++) {
          ti = (ti + 1) % s.seats.length;
          if (!isCardComplete(newCards[s.seats[ti].id])) break;
        }
        next = {
          seats: s.seats, cards: newCards, turnIdx: ti,
          dice: null, held: NO_HELD.slice(), rollsLeft: ROLLS_PER_TURN,
          finished: false, winners: [],
          lastAction: { type: "score", seatId, catId: action.catId, extraYahtzee: result.gainedExtraYahtzee },
        };
      }
      broadcastNewState(next);
    }
  }

  // ----- Démarrage : tous les joueurs du salon sont à table -----------------
  useEffect(() => {
    if (!isHost || phase !== "intro" || autoStartedRef.current || !channelReady) return;
    if (players.length < 1) return;
    autoStartedRef.current = true;
    const humanSeats = shuffleSeats(players.map(p => ({
      id: p.profile_id, username: p.profiles?.username, avatar: p.profiles?.avatar,
    })));
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: dealFreshState(humanSeats) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, phase, channelReady, players.length]);

  function rejouer() {
    if (!isHost || !seats.length) return;
    channelRef.current.send({ type: "broadcast", event: "match_start", payload: dealFreshState(shuffleSeats(seats)) });
  }

  async function backToRoom() {
    await resetRoomToLobby(room.id);
    onFinish && onFinish();
  }

  // ----- Actions du joueur local --------------------------------------------
  const mySeat = seats.find(s => s.id === me.id);
  const isPlayer = !!mySeat;
  const currentSeat = seats[turnIdx];
  const isMyTurn = phase === "playing" && !finished && isPlayer && currentSeat?.id === me.id;
  const hasRolled = dice !== null;
  // Si les 5 dés sont déjà gardés, une relance ne changerait strictement
  // rien (aucun dé ne serait retiré) — inutile de laisser gaspiller un
  // des 2 lancers restants pour zéro effet visible.
  const allHeld = hasRolled && myHeld.every(h => h === true);
  const canRoll = isMyTurn && rollsLeft > 0 && !allHeld && !shuffling;
  const canScore = isMyTurn && hasRolled && !shuffling;
  const myCard = cards[me.id] || null;

  function toggleHold(i) {
    if (!isMyTurn || !hasRolled || rollsLeft === 0) return; // plus de relance = garder n'a plus de sens
    const next = myHeld.map((h, idx) => (idx === i ? !h : h));
    setMyHeld(next);
    // Diffusion EN DIRECT (demande explicite) : les autres joueurs/
    // spectateurs voient cette sélection tout de suite, sans attendre le
    // prochain lancer — purement un aperçu cosmétique (voir livePreview),
    // jamais une action d'arbitrage.
    channelRef.current?.send({ type: "broadcast", event: "hold_preview", payload: { seatId: me.id, held: next } });
  }

  // Glisser-déposer des dés (demande explicite 2026-07, "grave problème de
  // lisibilité... en cas de superposition des dés") : resolveDiceLayout()
  // fait de son mieux pour écarter les dés automatiquement, mais dans une
  // zone de lancer réduite (petit écran, plusieurs dés déjà gardés) le
  // placement automatique peut rester imparfait — le joueur actif peut
  // désormais réajuster À LA MAIN la position d'un dé sur SON PROPRE écran
  // pour retrouver une lecture claire. Purement cosmétique et 100% local
  // (exactement la même philosophie que `scatter` lui-même, voir plus haut,
  // "chacun voit une dispersion différente") : jamais diffusé, jamais
  // synchronisé, n'affecte à AUCUN degré l'arbitrage — juste un dé qu'on
  // pousse du doigt sur la table pour mieux le voir. Réservé au joueur actif
  // (comme le reste de l'interaction avec les dés), pas aux spectateurs.
  //
  // Implémenté en Pointer Events (souris + tactile unifiés via
  // setPointerCapture, qui garde les événements pointermove/pointerup
  // rattachés au dé même si le doigt/curseur sort de ses limites visuelles
  // pendant le geste) plutôt qu'un vrai HTML5 drag-and-drop natif — celui-ci
  // est pensé pour déplacer des ÉLÉMENTS ENTRE zones (avec une image
  // fantôme, un dropzone...), pas pour du glisser libre borné avec un
  // algorithme anti-chevauchement ; nettement moins fluide au doigt et plus
  // difficile à contraindre proprement aux limites de la zone de lancer.
  const DRAG_THRESHOLD_PX = 6; // en-deçà : un simple clic (garder/libérer), pas un glisser
  const dragRef = useRef(null); // session de glisser en cours : { index, pointerId, startX, startY, baseTx, baseTy, maxX, maxY, moved }
  const suppressNextClickRef = useRef(false); // un glisser qui vient de finir ne doit jamais aussi valoir un clic
  const [draggingIndex, setDraggingIndex] = useState(null); // pilote la classe CSS .dragging (transition coupée, z-index)

  function dieTrayBounds(dieEl) {
    const trayEl = trayElRef.current;
    if (!trayEl || !dieEl) return null;
    const dieSize = dieEl.getBoundingClientRect().width || 56;
    const trayW = trayEl.clientWidth, trayH = trayEl.clientHeight;
    const r = dieSize / 2;
    return {
      maxX: Math.max(4, trayW / 2 - r - TRAY_EDGE_PX),
      maxY: Math.max(4, trayH / 2 - r - TRAY_EDGE_PX),
    };
  }

  function handleDiePointerDown(e, i) {
    if (!isMyTurn || !hasRolled) return; // rien à réajuster hors de son propre tour
    const bounds = dieTrayBounds(e.currentTarget);
    if (!bounds) return;
    const current = scatter[i] || { tx: 0, ty: 0, trot: 0 };
    dragRef.current = {
      index: i, pointerId: e.pointerId,
      startX: e.clientX, startY: e.clientY,
      baseTx: current.tx, baseTy: current.ty,
      maxX: bounds.maxX, maxY: bounds.maxY,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDiePointerMove(e, i) {
    const d = dragRef.current;
    if (!d || d.index !== i || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return; // sous le seuil : encore un simple clic potentiel
      d.moved = true;
      setDraggingIndex(i);
    }
    e.preventDefault();
    const tx = clamp(d.baseTx + dx, -d.maxX, d.maxX);
    const ty = clamp(d.baseTy + dy, -d.maxY, d.maxY);
    setScatter(prev => {
      const next = prev.slice();
      next[i] = { ...(next[i] || { trot: 0 }), tx, ty };
      return next;
    });
  }

  function endDieDrag(i) {
    const d = dragRef.current;
    if (!d || d.index !== i) return;
    dragRef.current = null;
    setDraggingIndex(null);
    // Le "clic" de souris/tactile qui suit systématiquement un pointerup se
    // déclenche APRÈS ce handler : s'il y a eu un vrai glisser, on prévient
    // handleDieClick (ci-dessous) de l'ignorer plutôt que de garder/libérer
    // le dé par erreur en fin de geste.
    if (d.moved) suppressNextClickRef.current = true;
  }
  function handleDiePointerUp(e, i) { endDieDrag(i); }
  function handleDiePointerCancel(e, i) { endDieDrag(i); }

  function handleDieClick(i, action) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return; // ce clic clôt un glisser-déposer, pas une sélection
    }
    action?.();
  }

  function attemptRoll() {
    if (!canRoll) return;
    // Nombre de dés réellement concernés par CE lancer (les gardés ne
    // bougent pas) : détermine le montage sonore (few < 4, many >= 4) et
    // démarre le mélange visuel+sonore TOUT DE SUITE, sans attendre le
    // retour réseau — zéro latence perçue pour la personne qui clique.
    const rollingCount = dice === null ? DICE_COUNT : myHeld.filter(h => !h).length;
    latestRollPayloadRef.current = null;
    beginShuffle(rollingCount);
    channelRef.current?.send({
      type: "broadcast", event: "move_attempt",
      payload: { seatId: me.id, action: { type: "roll", held: myHeld } },
    });
  }

  // Raccourci clavier (barre d'Espace, demande 2026-07) : lance/relance les
  // dés — UNIQUEMENT quand `canRoll` est vrai (c'est mon tour, il reste un
  // lancer, tous les dés ne sont pas gardés, pas de mélange en cours),
  // exactement la même garde que le bouton 🎲 lui-même. Ignoré si le focus
  // est sur un champ de saisie (ex. le chat du salon) pour ne jamais voler
  // un espace tapé dans un message — même précaution que le Ludo.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.code !== "Space") return;
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable) return;
      if (!canRoll) return;
      e.preventDefault();
      attemptRoll();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRoll, dice, myHeld]);

  // Correctif 2026-07 : un seul clic sur une case libre du tableau la score
  // ET termine le tour, sans étape de confirmation intermédiaire.
  function scoreCategoryClick(catId) {
    if (!canScore || !myCard || myCard[catId] !== null) return;
    playConfirmChime();
    channelRef.current?.send({
      type: "broadcast", event: "move_attempt",
      payload: { seatId: me.id, action: { type: "score", catId } },
    });
  }

  // Sauvegarde du score de salon (chaque joueur enregistre le sien, RLS oblige).
  // Même déclencheur pour la bannière + le son de fin (victoire/défaite) :
  // une seule fois par manche, propre au résultat de CE joueur.
  useEffect(() => {
    if (!finished || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const won = winners.includes(me.id);
    setMyWin(won);
    setEndBanner(won ? "win" : "lose");
    if (won) playGameWin(); else playGameLose();
    clearTimeout(endBannerTimerRef.current);
    endBannerTimerRef.current = setTimeout(() => setEndBanner(null), won ? 4000 : 3400);
    recordMatchResult(room.id, won);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // ----- Rendu ---------------------------------------------------------------

  function renderScoreRow(catId) {
    const filled = myCard ? myCard[catId] : null;
    const isFree = myCard && filled === null;
    const potential = canScore && isFree ? scoreCategory(catId, dice) : null;
    const selectable = canScore && isFree;
    return (
      <button
        type="button"
        key={catId}
        className={"yz-row" + (selectable ? " selectable" : "") + (filled !== null ? " done" : "")}
        onClick={() => { if (selectable) scoreCategoryClick(catId); }}
        disabled={!selectable}
      >
        <span className="yz-row-label">{t(CAT_LABEL_KEY[catId])}</span>
        <span className="yz-row-value">
          {filled !== null ? filled : potential !== null ? <em>{potential}</em> : "—"}
        </span>
      </button>
    );
  }

  // Confettis de la célébration Yahtzee — générés une seule fois par
  // déclenchement (clé stable), jamais recalculés à chaque re-rendu.
  const confettiPieces = useMemo(() => {
    if (!celebration) return [];
    const big = celebration.kind === "yahtzeeSix";
    const count = big ? 46 : 24;
    const palette = big
      ? ["#ff3d7f", "#ffd166", "#4dd6ff", "#b6f04c", "#ff8a3d", "#c77dff"]
      : ["#b6f04c", "#ffd166", "#4dd6ff"];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * (big ? 3.5 : 1.2),
      duration: 1.6 + Math.random() * 1.6,
      color: palette[i % palette.length],
      rot: Math.round(Math.random() * 360),
      size: 6 + Math.round(Math.random() * 6),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebration?.key]);

  // Confettis de la bannière de victoire de fin de partie — même logique
  // que ci-dessus, déclenchée une seule fois par manche.
  const endConfettiPieces = useMemo(() => {
    if (endBanner !== "win") return [];
    const palette = ["#b6f04c", "#ffd166", "#4dd6ff", "#ff8a3d"];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 1.8 + Math.random() * 1.6,
      color: palette[i % palette.length],
      rot: Math.round(Math.random() * 360),
      size: 6 + Math.round(Math.random() * 6),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endBanner]);

  let content;

  if (phase === "playing" && (myCard !== null || !isPlayer)) {
    const upper = myCard ? upperSubtotal(myCard) : 0;
    const winnerNames = winners.map(id => seats.find(s => s.id === id)?.username).filter(Boolean);
    const iWon = winners.includes(me.id);

    content = (
      <div>
        {/* Comparatif des totaux — face à face, mis en avant pour suivre l'avancement */}
        <div className="yz-totals-bar">
          {(() => {
            const totals = seats.map(s => (cards[s.id] ? cardTotal(cards[s.id]) : 0));
            const maxTotal = Math.max(0, ...totals);
            return seats.map((s, i) => (
              <div
                key={s.id}
                className={"yz-total-chip"
                  + (s.id === me.id ? " me" : "")
                  + (currentSeat?.id === s.id && !finished ? " active" : "")
                  + (maxTotal > 0 && totals[i] === maxTotal ? " leading" : "")}
              >
                <span className="avatar">{s.avatar}</span>
                <span className="name">{s.username}</span>
                <b className="total">{maxTotal > 0 && totals[i] === maxTotal ? "👑 " : ""}{totals[i]}</b>
              </div>
            ));
          })()}
        </div>

        {/* Feuilles des adversaires — compactes et grisées, suivies en direct
            à mesure de leurs lancers/choix (purement en lecture, jamais
            modifiables). */}
        {seats.filter(s => s.id !== me.id).length > 0 && (
          <div className="yz-mini-boards">
            {seats.filter(s => s.id !== me.id).map(s => {
              const c = cards[s.id];
              return (
                <div key={s.id} className={"yz-mini-board" + (currentSeat?.id === s.id && !finished ? " active" : "")}>
                  <div className="yz-mini-board-head">
                    <span className="avatar">{s.avatar}</span>
                    <span className="name">{s.username}</span>
                    <b>{c ? cardTotal(c) : 0}</b>
                  </div>
                  <div className="yz-mini-grid">
                    {ALL_IDS.map(id => (
                      <span
                        key={id}
                        className={"yz-mini-cell" + (c && c[id] !== null ? " filled" : "")}
                        title={t(CAT_LABEL_KEY[id])}
                      >
                        <em>{CAT_ABBR[id]}</em>
                        <b>{c && c[id] !== null ? c[id] : "—"}</b>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Statut du tour */}
        <p className="muted yz-status" style={{ fontWeight: finished ? 800 : 400 }}>
          {finished ? (
            iWon ? "🏆 " + t("yzWinYou")
              : winnerNames.length > 1 ? `🏆 ${winnerNames.join(" & ")} — ${t("yzWinTie")}`
                : `🏆 ${winnerNames[0]} ${t("yzWinOther")}`
          ) : isMyTurn ? (
            !hasRolled ? t("yzRollFirst")
              : allHeld ? t("yzAllHeld")
              : rollsLeft > 0 ? `${t("yzRollsLeft")} ${rollsLeft} — ${t("yzHoldHint")}`
                : t("yzMustScore")
          ) : isPlayer ? `${t("chromatikWaitingFor")} ${currentSeat?.username}…`
            : t("chromatikSpectating")}
        </p>

        {bonusFlash && <p className="yz-bonus-flash">✨ {t("yzExtraYahtzee")} +100 !</p>}

        {/* Fête Yahtzee — sortie du plateau (elle doit pouvoir se jouer aussi
            bien au-dessus de la grande zone de dés qu'au-dessus du plateau
            "standalone" des spectateurs, voir plus bas) : composant JSX
            local pour ne jamais dupliquer son balisage. */}
        {(() => {
          const celebrationFx = celebration && (
            <div
              key={celebration.key}
              className={"yz-celebrate " + (celebration.kind === "yahtzeeSix" ? "six" : "yahtzee")}
            >
              <div className="yz-celebrate-bg" />
              {confettiPieces.map(p => (
                <span
                  key={p.id}
                  className="yz-confetti-piece"
                  style={{
                    left: p.left + "%",
                    width: p.size, height: p.size * 1.4,
                    background: p.color,
                    animationDelay: p.delay + "s",
                    animationDuration: p.duration + "s",
                    "--rot0": p.rot + "deg",
                  }}
                />
              ))}
              <div className="yz-celebrate-text">
                {celebration.kind === "yahtzeeSix" ? t("yzCelebrateSix") : t("yzCelebrateYahtzee")}
              </div>
              {celebration.kind === "yahtzeeSix" && (
                <>
                  <div className="yz-celebrate-dog">🐶</div>
                  <div className="yz-celebrate-emojis">
                    <span>🎉</span><span>🥳</span><span>🎊</span><span>💃</span><span>🕺</span>
                  </div>
                </>
              )}
            </div>
          );

          const diceRow = (
            <div className="yz-dice" ref={trayElRef}>
              {/* Correctif (demande explicite) : plus de dés fantômes "?"
                  avant le premier lancer — la zone de lancer reste vide
                  plutôt que d'afficher 5 dés fantômes tous superposés au
                  centre (leur `style` valait `undefined` tant que `v` était
                  null, donc aucun des GHOST_ROW.tx n'était jamais appliqué :
                  visuellement, un seul "?" au lieu de cinq côte à côte). */}
              {(dice || []).map((v, i) => {
                const isHeldNow = isMyTurn
                  ? myHeld[i]
                  // Correctif (demande explicite, sélection visible en
                  // direct) : les AUTRES joueurs/spectateurs voient l'aperçu
                  // en direct de la sélection du joueur actif (livePreview,
                  // diffusé à chaque clic sur un dé — voir toggleHold), pas
                  // seulement le dernier `held` connu depuis le lancer
                  // précédent. Repli sur `held` tant qu'aucun aperçu n'a
                  // encore été reçu pour ce tour (ex. spectateur qui vient
                  // d'arriver).
                  : (livePreview && livePreview.seatId === currentSeat?.id ? livePreview.held[i] : held[i]);
                const showShuffle = shuffling && !isHeldNow;
                const displayValue = showShuffle ? shuffleFaces[i] : v;
                // canToggle : mêmes gardes qu'avant (mon tour, un lancer
                // déjà fait, un lancer restant, pas de mélange en cours) —
                // pilote maintenant SEULEMENT si un clic garde/libère le dé
                // (via handleDieClick) ; canDrag pilote SEULEMENT si on peut
                // le réajuster à la main (handleDiePointerDown) — les deux
                // gardes sont identiques ici (glisser réservé au joueur
                // actif) mais restent volontairement deux booléens séparés,
                // la garde du clic dépendant en plus de rollsLeft > 0
                // (garder n'a plus de sens sans relance restante) alors que
                // le glisser reste utile même à ce moment-là (dernier
                // lancer, dés encore mal lisibles).
                const canToggle = isMyTurn && hasRolled && rollsLeft > 0 && !shuffling;
                const canDrag = isMyTurn && hasRolled;
                return (
                  <Die
                    key={rollSeq + "-" + i}
                    value={displayValue}
                    held={hasRolled && isHeldNow}
                    shuffling={showShuffle}
                    rolling={!shuffling && hasRolled && !isHeldNow && lastAction?.type === "roll"}
                    onClick={() => handleDieClick(i, canToggle ? () => toggleHold(i) : undefined)}
                    onPointerDown={canDrag ? (e) => handleDiePointerDown(e, i) : undefined}
                    onPointerMove={canDrag ? (e) => handleDiePointerMove(e, i) : undefined}
                    onPointerUp={canDrag ? (e) => handleDiePointerUp(e, i) : undefined}
                    onPointerCancel={canDrag ? (e) => handleDiePointerCancel(e, i) : undefined}
                    clickable={canToggle}
                    draggable={canDrag}
                    dragging={draggingIndex === i}
                    title={canDrag ? t("yzDragHint") : undefined}
                    style={{
                      "--tx": (scatter[i]?.tx ?? 0) + "px",
                      "--ty": (scatter[i]?.ty ?? 0) + "px",
                      "--trot": (scatter[i]?.trot ?? 0) + "deg",
                    }}
                  />
                );
              })}
            </div>
          );

          // Bouton de lancer (2026-07, refonte complète demandée) : carré aux
          // coins arrondis, ancré en bas à droite de la moitié dés — l'action
          // PRINCIPALE de l'interface. Reste affiché même quand ce n'est pas
          // mon tour ou qu'il n'y a plus de lancer : il se GRISE au lieu de
          // disparaître (on garde un repère visuel constant), et ne redevient
          // vif que quand un coup est réellement possible. Pendant le
          // mélange, cliquer écourte l'animation (skipShuffle) — pour
          // n'IMPORTE qui regarde, pas seulement le joueur actif.
          const rollFab = isPlayer && !finished && (
            <button
              type="button"
              className={"yz-roll-fab" + (canRoll ? " active" : "") + (shuffling ? " shuffling" : "")}
              disabled={shuffling ? false : !canRoll}
              onClick={shuffling ? skipShuffle : attemptRoll}
              title={
                !isMyTurn ? `${t("chromatikWaitingFor")} ${currentSeat?.username || ""}…`
                  : allHeld ? t("yzAllHeld")
                  : shuffling ? t("yzShuffling")
                  : !hasRolled ? t("yzRoll") : t("yzReroll")
              }
            >
              <span className="yz-roll-fab-icon" aria-hidden="true">🎲</span>
              <span className="yz-roll-fab-label">
                {shuffling ? t("yzShuffling") : !hasRolled ? t("yzRoll") : t("yzReroll")}
              </span>
              {hasRolled && !shuffling && <span className="yz-roll-fab-count">{rollsLeft}</span>}
            </button>
          );

          // Zone de jeu (2026-07, refonte complète demandée) : moitié GAUCHE
          // = feuille de score (Upper + Lower empilées verticalement, toute
          // la hauteur) ; moitié DROITE = tout pour les dés (grande zone de
          // lancer/sélection en haut-centre, bouton Roll carré en bas à
          // droite). Les spectateurs (pas de feuille perso) gardent un
          // plateau de dés simple, centré, sans colonne de score ni bouton.
          return isPlayer && myCard ? (
            <div className="yz-arena">
              <div className="yz-arena-left">
                <div className="yz-col">
                  <div className="yz-col-title">{t("yzUpperSection")}</div>
                  {UPPER_IDS.map(renderScoreRow)}
                  <div className="yz-subtotal">
                    <span>{t("yzUpperBonus")} ({upper}/{UPPER_BONUS_THRESHOLD})</span>
                    <span>{hasUpperBonus(myCard) ? "+" + UPPER_BONUS_VALUE : "—"}</span>
                  </div>
                </div>
                <div className="yz-col">
                  <div className="yz-col-title">{t("yzLowerSection")}</div>
                  {LOWER_IDS.map(renderScoreRow)}
                  {myCard.bonus100 > 0 && (
                    <div className="yz-subtotal">
                      <span>{t("yzExtraYahtzee")} ×{myCard.bonus100}</span>
                      <span>+{myCard.bonus100 * 100}</span>
                    </div>
                  )}
                  <div className="yz-total">
                    <span>{t("yzTotal")}</span>
                    <span>{cardTotal(myCard)}</span>
                  </div>
                </div>
              </div>
              <div className="yz-arena-right">
                <div className="yz-tray big">
                  {diceRow}
                  {celebrationFx}
                </div>
                {rollFab}
              </div>
            </div>
          ) : (
            <div className="yz-tray standalone">
              {diceRow}
              {celebrationFx}
            </div>
          );
        })()}

        {/* Correctif 2026-07 (demande explicite "aussi simple que ça") : plus
            de barre de confirmation ici — cliquer une case du tableau score
            directement (voir renderScoreRow/scoreCategoryClick) au lieu de
            l'ancien clic-puis-confirme, qui affichait une barre fixe en bas
            d'écran ressentie comme un message parasite. */}

        {/* Fin de partie : classement complet PAR-DESSUS la table, jamais à sa place */}
        {finished && (
          <div className="yz-final">
            {/* Bannière victoire/défaite, propre au résultat de CE joueur.
                Overlay non-cliquable : disparaît d'elle-même après
                quelques secondes, le classement et les boutons restent
                utilisables pendant toute son affichage. */}
            {endBanner && (
              <div className={"yz-end-banner " + endBanner}>
                {endBanner === "win" && endConfettiPieces.map(p => (
                  <span
                    key={p.id}
                    className="yz-confetti-piece"
                    style={{
                      left: p.left + "%",
                      width: p.size, height: p.size * 1.4,
                      background: p.color,
                      animationDelay: p.delay + "s",
                      animationDuration: p.duration + "s",
                      "--rot0": p.rot + "deg",
                    }}
                  />
                ))}
                {endBanner === "win" ? (
                  <>
                    <div className="yz-end-banner-text win">🎉 {t("yzEndWinBanner")}</div>
                    <div className="yz-end-banner-claps">
                      <span>👏</span><span>👏</span><span>👏</span><span>👏</span><span>👏</span>
                    </div>
                  </>
                ) : (
                  <div className="yz-end-banner-text lose">😔 {t("yzEndLoseBanner")}</div>
                )}
              </div>
            )}
            <div className="yz-final-board">
              {seats
                .map(s => ({ seat: s, total: cards[s.id] ? cardTotal(cards[s.id]) : 0 }))
                .sort((a, b) => b.total - a.total)
                .map(({ seat, total }, idx) => (
                  <div key={seat.id} className={"yz-final-row" + (winners.includes(seat.id) ? " winner" : "")}>
                    <span>{idx + 1}.</span>
                    <span>{seat.avatar} {seat.username}</span>
                    <b>{total}</b>
                  </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
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
  } else {
    content = <p className="muted">{t("yzStarting")}</p>;
  }

  return (
    <div className="panel" style={{ maxWidth: "min(860px, 94vw)" }}>
      <h1>{t("yzTitle")}</h1>
      <Crossfade id={phase}>{content}</Crossfade>
    </div>
  );
}
