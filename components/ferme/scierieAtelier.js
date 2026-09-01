"use client";
/* ═══════════════════════════════════════════════════════════════════════════
   LOT E — L'ATELIER DE TRISTAN, CONSTRUIT INTÉGRALEMENT, EN CODE.
   ═══════════════════════════════════════════════════════════════════════════
   Demande de Guillaume, mot pour mot : « une scène 3D très fluide dans l'atelier
   de Tristan […] le rendu doit être absolument parfait, la scie doit pas être
   trop rigide et on doit sentir l'effort […] Tristan en face un perso très
   cohérent anatomiquement […] le décor intérieur du bâtiment de Tristan doit
   être parfaitement traité. »

   ⚠️⚠️ PROCÉDURAL, COMME `maireBureau.js`, ET POUR LA MÊME RAISON DATÉE. Le
   pipeline C (Blender → glTF) a eu son premier usage au 480 et il a échoué : le
   bureau du maire est arrivé dans le dépôt avec ses nœuds doublement décalés, il
   a été chargé, documenté, et jamais ouvert dans un canevas pendant un zip
   entier. Aucun outil du dépôt ne pouvait le dire — un glTF est de la DONNÉE.
   Ici, tout est du code : les bancs peuvent l'appeler, `render-scierie.mjs` le
   rastérise sans GPU, et un réglage de coude se corrige en changeant un nombre.

   ⚠️⚠️⚠️ ET RIEN ICI NE VIT DANS LA CLOSURE DE LA BOUCLE DE RENDU (piège n°1 de
   `CLAUDE.md`). `buildShop` rend un OBJET ; `applySaw`, `bladeFlex`,
   `tristanRig` sont des fonctions de MODULE. La boucle de `ScierieScene.js` ne
   déclare rien : elle appelle.

   ⚠️ `THREE` EST PASSÉ EN PARAMÈTRE, JAMAIS IMPORTÉ (r128 vendorisé en
   `<script>` : deux copies dans une page ne ressemblent à rien).

   ───────────────────────────────────────────────────────────────────────────
   LE REPÈRE, ET IL EST LE MÊME QUE CELUI DE LA MÉCANIQUE

   +X à droite, +Y en haut, +Z vers NOUS. Tristan est en Z négatif, face à nous,
   de l'autre côté du madrier. La lame court le long de Z — c'est un passe-
   partout, on scie EN TRAVERS d'un madrier posé sur deux chevalets.
   ⚠️⚠️ LA POSITION DE LA LAME SE DÉDUIT DE `s.bx`, ET RIEN NE SE DÉDUIT DANS
   L'AUTRE SENS. C'est le §4 de `CLAUDE.md` (« une grandeur de dessin ne doit pas
   entrer dans la collision ») pris à l'endroit : la mécanique ignore
   complètement ce fichier, et ce fichier ne fait que la REGARDER. Un dessin qui
   déciderait d'un verdict serait un dessin que l'hôte ne peut pas rejouer.
   Tout est en mètres.
   ═══════════════════════════════════════════════════════════════════════════ */
import * as C from "./fermeConstants";
import * as R3 from "./rig3d";

/* ═══════════════════════════════════════════════════════════════════════════
   1. UN SEUL JEU DE NOMBRES POUR L'ATELIER
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ Ils bâtissent les murs ET bornent la caméra ET placent le madrier ET
   décident où Tristan pose ses pieds. Deux descriptions du même hangar
   divergeraient au premier réglage, et le symptôme serait une caméra qui
   traverse un mur qu'elle voit (§8, et c'est exactement ce que `ROOM` évite
   dans le bureau du maire).
   ═══════════════════════════════════════════════════════════════════════════ */
export const SHOP = {
  x0: -4.5, x1: 4.5,            // 9 m de large
  z0: -4.3, z1: 4.7,            // 9 m de profond
  wallH: 3.05,                  // sablière
  ridge: 4.95,                  // faîtage

  /* ── LE MADRIER. Il court le long de X, sur deux chevalets, et le trait de
     scie tombe à `cutX`. ⚠️ LE SECOND CHEVALET EST EN DEÇÀ DU TRAIT, ET C'EST
     UNE DÉCISION DE MISE EN SCÈNE : une chute encore portée par son chevalet ne
     tombe jamais, donc on ne verrait pas la planche finir. Ici elle porte à
     faux sur 63 cm et elle bascule. ── */
  /* ⚠️⚠️ LE MADRIER EST DESCENDU DE 0,86 À 0,72 ET AMINCI DE 0,30 À 0,22, ET
     C'EST `render-scierie` QUI L'A EXIGÉ — PAS LE GOÛT. À 0,86 avec 34 cm de
     manche, la poignée tombait à HAUTEUR DE POITRINE : Tristan sciait les mains
     devant le sternum, coudes en l'air, avant-bras en travers du buste. Le banc
     ne le disait pas en mots, il le montrait sur quinze vignettes — et aucun de
     ses contrôles numériques n'avait de raison de tomber, puisque les mains
     étaient bien sur les poignées. *Une posture peut être exacte et absurde ;
     seule l'image le dit.*
     ⚠️ ET L'ÉPAISSEUR COMPTE AUTANT QUE LA HAUTEUR : le trait se creuse sur
     toute la hauteur du madrier, donc les mains DESCENDENT d'autant. À 30 cm
     elles finissaient hors de portée du bras au fond du trait, et il fallait
     faire s'accroupir l'homme jusqu'à 49 cm de hanche — un homme assis sur ses
     talons. 22 cm de bois se scient très bien et se voient tout aussi bien. */
  beamX0: -1.35, beamX1: 1.25,
  beamH: 0.22, beamD: 0.13,
  beamTop: 0.72,
  cutX: 0.62,
  horseA: -1.00, horseB: 0.25,

  /* ── LA LAME. `span` est sa demi-longueur, `travel` sa course : la mécanique
     rend `bx ∈ [−1, +1]`, on multiplie. ⚠️ 36 CM DE COURSE, PAS 90 : un vrai
     trait de passe-partout fait presque toute la longueur de la lame, mais une
     lame qui sort de son trait de 45 cm de chaque côté sort aussi du CADRE, et
     le §4 rappelle qu'un canevas découpe en silence ce qui dépasse. On garde le
     geste, on borne l'amplitude. ── */
  bladeSpan: 0.95, bladeTravel: 0.36,
  bladeW: 0.130,                // hauteur de l'acier
  gripUp: 0.220,                // le milieu de la poignée, au-dessus des dents

  /* ── NOTRE POSTE. ⚠️⚠️ IL N'EST PAS FIXE, ET C'EST LA MESURE QUI L'A IMPOSÉ :
     la poignée s'éloigne de 72 cm entre les deux bouts de sa course, alors qu'un
     bras humain n'en fait que 63. Un poste immobile aurait donc EXIGÉ que nos
     mains lâchent l'outil à chaque trait — ou, pire, que le solveur les borne en
     silence à quinze centimètres du manche (leçon de `render-maire` §3). C'est
     donc NOTRE CORPS qui avance et recule, comme celui de Tristan, et la caméra
     suit — amortie, parce qu'un tangage de 46 cm à une pulsation par seconde
     donne le mal de mer. Ces trois nombres sont ici pour ça, et le `poste` de
     `VIEWS` n'est plus qu'un cadrage nominal (voir `playerPost`).
     ⚠️ ON EST DANS L'AXE DE LA LAME, à `cutX` : c'est la place du scieur, et
     c'est elle qui met Tristan exactement en face, comme Guillaume l'a demandé. */
  eye: [0.62, 1.53, 1.44],
  camSurge: 0.45,               // la part du va-et-vient que la caméra reprend
  /* ⚠️⚠️ RECULÉ ET REMONTÉ APRÈS L'AVOIR JOUÉ : à 52 cm en arrière, la lame
     barrait l'écran d'un bord à l'autre, Tristan était coupé au menton et notre
     avant-bras occupait un quart du cadre. Un cadrage de scie ne se juge pas sur
     une planche de contact — il se juge en tirant. */
  camUp: 0.78, camBack: 1.16,   // l'œil au-dessus et en arrière de l'épaule
  /* ⚠️ LE DÉPORT LATÉRAL, ET IL EST LA CONDITION POUR QU'ON VOIE LA LAME (voir
     `VIEWS.poste`). Il ne déplace QUE l'œil : nos bras, eux, restent dans l'axe
     de la poignée — sinon on regarderait quelqu'un d'autre scier. */
  camSide: -1.02,
  /* ── TRISTAN. `foot*` sont ses appuis, PLANTÉS : ils ne glissent jamais, et
     c'est ce qui rend son effort lisible (ses genoux travaillent au lieu que le
     personnage patine). ── */
  /* ⚠️⚠️ TOUS CES NOMBRES SORTENT D'UN BALAYAGE, PAS D'UN GOÛT. On veut que la
     main demandée reste dans le disque de portée du bras SUR TOUTE la course de
     la lame ET sur toute la profondeur du trait — deux variables, donc un carré
     de cas, donc quelque chose qu'aucune relecture ne sait tenir. `render-
     scierie.mjs` le balaie et refuse le moindre point hors portée : c'est ce
     contrôle-là qui a fait descendre la hanche de 0,96 à 0,86 (un homme à la
     scie a déjà les genoux fléchis) et resserré l'écart des pieds de 72 à 60 cm
     (l'appui arrière sortait de la portée de la JAMBE quand il s'accroupissait
     au fond du trait). */
  manX: 0.62, manZ: -1.52,
  footFrontZ: -1.26, footBackZ: -1.80, footDX: 0.19,
  hipY: 0.86,
  /* la distance du pivot du buste (à 3 cm au-dessus du bassin) à l'épaule. ⚠️ ON
     LA MESURE SUR LES BOÎTES : torse +0,03, cage +0,34, épaule +0,235 = 0,575.
     Elle mentirait au premier remaniement du buste si on l'écrivait « à peu
     près » — c'est très exactement le défaut d'`ARM_FORE`, à un centimètre. */
  chestLen: 0.575, chestPivot: 0.03,
  handGap: 0.070,               // l'écartement des deux mains sur un manche
};
/* ⚠️ LES DEUX LONGUEURS D'OS RESTENT ICI, À CÔTÉ DES BOÎTES QU'ELLES MESURENT —
   c'est la seule chose que `rig3d.js` ne prend pas, et la raison est écrite
   là-bas : une longueur séparée de son os finit par mentir (`ARM_FORE`, d'un
   centimètre, pendant tout un zip). Tristan est un bûcheron : bras plus longs et
   plus épais que le maire. */
const ARM_UP = 0.315, ARM_FORE = 0.315;
const LEG_UP = 0.44, LEG_LOW = 0.43, ANKLE = 0.085;

const COL = {
  wood: 0x8a6134, woodDark: 0x53381d, woodPale: 0xc9a874, woodRaw: 0xdcbd8a,
  /* ⚠️ L'ÉCORCE A ÉTÉ ÉCLAIRCIE DE 0x4a3a2a À 0x6b5540 : au fond d'un hangar et
     sous un rastériseur à ombrage plat, la première valeur rendait des fûts
     NOIRS — cinq tonneaux au lieu de cinq grumes. */
  bark: 0x6b5540, sawdust: 0xd9c08e, floor: 0x7a5c39,
  steel: 0xb9bec6, steelDark: 0x6e747c, iron: 0x3b3f45,
  skin: 0xd0a077, skinDark: 0xa87f5c,
  /* ⚠️⚠️ 2026-09-01 — CHEVEUX GRIS ET PANTALON DE TOILE BLEUE, DEMANDE DIRECTE
     DE GUILLAUME. Le poivre-et-sel (`hair`) est un ton sous la barbe (`beard`,
     plus claire) : un bûcheron grisonnant a la barbe qui blanchit avant les
     cheveux, jamais l'inverse — les inverser aurait l'air d'une erreur de
     teinte plutôt que d'un choix. */
  hair: 0x8c8880, beard: 0xafaba2,
  shirt: 0xa8483a, shirtDark: 0x6e2820,
  /* le carreau du §2 (`texPlaid`) lit CETTE couleur pour la grille, jamais
     `shirtDark` : un carreau buffalo est rouge ET NOIR, pas rouge sur rouge. */
  plaidDark: 0x201713,
  trouser: 0x3c5872, trouserDark: 0x293e51,
  boot: 0x39291d, apron: 0x7d6549,
  ember: 0xff7a2a, lamp: 0xffca7a,
};

/* ═══════════════════════════════════════════════════════════════════════════
   2. LES TEXTURES, PEINTES AU CANEVAS
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ C'EST LE SEUL ENDROIT OÙ UN DÉCOR PROCÉDURAL GAGNE CONTRE UN RENDU
   BLENDER NON CALIBRÉ (§9 de `CLAUDE.md`, mesuré au 426 : écart-type 24,6 contre
   47,7 en référence). Une texture peinte porte son propre contraste ; un aplat
   éclairé par trois lampes n'en a aucun — et le §8 est formel, ce qui compte
   n'est pas la moyenne, c'est l'ÉCART.
   ⚠️ UN ATELIER DE BOIS EST FAIT DE FIBRE : sans veinage, huit murs de planches
   sont huit rectangles bruns. Le veinage est donc la texture la plus travaillée
   du fichier, et elle sert cinq fois (sol, murs, madrier, établi, piles).
   ═══════════════════════════════════════════════════════════════════════════ */
function cv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")];
}
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
function rnd(seed) { let s = seed | 0 || 1; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function texOf(THREE, c, rx, ry) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx || 1, ry || 1);
  t.anisotropy = 4;
  return t;
}

