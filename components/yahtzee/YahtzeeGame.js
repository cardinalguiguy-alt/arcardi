"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState } from "@/lib/gameSync";
import Crossfade from "@/components/Crossfade";
import Die from "./Die";
import {
  UPPER_IDS, LOWER_IDS, UPPER_BONUS_THRESHOLD, UPPER_BONUS_VALUE,
  freshCard, scoreCategory, applyScore, upperSubtotal, hasUpperBonus,
  cardTotal, isCardComplete, filledCount,
} from "./scoring";

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

  const channelRef = useRef(null);
  const stateRef = useRef(null);
  const savedResultRef = useRef(false);
  const autoStartedRef = useRef(false);
  const restoredRef = useRef(false);
  const flashTimer = useRef(null);

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
    if (s.lastAction?.type === "roll") setRollSeq(n => n + 1);

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
    if (extra.resetGain) { setMyGain(0); savedResultRef.current = false; }
  }

  function persist(s) {
    if (!isHost) return;
    saveGameState(room.id, GAME_ID, { phase: "playing", ...s });
  }

  useEffect(() => {
    const ch = supabase.channel(GAME_ID + "_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "match_start" }, ({ payload }) => {
      applyLocalState(payload, { resetGain: true });
      setPhase("playing");
      persist(payload);
    });

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      applyLocalState(payload);
      persist(payload);
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
    await supabase.from("rooms").update({ status: "lobby", current_game: null, game_state: null }).eq("id", room.id);
    onFinish && onFinish();
  }

  // ----- Actions du joueur local --------------------------------------------
  const mySeat = seats.find(s => s.id === me.id);
  const isPlayer = !!mySeat;
  const currentSeat = seats[turnIdx];
  const isMyTurn = phase === "playing" && !finished && isPlayer && currentSeat?.id === me.id;
  const hasRolled = dice !== null;
  const canRoll = isMyTurn && rollsLeft > 0;
  const canScore = isMyTurn && hasRolled;
  const myCard = cards[me.id] || null;

  function toggleHold(i) {
    if (!isMyTurn || !hasRolled || rollsLeft === 0) return; // plus de relance = garder n'a plus de sens
    setMyHeld(prev => prev.map((h, idx) => (idx === i ? !h : h)));
  }
  function attemptRoll() {
    if (!canRoll) return;
    channelRef.current?.send({
      type: "broadcast", event: "move_attempt",
      payload: { seatId: me.id, action: { type: "roll", held: myHeld } },
    });
  }
  function attemptScore() {
    if (!canScore || !pendingCat || !myCard || myCard[pendingCat] !== null) return;
    channelRef.current?.send({
      type: "broadcast", event: "move_attempt",
      payload: { seatId: me.id, action: { type: "score", catId: pendingCat } },
    });
    setPendingCat(null);
  }

  // Sauvegarde du score de salon (chaque joueur enregistre le sien, RLS oblige).
  useEffect(() => {
    if (!finished || savedResultRef.current || !isPlayer) return;
    savedResultRef.current = true;
    const gain = winners.includes(me.id) ? 5 : 1;
    setMyGain(gain);
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

  let content;

  if (phase === "playing" && (myCard !== null || !isPlayer)) {
    const upper = myCard ? upperSubtotal(myCard) : 0;
    const winnerNames = winners.map(id => seats.find(s => s.id === id)?.username).filter(Boolean);
    const iWon = winners.includes(me.id);

    content = (
      <div>
        {/* Adversaires : total vivant + progression de feuille */}
        <div className="yz-opponents">
          {seats.filter(s => s.id !== me.id).map(s => (
            <div key={s.id} className={"yz-opponent" + (currentSeat?.id === s.id && !finished ? " active" : "")}>
              <span className="avatar">{s.avatar}</span>
              <span className="name">{s.username}</span>
              <span className="count">{cards[s.id] ? cardTotal(cards[s.id]) : 0} {t("pts")} · {cards[s.id] ? filledCount(cards[s.id]) : 0}/13</span>
            </div>
          ))}
        </div>

        {/* Statut du tour */}
        <p className="muted yz-status" style={{ fontWeight: finished ? 800 : 400 }}>
          {finished ? (
            iWon ? "🏆 " + t("yzWinYou")
              : winnerNames.length > 1 ? `🏆 ${winnerNames.join(" & ")} — ${t("yzWinTie")}`
                : `🏆 ${winnerNames[0]} ${t("yzWinOther")}`
          ) : isMyTurn ? (
            !hasRolled ? t("yzRollFirst")
              : rollsLeft > 0 ? `${t("yzRollsLeft")} ${rollsLeft} — ${t("yzHoldHint")}`
                : t("yzMustScore")
          ) : isPlayer ? `${t("chromatikWaitingFor")} ${currentSeat?.username}…`
            : t("chromatikSpectating")}
        </p>

        {bonusFlash && <p className="yz-bonus-flash">✨ {t("yzExtraYahtzee")} +100 !</p>}

        {/* Les dés — posés sur un plateau bois cohérent avec la porte d'entrée */}
        <div className="yz-tray">
          <div className="yz-dice">
            {(dice || [null, null, null, null, null]).map((v, i) => (
              <Die
                key={rollSeq + "-" + i}
                value={v ?? 1}
                ghost={v === null}
                held={hasRolled && (isMyTurn ? myHeld[i] : held[i])}
                rolling={hasRolled && !(isMyTurn ? myHeld[i] : held[i]) && lastAction?.type === "roll"}
                onClick={isMyTurn && hasRolled && rollsLeft > 0 ? () => toggleHold(i) : undefined}
                disabled={!isMyTurn || !hasRolled || rollsLeft === 0}
                style={v === null ? undefined : {
                  "--tx": (scatter[i]?.tx ?? 0) + "px",
                  "--ty": (scatter[i]?.ty ?? 0) + "px",
                  "--trot": (scatter[i]?.trot ?? 0) + "deg",
                }}
              />
            ))}
          </div>
        </div>

        {/* Bouton de lancer */}
        {isMyTurn && !finished && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <button className="btn yz-roll-btn" disabled={!canRoll} onClick={attemptRoll}>
              🎲 {!hasRolled ? t("yzRoll") : t("yzReroll")} {hasRolled ? `(${rollsLeft})` : ""}
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

        {/* Validation en deux temps — jamais de score inscrit par mégarde */}
        {canScore && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
            <button className="btn" style={{ width: "auto", padding: "12px 26px", marginTop: 0 }}
              disabled={!pendingCat} onClick={attemptScore}>
              {pendingCat ? `✔️ ${t("yzConfirm")} « ${t(CAT_LABEL_KEY[pendingCat])} » (+${scoreCategory(pendingCat, dice)})` : t("yzPickCategory")}
            </button>
          </div>
        )}

        {/* Fin de partie : classement complet PAR-DESSUS la table, jamais à sa place */}
        {finished && (
          <div className="yz-final">
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
