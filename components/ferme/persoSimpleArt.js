/* ╔══════════════════════════════════════════════════════════════════════════
   ║ persoSimpleArt — LE TRAIT SIMPLE : L'ANCIEN 16 × 24, AFFINÉ EN 32 × 48 (2026-10-30, branché le 2026-10-31)
   ╚══════════════════════════════════════════════════════════════════════════
   Sa phrase (2026-10-30) : « le graphisme actuel s'écarte trop du style simple des anciens dessins originaux. Même si on veut
   améliorer le nombre de pixels relativement à ces dessins originaux, il faudrait garder au maximum la simplicité formelle. »
   Son verdict (2026-10-31, page de jugement, docs/PROJETS.md §12) : la colonne HABIT — « on détaille au mieux pour que les habits
   soient beaux » ; la marche à huit images ; tout le monde, joueurs et habitants ; l'interrupteur au MENU DEV, pour toute la partie.

   L'IDÉE : on ne redessine pas le personnage. `drawCharFrame` (fermeArt.js) le peint comme toujours — n'importe quelle tenue,
   costume de PNJ, coupe du salon, vêtement de la Maison Garfield —, mais À ×2 (`fine` : son `P` multiplie ses rectangles par deux),
   ce qui lui permet deux choses que le 16 × 24 ne sait pas faire :
   · LE DEMI-PAS : `step` et `bob` à 0,5 tombent sur un pixel fin entier → la marche à huit images (`PERSO_SIMPLE_WALK`) ;
   · LES SIGNES DU VÊTEMENT (`paintHabitFine`, plus bas) : col, boutons, poignets, ceinture, ourlet, poches, bretelles — d'un pixel
     fin, dans les couleurs que le vêtement a déjà (son ombre et son clair à ±30, le cuir des chaussures), peints APRÈS le vêtement
     qu'ils détaillent et AVANT la garde-robe qui les recouvre. Ils suivent donc le pas, les poses et chaque costume sans détection.
   Puis ce module RETOUCHE l'image fine (`persoSimpleGridFine`), toujours sans dessiner de forme neuve :
   · « net »    : les coins saillants de la silhouette perdent un pixel fin (la règle de Scale2x, appliquée seulement quand elle
                  VIDE un pixel contre le vide ; écrite au pixel fin pour valoir aussi sur les demi-pas — identique à Scale2x sur une
                  image ×2 au plus proche, le banc le vérifie) ;
   · « visage » : les deux bandes de l'ancien (l'épaule claire, l'ombre du menton) deviennent des liserés d'un pixel, et les traits
                  du visage sont refaits au pixel fin, à l'encre plate de l'ancien — ce qui permet les EXPRESSIONS sans reflet, sans
                  joues peintes, sans contour ;
   · « habit »  : + la semelle (la dernière rangée, un ton plus sombre), le seul signe qui se lit mieux sur l'image que dans le dessin.
   Ce qui n'est PAS ici, et ne doit pas y venir : pas de contour (l'ancien n'en a pas), pas de modelé à quatre tons, pas de reflet.
   ⚠️ Écarté au premier essai : le Scale2x complet (arrondir AUSSI les frontières intérieures) tord les traits du visage — la bouche
   de 4 × 1 perd ses coins du haut et tout le monde boude.

   Les repères du 16 × 24 (drawCharFrame, de face) : tête x 4-11, y 2-9 (menton en 9) ; yeux (6, 5-6) et (9, 5-6) `#3a2a1e` ;
   bouche (6-9, 8) ; bande claire de l'épaule y 10 ; mains y 15 ; le pas (images 1 et 3) descend tout le corps d'un pixel (`bob`).
   Au pixel fin : tout ×2, et `bobF` = 2 × bob (0, 1 ou 2). La partie retouche est pure (tableaux RGBA en entrée et en sortie) ;
   `paintHabitFine` peint par le `P` qu'on lui tend, comme `garderobeArt.js`. */

export const PERSO_SIMPLE_W = 32, PERSO_SIMPLE_H = 48;
export const PERSO_SIMPLE_NIVEAUX = ["ancien", "net", "visage", "habit", "soigne"];   // 2026-11-21 : « soigné » (niveau 4), voir plus bas
/* 2026-11-21 — le jeu fabrique ses feuilles au niveau 4 (« soigné ») tant que `on` : un AJOUT désactivable (menu dev, « Ajouts de la nuit
   du 21 novembre », `AJOUTS.persoSoigne` de FermeGame.js, local) ; éteint, le niveau 3 du 31 octobre. Les deux ont leur clé de cache. */