/* ── LE VEINAGE. Des cernes qui ondulent le long de la planche, plus quelques
   nœuds. ⚠️ LA PÉRIODE PRIME SUR LES DÉTAILS (§4, payé au 434) : le motif fait
   256×256 et doit BOUCLER, sinon on voit la couture avant de voir le bois. Les
   cernes sont donc des sinusoïdes en `2π·k·x/W`, qui bouclent par construction,
   et les nœuds sont repeints à ±W. ── */
function texGrain(THREE, base, dark, seed, boards) {
  const W = 256, H = 256;
  const [c, g] = cv(W, H);
  const r = rnd(seed);
  g.fillStyle = hex(base); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const y0 = r() * H, k = 1 + ((r() * 3) | 0), amp = 3 + r() * 9, ph = r() * 6.283;
    g.strokeStyle = `rgba(${(dark >> 16) & 255},${(dark >> 8) & 255},${dark & 255},${0.10 + r() * 0.22})`;
    g.lineWidth = 0.7 + r() * 2.2;
    g.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const y = y0 + Math.sin((x / W) * 6.283 * k + ph) * amp;
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 5; i++) {          // les nœuds
    const nx = r() * W, ny = r() * H, rad = 3 + r() * 6;
    for (const dx of [-W, 0, W]) {
      for (let k = 4; k >= 1; k--) {
        g.strokeStyle = `rgba(${(dark >> 16) & 255},${(dark >> 8) & 255},${dark & 255},0.5)`;
        g.lineWidth = 1;
        g.beginPath(); g.ellipse(nx + dx, ny, rad * k * 0.42, rad * k * 0.26, 0.3, 0, 6.283); g.stroke();
      }
    }
  }
  if (boards) {                           // les joints entre planches
    g.fillStyle = "rgba(0,0,0,0.34)";
    for (let i = 0; i < boards; i++) g.fillRect(0, Math.round(i * H / boards), W, 2);
  }
  return texOf(THREE, c, 1, 1);
}

/* ── LA CHEMISE À CARREAUX. ⚠️⚠️ 2026-09-01 — DEMANDE DIRECTE DE GUILLAUME :
   « une vraie chemise de bûcheron ». Une chemise rouge UNIE n'en est pas une —
   c'est le carreau buffalo (deux couleurs, une grille large) qui la nomme, et
   c'est la même règle que le madrier pâle du §7 : peindre ce qui rend la chose
   reconnaissable plutôt que de compter sur l'éclairage pour le dire.
   ⚠️ LA GRILLE BOUCLE PAR CONSTRUCTION (bandes à espacement entier), donc pas
   de couture visible où le repeat recommence — la période prime sur les
   détails (§4, payé au 434). Une variation fine par-dessus (le grain du tissu)
   évite l'aplat plastique qu'aurait un carreau parfaitement net. */
function texPlaid(THREE, base, dark) {
  const W = 128, H = 128, cell = 32;
  const [c, g] = cv(W, H);
  const r = rnd(6301);
  g.fillStyle = hex(base); g.fillRect(0, 0, W, H);
  /* le halo qui assombrit le rouge de part et d'autre de chaque bande noire —
     c'est ce qui lit comme un TISSAGE et pas comme deux calques superposés */
  g.fillStyle = `rgba(${(dark >> 16) & 255},${(dark >> 8) & 255},${dark & 255},0.22)`;
  for (let p = 0; p <= W; p += cell) { g.fillRect(p - 6, 0, 12, H); g.fillRect(0, p - 6, W, 12); }
  /* les bandes noires elles-mêmes, franches */
  g.fillStyle = `rgba(${(dark >> 16) & 255},${(dark >> 8) & 255},${dark & 255},0.92)`;
  for (let p = 0; p <= W; p += cell) { g.fillRect(p - 3, 0, 6, H); g.fillRect(0, p - 3, W, 6); }
  /* le grain du tissu : un bruit fin, jamais assez fort pour casser la grille */
  for (let i = 0; i < 700; i++) {
    const x = r() * W, y = r() * H;
    g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.04)";
    g.fillRect(x, y, 1, 1);
  }
  return texOf(THREE, c, 2, 2);
}

/* ── LE BOUT DE FIL : le bois de bout, avec ses cernes concentriques. Il ne sert
   qu'aux extrémités du madrier et des grumes, mais c'est LUI qui dit qu'une
   grume est un arbre coupé et pas un tuyau brun. ── */
function texEnd(THREE, seed) {
  const S = 128;
  const [c, g] = cv(S, S);
  const r = rnd(seed);
  g.fillStyle = hex(COL.woodRaw); g.fillRect(0, 0, S, S);
  const cx = S * (0.4 + r() * 0.2), cy = S * (0.4 + r() * 0.2);
  for (let i = 14; i >= 1; i--) {
    g.strokeStyle = `rgba(120,84,44,${0.12 + (i % 2) * 0.16})`;
    g.lineWidth = 1 + r() * 1.6;
    g.beginPath(); g.ellipse(cx, cy, i * 4.6, i * 4.0, 0.4, 0, 6.283); g.stroke();
  }
  for (let i = 0; i < 3; i++) {           // les fentes de séchage
    g.strokeStyle = "rgba(60,40,20,0.55)"; g.lineWidth = 1.6;
    const a = r() * 6.283;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * S, cy + Math.sin(a) * S); g.stroke();
  }
  return texOf(THREE, c, 1, 1);
}

/* ── L'ÉCORCE, pour les grumes empilées. ── */
function texBark(THREE) {
  const W = 128, H = 128;
  const [c, g] = cv(W, H);
  const r = rnd(7717);
  g.fillStyle = hex(COL.bark); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = r() * H, h = 6 + r() * 22;
    g.fillStyle = r() < 0.5 ? "rgba(28,20,12,0.55)" : "rgba(120,100,78,0.30)";
    g.fillRect(x, y, 1 + r() * 2, h);
    if (x > W - 4) g.fillRect(x - W, y, 1 + r() * 2, h);
  }
  return texOf(THREE, c, 3, 1);
}

/* ── LA SCIURE DU SOL. ⚠️ ELLE EST PEINTE EN PAVÉ DE 4×4 (règle du 434) : une
   tuile de bruit qui se répète tous les 16 px dessine sa grille avant son
   grain. Ici la tuile fait 256 et le semis est irrégulier à cette échelle. ── */
function texFloor(THREE) {
  const W = 256, H = 256;
  const [c, g] = cv(W, H);
  const r = rnd(4242);
  g.fillStyle = hex(COL.floor); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) {           // les lames du plancher
    g.fillStyle = "rgba(0,0,0,0.30)"; g.fillRect(0, i * 32, W, 2);
    g.fillStyle = "rgba(255,235,200,0.05)"; g.fillRect(0, i * 32 + 2, W, 3);
  }
  for (let i = 0; i < 900; i++) {         // la sciure
    const x = r() * W, y = r() * H;
    g.fillStyle = `rgba(${(COL.sawdust >> 16) & 255},${(COL.sawdust >> 8) & 255},${COL.sawdust & 255},${0.10 + r() * 0.45})`;
    g.fillRect(x, y, 1 + r() * 2.4, 1 + r() * 1.6);
  }
  return texOf(THREE, c, 4, 4);
}

/* ── L'ACIER DE LA LAME : un poli brossé, avec la trace du bois qui l'a
   chauffée près des dents. ── */
function texSteel(THREE) {
  const W = 128, H = 32;
  const [c, g] = cv(W, H);
  const r = rnd(913);
  g.fillStyle = hex(COL.steel); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.20)" : "rgba(70,80,92,0.22)";
    g.fillRect(r() * W, r() * H, 6 + r() * 40, 1);
  }
  const grd = g.createLinearGradient(0, H * 0.55, 0, H);
  grd.addColorStop(0, "rgba(150,110,60,0)");
  grd.addColorStop(1, "rgba(150,110,60,0.55)");
  g.fillStyle = grd; g.fillRect(0, H * 0.55, W, H * 0.45);
  return texOf(THREE, c, 1, 1);
}

/* ── LE GRAIN DE POUSSIÈRE. Un disque flou, une seule fois, réutilisé par les
   deux systèmes de particules (la sciure et les motes dans la lumière). ── */
function texMote(THREE) {
  const S = 32;
  const [c, g] = cv(S, S);
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, "rgba(255,240,214,1)");
  grd.addColorStop(0.45, "rgba(255,232,190,0.55)");
  grd.addColorStop(1, "rgba(255,225,180,0)");
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LES FABRIQUES PARTAGÉES
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ ON PARTAGE GÉOMÉTRIES ET MATÉRIAUX PAR CLÉ, exactement comme le bureau du
   maire : une charpente, c'est cent poutres, donc cent `BoxGeometry` et cent
   matériaux pour un seul cube. Le cache ramène l'atelier à une quarantaine de
   ressources — et c'est ce qui le rend ouvrable sur une tablette, où l'on vient
   de mesurer que le contexte est déjà chiche (1 829 canevas 2D au chargement).
   ═══════════════════════════════════════════════════════════════════════════ */
