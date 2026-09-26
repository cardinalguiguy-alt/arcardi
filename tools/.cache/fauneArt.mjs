/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-09-26 — PHASE 5 DE LA FEUILLE DE ROUTE GRAPHIQUE : LES SPRITES DE LA
   ║ FAUNE DE VALLEY TOWN.
   ╚══════════════════════════════════════════════════════════════════════════
   Colverts, goélands et mouettes rieuses, trois chats, pigeons et colombes
   (refaits ici au pixel natif), et le poisson qui saute au port. Les papillons,
   les carpes, les goélands en vol et les lucioles, eux, se dessinent PIXEL PAR
   PIXEL au rendu (`drawButterfly`, `drawCarp`, `drawGullFlight`, plus bas) :
   ils tournent dans toutes les directions, et un sprite de 5 px ne se tourne
   pas — il se redessine.

   ⚠️⚠️ L'ÉCHELLE (décision n° 5 de Guillaume, 2026-09-26 : « le travail sur
   l'échelle est nécessaire pour un rendu réaliste ») : UNE seule échelle pour
   toutes les bêtes, calée sur le chat familier que les joueurs promènent déjà
   en ville (≈ 11 px affichés). Chat ≈ 12 px tête comprise, colvert ≈ 13 bec
   compris, goéland ≈ 13, pigeon ≈ 9, carpe ≈ 10. Seuls les insectes sont
   agrandis pour qu'on les voie. ⚠️ Et TOUT EST AU PIXEL NATIF : les pigeons
   étaient dessinés en 16 px puis réduits aux deux tiers au rendu, ce qui
   sautait un pixel sur trois — exactement ce que la phase 1 a banni des
   monuments. Un sprite de la faune se pose à l'échelle 1, point.

   ⚠️ LES DESSINS SONT DES DONNÉES : une pose est un tableau de chaînes, un
   caractère par pixel, et une palette par espèce ou par robe. C'est ce qui
   permet de lire un dessin de 12 px sans le rendre, et de décliner trois
   chats d'une seule écriture (§8 de CLAUDE.md : une grandeur écrite deux fois
   diverge). On dessine SERRÉ, on RECADRE, PUIS on cerne (`finish`) — le piège
   du canevas qui découpe en silence (§4), payé trois fois au 433.
   ⚠️ UN SEUL ATLAS pour toute la faune (§10 : sur iPad, c'est le NOMBRE de
   canevas qui tue, pas leur taille) : chaque pose est un rectangle `{ img, sx,
   sy, w, h, ax, ay }` — `ax/ay` est le point d'ancrage (le pied, ou la ligne
   de flottaison) dans la case.

   ⚠️ CE FICHIER EST PUR, SAUF `document.createElement("canvas")` (le faux
   canevas des bancs le fournit) : `tools/render-faune.mjs` l'importe, peint la
   planche et MESURE les tailles et les rapports entre espèces.
   ══════════════════════════════════════════════════════════════════════════ */

function cv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return [c, g];
}

/* Un dessin en données → un canevas. `pal(ch, x, y)` rend la couleur d'un
   caractère (ou null : transparent). La fonction reçoit la position pour que
   les robes à motif (rayures du tigré, taches du tricolore) se décident au
   pixel, sur la MÊME écriture de pose. */
