/* =============================================================================
   skateparkArt.js — LE SKATEPARK, DESSINÉ (2026-10-11) : LE RELIEF DE `skatepark.js` PROJETÉ EN 3/4 ET ÉCLAIRÉ.
   -----------------------------------------------------------------------------
   Guillaume : « une idée de profondeur comparable avec la patinoire — il ne faut pas que ça ressemble à de la 2D ».
   ⚠️⚠️ CE QUI FAIT LA PROFONDEUR, ET POURQUOI AUCUN N'EST UN DÉGRADÉ (DESSIN.md, le cratère : « ce qui creuse une image vue
   de dessus est l'éclairage d'une pente, pas un dégradé ») :
     · LA PROJECTION VRAIE : chaque point (x, y, h) du relief va à l'écran en (x, y − h) — une courbe qui monte vers le nord
       s'étire vers le haut, une plateforme flotte au-dessus de son flanc. Le dessin ne place RIEN à la main : il balaie le
       relief colonne par colonne, du plus proche (le sud) au plus lointain, et chaque pixel prend le premier point qui
       l'atteint (l'algorithme « voxel » des vieux simulateurs de vol) — l'occultation sort toute seule ;
     · L'ÉCLAIRAGE DE LA PENTE : la normale de chaque point contre la lumière PEINTE du projet (du nord-ouest, en haut — la
       même que tous les sprites ; un relief éclairé d'ailleurs a l'air découpé et collé), quantifié en DOUZE PALIERS : dans
       une courbe, les paliers font des courbes de niveau, et la paroi qui tourne le dos à la lumière s'assombrit ;
     · LES LATTES : leurs joints sont réguliers le long de la PENTE (`sig`, l'abscisse curviligne), donc serrés à l'écran là où
       ça monte raide — l'œil lit la courbure dans l'écartement ;
     · LES FLANCS : la face sud de chaque module (contreplaqué à l'ombre, cadre d'acier : lisse basse, montants, longeron qui
       suit le profil) — c'est elle qui donne le U de la mini-rampe vu de côté ;
     · LES CERNES (DESSIN.md : « on assemble des masses cernées ») contre le sol et contre ce qui est derrière ; une ARÊTE
       CLAIRE où le dessus rencontre le flanc ;
     · LES OMBRES DU VRAI SOLEIL (`ombres.js`) : portées dans les courbes et sur le dallage, longues le matin et le soir —
       celles du sol vont dans LE tampon commun des ombres (une silhouette, pas une somme), celles sur le bois sont cuites ici.
   ⚠️⚠️ LE TRI AVEC LES PERSONNAGES : l'image est découpée en TRANCHES par rangée de SOL d'origine (un quart de case) — chaque
   pixel va dans la tranche du point du relief qu'il montre (la face sud d'un module : la rangée de son bord). Le jeu trie
   chaque tranche à la fin de sa rangée, comme la bande de la patinoire (`rinkBoardRows`) : on passe devant ce qui est au nord
   de soi, derrière ce qui est au sud. Un personnage monté sur le relief passe sa hauteur en `liftPx` (un décalage d'image,
   JAMAIS une clé de tri — FermeGame.js, zip 441).
   ⚠️ AUCUN TIRAGE : les tons des lattes viennent d'un hachage de leur indice (une variation de FORME, pas un bruit de pixel).
   ⚠️ CUIT UNE FOIS (le relief ne bouge pas) ; seules les ombres du soleil se recuisent quand il a tourné (`relightPark`).
   ========================================================================== */
import * as C from "./fermeConstants";
import * as SP from "./skatepark";
import * as CH from "./chantier";   // 2026-10-11 : le montage, feuille par feuille (`parkBuildAt`)

const T = C.TILE;
const STRIP = 0.25;                 // cases : la hauteur d'une tranche de tri (rangée de sol d'origine)
const DV = 1 / 48;                  // cases : le pas du balayage (un tiers de pixel : les courbes raides restent pleines)
const SLAT = 0.37;                  // cases : la largeur d'une latte (≈ 43 cm) — ⚠️ première avec la case (DESSIN.md : la période)
const SHEET = 2.1;                  // cases : la longueur d'une feuille, joints décalés d'une latte à l'autre
const POST = 1.27;                  // cases : l'écart des montants d'un flanc
/* ⚠️ LA LUMIÈRE EST BASSE (≈ 40° au-dessus de l'horizon), PAS ZÉNITHALE. Premier jet à 50° : les deux parois de la mini-rampe
   et les deux tremplins de la funbox sortaient à un ou deux paliers l'une de l'autre — un plancher plat avec des bords
   arrondis. Basse, elle sépare franchement la paroi qui la regarde (claire) de celle qui lui tourne le dos (sombre). */
const LIGHT = (() => { const l = [-0.74, -0.52, 0.78], n = Math.hypot(...l); return l.map((v) => v / n); })();   // vers la lumière (nord-ouest, haut)
const VIEW = [0, Math.SQRT1_2, Math.SQRT1_2];   // vers l'œil : la vue en 3/4 regarde du sud, à 45°
/* Le reflet du VERNIS (Blinn) : la lumière renvoyée vers l'œil — une bande brillante qui glisse le long d'une courbe et se
   déplace avec elle, ce qu'aucun aplat ne fait. Faible et serré : du bois verni, pas du plastique. */
const HALF = (() => { const h = [LIGHT[0] + VIEW[0], LIGHT[1] + VIEW[1], LIGHT[2] + VIEW[2]], n = Math.hypot(...h); return h.map((v) => v / n); })();
const SPEC = 0.2, SPEC_P = 18;
const AMB = 0.3;                    // la part de lumière du ciel (une paroi dos à la lumière n'est jamais noire)
const LEVELS = 12;

