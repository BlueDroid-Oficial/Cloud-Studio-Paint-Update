import React, { useState } from 'react';
import { useStore, getInterpolatedProperties } from '../store/useStore';
import { HexColorPicker } from 'react-colorful';
import { RulerPanel } from './RulerPanel';
import { Zap, RefreshCcw, ArrowRight, ArrowLeft, Trash, Copy, Shuffle, PlayCircle } from 'lucide-react';
import { Eye, Plus, Trash2, Scissors, Save, Sliders, Layers as LayersIcon, Download, FolderPlus, Folder, Edit2, Grid, Sparkles, Gamepad2, Check, Type, Upload, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { applyFilter } from '../lib/filters';
import { getTranslation } from '../lib/translations';

export function PropertiesPanel() {
  const { 
    tool,
    color, setColor, 
    brushSize, setBrushSize, 
    brushOpacity, setBrushOpacity,
    brushTexture, setBrushTexture,
    brushHardness, setBrushHardness,
    brushSpacing, setBrushSpacing,
    brushScatter, setBrushScatter,
    brushPresets, saveBrushPreset, applyBrushPreset, deleteBrushPreset,
    customBrushes, deleteCustomBrush,
    layers, activeLayerId, removeLayer, setActiveLayer, toggleLayerVisibility, toggleLayerClippingMask, toggleLayerAlphaLock,
    setLayerOpacity, updateLayerProperty, setLayerBlendMode, reorderLayers, renameLayer, setLayerFolder, toggleFolderCollapse,
    bezierPoints, setBezierPoints,
    shapeStyle, setShapeStyle,
    textContent, setTextContent,
    textFont, setTextFont,
    addLayer, addVectorLayer, addFolderLayer,
    fillTolerance, setFillTolerance,
    fillMode, setFillMode,
    starPoints, setStarPoints,
    stabilizer, setStabilizer,
    mergeDown, duplicateLayer,
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

    setShowProjectSettings,
    canvasBackgroundColor, setCanvasBackgroundColor,
    setShowFiltersDrawer,
    transformMode, setTransformMode,
    onionSkin, toggleOnionSkin,
    onionSkinBefore, setOnionSkinBefore,
    onionSkinAfter, setOnionSkinAfter,
    onionSkinOpacity, setOnionSkinOpacity,
    onionSkinPastColor, setOnionSkinPastColor,
    onionSkinFutureColor, setOnionSkinFutureColor,
    selectionType, setSelectionType,
    panelMargin, setPanelMargin,
    panelSpacing, setPanelSpacing,
    panelBorderWidth, setPanelBorderWidth,
    screentoneDotSize, setScreentoneDotSize,
    screentoneFrequency, setScreentoneFrequency,
    balloonText, setBalloonText,
    balloonStyle, setBalloonStyle,
    focusLinesCount, setFocusLinesCount,
    focusLinesInnerRadius, setFocusLinesInnerRadius,
    specialRulerType, setSpecialRulerType,
    specialRulerAngle, setSpecialRulerAngle,
    specialRulerSnapping, setSpecialRulerSnapping,
    pixelArtMode, setPixelArtMode,
    pixelPerfect, setPixelPerfect,
    pixelDithering, setPixelDithering,
    showGrid, setShowGrid,
    gridSize, setGridSize,
    language,
    currentFrame,
    keyframes,
  } = useStore();

  const t = (key: string) => getTranslation(key, language || "pt");

  const [newPresetName, setNewPresetName] = useState('');

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      saveBrushPreset(newPresetName.trim());
      setNewPresetName('');
    }
  };

  const activeLayer = layers.find(l => l.id === activeLayerId);

  const handleRename = (layerId: string, currentName: string) => {
    const newName = prompt("Renomear Camada / Pasta:", currentName);
    if (newName !== null && newName.trim() !== "") {
      renameLayer(layerId, newName.trim());
    }
  };

  const handleDrop = (e: React.DragEvent, targetLayer: any) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetLayer.id) return;

    const draggedIndex = layers.findIndex((l) => l.id === draggedId);
    const targetIndex = layers.findIndex((l) => l.id === targetLayer.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    if (targetLayer.type === "folder") {
      setLayerFolder(draggedId, targetLayer.id);
      reorderLayers(draggedIndex, targetIndex);
    } else if (targetLayer.folderId) {
      setLayerFolder(draggedId, targetLayer.folderId);
      reorderLayers(draggedIndex, targetIndex);
    } else {
      setLayerFolder(draggedId, null);
      reorderLayers(draggedIndex, targetIndex);
    }
  };

  return (
    <div data-tour="properties" className="w-full md:w-64 h-full bg-[#3a3a3a] border-t md:border-t-0 md:border-l border-[#1a1a1a] flex flex-col shrink-0 z-10 min-h-0 select-none font-sans overflow-hidden">
      
      {/* TOOL PROPERTIES PALETTE */}
      <div className="flex-1 flex flex-col min-h-0 border-b border-[#1a1a1a]">
        <div className="h-6 bg-[#2d2d2d] flex items-center px-2 text-[10px] text-zinc-400 font-bold border-b border-[#1a1a1a] uppercase text-center justify-between shrink-0">
          <span className="flex-1 text-center pl-4">Tool Property</span>
          <button 
            onClick={() => setShowProjectSettings(true)}
            className="text-zinc-500 hover:text-white"
            title="Project Settings"
          >
            <Sliders size={12} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-4">
          {/* Color Picker */}
          {!['eraser', 'pixel_eraser', 'move', 'select-rect'].includes(tool) && (
            <div>
              <HexColorPicker color={color} onChange={setColor} className="w-full !h-32 mb-2" />
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 border border-black/30 shadow-inner shrink-0" style={{ backgroundColor: color }} />
                <input 
                  type="text" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)}
                  className="bg-[#1a1a1a] text-zinc-300 text-[11px] px-1.5 h-6 rounded-sm flex-1 border border-zinc-700/50 focus:outline-none focus:border-[#4c4cff]"
                />
              </div>
            </div>
          )}

          {/* Grid Settings */}
          <div className="space-y-1.5 bg-[#2d2d2d] border border-zinc-800 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Grid size={14} className="text-zinc-400" />
                <span className="text-[11px] text-zinc-400 uppercase font-semibold">{t('grid')}</span>
              </div>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={twMerge(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border",
                  showGrid
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-[#1a1a1a] border-zinc-700 text-zinc-500 hover:text-zinc-300"
                )}
              >
                {showGrid ? "ON" : "OFF"}
              </button>
            </div>
            <input 
              type="range" min="1" max="100" value={gridSize} 
              onChange={(e) => setGridSize(parseInt(e.target.value))}
              className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
            />
            <div className="text-[9px] text-zinc-500 text-right">{gridSize}px</div>
          </div>

          {/* Pixel Art Mode Dashboard */}
          {pixelArtMode && (
            <div className="bg-[#2d2d2d] border border-zinc-800 rounded-lg p-3 space-y-3.5 relative overflow-hidden shadow-lg shadow-black/20">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 pl-1">
                  <Gamepad2 size={14} className="text-indigo-400 animate-bounce" />
                  <span className="text-[11px] font-black tracking-wider uppercase text-zinc-200">
                    {t("pixel_art_mode_active")}
                  </span>
                </div>
                <button
                  onClick={() => setPixelArtMode(false)}
                  className="text-[9px] text-zinc-500 hover:text-red-400 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {t("close")}
                </button>
              </div>
              
              {/* Settings list */}
              <div className="space-y-3 text-xs">
                {/* Pixel Perfect Option */}
                <div className="flex items-center justify-between bg-[#1e1e1e] p-2 rounded-md border border-zinc-800/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-zinc-300">Pixel Perfect</span>
                    <span className="text-[8px] text-zinc-500 font-medium">Previne pixels duplos</span>
                  </div>
                  <button
                    onClick={() => setPixelPerfect(!pixelPerfect)}
                    className={twMerge(
                      "w-8 h-4 rounded-full transition-all relative flex items-center p-0.5",
                      pixelPerfect ? "bg-indigo-600" : "bg-zinc-700"
                    )}
                  >
                    <div
                      className={twMerge(
                        "w-3 h-3 bg-white rounded-full shadow transition-all transform",
                        pixelPerfect ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Grid controls */}
                <div className="space-y-1 bg-[#1e1e1e] p-2 rounded-md border border-zinc-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-300">Resolução da Grade</span>
                    <span className="text-[9px] text-zinc-400 font-mono">{gridSize}x{gridSize}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 pt-1">
                    {[1, 8, 16, 32, 64].map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setGridSize(size);
                          setShowGrid(true);
                        }}
                        className={twMerge(
                          "py-1 rounded text-[9px] font-mono font-bold transition-all border",
                          gridSize === size && showGrid
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-zinc-800 border-zinc-700/50 text-zinc-400 hover:text-white"
                        )}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dithering Selector */}
                <div className="space-y-1 bg-[#1e1e1e] p-2 rounded-md border border-zinc-800/50">
                  <span className="text-[10px] font-bold text-zinc-300">Dithering (Sombreado)</span>
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[
                      { mode: "none", label: "None" },
                      { mode: "checkerboard", label: "50%" },
                      { mode: "halftone", label: "25%" },
                      { mode: "dots", label: "12%" }
                    ].map((item) => (
                      <button
                        key={item.mode}
                        onClick={() => setPixelDithering(item.mode)}
                        className={twMerge(
                          "py-1 rounded text-[8px] font-bold transition-all border uppercase",
                          pixelDithering === item.mode
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-zinc-800 border-zinc-700/50 text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extract Palette Button */}
                <button
                  onClick={() => {
                    const activeLayer = useStore.getState().layers.find(l => l.id === useStore.getState().activeLayerId);
                    if (activeLayer?.canvas) {
                      const ctx = activeLayer.canvas.getContext('2d');
                      if (ctx) {
                        try {
                          const imgData = ctx.getImageData(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
                          const colors = new Set<string>();
                          for (let i = 0; i < imgData.data.length; i += 4) {
                            const r = imgData.data[i];
                            const g = imgData.data[i + 1];
                            const b = imgData.data[i + 2];
                            const a = imgData.data[i + 3];
                            if (a > 50) { // skip fully transparent pixels
                              const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                              colors.add(hex);
                              if (colors.size >= 16) break; // Limit palette extraction to 16 principal colors
                            }
                          }
                          if (colors.size > 0) {
                            const colorsArr = Array.from(colors);
                            useStore.getState().setColor(colorsArr[0]);
                            useStore.getState().setNotification({
                              message: `Paleta de Cores Extraída: ${colorsArr.length} cores detectadas!`,
                              type: "success"
                            });
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }
                  }}
                  className="w-full py-1.5 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-800/40 text-indigo-300 font-bold rounded-md text-[9px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Sparkles size={10} className="animate-pulse" />
                  Extrair Paleta de Cores
                </button>
              </div>
            </div>
          )}

          {/* Contextual Settings */}
          <div className="space-y-4">
            {/* Transform Mode */}
            {tool === 'move' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400 uppercase font-semibold">Modo de Transformação</div>
                  <div className="flex bg-[#1a1a1a] rounded p-1 border border-zinc-700/50">
                    {(['normal', 'perspective', 'puppet'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setTransformMode(m)}
                        className={twMerge(
                          "flex-1 py-1.5 rounded text-[9px] font-bold uppercase transition-all",
                          transformMode === m ? "bg-indigo-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {m === 'normal' ? 'Livre' : m === 'perspective' ? 'Persp.' : 'Marion.'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400 uppercase font-semibold">Pivot Point (Centro)</div>
                  <div className="grid grid-cols-3 gap-1 bg-[#1a1a1a] p-1.5 rounded border border-zinc-700/50 w-fit mx-auto">
                    {(['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => useStore.getState().setTransformPivot(p as any)}
                        className={twMerge(
                          "w-6 h-6 rounded flex items-center justify-center transition-all",
                          useStore.getState().transformPivot === p || (p === 'center' && !useStore.getState().transformPivot) ? "bg-indigo-500 shadow-inner" : "bg-black/20 hover:bg-black/40"
                        )}
                        title={p}
                      >
                        <div className={twMerge("w-2 h-2 rounded-full", useStore.getState().transformPivot === p || (p === 'center' && !useStore.getState().transformPivot) ? "bg-white" : "bg-zinc-600")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="space-y-3 pt-1">
                    {transformMode === 'normal' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 font-bold uppercase">Escala X</label>
                          <input type="number" step="0.1" className="w-full bg-zinc-800 border border-black/20 rounded px-1.5 py-1 text-xs text-zinc-300" defaultValue={1} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] text-zinc-500 font-bold uppercase">Escala Y</label>
                          <input type="number" step="0.1" className="w-full bg-zinc-800 border border-black/20 rounded px-1.5 py-1 text-xs text-zinc-300" defaultValue={1} />
                        </div>
                      </div>
                    )}
                    
                    {transformMode === 'perspective' && (
                      <div className="p-2.5 bg-indigo-900/20 border border-indigo-500/20 rounded-lg">
                        <p className="text-[9px] text-indigo-300 leading-relaxed font-medium text-center">Arraste os cantos da camada para ajustar a perspectiva.</p>
                      </div>
                    )}

                    {transformMode === 'puppet' && (
                      <div className="space-y-2">
                        <button className="w-full py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-[9px] font-bold uppercase transition-colors">Adicionar Pino</button>
                        <p className="text-[8px] text-zinc-500 text-center italic">Aperte na camada para distorcer a malha.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tool === 'ruler' && (
              <RulerPanel />
            )}
            {/* Eraser Type */}
            {['eraser', 'pixel_eraser'].includes(tool) && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">Tipo de Borracha</div>
                <div className="flex bg-[#1a1a1a] rounded p-1 border border-zinc-700/50">
                  <button 
                    onClick={() => useStore.getState().setTool('eraser')}
                    className={twMerge("flex-1 text-[10px] font-bold py-1 rounded transition-colors", tool === 'eraser' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    Suave / Normal
                  </button>
                  <button 
                    onClick={() => useStore.getState().setTool('pixel_eraser')}
                    className={twMerge("flex-1 text-[10px] font-bold py-1 rounded transition-colors", tool === 'pixel_eraser' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    Pixel Art
                  </button>
                </div>
              </div>
            )}

            {/* Brush / Eraser size */}
            {['brush', 'eraser', 'pixel_eraser', 'line', 'rect', 'circle', 'star', 'bezier', 'blur', 'smudge'].includes(tool) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                  <span>{t('brush_size')}</span>
                  <span className="text-zinc-300">{brushSize}px</span>
                </div>
                <input 
                  type="range" min="1" max="200" value={brushSize} 
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                />
              </div>
            )}

            {/* Opacity */}
            {['brush', 'bezier', 'eraser', 'pixel_eraser'].includes(tool) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                  <span>{t('opacity')}</span>
                  <span className="text-zinc-300">{brushOpacity}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={brushOpacity} 
                  onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                />
              </div>
            )}

            {/* Hardness */}
            {['brush', 'eraser'].includes(tool) && brushTexture === 'solid' && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                  <span>Dureza</span>
                  <span className="text-zinc-300">{brushHardness}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={brushHardness} 
                  onChange={(e) => setBrushHardness(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                />
              </div>
            )}

            {/* Spacing */}
            {['brush', 'eraser'].includes(tool) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                  <span>Espaçamento</span>
                  <span className="text-zinc-300">{brushSpacing}%</span>
                </div>
                <input 
                  type="range" min="1" max="500" value={brushSpacing} 
                  onChange={(e) => setBrushSpacing(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                />
              </div>
            )}

            {/* Scatter */}
            {['brush', 'eraser'].includes(tool) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                  <span>Dispersão</span>
                  <span className="text-zinc-300">{brushScatter}%</span>
                </div>
                <input 
                  type="range" min="0" max="500" value={brushScatter} 
                  onChange={(e) => setBrushScatter(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                />
              </div>
            )}

            {/* Stabilizer */}
            {['brush', 'eraser', 'pixel_eraser'].includes(tool) && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                  <span>{t('stabilizer')}</span>
                  <span className="text-zinc-300">{stabilizer}</span>
                </div>
                <input 
                  type="range" min="0" max="100" value={stabilizer} 
                  onChange={(e) => setStabilizer(parseInt(e.target.value))}
                  className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                />
              </div>
            )}

            {/* Mirror Mode */}
            {['brush', 'eraser', 'pixel_eraser', 'pixel'].includes(tool) && (
              <div className="space-y-1.5 flex items-center justify-between">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">
                  {t('mirror_mode')}
                </div>
                <button
                  onClick={() => useStore.getState().setMirrorMode(!useStore.getState().mirrorMode)}
                  className={twMerge(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase transition-all border",
                    useStore.getState().mirrorMode 
                      ? "bg-purple-600 border-purple-500 text-white" 
                      : "bg-[#1a1a1a] border-zinc-700 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {useStore.getState().mirrorMode ? "ON" : "OFF"}
                </button>
              </div>
            )}

            {/* Brush Texture */}
            {['brush', 'eraser', 'pixel', 'pixel_eraser'].includes(tool) && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-zinc-500 uppercase font-bold">{t('brush_texture')}</div>
                <select 
                  value={brushTexture}
                  onChange={(e) => setBrushTexture(e.target.value as any)}
                  className="w-full bg-[#1a1a1a] text-zinc-300 text-[11px] h-7 px-1.5 rounded border border-zinc-700/50"
                >
                  <optgroup label={t('standard_textures')}>
                    <option value="solid">Solid</option>
                    {['brush', 'eraser'].includes(tool) && (
                      <>
                        <option value="pencil">Pencil</option>
                        <option value="charcoal">Charcoal</option>
                        <option value="spray">Spray</option>
                        <option value="watercolor">Watercolor</option>
                        <option value="oil">Oil Paint</option>
                        <option value="ink">Ink Pen</option>
                        <option value="crayon">Crayon</option>
                        <option value="gouache">Gouache</option>
                        <option value="chalk">Chalk</option>
                        <option value="pastel">Pastel</option>
                        <option value="marker">Marker</option>
                        <option value="sponge">Sponge</option>
                        <option value="airbrush">Airbrush</option>
                        <option value="dry-brush">Dry Brush</option>
                      </>
                    )}
                    {['pixel', 'pixel_eraser'].includes(tool) && (
                      <>
                        <option value="dither-50">Dither (50%)</option>
                        <option value="dither-25">Dither (25%)</option>
                        <option value="dither-75">Dither (75%)</option>
                        <option value="horizontal">Horizontal Lines</option>
                        <option value="vertical">Vertical Lines</option>
                        <option value="crosshatch">Crosshatch</option>
                      </>
                    )}
                  </optgroup>
                  {customBrushes.length > 0 && (
                    <optgroup label={t('custom_brushes')}>
                      {customBrushes.map((brush) => (
                        <option key={brush.id} value={`custom-${brush.id}`}>
                          🎨 {brush.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* Bezier Tools */}
            {tool === 'bezier' && (
              <div className="pt-2 flex flex-col gap-1.5">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('bezier-stroke'))}
                  disabled={bezierPoints.length < 2}
                  className="h-7 bg-[#4c4cff] hover:bg-[#3b3bff] disabled:opacity-30 text-white text-[11px] font-bold rounded flex items-center justify-center"
                >
                  {t('stroke_path')}
                </button>
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('bezier-fill'))}
                  disabled={bezierPoints.length < 3}
                  className="h-7 bg-[#2d2d2d] hover:bg-[#444] disabled:opacity-30 text-zinc-300 text-[11px] border border-[#1a1a1a] rounded flex items-center justify-center font-bold"
                >
                  {t('fill_path')}
                </button>
                <button 
                  onClick={() => setBezierPoints([])}
                  disabled={bezierPoints.length === 0}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 mt-1 transition-colors self-center"
                >
                  {t('clear_points')}
                </button>
              </div>
            )}

            {/* Fill Tolerance and Mode */}
            {tool === 'fill' && (
              <>
                <div className="space-y-1.5">
                  <div className="text-[11px] text-zinc-400 uppercase font-semibold">Modo de Preenchimento</div>
                  <div className="flex bg-[#1a1a1a] rounded p-1 border border-zinc-700/50">
                    <button 
                      onClick={() => setFillMode('normal')}
                      className={twMerge("flex-1 text-[10px] font-bold py-1 rounded transition-colors", fillMode === 'normal' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                      Padrão
                    </button>
                    <button 
                      onClick={() => setFillMode('erase')}
                      className={twMerge("flex-1 text-[10px] font-bold py-1 rounded transition-colors", fillMode === 'erase' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                      Apagar
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                    <span>{t('tolerance')}</span>
                    <span className="text-zinc-300">{fillTolerance}</span>
                  </div>
                  <input 
                    type="range" min="0" max="255" value={fillTolerance} 
                    onChange={(e) => setFillTolerance(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>
              </>
            )}

            {/* Shape Toggles */}
            {['rect', 'circle', 'star'].includes(tool) && (
              <div className="space-y-3">
                {tool === 'star' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-zinc-400 uppercase font-semibold">
                      <span>{t('points_label')}</span>
                      <input 
                        type="number" min="3" max="20" value={starPoints} 
                        onChange={(e) => setStarPoints(parseInt(e.target.value) || 3)}
                        className="w-12 bg-[#1a1a1a] text-zinc-300 text-[11px] px-1 rounded border border-zinc-700/50"
                      />
                    </div>
                    <input 
                      type="range" min="3" max="20" value={starPoints} 
                      onChange={(e) => setStarPoints(parseInt(e.target.value))}
                      className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                    />
                  </div>
                )}
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => setShapeStyle('stroke')}
                    className={twMerge("flex-1 h-6 text-[10px] uppercase font-bold rounded border transition-colors", shapeStyle === 'stroke' ? 'bg-[#4c4cff] border-[#4c4cff] text-white' : 'bg-[#1a1a1a] border-[#1a1a1a] text-zinc-500')}
                  >
                    {t('stroke')}
                  </button>
                  <button 
                    onClick={() => setShapeStyle('fill')}
                    className={twMerge("flex-1 h-6 text-[10px] uppercase font-bold rounded border transition-colors", shapeStyle === 'fill' ? 'bg-[#4c4cff] border-[#4c4cff] text-white' : 'bg-[#1a1a1a] border-[#1a1a1a] text-zinc-500')}
                  >
                    {t('fill')}
                  </button>
                </div>
              </div>
            )}

            {/* Text Properties */}
            {tool === 'text' && (
              <div className="space-y-3">
                 <input 
                  type="text" 
                  placeholder={t('text_placeholder')}
                  value={textContent} 
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full bg-[#1a1a1a] text-zinc-300 text-[11px] h-8 px-2 rounded border border-zinc-700/50 focus:outline-none focus:border-[#4c4cff]"
                />
                <div className="space-y-1.5">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">{t('font_family')}</div>
                  <select 
                    value={textFont}
                    onChange={(e) => setTextFont(e.target.value)}
                    className="w-full bg-[#1a1a1a] text-zinc-300 text-[11px] h-7 px-1.5 rounded border border-zinc-700/50"
                  >
                    <option value="sans-serif">Sans Serif</option>
                    <option value="serif">Serif</option>
                    <option value="monospace">Monospace</option>
                    <option value="cursive">Cursive</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <button 
                      onClick={() => {
                        const font = prompt('Digite o exato nome da fonte instalada no seu sistema (ex: "Arial", "Verdana", "Comic Sans MS"):');
                        if (font) setTextFont(font);
                      }}
                      className="w-full text-[10px] font-bold py-1.5 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 rounded transition-colors flex items-center justify-center gap-1.5 border border-zinc-600/30"
                    >
                      <Type size={12} />
                      Personalizar Fonte (Nome)
                    </button>
                    <button 
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.ttf,.otf,.woff,.woff2';
                        input.onchange = async (e: any) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fontName = file.name.split('.')[0].replace(/\s+/g, '-');
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const arrayBuffer = ev.target?.result as ArrayBuffer;
                            const fontFace = new FontFace(fontName, arrayBuffer);
                            try {
                              const loadedFace = await fontFace.load();
                              document.fonts.add(loadedFace);
                              setTextFont(fontName);
                              alert(`Fonte "${fontName}" carregada com sucesso!`);
                            } catch (err) {
                              console.error("Failed to load font:", err);
                              alert("Erro ao carregar o arquivo de fonte.");
                            }
                          };
                          reader.readAsArrayBuffer(file);
                        };
                        input.click();
                      }}
                      className="w-full text-[10px] font-bold py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <Upload size={12} />
                      Carregar Arquivo (.ttf/.otf)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Selection Type (Laço livre vs Retângulo) */}
            {tool === 'select-rect' && (
              <div className="space-y-2">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">Tipo de Seleção</div>
                <div className="flex bg-[#1a1a1a] rounded p-1 border border-zinc-700/50">
                  <button 
                    onClick={() => setSelectionType('rect')}
                    className={twMerge("flex-1 text-[10px] font-bold py-1 rounded transition-colors", selectionType === 'rect' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    Retângulo
                  </button>
                  <button 
                    onClick={() => setSelectionType('lasso')}
                    className={twMerge("flex-1 text-[10px] font-bold py-1 rounded transition-colors", selectionType === 'lasso' ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  >
                    Laço (Livre)
                  </button>
                </div>
              </div>
            )}

            {/* Panel Ruler */}
            {tool === 'panel_ruler' && (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">Criador de Quadros (Manga)</div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Margem Externa</span>
                    <span className="text-zinc-300">{panelMargin}px</span>
                  </div>
                  <input 
                    type="range" min="10" max="150" value={panelMargin} 
                    onChange={(e) => setPanelMargin(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Espaçamento</span>
                    <span className="text-zinc-300">{panelSpacing}px</span>
                  </div>
                  <input 
                    type="range" min="2" max="60" value={panelSpacing} 
                    onChange={(e) => setPanelSpacing(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Espessura da Borda</span>
                    <span className="text-zinc-300">{panelBorderWidth}px</span>
                  </div>
                  <input 
                    type="range" min="1" max="15" value={panelBorderWidth} 
                    onChange={(e) => setPanelBorderWidth(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('generate-manga-panels', { detail: { type: '4-grid' } }))}
                    className="h-7 bg-[#4c4cff] hover:bg-[#3b3bff] text-white text-[11px] font-bold rounded flex items-center justify-center transition-colors"
                  >
                    Grade 2x2 (4 Quadros)
                  </button>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('generate-manga-panels', { detail: { type: 'yonkoma' } }))}
                    className="h-7 bg-[#2d2d2d] hover:bg-[#444] border border-[#1a1a1a] text-zinc-300 text-[11px] font-bold rounded flex items-center justify-center transition-colors"
                  >
                    Yonkoma (4 Verticais)
                  </button>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('generate-manga-panels', { detail: { type: '3-horizontal' } }))}
                    className="h-7 bg-[#2d2d2d] hover:bg-[#444] border border-[#1a1a1a] text-zinc-300 text-[11px] font-bold rounded flex items-center justify-center transition-colors"
                  >
                    3 Painéis Horizontais
                  </button>
                </div>
              </div>
            )}

            {/* Screentone properties */}
            {tool === 'screentone' && (
              <div className="space-y-3">
                <div className="text-[11px] text-[#4c4cff] uppercase font-bold">Retículas de Manga</div>
                <p className="text-[10px] text-zinc-400 leading-normal">Pinte na tela para aplicar retícula pontilhada clássica com a cor selecionada.</p>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Tamanho dos Pontos</span>
                    <span className="text-zinc-300">{screentoneDotSize}px</span>
                  </div>
                  <input 
                    type="range" min="1" max="10" value={screentoneDotSize} 
                    onChange={(e) => setScreentoneDotSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Espaçamento (Frequência)</span>
                    <span className="text-zinc-300">{screentoneFrequency}px</span>
                  </div>
                  <input 
                    type="range" min="4" max="30" value={screentoneFrequency} 
                    onChange={(e) => setScreentoneFrequency(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>
              </div>
            )}

            {/* Speech Balloons */}
            {tool === 'speech_balloon' && (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">Balões de Fala</div>
                
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase">Texto do Balão</label>
                  <textarea 
                    value={balloonText} 
                    onChange={(e) => setBalloonText(e.target.value)}
                    className="w-full h-16 bg-[#1a1a1a] text-zinc-200 text-xs p-1.5 rounded border border-zinc-700/50 focus:outline-none focus:border-[#4c4cff] resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase">Estilo do Balão</label>
                  <select 
                    value={balloonStyle}
                    onChange={(e) => setBalloonStyle(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] text-zinc-300 text-[11px] h-7 px-1.5 rounded border border-zinc-700/50 focus:outline-none"
                  >
                    <option value="oval">Oval / Clássico</option>
                    <option value="thought">Nuvem / Pensamento</option>
                    <option value="shout">Explosão / Grito</option>
                  </select>
                </div>

                <div className="p-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded text-center">
                  <p className="text-[10px] text-indigo-300 font-medium mb-1.5">Clique na tela para posicionar o balão</p>
                  <span className="text-[8px] text-zinc-500">O balão será desenhado com o tamanho do pincel no ponto de clique.</span>
                </div>
              </div>
            )}

            {/* Focus Lines */}
            {tool === 'focus_lines' && (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">Linhas de Foco / Ação</div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Quantidade de Linhas</span>
                    <span className="text-zinc-300">{focusLinesCount}</span>
                  </div>
                  <input 
                    type="range" min="20" max="250" value={focusLinesCount} 
                    onChange={(e) => setFocusLinesCount(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                    <span>Raio Central Livre</span>
                    <span className="text-zinc-300">{focusLinesInnerRadius}px</span>
                  </div>
                  <input 
                    type="range" min="10" max="300" value={focusLinesInnerRadius} 
                    onChange={(e) => setFocusLinesInnerRadius(parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                  />
                </div>

                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('generate-focus-lines'))}
                  className="w-full h-8 bg-[#4c4cff] hover:bg-[#3b3bff] text-white text-[11px] font-bold rounded flex items-center justify-center transition-colors"
                >
                  Gerar Linhas de Foco
                </button>
              </div>
            )}

            {/* Special Rulers */}
            {tool === 'special_ruler' && (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">Réguas Guia Especiais</div>
                
                <div className="space-y-1.5 flex items-center justify-between bg-zinc-800/40 p-1.5 rounded">
                  <span className="text-[10px] text-zinc-300 font-semibold">Ativar Atração (Snap)</span>
                  <button
                    onClick={() => setSpecialRulerSnapping(!specialRulerSnapping)}
                    className={twMerge(
                      "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all",
                      specialRulerSnapping 
                        ? "bg-indigo-600 text-white" 
                        : "bg-zinc-700 text-zinc-400"
                    )}
                  >
                    {specialRulerSnapping ? "Ativo" : "Inativo"}
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-500 font-bold uppercase">Tipo de Régua</label>
                  <select 
                    value={specialRulerType}
                    onChange={(e) => setSpecialRulerType(e.target.value as any)}
                    className="w-full bg-[#1a1a1a] text-zinc-300 text-[11px] h-7 px-1.5 rounded border border-zinc-700/50 focus:outline-none"
                  >
                    <option value="perspective">Perspectiva (Ponto de Fuga)</option>
                    <option value="parallel">Linhas Paralelas</option>
                    <option value="radial">Radial (Círculos Concentricos)</option>
                  </select>
                </div>

                {specialRulerType === 'parallel' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400 font-medium">
                      <span>Ângulo da Régua</span>
                      <span className="text-zinc-300">{specialRulerAngle}°</span>
                    </div>
                    <input 
                      type="range" min="0" max="360" value={specialRulerAngle} 
                      onChange={(e) => setSpecialRulerAngle(parseInt(e.target.value))}
                      className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                    />
                  </div>
                )}

                <div className="p-2.5 bg-zinc-800/40 border border-zinc-700/50 rounded text-center">
                  <p className="text-[9px] text-zinc-400 leading-relaxed font-medium">
                    {specialRulerType === 'perspective' && "Toque na tela para posicionar o Ponto de Fuga. O pincel será atraído para este ponto."}
                    {specialRulerType === 'parallel' && "As pinceladas do pincel comum serão perfeitamente alinhadas ao ângulo definido."}
                    {specialRulerType === 'radial' && "Clique para definir o centro. Suas pinceladas farão círculos perfeitos ao redor."}
                  </p>
                </div>
              </div>
            )}

            {/* Material Library */}
            {tool === 'material_library' && (
              <div className="space-y-3">
                <div className="text-[11px] text-zinc-400 uppercase font-semibold">Biblioteca de Materiais</div>
                <p className="text-[10px] text-zinc-400 leading-normal">Selecione um recurso para inseri-lo instantaneamente como uma nova camada.</p>
                
                <div className="grid grid-cols-2 gap-2 h-64 overflow-y-auto pr-1">
                  {[
                    { name: "Speedlines", type: "effect_speedlines", label: "Speedlines" },
                    { name: "Explosão", type: "effect_explosion", label: "Explosão" },
                    { name: "Sombra Retícula", type: "effect_screentone_grad", label: "Degradê Retícula" },
                    { name: "Sparkles", type: "effect_sparkles", label: "Brilhos" },
                    { name: "Flor de Cerejeira", type: "effect_sakura", label: "Cerejeiras" },
                    { name: "Textura de Tijolos", type: "texture_brick", label: "Tijolos" },
                  ].map((mat) => (
                    <button
                      key={mat.type}
                      onClick={() => window.dispatchEvent(new CustomEvent('insert-manga-material', { detail: { type: mat.type } }))}
                      className="flex flex-col items-center justify-center p-2 rounded bg-zinc-800 border border-zinc-700/40 hover:border-indigo-500 hover:bg-zinc-750 transition-all text-center group"
                    >
                      <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-700 mb-1 flex items-center justify-center font-bold text-[10px] text-zinc-400 group-hover:text-white">
                        {mat.name[0]}
                      </div>
                      <span className="text-[9px] font-semibold text-zinc-400 group-hover:text-zinc-200 truncate w-full">{mat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Canvas Background Settings */}
            <div className="pt-4 border-t border-zinc-700/40">
              <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Canvas Background</div>
              <div className="flex gap-2">
                <button 
                  className={twMerge("flex-1 text-[10px] py-1 rounded border", canvasBackgroundColor === 'transparent' ? 'bg-[#4c4cff] border-[#4c4cff] text-white' : 'bg-[#1a1a1a] border-zinc-700 text-zinc-500')} 
                  onClick={() => setCanvasBackgroundColor('transparent')}
                >Transparent</button>
                <button 
                  className={twMerge("flex-1 text-[10px] py-1 rounded border", canvasBackgroundColor === '#ffffff' ? 'bg-[#4c4cff] border-[#4c4cff] text-white' : 'bg-[#1a1a1a] border-zinc-700 text-zinc-500')} 
                  onClick={() => setCanvasBackgroundColor('#ffffff')}
                >White</button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input type="color" value={canvasBackgroundColor === 'transparent' ? '#ffffff' : canvasBackgroundColor} onChange={e => setCanvasBackgroundColor(e.target.value)} className="w-6 h-6 cursor-pointer bg-transparent border-0" />
                <span className="text-[10px] text-zinc-400">Custom Color</span>
              </div>
            </div>

            {/* Canvas View Settings */}
            <div className="pt-4 border-t border-zinc-700/40">
              <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Visualização da Tela</div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <label className="text-[10px] text-zinc-400">Rotação</label>
                    <span className="text-[10px] text-zinc-500 font-mono">{Math.round(useStore.getState().rotation || 0)}°</span>
                  </div>
                  <input 
                    type="range" 
                    min="-180" 
                    max="180" 
                    step="1"
                    value={useStore.getState().rotation || 0}
                    onChange={(e) => useStore.getState().setRotation(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-[#4c4cff]"
                  />
                  <div className="flex gap-2 mt-1">
                    <button 
                      onClick={() => useStore.getState().setRotation(0)}
                      className="flex-1 text-[9px] py-1 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
                    >
                      Resetar
                    </button>
                    <button 
                      onClick={() => useStore.getState().setRotation((useStore.getState().rotation || 0) + 90)}
                      className="flex-1 text-[9px] py-1 bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
                    >
                      +90°
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Onion Skin Properties */}
            <div className="pt-4 border-t border-zinc-700/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Papel Vegetal (Onion Skin)</span>
                <button
                  onClick={toggleOnionSkin}
                  className={twMerge(
                    "text-[9px] px-2 py-0.5 rounded font-bold transition-all",
                    onionSkin ? "bg-indigo-600 text-white" : "bg-[#1a1a1a] text-zinc-400"
                  )}
                >
                  {onionSkin ? "ATIVADO" : "DESATIVADO"}
                </button>
              </div>

              {onionSkin && (
                <div className="space-y-3 pt-1">
                  {/* Before / After Frame Counts */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400">Anteriores</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={onionSkinBefore}
                        onChange={(e) => setOnionSkinBefore(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                        className="w-full bg-[#1a1a1a] text-zinc-300 text-xs px-1.5 py-0.5 rounded border border-zinc-700/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400">Posteriores</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={onionSkinAfter}
                        onChange={(e) => setOnionSkinAfter(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                        className="w-full bg-[#1a1a1a] text-zinc-300 text-xs px-1.5 py-0.5 rounded border border-zinc-700/50"
                      />
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-zinc-400">
                      <span>Opacidade</span>
                      <span>{Math.round(onionSkinOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={onionSkinOpacity}
                      onChange={(e) => setOnionSkinOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-black/20 appearance-none rounded-full accent-[#4c4cff]"
                    />
                  </div>

                  {/* Colors for Past / Future */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 block">Cor Anterior</label>
                      <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded border border-zinc-700/50">
                        <input
                          type="color"
                          value={onionSkinPastColor}
                          onChange={(e) => setOnionSkinPastColor(e.target.value)}
                          className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-[9px] text-zinc-400 font-mono">{onionSkinPastColor}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 block">Cor Posterior</label>
                      <div className="flex items-center gap-1 bg-[#1a1a1a] p-1 rounded border border-zinc-700/50">
                        <input
                          type="color"
                          value={onionSkinFutureColor}
                          onChange={(e) => setOnionSkinFutureColor(e.target.value)}
                          className="w-5 h-5 cursor-pointer bg-transparent border-0 p-0"
                        />
                        <span className="text-[9px] text-zinc-400 font-mono">{onionSkinFutureColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Properties */}
            <div className="pt-4 border-t border-zinc-700/40">
               <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2">Filters</div>
               <button 
                className="w-full text-left text-[11px] py-2 px-3 bg-[#1a1a1a] rounded text-zinc-300 hover:bg-zinc-700 flex items-center justify-between"
                onClick={() => useStore.getState().toggleFilters()}
               >
                 <span>Open Filter Menu</span>
                 <Sliders size={12} />
               </button>
            </div>
            
            {/* Presets for Brush */}
            {tool === 'brush' && (
              <div className="pt-2 border-t border-zinc-700/40">
                <div className="flex justify-between items-center mb-1.5">
                   <div className="text-[10px] text-zinc-500 uppercase font-bold">Presets</div>
                   <button 
                      onClick={handleSavePreset} 
                      disabled={!newPresetName.trim()}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-30"
                   >Save Current</button>
                </div>
                <input 
                    type="text" 
                    placeholder="New preset name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="w-full bg-[#1a1a1a]/50 text-zinc-400 text-[10px] h-6 px-1.5 rounded mb-2 border border-transparent focus:border-zinc-700 focus:outline-none"
                  />
                <div className="space-y-0.5 max-h-24 overflow-y-auto scrollbar-hide">
                   {brushPresets.map(preset => (
                     <div key={preset.id} className="flex items-center justify-between group h-6 px-1.5 bg-[#444]/30 hover:bg-[#444] cursor-default" onClick={() => applyBrushPreset(preset.id)}>
                        <span className="text-[10px] text-zinc-300 truncate">{preset.name}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteBrushPreset(preset.id); }} className="opacity-0 group-hover:opacity-100 text-red-400">
                          <Trash2 size={10} />
                        </button>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LAYER PALETTE */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#3a3a3a]">
        <div className="h-6 bg-[#2d2d2d] flex items-center px-2 text-[10px] text-zinc-400 font-bold border-b border-[#1a1a1a] uppercase text-center justify-center shrink-0">
          Layer
        </div>
        
        <div className="flex items-center justify-between p-1 px-2 border-b border-[#1a1a1a] bg-[#444] shrink-0">
          <div className="flex items-center gap-1">
             <button onClick={addLayer} className="p-1 text-zinc-200 hover:bg-zinc-600 rounded transition-colors" title="New Raster Layer"><Plus size={14} /></button>
             <button onClick={addVectorLayer} className="p-1 text-zinc-200 hover:bg-zinc-600 rounded transition-colors" title="New Vector Layer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 22 22 22"/></svg></button>
             <button onClick={addFolderLayer} className="p-1 text-zinc-200 hover:bg-zinc-600 rounded transition-colors" title="New Folder Layer"><FolderPlus size={14} /></button>
             <div className="w-[1px] h-3 bg-zinc-600 mx-0.5" />
             <button onClick={() => activeLayerId && duplicateLayer(activeLayerId)} className="p-1 text-zinc-200 hover:bg-zinc-600 rounded transition-colors" title="Duplicate Layer"><LayersIcon size={14} /></button>
             <button onClick={() => activeLayerId && mergeDown(activeLayerId)} className="p-1 text-zinc-200 hover:bg-zinc-600 rounded transition-colors" title="Merge Down"><Download size={14} /></button>
          </div>
          {activeLayerId && (
            <button onClick={() => removeLayer(activeLayerId)} className="p-1 text-zinc-400 hover:text-red-400" title="Delete Layer"><Trash2 size={14}/></button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
           {layers
              .filter(layer => {
                if (layer.folderId) {
                  const parent = layers.find(l => l.id === layer.folderId);
                  if (parent && parent.collapsed) return false;
                }
                return true;
              })
              .map(layer => (
             <div 
               key={layer.id} 
               onClick={(e) => {
                 setActiveLayer(layer.id);
                 if (layer.type === 'folder' && e.detail === 1) {
                    toggleFolderCollapse(layer.id);
                 }
               }}
                onDoubleClick={(e) => { e.stopPropagation(); handleRename(layer.id, layer.name); }}
                draggable={true}
                onDragStart={(e) => { e.dataTransfer.setData("text/plain", layer.id); }}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => handleDrop(e, layer)}
               className={twMerge(
                 "flex flex-col border-b border-[#1a1a1a] cursor-default min-h-[40px] relative group select-none",
                 activeLayerId === layer.id ? "bg-[#4c4cff] text-white" : "bg-[#3a3a3a] text-zinc-300 hover:bg-zinc-600/30",
                 layer.clippingMask && "pl-1.5",
                 layer.type === 'folder' && "bg-zinc-800/20",
                  layer.folderId && "pl-6"
               )}
             >
                {/* Folder child visual indicator */}
                 {layer.folderId && (
                   <div className="absolute left-3 top-0 bottom-0 w-[1.5px] bg-amber-500/30" />
                 )}

                 {/* Clipping indicator (CSP Style Red Bar) */}
                {layer.clippingMask && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-red-500 shadow-[0_0_3px_rgba(239,68,68,0.5)]" />
                )}

                <div className="flex items-center h-10 px-2 gap-2">
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                     className={clsx("w-4 flex justify-center", activeLayerId === layer.id ? "text-white" : "text-zinc-500")}
                   >
                     {layer.visible ? <Eye size={12} /> : <div className="w-0.5 h-3 bg-red-400 rounded-full" />}
                   </button>

                   <div className="w-8 h-8 bg-white/10 border border-black/20 flex items-center justify-center shrink-0 overflow-hidden relative">
                      {layer.type === 'vector' ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 22 22 22"/></svg> : layer.type === 'folder' ? <Folder size={12} className="text-amber-400" /> : <div className="w-full h-full bg-zinc-700/20" />}
                      {layer.type === 'folder' && (
                        <div className="absolute bottom-0 right-0 bg-black/50 rounded-tl">
                          {layer.collapsed ? <ChevronRight size={10} className="text-white"/> : <ChevronDown size={10} className="text-white"/>}
                        </div>
                      )}
                   </div>

                   <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="text-[11px] truncate flex items-center gap-1 leading-tight">
                        {layer.clippingMask && <Scissors size={9} />}
                        {layer.name}
                      </div>
                      <div className="text-[8px] opacity-70 uppercase tracking-tighter">
                        {layer.blendMode === 'source-over' ? 'Normal' : layer.blendMode} {layer.opacity}%
                      </div>
                   </div>

                   <button
                     onClick={(e) => { e.stopPropagation(); handleRename(layer.id, layer.name); }}
                     className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded text-zinc-300 transition-all shrink-0"
                     title="Renomear"
                   >
                     <Edit2 size={10} />
                   </button>
                </div>

                {activeLayerId === layer.id && (() => {
                  const interp = getInterpolatedProperties(layer, keyframes, currentFrame);
                  const hasKeyframe = keyframes.some(k => k.layerId === layer.id);
                  return (
                    <div className="bg-[#2d2d2d] p-2 space-y-2 border-t border-[#1a1a1a] text-zinc-400" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] w-8">Mode</span>
                        <select 
                          value={layer.blendMode}
                          onChange={(e) => setLayerBlendMode(layer.id, e.target.value as GlobalCompositeOperation)}
                          className="flex-1 bg-[#1a1a1a] text-zinc-300 text-[10px] h-5 rounded px-1 focus:outline-none"
                        >
                          <option value="source-over">Normal</option>
                          <option value="multiply">Multiply</option>
                          <option value="screen">Screen</option>
                          <option value="overlay">Overlay</option>
                          <option value="darken">Darken</option>
                          <option value="lighten">Lighten</option>
                          <option value="color-dodge">Color Dodge</option>
                          <option value="color-burn">Color Burn</option>
                          <option value="hard-light">Hard Light</option>
                          <option value="soft-light">Soft Light</option>
                          <option value="difference">Difference</option>
                          <option value="exclusion">Exclusion</option>
                          <option value="hue">Hue</option>
                          <option value="saturation">Saturation</option>
                          <option value="color">Color</option>
                          <option value="luminosity">Luminosity</option>
                          <option value="pass-through">Pass Through</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] w-8 text-right pr-1">{interp.opacity}%</span>
                        <input 
                          type="range" min="0" max="100" value={interp.opacity} 
                          onChange={(e) => setLayerOpacity(layer.id, parseInt(e.target.value))}
                          className="flex-1 h-1 accent-[#4c4cff]"
                          title="Opacity"
                        />
                        <button 
                          onClick={() => toggleLayerClippingMask(layer.id)}
                          className={twMerge("text-[9px] px-1 hover:brightness-125 border rounded", layer.clippingMask ? "bg-[#4c4cff] border-[#4c4cff] text-white" : "bg-[#1a1a1a] border-zinc-700 text-zinc-500")}
                        >
                          Clip
                        </button>
                        <button 
                          onClick={() => toggleLayerAlphaLock(layer.id)}
                          className={twMerge("text-[9px] px-1 hover:brightness-125 border rounded", layer.alphaLock ? "bg-amber-600 border-amber-500 text-white" : "bg-[#1a1a1a] border-zinc-700 text-zinc-500")}
                          title="Bloquear Transparência (Alpha Lock)"
                        >
                          {layer.alphaLock ? "🔒 Alpha" : "🔓 Alpha"}
                        </button>
                      </div>

                      {hasKeyframe && (
                        <>
                          {/* Position X Slider */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] w-8 text-right pr-1">X: {interp.x}px</span>
                            <input 
                              type="range" min="-1000" max="1000" value={interp.x} 
                              onChange={(e) => updateLayerProperty(layer.id, "x", parseInt(e.target.value))}
                              className="flex-1 h-1 accent-emerald-500"
                            />
                            <button 
                              onClick={() => updateLayerProperty(layer.id, "x", 0)}
                              className="text-[9px] px-1 bg-[#1a1a1a] border border-zinc-700 rounded text-zinc-400 hover:text-white"
                            >
                              Reset
                            </button>
                          </div>

                          {/* Position Y Slider */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] w-8 text-right pr-1">Y: {interp.y}px</span>
                            <input 
                              type="range" min="-1000" max="1000" value={interp.y} 
                              onChange={(e) => updateLayerProperty(layer.id, "y", parseInt(e.target.value))}
                              className="flex-1 h-1 accent-emerald-500"
                            />
                            <button 
                              onClick={() => updateLayerProperty(layer.id, "y", 0)}
                              className="text-[9px] px-1 bg-[#1a1a1a] border border-zinc-700 rounded text-zinc-400 hover:text-white"
                            >
                              Reset
                            </button>
                          </div>

                          {/* Rotation Slider */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] w-8 text-right pr-1">Rot: {interp.rotation}°</span>
                            <input 
                              type="range" min="-360" max="360" value={interp.rotation} 
                              onChange={(e) => updateLayerProperty(layer.id, "rotation", parseInt(e.target.value))}
                              className="flex-1 h-1 accent-amber-500"
                            />
                            <button 
                              onClick={() => updateLayerProperty(layer.id, "rotation", 0)}
                              className="text-[9px] px-1 bg-[#1a1a1a] border border-zinc-700 rounded text-zinc-400 hover:text-white"
                            >
                              Reset
                            </button>
                          </div>

                          {/* Scale Slider */}
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] w-8 text-right pr-1">Scale: {Math.round(interp.scaleX * 100)}%</span>
                            <input 
                              type="range" min="10" max="400" value={Math.round(interp.scaleX * 100)} 
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) / 100;
                                updateLayerProperty(layer.id, "scaleX", val);
                                updateLayerProperty(layer.id, "scaleY", val);
                              }}
                              className="flex-1 h-1 accent-indigo-500"
                            />
                            <button 
                              onClick={() => {
                                updateLayerProperty(layer.id, "scaleX", 1);
                                updateLayerProperty(layer.id, "scaleY", 1);
                              }}
                              className="text-[9px] px-1 bg-[#1a1a1a] border border-zinc-700 rounded text-zinc-400 hover:text-white"
                            >
                              Reset
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
