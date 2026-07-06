"use client";
import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import RehearsalRoom from "./RehearsalRoom";

/* ==========================================================================
   CameraRig — pas de déplacement libre : uniquement un glissement fluide
   ("pivot doux") d'un point de vue fixe vers un autre, recalculé localement
   à chaque frame (jamais transmis à Supabase). C'est tout ce que signifie
   ici "déplacement élémentaire".
   ========================================================================== */
function CameraRig({ viewpoint }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...viewpoint.position));
  const targetLook = useRef(new THREE.Vector3(...viewpoint.lookAt));
  const currentLook = useRef(new THREE.Vector3(...viewpoint.lookAt));
  const initialized = useRef(false);

  useEffect(() => {
    targetPos.current.set(viewpoint.position[0], viewpoint.position[1], viewpoint.position[2]);
    targetLook.current.set(viewpoint.lookAt[0], viewpoint.lookAt[1], viewpoint.lookAt[2]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewpoint.position[0], viewpoint.position[1], viewpoint.position[2], viewpoint.lookAt[0], viewpoint.lookAt[1], viewpoint.lookAt[2]]);

  useFrame((_, delta) => {
    if (!initialized.current) {
      camera.position.copy(targetPos.current);
      currentLook.current.copy(targetLook.current);
      initialized.current = true;
    }
    const damp = 1 - Math.pow(0.0025, Math.min(delta, 0.1));
    camera.position.lerp(targetPos.current, damp);
    currentLook.current.lerp(targetLook.current, damp);
    camera.lookAt(currentLook.current);
  });

  return null;
}

export default function DiapasonScene({ side, dialValues, otherCode, accent, viewpoint, onExamine, doorGlow }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true }}
      camera={{ fov: 48, near: 0.1, far: 30, position: viewpoint.position }}
      style={{ width: "100%", height: "100%", display: "block", background: "#05060b" }}
    >
      <CameraRig viewpoint={viewpoint} />
      <Suspense fallback={null}>
        <RehearsalRoom
          side={side}
          dialValues={dialValues}
          otherCode={otherCode}
          accent={accent}
          onExamine={onExamine}
          doorGlow={doorGlow}
        />
      </Suspense>
    </Canvas>
  );
}
