"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { saveGameState, readGameState } from "@/lib/gameSync";
import FlagIcon from "./FlagIcon";

const MAX_TRIES = 6;
const ROUND_MS = 180000; // 3 min

const CONT = {
  EU: { fr: "Europe", en: "Europe" },
  NA: { fr: "Amérique du Nord", en: "North America" },
  SA: { fr: "Amérique du Sud", en: "South America" },
  AS: { fr: "Asie", en: "Asia" },
  AF: { fr: "Afrique", en: "Africa" },
  OC: { fr: "Océanie", en: "Oceania" }
};

// lat/lng approximatifs de la capitale — suffisant pour un jeu entre amis.
const COUNTRIES = [
  { id: "fr", fr: "France", en: "France", flag: "🇫🇷", lat: 48.8566, lng: 2.3522, c: "EU" },
  { id: "au", fr: "Australie", en: "Australia", flag: "🇦🇺", lat: -35.2809, lng: 149.1300, c: "OC" },
  { id: "us", fr: "États-Unis", en: "United States", flag: "🇺🇸", lat: 38.9072, lng: -77.0369, c: "NA" },
  { id: "gb", fr: "Royaume-Uni", en: "United Kingdom", flag: "🇬🇧", lat: 51.5074, lng: -0.1278, c: "EU" },
  { id: "de", fr: "Allemagne", en: "Germany", flag: "🇩🇪", lat: 52.5200, lng: 13.4050, c: "EU" },
  { id: "es", fr: "Espagne", en: "Spain", flag: "🇪🇸", lat: 40.4168, lng: -3.7038, c: "EU" },
  { id: "it", fr: "Italie", en: "Italy", flag: "🇮🇹", lat: 41.9028, lng: 12.4964, c: "EU" },
  { id: "pt", fr: "Portugal", en: "Portugal", flag: "🇵🇹", lat: 38.7223, lng: -9.1393, c: "EU" },
  { id: "be", fr: "Belgique", en: "Belgium", flag: "🇧🇪", lat: 50.8503, lng: 4.3517, c: "EU" },
  { id: "nl", fr: "Pays-Bas", en: "Netherlands", flag: "🇳🇱", lat: 52.3676, lng: 4.9041, c: "EU" },
  { id: "ch", fr: "Suisse", en: "Switzerland", flag: "🇨🇭", lat: 46.9480, lng: 7.4474, c: "EU" },
  { id: "at", fr: "Autriche", en: "Austria", flag: "🇦🇹", lat: 48.2082, lng: 16.3738, c: "EU" },
  { id: "se", fr: "Suède", en: "Sweden", flag: "🇸🇪", lat: 59.3293, lng: 18.0686, c: "EU" },
  { id: "no", fr: "Norvège", en: "Norway", flag: "🇳🇴", lat: 59.9139, lng: 10.7522, c: "EU" },
  { id: "dk", fr: "Danemark", en: "Denmark", flag: "🇩🇰", lat: 55.6761, lng: 12.5683, c: "EU" },
  { id: "fi", fr: "Finlande", en: "Finland", flag: "🇫🇮", lat: 60.1699, lng: 24.9384, c: "EU" },
  { id: "pl", fr: "Pologne", en: "Poland", flag: "🇵🇱", lat: 52.2297, lng: 21.0122, c: "EU" },
  { id: "gr", fr: "Grèce", en: "Greece", flag: "🇬🇷", lat: 37.9838, lng: 23.7275, c: "EU" },
  { id: "ie", fr: "Irlande", en: "Ireland", flag: "🇮🇪", lat: 53.3498, lng: -6.2603, c: "EU" },
  { id: "ru", fr: "Russie", en: "Russia", flag: "🇷🇺", lat: 55.7558, lng: 37.6173, c: "EU" },
  { id: "ca", fr: "Canada", en: "Canada", flag: "🇨🇦", lat: 45.4215, lng: -75.6972, c: "NA" },
  { id: "mx", fr: "Mexique", en: "Mexico", flag: "🇲🇽", lat: 19.4326, lng: -99.1332, c: "NA" },
  { id: "br", fr: "Brésil", en: "Brazil", flag: "🇧🇷", lat: -15.8267, lng: -47.9218, c: "SA" },
  { id: "ar", fr: "Argentine", en: "Argentina", flag: "🇦🇷", lat: -34.6037, lng: -58.3816, c: "SA" },
  { id: "cl", fr: "Chili", en: "Chile", flag: "🇨🇱", lat: -33.4489, lng: -70.6693, c: "SA" },
  { id: "pe", fr: "Pérou", en: "Peru", flag: "🇵🇪", lat: -12.0464, lng: -77.0428, c: "SA" },
  { id: "co", fr: "Colombie", en: "Colombia", flag: "🇨🇴", lat: 4.7110, lng: -74.0721, c: "SA" },
  { id: "jp", fr: "Japon", en: "Japan", flag: "🇯🇵", lat: 35.6762, lng: 139.6503, c: "AS" },
  { id: "cn", fr: "Chine", en: "China", flag: "🇨🇳", lat: 39.9042, lng: 116.4074, c: "AS" },
  { id: "in", fr: "Inde", en: "India", flag: "🇮🇳", lat: 28.6139, lng: 77.2090, c: "AS" },
  { id: "kr", fr: "Corée du Sud", en: "South Korea", flag: "🇰🇷", lat: 37.5665, lng: 126.9780, c: "AS" },
  { id: "th", fr: "Thaïlande", en: "Thailand", flag: "🇹🇭", lat: 13.7563, lng: 100.5018, c: "AS" },
  { id: "vn", fr: "Vietnam", en: "Vietnam", flag: "🇻🇳", lat: 21.0285, lng: 105.8542, c: "AS" },
  { id: "id", fr: "Indonésie", en: "Indonesia", flag: "🇮🇩", lat: -6.2088, lng: 106.8456, c: "AS" },
  { id: "ph", fr: "Philippines", en: "Philippines", flag: "🇵🇭", lat: 14.5995, lng: 120.9842, c: "AS" },
  { id: "eg", fr: "Égypte", en: "Egypt", flag: "🇪🇬", lat: 30.0444, lng: 31.2357, c: "AF" },
  { id: "ma", fr: "Maroc", en: "Morocco", flag: "🇲🇦", lat: 34.0209, lng: -6.8416, c: "AF" },
  { id: "za", fr: "Afrique du Sud", en: "South Africa", flag: "🇿🇦", lat: -25.7461, lng: 28.1881, c: "AF" },
  { id: "ng", fr: "Nigéria", en: "Nigeria", flag: "🇳🇬", lat: 9.0765, lng: 7.3986, c: "AF" },
  { id: "ke", fr: "Kenya", en: "Kenya", flag: "🇰🇪", lat: -1.2921, lng: 36.8219, c: "AF" },
  { id: "nz", fr: "Nouvelle-Zélande", en: "New Zealand", flag: "🇳🇿", lat: -41.2865, lng: 174.7762, c: "OC" },
  { id: "tr", fr: "Turquie", en: "Turkey", flag: "🇹🇷", lat: 39.9334, lng: 32.8597, c: "AS" },
  { id: "il", fr: "Israël", en: "Israel", flag: "🇮🇱", lat: 31.7683, lng: 35.2137, c: "AS" },
  { id: "ae", fr: "Émirats arabes unis", en: "United Arab Emirates", flag: "🇦🇪", lat: 24.4539, lng: 54.3773, c: "AS" },
  { id: "is", fr: "Islande", en: "Iceland", flag: "🇮🇸", lat: 64.1466, lng: -21.9426, c: "EU" },
  { id: "ua", fr: "Ukraine", en: "Ukraine", flag: "🇺🇦", lat: 50.4501, lng: 30.5234, c: "EU" },
  { id: "cz", fr: "République tchèque", en: "Czechia", flag: "🇨🇿", lat: 50.0755, lng: 14.4378, c: "EU" },
  { id: "hu", fr: "Hongrie", en: "Hungary", flag: "🇭🇺", lat: 47.4979, lng: 19.0402, c: "EU" },
  { id: "hr", fr: "Croatie", en: "Croatia", flag: "🇭🇷", lat: 45.8150, lng: 15.9819, c: "EU" },
  { id: "sg", fr: "Singapour", en: "Singapore", flag: "🇸🇬", lat: 1.3521, lng: 103.8198, c: "AS" },
  { id: "my", fr: "Malaisie", en: "Malaysia", flag: "🇲🇾", lat: 3.1390, lng: 101.6869, c: "AS" },
  { id: "sa", fr: "Arabie saoudite", en: "Saudi Arabia", flag: "🇸🇦", lat: 24.7136, lng: 46.6753, c: "AS" },
  { id: "qa", fr: "Qatar", en: "Qatar", flag: "🇶🇦", lat: 25.2854, lng: 51.5310, c: "AS" },
  { id: "cu", fr: "Cuba", en: "Cuba", flag: "🇨🇺", lat: 23.1136, lng: -82.3666, c: "NA" },
  { id: "jm", fr: "Jamaïque", en: "Jamaica", flag: "🇯🇲", lat: 17.9712, lng: -76.7936, c: "NA" },
  { id: "uy", fr: "Uruguay", en: "Uruguay", flag: "🇺🇾", lat: -34.9011, lng: -56.1645, c: "SA" },
  { id: "bo", fr: "Bolivie", en: "Bolivia", flag: "🇧🇴", lat: -16.4897, lng: -68.1193, c: "SA" },
  { id: "ve", fr: "Venezuela", en: "Venezuela", flag: "🇻🇪", lat: 10.4806, lng: -66.9036, c: "SA" },
  { id: "ec", fr: "Équateur", en: "Ecuador", flag: "🇪🇨", lat: -0.1807, lng: -78.4678, c: "SA" },
  { id: "py", fr: "Paraguay", en: "Paraguay", flag: "🇵🇾", lat: -25.2637, lng: -57.5759, c: "SA" },
  { id: "ir", fr: "Iran", en: "Iran", flag: "🇮🇷", lat: 35.6892, lng: 51.3890, c: "AS" },
  { id: "pk", fr: "Pakistan", en: "Pakistan", flag: "🇵🇰", lat: 33.6844, lng: 73.0479, c: "AS" },
  { id: "bd", fr: "Bangladesh", en: "Bangladesh", flag: "🇧🇩", lat: 23.8103, lng: 90.4125, c: "AS" },
  { id: "lk", fr: "Sri Lanka", en: "Sri Lanka", flag: "🇱🇰", lat: 6.9271, lng: 79.8612, c: "AS" },
  { id: "np", fr: "Népal", en: "Nepal", flag: "🇳🇵", lat: 27.7172, lng: 85.3240, c: "AS" },
  { id: "mn", fr: "Mongolie", en: "Mongolia", flag: "🇲🇳", lat: 47.8864, lng: 106.9057, c: "AS" },
  { id: "tw", fr: "Taïwan", en: "Taiwan", flag: "🇹🇼", lat: 25.0330, lng: 121.5654, c: "AS" },
  { id: "dz", fr: "Algérie", en: "Algeria", flag: "🇩🇿", lat: 36.7538, lng: 3.0588, c: "AF" },
  { id: "tn", fr: "Tunisie", en: "Tunisia", flag: "🇹🇳", lat: 36.8065, lng: 10.1815, c: "AF" },
  { id: "et", fr: "Éthiopie", en: "Ethiopia", flag: "🇪🇹", lat: 9.0300, lng: 38.7400, c: "AF" },
  { id: "gh", fr: "Ghana", en: "Ghana", flag: "🇬🇭", lat: 5.6037, lng: -0.1870, c: "AF" },
  { id: "sn", fr: "Sénégal", en: "Senegal", flag: "🇸🇳", lat: 14.7167, lng: -17.4677, c: "AF" },
  { id: "tz", fr: "Tanzanie", en: "Tanzania", flag: "🇹🇿", lat: -6.1630, lng: 35.7516, c: "AF" },
  { id: "zw", fr: "Zimbabwe", en: "Zimbabwe", flag: "🇿🇼", lat: -17.8252, lng: 31.0335, c: "AF" },
  { id: "rs", fr: "Serbie", en: "Serbia", flag: "🇷🇸", lat: 44.7866, lng: 20.4489, c: "EU" },
  { id: "si", fr: "Slovénie", en: "Slovenia", flag: "🇸🇮", lat: 46.0569, lng: 14.5058, c: "EU" },
  { id: "sk", fr: "Slovaquie", en: "Slovakia", flag: "🇸🇰", lat: 48.1486, lng: 17.1077, c: "EU" },
  { id: "bg", fr: "Bulgarie", en: "Bulgaria", flag: "🇧🇬", lat: 42.6977, lng: 23.3219, c: "EU" },
  { id: "ro", fr: "Roumanie", en: "Romania", flag: "🇷🇴", lat: 44.4268, lng: 26.1025, c: "EU" },
  { id: "ee", fr: "Estonie", en: "Estonia", flag: "🇪🇪", lat: 59.4370, lng: 24.7536, c: "EU" },
  { id: "lv", fr: "Lettonie", en: "Latvia", flag: "🇱🇻", lat: 56.9496, lng: 24.1052, c: "EU" },
  { id: "lt", fr: "Lituanie", en: "Lithuania", flag: "🇱🇹", lat: 54.6872, lng: 25.2797, c: "EU" },
  { id: "lu", fr: "Luxembourg", en: "Luxembourg", flag: "🇱🇺", lat: 49.6116, lng: 6.1319, c: "EU" },
  { id: "mt", fr: "Malte", en: "Malta", flag: "🇲🇹", lat: 35.8989, lng: 14.5146, c: "EU" },
  { id: "cy", fr: "Chypre", en: "Cyprus", flag: "🇨🇾", lat: 35.1856, lng: 33.3823, c: "EU" }
];

