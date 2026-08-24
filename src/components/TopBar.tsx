import React, { useEffect, useState } from 'react';
import { Gamepad2, Download, Undo, Redo, ZoomIn, ZoomOut, Save, Sliders, PaintBucket, Home, Clock, ChevronLeft, ChevronRight, Settings, RotateCcw, Users, Crosshair, Maximize, FileStack, LayoutGrid, SquareDashed, Fingerprint, PenTool, Droplets, ChevronsLeft, ChevronsRight, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { twMerge } from 'tailwind-merge';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { exportToPsd } from '../lib/psdExport';
import { AccountModal } from './AccountModal';

export function TopBar() {
  const { 
    zoom, setZoom, width, height, layers, 
    hasSavedState, restoreFromLocalStorage, saveToLocalStorage, 
    uiLayout, setUiLayout, showPropertiesPanel, togglePropertiesPanel,
    undo, redo, undoAll, redoAll, historyIndex, history, setAppView,
    animationEnabled, currentFrame, setCurrentFrame, totalFrames,
    setShowProjectSettings, showAccountModal, setShowAccountModal, activeCollaborationId,
    centerCanvas, resetZoom,
    simpleMode
  } = useStore();

  const [collaborators, setCollaborators] = useState<any[]>([]);

  useEffect(() => {
    if (!activeCollaborationId) {
      setCollaborators([]);
      return;
    }
    const q = query(collection(db, `collaborations/${activeCollaborationId}/cursors`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const colabs: any[] = [];
      snapshot.docs.forEach(doc => {
        colabs.push(doc.data());
      });
      setCollaborators(colabs);
    });
    return () => unsubscribe();
  }, [activeCollaborationId]);

  useEffect(() => {
    const handleExportPng = () => handleExport();
    window.addEventListener('export-png', handleExportPng);
    return () => window.removeEventListener('export-png', handleExportPng);
  }, [width, height, layers]);

  const handleExport = () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Fill background: respect canvasBackgroundColor if not transparent
    const bgCol = useStore.getState().canvasBackgroundColor;
    if (bgCol !== 'transparent') {
      ctx.fillStyle = bgCol;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw all visible layers from bottom to top
    const reversedLayers = [...layers].reverse();
    reversedLayers.forEach(layer => {
      if (layer.visible && layer.canvas) {
        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
      }
    });

    const dataUrl = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'artwork.png';
    a.click();
  };

  if (simpleMode) {
    return (
      <div className="h-12 bg-[#2d2d2dbb] backdrop-blur-md border-b border-black/20 flex items-center justify-between px-2 text-zinc-300 w-full shrink-0 z-[60]">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setAppView('start')} 
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white mr-1"
            title="Voltar ao Início"
          >
            <Home size={22} />
          </button>
          <div className="w-px h-6 bg-zinc-700/50 mx-1" />
          <button 
            onClick={() => undoAll()} 
            disabled={historyIndex <= 0}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-20"
            title="Desfazer Tudo (Undo All)"
          >
            <ChevronsLeft size={22} />
          </button>
          <button 
            onClick={() => undo()} 
            disabled={historyIndex <= 0}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-20"
            title="Desfazer (Undo)"
          >
            <Undo size={22} />
          </button>
          <button 
            onClick={() => redo()} 
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-20"
            title="Refazer (Redo)"
          >
            <Redo size={22} />
          </button>
          <button 
            onClick={() => redoAll()} 
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-20"
            title="Refazer Tudo (Redo All)"
          >
            <ChevronsRight size={22} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => useStore.getState().togglePropertiesPanel()}
            className="p-2 hover:bg-white/10 rounded-full transition-colors relative"
          >
            <Sliders size={22} />
          </button>
          <button 
            onClick={() => useStore.getState().setShowGrid(!useStore.getState().showGrid)}
            className={twMerge("p-2 hover:bg-white/10 rounded-full transition-colors", useStore.getState().showGrid ? "text-indigo-400" : "text-zinc-300")}
          >
            <LayoutGrid size={22} />
          </button>
          <button 
            onClick={() => useStore.getState().setShowSelectionMenu(!useStore.getState().showSelectionMenu)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <SquareDashed size={22} />
          </button>
          <button 
            onClick={() => useStore.getState().setShowStabilizerMenu(!useStore.getState().showStabilizerMenu)}
            className={twMerge("p-2 hover:bg-white/10 rounded-full transition-colors", useStore.getState().showStabilizerMenu ? "text-indigo-400" : "text-zinc-300")}
          >
            <Fingerprint size={22} />
          </button>
          <button 
            onClick={() => useStore.getState().setShowReference(!useStore.getState().showReference)}
            className={twMerge("p-2 hover:bg-white/10 rounded-full transition-colors", useStore.getState().showReference ? "text-indigo-400" : "text-zinc-300")}
          >
            <FileStack size={22} />
          </button>
          <button 
            onClick={() => useStore.getState().toggleFilters()}
            className={twMerge("p-2 hover:bg-white/10 rounded-full transition-colors", useStore.getState().showFiltersDrawer ? "text-indigo-400" : "text-zinc-300")}
          >
            <Droplets size={22} />
          </button>
          <button 
            onClick={() => useStore.getState().setShowRulers(!useStore.getState().showRulers)}
            className={twMerge("p-2 hover:bg-white/10 rounded-full transition-colors", useStore.getState().showRulers ? "text-indigo-400" : "text-zinc-300")}
          >
            <PenTool size={22} />
          </button>
          <div className="w-px h-6 bg-zinc-700/50 mx-1" />
          <button 
            onClick={() => setShowProjectSettings(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-300 hover:text-white"
            title="Configurações do Projeto"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-10 bg-[#2d2d2d] border-b border-[#1a1a1a] flex items-center justify-between px-1 text-zinc-300 w-full overflow-x-auto shrink-0 scrollbar-hide">
      <div className="flex items-center">
        {/* Home Button */}
        <button 
          onClick={() => setAppView('start')} 
          className="p-1 px-2 hover:bg-zinc-700 rounded transition-colors mr-1 flex items-center gap-1 text-zinc-400 hover:text-white"
          title="Return to Start"
        >
          <Home size={16} />
        </button>
        {/* Command Bar Icons */}
        <div className="flex items-center gap-0.5 px-1 border-r border-zinc-700 h-6 mr-1 relative group">
          <button onClick={() => saveToLocalStorage()} className="p-1.5 hover:bg-zinc-700 rounded transition-colors" title="Save"><Save size={16} /></button>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-r border-zinc-700 h-6 mr-1">
          <button 
            onClick={() => undoAll()} 
            disabled={historyIndex <= 0}
            className="p-1.5 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent" title="Desfazer Tudo (Undo All)"><ChevronsLeft size={16} /></button>
          <button 
            onClick={() => undo()} 
            disabled={historyIndex <= 0}
            className="p-1.5 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent" title="Undo"><Undo size={16} /></button>
          <button 
            onClick={() => redo()} 
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent" title="Redo"><Redo size={16} /></button>
          <button 
            onClick={() => redoAll()} 
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 hover:bg-zinc-700 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent" title="Refazer Tudo (Redo All)"><ChevronsRight size={16} /></button>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-r border-zinc-700 h-6 mr-1">
          <button className="p-1.5 hover:bg-zinc-700 rounded transition-colors" title="Clear"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l18 18M3 21l18-18"/></svg></button>
          <button className="p-1.5 hover:bg-zinc-700 rounded transition-colors" title="Fill selection"><PaintBucket size={16} /></button>
        </div>

        <div className="flex items-center gap-0.5 px-1 border-r border-zinc-700 h-6 mr-1">
          <button onClick={() => setZoom(Math.max(10, zoom - 10))} className="p-1.5 hover:bg-zinc-700 rounded transition-colors" title="Zoom Out"><ZoomOut size={16} /></button>
          <span 
            className="text-[10px] w-12 text-center font-mono cursor-pointer hover:text-white flex items-center justify-center"
            onClick={() => resetZoom()}
            title="Reset Zoom (100%)"
          >
            {Math.round(zoom)}%
          </span>
          <button onClick={() => setZoom(Math.min(1000, zoom + 10))} className="p-1.5 hover:bg-zinc-700 rounded transition-colors" title="Zoom In"><ZoomIn size={16} /></button>
          <button onClick={() => resetZoom()} className="p-1.5 hover:bg-zinc-700 rounded transition-colors text-zinc-500 hover:text-indigo-400" title="Reset Zoom"><Maximize size={14} /></button>
          <button onClick={() => centerCanvas()} className="p-1.5 hover:bg-zinc-700 rounded transition-colors" title="Center Canvas"><Crosshair size={14} /></button>
        </div>

        {hasSavedState && (
          <button 
            onClick={() => restoreFromLocalStorage()}
            className="px-2 h-7 hover:bg-zinc-700 rounded text-xs gap-1 flex items-center transition-colors"
          >
            <RotateCcw size={14} /> <span>Restore</span>
          </button>
        )}
        {animationEnabled && (
          <div className="flex items-center gap-1 px-2 border-l border-zinc-700 h-6 shrink-0">
            <Clock size={14} className="text-zinc-500 mr-1" />
            <button 
              onClick={() => setCurrentFrame(Math.max(1, currentFrame - 1))}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-mono w-10 text-center">{currentFrame}/{totalFrames}</span>
            <button 
              onClick={() => setCurrentFrame(Math.min(totalFrames, currentFrame + 1))}
              className="p-1 hover:bg-zinc-700 rounded text-zinc-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 px-2 shrink-0">
        {collaborators.map((c, i) => (
          <div key={i} className="flex items-center gap-1 bg-zinc-700 px-2 py-1 rounded-full text-[10px]">
            <div className={`w-2 h-2 rounded-full ${c.isDrawing ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            {c.name}
            {c.isDrawing && <span className="text-red-500 font-bold ml-1">LIVE</span>}
          </div>
        ))}
        <button 
          onClick={() => setShowAccountModal(true)}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
          title="Account"
        >
          <User size={16} />
        </button>
        <button 
          onClick={() => setShowProjectSettings(true)}
          className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400"
          title="Project Settings"
        >
          <Settings size={16} />
        </button>
        <button
          onClick={() => useStore.getState().setShowMiniGamesModal(true)}
          className="p-1.5 hover:bg-zinc-700 rounded text-amber-400"
          title="Minijogos"
        >
          <Gamepad2 size={16} />
        </button>
        <button 
          onClick={togglePropertiesPanel}
          className={`p-1.5 hover:bg-zinc-700 rounded transition-colors ${showPropertiesPanel ? 'text-indigo-400' : 'text-zinc-400'}`}
        >
          <Sliders size={16} />
        </button>
      </div>
      {showAccountModal && <AccountModal onClose={() => setShowAccountModal(false)} />}
    </div>
  );
}
