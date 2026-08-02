/* =============================================================================
   rig.js — LES SQUELETTES ET LEUR ANIMATION. Zips 395 et 396.
   -----------------------------------------------------------------------------
   ⚠️ CE FICHIER NE DÉCIDE DE RIEN. Il construit des hiérarchies Three.js et
   calcule des ANGLES à partir de l'état produit par rules.js. Aucune règle de
   jeu, aucune collision. Il est séparé de world.js pour une raison de taille :
   world.js s'occupe du décor (2 200 maillages), rig.js des êtres vivants (une
   centaine), et ce sont deux métiers qui ne se relisent pas de la même façon.

   ===========================================================================
   ⚠️⚠️ ZIP 396 — LA CONVENTION DE SIGNE, ÉCRITE UNE FOIS POUR TOUTES
   ---------------------------------------------------------------------------
   Retour de Guillaume au 395 : « l'épée rentre dans le corps. Les bras semblent
   retournés, pas articulés dans le bon sens ». Les deux reproches n'en font
   qu'un, et la cause tient en trois lignes.

   LE FERMIER REGARDE VERS -Z (son nez est à z négatif, sa nuque à z positif ;
   world.js pose player.rotation.y = st.ang, et le vecteur avant du moteur vaut
   (-sin ang, -cos ang), donc -Z à ang = 0).

   Pour un JOINT dont l'enfant pend vers le bas :
       rotation.x POSITIVE  → l'extrémité part vers l'AVANT  (-Z)
       rotation.x NÉGATIVE  → l'extrémité part vers l'ARRIÈRE (+Z)

   D'où la règle, et c'est elle qui manquait :
       le GENOU plie vers l'ARRIÈRE  → rotation.x NÉGATIVE
       le COUDE plie vers l'AVANT    → rotation.x POSITIVE
   Les deux articulations ont donc des signes OPPOSÉS. Le zip 395 leur donnait
   le même : les coudes se pliaient en arrière (bras « retournés »), la main
   gauche portait la torche DERRIÈRE le dos (z = +0,85 relevé en cinématique
   directe), et le bras droit tenait la garde derrière le corps.

   ⚠️ ET L'ÉPÉE N'AVAIT AUCUNE ROTATION PROPRE. Elle était accrochée au poignet
   à (0, -0,28, 0), lame le long de son +Y local — c'est-à-dire pointant vers
   le HAUT DU BRAS. La lame remontait donc l'avant-bras, traversait l'épaule et
   ressortait par la tête : 9 instants sur 21 du coup d'épée avaient la lame
   dans le buste, les épaules ou le crâne. Elle passe maintenant par un joint
   dédié (`grip`) que poseFarmer oriente, et la lame PROLONGE l'avant-bras.

   Idem pour la torche : elle passe par un joint (`torchJ`) dont l'angle est
   calculé pour ANNULER celui du bras. Elle reste donc verticale quoi que fasse
   le fermier, tout en héritant du déplacement de la main — c'est ce que fait
   quelqu'un qui porte un flambeau, et ça se règle tout seul si un jour on
   change la pose du bras.

   ⚠️ CE FICHIER EST DÉSORMAIS VÉRIFIÉ PAR tools/verify-rig.mjs, qui construit
   le VRAI squelette contre un faux Three.js, calcule les boîtes en repère
   monde et ÉCHOUE si un volume entre dans un autre. Il pose ses questions en
   français (« la torche est-elle devant ? », « le coude plie-t-il vers
   l'avant ? ») parce qu'un contrôle qui partage la convention du code qu'il
   vérifie ne vérifie rien (leçon du 394).

   ===========================================================================
   LES TROIS PRINCIPES D'ANIMATION, INCHANGÉS DEPUIS LE 395
   ---------------------------------------------------------------------------
   1. LE CYCLE AVANCE À LA DISTANCE, JAMAIS AU TEMPS. `st.gait` est incrémenté
      dans rules.js par la distance RÉELLEMENT parcourue après collision. Un
      pied touche le sol au même endroit du cycle quelle que soit la vitesse,
      et un personnage qui pousse un mur cesse de pédaler.
   2. TOUT PASSE PAR UNE HIÉRARCHIE DE JOINTS. Un membre est un Group placé à
      l'articulation. Faire tourner le Group fait pivoter le membre AUTOUR de
      l'épaule ou de la hanche, et non autour de son centre.
   3. LES CONTRAIRES SE RÉPONDENT. Bras gauche avec jambe droite ; le bassin
      tourne d'un côté, le buste de l'autre, la tête compense.
   ========================================================================== */

