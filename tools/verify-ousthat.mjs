/* =============================================================================
   verify-ousthat.mjs — LE DUEL GÉOGRAPHIQUE EST-IL COHÉRENT ET BRANCHÉ ?
   -----------------------------------------------------------------------------
   Ce banc appelle les règles pures réellement utilisées par le jeu, puis tient
   leurs jonctions avec le catalogue, le réseau hôte, Google Maps Embed,
   Leaflet/OpenStreetMap et la notice MIT des lieux.

   Usage : node tools/verify-ousthat.mjs
   Falsification : node tools/verify-ousthat.mjs --falsify
   ========================================================================== */
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ousthat-"));
let rulesSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", "rules.js"), "utf8");
if (process.argv.includes("--falsify")) {
  // Mutation volontaire : un banc honnête doit voir disparaître les dégâts.
  rulesSrc = rulesSrc.replace("Math.round(difference * multiplier)", "0");
}
fs.writeFileSync(path.join(tmp, "rules.mjs"), rulesSrc);
const locationsSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", "locations.js"), "utf8")
  .replace('from "./rules"', 'from "./rules.mjs"');
fs.writeFileSync(path.join(tmp, "locations.mjs"), locationsSrc);

const R = await import(pathToFileURL(path.join(tmp, "rules.mjs")).href);
const L = await import(pathToFileURL(path.join(tmp, "locations.mjs")).href);
let fails = 0, total = 0;
const ok = (name, condition, detail = "") => {
  total++;
  console.log(`${condition ? "  OK  " : "ÉCHEC "} ${name}${detail ? " — " + detail : ""}`);
  if (!condition) fails++;
};
const near = (a, b, tolerance) => Math.abs(a - b) <= tolerance;
const section = (name) => console.log(`\n=== ${name} ===\n`);

section("coordonnées et distances");
ok("un point est à distance nulle de lui-même", R.haversineDistanceKm({ lat: 12.3456789, lng: -45.6 }, { lat: 12.3456789, lng: -45.6 }) === 0);
const parisLondon = R.haversineDistanceKm({ lat: 48.8566, lng: 2.3522 }, { lat: 51.5074, lng: -0.1278 });
ok("Paris–Londres reste dans l'ordre de grandeur géodésique", near(parisLondon, 343.56, .5), `${parisLondon.toFixed(3)} km`);
const antipodes = R.haversineDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
ok("deux antipodes valent π fois le rayon terrestre", near(antipodes, Math.PI * R.EARTH_RADIUS_KM, 1e-7), `${antipodes.toFixed(6)} km`);
const dateline = R.haversineDistanceKm({ lat: 0, lng: 179.9 }, { lat: 0, lng: -179.9 });
ok("l'antiméridien prend le chemin de 0,2°, pas celui de 359,8°", near(dateline, 22.239, .02), `${dateline.toFixed(3)} km`);
ok("les longitudes sont normalisées des deux côtés", R.normalizeLng(181) === -179 && R.normalizeLng(-181) === 179);
ok("une latitude impossible est refusée", R.normalizeGuess({ lat: 90.0001, lng: 0 }) === null);
ok("la précision décimale n'est pas tronquée", R.normalizeGuess({ lat: 12.123456789012, lng: -7.987654321098 }).lat === 12.123456789012);

section("score, multiplicateurs et dégâts");
const validConfig = R.validateConfig({ initialHp: 8500, roundSeconds: 90, finalSeconds: 12, multipliers: true, multiplierStartRound: 4, multiplierIncrement: .7 });
ok("une configuration complète dans les bornes est conservée", validConfig.ok && validConfig.value.initialHp === 8500 && validConfig.value.multiplierIncrement === .7);
const invalidConfig = R.validateConfig({ initialHp: 0, roundSeconds: 19, finalSeconds: 61, multipliers: true, multiplierStartRound: 1, multiplierIncrement: 9 });
ok("chaque réglage hors borne est refusé", !invalidConfig.ok && invalidConfig.errors.length === 5);
ok("25 m inclus donnent exactement 5 000", R.distanceScore(.025) === 5000);
ok("juste après 25 m, le score parfait devient impossible", R.distanceScore(.025001) === 4999);
ok("le score décroît strictement sur trois distances mondiales", R.distanceScore(100) > R.distanceScore(1000) && R.distanceScore(1000) > R.distanceScore(5000));
ok("les distances invalides ne donnent aucun point", R.distanceScore(-1) === 0 && R.distanceScore(Infinity) === 0);
ok("l'augmentation commence à la manche configurée", [1, 1, 1, 1, 1.5, 2].every((value, index) => R.roundMultiplier(index + 1, R.DEFAULT_CONFIG) === value));
ok("les multiplicateurs désactivés restent à ×1", R.roundMultiplier(99, { ...R.DEFAULT_CONFIG, multipliers: false }) === 1);

