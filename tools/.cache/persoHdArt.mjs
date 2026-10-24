/* ╔══════════════════════════════════════════════════════════════════════════
   ║ persoHdArt — LES PERSONNAGES EN 32 × 48 (2026-10-23)
   ╚══════════════════════════════════════════════════════════════════════════
   Décisions de Guillaume (2026-10-23) : 32 × 48 À LA MÊME TAILLE À L'ÉCRAN (deux fois plus de pixels, même encombrement),
   dessinés EN CODE, un interrupteur dans les paramètres pour revenir à l'ancien dessin.
   ⚠️ Second jet, même jour. Le premier (deux proportions arrondies, « chibi » et « élancé ») : « un peu moche… J'aime l'anatomie
   CARRÉE, avec une tête relativement simple, c'est l'identité du jeu. Les persos sont attachants comme ça, on peut juste ajouter des
   pixels pour faire des expressions et des vêtements / coupes plus élaborés. » → ce jet reprend AU PIXEL PRÈS le gabarit de
   `drawCharFrame` (fermeArt.js) agrandi ×2 — tête carrée 16 × 16, torse de 16, bras de 4, jambes de 6 — et ne dépense les pixels
   neufs que dedans : yeux à reflet, bouche qui sourit, sourcils QUI N'APPARAISSENT QU'AVEC UNE EXPRESSION (la tête reste simple au
   repos), mèches et reflet en bandeau, col, boutons, poche, ceinture, plis de jupe, nœud assorti au ruban.
   Pourquoi pas plus fin que 32 × 48 : au cran 2 de la ville et de la maison, un pixel d'art y tombe sur UN pixel d'écran, comme
   les meubles (64 px par case) ; en 64 × 96 il en faudrait un demi — flou, et plus fin que le décor, l'écart dans l'autre sens.
   ⚠️ Troisième jet, même soir (« c'est beaucoup mieux… retravaille visage, vêtements et coupes, dos et profils, corps et mouvement ») :
   manches retroussées et avant-bras (lui), manches ballon et bras nus (elle), vraies mains, l'ombre du bras posée sur le torse (c'est
   elle qui détache le bras), jean à revers, plis de jupe qui s'évasent vers un ourlet de dentelle, mèches de longueurs inégales,
   têtes de profil à mèches (plus de casque), talon qui attaque et pointe qui pousse dans la marche de profil.
   Branché dans le jeu par `S.getCharHD` (fermeArt.js), derrière ⚙️ « Personnages fins » ; planches : `tools/render-perso-hd.mjs`,
   `render-pnj-hd.mjs` (lot A), `render-garderobe-hd.mjs` (lot B).

   MÉTHODE : on peint des LETTRES dans une grille 32 × 48 (une lettre = un ton d'une matière), puis une passe pose le CONTOUR
   (« selout » : chaque pixel vide qui touche le dessin prend la couleur de son voisin, très assombrie et tirée vers le violet).
   La lumière vient d'en haut à gauche ; l'ombre glisse vers le bleu-violet, la lumière vers le jaune (rampes à quatre tons).
   ⚠️ Aucun `translate`/`scale` : le faux canevas des bancs les ignore (docs/PIEGES.md). Tout se pose en `fillRect`.

   Lettres — peau T S s Z · cheveux J H h G · haut ou robe D C c F · pantalon Q P p O · chaussures N B b V · accent L K k ·
   E œil · I bas de l'iris · W reflet · M bouche · m langue · R joue · A larme · Y boucle dorée · U bouton, dents, liseré clair. */

import { wardrobeLayer, wardrobePal } from "./garderobeArt.mjs";
import { hairCutRows, beardRows } from "./coiffureArt.mjs";

export const PERSO_HD_W = 32, PERSO_HD_H = 48;

/* ─── Les rampes ──────────────────────────────────────────────────────── */
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function rgbHex(c) { return "#" + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
const COOL = [46, 34, 84], WARM = [255, 238, 196];
function ramp(hex, k = 1) {
  const c = hexRgb(hex);
  return [rgbHex(mix(c, WARM, 0.3 * k)), hex, rgbHex(mix(c, COOL, 0.3)), rgbHex(mix(c, COOL, 0.55))];
}
function outlineOf(hex) { return rgbHex(mix(hexRgb(hex), [28, 14, 30], 0.74)); }

export function persoHdPalette({ skin = "#f0c8a0", hair = "#2a2a2a", top = "#d44a3f", pants = "#454f66", shoes = "#6a4528", accent = "#e85a8a" } = {}) {
  const pal = {};
  const put = (letters, r) => letters.split("").forEach((l, i) => { pal[l] = r[i]; });
  put("TSsZ", ramp(skin, 0.6)); put("JHhG", ramp(hair)); put("DCcF", ramp(top)); put("QPpO", ramp(pants)); put("NBbV", ramp(shoes)); put("LKk", ramp(accent));
  // Des cheveux très sombres : un reflet tiré vers le jaune les rendrait bruns ; on le tire vers un bleu acier (le reflet d'un noir).
  if (hexRgb(hair).reduce((a, v) => a + v, 0) < 160) { pal.J = rgbHex(mix(hexRgb(hair), [128, 140, 176], 0.42)); pal.h = rgbHex(mix(hexRgb(hair), [0, 0, 8], 0.35)); pal.G = "#0e0b12"; }
  Object.assign(pal, {
    E: "#2a1a24", I: "#5e3f4c", W: "#ffffff", M: "#7a2e2e", m: "#e0707a", R: rgbHex(mix(hexRgb(skin), [240, 110, 120], 0.42)),
    A: "#8fd3ff", Y: "#e8c25a", U: "#fbf4e6",
  });
  return pal;
}

/* ─── La grille de lettres ────────────────────────────────────────────── */
function buf() { return Array.from({ length: PERSO_HD_H }, () => Array(PERSO_HD_W).fill(".")); }
/* `dy` : un décalage vertical (le rebond du pas) ; `behind` : ne peint que les cases VIDES — ce qui passe derrière ce qui est déjà
   posé (les cheveux longs derrière les épaules, peints après que l'épaule a été taillée). `shift` et `behind()` en dérivent. */
function mk(b, dy = 0, behind = false, dx = 0) {
  const set = (x, y, c) => { y += dy; x += dx; if (x >= 0 && y >= 0 && x < PERSO_HD_W && y < PERSO_HD_H && (!behind || b[y][x] === ".")) b[y][x] = c; };
  const get = (x, y) => { y += dy; x += dx; return x >= 0 && y >= 0 && x < PERSO_HD_W && y < PERSO_HD_H ? b[y][x] : "."; };
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); };
  // Un motif : « . » ne peint rien (on voit ce qui est dessous).
  const pat = (x, y, rows) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== ".") set(x + i, y + j, r[i]); });
  const swap = (x, y, w, h, from, to) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (from.includes(get(x + i, y + j))) set(x + i, y + j, to); };
  return { set, get, rect, pat, swap, shift: (k) => mk(b, dy + k, behind, dx), behind: () => mk(b, dy, true, dx) };
}

/* ─── Le visage (face et profil) ──────────────────────────────────────────
   Au repos : deux yeux de 2 × 4 (reflet en haut, iris plus clair en bas : l'œil prend du volume) et un petit sourire — la tête
   « relativement simple » qu'il veut garder. Les sourcils n'existent que dans une expression, et se peignent APRÈS les cheveux
   (sinon la frange de la fermière les mange) : `faceFront`/`faceSide` les rendent, `paint` les pose en dernier.
   Coordonnées de la tête : colonnes 8-23, rangées 4-19. */
export const PERSO_HD_EXPRESSIONS = ["neutre", "joie", "rire", "surprise", "colere", "tristesse", "gene", "sommeil", "clin", "amour", "cligne"];
const EYE = { open: ["WE", "EE", "EI", "EI"], tall: ["WE", "EE", "EE", "EI", "EI"], half: ["EE", "EI", "WI"], shut: ["EEE"],
  arc: [".EE.", "E..E"], heart: ["K.K", "KKK", ".K."], glossy: ["WW", "EW", "EI", "AI"] };
/* « cligne » (2026-10-23, les expressions automatiques) : le clignement, un dixième de seconde toutes les 3 à 6 s — l'expression de
   repos du personnage (sourire du joueur, bouche droite de l'habitant, œil étroit du sobre), les paupières baissées en un trait. */
function faceFront(d, expr, gender, style) {
  const shut = expr === "cligne";
  if (shut) expr = "neutre";
  const eyes = (shape, dy = 0, dx = 0) => {
    if (shut) { d.pat(12 + dx, 12, ["EE"]); d.pat(18 + dx, 12, ["EE"]); return; }
    const g = EYE[shape]; d.pat(12 + dx, 10 + dy, g); d.pat(18 + dx, 10 + dy, g);
  };
  const blush = (big) => { d.rect(9, 14, big ? 3 : 2, big ? 2 : 1, "R"); d.rect(big ? 20 : 21, 14, big ? 3 : 2, big ? 2 : 1, "R"); };
  let br = null;
  const brows = (l, r) => { br = [l, r]; };
  const smile = () => d.pat(13, 16, ["M....M", ".MMMM."]);
  switch (expr) {
    case "joie": eyes("arc", 1, -1); d.pat(13, 16, ["MMMMMM", "MMmmMM", ".MMMM."]); blush(); break;
    case "rire": eyes("arc", 1, -1); brows(["GGGG"], ["GGGG"]); d.pat(12, 15, ["MMMMMMMM", "MUUUUUUM", "MMmmmmMM", ".MMMMMM."]); blush(true); break;
    case "surprise": eyes("tall", -1); brows([".GG.", "G..G"], [".GG.", "G..G"]); d.pat(14, 16, [".MM.", "MmmM", "MmmM", ".MM."]); break;
    case "colere": eyes("half", 1); brows(["GGG.", "..GG"], [".GGG", "GG.."]); d.pat(13, 16, ["MMMMMM", "MUUUUM", "MMMMMM"]); d.set(8, 9, "s"); break;
    case "tristesse": eyes("glossy"); brows(["..GG", "GG.."], ["GG..", "..GG"]); d.pat(12, 14, ["A", "A"]); d.pat(14, 16, [".MM.", "M..M"]); break;
    case "gene": eyes("open", 0, -1); blush(true); d.pat(13, 17, [".M.M.M", "M.M.M."]); d.pat(22, 8, ["A", "A"]); break;
    case "sommeil": d.pat(11, 12, ["EEE"]); d.pat(18, 12, ["EEE"]); d.pat(15, 17, ["MM"]); break;
    case "clin": d.pat(12, 10, EYE.open); d.pat(17, 11, EYE.arc); smile(); if (gender === "f") blush(); break;
    case "amour": d.pat(11, 10, EYE.heart); d.pat(18, 10, EYE.heart); smile(); blush(true); break;
    default:
      // 2026-10-23 — Guillaume : « gardons l'élégance sobre et sévère de certains PNJ, pas rendre tout trop mimi ». Le sourire et
      // les joues roses sont aux joueurs et aux habitants ordinaires ; un PNJ « sobre » a la bouche droite et l'œil plus étroit,
      // Carla sa bouche rouge (le trait `#a8202c` de son 16 × 24).
      if (style === "sobre" || style === "carla") {
        eyes("half");
        if (style === "carla") d.pat(13, 16, ["rrrrrr", ".tttt."]); else d.pat(14, 16, ["MMMM"]);
      } else if (style === "pnj") { eyes("open"); d.pat(14, 16, ["MMMM"]); if (gender === "f") blush(); }   // l'habitant : la bouche droite du 16 × 24
      else { eyes("open"); smile(); if (gender === "f") blush(); }
  }
  return br && ((dd) => { const y = gender === "f" ? 8 : 7; dd.pat(11, y, br[0]); dd.pat(17, y, br[1]); });
}
/* De profil, tourné vers la droite : un œil, la bouche au coin, sans nez — la tête reste un carré (bord avant : colonne 23).
   ⚠️ 2026-10-23, retour de Guillaume : « de profil les expressions doivent être ajustées ». Trois défauts, trois gestes :
   1. l'œil était UN PIXEL EN ARRIÈRE du 16 × 24 agrandi (colonnes 19-20 ; l'œil d'origine x 10 → 20-21) : juste sous la mèche, les yeux en
      arc, fermé ou en cœur n'en montraient que la moitié. Tous les traits avancent d'un pixel ; l'arc de profil a 3 pixels (celui de face,
      4, touchait le bord) ;
   2. les sourcils tombaient sur la frange, sombre sur sombre : ils se posent sur le front que `paint` dégage au-dessus de l'œil (`FRONT_SIDE`) ;
   3. une bouche ouverte au milieu de la joue se lisait comme une tache : elle ENTAILLE le bord avant (« _ » vide le pixel, le contour s'y
      creuse), les dents se voient de côté. */
const ARC_SIDE = [".E.", "E.E"];
function faceSide(d, expr, gender, style) {
  const shut = expr === "cligne";
  if (shut) expr = "neutre";
  const eye = (g, x = 20, y = 10) => (shut ? d.pat(20, 12, ["EE"]) : d.pat(x, y, g));
  const mouth = (x, y, rows) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] !== ".") d.set(x + i, y + j, r[i] === "_" ? "." : r[i]); });
  let br = null;
  const brow = (g) => { br = g; };
  const smile = () => { d.pat(23, 16, ["M"]); d.pat(22, 17, ["M"]); };
  switch (expr) {
    case "joie": eye(ARC_SIDE, 20, 11); mouth(21, 16, ["MMM", ".m_", ".M."]); d.rect(18, 14, 2, 1, "R"); break;
    case "rire": eye(ARC_SIDE, 20, 11); brow(["GGG"]); mouth(20, 15, ["..MM", ".MU_", ".Mm_", "..MM"]); d.rect(17, 14, 3, 2, "R"); break;
    case "surprise": eye(EYE.tall, 20, 10); brow([".GG", "G.."]); mouth(21, 15, [".M.", "Mm_", "Mm_", ".M."]); break;
    case "colere": eye(EYE.half, 20, 11); brow(["GG.", "..G"]); mouth(20, 16, ["MMMM", "MUU_", ".MMM"]); break;
    case "tristesse": eye(EYE.glossy); brow(["..G", "GG."]); d.pat(20, 14, ["A", "A"]); mouth(21, 17, [".MM", "M.."]); break;
    case "gene": eye(EYE.open); d.rect(17, 14, 3, 2, "R"); mouth(21, 17, ["M.M"]); d.pat(17, 8, ["A", "A"]); break;
    case "sommeil": eye(EYE.shut, 20, 12); mouth(23, 17, ["M"]); break;
    case "clin": eye(ARC_SIDE, 20, 11); smile(); break;
    case "amour": eye(EYE.heart, 20, 10); smile(); d.rect(17, 14, 3, 2, "R"); break;
    default:
      if (style === "sobre" || style === "carla") { eye(EYE.half, 20, 11); mouth(22, 16, style === "carla" ? ["rr"] : ["MM"]); }
      else if (style === "pnj") { eye(EYE.open); mouth(22, 16, ["MM"]); if (gender === "f") d.rect(18, 14, 2, 1, "R"); }
      else { eye(EYE.open); smile(); if (gender === "f") d.rect(18, 14, 2, 1, "R"); }
  }
  return br && ((dd) => dd.pat(20, 8, br));
}
/* LE FRONT DÉGAGÉ, de profil : au-dessus et autour de l'œil (colonnes 20-23, rangées 8-14), aucune mèche — ni celle du fermier, ni
   celle d'une coupe du salon (la queue de cheval, les macarons y descendaient). Les traits du visage, peints avant les cheveux, y sont
   retracés après eux (`paint`) ; les larmes et la sueur aussi, où qu'elles soient (une goutte se voit sur les cheveux). */
const FRONT_SIDE = { x0: 20, x1: 23, y0: 8, y1: 14 };
function clearFrontSide(d, facePx) {
  const F = FRONT_SIDE;
  for (let y = F.y0; y <= F.y1; y++) for (let x = F.x0; x <= F.x1; x++) if (isHair(d.get(x, y))) d.set(x, y, isHair(d.get(x, y - 1)) ? "s" : "S");
  for (const [x, y, c] of facePx) if (c === "A" || (x >= F.x0 && x <= F.x1 && y >= F.y0 && y <= F.y1)) d.set(x, y, c);
}

/* ─── La tête (le carré de peau) ──────────────────────────────────────── */
function head(d, dir) {
  d.rect(8, 4, 16, 16, "S"); d.set(8, 19, "."); d.set(23, 19, ".");
  if (dir === 2) { d.rect(8, 5, 1, 14, "s"); d.rect(9, 19, 14, 1, "s"); d.rect(9, 18, 3, 1, "s"); return; }
  if (dir === 1) {
    /* 2026-10-24 — DE DOS, LA NUQUE (« LE DOS », `torsoFront`). Le bas de la tête était une bande de peau aussi large qu'elle : un
       cou de 16 px, la tête posée comme un couvercle sur le buste. Les coins s'arrondissent sous le crâne et le cou (10 px) descend
       au col, son ombre à droite ; les cheveux couvrent le crâne plus bas (`hair`). */
    for (const [y, x0, x1] of [[18, 8, 10], [18, 21, 23], [19, 8, 10], [19, 21, 23]]) for (let x = x0; x <= x1; x++) d.set(x, y, ".");
    d.rect(23, 5, 1, 13, "s"); d.rect(19, 18, 2, 2, "s"); d.set(11, 19, "s"); d.set(8, 17, "s");
    return;
  }
  d.rect(23, 5, 1, 14, "s"); d.rect(22, 15, 1, 4, "s"); d.rect(9, 19, 14, 1, "s"); d.rect(9, 9, 1, 6, "T");
}

