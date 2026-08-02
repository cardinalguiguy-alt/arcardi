/* =============================================================================
   paint.js — LES TEXTURES, PEINTES PAR CODE. Aucun bitmap, aucune dépendance.
   -----------------------------------------------------------------------------
   Signature du site (cf. fermeArt.js côté ferme, world.js côté défi de fuite) :
   tout le graphisme est GÉNÉRÉ. Rien à télécharger, rien à versionner, et une
   palette qui ne peut pas dériver d'un fichier image oublié.

   ⚠️ CE FICHIER NE CONNAÎT PAS THREE.JS, et c'est délibéré : il ne fait que
   remplir des <canvas>. C'est ce qui permet à tools/smoke-render.mjs de le
   rejouer contre un faux contexte 2D sans navigateur.

   ⚠️ RÈGLE DURE : `fillRect` ET RIEN D'AUTRE. Pas de dégradé, pas d'arc, pas de
   tracé. Ce n'est pas une limitation de l'outil, c'EST le contrôle : le faux
   contexte de smoke-render.mjs JETTE sur tout le reste, donc une texture qui
   s'éloignerait du pixel franc casse la vérification au lieu de dessiner
   silencieusement autre chose que le jeu. Même principe que
   lib-sprite-canvas.mjs côté ferme.

   ===========================================================================
   ZIP 394 — TOUT A ÉTÉ REPRIS SUR LES DEUX IMAGES DE GUILLAUME
   ---------------------------------------------------------------------------
   Ce qui a été RELEVÉ sur elles, et qui pilote chaque fonction de ce fichier :

     * la maçonnerie est faite de TRÈS GROS blocs — quatre ou cinq assises sur
       toute la hauteur d'un mur, pas quinze. La première version en mettait
       six sur une texture répétée : à l'écran ça donnait un mur de carrelage ;
     * les blocs sont CHAUDS (khaki, sable, olive), pas gris. C'est la lumière
       des torches qui les fait, et il faut la peindre DANS la texture, sinon
       aucune lumière ponctuelle ne la rattrape ;
     * la mousse est en CARRÉS FRANCS, verts vifs, un bloc sur six environ, et
       jamais en mouchetis ;
     * le ciel est violet, avec des PYRAMIDES et des ARBRES MORTS en silhouette
       plus sombre. C'est ce qui donne l'échelle et le lieu ;
     * l'eau du lac est un violet SATURÉ et lumineux, en volutes — pas la nappe
       sombre de la première version.
   ========================================================================== */

