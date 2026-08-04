/* =============================================================================
   verify-audio.mjs — LE TONNERRE SUIT L'ÉCLAIR, ET LES PAS ONT DISPARU.
   (zip 410)
   -----------------------------------------------------------------------------
       node public/templerun/tools/verify-audio.mjs

   Le 409 laissait quatre points en suspens, dont celui-ci : « aucun outil de
   vérification audio n'existe ». Il en fallait un dès que le son a cessé d'être
   deux fichiers joués bêtement au démarrage — c'est le cas au 410, où DEUX
   comportements se déclenchent tout seuls et ne se voient donc pas en lisant
   le code :

     1. LE DÉLAI DU TONNERRE. Un coup de tonnerre simultané au flash ne se lit
        pas comme un orage. Le délai est l'effet, et il se mesure : on tire
        deux mille éclairs et on vérifie que le retard reste dans la fourchette
        ET que le volume décroît avec lui (un coup qui tarde vient de loin).

     2. LA FENÊTRE DE RESPIRATION. « Par moments » n'est ni une boucle ni un
        métronome. On simule dix minutes de course et on compte.

   ⚠️ CE QU'IL NE PROUVE PAS. Il ne dit pas que le tonnerre SONNE bien, ni que
   4,4 s est la bonne durée pour un souffle, ni qu'un délai de 2 s « fait »
   400 mètres à l'oreille. Ces trois-là s'entendent, ils ne se calculent pas :
   on ouvre index.html, on lance une course, ET ON ÉCOUTE.

   ⚠️ IL A ÉTÉ PASSÉ SUR LE 409 AVANT D'ÊTRE CRU SUR LE 410. Le résultat exact,
   parce qu'un « il échoue » sans chiffre ne vaut rien : **neuf contrôles
   sonnent, puis le script s'arrête net sur `AudioFX.thunder is not a
   function`**. Les neuf sont thunder.mp3 et breath.mp3 absents, footsteps.mp3
   toujours là, le code des pas partout, et les quatre constantes de tonnerre
   qui n'existaient pas (`undefined contre undefined`). L'arrêt brutal EST le
   constat le plus net des dix : au 409, la fonction n'existait pas du tout.
   C'est la leçon du 404 — un contrôle qui n'a jamais échoué ne prouve rien.
   ========================================================================== */

import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

let pass = 0, fail = 0;
const ok = (cond, label, detail = "") => {
  if (cond) { pass++; console.log(`  OK   ${label}${detail ? "  " + detail : ""}`); }
  else { fail++; console.log(`  ÉCHEC ${label}${detail ? "  " + detail : ""}`); }
};

console.log("\n=== verify-audio.mjs — le tonnerre suit l'éclair, et les pas ont disparu ===\n");

/* ------------------------------------------------------------------------
   Le banc d'essai. audio.js ne demande au navigateur que trois choses :
   window.Audio, setTimeout et clearTimeout. On les remplace par des objets
   qui NOTENT au lieu de jouer — c'est tout ce qu'il faut pour observer un
   comportement temporel sans attendre dix minutes.
   --------------------------------------------------------------------- */
const played = [];        // {name, at, vol}
let timers = [], nextId = 1, clock = 0;

function FakeAudio(src) {
  this.src = src; this.volume = 1; this.currentTime = 0; this.preload = "";
  /* ⚠️ `playbackRate` AJOUTÉ AU 416. Le vrai <audio> l'a toujours eu ; le faux
     ne l'avait pas, parce qu'aucune piste ne s'en servait avant les bulles.
     Un banc d'essai n'imite que ce dont on s'est servi jusque-là — c'est
     normal, et c'est aussi pourquoi il faut le compléter en même temps qu'on
     ajoute une capacité, jamais après. */
  this.playbackRate = 1;
  this.paused = true;
  this.play = () => {
    this.paused = false;
    played.push({ src: this.src, at: clock, vol: this.volume, rate: this.playbackRate, el: this });
    return { catch() {} };
  };
  this.pause = () => { this.paused = true; };
}