/* ─── Les cheveux ─────────────────────────────────────────────────────────
   « m » : court, à mèches en biais dont les pointes évitent les yeux. « f » : longs, frange droite (le carré du visage reste lisible),
   reflet en couronne, mèches de LONGUEURS INÉGALES (des rayures régulières faisaient rideau de fer), ruban rose d'un côté.
   `layer` "back" : ce qui passe derrière le corps (la chevelure longue de face) ; "front" : le reste. */
const BOW = ["KK.KK", "KLkLK", "KKkKK", ".k.k."];
function hair(d, dir, gender, layer) {
  const cap = () => { d.rect(9, 2, 14, 1, "H"); d.rect(7, 3, 18, 1, "H"); d.rect(6, 4, 20, 4, "H"); };
  // Les ombres que les mèches posent sur la peau, juste sous elles.
  const shadeBelow = (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if ("ST".includes(d.get(x, y)) && "HhJG".includes(d.get(x, y - 1))) d.set(x, y, "s"); };
  if (gender === "m") {
    if (layer === "back") return;
    if (dir === 0) {
      d.pat(6, 2, [
        "...HHHHHHHHHHHHHH...", ".HHHHHJJJJJHHHHHHhh.", "HHHHJJJHHHHHJJHHHhhh", "HHHJJHHHHHHHHHHHHhhh",
        "HHHHHHHhHHHHhHHHHHhh", "HHHHHHhHHHHhHHHHhHhh", "HHHHHhHHHHhHHHHhHHhh", "HH.HHHH.HHHH.hHHH.hh",
        "HH.HHh....HH..hH..hh", "HH................hh"]);
      d.pat(7, 11, ["S", "s", "S"]); d.pat(24, 11, ["s", "Z", "s"]);
      shadeBelow(8, 23, 8, 11);
    } else if (dir === 1) {
      d.pat(6, 2, [
        "...HHHHHHHHHHHHHH...", ".HHHHHJJJJJJHHHHHhh.", "HHHHJJJHHHHHJJHHHhhh", "HHHJJHHHHHHHHHHHHhhh",
        "HHHHHHHhHHHHHhHHHHhh", "HHHHHHhHHHHHhHHHHhhh", "HHHHHhHHHHHhHHHHhHhh", "HHHHhHHHHHhHHHHhHHhh",
        "HHHhHHHHHhHHHHhHHHhh", "HHHHHHHHhHHHHhHHHHhh", "HhHHHHHhHHHHhHHHHHhh", "hHHHHHhHHHHhHHHHHhhh",
        // de dos, le crâne couvert jusqu'à la nuque (« LA NUQUE », `head`) : les pointes tombent sur le cou, pas au milieu de la tête
        "..HHHHhHHHHhHHHHhh..", "..hHHhHHHHhHHHHhHh..", "...hHh.hHHh.hHHh.h.."]);
      d.pat(7, 11, ["S", "s", "S"]); d.pat(24, 11, ["s", "Z", "s"]);
      for (let x = 8; x <= 23; x++) for (let y = 16; y <= 17; y++) if (d.get(x, y) === "S") d.set(x, y, "s");
    } else {
      d.pat(5, 2, [
        "....HHHHHHHHHHHHHH...", "..HHHHHHHJJJJJHHHHHh.", ".HHHHHHJJJHHHHHHHHHhh", "HHHHHHJJHHHHHHHHHHHhh",
        "HHHHHHHHHHHhHHHHHHHhh", "HHHHHHhHHHHhHHHHHHhhh", "hHHHHhHHHHhHHHHHHHhHh", "hHHHhHHHHhHHHH.HH..H.",
        "hHHhHHHHhHHHH..H....H", "hHHHHHHhHHHH..HH.....", ".hHHHHhHHHH...H......", ".hHHHhHHHH...........",
        "..hHhHHHh............", "...h.hHh.............", "......h.............."]);
      d.pat(15, 11, ["SS", "Ss", "sS"]);
      shadeBelow(14, 23, 8, 12);
    }
    return;
  }
  if (dir === 0) {
    if (layer === "back") { d.rect(6, 8, 4, 18, "H"); d.rect(22, 8, 4, 18, "h"); return; }
    cap(); d.rect(8, 4, 16, 4, "H");
    // La couronne de reflet, les mèches de la frange, sa pointe festonnée.
    d.pat(10, 3, ["..JJJJJJJJ"]); d.pat(8, 4, ["JJJ.........JJ"]); d.pat(8, 5, [".J"]);
    d.pat(8, 5, ["...h...h..h...h."]); d.pat(8, 6, ["..h...hh...hh..."]); d.pat(8, 7, ["hHhhHhhHHhhHhhHh"]);
    // Les mèches de côté, devant les épaules : reflet à gauche, pointes en deux.
    d.rect(6, 8, 3, 16, "H"); d.rect(23, 8, 3, 16, "h"); d.rect(8, 8, 1, 14, "h"); d.rect(23, 8, 1, 14, "G");
    d.pat(7, 9, ["J", "J", "J", ".", "J"]);
    d.pat(6, 24, ["HH.", "H.."]); d.pat(23, 24, [".hh", "..h"]);
    shadeBelow(9, 22, 8, 8);
    d.pat(23, 4, BOW);
  } else if (dir === 1) {
    if (layer === "back") return;
    /* ⚠️ 2026-10-24 (« LE DOS », `torsoFront`) : au premier jet, une dalle de 20 px de large de la tête à la taille, plus large que
       les épaules — une carapace, les manches ballon cachées dessous, les bras sortant d'en dessous. La chevelure épouse la tête,
       se resserre sur la nuque et tombe sur le dos plus étroite que lui ; les épaules et les manches restent à l'air. */
    cap(); d.rect(6, 8, 20, 10, "H"); d.rect(7, 18, 18, 2, "H"); d.rect(8, 20, 16, 2, "H"); d.rect(9, 22, 14, 3, "H");
    d.rect(24, 4, 2, 14, "h"); d.rect(23, 18, 2, 2, "h"); d.rect(22, 20, 2, 2, "h"); d.rect(21, 22, 2, 3, "h");
    d.pat(10, 3, ["JJJJJJJJJJJJ"]); d.pat(8, 4, ["JJJ..........JJ"]); d.pat(9, 5, ["J.............J"]);
    // Des mèches de longueurs différentes (les rayures régulières du premier jet faisaient grille) — dans la chevelure seulement.
    for (const [x, y0, y1, c] of [[8, 9, 19, "h"], [10, 7, 15, "h"], [12, 11, 23, "h"], [14, 6, 13, "J"], [15, 14, 24, "h"], [17, 8, 18, "h"],
      [19, 12, 24, "h"], [21, 7, 16, "h"], [22, 15, 21, "G"]]) for (let y = y0; y <= y1; y++) if (isHair(d.get(x, y))) d.set(x, y, c);
    d.pat(9, 25, ["HHhH.HHhHH.HhH"]); d.pat(9, 26, [".H..hH...hH.H."]);
    d.pat(4, 4, BOW);
  } else {
    // ⚠️ 2026-10-24 (« on dirait des bossus ») : une bande de 4 px de la nuque à la taille, derrière le dos, en faisait une bosse.
    // La chevelure tombe de la nuque et se plaque sur le haut du dos, de plus en plus fine, jusqu'aux omoplates.
    if (layer === "back") { d.rect(5, 14, 4, 6, "H"); d.rect(5, 14, 1, 6, "h"); d.rect(7, 20, 4, 3, "H"); d.rect(7, 20, 1, 3, "h"); d.pat(8, 23, ["HHh", "H.h", "h.."]); d.rect(9, 16, 1, 6, "h"); return; }
    d.pat(5, 2, [
      "....HHHHHHHHHHHHHH...", "..HHHHHHHJJJJJJHHHHh.", ".HHHHHHJJJHHHHHHHHHHh", "HHHHHJJHHHHHHHHHHHHHh",
      "HHHHJHHHHHHhHHHHhHHHh", "HHHHHHHhHHHhHHHHHhhHh", "hHHHHHhHHHhHHHHhHhHhH", "hHHHHhHHHhHHHH........",
      "hHHHhHHHHhHHHh........", "hHHHHHHhHHHHHh........", "hHHHHHhHHHHHH.........", "hHHHHhHHHHHH.........."]);
    d.rect(17, 8, 7, 1, "s");
    d.pat(9, 3, BOW);
  }
}

/* ─── LES ÉPAULES (2026-10-24, variante C, son choix sur maquettes) ───────────
   Guillaume : « les épaules un peu moins hautes et crispées, une cohérence anatomique plus réaliste ». Au premier jet, les épaules
   étaient une ligne droite à hauteur du menton, les bras partaient sous la mâchoire et les mains s'arrêtaient à la ceinture : un
   haussement d'épaules permanent. Trois maquettes (léger, tombantes, tombantes et bras plus longs) ; il a retenu la troisième :
   - `SHOULDER_DROP` : les bras pendent deux pixels plus bas, le haut de la manche arrondi (le deltoïde) ;
   - `SHOULDER_INSET` : rentrés d'un pixel — ils tombent alors PILE sur les colonnes de bras du 16 × 24 (x 3-4 et 11-12, ×2), ce qui
     garde alignés les vêtements de Garfield agrandis et les découpes des poses ;
   - `ARM_LONG` : un pixel de plus à l'avant-bras (deux au premier jet, voir plus bas) — la main sur la cuisse, plus à la ceinture ;
   - `SHOULDER_FRONT` / `SHOULDER_SIDE` : l'ENVELOPPE des épaules, [rangée, x min, x max] — tout ce qui en dépasse est taillé APRÈS le
     torse, les costumes et les vêtements (une veste à épaulettes, une robe agrandie), avant les bras ; de profil, seule la pente du
     trapèze, à l'arrière du cou. L'anatomie reste carrée, la tête ne bouge pas.
   ⚠️⚠️ LA FEUILLE DES POSES (`pose`, la feuille NUE de `getCharHD`) GARDE LA HAUTEUR ET LA LONGUEUR DE BRAS DU GABARIT : toutes les
   poses (assis, glissade, grimpe, patin, park, ouvriers…) découpent le buste aux rangées 10-15 du 16 × 24 et la manche en
   x 3-5 / 10-12, rangées 11-15 (`POSE_SLICES`, fermeArt.js). Avec le bras long, la main tombait dans la tranche des cuisses et
   suivait les JAMBES (une main à côté des pieds dans la glissade), et la manche découpée n'avait plus de main — vu au banc
   `render-poses-hd`. Elles repositionnent toutes leurs bras (levés, en balancier, sur les genoux) : la feuille des poses prend
   les épaules tombantes et les bras rentrés, pas leur chute ni leur longueur. */
/* ⚠️ 2026-10-24, le soir — `ARM_LONG` 2 → 1 (« est-ce que tu crois pas que les bras sont trop longs de face ? »). Mesuré : le bras était
   le même de face et de profil (14 px de l'épaule au bout des doigts, la main au même endroit à chaque image), mais le bout des doigts
   tombait un pixel au-dessus du genou — long pour des jambes de 14 px ; de face, le bras entier se détache sur le fond et la main
   détendue se pose sur la cuisse, ça se voit. Un pixel de moins : le bout des doigts à mi-cuisse, toujours plus bas que la ceinture. */
const SHOULDER_DROP = 2, SHOULDER_INSET = 1, ARM_LONG = 1;
const ARM_POSE = { drop: 0, long: 0 }, ARM_STAND = { drop: SHOULDER_DROP, long: ARM_LONG };
const ARM_BARE = { ...ARM_POSE, none: true };
const SHOULDER_FRONT = [[20, 10, 21], [21, 9, 22], [22, 8, 23]], SHOULDER_SIDE = [[20, 13, 31], [21, 12, 31]];   // de profil : le buste mince (`torsoSide`)
function shoulders(d, side) {
  for (const [y, x0, x1] of side ? SHOULDER_SIDE : SHOULDER_FRONT) for (let x = 0; x < PERSO_HD_W; x++) if (x < x0 || x > x1) d.set(x, y, ".");
  // le nouveau bord du tissu prend la lumière à gauche, l'ombre à droite (comme le haut du torse)
  for (let x = 0; x < PERSO_HD_W; x++) for (let y = 21; y <= 22; y++) {
    const c = d.get(x, y);
    if (c === ".") continue;
    if ("CDcF".includes(c) && d.get(x, y - 1) === ".") d.set(x, y, x < 16 ? "D" : "c");
    break;
  }
}

/* ─── Le corps de face et de dos ──────────────────────────────────────────
   `st` : le pas (−1, 0, +1, comme `drawCharFrame`). Le pied du côté `st` se lève de 2 px, raccourci (on voit sa semelle).
   ⚠️ Depuis la marche à huit images (2026-10-24, « LA MARCHE À HUIT IMAGES »), seule la feuille des POSES passe par `legsFront`,
   `armsFront` et `bodySide` : ses quatre images, ses poses les découpent ; la marche a `legsFront2`, `armsFront2`, `bodySide2`. Le bras
   qui descend s'ÉTIRE depuis l'épaule : la manche suit le revers (elle s'arrêtait à sa place, une rangée vide la séparait du revers
   à chaque image de pas — le piège « un membre déplacé en bloc », docs/PIEGES.md). */
