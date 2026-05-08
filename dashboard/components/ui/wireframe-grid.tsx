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

    const camera = new THREE.PerspectiveCamera(
      50,
      container.offsetWidth / container.offsetHeight,
      0.1,
      100
    );
    camera.position.set(0, 3.5, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const gridSize = 40;
    const gridDivisions = 40;
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
      color: new THREE.Color(0x7a9b8e),
      transparent: true,
      opacity: 0.18,
    });

    const gridMesh = new THREE.LineSegments(geometry, material);
    gridMesh.rotation.x = -Math.PI * 0.35;
    gridMesh.position.y = -1.5;
    scene.add(gridMesh);

    const pointsGeometry = new THREE.BufferGeometry();
    const pointCount = 120;
    const pointPositions = new Float32Array(pointCount * 3);
    const pointAlphas = new Float32Array(pointCount);

    for (let i = 0; i < pointCount; i++) {
      pointPositions[i * 3] = (Math.random() - 0.5) * 20;
      pointPositions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pointPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
      pointAlphas[i] = Math.random();
    }

    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(0xa0b5aa),
      size: 0.04,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);

    const ambientLight = new THREE.AmbientLight(0x7a9b8e, 0.3);
    scene.add(ambientLight);

    let mouseX = 0;
    let mouseY = 0;

    function handlePointer(e: MouseEvent) {
      const rect = container!.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    container.addEventListener("mousemove", handlePointer);

    let time = 0;
    let animationId: number;

    function animate() {
      time += 0.008;

      const positions = geometry.attributes.position.array as Float32Array;
      const count = gridDivisions + 1;
      for (let i = 0; i < count; i++) {
        for (let j = 0; j < count; j++) {
          const idx = (i * count + j) * 3;
          const x = positions[idx];
          const z = positions[idx + 2];
          const dist = Math.sqrt(x * x + z * z);
          positions[idx + 1] =
            Math.sin(dist * 0.3 + time * 1.5) * 0.4 *
            Math.exp(-dist * 0.04);
        }
      }
      geometry.attributes.position.needsUpdate = true;

      gridMesh.rotation.z = mouseX * 0.02;
      points.rotation.y = time * 0.05;

      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
      camera.position.y += (3.5 - mouseY * 0.3 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      const breath = Math.sin(time * 1.2) * 0.04 + 0.18;
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
      container.removeEventListener("mousemove", handlePointer);
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
      className={`absolute inset-0 pointer-events-auto ${className}`}
      aria-hidden="true"
    />
  );
}