const Paint = (function () {

  const hex = (n) => "#" + n.toString(16).padStart(6, "0");

  /* Bruit déterministe. On ne se sert JAMAIS de Math.random dans une texture :
     deux joueurs verraient deux murs différents, et une même partie rejouée ne
     se ressemblerait pas d'une image à l'autre. */
  function noise(i) {
    let t = (i + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* Mélange de deux couleurs entières. Sert à fabriquer les nuances d'une même
     pierre sans multiplier les constantes de config.js : la carrière est
     définie par TROIS teintes, tout le reste en est dérivé. */
  function mix(a, b, k) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (((ar + (br - ar) * k) | 0) << 16) | (((ag + (bg - ag) * k) | 0) << 8) | ((ab + (bb - ab) * k) | 0);
  }

  /* -----------------------------------------------------------------------
     LE MUR. Appareillage à joints décalés, GROS blocs, mousse en carrés.
     -----------------------------------------------------------------------
     ⚠️ QUATRE ASSISES ET DEUX COLONNES, contre six et quatre au zip 393. La
     texture est répétée deux fois sur la hauteur d'un mur de 11 unités : on
     voit donc huit assises du sol au sommet, et chaque bloc fait environ 1,4
     unité de haut — la taille relevée sur les images de Guillaume. Avec
     l'ancien découpage on en comptait vingt-quatre, ce qui produisait une
     mosaïque au lieu d'une maçonnerie.

     LE JOINT EST CLAIR ET LARGE. Sur les images c'est lui qui dessine le mur :
     un joint fin et sombre donne un mur uni dès qu'on s'éloigne de dix unités.
     -------------------------------------------------------------------- */
  function wall(ctx, cfg, W, H, seed) {
    const rows = 4, cols = 2;
    const bh = H / rows, bw = W / cols;
    ctx.fillStyle = hex(cfg.COL_MORTAR);
    ctx.fillRect(0, 0, W, H);
    const joint = Math.max(3, Math.round(W / 42));
    let k = seed * 977 + 11;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) ? bw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off, y = r * bh;
        const n = noise(k++);
        /* CINQ nuances tirées par bloc, toutes dérivées des trois teintes de
           la carrière. Une carrière n'est jamais d'un seul ton, et sur un bloc
           de 1,4 unité un aplat se voit immédiatement. */
        const base = n < 0.20 ? cfg.COL_BRICK_LIT
          : n < 0.46 ? cfg.COL_BRICK
          : n < 0.72 ? mix(cfg.COL_BRICK, cfg.COL_BRICK_DARK, 0.45)
          : n < 0.90 ? cfg.COL_BRICK_DARK
          : mix(cfg.COL_BRICK, cfg.COL_BRICK_LIT, 0.7);
        ctx.fillStyle = hex(base);
        ctx.fillRect(x + joint, y + joint, bw - joint * 2, bh - joint * 2);

        // Biseau : une arête claire en haut, une ombre en bas. Deux fillRect
        // qui font tout le relief — bien plus qu'un dégradé n'en donnerait.
        ctx.fillStyle = hex(mix(base, cfg.COL_BRICK_LIT, 0.55));
        ctx.fillRect(x + joint, y + joint, bw - joint * 2, joint);
        ctx.fillStyle = hex(mix(base, 0x000000, 0.45));
        ctx.fillRect(x + joint, y + bh - joint * 2, bw - joint * 2, joint);

        // MOUSSE : un carré franc, vert vif, un bloc sur six. Sur les images
        // elle est nette et lumineuse — c'est la seule couleur froide du mur.
        if (noise(k++) < 0.17) {
          const u = Math.max(4, bw / 7);
          const mw = u * (1 + ((noise(k) * 2) | 0));
          const mh = u * (1 + ((noise(k + 7) * 2) | 0));
          ctx.fillStyle = hex(noise(k + 13) < 0.6 ? cfg.COL_MOSS : cfg.COL_MOSS_DARK);
          ctx.fillRect(x + joint + Math.floor(noise(k + 3) * (bw - mw - joint * 2)),
                       y + joint * 2 + Math.floor(noise(k + 5) * (bh - mh - joint * 3)), mw, mh);
        }
        // Éclat manquant dans le coin d'un bloc : une ruine, pas un neuf.
        if (noise(k++) < 0.12) {
          const u = Math.max(3, bw / 9);
          ctx.fillStyle = hex(cfg.COL_MORTAR);
          ctx.fillRect(x + bw - joint - u, y + bh - joint - u, u, u);
        }
      }
    }
  }

  /* -----------------------------------------------------------------------
     LE SOL. Grandes dalles usées, joints moussus, gravats.
     -----------------------------------------------------------------------
     Deux dalles par cellule et par axe, soit des dalles de 5,75 unités —
     l'échelle des images, où l'on voit trois ou quatre dalles entre les deux
     murs d'un couloir. Le sol reste plus SOMBRE que les murs : il reçoit la
     lumière des torches de biais, et un sol aussi clair écrase la perspective.
     -------------------------------------------------------------------- */
  function floor(ctx, cfg, W, H, seed) {
    const n = 2;
    const s = W / n;
    ctx.fillStyle = hex(cfg.COL_STONE_EDGE);
    ctx.fillRect(0, 0, W, H);
    const joint = Math.max(3, Math.round(W / 40));
    let k = seed * 131 + 3;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = noise(k++);
      const base = v < 0.28 ? cfg.COL_FLOOR_LIT : v < 0.68 ? cfg.COL_FLOOR : cfg.COL_FLOOR_DARK;
      ctx.fillStyle = hex(base);
      ctx.fillRect(i * s + joint, j * s + joint, s - joint * 2, s - joint * 2);
      ctx.fillStyle = hex(mix(base, cfg.COL_FLOOR_LIT, 0.4));
      ctx.fillRect(i * s + joint, j * s + joint, s - joint * 2, joint);
      // fêlures
      if (noise(k++) < 0.4) {
        ctx.fillStyle = hex(cfg.COL_CRACK);
        const cx = i * s + joint + noise(k + 1) * (s - joint * 3);
        ctx.fillRect(cx, j * s + joint, joint * 0.7, s - joint * 2);
      }
      // mousse dans les joints
      if (noise(k++) < 0.35) {
        ctx.fillStyle = hex(cfg.COL_MOSS_DARK);
        ctx.fillRect(i * s + joint, j * s + s - joint * 2, s - joint * 2, joint);
      }
      // gravats : petits carrés clairs posés sur la dalle
      for (let g = 0; g < 3; g++) {
        if (noise(k++) > 0.4) continue;
        const u = Math.max(2, s / 22);
        ctx.fillStyle = hex(mix(cfg.COL_FLOOR_LIT, cfg.COL_BRICK, 0.5));
        ctx.fillRect(i * s + joint + noise(k + g) * (s - joint * 2 - u),
                     j * s + joint + noise(k + g + 31) * (s - joint * 2 - u), u, u);
      }
    }
  }

  /* -----------------------------------------------------------------------
     LE CIEL — violet, pyramides, arbres morts.
     -----------------------------------------------------------------------
     C'est l'ajout du 394 qui change le plus l'impression d'ensemble : sur les
     deux images, ce qu'on voit au-dessus des murs n'est pas du noir, c'est un
     ciel violet avec des PYRAMIDES en silhouette et des ARBRES MORTS
     décharnés. Sans lui, un labyrinthe à ciel ouvert ressemble à une cave dont
     on aurait oublié le plafond.

     Peint en BANDES horizontales (pas de dégradé : voir la règle dure en
     tête de fichier), ce qui donne d'ailleurs exactement le ciel étagé des
     images plutôt qu'un fondu lisse.
     -------------------------------------------------------------------- */
  function sky(ctx, cfg, W, H) {
    const bands = 26;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);                     // 0 = zénith, 1 = horizon
      ctx.fillStyle = hex(mix(cfg.SKY_TOP, cfg.SKY_HORIZON, t * t));
      ctx.fillRect(0, (i / bands) * H, W, H / bands + 1);
    }
    // --- PYRAMIDES, en escalier de rectangles (voxel, comme le reste)
    const horizon = H * 0.74;
    const pyr = [
      { x: 0.14, w: 0.20, h: 0.30 }, { x: 0.31, w: 0.13, h: 0.19 },
      { x: 0.55, w: 0.24, h: 0.34 }, { x: 0.76, w: 0.15, h: 0.22 },
      { x: 0.90, w: 0.18, h: 0.26 },
    ];
    for (let p = 0; p < pyr.length; p++) {
      const P = pyr[p];
      const steps = 16;
      const bw = P.w * W, bh = P.h * H;
      const cx = P.x * W;
      // Les plus hautes sont les plus lointaines, donc les plus délavées.
      const col = mix(cfg.SKY_HORIZON, cfg.COL_PYRAMID, 0.35 + P.h);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const w = bw * (1 - t);
        ctx.fillStyle = hex(i === 0 ? mix(col, cfg.SKY_TOP, 0.25) : col);
        ctx.fillRect(cx - w / 2, horizon - bh * (t + 1 / steps), w, bh / steps + 1);
      }
      // Face éclairée : une bande verticale plus claire, côté gauche.
      ctx.fillStyle = hex(mix(col, cfg.SKY_HORIZON, 0.35));
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const w = bw * (1 - t);
        ctx.fillRect(cx - w / 2, horizon - bh * (t + 1 / steps), w * 0.34, bh / steps + 1);
      }
    }
    // --- ARBRES MORTS : tronc + branches en L, tout en rectangles.
    let k = 7;
    for (let i = 0; i < 9; i++) {
      const x = (noise(k++) * 0.98) * W;
      const h = H * (0.10 + noise(k++) * 0.13);
      const w = Math.max(2, W / 300);
      ctx.fillStyle = hex(cfg.COL_DEADTREE);
      ctx.fillRect(x, horizon - h, w, h);
      for (let b = 0; b < 4; b++) {
        if (noise(k++) < 0.35) continue;
        const by = horizon - h * (0.45 + noise(k) * 0.5);
        const dir = noise(k + 5) < 0.5 ? -1 : 1;
        const bl = h * (0.16 + noise(k + 9) * 0.22);
        ctx.fillRect(dir < 0 ? x - bl : x + w, by, bl, w);
        ctx.fillRect(dir < 0 ? x - bl : x + bl, by - bl * 0.6, w, bl * 0.6);
      }
    }
    // Brume violette sur l'horizon : elle raccorde le ciel aux murs.
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = hex(mix(cfg.SKY_HORIZON, cfg.COL_PURPLE_DIM, i / 9));
      ctx.fillRect(0, horizon - i * 2, W, 3);
    }
    ctx.fillStyle = hex(cfg.COL_VOID);
    ctx.fillRect(0, horizon, W, H - horizon);
  }

  /* -----------------------------------------------------------------------
     LE LAC, vu par un trou du sol.
     -----------------------------------------------------------------------
     ⚠️ REPRIS EN ENTIER AU 394. La première version peignait des ondes
     discrètes sur fond sombre : dans un trou, ça se lisait comme un trou noir.
     Sur l'image de Guillaume, l'eau est un violet SATURÉ ET LUMINEUX qui
     tourne en volutes, et c'est elle qui éclaire le bord du trou par en
     dessous. On peint donc clair sur clair, en spirales concentriques
     décalées, avec des crêtes presque blanches.
     -------------------------------------------------------------------- */
  /* -----------------------------------------------------------------------
     ⚠️ L'EAU DU LAC — REPRISE À L'IDENTIQUE DU DÉFI DE FUITE. ZIP 396.
     -----------------------------------------------------------------------
     Retour de Guillaume : « le rendu de l'eau du lac n'est pas convaincant.
     Copie simplement ce qu'il y a dans le endless run. C'est la texture
     parfaite. »

     CE QU'IL Y AVAIT AVANT, ET POURQUOI ÇA NE POUVAIT PAS MARCHER. La version
     du 394 peignait quatorze ANNEAUX CARRÉS concentriques, répétés dix fois
     par dix sur un plan de 414 unités. Un anneau carré répété en grille ne se
     lit pas comme un tourbillon : il se lit comme un circuit imprimé, et c'est
     très exactement ce qu'on voit sur la capture de Guillaume. Le motif était
     en plus CENTRÉ sur sa tuile, donc la répétition sautait aux yeux — le
     défaut qu'une somme de sinus n'a jamais.

     CE QUI EST RECOPIÉ, ligne pour ligne, de paintLakeWaves() dans
     public/templerun/js/world.js :
       * une somme de TROIS sinus, en x, en y et en diagonale ;
       * des périodes qui DIVISENT la taille de la tuile (3, 2 et 5 pour 128) —
         c'est ce qui fait que la texture se répète sans couture, condition
         indispensable avec RepeatWrapping ;
       * une puissance 3,2 sur le mélange : crêtes fines, creux larges. C'est
         cette courbe-là qui fait « eau » plutôt que « damier flou » ;
       * les deux mêmes couleurs, COL_LAKE pour le creux et COL_LAKE_GLOW pour
         la crête — toutes deux dans la palette COMMUNE aux deux jeux, donc
         contrôlées par tools/verify-palette.mjs.

     ⚠️ ET LA RÈGLE DU `fillRect` SEUL EST INTACTE. Le défi de fuite écrit sa
     houle avec getImageData / putImageData ; ici c'est interdit, et pour une
     bonne raison — c'est ce refus qui fait tout le contrôle de
     tools/smoke-render.mjs. On peint donc pixel par pixel, 16 384 fillRect de
     1×1, UNE SEULE FOIS à la construction de la scène. Le résultat est le
     même au bit près, et aucun outil n'a été affaibli pour l'obtenir.
     Affaiblir un contrôle pour faire passer une texture, c'est perdre le
     contrôle et garder la texture.
     -------------------------------------------------------------------- */
  function lakeWaves(ctx, cfg, W, H, seedPhase, deepCol, crestCol) {
    const S = Math.min(W, H);
    const dr = (deepCol >> 16) & 255, dg = (deepCol >> 8) & 255, db = deepCol & 255;
    const gr = (crestCol >> 16) & 255, gg = (crestCol >> 8) & 255, gb = crestCol & 255;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = Math.sin((x / S) * Math.PI * 2 * 3 + seedPhase);
        const b = Math.sin((y / S) * Math.PI * 2 * 2 - seedPhase * 1.7);
        const c = Math.sin(((x + y) / S) * Math.PI * 2 * 5 + seedPhase * 0.5);
        let k = (a * 0.45 + b * 0.35 + c * 0.20 + 1) / 2;
        k = Math.pow(k, 3.2);                 // crêtes fines, creux larges
        const r = (dr + (gr - dr) * k) | 0;
        const g = (dg + (gg - dg) * k) | 0;
        const bl = (db + (gb - db) * k) | 0;
        ctx.fillStyle = hex((r << 16) | (g << 8) | bl);
        ctx.fillRect(x, y, 1, 1);
      }
    }
    void cfg;
  }
  /* Les deux appels du jeu. La seconde nappe a une PHASE différente (2,1) et
     défile plus lentement à une autre échelle : c'est le décalage entre les
     deux qui produit le miroitement, et aucune des deux textures ne le
     contient. Même astuce que deux calques de nuages, et ça coûte deux plans. */
  function lake(ctx, cfg, W, H) { lakeWaves(ctx, cfg, W, H, 0, cfg.COL_LAKE, cfg.COL_LAKE_GLOW); }
  function lakeGlow(ctx, cfg, W, H) { lakeWaves(ctx, cfg, W, H, 2.1, cfg.COL_LAKE, cfg.COL_LAKE_GLOW); }

  /* -----------------------------------------------------------------------
     LA FLAMME. Quatre découpes, reprises du défi de fuite.
     -----------------------------------------------------------------------
     ⚠️ Le zip 377 a trouvé, EN REGARDANT, que la flamme du défi était peinte
     à l'envers : ventre en haut, pointe en bas, soit un panache de fumée
     suspendu au-dessus du bâton. Le sens est donc écrit ici noir sur blanc :
     LARGE EN BAS (à la mèche), POINTU EN HAUT. Le cœur clair est décalé vers
     le bas pour la même raison — c'est à la base que ça brûle.

     Au 394 les flammes ont été ÉLARGIES et le cœur BLANCHI : sur les images de
     Guillaume, une torche murale est une grosse tache lumineuse à trois
     paliers (blanc, or, orange), pas une languette.
     -------------------------------------------------------------------- */
  function flame(ctx, cfg, W, H, cut) {
    ctx.clearRect(0, 0, W, H);
    const rows = 14;
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);                 // 0 = bas (mèche), 1 = pointe
      const bulge = Math.sin((1 - t) * Math.PI * 0.6 + 0.22);
      const wob = Math.sin(t * 5.5 + cut * 1.9) * 0.13;
      const w = W * (0.22 + bulge * 0.55 + wob) * (1 - t * 0.12);
      const y = H - (r + 1) * (H / rows);
      const x = (W - w) / 2 + Math.sin(t * 3.1 + cut * 2.4) * W * 0.08;
      ctx.fillStyle = hex(cfg.COL_TORCH_OUT);
      ctx.fillRect(x, y, w, H / rows + 1);
    }
    for (let r = 0; r < rows * 0.72; r++) {
      const t = r / (rows * 0.72);
      const w = W * (0.16 + (1 - t) * 0.36);
      const y = H - (r + 1) * (H / rows);
      ctx.fillStyle = hex(cfg.COL_TORCH);
      ctx.fillRect((W - w) / 2 + Math.sin(t * 2.6 + cut) * W * 0.04, y, w, H / rows + 1);
    }
    for (let r = 0; r < rows * 0.42; r++) {
      const t = r / (rows * 0.42);
      const w = W * (0.10 + (1 - t) * 0.22);
      const y = H - (r + 1) * (H / rows);
      ctx.fillStyle = hex(cfg.COL_TORCH_CORE);
      ctx.fillRect((W - w) / 2, y, w, H / rows + 1);
    }
  }

  /* Le bois des potences, des poutres et du fût : fil vertical, deux tons. */
  function wood(ctx, cfg, W, H) {
    ctx.fillStyle = hex(cfg.COL_BARK);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 11; i++) {
      const x = noise(i * 41) * W;
      ctx.fillStyle = hex(noise(i * 23) < 0.5 ? cfg.COL_BARK_DARK : cfg.COL_PLANK);
      ctx.fillRect(x, 0, Math.max(1, W / 12), H);
    }
    // Deux nœuds : c'est ce qui empêche la poutre de ressembler à un tube.
    for (let i = 0; i < 2; i++) {
      const u = Math.max(2, W / 4);
      ctx.fillStyle = hex(cfg.COL_BARK_DARK);
      ctx.fillRect(noise(i * 77) * (W - u), noise(i * 53) * (H - u), u, u * 0.7);
    }
  }

  /* La stèle à runes : mêmes gravures violettes que le défi. Elle marque les
     BRASIERS ravivables, donc elle sert de repère de navigation autant que de
     décor — c'est ce qui les distingue au premier coup d'œil des dizaines de
     torches murales purement décoratives. */
  function rune(ctx, cfg, W, H) {
    ctx.fillStyle = hex(cfg.COL_STONE_DARK);
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = hex(cfg.COL_STONE_EDGE);
    ctx.fillRect(0, H - H / 12, W, H / 12);
    const u = W / 12;
    let k = 5;
    for (let r = 0; r < 4; r++) {
      const y = H * 0.12 + r * H * 0.21;
      for (let c = 0; c < 3; c++) {
        if (noise(k++) < 0.35) continue;
        const x = W * 0.18 + c * W * 0.28;
        ctx.fillStyle = hex(cfg.COL_RUNE);
        ctx.fillRect(x, y, u, u * 3);
        if (noise(k++) < 0.6) ctx.fillRect(x, y, u * 2.4, u);
        if (noise(k++) < 0.6) ctx.fillRect(x, y + u * 2, u * 2.4, u);
      }
    }
  }

  /* Halo additif générique : un disque carré dégradé en anneaux. Sert aux
     éclats, aux flammes et à la lueur des trous. Peint en anneaux plutôt qu'en
     dégradé radial, pour la règle du fillRect. */
  function halo(ctx, cfg, W, H, color) {
    ctx.clearRect(0, 0, W, H);
    const rings = 10;
    for (let i = rings; i > 0; i--) {
      const t = i / rings;
      const s = (W / 2) * t;
      ctx.fillStyle = hex(mix(0x000000, color, (1 - t) * (1 - t)));
      ctx.fillRect(W / 2 - s, H / 2 - s, s * 2, s * 2);
    }
  }

  /* -----------------------------------------------------------------------
     LES CHIFFRES QUI MONTENT (zip 396) — une fonte 3×5 peinte au fillRect.
     -----------------------------------------------------------------------
     Guillaume : « on sait pas quand on gagne ». Un « +60 » qui monte de
     l'endroit exact où la créature tombe le dit sans faire lever les yeux vers
     le HUD, et c'est là toute la différence : au moment où on gagne un
     échange, on regarde la créature, pas le coin de l'écran.

     ⚠️ POURQUOI PAS DU TEXTE DU NAVIGATEUR. `fillText` est interdit par la
     règle du fillRect seul (et smoke-render.mjs le refuserait), mais ce n'est
     pas la vraie raison — la vraie raison est que tout le graphisme du site
     est GÉNÉRÉ, jusqu'aux lettres. Une police de système au milieu d'un décor
     en pixels francs se voit immédiatement.

     Chaque glyphe est cerné de noir : posé sur un halo violet ou une flamme
     orange, un chiffre clair sans cerne disparaît (leçon du 388 — deux masses
     de même couleur qui se touchent n'en font qu'une).
     -------------------------------------------------------------------- */
  const GLYPH = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
    "+": ["000", "010", "111", "010", "000"],
  };
  function number(ctx, cfg, W, H, text, color) {
    const s = String(text);
    const cw = 4, ch = 5;                       // 3 colonnes + 1 d'espace
    const px = Math.max(1, Math.floor(Math.min(W / (s.length * cw + 2), H / (ch + 2))));
    const ox = ((W - s.length * cw * px) / 2) | 0;
    const oy = ((H - ch * px) / 2) | 0;
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? "#000000" : hex(color);
      for (let i = 0; i < s.length; i++) {
        const g = GLYPH[s[i]];
        if (!g) continue;
        for (let r = 0; r < ch; r++) for (let c = 0; c < 3; c++) {
          if (g[r][c] !== "1") continue;
          const x = ox + (i * cw + c) * px, y = oy + r * px;
          if (pass === 0) ctx.fillRect(x - px, y - px, px * 3, px * 3);  // cerne
          else ctx.fillRect(x, y, px, px);
        }
      }
    }
    void cfg;
  }

  return { wall, floor, sky, lake, lakeGlow, lakeWaves, number, flame, wood, rune, halo, noise, mix, hex };
})();

if (typeof module === "object" && module.exports) module.exports = { Paint };
