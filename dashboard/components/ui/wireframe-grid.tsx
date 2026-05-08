"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

interface WireframeGridProps {
  className?: string;
}

export function WireframeGrid({ className = "" }: WireframeGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0c1015, 0.035);

    const camera = new THREE.PerspectiveCamera(
      50,
      container.offsetWidth / container.offsetHeight,
      0.1,
      200
    );
    camera.position.set(0, 8, 14);
    camera.lookAt(0, 0, -5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0x0c1015, 0);
    container.appendChild(renderer.domElement);

    const gridSize = 60;
    const gridDivisions = 50;
    const halfSize = gridSize / 2;
    const step = gridSize / gridDivisions;

    const vertices: number[] = [];
    for (let i = 0; i <= gridDivisions; i++) {
      for (let j = 0; j <= gridDivisions; j++) {
        const x = -halfSize + i * step;
        const z = -halfSize + j * step;
        vertices.push(x, 0, z);
      }
    }

    const indices: number[] = [];
    for (let i = 0; i < gridDivisions; i++) {
      for (let j = 0; j < gridDivisions; j++) {
        const a = i * (gridDivisions + 1) + j;
        const b = a + 1;
        const c = a + (gridDivisions + 1);
        const d = c + 1;
        indices.push(a, b, b, d, d, c, c, a);
      }
    }

    const geometry = new THREE.BufferGeometry();
    const positionArray = new Float32Array(vertices);
    geometry.setAttribute("position", new THREE.BufferAttribute(positionArray, 3));
    geometry.setIndex(indices);

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x56ffe8),
      transparent: true,
      opacity: 0.18,
    });

    const gridMesh = new THREE.LineSegments(geometry, material);
    scene.add(gridMesh);

    const pointsGeometry = new THREE.BufferGeometry();
    const pointCount = 200;
    const pointPositions = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      pointPositions[i * 3] = (Math.random() - 0.5) * 40;
      pointPositions[i * 3 + 1] = Math.random() * 6;
      pointPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }

    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(0x56ffe8),
      size: 0.06,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);

    let targetMouseX = 0;
    let targetMouseY = 0;
    let smoothMouseX = 0;
    let smoothMouseY = 0;

    function handlePointer(e: MouseEvent) {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }
    window.addEventListener("mousemove", handlePointer);

    let time = 0;
    let animationId: number;

    const basePositions = new Float32Array(positionArray.length);
    basePositions.set(positionArray);

    function animate() {
      time += 0.006;

      smoothMouseX += (targetMouseX - smoothMouseX) * 0.03;
      smoothMouseY += (targetMouseY - smoothMouseY) * 0.03;

      const positions = geometry.attributes.position.array as Float32Array;
      const count = gridDivisions + 1;
      for (let i = 0; i < count; i++) {
        for (let j = 0; j < count; j++) {
          const idx = (i * count + j) * 3;
          const x = basePositions[idx];
          const z = basePositions[idx + 2];
          const dist = Math.sqrt(x * x + z * z);
          positions[idx + 1] =
            Math.sin(dist * 0.2 + time * 1.2) * 0.6 *
            Math.exp(-dist * 0.025) +
            Math.sin(x * 0.15 + time * 0.8) * 0.3 *
            Math.cos(z * 0.15 + time * 0.6) * 0.3;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      camera.position.x = smoothMouseX * 3;
      camera.position.y = 8 - smoothMouseY * 1.5;
      camera.lookAt(smoothMouseX * 1, 0, -5 + smoothMouseY * 2);

      points.rotation.y = time * 0.03;

      const breath = Math.sin(time * 1.0) * 0.04 + 0.18;
      material.opacity = breath;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    }

    animate();

    function handleResize() {
      if (!container) return;
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handlePointer);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      pointsGeometry.dispose();
      pointsMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 ${className}`}
      aria-hidden="true"
    />
  );
}