export const PERSO_SOIGNE = { on: true, plat: true };   // `plat` : la garde-robe en deux tons (`flatRamp`, garderobeArt.js), son propre ajout
// le préfixe de cache des feuilles au trait simple : un par combinaison des ajouts (basculer ne refabrique rien qu'on a déjà vu)
export const persoSimpleKey = () => "s" + (PERSO_SOIGNE.on ? "4" : "") + (PERSO_SOIGNE.plat ? "p" : "") + ":";
/* Le côté de la frange d'un personnage (+1 depuis la gauche de l'écran, −1 depuis la droite) : les garçons alternent d'une tenue à
   l'autre (la couleur des cheveux suit déjà la tenue : changer de tenue, c'est changer de tête) ; les filles la balaient loin de leur
   barrette, toujours à droite. Un habitant à costume (`look`) prend son côté de son nom. */
export function persoSweep(gender, outfit, look) {
  if (gender === "f") return 1;
  let h = outfit | 0;
  if (look) for (let i = 0; i < look.length; i++) h = (h * 31 + look.charCodeAt(i)) | 0;
  return (h & 1) ? -1 : 1;
}
export const PERSO_SIMPLE_EXPRESSIONS = ["neutre", "joie", "rire", "surprise", "colere", "tristesse", "gene", "sommeil", "clin", "amour", "cligne"];
/* LA MARCHE À HUIT IMAGES (images 1 à 8 de la feuille de marche ; l'image 0 est l'ancienne image 0, debout). L'ancien cycle — 0 droit,
   1 pas à droite et corps baissé, 2 droit, 3 pas à gauche et corps baissé — avec ses demi-pas : le pied avance d'un pixel fin, le corps
   descend d'un pixel fin. `stepI` : le pas ENTIER que lisent les dessins en grille de lettres (le balancement de la jupe, d'une écharpe,
   d'une mèche) — il bascule sur la demi-image qui SUIT le pas plein, pour que chaque côté dure deux images sur huit, comme une sur quatre. */
export const PERSO_SIMPLE_WALK = [0, 0.5, 1, 0.5, 0, -0.5, -1, -0.5].map((step, i) => ({ step, bob: Math.abs(step), stepI: [0, 0, 1, 1, 0, 0, -1, -1][i] }));

/* ─── Couleurs en entiers : 0 = vide, sinon 0x1RRGGBB ─────────────────────── */
const keyAt = (px, i) => (px[i + 3] < 128 ? 0 : (0x1000000 | (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]));
const chan = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255];
const clamp = (v) => Math.max(0, Math.min(255, v));
const rgbKey = (r, g, b) => 0x1000000 | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b);
const adjust = (k, d) => { const [r, g, b] = chan(k); return rgbKey(r + d, g + d, b + d); };
const hexKey = (h) => rgbKey(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16));
const EYE = hexKey("#3a2a1e"), HEART = hexKey("#e85a8a"), BLUSH = hexKey("#f0a8a0");
// `tint` de drawCharFrame : +30 sur chaque canal (borné). On reconnaît la bande claire de l'épaule à ce rapport, pas à une position :
// un costume (salopette, gilet) qui n'a pas cette bande n'est pas touché.
const isTintOf = (t, k) => t && k && chan(t).every((v, i) => { const e = clamp(chan(k)[i] + 30); return Math.abs(v - e) <= 2; });

/* ─── « Net » : les coins saillants arrondis d'un pixel fin ──────────────────
   Au pixel fin, un pixel plein dont DEUX voisins d'un même coin (haut et gauche, par exemple) sont vides, et dont les deux autres
   bras portent au moins deux pixels pleins (à droite x+1 et x+2, en bas y+1 et y+2), est un coin saillant : il se vide. Sur une image
   ×2 au plus proche, c'est exactement la règle de Scale2x restreinte à « vider contre le vide » (le prototype du 2026-10-30) ; sur un
   demi-pas (corps décalé d'un pixel fin par rapport aux jambes), elle arrondit les mêmes coins sans en inventer. */
function roundCorners(src) {
  const W = PERSO_SIMPLE_W, H = PERSO_SIMPLE_H, o = src.slice();
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : src[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!at(x, y)) continue;
    const up = at(x, y - 1), dn = at(x, y + 1), lf = at(x - 1, y), rt = at(x + 1, y);
    const upArm = up && at(x, y - 2), dnArm = dn && at(x, y + 2), lfArm = lf && at(x - 2, y), rtArm = rt && at(x + 2, y);
    if ((!up && !lf && rtArm && dnArm) || (!up && !rt && lfArm && dnArm) || (!dn && !lf && rtArm && upArm) || (!dn && !rt && lfArm && upArm)) o[y * W + x] = 0;
  }
  return o;
}