/* ── LES PALETTES (douze paliers chacune) ──
   Le bois clair verni : des ombres brun-rouge aux lumières paille (les sombres tirent au rouge, les clairs au jaune — c'est la
   couleur du bois qui reçoit la lumière, pas un gris teinté). L'acier : quatre tons froids. */
function ramp(lo, mid, hi, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = t < 0.5 ? lo : mid, b = t < 0.5 ? mid : hi, k = t < 0.5 ? t * 2 : t * 2 - 1;
    out.push([0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * k)));
  }
  return out;
}
const WOOD = ramp([92, 56, 34], [196, 150, 98], [248, 226, 176], LEVELS);
const FACE = ramp([66, 44, 30], [128, 94, 64], [176, 140, 100], LEVELS);   // le contreplaqué des flancs, plus sourd (il ne reçoit que le ciel)
const STEEL = ramp([46, 52, 60], [126, 136, 148], [236, 242, 248], LEVELS);
const STAIR = ramp([52, 58, 64], [112, 120, 128], [196, 202, 208], LEVELS);   // l'escalier de tôle, plus mat que l'acier poli
const CERNE_WOOD = [44, 28, 18], CERNE_STEEL = [26, 30, 36];

const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const lvl = (v) => Math.max(0, Math.min(LEVELS - 1, Math.round(v * (LEVELS - 1))));

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LE BALAYAGE : pour chaque colonne de pixels, du sud au nord, le premier point du relief qui atteint chaque rangée.
   ╚════════════════════════════════════════════════════════════════════════════
   Rend la mémoire de tous les pixels VUS du park (ceux du sol de la place exceptés : le dallage reste dessous), avec ce
   qu'il faut pour les peindre et les trier. */
