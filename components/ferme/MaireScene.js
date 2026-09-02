"use client";
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 481 — L'AUDIENCE : UNE SCÈNE PLEIN ÉCRAN, À LA PREMIÈRE PERSONNE.
   ═══════════════════════════════════════════════════════════════════════════
   Trois demandes de Guillaume, et elles ne se séparent pas :
     · « la scène 3D ne doit pas être un simple overlay mais une vraie scène en
       plein écran dans le bureau » ;
     · « ce sera un 1st person cet entretien » ;
     · « en multi si un joueur entre dans la négo, les autres joueurs doivent
       avoir un bouton "voir la scène de (autre joueur)" ».

   ⚠️⚠️ CE FICHIER EST UNE VUE, ET RIEN D'AUTRE. Toute la négociation vit dans
   `maire.js` — table, jauge, fuite, humeur, arbitrage — et `verify-maire.mjs`
   en joue des centaines sans jamais ouvrir un canevas. Le décor vit dans
   `maireBureau.js`, qui ne connaît ni React ni la quête. C'est ce découpage qui
   fait qu'un échec du rendu 3D ne coûte pas la mécanique, et qu'un réglage de
   bras ne demande pas de relire une négociation.

   ⚠️⚠️⚠️ ET IL Y A TOUJOURS UN REPLI. La 3D peut manquer pour deux raisons sans
   rapport : pas de WebGL, ou un script vendorisé qui ne répond pas. Dans les
   deux cas l'audience DOIT rester jouable — un dialogue qui refuse de s'ouvrir
   parce qu'une carte graphique n'a pas plu bloquerait la quête entière. Le décor
   se charge en tâche de fond, il s'installe quand il est prêt, il ne retient
   jamais l'interface. ⚠️ Le repli est un fond peint, pas un écran d'erreur : le
   joueur ne doit pas apprendre le nom de nos problèmes.

   ⚠️⚠️ LE CONTEXTE WEBGL SE REND À LA FERMETURE, ET LES TEXTURES AVEC. Un
   navigateur n'accorde qu'une poignée de contextes ; sans `dispose()`, la
   quatrième audience d'une session s'ouvre sur du noir et rien ne dit pourquoi.
   Mesuré ailleurs cette même passe : `fermeArt` retient 1 829 canevas 2D au
   chargement, et c'est très probablement ce qui ferme l'onglet des tablettes.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from "react";
import * as C from "./fermeConstants";
import * as MR from "./maire";
import * as Q from "./quete";
import * as B from "./maireBureau";

/* ═══════════════════════════════════════════════════════════════════════════
   LE CONTEXTE DE L'AUDIENCE — LA MÊME FONCTION DES DEUX CÔTÉS DU RÉSEAU
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ ELLE EST ICI, EXPORTÉE, ET APPELÉE PAR LE CLIENT **ET** PAR L'HÔTE.
   C'est le seul arrangement qui rende la rejouabilité possible : si le client
   composait son contexte et l'envoyait, il choisirait son maire, sa confiance,
   son humeur et son jour d'audience — c'est-à-dire qu'il gagnerait sans jouer.
   Et si chacun écrivait sa propre version, les deux tomberaient d'accord par
   HASARD jusqu'au jour où l'une des deux changerait. Une seule fonction, deux
   appelants : l'accord est une propriété du code, pas une coïncidence.
   ⚠️ ZIP 481 — L'HUMEUR VIENT DU RENDEZ-VOUS, ET LE RENDEZ-VOUS EST UN ÉTAT
   ARBITRÉ (`resolveMayorAsk`, côté hôte). C'est le premier champ de ce contexte
   qui ne se DÉDUISE pas du jour partagé, et il fallait bien : une humeur
   re-tirée à l'ouverture de la scène serait tirée par le client, et la
   secrétaire aurait annoncé autre chose que ce qu'on trouve en montant.
   ⚠️ `E` est passé plutôt qu'importé pour ne pas tirer `fermeEngine` (11 000
   lignes) dans un fichier de vue. */
export function mayorCtxOf(shared, star, E) {
  const day = (shared && shared.day) || 1;
  const e = star || {};
  const appt = MR.mayorAppt(e);
  return {
    mayorKey: (E.mayorOf(day) || {}).key || "vasseur",
    day,
    nextElection: E.mayorNextElection(day),
    /* ⚠️ LE JOUR D'AUDIENCE EST UN BONUS, PAS UNE PORTE : ce jour-là il est
       préparé, il décroche moins vite, et la secrétaire a une chance de plus de
       le trouver de bonne humeur. Une date qui ne change rien est une date qui
       ment. */
    audience: E.mayorAudienceDay(day) === day,
    mood: (appt && appt.mood) || "mid",
    plans: Q.starPlanReady(e),
    trust: MR.mayorTrust(e),
    burnt: MR.mayorBurnt(e),
  };
}

/* ── la longueur du texte affiché décide de la grâce de lecture (jamais un
   nombre réglé à la main : le français gonfle de 15 à 20 % sur l'anglais) ── */
const lenOf = (...xs) => xs.reduce((n, x) => n + (typeof x === "string" ? x.length : 0), 0);

/* HORS-ZIP — SÉPARER LA DIDASCALIE DE LA RÉPLIQUE, DANS LA MÊME BULLE.
   Signalé par Guillaume en regardant la scène : « styles différents entre ce
   que dit effectivement le maire et les didascalies / descriptions de son
   comportement ». Les deux vivent dans LA MÊME chaîne, écrite à la main dans
   `fermeStrings.js` (`maire.ask`, `maire.tint`) : « Il ne lève pas les yeux
   tout de suite. […] « Vous êtes le fermier du nord. […] » » — de la
   narration à la troisième personne, puis la réplique entre guillemets — et
   la bulle les affichait d'un seul bloc, dans la même graisse, la même
   couleur : rien ne disait au lecteur qu'il changeait de registre au milieu
   de la phrase.
   ⚠️ ON NE RÉÉCRIT AUCUN TEXTE. Les deux registres existent déjà, marqués par
   la ponctuation que `fermeStrings.js` porte depuis toujours (« » en
   français, `"…"` en anglais) — il manquait seulement de leur donner deux
   styles au rendu, exactement comme `.maire-bubble-tint` le fait déjà pour la
   phrase du maire élu. Un texte qu'on ne peut pas changer dans les deux
   langues à la fois (§ CLAUDE.md) se corrige au rendu, pas dans la donnée.
   ⚠️ PURE, ZÉRO ÉTAT : un simple découpage par expression régulière, appelé à
   chaque rendu de bulle — rien à mémoriser, rien à invalider. */
