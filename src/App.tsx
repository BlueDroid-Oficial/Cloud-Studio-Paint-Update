/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MenuBar } from './components/MenuBar';
import { TopBar } from './components/TopBar';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { FiltersDrawer } from './components/FiltersDrawer';
import { CanvasArea } from './components/CanvasArea';
import { Timeline } from './components/Timeline';
import { StartScreen } from './components/StartScreen';
import { ProjectSettingsModal } from './components/ProjectSettingsModal';
import { ReferenceWindow } from './components/ReferenceWindow';
import { SimpleTimeline } from './components/SimpleTimeline';
import { MessagesModal } from './components/MessagesModal';
import { MiniGamesModal } from './components/MiniGamesModal';
import { TutorialOverlay } from './components/TutorialOverlay';
import { VersionUpdateModal } from './components/VersionUpdateModal';
import { CollabChat } from './components/CollabChat';
import { useStore } from './store/useStore';
import { getTranslation } from './lib/translations';
import { Undo, Redo, X, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { twMerge } from 'tailwind-merge';

import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DraggablePanel = ({ id, children, className = "" }: { id: string, children: React.ReactNode, className?: string }) => {
  const { layoutEditMode, panelPositions, setPanelPosition } = useStore();
  const pos = panelPositions[id] || { x: 0, y: 0 };
  
  if (!layoutEditMode) {
    return (
      <motion.div 
        className={className} 
        animate={{ x: pos.x, y: pos.y }} transition={{ type: "spring", bounce: 0, duration: 0.2 }} initial={false}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(e, info) => {
        const snap = 20;
        const newX = Math.round((pos.x + info.offset.x) / snap) * snap;
        const newY = Math.round((pos.y + info.offset.y) / snap) * snap;
        setPanelPosition(id, { x: newX, y: newY });
      }}
      style={{ x: pos.x, y: pos.y }}
      className={twMerge(
        className,
        "border-2 border-dashed border-blue-500 bg-blue-500/10 cursor-move relative z-[9999] hover:bg-blue-500/20 transition-colors"
      )}
    >
      <div className="absolute -top-5 left-[-2px] bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t pointer-events-none">
        {id.toUpperCase()}
      </div>
      <div className="pointer-events-none h-full w-full">{children}</div>
    </motion.div>
  );
};

export default function App() {
  const state = useStore();
  const [user, setUser] = useState<any>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (state.tutorialCompleted) {
      const lastVersion = localStorage.getItem('lastShownVersion');
      if (lastVersion !== '2.3.0') {
        setShowUpdateModal(true);
        localStorage.setItem('lastShownVersion', '2.3.0');
      }
    }
  }, [state.tutorialCompleted]);

  useEffect(() => {
    if (!state.layoutEditMode) return;
    const handleEditModeKeys = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        state.setLayoutEditMode(false);
      }
    };
    window.addEventListener("keydown", handleEditModeKeys);
    return () => window.removeEventListener("keydown", handleEditModeKeys);
  }, [state.layoutEditMode]);

  useEffect(() => {
    state.checkSavedState();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) return;

      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("Control");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");

      let keyName = e.key;
      if (keyName === " ") {
        keyName = "Space";
      } else if (keyName === "ArrowLeft") {
        keyName = "ArrowLeft";
      } else if (keyName === "ArrowRight") {
        keyName = "ArrowRight";
      } else if (keyName === "ArrowUp") {
        keyName = "ArrowUp";
      } else if (keyName === "ArrowDown") {
        keyName = "ArrowDown";
      } else if (keyName.length === 1) {
        keyName = keyName.toLowerCase();
      }

      parts.push(keyName);
      const pressedShortcut = parts.join("+");

      // Find if any shortcut matches pressedShortcut
      const matchedCommandEntry = Object.entries(state.shortcuts || {}).find(
        ([_command, key]) => key === pressedShortcut
      );

      if (matchedCommandEntry) {
        const command = matchedCommandEntry[0];
        e.preventDefault();

        switch (command) {
          case "playPause":
            state.setIsPlaying(!state.isPlaying);
            break;
          case "prevFrame":
            state.setCurrentFrame(Math.max(1, state.currentFrame - 1));
            break;
          case "nextFrame":
            state.setCurrentFrame(Math.min(state.totalFrames, state.currentFrame + 1));
            break;
          case "addKeyframe":
            if (state.activeLayerId) {
              state.addKeyframe(state.activeLayerId, state.currentFrame);
            }
            break;
          case "undo":
            state.undo();
            break;
          case "redo":
            state.redo();
            break;
          case "brush":
            state.setTool("brush");
            break;
          case "eraser":
            state.setTool("eraser");
            break;
          case "pixel":
            state.setTool("pixel");
            break;
          case "pixel_eraser":
            state.setTool("pixel_eraser");
            break;
          case "bezier":
            state.setTool("bezier");
            break;
          case "line":
            state.setTool("line");
            break;
          case "rect":
            state.setTool("rect");
            break;
          case "circle":
            state.setTool("circle");
            break;
          case "star":
            state.setTool("star");
            break;
          case "fill":
            state.setTool("fill");
            break;
          case "eyedropper":
            state.setTool("picker");
            break;
          case "blur":
            state.setTool("blur");
            break;
          case "smudge":
            state.setTool("smudge");
            break;
          case "pan":
            state.setTool("pan");
            break;
          case "select-rect":
            state.setTool("select-rect");
            break;
          case "move":
            state.setTool("move");
            break;
          case "text":
            state.setTool("text");
            break;
          case "magic_wand":
            state.setTool("magic_wand");
            break;
          case "ruler":
            state.setTool("ruler");
            break;
          case "screentone":
            state.setTool("screentone");
            break;
          case "speech_balloon":
            state.setTool("speech_balloon");
            break;
          case "focus_lines":
            state.setTool("focus_lines");
            break;
          case "sharpen":
            state.setTool("sharpen");
            break;
          case "dodge":
            state.setTool("dodge");
            break;
          case "burn":
            state.setTool("burn");
            break;
          case "material_library":
            state.setTool("material_library");
            break;
          case "toggle_timeline":
            if (state.simpleMode) {
              state.setShowSimpleTimeline(!state.showSimpleTimeline);
            } else {
              state.setAnimationEnabled(!state.animationEnabled);
            }
            break;
          default:
            break;
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) state.redo();
        else state.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        state.redo();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [state]);

  const themeClasses = {
    day: "bg-zinc-50 text-zinc-900",
    night: "bg-[#1a1a1a] text-zinc-100",
    gradient: "bg-gradient-to-br from-indigo-900 via-purple-900 to-black text-white",
    customized: "bg-emerald-950 text-emerald-50"
  };

  if (state.appView === 'start') {
    return (
      <div style={{ zoom: state.uiScale } as React.CSSProperties} className={`h-screen w-screen overflow-hidden relative ${themeClasses[state.theme as keyof typeof themeClasses] || themeClasses.night}`}>
        <StartScreen />
        <TutorialOverlay />
      </div>
    );
  }

  return (
    <div style={{ zoom: state.uiScale } as React.CSSProperties} className={`h-[100dvh] w-screen flex flex-col overflow-hidden font-sans relative ${themeClasses[state.theme as keyof typeof themeClasses] || themeClasses.night}`}>
      {!state.simpleMode && (
        <DraggablePanel id="menubar" className="z-[100] relative">
          <MenuBar />
        </DraggablePanel>
      )}
      <DraggablePanel id="topbar" className="z-[90] relative">
        <TopBar />
      </DraggablePanel>
      <div className={twMerge(
        "flex-1 flex overflow-hidden min-h-0 relative",
        state.uiLayout === 'flipped' ? 'flex-col md:flex-row-reverse' : 'flex-col md:flex-row'
      )}>
        
        {/* Desktop Toolbar */}
        {!state.simpleMode && (
          <DraggablePanel id="toolbar" className="shrink-0 h-auto md:h-full z-[80]">
            <Toolbar />
          </DraggablePanel>
        )}
        
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
           <div className="flex-1 min-h-0 relative flex flex-col">
             <div className="flex-1 relative overflow-hidden flex flex-col">
                <AnimatePresence>
                  {state.simpleMode && state.showSimpleTimeline && (
                    <motion.div
                      initial={{ y: -50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -50, opacity: 0 }}
                      className="absolute top-0 left-0 w-full z-50"
                    >
                      <Timeline />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex-1 w-full flex flex-col min-h-[100px]">
                  <CanvasArea />
                </div>
             </div>
           </div>

           {!state.simpleMode && state.animationEnabled && (
             <DraggablePanel id="timeline" className="h-32 md:h-[220px] shrink-0 border-t border-black bg-[#252525] w-full flex flex-col overflow-hidden">
               <Timeline />
             </DraggablePanel>
           )}

           {/* Mobile/Simple Bottom UI */}
           {state.simpleMode && (
             <div className="shrink-0 bg-[#2d2d2dbb] backdrop-blur-md border-t border-black/20 flex flex-col z-[100]">
                <Toolbar />
             </div>
           )}
        </div>

        {/* Properties Panel - Adaptive for mobile */}
        <AnimatePresence>
          {state.gestureFeedback && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 z-[200] bg-indigo-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-3"
            >
              {state.gestureFeedback === 'Desfazer' ? <Undo size={20} /> : <Redo size={20} />}
              {state.gestureFeedback}
            </motion.div>
          )}

          {state.showPropertiesPanel && (
            <>
              {/* Mobile Overlay */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => state.togglePropertiesPanel()}
                className={`${state.simpleMode ? 'absolute' : 'md:hidden'} inset-0 bg-black/40 z-40 backdrop-blur-[1px]`}
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={twMerge(
                  "absolute inset-y-0 right-0 w-72 bg-[#3a3a3a] border-l border-black z-50 shadow-2xl flex flex-col h-full overflow-hidden",
                  !state.simpleMode && "md:relative md:w-64 md:shadow-none"
                )}
              >
               <div className={`${!state.simpleMode ? 'md:hidden' : ''} flex items-center justify-between p-2 bg-[#2d2d2d] border-b border-black shrink-0`}>
                  <span className="text-xs font-bold uppercase pl-2 text-zinc-400">Propriedades</span>
                  <button onClick={() => state.togglePropertiesPanel()} className="p-2 text-zinc-500 hover:text-white focus:outline-none"><X size={18} /></button>
               </div>
               <DraggablePanel id="properties" className="flex-1 overflow-hidden h-full">
                 <PropertiesPanel />
               </DraggablePanel>
            </motion.div>
          </>
          )}
        </AnimatePresence>

      </div>

      {state.showFiltersDrawer && <FiltersDrawer onClose={() => state.setShowFiltersDrawer(false)} />}
      <ProjectSettingsModal />
      <ReferenceWindow />
      <MessagesModal isOpen={state.showMessagesModal} onClose={() => state.setShowMessagesModal(false)} />
      <MiniGamesModal isOpen={state.showMiniGamesModal} onClose={() => state.setShowMiniGamesModal(false)} />
      <CollabChat />
      <TutorialOverlay />
      
      {state.layoutEditMode && (
        <div 
          className="absolute inset-0 z-[9998] bg-black/50 backdrop-blur-sm pointer-events-none flex items-center justify-center"
        >
          <div className="bg-zinc-900 border border-zinc-700 text-white px-6 py-4 rounded-xl shadow-2xl pointer-events-auto text-center flex flex-col items-center max-w-sm">
            <LayoutGrid size={48} className="text-blue-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Modo de Edição de Layout</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Arraste as interfaces para reposicioná-las. As janelas farão "snap" a cada 20 pixels.
            </p>
            <div className="text-xs font-mono bg-black/50 px-3 py-2 rounded text-zinc-300">
              Pressione <kbd className="bg-zinc-800 border border-zinc-600 px-1 rounded mx-1">ENTER</kbd> ou <kbd className="bg-zinc-800 border border-zinc-600 px-1 rounded mx-1">TAB</kbd> para salvar
            </div>
          </div>
        </div>
      )}

      {state.tutorialCompleted && showUpdateModal && (
        <VersionUpdateModal isOpen={showUpdateModal} onClose={() => setShowUpdateModal(false)} />
      )}
    </div>
  );
}
