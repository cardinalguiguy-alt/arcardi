/* =============================================================================
   rig.js — LES SQUELETTES ET LEUR ANIMATION. Zip 395.
   -----------------------------------------------------------------------------
   Retour de Guillaume : « les animations ne sont pas du tout satisfaisantes (…)
   le perso est pas assez détaillé, et l'épée non plus (…) et les ennemis non
   plus ». Les trois reproches n'en font qu'un : il n'y avait ni squelette, ni
   cycle, ni détail. Le fermier était sept boîtes dont deux bras oscillaient en
   sinus DU TEMPS, ses jambes ne bougeaient pas, et l'épée était deux boîtes.

   ⚠️ CE FICHIER NE DÉCIDE DE RIEN NON PLUS. Il construit des hiérarchies
   Three.js et calcule des ANGLES à partir de l'état produit par rules.js.
   Aucune règle de jeu, aucune collision. Il est séparé de world.js pour une
   raison de taille : world.js s'occupe du décor (2 200 maillages), rig.js des
   êtres vivants (une centaine), et ce sont deux métiers qui ne se relisent pas
   de la même façon.

   ===========================================================================
   LES TROIS PRINCIPES DE L'ANIMATION, ET POURQUOI ILS COMPTENT
   ---------------------------------------------------------------------------
   1. LE CYCLE AVANCE À LA DISTANCE, JAMAIS AU TEMPS. `st.gait` est un nombre
      de foulées cumulées, incrémenté dans rules.js par la distance RÉELLEMENT
      parcourue après collision. Un pied touche donc le sol au même endroit du
      cycle quelle que soit la vitesse, et un personnage qui pousse contre un
      mur cesse de pédaler. C'est la seule différence entre « il marche » et
      « il glisse », et aucune quantité de détail ne rattrape ça.

   2. TOUT PASSE PAR UNE HIÉRARCHIE DE JOINTS. Un membre est un Group placé à
      l'articulation, dont l'enfant pend vers le bas. Faire tourner le Group
      fait pivoter le membre AUTOUR de l'épaule ou de la hanche, et non autour
      de son centre — la différence entre un bras et une planche qui bascule.

   3. LES CONTRAIRES SE RÉPONDENT. Bras gauche avec jambe droite ; le bassin
      tourne d'un côté, le buste de l'autre, la tête compense pour garder le
      regard droit. C'est ce contre-balancement qui fait lire une démarche ;
      sans lui on obtient un pantin qui rame.

   ⚠️ AUCUN DE CES TROIS POINTS N'EST VÉRIFIABLE PAR UN OUTIL. tools/
   verify-anim.mjs contrôle ce qui est contrôlable — que les pieds ne patinent
   pas, que rien ne parte à l'infini, que le cycle boucle — mais l'allure se
   juge à l'œil, et seulement à l'œil.
   ========================================================================== */