function legsFront(d, gender, st, back, plain) {
  const lift = (side) => (st !== 0 && st === side ? 2 : 0);
  const shoe = (x, w, side, sh) => {
    const up = lift(side);
    if (up) { d.rect(x, 42 - up, w, 2, "B"); d.rect(x, 44 - up, w, 1, "V"); d.rect(x + 1, 45 - up, w - 2, 1, "V"); return; }
    d.rect(x, 42, w, 3, "B"); d.rect(x, 45, w, 1, "V"); if (!back) d.pat(x + 1, 42, ["NN"]); if (sh) d.rect(x + w - 2, 42, 2, 3, "b");
  };
  if (gender === "m") {
    const leg = (x, side, light) => {
      const up = lift(side), h = 10 - up;
      d.rect(x, 32, 6, h, "P");
      if (light) { d.rect(x, 33, 1, h - 3, "Q"); d.pat(x + 2, 36 - (up >> 1), ["QQ"]); d.rect(x + 5, 33, 1, h - 3, "p"); }
      else { d.rect(x + 4, 33, 2, h - 3, "p"); d.rect(x + 5, 35, 1, h - 5, "O"); d.pat(x + 1, 36 - (up >> 1), ["QQ"]); }
      if (plain) { d.rect(x, 41 - up, 6, 1, "p"); d.swap(x, 33, 6, 9, "Q", "P"); }   // un pantalon de costume : ni revers ni pli clair
      else { d.rect(x, 40 - up, 6, 1, "Q"); d.rect(x, 41 - up, 6, 1, "p"); }   // le revers du jean
    };
    leg(10, -1, true); leg(16, 1, false);
    if (!back) { d.pat(10, 32, ["p", ".p"]); d.pat(20, 32, [".p", "p"]); d.rect(15, 32, 1, 3, "p"); }
    else { d.pat(11, 33, ["pppp", "pQQp", ".pp."]); d.pat(17, 33, ["pppp", "pQQp", ".pp."]); }
    d.swap(15, 37, 2, 5, "PpQO", ".");
    shoe(10, 6, -1, false); shoe(16, 6, 1, true);
  } else {
    // Sous la jupe : la cheville, puis des babies à bride.
    const foot = (x, side) => {
      const up = lift(side);
      d.rect(x + 1, 42 - up, 3, 1, back ? "s" : "S");
      if (up) { d.rect(x, 43 - up, 5, 1, "B"); d.rect(x, 44 - up, 5, 1, "V"); return; }
      d.rect(x, 43, 5, 2, "B"); d.rect(x, 45, 5, 1, "V"); d.rect(x + 1, 43, 3, 1, "b"); if (!back) d.set(x + 1, 44, "N");
    };
    foot(10, -1); foot(17, 1);
  }
}
function torsoFront(d, gender, dir, plain) {
  const back = dir === 1;
  if (gender === "m") {
    d.rect(8, 20, 16, 10, "C"); d.rect(9, 20, 14, 1, "D"); d.rect(9, 21, 2, 7, "D"); d.rect(21, 21, 2, 8, "c"); d.rect(23, 21, 1, 8, "F");
    if (plain) { d.rect(8, 29, 16, 1, "c"); d.rect(10, 30, 12, 2, "c"); return; }   // un costume couvre tout (combinaison, cape, gilet)
    if (back) {
      /* ⚠️ LE DOS (2026-10-24, Guillaume en jeu : « le dos ressemble à une carapace / un sac à dos, mauvaise anatomie »). Au premier
         jet, un empiècement clair sur toute la largeur, son trait sombre dessous et un pli creux flanqué de deux plis droits : le
         rabat et les sangles d'un sac. Ici le dos d'une chemise sur un dos : le col autour de la nuque, les omoplates (la gauche
         prend la lumière, la droite garde son ombre), la colonne d'un pixel qui se perd vers la taille. */
      d.rect(12, 20, 8, 1, "D"); d.rect(13, 21, 6, 1, "c");                   // le col, et son ombre sur le dos
      d.pat(10, 22, ["DDD", "DDDD", ".DD"]); d.pat(11, 25, ["cc"]);            // l'omoplate gauche, sa pointe
      d.pat(19, 23, [".cc", "ccc"]); d.pat(20, 25, ["c"]);                     // l'omoplate droite, dans l'ombre
      d.rect(16, 23, 1, 3, "c"); d.set(16, 27, "c");                           // la colonne
    } else {
      d.pat(12, 20, ["DDDSSDDD", ".cDSSDc.", "..cZZc.."]);
      d.rect(15, 23, 1, 6, "c"); d.set(16, 24, "U"); d.set(16, 27, "U");
      d.pat(10, 23, ["cccc", "cDDc", ".cc."]); d.set(11, 24, "U");
    }
    d.pat(9, 28, ["D.c..Dc..cD..c."]); d.rect(8, 29, 16, 1, "c");         // la chemise rentrée bouffe un peu au-dessus de la ceinture
    d.rect(10, 30, 12, 2, "V"); d.pat(11, 30, ["b........b"]);
    if (!back) d.pat(15, 30, ["YY", "Yb"]);
    return;
  }
  d.rect(8, 20, 16, 8, "C"); d.rect(9, 20, 14, 1, "D"); d.rect(9, 21, 2, 5, "D"); d.rect(21, 21, 2, 6, "c"); d.rect(23, 21, 1, 6, "F");
  if (!back) { d.rect(12, 20, 8, 2, "S"); d.rect(12, 20, 8, 1, "s"); d.pat(12, 22, ["UUUUUUUU", ".U.UU.U."]); d.rect(15, 24, 2, 2, "c"); }
  else { d.rect(12, 20, 8, 1, "U"); d.rect(15, 21, 2, 4, "c"); }
  d.rect(8, 26, 16, 2, "c"); d.rect(8, 27, 16, 1, "F");
  if (!back) d.pat(13, 25, ["KK..KK", "KLkkLK", "KK..KK", ".k..k."]); else d.pat(12, 25, ["KK....KK", "KLKkkKLK", "KK.kk.KK", "..k..k..", "..k..k.."]);
  // La jupe : un trapèze ; chaque pli naît d'un trait fin à la taille et s'élargit vers l'ourlet, son reflet à gauche ; l'ourlet est
  // une dentelle festonnée (les pixels vides du feston prennent le contour et dessinent les dents).
  d.rect(8, 28, 16, 4, "C"); d.rect(7, 32, 18, 4, "C"); d.rect(6, 36, 20, 4, "C");
  for (const x of [11, 16, 21]) {
    const dx = x < 15 ? -1 : x > 17 ? 1 : 0;
    d.rect(x, 29, 1, 4, "c"); d.rect(x + dx, 33, 1, 3, "c"); d.rect(x + 2 * dx, 36, 2, 3, "c"); d.rect(x + 2 * dx, 38, 1, 2, "F");
    d.rect(x - 1, 30, 1, 3, "D"); d.rect(x - 1 + dx, 34, 1, 3, "D");
  }
  d.rect(7, 32, 1, 4, "D"); d.rect(6, 36, 1, 4, "D"); d.rect(23, 30, 1, 6, "c"); d.rect(24, 34, 2, 6, "c");
  d.rect(6, 40, 20, 1, "U"); d.pat(6, 41, ["U.UU.UU.UU.UU.UU.UU."]);
}
function armsFront(d, gender, st, dir, A, LONG = ARM_LONG) {
  const back = dir === 1;
  const arm = (x, side, right) => {
    const fwd = st !== 0 && st !== side;   // la main qui avance : plus basse, rentrée d'un pixel
    const dy = st === 0 ? 0 : fwd ? 1 : -1, inward = fwd ? (right ? -1 : 1) : 0, reach = Math.max(0, dy);
    const out = right ? 1 : -1;
    if (A) {
      // 2026-10-23 — LA MANCHE PLEINE D'UN COSTUME (`A` : ses lettres [lumière, base, ombre], son poignet, sa main) : jusqu'au
      // poignet, comme la manche d'origine du 16 × 24 que le costume repeignait — un manteau, une combinaison, une veste.
      const [L, C0, S0] = A.sl;
      d.rect(x, 21, 4, 8 + dy + LONG, C0); d.rect(x, 21, 4, 1, L);
      if (right) d.rect(x + 2, 22, 2, 7 + dy + LONG, S0); else d.rect(x, 22, 1, 7 + dy + LONG, L);
      d.rect(x, 28 + dy + LONG, 4, 1, A.cuff || S0);
      const [H0, H1] = A.hand || ["S", "s"], hx = x + inward, hy = 29 + dy + LONG;
      d.pat(hx, hy, right ? [H0 + H0 + H0 + H1, H0 + H0 + H1 + H1, "." + H1 + H1 + "."] : [H0 + H0 + H0 + H0, H0 + H0 + H0 + H1, "." + H1 + H1 + "."]);
      // l'ombre du bras sur le torse : dans la couleur de ce qui est dessous (la tenue de Garfield, sinon la chemise)
      if (!back) d.rect(right ? 22 - SHOULDER_INSET : 9 + SHOULDER_INSET, 24, 1, 5, A.shadow ? A.shadow[right ? 1 : 0] : right ? "F" : "c");
      d.set(right ? x + 3 : x, 21, ".");   // le haut de la manche, arrondi
      void out;
      return;
    }
    if (gender === "m") {
      // Manche retroussée : la manche (jusqu'au revers, `reach`), le revers clair, l'avant-bras, la main.
      d.rect(x, 21, 4, 5 + reach, "C"); d.rect(x, 21, 4, 1, "D");
      if (right) d.rect(x + 2, 22, 2, 4 + reach, "c"); else d.rect(x, 22, 1, 4 + reach, "D");
      d.rect(x, 26 + dy, 4, 1, "U"); d.rect(x, 27 + dy, 4, 1, "D");
      d.rect(x + inward, 28 + dy, 4, 2 + LONG, "S"); if (right) d.rect(x + 3 + inward, 28 + dy, 1, 2 + LONG, "s");
    } else {
      // Manche ballon froncée, puis le bras nu, plus fin.
      d.rect(x - (right ? 0 : 1), 20, 5, 4, "C"); d.rect(x - (right ? 0 : 1), 20, 5, 1, "D");
      d.pat(x - (right ? 0 : 1), 21, right ? [".c.c.", "cc.cc"] : ["D.c.c", ".Dc.c"]); d.rect(x - (right ? 0 : 1), 23, 5, 1, "U");
      d.rect(x + (right ? 0 : 1) + inward, 24, 3, 5 + dy + LONG, "S"); d.rect(x + (right ? 2 : 1) + inward, 24, 1, 5 + dy + LONG, "s");
    }
    // La main : arrondie, le pouce tourné vers le corps.
    const hx = x + inward + (gender === "m" ? 0 : (right ? 0 : 1)), hy = (gender === "m" ? 30 : 29) + dy + LONG;
    d.pat(hx + (right ? 0 : 0), hy, gender === "m" ? (right ? ["SSSs", "SSss", ".ss."] : ["SSSS", "SSSs", ".ss."]) : (right ? ["SSs", ".s."] : ["SSS", ".s."]));
    // L'ombre que le bras pose sur le torse : c'est elle qui le détache du corps.
    if (!back) d.rect(right ? 22 - SHOULDER_INSET : 9 + SHOULDER_INSET, 24, 1, 5, right ? "F" : "c");
    if (gender === "m") d.set(right ? x + 3 : x, 21, "."); else d.set(right ? x + 4 : x - 1, 20, ".");   // le haut de la manche, arrondi
    void out;
  };
  arm(5 + SHOULDER_INSET, -1, false); arm(23 - SHOULDER_INSET, 1, true);
}

/* 2026-10-24 — LE BRAS DES POSES, POUR CEUX QUI LE REDESSINENT (les riders du park, `drawRiderBody`, montureArt.js). Guillaume :
   « les bras doivent être correctement articulés / orientés sur le BMX, la trottinette… ». Les poses tirent le bras de la feuille
   par cases du 16 × 24 : en 32 × 48, chaque case est un carreau de 2 × 2 qui ne tourne pas avec l'os (un bras à l'horizontale
   gardait ses ombres verticales et son revers en travers), et le bras d'ici, rentré d'un pixel (`SHOULDER_INSET`), chevauche la
   colonne que la pose croit être le torse — une bande de bras restait collée au buste. Elles reçoivent donc la feuille SANS BRAS
   (`paint(…, "bare")`, sous `__bare` de la feuille nue, fermeArt.js) et ce gabarit : la bande du bras dans la feuille des poses
   (image 0) — ses colonnes de face (gauche, droite) et de profil, sa largeur, et les rangées de la main (gardées 1 : 1 au bout de
   l'os, comme la chaussure d'une jambe). ⚠️ Mêmes nombres que `armsFront` / `bodySide` en pose (`ARM_POSE`) : les changer ici
   avec eux. */
export function persoHdArmRig(gender, cos) {
  const wd = (cos && cos.wd) || {};
  const A = costumeArms(cos) || (wd.outfit ? wearArms(wd.outfit, wd.tint || null) : null);
  const bodyG = cos && cos.worker && gender === "f" ? "m" : gender;
  return { front: [5 + SHOULDER_INSET, 23 - SHOULDER_INSET], side: 14, w: 4, hand: A ? [29, 31] : bodyG === "m" ? [30, 32] : [29, 30] };
}

/* ─── Le buste de profil, commun à la marche et aux poses ─────────────────
   ⚠️ 2026-10-24 (« le dos est toujours trop massif dans la vue de profil, on dirait des bossus ») : il était aussi profond (13 px) que la
   tête est large, quand il en fait 16 de face, et son dos tombait à l'aplomb de la nuque — une épaule ronde, une bosse. Il fait 11 px,
   le dos bien en dedans de l'arrière du crâne ; la pente du trapèze est taillée par `SHOULDER_SIDE` ; chez elle, le nœud contre les
   reins et la chevelure plaquée sur le dos (`hair`, profil). `sway` : l'ourlet de la robe suit le pas d'un pixel (la feuille des poses ;
   en marche, c'est `w2skirt` qui l'anime). */
function torsoSide(d, gender, plain, sway = 0) {
  if (gender === "m") {
    d.rect(11, 20, 11, 10, "C"); d.rect(11, 20, 11, 1, "D"); d.rect(11, 21, 2, 8, "D"); d.rect(20, 21, 2, 8, "c");
    if (plain) { d.rect(11, 29, 11, 1, "c"); d.rect(11, 30, 11, 2, "c"); return; }
    d.pat(18, 20, ["DDSS", ".cDS", "..cc"]); d.set(20, 24, "U"); d.set(20, 27, "U");
    d.pat(11, 28, ["D.c..cD..c"]); d.rect(11, 29, 11, 1, "c");
    d.rect(11, 30, 11, 2, "V"); d.pat(19, 30, ["YY", "Yb"]);
    return;
  }
  d.rect(11, 20, 11, 8, "C"); d.rect(11, 20, 11, 1, "D"); d.rect(11, 21, 2, 5, "D"); d.rect(19, 21, 2, 5, "c");
  d.rect(19, 20, 3, 1, "s"); d.pat(19, 21, ["UUU", ".U."]);
  d.rect(11, 26, 11, 2, "c"); d.pat(9, 25, ["KK", "kK", "KK", ".k", ".k"]);
  d.rect(11, 28, 11, 4, "C"); d.rect(10, 32, 13, 4, "C"); d.rect(8, 36, 16, 4, "C");
  for (const x of [13, 16, 19]) { d.rect(x, 29, 1, 4, "c"); d.rect(x + (x > 16 ? 1 : x < 16 ? -1 : 0), 33, 1, 3, "c"); d.rect(x + (x > 16 ? 2 : x < 16 ? -2 : 0) + sway, 36, 2, 4, "c"); d.rect(x - 1, 30, 1, 3, "D"); }
  d.rect(8, 36, 1, 4, "D"); d.rect(22, 32, 1, 4, "c"); d.rect(23, 36, 1, 4, "c");
  d.rect(8 + sway, 40, 16, 1, "U"); d.pat(8 + sway, 41, ["U.UU.UU.UU.UU.UU"]);
}

/* ─── De profil (tourné vers la droite) ───────────────────────────────────
   Le compas des jambes : à l'image du pas, la jambe de devant attaque du talon (pointe relevée), celle de derrière pousse de la
   pointe (talon levé). Le bras balance à contretemps, son ombre posée sur le flanc. */
function bodySide(d, gender, st, A, plain, mid, ARM = { drop: SHOULDER_DROP, long: ARM_LONG }) {
  const sw = st * 3;
  const footSide = (dx, c, front) => {
    const x = 13 + dx;
    if (st === 0) { d.rect(x, 42, 7, 3, c); d.rect(x, 45, 7, 1, "V"); if (c === "B") d.pat(x + 4, 42, ["NN"]); return; }
    if (front) { d.rect(x, 42, 6, 3, c); d.rect(x + 6, 41, 2, 3, c); d.rect(x, 45, 6, 1, "V"); d.set(x + 7, 44, "V"); }
    else { d.rect(x + 1, 43, 6, 2, c); d.rect(x, 42, 3, 2, c); d.rect(x + 2, 45, 5, 1, "V"); }
  };
  if (gender === "m") {
    const leg = (dx, c, crease0, front) => {
      const x = 13, crease = crease0 && !plain;
      d.rect(x, 32, 6, 3, c); d.rect(x + Math.sign(dx), 35, 6, 3, c); d.rect(x + Math.round(dx * 0.66), 38, 6, 2, c); d.rect(x + dx, 40, 6, 2, c);
      d.rect(x + dx, 40, 6, 1, crease ? "Q" : "p");
      if (plain) d.rect(x + dx, 40, 6, 1, c);
      if (crease) { d.rect(x + 4, 33, 1, 2, "Q"); d.rect(x + 4 + Math.sign(dx), 35, 1, 3, "Q"); d.rect(x + 4 + Math.round(dx * 0.66), 38, 1, 2, "Q"); }
      footSide(dx, c === "P" ? "B" : "b", front);
    };
    // Au repos, les jambes s'écartent d'un pixel chacune ; en marche, le compas est symétrique (±3) et c'est la jambe qui est DEVANT
    // (dx > 0), pas toujours la plus proche, qui attaque du talon.
    const dn = st === 0 ? 1 : sw, df = st === 0 ? -1 : -sw;
    leg(df, "O", false, df > 0); leg(dn, "P", true, dn > 0);
    torsoSide(d, "m", plain);
  } else {
    { const dn = st === 0 ? 1 : sw, df = st === 0 ? -1 : -sw; footSide(df, "b", df > 0); footSide(dn, "B", dn > 0); }
    d.rect(16 - sw, 42, 2, 1, "s"); d.rect(17 + sw, 42, 2, 1, "S");
    torsoSide(d, "f", plain, st);   // l'ourlet suit le pas d'un pixel
  }
  if (mid) mid(d);   // un costume (gilet, tablier, manteau…) : sur le flanc, sous le bras
  if (ARM.none) return;   // la feuille des poses sans bras (`persoHdArmRig`) : le flanc nu, sans l'ombre du bras
  /* Le bras, devant le flanc, à contretemps des jambes, décalé de 2 px en bloc : seule la feuille des POSES passe ici, et ses poses le
     découpent ; la marche a son bras articulé (`bodySide2`). */
  const L2 = ARM.long, sh = -st * 2, ax = 14 + sh, T = buf();
  bodySideArmStraight(mk(T), gender, A, L2);
  d = d.shift(ARM.drop);
  for (let y = 0; y < PERSO_HD_H; y++) for (let x = 0; x < PERSO_HD_W; x++) if (T[y][x] !== ".") d.set(x + sh, y, T[y][x]);
  // La robe juste derrière le bras nu prend l'ombre ; puis l'ombre du bras sur le flanc, devant lui.
  if (!A && gender !== "m") for (let y = 24; y <= 29 + L2; y++) if ("CD".includes(d.get(ax - 1, y))) d.set(ax - 1, y, "c");
  for (let y = 22; y <= 29 + L2; y++) if (A && A.shadow ? d.get(ax + 4, y) !== "." : "CD".includes(d.get(ax + 4, y))) d.set(ax + 4, y, A && A.shadow ? A.shadow[1] : "F");
}


