/* =============================================================================
   verify-ludo.mjs — LE SOLO CONTRE BOTS RESPECTE-T-IL LE VRAI LUDO ?
   -----------------------------------------------------------------------------
   Le bot ne possède aucune règle de déplacement : PetitsChevaux lui passe le
   plan légal et le vrai applyMove. Ce banc tient cette frontière, les compositions
   1 humain + 1 à 3 bots et les décisions qui pourraient sinon bloquer une roue ou
   une capture sans produire d'erreur.

   Usage : node tools/verify-ludo.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ludo-bot-"));
const botSrc = fs.readFileSync(path.join(ROOT, "components", "ludoBot.js"), "utf8");
const botFile = path.join(tmp, "ludoBot.mjs");
fs.writeFileSync(botFile, botSrc);

const B = await import(pathToFileURL(botFile).href);
let fails = 0, total = 0;
const ok = (name, condition, detail = "") => {
  total++;
  console.log(`${condition ? "  OK  " : "ÉCHEC "} ${name}${detail ? " — " + detail : ""}`);
  if (!condition) fails++;
};
const section = (name) => console.log(`\n=== ${name} ===\n`);

section("composition solo");
const solo1 = B.ludoSoloMatch("human-uuid", 1);
const solo2 = B.ludoSoloMatch("human-uuid", 2);
const solo3 = B.ludoSoloMatch("human-uuid", 3);
const solo = solo3;
ok("le joueur humain est toujours Rouge et joue en premier", [solo1, solo2, solo3].every((match) => match.order[0] === "red" && match.colorOfPlayer["human-uuid"] === "red"));
ok("un bot donne un duel diagonal Rouge contre Bot Soleil", solo1.order.join(",") === "red,yellow" && solo1.colorOfPlayer.__ludo_bot_yellow__ === "yellow" && Object.keys(solo1.colorOfPlayer).length === 2);
ok("deux ou trois bots occupent exactement les camps attendus", solo2.order.join(",") === "red,green,yellow" && solo3.order.join(",") === "red,green,yellow,blue" && Object.keys(solo2.colorOfPlayer).length === 3 && Object.keys(solo3.colorOfPlayer).length === 4);
ok("les trois bots ont des identifiants uniques", new Set(B.LUDO_SOLO_BOTS.map((bot) => bot.id)).size === 3);
ok("les trois bots ont des couleurs uniques hors Rouge", new Set(B.LUDO_SOLO_BOTS.map((bot) => bot.color)).size === 3 && B.LUDO_SOLO_BOTS.every((bot) => bot.color !== "red"));
ok("seuls les identifiants déclarés sont reconnus comme bots", B.LUDO_SOLO_BOTS.every((bot) => B.isLudoBotId(bot.id)) && !B.isLudoBotId("human-uuid"));
ok("chaque bot possède une clé de nom", B.LUDO_SOLO_BOTS.every((bot) => B.ludoBotNameKey(bot.id) === bot.nameKey));
ok("les trois tailles solo survivent à une sauvegarde JSON", [solo1, solo2, solo3].every((match) => JSON.stringify(JSON.parse(JSON.stringify(match))) === JSON.stringify(match)));

section("choix d'un déplacement");
const baseTokens = {
  red: [0, 0, 0, 0], green: [60, 10, 0, 0], yellow: [50, 0, 0, 0], blue: [0, 0, 0, 0],
};
let calls = [];
const finishMove = B.chooseLudoBotMove({
  tokens: baseTokens, color: "green",
  dice: { a: 1, b: 6, used: [false, false] },
  movablePlan: { d0: [0], d1: [1, 2], sum: [] }, rng: () => 0,
  simulateMove: (tokenIndex, value) => {
    calls.push([tokenIndex, value]);
    const tokens = Object.fromEntries(Object.entries(baseTokens).map(([color, values]) => [color, values.slice()]));
    if (tokenIndex === 0) tokens.green[0] = 61;
    else if (tokenIndex === 1) tokens.green[1] = 16;
    else tokens.green[2] = 1;
    return { tokens, captured: tokenIndex === 1 ? [["yellow", 0]] : [], won: tokenIndex === 0 };
  },
});
ok("finir ses quatre pions prime sur une capture", finishMove?.tokenIndex === 0 && finishMove?.die === 0);
ok("les valeurs passées au simulateur viennent bien des dés", calls.some(([token, value]) => token === 0 && value === 1) && calls.some(([token, value]) => token === 1 && value === 6));

const captureTokens = {
  red: [0, 0, 0, 0], green: [10, 10, 0, 0], yellow: [48, 0, 0, 0], blue: [0, 0, 0, 0],
};
const captureMove = B.chooseLudoBotMove({
  tokens: captureTokens, color: "green",
  dice: { a: 3, b: 4, used: [false, false] },
  movablePlan: { d0: [0], d1: [1], sum: [] }, rng: () => 0,
  simulateMove: (tokenIndex, value) => {
    const tokens = Object.fromEntries(Object.entries(captureTokens).map(([color, values]) => [color, values.slice()]));
    tokens.green[tokenIndex] += value;
    return { tokens, captured: tokenIndex === 0 ? [["yellow", 0]] : [], won: false };
  },
});
ok("capturer un pion avancé prime sur un pas de progression", captureMove?.tokenIndex === 0 && captureMove?.die === 0);
ok("un plan vide ne fabrique aucun coup", B.chooseLudoBotMove({ tokens: captureTokens, color: "green", dice: { a: 6, b: 2 }, movablePlan: { d0: [], d1: [], sum: [] }, simulateMove: () => null }) === null);

let legal = true;
for (let run = 0; run < 1000; run++) {
  const plan = { d0: [], d1: [], sum: [] };
  for (let token = 0; token < 4; token++) {
    if ((run + token) % 2 === 0) plan.d0.push(token);
    if ((run + token) % 3 === 0) plan.d1.push(token);
    if ((run + token) % 5 === 0) plan.sum.push(token);
  }
  const chosen = B.chooseLudoBotMove({
    tokens: captureTokens, color: "green", dice: { a: 2, b: 5 }, movablePlan: plan, rng: () => .5,
    simulateMove: (tokenIndex, value) => {
      const tokens = Object.fromEntries(Object.entries(captureTokens).map(([color, values]) => [color, values.slice()]));
      tokens.green[tokenIndex] += value;
      return { tokens, captured: [], won: false };
    },
  });
  if (!chosen) { legal = plan.d0.length + plan.d1.length + plan.sum.length === 0; if (!legal) break; continue; }
  const list = chosen.die === 0 ? plan.d0 : chosen.die === 1 ? plan.d1 : plan.sum;
  if (!list.includes(chosen.tokenIndex)) { legal = false; break; }
}
ok("1 000 plans : le bot ne sort jamais des options de l'arbitre", legal);

section("captures, roue et cibles");
ok("le bot tranche la question Épargner au lieu de la laisser expirer", B.chooseLudoBotSpare() === false);
const targets = {
  red: [3, 0, 0, 0], green: [18, 0, 0, 0], yellow: [54, 4, 0, 0], blue: [33, 0, 0, 0],
};
const sendTarget = B.chooseLudoBotTarget({ tokens: targets, order: ["red", "green", "yellow", "blue"], color: "green", tokenIdx: 0, kind: "sendEnemy" });
ok("le renvoi ciblé vise le pion adverse le plus avancé", sendTarget?.targetColor === "yellow" && sendTarget?.targetIdx === 0);
const swapTarget = B.chooseLudoBotTarget({
  tokens: targets, order: ["red", "green", "yellow", "blue"], color: "green", tokenIdx: 0, kind: "swapPlaces",
  scoreSwap: ({ targetColor, targetIdx }) => targetColor === "blue" && targetIdx === 0 ? 100 : -100,
});
ok("l'échange délègue son évaluation aux vrais repères du plateau", swapTarget?.targetColor === "blue" && swapTarget?.targetIdx === 0);
ok("aucune cible légale rend null au lieu d'inventer un pion", B.chooseLudoBotTarget({ tokens: { red: [0,0,0,0], green: [10,0,0,0] }, order: ["red", "green"], color: "green", tokenIdx: 0, kind: "sendEnemy" }) === null);

section("automate d'un tour");
const actionBase = { tokens: captureTokens, order: ["red", "green", "yellow", "blue"], turnIdx: 1, dice: null, movablePlan: null, winner: null, pendingMystery: null, pendingCapture: null, pendingTarget: null };
ok("sans dés, le bot demande un lancer", B.ludoBotActionForState({ state: actionBase, color: "green" })?.type === "roll");
const moveAction = B.ludoBotActionForState({
  state: { ...actionBase, dice: { a: 3, b: 4, used: [false, false] }, movablePlan: { d0: [0], d1: [1], sum: [] } }, color: "green", rng: () => 0,
  simulateMove: (tokenIndex, value) => {
    const tokens = Object.fromEntries(Object.entries(captureTokens).map(([color, values]) => [color, values.slice()]));
    tokens.green[tokenIndex] += value;
    return { tokens, captured: [], won: false };
  },
});
ok("dés posés, le bot rend un coup du plan", moveAction?.type === "move" && (moveAction.die === 0 || moveAction.die === 1));
ok("une roue en attente prime sur les dés", B.ludoBotActionForState({ state: { ...actionBase, dice: { a: 6, b: 6 }, pendingMystery: { key: 1, spin: null } }, color: "green" })?.type === "spin");
ok("une roue déjà lancée ne reçoit pas un second lancer", B.ludoBotActionForState({ state: { ...actionBase, pendingMystery: { key: 1, spin: { key: 2, kind: "boost" } } }, color: "green" }) === null);
ok("une capture en attente reçoit une décision", B.ludoBotActionForState({ state: { ...actionBase, pendingCapture: { key: 1 } }, color: "green" })?.type === "spare");
const targetAction = B.ludoBotActionForState({ state: { ...actionBase, pendingTarget: { key: 1, color: "green", tokenIdx: 0, kind: "sendEnemy" } }, color: "green" });
ok("un effet ciblé reçoit une cible légale", targetAction?.type === "target" && targetAction.targetColor === "yellow" && targetAction.targetIdx === 0);

section("branchement du jeu");
const component = fs.readFileSync(path.join(ROOT, "components", "PetitsChevaux.js"), "utf8");
const roomPage = fs.readFileSync(path.join(ROOT, "app", "room", "[code]", "page.js"), "utf8");
const strings = fs.readFileSync(path.join(ROOT, "lib", "i18n.js"), "utf8");
const fakeRelay = fs.readFileSync(path.join(ROOT, "tools", "fake-supabase.mjs"), "utf8");
ok("le salon autorise le solo et écarte les membres hors ligne", /ludo:\s*\{[^\n]*stage:\s*"door"/.test(roomPage) && !/ludo:\s*\{[^\n]*minPlayers/.test(roomPage) && /PetitsChevaux[^\n]*players=\{online === null \? players : players\.filter/.test(roomPage));
ok("le composant propose 1, 2 ou 3 bots avant d'appeler la composition commune", /\[1, 2, 3\]\.map\([\s\S]{0,900}startSolo\(soloBotCount\)/.test(component) && /payload: ludoSoloMatch\(me\.id, botCount\)/.test(component));
ok("l'automate ne tourne que chez l'hôte", /if \(!isHost \|\| phase !== "playing"\) return;/.test(component));
ok("les cinq actions arbitrées ont un chemin bot", ["hostHandleRoll", "hostHandleMove", "hostHandleSpin", "hostHandleSpare", "hostHandleTarget"].every((name) => component.includes(name)));
const soloTextKeys = [
  ...B.LUDO_SOLO_BOTS.map((bot) => bot.nameKey),
  "ludoSoloHint", "ludoOneBot", "ludoTwoBots", "ludoThreeBots", "ludoStartSolo", "ludoWaitSoloChoice",
];
ok("les noms et le sélecteur solo existent en français et en anglais", soloTextKeys.every((key) => (strings.match(new RegExp(key + ":", "g")) || []).length === 2));
ok("le relais local mémorise self:true annoncé à la jonction", /payload\?\.config\?\.broadcast\?\.self[\s\S]{0,100}selfTopics\.add\(topic\)/.test(fakeRelay));
ok("le relais binaire peut rendre l'état à son unique client", /c === me && !me\.selfTopics\.has\(m\.topic\)/.test(fakeRelay));

console.log(fails ? `\n${fails} ÉCHEC(S) sur ${total} contrôles.\n` : `\n${total}/${total} contrôles verts.\n`);
process.exit(fails ? 1 : 0);
