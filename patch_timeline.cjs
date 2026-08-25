const fs = require('fs');
let code = fs.readFileSync('src/components/SimpleTimeline.tsx', 'utf-8');

const replacement = `
function SimpleFrameItem({ frameId, isSelected, currentFrame, setCurrentFrame, layers }: any) {
  const [showFrameMenu, setShowFrameMenu] = useState(false);
  const { frameDurations, setFrameDuration, toggleKeyframe, removeFrame, keyframedLayers, addFrame, reverseAnimation, shiftFramesRight, shiftFramesLeft, clearCurrentFrame, copyFrameToAll, randomizeFrames, pingPongAnimation, deleteFrame, activeLayerId } = useStore();

  const handleDuplicate = (e: any) => {
    e.stopPropagation();
    addFrame();
    setShowFrameMenu(false);
  };

  return (
    <div className="relative shrink-0">
      <button 
        onClick={() => {
          if (isSelected) {
            setShowFrameMenu(!showFrameMenu);
          } else {
            setCurrentFrame(frameId);
          }
        }}
        className={twMerge(
          "relative w-12 h-12 rounded-xl border flex flex-col items-center justify-center transition-all overflow-hidden group",
          isSelected 
            ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]" 
            : "border-white/10 bg-zinc-800/50 hover:border-white/30"
        )}
      >
        <span className={twMerge(
          "text-xs font-bold font-mono z-10 transition-colors",
          isSelected ? "text-indigo-400" : "text-zinc-500 group-hover:text-zinc-300"
        )}>
          {frameId}
        </span>
        {keyframedLayers[frameId]?.length > 0 && (
          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-yellow-400" />
        )}
        <div className="absolute bottom-0 left-0 h-1 bg-white/20" style={{ width: \`\${Math.min(100, (frameDurations[frameId] || 100) / 5)}%\` }} />
      </button>

      <AnimatePresence>
        {showFrameMenu && isSelected && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 z-50 overflow-hidden flex flex-col backdrop-blur-xl"
          >
            <div className="px-3 py-2 flex items-center justify-between border-b border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Quadro {frameId}</span>
              <button onClick={(e) => { e.stopPropagation(); setShowFrameMenu(false); }} className="p-1 hover:bg-white/10 rounded-full text-zinc-500">
                <X size={14} />
              </button>
            </div>
            
            <div className="p-2 pb-0">
                <div className="text-[10px] text-zinc-500 uppercase font-bold px-3 py-1 mt-2">Opções da Animação</div>
                <div className="grid grid-cols-2 gap-1 p-1">
                  <button onClick={(e) => { e.stopPropagation(); if (activeLayerId) reverseAnimation(activeLayerId); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                    <RefreshCcw size={14} className="text-zinc-400 group-hover:text-indigo-400" />
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-center">Inverter</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (activeLayerId) pingPongAnimation(activeLayerId); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                    <PlayCircle size={14} className="text-zinc-400 group-hover:text-indigo-400" />
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-center">Ping-Pong</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (activeLayerId) shiftFramesLeft(activeLayerId); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                    <ArrowLeft size={14} className="text-zinc-400 group-hover:text-indigo-400" />
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-center">Mover Esq</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (activeLayerId) shiftFramesRight(activeLayerId); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                    <ArrowRight size={14} className="text-zinc-400 group-hover:text-indigo-400" />
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-center">Mover Dir</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); layers.forEach(l => clearCurrentFrame(l.id)); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-red-500/10 rounded-xl transition-colors group">
                    <Trash size={14} className="text-red-400 group-hover:text-red-300" />
                    <span className="text-[8px] font-bold uppercase text-red-400 text-center">Limpar Todo</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (activeLayerId) copyFrameToAll(activeLayerId); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                    <Copy size={14} className="text-zinc-400 group-hover:text-indigo-400" />
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-center">Copiar P/ Todos</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); if (activeLayerId) randomizeFrames(activeLayerId); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                    <Shuffle size={14} className="text-zinc-400 group-hover:text-indigo-400" />
                    <span className="text-[8px] font-bold uppercase text-zinc-400 text-center">Randomizar</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeFrame(frameId); setShowFrameMenu(false); }} className="flex flex-col items-center gap-1.5 p-2 hover:bg-red-500/10 rounded-xl transition-colors group">
                    <Trash2 size={14} className="text-red-400 group-hover:text-red-300" />
                    <span className="text-[8px] font-bold uppercase text-red-400 text-center">Excluir</span>
                  </button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

code = code.replace(/function SimpleFrameItem.*?\}\n\s*\}\n\s*\]\n\s*\}\n\s*\}/s, 'REPLACE_ME_LATER');
// Actually, it's easier to just rebuild it all
code = code.substring(0, code.indexOf('function SimpleFrameItem'));
code += replacement + '\n';
code += `export function SimpleTimeline() {
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
`;

fs.writeFileSync('src/components/SimpleTimeline.tsx', code);
