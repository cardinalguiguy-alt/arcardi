/* =============================================================================
   verify-boot.mjs — LE JEU DÉMARRE-T-IL, ET LE MUR TIENT-IL ?
   -----------------------------------------------------------------------------
   Repris du principe de `labyrinth/tools/verify-boot.mjs` (417) : on monte un
   faux DOM, on charge le VRAI `game.js`, et on tape sur les VRAIS écouteurs de
   `window`. Rien n'est simulé du côté du jeu.

   ⚠️ LE STUB RETIENT CE QUI EST MONTRÉ. C'est la correction que le 417 a dû
   faire au sien : un `classList.toggle` qui ne fait rien laisse l'outil
   exécuter tout le fichier sans pouvoir dire un mot de ce que le joueur voit.
   Ici `classList` est une vraie petite implémentation, et `visible()` lit
   l'état réel des panneaux.

   ⚠️ ET ON TESTE D'ABORD QUE LE MUR SE FERME, ENSUITE QU'IL S'OUVRE.
   Un mur qui refuse de s'ouvrir se voit en trois secondes. Un mur ouvert par
   accident laisse le public devant un jeu inachevé, et personne ne s'en
   aperçoit — surtout pas celui qui l'a déjà déverrouillé dans son onglet.
   ========================================================================== */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const R = path.join(HERE, "..");

let pass = 0, fail = 0;
const ok = (c, m, x) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.log(`  ✗ ${m}${x ? "  → " + x : ""}`); } };
const head = (s) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

