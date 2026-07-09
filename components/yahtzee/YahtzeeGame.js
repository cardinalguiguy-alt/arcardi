"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState, resetRoomToLobby } from "@/lib/gameSync";
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
// lancé qui retombe légèrement de travers plutôt que parfaitement aligné.
// Purement cosmétique et 100% local à CHAQUE client (chacun voit une
// dispersion différente, comme deux personnes regardant le même dé sous un
// angle différent) — n'a aucune incidence sur la valeur réelle du dé, qui
// elle vient toujours de l'hôte.
function randScatter() {
  return {
    tx: Math.round((Math.random() - 0.5) * 22),   // ±11px
    ty: Math.round((Math.random() - 0.35) * 18),  // légère tendance à "tomber" vers le bas
    trot: Math.round((Math.random() - 0.5) * 30), // ±15°
  };
}
const NO_SCATTER = { tx: 0, ty: 0, trot: 0 };

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

  // Locaux au joueur (jamais diffusés tels quels) :
  const [myHeld, setMyHeld] = useState(NO_HELD.slice()); // dés gardés, envoyé au moment du lancer
  const [pendingCat, setPendingCat] = useState(null);     // catégorie sélectionnée avant validation
  const [rollSeq, setRollSeq] = useState(0);              // incrément à chaque lancer -> relance l'animation CSS
  const [scatter, setScatter] = useState([0, 1, 2, 3, 4].map(() => NO_SCATTER));
  const [myGain, setMyGain] = useState(0);
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
    setSeats(s.seats); setCards(s.cards); setTurnIdx(s.turnIdx);
    setDice(s.dice); setHeld(s.held || NO_HELD.slice());
    setRollsLeft(s.rollsLeft); setFinished(!!s.finished);
    setWinners(s.winners || []); setLastAction(s.lastAction || null);
    // Sync des dés gardés locaux : après MON lancer, l'état qui revient est
    // la vérité (utile aussi après un rechargement en plein tour).
    setMyHeld(s.held || NO_HELD.slice());
    if (s.dice === null) setPendingCat(null); // nouveau tour = plus rien de sélectionné
    // deferReveal : la reprise/animation de tumble sera déclenchée plus tard
    // par finishShuffle(), une fois le mélange sonore/visuel joué.
    if (s.lastAction?.type === "roll" && !extra.deferReveal) setRollSeq(n => n + 1);

    // Dispersion réaliste sur la table : on se base sur les drapeaux "gardé"
    // (held) de l'action de lancer elle-même — pas sur une comparaison des
    // valeurs, qui se tromperait dans le cas rare où un dé relancé retombe
    // par coïncidence sur la même face qu'avant. Seuls les dés RÉELLEMENT
    // relancés (held=false au moment du lancer) reçoivent une nouvelle
    // position/rotation ; les dés gardés restent exactement où ils étaient.
    if (s.dice) {
      const isRollAction = s.lastAction?.type === "roll";
      setScatter(old => s.dice.map((_, i) => {
        if (!isRollAction) return old[i] || NO_SCATTER;
        const wasHeld = s.held ? s.held[i] === true : false;
        return wasHeld ? (old[i] || NO_SCATTER) : randScatter();
      }));
    } else {
      setScatter([0, 1, 2, 3, 4].map(() => NO_SCATTER));
    }

    if (s.lastAction?.type === "score" && s.lastAction.extraYahtzee && s.lastAction.seatId === me.id) {
      setBonusFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setBonusFlash(false), 3200);
    }
    if (extra.resetGain) {
      setMyGain(0); savedResultRef.current = false;
      clearTimeout(endBannerTimerRef.current);
      setEndBanner(null);
    }
  }

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
    setMyHeld(prev => prev.map((h, idx) => (idx === i ? !h : h)));
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
  function attemptScore() {
    if (!canScore || !pendingCat || !myCard || myCard[pendingCat] !== null) return;
    playConfirmChime();
    channelRef.current?.send({
      type: "broadcast", event: "move_attempt",
      payload: { seatId: me.id, action: { type: "score", catId: pendingCat } },
    });
    setPendingCat(null);
  }

  // Sauvegarde du score de salon (chaque joueur enregistre le sien, RLS oblige).
  // Même déclencheur pour la bannière + le son de fin (victoire/défaite) :
  // une seule fois par manche, propre au résultat de CE joueur.
  useEffect(() => {
    if (!finished || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const won = winners.includes(me.id);
    const gain = won ? 5 : 1;
    setMyGain(gain);
    setEndBanner(won ? "win" : "lose");
    if (won) playGameWin(); else playGameLose();
    clearTimeout(endBannerTimerRef.current);
    endBannerTimerRef.current = setTimeout(() => setEndBanner(null), won ? 4000 : 3400);
    (async () => {
      try {
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: GAME_ID, points: gain });
        await supabase.rpc("add_points", { p_room: room.id, p_delta: gain });
      } catch (e) {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // ----- Rendu ---------------------------------------------------------------

  function renderScoreRow(catId) {
    const filled = myCard ? myCard[catId] : null;
    const isFree = myCard && filled === null;
    const potential = canScore && isFree ? scoreCategory(catId, dice) : null;
    const selectable = canScore && isFree;
    const selected = pendingCat === catId;
    return (
      <button
        type="button"
        key={catId}
        className={"yz-row" + (selected ? " selected" : "") + (selectable ? " selectable" : "") + (filled !== null ? " done" : "")}
        onClick={() => { if (selectable) setPendingCat(selected ? null : catId); }}
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
      <div style={{ paddingBottom: canScore ? 170 : 0 }}>
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

        {/* Les dés — posés sur un plateau bois cohérent avec la porte d'entrée */}
        <div className="yz-tray">
          <div className="yz-dice">
            {(dice || [null, null, null, null, null]).map((v, i) => {
              const isHeldNow = isMyTurn ? myHeld[i] : held[i];
              const showShuffle = shuffling && !isHeldNow;
              const displayValue = showShuffle ? shuffleFaces[i] : v;
              return (
                <Die
                  key={rollSeq + "-" + i}
                  value={displayValue ?? 1}
                  ghost={displayValue === null}
                  held={hasRolled && isHeldNow}
                  shuffling={showShuffle}
                  rolling={!shuffling && hasRolled && !isHeldNow && lastAction?.type === "roll"}
                  onClick={isMyTurn && hasRolled && rollsLeft > 0 && !shuffling ? () => toggleHold(i) : undefined}
                  disabled={!isMyTurn || !hasRolled || rollsLeft === 0 || shuffling}
                  style={v === null ? undefined : {
                    "--tx": (scatter[i]?.tx ?? 0) + "px",
                    "--ty": (scatter[i]?.ty ?? 0) + "px",
                    "--trot": (scatter[i]?.trot ?? 0) + "deg",
                  }}
                />
              );
            })}
          </div>

          {/* Fête Yahtzee — contenue dans le plateau, ne bouscule aucune mise
              en page. Le "yahtzeeSix" (5 six) hérite du même habillage en
              plus fourni (texte YAHTZEE, chien, emojis dansants, ~10s). */}
          {celebration && (
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
          )}
        </div>

        {/* Bouton de lancer */}
        {isMyTurn && !finished && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <button
              className="btn yz-roll-btn"
              disabled={shuffling ? false : !canRoll}
              onClick={shuffling ? skipShuffle : attemptRoll}
              title={allHeld ? t("yzAllHeld") : undefined}
            >
              {shuffling ? `🎲 ${t("yzShuffling")}` : `🎲 ${!hasRolled ? t("yzRoll") : t("yzReroll")} ${hasRolled ? `(${rollsLeft})` : ""}`}
            </button>
          </div>
        )}

        {/* Ma feuille de score */}
        {isPlayer && myCard && (
          <div className="yz-sheet">
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
        )}

        {/* Validation en deux temps — jamais de score inscrit par mégarde.
            Barre FIXE en bas de l'écran (comme les autres pastilles du
            site) : sur la feuille de score complète, ce bouton pouvait se
            retrouver hors écran et obliger à scroller à chaque tour pour
            l'atteindre. Toujours accessible désormais, quel que soit le
            scroll. */}
        {canScore && (
          <div className="yz-score-bar">
            <button className="btn" disabled={!pendingCat} onClick={attemptScore}>
              {pendingCat ? `✔️ ${t("yzConfirm")} « ${t(CAT_LABEL_KEY[pendingCat])} » (+${scoreCategory(pendingCat, dice)})` : t("yzPickCategory")}
            </button>
          </div>
        )}

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
            {isPlayer && (
              <p style={{ fontWeight: 800, textAlign: "center", marginTop: 10 }}>
                {t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{myGain} {t("pts")}</span>
              </p>
            )}
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
