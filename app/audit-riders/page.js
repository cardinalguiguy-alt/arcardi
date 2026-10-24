"use client";
// ÉCHAFAUDAGE JETABLE — 2026-10-13. À SUPPRIMER avant livraison (avec app/audit-tmp, app/audit-duo, app/api/audit-cap).
// La planche des poses des riders (`MA.drawRide`) sur un VRAI canevas : le faux canevas des bancs ignore `scale(-1, 1)`, donc les
// profils gauches et tout ce qui se dessine en miroir. ?k=monture&g=m|f&z=4 (&hd=1 : en 32 × 48, comme au jeu au cran 2)
import { useEffect, useRef } from "react";
import * as A from "../../components/ferme/fermeArt";
import * as MA from "../../components/ferme/montureArt";
import * as C from "../../components/ferme/fermeConstants";

const HEADS = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (k * Math.PI) / 4);
const POSES = {
  skate: [["stand", {}], ["push .25", { pose: "push", ph: 0.25 }], ["push .7", { pose: "push", ph: 0.7 }], ["bend 3", { bend: 3 }], ["lean +2", { lean: 2, bend: 1 }],
    ["lean -2", { lean: -2, bend: 1 }], ["brake", { pose: "brake" }], ["hop", { pose: "hop", air: 0.4 }], ["grind", { pose: "grind", bend: 2 }],
    ["kickflip", { pose: "hop", air: 0.45, flip: 2.2 }], ["shove", { pose: "hop", air: 0.45, yaw: 1.6 }],
    // 2026-10-15 — les figures neuves : le heelflip (le plateau tourne dans l'autre sens), le hardflip, un double kickflip à mi-course
    ["heelflip", { pose: "hop", air: 0.45, flip: -2.2 }], ["hardflip", { pose: "hop", air: 0.45, flip: 2.2, yaw: -1.6 }], ["double", { pose: "hop", air: 0.45, flip: 8.5 }],
    ["charge 4", { bend: 4 }], ["chute", { mode: "bail" }]],
  roller: [["stand", {}], ["glide .2", { pose: "glide", ph: 0.2 }], ["glide .7", { pose: "glide", ph: 0.7 }], ["glide 1.3", { pose: "glide", ph: 1.3 }], ["brake", { pose: "brake" }],
    ["hop", { pose: "hop", air: 0.4 }], ["grind", { pose: "grind", bend: 2 }], ["grab", { pose: "hop", air: 0.45, grab: 1 }], ["arrière", { back: true }],
    // 2026-10-15 — la pirouette (bras levés, pieds serrés) et le handplant (retourné sur le coping, trois instants de son équilibre)
    ["pirouette", { piro: true, bend: 1 }], ["handplant", { pose: "hand", mode: "hand", hand: { T: 0 } }], ["hand .3", { pose: "hand", mode: "hand", hand: { T: 0.3 } }], ["hand .6", { pose: "hand", mode: "hand", hand: { T: 0.6 } }],
    ["chute", { mode: "bail" }]],
  scooter: [["stand", {}], ["push .25", { pose: "push", ph: 0.25 }], ["push .7", { pose: "push", ph: 0.7 }], ["bend 3", { bend: 3 }], ["lean +2", { lean: 2, bend: 1 }],
    ["brake", { pose: "brake" }], ["hop", { pose: "hop", air: 0.4 }], ["grind", { pose: "grind", bend: 2 }], ["barspin", { pose: "hop", air: 0.45, bar: Math.PI }],
    ["tailwhip", { pose: "hop", air: 0.45, whip: 2 }], ["x-up", { pose: "hop", air: 0.45, xup: 1, bar: 2.7 }], ["heelwhip", { pose: "hop", air: 0.45, whip: -2 }], ["chute", { mode: "bail" }]],
  bmx: [["stand", {}], ["pédale .2", { pose: "glide", ph: 0.2 }], ["pédale .7", { pose: "glide", ph: 0.7 }], ["bend 3", { bend: 3 }], ["lean +2", { lean: 2, bend: 1 }],
    ["brake", { pose: "brake" }], ["hop", { pose: "hop", air: 0.4 }], ["pegs", { pose: "grind", bend: 2 }], ["barspin", { pose: "hop", air: 0.45, bar: Math.PI }],
    ["tailwhip", { pose: "hop", air: 0.45, whip: 2 }], ["no-hander", { pose: "hop", air: 0.45, nohand: 1 }], ["x-up", { pose: "hop", air: 0.45, xup: 1, bar: 2.7 }],
    ["double whip", { pose: "hop", air: 0.45, whip: 8.5 }], ["chute", { mode: "bail" }]],
};
const CW = 44, CH = 52, T = C.TILE;

