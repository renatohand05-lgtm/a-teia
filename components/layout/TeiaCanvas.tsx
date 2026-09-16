"use client";

import { useEffect, useRef } from "react";

export function TeiaCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COLORS = ["rgba(232,191,122,", "rgba(199,210,224,"] as const;
    const COUNT = 58;
    const LINK_DIST = 150;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      phase: number;
      c: (typeof COLORS)[number];
    }> = [];
    let W = 0;
    let H = 0;
    let t = 0;
    let frame = 0;
    let running = true;

    function resize() {
      const rect = parent!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = rect.width;
      H = rect.height;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      canvas!.style.width = `${W}px`;
      canvas!.style.height = `${H}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticles() {
      particles = [];
      for (let i = 0; i < COUNT; i += 1) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 1.8 + 0.9,
          phase: Math.random() * Math.PI * 2,
          c: COLORS[Math.random() < 0.35 ? 0 : 1],
        });
      }
    }

    function step() {
      if (!running) return;
      t += 0.02;
      ctx!.clearRect(0, 0, W, H);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const closeness = 1 - dist / LINK_DIST;
            ctx!.strokeStyle = `rgba(232,191,122,${closeness * 0.3})`;
            ctx!.lineWidth = closeness * 1.3;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }
      for (const p of particles) {
        const twinkle = 0.65 + Math.sin(t * 1.6 + p.phase) * 0.3;
        ctx!.beginPath();
        ctx!.fillStyle = `${p.c}${twinkle})`;
        ctx!.shadowColor = `${p.c}0.7)`;
        ctx!.shadowBlur = 6;
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
      if (!reduceMotion) frame = requestAnimationFrame(step);
    }

    resize();
    makeParticles();
    step();
    const onResize = () => {
      resize();
      makeParticles();
      if (reduceMotion) step();
    };
    window.addEventListener("resize", onResize);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full opacity-90" aria-hidden />;
}
