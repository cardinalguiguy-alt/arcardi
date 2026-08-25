"use client";
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 480 — LE BUREAU DU MAIRE EN 3D, ET L'ÉCRAN DE L'AUDIENCE.
   ═══════════════════════════════════════════════════════════════════════════
   Décision de Guillaume : « three.js embarqué ». Le décor vient du blocage
   Blender de cette passe, exporté en glTF (`public/models/maire-bureau.glb`,
   365 Ko, 158 objets nommés `part_*`, cinq pivots `rig_*`).

   ⚠️⚠️ CE FICHIER EST UNE VUE, ET RIEN D'AUTRE. Toute la négociation vit dans
   `components/ferme/maire.js` — table, jauge, fuite, arbitrage — et
   `tools/verify-maire.mjs` en joue quatre cents sans jamais ouvrir un canevas.
   C'est ce qui fait qu'un échec du rendu 3D ne coûte pas la mécanique.

   ⚠️⚠️⚠️ ET C'EST POURQUOI IL Y A UN REPLI. La 3D peut manquer pour trois
   raisons qui n'ont rien à voir entre elles : pas de WebGL, un fichier de
   modèle absent, un script vendorisé qui ne répond pas. Dans les trois cas
   l'audience DOIT rester jouable — un dialogue qui refuse de s'ouvrir parce
   qu'une carte graphique n'a pas plu bloquerait la quête entière. La scène est
   donc un DÉCOR : elle se charge en tâche de fond, elle s'installe quand elle
   est prête, et elle ne retient jamais l'interface.

   ⚠️⚠️ POURQUOI UN FICHIER À PART DE `FermeGame.js`. Deux raisons, et la
   seconde est la vraie : (1) `FermeGame.js` fait 30 000 lignes ; (2) surtout,
   c'est le PREMIER morceau de 3D du monde partagé, et il traîne une boucle de
   rendu à lui, un contexte WebGL à libérer et deux scripts à charger. Le §4 de
   `CLAUDE.md` est formel sur ce que coûte une seconde boucle de rendu dans la
   closure d'une autre : on l'isole au lieu de l'y verser.
   ⚠️ ET LE CONTEXTE WEBGL SE LIBÈRE À LA FERMETURE (`renderer.dispose()`,
   `forceContextLoss()`). Un navigateur n'accorde qu'une poignée de contextes ;
   trois audiences dans la même session, et la quatrième s'ouvre sur du noir.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useMemo, useRef, useState } from "react";
import * as C from "./fermeConstants";
import * as MR from "./maire";
import * as Q from "./quete";

/* ═══════════════════════════════════════════════════════════════════════════
   LE CONTEXTE DE L'AUDIENCE — LA MÊME FONCTION DES DEUX CÔTÉS DU RÉSEAU
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ ELLE EST ICI, EXPORTÉE, ET APPELÉE PAR LE CLIENT **ET** PAR L'HÔTE.
   C'est le seul arrangement qui rende la rejouabilité possible : si le client
   composait son contexte et l'envoyait, il choisirait son maire, sa confiance
   et son jour d'audience — c'est-à-dire qu'il gagnerait sans jouer. Et si
   chacun écrivait sa propre version, les deux tomberaient d'accord par HASARD
   jusqu'au jour où l'une des deux changerait. Une seule fonction, deux
   appelants : l'accord est une propriété du code, pas une coïncidence.
   ⚠️ Tout y est DÉRIVÉ du jour partagé (`mayorOf`, `mayorNextElection`,
   `mayorAudienceDay` sont de pures fonctions depuis le 439) : rien de neuf ne
   circule, et deux joueurs voient le même maire par construction.
   ⚠️ `E` est passé plutôt qu'importé pour ne pas tirer `fermeEngine` (11 000
   lignes) dans un fichier de vue. */
export function mayorCtxOf(shared, star, E) {
  const day = (shared && shared.day) || 1;
  const e = star || {};
  return {
    mayorKey: (E.mayorOf(day) || {}).key || "vasseur",
    day,
    nextElection: E.mayorNextElection(day),
    /* ⚠️ LE JOUR D'AUDIENCE EST UN BONUS, PAS UNE PORTE : `mayorAudienceDay`
       existe depuis le 439 et n'était qu'une DATE AFFICHÉE, que rien dans le jeu
       ne lisait. Ce jour-là il est préparé et il décroche moins vite ; les autres
       jours on l'attrape entre deux dossiers. Une date qui ne change rien est une
       date qui ment. */
    audience: E.mayorAudienceDay(day) === day,
    plans: Q.starPlanReady(e),
    trust: MR.mayorTrust(e),
    burnt: MR.mayorBurnt(e),
  };
}