function maker(THREE, root, junk) {
  const geo = new Map(), mat = new Map();
  const G = (k, make) => { let g = geo.get(k); if (!g) { g = make(); geo.set(k, g); junk.push(g); } return g; };
  const M = (k, make) => { let m = mat.get(k); if (!m) { m = make(); mat.set(k, m); junk.push(m); } return m; };

  const lam = (col, o) => M("l" + col + JSON.stringify(o || 0), () => new THREE.MeshLambertMaterial({ color: col, ...(o || {}) }));
  const pho = (col, shin, o) => M("p" + col + shin + JSON.stringify(o || 0), () => new THREE.MeshPhongMaterial({ color: col, shininess: shin, specular: 0x555b63, ...(o || {}) }));
  const texMat = (key, tex, o) => M("t" + key, () => new THREE.MeshLambertMaterial({ map: tex, ...(o || {}) }));

  const boxG = (w, h, d) => G(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cylG = (rt, rb, h, seg) => G(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg || 12));
  const sphG = (r, seg) => G(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg || 12, (seg || 12) / 2));
  const plnG = (w, h) => G(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));

  const at = (obj, x, y, z, rx, ry, rz, parent) => {
    obj.position.set(x || 0, y || 0, z || 0);
    if (rx || ry || rz) obj.rotation.set(rx || 0, ry || 0, rz || 0);
    (parent || root).add(obj);
    return obj;
  };
  const box = (w, h, d, m, x, y, z, rx, ry, rz, parent) => at(new THREE.Mesh(boxG(w, h, d), m), x, y, z, rx, ry, rz, parent);
  const cyl = (rt, rb, h, m, x, y, z, rx, ry, rz, parent, seg) => at(new THREE.Mesh(cylG(rt, rb, h, seg), m), x, y, z, rx, ry, rz, parent);
  const sph = (r, m, x, y, z, parent, seg) => at(new THREE.Mesh(sphG(r, seg), m), x, y, z, 0, 0, 0, parent);
  const pln = (w, h, m, x, y, z, rx, ry, rz, parent) => at(new THREE.Mesh(plnG(w, h), m), x, y, z, rx, ry, rz, parent);
  const grp = (x, y, z, parent) => at(new THREE.Group(), x, y, z, 0, 0, 0, parent);
  return { lam, pho, texMat, box, cyl, sph, pln, grp, at };
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. LE HANGAR
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ LA CHARPENTE EST APPARENTE, ET C'EST LE CHOIX QUI FAIT LE LIEU. Un
   atelier de bûcheron dont on ne voit pas la charpente est un garage : ce qu'on
   vient regarder, c'est justement l'ouvrage de celui qui travaille le bois.
   Trois fermes, entraits, poinçons, contre-fiches et pannes — ça coûte une
   trentaine de boîtes partagées et ça remplit tout le haut du cadre, qui serait
   sinon un plafond vide au-dessus d'une scène cadrée bas.
   ⚠️ LES MURS SONT À CLAIRE-VOIE : une lame sur deux laisse un jour de deux
   centimètres. C'est ce qui autorise les rais de lumière du §6 — et un hangar
   fermé hermétiquement n'existe pas.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildShed(THREE, K, tex) {
  const { lam, texMat, box, cyl, pln, grp } = K;
  const S = SHOP, W = S.x1 - S.x0, D = S.z1 - S.z0, cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;
  const mWood = texMat("grain", tex.grain);
  const mBeam = lam(COL.woodDark);
  const mFloor = texMat("floor", tex.floor);

  const shed = grp(0, 0, 0);
  pln(W, D, mFloor, cx, 0, cz, -Math.PI / 2, 0, 0, shed);

  /* ── LES QUATRE MURS, en bardage vertical. ⚠️ ON PEINT L'INTÉRIEUR, DONC LES
     PLANS REGARDENT VERS LE CENTRE : une face à l'envers disparaît (le
     `BackSide` n'est pas éclairé de la même façon) et on croit à un trou. ── */
  const wall = (w, x, y, z, ry) => pln(w, S.wallH, mWood, x, y, z, 0, ry, 0, shed);
  wall(W, cx, S.wallH / 2, S.z0, 0);
  wall(W, cx, S.wallH / 2, S.z1, Math.PI);
  wall(D, S.x0, S.wallH / 2, cz, Math.PI / 2);
  wall(D, S.x1, S.wallH / 2, cz, -Math.PI / 2);

  /* les poteaux d'angle et les sablières : ce sont eux qui donnent l'échelle */
  for (const px of [S.x0, S.x1]) for (const pz of [S.z0, S.z1])
    box(0.18, S.wallH, 0.18, mBeam, px + (px < 0 ? 0.09 : -0.09), S.wallH / 2, pz + (pz < 0 ? 0.09 : -0.09), 0, 0, 0, shed);
  for (const pz of [S.z0 + 0.09, S.z1 - 0.09]) box(W, 0.20, 0.17, mBeam, cx, S.wallH - 0.10, pz, 0, 0, 0, shed);
  for (const px of [S.x0 + 0.09, S.x1 - 0.09]) box(0.17, 0.20, D, mBeam, px, S.wallH - 0.10, cz, 0, 0, 0, shed);

  /* ── LES TROIS FERMES. Un entrait, deux arbalétriers, un poinçon, deux
     contre-fiches. ⚠️ L'ANGLE DES ARBALÉTRIERS SE DÉDUIT DU FAÎTAGE ET DE LA
     DEMI-PORTÉE, il n'est pas réglé : une pente écrite à la main ne retomberait
     plus sur le faîtage le jour où l'on élargit le hangar. ── */
  const rise = S.ridge - S.wallH, half = W / 2;
  const raft = Math.hypot(half, rise), slope = Math.atan2(rise, half);
  for (const fz of [S.z0 + 1.5, cz, S.z1 - 1.5]) {
    box(W, 0.22, 0.20, mBeam, cx, S.wallH + 0.02, fz, 0, 0, 0, shed);                    // entrait
    box(0.19, rise, 0.19, mBeam, cx, S.wallH + rise / 2, fz, 0, 0, 0, shed);             // poinçon
    for (const sx of [-1, 1]) {
      box(raft, 0.20, 0.18, mBeam, cx + sx * half / 2, S.wallH + rise / 2, fz, 0, 0, -sx * slope, shed);
      box(1.42, 0.15, 0.15, mBeam, cx + sx * 0.62, S.wallH + rise * 0.42, fz, 0, 0, -sx * 0.78, shed);  // contre-fiche
    }
  }
  /* les pannes, et la couverture : un plan par versant, en dessous des pannes */
  for (let i = 1; i <= 3; i++) {
    const f = i / 4, y = S.wallH + rise * (1 - f), x = half * f;
    for (const sx of [-1, 1]) box(0.14, 0.14, D, mBeam, cx + sx * x, y + 0.10, cz, 0, 0, 0, shed);
  }
  for (const sx of [-1, 1])
    pln(raft, D, lam(0x2c2620, { side: THREE.DoubleSide }), cx + sx * half / 2, S.wallH + rise / 2 + 0.18, cz,
        -Math.PI / 2, 0, -sx * slope, shed).rotation.set(Math.PI / 2, sx * slope, 0);

  /* ── LA GRANDE OUVERTURE, côté ouest, et c'est elle qui éclaire toute la
     scène. ⚠️ ELLE EST DERRIÈRE TRISTAN ET SUR SA GAUCHE : à contre-jour, son
     visage est dans une ombre douce, et c'est cette ombre qui rend un visage
     lisible (§8 — l'écart, jamais la moyenne ; le maire est éclairé pareil et
     pour la même raison). ── */
  const open = grp(S.x0 + 0.02, 0, -1.10, shed);
  pln(2.60, 1.90, lam(0xdfe9f2, { side: THREE.DoubleSide }), 0, 1.55, 0, 0, Math.PI / 2, 0, open);
  box(0.10, 0.12, 2.72, mBeam, 0.06, 2.52, 0, 0, 0, 0, open);
  box(0.10, 0.12, 2.72, mBeam, 0.06, 0.56, 0, 0, 0, 0, open);
  for (const oz of [-1.30, 1.30]) box(0.10, 2.10, 0.12, mBeam, 0.06, 1.55, oz, 0, 0, 0, open);

  return { shed, slope, raft };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. CE QUI PEUPLE L'ATELIER
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ « PARFAITEMENT TRAITÉ » (Guillaume) NE VEUT PAS DIRE « CHARGÉ ». Chaque
   objet ici répond à une question que le joueur se pose en entrant : d'où vient
   le bois (les grumes), où il va (les piles), avec quoi on le travaille
   (l'établi et le mur d'outils), pourquoi il fait chaud (le poêle), pourquoi on
   y voit (la lanterne). Un objet qui ne répond à aucune question est du
   remplissage, et le §17.6 en nomme un qui devra exister plus tard — les piles
   de planches où saute la sixième sœur. Elles sont là, à leur place.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildProps(THREE, K, tex) {
  const { lam, pho, texMat, box, cyl, sph, pln, grp } = K;
  const S = SHOP;
  const mWood = texMat("grain", tex.grain);
  const mPale = texMat("grainPale", tex.grainPale);
  const mBeam = lam(COL.woodDark);
  const mBark = texMat("bark", tex.bark);
  const mEnd = texMat("end", tex.end);
  const mIron = pho(COL.iron, 24);
  const mSteel = pho(COL.steel, 88);

  const props = grp(0, 0, 0);

  /* ── LES DEUX CHEVALETS. Quatre pieds écartés, une traverse : c'est le meuble
     le plus simple du fichier et le seul qui porte quelque chose. ── */
  /* ⚠️ LE PLATEAU DU CHEVALET EST **DÉRIVÉ** DU MADRIER, jamais réglé : il porte
     le bois, donc sa hauteur EST le dessous du bois. Écrit à la main, il aurait
     laissé le madrier en lévitation le jour où on l'a descendu de 14 cm — et ça
     s'est produit dans cette même passe. */
  const topY = SHOP.beamTop - SHOP.beamH, legH = topY - 0.10;
  const horse = (hx) => {
    const g = grp(hx, 0, -0.02, props);
    box(0.14, 0.10, 1.20, mBeam, 0, topY - 0.05, 0, 0, 0, 0, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      box(0.08, legH, 0.08, mBeam, sx * 0.16, legH / 2, sz * 0.42, sz * 0.20, 0, -sx * 0.20, g);
    box(0.06, 0.06, 0.90, mBeam, 0, legH * 0.42, 0, 0, 0, 0, g);
    return g;
  };
  horse(S.horseA); horse(S.horseB);

  /* ── LES GRUMES, contre le mur du fond. Le bois AVANT. ── */
  const logs = grp(-2.55, 0, -3.55, props);
  const logAt = (lx, ly, r) => {
    const g = grp(lx, ly, 0, logs);
    cyl(r, r, 3.10, mBark, 0, 0, 0, 0, 0, Math.PI / 2, g, 14);
    for (const sx of [-1, 1]) cyl(r * 0.99, r * 0.99, 0.02, mEnd, sx * 1.55, 0, 0, 0, 0, Math.PI / 2, g, 14);
    return g;
  };
  logAt(-0.34, 0.26, 0.26); logAt(0.22, 0.26, 0.26); logAt(0.76, 0.24, 0.24);
  logAt(-0.06, 0.74, 0.24); logAt(0.48, 0.72, 0.23);
  box(0.10, 0.62, 0.10, mBeam, -0.70, 0.31, 0, 0, 0, 0, logs);   // les tasseaux qui les calent
  box(0.10, 0.62, 0.10, mBeam, 1.12, 0.31, 0, 0, 0, 0, logs);

  /* ── LES PILES DE PLANCHES. Le bois APRÈS. ⚠️ Elles sont empilées sur baguettes
     (« en pile aérée »), ce qui est comment on sèche du bois — et ce détail-là
     est ce qui fait qu'un tas de planches ressemble à un stock plutôt qu'à une
     palette. ── */
  const stack = (sx, sz, ry, n) => {
    const g = grp(sx, 0, sz, props);
    g.rotation.y = ry;
    for (let i = 0; i < n; i++) {
      const y = 0.10 + i * 0.075;
      box(2.20, 0.045, 0.90, mPale, 0, y, 0, 0, 0, 0, g);
      if (i < n - 1) for (const bx of [-0.80, 0, 0.80]) box(0.05, 0.028, 0.90, mBeam, bx, y + 0.036, 0, 0, 0, 0, g);
    }
    box(0.12, 0.10, 1.00, mBeam, -0.85, 0.05, 0, 0, 0, 0, g);
    box(0.12, 0.10, 1.00, mBeam, 0.85, 0.05, 0, 0, 0, 0, g);
    return g;
  };
  stack(2.85, -2.70, 0.10, 9);
  stack(3.30, 2.35, Math.PI / 2 - 0.12, 7);

  /* ── L'ÉTABLI ET LE MUR D'OUTILS. ── */
  const bench = grp(-3.05, 0, 1.85, props);
  bench.rotation.y = Math.PI / 2;
  box(2.30, 0.11, 0.70, mWood, 0, 0.85, 0, 0, 0, 0, bench);
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    box(0.11, 0.80, 0.11, mBeam, sx * 1.02, 0.40, sz * 0.26, 0, 0, 0, bench);
  box(2.10, 0.09, 0.30, mBeam, 0, 0.28, 0, 0, 0, 0, bench);
  box(0.16, 0.20, 0.16, mIron, -0.92, 0.99, 0.24, 0, 0, 0, bench);          // l'étau
  cyl(0.018, 0.018, 0.34, mSteel, -0.92, 0.99, 0.42, Math.PI / 2, 0, 0, bench, 8);
  /* le tas de copeaux au pied de l'établi : trois demi-sphères aplaties, et
     c'est assez — un tas de sciure n'a pas de forme, il a une couleur */
  for (const [dx, dz, r] of [[-0.5, 0.46, 0.30], [0.15, 0.50, 0.22], [0.62, 0.42, 0.17]])
    sph(r, lam(COL.sawdust), dx, 0.02, dz, bench, 10).scale.set(1, 0.22, 1);

  /* les outils au mur, sur leur crémaillère */
  const rack = grp(-4.42, 1.72, 1.85, props);
  rack.rotation.y = Math.PI / 2;
  box(2.10, 0.08, 0.06, mBeam, 0, 0.42, 0, 0, 0, 0, rack);
  const axe = (ax, len, headW) => {
    const g = grp(ax, 0, 0.05, rack);
    cyl(0.022, 0.026, len, texMat("grainPale", tex.grainPale), 0, -len / 2, 0, 0, 0, 0.10, g, 8);
    box(headW, 0.15, 0.05, mIron, ax > 0 ? 0.02 : -0.02, 0.02, 0, 0, 0, 0, g);
    return g;
  };
  axe(-0.72, 0.66, 0.20); axe(-0.24, 0.52, 0.15); axe(0.66, 0.78, 0.24);
  /* une seconde scie, pendue : elle dit que celle qu'on tient est un OUTIL et
     pas un accessoire de scène */
  const saw2 = grp(0.20, 0.10, 0.04, rack);
  box(0.90, 0.13, 0.004, mSteel, 0, -0.30, 0, 0, 0, 0.12, saw2);
  box(0.10, 0.16, 0.05, mWood, -0.47, -0.24, 0, 0, 0, 0.12, saw2);

  /* ── LE POÊLE. ⚠️ IL EST LÀ POUR SA LUMIÈRE, pas pour son dessin : c'est la
     seule source chaude au ras du sol, et c'est elle qui empêche le bas du
     décor de tomber dans le bleu du contre-jour. ── */
  const stove = grp(3.55, 0, -0.35, props);
  cyl(0.32, 0.36, 0.86, mIron, 0, 0.43, 0, 0, 0, 0, stove, 12);
  cyl(0.09, 0.09, 2.20, mIron, 0, 1.96, 0, 0, 0, 0, stove, 8);
  const door = box(0.30, 0.26, 0.06, lam(COL.ember), 0, 0.42, 0.33, 0, 0, 0, stove);
  cyl(0.40, 0.40, 0.03, mIron, 0, 0.88, 0, 0, 0, 0, stove, 12);
  for (const [bx, bz] of [[-0.52, 0.30], [-0.44, 0.02], [-0.60, -0.20]])
    cyl(0.055, 0.06, 0.42, mBark, bx, 0.21, bz, 0, 0, 0.25, stove, 8);      // les bûches à côté

  /* ── LA LANTERNE, pendue à l'entrait au-dessus du madrier. ── */
  const lant = grp(-0.55, 2.36, 0.30, props);
  cyl(0.006, 0.006, 0.56, mIron, 0, 0.28, 0, 0, 0, 0, lant, 6);
  box(0.15, 0.20, 0.15, lam(COL.lamp, { transparent: true, opacity: 0.92 }), 0, 0, 0, 0, 0, 0, lant);
  box(0.17, 0.03, 0.17, mIron, 0, 0.11, 0, 0, 0, 0, lant);
  box(0.17, 0.03, 0.17, mIron, 0, -0.11, 0, 0, 0, 0, lant);

  return { props, stove: door, lantern: lant };
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LA LAME — ET C'EST LE MORCEAU QUI RÉPOND À « PAS TROP RIGIDE »
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ ELLE EST SEGMENTÉE, ET C'EST LA SEULE FAÇON QU'ELLE PLIE. Une lame
   d'un seul tenant ne peut que translater : quoi qu'on fasse de sa matière, elle
   restera une barre, et « la scie doit pas être trop rigide » restera une
   demande non tenue. Vingt segments coûtent vingt matrices par image — rien —
   et donnent trois choses qu'on ne peut pas simuler autrement : le VENTRE quand
   elle est coincée, le FOUET au départ d'un trait, et l'AFFAISSEMENT quand on
   laisse le mou s'installer (`s.slack`, la grandeur même qui ferme la fenêtre
   parfaite dans `scierie.js` — le joueur voit donc EXACTEMENT ce qui le juge).
   ⚠️ LES DEUX BOUTS SONT TENUS, donc la déformée s'annule aux extrémités :
   `1 − u²`. Une courbe qui ne s'annule pas aux poignées ferait une lame qui
   sort de ses mains, et c'est le genre de défaut qu'on ne voit qu'en jouant.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️⚠️ LA HAUTEUR DE LA POIGNÉE EST DÉFINIE **UNE FOIS**, ICI, ET TROIS
   ENDROITS LA LISENT : le dessin de la lame, l'inclinaison de Tristan, et le
   banc. Le premier jet la recalculait à la main dans `tristanLean` (« beamTop +
   gripUp »), en oubliant l'épaisseur de l'acier — un centimètre et demi d'écart
   qui ne casse rien et qui fausse l'inclinaison sur toute la course. C'est
   exactement le §8 : *un paramètre qui double un autre paramètre est une
   divergence en attente.* */
export function gripHeight(cut) {
  const S = SHOP;
  return S.beamTop - Math.max(0, Math.min(1, cut)) * S.beamH + S.bladeW / 2 + 0.008 + S.gripUp;
}

export const BLADE_SEGS = 20;
/* ⚠️ PURE ET EXPORTÉE POUR LE BANC : `render-scierie.mjs` vérifie que la
   déformée s'annule aux poignées et qu'elle reste dans un fuseau raisonnable.
   Une courbe qu'aucun banc ne peut appeler est une courbe qui vieillit (§4). */
export function bladeFlex(u, f) {
  const s = 1 - u * u;
  return {
    x: s * ((f.bow || 0) + (f.whip || 0) * Math.sin((f.phase || 0) + u * 3.1)),
    y: -s * (f.sag || 0),
  };
}

function buildBlade(THREE, K, tex) {
  const { lam, pho, texMat, box, cyl, grp } = K;
  const S = SHOP;
  const mSteel = texMat("steel", tex.steel);
  const mTooth = pho(COL.steelDark, 60);
  const mGrip = texMat("grainPale", tex.grainPale);
  const mIron = pho(COL.iron, 24);

  /* `blade` porte la TRANSLATION du trait (z) et la descente dans le trait de
     scie (y) ; les segments ne portent QUE la déformée. Deux responsabilités,
     deux niveaux — sinon un réglage de flexion déplace la lame entière. */
  const blade = grp(S.cutX, 0, 0);
  const segs = [];
  const segLen = (S.bladeSpan * 2) / BLADE_SEGS;
  for (let i = 0; i < BLADE_SEGS; i++) {
    const g = grp(0, 0, 0, blade);
    box(0.0045, S.bladeW, segLen * 1.04, mSteel, 0, 0, 0, 0, 0, 0, g);
    /* les dents : deux par segment, alternées comme un vrai avoyage — c'est ce
       qui accroche la lumière et fait lire « scie » plutôt que « plaque » */
    for (let k = 0; k < 2; k++)
      box(0.012, 0.030, segLen * 0.34, mTooth,
          (k % 2 ? 1 : -1) * 0.004, -S.bladeW / 2 - 0.008, (k - 0.5) * segLen * 0.5, 0, 0, 0, g);
    segs.push(g);
  }

  /* ── LES DEUX POIGNÉES. ⚠️ ELLES SONT FILLES DE `blade` : leur position est
     donc DÉDUITE de la lame, jamais recopiée. C'est la règle qui garantit que
     les mains de Tristan et les nôtres ne peuvent pas se décrocher de l'outil —
     `applySaw` va chercher leur point de préhension par `getWorldPosition`, il
     ne le recalcule pas. ── */
  const grip = (sz) => {
    const g = grp(0, 0, sz * S.bladeSpan, blade);
    box(0.055, 0.30, 0.045, mIron, 0, 0.10, 0, 0, 0, 0, g);              // la platine
    cyl(0.030, 0.032, 0.215, mGrip, 0, S.gripUp, 0, 0, 0, 0, g, 10);     // le manche
    cyl(0.040, 0.040, 0.022, mIron, 0, S.gripUp + 0.118, 0, 0, 0, 0, g, 10);
    cyl(0.040, 0.040, 0.022, mIron, 0, S.gripUp - 0.118, 0, 0, 0, 0, g, 10);
    const hold = grp(0, S.gripUp, 0, g);                                  // le point de préhension
    return { g, hold };
  };
  const gripUs = grip(1), gripHim = grip(-1);
  return { blade, segs, segLen, gripUs, gripHim };
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. LE MADRIER, SON TRAIT DE SCIE ET SA CHUTE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ LE TRAIT NE SE DESSINE PAS, IL SE CREUSE : on ne peint pas une ligne
   noire sur une boîte, on RACCOURCIT la chute par le haut et on descend une
   fente sombre. Un trait peint resterait plat sous n'importe quel angle, et la
   caméra est libre. C'est la même leçon que l'ensablement du fleuve
   (2026-08-31) : *la profondeur est une géométrie, pas une teinte.*
   ═══════════════════════════════════════════════════════════════════════════ */
function buildBeam(THREE, K, tex) {
  const { lam, texMat, box, grp } = K;
  const S = SHOP;
  /* ⚠️⚠️ LE MADRIER EST EN BOIS **PÂLE**, ET C'EST LA DÉCISION LA PLUS RENTABLE
     DU DÉCOR. Peint dans le même brun que la charpente, les chevalets, le
     plancher et les murs, il DISPARAISSAIT : la planche de contact montrait un
     atelier brun uniforme dans lequel on cherchait la chose à scier. Un madrier
     qu'on vient d'équarrir est clair — c'est vrai, et c'est ce qui le détache. */
  const mWood = texMat("grainPale", tex.grainPale);
  const mEnd = texMat("end", tex.end);

  const beam = grp(0, 0, 0);
  const cy = S.beamTop - S.beamH / 2;
  const lenL = S.cutX - S.beamX0, lenR = S.beamX1 - S.cutX;
  /* la partie tenue */
  box(lenL, S.beamH, S.beamD, mWood, S.beamX0 + lenL / 2, cy, 0, 0, 0, 0, beam);
  box(0.004, S.beamH, S.beamD, mEnd, S.beamX0 - 0.002, cy, 0, 0, 0, 0, beam);
  /* ── LA CHUTE. Elle pivote sur l'arête du trait : c'est ce point-là qui la
     fait BASCULER plutôt que tomber tout droit, et une chute qui tombe tout
     droit ressemble à un objet supprimé. ── */
  const dropPivot = grp(S.cutX, S.beamTop, 0, beam);
  const drop = grp(0, 0, 0, dropPivot);
  box(lenR, S.beamH, S.beamD, mWood, lenR / 2 + 0.004, -S.beamH / 2, 0, 0, 0, 0, drop);
  box(0.004, S.beamH, S.beamD, mEnd, lenR + 0.006, -S.beamH / 2, 0, 0, 0, 0, drop);
  /* la fente : elle descend avec `cut`, et elle est très légèrement plus large
     que la lame — un trait de scie fait toujours plus large que l'acier */
  /* ⚠️ 2 CM DE LARGE, PAS 1,4 MM DE PLUS QUE LA LAME. Un vrai trait de scie fait
     l'épaisseur de l'avoyage, soit trois millimètres — et trois millimètres de
     noir à deux mètres, ça n'existe pas. On triche sur la largeur parce que ce
     qu'on doit lire n'est pas l'épaisseur du trait, c'est sa PROFONDEUR. */
  const kerf = box(0.020, S.beamH, S.beamD * 1.03, lam(0x24170c), S.cutX, cy, 0, 0, 0, 0, beam);
  return { beam, drop, dropPivot, kerf, lenR };
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. TRISTAN
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ « ANATOMIQUEMENT COHÉRENT » N'EST PAS UNE QUESTION DE DÉTAIL, C'EST UNE
   QUESTION DE CHAÎNE. Le maire l'a payé le 2026-08-31 : sa posture debout levait
   le BUSTE sans les jambes et fabriquait un tronc quatorze centimètres au-dessus
   de ses propres cuisses — *une mise en scène qui demande un geste que le
   squelette ne sait pas faire ne se règle pas, elle se construit.*
   Ici le geste demandé est le plus exigeant du dépôt : un homme qui TIRE. Donc :

   · SES PIEDS SONT PLANTÉS, en monde, et ils ne bougent jamais. Ce sont ses
     JAMBES qui sont résolues en cinématique inverse vers eux (le même solveur
     que les bras, `rig3d.js`). C'est ce qui fait que ses genoux travaillent au
     lieu que le personnage patine — et un personnage qui patine est le premier
     défaut qu'on voit sur un effort.
   · SES MAINS SONT SUR LA POIGNÉE, toujours, parce qu'elles y sont mises par
     cinématique inverse à partir de la position RÉELLE de la poignée (elle-même
     fille de la lame, elle-même fille de `s.bx`). Aucune valeur n'est recopiée,
     donc rien ne peut se décrocher.
   · SON BASSIN AVANCE ET DESCEND, ET SON BUSTE S'INCLINE, en fonction de ce que
     la poignée EXIGE — pas d'une courbe décorative. `tristanLean` résout
     l'inclinaison pour que l'épaule tombe à bonne distance de la main : c'est ce
     calcul, et lui seul, qui garantit qu'on ne verra jamais un bras tendu comme
     un piquet ni un coude replié dans une poitrine.
   · IL A UN BASSIN. Le maire n'en avait pas, et une fente de quinze millimètres
     traversait l'homme à la taille sur toutes les poses.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildTristan(THREE, K, tex) {
  const { lam, texMat, box, cyl, sph, grp } = K;
  /* ⚠️⚠️ 2026-09-01 — LA CHEMISE EST UN TISSU, PAS UN APLAT : `texPlaid` (§2)
     peint la grille rouge et noire du carreau buffalo, et `mShirt` la porte
     désormais partout où elle est lue — reins, cage, épaules, manches. Le
     col roulé et les bottes restent des ACCENTS unis (`mShirtD`) : un col qui
     porte aussi le carreau se noierait dans le torse au lieu de le border. */
  const mShirt = texMat("plaid", tex.plaid), mShirtD = lam(COL.shirtDark);
  const mTrou = lam(COL.trouser), mTrouD = lam(COL.trouserDark);
  const mSkin = lam(COL.skin), mBoot = lam(COL.boot);
  const mApron = lam(COL.apron);
  /* les bretelles : du CUIR, pas de la toile de pantalon — sinon elles se
     fondent dans le jean et ne se lisent plus comme un objet à part */
  const mBrace = lam(0x4a3624);

  /* `man` ne bouge que par sa POSITION (le bassin) ; il ne tourne jamais, ce
     sont ses membres qui travaillent. Un homme qu'on fait pivoter en bloc
     emporte ses pieds avec lui. */
  const man = grp(SHOP.manX, SHOP.hipY, SHOP.manZ);

  /* ── LE BASSIN ── */
  box(0.44, 0.17, 0.30, mTrouD, 0, -0.03, 0, 0, 0, 0, man);

  /* ── LES JAMBES, résolues vers deux pieds plantés. Trois pivots : hanche,
     genou, cheville. Le pied lui-même est reposé à plat par `applySaw`.
     ⚠️⚠️ 2026-09-01 — ÉPAISSIES DE 20 %, ET C'EST LA CORRECTION DEMANDÉE PAR
     GUILLAUME (« gros problème de proportions, le buste par rapport aux
     jambes »). La LONGUEUR jambe/buste était déjà juste (mesuré : 0,87 m de
     jambe pour 0,685 m de buste hors inclinaison, soit le même rapport qu'un
     humain à la table anthropométrique) — c'est la LARGEUR qui manquait :
     un torse de 0,50 m posé sur des cylindres de 0,16-0,19 m de diamètre lit
     un buste large sur des jambes de bâton, quelle que soit leur longueur.
     Les deux nombres montent ensemble, sinon la cuisse redevient plus fine
     que le mollet du dessus. ── */
  const leg = (sx) => {
    const hip = grp(sx * 0.135, -0.02, 0, man);
    cyl(0.114, 0.098, LEG_UP, mTrou, 0, -LEG_UP / 2, 0, 0, 0, 0, hip, 10);
    const knee = grp(0, -LEG_UP, 0, hip);
    cyl(0.094, 0.075, LEG_LOW, mTrou, 0, -LEG_LOW / 2, 0, 0, 0, 0, knee, 10);
    box(0.135, 0.088, 0.135, mTrouD, 0, -LEG_LOW + 0.03, 0, 0, 0, 0, knee);   // le bas de guêtre
    const ankle = grp(0, -LEG_LOW, 0, knee);
    box(0.145, 0.085, 0.29, mBoot, 0, -0.042, 0.055, 0, 0, 0, ankle);          // la botte
    box(0.155, 0.030, 0.30, lam(0x241a12), 0, -0.083, 0.055, 0, 0, 0, ankle);  // sa semelle
    return { hip, knee, ankle };
  };
  const legL = leg(-1), legR = leg(1);

  /* ── LE BUSTE. Il pivote sur le bassin, et TOUT ce qui suit est son enfant :
     se pencher entraîne la tête, les épaules et le tablier d'un bloc. Une tête
     qui reste droite pendant que le dos se plie est le défaut le plus visible
     d'un personnage articulé, et il ne coûte qu'une erreur de parenté.
     ⚠️ RÉTRÉCI DE 7 % EN LARGEUR ET EN PROFONDEUR, L'AUTRE MOITIÉ DE LA MÊME
     CORRECTION : les jambes montent, le torse redescend un peu, et les deux
     se retrouvent au milieu plutôt que d'empiler tout l'écart sur les jambes
     seules. La HAUTEUR ne bouge pas — elle n'était pas en cause. ── */
  const torso = grp(0, 0.03, 0, man);
  box(0.44, 0.34, 0.265, mShirt, 0, 0.20, 0, 0, 0, 0, torso);              // les reins
  const chest = grp(0, 0.34, 0, torso);
  box(0.47, 0.30, 0.28, mShirt, 0, 0.14, 0, 0, 0, 0, chest);              // la cage
  box(0.495, 0.10, 0.29, mShirtD, 0, 0.28, 0, 0, 0, 0, chest);              // le col roulé de la chemise
  /* ⚠️⚠️ LE TABLIER EST À LA TAILLE, PAS EN BAVETTE, ET C'EST LA PLANCHE DE
     CONTACT QUI L'A DIT : une bavette de 36 × 52 cm en aplat de cuir mangeait
     tout le torse — un panneau brun sur une chemise rouge, c'est-à-dire qu'elle
     effaçait la seule couleur qui détache le personnage du fond. Un tablier de
     charpentier se noue aux reins et tombe sur les cuisses ; il dit la même
     chose (« il travaille le bois ») en laissant vivre la silhouette.
     ⚠️ IL EST FILS DU BASSIN, PAS DU BUSTE : noué à la taille, il ne se penche
     pas avec les épaules — et un tablier qui suivrait le dos ressemblerait à un
     tablier cousu sur la chemise. */
  const apron = grp(0, -0.06, 0.13, man);
  box(0.40, 0.40, 0.028, mApron, 0, -0.16, 0.02, 0.10, 0, 0, apron);
  box(0.46, 0.075, 0.030, mApron, 0, 0.035, 0.005, 0, 0, 0, apron);      // la ceinture
  /* ⚠️⚠️ 2026-09-01 — LES BRETELLES SONT DEVANT ET DERRIÈRE, PAS SEULEMENT DANS
     LE DOS. Demande de Guillaume : « pantalon jean avec bretelles » — or les
     trois vues du joueur (poste, face, atelier) regardent Tristan DE FACE ou
     de trois quarts avant (§10) : une bretelle qui n'existe que dans le dos
     n'est vue par PERSONNE. Elle est fille de `chest` comme avant (elle suit
     l'inclinaison du buste), et croise par-dessus l'épaule via `sh`. */
  for (const sx of [-1, 1]) {
    box(0.045, 0.46, 0.018, mBrace, sx * 0.15, 0.12, -0.152, 0, 0, 0, chest);   // dans le dos
    box(0.045, 0.40, 0.018, mBrace, sx * 0.16, 0.06, 0.150, 0, 0, 0, chest);    // sur la poitrine
    box(0.050, 0.050, 0.030, lam(0xb0925a), sx * 0.155, -0.10, 0.150, 0, 0, 0, chest); // la boucle
  }

  /* ── LES BRAS. ⚠️ ILS SONT PLUS ÉPAIS QUE CEUX DU MAIRE, et c'est la moitié du
     personnage : un bûcheron se reconnaît à l'avant-bras. 16 segments parce que
     ce sont les pièces qui roulent le plus sous l'œil. ── */
  const arm = (sx) => {
    const sh = grp(sx * 0.220, 0.235, 0, chest);
    sph(0.088, mShirt, 0, 0.01, 0, sh, 10);
    cyl(0.075, 0.066, ARM_UP, mShirt, 0, -ARM_UP / 2, 0, 0, 0, 0, sh, 16);
    const el = grp(0, -ARM_UP, 0, sh);
    cyl(0.070, 0.052, 0.10, mShirt, 0, -0.05, 0, 0, 0, 0, el, 16);          // la manche retroussée
    cyl(0.062, 0.050, ARM_FORE - 0.09, mSkin, 0, -(ARM_FORE + 0.09) / 2, 0, 0, 0, 0, el, 16);
    const hd = grp(0, -ARM_FORE, 0, el);
    box(0.080, 0.052, 0.105, mSkin, 0, -0.020, 0, 0, 0, 0, hd);
    /* les quatre doigts, refermés autour de la poignée : ils sont pliés en
       permanence parce qu'il ne lâche jamais — une main ouverte sur un manche
       est une main qui ne tient rien */
    for (let i = 0; i < 4; i++) box(0.017, 0.028, 0.070, mSkin, -0.027 + i * 0.019, -0.048, 0.030, 0.85, 0, 0, hd);
    box(0.025, 0.028, 0.052, mSkin, sx * 0.042, -0.024, 0.030, 0.35, 0, sx * 0.5, hd);
    return { sh, el, hd };
  };
  const armL = arm(-1), armR = arm(1);

  /* ── LE COU ET LA TÊTE. ⚠️⚠️ LE CYLINDRE DU COU EST FILS DU **COU**, PAS DU
     BUSTE, et c'est un défaut que la planche de contact a sorti : peint sur le
     buste, il restait droit pendant que la tête se penchait, et à trente degrés
     de voûtement la tête se DÉTACHAIT — deux îlots, mesurés, sur les poses les
     plus courbées. *Un membre qui tourne emporte sa chair ; ce qui reste au
     parent est ce qui ne tourne jamais.* ── */
  const neck = grp(0, 0.315, 0.005, chest);
  cyl(0.070, 0.078, 0.13, mSkin, 0, 0.030, 0, 0, 0, 0, neck, 10);
  const head = grp(0, 0.165, -0.025, neck);
  box(0.215, 0.250, 0.225, mSkin, 0, 0, 0, 0, 0, 0, head);
  box(0.190, 0.055, 0.200, mSkin, 0, -0.128, 0.006, 0, 0, 0, head);            // la mâchoire
  for (const sx of [-1, 1]) box(0.026, 0.074, 0.060, mSkin, sx * 0.114, 0.000, -0.010, 0, 0, 0, head);
  /* les cheveux : une masse épaisse et basse, plus une barbe courte. ⚠️ PAS UNE
     CALOTTE (le maire l'a payé) : une boîte de la largeur du crâne posée sur le
     dessus lit comme une casquette. Trois pièces qui descendent sur la nuque. */
  const mHair = lam(COL.hair), mBeard = lam(COL.beard);
  box(0.226, 0.100, 0.235, mHair, 0, 0.100, -0.004, 0, 0, 0, head);
  box(0.230, 0.135, 0.070, mHair, 0, 0.030, -0.092, 0, 0, 0, head);
  for (const sx of [-1, 1]) box(0.030, 0.140, 0.200, mHair, sx * 0.104, 0.020, -0.010, 0, 0, 0, head);
  box(0.180, 0.115, 0.055, mBeard, 0, -0.105, 0.092, 0, 0, 0, head);           // la barbe
  for (const sx of [-1, 1]) box(0.035, 0.150, 0.062, mBeard, sx * 0.092, -0.055, 0.072, 0, 0, 0, head);

  /* ── LE VISAGE. ⚠️ IL EST À CONTRE-JOUR (la grande ouverture est derrière
     lui), donc il faut qu'il soit contrasté DANS SA MATIÈRE et pas dans son
     éclairage : blanc d'œil franc, iris presque noir, sourcils deux tons sous la
     peau. Éclairer de face l'aplatirait — fausse piste mesurée du §8. ── */
  const face = grp(0, -0.005, 0.112, head);
  box(0.044, 0.066, 0.052, mSkin, 0, -0.006, 0.020, 0, 0, 0, face);
  box(0.044, 0.014, 0.042, lam(COL.skinDark), 0, -0.040, 0.018, 0, 0, 0, face);
  box(0.196, 0.022, 0.026, lam(COL.skinDark), 0, 0.078, 0.004, 0, 0, 0, face);   // l'arcade
  const eye = (sx) => {
    const g = grp(sx * 0.056, 0.034, 0.004, face);
    box(0.058, 0.040, 0.012, lam(0xf6f3ec), 0, 0, 0, 0, 0, 0, g);
    const iris = box(0.026, 0.028, 0.010, lam(0x22180f), 0, -0.002, 0.007, 0, 0, 0, g);
    const lid = box(0.062, 0.046, 0.016, mSkin, 0, 0.044, 0.005, 0, 0, 0, g);
    return { g, iris, lid };
  };
  const eyeL = eye(-1), eyeR = eye(1);
  const browL = box(0.078, 0.024, 0.018, lam(COL.beard), -0.056, 0.074, 0.013, 0, 0, 0, face);
  const browR = box(0.078, 0.024, 0.018, lam(COL.beard), 0.056, 0.074, 0.013, 0, 0, 0, face);
  /* la bouche est un TROU dans la barbe : elle s'ouvre quand il force, et c'est
     le signe d'effort le plus lisible d'un visage à cette taille */
  const mouth = box(0.062, 0.012, 0.014, lam(0x3a1b18), 0, -0.086, 0.028, 0, 0, 0, face);

  /* ⚠️⚠️ 2026-09-01 — LA TÊTE FAISAIT 43 % DE LA LARGEUR DES ÉPAULES (0,215 m
     pour un torse de 0,505 m), CONTRE 25-32 % CHEZ UN HOMME. Signalé par
     Guillaume en jouant : « on dirait un pantin ». `render-scierie` restait
     58/58 (aucun genou à l'envers, une seule masse, 167,6 cm de haut) — la
     silhouette est cohérente au sens du banc, mais la tête à elle seule la
     fait lire fausse à l'œil, et aucun banc du dépôt ne mesure un RAPPORT de
     tailles entre deux morceaux.
     ⚠️ UN SEUL FACTEUR, SUR LE GROUPE, PAS DIX BOÎTES RETOUCHÉES À LA MAIN :
     la mâchoire, les oreilles, les trois masses de cheveux, la barbe et tout
     le visage (`face`, dont les yeux et les sourcils) sont des ENFANTS de
     `head` — les redimensionner un par un aurait fait dériver leurs
     proportions ENTRE EUX (une oreille qui ne rétrécit pas comme le crâne
     ressort du crâne). `head.scale` les réduit tous ensemble, au même
     rapport, sans toucher un seul offset — et sans déplacer le point
     d'attache au cou, qui reste la position du GROUPE, jamais sa taille.
     0,75 ramène le rapport à 32 %, en haut de la fourchette humaine — assez
     pour rester lisible à la taille du personnage, dont le style reste
     volontairement trapu (bras et torse épais, §8 de `buildTristan`). */
  head.scale.setScalar(0.75);

  return { man, torso, chest, neck, head, face, armL, armR, legL, legR,
           eyeL, eyeR, browL, browR, mouth };
}

/* ── NOS PROPRES BRAS. ⚠️⚠️ ILS EXISTENT PARCE QUE C'EST LA SEULE FAÇON DE
   SENTIR L'EFFORT À LA PREMIÈRE PERSONNE : sans eux, la scie avance toute seule
   et le joueur regarde travailler quelqu'un d'autre. Ils sont résolus vers la
   MÊME poignée, par le MÊME solveur, depuis un buste-fantôme accroché à notre
   poste — donc ils ne peuvent pas se décrocher davantage que ceux de Tristan.
   ⚠️ ILS SE CACHENT DANS LES AUTRES VUES : deux avant-bras flottants vus de
   trois quarts depuis le fond de l'atelier seraient pires que rien. ── */
function buildHands(THREE, K) {
  const { lam, cyl, box, sph, grp } = K;
  /* ⚠️ NOTRE MANCHE EST PLUS SOMBRE QUE LA SIENNE (0x5d2620 contre 0xa8483a) :
     deux chemises de la même valeur au premier plan et au fond, et l'œil ne sait
     plus laquelle regarder. C'est le §8 — l'écart, pas la moyenne — appliqué à
     la profondeur de champ plutôt qu'à la lumière. */
  const mSkin = lam(COL.skin), mSleeve = lam(0x5d2620);
  const us = grp(SHOP.eye[0], SHOP.eye[1] - 0.30, SHOP.eye[2] + 0.06);
  /* ⚠️⚠️ NOS BRAS SONT PLUS FINS QUE CEUX DE TRISTAN, ET CE N'EST PAS UNE
     COQUETTERIE : ils sont à quarante centimètres de l'œil et lui à deux mètres.
     Aux mêmes proportions, la manche du premier plan occupait un quart du cadre
     et écrasait la scène — vu en jouant, invisible sur la planche de contact (qui
     ne peint pas le poste). *Ce qui est près de la caméra se dessine plus mince
     que ce qui est loin, ou il n'y a plus de scène derrière.* */
  const arm = (sx) => {
    const sh = grp(sx * 0.21, 0, 0.02, us);
    cyl(0.056, 0.048, ARM_UP, mSleeve, 0, -ARM_UP / 2, 0, 0, 0, 0, sh, 14);
    const el = grp(0, -ARM_UP, 0, sh);
    cyl(0.051, 0.040, 0.09, mSleeve, 0, -0.045, 0, 0, 0, 0, el, 14);
    cyl(0.046, 0.038, ARM_FORE - 0.08, mSkin, 0, -(ARM_FORE + 0.08) / 2, 0, 0, 0, 0, el, 14);
    const hd = grp(0, -ARM_FORE, 0, el);
    box(0.078, 0.050, 0.100, mSkin, 0, -0.020, 0, 0, 0, 0, hd);
    for (let i = 0; i < 4; i++) box(0.017, 0.027, 0.068, mSkin, -0.026 + i * 0.018, -0.046, 0.029, 0.90, 0, 0, hd);
    box(0.024, 0.027, 0.050, mSkin, sx * 0.041, -0.023, 0.029, 0.35, 0, sx * 0.5, hd);
    return { sh, el, hd };
  };
  return { us, armL: arm(-1), armR: arm(1) };
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. LA POUSSIÈRE ET LA SCIURE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ DEUX SYSTÈMES, PAS UN : les motes qui flottent dans le rai de lumière sont
   un DÉCOR (elles existent avant qu'on scie), la sciure est une CONSÉQUENCE
   (elle sort du trait et retombe). Les mêler aurait donné un atelier qui
   poudroie parce qu'on scie, c'est-à-dire un décor qui ne tient pas debout tant
   qu'on ne joue pas.
   ⚠️ UN SEUL `Points` PAR SYSTÈME, recyclé en anneau : une particule créée par
   image, c'est une allocation par image, et le ramasse-miettes tousse
   exactement pendant le trait le plus rapide.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildDust(THREE, tex, junk, n, size, col, opacity) {
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    map: tex, size, color: col, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  junk.push(geo, mat);
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pts, pos, n, vel: new Float32Array(n * 3), life: new Float32Array(n), head: 0 };
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. LES VUES
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ ON NE MARCHE PAS DANS CETTE SCÈNE, ET C'EST UNE DÉCISION : on tient une
   poignée. Le bureau du maire autorise la marche libre parce qu'on y est ASSIS à
   ne rien faire ; ici, se promener pendant qu'on scie serait la contradiction la
   plus visible possible entre ce que le jeu montre et ce qu'il demande.
   Restent trois ATTITUDES et la souris — exactement comme le maire, et pour la
   même raison : trois plans de cinéma auraient été trois cadrages, pas trois
   regards.
   ═══════════════════════════════════════════════════════════════════════════ */
export const VIEWS = {
  /* ⚠️ LE POSTE VISE LE TRAIT DE SCIE, PAS TRISTAN. C'est là que se joue la
     manche : la lame, le trait qui descend, la planche qui se fend. Son visage
     est dans le tiers haut du cadre, ce qui suffit — et le laisser au centre
     mettrait la lame derrière le bandeau d'interface. */
  /* ╔═══════════════════════════════════════════════════════════════════════
     ║ ⚠️⚠️⚠️ LE POSTE N'EST PAS UNE PREMIÈRE PERSONNE STRICTE, ET C'EST LE BANC
     ║ DE RENDU QUI A TRANCHÉ.
     ╚═══════════════════════════════════════════════════════════════════════
     Le premier jet mettait l'œil exactement derrière notre poignée, dans l'axe
     de la lame. Géométriquement irréprochable — et c'est très exactement ce
     qu'on voit en sciant pour de vrai : **la lame est de BOUT, donc c'est un
     trait blanc d'un pixel de large**. La seule chose qu'on ait demandé au
     joueur de regarder était invisible depuis la seule place où on le met.
     ⚠️ La parade n'est pas de tricher sur la scie mais de reculer d'un pas sur
     la gauche : par-dessus notre épaule, la lame se voit en PERSPECTIVE, le
     trait de scie et sa profondeur aussi, nos deux bras entrent par la droite,
     et Tristan reste en face. C'est le cadrage d'un jeu de descente — la
     référence que Guillaume a donnée — et pas celui d'un simulateur.
     ⚠️ CE CADRAGE EST NOMINAL : au poste la caméra est DÉRIVÉE de la position
     de nos épaules à chaque image (`playerPost`), parce que notre corps avance
     et recule avec le trait. Ce qui est écrit ici sert au premier cadrage, au
     repli avant que la mécanique n'ait démarré, et au banc. */
  poste: { pos: [-0.30, 1.72, 1.55], look: [0.58, 0.74, -0.55] },
  /* on lève les yeux : lui, la charpente, le rai de lumière derrière */
  /* ⚠️ RECULÉE DE 37 CM APRÈS MESURE : à 0,55 m, le crâne de Tristan touchait le
     haut du cadre (24 px sur le bord). C'est le piège n°1 des sprites (§4 de
     `CLAUDE.md`, payé trois fois dans le seul zip 433) transposé à un cadrage
     3D — et c'est un banc qui l'a dit, pas un œil. */
  face: { pos: [0.78, 1.46, 1.32], look: [0.62, 1.06, -1.56] },
  /* trois pas en arrière et sur le côté : l'atelier entier, la scie de profil */
  atelier: { pos: [2.55, 1.78, 2.95], look: [-0.30, 1.05, -1.40] },
};
export const VIEW_KEYS = Object.keys(VIEWS);

/* ⚠️ LES BORNES SORTENT DE `SHOP`, jamais d'un second jeu de nombres (§8). On
   ne marche pas, mais la molette avance et recule : sans bornes, deux crans et
   la caméra est dans le mur, à regarder la face arrière des planches. */
export function clampCam(p) {
  const S = SHOP, m = 0.50;
  p.x = Math.max(S.x0 + m, Math.min(S.x1 - m, p.x));
  p.z = Math.max(S.z0 + m, Math.min(S.z1 - m, p.z));
  p.y = Math.max(0.65, Math.min(S.wallH - 0.30, p.y));
  return p;
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. L'INCLINAISON DE TRISTAN — LE CALCUL QUI TIENT TOUT LE PERSONNAGE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ ELLE EST RÉSOLUE, PAS RÉGLÉE, ET C'EST CE QUI DISTINGUE UN HOMME QUI
   TIRE D'UN MANNEQUIN QUI OSCILLE. On connaît la position de la poignée (fille
   de la lame, fille de `s.bx`) ; on veut que son ÉPAULE tombe à une distance
   confortable de sa main — courte quand il a fini de tirer (bras repliés contre
   lui), presque pleine quand la lame est partie de l'autre côté (bras tendus).
   L'inclinaison du buste est ce qui reste à trouver, et elle se trouve par un
   `asin`. C'est un cheveu d'arithmétique, et ça remplace la seule chose qu'on ne
   sait pas régler à la main : la cohérence entre un dos, deux bras et un outil.
   ⚠️ ELLE EST PURE ET EXPORTÉE : `render-scierie.mjs` la balaie sur toute la
   course et vérifie que la main demandée reste dans le disque de portée. Une
   cible hors de portée ne planterait pas — `solveArm` la BORNE — elle MENTIRAIT,
   et la main s'arrêterait à quinze centimètres du manche.
   ═══════════════════════════════════════════════════════════════════════════ */
export function tristanLean(handZ, handY) {
  const S = SHOP;
  /* `L` : 0 = il a fini de tirer (la poignée est chez lui), 1 = elle est partie.
     ⚠️ IL SE DÉDUIT DE LA POSITION RÉELLE DE LA POIGNÉE, pas de `s.bx` : le jour
     où l'on change la course de la lame, il n'y a rien à retoucher ici. */
  const near = -S.bladeSpan - S.bladeTravel, far = -S.bladeSpan + S.bladeTravel;
  const L = Math.max(0, Math.min(1, (handZ - near) / (far - near)));
  /* `low` : 0 en haut du trait, 1 au fond. ⚠️ IL EXISTE PARCE QU'UN TRAIT SE
     CREUSE DE 30 CM : sans lui, l'homme garde la même hauteur de hanche du début
     à la fin et ses bras finissent tendus vers le bas, hors de portée. Un scieur
     s'accroupit à mesure qu'il descend, et c'est ce qu'on voit. */
  const low = Math.max(0, Math.min(1, (gripHeight(0) - handY) / S.beamH));
  const hipZ = S.manZ + 0.26 * L + 0.05 * low;
  const hipY = S.hipY - 0.13 * L - 0.21 * low;
  const pivotY = hipY + S.chestPivot;
  /* ⚠️ 0,08 AU REPLI, PAS 0,20 : au bout de son trait, la main d'un scieur passe
     À CÔTÉ de sa hanche, pas devant sa poitrine. Huit centimètres, c'est un bras
     qui pend et un coude qui part en arrière — le geste. Vingt, c'était le
     mannequin de vitrine que la planche de contact a montré. */
  const reach = 0.08 + 0.38 * L;
  const want = handZ - reach;
  /* ⚠️⚠️ LE VOÛTEMENT S'AJOUTE APRÈS LA RÉSOLUTION, ET C'EST VOULU. La planche
     de contact montrait un homme parfaitement DROIT tenant une poignée à hauteur
     de hanche : la géométrie était juste et l'attitude était fausse — personne ne
     scie le dos vertical. Vingt centièmes de radian de plus, appliqués au
     résultat, penchent l'homme sur son ouvrage sans toucher au calcul de portée.
     ⚠️ ET ILS NE PEUVENT QUE L'AIDER : le voûtement rapproche l'épaule de la
     main dans les deux bouts de la course, donc la distance mesurée DIMINUE. On
     le vérifie quand même — `d` est recalculé sur l'épaule RÉELLE, pas sur celle
     qu'on visait, et le banc balaie les quarante-cinq cas.
     ⚠️ 0,12 ET PAS 0,20 : à vingt centièmes, la planche de contact rendait un
     dos presque horizontal aux poses profondes — un homme plié en deux, pas un
     homme qui scie. */
  const pitch = Math.asin(Math.max(-0.72, Math.min(0.72, (want - hipZ) / S.chestLen))) + 0.12;
  const shZ = hipZ + S.chestLen * Math.sin(pitch);
  const shY = pivotY + S.chestLen * Math.cos(pitch);
  return { L, low, hipZ, hipY, pitch, shZ, shY,
           /* la distance épaule → main la plus DÉFAVORABLE des deux (les mains
              sont écartées sur le manche) : c'est elle que le banc balaie, parce
              que c'est elle qui borne. */
           d: Math.max(
             Math.hypot(handZ - shZ, handY + S.handGap - shY),
             Math.hypot(handZ - shZ, handY - S.handGap - shY)) };
}

/* ── NOUS, ET C'EST LE MÊME CALCUL EN MIROIR. ⚠️ IL EST SÉPARÉ DE CELUI DE
   TRISTAN PLUTÔT QUE PARAMÉTRÉ : nous ne sommes pas debout dans la même posture
   (nous n'avons ni jambes ni buste dessinés, seulement deux bras et un point de
   vue), et forcer une fonction commune aurait fait porter à un seul jeu de
   nombres deux mises en scène qui n'ont en commun que la trigonométrie. C'est
   l'inverse du cas de `solveArm`, où le partagé est de la MATHÉMATIQUE pure. ── */
export function playerPost(handZ, handY) {
  const S = SHOP;
  const near = S.bladeSpan - S.bladeTravel, far = S.bladeSpan + S.bladeTravel;
  const L = Math.max(0, Math.min(1, (handZ - near) / (far - near)));   // 0 tendus, 1 repliés
  const reach = 0.42 - 0.24 * L;
  const shZ = handZ + reach, shY = handY + 0.29;
  return { L, shZ, shY,
           d: Math.max(
             Math.hypot(handZ - shZ, handY + S.handGap - shY),
             Math.hypot(handZ - shZ, handY - S.handGap - shY)) };
}

/* ── LA PORTÉE D'UN BRAS ET CELLE D'UNE JAMBE, exportées pour que le banc les
   compare aux deux fonctions ci-dessus. ⚠️ CE SONT LES MÊMES CONSTANTES QUE
   CELLES QUE `solveArm` UTILISE, lues au même endroit : un banc qui recopierait
   « 0,63 » mesurerait sa propre idée de la portée, pas celle du personnage
   (c'est le défaut du banc qui repeint au lieu d'appeler, 439). ── */
export const REACH = {
  arm: (ARM_UP + ARM_FORE) * 0.995, armMin: Math.abs(ARM_UP - ARM_FORE) + 0.02,
  leg: (LEG_UP + LEG_LOW) * 0.995, legMin: Math.abs(LEG_UP - LEG_LOW) + 0.02,
  ankle: ANKLE,
};

/* ═══════════════════════════════════════════════════════════════════════════
   12. L'ASSEMBLAGE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ IL REND UN OBJET, ET LA BOUCLE DE RENDU NE DÉCLARE RIEN (piège n°1).
   ⚠️ `junk` COLLECTE TOUT CE QUI SE LIBÈRE : un navigateur n'accorde qu'une
   poignée de contextes WebGL et pas beaucoup plus de mémoire de textures. Trois
   commandes de bois dans la même session, et la quatrième s'ouvrirait sur du
   noir — sans que rien ne dise pourquoi.
   ═══════════════════════════════════════════════════════════════════════════ */
export function buildShop(THREE, opts) {
  const o = opts || {};
  const junk = [];
  const root = new THREE.Group();
  const K = maker(THREE, root, junk);

  const tex = {
    grain: texGrain(THREE, COL.wood, COL.woodDark, 3301, 6),
    grainPale: texGrain(THREE, COL.woodPale, COL.wood, 5507, 0),
    floor: texFloor(THREE),
    bark: texBark(THREE),
    end: texEnd(THREE, 991),
    steel: texSteel(THREE),
    mote: texMote(THREE),
    plaid: texPlaid(THREE, COL.shirt, COL.plaidDark),
  };
  for (const k in tex) junk.push(tex[k]);

  const shed = buildShed(THREE, K, tex);
  const props = buildProps(THREE, K, tex);
  const beam = buildBeam(THREE, K, tex);
  const saw = buildBlade(THREE, K, tex);
  const man = buildTristan(THREE, K, tex);
  const hands = buildHands(THREE, K);

  /* ── LES RAIS DE LUMIÈRE. Trois plans additifs très pâles, inclinés depuis
     l'ouverture. ⚠️ `depthWrite: false` ET `renderOrder` : sans ça, un plan
     transparent écrit dans le tampon de profondeur et EFFACE ce qu'il y a
     derrière — le symptôme est un trou rectangulaire dans le décor, et il ne
     ressemble en rien à sa cause. ── */
  const shafts = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xfff0cf, transparent: true, opacity: 0.055,
                                            depthWrite: false, blending: THREE.AdditiveBlending,
                                            side: THREE.DoubleSide });
    junk.push(m);
    const g = new THREE.PlaneGeometry(4.6, 2.1); junk.push(g);
    const p = new THREE.Mesh(g, m);
    p.position.set(SHOP.x0 + 1.9, 1.85 - i * 0.16, -1.05 + (i - 1) * 0.55);
    p.rotation.set(-0.30, 0, -0.34);
    p.renderOrder = 4;
    shafts.add(p);
  }
  root.add(shafts);

  const motes = buildDust(THREE, tex.mote, junk, 150, 0.035, 0xffeccb, 0.36);
  const chips = buildDust(THREE, tex.mote, junk, 140, 0.030, 0xe8c98d, 0.85);
  root.add(motes.pts); root.add(chips.pts);
  root.add(shed.shed); root.add(props.props); root.add(beam.beam);
  root.add(saw.blade); root.add(man.man); root.add(hands.us);

  /* les motes flottent d'emblée dans le volume du rai : elles ne sont pas
     émises, elles SONT là, et c'est ce qui fait qu'un atelier vide respire */
  for (let i = 0; i < motes.n; i++) {
    motes.pos[i * 3] = SHOP.x0 + 0.4 + Math.random() * 4.2;
    motes.pos[i * 3 + 1] = 0.5 + Math.random() * 2.4;
    motes.pos[i * 3 + 2] = -2.6 + Math.random() * 3.0;
    motes.vel[i * 3] = (Math.random() - 0.5) * 0.03;
    motes.vel[i * 3 + 1] = 0.008 + Math.random() * 0.022;
    motes.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
  }
  /* la sciure part sous le sol : invisible tant qu'aucun copeau n'a volé */
  for (let i = 0; i < chips.n; i++) chips.pos[i * 3 + 1] = -8;

  /* ═══ LA LUMIÈRE ═══
     ⚠️⚠️ LE PARTI EST LE MÊME QUE CHEZ LE MAIRE, ET IL EST JUSTE : le jour vient
     de l'ouverture DERRIÈRE Tristan, donc il est à contre-jour, donc son visage
     est dans une ombre douce — et c'est cette ombre qui rend une barbe et deux
     sourcils lisibles. Un bûcheron éclairé de face aurait un visage plat,
     c'est-à-dire pas de visage (§8).
     ⚠️ CINQ LAMPES, PAS DIX : r128 recalcule chaque lampe par fragment, et cette
     scène a beaucoup plus de faces que le bureau.
     ⚠️⚠️ ET TOUTES LES INTENSITÉS ONT ÉTÉ BAISSÉES D'UN TIERS APRÈS L'AVOIR
     OUVERTE DANS UN NAVIGATEUR — c'est la limite que `render-scierie` annonce en
     tête et qu'il faut croire : il rastérise SANS `sRGBEncoding`, donc il rend
     un atelier plausible là où le vrai moteur rendait un atelier BLANC. Le §8 le
     dit depuis le 421 (« soleil à 2,45 → image entièrement blanche ») : *une
     intensité se règle dans le moteur qui l'applique, jamais dans celui qui
     l'approxime.* */
  /* ⚠️ LA HÉMISPHÉRIQUE EST PLUS FORTE QUE CHEZ LE MAIRE (0,58 contre 0,50), ET
     C'EST UNE MESURE : un hangar de bois n'a ni murs clairs ni tapis pour
     renvoyer la lumière, et la planche de contact rendait les grumes du fond
     NOIRES — cinq tonneaux au lieu de cinq troncs. On remonte le ciel et surtout
     le SOL (le plancher de sciure renvoie beaucoup), ce qui est la parade
     physique, et pas un second soleil (fausse piste mesurée du §8). */
  const hemi = new THREE.HemisphereLight(0xc8dcee, 0x40331f, 0.34); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2da, 0.82);
  sun.position.set(-7.5, 4.6, -2.6); sun.target.position.set(0.4, 0.9, -0.4);
  root.add(sun); root.add(sun.target);
  const forge = new THREE.PointLight(COL.ember, 0.52, 5.2);        // le poêle
  forge.position.set(3.35, 0.55, -0.05); root.add(forge);
  const lamp = new THREE.PointLight(COL.lamp, 0.38, 4.4);          // la lanterne
  lamp.position.set(-0.55, 2.30, 0.30); root.add(lamp);
  /* ⚠️ UNE LAMPE DE REMPLISSAGE DEPUIS NOTRE PLACE, faible. Sans elle le
     contre-jour est si franc qu'on ne lit plus le trait de scie — c'est la
     fausse piste mesurée du §8 (« compenser au jugé ») évitée par la parade de
     la photo : une réflexion, pas un second soleil. */
  const fill = new THREE.PointLight(0xdce6f2, 0.17, 5.6);
  fill.position.set(0.1, 1.5, 1.5); root.add(fill);

  return {
    root, shed, props, beam, saw, man, hands, shafts, motes, chips,
    lights: { hemi, sun, forge, lamp, fill },
    _v: new THREE.Vector3(), _v2: new THREE.Vector3(),
    _T: R3.rigScratch(THREE),
    _T2: R3.rigScratch(THREE),
    _q: new THREE.Quaternion(),
    /* ⚠️ L'ÉTAT D'AFFICHAGE VIT ICI, PAS DANS LA BOUCLE (piège n°1). Il ne
       contient QUE du lissage et de la mise en scène : rien de ce qui est ici ne
       revient jamais dans `scierie.js`, sinon l'hôte ne pourrait plus rejouer. */
    vis: { bx: 0, cut: 0, bind: 0, slack: 0, drop: 0, strain: 0, bob: 0,
           shake: 0, camZ: SHOP.eye[2], camY: SHOP.eye[1], plank: 0, broken: 0 },
    /* les pieds de Tristan, en MONDE et une fois pour toutes. ⚠️ ILS SONT
       CALCULÉS ICI ET JAMAIS AILLEURS : deux descriptions d'un appui, c'est un
       homme qui patine d'un côté et pas de l'autre. */
    feet: {
      L: [SHOP.manX - SHOP.footDX, ANKLE, SHOP.footFrontZ],
      R: [SHOP.manX + SHOP.footDX, ANKLE, SHOP.footBackZ],
    },
    dispose() {
      for (const j of junk) { try { j.dispose && j.dispose(); } catch (e) { /* déjà rendu */ } }
      junk.length = 0;
    },
  };
}


