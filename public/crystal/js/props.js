/* =============================================================================
   props.js — BRASEROS, PONT, COLONNES, CRISTAUX, CABANE, BÊTES, LE PERSONNAGE.
   -----------------------------------------------------------------------------
   Tout ce qui est POSÉ dans le décor plutôt que généré par lui.
   ========================================================================== */

const Props = (function () {
  const P = CFG.PAL, W = CFG.W, H = CFG.H;
  const mix = Pix.mix, clamp01 = Pix.clamp01;

  /* ═══════════════════════════════════════════════════════════════════════
     LE BRASERO À FLAMME FROIDE
     ───────────────────────────────────────────────────────────────────────
     Le motif central des deux références, et l'objet le plus chargé de sens
     du jeu : c'est LUI qui prouve, à la première seconde du chapitre 1, que
     quelqu'un vit ici. Aucune ligne de texte ne fait ce travail aussi vite
     qu'une flamme qu'on n'a pas allumée soi-même.

     ⚠️ IL SE DESSINE EN CINQ TEMPS, ET L'ORDRE COMPTE :
       1. le HALO (additif, large, faible) — il doit être SOUS la pierre,
          sinon le socle a l'air translucide ;
       2. la FLAQUE de lumière sur la neige — une lumière qui n'éclaire pas le
          sol flotte, c'est la faute la plus commune ;
       3. le SOCLE de pierre, avec sa calotte de neige ;
       4. la FLAMME elle-même, trois valeurs, plus un cœur d'un pixel ;
       5. le SCINTILLEMENT rapproché.
     ═══════════════════════════════════════════════════════════════════════ */
  function brazier(fb, x, groundY, t, opts) {
    opts = opts || {};
    const s = opts.scale === undefined ? 1 : opts.scale;   // 1 = plan moyen
    const k = opts.k === undefined ? 1 : opts.k;           // intensité (brume)
    if (s < 0.18) return;

    const colH = Math.round(19 * s), colW = Math.max(2, Math.round(6 * s));
    const topY = groundY - colH;

    /* La flamme vacille sur DEUX fréquences incommensurables. Une seule
       fréquence donne un clignotement régulier, qu'on lit comme une ampoule
       défectueuse et pas comme un feu. */
    const fl = 0.80 + 0.14 * Math.sin(t * 5.7 + x * 0.9) + 0.09 * Math.sin(t * 13.1 + x * 0.31);
    const fh = Math.max(3, Math.round((11 + 4 * fl) * s));

    /* 1 — LE HALO */
    fb.glow(x, topY - fh * 0.45, Math.round(36 * s + 10), P.fl1, 0.26 * k * fl);
    fb.glow(x, topY - fh * 0.45, Math.round(15 * s + 5), P.fl2, 0.28 * k * fl);

    /* 2 — LA FLAQUE SUR LA NEIGE : une ellipse écrasée, additive, très
       faible. Elle porte plus loin que le halo parce que la neige renvoie. */
    const pr = Math.round(26 * s + 6);
    for (let dy = -3; dy <= 5; dy++) {
      for (let dx = -pr; dx <= pr; dx++) {
        const d = Math.sqrt((dx / pr) * (dx / pr) + (dy / 4.5) * (dy / 4.5));
        if (d > 1) continue;
        fb.add(x + dx, groundY + dy, P.fl0, (1 - d) * (1 - d) * 0.20 * k * fl);
      }
    }

    /* 3 — LE SOCLE. Trois valeurs : face éclairée par la flamme (au-dessus),
       corps, côté à l'ombre. La face du haut est plus claire que le corps
       PARCE QUE la flamme est au-dessus — c'est la seule source du tableau. */
    for (let j = 0; j < colH; j++) {
      const u = j / colH;
      const w = Math.round(colW * (0.72 + u * 0.45));      // socle évasé
      fb.hline(x - w / 2, x + w / 2, topY + j, mix(P.st2, P.st0, u * 0.9));
      fb.set(x - w / 2, topY + j, P.st0);
      fb.set(x + w / 2, topY + j, mix(P.st3, P.st1, u));   // arête côté flamme
    }
    // la vasque
    const bw = Math.round(colW * 1.35);
    fb.hline(x - bw / 2, x + bw / 2, topY, P.st3);
    fb.hline(x - bw / 2, x + bw / 2, topY - 1, P.st4);
    if (s > 0.5) {
      fb.hline(x - bw / 2 + 1, x + bw / 2 - 1, topY - 2, P.st2);
      // la calotte de neige, côté opposé à la flamme
      fb.hline(x - bw / 2, x - bw / 2 + 2, topY - 2, P.sn3);
    }

    /* 4 — LA FLAMME. Elle s'affine vers le haut et se décale : une flamme
       verticale symétrique est une bougie d'anniversaire. */
    for (let j = 0; j < fh; j++) {
      const u = j / fh;
      const sway = Math.sin(t * 3.4 + u * 3.1 + x) * u * 1.9 * s;
      const w = Math.max(0, Math.round((colW * 0.40) * (1 - u * u * 0.86) * (0.8 + 0.4 * fl)));
      const y = topY - 2 - j;
      const c = u < 0.22 ? P.fl3 : u < 0.52 ? P.fl2 : u < 0.80 ? P.fl1 : P.fl0;
      fb.hline(x + sway - w, x + sway + w, y, c, u > 0.82 ? 0.55 : 1);
    }
    // le cœur, un pixel, la valeur la plus claire de la palette froide
    fb.set(x, topY - 3, P.fl3);

    /* 5 — LES ESCARBILLES. Deux ou trois, montantes, déterministes. */
    if (s > 0.45) {
      for (let i = 0; i < 3; i++) {
        const ph = (t * 0.55 + i * 0.37 + x * 0.017) % 1;
        const ex = x + Math.sin(t * 1.9 + i * 2.2) * 3.2 * s;
        const ey = topY - 4 - ph * 22 * s;
        fb.add(ex, ey, P.fl2, (1 - ph) * 0.75 * k);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LE PONT DE PIERRE À ARCHES
     ───────────────────────────────────────────────────────────────────────
     L'objet central de l'image 1. Il est fait de quatre pièces et c'est la
     NEIGE qui les relie : chaque surface horizontale reçoit son liseré clair,
     et c'est ce liseré, pas la pierre, qui dessine le pont.

     ⚠️ LES ARCHES SONT DES ANNEAUX, PAS DES DEMI-DISQUES. On dessine le
     voussoir (l'épaisseur de l'arc) et on laisse le VIDE en dessous : on doit
     voir le fond à travers. Un arc plein est un mur avec un dessin dessus.
     ═══════════════════════════════════════════════════════════════════════ */
  function bridge(fb, cfg) {
    const x0 = cfg.x0, x1 = cfg.x1, deck = cfg.deck;
    const deckH = cfg.deckH || 7, botY = cfg.bottom || H;
    const R = Pix.rng(cfg.seed || 1717);

    /* LES PILES ET LES ARCHES.
       ⚠️ ON NE REMPLIT PAS POUR PERCER ENSUITE. Le vide d'une arche doit
       laisser voir le FOND DÉJÀ PEINT (la brume, les arbres lointains, les
       chevaux) : le repeindre d'une couleur « de vide » ferait un trou noir
       découpé, ce qui est le contraire de ce que montre la référence. On
       décide donc pour chaque pixel s'il est vide, voussoir ou maçonnerie,
       et on ne touche jamais à un pixel vide. */
    const span = cfg.span || 46;
    const n = Math.max(1, Math.round((x1 - x0) / span));
    const realSpan = (x1 - x0) / n;

    const arches = [];
    for (let i = 0; i < n; i++) {
      const cx = x0 + realSpan * (i + 0.5);
      arches.push({ cx, rx: realSpan * 0.355, ry: realSpan * 0.40,
                    springY: deck + deckH + realSpan * 0.24 });
    }

    for (let x = x0; x <= x1; x++) {
      for (let y = deck + deckH; y < botY; y++) {
        let ring = 0, hole = false;
        for (const a of arches) {
          const dx = (x - a.cx) / a.rx, dy = (y - a.springY) / a.ry;
          const d = (y <= a.springY) ? Math.sqrt(dx * dx + dy * dy) : Math.abs(dx);
          if (d < 1) { hole = true; break; }
          if (d < 1.30) ring = Math.max(ring, 1.30 - d);
        }
        if (hole) continue;                       // ⚠️ on ne touche pas au fond
        if (ring > 0) {
          // LE VOUSSOIR : l'anneau de pierre taillée, plus clair que la
          // maçonnerie brute. C'est lui qu'on voit sur la référence.
          fb.set(x, y, ring > 0.20 ? P.st2 : P.st3);
          if (ring <= 0.10) fb.set(x, y, P.st4);
        } else {
          const u = (y - deck) / Math.max(1, botY - deck);
          fb.set(x, y, mix(P.st1, P.st0, clamp01(u * 1.25)));
          // appareil : un joint horizontal toutes les cinq assises
          if ((y - deck) % 5 === 0) fb.blend(x, y, P.st0, 0.45);
        }
      }
    }

    /* LE TABLIER : une bande de dalles, joints marqués, neige dessus. */
    for (let x = x0; x <= x1; x++) {
      for (let j = 0; j < deckH; j++) {
        const c = j < 2 ? P.st3 : j < 4 ? P.st2 : P.st1;
        fb.set(x, deck + j, c);
      }
    }
    // joints des dalles : tous les 9 à 13 px, jamais réguliers
    let jx = x0 + 6;
    while (jx < x1) {
      fb.vline(jx, deck, deck + deckH - 1, P.st0, 0.7);
      jx += 8 + (R() * 6) | 0;
    }
    // la neige du tablier, avec des trouées là où le vent a balayé
    for (let x = x0; x <= x1; x++) {
      if (R() < 0.90) {
        fb.set(x, deck - 1, P.sn4);
        if (R() < 0.72) fb.set(x, deck - 2, P.sn3);
        if (R() < 0.30) fb.set(x, deck - 3, P.sn3);
      }
    }
    fb.hline(x0, x1, deck - 1, P.sn5, 0.55);
    // la corniche qui déborde
    fb.hline(x0 - 2, x1 + 2, deck + deckH, P.st1);
  }

  /* LA COLONNE BRISÉE. L'image 1 en montre quatre, à des hauteurs différentes.
     ⚠️ LA CASSURE EST LE SUJET : elle est en dents, jamais nette, et elle
     reçoit de la neige. Une colonne coupée droit est un poteau. */
  function column(fb, x, baseY, hgt, opts) {
    opts = opts || {};
    const R = Pix.rng(opts.seed || 55);
    const w = opts.w || 9;
    const topY = baseY - hgt;
    for (let y = topY; y <= baseY; y++) {
      const u = (baseY - y) / Math.max(1, hgt);
      // léger fuselage : une colonne parfaitement cylindrique a l'air d'un tuyau
      const ww = Math.round(w * (1 - u * 0.10));
      for (let i = -Math.floor(ww / 2); i <= Math.floor(ww / 2); i++) {
        const s = (i + ww / 2) / ww;   // éclairage cylindrique, gauche = flamme
        const c = s < 0.22 ? P.st3 : s < 0.55 ? P.st2 : s < 0.82 ? P.st1 : P.st0;
        fb.set(x + i, y, c);
      }
      // cannelures
      if (opts.flutes !== false && ww > 5) {
        fb.vline(x - Math.floor(ww / 6), y, y, P.st1, 0.5);
        fb.vline(x + Math.floor(ww / 5), y, y, P.st0, 0.4);
      }
    }
    // le chapiteau, s'il en reste un
    if (opts.capital) {
      fb.rect(x - w / 2 - 2, topY - 3, w + 4, 3, P.st3);
      fb.hline(x - w / 2 - 2, x + w / 2 + 2, topY - 4, P.st4);
      fb.hline(x - w / 2 - 2, x + w / 2 + 2, topY - 5, P.sn4);
    } else {
      // LA CASSURE : un profil en dents, puis la neige qui s'y accroche
      for (let i = -Math.floor(w / 2); i <= Math.floor(w / 2); i++) {
        const d = (R() * 3) | 0;
        for (let j = 0; j < d; j++) fb.set(x + i, topY + j, P.st0);
        fb.set(x + i, topY + d, P.sn4);
        if (R() < 0.6) fb.set(x + i, topY + d - 1, P.sn3);
      }
    }
  }

  /* LES CRISTAUX. Bas-droite des deux références. Ils ÉMETTENT : halo additif,
     arête vive, cœur presque blanc. Un cristal sans halo est un tesson. */
  function crystals(fb, x, groundY, cfg) {
    cfg = cfg || {};
    const R = Pix.rng(cfg.seed || 909);
    const n = cfg.count || 5;
    const s = cfg.scale === undefined ? 1 : cfg.scale;
    for (let i = 0; i < n; i++) {
      const cx = x + (R() - 0.5) * 18 * s;
      const h = (7 + R() * 15) * s;
      const w = Math.max(1, Math.round((1.4 + R() * 2.2) * s));
      const lean = (R() - 0.5) * 0.5;
      const tipX = cx + lean * h, tipY = groundY - h;
      // corps : deux faces, l'une claire l'autre sombre — c'est ce qui donne
      // le volume à un objet de trois pixels de large.
      for (let j = 0; j < h; j++) {
        const u = j / h;
        const ww = Math.max(1, Math.round(w * (1 - u * 0.88)));
        const px = cx + lean * j;
        for (let k = -ww; k <= ww; k++) {
          const c = k < 0 ? mix(P.cry0, P.cry1, 1 - u) : mix(P.st1, P.cry0, 1 - u * 0.6);
          fb.set(px + k, groundY - j, c);
        }
        fb.set(px - ww, groundY - j, mix(P.cry1, P.cry2, 1 - u));  // arête vive
      }
      fb.set(tipX, tipY, P.cry2);
      fb.add(tipX, tipY, P.cry2, 0.8);
      fb.glow(tipX, tipY + h * 0.3, Math.round(11 * s + 4), P.cry1, 0.24);
    }
    fb.glow(x, groundY - 6 * s, Math.round(22 * s + 6), P.cry0, 0.20);
  }

  /* LA CABANE SUR LA CRÊTE (image 2).
     ⚠️ SA FENÊTRE EST LE SEUL PIXEL CHAUD DE TOUT LE JEU. Deux pixels d'orange
     dans une image qui n'a que des bleus : l'œil y va avant d'avoir lu une
     seule ligne de dialogue, et il a compris que quelqu'un habite là. */
  function cabin(fb, x, baseY, s) {
    s = s || 1;
    const w = Math.round(15 * s), h = Math.round(9 * s);
    const x0 = Math.round(x - w / 2), y0 = baseY - h;
    fb.rect(x0, y0, w, h, P.sil1);
    fb.vline(x0, y0, baseY - 1, P.sil0);
    fb.vline(x0 + w - 1, y0, baseY - 1, P.st1);
    // toit à deux pentes, avec sa neige
    const rh = Math.round(5 * s);
    for (let j = 0; j < rh; j++) {
      const ww = Math.round(w + 3 - j * (w / (rh * 1.9)));
      const xx = Math.round(x - ww / 2);
      fb.hline(xx, xx + ww, y0 - j, P.sil0);
      fb.hline(xx, xx + ww, y0 - j - 1, j === rh - 1 ? P.sn4 : P.sn3, 0.9);
    }
    /* LA FENÊTRE.
       ⚠️ LE HALO SE POSE AVANT LA FENÊTRE, JAMAIS APRÈS, ET C'EST UN DÉFAUT
       QUE `verify-vallee.mjs` A TROUVÉ EN COMPTANT LES PIXELS CHAUDS DE LA
       SCÈNE : il en trouvait ZÉRO. La cause est jolie et elle vaut d'être
       écrite. Le halo est ADDITIF ; posé par-dessus les quatre pixels de la
       fenêtre, il les poussait à (255, 226, 122) — c'est-à-dire à du BLANC.
       Le seul point chaud du jeu était effacé par sa propre lumière, et il
       l'était depuis le premier rendu sans que rien ne le signale : à cette
       taille, quatre pixels blancs au lieu de quatre pixels orange, personne
       ne le voit sur une capture.

       ⚠️ C'EST EXACTEMENT LA RÈGLE DÉJÀ ÉCRITE POUR LE BRASERO — « le halo
       doit être SOUS la pierre » — et je l'ai enfreinte ici quarante lignes
       plus bas. Une règle notée dans un commentaire n'est pas une règle
       appliquée : celle-ci a maintenant un contrôle. */
    const wx = x0 + Math.round(w * 0.34), wy = y0 + Math.round(h * 0.28);
    const fw = Math.max(2, Math.round(2 * s));
    fb.glow(wx, wy, Math.round(9 * s + 4), P.warm, 0.22);
    fb.rect(wx, wy, fw, fw, P.warm);
    // la fumée : trois pixels, montants, très faibles
    for (let i = 0; i < 5; i++) {
      const ph = i / 5;
      fb.blend(x + Math.sin(i * 1.4) * 2 + w * 0.3, y0 - rh - 2 - i * 2.4, P.sn2, 0.28 * (1 - ph));
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LES BÊTES
     ───────────────────────────────────────────────────────────────────────
     Neuf à douze pixels. À cette taille, un animal n'est pas dessiné : il est
     SUGGÉRÉ par sa silhouette et par sa POSTURE. Le renne est reconnaissable
     à ses bois et à son garrot haut ; le cheval, à son encolure et à sa
     croupe. Deux pixels décident de l'espèce, et c'est tout ce qu'on a.
     ═══════════════════════════════════════════════════════════════════════ */
  function deer(fb, x, groundY, c, s, flip) {
    s = s || 1;
    const d = flip ? -1 : 1;
    const L = (a, b, cc, dd) => fb.line(x + a * d * s, groundY - b * s, x + cc * d * s, groundY - dd * s, c, 1);
    // pattes
    L(-2, 0, -2, 4); L(-1, 0, -1.5, 4); L(2.5, 0, 2.5, 4); L(3.5, 0, 3, 4);
    // corps + garrot
    fb.rect(x - 2.5 * d * s, groundY - 6.5 * s, 6.5 * s * (flip ? -1 : 1), 2.6 * s, c);
    L(-2.5, 4, 3.5, 4.6);
    // encolure + tête
    L(3.2, 6.2, 4.6, 8.2); L(4.6, 8.2, 5.9, 8.0);
    // LES BOIS — c'est le seul détail qui rend l'animal identifiable
    L(4.6, 8.4, 4.0, 11.0); L(4.0, 11.0, 3.0, 11.8); L(4.2, 10.0, 3.2, 10.4);
    L(5.0, 8.4, 5.6, 11.0); L(5.6, 11.0, 6.6, 11.6); L(5.3, 10.0, 6.2, 10.3);
    // la queue
    L(-2.6, 6.4, -3.4, 7.2);
  }

  function horse(fb, x, groundY, c, s, flip) {
    s = s || 1;
    const d = flip ? -1 : 1;
    const L = (a, b, cc, dd, aa) => fb.line(x + a * d * s, groundY - b * s, x + cc * d * s, groundY - dd * s, c, 1, aa);
    L(-3, 0, -3, 5); L(-2, 0, -2.2, 5); L(3, 0, 3.2, 5); L(4, 0, 3.8, 5);
    fb.rect(x - 3.5 * d * s, groundY - 8 * s, 7.5 * s * (flip ? -1 : 1), 3 * s, c);
    // encolure épaisse et tête basse : c'est la posture du cheval, et c'est
    // elle qui le distingue du renne plus sûrement que la taille.
    L(3.4, 8.2, 5.2, 10.4); L(4.2, 8.2, 5.9, 10.2);
    L(5.2, 10.4, 6.6, 9.6); L(5.9, 10.2, 6.8, 9.4);
    // crinière et queue
    L(3.6, 8.6, 5.0, 10.8, 0.6);
    L(-3.6, 8, -4.8, 4.5);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     LE PERSONNAGE, DE DOS
     ───────────────────────────────────────────────────────────────────────
     Trente pixels de haut, exactement comme sur l'image 2. Il est de dos et
     il le restera : c'est un jeu où l'on regarde un paysage, et un visage
     ferait basculer l'attention sur lui.

     ⚠️ SA PALETTE EST À CONTRE-COURANT DU RESTE. Le monde est bleu ; son
     manteau est kaki-olive et son écharpe crème. Ce sont les deux seules
     surfaces désaturées-chaudes du cadre après la fenêtre de la cabane, et
     c'est ce qui fait qu'on ne le perd jamais dans la neige, même à trente
     pixels.
     ═══════════════════════════════════════════════════════════════════════ */
  const HERO = {
    hat:   [0x22, 0x3c, 0x58], hatL: [0x33, 0x52, 0x70],
    scarf: [0xd6, 0xd8, 0xbe], skin: [0xc9, 0xa8, 0x8a],
    coat:  [0x6d, 0x78, 0x58], coatL: [0x88, 0x93, 0x6e], coatD: [0x3d, 0x46, 0x33],
    pant:  [0x24, 0x35, 0x50], boot: [0x14, 0x1e, 0x2e],
    /* ⚠️ CES DEUX-LÀ ÉTAIENT ÉCRITES EN DUR DANS LE CORPS DE LA FONCTION, et
       c'est `verify-vallee.mjs` qui les a trouvées — un contrôle qui interdit
       les littéraux de couleur hors de ce bloc. Elles ne cassaient rien : elles
       rendaient simplement le personnage impossible à recolorer depuis la
       ferme (`Bridge.skin`), ce qui est exactement ce qu'on ne remarque pas
       avant d'en avoir besoin. */
    seam:  [0x18, 0x26, 0x3c],   // l'entrejambe, un ton sous le pantalon
    scarfD:[0xb8, 0xba, 0xa2],   // le pan d'écharpe qui pend, côté ombre
  };

  function hero(fb, x, groundY, t, opts) {
    opts = opts || {};
    const s = opts.scale === undefined ? 1 : opts.scale;
    if (s < 0.3) return;
    // respiration : un pixel, toutes les deux secondes et demie. Un
    // personnage parfaitement immobile a l'air d'un décor.
    const br = opts.walk ? 0 : (Math.sin(t * 1.25) > 0.72 ? 1 : 0);
    const step = opts.walk ? Math.sin(t * opts.walkSpd || t * 8) : 0;
    const y = groundY + br;
    const px = (a, b, c) => fb.rect(x + a * s, y - b * s, s, s, c);
    const rw = (a, b, w2, h2, c) => fb.rect(x + a * s, y - b * s, w2 * s, h2 * s, c);

    // bottes
    rw(-3, 3, 3, 3, HERO.boot); rw(1, 3, 3, 3, HERO.boot);
    if (opts.walk) {
      rw(-3, 3 + Math.max(0, step * 1.6), 3, 3, HERO.boot);
      rw(1, 3 - Math.min(0, step * 1.6), 3, 3, HERO.boot);
    }
    // jambes
    rw(-3, 9, 3, 6, HERO.pant); rw(1, 9, 3, 6, HERO.pant);
    fb.rect(x - 1 * s, y - 9 * s, s, 6 * s, HERO.seam);
    // manteau — le volume vient de trois valeurs, pas d'un dégradé
    rw(-4, 20, 9, 11, HERO.coat);
    rw(-4, 20, 2, 11, HERO.coatD);          // côté ombre
    rw(3, 20, 2, 11, HERO.coatL);           // côté flamme
    rw(-4, 10, 9, 1, HERO.coatD);           // ourlet
    // bras
    rw(-5, 18, 2, 7, HERO.coatD);
    rw(4, 18, 2, 7, HERO.coatL);
    // écharpe
    rw(-3, 22, 7, 2, HERO.scarf);
    fb.rect(x - 3 * s, y - 20 * s, 2 * s, 3 * s, HERO.scarfD);
    // nuque
    rw(-2, 23, 4, 1, HERO.skin);
    // bonnet
    rw(-3, 28, 7, 5, HERO.hat);
    rw(-3, 24, 7, 1, HERO.hatL);            // le revers
    rw(-2, 29, 5, 1, HERO.hat);
    px(-3, 28, HERO.hatL); px(3, 28, HERO.hat);
    // Le halo froid que la neige renvoie sur ses épaules. Sans ce liseré, le
    // personnage est un autocollant posé sur le paysage.
    if (opts.rim !== false) {
      fb.blend(x - 4 * s, y - 20 * s, P.sn3, 0.45);
      fb.blend(x - 4 * s, y - 19 * s, P.sn3, 0.30);
      fb.blend(x + 3 * s, y - 28 * s, P.sn4, 0.35);
    }
    // le souffle : visible une respiration sur trois
    if (!opts.walk && Math.sin(t * 1.25) > 0.9) {
      for (let i = 0; i < 4; i++) fb.blend(x + (4 + i * 1.5) * s, (y - 25 * s) - i * 0.7, P.sn4, 0.20 - i * 0.04);
    }
  }

  /* LA NEIGE QUI TOMBE, en trois plans comme les arbres.
     ⚠️ ELLE DÉRIVE, ELLE NE TOMBE PAS DROIT — et surtout, chaque flocon a sa
     propre dérive. Une chute de neige où tous les flocons partagent le même
     vent se lit comme de la pluie. */
  function snowfall(fb, ox, t, cfg) {
    cfg = cfg || {};
    const planes = [
      { n: CFG.SNOWFALL.FAR,  spd: 5,  par: 0.25, c: P.sn2, a: 0.35, sz: 1, seed: 101 },
      { n: CFG.SNOWFALL.MID,  spd: 10, par: 0.6,  c: P.sn3, a: 0.60, sz: 1, seed: 202 },
      { n: CFG.SNOWFALL.NEAR, spd: 19, par: 1.2,  c: P.sn5, a: 0.95, sz: 2, seed: 303 },
    ];
    const gust = Math.sin(t * 0.21) * 0.6 + Math.sin(t * 0.07) * 0.4;
    for (const pl of planes) {
      const R = Pix.rng(pl.seed);
      for (let i = 0; i < pl.n * (cfg.density === undefined ? 1 : cfg.density); i++) {
        const sx = R() * (W + 120) - 60;
        const drift = (R() - 0.5) * 9 + gust * 7;
        const sp = pl.spd * (0.7 + R() * 0.6);
        const y = (R() * H + t * sp) % (H + 20) - 10;
        const x = sx + Math.sin(t * 0.6 + i * 2.1) * 3.5 + (y / H) * drift - ox * pl.par * 0.04;
        if (pl.sz > 1) fb.rect(x, y, 2, 2, pl.c, pl.a);
        else fb.blend(x, y, pl.c, pl.a);
      }
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     AUBIN — de face, la lanterne au cristal fêlé
     ───────────────────────────────────────────────────────────────────────
     ⚠️ IL EST L'INVERSE DU JOUEUR À TOUS LES POINTS. Le joueur est de dos,
     kaki et crème, la tête couverte ; Aubin est de FACE, en laine sombre
     rapiécée, tête nue, et on voit ses yeux. Ce sont les deux seules figures
     humaines du jeu et elles ne doivent jamais pouvoir être confondues, même
     en silhouette, même à contre-jour.

     ⚠️ ET SA LANTERNE N'A PAS DE FLAMME. C'est l'objet le plus important du
     chapitre : un éclat de cristal FÊLÉ, qui bat au lieu de brûler. La fêlure
     est deux pixels sombres en travers de la lumière, et elle doit rester
     visible à toutes les échelles — c'est elle qui dit que son Chant est
     abîmé, onze minutes avant que le texte ne le dise. */
  const AUBIN = {
    coat:  [0x35, 0x3b, 0x44], coatL: [0x48, 0x50, 0x5b], coatD: [0x1e, 0x23, 0x2b],
    patch: [0x4e, 0x44, 0x3a], skin: [0xc0, 0x9d, 0x82], hair: [0x2b, 0x24, 0x1e],
    beard: [0x3a, 0x32, 0x2a], eye: [0xdc, 0xef, 0xf8], boot: [0x16, 0x1a, 0x20],
  };

  function aubin(fb, x, groundY, t, s) {
    s = s || 1;
    const A = AUBIN;
    const br = Math.sin(t * 0.9) > 0.8 ? 1 : 0;
    const y = groundY + br;
    const rw = (a, b, w2, h2, c) => fb.rect(x + a * s, y - b * s, w2 * s, h2 * s, c);

    /* ⚠️ LA LANTERNE EST DESSINÉE EN DEUX FOIS, ET SON HALO PASSE AVANT LE
       CRISTAL. C'est le défaut trouvé sur la fenêtre de la cabane, corrigé
       ici avant de l'avoir commis : un halo additif posé par-dessus une source
       colorée la pousse au blanc et l'efface. */
    const lx = x + 9 * s, ly = y - 13 * s;
    const beat = 0.68 + 0.32 * Math.pow(Math.max(0, Math.sin(t * 1.55)), 3);
    fb.glow(lx, ly, Math.round(30 * s + 10), P.cry1, 0.24 * beat);
    fb.glow(lx, ly, Math.round(13 * s + 4), P.cry2, 0.26 * beat);

    // bottes, jambes
    rw(-5, 4, 4, 4, A.boot); rw(1, 4, 4, 4, A.boot);
    rw(-5, 12, 4, 8, A.coatD); rw(1, 12, 4, 8, A.coatD);
    // manteau long, rapiécé
    rw(-6, 27, 11, 15, A.coat);
    rw(-6, 27, 2, 15, A.coatD);
    rw(3, 27, 2, 15, A.coatL);
    rw(-4, 20, 4, 3, A.patch);          // la pièce cousue
    rw(0, 24, 3, 2, A.patch);
    rw(-6, 13, 11, 1, A.coatD);         // l'ourlet
    // bras : le gauche pend, le droit tient la lanterne, tendu de côté
    rw(-8, 25, 2, 9, A.coatD);
    rw(5, 25, 2, 6, A.coatL);
    rw(6, 20, 3, 2, A.coatL);
    // cou, tête
    rw(-3, 29, 5, 2, A.skin);
    rw(-4, 37, 7, 7, A.skin);
    rw(-4, 37, 7, 2, A.hair);           // cheveux, plaqués
    rw(-3, 32, 5, 1, A.beard);          // barbe courte, SOUS la bouche
    rw(-5, 35, 1, 3, A.hair); rw(3, 35, 1, 3, A.hair);
    /* ⚠️ LES YEUX. Deux pixels, et ce sont les seuls du jeu — le joueur est de
       dos, les bêtes sont des silhouettes. C'est parce qu'il n'y en a que deux
       dans toute la vallée qu'on les regarde. */
    fb.rect(x - 3 * s, y - 35 * s, s, s, A.eye);
    fb.rect(x + s, y - 35 * s, s, s, A.eye);

    /* LA LANTERNE : une cage de métal, le cristal dedans, la FÊLURE en
       travers. */
    rw(7, 16, 5, 1, P.st2);                        // l'anse
    fb.rect(lx - 0.5 * s, y - 15.5 * s, s, 3 * s, P.st1);
    rw(7, 15, 5, 1, P.st3);                        // le chapeau
    rw(7, 9, 5, 1, P.st3);                         // le fond
    fb.rect(lx - 2.5 * s, y - 14 * s, s, 5 * s, P.st2);   // les montants
    fb.rect(lx + 1.5 * s, y - 14 * s, s, 5 * s, P.st2);
    // le cristal
    for (let j = 0; j < 5; j++) {
      const u = j / 5;
      const c = mix(P.cry2, P.cry0, u * 0.7);
      fb.rect(lx - 1.5 * s, y - (14 - j) * s, 3 * s, s, c);
    }
    fb.rect(lx - 1.5 * s, y - 14 * s, s, s, P.fl3);
    // ⚠️ LA FÊLURE — deux pixels sombres en travers du cristal
    fb.rect(lx - 1.5 * s, y - 12 * s, s, s, P.st0);
    fb.rect(lx - 0.5 * s, y - 11 * s, s, s, P.st0);

    // la lumière du cristal sur son visage et sa manche, côté lanterne
    fb.blend(x + 3 * s, y - 34 * s, P.cry2, 0.28 * beat);
    fb.blend(x + 3 * s, y - 33 * s, P.cry2, 0.20 * beat);
    fb.blend(x + 5 * s, y - 25 * s, P.cry1, 0.24 * beat);
    // et sur la neige, à ses pieds
    for (let dx = -20; dx <= 26; dx++)
      for (let dy = 0; dy < 5; dy++) {
        const d = Math.sqrt(((dx - 8) / 24) ** 2 + (dy / 4.5) ** 2);
        if (d < 1) fb.add(x + dx * s * 0.6, y + dy, P.cry0, (1 - d) * (1 - d) * 0.16 * beat);
      }

    /* SON SOUFFLE. Il en a un, lui. C'est la différence entre lui et les
       chevaux, et elle est posée sans un mot. */
    if (Math.sin(t * 0.9) > 0.86) {
      for (let i = 0; i < 5; i++)
        fb.blend(x - (3 + i * 1.6) * s, y - 31 * s + i * 0.6, P.sn4, 0.22 - i * 0.04);
    }
  }

  return { brazier, bridge, column, crystals, cabin, deer, horse, hero, aubin,
           snowfall, HERO, AUBIN };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Props;