const ctx = vm.createContext({
  Math, console, JSON,
  window: { Audio: FakeAudio },
  setTimeout: (fn, ms) => { const id = nextId++; timers.push({ id, at: clock + ms, fn }); return id; },
  clearTimeout: (id) => { timers = timers.filter((t) => t.id !== id); },
});
for (const f of ["js/config.js", "js/audio.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}
const { CFG, AudioFX } = vm.runInContext("({ CFG, AudioFX })", ctx);

/* Avance l'horloge du banc et déclenche les minuteurs échus, dans l'ordre. */
function advance(ms) {
  const end = clock + ms;
  for (;;) {
    const due = timers.filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
    if (!due) break;
    timers = timers.filter((t) => t !== due);
    clock = due.at;
    due.fn();
  }
  clock = end;
}

AudioFX.init();

/* ======================================================== 1. LES FICHIERS ==
   Une piste déclarée dont le mp3 manque ne se voit qu'à l'oreille, et
   seulement si on court assez longtemps pour la déclencher. */
const SND = path.join(root, "sounds");
for (const f of ["opening.mp3", "thunder.mp3", "breath.mp3"]) {
  const p = path.join(SND, f);
  const exists = fs.existsSync(p) && fs.statSync(p).size > 1000;
  ok(exists, `le fichier sounds/${f} existe et n'est pas vide`,
    exists ? `${(fs.statSync(p).size / 1024).toFixed(0)} Ko` : "absent");
}
ok(!fs.existsSync(path.join(SND, "footsteps.mp3")),
  "⚠️ sounds/footsteps.mp3 a bien été SUPPRIMÉ (le collage-remplacement ne supprime rien : à faire à la main)");

const AUDIO_SRC = fs.readFileSync(path.join(root, "js/audio.js"), "utf8");
const GAME_SRC = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
const WORLD_SRC = fs.readFileSync(path.join(root, "js/world.js"), "utf8");
const codeOnly = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

ok(!/Footsteps|footsteps/.test(codeOnly(AUDIO_SRC) + codeOnly(GAME_SRC)),
  "⚠️ plus une seule ligne de code ne parle des pas — ni fonction morte, ni appel commenté");
ok(typeof AudioFX.setFootsteps === "undefined" && typeof AudioFX.startFootsteps === "undefined",
  "... et l'API footsteps n'existe plus sur AudioFX");

ok(played.length === 0, "init() ne joue RIEN — aucun son avant que le joueur ne clique Démarrer");

/* ========================================================= 2. LE TONNERRE ==
   ⚠️ LE CONTRÔLE CENTRAL DU 410. */
ok(CFG.THUNDER_DELAY_MIN_MS > 300,
  "le tonnerre est DIFFÉRÉ : le coup ne part pas avec le flash",
  `${CFG.THUNDER_DELAY_MIN_MS} ms au plus court`);
ok(CFG.THUNDER_DELAY_MAX_MS < CFG.LIGHTNING_MIN_MS,
  "⚠️ le retard maximal reste sous l'écart minimal entre deux éclairs — jamais deux coups en attente",
  `${CFG.THUNDER_DELAY_MAX_MS} ms contre ${CFG.LIGHTNING_MIN_MS} ms`);
ok(CFG.THUNDER_DELAY_MAX_MS <= 4000,
  "... et il reste sous quatre secondes : au-delà, l'oreille ne relie plus le coup au flash",
  `${CFG.THUNDER_DELAY_MAX_MS} ms`);
ok(CFG.THUNDER_VOL_FAR < CFG.THUNDER_VOL_NEAR,
  "un coup lointain est plus SOURD qu'un coup proche",
  `${CFG.THUNDER_VOL_FAR} contre ${CFG.THUNDER_VOL_NEAR}`);

/* Deux mille éclairs, un par « seconde » de banc. On regarde le retard réel
   entre l'appel et le son, et le volume que le son porte. */
const shots = [];
for (let i = 0; i < 2000; i++) {
  played.length = 0;
  const t0 = clock;
  AudioFX.thunder();
  advance(6000);
  if (played.length === 1) shots.push({ d: played[0].at - t0, vol: played[0].vol });
}
const delays = shots.map((s) => s.d);
const dMin = Math.min(...delays), dMax = Math.max(...delays);
ok(shots.length === 2000, "chaque éclair produit UN coup de tonnerre, et un seul",
  `${shots.length}/2000`);
ok(dMin >= CFG.THUNDER_DELAY_MIN_MS && dMax <= CFG.THUNDER_DELAY_MAX_MS,
  "⚠️ le retard mesuré reste dans la fourchette annoncée",
  `${dMin.toFixed(0)}..${dMax.toFixed(0)} ms sur 2000 tirages`);
ok(dMax - dMin > (CFG.THUNDER_DELAY_MAX_MS - CFG.THUNDER_DELAY_MIN_MS) * 0.9,
  "... et il la balaie vraiment : le retard n'est pas une constante déguisée",
  `étendue ${(dMax - dMin).toFixed(0)} ms`);

/* Le lien retard/volume : un SEUL tirage commande les deux, donc la corrélation
   doit être parfaite. Un tirage séparé donnerait un éclair lointain qui claque
   à l'oreille une fois sur deux — le défaut exact que ce contrôle interdit. */
const byDelay = shots.slice().sort((a, b) => a.d - b.d);
let monotone = true;
for (let i = 1; i < byDelay.length; i++) if (byDelay[i].vol > byDelay[i - 1].vol + 1e-9) monotone = false;
ok(monotone,
  "⚠️ le volume DÉCROÎT toujours quand le retard grandit — un seul tirage commande les deux",
  `de ${byDelay[0].vol.toFixed(2)} (proche) à ${byDelay[byDelay.length - 1].vol.toFixed(2)} (lointain)`);

/* Le silence annule l'attente : sans ça, un éclair survenu une demi-seconde
   avant la mort du joueur ferait tonner l'écran de fin. */
played.length = 0;
AudioFX.thunder();
advance(200);
AudioFX.stopAll();
advance(8000);
ok(played.length === 0,
  "⚠️ stopAll() annule le coup EN ATTENTE (pas de tonnerre sur l'écran de fin)");

/* ====================================================== 3. LA RESPIRATION ==
   Dix minutes de course, frame par frame (60 Hz), comme le fait game.js. */
played.length = 0;
const t0 = clock;
AudioFX.armBreath(clock);
const breaths = [];
for (let i = 0; i < 60 * 600; i++) {
  clock += 1000 / 60;
  AudioFX.tickBreath(clock);
  while (breaths.length < played.length) breaths.push(played[breaths.length].at);
}
const gaps = breaths.slice(1).map((t, i) => t - breaths[i]);
ok(breaths.length > 0, "le fermier souffle pendant la course", `${breaths.length} souffles en 10 min`);
ok(breaths[0] - t0 >= CFG.BREATH_FIRST_MS,
  "⚠️ le PREMIER souffle attend : on ne s'essouffle pas au troisième pas, et l'ouverture a le temps de finir",
  `${((breaths[0] - t0) / 1000).toFixed(1)} s`);
ok(gaps.every((g) => g >= CFG.BREATH_MIN_MS - 20 && g <= CFG.BREATH_MAX_MS + 20),
  "chaque intervalle reste dans la fenêtre de config",
  `${(Math.min(...gaps) / 1000).toFixed(1)}..${(Math.max(...gaps) / 1000).toFixed(1)} s`);
ok(Math.max(...gaps) - Math.min(...gaps) > 3000,
  "⚠️ les intervalles VARIENT — un souffle régulier serait un métronome, pas une respiration",
  `étendue ${((Math.max(...gaps) - Math.min(...gaps)) / 1000).toFixed(1)} s`);
ok(breaths.length < 60,
  "... et il souffle « par moments », pas en boucle",
  `un souffle toutes les ${(600 / breaths.length).toFixed(0)} s en moyenne`);
played.length = 0;
AudioFX.stopAll();
for (let i = 0; i < 60 * 120; i++) { clock += 1000 / 60; AudioFX.tickBreath(clock); }
ok(played.length === 0, "stopAll() désarme la respiration (pause, mort, retour à la ferme)");

/* ================================================= 4. LE FIL ÉCLAIR → SON ==
   Les trois lignes qui relient l'orage au son sont lues DANS la source : ce
   sont des branchements, pas des nombres, et ils ne se mesurent pas. */
const WC = codeOnly(WORLD_SRC), GC = codeOnly(GAME_SRC);
ok(/setLightningListener/.test(WC) && /setLightningListener\s*,/.test(WC),
  "world.js expose un abonnement aux éclairs (et n'appelle pas AudioFX lui-même)");
ok(!/AudioFX/.test(WC),
  "⚠️ world.js ignore toujours l'existence du son — sinon tools/ ne pourrait plus le charger");
const amb = WC.slice(WC.indexOf("function updateAmbient"));
ok(/const flash = tickLightning[\s\S]{0,400}?onLightning\(/.test(amb),
  "⚠️ l'annonce est faite APRÈS la multiplication par (1 - day) : ce qui tonne est ce qui BRILLE",
  "un ciel de plein midi ne tonne pas");
ok(/storm\.flashed = false/.test(WC) && /storm\.flashed = true/.test(WC),
  "... et une seule fois par éclair (storm.flashed), pas à chaque image du flash");
ok(/setLightningListener\([\s\S]{0,200}?STATE\.RUNNING[\s\S]{0,80}?AudioFX\.thunder\(\)/.test(GC),
  "⚠️ seule une course en cours tonne (l'écran de fin fait vivre la scène, il ne la fait pas gronder)");
ok(/function endRun[\s\S]{0,200}?AudioFX\.stopAll\(\)/.test(GC)
  && /function beginEscape[\s\S]{0,400}?AudioFX\.stopAll\(\)/.test(GC)
  && /function leave[\s\S]{0,120}?AudioFX\.stopAll\(\)/.test(GC),
  "mort, sortie offroad et retour à la ferme coupent tout");
ok(/STATE\.PAUSED;\s*AudioFX\.stopAll\(\)/.test(GC) && /armBreath/.test(GC),
  "la pause coupe et la reprise réarme la respiration");
ok(/STATE\.RUNNING[\s\S]{0,1200}?AudioFX\.tickBreath\(now\)/.test(GC),
  "tickBreath est appelée dans la boucle, branche RUNNING");

/* ══════════════════════════════════════════════════════════════════════════════
   LES BULLES BLEUES (416).
   ──────────────────────────────────────────────────────────────────────────────
   ⚠️ TROIS PROPRIÉTÉS, ET AUCUNE NE S'ENTEND EN LISANT LE CODE : que six bulles
   ramassées coup sur coup produisent SIX sons (et non un seul qui se coupe
   cinq fois), que leur hauteur MONTE, et qu'elle PLAFONNE. La première est la
   plus importante : c'est le défaut qu'on obtient toujours en rejouant un même
   <audio>, et il ne se manifeste que sur un chapelet — c'est-à-dire jamais
   pendant qu'on teste une bulle à la main.
   ══════════════════════════════════════════════════════════════════════════ */
{
  played.length = 0;
  AudioFX.resetChain();
  // Un chapelet serré : neuf bulles espacées de 120 ms, ce que donne la
  // vitesse de course sur COIN_SPACING (voir la note de config.js).
  for (let i = 0; i < 9; i++) { AudioFX.bubble(clock); advance(120); }
  const bubs = played.filter((p) => p.src.indexOf("bubble.mp3") >= 0);
  ok(bubs.length === 9, "⚠️ neuf bulles ramassées produisent NEUF sons (les voix ne se coupent pas)",
    `${bubs.length} sons pour 9 bulles`);
  /* ⚠️ ON VÉRIFIE AUSSI QUE LES VOIX SONT DIFFÉRENTES, et pas seulement qu'il y
     a neuf appels. Neuf `play()` sur le MÊME élément donneraient neuf entrées
     dans le journal et un seul son à l'oreille — le contrôle passerait en
     mesurant exactement le défaut qu'il cherche. */
  const distinct = new Set(bubs.slice(0, 6).map((p) => p.el)).size;
  ok(distinct === 6, "... et sur six voix distinctes, pas six fois la même",
    `${distinct} voix pour 6 bulles`);
  const rates = bubs.map((p) => p.rate);
  ok(rates[0] < rates[3] && rates[3] < rates[6], "⚠️ la hauteur MONTE le long du chapelet",
    `${rates[0].toFixed(2)} → ${rates[3].toFixed(2)} → ${rates[6].toFixed(2)}`);
  const cap = Math.pow(2, CFG.BUBBLE_MAX_STEPS / 12);
  ok(Math.max(...rates) <= cap + 1e-9, "... et elle PLAFONNE (au-delà, le son claque au lieu de sonner)",
    `${Math.max(...rates).toFixed(3)} pour un plafond de ${cap.toFixed(3)}`);
  ok(played.some((p) => p.src.indexOf("bubble-run.mp3") >= 0),
    "... et un chapelet complet se conclut par un accord");
}
{
  /* La rupture par le temps. Deux bulles séparées d'un long silence ne forment
     pas une série — sinon la montée n'aurait plus aucun sens sur une course
     entière, et on finirait la partie sept demi-tons trop haut. */
  played.length = 0;
  AudioFX.resetChain();
  AudioFX.bubble(clock); advance(CFG.BUBBLE_CHAIN_MS + 200);
  AudioFX.bubble(clock);
  const r = played.filter((p) => p.src.indexOf("bubble.mp3") >= 0).map((p) => p.rate);
  ok(r.length === 2 && Math.abs(r[0] - r[1]) < 1e-9,
    "⚠️ deux bulles isolées ne forment pas une série : la hauteur repart du bas",
    `${r.map((x) => x.toFixed(3)).join(" puis ")}`);
}
{
  // Et stopAll() remet le compteur à plat : la partie suivante repart en bas.
  played.length = 0;
  AudioFX.resetChain();
  for (let i = 0; i < 5; i++) { AudioFX.bubble(clock); advance(100); }
  AudioFX.stopAll();
  played.length = 0;
  AudioFX.bubble(clock);
  const r = played.filter((p) => p.src.indexOf("bubble.mp3") >= 0)[0];
  ok(r && Math.abs(r.rate - 1) < 1e-9,
    "⚠️ stopAll() remet la série à zéro (une partie ne démarre pas sept demi-tons trop haut)",
    r ? `taux ${r.rate.toFixed(3)}` : "aucun son");
}

console.log(`\n${fail === 0 ? "Tout est passé." : `${fail} contrôle(s) en échec.`}  (${pass}/${pass + fail})\n`);
console.log(`Ce script ne dit RIEN de ce qu'on entend : ni si le coup de
tonnerre est beau, ni si 4,4 s de souffle est la bonne longueur, ni si le
volume relatif des trois pistes tient ensemble. Il dit que le tonnerre part en
retard et jamais avec le flash, que le retard commande le volume, que la
respiration revient par moments et jamais en boucle, et qu'il ne reste rien
des pas. Pour le reste : on ouvre index.html, on court, ET ON ÉCOUTE.\n`);
process.exit(fail === 0 ? 0 : 1);
