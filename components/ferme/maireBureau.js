"use client";
/* ═══════════════════════════════════════════════════════════════════════════
   ZIP 481 — LE BUREAU DU MAIRE, CONSTRUIT INTÉGRALEMENT, EN CODE.
   ═══════════════════════════════════════════════════════════════════════════
   Demande de Guillaume : « la caméra doit pouvoir être bougée à l'intérieur du
   bureau, donc conçois-le intégralement, pas qu'une vue fixe ». Une caméra
   libre change tout : une vue fixe pardonne un mur peint en aplat derrière le
   fauteuil, une caméra libre va le regarder.

   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ POURQUOI ON A JETÉ `public/models/maire-bureau.glb`, ET C'EST LA LEÇON
   DE CE ZIP. Il est livré au 480, il est chargé par `MaireScene.js`, il pèse
   365 Ko — et il n'a JAMAIS ÉTÉ REGARDÉ. Ouvert dans un canevas cette passe, il
   montre un maire dont la tête, le torse, les bras, le tampon et le fauteuil
   sont tous DOUBLEMENT DÉCALÉS : les nœuds `rig_*` portent une translation
   monde et leurs enfants la portent une seconde fois, si bien que le maire
   flotte deux mètres derrière le mur du fond. Rien ne pouvait le dire : ni le
   build, ni `verify-syntax`, ni `verify-maire` (qui joue la mécanique et ne
   dessine rien), ni le bundle — un glTF est de la DONNÉE, et aucun banc de ce
   dépôt ne relit une donnée importée.
   ⚠️ C'est mot pour mot le §9 de `CLAUDE.md` sur le pipeline C : *« un asset
   importé ne se dégrade pas, il vieillit »* — sauf qu'ici il est né vieux, et
   que personne n'avait de moyen de s'en apercevoir.
   *Un décor qu'aucun banc ne sait relire doit être REGARDÉ le jour où il est
   livré ; à défaut, il doit être écrit dans le langage du dépôt.*

   ⚠️⚠️ CE FICHIER EST DONC DU PROCÉDURAL, exactement comme `fermeArt.js`, mais
   en trois dimensions : aucun fichier à charger, rien qui puisse manquer, tout
   réglable au nombre près, et les textures peintes du même geste que tout le
   reste du jeu — un canevas 2D, des `fillRect`, une `CanvasTexture`. Le §9
   autorise le bitmap depuis le 443 ; il ne l'impose nulle part, et ici le
   procédural gagne sans discussion.

   ───────────────────────────────────────────────────────────────────────────
   ⚠️ `THREE` EST PASSÉ EN PARAMÈTRE, JAMAIS IMPORTÉ. La bibliothèque est
   vendorisée en `<script>` (r128) : un `import` la tirerait une seconde fois
   dans le bundle Next, c'est-à-dire deux copies de three.js dans la même page —
   deux jeux de constantes, deux registres de matériaux, et des symptômes qui ne
   ressemblent à rien.

   ⚠️⚠️ ET RIEN ICI NE VIT DANS LA CLOSURE DE LA BOUCLE DE RENDU (piège n°1 de
   `CLAUDE.md`). `buildOffice` rend un OBJET — les pivots, les repères, les
   bornes — et `applyPose` / `applyFace` / `applyIdle` sont des fonctions de
   MODULE qui le reçoivent. La boucle de `MaireScene.js` ne déclare rien : elle
   appelle. C'est ce qui rend ce dessin regardable par autre chose que lui-même.

   Repère : +X à droite, +Y en haut, +Z vers la porte, donc vers NOUS. Le maire
   est en Z négatif, derrière son bureau, face à nous. Tout est en mètres.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️ LA CINÉMATIQUE DES BRAS ET LE GLISSEMENT DE POSE VIVENT DANS `rig3d.js`
   DEPUIS QU'IL Y A DEUX PERSONNAGES ARTICULÉS DANS CE JEU (le maire ici,
   Tristan à sa scie). Voir la note de `solveArm` plus bas : une loi des cosinus
   recopiée est une divergence en attente. */
import * as R3 from "./rig3d";

/* ⚠️ UN SEUL JEU DE NOMBRES POUR LA PIÈCE : ils bâtissent les murs ET bornent la
   caméra libre. Deux descriptions de la même pièce divergeraient au premier
   réglage (§8 de `CLAUDE.md`), et le symptôme serait une caméra qui traverse un
   mur qu'elle voit. */
export const ROOM = {
  x0: -3.6, x1: 3.6,          // 7,2 m de large
  z0: -4.7, z1: 2.9,          // 7,6 m de profond
  h: 3.9,                     // sous plafond
  wains: 1.06,                // hauteur de la boiserie basse
  deskC: -2.30,               // centre du plateau
  /* ⚠️ LA PROFONDEUR EST PASSÉE DE 1,12 À 1,00 LE 2026-08-31, ET C'EST UNE
     MESURE DE DÉGAGEMENT, PAS UN GOÛT. Le chant arrière tombait à z −2,86 pour
     un homme dont le ventre avance jusqu'à −2,835 : il était assis DANS son
     bureau de deux centimètres et demi en permanence, et de sept dès qu'il se
     penchait sur le tampon. Ça ne se voit pas de notre chaise — le meuble le
     cache — mais la caméra est LIBRE, et de trois quarts on voyait la veste
     entrer dans le bois. Douze centimètres de moins rendent le dégagement sans
     rien changer de la table de travail : le sous-main fait 72 cm de profond,
     il reste à l'aise sur un metre. */
  deskW: 2.30, deskD: 1.00, deskTop: 0.79,
  seatZ: -3.05,               // le fauteuil du maire
  /* ⚠️ LE FAUTEUIL EST À PORTÉE DE BRAS DU SOUS-MAIN, ET C'EST UN NOMBRE
     QU'ON A DÛ CALCULER PLUTÔT QUE CHOISIR : épaule à y 1,26 et z −2,99, main sur
     le cuir à y 0,83 et z −2,55, soit 0,61 m — pour un bras de 0,30 + 0,30. Reculé
     de quinze centimètres, il posait les mains DANS le meuble. *Un personnage
     assis se place par sa portée, jamais par l'aspect de la pièce vue de haut.* */
};

/* La palette vient des deux références : la seconde (Second Empire — boiseries
   crème et or, parquet à bâtons rompus, lustre à pampilles) donne l'ossature, la
   première (lampe verte, drapeau, fenêtre sur la place) donne les objets. */
const COL = {
  wallTop: 0xd9d0bd, wallLow: 0xeae3d6, gild: 0xc2a04a, gildDim: 0x8d7331,
  wood: 0x6a4425, woodDark: 0x452c17, woodWarm: 0x8a5a30,
  leather: 0x2c5a38, leatherHi: 0x417c4d,
  marble: 0xeae6dc, brass: 0xbb8f3c, brassDim: 0x876425,
  suit: 0x39424f, suitDark: 0x2a323d, shirt: 0xf1f0ea, tie: 0x283b68,
  skin: 0xd9a983, skinDark: 0xb98a68, hair: 0x807f7b, brow: 0x6d6259,
  sashB: 0x1e3f90, sashW: 0xf3f3ef, sashR: 0xb0202c,
  ink: 0x14181e, paper: 0xf4f0e3, chair: 0x5d2a2a,
};

/* ═══════════════════════════════════════════════════════════════════════════
   1. LES TEXTURES, PEINTES AU CANEVAS
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ C'EST LE SEUL ENDROIT OÙ CE DÉCOR GAGNE CONTRE UN RENDU BLENDER NON
   CALIBRÉ (§9 de `CLAUDE.md`, mesuré au 426 : écart-type 24,6 contre 47,7 en
   référence). Une texture peinte à la main porte son propre contraste ; un
   aplat éclairé par trois lampes n'en a aucun, et c'est exactement ce que
   montrait le GLB du 480.
   ⚠️ `ctx.fillText` EST INTERDIT DANS `fermeArt.js` (le faux canevas des bancs
   ne le connaît pas) — ici il est LÉGITIME : ce fichier ne tourne que dans un
   navigateur, il n'est relu par aucun `tools/render-*.mjs`, et un nom de maire
   gravé sur une plaque de bureau n'a pas d'autre moyen d'exister. La contrepartie
   est tenue : tout texte affiché vient de `L`, jamais d'une chaîne d'ici.
   ═══════════════════════════════════════════════════════════════════════════ */
function cv(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  return [c, g];
}
const hex = (n) => "#" + n.toString(16).padStart(6, "0");
/* ⚠️ UN GÉNÉRATEUR PAR TEXTURE, JAMAIS `Math.random` : une texture qui change à
   chaque ouverture de la scène n'est pas une texture, c'est un scintillement —
   et deux joueurs qui regardent la même audience verraient deux parquets. */
function rnd(seed) { let s = seed | 0 || 1; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

function texOf(THREE, c, rx, ry) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (rx || ry) t.repeat.set(rx || 1, ry || 1);
  t.anisotropy = 4;
  return t;
}

/* ── LE PARQUET À BÂTONS ROMPUS. ⚠️ IL BOUCLE SUR LUI-MÊME : la leçon du 434
   (« un motif de sol se juge assemblé, et sa PÉRIODE compte plus que ses
   détails ») vaut à l'identique en 3D — une couture visible tous les deux mètres
   dessine une seconde grille par-dessus la première. Le motif fait donc un
   nombre ENTIER de chevrons et se répète sans raccord. ── */
function texParquet(THREE) {
  const N = 256, [c, g] = cv(N, N), r = rnd(4211);
  g.fillStyle = "#5c3a1e"; g.fillRect(0, 0, N, N);
  const P = 64;                                    // le pas d'un chevron : 256 = 4 × 64
  for (let by = 0; by < N; by += P) {
    for (let bx = 0; bx < N; bx += P) {
      for (let k = 0; k < 2; k++) {
        g.save();
        g.translate(bx + P / 2, by + P / 2);
        g.rotate((k ? -1 : 1) * Math.PI / 4);
        const shade = 0.86 + r() * 0.28;
        const base = [0x8a, 0x5a, 0x30].map(v => Math.min(255, (v * shade) | 0));
        g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
        g.fillRect(k ? 1 : -P * 0.48, -P * 0.22, P * 0.47, P * 0.44);
        /* le fil du bois : trois traits par lame, jamais plus — à cette échelle
           un quatrième ne se voit pas et coûte une passe de dessin */
        g.globalAlpha = 0.18; g.fillStyle = "#3a2210";
        for (let i = 0; i < 3; i++) g.fillRect(k ? 1 : -P * 0.48, -P * 0.22 + (i + 0.5) * P * 0.14, P * 0.47, 1);
        g.globalAlpha = 1;
        g.restore();
      }
    }
  }
  return texOf(THREE, c, 6, 6);
}

/* ── LE MUR : un damas très pâle, presque uniquement du grain. ⚠️ LA LEÇON DU
   §8 (« la statistique qui compte n'est pas la moyenne ») : un mur d'aplat a un
   écart-type nul, donc il lit comme du carton quelle que soit sa couleur. ── */
function texWall(THREE) {
  const N = 128, [c, g] = cv(N, N), r = rnd(917);
  g.fillStyle = hex(COL.wallTop); g.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) {
    g.globalAlpha = 0.05 + r() * 0.07;
    g.fillStyle = r() < 0.5 ? "#ffffff" : "#8d8272";
    g.fillRect((r() * N) | 0, (r() * N) | 0, 1 + ((r() * 2) | 0), 1);
  }
  g.globalAlpha = 1;
  return texOf(THREE, c, 4, 2);
}

/* ── LE TAPIS : bordure, champ, médaillon. Trois anneaux, et c'est assez —
   au sol on ne lit qu'une silhouette et un contraste. ── */
function texRug(THREE) {
  const N = 256, [c, g] = cv(N, N);
  g.fillStyle = "#7a3230"; g.fillRect(0, 0, N, N);
  const band = (inset, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.strokeRect(inset, inset, N - inset * 2, N - inset * 2); };
  band(8, "#3f1a1c", 10); band(20, "#b99347", 4); band(30, "#3f1a1c", 3);
  g.fillStyle = "#5d2426"; g.beginPath(); g.ellipse(N / 2, N / 2, 78, 52, 0, 0, 7); g.fill();
  g.strokeStyle = "#b99347"; g.lineWidth = 3;
  g.beginPath(); g.ellipse(N / 2, N / 2, 78, 52, 0, 0, 7); g.stroke();
  g.beginPath(); g.ellipse(N / 2, N / 2, 52, 32, 0, 0, 7); g.stroke();
  g.fillStyle = "#b99347";
  for (let a = 0; a < 8; a++) {
    const t = (a / 8) * Math.PI * 2;
    g.beginPath(); g.ellipse(N / 2 + Math.cos(t) * 64, N / 2 + Math.sin(t) * 42, 7, 5, t, 0, 7); g.fill();
  }
  return texOf(THREE, c, 1, 1);
}

/* ── LES LIVRES DE LA BIBLIOTHÈQUE. Une rangée de dos, jamais deux fois la même
   largeur : c'est l'irrégularité qui fait lire « livres » et pas « rayures ». ── */
function texBooks(THREE) {
  /* ⚠️ 128 DE LARGE, PAS 256 : étirée sur 2,66 m de tablette, une planche de
     256 dos donne des livres d'un centimètre — une rayure, pas une bibliothèque.
     C'est la leçon de PÉRIODE du 434, transposée d'un sol à un meuble. */
  const W = 128, H = 64, [c, g] = cv(W, H), r = rnd(5501);
  g.fillStyle = "#241812"; g.fillRect(0, 0, W, H);
  const tint = ["#6e2a26", "#2f4a2c", "#2b3a5c", "#5a4322", "#4a2a3c", "#7a5a2a", "#37312b"];
  let x = 0;
  while (x < W) {
    const w = 7 + ((r() * 11) | 0), h = H - 4 - ((r() * 8) | 0);
    g.fillStyle = tint[(r() * tint.length) | 0];
    g.fillRect(x, H - h, w - 1, h);
    g.fillStyle = "rgba(0,0,0,.30)"; g.fillRect(x + w - 2, H - h, 1, h);
    if (r() < 0.55) { g.fillStyle = "#c2a04a"; g.fillRect(x + 1, H - h + 8 + ((r() * 10) | 0), w - 3, 2); }
    x += w;
  }
  return texOf(THREE, c, 3, 1);
}

/* ── LA VUE PAR LA FENÊTRE. C'est la première référence de Guillaume : une place
   pavée, des façades, du monde qui passe. ⚠️ ELLE PORTE LA MOITIÉ DE L'AMBIANCE
   DE LA PIÈCE — le maire est à contre-jour devant elle, donc c'est elle qui
   décide de la lumière qu'on lui voit dans le dos. ── */
function texTown(THREE) {
  const W = 512, H = 320, [c, g] = cv(W, H), r = rnd(3301);
  const sky = g.createLinearGradient(0, 0, 0, H * 0.55);
  sky.addColorStop(0, "#8fbcdd"); sky.addColorStop(1, "#d8e6ee");
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 7; i++) {                    // nuages
    const cx = r() * W, cy = 18 + r() * 60, s = 20 + r() * 40;
    g.fillStyle = "rgba(255,255,255,.72)";
    for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(cx + k * s * 0.5 - s, cy + (r() - 0.5) * 8, s * 0.6, s * 0.28, 0, 0, 7); g.fill(); }
  }
  /* les façades, du fond vers l'avant : deux rangs, le second plus sombre et
     plus grand — c'est la profondeur, et elle ne coûte qu'une boucle */
  const row = (y0, hMin, hMax, dim) => {
    let x = -10;
    while (x < W + 10) {
      const w = 34 + ((r() * 30) | 0), h = hMin + ((r() * (hMax - hMin)) | 0);
      const base = 96 + ((r() * 46) | 0);
      const k = dim ? 0.72 : 1;
      g.fillStyle = `rgb(${(base * k) | 0},${((base - 8) * k) | 0},${((base - 22) * k) | 0})`;
      g.fillRect(x, y0 - h, w, h);
      g.fillStyle = `rgba(60,44,38,${dim ? 0.55 : 0.42})`;                 // le toit
      g.fillRect(x - 2, y0 - h - 7, w + 4, 8);
      for (let fy = y0 - h + 14; fy < y0 - 14; fy += 20) {                 // les fenêtres
        for (let fx = x + 6; fx < x + w - 8; fx += 15) {
          g.fillStyle = r() < 0.22 ? "rgba(255,226,160,.85)" : "rgba(40,52,64,.72)";
          g.fillRect(fx, fy, 7, 11);
        }
      }
      x += w + 2;
    }
  };
  /* ⚠️ HAUTEURS DIVISÉES PAR DEUX APRÈS AVOIR REGARDÉ : à 130-160 px sur 320,
     les façades montaient jusqu'au ciel et Valley Town ressemblait à un centre
     d'affaires. C'est une petite ville de province ; elle a deux étages. */
  row(H * 0.66, 34, 62, true);
  row(H * 0.76, 44, 84, false);
  /* le pavé, en perspective grossière : des bandes qui s'écartent */
  g.fillStyle = "#9a978f"; g.fillRect(0, H * 0.74, W, H * 0.26);
  for (let i = 0; i < 26; i++) {
    const t = i / 26, y = H * 0.74 + t * t * H * 0.26;
    g.fillStyle = `rgba(120,118,112,${0.30 + t * 0.3})`;
    g.fillRect(0, y, W, 1 + t * 3);
  }
  for (let i = 0; i < 22; i++) {                   // les passants
    const t = r(), y = H * 0.76 + t * t * H * 0.22, s = 5 + t * 16;
    g.fillStyle = `rgba(${40 + r() * 60 | 0},${40 + r() * 50 | 0},${50 + r() * 60 | 0},.85)`;
    g.fillRect(r() * W, y - s, Math.max(2, s * 0.34), s);
  }
  return texOf(THREE, c, 1, 1);
}

/* ── DEUX TABLEAUX DE MAIRIE : une scène d'histoire, une allégorie. Ils ne
   racontent rien de précis et c'est voulu — à cette taille, ce qu'on lit est une
   composition et un vernis, pas un sujet. ── */