/* ── la longueur du texte affiché décide de la grâce de lecture (jamais un
   nombre réglé à la main : le français gonfle de 15 à 20 % sur l'anglais) ── */
const lenOf = (...xs) => xs.reduce((n, x) => n + (typeof x === "string" ? x.length : 0), 0);

/* ⚠️ L'ORDRE DES TROIS RÉPONSES EST TIRÉ, ET IL LE FAUT : à position fixe, on
   apprend en deux entretiens que l'idéale est la première et on cesse de lire.
   ⚠️ Le tirage n'a AUCUN effet sur l'arbitrage — la transcription porte des
   CLÉS, pas des rangs — donc l'hôte rejoue le même entretien quel que soit
   l'ordre qu'a vu le client. */
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

/* ═══════════════════════════════════════════════════════════════════════════
   LA SCÈNE 3D. Chargée en tâche de fond, jamais bloquante.
   ═══════════════════════════════════════════════════════════════════════════ */
const SCRIPTS = ["/vendor/three-r128/three.min.js", "/vendor/three-r128/js/loaders/GLTFLoader.js"];
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

/* ⚠️⚠️ LES POSTURES SONT DES CIBLES, PAS DES ANIMATIONS. Chaque pose est un
   petit jeu de transformations vers lequel les pivots GLISSENT à chaque image.
   Une pose qui se jouerait comme une animation nommée obligerait à en exporter
   sept depuis Blender, donc à rouvrir Blender à chaque réglage — et un décor
   importé qu'on ne peut plus régler est exactement ce que le §9 de `CLAUDE.md`
   appelle « il ne se dégrade pas, il vieillit ».
   ⚠️ `lean` en radians sur X (il se penche), `y` en mètres (il se redresse),
   `arm` l'ouverture des avant-bras, `stamp` la traction du tampon vers lui,
   `turn` sa rotation vers la fenêtre. */
const POSE = {
  closed: { lean: -0.16, y: 0.00, arm: -0.55, stamp: 0, turn: 0 },   // bras croisés, calé en arrière
  clock:  { lean: -0.08, y: 0.00, arm: -0.30, stamp: 0, turn: 0.22 },// il regarde l'horloge
  flat:   { lean:  0.00, y: 0.00, arm:  0.00, stamp: 0, turn: 0 },   // mains à plat, il écoute
  lean:   { lean:  0.17, y: 0.02, arm:  0.18, stamp: 0, turn: 0 },   // coudes sur le bureau
  stamp:  { lean:  0.13, y: 0.02, arm:  0.26, stamp: 0.30, turn: 0 },// il tire le tampon vers lui
  window: { lean:  0.02, y: 0.10, arm: -0.10, stamp: 0, turn: -0.55 },// il s'est levé, il regarde dehors
  push:   { lean: -0.22, y: 0.00, arm:  0.34, stamp: 0, turn: 0 },   // il repousse les plans
};

