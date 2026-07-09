"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Fondu enchaîné réutilisable.
 *
 * Quand la prop `id` change, le contenu précédent reste affiché en
 * surimpression (opaque) pendant que le nouveau contenu est déjà là,
 * en dessous — puis l'ancien se dissout doucement (fondu + léger flou)
 * pour révéler le nouveau. C'est le même principe qu'un fondu enchaîné
 * vidéo : pas de coupure sèche entre deux états.
 *
 * Usage :
 *   <Crossfade id={phase}>{contenuSelonPhase}</Crossfade>
 *
 * Tant que `id` ne change pas, le contenu est simplement mis à jour sans
 * animation (utile si le contenu affiche des données qui changent souvent,
 * comme un chrono, sans re-déclencher un fondu à chaque tick).
 */
export default function Crossfade({ id, children, duration = 420, className = "" }) {
  const [layers, setLayers] = useState(() => [{ id, node: children }]);
  const [fading, setFading] = useState(false);
  const timers = useRef([]);

  // Recale le scroll tout en haut DÈS que `id` change, avant que le nouveau
  // contenu ne soit peint (useLayoutEffect = synchrone, avant paint) : sans
  // ça, quand le nouveau contenu est plus court que l'ancien (ex. lobby ->
  // écran de jeu), le navigateur corrige lui-même la position de scroll
  // après coup, ce qui produit un petit "saut" visible juste avant
  // l'affichage de l'écran de destination. On prend les devants.
  useLayoutEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Ajoute un nouveau calque quand `id` change ; met juste à jour le
  // contenu du calque courant sinon (pas de fondu).
  useEffect(() => {
    setLayers(prev => {
      if (prev.length === 0) return [{ id, node: children }];
      const last = prev[prev.length - 1];
      if (last.id === id) {
        const copy = prev.slice();
        copy[copy.length - 1] = { id, node: children };
        return copy;
      }
      return [last, { id, node: children }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, children]);

  // Pilote l'animation de disparition de l'ancien calque, puis le retire.
  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (layers.length < 2) { setFading(false); return; }
    setFading(false);
    timers.current.push(setTimeout(() => setFading(true), 20));
    timers.current.push(setTimeout(() => {
      setLayers(prev => (prev.length > 1 ? prev.slice(1) : prev));
      setFading(false);
    }, duration + 40));
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers.length, duration]);

  const current = layers[layers.length - 1];
  const old = layers.length > 1 ? layers[0] : null;

  return (
    <div className={"crossfade-stage " + className}>
      <div className="crossfade-current">{current.node}</div>
      {old && (
        <div
          className={"crossfade-old" + (fading ? " cf-fading" : "")}
          style={{ transitionDuration: duration + "ms" }}
        >
          {old.node}
        </div>
      )}
    </div>
  );
}