function texPaint(THREE, kind) {
  const W = 192, H = 240, [c, g] = cv(W, H), r = rnd(kind === "hist" ? 7717 : 8823);
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, kind === "hist" ? "#6f6142" : "#57647a");
  bg.addColorStop(1, kind === "hist" ? "#2e2718" : "#242c3a");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  if (kind === "hist") {
    g.fillStyle = "rgba(210,190,150,.35)"; g.beginPath(); g.ellipse(W * 0.5, H * 0.3, 70, 52, 0, 0, 7); g.fill();
    for (let i = 0; i < 16; i++) {                 // la petite foule en habits
      const x = 12 + r() * (W - 24), y = H * 0.55 + r() * H * 0.34, s = 26 + r() * 22;
      g.fillStyle = ["#2b2a35", "#4a2b24", "#3a3a2a", "#1f2733"][(r() * 4) | 0];
      g.fillRect(x, y - s, s * 0.34, s);
      g.fillStyle = "#d9b48c"; g.fillRect(x + s * 0.06, y - s - s * 0.16, s * 0.22, s * 0.18);
    }
  } else {
    g.fillStyle = "rgba(226,214,186,.8)"; g.fillRect(W * 0.36, H * 0.24, W * 0.24, H * 0.56);
    g.fillStyle = "#b0202c"; g.fillRect(W * 0.30, H * 0.16, W * 0.10, H * 0.30);
    g.fillStyle = "#1e3f90"; g.fillRect(W * 0.58, H * 0.18, W * 0.10, H * 0.28);
  }
  g.fillStyle = "rgba(60,44,20,.30)"; g.fillRect(0, 0, W, H);      // le vernis
  return texOf(THREE, c, 1, 1);
}

/* ── LE SOUS-MAIN DE CUIR VERT, AVEC SON FILET DORÉ. ── */
function texBlotter(THREE) {
  const W = 256, H = 128, [c, g] = cv(W, H), r = rnd(6109);
  g.fillStyle = hex(COL.leather); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 4000; i++) {                 // le grain du cuir
    g.globalAlpha = 0.05 + r() * 0.08;
    g.fillStyle = r() < 0.5 ? "#000000" : "#7fd08e";
    g.fillRect((r() * W) | 0, (r() * H) | 0, 1, 1);
  }
  g.globalAlpha = 1;
  g.strokeStyle = "#c2a04a"; g.lineWidth = 2; g.strokeRect(7, 7, W - 14, H - 14);
  g.lineWidth = 1; g.strokeRect(12, 12, W - 24, H - 24);
  return texOf(THREE, c, 1, 1);
}

/* ── LA PLAQUE DE BUREAU, ET C'EST LE SEUL TEXTE CUIT DE TOUT LE DÉCOR. Il est
   BILINGUE parce qu'il est peint au moment où la scène s'ouvre, avec `L` en
   main : un sprite baké dans `fermeArt.js` ne pourrait pas l'être (§4). ── */
function texPlate(THREE, label, name) {
  const W = 256, H = 64, [c, g] = cv(W, H);
  g.fillStyle = "#c9a34a"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#a9832e"; g.fillRect(0, 0, W, 4); g.fillRect(0, H - 5, W, 5);
  g.fillStyle = "#2b2416";
  g.font = "bold 20px Georgia, serif"; g.textAlign = "center";
  g.fillText(String(label || "").toUpperCase().slice(0, 22), W / 2, 27);
  g.font = "16px Georgia, serif";
  g.fillText(String(name || "").slice(0, 24), W / 2, 49);
  return texOf(THREE, c, 1, 1);
}

/* ── L'ÉCUSSON DE LA COMMUNE, celui du drapeau de la référence. ── */
function texArms(THREE) {
  const N = 128, [c, g] = cv(N, N);
  g.fillStyle = "#f2efe6"; g.fillRect(0, 0, N, N);
  g.fillStyle = "#2f6b3a"; g.beginPath();
  g.moveTo(24, 18); g.lineTo(104, 18); g.lineTo(104, 74); g.quadraticCurveTo(64, 116, 24, 74); g.closePath(); g.fill();
  g.fillStyle = "#f2efe6"; g.fillRect(24, 44, 80, 10);
  g.fillStyle = "#c2a04a";
  g.beginPath(); g.moveTo(64, 24); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; g.lineTo(64 + Math.cos(a) * 13, 34 + Math.sin(a) * 13); } g.closePath(); g.fill();
  g.fillStyle = "#8fbcdd"; g.fillRect(34, 62, 60, 6);
  return texOf(THREE, c, 1, 1);
}

/* ── LE « ! » QUI LUI POUSSE SUR LA TÊTE QUAND ON CLAQUE LA PORTE. Demande de
   Guillaume, mot pour mot. ⚠️ IL EST EN 3D, PAS EN HTML : posé au-dessus de sa
   tête, il suit la caméra libre sans qu'on ait à projeter quoi que ce soit, et
   il reste juste quand on regarde la scène depuis la porte. ── */
