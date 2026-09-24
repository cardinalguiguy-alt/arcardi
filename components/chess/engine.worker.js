/* Worker du moteur d'échecs (audit 2026-09-24, lot 2).
   Le calcul de l'ordinateur (0,5 à 1 s) tournait sur le fil principal de
   l'hôte : la page gelait à chaque coup du bot — pendules figées, plateau
   sourd, glisser-déposer saccadé. Ici il tourne à côté. ChessGame.js le crée
   par `new Worker(new URL("./engine.worker.js", import.meta.url))` (forme que
   le bundler de Next.js sait suivre) et retombe sur un appel direct si la
   création échoue. Chaque demande porte un `id` : une réponse arrivée après
   une reprise de coup ou un abandon est reconnue et jetée par l'appelant. */
import { chooseBotMove } from "./engine";

self.onmessage = (e) => {
  const { id, fen, timeMs, maxDepth } = e.data || {};
  let move = null;
  try { move = chooseBotMove(fen, { timeMs, maxDepth }); } catch (err) { move = null; }
  self.postMessage({ id, move });
};
