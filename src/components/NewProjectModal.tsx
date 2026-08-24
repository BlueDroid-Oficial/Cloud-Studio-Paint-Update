import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Image as ImageIcon, Video, FileText, Monitor, Smartphone, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, getTranslation } from '../lib/translations';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const { createNewProject, setWidthHeight, setAnimationEnabled, addLayerWithImage, language } = useStore();
  
  const t = (key: string, defaultValue?: string) => getTranslation(key, language || "pt") || defaultValue || key;
  
  const [projectType, setProjectType] = useState<'illustration' | 'animation' | 'webtoon'>('illustration');
  
  // Custom unit management (px, cm, mm) and resolution (dpi)
  const [unit, setUnit] = useState<'px' | 'cm' | 'mm'>('px');
  const [dpi, setDpi] = useState<number>(300);
  const [inputWidth, setInputWidth] = useState<number>(1920);
  const [inputHeight, setInputHeight] = useState<number>(1080);
  
  const [name, setName] = useState('Sem título');
  const [fps, setFps] = useState(12);

  if (!isOpen) return null;

  const getPixels = (value: number, unitType: 'px' | 'cm' | 'mm', dpiValue: number) => {
    if (unitType === 'px') return Math.round(value);
    if (unitType === 'cm') return Math.round((value / 2.54) * dpiValue);
    if (unitType === 'mm') return Math.round((value / 25.4) * dpiValue);
    return Math.round(value);
  };

  const currentWidthPx = getPixels(inputWidth, unit, dpi);
  const currentHeightPx = getPixels(inputHeight, unit, dpi);

  const handleCreate = () => {
    setWidthHeight(currentWidthPx, currentHeightPx);
    if (projectType === 'animation') {
      useStore.getState().setAnimationEnabled(true);
      useStore.getState().setFps(fps);
    } else {
      useStore.getState().setAnimationEnabled(false);
    }
    createNewProject();
    onClose();
  };

  const handleUnitChange = (newUnit: 'px' | 'cm' | 'mm') => {
    const pxW = getPixels(inputWidth, unit, dpi);
    const pxH = getPixels(inputHeight, unit, dpi);
    
    let newW = pxW;
    let newH = pxH;
    if (newUnit === 'cm') {
      newW = Number(((pxW / dpi) * 2.54).toFixed(2));
      newH = Number(((pxH / dpi) * 2.54).toFixed(2));
    } else if (newUnit === 'mm') {
      newW = Number(((pxW / dpi) * 25.4).toFixed(1));
      newH = Number(((pxH / dpi) * 25.4).toFixed(1));
    } else {
      newW = Math.round(pxW);
      newH = Math.round(pxH);
    }
    
    setUnit(newUnit);
    setInputWidth(newW);
    setInputHeight(newH);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target?.result as string;
          if (dataUrl) {
            const img = new Image();
            img.onload = () => {
              setUnit('px');
              setInputWidth(img.width);
              setInputHeight(img.height);
              setWidthHeight(img.width, img.height);
              setAnimationEnabled(false);
              createNewProject();
              // Small delay to ensure layers are initialized
              setTimeout(() => {
                addLayerWithImage(file.name, dataUrl);
              }, 100);
              onClose();
            };
            img.src = dataUrl;
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-[#2d2d2d] w-full max-w-xl rounded-xl shadow-2xl border border-zinc-700 overflow-hidden text-zinc-300"
        >
          {/* Header */}
          <div className="h-12 bg-[#333] border-b border-black flex items-center justify-between px-4">
             <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider">Novo Projeto</span>
             </div>
             <button onClick={onClose} className="hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
          </div>

          <div className="p-6 space-y-6">
            {/* Project Types Icons (CSP Style) */}
            <div className="flex justify-center gap-4 bg-black/20 p-4 rounded-lg">
               <button 
                 onClick={() => setProjectType('illustration')}
                 className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${projectType === 'illustration' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-transparent border-zinc-700 hover:border-zinc-500'}`}
                 title={t('tab_illustration', 'Ilustração')}
               >
                 <ImageIcon size={32} />
               </button>
               <button 
                 onClick={() => setProjectType('animation')}
                 className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${projectType === 'animation' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-transparent border-zinc-700 hover:border-zinc-500'}`}
                 title={t('tab_animation', 'Animação')}
               >
                 <Video size={32} />
               </button>
               <button 
                 onClick={() => setProjectType('webtoon')}
                 className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${projectType === 'webtoon' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-transparent border-zinc-700 hover:border-zinc-500'}`}
                 title={t('tab_webtoon', 'Webtoon / Quadrinho')}
               >
                 <LayoutGrid size={32} />
               </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('file_name', 'Nome do arquivo')}</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                      />
                   </div>
                   
                   <div className="space-y-1">
                      <div className="flex justify-between items-center mb-1">
                         <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('dimensions', 'Dimensões')} ({unit})</label>
                         <div className="flex gap-1 bg-black/35 p-0.5 rounded">
                            {(['px', 'cm', 'mm'] as const).map((u) => (
                              <button
                                key={u}
                                onClick={() => handleUnitChange(u)}
                                className={`px-2 py-0.5 rounded text-[8px] font-black uppercase transition-colors cursor-pointer ${unit === u ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                              >
                                {u}
                              </button>
                            ))}
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-[9px] text-zinc-600 uppercase block mb-1">{t('width', 'Largura')}</label>
                            <input 
                              type="number" 
                              step="any" 
                              value={inputWidth} 
                              onChange={e => setInputWidth(Number(e.target.value))} 
                              className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500" 
                            />
                         </div>
                         <div>
                            <label className="text-[9px] text-zinc-600 uppercase block mb-1">{t('height', 'Altura')}</label>
                            <input 
                              type="number" 
                              step="any" 
                              value={inputHeight} 
                              onChange={e => setInputHeight(Number(e.target.value))} 
                              className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500" 
                            />
                         </div>
                      </div>
                      {unit !== 'px' && (
                        <div className="text-[9px] text-zinc-500 font-medium italic mt-1.5 bg-black/10 p-1.5 rounded border border-zinc-800/40">
                          {t('equals_to', 'Equivale a')} <strong className="text-zinc-300">{currentWidthPx}x{currentHeightPx}px</strong> a {dpi} DPI
                        </div>
                      )}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('resolution', 'Resolução / DPI')}</label>
                      <select 
                        value={`${dpi} dpi`}
                        onChange={e => setDpi(Number(e.target.value.replace(' dpi', '')))}
                        className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                         <option value="72 dpi">72 dpi (Web / Rápido)</option>
                         <option value="144 dpi">144 dpi (Mídias Sociais)</option>
                         <option value="300 dpi">300 dpi (Impressão Alta Qualidade)</option>
                         <option value="350 dpi">350 dpi (Quadrinhos / Mangá)</option>
                         <option value="600 dpi">600 dpi (Manga Ultra HD)</option>
                      </select>
                   </div>

                   {projectType === 'animation' && (
                     <div className="space-y-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">{t('frame_settings', 'Configurações de quadros')}</label>
                        <div>
                           <label className="text-[9px] text-zinc-600 uppercase block mb-1">FPS</label>
                           <input type="number" value={fps} onChange={e => setFps(Number(e.target.value))} className="w-full bg-black/40 border border-zinc-700 rounded px-2 py-1 text-xs" />
                        </div>
                     </div>
                   )}
                </div>
            </div>

            {/* Preview Box */}
            <div className="h-40 bg-black/40 border border-zinc-800 rounded-lg flex items-center justify-center relative overflow-hidden p-4">
               <div 
                 className="bg-white/10 border-2 border-indigo-500/50 shadow-2xl transition-all duration-300 flex items-center justify-center text-[10px] text-zinc-500 font-bold"
                 style={{ 
                   aspectRatio: `${currentWidthPx}/${currentHeightPx}`,
                   height: '90%'
                 }}
               >
                 <span className="p-1 text-center truncate">{currentWidthPx} x {currentHeightPx} px</span>
               </div>
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[85%] h-[85%] border border-indigo-400 border-dashed opacity-30" />
               </div>
            </div>
          </div>

          <div className="h-16 bg-[#333] border-t border-black p-4 flex items-center justify-between gap-3">
             <button 
               onClick={handleImport}
               className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-all cursor-pointer"
             >
               <ImageIcon size={14} />
               {t('import_image', 'Importar Imagem')}
             </button>
             <div className="flex gap-3">
               <button onClick={onClose} className="px-6 py-2 text-xs font-bold hover:text-white transition-colors cursor-pointer">{t('cancel', 'Cancelar')}</button>
               <button 
                 onClick={handleCreate}
                 className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-10 py-2 rounded-lg transition-all shadow-lg active:scale-95 cursor-pointer"
               >
                 Criar Projeto
               </button>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
