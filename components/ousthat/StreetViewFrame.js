"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";

const LOAD_WATCHDOG_MS = 18000;

export function streetViewUrl(location, key, lang = "fr") {
  if (!location?.panoId || !key) return null;
  const params = new URLSearchParams({
    key,
    pano: location.panoId,
    heading: String(location.heading),
    pitch: String(location.pitch),
    fov: String(location.fov),
    language: lang === "en" ? "en" : "fr",
  });
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
      allowFullScreen
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
