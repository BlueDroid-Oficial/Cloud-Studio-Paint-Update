import React from 'react';
import { useStore, RulerShape } from '../store/useStore';
import { clsx } from 'clsx';

export function RulerPanel() {
  const { rulerShape, setRulerShape, rulerRotation, setRulerRotation, showRuler, setShowRuler } = useStore();

  const shapes: { id: RulerShape; label: string }[] = [
    { id: 'straight', label: 'Reta' },
    { id: 'circle', label: 'Círculo' },
    { id: 'oval', label: 'Oval' },
    { id: 'triangle', label: 'Triângulo' },
    { id: 'square', label: 'Quadrado' },
  ];

  return (
    <div className="bg-[#1a1a1a] p-3 rounded-lg border border-zinc-700/50 w-full space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-[11px] text-zinc-400 uppercase font-semibold">Modo de Régua</div>
        <button
          onClick={() => setShowRuler(!showRuler)}
          className={clsx(
            "text-[10px] py-1 px-2 rounded border transition-colors",
            showRuler ? "bg-zinc-700 text-white" : "bg-[#2a2a2a] text-zinc-400"
          )}
        >
          {showRuler ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {shapes.map((shape) => (
          <button
            key={shape.id}
            onClick={() => setRulerShape(shape.id)}
            className={clsx(
              "text-[10px] py-1.5 px-2 rounded border transition-colors",
              rulerShape === shape.id
                ? "bg-indigo-600 text-white border-indigo-500"
                : "bg-[#2a2a2a] text-zinc-400 border-zinc-700/50 hover:bg-zinc-700"
            )}
          >
            {shape.label}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <div className="text-[10px] text-zinc-400">Rotação: {Math.round(rulerRotation)}°</div>
        <input
          type="range"
          min="0"
          max="360"
          value={rulerRotation}
          onChange={(e) => setRulerRotation(Number(e.target.value))}
          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}
