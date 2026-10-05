/* =============================================================================
   verify-bonhomme.mjs — LE BONHOMME DE NEIGE SE MONTE-T-IL COMME ON LE PROMET ? (2026-10-05)
   -----------------------------------------------------------------------------
   Guillaume : « possibilité de construire un bonhomme de neige quand le sol est
   couvert de neige » ; tranché : on ROULE les boules, on en empile trois, on
   choisit les accessoires. `bonhomme.js` est pur : ce banc le JOUE.
     §1  la boule : elle grossit en roulant (vite au début, plus lentement ensuite),
         jamais au-delà de R_MAX, et pas du tout sur une neige trop mince ;
     §2  l'empilement : trois boules au plus, la plus grosse en bas, la troisième
         ouvre le décor ; une boule trop grosse se pose À CÔTÉ ;
     §3  l'hôte : une boule qu'on n'a pas prise ne se pose pas, une taille annoncée
         plus grande que le temps écoulé ne le permet est ramenée, deux joueurs ne
         prennent pas la même boule, la carte a un plafond ;
     §4  le décor : ramené au catalogue (une valeur inconnue retombe au défaut) ;
     §5  le dégel : daté quand la neige part, l'affaissement monte de 0 à 1, l'hôte
         retire le bonhomme au bout de THAW_MS ; un joueur parti lâche sa boule ;
     §6  l'obstacle : on se cogne au pied d'un bonhomme, pas à un pas de lui.
   Usage : node tools/verify-bonhomme.mjs
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bonhomme-"));
fs.writeFileSync(path.join(tmp, "bonhomme.js"), fs.readFileSync(path.join(ROOT, "components", "ferme", "bonhomme.js"), "utf8"));
const BN = await import(pathToFileURL(path.join(tmp, "bonhomme.js")).href);
const K = BN.SNOWMAN;

let fails = 0, total = 0;
const ok = (n, c, x) => { total++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };
const section = (t) => console.log(`\n=== ${t} ===\n`);
let seq = 0;
const newId = () => "s" + (++seq);

section("§1 — la boule");
{
  let r = K.R0, d = 0;
  const marks = [];
  while (r < K.R_MAX - 1e-6 && d < 100) { r = BN.rollGrow(r, 0.1, 1); d += 0.1; if (Math.abs(d - 3) < 0.05 || Math.abs(d - 6) < 0.05) marks.push(r); }
  ok("de R0 à R_MAX en une dizaine de cases de neige épaisse", d > 8 && d < 14, `${d.toFixed(1)} cases`);
  ok("elle grossit vite au début, plus lentement ensuite", marks.length === 2 && (marks[0] - K.R0) > (marks[1] - marks[0]), marks.map((v) => v.toFixed(3)).join(" → "));
  ok("jamais au-delà de R_MAX", BN.rollGrow(K.R_MAX, 50, 1) === K.R_MAX);
  // Falsifié : `MIN_CM` à 0 → la neige d'un centimètre ferait grossir la boule.
  ok("rien sous une neige trop mince", BN.snowK(K.MIN_CM - 0.1) === 0 && BN.rollGrow(K.R0, 5, BN.snowK(1)) === K.R0);
  ok("une neige mince en donne moins qu'une épaisse", BN.snowK(3) < BN.snowK(8) && BN.snowK(8) === 1);
  ok("pousser une grosse boule ralentit, sans arrêter", BN.rollSpeedMul(K.R0) === 1 && Math.abs(BN.rollSpeedMul(K.R_MAX) - K.SLOW_AT_MAX) < 1e-9);
}

section("§2 — l'empilement");
{
  const st = { snowmen: [], snowRoll: {} };
  const t0 = 1.78e12;
  BN.resolveSnowTake(st, "a", "farm", null, t0);
  const a = BN.resolveSnowDrop(st, "a", "farm", 10, 10, 0.55, t0 + 10000, 5.2, newId);
  ok("une boule posée seule fait un tas", a.ok && !a.stacked && st.snowmen.length === 1 && st.snowmen[0].balls[0] === 0.55);
  BN.resolveSnowTake(st, "a", "farm", null, t0 + 11000);
  const big = BN.resolveSnowDrop(st, "a", "farm", 10.3, 10, 0.54, t0 + 21000, 5.2, newId);
  // Falsifié : `STACK_RATIO` à 1,5 → la boule de 0,54 s'empilerait sur celle de 0,55.
  ok("une boule trop grosse se pose À CÔTÉ", big.ok && !big.stacked && big.tooBig && st.snowmen.length === 2);
  st.snowmen.pop();
  BN.resolveSnowTake(st, "b", "farm", null, t0 + 22000);
  const b = BN.resolveSnowDrop(st, "b", "farm", 10.4, 10.1, 0.4, t0 + 30000, 5.2, newId);
  ok("une boule plus petite s'empile", b.ok && b.stacked && !b.done && st.snowmen[0].balls.length === 2);
  BN.resolveSnowTake(st, "a", "farm", null, t0 + 31000);
  const c = BN.resolveSnowDrop(st, "a", "farm", 10, 10, 0.3, t0 + 36000, 5.2, newId);
  ok("la troisième boule finit le bonhomme et ouvre le décor", c.ok && c.stacked && c.done && !!st.snowmen[0].deco);
  BN.resolveSnowTake(st, "b", "farm", null, t0 + 37000);
  const d = BN.resolveSnowDrop(st, "b", "farm", 10, 10, 0.2, t0 + 40000, 5.2, newId);
  ok("un bonhomme fini n'accepte pas de quatrième boule", d.ok && !d.stacked && st.snowmen[0].balls.length === 3 && st.snowmen.length === 2);
  ok("on ne démonte pas un bonhomme fini", BN.resolveSnowTake(st, "a", "farm", st.snowmen[0].id, t0 + 41000).reason === "done");
  const top = BN.resolveSnowTake(st, "a", "farm", st.snowmen[1].id, t0 + 42000);
  ok("on reprend une boule posée (elle garde sa taille)", top.ok && top.r === 0.2 && st.snowmen.length === 1);
}

section("§3 — l'hôte");
{
  const st = { snowmen: [], snowRoll: {} };
  const t0 = 1.78e12;
  ok("une boule qu'on n'a pas prise ne se pose pas", BN.resolveSnowDrop(st, "x", "town", 1, 1, 0.3, t0, 5.2, newId).reason === "none");
  BN.resolveSnowTake(st, "x", "town", null, t0);
  // Falsifié : le plafond par le temps retiré → la boule annoncée à R_MAX après 0,5 s passerait.
  const quick = BN.resolveSnowDrop(st, "x", "town", 1, 1, K.R_MAX, t0 + 500, 5.2, newId);
  const bound = BN.rollGrow(K.R0, 0.5 * 5.2, 1);   // ce que 0,5 s de marche dans la neige la plus épaisse peut donner
  ok("une taille impossible en si peu de temps est ramenée", quick.ok && quick.r <= bound + 1e-9 && quick.r < K.R_MAX - 0.2, `annoncée ${K.R_MAX}, posée ${quick.r.toFixed(3)} après 0,5 s (borne ${bound.toFixed(3)})`);
  ok("on ne prend pas deux boules à la fois", BN.resolveSnowTake(st, "y", "town", null, t0).ok && BN.resolveSnowTake(st, "y", "town", null, t0).reason === "busy");
  delete st.snowRoll.y;
  const id = st.snowmen[0].id;
  const t1 = BN.resolveSnowTake(st, "p", "town", id, t0 + 1000), t2 = BN.resolveSnowTake(st, "q", "town", id, t0 + 1000);
  ok("deux joueurs ne prennent pas la même boule", t1.ok && t2.reason === "gone");
  const full = { snowmen: [], snowRoll: {} };
  for (let k = 0; k < K.MAX_PER_ZONE; k++) { BN.resolveSnowTake(full, "z", "farm", null, t0); BN.resolveSnowDrop(full, "z", "farm", k * 3, 0, 0.2, t0 + 60000, 5.2, newId); }
  BN.resolveSnowTake(full, "z", "farm", null, t0);
  ok("la carte a un plafond", BN.resolveSnowDrop(full, "z", "farm", 99, 99, 0.2, t0 + 60000, 5.2, newId).reason === "full" && full.snowmen.length === K.MAX_PER_ZONE);
  BN.resolveSnowTake(full, "z", "town", null, t0);
  ok("le plafond est par carte", BN.resolveSnowDrop(full, "z", "town", 1, 1, 0.2, t0 + 60000, 5.2, newId).ok);
}

section("§4 — le décor");
{
  const n = BN.normalizeDeco({ hat: "tophat", scarf: "violet", arms: "broom", extra: 42 });
  ok("une valeur connue est gardée, une inconnue retombe au défaut", n.hat === "tophat" && n.scarf === BN.SNOWMAN_DECO_DEFAULT.scarf && n.arms === "broom" && n.extra === BN.SNOWMAN_DECO_DEFAULT.extra && n.nose === "carrot");
  ok("chaque défaut est au catalogue", Object.keys(BN.SNOWMAN_DECO).every((k) => BN.SNOWMAN_DECO[k].includes(BN.SNOWMAN_DECO_DEFAULT[k])));
  const st = { snowmen: [{ id: "a", zone: "farm", x: 0, y: 0, balls: [0.5, 0.4, 0.3], deco: { ...BN.SNOWMAN_DECO_DEFAULT }, thawAt: 0 }, { id: "b", zone: "farm", x: 5, y: 0, balls: [0.5], deco: null, thawAt: 0 }] };
  ok("on décore un bonhomme fini", BN.resolveSnowDeco(st, "a", { hat: "beanie" }).ok && st.snowmen[0].deco.hat === "beanie");
  ok("pas un tas inachevé", BN.resolveSnowDeco(st, "b", { hat: "beanie" }).reason === "notDone");
  const back = BN.normalizeSnowmen(JSON.parse(JSON.stringify(st.snowmen)));
  ok("une sauvegarde relue garde tout", back.length === 2 && back[0].deco.hat === "beanie" && back[1].deco === null && back[0].balls.length === 3);
}

section("§5 — le dégel");
{
  const st = { snowmen: [{ id: "a", zone: "town", x: 0, y: 0, balls: [0.5, 0.4, 0.3], deco: { ...BN.SNOWMAN_DECO_DEFAULT }, thawAt: 0 }], snowRoll: { gone: { r: 0.3, zone: "town", at: 0 } } };
  const t0 = 1.78e12;
  let ch = BN.snowmenTick(st, t0, () => 8, true, (pid) => pid !== "gone");
  ok("un joueur parti lâche sa boule", ch && !st.snowRoll.gone);
  ok("sous la neige, l'hiver, il tient", !st.snowmen[0].thawAt);
  BN.snowmenTick(st, t0 + 1000, () => 0.1, true, () => true);
  ok("la neige partie, le dégel est daté", st.snowmen[0].thawAt === t0 + 1000);
  const s0 = st.snowmen[0];
  ok("l'affaissement monte de 0 à 1", BN.slumpAt(s0, t0 + 1000) === 0 && Math.abs(BN.slumpAt(s0, t0 + 1000 + K.THAW_MS / 2) - 0.5) < 1e-9 && BN.slumpAt(s0, t0 + 1000 + K.THAW_MS * 2) === 1);
  ok("on ne décore pas un bonhomme qui fond", BN.resolveSnowDeco(st, "a", {}).reason === "thaw");
  BN.snowmenTick(st, t0 + 1000 + K.THAW_MS - 1, () => 8, true, () => true);
  ok("la neige revenue ne l'arrête pas", st.snowmen.length === 1 && st.snowmen[0].thawAt === t0 + 1000);
  BN.snowmenTick(st, t0 + 1000 + K.THAW_MS, () => 8, true, () => true);
  ok("fondu, l'hôte le retire", st.snowmen.length === 0);
  const sp = { snowmen: [{ id: "b", zone: "farm", x: 0, y: 0, balls: [0.4], deco: null, thawAt: 0 }] };
  BN.snowmenTick(sp, t0, () => 9, false, () => true);
  ok("l'hiver fini, il fond même sous la neige", sp.snowmen[0].thawAt === t0);
}

section("§6 — l'obstacle");
{
  const list = [{ id: "a", zone: "town", x: 10, y: 10, balls: [0.5, 0.4, 0.3], deco: null, thawAt: 0 }];
  ok("on se cogne à son pied", BN.snowmanBlocks(list, "town", 10.2, 10, 0));
  ok("pas à un pas de lui", !BN.snowmanBlocks(list, "town", 10.7, 10, 0));
  ok("pas sur l'autre carte (la zone avant la distance, §4)", !BN.snowmanBlocks(list, "farm", 10, 10, 0));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${fails === 0 ? "✅" : "❌"} ${total - fails}/${total} contrôles passés.\n`);
process.exit(fails === 0 ? 0 : 1);
