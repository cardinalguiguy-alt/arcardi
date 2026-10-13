"use client";
// ÉCHAFAUDAGE JETABLE — 2026-10-13. À SUPPRIMER avant livraison (avec app/audit-tmp, app/audit-duo, app/api/audit-cap).
// La planche des poses des riders (`MA.drawRide`) sur un VRAI canevas : le faux canevas des bancs ignore `scale(-1, 1)`, donc les
// profils gauches et tout ce qui se dessine en miroir. ?k=monture&g=m|f&z=4
import { useEffect, useRef } from "react";
import * as A from "../../components/ferme/fermeArt";
import * as MA from "../../components/ferme/montureArt";
import * as C from "../../components/ferme/fermeConstants";

const HEADS = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (k * Math.PI) / 4);
const POSES = {
  skate: [["stand", {}], ["push .25", { pose: "push", ph: 0.25 }], ["push .7", { pose: "push", ph: 0.7 }], ["bend 3", { bend: 3 }], ["lean +2", { lean: 2, bend: 1 }],
    ["lean -2", { lean: -2, bend: 1 }], ["brake", { pose: "brake" }], ["hop", { pose: "hop", air: 0.4 }], ["grind", { pose: "grind", bend: 2 }],
    ["kickflip", { pose: "hop", air: 0.45, flip: 2.2 }], ["shove", { pose: "hop", air: 0.45, yaw: 1.6 }], ["chute", { mode: "bail" }]],
  roller: [["stand", {}], ["glide .2", { pose: "glide", ph: 0.2 }], ["glide .7", { pose: "glide", ph: 0.7 }], ["glide 1.3", { pose: "glide", ph: 1.3 }], ["brake", { pose: "brake" }],
    ["hop", { pose: "hop", air: 0.4 }], ["grind", { pose: "grind", bend: 2 }], ["grab", { pose: "hop", air: 0.45, grab: 1 }], ["arrière", { back: true }], ["chute", { mode: "bail" }]],
  scooter: [["stand", {}], ["push .25", { pose: "push", ph: 0.25 }], ["push .7", { pose: "push", ph: 0.7 }], ["bend 3", { bend: 3 }], ["lean +2", { lean: 2, bend: 1 }],
    ["brake", { pose: "brake" }], ["hop", { pose: "hop", air: 0.4 }], ["grind", { pose: "grind", bend: 2 }], ["barspin", { pose: "hop", air: 0.45, bar: Math.PI }],
    ["tailwhip", { pose: "hop", air: 0.45, whip: 2 }], ["chute", { mode: "bail" }]],
  bmx: [["stand", {}], ["pédale .2", { pose: "glide", ph: 0.2 }], ["pédale .7", { pose: "glide", ph: 0.7 }], ["bend 3", { bend: 3 }], ["lean +2", { lean: 2, bend: 1 }],
    ["brake", { pose: "brake" }], ["hop", { pose: "hop", air: 0.4 }], ["pegs", { pose: "grind", bend: 2 }], ["barspin", { pose: "hop", air: 0.45, bar: Math.PI }],
    ["tailwhip", { pose: "hop", air: 0.45, whip: 2 }], ["chute", { mode: "bail" }]],
};
const CW = 44, CH = 52, T = C.TILE;

export default function AuditRiders() {
  const ref = useRef(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const kind = q.get("k") || "skate", gender = q.get("g") || "m", z = +(q.get("z") || 4);
    const S = A.buildSprites();
    const sheet = S.getChar(gender, 0, false, false, false, false, false, false, null);
    window.__A = A; window.__MA = MA; window.__sheet = sheet; window.__S = S;
    const poses = POSES[kind], cols = HEADS.length, rows = poses.length;
    const small = document.createElement("canvas"); small.width = cols * CW; small.height = rows * CH;
    const ctx = small.getContext("2d"); ctx.imageSmoothingEnabled = false;
    poses.forEach(([, o], ri) => HEADS.forEach((th, ci) => {
      const px = ci * CW + 14, py = ri * CH + 22;
      ctx.fillStyle = (ri + ci) % 2 ? "rgb(170,166,160)" : "rgb(160,156,150)"; ctx.fillRect(ci * CW, ri * CH, CW, CH);
      ctx.fillStyle = "rgba(20,20,30,0.28)"; ctx.fillRect(px + 3, py + 14, 10, 2);
      const air = o.air || 0;
      const p = { x: px / T, y: py / T, gender, ride: { kind, th, air, mode: o.mode || (air ? "air" : "ground"), pose: o.pose || "stand", ph: o.ph || 0, color: 0, bend: o.bend || 0, lean: o.lean || 0,
        back: !!o.back, flip: o.flip || 0, yaw: o.yaw || 0, bar: o.bar || 0, whip: o.whip || 0, grab: o.grab || 0 } };
      ctx.save(); MA.drawRide(ctx, sheet, px, py - Math.round(air * T), p, gender === "f"); ctx.restore();
    }));
    const c = ref.current; c.width = small.width * z; c.height = small.height * z;
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(small, 0, 0, c.width, c.height);
    window.__ridersReady = true;
  }, []);
  return <canvas ref={ref} style={{ imageRendering: "pixelated" }} />;
}