function texBang(THREE) {
  const N = 128, [c, g] = cv(N, N);
  g.clearRect(0, 0, N, N);
  g.fillStyle = "rgba(20,16,12,.55)";
  g.beginPath(); g.ellipse(64, 70, 34, 40, 0, 0, 7); g.fill();
  g.fillStyle = "#f6e39a"; g.beginPath(); g.ellipse(64, 64, 32, 38, 0, 0, 7); g.fill();
  g.fillStyle = "#7a2418";
  g.fillRect(56, 30, 16, 38); g.fillRect(56, 76, 16, 16);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. LES BRIQUES. Six fonctions, et tout le bureau est bâti avec.
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ ON PARTAGE LES GÉOMÉTRIES ET LES MATÉRIAUX PAR CLÉ. Une boiserie, c'est
   quatre-vingts panneaux : quatre-vingts `BoxGeometry` et quatre-vingts
   matériaux, c'est quatre-vingts allocations GPU pour un seul cube. Le cache
   ramène la pièce entière à une trentaine de ressources — et c'est ce qui la
   rend ouvrable sur une tablette, où le contexte WebGL est chiche.
   ═══════════════════════════════════════════════════════════════════════════ */
function maker(THREE, root, junk) {
  const geo = new Map(), mat = new Map();
  const G = (k, make) => { let g = geo.get(k); if (!g) { g = make(); geo.set(k, g); junk.push(g); } return g; };
  const M = (k, make) => { let m = mat.get(k); if (!m) { m = make(); mat.set(k, m); junk.push(m); } return m; };

  const lam = (col, o) => M("l" + col + JSON.stringify(o || 0), () => new THREE.MeshLambertMaterial({ color: col, ...(o || {}) }));
  const pho = (col, shin, o) => M("p" + col + shin + JSON.stringify(o || 0), () => new THREE.MeshPhongMaterial({ color: col, shininess: shin, specular: 0x333333, ...(o || {}) }));
  const texMat = (key, tex, o) => M("t" + key, () => new THREE.MeshLambertMaterial({ map: tex, ...(o || {}) }));

  const boxG = (w, h, d) => G(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
  const cylG = (rt, rb, h, seg) => G(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg || 12));
  const sphG = (r, seg) => G(`s${r}|${seg}`, () => new THREE.SphereGeometry(r, seg || 14, (seg || 14) / 2));
  const plnG = (w, h) => G(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h));

  /* `at` place, tourne et accroche en une ligne. Tout le fichier passe par lui,
     donc un décalage de repère se corrige à UN endroit. */
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
   3. LA PIÈCE
   ═══════════════════════════════════════════════════════════════════════════ */
function buildRoom(THREE, K, tex) {
  const { lam, pho, texMat, box, cyl, sph, pln, grp } = K;
  const R = ROOM, W = R.x1 - R.x0, D = R.z1 - R.z0, cx = (R.x0 + R.x1) / 2, cz = (R.z0 + R.z1) / 2;

  const mWallTop = texMat("wall", tex.wall);
  const mWallLow = lam(COL.wallLow);
  const mGild = pho(COL.gild, 60);
  const mWood = lam(COL.wood);
  const mWoodD = lam(COL.woodDark);

  /* ── LE SOL. Le parquet est une texture répétée SIX fois : à un seul motif de
     7 m, chaque lame ferait vingt centimètres de large et la pièce lirait comme
     une maquette. ── */
  pln(W, D, texMat("parq", tex.parquet), cx, 0, cz, -Math.PI / 2);
  /* le tapis, posé à un millimètre au-dessus — un z-fighting sur un tapis se
     voit à chaque mouvement de caméra, et c'est le genre de défaut qu'on
     n'attribue jamais à sa cause */
  pln(5.0, 4.4, texMat("rug", tex.rug), 0, 0.004, -1.55, -Math.PI / 2);

  /* ── LE PLAFOND À CAISSONS. ⚠️ TROIS BOÎTES PAR CAISSON, PAS UN MODÈLE : à
     3,9 m de haut on ne lit qu'un quadrillage et une ombre. ── */
  pln(W, D, lam(0xe9e6de), cx, R.h, cz, Math.PI / 2);
  for (let i = -2; i <= 2; i++) box(0.09, 0.11, D, mWallLow, i * 1.35, R.h - 0.05, cz);
  for (let j = -2; j <= 2; j++) box(W, 0.11, 0.09, mWallLow, cx, R.h - 0.05, cz + j * 1.4);
  /* la corniche : deux bandes, une dorée */
  const cornice = (w, h, d, x, y, z, ry) => { box(w, h, d, mWallLow, x, y, z, 0, ry || 0); box(w, 0.045, d + 0.03, mGild, x, y - h / 2 + 0.02, z, 0, ry || 0); };
  cornice(W, 0.20, 0.16, cx, R.h - 0.12, R.z0 + 0.08);
  cornice(W, 0.20, 0.16, cx, R.h - 0.12, R.z1 - 0.08);
  cornice(0.16, 0.20, D, R.x0 + 0.08, R.h - 0.12, cz);
  cornice(0.16, 0.20, D, R.x1 - 0.08, R.h - 0.12, cz);

  /* ── LES MURS. Chaque mur est : un aplat texturé en haut, une boiserie en bas,
     une plinthe, et une rangée de panneaux moulurés. C'est la rangée de panneaux
     qui fait toute la différence avec le GLB du 480 — elle donne au mur une
     PÉRIODE, donc une échelle, donc une pièce plutôt qu'une boîte. ── */
  const wainscot = (len, x, z, ry) => {
    const g = grp(x, 0, z);
    g.rotation.y = ry;
    box(len, R.wains, 0.07, mWallLow, 0, R.wains / 2, 0.035, 0, 0, 0, g);
    box(len, 0.14, 0.10, mWoodD, 0, 0.07, 0.05, 0, 0, 0, g);          // plinthe
    box(len, 0.06, 0.13, mGild, 0, R.wains, 0.055, 0, 0, 0, g);       // cimaise
    const n = Math.max(2, Math.round(len / 0.92));
    const pw = len / n;
    for (let i = 0; i < n; i++) {
      const px = -len / 2 + pw * (i + 0.5);
      box(pw - 0.16, R.wains - 0.42, 0.035, lam(0xf1ece1), px, R.wains / 2 - 0.02, 0.075, 0, 0, 0, g);
      /* le filet doré : quatre traits, et c'est ce qui accroche la lumière
         rasante de la lampe — un panneau sans filet reste plat sous toute
         lumière, c'est la règle de l'écart-type du §8 */
      const fw = pw - 0.16, fh = R.wains - 0.42;
      box(fw, 0.012, 0.012, mGild, px, R.wains / 2 - 0.02 + fh / 2 - 0.05, 0.095, 0, 0, 0, g);
      box(fw, 0.012, 0.012, mGild, px, R.wains / 2 - 0.02 - fh / 2 + 0.05, 0.095, 0, 0, 0, g);
      box(0.012, fh - 0.10, 0.012, mGild, px - fw / 2 + 0.05, R.wains / 2 - 0.02, 0.095, 0, 0, 0, g);
      box(0.012, fh - 0.10, 0.012, mGild, px + fw / 2 - 0.05, R.wains / 2 - 0.02, 0.095, 0, 0, 0, g);
    }
    return g;
  };
  /* les quatre plans de mur */
  pln(W, R.h, mWallTop, cx, R.h / 2, R.z0, 0, 0, 0);
  pln(W, R.h, mWallTop, cx, R.h / 2, R.z1, 0, Math.PI, 0);
  pln(D, R.h, mWallTop, R.x0, R.h / 2, cz, 0, Math.PI / 2, 0);
  pln(D, R.h, mWallTop, R.x1, R.h / 2, cz, 0, -Math.PI / 2, 0);
  wainscot(W, cx, R.z0, 0);
  wainscot(W, cx, R.z1, Math.PI);
  wainscot(D, R.x0, cz, Math.PI / 2);
  wainscot(D, R.x1, cz, -Math.PI / 2);

  /* ── LES PILASTRES CANNELÉS de la seconde référence. Quatre, aux angles du
     fond : ils encadrent la fenêtre et donnent au maire un fond d'architecture
     plutôt qu'un mur. ── */
  const pilaster = (x, z) => {
    const g = grp(x, 0, z);
    box(0.34, 0.20, 0.30, mGild, 0, 0.10, 0, 0, 0, 0, g);
    box(0.30, R.h - 0.62, 0.26, lam(0xe4ded1), 0, R.h / 2 - 0.1, 0, 0, 0, 0, g);
    for (let i = -1; i <= 1; i++) cyl(0.022, 0.022, R.h - 0.9, lam(0xd2cabb), i * 0.08, R.h / 2 - 0.1, 0.13, 0, 0, 0, g, 8);
    box(0.40, 0.16, 0.34, mGild, 0, R.h - 0.42, 0, 0, 0, 0, g);       // chapiteau
    sph(0.055, mGild, 0, R.h - 0.30, 0.10, g, 8);
    return g;
  };
  pilaster(-1.85, R.z0 + 0.20); pilaster(1.85, R.z0 + 0.20);
  pilaster(R.x0 + 0.22, -1.2); pilaster(R.x1 - 0.22, -1.2);

  /* ═════ LA FENÊTRE, ET C'EST LA LUMIÈRE DE LA SCÈNE ═════
     ⚠️ LE MAIRE EST À CONTRE-JOUR DEVANT ELLE (parti pris hérité du 480, et il
     est juste : c'est ce qui donne au visage l'ombre qui rend les sourcils
     lisibles). Elle est donc CENTRÉE derrière lui, pas dans un coin. */
  const winW = 2.6, winH = 2.35, winY = 0.92, wz = R.z0 + 0.02;
  pln(winW, winH, texMat("town", tex.town), 0, winY + winH / 2, wz + 0.01);
  /* l'embrasure et les meneaux */
  const mFrame = lam(COL.woodWarm);
  box(winW + 0.34, 0.20, 0.22, mFrame, 0, winY + winH + 0.10, wz + 0.10);
  box(winW + 0.34, 0.18, 0.30, mFrame, 0, winY - 0.09, wz + 0.13);     // l'appui
  box(0.18, winH + 0.30, 0.22, mFrame, -winW / 2 - 0.13, winY + winH / 2, wz + 0.10);
  box(0.18, winH + 0.30, 0.22, mFrame, winW / 2 + 0.13, winY + winH / 2, wz + 0.10);
  box(0.09, winH, 0.10, mFrame, 0, winY + winH / 2, wz + 0.06);        // meneau
  box(winW, 0.09, 0.10, mFrame, 0, winY + winH * 0.62, wz + 0.06);     // traverse
  /* le vitrage : à peine visible, mais il attrape le soleil et c'est lui qui
     dit « il y a une vitre » quand la caméra passe de biais */
  pln(winW, winH, M_glass(THREE, K), 0, winY + winH / 2, wz + 0.07);
  /* les rideaux, deux pans lourds — ils cadrent le maire */
  const mCurt = lam(0x1d3626);
  for (const sx of [-1, 1]) {
    const g = grp(sx * (winW / 2 + 0.36), 0, wz + 0.20);
    box(0.32, winH + 0.62, 0.16, mCurt, 0, (winH + 0.62) / 2 + winY - 0.28, 0, 0, 0, sx * 0.03, g);
    for (let i = 0; i < 4; i++) box(0.035, winH + 0.5, 0.035, lam(0x1b3423), -0.16 + i * 0.11, (winH + 0.5) / 2 + winY - 0.24, 0.10, 0, 0, sx * 0.03, g);
  }
  box(winW + 1.5, 0.07, 0.07, mGild, 0, winY + winH + 0.30, wz + 0.22);  // la tringle
  sph(0.07, mGild, -(winW / 2 + 0.78), winY + winH + 0.30, wz + 0.22, null, 8);
  sph(0.07, mGild, (winW / 2 + 0.78), winY + winH + 0.30, wz + 0.22, null, 8);

  /* ── LE MUR DE GAUCHE : deux tableaux et un buste sur sa gaine. ── */
  const frame = (tx, w, h, x, y, z, ry) => {
    const g = grp(x, y, z); g.rotation.y = ry;
    box(w + 0.16, h + 0.16, 0.07, mGild, 0, 0, 0, 0, 0, 0, g);
    box(w + 0.05, h + 0.05, 0.03, lam(COL.gildDim), 0, 0, 0.04, 0, 0, 0, g);
    pln(w, h, texMat("pt" + tx.uuid, tx), 0, 0, 0.062, 0, 0, 0, g);
    return g;
  };
  frame(tex.paintA, 1.05, 1.35, R.x0 + 0.09, 2.30, -2.55, Math.PI / 2);
  frame(tex.paintB, 0.85, 1.15, R.x0 + 0.09, 2.20, -0.85, Math.PI / 2);
  {
    const g = grp(R.x0 + 0.62, 0, -3.55);
    box(0.52, 1.15, 0.52, lam(COL.woodDark), 0, 0.575, 0, 0, 0, 0, g);
    box(0.60, 0.07, 0.60, mGild, 0, 1.16, 0, 0, 0, 0, g);
    const mMar = pho(COL.marble, 24);
    cyl(0.16, 0.20, 0.20, mMar, 0, 1.28, 0, 0, 0, 0, g, 12);
    box(0.30, 0.34, 0.24, mMar, 0, 1.53, 0, 0, 0, 0, g);
    sph(0.155, mMar, 0, 1.80, 0.01, g, 14);
    box(0.20, 0.16, 0.10, mMar, 0, 1.86, -0.06, 0, 0, 0, g);           // le chignon
  }

  /* ── LE MUR DE DROITE : la bibliothèque, l'écusson, et la pendule. ── */
  {
    const g = grp(R.x1 - 0.30, 0, -2.10);
    g.rotation.y = -Math.PI / 2;
    box(2.90, 2.55, 0.46, lam(COL.woodDark), 0, 1.30, 0, 0, 0, 0, g);
    box(3.06, 0.16, 0.56, mWood, 0, 2.60, 0, 0, 0, 0, g);              // la corniche du meuble
    box(3.06, 0.12, 0.54, mWood, 0, 0.06, 0, 0, 0, 0, g);
    for (let r0 = 0; r0 < 4; r0++) {
      const y = 0.46 + r0 * 0.55;
      box(2.72, 0.05, 0.40, mWood, 0, y - 0.03, 0.03, 0, 0, 0, g);     // la tablette
      pln(2.66, 0.44, texMat("bk", tex.books), 0, y + 0.22, 0.21, 0, 0, 0, g);
    }
    for (let i = -1; i <= 1; i += 2) box(0.09, 2.45, 0.50, mWood, i * 1.42, 1.30, 0.01, 0, 0, 0, g);
    box(0.09, 2.45, 0.50, mWood, 0, 1.30, 0.01, 0, 0, 0, g);
  }
  pln(0.62, 0.62, texMat("arms", tex.arms), R.x1 - 0.06, 3.05, -2.10, 0, -Math.PI / 2, 0);
  {                                                                     // la pendule de la cheminée
    const g = grp(R.x1 - 0.14, 1.62, 0.35); g.rotation.y = -Math.PI / 2;
    cyl(0.19, 0.19, 0.09, mGild, 0, 0, 0, Math.PI / 2, 0, 0, g, 18);
    pln(0.30, 0.30, lam(0xf1ece1), 0, 0, 0.055, 0, 0, 0, g);
    box(0.012, 0.11, 0.012, lam(COL.ink), 0, 0.045, 0.065, 0, 0, 0, g);
    box(0.012, 0.08, 0.012, lam(COL.ink), 0.03, 0.02, 0.065, 0, 0, -0.9, g);
  }

  /* ── LA PORTE, sur le mur d'entrée, DERRIÈRE nous. Elle existe pour une seule
     raison, et c'est la demande de Guillaume : il faut pouvoir la claquer, donc
     il faut la voir claquer. ── */
  const door = grp(1.55, 0, R.z1 - 0.06);
  box(1.24, 2.44, 0.16, mGild, 0, 1.24, 0.02, 0, 0, 0, door);
  const leaf = grp(-0.55, 0, 0.02, door);                               // pivot au gond
  box(1.02, 2.28, 0.09, lam(COL.woodWarm), 0.51, 1.16, 0, 0, 0, 0, leaf);
  box(0.72, 0.86, 0.03, lam(0xe4dccd), 0.51, 1.62, 0.055, 0, 0, 0, leaf);
  box(0.72, 0.66, 0.03, lam(0xe4dccd), 0.51, 0.68, 0.055, 0, 0, 0, leaf);
  sph(0.055, pho(COL.brass, 90), 0.94, 1.12, 0.09, leaf, 10);

  /* ── LE LUSTRE. Six bras, six bougies, une couronne : à cette taille c'est
     tout ce qu'on lit, et c'est ce qui fait « mairie » plutôt que « bureau ». ── */
  const chand = grp(0, 0, -1.5);
  cyl(0.03, 0.03, 0.62, mGild, 0, R.h - 0.31, 0, 0, 0, 0, chand, 8);
  cyl(0.30, 0.34, 0.06, mGild, 0, R.h - 0.64, 0, 0, 0, 0, chand, 16);
  const mFlame = lam(0xffe6a8, { emissive: 0xffbb55, emissiveIntensity: 1 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2, r0 = 0.46;
    const x = Math.cos(a) * r0, z = Math.sin(a) * r0;
    cyl(0.014, 0.014, 0.50, mGild, x * 0.62, R.h - 0.66, z * 0.62, Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6, chand, 6);
    cyl(0.035, 0.045, 0.20, lam(0xf2ecdc), x, R.h - 0.86, z, 0, 0, 0, chand, 8);
    sph(0.045, mFlame, x, R.h - 0.72, z, chand, 8);
    for (let k = 0; k < 3; k++) sph(0.018, lam(0xdff0fa, { transparent: true, opacity: 0.75 }), x * 0.8 + (k - 1) * 0.05, R.h - 1.02, z * 0.8, chand, 6);
  }

  return { door: leaf, chand, flame: mFlame };
}
function M_glass(THREE, K) {
  return K.lam(0xcfe6f4, { transparent: true, opacity: 0.13 });
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. LE BUREAU ET CE QU'IL Y A DESSUS
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ CHAQUE OBJET POSÉ ICI EST UNE RÉPLIQUE DE L'ARBRE. Ce n'est pas de la
   décoration : la pile de dossiers ficelés est le pont sud du nœud `m3`, le
   rouleau est celui de Kerguélen qu'on déroule au nœud `m5`, le tampon est la
   fin, le stylo est ce avec quoi il joue quand il n'écoute plus. Un décor dont
   rien n'est nommé dans le texte est un fond d'écran.
   ═══════════════════════════════════════════════════════════════════════════ */
function buildDesk(THREE, K, tex, plateTex) {
  const { lam, pho, texMat, box, cyl, sph, pln, grp } = K;
  const R = ROOM, top = R.deskTop, zc = R.deskC;
  const mWood = lam(COL.wood), mDark = lam(COL.woodDark), mGild = pho(COL.gild, 60), mBrass = pho(COL.brass, 90);

  const desk = grp(0, 0, 0);
  /* le plateau, son chant doré, et le sous-main de cuir */
  box(R.deskW, 0.075, R.deskD, mWood, 0, top - 0.037, zc, 0, 0, 0, desk);
  box(R.deskW + 0.05, 0.028, R.deskD + 0.05, mGild, 0, top - 0.082, zc, 0, 0, 0, desk);
  pln(1.44, 0.72, texMat("blot", tex.blotter), 0, top + 0.003, zc, -Math.PI / 2, 0, 0, desk);

  /* deux caissons, trois tiroirs chacun, boutons de laiton. ⚠️ LES TIROIRS SONT
     DES BOÎTES EN RETRAIT, PAS UNE TEXTURE : la caméra libre passe à cinquante
     centimètres du meuble, et une rainure peinte se voit à cette distance. */
  for (const sx of [-1, 1]) {
    const g = grp(sx * 0.79, 0, zc, desk);
    box(0.66, top - 0.09, R.deskD - 0.06, mDark, 0, (top - 0.09) / 2, 0, 0, 0, 0, g);
    for (let i = 0; i < 3; i++) {
      const y = 0.16 + i * 0.21;
      box(0.58, 0.185, 0.03, mWood, 0, y, (R.deskD - 0.06) / 2 + 0.005, 0, 0, 0, g);
      box(0.50, 0.115, 0.012, lam(COL.woodWarm), 0, y, (R.deskD - 0.06) / 2 + 0.020, 0, 0, 0, g);
      sph(0.026, mBrass, 0, y, (R.deskD - 0.06) / 2 + 0.035, g, 10);
    }
    box(0.70, 0.07, R.deskD, mGild, 0, top - 0.13, 0, 0, 0, 0, g);
  }
  box(R.deskW - 0.10, 0.30, 0.05, mWood, 0, top - 0.26, zc + R.deskD / 2 - 0.03, 0, 0, 0, desk);

  /* ── LA LAMPE DE BANQUIER, et c'est la SEULE source chaude du bureau. Elle est
     à gauche, comme sur la première référence, pour que son halo tombe sur les
     dossiers et pas sur son visage — il doit rester à contre-jour. ── */
  const lamp = grp(-0.82, top, zc - 0.10, desk);
  cyl(0.10, 0.12, 0.026, mBrass, 0, 0.013, 0, 0, 0, 0, lamp, 14);
  cyl(0.014, 0.014, 0.30, mBrass, 0, 0.17, 0, 0, 0, 0, lamp, 8);
  const shade = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x1f6b3d));
  K.at(shade, 0, 0.315, 0, Math.PI, 0, 0, lamp);
  shade.scale.set(1.35, 0.62, 1);
  sph(0.055, lam(0xfff0c8, { emissive: 0xffcc77, emissiveIntensity: 1 }), 0, 0.285, 0, lamp, 10);

  /* ── LA PILE DE DOSSIERS FICELÉS : le pont sud, celui qu'il tapote au nœud m3.
     C'est l'objet le plus important de la table, et il est à sa DROITE, à portée
     d'index, exactement comme le texte le dit. ── */
  const files = grp(0.72, top, zc - 0.18, desk);
  for (let i = 0; i < 5; i++) {
    box(0.34 - i * 0.006, 0.035, 0.25 - i * 0.004, lam([0xb9a377, 0xa8946c, 0xc2ac7f, 0x9d8a63, 0xb09b71][i]),
        (i % 2 ? 0.008 : -0.006), 0.018 + i * 0.036, (i % 2 ? -0.006 : 0.005), 0, (i % 2 ? 0.03 : -0.02), 0, files);
  }
  /* ⚠️ LA FICELLE EST FINE. Une ficelle de deux centimètres, c'est une sangle de
     malle : la pile lisait comme un colis, pas comme un dossier oublié depuis
     deux ans. */
  box(0.012, 0.19, 0.27, lam(0x7a2a22), 0, 0.09, 0, 0, 0, 0, files);
  box(0.36, 0.19, 0.012, lam(0x7a2a22), 0, 0.09, 0, 0, 0, 0, files);

  /* ── LA PLAQUE, LE TÉLÉPHONE, LE GLOBE, L'ENCRIER, LE DRAPEAU DE TABLE ── */
  const plate = grp(0.30, top, zc + 0.36, desk);
  box(0.44, 0.10, 0.05, mBrass, 0, 0.05, 0, -0.32, 0, 0, plate);
  pln(0.42, 0.095, texMat("plate", plateTex), 0, 0.051, 0.026, -0.32, 0, 0, plate);
  box(0.48, 0.02, 0.11, mBrass, 0, 0.01, 0, 0, 0, 0, plate);

  const phone = grp(-0.92, top, zc + 0.30, desk);
  box(0.20, 0.055, 0.14, lam(0x1c1c20), 0, 0.028, 0, 0, 0, 0, phone);
  cyl(0.028, 0.028, 0.045, lam(0x26262c), 0, 0.075, -0.02, 0, 0, 0, phone, 10);
  box(0.24, 0.045, 0.05, lam(0x1c1c20), 0, 0.10, 0.03, 0, 0, 0.06, phone);

  const ink = grp(0.44, top, zc - 0.02, desk);
  box(0.19, 0.022, 0.11, lam(COL.woodDark), 0, 0.011, 0, 0, 0, 0, ink);
  cyl(0.030, 0.034, 0.05, lam(0x1b2430), -0.045, 0.047, 0, 0, 0, 0, ink, 10);
  cyl(0.030, 0.034, 0.05, lam(0x2a1b17), 0.045, 0.047, 0, 0, 0, 0, ink, 10);

  const globe = grp(-1.62, 0, zc - 0.30);
  cyl(0.19, 0.23, 0.05, lam(COL.woodDark), 0, 0.025, 0, 0, 0, 0, globe, 14);
  cyl(0.035, 0.035, 0.72, lam(COL.woodWarm), 0, 0.40, 0, 0, 0, 0, globe, 10);
  sph(0.24, lam(0x3f7fa8), 0, 1.00, 0, globe, 16);
  for (const p of [[0.10, 1.06, 0.20], [-0.14, 0.96, 0.16], [0.16, 0.90, -0.14]])
    sph(0.085, lam(0x6d8f4a), p[0], p[1], p[2], globe, 10);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.012, 6, 24), pho(COL.brass, 90));
  K.at(ring, 0, 1.00, 0, 0, 0, 0.38, globe);

  /* le drapeau de la commune, sur pied, à sa droite */
  const flag = grp(1.52, 0, zc - 0.55);
  cyl(0.15, 0.19, 0.05, lam(COL.woodDark), 0, 0.025, 0, 0, 0, 0, flag, 12);
  cyl(0.022, 0.022, 2.35, lam(COL.woodWarm), 0, 1.20, 0, 0, 0, 0, flag, 8);
  sph(0.055, pho(COL.gild, 80), 0, 2.42, 0, flag, 10);
  for (let i = 0; i < 3; i++)
    box(0.21, 0.64, 0.010, lam([0x2f6b3a, 0xf2efe6, 0x2b53a8][i]), 0.13 + i * 0.21, 1.82, 0.02 + i * 0.005, 0, 0, 0, flag);
  pln(0.20, 0.20, K.texMat("arms2", tex.arms), 0.24, 1.92, 0.031, 0, 0, 0, flag);

  /* ── LES DEUX CHAISES DE VISITEUR. La nôtre est celle du milieu : la caméra
     « ma chaise » est posée juste au-dessus de son dossier. ── */
  const chair = (x, z, ry) => {
    const g = grp(x, 0, z); g.rotation.y = ry;
    for (const [dx, dz] of [[-0.20, -0.19], [0.20, -0.19], [-0.20, 0.19], [0.20, 0.19]])
      cyl(0.022, 0.026, 0.44, lam(COL.woodDark), dx, 0.22, dz, 0, 0, 0, g, 8);
    box(0.50, 0.055, 0.46, lam(COL.woodWarm), 0, 0.47, 0, 0, 0, 0, g);
    box(0.44, 0.045, 0.40, lam(0x5c2b2a), 0, 0.50, 0, 0, 0, 0, g);
    box(0.48, 0.62, 0.05, lam(COL.woodWarm), 0, 0.79, -0.21, 0.06, 0, 0, g);
    box(0.40, 0.42, 0.03, lam(0x5c2b2a), 0, 0.80, -0.185, 0.06, 0, 0, g);
    return g;
  };
  chair(-0.52, -1.30, 0.10); chair(0.55, -1.28, -0.12);

  /* ── LE FAUTEUIL DU MAIRE : haut dossier, accotoirs, crête sculptée. Il ne se
     confond pas avec les deux autres, et c'est le point : la pièce dit qui est
     assis où avant qu'on ait lu une ligne. ── */
  const seat = grp(0, 0, R.seatZ);
  cyl(0.07, 0.07, 0.34, lam(0x2a2a30), 0, 0.17, 0, 0, 0, 0, seat, 10);
  cyl(0.26, 0.30, 0.05, lam(0x2a2a30), 0, 0.025, 0, 0, 0, 0, seat, 14);
  box(0.60, 0.09, 0.56, lam(COL.woodDark), 0, 0.39, 0, 0, 0, 0, seat);
  box(0.54, 0.10, 0.50, lam(COL.chair), 0, 0.46, 0, 0, 0, 0, seat);
  box(0.60, 1.12, 0.08, lam(COL.woodDark), 0, 1.00, -0.26, 0.08, 0, 0, seat);
  box(0.50, 0.94, 0.05, lam(COL.chair), 0, 1.00, -0.225, 0.08, 0, 0, seat);
  box(0.62, 0.10, 0.16, pho(COL.gild, 60), 0, 1.56, -0.31, 0.08, 0, 0, seat);
  for (const sx of [-1, 1]) {
    box(0.06, 0.05, 0.44, lam(COL.woodDark), sx * 0.30, 0.66, -0.02, 0, 0, 0, seat);
    cyl(0.025, 0.025, 0.22, lam(COL.woodDark), sx * 0.30, 0.55, 0.17, 0, 0, 0, seat, 8);
  }

  /* ── CE QUI BOUGE : le stylo, le rouleau de plans, le tampon, la feuille.
     ⚠️ ILS SONT RENDUS À L'APPELANT, parce que ce sont les seuls objets du décor
     que la MÉCANIQUE déplace. Tout le reste est immobile pour toujours. ── */
  const pen = grp(0, 0, 0, desk);
  cyl(0.006, 0.008, 0.155, lam(0x1b1b22), 0, 0, 0, 0, 0, 0, pen, 8);
  cyl(0.008, 0.004, 0.030, pho(COL.brass, 90), 0, 0.09, 0, 0, 0, 0, pen, 8);
  cyl(0.007, 0.007, 0.022, pho(COL.brass, 90), 0, -0.062, 0, 0, 0, 0, pen, 8);

  const roll = grp(0, 0, 0, desk);
  /* ⚠️ 46 CM ET 6 DE DIAMÈTRE. Le premier jet en faisait 62 sur 8 : posé au bord
     du sous-main, ça lisait comme une bûche, et c'est l'objet le plus important
     de l'entretien (les plans de Kerguélen). Un accessoire trop gros ne dit pas
     « important », il dit « raté ». */
  cyl(0.032, 0.032, 0.46, lam(0xe8e0cc), 0, 0, 0, 0, 0, Math.PI / 2, roll, 12);
  box(0.038, 0.070, 0.50, lam(0x9a5a3a), 0, 0, 0, 0, 0, Math.PI / 2, roll);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.36), lam(0xdfe6ee, { side: THREE.DoubleSide }));
  K.at(sheet, 0, 0, 0, -Math.PI / 2, 0, 0, roll);
  sheet.visible = false;                             // il ne se déroule qu'au bon moment

  /* ⚠️⚠️ HORS-ZIP 2026-09-02 — LE TAMPON EST REMONTÉ DE 14 CM VERS LE MILIEU DU
     PLATEAU, ET C'EST LA PORTÉE QUI L'EXIGE. Les maires ne font plus tous la
     même taille : Delaunay mesure 1,68 m et son bras fait 55,8 cm, contre 64 cm
     d'épaule à tampon à l'ancienne place. `solveArm` BORNE une cible hors de
     portée au lieu de la refuser (voir sa note) : la main se serait arrêtée à
     neuf centimètres du tampon, en silence, sur le geste qui CONCLUT
     l'entretien. *Un objet posé se place par la portée du plus petit, pas par
     l'aspect du meuble vu de haut.* Mesuré par `render-maire` §3, qui balaie
     désormais les cinq corps. */
  const stamp = grp(0.58, top + 0.055, zc - 0.20, desk);
  cyl(0.038, 0.042, 0.055, lam(0x24242a), 0, 0, 0, 0, 0, 0, stamp, 12);
  cyl(0.012, 0.012, 0.05, lam(COL.woodDark), 0, 0.05, 0, 0, 0, 0, stamp, 8);
  sph(0.030, lam(COL.woodWarm), 0, 0.09, 0, stamp, 10);
  box(0.13, 0.022, 0.10, lam(0x1d2a1e), 0.15, top + 0.011 - (top + 0.055), 0, 0, 0, 0, stamp);

  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.40), lam(COL.paper, { side: THREE.DoubleSide }));
  K.at(paper, 0.06, top + 0.006, zc + 0.06, -Math.PI / 2, 0, 0.08, desk);

  return { desk, pen, roll, sheet, stamp, paper, lamp, files, seat, door: null };
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. LE MAIRE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ SON VISAGE EST LA RAISON D'ÊTRE DE TOUTE LA SCÈNE. Le §7 de `maire.js`
   le dit depuis le 480 : « si le joueur doit regarder la barre pour savoir où il
   en est, la 3D n'a rien acheté et il fallait faire un panneau ». Le GLB livré
   ce jour-là n'avait PAS DE VISAGE — pas d'yeux, pas de sourcils, pas de bouche,
   une boîte de peau. La promesse ne pouvait donc pas être tenue, et rien ne le
   disait.
   ⚠️ Ce qui la tient ici tient en trois pièces : les SOURCILS (deux boîtes qui
   se penchent et se rapprochent), les PAUPIÈRES (deux boîtes qui descendent) et
   la BOUCHE (trois boîtes : un centre qui s'ouvre, deux coins qui montent ou
   descendent). C'est le minimum absolu, et c'est aussi tout ce qu'on lit sur un
   visage à deux mètres. Le nez, les oreilles et les cheveux ne servent qu'à ce
   que le reste ait un endroit où être.

   ⚠️ TOUS LES PIVOTS SONT RENDUS À L'APPELANT. Aucune animation n'est écrite
   ici : `applyPose` et `applyFace` sont plus bas, au niveau du MODULE, et la
   boucle de rendu de `MaireScene.js` ne fait que les appeler avec un état lissé.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════════
   5 bis. LES MENSURATIONS — UN CORPS SE DÉRIVE D'UNE TAILLE, IL NE SE POSE PAS
   BOÎTE PAR BOÎTE.
   ───────────────────────────────────────────────────────────────────────────
   HORS-ZIP 2026-09-02. Demande de Guillaume : « affiner le réalisme du maire,
   comme on l'a fait pour tristan : anthropométrie, style ».

   ⚠️⚠️⚠️ CE QUI ÉTAIT FAUX, MESURÉ AVANT DE TOUCHER À QUOI QUE CE SOIT (script
   jetable sur `buildOffice`, pose debout, boîtes de géométrie sans le sprite du
   « ! ») :

        stature ................ 1,898 m        un homme : 1,78
        tête (L × H × P) ....... 25 × 28 × 28 cm            15,5 × 23,5 × 20
        stature / hauteur de tête   6,7 têtes               7,5
        tête / largeur d'épaules ... 47 %                   25 à 32 %

   C'est mot pour mot le diagnostic de Tristan (« on dirait un pantin », ramené
   de 43 % à 32 % le 2026-09-01), en pire — et le crâne était quasi CUBIQUE
   (largeur/hauteur 0,89 quand un humain est à 0,66), ce qui est le vrai signal :
   l'œil ne compte pas les têtes, il voit un cube posé sur des épaules.
   ⚠️ Les JAMBES, elles, étaient justes (0,466 de la stature contre 0,47 chez un
   humain) : on ne touche à une proportion que quand elle est fausse.

   ⚠️⚠️ POURQUOI UNE TABLE DE RATIOS PLUTÔT QUE VINGT NOMBRES RETOUCHÉS. Trois
   raisons, et la troisième est celle qui a décidé :
     1. un corps est une CHAÎNE — raccourcir un buste sans descendre le cou, la
        tête et les épaules fabrique exactement le défaut du 2026-08-31 (« un
        homme coupé à la taille ») ;
     2. la stature devient un RÉGLAGE : `H` descend de 1,90 à 1,80 et les
        quatorze longueurs suivent, au lieu d'être quatorze occasions de se
        tromper (§8 : un paramètre qui double un autre doit être DÉRIVÉ) ;
     3. il y a maintenant CINQ maires et deux sexes. Écrits à la main, dix corps
        auraient divergé au premier réglage — c'est la leçon de `rig3d.js`, prise
        un cran plus tôt.
   ⚠️ LES FRACTIONS SOMMENT À 1 PAR CONSTRUCTION (jambe + buste + cou + tête), et
   c'est ce qui garantit que `H` est bien la stature RENDUE et pas une intention.
   Le banc la mesure et compare ; sans cette somme, on aurait un nombre qui
   s'appelle « stature » et un corps qui en fait une autre.
   ═══════════════════════════════════════════════════════════════════════════ */
