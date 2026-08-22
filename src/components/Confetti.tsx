'use client';
import { useEffect, useRef } from 'react';

const COLOURS = ['#C4714A', '#7A9E7E', '#D4A72C', '#A67BC4', '#7AA5C4', '#E8734A', '#9E5035', '#4A7050'];

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number; rotSpeed: number;
  colour: string;
  w: number; h: number;
  shape: 'rect' | 'circle';
  alpha: number;
}

export default function Confetti({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const originY = canvas.height * 0.6;

    const particles: Particle[] = Array.from({ length: 100 }, () => {
      const angle = (Math.random() * Math.PI * 1.6) - Math.PI * 0.8;
      const speed = 9 + Math.random() * 16;
      const isCircle = Math.random() < 0.25;
      return {
        x: cx + (Math.random() - 0.5) * 80,
        y: originY,
        vx: Math.cos(angle - Math.PI / 2) * speed,
        vy: Math.sin(angle - Math.PI / 2) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.22,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)],
        w: isCircle ? 8 : 3 + Math.random() * 4,
        h: isCircle ? 8 : 12 + Math.random() * 14,
        shape: isCircle ? 'circle' : 'rect',
        alpha: 1,
      };
    });

    let frame = 0;
    const totalFrames = 150;
    let rafId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.vy += 0.42;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        if (frame > totalFrames * 0.55) p.alpha = Math.max(0, p.alpha - 0.025);

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.colour;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, p.w / 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (frame < totalFrames + 20) {
        rafId = requestAnimationFrame(draw);
      } else {
        onDoneRef.current?.();
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}
