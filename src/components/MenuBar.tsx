import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getTranslation } from '../lib/translations';
import { Download, Save, Plus, Trash2, Undo, Redo, ZoomIn, ZoomOut, Maximize2, RotateCcw, Info, Settings, FilePlus, Sliders, Layers, LayoutGrid, Clock, Play, Pause, Ghost, SkipForward, SkipBack, Film, Box, Upload, Globe } from 'lucide-react';
import { PublishModal } from './PublishModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { applyFilter } from '../lib/filters';
import gifshot from 'gifshot';
import JSZip from 'jszip';
import { HelpModal } from './HelpModal';
import { exportToPsd } from '../lib/psdExport';

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { 
    undo, redo, historyIndex, history, 
    resetCanvas, addLayer, addLayerWithImage, addVectorLayer, removeLayer, activeLayerId,
    setZoom, zoom, setRotation, rotation,
    width, height, layers, saveToLocalStorage, restoreFromLocalStorage,
    showPropertiesPanel, togglePropertiesPanel,
    setAppView, saveProjectToFirestore, createNewProject,
    animationEnabled, setAnimationEnabled, totalFrames, currentFrame, setCurrentFrame, fps, setFps, isPlaying, setIsPlaying, onionSkin, toggleOnionSkin, addFrame, addKeyframe,
    setShowProjectSettings, exportQuality, _exportFrames, isAdmin, showRulers, setShowRulers,
    language, showReferenceButtons, setShowReferenceButtons
  } = useStore();

  const t = (key: string, defaultText: string) => {
    return getTranslation(key, language) || defaultText;
  };

  const getMenuHeaderTranslation = (menu: string) => {
    switch (menu) {
      case 'File': return t('file', 'File');
      case 'Edit': return t('edit', 'Edit');
      case 'Animation': return t('timeline', 'Animation');
      case 'Layer': return t('layers', 'Layer');
      case 'Select': return t('select', 'Select');
      case 'View': return t('view', 'View');
      case 'Filter': return t('filter', 'Filter');
      case 'Window': return t('window', 'Window');
      case 'Help': return t('help', 'Help');
      default: return menu;
    }
  };

  const getMenuItemTranslation = (label: string) => {
    if (label.includes('Return to Start') || label.includes('Voltar para')) return t('return_home', 'Return to Start (Home)');
    if (label.includes('New Illustration') || label.includes('Novo Projeto') || label.includes('Nueva')) return t('new_project', 'New Illustration');
    if (label.includes('Import Image') || label.includes('Importar Imagem')) return t('import_image', 'Import Image...');
    if (label.includes('Publish') || label.includes('Publicar')) return t('publish', 'Publish...');
    if (label.includes('Save') || label.includes('Salvar')) return t('save', 'Save (Cloud/Local)');
    if (label.includes('Project Settings') || label.includes('Configurações')) return t('project_settings', 'Project Settings');
    if (label.includes('Restore') || label.includes('Restaurar')) return t('restore', 'Restore from Local');
    if (label.includes('Export PNG') || label.includes('Exportar PNG')) return t('export_png', 'Export PNG (Single Frame)');
    if (label.includes('Export JPEG') || label.includes('Exportar JPEG')) return t('export_jpeg', 'Export JPEG (Single Frame)');
    if (label.includes('Export PSD') || label.includes('Exportar PSD')) return t('export_psd', 'Export PSD (Photoshop)');
    if (label.includes('Export Animation') || label.includes('Exportar Animação')) return t('export_gif', 'Export Animation (GIF)');
    if (label.includes('Export Movie') || label.includes('Exportar Vídeo')) return t('export_movie', 'Export Movie (.mp4)');
    if (label.includes('Export Frames') || label.includes('Exportar Quadros')) return t('export_zip', 'Export Frames (ZIP)');
    
    if (label === 'Undo' || label === 'Desfazer') return t('undo', 'Undo');
    if (label === 'Redo' || label === 'Refazer') return t('redo', 'Redo');
    if (label.includes('Copy Layer') || label.includes('Copiar Camada')) return t('copy_layer', 'Copy Layer');
    if (label.includes('Clear Selected') || label.includes('Limpar Camada')) return t('clear_canvas', 'Clear Selected Layer');
    if (label.includes('Resize Canvas (800') || label.includes('Redimensionar (800')) return t('resize_800', 'Resize Canvas (800x600)');
    if (label.includes('Resize Canvas (1920') || label.includes('Redimensionar (1920')) return t('resize_1920', 'Resize Canvas (1920x1080)');
    
    if (label.includes('Show Timeline') || label.includes('Mostrar Linha')) return t('show_timeline', 'Show Timeline');
    if (label.includes('Hide Timeline') || label.includes('Ocultar Linha')) return t('hide_timeline', 'Hide Timeline');
    if (label.includes('Animation Settings') || label.includes('Configurações de Animação')) return t('animation_settings', 'Animation Settings');
    if (label.includes('Play / Pause') || label.includes('Reproduzir / Pausar')) return t('play_pause', 'Play / Pause');
    if (label.includes('Toggle Onion') || label.includes('Alternar Papel')) return t('toggle_onion', 'Toggle Onion Skin');
    if (label.includes('Add Frame') || label.includes('Adicionar Quadro')) return t('add_frame', 'Add Frame');
    if (label.includes('Add Keyframe') || label.includes('Adicionar Keyframe')) return t('add_keyframe', 'Add Keyframe');
    if (label.includes('Go to Next') || label.includes('Ir para o Próximo')) return t('next_frame', 'Go to Next Frame');
    if (label.includes('Go to Previous') || label.includes('Ir para o Anterior')) return t('prev_frame', 'Go to Previous Frame');
    
    if (label.includes('New Raster') || label.includes('Nova Camada de Raster')) return t('add_layer', 'New Raster Layer');
    if (label.includes('New Vector') || label.includes('Nova Camada Vetorial')) return t('add_vector_layer', 'New Vector Layer');
    if (label.includes('Merge with Layer Below') || label.includes('Mesclar com a de Baixo')) return t('merge_down', 'Merge with Layer Below');
    if (label.includes('Duplicate Layer') || label.includes('Duplicar Camada')) return t('duplicate_layer', 'Duplicate Layer');
    if (label.includes('Delete Selected Layer') || label.includes('Deletar Camada Selecionada')) return t('delete_layer', 'Delete Selected Layer');
    
    if (label.includes('Select All') || label.includes('Selecionar Tudo')) return t('select_all', 'Select All');
    if (label.includes('Deselect') || label.includes('Desmarcar')) return t('deselect', 'Deselect');
    if (label.includes('Invert Selection') || label.includes('Inverter Seleção')) return t('invert_selection', 'Invert Selection');
    
    if (label.includes('Mostrar Régua') || label.includes('Show Rulers')) return t('show_rulers', 'Show Rulers');
    if (label.includes('Ocultar Régua') || label.includes('Hide Rulers')) return t('hide_rulers', 'Hide Rulers');
    if (label === 'Zoom In' || label === 'Aumentar Zoom') return t('zoom_in', 'Zoom In');
    if (label === 'Zoom Out' || label === 'Diminuir Zoom') return t('zoom_out', 'Zoom Out');
    if (label === 'Reset Zoom' || label === 'Resetar Zoom') return t('reset_view', 'Reset Zoom');
    
    return label;
  };

  const handleImportImageClick = () => {
    fileInputRef.current?.click();
    setOpenMenu(null);
  };

  const handleImportImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (dataUrl) {
          addLayerWithImage(file.name, dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: 'png' | 'jpeg' = 'png') => {
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
    } else if (format === 'jpeg') {
      // JPEG needs a background color since it doesn't support alpha, fill with white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    const reversedLayers = [...layers].reverse();
    reversedLayers.forEach(layer => {
      if (layer.visible && layer.canvas) {
        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode;
        ctx.drawImage(layer.canvas, 0, 0);
      }
    });

    const mimeType = `image/${format}`;
    const dataUrl = exportCanvas.toDataURL(mimeType, exportQuality);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `illustration.${format}`;
    a.click();
    setOpenMenu(null);
  };

  const handleExportGIF = async () => {
    setIsExporting(true);
    setOpenMenu(null);
    try {
      const frames = await _exportFrames();
      gifshot.createGIF({
        images: frames,
        gifWidth: width,
        gifHeight: height,
        interval: 1 / fps,
        numFrames: totalFrames,
        frameDuration: 1,
        sampleInterval: 10,
      }, (obj: any) => {
        if (!obj.error) {
          const a = document.createElement('a');
          a.href = obj.image;
          a.download = 'animation.gif';
          a.click();
        }
        setIsExporting(false);
      });
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
  };

  const handleExportMovie = async () => {
    setIsExporting(true);
    setOpenMenu(null);
    try {
      const frames = await _exportFrames();
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      
      const stream = canvas.captureStream(fps);
      
      const audioUrl = useStore.getState().importedAudioUrl;
      let audioTrack: MediaStreamTrack | null = null;
      let exportAudioElement: HTMLAudioElement | null = null;
      let audioCtx: AudioContext | null = null;

      if (audioUrl) {
        try {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          exportAudioElement = new Audio(audioUrl);
          exportAudioElement.crossOrigin = "anonymous";
          const source = audioCtx.createMediaElementSource(exportAudioElement);
          const dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) {
            stream.addTrack(audioTrack);
          }
        } catch (err) {
          console.error("Could not set up export audio:", err);
        }
      }
      
      let mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4;codecs=avc1';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4;codecs=h264';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        if (exportAudioElement) {
          exportAudioElement.pause();
        }
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animation.mp4';
        a.click();
        setIsExporting(false);
      };

      recorder.start();
      
      if (exportAudioElement) {
        exportAudioElement.currentTime = 0;
        exportAudioElement.play().catch((e) => console.warn("Failed to play export audio:", e));
      }
      
      for (const frame of frames) {
        await new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0);
            resolve(null);
          };
          img.src = frame;
        });
        await new Promise(r => setTimeout(r, 1000 / fps));
      }
      
      recorder.stop();
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
    setIsExporting(true);
    setOpenMenu(null);
    try {
      const frames = await _exportFrames();
      const zip = new JSZip();
      
      frames.forEach((frame, i) => {
        const base64Data = frame.split(',')[1];
        zip.file(`frame_${String(i+1).padStart(4, '0')}.png`, base64Data, { base64: true });
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation_frames.zip';
      a.click();
      setIsExporting(false);
    } catch (e) {
      console.error(e);
      setIsExporting(false);
    }
  };

  const handleNew = () => {
    if (confirm("Are you sure? This will clear your current work.")) {
      resetCanvas();
      // add standard layer back
      setTimeout(() => useStore.getState().addLayer(), 50);
    }
    setOpenMenu(null);
  };

  const menuData: Record<string, { label: string; icon?: React.ReactNode; action?: () => void; disabled?: boolean; divider?: boolean }[]> = {
    'File': [
      { label: 'Return to Start (Home)', icon: <LayoutGrid size={14} />, action: async () => { 
        if (useStore.getState().user) {
          try {
            await useStore.getState().saveProjectToFirestore();
          } catch (e) {
            console.error("Auto-save on exit failed:", e);
          }
        }
        setAppView('start'); 
        setOpenMenu(null); 
      } },
      { divider: true, label: '' },
      { label: 'New Illustration', icon: <FilePlus size={14} />, action: () => { useStore.getState().createNewProject(); setOpenMenu(null); } },
      { label: 'Import Image...', icon: <Upload size={14} />, action: handleImportImageClick },
      { label: 'Publish...', icon: <Upload size={14} />, action: () => { setShowPublishModal(true); setOpenMenu(null); } },
      { label: 'Save (Cloud/Local)', icon: <Save size={14} />, action: () => { saveToLocalStorage(); saveProjectToFirestore(); setOpenMenu(null); } },
      { label: 'Project Settings', icon: <Settings size={14} />, action: () => { setShowProjectSettings(true); setOpenMenu(null); } },
      { label: 'Restore from Local', icon: <RotateCcw size={14} />, action: () => { restoreFromLocalStorage(); setOpenMenu(null); } },
      { divider: true, label: '' },
      { label: 'Export PNG (Single Frame)', icon: <Download size={14} />, action: () => handleExport('png') },
      { label: 'Export JPEG (Single Frame)', icon: <Download size={14} />, action: () => handleExport('jpeg') },
      { label: 'Export PSD (Photoshop)', icon: <Download size={14} />, action: () => { exportToPsd(width, height, layers); setOpenMenu(null); } },
      ...(animationEnabled ? [
        { divider: true, label: '' },
        { label: 'Export Animation (GIF)', icon: <Film size={14} />, action: handleExportGIF },
        { label: 'Export Movie (.mp4)', icon: <Film size={14} />, action: handleExportMovie },
        { label: 'Export Frames (ZIP)', icon: <Box size={14} />, action: handleExportZip },
      ] : []),
    ],
    'Edit': [
      { label: 'Undo', icon: <Undo size={14} />, action: () => { undo(); setOpenMenu(null); }, disabled: historyIndex <= 0 },
      { label: 'Redo', icon: <Redo size={14} />, action: () => { redo(); setOpenMenu(null); }, disabled: historyIndex >= history.length - 1 },
      { divider: true, label: '' },
      { label: 'Copy Layer', icon: <FilePlus size={14} />, action: () => { if (activeLayerId) useStore.getState().duplicateLayer(activeLayerId); setOpenMenu(null); } },
      { label: 'Clear Selected Layer', icon: <Trash2 size={14} />, action: () => { 
        if (activeLayerId) useStore.getState().clearLayer(activeLayerId);
        setOpenMenu(null);
      }},
      { divider: true, label: '' },
      { label: 'Resize Canvas (800x600)', action: () => { useStore.getState().setWidthHeight(800, 600); setOpenMenu(null); } },
      { label: 'Resize Canvas (1920x1080)', action: () => { useStore.getState().setWidthHeight(1920, 1080); setOpenMenu(null); } },
    ],
    ...(animationEnabled ? {
      'Animation': [
        { 
          label: animationEnabled ? 'Hide Timeline' : 'Show Timeline', 
          icon: <Clock size={14} />, 
          action: () => { setAnimationEnabled(!animationEnabled); setOpenMenu(null); } 
        },
        { label: 'Animation Settings', icon: <Settings size={14} />, action: () => { setShowProjectSettings(true); setOpenMenu(null); } },
        { divider: true, label: '' },
        { label: 'Play / Pause', icon: <Play size={14} />, action: () => { setIsPlaying(!isPlaying); setOpenMenu(null); } },
        { label: 'Toggle Onion Skin', icon: <Ghost size={14} />, action: () => { toggleOnionSkin(); setOpenMenu(null); } },
        { divider: true, label: '' },
        { label: 'Add Frame', icon: <Plus size={14} />, action: () => { addFrame(); setOpenMenu(null); } },
        { label: 'Add Keyframe', icon: <Plus size={14} />, action: () => { if (activeLayerId) addKeyframe(activeLayerId, currentFrame); setOpenMenu(null); } },
        { label: 'Go to Next Frame', icon: <SkipForward size={14} />, action: () => { setCurrentFrame(Math.min(totalFrames, currentFrame + 1)); setOpenMenu(null); } },
        { label: 'Go to Previous Frame', icon: <SkipBack size={14} />, action: () => { setCurrentFrame(Math.max(1, currentFrame - 1)); setOpenMenu(null); } },
      ]
    } : {}),
    'Layer': [
      { label: 'New Raster Layer', icon: <Plus size={14} />, action: () => { addLayer(); setOpenMenu(null); } },
      { label: 'New Vector Layer', icon: <Plus size={14} />, action: () => { addVectorLayer(); setOpenMenu(null); } },
      { label: 'Merge with Layer Below', icon: <Download size={14} />, action: () => { if (activeLayerId) useStore.getState().mergeDown(activeLayerId); setOpenMenu(null); } },
      { label: 'Duplicate Layer', icon: <Layers size={14} />, action: () => { if (activeLayerId) useStore.getState().duplicateLayer(activeLayerId); setOpenMenu(null); } },
      { divider: true, label: '' },
      { label: 'Delete Selected Layer', icon: <Trash2 size={14} />, action: () => { if (activeLayerId) removeLayer(activeLayerId); setOpenMenu(null); } },
    ],
    'Select': [
      { label: 'Select All', action: () => { useStore.getState().setSelection({ x: 0, y: 0, w: width, h: height }); setOpenMenu(null); } },
      { label: 'Deselect', action: () => { useStore.getState().setSelection(null); setOpenMenu(null); } },
      { label: 'Invert Selection', disabled: true },
    ],
    'View': [
      { label: showRulers ? 'Ocultar Régua' : 'Mostrar Régua', action: () => { setShowRulers(!showRulers); setOpenMenu(null); } },
      { label: showReferenceButtons ? 'Ocultar Botões de Referência' : 'Mostrar Botões de Referência', action: () => { setShowReferenceButtons(!showReferenceButtons); setOpenMenu(null); } },
      { divider: true, label: '' },
      { label: 'Zoom In', icon: <ZoomIn size={14} />, action: () => setZoom(Math.min(1000, zoom + 10)) },
      { label: 'Zoom Out', icon: <ZoomOut size={14} />, action: () => setZoom(Math.max(10, zoom - 10)) },
      { label: 'Reset Zoom', icon: <Maximize2 size={14} />, action: () => setZoom(100) },
      { divider: true, label: '' },
      { label: 'Flip Horizontal', action: () => { useStore.getState().setFlipX(!useStore.getState().flipX); setOpenMenu(null); } },
      { label: 'Flip Vertical', action: () => { useStore.getState().setFlipY(!useStore.getState().flipY); setOpenMenu(null); } },
      { divider: true, label: '' },
      { label: 'Rotate Left', action: () => setRotation((rotation || 0) - 15) },
      { label: 'Rotate Right', action: () => setRotation((rotation || 0) + 15) },
      { label: 'Reset Rotation', action: () => setRotation(0) },
    ],
    'Filter': [
      { label: 'Open Filters', icon: <Sliders size={14} />, action: () => { useStore.getState().toggleFilters(); setOpenMenu(null); } }
    ],
    'Window': [
      { label: 'Toggle Properties', icon: <Sliders size={14} />, action: () => { togglePropertiesPanel(); setOpenMenu(null); } },
      { label: t("workspace_layout", "Workspace Layout (Flip)"), icon: <Settings size={14} />, action: () => { 
        useStore.getState().setUiLayout(useStore.getState().uiLayout === 'default' ? 'flipped' : 'default');
        setOpenMenu(null);
      } },
      { label: "Customize Layout (Drag)", icon: <LayoutGrid size={14} />, action: () => { 
        useStore.getState().setLayoutEditMode(!useStore.getState().layoutEditMode);
        setOpenMenu(null);
      } },
      { label: "Reset Layout", icon: <RotateCcw size={14} />, action: () => { 
        const state = useStore.getState();
        state.setPanelPosition('toolbar', { x: 0, y: 0 });
        state.setPanelPosition('properties', { x: 0, y: 0 });
        state.setPanelPosition('timeline', { x: 0, y: 0 });
        state.setPanelPosition('topbar', { x: 0, y: 0 });
        state.setPanelPosition('menubar', { x: 0, y: 0 });
        setOpenMenu(null);
        state.setPanelPosition('menubar', { x: 0, y: 0 });
        setOpenMenu(null);
      } },
      { label: 'Linguagens', icon: <Globe size={14} />, action: () => { setShowLanguageModal(true); setOpenMenu(null); } },
    ],
    'Help': [
      { label: 'Quick Start Guide', disabled: true },
      { divider: true, label: '' },
      { label: 'Keyboard Shortcuts', action: () => { setShowShortcutsModal(true); setOpenMenu(null); } },
      { label: 'About Studio Paint', icon: <Info size={14} />, action: () => { setShowHelpModal(true); setOpenMenu(null); } },
    ],
    ...(isAdmin ? {
        'Admin': [
            { label: 'Send Notice', action: () => alert("Send Notice - Placeholder") },
            { label: 'Edit Daily Boxes', action: () => alert("Edit Daily Boxes - Placeholder") },
            { label: 'Send Brush', action: () => alert("Send Brush - Placeholder") },
            { label: 'Create Brush', action: () => alert("Create Brush - Placeholder") },
        ]
    } : {}),
  };

  const handleMenuClick = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const handleMouseEnter = (menu: string) => {
    if (openMenu) {
      setOpenMenu(menu);
    }
  };

  return (
    <div className="h-7 bg-[#1a1a1a] flex items-center px-1 text-[11px] text-zinc-300 select-none shrink-0 relative z-[100]" ref={menuRef}>
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleImportImageChange} 
      />
      {isExporting && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-white font-bold flex flex-col items-center gap-1">
             <span className="text-lg">Exportando...</span>
             <span className="text-zinc-400 text-xs animate-pulse">Isso pode levar alguns minutos para animações longas</span>
          </div>
        </div>
      )}
      <PublishModal isOpen={showPublishModal} onClose={() => setShowPublishModal(false)} />
      <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
      <div className="flex items-center h-full flex-nowrap overflow-x-auto scrollbar-hide touch-pan-x flex-1">
        <div className="px-2 hover:bg-zinc-700 h-full flex items-center cursor-default transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        </div>
        {Object.keys(menuData).map((menu) => (
          <div key={menu} className="h-full flex items-center shrink-0">
            <button 
              onClick={(e) => {
                if (openMenu === menu) {
                  setOpenMenu(null);
                } else {
                  setOpenMenu(menu);
                  const rect = e.currentTarget.getBoundingClientRect();
                  (e.currentTarget as any)._menuLeft = rect.left;
                }
              }}
              onMouseEnter={(e) => {
                if (openMenu && openMenu !== menu) {
                  setOpenMenu(menu);
                  const rect = e.currentTarget.getBoundingClientRect();
                  (e.currentTarget as any)._menuLeft = rect.left;
                }
              }}
              className={`px-2.5 h-full flex items-center transition-colors hover:bg-[#333] whitespace-nowrap ${openMenu === menu ? 'bg-[#333] text-white' : ''}`}
            >
              {getMenuHeaderTranslation(menu)}
            </button>
            
            {openMenu === menu && (
              <div 
                className="fixed top-7 w-48 bg-[#2d2d2d] border border-[#1a1a1a] shadow-xl py-1 z-[101]"
                ref={(el) => {
                  if (el && el.previousElementSibling) {
                    const btn = el.previousElementSibling as HTMLElement;
                    const rect = btn.getBoundingClientRect();
                    el.style.left = `${Math.min(rect.left, window.innerWidth - 192)}px`;
                  }
                }}
              >
                {menuData[menu].map((item, idx) => (
                  item.divider ? (
                    <div key={idx} className="h-px bg-zinc-700 my-1 mx-2" />
                  ) : (
                    <button
                      key={idx}
                      onClick={item.action}
                      disabled={item.disabled}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#4c4cff] hover:text-white flex items-center gap-2.5 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
                    >
                      <span className="w-4 flex justify-center">{item.icon}</span>
                      <span className="flex-1">{getMenuItemTranslation(item.label)}</span>
                    </button>
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="hidden md:flex items-center gap-3 px-2 text-[10px] text-zinc-500 shrink-0">
        <span className="cursor-default hover:text-zinc-300">v2.2.1</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <div className="w-2 h-2 rounded-full bg-zinc-700" />
        </div>
      </div>
      <LanguageModal isOpen={showLanguageModal} onClose={() => setShowLanguageModal(false)} />
    </div>
  );
}

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LanguageModal({ isOpen, onClose }: LanguageModalProps) {
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);
  
  if (!isOpen) return null;

  const languages = [
    { code: 'pt', label: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en', label: 'English (US)', flag: '🇺🇸' },
    { code: 'es', label: 'Español (España)', flag: '🇪🇸' },
    { code: 'it', label: 'Italiano (Italia)', flag: '🇮🇹' },
    { code: 'ja', label: '日本語 (日本)', flag: '🇯🇵' },
    { code: 'fr', label: 'Français (France)', flag: '🇫🇷' },
  ];

  const handleSelectLanguage = (code: string) => {
    setLanguage(code);
    
    let msg = '';
    if (code === 'pt') msg = 'Idioma alterado para Português!';
    else if (code === 'en') msg = 'Language changed to English!';
    else if (code === 'es') msg = '¡Idioma cambiado a Español!';
    else if (code === 'it') msg = 'Lingua cambiata in Italiano!';
    else if (code === 'ja') msg = '言語が日本語に変更されました！';
    else if (code === 'fr') msg = 'Langue changée en Français !';
    
    useStore.getState().setNotification({
      message: msg,
      type: 'success'
    });
    
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-6 w-80 shadow-2xl flex flex-col gap-5 text-white animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-1 text-center">
          <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wider">Idiomas / Languages</h3>
          <p className="text-[11px] text-zinc-400">Escolha o idioma de preferência do aplicativo.</p>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                language === lang.code
                  ? 'bg-indigo-600/10 border-indigo-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg leading-none">{lang.flag}</span>
                <span>{lang.label}</span>
              </div>
              {language === lang.code && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
          >
            Fechar / Close
          </button>
        </div>
      </div>
    </div>
  );
}