function scanPark() {
  const B = SP.PARK_BOUNDS, P = SP.PARK;
  const X0 = Math.floor((P.x0 + B.u0) * T), X1 = Math.ceil((P.x0 + B.u1) * T);
  const HMAX = 2.2;   // la plus haute chose du relief (plateforme du quarter + marge), en cases
  const Y0 = Math.floor((P.y0 + B.v0 - HMAX) * T), Y1 = Math.ceil((P.y0 + B.v1) * T) + 1;
  const W = X1 - X0, H = Y1 - Y0, N = W * H;
  const buf = {
    X0, Y0, W, H,
    on: new Uint8Array(N),          // 1 = un point du park est vu ici
    face: new Uint8Array(N),        // 1 = face verticale (flanc sud), 0 = dessus
    v: new Float32Array(N),         // la rangée de sol d'origine (cases locales) — le tri
    z: new Float32Array(N),         // la hauteur du point vu
    u: new Float32Array(N),         // l'abscisse locale
    nx: new Float32Array(N), ny: new Float32Array(N), nz: new Float32Array(N),
    sig: new Float32Array(N), lat: new Float32Array(N), s: new Float32Array(N),
    mat: new Uint8Array(N), prim: new Int16Array(N), mod: new Uint8Array(N),
  };
  const MATS = ["", "wood", "deck", "flat", "coping", "steel", "step", "nose"];
  const MODS = ["", "mini", "gallery", "stairN", "stairW", "quarter", "funbox", "bank", "box"];
  buf.MATS = MATS; buf.MODS = MODS;
  const S = {};
  for (let col = 0; col < W; col++) {
    const x = (X0 + col + 0.5) / T;
    let top = H;            // la plus haute rangée déjà couverte (en indices du tampon)
    let hPrev = 0;
    for (let v = B.v1; v >= B.v0; v -= DV) {
      const y = P.y0 + v;
      const s = SP.parkSurf(x, y, S);
      const h = s ? s.h : 0;
      const r = Math.round((y - h) * T) - Y0;
      if (r < top) {
        if (s) {
          /* Une FACE : la part du saut de hauteur que la pente n'explique pas (le relief monte d'un coup entre ce point et le
             précédent, plus au sud) — ses pixels sont sous `h` ; le reste est le dessus. */
          const rise = Math.max(0, -s.gv) * DV;
          const faceBelow = h - hPrev - rise > 0.03 ? h - rise - 0.5 / T : -1;
          for (let ry = Math.max(0, r); ry < top; ry++) {
            const i = ry * W + col;
            const zPix = y - (Y0 + ry + 0.5) / T;
            const isFace = zPix < faceBelow;
            buf.on[i] = 1; buf.face[i] = isFace ? 1 : 0;
            buf.v[i] = v; buf.u[i] = x - P.x0; buf.z[i] = isFace ? Math.max(0, zPix) : h;
            if (isFace) { buf.nx[i] = 0; buf.ny[i] = 1; buf.nz[i] = 0; }
            else { const n = Math.hypot(s.gu, s.gv, 1); buf.nx[i] = -s.gu / n; buf.ny[i] = -s.gv / n; buf.nz[i] = 1 / n; }
            buf.sig[i] = s.sig; buf.lat[i] = s.lat; buf.s[i] = s.s;
            buf.mat[i] = Math.max(0, MATS.indexOf(s.mat)); buf.prim[i] = s.prim; buf.mod[i] = Math.max(0, MODS.indexOf(s.mod));
          }
        }
        top = Math.max(0, Math.min(top, r));
      }
      hPrev = h;
    }
  }
  return buf;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LA MATIÈRE — 2026-10-11 (Guillaume : « la qualité graphique est ultra importante, des textures satisfaisantes »).
   ╚════════════════════════════════════════════════════════════════════════════
   Premier jet : des lattes de 43 cm d'un ton chacune — vu en jeu, un CARTON beige à rayures. Ce qui fait un vrai park en bois,
   et qui se lit au pixel :
     · des FEUILLES DE CONTREPLAQUÉ (1,22 × 2,44 m) aux joints décalés d'une rangée à l'autre, posées en travers de la pente ;
     · des RANGÉES DE VIS le long de chaque joint et de la solive du milieu (un point sombre, au pas de 36 cm) ;
     · le FIL DU BOIS, des veines longues qui ondulent dans le sens de la feuille, en trois tons serrés (DESSIN.md : « six tons
       resserrés donnent du bois ») ; un NŒUD dans une feuille sur trois ;
     · l'USURE : des traînées de gomme noire dans le sens où l'on roule (rompues, de force inégale), plus marquées au pied des
       courbes ; une bande de cire et de gomme sous le coping (on y grinde) ;
     · l'OMBRE du tube de coping sur la courbe, et le creux de la courbe un peu plus sombre (le ciel y entre moins).
   ⚠️ RIEN N'EST TIRÉ AU HASARD : tout se déduit de (`sig`, `lat`) — la position SUR la feuille — et d'un hachage des indices
   de feuille et de traînée. Les vis et les joints tombent sur UN pixel : on compare la position du pixel à celle de son voisin
   (l'empreinte d'un pixel sur la surface change avec la pente : serrée sur une courbe raide, large sur un plat). */
const SHEET_W = 1.06, SHEET_L = 2.12;          // cases : une feuille (le long de la pente × en travers)
const SCREW_ROWS = [0.09, 0.53, 0.97];          // sur la feuille, le long de la pente : près du joint, la solive du milieu, près du joint suivant
const SCREW_STEP = 0.31;                        // cases : le pas des vis en travers
const WEAR_LANE = 0.47;                         // cases : l'écart moyen de deux traînées de roues
const RUBBER = [52, 47, 46], WAX = [74, 60, 48];
const mix3 = (c, d, a) => [c[0] + (d[0] - c[0]) * a, c[1] + (d[1] - c[1]) * a, c[2] + (d[2] - c[2]) * a];
function sheetOf(sig, lat) {
  const row = Math.floor(sig / SHEET_W), off = (row & 1) * 0.5, col = Math.floor(lat / SHEET_L + off);
  return { row, col, sl: sig - row * SHEET_W, ll: lat - (col - off) * SHEET_L };
}
function shadePixels(buf) {
  const { W, H } = buf, N = W * H;
  const rgb = new Uint8ClampedArray(N * 3);
  const M = buf.MATS, mi = (k) => M.indexOf(k);
  const mWood = mi("wood"), mDeck = mi("deck"), mFlat = mi("flat"), mCop = mi("coping"), mSteel = mi("steel"), mStep = mi("step"), mNose = mi("nose");
  const PR = SP.PARK_PRIMS;
  const at = (c, r) => (c < 0 || r < 0 || c >= W || r >= H ? -1 : r * W + c);
  const same = (j, i) => j >= 0 && buf.on[j] && !buf.face[j] && buf.prim[j] === buf.prim[i];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = r * W + c;
    if (!buf.on[i]) continue;
    const m = buf.mat[i];
    const lam = Math.max(0, buf.nx[i] * LIGHT[0] + buf.ny[i] * LIGHT[1] + buf.nz[i] * LIGHT[2]);
    const spec = SPEC * Math.pow(Math.max(0, buf.nx[i] * HALF[0] + buf.ny[i] * HALF[1] + buf.nz[i] * HALF[2]), SPEC_P);
    let val = AMB + (1 - AMB) * lam + spec, pal = WOOD, cerne = CERNE_WOOD, tint = null, tintA = 0;
    const up = at(c, r - 1), dn = at(c, r + 1), lf = at(c - 1, r), rt = at(c + 1, r);
    const pr = PR[buf.prim[i]];
    if (buf.face[i]) {
      /* LE FLANC : un panneau de contreplaqué à l'ombre, sur son cadre d'acier — la lisse basse, le longeron qui suit le bord du
         dessus (la première rangée sous l'arête, avec son ombre dessous), des montants de deux pixels (le côté de la lumière
         clair, l'autre sombre), les vis du panneau le long des montants, un joint de panneau tous les 2,44 m, le pied plus
         sombre (le ciel n'y entre pas). */
      pal = FACE;
      const z = buf.z[i], u = buf.u[i];
      val = 0.46 + 0.16 * Math.min(1, z / 0.4);
      const underTop = up >= 0 && buf.on[up] && !buf.face[up] && buf.prim[up] === buf.prim[i];
      const under2 = !underTop && up >= 0 && buf.face[up] && at(c, r - 2) >= 0 && buf.on[at(c, r - 2)] && !buf.face[at(c, r - 2)];
      const fp = (u / POST - Math.round(u / POST)) * POST * T;   // px depuis le montant le plus proche
      const panelSeam = Math.abs((u / SHEET_L - Math.round(u / SHEET_L)) * SHEET_L * T - 0.6 * T) < 0.5;
      if (buf.mat[i] === mStep || buf.mat[i] === mNose) { pal = STAIR; val = 0.34 + (underTop ? 0.28 : 0); cerne = CERNE_STEEL; }
      else if (z < 0.07) { pal = STEEL; val = 0.32; cerne = CERNE_STEEL; }
      else if (underTop) { pal = STEEL; val = 0.62; cerne = CERNE_STEEL; }
      else if (fp >= -1 && fp < 0) { pal = STEEL; val = 0.56; cerne = CERNE_STEEL; }
      else if (fp >= 0 && fp < 1) { pal = STEEL; val = 0.3; cerne = CERNE_STEEL; }
      else {
        if (under2) val -= 0.14;                                         // l'ombre du longeron
        if (panelSeam) val -= 0.12;
        if ((Math.abs(fp + 2) < 0.5 || Math.abs(fp - 2) < 0.5) && Math.abs(((z + 0.15) % 0.3) - 0.15) * T < 0.5) val -= 0.16;   // les vis le long des montants
        val += (hash(Math.round(u / SHEET_L), 7, buf.prim[i]) - 0.5) * 0.05;
      }
    } else if (m === mCop || m === mSteel || m === mNose) {
      pal = STEEL; cerne = CERNE_STEEL;
      val = 0.26 + 0.72 * lam + 2.4 * spec;   // l'acier poli : plus de contraste que le bois, et il brille
    } else if (m === mStep) {
      pal = STAIR; cerne = CERNE_STEEL;
      val = 0.45 + 0.4 * lam;
      if (((buf.u[i] * T) | 0) % 3 === 0) val -= 0.07;   // la tôle striée : un relief tous les trois pixels, en travers de la marche
    } else {
      const sig = buf.sig[i], lat = buf.lat[i];
      const sh = sheetOf(sig, lat);
      // L'empreinte du pixel sur la surface (cases), dans chaque direction : c'est elle qui dit si un joint ou une vis tombe ici.
      let fpS = 0, fpL = 0;
      for (const j of [up, lf, dn, rt]) if (same(j, i)) { fpS = Math.max(fpS, Math.abs(buf.sig[j] - sig)); fpL = Math.max(fpL, Math.abs(buf.lat[j] - lat)); }
      fpS = Math.max(fpS, 0.03); fpL = Math.max(fpL, 0.03);
      // le ton de la feuille, puis le fil (des veines dans le sens de la feuille, qui ondulent), puis un nœud dans une feuille sur trois
      val += (hash(buf.prim[i], sh.row, sh.col) - 0.5) * 0.08;
      const grain = Math.sin(2 * Math.PI * (sh.sl / 0.23 + 0.9 * Math.sin(sh.ll * 1.7 + sh.row * 2.1 + sh.col * 1.3) + 0.3 * Math.sin(sh.ll * 4.1 + sh.col)));
      if (grain > 0.8) val += 0.035; else if (grain < -0.85) val -= 0.04;
      const hk = hash(sh.row * 13 + 5, sh.col * 7 + 3, buf.prim[i]);
      if (hk < 0.34) {
        const kS = (0.2 + 0.6 * hash(sh.row, sh.col, 11)) * SHEET_W, kL = (0.15 + 0.7 * hash(sh.col, sh.row, 17)) * SHEET_L;
        const e = ((sh.sl - kS) / Math.max(0.06, fpS * 1.2)) ** 2 + ((sh.ll - kL) / Math.max(0.1, fpL * 1.6)) ** 2;
        if (e < 1) val -= 0.14; else if (e < 2.6) val -= 0.045;
      }
      // les joints (un pixel, là où la feuille change par rapport au voisin du dessus ou de gauche)
      const shUp = same(up, i) ? sheetOf(buf.sig[up], buf.lat[up]) : null, shLf = same(lf, i) ? sheetOf(buf.sig[lf], buf.lat[lf]) : null;
      const seam = (shUp && (shUp.row !== sh.row || shUp.col !== sh.col)) || (shLf && (shLf.row !== sh.row || shLf.col !== sh.col));
      // les vis : une rangée près de chaque joint et sur la solive du milieu, au pas de SCREW_STEP en travers
      let screw = false;
      for (const rr of SCREW_ROWS) if (Math.abs(sh.sl - rr) <= fpS * 0.5) {
        const q = ((sh.ll + SCREW_STEP * 0.5) % SCREW_STEP + SCREW_STEP) % SCREW_STEP - SCREW_STEP * 0.5;
        if (Math.abs(q) <= fpL * 0.5) screw = true;
      }
      if (seam) val -= 0.17;
      else if (screw) val -= 0.15;
      // le creux de la courbe (le pied d'une transition), et la bande sous le coping : son ombre, la cire et la gomme des grinds
      if (pr && (pr.kind === "ramp" || pr.kind === "corner") && m === mWood) {
        const sN = buf.s[i] / pr.d;
        if (sN < 0.3) val -= 0.07 * (1 - sN / 0.3);
        const below = pr.Ht - (buf.z[i] - pr.base);
        if (below < 0.13) { tint = WAX; tintA = below < 0.1 ? 0.5 : 0.28; }
      }
      // l'usure : des traînées de gomme dans le sens où l'on roule (le long de `sig`), rompues, de force inégale ; les surfaces
      // qu'on ne roule pas (les plateformes, les marches) n'en ont presque pas
      if (!tint && (m === mWood || m === mFlat || (m === mDeck && pr && pr.kind === "box" && pr.mod !== "gallery"))) {
        const lane = Math.floor(lat / WEAR_LANE), lOff = (hash(lane, buf.prim[i], 31) - 0.5) * 0.3;
        const dl = Math.abs(lat - (lane + 0.5) * WEAR_LANE - lOff);
        const str = hash(lane, buf.prim[i], 47);
        if (str > 0.35 && dl <= Math.max(0.035, fpL * 0.5)) {
          const brk = Math.sin(sig * 2.7 + lane * 2.3) + 0.5 * Math.sin(sig * 7.9 + lane);
          let k = brk > 0.2 ? (str > 0.8 ? 0.3 : str > 0.6 ? 0.2 : 0.12) : 0;
          if (pr && (pr.kind === "ramp" || pr.kind === "corner")) { const sN = buf.s[i] / pr.d; k *= sN > 1 ? 0.2 : 1.25 - 0.6 * sN; }
          if (k > 0) { tint = RUBBER; tintA = k; }
        }
      }
      if (m === mFlat || m === mDeck) val += 0.02;
    }
    /* LE CERNE ET L'ARÊTE. Un bord du park contre le sol (rien au-dessus, à côté, ou en dessous quand le point est en l'air),
       ou contre une chose plus LOINTAINE (un autre module, nettement au nord) : le cerne sombre. Le dernier pixel du dessus
       avant le flanc : l'arête claire (la lumière accroche le bord). */
    const far = (j) => j < 0 || !buf.on[j] || (buf.v[j] < buf.v[i] - 0.3 && buf.prim[j] !== buf.prim[i]);
    const edgeBelow = dn >= 0 && !buf.on[dn] && buf.z[i] > 0.09;
    if (far(up) || far(lf) || far(rt) || edgeBelow) {
      const o = i * 3; rgb[o] = cerne[0]; rgb[o + 1] = cerne[1]; rgb[o + 2] = cerne[2];
      continue;
    }
    if (!buf.face[i] && dn >= 0 && buf.on[dn] && buf.face[dn] && buf.prim[dn] === buf.prim[i]) val += 0.18;
    let col = pal[lvl(val)];
    if (tint) col = mix3(col, tint, tintA);
    const o = i * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2];
  }
  return rgb;
}

