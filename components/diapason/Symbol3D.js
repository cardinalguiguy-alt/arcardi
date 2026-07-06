"use client";
import { SYMBOL_COLORS } from "./constants";

/* ==========================================================================
   Symbol3D — un symbole musical construit UNIQUEMENT à partir de primitives
   (sphère, cylindre, boîte, tore). Aucun asset externe, aucune police
   (donc aucune dépendance réseau à un CDN de fonte) : tout est généré par
   code. Objectif explicite de cette v1 : "une base avec les formes
   géométriques", remplaçable plus tard par de vrais assets sans toucher
   au reste du moteur (Dial3D et RehearsalRoom ne connaissent que le prop
   `type`).
   ========================================================================== */
export default function Symbol3D({ type, color, scale = 1 }) {
  const c = color || SYMBOL_COLORS[type] || "#cccccc";
  const matProps = { color: c, roughness: 0.45, metalness: 0.35, emissive: c, emissiveIntensity: 0.08 };

  if (type === "note") {
    return (
      <group scale={scale}>
        <mesh position={[0, -0.05, 0]} rotation={[0, 0, -0.3]} scale={[1, 0.78, 0.6]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        <mesh position={[0.11, 0.13, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.34, 8]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      </group>
    );
  }

  if (type === "rest") {
    return (
      <group scale={scale}>
        <mesh>
          <boxGeometry args={[0.22, 0.09, 0.05]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        <mesh position={[-0.07, 0.06, 0]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      </group>
    );
  }

  if (type === "sharp") {
    return (
      <group scale={scale}>
        <mesh position={[-0.065, 0, 0]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.02, 0.32, 0.03]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        <mesh position={[0.065, 0, 0]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.02, 0.32, 0.03]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        <mesh position={[0, 0.08, 0]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.3, 0.02, 0.03]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
        <mesh position={[0, -0.08, 0]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.3, 0.02, 0.03]} />
          <meshStandardMaterial {...matProps} />
        </mesh>
      </group>
    );
  }

  // fermata (point d'orgue) : un arc (demi-tore) au-dessus d'un point.
  return (
    <group scale={scale}>
      <mesh position={[0, 0.03, 0]}>
        <torusGeometry args={[0.14, 0.02, 8, 24, Math.PI]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.032, 12, 12]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
    </group>
  );
}