/* Les six étages du corps, en fraction de la stature. Repères anthropométriques
   usuels (Drillis & Contini), renormalisés pour sommer exactement à 1. */
const RATIO = {
  thigh: 0.2360,   // hanche → genou
  shin:  0.2280,   // genou → cheville
  shoe:  0.0390,   // le pied, cheville comprise
  trunk: 0.3090,   // hanche → acromion (l'épaule)
  neck:  0.0540,   // acromion → menton
  head:  0.1340,   // menton → sommet du crâne, cheveux compris
};
/* ⚠️ LE FAUTEUIL IMPOSE DEUX NOMBRES, ET ILS NE SE DÉRIVENT PAS DU CORPS : la
   hauteur de hanche ASSISE et le pivot du buste. Les sept postures sont écrites
   dans ce repère depuis le 480 (`POSE`, mains en coordonnées de monde) — les
   bouger reviendrait à réécrire les quatorze cibles de main. Un maire plus petit
   s'assoit donc à la même hauteur de bassin qu'avant : c'est ce qui fait que
   cette passe ne casse aucune pose. */
/* ⚠️⚠️ HORS-ZIP 2026-09-02 — LA HANCHE ASSISE EST PASSÉE DE 0,50 À 0,58, ET
   C'EST UNE CORRECTION VUE EN JOUANT, PAS UN RÉGLAGE. Les maires mesurent
   maintenant 1,66 à 1,86 m au lieu de 1,90 : leur épaule assise tombait à 1,02
   quand les mains, elles, restent posées sur un PLATEAU qui n'a pas bougé
   (0,79). Dix-huit centimètres de dénivelé pour un bras de 56 — l'avant-bras
   sortait à l'horizontale et la maire se tenait EN CROIX derrière son bureau.
   ⚠️ Le fauteuil est surélevé, c'est écrit depuis le 480 ; il l'est désormais
   assez pour que le coussin (0,51) passe SOUS la hanche au lieu de la traverser.
   ⚠️⚠️ ET LA STATURE DEBOUT NE BOUGE PAS D'UN MILLIMÈTRE : `lift` perd les huit
   centimètres que l'épaule gagne (voir `mensurations`), donc les deux se
   compensent exactement. C'est la propriété qui rend ce nombre modifiable — et
   c'est le banc §8 qui la tient, en comparant la stature RENDUE à `H`. */
const HIP_Y = 0.58, WAIST_Y = 0.62;

/* ⚠️ LA TÊTE SE MET À L'ÉCHELLE, ELLE NE SE REDESSINE PAS — ET C'EST LA PARADE
   DE TRISTAN, GÉNÉRALISÉE. Sa géométrie (mâchoire, oreilles, trois masses de
   cheveux, `face` et tout ce qu'il porte) est écrite en coordonnées locales une
   fois pour toutes ; `head.scale` les réduit TOUS ensemble, au même rapport,
   sans toucher un seul décalage. Les retoucher un par un les aurait fait dériver
   ENTRE EUX (une oreille qui ne rétrécit pas comme le crâne ressort du crâne) —
   et surtout `applyFace` écrit des positions locales en dur (`0.062`, `−0.052`,
   `0.034`) : mises à l'échelle par le parent, elles restent justes ; réécrites,
   elles auraient été une seconde description du même visage.
   ⚠️ LE FACTEUR EST ANISOTROPE, ET C'EST TOUT LE SUJET : le crâne était cubique.
   0,75 en largeur contre 0,88 en hauteur, c'est exactement ce qui le fait passer
   de 0,89 de rapport L/H à 0,77 — un visage, pas un dé. */
/* ⚠️⚠️ LES TROIS FACTEURS SE DÉRIVENT DE LA TAILLE, ILS NE SE CHOISISSENT PAS —
   sans quoi on aurait remplacé un crâne faux par un crâne faux d'une autre
   façon, et il aurait fallu le régler cinq fois (une par maire). On écrit les
   deux PROPORTIONS d'une tête humaine (largeur et profondeur, en fraction de sa
   hauteur), et l'échelle tombe toute seule pour n'importe quelle stature.
   ⚠️ 0,70 EST UN CHOIX ASSUMÉ ET IL EST LÉGÈREMENT AU-DESSUS DE L'HUMAIN (0,66) :
   à cette distance, un crâne exactement humain se lit maigre. C'est le même
   arbitrage que Tristan, dont le style reste volontairement trapu.
   ⚠️ CE QUI COMPTE N'EST PAS LE FACTEUR, C'EST LE RAPPORT TÊTE/ÉPAULES qu'il
   produit — c'est LUI que le banc mesure, et c'est lui que l'œil voit. */
const HEAD_ASPECT_W = 0.70, HEAD_ASPECT_D = 0.86;
/* La géométrie locale de la tête, mesurée UNE fois sur le dessin d'origine :
   du bas de la mâchoire (−0,147) au sommet des cheveux (+0,129). Elle sert à
   poser le menton sur le cou quelle que soit l'échelle. ⚠️ Deux nombres lus sur
   les boîtes juste en dessous ; s'ils changent, cette ligne change avec elles. */
const HEAD_LOW = 0.147, HEAD_TOP = 0.136;
const HEAD_LOCAL_W = 0.250, HEAD_LOCAL_D = 0.253;   // oreilles comprises · nuque au bout du nez

/* ⚠️⚠️ LES DIX SILHOUETTES DU JEU TIENNENT DANS CETTE TABLE, ET ELLE EST UNE
   JOINTURE AVEC `C.TOWN_CANDIDATES`, PAS UNE SECONDE LISTE (449) : `verify-maire`
   vérifie que les deux ensembles de clés sont ÉGAUX. Une sixième candidature
   ajoutée sans son corps donnerait un maire au hasard, silencieusement.
   ⚠️⚠️⚠️ TROIS DES CINQ SONT DES FEMMES DEPUIS TOUJOURS, ET PERSONNE NE L'AVAIT
   DESSINÉ : `fermeStrings` nomme **Odile** Vasseur, **Séverine** Bonnefoy et
   **Ninon** Delaunay depuis le 480, pendant que `buildMayor` ne savait faire
   qu'un homme et que les didascalies disaient « Il ouvre un registre ». Ce
   n'était donc pas une version à inventer, c'était une incohérence à réparer —
   et c'est la demande de Guillaume (« créer une version féminine, quand le maire
   est une femme »).
   ⚠️ `skirt` EST UN CHAMP PAR MAIRE, PAS UNE PROPRIÉTÉ DU SEXE. Odile Vasseur
   porte le pantalon ; deux femmes sur trois portent la jupe. Trois femmes en
   jupe auraient été un uniforme, c'est-à-dire le contraire d'une silhouette.
   ⚠️ CHAQUE LIGNE DIT CE QUE SON PORTRAIT DIT DÉJÀ (l'emoji de `TOWN_CANDIDATES`
   et ses répliques) : Lantier fait les ponts, il est trapu ; Toussaint garde les
   archives, il est long et sec ; Bonnefoy tient les comptes, elle est nette. Une
   corpulence tirée au hasard aurait été du bruit. */
export const MAYOR_LOOKS = {
  vasseur:   { fem: true,  H: 1.66, build: 1.10, skirt: false,
               suit: 0x4a5340, suitDark: 0x363d2f, shirt: 0xeee7d4, tie: 0x7a3f34,
               hair: 0x9b968c, cut: "bun",   brow: 0x776f63, glasses: false, beard: 0, skin: 0xd7a67e },
  lantier:   { fem: false, H: 1.74, build: 1.14, skirt: false,
               suit: 0x4a4b4f, suitDark: 0x36373b, shirt: 0xf1f0ea, tie: 0x6a2f2c,
               hair: 0x6b6259, cut: "crop",  brow: 0x574f46, glasses: false, beard: 2, skin: 0xcf9d74 },
  bonnefoy:  { fem: true,  H: 1.70, build: 0.94, skirt: true,
               suit: 0x2c2f36, suitDark: 0x1f2229, shirt: 0xf4f3ef, tie: 0x2c4a6e,
               hair: 0x453026, cut: "bob",   brow: 0x3b2a21, glasses: true,  beard: 0, skin: 0xe0b48f },
  delaunay:  { fem: true,  H: 1.68, build: 1.00, skirt: true,
               suit: 0x33455c, suitDark: 0x253344, shirt: 0xeef2f3, tie: 0x8a6a3a,
               hair: 0x7a4526, cut: "long",  brow: 0x5e3a24, glasses: false, beard: 0, skin: 0xd9a983 },
  toussaint: { fem: false, H: 1.86, build: 0.88, skirt: false,
               suit: 0x4d4335, suitDark: 0x393125, shirt: 0xf1efe3, tie: 0x3f5340,
               hair: 0x8d8880, cut: "bald",  brow: 0x777068, glasses: true,  beard: 3, skin: 0xd3a67f },
};
export const MAYOR_LOOK_KEYS = Object.keys(MAYOR_LOOKS);
export function mayorLook(key) { return MAYOR_LOOKS[key] || MAYOR_LOOKS.vasseur; }

/* Toutes les longueurs d'UN corps, en mètres. ⚠️ ELLE EST PURE ET EXPORTÉE :
   c'est ce qui permet au banc de comparer la stature ÉCRITE à la stature
   RENDUE, au lieu de vérifier qu'un nombre est égal à lui-même. */
export function mensurations(look) {
  const L = look || MAYOR_LOOKS.vasseur, H = L.H, f = !!L.fem, b = L.build || 1;
  const thigh = RATIO.thigh * H, shin = RATIO.shin * H, shoe = RATIO.shoe * H;
  const trunk = RATIO.trunk * H, neck = RATIO.neck * H;
  /* La tête, en trois facteurs dérivés : sa HAUTEUR vient de la table des
     étages, sa largeur et sa profondeur des deux proportions ci-dessus. */
  const headH = RATIO.head * H;
  const k = [HEAD_ASPECT_W * headH / HEAD_LOCAL_W,
             headH / (HEAD_LOW + HEAD_TOP),
             HEAD_ASPECT_D * headH / HEAD_LOCAL_D];
  /* ⚠️ LA CARRURE SUIT LE SEXE **ET** LA CORPULENCE, ET LES DEUX SONT DES
     FACTEURS DISTINCTS : une femme corpulente a des épaules de femme et un
     torse épais. Les confondre en un seul nombre aurait donné, sur Vasseur, une
     paysanne aux épaules de bûcheron. */
  /* ⚠️⚠️ ON ÉCRIT LA CARRURE VISIBLE (d'un deltoïde à l'autre) ET ON EN DÉDUIT
     LE JOINT, jamais l'inverse. Le premier jet posait l'écart des ARTICULATIONS
     et laissait le muscle déborder par-dessus : la carrure sortait à 63 cm pour
     un homme de 1,74, c'est-à-dire une armure. La grandeur qu'on regarde est
     celle qu'il faut écrire ; celle qu'on n'a pas écrite se met toujours à
     dériver. */
  /* ⚠️ LA CORPULENCE EST AMORTIE SUR LA CARRURE (0,6 + 0,4·b), PAS APPLIQUÉE
     PLEINE. Un maire maigre gardait sa tête et perdait ses épaules : le rapport
     tête/épaules — la grandeur qui décide si un personnage a l'air d'un pantin —
     montait à 44 % chez Toussaint pendant qu'il tombait à 34 % chez Lantier,
     pour un seul et même crâne. La corpulence change une carrure de quelques
     centimètres, elle ne la double pas. */
  const bidelt = (f ? 0.232 : 0.245) * H * (0.6 + 0.4 * b);
  const deltoid = 0.036 * H * (0.6 + 0.4 * b);
  const shoulder = Math.max(0.06, bidelt / 2 - deltoid);   // le joint, d'où pend le bras
  return {
    H, fem: f, thigh, shin, shoe, trunk, neck, bidelt,
    lift: thigh + shin + shoe - HIP_Y,               // ce que « se lever » ajoute
    hipY: HIP_Y, waistY: WAIST_Y,
    shoulderY: trunk - (WAIST_Y - HIP_Y),            // l'épaule, dans le repère du buste
    shoulder, deltoid,
    /* Tout le reste du tronc se lit EN FRACTION DE LA CARRURE : c'est ce qui
       donne sa ligne à un costume (épaules > poitrine > taille) et c'est le
       seul jeu de rapports que l'œil vérifie sur une silhouette habillée.
       ⚠️ La taille d'une femme est plus creusée et ses hanches plus larges que
       ses épaules ; chez un homme c'est l'inverse. Un seul jeu de nombres pour
       les deux aurait donné une femme en costume d'homme, coiffée autrement. */
    chestW: 0.80 * bidelt, chestD: 0.145 * H * (0.6 + 0.4 * b),
    waistW: (f ? 0.64 : 0.72) * bidelt, waistD: 0.128 * H * (0.6 + 0.4 * b),
    hipW:   (f ? 0.84 : 0.74) * bidelt, hipD: 0.150 * H * (0.6 + 0.4 * b),
    thighW: (f ? 0.098 : 0.096) * H * (0.7 + 0.3 * b),
    shinW:  (f ? 0.082 : 0.086) * H * (0.7 + 0.3 * b),
    armUp: 0.186 * H, armFore: 0.146 * H,
    armR:  (f ? 0.031 : 0.035) * H * (0.7 + 0.3 * b),   // rayon du haut de bras
    neckR: (f ? 0.030 : 0.034) * H,
    headK: k,
    /* Le menton se pose sur le cou, et la tête se place à partir de LUI : c'est
       la seule façon d'écrire « la tête est au bout du cou » plutôt que « la
       tête est à 0,762, on verra bien ». */
    headY: trunk - (WAIST_Y - HIP_Y) + neck + HEAD_LOW * k[1],
    /* La stature RENDUE, recomposée depuis la chaîne — c'est elle que le banc
       compare à `H`, et l'écart doit être nul au millimètre. */
    stature: WAIST_Y + (thigh + shin + shoe - HIP_Y)
             + (trunk - (WAIST_Y - HIP_Y) + neck + HEAD_LOW * k[1]) + HEAD_TOP * k[1],
  };
}

