import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ChevronsLeft, 
  ChevronsRight, 
  Layers, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2,
  Clock,
  IterationCcw,
  Ghost,
  Music,
  Film,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { twMerge } from 'tailwind-merge';

export function Timeline() {
  const { 
    layers, 
    activeLayerId, 
    setActiveLayer, 
    currentFrame, 
    setCurrentFrame, 
    totalFrames, 
    setTotalFrames,
    fps, 
    setFps,
    isPlaying, 
    setIsPlaying,
    onionSkin, 
    toggleOnionSkin,
    animationEnabled,
    setAnimationEnabled,
    _saveCurrentCels,
    keyframes,
    duplicateFrameTimes,
    importedAudioUrl,
    importedAudioName,
    setImportedAudio,
    timelines,
    activeTimelineId,
    switchTimeline,
    addTimeline,
    deleteTimeline,
    reorderFrames
  } = useStore();

  const [duplicationFrame, setDuplicationFrame] = useState<number | null>(null);
  const [duplicationCount, setDuplicationCount] = useState<number>(1);
  const [draggedFrame, setDraggedFrame] = useState<number | null>(null);
  const [dragOverFrame, setDragOverFrame] = useState<number | null>(null);

  const rulerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and synchronize audio element
  useEffect(() => {
    if (importedAudioUrl) {
      const audio = new Audio(importedAudioUrl);
      audio.loop = true;
      audioRef.current = audio;
      
      const frameTime = 1000 / fps;
      audio.currentTime = (currentFrame - 1) * (frameTime / 1000);

      if (isPlaying) {
        audio.play().catch(e => console.log("Audio play error:", e));
      }

      return () => {
        audio.pause();
        audioRef.current = null;
      };
    } else {
      audioRef.current = null;
    }
  }, [importedAudioUrl]);

  // Synchronize play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const frameTime = 1000 / fps;
      audio.currentTime = (currentFrame - 1) * (frameTime / 1000);
      audio.play().catch(e => console.log("Audio play error:", e));
    } else {
      audio.pause();
      const frameTime = 1000 / fps;
      audio.currentTime = (currentFrame - 1) * (frameTime / 1000);
    }
  }, [isPlaying]);

  // Synchronize on manual frame change (with audio scrubbing)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const frameTime = 1000 / fps;
    const targetTime = (currentFrame - 1) * (frameTime / 1000);
    const diff = Math.abs(audio.currentTime - targetTime);

    if (!isPlaying) {
      audio.currentTime = targetTime;
      // Play a brief 150ms snippet of the audio to provide feedback on manual frame change
      audio.play().catch(e => console.log("Audio play error:", e));
      const timeoutId = setTimeout(() => {
        if (!useStore.getState().isPlaying) {
          audio.pause();
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    } else if (diff > 0.15) {
      audio.currentTime = targetTime;
    }
  }, [currentFrame, fps, isPlaying]);

  // Playback timer
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        const nextFrame = (useStore.getState().currentFrame % useStore.getState().totalFrames) + 1;
        setCurrentFrame(nextFrame);
      }, 1000 / fps);
    }
    return () => clearInterval(interval);
  }, [isPlaying, fps, setCurrentFrame]);

  if (!animationEnabled) return null;

  const [frameWidth, setFrameWidth] = useState(14);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);
  const touchZoomRef = useRef<{ dist: number, baseWidth: number } | null>(null);
  const trackHeaderWidth = 180;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const handlePointerDownRuler = (e: React.PointerEvent, frame: number) => {
    isScrubbingRef.current = true;
    handleFrameClick(frame);
    const handler = (ev: PointerEvent) => {
      if (isScrubbingRef.current && timelineBodyRef.current) {
        const rect = timelineBodyRef.current.getBoundingClientRect();
        const scrollLeft = timelineBodyRef.current.scrollLeft;
        const x = ev.clientX - rect.left + scrollLeft; // 200 is sidebar width
        const frame = Math.max(1, Math.min(totalFrames, Math.floor(x / frameWidth) + 1));
        handleFrameClick(frame);
      }
    };
    const upHandler = () => {
      isScrubbingRef.current = false;
      window.removeEventListener('pointermove', handler);
      window.removeEventListener('pointerup', upHandler);
    };
    window.addEventListener('pointermove', handler);
    window.addEventListener('pointerup', upHandler);
  };

  const handleFrameClick = (frame: number) => {
    setCurrentFrame(frame);
  };

  return (
    <div 
      data-tour="timeline"
      className="h-full bg-[#252525] border-t border-zinc-800 flex flex-col select-none overflow-hidden"
    >
      {/* Timeline Controls */}
      <div className="h-9 bg-[#2d2d2d] border-b border-[#ccc] flex items-center px-4 justify-between shrink-0 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 min-w-max flex-wrap">
          <div className="flex items-center bg-black/30 rounded border border-zinc-700 px-1 mr-2 md:mr-4">
             <span className="text-[10px] text-zinc-500 font-bold px-1 select-none hidden md:block">LINHA DO TEMPO</span>
             <select 
                className="bg-transparent text-[11px] font-bold py-1 border-none focus:ring-0 text-white cursor-pointer"
                value={activeTimelineId}
                onChange={(e) => switchTimeline(e.target.value)}
             >
                {timelines?.map(t => (
                  <option key={t.id} value={t.id} className="text-black">{t.name}</option>
                ))}
             </select>
             <button 
                onClick={() => addTimeline()}
                className="text-zinc-400 hover:text-white p-1 ml-1"
                title="Nova Linha do Tempo"
             >
                <Plus size={12} />
             </button>
             {timelines?.length > 1 && (
               <button 
                  onClick={() => deleteTimeline(activeTimelineId)}
                  className="text-zinc-400 hover:text-red-400 p-1 ml-0.5"
                  title="Excluir Linha do Tempo"
               >
                  <Minus size={12} />
               </button>
             )}
          </div>

          <div className="flex items-center gap-0.5 border-r border-zinc-700 pr-1 mr-1 md:pr-2 md:mr-2">
            <ControlButton onClick={() => setCurrentFrame(1)} disabled={isPlaying}><ChevronsLeft size={14} /></ControlButton>
            <ControlButton onClick={() => setCurrentFrame(Math.max(1, currentFrame - 1))} disabled={isPlaying}><SkipBack size={14} /></ControlButton>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-8 h-6 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
            </button>
            <ControlButton onClick={() => setCurrentFrame(Math.min(totalFrames, currentFrame + 1))} disabled={isPlaying}><SkipForward size={14} /></ControlButton>
            <ControlButton onClick={() => setCurrentFrame(totalFrames)} disabled={isPlaying}><ChevronsRight size={14} /></ControlButton>
          </div>

          <div className="flex items-center gap-2 pr-1 mr-1 md:pr-2 md:mr-2 border-r border-zinc-700">
             <ControlButton active={onionSkin} onClick={toggleOnionSkin} title="Onion Skin"><Ghost size={14} /></ControlButton>
             <ControlButton active={true} title="Loop"><IterationCcw size={14} /></ControlButton>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[#333]">
               <span className="text-[10px] font-bold hidden md:block">FPS:</span>
               <input 
                 type="number" 
                 value={fps} 
                 onChange={(e) => setFps(Number(e.target.value))}
                 className="w-8 bg-black/40 border border-zinc-700 text-[10px] text-center font-bold px-0.5 rounded"
               />
            </div>
          </div>

          {/* Audio Import Control */}
          <div className="flex items-center gap-1.5 pl-2 ml-2 border-l border-zinc-700">
             <input 
               type="file" 
               id="timeline-audio-upload"
               accept="audio/*" 
               className="hidden" 
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const url = URL.createObjectURL(file);
                   setImportedAudio(url, file.name);
                 }
               }}
             />
             {importedAudioUrl ? (
               <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded px-2 py-0.5 max-w-[150px] md:max-w-[200px]">
                 <Music size={12} className="text-indigo-400 shrink-0 animate-pulse" />
                 <span className="text-[10px] font-semibold truncate text-zinc-300" title={importedAudioName || "Áudio"}>
                   {importedAudioName}
                 </span>
                 <button 
                   onClick={() => setImportedAudio(null, null)}
                   className="text-zinc-500 hover:text-red-400 transition-colors p-0.5 rounded shrink-0 ml-1"
                   title="Remover Áudio"
                 >
                   <Trash2 size={12} />
                 </button>
               </div>
             ) : (
               <label 
                 htmlFor="timeline-audio-upload"
                 className="flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 hover:text-white border border-zinc-700 rounded text-[10px] font-bold transition-all cursor-pointer select-none text-zinc-300"
               >
                 <Music size={12} className="text-zinc-400" />
                 <span>Importar Áudio</span>
               </label>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => setAnimationEnabled(false)}
             className="text-zinc-500 hover:text-white transition-colors"
           >
              Fechar
           </button>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* Track Headers (Left sidebar) */}
        <div className="w-[200px] bg-[#f0f0f0] border-r border-[#aaa] shrink-0 overflow-y-auto scrollbar-hide z-20">
          <div className="h-6 border-b border-[#aaa] flex items-center px-3 bg-[#e5e5e5]">
             <Layers size={14} className="text-zinc-500 mr-2" />
             <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Camadas</span>
          </div>
          {layers.map((layer) => (
            <div 
              key={layer.id}
              onClick={() => setActiveLayer(layer.id)}
              className={twMerge(
                "h-[26px] border-b border-black flex items-center px-2 cursor-pointer transition-colors group",
                activeLayerId === layer.id ? "bg-[#d5d5d5]" : "hover:bg-[#e0e0e0]"
              )}
            >
              <div className="w-5 h-5 text-zinc-500 hover:text-[#222] group-hover:visible invisible flex items-center justify-center">
                <Eye size={14} />
              </div>
              <div className="flex flex-col flex-1 pl-2 min-w-0 overflow-hidden">
                <span className="text-[11px] font-semibold text-[#333] truncate whitespace-nowrap">{layer.name}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  useStore.getState().updateLayerProperty(layer.id, "disableKeyframes", !layer.disableKeyframes);
                }}
                className={twMerge("ml-1 p-1 rounded hover:bg-black/10 text-zinc-500", layer.disableKeyframes ? "opacity-30" : "text-indigo-600")}
                title={layer.disableKeyframes ? "Keyframes Desativados" : "Keyframes Ativados"}
              >
                <Film size={12} />
              </button>
            </div>
          ))}
          {importedAudioUrl && (
            <div className="h-[26px] border-b border-black bg-[#4c4cff]/10 flex items-center px-2 select-none">
              <Music size={12} className="text-indigo-400 mr-2 shrink-0 animate-pulse" />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[10px] font-bold text-[#4c4cff] truncate">{importedAudioName || "Áudio Importado"}</span>
              </div>
            </div>
          )}
          <div className="h-8 flex items-center justify-center border-b border-zinc-800">
             <button className="text-[10px] font-bold text-zinc-500 hover:text-white flex items-center gap-1.5 opacity-60">
                <Plus size={12} /> TRILHA
             </button>
          </div>
        </div>

        {/* Timeline Grid (Right side) */}
        <div 
          ref={timelineBodyRef}
          onTouchStart={(e) => {
            if (e.touches.length === 2) {
              e.preventDefault();
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              touchZoomRef.current = { dist, baseWidth: frameWidth };
            }
          }}
          onTouchMove={(e) => {
            if (e.touches.length === 2 && touchZoomRef.current) {
              e.preventDefault();
              const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              const scale = dist / touchZoomRef.current.dist;
              setFrameWidth(Math.max(4, Math.min(60, touchZoomRef.current.baseWidth * scale)));
            }
          }}
          onTouchEnd={() => { touchZoomRef.current = null; }}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              setFrameWidth(prev => Math.max(4, Math.min(60, prev - Math.sign(e.deltaY) * 2)));
            }
          }}
          className="flex-1 flex flex-col overflow-x-auto relative scroll-smooth scrollbar-thin scrollbar-track-[#1a1a1a] scrollbar-thumb-zinc-700"
          onScroll={handleScroll}
        >
          {/* Frame Ruler */}
          <div 
            className="h-6 bg-[#e0e0e0] border-b border-[#aaa] flex sticky top-0 z-10"
            style={{ width: totalFrames * frameWidth + 100 }}
          >
            {Array.from({ length: totalFrames + 4 }).map((_, i) => {
              const frameNum = i + 1;
              const isFrameValid = frameNum <= totalFrames;
              const isDragging = draggedFrame === frameNum;
              const isDragOver = dragOverFrame === frameNum;
              return (
                <div 
                  key={i}
                  draggable={isFrameValid}
                  onDragStart={(e) => {
                    if (!isFrameValid) return;
                    setDraggedFrame(frameNum);
                    e.dataTransfer.setData("text/plain", String(frameNum));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    if (!isFrameValid) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverFrame(frameNum);
                  }}
                  onDragLeave={() => {
                    if (dragOverFrame === frameNum) setDragOverFrame(null);
                  }}
                  onDragEnd={() => {
                    setDraggedFrame(null);
                    setDragOverFrame(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!isFrameValid) return;
                    const src = parseInt(e.dataTransfer.getData("text/plain")) || draggedFrame;
                    if (src && src !== frameNum) {
                      reorderFrames(src, frameNum);
                    }
                    setDraggedFrame(null);
                    setDragOverFrame(null);
                  }}
                  onPointerDown={(e) => handlePointerDownRuler(e, frameNum)}
                  onDoubleClick={() => {
                    setDuplicationFrame(frameNum);
                    setDuplicationCount(1);
                  }}
                  title={isFrameValid ? `Quadro ${frameNum} (Arraste para reordenar)` : undefined}
                  className={twMerge(
                    "border-r border-[#1a1a1a] flex flex-col justify-end shrink-0 cursor-grab active:cursor-grabbing hover:bg-[#ccc] transition-colors relative select-none",
                    frameNum % 5 === 0 ? "bg-[#d0d0d0]" : "",
                    isDragging ? "opacity-40 bg-indigo-200" : "",
                    isDragOver ? "bg-indigo-300 ring-2 ring-indigo-600 z-20" : ""
                  )}
                  style={{ width: frameWidth }}
                >
                  {((frameNum) % 5 === 0 || i === 0) && (
                    <span className="text-[9px] text-[#555] absolute bottom-0.5 left-0.5 font-mono select-none">{frameNum}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid Rows */}
          <div className="flex-1 relative" style={{ width: totalFrames * frameWidth + 100 }}>
             {layers.map((layer, lIdx) => (
               <div key={layer.id} className="h-[26px] border-b border-[#ccc] flex relative bg-[#f5f5f5]">
                  {Array.from({ length: totalFrames + 4 }).map((_, fIdx) => {
                    const fNum = fIdx + 1;
                    const isFrameValid = fNum <= totalFrames;
                    const hasCel = layer.disableKeyframes ? (fNum === 1 || !!layer.cels[fNum]) : !!layer.cels[fNum];
                    const isDragging = draggedFrame === fNum;
                    const isDragOver = dragOverFrame === fNum;
                    return (
                      <div 
                        key={`frame-${layer.id}-${fNum}`}
                        draggable={isFrameValid}
                        onDragStart={(e) => {
                          if (!isFrameValid) return;
                          setDraggedFrame(fNum);
                          try {
                            e.dataTransfer.setData("text/plain", String(fNum));
                            e.dataTransfer.effectAllowed = "move";
                          } catch (err) {}
                        }}
                        onDragOver={(e) => {
                          if (!isFrameValid) return;
                          e.preventDefault();
                          try {
                            e.dataTransfer.dropEffect = "move";
                          } catch (err) {}
                          setDragOverFrame(fNum);
                        }}
                        onDragLeave={() => {
                          if (dragOverFrame === fNum) setDragOverFrame(null);
                        }}
                        onDragEnd={() => {
                          setDraggedFrame(null);
                          setDragOverFrame(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (!isFrameValid) return;
                          let src: number | null = null;
                          try {
                            const val = e.dataTransfer.getData("text/plain");
                            if (val) src = parseInt(val);
                          } catch (err) {}
                          if (!src) src = draggedFrame;
                          if (src && src !== fNum) {
                            reorderFrames(src, fNum);
                          }
                          setDraggedFrame(null);
                          setDragOverFrame(null);
                        }}
                        onClick={() => handleFrameClick(fNum)}
                        onDoubleClick={() => {
                          setDuplicationFrame(fNum);
                          setDuplicationCount(1);
                        }}
                        className={twMerge(
                          "border-r border-[#ccc] shrink-0 relative flex items-center justify-center cursor-pointer select-none",
                          hasCel ? "bg-[#d4d4d4]" : "bg-[#f5f5f5]",
                          fNum % 5 === 0 && !hasCel ? "bg-[#e5e5e5]" : "",
                          fNum === currentFrame ? "bg-[#b3d4ff]/80 ring-1 ring-inset ring-[#0066cc]" : "",
                          isDragging ? "opacity-40 bg-indigo-200" : "",
                          isDragOver ? "bg-indigo-300 ring-2 ring-indigo-600 z-20" : ""
                        )}
                        style={{ width: frameWidth }}
                      >
                         {hasCel && (
                           <div className="w-1.5 h-1.5 rounded-full bg-black z-0" />
                         )}
                      </div>
                    );
                  })}
               </div>
             ))}

             {importedAudioUrl && (
               <div className="h-[26px] border-b border-black flex relative bg-[#4c4cff]/[0.04]">
                 {Array.from({ length: totalFrames + 4 }).map((_, fIdx) => {
                   const fNum = fIdx + 1;
                   return (
                     <div 
                       key={`audio-frame-${fNum}`}
                       onClick={() => handleFrameClick(fNum)}
                       className={twMerge(
                         "border-r border-[#ccc] shrink-0 relative flex items-center justify-center cursor-pointer hover:bg-[#4c4cff]/10 transition-colors",
                         fNum === currentFrame ? "bg-[#4c4cff]/20" : ""
                       )}
                       style={{ width: frameWidth }}
                     >
                       {/* Audio Waveform Bar Visual representation */}
                       <div className="flex items-end gap-[1.5px] h-3 select-none pointer-events-none">
                         <div className="w-[1.5px] bg-[#4c4cff]/60 rounded-full" style={{ height: `${20 + (fNum * 7) % 70}%` }} />
                         <div className="w-[1.5px] bg-[#4c4cff]/90 rounded-full" style={{ height: `${40 + (fNum * 13) % 60}%` }} />
                         <div className="w-[1.5px] bg-[#4c4cff]/60 rounded-full" style={{ height: `${15 + (fNum * 19) % 80}%` }} />
                       </div>
                     </div>
                   );
                 })}
               </div>
             )}

             {/* Red Playhead (Needle) */}
             <div 
               className="absolute -top-6 bottom-0 w-px bg-[#d93b3b] z-30 pointer-events-none shadow-[0_0_8px_rgba(217,59,59,0.5)]"
               style={{ left: (currentFrame - 1) * frameWidth + frameWidth / 2 }}
             >
                <div className="absolute top-0 -left-[11px] w-[23px] h-6 bg-[#d93b3b] rounded-t-sm flex items-end justify-center pb-0.5 shadow-md">
                  <span className="text-[9px] text-white font-bold">{currentFrame}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
      {duplicationFrame !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] pointer-events-auto animate-fade-in">
          <div className="bg-[#1e1e1e] border border-zinc-800 rounded-xl p-5 w-80 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-indigo-400">Duplicar Quadro {duplicationFrame}</h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Escolha quantas vezes deseja duplicar o conteúdo deste quadro. Os novos quadros duplicados serão inseridos a partir do quadro selecionado.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Quantidade de Cópias</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={duplicationCount}
                  onChange={(e) => setDuplicationCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-black/40 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-center w-20 focus:outline-none focus:border-indigo-500 text-white"
                />
                <div className="flex gap-1 flex-1">
                  {[1, 2, 5, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setDuplicationCount(num)}
                      className={twMerge(
                        "flex-1 py-1 px-1.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold rounded-md border transition-all text-zinc-300",
                        duplicationCount === num ? "border-indigo-500 bg-indigo-500/20 text-white" : "border-transparent"
                      )}
                    >
                      +{num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setDuplicationFrame(null)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  duplicateFrameTimes(duplicationFrame, duplicationCount);
                  setDuplicationFrame(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlButton({ 
  children, 
  onClick, 
  active = false, 
  disabled = false,
  title 
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  active?: boolean, 
  disabled?: boolean,
  title?: string
}) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={twMerge(
        "w-7 h-6 flex items-center justify-center rounded transition-all",
        disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-zinc-700 text-zinc-400 hover:text-white",
        active ? "bg-indigo-600/30 text-indigo-400 border border-indigo-600/50" : ""
      )}
    >
      {children}
    </button>
  );
}

function FirstPage({ size }: { size: number }) {
  return (
    <div className="relative">
      <SkipBack size={size} />
      <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-current rounded-full" />
    </div>
  );
}

function LastPage({ size }: { size: number }) {
  return (
    <div className="relative">
      <SkipForward size={size} />
      <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-current rounded-full" />
    </div>
  );
}