const Rig = (function () {

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  // Sortie d'accélération : rapide au début, molle à la fin. C'est la courbe
  // d'un coup d'épée, d'un pas qui se pose, d'une tête qui se tourne.
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const easeIn = (k) => k * k;

  let T; // THREE, injecté à la construction

  /* Un JOINT : un Group vide, placé à l'articulation. On lui accroche des
     volumes qui pendent ; le faire tourner fait pivoter tout ce qui suit. */
  function joint(x, y, z) {
    const g = new T.Group();
    g.position.set(x, y, z);
    return g;
  }
  /* Un VOLUME accroché sous un joint : sa hauteur `h` descend depuis le joint,
     d'où le décalage de -h/2. `up` remonte au contraire au-dessus du joint. */
  function limb(w, h, d, mat, up) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.y = up ? h / 2 : -h / 2;
    return m;
  }
  function box(w, h, d, mat, x, y, z) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }
  const lam = (c) => new T.MeshLambertMaterial({ color: c });
  const bas = (c) => new T.MeshBasicMaterial({ color: c, fog: false });

  /* =======================================================================
     L'ÉPÉE — vingt volumes au lieu de deux.
     -----------------------------------------------------------------------
     « et l'épée non plus, c'est pas du travail suffisant ». Elle avait une
     lame et une garde. Une épée qu'on regarde toute la partie, tenue au
     premier plan, mérite le vocabulaire complet : pommeau, filet de poignée,
     garde à quillons relevés, talon, gouttière (le creux central de la lame),
     tranchants clairs, pointe en biseau, et des runes qui répondent au violet
     du lac.

     LA GOUTTIÈRE EST CE QUI FAIT LA LAME. Sans elle, une lame en boîte se lit
     comme une règle en plastique : c'est le liseré sombre au milieu et les
     deux arêtes claires sur les bords qui donnent l'acier.
     ======================================================================= */
  function buildSword(cfg, scale) {
    const s = scale || 1;
    const g = new T.Group();
    const steel = lam(cfg.COL_STEEL);
    const edge = bas(cfg.COL_STEEL);            // tranchants : hors brouillard
    const dark = lam(cfg.COL_STEEL_EDGE);
    const grip = lam(0x2a1d14);
    const gold = lam(0xb08d3c);

    g.add(box(0.26 * s, 0.22 * s, 0.26 * s, gold, 0, -0.62 * s, 0));      // pommeau
    g.add(box(0.30 * s, 0.10 * s, 0.30 * s, gold, 0, -0.50 * s, 0));      // collet
    g.add(box(0.17 * s, 0.62 * s, 0.17 * s, grip, 0, -0.18 * s, 0));      // poignée
    for (let i = 0; i < 4; i++)                                            // filet
      g.add(box(0.19 * s, 0.035 * s, 0.19 * s, dark, 0, (-0.38 + i * 0.14) * s, 0));
    g.add(box(0.86 * s, 0.13 * s, 0.20 * s, gold, 0, 0.15 * s, 0));       // quillons
    g.add(box(0.16 * s, 0.16 * s, 0.22 * s, gold, -0.44 * s, 0.20 * s, 0));
    g.add(box(0.16 * s, 0.16 * s, 0.22 * s, gold, 0.44 * s, 0.20 * s, 0));
    g.add(box(0.26 * s, 0.16 * s, 0.15 * s, dark, 0, 0.28 * s, 0));       // talon

    // LAME : trois tronçons qui s'affinent, plus la pointe. Un seul volume
    // effilé n'existe pas en boîtes ; l'étagement, si, et il se lit mieux.
    const seg = [
      { y: 0.72, h: 0.72, w: 0.30 },
      { y: 1.40, h: 0.66, w: 0.26 },
      { y: 2.00, h: 0.56, w: 0.21 },
    ];
    for (const sg of seg) {
      g.add(box(sg.w * s, sg.h * s, 0.085 * s, steel, 0, sg.y * s, 0));
      // GOUTTIÈRE : le creux sombre au centre, sur les deux faces.
      g.add(box(sg.w * 0.34 * s, sg.h * 0.94 * s, 0.11 * s, dark, 0, sg.y * s, 0));
      // TRANCHANTS : deux arêtes claires, hors brouillard pour qu'elles
      // accrochent la lumière même au fond d'un couloir.
      g.add(box(0.035 * s, sg.h * s, 0.10 * s, edge, -sg.w / 2 * s, sg.y * s, 0));
      g.add(box(0.035 * s, sg.h * s, 0.10 * s, edge, sg.w / 2 * s, sg.y * s, 0));
    }
    g.add(box(0.15 * s, 0.20 * s, 0.075 * s, steel, 0, 2.38 * s, 0));     // pointe
    g.add(box(0.07 * s, 0.12 * s, 0.07 * s, edge, 0, 2.52 * s, 0));

    // RUNES : trois encoches violettes au talon, hors brouillard. Elles
    // rappellent les stèles des brasiers — c'est la même magie.
    const rune = bas(cfg.COL_RUNE);
    for (let i = 0; i < 3; i++)
      g.add(box(0.10 * s, 0.10 * s, 0.12 * s, rune, 0, (0.50 + i * 0.20) * s, 0));

    return g;
  }

  /* =======================================================================
     LE FERMIER — quarante volumes, huit joints animés.
     ======================================================================= */
  function buildFarmer(cfg, tex, sk) {
    const c = sk || {};
    const skinC = c.skin || cfg.COL_SKIN, shirt = c.shirt || cfg.COL_SHIRT;
    const pants = c.pants || cfg.COL_PANTS, hairC = c.hair || cfg.COL_HAIR;
    const mSkin = lam(skinC), mShirt = lam(shirt), mPants = lam(pants), mHair = lam(hairC);
    const mBoot = lam(0x3a2a1c), mBelt = lam(0x4a3524), mBuckle = lam(0xb08d3c);

    const root = new T.Group();
    const hips = joint(0, 1.02, 0); root.add(hips);

    // --- BUSTE (pivote à la taille)
    const torso = joint(0, 0, 0); hips.add(torso);
    const chest = box(0.94, 0.78, 0.52, mShirt, 0, 0.42, 0); torso.add(chest);
    torso.add(box(0.98, 0.16, 0.56, mBelt, 0, 0.06, 0));
    torso.add(box(0.20, 0.14, 0.60, mBuckle, 0, 0.06, 0));
    torso.add(box(0.86, 0.30, 0.50, mShirt, 0, 0.90, 0));           // haut de poitrine
    torso.add(box(0.22, 0.70, 0.56, lam(0x6b5334), -0.22, 0.55, 0)); // bretelle
    torso.add(box(1.06, 0.22, 0.54, mShirt, 0, 0.98, 0));           // épaules

    // --- COU ET TÊTE
    const neck = joint(0, 1.10, 0); torso.add(neck);
    neck.add(box(0.26, 0.20, 0.26, mSkin, 0, 0.10, 0));
    const head = joint(0, 0.20, 0); neck.add(head);
    head.add(box(0.66, 0.62, 0.60, mSkin, 0, 0.31, 0));
    head.add(box(0.14, 0.12, 0.10, mSkin, 0, 0.28, -0.33));          // nez
    head.add(box(0.13, 0.10, 0.05, bas(0x1b1520), -0.16, 0.36, -0.31)); // œil G
    head.add(box(0.13, 0.10, 0.05, bas(0x1b1520), 0.16, 0.36, -0.31));  // œil D
    head.add(box(0.72, 0.20, 0.66, mHair, 0, 0.60, 0.02));           // cheveux
    head.add(box(0.70, 0.30, 0.14, mHair, 0, 0.40, 0.30));           // nuque (DERRIÈRE)
    head.add(box(0.16, 0.26, 0.16, mHair, -0.36, 0.42, 0.06));       // mèches
    head.add(box(0.16, 0.26, 0.16, mHair, 0.36, 0.42, 0.06));

    // --- BRAS. Trois segments par bras : épaule → coude → poignet.
    function arm(side) {
      const sh = joint(side * 0.58, 0.92, 0); torso.add(sh);
      sh.add(box(0.30, 0.26, 0.32, mShirt, 0, -0.02, 0));            // moignon d'épaule
      const up = limb(0.24, 0.52, 0.24, mShirt); sh.add(up);
      const el = joint(0, -0.52, 0); sh.add(el);
      const fo = limb(0.21, 0.46, 0.21, mSkin); el.add(fo);
      const wr = joint(0, -0.46, 0); el.add(wr);
      wr.add(box(0.24, 0.20, 0.24, mSkin, 0, -0.08, 0));             // main
      return { sh, el, wr };
    }
    const armL = arm(-1), armR = arm(1);

    // --- JAMBES. Cuisse → genou → cheville → pied.
    function leg(side) {
      const hip = joint(side * 0.26, -0.06, 0); hips.add(hip);
      const th = limb(0.32, 0.54, 0.32, mPants); hip.add(th);
      const kn = joint(0, -0.54, 0); hip.add(kn);
      const sh = limb(0.27, 0.50, 0.27, mPants); kn.add(sh);
      const an = joint(0, -0.50, 0); kn.add(an);
      an.add(box(0.32, 0.20, 0.46, mBoot, 0, -0.10, -0.08));         // botte
      an.add(box(0.34, 0.10, 0.16, lam(0x241a12), 0, -0.16, -0.22)); // semelle avant
      return { hip, kn, an };
    }
    const legL = leg(-1), legR = leg(1);

    // --- TORCHE, main gauche
    const torch = new T.Group();
    const woodMat = new T.MeshLambertMaterial({ map: tex.wood });
    torch.add(box(0.13, 1.15, 0.13, woodMat, 0, 0.30, 0));
    torch.add(box(0.20, 0.10, 0.20, lam(0x3a2a1c), 0, 0.86, 0));     // virole
    torch.add(box(0.24, 0.26, 0.24, lam(0x1a1512), 0, 1.02, 0));     // tête carbonisée
    armL.wr.add(torch);
    torch.position.set(0, -0.18, 0);
    torch.rotation.x = -0.35;

    // --- ÉPÉE, main droite
    const sword = buildSword(cfg, 0.82);
    armR.wr.add(sword);
    sword.position.set(0, -0.28, 0);
    sword.visible = false;

    return {
      root, hips, torso, chest, neck, head, armL, armR, legL, legR,
      torch, sword,
      kind: "farmer",
    };
  }

  /* =======================================================================
     poseFarmer — LE CYCLE DE MARCHE.
     -----------------------------------------------------------------------
     `v` est une VUE INTERPOLÉE de l'état (voir world.js) : px, pz, ang, gait,
     gaitSpeed, runAmt, strafeAmt, backAmt, swingT, hurt, falling.
     ======================================================================= */
  function poseFarmer(r, v, cfg, t) {
    const p = v.gait * TAU;
    // `amp` : 0 à l'arrêt, 1 en marche, ~1,55 en course. C'est lui qui fait
    // qu'un pas de course est plus ample qu'un pas de marche, sans changer
    // une seule ligne du cycle.
    const amp = clamp(v.gaitSpeed / cfg.WALK_SPEED, 0, 1.6);
    const moving = amp > 0.06;
    const sinP = Math.sin(p), cosP = Math.cos(p);

    // ---- JAMBES
    /* La cuisse balaie en sinus ; le GENOU ne se plie que vers l'arrière et
       seulement pendant la phase de retour — un genou qui se plie dans les
       deux sens donne une jambe cassée, et c'est immédiatement visible. */
    const swing = cfg.GAIT_SWING * amp;
    const knee = cfg.GAIT_KNEE * amp;
    r.legL.hip.rotation.x = sinP * swing;
    r.legR.hip.rotation.x = -sinP * swing;
    r.legL.kn.rotation.x = -Math.max(0, Math.sin(p - 0.75)) * knee;
    r.legR.kn.rotation.x = -Math.max(0, Math.sin(p + Math.PI - 0.75)) * knee;
    // La cheville rattrape pour que la semelle reste à plat au contact.
    r.legL.an.rotation.x = -r.legL.hip.rotation.x * 0.45 - r.legL.kn.rotation.x * 0.5;
    r.legR.an.rotation.x = -r.legR.hip.rotation.x * 0.45 - r.legR.kn.rotation.x * 0.5;

    // ---- BASSIN : deux montées par foulée (une par pas), plus un affaissement
    // proportionnel à la vitesse — on se tasse quand on court.
    r.hips.position.y = 1.02 + Math.abs(Math.sin(p * 2)) * cfg.GAIT_BOB * amp - amp * 0.06;
    r.hips.rotation.y = sinP * 0.13 * amp;

    // ---- BUSTE : contre-rotation, roulis, et inclinaisons
    const lean = cfg.LEAN_RUN * v.runAmt + 0.06 * amp - 0.14 * v.backAmt;
    r.torso.rotation.y = -sinP * 0.17 * amp;
    r.torso.rotation.z = cosP * cfg.GAIT_ROLL * amp - v.strafeAmt * cfg.LEAN_STRAFE;
    r.torso.rotation.x = lean - cfg.HURT_RECOIL * v.hurt;
    // Respiration au repos : elle n'existe QUE quand on ne bouge pas, sinon
    // elle se mélange au cycle et donne un torse qui palpite en courant.
    const breath = moving ? 0 : Math.sin(t * 1.7) * cfg.IDLE_BREATH;
    r.chest.scale.set(1 + breath, 1 + breath * 0.6, 1 + breath);

    // ---- TÊTE : elle stabilise le regard. Un personnage dont la tête suit le
    // buste donne le mal de mer ; une tête qui compense donne un être vivant.
    r.head.rotation.y = -r.torso.rotation.y * 0.7 + (moving ? 0 : Math.sin(t * 0.6) * 0.22);
    r.head.rotation.x = -lean * 0.6 + (moving ? Math.abs(sinP) * 0.05 : 0);
    r.head.rotation.z = -r.torso.rotation.z * 0.5;

    // ---- BRAS GAUCHE : il porte la torche, donc il ne balance PAS comme un
    // bras libre. Il reste tendu devant, avec une oscillation légère — c'est
    // ce qui fait qu'on lit « il éclaire son chemin » et pas « il court ».
    r.armL.sh.rotation.x = -0.95 - sinP * cfg.GAIT_ARM * 0.28 * amp;
    r.armL.sh.rotation.z = 0.28 + (moving ? 0 : Math.sin(t * 1.3) * cfg.IDLE_SWAY);
    r.armL.el.rotation.x = -0.55 + Math.sin(p + 1.2) * 0.10 * amp;
    r.armL.wr.rotation.z = Math.sin(t * 2.1) * 0.06;   // la flamme tremble

    // ---- BRAS DROIT : libre, ou en train de frapper.
    const swingDur = cfg.SWING_MS / 1000;
    if (v.swingT > 0) {
      /* L'ATTAQUE EN TROIS TEMPS. Sans armé, un coup n'a pas de poids ; sans
         récupération, il n'a pas de contrecoup. Les deux comptent autant que
         le coup lui-même, et c'est ce qui manquait entièrement. */
      const k = 1 - v.swingT / swingDur;
      let armX, twist, wrist;
      if (k < cfg.SWING_WINDUP) {
        const u = easeIn(k / cfg.SWING_WINDUP);
        armX = lerp(-0.30, -2.35, u);      // l'épée part loin en arrière
        twist = lerp(0, cfg.SWING_TWIST, u);
        wrist = lerp(0, -0.8, u);
      } else if (k < cfg.SWING_STRIKE) {
        const u = easeOut((k - cfg.SWING_WINDUP) / (cfg.SWING_STRIKE - cfg.SWING_WINDUP));
        armX = lerp(-2.35, 0.95, u);       // le coup : très rapide
        twist = lerp(cfg.SWING_TWIST, -cfg.SWING_TWIST * 0.7, u);
        wrist = lerp(-0.8, 0.5, u);
      } else {
        const u = easeOut((k - cfg.SWING_STRIKE) / (1 - cfg.SWING_STRIKE));
        armX = lerp(0.95, -0.30, u);       // on se remet en garde
        twist = lerp(-cfg.SWING_TWIST * 0.7, 0, u);
        wrist = lerp(0.5, 0, u);
      }
      r.armR.sh.rotation.x = armX;
      r.armR.sh.rotation.z = -0.12;
      r.armR.el.rotation.x = -0.35 - Math.abs(twist) * 0.3;
      r.armR.wr.rotation.z = wrist;
      r.torso.rotation.y += twist;
      r.hips.rotation.y += twist * 0.3;    // les hanches suivent, en retard
    } else {
      // En garde quand on est armé, ballant sinon.
      const guard = r.sword.visible ? -0.30 : 0;
      r.armR.sh.rotation.x = guard + sinP * cfg.GAIT_ARM * amp;
      r.armR.sh.rotation.z = -0.10 + (moving ? 0 : Math.sin(t * 1.3 + 2) * cfg.IDLE_SWAY);
      r.armR.el.rotation.x = (r.sword.visible ? -0.75 : -0.25) - Math.max(0, cosP) * 0.30 * amp;
      r.armR.wr.rotation.z = 0;
    }

    // ---- CHUTE : tout se désarticule vers le haut. C'est bref (FALL_MS) mais
    // c'est le seul moment où le personnage n'est plus maître de rien.
    if (v.falling) {
      const f = t * 9;
      r.armL.sh.rotation.x = -2.4 + Math.sin(f) * 0.5;
      r.armR.sh.rotation.x = -2.4 + Math.sin(f + 2) * 0.5;
      r.legL.hip.rotation.x = Math.sin(f + 1) * 0.9;
      r.legR.hip.rotation.x = Math.sin(f + 3) * 0.9;
      r.torso.rotation.x = -0.5 + Math.sin(f * 0.7) * 0.3;
    }
  }

  /* =======================================================================
     LE RÔDEUR — une carcasse voûtée, pas une boîte à yeux.
     -----------------------------------------------------------------------
     « et les ennemis non plus » : il avait un tronc, une tête et deux bras
     droits. Il a maintenant un bassin, une colonne, une cage thoracique
     apparente (quatre côtes), un crâne à mâchoire ARTICULÉE, deux cornes,
     des bras à trois griffes, et des jambes DIGITIGRADES — la jambe pliée
     vers l'arrière, comme un bouc. C'est cette jambe-là qui le rend non
     humain d'un seul coup d'œil, bien plus que la couleur.
     ======================================================================= */
  function buildRoamer(cfg) {
    const bone = lam(0x1b1712), dark = lam(cfg.COL_WOLF), horn = lam(0x2e2822);
    const root = new T.Group();
    const hips = joint(0, 1.30, 0); root.add(hips);
    hips.add(box(0.72, 0.34, 0.44, dark, 0, 0, 0));                  // bassin

    const spine = joint(0, 0.16, 0); hips.add(spine);
    spine.add(box(0.60, 0.66, 0.44, dark, 0, 0.33, 0.06));           // dos voûté
    for (let i = 0; i < 4; i++)                                       // côtes
      spine.add(box(0.66 - i * 0.05, 0.07, 0.40, bone, 0, 0.16 + i * 0.16, -0.06));
    spine.add(box(0.86, 0.20, 0.34, dark, 0, 0.70, 0.04));           // épaules

    const neck = joint(0, 0.76, -0.10); spine.add(neck);
    neck.add(box(0.24, 0.26, 0.24, bone, 0, 0.13, 0));
    const skull = joint(0, 0.26, 0); neck.add(skull);
    skull.add(box(0.52, 0.36, 0.62, bone, 0, 0.16, -0.10));          // crâne allongé
    skull.add(box(0.20, 0.30, 0.20, horn, -0.22, 0.40, 0.02));       // corne G
    skull.add(box(0.20, 0.30, 0.20, horn, 0.22, 0.40, 0.02));        // corne D
    skull.add(box(0.12, 0.20, 0.12, horn, -0.24, 0.60, 0.06));
    skull.add(box(0.12, 0.20, 0.12, horn, 0.24, 0.60, 0.06));
    const eyeL = box(0.13, 0.11, 0.06, bas(cfg.COL_WOLF_EYE), -0.14, 0.20, -0.40);
    const eyeR = box(0.13, 0.11, 0.06, bas(cfg.COL_WOLF_EYE), 0.14, 0.20, -0.40);
    skull.add(eyeL); skull.add(eyeR);
    const jaw = joint(0, 0.05, -0.12); skull.add(jaw);               // MÂCHOIRE
    jaw.add(box(0.44, 0.16, 0.46, bone, 0, -0.06, -0.16));
    for (let i = 0; i < 3; i++)                                       // crocs
      jaw.add(box(0.06, 0.12, 0.06, bas(0xd8d0c0), -0.14 + i * 0.14, 0.04, -0.34));

    function arm(side) {
      const sh = joint(side * 0.46, 0.66, 0); spine.add(sh);
      const up = limb(0.19, 0.52, 0.19, dark); sh.add(up);
      const el = joint(0, -0.52, 0); sh.add(el);
      const fo = limb(0.16, 0.48, 0.16, dark); el.add(fo);
      const wr = joint(0, -0.48, 0); el.add(wr);
      for (let i = -1; i <= 1; i++)                                   // trois griffes
        wr.add(box(0.06, 0.26, 0.06, bas(0xc9c0ae), i * 0.09, -0.13, -0.04));
      return { sh, el, wr };
    }
    const armL = arm(-1), armR = arm(1);

    function leg(side) {
      const hip = joint(side * 0.24, -0.14, 0); hips.add(hip);
      const th = limb(0.26, 0.52, 0.26, dark); hip.add(th);
      const kn = joint(0, -0.52, 0); hip.add(kn);
      const sh = limb(0.21, 0.48, 0.21, dark); kn.add(sh);
      const an = joint(0, -0.48, 0); kn.add(an);
      an.add(box(0.24, 0.16, 0.40, bone, 0, -0.08, -0.10));           // pied
      for (let i = -1; i <= 1; i++)
        an.add(box(0.05, 0.06, 0.14, bas(0xc9c0ae), i * 0.08, -0.14, -0.30));
      return { hip, kn, an };
    }
    const legL = leg(-1), legR = leg(1);

    return { root, hips, spine, neck, skull, jaw, armL, armR, legL, legR, kind: "roamer" };
  }

  function poseRoamer(r, v, cfg, t) {
    const p = v.gait * TAU;
    const amp = clamp(v.gaitSpeed / cfg.ROAMER_SPEED, 0, 1.5);
    const sinP = Math.sin(p), cosP = Math.cos(p);
    const chasing = v.chasing ? 1 : 0;

    /* JAMBE DIGITIGRADE : la cuisse va vers l'AVANT, le genou plie vers
       l'ARRIÈRE, la cheville rattrape. C'est le décalage entre les trois qui
       fait la démarche de bête ; en phase, on obtient un homme en costume. */
    r.legL.hip.rotation.x = 0.35 + sinP * 0.75 * amp;
    r.legR.hip.rotation.x = 0.35 - sinP * 0.75 * amp;
    r.legL.kn.rotation.x = -0.75 - Math.max(0, Math.sin(p - 0.5)) * 0.9 * amp;
    r.legR.kn.rotation.x = -0.75 - Math.max(0, Math.sin(p + Math.PI - 0.5)) * 0.9 * amp;
    r.legL.an.rotation.x = 0.5 - r.legL.kn.rotation.x * 0.6;
    r.legR.an.rotation.x = 0.5 - r.legR.kn.rotation.x * 0.6;

    r.hips.position.y = 1.30 + Math.abs(Math.sin(p * 2)) * 0.09 * amp - 0.16 * chasing;
    r.hips.rotation.y = sinP * 0.10 * amp;

    // Il se VOÛTE quand il chasse : le dos plonge, la tête part en avant.
    r.spine.rotation.x = 0.30 + 0.38 * chasing + Math.sin(p * 2) * 0.05 * amp;
    r.spine.rotation.y = -sinP * 0.14 * amp;
    r.neck.rotation.x = -0.42 - 0.30 * chasing;
    r.skull.rotation.x = -0.15 + Math.sin(t * 1.9) * 0.06;
    r.skull.rotation.y = Math.sin(t * 0.8) * 0.18 * (1 - chasing);   // il cherche
    // La mâchoire s'ouvre quand il chasse, et claque au rythme du pas.
    r.jaw.rotation.x = 0.10 + chasing * (0.35 + Math.max(0, Math.sin(p * 2)) * 0.28);

    // Bras longs, opposés aux jambes, pliés vers l'avant en chasse.
    r.armL.sh.rotation.x = -0.25 - sinP * 0.55 * amp - 0.55 * chasing;
    r.armR.sh.rotation.x = -0.25 + sinP * 0.55 * amp - 0.55 * chasing;
    r.armL.sh.rotation.z = 0.22; r.armR.sh.rotation.z = -0.22;
    r.armL.el.rotation.x = -0.45 - 0.5 * chasing;
    r.armR.el.rotation.x = -0.45 - 0.5 * chasing;

    // SONNÉ : il part en arrière, bras écartés. C'est la lisibilité du coup
    // réussi — sans elle, on ne sait pas si on a touché.
    if (v.stagger > 0) {
      const k = clamp(v.stagger, 0, 1);
      r.spine.rotation.x -= k * 0.7;
      r.armL.sh.rotation.x -= k * 1.2;
      r.armR.sh.rotation.x -= k * 1.2;
      r.jaw.rotation.x = 0.6 * k;
    }
    // MORT : il s'affaisse et s'enfonce. `deadT` monte, on ne le remet jamais.
    if (v.dead) {
      const k = clamp(v.deadT * 2.2, 0, 1);
      r.root.rotation.x = k * 1.45;
      r.root.position.y = -k * 0.55;
    } else {
      r.root.rotation.x = 0; r.root.position.y = 0;
    }
  }

  /* =======================================================================
     LE TRAQUEUR — une silhouette, pas un monstre.
     -----------------------------------------------------------------------
     Tout est étiré : jambes hautes, buste étroit, cou long, crâne allongé,
     bras qui descendent SOUS les genoux. Il ne marche pas comme les autres —
     il GLISSE, avec une flottaison lente et des bras qui pendent. Sa lisibilité
     tient à trois choses et trois seulement : la hauteur, les deux fentes
     rouges hors brouillard, et les lambeaux qui traînent derrière lui.
     ======================================================================= */
  function buildStalker(cfg) {
    const body = lam(cfg.COL_STALKER), rag = lam(0x120e1a);
    const root = new T.Group();
    const hips = joint(0, 2.05, 0); root.add(hips);
    hips.add(box(0.52, 0.30, 0.38, body, 0, 0, 0));

    const spine = joint(0, 0.14, 0); hips.add(spine);
    spine.add(box(0.56, 1.05, 0.42, body, 0, 0.52, 0));
    spine.add(box(0.86, 0.18, 0.34, body, 0, 1.06, 0));
    // LAMBEAUX : six bandes de longueurs différentes, animées en retard sur le
    // mouvement. C'est ce qui donne l'impression qu'il se déplace SANS marcher.
    const rags = [];
    for (let i = 0; i < 6; i++) {
      const j = joint(-0.30 + (i % 3) * 0.30, 0.95, i < 3 ? 0.20 : -0.20);
      const len = 1.1 + (i % 3) * 0.45;
      j.add(box(0.26, len, 0.06, rag, 0, -len / 2, 0));
      spine.add(j); rags.push(j);
    }

    const neck = joint(0, 1.14, 0); spine.add(neck);
    neck.add(box(0.20, 0.46, 0.20, body, 0, 0.23, 0));
    const skull = joint(0, 0.46, 0); neck.add(skull);
    skull.add(box(0.42, 0.56, 0.50, body, 0, 0.26, -0.04));
    skull.add(box(0.34, 0.20, 0.24, body, 0, 0.06, -0.28));          // museau
    const eyeL = box(0.09, 0.26, 0.05, bas(cfg.COL_STALKER_EYE), -0.12, 0.30, -0.27);
    const eyeR = box(0.09, 0.26, 0.05, bas(cfg.COL_STALKER_EYE), 0.12, 0.30, -0.27);
    skull.add(eyeL); skull.add(eyeR);

    function arm(side) {
      const sh = joint(side * 0.44, 1.02, 0); spine.add(sh);
      const up = limb(0.15, 0.95, 0.15, body); sh.add(up);
      const el = joint(0, -0.95, 0); sh.add(el);
      const fo = limb(0.13, 0.90, 0.13, body); el.add(fo);
      const wr = joint(0, -0.90, 0); el.add(wr);
      for (let i = -1; i <= 1; i++)
        wr.add(box(0.05, 0.42, 0.05, body, i * 0.09, -0.21, 0));     // doigts très longs
      return { sh, el, wr };
    }
    const armL = arm(-1), armR = arm(1);

    function leg(side) {
      const hip = joint(side * 0.20, -0.12, 0); hips.add(hip);
      const th = limb(0.19, 1.00, 0.19, body); hip.add(th);
      const kn = joint(0, -1.00, 0); hip.add(kn);
      const sh = limb(0.16, 0.95, 0.16, body); kn.add(sh);
      const an = joint(0, -0.95, 0); kn.add(an);
      an.add(box(0.20, 0.12, 0.42, body, 0, -0.06, -0.12));
      return { hip, kn, an };
    }
    const legL = leg(-1), legR = leg(1);

    return { root, hips, spine, neck, skull, armL, armR, legL, legR, rags, eyeL, eyeR, kind: "stalker" };
  }

  function poseStalker(r, v, cfg, t) {
    const p = v.gait * TAU;
    const amp = clamp(v.gaitSpeed / cfg.STALK_SPEED, 0, 1.4);
    const sinP = Math.sin(p);

    // Pas TRÈS long et lent : ses jambes font deux fois celles du fermier, il
    // couvre donc la même distance en deux fois moins de pas. On divise
    // l'angle plutôt que d'allonger la foulée — c'est la même chose, mais
    // c'est celui-là qui se lit comme une enjambée.
    r.legL.hip.rotation.x = sinP * 0.62 * amp;
    r.legR.hip.rotation.x = -sinP * 0.62 * amp;
    r.legL.kn.rotation.x = -Math.max(0, Math.sin(p - 0.9)) * 0.75 * amp;
    r.legR.kn.rotation.x = -Math.max(0, Math.sin(p + Math.PI - 0.9)) * 0.75 * amp;

    // FLOTTAISON : il ne pose pas ses pieds franchement. Une oscillation lente
    // indépendante du pas, qui subsiste même à l'arrêt.
    r.root.position.y = Math.sin(t * 1.5) * 0.14;
    r.hips.position.y = 2.05 + Math.abs(Math.sin(p * 2)) * 0.06 * amp;

    r.spine.rotation.x = 0.10 + amp * 0.14;
    r.spine.rotation.y = -sinP * 0.09 * amp;
    r.neck.rotation.x = -0.12 - amp * 0.10;
    // La tête TOURNE VERS LE JOUEUR, toujours. C'est le détail qui fait qu'on
    // se sent regardé — et il ne coûte qu'un angle relatif.
    r.skull.rotation.y = clamp(v.toPlayer || 0, -1.1, 1.1);
    r.skull.rotation.x = -0.08 + Math.sin(t * 0.9) * 0.05;

    // Bras qui pendent et balaient très lentement, à contretemps des jambes.
    r.armL.sh.rotation.x = -sinP * 0.30 * amp + Math.sin(t * 0.8) * 0.08;
    r.armR.sh.rotation.x = sinP * 0.30 * amp + Math.sin(t * 0.8 + 1.6) * 0.08;
    r.armL.sh.rotation.z = 0.10; r.armR.sh.rotation.z = -0.10;
    r.armL.el.rotation.x = -0.22 + Math.sin(t * 1.1) * 0.10;
    r.armR.el.rotation.x = -0.22 + Math.sin(t * 1.1 + 2) * 0.10;

    // LAMBEAUX : chacun en retard sur le précédent. Le retard est ce qui fait
    // le tissu ; tous en phase, on obtient une jupe rigide.
    for (let i = 0; i < r.rags.length; i++) {
      const lag = i * 0.42;
      r.rags[i].rotation.x = -amp * 0.30 + Math.sin(t * 2.1 - lag) * (0.06 + amp * 0.14);
      r.rags[i].rotation.z = Math.sin(t * 1.4 - lag) * 0.09;
    }

    // SONNÉ : il se cabre en arrière. Il ne meurt jamais — c'est tout ce
    // qu'on obtient de lui, et il faut que ça se voie.
    if (v.stagger > 0) {
      const k = clamp(v.stagger, 0, 1);
      r.spine.rotation.x -= k * 0.8;
      r.armL.sh.rotation.x -= k * 1.4;
      r.armR.sh.rotation.x -= k * 1.4;
      r.neck.rotation.x += k * 0.6;
    }
  }

  return {
    init(three) { T = three; },
    buildFarmer, poseFarmer,
    buildRoamer, poseRoamer,
    buildStalker, poseStalker,
    buildSword,
    clamp, lerp, TAU,
  };
})();

if (typeof module === "object" && module.exports) module.exports = { Rig };
