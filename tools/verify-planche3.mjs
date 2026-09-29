/* =============================================================================
   verify-planche3.mjs — LA TROISIÈME PLANCHE, POSÉE DANS LA VILLE (2026-09-29)
   -----------------------------------------------------------------------------
   Guillaume : « fais 1 » — brancher les 26 sprites de `planche3.js` : mobilier
   des jardins par rang, urnes de la mairie, lampadaires par rang, jardinières
   d'été / d'hiver, ronces et portail de la maison hantée.

   Ce qu'il mesure, et pourquoi :

     1. LA CARTE NE BOUGE PAS. Tout est posé en passe finale, sans un tirage, sur
        des cases restées libres : l'empreinte du sol, des arbres, des altitudes,
        des clôtures, des portails et des potagers est celle d'AVANT (relevée sur
        le générateur du commit b334488, avant le branchement). Un `rnd()` de plus
        au milieu de la génération la déplacerait pour toutes les fermes (§4).
     2. LA COHÉRENCE SOCIALE : la boîte aux lettres suit le rang (fonte, bois
        peint, tôle) ; les riches n'ont jamais le bois, le linge ni la brouette,
        les modestes jamais la vasque, le salon ni la balançoire.
     3. OÙ ILS TIENNENT : chaque décor posé sur de l'herbe libre, au niveau de la
        porte, hors emprise de maison, hors allée, hors rue ; solide (la ruine
        exceptée) ; derrière une grille, rien devant le mur — seulement la boîte
        aux lettres, dont le pied est caché exprès (la grille fait 28 px, vue).
     4. LES DESSINS : chaque décor a son sprite, aux dimensions de la planche ;
        les lampadaires ont leur version éteinte, qui ne change QUE le verre ;
        le candélabre a deux verres déclarés, la lanterne sur potence un ;
        la jardinière et l'urne ont leur hiver ; le rang lit `townRankAt`.
     5. LE PORTAIL ET LES RONCES : le portail ferme le bout de l'allée sans la
        bloquer, les ronces bordent l'allée sans jamais la fermer.

   Usage :  node tools/verify-planche3.mjs
   ========================================================================== */
import path from "path";
import { fileURLToPath } from "url";
import { installFakeDOM, loadFerme } from "./lib-canvas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
installFakeDOM();
const mods = await loadFerme(ROOT, ["fermeConstants", "fermeArt", "fermeEngine", "planche3"]);
const C = mods.fermeConstants, E = mods.fermeEngine, A = mods.fermeArt, P3 = mods.planche3.PLANCHE3;

let fails = 0, checks = 0;
const ok = (n, c, x) => { checks++; console.log(`${c ? "  OK  " : "ÉCHEC "} ${n}${x ? "  —  " + x : ""}`); if (!c) fails++; };

const tw = E.generateTownWorld();
const W = tw.w, H3 = C.TOWN_HOUSE_H;

/* ─── 1. L'empreinte d'avant ───────────────────────────────────────────────── */
console.log("\n=== 1. la carte d'avant le branchement sort au bit près ===\n");
// FNV-1a sur le sol, les objets, l'altitude, les clôtures, les portails et les potagers.
const HEAD_FP = "2935e656";
function fingerprint(w) {
  let h = 0x811c9dc5 >>> 0;
  const f = (v) => { h ^= v & 255; h = Math.imul(h, 16777619) >>> 0; };
  const feed = (a) => { for (const v of a) { f(v); f(v >> 8); } f(255); };
  feed(w.ground); feed(w.objects); feed(w.elev); feed(w.hedge);
  for (const g of w.gates) feed([g.x, g.y, g.w, g.style, g.e]);
  feed([255]);
  for (const p of w.plots) feed([p.x, p.y, p.w, p.h, p.e]);
  return h.toString(16);
}
ok("empreinte de la carte (sol, arbres, altitudes, clôtures, portails, potagers)", fingerprint(tw) === HEAD_FP, `${fingerprint(tw)} (attendu ${HEAD_FP})`);