export default function AuditRiders() {
  const ref = useRef(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const kind = q.get("k") || "skate", gender = q.get("g") || "m", z = +(q.get("z") || 4);
    // ?veh=1 (2026-10-14) : les véhicules seuls (`MA.drawRideKitPreview`), huit caps × quelques réglages (couleur, flip, guidon, pédalier)
    if (q.get("veh")) {
      const VR = { skate: [{ color: 0 }, { color: 1 }, { color: 4 }, { color: 2, flip: Math.PI }, { color: 3, flip: 1.4 }],
        bmx: [{ color: 0 }, { color: 1 }, { color: 4, crank: 1.2 }, { color: 2, bar: Math.PI / 2 }, { color: 3, whip: 1.2 }],
        scooter: [{ color: 0 }, { color: 1 }], roller: [{ color: 0 }, { color: 1 }, { color: 4 }] }[kind] || [{}];
      const W = 30, Hh = 28, sm = document.createElement("canvas"); sm.width = HEADS.length * W; sm.height = VR.length * Hh;
      const gg = sm.getContext("2d"); gg.imageSmoothingEnabled = false;
      VR.forEach((ro, ri) => HEADS.forEach((th, ci) => {
        gg.fillStyle = (ri + ci) % 2 ? "rgb(170,166,160)" : "rgb(160,156,150)"; gg.fillRect(ci * W, ri * Hh, W, Hh);
        MA.drawRideKitPreview(gg, { kind, color: ro.color || 0 }, { ...ro, fx: (ci * W + W / 2) / T, fy: (ri * Hh + Hh * 0.72) / T, th });
      }));
      const c = ref.current; c.width = sm.width * z; c.height = sm.height * z;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, c.width, c.height);
      window.__ridersReady = true;
      return;
    }
    const S = A.buildSprites();
    const sheet = S.getChar(gender, 0, false, false, false, false, false, false, null);
    /* ?hd=1 (2026-10-24) : la même planche en 32 × 48, par le chemin du jeu (`drawPoseHD`, FermeGame.js, recopié ici) — la feuille
       fine NUE, les rectangles source ×2 (`hdCtxProxy`), le contour posé sur la pose finie (`outlineHD`). */
    if (q.get("hd")) {
      const naked = S.getCharHD(gender, 0, q.get("look") || null, true, "neutre", null);
      const proxy = (g) => new Proxy(g, { get(t, k) {
        if (k === "drawImage") return (img, ...a) => { const K = img && img.__hdK; return K && a.length === 8 ? t.drawImage(img, a[0] * K, a[1] * K, a[2] * K, a[3] * K, a[4], a[5], a[6], a[7]) : t.drawImage(img, ...a); };
        const v = t[k]; return typeof v === "function" ? v.bind(t) : v; }, set(t, k, v) { t[k] = v; return true; } });
      const outline = (g, W, H) => {
        const im = g.getImageData(0, 0, W, H), d = new Uint32Array(im.data.buffer), src = d.slice();
        for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
          if (src[i] >>> 24) continue;
          let n = 0;
          if (y < H - 1 && src[i + W] >>> 24 >= 200) n = src[i + W]; else if (x > 0 && src[i - 1] >>> 24 >= 200) n = src[i - 1];
          else if (x < W - 1 && src[i + 1] >>> 24 >= 200) n = src[i + 1]; else if (y > 0 && src[i - W] >>> 24 >= 200) n = src[i - W]; else continue;
          const r = n & 255, gg = (n >>> 8) & 255, bb = (n >>> 16) & 255;
          d[i] = (0xff000000 | (Math.round(bb + (30 - bb) * 0.74) << 16) | (Math.round(gg + (14 - gg) * 0.74) << 8) | Math.round(r + (28 - r) * 0.74)) >>> 0;
        }
        g.putImageData(im, 0, 0);
      };
      const poses = POSES[kind], cols = HEADS.length, rows = poses.length;
      const big = document.createElement("canvas"); big.width = cols * CW * 2; big.height = rows * CH * 2;
      const bg = big.getContext("2d"); bg.imageSmoothingEnabled = false;
      const work = document.createElement("canvas"); work.width = CW * 2; work.height = CH * 2;
      const wg = work.getContext("2d", { willReadFrequently: true });
      poses.forEach(([, o], ri) => HEADS.forEach((th, ci) => {
        const cx0 = ci * CW, cy0 = ri * CH, px = cx0 + 14, py = cy0 + 22, air = o.air || 0;
        bg.fillStyle = (ri + ci) % 2 ? "rgb(170,166,160)" : "rgb(160,156,150)"; bg.fillRect(cx0 * 2, cy0 * 2, CW * 2, CH * 2);
        bg.fillStyle = "rgba(20,20,30,0.28)"; bg.fillRect((px + 3) * 2, (py + 14) * 2, 20, 4);
        const p = { x: px / T, y: py / T, gender, ride: { kind, th, air, mode: o.mode || (air ? "air" : "ground"), pose: o.pose || "stand", ph: o.ph || 0, color: 0, bend: o.bend || 0, lean: o.lean || 0,
          back: !!o.back, flip: o.flip || 0, yaw: o.yaw || 0, bar: o.bar || 0, whip: o.whip || 0, grab: o.grab || 0, nohand: o.nohand || 0, xup: o.xup || 0, piro: !!o.piro, hand: o.hand || null } };
        wg.setTransform(1, 0, 0, 1, 0, 0); wg.clearRect(0, 0, work.width, work.height);
        wg.setTransform(2, 0, 0, 2, -2 * cx0, -2 * cy0); wg.imageSmoothingEnabled = false;
        wg.save(); MA.drawRide(proxy(wg), naked, px, py - Math.round(air * T), p, gender === "f"); wg.restore();
        wg.setTransform(1, 0, 0, 1, 0, 0); outline(wg, work.width, work.height);
        bg.drawImage(work, cx0 * 2, cy0 * 2);
      }));
      const c = ref.current, zz = Math.max(1, Math.round(z / 2)); c.width = big.width * zz; c.height = big.height * zz;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(big, 0, 0, c.width, c.height);
      window.__ridersReady = true;
      return;
    }
    window.__A = A; window.__MA = MA; window.__sheet = sheet; window.__S = S;
    const poses = POSES[kind], cols = HEADS.length, rows = poses.length;
    const small = document.createElement("canvas"); small.width = cols * CW; small.height = rows * CH;
    const ctx = small.getContext("2d"); ctx.imageSmoothingEnabled = false;
    poses.forEach(([, o], ri) => HEADS.forEach((th, ci) => {
      const px = ci * CW + 14, py = ri * CH + 22;   // (le handplant tient dans la case : le coping est aux pieds, 15 px sous py, et il monte de 27)
      ctx.fillStyle = (ri + ci) % 2 ? "rgb(170,166,160)" : "rgb(160,156,150)"; ctx.fillRect(ci * CW, ri * CH, CW, CH);
      ctx.fillStyle = "rgba(20,20,30,0.28)"; ctx.fillRect(px + 3, py + 14, 10, 2);
      const air = o.air || 0;
      const p = { x: px / T, y: py / T, gender, ride: { kind, th, air, mode: o.mode || (air ? "air" : "ground"), pose: o.pose || "stand", ph: o.ph || 0, color: 0, bend: o.bend || 0, lean: o.lean || 0,
        back: !!o.back, flip: o.flip || 0, yaw: o.yaw || 0, bar: o.bar || 0, whip: o.whip || 0, grab: o.grab || 0, nohand: o.nohand || 0, xup: o.xup || 0, piro: !!o.piro, hand: o.hand || null } };
      ctx.save(); MA.drawRide(ctx, sheet, px, py - Math.round(air * T), p, gender === "f"); ctx.restore();
    }));
    const c = ref.current; c.width = small.width * z; c.height = small.height * z;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(small, 0, 0, c.width, c.height);
    window.__ridersReady = true;
  }, []);
  return <canvas ref={ref} style={{ imageRendering: "pixelated" }} />;
}
