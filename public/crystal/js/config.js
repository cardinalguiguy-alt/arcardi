/* =============================================================================
   config.js — LA PALETTE ET LES RÉGLAGES.
   -----------------------------------------------------------------------------
   ⚠️ LA PALETTE EST FERMÉE, ET C'EST LA RÈGLE LA PLUS IMPORTANTE DU JEU.
   Trente-six couleurs, relevées sur les trois images de référence de
   Guillaume. Aucun fichier de dessin n'a le droit d'écrire une couleur qui
   n'est pas ici. Un pixel art n'est pas « du dessin en gros pixels » : c'est
   du dessin sous contrainte de palette, et c'est la contrainte qui fait la
   cohérence. Dès qu'on s'autorise « juste un bleu un peu plus clair ici »,
   l'image se met à ressembler à un rendu 3D flouté.

   ⚠️ LE MÉLANGE EST AUTORISÉ, L'INVENTION NE L'EST PAS. `Pix.mix(a, b, t)`
   entre deux couleurs de la palette reste dans la famille. Une valeur écrite
   à la main en dur ne l'est pas.

   ⚠️ TOUT EST BLEU SAUF UNE CHOSE. `warm` — la fenêtre de la cabane sur la
   crête — est le SEUL point tiède des trois images. Il ne doit jamais y en
   avoir un second dans le même tableau : c'est ce qui le rend lisible comme
   « quelqu'un vit là », sans une ligne de texte. Le jour où on ajoutera un
   deuxième feu chaud quelque part, on aura effacé le premier sans le toucher.
   ========================================================================== */