/* ─── 2. Le rang ───────────────────────────────────────────────────────────── */
console.log("\n=== 2. la cohérence sociale par quartier ===\n");
const GARDEN = new Set(["mailboxTin", "mailboxRed", "mailboxIron", "woodpileRoofed", "woodpileAxe", "clothesline", "wheelbarrow", "rainBarrel", "gardenTable", "birdbath", "herbPots", "swing", "hutch"]);
const parcels = C.townFenceLayout().filter((L) => L.hsn.variant !== "ruine");
const parcelOf = (p) => parcels.find((L) => p.x > L.west && p.x < L.east && p.y >= L.hsn.y && p.y <= L.hsn.y + H3 + 1);
const gardenProps = tw.props.filter((p) => GARDEN.has(p.kind));
const MAIL = { riche: "mailboxIron", enrichie: "mailboxRed", simple: "mailboxTin" };
const RICH_ONLY_NOT = new Set(["woodpileRoofed", "woodpileAxe", "clothesline", "wheelbarrow", "hutch", "rainBarrel"]);
const POOR_ONLY_NOT = new Set(["birdbath", "gardenTable", "swing", "herbPots"]);
let wrongMail = [], wrongRich = [], wrongPoor = [], orphan = [];
for (const p of gardenProps) {
  const L = parcelOf(p);
  if (!L) { orphan.push(`${p.kind}(${p.x},${p.y})`); continue; }
  const rank = C.townHouseDistrict(L.hsn);
  if (p.kind.startsWith("mailbox") && p.kind !== MAIL[rank]) wrongMail.push(`${p.kind}@${rank}`);
  if (rank === "riche" && RICH_ONLY_NOT.has(p.kind)) wrongRich.push(`${p.kind}(${p.x},${p.y})`);
  if (rank === "simple" && POOR_ONLY_NOT.has(p.kind)) wrongPoor.push(`${p.kind}(${p.x},${p.y})`);
}
ok("chaque objet de jardin tombe dans une parcelle", orphan.length === 0, orphan.slice(0, 4).join(" ") || `${gardenProps.length} objets lus`);
ok("la boîte aux lettres suit le rang (fonte / bois peint / tôle)", wrongMail.length === 0, wrongMail.slice(0, 4).join(" "));
ok("aucun jardin de riche n'a le bois, le linge, la brouette, le clapier ni le tonneau", wrongRich.length === 0, wrongRich.slice(0, 4).join(" "));
ok("aucun jardin modeste n'a la vasque, le salon, la balançoire ni les pots d'herbes", wrongPoor.length === 0, wrongPoor.slice(0, 4).join(" "));
const perRank = {};
for (const L of parcels) {
  const rank = C.townHouseDistrict(L.hsn);
  const n = gardenProps.filter((p) => parcelOf(p) === L).length;
  (perRank[rank] = perRank[rank] || []).push(n);
}
for (const [rank, list] of Object.entries(perRank)) {
  const withMail = parcels.filter((L) => C.townHouseDistrict(L.hsn) === rank && gardenProps.some((p) => p.kind === MAIL[rank] && parcelOf(p) === L)).length;
  ok(`${rank} : une boîte aux lettres dans presque toutes les parcelles`, withMail >= list.length - 3, `${withMail} sur ${list.length}, ${list.reduce((a, b) => a + b, 0)} objets`);
}
ok("chaque objet du cycle est posé au moins une fois", [...GARDEN].every((k) => gardenProps.some((p) => p.kind === k)), [...GARDEN].filter((k) => !gardenProps.some((p) => p.kind === k)).join(" "));

/* ─── 3. Où ils tiennent ───────────────────────────────────────────────────── */
console.log("\n=== 3. où ils tiennent ===\n");
const NEW = new Set([...GARDEN, "urn", "bramble", "brambleSmall", "wildGrass", "ruinGate"]);
const mine = tw.props.filter((p) => NEW.has(p.kind));
const feet = C.townAllHouses().map((h) => C.townHouseFoot(h));
const inFoot = (x, y) => feet.some((f) => x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h);
const bad = { grass: [], foot: [], path: [], solid: [], tree: [], fence: [] };
for (const p of mine) {
  const i = p.y * W + p.x, g = tw.ground[i], tag = `${p.kind}(${p.x},${p.y})`;
  if (p.kind !== "ruinGate" && g !== C.G_GRASS && g !== C.G_TOWN_LAWN && g !== C.G_PATH_STONE) bad.grass.push(tag);
  if (inFoot(p.x, p.y)) bad.foot.push(tag);
  if (g === C.G_PATH) bad.path.push(tag);
  if (!p.ruin && !tw.solid[i]) bad.solid.push(tag);
  const o = tw.objects[i]; if (o === C.O_TREE || o === C.O_TREE2) bad.tree.push(tag);
  if (tw.hedge[i]) bad.fence.push(tag);
}
ok(`${mine.length} décors neufs : tous sur de l'herbe, de la pelouse ou du dallage (le portail sur l'allée)`, bad.grass.length === 0, bad.grass.slice(0, 4).join(" "));
ok("aucun hors des emprises de maison", bad.foot.length === 0, bad.foot.slice(0, 4).join(" "));
ok("aucun sur une allée de jardin ou une rue", bad.path.length === 0, bad.path.slice(0, 4).join(" "));
ok("tous bloquants (le portail et ses dalles exceptés)", bad.solid.length === 0, bad.solid.slice(0, 4).join(" "));
ok("aucun sur un arbre ou une clôture", bad.tree.length === 0 && bad.fence.length === 0, [...bad.tree, ...bad.fence].slice(0, 4).join(" "));
let frontOfIron = [];
for (const p of gardenProps) {
  const L = parcelOf(p);
  if (L && L.style === C.TOWN_FENCE.IRON && p.y >= L.hsn.y + H3 && !p.kind.startsWith("mailbox")) frontOfIron.push(`${p.kind}(${p.x},${p.y})`);
}
ok("derrière une grille, rien devant le mur (le tiers bas serait caché) — sauf la boîte aux lettres", frontOfIron.length === 0, frontOfIron.slice(0, 4).join(" "));
const ironParcels = parcels.filter((L) => L.style === C.TOWN_FENCE.IRON).length;
ok("le contrôle voit bien des parcelles à grille (pas un banc qui ne peut pas échouer)", ironParcels >= 4, `${ironParcels} parcelles à grille, ${gardenProps.filter((p) => parcelOf(p)?.style === C.TOWN_FENCE.IRON).length} objets derrière`);
ok("deux urnes de part et d'autre de l'axe de la porte de la mairie", mine.filter((p) => p.kind === "urn").length === 2 && mine.filter((p) => p.kind === "urn").every((p) => p.y === C.TOWN_PLAZA.y + 1));

