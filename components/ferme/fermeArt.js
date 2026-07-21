/* ==========================================================================
   FERME VALLÉE (jeu 22) — sprites pixel-art générés par code (style Stardew).
   ==========================================================================
   Portage FIDÈLE des sprites de la maquette validée. Tout est dessiné sur des
   canvases hors-écran. Comme cela dépend de `document`, on n'exécute rien à
   l'import : `buildSprites()` est appelé côté client une seule fois après le
   montage (voir FermeGame.js). Aucune image bitmap : signature CSS/canvas pur
   du site respectée.
   ========================================================================== */

import * as C from "./fermeConstants";

export function buildSprites() {
  const T = 16;

  function cv(w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    return [c, g];
  }
  function P(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function makeRnd(s) { return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }

  /* ---------------- Tuiles de sol ---------------- */
  function grassTile(variant) {
    const [c, g] = cv(T, T), r = makeRnd(77 + variant * 131);
    P(g, 0, 0, T, T, "#59a84a");
    for (let i = 0; i < 26; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? "#4f9a41" : "#63b653");
    for (let i = 0; i < 5; i++) { const x = (r() * 14) | 0, y = (r() * 13) | 0; P(g, x, y, 1, 2, "#3f8a36"); P(g, x + 1, y + 1, 1, 1, "#6fc25e"); }
    if (variant === 2) { P(g, 4, 5, 1, 1, "#e8e05a"); P(g, 11, 10, 1, 1, "#e8e05a"); }
    return c;
  }
  function tilledTile(watered) {
    const [c, g] = cv(T, T), r = makeRnd(watered ? 55 : 44);
    P(g, 0, 0, T, T, watered ? "#5a3d28" : "#8a5c35");
    P(g, 0, 0, T, 1, watered ? "#4e3421" : "#7a4f2c");
    for (let y = 2; y < T; y += 4) P(g, 0, y, T, 1, watered ? "#503722" : "#7d522e");
    for (let i = 0; i < 14; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, watered ? "#6a4930" : "#9a6a3f");
    if (watered) for (let i = 0; i < 6; i++) P(g, (r() * T) | 0, (r() * T) | 0, 2, 1, "#4a3220");
    return c;
  }
  function waterTile(frame) {
    const [c, g] = cv(T, T), r = makeRnd(99 + frame * 31);
    P(g, 0, 0, T, T, "#3a7bc8");
    for (let i = 0; i < 8; i++) P(g, (r() * T) | 0, (r() * T) | 0, 3, 1, "#4a8bd8");
    for (let i = 0; i < 4; i++) P(g, (r() * T) | 0, (r() * T) | 0, 2, 1, "#7ab4e8");
    P(g, frame ? 9 : 3, frame ? 4 : 10, 3, 1, "#a8d4f0");
    return c;
  }
  function sandTile() {
    const [c, g] = cv(T, T), r = makeRnd(31);
    P(g, 0, 0, T, T, "#d8c07a");
    for (let i = 0; i < 18; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? "#c8b06a" : "#e5d090");
    return c;
  }
  function bridgeTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 0, T, T, "#9a6b3f");
    for (let y = 0; y < T; y += 4) { P(g, 0, y, T, 3, "#a87745"); P(g, 0, y + 3, T, 1, "#7a5330"); }
    P(g, 3, 0, 1, T, "#8a6038"); P(g, 11, 0, 1, T, "#8a6038");
    return c;
  }
  function bridgeRuinTile() {
    // Base : eau visible (chantier de pont en ruine, pas encore réparé).
    const [c, g] = cv(T, T), r = makeRnd(48);
    P(g, 0, 0, T, T, "#3a7bc8");
    for (let i = 0; i < 8; i++) P(g, (r() * T) | 0, (r() * T) | 0, 3, 1, "#4a8bd8");
    for (let i = 0; i < 4; i++) P(g, (r() * T) | 0, (r() * T) | 0, 2, 1, "#7ab4e8");
    P(g, 3, 10, 3, 1, "#a8d4f0");
    // Piliers de bois effondrés dépassant de l'eau (pas de planches).
    P(g, 2, 5, 2, 8, "#7a5330");
    P(g, 2, 5, 1, 8, "#5e3f22");
    P(g, 12, 3, 2, 7, "#8a6038");
    P(g, 12, 3, 1, 7, "#6a4a2a");
    P(g, 7, 9, 2, 5, "#6a4528");
    // Éclats/débris flottants autour des piliers.
    P(g, 5, 3, 2, 1, "#8a6038");
    P(g, 9, 6, 1, 1, "#7a5330");
    P(g, 1, 13, 2, 1, "#6a4528");
    return c;
  }
  function bridgeStoneTile() {
    // Pont rénové en pierre (chantier 2026-07, demande Guillaume : "aspect
    // pierre joli"). Base grise pierre avec un pavage de dalles irrégulières
    // (jointures plus sombres), distinct du bois (bridgeTile ci-dessus) pour
    // que la rénovation soit visible d'un coup d'œil.
    const [c, g] = cv(T, T), r = makeRnd(77);
    P(g, 0, 0, T, T, "#8a8a92");
    // Jointures de dalles (grille légèrement irrégulière).
    P(g, 0, 0, T, 1, "#6a6a72"); P(g, 0, 5, T, 1, "#6a6a72"); P(g, 0, 10, T, 1, "#6a6a72");
    P(g, 0, 0, 1, T, "#6a6a72"); P(g, 7, 0, 1, T, "#6a6a72");
    // Variations de teinte par dalle + petits éclats clairs (usure/relief).
    for (let i = 0; i < 10; i++) {
      const x = (r() * T) | 0, y = (r() * T) | 0;
      P(g, x, y, 2, 1, r() < 0.5 ? "#9c9ca4" : "#78787f");
    }
    P(g, 2, 2, 1, 1, "#b0b0b8"); P(g, 12, 12, 1, 1, "#b0b0b8");
    return c;
  }
  function pathTile() {
    const [c, g] = cv(T, T), r = makeRnd(63);
    P(g, 0, 0, T, T, "#b8a888");
    for (let i = 0; i < 10; i++) { const x = (r() * 13) | 0, y = (r() * 13) | 0; P(g, x, y, 3, 2, "#a89878"); P(g, x, y, 2, 1, "#c8b898"); }
    return c;
  }

  /* ---------------- Objets ---------------- */
  function oakTree() {
    const [c, g] = cv(32, 48);
    P(g, 14, 32, 5, 14, "#7a5330");
    P(g, 14, 32, 2, 14, "#8a6340");
    P(g, 12, 44, 3, 2, "#7a5330"); P(g, 18, 44, 3, 2, "#6a4528");
    const leaf = "#3e8a34", leafD = "#337029", leafL = "#54a648";
    g.fillStyle = leafD; g.beginPath(); g.arc(16, 18, 14, 0, 7); g.fill();
    g.fillStyle = leaf; g.beginPath(); g.arc(15, 16, 12, 0, 7); g.fill();
    g.fillStyle = leafL; g.beginPath(); g.arc(11, 12, 6, 0, 7); g.fill();
    g.fillStyle = leafL; g.beginPath(); g.arc(21, 15, 4, 0, 7); g.fill();
    const r = makeRnd(12);
    for (let i = 0; i < 12; i++) P(g, 5 + ((r() * 22) | 0), 6 + ((r() * 20) | 0), 1, 1, leafD);
    return c;
  }
  function pineTree() {
    const [c, g] = cv(32, 48);
    P(g, 14, 36, 4, 10, "#6a4a2c"); P(g, 14, 36, 2, 10, "#7a5a38");
    const d = "#2a6648", m = "#347a54", l = "#468f62";
    for (let i = 0; i < 4; i++) {
      const y = 8 + i * 8, half = 6 + i * 2.5;
      g.fillStyle = i % 2 ? m : d;
      g.beginPath(); g.moveTo(16, y - 6); g.lineTo(16 - half, y + 6); g.lineTo(16 + half, y + 6); g.fill();
    }
    P(g, 15, 2, 2, 4, l);
    return c;
  }
  // Arbre mort, sans feuilles (chantier 2026-07, demande Guillaume : arbres
  // morts pour l'ambiance de la carte maléfique) : même gabarit 32x48 que
  // oakTree/pineTree (mêmes offsets d'ancrage dans drawEvilFrame), mais tronc
  // et branches nus — pas de bosquet de feuillage, juste une silhouette de
  // bois mort tracée au trait (branches anguleuses qui se ramifient), pour
  // trancher visuellement avec les arbres vivants encore présents ailleurs
  // sur la carte maléfique.
  function deadTree() {
    const [c, g] = cv(32, 48);
    const bark = "#3a342e", barkD = "#231f1a";
    P(g, 14, 30, 5, 16, bark);
    P(g, 14, 30, 2, 16, barkD);
    P(g, 11, 44, 3, 2, bark); P(g, 18, 44, 3, 2, barkD);
    g.strokeStyle = barkD; g.lineWidth = 2; g.lineCap = "round";
    const branches = [
      [16, 30, 7, 15], [16, 27, 25, 13], [16, 21, 5, 7], [16, 19, 27, 9],
      [16, 15, 11, 3], [16, 15, 21, 5], [11, 3, 8, 0], [21, 5, 25, 2],
    ];
    for (const [x1, y1, x2, y2] of branches) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
    const r = makeRnd(45);
    for (let i = 0; i < 6; i++) P(g, 5 + ((r() * 22) | 0), 3 + ((r() * 16) | 0), 1, 1, barkD);
    return c;
  }
  function stump() {
    const [c, g] = cv(T, T);
    P(g, 4, 6, 8, 8, "#7a5330"); P(g, 4, 6, 8, 3, "#c8a878");
    P(g, 6, 7, 4, 1, "#a8865a"); P(g, 3, 12, 3, 3, "#6a4528"); P(g, 11, 12, 3, 2, "#6a4528");
    return c;
  }
  function rock() {
    const [c, g] = cv(T, T);
    P(g, 3, 6, 10, 8, "#8a8a92");
    P(g, 5, 4, 7, 3, "#8a8a92");
    P(g, 4, 5, 5, 4, "#a2a2aa");
    P(g, 10, 8, 3, 4, "#72727a");
    P(g, 3, 12, 10, 2, "#66666e");
    P(g, 6, 6, 2, 1, "#c2c2ca");
    return c;
  }
  // ---- Helpers des bâtiments refondus (maquettes validées 2026-07) ----
  // Porte en planches (cadre sombre, poignée dorée), 16x26 posée en (x,y).
  function bDoor(g, x, y) {
    P(g, x - 1, y, 16, 26, "#4a3826");
    P(g, x, y + 1, 14, 25, "#7a5330");
    for (let i = x + 2; i < x + 13; i += 3) P(g, i, y + 2, 1, 22, "#6a4426");
    P(g, x, y + 1, 14, 2, "#8a6340");
    P(g, x + 11, y + 12, 1, 1, "#e8c85a"); P(g, x + 11, y + 13, 1, 1, "#c8a83a");
  }
  // Fenêtre à croisillons + jardinière fleurie, 16x15 posée en (x,y).
  function bWindow(g, x, y) {
    P(g, x - 1, y - 1, 16, 13, "#4a3826");
    P(g, x, y, 14, 11, "#a8d4e8");
    P(g, x, y, 14, 3, "#d0ecf6");
    P(g, x + 7, y, 1, 11, "#4a3826"); P(g, x, y + 5, 14, 1, "#4a3826");
    P(g, x - 2, y + 12, 18, 2, "#6a4a2c");
    for (let i = 0; i < 3; i++) { P(g, x + 2 + i * 4, y + 11, 1, 1, "#d4504a"); P(g, x + 3 + i * 4, y + 11, 1, 1, "#e8842a"); }
  }
  // Rangée de moellons irréguliers (pierre) : rangs décalés, tons variés.
  function bStones(g, x, y, w, h, r, tones, bh) {
    P(g, x, y, w, h, "#6f6f78");
    let row = 0;
    for (let yy = y; yy < y + h; yy += bh) {
      const hh = Math.min(bh, y + h - yy);
      let xx = x + (row % 2 ? -3 : 0);
      while (xx < x + w) {
        const bw = 5 + Math.floor(r() * 5);
        const x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw - 1);
        if (x1 > x0) { P(g, x0, yy, x1 - x0, hh - 1, tones[Math.floor(r() * tones.length)]); P(g, x0, yy, 1, 1, tones[1]); }
        xx += bw;
      }
      row++;
    }
  }
  // Cheminée en pierre (commune aux maisons niv 2/3).
  function bChimney(g) {
    P(g, 66, 12, 12, 20, "#8a8a92"); P(g, 64, 10, 16, 4, "#72727a");
    for (let y = 14; y < 30; y += 4) P(g, 67, y, 10, 1, "#7a7a84");
  }
  // Maison NIVEAU 2 (maquette A validée) : colombages + toit de chaume +
  // soubassement en pierre. Même canevas 96x96 et même ancrage au sol que
  // house() (niveau 1) : aucun changement de position de rendu nécessaire.
  function houseLvl2() {
    const [c, g] = cv(96, 96);
    const r = makeRnd(72);
    // soubassement pierre
    bStones(g, 8, 78, 80, 10, r, ["#9a9aa4", "#b8b8c2", "#84848e", "#9a9aa4"], 5);
    // mur enduit clair (grain léger) + poutres de colombage
    P(g, 8, 46, 80, 32, "#e6d9bc");
    for (let i = 0; i < 90; i++) P(g, 8 + Math.floor(r() * 80), 46 + Math.floor(r() * 32), 1, 1, "#efe4ca");
    P(g, 8, 46, 80, 2, "#5a4028"); P(g, 8, 76, 80, 2, "#5a4028");
    P(g, 8, 46, 2, 32, "#5a4028"); P(g, 86, 46, 2, 32, "#5a4028");
    P(g, 34, 46, 2, 32, "#5a4028"); P(g, 60, 46, 2, 32, "#5a4028");
    for (let i = 0; i < 28; i++) { P(g, 10 + Math.floor(i * 23 / 28), 48 + i, 1, 1, "#5a4028"); P(g, 62 + Math.floor(i * 23 / 28), 48 + i, 1, 1, "#5a4028"); }
    // toit de chaume : rangées de paille, ourlet de mèches en bord
    for (let i = 0; i < 38; i++) {
      const half = Math.floor(44 * i / 38);
      const col = i % 3 === 0 ? "#8f6c2c" : (i % 2 ? "#c89a48" : "#d8ac54");
      P(g, 48 - half, 8 + i, Math.max(1, half * 2), 1, col);
    }
    for (let i = 0; i < 30; i++) P(g, 6 + Math.floor(r() * 84), 45 + Math.floor(r() * 2), 1, 1, "#8f6c2c");
    P(g, 44, 5, 8, 4, "#e0b862"); // faîtage
    bChimney(g);
    bDoor(g, 42, 62);
    bWindow(g, 16, 58); bWindow(g, 70, 58);
    return c;
  }
  // Maison NIVEAU 3 (maquette B validée) : murs en pierre appareillée + toit
  // de tuiles rouges + auvent bois au-dessus de la porte. Même canevas 96x96.
  function houseLvl3() {
    const [c, g] = cv(96, 96);
    const r = makeRnd(113);
    // mur en pierre
    bStones(g, 8, 46, 80, 42, r, ["#b8b0a2", "#d0c8ba", "#a09888", "#b8b0a2"], 6);
    // toit de tuiles rouges (écailles marquées un rang sur deux)
    for (let i = 0; i < 40; i++) {
      const half = Math.floor(44 * i / 40);
      const y0 = 8 + i;
      if (i % 4 === 0) P(g, 48 - half, y0, Math.max(1, half * 2), 1, "#7c2a22");
      else {
        P(g, 48 - half, y0, Math.max(1, half * 2), 1, "#c04a3c");
        if (i % 2 === 0) for (let xx = 48 - half; xx < 48 + half; xx += 5) { P(g, xx, y0, 1, 1, "#7c2a22"); P(g, xx + 1, y0, 1, 1, "#d4635a"); }
      }
    }
    P(g, 0, 46, 96, 3, "#6a241e"); // rive de toit
    bChimney(g);
    // auvent bois au-dessus de la porte
    P(g, 38, 56, 22, 3, "#8a3028"); P(g, 39, 59, 2, 4, "#6a4a2c"); P(g, 56, 59, 2, 4, "#6a4a2c");
    bDoor(g, 42, 62);
    bWindow(g, 16, 58); bWindow(g, 70, 58);
    return c;
  }
  function house() {
    const [c, g] = cv(96, 96);
    P(g, 8, 46, 80, 42, "#c8a878");
    for (let y = 50; y < 88; y += 6) P(g, 8, y, 80, 1, "#b89868");
    g.fillStyle = "#a83c30";
    g.beginPath(); g.moveTo(0, 48); g.lineTo(48, 6); g.lineTo(96, 48); g.fill();
    g.fillStyle = "#c04a3c";
    g.beginPath(); g.moveTo(6, 46); g.lineTo(48, 10); g.lineTo(90, 46); g.lineTo(84, 46); g.lineTo(48, 15); g.lineTo(12, 46); g.fill();
    P(g, 0, 46, 96, 4, "#8a3028");
    P(g, 68, 12, 10, 18, "#8a8a92"); P(g, 66, 10, 14, 4, "#72727a");
    P(g, 42, 62, 14, 26, "#7a5330"); P(g, 44, 64, 10, 24, "#8a6340");
    P(g, 52, 75, 2, 2, "#e8c85a");
    for (const wx of [16, 68]) {
      P(g, wx, 58, 14, 12, "#5a4530");
      P(g, wx + 1, 59, 12, 10, "#a8d4e8"); P(g, wx + 1, 59, 12, 4, "#c8e8f4");
      P(g, wx + 6, 59, 1, 10, "#5a4530"); P(g, wx + 1, 63, 12, 1, "#5a4530");
      P(g, wx - 1, 70, 16, 2, "#7a5330");
    }
    return c;
  }
  function shopStand() {
    // Étal refondu (maquette validée 2026-07) : auvent rayé à lambrequins,
    // comptoir en planches veinées, cagettes de produits colorés.
    const [c, g] = cv(24, 28);
    const r = makeRnd(4);
    P(g, 2, 12, 20, 12, "#9a6b3f");
    for (let x = 2; x < 22; x += 4) { P(g, x, 12, 1, 12, "#6f4b2a"); P(g, x + 1 + Math.floor(r() * 2), 13 + Math.floor(r() * 9), 1, 2, "#875c34"); }
    P(g, 1, 10, 22, 2, "#b8834f"); P(g, 1, 10, 22, 1, "#d09a5e"); // plateau
    for (let i = 0; i < 6; i++) {
      const col = i % 2 ? "#efe9da" : "#d44a3f";
      P(g, 1 + i * 4, 2, 4, 5, col);
      P(g, 2 + i * 4, 7, 2, 2, col); // pointe de lambrequin
    }
    P(g, 0, 1, 24, 2, "#b03a30");
    P(g, 3, 24, 2, 4, "#7a5330"); P(g, 19, 24, 2, 4, "#7a5330"); // pieds
    const prods = ["#e8842a", "#e03e2e", "#b46ee0"];
    for (let b = 0; b < 3; b++) {
      const bx = 3 + b * 7;
      P(g, bx, 7, 6, 3, "#8a6340"); P(g, bx, 7, 6, 1, "#a87745");
      for (let i = 0; i < 3; i++) P(g, bx + 1 + i * 2, 7, 1, 1, prods[b]);
    }
    return c;
  }

  function sellBin() {
    const [c, g] = cv(20, 18);
    P(g, 1, 4, 18, 13, "#8a6340");
    P(g, 0, 2, 20, 4, "#a87745");
    P(g, 2, 6, 16, 9, "#5a3d28");
    P(g, 3, 3, 2, 1, "#7a5330"); P(g, 15, 3, 2, 1, "#7a5330");
    P(g, 6, 0, 8, 4, "#e8c85a"); P(g, 8, 1, 4, 2, "#c8a83a");
    return c;
  }

  /* ---------------- Cultures (4 types × 5 stades) ---------------- */
  function cropSprite(type, stage) {
    const [c, g] = cv(T, T);
    const info = C.CROPS[type];
    const green = "#4a9a3a", greenD = "#3a7a2c";
    if (stage === 0) {
      P(g, 7, 11, 2, 3, green); P(g, 6, 10, 1, 2, greenD); P(g, 9, 10, 1, 2, greenD);
    } else if (stage === 1) {
      P(g, 7, 8, 2, 6, green); P(g, 5, 9, 2, 2, greenD); P(g, 9, 9, 2, 2, greenD); P(g, 7, 7, 2, 1, "#63b653");
    } else if (stage === 2) {
      P(g, 7, 6, 2, 8, greenD); P(g, 4, 8, 3, 2, green); P(g, 9, 7, 3, 2, green); P(g, 5, 5, 6, 3, green);
    } else if (stage === 3) {
      P(g, 7, 4, 2, 10, greenD); P(g, 3, 7, 4, 3, green); P(g, 9, 6, 4, 3, green); P(g, 4, 3, 8, 4, green);
      P(g, 7, 3, 2, 2, info.color);
    } else {
      if (type === 3) {
        P(g, 3, 6, 10, 8, info.top); P(g, 4, 7, 8, 6, info.color);
        P(g, 5, 7, 2, 6, "#f09a45"); P(g, 9, 7, 2, 6, "#d67520");
        P(g, 7, 4, 2, 3, "#4a7a2c");
      } else if (type === 0) {
        P(g, 5, 2, 6, 4, green); P(g, 6, 1, 4, 2, "#63b653"); P(g, 7, 5, 2, 3, greenD);
        P(g, 4, 8, 8, 6, info.color); P(g, 5, 8, 6, 2, "#f4ecf8"); P(g, 6, 13, 4, 1, info.top);
      } else if (type === 1) {
        P(g, 6, 3, 4, 6, green); P(g, 4, 4, 3, 3, greenD); P(g, 9, 4, 3, 3, greenD);
        P(g, 3, 10, 4, 3, info.color); P(g, 9, 10, 4, 3, info.color); P(g, 6, 11, 4, 3, info.top);
      } else {
        P(g, 7, 3, 2, 11, greenD); P(g, 4, 5, 3, 2, green); P(g, 9, 6, 3, 2, green); P(g, 5, 2, 6, 3, green);
        P(g, 4, 8, 3, 3, info.color); P(g, 9, 9, 3, 3, info.color); P(g, 6, 11, 3, 3, info.color);
        P(g, 5, 8, 1, 1, "#f4a49a");
      }
    }
    return c;
  }

  /* ---------------- Personnages (H/F, 4 directions × 4 frames) ---------------- */
  const HAIR_COLORS = ["#5a3a1e", "#2a2a2a", "#c8862a", "#8a3020", "#d4b03a", "#4a3468", "#743a12", "#b0b0b8"];
  const SKIN = "#f0c8a0", SKIN_D = "#d8a878";

  function drawCharFrame(g, ox, gender, outfit, dir, frame, overalls, cap) {
    const o = C.OUTFITS[outfit % C.OUTFITS.length];
    const hair = HAIR_COLORS[outfit % HAIR_COLORS.length];
    const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const bob = step !== 0 ? 1 : 0;
    const x = ox;

    if (gender === "f") {
      P(g, x + 4, 14 + bob, 8, 7, o.shirt);
      P(g, x + 3, 17 + bob, 10, 4, o.shirt);
      P(g, x + 3, 20 + bob, 10, 1, shade(o.shirt));
      P(g, x + 5 + (step > 0 ? 1 : 0), 21 + bob, 2, 3 - bob, "#6a4528");
      P(g, x + 9 - (step < 0 ? 1 : 0), 21 + bob, 2, 3 - bob, "#6a4528");
    } else {
      P(g, x + 5, 15 + bob, 3, 6, o.pants);
      P(g, x + 8, 15 + bob, 3, 6, shade(o.pants));
      P(g, x + 5 + step, 21 + bob, 3, 3 - bob, "#6a4528");
      P(g, x + 8 - step, 21 + bob, 3, 3 - bob, "#6a4528");
    }
    P(g, x + 4, 10 + bob, 8, (gender === "f" ? 5 : 6), o.shirt);
    P(g, x + 4, 10 + bob, 8, 1, tint(o.shirt));
    if (dir === 2) {
      P(g, x + 7 + step, 11 + bob, 2, 5, o.shirt);
      P(g, x + 7 + step, 15 + bob, 2, 1, SKIN);
    } else {
      P(g, x + 3, 11 + bob, 2, 5, o.shirt); P(g, x + 11, 11 + bob, 2, 5, o.shirt);
      P(g, x + 3, 15 + bob, 2, 1, SKIN); P(g, x + 11, 15 + bob, 2, 1, SKIN);
    }
    P(g, x + 4, 2 + bob, 8, 8, SKIN);
    P(g, x + 4, 9 + bob, 8, 1, SKIN_D);
    if (gender === "f") {
      P(g, x + 3, 1 + bob, 10, 3, hair);
      P(g, x + 3, 3 + bob, 2, 8, hair); P(g, x + 11, 3 + bob, 2, 8, hair);
      P(g, x + 3, 10 + bob, 2, 3, hair); P(g, x + 11, 10 + bob, 2, 3, hair);
      if (dir === 1) P(g, x + 4, 3 + bob, 8, 6, hair);
      else P(g, x + 4, 1 + bob, 8, 2, hair);
      P(g, x + 12, 4 + bob, 1, 2, "#e85a8a");
    } else {
      P(g, x + 3, 1 + bob, 10, 3, hair);
      P(g, x + 3, 3 + bob, 1, 3, hair); P(g, x + 12, 3 + bob, 1, 3, hair);
      if (dir === 1) P(g, x + 4, 3 + bob, 8, 4, hair);
      else P(g, x + 4, 2 + bob, 8, 2, hair);
    }
    if (dir === 0) {
      P(g, x + 6, 5 + bob, 1, 2, "#3a2a1e"); P(g, x + 9, 5 + bob, 1, 2, "#3a2a1e");
      P(g, x + 6, 8 + bob, 4, 1, "#c88a6a");
      if (gender === "f") { P(g, x + 5, 7 + bob, 1, 1, "#eeddaa"); P(g, x + 10, 7 + bob, 1, 1, "#f0a8a0"); }
    } else if (dir === 2) {
      P(g, x + 4, 3 + bob, 5, 5, hair);
      P(g, x + 10, 5 + bob, 1, 2, "#3a2a1e");
      P(g, x + 11, 7 + bob, 1, 1, "#c88a6a");
    }
    // Casquette de Soan (chantier 2026-07, révisée : "le chapeau doit être
    // son skin, vraiment faire partie de sa tête, et tourner avec lui quand
    // il marche") : avant, un simple emoji 🧢 flottant, dessiné par-dessus
    // le personnage à une position fixe à l'écran, sans lien avec le sens
    // de la marche (drawCharacter, FermeGame.js) — retiré, remplacé par du
    // vrai pixel art fusionné DANS le sprite lui-même (comme la salopette de
    // Greg juste en dessous). Dessinée ici, DANS `drawCharFrame`, elle suit
    // donc automatiquement `bob` (petit rebond de marche, comme le reste du
    // corps) et surtout le `flip`/`dir` gérés par `drawCharacter` : dir 0 =
    // face caméra (visière vers le bas, bien visible), dir 1 = dos tourné
    // (juste le dôme, pas de visière — cohérent, on ne verrait pas une
    // visière de dos), dir 2 = profil (visière vers l'avant du sens de la
    // marche ; le retournement gauche/droite est pris en charge par le
    // `ctx.scale(-1,1)` déjà appliqué à tout le sprite dans drawCharacter,
    // exactement comme les bras en profil juste au-dessus — aucune variante
    // gauche/droite à coder séparément ici).
    if (cap) {
      const CAP = "#2f6f4a", CAP_D = shade(CAP), CAP_L = tint(CAP);
      P(g, x + 3, 0 + bob, 10, 3, CAP);
      P(g, x + 3, 0 + bob, 10, 1, CAP_L);
      P(g, x + 3, 2 + bob, 10, 1, CAP_D);
      if (dir === 0) {
        P(g, x + 3, 3 + bob, 10, 1, CAP_D);
        P(g, x + 3, 4 + bob, 4, 1, CAP_D); // visière, vers le bas/caméra
      } else if (dir === 2) {
        P(g, x + 3, 3 + bob, 10, 1, CAP_D);
        P(g, x + 10, 4 + bob, 3, 1, CAP_D); // visière, vers l'avant du profil
      }
      // dir === 1 (dos) : pas de visière, seulement le dôme ci-dessus.
    }
    // Salopette (chantier 2026-07, demande Guillaume : "Greg doit avoir une
    // salopette") : dessinée PAR-DESSUS le rendu de base (jambes + torse déjà
    // posés plus haut), pas un outfit de C.OUTFITS parmi ceux choisissables
    // par les joueurs — activée via le flag `overalls` (voir S.getChar/
    // charSheet), pour l'instant réservé à Greg (FermeGame.js, outfit: 0,
    // overalls: true). Jambes recolorées en denim + bavette + deux
    // bretelles, silhouette reconnaissable même en petit sprite 16x24.
    if (overalls) {
      const DENIM = "#3f5a8c", DENIM_D = shade(DENIM);
      P(g, x + 5, 15 + bob, 3, 6, DENIM);
      P(g, x + 8, 15 + bob, 3, 6, DENIM_D);
      P(g, x + 6, 11 + bob, 4, 5, DENIM);
      P(g, x + 6, 11 + bob, 4, 1, tint(DENIM));
      P(g, x + 5, 9 + bob, 1, 3, DENIM);
      P(g, x + 10, 9 + bob, 1, 3, DENIM);
    }
  }
  function shade(hex) { return adjust(hex, -30); }
  function tint(hex) { return adjust(hex, 30); }
  function adjust(hex, d) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + d));
    const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + d));
    const b = Math.max(0, Math.min(255, (n & 255) + d));
    return `rgb(${r},${gg},${b})`;
  }
  function charSheet(gender, outfit, overalls, cap) {
    const [c, g] = cv(16 * 4, 24 * 3);
    for (let dir = 0; dir < 3; dir++)
      for (let f = 0; f < 4; f++) {
        g.save(); g.translate(0, dir * 24);
        drawCharFrame(g, f * 16, gender, outfit, dir, f, overalls, cap);
        g.restore();
      }
    return c;
  }

  /* ---------------- Icônes d'interface ---------------- */
  function icon(kind) {
    const [c, g] = cv(T, T);
    switch (kind) {
      case "hoe":
        P(g, 8, 2, 2, 11, "#8a6340"); P(g, 5, 12, 6, 2, "#a8a8b0"); P(g, 5, 14, 2, 1, "#88888f"); break;
      case "can":
        P(g, 4, 6, 8, 7, "#6a8ab0"); P(g, 5, 5, 6, 1, "#7a9ac0"); P(g, 12, 7, 3, 2, "#6a8ab0");
        P(g, 2, 5, 3, 2, "#5a7aa0"); P(g, 1, 4, 1, 4, "#5a7aa0"); break;
      case "axe":
        P(g, 8, 3, 2, 11, "#8a6340"); P(g, 4, 3, 5, 4, "#a8a8b0"); P(g, 3, 4, 2, 2, "#c8c8d0"); break;
      case "pick":
        P(g, 8, 3, 2, 11, "#8a6340"); P(g, 3, 3, 10, 2, "#a8a8b0"); P(g, 3, 5, 2, 2, "#88888f"); P(g, 11, 5, 2, 2, "#88888f"); break;
      case "seeds":
        P(g, 3, 3, 10, 10, "#d8b878"); P(g, 4, 4, 8, 3, "#c04a3c"); P(g, 6, 8, 1, 2, "#5a3a1e"); P(g, 9, 9, 1, 2, "#5a3a1e"); P(g, 7, 11, 1, 2, "#5a3a1e"); break;
      case "wood":
        P(g, 2, 6, 12, 4, "#8a6340"); P(g, 2, 6, 12, 1, "#a87745"); P(g, 3, 10, 12, 4, "#7a5330"); P(g, 13, 6, 2, 4, "#c8a878"); break;
      case "stone":
        P(g, 4, 6, 8, 7, "#8a8a92"); P(g, 5, 5, 5, 2, "#a2a2aa"); P(g, 4, 11, 8, 2, "#66666e"); break;
      case "food":
        P(g, 4, 4, 8, 8, "#d8a850"); P(g, 4, 4, 8, 3, "#e8c880"); P(g, 6, 8, 4, 2, "#a86838"); P(g, 3, 6, 1, 5, "#c89840"); break;
      case "gold":
        g.fillStyle = "#e8c85a"; g.beginPath(); g.arc(8, 8, 6, 0, 7); g.fill();
        g.fillStyle = "#c8a83a"; g.beginPath(); g.arc(8, 8, 4, 0, 7); g.fill();
        P(g, 7, 5, 2, 6, "#e8c85a"); break;
      case "energy":
        g.fillStyle = "#e8a83a"; g.beginPath();
        g.moveTo(9, 1); g.lineTo(4, 9); g.lineTo(7, 9); g.lineTo(6, 15); g.lineTo(12, 6); g.lineTo(9, 6); g.fill(); break;
      case "rod": // canne à pêche : manche en bois, fil et flotteur
        P(g, 3, 13, 10, 2, "#8a6340"); P(g, 4, 12, 8, 1, "#a87745");
        for (let i = 0; i < 10; i++) P(g, 12 - i, 12 - i, 1, 1, "#c8c8d0"); // canne diagonale
        P(g, 2, 2, 1, 8, "#d8d8e0"); // fil
        P(g, 1, 9, 3, 3, "#e03e2e"); P(g, 2, 10, 1, 1, "#fff"); // flotteur
        break;
      case "ready": // bulle "prêt à récolter" (culture mûre)
        g.fillStyle = "#ffe060"; g.beginPath(); g.arc(8, 7, 6, 0, 7); g.fill();
        g.fillStyle = "#c8a83a"; g.beginPath(); g.arc(8, 7, 6, 0, 7); g.lineWidth = 1; g.stroke();
        P(g, 5, 12, 4, 3, "#ffe060"); // pointe de la bulle
        g.fillStyle = "#5a3e00"; P(g, 7, 3, 2, 5, "#5a3e00"); P(g, 7, 9, 2, 2, "#5a3e00"); // "!"
        break;
      case "herd": // main ouverte : outil pour attraper/déposer un animal
        P(g, 5, 7, 7, 6, "#e8b888"); // paume
        P(g, 4, 3, 2, 5, "#e8b888"); P(g, 6, 2, 2, 6, "#e8b888");
        P(g, 8, 2, 2, 6, "#e8b888"); P(g, 10, 4, 2, 5, "#e8b888");
        P(g, 4, 7, 2, 1, "#c89468"); P(g, 6, 7, 6, 1, "#c89468"); // ombre paume/doigts
        break;
      case "thirst": // goutte barrée : culture plantée non arrosée
        g.fillStyle = "#5a9be0";
        g.beginPath(); g.moveTo(8, 2); g.quadraticCurveTo(13, 9, 8, 14); g.quadraticCurveTo(3, 9, 8, 2); g.fill();
        g.fillStyle = "#a8d4f0"; g.beginPath(); g.arc(6, 9, 1.4, 0, 7); g.fill();
        g.strokeStyle = "#d43a2e"; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(2, 3); g.lineTo(14, 13); g.stroke();
        break;
      case "flour": // sac de farine (chantier 2026-07, transformation artisanale demandée par Guillaume)
        g.fillStyle = "#ede0c4"; // toile du sac
        g.beginPath(); g.moveTo(4, 4); g.quadraticCurveTo(2, 9, 4, 14); g.lineTo(12, 14); g.quadraticCurveTo(14, 9, 12, 4); g.fill();
        P(g, 5, 2, 6, 3, "#c9a25a");   // liseré noué en haut
        P(g, 6, 1, 4, 1, "#8a6340");   // ficelle
        g.strokeStyle = "rgba(140,110,70,.5)"; g.lineWidth = 1;
        g.beginPath(); g.moveTo(5, 8); g.lineTo(11, 8); g.moveTo(5, 11); g.lineTo(11, 11); g.stroke(); // coutures
        P(g, 3, 12, 1, 1, "#fff6e6"); // grain de farine échappé
        break;
      default: break;
    }
    return c;
  }
  // Gemme (losange) d'une couleur donnée, pour l'inventaire / le bac.
  function gemIcon(col) {
    const [c, g] = cv(T, T);
    g.fillStyle = col; g.beginPath();
    g.moveTo(8, 2); g.lineTo(13, 7); g.lineTo(8, 14); g.lineTo(3, 7); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath();
    g.moveTo(8, 2); g.lineTo(11, 6); g.lineTo(8, 8); g.lineTo(5, 6); g.closePath(); g.fill();
    P(g, 6, 9, 1, 1, "rgba(255,255,255,.5)");
    return c;
  }
  // Poisson d'une couleur donnée.
  function fishIcon(col) {
    const [c, g] = cv(T, T);
    g.fillStyle = col; g.beginPath(); g.ellipse(8, 8, 5, 3, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(12, 8); g.lineTo(15, 5); g.lineTo(15, 11); g.closePath(); g.fill(); // queue
    P(g, 4, 7, 1, 1, "#1a1a1a"); // oeil
    g.fillStyle = "rgba(255,255,255,.35)"; P(g, 7, 6, 3, 1);
    return c;
  }

  /* -------- 2026-07 station update: sea creatures, ducks, station -------- */
  // Sea creature icons (inventory / sell bin), one per C.SEA_CREATURES entry.
  function seaIcon(kind, col) {
    const [c, g] = cv(T, T);
    if (kind === 0) { // starfish: 5 chunky arms
      P(g, 7, 2, 2, 5, col); P(g, 2, 6, 5, 2, col); P(g, 9, 6, 5, 2, col);
      P(g, 4, 9, 2, 5, col); P(g, 10, 9, 2, 5, col); P(g, 6, 6, 4, 4, col);
      P(g, 7, 7, 1, 1, "#ffffff55"); P(g, 9, 8, 1, 1, "#00000022");
    } else if (kind === 1) { // seahorse: curled S profile
      P(g, 7, 2, 4, 3, col); P(g, 10, 3, 2, 2, col); P(g, 6, 5, 3, 4, col); P(g, 7, 9, 3, 3, col);
      P(g, 9, 12, 2, 2, col); P(g, 8, 13, 2, 1, col);
      P(g, 5, 3, 2, 1, col); P(g, 5, 5, 1, 1, col); // crest + snout
      P(g, 9, 3, 1, 1, "#1a1a1a");
    } else { // eel: long wavy body
      P(g, 2, 5, 5, 2, col); P(g, 6, 7, 5, 2, col); P(g, 10, 9, 4, 2, col);
      P(g, 2, 4, 2, 1, col); P(g, 3, 5, 1, 1, "#1a1a1a");
      P(g, 6, 7, 3, 1, "rgba(255,255,255,.25)");
    }
    return c;
  }
  // Floating duck, 2 bobbing frames (purely decorative on the river).
  function duckSprite(frame) {
    const [c, g] = cv(T, T);
    const dy = frame ? 1 : 0;
    P(g, 4, 7 + dy, 8, 5, "#e8dcc0");             // body
    P(g, 4, 11 + dy, 8, 1, "#c8bc9e");            // waterline shadow
    P(g, 10, 4 + dy, 4, 4, "#e8dcc0");            // head
    P(g, 14, 5 + dy, 2, 2, "#e8952a");            // beak
    P(g, 12, 5 + dy, 1, 1, "#1a1a1a");            // eye
    P(g, 5, 8 + dy, 4, 2, "#c8a86a");             // wing
    P(g, 3, 12 + dy, 10, 1, "rgba(168,212,240,0.8)"); // ripple
    return c;
  }
  // Rail tile (vertical track), tiled along the west edge.
  function railTile() {
    const [c, g] = cv(T, T), r = makeRnd(413);
    P(g, 0, 0, T, T, "#7a6a52");
    for (let i = 0; i < 10; i++) P(g, (r() * T) | 0, (r() * T) | 0, 1, 1, r() < 0.5 ? "#6d5e47" : "#8a795e");
    P(g, 1, 3, 14, 2, "#5a4630"); P(g, 1, 3, 14, 1, "#6b5238");   // sleepers
    P(g, 1, 10, 14, 2, "#5a4630"); P(g, 1, 10, 14, 1, "#6b5238");
    P(g, 3, 0, 2, T, "#8f9aa5"); P(g, 11, 0, 2, T, "#8f9aa5");    // rails
    P(g, 3, 0, 1, T, "#b9c2cc"); P(g, 11, 0, 1, T, "#b9c2cc");
    return c;
  }
  // Platform tile (stone-edged planks).
  function platformTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 0, T, T, "#b8a888");
    P(g, 0, 4, T, 1, "#a89878"); P(g, 0, 9, T, 1, "#a89878"); P(g, 0, 14, T, 1, "#a89878");
    P(g, 0, 0, T, 1, "#cfc0a0");
    return c;
  }
  // The station building (validated mockup: brick walls, slate gable roof,
  // hanging sign + clock, awning toward the platform). Same helper style as
  // the other buildings.
  function stationSprite() {
    const W = C.STATION.w * T, H = C.STATION.h * T + 18;
    const [c, g] = cv(W, H);
    const BY = 18;
    P(g, 0, BY, W, H - BY, "#c98a52");                     // brick
    for (let y = BY; y < H; y += 4) P(g, 0, y, W, 1, "#b57944");
    for (let x = 0; x < W; x += 6) P(g, x, BY, 1, H - BY, "#b57944");
    P(g, 0, H - 5, W, 5, "#8d8d8d"); P(g, 0, H - 5, W, 1, "#a5a5a5"); // stone base
    P(g, 0, 0, W, BY, "#5d6570"); P(g, 0, 0, W, 2, "#78818c");        // slate roof
    for (let y = 3; y < BY; y += 3) P(g, 0, y, W, 1, "#525a64");
    P(g, 0, BY - 1, W, 1, "#454c55");
    const dx = (W / 2 - 6) | 0;
    P(g, dx, BY + 12, 12, H - BY - 17, "#6b4a2e"); P(g, dx, BY + 12, 12, 1, "#7d5836"); // door
    P(g, dx + 2, BY + 14, 8, 3, "#3a2d1e"); P(g, dx + 9, BY + 24, 1, 2, "#e8c860");
    for (const wx of [6, W - 16]) {                                    // windows
      P(g, wx, BY + 8, 10, 9, "#7ab4e8"); P(g, wx, BY + 8, 10, 1, "#5a94c8");
      P(g, wx + 4, BY + 8, 1, 9, "#5a94c8");
      P(g, wx - 1, BY + 7, 12, 1, "#6b4a2e"); P(g, wx - 1, BY + 17, 12, 1, "#6b4a2e");
    }
    P(g, (W / 2 - 14) | 0, 5, 28, 8, "#e8dcc0");                       // hanging sign
    P(g, (W / 2 - 14) | 0, 5, 28, 1, "#c8bc9e");
    P(g, (W / 2 - 11) | 0, 8, 22, 2, "#7d5836");
    P(g, W - 12, 4, 8, 8, "#f2f2f2"); P(g, W - 9, 7, 1, 3, "#333333"); // clock
    P(g, W - 8, 7, 2, 1, "#333333");
    return c;
  }
  // The ad board on the platform (interactive: press E). Symmetric SHORT
  // legs (Guillaume's mockup note: the right leg was too long).
  function signBoardSprite() {
    const [c, g] = cv(18, 22);
    P(g, 2, 12, 2, 8, "#6b4a2e"); P(g, 14, 12, 2, 8, "#6b4a2e"); // equal legs
    P(g, 0, 0, 18, 14, "#8a5c35"); P(g, 0, 0, 18, 1, "#9a6c45");
    P(g, 2, 2, 6, 5, "#e8dcc0"); P(g, 10, 3, 5, 6, "#f0e8a0");   // pinned notices
    P(g, 2, 9, 11, 3, "#e8dcc0");
    return c;
  }
  // The little train (engine + one passenger car), drawn vertically; slides
  // in from the north when a visitor arrives.
  function trainSprite() {
    const [c, g] = cv(20, 92);
    P(g, 5, 0, 10, 8, "#4a4a4a");                     // boiler nose
    P(g, 7, 2, 6, 4, "#333333");                      // chimney base
    P(g, 3, 8, 14, 30, "#8a3030"); P(g, 3, 8, 14, 2, "#a54040"); // engine
    P(g, 5, 12, 10, 7, "#7ab4e8");                    // cab window
    P(g, 2, 36, 16, 3, "#3a3a3a");                    // chassis
    P(g, 3, 42, 14, 44, "#4a6a9a"); P(g, 3, 42, 14, 2, "#5a7aaa"); // car
    for (const wy of [47, 58, 69]) { P(g, 5, wy, 4, 6, "#cfe4f4"); P(g, 11, wy, 4, 6, "#cfe4f4"); }
    P(g, 2, 87, 16, 3, "#3a3a3a");
    return c;
  }

  /* ---------------- Bâtiments et animaux ---------------- */
  // Cheval (refonte chantier 2026-07, demande Guillaume : "le cheval doit
  // décrire une action de galop quand il se déplace, + de détail sur la
  // course") : sprite paramétré par frame, sur le modèle de wolfSprite/
  // rabbitSprite. frame 0 = à l'arrêt (pose d'origine, pattes verticales),
  // utilisée aussi pour le cheval libre non monté. frames 1..3 = cycle de
  // galop : les paires de pattes avant/arrière s'étendent en oblique puis se
  // regroupent sous le corps, le corps rebondit d'un pixel, la queue passe à
  // l'horizontale (soufflée) et la crinière flotte vers l'arrière.
  function horseSprite(frame) {
    const f = (frame || 0) % 4;
    const [c, g] = cv(28, 24); // vu de profil (regarde à droite)
    const body = "#8a5a34", light = "#a5764a", dark = "#6a4426", shade = "#5a3a20",
      mane = "#3a2a18", maneDeep = "#2a1c10", hoof = "#2a2018", saddle = "#7a3020", saddleLight = "#9a4a30";
    const bob = [0, -1, 0, 0][f];   // rebond vertical du corps (phase d'envol)
    const ext = [0, 5, 1, -4][f];   // pattes avant : étendues vers l'avant / regroupées
    const ext2 = [0, -5, -1, 4][f]; // pattes arrière : opposées (étendues vers l'arrière)
    const b = 10 + bob;             // ligne de dos
    P(g, 6, b, 15, 7, body);           // corps
    P(g, 6, b, 15, 2, light);          // reflet sur le dos
    P(g, 6, b + 6, 15, 1, shade);      // ombre sous le ventre
    P(g, 19, b - 4, 6, 7, body);       // encolure
    P(g, 19, b - 4, 6, 2, light);
    P(g, 23, b - 7, 5, 6, body);       // tête
    P(g, 23, b - 7, 5, 1, light);
    P(g, 24, b - 9, 2, 3, body); P(g, 24, b - 9, 1, 2, dark); // oreille
    P(g, 27, b - 5, 1, 3, dark);       // museau
    P(g, 27, b - 3, 1, 1, "#3a2418");  // naseau
    P(g, 24, b - 6, 3, 2, mane);       // toupet
    // Crinière : flotte d'un pixel vers l'arrière en pleine extension.
    P(g, 19 - (f === 1 ? 1 : 0), b - 5, 2, 6, mane);
    P(g, 20 - (f === 1 ? 1 : 0), b - 5, 1, 6, maneDeep);
    // Queue : tombante à l'arrêt, soufflée à l'horizontale au galop.
    if (f === 1 || f === 2) { P(g, 0, b, 6, 2, mane); P(g, 0, b + 1, 6, 1, maneDeep); }
    else { P(g, 1, b + 1, 6, 3, mane); P(g, 1, b + 2, 6, 1, maneDeep); }
    P(g, 10, b - 2, 8, 3, saddle);     // selle (support pour un ou deux cavaliers)
    P(g, 10, b - 2, 8, 1, saddleLight);
    P(g, 9, b, 1, 2, "#5a2418"); P(g, 18, b, 1, 2, "#5a2418"); // sangle
    // Pattes : haut de patte à mi-extension (ext >> 1), sabot à pleine
    // extension — l'écart donne l'oblique de la foulée. Un pixel plus
    // courtes en phase regroupée (f=3), pattes "rentrées" sous le corps.
    const legH = f === 3 ? 5 : 6;
    const ly = b + 7;
    P(g, 7 + (ext2 >> 1), ly, 2, legH, dark);  P(g, 7 + ext2, ly + legH - 1, 2, 2, hoof);  // arrière int.
    P(g, 12 + (ext2 >> 1), ly, 2, legH, body); P(g, 12 + ext2, ly + legH - 1, 2, 2, hoof); // arrière ext.
    P(g, 16 + (ext >> 1), ly, 2, legH, dark);  P(g, 16 + ext, ly + legH - 1, 2, 2, hoof);  // avant int.
    P(g, 19 + (ext >> 1), ly, 2, legH, body);  P(g, 19 + ext, ly + legH - 1, 2, 2, hoof);  // avant ext.
    P(g, 25, b - 5, 1, 1, "#1a1a1a");  // oeil
    P(g, 25, b - 6, 1, 1, "#e8dcc8");  // reflet dans l'oeil
    return c;
  }
  // Loup (chantier 2026-07, demande Guillaume : "loups assez détaillés... avec
  // mouvements de pattes"). Vu de profil (regarde à droite, comme le cheval),
  // silhouette basse et fine typique du loup (dos qui remonte vers l'arrière-
  // train, grandes oreilles pointues, museau allongé, queue touffue tombante).
  // 4 frames de marche (cycle classique quadrupède : les pattes avant/arrière
  // opposées avancent ensemble, puis l'autre paire) pour une démarche crédible
  // aux 2 vitesses de déplacement (marche lente/rapide n'utilisent que le
  // TIMING du cycle, pas des frames différentes — voir FermeGame.js). frame=0
  // sert aussi de pose "à l'arrêt" (pattes jointes), utilisée pour l'état
  // arrêté (guet, repas).
  function wolfSprite(frame) {
    const [c, g] = cv(30, 22);
    const body = "#6b6b6d", light = "#8a8a8c", dark = "#4a4a4c", shade = "#3a3a3c",
      belly = "#a8a8a2", ear = "#3a3a3c", snoutDark = "#232325", eye = "#e0b840", paw = "#2a2a2c";
    // Décalage des pattes selon la frame (0 = jointes/arrêt, 1..3 = cycle).
    const off = [0, 3, 0, -3][frame % 4]; // avant-gauche/arrière-droite
    const off2 = -off;                    // avant-droite/arrière-gauche (opposées)
    // Queue touffue, tombante, qui suit légèrement le mouvement.
    P(g, 1, 8, 5, 3, dark); P(g, 1, 8, 5, 1, body);
    P(g, 0, 10, 3, 3, shade);
    // Corps (dos qui remonte vers l'arrière-train, silhouette louve).
    P(g, 5, 9, 15, 6, body);
    P(g, 5, 9, 15, 2, light);           // reflet sur le dos
    P(g, 5, 14, 15, 1, shade);          // ombre sous le ventre
    P(g, 8, 13, 9, 2, belly);           // ventre plus clair
    // Encolure + tête (museau allongé pointant vers l'avant/bas, typique loup).
    P(g, 18, 5, 7, 7, body);
    P(g, 18, 5, 7, 2, light);
    P(g, 24, 4, 5, 5, body);            // tête
    P(g, 27, 6, 3, 2, snoutDark);       // museau sombre
    P(g, 29, 7, 1, 1, "#151517");       // truffe
    P(g, 20, 1, 2, 4, ear); P(g, 20, 1, 1, 3, dark);   // oreille (grande, pointue)
    P(g, 24, 1, 2, 4, ear); P(g, 25, 1, 1, 3, dark);   // 2e oreille
    P(g, 25, 6, 1, 1, eye);             // oeil (jaune, typique loup)
    // Pattes avant (2), décalées en frame pour l'animation de marche.
    P(g, (7 + off) | 0, 15, 2, 6, dark); P(g, (7 + off) | 0, 20, 2, 2, paw);
    P(g, (12 + off2) | 0, 15, 2, 6, body); P(g, (12 + off2) | 0, 20, 2, 2, paw);
    // Pattes arrière (2, plus musclées à l'arrière-train), même logique.
    P(g, (17 + off2) | 0, 14, 3, 7, dark); P(g, (17 + off2) | 0, 20, 3, 2, paw);
    P(g, (21 + off) | 0, 14, 3, 7, body); P(g, (21 + off) | 0, 20, 3, 2, paw);
    return c;
  }
  // Lapin (chantier 2026-07, demande Guillaume : "petits lapins bien
  // détaillés qui fuient et sont inoffensifs"). Vu de profil (regarde à
  // droite, comme le loup/cheval), petite silhouette basse, grandes oreilles
  // dressées, queue en pompon. 3 frames de saut (accroupi/tendu/en l'air,
  // cycle de bond plutôt qu'une marche à 4 temps comme le loup — un lapin ne
  // "marche" pas, il bondit) ; frame=0 sert aussi de pose "à l'arrêt"
  // (immobile, aux aguets) pour l'état arrêté/roam lent.
  function rabbitSprite(frame) {
    const [c, g] = cv(16, 14);
    const body = "#a9744f", light = "#c99568", dark = "#7d5335", belly = "#ecdcc4",
      ear = "#c99568", earInner = "#e2a08a", eye = "#1a1a1a", nose = "#5a2418";
    // Décalage vertical du corps + des pattes selon la phase de bond.
    const hop = [0, -2, -1][frame % 3];      // 0=accroupi, 1=apogée du bond, 2=retombée
    const legStretch = [0, 2, 1][frame % 3]; // pattes arrière plus tendues à l'appui
    // Queue en pompon (arrière).
    P(g, 1, 6 + hop, 2, 2, belly);
    // Corps (dos rond typique du lapin).
    P(g, 3, 4 + hop, 8, 5, body);
    P(g, 3, 4 + hop, 8, 1, light);
    P(g, 4, 8 + hop, 6, 1, dark);         // ombre sous le ventre
    P(g, 4, 7 + hop, 5, 1, belly);        // ventre clair
    // Tête + museau (avant/bas).
    P(g, 9, 3 + hop, 4, 4, body);
    P(g, 12, 5 + hop, 1, 1, nose);        // truffe
    P(g, 11, 4 + hop, 1, 1, belly);       // joue claire
    P(g, 10, 4 + hop, 1, 1, eye);         // oeil
    // Oreilles dressées, longues et fines.
    P(g, 9, 0 + hop, 1, 4, ear); P(g, 9, 1 + hop, 1, 2, earInner);
    P(g, 11, 0 + hop, 1, 4, ear); P(g, 11, 1 + hop, 1, 2, earInner);
    // Pattes avant (courtes).
    P(g, 4, 9 + hop, 1, 2, dark); P(g, 9, 9 + hop, 1, 2, dark);
    // Pattes arrière (puissantes, tendues à l'appui du bond).
    P(g, 2, (9 - legStretch) + hop, 2, 2 + legStretch, dark);
    P(g, 7, (9 - legStretch) + hop, 2, 2 + legStretch, dark);
    return c;
  }
  // Torche portative (chantier 2026-07) : bouton dédié (comme le sifflet à
  // chevaux), pas un slot d'outil numéroté. Flamme dessinée séparément de la
  // hampe pour pouvoir la faire vaciller légèrement à l'affichage (voir
  // FermeGame.js, qui redessine juste la pointe avec un décalage variable).
  function torchSprite() {
    const [c, g] = cv(14, 20);
    P(g, 5, 9, 3, 10, "#7a5330");  // manche en bois
    P(g, 5, 9, 1, 10, "#9a6f42");
    P(g, 3, 6, 7, 4, "#5a4020");   // tête ficelée
    g.fillStyle = "#f0a838"; g.beginPath(); g.moveTo(7, 0); g.lineTo(11, 6); g.lineTo(7, 5); g.lineTo(3, 6); g.fill(); // flamme
    g.fillStyle = "#ffe27a"; g.beginPath(); g.moveTo(7, 2); g.lineTo(9, 6); g.lineTo(7, 5); g.lineTo(5, 6); g.fill();  // coeur clair de la flamme
    return c;
  }
  // Tabouret de pêche + canne tenue (demande Guillaume : "la canne à pêche et
  // le tabouret doivent être faits en pixel art, pour rester cohérents avec
  // l'univers du jeu") : remplace les overlays emoji 🪑/🎣 de Soan en pêche
  // (FermeGame.js, drawCharacter) par des sprites générés au même style que
  // le reste de l'atlas (blocs pleins + boucle diagonale, comme torchSprite/
  // l'icône outil "rod" ci-dessus dont la canne reprend le principe).
  function stoolSprite() {
    const [c, g] = cv(14, 14);
    P(g, 2, 4, 10, 3, "#8a6340");  // assise en bois
    P(g, 2, 4, 10, 1, "#a87745"); // reflet sur l'assise
    g.strokeStyle = "#6a4a2a"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(3, 7); g.lineTo(11, 13); g.stroke();  // pied croisé 1 (tabouret pliant)
    g.beginPath(); g.moveTo(11, 7); g.lineTo(3, 13); g.stroke();  // pied croisé 2
    return c;
  }
  function fishingRodHeldSprite() {
    const [c, g] = cv(18, 26);
    P(g, 8, 20, 3, 6, "#5a4020");  // poignée en bois
    P(g, 8, 20, 1, 6, "#7a5a34"); // reflet poignée
    for (let i = 0; i < 17; i++) P(g, 16 - i, 19 - i, 1, 1, "#c8c8d0"); // canne diagonale, poignée -> pointe
    P(g, 0, 2, 1, 16, "#d8d8e0"); // fil tendu de la pointe vers l'eau
    P(g, 0, 17, 3, 3, "#e03e2e"); // flotteur
    P(g, 1, 18, 1, 1, "#fff");
    return c;
  }
  // fin surmonté d'une lanterne. Dessiné plus haut qu'une tuile (comme le
  // puits), donc dans le calque "draws" trié par profondeur, pas la boucle de
  // sol. La lanterne est toujours dessinée "éteinte" ici : son halo lumineux
  // de nuit est un effet de rendu séparé (percé dans l'overlay nocturne),
  // pas une variante de sprite.
  function lampSprite() {
    const [c, g] = cv(16, 32);
    P(g, 7, 14, 2, 16, "#3a3a40"); // poteau
    P(g, 6, 28, 4, 2, "#2a2a30");  // base
    P(g, 4, 16, 8, 2, "#4a4a52");  // bras
    g.fillStyle = "#5a5a62"; g.beginPath(); g.moveTo(3, 8); g.lineTo(13, 8); g.lineTo(11, 14); g.lineTo(5, 14); g.fill(); // cage
    P(g, 5, 3, 6, 6, "#f0d878"); // vitre/lanterne (teinte chaude, "éteinte" le jour)
    P(g, 6, 2, 4, 1, "#3a3a40");
    return c;
  }
  // Épouvantail (chantier 2026-07, achetable/posable par les joueurs) : croix
  // de bois habillée de paille/vieux vêtements, chapeau de paille. Dessiné
  // plus haut qu'une tuile (comme le lampadaire/le puits), donc dans le
  // calque "draws" trié par profondeur, pas la boucle de sol.
  function scarecrowSprite() {
    const [c, g] = cv(16, 32);
    P(g, 7, 20, 2, 8, "#7a5330"); // piquet planté au sol
    P(g, 2, 12, 12, 2, "#8a6038"); // traverse (bras)
    P(g, 4, 10, 8, 12, "#d4b25a"); // torse en paille
    P(g, 3, 12, 2, 6, "#c49a4a"); P(g, 11, 12, 2, 6, "#c49a4a"); // manches
    P(g, 5, 22, 3, 4, "#8a6a3a"); P(g, 8, 22, 3, 4, "#6a5230"); // jambes en paille
    g.fillStyle = "#e8d8b0"; g.beginPath(); g.arc(8, 7, 4, 0, 7); g.fill(); // tête (sac de toile)
    P(g, 5, 6, 2, 1, "#2a2a30"); P(g, 9, 6, 2, 1, "#2a2a30"); // yeux cousus
    P(g, 6, 9, 4, 1, "#a83c30"); // bouche cousue
    P(g, 3, 2, 10, 3, "#c9a227"); P(g, 2, 4, 12, 2, "#b8912a"); // chapeau de paille
    return c;
  }
  // Levier de pont (chantier 2026-07, demande Guillaume) : petit poteau planté
  // dans la berge avec un manche articulé. `up` = manche levé vers la droite
  // (pont ouvert), `down` = manche baissé vers la gauche (pont fermé) — un
  // repère visuel simple et lisible à distance, sans nouveau concept d'anim.
  function leverSprite(up) {
    const [c, g] = cv(16, 24);
    P(g, 6, 14, 4, 8, "#5a5a62");  // socle planté au sol
    P(g, 6, 20, 4, 2, "#3a3a40");
    g.fillStyle = "#7a5330"; g.beginPath(); g.arc(8, 13, 2, 0, 7); g.fill(); // articulation
    g.strokeStyle = "#8a6038"; g.lineWidth = 2; g.lineCap = "round";
    g.beginPath(); g.moveTo(8, 13);
    if (up) g.lineTo(13, 4); else g.lineTo(3, 6);
    g.stroke();
    g.fillStyle = up ? "#8ac25a" : "#e06a50"; // boule au bout du manche, couleur = état
    g.beginPath(); g.arc(up ? 13 : 3, up ? 4 : 6, 2, 0, 7); g.fill();
    return c;
  }
  // Moulin (chantier 2026-07, transformation artisanale demandée par
  // Guillaume : "prévoir la construction de bâtiments simples (fût, presse,
  // four)"). Premier bâtiment de cette famille : petite bâtisse en bois sur
  // soubassement de pierre, toit en pente, avec une roue à aubes sur le
  // flanc (symbole lisible de "moulin" même sans rotation animée, gardé
  // simple comme demandé) et un sac de blé/farine posé contre l'entrée pour
  // l'ambiance artisanale. Dessiné plus haut qu'une tuile (comme le puits/le
  // lampadaire), donc dans le calque "draws" trié par profondeur, pas la
  // boucle de sol. Taille intermédiaire (ni trop grand, ni trop petit,
  // demande explicite de Guillaume) : un peu plus large qu'une case, un peu
  // moins haut que la maison.
  function millSprite() {
    // Moulin refondu (maquette validée 2026-07) : tour en pierre, calotte
    // bois, AILES de moulin à vent (lattes bois + toile écrue) remplaçant
    // l'ancienne roue à aubes. Même canevas 30x36, même ancrage de rendu.
    const [c, g] = cv(30, 36);
    const r = makeRnd(3);
    bStones(g, 9, 14, 12, 20, r, ["#b8b0a2", "#d0c8ba", "#a09888"], 4);
    g.fillStyle = "#7a5330"; g.beginPath(); g.moveTo(7, 15); g.lineTo(15, 7); g.lineTo(23, 15); g.fill();
    P(g, 8, 13, 14, 1, "#6a4426"); P(g, 10, 10, 10, 1, "#6a4426");
    // 4 ailes en diagonale : latte bois + bande de toile
    for (let i = 3; i < 13; i++) {
      for (const sx of [1, -1]) for (const sy of [1, -1]) {
        const xx = 15 + sx * i, yy = 12 + sy * i;
        if (xx >= 0 && xx < 30 && yy >= 0 && yy < 36) {
          P(g, xx, yy, 1, 1, "#5a4028");
          const tx = xx + sx;
          if (i >= 5 && tx >= 0 && tx < 30) P(g, tx, yy, 1, 1, i % 3 ? "#eae2cc" : "#d8cfb2");
        }
      }
    }
    P(g, 14, 11, 2, 2, "#3a2818"); // moyeu
    P(g, 12, 26, 6, 8, "#5a3d24"); P(g, 12, 26, 6, 1, "#6a4a2c"); // porte
    P(g, 12, 18, 5, 4, "#cfe0e8"); P(g, 12, 18, 5, 1, "#3a3a40"); // fenêtre
    // sac de farine contre l'entrée
    P(g, 22, 28, 5, 6, "#d8b878"); P(g, 22, 27, 5, 2, "#b8912a");
    return c;
  }

  // Chaudron en métal (chantier 2026-07 : remplace l'ancien rendu emoji
  // ⚗️ flottant, demande explicite Guillaume "un joli chaudron type
  // métal, pas une image qui flotte"). Panse en fonte noire, rebord et
  // reflets en gris acier, trois pieds courts, anse arquée, liquide en
  // ébullition (violet, cohérent avec la teinte "améthyste" déjà utilisée
  // pour la lueur côté maléfique) avec quelques bulles et un mince filet
  // de vapeur. Dessiné plus haut qu'une tuile (comme le puits/lampadaire),
  // donc dans le calque "draws" trié par profondeur, pas la boucle de sol.
  function cauldronSprite() {
    const [c, g] = cv(20, 24);
    // vapeur légère au-dessus (statique, pas d'animation de flottement)
    g.strokeStyle = "rgba(220,220,230,0.5)"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(7, 4); g.quadraticCurveTo(5, 1, 7, -1); g.stroke();
    g.beginPath(); g.moveTo(12, 4); g.quadraticCurveTo(14, 1, 12, -1); g.stroke();
    // anse arquée en fer
    g.strokeStyle = "#2a2a30"; g.lineWidth = 2;
    g.beginPath(); g.arc(10, 9, 7, Math.PI, 0); g.stroke();
    // panse en fonte (corps arrondi)
    g.fillStyle = "#2e2e34";
    g.beginPath(); g.moveTo(2, 10); g.quadraticCurveTo(2, 21, 10, 21); g.quadraticCurveTo(18, 21, 18, 10);
    g.lineTo(18, 9); g.lineTo(2, 9); g.fill();
    // reflet métallique (haut-gauche)
    g.fillStyle = "#4a4a54";
    g.beginPath(); g.moveTo(3, 10); g.quadraticCurveTo(3, 17, 7, 20); g.lineTo(6, 20); g.quadraticCurveTo(3, 16, 3, 10); g.fill();
    P(g, 4, 12, 2, 6, "#5a5a66"); // liseré de reflet
    // rebord épais du chaudron
    P(g, 1, 7, 18, 3, "#3a3a42");
    P(g, 1, 7, 18, 1, "#57575f");
    // liquide en ébullition (potion), visible juste sous le rebord
    P(g, 4, 8, 12, 1, "#8a5ad0");
    g.fillStyle = "#a97ee8";
    g.beginPath(); g.arc(7, 8, 1, 0, 7); g.arc(11, 8, 1.2, 0, 7); g.arc(14, 8, 0.8, 0, 7); g.fill();
    // pieds courts en fonte
    P(g, 2, 20, 3, 3, "#26262c"); P(g, 15, 20, 3, 3, "#26262c"); P(g, 8.5, 21, 3, 3, "#26262c");
    return c;
  }
  function well() {
    // Puits refondu (maquette validée 2026-07) : toit de tuiles, treuil avec
    // tambour + corde + seau en métal, margelle en moellons, eau visible.
    const [c, g] = cv(24, 30);
    for (let row = 0; row < 2; row++) {
      const yy = 3 + row * 4;
      P(g, 2, yy, 20, 4, "#c04a3c");
      P(g, 2, yy + 3, 20, 1, "#7c2a22");
      for (let x = 2 + (row % 2 ? 2 : 0); x < 22; x += 5) { P(g, x, yy, 1, 3, "#7c2a22"); P(g, x + 1, yy, 1, 1, "#d4635a"); }
    }
    P(g, 1, 10, 22, 2, "#6a241e");
    P(g, 3, 12, 2, 10, "#6a4a2c"); P(g, 19, 12, 2, 10, "#6a4a2c"); // poteaux
    P(g, 5, 13, 14, 2, "#5a4028");  // axe du treuil
    P(g, 10, 12, 4, 4, "#8a6340");  // tambour
    P(g, 11, 16, 1, 5, "#3a2818");  // corde
    P(g, 9, 20, 5, 3, "#8a8a92"); P(g, 9, 20, 5, 1, "#a4a4ae"); // seau métal
    const r = makeRnd(9);
    bStones(g, 2, 22, 20, 8, r, ["#9a9aa4", "#b8b8c2", "#84848e"], 4);
    P(g, 5, 24, 14, 4, "#20303c"); // eau sombre visible
    P(g, 8, 25, 3, 1, "#3a5a74"); P(g, 14, 26, 2, 1, "#3a5a74");
    return c;
  }

  // Clôture HORIZONTALE : les deux lisses courent sur toute la LARGEUR de la
  // tuile (y=6 et y=11), donc se prolongent sans coupure d'une tuile à
  // l'autre quand plusieurs tuiles sont posées côte à côte horizontalement.
  function fenceTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 6, T, 2, "#a87745"); P(g, 0, 11, T, 2, "#8a6038"); // lisses
    P(g, 2, 3, 2, 11, "#9a6b3f"); P(g, 10, 3, 2, 11, "#9a6b3f"); // poteaux
    P(g, 2, 3, 2, 1, "#b8834f"); P(g, 10, 3, 2, 1, "#b8834f");
    return c;
  }
  // Clôture VERTICALE (miroir de la précédente, x<->y) : les deux lisses
  // courent sur toute la HAUTEUR de la tuile, donc se prolongent sans coupure
  // d'une tuile à l'autre quand la clôture descend/monte verticalement.
  // Corrige le bug signalé : utiliser le sprite horizontal sur un bord
  // vertical laissait un vide entre chaque tuile (la clôture ne semblait
  // jamais se refermer).
  function fenceTileV() {
    const [c, g] = cv(T, T);
    P(g, 6, 0, 2, T, "#a87745"); P(g, 11, 0, 2, T, "#8a6038"); // lisses
    P(g, 3, 2, 11, 2, "#9a6b3f"); P(g, 3, 10, 11, 2, "#9a6b3f"); // traverses
    P(g, 3, 2, 11, 1, "#b8834f"); P(g, 3, 10, 11, 1, "#b8834f");
    return c;
  }
  // Poteau d'angle : jonction d'un bord horizontal ET vertical (les 4 coins
  // de l'enclos). Un poteau plein + un moignon de lisse dans les deux
  // directions, pour que le coin se lise comme un vrai point d'ancrage.
  function fenceTileCorner() {
    const [c, g] = cv(T, T);
    P(g, 0, 6, T, 2, "#a87745"); P(g, 6, 0, 2, T, "#a87745"); // lisses (croix)
    P(g, 0, 11, T, 2, "#8a6038"); P(g, 11, 0, 2, T, "#8a6038");
    P(g, 4, 4, 8, 8, "#9a6b3f"); // poteau plein
    P(g, 4, 4, 8, 2, "#b8834f");
    return c;
  }
  // Poteau isolé : section de clôture posée librement par le joueur sans
  // aucune section voisine encore adjacente.
  function fenceTilePost() {
    const [c, g] = cv(T, T);
    P(g, 6, 3, 4, 11, "#9a6b3f");
    P(g, 6, 3, 4, 2, "#b8834f");
    P(g, 5, 13, 6, 2, "#7a5330");
    return c;
  }
  // Mur en pierre (construction joueur, zip 154+) : blocs de pierre empilés,
  // un seul sprite (pas d'orientation, contrairement à la clôture) puisque
  // des blocs de pierre s'enchaînent visuellement dans n'importe quel sens.
  function wallTile() {
    const [c, g] = cv(T, T);
    P(g, 0, 0, T, T, "#8a8a92");
    P(g, 0, 0, T, 5, "#9a9aa2"); P(g, 0, 5, T, 1, "#66666e");
    P(g, 0, 10, T, 1, "#66666e");
    P(g, 1, 1, 5, 3, "#a2a2aa"); P(g, 8, 1, 6, 3, "#7a7a82");
    P(g, 0, 6, 7, 4, "#7a7a82"); P(g, 8, 6, 8, 4, "#9a9aa2");
    P(g, 1, 11, 6, 4, "#a2a2aa"); P(g, 9, 11, 6, 4, "#72727a");
    P(g, 0, 15, T, 1, "#54545c");
    return c;
  }
  // Animal de profil (16x14) : forme simple déclinée par type.
  function animalSprite(type) {
    const a = C.ANIMALS[type], [c, g] = cv(16, 14);
    const body = a.body, acc = a.accent;
    if (type === 0) { // poule
      P(g, 4, 6, 7, 5, body); P(g, 9, 3, 4, 4, body); // corps + tête
      P(g, 12, 4, 2, 1, "#e8a83a"); // bec
      P(g, 10, 2, 3, 2, acc);       // crête
      P(g, 12, 4, 1, 1, "#1a1a1a");
      P(g, 3, 8, 3, 2, body);       // queue
      P(g, 6, 11, 1, 2, "#e8a83a"); P(g, 9, 11, 1, 2, "#e8a83a");
    } else if (type === 2) { // brebis (laineuse)
      P(g, 3, 4, 10, 7, body); P(g, 4, 3, 8, 2, body);
      P(g, 2, 5, 2, 5, body); P(g, 12, 5, 2, 5, body);
      P(g, 11, 6, 4, 4, acc);       // tête
      P(g, 13, 7, 1, 1, "#1a1a1a");
      P(g, 5, 11, 1, 2, "#5a4a3a"); P(g, 10, 11, 1, 2, "#5a4a3a");
    } else { // chèvre / cochon / vache (corps allongé)
      P(g, 3, 5, 9, 6, body); P(g, 3, 5, 9, 2, tint(body));
      P(g, 10, 3, 4, 5, body);      // tête
      P(g, 13, 5, 1, 1, "#1a1a1a");
      if (type === 3) { P(g, 13, 6, 2, 1, "#c07882"); } // groin cochon
      if (type === 1) { P(g, 10, 1, 1, 3, acc); P(g, 12, 1, 1, 3, acc); } // cornes chèvre
      if (type === 4) { P(g, 3, 6, 9, 4, body); P(g, 5, 7, 2, 2, acc); P(g, 8, 8, 2, 2, acc); } // taches vache
      P(g, 4, 11, 2, 2, "#5a4636"); P(g, 9, 11, 2, 2, "#5a4636");
      P(g, 2, 6, 2, 3, body);       // queue
    }
    return c;
  }
  // Icône de production d'élevage (par type d'animal).
  function productIcon(type) {
    const [c, g] = cv(T, T);
    if (type === 0) { g.fillStyle = "#fff8ec"; g.beginPath(); g.ellipse(8, 9, 4, 5, 0, 0, 7); g.fill(); P(g, 6, 5, 2, 1, "#e8e0d0"); } // oeuf
    else if (type === 2) { g.fillStyle = "#f2f0ea"; g.beginPath(); g.arc(6, 9, 4, 0, 7); g.arc(10, 9, 4, 0, 7); g.arc(8, 6, 4, 0, 7); g.fill(); } // laine
    else if (type === 3) { g.fillStyle = "#3a2a22"; g.beginPath(); g.arc(8, 9, 5, 0, 7); g.fill(); P(g, 6, 6, 2, 2, "#5a463a"); } // truffe
    else { P(g, 5, 3, 6, 10, "#eef2f5"); P(g, 5, 3, 6, 2, "#cfd8dd"); P(g, 6, 1, 4, 2, "#9fb0b8"); P(g, 6, 5, 4, 2, "#4a8ad0"); } // bouteille de lait
    return c;
  }

  // Grange collaborative (chantier persistant, zip 158) : 3 paliers, la
  // grange grandit et se complète visuellement à chaque palier construit.
  // Paliers 1/2 : même famille de dessin que house(), palette rouge/blanc
  // "grange", taille croissante (48 / 72 px). Palier 3 (zip 161, demande
  // explicite "bien plus grand que la maison" — la maison fait 96×96px) :
  // dessin dédié, façade beaucoup plus large ET plus haute que la maison,
  // avec silo attenant à taille réelle, cupole + girouette au faîtage,
  // grande fenêtre ronde de fenil et soubassement en pierre — direction
  // validée par Guillaume sur maquette avant implémentation.
  function barnSprite(level) {
    if (level >= 3) return barnSpriteBig();
    const sz = level === 1 ? 48 : 72;
    const [c, g] = cv(sz, sz + 8);
    const wallH = Math.round(sz * 0.42);
    const baseY = sz - 4;
    // Murs
    P(g, sz * 0.06, baseY - wallH, sz * 0.88, wallH, "#a83c30");
    for (let y = baseY - wallH + 4; y < baseY; y += 6) P(g, sz * 0.06, y, sz * 0.88, 1, "#8a3028");
    P(g, sz * 0.06, baseY - wallH, sz * 0.88, 3, "#c04a3c");
    // Restyle maquette validée 2026-07 : joints de planches verticaux sur
    // le bardage rouge (lecture "planches" plutôt qu'aplat).
    for (let x = Math.round(sz * 0.06) + 5; x < sz * 0.92; x += 5) P(g, x, baseY - wallH + 3, 1, wallH - 3, "#8a3028");
    // Toit à deux pans — gris ardoise (maquette validée 2026-07)
    g.fillStyle = "#8a8a92";
    g.beginPath(); g.moveTo(0, baseY - wallH + 2); g.lineTo(sz / 2, sz * 0.08); g.lineTo(sz, baseY - wallH + 2); g.fill();
    g.fillStyle = "#a4a4ae";
    g.beginPath(); g.moveTo(sz * 0.04, baseY - wallH); g.lineTo(sz / 2, sz * 0.12); g.lineTo(sz * 0.96, baseY - wallH); g.lineTo(sz * 0.9, baseY - wallH); g.lineTo(sz / 2, sz * 0.18); g.lineTo(sz * 0.1, baseY - wallH); g.fill();
    // Porte double, cadre blanc (signature "grange")
    const doorW = sz * 0.28, doorX = sz / 2 - doorW / 2, doorY = baseY - wallH * 0.86, doorH = wallH * 0.86;
    P(g, doorX - 2, doorY - 2, doorW + 4, doorH + 2, "#f0ead8");
    P(g, doorX, doorY, doorW / 2 - 1, doorH, "#7a5330");
    P(g, doorX + doorW / 2 + 1, doorY, doorW / 2 - 1, doorH, "#7a5330");
    // Croix blanches sur les deux vantaux + rail de coulissement
    // (maquette validée 2026-07).
    for (let i = 0; i < doorH; i++) {
      const t = Math.floor(i * (doorW / 2 - 3) / doorH);
      P(g, doorX + 1 + t, doorY + i, 1, 1, "#f0ead8");
      P(g, doorX + Math.floor(doorW / 2) - 2 - t, doorY + i, 1, 1, "#f0ead8");
      P(g, doorX + Math.floor(doorW / 2) + 2 + t, doorY + i, 1, 1, "#f0ead8");
      P(g, doorX + doorW - 3 - t, doorY + i, 1, 1, "#f0ead8");
    }
    P(g, doorX - 3, doorY - 4, doorW + 6, 2, "#5a4028");
    // Grande ouverture ronde sous le pignon (silo à foin), palier 2 uniquement
    if (level >= 2) {
      g.fillStyle = "#f0ead8"; g.beginPath(); g.arc(sz / 2, baseY - wallH - sz * 0.03, sz * 0.09, 0, 7); g.fill();
      g.fillStyle = "#5a4530"; g.beginPath(); g.arc(sz / 2, baseY - wallH - sz * 0.03, sz * 0.065, 0, 7); g.fill();
    }
    return c;
  }

  // Palier 3 : dessin en coordonnées absolues (pas de mise à l'échelle d'un
  // "sz" unique comme les paliers 1/2) pour garder le plein contrôle sur les
  // proportions d'un bâtiment volontairement massif. Canevas 170×230px, à
  // comparer aux 96×96px de la maison (house()) : la grange au palier 3 est
  // donc PLUS DE 4 FOIS plus grande en surface. Budget vertical (du haut
  // vers le bas) : pointe de girouette → cupole → faîtage principal → mur →
  // fondations en pierre, tout aligné sur `baseY` (sol).
  function barnSpriteBig() {
    const W = 170, H = 230;
    const [c, g] = cv(W, H);
    const baseY = 221;
    const cx = 75; // centre horizontal du corps principal (hors silo)

    // Fondations en pierre : ancrent visuellement le bâtiment au sol.
    P(g, 10, 213, 150, 8, "#8a8a92");
    for (let x = 14; x < 156; x += 10) P(g, x, 213, 1, 8, "#78787f");

    // Silo attenant, à taille réelle (pas un simple détail cosmétique).
    P(g, 132, 100, 28, 113, "#c8c8d0");
    for (let y = 106; y < 210; y += 8) P(g, 132, y, 28, 1, "#b6b6bd");
    g.fillStyle = "#a8a8b2"; g.beginPath(); g.ellipse(146, 100, 14, 7, 0, 0, 7); g.fill();
    P(g, 132, 150, 28, 3, "#9a9aa4");

    // Mur principal.
    P(g, 20, 123, 110, 90, "#a83c30");
    for (let y = 129; y < 213; y += 7) P(g, 20, y, 110, 1, "#8a3028");
    P(g, 20, 123, 110, 3, "#c04a3c");

    // Joints de planches sur le mur (restyle maquette validée 2026-07).
    for (let x = 25; x < 128; x += 6) P(g, x, 126, 1, 87, "#8a3028");
    // Toit à deux pans (faîtage principal) — gris ardoise (maquette 2026-07).
    g.fillStyle = "#8a8a92";
    g.beginPath(); g.moveTo(20, 123); g.lineTo(cx, 68); g.lineTo(130, 123); g.fill();
    g.fillStyle = "#a4a4ae";
    g.beginPath(); g.moveTo(28, 123); g.lineTo(cx, 78); g.lineTo(122, 123); g.fill();

    // Grande fenêtre ronde de fenil, dans le pignon.
    g.fillStyle = "#f0ead8"; g.beginPath(); g.arc(cx, 100, 14, 0, 7); g.fill();
    g.fillStyle = "#5a4530"; g.beginPath(); g.arc(cx, 100, 9, 0, 7); g.fill();

    // Cupole + girouette, au sommet du faîtage : c'est elle qui fait
    // dépasser la grange bien au-delà de la hauteur de la maison.
    P(g, 58, 42, 34, 26, "#f0ead8");
    P(g, 62, 48, 4, 20, "#c8c0ac"); P(g, 104, 48, 4, 20, "#c8c0ac"); // colombages
    g.fillStyle = "#a83c30";
    g.beginPath(); g.moveTo(53, 42); g.lineTo(cx, 25); g.lineTo(97, 42); g.fill();
    P(g, cx - 1, 12, 2, 13, "#5a4530");
    g.fillStyle = "#5a4530";
    g.beginPath(); g.moveTo(cx, 10); g.lineTo(cx + 12, 16); g.lineTo(cx, 22); g.fill(); // girouette

    // Porte double, cadre blanc (signature "grange"), bien visible.
    P(g, 58, 163, 34, 44, "#f0ead8");
    P(g, 61, 166, 13, 38, "#7a5330");
    P(g, 76, 166, 13, 38, "#7a5330");
    // Croix blanches sur les deux vantaux (maquette validée 2026-07).
    for (let i = 0; i < 38; i++) {
      const t = Math.floor(i * 10 / 38);
      P(g, 62 + t, 166 + i, 1, 1, "#f0ead8"); P(g, 72 - t, 166 + i, 1, 1, "#f0ead8");
      P(g, 77 + t, 166 + i, 1, 1, "#f0ead8"); P(g, 87 - t, 166 + i, 1, 1, "#f0ead8");
    }

    return c;
  }

  /* ---------------- Atlas ---------------- */
  const S = {
    grass: [grassTile(0), grassTile(1), grassTile(2)],
    tilled: tilledTile(false),
    watered: tilledTile(true),
    water: [waterTile(0), waterTile(1)],
    sand: sandTile(),
    bridge: bridgeTile(),
    bridgeRuin: bridgeRuinTile(),
    bridgeStoneSprite: bridgeStoneTile(),
    grassPatch: grassTile(0), // icône outil Construction/aperçu pour l'herbe (chantier 2026-07), simple réutilisation d'une tuile d'herbe existante
    path: pathTile(),
    oak: oakTree(),
    pine: pineTree(),
    deadTree: deadTree(),
    stump: stump(),
    rock: rock(),
house: house(),
    houses: [house(), houseLvl2(), houseLvl3()], // maison à niveaux (maquettes validées 2026-07)
    shop: shopStand(),
    bin: sellBin(),
    crops: [],
    chars: {},
    icons: {},
    gemIcons: [],
    fishIcons: [],
    horse: horseSprite(0),
    horseRun: [horseSprite(0), horseSprite(1), horseSprite(2), horseSprite(3)], // cycle de galop (chantier 2026-07)
    wolf: [wolfSprite(0), wolfSprite(1), wolfSprite(2), wolfSprite(3)],
    rabbit: [rabbitSprite(0), rabbitSprite(1), rabbitSprite(2)],
    torch: torchSprite(),
    stool: stoolSprite(),
    fishingRodHeld: fishingRodHeldSprite(),
    well: well(),
    fence: fenceTile(),
    fenceV: fenceTileV(),
    fenceCorner: fenceTileCorner(),
    fencePost: fenceTilePost(),
    wall: wallTile(),
    lamp: lampSprite(),
    scarecrow: scarecrowSprite(),
    leverOpen: leverSprite(true),
    leverClosed: leverSprite(false),
    mill: millSprite(),
    cauldron: cauldronSprite(),
    seaIcons: [],
    duck: [duckSprite(0), duckSprite(1)],
    rail: railTile(),
    platform: platformTile(),
    station: stationSprite(),
    signBoard: signBoardSprite(),
    train: trainSprite(),
    barn: [barnSprite(1), barnSprite(2), barnSprite(3)],
    animals: [],
    products: [],
  };
  for (let t = 0; t < C.CROPS.length; t++) {
    S.crops[t] = [];
    for (let s = 0; s < C.CROP_STAGES; s++) S.crops[t][s] = cropSprite(t, s);
  }
  for (const k of ["hoe", "can", "axe", "pick", "seeds", "wood", "stone", "food", "gold", "energy", "rod", "ready", "thirst", "herd", "flour"]) S.icons[k] = icon(k);
  S.gemIcons = C.GEMS.map(gm => gemIcon(gm.color));
  S.fishIcons = C.FISH.map(fs => fishIcon(fs.color));
  S.seaIcons = C.SEA_CREATURES.map((sc, i) => seaIcon(i, sc.color));
  S.animals = C.ANIMALS.map(a => animalSprite(a.id));
  S.products = C.ANIMALS.map(a => productIcon(a.id));
  S.getChar = (gender, outfit, overalls, cap) => {
    const key = gender + ":" + outfit + (overalls ? ":overalls" : "") + (cap ? ":cap" : "");
    if (!S.chars[key]) S.chars[key] = charSheet(gender, outfit, !!overalls, !!cap);
    return S.chars[key];
  };
  return S;
}
