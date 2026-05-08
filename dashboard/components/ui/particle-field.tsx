"use client";

import { useEffect, useRef } from "react";

interface ParticleFieldProps {
  className?: string;
  color?: string;
  particleCount?: number;
  speed?: number;
}

export function ParticleField({
  className = "",
  color = "122, 155, 142",
  particleCount = 80,
  speed = 0.3,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let mouseX = 0.5;
    let mouseY = 0.5;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);
    }

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random(),
      y: Math.random(),
      baseAlpha: 0.15 + Math.random() * 0.35,
      size: 1 + Math.random() * 1.5,
      phaseOffset: Math.random() * Math.PI * 2,
    }));

    function handlePointer(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / rect.width;
      mouseY = (e.clientY - rect.top) / rect.height;
    }
    canvas.addEventListener("mousemove", handlePointer);

    let time = 0;

    function draw() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);
      time += speed * 0.01;

      for (const p of particles) {
        const breath = Math.sin(time * 2 + p.phaseOffset) * 0.3 + 0.7;
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const pointerInfluence = Math.max(0, 1 - dist * 3) * 0.15;

        const px = (p.x + dx * pointerInfluence * 0.3) * w;
        const py = (p.y + dy * pointerInfluence * 0.3) * h;
        const alpha = p.baseAlpha * breath;

        ctx!.beginPath();
        ctx!.arc(px, py, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${color}, ${alpha})`;
        ctx!.fill();
      }

      animationId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handlePointer);
    };
  }, [color, particleCount, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
      style={{ display: "block" }}
    />
  );
}
