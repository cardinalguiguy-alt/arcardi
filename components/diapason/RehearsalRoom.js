"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Symbol3D from "./Symbol3D";
import Dial3D from "./Dial3D";

/* ==========================================================================
   RehearsalRoom — la pièce entière, statique dans l'espace : c'est la CAMÉRA
   (voir DiapasonScene.js) qui se déplace entre deux points de vue fixes, pas
   la pièce qui change. Tout ce qui est ici est purement local (aucune de ces
   données ne transite par Supabase) : seule la RÉSOLUTION du puzzle est
   synchronisée, jamais le décor, la lumière ou l'animation.

   Composition minimale volontaire pour cette v1 ("une base avec les formes
   géométriques") : sol/plafond/3 murs en plans, une porte à 3 cadrans, une
   plaque gravée, un tube acoustique, une lampe suspendue qui vacille
   légèrement (micro-animation continue et discrète, jamais synchronisée).
   ========================================================================== */
export default function RehearsalRoom({ side, dialValues, otherCode, accent, onExamine, doorGlow }) {
  const lampRef = useRef(null);
  const flickerSeed = useRef(Math.random() * 1000);

  useFrame(({ clock }) => {
    if (!lampRef.current) return;
    const t = clock.getElapsedTime() + flickerSeed.current;
    const flicker = 1 + Math.sin(t * 7.3) * 0.04 + Math.sin(t * 2.1) * 0.03 + (Math.random() - 0.5) * 0.02;
    lampRef.current.intensity = 1.1 * flicker;
  });

  const wallColor = side === "est" ? "#241d1a" : "#181c26";
  const trimColor = accent || "#C9A24B";

  function stopAnd(fn) {
    return (e) => { e.stopPropagation(); fn(); };
  }
  function overCursor(e) { e.stopPropagation(); document.body.style.cursor = "pointer"; }
  function outCursor() { document.body.style.cursor = "auto"; }

  return (
    <group>
      <fog attach="fog" args={["#05060b", 4, 15]} />
      <ambientLight intensity={0.18} color="#3a3550" />
      <pointLight ref={lampRef} position={[0, 2.9, -1]} intensity={1.1} color="#e8c98a" distance={9} decay={2} />
      <pointLight position={[-0.6, 2.1, -3.4]} intensity={0.45} color="#ffd9a0" distance={4.5} decay={2} />

      {/* Sol */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0c0d14" roughness={0.9} />
      </mesh>
      {/* Plafond */}
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 8]} />
        <meshStandardMaterial color="#0a0a10" roughness={1} />
      </mesh>
      {/* Mur du fond (porte + plaque) */}
      <mesh position={[0, 1.6, -4]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* Mur gauche */}
      <mesh position={[-4, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>
      {/* Mur droit (tube acoustique) */}
      <mesh position={[4, 1.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[8, 3.2]} />
        <meshStandardMaterial color={wallColor} roughness={0.85} />
      </mesh>

      {/* Porte scellée, cliquable */}
      <group onClick={stopAnd(() => onExamine("door"))} onPointerOver={overCursor} onPointerOut={outCursor}>
        <mesh position={[0, 1.4, -3.92]}>
          <boxGeometry args={[1.7, 2.6, 0.12]} />
          <meshStandardMaterial
            color="#241c14" roughness={0.6} metalness={0.25}
            emissive={doorGlow ? trimColor : "#000000"}
            emissiveIntensity={doorGlow ? 0.35 : 0}
          />
        </mesh>
        <mesh position={[0, 2.75, -3.9]}>
          <boxGeometry args={[1.9, 0.08, 0.16]} />
          <meshStandardMaterial color={trimColor} roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* 3 cadrans montés sur la porte */}
      {[0, 1, 2].map((i) => (
        <Dial3D key={i} position={[-0.42 + i * 0.42, 1.7, -3.8]} index={dialValues[i]} accent={trimColor} />
      ))}

      {/* Plaque gravée : affiche le code du PARTENAIRE, pas le sien */}
      <group onClick={stopAnd(() => onExamine("plaque"))} onPointerOver={overCursor} onPointerOut={outCursor}>
        <mesh position={[-2.6, 1.55, -3.93]}>
          <boxGeometry args={[1.15, 0.75, 0.06]} />
          <meshStandardMaterial color="#1a1712" roughness={0.7} metalness={0.15} />
        </mesh>
        {otherCode.map((sym, i) => (
          <group key={i} position={[-2.95 + i * 0.35, 1.55, -3.87]}>
            <Symbol3D type={sym} scale={0.85} color="#d8cdb0" />
          </group>
        ))}
      </group>

      {/* Tube acoustique : premier contact avec le partenaire */}
      <group
        position={[3.85, 1.55, -0.4]}
        onClick={stopAnd(() => onExamine("tube"))}
        onPointerOver={overCursor}
        onPointerOut={outCursor}
      >
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.09, 0.09, 1.4, 16]} />
          <meshStandardMaterial color="#7a6a4e" roughness={0.35} metalness={0.75} />
        </mesh>
        <mesh position={[-0.72, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.22, 0.3, 20, 1, true]} />
          <meshStandardMaterial color="#7a6a4e" roughness={0.3} metalness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Lampe suspendue (décor + source de la lumière qui vacille) */}
      <mesh position={[0, 3.15, -1]}>
        <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
        <meshStandardMaterial color="#2a2620" />
      </mesh>
      <mesh position={[0, 2.9, -1]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#f2d9a0" emissive="#f2d9a0" emissiveIntensity={0.9} roughness={0.3} />
      </mesh>
    </group>
  );
}
