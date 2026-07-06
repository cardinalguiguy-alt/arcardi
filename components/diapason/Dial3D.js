"use client";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import Symbol3D from "./Symbol3D";
import { SYMBOLS } from "./constants";

/* ==========================================================================
   Dial3D — un cadran de laiton encastré dans la porte. Le symbole affiché
   change avec `index`, avec une micro-animation de "tassement" (léger pop
   d'échelle) à chaque changement — calculée entièrement en local à chaque
   frame (jamais synchronisée), conformément à la règle du projet : Supabase
   ne transporte que l'ÉTAT (la valeur choisie), jamais l'animation.
   ========================================================================== */
export default function Dial3D({ position, index, accent }) {
  const groupRef = useRef(null);
  const prevIndex = useRef(index);
  const popProgress = useRef(1);

  useEffect(() => {
    if (prevIndex.current !== index) {
      prevIndex.current = index;
      popProgress.current = 0;
    }
  }, [index]);

  useFrame((_, delta) => {
    if (popProgress.current < 1) {
      popProgress.current = Math.min(1, popProgress.current + delta * 3.2);
    }
    const t = popProgress.current;
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    const s = 0.72 + 0.28 * eased;
    if (groupRef.current) groupRef.current.scale.setScalar(s);
  });

  const symbol = SYMBOLS[index % SYMBOLS.length];

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.34, 0.34, 0.08, 24]} />
        <meshStandardMaterial color="#3a3320" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.05]}>
        <torusGeometry args={[0.3, 0.025, 10, 32]} />
        <meshStandardMaterial color={accent || "#C9A24B"} roughness={0.4} metalness={0.6} />
      </mesh>
      <group ref={groupRef} position={[0, 0, 0.09]}>
        <Symbol3D type={symbol} scale={1.15} />
      </group>
    </group>
  );
}
