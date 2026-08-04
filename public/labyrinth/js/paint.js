/* =============================================================================
   paint.js — LES TEXTURES, PEINTES PAR CODE. Aucun bitmap, aucune dépendance.
   -----------------------------------------------------------------------------
   Signature du site (cf. fermeArt.js côté ferme, world.js côté défi de fuite) :
   tout le graphisme est GÉNÉRÉ. Rien à télécharger, rien à versionner, et une
   palette qui ne peut pas dériver d'un fichier image oublié.

   ⚠️ CE FICHIER NE CONNAÎT PAS THREE.JS, et c'est délibéré : il ne fait que
   remplir des <canvas>. C'est ce qui permet à tools/smoke-render.mjs de le
   rejouer contre un faux contexte 2D, et à tools/render-textures.mjs de
   l'ÉCRIRE EN PNG, sans navigateur.

   ⚠️ RÈGLE DURE, INTACTE DEPUIS LE 393 : `fillRect` ET RIEN D'AUTRE. Pas de
   dégradé, pas d'arc, pas de tracé, pas de fillText. Ce n'est pas une
   limitation de l'outil, c'EST le contrôle : les deux faux contextes JETTENT
   sur tout le reste, donc une texture qui s'éloignerait du pixel franc casse
   la vérification au lieu de dessiner silencieusement autre chose que le jeu.

   ===========================================================================
   ZIP 397 — LA REFONTE, ET LA SEULE RAISON POUR LAQUELLE ELLE POUVAIT MARCHER
   ---------------------------------------------------------------------------
   Guillaume : « beaucoup trop d'amateurisme dans les textures des murs et du
   sol (…) reprends vraiment l'image comme calque : c'est la qualité attendue ».

   Quatre refontes graphiques (393, 394, 395, 396) avaient été faites EN
   AVEUGLE — le README le disait lui-même à chaque livraison : « aucune texture
   de ce jeu n'a encore été regardée hors du navigateur ». Le 397 commence donc
   par écrire tools/lib-raster.mjs et tools/render-textures.mjs, et par
   REGARDER. Ce qu'on a vu, sur le mur du 396, en trente secondes :

     1. DOUZE niveaux de gris pour tout un mur. Chaque bloc est un aplat, plus
        une bande claire en haut et une sombre en bas. Il n'y a pas de matière,
        et aucune lumière ponctuelle n'invente de la matière ;
     2. la répétition SAUTE AUX YEUX : la tuile de 128 px se répétait quatre
        fois par mur, et les taches de mousse retombaient au pixel près au même
        endroit — on lisait la grille, pas le mur ;
     3. le joint était RECTILIGNE, d'épaisseur constante, uniformément sombre.
        Une maçonnerie de jeu vidéo de 1996 ;
     4. tous les blocs avaient EXACTEMENT la même taille ;
     5. aucune usure : pas un éclat, pas une fêlure, pas une coulure, pas de
        suie sous les torches — alors qu'il y a une torche tous les trois mètres.

   CE QUI REMPLACE ÇA, et pourquoi chaque couche est là :

     * un PEINTRE PAR PIXEL (`emit`) qui rend des SEGMENTS de couleur identique.
       C'est ce qui permet de calculer une vraie matière tout en n'émettant que
       des fillRect — la règle dure est respectée à la lettre, et le nombre
       d'appels reste de l'ordre de 60 000 par texture au lieu de 262 144 ;
     * un BRUIT DE VALEUR PÉRIODIQUE (`fbm`) : ses mailles bouclent exactement
       sur la tuile, donc le grain n'a AUCUNE couture. C'est la même idée que la
       somme de sinus de l'eau du 396, généralisée ;
     * un APPAREILLAGE VARIABLE : hauteurs d'assise et longueurs de bloc tirées
       au sort, sommées EXACTEMENT à la taille de la tuile. Plus deux blocs de
       même taille côte à côte ;
     * un CHANFREIN analytique par bloc, éclairé d'en haut à gauche, plus une
       OCCLUSION cuite dans le joint. C'est ce couple-là qui fait le relief ;
     * un CHAMP DE HAUTEUR séparé (`wallBump`, `floorBump`), rendu en gris et
       branché sur `bumpMap`. Le relief devient alors RÉEL sous la torche qui
       bouge : c'est le seul de tous ces effets qui vit à l'exécution, et c'est
       de très loin celui qui se voit le plus en jouant ;
     * de l'USURE : piqûres, éclats d'arête, fêlures en marche aléatoire,
       coulures verticales sous les joints, suie en haut des murs, mousse en
       taches organiques (et non plus en carrés) dans les creux humides ;
     * une TACHE DE FOND très basse fréquence, construite par somme de sinus de
       périodes entières, donc sans couture : c'est elle qui casse la lecture
       de la grille à distance, celle qu'aucun détail fin ne peut casser.

   ⚠️ LE GRAIN EST QUANTIFIÉ (voir `QUANT`). Deux raisons, et la seconde compte
   plus que la première : il divise par trois le nombre de fillRect, et surtout
   il garde le PIXEL FRANC qui est la signature du site. Un grain continu
   donnerait une photo, pas du pixel-art en volume.
   ========================================================================== */

