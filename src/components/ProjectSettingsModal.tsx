import React from 'react';
import { useStore } from '../store/useStore';
import { X, Settings, Image as ImageIcon, Clock, FileDown, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../lib/translations';

export function ProjectSettingsModal() {
  const { language, 
    showProjectSettings, setShowProjectSettings,
    width, height, setWidthHeight,
    fps, setFps,
    dpi, setDpi,
    exportQuality, setExportQuality,
    totalFrames, setTotalFrames,
    toolInterpolation, setToolInterpolation,
    projectName, setProjectName,
    uiScale, setUiScale
  } = useStore();

  const t = (key: string, defaultValue: string) => translations[language as keyof typeof translations]?.[key] || defaultValue;

  if (!showProjectSettings) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#2d2d2d] w-full max-w-md rounded-lg shadow-2xl border border-zinc-700 overflow-hidden"
        >
          <div className="h-10 bg-[#333] border-b border-black flex items-center justify-between px-4">
             <div className="flex items-center gap-2">
                <Settings size={16} className="text-zinc-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Configurações do Projeto</span>
             </div>
             <button 
               onClick={() => setShowProjectSettings(false)}
               className="text-zinc-500 hover:text-white transition-colors"
             >
               <X size={18} />
             </button>
          </div>

          <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
            {/* Project Name */}
            <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
                 <Settings size={14} />
                 Identificação do Projeto
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold uppercase">Nome do Projeto</label>
                <input 
                  type="text" 
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex: Minha Ilustração"
                />
              </div>
            </div>

            {/* UI Settings */}
            <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
                 <Monitor size={14} />
                 {t('interface', 'Interface')}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase">Escala da UI (Zoom)</label>
                  <span className="text-zinc-300 text-xs font-bold">{Math.round(uiScale * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1.5" 
                  step="0.05"
                  value={uiScale}
                  onChange={(e) => setUiScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-black/40 rounded-full appearance-none accent-indigo-500"
                />
              </div>
            </div>

            {/* {t('interpolation', 'Interpolação')} */}
            <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
                 <ImageIcon size={14} />
                 Interpolação
              </div>
              <div className="flex gap-2">
                 <button
                   onClick={() => setToolInterpolation("bilinear")}
                   className={`flex-1 text-xs py-1.5 rounded border ${toolInterpolation === "bilinear" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-black/40 border-zinc-700 text-zinc-400"}`}
                 >
                   {t('smooth', 'Suavizar')}
                 </button>
                 <button
                   onClick={() => setToolInterpolation("nearest")}
                   className={`flex-1 text-xs py-1.5 rounded border ${toolInterpolation === "nearest" ? "bg-indigo-600 border-indigo-500 text-white" : "bg-black/40 border-zinc-700 text-zinc-400"}`}
                 >
                   {t('pixelated', 'Pixelado')}
                 </button>
              </div>
            </div>

            {/* Canvas Size */}
            <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
                 <ImageIcon size={14} />
                 {t('canvas_dimensions', 'Dimensões do Canvas')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('width_px', 'Largura (px)')}</label>
                    <input 
                      type="number" 
                      value={width}
                      onChange={(e) => setWidthHeight(Number(e.target.value), height)}
                      className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('height_px', 'Altura (px)')}</label>
                    <input 
                      type="number" 
                      value={height}
                      onChange={(e) => setWidthHeight(width, Number(e.target.value))}
                      className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    />
                 </div>
              </div>
            </div>

            {/* Animation Settings */}
            <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
                 <Clock size={14} />
                 Animação
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('framerate', 'Taxa de Quadros (FPS)')}</label>
                      <input 
                        type="number" 
                        min={1}
                        max={60}
                        value={fps}
                        onChange={(e) => setFps(Math.max(1, Math.min(60, Number(e.target.value))))}
                        className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('total_frames', 'Total de Quadros')}</label>
                      <input 
                        type="number" 
                        value={totalFrames}
                        onChange={(e) => setTotalFrames(Number(e.target.value))}
                        className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                   </div>
                </div>
                
                <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-zinc-800">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase">{t('playback_speed', 'Velocidade de Reprodução')}</span>
                      <span className="text-xs text-indigo-400 font-bold font-mono">{fps} FPS</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <input 
                       type="range" 
                       min={1}
                       max={60}
                       step={1}
                       value={fps}
                       onChange={(e) => setFps(Number(e.target.value))}
                       className="flex-1 h-1 bg-black/40 accent-indigo-500 cursor-pointer"
                     />
                   </div>
                   <div className="flex justify-between text-[8px] text-zinc-500 font-mono">
                     <span>1 FPS</span>
                     <span>12 FPS (Retro)</span>
                     <span>24 FPS (Cinema)</span>
                     <span>60 FPS (Fluido)</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Export Settings */}
            <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
                 <FileDown size={14} />
                 {t('quality_resolution', 'Qualidade e Resolução')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('resolution_dpi', 'Resolução (DPI)')}</label>
                    <select 
                      value={dpi}
                      onChange={(e) => setDpi(Number(e.target.value))}
                      className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    >
                       <option value={72}>72 DPI (Web)</option>
                       <option value={150}>150 DPI ({t('medium', 'Médio')})</option>
                       <option value={300}>300 DPI ({t('print', 'Impressão')})</option>
                       <option value={600}>600 DPI (Ultra)</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('export_quality', 'Qualidade de Exportação')}</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min={0.1}
                        max={1}
                        step={0.01}
                        value={exportQuality}
                        onChange={(e) => setExportQuality(Number(e.target.value))}
                        className="flex-1 h-1 bg-black/40 accent-indigo-500"
                      />
                      <span className="text-[10px] text-white font-mono w-8">{Math.round(exportQuality * 100)}%</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <div className="h-14 bg-[#333] border-t border-black p-4 flex items-center justify-end">
             <button 
               onClick={() => setShowProjectSettings(false)}
               className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-6 py-2 rounded transition-colors shadow-lg active:scale-95"
             >
               CONCLUÍDO
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