function ascii(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const [c, g] = cv(w, h);
  for (let y = 0; y < h; y++) {
    const r = rows[y];
    for (let x = 0; x < r.length; x++) {
      const ch = r[x];
      if (ch === "." || ch === " ") continue;
      const col = pal(ch, x, y);
      if (!col) continue;
      g.fillStyle = col; g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/* Recadre d'une marge de 2 px puis cerne d'un pixel — dans cet ordre (voir
   l'en-tête). `ax, ay` : l'ancrage dans le dessin SERRÉ, rendu dans le cadre
   final. Un cerne `null` ne cerne pas (le poisson qui saute : il sort de
   l'eau mouillé et brillant, un trait noir en ferait un jouet). */
const PAD = 2;
function finish(src, ax, ay, outline, afloat) {
  const [c, g] = cv(src.width + PAD * 2, src.height + PAD * 2);
  g.drawImage(src, PAD, PAD);
  if (outline) {
    const w = c.width, h = c.height;
    const im = g.getImageData(0, 0, w, h), d = im.data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
    g.fillStyle = outline;
    /* ⚠️ CE QUI FLOTTE N'A PAS DE CERNE SOUS LA LIGNE DE FLOTTAISON : l'eau
       coupe le corps, elle ne le borde pas. Un trait noir sous un canard le
       pose SUR l'eau comme un jouet sur une table (vu au premier rendu). */
    const yMax = afloat ? ay + PAD : h;
    for (let y = 0; y < yMax; y++) for (let x = 0; x < w; x++) {
      if (solid(x, y)) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) g.fillRect(x, y, 1, 1);
    }
  }
  c.ax = ax + PAD; c.ay = ay + PAD;
  return c;
}

/* L'atlas : on empile les poses en rangées, sans chevauchement, puis chaque
   case devient un rectangle de lecture. ⚠️ Les petits canevas de travail sont
   libérés dès le collage (rien ne les retient) — seul l'atlas reste. */
function packAtlas(items) {
  const MAXW = 512;
  let x = 0, y = 0, rowH = 0, W = 0;
  const pos = [];
  for (const it of items) {
    const c = it.c;
    if (x + c.width > MAXW) { x = 0; y += rowH + 1; rowH = 0; }
    pos.push({ x, y });
    x += c.width + 1; rowH = Math.max(rowH, c.height); W = Math.max(W, x);
  }
  const H = y + rowH + 1;
  const [atlas, g] = cv(Math.max(1, W), Math.max(1, H));
  const out = {};
  items.forEach((it, i) => {
    g.drawImage(it.c, pos[i].x, pos[i].y);
    let node = out;
    const path = it.key.split(".");
    for (let k = 0; k < path.length - 1; k++) node = node[path[k]] || (node[path[k]] = {});
    node[path[path.length - 1]] = { img: atlas, sx: pos[i].x, sy: pos[i].y, w: it.c.width, h: it.c.height, ax: it.c.ax, ay: it.c.ay };
  });
  out.__atlas = atlas;
  return out;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 1. LE COLVERT — mâle, femelle, canetons.
   ╚══════════════════════════════════════════════════════════════════════════
   De profil, tête à DROITE (le rendu retourne pour la gauche), la ligne de
   flottaison sous la dernière rangée : on ne dessine que ce qui dépasse de
   l'eau. Ce qui fait un colvert, par ordre d'importance à cette taille :
     1. un corps en BARQUE, bas et long (deux fois et demie sa hauteur), la
        poupe relevée — un ovale donne un canard en plastique ;
     2. la tête RONDE posée haut sur un cou court, et un bec long et plat,
        presque aussi long que la tête ;
     3. pour le mâle : la tête verte, le COLLIER BLANC, le poitrail CHÂTAIN,
        les flancs gris clair et le derrière NOIR avec la boucle blanche de la
        queue ; pour la femelle : le brun écaillé, la raie sombre de l'œil et le
        bec orange taché ;
     4. le MIROIR bleu bordé de blanc au bout de l'aile — deux pixels, et c'est
        pourtant ce qu'on reconnaît sans savoir qu'on le regarde.
   ⚠️ L'ÉCLIPSE : l'été, le mâle mue et prend la robe brune de la femelle, en
   gardant le bec jaune-olive (juin à septembre dans la vraie vie). C'est une
   robe à part (`drakeEclipse`), pas un filtre.

   Caractères : G/g tête (vert, reflet), Y/y bec (clair, onglet sombre), E œil,
   W blanc, C/c châtain, S/s flanc (ombre, clair), B dos, K noir, U miroir bleu,
   F/f brun écaillé (femelle), R raie de l'œil, O bec orange. */
/* ⚠️ 2026-09-26, SECOND JET, VU PAR GUILLAUME EN JEU : « les canards semblent
   trop grands et n'ont pas de mouvements assez détaillés et réalistes ». Le
   premier faisait 17 px cerne compris (presque deux pigeons) : celui-ci en
   fait 13, et il a DOUZE poses au lieu de six — c'est le répertoire d'un vrai
   colvert sur un étang : le coup de patte (la tête avance, la queue frétille),
   la tête qui se tourne, la tête plongée d'un coup, le barbotage en trois
   temps (on bascule, on reste cul en l'air en pédalant, on se redresse), la
   toilette en deux gestes, le battement d'ailes dressé sur l'eau, le sommeil
   qui respire. Les ENCHAÎNEMENTS sont dans `faune.js` (duckRestPose). */
const DUCK_POSES = {
  /* ── SUR L'EAU. La ligne de flottaison est sous la dernière rangée. */
  swim: [
    ".........gGG..",
    "........gGhhG.",
    "........GGeEG.",
    ".........jjYYy",
    ".........WW...",
    "..q.bbBBBBCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
  ],
  swim2: [
    "..........gGG.",
    ".........gGhhG",
    ".........GGeEG",
    "..........jjYY",
    ".........WWC..",
    ".q..bbBBBBCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
  ],
  look: [
    ".........gGG..",
    "........GhhGg.",
    "......yYYEhGG.",
    "........YGGG..",
    ".........WW...",
    "..q.bbBBBBCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
  ],
  alert: [
    "........gGG...",
    ".......gGhhG..",
    ".......GGeEG..",
    "........jjYYy.",
    "........GG....",
    "........WW....",
    "..q.bbBBBCCc..",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSCC..",
    "..SVSSVSSVSC..",
  ],
  // La tête plongée : le cou sous l'eau, le corps à plat, la queue relevée.
  dip: [
    "T.q...........",
    "KKbbBBBBBBBc..",
    ".KPPPPUwsSCCC.",
    "..SVSSVSSVSCC.",
  ],
  // Le barbotage : il bascule, reste cul en l'air, pédale (pattes orange), se redresse.
  tip: [
    "T.......",
    "KKq.....",
    ".KPPB...",
    "..SUwBB.",
    "...SSSSC",
  ],
  dabble: [
    "..T...",
    ".KKq..",
    ".KPP..",
    "..SUw.",
    "..SSSB",
    "...SSC",
  ],
  dabble2: [
    ".OTO..",
    ".KKq..",
    ".KPP..",
    "..SUw.",
    "..SSSB",
    "...SSC",
  ],
  // La toilette : le bec plongé dans les plumes du flanc, puis dans le dos.
  preen: [
    ".......gGG....",
    "......gGhhG...",
    "......GhEGG...",
    ".....yYGGWC...",
    "..q.bbBBBWCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
  ],
  preen2: [
    ".......gGG....",
    ".....gGhhGC...",
    "..q.yYEhGGCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
  ],
  // Le battement d'ailes : dressé sur l'eau, les ailes en haut puis en avant.
  flap: [
    "...bB.........",
    "..bBBP........",
    "..bBPPw..gGG..",
    "...BPUw.gGhhG.",
    "....PPBBGGeEG.",
    ".....PBB.jjYYy",
    "..q..bBWWC....",
    "TKK.SSSsCCC...",
    ".KSSsSSSSCC...",
    "..SVSSVSSC....",
  ],
  flap2: [
    ".........gGG..",
    "........gGhhG.",
    "........GGeEG.",
    ".........jjYYy",
    "...bBBBBBWW...",
    "bBBPPPPUwBCCc.",
    "..TKPsSSsSCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
  ],
  // Le sommeil : la tête tournée, le bec dans le dos, le corps qui respire.
  sleep: [
    "......GgG.....",
    ".q.bbBhGGGB...",
    "TKKPPPUwsSCCc.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
  ],
  sleep2: [
    "......GgG.....",
    ".q.bbBhGGGB...",
    "TKKPPPUwsSCCc.",
    ".KSSsSSSsSCCC.",
    "..SVSSVSSVSC..",
  ],
  /* ── À TERRE (2026-09-26, second passage de Guillaume : « ils doivent pouvoir
     sortir et entrer dans l'étang librement »). Même corps, entier cette fois :
     le ventre (L) et les pattes orange (O/o), posé plus haut, un peu penché
     vers l'avant. La démarche : les pattes alternent et le corps roule d'un
     pixel. L'ancrage est entre les pattes, sur la ligne de sol. */
  stand: [
    ".........gGG..",
    "........gGhhG.",
    "........GGeEG.",
    ".........jjYYy",
    ".........WW...",
    "..q.bbBBBBCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
    "...LLLLLLLL...",
    "......O.O.....",
    ".....oo.oo....",
  ],
  walk: [
    ".........gGG..",
    "........gGhhG.",
    "........GGeEG.",
    ".........jjYYy",
    ".........WW...",
    "..q.bbBBBBCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
    "...LLLLLLLL...",
    ".....O...O....",
    "....oo....oo..",
  ],
  walk2: [
    "..........gGG.",
    ".........gGhhG",
    ".........GGeEG",
    "..........jjYY",
    ".........WW...",
    "..q.bbBBBBCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSC..",
    "...LLLLLLLL...",
    ".......O......",
    "......ooo.....",
  ],
  // Brouter l'herbe : la tête au sol, le bec qui fouille (deux temps).
  graze: [
    "..q.bbBBBB....",
    "TKKPPPPUwsCC..",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSCW.",
    "...LLLLLLLLgGh",
    "......O.O..jeE",
    ".....oo.oo..YY",
  ],
  // Le bec enfoncé dans l'herbe : on ne le voit plus.
  graze2: [
    "..q.bbBBBB....",
    "TKKPPPPUwsCC..",
    ".KSSsSSSsSSCC.",
    "..SVSSVSSVSCW.",
    "...LLLLLLLL.W.",
    "......O.O..gGh",
    ".....oo.oo.jeE",
  ],
  // Couché dans l'herbe : pas de pattes, le ventre au sol.
  rest: [
    ".........gGG..",
    "........gGhhG.",
    "........GGeEG.",
    ".........jjYYy",
    ".........WW...",
    "..q.bbBBBBCCc.",
    "TKKPPPPUwsCCC.",
    ".KSSsSSSsSSCC.",
    "..LLLLLLLLLL..",
  ],
};
/* LES ROBES, relues sur photos (Wikimedia Commons, 2026-09-26 : un couple posé
   sur une berge, un mâle qui nage, une cane dans une flaque).
   · Le MÂLE : tête verte à reflet bleu-vert (h) et calotte plus sombre (g) ;
     bec JAUNE à onglet sombre ; collier blanc ÉTROIT ; poitrail châtain
     pourpré ; flancs gris TRÈS PÂLES (presque blancs au soleil, finement
     vermiculés : V) ; le dos gris-brun (B/b) et les tertiaires brun-gris qui
     recouvrent le haut du flanc (P) ; le miroir bleu bordé de blanc (U/w) ;
     l'arrière NOIR, la queue BLANCHE et la boucle noire relevée (q) ; le ventre
     gris pâle (L) ; les pattes orange vif.
   · La FEMELLE : brun chamois écaillé de brun sombre (motif au pixel, voir
     `duckPal`) ; calotte et raie de l'œil sombres (g), joue et gorge chamois
     pâle (h, W) ; bec ORANGE à selle noire (y) ; même miroir ; queue claire.
   ⚠️ Le cerne n'est plus noir : un trait noir sur un sprite de 14 px mange la
     moitié du dessin. Il prend le ton le plus sombre de la robe (`DUCK_LINE`). */
const DUCK_PAL = {
  drake: {
    g: "#16402c", G: "#1f5e3c", h: "#3f9a78", e: "#1f5e3c", j: "#1a4a32", E: "#0c0c0c", Y: "#e6cc3c", y: "#6f6a22", W: "#f6f4ec",
    C: "#6e2f24", c: "#8f4a34", S: "#d3d0c6", s: "#e9e6dd", V: "#b2aea3", B: "#8a7e70", b: "#6b6054",
    P: "#a08e78", U: "#3346b4", w: "#f4f2ea", K: "#141418", q: "#141418", T: "#f2f0ea", L: "#c6c3ba",
    O: "#f08a2a", o: "#c8641c",
  },
  hen: {
    g: "#4a3522", G: "#8a6a48", h: "#cdb08a", e: "#3a2818", j: "#c8a87c", E: "#0c0c0c", Y: "#e8883a", y: "#2a2320", W: "#c8a87c",
    C: "#a47a4e", c: "#bd9464", S: "#a8804f", s: "#c09560", V: "#5c4028", B: "#7a5a3a", b: "#5a4028",
    P: "#8c6a44", U: "#3346b4", w: "#f0ece0", K: "#6a4c30", q: null, T: "#d6c2a0", L: "#c4a67c",
    O: "#e8802c", o: "#b85e1c",
  },
  // L'éclipse : la robe de la femelle, plus sombre et plus unie, le bec
  // jaune-olive du mâle, le poitrail roussâtre, et pas de boucle.
  drakeEclipse: {
    g: "#3e3022", G: "#6e5a40", h: "#9a8262", e: "#3e3022", j: "#8a7252", E: "#0c0c0c", Y: "#bdb04a", y: "#5e5828", W: "#8a7050",
    C: "#7a4e34", c: "#8e6040", S: "#8c7050", s: "#a2845e", V: "#5a4630", B: "#5e4a36", b: "#4a3a2a",
    P: "#7a6246", U: "#3346b4", w: "#ece8dc", K: "#4a3a2a", q: null, T: "#b8a484", L: "#a89070",
    O: "#e8802c", o: "#b85e1c",
  },
};
export const DUCK_LAND_POSES = new Set(["stand", "walk", "walk2", "graze", "graze2", "rest"]);
const DUCK_LINE = { drake: "#1c2224", hen: "#2e2016", drakeEclipse: "#2a2018" };
/* Les écailles de la femelle (et, plus discrètes, de l'éclipse) : un chevron
   sombre en quinconce sur le corps. À cette taille, c'est ce qui la distingue
   d'un mâle en éclipse — sans elles, deux canards bruns identiques. */
function duckPal(robe) {
  const P = DUCK_PAL[robe];
  return (ch, x, y) => {
    const base = P[ch];
    if (!base) return null;
    if (robe !== "drake" && "SsBbCcPL".includes(ch)) {
      /* Des chevrons CLAIRSEMÉS (un pixel sur quatre, décalé d'une rangée à
         l'autre) : le premier jet en mettait un sur trois en diagonale, et la
         cane se lisait comme un damier. */
      const k = (x * 2 + y) % 4;
      if (robe === "hen" && k === 0) return ch === "L" ? "#a88a60" : "#5e4228";
      if (robe === "hen" && k === 2 && (ch === "S" || ch === "C" || ch === "L")) return "#c9a270";
      if (robe === "drakeEclipse" && k === 0 && y % 2 === 0) return "#4a3826";
    }
    return base;
  };
}
/* Les canetons. Printemps : une boule de duvet jaune et brun (dos brun, face
   jaune, la raie de l'œil sombre), trois fois plus petite que sa mère, qui la
   suit en file. Été : un jeune à moitié grand, déjà brun comme elle. À terre,
   deux petites pattes, et la même démarche en deux temps. */
const DUCKLING_POSES = {
  tiny: [
    "...dD.",
    "..DdEY",
    "dddDD.",
    ".dDDD.",
  ],
  tiny2: [
    "....dD",
    "...DdEY",
    "dddDD..",
    ".dDDD..",
  ],
  tinyW: [
    "...dD.",
    "..DdEY",
    "dddDD.",
    ".dDDD.",
    "..O.O.",
  ],
  tinyW2: [
    "....dD",
    "...DdEY",
    "dddDD..",
    ".dDDD..",
    "...O...",
  ],
  young: [
    ".....fF.",
    "....FhEO",
    "..FFFFF.",
    "FFsFFFF.",
    ".FFFFF..",
  ],
  young2: [
    "......fF",
    ".....FhEO",
    "..FFFFFF.",
    ".FsFFFF..",
    "FFFFFF...",
  ],
  youngW: [
    ".....fF.",
    "....FhEO",
    "..FFFFF.",
    "FFsFFFF.",
    ".FFFFF..",
    "...O.O..",
  ],
  youngW2: [
    "......fF",
    ".....FhEO",
    "..FFFFFF.",
    ".FsFFFF..",
    ".FFFFF...",
    "....O....",
  ],
};
const DUCKLING_PAL = {
  D: "#ecd064", d: "#7c6236", Y: "#6a5a3a", E: "#101010",
  F: "#9a7a52", f: "#5e4630", h: "#c8ac80", s: "#c4a674", O: "#e08a3a",
};

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2. LES PIGEONS ET LES COLOMBES, REFAITS AU PIXEL NATIF.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️ LE DESSIN D'ORIGINE (433, refait sur les photos de Guillaume) reste la
   référence, et ses six règles tiennent à cette taille : long et bas, jabot
   qui déborde en avant et en bas, queue longue et pointue, deux barres
   alaires, pattes ROSE VIF, col irisé. Ce qui change : il fait 9 px de long au
   lieu d'en afficher 11 réduits d'un tiers — le pigeon était aussi long qu'un
   chat.
   Caractères : H tête, h reflet, E œil, I iris, b bec, n/m col (vert, violet),
   B corps, L dos éclairé, D sombre, R jabot, r jabot éclairé, X barres, P pattes.
   Même contrat que l'ancien `S.birds` : le profil DROIT, `ground` = la ligne
   de sol (c'est `ay`). */
const BIRD_GROUND = {
  stand: [
    ".....HH.",
    "....HEIb",
    "....nm..",
    "DDBLBRr.",
    ".DXXBRR.",
    "..P.P...",
  ],
  peck: [
    "........",
    "........",
    "....LL..",
    "DDBLBRRH",
    ".DXXBRHE",
    "..P.P.Hb",
  ],
  walk: [
    "......HH.",
    ".....HEIb",
    ".....nm..",
    ".DDBLBRr.",
    "..DXXBRR.",
    "...P..P..",
  ],
  puff: [
    ".....HH.",
    "....HEIb",
    "...rRRr.",
    "DDBLRRRr",
    "DDXXBRR.",
    "..P.P...",
  ],
  alert: [
    ".....HH.",
    "....HEIb",
    "....nm..",
    "....nR..",
    "DDBLBRr.",
    ".DXXBRR.",
    "..P.P...",
  ],
};
/* En vol : de profil, comme au 433 (le vol bas et bref d'un envol se lit de
   côté). ⚠️ L'ENVERGURE ÉCRASE LE CORPS et LES RÉMIGES SONT SÉPARÉES : les
   deux règles du 433, tenues ici par le dessin — l'aile fait plus que le corps
   et sa pointe s'effiloche d'un pixel évidé. ⚠️ LE CORPS NE BOUGE PAS d'une
   pose à l'autre : c'est l'aile qui bat (`BIRD_FLY_BODY` donne sa rangée). */
const BIRD_FLY = {
  up: [
    "..D.D....",
    "..DWDW...",
    "...WWW...",
    "....WW...",
    "....WW.HH",
    "DDBBBBRHE",
    ".D.BBBRRb",
  ],
  mid: [
    ".DWWWW.HH",
    "DDBBBBRHE",
    ".D.BBBRRb",
  ],
  down: [
    ".......HH",
    "DDBBBBRHE",
    ".D.WWBRRb",
    "...WWW...",
    "..DWDW...",
    "..D.D....",
  ],
  glide: [
    ".......HH",
    "DDBBBBRHE",
    ".DWWWWRRb",
    "D.D......",
  ],
};
const BIRD_FLY_BODY = { up: 5, mid: 1, down: 1, glide: 1 };
const BIRD_PAL = {
  pigeon: { H: "#6b7688", h: "#98a5b6", E: "#141414", I: "#e2761f", b: "#3a3836", n: "#3f8f7a", m: "#8a5f96",
            B: "#79879b", L: "#98a5b6", D: "#3f4a5b", R: "#9ba3ad", r: "#b8bfc8", X: "#2f3844", P: "#e8756a", W: "#5d6a7e" },
  dove:   { H: "#f4f2f8", h: "#ffffff", E: "#141414", I: "#c98f6a", b: "#5a544c", n: "#e4e1ea", m: "#d6d3e0",
            B: "#efedf4", L: "#ffffff", D: "#b3b0c0", R: "#f7f5fa", r: "#ffffff", X: "#cfccd8", P: "#e0a091", W: "#dcd9e2" },
};

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 3. LES GOÉLANDS ET LES MOUETTES RIEUSES (au sol et sur l'eau).
   ╚══════════════════════════════════════════════════════════════════════════
   Le goéland argenté est « la mouette » du port pour tout le monde : blanc,
   manteau gris perle, pointes d'ailes NOIRES tachées de blanc qui dépassent la
   queue, gros bec JAUNE à tache ROUGE, pattes rose pâle, œil clair et dur.
   La mouette rieuse est plus petite et plus fine, bec et pattes ROUGES, et
   porte son capuchon CHOCOLAT au printemps et en été ; l'hiver, la tête
   redevient blanche avec une tache sombre derrière l'œil (`gullPal`).
   Caractères : W blanc, w blanc d'ombre, G/g manteau (gris, clair), K noir des
   rémiges, k la tache blanche des rémiges, Y/y bec (jaune, clair), r tache
   rouge, E œil, P pattes. En vol, voir `drawGullFlight`. */
const GULL_POSES = {
  stand: [
    ".........WW...",
    "........WWWE..",
    "........wWWYYy",
    "....gGGGWWWr..",
    ".kKGGGGGGWWW..",
    "KKKgGGGGWWWw..",
    "..K.wwWWWWw...",
    "......P.P.....",
    "......P.P.....",
  ],
  walk: [
    ".........WW...",
    "........WWWE..",
    "........wWWYYy",
    "....gGGGWWWr..",
    ".kKGGGGGGWWW..",
    "KKKgGGGGWWWw..",
    "..K.wwWWWWw...",
    ".....P...P....",
    "....P.....P...",
  ],
  // Le long cri : la tête jetée en arrière puis en avant, le bec grand ouvert.
  // C'est le geste du goéland — on l'entend en le voyant.
  call: [
    "..........YY.",
    ".........WYr.",
    "........WWE..",
    "........WWWYy",
    "....gGGGWWW..",
    ".kKGGGGGGWW..",
    "KKKgGGGGWWWw.",
    "..K.wwWWWWw..",
    "......P.P....",
    "......P.P....",
  ],
  // La toilette : la tête dans l'épaule.
  preen: [
    ".............",
    ".....WWE.....",
    "....YWWW.....",
    "....gWWWWW...",
    ".kKGGGGGWWW..",
    "KKKgGGGGWWWw.",
    "..K.wwWWWWw..",
    "......P.P....",
    "......P.P....",
  ],
  // Le sommeil : tête rentrée, une patte repliée.
  sleep: [
    "..............",
    "..............",
    "........WWW...",
    "....gGGGWWWW..",
    ".kKGGGGGGWWW..",
    "KKKgGGGGWWWw..",
    "..K.wwWWWWw...",
    ".......P......",
    ".......P......",
  ],
  // Sur l'eau : pas de pattes, le ventre dans l'eau, la ligne de flottaison
  // sous la dernière rangée.
  float: [
    ".........WW...",
    "........WWWE..",
    "........wWWYYy",
    "....gGGGWWWr..",
    ".kKGGGGGGWWW..",
    "KKKgGGGGWWWw..",
  ],
  floatSleep: [
    "..............",
    "..............",
    "........WWW...",
    "....gGGGWWWW..",
    ".kKGGGGGGWWW..",
    "KKKgGGGGWWWw..",
  ],
};
/* La mouette rieuse a SON dessin, plus court de deux pixels et plus fin : une
   mouette réduite au rendu sauterait des pixels (voir l'en-tête), et un
   goéland repeint en rouge ne serait pas une mouette — elle a la tête ronde,
   le bec fin et droit, les pattes plus hautes pour sa taille.
   Caractère H : le capuchon (chocolat au printemps et en été, blanc l'hiver
   avec la tache sombre `e` derrière l'œil — `gullPal`). */
const LAUGH_POSES = {
  stand: [
    ".......HH..",
    "......HHHE.",
    "......HHHYY",
    "...gGGWWW..",
    ".kKGGGGWWW.",
    "KKgGGGGWWw.",
    "..K.wWWWw..",
    ".....P.P...",
    ".....P.P...",
  ],
  walk: [
    ".......HH..",
    "......HHHE.",
    "......HHHYY",
    "...gGGWWW..",
    ".kKGGGGWWW.",
    "KKgGGGGWWw.",
    "..K.wWWWw..",
    "....P...P..",
    "...P.....P.",
  ],
  preen: [
    "...........",
    "....HHE....",
    "...YHHH....",
    "...gWWWW...",
    ".kKGGGGWWW.",
    "KKgGGGGWWw.",
    "..K.wWWWw..",
    ".....P.P...",
    ".....P.P...",
  ],
  sleep: [
    "...........",
    "...........",
    "......HHH..",
    "...gGGWWWW.",
    ".kKGGGGWWW.",
    "KKgGGGGWWw.",
    "..K.wWWWw..",
    "......P....",
    "......P....",
  ],
  call: [
    ".........YY",
    "........HY.",
    ".......HHE.",
    "......HHH..",
    "...gGGWWW..",
    ".kKGGGGWWW.",
    "KKgGGGGWWw.",
    "..K.wWWWw..",
    ".....P.P...",
    ".....P.P...",
  ],
  float: [
    ".......HH..",
    "......HHHE.",
    "......HHHYY",
    "...gGGWWW..",
    ".kKGGGGWWW.",
    "KKgGGGGWWw.",
  ],
  floatSleep: [
    "...........",
    "...........",
    "......HHH..",
    "...gGGWWWW.",
    ".kKGGGGWWW.",
    "KKgGGGGWWw.",
  ],
};
const GULL_PAL = {
  herring: { W: "#f6f6f2", w: "#d9dde2", G: "#a2adb9", g: "#bcc5cf", K: "#1b1b1f", k: "#f6f6f2",
             Y: "#e8c33a", y: "#f3dc76", r: "#d23c24", E: "#e9df9a", P: "#e3a8a0", H: "#f6f6f2" },
  laughing: { W: "#f6f6f2", w: "#d9dde2", G: "#b2bcc7", g: "#c9d0d8", K: "#1b1b1f", k: "#f6f6f2",
              Y: "#b8302a", y: "#c8423a", r: "#b8302a", E: "#1a1a1a", P: "#c23a30", H: "#f6f6f2" },
};
/* Le capuchon de la mouette rieuse : chocolat (et non noir — c'est le brun
   qu'on voit de près) au printemps et en été ; l'hiver, tête blanche et une
   tache sombre derrière l'œil. Deux robes, un seul dessin. */
function gullPal(species, winter) {
  const P = GULL_PAL[species];
  return (ch, x, y) => {
    if (species === "laughing" && ch === "H") {
      if (!winter) return "#4b3326";
      return null;   // l'hiver : voir le second passage (tête blanche + tache)
    }
    return P[ch] || null;
  };
}
function laughWinter(rows) {
  // La tête blanche, et la tache d'oreille UN pixel derrière l'œil.
  return rows.map((r, y) => r.replace(/H/g, "W")).map((r, y, all) => {
    const e = r.indexOf("E");
    if (e > 1 && r[e - 2] === "W") return r.slice(0, e - 2) + "K" + r.slice(e - 1);
    return r;
  });
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 4. LES TROIS CHATS DE LA VILLE.
   ╚══════════════════════════════════════════════════════════════════════════
   Un roux tigré, un noir, une tricolore — trois ROBES sur un seul dessin
   (`catPal`). Ce qui fait un chat et pas un renard ou un petit chien, par
   ordre d'importance à cette taille :
     1. une petite tête RONDE aux oreilles pointues, posée bas, presque dans
        l'alignement du dos quand il marche ;
     2. un corps long et souple, des pattes FINES (un pixel) ;
     3. la QUEUE : longue, fine, relevée en point d'interrogation quand il
        marche content, enroulée autour des pattes quand il est assis, gonflée
        quand il a peur. C'est elle qui dit l'humeur — on la lit avant le
        reste ;
     4. assis, le triangle : les hanches larges en bas, le poitrail droit.
   Caractères : A oreille, I intérieur de l'oreille, H tête, E œil, N nez,
   W blanc (poitrail, museau, pattes — crème chez le roux, noir chez le noir),
   B fourrure, h dos éclairé, b fourrure d'ombre (pattes lointaines, ventre),
   L patte proche, P pied, t queue, T queue gonflée, z paupière close. */
const CAT_POSES = {
  // La marche, quatre temps : contact, passage, contact opposé, passage.
  walk0: [
    ".tt.........A.A.",
    "t...........HHH.",
    "t...........HEHW",
    ".t.hhhhhhhhhHHWN",
    "..tBBBBBBBBBBHH.",
    "...BBBBBBBBBBB..",
    "...BbWWWWWWBBb..",
    "...L.b.....b.L..",
    "..L...b...b...L.",
    "..P...b...b...P.",
  ],
  walk1: [
    ".tt.........A.A.",
    "t...........HHH.",
    "t...........HEHW",
    ".t.hhhhhhhhhHHWN",
    "..tBBBBBBBBBBHH.",
    "...BBBBBBBBBBB..",
    "...BbWWWWWWBBb..",
    "....bL.....Lb...",
    "....bL.....Lb...",
    "....bP.....Pb...",
  ],
  walk2: [
    ".tt.........A.A.",
    "t...........HHH.",
    "t...........HEHW",
    ".t.hhhhhhhhhHHWN",
    "..tBBBBBBBBBBHH.",
    "...BBBBBBBBBBB..",
    "...BbWWWWWWBBb..",
    "...b.L.....L.b..",
    "..b...L...L...b.",
    "..b...P...P...b.",
  ],
  // Le trot (la fuite) : le corps s'allonge et s'abaisse, la queue à
  // l'horizontale, les pattes en extension puis rassemblées.
  run0: [
    "................",
    "............A.A.",
    "............HHH.",
    "tt.hhhhhhhhhHEHW",
    "..tBBBBBBBBBBHWN",
    "...BBBBBBBBBBB..",
    "..LbWWWWWWWWb.L.",
    ".L..........L..L",
    "P..............P",
  ],
  run1: [
    "................",
    "............A.A.",
    "............HHH.",
    "ttthhhhhhhhhHEHW",
    "...BBBBBBBBBBHWN",
    "...BBBBBBBBBBB..",
    "....bLWWWWLb....",
    ".....LbbbbL.....",
    ".....P....P.....",
  ],
  // Assis de profil, la queue enroulée devant les pattes.
  sit: [
    ".....A.A.",
    ".....HHH.",
    ".....HEHW",
    ".....HHWN",
    "....hBBW.",
    "...hBBBW.",
    "..hBBBBW.",
    "..BBBBBW.",
    "..BBBBbW.",
    ".tBBBBbWP",
    "..tttttt.",
  ],
  // Assis de face : la pose du chat qui vous regarde.
  front: [
    ".A...A.",
    ".AHHHA.",
    ".HEHEH.",
    ".HHNHH.",
    "..WWW..",
    ".BWWWB.",
    ".BWWWB.",
    "BBBWBBB",
    "BBPBPBBt",
    ".bbbbbtt",
  ],
  // La miche : pattes rentrées, yeux mi-clos.
  loaf: [
    "..........A.A",
    "..........HHH",
    "...hhhhhhhHzHW",
    "..BBBBBBBBHHWN",
    ".tBBBBBBBBBB..",
    "ttbbbbbbbbbb..",
  ],
  // Roulé en boule : le museau sous la queue. Deux temps (la respiration).
  sleep0: [
    ".A.A.......",
    ".HHHhhhhh..",
    "HzHzBBBBBh.",
    "HHWHBBBBBBB",
    ".ttttttBBBB",
    "..bbbbbbbb.",
  ],
  sleep1: [
    "...........",
    ".A.A.hhhh..",
    ".HHHhBBBBh.",
    "HzHzBBBBBBB",
    "HHWHttttBBB",
    "..bbbbbbbb.",
  ],
  // La toilette : assis, une patte levée au museau, la tête penchée.
  groom0: [
    ".........",
    ".........",
    ".....A.A.",
    ".....HHH.",
    ".....HzHW",
    "....hBBWP",
    "...hBBBL.",
    "..hBBBBW.",
    "..BBBBbW.",
    ".tBBBBbWP",
    "..tttttt.",
  ],
  groom1: [
    ".........",
    ".........",
    ".....A.A.",
    ".....HHHP",
    ".....HzHL",
    "....hBBWL",
    "...hBBBW.",
    "..hBBBBW.",
    "..BBBBbW.",
    ".tBBBBbWP",
    "..tttttt.",
  ],
  // Le frottement : la queue droite, la tête basse, le corps arqué contre la
  // jambe — le chat qui dit bonjour.
  rub: [
    "..t.............",
    "..t.............",
    "..t.............",
    "..t.hhhhhhh.....",
    "..tBBBBBBBBhA.A.",
    "...BBBBBBBBBHHH.",
    "...BbWWWWWBBHEHW",
    "...L.b....bLHHWN",
    "...L.b....b.L...",
    "...P.b....b.P...",
  ],
  // Le gros dos : l'échine en arc, la queue gonflée, les pattes raides.
  arch: [
    ".TT.............",
    "TTTT..hhhh......",
    ".TT.hBBBBBh.....",
    "..TBBBBBBBBB.A.A",
    "...BBBbbbbBBBHHH",
    "...BB....BBBHEHW",
    "...L......L.HHWN",
    "...L......L.....",
    "...P......P.....",
  ],
  // De face, en marchant vers la caméra (deux temps), et de dos.
  down0: [
    ".A...A.",
    ".AHHHA.",
    ".HEHEH.",
    ".HHNHH.",
    "..WWW..",
    ".BBWBB.",
    ".BBBBB.",
    ".L.b.L.",
    ".P.b.P.",
  ],
  down1: [
    ".A...A.",
    ".AHHHA.",
    ".HEHEH.",
    ".HHNHH.",
    "..WWW..",
    ".BBWBB.",
    ".BBBBB.",
    ".b.L.b.",
    ".b.P.b.",
  ],
  up0: [
    "...t...",
    "..t....",
    "..t....",
    ".A.t.A.",
    ".AHHHA.",
    ".HHHHH.",
    ".hBBBh.",
    ".BBBBB.",
    ".BBBBB.",
    ".L.b.L.",
    ".P.b.P.",
  ],
  up1: [
    "....t..",
    "...t...",
    "...t...",
    ".A.t.A.",
    ".AHHHA.",
    ".HHHHH.",
    ".hBBBh.",
    ".BBBBB.",
    ".BBBBB.",
    ".b.L.b.",
    ".b.P.b.",
  ],
};
/* Les trois robes. `stripe` : la couleur des rayures du tigré (sur le dos, la
   tête et en anneaux sur la queue) ; `patch` : les taches du tricolore. */
const CAT_COATS = {
  roux: { B: "#d98a3f", h: "#eca85c", b: "#a9612a", W: "#f3e3c3", A: "#c77a35", I: "#e8a3a0", H: "#d98a3f",
          E: "#c8d84a", N: "#e59a93", L: "#d98a3f", P: "#f3e3c3", t: "#d98a3f", T: "#d98a3f", z: "#8a4a1f", stripe: "#9e4f1c" },
  noir: { B: "#2a2930", h: "#45444f", b: "#1a191e", W: "#2a2930", A: "#2a2930", I: "#5a4450", H: "#2a2930",
          E: "#d9e050", N: "#3a3038", L: "#2a2930", P: "#2a2930", t: "#2a2930", T: "#2a2930", z: "#15141a" },
  tricolore: { B: "#f1ece3", h: "#fbf8f2", b: "#cfc8bb", W: "#f7f3ec", A: "#2b2930", I: "#e8a3a0", H: "#f1ece3",
               E: "#8fbf4a", N: "#e59a93", L: "#f1ece3", P: "#f7f3ec", t: "#2b2930", T: "#2b2930", z: "#6a5a4a",
               patch: true },
};
function catHash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function catPal(coat, pose) {
  const P = CAT_COATS[coat];
  const faceOn = pose === "front" || (pose && pose.startsWith("down"));
  return (ch, x, y) => {
    let col = P[ch];
    if (!col) return null;
    // Le tigré : une rayure tous les trois pixels sur le dos et la tête, des
    // anneaux sur la queue. Jamais sur le blanc.
    if (P.stripe) {
      if ((ch === "h" || ch === "B") && (x % 3 === 0) && y <= 5) return P.stripe;
      if (ch === "H" && x % 2 === 1 && y <= 2) return P.stripe;
      if ((ch === "t" || ch === "T") && (x + y) % 3 === 0) return P.stripe;
    }
    // La tricolore : des taches roux et noires par blocs de 3×3, et la tête
    // toujours tachée (c'est le visage qu'on regarde).
    if (P.patch && (ch === "B" || ch === "h" || ch === "H" || ch === "L")) {
      const k = catHash((x / 3) | 0, (y / 3) | 0, 7) % 7;
      /* Le visage : de face, PARTAGÉ en deux — roux d'un côté, noir de
         l'autre, le museau blanc au milieu (c'est LA tête de tricolore) ; de
         profil, roux sous des oreilles noires. */
      if (ch === "H") return faceOn ? (x <= 3 ? "#d8883c" : "#2b2930") : "#d8883c";
      if (k === 0 || k === 3) return ch === "h" ? "#eba35a" : "#d8883c";
      if (k === 1) return "#2b2930";
    }
    return col;
  };
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 5. LE POISSON QUI SAUTE (le port). Trois temps : il sort, il plane, il
   ║ replonge. Argenté, sans cerne : il sort de l'eau mouillé et brillant, un
   ║ trait noir en ferait un jouet.
   ╚══════════════════════════════════════════════════════════════════════════ */
const JUMP_POSES = {
  rise: [
    "....As",
    "..AAAs",
    ".AAaa.",
    "TAaa..",
    "T.....",
  ],
  top: [
    "T.AAAAs.",
    "TTAaaaAs",
    "T..aa...",
  ],
  dive: [
    "sA....",
    "sAAA..",
    ".aaAA.",
    "..aaAT",
    ".....T",
  ],
};
const JUMP_PAL = { A: "#a9b4bc", a: "#e4e9ec", s: "#3c4a56", T: "#7d8a94" };

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 6. LES PAPILLONS — six espèces, quatre ouvertures d'ailes.
   ╚══════════════════════════════════════════════════════════════════════════
   ⚠️ « PETITS ET DÉTAILLÉS » : 5 à 7 px d'envergure (un papillon réel ferait
   moins d'un pixel — on l'agrandit, c'est le seul animal qui l'est), mais
   CHAQUE ESPÈCE A SA MARQUE, un ou deux pixels qu'on reconnaît : les pointes
   noires et le point de la piéride, le point orange du citron, la frange
   blanche de l'azuré, la bande rouge et les points blancs du vulcain, les
   ocelles du paon du jour, les veines noires et les queues du machaon.
   Vus d'en haut ailes ouvertes (3), à demi (2), presque dressées (1), puis
   FERMÉES au-dessus du dos (0) : on voit alors le REVERS, plus terne — c'est
   ce qui fait qu'un papillon posé disparaît presque, comme dans la vie.
   Caractères : t pointe, F aile antérieure, m sa marque, H aile postérieure,
   e sa marque, b corps, U revers, u marque du revers, q queue (machaon).
   Pas de cerne : un trait d'un pixel doublerait sa taille. */
const BFLY_FRAMES = {
  3: ["tF.b.Ft", "FFmbmFF", ".HebeH.", "..H.H.."],
  2: [".tFbFt.", "..mbm..", "..HbH.."],
  1: ["..FbF..", "..HbH.."],
  0: ["..UU...", "..Uu...", "...b..."],
};
const BFLY_PAL = {
  pieride: { t: "#2b2b2e", F: "#f4f2ea", m: "#3a3a3c", H: "#ecece0", e: "#ecece0", b: "#3b3a36", U: "#e3e8bd", u: "#cdd59d" },
  citron:  { t: "#eee25a", F: "#efe35a", m: "#e0892c", H: "#e6da55", e: "#e0892c", b: "#4a4630", U: "#dde389", u: "#c8cf6c" },
  azure:   { t: "#f2f4fb", F: "#7ea6ec", m: "#6c93dc", H: "#6f98e2", e: "#f2f4fb", b: "#2e3140", U: "#d9d2c6", u: "#8b8178" },
  vulcain: { t: "#f4f1ea", F: "#221d20", m: "#d8462a", H: "#221d20", e: "#d8462a", b: "#1a1616", U: "#4d3d38", u: "#8a6450" },
  paon:    { t: "#b9402b", F: "#b9402b", m: "#3d5fc8", H: "#9d3525", e: "#e6bd44", b: "#2a1f1f", U: "#2c2426", u: "#43383b" },
  machaon: { t: "#1e1a18", F: "#f0d860", m: "#1e1a18", H: "#f0d860", e: "#3b5bc0", b: "#1e1a18", U: "#efe1a2", u: "#1e1a18", q: "#1e1a18" },
};
function bflySprite(sp, open) {
  const rows = BFLY_FRAMES[open].slice();
  if (sp === "machaon" && open >= 2) rows.push(open === 3 ? ".q...q." : "..q.q..");
  const c = ascii(rows, (ch) => BFLY_PAL[sp][ch] || null);
  let bottom = 0;
  rows.forEach((r, y) => { if (r.includes("b")) bottom = y + 1; });
  c.ax = 3; c.ay = bottom;
  return c;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 7. CE QUI SE DESSINE AU PIXEL, AU RENDU (toutes les directions).
   ╚══════════════════════════════════════════════════════════════════════════
   Coordonnées en px d'ART du monde ; chaque pixel est ARRONDI sur la grille —
   c'est ce qui garde ces dessins au même gros pixel que le reste. */
function px(ctx, x, y, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }

/* La carpe, vue d'en haut, SOUS l'eau : dix segments le long d'une épine qui
   ondule (l'ondulation grandit vers la queue — c'est la queue qui nage), le
   dos plus sombre que les flancs, la nageoire caudale en éventail. `z` : 0 en
   surface (nette), 1 au fond (pâle, bleuie) ; son ombre sur le fond s'écarte
   quand elle monte. */
const CARP_PAL = {
  bronze: { back: "#4f4128", side: "#7a653d", fin: "#6a5836" },
  koi:    { back: "#c9571f", side: "#e2813a", fin: "#e9a060", patch: "#efe9dc" },
  ghost:  { back: "#8a8676", side: "#bdb8a2", fin: "#a9a58f" },
};
const CARP_W = [2, 3, 3, 3, 3, 2, 2, 1, 1, 3];
export function drawCarp(ctx, x, y, hx, hy, swim, color, z, alpha) {
  const P = CARP_PAL[color] || CARP_PAL.bronze;
  const nx = -hy, ny = hx;
  const pts = [];
  for (let s = 0; s < CARP_W.length; s++) {
    const w = Math.sin(swim * 6.283 - s * 0.55) * Math.pow(s / 9, 1.5) * 1.3;
    pts.push({ x: x + hx * (4.5 - s) + nx * w, y: y + hy * (4.5 - s) + ny * w });
  }
  const a0 = ctx.globalAlpha;
  // L'ombre portée sur le fond : plus loin quand la carpe est haute.
  ctx.globalAlpha = a0 * alpha * 0.22;
  const so = 1 + (1 - z) * 2.5;
  for (let s = 0; s < pts.length - 1; s++) px(ctx, pts[s].x + so * 0.6, pts[s].y + so, "#0d2230");
  const fade = 1 - z * 0.3;
  ctx.globalAlpha = a0 * alpha * fade;
  for (let s = 0; s < pts.length; s++) {
    const w = CARP_W[s], q = pts[s];
    for (let j = 0; j < w; j++) {
      const o = j - (w - 1) / 2;
      let col = Math.abs(o) < 0.6 ? P.back : P.side;
      if (s === 9) col = P.fin;
      if (P.patch && ((s === 2 && o > 0) || (s === 5 && o <= 0) || s === 3)) col = P.patch;
      px(ctx, q.x + nx * o, q.y + ny * o, col);
    }
  }
  // Les nageoires pectorales, un pixel de chaque côté, qui battent doucement.
  const pf = Math.sin(swim * 9) > 0 ? 2 : 1.6;
  px(ctx, pts[2].x + nx * pf, pts[2].y + ny * pf, P.fin);
  px(ctx, pts[2].x - nx * pf, pts[2].y - ny * pf, P.fin);
  ctx.globalAlpha = a0;
}

/* Le goéland EN VOL, vu d'en haut (on survole le port de haut) : deux ailes
   longues, étroites et un peu repliées vers l'arrière, pointes noires avec un
   « miroir » blanc, corps blanc, manteau gris. La mouette rieuse est plus
   petite et porte le BORD D'ATTAQUE BLANC de l'aile externe — sa marque en
   vol. `flap` 0 = plané ; sinon les ailes battent (l'envergure apparente
   raccourcit quand elles montent). Cerne d'un pixel : un oiseau blanc sur
   l'eau claire ou sur la pierre disparaît sans lui. */
const GULL_FLY_PAL = {
  herring:   { wing: "#a2adb9", edge: "#b9c2cc", tip: "#1b1b1f", mirror: "#f6f6f2", body: "#f6f6f2", back: "#a9b3be", head: "#f6f6f2", S: 12, lead: null },
  laughing:  { wing: "#b8c2cc", edge: "#f6f6f2", tip: "#1b1b1f", mirror: null, body: "#f6f6f2", back: "#b8c2cc", head: "#4b3326", S: 9, lead: "#f6f6f2" },
  laughingW: { wing: "#b8c2cc", edge: "#f6f6f2", tip: "#1b1b1f", mirror: null, body: "#f6f6f2", back: "#b8c2cc", head: "#f6f6f2", S: 9, lead: "#f6f6f2" },
};
export function drawGullFlight(ctx, x, y, hx, hy, flapPhase, flapping, sp) {
  const P = GULL_FLY_PAL[sp] || GULL_FLY_PAL.herring;
  const nx = -hy, ny = hx;
  const f = flapping ? 0.72 + 0.28 * Math.cos(flapPhase) : 1;
  const bend = flapping ? Math.sin(flapPhase) * 0.8 : 0;
  const cells = [];
  const put = (qx, qy, col) => cells.push([Math.round(qx), Math.round(qy), col]);
  for (const side of [1, -1]) {
    const S = P.S;
    for (let u = 1; u <= S; u++) {
      const reach = u * f;
      const sweep = (u / S) * 2.2 + bend * (u / S);
      const cx = x + nx * side * reach - hx * sweep, cy = y + ny * side * reach - hy * sweep;
      const chord = Math.max(1, Math.round(3 - 2 * u / S));
      for (let j = 0; j < chord; j++) {
        const qx = cx + hx * (0.5 - j), qy = cy + hy * (0.5 - j);
        let col = u > S - 3 ? P.tip : j === 0 ? P.edge : P.wing;
        if (P.mirror && u === S - 1 && j === 0) col = P.mirror;
        if (P.lead && u > S * 0.55 && u <= S - 3 && j === 0) col = P.lead;
        put(qx, qy, col);
      }
    }
  }
  // Le corps : tête devant, queue blanche derrière.
  for (let s = -3; s <= 3; s++) {
    const col = s >= 2 ? P.head : s <= -2 ? P.body : P.back;
    put(x + hx * s, y + hy * s, col);
    if (s > -2 && s < 2) put(x + hx * s + nx * 0.6, y + hy * s + ny * 0.6, P.body);
  }
  // Le cerne, puis les couleurs.
  ctx.fillStyle = "#2a2c33";
  const seen = new Set(cells.map((c) => c[0] + "," + c[1]));
  for (const [cx, cy] of cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = (cx + dx) + "," + (cy + dy);
    if (!seen.has(k)) { seen.add(k); ctx.fillRect(cx + dx, cy + dy, 1, 1); }
  }
  for (const [cx, cy, col] of cells) { ctx.fillStyle = col; ctx.fillRect(cx, cy, 1, 1); }
}
/* L'ombre d'un oiseau en vol, sur le sol ou sur l'eau : une tache qui
   rétrécit avec l'altitude — c'est elle, et elle seule, qui dit sa hauteur. */
export function drawFlyShadow(ctx, x, y, span, alt, alpha) {
  const k = Math.max(0.25, 1 - alt / 5);
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha * 0.22 * k;
  ctx.fillStyle = "#101418";
  const w = Math.max(2, Math.round(span * k)), h = Math.max(1, Math.round(2 * k));
  ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  ctx.fillRect(Math.round(x - w / 6), Math.round(y - h / 2) - 1, Math.max(1, Math.round(w / 3)), h + 2);
  ctx.globalAlpha = a0;
}
/* Un rond dans l'eau : une ellipse de pixels (l'eau est vue de biais). */
export function drawRipple(ctx, x, y, r, alpha, col) {
  if (r <= 0 || alpha <= 0.01) return;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  ctx.fillStyle = col || "#d8ecf4";
  const ry = r * 0.45, n = Math.max(6, Math.ceil(r * 6));
  const done = new Set();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283;
    const qx = Math.round(x + Math.cos(a) * r), qy = Math.round(y + Math.sin(a) * ry);
    const k = qx * 4096 + qy;
    if (done.has(k)) continue;
    done.add(k); ctx.fillRect(qx, qy, 1, 1);
  }
  ctx.globalAlpha = a0;
}
/* Le sillage en V d'une bête qui nage : deux traînées de pixels clairs qui
   s'ouvrent derrière elle et s'effacent. */
export function drawWake(ctx, x, y, hx, hy, strength, len) {
  if (strength <= 0.02) return;
  const nx = -hy, ny = hx;
  const a0 = ctx.globalAlpha;
  ctx.fillStyle = "#e4f1f6";
  for (let k = 1; k <= len; k++) {
    ctx.globalAlpha = a0 * strength * 0.55 * (1 - k / (len + 1));
    const bx = x - hx * (2 + k * 1.6), by = y - hy * (2 + k * 1.6);
    const o = 0.8 + k * 0.75;
    ctx.fillRect(Math.round(bx + nx * o), Math.round(by + ny * o * 0.6), 1, 1);
    ctx.fillRect(Math.round(bx - nx * o), Math.round(by - ny * o * 0.6), 1, 1);
  }
  ctx.globalAlpha = a0;
}

/* Les yeux d'une pose (pour leur éclat la nuit, à la lumière d'une lampe) :
   lus dans le DESSIN, jamais recopiés à côté. */
function eyesOf(rows) {
  const out = [];
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === "E") out.push([x + PAD, y + PAD]); });
  return out;
}

/* ── Assemblage ─────────────────────────────────────────────────────────── */
export const CAT_COAT_KEYS = Object.keys(CAT_COATS);
export function buildFaunaSprites() {
  const items = [];
  const add = (key, c) => { items.push({ key, c }); return c; };
  const last = (rows) => rows.length - 1;
  // Colverts : trois robes × six poses. L'ancrage est la ligne de flottaison,
  // au milieu du corps (pas du dessin : le cou n'est pas le centre de masse).
  for (const robe of ["drake", "hen", "drakeEclipse"]) {
    const pal = duckPal(robe);
    for (const [pose, rows] of Object.entries(DUCK_POSES)) {
      // À terre, le cerne fait le tour (pattes comprises) ; sur l'eau, il s'arrête à la flottaison.
      const land = DUCK_LAND_POSES.has(pose);
      add(`duck.${robe}.${pose}`, finish(ascii(rows, pal), pose === "dabble" || pose === "dabble2" || pose === "tip" ? 3 : 6, last(rows) + 1, DUCK_LINE[robe], !land));
    }
  }
  for (const [pose, rows] of Object.entries(DUCKLING_POSES)) {
    add(`duckling.${pose}`, finish(ascii(rows, (ch) => DUCKLING_PAL[ch] || null), 3, last(rows) + 1, "#2e2416", !pose.endsWith("W") && !pose.endsWith("W2")));
  }
  /* Pigeons et colombes : l'ancrage est entre les pattes, sur la ligne de sol.
     ⚠️ ILS RESTENT DES CANEVAS AUTONOMES (pas dans l'atlas), avec `ground` :
     c'est le contrat de `S.birds` depuis le 433, lu par TROIS dessins (la
     place, les corniches du tribunal et de l'église). Dix-huit canevas, le
     même nombre qu'avant — on ne change que leur taille. */
  const birds = { pigeon: {}, dove: {} };
  for (const kind of ["pigeon", "dove"]) {
    const pal = (ch) => BIRD_PAL[kind][ch] || null;
    for (const [pose, rows] of Object.entries(BIRD_GROUND)) birds[kind][pose] = finish(ascii(rows, pal), 4, last(rows) + 1, "#2b2530");
    for (const [pose, rows] of Object.entries(BIRD_FLY)) birds[kind][pose] = finish(ascii(rows, pal), 4, BIRD_FLY_BODY[pose] + 2, "#2b2530");
  }
  // Goélands, et mouettes rieuses en deux robes (été : capuchon ; hiver : tête blanche).
  const floatPose = (pose) => pose === "float" || pose === "floatSleep";
  for (const [pose, rows] of Object.entries(GULL_POSES)) {
    add(`gull.herring.${pose}`, finish(ascii(rows, gullPal("herring")), 7, last(rows) + 1, "#2a2c33", floatPose(pose)));
  }
  for (const winter of [false, true]) {
    for (const [pose, rows] of Object.entries(LAUGH_POSES)) {
      const rr = winter ? laughWinter(rows) : rows;
      add(`gull.${winter ? "laughingW" : "laughing"}.${pose}`, finish(ascii(rr, gullPal("laughing", winter)), 6, last(rows) + 1, "#2a2c33", floatPose(pose)));
    }
  }
  // Les chats : trois robes × dix-huit poses, ancrés sous le ventre.
  for (const coat of CAT_COAT_KEYS) {
    for (const [pose, rows] of Object.entries(CAT_POSES)) {
      const pal = catPal(coat, pose);
      const ax = pose === "sit" || pose === "groom0" || pose === "groom1" ? 5 : pose === "front" || pose.startsWith("down") || pose.startsWith("up") ? 3 : pose.startsWith("sleep") ? 5 : pose === "loaf" ? 6 : 8;
      const c = add(`cat.${coat}.${pose}`, finish(ascii(rows, pal), ax, last(rows) + 1, "#1d1a1f"));
      c.eyes = eyesOf(rows);
    }
  }
  for (const sp of Object.keys(BFLY_PAL)) for (const o of [0, 1, 2, 3]) add(`bfly.${sp}.o${o}`, bflySprite(sp, o));
  for (const [pose, rows] of Object.entries(JUMP_POSES)) add(`jump.${pose}`, finish(ascii(rows, (ch) => JUMP_PAL[ch] || null), 3, last(rows), null));
  for (const set of Object.values(birds)) for (const c of Object.values(set)) c.ground = c.ay;
  const out = packAtlas(items);
  out.birds = birds;
  // Les yeux voyagent avec la case (voir eyesOf).
  for (const it of items) if (it.c.eyes) {
    let node = out; const path = it.key.split(".");
    for (const k of path) node = node[k];
    node.eyes = it.c.eyes;
  }
  return out;
}