const Rig = (function () {

  const TAU = Math.PI * 2;
  const PI = Math.PI;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  // Sortie d'accélération : rapide au début, molle à la fin. C'est la courbe
  // d'un coup d'épée, d'un pas qui se pose, d'une tête qui se tourne.
  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const easeIn = (k) => k * k;

  let T; // THREE, injecté à la construction

  /* Éclaircir ou assombrir une couleur. ⚠️ SERT À RESPECTER LA TENUE DU
     JOUEUR : le détail ajouté au 396 (ombres de plis, revers de manche, semelle,
     bordure de botte) est DÉRIVÉ des quatre couleurs envoyées par la ferme, il
     n'en ajoute aucune. Un fermier en tenue verte n'hérite donc pas d'ombres
     bleues. Application directe de la leçon du 388 : deux masses de même
     couleur qui se touchent n'en font qu'une — on cerne, on creuse. */
  function shade(c, k) {
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
    return (f(r) << 16) | (f(g) << 8) | f(b);
  }

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
     L'ÉPÉE — vingt-cinq volumes.
     -----------------------------------------------------------------------
     Pommeau, filet de poignée, garde à quillons relevés, talon, gouttière (le
     creux central de la lame), tranchants clairs, pointe en biseau, et des
     runes qui répondent au violet du lac.

     LA GOUTTIÈRE EST CE QUI FAIT LA LAME. Sans elle, une lame en boîte se lit
     comme une règle en plastique : c'est le liseré sombre au milieu et les
     deux arêtes claires sur les bords qui donnent l'acier.

     ⚠️ LA LAME POINTE VERS +Y, c'est-à-dire vers le HAUT quand le groupe n'est
     pas tourné. C'est la description naturelle d'une épée, et c'est celle
     qu'attend tools/verify-rig.mjs. Le fait qu'elle soit tenue pointe en bas
     au repos est l'affaire du joint `grip`, PAS de la géométrie.
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

    g.userData.part = "sword";
    return g;
  }

  /* =======================================================================
     LE FERMIER — REDESSINÉ AU 396 (demande de Guillaume).
     -----------------------------------------------------------------------
     Quatre-vingts volumes au lieu de quarante-cinq, sans un joint de plus :
     le squelette est celui du 395 (bassin, buste, cou, tête, deux fois
     épaule/coude/poignet, deux fois hanche/genou/cheville), tout le reste est
     de la CHAIR posée dessus. Ce choix est délibéré — ajouter des joints
     obligerait à réécrire le cycle de marche, alors que le reproche portait
     sur le SENS des articulations et sur le détail, pas sur leur nombre.

     Ce qui est neuf, et pourquoi :
       * un VISAGE : sourcils, blanc des yeux, bouche, oreilles. Un personnage
         vu de dos les trois quarts du temps n'en a pas besoin — sauf que la
         caméra du labyrinthe passe devant lui à chaque virage serré ;
       * des MAINS avec un pouce, et un GANT sur la main d'épée. Sans pouce,
         une main est un cube, et le cube tenait l'épée par magie ;
       * des PLIS et des OMBRES dérivés de la tenue (voir shade()) : revers de
         manche, ceinture à double sangle, genouillères, bordure de botte,
         semelle et talon distincts ;
       * une CAPE COURTE de dos, qui donne une silhouette lisible de loin —
         c'est de dos qu'on le voit, presque tout le temps.
     ======================================================================= */
  function buildFarmer(cfg, tex, sk) {
    const c = sk || {};
    const skinC = c.skin || cfg.COL_SKIN, shirtC = c.shirt || cfg.COL_SHIRT;
    const pantsC = c.pants || cfg.COL_PANTS, hairC = c.hair || cfg.COL_HAIR;

    const mSkin = lam(skinC), mSkinD = lam(shade(skinC, -0.22));
    const mShirt = lam(shirtC), mShirtD = lam(shade(shirtC, -0.30)), mShirtL = lam(shade(shirtC, 0.18));
    const mPants = lam(pantsC), mPantsD = lam(shade(pantsC, -0.28));
    const mHair = lam(hairC), mHairD = lam(shade(hairC, -0.35));
    const mBoot = lam(0x3a2a1c), mBootD = lam(0x241a12), mBootL = lam(0x53402c);
    const mBelt = lam(0x4a3524), mBuckle = lam(0xb08d3c);
    const mGlove = lam(0x5b4128), mEyeW = bas(0xe8e2d6), mEye = bas(0x1b1520);
    const mCape = lam(shade(shirtC, -0.45));

    const root = new T.Group();
    // ⚠️ La hauteur vient de config.js et n'est plus écrite ici : elle l'était
    // aussi dans poseFarmer, et deux descriptions d'une même chose finissent
    // toujours par diverger. Celle-ci avait en plus la mauvaise valeur — les
    // bottes passaient sous la dalle. Voir CFG.FARMER_HIP_Y.
    const hips = joint(0, cfg.FARMER_HIP_Y, 0); root.add(hips);

    // --- BUSTE (pivote à la taille)
    const torso = joint(0, 0, 0); hips.add(torso);
    const chest = box(0.94, 0.78, 0.52, mShirt, 0, 0.42, 0); torso.add(chest);
    torso.add(box(0.80, 0.62, 0.10, mShirtD, 0, 0.46, 0.24));        // dos, plus sombre
    torso.add(box(0.98, 0.16, 0.56, mBelt, 0, 0.06, 0));             // ceinture
    torso.add(box(0.99, 0.05, 0.57, mBootD, 0, 0.14, 0));            // liseré haut
    torso.add(box(0.20, 0.14, 0.60, mBuckle, 0, 0.06, 0));           // boucle
    torso.add(box(0.86, 0.30, 0.50, mShirt, 0, 0.90, 0));            // haut de poitrine
    torso.add(box(0.22, 0.70, 0.56, lam(0x6b5334), -0.22, 0.55, 0)); // bretelle G
    torso.add(box(0.14, 0.66, 0.56, lam(0x59452b), 0.24, 0.53, 0));  // bretelle D
    torso.add(box(1.06, 0.22, 0.54, mShirt, 0, 0.98, 0));            // épaules
    torso.add(box(0.44, 0.14, 0.50, mShirtL, 0, 1.06, -0.04));       // col
    // Deux plis de chemise : ils CREUSENT le torse, sinon c'est une caisse.
    torso.add(box(0.06, 0.56, 0.53, mShirtD, -0.20, 0.44, -0.01));
    torso.add(box(0.06, 0.56, 0.53, mShirtD, 0.20, 0.44, -0.01));
    // CAPE COURTE : la silhouette de dos, celle qu'on voit presque toujours.
    const cape = joint(0, 1.00, 0.24); torso.add(cape);
    cape.add(box(1.00, 0.86, 0.09, mCape, 0, -0.43, 0));
    cape.add(box(0.70, 0.22, 0.11, mCape, 0, -0.94, 0.02));

    // --- COU ET TÊTE
    const neck = joint(0, 1.10, 0); torso.add(neck);
    neck.add(box(0.26, 0.20, 0.26, mSkinD, 0, 0.10, 0));
    const head = joint(0, 0.20, 0); neck.add(head);
    head.add(box(0.66, 0.62, 0.60, mSkin, 0, 0.31, 0));              // crâne
    head.add(box(0.50, 0.16, 0.10, mSkinD, 0, 0.10, -0.28));         // mâchoire
    head.add(box(0.14, 0.12, 0.10, mSkin, 0, 0.28, -0.33));          // nez
    head.add(box(0.24, 0.05, 0.05, lam(0x8a5b4a), 0, 0.16, -0.31));  // bouche
    head.add(box(0.15, 0.12, 0.05, mEyeW, -0.16, 0.36, -0.31));      // blanc G
    head.add(box(0.15, 0.12, 0.05, mEyeW, 0.16, 0.36, -0.31));       // blanc D
    head.add(box(0.07, 0.08, 0.04, mEye, -0.15, 0.35, -0.33));       // pupille G
    head.add(box(0.07, 0.08, 0.04, mEye, 0.15, 0.35, -0.33));        // pupille D
    head.add(box(0.19, 0.05, 0.05, mHairD, -0.16, 0.45, -0.30));     // sourcil G
    head.add(box(0.19, 0.05, 0.05, mHairD, 0.16, 0.45, -0.30));      // sourcil D
    head.add(box(0.07, 0.18, 0.16, mSkinD, -0.36, 0.28, -0.02));     // oreille G
    head.add(box(0.07, 0.18, 0.16, mSkinD, 0.36, 0.28, -0.02));      // oreille D
    head.add(box(0.72, 0.20, 0.66, mHair, 0, 0.60, 0.02));           // cheveux
    head.add(box(0.66, 0.09, 0.14, mHairD, 0, 0.53, -0.28));         // frange
    head.add(box(0.70, 0.30, 0.14, mHair, 0, 0.40, 0.30));           // nuque (DERRIÈRE)
    head.add(box(0.72, 0.08, 0.10, mHairD, 0, 0.24, 0.31));          // bas de nuque
    head.add(box(0.16, 0.26, 0.16, mHair, -0.36, 0.42, 0.06));       // mèches
    head.add(box(0.16, 0.26, 0.16, mHair, 0.36, 0.42, 0.06));

    /* --- BRAS. Trois segments : épaule → coude → poignet.
       ⚠️ `side` vaut -1 à gauche et +1 à droite, et TOUT écartement latéral
       s'écrit `side * quelque chose` — jamais un nombre en dur. C'est ce qui
       garantit qu'un bras s'écarte du corps des deux côtés : au 395,
       rotation.z valait +0,28 à gauche et -0,10 à droite, c'est-à-dire vers
       l'INTÉRIEUR dans les deux cas, et c'est une des raisons pour lesquelles
       la lame frôlait le buste. */
    function arm(side, gloved) {
      const sh = joint(side * 0.58, 0.92, 0); torso.add(sh);
      sh.add(box(0.30, 0.26, 0.32, mShirt, 0, -0.02, 0));            // moignon d'épaule
      sh.add(box(0.32, 0.10, 0.34, mShirtL, 0, 0.06, 0));            // couture
      const up = limb(0.24, 0.52, 0.24, mShirt); sh.add(up);
      sh.add(box(0.26, 0.10, 0.26, mShirtD, 0, -0.48, 0));           // revers de manche
      const el = joint(0, -0.52, 0); sh.add(el);
      const fo = limb(0.21, 0.46, 0.21, mSkin); el.add(fo);
      el.add(box(0.22, 0.08, 0.22, mSkinD, 0, -0.04, 0));            // pli du coude
      const wr = joint(0, -0.46, 0); el.add(wr);
      const hand = gloved ? mGlove : mSkin;
      wr.add(box(0.24, 0.22, 0.24, hand, 0, -0.09, 0));              // paume
      wr.add(box(0.09, 0.14, 0.10, hand, side * -0.15, -0.06, -0.06)); // pouce
      wr.add(box(0.25, 0.06, 0.25, gloved ? mBootD : mSkinD, 0, -0.19, 0)); // doigts
      return { sh, el, wr };
    }
    const armL = arm(-1, false), armR = arm(1, true);

    // --- JAMBES. Cuisse → genou → cheville → pied.
    function leg(side) {
      const hip = joint(side * 0.26, -0.06, 0); hips.add(hip);
      const th = limb(0.32, 0.54, 0.32, mPants); hip.add(th);
      hip.add(box(0.34, 0.10, 0.34, mPantsD, 0, -0.52, 0));          // genouillère
      const kn = joint(0, -0.54, 0); hip.add(kn);
      const sh = limb(0.27, 0.50, 0.27, mPants); kn.add(sh);
      kn.add(box(0.29, 0.12, 0.29, mPantsD, 0, -0.44, 0));           // bas de jambe
      const an = joint(0, -0.50, 0); kn.add(an);
      an.add(box(0.32, 0.22, 0.46, mBoot, 0, -0.11, -0.08));         // botte
      an.add(box(0.34, 0.08, 0.48, mBootL, 0, -0.02, -0.08));        // revers de botte
      an.add(box(0.34, 0.08, 0.50, mBootD, 0, -0.20, -0.09));        // semelle
      an.add(box(0.30, 0.09, 0.14, mBootD, 0, -0.19, 0.14));         // talon
      return { hip, kn, an };
    }
    const legL = leg(-1), legR = leg(1);

    /* --- TORCHE, main gauche, sur son PROPRE JOINT.
       ⚠️ C'est le joint qui répare la torche portée dans le dos. poseFarmer
       lui donne un angle qui ANNULE celui du bras, donc le flambeau reste
       vertical quoi que fasse le fermier — et il le reste encore si un jour on
       change la pose du bras, ce qui est tout l'intérêt. */
    const torchJ = joint(0, -0.20, -0.04);
    armL.wr.add(torchJ);
    const torch = new T.Group();
    const woodMat = new T.MeshLambertMaterial({ map: tex.wood });
    torch.add(box(0.13, 1.15, 0.13, woodMat, 0, 0.30, 0));
    torch.add(box(0.16, 0.10, 0.16, lam(0x2a1d14), 0, -0.16, 0));    // talon du fût
    torch.add(box(0.20, 0.10, 0.20, lam(0x3a2a1c), 0, 0.86, 0));     // virole
    torch.add(box(0.24, 0.26, 0.24, lam(0x1a1512), 0, 1.02, 0));     // tête carbonisée
    torchJ.add(torch);

    /* --- ÉPÉE, main droite, sur son PROPRE JOINT `grip`.
       ⚠️ Au 395 elle était accrochée directement au poignet, sans rotation :
       sa lame (+Y local) remontait donc l'avant-bras et sortait par la tête.
       Le joint `grip` la fait PROLONGER le bras — pointe en bas au repos,
       pointe en avant pendant le coup, jamais vers le buste. */
    const grip = joint(0, -0.22, 0);
    armR.wr.add(grip);
    const sword = buildSword(cfg, 0.82);
    grip.add(sword);
    sword.position.set(0, 0, 0);
    sword.visible = false;

    return {
      root, hips, torso, chest, neck, head, cape,
      armL, armR, legL, legR,
      torchJ, torch, grip, sword,
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
    /* La cuisse balaie en sinus ; le GENOU ne se plie que vers l'ARRIÈRE
       (rotation.x négative, voir la convention en tête de fichier) et seulement
       pendant la phase de retour — un genou qui se plie dans les deux sens
       donne une jambe cassée, et c'est immédiatement visible. */
    const swing = cfg.GAIT_SWING * amp;
    const knee = cfg.GAIT_KNEE * amp;
    r.legL.hip.rotation.x = sinP * swing;
    r.legR.hip.rotation.x = -sinP * swing;
    r.legL.kn.rotation.x = -Math.max(0, Math.sin(p - 0.75)) * knee;
    r.legR.kn.rotation.x = -Math.max(0, Math.sin(p + PI - 0.75)) * knee;
    // La cheville rattrape pour que la semelle reste à plat au contact.
    r.legL.an.rotation.x = -r.legL.hip.rotation.x * 0.45 - r.legL.kn.rotation.x * 0.5;
    r.legR.an.rotation.x = -r.legR.hip.rotation.x * 0.45 - r.legR.kn.rotation.x * 0.5;

    // ---- BASSIN : deux montées par foulée (une par pas), plus un affaissement
    // proportionnel à la vitesse — on se tasse quand on court.
    r.hips.position.y = cfg.FARMER_HIP_Y + Math.abs(Math.sin(p * 2)) * cfg.GAIT_BOB * amp - amp * 0.06;
    r.hips.rotation.y = sinP * 0.13 * amp;

    /* ---- BUSTE : contre-rotation, roulis, et inclinaisons.
       ⚠️ SIGNE DE `lean` CORRIGÉ AU 396. Pencher en avant, c'est envoyer le
       haut du buste vers -Z, donc une rotation.x NÉGATIVE. Au 395 le fermier
       se penchait en ARRIÈRE quand il courait. */
    const lean = -(cfg.LEAN_RUN * v.runAmt + 0.06 * amp) + 0.14 * v.backAmt;
    r.torso.rotation.y = -sinP * 0.17 * amp;
    r.torso.rotation.z = cosP * cfg.GAIT_ROLL * amp - v.strafeAmt * cfg.LEAN_STRAFE;
    r.torso.rotation.x = lean + cfg.HURT_RECOIL * v.hurt;
    // Respiration au repos : elle n'existe QUE quand on ne bouge pas, sinon
    // elle se mélange au cycle et donne un torse qui palpite en courant.
    const breath = moving ? 0 : Math.sin(t * 1.7) * cfg.IDLE_BREATH;
    r.chest.scale.set(1 + breath, 1 + breath * 0.6, 1 + breath);
    // La cape traîne : elle est EN RETARD sur le buste, c'est ce qui fait le
    // tissu. Tous les décalages de ce fichier reposent sur ce principe.
    r.cape.rotation.x = -0.06 - amp * 0.26 + Math.sin(p * 2 - 0.9) * 0.08 * amp;
    r.cape.rotation.z = Math.sin(p - 0.6) * 0.10 * amp;

    // ---- TÊTE : elle stabilise le regard. Un personnage dont la tête suit le
    // buste donne le mal de mer ; une tête qui compense donne un être vivant.
    r.head.rotation.y = -r.torso.rotation.y * 0.7 + (moving ? 0 : Math.sin(t * 0.6) * 0.22);
    r.head.rotation.x = -lean * 0.6 + (moving ? Math.abs(sinP) * 0.05 : 0);
    r.head.rotation.z = -r.torso.rotation.z * 0.5;

    /* ---- BRAS GAUCHE : il porte la torche, donc il ne balance PAS comme un
       bras libre. Il reste tendu DEVANT, avec une oscillation légère — c'est
       ce qui fait qu'on lit « il éclaire son chemin » et pas « il court ».
       ⚠️ Les deux angles sont POSITIFS : le bras part vers l'avant, le coude
       plie vers l'avant. Au 395 ils étaient négatifs tous les deux et la main
       se retrouvait à 85 cm DERRIÈRE le dos. */
    const shL = 0.72 + sinP * cfg.GAIT_ARM * 0.24 * amp;
    const elL = 1.42 - Math.sin(p + 1.2) * 0.12 * amp;
    r.armL.sh.rotation.x = shL;
    r.armL.sh.rotation.z = -0.20 + (moving ? 0 : Math.sin(t * 1.3) * cfg.IDLE_SWAY); // vers l'extérieur (côté -1)
    r.armL.el.rotation.x = elL;
    r.armL.wr.rotation.z = Math.sin(t * 2.1) * 0.06;   // la flamme tremble
    /* LA TORCHE RESTE VERTICALE. On annule l'angle cumulé du bras et on ajoute
       une inclinaison constante vers l'avant. Écrit comme une SOUSTRACTION de
       ce que le bras vient de faire, donc juste par construction : si on
       change la pose du bras demain, la torche suit sans qu'on y pense. */
    r.torchJ.rotation.x = -(shL + elL) + cfg.TORCH_TILT;

    // ---- BRAS DROIT : libre, ou en train de frapper.
    const swingDur = cfg.SWING_MS / 1000;
    if (v.swingT > 0) {
      /* L'ATTAQUE EN TROIS TEMPS. Sans armé, un coup n'a pas de poids ; sans
         récupération, il n'a pas de contrecoup. Les deux comptent autant que
         le coup lui-même.
         ⚠️ SIGNES INVERSÉS PAR RAPPORT AU 395 : l'armé envoie le bras en
         ARRIÈRE et EN HAUT (rotation.x négative), le coup l'abat vers l'AVANT
         (positive). Le 395 faisait l'inverse du point de vue du corps, ce qui
         passait la lame à travers le crâne au milieu du geste. */
      const k = 1 - v.swingT / swingDur;
      let armX, twist, wrist;
      if (k < cfg.SWING_WINDUP) {
        const u = easeIn(k / cfg.SWING_WINDUP);
        armX = lerp(-0.20, -2.30, u);       // l'épée part loin en arrière, au-dessus de l'épaule
        twist = lerp(0, cfg.SWING_TWIST, u);
        wrist = lerp(0, 0.55, u);
      } else if (k < cfg.SWING_STRIKE) {
        const u = easeOut((k - cfg.SWING_WINDUP) / (cfg.SWING_STRIKE - cfg.SWING_WINDUP));
        armX = lerp(-2.30, 1.15, u);        // le coup : très rapide, vers l'avant-bas
        twist = lerp(cfg.SWING_TWIST, -cfg.SWING_TWIST * 0.7, u);
        wrist = lerp(0.55, -0.30, u);
      } else {
        const u = easeOut((k - cfg.SWING_STRIKE) / (1 - cfg.SWING_STRIKE));
        armX = lerp(1.15, -0.20, u);        // on se remet en garde
        twist = lerp(-cfg.SWING_TWIST * 0.7, 0, u);
        wrist = lerp(-0.30, 0, u);
      }
      r.armR.sh.rotation.x = armX;
      r.armR.sh.rotation.z = cfg.ARM_OUT_SWING;      // le bras s'écarte du corps
      r.armR.el.rotation.x = 0.30 + Math.abs(twist) * 0.25;
      r.armR.wr.rotation.z = wrist * 0.5;
      /* ⚠️ LE BRAS DE TORCHE CONTRE-BRAQUE. Le buste pivote de SWING_TWIST
         pendant le coup ; sans compensation, l'épaule gauche part en arrière
         et le flambeau passe DERRIÈRE le fermier au milieu du geste — c'est
         exactement le défaut qu'on vient de corriger, réintroduit par une
         autre porte. Il est d'ailleurs juste de l'autre côté : on garde sa
         lumière devant soi quand on frappe. */
      r.armL.sh.rotation.y = -twist * 0.85;
      /* LA LAME PROLONGE L'AVANT-BRAS pendant tout le geste. Un léger retard
         (`wrist`) donne le fouetté du poignet sans jamais ramener la pointe
         vers le corps. */
      r.grip.rotation.x = PI + 0.10 + wrist * 0.35;
      r.grip.rotation.z = 0;
      r.torso.rotation.y += twist;
      r.hips.rotation.y += twist * 0.3;    // les hanches suivent, en retard
    } else {
      /* GARDE BASSE quand on est armé, bras ballant sinon.
         ⚠️ C'EST LA POSE QUI RÉPARE « l'épée rentre dans le corps » : le bras
         pend le long du corps, ÉCARTÉ (rotation.z * side), le coude plie
         légèrement vers l'avant, et la lame descend vers le sol en avant du
         pied droit. La pointe ne passe donc jamais près du buste, ni au repos
         ni pendant le cycle de marche. */
      const armed = r.sword.visible;
      r.armL.sh.rotation.y = 0;
      r.armR.sh.rotation.x = (armed ? 0.10 : 0) + sinP * cfg.GAIT_ARM * amp;
      r.armR.sh.rotation.z = (armed ? cfg.ARM_OUT_GUARD : 0.06)
        + (moving ? 0 : Math.sin(t * 1.3 + 2) * cfg.IDLE_SWAY);
      r.armR.el.rotation.x = (armed ? 0.55 : 0.18) + Math.max(0, cosP) * 0.26 * amp;
      r.armR.wr.rotation.z = 0;
      r.grip.rotation.x = PI - 0.62;       // lame vers le bas-avant
      r.grip.rotation.z = cfg.BLADE_OUT;   // ... et écartée de la jambe
    }

    // ---- CHUTE : tout se désarticule vers le haut. C'est bref (FALL_MS) mais
    // c'est le seul moment où le personnage n'est plus maître de rien.
    if (v.falling) {
      const f = t * 9;
      r.armL.sh.rotation.x = -2.4 + Math.sin(f) * 0.5;
      r.armR.sh.rotation.x = -2.4 + Math.sin(f + 2) * 0.5;
      r.legL.hip.rotation.x = Math.sin(f + 1) * 0.9;
      r.legR.hip.rotation.x = Math.sin(f + 3) * 0.9;
      r.torso.rotation.x = 0.5 + Math.sin(f * 0.7) * 0.3;
      r.torchJ.rotation.x = -(r.armL.sh.rotation.x) + cfg.TORCH_TILT;
    }
  }

  /* =======================================================================
     LE RÔDEUR — INCHANGÉ AU 396, ET C'EST VOULU.
     -----------------------------------------------------------------------
     Retour de Guillaume : « le design des monstres est convaincant ». On n'y
     touche donc PAS : ni les proportions, ni les jambes digitigrades, ni la
     mâchoire articulée, ni le sens de ses coudes — un bras de bête qui plie à
     l'envers est une bête, un bras d'homme qui plie à l'envers est un défaut.

     Ce qui est ajouté est ailleurs : la liste de ses MATÉRIAUX (pour pouvoir
     le faire disparaître) et la DÉSINTÉGRATION de la mort, demandée au 396.
     ======================================================================= */
  function buildRoamer(cfg) {
    const bone = lam(0x1b1712), dark = lam(cfg.COL_WOLF), horn = lam(0x2e2822);
    const claw = bas(0xc9c0ae), fang = bas(0xd8d0c0), eye = bas(cfg.COL_WOLF_EYE);
    /* ⚠️ TOUS TRANSPARENTS DÈS LA CONSTRUCTION. Basculer `transparent` en
       cours de partie demande un `needsUpdate` et recompile le shader au pire
       moment — pile quand la créature meurt, c'est-à-dire quand le joueur
       regarde. À opacité 1 le rendu est identique. */
    const mats = [bone, dark, horn, claw, fang, eye];
    for (const m of mats) { m.transparent = true; m.opacity = 1; }

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
    skull.add(box(0.13, 0.11, 0.06, eye, -0.14, 0.20, -0.40));
    skull.add(box(0.13, 0.11, 0.06, eye, 0.14, 0.20, -0.40));
    const jaw = joint(0, 0.05, -0.12); skull.add(jaw);               // MÂCHOIRE
    jaw.add(box(0.44, 0.16, 0.46, bone, 0, -0.06, -0.16));
    for (let i = 0; i < 3; i++)                                       // crocs
      jaw.add(box(0.06, 0.12, 0.06, fang, -0.14 + i * 0.14, 0.04, -0.34));

    function arm(side) {
      const sh = joint(side * 0.46, 0.66, 0); spine.add(sh);
      const up = limb(0.19, 0.52, 0.19, dark); sh.add(up);
      const el = joint(0, -0.52, 0); sh.add(el);
      const fo = limb(0.16, 0.48, 0.16, dark); el.add(fo);
      const wr = joint(0, -0.48, 0); el.add(wr);
      for (let i = -1; i <= 1; i++)                                   // trois griffes
        wr.add(box(0.06, 0.26, 0.06, claw, i * 0.09, -0.13, -0.04));
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
        an.add(box(0.05, 0.06, 0.14, claw, i * 0.08, -0.14, -0.30));
      return { hip, kn, an };
    }
    const legL = leg(-1), legR = leg(1);

    /* Les MORCEAUX de la désintégration : les six groupes qui se détachent.
       On réutilise les joints existants au lieu d'ajouter des volumes — un
       corps qui se défait en ses propres membres se lit mieux qu'un corps
       remplacé par un nuage de cubes, et ça ne coûte pas un maillage. */
    const pieces = [skull, armL.sh, armR.sh, legL.hip, legR.hip, spine];
    return { root, hips, spine, neck, skull, jaw, armL, armR, legL, legR,
             mats, pieces, kind: "roamer" };
  }

  function poseRoamer(r, v, cfg, t) {
    /* =====================================================================
       ZIP 396 — LA MORT SE VOIT. Demande de Guillaume : « on sait pas quand
       on gagne (…) animation de désintégration et aspiration par le haut du
       monstre vaincu ».

       Trois temps, et les trois comptent :
         1. l'ARRÊT (0 → 12 %) : le corps se fige, cabré, une fraction de
            seconde. Sans ce temps mort, la disparition ressemble à un bug ;
         2. l'ASPIRATION (12 → 100 %) : chaque morceau monte, tourne et
            s'écarte, de plus en plus vite. La montée est en k² — accélérée,
            donc « aspirée » et non « soulevée » ;
         3. l'EFFACEMENT : l'opacité tombe en fin de course seulement, pour
            qu'on VOIE les morceaux partir au lieu de les voir pâlir sur place.
       ===================================================================== */
    if (v.dead) {
      const k = clamp(v.deadT / (cfg.KILL_VANISH_MS / 1000), 0, 1);
      const rise = k < 0.12 ? 0 : easeIn((k - 0.12) / 0.88);
      r.root.rotation.x = 0;
      r.root.position.y = rise * cfg.KILL_RISE;
      for (let i = 0; i < r.pieces.length; i++) {
        const pc = r.pieces[i];
        const ph = i * 1.9;
        pc.rotation.x = Math.sin(ph) * rise * 2.4;
        pc.rotation.y = Math.cos(ph * 1.3) * rise * 3.1;
        pc.rotation.z = Math.sin(ph * 0.7) * rise * 1.8;
        const s = Math.max(0.02, 1 - rise * 0.85);
        pc.scale.set(s, s, s);
      }
      // L'opacité ne bouge que dans le dernier tiers : on regarde partir, on
      // ne regarde pas pâlir.
      const fade = clamp((k - 0.55) / 0.45, 0, 1);
      for (const m of r.mats) m.opacity = 1 - fade;
      return;
    }
    for (const m of r.mats) if (m.opacity !== 1) m.opacity = 1;

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
    r.legR.kn.rotation.x = -0.75 - Math.max(0, Math.sin(p + PI - 0.5)) * 0.9 * amp;
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
    for (const pc of r.pieces) pc.scale.set(1, 1, 1);
    r.root.position.y = 0;
    r.root.rotation.x = 0;

    /* SONNÉ : il part en arrière, bras écartés, ET IL BLANCHIT (voir
       world.js : le blanchiment est un changement de matériau, pas un angle).
       C'est la lisibilité du coup réussi — sans elle, on ne sait pas si on a
       touché, et c'est exactement le reproche du 396. */
    if (v.stagger > 0) {
      const k = clamp(v.stagger, 0, 1);
      r.spine.rotation.x -= k * 0.7;
      r.armL.sh.rotation.x -= k * 1.2;
      r.armR.sh.rotation.x -= k * 1.2;
      r.jaw.rotation.x = 0.6 * k;
    }
    void cosP;
  }

  /* =======================================================================
     LE TRAQUEUR — inchangé lui aussi (« le design des monstres est
     convaincant »). Il ne meurt jamais, donc pas de désintégration.
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
    // couvre donc la même distance en deux fois moins de pas.
    r.legL.hip.rotation.x = sinP * 0.62 * amp;
    r.legR.hip.rotation.x = -sinP * 0.62 * amp;
    r.legL.kn.rotation.x = -Math.max(0, Math.sin(p - 0.9)) * 0.75 * amp;
    r.legR.kn.rotation.x = -Math.max(0, Math.sin(p + PI - 0.9)) * 0.75 * amp;

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
    clamp, lerp, shade, TAU,
  };
})();

if (typeof module === "object" && module.exports) module.exports = { Rig };
