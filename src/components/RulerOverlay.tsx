import React, { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const RulerOverlay: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { rulerShape, rulerRotation, tool, showRuler } = useStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tool !== 'ruler' || !showRuler) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    const cx = width / 2;
    const cy = height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rulerRotation * Math.PI) / 180);

    switch (rulerShape) {
      case 'straight':
        ctx.beginPath();
        ctx.moveTo(-width / 2, 0);
        ctx.lineTo(width / 2, 0);
        ctx.stroke();
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'oval':
        ctx.beginPath();
        ctx.ellipse(0, 0, 150, 80, 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -100);
        ctx.lineTo(100, 100);
        ctx.lineTo(-100, 100);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'square':
        ctx.beginPath();
        ctx.rect(-100, -100, 200, 200);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }, [width, height, rulerShape, rulerRotation, tool, showRuler]);

  if (!rulerShape || tool !== 'ruler' || !showRuler) return null;

  return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 z-50 pointer-events-none" />;
};
