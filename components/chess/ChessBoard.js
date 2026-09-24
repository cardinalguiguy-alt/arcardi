"use client";
/* ==========================================================================
   ÉCHIQUIER INTERACTIF — audit échecs 2026-09-24 (lots 1 à 3).

   ⚠️⚠️ LE BUG DE SÉLECTION AU CLIC, ET POURQUOI CE COMPOSANT EST AU NIVEAU DU
   MODULE. L'ancien plateau (`BoardGrid`) était une fonction déclarée DANS le
   rendu de ChessGame : à chaque rendu, React y voyait un NOUVEAU type de
   composant et détruisait puis recréait les 64 cases. Or la pendule relançait
   un rendu chaque seconde. Un clic n'existe que si l'appui et le relâchement
   tombent sur le MÊME élément : quand la case était recréée entre les deux,
   le clic disparaissait. Mesuré pendant l'audit : les cases remplacées à
   chaque seconde, et 8 appuis de 120 ms perdus sur 60 (13 %) — donc un coup
   clic-clic sur quatre à recommencer. Trois parades, toutes en place :
   1. le composant vit au niveau du module (type stable, jamais remonté) ;
   2. la pendule se rafraîchit dans son propre composant, le plateau ne se
      re-rend plus à chaque seconde ;
   3. on n'attend plus l'événement `click` : sélection et coup partent au
      `pointerdown`, comme sur lichess (chessground) — un appui ne peut plus
      être « perdu » entre deux moitiés.

   CE QUE FAIT LE PLATEAU, À LA LICHESS :
   - clic-clic OU glisser-déposer (souris, doigt, stylet : Pointer Events) ;
   - pré-coups quand ce n'est pas notre tour (géométrie seule, rules.js) ;
   - animation des coups (glissement, roque compris, prise qui s'efface) —
     retrouvée par DIFFÉRENCE de positions, donc elle marche aussi pour une
     reprise de coup et pour la navigation dans l'historique ;
   - promotion en colonne sur la case d'arrivée ;
   - flèches et cercles au clic droit (Maj = rouge, Alt = bleu, les deux =
     jaune), effacés au prochain clic gauche ; locaux, jamais diffusés.

   Il ne connaît AUCUNE règle : le parent lui passe les cases légales
   (`getDests`) et reçoit les coups (`onMove`). La promotion se détecte ici
   parce qu'il faut demander la pièce avant d'envoyer le coup.
   ========================================================================== */
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { pieceBg } from "./pieces";
import { premoveDests } from "./rules";

const FILES = "abcdefgh";
const ANIM_MS = 190;
const BRUSH = { green: "#15781B", red: "#882020", blue: "#003088", yellow: "#e68f00" };

// Case -> position AFFICHÉE (x, y) de 0 à 7, (0,0) en haut à gauche.
function sqXY(sq, orient) {
  const f = FILES.indexOf(sq[0]), r = Number(sq[1]) - 1;
  return orient === "b" ? [7 - f, r] : [f, 7 - r];
}
function xyToSq(x, y, orient) {
  const f = orient === "b" ? 7 - x : x;
  const r = orient === "b" ? y : 7 - y;
  return FILES[f] + (r + 1);
}
// FEN -> { "e4": "wP", ... } sans instancier chess.js à chaque rendu.
function parsePieces(fen) {
  const map = {};
  const rows = String(fen || "").split(" ")[0].split("/");
  for (let i = 0; i < 8 && i < rows.length; i++) {
    let f = 0;
    for (const ch of rows[i]) {
      if (ch >= "1" && ch <= "8") { f += Number(ch); continue; }
      const up = ch.toUpperCase();
      map[FILES[f] + (8 - i)] = (ch === up ? "w" : "b") + up;
      f++;
    }
  }
  return map;
}
const tr = (x, y) => "translate(" + x * 100 + "%," + y * 100 + "%)";
const reducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
};