function normalize(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function distanceKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function bearing(a, b) {
  const toRad = d => d * Math.PI / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
const ARROWS = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];
function arrowFor(deg) { return ARROWS[Math.round(deg / 45) % 8]; }
function proximityPct(km) { return Math.max(0, Math.round(100 - (km / 20015) * 100)); }

export default function Worldle({ room, me, isHost, players, onFinish, t, lang }) {
  const [deadline, setDeadline] = useState(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [target, setTarget] = useState(null); // objet pays
  const [guesses, setGuesses] = useState([]); // [{ country, km, deg, pct }]
  const [query, setQuery] = useState("");
  const [finished, setFinished] = useState(false);
  const [opponents, setOpponents] = useState({});
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const channelRef = useRef(null);
  const myResult = useRef({ solved: false, tries: 0, bestPct: 0 });
  const roundTimeout = useRef(null);
  const doneSetRef = useRef(new Set());
  const restoredRef = useRef(false);

  useEffect(() => {
    const ch = supabase.channel("worldle_" + room.id, { config: { broadcast: { self: true } } });
    channelRef.current = ch;

    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      setTarget(COUNTRIES.find(c => c.id === payload.targetId));
      setDeadline(Date.now() + payload.remaining);
      setGuesses([]); setQuery(""); setFinished(false); setOpponents({});
      myResult.current = { solved: false, tries: 0, bestPct: 0 };
      doneSetRef.current = new Set();
      setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
      if (isHost) {
        saveGameState(room.id, "worldle", {
          phase: "playing", targetId: payload.targetId,
          deadlineAt: Date.now() + payload.remaining, finished: false,
        });
      }
    });
    ch.on("broadcast", { event: "progress" }, ({ payload }) => {
      // Fin de manche anticipée : dès que tout le monde a fini, pas besoin
      // d'attendre le chrono complet.
      if (payload.solved || payload.failed) {
        doneSetRef.current.add(payload.profile_id);
        if (isHost && players?.length > 0 && doneSetRef.current.size >= players.length) {
          hostEndRound();
        }
      }
      if (payload.profile_id === me.id) return;
      setOpponents(prev => ({ ...prev, [payload.profile_id]: payload }));
    });
    ch.on("broadcast", { event: "finished" }, async () => {
      setFinished(true);
      if (isHost) saveGameState(room.id, "worldle", { phase: "finished", finished: true });
      try {
        const pts = pointsFor(myResult.current);
        await supabase.from("game_results").insert({ room_id: room.id, profile_id: me.id, game_id: "worldle", points: pts });
        if (pts > 0) await supabase.rpc("add_points", { p_room: room.id, p_delta: pts });
      } catch (e) {}
    });

    ch.subscribe(status => {
      if (status !== "SUBSCRIBED" || restoredRef.current) return;
      restoredRef.current = true;
      // Resynchronisation : le pays cible et le chrono partagés sont
      // restaurés immédiatement après un rechargement de page. Seule la
      // progression PRIVÉE du joueur (ses propres essais) repart de zéro
      // (RLS : seul l'hôte écrit sur le salon).
      const saved = readGameState(room, "worldle");
      if (!saved) return;
      if (saved.finished) { setFinished(true); return; }
      if (!saved.targetId) return;
      setTarget(COUNTRIES.find(c => c.id === saved.targetId));
      setDeadline(saved.deadlineAt);
      setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
      if (isHost) {
        const msLeft = Math.max(0, saved.deadlineAt - Date.now());
        roundTimeout.current = setTimeout(hostEndRound, msLeft);
      }
    });
    return () => { clearTimeout(roundTimeout.current); supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setTimeLeft(left);
      if (left <= 0) clearInterval(iv);
    }, 100);
    return () => clearInterval(iv);
  }, [deadline]);

  function pointsFor(res) {
    if (res.solved) return Math.max(7 - res.tries, 1);
    return Math.max(0, Math.floor(res.bestPct / 25) - 2); // petite consolation si on s'est approché
  }

  function hostStart() {
    const targetC = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    channelRef.current.send({ type: "broadcast", event: "start", payload: { targetId: targetC.id, remaining: ROUND_MS } });
    roundTimeout.current = setTimeout(hostEndRound, ROUND_MS);
  }

  function hostEndRound() {
    clearTimeout(roundTimeout.current);
    channelRef.current.send({ type: "broadcast", event: "finished", payload: {} });
    setTimeout(async () => {
      await supabase.from("rooms").update({ status: "lobby", current_game: null, game_state: null }).eq("id", room.id);
      onFinish && onFinish();
    }, 3000);
  }

  const suggestions = useMemo(() => {
    if (!query || query.length < 1) return [];
    const nq = normalize(query);
    const already = new Set(guesses.map(g => g.country.id));
    return COUNTRIES.filter(c => !already.has(c.id) && normalize(c[lang] || c.fr).includes(nq)).slice(0, 6);
  }, [query, guesses, lang]);

  function guessCountry(c) {
    if (myResult.current.solved || finished || guesses.length >= MAX_TRIES) return;
    const km = Math.round(distanceKm(c, target));
    const deg = bearing(c, target);
    const pct = c.id === target.id ? 100 : proximityPct(km);
    const sameContinent = c.c === target.c;
    const nextGuesses = [...guesses, { country: c, km, deg, pct, sameContinent }];
    setGuesses(nextGuesses);
    setQuery(""); setHighlight(0);
    const solved = c.id === target.id;
    const bestPct = Math.max(myResult.current.bestPct, pct);
    myResult.current = { solved, tries: nextGuesses.length, bestPct };
    const failed = !solved && nextGuesses.length >= MAX_TRIES;
    channelRef.current.send({
      type: "broadcast", event: "progress",
      payload: { profile_id: me.id, username: me.username, avatar: me.avatar, tries: nextGuesses.length, solved, failed, bestPct }
    });
  }

  const done = myResult.current.solved || guesses.length >= MAX_TRIES;

  if (finished) {
    const pts = pointsFor(myResult.current);
    return (
      <div className="panel">
        <h1>{t("worldleTitle")}</h1>
        {myResult.current.solved
          ? <p className="hint">{t("foundInPre")} {myResult.current.tries} {t("foundInSuffix")}</p>
          : <p className="hint">{t("worldleFailedPre")} <b style={{ color: "var(--p2)" }}>{target["fr"]} <FlagIcon code={target.id} /></b></p>}
        <p style={{ fontWeight: 800 }}>{t("peYourGain")} <span style={{ color: "var(--p3)", fontFamily: "'Space Mono'" }}>+{pts} {t("pts")}</span></p>
      </div>
    );
  }

  return (
    <div className="panel" style={{ maxWidth: "min(640px, 92vw)" }}>
      <h1>{t("worldleTitle")}</h1>
      {!target && isHost && (
        <>
          <p className="hint">{MAX_TRIES} {t("worldleIntro")}</p>
          <button className="btn" onClick={hostStart}>{t("start")}</button>
        </>
      )}
      {!target && !isHost && <p className="muted">{t("waitStart")}</p>}

      {target && (
        <>
          <div style={{ height: 8, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden", margin: "10px 0 16px" }}>
            <div style={{ height: "100%", width: (timeLeft / ROUND_MS * 100) + "%", background: "linear-gradient(90deg,var(--p3),var(--p1))", transition: "width .1s linear" }} />
          </div>

          {!done && (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input ref={inputRef} type="text" placeholder={t("worldlePlaceholder")} value={query}
                onChange={e => { setQuery(e.target.value); setHighlight(0); }}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, suggestions.length - 1)); }
                  else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
                  else if (e.key === "Enter" && suggestions.length > 0) guessCountry(suggestions[highlight] || suggestions[0]);
                }} />
              {suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card2)", border: "2px solid var(--line)", borderRadius: 10, marginTop: 4, overflow: "hidden", zIndex: 5 }}>
                  {suggestions.map((c, i) => (
                    <button key={c.id} onClick={() => guessCountry(c)}
                      style={{ display: "flex", gap: 8, width: "100%", padding: "10px 12px", textAlign: "left", background: i === highlight ? "rgba(255,255,255,.08)" : "transparent" }}>
                      <span><FlagIcon code={c.id} /></span><span>{c[lang] || c.fr}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {!done && (
            <p className="muted" style={{ marginBottom: 10, fontSize: 12 }}>
              {t("wordleLiveHint")} <b style={{ color: "var(--p3)" }}>+{Math.max(7 - (guesses.length + 1), 1)} {t("pts")}</b>
            </p>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {guesses.slice().reverse().map((g, i) => {
              const isBest = g.pct === myResult.current.bestPct && g.country.id !== target.id;
              return (
                <div key={i} className="stage-enter" style={{
                  padding: "10px 12px", borderRadius: 12, border: `2px solid ${g.country.id === target.id ? "var(--p3)" : isBest ? "var(--p4)" : "var(--line)"}`,
                  background: "rgba(255,255,255,.03)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: g.country.id === target.id ? 0 : 6 }}>
                    <span><FlagIcon code={g.country.id} /> {g.country[lang] || g.country.fr}</span>
                    {g.country.id === target.id
                      ? <span style={{ color: "var(--p3)", fontWeight: 800 }}>🎯</span>
                      : <span style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "'Space Mono'", fontSize: 13 }}>
                          <span>{g.km} km</span><span>{arrowFor(g.deg)}</span>
                          <span style={{ color: isBest ? "var(--p4)" : "var(--p3)" }}>{g.pct}%</span>
                        </span>}
                  </div>
                  {g.country.id !== target.id && (
                    <>
                      <div style={{ height: 6, background: "rgba(255,255,255,.08)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: g.pct + "%", background: isBest ? "var(--p4)" : "var(--p2)", transition: "width .4s ease" }} />
                      </div>
                      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {g.sameContinent ? "🌍 " + t("worldleSameCont") : "🌐 " + t("worldleDiffCont")}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {done && !myResult.current.solved && <p className="muted" style={{ marginTop: 10 }}>{t("wordleWaitOthers")}</p>}
          {done && myResult.current.solved && (
            <p style={{ color: "var(--p3)", fontWeight: 800, marginTop: 10 }}>{t("foundInPre")} {myResult.current.tries} {t("foundInSuffix")}</p>
          )}

          {Object.keys(opponents).length > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
              <p className="muted" style={{ marginBottom: 8 }}>{t("wordleOpponents")}</p>
              {Object.values(opponents).map(o => (
                <div className="player-chip" key={o.profile_id} style={{ padding: "6px 10px" }}>
                  <span>{o.avatar}</span><span>{o.username}</span>
                  <span className="pt">{o.solved ? "✅ " + o.tries + "/" + MAX_TRIES : (o.failed ? "❌" : (o.bestPct + "%"))}</span>
                </div>
              ))}
            </div>
          )}
          {isHost && done && (
            <button className="btn ghost" style={{ marginTop: 14 }} onClick={hostEndRound}>⏭️ {t("endRoundNow")}</button>
          )}
        </>
      )}
    </div>
  );
}
