# Руководство по внедрению 3D-конфигуратора на Next.js (React)

Данное руководство содержит пошаговый процесс: от создания фотореалистичной 3D-модели косметички с помощью iPhone 15 Pro Max до её интеграции в фронтенд-код интернет-магазина.

---

## ЧАСТЬ 1. Съемка и создание 3D-модели на iPhone 15 Pro Max

Для текстурных тканей (букле) и мелких объектов лучше всего использовать фотограмметрию высокого разрешения в связке с облачной или локальной обработкой Apple Object Capture.

### 1. Подготовка объекта и локации
*   **Форма:** Плотно набейте косметичку бумагой, пленкой или тканью. Сундучок должен идеально держать форму и не проминаться во время съемки.
*   **Освещение:** Используйте **мягкий рассеянный свет** (идеально — комната с большим окном в облачную погоду или лайтбокс). Избегайте прямых солнечных лучей, настольных ламп «в упор» и глубоких теней.
*   **Поверхность:** Поставьте косметичку на матовую, контрастную по цвету поверхность (например, светлую косметичку на серый/темный стол). Поверхность не должна бликовать.
*   **Лайфхак для фурнитуры:** Блестящая металлическая молния может дать блики, из-за чего на модели появятся дыры. На время съемки можно временно припудрить молнию или заклеить матовым скотчем (в коде мы заменим её на идеальный 3D-металл).

### 2. Процесс съемки
Используйте приложения **Polycam** (режим *Photo*, а не LiDAR — он дает в разы выше детализацию текстуры) или официальное **Reality Composer Capture** от Apple.

1.  Встаньте на уровне косметички. Медленно обходите её по кругу, делая кадры каждые 10–15 градусов. Каждый следующий кадр должен перекрывать предыдущий минимум на 70%.
2.  Сделайте **3 полных круга** (всего около 60–80 снимков):
    *   *Круг 1:* На уровне самого объекта (камера смотрит прямо).
    *   *Круг 2:* Чуть сверху, под углом 45 градусов.
    *   *Круг 3:* Сверху вниз (птичий полет), чтобы зафиксировать верхнюю крышку.
3.  Двигайте камеру плавно, избегайте смазанных кадров (Motion Blur).

### 3. Экспорт и Оптимизация
1.  Запустите процесс сборки (*Process/Render*).
2.  Экспортируйте готовую модель в формате **`.glb`** или **`.gltf`**.
3.  **Важно:** Выбирайте разрешение текстур не выше **2K (2048x2048)** и пресет качества *Medium/Low*. Для веба модель должна весить **до 3–5 МБ**, иначе сайт на смартфонах клиентов будет зависать.

---

## ЧАСТЬ 2. Интеграция 3D-модели в Next.js (React)

Для работы с 3D в React-экосистеме используется стек **React Three Fiber (R3F)** и утилиты **Drei**.

### 1. Установка зависимостей
Запустите команду в корне вашего Next.js проекта:
```bash
npm install three @types/three @react-three/fiber @react-three/drei
```

### 2. Конвертация `.glb` в React-компонент
Чтобы управлять цветом и размером модели через React-стейт, преобразуйте файл модели в JSX-код с помощью утилиты `gltfjsx`:
```bash
npx gltfjsx public/models/cosmetic_bag.glb --transform
```
*Флаг `--transform` дополнительно оптимизирует геометрию файла.*

Создайте компонент `CosmeticBag.jsx`:
```jsx
import React from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export function CosmeticBag({ color, sizeScale, ...props }) {
  // Загружаем оптимизированную модель
  const { nodes, materials } = useGLTF('/models/cosmetic_bag-transformed.glb')
  
  return (
    <group {...props} dispose={null} scale={sizeScale}>
      {/* Корпус косметички с текстурой букле */}
      <mesh
        geometry={nodes.Bag_Body.geometry}
        material={materials.Boucle_Fabric}
      >
        {/* Динамически меняем цвет, сохраняя рельеф букле */}
        <meshStandardMaterial 
          attach="material"
          color={new THREE.Color(color)} 
          {...materials.Boucle_Fabric} 
        />
      </mesh>
      
      {/* Металлическая молния (не меняет цвет, имеет золотой блеск) */}
      <mesh geometry={nodes.Zipper.geometry}>
        <meshStandardMaterial color="#FFD700" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  )
}

// Предзагрузка модели для мгновенного отображения
useGLTF.preload('/models/cosmetic_bag-transformed.glb')
```

### 3. Создание страницы конфигуратора (`page.jsx`)
Компоненты 3D должны работать строго на стороне клиента, поэтому в Next.js App Router обязательно используем директиву `'use client'`.

```jsx
'use client';
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import { CosmeticBag } from '@/components/CosmeticBag';

const COLORS = {
  beige: '#F5F5DC',
  purple: '#E6E6FA',
  pink: '#FFC0CB',
  burgundy: '#800020'
};

const SIZES = {
  S: [0.8, 0.8, 0.8],
  M: [1.0, 1.0, 1.0],
  L: [1.3, 1.2, 1.3]
};

export default function ConfiguratorPage() {
  const [selectedColor, setSelectedColor] = useState(COLORS.beige);
  const [selectedSize, setSelectedSize] = useState('M');

  return (
    <div className="flex h-screen w-full flex-col md:flex-row bg-slate-50">
      
      {/* 3D Визуализатор */}
      <div className="h-[50vh] w-full md:h-full md:w-2/3 relative">
        <Canvas camera={{ position:, fov: 45 }}>
          {/* Stage автоматически настраивает мягкие студийные тени и свет */}
          <Stage environment="studio" intensity={0.6} contactShadow={{ opacity: 0.6, blur: 1.5 }}>
            <CosmeticBag color={selectedColor} sizeScale={SIZES[selectedSize]} />
          </Stage>
          {/* Управление вращением и зумом (ограничено, чтобы не уходить под пол) */}
          <OrbitControls enableZoom={true} minPolarAngle={0} maxPolarAngle={Math.PI / 2} />
        </Canvas>
      </div>

      {/* Интерфейс выбора (UI) */}
      <div className="w-full p-8 md:w-1/3 flex flex-col justify-center bg-white shadow-xl">
        <h1 className="text-2xl font-bold mb-6">Кастомизация сундучка букле</h1>
        
        {/* Выбор цвета */}
        <div className="mb-6">
          <span className="block text-sm font-medium text-gray-700 mb-2">Цвет ткани</span>
          <div className="flex gap-3">
            {Object.entries(COLORS).map(([name, hex]) => (
              <button
                key={name}
                onClick={() => setSelectedColor(hex)}
                style={{ backgroundColor: hex }}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  selectedColor === hex ? 'border-black scale-110 shadow-md' : 'border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Выбор размера */}
        <div className="mb-8">
          <span className="block text-sm font-medium text-gray-700 mb-2">Размер</span>
          <div className="flex gap-3">
            {Object.keys(SIZES).map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 border rounded-md font-semibold transition-all ${
                  selectedSize === size ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                Размер {size}
              </button>
            ))}
          </div>
        </div>

        <button className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
          Добавить в корзину
        </button>
      </div>

    </div>
  );
}
```