/* ╔══════════════════════════════════════════════════════════════════════════
   ║ LA MARCHE À HUIT IMAGES (2026-10-24)
   ╚══════════════════════════════════════════════════════════════════════════
   Guillaume, en jouant : « le mouvement de bras doit être plus naturel, l'articulation… pousse au max le réalisme de la démarche —
   fluide, fun et réaliste, mais toujours bien stylisé sur les formes ». Jugée sur cinq maquettes (https://claude.ai/artifact/L4mrNwQSKMBGVnNyVK9tEA).
   La feuille de MARCHE (`pose` faux) a NEUF images par vue (`PERSO_HD_WALK_FRAMES`) : 0 debout — ce qui montre un personnage immobile
   (portraits, miroirs, cabine d'essayage) lit l'image 0 et n'a rien vu changer —, 1 à 8 la foulée, à la cadence de pas d'avant
   (`drawCharacter`, FermeGame.js : `1 + ⌊(animT mod 4) × 2⌋`) : contact, amorti, passage, poussée, puis l'autre pied. La feuille des
   POSES garde ses quatre images (ses poses la découpent). Chaque membre est peint DROIT sur une grille à part, puis recopié os par os
   (`w2bone`) : la hanche et l'épaule restent au corps, le genou se place par cinématique inverse (le pied d'appui reste au sol quand le
   bassin descend), le coude plie. Ce que les maquettes ont appris — chaque ligne a été une maquette refusée :
   - LA TÊTE suit le corps de haut en bas et reste en bas une image de plus après l'amorti : du poids. Collée au buste : « plus figée
     que l'actuelle » ; plus libre (elle avançait de profil, ballottait de côté avec une image de retard, descendait d'un pixel de plus
     que le corps) : « on dirait un pigeon ». Jamais au-dessus du col : le cou ne s'étire pas, la tête s'enfonce.
   - LE POIDS passe d'un pied sur l'autre (face, dos) : bassin, buste et tête glissent ENSEMBLE d'un pixel vers la jambe d'appui.
   - LES BRAS sont un pendule court (±12° à l'épaule, deux images au bout du geste), le coude presque constant, le second bras à 70 % :
     ±19° et un avant-bras qui dépassait au retour faisaient « mou », la symétrie parfaite « systématique ». De face et de dos, un bras
     ne fait que RACCOURCIR en balançant (`armsFront2`), détendu ; de dos, l'avant-bras qui part en avant passe derrière la hanche.
   - LA JUPE vit (`w2skirt`), le PANTALON d'une tenue est celui des jambes (`W2_TROUSER_Y`), les PIEDS de face ne montrent jamais leur
     semelle (`w2shoeFront`), le PROFIL est mince (`torsoSide`). */
export const PERSO_HD_WALK_FRAMES = 9;
/* LES MAINS JOINTES (2026-10-24 ; « quand on reste immobile quelques secondes, joueurs et habitants ») : une petite feuille à part
   (`paint(…, "clasp")`, `PERSO_HD_CLASP_FRAMES` images par vue : 0 les mains jointes, 1 l'image de passage, avant-bras à mi-course) que
   `drawCharacter` (FermeGame.js) prend après quelques secondes d'immobilité, les mains libres. Rien ne circule : chaque machine date
   elle-même l'arrêt. */
export const PERSO_HD_CLASP_FRAMES = 2;
// par demi-foulée (contact, amorti, passage, poussée) ; la seconde est la même, de l'autre côté
const W2_BOB = [0, 1, 0, -1], W2_HEAD_DY = [0, 1, 1, -1], W2_SWAY = [0, -1, -1, 0];
const W2_TROUSER_Y = 34;   // la rangée où la grille d'une tenue passe de la veste au pantalon (le costume : 17 du 16 × 24)
// profil : [pied (x par rapport à la hanche), levée, forme] pour la jambe qui mène à la première image ; l'autre est en retard de 4
const W2_SIDE_LEG = [[5, 0, "heel"], [3, 0, "flat"], [0, 0, "flat"], [-3, 0, "toe"], [-5, 1, "toe"], [-3, 4, "air"], [0, 5, "air"], [4, 2, "air"]];
// [épaule, coude] en degrés (+ : vers l'avant) pour le bras du côté de la jambe qui mène — au bout de son recul au contact ; le second à 70 %
const W2_ARM = [[-12, 9], [-12, 9], [-5, 10], [5, 12], [12, 14], [12, 14], [5, 12], [-5, 10]], W2_ARM_K = [1, 0.7];
const w2armAt = (f, k) => { const [ts, te] = W2_ARM[(f + (k ? 4 : 0)) % 8], q = W2_ARM_K[k ? 1 : 0]; return [ts * q, 9 + (te - 9) * q]; };
// face / dos : [allongement (+ : plus bas), levée, forme, rentrée du pied]
const W2_FRONT_LEG = [[1, 0, "heel", 0], [0, 0, "flat", 0], [0, 0, "flat", 0], [0, 1, "toe", 0], [0, 1, "toe", 0], [0, 3, "air", 0], [0, 4, "air", 1], [0, 1, "heel", 0]];
const W2_BACK_LEG = [[-1, 0, "flat", 0], [0, 0, "flat", 0], [0, 0, "flat", 0], [0, 1, "sole", 0], [1, 0, "sole", 0], [0, 3, "sole", 0], [0, 4, "sole", 1], [0, 2, "flat", 0]];
const RAD = Math.PI / 180;
// le bras du fond, de profil : un cran plus sombre
const W2_DARK = { D: "C", C: "c", c: "F", U: "D", S: "s", T: "S", P: "O", Q: "P", p: "O", B: "b", b: "V", N: "B" };

function w2put(d, x, y, c, o) {
  if (o.behind && d.get(x, y) !== ".") return;
  d.set(x, y, o.map && o.map[c] ? o.map[c] : c);
  if (o.track) { const r = o.track[y] || (o.track[y] = [x, x]); if (x < r[0]) r[0] = x; if (x > r[1]) r[1] = x; }
}
/* Un os : les rangées source [r0, r1) de la bande `src` (le membre peint droit, son axe à la colonne `ax`), posées de J0 à J1.
   Plutôt vertical : rangée par rangée, chacune décalée le long de l'os. Plutôt couché : colonne par colonne, la largeur de la bande
   EN TRAVERS de l'os (sa colonne claire, à gauche, passe en haut : la lumière reste en haut à gauche). */
function w2bone(d, src, r0, r1, ax, J0, J1, o = {}) {
  if (r1 <= r0) return;
  const dx = J1[0] - J0[0], dy = J1[1] - J0[1];
  if (Math.abs(dy) >= Math.abs(dx) * 0.75) {
    const y0 = Math.round(J0[1]), n = Math.max(1, Math.abs(Math.round(J1[1]) - y0)), sg = dy >= 0 ? 1 : -1;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, r = r0 + Math.min(r1 - r0 - 1, Math.floor(t * (r1 - r0)));
      const off = Math.round(J0[0] + dx * t - ax);
      for (let x = 0; x < PERSO_HD_W; x++) { const c = src[r][x]; if (c !== ".") w2put(d, x + off, y0 + sg * k, c, o); }
    }
    return;
  }
  let xa = PERSO_HD_W, xb = -1;
  for (let r = r0; r < r1; r++) for (let x = 0; x < PERSO_HD_W; x++) if (src[r][x] !== ".") { if (x < xa) xa = x; if (x > xb) xb = x; }
  if (xb < 0) return;
  const x0 = Math.round(J0[0]), n = Math.max(1, Math.abs(Math.round(J1[0]) - x0)), sg = dx >= 0 ? 1 : -1, mid = (xa + xb) / 2;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, r = r0 + Math.min(r1 - r0 - 1, Math.floor(t * (r1 - r0))), yc = J0[1] + dy * t;
    for (let x = xa; x <= xb; x++) { const c = src[r][x]; if (c !== ".") w2put(d, x0 + sg * k, Math.round(yc + x - mid), c, o); }
  }
}
// la bande du bras peinte droite (rangées source, avant `drop`) : [haut, épaule, coude, main, fin]
function w2armRig(gender, A, LONG) {
  if (A) return [21, 22, 26, 29 + LONG, 31 + LONG];
  if (gender === "m") return [21, 22, 28, 30 + LONG, 32 + LONG];
  return [20, 22, 27, 29 + LONG, 30 + LONG];
}
/* Un bras articulé : épaule `S`, puis le haut du bras, l'avant-bras et la main, chacun vers son point. `proj(v, L)` rend le
   déplacement à l'écran d'un segment de longueur L dans la direction v (l'angle, ou un point imposé). Les rangées au-dessus de
   l'épaule (la coiffe de la manche) ne bougent pas. `hideFore` : l'avant-bras et la main passent DERRIÈRE le corps. */
function w2arm(d, T, rig, ax, drop, E, W, H, o, hideFore) {
  const [top, piv, elb, hnd, end] = rig;
  const S = [ax, piv + drop];
  for (let r = top; r < piv; r++) for (let x = 0; x < PERSO_HD_W; x++) if (T[r][x] !== ".") w2put(d, x, r + drop, T[r][x], o);
  w2bone(d, T, piv, elb, ax, S, E, o);
  if (hideFore === "none") return;   // de dos, mains jointes : l'avant-bras et la main sont devant le corps, invisibles
  const of = hideFore ? { ...o, behind: true } : o;
  w2bone(d, T, elb, hnd, ax, E, W, of);
  w2bone(d, T, hnd, end + 1, ax, W, H, of);
}
const w2pt = (P, L, a, kx = 1, ky = 1) => [P[0] + L * Math.sin(a) * kx, P[1] + L * Math.cos(a) * ky];

/* ─── De profil ─────────────────────────────────────────────────────────── */
function w2shoeSide(d, x0, y0, c, shape) {
  if (shape === "heel") { d.rect(x0, y0, 6, 3, c); d.rect(x0 + 6, y0 - 1, 2, 3, c); d.rect(x0, y0 + 3, 6, 1, "V"); d.set(x0 + 7, y0 + 2, "V"); return; }
  if (shape === "toe") { d.rect(x0 + 1, y0 + 1, 6, 2, c); d.rect(x0, y0, 3, 2, c); d.rect(x0 + 2, y0 + 3, 5, 1, "V"); return; }
  if (shape === "air") { d.rect(x0, y0, 6, 3, c); d.rect(x0 + 6, y0 + 1, 1, 2, c); d.rect(x0 + 1, y0 + 3, 5, 1, "V"); return; }
  d.rect(x0, y0, 7, 3, c); d.rect(x0, y0 + 3, 7, 1, "V"); if (c === "B") d.pat(x0 + 4, y0, ["NN"]);
}
function bodySide2(b, gender, f, A, plain, mid, ARM, clasp, wearSkirt = false, still = false) {
  const stand = f >= 8, p = f % 4, bob = stand ? 0 : W2_BOB[p];
  const low = mk(b), up = mk(b, bob);
  const legOf = (k) => (stand ? (k ? [-1, 0, "flat"] : [1, 0, "flat"]) : W2_SIDE_LEG[(f + (k ? 4 : 0)) % 8]);
  const armOf = (k) => (stand || still ? [0, 4] : w2armAt(f, k));   // `still` : Léo porte ses cartons
  const LONG = ARM.long, rig = w2armRig(gender, A, LONG), ax = 15.5;
  // les bras peints droits, sur une grille à part
  const T = buf();
  bodySideArmStraight(mk(T), gender, A, LONG);
  const placeArm = (k) => {
    const [ts, te] = clasp ? [0, 4] : armOf(k), a1 = ts * RAD, a2 = (ts + te) * RAD;
    const S = [ax, rig[1] + ARM.drop], E = w2pt(S, rig[2] - rig[1], a1), W = w2pt(E, rig[3] - rig[2], a2), H = w2pt(W, rig[4] - rig[3] + 1, a2);
    if (!clasp) return [E, W, H];
    // mains jointes (« LES MAINS JOINTES ») : le haut du bras tombe, l'avant-bras à l'horizontale, les mains devant le ventre ; `clasp` < 1,
    // l'image de passage — chaque point à mi-chemin entre le bras qui pend et le bras replié
    const Ec = w2pt(S, rig[2] - rig[1], 6 * RAD), Wc = [Ec[0] + 5, Ec[1] - 1], Hc = [Wc[0] + 2, Wc[1]];
    const mix = (P, Q) => [P[0] + (Q[0] - P[0]) * clasp, P[1] + (Q[1] - P[1]) * clasp];
    return [mix(E, Ec), mix(W, Wc), mix(H, Hc)];
  };
  const farArm = (o) => { const [E, W, H] = placeArm(1); w2arm(up, T, rig, ax, ARM.drop, E, W, H, { map: W2_DARK, ...o }, false); };
  // les jambes d'homme : le genou par cinématique inverse (deux os de 5), la hanche portée par le bassin ; `acc` : sous une jupe, dessous
  const legsM = (acc) => {
    for (const k of [1, 0]) {
      const [fx, lift, shape] = legOf(k), c = k ? "O" : "P", crease = !k && !plain;
      const L = buf(), t = mk(L), x = 13;
      t.rect(x, 32, 6, 10, c); t.rect(x, 40, 6, 1, crease ? "Q" : "p"); if (plain) t.rect(x, 40, 6, 1, c); if (crease) t.rect(x + 4, 33, 1, 7, "Q");
      const H = [15.5, 32 + bob], An = [15.5 + fx, 42 - lift], v = [An[0] - H[0], An[1] - H[1]], dd = Math.hypot(v[0], v[1]);
      const h = dd < 10 ? Math.sqrt(25 - (dd * dd) / 4) : 0, K = [H[0] + v[0] / 2 + (v[1] / dd) * h, H[1] + v[1] / 2 - (v[0] / dd) * h];
      w2bone(acc, L, 32, 37, 15.5, H, K, {}); w2bone(acc, L, 37, 42, 15.5, K, An, {});
      w2shoeSide(acc, Math.round(An[0] - 2.5), Math.round(An[1]), k ? "b" : "B", shape);
    }
  };
  const skirted = gender !== "m" || wearSkirt;
  if (!skirted) { farArm({}); legsM(low); }   // le bras du fond derrière tout, puis les jambes
  torsoSide(up, gender, plain);
  if (mid) mid(up);   // la pente du trapèze y est taillée (`shoulders`, `SHOULDER_SIDE`)
  if (skirted) {
    // la jupe vit (`w2skirt`), puis ce qui passe dessous : le bras du fond, les jambes ou les pieds
    w2skirt(b, 29 + bob, w2skirtParams(f, 2));
    farArm({ behind: true });
    const lb = mk(b, 0, true);
    if (gender === "m") legsM(lb);
    else for (const k of [1, 0]) {
      const [fx, lift, shape] = legOf(k), x0 = Math.round(15.5 + fx - 2.5), y0 = 42 - lift;
      w2shoeSide(lb, x0, y0, k ? "b" : "B", shape);
      lb.rect(x0 + 2, y0 - 1, 2, 1, k ? "s" : "S");   // la cheville sous l'ourlet
    }
  }
  // 3. le bras proche, articulé, puis son ombre sur le flanc (à droite de lui, rangée par rangée)
  const track = [];
  { const [E, W, H] = placeArm(0); w2arm(up, T, rig, ax, ARM.drop, E, W, H, { track }, false); }
  if (clasp >= 1) { const [, W] = placeArm(0); up.pat(Math.round(W[0]) + 1, Math.round(W[1]) - 1, gender === "m" ? ["SSs", "SSs", "ss."] : ["SSs", "ss."]); }
  for (let y = 0; y < PERSO_HD_H; y++) { const r = track[y]; if (!r) continue; const x = r[1] + 1; if (A && A.shadow ? b[y][x] !== "." && y > 22 + bob : "CD".includes(b[y][x]) && y > 22 + bob) b[y][x] = A && A.shadow ? A.shadow[1] : "F"; }
  return { bob, st: stand ? 0 : (p <= 1 ? (f < 4 ? 1 : -1) : 0) };
}
// le bras de profil, droit (la bande que `w2arm` recopie) — le dessin de `bodySide`, à la colonne 14
function bodySideArmStraight(t, gender, A, L2) {
  const ax = 14;
  if (A) {
    const [L, C0, S0] = A.sl, [H0, H1] = A.hand || ["S", "s"];
    t.rect(ax, 21, 4, 8 + L2, C0); t.rect(ax, 21, 4, 1, L); t.rect(ax, 22, 1, 7 + L2, L); t.rect(ax + 3, 22, 1, 7 + L2, S0); t.rect(ax, 28 + L2, 4, 1, A.cuff || S0);
    t.pat(ax, 29 + L2, [H0 + H0 + H1, H0 + H0 + H1, "." + H1 + "."]); t.set(ax + 3, 21, ".");
  } else if (gender === "m") {
    t.rect(ax, 21, 4, 5, "C"); t.rect(ax, 21, 4, 1, "D"); t.rect(ax, 22, 1, 4, "D"); t.rect(ax + 3, 22, 1, 4, "c");
    t.rect(ax, 26, 4, 1, "U"); t.rect(ax, 27, 4, 1, "D"); t.rect(ax, 28, 4, 2 + L2, "S"); t.rect(ax + 3, 28, 1, 2 + L2, "s");
    t.pat(ax, 30 + L2, ["SSs", "SSs", ".s."]); t.set(ax + 3, 21, ".");
  } else {
    t.pat(ax - 1, 20, [".DDD.", "DDCCc", "DCcCc", ".cccF"]);
    t.rect(ax, 24, 3, 5 + L2, "S"); t.rect(ax + 2, 24, 1, 5 + L2, "s"); t.pat(ax, 29 + L2, ["SSs", ".s."]);
  }
}