const CFG = (function () {

  /* ── RÉSOLUTION ─────────────────────────────────────────────────────────
     480x270 : c'est un quart de 1920x1080, donc l'agrandissement est un
     entier exact sur un écran courant (x4) et sur un demi-écran (x2). Une
     résolution non divisible donnerait des pixels de largeur inégale — le
     défaut le plus visible et le plus fréquent du faux pixel art.

     ⚠️ NE PAS MONTER SANS REGARDER LES RÉFÉRENCES. Sur l'image 2, le
     personnage fait environ un neuvième de la hauteur du cadre, soit 30 px
     ici. À 960x540 il en ferait 60 et la scène cesserait d'être du pixel art
     pour devenir de l'illustration. La grosseur du pixel est un choix
     graphique, pas une limite technique. */
  const W = 480, H = 270;

  const PAL = {
    /* ── CIEL, du zénith à l'horizon ─────────────────────────────────────
       Huit paliers. Chaque scène choisit sa PLAGE dans cette échelle : la
       corniche (image 2) monte jusqu'à sky6, le pont (image 1) s'arrête à
       sky2 parce qu'on y regarde le ciel par un trou dans la forêt. Une seule
       échelle pour deux ambiances très différentes — c'est la raison pour
       laquelle les deux tableaux ont l'air d'appartenir au même monde. */
    sky0: [0x06, 0x0d, 0x1a], sky1: [0x09, 0x16, 0x2a], sky2: [0x0e, 0x22, 0x3c],
    sky3: [0x14, 0x30, 0x52], sky4: [0x1b, 0x40, 0x68], sky5: [0x26, 0x55, 0x80],
    sky6: [0x38, 0x72, 0x9c], sky7: [0x55, 0x92, 0xb6],

    /* ── AURORE ──────────────────────────────────────────────────────────
       Cinq verts du plus sombre au cœur presque blanc, plus DEUX violets pour
       la frange haute. Le violet est ce qui distingue une aurore dessinée
       d'une aurore observée : dans la nature, l'oxygène donne le vert bas et
       l'azote le pourpre du sommet, et l'image 2 de Guillaume le montre très
       nettement. Sans ces deux teintes le rideau a l'air d'un néon. */
    aur0: [0x13, 0x5e, 0x60], aur1: [0x1d, 0x96, 0x86], aur2: [0x33, 0xcf, 0xa4],
    aur3: [0x6c, 0xef, 0xc6], aur4: [0xb4, 0xff, 0xe9],
    aurV: [0x5e, 0x54, 0xba], aurM: [0x9c, 0x6c, 0xcc],

    /* ── NEIGE ET BRUME ──────────────────────────────────────────────────
       Six valeurs. `sn5` est réservée à l'ARÊTE éclairée — un liseré d'un
       pixel sur le bord supérieur d'une congère. L'employer en aplat ferait
       un trou blanc dans l'image. */
    fog:  [0xa6, 0xcb, 0xe0],
    sn0:  [0x46, 0x7c, 0xa6], sn1: [0x6a, 0xa4, 0xc6], sn2: [0x90, 0xc2, 0xdb],
    sn3:  [0xb6, 0xda, 0xea], sn4: [0xdc, 0xef, 0xf8], sn5: [0xf2, 0xfc, 0xff],

    /* ── GLACE ET EAU PRISE ──────────────────────────────────────────────── */
    ice0: [0x18, 0x3e, 0x60], ice1: [0x25, 0x59, 0x82], ice2: [0x38, 0x79, 0xa4],
    ice3: [0x5e, 0xa4, 0xc8],

    /* ── PIERRE ──────────────────────────────────────────────────────────── */
    st0:  [0x0c, 0x1b, 0x2c], st1: [0x14, 0x2c, 0x46], st2: [0x20, 0x40, 0x5e],
    st3:  [0x2e, 0x58, 0x78], st4: [0x43, 0x72, 0x94],

    /* ── SILHOUETTES ET ARBRES ───────────────────────────────────────────
       ⚠️ QUATRE VALEURS D'ARBRE POUR QUATRE PLANS, ET C'EST NON NÉGOCIABLE.
       Un arbre lointain peint de la même couleur qu'un arbre proche détruit
       la profondeur plus sûrement que n'importe quelle erreur de perspective.
       C'est la leçon du zip 408, retrouvée ici : « une teinte n'est jamais
       claire ou sombre en soi, elle l'est par rapport à ce qu'il y a
       derrière ». */
    sil0: [0x08, 0x13, 0x1f], sil1: [0x0f, 0x20, 0x33], sil2: [0x18, 0x31, 0x4c],
    tre0: [0x26, 0x4c, 0x6e], tre1: [0x36, 0x64, 0x8a], tre2: [0x50, 0x86, 0xaa],
    tre3: [0x7a, 0xb0, 0xcd],

    /* ── LUMIÈRE FROIDE ──────────────────────────────────────────────────── */
    fl0:  [0x2a, 0x96, 0xba], fl1: [0x4b, 0xcc, 0xe6], fl2: [0x9a, 0xee, 0xff],
    fl3:  [0xe6, 0xff, 0xff],
    cry0: [0x2b, 0x8b, 0xb4], cry1: [0x5b, 0xd4, 0xec], cry2: [0xa4, 0xf0, 0xff],
    star: [0xd8, 0xee, 0xff],

    /* ── LA SEULE COULEUR CHAUDE DU JEU ──────────────────────────────────── */
    warm: [0xe6, 0xae, 0x5e],
  };

  return {
    W, H, PAL,

    /* ═══════════════════════════════════════════════════════════════════════
       ⚠️⚠️ L'INTERRUPTEUR DU MUR DE CHANTIER. IL EST SEUL, ET IL EST ICI.
       ───────────────────────────────────────────────────────────────────────
       `true`  : la vallée est cachée derrière ⌘⇧X ×2 (voir CryGate, game.js).
       `false` : elle s'ouvre directement — POUR ESSAYER, JAMAIS POUR LIVRER.

       Demande de Guillaume, en deux temps et en apparence contradictoires :
       « cache ça derrière le mur développeur comme les autres jeux en
       développement », puis « je dois pouvoir tester le jeu, enlève le mur ».
       Les deux sont vraies et elles ne parlent pas du même objet : le SITE
       doit être muré, l'ESSAI ne doit pas coûter un code secret à chaque
       rechargement. La documentation du 417 disait « remplacer les trois
       dernières lignes de boot() » — c'est-à-dire modifier de la logique pour
       faire un réglage, ce qui est exactement la manière dont un mur finit par
       ne plus se refermer.

       ⚠️ `tools/build-demo.mjs` BASCULE CETTE CLÉ À `false` DANS LA PAGE
       D'ESSAI QU'IL PRODUIT, et ne touche pas au dépôt. La page unique s'ouvre
       donc sur le jeu ; `public/crystal/` reste muré.

       ⚠️ ET `verify-vallee.mjs` REFUSE QUE CE FICHIER PARTE À `false`. C'est le
       seul garde-fou qui compte : un mur qui refuse de s'ouvrir se voit en
       trois secondes, un mur resté ouvert ne se remarque jamais — surtout pas
       par celui qui l'a ouvert lui-même pour un essai.
       ═══════════════════════════════════════════════════════════════════════ */
    GATE_ON: true,

    /* Pas de simulation fixe. Même raison qu'au labyrinthe : les outils de
       vérification jouent à ce pas-là, et un dt imposé par le navigateur
       ferait diverger le jeu de ce qui le mesure. */
    SIM_HZ: 60,

    /* ── LA MARCHE SUR LE LAC GELÉ (segment jouable) ─────────────────────
       Réglages de la projection. `FOCAL` et `EYE` décident à eux deux du
       cadrage de la référence n°1 : caméra basse, chaussée qui fuit vers un
       point de fuite légèrement au-dessus du milieu, arbres qui défilent haut.
       ⚠️ Les toucher change la PERSPECTIVE, donc la ressemblance avec la
       référence. C'est le dernier endroit où bricoler. */
    WALK: {
      FOCAL: 168,        // distance focale en pixels-monde
      EYE: 2.35,         // hauteur d'œil, en unités-monde
      HORIZON: 0.395,    // ligne d'horizon, en fraction de H
      ROAD_HALF: 3.05,   // demi-largeur de la chaussée
      SLAB: 1.55,        // profondeur d'une dalle
      FAR: 78,           // distance de coupure (au-delà : brume pure)
      SPEED: 7.4,        // unités/seconde en marche
      STRAFE: 4.1,       // vitesse latérale
      /* ⚠️ LA LONGUEUR N'EST PLUS ICI, ELLE EST DANS `MODES` (421). Il y a
         désormais DEUX parcours de longueurs différentes ; un `GOAL_M`
         unique au-dessus d'eux aurait été lu par l'un et ignoré par l'autre,
         ce qui est exactement la forme de réglage dont on finit par croire
         qu'il fait quelque chose. */
      SHARD_EVERY: 11,   // un éclat tous les N unités environ
      BRAZIER_EVERY: 26, // un brasero tous les N unités

      /* ── LE VOILE ATMOSPHÉRIQUE (421) ─────────────────────────────────
         ⚠️ CES TROIS NOMBRES ONT ÉTÉ MESURÉS, PAS CHOISIS. La référence de
         la course a été réduite à 480×270 et comparée bande par bande au
         rendu de `preview.mjs`. Verdict du 421 :

             bande y      référence   jeu (avant)
             0–45           106,9        37,7
             90–135         162,8        91,9
             L global       135,2        84,1
             pixels < L30    2,5 %      21,8 %

         Le jeu était CINQUANTE ET UN points de luminance trop sombre, et il
         écrasait neuf fois trop de pixels dans le noir. Ce n'était pas la
         palette (elle tient, vérifié au 420) : c'était l'absence de voile.

         ⚠️ ET LE VOILE N'EST PAS UN CALQUE POSÉ À LA FIN. Un voile final
         éclaircirait AUSSI les branches de cadrage, qui sont la seule chose
         de l'image qui doit rester noire. Il est donc appliqué par
         PROFONDEUR, dans `fogAt` — chaque ligne d'écran a sa distance, donc
         sa brume, exactement comme la référence. */
      FOG_MIN: 0.20,     // brume plancher : même à trois pas, l'air est épais
      FOG_NEAR: 3.0,     // distance à laquelle la brume commence à monter
      FOG_POW: 1.05,     // courbe. ⚠️ était 1,35 : trop tardive, elle laissait
                         // le plan moyen noir pendant que le fond blanchissait.

      /* ── LA FALAISE DE L'OUVERTURE (421) ──────────────────────────────
         La chaussée S'ARRÊTE. La lèvre est au mètre `endM` du mode ;
         `BRAKE_M` est la distance de freinage avant elle, `HOLD_S` le temps
         pendant lequel on reste au bord avant que la cinématique parte.
         ⚠️ Le freinage n'est pas cosmétique : sans lui le personnage arrive
         à pleine vitesse contre un vide et l'image se coupe sur un mouvement,
         ce qui lit comme une chute, pas comme une arrivée. */
      BRAKE_M: 46,       // on décélère sur les 46 derniers mètres
      HOLD_S: 2.2,       // temps d'arrêt au bord avant le fondu
      /* Distance CAMÉRA → lèvre à l'arrêt. Le personnage vivant à 2,6 unités
         devant la caméra, ce chiffre lui laisse le reste en sol devant les
         pieds.

         ⚠️ IL A ÉTÉ RÉGLÉ SUR LA COMPOSITION, PAS SUR LA VRAISEMBLANCE, ET
         C'EST UN ARBITRAGE QU'IL FAUT CONNAÎTRE AVANT D'Y TOUCHER. À 3,7 —
         « au bord », le choix évident — la lèvre tombe aux quatre cinquièmes
         du cadre et le vide occupe TOUTE la moitié médiane. Regardé sur
         planche : trois bandes horizontales empilées, tenues deux secondes.
         La scène la plus importante de l'ouverture était la plus plate.

         À 8, la lèvre remonte près de l'horizon, le vide se réduit à une
         bande étroite, et la chaussée qui fuit reprend les deux tiers de
         l'image — c'est-à-dire que la composition redevient celle du reste de
         la course, ce qui est exactement ce qu'on veut d'un plan final. Le
         personnage s'arrête à une trentaine de mètres du bord au lieu d'un
         mètre. Personne ne le remarque ; tout le monde voit la différence de
         cadrage. */
      EDGE_GAP: 8.0,

      /* ── LES DEUX USAGES DU MÊME MOTEUR (421) ─────────────────────────
         ⚠️ UN SEUL MOTEUR, DEUX PRÉRÉGLAGES — PAS DEUX FICHIERS. La course
         d'ouverture et le segment jouable du milieu de chapitre sont le même
         code : même projection, même chaussée, même brume. Les dupliquer
         aurait garanti qu'une correction de perspective ne soit appliquée
         qu'à un seul des deux, et le joueur aurait vu deux jeux.

         `run`  — l'ouverture. On court vers la falaise, on ne peut pas
                  perdre, et il n'y a PAS DE HUD : un compteur de score sur
                  la première image du jeu annonce un jeu d'arcade, alors
                  qu'on ouvre un récit. Pas d'éclats non plus — rien à
                  ramasser tant qu'on ne sait pas ce que c'est.
         `walk` — le segment du milieu, inchangé depuis le 419. */
      MODES: {
        run:  { endM: 420, hud: false, shards: false, braziers: true,  cliff: true  },
        walk: { endM: 500, hud: true,  shards: true,  braziers: true,  cliff: false },
      },
    },

    /* ── L'AURORE ────────────────────────────────────────────────────────
       ⚠️ CE BLOC EST LE PLUS IMPORTANT DU FICHIER. Guillaume : « l'aurore
       boréale doit être très précise graphiquement ».

       Une aurore n'est pas une tache verte : c'est un RIDEAU. Il a
         - une bordure basse nette et très lumineuse (là où les particules
           s'arrêtent), qu'on voit sur les deux références ;
         - des rayons VERTICAUX, parce que le rideau suit les lignes du champ
           magnétique et qu'on le regarde par la tranche ;
         - un sommet qui se dissout et vire au pourpre ;
         - des PLIS, parce que le rideau ondule dans le plan horizontal — et
           c'est le pli, pas la couleur, qui fait qu'on la reconnaît.

       Chaque `ribbon` est un rideau. Trois se chevauchent : c'est le
       chevauchement qui donne les zones très brillantes de l'image 2, jamais
       une opacité poussée. */
    AURORA: {
      /* ⚠️ TROIS RUBANS, ET ILS NE SE SUPERPOSENT PAS. Première version : les
         trois occupaient la même bande de ciel, sur toute la largeur, avec
         des hauteurs de 74 à 100 px. Résultat regardé dans `preview.mjs` :
         un MUR de rayures qui remplissait 70 % du cadre, et dont le bord bas
         se lisait comme une chaîne de collines. Une aurore qui occupe tout le
         ciel n'est plus un rideau, c'est un fond d'écran.

         La correction tient en trois chiffres : des PORTÉES plus courtes
         (`span`), des HAUTEURS divisées par deux, et des amplitudes de pli
         (`a1`) AUGMENTÉES. Moins de surface, plus de forme — c'est ce que
         montrent les deux références, où l'aurore est un ruban étroit et très
         plié dans un ciel majoritairement vide. */
      RIBBONS: [
        // le ruban principal : l'S de l'image 2
        { seed: 1301, y: 0.250, span: 400, x0: -30, h: 50, k: 1.25,
          a1: 20, f1: 0.0142, a2: 8,  f2: 0.0331, a3: 3, f3: 0.0790, drift: 0.115, p: 0.0 },
        // un ruban court et haut, qui croise le premier : c'est le CROISEMENT
        // qui donne les cœurs très clairs, jamais une opacité poussée
        { seed: 4217, y: 0.150, span: 250, x0: 170, h: 32, k: 0.80,
          a1: 13, f1: 0.0223, a2: 5,  f2: 0.0492, a3: 2, f3: 0.1070, drift: 0.175, p: 2.1 },
        // un voile lointain, très faible, qui donne la profondeur du ciel
        { seed: 9109, y: 0.330, span: 620, x0: -230, h: 66, k: 0.30,
          a1: 26, f1: 0.0083, a2: 11, f2: 0.0181, a3: 4, f3: 0.0425, drift: 0.076, p: 4.4 },
      ],
      /* Le halo diffus SOUS le rideau. Sans lui le bas du rideau a l'air
         découpé aux ciseaux ; avec lui, il éclaire le ciel autour de lui,
         ce qui est ce que fait une vraie aurore. Divisé par deux après la
         première image : il empâtait le bord bas, qui est justement ce qu'il
         y a de plus net dans le phénomène réel. */
      BLOOM_H: 17, BLOOM_K: 0.062,
      /* La réverbération sur la neige et sur la glace. Détail coûteux et
         indispensable : une source de lumière qui n'éclaire rien flotte. */
      REFLECT_K: 0.135,
    },

    /* Chute de neige : trois plans, comme les arbres. */
    SNOWFALL: { NEAR: 26, MID: 46, FAR: 74 },

    /* Textes de dialogue : vitesse de frappe, en caractères par seconde. */
    TYPE_CPS: 42,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = CFG;
