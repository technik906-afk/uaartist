"use client";

import { RoundedBox } from "@react-three/drei";

/**
 * ВРЕМЕННАЯ процедурная модель косметички (примитивы three.js).
 *
 * TODO(Конструктор v2, 3D): когда будет отснята реальная модель —
 * заменить этот компонент на сгенерированный gltfjsx:
 *   1. Отснять по docs/constructor-v2-3d-guide.md (Polycam, режим Photo).
 *   2. Экспорт .glb (текстуры ≤2K, вес ≤5 МБ) → public/models/cosmetic_bag.glb
 *   3. npx gltfjsx public/models/cosmetic_bag.glb --transform
 *   4. Цвет ткани — через <meshStandardMaterial color={bagColor}> поверх
 *      материала букле; молния — metalness 0.8 / roughness 0.2.
 * Пропсы (bagColor, zipperColor, tassel, scale) сохранить как есть —
 * страница конструктора менять не потребуется.
 */

interface PouchModelProps {
  bagColor: string;
  zipperColor: string;
  tassel: boolean;
  scale?: number;
}

export default function PouchModel({ bagColor, zipperColor, tassel, scale = 1 }: PouchModelProps) {
  return (
    <group scale={scale}>
      {/* Корпус */}
      <RoundedBox args={[1.6, 1.0, 0.65]} radius={0.18} smoothness={4} castShadow>
        <meshStandardMaterial color={bagColor} roughness={0.85} />
      </RoundedBox>

      {/* Молния по верхней грани */}
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[1.45, 0.05, 0.09]} />
        <meshStandardMaterial color={zipperColor} metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Бегунок */}
      <mesh position={[0.62, 0.56, 0]} castShadow>
        <boxGeometry args={[0.1, 0.05, 0.05]} />
        <meshStandardMaterial color={zipperColor} metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Кисточка */}
      {tassel && (
        <group position={[0.72, 0.42, 0]}>
          <mesh position={[0, -0.02, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
            <meshStandardMaterial color={zipperColor} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.2, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, 0.26, 12]} />
            <meshStandardMaterial color={bagColor} roughness={0.95} />
          </mesh>
        </group>
      )}
    </group>
  );
}