/* LA JUPE VIVANTE (2026-10-24, « la robe est trop rigide, on dirait un gnocchi… pas assez ample dans le mouvement »). La robe (de base,
   de la Maison Garfield, le tailleur, celle d'une habitante) se peint DROITE, puis chaque rangée sous la taille se recopie : t va de 0
   (taille) à 1 (ourlet) ; la rangée s'élargit de (eL, eR)·t et glisse de dx·t ; les deux rangées d'ourlet montent ou descendent de chaque
   côté (hL, hR) — quand un côté descend, le tissu suit. Les pieds et le bras du fond se posent APRÈS, dessous (cases vides). */
function w2skirtParams(f, dir) {
  if (f >= 8) return null;
  const p = f % 4, leadL = f < 4;
  // de profil : la jupe s'ouvre quand les jambes s'écartent (une image après le contact), traîne d'un pixel derrière la marche, et le
  // genou qui avance soulève l'avant de l'ourlet
  if (dir === 2) { const fl = [1, 2, 1, 0][p]; return { eL: fl, eR: fl, dx: -1, hL: 0, hR: p === 3 || p === 0 ? -1 : 0 }; }
  // de face, de dos : l'ourlet balance avec deux images de retard sur le bassin (±2 px, l'inertie du tissu) ; du côté de la jambe qui
  // mène, il s'évase et descend (de face : elle vient vers nous) ou remonte (de dos : le genou le soulève)
  const HEM = [2, 0, 0, -2, -2, 0, 0, 2], fl = p <= 1 ? 1 : 0, h = p <= 1 ? (dir === 0 ? 1 : -1) : 0;
  return { eL: leadL ? fl : 0, eR: leadL ? 0 : fl, dx: HEM[f], hL: leadL ? h : 0, hR: leadL ? 0 : h };
}
function w2skirt(b, y0, P) {
  if (!P) return;
  const T = b.map((r) => r.slice());
  let y1 = -1;
  for (let y = PERSO_HD_H - 1; y >= y0 && y1 < 0; y--) if (T[y].some((c) => c !== ".")) y1 = y;
  if (y1 < y0 + 3) return;
  for (let y = y0; y < PERSO_HD_H; y++) b[y].fill(".");
  for (let y = y0; y <= y1; y++) {
    const t = Math.pow((y - y0 + 1) / (y1 - y0 + 1), 1.2);
    let xa = -1, xb = -1;
    for (let x = 0; x < PERSO_HD_W; x++) if (T[y][x] !== ".") { if (xa < 0) xa = x; xb = x; }
    if (xa < 0) continue;
    const na = Math.round(xa - P.eL * t + P.dx * t), nb = Math.round(xb + P.eR * t + P.dx * t);
    const hem = y >= y1 - 1, last = y === y1 - 2;
    for (let X = Math.max(0, na); X <= Math.min(PERSO_HD_W - 1, nb); X++) {
      const sx = nb === na ? xa : Math.round(xa + ((X - na) * (xb - xa)) / (nb - na)), c = T[y][sx];
      if (c === ".") continue;
      const h = X < 16 ? P.hL : P.hR, Y = y + (hem ? h : 0);
      if (Y >= 0 && Y < PERSO_HD_H) b[Y][X] = c;
      if (last && h > 0) b[y + 1][X] = c;   // l'ourlet descend : le tissu suit
    }
  }
}

/* ─── De face et de dos ─────────────────────────────────────────────────── */
/* ⚠️ Les pieds de face et de dos (« vérifier l'orientation des pieds de face et de dos »). Au premier jet, le pied qui avance montrait
   sa SEMELLE de face (la pointe levée) : à l'écran, une semelle sous la chaussure se lit comme un pied vu de dos, tourné à l'envers.
   De face, jamais de semelle : le pied qui avance a la pointe un peu plus haute (une rangée de plus, son reflet), celui qui pousse est
   raccourci et dans l'ombre. De dos, la semelle ne se voit que sur le talon qui se lève. */
function w2shoeFront(d, x0, G, w, shape, back, sh, fem) {
  const tall = !back && shape === "heel" ? 1 : 0, short = shape === "toe" || shape === "air";
  const sole = back && (shape === "sole" || shape === "toe" || shape === "air");
  const top = G - (short ? 2 : 3) - tall;
  if (fem) {
    if (sole) { d.rect(x0, top + 1, w, 1, "B"); d.rect(x0, top + 2, w, 1, "V"); d.rect(x0 + 1, G, w - 2, 1, "V"); }
    else { d.rect(x0, top + 1, w, G - top - 1, short && !back ? "b" : "B"); d.rect(x0, G, w, 1, "V"); if (!back && !short) { d.rect(x0 + 1, top + 1, 3, 1, "b"); d.set(x0 + 1, top + 2, "N"); } }
    d.rect(x0 + 1, top, 3, 1, back ? "s" : "S");   // la cheville
    return;
  }
  if (sole) { d.rect(x0, top, w, 1, "B"); d.rect(x0, top + 1, w, 1, "b"); d.rect(x0, top + 2, w, 1, "V"); d.rect(x0 + 1, G, w - 2, 1, "V"); return; }
  d.rect(x0, top, w, G - top, short && !back ? "b" : "B"); d.rect(x0, G, w, 1, "V");
  if (!short) { if (!back) d.pat(x0 + 1, top, ["NN"]); if (sh) d.rect(x0 + w - 2, top, 2, G - top, "b"); }
}
function legsFront2(b, gender, f, back, plain, sdx = 0, under = false) {
  const stand = f >= 8, p = f % 4, bob = stand ? 0 : W2_BOB[p], low = mk(b, 0, under);
  const TAB = back ? W2_BACK_LEG : W2_FRONT_LEG;
  // l'image 0 : la jambe GAUCHE à l'écran mène
  const legOf = (k) => (stand ? [0, 0, "flat", 0] : TAB[(f + (k ? 4 : 0)) % 8]);
  if (gender === "m") {
    const T = buf();
    legsFront(mk(T), gender, 0, back, plain);
    for (const k of [0, 1]) {
      const [ext, lift, shape, inw] = legOf(k), x0 = k ? 16 : 10, G = 45 + ext - lift;
      const shoeTop = G - (shape === "toe" || shape === "air" ? 2 : 3) - (!back && shape === "heel" ? 1 : 0), n = shoeTop - (32 + bob);
      const L = T.map((r) => r.map((c, x) => (x >= x0 && x < x0 + 6 ? c : ".")));
      for (let y = 42; y < PERSO_HD_H; y++) L[y] = Array(PERSO_HD_W).fill(".");
      // le genou qui monte vers nous raccourcit la CUISSE ; le tibia garde ses rangées (le revers du jean reste)
      const thigh = Math.max(1, n - 5), cx = x0 + 3, dxF = (k ? -1 : 1) * inw;
      // la hanche suit le transfert de poids (`sdx`), le pied reste où il est posé
      w2bone(low, L, 32, 37, cx, [cx + sdx, 32 + bob], [cx + sdx * 0.5, 32 + bob + thigh], {});
      w2bone(low, L, 37, 42, cx, [cx + sdx * 0.5, 32 + bob + thigh], [cx + dxF, shoeTop], {});
      w2shoeFront(low, x0 + dxF, G, 6, shape, back, k === 1, false);
    }
  } else {
    for (const k of [0, 1]) {
      const [ext, lift, shape, inw] = legOf(k), x0 = (k ? 17 : 10) + (k ? -1 : 1) * inw, G = 45 + ext - lift;
      w2shoeFront(low, x0, G, 5, shape, back, false, true);
    }
  }
  return { bob, st: stand ? 0 : (p <= 1 ? (f < 4 ? 1 : -1) : 0) };
}
function armsFront2(d, gender, f, dir, A, LONG, drop, clasp, still = false) {
  const back = dir === 1, stand = f >= 8;
  const T = buf();
  armsFront(mk(T).shift(0), gender, 0, dir, A, LONG, true);
  const rig = w2armRig(gender, A, LONG);
  for (const k of [0, 1]) {
    // l'image 0 : la jambe gauche mène, donc le bras GAUCHE recule (k = 0)
    const L = T.map((r) => r.map((c, x) => ((k ? x >= 22 : x <= 9) ? c : ".")));
    const inDir = k ? -1 : 1, ax = k ? 23.5 : 7.5, S = [ax, rig[1] + drop];
    const Lu = rig[2] - rig[1], Lf = rig[3] - rig[2], Lh = rig[4] - rig[3] + 1;
    const [ts, te] = clasp || stand || still ? [0, 6] : w2armAt(f, k), a1 = ts * RAD, a2 = (ts + te) * RAD;   // `still` : Léo et ses cartons
    /* ⚠️ Cinquième passe (« la marche de face manque de naturel à cause des bras : on dirait qu'ils sont tendus vers le bas »). Le
       bras qui avançait descendait à l'écran (« il vient vers nous ») : sur un balancier si court, ce décalage l'emportait sur le
       raccourci, et le bras finissait PLUS LONG qu'au repos — tiré vers le bas. Et au repos, deux colonnes droites collées au buste.
       Ici un bras ne fait que RACCOURCIR en balançant (de face comme de dos), et il est détendu : le coude s'écarte d'un pixel du
       buste, l'avant-bras revient vers la cuisse ; en avançant, il plie et la main rentre devant la cuisse ; en reculant, elle s'écarte. */
    const seg = (P, Ln, a, lat) => [P[0] + inDir * lat, P[1] + Ln * Math.cos(a)];
    const latU = -0.9 + Math.max(0, Math.sin(a1)) * 0.4;
    const latF = 1 + Math.max(0, Math.sin(a2)) * 1.6 - Math.max(0, -Math.sin(a2)) * 1;
    const E = seg(S, Lu, a1, latU), W = seg(E, Lf, a2, latF), H = seg(W, Lh, a2, latF * Lh / Lf);
    if (clasp) {
      // mains jointes (« LES MAINS JOINTES ») : coudes un peu ouverts, avant-bras vers le milieu, mains réunies devant le ventre ; de dos,
      // les avant-bras sont devant le corps, cachés. `clasp` < 1 : l'image de passage, à mi-chemin du bras qui pend.
      const Ec = [S[0] - inDir * 1, S[1] + Lu], Wc = [16 - inDir * 2.5, Ec[1] + 1], Hc = [16 - inDir * 1, Wc[1]];
      const mix = (P, Q) => [P[0] + (Q[0] - P[0]) * clasp, P[1] + (Q[1] - P[1]) * clasp];
      const Em = mix(E, Ec);
      w2arm(d, L, rig, ax, drop, Em, mix(W, Wc), mix(H, Hc), {}, back ? (clasp >= 1 ? "none" : true) : false);
      // de dos, le coude plié : un bout d'avant-bras qui tourne vers l'avant, dans l'ombre
      if (back && clasp >= 1) for (let i = 0; i < 2; i++) { const x = Math.round(Em[0]) + inDir * (i - 1), y = Math.round(Em[1]) + i; if (d.get(x, y) === ".") d.set(x, y, "s"); if (d.get(x + inDir, y) === ".") d.set(x + inDir, y, "s"); }
      continue;
    }
    // de dos, l'avant-bras qui part en avant passe derrière la hanche : le bras paraît court
    w2arm(d, L, rig, ax, drop, E, W, H, {}, back && ts + te > 14);
  }
  if (clasp >= 1 && !back) {
    const y = Math.round(rig[2] + drop + 1);
    d.pat(13, y - 1, gender === "m" ? [".SSSs.", "SSSSss", "SSSsss", ".ssss."] : [".SSs.", "SSSss", ".sss."]);
  }
  // l'ombre des bras sur le torse
  if (!back) { d.rect(9 + SHOULDER_INSET, 24, 1, 4, A && A.shadow ? A.shadow[0] : "c"); d.rect(22 - SHOULDER_INSET, 24, 1, 4, A && A.shadow ? A.shadow[1] : "F"); }
}

/* ─── LES COSTUMES DES PNJ (2026-10-23, lot A) ─────────────────────────────
   Guillaume : « strictement fidèles » — chaque costume est celui de `drawCharFrame` (fermeArt.js), aux MÊMES repères ×2 et aux
   MÊMES couleurs, avec le modelé du dessin fin (lumière en haut à gauche, ombre à droite, contour). Puis, le même soir : « gardons
   l'élégance sobre et sévère de certains PNJ, pas rendre tout forcément trop mimi » → le visage d'un PNJ n'est pas celui d'un
   joueur (`faceStyle` : « pnj » bouche droite ; « sobre » œil étroit, pas de rose ; « carla » sa bouche rouge ; aucun visage sous
   un voile ou une capuche — le vandale n'en a JAMAIS, QUETE.md l'exige).
   `cos` : { npc, cap, overalls, plaid, bee, cheese, sugar, look: "carla" | "leo" | "froufrou" | "vandal", worker: { role, vest,
   hat, pants, sleeves } } — l'équipe des ouvriers vient de `WORKER_CREW` (fermeArt.js) : une seule table, lue, jamais recopiée. */