/* ─── Les visages, à l'encre de l'ancien ──────────────────────────────────
   Lettres : E l'œil, M la bouche, d l'intérieur d'une bouche ouverte (la bouche −40), R la joue (le rose de la fermière d'origine),
   K le cœur. Coordonnées fines de la tête : colonnes 8-23, rangées 4-19 ; les yeux d'origine en (12-13, 10-13) et (18-19, 10-13). */
const FACE = {
  neutre: { eyes: ["EE", "EE", "EE"], ey: 1, mouth: ["M....M", ".MMMM."], mx: 13 },
  joie: { eyes: [".EE.", "E..E"], ex: -1, ey: 1, mouth: ["MMMMMM", ".MddM."], mx: 13, my: 15 },
  rire: { eyes: [".EE.", "E..E"], ex: -1, ey: 1, mouth: ["MMMMMMMM", "MddddddM", ".MddddM."], mx: 12, my: 15 },
  surprise: { eyes: ["EE", "EE", "EE", "EE"], ey: -1, mouth: [".MM.", "MddM", ".MM."], mx: 14, my: 15 },
  // les sourcils froncés : un trait d'encre qui descend vers le nez, collé à l'œil
  colere: { left: ["EE..", "..EE", "..EE"], right: ["..EE", "EE..", "EE.."], lx: 10, rx: 18, ey: 1, mouth: ["MMMMMM"], mx: 13 },
  tristesse: { left: ["..E.", ".E..", "....", ".EE."], right: [".E..", "..E.", "....", ".EE."], lx: 11, rx: 17, ey: 1, mouth: [".MM.", "M..M"], mx: 14 },
  gene: { eyes: ["EE", "EE", "EE"], ex: -1, ey: 1, mouth: [".M.M.M", "M.M.M."], mx: 13, cheeks: 2 },
  sommeil: { eyes: ["EEE"], ex: -1, ey: 3, mouth: ["MM"], mx: 15 },
  clin: { left: ["EE", "EE", "EE"], right: ["...", "EEE"], lx: 12, rx: 18, ey: 1, mouth: ["M....M", ".MMMM."], mx: 13 },
  amour: { eyes: ["K.K", "KKK", ".K."], ex: -1, ey: 1, mouth: ["M....M", ".MMMM."], mx: 13, cheeks: 1 },
  cligne: { eyes: ["EE"], ey: 3, mouth: ["M....M", ".MMMM."], mx: 13 },
};

/* La retouche d'une image FINE (32 × 48, RGBA) : `px32` vient de `drawCharFrame(…, fine)` ou d'un 16 × 24 agrandi au plus proche.
   `dir` 0 face, 1 dos, 2 profil (vers la droite) ; `bobF` : de combien de pixels fins le corps est descendu (0, 1 ou 2) ; `niveau` 0-3
   (PERSO_SIMPLE_NIVEAUX) ; `expr` ; `pnj` : la bouche droite de l'habitant au repos. Rend un Int32Array 32 × 48 de couleurs. */