/* ═══════════════════════════════════════════════════════════════════════════
   13. UNE IMAGE — TOUT SE DÉDUIT DE L'ÉTAT DE `scierie.js`, RIEN NE S'INVENTE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ L'ORDRE DES OPÉRATIONS EST UNE RÈGLE, PAS UNE HABITUDE, et elle a été
   payée sur le maire le 2026-08-31 : *une chaîne d'os se remet à jour depuis sa
   RACINE ou pas du tout.* `updateMatrixWorld` compose avec la matrice monde du
   PARENT telle qu'elle est ; rafraîchir le buste après avoir bougé le bassin
   laisse l'homme d'une image en retard, et cet écart vaut zéro tant que la
   racine ne bouge jamais — puis 39 cm le jour où elle se met à bouger. Ici la
   racine bouge à CHAQUE image (le bassin avance et descend), donc l'ordre est :

     1. la lame  →  2. sa matrice monde  →  3. où sont les poignées
     4. le bassin et le buste  →  5. leur matrice monde DEPUIS `man`
     6. les jambes vers les pieds plantés  →  7. les bras vers les poignées

   ⚠️ ET RIEN DE CE QUI EST CALCULÉ ICI NE REMONTE DANS LA MÉCANIQUE. La fonction
   ne rend qu'un cadrage et deux nombres de mise en scène ; `scierie.js` ignore
   jusqu'à l'existence de ce fichier. C'est ce qui permet à l'hôte de rejouer la
   manche sans ouvrir un seul canevas.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️ LA PAUME EST SUR LA SURFACE DU MANCHE, PAS SUR SON AXE. Viser l'axe
   enfoncerait la main de trois centimètres dans le bois — et le §« ce qui
   s'enfonce se compte en mètres » rappelle qu'une main dans une matière ne fait
   pas d'îlot : elle disparaît, et le contrôle de silhouette ne voit rien. */