function buildMayor(THREE, K, look) {
  const { lam, pho, box, cyl, sph, grp } = K;
  const L = look || MAYOR_LOOKS.vasseur;
  const M = mensurations(L);
  const mSuit = lam(L.suit), mSuitD = lam(L.suitDark), mSkin = lam(L.skin || COL.skin);
  const mShirt = lam(L.shirt), mTie = lam(L.tie);
  const mLeg = lam(M.fem && L.skirt ? 0x2a2b31 : L.suitDark);   // le bas : jambe gainée ou pantalon

  const man = grp(0, 0, ROOM.seatZ + 0.04);

  /* ── LE BASSIN. ⚠️⚠️ IL N'EXISTAIT PAS AVANT LE 2026-08-31, ET C'EST CE QUI
     DÉTACHAIT LES JAMBES : une FENTE de quinze millimètres traversait l'homme à
     la taille, sur toute sa largeur. Elle ne se voyait pas en lisant la table
     des poses — un banc de mécanique n'a pas de silhouette — et `render-maire`
     la rend en trois îlots dès la première image.
     ⚠️ IL EST FILS DE `man`, PAS DU BUSTE : un bassin qui suivrait le penchant
     rouvrirait la fente de l'autre côté à chaque `lean`. Le buste pivote DANS le
     bassin, c'est ce qu'il fait chez tout le monde. */
  box(M.hipW, 0.15, M.hipD, mSuitD, 0, HIP_Y + 0.045, 0.02, 0, 0, 0, man);
  /* ⚠️ LA JUPE EST UNE PIÈCE DU BASSIN, PAS DU BUSTE, et pour la même raison que
     le tablier de Tristan : nouée aux hanches, elle ne se penche pas avec les
     épaules. Elle couvre le haut des cuisses, qui restent des cylindres — une
     jupe qui suivrait chaque jambe demanderait un tissu simulé pour un gain nul
     à cette distance. */
  /* ⚠️ ELLE COUVRE LE HAUT DES CUISSES, ELLE NE LES ENVELOPPE PAS. Premier jet :
     36 cm de profondeur, avancée de 10 — une caisse noire qui dépassait du
     ventre debout, parce qu'elle était taillée pour la position ASSISE (cuisses
     vers l'avant) et portée dans les deux. On la ramène sur le bassin et on la
     laisse s'arrêter au-dessus du genou : assise elle borde les cuisses, debout
     elle tombe droit. */
  if (M.fem && L.skirt) box(M.hipW + 0.035, 0.28, M.hipD + 0.05, mSuitD, 0, HIP_Y - 0.075, 0.045, 0, 0, 0, man);

  /* ── LES JAMBES. Deux pivots par jambe — hanche et genou — et c'est le minimum
     pour que l'homme puisse SE LEVER : avant le 2026-08-31 c'étaient trois
     boîtes fixes, et « debout » se contentait de monter le BUSTE, ce qui
     fabriquait un homme coupé à la taille. *Une mise en scène qui demande un
     geste que le squelette ne sait pas faire ne se règle pas, elle se
     construit.*
     ⚠️⚠️ LES TROIS LONGUEURS SORTENT DE `mensurations`, ET `STAND_LIFT` AVEC
     ELLES. Elle était écrite `0,44 + 0,41 + 0,045 − 0,50` : trois copies des
     boîtes ci-dessous, justes jusqu'au jour où l'on touche à une jambe. C'est
     le §8 pris à la lettre — le nombre qui double un autre nombre est DÉRIVÉ.
     ⚠️ LA CUISSE POINTE VERS L'AVANT (+z) : c'est `applyPose` qui la fait
     pivoter d'un quart de tour vers le bas pour se lever. Le pied touche donc le
     parquet À ZÉRO quand `stand = 1`, par construction, et le banc le mesure. */
  const legs = [-1, 1].map((sx) => {
    const hip = grp(sx * M.hipW * 0.31, HIP_Y, 0.00, man);
    box(M.thighW, M.thighW, M.thigh, mLeg, 0, 0, M.thigh / 2, 0, 0, 0, hip);
    const knee = grp(0, -0.04, M.thigh, hip);
    box(M.shinW, M.shin, M.shinW, mLeg, 0, -M.shin / 2, 0, 0, 0, 0, knee);
    /* ⚠️ LE SOULIER FAIT EXACTEMENT `shoe` DE HAUT ET SA SEMELLE TOMBE À ZÉRO
       QUAND IL EST DEBOUT — c'est ce qui rend `lift` juste par construction au
       lieu de « à peu près ». Écrit à 9 cm pour une cheville de 6,8, il
       enfonçait le maire de deux centimètres et demi dans le parquet ; le banc
       le mesure maintenant en lisant le bas de sa boîte. */
    box(M.shinW * 0.88, M.shoe, 0.24, lam(0x1b1b20), 0, -M.shin - M.shoe / 2, 0.055, 0, 0, 0, knee);
    return { hip, knee };
  });

  /* ── LE BUSTE. C'est LUI le pivot du penchant : tout ce qui suit est son
     enfant, donc se pencher entraîne la tête, les bras et l'écharpe d'un bloc.
     Un buste qui se pencherait sans sa tête est le défaut le plus visible d'un
     personnage articulé, et il ne coûte qu'une erreur de parenté.
     ⚠️⚠️ IL N'EST PLUS UNE DALLE. Le premier dessin empilait une boîte de 62 cm
     et un ventre : vu de face, un rectangle — pas d'épaule qui tombe, pas de
     taille. Trois étages qui se resserrent (poitrine, ceinture, taille) coûtent
     deux boîtes de plus et donnent la seule chose que l'œil cherche sur un
     costume : la ligne. C'est la remarque de Guillaume sur le style, prise du
     côté de la COUPE plutôt que de la couleur.
     ⚠️ LE PIVOT RESTE À 0,62 (`WAIST_Y`) : c'est le repère dans lequel les sept
     postures écrivent leurs mains depuis le 480. Le corps rapetisse autour de
     lui, les cibles ne bougent pas. */
  const torso = grp(0, WAIST_Y, 0.02, man);
  const shY = M.shoulderY;
  box(M.waistW, 0.19, M.waistD, mSuit, 0, 0.06, 0, 0, 0, 0, torso);                      // la taille
  box((M.waistW + M.chestW) / 2, 0.17, (M.waistD + M.chestD) / 2, mSuit, 0, 0.235, 0.004, 0, 0, 0, torso);
  box(M.chestW, shY - 0.24, M.chestD, mSuit, 0, (shY + 0.32) / 2, 0.006, 0, 0, 0, torso); // la poitrine
  /* ⚠️ L'ÉPAULE TOMBE, ELLE N'EST PLUS UNE BOÎTE CARRÉE. Deux plaques de plus en
     plus étroites en montant : c'est la pente du trapèze, et c'est elle qui
     sépare un costume d'une armure. Les deux anciennes boîtes de 13,5 cm posées
     à plat au sommet lisaient comme des épaulettes — signalé par personne, vu
     sur la planche du banc. */
  box(M.bidelt - M.deltoid, 0.10, M.chestD * 0.96, mSuit, 0, shY - 0.040, 0.004, 0, 0, 0, torso);
  box(M.bidelt * 0.58, 0.075, M.chestD * 0.84, mSuit, 0, shY + 0.030, 0.000, 0, 0, 0, torso);
  /* ⚠️ LA CARRURE DESSINÉE DOIT FAIRE `bidelt`, PAS L'ÉCART DES JOINTS. Premier
     jet : la plaque d'épaule faisait la largeur des deux articulations et les
     deltoïdes pendaient DESSOUS — vu de face, deux boules sous une planche, et
     des épaules qui rentraient au lieu de tomber. La plaque va donc d'un
     deltoïde à l'autre, et les sphères la COMPLÈTENT au lieu de s'y ajouter. */
  /* la chemise et la cravate, dans l'échancrure. ⚠️ UNE FEMME PORTE UN CHEMISIER
     ET UN FOULARD : la cravate n'est pas une pièce neutre, et la remplacer coûte
     une boîte. Le nœud disparaît, le foulard s'élargit. */
  const vTop = shY - 0.02, vLen = M.fem ? 0.26 : 0.34;
  box(M.chestW * 0.36, vLen, 0.05, mShirt, 0, vTop - vLen / 2, M.chestD / 2 - 0.006, 0, 0, 0, torso);
  if (M.fem) box(M.chestW * 0.30, 0.075, 0.035, mTie, 0, vTop - 0.05, M.chestD / 2 + 0.012, 0, 0, 0, torso);
  else {
    box(0.062, 0.28, 0.03, mTie, 0, vTop - 0.17, M.chestD / 2 + 0.014, 0, 0, 0, torso);
    box(0.072, 0.052, 0.034, mTie, 0, vTop - 0.02, M.chestD / 2 + 0.014, 0, 0, 0, torso);
  }
  /* ⚠️ LA POITRINE EST DEUX CALOTTES SOUS LA VESTE, PAS UNE BOÎTE. À cette
     distance c'est la ligne du vêtement qu'on lit, pas l'anatomie : deux sphères
     à peine saillantes suffisent à donner la coupe d'un tailleur, et tout ce qui
     dépasse de ça se met à raconter autre chose que « c'est la maire ». */
  if (M.fem) box(M.chestW * 0.62, 0.115, 0.045, mSuit, 0, shY - 0.175, M.chestD / 2 - 0.012, 0, 0, 0, torso);
  /* LE COL EN DEUX POINTES, PAS UNE PLAQUE : une seule boîte de 20 cm lisait
     comme une planchette collée sous le menton ; deux pointes qui s'écartent
     dessinent l'ouverture d'un vrai col, pour le même nombre de faces. */
  for (const sx of [-1, 1])
    box(0.075, 0.058, 0.048, mShirt, sx * 0.040, shY + 0.062, M.chestD / 2 - 0.030, 0, 0, sx * 0.16, torso);
  /* LE REVERS EN DEUX PANS, PAS UNE PLAQUE INCLINÉE. Signalé par Guillaume :
     « les revers de col sont trop grossiers ». Un revers a une pliure visible —
     un dessous presque plat contre la chemise, un rabat qui s'écarte franchement
     — et une seule boîte tiltée ne peut montrer que l'un des deux plans. */
  for (const sx of [-1, 1]) {
    box(0.105, vLen * 0.86, 0.03, mSuitD, sx * (M.chestW * 0.33), vTop - vLen * 0.46, M.chestD / 2 - 0.008, 0, 0, sx * 0.09, torso);
    box(0.110, vLen * 0.96, 0.032, mSuitD, sx * (M.chestW * 0.29), vTop - vLen * 0.42, M.chestD / 2 + 0.010, 0, 0, sx * 0.26, torso);
  }
  /* ── L'ÉCHARPE TRICOLORE. C'est le seul objet du personnage qui dise « maire »
     sans un mot, et c'est pour ça qu'elle est là plutôt qu'une cravate de plus.
     ⚠️ ELLE EST L'ÉLÉMENT LE PLUS AVANCÉ DU BUSTE, jamais dans l'épaisseur des
     revers : deux boîtes opaques quasi coplanaires, c'est un scintillement en Z,
     et le symptôme est une écharpe « parfois coupée » selon l'angle de caméra.
     Une écharpe se porte PAR-DESSUS la veste.
     ⚠️ ELLE DESCEND DE SON ÉPAULE DROITE — donc de NOTRE GAUCHE — vers sa hanche
     gauche, comme la portent les maires. Le premier jet la penchait dans l'autre
     sens : personne n'aurait su dire pourquoi ça n'allait pas, et tout le monde
     l'aurait vu.
     ⚠️ ET ELLE FAIT 40 CM, PAS 60 : la version longue descendait DANS le plateau
     du bureau (mesuré par `render-maire` §4) et lisait comme un cache-nez. Une
     écharpe de maire se noue à la hanche. */
  /* ⚠️⚠️ SON ATTACHE ET SA LONGUEUR SE DÉRIVENT DE L'ÉPAULE, ET CE N'EST PAS UN
     RAFFINEMENT : posée bas sur un buste raccourci, sa pointe retombe DANS le
     plateau du bureau (0,715 → 0,79 m) — le défaut exact que Guillaume avait
     signalé le 2026-08-31 (« l'écharpe détachée passant sous le plan du
     bureau »), reproduit à l'identique dès que le maire a rapetissé. Écrite en
     mètres absolus, elle était juste pour UN corps ; écrite depuis l'épaule,
     elle l'est pour cinq. Mesuré par `render-maire` §4. */
  const sash = grp(0, shY - 0.10, M.chestD / 2 + 0.030, torso);
  sash.rotation.z = 0.70;
  const sashL = Math.min(0.32, M.trunk * 0.58);
  for (let i = 0; i < 3; i++)
    box(0.042, sashL, 0.020, lam([COL.sashB, COL.sashW, COL.sashR][i]), (i - 1) * 0.043, 0, 0, 0, 0, 0, sash);
  /* La rosette est l'enfant de l'ÉCHARPE, pas du buste : posée à une position de
     buste calculée à la main, elle était juste tant que `sash` ne bougeait
     jamais, et fausse dès qu'on la retouche. */
  /* ⚠️ ELLE EST SUR LA POINTE BASSE, PAS EN HAUT DE L'ÉCHARPE. Posée près de
     l'épaule elle dépassait du contour au-dessus du trapèze : une tache rouge
     de soixante pixels détachée du corps, que `render-maire` §1 compte comme un
     SECOND morceau — la mesure d'îlot faisant exactement son travail. Et une
     rosette de maire se porte à la hanche. */
  sph(0.017, pho(0xc02a2a, 90), 0.0, -sashL * 0.38, 0.009, sash, 8);

  /* ── LES BRAS. Trois pivots par bras — épaule, coude, main — et pas un de
     plus : à cette taille un poignet ne se voit pas, et un pivot qu'on ne voit
     pas est un pivot qu'on règlera de travers.
     ⚠️ L'ÉPAULE EST UNE SPHÈRE, PAS UN CUBE. C'est la moitié de ce qui faisait
     l'effet « pantin » : une articulation ronde tourne sans montrer d'arête,
     et le deltoïde d'un costume est rond.
     ⚠️ 16 SEGMENTS : les bras sont ce qui bouge le plus et ce qu'on voit de plus
     près (ils viennent au premier plan sur le bureau) ; un cylindre à 10 faces
     s'y voit facetté sous la lampe. Le tronc et la tête restent des boîtes — eux
     ne roulent jamais sous l'œil de la même façon. */
  const arm = (sx) => {
    const sh = grp(sx * M.shoulder, shY - 0.035, 0.006, torso);
    sph(M.deltoid, mSuit, 0, 0.008, 0, sh, 12);
    cyl(M.armR, M.armR * 0.90, M.armUp, mSuit, 0, -M.armUp / 2, 0, 0, 0, 0, sh, 16);
    const el = grp(0, -M.armUp, 0, sh);
    cyl(M.armR * 0.88, M.armR * 0.78, M.armFore, mSuit, 0, -M.armFore / 2, 0, 0, 0, 0, el, 16);
    box(0.095, 0.042, 0.095, mShirt, 0, -M.armFore + 0.022, 0, 0, 0, 0, el);      // la manchette
    const hd = grp(0, -M.armFore, 0, el);
    /* ⚠️ LA MAIN EST PLUS FINE QU'AVANT ET PLUS LONGUE : une main d'adulte fait
       11 % de la stature, la sienne en faisait 6 % pour une largeur de 7,2 cm —
       c'est-à-dire une moufle. Quatre doigts et un pouce, comme chez Tristan,
       et pas un de plus : à cette distance le cinquième doigt est un pixel. */
    box(0.062, 0.040, 0.098, mSkin, 0, -0.016, 0.016, 0, 0, 0, hd);
    for (let i = 0; i < 4; i++) box(0.013, 0.022, 0.058, mSkin, -0.021 + i * 0.014, -0.024, 0.058, 0.30, 0, 0, hd);
    box(0.020, 0.022, 0.044, mSkin, sx * 0.033, -0.010, 0.032, 0, 0, sx * 0.6, hd);
    return { sh, el, hd };
  };
  const armL = arm(-1), armR = arm(1);

  /* ── LE COU ET LA TÊTE. ⚠️ LE COU SE VOIT MAINTENANT : il était noyé entre les
     épaules et un crâne trop gros, et une tête posée directement sur un torse
     est le premier signe qu'on regarde un jouet. Sa longueur vient de la table
     (`RATIO.neck`), sa hauteur d'attache aussi — le menton se pose au bout du
     cou par construction (`M.headY`), il ne se règle plus à l'œil. */
  const neck = grp(0, shY + 0.005, 0.004, torso);
  cyl(M.neckR, M.neckR * 1.14, M.neck * 1.05, mSkin, 0, M.neck * 0.34, 0, 0, 0, 0, neck, 12);
  /* ⚠️ LE COL DE LA VESTE MONTE AUTOUR DU COU, ET C'EST LUI QUI DIT OÙ S'ARRÊTE
     LA PEAU. Sans lui, la colonne claire du cou courait du menton jusqu'aux
     revers : douze centimètres de peau nue au milieu d'un costume, ce qui se lit
     comme un cou de girafe et non comme un col ouvert. */
  cyl(M.neckR * 1.32, M.neckR * 1.62, 0.055, mSuitD, 0, -0.012, -0.004, 0, 0, 0, neck, 12);
  const head = grp(0, M.headY, 0.010, torso);
  head.scale.set(M.headK[0], M.headK[1], M.headK[2]);
  box(0.212, 0.245, 0.220, mSkin, 0, 0, 0, 0, 0, 0, head);
  box(0.188, 0.050, 0.195, mSkin, 0, -0.122, 0.004, 0, 0, 0, head);              // le menton
  for (const sx of [-1, 1]) box(0.026, 0.072, 0.058, mSkin, sx * 0.112, 0.000, -0.008, 0, 0, 0, head);
  /* ⚠️⚠️ LES CHEVEUX SONT UNE COIFFURE, PAS UNE CALOTTE, ET LE PREMIER JET AVAIT
     FAIT L'ERREUR EXACTE : une boîte grise de la largeur du crâne posée sur le
     dessus lit comme une CASQUETTE — et sous la lampe chaude le gris vire au
     blond. Cinq coupes, une par maire, et c'est ce qui distingue le plus
     nettement les cinq silhouettes à deux mètres : on reconnaît une tête à sa
     masse de cheveux bien avant de reconnaître un visage.
     ⚠️ PAS DE MÈCHE SUR LE DEVANT chez les hommes. Le premier jet posait deux
     petits volumes aux angles avant du crâne pour figurer les golfes : à
     l'écran, deux cornes. Un détail de coiffure qui ne se lit pas à deux mètres
     se lit comme une erreur. */
  const mHair = lam(L.hair);
  const cut = L.cut || "crop";
  for (const sx of [-1, 1]) box(0.034, cut === "bald" ? 0.110 : 0.140, 0.205, mHair, sx * 0.096, 0.048, -0.010, 0, 0, 0, head);
  box(0.216, 0.120, 0.055, mHair, 0, 0.058, -0.098, 0, 0, 0, head);              // la nuque
  /* ⚠️ LE DESSUS DESCEND JUSQU'AU FRONT, ET C'EST UN DÉFAUT VU À L'ÉCRAN. Sa
     profondeur s'arrêtait trois centimètres avant la face : au-dessus des
     sourcils restait une bande de peau nue sur toute la largeur du crâne, qui se
     lit comme un front dégarni. Invisible tant que la tête était grosse, criante
     depuis qu'elle a la taille d'une tête. */
  if (cut !== "bald") box(0.204, 0.050, 0.224, mHair, 0, 0.112, 0.004, 0, 0, 0, head);   // le dessus
  if (cut === "bald") box(0.150, 0.030, 0.070, mHair, 0, 0.114, -0.070, 0, 0, 0, head);   // ce qui reste
  if (cut === "bun") {                                    // le chignon, bas sur la nuque
    box(0.150, 0.070, 0.055, mHair, 0, 0.070, -0.128, 0, 0, 0, head);
    sph(0.062, mHair, 0, -0.010, -0.150, head, 10);
  }
  if (cut === "bob") {                                    // le carré, à hauteur de mâchoire
    for (const sx of [-1, 1]) box(0.048, 0.185, 0.215, mHair, sx * 0.104, -0.030, -0.006, 0, 0, 0, head);
    box(0.222, 0.150, 0.070, mHair, 0, -0.020, -0.100, 0, 0, 0, head);
  }
  /* ⚠️ UNE FRANGE POUR LES DEUX COUPES LONGUES. Sans elle, le carré et les
     cheveux longs laissent le front entier à découvert et se lisent comme une
     perruque posée en arrière — le pendant féminin des « deux cornes » que le
     premier jet masculin avait payées. */
  if (cut === "bob" || cut === "long") box(0.208, 0.052, 0.050, mHair, 0, 0.078, 0.104, 0, 0, 0, head);
  if (cut === "long") {                                   // les cheveux longs, sur les épaules
    for (const sx of [-1, 1]) box(0.052, 0.300, 0.200, mHair, sx * 0.106, -0.100, -0.014, 0, 0, 0, head);
    box(0.228, 0.290, 0.075, mHair, 0, -0.090, -0.102, 0, 0, 0, head);
  }
  /* La barbe, en trois crans : 0 rien, 2 une moustache, 3 une barbe courte. */
  if (L.beard >= 2) box(0.088, 0.026, 0.050, lam(L.brow), 0, -0.072, 0.108, 0, 0, 0, head);
  if (L.beard >= 3) {
    box(0.170, 0.100, 0.050, mHair, 0, -0.108, 0.086, 0, 0, 0, head);
    for (const sx of [-1, 1]) box(0.032, 0.130, 0.058, mHair, sx * 0.090, -0.058, 0.068, 0, 0, 0, head);
  }

  /* ── LE VISAGE ──
     ⚠️⚠️⚠️ IL EST À CONTRE-JOUR, DONC DANS L'OMBRE, DONC IL FAUT QU'IL SOIT
     CONTRASTÉ DANS SA MATIÈRE — pas dans son éclairage. C'est le §8 de
     `CLAUDE.md` à la lettre : ce qui compte n'est pas la moyenne, c'est l'ÉCART.
     Le premier jet donnait des yeux de 4,6 cm en beige clair sur un visage
     beige : à deux mètres, un visage lisse. Éclairer de face l'aurait aplati au
     lieu de le sauver (fausse piste mesurée du §8).
     ⚠️ SES COORDONNÉES LOCALES N'ONT PAS BOUGÉ D'UN MILLIMÈTRE, et c'est
     volontaire : `applyFace` écrit dedans des positions en dur, et `head.scale`
     les met à l'échelle avec le reste. Les réécrire ici aurait été une seconde
     description du même visage — le défaut que ce fichier paie déjà deux fois. */
  const face = grp(0, 0, 0.107, head);
  box(0.040, 0.062, 0.048, mSkin, 0, -0.008, 0.020, 0, 0, 0, face);              // le nez
  box(0.040, 0.014, 0.040, lam(COL.skinDark), 0, -0.040, 0.018, 0, 0, 0, face);  // son ombre portée
  box(0.190, 0.020, 0.024, lam(COL.skinDark), 0, 0.074, 0.004, 0, 0, 0, face);   // l'arcade
  const eye = (sx) => {
    const g = grp(sx * 0.054, 0.032, 0.004, face);
    box(0.058, 0.040, 0.012, lam(0xf6f3ec), 0, 0, 0, 0, 0, 0, g);
    const iris = box(0.026, 0.028, 0.010, lam(0x241c14), 0, -0.002, 0.007, 0, 0, 0, g);
    const lid = box(0.062, 0.044, 0.016, mSkin, 0, 0.042, 0.005, 0, 0, 0, g);
    return { g, iris, lid };
  };
  const eyeL = eye(-1), eyeR = eye(1);
  const browL = box(0.072, 0.019, 0.016, lam(L.brow), -0.054, 0.070, 0.012, 0, 0, 0, face);
  const browR = box(0.072, 0.019, 0.016, lam(L.brow), 0.054, 0.070, 0.012, 0, 0, 0, face);
  /* ⚠️ LES LUNETTES SONT DEUX CERCLES ET UN PONT, ET RIEN D'AUTRE. Des branches
     modélisées disparaîtraient derrière les tempes à toutes les caméras du jeu
     et coûteraient quatre maillages par maire pour zéro pixel. */
  if (L.glasses) {
    const mFrame = pho(0x2a2520, 60);
    for (const sx of [-1, 1]) cyl(0.036, 0.036, 0.006, mFrame, sx * 0.054, 0.032, 0.016, Math.PI / 2, 0, 0, face, 14);
    box(0.038, 0.007, 0.006, mFrame, 0, 0.036, 0.016, 0, 0, 0, face);
  }
  const mouth = grp(0, -0.070, 0.004, face);
  const mLip = lam(M.fem ? 0x9a4a48 : 0x7d3f37);
  const lipC = box(0.050, 0.015, 0.012, mLip, 0, 0, 0, 0, 0, 0, mouth);
  const lipL = box(0.024, 0.013, 0.012, mLip, -0.034, 0, -0.002, 0, 0, 0, mouth);
  const lipR = box(0.024, 0.013, 0.012, mLip, 0.034, 0, -0.002, 0, 0, 0, mouth);
  const mouthDark = box(0.046, 0.001, 0.008, lam(0x2a1210), 0, 0, 0.005, 0, 0, 0, mouth);

  /* ⚠️⚠️ `lift`, `waistY` ET `bones` VOYAGENT AVEC LE CORPS, ILS NE SONT PLUS
     DES CONSTANTES DE MODULE. C'est ce qui rend les cinq maires possibles :
     `applyPose` lève l'homme de SA levée à lui et `solveArm` résout SES os. Une
     constante de module aurait donné à Toussaint (1,86 m) les jambes de
     Bonnefoy (1,70) — et le symptôme aurait été un maire qui décolle du parquet
     ou qui s'y enfonce, seulement quand il se lève. */
  return { man, torso, neck, head, face, armL, armR, sash, legs,
           eyeL, eyeR, browL, browR, mouth, lipC, lipL, lipR, mouthDark,
           look: L, mens: M, lift: M.lift, waistY: WAIST_Y,
           bones: { up: M.armUp, fore: M.armFore } };
}