/* ── LE FAUX DOM ──────────────────────────────────────────────────────────── */
function makeDom() {
  const ids = [...fs.readFileSync(path.join(R, "index.html"), "utf8")
    .matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const els = {};
  const listeners = { window: {}, el: {} };

  function El(id) {
    const cls = new Set();
    return {
      id, textContent: "", innerHTML: "", value: "",
      style: {}, children: [],
      classList: {
        add: (c) => cls.add(c),
        remove: (c) => cls.delete(c),
        contains: (c) => cls.has(c),
        toggle: (c, on) => { if (on === undefined) { cls.has(c) ? cls.delete(c) : cls.add(c); } else if (on) cls.add(c); else cls.delete(c); },
        _set: cls,
      },
      addEventListener(ev, fn) { (listeners.el[id] = listeners.el[id] || {})[ev] = fn; },
      appendChild(c) { this.children.push(c); },
      querySelector() { return El("_q"); },
      /* ⚠️ LE STUB RETIENT CE QUI EST PRÉSENTÉ, et c'est la même correction
         que le 417 a dû faire au sien : un contexte 2D qui avale putImageData
         sans rien garder laisse l'outil exécuter toute la boucle de rendu sans
         pouvoir dire un mot de ce que le joueur VOIT. `last` conserve la
         dernière image envoyée à l'écran, et c'est elle qu'on interroge pour
         savoir si le mur laisse voir le jeu derrière lui. */
      _ctx: null,
      getContext() {
        if (this._ctx) return this._ctx;
        const self = this;
        this._ctx = {
          imageSmoothingEnabled: true, last: null,
          createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
          putImageData(img) { self._ctx.last = img; },
          drawImage() {}, clearRect() {}, fillRect() {},
        };
        return this._ctx;
      },
    };
  }
  for (const id of ids) els[id] = El(id);

  const store = {};
  const win = {
    innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
    addEventListener(ev, fn) { (listeners.window[ev] = listeners.window[ev] || []).push(fn); },
    removeEventListener(ev, fn) {
      const a = listeners.window[ev]; if (!a) return;
      const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
    },
    /* On met les images EN FILE au lieu de les jouer : `frame()` rappelle
       requestAnimationFrame en PREMIÈRE ligne, donc une exécution immédiate
       partirait en récursion infinie. L'outil vide la file quand il veut. */
    _raf: [],
    requestAnimationFrame(fn) { win._raf.push(fn); return win._raf.length; },
    setTimeout: (f, ms) => setTimeout(f, ms), clearTimeout,
    setInterval: () => 0, clearInterval: () => {},
    sessionStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    location: { origin: "http://localhost" },
    postMessage() {},
  };
  win.parent = win;                          // pas dans une iframe

  /* ⚠️ ON RETIENT LES ÉLÉMENTS CRÉÉS À LA VOLÉE, et c'est le stub qui m'a
     appris pourquoi : `present()` ne peint pas dans le canvas visible, il
     peint dans un canvas HORS ÉCRAN de 480x270 créé par `document.
     createElement`, puis l'AGRANDIT dans le visible. Chercher l'image dans
     `#gl` rendait donc « rien » — le contrôle mesurait sa propre ignorance de
     l'architecture qu'il testait. */
  const created = [];
  const doc = {
    readyState: "complete",
    documentElement: { lang: "fr" },
    getElementById: (id) => els[id] || null,
    createElement: () => { const e = El("_new"); created.push(e); return e; },
    addEventListener() {},
  };
  return { els, win, doc, listeners, store, created };
}

/* ── CHARGEMENT ───────────────────────────────────────────────────────────── */
function boot(preUnlocked, openGate) {
  const dom = makeDom();
  if (preUnlocked) dom.store["vf-cry-wip"] = "1";
  const ctx = vm.createContext({
    console, Math, Date, JSON, Object, Array, String, Number, Boolean,
    Uint8ClampedArray, Int16Array, Float32Array, isNaN, parseInt, parseFloat,
    window: dom.win, document: dom.doc,
    sessionStorage: dom.win.sessionStorage,
    setTimeout: dom.win.setTimeout, clearTimeout: dom.win.clearTimeout,
    setInterval: dom.win.setInterval, clearInterval: dom.win.clearInterval,
    requestAnimationFrame: dom.win.requestAnimationFrame,
  });
  const order = [...fs.readFileSync(path.join(R, "index.html"), "utf8")
    .matchAll(/<script src="js\/([^"]+)"><\/script>/g)].map((m) => m[1]);
  for (const f of order) {
    let s = fs.readFileSync(path.join(R, "js", f), "utf8").replace(/if \(typeof module[\s\S]*$/m, "");
    // on bascule l'interrupteur EN MÉMOIRE, exactement comme build-demo.mjs le
    // fait dans sa copie : le dépôt n'est jamais touché par un banc d'essai.
    if (openGate && f === "config.js") s = s.replace(/GATE_ON:\s*true/, "GATE_ON: false");
    new vm.Script(s, { filename: f }).runInContext(ctx);
  }
  const get = (n) => vm.runInContext(`typeof ${n} !== "undefined" ? ${n} : null`, ctx);
  let clock = 0;
  /* `step` est le temps écoulé PAR IMAGE, en ms. On peut donc traverser un
     fondu de 2,2 s en une douzaine d'images au lieu de cent quarante — la
     boucle plafonne dt à 0,25 s, on prend 200 ms et on reste dans le régime
     que le jeu connaît. Un banc d'essai qui rejoue le temps réel image par
     image met dix secondes à vérifier qu'un fondu se termine. */
  const pump = (n, step) => {
    for (let i = 0; i < (n || 1); i++) {
      const q = dom.win._raf.splice(0); clock += (step || 16);
      for (const fn of q) fn(clock);
    }
  };
  /* Combien de couleurs distinctes dans la dernière image présentée ? Une
     seule = un écran uni ; des milliers = le décor est peint. */
  const shown = () => {
    const cv = dom.created.find((e) => e._ctx && e._ctx.last);
    const c = cv && cv._ctx;
    if (!c || !c.last) return -1;
    const d = c.last.data, set = new Set();
    for (let i = 0; i < d.length; i += 4) set.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    return set.size;
  };
  return { dom, ctx, get, pump, shown,
    visible: (id) => dom.els[id] && dom.els[id].classList.contains("visible"),
    key(code, mods) {
      const e = Object.assign({ code, shiftKey: false, metaKey: false, ctrlKey: false,
                                preventDefault() {}, stopPropagation() {} }, mods || {});
      for (const fn of (dom.listeners.window.keydown || [])) fn(e);
    },
    click: (id) => { const h = dom.listeners.el[id]; if (h && h.click) h.click(); },
  };
}

/* ═══ 1. LE JEU SE CHARGE ════════════════════════════════════════════════════ */
head("1. Le chargement");
let B;
try { B = boot(false); ok(true, "les quatorze scripts s'exécutent sans erreur"); }
catch (e) { ok(false, "les quatorze scripts s'exécutent sans erreur", e.message); process.exit(1); }
ok(B.get("CFG") && B.get("Pix") && B.get("Scenes"), "le décor est monté");
ok(B.get("Story") && B.get("Cine"), "le récit est monté");
ok(B.get("CryGate"), "le mur est monté");

/* ═══ 2. LE MUR SE FERME (d'abord) ═══════════════════════════════════════════ */
head("2. Le mur se ferme");
ok(B.visible("construction"), "à l'ouverture, c'est le panneau de chantier qui est montré");
ok(!B.visible("title"), "et surtout PAS l'écran-titre");

B.key("KeyA", { shiftKey: true, metaKey: true });
ok(!B.visible("title"), "une mauvaise touche n'ouvre rien");
B.key("KeyX", {});
ok(!B.visible("title"), "⌘ et ⇧ manquants : rien");
B.key("KeyX", { shiftKey: true });
ok(!B.visible("title"), "⌘ manquant : rien");
B.key("KeyX", { metaKey: true });
ok(!B.visible("title"), "⇧ manquant : rien");

/* ═══ 3. LE MUR S'OUVRE (ensuite) ════════════════════════════════════════════ */
head("3. Le mur s'ouvre");
{
  const C = boot(false);
  C.key("KeyX", { shiftKey: true, metaKey: true });
  ok(!C.visible("title"), "UNE seule pression ne suffit pas");
  ok(C.dom.els.construction.classList.contains("armed"),
     "mais elle allume le halo d'accusé de réception");
  C.key("KeyX", { shiftKey: true, metaKey: true });
  ok(C.visible("title"), "la seconde pression fait tomber le mur");
  ok(!C.visible("construction"), "et le panneau de chantier disparaît");
  ok(C.dom.store["vf-cry-wip"] === "1", "la session s'en souvient (vf-cry-wip)");
  ok(!("vf-lab-wip" in C.dom.store) && !("vf-luge-wip" in C.dom.store),
     "⚠️ et elle n'ouvre NI le labyrinthe NI la descente");
}
{
  const D = boot(true);   // session déjà déverrouillée
  ok(D.visible("title"), "une session déjà ouverte va droit au titre");
}

/* ═══ 3bis. ⚠️ LE MUR NE LAISSE PAS VOIR LE JEU DERRIÈRE LUI ═════════════════
   Guillaume : « cache ça derrière le mur développeur comme les autres jeux en
   développement ». Le mur EXISTAIT déjà — mais il était transparent : le
   panneau de chantier est du DOM semi-opaque posé sur le canvas, et le tableau
   de la corniche continuait de s'y animer derrière, aurore comprise. Un mur qui
   laisse voir le jeu ne le cache pas, il l'annonce.

   ⚠️ ET C'EST EXACTEMENT LE DÉFAUT QUE LE CONTEXTE DU 417 SIGNALAIT DÉJÀ :
   « le mur du labyrinthe n'a été vu sur aucune image » — son COMPORTEMENT était
   vérifié de bout en bout, son ASPECT ne l'était pas. Le contrôle ci-dessous
   regarde ce qui est présenté à l'écran, pas ce que le code prétend faire. */
head("3bis. Le mur ne laisse rien voir");
{
  const M = boot(false);
  M.pump(4);
  const n = M.shown();
  ok(n === 1, `derrière le mur, l'écran est uni (${n} couleur[s] présentée[s])`);

  M.key("KeyX", { shiftKey: true, ctrlKey: true });
  M.key("KeyX", { shiftKey: true, ctrlKey: true });
  M.pump(2);
  ok(M.shown() < 120, "au moment où le mur tombe, le fondu est encore au noir");
  M.pump(16, 200);                       // on traverse les 2,2 s de fondu
  const n2 = M.shown();
  ok(n2 > 2000, `puis le décor apparaît (${n2} couleurs présentées)`);

  /* La seconde ceinture : le panneau lui-même est opaque. Les DEUX doivent
     tenir — le rendu coupé protège du panneau translucide, l'opacité protège
     d'un futur état de boucle qu'on aurait oublié de couper. */
  const css = fs.readFileSync(path.join(R, "css/style.css"), "utf8");
  const block = /#construction \{[\s\S]*?\}/.exec(css);
  ok(!!block && !/rgba\([^)]*,\s*0?\.\d+\s*\)/.test(block[0]),
     "le panneau de chantier est opaque (aucune couleur translucide)");
  ok(!!block && /backdrop-filter:\s*none/.test(block[0]),
     "et il ne floute pas un décor qu'il est censé cacher");
}

/* ═══ 3ter. L'INTERRUPTEUR D'ESSAI ═══════════════════════════════════════════
   `CFG.GATE_ON = false` doit ouvrir la vallée sans code — c'est ce que
   `build-demo.mjs` bascule dans la page d'essai. Et il ne doit RIEN changer
   d'autre : un interrupteur qui ouvrirait aussi la session (`vf-cry-wip`)
   contaminerait le navigateur, et le jeu resterait ouvert après qu'on l'a
   remis à `true`. C'est très exactement comme ça qu'un mur cesse de se
   refermer sans que personne ne s'en aperçoive. */
head("3ter. L'interrupteur d'essai");
{
  const O = boot(false, true);
  ok(O.visible("title"), "GATE_ON = false : on arrive directement à l'écran-titre");
  ok(!O.visible("construction"), "et le panneau de chantier ne s'affiche jamais");
  ok(!("vf-cry-wip" in O.dom.store),
     "⚠️ il n'écrit PAS la session : remettre GATE_ON à true remure vraiment");
  O.pump(2); O.pump(16, 200);
  ok(O.shown() > 2000, "et le décor est bien peint");

  // la page d'essai produite doit vraiment être ouverte
  const demo = path.join(R, "..", "DEMO-vallee-de-verre.html");
  if (fs.existsSync(demo)) {
    const h = fs.readFileSync(demo, "utf8");
    ok(/GATE_ON:\s*false/.test(h), "la page d'essai livrée est ouverte");
    ok(!/<script src=/.test(h), "et elle est bien autonome (aucun script externe)");
  }
}

/* ═══ 4. LE CHAPITRE SE JOUE ═════════════════════════════════════════════════ */
head("4. Le chapitre se joue");
{
  const E = boot(true);
  const Cine = E.get("Cine"), UI = E.get("UI"), Story = E.get("Story"), Walk = E.get("Walk");
  E.click("btnStart");
  ok(Cine.mode !== "idle", "le récit démarre");

  // on déroule : on avance dès qu'une réplique est posée, on choisit l'option 1
  let says = 0, choices = 0, guard = 0, played = false;
  while (Cine.mode !== "done" && guard++ < 4000) {
    for (let i = 0; i < 40; i++) Cine.update(1 / 60);
    if (Cine.mode === "say") { says++; Cine.advance(); }
    else if (Cine.mode === "choice") { choices++; Cine.choose(0); }
    else if (Cine.mode === "play") {
      played = true;
      Walk.reset();
      while (!Walk.S.done) Walk.step(1 / 60, { left: false, right: false });
      Cine.resumeFromPlay();
    }
  }
  ok(Cine.mode === "done" || Cine.mode === "chapter", `le chapitre va jusqu'au bout (${Cine.mode})`);
  ok(played, "le segment jouable est bien atteint");
  ok(says > 30, `${says} répliques jouées`);
  ok(choices === 3, `${choices} choix posés`);
  ok(Object.keys(Cine.flags).length === 3, "trois drapeaux retenus", JSON.stringify(Cine.flags));
}

/* Les trois branches de chaque choix mènent quelque part. */
head("5. Les trois branches de chaque choix");
for (const pick of [0, 1, 2]) {
  const F = boot(true);
  const Cine = F.get("Cine"), Walk = F.get("Walk");
  F.click("btnStart");
  let guard = 0;
  while (Cine.mode !== "done" && guard++ < 4000) {
    for (let i = 0; i < 40; i++) Cine.update(1 / 60);
    if (Cine.mode === "say") Cine.advance();
    else if (Cine.mode === "choice") Cine.choose(pick);
    else if (Cine.mode === "play") { Walk.reset(); Walk.S.done = true; Cine.resumeFromPlay(); }
  }
  ok(Cine.mode === "done" || Cine.mode === "chapter",
     `option ${pick + 1} : le chapitre se termine`, Cine.mode);
  ok(Object.keys(Cine.flags).length === 3, `option ${pick + 1} : trois drapeaux`);
}

console.log(`\n${"═".repeat(66)}`);
console.log(`  ${pass} contrôles passent, ${fail} échouent.`);
console.log(`${"═".repeat(66)}\n`);
process.exit(fail ? 1 : 0);
