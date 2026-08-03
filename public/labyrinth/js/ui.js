/* =============================================================================
   ui.js — écrans, jauges, langue, record.
   -----------------------------------------------------------------------------
   ⚠️ UNE SEULE DESCRIPTION DE CHAQUE CHOSE. La jauge de flamme, le voile
   d'angoisse et les cœurs LISENT l'état du moteur ; ils ne recalculent rien.
   Le voile en particulier appelle Rules.dread(), qui vit dans rules.js à côté
   de la position du traqueur — un voile calculé ici aurait fini par annoncer
   une menace ailleurs que là où elle est (leçon du zip 387, et application
   directe de ce qui a été fait au 392 pour notifItems()).
   ========================================================================== */

const UI = (function () {
  const $ = (id) => document.getElementById(id);
  let L = LAB_STR.fr;
  let best = 0;
  let toastT = 0;
  /* ZIP 399 — le compteur d'images et le réglage de qualité. */
  let qualCb = null, qualNow = "high";
  let fpsAcc = 0, fpsN = 0, fpsLast = 0, fpsShown = 0, perfWired = false;

  function show(id, on) { const e = $(id); if (e) e.classList.toggle("visible", !!on); }

  function applyLang(lang) {
    L = LAB_STR[lang] || LAB_STR.fr;
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("tTitle", L.title); set("tSub", L.sub); set("btnStart", L.start);
    set("cLane", L.cLane); set("cStrafe", L.cStrafe); set("cHit", L.cHit);
    set("cUse", L.cUse); set("cPause", L.cPause); set("cBack", L.cBack);
    set("cLook", L.cLook); set("cShoot", L.cShoot); set("cMap", L.cMap);
    set("mapHint", L.mapHint); set("lockTxt", L.lockHint);
    set("lBack", L.hBack); set("lLoading", L.loading);
    set("tHint", L.hint); set("tHintExit", L.hintExit);
    set("lScore", L.hScore); set("lShards", L.hShards);
    set("lFlame", L.hFlame); set("lBest", L.hBest);
    set("pTitle", L.pause); set("btnResume", L.resume); set("btnQuit", L.quit);
    set("pQuitWarn", L.quitWarn);
    // zip 399 : le réglage de qualité et l'avis d'effondrement.
    set("qualTitle", L.qualTitle); set("qualHint", L.qualHint);
    set("qHigh", L.qual_high); set("qMed", L.qual_med); set("qLow", L.qual_low);
    set("hangNotice", L.hangNotice);
    set("fLScore", L.fScore); set("fLShards", L.fShards);
    set("fLDepth", L.fDepth); set("fLBest", L.fBest);
    set("btnBack", L.back);
    const farm = $("tHintFarm");
    if (farm) { farm.textContent = L.hintFarm; farm.style.display = Bridge.embedded ? "" : "none"; }
    const btnExit = $("btnExit");
    if (btnExit) { btnExit.textContent = L.back; btnExit.style.display = Bridge.embedded ? "" : "none"; }
  }

  function setBest(v) { best = v | 0; const e = $("best"); if (e) e.textContent = best; }

  /* Le HUD est appelé à chaque image. Il n'écrit dans le DOM que ce qui a
     CHANGÉ : réécrire six textContent soixante fois par seconde relance la
     mise en page du navigateur et fait tomber le rendu 3D, ce qui est le
     genre de perte qu'on met des heures à attribuer au bon coupable. */
  const last = {};
  function hud(st) {
    const put = (id, v) => { if (last[id] === v) return; last[id] = v; const e = $(id); if (e) e.textContent = v; };
    put("score", st.score | 0);
    put("shards", st.shardsTaken | 0);

    const f = Math.max(0, Math.min(1, st.flame));
    const bar = $("flameFill");
    if (bar) {
      bar.style.width = (f * 100).toFixed(1) + "%";
      bar.className = f <= st.cfg.FLAME_CRITICAL ? "ember" : f <= st.cfg.FLAME_LOW ? "low" : "";
    }
    const hearts = $("hearts");
    const hv = st.hearts + "/" + st.cfg.HEARTS;
    if (hearts && last.h !== hv) {
      last.h = hv;
      hearts.innerHTML = "";
      for (let i = 0; i < st.cfg.HEARTS; i++) {
        const s = document.createElement("span");
        s.className = "heart" + (i < st.hearts ? "" : " off");
        hearts.appendChild(s);
      }
    }
    const swd = $("swordIcon");
    if (swd) swd.classList.toggle("on", !!st.hasSword);

    /* ZIP 396 — LE COMPTE À REBOURS DU RENONCEMENT.
       ⚠️ IL LIT st.abandonT, il ne compte pas lui-même. Une horloge tenue par
       l'interface et une autre par le moteur finissent toujours par ne plus
       dire la même chose, et le jour où elles divergent c'est la porte qui se
       ferme au mauvais moment. Ici l'interface ne sait rien : elle affiche.
       Le compteur n'apparaît QUE pendant la fenêtre — avant le premier pas
       (abandonT < 0) et une fois la herse tombée, il n'y a rien à montrer. */
    const bb = $("backBox");
    if (bb) {
      const live = st.abandonT > 0 && st.gate.state === 0;
      bb.classList.toggle("on", live);
      if (live) {
        const s = Math.ceil(st.abandonT);
        if (last.bk !== s) { last.bk = s; const e = $("backT"); if (e) e.textContent = s; }
        bb.classList.toggle("urgent", st.abandonT <= st.cfg.GATE_WARN_MS / 1000);
      }
    }

    // LE VOILE D'ANGOISSE. C'est le seul « son » du jeu tant qu'il n'y en a
    // pas : plus il est proche, plus le bord de l'écran rougit.
    /* ZIP 397 — les carreaux. La rangée n'apparaît qu'une fois l'arbalète
       trouvée : un compteur à zéro pour un objet qu'on ne possède pas apprend
       au joueur à ne plus regarder le HUD, et c'est un pli qu'on ne défait
       plus ensuite. */
    const bb2 = $("boltBox");
    if (bb2) {
      bb2.classList.toggle("on", !!st.hasBow);
      bb2.classList.toggle("empty", st.bolts <= 0);
      put("boltN", st.bolts | 0);
    }

    const dr = $("dread");
    if (dr) dr.style.opacity = Rules.dread(st).toFixed(3);
    const hurt = $("hurtFlash");
    if (hurt) hurt.style.opacity = (st.hurtFlash * 0.55).toFixed(3);
  }

  /* =======================================================================
     ZIP 397 — LA NAVIGATION. « Il faut pouvoir naviguer de manière
     absolument évidente. »
     -----------------------------------------------------------------------
     Trois dispositifs, et ils ne se recouvrent PAS — c'est ce qui fait qu'on
     peut les avoir tous les trois sans que le jeu devienne une visite guidée :

       LA BOUSSOLE donne une DIRECTION à vol d'oiseau (« la sortie est par
         là »), jamais un chemin. Elle ne dit rien des trois murs qui séparent,
         donc elle supprime la question sans intérêt (« où aller ? ») et laisse
         entière la seule qui compte (« comment y aller ? ») ;
       LA MINICARTE donne la TOPOLOGIE DE CE QU'ON A VU. Elle répare le seul
         vrai défaut d'un labyrinthe joué en une session : la mémoire. Un
         joueur humain ne retient pas trente embranchements, et lui demander de
         le faire ne produit pas de la difficulté, ça produit des allers-retours ;
       LES MARQUES DE CRAIE (voir maze.js) donnent un CONSEIL LOCAL au moment
         du choix. C'est la seule des trois qui parle du monde plutôt que de
         l'interface, et c'est celle qui fait le lieu.

     ⚠️ ET LE PLAN COMPLET EST UN OBJET À TROUVER. Tant qu'on n'a pas décroché
     la carte du mur, la minicarte n'affiche QUE `st.seen` — c'est-à-dire ce
     que le joueur a réellement vu. Le bonus demandé par Guillaume est
     exactement ce basculement-là, et il vaut d'être gagné.
     ======================================================================= */
  const MC = { cv: null, ctx: null, big: null, bctx: null };

  /* Une petite palette nommée, lue par les deux cartes. Écrire « #b88aff » à
     six endroits est la meilleure façon d'en corriger cinq un jour. */
  const MAPCOL = {
    seen: "#6a5a86", seenLit: "#8f7bb4", unseen: "#2a2140",
    wall: "rgba(0,0,0,0)", exit: "#b88aff", rot: "#ffd36e",
    me: "#ff9a3c", torch: "#ff7a2c", torchOff: "#5a4a44",
    shard: "#4fd8f5", map: "#9fd8ff", trail: "#3d3358",
  };

  function ensureMap() {
    if (!MC.cv) { MC.cv = $("mini"); MC.ctx = MC.cv && MC.cv.getContext("2d"); }
    if (!MC.big) { MC.big = $("mapBig"); MC.bctx = MC.big && MC.big.getContext("2d"); }
  }

  /* -----------------------------------------------------------------------
     LE DESSIN D'UNE CARTE. Une seule fonction pour les deux — la minicarte
     tourne avec le joueur, le grand plan est fixe au nord.
     -----------------------------------------------------------------------
     ⚠️ ELLE DESSINE LES LIENS, PAS LES CELLULES. Un labyrinthe rendu en
     cellules pleines se lit comme un damier : on ne voit pas où l'on peut
     passer, ce qui est la seule information qu'on lui demande. On peint donc
     un point par cellule ET un trait vers chaque voisin RELIÉ, et le dessin
     devient un plan de couloirs.
     -------------------------------------------------------------------- */
  function drawMap(ctx, W, H, st, opts) {
    const m = st.m, cfg = st.cfg, G = m.G;
    const rot = opts.rotate ? -st.ang : 0;
    const span = opts.span || G;                    // cellules visibles de part et d'autre
    const s = W / (span * 2 + 1);                   // pixels par cellule
    const [pcx, pcy] = Rules.cellOf(cfg, st.px, st.pz);
    const cxr = opts.follow ? st.px / cfg.CELL - 0.5 : (G - 1) / 2;
    const czr = opts.follow ? st.pz / cfg.CELL - 0.5 : (G - 1) / 2;
    const cos = Math.cos(rot), sin = Math.sin(rot);

    ctx.clearRect(0, 0, W, H);
    // projection cellule → écran
    const P = (x, y) => {
      const dx = (x - cxr) * s, dy = (y - czr) * s;
      return [W / 2 + dx * cos - dy * sin, H / 2 + dx * sin + dy * cos];
    };
    const known = (j) => st.hasMap || st.seen.has(j);

    // --- les couloirs
    ctx.lineCap = "round";
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const j = m.idx(x, y);
      if (!m.cells[j] || !known(j)) continue;
      const seen = st.seen.has(j);
      /* Une cellule VUE est plus claire qu'une cellule seulement connue par la
         carte. C'est ce qui empêche le plan de rendre l'exploration inutile :
         on continue de voir, d'un coup d'œil, où l'on est déjà passé. */
      ctx.strokeStyle = seen ? MAPCOL.seenLit : MAPCOL.seen;
      ctx.lineWidth = Math.max(1.6, s * 0.44);
      const [ax, ay] = P(x, y);
      for (const d of m.DIRS) {
        if (!m.linked(x, y, d)) continue;
        const nx2 = x + m.DX[d], ny2 = y + m.DY[d];
        if (nx2 < 0 || ny2 < 0 || nx2 >= G || ny2 >= G) continue;
        if (!known(m.idx(nx2, ny2))) continue;
        const [bx, by] = P((x + nx2) / 2, (y + ny2) / 2);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      // le point de la cellule, pour que les culs-de-sac existent aussi
      ctx.beginPath(); ctx.arc(ax, ay, Math.max(0.9, s * 0.20), 0, 6.284);
      ctx.fillStyle = seen ? MAPCOL.seenLit : MAPCOL.seen;
      ctx.fill();
    }

    // --- les trous : ce sont les seules cellules qu'on veut RECONNAÎTRE
    ctx.fillStyle = "#1a0d24";
    for (const j of st.gaps) {
      if (!known(j)) continue;
      const [gx, gy] = P(j % G, (j / G) | 0);
      ctx.beginPath(); ctx.arc(gx, gy, Math.max(1.2, s * 0.30), 0, 6.284); ctx.fill();
    }

    const dot = (x, y, col, r, ring) => {
      const [dx, dy] = P(x, y);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(dx, dy, r, 0, 6.284); ctx.fill();
      if (ring) { ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.globalAlpha = .45;
        ctx.beginPath(); ctx.arc(dx, dy, r * 2.2, 0, 6.284); ctx.stroke(); ctx.globalAlpha = 1; }
    };

    // --- les brasiers connus. Éteint = repère de navigation (zip 393), donc
    //     on le garde à l'écran dans une autre couleur au lieu de l'effacer.
    for (const t of st.torches) {
      if (!known(m.idx(t.x, t.y))) continue;
      dot(t.x, t.y, t.spent ? MAPCOL.torchOff : MAPCOL.torch, Math.max(1.4, s * 0.24));
    }
    if (opts.big) {
      for (const sh of st.shards) {
        if (sh.taken || !known(m.idx(sh.x, sh.y))) continue;
        dot(sh.x, sh.y, MAPCOL.shard, Math.max(1.1, s * 0.16));
      }
    }
    if (st.mapItem && !st.mapItem.taken && known(m.idx(st.mapItem.x, st.mapItem.y)))
      dot(st.mapItem.x, st.mapItem.y, MAPCOL.map, Math.max(1.8, s * 0.30), true);
    if (st.bow && !st.bow.taken && known(m.idx(st.bow.x, st.bow.y)))
      dot(st.bow.x, st.bow.y, MAPCOL.shard, Math.max(1.6, s * 0.26), true);

    // --- la rotonde et la sortie : les deux repères qui valent le détour
    if (m.rotunda && (st.hasMap || st.seen.has(m.idx(m.rotunda.cx, m.rotunda.cy))))
      dot(m.rotunda.cx, m.rotunda.cy, MAPCOL.rot, Math.max(2.2, s * 0.42), true);
    if (st.hasMap || st.seen.has(m.idx(m.exit.x, m.exit.y)))
      dot(m.exit.x, m.exit.y, MAPCOL.exit, Math.max(2.4, s * 0.44), true);

    /* --- LE JOUEUR, toujours en dernier et toujours au-dessus. Un TRIANGLE,
       pas un point : il porte le cap, et sur une carte orientée vers l'avant
       c'est ce qui empêche de confondre « je vais vers le haut de la carte »
       avec « le haut de la carte est le nord ». */
    const [mx, my] = P(cxr, czr);
    const a0 = st.ang + rot;
    ctx.fillStyle = MAPCOL.me;
    ctx.beginPath();
    const R2 = Math.max(4, s * 0.5);
    for (const [len, off] of [[R2 * 1.5, 0], [R2, 2.5], [R2, -2.5]]) {
      const aa = a0 + off;
      const px2 = mx - Math.sin(aa) * len, py2 = my - Math.cos(aa) * len;
      if (off === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
    }
    ctx.closePath(); ctx.fill();
    void pcx; void pcy;
  }

  /* -----------------------------------------------------------------------
     LA BOUSSOLE. Un ruban de 180° autour du cap, gradué, avec les quatre
     points cardinaux ET deux repères qui n'en sont pas : la SORTIE (violet) et
     la ROTONDE (or) — les deux seules choses du labyrinthe dont on veuille
     connaître la direction sans connaître le chemin.
     -----------------------------------------------------------------------
     ⚠️ LA SORTIE N'APPARAÎT QUE SI ON SAIT OÙ ELLE EST : soit qu'on ait la
     carte, soit que le phare soit visible (il l'est de partout, c'était son
     rôle depuis le 393). Ça n'ajoute donc aucune information — ça remplace un
     coup d'œil vers le ciel par un coup d'œil au ruban, ce qui compte quand on
     est dans un couloir couvert.
     -------------------------------------------------------------------- */
  function drawCompass(ctx, W, H, st) {
    ctx.clearRect(0, 0, W, H);
    const cfg = st.cfg, m = st.m;
    const SPAN = Math.PI;                       // 180° d'un bord à l'autre
    const px = (world) => {
      let d = world - st.ang;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return W / 2 + (d / SPAN) * W;
    };
    ctx.fillStyle = "rgba(10,6,20,.55)";
    ctx.fillRect(0, H - 13, W, 13);

    // graduations tous les 15°, une plus haute tous les 45°
    for (let a = 0; a < 360; a += 15) {
      const x = px(a * Math.PI / 180);
      if (x < -8 || x > W + 8) continue;
      const major = a % 45 === 0;
      ctx.fillStyle = major ? "rgba(239,231,255,.75)" : "rgba(239,231,255,.30)";
      ctx.fillRect(Math.round(x), H - (major ? 12 : 7), 2, major ? 12 : 7);
    }
    /* Les points cardinaux, écrits à la fonte 3×5 de paint.js. Une police de
       système au milieu d'un jeu tout en pixels francs se voit immédiatement —
       c'est la règle posée au 396 pour les « +60 » qui montent. */
    const glyph = (x, ch, col) => {
      const s = 2;
      const G3 = { N: ["101","111","111","101","101"], S: ["111","100","111","001","111"],
                   E: ["111","100","111","100","111"], O: ["111","101","101","101","111"] }[ch];
      if (!G3) return;
      ctx.fillStyle = col;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++)
        if (G3[r][c] === "1") ctx.fillRect(Math.round(x) - 3 + c * s, 1 + r * s, s, s);
    };
    /* ⚠️ ang = 0 fait regarder vers −Z, c'est-à-dire le NORD de la grille
       (entrée au sud, sortie au nord — voir maze.js). Les trois autres
       découlent du sens de rotation démontré au 394 : angle qui CROÎT = on
       tourne vers l'ouest. */
    glyph(px(0), "N", "#ffd36e");
    glyph(px(Math.PI / 2), "O", "rgba(239,231,255,.8)");
    glyph(px(Math.PI), "S", "rgba(239,231,255,.8)");
    glyph(px(-Math.PI / 2), "E", "rgba(239,231,255,.8)");

    const mark = (tx, ty, col) => {
      const [wx, wz] = Rules.centerOf(cfg, tx, ty);
      const a = Math.atan2(-(wx - st.px), -(wz - st.pz));
      const x = px(a);
      if (x < 2 || x > W - 2) return;
      ctx.fillStyle = col;
      // un chevron : il pointe vers le bas, donc vers le ruban
      for (let i = 0; i < 5; i++) ctx.fillRect(Math.round(x) - i, H - 20 + i * 2, 1 + i * 2, 2);
    };
    mark(m.exit.x, m.exit.y, MAPCOL.exit);
    if (m.rotunda && (st.hasMap || st.seen.has(m.idx(m.rotunda.cx, m.rotunda.cy))))
      mark(m.rotunda.cx, m.rotunda.cy, MAPCOL.rot);
  }

  /* Appelé à chaque image par game.js. Il DESSINE, il ne décide rien : la
     minicarte lit st.seen et st.hasMap, jamais une copie. */
  let mapOpen = false;
  function nav(st, playing) {
    ensureMap();
    const show2 = playing && World.fps;
    const cw = $("compass"), mw = $("miniWrap"), rt = $("reticle");
    if (cw) cw.classList.toggle("on", show2);
    if (mw) mw.classList.toggle("on", show2);
    if (rt) rt.classList.toggle("on", show2);
    if (!show2) return;

    if (MC.ctx) drawMap(MC.ctx, MC.cv.width, MC.cv.height, st,
      { rotate: true, follow: true, span: st.hasMap ? 7 : 5 });
    if (cw && cw.getContext) drawCompass(cw.getContext("2d"), cw.width, cw.height, st);

    const tag = $("miniTag");
    if (tag) {
      const v = st.hasMap ? L.mapFull : L.mapPartial;
      if (last.tag !== v) { last.tag = v; tag.textContent = v; }
    }

    /* LE RÉTICULE. Trois états, trois informations, aucune redondante :
         écarté  — on court ou l'arbalète se recharge : on ne peut pas viser ;
         rouge   — une créature est à portée d'épée ET atteignable ;
         plein   — l'arbalète est chargée.
       Le rouge passe par Rules.canTouch(), donc par le MÊME test que celui qui
       décide si le coup porte. Un réticule qui rougirait sur une créature
       derrière un mur serait pire qu'un réticule fixe : il mentirait. */
    if (rt) {
      const wide = st.runAmt > 0.4 || (st.hasBow && st.boltCd > 0);
      let hot = false;
      if (st.hasSword) {
        for (const r of st.roamers) {
          if (r.dead) continue;
          if (Math.hypot(r.x - st.px, r.z - st.pz) > st.cfg.SWING_RANGE + 1.2) continue;
          if (!Rules.canTouch(st.cfg, st.m, st.px, st.pz, r.x, r.z)) continue;
          let d = Math.atan2(-(r.x - st.px), -(r.z - st.pz)) - st.ang;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          if (Math.abs(d) < st.cfg.SWING_ARC / 2) { hot = true; break; }
        }
      }
      rt.classList.toggle("wide", wide);
      rt.classList.toggle("hot", hot);
      rt.classList.toggle("ready", st.hasBow && st.bolts > 0 && st.boltCd <= 0);
    }

    // le plan déplié : ouvert à la touche, ou tout seul au ramassage
    const open = st.hasMap && (mapOpen || st.mapT > 0);
    show("mapFull", open);
    if (open && MC.bctx) drawMap(MC.bctx, MC.big.width, MC.big.height, st,
      { rotate: false, follow: false, span: (st.m.G - 1) / 2, big: true });
  }
  function toggleMap(st) {
    if (!st || !st.hasMap) { toast(L.tipNoMap); return; }
    mapOpen = !mapOpen;
  }
  function closeMap() { mapOpen = false; }

  function toast(msg) {
    const e = $("toast");
    if (!e) return;
    e.textContent = msg;
    e.classList.add("visible");
    toastT = performance.now() + 2600;
  }
  function toastTick(now) {
    if (!toastT || now < toastT) return;
    toastT = 0;
    const e = $("toast"); if (e) e.classList.remove("visible");
  }

  /* Les évènements du moteur deviennent des messages. La table est ICI et pas
     dans rules.js : le moteur n'a pas à connaître de texte, sinon il faudrait
     lui passer la langue et il cesserait d'être vérifiable hors navigateur. */
  function events(st) {
    for (const ev of st.events) {
      if (ev.type === "sword") toast(L.tipSword);
      else if (ev.type === "revive") toast(L.tipRevive);
      else if (ev.type === "crack") toast(L.tipCrack);
      else if (ev.type === "potion") toast(L.tipPotion);
      else if (ev.type === "stalkerWake") toast(L.tipStalker);
      // Zip 396 : le renoncement s'annonce au premier pas, pas plus tôt.
      else if (ev.type === "abandonStart") toast(L.tipPlatform);
      else if (ev.type === "gateWarn") toast(L.tipGateWarn);
      else if (ev.type === "gateShut") toast(L.tipGateShut);
      else if (ev.type === "map") toast(L.tipMap);          // zip 397
      else if (ev.type === "bow") toast(L.tipBow);
      else if (ev.type === "bolts") toast(L.tipBolts);
      /* ZIP 405 — le premier carreau planté dans le traqueur, et sa chute.
         `stalkerHurt` n'est poussé QU'UNE FOIS par le moteur (au passage de
         `wounded` à vrai) : sans ça, quatre carreaux donneraient quatre fois la
         même révélation, et une révélation répétée n'en est plus une. */
      else if (ev.type === "stalkerHurt") toast(L.tipStalkerHurt);
      else if (ev.type === "stalkerDead") toast(L.tipStalkerDead);
    }
  }

  let warnedLow = false, warnedOut = false;
  function flameWarnings(st) {
    if (!warnedLow && st.flame <= st.cfg.FLAME_LOW) { warnedLow = true; toast(L.tipTorchLow); }
    if (!warnedOut && st.flame <= 0) { warnedOut = true; toast(L.tipTorchOut); }
    if (st.flame > st.cfg.FLAME_LOW) warnedLow = false;
    if (st.flame > 0) warnedOut = false;
  }

  function over(st, won) {
    const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
    set("oTitle", won ? L.winTitle : L.overTitle);
    set("deathReason", won ? L.winSub
      : st.endCause === "fall" ? L.overFall
      : st.endCause === "stalker" ? L.overStalker
      : st.endCause === "quit" ? L.overQuit
      : L.overRoamer);
    set("finalScore", st.score | 0);
    set("finalShards", st.shardsTaken | 0);
    set("finalDepth", st.seen.size);
    const isBest = (st.score | 0) > best;
    if (isBest) { best = st.score | 0; setBest(best); }
    set("finalBest", best);
    const nb = $("newBest");
    if (nb) nb.style.display = isBest ? "" : "none";
    show("gameover", true);
  }

  function lockHint(on) { const e = $("lockHint"); if (e) e.classList.toggle("on", !!on); }

  /* =========================================================================
     ZIP 399 — LE RÉGLAGE DE QUALITÉ ET LE COMPTEUR D'IMAGES.
     ====================================================================== */
  function setQuality(name) {
    qualNow = name;
    for (const id of ["qHigh", "qMed", "qLow"]) {
      const e = $(id);
      if (e) e.classList.toggle("on", e.getAttribute("data-q") === name);
    }
  }
  function onQuality(cb) {
    qualCb = cb;
    /* Les écouteurs sont posés UNE fois. onQuality() est appelé depuis boot(),
       donc une seule fois aujourd'hui — mais un jour où il le serait deux, on
       aurait deux écouteurs par bouton et le réglage s'appliquerait en double.
       C'est le genre de défaut qui ne se voit qu'au troisième clic. */
    if (perfWired) return;
    perfWired = true;
    for (const id of ["qHigh", "qMed", "qLow"]) {
      const e = $(id);
      if (!e) continue;
      e.addEventListener("click", () => { if (qualCb) qualCb(e.getAttribute("data-q")); });
    }
  }
  function hangNotice(on) { const e = $("hangNotice"); if (e) e.style.display = on ? "" : "none"; }

  /* ⚠️ LE COMPTEUR MOYENNE SUR UNE DEMI-SECONDE. Afficher l'inverse de la
     dernière image donne un nombre qui saute de 40 à 90 et qu'on ne peut pas
     lire — et surtout qu'on ne peut pas RAPPORTER. Il faut qu'une capture
     d'écran suffise à dire où on en est.
     Il ne s'allume qu'à partir de la deuxième seconde : la première contient la
     compilation des shaders, et un « 3 i/s » affiché au démarrage ferait croire
     à un problème qui n'existe plus une seconde plus tard. */
  function perf(now, p) {
    const e = $("perf");
    if (!e || !p) return;
    if (fpsLast) { fpsAcc += now - fpsLast; fpsN++; }
    fpsLast = now;
    if (fpsAcc >= 500 && fpsN > 0) {
      fpsShown = Math.round(1000 / (fpsAcc / fpsN));
      fpsAcc = 0; fpsN = 0;
      e.textContent = `${fpsShown} i/s   ${Math.round(p.res * 100)}%   ${p.pool} lampes   ${p.level}`;
      e.classList.add("on");
    }
  }

  return {
    applyLang, setBest, hud, toast, toastTick, events, flameWarnings, over, show,
    nav, toggleMap, closeMap, lockHint,
    setQuality, onQuality, hangNotice, perf,       // zip 399
    get L() { return L; }, get best() { return best; },
  };
})();
