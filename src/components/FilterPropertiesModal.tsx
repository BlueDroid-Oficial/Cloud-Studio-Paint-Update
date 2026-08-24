import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { applyFilter } from '../lib/filters';
import { useStore } from '../store/useStore';

export function FilterPropertiesModal({ filterName, onClose, onApply }: { filterName: string, onClose: () => void, onApply: () => void }) {
  const [params, setParams] = useState({ radius: 5, sigma: 2 });
  
  const handleApply = () => {
    const { layers, activeLayerId, width, height } = useStore.getState();
    const layer = layers.find(l => l.id === activeLayerId);
    if (layer && layer.ctx) {
       applyFilter(layer.ctx, width, height, filterName, params);
       window.dispatchEvent(new CustomEvent('render-display'));
       onApply();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#2d2d2d] w-full max-w-xs rounded-lg p-4 space-y-4">
        <div className="flex justify-between items-center text-zinc-300">
           <span className="font-bold">{filterName.toUpperCase()}</span>
           <button onClick={onClose}><X size={16}/></button>
        </div>
        
        {/* Preview area */}
        <div className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center text-zinc-600 text-xs text-center">
            Preview (Coming Soon)
        </div>

        <div className="space-y-4">
          <label className="block text-zinc-400 text-xs">Radius: {params.radius}</label>
          <input type="range" min="1" max="50" value={params.radius} onChange={(e) => setParams({...params, radius: parseInt(e.target.value)})} className="w-full" />
        </div>
        
        <button onClick={handleApply} className="w-full bg-[#4c4cff] text-white py-2 rounded text-xs uppercase font-bold">Apply</button>
      </div>
    </div>
  );
}