function mayorLineParts(str) {
  if (typeof str !== "string" || !str) return [];
  const re = /«[^»]*»|"[^"]*"/g;
  const out = [];
  let last = 0, m;
  while ((m = re.exec(str))) {
    if (m.index > last) {
      const stage = str.slice(last, m.index).trim();
      if (stage) out.push({ k: "stage", t: stage });
    }
    out.push({ k: "say", t: m[0] });
    last = re.lastIndex;
  }
  if (last < str.length) {
    const rest = str.slice(last).trim();
    if (rest) out.push({ k: last === 0 ? "say" : "stage", t: rest });
  }
  return out;
}
function MayorLine({ text }) {
  const parts = mayorLineParts(text);
  return parts.map((p, i) => (
    <span key={i} className={p.k === "stage" ? "maire-line-stage" : "maire-line-say"}>
      {(i > 0 ? " " : "") + p.t}
    </span>
  ));
}

/* ⚠️ L'ORDRE DES TROIS RÉPONSES EST TIRÉ, ET IL LE FAUT : à position fixe, on
   apprend en deux entretiens que l'idéale est la première et on cesse de lire.
   ⚠️ Le tirage n'a AUCUN effet sur l'arbitrage — la transcription porte des
   CLÉS, pas des rangs — donc l'hôte rejoue le même entretien quel que soit
   l'ordre qu'a vu le client.
   ⚠️⚠️ ET LES DEUX GESTES N'ENTRENT PAS DANS LE TIRAGE : poser les plans, dire
   qu'on s'est compris et claquer la porte sont des DÉCISIONS, pas des répliques.
   Mêlées aux trois autres, elles se cliqueraient par accident au moment exact où
   il ne faut pas — et l'une des trois coûte un quart d'heure réel. */
