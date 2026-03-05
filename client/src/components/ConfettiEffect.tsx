import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiEffectProps {
  trigger: boolean;
  /** When true, confetti is rendered on an in-card canvas (clipped by overflow-hidden). */
  scoped?: boolean;
}

export default function ConfettiEffect({ trigger, scoped = false }: ConfettiEffectProps) {
  const hasFired = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (trigger && !hasFired.current) {
      hasFired.current = true;

      if (scoped && canvasRef.current) {
        const fire = confetti.create(canvasRef.current, { resize: true, useWorker: true });
        fire({ particleCount: 60, spread: 80, origin: { x: 0.5, y: 0.65 }, colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'] });
        setTimeout(() => fire({ particleCount: 25, angle: 60, spread: 50, origin: { x: 0, y: 0.65 }, colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'] }), 150);
        setTimeout(() => fire({ particleCount: 25, angle: 120, spread: 50, origin: { x: 1, y: 0.65 }, colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'] }), 300);
        return () => { fire.reset(); };
      } else {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'] });
        setTimeout(() => confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'] }), 150);
        setTimeout(() => confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b'] }), 300);
      }
    }

    if (!trigger) {
      hasFired.current = false;
    }
  }, [trigger, scoped]);

  if (!scoped) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full"
      style={{ zIndex: 10 }}
    />
  );
}