const PALM = 0.045;
/* ⚠️ DE QUEL CÔTÉ SORT LE GENOU. `solveArm` ne subit pas son plan de flexion, il
   le CHOISIT — et un genou qui plie en arrière est le défaut le plus violent
   qu'un personnage puisse avoir. Le banc le vérifie en comparant la position du
   genou à celle de la hanche, ce qui est la seule mesure qui ne se discute pas. */
const KNEE_OUT = -1;

export function applySaw(shop, s, t, dt) {
  const S = SHOP, v = shop.vis, m = shop.man;
  const DT = Math.min(0.05, dt || 0.016);
  const soft = (k) => 1 - Math.pow(0.0001, DT * k);

  /* ── 0. LE LISSAGE D'AFFICHAGE. ⚠️ IL NE TOUCHE PAS À LA SIMULATION : celle-ci
     tourne à pas fixe et c'est elle qui juge. Ici on ne fait qu'éviter le
     saccadement quand l'écran ne bat pas au même rythme que le pas — un jeu à
     144 Hz lisant une simulation à 120 verrait sinon un escalier. ── */
  v.bx += (s.bx - v.bx) * soft(30);
  /* ⚠️ LE TRAIT SE REMET À ZÉRO D'UN COUP, IL NE GLISSE PAS : un lissage sur un
     RETOUR à zéro ferait « remonter » le trait de scie dans le bois pendant une
     demi-seconde, c'est-à-dire montrer une planche qui se répare. */
  v.cut = Math.abs(s.cut - v.cut) > 0.35 ? s.cut : v.cut + (s.cut - v.cut) * soft(11);
  v.bind += (Math.min(1, s.bind) - v.bind) * soft(16);
  v.slack += (Math.min(1, s.slack / C.SAW_SLACK_GOOD) - v.slack) * soft(9);
  v.strain += (((s.mate > 0 ? 1 : 0) * 0.75 + (s.pull > 0 ? 0.45 : 0)) - v.strain) * soft(12);
  v.bob += ((s.pull > 0 ? -0.028 : 0) - v.bob) * soft(14);

  /* la secousse : elle naît d'un coincement ou d'une rupture, et elle retombe */
  const fresh = s.tick - s.lastAt;
  if (fresh <= 2 && (s.last === "bind" || s.last === "break")) v.shake = s.last === "break" ? 1 : 0.55;
  v.shake = Math.max(0, v.shake - DT * 2.6);

  /* ── 1. LA LAME. Sa hauteur EST la profondeur du trait : une seule grandeur
     pour l'outil et pour l'entaille, donc rien qui puisse se décaler. ── */
  const teeth = gripHeight(v.cut) - S.bladeW / 2 - 0.008 - S.gripUp;
  const B = shop.saw;
  B.blade.position.set(S.cutX, teeth + S.bladeW / 2 + 0.008, v.bx * S.bladeTravel);
  /* le bout qu'on tire pique du nez — c'est vrai d'une scie et c'est le seul
     mouvement qui dise « quelqu'un tire » quand on la regarde de loin */
  B.blade.rotation.set(v.bx * 0.035, 0, 0);

  /* ── LA FLEXION. Trois causes distinctes, et il le faut : le ventre du
     coincement, le fouet de la vitesse, l'affaissement du mou. Une seule
     amplitude « au jugé » aurait donné une lame qui vibre tout le temps de la
     même façon, c'est-à-dire une lame qui ne dit rien. ── */
  const sp = Math.min(1, Math.abs(s.bv) / 4.5);
  const flex = {
    bow: 0.020 * v.bind + 0.005 * sp,
    whip: 0.009 * sp + 0.028 * v.bind,
    phase: t * 11 + v.bx * 1.7,
    sag: 0.030 * v.slack + 0.009,
  };
  const segL = B.segLen;
  for (let i = 0; i < BLADE_SEGS; i++) {
    const u = ((i + 0.5) / BLADE_SEGS) * 2 - 1;
    const du = 1 / BLADE_SEGS;
    const f = bladeFlex(u, flex), fA = bladeFlex(u - du, flex), fB = bladeFlex(u + du, flex);
    const g = B.segs[i];
    g.position.set(f.x, f.y, u * S.bladeSpan);
    /* la tangente, prise sur les deux voisins : sans elle les segments restent
       parallèles et la lame « pliée » se lit comme une lame en escalier */
    g.rotation.set(-Math.atan2(fB.y - fA.y, 2 * segL), Math.atan2(fB.x - fA.x, 2 * segL), 0);
  }

  /* ── 2 et 3. OÙ SONT LES POIGNÉES. ⚠️ ON LES DEMANDE À LA SCÈNE, ON NE LES
     RECALCULE PAS : la poignée est fille de la lame, donc sa position monde
     porte déjà la translation, la bascule et la flexion. Un second calcul
     divergerait au premier réglage, et les mains lâcheraient l'outil. ── */
  B.blade.updateMatrixWorld(true);
  const hU = shop._v.setFromMatrixPosition(B.gripUs.hold.matrixWorld);
  const hT = shop._v2.setFromMatrixPosition(B.gripHim.hold.matrixWorld);

  /* ── 4. TRISTAN : LE BASSIN ET LE BUSTE ── */
  const ln = tristanLean(hT.z, hT.y);
  m.man.position.set(S.manX, ln.hipY, ln.hipZ);
  m.torso.rotation.set(ln.pitch, 0, 0);
  /* il souffle : la cage se gonfle, plus fort quand il force. ⚠️ DEUX
     SINUSOÏDES INCOMMENSURABLES plutôt qu'un aléa par image — une respiration
     tirée au sort vibre, deux sinusoïdes articulent (même règle que la bouche du
     maire, §4 sur les bouffées). */
  const breath = Math.sin(t * (1.9 + v.strain * 2.4)) * (0.010 + v.strain * 0.016);
  m.chest.scale.set(1 + breath * 0.6, 1 + breath, 1 + breath * 0.8);
  /* ── 5. LA MATRICE MONDE, DEPUIS LA RACINE, AVANT TOUTE CINÉMATIQUE INVERSE ── */
  m.man.updateMatrixWorld(true);

  /* ── 6. LES JAMBES, VERS DEUX PIEDS QUI NE BOUGENT PAS ── */
  const legPose = (leg, foot, side) => {
    R3.solveArm(shop._T, m.man, { sh: leg.hip, el: leg.knee }, foot, KNEE_OUT, side, LEG_UP, LEG_LOW);
    /* ⚠️ LA BOTTE RESTE À PLAT. Sans ce contre-pivot, elle suit le tibia : il
       marche sur la pointe dès qu'il fléchit, ce qui est la caricature exacte du
       personnage qui « patine ». On annule donc l'orientation accumulée, ce qui
       n'est possible que parce que la racine ne tourne jamais. */
    leg.knee.updateMatrixWorld(true);
    leg.knee.getWorldQuaternion(shop._q);
    leg.ankle.quaternion.copy(shop._q.invert());
  };
  legPose(m.legL, shop.feet.L, -1);
  legPose(m.legR, shop.feet.R, 1);

  /* ── 7. LES BRAS, VERS LA POIGNÉE. Les deux mains sont l'une au-dessus de
     l'autre sur le manche, paume contre le bois (voir `PALM`). ── */
  const tz = hT.z - PALM;
  R3.solveArm(shop._T, m.chest, m.armR, [hT.x + 0.010, hT.y + S.handGap, tz], 1, 1, ARM_UP, ARM_FORE);
  R3.solveArm(shop._T, m.chest, m.armL, [hT.x - 0.010, hT.y - S.handGap, tz], 1, -1, ARM_UP, ARM_FORE);

  /* ── LA TÊTE ET LE VISAGE. ⚠️ IL REGARDE SON TRAIT, PAS NOUS : un partenaire
     de travail qui fixe la caméra pendant qu'il scie est un mannequin. Le
     tangage du cou COMPENSE celui du buste, sinon se pencher lui met le nez dans
     la planche. ── */
  /* ⚠️⚠️ ON VISE UN ANGLE DE TÊTE **EN MONDE**, PAS UN ANGLE DE COU. Le premier
     jet composait un décalage relatif au buste : plus l'homme se voûtait, plus
     la tête basculait avec lui, et il finissait par regarder le plancher — ou,
     avec le signe inverse, le plafond. Ici on décide où la tête doit pointer
     (vingt degrés vers le bas, sur le trait) et le cou fait la différence.
     ⚠️ ET ON LA BORNE : un cou humain ne fléchit pas de plus de trente-cinq
     degrés, et le laisser aller, c'était le décrochement d'îlot que le banc a
     mesuré. Mieux vaut un regard approximatif qu'une tête détachée. */
  /* ⚠️⚠️⚠️ LE SIGNE A ÉTÉ FAUX AU PREMIER JET, ET C'EST UNE LEÇON QUI SE REPAIE :
     une rotation positive autour de X emmène le +Z local vers le BAS, donc
     « regarder son trait » est un angle POSITIF. Écrit négatif, l'homme levait
     le menton vers la charpente pendant qu'il sciait — et aucun contrôle
     numérique ne pouvait le dire, puisqu'une tête qui regarde en l'air est
     exactement aussi bien attachée qu'une tête qui regarde en bas. C'est la même
     famille que le tangage inversé de la caméra du maire : *un défaut de signe
     ne se voit que sur une image.*
     ⚠️ ON VISE UNE DÉCLINAISON DU REGARD **EN MONDE** (23° vers le bas), et le
     cou fait la différence avec le voûtement du dos. Un décalage relatif au
     buste ferait plonger le regard d'autant que l'homme se penche.
     ⚠️ ET ON LE BORNE : un cou ne fléchit ni ne s'étend indéfiniment, et le
     laisser aller décrochait la tête du tronc (deux îlots, mesurés). */
  const look = Math.max(-0.50, Math.min(0.45, 0.40 + 0.10 * ln.low - ln.pitch));
  m.neck.rotation.set(look, -0.10, 0);
  /* l'effort : les sourcils tombent, la bouche s'ouvre, la mâchoire serre au
     moment du trait. Trois signes, et c'est tout ce qu'un visage à cette taille
     peut porter (le maire en a huit parce qu'on le regarde à un mètre). */
  const eff = Math.max(0, Math.min(1, v.strain));
  m.browL.position.y = 0.074 - eff * 0.016; m.browR.position.y = 0.074 - eff * 0.016;
  m.browL.rotation.z = -0.16 * eff; m.browR.rotation.z = 0.16 * eff;
  m.mouth.scale.set(1 + eff * 0.35, 0.9 + eff * 3.4, 1);
  m.mouth.position.y = -0.086 - eff * 0.010;
  /* le clignement : une bouffée, pas un tirage par image */
  const bl = Math.max(0, 1 - Math.abs(((t * 0.31) % 1) - 0.5) * 26);
  for (const e of [m.eyeL, m.eyeR]) {
    e.lid.position.y = 0.044 - bl * 0.046 - eff * 0.008;
    e.iris.position.y = -0.002 - eff * 0.006;
  }

  /* ── NOUS. Même solveur, même poignée, et un corps qui avance : c'est la seule
     façon d'atteindre une poignée qui s'éloigne de 72 cm avec un bras de 63. ── */
  const pp = playerPost(hU.z, hU.y);
  shop.hands.us.position.set(S.eye[0], pp.shY, pp.shZ);
  shop.hands.us.updateMatrixWorld(true);
  const uz = hU.z + PALM;
  R3.solveArm(shop._T2, shop.hands.us, shop.hands.armR, [hU.x + 0.010, hU.y + S.handGap, uz], 1, 1, ARM_UP, ARM_FORE);
  R3.solveArm(shop._T2, shop.hands.us, shop.hands.armL, [hU.x - 0.010, hU.y - S.handGap, uz], 1, -1, ARM_UP, ARM_FORE);

  /* ── LA CHUTE. ⚠️ ELLE BASCULE SUR L'ARÊTE DU TRAIT (voir `buildBeam`), et son
     angle est piloté par l'ARRÊT de la mécanique, pas par un minuteur d'ici :
     deux horloges pour un même événement, c'est le §8 appliqué au temps.
     ⚠️⚠️ 2026-09-01 — LE RETOUR À ZÉRO SE LISSE, IL NE SAUTE PLUS. Signalé par
     Guillaume en jouant : « incohérences physiques après la découpe ». Le
     morceau tombé basculait bien pendant les 420 ms de la pause (`soft(5)`
     ci-dessous), mais dès que la planche suivante commençait, `dropWant`
     retombait à 0 et la branche `? 0 : dropWant` le reposait D'UN COUP —
     le chicot qui pendait encore se téléportait à plat dans l'image qui
     suit. Ce n'est pas la même famille que le trait de scie plus bas (qui,
     lui, doit sauter pour ne pas montrer une planche qui se répare) : ici
     rien ne « répare » rien, une charnière retourne juste à son repos, et un
     mouvement qu'on VOIT se figer d'un coup se lit pire qu'un mouvement qui
     continue. ── */
  const dropWant = s.hold > 0 && s.holdKind === "plank" ? 1.35
                 : s.holdKind === "break" ? 0.30 : 0;
  v.drop += (dropWant - v.drop) * soft(dropWant > v.drop ? (dropWant > 1 ? 5 : 12) : 10);
  shop.beam.drop.rotation.z = -v.drop;
  shop.beam.drop.position.y = -v.drop * 0.12;
  /* la fente : elle descend avec le trait et disparaît avec la planche neuve */
  shop.beam.kerf.scale.y = Math.max(0.001, v.cut);
  shop.beam.kerf.position.y = S.beamTop - (v.cut * S.beamH) / 2;

  /* ── LA SCIURE. ⚠️ ELLE SORT DU TRAIT ET ELLE EST PROPORTIONNELLE À CE QUI
     COUPE — donc à la VITESSE, pas à l'appui. Une lame coincée fume, elle ne
     projette pas : c'est la même règle que `SAW_BITE_BIND` dans la mécanique, et
     c'est ce qui rend le coincement lisible sans un mot. ── */
  const emit = s.hold > 0 || s.over ? 0 : Math.min(4, Math.round(sp * 4 * (1 - v.bind * 0.8)));
  const ch = shop.chips;
  for (let k = 0; k < emit; k++) {
    const i = ch.head; ch.head = (ch.head + 1) % ch.n;
    ch.pos[i * 3] = S.cutX + (Math.random() - 0.5) * 0.03;
    ch.pos[i * 3 + 1] = teeth - 0.01;
    ch.pos[i * 3 + 2] = v.bx * S.bladeTravel + (Math.random() - 0.5) * 0.5;
    ch.vel[i * 3] = (Math.random() - 0.5) * 0.5;
    ch.vel[i * 3 + 1] = 0.15 + Math.random() * 0.55;
    ch.vel[i * 3 + 2] = -Math.sign(s.bv || 1) * (0.3 + Math.random() * 0.9);
    ch.life[i] = 0.9 + Math.random() * 0.5;
  }
  for (let i = 0; i < ch.n; i++) {
    if (ch.life[i] <= 0) continue;
    ch.life[i] -= DT;
    ch.vel[i * 3 + 1] -= 3.4 * DT;
    ch.pos[i * 3] += ch.vel[i * 3] * DT;
    ch.pos[i * 3 + 1] += ch.vel[i * 3 + 1] * DT;
    ch.pos[i * 3 + 2] += ch.vel[i * 3 + 2] * DT;
    if (ch.life[i] <= 0 || ch.pos[i * 3 + 1] < 0.01) { ch.life[i] = 0; ch.pos[i * 3 + 1] = -8; }
  }
  ch.pts.geometry.attributes.position.needsUpdate = true;

  /* les motes du rai de lumière : elles montent lentement et repassent en bas.
     ⚠️ Elles ne dépendent de RIEN — c'est ce qui fait que l'atelier respire même
     quand la manche est finie. */
  const mo = shop.motes;
  for (let i = 0; i < mo.n; i++) {
    mo.pos[i * 3] += mo.vel[i * 3] * DT;
    mo.pos[i * 3 + 1] += mo.vel[i * 3 + 1] * DT;
    mo.pos[i * 3 + 2] += mo.vel[i * 3 + 2] * DT;
    if (mo.pos[i * 3 + 1] > 3.0) mo.pos[i * 3 + 1] = 0.35;
  }
  mo.pts.geometry.attributes.position.needsUpdate = true;

  /* la braise du poêle et la lanterne, qui palpitent très peu : un décor qui
     bouge sans raison est du bruit, un décor parfaitement figé est une image */
  shop.lights.forge.intensity = 0.62 + Math.sin(t * 3.1) * 0.05 + Math.sin(t * 7.7) * 0.03;
  shop.lights.lamp.intensity = 0.50 + Math.sin(t * 2.3) * 0.02;

  /* ── LE CADRAGE DU POSTE. ⚠️ LE VA-ET-VIENT EST AMORTI, LA DESCENTE NE L'EST
     PAS, et ce sont deux choses différentes : le premier est une oscillation à
     une pulsation par seconde (on l'atténue, sinon c'est le mal de mer), la
     seconde est le fait qu'on se baisse à mesure que le trait s'enfonce (on la
     suit en entier, sinon on finit par scier sans voir son trait). ── */
  const rawZ = pp.shZ + S.camBack;
  v.camZ += ((S.eye[2] + (rawZ - S.eye[2]) * S.camSurge) - v.camZ) * soft(14);
  v.camY += ((pp.shY + S.camUp + v.bob) - v.camY) * soft(10);
  const sh = v.shake * v.shake;
  return {
    cam: {
      pos: [S.eye[0] + S.camSide + Math.sin(t * 41) * 0.012 * sh,
            v.camY + Math.sin(t * 37) * 0.016 * sh,
            v.camZ],
      /* on vise le TRAIT, pas la lame : c'est lui qui avance, c'est lui qu'on
         regarde descendre, et le viser garde la fente au tiers bas du cadre
         quelle que soit la profondeur */
      /* ⚠️ ON VISE LE TRAIT LUI-MÊME (le point où les dents entrent dans le
         bois), PAS LE MILIEU DE LA LAME. Visé plus loin, le madrier tombait au
         ras du bord bas de l'image et l'entaille — la seule chose qui dit où en
         est la manche — sortait du cadre à mesure qu'elle se creusait. */
      look: [S.cutX - 0.02, teeth + 0.05, -0.12],
    },
    shake: v.shake,
    /* ce que l'interface a le droit de lire : rien de plus, et surtout rien qui
       ressemble à un verdict — celui-ci appartient à `scierie.js` */
    handY: hU.y, teeth,
  };
}
