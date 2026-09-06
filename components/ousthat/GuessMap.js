"use client";
import { memo, useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  NavigationControl,
} from "maplibre-gl";
import { countryFlag } from "./locations";
import { normalizeGuess } from "./rules";

const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const REVEAL_SOURCE_ID = "ot-reveal-lines";
const REVEAL_LAYER_ID = "ot-reveal-lines-layer";
const EMPTY_SEATS = Object.freeze([]);
const PLAYER_COLORS = ["#ffca5f", "#68d9ff", "#ff7fa4", "#86e39a", "#bda0ff", "#ff9f68", "#78e4da", "#e4de78"];

function pinElement(kind, label = "", color = "", number = null) {
  const root = document.createElement("div");
  root.className = `ot-map-marker ${kind}`;
  root.setAttribute("aria-hidden", "true");
  if (color) root.style.setProperty("--pin-color", color);

  if (kind === "target") {
    // Hors-zip 2026-09-06 : le vrai lieu garde une épingle neutre et porte
    // son drapeau à côté ; il ne peut plus être confondu avec une réponse.
    const pin = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    pin.classList.add("ot-map-target-pin");
    pin.setAttribute("viewBox", "0 0 34 50");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shape.setAttribute("d", "M17 49 C14 43 3 29 3 18 A14 14 0 1 1 31 18 C31 29 20 43 17 49Z");
    const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    center.setAttribute("cx", "17");
    center.setAttribute("cy", "18");
    center.setAttribute("r", "5");
    pin.append(shape, center);
    root.appendChild(pin);

    const flag = document.createElement("i");
    flag.className = "ot-map-target-flag";
    flag.textContent = label;
    root.appendChild(flag);
  } else {
    const pin = document.createElement("span");
    pin.className = `ot-map-pin ${kind}`;
    const avatar = document.createElement("b");
    avatar.className = "ot-map-pin-avatar";
    avatar.textContent = label;
    pin.appendChild(avatar);
    root.appendChild(pin);
  }

  if (number !== null) {
    const badge = document.createElement("small");
    badge.textContent = String(number);
    root.appendChild(badge);
  }
  return root;
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

function removeReveal(map, markers) {
  for (const marker of markers) marker.remove();
  markers.length = 0;
  if (!map) return;
  if (map.getLayer(REVEAL_LAYER_ID)) map.removeLayer(REVEAL_LAYER_ID);
  if (map.getSource(REVEAL_SOURCE_ID)) map.removeSource(REVEAL_SOURCE_ID);
}

function GuessMap({ marker, onChange, locked = false, expanded = false, reveal = null, avatar = "🗺️", seats = EMPTY_SEATS, unavailableMessage = "La carte détaillée nécessite l’accélération graphique du navigateur." }) {
  const rootRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const revealMarkersRef = useRef([]);
  const [mapError, setMapError] = useState(false);
  const onChangeRef = useRef(onChange);
  const lockedRef = useRef(locked);

  onChangeRef.current = onChange;
  lockedRef.current = locked;

  useEffect(() => {
    if (!rootRef.current || mapRef.current) return;
    let map;
    try {
      map = new MapLibreMap({
        container: rootRef.current,
        style: OPENFREEMAP_STYLE,
        center: [4, 18],
        zoom: 1.6,
        minZoom: 1.5,
        maxZoom: 19,
        renderWorldCopies: true,
        attributionControl: false,
        cooperativeGestures: false,
      });
    } catch (error) {
      // MapLibre 4 accepte WebGL1 et WebGL2 ; cette sortie évite malgré tout
      // de faire tomber le jeu si l'accélération graphique est désactivée.
      console.error("OpenFreeMap n’a pas pu initialiser WebGL.", error);
      setMapError(true);
      return;
    }
    map.addControl(new NavigationControl({ showCompass: false, showZoom: true }), "top-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    // Les deux cadences distinguent la molette crantée du geste continu du
    // pavé tactile ; MapLibre conserve alors son interpolation native fluide.
    map.scrollZoom.setWheelZoomRate(1 / 450);
    map.scrollZoom.setZoomRate(1 / 100);
    map.on("click", (event) => {
      if (lockedRef.current) return;
      const next = normalizeGuess(event.lngLat);
      if (next) onChangeRef.current?.(next);
    });
    mapRef.current = map;
    requestAnimationFrame(() => map.resize());
    return () => {
      removeReveal(map, revealMarkersRef.current);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || reveal) return;
    const clean = normalizeGuess(marker);
    if (!clean) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const pin = new MapLibreMarker({
        element: pinElement("mine", avatar),
        anchor: "bottom",
        draggable: !locked,
      }).setLngLat([clean.lng, clean.lat]).addTo(map);
      pin.on("dragend", () => {
        if (lockedRef.current) return;
        const next = normalizeGuess(pin.getLngLat());
        if (next) onChangeRef.current?.(next);
      });
      markerRef.current = pin;
    } else {
      const current = markerRef.current.getLngLat();
      if (!sameGuess({ lat: current.lat, lng: current.lng }, clean)) markerRef.current.setLngLat([clean.lng, clean.lat]);
      markerRef.current.setDraggable(!locked);
      const face = markerRef.current.getElement().querySelector(".ot-map-pin-avatar");
      if (face && face.textContent !== avatar) face.textContent = avatar;
    }
  }, [marker, locked, reveal, avatar]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let cancelled = false;

    const drawReveal = () => {
      if (cancelled || mapRef.current !== map) return;
      removeReveal(map, revealMarkersRef.current);
      if (!reveal?.target) return;
      markerRef.current?.remove();
      markerRef.current = null;
      const target = normalizeGuess(reveal.target);
      if (!target) return;

      const bounds = new LngLatBounds([target.lng, target.lat], [target.lng, target.lat]);
      const lines = [];
      revealMarkersRef.current.push(new MapLibreMarker({
        element: pinElement("target", countryFlag(reveal.target.country)),
        // La boîte CSS se termine exactement à la pointe de l'épingle.
        anchor: "bottom",
      }).setLngLat([target.lng, target.lat]).addTo(map));

      (reveal.players || []).forEach((player, resultIndex) => {
        const guess = normalizeGuess(player.guess);
        if (!guess) return;
        const foundSeatIndex = seats.findIndex((seat) => seat.id === player.playerId);
        const seatIndex = foundSeatIndex >= 0 ? foundSeatIndex : resultIndex;
        const seat = foundSeatIndex >= 0 ? seats[foundSeatIndex] : null;
        const displayLng = unwrapLng(guess.lng, target.lng);
        const color = PLAYER_COLORS[seatIndex % PLAYER_COLORS.length];
        revealMarkersRef.current.push(new MapLibreMarker({
          element: pinElement("player", seat?.avatar || "🧭", color, seatIndex + 1),
          anchor: "bottom",
        }).setLngLat([displayLng, guess.lat]).addTo(map));
        lines.push({
          type: "Feature",
          properties: { color },
          geometry: { type: "LineString", coordinates: [[target.lng, target.lat], [displayLng, guess.lat]] },
        });
        bounds.extend([displayLng, guess.lat]);
      });

      if (lines.length) {
        map.addSource(REVEAL_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: lines },
        });
        map.addLayer({
          id: REVEAL_LAYER_ID,
          type: "line",
          source: REVEAL_SOURCE_ID,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.82, "line-dasharray": [2, 2] },
        });
        // Travelling animé plutôt qu'un saut sec (duration:0) : c'est le geste
        // qui rend une révélation GeoGuessr satisfaisante — la ligne se
        // découvre pendant que la caméra recule, pas après (2026-09-06).
        map.fitBounds(bounds, { padding: 46, maxZoom: 18, duration: 1100 });
      } else {
        map.flyTo({ center: [target.lng, target.lat], zoom: 15, duration: 1100 });
      }
    };

    removeReveal(map, revealMarkersRef.current);
    if (map.isStyleLoaded()) drawReveal();
    else map.once("load", drawReveal);
    return () => {
      cancelled = true;
      map.off("load", drawReveal);
      if (mapRef.current === map) removeReveal(map, revealMarkersRef.current);
    };
  }, [reveal, seats]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const timer = setTimeout(() => map.resize(), 260);
    return () => clearTimeout(timer);
  }, [expanded]);

  if (mapError) return <div className="ot-map-canvas ot-map-unavailable" role="status"><span>🗺️</span><b>{unavailableMessage}</b></div>;
  return <div ref={rootRef} className="ot-map-canvas" role="application" aria-label="Carte de réponse détaillée" />;
}

export default memo(GuessMap);
