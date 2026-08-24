import React, { useState } from 'react';
import { Brush, Eraser, PaintBucket, Pipette, SquareDashed, Move, PenTool, Type, Minus, Circle, Square, Star, Clock, Droplets, Fingerprint, Grid, Hand, ChevronLeft, Layers, MoreVertical, LayoutGrid, Plus, History, Maximize2, Scissors, Film, Mail, Columns3, MessageSquare, Compass, Zap, Library, Hash, Wand2, Ruler } from 'lucide-react';
import { useStore, Tool } from '../store/useStore';
import { getTranslation } from '../lib/translations';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Toolbar() {
  const { 
    tool, setTool, color, animationEnabled, setAnimationEnabled, 
    simpleMode, setAppView, isLowEndDevice,
    brushSize, setBrushSize, brushOpacity, setBrushOpacity,
    togglePropertiesPanel, showSimpleTimeline, setShowSimpleTimeline,
    transformMode, setTransformMode, currentFrame, totalFrames,
    addCustomBrush, setImportingBrushData,
    language, shortcuts
  } = useStore();

  const t = (key: string) => getTranslation(key, language || "pt");

  const [showToolMenu, setShowToolMenu] = useState(false);
  const [showTransformMenu, setShowTransformMenu] = useState(false);

  const handleToolClick = (t: Tool) => {
    if (t === 'brush-import') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setImportingBrushData({ name: file.name, dataUrl });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      setTool(t);
    }
    setShowToolMenu(false);
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'brush', icon: <Brush size={20} />, label: t('tool_brush') },
    { id: 'pixel', icon: <Grid size={20} />, label: t('tool_pixel') },
    { id: 'bezier', icon: <PenTool size={20} />, label: t('tool_bezier') },
    { id: 'eraser', icon: <Eraser size={20} />, label: t('tool_eraser') },
    { id: 'fill', icon: <PaintBucket size={20} />, label: t('tool_fill') },
    { id: 'picker', icon: <Pipette size={20} />, label: t('tool_picker') },
    { id: 'blur', icon: <Droplets size={20} />, label: t('tool_blur') },
    { id: 'smudge', icon: <Fingerprint size={20} />, label: t('tool_smudge') },
    { id: 'select-rect', icon: <SquareDashed size={20} />, label: t('tool_select-rect') },
    { id: 'magic_wand', icon: <Wand2 size={20} />, label: t('tool_magic_wand') },
    { id: 'move', icon: <Move size={20} />, label: t('tool_move') },
    { id: 'pan', icon: <Hand size={20} />, label: t('tool_pan') },
    { id: 'line', icon: <Minus size={20} />, label: t('tool_line') },
    { id: 'rect', icon: <Square size={20} />, label: t('tool_rect') },
    { id: 'circle', icon: <Circle size={20} />, label: t('tool_circle') },
    { id: 'star', icon: <Star size={20} />, label: t('tool_star') },
    { id: 'text', icon: <Type size={20} />, label: t('tool_text') },
    { id: 'panel_ruler', icon: <Columns3 size={20} />, label: t('tool_panel_ruler') },
    { id: 'screentone', icon: <Hash size={20} />, label: t('tool_screentone') },
    { id: 'speech_balloon', icon: <MessageSquare size={20} />, label: t('tool_speech_balloon') },
    { id: 'focus_lines', icon: <Zap size={20} />, label: t('tool_focus_lines') },
    { id: 'special_ruler', icon: <Compass size={20} />, label: t('tool_special_ruler') },
    { id: 'ruler', icon: <Ruler size={20} />, label: 'Régua' },
    { id: 'material_library', icon: <Library size={20} />, label: t('tool_material_library') },
    { id: 'brush-import', icon: <Plus size={20} />, label: t('tool_brush-import') },
  ];

  if (simpleMode) {
    return (
      <div className="w-full flex flex-col items-center">
        {/* Sliders Area */}
        <div className="w-full px-4 py-2 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold w-6 text-zinc-400">{brushSize}</span>
            <input 
              type="range" min="1" max="100" step="0.1" 
              value={brushSize} 
              onChange={(e) => setBrushSize(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-zinc-700 rounded-full appearance-none accent-white cursor-pointer"
            />
            <button className="text-zinc-400 hover:text-white"><Plus size={14} /></button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold w-6 text-zinc-400">{Math.round(brushOpacity * 100)}</span>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={brushOpacity} 
              onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-zinc-700 rounded-full appearance-none accent-white cursor-pointer opacity-80"
            />
            <button className="text-zinc-400 hover:text-white"><Plus size={14} /></button>
          </div>
        </div>

        {/* Main Buttons Area */}
        <div className="w-full h-12 flex items-center justify-between px-2">
           <div className="flex items-center gap-1">
             <div className="relative">
               <button 
                 onClick={() => setShowToolMenu(!showToolMenu)}
                 className="p-2 hover:bg-white/10 rounded-full transition-colors"
               >
                 <LayoutGrid size={24} />
               </button>
               {showToolMenu && (
                 <div className="absolute bottom-full left-0 mb-4 bg-[#2d2d2d] border border-black/20 rounded-xl p-3 shadow-2xl grid grid-cols-3 gap-3 w-[200px]">
                    {tools.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => handleToolClick(t.id)}
                        className={twMerge(
                          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                          tool === t.id ? "bg-indigo-600 text-white" : "hover:bg-zinc-700 text-zinc-400"
                        )}
                      >
                        {t.icon}
                        <span className="text-[8px] uppercase font-bold text-center">{t.label}</span>
                      </button>
                    ))}
                 </div>
               )}
             </div>
             <button 
               onClick={() => useStore.getState().setShowMessagesModal(true)}
               className="p-2 hover:bg-white/10 rounded-full transition-colors text-indigo-400"
               title="Mensagens"
             >
               <Mail size={24} />
             </button>
             <button 
               onClick={() => {
                 if (tool === 'eraser' || tool === 'pixel_eraser') {
                   setTool('brush');
                 } else {
                   setTool('eraser');
                 }
               }}
               className={twMerge(
                 "p-2 rounded-full transition-colors",
                 (tool === 'eraser' || tool === 'pixel_eraser') ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-zinc-300"
               )}
             >
               {(tool === 'eraser' || tool === 'pixel_eraser') ? <Eraser size={24} /> : <Brush size={24} />}
             </button>
             <div className="relative p-1">
                <div 
                  className="w-8 h-8 rounded-full border-2 border-white/20 shadow-lg"
                  style={{ backgroundColor: color }}
                />
                <span className="absolute -bottom-1 -right-1 bg-zinc-800 text-[8px] font-bold px-1 rounded border border-zinc-600">1</span>
             </div>
             
             <button 
               title={"Toggle Timeline" + (shortcuts.toggle_timeline ? ` (${shortcuts.toggle_timeline})` : '')}
               onClick={() => setShowSimpleTimeline(!showSimpleTimeline)}
               className={twMerge(
                 "px-3 py-1.5 rounded-full transition-all flex items-center gap-2 border",
                 showSimpleTimeline 
                   ? "bg-indigo-600 border-indigo-400 text-white shadow-lg" 
                   : "bg-zinc-800/50 border-white/5 text-zinc-400 hover:border-white/20"
               )}
             >
               <div className="flex flex-col items-center text-zinc-300">
                 <span className="text-[10px] font-bold leading-none">{currentFrame}</span>
                 <div className="h-[1px] w-3 bg-current opacity-30 my-0.5" />
                 <span className="text-[8px] font-bold opacity-60 leading-none">{totalFrames}</span>
               </div>
               <Film size={20} className={showSimpleTimeline ? "text-white" : "text-zinc-300"} />
             </button>

             <div className="relative">
               <button 
                 onClick={() => setShowTransformMenu(!showTransformMenu)}
                 className={twMerge(
                   "p-2 rounded-full transition-colors",
                   (tool === 'move' || showTransformMenu) ? "bg-indigo-600 text-white" : "hover:bg-white/10 text-zinc-300"
                 )}
               >
                 <Maximize2 size={24} />
               </button>
               {showTransformMenu && (
                 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-[#2d2d2d] border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col gap-1 w-32 z-50">
                    {[
                      { id: 'normal', label: 'Normal' },
                      { id: 'perspective', label: 'Perspectiva' },
                      { id: 'puppet', label: 'Marionete' }
                    ].map(m => (
                      <button 
                        key={m.id}
                        onClick={() => {
                          setTransformMode(m.id as any);
                          setTool('move');
                          setShowTransformMenu(false);
                        }}
                        className={twMerge(
                          "w-full py-2 px-3 rounded-lg text-[10px] font-bold uppercase text-left transition-colors",
                          transformMode === m.id ? "bg-indigo-500 text-white" : "hover:bg-zinc-700 text-zinc-400"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                 </div>
               )}
             </div>
           </div>

           <div className="flex items-center gap-1">
             <button 
               onClick={togglePropertiesPanel}
               className="p-2 hover:bg-white/10 rounded-full transition-colors flex flex-col items-center justify-center relative"
             >
               <Layers size={22} />
               <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold mt-0.5">1</span>
             </button>
             <button 
               onClick={() => setAppView('start')}
               className="p-2 hover:bg-white/10 rounded-full transition-colors"
             >
               <ChevronLeft size={24} />
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="toolbar" className="w-full md:w-[72px] h-10 md:h-full bg-[#2d2d2d] border-b md:border-b-0 md:border-r border-[#1a1a1a] flex flex-row md:flex-row md:flex-wrap md:content-start items-center p-1 gap-1 shrink-0 overflow-x-auto md:overflow-y-auto scrollbar-hide select-none transition-all duration-300">
      {tools.map((t) => (
        <button
          key={t.id}
          title={t.label + (shortcuts[t.id] ? ` (${shortcuts[t.id]})` : '')}
          onClick={() => handleToolClick(t.id)}
          className={twMerge(
            "p-1.5 h-8 w-8 md:h-[32px] md:w-[32px] rounded-sm flex items-center justify-center transition-all shrink-0",
            (tool === t.id || (t.id === 'eraser' && tool === 'pixel_eraser'))
              ? "bg-[#4c4cff] text-white" 
              : clsx("text-zinc-400", !isLowEndDevice && "hover:bg-zinc-700/50 hover:text-zinc-200")
          )}
        >
          {React.cloneElement(t.icon as React.ReactElement, { size: 20 })}
        </button>
      ))}
      
      <div className="flex-1 w-full hidden md:block" />
      
      <div className="w-full flex flex-col items-center gap-1">
        <button
          title={"Toggle Timeline" + (shortcuts.toggle_timeline ? ` (${shortcuts.toggle_timeline})` : '')}
          onClick={() => setAnimationEnabled(!animationEnabled)}
          className={twMerge(
            "p-1.5 w-full flex items-center justify-center transition-all shrink-0 border-t border-zinc-700 mt-1",
            animationEnabled 
              ? "text-indigo-400 bg-indigo-600/20" 
              : "text-zinc-400 hover:bg-zinc-700/50"
          )}
        >
          <Clock size={20} />
        </button>
        {/* Color indicator like CSP */}
        <div className="p-1 w-full flex justify-center items-center gap-1 border-t border-zinc-700 pt-3 shrink-0">
           <div 
             className="w-5 h-5 md:w-10 md:h-10 border border-white/20 shadow-inner rounded-sm"
             style={{ backgroundColor: color }}
           />
        </div>
      </div>
    </div>
  );
}