/* ── LES TUBES (garde-corps, barrières, rails de glisse) : rasterisés en 3D, triés avec le relief ──
   Un tube est une suite de points (u, v, h) ; chaque point va à l'écran en (u, v − h) et dans la tranche de SA rangée.
   Deux lisses (la main courante et une lisse intermédiaire), des montants verticaux ; un rail de glisse : un tube plus
   épais, ses pieds. Rend une liste de pixels { c, r, v, rgb } (indices du tampon). */
function tubePixels(buf) {
  const out = [];
  const P = SP.PARK;
  const put = (u, v, h, rgb) => {
    const c = Math.floor((P.x0 + u) * T) - buf.X0, r = Math.round((P.y0 + v - h) * T) - buf.Y0;
    if (c < 0 || r < 0 || c >= buf.W || r >= buf.H) return;
    out.push({ c, r, v: v + 0.02, rgb });
  };
  const line = (a, b, rgbHi, rgbLo, thick) => {
    const len = Math.hypot((b[0] - a[0]) * T, (b[1] - b[2] - (a[1] - a[2])) * T) + 1;
    const n = Math.ceil(len * 1.5);
    for (let k = 0; k <= n; k++) {
      const t = k / n, u = a[0] + (b[0] - a[0]) * t, v = a[1] + (b[1] - a[1]) * t, h = a[2] + (b[2] - a[2]) * t;
      put(u, v, h, rgbHi);
      if (thick) put(u, v, h - 1 / T, rgbLo);
    }
  };
  const S_HI = STEEL[9], S_MID = STEEL[6], S_LO = STEEL[3];
  for (const f of SP.PARK_FENCES) {
    const len = Math.hypot(f.u1 - f.u0, f.v1 - f.v0);
    const nPost = Math.max(1, Math.round(len / 1.1));
    // la main courante et la lisse du milieu (le garde-corps de plateforme en a deux, la barrière basse une)
    line([f.u0, f.v0, f.b0 + f.top], [f.u1, f.v1, f.b1 + f.top], S_HI, S_LO, true);
    if (f.kind === "rail") line([f.u0, f.v0, f.b0 + f.top * 0.5], [f.u1, f.v1, f.b1 + f.top * 0.5], S_MID, null, false);
    else line([f.u0, f.v0, f.b0 + 0.12], [f.u1, f.v1, f.b1 + 0.12], S_MID, null, false);
    // les poteaux : un tous les 1,1 case, ou là où le relief les veut (le garde-corps qui épouse le U de la mini-rampe, `f.posts`)
    for (const t of f.posts || Array.from({ length: nPost + 1 }, (_, k) => k / nPost)) {
      const u = f.u0 + (f.u1 - f.u0) * t, v = f.v0 + (f.v1 - f.v0) * t, b = f.b0 + (f.b1 - f.b0) * t;
      line([u, v, b], [u, v, b + f.top], S_MID, null, false);
    }
  }
  for (const rl of SP.PARK_RAILS) {
    for (let k = 0; k + 1 < rl.pts.length; k++) line(rl.pts[k], rl.pts[k + 1], STEEL[10], STEEL[4], true);
    for (const pu of rl.posts) {
      // le pied : du sol (ou du relief) jusqu'au tube, à la hauteur du tube en ce point
      let hh = rl.pts[0][2], vv = rl.pts[0][1];
      for (let k = 0; k + 1 < rl.pts.length; k++) {
        const a = rl.pts[k], b = rl.pts[k + 1];
        if ((pu - a[0]) * (pu - b[0]) <= 0) { const t = (pu - a[0]) / ((b[0] - a[0]) || 1); hh = a[2] + (b[2] - a[2]) * t; vv = a[1] + (b[1] - a[1]) * t; }
      }
      const base = SP.heightAt(P.x0 + pu, P.y0 + vv);
      line([pu, vv, base], [pu, vv, hh], STEEL[5], null, false);
    }
  }
  return out;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ LA CUISSON : le park en tranches, prêtes à trier ; et la carte des hauteurs pour les ombres.
   ╚════════════════════════════════════════════════════════════════════════════
   Rend `{ strips, atlas, ... }` : chaque tranche `{ key, sx, sy, w, h, dx, dy }` (key : la ligne de sol, px monde, à
   laquelle le jeu la trie ; sx/sy dans l'atlas ; dx/dy sa place dans le monde, px). */
const BAKE = { park: null };
export function bakePark(makeCanvas) {
  if (BAKE.park) return BAKE.park;
  const buf = scanPark();
  const base = shadePixels(buf);
  const tubes = tubePixels(buf);
  const B = SP.PARK_BOUNDS, P = SP.PARK;
  const NS = Math.ceil((B.v1 - B.v0) / STRIP) + 1;
  const stripOf = (v) => Math.max(0, Math.min(NS - 1, Math.floor((v - B.v0) / STRIP)));
  /* Les pixels de chaque tranche (le relief, puis les tubes : un tube passe devant le relief de SA tranche s'il est plus au
     sud, ou au même rang — `v` croissant = plus proche). */
  const lists = Array.from({ length: NS }, () => []);
  const { W, H } = buf;
  for (let i = 0; i < W * H; i++) if (buf.on[i]) lists[stripOf(buf.v[i])].push({ c: i % W, r: (i / W) | 0, v: buf.v[i], i });
  for (const t of tubes) lists[stripOf(t.v)].push(t);
  const strips = [];
  let atlasH = 0, atlasW = 0;
  for (let k = 0; k < NS; k++) {
    const L = lists[k];
    if (!L.length) continue;
    let c0 = 1e9, c1 = -1, r0 = 1e9, r1 = -1;
    for (const p of L) { c0 = Math.min(c0, p.c); c1 = Math.max(c1, p.c); r0 = Math.min(r0, p.r); r1 = Math.max(r1, p.r); }
    strips.push({ k, L, c0, r0, w: c1 - c0 + 1, h: r1 - r0 + 1, sy: atlasH, key: (P.y0 + B.v0 + (k + 1) * STRIP) * T - 0.5 });
    atlasH += r1 - r0 + 2; atlasW = Math.max(atlasW, c1 - c0 + 1);
  }
  const atlas = makeCanvas(atlasW, atlasH);
  const g = atlas.getContext("2d");
  const img = g.createImageData(atlasW, atlasH);
  /* La mémoire de chaque pixel de l'atlas : sa couleur de base, et le point du relief qu'il montre (pour l'ombre du soleil). */
  const px = [];
  for (const st of strips) {
    const depth = new Float32Array(st.w * st.h).fill(-1e9);
    for (const p of st.L) {
      const li = (p.r - st.r0) * st.w + (p.c - st.c0);
      if (p.v < depth[li]) continue;
      depth[li] = p.v;
      const ai = ((st.sy + p.r - st.r0) * atlasW + (p.c - st.c0));
      const rgb = p.rgb || [base[p.i * 3], base[p.i * 3 + 1], base[p.i * 3 + 2]];
      img.data[ai * 4] = rgb[0]; img.data[ai * 4 + 1] = rgb[1]; img.data[ai * 4 + 2] = rgb[2]; img.data[ai * 4 + 3] = 255;
      px.push({ ai, x: (buf.X0 + p.c + 0.5) / T, y: p.i != null ? P.y0 + buf.v[p.i] : P.y0 + p.v, z: p.i != null ? buf.z[p.i] : 0, tube: p.i == null, rgb, bi: p.i });
    }
    st.dx = buf.X0 + st.c0; st.dy = buf.Y0 + st.r0; st.sx = 0;
    delete st.L;
  }
  g.putImageData(img, 0, 0);
  /* La carte des hauteurs, AU PIXEL (une cellule = un pixel du monde) : l'ombre du soleil y marche (sur le bois) et s'y
     projette (sur le dallage). Cuite une fois avec le reste. */
  const HG = T, gx0 = Math.floor((P.x0 + B.u0 - 4) * T) / T, gy0 = Math.floor((P.y0 + B.v0 - 4) * T) / T,   // calée sur le pixel
    gw = Math.ceil((B.u1 - B.u0 + 8) * HG), gh = Math.ceil((B.v1 - B.v0 + 8) * HG);
  const hg = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) hg[j * gw + i] = SP.heightAt(gx0 + (i + 0.5) / HG, gy0 + (j + 0.5) / HG);
  BAKE.park = { strips, atlas, g, img, px, atlasW, atlasH, hgrid: { hg, gx0, gy0, gw, gh, HG }, sunKey: null, makeCanvas, buf };
  return BAKE.park;
}

/* La clé d'un soleil pour la cuisson : le cisaillement au 1/25 près (≈ un pixel au bout de l'ombre la plus longue) — sans quoi
   on recuirait à chaque image d'un soleil qui tourne continûment. */
function sunKeyOf(sh, withA) {
  if (!sh) return "none";
  const q = (v) => Math.round(v * 25);
  return `${q(sh.sx)},${q(sh.sy)}` + (withA ? "," + Math.round(sh.a * 40) : "");
}
/* Le point (x, y, z) — cases — est-il à l'ombre du soleil `sh` (`ombres.js` : un point à h de haut tombe à h·(sx, sy)) ? */
function sunBlocked(hgrid, x, y, z, sh) {
  const { hg, gx0, gy0, gw, gh, HG } = hgrid;
  const hyp = Math.hypot(sh.sx, sh.sy);
  if (hyp < 0.02) return false;
  const dt = (1 / HG) / hyp, zMax = 1.5;   // un pixel de sol par pas
  for (let t = dt; z + t < zMax; t += dt) {
    const qx = x - sh.sx * t, qy = y - sh.sy * t, qz = z + t;
    const i = Math.floor((qx - gx0) * HG), j = Math.floor((qy - gy0) * HG);
    if (i < 0 || j < 0 || i >= gw || j >= gh) return false;
    if (hg[j * gw + i] > qz + 0.02) return true;
  }
  return false;
}
/* ── L'OMBRE DU SOLEIL SUR LE BOIS ET L'ACIER, recuite quand le soleil a tourné ──
   La même couleur que le tampon commun (`OMBRE.RGB`, à l'opacité `sh.a`) : une ombre de rampe sur le bois et l'ombre d'un
   arbre sur le dallage sont la même ombre. `sh` null (la nuit, un ciel couvert, la machine qui rame) : le bois sans ombre. */
/* 2026-10-12 — LE RELIEF D'UN PARK EN CHANTIER : la grille des hauteurs où les primitives pas encore bâties (`built`, une case par
   primitive, `CH.primsBuiltAt`) sont à plat. Sans ça, un module qui n'est encore qu'un cadre jetait l'ombre de sa rampe finie. */
function hprimOf(park) {
  if (park.hprim) return park.hprim;
  const { gx0, gy0, gw, gh, HG } = park.hgrid, hp = new Int16Array(gw * gh).fill(-1), o = {};
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const s = SP.parkSurf(gx0 + (i + 0.5) / HG, gy0 + (j + 0.5) / HG, o); if (s) hp[j * gw + i] = s.prim; }
  return (park.hprim = hp);
}
const sigOf = (built) => (built ? Array.prototype.join.call(built, "") : "");
export function parkHgridAt(park, built) {
  if (!built || Array.prototype.every.call(built, (v) => v)) return park.hgrid;
  const sig = sigOf(built);
  if (park.hgB && park.hgB.sig === sig) return park.hgB.grid;
  const hp = hprimOf(park), src = park.hgrid.hg, hg = new src.constructor(src.length);
  for (let i = 0; i < src.length; i++) hg[i] = hp[i] >= 0 && !built[hp[i]] ? 0 : src[i];
  park.hgB = { sig, grid: { ...park.hgrid, hg } };
  return park.hgB.grid;
}
export function relightPark(park, sh, rgbShadow, built) {
  const key = sunKeyOf(sh, true) + "|" + sigOf(built);
  if (park.sunKey === key) return false;
  park.sunKey = key;
  const d = park.img.data, a = sh ? sh.a : 0, HGt = parkHgridAt(park, built);
  for (const p of park.px) {
    const o = p.ai * 4;
    let k = 0;
    if (sh && a > 0.01 && !p.tube && sunBlocked(HGt, p.x, p.y, p.z + 0.01, sh)) k = a;
    d[o] = Math.round(p.rgb[0] * (1 - k) + rgbShadow[0] * k);
    d[o + 1] = Math.round(p.rgb[1] * (1 - k) + rgbShadow[1] * k);
    d[o + 2] = Math.round(p.rgb[2] * (1 - k) + rgbShadow[2] * k);
    d[o + 3] = 255;   // (un chantier a pu le masquer : `parkBuildAt` remet son masque après)
  }
  park.g.putImageData(park.img, 0, 0);
  return true;
}
/* ── L'OMBRE DES MODULES SUR LE DALLAGE, dans le tampon commun des ombres (`sunShadowPass`, l'argument `extra`) ──
   Une silhouette opaque (le tampon la teinte et lui donne son opacité, une fois pour toutes les ombres) : chaque pixel du sol
   autour du park dont le rayon vers le soleil bute sur le relief. Cuite par soleil (même clé que le bois) ; `g` est le tampon,
   (ox, oy) son coin dans le monde (px). */
