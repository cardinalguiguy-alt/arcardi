/* =============================================================================
   verify-echecs.mjs — LES ÉCHECS TIENNENT-ILS CE QUE L'AUDIT DU 2026-09-24 A
   CORRIGÉ ?
   -----------------------------------------------------------------------------
   L'audit a trouvé des défauts qu'aucun banc ne pouvait voir, parce que tout
   vivait dans ChessGame.js (du JSX, donc hors de portée d'un banc). Les
   décisions sont désormais dans des modules purs, et ce banc les JOUE :

   - rules.js  : statuts et raisons de nulle, drapeau contre un roi seul,
                 avantage matériel lu sur le plateau (promotions comprises),
                 reprise de coup (le bug de l'ordinateur figé, reproduit en jeu),
                 pré-coups, rejeu d'une partie (triple répétition gardée), PGN ;
   - clock.js  : la pendule horodatée — précision au coup près, incrément,
                 compensation de latence BORNÉE, décompte, affichage ;
   - engine.js : l'ordinateur ne retient plus JAMAIS un coup dont la recherche
                 a été coupée par l'horloge (prouvé sur une horloge simulée, et
                 falsifié sur l'ancienne logique recopiée ici) ;
   - pieces.js : douze SVG propres, crédit BSD présent dans les règles ;
   - lib/i18n.js : clés « chess* » identiques en FR et EN, aucune clé lue par
                 le jeu qui manquerait, aucune clé morte.

   Ce qu'il NE voit PAS : le plateau (clics, glisser, animations) et le réseau
   à deux clients. Ceux-là se jugent dans le navigateur (CLAUDE.md §10).

   Usage : node tools/verify-echecs.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHESS_ESM = pathToFileURL(path.join(ROOT, "node_modules", "chess.js", "dist", "esm", "chess.js")).href;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "echecs-"));
// Les modules du jeu sont en .js dans un projet sans "type":"module" : on les
// recopie en .mjs, imports relatifs et paquet chess.js réécrits.
for (const name of ["rules", "clock", "engine", "notation", "pieces"]) {
  let src = fs.readFileSync(path.join(ROOT, "components", "chess", name + ".js"), "utf8");
  src = src.replace(/from "chess\.js"/g, `from "${CHESS_ESM}"`).replace(/from "\.\/(\w+)"/g, 'from "./$1.mjs"');
  fs.writeFileSync(path.join(tmp, name + ".mjs"), src);
}
const load = (n) => import(pathToFileURL(path.join(tmp, n + ".mjs")).href);
const R = await load("rules");
const C = await load("clock");
const E = await load("engine");
const P = await load("pieces");
const { Chess } = await import(CHESS_ESM);

let fails = 0, total = 0;
const ok = (name, condition, detail = "") => {
  total++;
  console.log(`${condition ? "  OK  " : "ÉCHEC "} ${name}${detail ? " — " + detail : ""}`);
  if (!condition) fails++;
};
const section = (name) => console.log(`\n=== ${name} ===\n`);
const play = (sans, fen) => { const g = new Chess(fen); for (const s of sans) g.move(s); return g; };

// -----------------------------------------------------------------------------
section("statuts et raisons de fin");
{
  const mate = play(["f3", "e5", "g4", "Qh4#"]);
  const s = R.deriveStatus(mate, "b");
  ok("mat du berger inversé : mat, Noirs vainqueurs", s.status === "checkmate" && s.winner === "b" && s.reason === "checkmate");
  const pat = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  ok("pat : nulle sans vainqueur", R.deriveStatus(pat, "w").status === "stalemate");
  const kk = new Chess("8/8/4k3/8/8/4K3/8/8 w - - 0 1");
  ok("roi contre roi : nulle, raison « matériel »", R.deriveStatus(kk, "b").reason === "material");
  const rep = play(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"]);
  ok("triple répétition : raison « répétition »", R.deriveStatus(rep, "b").reason === "repetition");
  const fifty = play(["Kd2"], "4k3/8/8/8/8/8/8/R3K3 w - - 99 80");
  ok("règle des 50 coups : raison « fifty »", R.deriveStatus(fifty, "w").reason === "fifty", R.deriveStatus(fifty, "w").reason);
  const chk = play(["e4", "f5", "Qh5+"]);
  ok("échec simple : statut « check », case du roi e8", R.deriveStatus(chk, "w").status === "check" && R.checkSquare(chk) === "e8");
  ok("pas d'échec : aucune case", R.checkSquare(new Chess()) === null);
  ok("« aborted » est une fin de partie", R.isTerminal("aborted") && !R.isTerminal("check"));
}

section("drapeau tombé");
{
  const loneKing = new Chess("8/8/4k3/8/8/4K3/7P/8 w - - 0 1"); // Noirs : roi seul
  const t1 = R.timeoutOutcome(loneKing, "w");
  ok("Blancs tombent, Noirs n'ont qu'un roi : nulle (ancien code : victoire des Noirs)", t1.status === "draw" && t1.reason === "timeoutMaterial");
  const t2 = R.timeoutOutcome(loneKing, "b");
  ok("Noirs tombent, Blancs ont un pion : victoire des Blancs", t2.status === "timeout" && t2.winner === "w");
  const kn = new Chess("8/8/4k3/4p3/8/4K3/8/6N1 w - - 0 1"); // cavalier contre pion : mat aidé possible
  ok("roi + cavalier contre roi + pion : le drapeau gagne (mat aidé possible)", R.timeoutOutcome(kn, "b").winner === "w");
}

section("avantage matériel (lu sur le plateau)");
{
  const z = R.materialDiff(R.START_FEN);
  ok("position de départ : rien", z.w.score === 0 && z.b.score === 0 && !z.w.pieces.length && !z.b.pieces.length);
  const promo = R.materialDiff("4k3/8/8/8/8/8/8/Q3K2Q w - - 0 1");
  ok("deux dames promues contre roi seul : +18 pour les Blancs", promo.w.score === 18 && promo.w.pieces.join("") === "qq", JSON.stringify(promo.w));
  // Le pion h devient dame en prenant la dame noire, puis se fait prendre :
  // les Blancs n'ont perdu qu'un PION, les Noirs pion + cavalier + pion + dame.
  const promoted = play(["h4", "g5", "hxg5", "Nf6", "gxf6", "Rg8", "fxe7", "Rh8", "exd8=Q+", "Kxd8"]);
  const mm = R.materialDiff(promoted.fen());
  ok("pion promu puis pris : +13 pour les Blancs (dame, cavalier, pion)", mm.w.score === 13 && mm.w.pieces.join("") === "qnp" && mm.b.score === 0, JSON.stringify(mm));
  // L'ancien calcul additionnait les PRISES : la dame promue prise par les
  // Noirs comptait 9 contre les Blancs, qui n'avaient pourtant perdu qu'un pion.
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const hist = promoted.history({ verbose: true });
  const oldAdv = hist.filter((m) => m.color === "w" && m.captured).reduce((s, m) => s + VAL[m.captured], 0)
    - hist.filter((m) => m.color === "b" && m.captured).reduce((s, m) => s + VAL[m.captured], 0);
  ok("FALSIFICATION : l'ancien calcul affichait +5 au lieu de +13", oldAdv === 5, "+" + oldAdv);
  const trade = R.materialDiff("rnbqkb1r/pppppppp/8/8/8/8/PPPPPPPP/RNBQKB1R w KQkq - 0 1");
  ok("un cavalier pris de chaque côté : aucun avantage affiché", trade.w.score === 0 && trade.b.score === 0 && !trade.w.pieces.length && !trade.b.pieces.length);
  const up = R.materialDiff("4k3/8/8/8/8/8/8/R3K3 w - - 0 1");
  ok("une tour de plus : pièce « r » et +5 côté Blancs", up.w.pieces.join("") === "r" && up.w.score === 5 && up.b.score === 0);
}

section("reprise de coup (le bug de l'ordinateur figé)");
{
  const oldFormula = (turn, requester, n) => (n === 0 ? 0 : turn === requester ? 2 : 1);
  // Humain Noirs, l'ordinateur a ouvert : un seul coup, blanc, et c'est aux Noirs.
  ok("FALSIFICATION : l'ancienne formule voulait défaire 2 demi-coups quand l'humain n'a rien joué", oldFormula("b", "b", 1) === 2);
  ok("la nouvelle refuse : rien à reprendre pour les Noirs", R.takebackPlies(["w"], "b", "b") === 0);
  ok("Noirs ont joué, l'ordinateur réfléchit : on défait 1", R.takebackPlies(["w", "b"], "w", "b") === 1);
  ok("Noirs ont joué, l'ordinateur a répondu : on défait 2", R.takebackPlies(["w", "b", "w"], "b", "b") === 2);
  ok("Blancs au trait après 1…e5 : on défait 2 (e5 et leur coup)", R.takebackPlies(["w", "b"], "w", "w") === 2);
  ok("partie vierge : rien", R.takebackPlies([], "w", "w") === 0 && R.takebackPlies([], "w", "b") === 0);
}

section("pré-coups (géométrie, comme chessground)");
{
  const set = (a) => a.slice().sort().join(",");
  ok("cavalier b1", set(R.premoveDests("b1", "w", "n")) === "a3,c3,d2");
  ok("pion e2 blanc : avance simple, double, deux prises", set(R.premoveDests("e2", "w", "p")) === "d3,e3,e4,f3");
  ok("pion a7 noir", set(R.premoveDests("a7", "b", "p")) === "a5,a6,b6");
  ok("roi e1 : voisins + petit et grand roque", set(R.premoveDests("e1", "w", "k")) === "c1,d1,d2,e2,f1,f2,g1");
  ok("tour a1 : 14 cases", R.premoveDests("a1", "w", "r").length === 14);
  ok("fou c1 : 7 cases", R.premoveDests("c1", "w", "b").length === 7);
  ok("dame d1 : 21 cases", R.premoveDests("d1", "w", "q").length === 21);
}

section("rejeu, positions, analyse");
{
  const sans = ["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1"];
  const g = play(sans);
  const moves = g.history({ verbose: true }).map((m) => ({ san: m.san, color: m.color, from: m.from, to: m.to }));
  const re = R.replayMoves(moves);
  re.move("Ng8");
  ok("rejouer une partie garde l'historique : la triple répétition est vue", re.isThreefoldRepetition());
  const fromFen = new Chess(g.fen());
  fromFen.move("Ng8");
  ok("FALSIFICATION : recharger le FEN la perdait (ancien rechargement de l'hôte)", !fromFen.isThreefoldRepetition());
  ok("un coup illisible rend null (repli sur le FEN)", R.replayMoves([{ san: "Zz9", from: "a1", to: "a1" }]) === null);
  const fens = R.positionsOf(moves);
  ok("positionsOf : une position par demi-coup, plus le départ", fens.length === moves.length + 1 && fens[0] === R.START_FEN && fens[fens.length - 1] === g.fen());
  const al = R.alignTurn("rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", "b");
  ok("alignTurn donne le trait et efface la prise en passant", al.split(" ")[1] === "b" && al.split(" ")[3] === "-");
  const h = play(["e4"]);
  h.load(R.alignTurn(h.fen(), "w"));
  ok("FALSIFICATION : recharger une position efface l'historique (d'où la PILE de l'analyse)", h.history().length === 0 && h.undo() === null);
  ok("cases légales dédoublonnées (promotion = une seule case)", R.legalDests(new Chess("4k3/P7/8/8/8/8/8/4K3 w - - 0 1"), "a7").join(",") === "a8");
}

section("PGN");
{
  const pgn = R.buildPgn({ moves: [{ san: "e4" }, { san: "e5" }, { san: "Qh5" }], whiteName: 'Gui"llaume', blackName: "Bot", status: "resign", winner: "w", date: new Date(2026, 8, 24) });
  ok("en-têtes, date, guillemets neutralisés", pgn.includes('[White "Gui\'llaume"]') && pgn.includes('[Date "2026.09.24"]'));
  ok("corps et résultat", pgn.includes("1. e4 e5 2. Qh5 1-0"));
  ok("résultats : nulle, annulée, en cours", R.pgnResult("draw", null) === "1/2-1/2" && R.pgnResult("aborted", null) === "*" && R.pgnResult("playing", null) === "*");
}

// -----------------------------------------------------------------------------
section("pendule horodatée");
{
  const clock = { w: 180000, b: 180000, side: "w", since: 1000 };
  const a = C.chargeMove(clock, "w", 3456, { incMs: 2000 });
  ok("un coup coûte EXACTEMENT son temps (2 456 ms), incrément ajouté", a.charged === 2456 && a.clock.w === 180000 - 2456 + 2000 && a.clock.side === "b" && a.clock.since === 3456);
  const lag = C.chargeMove(clock, "w", 3000, { thinkMs: 1700, lagCompMs: 500 });
  ok("latence de 300 ms rendue à l'invité", lag.charged === 1700);
  const cheat = C.chargeMove(clock, "w", 3000, { thinkMs: 0, lagCompMs: 500 });
  ok("rabais BORNÉ à 500 ms, même si l'invité déclare 0", cheat.charged === 1500);
  const over = C.chargeMove(clock, "w", 3000, { thinkMs: 99999, lagCompMs: 500 });
  ok("jamais plus que l'écoulé", over.charged === 2000);
  const flag = C.chargeMove({ w: 1000, b: 5000, side: "w", since: 0 }, "w", 1200);
  ok("temps dépassé : drapeau", flag.flagged && flag.clock.w === 0);
  const cd = { w: 60000, b: 60000, side: "w", since: 5000 };
  ok("décompte : rien ne s'écoule avant le départ", C.clockRemaining(cd, "w", 4000) === 60000 && C.snapshotClock(cd, 4000).startIn === 1000);
  const st = C.stopClock({ w: 10000, b: 9000, side: "b", since: 0 }, 4000);
  ok("arrêt : le camp qui tournait paie, sans incrément", st.b === 5000 && st.side === null);
  const snap = { w: 30000, b: 20000, side: "b", at: 100 };
  ok("affichage : seul le camp au trait décompte, jamais sous zéro",
    C.snapRemaining(snap, "b", 1100) === 19000 && C.snapRemaining(snap, "w", 99999) === 30000 && C.snapRemaining(snap, "b", 1e9) === 0);
  const fm = [[180000, "3:00"], [61000, "1:01"], [59999, "0:59"], [10000, "0:10"], [9999, "0:09.9"], [400, "0:00.4"], [0, "0:00.0"], [-5, "0:00.0"]];
  ok("format : m:ss, dixièmes sous 10 s, toujours arrondi vers le bas",
    fm.every(([ms, s]) => C.fmtClock(ms) === s), fm.map(([ms]) => C.fmtClock(ms)).join(" "));

  // L'ancien modèle : un top par seconde retire 1 s au camp au trait À CET
  // INSTANT. On rejoue 400 coups aux durées aléatoires et on compare.
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let t = rnd() * 1000, worstOld = 0, worstNew = 0, sumOld = 0;
  let c2 = { w: 1e9, b: 1e9, side: "w", since: t };
  for (let i = 0; i < 400; i++) {
    const think = 150 + rnd() * 2500;
    const start = t, end = t + think;
    const ticks = Math.floor(end / 1000) - Math.floor(start / 1000); // tops tombés pendant le coup
    const mover = c2.side;
    const r = C.chargeMove(c2, mover, end);
    worstNew = Math.max(worstNew, Math.abs(r.charged - think));
    worstOld = Math.max(worstOld, Math.abs(ticks * 1000 - think));
    sumOld += ticks * 1000 - think;
    c2 = r.clock; t = end;
  }
  ok("FALSIFICATION : l'ancien modèle se trompait jusqu'à ~1 s par coup", worstOld > 800, Math.round(worstOld) + " ms");
  ok("la pendule horodatée ne se trompe d'aucune milliseconde sur 400 coups", worstNew < 1e-6, worstNew + " ms");
}

// -----------------------------------------------------------------------------
section("ordinateur : jamais un coup choisi sur une recherche coupée");
{
  // Horloge simulée : chaque appel à now() avance d'une unité, donc
  // l'échéance tombe à un endroit précis, reproductible, de l'arbre.
  let seed = 99;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const positions = [];
  while (positions.length < 24) {
    const g = new Chess();
    const plies = 10 + Math.floor(rnd() * 24);
    for (let i = 0; i < plies && !g.isGameOver(); i++) { const ms = g.moves(); g.move(ms[Math.floor(rnd() * ms.length)]); }
    if (!g.isGameOver()) positions.push(g.fen());
  }
  const order = (g) => g.moves({ verbose: true }).sort((a, b) => ((b.captured ? 10 : 0) - (a.captured ? 10 : 0)));
  // Ancienne logique, recopiée telle qu'avant l'audit : le score de la
  // recherche interrompue est comparé comme les autres.
  function oldRoot(game, rootMoves, depth, deadline, now) {
    let alpha = -Infinity, best = null, score = -Infinity, cutPicked = false;
    for (const m of rootMoves) {
      game.move(m);
      const sc = -E.negamax(game, depth - 1, -Infinity, -alpha, deadline, now);
      game.undo();
      const cut = now() > deadline;
      if (sc > score) { score = sc; best = m; cutPicked = cut; }
      if (sc > alpha) alpha = sc;
      if (cut) break;
    }
    return { best, cutPicked };
  }
  // Budgets en APPELS d'horloge (≈ nœuds). ⚠️ Mesuré : une recherche complète
  // à profondeur 2 coûte 50 à 860 ms ici (≈ 0,7 ms par nœud avec chess.js) —
  // d'où des budgets courts, qui coupent quand même la moitié des recherches.
  let interrupted = 0, exact = 0, oldBad = 0, runs = 0;
  const cases = [];
  positions.slice(0, 14).forEach((fen) => [6, 15, 35].forEach((b) => cases.push([fen, 1, b])));
  positions.slice(14, 20).forEach((fen) => [25, 70].forEach((b) => cases.push([fen, 2, b])));
  for (const [fen, depth, budget] of cases) {
    runs++;
    const g = new Chess(fen);
    const moves = order(g);
    let clk = 0; const now = () => clk++;
    const r = E.searchRoot(g, moves, depth, budget, now);
    if (!r.complete) interrupted++;
    // Propriété exacte : le résultat est celui d'une recherche SANS
    // échéance limitée aux coups qu'elle déclare avoir cherchés en entier.
    const prefix = moves.slice(0, r.searched);
    const ref = prefix.length ? E.searchRoot(new Chess(fen), prefix, depth, Infinity) : { best: null, score: -Infinity };
    const same = (!r.best && !ref.best) || (r.best && ref.best && r.best.san === ref.best.san && r.score === ref.score);
    if (same) exact++;
    let c2 = 0; const now2 = () => c2++;
    if (oldRoot(new Chess(fen), order(new Chess(fen)), depth, budget, now2).cutPicked) oldBad++;
  }
  ok("des recherches ont bien été interrompues (sinon le test ne prouve rien)", interrupted > runs / 3, interrupted + "/" + runs);
  ok("le coup rendu = celui d'une recherche complète sur les coups finis", exact === runs, exact + "/" + runs);
  ok("FALSIFICATION : l'ancienne logique retenait des coups coupés", oldBad > 0, oldBad + "/" + runs);

  const mv = E.chooseBotMove("6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1", { timeMs: 400, maxDepth: 3 });
  ok("mat en un vu (Td8#)", mv && mv.from === "d1" && mv.to === "d8", JSON.stringify(mv));
  let legal = 0;
  for (const fen of positions.slice(0, 8)) {
    const m = E.chooseBotMove(fen, { timeMs: 60, maxDepth: 3 });
    const g = new Chess(fen);
    try { g.move({ from: m.from, to: m.to, promotion: m.promotion }); legal++; } catch (e) { /* illégal */ }
  }
  ok("coups toujours légaux, même avec 60 ms", legal === 8, legal + "/8");
  ok("aucun coup légal : null", E.chooseBotMove("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1", { timeMs: 50 }) === null);
}

