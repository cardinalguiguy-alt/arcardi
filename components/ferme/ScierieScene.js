"use client";
/* ═══════════════════════════════════════════════════════════════════════════
   LOT E — LA SCÈNE DE SCIAGE : LA VUE, ET RIEN D'AUTRE.
   ═══════════════════════════════════════════════════════════════════════════
   Même découpage que l'audience du maire, et pour les mêmes raisons :
     · toute la mécanique vit dans `scierie.js` — pas de React, pas de dessin —
       et `verify-scierie.mjs` en joue des centaines de manches ;
     · tout le décor vit dans `scierieAtelier.js`, qui ne connaît ni React ni la
       quête, et que `render-scierie.mjs` rastérise sans GPU ;
     · ce fichier ne fait que brancher un doigt sur l'un et un canevas sur
       l'autre.
   C'est ce découpage qui fait qu'un échec du rendu 3D ne coûte pas la manche, et
   qu'un réglage de tempo ne demande pas de relire une boucle de rendu.

   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ LA SIMULATION EST À PAS FIXE ET L'ÉCRAN NE LA COMMANDE PAS.

   La boucle d'affichage tourne à la cadence du navigateur ; la simulation, elle,
   avance par pas de 1/120 s, exactement autant de fois que le temps réel écoulé
   le permet. C'est la SEULE forme qui rende la manche rejouable par l'hôte
   (`sawRun`), et c'est aussi ce qui empêche un écran à 144 Hz d'être plus facile
   qu'un écran à 60 (leçon 458 : un réglage par image est un réglage faux).
   ⚠️ ET LE JOURNAL PORTE DES NUMÉROS DE PAS, PAS DES HORODATAGES. Deux horloges
   ne se comparent jamais (§3), et une date absolue ne survit pas à une opération
   32 bits (2026-08-27). Un numéro de pas est un entier, il traverse le réseau
   sans se déformer, et l'hôte le rejoue tel quel.

   ⚠️⚠️ IL Y A TOUJOURS UN REPLI, ET IL EST JOUABLE. La 3D peut manquer pour deux
   raisons sans rapport (pas de WebGL, ou un script vendorisé qui ne répond pas)
   et la commande de bois ne doit pas dépendre d'une carte graphique. Le repli
   n'est pas un écran d'erreur : c'est la même manche, avec une piste plate à la
   place de l'atelier. Le joueur n'a pas à apprendre le nom de nos problèmes.

   ⚠️ LE CONTEXTE WEBGL SE REND À LA FERMETURE, ET LES TEXTURES AVEC (voir la
   note de `dispose` dans `scierieAtelier.js`). Sans ça, la quatrième commande
   d'une session s'ouvre sur du noir et rien ne dit pourquoi.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from "react";
import * as C from "./fermeConstants";
import * as S from "./scierie";
import * as A from "./scierieAtelier";

const SCRIPTS = ["/vendor/three-r128/three.min.js"];
function loadScript(src) {
  return new Promise((res, rej) => {
    /* ⚠️ LE MARQUEUR EST PARTAGÉ AVEC LA SCÈNE DU MAIRE (`data-maire`), ET C'EST
       VOULU : c'est le MÊME fichier three.js, et deux balises `<script>` pour le
       même code, ce sont deux copies de la bibliothèque dans la page — deux jeux
       de constantes, deux registres de matériaux, des symptômes qui ne
       ressemblent à rien. On réutilise donc la balise si elle est déjà là. */
    const had = document.querySelector(`script[data-maire="${src}"]`);
    if (had) { had.dataset.ok === "1" ? res() : had.addEventListener("load", () => res()); return; }
    const s = document.createElement("script");
    s.src = src; s.async = true; s.dataset.maire = src;
    s.onload = () => { s.dataset.ok = "1"; res(); };
    s.onerror = () => rej(new Error("script " + src));
    document.head.appendChild(s);
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA BOUCLE — ELLE NE DÉCLARE RIEN QUI DOIVE VIVRE AILLEURS
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ Piège n°1 de `CLAUDE.md` : tout ce qu'elle appelle est une fonction de
   MODULE (`S.sawTick`, `A.applySaw`). La seule chose qu'elle publie est un ref
   (`pullRef`), et elle le publie plutôt que d'en recopier une seconde version au
   niveau du composant — une copie divergerait au premier réglage.
   ⚠️ L'ÉTAT DE LA MANCHE VIT DANS UN REF, PAS DANS `useState`. Cent vingt pas
   par seconde dans un état React, ce sont cent vingt rendus d'arbre par seconde
   pendant qu'on scie. React décide QUOI, le ref transporte, la boucle dessine.
   L'interface, elle, se rafraîchit à sa propre cadence (`useState` toutes les
   ~66 ms), ce qui est très au-dessus de ce qu'un œil lit sur un chiffre.
   ═══════════════════════════════════════════════════════════════════════════ */