const put4 = (o, letters, hex) => { const r = ramp(hex); letters.split("").forEach((l, i) => { o[l] = r[i]; }); };
export function persoHdCostume(cos, args) {
  const a = { ...args }, x = {};
  if (!cos) return { args: a, extra: x };
  // Lot B : sous une robe, un tailleur ou un tutu, le haut prend la couleur de la tenue — Scale2x arrondit les coins de l'épaule, et la
  // chemise d'origine y pointerait (sous la cape et le poncho, elle se voit exprès : l'ouverture, le col).
  const wo = cos.wd && cos.wd.outfit;
  if (wo === "gown" || wo === "suit" || wo === "tutu") a.top = wardrobePal("outfit", wo, cos.wd.tint, "#000000", "#000000").m;
  if (cos.cap) put4(x, "1234", "#2f6f4a");
  if (cos.overalls) { put4(x, "5678", "#3f5a8c"); a.pants = "#3f5a8c"; }
  if (cos.plaid) { a.top = "#a3261f"; x["9"] = "#241a14"; x.j = "#4a3020"; }
  if (cos.bee) { a.top = "#f2f0e6"; a.pants = "#f2f0e6"; a.shoes = "#4a3a26"; put4(x, "xyz0", "#e8e4d2"); x.v = "#2e2e30"; x.w = "#4a4a4e"; x.g = "#e4dcc0"; x.f = "#c4bc9e"; }
  if (cos.cheese) { put4(x, "1234", "#f4efe2"); put4(x, "5678", "#2f3a56"); }
  if (cos.sugar) { a.skin = "#8a5a34"; a.hair = "#181818"; a.top = "#c9302c"; a.pants = "#1c1c1c"; }
  if (cos.look === "carla") {
    a.top = "#22222c"; a.shoes = "#0e0e12"; put4(x, "1234", "#e6b32b"); put4(x, "5678", "#b4232c");
    Object.assign(x, { e: "#17171c", f: "#2e2e38", r: "#a8202c", t: "#c8404c", n: "#6e5210" });
  }
  if (cos.look === "leo") {
    a.top = "#efe9dc"; a.pants = "#3a3542"; a.shoes = "#241c16"; put4(x, "1234", "#6a6a76"); put4(x, "5678", "#e3d8c0"); put4(x, "wxyz", "#c6d3dd");
    Object.assign(x, { o: "#7e2030", q: "#5a1622", r: "#b4232c" });
  }
  if (cos.look === "froufrou") {
    a.top = "#d12a7c"; a.pants = "#2a2532"; a.shoes = "#120f16"; a.hair = "#c9ccd6"; put4(x, "1234", "#d12a7c");
    Object.assign(x, { e: "#2a1824", f: "#4a2c42", y: "#dca650", z: "#b07a30", n: "#3a2414", g: "#f0cf6a", j: "#a8772a", o: "#8a2a6a", l: "#f6e2ec" });
  }
  if (cos.look === "vandal") { a.top = "#242024"; a.pants = "#242024"; a.shoes = "#100f11"; put4(x, "1234", "#141215"); x.g = "#100f11"; }
  const w = cos.worker;
  if (w) {
    const welder = w.role === "soudeur";
    a.top = welder ? "#2c2e36" : w.sleeves; a.pants = welder ? "#3a3632" : w.pants; a.shoes = "#2a231d";
    Object.assign(x, { 1: w.vest.hi, 2: w.vest.main, 3: w.vest.lo, 4: rgbHex(mix(hexRgb(w.vest.lo), COOL, 0.4)) });
    Object.assign(x, { 5: w.hat.hi, 6: w.hat.main, 7: w.hat.lo, 8: rgbHex(mix(hexRgb(w.hat.lo), COOL, 0.4)), u: "#dfe4ea", t: "#8a7a62" });
    if (welder) Object.assign(x, { a: "#6b4a2e", d: "#8a6440", e: "#4a3220", f: "#7c5636", v: "#2a2c33", w: "#454a55", g: "#8a6a42" });
  }
  return { args: a, extra: x };
}
function costumeArms(cos) {
  if (!cos) return null;
  if (cos.bee) return { sl: ["D", "C", "c"], cuff: "c", hand: ["g", "f"] };
  if (cos.look === "carla" || cos.look === "froufrou") return { sl: ["1", "2", "3"], cuff: cos.look === "froufrou" ? "e" : "3" };
  if (cos.look === "leo") return { sl: ["D", "C", "c"], cuff: "U" };
  if (cos.look === "vandal") return { sl: ["D", "C", "c"], cuff: "c", hand: ["g", "g"] };
  if (cos.worker) return { sl: ["D", "C", "c"], cuff: "c", hand: cos.worker.role === "soudeur" ? ["g", "g"] : ["S", "s"] };
  if (cos.plaid || cos.sugar) return { sl: ["D", "C", "c"], cuff: "c" };
  return null;
}
// La chemise à carreaux de Tristan : un tartan fin sur tout ce qui est chemise (torse et manches), traits sombres tous les 6 px.
function plaidOver(d) {
  for (let y = 20; y <= 30; y++) for (let x = 0; x < PERSO_HD_W; x++) {
    if (!"CDcF".includes(d.get(x, y))) continue;
    if (x % 6 === 0 || y === 24 || y === 29) d.set(x, y, "9"); else if (x % 6 === 3 || y === 21 || y === 27) d.set(x, y, "j");
  }
}
/* Ce qui se porte sur le corps, sous les bras de face (sous le bras de profil : `mid` de `bodySide`). */
function costumeBody(d, low, dir, gender, cos, st) {
  const front = dir === 0, back = dir === 1, side = dir === 2;
  if (cos.overalls) {
    d.rect(10, 30, 12, 2, "6");
    if (side) { d.rect(16, 22, 5, 9, "6"); d.rect(16, 22, 5, 1, "5"); d.rect(15, 20, 2, 3, "6"); d.set(16, 22, "U"); }
    else if (back) { d.rect(11, 20, 2, 10, "6"); d.rect(19, 20, 2, 10, "7"); d.rect(12, 28, 8, 3, "6"); }
    else { d.rect(12, 22, 8, 9, "6"); d.rect(12, 22, 8, 1, "5"); d.rect(19, 23, 1, 8, "7"); d.pat(14, 25, ["7777", "7..7"]); d.rect(11, 20, 2, 3, "6"); d.rect(19, 20, 2, 3, "7"); d.set(12, 22, "U"); d.set(19, 22, "U"); }
  }
  if (cos.cheese) {
    if (side) { d.rect(17, 20, 4, 12, "2"); d.rect(17, 20, 4, 1, "1"); d.rect(18, 32, 5, 6, "2"); d.rect(18, 37, 5, 1, "3"); }
    else if (back) { d.rect(13, 20, 2, 6, "3"); d.rect(17, 20, 2, 6, "3"); d.pat(12, 25, ["22..22", "122221", "22..22", ".3..3."]); }
    else { d.rect(12, 20, 8, 12, "2"); d.rect(12, 20, 8, 1, "1"); d.rect(19, 21, 1, 11, "3"); d.rect(10, 32, 12, 6, "2"); d.rect(10, 32, 1, 5, "1"); d.rect(10, 37, 12, 1, "3"); d.pat(13, 33, ["333333", "3....3"]); }
  }
  if (cos.look === "carla") {
    if (side) { d.rect(9, 20, 13, 16, "2"); d.rect(9, 20, 13, 1, "1"); d.rect(9, 21, 2, 14, "1"); d.rect(19, 21, 3, 14, "3"); d.rect(20, 22, 2, 6, "e"); d.rect(9, 30, 13, 2, "n"); d.rect(9, 35, 13, 1, "3"); }
    else {
      d.rect(8, 20, 16, 16, "2"); d.rect(8, 20, 16, 1, "1"); d.rect(9, 21, 1, 14, "1"); d.rect(22, 21, 2, 14, "3"); d.rect(8, 35, 16, 1, "3"); d.rect(8, 30, 16, 2, "n");
      if (front) { d.rect(14, 20, 4, 8, "e"); d.rect(14, 20, 4, 1, "f"); d.rect(13, 21, 1, 7, "3"); d.rect(18, 21, 1, 7, "3"); }
    }
  }
  if (cos.look === "leo") {
    if (side) { d.rect(9, 22, 11, 12, "2"); d.rect(9, 22, 11, 1, "1"); d.rect(9, 32, 11, 2, "3"); d.pat(20, 20, ["oq", "oo"]); }
    else if (back) { d.rect(8, 22, 16, 12, "3"); d.rect(8, 22, 16, 1, "2"); d.rect(15, 24, 2, 9, "4"); }
    else {
      d.rect(8, 22, 6, 12, "2"); d.rect(18, 22, 6, 12, "3"); d.rect(8, 22, 6, 1, "1"); d.rect(18, 22, 6, 1, "2"); d.rect(8, 32, 16, 2, "3");
      d.rect(14, 32, 4, 2, "C"); d.set(13, 25, "4"); d.set(13, 28, "4");
      d.pat(12, 20, ["oo.qq.oo", "oooqqooo", "oo.qq.oo"]);
    }
  }
  if (cos.look === "froufrou") {
    if (side) { d.rect(8, 20, 15, 14, "2"); d.rect(8, 20, 15, 1, "1"); d.rect(8, 21, 2, 12, "1"); d.rect(20, 21, 3, 12, "3"); d.rect(8, 33, 15, 1, "3"); d.pat(19, 18, ["yy", "ny", "yz", "e.", "e."]); }
    else {
      d.rect(6, 20, 20, 10, "2"); d.rect(8, 30, 16, 4, "2"); d.rect(6, 20, 20, 1, "1"); d.rect(6, 21, 2, 9, "1"); d.rect(24, 21, 2, 9, "3"); d.rect(8, 33, 16, 1, "3");
      if (back) { d.rect(10, 20, 12, 2, "e"); d.rect(13, 18, 6, 2, "y"); d.set(15, 18, "n"); }
      else {
        // les revers de satin noir, la lavallière léopard bouffante, la broche d'or
        d.pat(10, 20, ["e..........e", "ee........ee", ".ee......ee.", "..ee....ee..", "...ee..ee...", "....eeee...."]);
        d.pat(12, 20, ["yynyyn", "ynyyzy", "zyynyy", ".yzyn.", "..yy..", "...g.."]);
        d.pat(15, 27, ["gj"]); d.rect(16, 29, 1, 3, "g");
      }
    }
  }
  const w = cos.worker;
  if (w) {
    const welder = w.role === "soudeur";
    if (welder) {
      if (back) { d.rect(12, 20, 2, 12, "a"); d.rect(18, 20, 2, 12, "a"); }
      else if (side) { d.rect(18, 22, 4, 18, "a"); d.rect(18, 22, 4, 1, "d"); d.rect(18, 39, 4, 1, "e"); }
      else { d.rect(10, 22, 12, 18, "a"); d.rect(10, 22, 12, 1, "d"); d.rect(10, 39, 12, 1, "e"); d.rect(10, 23, 1, 16, "f"); }
    } else {
      const x0 = side ? 9 : 8, ww = side ? 13 : 16;
      d.rect(x0, 20, ww, 12, "2"); d.rect(x0, 20, ww, 1, "1"); d.rect(x0, 24, ww, 2, "u"); d.rect(x0, 28, ww, 2, "u"); d.rect(x0, 30, ww, 2, "3");
      if (front) { d.rect(14, 20, 4, 4, "C"); d.rect(15, 24, 1, 8, "3"); }
      if (back && w.role === "chef") d.rect(12, 21, 8, 2, "3");
      if (side) d.rect(9, 20, 1, 12, "3");
    }
    if (front) { low.rect(10, 36, 6, 2, "O"); low.rect(16, 36, 6, 2, "O"); }   // les genouillères
    for (const x of [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]) if (!back && low.get(x, 44) === "B") low.set(x, 44, "t");   // le bout renforcé
  }
}
/* Ce qui se porte sur la tête et devant le corps : peint en DERNIER, après les cheveux (les cartons de Léo passent devant sa joue,
   comme dans le 16 × 24). */
function costumeHead(d, dir, gender, cos) {
  const back = dir === 1, side = dir === 2;
  if (cos.cap) {
    d.rect(9, 0, 14, 1, "1"); d.rect(7, 1, 18, 1, "1"); d.rect(6, 2, 20, 2, "2"); d.rect(6, 4, 20, 2, "3"); d.rect(15, 0, 2, 1, "3"); d.rect(24, 1, 2, 4, "3");
    if (dir === 0) { d.rect(6, 6, 20, 1, "3"); d.rect(6, 7, 8, 2, "4"); d.rect(7, 7, 5, 1, "3"); }
    else if (side) { d.rect(6, 6, 20, 1, "3"); d.rect(20, 7, 8, 2, "4"); d.rect(21, 7, 5, 1, "3"); }
  }
  if (cos.bee) {
    d.rect(8, 16, 16, 6, "C"); d.rect(8, 16, 16, 1, "D"); d.rect(22, 17, 2, 5, "c");
    d.rect(8, 6, 16, 11, "v");
    for (let y = 7; y <= 15; y += 2) for (let x = 9; x <= 22; x += 2) d.set(x, y, "w");
    d.rect(9, 8, 14, 1, "w"); d.rect(9, 12, 14, 1, "w");
    d.rect(4, 2, 24, 4, "y"); d.rect(4, 5, 24, 1, "0"); d.rect(6, 0, 20, 2, "z"); d.rect(10, 0, 12, 1, "x"); d.rect(8, 4, 16, 1, "z");
  }
  const beret = () => {
    d.rect(6, 2, 18, 6, "6"); d.rect(7, 2, 16, 1, "5"); d.rect(6, 7, 18, 1, "7"); d.set(6, 2, "."); d.set(23, 2, "."); d.rect(21, 3, 2, 4, "7");
    if (!back) d.rect(22, 0, 4, 2, "7");
    d.rect(14, 0, 2, 2, "7");
  };
  if (cos.cheese || cos.look === "carla") beret();
  if (cos.look === "leo") {
    d.pat(8, 0, ["HH......HH....HH", ".HH......HH...hH"]);
    if (back) { d.rect(4, 24, 4, 10, "6"); d.rect(24, 24, 4, 10, "7"); d.rect(2, 12, 4, 12, "x"); d.rect(2, 12, 4, 1, "w"); }
    else {
      const bx = side ? 10 : 4, tx = side ? 18 : 2, ty = side ? 14 : 12;
      d.rect(bx, 24, 24, 10, "6"); d.rect(bx, 24, 24, 1, "5"); d.rect(bx, 24, 1, 10, "5"); d.rect(bx, 33, 24, 1, "7"); d.rect(bx + 23, 25, 1, 9, "7"); d.rect(bx, 28, 24, 2, "r");
      d.rect(tx, ty, 12, 12, "x"); d.rect(tx, ty, 12, 1, "w"); d.rect(tx, ty, 1, 12, "w"); d.rect(tx, ty + 11, 12, 1, "y"); d.rect(tx + 11, ty + 1, 1, 11, "y"); d.rect(tx + 5, ty, 2, 12, "r");
      d.pat(tx + 3, ty - 2, ["rr..rr", ".rrrr."]);
      d.rect(bx, 34, 2, 2, "S"); d.rect(bx + 22, 34, 2, 2, "S");
    }
  }
  if (cos.look === "froufrou") {
    d.pat(10, 0, ["...HHHHHJJJ.", ".HHHJJJJHHHHH"]);
    /* ⚠️ Ses lunettes : au 16 × 24, deux verres magenta de 2 × 2 POSÉS SUR les yeux — Guillaume : « ses yeux semblent rouges,
       c'est effrayant ». Ici des montures plus larges que l'œil et un verre CLAIR autour de lui : on lit des lunettes, et un
       regard derrière. */
    const lens = (x0, y0, w) => {
      for (let y = y0 + 1; y < y0 + 7; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) if (!"EIW".includes(d.get(x, y))) d.set(x, y, "l");
      d.pat(x0, y0, ["." + "o".repeat(w - 2) + ".", ...Array(6).fill("o" + ".".repeat(w - 2) + "o"), "." + "o".repeat(w - 2) + "."]);
    };
    if (dir === 0) { lens(10, 8, 6); lens(16, 8, 6); }
    else if (side) { lens(18, 8, 5); d.rect(14, 10, 4, 1, "o"); }
  }
  if (cos.look === "vandal") {
    // La capuche UNIE de son 16 × 24 : aucun creux, aucun trait — rien qui ressemble à un visage (premier jet : un creux cerné
    // faisait un écran de télévision).
    d.rect(6, 2, 20, 18, "2"); d.rect(7, 2, 18, 1, "1"); d.rect(6, 3, 2, 16, "1"); d.rect(24, 3, 2, 16, "3"); d.set(6, 2, "."); d.set(25, 2, ".");
    d.rect(8, 18, 16, 2, "c");
  }
  const w = cos.worker;
  if (w) {
    d.rect(8, 0, 16, 2, "5"); d.rect(6, 2, 20, 4, "6"); d.rect(14, 0, 4, 6, "5"); d.rect(24, 2, 2, 4, "7"); d.rect(4, 6, 24, 2, "7");
    if (dir === 0) d.rect(8, 8, 16, 1, "8");
    if (side) d.rect(24, 6, 4, 2, "7");
    if (w.role === "soudeur") { d.rect(8, 0, 16, 4, "v"); d.rect(10, 0, 12, 2, "w"); }
  }
}
function faceStyleOf(cos) {
  if (!cos || !cos.npc) return "joueur";   // un joueur habillé chez Garfield ou coiffé au salon garde son visage
  if (cos.look === "carla") return "carla";
  if (cos.look === "leo") return "sobre";
  if (cos.look === "froufrou") return "joueur";
  return "pnj";
}

/* ─── LOT B : LA MAISON GARFIELD ET LE SALON EN 32 × 48 (2026-10-23) ──────
   Guillaume : « strictement fidèles ». Les vêtements (`garderobeArt.js`) et les coupes (`coiffureArt.js`) sont DÉJÀ des grilles de
   lettres de ton, dessinées à la main sur le 16 × 24 ; on ne les recopie pas, on les AGRANDIT : Scale2x (chaque pixel devient quatre,
   et un coin ne s'arrondit que là où deux voisins le disent — les diagonales deviennent des pentes, les aplats restent des aplats).
   Une seule source : changer une coupe là-bas la change ici. Le 32 × 48 y ajoute ce que le 16 × 24 ne pouvait pas porter (mèches,
   tresses, plis d'un pixel : `HAIR_DETAIL`, `foldsHD`) et fait suivre le pas AU DEMI-PIXEL (le pas du 16 × 24 vaut deux pixels ici).
   `cos` d'un joueur : { cut, beard, wd: { hat, scarf, outfit, tint } } (identifiants du catalogue, `tint` en hex) — jamais `npc`. */
/* 2026-10-23, retour de Guillaume sur la première planche : « moins de rondeur systématique, parfois plus d'angles ». Scale2x
   classique coupe le coin de TOUT bloc — un bord de frange, une pointe de carré, un bord de chapeau, une épaule de tailleur
   devenaient des galets. `crisp` (le défaut) ne coupe un coin que là où le bord est VRAIMENT en biais : si les deux bords qui s'y
   rencontrent continuent tout droit (le voisin en diagonale de part et d'autre est de l'autre côté), c'est un angle, il reste droit.
   `crisp = false` : l'arrondi d'origine, gardé pour les matières molles (boucles, macarons, plumes, fourrure, béret). */
function scale2x(g, crisp = true) {
  const H = g.length, W = g[0].length, o = Array.from({ length: H * 2 }, () => Array(W * 2).fill(null));
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? null : g[y][x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), Cc = at(x - 1, y), D = at(x, y + 1);
    const ul = at(x - 1, y - 1), ur = at(x + 1, y - 1), dl = at(x - 1, y + 1), dr = at(x + 1, y + 1);
    o[2 * y][2 * x] = Cc === A && Cc !== D && A !== B && !(crisp && dl === Cc && ur === A) ? A : P;
    o[2 * y][2 * x + 1] = A === B && A !== Cc && B !== D && !(crisp && dr === B && ul === A) ? B : P;
    o[2 * y + 1][2 * x] = D === Cc && D !== B && Cc !== A && !(crisp && ul === Cc && dr === D) ? Cc : P;
    o[2 * y + 1][2 * x + 1] = B === D && B !== A && D !== Cc && !(crisp && ur === B && dl === D) ? D : P;
  }
  return o;
}
// Les matières molles gardent l'arrondi de Scale2x ; tout le reste a ses angles (voir `scale2x`).
const SOFT = new Set(["curly", "macarons", "feather", "fur", "beret"]);
function rowsGrid(rows) {
  const g = Array.from({ length: 24 }, () => Array(16).fill(null));
  for (const [y, r] of rows) for (let x = 0; x < 16 && x < r.length; x++) if (r[x] !== ".") g[y][x] = r[x];
  return g;
}
// Pose une grille 32 × 48 : `dx` décale les rangées à partir de `swayY` (le pas), `only` filtre les cellules, `map` les traduit.
function blitHDGrid(d, G, { dx = 0, swayY = 99, minY = 0, maxY = 99, map = null, only = null } = {}) {
  for (let y = minY; y < Math.min(G.length, maxY); y++) for (let x = 0; x < G[y].length; x++) {
    const c = G[y][x];
    if (!c) continue;
    const v = map ? map(c) : c;
    if (!v || (only && !only(d.get(x + (y >= swayY ? dx : 0), y)))) continue;
    d.set(x + (y >= swayY ? dx : 0), y, v);
  }
}
const isHair = (c) => "JHhG".includes(c);
// L'ombre que posent les cheveux sur la peau, juste dessous (comme `hair`).
function shadeUnderHair(d) {
  for (let y = 5; y < 24; y++) for (let x = 8; x < 24; x++) if ("ST".includes(d.get(x, y)) && isHair(d.get(x, y - 1))) d.set(x, y, "s");
}