export function parkFloorShadow(park, g, sh, ox, oy, built) {
  if (!sh) return;
  const key = sunKeyOf(sh, false) + "|" + sigOf(built);
  let fs = park.floorShadow;
  if (!fs || fs.key !== key) {
    /* PROJETÉE, PAS CHERCHÉE : chaque colonne du relief (h au-dessus de sa cellule) jette au sol le segment qui va de son pied
       à h·(sx, sy) — l'union de ces segments EST l'ombre d'un relief sur un plan, au pixel près, pour une fraction du coût
       d'un rayon par pixel de sol (cent mille pixels de dallage, une vingtaine de pas chacun). */
    const { hg, gx0, gy0, gw, gh } = parkHgridAt(park, built);
    const x0 = Math.round(gx0 * T), y0 = Math.round(gy0 * T);
    const cv = (fs && fs.cv) ? fs.cv : park.makeCanvas(gw, gh);
    const cg = cv.getContext("2d"), im = cg.createImageData(gw, gh), d = im.data;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const h = hg[j * gw + i];
      if (h <= 0.01) continue;
      const n = Math.ceil(h * T * Math.max(Math.abs(sh.sx), Math.abs(sh.sy)) * 1.5) + 1;
      for (let k = 1; k <= n; k++) {
        const t = h * k / n, ii = Math.round(i + sh.sx * t * T), jj = Math.round(j + sh.sy * t * T);
        if (ii < 0 || jj < 0 || ii >= gw || jj >= gh || hg[jj * gw + ii] > 0.01) continue;
        d[(jj * gw + ii) * 4 + 3] = 255;
      }
    }
    cg.putImageData(im, 0, 0);
    fs = park.floorShadow = { key, cv, x0, y0 };
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(fs.cv, fs.x0 - ox, fs.y0 - oy);
}
/* ── LE CONTACT DES MODULES AVEC LE DALLAGE (la lumière du ciel qui n'entre pas dessous) : posé avec le sol, avant tout le
   monde trié. Une bande sombre au pied des flancs sud et des côtés, qui s'éteint sur trois pixels (DESSIN.md : ce qui doit
   s'éteindre demande assez de marches). Cuit une fois. */