/* ═══════════════════════════════════════════════════════════════════════════
   6. LES POSTURES — DES CIBLES, JAMAIS DES ANIMATIONS
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ UNE POSE EST UN JEU DE NOMBRES VERS LEQUEL ON GLISSE. Une pose jouée
   comme une animation nommée obligerait à exporter sept clips, donc à rouvrir un
   outil externe à chaque réglage — et un décor qu'on ne peut plus régler est
   exactement ce que le §9 de `CLAUDE.md` appelle « il ne se dégrade pas, il
   vieillit ». Ici un bras se corrige en changeant un nombre et en rechargeant.
   ⚠️ ON GLISSE, ON NE SAUTE PAS : une posture qui change d'une image à l'autre
   se lit comme un défaut d'affichage, pas comme un homme qui se penche. C'est
   le défaut n°10 de l'audit 477, corrigé au 479 sur la compagne.

   Les sept clés sont celles de `MR.MAYOR_POSES`, et c'est une JOINTURE, pas deux
   listes (449) : `applyPose` refuse une clé absente en retombant sur `flat`, et
   le banc vérifie que les deux ensembles sont égaux.
   ═══════════════════════════════════════════════════════════════════════════ */
export const POSE = {
  /* bras croisés, calé en arrière : il n'a rien décidé et il vous le montre */
  /* ⚠️⚠️ LES DEUX CIBLES ÉTAIENT DANS SA POITRINE, ET C'EST `render-maire` §6 QUI
     L'A DIT (2026-08-31). Écrites à z −2,86 pour un buste dont la face avant
     tombe à −2,91 quand il se cale en arrière : les mains s'enfonçaient de
     quatre centimètres dans la veste, et seuls les doigts ressortaient — au
     niveau du menton. ⚠️ LE CONTRÔLE DE SILHOUETTE NE POUVAIT PAS LE VOIR : une
     main enfoncée ne fait pas d'îlot, elle disparaît. *Ce qui déborde se compte
     en pixels, ce qui s'enfonce se compte en mètres.*
     ⚠️ Et le geste est plus juste : des bras croisés posent les mains sur le
     bras opposé, à hauteur de sternum — pas sous le menton. */
  closed: { lean: -0.17, rise: 0, stand: 0, turn: 0, headX: 0.02, headY: 0, pen: 0, stamp: 0, roll: 0,
            hL: [0.150, 0.940, -2.805], hR: [-0.150, 0.975, -2.820], out: -0.55 },
  /* il regarde la pendule et joue avec son stylo : le geste de quelqu'un qui
     compte les minutes qu'il vous a données */
  clock:  { lean: -0.07, rise: 0, stand: 0, turn: 0.16, headX: 0.04, headY: 0.42, pen: 1, stamp: 0, roll: 0,
            hL: [-0.30, 0.86, -2.66], hR: [0.24, 1.02, -2.72], out: 0.55 },
  /* mains à plat sur le sous-main : il écoute, sans plus */
  flat:   { lean: 0.00, rise: 0, stand: 0, turn: 0, headX: 0.03, headY: 0, pen: 0, stamp: 0, roll: 0,
            /* ⚠️ HORS-ZIP 2026-09-02 — `out` EST REDESCENDU DE 0,75 À 0,40 SUR
               LES TROIS POSES OÙ LES MAINS SONT POSÉES À PLAT. Il décide de quel
               côté sort le coude ; à 0,75 il le pousse franchement DEHORS, ce qui
               allait tant que les épaules faisaient 55 cm. Elles en font 39 chez
               Bonnefoy : le même angle donne alors deux avant-bras horizontaux et
               un personnage en croix. *Un réglage d'angle qui dépend d'une largeur
               d'épaules doit être relu le jour où cette largeur change.* */
            hL: [-0.30, 0.84, -2.58], hR: [0.30, 0.84, -2.58], out: 0.40 },
  /* coudes sur le bureau, doigts croisés : c'est le moment où il entre dedans */
  lean:   { lean: 0.19, rise: 0.02, stand: 0, turn: 0, headX: -0.02, headY: 0, pen: 0, stamp: 0, roll: 1,
            hL: [-0.07, 0.94, -2.42], hR: [0.07, 0.94, -2.42], out: 0.95 },
  /* il tire le tampon vers lui. ⚠️ LA MAIN DROITE SEULE : les deux mains sur le
     tampon lirait comme une prière */
  /* ⚠️ LE PENCHANT EST PASSÉ DE 0,14 À 0,21 LE 2026-08-31, ET C'EST UNE MESURE,
     PAS UN GOÛT : `render-maire` §3 chiffrait l'épaule à 62,2 cm de la cible
     pour un bras de 59 — la main s'arrêtait donc À CÔTÉ du tampon, et
     `solveArm` bornait la cible en silence plutôt que de le dire. On ne
     rapproche pas l'objet : on se penche pour l'attraper, ce que fait tout le
     monde, et ce que la pose racontait déjà. */
  /* ⚠️ LE PENCHANT EST REDESCENDU DE 0,21 À 0,13 LE 2026-09-02 : les 0,21
     n'existaient QUE pour rattraper un tampon posé hors de portée (62 cm
     d'épaule à cible pour 59 de bras). Le tampon est maintenant à sa place ; se
     casser en deux pour attraper un objet à portée de main était la deuxième
     moitié du même défaut, et c'est elle qui enfonçait sa veste dans le chant
     du plateau. *Quand un geste demande un effort anormal, c'est l'objet qu'il
     faut regarder, pas la posture.* */
  stamp:  { lean: 0.13, rise: 0.02, stand: 0, turn: -0.05, headX: 0.16, headY: -0.10, pen: 0, stamp: 1, roll: 1,
            /* ⚠️ LA MAIN DROITE EST SUR LE TAMPON, PAS À CÔTÉ : sa position tirée
               vaut (0,58 ; 0,90 ; −2,64) — `stamp` la tire de quatorze centimètres
               vers lui. Écrire la cible « à peu près là » mettait la main à huit
               centimètres de l'objet, et c'est le geste qui conclut l'entretien. */
            hL: [-0.26, 0.84, -2.52], hR: [0.575, 0.905, -2.64], out: 0.45 },
  /* ── IL SE LÈVE, REPOUSSE SON FAUTEUIL, SE TOURNE VERS LA FENÊTRE ET VOUS
     PARLE PAR-DESSUS SON ÉPAULE, LES MAINS DANS LE DOS. C'est la posture du
     nœud m12 — et surtout celle qu'il prend DÈS QU'ON ENCHAÎNE LES BONS
     ARGUMENTS (`mayorPose`, `streak >= MAYOR_STREAK_GAIN`). C'est donc une pose
     de MILIEU d'entretien, pas une fin : il continue de parler pendant qu'il la
     tient, et son visage doit rester lisible. ── */
  /* ⚠️⚠️ ELLE ÉTAIT LA SEULE POSTURE CASSÉE DU JEU, ET LA CAUSE N'ÉTAIT PAS
     DANS SES NOMBRES : elle écrivait `rise: 0.13`, or `rise` monte le BUSTE, et
     les jambes ne sont pas ses filles. On obtenait un homme coupé à la taille,
     buste quatorze centimètres au-dessus de ses propres cuisses — mesuré par
     `render-maire` §2, invisible pour `verify-maire` qui vérifie que les sept
     postures EXISTENT. *Une pose ne peut pas inventer une articulation ; quand
     elle en demande une, c'est le squelette qu'il faut ouvrir.*
     ⚠️ `stand` remplace donc `rise` ici, et il lève l'HOMME : hanches et genoux
     se déplient, `man` monte de `STAND_LIFT`, le fauteuil recule. `rise` reste
     pour ce à quoi il sert — les deux centimètres d'un homme qui se redresse
     sur son siège (`lean`, `stamp`).
     ⚠️ LE DOS N'EST PAS TOURNÉ À 180° ET C'EST DÉLIBÉRÉ : la vieille rédaction
     l'annonçait (« la seule pose où il vous tourne le dos ») et écrivait 0,62
     radian, soit trente-cinq degrés — ni l'un ni l'autre. Le corps part vers la
     fenêtre (0,95 rad), la TÊTE revient vers nous (+0,34) : c'est la seule
     figure qui dise « je regarde ailleurs et je vous écoute encore », et c'est
     exactement ce que raconte une bonne série de réponses. */
  window: { lean: 0.04, rise: 0, stand: 1, turn: -0.95, headX: -0.03, headY: 0.34, pen: 0, stamp: 0, roll: 0,
            /* ⚠️ LES DEUX CIBLES SONT RECALCULÉES POUR L'HOMME DEBOUT — l'épaule
               est passée de 1,12 à 1,53 m. Les anciennes (y 0,84) laissaient les
               mains à la hauteur d'un homme assis : à 64,8 cm d'une épaule qui
               n'a que 59 cm de bras, donc bornées, donc un avant-bras qui partait
               tout seul en travers du dos. */
            hL: [0.138, 1.05, -3.175], hR: [0.220, 1.05, -3.061], out: -0.85 },
  /* il repousse le rouleau, du bout des doigts, et se cale */
  push:   { lean: -0.25, rise: 0, stand: 0, turn: 0, headX: -0.03, headY: 0, pen: 0, stamp: 0, roll: 0,
            hL: [-0.34, 0.90, -2.64], hR: [0.34, 0.90, -2.64], out: 0.32 },
};
/* ⚠️⚠️⚠️ UNE POSE DIT OÙ SONT SES MAINS, PAS QUELS ANGLES ONT SES ARTICULATIONS,
   ET C'EST LE PLUS GROS CHANGEMENT DE CE FICHIER.
   Le premier jet écrivait six angles par pose. Résultat mesuré à l'écran : les
   mains flottaient trente centimètres au-dessus du sous-main, « bras croisés »
   donnait deux avant-bras dressés devant le visage, et CHAQUE correction du
   penchant du buste cassait les sept poses d'un coup — puisque l'épaule bouge
   avec lui. Un angle est une grandeur RELATIVE à une chaîne ; une main sur un
   bureau est une grandeur ABSOLUE, et c'est celle qu'on veut écrire.
   ⚠️ `hL`/`hR` sont donc en coordonnées de MONDE, en mètres, dans le repère de la
   pièce : « la main gauche est posée là, sur le cuir ». `solveArm` retrouve les
   angles. Le buste peut se pencher, le fauteuil monter, l'homme rapetisser : les
   mains restent où on les a écrites.
   ⚠️ `out` décide de quel côté sort le coude (positif : vers l'extérieur, la
   posture ordinaire ; négatif : vers l'intérieur, bras croisés ou mains dans le
   dos). Sans ce nombre, la cinématique inverse choisit un plan au hasard et le
   coude part vers le plafond une pose sur deux. */