// -----------------------------------------------------------------------------
section("pièces SVG (Cburnett, BSD)");
{
  const keys = Object.keys(P.PIECE_SVG);
  ok("douze pièces", keys.length === 12 && ["w", "b"].every((c) => "KQRBNP".split("").every((t) => keys.includes(c + t))));
  ok("chaque SVG a un viewBox 45×45 et se ferme", keys.every((k) => P.PIECE_SVG[k].startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"') && P.PIECE_SVG[k].endsWith("</svg>")));
  ok("aucun script, lien ou objet étranger", keys.every((k) => !/script|href|foreignObject|on[a-z]+=/i.test(P.PIECE_SVG[k])));
  ok("URL CSS prête pour chaque pièce", P.pieceBg("w", "k").startsWith('url("data:image/svg+xml,') && P.pieceBg("b", "p") !== P.pieceBg("w", "p"));
  const src = fs.readFileSync(path.join(ROOT, "components", "chess", "pieces.js"), "utf8");
  ok("notice BSD conservée dans le source", src.includes("Copyright (c) Colin M.L. Burnett") && src.includes("THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS"));
  const rules = fs.readFileSync(path.join(ROOT, "lib", "gameRules.js"), "utf8");
  ok("crédit reproduit dans les règles, en FR et en EN (clause 2 de la BSD)", rules.includes("Pièces : Cburnett (Colin M.L. Burnett), licence BSD") && rules.includes("Pieces: Cburnett (Colin M.L. Burnett), BSD"));
}

section("textes FR/EN");
{
  const src = fs.readFileSync(path.join(ROOT, "lib", "i18n.js"), "utf8");
  const iEn = src.indexOf("\n  en: {");
  const keysIn = (body) => new Set([...body.matchAll(/\b(chess[A-Z]\w*)\s*:/g)].map((m) => m[1]));
  const fr = keysIn(src.slice(0, iEn)), en = keysIn(src.slice(iEn));
  ok("des clés ont bien été lues (sinon ce contrôle ne vérifie rien)", fr.size > 40 && en.size > 40, fr.size + " FR / " + en.size + " EN");
  const onlyFr = [...fr].filter((k) => !en.has(k)), onlyEn = [...en].filter((k) => !fr.has(k));
  ok("mêmes clés dans les deux langues", !onlyFr.length && !onlyEn.length, [...onlyFr, ...onlyEn].join(" "));
  const game = fs.readFileSync(path.join(ROOT, "components", "chess", "ChessGame.js"), "utf8");
  const room = fs.readFileSync(path.join(ROOT, "app", "room", "[code]", "page.js"), "utf8");
  const used = new Set([...game.matchAll(/"(chess[A-Z]\w*)"/g)].map((m) => m[1]));
  ok("des clés lues par le jeu ont été trouvées", used.size > 30, used.size + " clés");
  const missing = [...used].filter((k) => !fr.has(k));
  ok("toute clé lue par le jeu existe (pas de repli sur le nom de la clé)", !missing.length, missing.join(" "));
  const dead = [...fr].filter((k) => !used.has(k) && !room.includes('"' + k + '"'));
  ok("aucune clé morte", !dead.length, dead.join(" "));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${total - fails}/${total} contrôles passent${fails ? ` — ${fails} ÉCHEC(S)` : ""}.`);
process.exit(fails ? 1 : 0);