export function parkContactLayer(park, built) {
  const sig = sigOf(built && !Array.prototype.every.call(built, (v) => v) ? built : null);
  if (park.contact && park.contact.sig === sig) return park.contact;
  const { hg, gx0, gy0, gw, gh } = parkHgridAt(park, built);
  const cv = park.contact ? park.contact.cv : park.makeCanvas(gw, gh), cg = cv.getContext("2d"), im = cg.createImageData(gw, gh);
  const occ = (i, j) => i >= 0 && j >= 0 && i < gw && j < gh && hg[j * gw + i] > 0.05;
  const ALPHA = [0, 0.34, 0.2, 0.09];
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    if (occ(i, j)) continue;
    let dmin = 9;
    for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) {
      if (!occ(i + di, j + dj)) continue;
      dmin = Math.min(dmin, Math.max(Math.abs(di), Math.abs(dj)) + (dj > 0 ? 1 : 0));   // un peu moins au nord des modules (on ne voit pas leur pied)
    }
    if (dmin > 3) continue;
    const o = (j * gw + i) * 4; im.data[o] = 30; im.data[o + 1] = 24; im.data[o + 2] = 20; im.data[o + 3] = Math.round(255 * ALPHA[dmin]);
  }
  cg.putImageData(im, 0, 0);
  park.contact = { cv, sig, x0: Math.round(gx0 * T), y0: Math.round(gy0 * T), w: gw, h: gh };
  return park.contact;
}

