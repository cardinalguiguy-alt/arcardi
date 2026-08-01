/* =============================================================================
   paint.js — LES TEXTURES, PEINTES PAR CODE. Aucun bitmap, aucune dépendance.
   -----------------------------------------------------------------------------
   Signature du site (cf. fermeArt.js côté ferme, world.js côté défi de fuite) :
   tout le graphisme est GÉNÉRÉ. Rien à télécharger, rien à versionner, et une
   palette qui ne peut pas dériver d'un fichier image oublié.

   ⚠️ CE FICHIER NE CONNAÎT PAS THREE.JS, et c'est délibéré : il ne fait que
   remplir des <canvas>. C'est ce qui permet à tools/render-maze.mjs de le
   rejouer contre un faux contexte 2D et d'écrire des PNG À REGARDER, sans
   navigateur — la méthode « rendre et regarder » du projet, qui a trouvé SEIZE
   défauts en regardant contre zéro en relisant.

   LA RÉFÉRENCE EST L'IMAGE DE GUILLAUME : gros blocs de pierre taillée, joints
   de mortier clairs, taches de mousse VERTES éparses (jamais un tapis), et des
   torches murales sur potence. La brique est nettement plus grande que celle
   d'un mur réel — c'est ce qui donne l'échelle de jeu vidéo voxel.
   ========================================================================== */