export const POSE_KEYS = Object.keys(POSE);
/* ⚠️ LES CANAUX SCALAIRES SE LISSENT ; LES MAINS SE LISSENT AUSSI, mais
   composante par composante — d'où la séparation. Elle est DÉRIVÉE de la table :
   ajouter un scalaire à `POSE` suffit à ce que la boucle le lisse (§8). */
export const POSE_VECS = ["hL", "hR"];
export const POSE_CHANNELS = Object.keys(POSE.flat).filter(k => !POSE_VECS.includes(k));

/* ═══════════════════════════════════════════════════════════════════════════
   7. LES VISAGES — HUIT, ET C'EST `MR.MAYOR_EMOTES` QUI LES NOMME
   ───────────────────────────────────────────────────────────────────────────
   `brow` : la hauteur des sourcils (négatif = froncé) · `tilt` : leur pente vers
   l'intérieur (négatif = colère, positif = étonnement/peine) · `lid` : la
   fermeture des paupières, 0 à 1 · `curve` : les coins de la bouche, −1 à +1 ·
   `open` : l'ouverture de la bouche au repos · `pupil` : le pincement de l'iris.
   ⚠️ SIX NOMBRES, PAS DIX-HUIT : un visage à cette échelle ne porte pas plus, et
   chaque nombre de plus est un nombre qu'on réglera de travers.
   ═══════════════════════════════════════════════════════════════════════════ */
export const FACE = {
  angry:   { brow: -0.026, tilt: -0.52, lid: 0.30, curve: -0.85, open: 0.0,  pupil: 0.78 },
  annoyed: { brow: -0.016, tilt: -0.34, lid: 0.24, curve: -0.55, open: 0.0,  pupil: 0.88 },
  cold:    { brow: -0.004, tilt: -0.10, lid: 0.20, curve: -0.28, open: 0.0,  pupil: 1.00 },
  weary:   { brow:  0.000, tilt:  0.16, lid: 0.34, curve: -0.18, open: 0.0,  pupil: 1.00 },
  doubt:   { brow:  0.006, tilt:  0.22, lid: 0.10, curve: -0.06, open: 0.05, pupil: 1.04 },
  listen:  { brow:  0.008, tilt:  0.05, lid: 0.06, curve:  0.10, open: 0.0,  pupil: 1.06 },
  warm:    { brow:  0.014, tilt:  0.14, lid: 0.02, curve:  0.48, open: 0.05, pupil: 1.10 },
  won:     { brow:  0.020, tilt:  0.22, lid: 0.00, curve:  0.85, open: 0.12, pupil: 1.14 },
};
export const FACE_KEYS = Object.keys(FACE);
export const FACE_CHANNELS = Object.keys(FACE.cold);

/* ═══════════════════════════════════════════════════════════════════════════
   8. CE QUE LA BOUCLE APPELLE — TROIS FONCTIONS, ET AUCUNE NE DÉCLARE RIEN
   ═══════════════════════════════════════════════════════════════════════════ */

/* Glisse `cur` vers `want` d'une fraction de la distance, image par image.
   ⚠️ `1 - Math.pow(k, dt)` PLUTÔT QUE `dt * k` : la seconde forme dépend de la
   cadence, donc la même pose met deux fois plus de temps à 30 images/s qu'à 60,
   et le réglage fait à 60 est faux partout ailleurs. */
/* ⚠️ MÊME DÉMÉNAGEMENT QUE `solveArm`, ET MÊME RAISON : deux glissements
   d'interpolation recopiés auraient divergé au premier réglage de cadence. Le
   nom reste exporté d'ici parce que c'est ce que la scène du maire appelle. */
export const ease = R3.ease;
export function poseTarget(key) { return POSE[key] || POSE.flat; }
/* ⚠️⚠️⚠️ L'ÉTAT DE DÉPART SE PREND ICI, JAMAIS PAR `{ ...poseTarget(k) }`.
   Trouvé le 2026-08-31 en écrivant `render-maire` : la vue faisait exactement
   ça, et un étalement RECOPIE LA RÉFÉRENCE des tableaux `hL`/`hR`. `ease`
   écrit ensuite DANS ce tableau — donc dans `POSE.closed` lui-même. La table
   des postures se corrompait à la première image de la première audience, et
   la seconde audience partait d'une pose que personne n'avait écrite. Aucun
   symptôme sur le moment : les nombres restaient plausibles.
   *Une table de référence qu'on étale à plat est une table qu'on modifie.* */
export function poseState(key) { return R3.poseCopy(poseTarget(key)); }
export function faceTarget(key) { return FACE[key] || FACE.cold; }

/* ── LA POSTURE. Elle ne lit que `cur`, jamais l'état de la négociation : c'est
   ce qui permet au SPECTATEUR de jouer exactement la même scène à partir des
   quelques nombres qu'il reçoit (voir `MAYOR_LIVE_KEEPALIVE_MS`). ── */
export function applyPose(rig, cur, t) {
  const m = rig.mayor;
  /* ── SE LEVER. ⚠️⚠️ `stand` EST LE SEUL CANAL QUI TOUCHE À `man`, ET C'EST LA
     DIFFÉRENCE AVEC `rise` : `rise` monte le BUSTE sur ses hanches (deux
     centimètres, un homme qui se redresse), `stand` lève l'HOMME sur ses jambes
     (quarante et un centimètres, hanches et genoux dépliés). Les confondre est
     ce qui cassait `window` : le buste montait, les jambes restaient assises.
     ⚠️ ON GLISSE ENTRE LES DEUX, donc `stand` vaut aussi 0,4 en chemin — c'est
     pourquoi c'est un ANGLE qu'on interpole et pas deux jeux de boîtes : à
     mi-course l'homme est en train de se déplier, pas en double exemplaire. */
  const st = Math.max(0, Math.min(1, cur.stand || 0));
  const knee = st * (Math.PI / 2);
  /* ⚠️ HORS-ZIP 2026-09-02 — LA LEVÉE VIENT DU CORPS, PLUS D'UNE CONSTANTE DE
     MODULE. Il y a cinq maires de cinq tailles depuis ce jour : une constante
     unique aurait donné à Toussaint (1,86 m) la levée de Bonnefoy (1,70), et le
     symptôme n'aurait été visible QUE debout — un maire qui décolle du parquet
     de huit centimètres, une pose sur sept. */
  m.man.position.y = st * (m.lift != null ? m.lift : STAND_LIFT);
  for (const l of m.legs) { l.hip.rotation.x = knee; l.knee.rotation.x = -knee; }
  /* le fauteuil recule quand il se lève. ⚠️ C'est un mouvement de MEUBLE, il est
     donc ici et pas dans la vue : deux descriptions du même geste divergeraient
     (§8 de `CLAUDE.md`), et le symptôme serait un homme debout DANS son siège. */
  if (rig.seat) rig.seat.position.z = ROOM.seatZ - st * 0.34;

  /* la respiration : quatre millimètres, et c'est ce qui sépare un homme d'un
     mannequin. ⚠️ ELLE S'AJOUTE À LA POSE, elle ne la remplace pas — un buste
     qui respirerait « au lieu » de se pencher perdrait le penchant. */
  const breath = Math.sin(t * 1.55) * 0.006 + Math.sin(t * 0.41) * 0.004;
  m.torso.rotation.x = cur.lean + Math.sin(t * 0.37) * 0.012;
  m.torso.rotation.y = cur.turn + Math.sin(t * 0.29) * 0.018;
  m.torso.position.y = (m.waistY != null ? m.waistY : 0.62) + cur.rise + breath;
  /* ⚠️ LE COEFFICIENT EST PASSÉ DE 0,16 À 0,06 LE 2026-08-31. Un homme qui se
     penche sur son bureau PIVOTE, il ne GLISSE pas vers l'avant : la poitrine
     avance déjà de dix centimètres par la seule rotation de l'épaule. Les trois
     centimètres de translation en plus, eux, n'avançaient pas la poitrine — ils
     enfonçaient le ventre de neuf centimètres dans le chant du plateau (son
     fauteuil n'est qu'à dix-neuf centimètres du meuble). Ça ne se voit pas de
     notre chaise ; ça se voit dès qu'on emmène la caméra libre sur le côté,
     c'est-à-dire dans le geste même que la scène promet. */
  m.torso.position.z = 0.02 + cur.lean * 0.06;

  /* ⚠️ LE BUSTE EST REMIS À JOUR AVANT LA CINÉMATIQUE INVERSE : elle travaille
     dans SON repère, et un buste qui vient de se pencher n'a pas encore de
     matrice à jour à cet instant de l'image. Sans cette ligne, les bras suivent
     le penchant d'UNE image de retard — ce qui se voit exactement quand il se
     penche vite, c'est-à-dire au moment où on regarde.
     ⚠️⚠️ ON REPART DE `man`, PAS DU BUSTE, ET C'EST UN DÉFAUT MESURÉ LE
     2026-08-31. `updateMatrixWorld` compose avec la matrice monde du PARENT
     telle qu'elle est : partir du buste laissait `man` d'une image en retard.
     Tant que `man` ne bougeait jamais, la différence était nulle ; le jour où
     `stand` s'est mis à le lever de quarante-quatre centimètres, les deux mains
     se sont posées 39 cm à côté de leur cible — et seulement à la pose SUIVANTE,
     donc de façon intermittente. *Une chaîne se remet à jour depuis sa racine
     ou pas du tout : mise à jour partielle et retard d'une image sont la même
     erreur, et la seconde ne se voit que si la première existe.* */
  m.man.updateMatrixWorld(true);
  solveArm(rig, m.armL, cur.hL, cur.out, -1);
  solveArm(rig, m.armR, cur.hR, cur.out, 1);

  /* la tête suit la pose ET dérive un peu toute seule : un regard parfaitement
     fixe est le second signe qu'on regarde un mannequin */
  m.head.rotation.x = cur.headX + Math.sin(t * 0.63) * 0.020;
  m.head.rotation.y = cur.headY + Math.sin(t * 0.44) * 0.030;
  m.head.rotation.z = Math.sin(t * 0.51) * 0.012;

  /* ── LE STYLO. Deux ancrages, et on glisse de l'un à l'autre : posé sur le
     sous-main, ou dans la main droite en train de tourner. C'est la demande de
     Guillaume (« jouer avec son stylo »), et c'est le geste qui dit « je ne vous
     écoute plus » sans une ligne de texte. ── */
  const p = rig.pen, k = cur.pen;
  const restY = ROOM.deskTop + 0.010, restZ = ROOM.deskC + 0.14;
  m.armR.hd.updateMatrixWorld(true);
  const hand = rig._v.setFromMatrixPosition(m.armR.hd.matrixWorld);
  p.position.set(
    (-0.30) * (1 - k) + (hand.x + 0.02) * k,
    restY * (1 - k) + (hand.y - 0.02) * k,
    restZ * (1 - k) + (hand.z + 0.09) * k);
  p.rotation.set(
    (Math.PI / 2) * (1 - k) + (-0.5) * k,
    (0.32) * (1 - k) + Math.sin(t * 2.1) * 0.35 * k,
    (Math.PI / 2) * (1 - k) + (t * 3.4 % (Math.PI * 2)) * k);

  /* le rouleau : posé en bout de bureau, ou déroulé au milieu du sous-main */
  const r = cur.roll;
  rig.roll.position.set(-0.52 + r * 0.30, ROOM.deskTop + 0.045 - r * 0.030, ROOM.deskC - 0.30 + r * 0.26);
  rig.roll.rotation.set(0, 0.22 - r * 0.22, 0);
  rig.sheet.visible = r > 0.55;
  if (rig.sheet.visible) rig.sheet.scale.set(Math.min(1, (r - 0.55) / 0.35), 1, 1);

  /* le tampon : il le tire vers lui, puis il l'abat */
  /* ⚠️ IL LE TIRE **VERS LUI**, DONC VERS LES z DÉCROISSANTS : le maire est assis
     à z −3,0 et le visiteur à −0,7. L'ancienne ligne AJOUTAIT vingt centimètres,
     c'est-à-dire qu'elle poussait le tampon vers le visiteur pendant que le
     commentaire annonçait le contraire. Personne ne pouvait le voir en lisant :
     les deux lignes sont d'accord entre elles, c'est le repère qui manquait. */
  rig.stamp.position.z = (ROOM.deskC - 0.20) - cur.stamp * 0.14;
  rig.stamp.position.y = (ROOM.deskTop + 0.055) + Math.max(0, Math.sin(t * 3.1)) * 0.02 * (cur.stamp > 0.85 ? 1 : 0);
}


/* ═══════════════════════════════════════════════════════════════════════════
   8 bis. LA CINÉMATIQUE INVERSE DU BRAS — DEUX SEGMENTS, UN PLAN, UN CHOIX
   ───────────────────────────────────────────────────────────────────────────
   ⚠️ ELLE TIENT EN VINGT LIGNES PARCE QU'UN BRAS EST LE CAS LE PLUS SIMPLE QUI
   SOIT : deux segments de longueur fixe, une cible, et UN degré de liberté qui
   reste — la rotation du coude autour de l'axe épaule-main. C'est ce degré-là
   que `out` fixe, et c'est le seul endroit où l'on décide quelque chose : sans
   lui, le coude part vers le plafond une pose sur deux, et rien dans les nombres
   ne le laisse prévoir.

   ⚠️⚠️ LE PIÈGE, ET IL EST CLASSIQUE : LA CIBLE PEUT ÊTRE HORS DE PORTÉE. Un
   `acos` d'un argument hors de [−1, 1] rend `NaN`, et un `NaN` dans une matrice
   de transformation fait DISPARAÎTRE tout le sous-arbre — le bras entier, sans
   la moindre exception à chercher. C'est très exactement le défaut du 480 bis
   (`STAR_FARM_CRATER_DRAW_SCALES`, un tableau qui rendait `undefined` en
   silence), et la parade est la même : on borne AVANT de calculer, pas après.
   ═══════════════════════════════════════════════════════════════════════════ */
/* ⚠️ LA LEVÉE EST DÉRIVÉE DE LA JAMBE, PAS CHOISIE : cuisse 0,44 + tibia 0,41 +
   la demi-épaisseur du soulier, moins la hauteur de hanche assise (0,50). Un
   nombre réglé à l'œil ici enfoncerait les semelles dans le parquet ou les
   ferait flotter, et c'est le genre d'écart qu'on ne voit qu'à la bonne
   caméra (§8 : un paramètre qui double un autre paramètre doit être DÉRIVÉ). */
export const STAND_LIFT = mensurations(MAYOR_LOOKS.lantier).lift;

/* ⚠️ LES DEUX LONGUEURS SONT CELLES DES OS DESSINÉS, ET `ARM_FORE` MENTAIT
   D'UN CENTIMÈTRE : `buildMayor` accroche la main en (0, −0,30, 0) du coude,
   pas en −0,29. Un centimètre d'écart CONSTANT sur les quatorze cibles, que
   `render-maire` §3 a rendu visible du premier coup en affichant l'écart au
   lieu de le supposer nul. *Deux descriptions de la même longueur divergent
   toujours ; celle-ci est maintenant à côté de son os.* */
const ARM_UPPER = mensurations(MAYOR_LOOKS.lantier).armUp,
      ARM_FORE = mensurations(MAYOR_LOOKS.lantier).armFore;