/* LES COUPES. Les tons du salon (o d m l h) passent sur la rampe des cheveux (G h H J) : la lumière et la base se fondent en H, le
   reflet devient J, l'ombre h, le creux G — c'est la lecture du 32 × 48 par défaut (base pleine, reflet en couronne, ombre à droite). */
const CUT_TONE = { h: "J", l: "H", m: "H", d: "h", o: "G", r: "K", R: "k" };
/* LES MÈCHES DU 32 × 48 (2026-10-23, à sa demande : « pose les détails proposés »). Le 16 × 24 n'avait pas la place d'une mèche : ses
   coupes étaient des aplats à reflet, quand la coupe d'origine du 32 × 48 en a. Elles se posent SUR la coupe agrandie et ne touchent
   QUE des cheveux (jamais la peau, jamais le vide : la silhouette du salon reste la sienne, à l'exception des pointes qu'on entaille).
   Un détail, par coupe et par direction :
   - `s` : [x, y0, y1, ton] un trait vertical d'un pixel ; `l` : [x0, y0, x1, y1, ton] un trait en biais (la mèche suit la coiffure) ;
   - `m` : [x, y, rangées] des marques posées une à une ;
   - `st` : [y0, y1] un grain de cheveux ras (le rasé) ; `curls` : chaque reflet de boucle pose son ombre juste dessous.
   Le ton : une lettre de la rampe (J H h G), « - » un cran plus sombre que ce qui est dessous, « + » un cran plus clair, « _ » entaille
   (la pointe : Guillaume, « moins de rondeur systématique, parfois plus d'angles » — une pointe nette plutôt qu'un bout rond). */
const DARKER_HAIR = { J: "H", H: "h", h: "G", G: "G" }, LIGHTER_HAIR = { G: "h", h: "H", H: "J", J: "J" };
function hairDetail(d, det) {
  const put = (x, y, c) => {
    const cur = d.get(x, y);
    if (!isHair(cur) || c === ".") return;
    d.set(x, y, c === "_" ? "." : c === "-" ? DARKER_HAIR[cur] : c === "+" ? LIGHTER_HAIR[cur] : c);
  };
  // « ~ » : une mèche en relief — le creux, et l'arête claire du côté de la lumière (à gauche d'un trait raide, au-dessus d'un trait
  // couché), comme les plis du drapé : un trait sombre seul sur un aplat clair se lit comme une fissure.
  const stroke = (x, y, c, steep) => {
    if (c !== "~") { put(x, y, c); return; }
    if (!isHair(d.get(x, y))) return;
    put(x, y, "-");
    if (steep) put(x - 1, y, "+"); else put(x, y - 1, "+");
  };
  for (const [x, y0, y1, c] of det.s || []) for (let y = y0; y <= y1; y++) stroke(x, y, c, true);
  for (const [x0, y0, x1, y1, c] of det.l || []) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), steep = Math.abs(y1 - y0) >= Math.abs(x1 - x0);
    for (let i = 0; i <= n; i++) stroke(Math.round(x0 + ((x1 - x0) * i) / (n || 1)), Math.round(y0 + ((y1 - y0) * i) / (n || 1)), c, steep);
  }
  // `cg` : [x0, y0, x1, y1] des boucles semées en quinconce (un reflet, son ombre à droite et dessous) — le dos et le profil des boucles
  for (const [x0, y0, x1, y1] of det.cg || []) for (let y = y0, r = 0; y <= y1; y += 3, r++) for (let x = x0 + (r % 2) * 2; x <= x1; x += 4) {
    if (d.get(x, y) !== "H" || !isHair(d.get(x + 1, y + 1))) continue;
    put(x, y, "+"); put(x + 1, y, "-"); put(x, y + 1, "-");
  }
  for (const [x, y, rows] of det.m || []) rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) put(x + i, y + j, r[i]); });
  if (det.st) for (let y = det.st[0]; y <= det.st[1]; y++) for (let x = 0; x < PERSO_HD_W; x++) if (d.get(x, y) === "H" && (x * 5 + y * 3) % 7 === 0) d.set(x, y, "h");
  if (det.curls) for (let y = PERSO_HD_H - 2; y >= 0; y--) for (let x = 0; x < PERSO_HD_W; x++) if (d.get(x, y) === "J" && d.get(x, y + 1) === "H") d.set(x, y + 1, "h");
}
const HAIR_DETAIL = {
  bob: {
    // le carré : rideaux de côté (un reflet sur le bord éclairé, l'ombre contre la joue), frange en pointes, bas coupé net
    0: { s: [[7, 9, 15, "J"], [9, 8, 16, "-"], [23, 9, 16, "-"], [24, 11, 15, "+"]],
         m: [[8, 4, ["....H...h..h..h"]], [8, 5, ["..h...h...h..h."]], [8, 6, [".h...hh...h...h"]], [8, 7, ["H_h-H_-h-_h-H_"]]] },
    1: { s: [[8, 12, 15, "J"], [10, 5, 11, "-"], [11, 12, 16, "-"], [13, 7, 15, "-"], [15, 4, 10, "-"], [16, 11, 16, "-"], [18, 6, 14, "-"],
             [20, 9, 16, "-"], [21, 4, 8, "-"], [23, 7, 15, "-"]],
         m: [[6, 17, ["..._....._...._..."]]] },
    2: { s: [[7, 12, 15, "J"], [9, 13, 16, "-"], [11, 9, 15, "-"], [13, 7, 13, "-"], [14, 12, 16, "-"], [17, 3, 6, "-"], [20, 2, 6, "-"]],
         m: [[18, 7, ["._.._..."]], [6, 17, ["..._..._"]]] },
  },
  ponytail: {
    // tirés en arrière : de courtes mèches vers le sommet, puis vers le chouchou ; la queue en fils, la pointe nette
    0: { s: [[11, 3, 5, "-"], [15, 2, 5, "-"], [19, 3, 5, "-"], [27, 7, 13, "-"]], m: [[26, 15, ["_"]], [6, 9, ["_"]]] },
    1: { l: [[10, 4, 13, 8, "~"], [19, 3, 17, 7, "~"], [23, 6, 19, 9, "~"], [13, 11, 10, 15, "~"], [18, 11, 21, 15, "~"]],
         s: [[15, 18, 23, "-"], [14, 19, 22, "+"]], m: [[14, 25, ["_"]]] },
    2: { l: [[19, 4, 9, 6, "~"], [17, 8, 11, 10, "~"], [15, 12, 11, 13, "~"]],
         s: [[3, 10, 16, "-"], [2, 11, 14, "+"]], m: [[4, 19, ["_"]], [2, 16, ["_"]]] },
  },
  bun: {
    // le chignon : une torsade en spirale ; dessous, les cheveux remontent vers lui
    0: { s: [[11, 3, 5, "-"], [16, 2, 5, "-"], [20, 3, 5, "-"]], m: [[13, 0, ["..-..", "-...-"]]] },
    1: { l: [[9, 13, 11, 10, "~"], [22, 12, 20, 10, "~"]] },   // de dos, la torsade du 16 × 24 suffit (une spirale y lisait un « 2 »)
    2: { m: [[1, 3, ["..--.", ".-..-", "-.-..", "..-.."]]], l: [[19, 4, 9, 6, "~"], [14, 11, 10, 13, "~"]] },
  },
  buzz: { 0: { st: [2, 7] }, 1: { st: [2, 13] }, 2: { st: [2, 13] } },
  curly: { 0: { curls: true }, 1: { curls: true, cg: [[7, 6, 22, 11]] }, 2: { curls: true, cg: [[4, 6, 14, 11]] } },
  side: {
    // la raie de côté : le grand pan balayé vers la droite en mèches obliques, sa pointe sur le front
    0: { l: [[14, 2, 19, 7, "-"], [17, 2, 23, 7, "-"], [20, 2, 25, 6, "-"], [9, 3, 7, 7, "-"]], m: [[19, 7, ["._..._.."]]] },
    1: { s: [[9, 4, 9, "-"], [12, 6, 10, "-"], [15, 3, 9, "-"], [18, 5, 10, "-"], [21, 4, 9, "-"], [23, 6, 10, "-"]], m: [[8, 11, ["..._...._..."]]] },
    2: { l: [[20, 3, 13, 5, "-"], [18, 6, 12, 8, "-"], [12, 6, 9, 10, "-"]], m: [[6, 11, [".._..._"]]] },
  },
  macarons: {
    // les macarons géants : une spirale dans chacun ; la raie au milieu de dos
    0: { m: [[1, 8, ["..--.", ".-..-", "-.-.-", "-..-.", ".-..."]], [25, 8, ["..--.", ".-..-", "-.-.-", "-..-.", ".-..."]]] },
    1: { m: [[1, 8, ["..--.", ".-..-", "-.-.-", "-..-.", ".-..."]], [25, 8, ["..--.", ".-..-", "-.-.-", "-..-.", ".-..."]]] },
    2: { m: [[7, 8, ["...--..", "..-..-.", ".-.--.-", ".-.-..-", "..-..-.", "...--.."]]] },
  },
  braids: {
    // les tresses : une raie au milieu, et deux pans qui descendent vers chaque tresse
    0: { s: [[15, 2, 4, "-"], [8, 7, 15, "-"], [23, 7, 15, "-"], [7, 8, 14, "+"]], m: [[15, 5, ["-"]]] },
    1: { s: [[15, 2, 13, "-"]], l: [[9, 5, 11, 16, "-"], [12, 3, 13, 14, "-"], [18, 3, 18, 14, "-"], [22, 5, 20, 16, "-"]] },
    2: { l: [[19, 4, 10, 8, "-"], [16, 7, 10, 12, "-"], [13, 9, 9, 14, "-"]] },
  },
  mullet: {
    // le mulet : court devant (quelques épis), long derrière en mèches de longueurs inégales, bouts en pointes
    0: { s: [[11, 3, 5, "-"], [15, 2, 5, "-"], [19, 3, 5, "-"], [7, 16, 22, "+"]], m: [[8, 7, ["._."]], [24, 8, ["_"]]] },
    1: { s: [[9, 14, 23, "-"], [11, 6, 13, "-"], [13, 15, 23, "-"], [15, 8, 17, "-"], [17, 16, 23, "-"], [19, 5, 14, "-"], [21, 13, 23, "-"],
             [23, 8, 20, "-"], [7, 18, 22, "+"]] },
    2: { l: [[17, 5, 11, 13, "-"], [14, 6, 7, 17, "-"], [12, 12, 5, 21, "-"], [10, 9, 6, 15, "+"]], m: [[2, 23, ["_"]]] },
  },
};
const CUT_CACHE = new Map();
function cutHD(id, dir) {
  const k = id + dir;
  if (CUT_CACHE.has(k)) return CUT_CACHE.get(k);
  const src = hairCutRows(id, dir);
  let G = null;
  if (src) {
    G = scale2x(rowsGrid(src.rows), !SOFT.has(id)).map((r) => r.map((c) => (c ? CUT_TONE[c] || null : null)));
    const det = HAIR_DETAIL[id] && HAIR_DETAIL[id][dir];
    if (det) {
      const d = mk(G.map((r) => r.map((c) => c || ".")));
      hairDetail(d, det);
      G = G.map((r, y) => r.map((_, x) => { const c = d.get(x, y); return c === "." ? null : c; }));
    }
  }
  CUT_CACHE.set(k, G);
  return G;
}
// Une tresse du 32 × 48 : quatre pixels de large, un croisement tous les trois pixels (le 16 × 24 n'en avait que la trace), le ruban, la houppe.
const BRAID = [["JHh.", "HHhh", ".hhG"], [".JHh", "HHhh", "hhG."]];
function braidHD(d, bx, y0, swayY, st) {
  for (let y = y0; y <= 45; y++) {
    const x = bx + (y >= swayY ? st : 0), i = y - y0;
    if (y >= 38 && y <= 39) { d.pat(x, y, [y === 38 ? "KLLK" : "kKKk"]); continue; }
    if (y >= 40) { d.pat(x - (y >= 42 ? 1 : 0), y, [["HHh.", "JHhh", "HHhh.", "H.h.h", "h...h", "....."][Math.min(5, y - 40)]]); continue; }
    d.pat(x, y, [BRAID[Math.floor(i / 3) % 2][i % 3]]);
  }
}
function paintCut(d, id, dir, st, minY = 0) {
  const G = cutHD(id, dir), src = hairCutRows(id, dir);
  if (!G) return;
  const swayY = src.sway != null ? src.sway * 2 : 99, dx = dir === 2 ? -st : st;
  blitHDGrid(d, G, { dx, swayY, minY });
  for (const bx of src.braid || []) braidHD(d, bx * 2, dir === 0 ? 16 : dir === 1 ? 14 : 12, swayY, dx);
  if (!minY) shadeUnderHair(d);
}
// LES BARBES : un cran plus sombres que les cheveux, comme au salon ; elles ne recouvrent ni les yeux ni la bouche (ni ses expressions).
const BEARD_TONE = { l: "H", m: "h", d: "G", o: "G" };
const BEARD_CACHE = new Map();
function paintBeardHD(d, id, dir) {
  const k = id + dir;
  if (!BEARD_CACHE.has(k)) { const r = beardRows(id, dir); BEARD_CACHE.set(k, r ? scale2x(rowsGrid(r)).map((row) => row.map((c) => (c ? BEARD_TONE[c] : null))) : null); }
  const G = BEARD_CACHE.get(k);
  if (G) blitHDGrid(d, G, { only: (c) => c === "." || "STsZR".includes(c) || isHair(c) || c.length > 1 });
}

/* LES VÊTEMENTS. La grille du 16 × 24 à l'arrêt, agrandie ; les lettres se résolvent par la palette de l'article (`wardrobePal`, la même
   que le 16 × 24), sauf la peau (`s`, `S`) qui prend la rampe de peau du 32 × 48. L'ourlet qui touchait le bas du cadre (la robe) se
   recolle sur la dernière rangée du 32 × 48 (45 : les deux du dessous sont l'ombre au sol). */
const WEAR_CACHE = new Map();
/* LES PLIS D'UN PIXEL (2026-10-23, sa demande). Le drapé du 16 × 24 trace un pli par un creux d'un pixel et son arête claire à gauche ;
   agrandis, ils faisaient deux pixels de creux et deux d'arête — des bandes. Ici la couche s'agrandit SANS ses plis (`wardrobeLayer`
   les recueille), puis chaque pli se retrace en 32 × 48 : un pixel de creux, un d'arête, le long du même segment. Robe, cape, poncho, jupe
   du tailleur : tous les plis du drapé. */
const WEAR_DARKER = { h: "l", l: "m", m: "d", d: "o", o: "o" }, WEAR_LIGHTER = { o: "d", d: "m", m: "l", l: "h", h: "h" };
function foldsHD(G, folds) {
  for (const [y0, y1, xa, xb] of folds) {
    const Y0 = 2 * y0, Y1 = 2 * y1 + 1, X0 = 2 * xa + 1, X1 = 2 * xb + 1;
    for (let y = Y0; y <= Y1 && y < G.length; y++) {
      const x = Math.round(X0 + ((X1 - X0) * (y - Y0)) / (Y1 - Y0 || 1)), r = G[y];
      if (!WEAR_DARKER[r[x]]) continue;
      r[x] = WEAR_DARKER[r[x]];
      if (WEAR_LIGHTER[r[x - 1]] && r[x - 2]) r[x - 1] = WEAR_LIGHTER[r[x - 1]];   // l'arête, sauf au bord (il est déjà clair)
    }
  }
}
/* ⚠️ LA CAPELINE, DESSINÉE EN 32 × 48 (2026-10-24, Guillaume en jeu : « le chapeau de paille est mou »). Agrandi du 16 × 24, son bord
   descendait en pente de la calotte jusqu'à deux pointes qui retombaient (rangée 5 du 16 × 24) : un abat-jour qui fond, une paille
   qui ne tient pas. Ici une calotte droite aux coins arrondis, tressée en bandes, le ruban noué ; un grand bord PLAT vu d'en haut
   comme tout le monde du jeu — une ellipse dont on voit la moitié du fond de part et d'autre de la calotte —, son avant pris par la
   lumière et son épaisseur dessous. Le bord avant s'arrête à la rangée 9 : les yeux commencent à la 10 (`faceFront`).
   Lettres de `wardrobePal` : la paille h l m d o (du clair au sombre), le ruban r R (sa teinte suit « Couleurs »). */