const seats = [{ id: "p1", teamId: "t1" }, { id: "p2", teamId: "t2" }];
const teams = [{ id: "t1", hp: 6000 }, { id: "t2", hp: 6000 }];
const perfectVsNone = R.resolveRound({ seats, teams, answers: { p1: { confirmed: { lat: 0, lng: 0 } } }, target: { lat: 0, lng: 0 }, round: 1 });
ok("5 000 contre aucune réponse infligent 5 000 au seul perdant", perfectVsNone.damage === 5000 && perfectVsNone.damagedTeamId === "t2" && perfectVsNone.teams[0].hp === 6000 && perfectVsNone.teams[1].hp === 1000);
const proposalAtExpiry = R.resolveRound({ seats, teams, answers: { p1: { proposal: { lat: 0, lng: 0 } } }, target: { lat: 0, lng: 0 }, round: 1 });
ok("un marqueur non confirmé compte à l'expiration", proposalAtExpiry.players[0].score === 5000 && proposalAtExpiry.players[0].answered && !proposalAtExpiry.players[0].confirmed);
const tie = R.resolveRound({ seats, teams, answers: {}, target: { lat: 0, lng: 0 }, round: 8 });
ok("une égalité, même multipliée, ne fait aucun dégât", tie.damage === 0 && tie.damagedTeamId === null && tie.teams.every((team) => team.hp === 6000));
const knockout = R.resolveRound({ seats, teams: [{ id: "t1", hp: 4000 }, { id: "t2", hp: 4000 }], answers: { p1: { confirmed: { lat: 0, lng: 0 } } }, target: { lat: 0, lng: 0 }, round: 1 });
ok("les PV sont bornés à zéro et la victoire revient à l'autre camp", knockout.teams.find((team) => team.id === "t2").hp === 0 && knockout.winnerTeamId === "t1");

section("échéances, verrou et reprise");
ok("le délai final ne rallonge jamais la manche", R.finalDeadline(10_000, 20_000, 15) === 20_000 && R.finalDeadline(10_000, 100_000, 15) === 25_000);
ok("une réponse est acceptée jusqu'à l'échéance incluse", R.canAcceptAnswer({ phase: "playing", now: 2000, deadline: 2000, answer: null }));
ok("une réponse tardive ou déjà confirmée est refusée", !R.canAcceptAnswer({ phase: "playing", now: 2001, deadline: 2000, answer: null }) && !R.canAcceptAnswer({ phase: "playing", now: 1000, deadline: 2000, answer: { confirmed: { lat: 0, lng: 0 } } }));
ok("la confirmation prime toujours sur une proposition plus récente", R.effectiveAnswer({ confirmed: { lat: 1, lng: 2 }, proposal: { lat: 3, lng: 4 } }).lat === 1);
ok("une manche ne peut être résolue qu'une fois et avec le bon identifiant", R.canResolveRound({ phase: "playing", roundId: "r1", resolvedRoundId: null }, "r1") && !R.canResolveRound({ phase: "playing", roundId: "r1", resolvedRoundId: "r1" }, "r1") && !R.canResolveRound({ phase: "playing", roundId: "r1", resolvedRoundId: null }, "r2"));
const rematch = R.resetForRematch({ config: R.DEFAULT_CONFIG, teams, result: { old: true }, winnerTeamId: "t1", retry: 4 }, ["a", "b"], "match-2");
ok("la revanche garde les règles mais remet PV, manche et réponses à zéro", rematch.phase === "preparing" && rematch.round === 1 && rematch.retry === 0 && rematch.roundId === "match-2:1:0" && rematch.teams.every((team) => team.hp === 6000) && Object.keys(rematch.answers).length === 0 && rematch.winnerTeamId === null);

section("sélection mondiale");
ok("au moins 30 panoramas sont livrés", L.LOCATIONS.length >= 30, `${L.LOCATIONS.length} lieux`);
ok("la première sélection ne répète aucun pays", new Set(L.LOCATIONS.map((place) => place.country)).size === L.LOCATIONS.length);
ok("chaque panorama garde des coordonnées et une orientation complètes", L.LOCATIONS.every((place) => R.normalizeGuess(place) && typeof place.panoId === "string" && place.panoId.length > 10 && Number.isFinite(place.heading) && Number.isFinite(place.pitch) && Number.isFinite(place.fov)));
ok("les codes pays produisent un drapeau de révélation sûr", L.countryFlag("FR") === "🇫🇷" && L.countryFlag("?") === "🏳️");
const orderA = L.locationOrder("same-match"), orderB = L.locationOrder("same-match"), orderC = L.locationOrder("other-match");
ok("le mélange est déterministe pour tous les clients", JSON.stringify(orderA) === JSON.stringify(orderB));
ok("deux matchs changent réellement l'ordre", JSON.stringify(orderA) !== JSON.stringify(orderC));
ok("un ordre contient chaque lieu exactement une fois", orderA.length === L.LOCATIONS.length && new Set(orderA).size === L.LOCATIONS.length && orderA.every((id) => L.LOCATION_BY_ID[id]));