function useSaw(canvasRef, ctx, onDone, hudRef) {
  const [state, setState] = useState("loading");    // loading | ready | off
  const pullRef = useRef(() => {});
  const viewRef = useRef(null);
  /* ⚠️⚠️ ABANDONNER DOIT COURT-CIRCUITER LE `finish` DU DÉMONTAGE, SINON LA
     MANCHE PART DEUX FOIS. Le bouton « laisser tomber » appelle `onDone`, le
     parent démonte la scène, et le nettoyage de l'effet rappelle `onDone` avec
     le journal : deux `req` pour un seul geste, dont une que l'hôte accepterait.
     C'est le genre de doublon qui ne se voit pas en jouant seul et qui compte
     double sur le quota (§3). */
  const bailRef = useRef(() => {});
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let dead = false, raf = 0, renderer = null, shop = null;
    const cv = canvasRef.current;
    const off = [];
    const on = (target, ev, fn, o) => { target.addEventListener(ev, fn, o); off.push(() => target.removeEventListener(ev, fn, o)); };

    /* ── LA MANCHE. Elle démarre AVANT la 3D et elle survit à son absence :
       c'est ce qui fait du repli un vrai repli et pas un écran d'erreur. ── */
    const sim = S.sawInit(ctx);
    const log = [];
    let acc = 0, last = performance.now(), sent = false;

    const finish = () => {
      if (sent) return;
      sent = true;
      /* ⚠️ ON ENVOIE LE JOURNAL, JAMAIS LE RÉSULTAT. L'hôte rejoue (`sawRun`) et
         tranche lui-même : le client n'annonce pas « j'ai gagné ». C'est la même
         règle que la transcription de l'audience, et c'est le §3. */
      doneRef.current && doneRef.current(log, sim.over);
    };
    const pull = () => {
      if (sim.over) return "dead";
      /* ⚠️⚠️⚠️ DEUX TRAITS DANS LE MÊME PAS DE SIMULATION SONT REFUSÉS, ET CE
         N'EST PAS UNE COMMODITÉ : le journal envoyé à l'hôte est NORMALISÉ
         (strictement croissant), donc un second appui à l'intérieur du même pas
         de 8 ms serait joué chez nous et IGNORÉ au rejeu. Le client et l'hôte
         verraient alors deux manches différentes — une victoire à l'écran
         refusée par le réseau, sans que rien ne l'explique. Aucun doigt humain
         ne fait deux appuis en huit millisecondes ; un rebond de touche, si. */
      if (log.length && log[log.length - 1] === sim.tick) return "dead";
      const v = S.sawPull(sim, 1);
      /* ⚠️ ON NE NOTE QUE CE QUI A COMPTÉ POUR L'ARBITRE. Un appui refusé
         (`dead` : pendant l'arrêt, ou après la fin) ne change rien à la
         simulation ; l'inscrire ferait diverger le rejeu de l'hôte du nôtre. */
        if (v !== "dead") log.push(sim.tick);
      return v;
    };
    pullRef.current = pull;
    bailRef.current = () => { sent = true; doneRef.current && doneRef.current(null, "quit"); };

    /* ── LE PAS FIXE. ⚠️ LE RATTRAPAGE EST BORNÉ : un onglet mis en arrière-plan
       revient avec plusieurs secondes de retard, et rattraper mille pas d'un coup
       ferait défiler la manche entière sans que le joueur puisse tirer. On perd
       le temps en trop — c'est un jeu, pas une comptabilité.
       ⚠️⚠️ EN REVANCHE LA FIN DE LA MANCHE N'EST PAS ICI : elle est dans
       `sawTick` (`SAW_MAX_TICKS`), donc le client et l'hôte s'arrêtent au même
       pas par construction. Une borne posée ici serait une SECONDE description
       de la même limite, chez l'une des deux parties du réseau seulement — ce
       qui a déjà coûté une divergence, mesurée par le banc. ── */
    const MAXCATCH = C.SAW_HZ * 0.5;
    const step = (now) => {
      acc += Math.min(1.0, (now - last) / 1000);
      last = now;
      let n = 0;
      while (acc >= C.SAW_DT && n < MAXCATCH) { S.sawTick(sim); acc -= C.SAW_DT; n++; }
      if (n >= MAXCATCH) acc = 0;
      if (sim.over) finish();
      return (now - last) / 1000;
    };

    /* ── LE PONT VERS L'INTERFACE. Un objet réécrit en place, lu par un
       `useState` lent : zéro allocation par image, et un seul endroit qui sache
       ce que le HUD a le droit de connaître. ── */
    const pushHud = () => {
      hudRef.current = {
        plank: sim.plank, planks: sim.planks, cut: sim.cut,
        stress: sim.stress, broken: sim.broken, combo: sim.combo,
        would: S.sawWould(sim), last: sim.last, lastAt: sim.lastAt, tick: sim.tick,
        bx: sim.bx, stam: sim.stam, tempo: sim.tempo, hold: sim.hold, holdKind: sim.holdKind,
        over: sim.over,
      };
    };
    pushHud();

    (async () => {
      let THREE = null;
      try {
        for (const src of SCRIPTS) await loadScript(src);
        if (dead) return;
        THREE = window.THREE;
        if (!THREE || !cv) throw new Error("three absent");

        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "high-performance" });
        /* ⚠️ LE RAPPORT DE PIXELS EST BORNÉ (même raison que chez le maire) : une
           tablette à 3× rend neuf fois plus de pixels qu'à 1×, et c'est le
           meilleur moyen de faire tomber le contexte au milieu d'une manche —
           sur la machine même où l'on vient de mesurer que le contexte est déjà
           chiche (1 829 canevas 2D retenus au chargement). */
        renderer.setPixelRatio(Math.min(window.innerWidth < 900 ? 1.5 : 2, window.devicePixelRatio || 1));
        renderer.outputEncoding = THREE.sRGBEncoding;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x140f0a);
        /* ⚠️ LE BROUILLARD EST CE QUI DONNE SA PROFONDEUR AU HANGAR : sans lui,
           le mur du fond est aussi net que le madrier et l'atelier devient une
           boîte. Il est très court exprès (4 → 13 m), parce que la pièce fait
           9 m — un brouillard réglé sur des distances de paysage ne ferait rien. */
        scene.fog = new THREE.Fog(0x1a130c, 4.0, 13.0);
        shop = A.buildShop(THREE, {});
        scene.add(shop.root);

        const cam = new THREE.PerspectiveCamera(47, 16 / 9, 0.04, 40);
        const look = new THREE.Vector3();
        /* le regard libre : deux angles ajoutés au cadrage dérivé, jamais une
           caméra à nous — sinon on perdrait la surge qui fait tout l'effort */
        const free = { yaw: 0, pitch: 0 };
        let view = "poste";

        let drag = null;
        const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); };
        const onMove = (e) => {
          if (!drag) return;
          const k = 2.2 / Math.max(600, cv.clientWidth);
          drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
          free.yaw = Math.max(-0.85, Math.min(0.85, free.yaw - (e.clientX - drag.x) * k));
          free.pitch = Math.max(-0.55, Math.min(0.55, free.pitch - (e.clientY - drag.y) * k));
          drag = { ...drag, x: e.clientX, y: e.clientY };
        };
        /* ⚠️⚠️ UN CLIC QUI N'A PAS GLISSÉ EST UN TRAIT DE SCIE. C'est la
           condition pour que la scène soit jouable AU DOIGT sur tablette — le
           §13 de `CLAUDE.md` rappelle que le tactile est l'angle mort du projet.
           Le seuil de glissement évite qu'un regard à la souris tire un trait
           mou au moment où l'on relâche. */
        const onUp = () => { if (drag && drag.moved < 9) pullRef.current(); drag = null; };
        on(cv, "pointerdown", onDown);
        on(window, "pointermove", onMove);
        on(window, "pointerup", onUp);
        on(window, "pointercancel", () => { drag = null; });

        const resize = () => {
          const w = cv.clientWidth || 960, h = cv.clientHeight || 540;
          renderer.setSize(w, h, false);
          cam.aspect = w / h; cam.updateProjectionMatrix();
        };
        resize();
        on(window, "resize", resize);

        let t0 = performance.now(), t = 0;
        const tick = (now) => {
          if (dead) return;
          const dt = Math.min(0.05, (now - t0) / 1000); t0 = now; t += dt;
          step(now);
          const out = A.applySaw(shop, sim, t, dt);
          pushHud();

          /* ⚠️ NOS BRAS N'EXISTENT QU'AU POSTE : deux avant-bras flottants vus
             depuis le fond de l'atelier seraient pires que rien (mesuré — ils se
             posaient sur les chevalets). */
          shop.hands.us.visible = view === "poste";
          const V = view === "poste" ? out.cam : A.VIEWS[view];
          cam.position.set(V.pos[0], V.pos[1], V.pos[2]);
          look.set(V.look[0], V.look[1], V.look[2]);
          cam.lookAt(look);
          /* le regard libre s'AJOUTE au cadrage : on tourne la tête, on ne
             déménage pas la caméra */
          cam.rotateY(free.yaw); cam.rotateX(free.pitch);

          renderer.render(scene, cam);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        viewRef.current = (k) => { view = k; free.yaw = 0; free.pitch = 0; };
        setState("ready");
      } catch (err) {
        console.warn("[scierie] atelier 3D indisponible, repli sur la piste plate :", err && err.message);
        if (dead) return;
        setState("off");
        /* ⚠️⚠️ LE REPLI FAIT TOURNER LA MÊME MANCHE. Il ne dessine rien : il
           avance la simulation et pousse le HUD, qui suffit à jouer (la piste
           plate du §repli lit `bx` et `would` comme la 3D lit `bx`). Une manche
           qui refuserait de se jouer parce qu'une carte graphique n'a pas plu
           bloquerait le chantier naval entier. */
        const flat = (now) => {
          if (dead) return;
          step(now); pushHud();
          raf = requestAnimationFrame(flat);
        };
        raf = requestAnimationFrame(flat);
      }
    })();

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      for (const f of off) { try { f(); } catch (e) { /* déjà retiré */ } }
      off.length = 0;
      if (shop) shop.dispose();
      if (renderer) {
        try { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) { /* déjà perdu */ }
      }
      /* ╔═══════════════════════════════════════════════════════════════════
         ║ ⚠️⚠️⚠️ LE NETTOYAGE NE RAPPORTE RIEN, ET C'EST UN PIÈGE REACT PAYÉ EN
         ║ JOUANT.
         ╚═══════════════════════════════════════════════════════════════════
         Le premier jet appelait `finish()` ici, pour « remonter le journal même
         si le joueur ferme en cours de route ». En développement, React 18 monte
         l'effet, le NETTOIE, puis le remonte : la scène se fermait donc toute
         seule dans la milliseconde, sans une ligne d'erreur, sans rien dans la
         console, et le bouton du menu avait l'air de ne rien faire.
         ⚠️ Et ce n'était pas qu'un artefact de développement : n'importe quel
         remontage aurait annulé une manche en cours.
         ⚠️ IL N'Y A DE TOUTE FAÇON RIEN À REMONTER : une manche non finie ne
         donne aucune commande (l'hôte la refuserait), et rien n'a été prélevé.
         La manche se termine par la mécanique (`sim.over`) ou par le bouton
         d'abandon — deux sorties, toutes deux explicites.
         *Un effet dont le nettoyage a un effet de bord visible est un effet qui
         se déclenchera au démontage qu'on n'avait pas prévu.* */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef, hudRef]);

  return { state, pullRef, viewRef, bailRef };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA PISTE — CE QUI APPREND LE GESTE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ ELLE N'EST PAS UN COMPTEUR, C'EST UNE LEÇON. Le joueur doit pouvoir
   APPRENDRE où se trouve la fenêtre, sinon le jeu est un tirage : la piste montre
   donc la lame sur sa course et allume la zone en vert quand un trait serait
   parfait, en ambre quand il serait bon, en rouge quand il coincerait.
   ⚠️⚠️⚠️ ET ELLE LIT `sawWould`, C'EST-À-DIRE LA FONCTION QUI JUGE. Réécrire les
   trois conditions ici aurait donné deux réponses à la même question — le défaut
   du 449, où le bandeau et le chevron répondaient chacun de leur côté, tous les
   deux au vert, et personne ne les avait jamais comparés.
   ═══════════════════════════════════════════════════════════════════════════ */