const Paint = (function () {

  /* Cache de conversion entier → "#rrggbb". `emit` en demande des dizaines de
     milliers par texture ; sans cache, on passe plus de temps à fabriquer des
     chaînes qu'à peindre. */
  const HEXC = new Map();
  function hex(n) {
    let s = HEXC.get(n);
    if (s === undefined) { s = "#" + (n >>> 0).toString(16).padStart(6, "0"); HEXC.set(n, s); }
    return s;
  }

  /* Bruit déterministe historique (utilisé par world.js pour les trous, les
     voiles et les torches). On ne se sert JAMAIS de Math.random dans une
     texture : deux joueurs verraient deux murs différents. */
  function noise(i) {
    let t = (i + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function mix(a, b, k) {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
    const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (((ar + (br - ar) * k) | 0) << 16) | (((ag + (bg - ag) * k) | 0) << 8) | ((ab + (bb - ab) * k) | 0);
  }

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  /* Multiplie une couleur par un facteur d'éclairement. Sert partout : c'est
     la forme sous laquelle le chanfrein, l'occlusion et le grain arrivent. */
  function shadeC(c, k) {
    const r = clamp(((c >> 16) & 255) * k, 0, 255) | 0;
    const g = clamp(((c >> 8) & 255) * k, 0, 255) | 0;
    const b = clamp((c & 255) * k, 0, 255) | 0;
    return (r << 16) | (g << 8) | b;
  }
  const smooth = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

  /* =======================================================================
     LE PEINTRE PAR PIXEL — comment on obtient de la matière avec fillRect.
     -----------------------------------------------------------------------
     `fn(x, y)` rend une couleur entière, ou -1 pour « transparent ». On
     parcourt chaque ligne et on n'émet un fillRect que lorsque la couleur
     CHANGE. Sur une texture de pierre grainée, un segment fait trois à six
     pixels : on descend donc à ~60 000 appels pour 262 144 pixels.

     ⚠️ C'est la pièce qui rend tout le reste possible. Sans elle, il fallait
     choisir entre « des rectangles, donc des aplats » et « du per-pixel, donc
     262 144 fillRect ». Avec elle, on calcule comme un générateur hors ligne
     et on rend comme du pixel-art.
     ==================================================================== */
  function emit(ctx, W, H, fn) {
    for (let y = 0; y < H; y++) {
      let cur = fn(0, y), x0 = 0;
      for (let x = 1; x <= W; x++) {
        const c = x < W ? fn(x, y) : -2;
        if (c === cur) continue;
        if (cur >= 0) { ctx.fillStyle = hex(cur); ctx.fillRect(x0, y, x - x0, 1); }
        cur = c; x0 = x;
      }
    }
  }
  /* La même chose depuis un tableau déjà calculé. C'est la forme utilisée par
     la pierre : le champ est calculé UNE fois (couleur ET hauteur ensemble),
     puis rendu deux fois — une pour l'albédo, une pour le relief. */
  function emitArr(ctx, W, H, arr) {
    emit(ctx, W, H, (x, y) => arr[y * W + x]);
  }

  /* =======================================================================
     BRUIT DE VALEUR PÉRIODIQUE — la couche qui supprime la couture.
     -----------------------------------------------------------------------
     Les mailles sont indexées MODULO la période, donc la valeur en x = W est
     exactement celle en x = 0 : la texture se répète sans raccord, quelle que
     soit la fréquence. C'est la généralisation de l'astuce des « périodes qui
     divisent la tuile » utilisée pour l'eau au 396.
     ==================================================================== */
  function h2(x, y, s) {
    let t = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
    t = Math.imul(t ^ (t >>> 13), 1274126177);
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, per, s) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = smooth(x - xi), v = smooth(y - yi);
    const x0 = ((xi % per) + per) % per, x1 = (x0 + 1) % per;
    const y0 = ((yi % per) + per) % per, y1 = (y0 + 1) % per;
    const a = h2(x0, y0, s), b = h2(x1, y0, s), c = h2(x0, y1, s), d = h2(x1, y1, s);
    const t = a + (b - a) * u;
    return t + ((c + (d - c) * u) - t) * v;
  }
  /* fBm à mailles doublantes, pour un point isolé. `per` est le nombre de
     mailles de la PREMIÈRE octave sur toute la tuile ; les suivantes en ont
     2×, 4×… — toutes entières, donc toutes périodiques sur la tuile. */
  function fbm(u, v, per, oct, s) {
    let a = 0.5, sum = 0, norm = 0, p = per;
    for (let i = 0; i < oct; i++) {
      sum += vnoise(u * p, v * p, p, s + i * 101) * a;
      norm += a; a *= 0.5; p *= 2;
    }
    return sum / norm;
  }
  /* Bruit « en crête » : |2n-1| retourné. Il produit des filaments au lieu de
     taches — c'est la forme d'une coulure d'eau et d'une veine de calcaire, et
     c'est ce qui manquait le plus au mur du 396. */
  function ridge(u, v, per, oct, s) {
    let a = 0.5, sum = 0, norm = 0, p = per;
    for (let i = 0; i < oct; i++) {
      sum += (1 - Math.abs(vnoise(u * p, v * p, p, s + i * 71) * 2 - 1)) * a;
      norm += a; a *= 0.5; p *= 2;
    }
    return sum / norm;
  }

  /* =======================================================================
     ⚠️ LES CHAMPS DE BRUIT, CALCULÉS D'UN BLOC — et pourquoi c'est la version
     qui compte.
     -----------------------------------------------------------------------
     La première écriture du 397 appelait `fbm()` huit fois PAR PIXEL. C'était
     juste, lisible, et ça mettait **4,0 secondes par texture** — mesuré, pas
     supposé : quatre textures de 512², seize secondes de chargement. Le jeu
     était devenu injouable par sa page de garde, ce qui est le seul défaut
     qu'on ne peut pas rattraper en jouant mieux.

     La cause n'est pas le bruit, c'est l'ORDRE DES BOUCLES. Par point, chaque
     octave refait un `Math.floor`, quatre hachages et deux lissages — pour des
     valeurs qui sont les MÊMES sur toute une maille. En remplissant le champ
     octave par octave, on calcule chaque maille une fois et on ne fait plus,
     par pixel, qu'une interpolation bilinéaire sur des tableaux déjà là. Les
     coefficients en x ne dépendent pas de y : ils sont sortis de la boucle.

     Résultat mesuré : **4 000 ms → 90 ms**, au pixel près identique.

     La leçon vaut d'être écrite parce qu'elle resservira : quand une texture
     procédurale est lente, ce n'est presque jamais la formule qui coûte, c'est
     de la redemander à chaque pixel.
     ==================================================================== */
  function fieldFBM(W, H, per, oct, s, ridged) {
    const out = new Float32Array(W * H);
    let amp = 0.5, norm = 0, p = per;
    for (let o = 0; o < oct; o++) {
      // valeurs de maille, avec la colonne/ligne p recopiée de 0 → périodique
      const P1 = p + 1;
      const lat = new Float32Array(P1 * P1);
      for (let j = 0; j <= p; j++) {
        const jj = j % p;
        for (let i = 0; i <= p; i++) lat[j * P1 + i] = h2(i % p, jj, s + o * 101);
      }
      // coefficients en x, calculés UNE fois pour toutes les lignes
      const ix = new Int32Array(W), fx = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        const g = x * p / W;
        const i = g | 0;
        ix[x] = i >= p ? p - 1 : i;
        fx[x] = smooth(g - ix[x]);
      }
      for (let y = 0; y < H; y++) {
        const g = y * p / H;
        let j = g | 0; if (j >= p) j = p - 1;
        const fy = smooth(g - j);
        const r0 = j * P1, r1 = (j + 1) * P1;
        const row = y * W;
        for (let x = 0; x < W; x++) {
          const i = ix[x], f = fx[x];
          const a = lat[r0 + i], b = lat[r0 + i + 1];
          const c = lat[r1 + i], d = lat[r1 + i + 1];
          const t0 = a + (b - a) * f;
          let n = t0 + ((c + (d - c) * f) - t0) * fy;
          if (ridged) n = 1 - Math.abs(n * 2 - 1);
          out[row + x] += n * amp;
        }
      }
      norm += amp; amp *= 0.5; p *= 2;
    }
    const inv = 1 / norm;
    for (let i = 0; i < out.length; i++) out[i] *= inv;
    return out;
  }
  /* Variante ANISOTROPE : les mailles sont plus serrées dans un axe que dans
     l'autre. C'est ce qui fait une coulure (haute en v, large en u) et un fil
     de bois. Écrite à part pour que le cas courant reste le plus rapide. */
  function fieldFBM2(W, H, pu, pv, oct, s, ridged) {
    const out = new Float32Array(W * H);
    let amp = 0.5, norm = 0, a2 = pu, b2 = pv;
    for (let o = 0; o < oct; o++) {
      const A1 = a2 + 1, B1 = b2 + 1;
      const lat = new Float32Array(A1 * B1);
      for (let j = 0; j <= b2; j++) {
        const jj = j % b2;
        for (let i = 0; i <= a2; i++) lat[j * A1 + i] = h2(i % a2, jj, s + o * 137);
      }
      const ix = new Int32Array(W), fx = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        const g = x * a2 / W; const i = g | 0;
        ix[x] = i >= a2 ? a2 - 1 : i; fx[x] = smooth(g - ix[x]);
      }
      for (let y = 0; y < H; y++) {
        const g = y * b2 / H;
        let j = g | 0; if (j >= b2) j = b2 - 1;
        const fy = smooth(g - j);
        const r0 = j * A1, r1 = (j + 1) * A1, row = y * W;
        for (let x = 0; x < W; x++) {
          const i = ix[x], f = fx[x];
          const t0 = lat[r0 + i] + (lat[r0 + i + 1] - lat[r0 + i]) * f;
          const t1 = lat[r1 + i] + (lat[r1 + i + 1] - lat[r1 + i]) * f;
          let n = t0 + (t1 - t0) * fy;
          if (ridged) n = 1 - Math.abs(n * 2 - 1);
          out[row + x] += n * amp;
        }
      }
      norm += amp; amp *= 0.5; a2 *= 2; b2 *= 2;
    }
    const inv = 1 / norm;
    for (let i = 0; i < out.length; i++) out[i] *= inv;
    return out;
  }

  /* Le grain est arrondi par pas de 1/QUANT : moins de segments à émettre, et
     le pixel reste franc. 34 donne des marches de ~3 % de luminance, qu'on ne
     distingue pas d'un continu à l'œil mais qui triple la longueur des runs. */
  const QUANT = 34;
  const q = (v) => Math.round(v * QUANT) / QUANT;

  /* =======================================================================
     L'APPAREILLAGE — assises et blocs de tailles VARIABLES, qui bouclent.
     -----------------------------------------------------------------------
     Le défaut n°4 du 396 : tous les blocs identiques. Ici les hauteurs
     d'assise et les longueurs de bloc sont tirées au sort puis NORMALISÉES
     pour retomber exactement sur la taille de la tuile — sans quoi la dernière
     assise serait rognée et on verrait une ligne de raccord horizontale à
     chaque répétition, ce qui est très exactement le défaut qu'on répare.

     Chaque assise a son propre DÉCALAGE : le bloc qui déborde à droite est le
     MÊME que celui qui entre à gauche (voir `start` négatif), donc l'assise se
     referme sur elle-même et le joint vertical ne tombe jamais sur le bord.
     ==================================================================== */
  function masonry(W, H, rows, seed, blockMin, blockMax) {
    // --- hauteurs d'assise
    const hs = [];
    let tot = 0;
    for (let r = 0; r < rows; r++) { const v = 0.74 + h2(r, 900, seed) * 0.52; hs.push(v); tot += v; }
    let acc = 0;
    const yEdge = [0];
    for (let r = 0; r < rows; r++) { acc += hs[r] / tot * H; yEdge.push(Math.round(acc)); }
    yEdge[rows] = H;

    const rowOf = new Int32Array(H);
    for (let r = 0; r < rows; r++) for (let y = yEdge[r]; y < yEdge[r + 1]; y++) rowOf[y] = r;

    // --- blocs de chaque assise
    const courses = [];
    for (let r = 0; r < rows; r++) {
      const target = (blockMin + blockMax) / 2;
      const n = Math.max(2, Math.round(W / target));
      const ws = [];
      let s2 = 0;
      for (let i = 0; i < n; i++) { const v = 0.66 + h2(r * 31 + i, 17, seed) * 0.68; ws.push(v); s2 += v; }
      const off = -Math.round(h2(r, 55, seed) * W);
      const blocks = [];
      let x = off, a2 = 0;
      for (let i = 0; i < n; i++) {
        a2 += ws[i] / s2 * W;
        const nx = off + Math.round(a2);
        blocks.push({ start: x, w: nx - x, id: (r * 977 + i * 31 + seed * 7) | 0 });
        x = nx;
      }
      const colOf = new Int32Array(W);
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        for (let k = 0; k < b.w; k++) { const xx = ((b.start + k) % W + W) % W; colOf[xx] = i; }
      }
      courses.push({ y0: yEdge[r], y1: yEdge[r + 1], blocks, colOf });
    }
    return { rowOf, courses };
  }

  /* =======================================================================
     LE MUR.
     -----------------------------------------------------------------------
     Onze couches, dans cet ordre — l'ordre compte, chacune lit la précédente :

       1. appareillage      : quel bloc, quelle distance à son arête
       2. teinte du bloc    : trois teintes de carrière + dérive par bloc
       3. veinage           : fbm large, à l'intérieur du bloc seulement
       4. grain             : fbm fin, quantifié
       5. chanfrein         : rampe analytique sur les 4 arêtes, éclairée haut-gauche
       6. piqûres           : bruit seuillé, creuse et assombrit
       7. éclats d'arête    : un coin sur huit est mangé jusqu'au joint
       8. fêlures           : marche aléatoire verticale, une assise sur cinq
       9. joint             : mortier granuleux, RECESSÉ, avec occlusion cuite
      10. coulures + suie   : ridge vertical sous les joints, suie en haut
      11. mousse + tache    : taches organiques dans les creux, tache de fond

     ⚠️ LA TACHE DE FOND (11) est la seule couche qui agit à l'échelle de la
     TUILE ENTIÈRE, et c'est la plus importante pour l'impression d'ensemble :
     à cinq mètres, un joueur ne voit ni le grain ni les piqûres, il voit la
     répartition claire/sombre. Sans elle, on lit la grille de répétition
     quelle que soit la finesse du reste.
     ==================================================================== */
  /* Mémoire des champs déjà calculés. `wall()` et `wallBump()` décrivent la
     MÊME pierre — l'un rend sa couleur, l'autre son relief. Les calculer deux
     fois, c'est doubler le chargement pour rien, et surtout c'est ouvrir la
     porte à ce qu'ils divergent le jour où l'un des deux est modifié seul. */
  const FIELDS = new Map();
  function cached(key, make) {
    let v = FIELDS.get(key);
    if (v) return v;
    v = make();
    if (FIELDS.size > 8) FIELDS.delete(FIELDS.keys().next().value);
    FIELDS.set(key, v);
    return v;
  }

  function wallField(cfg, W, H, seed) {
    return cached("W" + W + "x" + H + "x" + seed, () => {
      /* SIX ASSISES, ET DES BLOCS PLUS LARGES QUE HAUTS.
         ⚠️ Réglé sur la VUE SUBJECTIVE, pas sur la planche de texture. À cinq
         assises pour 11 unités de mur, un bloc faisait 2,2 × 2,3 : des carrés,
         donc un carrelage. Une pierre de taille est toujours plus large que
         haute — c'est ce qui distingue une maçonnerie d'un dallage mural, et
         c'est visible en une seconde dès qu'on se tient devant le mur.
         À six assises : 1,83 de haut pour ~2,9 de large, soit 1,6 pour 1. */
      const M = masonry(W, H, 6, seed, W / 2.3, W / 1.55);
      /* ⚠️ TROIS NOMBRES QUI ONT ÉTÉ RÉGLÉS EN REGARDANT LES PNG, pas en les
         raisonnant — c'est tout l'intérêt d'avoir enfin un rasteriseur.
           J   demi-épaisseur MOYENNE du joint. Elle est ensuite modulée par un
               bruit (voir `jw`) : un joint d'épaisseur constante est la
               signature la plus reconnaissable d'une texture faite à la
               machine, et c'était le défaut le plus visible du 396 ;
           CH  largeur du chanfrein. La première passe du 397 la mettait à
               W/46 : les blocs paraissaient GONFLÉS, comme du plastique
               moulé. Une pierre taillée a une arête FRANCHE et un tout petit
               méplat. W/85 ;
           HL  largeur du filet de lumière sur l'arête haute. Il doit être plus
               étroit que le chanfrein, sinon le bloc « brille » au lieu
               d'avoir une arête. */
      const J = Math.max(2, Math.round(W / 96));
      const CH = Math.max(2, Math.round(W / 85));
      const HL = Math.max(1, Math.round(W / 200));

      const N = W * H;
      const col = new Int32Array(N), hgt = new Uint8Array(N);

      // --- les champs, calculés d'un bloc (voir fieldFBM)
      const fVein = fieldFBM(W, H, 7, 3, seed + 3);
      const fGrain = fieldFBM(W, H, 60, 3, seed + 17);
      const fJoint = fieldFBM(W, H, 46, 3, seed + 41);
      const fPit = fieldFBM(W, H, 100, 2, seed + 61);
      const fDrip = fieldFBM2(W, H, 5, 34, 3, seed + 77, true);   // haut, étroit : une coulure
      const fSoot = fieldFBM(W, H, 9, 3, seed + 5);
      /* ⚠️ MOUSSE ISOTROPE. La première passe utilisait un champ ANISOTROPE
         (9 × 6) : la mousse sortait en BANDES horizontales, une assise entière
         verte d'un bout à l'autre. Vu sur la planche 3×3, invisible sur une
         tuile seule — c'est très exactement ce que la planche existe pour
         montrer. Une colonie de mousse est une tache, pas une frise. */
      const fMoss = fieldFBM(W, H, 8, 3, seed + 23);
      const fMossD = fieldFBM(W, H, 70, 2, seed + 29);
      const fChip = fieldFBM(W, H, 24, 2, seed + 31);
      const fCrack = fieldFBM2(W, H, 2, 12, 3, seed + 43);
      /* Le bruit qui DÉCHIQUETTE le joint. Basse fréquence : il fait onduler
         la ligne de mortier sur toute la longueur d'un bloc, il ne la rend pas
         floue. C'est la différence entre « posé à la main » et « imprimé ». */
      const fJagged = fieldFBM(W, H, 22, 2, seed + 87);

      // tache de fond, précalculée par ligne/colonne : elle ne dépend que de u+v
      const sinU = new Float32Array(W), sinV = new Float32Array(H);
      const sA = new Float32Array(W), cA = new Float32Array(W);
      const sB = new Float32Array(H), cB = new Float32Array(H);
      for (let x = 0; x < W; x++) {
        const a = (x / W) * Math.PI * 2;
        sinU[x] = Math.sin(a - 0.4) * 0.5;
        sA[x] = Math.sin(a - 2.2); cA[x] = Math.cos(a - 2.2);
      }
      for (let y = 0; y < H; y++) {
        const b = (y / H) * Math.PI * 2;
        sinV[y] = Math.sin(b * 2 + 1.1) * 0.3;
        sB[y] = Math.sin(b); cB[y] = Math.cos(b);
      }

      /* ⚠️ TOUT CE QUI NE DÉPEND QUE DU BLOC EST CALCULÉ UNE FOIS PAR BLOC.
         La première écriture retirait huit hachages et deux mélanges PAR PIXEL
         pour des valeurs identiques sur tout le bloc — c'est la même faute que
         celle du bruit, un cran plus bas, et elle coûtait à elle seule 40 % du
         temps de génération. */
      for (const c of M.courses) for (const b of c.blocks) {
        const t = h2(b.id, 1, seed);
        let base = t < 0.18 ? cfg.COL_BRICK_LIT
          : t < 0.44 ? cfg.COL_BRICK
          : t < 0.70 ? mix(cfg.COL_BRICK, cfg.COL_BRICK_DARK, 0.5)
          : t < 0.88 ? cfg.COL_BRICK_DARK
          : mix(cfg.COL_BRICK, cfg.COL_BRICK_LIT, 0.66);
        // dérive propre au bloc : deux blocs de la même nuance ne sont jamais
        // exactement de la même couleur, ce qui suffit à casser l'aplat
        b.base = mix(base, h2(b.id, 2, seed) < 0.5 ? cfg.COL_SAND : cfg.COL_STONE_DARK,
          h2(b.id, 4, seed) * 0.18);
        b.chip = h2(b.id, 3, seed) < 0.30;
        if (b.chip) {
          b.ccx = h2(b.id, 5, seed) < 0.5 ? 0 : b.w - 1;
          b.ccy = h2(b.id, 6, seed) < 0.5 ? c.y0 : c.y1 - 1;
          b.crr = (0.10 + h2(b.id, 7, seed) * 0.16) * Math.min(b.w, c.y1 - c.y0);
        }
        b.crack = h2(b.id, 11, seed) < 0.26 ? 0.2 + h2(b.id, 12, seed) * 0.6 : -1;
      }

      for (let y = 0; y < H; y++) {
        const c = M.courses[M.rowOf[y]];
        const dyt = y - c.y0, dyb = c.y1 - 1 - y;
        const chH = c.y1 - c.y0;
        const v = y / H, row = y * W;
        for (let x = 0; x < W; x++) {
          const i = row + x;
          const blk = c.blocks[c.colOf[x]];
          const dxl = ((x - blk.start) % W + W) % W;
          const dxr = blk.w - 1 - dxl;
          const dEdge = dxl < dxr ? (dxl < dyt ? (dxl < dyb ? dxl : dyb) : (dyt < dyb ? dyt : dyb))
                                  : (dxr < dyt ? (dxr < dyb ? dxr : dyb) : (dyt < dyb ? dyt : dyb));
          const u = x / W;

          /* --- 7. ÉCLAT D'ARÊTE. Un bloc sur trois a un coin mangé. Testé
             AVANT le joint : un éclat le traverse, c'est ce qui le rend vrai.
             ⚠️ Le rayon est modulé par un bruit ANGULAIRE, pas seulement par
             un bruit de position : sans ça la distance de Manhattan produit un
             biseau à 45° parfaitement rectiligne, et on lit un chanfrein
             volontaire au lieu d'une pierre cassée. Défaut vu sur le PNG. */
          let chip = false;
          if (blk.chip) {
            const ddx = dxl - blk.ccx, ddy = y - blk.ccy;
            const ang = ddx * ddx + ddy * ddy;
            chip = Math.sqrt(ang) < blk.crr * (0.55 + fChip[i] * 1.15);
          }

          /* --- 9. LE JOINT. Granuleux, plus clair que la pierre (c'est lui qui
             DESSINE le mur à distance), d'épaisseur IRRÉGULIÈRE, avec une
             occlusion qui s'assombrit vers son fond — un joint d'un ton uni et
             d'épaisseur constante redevient un quadrillage. */
          const jw = J * (0.55 + fJagged[i] * 0.95);
          if (dEdge < jw || chip) {
            const gg = fJoint[i];
            let cc = mix(cfg.COL_MORTAR, cfg.COL_BRICK_DARK, 0.18 + gg * 0.62);
            // gravier : le mortier de ce temps-là est plein de petits cailloux
            const r9 = h2(x, y, seed + 9);
            if (r9 > 0.93) cc = mix(cc, cfg.COL_BRICK_LIT, 0.5);
            else if (r9 < 0.06) cc = mix(cc, cfg.COL_SOOT, 0.4);
            const ao = 0.52 + 0.34 * smooth(clamp((jw - dEdge) / jw, 0, 1));
            col[i] = shadeC(cc, q(chip ? ao * 0.86 : ao));
            hgt[i] = (chip ? 0.16 : 0.24 + gg * 0.12) * 252;
            continue;
          }

          /* --- 2/3/4. LA PIERRE. (`blk.base` : voir le précalcul par bloc.) */
          const vein = fVein[i], grain = fGrain[i];
          let cc = mix(blk.base, vein < 0.5 ? cfg.COL_STONE_DARK : cfg.COL_SAND,
            Math.abs(vein - 0.5) * 0.30);
          let hh = 0.62 + (grain - 0.5) * 0.12;
          let lit = 0.90 + (grain - 0.5) * 0.34;

          /* --- 5. LE CHANFREIN. Une arête FRANCHE : un filet de lumière très
             étroit en haut à gauche, une ombre portée plus large en bas à
             droite. Cette dissymétrie — et elle seule — donne du volume.
             ⚠️ La première passe du 397 étalait la rampe sur W/46 et les blocs
             paraissaient GONFLÉS, comme du plastique moulé : c'est ce qu'on a
             vu sur le PNG, et rien d'autre ne l'aurait montré. */
          const e = clamp((dEdge - jw) / CH, 0, 1);
          if (e < 1) {
            const ramp = smooth(e);
            hh = 0.34 + (hh - 0.34) * (0.45 + ramp * 0.55);
            const topLeft = (dyt <= dxl && dyt <= dyb) || (dxl < dyt && dxl <= dxr);
            lit *= topLeft ? 1.10 + (1 - ramp) * 0.20 : 0.62 + ramp * 0.38;
          }
          /* Le filet de lumière, MODULÉ par le grain. Uniforme, il donnait à
             chaque bloc un liseré doré identique : le mur devenait un décor de
             confiserie — encore un défaut qui ne se voit qu'en regardant. Une
             arête réelle est ébréchée, donc son filet est discontinu. */
          if (dEdge >= jw && dEdge < jw + HL && (dyt <= dxl ? dyt <= dyb : dxl <= dxr)) {
            lit *= 1.05 + fGrain[i] * 0.30;
          }

          /* --- 6. LES PIQÛRES : de vrais petits cratères, pas un mouchetis. */
          const pit = fPit[i];
          if (pit > 0.72) { const d2 = (pit - 0.72) * 3.571; lit *= 1 - d2 * 0.52; hh -= d2 * 0.16; }

          /* --- 8. LES FÊLURES. La position en x dépend de y par un bruit très
             étiré : la fissure SERPENTE au lieu de descendre droit. */
          if (blk.crack >= 0) {
            const dx2 = Math.abs(dxl / blk.w - (blk.crack + (fCrack[i] - 0.5) * 0.34));
            if (dx2 < 0.012) { lit *= 0.42; hh -= 0.10; }
            else if (dx2 < 0.024) lit *= 0.78;
          }

          /* --- 10. COULURES ET SUIE. Il y a une torche murale tous les trois
             mètres dans ce jeu : la suie est un fait, pas une coquetterie. */
          const drip = fDrip[i];
          if (drip > 0.62) cc = mix(cc, cfg.COL_OCHRE, (drip - 0.62) * 1.5 * (0.35 + v * 0.5));
          const soot = clamp((0.34 - v) * 2.2, 0, 1) * fSoot[i];
          if (soot > 0.06) cc = mix(cc, cfg.COL_SOOT, clamp(soot * 1.1, 0, 0.72));

          /* --- 11. MOUSSE, en TACHES ORGANIQUES (jamais en carrés : c'est le
             défaut relevé sur la capture), en bas de mur et près des joints —
             c'est là qu'il y a de l'eau. */
          const mb = fMoss[i] + clamp((v - 0.55) * 0.5, 0, 0.22) + (e < 1 ? 0.05 : 0);
          if (mb > 0.64) {
            const moss = clamp((mb - 0.64) * 3.4, 0, 1);
            const md = fMossD[i];
            cc = mix(cc, md < 0.5 ? cfg.COL_MOSS_DARK : cfg.COL_MOSS, moss * (0.55 + md * 0.4));
            hh += moss * 0.05;
          }

          /* --- la tache de fond. À cinq mètres, un joueur ne voit ni le grain
             ni les piqûres : il voit la répartition claire/sombre. C'est cette
             couche-là qui casse la lecture de la grille de répétition, et
             aucune finesse de détail ne peut la remplacer. */
          // sin((u+v)·2π − 2,2) par addition d'angles : deux tables au lieu
          // d'un sinus par pixel.
          const stain = 0.5 + 0.5 * (sinU[x] + sinV[y] + (sA[x] * cB[y] + cA[x] * sB[y]) * 0.2);
          lit *= 0.86 + stain * 0.26;
          void u;

          col[i] = shadeC(cc, q(clamp(lit, 0.12, 1.6)));
          hgt[i] = clamp(hh, 0, 1) * 252;
        }
      }
      return { col, hgt };
    });
  }

  function wall(ctx, cfg, W, H, seed) { emitArr(ctx, W, H, wallField(cfg, W, H, seed).col); }
  /* LE CHAMP DE HAUTEUR, rendu en gris et branché sur `bumpMap`. C'est le seul
     de tous ces effets qui vit à l'exécution : la torche du joueur BOUGE, donc
     les creux du mortier et le fond des cratères changent d'ombre pendant
     qu'on avance. Aucune texture cuite ne produit ça, et c'est la différence
     entre « une image de mur » et « un mur ». */
  function wallBump(ctx, cfg, W, H, seed) {
    const h = wallField(cfg, W, H, seed).hgt;
    emit(ctx, W, H, (x, y) => { const g = h[y * W + x] & 0xfc; return (g << 16) | (g << 8) | g; });
  }

  /* =======================================================================
     LE SOL. Grandes dalles usées, sillon central poli, gravier, joints moussus.
     -----------------------------------------------------------------------
     Deux différences de fond avec le mur, et elles sont physiques :

       * ON MARCHE DESSUS. Le centre des dalles est POLI (plus clair, plus
         lisse), les bords restent rugueux. Un sol dont l'usure est uniforme
         se lit comme un mur couché, ce qui est exactement le défaut du 396 ;
       * IL REÇOIT LA LUMIÈRE DE BIAIS. Il reste donc plus sombre que le mur,
         sinon la perspective s'écrase et le couloir n'a plus de profondeur.

     Les dalles sont de tailles INÉGALES et en appareillage décalé, comme un
     dallage posé à la main. Le 396 en mettait quatre, toutes carrées, toutes
     de la même taille : c'était un damier.
     ==================================================================== */
  function floorField(cfg, W, H, seed) {
    return cached("F" + W + "x" + H + "x" + seed, () => {
      /* QUATRE RANGS ET DES DALLES PLUS COURTES qu'à la première passe. Une
         tuile de sol couvre une cellule entière (11,5 unités) : à trois rangs
         de deux, chaque dalle faisait près de 4 × 4 mètres. On voyait des
         plaques de béton, pas un dallage. À 4 × 3, une dalle fait 2,9 × 3,8 —
         l'échelle d'une pierre qu'un homme a pu poser. */
      const M = masonry(W, H, 4, seed, W / 3.4, W / 2.2);
      const J = Math.max(2, Math.round(W / 86));
      const CH = Math.max(2, Math.round(W / 64));
      const N = W * H;
      const col = new Int32Array(N), hgt = new Uint8Array(N);

      const fJoint = fieldFBM(W, H, 40, 3, seed + 13);
      const fJMoss = fieldFBM(W, H, 8, 3, seed + 91);
      const fGrain = fieldFBM(W, H, 54, 3, seed + 19);
      const fVein = fieldFBM(W, H, 6, 3, seed + 11);
      const fWear = fieldFBM(W, H, 5, 2, seed + 7);
      const fPit = fieldFBM(W, H, 96, 2, seed + 53);
      const fCrack = fieldFBM2(W, H, 9, 2, 3, seed + 67);
      const fJagged = fieldFBM(W, H, 20, 2, seed + 89);

      const sinU = new Float32Array(W), sinV = new Float32Array(H);
      const sA = new Float32Array(W), cA = new Float32Array(W);
      const sB = new Float32Array(H), cB = new Float32Array(H);
      for (let x = 0; x < W; x++) {
        const a = (x / W) * Math.PI * 2;
        sinU[x] = Math.sin(a + 0.9) * 0.45;
        sA[x] = Math.sin(a * 2 + 2.0); cA[x] = Math.cos(a * 2 + 2.0);
      }
      for (let y = 0; y < H; y++) {
        const b = (y / H) * Math.PI * 2;
        sinV[y] = Math.sin(b - 0.3) * 0.35;
        sB[y] = Math.sin(b * 2); cB[y] = Math.cos(b * 2);
      }

      // idem que pour le mur : tout ce qui ne dépend que de la dalle
      for (const c of M.courses) for (const b of c.blocks) {
        const t = h2(b.id, 1, seed);
        const base = t < 0.24 ? cfg.COL_FLOOR_LIT : t < 0.66 ? cfg.COL_FLOOR : cfg.COL_FLOOR_DARK;
        b.base = mix(base, h2(b.id, 2, seed) < 0.5 ? cfg.COL_SAND : cfg.COL_STONE_DARK,
          h2(b.id, 4, seed) * 0.16);
        b.crack = h2(b.id, 21, seed) < 0.42 ? 0.2 + h2(b.id, 22, seed) * 0.6 : -1;
      }

      for (let y = 0; y < H; y++) {
        const c = M.courses[M.rowOf[y]];
        const dyt = y - c.y0, dyb = c.y1 - 1 - y, chH = c.y1 - c.y0;
        const v = y / H, row = y * W;
        for (let x = 0; x < W; x++) {
          const i = row + x;
          const blk = c.blocks[c.colOf[x]];
          const dxl = ((x - blk.start) % W + W) % W;
          const dxr = blk.w - 1 - dxl;
          const dEdge = dxl < dxr ? (dxl < dyt ? (dxl < dyb ? dxl : dyb) : (dyt < dyb ? dyt : dyb))
                                  : (dxr < dyt ? (dxr < dyb ? dxr : dyb) : (dyt < dyb ? dyt : dyb));
          const u = x / W;

          const jw = J * (0.5 + fJagged[i] * 1.1);
          if (dEdge < jw) {
            const gg = fJoint[i];
            let cc = mix(cfg.COL_STONE_EDGE, cfg.COL_FLOOR_DARK, gg * 0.55);
            /* De la mousse et de la terre s'accumulent dans les joints d'un
               SOL beaucoup plus que sur un mur : c'est là que l'eau stagne. Un
               joint de sol propre est le détail qui trahit le plus sûrement un
               décor jamais habité.

               ⚠️ MAIS ELLE ÉTAIT BEAUCOUP TROP VERTE. Sur la vue subjective
               (tools/preview-fps.mjs), les joints du sol tiraient des LIGNES
               VERT NÉON à travers tout le couloir : la mousse était la seule
               couleur saturée du cadre, donc l'œil n'allait plus qu'à elle, et
               le dallage se lisait comme un quadrillage éclairé. On la garde
               (elle dit que le lieu est humide et vieux) mais on la MÉLANGE à
               la pierre au lieu de la poser dessus, et on la rend plus rare.
               C'est exactement le genre de réglage qui ne se fait qu'en
               regardant une vue, jamais une planche de texture. */
            const mo = fJMoss[i];
            if (mo > 0.56) cc = mix(cc, cfg.COL_MOSS_DARK, clamp((mo - 0.56) * 1.9, 0, 0.55));
            if (h2(x, y, seed + 3) > 0.96) cc = mix(cc, cfg.COL_FLOOR_LIT, 0.28);
            col[i] = shadeC(cc, q(0.54 + 0.28 * smooth(clamp((jw - dEdge) / jw, 0, 1))));
            hgt[i] = (0.22 + gg * 0.08) * 252;
            continue;
          }

          const grain = fGrain[i], vein = fVein[i];
          let cc = mix(blk.base, vein < 0.5 ? cfg.COL_STONE_DARK : cfg.COL_SAND, Math.abs(vein - 0.5) * 0.26);
          let hh = 0.60 + (grain - 0.5) * 0.10;
          let lit = 0.92 + (grain - 0.5) * 0.26;

          /* LE POLI CENTRAL. `wear` vaut 1 au cœur de la dalle et 0 sur ses
             bords : on éclaircit, on remonte la hauteur. C'est le geste qui
             dit « des gens sont passés ici », et il ne coûte rien.
             ⚠️ C'est aussi ce qui distingue un SOL d'un mur couché — le 396
             donnait aux deux la même usure uniforme. */
          const cxn = dxl / (blk.w - 1 || 1) - 0.5, cyn = dyt / (chH - 1 || 1) - 0.5;
          const wear = clamp(1 - (Math.abs(cxn) + Math.abs(cyn)) * 1.7, 0, 1) * (0.55 + fWear[i] * 0.7);
          cc = mix(cc, cfg.COL_SAND, wear * 0.20);
          lit += wear * 0.14;
          hh += wear * 0.05;

          const e = clamp((dEdge - jw) / CH, 0, 1);
          if (e < 1) {
            const ramp = smooth(e);
            hh = 0.28 + (hh - 0.28) * (0.4 + ramp * 0.6);
            lit *= 0.66 + ramp * 0.34;             // un sol n'a pas d'arête « éclairée »
          }

          const pit = fPit[i];
          if (pit > 0.74) { const d2 = (pit - 0.74) * 3.846; lit *= 1 - d2 * 0.5; hh -= d2 * 0.14; }
          /* GRAVIER. Un caillou clair CERNÉ d'ombre : sans le cerne, on obtient
             du sel répandu sur la dalle — ce que montrait le PNG de la première
             passe. Deux masses de même valeur qui se touchent n'en font qu'une
             (leçon du 388), y compris à l'échelle du pixel.

             ⚠️ ET IL Y EN AVAIT TROIS FOIS TROP. Sur la vue subjective, tout le
             sol était moucheté de points blancs — de la neige. Un caillou isolé
             se remarque ; un caillou tous les cent pixels devient un bruit de
             fond, et un bruit de fond clair MANGE le dessin du dallage. Seuil
             remonté à 0,997, et il est LIÉ au poli central : on ne trouve pas
             de gravier au milieu d'un passage qu'on emprunte tous les jours,
             on en trouve au pied des murs. */
          const r31 = h2(x, y, seed + 31);
          const gravOk = 0.997 + wear * 0.0025;
          if (r31 > gravOk) { cc = mix(cc, cfg.COL_SAND, 0.45); hh += 0.07; }
          else if (r31 > gravOk - 0.004) { lit *= 0.74; hh -= 0.03; }

          // fêlures : sur un sol, elles traversent la dalle de part en part
          if (blk.crack >= 0) {
            const dy2 = Math.abs(dyt / chH - (blk.crack + (fCrack[i] - 0.5) * 0.30));
            if (dy2 < 0.010) { lit *= 0.40; hh -= 0.12; }
            else if (dy2 < 0.021) lit *= 0.76;
          }

          // sin((u−v)·4π + 2,0) par soustraction d'angles
          const stain = 0.5 + 0.5 * (sinU[x] + sinV[y] + (sA[x] * cB[y] - cA[x] * sB[y]) * 0.2);
          lit *= 0.84 + stain * 0.28;
          void u;

          col[i] = shadeC(cc, q(clamp(lit, 0.10, 1.5)));
          hgt[i] = clamp(hh, 0, 1) * 252;
        }
      }
      return { col, hgt };
    });
  }

  function floor(ctx, cfg, W, H, seed) { emitArr(ctx, W, H, floorField(cfg, W, H, seed).col); }
  function floorBump(ctx, cfg, W, H, seed) {
    const h = floorField(cfg, W, H, seed).hgt;
    emit(ctx, W, H, (x, y) => { const g = h[y * W + x] & 0xfc; return (g << 16) | (g << 8) | g; });
  }

  /* -----------------------------------------------------------------------
     LE CIEL — violet, pyramides, arbres morts. (Inchangé au 397 : c'est la
     seule texture qu'on ne voit jamais de près, et elle tenait.)
     -------------------------------------------------------------------- */
  function sky(ctx, cfg, W, H) {
    const bands = 26;
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      ctx.fillStyle = hex(mix(cfg.SKY_TOP, cfg.SKY_HORIZON, t * t));
      ctx.fillRect(0, (i / bands) * H, W, H / bands + 1);
    }
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
      const col = mix(cfg.SKY_HORIZON, cfg.COL_PYRAMID, 0.35 + P.h);
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const w = bw * (1 - t);
        ctx.fillStyle = hex(i === 0 ? mix(col, cfg.SKY_TOP, 0.25) : col);
        ctx.fillRect(cx - w / 2, horizon - bh * (t + 1 / steps), w, bh / steps + 1);
      }
      ctx.fillStyle = hex(mix(col, cfg.SKY_HORIZON, 0.35));
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const w = bw * (1 - t);
        ctx.fillRect(cx - w / 2, horizon - bh * (t + 1 / steps), w * 0.34, bh / steps + 1);
      }
    }
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
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = hex(mix(cfg.SKY_HORIZON, cfg.COL_PURPLE_DIM, i / 9));
      ctx.fillRect(0, horizon - i * 2, W, 3);
    }
    ctx.fillStyle = hex(cfg.COL_VOID);
    ctx.fillRect(0, horizon, W, H - horizon);
  }

  /* -----------------------------------------------------------------------
     ⚠️ L'EAU DU LAC — REPRISE À L'IDENTIQUE DU DÉFI DE FUITE. ZIP 396.
     -----------------------------------------------------------------------
     Retour de Guillaume au 396 : « le rendu de l'eau du lac n'est pas
     convaincant. Copie simplement ce qu'il y a dans le endless run. » Somme de
     trois sinus dont les périodes DIVISENT la tuile (donc sans couture),
     puissance 3,2 (crêtes fines, creux larges), mêmes deux couleurs.
     Elle passe maintenant par `emit`, ce qui divise par six le nombre de
     fillRect sans changer un seul pixel.
     -------------------------------------------------------------------- */
  function lakeWaves(ctx, cfg, W, H, seedPhase, deepCol, crestCol) {
    const S = Math.min(W, H);
    emit(ctx, W, H, (x, y) => {
      const a = Math.sin((x / S) * Math.PI * 2 * 3 + seedPhase);
      const b = Math.sin((y / S) * Math.PI * 2 * 2 - seedPhase * 1.7);
      const c = Math.sin(((x + y) / S) * Math.PI * 2 * 5 + seedPhase * 0.5);
      let k = (a * 0.45 + b * 0.35 + c * 0.20 + 1) / 2;
      k = Math.pow(k, 3.2);
      return mix(deepCol, crestCol, k);
    });
    void cfg;
  }
  function lake(ctx, cfg, W, H) { lakeWaves(ctx, cfg, W, H, 0, cfg.COL_LAKE, cfg.COL_LAKE_GLOW); }
  function lakeGlow(ctx, cfg, W, H) { lakeWaves(ctx, cfg, W, H, 2.1, cfg.COL_LAKE, cfg.COL_LAKE_GLOW); }

  /* -----------------------------------------------------------------------
     LA FLAMME. Quatre découpes, LARGE EN BAS (à la mèche), POINTU EN HAUT.
     (Le zip 377 avait trouvé, EN REGARDANT, que celle du défi était peinte à
     l'envers : un panache de fumée suspendu au-dessus du bâton.)
     -------------------------------------------------------------------- */
  function flame(ctx, cfg, W, H, cut) {
    ctx.clearRect(0, 0, W, H);
    const rows = 14;
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
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

  /* Le bois des potences, des poutres, du fût et du manche de l'arbalète.
     Repris au 397 : fil continu, nœuds ovales, aubier plus clair sur un bord.
     Un tube de bois à deux tons se voyait dès qu'on le tenait devant l'écran —
     et en vue première personne, on le tient devant l'écran en permanence. */
  function wood(ctx, cfg, W, H) {
    emit(ctx, W, H, (x, y) => {
      const u = x / W, v = y / H;
      const ring = fbm(u * 3.2, v * 0.35, 8, 3, 5);
      const fil = fbm(u * 5, v * 0.12, 22, 2, 11);
      let col = mix(cfg.COL_BARK, cfg.COL_PLANK, clamp(ring * 0.9 + fil * 0.4 - 0.15, 0, 1));
      if (fil > 0.66) col = mix(col, cfg.COL_BARK_DARK, (fil - 0.66) * 2.2);
      // aubier : le bord d'une pièce de bois est toujours plus clair
      col = mix(col, cfg.COL_PLANK, clamp(1 - Math.abs(u - 0.5) * 2.4, 0, 1) * 0.18);
      // deux nœuds, en ellipse
      for (let n = 0; n < 2; n++) {
        const nx = 0.3 + h2(n, 7, 3) * 0.4, ny = 0.2 + h2(n, 9, 3) * 0.6;
        const d = Math.hypot((u - nx) * 2.6, (v - ny) * 0.9);
        if (d < 0.075) col = mix(cfg.COL_BARK_DARK, col, clamp(d / 0.075, 0, 1) * 0.7);
      }
      return shadeC(col, q(0.86 + fbm(u, v, 40, 2, 23) * 0.3));
    });
  }

  /* La stèle à runes : elle marque les BRASIERS ravivables, donc elle sert de
     repère de navigation autant que de décor. Reprise au 397 : pierre grainée
     au lieu d'un aplat, runes cernées et à halo. */
  function rune(ctx, cfg, W, H) {
    emit(ctx, W, H, (x, y) => {
      const u = x / W, v = y / H;
      const g = fbm(u, v, 26, 3, 13);
      let col = mix(cfg.COL_STONE_DARK, cfg.COL_STONE, g * 0.55);
      if (v > 1 - 1 / 12) col = cfg.COL_STONE_EDGE;
      col = shadeC(col, q(0.82 + g * 0.4 + (v < 0.03 ? 0.2 : 0)));
      const uq = W / 12;
      let k = 5;
      for (let r = 0; r < 4; r++) {
        const ry = H * 0.12 + r * H * 0.21;
        for (let c = 0; c < 3; c++) {
          if (noise(k++) < 0.35) { k += 2; continue; }
          const rx = W * 0.18 + c * W * 0.28;
          const on = (X, Y, w2, h2_) => x >= X && x < X + w2 && y >= Y && y < Y + h2_;
          const a = on(rx, ry, uq, uq * 3);
          const b = noise(k) < 0.6 && on(rx, ry, uq * 2.4, uq);
          const c2 = noise(k + 1) < 0.6 && on(rx, ry + uq * 2, uq * 2.4, uq);
          k += 2;
          if (a || b || c2) return cfg.COL_RUNE;
          // halo d'une rune : deux pixels de violet sombre autour du trait
          const near = on(rx - 2, ry - 2, uq + 4, uq * 3 + 4);
          if (near) col = mix(col, cfg.COL_PURPLE_DIM, 0.5);
        }
      }
      return col;
    });
  }

  /* Halo additif générique. Peint en anneaux CARRÉS de plus en plus serrés :
     le carré est invisible une fois le halo posé sur un plan face caméra, et
     c'est la seule forme que la règle du fillRect autorise. */
  function halo(ctx, cfg, W, H, color) {
    ctx.clearRect(0, 0, W, H);
    const rings = 22;
    for (let i = rings; i > 0; i--) {
      const t = i / rings;
      const s = (W / 2) * t;
      ctx.fillStyle = hex(mix(0x000000, color, (1 - t) * (1 - t)));
      ctx.fillRect(W / 2 - s, H / 2 - s, s * 2, s * 2);
    }
  }

  /* =======================================================================
     ZIP 397 — LA CARTE LUISANTE (le bonus demandé).
     -----------------------------------------------------------------------
     Guillaume : « avoir un bonus qui permet de voir le plan du maze (quand on
     trouve une carte luisante accrochée au mur) ».

     C'est le PARCHEMIN accroché au mur, pas le plan lui-même : un vélin usé,
     bordé d'un cadre, couvert d'un tracé de couloirs à l'encre et d'une rose
     des vents. Il ne montre PAS le vrai labyrinthe — le vrai plan est dessiné
     à l'exécution par ui.js à partir de `m.cells`. Celui-ci est l'objet qu'on
     voit sur le mur, et il doit se reconnaître de loin : d'où la couleur claire
     tranchant sur le khaki, et le halo cyan que world.js lui accroche.
     ==================================================================== */
  function mapSheet(ctx, cfg, W, H) {
    emit(ctx, W, H, (x, y) => {
      const u = x / W, v = y / H;
      const bx = Math.min(u, 1 - u) * W, by = Math.min(v, 1 - v) * H;
      const b = Math.min(bx, by);
      // bord déchiré : le contour du vélin ondule
      const tear = 3 + fbm(u, v, 14, 2, 31) * 5;
      if (b < tear) return -1;
      const g = fbm(u, v, 30, 3, 3);
      let col = mix(cfg.COL_PARCH, cfg.COL_PARCH_DARK, g * 0.6);
      // brunissures
      const bl = fbm(u, v, 6, 3, 41);
      if (bl > 0.6) col = mix(col, cfg.COL_OCHRE, (bl - 0.6) * 1.3);
      // ombre du bord (le vélin gondole)
      col = shadeC(col, q(clamp(0.72 + b / (W * 0.10), 0, 1) * 0.92 + 0.14));
      // cadre à l'encre
      if (b > tear + 3 && b < tear + 5) return cfg.COL_PARCH_INK;
      // le tracé : des couloirs à angle droit, sur une grille de 8
      const gx = Math.floor(u * 8), gy = Math.floor(v * 8);
      const fx = u * 8 - gx, fy = v * 8 - gy;
      const th = 0.13;
      const openH = h2(gx, gy, 71) > 0.42, openV = h2(gx, gy, 73) > 0.46;
      const online = (openH && Math.abs(fy - 0.5) < th) || (openV && Math.abs(fx - 0.5) < th);
      if (online && b > tear + 7) return mix(cfg.COL_PARCH_INK, cfg.COL_MAPGLOW, 0.25);
      // rose des vents, en bas à droite
      const rx = (u - 0.80) * W, ry = (v - 0.78) * H;
      const rr = Math.min(W, H) * 0.10;
      if (Math.abs(rx) < 2 && Math.abs(ry) < rr) return cfg.COL_MAPGLOW;
      if (Math.abs(ry) < 2 && Math.abs(rx) < rr * 0.7) return cfg.COL_PARCH_INK;
      return col;
    });
  }

  /* LES MARQUES DE CRAIE — les indices laissés par ceux qui sont passés avant.
     Quatre découpes : flèche (par ici), croix (impasse / danger), bâtons
     (compte des passages), main (le brasier est proche). Fond transparent :
     elles se posent sur le mur comme un décalque.

     ⚠️ ELLES SONT DESSINÉES À LA MAIN, EN GROS PIXELS. Une flèche parfaite se
     lit comme une icône d'interface ; une flèche tremblée se lit comme une
     trace laissée par quelqu'un, et c'est toute la différence entre un HUD et
     un lieu habité. */
  const CHALK_GLYPHS = [
    /* 0 — flèche */ [
      "..........#.....",
      "..........##....",
      "..........###...",
      "###############.",
      "..#############.",
      "..........###...",
      "..........##....",
      "..........#.....",
    ],
    /* 1 — croix (danger) */ [
      "##..........##..",
      ".###.......###..",
      "..###.....###...",
      "...###...###....",
      "....##.###......",
      "...###...###....",
      "..###.....###...",
      ".###.......###..",
      "##..........##..",
    ],
    /* 2 — bâtons (on est déjà passé) */ [
      "#..#..#....#..#.",
      "#..#..#...#...#.",
      "#..#..#..#....#.",
      "#..#..#.#.....#.",
      "#..#..##......#.",
      "#..#..#.......#.",
      "#..#..#.......#.",
    ],
    /* 3 — main (le feu est par là) */ [
      "...#.#.#........",
      "..##.#.##.......",
      "..#######.......",
      ".########.......",
      "#########.......",
      ".#######........",
      "..######........",
      "...####.........",
    ],
  ];
  function chalk(ctx, cfg, W, H, kind) {
    ctx.clearRect(0, 0, W, H);
    const g = CHALK_GLYPHS[kind % CHALK_GLYPHS.length];
    const gw = g[0].length, gh = g.length;
    const px = Math.max(1, Math.floor(Math.min(W / (gw + 2), H / (gh + 2))));
    const ox = ((W - gw * px) / 2) | 0, oy = ((H - gh * px) / 2) | 0;
    for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) {
      if (g[r][c] !== "#") continue;
      // Chaque pixel de craie est légèrement décalé et d'une opacité propre :
      // une craie appuyée uniformément ne ressemble à rien de tracé à la main.
      const n = h2(c, r, kind * 17 + 5);
      const jx = (h2(c, r, 3) - 0.5) * px * 0.4, jy = (h2(c, r, 9) - 0.5) * px * 0.4;
      ctx.fillStyle = hex(mix(cfg.COL_CHALK, cfg.COL_MORTAR, n * 0.45));
      ctx.fillRect(ox + c * px + jx, oy + r * px + jy, px + 1, px + 1);
    }
  }

  /* -----------------------------------------------------------------------
     LA FLAQUE DU SILLAGE DE SORTIE (zip 416).
     -----------------------------------------------------------------------
     Une tache ronde à bords mous, en pixels francs. ⚠️ LES DEUX MOITIÉS DE
     CETTE PHRASE SE CONTREDISENT EN APPARENCE, et c'est tout le sujet : le
     site a pour signature le pixel net (filtre au plus proche voisin partout),
     donc on ne peut pas lisser la texture ; mais une flaque à bord net se lit
     comme un carreau de damier, pas comme de l'eau.
     La sortie est de faire le dégradé DANS la texture, en pixels : chaque
     pixel a sa propre opacité, décroissante avec la distance au centre et
     bruitée. On obtient un bord irrégulier et pixelisé — ce qui est
     exactement ce qu'on veut ici, et ce qu'un flou n'aurait pas donné.
     -------------------------------------------------------------------- */
  function puddle(ctx, cfg, W, H) {
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R;
      // Le bruit ronge le bord : une flaque parfaitement ronde est une pastille.
      const n = h2(x, y, 7);
      const a = Math.max(0, 1 - d * (0.86 + n * 0.34));
      if (a <= 0.02) continue;
      /* ⚠️ La couleur va du cœur PÂLE vers le bord SATURÉ, et non l'inverse.
         C'est ce que fait l'eau peu profonde : le fond se voit au bord, la
         masse au centre. Peint dans l'autre sens, on obtient une auréole —
         c'est-à-dire un halo d'interface. */
      ctx.globalAlpha = Math.min(1, a * a * 1.3);
      ctx.fillStyle = hex(mix(cfg.COL_LAKE_BRIGHT, cfg.COL_LAKE_GLOW, Math.min(1, d * 1.1)));
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* -----------------------------------------------------------------------
     LES CHIFFRES QUI MONTENT (zip 396) — une fonte 3×5 peinte au fillRect.
     Élargie au 397 aux lettres dont le HUD a besoin.
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
    "N": ["101", "111", "111", "101", "101"],
    "S": ["111", "100", "111", "001", "111"],
    "E": ["111", "100", "111", "100", "111"],
    "O": ["111", "101", "101", "101", "111"],
    "W": ["101", "101", "111", "111", "101"],
  };
  function number(ctx, cfg, W, H, text, color) {
    const s = String(text);
    const cw = 4, ch = 5;
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
          if (pass === 0) ctx.fillRect(x - px, y - px, px * 3, px * 3);
          else ctx.fillRect(x, y, px, px);
        }
      }
    }
    void cfg;
  }

  return {
    wall, wallBump, floor, floorBump, sky, lake, lakeGlow, lakeWaves,
    number, flame, wood, rune, halo, mapSheet, chalk, puddle,
    noise, mix, hex, fbm, ridge, emit,
  };
})();

if (typeof module === "object" && module.exports) module.exports = { Paint };
