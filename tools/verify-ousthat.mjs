/* =============================================================================
   verify-ousthat.mjs — LES MODES GÉOGRAPHIQUES SONT-ILS COHÉRENTS ET BRANCHÉS ?
   -----------------------------------------------------------------------------
   Ce banc appelle les règles pures réellement utilisées par le jeu, puis tient
   leurs jonctions avec le catalogue, le réseau hôte, Google Maps Embed,
   MapLibre/OpenFreeMap et la notice MIT des lieux.

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
  rulesSrc = rulesSrc
    .replace("Math.round((bestScore - team.score) * multiplier)", "0")
    .replace("Math.round(difference * multiplier)", "0");
}
fs.writeFileSync(path.join(tmp, "rules.mjs"), rulesSrc);
const countriesSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", "countries.js"), "utf8");
fs.writeFileSync(path.join(tmp, "countries.mjs"), countriesSrc);
const locationsDataSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", "locationsData.js"), "utf8");
fs.writeFileSync(path.join(tmp, "locationsData.mjs"), locationsDataSrc);
// Une carte de plus (maps.js) = un fichier mapData.<id>.js de plus, importé
// depuis maps.js — repéré ici par motif et copié avec le même traitement,
// pour que ce banc n'ait plus à être retouché à chaque carte ajoutée.
let mapsSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", "maps.js"), "utf8")
  .replaceAll('from "./locationsData"', 'from "./locationsData.mjs"');
for (const [, mapDataBase] of mapsSrc.matchAll(/from ["']\.\/(mapData\.[a-z0-9-]+)["']/g)) {
  const mapDataSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", `${mapDataBase}.js`), "utf8");
  fs.writeFileSync(path.join(tmp, `${mapDataBase}.mjs`), mapDataSrc);
}
mapsSrc = mapsSrc.replace(/from (["'])\.\/(mapData\.[a-z0-9-]+)\1/g, 'from "./$2.mjs"');
fs.writeFileSync(path.join(tmp, "maps.mjs"), mapsSrc);
const locationsSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", "locations.js"), "utf8")
  .replaceAll('from "./rules"', 'from "./rules.mjs"')
  .replaceAll('from "./countries"', 'from "./countries.mjs"')
  .replaceAll('from "./maps"', 'from "./maps.mjs"');
fs.writeFileSync(path.join(tmp, "locations.mjs"), locationsSrc);

const R = await import(pathToFileURL(path.join(tmp, "rules.mjs")).href);
const C = await import(pathToFileURL(path.join(tmp, "countries.mjs")).href);
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
const threeSeats = [{ id: "p1", teamId: "t1" }, { id: "p2", teamId: "t2" }, { id: "p3", teamId: "t3" }];
const threeTeams = [{ id: "t1", hp: 6000 }, { id: "t2", hp: 6000 }, { id: "t3", hp: 6000 }];
const threeWay = R.resolveRound({ seats: threeSeats, teams: threeTeams, answers: { p1: { confirmed: { lat: 0, lng: 0 } }, p2: { confirmed: { lat: 0, lng: 1 } } }, target: { lat: 0, lng: 0 }, round: 1 });
ok("à trois, chaque poursuivant subit son propre écart avec le meilleur", threeWay.teams.find((team) => team.id === "t1").damage === 0 && threeWay.teams.find((team) => team.id === "t2").damage > 0 && threeWay.teams.find((team) => team.id === "t3").damage === 5000);
const withEliminated = threeWay.teams.map((team) => team.id === "t3" ? { ...team, hp: 0 } : team);
ok("un joueur éliminé sort des réponses attendues mais reste dans l'état", R.activeSeats(threeSeats, withEliminated).length === 2 && withEliminated.length === 3);

section("pays, séries et parties courtes");
const countryRound = R.resolveCountryRound({ seats: threeSeats, answers: { p1: { confirmed: "FR" }, p2: { proposal: "FR" }, p3: { confirmed: "DE" } }, targetCountry: "FR" });
ok("le pays confirmé et le dernier pays proposé comptent tous les deux", countryRound.players[0].correct && countryRound.players[1].correct && !countryRound.players[2].correct);
const countryTotals = R.addCountryScores({ p1: 2, p2: 1 }, countryRound.players);
ok("les scores pays s'additionnent sans effacer une série précédente", countryTotals.p1 === 3 && countryTotals.p2 === 2 && countryTotals.p3 === 0);
ok("les ex aequo de tête sont tous gagnants", JSON.stringify(R.matchWinners(threeSeats, { p1: 4, p2: 4, p3: 2 })) === JSON.stringify(["p1", "p2"]));
ok("les deux formats courts restent fixés à cinq manches", R.SOLO_ROUNDS === 5 && R.MULTI_COUNTRY_ROUNDS === 5);

section("échéances, verrou et reprise");
ok("le délai final ne rallonge jamais la manche", R.finalDeadline(10_000, 20_000, 15) === 20_000 && R.finalDeadline(10_000, 100_000, 15) === 25_000);
ok("une réponse est acceptée jusqu'à l'échéance incluse", R.canAcceptAnswer({ phase: "playing", now: 2000, deadline: 2000, answer: null }));
ok("une réponse tardive ou déjà confirmée est refusée", !R.canAcceptAnswer({ phase: "playing", now: 2001, deadline: 2000, answer: null }) && !R.canAcceptAnswer({ phase: "playing", now: 1000, deadline: 2000, answer: { confirmed: { lat: 0, lng: 0 } } }));
ok("le signalement reste ouvert pendant preparing/countdown, peu importe l'échéance ou une réponse déjà là", R.canVoidLocation({ phase: "preparing", now: 5000, limit: 1000, anyConfirmed: true }) && R.canVoidLocation({ phase: "countdown", now: 5000, limit: null, anyConfirmed: false }));
ok("en durée limitée, le signalement suit l'échéance comme une réponse (ouvert avant, fermé après)", R.canVoidLocation({ phase: "playing", now: 1999, limit: 2000, anyConfirmed: false }) && !R.canVoidLocation({ phase: "playing", now: 2001, limit: 2000, anyConfirmed: false }));
ok("une réponse déjà confirmée ferme le signalement, même sans échéance à comparer", !R.canVoidLocation({ phase: "playing", now: 999999, limit: null, anyConfirmed: true }));
// Audit 2026-09-11 : limit === null en playing (manche illimitée, personne
// n'a encore confirmé) bloquait TOUJOURS le signalement (now <= null vaut
// now <= 0, donc toujours faux) — silencieusement, le bouton restait affiché
// mais chaque clic était refusé côté hôte. Corrigé pour suivre le même garde
// que canAcceptAnswer (deadline/limit === null = pas d'échéance à comparer).
ok("une manche illimitée où personne n'a confirmé reste signalable en playing, corrigé au 2026-09-11", R.canVoidLocation({ phase: "playing", now: 999999999, limit: null, anyConfirmed: false }));
ok("la confirmation prime toujours sur une proposition plus récente", R.effectiveAnswer({ confirmed: { lat: 1, lng: 2 }, proposal: { lat: 3, lng: 4 } }).lat === 1);
ok("une manche ne peut être résolue qu'une fois et avec le bon identifiant", R.canResolveRound({ phase: "playing", roundId: "r1", resolvedRoundId: null }, "r1") && !R.canResolveRound({ phase: "playing", roundId: "r1", resolvedRoundId: "r1" }, "r1") && !R.canResolveRound({ phase: "playing", roundId: "r1", resolvedRoundId: null }, "r2"));
const rematch = R.resetForRematch({ config: R.DEFAULT_CONFIG, teams, result: { old: true }, winnerTeamId: "t1", retry: 4 }, ["a", "b"], "match-2");
ok("la revanche garde les règles mais remet PV, manche et réponses à zéro", rematch.phase === "preparing" && rematch.round === 1 && rematch.retry === 0 && rematch.roundId === "match-2:1:0" && rematch.teams.every((team) => team.hp === 6000) && Object.keys(rematch.answers).length === 0 && rematch.winnerTeamId === null);

section("durée de manche Illimitée (2026-09-07) — règles pures");
// Sentinel choisi précisément pour survivre à la tuyauterie JSON du jeu
// (broadcast Realtime + rooms.game_state) : Infinity y serait devenu null,
// indiscernable d'une valeur absente — voir ROUND_SECONDS_UNLIMITED.
ok("le sentinel d'illimité est un nombre fini ordinaire, jamais Infinity (qui ne survit pas à un JSON.stringify)", Number.isFinite(R.ROUND_SECONDS_UNLIMITED) && JSON.parse(JSON.stringify({ v: Infinity })).v === null);
ok("0 est un roundSeconds valide : durée illimitée, conservée telle quelle", R.validateConfig({ ...R.DEFAULT_CONFIG, roundSeconds: R.ROUND_SECONDS_UNLIMITED }).ok && R.validateConfig({ ...R.DEFAULT_CONFIG, roundSeconds: R.ROUND_SECONDS_UNLIMITED }).value.roundSeconds === R.ROUND_SECONDS_UNLIMITED);
ok("un roundSeconds sous 20 mais différent du sentinel reste refusé", !R.validateConfig({ ...R.DEFAULT_CONFIG, roundSeconds: 5 }).ok);
ok("isUnlimitedRound reconnaît le sentinel, jamais une vraie petite valeur ni une config absente", R.isUnlimitedRound({ roundSeconds: 0 }) && !R.isUnlimitedRound({ roundSeconds: 20 }) && !R.isUnlimitedRound(undefined));
ok("une échéance nulle en cours de manche n'empêche plus les réponses (manche illimitée), mais la phase reste vérifiée", R.canAcceptAnswer({ phase: "playing", now: 999999999, deadline: null, answer: null }) && !R.canAcceptAnswer({ phase: "setup", now: 1, deadline: null, answer: null }));
ok("le délai final ne s'active jamais sur une manche sans échéance", R.finalDeadline(10_000, null, 15) === null);

section("sélection mondiale");
// Depuis le 2026-09-06 le stock mélange les 38 lieux WorldGuessr et la carte
// personnelle de Guillaume (~1500 lieux après déduplication, panoId et pays
// souvent absents) : les contrôles qui supposaient un panoId et un pays sur
// CHAQUE entrée, et aucune répétition de pays, ne tiennent plus — voir
// locationsData.js et tools/import-locations.mjs.
ok("au moins 1000 panoramas sont livrés", L.LOCATIONS.length >= 1000, `${L.LOCATIONS.length} lieux`);
const withCountry = L.LOCATIONS.filter((place) => place.country);
const distinctCountries = new Set(withCountry.map((place) => place.country));
ok("au moins 50 pays distincts sont couverts", distinctCountries.size >= 50, `${distinctCountries.size} pays`);
ok("chaque panorama garde des coordonnées et une orientation complètes", L.LOCATIONS.every((place) => R.normalizeGuess(place) && (place.panoId === null || (typeof place.panoId === "string" && place.panoId.length > 10)) && Number.isFinite(place.heading) && Number.isFinite(place.pitch) && Number.isFinite(place.fov)));
ok("les codes pays produisent un drapeau de révélation sûr", L.countryFlag("FR") === "🇫🇷" && L.countryFlag("?") === "🏳️");
ok("un pays de panorama, quand il existe, appartient toujours à la recherche GeoGuessr", L.LOCATIONS.every((place) => place.country === null || C.COUNTRY_BY_CODE[place.country]), `${C.COUNTRIES.length} choix admis, ${withCountry.length} lieux rattachés`);
const panoIds = L.LOCATIONS.filter((place) => place.panoId).map((place) => place.panoId);
ok("aucun panoId n'est dupliqué dans le stock", panoIds.length === new Set(panoIds).size, `${panoIds.length} panoId`);
const qcm = C.countryChoices("GR", "round-1", 4);
ok("le QCM est déterministe, unique et contient toujours la bonne réponse", qcm.length === 4 && new Set(qcm).size === 4 && qcm.includes("GR") && JSON.stringify(qcm) === JSON.stringify(C.countryChoices("GR", "round-1", 4)));

const orderA = L.locationOrder("same-match"), orderB = L.locationOrder("same-match"), orderC = L.locationOrder("other-match");
ok("le mélange Pinpoint est déterministe pour tous les clients", JSON.stringify(orderA) === JSON.stringify(orderB));
ok("deux matchs changent réellement l'ordre", JSON.stringify(orderA) !== JSON.stringify(orderC));
// Comparé à la carte PAR DÉFAUT, pas à L.LOCATIONS (union de toutes les
// cartes) : les deux coïncident tant qu'une seule carte existe, mais
// divergeront le jour où une deuxième s'ajoute au registre (maps.js) — voir
// le commentaire de tête sur les bancs qui rétrécissent sans qu'on le sache.
const defaultMapLocations = L.MAP_BY_ID["beautiful-world"].locations;
ok("un ordre Pinpoint contient TOUTE la carte par défaut, pays ou non, exactement une fois", orderA.length === defaultMapLocations.length && new Set(orderA).size === defaultMapLocations.length && orderA.every((id) => L.LOCATION_BY_ID[id]));

const countryOrderA = L.locationOrder("same-match", "country"), countryOrderB = L.locationOrder("other-match", "country");
const withCountryDefaultMap = defaultMapLocations.filter((place) => place.country);
ok("un ordre Pays ne contient QUE les lieux rattachés à un pays, exactement une fois", countryOrderA.length === withCountryDefaultMap.length && new Set(countryOrderA).size === withCountryDefaultMap.length && countryOrderA.every((id) => L.LOCATION_BY_ID[id].country !== null));
ok("le mode Pays exclut réellement des lieux que le mode Pinpoint inclut", countryOrderA.length < orderA.length);

section("cartes (maps.js, 2026-09-06)");
ok("le registre expose au moins la carte par défaut, cohérente avec rules.js", L.MAPS.length >= 1 && L.MAPS.some((m) => m.id === "beautiful-world") && R.GAME_MAP_IDS.includes("beautiful-world"));
ok("chaque carte du registre est admise par validateConfig", L.MAPS.every((m) => R.GAME_MAP_IDS.includes(m.id)));
ok("un mapId inconnu retombe sur la carte par défaut plutôt que de planter", R.validateConfig({ mapId: "carte-imaginaire" }).value.mapId === "beautiful-world" && L.locationOrder("x", "pinpoint", "carte-imaginaire").length === defaultMapLocations.length);
ok("un mapId explicite restreint bien le tirage à cette carte", JSON.stringify(L.locationOrder("same-match", "pinpoint", "beautiful-world")) === JSON.stringify(orderA));
ok("la config par défaut pointe déjà vers Beautiful World", R.DEFAULT_CONFIG.mapId === "beautiful-world");
ok("deux matchs Pays changent aussi l'ordre", JSON.stringify(countryOrderA) !== JSON.stringify(countryOrderB));

section("jonctions catalogue, réseau et fournisseurs");
const page = fs.readFileSync(path.join(ROOT, "app", "room", "[code]", "page.js"), "utf8");
const game = fs.readFileSync(path.join(ROOT, "components", "ousthat", "OusThatGame.js"), "utf8");
const frame = fs.readFileSync(path.join(ROOT, "components", "ousthat", "StreetViewFrame.js"), "utf8");
const map = fs.readFileSync(path.join(ROOT, "components", "ousthat", "GuessMap.js"), "utf8");
const portal = fs.readFileSync(path.join(ROOT, "components", "ousthat", "MapPortal.js"), "utf8");
const mapStyle = fs.readFileSync(path.join(ROOT, "components", "ousthat", "guessMapStyle.js"), "utf8");
const shieldLayerSrc = fs.readFileSync(path.join(ROOT, "components", "ousthat", "shieldLayer.js"), "utf8");
const i18n = fs.readFileSync(path.join(ROOT, "lib", "i18n.js"), "utf8");
const rulesCopy = fs.readFileSync(path.join(ROOT, "lib", "gameRules.js"), "utf8");
const notice = fs.readFileSync(path.join(ROOT, "components", "ousthat", "THIRD_PARTY_NOTICES.md"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "app", "globals.css"), "utf8");
ok("le catalogue ouvre le solo et borne le multijoueur à huit", /ousthat:\s*\{[^\n]*maxPlayers:\s*8/.test(page) && !/ousthat:\s*\{[^\n]*minPlayers:/.test(page) && page.includes('"worldle", "ousthat"'));
ok("MapLibre est isolé du serveur et le plein écran échappe au transform de la porte", /dynamic\(\(\) => import\("@\/components\/ousthat\/OusThatGame"\),\s*\{[\s\S]{0,100}ssr:\s*false/.test(page) && /body\.ousthat-active \.door-content\{[^}]*transform:none/.test(css));
ok("les joueurs hors ligne sont écartés des sièges", /OusThatGame[^\n]*players=\{online === null \? players : players\.filter/.test(page));
ok("le nom exact et la description existent dans les deux langues", (i18n.match(/nameOusThat:\s*"Où's that \?"/g) || []).length === 2 && (i18n.match(/tagOusThat:/g) || []).length === 2);
ok("les règles des quatre parcours sont bilingues", (rulesCopy.match(/ousthat:/g) || []).length === 1 && rulesCopy.includes("Country Streak :") && rulesCopy.includes("Country Streak:") && rulesCopy.includes("jusqu’à 8 joueurs") && rulesCopy.includes("one to eight players"));
ok("les invités ne font que demander et l'hôte seul applique/persiste", game.includes('event: "request"') && game.includes('event: "apply"') && /if \(!isHost\) return;[\s\S]{0,180}saveGameState/.test(game));
ok("la reconnexion transporte des durées, jamais une comparaison d'horloges clientes", game.includes("remainingMs") && game.includes("countdownMs") && !game.includes("clockOffset"));
ok("les propositions sont bridées sous dix messages par seconde", /PROPOSAL_INTERVAL_MS\s*=\s*120/.test(game));
ok("les quatre parcours sont sélectionnables et la version persistée a changé", game.includes('STATE_VERSION = 2') && game.includes("countryStreak") && game.includes("pinpointSoloDesc") && game.includes("MULTI_COUNTRY_ROUNDS") && game.includes("MAX_PLAYERS"));
ok("le solo ne pollue jamais les compteurs victoire/défaite", /state\?\.phase !== "finished" \|\| isSolo\(state\)/.test(game));
ok("le cartouche d'adresse Google est masqué dans les DEUX modes, jamais un seul", /<div className="ot-google-place-mask"/.test(game) && !/mode === "country" && <div className="ot-google-place-mask"/.test(game) && /\.ot-google-place-mask\{[^}]*z-index:6/.test(css));
ok("le masque Google reste pleinement opaque avant son dégradé (pas de fuite par transparence partielle)", /\.ot-google-place-mask\{[^}]*background:linear-gradient\(135deg,#040714 0%,#040714 80%,transparent\)/.test(css));
ok("le signalement de panorama passe par le thème du jeu, jamais par un window.confirm natif", !game.includes("window.confirm") && game.includes("reportArmed"));
ok("Pinpoint exige WebGL avant de pouvoir lancer la partie, pas seulement la clé Maps", game.includes("function supportsWebGL") && /disabled=\{!hasEmbedKey \|\| !state\.seats\.length \|\| \(draftConfig\.mode === "pinpoint" && !hasWebGL\)\}/.test(game));
ok("la carte de réponse se rétracte sans perdre son composant et le vrai point porte une épingle avec drapeau séparé", game.includes('mapOpen ? "open" : "collapsed"') && game.includes('className="ot-map-peek"') && game.includes("countryFlag(revealTarget?.country)") && map.includes("countryFlag(reveal.target.country)") && map.includes('kind === "target"') && map.includes('flag.className = "ot-map-target-flag"') && /\.ot-map-marker\.target\{[^}]*width:58px/.test(css) && /\.ot-map-target-flag\{/.test(css));
ok("Google reçoit un pano ou une coordonnée de repli, une orientation, sans clé copiée", frame.includes('params.set("pano", location.panoId)') && frame.includes('params.set("location", ') && frame.includes('heading: String(location.heading)') && frame.includes('referrerPolicy="strict-origin-when-cross-origin"') && frame.includes('process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY') && !/AIza[0-9A-Za-z_-]{30,}/.test(frame));
ok("la carte détaillée utilise l'OpenStreetMap US Tileservice sans clé et garde les interactions fluides", mapStyle.includes("tiles.openstreetmap.us") && map.includes("new AttributionControl") && map.includes("setWheelZoomRate") && map.includes("setZoomRate") && !/api[_-]?key|access[_-]?token/i.test(map));
ok("le style est vectoriel (OpenMapTiles), avec attribution OSM+OpenStreetMap US+Americana documentée, et les panneaux routiers portent le vrai code couleur par pays via Americana (CC0)", mapStyle.includes('type: "vector"') && mapStyle.includes("GUESS_MAP_ATTRIBUTION") && notice.includes("OpenStreetMap US Tileservice") && notice.includes("OpenStreetMap Americana") && /CC0-1\.0/.test(notice) && shieldLayerSrc.includes("route_") && map.includes("ShieldRenderer") && map.includes("shields.json"));
// 2026-09-11 (rythme des tours) : les props GuessMap passent maintenant par
// un objet JS (mapProps, vers MapPortal), plus des attributs JSX littéraux —
// même donnée, autre syntaxe. Voir plus bas pour les contrôles de la carte
// persistante elle-même.
ok("le pin de réponse et les pins de révélation portent les mascottes Arcardi", game.includes("avatar: mySeat?.avatar") && game.includes("seats: state.seats") && map.includes('seat?.avatar || "🧭"'));
ok("le temps de round configurable pilote l'échéance hôte partagée", /roundSeconds:\s*\[20,\s*300\]/.test(fs.readFileSync(path.join(ROOT, "components", "ousthat", "rules.js"), "utf8")) && game.includes("current.config.roundSeconds * 1000") && game.includes("remainingMs"));
ok("la provenance reste bornée à la dernière révision MIT", notice.includes("ef88928c03a70d77ce5a1c86fddf74814ff67fc7") && /PolyForm\s+Noncommercial/.test(notice) && notice.includes("No code or data introduced after"));

section("carte vectorielle et panneaux routiers (2026-09-07)");
const shieldDefsPath = path.join(ROOT, "public", "ousthat", "shields", "shields.json");
const shieldDefs = JSON.parse(fs.readFileSync(shieldDefsPath, "utf8"));
ok("les frontières, le fond de carte et les libellés pays/capitale/ville/route sont dans le style, pas dans une closure de rendu", /"source-layer":\s*"boundary"/.test(mapStyle) && /"source-layer":\s*"place"/.test(mapStyle) && mapStyle.includes('"class"], "country"') && mapStyle.includes('["get", "capital"], 2') && /"source-layer":\s*"transportation_name"/.test(mapStyle) && ["motorway", "trunk", "primary", "secondary", "tertiary"].every((cls) => mapStyle.includes(`"${cls}"`)));
ok("le libellé des lieux préfère le français, retombe sur l'anglais puis la forme latine avant le nom natif (évite le cyrillique/CJK/arabe injouable, faute de police dédiée)", /coalesce.*name:fr.*name:en.*name:latin/.test(mapStyle.replace(/\s+/g, " ")));
ok("le générateur de panneaux lit jusqu'à 8 itinéraires concurrents par tronçon (route_1_… à route_8_…) et jamais un réseau de randonnée/cyclisme", shieldLayerSrc.includes("route_${routeIndex}") && shieldLayerSrc.includes("MAX_CONCURRENT_ROUTES = 8") && /\[lrni\]\[chimpw\]n/.test(shieldLayerSrc));
ok("la table de panneaux vendorisée (CC0, Americana) couvre au moins la France et les USA nativement", !!shieldDefs.networks["FR:A-road"] && !!shieldDefs.networks["US:I"] && !!shieldDefs.networks.default);
ok("la route de voïvodie polonaise (pl:regional, l'exemple donné par Guillaume : jaune sur noir) a été ajoutée à la main, Americana ne la couvrant pas encore", shieldDefs.networks["pl:regional"]?.textColor === "black" && /^#f/i.test(shieldDefs.networks["pl:regional"]?.shapeBlank?.params?.fillColor || ""));
ok("les sprites de panneaux vides (1x et 2x) sont bien vendorisés à côté de la table", ["sprite.json", "sprite.png", "sprite@2x.json", "sprite@2x.png"].every((f) => fs.existsSync(path.join(ROOT, "public", "ousthat", "shields", f))));
ok("ni la carte de guessing ni le vol de révélation n'attendent \"load\" (le monde entier en tuiles vectorielles) — les deux passent par whenStyleReady", map.includes("whenStyleReady(map, () => setMapReady(true));") && map.includes("whenStyleReady(map, drawReveal);") && !map.includes('map.once("load"'));
ok("survoler le dock de carte l'ouvre (retour de Guillaume), le clic sur le rond reste le repli tactile", game.includes('onMouseEnter={() => setMapOpen(true)}') && game.includes('className="ot-map-peek"'));

section("durée de manche Illimitée (2026-09-07) — branchements");
ok("le début de manche part sans échéance quand la durée est illimitée", game.includes("isUnlimitedRound(current.config)"));
ok("l'hôte dispose d'un bouton pour terminer une manche illimitée bloquée (garde-fou AFK)", game.includes("c.endRound") && /isHost && state\.phase === "playing" && isUnlimitedRound\(state\.config\)/.test(game) && game.includes("hostResolve(state.roundId)"));
ok("le réglage de durée devient un curseur qui va jusqu'à Illimité, plutôt qu'un champ nu", game.includes("ROUND_DURATION_INFINITE_SLOT") && game.includes('type="range"') && game.includes("RoundDurationField"));
ok("le HUD affiche ∞ en manche illimitée au lieu d'un compte à rebours trompeur", /isUnlimitedRound\(state\.config\) && !state\.finalDeadline \? "∞"/.test(game));
// 2026-09-11 : en duel (2 joueurs actifs), la première validation arme 10 s
// fixes même en durée illimitée (voir DUEL_FINAL_SECONDS) — le HUD bascule
// alors de "∞" au compte à rebours réel, plutôt que de mentir sur l'illimité.
ok("un duel illimité arme un délai final fixe, jamais les parties à 3+", R.DUEL_FINAL_SECONDS === 10 && game.includes("isDuel && current.deadline === null") && game.includes("now + DUEL_FINAL_SECONDS * 1000") && game.includes("isDuel ? DUEL_FINAL_SECONDS : current.config.finalSeconds"));
ok("le délai final se grise et s'explique dans le setup quand la durée est illimitée", game.includes("finalTimeDisabledHint") && game.includes("dimmed={isUnlimitedRound(draftConfig)}"));

section("audit 2026-09-06 — masque Google, signalement et cartes");
ok("l'iframe Street View n'a plus allowFullScreen et sort de la navigation Tab", !/^\s*allowFullScreen\b/m.test(frame) && /tabIndex=\{-1\}/.test(frame));
ok("le masque d'adresse bloque vraiment le clic (pointer-events:auto), plus none", /\.ot-google-place-mask\{[^}]*pointer-events:auto/.test(css) && !/\.ot-google-place-mask\{[^}]*pointer-events:none/.test(css));
ok("le bouton de signalement vit aussi pendant preparing/countdown, pas seulement playing", /\(state\.phase === "playing" \|\| preparing\) && <button className=\{reportArmed/.test(game));
ok("le signalement passe par la règle pure canVoidLocation (rules.js), pas par une comparaison locale dupliquée", game.includes("canVoidLocation({") && game.includes("limit: currentLimit(current)") && !game.includes("now <= currentLimit(current)"));
ok("un tirage vide (mode Pays × carte sans pays) est refusé côté hôte ET annoncé côté client", game.includes("if (!order.length) return;") && game.includes("c.noLocationsForMap"));
ok("le setup affiche un sélecteur de carte et envoie mapId au lancement", game.includes("ot-map-picker") && game.includes("MAPS.map((map)") && game.includes("mapId: map.id") && /sendRequest\("start",\s*\{\s*config:\s*checked\.value\s*\}\)/.test(game));
ok("start() passe mapId à locationOrder côté hôte, la revanche aussi", /locationOrder\(matchId, checked\.value\.mode, checked\.value\.mapId\)/.test(game) && /locationOrder\(matchId, current\.config\.mode, current\.config\.mapId\)/.test(game));
ok("un téléphone en paysage (court, quelle que soit sa largeur) reçoit son propre resserrement", /@media \(max-height:500px\)\{[\s\S]{0,400}\.ot-map-dock\.open/.test(css));
// 2026-09-11 : la classe "ready" ne passe plus par le className React (voir
// l'audit du jour, §GuessMap) — un className recalculé à chaque rendu efface
// tout ce que MapLibre pose lui-même sur le même nœud, dont "maplibregl-map".
ok("le canevas MapLibre se fond en fondu plutôt que de flasher en blanc", /\.ot-map-canvas \.maplibregl-canvas\{ opacity:0/.test(css) && map.includes("whenStyleReady(map, () => setMapReady(true))") && map.includes('classList.toggle("ready", mapReady)'));

section("audit 2026-09-06 (suite) — sensibilité, transitions, plein écran, fin de partie");
ok("le zoom de la carte de réponse a été rendu plus sensible qu'avant (diviseurs abaissés)", /setWheelZoomRate\(1 \/ (\d+)\)/.exec(map)?.[1] < 450 && /setZoomRate\(1 \/ (\d+)\)/.exec(map)?.[1] < 100);
ok("le masque d'adresse porte un habillage de coin (coin arrondi + repère), pas un aplat brut", /\.ot-google-place-mask\{[^}]*border-radius:0 0 28px 0/.test(css) && game.includes('className="ot-google-place-mask-glyph"'));
ok("le voile de préparation reste monté et fond en sortie au lieu de se démonter net", game.includes('"ot-panorama-cover" + (preparing ? "" : " hidden")') && /\.ot-panorama-cover\.hidden\{ opacity:0/.test(css));
ok("le dock de révélation manche par manche a une entrée animée à chaque remontage", /\.ot-reveal-dock\{[^}]*animation:otRevealIn/.test(css));
// Le plein écran DOIT passer par ot-arena (masque + HUD en descendants,
// visibles même promus), jamais par l'iframe (Google y promeut SON contenu
// seul dans le calque plein écran, hors de portée d'un masque posé en frère).
ok("le plein écran est piloté par Arcardi sur l'arène, pas délégué à l'iframe Google", game.includes("arenaRef.current?.requestFullscreen") && !/^\s*allowFullScreen\b/m.test(frame));
// Trouvé EN JOUANT (2026-09-06) : un contexte qui refuse le plein écran peut
// lever un TypeError SYNCHRONE ("Permissions check failed"), pas seulement
// rejeter une promesse — sans garde, ça cassait tout le jeu pour un bouton
// de confort. Les deux formes d'échec doivent être couvertes.
ok("le bouton plein écran ne peut pas planter le jeu si l'API est refusée (try/catch + .catch())", /const toggleFullscreen = useCallback\(\(\) => \{\s*try \{[\s\S]{0,300}\} catch \(error\) \{/.test(game) && game.includes("requestFullscreen?.()?.catch(() => {})"));
ok("la fin de partie s'incruste sur le dernier panorama au lieu d'une page séparée", !game.includes('if (state.phase === "finished") {') && /state\.phase === "finished" && <FinishedDock/.test(game) && game.includes('"ot-finished-overlay"'));
ok("FinishedDock reçoit bien location (pays de repli) et déclenche next/lobby via les requêtes existantes", /<FinishedDock state=\{state\} result=\{state\.result\} mode=\{mode\} solo=\{solo\} lang=\{lang\} c=\{c\} revealTarget=\{revealTarget\} location=\{location\}/.test(game) && game.includes('onRematch={() => sendRequest("rematch")}'));

section("audit 2026-09-11 — typographie de l'écran de réglages, coordonnées, signalement illimité");
// L'audit demandait de retirer "le texte technique sur l'iframe et les
// coordonnées à cinq décimales" de l'écran de jeu : le lat/lng brut du
// marqueur de réponse ne s'affiche plus, remplacé par un état humain.
ok("le marqueur de réponse n'affiche plus ses coordonnées décimales brutes", !game.includes("draft.lat.toFixed(5)") && !game.includes("draft.lng.toFixed(5)") && game.includes("draft ? c.markerPlaced : c.noMarker"));
// "Prioriser mode/carte/Jouer et ranger les multiplicateurs dans un volet" :
// les trois champs multiplicateurs (bascule + deux réglages) sont sortis de
// la grille .ot-settings visible par défaut, dans un volet qui se replie —
// jamais ouvert d'entrée, sauf pour ne pas cacher une valeur hors bornes.
ok("les réglages de multiplicateurs vivent dans un volet replié par défaut, jamais caché en cas d'erreur", game.includes('className={"ot-advanced" + (advancedVisible ? " open" : "")}') && game.includes('const advancedVisible = advancedOpen || configErrors.includes("multiplierStartRound") || configErrors.includes("multiplierIncrement")'));
ok("le volet avancé encadre bien la bascule multiplicateurs et ses deux réglages conditionnels, rien de plus", /ot-advanced-toggle[\s\S]{0,600}ot-toggle-field[\s\S]{0,400}firstBoost[\s\S]{0,400}increment/.test(game));
// Typographie : Outfit remplace Space Mono SUR L'ÉCRAN DE RÉGLAGES SEULEMENT
// (.ot-setup-root, pas .ot-root) — HUD, révélation et fin de partie gardent
// Space Mono pour l'instant, à traiter dans la livraison "transitions et
// composition" séparée (§2 : ne pas mêler deux changements visuels).
ok("l'écran de réglages passe à Outfit sans toucher la police par défaut du reste du jeu", /\.ot-setup-root\{[^}]*font-family:'Outfit'/.test(css) && /\.ot-root\{[^}]*font-family:'Space Mono'/.test(css));
ok("le titre de l'écran de réglages perd sa lueur cyan décorative", !/\.ot-setup-card>h1\{[^}]*text-shadow/.test(css));

section("audit 2026-09-11 — rythme des tours (carte persistante, préchargement, pause)");
// toggleTransitionPause (rules.js) : pure, donc jouée ici sans composant.
const pausedAt3s = R.toggleTransitionPause({ phase: "countdown", countdownAt: 8000, transitionPaused: false }, 5000);
ok("mettre en pause fige une DURÉE restante et efface l'échéance, jamais l'inverse", pausedAt3s.transitionPaused === true && pausedAt3s.countdownAt === null && pausedAt3s.pausedCountdownMs === 3000);
const resumed = R.toggleTransitionPause({ phase: "countdown", countdownAt: null, transitionPaused: true, pausedCountdownMs: 3000 }, 20000);
ok("reprendre pose une échéance FRAÎCHE (now + durée figée), jamais l'ancienne horloge", resumed.transitionPaused === false && resumed.countdownAt === 23000 && resumed.pausedCountdownMs === null);
const preparingState = { phase: "preparing", transitionPaused: false };
const playingState = { phase: "playing", transitionPaused: false };
ok("hors de la phase countdown, la bascule est un no-op explicite (même référence, rien à diffuser)", R.toggleTransitionPause(preparingState, 1000) === preparingState && R.toggleTransitionPause(playingState, 1000) === playingState);
ok("une pause sans countdownAt connu (cas limite) retombe sur la durée par défaut du décompte", R.toggleTransitionPause({ phase: "countdown", countdownAt: null, transitionPaused: false }, 1000).pausedCountdownMs === R.COUNTDOWN_MS);
ok("resetForRematch ne démarre jamais une revanche déjà en pause", R.resetForRematch({ config: R.DEFAULT_CONFIG, teams, transitionPaused: true, pausedCountdownMs: 1200 }, ["a"], "m3").transitionPaused === false);

// Une seule carte : plus aucun <GuessMap> direct dans le composant de jeu,
// un seul point de montage via le portail, trois ancres distinctes (une par
// habillage visuel) pour qu'il sache où s'afficher selon la phase.
ok("OusThatGame ne monte plus GuessMap directement : tout passe par un seul MapPortal", !/<GuessMap[\s/]/.test(game) && game.includes('import MapPortal from "./MapPortal"') && (game.match(/<MapPortal\b/g) || []).length === 1);
ok("trois ancres distinctes (jeu, révélation, fin) désignent où la carte persistante s'affiche selon la phase", game.includes("playMapAnchorRef") && game.includes("revealMapAnchorRef") && game.includes("finishedMapAnchorRef") && game.includes('ref={playMapAnchorRef} className="ot-map-canvas"') && game.includes("mapAnchorRef={revealMapAnchorRef}") && game.includes("mapAnchorRef={finishedMapAnchorRef}"));
ok("le portail ne s'active qu'en Pinpoint, playing/reveal/finished — jamais en country ni pendant la transition", /const mapActive = mode === "pinpoint" && \(state\.phase === "playing" \|\| state\.phase === "reveal" \|\| state\.phase === "finished"\)/.test(game));
ok("le portail mesure l'ancre à chaque image (measure, pas un calcul CSS statique) et respecte un dock replié (visibility:hidden garde ses dimensions, contrairement à display:none)", portal.includes("requestAnimationFrame(sync)") && portal.includes("getBoundingClientRect()") && portal.includes('getComputedStyle(anchor).visibility === "hidden"'));
ok("hors ancre active, la carte est parquée hors écran plutôt que démontée (elle garde son contexte WebGL et son pan/zoom)", portal.includes('container.style.left = "-99999px"') && !/if \(!active\)[\s\S]{0,40}return null/.test(portal));
ok("GuessMap n'a plus besoin d'un prop expanded : un ResizeObserver réagit à n'importe quelle cause de redimensionnement du portail", !/function GuessMap\(\{[^}]*\bexpanded\b/.test(map) && map.includes("new ResizeObserver(() => map.resize())") && map.includes("resizeObserver.observe(rootRef.current)") && map.includes("resizeObserver.disconnect()"));

// Préchargement pendant la révélation : déduit sans requête réseau, jamais
// pour un signalement de lieu (tirage imprévisible côté client).
ok("le lieu suivant se déduit pendant reveal uniquement, jamais si la partie est terminée ou hors Pinpoint", /state\.phase !== "reveal" \|\| state\.matchComplete \|\| mode !== "pinpoint"\) return null;/.test(game));
ok("le panorama suivant charge caché (hors écran, aria-hidden), séparé du panorama affiché", game.includes('aria-hidden="true"') && game.includes('className="ot-sv-preload"') && game.includes("onFrameLoad={handlePreloadLoaded}") && /\.ot-sv-preload\{[^}]*position:fixed/.test(css));
ok("l'accusé de préchargement réutilise panorama_loaded (aucun protocole réseau nouveau) et se rattrape dès que la manche prédite devient réelle", game.includes('sendRequest("panorama_loaded", { roundId: predicted.roundId })') && game.includes('sendRequest("panorama_loaded", { roundId: state.roundId })') && game.includes("preloadedRoundIdRef.current = predicted.roundId"));

// Pause : hôte seul, uniquement pendant countdown (jamais preparing, qui n'a
// pas d'horloge visible), et l'affichage figé relit l'état diffusé plutôt
// que de comparer une horloge locale à un stock déjà expiré.
ok("le décompte ne se met en pause que côté hôte, jamais un invité", /request\.kind === "toggle_pause" && request\.from === room\.host_id/.test(game));
ok("togglePause est appliqué via la règle pure de rules.js (importée), pas une comparaison locale dupliquée", game.includes("toggleTransitionPause(current, now)") && /import \{[\s\S]{0,600}\btoggleTransitionPause\b[\s\S]{0,600}\} from "\.\/rules"/.test(game));
ok("l'affichage du décompte en pause relit la durée diffusée (pausedCountdownMs), jamais le tick local basé sur une horloge", /state\.transitionPaused\s*\n?\s*\? Math\.max\(1, Math\.ceil\(\(state\.pausedCountdownMs \?\? COUNTDOWN_MS\) \/ 1000\)\)/.test(game));
ok("countdownMs reconstruit correctement une pause (null, jamais 0 par Number(null))", game.includes('typeof transport.countdownMs === "number" ? transport.countdownMs : NaN') && game.includes("setLocalCountdown(Number.isFinite(remaining) ? Date.now() + Math.max(0, remaining) : null)"));

console.log(fails ? `\n${fails} ÉCHEC(S) sur ${total} contrôles.\n` : `\n${total}/${total} contrôles verts.\n`);
if (process.argv.includes("--falsify")) console.log("Mutation active : ce passage ne doit JAMAIS être vert.\n");
process.exit(fails ? 1 : 0);