export function solveArm(rig, arm, target, out, side) {
  /* ⚠️⚠️⚠️ LE SOLVEUR EST PARTI DANS `rig3d.js`, ET LA RAISON EST DATÉE : il y a
     maintenant DEUX personnages articulés (le maire ici, Tristan à sa scie) et
     une loi des cosinus recopiée est une divergence en attente — la première
     correction de repli dégénéré ou de choix de coude n'aurait porté que d'un
     côté (§8 de `CLAUDE.md`). Ce qui RESTE ici, et qui doit y rester, ce sont
     les deux longueurs d'os : elles décrivent CE corps-là, et elles doivent
     vivre à côté des boîtes qu'elles mesurent (`ARM_FORE` a menti d'un
     centimètre le jour où elle en était séparée).
     ⚠️ Le comportement est inchangé au bit près — c'est `render-maire` §3, qui
     mesure l'écart entre la main rendue et la main écrite (14 mains à 0,0 cm),
     qui rend cette délégation sûre plutôt que probable. */
  /* ⚠️ HORS-ZIP 2026-09-02 — LES DEUX OS VIENNENT DU CORPS QU'ON RÉSOUT, pas du
     module : `buildMayor` les pose dans `mayor.bones` au moment où il dessine
     les cylindres, donc ils ne peuvent plus mentir d'un centimètre comme
     `ARM_FORE` l'a fait le 2026-08-31. Les constantes ci-dessus restent le
     repli, et elles valent celles d'un maire de 1,80 m. */
  const bo = rig.mayor.bones || { up: ARM_UPPER, fore: ARM_FORE };
  R3.solveArm(rig._T, rig.mayor.torso, arm, target, out, side, bo.up, bo.fore);
}

/* ── LE VISAGE. ⚠️ `talk` EST UNE ENVELOPPE, PAS UN ALÉA PAR IMAGE : une bouche
   tirée au sort à chaque frame vibre, une bouche pilotée par deux sinusoïdes
   incommensurables articule. C'est la même règle que les bouffées du §4. ── */
export function applyFace(rig, cur, t, talk, blink) {
  const m = rig.mayor;
  const half = 0.062;
  m.browL.position.y = 0.062 + cur.brow;  m.browR.position.y = 0.062 + cur.brow;
  m.browL.rotation.z = -cur.tilt * 0.5;   m.browR.rotation.z = cur.tilt * 0.5;
  m.browL.position.x = -0.052 + cur.tilt * 0.006;
  m.browR.position.x = 0.052 - cur.tilt * 0.006;

  const lid = Math.min(1, cur.lid + blink);
  m.eyeL.lid.position.y = 0.034 - lid * 0.036;
  m.eyeR.lid.position.y = 0.034 - lid * 0.036;
  m.eyeL.iris.scale.set(cur.pupil, cur.pupil, 1);
  m.eyeR.iris.scale.set(cur.pupil, cur.pupil, 1);
  /* le regard glisse d'un ou deux millimètres : c'est ce qui fait qu'il vous
     regarde VOUS plutôt que dans votre direction */
  const gaze = Math.sin(t * 0.33) * 0.004 + Math.sin(t * 0.17) * 0.003;
  m.eyeL.iris.position.x = gaze; m.eyeR.iris.position.x = gaze;

  const open = Math.max(0, cur.open + talk);
  m.lipC.scale.set(1, 1 + open * 26, 1);
  m.mouthDark.scale.set(1, Math.max(0.2, open * 34), 1);
  m.lipC.position.y = -open * 0.004;
  m.lipL.position.y = cur.curve * 0.012;
  m.lipR.position.y = cur.curve * 0.012;
  m.lipL.rotation.z = -cur.curve * 0.45;
  m.lipR.rotation.z = cur.curve * 0.45;
  m.lipC.scale.x = 1 + cur.curve * 0.12;
  void half;
}

/* ── L'ENVELOPPE DE PAROLE. Rendue par une fonction pure pour que le banc puisse
   vérifier qu'elle reste bornée : une bouche qui s'ouvrirait à 1,4 traverserait
   le menton, et c'est le genre de défaut qu'on ne voit qu'à la bonne seconde. ── */
export function talkEnvelope(t) {
  const a = Math.sin(t * 12.7), b = Math.sin(t * 7.3 + 1.1), c = Math.sin(t * 19.1 + 2.3);
  return Math.max(0, (a * 0.5 + b * 0.32 + c * 0.18)) * 0.055;
}
/* ── LE CLIGNEMENT. Deux fermetures par cycle irrégulier, jamais périodiques :
   un clignement à intervalle fixe se remarque en dix secondes. ── */
export function blinkAt(t) {
  const p = (t * 0.31 + Math.sin(t * 0.17) * 0.5) % 1;
  return p < 0.045 ? Math.sin((p / 0.045) * Math.PI) : 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. LES VUES — ET ELLES SONT TOUTES À LA PREMIÈRE PERSONNE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️ DÉCISION DE GUILLAUME, EN COURS DE PASSE : « ce sera un 1st person cet
   entretien ». Ça n'est pas un cadrage, c'est une CONTRAINTE DE CONSTRUCTION :
   il n'y a pas de corps de visiteur à dessiner (on est dedans), aucune vue ne
   peut se placer derrière nous, et surtout la caméra libre n'est pas un travelling
   de cinéma — c'est quelqu'un d'assis qui tourne la tête, se penche, et finit
   par se lever pour regarder la bibliothèque pendant qu'on lui parle.
   ⚠️ C'est aussi ce qui condamnait la vue fixe du 480 : à la première personne,
   tout ce qu'on peut regarder doit exister. D'où le §3 de ce fichier.

   Les trois repères sont donc trois ATTITUDES, pas trois plans : assis, penché
   en avant sur le bureau, debout. `look` est le point qu'on regarde en y
   arrivant ; ensuite la souris fait le reste.
   ═══════════════════════════════════════════════════════════════════════════ */
export const VIEWS = {
  /* ⚠️⚠️ LA HAUTEUR D'ŒIL EST LE SEUL NOMBRE QUI COMPTE ICI, ET LE PREMIER JET
     L'AVAIT À 1,24 — c'est-à-dire le regard AU RAS du plateau : le bureau
     mangeait la moitié basse de l'image et le maire flottait dans ce qui restait.
     À 1,42 (un homme assis bien droit) le plateau descend au tiers, exactement
     comme sur la première référence de Guillaume, et c'est LUI qu'on regarde.
     ⚠️ Trouvé en regardant, pas en calculant : aucun nombre de ce fichier ne
     disait que le cadre était faux.
     ⚠️⚠️ PUIS REDESCENDU À 1,26 QUAND LE MAIRE A RAPETISSÉ : nous sommes ASSIS
     nous aussi, sur la chaise de visiteur. Un œil à 1,42 est un œil DEBOUT, et
     l'entretien se jouait en surplomb — l'inverse exact de ce que la scène
     raconte. Son fauteuil à lui est surélevé : il nous domine de sept
     centimètres, et c'est tout ce qu'il faut pour qu'on le sente. */
  /* ⚠️⚠️ ELLE VISE SOUS SON MENTON, PAS SES YEUX, ET C'EST UN ARBITRAGE
     D'INTERFACE : le bandeau de réponses occupe le tiers bas de l'écran. Cadrée
     sur son regard, la vue mettait ses MAINS derrière les boutons — c'est-à-dire
     qu'on perdait le stylo qu'il fait tourner, le tampon qu'il tire vers lui et
     les plans qu'il repousse, tout ce que Guillaume a demandé de voir. Six
     degrés de plongée les ramènent au-dessus du bandeau sans sortir son visage
     du cadre. *Un cadrage se règle contre l'interface qui va le recouvrir, pas
     dans le vide.*
     ⚠️ ET ON EST RECULÉ DE VINGT-HUIT CENTIMÈTRES DE PLUS QU'AU PREMIER JET, pour
     une raison qui n'a rien à voir avec le décor : la BULLE se pose au-dessus de
     sa tête. Cadré serré, son crâne touchait le haut de l'image, la bulle se
     rabattait dessus, et on lisait sa réplique par-dessus son visage — au moment
     précis où le visage est ce qui dit s'il y croit. Trois quarts de mètre de
     recul rendent la place. */
  /* ⚠️ LA VISÉE EST REMONTÉE DE 1,14 À 1,22 LE 2026-09-02, ET C'EST LE PENDANT
     EXACT DU FAUTEUIL SURÉLEVÉ : viser plus haut fait DESCENDRE le sujet dans le
     cadre. Sans ça, les huit centimètres gagnés par la hanche assise remontaient
     sa tête d'autant, et la bulle de réplique — qui se pose au-dessus d'elle —
     venait recouvrir la plaque de son nom et les trois boutons de caméra. C'est
     la note ci-dessus reprise à l'envers : *un cadrage se règle contre
     l'interface qui va le recouvrir*, et il se re-règle le jour où le sujet
     change de taille. */
  seat: { pos: [0.00, 1.34, -0.70], look: [0.00, 1.22, -2.95] },   // notre chaise
  desk: { pos: [-0.04, 1.18, -1.44], look: [0.10, 0.80, -2.40] },  // penché sur le sous-main
  /* ⚠️ « LA PIÈCE » N'EST PAS UN PLAN LARGE, C'EST UN GESTE : on s'est levé et
     on a reculé de deux pas vers la porte. Le premier jet plantait la caméra au
     milieu du tapis, nez contre le drapeau — un plan de cinéma raté plutôt qu'un
     déplacement. */
  room: { pos: [1.35, 1.71, 1.15], look: [-0.25, 1.28, -2.70] },   // debout, deux pas en arrière
};
export const VIEW_KEYS = Object.keys(VIEWS);

/* ⚠️⚠️ LES BORNES DE LA CAMÉRA LIBRE SORTENT DE `ROOM`, ET C'EST TOUT LE POINT
   DU §1 : deux descriptions de la même pièce divergeraient, et le symptôme
   serait une caméra qui traverse un mur qu'elle voit. On y ajoute UNE boîte
   interdite — le bureau — parce qu'un joueur qui passe la tête à travers le
   meuble voit l'intérieur des tiroirs, c'est-à-dire rien. */
export function clampCam(p) {
  const R = ROOM, m = 0.42;
  p.x = Math.max(R.x0 + m, Math.min(R.x1 - m, p.x));
  p.z = Math.max(R.z0 + m, Math.min(R.z1 - m, p.z));
  p.y = Math.max(0.55, Math.min(R.h - 0.35, p.y));
  /* le bureau, son fauteuil et l'homme dessus : une seule boîte, on ressort par
     le côté le moins profond — c'est la parade la plus courte qui ne colle pas
     la caméra dans un coin */
  const bx = 1.42, z0 = R.deskC - R.deskD / 2 - 0.55, z1 = R.deskC + R.deskD / 2;
  if (p.y < 1.95 && Math.abs(p.x) < bx && p.z > z0 && p.z < z1) {
    const dOut = [bx - Math.abs(p.x), p.z - z0, z1 - p.z];
    const i = dOut.indexOf(Math.min(...dOut));
    if (i === 0) p.x = Math.sign(p.x || 1) * bx;
    else if (i === 1) p.z = z0;
    else p.z = z1;
  }
  return p;
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. L'ASSEMBLAGE
   ───────────────────────────────────────────────────────────────────────────
   ⚠️⚠️⚠️ IL REND UN OBJET, ET LA BOUCLE DE RENDU NE DÉCLARE RIEN. C'est le
   piège n°1 de `CLAUDE.md` traité à la source : tout ce qui doit vivre entre
   deux images (pivots, matériaux, lampes) est ici, dans un objet que l'appelant
   garde dans un `ref`. La boucle de `MaireScene.js` ne fait qu'appeler des
   fonctions de MODULE, donc chacune d'elles reste lisible — et corrigeable —
   sans ouvrir la boucle.
   ⚠️ `junk` COLLECTE TOUT CE QUI SE LIBÈRE. Un navigateur n'accorde qu'une
   poignée de contextes WebGL et pas beaucoup plus de mémoire de textures : trois
   audiences dans la même session, et la quatrième s'ouvre sur du noir. C'est le
   même défaut que les 1 829 canevas de `fermeArt` mesurés cette passe, en pire,
   parce qu'une texture GPU ne se ramasse pas toute seule.
   ═══════════════════════════════════════════════════════════════════════════ */
export function buildOffice(THREE, opts) {
  const o = opts || {};
  const junk = [];
  const root = new THREE.Group();
  const K = maker(THREE, root, junk);

  const tex = {
    parquet: texParquet(THREE), wall: texWall(THREE), rug: texRug(THREE),
    books: texBooks(THREE), town: texTown(THREE), blotter: texBlotter(THREE),
    arms: texArms(THREE), paintA: texPaint(THREE, "hist"), paintB: texPaint(THREE, "allegory"),
    bang: texBang(THREE),
  };
  for (const k in tex) junk.push(tex[k]);
  const plate = texPlate(THREE, o.plateLabel || "MAIRE", o.mayorName || "");
  junk.push(plate);

  const room = buildRoom(THREE, K, tex);
  const desk = buildDesk(THREE, K, tex, plate);
  /* ⚠️ HORS-ZIP 2026-09-02 — LE CORPS DÉPEND DU MAIRE ÉLU. `o.mayorKey` vient de
     la vue (`MaireScene`), qui le tient de `E.mayorOf(day)` : c'est la MÊME clé
     que la plaque du bureau et que les répliques `tint`. Absente, on retombe sur
     un corps par défaut plutôt que de planter — un bureau sans maire serait
     pire qu'un maire au hasard. */
  const mayor = buildMayor(THREE, K, mayorLook(o.mayorKey));

  /* ── LE « ! » DE LA PORTE CLAQUÉE. Demande de Guillaume, mot pour mot. Il est
     en 3D et attaché à la TÊTE : il suit donc la caméra libre sans qu'on ait à
     projeter quoi que ce soit, et il reste juste quand on regarde la scène
     depuis le fond de la pièce. ── */
  const bangMat = new THREE.SpriteMaterial({ map: tex.bang, transparent: true, depthTest: false });
  junk.push(bangMat);
  const bang = new THREE.Sprite(bangMat);
  bang.scale.set(0.34, 0.34, 1);
  /* ⚠️⚠️ HORS-ZIP 2026-09-02 — IL EST ACCROCHÉ AU COU, PLUS À LA TÊTE, ET C'EST
     L'ÉCHELLE QUI L'EXIGE : `head.scale` est ANISOTROPE depuis cette passe
     (0,75 en largeur contre 0,88 en hauteur, pour sortir le crâne du cube), et
     un sprite enfant d'un nœud mis à l'échelle inégalement est un sprite
     déformé — un « ! » aplati d'un cinquième. Le cou ne porte aucune échelle.
     ⚠️ Et c'est mieux ainsi : le « ! » ne suit plus les hochements de tête. Un
     signe de ponctuation qui balance au-dessus d'un crâne se lit comme un bogue
     d'affichage, pas comme une porte qui claque. */
  bang.position.set(0, mayor.mens.neck + mayor.mens.headK[1] * 0.42, 0.02);
  bang.visible = false;
  bang.renderOrder = 10;
  mayor.neck.add(bang);

  /* ═══ LA LUMIÈRE ═══
     ⚠️⚠️ LE PARTI EST CELUI DU 480 ET IL EST JUSTE : le jour vient de la fenêtre
     DERRIÈRE lui, donc il est à contre-jour, donc son visage est dans une ombre
     douce — et c'est cette ombre qui rend les sourcils lisibles. Un maire éclairé
     de face aurait un visage plat, c'est-à-dire pas de visage (§8 : ce qui compte
     n'est pas la moyenne, c'est l'ÉCART).
     ⚠️ Quatre lampes, pas huit : r128 recalcule chaque lampe par fragment. */
  const hemi = new THREE.HemisphereLight(0xc6d8ea, 0x2a2118, 0.50); root.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.22);
  sun.position.set(-1.4, 5.2, -6.5); sun.target.position.set(0, 1.2, -2.4);
  root.add(sun); root.add(sun.target);
  const warm = new THREE.PointLight(0xffd49a, 0.62, 5.4);           // la lampe de banquier
  warm.position.set(-0.82, ROOM.deskTop + 0.30, ROOM.deskC - 0.10); root.add(warm);
  const chand = new THREE.PointLight(0xffe0b0, 0.44, 7.5);          // le lustre
  chand.position.set(0, ROOM.h - 0.90, -1.5); root.add(chand);
  /* ⚠️ UNE LAMPE DE REMPLISSAGE, DEPUIS NOTRE PLACE. Sans elle le contre-jour
     est si franc qu'on ne lit plus rien du tout — c'est la fausse piste mesurée
     du §8 (« compenser au jugé »), et la parade est la même qu'en photo : une
     réflexion faible, pas un second soleil. */
  const fill = new THREE.PointLight(0xdfe6f0, 0.34, 6.0);
  fill.position.set(0.2, 1.5, -0.6); root.add(fill);

  return {
    root, mayor, room,
    pen: desk.pen, roll: desk.roll, sheet: desk.sheet, stamp: desk.stamp, seat: desk.seat,
    paper: desk.paper, lamp: desk.lamp, door: room.door, bang,
    lights: { hemi, sun, warm, chand, fill },
    _v: new THREE.Vector3(),
    /* ⚠️⚠️ LES VECTEURS DE TRAVAIL SONT ALLOUÉS UNE FOIS, ICI. Un `new Vector3()`
       dans `solveArm` est six allocations par bras et par image, soit sept cents
       par seconde — c'est le genre de coût qui ne casse rien et qui fait tousser
       le ramasse-miettes toutes les vingt secondes, exactement au moment où il
       se penche. */
    _T: { v: new THREE.Vector3(), d: new THREE.Vector3(), x: new THREE.Vector3(),
          y: new THREE.Vector3(), z: new THREE.Vector3(), hint: new THREE.Vector3(),
          m: new THREE.Matrix4() },
    /* ⚠️ ON LIBÈRE GÉOMÉTRIES, MATÉRIAUX ET TEXTURES — pas seulement le
       renderer. Le contexte rendu ne rend PAS la mémoire des textures si les
       objets sont encore référencés quelque part, et une scène de 3 Mo laissée
       derrière soi à chaque audience finit par fermer la partie. */
    dispose() {
      for (const j of junk) { try { j.dispose && j.dispose(); } catch (e) { /* déjà rendu */ } }
      junk.length = 0;
    },
  };
}