function ChessBoard({
  fen,
  orientation = "w",
  lastMove = null,
  check = null,
  movableColor = null,   // "w" | "b" | "both" | null : qui joue des coups LÉGAUX maintenant
  premoveColor = null,   // "w" | "b" | null : qui peut PRÉ-jouer maintenant
  premove = null,        // { from, to } | null
  getDests,              // (square) => string[] cases légales
  onMove,                // (from, to, promotion|undefined, { dragged }) => void
  onPremove,             // ({ from, to } | null) => void
  viewOnly = false,
  coordinates = true,
}) {
  const pieces = useMemo(() => parsePieces(fen), [fen]);
  const [selected, setSelected] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);   // case d'origine d'un glisser en cours
  const [dragTouch, setDragTouch] = useState(false);
  const [overSq, setOverSq] = useState(null);       // case sous le pointeur (glisser ou survol)
  const [promo, setPromo] = useState(null);         // { from, to, color, dragged }
  const [shapes, setShapes] = useState([]);         // [{ from, to, brush }] (to === from : cercle)
  const [drawing, setDrawing] = useState(null);     // { from, cur, brush }
  const boardRef = useRef(null);
  const ghostRef = useRef(null);
  const fxRef = useRef(null);
  const dragRef = useRef(null);
  // Le geste en cours se suit dans des REFS (glisser, tracé) ; l'état React
  // ne sert qu'à dessiner. Un état lu d'un événement au suivant peut être en
  // retard d'un rendu quand les événements s'enchaînent vite.
  const drawRef = useRef(null);
  const skipAnimRef = useRef(null);
  const prevPiecesRef = useRef(null);

  // Mode d'une case : "move" (coup légal maintenant), "premove", ou false.
  function modeOf(sq) {
    const code = sq && pieces[sq];
    if (!code || viewOnly) return false;
    const c = code[0];
    if (movableColor === "both" || movableColor === c) return "move";
    if (premoveColor === c) return "premove";
    return false;
  }
  function destsOf(sq) {
    const mode = modeOf(sq);
    if (mode === "move") return (getDests && getDests(sq)) || [];
    if (mode === "premove") { const code = pieces[sq]; return premoveDests(sq, code[0], code[1].toLowerCase()); }
    return [];
  }

  const selMode = modeOf(selected);
  const selDests = useMemo(
    () => (selected ? destsOf(selected) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, pieces, movableColor, premoveColor, getDests, viewOnly],
  );

  // Une sélection qui ne vaut plus rien (pièce prise, plus notre tour ni
  // pré-coup possible, plateau en lecture seule) s'efface d'elle-même.
  useEffect(() => {
    if (selected && !modeOf(selected)) setSelected(null);
    if (viewOnly && promo) setPromo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, movableColor, premoveColor, viewOnly]);

  // Échap : tout lâcher (sélection, promotion, pré-coup).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setSelected(null); setPromo(null);
      if (premove && onPremove) onPremove(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [premove, onPremove]);

  // ---- Animation des coups, par différence de positions ------------------
  // Chaque pièce apparue est appariée à la pièce disparue la plus proche du
  // MÊME code (couleur + type) : c'est ce qui fait glisser la tour d'un roque,
  // et reculer les pièces d'une reprise de coup. Au-delà de 4 pièces changées
  // (nouvelle partie, réinitialisation), on pose sans animer.
  useLayoutEffect(() => {
    const prev = prevPiecesRef.current;
    prevPiecesRef.current = pieces;
    const skip = skipAnimRef.current;
    skipAnimRef.current = null;
    const board = boardRef.current;
    if (!prev || !board || reducedMotion()) return;
    const appeared = Object.keys(pieces).filter((sq) => prev[sq] !== pieces[sq]);
    const vanished = Object.keys(prev).filter((sq) => prev[sq] !== pieces[sq]);
    if (!appeared.length || appeared.length > 4) return;
    const used = new Set();
    for (const to of appeared) {
      let best = null, bd = 99;
      for (const from of vanished) {
        if (used.has(from) || prev[from] !== pieces[to]) continue;
        const [x1, y1] = sqXY(from, orientation), [x2, y2] = sqXY(to, orientation);
        const d = Math.hypot(x1 - x2, y1 - y2);
        if (d < bd) { bd = d; best = from; }
      }
      if (!best) continue;
      used.add(best);
      // Une pièce déposée à la main est déjà sous le doigt : la refaire
      // glisser depuis sa case d'origine ferait un aller-retour visible.
      if (skip && skip.from === best && skip.to === to) continue;
      const el = board.querySelector('.cb-piece[data-p="' + to + '"]');
      if (!el || !el.animate) continue;
      const [fx, fy] = sqXY(best, orientation), [tx, ty] = sqXY(to, orientation);
      el.animate([{ transform: tr(fx, fy) }, { transform: tr(tx, ty) }], { duration: ANIM_MS, easing: "cubic-bezier(.25,.8,.3,1)" });
    }
    // Pièce prise : elle s'efface sous la pièce qui arrive, au lieu de
    // disparaître avant que l'autre ait bougé. Nœud posé HORS de React, dans
    // un calque que React ne remplit jamais (fxRef), puis retiré.
    const fx = fxRef.current;
    if (!fx) return;
    for (const sq of vanished) {
      if (used.has(sq) || !prev[sq]) continue;
      const el = document.createElement("div");
      el.className = "cb-piece cb-fading";
      const [x, y] = sqXY(sq, orientation);
      el.style.transform = tr(x, y);
      el.style.backgroundImage = pieceBg(prev[sq][0], prev[sq][1]);
      fx.appendChild(el);
      const done = () => { if (el.parentNode) el.parentNode.removeChild(el); };
      if (el.animate) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ANIM_MS, easing: "ease-in" }).onfinish = done;
      else done();
    }
  }, [pieces, orientation]);

  // ---- Pointeur ------------------------------------------------------------
  // La case visée est lue par test de collision (elementFromPoint) sur les
  // cases statiques, et non recalculée depuis des coordonnées : la scène du
  // salon peut être réduite par `zoom` CSS (mode agrandi), et un calcul
  // maison se tromperait de repère ; le navigateur, lui, jamais.
  function squareAt(clientX, clientY) {
    const el = typeof document !== "undefined" ? document.elementFromPoint(clientX, clientY) : null;
    const cell = el && el.closest ? el.closest("[data-sq]") : null;
    return cell && boardRef.current && boardRef.current.contains(cell) ? cell.getAttribute("data-sq") : null;
  }
  // Le fantôme se place en POURCENTAGE du plateau (même raison : zoom).
  function placeGhost(clientX, clientY) {
    const g = ghostRef.current, b = boardRef.current;
    if (!g || !b) return;
    const r = b.getBoundingClientRect();
    if (!r.width || !r.height) return;
    g.style.left = ((clientX - r.left) / r.width) * 100 + "%";
    g.style.top = ((clientY - r.top) / r.height) * 100 + "%";
  }

  function play(from, to, dragged) {
    const mode = modeOf(from);
    const code = pieces[from];
    setSelected(null);
    if (mode === "premove") { onPremove && onPremove({ from, to }); return; }
    if (mode !== "move" || !code) return;
    const isPromo = code[1] === "P" && ((code[0] === "w" && to[1] === "8") || (code[0] === "b" && to[1] === "1"));
    if (isPromo) { setPromo({ from, to, color: code[0], dragged }); return; }
    if (dragged) skipAnimRef.current = { from, to };
    onMove && onMove(from, to, undefined, { dragged });
  }
  function choosePromo(type) {
    const p = promo;
    setPromo(null);
    if (!p) return;
    onMove && onMove(p.from, p.to, type, { dragged: p.dragged });
  }

  function onPointerDown(e) {
    if (promo) return;
    const board = boardRef.current;
    if (e.button === 2) {
      const sq = squareAt(e.clientX, e.clientY);
      if (!sq) return;
      e.preventDefault();
      const brush = e.shiftKey && e.altKey ? "yellow" : e.shiftKey ? "red" : e.altKey ? "blue" : "green";
      drawRef.current = { from: sq, cur: sq, brush };
      setDrawing(drawRef.current);
      try { board.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      return;
    }
    if (e.button !== 0) return;
    if (shapes.length) setShapes([]);
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq || viewOnly) return;
    // Second appui sur une destination : le coup part tout de suite.
    if (selected && sq !== selected && selDests.includes(sq)) {
      e.preventDefault();
      play(selected, sq, false);
      return;
    }
    if (modeOf(sq)) {
      e.preventDefault();
      dragRef.current = {
        from: sq, x0: e.clientX, y0: e.clientY, started: false,
        wasSelected: selected === sq, pointerId: e.pointerId, touch: e.pointerType !== "mouse",
      };
      setSelected(sq);
      try { board.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
      return;
    }
    setSelected(null);
    if (premove && onPremove) onPremove(null); // appuyer à côté annule le pré-coup, comme lichess
  }

  function onPointerMove(e) {
    const dr = drawRef.current;
    if (dr) {
      const sq = squareAt(e.clientX, e.clientY);
      if (sq && sq !== dr.cur) { drawRef.current = { ...dr, cur: sq }; setDrawing(drawRef.current); }
      return;
    }
    const d = dragRef.current;
    if (!d) {
      // Survol souris d'une destination (le calque des destinations ne
      // reçoit aucun événement, il faut donc le suivre ici).
      if (selected && e.pointerType === "mouse") {
        const sq = squareAt(e.clientX, e.clientY);
        const next = sq && selDests.includes(sq) ? sq : null;
        if (next !== overSq) setOverSq(next);
      }
      return;
    }
    if (!d.started) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < (d.touch ? 7 : 4)) return;
      d.started = true;
      setDragFrom(d.from);
      setDragTouch(d.touch);
    }
    placeGhost(e.clientX, e.clientY);
    const sq = squareAt(e.clientX, e.clientY);
    if (sq !== overSq) setOverSq(sq);
  }

  function endDrag() {
    dragRef.current = null;
    setDragFrom(null);
    setOverSq(null);
  }

  function onPointerUp(e) {
    const board = boardRef.current;
    const dr = drawRef.current;
    if (dr) {
      const { from, cur, brush } = dr;
      drawRef.current = null;
      setDrawing(null);
      try { board.releasePointerCapture(e.pointerId); } catch (err) { /* rien */ }
      setShapes((list) => {
        const i = list.findIndex((s) => s.from === from && s.to === cur);
        if (i >= 0 && list[i].brush === brush) return list.filter((_, k) => k !== i);
        const rest = list.filter((s) => !(s.from === from && s.to === cur));
        return [...rest, { from, to: cur, brush }];
      });
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    try { board.releasePointerCapture(d.pointerId); } catch (err) { /* rien */ }
    if (d.started) {
      const sq = squareAt(e.clientX, e.clientY);
      endDrag();
      // Destinations RELUES maintenant : la position a pu changer pendant le
      // glisser (coup adverse arrivé au milieu d'un pré-coup).
      if (sq && sq !== d.from && pieces[d.from] && destsOf(d.from).includes(sq)) { play(d.from, sq, true); return; }
      if (sq !== d.from) setSelected(null);
      return;
    }
    dragRef.current = null;
    if (d.wasSelected) setSelected(null); // re-cliquer une pièce sélectionnée la lâche
  }

  function onPointerCancel() {
    drawRef.current = null;
    setDrawing(null);
    endDrag();
  }

  // ---- Rendu -----------------------------------------------------------------
  const squares = useMemo(() => {
    const out = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sq = xyToSq(x, y, orientation);
      out.push({ sq, light: (x + y) % 2 === 0 });
    }
    return out;
  }, [orientation]);

  const hl = [];
  const hlAt = (sq, cls) => { if (sq) hl.push({ sq, cls }); };
  if (lastMove) { hlAt(lastMove.from, "last"); hlAt(lastMove.to, "last"); }
  if (premove) { hlAt(premove.from, "premove"); hlAt(premove.to, "premove"); }
  if (selected) hlAt(selected, selMode === "premove" ? "sel pre" : "sel");
  if (check) hlAt(check, "check");
  if (dragFrom && overSq) hlAt(overSq, dragTouch ? "over touch" : "over");

  const dests = selected ? selDests : [];
  const selectable = (sq) => !!modeOf(sq) || dests.includes(sq);

  const shapeList = drawing && drawing.cur ? [...shapes, { from: drawing.from, to: drawing.cur, brush: drawing.brush, live: true }] : shapes;

  return (
    <div
      className={"cb-board" + (dragFrom ? " dragging" : "")}
      ref={boardRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="cb-squares">
        {squares.map(({ sq, light }) => (
          <div key={sq} data-sq={sq} className={"cb-sq " + (light ? "l" : "d") + (selectable(sq) ? " can" : "")} />
        ))}
      </div>

      {hl.map(({ sq, cls }) => {
        const [x, y] = sqXY(sq, orientation);
        return <div key={cls + sq} className={"cb-hl " + cls} style={{ transform: tr(x, y) }} />;
      })}

      {dests.map((sq) => {
        const [x, y] = sqXY(sq, orientation);
        const cls = "cb-dest" + (pieces[sq] ? " occ" : "") + (selMode === "premove" ? " pre" : "") + (overSq === sq ? " hover" : "");
        return <div key={"d" + sq} className={cls} style={{ transform: tr(x, y) }} />;
      })}

      {coordinates && (
        <>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((y) => (
            <span key={"r" + y} className={"cb-coord rank " + (y % 2 === 0 ? "on-l" : "on-d")} style={{ top: y * 12.5 + "%" }}>
              {orientation === "b" ? y + 1 : 8 - y}
            </span>
          ))}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((x) => (
            <span key={"f" + x} className={"cb-coord file " + ((x + 7) % 2 === 0 ? "on-l" : "on-d")} style={{ left: (x + 1) * 12.5 + "%" }}>
              {orientation === "b" ? FILES[7 - x] : FILES[x]}
            </span>
          ))}
        </>
      )}

      <div className="cb-fx" ref={fxRef} />

      {Object.keys(pieces).map((sq) => {
        const code = pieces[sq];
        const [x, y] = sqXY(sq, orientation);
        return (
          // `data-p` et surtout PAS `data-sq` : seules les cases statiques
          // portent `data-sq`, c'est ce que lit le test de collision.
          <div
            key={sq}
            data-p={sq}
            className={"cb-piece" + (dragFrom === sq ? " origin" : "")}
            style={{ transform: tr(x, y), backgroundImage: pieceBg(code[0], code[1]) }}
          />
        );
      })}

      {shapeList.length > 0 && (
        <svg className="cb-shapes" viewBox="0 0 8 8" aria-hidden="true">
          {shapeList.map((s, i) => {
            const [x1, y1] = sqXY(s.from, orientation), [x2, y2] = sqXY(s.to, orientation);
            const col = BRUSH[s.brush] || BRUSH.green;
            const op = s.live ? 0.55 : 0.8;
            if (s.from === s.to) {
              return <circle key={i} cx={x1 + 0.5} cy={y1 + 0.5} r={0.45} fill="none" stroke={col} strokeWidth={0.075} opacity={op} />;
            }
            // Flèche : fût arrêté à la base de la tête, tête pleine à la pointe.
            const ax = x1 + 0.5, ay = y1 + 0.5, bx = x2 + 0.5, by = y2 + 0.5;
            const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
            const head = 0.36, half = 0.2, w = 0.16;
            const tipX = bx - ux * 0.08, tipY = by - uy * 0.08;
            const baseX = tipX - ux * head, baseY = tipY - uy * head;
            const pts = [
              [tipX, tipY],
              [baseX - uy * half, baseY + ux * half],
              [baseX + uy * half, baseY - ux * half],
            ].map((p) => p.join(",")).join(" ");
            return (
              <g key={i} opacity={op}>
                <line x1={ax} y1={ay} x2={baseX} y2={baseY} stroke={col} strokeWidth={w} strokeLinecap="round" />
                <polygon points={pts} fill={col} />
              </g>
            );
          })}
        </svg>
      )}

      <div
        ref={ghostRef}
        className={"cb-ghost" + (dragFrom ? " on" : "") + (dragTouch ? " touch" : "")}
        style={{ backgroundImage: dragFrom && pieces[dragFrom] ? pieceBg(pieces[dragFrom][0], pieces[dragFrom][1]) : "none" }}
      />

      {promo && (
        <div
          className="cb-promo-veil"
          onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) setPromo(null); }}
        >
          {["q", "n", "r", "b"].map((t, i) => {
            const [x, y0] = sqXY(promo.to, orientation);
            const y = y0 === 0 ? i : 7 - i;
            return (
              <button
                key={t}
                type="button"
                className="cb-promo-btn"
                style={{ left: x * 12.5 + "%", top: y * 12.5 + "%" }}
                onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); choosePromo(t); }}
              >
                <span style={{ backgroundImage: pieceBg(promo.color, t) }} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default memo(ChessBoard);