const CAPE_BRIM = [[4, 6, 25], [5, 2, 29], [6, 0, 31], [7, 0, 31]];
function capelineHD(dir) {
  const G = Array.from({ length: PERSO_HD_H }, () => Array(PERSO_HD_W).fill(null));
  const put = (x, y, c) => { if (x >= 0 && x < PERSO_HD_W) G[y][x] = c; };
  const DARKER = { h: "l", l: "m", m: "d", d: "o", o: "o" };
  // le bord : clair à gauche, ombre à droite ; la tresse en rayons (un brin plus sombre tous les 4 px, qui tourne autour de la calotte)
  for (const [y, x0, x1] of CAPE_BRIM) for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / (x1 - x0);
    let c = t < 0.2 ? "h" : t < 0.68 ? "l" : t < 0.88 ? "m" : "d";
    if (y >= 5 && (x + (x < 16 ? -y : y)) % 4 === 0) c = DARKER[c];
    put(x, y, c);
  }
  for (let x = 2; x <= 29; x++) put(x, 8, x < 8 ? "h" : x < 21 ? "l" : x < 26 ? "m" : "d");   // l'avant du bord, dans la lumière
  for (let x = 5; x <= 26; x++) put(x, 9, x < 22 ? "d" : "o");                              // son épaisseur, dessous
  put(0, 7, "d"); put(31, 7, "o"); put(31, 6, "d");                                         // les bouts du bord, en ombre
  for (const [x, y] of [[23, 4], [24, 4], [25, 4], [23, 5], [24, 5]]) put(x, y, "d");       // l'ombre de la calotte sur le bord du fond
  // la calotte : plus étroite que la tête (le bord la porte), les coins du haut arrondis, une bande de tresse sur deux plus sombre ;
  // son flanc droit dans l'ombre la détache du bord du fond, de la même paille
  const crownC = (x) => (x === 9 ? "l" : x <= 12 ? "h" : x <= 18 ? "l" : x <= 20 ? "m" : x === 21 ? "d" : "o");
  for (let y = 0; y <= 6; y++) for (let x = 9; x <= 22; x++) {
    if ((y === 0 && (x < 11 || x > 20)) || (y === 1 && (x === 9 || x === 22))) continue;
    let c = crownC(x);
    if (y === 2 || y === 4) c = DARKER[c];
    put(x, y, c);
  }
  // ce qui dépasserait au-dessus du bord du fond (les cheveux autour de la calotte, le nœud de la fermière) : effacé (« . », `paintWear`)
  for (let y = 0; y <= 4; y++) for (let x = 0; x < PERSO_HD_W; x++) if (!G[y][x]) G[y][x] = ".";
  // le ruban, noué : de face sur la droite (la gauche du porteur), de dos à gauche, de profil derrière la tête avec ses deux pans
  for (let x = 9; x <= 22; x++) { put(x, 5, x >= 20 ? "R" : "r"); put(x, 6, x >= 19 ? "R" : "r"); }
  if (dir === 0) { put(17, 5, "R"); put(18, 5, "R"); put(17, 6, "R"); put(18, 6, "r"); }
  else if (dir === 1) { put(12, 5, "R"); put(13, 5, "R"); put(12, 6, "r"); put(13, 6, "R"); }
  else { put(9, 5, "R"); put(10, 5, "R"); put(9, 6, "R"); put(8, 7, "r"); put(8, 8, "R"); put(9, 7, "R"); put(7, 9, "r"); put(7, 10, "R"); }
  return G;
}
const WEAR_HD = { capeline: capelineHD };
function wearHD(slot, id, dir, gender) {
  const k = slot + id + dir + gender;
  if (WEAR_CACHE.has(k)) return WEAR_CACHE.get(k);
  if (WEAR_HD[id]) { const H = WEAR_HD[id](dir); WEAR_CACHE.set(k, H); return H; }
  const folds = [];
  const G = scale2x(wardrobeLayer(slot, id, dir, gender, 0, 0, folds), !SOFT.has(id));
  foldsHD(G, folds);
  if (G[46].some(Boolean) || G[47].some(Boolean)) { G[44] = G[46]; G[45] = G[47]; }
  G[46] = Array(32).fill(null); G[47] = Array(32).fill(null);
  WEAR_CACHE.set(k, G);
  return G;
}
// à partir de quelle rangée (du 16 × 24) l'article suit le pas, face / dos / profil, et dans quel sens de profil
const WEAR_SWAY = { gown: [19, 19, null], cape: [18, 18, 15], silk: [12, null, 12], feather: [12, null, 12], knit: [15, null, 15] };
function paintWear(d, slot, id, dir, gender, st, base, maxY = 99) {
  const pal = wardrobePal(slot, id, base, "#000000", "#000000");
  const sw = WEAR_SWAY[id], y0 = sw && sw[dir];
  const dx = id === "cape" && dir === 2 ? -Math.abs(st) : dir === 2 ? -st : st;
  const map = (c) => (c === "." ? "." : c === "s" ? "S" : c === "S" ? "s" : pal[c] || null);   // « . » : une case à effacer (`capelineHD`)
  if (id === "poncho") {
    // les franges seules suivent le pas (les fils crème sous l'ourlet)
    const G = wearHD(slot, id, dir, gender), fringe = (x, y) => y >= 34 && G[y][x] === "W";
    blitHDGrid(d, G.map((r, y) => r.map((c, x) => (fringe(x, y) ? null : c))), { map });
    blitHDGrid(d, G.map((r, y) => r.map((c, x) => (fringe(x, y) ? c : null))), { map, dx: st, swayY: 0 });
    return;
  }
  blitHDGrid(d, wearHD(slot, id, dir, gender), { map, dx, swayY: y0 != null ? y0 * 2 : 99, maxY });
}
// La manche d'une tenue qui couvre le bras (robe, tailleur) ou le bras nu (tutu) : la `A` de `armsFront` / `bodySide`.
function wearArms(id, base) {
  if (id !== "gown" && id !== "suit" && id !== "tutu") return null;
  const p = wardrobePal("outfit", id, base, "#000000", "#000000"), shadow = [p.d, p.o];
  if (id === "tutu") return { sl: ["S", "S", "s"], cuff: "S", shadow };
  return { sl: [p.l, p.m, p.d], cuff: id === "suit" ? p.w : p.d, shadow };
}
// Le tutu : collants et chaussons, jambes fines (deux pixels du 16 × 24, quatre ici), à la place du pantalon ou de la jupe.
function tutuLegs(d, dir, st, base) {
  const p = wardrobePal("outfit", "tutu", base, "#000000", "#000000"), tp = "#f3e2e6", tps = "#d6bec6";
  for (let y = 32; y < 46; y++) for (let x = 4; x < 28; x++) d.set(x, y, ".");
  const lift = (side) => (st !== 0 && st === side ? 2 : 0);
  if (dir === 2) {
    for (const [dx, c, cs] of [[-st * 3, tps, p.d], [st * 3, tp, p.m]]) {
      d.rect(14 + Math.round(dx / 3), 32, 4, 6, c); d.rect(14 + Math.round(dx * 2 / 3), 38, 4, 4, c); d.rect(14 + dx, 42, 4, 2, c);
      d.rect(14 + dx, 44, 6, 2, cs); d.rect(14 + dx, 44, 6, 1, p.l);
    }
    return;
  }
  for (const [x, side, c] of [[11, -1, tp], [17, 1, tps]]) {
    const up = lift(side);
    d.rect(x, 32, 4, 12 - up, c); d.rect(x + 3, 33, 1, 10 - up, tps);
    d.rect(x, 44 - up, 4, 2, p.m); d.rect(x, 44 - up, 4, 1, p.l); d.set(x + 1, 45 - up, p.d);
  }
}

/* ─── L'assemblage et le rendu ────────────────────────────────────────── */
// `pose` : false (la marche), true (la feuille des poses), "bare" (la feuille des poses SANS BRAS — `persoHdArmRig`).
function paint(gender, dir, frame, expr, cos, pose = false) {
  // Léo porte ses cartons à deux mains, de face et de profil : ses bras sont pliés, pas pendants — le bras long dépassait sous le
  // carton, une troisième main à côté des deux qui le tiennent.
  // la feuille de MARCHE : l'image 0 debout, 1 à 8 la foulée ; « clasp », les MAINS JOINTES : 0 jointes, 1 l'image de passage
  const W2 = pose === false || pose === "clasp", clasp = pose === "clasp" ? (frame === 1 ? 0.5 : 1) : 0;
  const leoArms = !!(cos && cos.look === "leo" && dir !== 1);
  const ARM = pose === "bare" ? ARM_BARE : pose === true || leoArms ? ARM_POSE : ARM_STAND;
  const b = buf();
  const f8 = clasp ? 8 : W2 ? (frame === 0 ? 8 : frame - 1) : 0, p4 = f8 % 4;   // en interne, 0-7 la foulée et 8 debout
  const st = W2 ? (f8 >= 8 ? 0 : p4 <= 1 ? (f8 < 4 ? 1 : -1) : 0) : frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const bob = W2 ? (f8 >= 8 ? 0 : W2_BOB[p4]) : st !== 0 ? 1 : 0;
  // le poids passe d'un pied sur l'autre (face, dos) ; la tête a son mouvement vertical (« LA MARCHE À HUIT IMAGES »)
  const walking = W2 && f8 < 8, side8 = f8 < 4 ? 1 : -1;
  const sdx = walking && dir !== 2 ? W2_SWAY[p4] * side8 : 0, hdx = sdx;
  const hdy = walking ? W2_HEAD_DY[p4] : bob;
  const low = mk(b), up = mk(b, bob, false, sdx), hd = mk(b, hdy, false, hdx);
  // Lot B : la coupe du salon (« long » et « court » sont les gabarits d'origine, quel que soit le genre), la barbe, les vêtements.
  const cut = cos && cos.cut, hairG = cut === "long" ? "f" : cut === "short" ? "m" : gender;
  const catCut = cut && cut !== "long" && cut !== "short" ? cut : null;
  const wd = (cos && cos.wd) || {}, tint = wd.tint || null, outfit = wd.outfit || null;
  // Une ouvrière porte le pantalon de l'équipe : son CORPS se dessine comme un pantalon (le 16 × 24 effaçait la jupe).
  const bodyG = cos && cos.worker && gender === "f" ? "m" : gender;
  const A = costumeArms(cos) || (outfit ? wearArms(outfit, tint) : null);
  const plain = !!(cos && (cos.bee || cos.look === "vandal" || cos.worker || cos.look === "froufrou" || outfit === "suit"));
  const noFace = !!(cos && (cos.bee || cos.look === "vandal")), style = faceStyleOf(cos);
  const overArms = outfit === "cape" || outfit === "poncho";
  const hairFront = (dd, dr) => { if (catCut) paintCut(dd, catCut, dr, st); else hair(dd, dr, hairG, "front"); };
  let brows = null;
  if (dir === 2) {
    const midFn = (dd) => {
      if (cos) { if (cos.plaid) plaidOver(dd); costumeBody(dd, low, 2, gender, cos, st); }
      if (outfit === "tutu") tutuLegs(low, 2, st, tint);
      if (outfit && !overArms) paintWear(up, "outfit", outfit, 2, gender, st, tint, W2 && bodyG === "m" && outfit !== "gown" ? W2_TROUSER_Y : 99);
      shoulders(W2 ? up : low, true);   // la pente du trapèze, avant le bras
    };
    if (W2) bodySide2(b, bodyG, f8, A, plain, midFn, ARM, clasp, outfit === "gown", leoArms);
    else bodySide(low, bodyG, st, A, plain, midFn, ARM);
    if (!noFace && !catCut) hair(hd.behind(), 2, hairG, "back");
    if (overArms) paintWear(up, "outfit", outfit, 2, gender, st, tint);
    head(hd, 2);
    let facePx = null;
    if (!noFace) {
      // les pixels que le visage a posés (pour les retracer dans le front dégagé, après les cheveux : `clearFrontSide`)
      const before = Array.from({ length: 22 }, (_, y) => Array.from({ length: PERSO_HD_W }, (_, x) => hd.get(x, y)));
      brows = faceSide(hd, expr, gender, style);
      facePx = [];
      for (let y = 0; y < 22; y++) for (let x = 0; x < PERSO_HD_W; x++) { const c = hd.get(x, y); if (c !== before[y][x]) facePx.push([x, y, c]); }
    }
    if (wd.scarf) paintWear(up, "scarf", wd.scarf, 2, gender, st, tint);
    if (!noFace) { hairFront(hd, 2); clearFrontSide(hd, facePx); }
  } else {
    // une jupe se peint droite puis vit (`w2skirt`), les pieds passent dessous ; le pantalon d'une tenue suit les jambes (fin de `paint`)
    const skirtW2 = W2 && (bodyG === "f" || outfit === "gown");
    if (W2 && !skirtW2) legsFront2(b, bodyG, f8, dir === 1, plain, sdx); else if (!W2) legsFront(low, bodyG, st, dir === 1, plain);
    torsoFront(up, bodyG, dir, plain);
    if (cos) costumeBody(up, low, dir, gender, cos, st);
    if (outfit === "tutu") tutuLegs(low, dir, st, tint);
    if (outfit && !overArms) paintWear(up, "outfit", outfit, dir, gender, st, tint, W2 && !skirtW2 && bodyG === "m" ? W2_TROUSER_Y : 99);
    if (skirtW2) { w2skirt(b, 29 + bob, w2skirtParams(f8, dir)); legsFront2(b, bodyG, f8, dir === 1, plain, sdx, true); }
    shoulders(up, false);
    // les cheveux longs passent DERRIÈRE le corps : peints après lui, dans les seules cases vides (le creux de l'épaule compris)
    if (dir === 0 && !noFace && !catCut) hair(hd.behind(), 0, hairG, "back");
    if (W2) armsFront2(up, bodyG, f8, dir, A, ARM.long, ARM.drop, clasp, leoArms);
    else if (!ARM.none) armsFront(up.shift(ARM.drop), bodyG, st, dir, A, ARM.long);
    if (overArms) paintWear(up, "outfit", outfit, dir, gender, st, tint);
    if (cos && cos.plaid) plaidOver(up);
    head(hd, dir);
    if (dir === 0 && !noFace) brows = faceFront(hd, expr, gender, style);
    if (wd.scarf) paintWear(up, "scarf", wd.scarf, dir, gender, st, tint);
    if (!noFace) hairFront(hd, dir);
  }
  if (cos && cos.beard && dir !== 1) paintBeardHD(hd, cos.beard, dir);
  // Les sourcils avant ce qui coiffe la tête : un bord de chapeau les cache, comme il cache le front.
  if (brows) brows(hd);
  if (cos) costumeHead(hd, dir, gender, cos);
  if (wd.hat) paintWear(hd, "hat", wd.hat, dir, gender, st, tint);
  // Le pantalon d'une tenue (le costume) : la grille le peignait d'un bloc, figé, par-dessus les jambes articulées (« il faut animer les
  // pantalons selon les mouvements des jambes »). Coupée aux hanches (`W2_TROUSER_Y`), elle laisse les jambes, qui prennent ses teintes.
  if (W2 && bodyG === "m" && outfit && outfit !== "gown") {
    const wp = wardrobePal("outfit", outfit, tint, "#000000", "#000000"), G = wearHD("outfit", outfit, dir, gender);
    if (G.slice(W2_TROUSER_Y, 44).some((r) => r.some(Boolean))) {
      const TR = { P: wp.m, Q: wp.l, p: wp.d, O: wp.o };
      for (let y = 31; y < PERSO_HD_H; y++) for (let x = 0; x < PERSO_HD_W; x++) if (TR[b[y][x]]) b[y][x] = TR[b[y][x]];
    }
  }
  return b;
}
const CACHE = new Map();
export function persoHdGrid(gender, dir, frame = 0, expr = "neutre", cos = null, pose = false) {
  const k = gender + dir + frame + expr + (pose ? "|" + pose : "") + (cos ? JSON.stringify(cos) : "");
  if (!CACHE.has(k)) CACHE.set(k, paint(gender, dir, frame, expr, cos, pose));
  return CACHE.get(k);
}

/* Dessine une vue à (ox, oy), un pixel d'art par pixel du contexte. `dir` : 0 face, 1 dos, 2 profil tourné vers la droite (la
   gauche par miroir à l'affichage, comme aujourd'hui) ; `frame` 0-3 comme `drawCharFrame` ; `pal` : persoHdPalette(...). */
// `pose` : la feuille des poses (bras du gabarit, voir « LES ÉPAULES ») ; "bare" : la même, sans bras (`persoHdArmRig`).
export function drawPersoHD(g, ox, oy, { gender = "f", dir = 0, frame = 0, expr = "neutre", pal, outline = true, costume = null, pose = false }) {
  const grid = persoHdGrid(gender, dir, frame, expr, costume, pose);
  const at = (x, y) => (x < 0 || y < 0 || x >= PERSO_HD_W || y >= PERSO_HD_H ? "." : grid[y][x]);
  for (let y = 0; y < PERSO_HD_H; y++) for (let x = 0; x < PERSO_HD_W; x++) {
    const ch = grid[y][x];
    let col;
    if (ch === ".") {
      if (!outline) continue;   // la feuille « nue » des poses : le contour se pose APRÈS l'assemblage (FermeGame.js, `drawPoseHD`)
      // Le contour : le voisin d'en bas d'abord (il pose la silhouette sur ses pieds), puis les côtés, puis le haut.
      const n = [at(x, y + 1), at(x - 1, y), at(x + 1, y), at(x, y - 1)].find((c) => c !== ".");
      if (!n) continue;
      col = outlineOf(n.length > 1 ? n : pal[n]);
    } else col = ch.length > 1 ? ch : pal[ch];   // lot B : une cellule peut porter sa couleur (« #rrggbb ») — les vêtements
    if (!col) throw new Error("persoHdArt : lettre inconnue « " + ch + " »");
    g.fillStyle = col; g.fillRect(ox + x, oy + y, 1, 1);
  }
}