/* ─── 4. Les dessins ───────────────────────────────────────────────────────── */
console.log("\n=== 4. les dessins ===\n");
const S = A.buildSprites();
const artNames = [...new Set([...C.TOWN_PLANCHE3_KINDS].map((k) => C.TOWN_PROP_ART[k]))];
ok(`chaque décor de la planche 3 (${C.TOWN_PLANCHE3_KINDS.size} sortes) a son dessin, aux dimensions de la planche`,
   artNames.every((n) => S.townProp3[n] && S.townProp3[n].width === P3[n].w && S.townProp3[n].height === P3[n].h),
   artNames.filter((n) => !S.townProp3[n]).join(" "));
ok("chaque sorte de décor du générateur est connue de la table d'emprise", [...NEW].every((k) => C.TOWN_PROP_ART[k]), [...NEW].filter((k) => !C.TOWN_PROP_ART[k]).join(" "));
const pix = (cv) => cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
function diffCount(a, b) { const x = pix(a), y = pix(b); let n = 0; for (let i = 0; i < x.length; i += 4) if (x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2] || x[i + 3] !== y[i + 3]) n++; return n; }
for (const [on, off, label, want] of [["townLampRich", "townLampRichOff", "candélabre", 2], ["townLampPoor", "townLampPoorOff", "lanterne sur potence", 1]]) {
  const d = diffCount(S[on], S[off]), gl = S.lampGlass[on];
  ok(`${label} : la version éteinte ne change que le verre`, S[on].width === S[off].width && d > 0 && d < 60, `${d} pixels changés`);
  ok(`${label} : ${want} verre(s) déclaré(s) pour la lumière`, gl && (gl.list ? gl.list.length : 1) === want, gl ? `${gl.list ? gl.list.length : 1}` : "aucun");
}
const g2 = S.lampGlass.townLampRich.list;
ok("les deux verres du candélabre sont de part et d'autre du fût", g2 && g2[0].x < S.townLampRich.width / 2 && g2[1].x > S.townLampRich.width / 2, g2 ? g2.map((g) => g.x.toFixed(1)).join(" / ") : "");
ok("la jardinière et l'urne ont leur été ET leur hiver, différents", diffCount(S.townPlanter3[0], S.townPlanter3[1]) > 200 && diffCount(S.townUrn3[0], S.townUrn3[1]) > 60);
const ranks = [[0, "rich"], [1, null], [2, "poor"]];
ok("le dessin d'un lampadaire suit le rang de son quartier (riche, moyen, modeste)", ranks.every(([r, art]) => C.TOWN_LAMP_ART[r] === art));
const lamps = tw.props.filter((p) => p.kind === "lamp");
const byArt = { rich: 0, mid: 0, poor: 0 };
for (const l of lamps) byArt[C.townLampArtAt(l.x, l.y) || "mid"]++;
ok("les trois rangs de lampadaire existent en ville", byArt.rich > 5 && byArt.mid > 5 && byArt.poor > 5, JSON.stringify(byArt));

/* ─── 5. La maison hantée ──────────────────────────────────────────────────── */
console.log("\n=== 5. la maison hantée ===\n");
const R = C.TOWN_RUIN, doorX = R.x + 2;
const gate = tw.props.find((p) => p.kind === "ruinGate");
ok("un portail au bout de l'allée, centré sur ses deux colonnes", gate && gate.x === doorX && gate.ox === 8, gate ? `(${gate.x},${gate.y}) ox=${gate.ox}` : "absent");
ok("le portail ne bloque pas l'allée", gate && !tw.solid[gate.y * W + doorX] && !tw.solid[gate.y * W + doorX + 1]);
const thorns = tw.props.filter((p) => ["bramble", "brambleSmall", "wildGrass"].includes(p.kind));
ok("les ronces et les herbes sèches bordent l'allée, jamais dessus", thorns.length >= 6 && thorns.every((p) => p.x !== doorX && p.x !== doorX + 1), `${thorns.length} touffes`);
ok("les dalles ne passent pas sous le portail (aucun décor dans le corps d'un autre)", !tw.props.some((p) => p.kind === "flatStone" && p.ruin && gate && C.townPropCovers("ruinGate", gate.x, gate.y, p.x, p.y)));

console.log(`\n${fails ? "❌ " + fails + " contrôle(s) en échec sur " + checks : "✅ " + checks + "/" + checks + " contrôles passés."}`);
process.exit(fails ? 1 : 0);
