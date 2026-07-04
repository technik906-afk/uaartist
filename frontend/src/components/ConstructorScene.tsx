"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import PouchModel from "@/components/PouchModel";

interface ConstructorSceneProps {
  bagColor: string;
  zipperColor: string;
  tassel: boolean;
  scale: number;
}

/**
 * 3D-сцена конструктора. Свет собран вручную (без Environment-пресетов drei —
 * они тянут HDR с внешних CDN, а нам нужна работа офлайн и без сюрпризов).
 */
export default function ConstructorScene(props: ConstructorSceneProps) {
  return (
    <Canvas
      camera={{ position: [0.8, 0.7, 3], fov: 45 }}
      style={{ width: "100%", height: "100%", touchAction: "none" }}
      shadows
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 4, 2]} intensity={1.3} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.4} />

      <PouchModel {...props} />

      <ContactShadows position={[0, -0.75, 0]} opacity={0.45} blur={2.2} scale={5} />
      {/* Вращение/зум ограничены, чтобы не «уходить под пол» (см. docs-гайд) */}
      <OrbitControls
        enablePan={false}
        minDistance={1.8}
        maxDistance={5}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}
