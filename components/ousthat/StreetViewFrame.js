"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";

const LOAD_WATCHDOG_MS = 18000;

export function streetViewUrl(location, key, lang = "fr") {
  if (!location || !key) return null;
  const params = new URLSearchParams({
    key,
    heading: String(location.heading),
    pitch: String(location.pitch),
    fov: String(location.fov),
    language: lang === "en" ? "en" : "fr",
  });
  // La plupart du stock élargi (2026-09-06) n'a pas de panoId figé : Google
  // résout alors le panorama le plus proche de la coordonnée, exactement
  // comme le fait GeoGuessr lui-même pour la majorité de ses propres lieux.
  // `pano=` reste préféré quand on l'a : un identifiant explicite ne peut
  // pas dériver vers un panorama voisin au fil du temps.
  if (location.panoId) params.set("pano", location.panoId);
  else if (Number.isFinite(location.lat) && Number.isFinite(location.lng)) params.set("location", `${location.lat},${location.lng}`);
  else return null;
  return `https://www.google.com/maps/embed/v1/streetview?${params.toString()}`;
}

function StreetViewFrame({ location, roundId, lang, onFrameLoad, onSlow }) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY || "";
  const src = useMemo(() => streetViewUrl(location, key, lang), [location, key, lang]);
  const [loaded, setLoaded] = useState(false);
  const loadSentRef = useRef(null);
  const loadedRef = useRef(false);
  const onSlowRef = useRef(onSlow);
  onSlowRef.current = onSlow;

  useEffect(() => {
    setLoaded(false);
    loadedRef.current = false;
    loadSentRef.current = null;
    if (!src) return;
    const timer = setTimeout(() => { if (!loadedRef.current) onSlowRef.current?.(); }, LOAD_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [roundId, src]);

  if (!src) return <div className="ot-sv ot-sv-missing" aria-hidden="true" />;

  return (
    <iframe
      key={roundId}
      className={"ot-sv" + (loaded ? " loaded" : "")}
      src={src}
      title="Google Street View"
      loading="eager"
      // Pas de allowFullScreen (audit 2026-09-06) : le plein écran natif de
      // Google fait disparaître tout le HUD Arcardi ET contourne
      // ot-google-place-mask — c'était le moyen de triche le plus direct.
      // tabIndex=-1 : exclut l'iframe (et tout ce qu'elle contient) de la
      // navigation Tab, seconde moitié du même contournement.
      tabIndex={-1}
      // Politique recommandée par Maps Embed : Google reçoit seulement
      // l'origine, assez pour valider les référents autorisés sans exposer
      // le code du salon ni le chemin complet.
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => {
        loadedRef.current = true;
        setLoaded(true);
        if (loadSentRef.current !== roundId) {
          loadSentRef.current = roundId;
          onFrameLoad?.();
        }
      }}
    />
  );
}

export default memo(StreetViewFrame);