function Track({ hud, L }) {
  const w = hud.would;
  const pos = ((hud.bx + 1) / 2) * 100;
  const cls = w === "perfect" ? "ok" : w === "good" ? "mid" : w === "bind" ? "bad" : "";
  return (
    <div className={"saw-track " + cls}>
      <span className="saw-end left">{L.saw.himSide}</span>
      <span className="saw-end right">{L.saw.usSide}</span>
      {/* la zone où le trait est bon : elle est dessinée à partir des mêmes
          constantes que le verdict, jamais d'un pourcentage écrit à la main */}
      <i className="saw-zone good" style={{ left: 0, width: `${(1 - C.SAW_GOOD_X) * 50}%` }} />
      <i className="saw-zone best" style={{ left: 0, width: `${(1 - C.SAW_PERFECT_X) * 50}%` }} />
      <i className="saw-blade" style={{ left: `${pos}%` }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA SCÈNE
   ═══════════════════════════════════════════════════════════════════════════ */
export function SawScene({ ctx, L, onDone }) {
  const canvasRef = useRef(null);
  const hudRef = useRef({ plank: 0, planks: C.SAW_PLANKS, cut: 0, stress: 0, broken: 0, combo: 0, would: "dead", last: "", lastAt: -999, tick: 0, bx: 0, stam: 1, tempo: 1, hold: 0, holdKind: "", over: "" });
  const [hud, setHud] = useState(hudRef.current);
  const [fade, setFade] = useState(1);
  const [cam, setCam] = useState("poste");
  const { state, pullRef, viewRef, bailRef } = useSaw(canvasRef, ctx, onDone, hudRef);

  /* ⚠️ L'INTERFACE SE RAFRAÎCHIT À SA PROPRE CADENCE, PAS À CELLE DE LA
     SIMULATION : quinze fois par seconde suffisent largement à lire un compteur,
     et cent vingt rendus d'arbre React par seconde, c'est le jeu entier qui
     rame — y compris la scène qu'on est venu regarder. */
  useEffect(() => {
    const id = setInterval(() => setHud({ ...hudRef.current }), 66);
    return () => clearInterval(id);
  }, [hudRef]);

  /* ⚠️ LE FONDU S'OUVRE MÊME SI LA 3D NE VIENT JAMAIS (leçon de l'audience) :
     attendre `ready` ferait de « pas de WebGL » un écran noir permanent. */
  useEffect(() => {
    if (state === "ready" || state === "off") { const t = setTimeout(() => setFade(0), 60); return () => clearTimeout(t); }
    const t = setTimeout(() => setFade(0), 800);
    return () => clearTimeout(t);
  }, [state]);

  /* ── LE CLAVIER. Espace tire, Échap abandonne. ⚠️ `preventDefault` SEULEMENT
     SUR CE QU'ON UTILISE : un `preventDefault` général mangerait la tabulation
     et les raccourcis du navigateur pendant une manche d'une minute. ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); if (!e.repeat) pullRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pullRef]);

  const pick = (k) => { setCam(k); viewRef.current && viewRef.current(k); };
  const fresh = hud.tick - hud.lastAt < C.SAW_HZ * 0.45 ? hud.last : "";
  const verdict = fresh && L.saw.verdict[fresh] ? L.saw.verdict[fresh] : "";
  const stress = Math.max(0, Math.min(1, hud.stress));

  return (
    <div className="saw-stage">
      <canvas ref={canvasRef} className="saw-canvas" />

      {/* ── LE REPLI. ⚠️ UNE PISTE, PAS UN MESSAGE D'ERREUR : la manche se joue
          entière sans une seule image de l'atelier, et le joueur n'apprend pas
          le nom de nos problèmes. ── */}
      {state === "off" && (
        <div className="saw-flat">
          <div className="saw-flat-beam"><i style={{ width: `${Math.min(100, hud.cut * 100)}%` }} /></div>
          <div className="saw-flat-hint">{L.saw.flat}</div>
        </div>
      )}

      {/* ── LE BANDEAU DU HAUT : où en est la commande, et rien d'autre. ── */}
      <div className="saw-top">
        <b>{ctx.title}</b>
        <span>{L.saw.planks(hud.plank, hud.planks)}</span>
        {hud.broken > 0 && <span className="saw-broken">{L.saw.broken(hud.broken, C.SAW_BREAK_MAX)}</span>}
      </div>

      {/* ── LA PHRASE D'OUVERTURE. ⚠️ ELLE S'EFFACE TOUTE SEULE ET ELLE NE
          BLOQUE RIEN : une scène qui commence par un dialogue à congédier ajoute
          un clic entre le joueur et le geste qu'on lui promet. Elle nomme
          Tristan (elle vient du vivier, jamais d'un `rid` recopié — règle du
          431) parce que « quelqu'un te tend la poignée » n'est pas une scène. ── */}
      {hud.tick < C.SAW_HZ * 4.5 && ctx.name && (
        <div className="saw-intro">{L.saw.him(ctx.name)}</div>
      )}

      <div className="maire-cams">
        {A.VIEW_KEYS.map((k) => (
          <button key={k} className={"maire-cam" + (cam === k ? " on" : "")} onClick={() => pick(k)}>
            {L.saw.view[k]}
          </button>
        ))}
      </div>
      <div className="maire-camhint">{L.saw.camHint}</div>

      {/* ── LE VERDICT. ⚠️ IL EST AU CENTRE ET IL S'EFFACE SEUL : un verdict
          qu'il faut chercher dans un coin n'apprend rien, et un verdict qui
          reste affiché ment sur le trait suivant. ── */}
      {verdict && <div className={"saw-verdict v-" + fresh} key={hud.lastAt}>{verdict}</div>}
      {hud.combo >= 3 && <div className="saw-combo">{L.saw.combo(hud.combo)}</div>}

      {/* ── LE PIED : la contrainte de la planche, la piste, le bouton. ── */}
      <div className="saw-foot">
        <div className="saw-stress" title={L.saw.stress}>
          <i style={{ width: `${stress * 100}%`, background: stress > 0.7 ? "#d9564a" : stress > 0.4 ? "#d99a4a" : "#7f9a58" }} />
        </div>
        <Track hud={hud} L={L} />
        {/* ⚠️ LE BOUTON EXISTE POUR LE TACTILE ET IL EST GRAND. Le canevas entier
            est déjà cliquable (voir `onUp`), mais un doigt qui glisse d'un
            millimètre fait tourner la caméra au lieu de tirer : une cible franche
            règle le problème sans enlever l'autre chemin. */}
        <button className="saw-pull" onPointerDown={(e) => { e.preventDefault(); pullRef.current(); }}>
          {L.saw.pull}
        </button>
        <div className="saw-hint">{L.saw.hint}</div>
      </div>

      <button className="saw-quit" onClick={() => bailRef.current()}>{L.saw.quit}</button>

      <div className="saw-fade" style={{ opacity: fade }} />
    </div>
  );
}
