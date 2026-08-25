const fs = require('fs');
let code = fs.readFileSync('src/components/SimpleTimeline.tsx', 'utf-8');

const regex = /<button[\s\S]*?onClick=\{\(e\) => \{[\s\S]*?removeFrame\(frameId\);[\s\S]*?setShowFrameMenu\(false\);[\s\S]*?\}\}[\s\S]*?className="w-full p-2\.5 hover:bg-red-500\/10 rounded-xl text-\[10px\] font-bold uppercase text-left text-red-400 flex items-center gap-3 transition-colors px-4"[\s\S]*?>[\s\S]*?<Trash2 size=\{16\} \/>[\s\S]*?<span>Excluir Quadro<\/span>[\s\S]*?<\/button>/;

const menuContent = `
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
`;

if (regex.test(code)) {
  code = code.replace(regex, menuContent);
  fs.writeFileSync('src/components/SimpleTimeline.tsx', code);
  console.log("Success");
} else {
  console.log("Regex failed to match");
}
