import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Clock, Fingerprint, X, Copy, Trash2, Zap, Settings2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { twMerge } from 'tailwind-merge';

function SimpleFrameItem({ frameId, isSelected, currentFrame, setCurrentFrame, layers }: any) {
  const [showFrameMenu, setShowFrameMenu] = useState(false);
  const { frameDurations, setFrameDuration, toggleKeyframe, removeFrame, keyframedLayers, addFrame } = useStore();

  const handleDuplicate = (e: any) => {
    e.stopPropagation();
    // In a real app, we'd copy the cel data too. addFrame just increments totalFrames.
    // For simple mode, we'll just add a frame.
    addFrame();
    setShowFrameMenu(false);
  };

  return (
    <div className="relative shrink-0">
      <button 
        onClick={() => {
          if (isSelected) setShowFrameMenu(!showFrameMenu);
          else setCurrentFrame(frameId);
        }}
        className={twMerge(
          "w-12 h-12 shrink-0 rounded-xl border transition-all flex flex-col items-center justify-center relative group",
          isSelected 
            ? "bg-indigo-600 border-indigo-400 text-white shadow-lg z-10 scale-105" 
            : "bg-zinc-800/50 border-white/5 text-zinc-500 hover:border-white/20"
        )}
      >
        <span className="text-[10px] font-bold">{frameId}</span>
        <span className="text-[8px] opacity-60 font-mono">{(frameDurations[frameId] || 100)}ms</span>
        {(keyframedLayers[frameId]?.length > 0) && (
          <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full border-2 border-indigo-600 shadow-sm" />
        )}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity pointer-events-none" />
      </button>

      <AnimatePresence>
        {isSelected && showFrameMenu && (
          <motion.div 
            initial={{ y: 10, opacity: 0, scale: 0.95 }} 
            animate={{ y: 0, opacity: 1, scale: 1 }} 
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-52 z-[100]"
          >
             <div className="flex flex-col gap-0.5">
                <div className="px-3 py-2 mb-1 flex items-center justify-between border-b border-white/5">
                  <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Configurações Studio</span>
                  <Settings2 size={12} className="text-zinc-600" />
                </div>

                <div className="grid grid-cols-2 gap-1 p-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const layerId = layers[layers.length - 1]?.id;
                      if (layerId) toggleKeyframe(frameId, layerId);
                      setShowFrameMenu(false);
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 hover:bg-white/5 rounded-xl transition-colors group"
                  >
                    <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg group-hover:bg-yellow-500/20">
                      <Zap size={16} />
                    </div>
                    <span className="text-[9px] font-bold uppercase text-zinc-400">Keyframe</span>
                  </button>

                  <button 
                    onClick={handleDuplicate}
                    className="flex flex-col items-center gap-1.5 p-3 hover:bg-white/5 rounded-xl transition-colors group"
                  >
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover:bg-indigo-500/20">
                      <Copy size={16} />
                    </div>
                    <span className="text-[9px] font-bold uppercase text-zinc-400">Duplicar</span>
                  </button>
                </div>

                <div className="h-px bg-white/5 my-1 mx-2" />

                <div className="px-3 py-1 flex items-center justify-between">
                  <span className="text-[8px] uppercase font-bold text-zinc-600">Duração</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const duration = prompt('Duração customizada (ms):', (frameDurations[frameId] || 100).toString());
                      if (duration) setFrameDuration(frameId, parseInt(duration));
                    }}
                    className="text-[8px] font-bold text-indigo-400 hover:underline"
                  >
                    Custom
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 px-2 mb-1">
                  {[50, 100, 250].map(d => (
                    <button 
                      key={d}
                      onClick={(e) => { e.stopPropagation(); setFrameDuration(frameId, d); }}
                      className={twMerge(
                        "py-1.5 rounded-lg text-[9px] font-bold border transition-all",
                        (frameDurations[frameId] || 100) === d 
                          ? "bg-indigo-600 border-indigo-400 text-white" 
                          : "bg-zinc-800/50 border-white/5 text-zinc-500 hover:border-white/10"
                      )}
                    >
                      {d}ms
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/5 my-1 mx-2" />
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFrame(frameId);
                    setShowFrameMenu(false);
                  }}
                  className="w-full p-2.5 hover:bg-red-500/10 rounded-xl text-[10px] font-bold uppercase text-left text-red-400 flex items-center gap-3 transition-colors px-4"
                >
                  <Trash2 size={16} />
                  <span>Excluir Quadro</span>
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SimpleTimeline() {
  const { totalFrames, currentFrame, setCurrentFrame, layers, addFrame } = useStore();

  return (
    <div 
      className="h-20 bg-[#2d2d2dbb] backdrop-blur-md border-b border-black/20 flex items-center px-4 gap-4 z-40 overflow-x-auto scrollbar-hide shrink-0"
    >
      <div className="flex items-center gap-2 shrink-0 bg-black/20 p-1 rounded-full">
        <button 
          onClick={() => setCurrentFrame(Math.max(1, currentFrame - 1))}
          className="p-2 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center w-12">
          <span className="text-[10px] font-bold text-indigo-400 leading-none">{currentFrame}</span>
          <div className="h-px w-4 bg-zinc-600 my-0.5" />
          <span className="text-[10px] font-bold text-zinc-500 leading-none">{totalFrames}</span>
        </div>
        <button 
          onClick={() => setCurrentFrame(Math.min(totalFrames, currentFrame + 1))}
          className="p-2 hover:bg-white/10 rounded-full text-zinc-400 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0 py-2 scrollbar-hide">
        {Array.from({ length: totalFrames }).map((_, i) => (
          <SimpleFrameItem 
            key={i} 
            frameId={i + 1} 
            isSelected={currentFrame === i + 1}
            currentFrame={currentFrame}
            setCurrentFrame={setCurrentFrame}
            layers={layers}
          />
        ))}
        <button 
          onClick={() => addFrame()}
          className="w-12 h-12 shrink-0 rounded-xl border border-dashed border-white/10 text-zinc-500 flex items-center justify-center hover:bg-white/5 transition-all hover:border-white/20"
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}