function useOffice(canvasRef, poseRef) {
  const [state, setState] = useState("loading");   // loading | ready | off
  useEffect(() => {
    let dead = false, raf = 0, renderer = null;
    (async () => {
      try {
        for (const src of SCRIPTS) await loadScript(src);
        if (dead) return;
        const THREE = window.THREE;
        const cv = canvasRef.current;
        if (!THREE || !THREE.GLTFLoader || !cv) throw new Error("three absent");
        renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x14161c);
        /* ⚠️ LES LAMPES NE SONT PAS EXPORTÉES (leurs intensités Blender ne se
           transposent pas — §8 : compenser « au jugé » a déjà coûté une passe
           entière sur `crystal`). On rallume à la main, sur le même parti : le
           jour vient de la fenêtre DERRIÈRE lui, donc il est à contre-jour. */
        scene.add(new THREE.HemisphereLight(0xbcd2e8, 0x2b2118, 0.65));
        const sun = new THREE.DirectionalLight(0xfff2dd, 1.15);
        sun.position.set(0.4, 6.0, 3.2); scene.add(sun);
        const warm = new THREE.PointLight(0xffd8a0, 0.55, 9); warm.position.set(0, 1.2, 3.0); scene.add(warm);
        const key = new THREE.PointLight(0xfff0e0, 0.45, 8); key.position.set(-1.4, -1.0, 2.4); scene.add(key);

        const gltf = await new Promise((res, rej) =>
          new THREE.GLTFLoader().load("/models/maire-bureau.glb", res, undefined, rej));
        if (dead) return;
        scene.add(gltf.scene);

        const find = (n) => gltf.scene.getObjectByName(n);
        /* ⚠️ ON MASQUE NOTRE PROPRE CRÂNE : la caméra est posée au ras de nos
           yeux, et un cheveu de 14 cm devant l'objectif remplit tout l'écran.
           Mesuré pendant le blocage, en Blender, exactement de la même façon. */
        for (const n of ["part_us_head", "part_us_hair"]) { const o = find(n); if (o) o.visible = false; }

        const cam = (gltf.cameras && gltf.cameras[0]) || new THREE.PerspectiveCamera(46, 16 / 9, 0.05, 60);
        const camNode = find("cam_seat");
        if (camNode) { camNode.updateMatrixWorld(true); }
        const rig = {
          torso: find("rig_mayor_torso"), armL: find("rig_mayor_armL"),
          armR: find("rig_mayor_armR"), stamp: find("rig_stamp"), plans: find("rig_plans"),
        };
        const base = {};
        for (const k of Object.keys(rig)) if (rig[k]) base[k] = { p: rig[k].position.clone(), r: rig[k].rotation.clone() };

        const resize = () => {
          const w = cv.clientWidth || 960, h = cv.clientHeight || 540;
          renderer.setSize(w, h, false);
          if (cam.isPerspectiveCamera) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
        };
        resize();
        window.addEventListener("resize", resize);

        const cur = { lean: 0, y: 0, arm: 0, stamp: 0, turn: 0 };
        let t0 = performance.now();
        const tick = (now) => {
          if (dead) return;
          const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
          const want = POSE[poseRef.current] || POSE.flat;
          /* ⚠️ ON GLISSE, ON NE SAUTE PAS. Une posture qui change d'une image à
             l'autre se lit comme un défaut d'affichage, pas comme un homme qui se
             penche — c'est le défaut n°10 de l'audit 477, corrigé au 479 sur la
             compagne, et il se rejouerait ici mot pour mot. */
          for (const k of Object.keys(cur)) cur[k] += (want[k] - cur[k]) * Math.min(1, dt * 3.2);
          if (rig.torso && base.torso) {
            rig.torso.rotation.x = base.torso.r.x + cur.lean;
            rig.torso.rotation.z = base.torso.r.z + cur.turn;
            rig.torso.position.z = base.torso.p.z + cur.y;
            rig.torso.position.y = base.torso.p.y - cur.lean * 0.22;
          }
          if (rig.armL && base.armL) { rig.armL.rotation.z = base.armL.r.z - cur.arm * 0.5; rig.armL.position.y = base.armL.p.y - cur.arm * 0.16; }
          if (rig.armR && base.armR) { rig.armR.rotation.z = base.armR.r.z + cur.arm * 0.5; rig.armR.position.y = base.armR.p.y - cur.arm * 0.16; }
          if (rig.stamp && base.stamp) rig.stamp.position.y = base.stamp.p.y - cur.stamp;
          renderer.render(scene, camNode || cam);
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        setState("ready");
        return () => window.removeEventListener("resize", resize);
      } catch (err) {
        /* ⚠️ UN ÉCHEC DE DÉCOR N'EST PAS UN ÉCHEC D'AUDIENCE. On le dit dans la
           console et on laisse l'interface vivre : la négociation entière tient
           sans une seule image. */
        console.warn("[maire] scène 3D indisponible, repli sur le décor plat :", err && err.message);
        if (!dead) setState("off");
      }
    })();
    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      /* ⚠️⚠️ LE CONTEXTE WEBGL SE REND. Un navigateur n'en accorde qu'une
         poignée ; sans ces deux lignes, la quatrième audience d'une session
         s'ouvre sur du noir et rien ne dit pourquoi. */
      if (renderer) {
        try { renderer.dispose(); renderer.forceContextLoss && renderer.forceContextLoss(); } catch (e) { /* déjà perdu */ }
      }
    };
  }, [canvasRef, poseRef]);
  return state;
}

/* ═══════════════════════════════════════════════════════════════════════════
   L'ÉCRAN DE L'AUDIENCE
   ═══════════════════════════════════════════════════════════════════════════ */