/* ╔════════════════════════════════════════════════════════════════════════════
   ║ 2026-10-11 — LE PARK EN CHANTIER (`chantier.js`) : à la minute `t` du montage, chaque pixel est posé, en CHARPENTE, ou pas là.
   ╚════════════════════════════════════════════════════════════════════════════
   Une FEUILLE de contreplaqué apparaît d'un bloc à sa minute (`CH.buildMinute`, rangée et colonne de la feuille : on la voit se poser),
   l'ACIER (copings, cornières, nez de marche, tubes) à la phase de l'acier. Avant sa feuille, une primitive dont le cadre est soudé
   montre sa CHARPENTE : les solives sous le plateau (un trait d'acier tous les 53 cm le long de la pente), les montants et les lisses
   du flanc — c'est l'ossature qu'on voit monter avant le bois. Au DÉMONTAGE (`type` "demontage"), le même film à l'envers.
   ⚠️ Recalculé seulement quand le dixième de minute change (une feuille toutes les vingt secondes environ) : un `putImageData` de
   l'atlas, quelques millisecondes. `t` null : le park entier (le monde du park). */
const STEEL_FRAME = [[126, 136, 148], [96, 104, 116], [168, 176, 186]];
function buildInfo(park) {
  if (park.build) return park.build;
  const buf = park.buf, n = park.px.length, PRIMS = SP.PARK_PRIMS;
  const tS = new Float32Array(n), tF = new Float32Array(n), fc = new Int16Array(n).fill(-1);
  const M = buf.MATS, mi = (k) => M.indexOf(k), mCop = mi("coping"), mSteel = mi("steel"), mNose = mi("nose");
  park.px.forEach((p, k) => {
    if (p.tube) { tS[k] = CH.buildMinute(p.ai % 7, "steel"); tF[k] = Infinity; return; }
    const i = p.bi, prim = buf.prim[i], m = buf.mat[i];
    if (m === mCop || m === mSteel || m === mNose) { tS[k] = CH.buildMinute(prim, "steel"); tF[k] = Infinity; return; }
    const sh = sheetOf(buf.sig[i], buf.lat[i]);
    tS[k] = CH.buildMinute(prim, "sheet", sh.row, sh.col);
    tF[k] = CH.buildMinute(prim, "frame", 0, sh.col);
    if (buf.face[i]) {
      const u = buf.u[i], z = buf.z[i];
      if (z < 0.07 || Math.abs((u * T) % 20) < 1 || buf.z[i] > 0.9 * (PRIMS[prim] && PRIMS[prim].Ht ? PRIMS[prim].base + PRIMS[prim].Ht : 9)) fc[k] = 1;
    } else if (((buf.sig[i] * T) % 8.5 + 8.5) % 8.5 < 1 || ((buf.lat[i] * T) % 34 + 34) % 34 < 1) fc[k] = buf.nz[i] > 0.6 ? 2 : 0;
  });
  park.build = { tS, tF, fc, key: null };
  return park.build;
}
export function parkBuildAt(park, t, type, sh, rgbShadow) {
  const B = buildInfo(park);
  const key = t == null ? "full" : (type || "montage") + Math.round(t * 10);
  if (B.key === key) return false;
  const wasFull = B.key === "full" || B.key == null;
  B.key = key;
  // les couleurs d'abord (le soleil, sur le relief DÉJÀ bâti), puis le masque du chantier par-dessus
  const mt = t == null ? null : type === "demontage" ? CH.demontageMinute(t) : t;
  park.sunKey = null; relightPark(park, sh, rgbShadow, mt == null ? null : CH.primsBuiltAt(mt));
  if (t == null) return true;
  const d = park.img.data;
  park.px.forEach((p, k) => {
    const o = p.ai * 4;
    if (mt >= B.tS[k]) { d[o + 3] = 255; return; }
    if (mt >= B.tF[k] && B.fc[k] >= 0) { const c = STEEL_FRAME[B.fc[k]]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; return; }
    d[o + 3] = 0;
  });
  park.g.putImageData(park.img, 0, 0);
  return true;
}