section("jonctions catalogue, réseau et fournisseurs");
const page = fs.readFileSync(path.join(ROOT, "app", "room", "[code]", "page.js"), "utf8");
const game = fs.readFileSync(path.join(ROOT, "components", "ousthat", "OusThatGame.js"), "utf8");
const frame = fs.readFileSync(path.join(ROOT, "components", "ousthat", "StreetViewFrame.js"), "utf8");
const map = fs.readFileSync(path.join(ROOT, "components", "ousthat", "GuessMap.js"), "utf8");
const i18n = fs.readFileSync(path.join(ROOT, "lib", "i18n.js"), "utf8");
const rulesCopy = fs.readFileSync(path.join(ROOT, "lib", "gameRules.js"), "utf8");
const notice = fs.readFileSync(path.join(ROOT, "components", "ousthat", "THIRD_PARTY_NOTICES.md"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
ok("le catalogue expose un duel exactement à deux", /ousthat:\s*\{[^\n]*minPlayers:\s*2,\s*maxPlayers:\s*2/.test(page) && page.includes('"worldle", "ousthat"'));
ok("Leaflet est isolé du serveur et le plein écran échappe au transform de la porte", /dynamic\(\(\) => import\("@\/components\/ousthat\/OusThatGame"\),\s*\{[\s\S]{0,100}ssr:\s*false/.test(page) && /body\.ousthat-active \.door-content\{[^}]*transform:none/.test(css));
ok("les joueurs hors ligne sont écartés des deux sièges", /OusThatGame[^\n]*players=\{online === null \? players : players\.filter/.test(page));
ok("le nom exact et la description existent dans les deux langues", (i18n.match(/nameOusThat:\s*"Où's that \?"/g) || []).length === 2 && (i18n.match(/tagOusThat:/g) || []).length === 2);
ok("les règles de lancement sont bilingues", (rulesCopy.match(/ousthat:/g) || []).length === 1 && rulesCopy.includes("À l'expiration") && rulesCopy.includes("At timeout"));
ok("les invités ne font que demander et l'hôte seul applique/persiste", game.includes('event: "request"') && game.includes('event: "apply"') && /if \(!isHost\) return;[\s\S]{0,180}saveGameState/.test(game));
ok("la reconnexion transporte des durées, jamais une comparaison d'horloges clientes", game.includes("remainingMs") && game.includes("countdownMs") && !game.includes("clockOffset"));
ok("les propositions sont bridées sous dix messages par seconde", /PROPOSAL_INTERVAL_MS\s*=\s*120/.test(game));
ok("la carte de réponse se rétracte sans perdre son composant et le vrai point porte un drapeau", game.includes('mapOpen ? "open" : "collapsed"') && game.includes('className="ot-map-peek"') && game.includes("countryFlag(revealTarget?.country)") && map.includes("countryFlag(reveal.target.country)"));
ok("Google reçoit un pano et une orientation, sans clé copiée", frame.includes('pano: location.panoId') && frame.includes('heading: String(location.heading)') && frame.includes('referrerPolicy="strict-origin-when-cross-origin"') && frame.includes('process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY') && !/AIza[0-9A-Za-z_-]{30,}/.test(frame));
ok("la carte crédite OSM et ne précharge aucune tuile", map.includes("tile.openstreetmap.org/{z}/{x}/{y}.png") && map.includes("OpenStreetMap") && !/prefetch|bulk|download/i.test(map));
ok("la provenance reste bornée à la dernière révision MIT", notice.includes("ef88928c03a70d77ce5a1c86fddf74814ff67fc7") && /PolyForm\s+Noncommercial/.test(notice) && notice.includes("No code or data introduced after"));

console.log(fails ? `\n${fails} ÉCHEC(S) sur ${total} contrôles.\n` : `\n${total}/${total} contrôles verts.\n`);
if (process.argv.includes("--falsify")) console.log("Mutation active : ce passage ne doit JAMAIS être vert.\n");
process.exit(fails ? 1 : 0);