function shuffled(list, seed) {
  const a = list.slice();
  let r = (seed | 0) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    r = (r * 1103515245 + 12345) & 0x7fffffff;
    const j = r % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const SCRIPTS = ["/vendor/three-r128/three.min.js"];
function loadScript(src) {
  return new Promise((res, rej) => {
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
   LE BUREAU — LA BOUCLE DE RENDU, ET ELLE NE DÉCLARE RIEN
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ TOUT CE QU'ELLE APPELLE VIT DANS `maireBureau.js`, AU NIVEAU DU MODULE.
   C'est le piège n°1 de `CLAUDE.md` traité à la source : une fonction déclarée
   ici et appelée d'ailleurs lèverait un `ReferenceError` que ni le build ni le
   lint ne verraient, et l'exception emporterait tout ce que l'image devait
   encore dessiner. Ici la boucle est une SUITE D'APPELS ; il n'y a rien à
   exposer, donc rien à recopier, donc rien qui puisse diverger.

   ⚠️ `viewRef` EST UN REF, PAS UN ÉTAT REACT. Une pose qui passerait par
   `useState` re-rendrait tout l'arbre soixante fois par seconde pendant qu'il
   parle. Le contrat est : React décide QUOI, le ref transporte, la boucle
   dessine QUAND.
   ═══════════════════════════════════════════════════════════════════════════ */
function useBureau(canvasRef, viewRef, bubbleRef, opts) {
  const [state, setState] = useState("loading");     // loading | ready | off
  const apiRef = useRef(null);
  const optRef = useRef(opts);
  optRef.current = opts;

  useEffect(() => {
    let dead = false, raf = 0, renderer = null, office = null;
    const cv = canvasRef.current;
    /* ⚠️⚠️ LES ÉCOUTEURS SE RANGENT ICI, PAS DANS LA FONCTION `async`. Le
       nettoyage d'un effet React est le `return` de l'effet — une fonction
       `async` ne rend pas une fonction, elle rend une PROMESSE, et tout ce
       qu'elle « retournerait » est perdu en silence. Un `resize` et un `keydown`
       laissés sur `window` après trois audiences, ce sont trois boucles mortes
       qui continuent d'écrire dans des objets libérés. */
    const off = [];
    const on = (target, ev, fn, o) => { target.addEventListener(ev, fn, o); off.push(() => target.removeEventListener(ev, fn, o)); };

    (async () => {
      try {
        for (const src of SCRIPTS) await loadScript(src);
        if (dead || !cv) return;
        const THREE = window.THREE;
        if (!THREE) throw new Error("three absent");

        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false, powerPreference: "high-performance" });
        /* ⚠️ LE RAPPORT DE PIXELS EST BORNÉ À 2, ET SUR PETIT ÉCRAN À 1,5. Une
           tablette à 3× rend neuf fois plus de pixels qu'à 1×, pour une scène
           qu'on regarde à trente centimètres : c'est le meilleur moyen de faire
           tomber le contexte WebGL au milieu d'une audience. */
        const dpr = Math.min(window.innerWidth < 900 ? 1.5 : 2, window.devicePixelRatio || 1);
        renderer.setPixelRatio(dpr);
        renderer.outputEncoding = THREE.sRGBEncoding;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0d0f13);
        office = B.buildOffice(THREE, optRef.current || {});
        scene.add(office.root);

        /* ⚠️ 45°, PAS 52 : au ras d'un plateau de bureau, dix degrés de plus étirent le
           meuble sur toute la largeur de l'image et le maire recule d'un mètre. Un
           champ large est une focale de reportage ; une audience est un portrait. */
        const cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.04, 40);
        /* ── LA CAMÉRA EST NOS YEUX : une position, un lacet, un tangage. Pas
           d'orbite, pas de cible — une orbite autour du maire n'est pas une
           première personne, c'est un plan de cinéma, et ça se voit tout de
           suite parce que la tête ne peut pas se pencher sur le côté. ── */
        const eye = { pos: new THREE.Vector3(), yaw: 0, pitch: 0 };
        const tmp = new THREE.Vector3();
        const setView = (key) => {
          const v = B.VIEWS[key] || B.VIEWS.seat;
          eye.pos.set(v.pos[0], v.pos[1], v.pos[2]);
          const d = tmp.set(v.look[0] - v.pos[0], v.look[1] - v.pos[1], v.look[2] - v.pos[2]);
          eye.yaw = Math.atan2(d.x, d.z);
          eye.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
        };
        setView("seat");

        const keys = Object.create(null);
        const onKey = (e) => {
          /* ⚠️ ON N'INTERCEPTE QUE CE QU'ON UTILISE. Un `preventDefault` général
             mangerait la tabulation et les raccourcis du navigateur pendant une
             scène qui dure trois minutes. */
          const k = e.code;
          if (["KeyW", "KeyA", "KeyS", "KeyD", "KeyZ", "KeyQ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyE", "KeyC"].includes(k)) {
            keys[k] = e.type === "keydown";
            if (e.type === "keydown") e.preventDefault();
          }
        };
        on(window, "keydown", onKey);
        on(window, "keyup", onKey);

        let drag = null;
        const onDown = (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture && cv.setPointerCapture(e.pointerId); };
        const onMove = (e) => {
          if (!drag) return;
          /* ⚠️ LA SENSIBILITÉ EST RAPPORTÉE À LA LARGEUR DE L'ÉCRAN : réglée en
             pixels, la même scène tourne deux fois plus vite sur un écran deux
             fois plus large, et le réglage fait sur le portable est faux sur la
             tablette. */
          const k = 2.4 / Math.max(600, cv.clientWidth);
          eye.yaw -= (e.clientX - drag.x) * k;
          eye.pitch = Math.max(-1.05, Math.min(0.95, eye.pitch - (e.clientY - drag.y) * k));
          drag = { x: e.clientX, y: e.clientY };
        };
        const onUp = () => { drag = null; };
        const onWheel = (e) => {
          const s = Math.max(-1, Math.min(1, e.deltaY)) * -0.16;
          eye.pos.x += Math.sin(eye.yaw) * Math.cos(eye.pitch) * s;
          eye.pos.z += Math.cos(eye.yaw) * Math.cos(eye.pitch) * s;
          eye.pos.y += Math.sin(eye.pitch) * s * 0.5;
          B.clampCam(eye.pos);
        };
        on(cv, "pointerdown", onDown);
        on(window, "pointermove", onMove);
        on(window, "pointerup", onUp);
        on(window, "pointercancel", onUp);
        on(cv, "wheel", onWheel, { passive: true });

        const resize = () => {
          const w = cv.clientWidth || 960, h = cv.clientHeight || 540;
          renderer.setSize(w, h, false);
          cam.aspect = w / h; cam.updateProjectionMatrix();
        };
        resize();
        on(window, "resize", resize);

        /* ⚠️ `poseState`, PAS `{ ...poseTarget }` : l'étalement recopie la
           RÉFÉRENCE de `hL`/`hR`, et `ease` écrit dedans — donc dans la table
           `POSE` elle-même, qui se corrompait à la première image. Le détail
           est en commentaire de `poseState` (2026-08-31). */
        const pose = B.poseState("closed");
        const face = { ...B.faceTarget("cold") };
        let t0 = performance.now(), t = 0, doorT = 0;

        const tick = (now) => {
          if (dead) return;
          const dt = Math.min(0.05, (now - t0) / 1000); t0 = now; t += dt;
          const V = viewRef.current || {};

          /* ── ON GLISSE VERS LA POSE ET VERS LE VISAGE, jamais on ne saute ── */
          B.ease(pose, B.poseTarget(V.pose), dt, 2.6);
          B.ease(face, B.faceTarget(V.emote), dt, 3.4);
          B.applyPose(office, pose, t);
          B.applyFace(office, face, t, V.talking ? B.talkEnvelope(t) : 0, B.blinkAt(t));
          office.bang.visible = !!V.bang;
          if (V.bang) office.bang.scale.setScalar(0.30 + Math.sin(t * 9) * 0.03);

          /* la porte qui claque : elle part grande ouverte et se referme d'un
             coup. ⚠️ C'EST LA SEULE ANIMATION DU DÉCOR, et elle n'existe que
             parce que Guillaume a demandé qu'on puisse la claquer — un décor qui
             bouge sans raison est du bruit. */
          doorT = V.bang ? Math.min(1, doorT + dt * 5.5) : Math.max(0, doorT - dt * 2.2);
          office.door.rotation.y = -Math.max(0, Math.sin(doorT * Math.PI)) * 1.15;
          office.lights.warm.intensity = 0.62 + Math.sin(t * 2.3) * 0.02;

          /* ── LA MARCHE, À LA PREMIÈRE PERSONNE ── */
          const fwd = (keys.KeyW || keys.KeyZ || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
          const side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.KeyQ || keys.ArrowLeft ? 1 : 0);
          if (fwd || side) {
            const sp = dt * 1.9;
            eye.pos.x += (Math.sin(eye.yaw) * fwd + Math.cos(eye.yaw) * side) * sp;
            eye.pos.z += (Math.cos(eye.yaw) * fwd - Math.sin(eye.yaw) * side) * sp;
            B.clampCam(eye.pos);
          }
          cam.position.copy(eye.pos);
          cam.rotation.set(0, 0, 0);
          cam.rotateY(eye.yaw + Math.PI);
          cam.rotateX(eye.pitch);
          /* ⚠️⚠️ LE SIGNE DU TANGAGE A ÉTÉ FAUX PENDANT UN ESSAI, ET C'EST UNE
             LEÇON EN SOI : « ma chaise » regarde cinq centimètres AU-DESSUS de
             l'horizontale, donc l'inversion n'y déplaçait l'image que d'un demi-
             degré et la vue paraissait juste. C'est « le bureau », qui pique de
             treize degrés vers le sous-main, qui a montré le plafond. *Un défaut
             de signe se cache dans la vue où la grandeur est presque nulle ; on
             le cherche dans celle où elle est grande.* */
          /* ⚠️ `rotateY(yaw + π)` PARCE QU'UNE CAMÉRA THREE.JS REGARDE VERS −Z ET
             QUE TOUT CE FICHIER RAISONNE EN +Z (le maire est en Z négatif, nous
             en Z positif). Écrire le repère du décor à l'envers pour faire
             plaisir à la caméra aurait retourné les cent cinquante positions de
             `maireBureau.js` ; le demi-tour se paie une fois, ici. */

          renderer.render(scene, cam);

          /* ── LA BULLE SUIT SA TÊTE, ET C'EST LA BOUCLE QUI LA POSE, PAS REACT.
             Un `setState` par image re-rendrait tout l'arbre soixante fois par
             seconde pendant qu'il parle. On écrit un `transform`, rien de plus.
             ⚠️ ELLE SE RABAT AU CENTRE QUAND IL EST HORS CHAMP : une bulle
             collée au bord de l'écran, ou pire, invisible, ferait croire que le
             jeu s'est arrêté de parler. ── */
          const bub = bubbleRef.current;
          if (bub) {
            office.mayor.head.updateMatrixWorld(true);
            const p = office._v.setFromMatrixPosition(office.mayor.head.matrixWorld);
            /* ⚠️ 0,40 ET PAS 0,30 : le « ! » de la porte claquée est posé à
               +0,30 au-dessus de sa tête, et la bulle ancrée à la même hauteur
               le recouvrait exactement — c'est-à-dire qu'on ne voyait jamais la
               seule chose que Guillaume a demandé de voir à ce moment-là. */
            p.y += 0.40;
            p.project(cam);
            const seen = p.z < 1 && Math.abs(p.x) < 0.98 && Math.abs(p.y) < 0.98;
            let px = seen ? (p.x * 0.5 + 0.5) * cv.clientWidth : cv.clientWidth * 0.5;
            let py = seen ? (-p.y * 0.5 + 0.5) * cv.clientHeight : cv.clientHeight * 0.30;
            /* ⚠️⚠️ LA BULLE SE RABAT DANS L'ÉCRAN, TOUJOURS. Ancrée au-dessus de
               sa tête et rien de plus, elle sortait par le HAUT dès qu'on
               s'approchait ou qu'on se penchait — c'est-à-dire qu'on perdait la
               question au moment exact où on regardait mieux. Elle est mesurée à
               l'image (`offsetWidth/Height`) plutôt que devinée : une largeur
               écrite en dur serait fausse dès qu'une réplique tient sur deux
               lignes, et fausse autrement dans l'autre langue. */
            const bw = bub.offsetWidth || 260, bh = bub.offsetHeight || 90;
            px = Math.max(bw / 2 + 12, Math.min(cv.clientWidth - bw / 2 - 12, px));
            py = Math.max(bh + 14, Math.min(cv.clientHeight - 150, py));
            bub.style.transform = `translate(-50%,-100%) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
            bub.dataset.off = seen ? "0" : "1";
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        apiRef.current = { setView, eye };
        setState("ready");

      } catch (err) {
        console.warn("[maire] scène 3D indisponible, repli sur le décor plat :", err && err.message);
        if (!dead) setState("off");
      }
    })();

    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      for (const f of off) { try { f(); } catch (e) { /* déjà retiré */ } }
      off.length = 0;
      if (office) office.dispose();
      if (renderer) {
        try { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) { /* déjà perdu */ }
      }
    };
  }, [canvasRef, viewRef, bubbleRef]);

  return { state, api: apiRef };
}

/* ═══════════════════════════════════════════════════════════════════════════
   LA COQUE PLEIN ÉCRAN, PARTAGÉE PAR LE JOUEUR ET PAR LE SPECTATEUR
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ UNE SEULE COQUE POUR LES DEUX, ET C'EST LA RÈGLE DU 444 : *une jointure,
   jamais deux listes*. Un écran de spectateur écrit à part aurait vieilli tout
   seul — il aurait gardé les postures du jour où il a été écrit pendant que
   celles du joueur avançaient, et personne n'aurait pu le voir sans jouer à deux
   (ce que ce dépôt n'a fait que trois fois en cinquante zips).
   ⚠️ LE FONDU EST ICI ET PAS DANS `FermeGame.js` : c'est la scène qui sait quand
   elle est prête. Demandé par Guillaume — « il y aura un fondu enchaîné qui
   ouvrira l'audience en 3D ».
   ═══════════════════════════════════════════════════════════════════════════ */
function Stage({ L, cand, view, opts, head, foot, bubble, onClose, closeLabel }) {
  const canvasRef = useRef(null);
  const bubbleRef = useRef(null);
  const [fade, setFade] = useState(1);          // 1 = noir plein, 0 = scène
  const { state, api } = useBureau(canvasRef, view, bubbleRef, opts);
  const [cam, setCam] = useState("seat");

  /* ⚠️ LE FONDU S'OUVRE MÊME SI LA 3D NE VIENT JAMAIS. Attendre `ready` pour
     lever le noir ferait de « pas de WebGL » un écran noir permanent, c'est-à-dire
     un blocage de quête sur une carte graphique. Il se lève sur le PREMIER des
     deux : la scène prête, ou huit dixièmes de seconde. */
  useEffect(() => {
    if (state === "ready" || state === "off") { const t = setTimeout(() => setFade(0), 60); return () => clearTimeout(t); }
    const t = setTimeout(() => setFade(0), 800);
    return () => clearTimeout(t);
  }, [state]);

  const pick = (k) => { setCam(k); api.current && api.current.setView(k); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "#0d0f13", overflow: "hidden", userSelect: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", cursor: "grab", touchAction: "none" }} />

      {/* LE REPLI. ⚠️ UN FOND PEINT, PAS UN MESSAGE D'ERREUR : le joueur n'a pas
          à apprendre le nom de nos problèmes, et l'audience se joue entière
          sans une seule image. */}
      {state === "off" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "radial-gradient(circle at 50% 34%, #2b2f3a, #12141a 70%)", fontSize: 92, opacity: 0.5 }}>
          {cand.emoji}
        </div>
      )}

      {/* ── LA BULLE. ⚠️ « BIEN LISIBLES ET PAS TROP CHARGÉES » (Guillaume) : un
          fond opaque, une seule taille de texte, une largeur bornée en `ch` pour
          que la ligne ne dépasse jamais ce qu'un œil lit d'un coup. Elle est
          POSÉE PAR LA BOUCLE, jamais par React (voir `useBureau`). ── */}
      <div ref={bubbleRef} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none",
                                    maxWidth: "min(46ch, 84vw)", transition: "opacity .25s" ,
                                    opacity: bubble ? 1 : 0 }}>
        {bubble && (
          <div className="maire-bubble">
            {bubble.tint && <div className="maire-bubble-tint"><MayorLine text={bubble.tint} /></div>}
            <div><MayorLine text={bubble.text} /></div>
            <span className="maire-bubble-tail" />
          </div>
        )}
      </div>

      {/* ── LE BANDEAU DU HAUT : qui, dans quelle humeur, à combien de jours du
          scrutin. Trois lignes, jamais plus — l'écran appartient à la scène. ── */}
      <div className="maire-top">
        <div className="maire-who"><b>{cand.emoji} {L.candName(cand.key)}</b></div>
        {head}
      </div>

      {/* ── LES TROIS ATTITUDES. ⚠️ ELLES NE SONT PAS DES PLANS DE CINÉMA : on est
          assis, on se penche, on se lève. La souris fait le reste, et le texte
          le dit une fois, en petit. ── */}
      <div className="maire-cams">
        {B.VIEW_KEYS.map(k => (
          <button key={k} className={"maire-cam" + (cam === k ? " on" : "")} onClick={() => pick(k)}>
            {k === "seat" ? L.maire.camSeat : k === "desk" ? L.maire.camDesk : L.maire.camWide}
          </button>
        ))}
        {onClose && <button className="maire-cam" onClick={onClose}>{closeLabel}</button>}
      </div>
      <div className="maire-camhint">{L.maire.camHint}</div>

      {foot}

      {/* LE FONDU ENCHAÎNÉ. ⚠️ `pointerEvents:none` À ZÉRO : un voile transparent
          qui reste devant l'écran mange tous les clics et ça ressemble trait pour
          trait à une interface gelée. */}
      <div style={{ position: "absolute", inset: 0, background: "#07080b", opacity: fade,
                    transition: "opacity .55s ease", pointerEvents: fade > 0.02 ? "auto" : "none" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   L'AUDIENCE — CE QUE JOUE CELUI QUI EST ASSIS
   ═══════════════════════════════════════════════════════════════════════════ */
export function MayorAudience({ ctx, L, onDone, onLive }) {
  const [s] = useState(() => MR.mayorOpen(ctx));
  const [, force] = useState(0);
  const [phase, setPhase] = useState("ask");        // ask (grâce) | live (la fuite court) | react | over
  const [react, setReact] = useState(null);
  const viewRef = useRef({ pose: "closed", emote: "cold", talking: true, bang: false });
  const liveAtRef = useRef(0);
  const sentRef = useRef(false);
  /* hors-zip — LA REPRISE : UN JETON, DÉPENSÉ SEULEMENT S'IL SERT. `s` n'est
     jamais touché tant que le joueur n'a pas confirmé qu'il GARDE sa réponse
     fautive — décliner l'offre ne consomme rien, exactement comme poser puis
     ranger les plans ne consomme personne question de plus. */
  const redoLeftRef = useRef(1);
  const [pendingFault, setPendingFault] = useState(null);

  const cand = C.TOWN_CANDIDATES.find(c => c.key === ctx.mayorKey) || C.TOWN_CANDIDATES[0];
  /* ⚠️⚠️ HORS-ZIP 2026-09-02 — TOUT LE TEXTE DE L'AUDIENCE PASSE PAR `LM`, PAS
     PAR `L.maire`. Trois maires sur cinq sont des femmes (Odile Vasseur,
     Séverine Bonnefoy, Ninon Delaunay, nommées depuis le 480) et parlaient au
     masculin. `L.maireFor` rend la table déclinée ; le sexe vient de
     `C.mayorIsFem`, l'unique endroit qui le sache.
     ⚠️ MÉMOÏSÉ SUR LA CLÉ : la fusion des deux tables est faite une fois par
     partie, pas soixante fois par seconde de rendu. */
  const LM = useMemo(() => L.maireFor(C.mayorIsFem(cand.key)), [L, cand.key]);
  const node = s.node;
  const choices = useMemo(() => MR.mayorChoices(s), [node, phase]);   // eslint-disable-line react-hooks/exhaustive-deps
  const says = useMemo(() => shuffled(choices.filter(c => c.kind === "say"),
                                      (MR.MAYOR_NODE_IDS.indexOf(node) + 1) * 7 + (ctx.day | 0)),
                       [choices, node, ctx.day]);
  /* ⚠️⚠️⚠️ MÉMOÏSÉ, ET CE N'EST PAS UNE OPTIMISATION : C'EST CE QUI FAIT QUE
     L'ENTRETIEN DÉMARRE. Écrit `choices.filter(...)` à même le rendu, ce tableau
     changeait d'IDENTITÉ à chaque image ; il est en dépendance de l'effet de
     grâce de lecture ; l'effet se ré-exécutait donc à chaque rendu, son
     `clearTimeout` annulait le minuteur, et le minuteur n'arrivait JAMAIS. Le
     symptôme, en jeu : « Il finit sa phrase » pour l'éternité, aucune réponse,
     aucune erreur nulle part.
     ⚠️ Et il fallait que le PARENT re-rende pour que ça se voie : sur la page
     d'essai isolée, personne ne re-rendait pendant la grâce et tout marchait.
     C'est pour ça que ce défaut n'apparaît qu'EN JEU, à côté d'un HUD qui bat la
     seconde. *Un tableau reconstruit à chaque rendu, en dépendance d'un effet à
     minuteur, est un minuteur qui n'arrive jamais.* */
  const gestures = useMemo(() => choices.filter(c => c.kind !== "say"), [choices]);
  const tint = node && LM.tint[node] ? LM.tint[node][ctx.mayorKey] : null;
  const ask = node ? LM.ask[node] : null;

  /* ⚠️⚠️ CE QUI PART SUR LE RÉSEAU, ET IL N'EN PART QU'À CHAQUE BATTEMENT. Le
     §3 de `CLAUDE.md` est formel : dix messages par seconde et par client, et
     seul le NOMBRE de `send()` compte. Diffuser l'image serait soixante messages
     par seconde — le plafond saute en silence et TOUT le reste du jeu tombe avec
     (positions, récoltes). Le spectateur reçoit donc un ÉTAT, pas un flux, et il
     rejoue les mêmes interpolations à partir des mêmes nombres : il voit très
     exactement la même scène. */
  const push = (extra) => {
    if (!onLive) return;
    const V = viewRef.current;
    onLive({ node: s.node || "", pose: V.pose, emote: V.emote, adh: Math.round(s.adh),
             over: s.over || "", talking: !!V.talking, mood: s.mood, ...(extra || {}) });
  };
  const pushRef = useRef(push); pushRef.current = push;

  /* la relance lente : sans elle, un joueur qui ouvre la fenêtre pendant qu'on
     LIT n'aurait rien à afficher jusqu'au battement suivant, c'est-à-dire un
     bureau vide et un maire figé pendant dix secondes. */
  useEffect(() => {
    if (!onLive) return;
    const t = setInterval(() => pushRef.current(), C.MAYOR_LIVE_KEEPALIVE_MS);
    return () => clearInterval(t);
  }, [onLive]);

  /* ⚠️⚠️ LA GRÂCE DE LECTURE EST DÉRIVÉE DU TEXTE RÉELLEMENT AFFICHÉ, dans la
     langue du joueur. Un nombre réglé à la main aurait fait payer au joueur
     anglophone les 15 à 20 % de gonflement du français, et à personne d'autre. */
  /* ⚠️ LE NOMBRE DE SIGNES EST UNE GRANDEUR, PAS UN TABLEAU : en dépendre par un
     NOMBRE plutôt que par les listes qui l'ont produit met l'effet à l'abri du
     défaut ci-dessus pour de bon, et pas seulement aujourd'hui. */
  const askChars = useMemo(() => lenOf(ask, tint, ...says.map(c => LM.say[c.k]),
      ...gestures.map(c => c.kind === "plans" ? LM.layPlans : c.kind === "settle" ? LM.settle : "")),
    [ask, tint, says, gestures, L]);

  useEffect(() => {
    if (phase !== "ask" || !node) return;
    const chars = askChars;
    viewRef.current.talking = true;
    viewRef.current.pose = MR.mayorPose(s, null);
    viewRef.current.emote = MR.mayorEmote(s, null);
    pushRef.current();
    const grace = MR.mayorReadMs(chars);
    /* ⚠️ IL PARLE PENDANT LES DEUX PREMIERS TIERS DE LA GRÂCE, PAS TOUT DU LONG.
       Une bouche qui s'arrête pile au moment où les boutons apparaissent dit au
       joueur « à toi » sans une ligne d'interface, et une bouche qui bouge encore
       pendant qu'on choisit fait bavard. */
    const mute = setTimeout(() => { viewRef.current.talking = false; pushRef.current(); }, grace * 0.7);
    const t = setTimeout(() => { liveAtRef.current = performance.now(); setPhase("live"); }, grace);
    return () => { clearTimeout(t); clearTimeout(mute); };
  }, [phase, node, askChars, s]);   // eslint-disable-line react-hooks/exhaustive-deps

  /* La fuite, en temps réel. ⚠️ Elle ne court QUE pendant `live` : jamais
     pendant qu'on lit, jamais pendant qu'il répond. */
  useEffect(() => {
    if (phase !== "live") return;
    let raf = 0, prev = performance.now();
    const tick = (now) => {
      const dt = now - prev; prev = now;
      MR.mayorAdvance(s, dt);
      viewRef.current.pose = MR.mayorPose(s, null);
      viewRef.current.emote = MR.mayorEmote(s, null);
      force(x => x + 1);
      if (s.over) { finish(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);   // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    if (sentRef.current) return;
    sentRef.current = true;
    setPhase("over");
    viewRef.current.pose = MR.mayorPose(s, null);
    viewRef.current.emote = MR.mayorEmote(s, null);
    viewRef.current.talking = false;
    viewRef.current.bang = s.over === "slam";
    pushRef.current();
    force(x => x + 1);
  }

  /* ⚠️⚠️ ON PEUT RÉPONDRE PENDANT LA GRÂCE, ET C'EST UNE DEMANDE DE GUILLAUME
     PRISE AU MOT : « la négo doit pas durer des plombes non plus ». La grâce du
     480 était une SERRURE — douze secondes de boutons absents à chaque nœud, soit
     deux minutes et demie d'attente forcée sur un entretien de douze battements,
     pour un joueur qui a fini de lire au bout de quatre.
     ⚠️ Ce qu'elle protège n'est pas perdu pour autant : elle n'a jamais servi à
     retarder le CLIC, elle sert à ce que la fuite ne commence pas avant qu'on ait
     eu le temps de lire. Elle continue de faire exactement ça. Répondre tôt ne
     coûte donc rien et ne rapporte rien — `dt` vaut zéro, et le battement du
     maire (`MAYOR_BEAT_MS`) s'écoule quand même, ce qui interdit toujours de
     marteler douze réponses tièdes jusqu'aux 75 (le trou bouché au 480).
     *Une grâce qui empêche de jouer n'est plus une grâce, c'est une attente.* */
  function answer(key) {
    if (phase !== "live" && phase !== "ask") return;
    /* ⚠️ hors-zip — LE GESTE (plans/settle/slam) N'EST JAMAIS UNE « RÉPONSE
       FAUTIVE » : seul `choices` porte un `grade`, et seule une réponse de
       la table (`kind==="say"`) peut valoir "fault". `chosen` est `undefined`
       pour les gestes, donc la garde ci-dessous ne les voit jamais. */
    const chosen = choices.find(c => c.k === key);
    if (chosen && chosen.grade === "fault" && redoLeftRef.current > 0) {
      setPendingFault(key);
      return;
    }
    commitAnswer(key);
  }
  function confirmRedo() {
    // La réponse n'a jamais été jouée : rien à défaire dans `s`, seul le jeton part.
    redoLeftRef.current -= 1;
    setPendingFault(null);
  }
  function declineRedo() {
    const key = pendingFault;
    setPendingFault(null);
    commitAnswer(key);
  }
  function commitAnswer(key) {
    const dt = phase === "ask" ? 0 : Math.max(0, performance.now() - liveAtRef.current);
    const r = MR.mayorPlay(s, key, dt);
    viewRef.current.pose = MR.mayorPose(s, r.grade);
    viewRef.current.emote = MR.mayorEmote(s, r.grade);
    /* ⚠️ LA PORTE CLAQUÉE NE PASSE PAS PAR LA RÉACTION : il n'a rien à répondre,
       on est déjà dans le couloir. Le « ! » et le battant qui rebondit sont toute
       la réponse, et ils tiennent le temps qu'il faut pour les voir. */
    if (r.grade === "slam") {
      viewRef.current.bang = true; viewRef.current.talking = false;
      setReact(null); setPhase("react"); pushRef.current();
      setTimeout(finish, C.MAYOR_SLAM_HOLD_MS);
      return;
    }
    const tell = key === "__plans" || key === "__settle" ? null : LM.tell[key];
    setReact({ tell, why: r.why, delta: r.delta, grade: r.grade });
    viewRef.current.talking = !!tell;
    pushRef.current({ said: key });
    if (s.over) { setPhase("react"); setTimeout(finish, 2600); return; }
    setPhase("react");
    /* ⚠️ IL PARLE, DONC RIEN NE FUIT. Le temps qu'il met à répondre est déjà
       compté par `MAYOR_BEAT_MS` à l'intérieur du résolveur : le compter une
       seconde fois ici serait le doublon du §8, et il se verrait à peine. */
    setTimeout(() => { viewRef.current.talking = false; setReact(null); setPhase("ask"); }, 2400);
  }

  const adh = Math.max(0, Math.min(C.MAYOR_ADH_MAX, s.adh));
  const winPct = (C.MAYOR_ADH_WIN / C.MAYOR_ADH_MAX) * 100;
  const grade = MR.mayorGrade(s);
  const streakOn = s.streak >= C.MAYOR_STREAK_HOLD;
  const bubble = phase === "over" ? { text: LM.end[grade] || LM.end.out }
               : phase === "react" && react && react.tell ? { text: react.tell }
               : ask ? { text: ask, tint } : null;

  return (
    <Stage
      L={L} cand={cand} view={viewRef}
      /* ⚠️ `mayorKey` DÉCIDE DU CORPS (hors-zip 2026-09-02) : `buildOffice` y lit
         la silhouette, la coiffure, la coupe du costume et le sexe. C'est la
         MÊME clé que la plaque et que les répliques `tint` — trois choses qui
         doivent parler du même élu (`verify-maire`, « les trois tables »). */
      opts={{ plateLabel: LM.title, mayorName: L.candName(cand.key), mayorKey: cand.key }}
      bubble={bubble}
      head={
        <>
          <div className="maire-sub">{LM.race(Math.max(0, ctx.nextElection - ctx.day))}</div>
          <div className={"maire-mood m-" + ctx.mood}>{LM.mood[ctx.mood]}</div>
        </>
      }
      foot={
        <div className="maire-foot">
          {/* LA JAUGE. ⚠️ Le repère de 75 est DESSINÉ : un seuil qu'on ne voit pas
              n'est pas un seuil, c'est une surprise. */}
          <div className="maire-gauge">
            <div className="fill" style={{ width: `${adh}%`,
              background: adh >= C.MAYOR_ADH_WIN ? "linear-gradient(90deg,#4c9a5b,#8ce09a)"
                        : adh >= 40 ? "linear-gradient(90deg,#a08a3a,#d8c26a)"
                        : "linear-gradient(90deg,#8a3f34,#c9705c)" }} />
            <div className="mark" style={{ left: `${winPct}%` }} />
          </div>
          <div className="maire-gaugerow">
            <span>{LM.gauge} {Math.round(adh)}</span>
            <span>{s.over ? "" : streakOn ? (s.streak >= C.MAYOR_STREAK_GAIN ? LM.streakGain : LM.streakHold)
                          : s.slipMs > 0 ? LM.slip : ""}</span>
          </div>

          {/* POURQUOI IL A RÉAGI COMME ÇA. ⚠️⚠️ « Toujours avoir une justification
              de la réaction du maire » (Guillaume). Les raisons viennent du
              RÉSOLVEUR, pas d'un `if` d'affichage : un modificateur ajouté au
              calcul et oublié ici n'existerait pas pour le joueur, ce qui est la
              définition d'une mécanique injuste. */}
          {phase === "react" && react && (
            <div className="maire-why">
              <b style={{ color: react.delta >= 0 ? "#8ce09a" : "#e08c7a" }}>
                {react.delta >= 0 ? "+" : ""}{react.delta}
              </b>
              {react.why.map((w, i) => (
                <span key={"w" + i}>{typeof LM.why[w.why] === "function"
                  /* ⚠️ L'ARGUMENT VIENT DE LA RAISON, PAS D'UNE DÉDUCTION : voir la
                     note de `days` dans `mayorDelta`. */
                  ? LM.why[w.why](w.days != null ? w.days : LM.type[w.type])
                  : LM.why[w.why]}</span>
              ))}
            </div>
          )}

          {/* ── LES RÉPONSES, EN JAUNE. Demande de Guillaume, et c'est la seule
              couleur de l'écran : tout ce qui est jaune se clique, rien d'autre
              ne l'est.
              ⚠️ ELLES SONT LÀ DÈS QU'IL A FINI DE PARLER, pendant la grâce comme
              après. Le liseré s'allume quand la jauge se met à fuir : c'est la
              seule chose que la grâce a besoin de dire, et elle le dit sans
              retirer un bouton. ── */}
          {/* hors-zip — L'OFFRE DE REPRISE REMPLACE LES RÉPONSES, ELLE NE
              S'AJOUTE PAS DESSUS : tant qu'on n'a pas tranché, la réponse
              fautive n'est PAS partie (voir `answer`), donc rien d'autre ne
              doit rester cliquable. */}
          {pendingFault && (phase === "live" || phase === "ask") && (
            <div className="maire-says">
              <div className="maire-why">{LM.redoOffer}</div>
              <button className="maire-say" onClick={confirmRedo}>{LM.redoYes}</button>
              <button className="maire-say" onClick={declineRedo}>{LM.redoNo}</button>
            </div>
          )}
          {!pendingFault && (phase === "live" || phase === "ask") && (
            <div className={"maire-says" + (phase === "ask" ? " grace" : "")}>
              {says.map(c => (
                <button className="maire-say" key={c.k} onClick={() => answer(c.k)}>{LM.say[c.k]}</button>
              ))}
              <div className="maire-gestures">
                {gestures.map(c => (
                  <button className={"maire-gesture" + (c.kind === "slam" ? " slam" : "")} key={c.k} onClick={() => answer(c.k)}>
                    {c.kind === "plans" ? LM.layPlans : c.kind === "settle" ? LM.settle : LM.slam}
                    <span>{c.kind === "settle" ? LM.settleHint : c.kind === "slam" ? LM.slamHint : ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "over" && (
            <div className="maire-end">
              {s.over === "signed" && (
                <>
                  <div>{LM.after.signed}</div>
                  {MR.mayorTrustGain(s) > 0 && <div className="maire-dim">{LM.after["trust" + MR.mayorTrustGain(s)]}</div>}
                </>
              )}
              {s.over === "slam" && <div className="maire-dim">{LM.after.slam}</div>}
              {s.over !== "signed" && s.over !== "slam" && <div className="maire-dim">{LM.after.again}</div>}
              <button className="maire-say" style={{ marginTop: 10 }} onClick={() => onDone(s.log, s.over)}>
                {LM.leave}
              </button>
            </div>
          )}
        </div>
      }
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LE SPECTATEUR — « VOIR LA SCÈNE DE (AUTRE JOUEUR) »
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ IL NE JOUE RIEN, ET C'EST UNE PROPRIÉTÉ DU CODE, PAS UNE DISCIPLINE : il
   n'a pas d'état de négociation du tout, seulement les quelques nombres du
   dernier battement. Il ne peut donc pas répondre à la place de l'autre, même
   en trichant — il n'a rien à envoyer.
   ⚠️ IL VOIT CE QUE LE MAIRE DIT, jamais les réponses possibles : la question est
   publique, le choix appartient à celui qui est assis. C'est aussi ce qui empêche
   la scène de devenir un comité.
   ⚠️ ET IL PEUT BOUGER SA CAMÉRA : il est dans la pièce, debout au fond, pas
   devant un écran de retransmission.
   ═══════════════════════════════════════════════════════════════════════════ */
export function MayorWatch({ live, L, onClose }) {
  const viewRef = useRef({ pose: "closed", emote: "cold", talking: false, bang: false });
  const cand = C.TOWN_CANDIDATES.find(c => c.key === (live && live.mayorKey)) || C.TOWN_CANDIDATES[0];
  /* ⚠️ LE SPECTATEUR LIT LA MÊME TABLE QUE L'ACTEUR (voir la note dans
     `MayorAudience`) : deux tables pour la même scène, c'est deux récits d'une
     même audience — l'un dirait « il », l'autre « elle ». */
  const LM = useMemo(() => L.maireFor(C.mayorIsFem(cand.key)), [L, cand.key]);
  const st = (live && live.state) || {};

  useEffect(() => {
    const V = viewRef.current;
    V.pose = B.POSE[st.pose] ? st.pose : "flat";
    V.emote = B.FACE[st.emote] ? st.emote : "cold";
    V.talking = !!st.talking;
    V.bang = st.over === "slam";
  }, [st.pose, st.emote, st.talking, st.over]);

  const adh = Math.max(0, Math.min(C.MAYOR_ADH_MAX, st.adh | 0));
  const winPct = (C.MAYOR_ADH_WIN / C.MAYOR_ADH_MAX) * 100;
  const ask = st.node && LM.ask[st.node] ? LM.ask[st.node] : null;
  const done = !!st.over;

  return (
    <Stage
      L={L} cand={cand} view={viewRef}
      /* ⚠️ `mayorKey` DÉCIDE DU CORPS (hors-zip 2026-09-02) : `buildOffice` y lit
         la silhouette, la coiffure, la coupe du costume et le sexe. C'est la
         MÊME clé que la plaque et que les répliques `tint` — trois choses qui
         doivent parler du même élu (`verify-maire`, « les trois tables »). */
      opts={{ plateLabel: LM.title, mayorName: L.candName(cand.key), mayorKey: cand.key }}
      bubble={done ? { text: LM.end[st.over] || LM.watchEnd } : ask ? { text: ask } : null}
      onClose={onClose} closeLabel={LM.watchLeave}
      head={<div className="maire-sub">{LM.watching(live && live.name || "?")}</div>}
      foot={
        <div className="maire-foot">
          <div className="maire-gauge">
            <div className="fill" style={{ width: `${adh}%`,
              background: adh >= C.MAYOR_ADH_WIN ? "linear-gradient(90deg,#4c9a5b,#8ce09a)"
                        : adh >= 40 ? "linear-gradient(90deg,#a08a3a,#d8c26a)"
                        : "linear-gradient(90deg,#8a3f34,#c9705c)" }} />
            <div className="mark" style={{ left: `${winPct}%` }} />
          </div>
          <div className="maire-gaugerow">
            <span>{LM.gauge} {adh}</span>
            <span>{done ? LM.watchEnd : LM.watchNoSay}</span>
          </div>
          {done && <button className="maire-say" style={{ marginTop: 10 }} onClick={onClose}>{LM.watchLeave}</button>}
        </div>
      }
    />
  );
}
