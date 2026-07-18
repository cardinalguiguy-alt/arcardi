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
    const [c, g] = cv(24, 28);
    P(g, 2, 10, 20, 14, "#9a6b3f");
    P(g, 2, 10, 20, 2, "#b8834f");
    for (let i = 0; i < 5; i++) P(g, 1 + i * 4.4, 2, 4, 6, i % 2 ? "#e8e4d8" : "#d44a3f");
    P(g, 0, 7, 24, 2, "#b03a30");
    P(g, 3, 24, 2, 4, "#7a5330"); P(g, 19, 24, 2, 4, "#7a5330");
    P(g, 5, 13, 4, 3, "#e8842a"); P(g, 11, 13, 4, 3, "#e03e2e"); P(g, 16, 13, 3, 3, "#b46ee0");
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

  function drawCharFrame(g, ox, gender, outfit, dir, frame) {
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
  function charSheet(gender, outfit) {
    const [c, g] = cv(16 * 4, 24 * 3);
    for (let dir = 0; dir < 3; dir++)
      for (let f = 0; f < 4; f++) {
        g.save(); g.translate(0, dir * 24);
        drawCharFrame(g, f * 16, gender, outfit, dir, f);
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

  /* ---------------- Bâtiments et animaux ---------------- */
  function horseSprite() {
    const [c, g] = cv(28, 24); // vu de profil (regarde à droite)
    const body = "#8a5a34", dark = "#6a4426", mane = "#3a2a18";
    P(g, 6, 10, 15, 7, body);          // corps
    P(g, 6, 10, 15, 2, "#9a6a44");
    P(g, 19, 6, 6, 7, body);           // encolure
    P(g, 23, 3, 5, 6, body);           // tête
    P(g, 27, 5, 1, 3, dark);           // museau
    P(g, 24, 4, 3, 2, mane);           // toupet
    P(g, 19, 5, 2, 6, mane);           // crinière
    P(g, 1, 11, 6, 3, mane);           // queue
    P(g, 7, 17, 2, 6, dark); P(g, 12, 17, 2, 6, body);  // pattes avant/gauche
    P(g, 16, 17, 2, 6, dark); P(g, 19, 17, 2, 6, body); // pattes arrière
    P(g, 7, 22, 2, 1, "#2a2018"); P(g, 12, 22, 2, 1, "#2a2018");
    P(g, 16, 22, 2, 1, "#2a2018"); P(g, 19, 22, 2, 1, "#2a2018");
    P(g, 25, 5, 1, 1, "#1a1a1a");      // oeil
    return c;
  }
  function well() {
    const [c, g] = cv(24, 30);
    // toit
    g.fillStyle = "#a83c30"; g.beginPath(); g.moveTo(1, 12); g.lineTo(12, 3); g.lineTo(23, 12); g.fill();
    P(g, 1, 11, 22, 2, "#8a3028");
    P(g, 4, 12, 2, 10, "#7a5330"); P(g, 18, 12, 2, 10, "#7a5330"); // poteaux
    // margelle en pierre
    P(g, 3, 20, 18, 8, "#9a9aa2"); P(g, 3, 20, 18, 2, "#b2b2ba");
    for (let x = 4; x < 21; x += 4) P(g, x, 22, 1, 6, "#7a7a82");
    P(g, 6, 22, 12, 5, "#2a3a4a"); // eau sombre
    P(g, 8, 23, 4, 1, "#4a6a8a");
    P(g, 10, 12, 4, 8, "#8a6340"); // seau/corde au centre
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

  /* ---------------- Atlas ---------------- */
  const S = {
    grass: [grassTile(0), grassTile(1), grassTile(2)],
    tilled: tilledTile(false),
    watered: tilledTile(true),
    water: [waterTile(0), waterTile(1)],
    sand: sandTile(),
    bridge: bridgeTile(),
    path: pathTile(),
    oak: oakTree(),
    pine: pineTree(),
    stump: stump(),
    rock: rock(),
    house: house(),
    shop: shopStand(),
    bin: sellBin(),
    crops: [],
    chars: {},
    icons: {},
    gemIcons: [],
    fishIcons: [],
    horse: horseSprite(),
    well: well(),
    fence: fenceTile(),
    fenceV: fenceTileV(),
    fenceCorner: fenceTileCorner(),
    fencePost: fenceTilePost(),
    animals: [],
    products: [],
  };
  for (let t = 0; t < C.CROPS.length; t++) {
    S.crops[t] = [];
    for (let s = 0; s < C.CROP_STAGES; s++) S.crops[t][s] = cropSprite(t, s);
  }
  for (const k of ["hoe", "can", "axe", "pick", "seeds", "wood", "stone", "food", "gold", "energy", "rod", "ready", "thirst", "herd"]) S.icons[k] = icon(k);
  S.gemIcons = C.GEMS.map(gm => gemIcon(gm.color));
  S.fishIcons = C.FISH.map(fs => fishIcon(fs.color));
  S.animals = C.ANIMALS.map(a => animalSprite(a.id));
  S.products = C.ANIMALS.map(a => productIcon(a.id));
  S.getChar = (gender, outfit) => {
    const key = gender + ":" + outfit;
    if (!S.chars[key]) S.chars[key] = charSheet(gender, outfit);
    return S.chars[key];
  };
  return S;
}