export function persoSimpleGridFine(px32, { dir = 0, bobF = 0, niveau = 3, expr = "neutre", pnj = false, sweep = 1 } = {}) {
  const W = PERSO_SIMPLE_W, H = PERSO_SIMPLE_H;
  const src = new Int32Array(W * H);
  for (let i = 0; i < src.length; i++) src[i] = keyAt(px32, i * 4);
  const o = niveau >= 1 ? roundCorners(src) : src;
  if (niveau < 2) return o;
  // les sondes lisent l'image d'ENTRÉE (le coin d'un repère du 16 × 24, décalé du pas) ; les retouches écrivent dans `o`
  const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : src[y * W + x]);
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : o[y * W + x]);
  const set = (x, y, k) => { if (x >= 0 && y >= 0 && x < W && y < H) o[y * W + x] = k; };
  const Y = (y) => y + bobF;
  // la peau : entre les yeux et la bouche de face, devant l'œil de profil (les côtés de la tête sont aux cheveux longs)
  const skin = dir === 0 ? a(14, Y(14)) : dir === 2 ? a(18, Y(14)) : 0;
  const face = dir === 0 ? a(12, Y(10)) === EYE && a(12, Y(12)) === EYE && a(18, Y(10)) === EYE
    : dir === 2 ? a(20, Y(10)) === EYE && a(20, Y(12)) === EYE : false;

  // ── les deux bandes deviennent des liserés d'un pixel fin
  for (let x = 0; x < W; x++) {
    const t = a(x, Y(20)), k = a(x, Y(22));
    if (t !== k && a(x, Y(21)) === t && isTintOf(t, k)) set(x, Y(21), k);
  }
  if (face) for (let x = 8; x < 24; x++) {
    const c = a(x, Y(19)), above = a(x, Y(17));
    if (above === skin && c && c !== skin && a(x, Y(18)) === c) set(x, Y(18), skin);
  }

  // ── le visage
  if (face && dir === 0) {
    const mouth = a(12, Y(16)), mk = mouth !== skin ? mouth : adjust(skin, -50);
    for (let y = 10; y < 14; y++) for (const x of [12, 13, 18, 19]) set(x, Y(y), skin);
    if (mouth !== skin) for (let y = 16; y < 18; y++) for (let x = 12; x < 20; x++) set(x, Y(y), skin);
    const ink = { E: EYE, M: mk, d: adjust(mk, -40), K: HEART, R: BLUSH };
    const pat = (x, y, rows) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== ".") set(x + i, Y(y + j), ink[r[i]]); });
    const F = FACE[expr] || FACE.neutre;
    const ey = 10 + (F.ey || 0), ex = F.ex || 0;
    if (F.eyes) { pat(12 + ex, ey, F.eyes); pat(18 + ex, ey, F.eyes); }
    else { pat(F.lx, ey - (F.left.length > 3 ? 1 : 0), F.left); pat(F.rx, ey - (F.right.length > 3 ? 1 : 0), F.right); }
    // l'habitant garde la bouche droite de son 16 × 24, rendue fine ; le joueur sourit
    const mouthRows = pnj && (expr === "neutre" || expr === "cligne") ? ["MMMM"] : F.mouth;
    pat(pnj && mouthRows.length === 1 && mouthRows[0] === "MMMM" ? 14 : F.mx, F.my || 16, mouthRows);
    if (F.cheeks) { pat(9, 14, F.cheeks > 1 ? ["RRR"] : ["RR"]); pat(F.cheeks > 1 ? 20 : 21, 14, F.cheeks > 1 ? ["RRR"] : ["RR"]); }
  } else if (face && dir === 2) {
    // de profil : l'œil de 2 × 3, au même endroit ; fermé en un trait pour le clignement et le sommeil
    for (let y = 10; y < 14; y++) { set(20, Y(y), skin); set(21, Y(y), skin); }
    if (expr === "cligne" || expr === "sommeil") { set(20, Y(13), EYE); set(21, Y(13), EYE); }
    else for (let y = 11; y < 14; y++) { set(20, Y(y), EYE); set(21, Y(y), EYE); }
  }
  if (niveau < 3) return o;
  // ── la semelle : la dernière rangée (les pieds touchent toujours le bas du cadre), un ton plus sombre
  for (let x = 0; x < W; x++) { const k = at(x, H - 1); if (k) set(x, H - 1, adjust(k, -30)); }
  if (niveau < 4) return o;
  soigneFine(a, at, set, dir, Y, skin, sweep);
  return o;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ 2026-11-21 — « SOIGNÉ » (niveau 4, le style partagé "soigne") : Guillaume, « on va améliorer le look des personnages, sans le rendre
   ║ trop détaillé pour autant. C'est toujours simple. »
   ╚══════════════════════════════════════════════════════════════════════════
   Deux retouches, et seulement deux, dans la règle du trait simple (aplats, traits d'un pixel fin dans des couleurs QUE LE DESSIN A DÉJÀ,
   rien hors de la silhouette, ni contour, ni modelé, ni reflet ; le visage d'encre du 2026-10-31 n'est pas touché) :
   · LA FRANGE DE CÔTÉ : l'ancien posait les cheveux en casque, l'arête du front tirée à la règle — tout le monde avait la même coupe au
     bol. La frange descend d'un pixel fin sur ~40 % du front et de deux sur ~18 %, du côté `sweep` (+1 : depuis la gauche de l'écran ;
     −1 : depuis la droite) : un coup de peigne, à la couleur EXACTE des cheveux. De profil, une mèche vient sur le front (deux pixels, puis
     un). Elle ne se pose que sur des CHEVEUX qui encadrent un front nu : la couleur au-dessus du front doit être celle des pattes (de
     face) ou de la nuque (de profil) — un chapeau, une casquette, un bonnet ne bougent pas ; le front doit garder une rangée nue au-dessus
     des yeux (les yeux étonnés montent d'un cran : la frange recule d'autant).
   · LES BRAS DÉTACHÉS DU BUSTE : de face et de dos, la manche et le buste d'un même vêtement étaient un seul bloc (les bras n'existaient
     qu'aux poignets) ; un trait fin dans le vêtement à −30 (le ton de ses poignets) les sépare, de l'aisselle au poignet. De profil, le
     bras qui pend devant le corps reçoit les deux traits. Seulement là où manche et buste sont DU MÊME TON (un gilet, une salopette, une
     robe à manches d'une autre couleur ont déjà leur frontière : rien n'est ajouté).
   ⚠️ Écarté, essayé sur planche : des sourcils (même couleur que les cheveux, ou à l'encre) — le visage changeait d'expression pour tout le
   monde, l'air sévère ; le visage du 31 octobre est son choix. Une mèche qui dépasse au sommet du crâne : une FORME de plus, hors règle. */
function soigneFine(a, at, set, dir, Y, skin, sweep) {   // `a` lit l'entrée (la coupe), `at` la sortie (les yeux de l'expression)
  const W = PERSO_SIMPLE_W;
  // ── la frange
  if (skin && dir === 0) {
    let hb = -1;
    for (let y = 4; y < 12; y++) if (a(15, Y(y)) === skin && a(16, Y(y)) === skin) { hb = y; break; }
    if (hb > 0) {
      let xL = -1, xR = -1;
      for (let x = 4; x < 28; x++) if (a(x, Y(hb)) === skin) { if (xL < 0) xL = x; xR = x; }
      const hair = a(15, Y(hb - 1)), wv = xR - xL + 1;
      const framed = hair && hair !== skin && a(xL - 1, Y(hb)) === hair && a(xR + 1, Y(hb)) === hair && a(xL, Y(hb - 1)) === hair && a(xR, Y(hb - 1)) === hair;
      let eyeTop = 99;
      for (let y = hb; y < hb + 6; y++) for (let x = xL; x <= xR; x++) if (at(x, Y(y)) !== a(x, Y(y)) && at(x, Y(y)) !== skin && y < eyeTop) eyeTop = y;
      for (let y = hb; y < hb + 6; y++) for (let x = xL; x <= xR; x++) if (at(x, Y(y)) === EYE && y < eyeTop) eyeTop = y;
      if (framed && wv >= 10 && eyeTop - hb >= 3) {
        // la seconde rangée ne vient jamais au-dessus d'un œil, ni à côté : une colonne de front nu l'en sépare
        let eyeX0 = 99, eyeX1 = -1;
        for (let x = xL; x <= xR; x++) if (at(x, Y(eyeTop)) === EYE) { eyeX0 = Math.min(eyeX0, x); eyeX1 = x; }
        const n1 = Math.round(wv * 0.38), n2 = Math.round(wv * 0.18);
        for (let i = 0; i < n1; i++) { const x = sweep > 0 ? xL + i : xR - i; if (a(x, Y(hb)) === skin) set(x, Y(hb), hair); }
        for (let i = 0; i < n2; i++) {
          const x = sweep > 0 ? xL + i : xR - i;
          if (sweep > 0 ? x >= eyeX0 - 1 : x <= eyeX1 + 1) break;
          if (a(x, Y(hb + 1)) === skin) set(x, Y(hb + 1), hair);
        }
      }
    }
  } else if (skin && dir === 2) {
    // de profil (vers la droite) : le bord avant des cheveux sur le front, au-dessus de l'œil
    for (let y = 6; y < 12; y++) {
      let xe = -1;
      for (let x = 4; x < 28; x++) if (a(x, Y(y)) === skin) { xe = x; break; }
      if (xe < 0) continue;
      const hair = a(xe - 1, Y(y));
      if (!hair || hair === skin || a(xe - 1, Y(y - 1)) !== hair || a(xe, Y(y - 1)) !== hair || a(xe - 2, Y(y + 3)) !== hair) break;
      let eyeTop = 99;
      for (let yy = y; yy < y + 6; yy++) for (let x = xe; x < xe + 6; x++) if (at(x, Y(yy)) === EYE && yy < eyeTop) eyeTop = yy;
      if (eyeTop - y < 3) break;
      set(xe, Y(y), hair); set(xe + 1, Y(y), hair);
      if (eyeTop - y >= 4) set(xe, Y(y + 1), hair);
      break;
    }
  }
  // ── les bras détachés du buste (le torse x 10-21, les manches x 6-9 et 22-25 de face et de dos ; de profil, le bras x 14-17)
  const seams = dir === 2 ? [[13, 14], [18, 17]] : [[10, 9], [21, 22]];   // [colonne du trait, colonne de la manche à côté]
  for (const [xs, xa] of seams) {
    let run = [];
    for (let y = 20; y < 34; y++) {
      const g = a(xs, Y(y));
      const same = g && g !== skin && at(xs, Y(y)) === g && a(xa, Y(y)) === g && a(xs + (xs < xa ? -1 : 1), Y(y)) === g;
      // la même couleur doit continuer : la bande claire de l'épaule (une ou deux rangées, devenue liseré) fait repartir le compte
      if (same && (!run.length || a(xs, Y(run[run.length - 1])) === g)) run.push(y);
      else if (run.length >= 4) break;
      else run = same ? [y] : [];
    }
    // l'aisselle : on laisse la rangée de l'épaule ; il faut au moins trois rangées de manche pour que le trait dise « bras »
    if (run.length >= 4) for (const y of run.slice(1)) set(xs, Y(y), adjust(a(xs, Y(y)), -30));
  }
}

/* L'image fine d'une image 16 × 24 agrandie au plus proche (les planches : ancien, net, visage). `frame` 0-3 comme `drawCharFrame`. */
export function persoSimpleGrid(px16, { dir = 0, frame = 0, niveau = 2, expr = "neutre", pnj = false } = {}) {
  const W = PERSO_SIMPLE_W, px = new Uint8ClampedArray(W * PERSO_SIMPLE_H * 4);
  for (let y = 0; y < PERSO_SIMPLE_H; y++) for (let x = 0; x < W; x++) {
    const s = ((y >> 1) * 16 + (x >> 1)) * 4, d = (y * W + x) * 4;
    for (let k = 0; k < 4; k++) px[d + k] = px16[s + k];
  }
  return persoSimpleGridFine(px, { dir, bobF: frame === 1 || frame === 3 ? 2 : 0, niveau, expr, pnj });
}

export function persoSimplePx(grid) {
  const px = new Uint8ClampedArray(PERSO_SIMPLE_W * PERSO_SIMPLE_H * 4);
  for (let i = 0; i < grid.length; i++) {
    const k = grid[i];
    if (!k) continue;
    px[i * 4] = (k >> 16) & 255; px[i * 4 + 1] = (k >> 8) & 255; px[i * 4 + 2] = k & 255; px[i * 4 + 3] = 255;
  }
  return px;
}

/* ╔══════════════════════════════════════════════════════════════════════════
   ║ LES SIGNES DU VÊTEMENT — `paintHabitFine` (2026-10-31, « on détaille au mieux pour que les habits soient beaux »)
   ╚══════════════════════════════════════════════════════════════════════════
   Appelée par `drawCharFrame` en mode fin, après tous les costumes et AVANT la garde-robe (tenue, écharpe, chapeau de la Maison
   Garfield, déjà dessinés en détail le 2026-10-21 : ils recouvrent ce qu'ils couvrent). `P` peint en unités du 16 × 24 et accepte
   les demis : un pixel fin = 0,5. Ici tout s'écrit en PIXELS FINS (`f`), rapportés au corps debout ; le pas (`bob`, `step`) s'ajoute.
   LES RÈGLES, pour rester dans le trait simple :
   · aucune couleur inventée : l'ombre et le clair du vêtement (±30, ceux que l'ancien a déjà), le cuir des chaussures pour la ceinture
     (un homme assortit sa ceinture à ses souliers), le laiton d'une boucle et le métal d'un bouton de salopette — un pixel chacun ;
   · des TRAITS, jamais des volumes : un liseré, un point, une encoche — pas d'ombre portée, pas de dégradé, pas de pli modelé ;
   · un signe par fonction du vêtement (fermer, serrer, finir, ranger), là où le vrai vêtement l'a ;
   · un costume de PNJ garde son idée, à la même place qu'en 16 × 24 (la bavette de Greg, le tablier d'Ingrid, la chemise de Tristan).
   `o` : { gender, dir, step, bob, skin, top (la couleur du haut porté, teinte de la garde-robe comprise, ou null), pants, outfitOff
   (une tenue de la garde-robe couvre le corps), flags : { overalls, cap, beeSuit, plaid, cheeseHat, sugarWorker }, look }. */
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => "#" + c.map((v) => clamp(Math.round(v)).toString(16).padStart(2, "0")).join("");
const adj = (h, d) => toHex(hx(h).map((v) => v + d));
const SHOE = "#6a4528", BRASS = "#d4b45a", METAL = "#cfd3da";
export function paintHabitFine(g, P, x, o) {
  const { gender, dir, step, bob, skin } = o;
  const fl = o.flags || {}, look = o.look;
  const f = (fx, fy, w, h, col) => P(g, x + fx / 2, fy / 2 + bob, w / 2, h / 2, col);
  const sF = Math.round(step * 2);   // le pas, en pixels fins
  const worker = typeof look === "string" && /^(ouvrier|chef|soudeur|conducteur):\d+$/.test(look);
  const special = look === "carla" || look === "leo" || look === "froufrou" || look === "vandal" || worker;
  if (fl.beeSuit || look === "vandal" || look === "froufrou" || look === "leo") return;
  const top = o.top, T = top && adj(top, 30), D = top && adj(top, -30);
  const plain = top && !special && !fl.plaid && !o.outfitOff;   // une chemise ou une robe ordinaire est visible
  /* Une ligne À TRAVERS LE BUSTE (ceinture, taille) ne passe que là où le buste se voit : de face et de dos, entre les bras (le buste
     x 4-11 est recouvert aux colonnes 4 et 11 par les bras x 3-4 et 11-12, les mains comprises) ; de profil, partout sauf sous le bras,
     qui passe devant. Tracée de bord à bord au premier essai, la ceinture barrait les mains. */
  const across = (fy, col) => {
    if (dir !== 2) { f(10, fy, 12, 1, col); return; }
    const a0 = 14 + sF, a1 = 17 + sF;
    for (let fx = 8; fx < 24; fx++) if (fx < a0 || fx > a1) f(fx, fy, 1, 1, col);
  };

  // ── LE HAUT ORDINAIRE : l'encolure, les poignets ; la chemise de l'homme, la robe de la femme
  if (plain) {
    /* l'encolure : un V de peau sous le menton. Les deux pointes du col viennent seules : l'épaule claire (deux rangées fines) devient
       un liseré par la retouche (`persoSimpleGridFine`) partout où sa rangée du haut est encore claire — pas sous le V, dont les deux
       pixels clairs du bas restent : ce sont les pointes. (Peinte ici, la bande passait sur les cheveux longs, qui tombent devant.) */
    if (dir === 0) { f(14, 20, 4, 1, skin); f(15, 21, 2, 1, skin); }
    // les poignets : la dernière rangée de la manche, un ton plus sombre
    if (dir === 2) f(14 + sF, 29, 4, 1, D);
    else { f(6, 29, 4, 1, D); f(22, 29, 4, 1, D); }
    if (gender !== "f") {
      // la chemise boutonnée : deux boutons sur la patte (de face) ; la ceinture de cuir à la taille, sa boucle de laiton devant
      if (dir === 0 && !fl.overalls) { f(16, 24, 1, 1, D); f(16, 27, 1, 1, D); }
      if (!fl.overalls) {
        across(31, SHOE);
        if (dir === 0) f(15, 31, 2, 1, BRASS);
        else if (dir === 2) f(22, 31, 1, 1, BRASS);
      }
    } else {
      // la robe : la taille marquée d'un liseré sombre ; de dos, le nœud de la ceinture et les boutons de l'encolure
      across(28, D);
      if (dir === 1) { f(16, 22, 1, 1, D); f(16, 25, 1, 1, D); f(13, 27, 2, 2, T); f(17, 27, 2, 2, T); f(15, 28, 2, 1, D); f(15, 29, 1, 2, D); f(16, 29, 1, 3, D); }
      else if (dir === 2) { f(8, 27, 1, 3, T); f(9, 28, 1, 1, D); }
      // l'ourlet : un liseré au lieu d'une bande
      f(6, 40, 20, 1, top);
    }
  }
  // ── LE BAS DE L'HOMME : les poches du pantalon (de face, deux fentes en biais ; de dos, deux poches plaquées)
  if (gender !== "f" && o.pants && !fl.overalls && !special && !o.outfitOff) {
    const pL = fl.sugarWorker ? "#1c1c1c" : o.pants, pD = adj(pL, -30), pDD = adj(pL, -60);
    if (dir === 0) { f(11, 32, 1, 1, pD); f(12, 33, 1, 1, pD); f(20, 32, 1, 1, pDD); f(19, 33, 1, 1, pDD); }
    else if (dir === 1) { f(11, 33, 3, 1, pD); f(18, 33, 3, 1, pDD); }   // de dos, la fente de la poche (plaquée en 3 × 2, elle faisait deux trous noirs)
    else f(10, 33, 2, 2, pD);
  }
  // ── LES SOULIERS DE CUIR (ceux de base) : la languette, d'un ton plus clair, au milieu du cou-de-pied ; une bride chez la femme
  if (!special && !o.outfitOff && dir !== 1) {
    const sL = adj(SHOE, 30);
    if (gender !== "f") {
      if (dir === 0) { f(12 + sF, 42, 2, 1, sL); f(18 - sF, 42, 2, 1, sL); }
    } else if (dir === 0) {
      const lx = 10 + 2 * Math.max(0, step), rx = 18 + 2 * Math.min(0, step);
      f(lx, 43, 4, 1, sL); f(rx, 43, 4, 1, sL);
    }
  }

  // ── LA SALOPETTE DE GREG : les boutons de métal aux bretelles, la poche de la bavette, les revers roulés du bas
  if (fl.overalls) {
    const DN = "#3f5a8c", DN_D = adj(DN, -30), DN_L = adj(DN, 30);
    f(12, 23, 8, 1, DN);                                   // le clair du haut de la bavette en un liseré
    f(12, 23, 1, 1, METAL); f(19, 23, 1, 1, METAL);
    if (dir !== 1) { f(14, 25, 4, 1, DN_L); f(14, 26, 4, 2, DN_D); }
    f(10, 40, 6, 2, DN_L); f(16, 40, 6, 2, DN);
  }
  // ── LA CASQUETTE (Soan, Jérôme) : le bouton du dessus, les coutures des quartiers
  if (fl.cap && !fl.beeSuit) {
    const CP = "#2f6f4a", CP_D = adj(CP, -30);
    f(6, 1, 20, 1, CP);                                    // le reflet du dessus en un liseré
    f(15, 0, 2, 1, CP_D);
    if (dir !== 1) { f(11, 2, 1, 2, CP_D); f(20, 2, 1, 2, CP_D); }
  }
  // ── LA CHEMISE DE BÛCHERON DE TRISTAN : le carreau buffalo au pixel fin (des cases de trois), l'encolure ouverte
  if (fl.plaid && !fl.beeSuit) {
    const R = "#a3261f", RD = adj(R, -30), K = "#241a14";
    const check = (fx, fy) => { const cx = Math.floor(fx / 3) & 1, cy = Math.floor(fy / 3) & 1; return cx && cy ? K : cx || cy ? RD : R; };
    for (let fy = 22; fy < 32; fy++) for (let fx = 8; fx < 24; fx++) f(fx, fy, 1, 1, check(fx, fy));
    const arms = dir === 2 ? [14 + sF] : [6, 22];
    for (const ax of arms) for (let fy = 22; fy < 30; fy++) for (let k = 0; k < 4; k++) f(ax + k, fy, 1, 1, check(ax + k - sF * (dir === 2 ? 1 : 0), fy));
    f(8, 20, 16, 1, adj(R, 30)); f(8, 21, 16, 1, R);
    if (dir === 0) { f(14, 20, 4, 1, skin); f(15, 21, 2, 1, skin); }
  }
  // ── LE TABLIER D'INGRID : le cordon qui fait le tour de la taille, la poche du devant, les liserés
  if (fl.cheeseHat && !fl.beeSuit) {
    const AP = "#f4efe2", AP_D = adj(AP, -30);
    f(12, 21, 8, 1, AP);                                   // le clair du haut de la bavette en un liseré
    f(10, 36, 12, 1, AP);                                  // l'ourlet du tablier en un liseré
    if (dir !== 1) { f(8, 31, 4, 1, AP); f(20, 31, 4, 1, AP); f(12, 31, 8, 1, AP_D); f(13, 33, 6, 1, AP_D); f(13, 34, 1, 1, AP_D); f(18, 34, 1, 1, AP_D); }
    else { f(8, 31, 16, 1, AP_D); f(13, 30, 2, 2, AP); f(17, 30, 2, 2, AP); f(15, 31, 2, 1, AP_D); f(15, 32, 1, 2, AP); f(16, 32, 1, 3, AP); }
  }
  // ── LE MANTEAU DE CARLA : le col en V et ses revers, la boucle de la ceinture, la fente du dos
  if (look === "carla") {
    const COAT = "#e6b32b", COAT_D = adj(COAT, -30), BLK = "#17171c";
    f(8, 34, 16, 1, COAT);                                 // l'ombre de l'ourlet en un liseré (le clair des épaules : la retouche — ses cheveux tombent devant)
    if (dir === 0) {
      f(14, 20, 4, 4, BLK); f(15, 24, 2, 4, BLK); f(14, 24, 1, 4, COAT); f(17, 24, 1, 4, COAT);
      f(13, 20, 1, 4, COAT_D); f(14, 24, 1, 2, COAT_D); f(18, 20, 1, 4, COAT_D); f(17, 24, 1, 2, COAT_D);
      f(15, 30, 2, 2, BRASS);
    } else if (dir === 1) f(16, 32, 1, 4, COAT_D);
    else f(22, 30, 1, 2, BRASS);
  }
  // ── LES OUVRIERS (`o.vest` : les trois tons du gilet porté) : la fermeture en un liseré, la poche de poitrine
  if (worker && o.vest && !/^soudeur/.test(look) && dir === 0) {
    const V = o.vest, BAND = "#dfe4ea";
    f(14, 24, 1, 2, BAND); f(14, 26, 1, 2, V.main); f(14, 28, 1, 2, BAND); f(14, 30, 1, 2, V.lo);
    f(18, 26, 3, 1, V.lo);
  }
}
