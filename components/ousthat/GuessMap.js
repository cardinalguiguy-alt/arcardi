"use client";
import { memo, useEffect, useRef } from "react";
import L from "leaflet";
import { countryFlag } from "./locations";
import { normalizeGuess } from "./rules";

const PLAYER_COLORS = ["#ffca5f", "#68d9ff", "#ff7fa4", "#86e39a", "#bda0ff", "#ff9f68", "#78e4da", "#e4de78"];

function icon(kind, label = "", color = "") {
  return L.divIcon({
    className: "ot-leaflet-icon",
    html: `<span class="ot-map-pin ${kind}"${color ? ` style="background:${color}"` : ""}><i></i>${label ? `<b>${label}</b>` : ""}</span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 39],
  });
}

function sameGuess(a, b) {
  return !!a && !!b && Math.abs(a.lat - b.lat) < 1e-10 && Math.abs(a.lng - b.lng) < 1e-10;
}

function unwrapLng(lng, around) {
  let value = lng;
  while (value - around > 180) value -= 360;
  while (value - around < -180) value += 360;
  return value;
}

function GuessMap({ marker, onChange, locked = false, expanded = false, reveal = null }) {
  const rootRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const revealLayersRef = useRef([]);
  const markerValueRef = useRef(marker);
  const onChangeRef = useRef(onChange);
  const lockedRef = useRef(locked);

  markerValueRef.current = marker;
  onChangeRef.current = onChange;
  lockedRef.current = locked;

  useEffect(() => {
    if (!rootRef.current || mapRef.current) return;
    const map = L.map(rootRef.current, {
      center: [18, 4], zoom: 2, minZoom: 2, maxZoom: 19,
      worldCopyJump: true, zoomControl: false, attributionControl: true,
      doubleClickZoom: true, scrollWheelZoom: true, touchZoom: true,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      minZoom: 2, maxZoom: 19, maxNativeZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.on("click", (event) => {
      // Leaflet sait distinguer un clic d'un glissement. Le second garde
      // couvre les périphériques où le pointerup et le clic arrivent dans
      // deux files d'événements différentes.
      if (lockedRef.current || map.dragging?.moved?.()) return;
      const next = normalizeGuess(event.latlng);
      if (next) onChangeRef.current?.(next);
    });
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      revealLayersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || reveal) return;
    const clean = normalizeGuess(marker);
    if (!clean) {
      if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
      return;
    }
    if (!markerRef.current) {
      const pin = L.marker([clean.lat, clean.lng], { icon: icon("mine"), draggable: !locked }).addTo(map);
      pin.on("dragend", () => {
        if (lockedRef.current) return;
        const next = normalizeGuess(pin.getLatLng());
        if (next) onChangeRef.current?.(next);
      });
      markerRef.current = pin;
    } else {
      if (!sameGuess(markerRef.current.getLatLng(), clean)) markerRef.current.setLatLng([clean.lat, clean.lng]);
      if (locked) markerRef.current.dragging?.disable();
      else markerRef.current.dragging?.enable();
    }
  }, [marker, locked, reveal]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    for (const layer of revealLayersRef.current) layer.remove();
    revealLayersRef.current = [];
    if (!reveal?.target) return;
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    const target = normalizeGuess(reveal.target);
    if (!target) return;
    const points = [L.latLng(target.lat, target.lng)];
    const targetMarker = L.marker([target.lat, target.lng], { icon: icon("target", countryFlag(reveal.target.country)), interactive: false }).addTo(map);
    revealLayersRef.current.push(targetMarker);
    (reveal.players || []).forEach((player, index) => {
      const guess = normalizeGuess(player.guess);
      if (!guess) return;
      const displayLng = unwrapLng(guess.lng, target.lng);
      const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
      const pin = L.marker([guess.lat, displayLng], { icon: icon("player", String(index + 1), color), interactive: false }).addTo(map);
      const line = L.polyline([[target.lat, target.lng], [guess.lat, displayLng]], { color, weight: 3, opacity: 0.82, dashArray: "7 8", interactive: false }).addTo(map);
      revealLayersRef.current.push(pin, line);
      points.push(L.latLng(guess.lat, displayLng));
    });
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [46, 46], maxZoom: 13, animate: false });
    else map.setView([target.lat, target.lng], 11, { animate: false });
  }, [reveal]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const timer = setTimeout(() => {
      map.invalidateSize({ pan: false });
      map.setView(center, zoom, { animate: false });
    }, 220);
    return () => clearTimeout(timer);
  }, [expanded]);

  return <div ref={rootRef} className="ot-map-canvas" role="application" aria-label="Carte de réponse" />;
}

export default memo(GuessMap);