export function MayorAudience({ ctx, L, onDone }) {
  const [s] = useState(() => MR.mayorOpen(ctx));
  const [, force] = useState(0);
  const [phase, setPhase] = useState("ask");        // ask (grâce) | live (la fuite court) | react | over
  const [react, setReact] = useState(null);         // { tell, why, delta, grade }
  const canvasRef = useRef(null);
  const poseRef = useRef("closed");
  const graceRef = useRef(0);
  const liveAtRef = useRef(0);
  const lastRef = useRef(0);
  const sentRef = useRef(false);
  const scene = useOffice(canvasRef, poseRef);

  const cand = C.TOWN_CANDIDATES.find(c => c.key === ctx.mayorKey) || C.TOWN_CANDIDATES[0];
  const node = s.node;
  const choices = useMemo(() => shuffled(MR.mayorChoices(s), (MR.MAYOR_NODE_IDS.indexOf(node) + 1) * 7 + (ctx.day | 0)),
                          [node, phase, ctx.day]);   // eslint-disable-line react-hooks/exhaustive-deps
  const tint = node && L.maire.tint[node] ? L.maire.tint[node][ctx.mayorKey] : null;
  const ask = node ? L.maire.ask[node] : null;

  /* ⚠️⚠️ LA GRÂCE DE LECTURE EST DÉRIVÉE DU TEXTE RÉELLEMENT AFFICHÉ, dans la
     langue du joueur. Un nombre réglé à la main aurait fait payer au joueur
     anglophone les 15 à 20 % de gonflement du français, et à personne d'autre. */
  useEffect(() => {
    if (phase !== "ask" || !node) return;
    const chars = lenOf(ask, tint, ...choices.map(c =>
      c.kind === "say" ? L.maire.say[c.k] : c.kind === "plans" ? L.maire.layPlans : L.maire.settle));
    graceRef.current = MR.mayorReadMs(chars);
    const t = setTimeout(() => { liveAtRef.current = performance.now(); setPhase("live"); }, graceRef.current);
    return () => clearTimeout(t);
  }, [phase, node, ask, tint, choices, L]);

  /* La fuite, en temps réel. ⚠️ Elle ne court QUE pendant `live` : jamais
     pendant qu'on lit, jamais pendant qu'il répond. */
  useEffect(() => {
    if (phase !== "live") return;
    let raf = 0, prev = performance.now();
    const tick = (now) => {
      const dt = now - prev; prev = now;
      MR.mayorAdvance(s, dt);
      poseRef.current = MR.mayorPose(s, null);
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
    poseRef.current = MR.mayorPose(s, null);
    force(x => x + 1);
  }

  function answer(key) {
    if (phase !== "live") return;
    const dt = Math.max(0, performance.now() - liveAtRef.current);
    const r = MR.mayorPlay(s, key, dt);
    lastRef.current = r.grade;
    poseRef.current = MR.mayorPose(s, r.grade);
    const tell = key === "__plans" ? null : key === "__settle" ? null : L.maire.tell[key];
    setReact({ tell, why: r.why, delta: r.delta, grade: r.grade });
    if (s.over) { setPhase("react"); setTimeout(finish, 2600); return; }
    setPhase("react");
    /* ⚠️ IL PARLE, DONC RIEN NE FUIT. Le temps qu'il met à répondre est déjà
       compté par `MAYOR_BEAT_MS` à l'intérieur du résolveur : le compter une
       seconde fois ici serait le doublon du §8, et il se verrait à peine. */
    setTimeout(() => { setReact(null); setPhase("ask"); }, 2400);
  }

  const adh = Math.max(0, Math.min(C.MAYOR_ADH_MAX, s.adh));
  const winPct = (C.MAYOR_ADH_WIN / C.MAYOR_ADH_MAX) * 100;
  const grade = MR.mayorGrade(s);
  const streakOn = s.streak >= C.MAYOR_STREAK_HOLD;

  return (
    <div className="ferme-modal open" style={{ zIndex: 60 }}>
      <div className="panel ferme-modal-panel" style={{ maxWidth: 940, width: "94vw" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ marginBottom: 2 }}>🎩 {L.maire.title}</h2>
        <div className="ferme-hint" style={{ marginBottom: 8 }}>
          {L.maire.who(cand.emoji, L.candName(cand.key))} · {L.maire.race(Math.max(0, ctx.nextElection - ctx.day))}
        </div>

        {/* LE DÉCOR. Il occupe la moitié haute, il ne retient jamais l'interface. */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 8", background: "#14161c",
                      borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: scene === "off" ? "none" : "block" }} />
          {scene !== "ready" && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
                          justifyContent: "center", color: "#9aa4b2", fontSize: 13 }}>
              {scene === "off" ? `${cand.emoji} ${L.candName(cand.key)}` : "…"}
            </div>
          )}
        </div>

        {/* LA JAUGE. ⚠️ Le repère de 75 est DESSINÉ : un seuil qu'on ne voit pas
            n'est pas un seuil, c'est une surprise. */}
        <div style={{ position: "relative", height: 14, borderRadius: 7, background: "rgba(255,255,255,.10)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, width: `${adh}%`, borderRadius: 7, transition: "width .12s linear",
                        background: adh >= C.MAYOR_ADH_WIN ? "linear-gradient(90deg,#4c9a5b,#8ce09a)"
                                  : adh >= 40 ? "linear-gradient(90deg,#a08a3a,#d8c26a)"
                                  : "linear-gradient(90deg,#8a3f34,#c9705c)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${winPct}%`, width: 2, background: "rgba(255,255,255,.65)" }} />
        </div>
        <div className="ferme-hint" style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span>{L.maire.gauge} {Math.round(adh)}</span>
          <span>{s.over ? "" : streakOn ? (s.streak >= C.MAYOR_STREAK_GAIN ? L.maire.streakGain : L.maire.streakHold)
                        : s.slipMs > 0 ? L.maire.slip : ""}</span>
        </div>

        {/* CE QU'IL DIT */}
        {phase !== "over" && (
          <div style={{ marginTop: 12, minHeight: 76 }}>
            {tint && <div className="ferme-hint" style={{ marginBottom: 6, fontStyle: "italic" }}>{tint}</div>}
            <div>{ask}</div>
          </div>
        )}

        {/* CE QU'ON RÉPOND — ou pourquoi il a réagi comme ça */}
        {phase === "react" && react && (
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: "rgba(255,255,255,.06)" }}>
            <div style={{ fontWeight: "bold", color: react.delta >= 0 ? "#8ce09a" : "#e08c7a" }}>
              {react.delta >= 0 ? "+" : ""}{react.delta}
            </div>
            {react.tell && <div style={{ marginTop: 4 }}>{react.tell}</div>}
            {/* ⚠️⚠️ « TOUJOURS AVOIR UNE JUSTIFICATION DE LA RÉACTION DU MAIRE »
                (Guillaume). Les raisons viennent du RÉSOLVEUR, pas d'un `if`
                d'affichage : un modificateur ajouté au calcul et oublié ici
                n'existerait pas pour le joueur, ce qui est la définition d'une
                mécanique injuste. */}
            {react.why.map((w, i) => (
              <div className="ferme-hint" key={"w" + i} style={{ marginTop: 3 }}>
                {typeof L.maire.why[w.why] === "function"
                  ? L.maire.why[w.why](w.type ? L.maire.type[w.type] : Math.max(0, ctx.nextElection - ctx.day))
                  : L.maire.why[w.why]}
              </div>
            ))}
          </div>
        )}

        {phase === "ask" && <div className="ferme-hint" style={{ marginTop: 10 }}>{L.maire.waitRead}</div>}

        {phase === "live" && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {choices.map(c => (
              <button className="ferme-btn" key={c.k} onClick={() => answer(c.k)}
                      style={{ textAlign: "left", padding: "9px 12px", lineHeight: 1.35 }}>
                {c.kind === "say" ? L.maire.say[c.k] : c.kind === "plans" ? L.maire.layPlans : L.maire.settle}
                {c.kind === "settle" && <div className="ferme-hint" style={{ marginTop: 2 }}>{L.maire.settleHint}</div>}
              </button>
            ))}
          </div>
        )}

        {/* LA FIN */}
        {phase === "over" && (
          <div style={{ marginTop: 12 }}>
            <div>{L.maire.end[grade] || L.maire.end.out}</div>
            {s.over === "signed" && (
              <>
                <div style={{ marginTop: 8 }}>{L.maire.after.signed}</div>
                {MR.mayorTrustGain(s) > 0 && (
                  <div className="ferme-hint" style={{ marginTop: 4 }}>{L.maire.after["trust" + MR.mayorTrustGain(s)]}</div>
                )}
              </>
            )}
            {s.over !== "signed" && <div className="ferme-hint" style={{ marginTop: 8 }}>{L.maire.after.again}</div>}
            <button className="ferme-btn" style={{ marginTop: 12 }} onClick={() => onDone(s.log, s.over)}>
              {L.maire.leave}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
