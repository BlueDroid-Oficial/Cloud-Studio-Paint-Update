const fs = require('fs');
let panel = fs.readFileSync('src/components/PropertiesPanel.tsx', 'utf-8');

const additionalImports = "import { Zap, RefreshCcw, ArrowRight, ArrowLeft, Trash, Copy, Shuffle, PlayCircle } from 'lucide-react';\n";
panel = panel.replace("import { Eye,", additionalImports + "import { Eye,");

const destructure = `
    invertLayerColors,
    convertToGrayscale,
    adjustBrightness,
    sepiaFilter,
    dropShadowLayer,
    gaussianBlurLayer,
    reverseAnimation,
    shiftFramesRight,
    shiftFramesLeft,
    clearCurrentFrame,
    copyFrameToAll,
    randomizeFrames,
    pingPongAnimation,
    deleteFrame,
`;
panel = panel.replace('mergeDown, duplicateLayer,', 'mergeDown, duplicateLayer,' + destructure);

const uiCode = `
            {/* 17 ADVANCED FEATURES SECTION */}
            {activeLayerId && (
              <div className="mt-4 border-t border-zinc-700/50 pt-4">
                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Ações Avançadas da Camada</div>
                <div className="grid grid-cols-2 gap-1 mb-4">
                  <button onClick={() => invertLayerColors(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <Zap size={10} /> Inverter Cores
                  </button>
                  <button onClick={() => convertToGrayscale(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <Zap size={10} /> Escala de Cinza
                  </button>
                  <button onClick={() => adjustBrightness(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <Sparkles size={10} /> Brilho +
                  </button>
                  <button onClick={() => sepiaFilter(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <Sparkles size={10} /> Sépia
                  </button>
                  <button onClick={() => dropShadowLayer(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <LayersIcon size={10} /> Drop Shadow
                  </button>
                  <button onClick={() => gaussianBlurLayer(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <Sliders size={10} /> Desfoque
                  </button>
                </div>

                <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Ações Avançadas de Animação</div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  <button onClick={() => reverseAnimation(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <RefreshCcw size={10} /> Inverter Animação
                  </button>
                  <button onClick={() => pingPongAnimation(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <PlayCircle size={10} /> Ping-Pong
                  </button>
                  <button onClick={() => shiftFramesLeft(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <ArrowLeft size={10} /> Mover p/ Esquerda
                  </button>
                  <button onClick={() => shiftFramesRight(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <ArrowRight size={10} /> Mover p/ Direita
                  </button>
                  <button onClick={() => clearCurrentFrame(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-red-300 text-[9px] rounded border border-red-700/50 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-colors">
                    <Trash size={10} /> Limpar Quadro
                  </button>
                  <button onClick={() => deleteFrame(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-red-300 text-[9px] rounded border border-red-700/50 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300 transition-colors">
                    <Trash size={10} /> Excluir Quadro
                  </button>
                  <button onClick={() => copyFrameToAll(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <Copy size={10} /> Copiar p/ Todos
                  </button>
                  <button onClick={() => randomizeFrames(activeLayerId)} className="flex items-center gap-1.5 px-2 py-1.5 bg-[#1a1a1a] text-zinc-300 text-[9px] rounded border border-zinc-700/50 hover:bg-indigo-500/20 hover:border-indigo-500/50 hover:text-indigo-300 transition-colors">
                    <Shuffle size={10} /> Randomizar
                  </button>
                </div>
              </div>
            )}
`;

panel = panel.replace('            {/* Layer Blending & Opacity Details */}', uiCode + '\n            {/* Layer Blending & Opacity Details */}');

fs.writeFileSync('src/components/PropertiesPanel.tsx', panel);