const Paint = (function () {

  const hex = (n) => "#" + n.toString(16).padStart(6, "0");

  /* Bruit déterministe. On ne se sert JAMAIS de Math.random dans une texture :
     deux joueurs verraient deux murs différents, et surtout une même partie
     rejouée ne se ressemblerait pas d'une image à l'autre si une texture
     venait à être recréée. */
  function noise(i) {
    let t = (i + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /* -----------------------------------------------------------------------
     LE MUR. Appareillage à joints décalés, façon image de référence.
     -----------------------------------------------------------------------
     Trois choses comptent, et ce sont exactement les trois qu'on voit sur
     l'image : les JOINTS (clairs, larges, c'est eux qui donnent l'échelle),
     le DÉCALAGE d'une assise à l'autre (sans lui, on lit une grille, pas une
     maçonnerie), et les taches de MOUSSE, rares et vives.

     ⚠️ La mousse est posée par blocs ENTIERS ou par gros carrés, jamais en
     mouchetis fin : à la distance où l'on voit ces murs (2 à 15 unités), un
     mouchetis se lit comme du bruit de compression, pas comme du vivant.
     -------------------------------------------------------------------- */
  function wall(ctx, cfg, W, H, seed) {
    const rows = 6, cols = 4;
    const bh = H / rows, bw = W / cols;
    ctx.fillStyle = hex(cfg.COL_MORTAR);
    ctx.fillRect(0, 0, W, H);
    const joint = Math.max(2, Math.round(W / 64));
    let k = seed * 977;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) ? bw / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = c * bw + off, y = r * bh;
        const n = noise(k++);
        // Trois nuances de pierre tirées au sort par bloc : une carrière n'est
        // jamais d'un seul ton, et sans cette variation le mur devient un
        // aplat dès qu'on s'en éloigne de trois mètres.
        const base = n < 0.33 ? cfg.COL_PAVE : n < 0.72 ? cfg.COL_PAVE_DARK : cfg.COL_STONE;
        ctx.fillStyle = hex(base);
        ctx.fillRect(x + joint, y + joint, bw - joint * 2, bh - joint * 2);
        // Ombre portée en bas du bloc : c'est elle qui donne le relief, bien
        // plus que n'importe quel dégradé.
        ctx.fillStyle = hex(cfg.COL_STONE_EDGE);
        ctx.fillRect(x + joint, y + bh - joint * 2, bw - joint * 2, joint);
        // Mousse : un bloc sur ~7, en carré franc dans un coin du bloc.
        if (noise(k++) < 0.14) {
          const mw = bw * (0.3 + noise(k) * 0.35), mh = bh * (0.28 + noise(k + 7) * 0.4);
          ctx.fillStyle = hex(noise(k + 13) < 0.5 ? cfg.COL_MOSS : cfg.COL_MOSS_DARK);
          ctx.fillRect(x + joint + (bw - mw) * noise(k + 3), y + joint, mw, mh);
        }
        // Fêlure : un trait sombre vertical, un bloc sur ~12.
        if (noise(k++) < 0.09) {
          ctx.fillStyle = hex(cfg.COL_CRACK);
          ctx.fillRect(x + bw * (0.25 + noise(k + 5) * 0.5), y + joint, joint, bh - joint * 2);
        }
      }
    }
  }

  /* -----------------------------------------------------------------------
     LE SOL. Dalles carrées, trois paliers d'usure, joints moussus.
     -----------------------------------------------------------------------
     Repris du défi de fuite (FLOOR_WEAR_WEIGHTS) pour que les deux jeux aient
     la même carrière — c'est la demande de Guillaume, « textures similaires ».
     Le sol est plus SOMBRE que les murs : les murs prennent la lumière de la
     torche, le sol la reçoit de biais, et un sol aussi clair que les murs
     écrase complètement la perspective du couloir.
     -------------------------------------------------------------------- */
  function floor(ctx, cfg, W, H, seed) {
    const n = 2;                        // 2×2 dalles par cellule
    const s = W / n;
    ctx.fillStyle = hex(cfg.COL_STONE_EDGE);
    ctx.fillRect(0, 0, W, H);
    const joint = Math.max(2, Math.round(W / 48));
    let k = seed * 131;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = noise(k++);
      const base = v < 0.25 ? cfg.COL_STONE : v < 0.7 ? cfg.COL_STONE_DARK : cfg.COL_STONE_EDGE;
      ctx.fillStyle = hex(base);
      ctx.fillRect(i * s + joint, j * s + joint, s - joint * 2, s - joint * 2);
      if (noise(k++) < 0.3) {
        ctx.fillStyle = hex(cfg.COL_STAIN_DARK);
        const w = s * 0.3, h = s * 0.22;
        ctx.fillRect(i * s + joint + (s - w) * noise(k + 2), j * s + joint + (s - h) * noise(k + 9), w, h);
      }
      if (noise(k++) < 0.22) {
        ctx.fillStyle = hex(cfg.COL_MOSS_DARK);
        ctx.fillRect(i * s + joint, j * s + s - joint * 2, s - joint * 2, joint);
      }
    }
  }

  /* -----------------------------------------------------------------------
     LE LAC, vu par un trou. Ondes claires sur fond sombre.
     -----------------------------------------------------------------------
     Mêmes deux teintes que le défi (COL_LAKE / COL_LAKE_GLOW) : ce sont les
     CRÊTES qui luisent, pas la masse. Une eau uniformément violette se lit
     comme un sol de couleur ; ce sont les bandes claires qui disent que ça
     bouge et que c'est liquide.
     -------------------------------------------------------------------- */
  function lake(ctx, cfg, W, H) {
    ctx.fillStyle = hex(cfg.COL_LAKE);
    ctx.fillRect(0, 0, W, H);
    const bands = 22;
    for (let i = 0; i < bands; i++) {
      const y = (i / bands) * H + noise(i * 31) * 6;
      const h = 2 + noise(i * 17) * 5;
      const w = W * (0.25 + noise(i * 7) * 0.7);
      const x = noise(i * 13) * (W - w);
      ctx.fillStyle = hex(noise(i * 3) < 0.45 ? cfg.COL_LAKE_GLOW : cfg.COL_PURPLE_DIM);
      ctx.fillRect(x, y, w, h);
    }
  }

  /* -----------------------------------------------------------------------
     LA FLAMME. Quatre découpes, reprises du défi de fuite.
     -----------------------------------------------------------------------
     ⚠️ Le zip 377 a trouvé, EN REGARDANT, que la flamme du défi était peinte
     à l'envers : ventre en haut, pointe en bas, soit un panache de fumée
     suspendu au-dessus du bâton. Le sens est donc écrit ici noir sur blanc :
     LARGE EN BAS (à la mèche), POINTU EN HAUT. Le cœur clair est décalé vers
     le bas pour la même raison — c'est à la base que ça brûle.
     -------------------------------------------------------------------- */
  function flame(ctx, cfg, W, H, cut) {
    ctx.clearRect(0, 0, W, H);
    const rows = 16;
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);                 // 0 = bas (mèche), 1 = haut (pointe)
      // Largeur : maximale au tiers bas, nulle à la pointe.
      const bulge = Math.sin((1 - t) * Math.PI * 0.62 + 0.18);
      const wob = Math.sin(t * 6 + cut * 1.9) * 0.12;
      const w = W * (0.16 + bulge * 0.42 + wob) * (1 - t * 0.15);
      const y = H - (r + 1) * (H / rows);
      const x = (W - w) / 2 + Math.sin(t * 3.1 + cut * 2.4) * W * 0.07;
      ctx.fillStyle = hex(cfg.COL_TORCH);
      ctx.fillRect(x, y, w, H / rows + 1);
    }
    // Cœur : plus clair, plus étroit, et BAS.
    for (let r = 0; r < rows * 0.55; r++) {
      const t = r / (rows * 0.55);
      const w = W * (0.10 + (1 - t) * 0.20);
      const y = H - (r + 1) * (H / rows);
      ctx.fillStyle = "#ffe9b0";
      ctx.fillRect((W - w) / 2, y, w, H / rows + 1);
    }
  }

  /* Le bois du fût de torche et de la potence : fil vertical, deux tons. */
  function wood(ctx, cfg, W, H) {
    ctx.fillStyle = hex(cfg.COL_BARK);
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const x = noise(i * 41) * W;
      ctx.fillStyle = hex(noise(i * 23) < 0.5 ? cfg.COL_BARK_DARK : cfg.COL_PLANK);
      ctx.fillRect(x, 0, Math.max(1, W / 14), H);
    }
  }

  /* La stèle à runes : mêmes gravures violettes que le défi. Elle marque les
     brasiers, donc elle sert de REPÈRE de navigation autant que de décor. */
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

  return { wall, floor, lake, flame, wood, rune, noise, hex };
})();

if (typeof module === "object" && module.exports) module.exports = { Paint };
