import React, { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useStore, BezierPoint, drawWarpedMesh, getInterpolatedProperties } from "../store/useStore";
import { RulerOverlay } from "./RulerOverlay";
import { getTranslation } from "../lib/translations";
import { db } from "../lib/firebase";
import { collection, query, onSnapshot, doc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";

const getCursorStyle = (toolKey: string) => {
  switch (toolKey) {
    case "brush":
    case "pixel":
    case "line":
    case "bezier":
    case "rect":
    case "circle":
    case "star":
      return "crosshair";
    case "eraser":
    case "pixel_eraser":
      return "cell";
    case "picker":
      return "copy";
    case "pan":
      return "grab";
    case "move":
    case "select-rect":
      return "move";
    case "text":
      return "text";
    case "fill":
      return "pointer";
    default:
      return "default";
  }
};

const getFriendlyToolName = (toolKey: string) => {
  switch (toolKey) {
    case "brush": return "🖌️ Pincel";
    case "pixel": return "✏️ Pixel Art";
    case "eraser": return "🧽 Borracha";
    case "pixel_eraser": return "🧹 Apagador";
    case "bezier": return "↩️ Curva";
    case "line": return "📏 Linha";
    case "rect": return "⬜ Retângulo";
    case "circle": return "⚪ Círculo";
    case "star": return "⭐ Estrela";
    case "fill": return "🪣 Balde";
    case "picker": return "🧪 Conta-gotas";
    case "text": return "🔤 Texto";
    case "pan": return "🤚 Mão";
    case "move": return "🏹 Mover";
    case "select-rect": return "✂️ Seleção";
    default: return "🖌️ Desenho";
  }
};

interface WarpedSelectionOverlayProps {
  width: number;
  height: number;
  floatingSelection: any;
  transformPoints: any[] | null;
  transformMode: 'normal' | 'perspective' | 'puppet';
  activeLayerId: string | null;
  layers: any[];
}

const WarpedSelectionOverlay: React.FC<WarpedSelectionOverlayProps> = ({
  width,
  height,
  floatingSelection,
  transformPoints,
  transformMode,
  activeLayerId,
  layers,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 99999, 99999);

    if (transformPoints) {
      drawWarpedMesh(floatingSelection.canvas, ctx, transformPoints, transformMode);
    } else {
      ctx.drawImage(floatingSelection.canvas, floatingSelection.x, floatingSelection.y);
    }
  }, [width, height, floatingSelection, transformPoints, transformMode]);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const opacity = activeLayer ? activeLayer.opacity / 100 : 1;
  const mixBlendMode = (activeLayer?.blendMode as any) || "source-over";

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none z-20"
      style={{
        opacity,
        mixBlendMode,
        width: "100%",
        height: "100%",
      }}
    />
  );
};

interface SelectionMaskOverlayProps {
  selection: any;
}

const SelectionMaskOverlay: React.FC<SelectionMaskOverlayProps> = ({ selection }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selection || !selection.maskCanvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = selection.w;
    const h = selection.h;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw the tinted indigo fill of the selection
    ctx.drawImage(selection.maskCanvas, 0, 0);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "rgba(99, 102, 241, 0.22)"; // Beautiful semi-transparent indigo
    ctx.fillRect(0, 0, w, h);

    // 2. Draw a 1.5px sharp contour border around the mask
    const borderCanvas = document.createElement("canvas");
    borderCanvas.width = w;
    borderCanvas.height = h;
    const borderCtx = borderCanvas.getContext("2d")!;

    // Draw the mask shifted 1px in 4 directions to build a thin shell
    borderCtx.fillStyle = "rgba(99, 102, 241, 0.9)";
    const offsets = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    offsets.forEach(([dx, dy]) => {
      borderCtx.drawImage(selection.maskCanvas, dx, dy);
    });

    // Make the outer shell fully opaque solid indigo
    borderCtx.globalCompositeOperation = "source-in";
    borderCtx.fillRect(0, 0, w, h);

    // Erase the original selection area to retain ONLY the pixel-perfect 1px boundary stroke
    borderCtx.globalCompositeOperation = "destination-out";
    borderCtx.drawImage(selection.maskCanvas, 0, 0);

    // Composite the extracted border stroke onto the main canvas
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(borderCanvas, 0, 0);
  }, [selection]);

  if (!selection || !selection.maskCanvas) return null;

  return (
    <canvas
      ref={canvasRef}
      width={selection.w}
      height={selection.h}
      className="absolute pointer-events-none z-10 animate-pulse"
      style={{
        left: selection.x,
        top: selection.y,
        width: selection.w,
        height: selection.h,
      }}
    />
  );
};

const customBrushImagesCache: Record<string, HTMLImageElement> = {};

function hexToRgb(hex: string) {
  const cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

import { motion } from "motion/react";

const MultiplayerCursors = ({ activeCollaborationId, user, zoom }: any) => {
  const [cursors, setCursors] = useState<any[]>([]);
  
  useEffect(() => {
    if (!activeCollaborationId || !user) return;
    const q = query(collection(db, `collaborations/${activeCollaborationId}/cursors`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedCursors: any[] = [];
      const now = Date.now();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.uid !== user.uid) {
          if (data.timestamp && now - data.timestamp.toMillis() < 30000) {
            updatedCursors.push(data);
          }
        }
      });
      setCursors(updatedCursors);
    });
    return () => unsubscribe();
  }, [activeCollaborationId, user]);

  return (
    <>
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.uid}
          className="absolute z-50 pointer-events-none flex flex-col items-start origin-top-left"
          initial={false}
          animate={{ x: cursor.x, y: cursor.y }}
          transition={{ type: "spring", damping: 20, stiffness: 200, mass: 0.5 }}
        >
          {cursor.tool !== "eraser" && cursor.tool !== "move" && (
            <div 
               className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white mix-blend-difference"
               style={{ width: cursor.size, height: cursor.size, backgroundColor: cursor.color, opacity: 0.8 }}
            />
          )}
          <div className="text-white relative z-10" style={{ transform: `scale(${100/zoom})`, transformOrigin: "top left" }}>
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.45 0 .67-.54.35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" fill={cursor.color || "#3b82f6"} stroke="white" strokeWidth="1.5"/>
             </svg>
             <div className="bg-zinc-800/90 backdrop-blur text-white text-[10px] px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap border border-zinc-600">
               {cursor.name}
             </div>
          </div>
        </motion.div>
      ))}
    </>
  );
};

export function CanvasArea() {
  const {
    width,
    height,
    zoom,
    pan,
    rotation,
    layers,
    activeLayerId,
    initLayerCanvas,
    tool,
    color,
    brushSize,
    brushOpacity,
    stabilizer,
    brushTexture,
    selection,
    setSelection,
    floatingSelection,
    setFloatingSelection,
    stampFloatingSelection,
    transformMode,
    setTransformMode,
    transformPoints,
    setTransformPoints,
    bezierPoints,
    setBezierPoints,
    onionSkin,
    onionSkinBefore,
    onionSkinAfter,
    onionSkinOpacity,
    onionSkinPastColor,
    onionSkinFutureColor,
    currentFrame,
    totalFrames,
    animationEnabled,
    canvasBackgroundColor,
    showGrid,
    gridSize,
    setShowGrid,
    setGridSize,
    showRulers,
    setShowRulers,
    activeCollaborationId,
    user,
    language,
  } = useStore();

  const t = (key: string) => getTranslation(key, language || "pt");

  useEffect(() => {
    renderDisplay();
  }, [layers]);

  const containerRef = useRef<HTMLDivElement>(null);
  const lastCursorUpdateRef = useRef<number>(0);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const previousToolRef = useRef<any>(null);
  const renderPendingRef = useRef(false);
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([]);
  const focusLinesCenterRef = useRef<{ x: number; y: number } | null>(null);
  const specialRulerCenterRef = useRef<{ x: number; y: number } | null>(null);
  const topRulerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftRulerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const isDrawingRef = useRef(false);
  const currentStrokePointsRef = useRef<{ x: number; y: number }[]>([]);
  const draggingPointIndexRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingBezierRef = useRef<{
    index: number;
    type: "point" | "cp1" | "cp2";
  } | null>(null);
  const pointerDownTimeRef = useRef<number>(0);
  const pointerStartPosRef = useRef<
    Map<number, { clientX: number; clientY: number }>
  >(new Map());

  const [gesture, setGesture] = useState<{
    initialPinchDist: number;
    initialZoom: number;
    initialAngle: number;
    initialRotation: number;
    initialCenter: { x: number; y: number };
    initialPan: { x: number; y: number };
  } | null>(null);

  const pointsHistoryRef = useRef<{ x: number; y: number }[]>([]);
  const activePointersRef = useRef<
    Map<number, { clientX: number; clientY: number }>
  >(new Map());

  const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!activeCollaborationId) {
      setRemoteCursors({});
      return;
    }
    const q = query(
      collection(db, `collaborations/${activeCollaborationId}/cursors`),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cursors: Record<string, any> = {};
      snapshot.docs.forEach((doc) => {
        if (user && doc.id !== user.uid) {
          cursors[doc.id] = doc.data();
        }
      });
      setRemoteCursors(cursors);
    });
    
    // Listen for strokes
    const strokesQ = query(
      collection(db, `collaborations/${activeCollaborationId}/strokes`),
    );
    const unsubscribeStrokes = onSnapshot(strokesQ, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (user && data.userId === user.uid) return;
          
          const strokeData = JSON.parse(data.data);
          const storeState = useStore.getState();

          if (strokeData.type === "undo_action") {
            storeState.undo(false);
            return;
          }
          if (strokeData.type === "redo_action") {
            storeState.redo(false);
            return;
          }
          if (strokeData.type === "undo_all_action") {
            storeState.undoAll(false);
            return;
          }
          if (strokeData.type === "redo_all_action") {
            storeState.redoAll(false);
            return;
          }
          
          let activeLayer = storeState.layers.find((l) => l.id === storeState.activeLayerId);
          if (!activeLayer && storeState.layers.length > 0) {
            activeLayer = storeState.layers[0];
          }
          
          const targetLayers = (strokeData.tool === "eraser" || strokeData.tool === "pixel_eraser")
            ? storeState.layers.filter((l) => l.ctx && l.visible)
            : (strokeData.layerId ? storeState.layers.filter((l) => l.id === strokeData.layerId) : (activeLayer ? [activeLayer] : []));

          targetLayers.forEach((layerToDraw) => {
            const ctx = layerToDraw.ctx;
            if (!ctx) return;
            ctx.save();
            
            if (strokeData.type === 'path' && strokeData.points.length >= 2) {
              ctx.beginPath();
              ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
              for (let i = 1; i < strokeData.points.length; i++) {
                const prev = strokeData.points[i - 1];
                const curr = strokeData.points[i];
                ctx.bezierCurveTo(
                  prev.cp2x,
                  prev.cp2y,
                  curr.cp1x,
                  curr.cp1y,
                  curr.x,
                  curr.y,
                );
              }
              ctx.lineWidth = strokeData.thickness;
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.strokeStyle = strokeData.color;
              ctx.globalAlpha = 1;
              ctx.globalCompositeOperation = "source-over";
              if (strokeData.style === "stroke") {
                ctx.stroke();
              } else {
                ctx.fillStyle = strokeData.color;
                ctx.fill();
              }
            } else if (strokeData.type === 'fill_all') {
              ctx.fillStyle = strokeData.color;
              ctx.globalAlpha = strokeData.brushOpacity / 100;
              ctx.fillRect(0, 0, width, height);
            } else if (strokeData.type === 'freehand' && strokeData.points && strokeData.points.length > 0) {
              if (strokeData.tool === "pixel_eraser") {
                ctx.globalCompositeOperation = "destination-out";
                ctx.strokeStyle = "rgba(0,0,0,1)";
                ctx.globalAlpha = strokeData.brushOpacity / 100;
                ctx.lineWidth = strokeData.brushSize;
                ctx.lineCap = "butt";
                ctx.lineJoin = "miter";
                ctx.beginPath();
                ctx.moveTo(strokeData.points[0].x, strokeData.points[0].y);
                for (let i = 1; i < strokeData.points.length; i++) {
                  ctx.lineTo(strokeData.points[i].x, strokeData.points[i].y);
                }
                ctx.stroke();
              } else if (strokeData.tool === "brush" || strokeData.tool === "eraser" || strokeData.tool === "pixel") {
                ctx.globalCompositeOperation = strokeData.tool === "eraser" ? "destination-out" : "source-over";
                
                // For pixel brush, we can still draw lines or stamps, but currently pixel uses stamps?
                // Wait, pixel local uses drawPixelLine. Remote uses stamps if we use this loop, but pixel tool isn't textured usually.
                // It's ok, let's keep it here.
                
                // Stamp based drawing for all textures including solid
                for (let pIndex = 1; pIndex < strokeData.points.length; pIndex++) {
                  const prev = strokeData.points[pIndex - 1];
                  const curr = strokeData.points[pIndex];
                  const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                  const spacingValue = strokeData.brushSpacing ?? 10;
                  const spacing = Math.max(1, strokeData.brushSize * (spacingValue / 100));
                  const steps = dist === 0 ? 0 : Math.max(1, Math.floor(dist / spacing));
                  
                  for (let step = 0; step < steps; step++) {
                    const t = steps === 1 ? 0.5 : step / steps;
                    const x = prev.x + (curr.x - prev.x) * t;
                    const y = prev.y + (curr.y - prev.y) * t;
                    
                    drawRemoteStamp(ctx, x, y, strokeData);
                  }
                }
              }
            }
            
            ctx.restore();
          });
          window.dispatchEvent(new CustomEvent("render-display"));
        }
      });
    });

    // Listen for custom brushes
    const brushesQ = query(
      collection(db, `collaborations/${activeCollaborationId}/custom_brushes`),
    );
    const unsubscribeBrushes = onSnapshot(brushesQ, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const data = change.doc.data();
        if (change.type === "added") {
          const exists = useStore.getState().customBrushes.some((b) => b.id === change.doc.id);
          if (!exists) {
            useStore.setState((state) => ({
              customBrushes: [
                ...state.customBrushes,
                { id: change.doc.id, name: data.name, dataUrl: data.dataUrl }
              ]
            }));
          }
        } else if (change.type === "modified") {
          useStore.setState((state) => ({
            customBrushes: state.customBrushes.map((b) =>
              b.id === change.doc.id ? { ...b, name: data.name, dataUrl: data.dataUrl } : b
            )
          }));
        } else if (change.type === "removed") {
          useStore.setState((state) => ({
            customBrushes: state.customBrushes.filter((b) => b.id !== change.doc.id)
          }));
        }
      });
    });
    
    return () => {
      unsubscribe();
      unsubscribeStrokes();
      unsubscribeBrushes();
    };
  }, [activeCollaborationId, user]);

  useEffect(() => {
    if (layers.length === 0) {
      useStore.getState().addLayer();
      return;
    }

    let initialized = false;
    layers.forEach((layer) => {
      if (!layer.canvas) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        initLayerCanvas(layer.id, canvas);
        initialized = true;
      }
    });

    if (initialized) {
      setTimeout(() => {
        const state = useStore.getState();
        if (state.history.length === 0) {
          state.pushHistory();
        }
      }, 50);
    }
  }, [layers, initLayerCanvas, width, height]);

  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const clipTempRef = useRef<HTMLCanvasElement | null>(null);
  const folderCanvasesCacheRef = useRef<Record<string, HTMLCanvasElement>>({});
  const onionTintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const getCachedCanvas = (
    ref: React.MutableRefObject<HTMLCanvasElement | null>,
    w: number,
    h: number,
  ) => {
    if (!ref.current) {
      ref.current = document.createElement("canvas");
    }
    if (ref.current.width !== w || ref.current.height !== h) {
      ref.current.width = w;
      ref.current.height = h;
    }
    return ref.current;
  };

  const renderDisplay = useCallback(() => {
    if (renderPendingRef.current) return;
    renderPendingRef.current = true;

    rafRef.current = requestAnimationFrame(() => {
      renderPendingRef.current = false;
      const displayCanvas = displayCanvasRef.current;
      if (!displayCanvas) return;
      const ctx = displayCanvas.getContext("2d");
      if (!ctx) return;

      const storeState = useStore.getState();
      const currentWidth = storeState.width;
      const currentHeight = storeState.height;
      const currentLayers = storeState.layers;
      const currentCanvasBackgroundColor = storeState.canvasBackgroundColor;
      const currentAnimationEnabled = storeState.animationEnabled;
      const currentOnionSkin = storeState.onionSkin;
      const currentOnionSkinBefore = storeState.onionSkinBefore;
      const currentOnionSkinAfter = storeState.onionSkinAfter;
      const currentFrameVal = storeState.currentFrame;
      const currentTotalFrames = storeState.totalFrames;
      const currentOnionSkinOpacity = storeState.onionSkinOpacity;
      const currentOnionSkinPastColor = storeState.onionSkinPastColor;
      const currentOnionSkinFutureColor = storeState.onionSkinFutureColor;

      ctx.save();
      ctx.translate(currentWidth / 2, currentHeight / 2);
      ctx.rotate((useStore.getState().rotation * Math.PI) / 180);
      ctx.scale(useStore.getState().flipX ? -1 : 1, useStore.getState().flipY ? -1 : 1);
      ctx.translate(-currentWidth / 2, -currentHeight / 2);

      ctx.imageSmoothingEnabled = useStore.getState().toolInterpolation === "bilinear";
      ctx.clearRect(0, 0, currentWidth, currentHeight);
      if (currentCanvasBackgroundColor !== "transparent") {
        ctx.fillStyle = currentCanvasBackgroundColor;
        ctx.fillRect(0, 0, currentWidth, currentHeight);
      }

      // Render Grid
      if (useStore.getState().showGrid) {
        const gridSize = useStore.getState().gridSize;
        ctx.save();
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= currentWidth; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, currentHeight);
          ctx.stroke();
        }
        for (let y = 0; y <= currentHeight; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(currentWidth, y);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Rendering Onion Skin if enabled
      if (currentAnimationEnabled && currentOnionSkin) {
        ctx.save();

        const drawOnionFrame = (
          frame: number,
          colorTint: string,
          alpha: number,
        ) => {
          currentLayers.forEach((layer) => {
            if (layer.visible) {
              // If keyframes are disabled, only show the cel for the current frame if it exists, don't look back
              if (layer.disableKeyframes && frame !== useStore.getState().currentFrame) return;

              const cachedCanvas = layer.celCache?.[frame];
              let srcElement: HTMLCanvasElement | HTMLImageElement | null = null;
              if (cachedCanvas) {
                srcElement = cachedCanvas;
              } else {
                let cel = layer.cels[frame];
                if (!cel && !layer.disableKeyframes) {
                  for (let prevF = frame - 1; prevF >= 1; prevF--) {
                    if (layer.cels[prevF]) {
                      cel = layer.cels[prevF];
                      break;
                    }
                  }
                }
                if (cel) {
                  const img = new Image();
                  img.src = cel;
                  if (img.complete) {
                    srcElement = img;
                  }
                }
              }

              if (srcElement) {
                ctx.save();
                ctx.globalAlpha = alpha;
                if (colorTint) {
                  const tintCanvas = getCachedCanvas(onionTintCanvasRef, currentWidth, currentHeight);
                  const tintCtx = tintCanvas.getContext("2d");
                  if (tintCtx) {
                    tintCtx.clearRect(0, 0, currentWidth, currentHeight);
                    tintCtx.globalCompositeOperation = "source-over";
                    tintCtx.globalAlpha = 1.0;
                    tintCtx.drawImage(srcElement, 0, 0);
                    tintCtx.globalCompositeOperation = "source-in";
                    tintCtx.fillStyle = colorTint;
                    tintCtx.fillRect(0, 0, currentWidth, currentHeight);
                    ctx.drawImage(tintCanvas, 0, 0);
                  } else {
                    ctx.drawImage(srcElement, 0, 0);
                  }
                } else {
                  ctx.drawImage(srcElement, 0, 0);
                }
                ctx.restore();
              }
            }
          });
        };

        // Draw past frames
        for (let d = 1; d <= currentOnionSkinBefore; d++) {
          const f = currentFrameVal - d;
          if (f >= 1) {
            const alpha = Math.max(0.01, currentOnionSkinOpacity * Math.pow(0.5, d - 1));
            drawOnionFrame(f, currentOnionSkinPastColor, alpha);
          }
        }

        // Draw future frames
        for (let d = 1; d <= currentOnionSkinAfter; d++) {
          const f = currentFrameVal + d;
          if (f <= currentTotalFrames) {
            const alpha = Math.max(0.01, currentOnionSkinOpacity * Math.pow(0.5, d - 1));
            drawOnionFrame(f, currentOnionSkinFutureColor, alpha);
          }
        }

        ctx.restore();
      }

      ctx.restore();

      const tempCanvas = getCachedCanvas(tempCanvasRef, currentWidth, currentHeight);
      const tempCtx = tempCanvas.getContext("2d")!;

      const folderCanvases: Record<string, HTMLCanvasElement> = {};

      const renderLayerGroup = (groupLayers: any[], targetCtx: CanvasRenderingContext2D, parentFolder?: any) => {
        const reversedGroup = [...groupLayers].reverse();
        let idx = 0;
        while (idx < reversedGroup.length) {
          const layer = reversedGroup[idx];
          if (!layer.visible) {
            idx++;
            continue;
          }

          // If this is a folder layer
          if (layer.type === "folder") {
            const isPassThrough = layer.blendMode === "source-over" || layer.blendMode === "pass-through";

            if (isPassThrough) {
              // Pass-through folder: render children directly onto targetCtx sequentially
              const childLayers = currentLayers.filter((l) => l.folderId === layer.id && l.type !== "folder");
              renderLayerGroup(childLayers, targetCtx, layer);
            } else {
              // Isolated folder: render children onto a temporary folder canvas first
              let fCanvas = folderCanvasesCacheRef.current[layer.id];
              if (!fCanvas) {
                fCanvas = document.createElement("canvas");
                folderCanvasesCacheRef.current[layer.id] = fCanvas;
              }
              if (fCanvas.width !== currentWidth || fCanvas.height !== currentHeight) {
                fCanvas.width = currentWidth;
                fCanvas.height = currentHeight;
              }
              const fCtx = fCanvas.getContext("2d")!;
              fCtx.clearRect(0, 0, currentWidth, currentHeight);

              const childLayers = currentLayers.filter((l) => l.folderId === layer.id && l.type !== "folder");
              renderLayerGroup(childLayers, fCtx);

              // Draw fCanvas onto targetCtx with folder's composite mode and overall opacity
              const folderInterpProps = getInterpolatedProperties(layer, storeState.keyframes, currentFrameVal);
              const folderOpacity = parentFolder 
                ? (folderInterpProps.opacity / 100) * (parentFolder.opacity / 100) 
                : (folderInterpProps.opacity / 100);

              const folderTempCanvas = getCachedCanvas(tempCanvasRef, currentWidth, currentHeight);
              const folderTempCtx = folderTempCanvas.getContext("2d")!;
              folderTempCtx.globalCompositeOperation = "source-over";
              folderTempCtx.clearRect(0, 0, currentWidth, currentHeight);
              folderTempCtx.globalAlpha = folderOpacity;

              folderTempCtx.save();
              if (folderInterpProps.x !== 0 || folderInterpProps.y !== 0 || folderInterpProps.rotation !== 0 || folderInterpProps.scaleX !== 1 || folderInterpProps.scaleY !== 1) {
                folderTempCtx.translate(currentWidth / 2 + folderInterpProps.x, currentHeight / 2 + folderInterpProps.y);
                folderTempCtx.rotate((folderInterpProps.rotation * Math.PI) / 180);
                folderTempCtx.scale(folderInterpProps.scaleX, folderInterpProps.scaleY);
                folderTempCtx.translate(-currentWidth / 2, -currentHeight / 2);
              }
              folderTempCtx.drawImage(fCanvas, 0, 0);
              folderTempCtx.restore();

              targetCtx.globalAlpha = 1;
              targetCtx.globalCompositeOperation = layer.blendMode || "source-over";
              targetCtx.drawImage(folderTempCanvas, 0, 0);
            }

            idx++;
            continue;
          }

          let layerSrcCanvas: HTMLCanvasElement | null = null;
          // Render Vector Elements if it's a vector layer
          if (layer.type === "vector" && layer.elements && layer.canvas) {
            const lCtx = layer.canvas.getContext("2d");
            if (lCtx) {
              lCtx.imageSmoothingEnabled = true;
              lCtx.clearRect(0, 0, currentWidth, currentHeight);
              layer.elements.forEach((el: any) => {
                lCtx.globalAlpha = 1;
                if (el.style === "fill") lCtx.fillStyle = el.color;
                else {
                  lCtx.strokeStyle = el.color;
                  lCtx.lineWidth = el.thickness;
                  lCtx.lineCap = "round";
                  lCtx.lineJoin = "round";
                }
                lCtx.beginPath();
                if (el.type === "line") {
                  lCtx.moveTo(el.x1, el.y1);
                  lCtx.lineTo(el.x2, el.y2);
                } else if (el.type === "rect") {
                  lCtx.rect(el.x, el.y, el.w, el.h);
                } else if (el.type === "circle") {
                  lCtx.arc(el.x, el.y, el.r, 0, Math.PI * 2);
                } else if (el.type === "star") {
                  let rot = (Math.PI / 2) * 3;
                  const step = Math.PI / el.points;
                  lCtx.moveTo(el.x, el.y - el.r1);
                  for (let k = 0; k < el.points; k++) {
                    lCtx.lineTo(el.x + Math.cos(rot) * el.r1, el.y + Math.sin(rot) * el.r1);
                    rot += step;
                    lCtx.lineTo(el.x + Math.cos(rot) * el.r2, el.y + Math.sin(rot) * el.r2);
                    rot += step;
                  }
                  lCtx.closePath();
                } else if (el.type === "path") {
                  if (el.points.length >= 2) {
                    lCtx.moveTo(el.points[0].x, el.points[0].y);
                    for (let pIdx = 1; pIdx < el.points.length; pIdx++) {
                      const prev = el.points[pIdx - 1];
                      const curr = el.points[pIdx];
                      lCtx.bezierCurveTo(
                        prev.cp2x,
                        prev.cp2y,
                        curr.cp1x,
                        curr.cp1y,
                        curr.x,
                        curr.y,
                      );
                    }
                  }
                } else if (el.type === "text") {
                  lCtx.font = `${el.size}px ${el.font || "sans-serif"}`;
                  if (el.style === "fill") lCtx.fillText(el.text, el.x, el.y);
                  else lCtx.strokeText(el.text, el.x, el.y);
                }
                if (el.type !== "text") {
                  if (el.style === "fill") lCtx.fill();
                  else lCtx.stroke();
                }
              });
            }
            layerSrcCanvas = layer.canvas;
          } else {
            layerSrcCanvas = layer.canvas;
          }

          if (!layerSrcCanvas) {
            idx++;
            continue;
          }

          const interpProps = getInterpolatedProperties(layer, storeState.keyframes, currentFrameVal);
          const baseOpacity = parentFolder 
            ? (interpProps.opacity / 100) * (parentFolder.opacity / 100) 
            : (interpProps.opacity / 100);

          // Composite the layer onto targetCtx
          const groupTempCanvas = getCachedCanvas(tempCanvasRef, currentWidth, currentHeight);
          const groupTempCtx = groupTempCanvas.getContext("2d")!;
          groupTempCtx.globalCompositeOperation = "source-over";
          groupTempCtx.clearRect(0, 0, currentWidth, currentHeight);
          groupTempCtx.globalAlpha = baseOpacity;

          groupTempCtx.save();
          if (interpProps.x !== 0 || interpProps.y !== 0 || interpProps.rotation !== 0 || interpProps.scaleX !== 1 || interpProps.scaleY !== 1) {
            groupTempCtx.translate(currentWidth / 2 + interpProps.x, currentHeight / 2 + interpProps.y);
            groupTempCtx.rotate((interpProps.rotation * Math.PI) / 180);
            groupTempCtx.scale(interpProps.scaleX, interpProps.scaleY);
            groupTempCtx.translate(-currentWidth / 2, -currentHeight / 2);
          }
          groupTempCtx.drawImage(layerSrcCanvas, 0, 0);
          groupTempCtx.restore();

          targetCtx.globalAlpha = 1;
          targetCtx.globalCompositeOperation = layer.blendMode || "source-over";
          targetCtx.drawImage(groupTempCanvas, 0, 0);

          // Support Clipping Masks
          let j = idx + 1;
          while (j < reversedGroup.length && reversedGroup[j].clippingMask) {
            const clipLayer = reversedGroup[j];
            if (clipLayer.visible && clipLayer.canvas) {
              const clipInterpProps = getInterpolatedProperties(clipLayer, storeState.keyframes, currentFrameVal);
              const clipOpacity = parentFolder 
                ? (clipInterpProps.opacity / 100) * (parentFolder.opacity / 100) 
                : (clipInterpProps.opacity / 100);

              const clipTemp = getCachedCanvas(clipTempRef, currentWidth, currentHeight);
              const clipTempCtx = clipTemp.getContext("2d")!;

              clipTempCtx.globalCompositeOperation = "source-over";
              clipTempCtx.clearRect(0, 0, currentWidth, currentHeight);
              clipTempCtx.globalAlpha = clipOpacity;

              clipTempCtx.save();
              if (clipInterpProps.x !== 0 || clipInterpProps.y !== 0 || clipInterpProps.rotation !== 0 || clipInterpProps.scaleX !== 1 || clipInterpProps.scaleY !== 1) {
                clipTempCtx.translate(currentWidth / 2 + clipInterpProps.x, currentHeight / 2 + clipInterpProps.y);
                clipTempCtx.rotate((clipInterpProps.rotation * Math.PI) / 180);
                clipTempCtx.scale(clipInterpProps.scaleX, clipInterpProps.scaleY);
                clipTempCtx.translate(-currentWidth / 2, -currentHeight / 2);
              }
              clipTempCtx.drawImage(clipLayer.canvas, 0, 0);
              clipTempCtx.restore();

              // Clean clip mask boundary check: clip against groupTempCanvas shape
              clipTempCtx.globalCompositeOperation = "destination-in";
              clipTempCtx.drawImage(groupTempCanvas, 0, 0);

              targetCtx.globalAlpha = 1;
              targetCtx.globalCompositeOperation = clipLayer.blendMode || "source-over";
              targetCtx.drawImage(clipTemp, 0, 0);
            }
            j++;
          }
          idx = j;
        }
      };

      // Render Top-level (layers with no folder, or folder layer themselves)
      const topLevelLayers = currentLayers.filter((l) => !l.folderId || !currentLayers.some((parent) => parent.id === l.folderId));
      renderLayerGroup(topLevelLayers, ctx);
    });
  }, []);

  useEffect(() => {
    renderDisplay();
  }, [renderDisplay]);

  useEffect(() => {
    window.addEventListener("render-display", renderDisplay);
    return () => window.removeEventListener("render-display", renderDisplay);
  }, [renderDisplay]);

  const commitBezier = useCallback(
    async (type: "stroke" | "fill") => {
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (!activeLayer || !activeLayer.visible) return;

      const points = useStore.getState().bezierPoints;
      if (points.length < 2) return;

      const strokeData = {
        type: "path" as const,
        points: [...points],
        color,
        thickness: brushSize,
        style: type,
        tool: "bezier",
        layerId: activeLayer.id,
      };

      if (activeCollaborationId && user) {
        try {
          await addDoc(collection(db, `collaborations/${activeCollaborationId}/strokes`), {
            userId: user.uid,
            data: JSON.stringify(strokeData),
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.error("Error broadcasting stroke:", e);
        }
      }

      if (activeLayer.type === "vector" && activeLayer.elements) {
        activeLayer.elements.push(strokeData);
      } else if (activeLayer.ctx) {
        // ... (existing direct canvas drawing code)
        const ctx = activeLayer.ctx;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
          const prev = points[i - 1];
          const curr = points[i];
          ctx.bezierCurveTo(
            prev.cp2x,
            prev.cp2y,
            curr.cp1x,
            curr.cp1y,
            curr.x,
            curr.y,
          );
        }

        ctx.globalAlpha = brushOpacity / 100;
        ctx.globalCompositeOperation =
          tool === "pixel_eraser" ? "destination-out" : "source-over";
        ctx.imageSmoothingEnabled = true;

        if (type === "stroke") {
          ctx.lineWidth = brushSize;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = color;
          ctx.stroke();
        } else {
          ctx.fillStyle = color;
          ctx.fill();
        }
      } else {
        return;
      }

      setBezierPoints([]);
      const interactionCtx = interactionCanvasRef.current?.getContext("2d");
      if (interactionCtx) {
        interactionCtx.clearRect(0, 0, 99999, 99999);
      }
      renderDisplay();
      setTimeout(() => useStore.getState().pushHistory(), 10);
    },
    [
      layers,
      activeLayerId,
      brushSize,
      color,
      brushOpacity,
      renderDisplay,
      setBezierPoints,
      width,
      height,
      activeCollaborationId,
      user,
      tool,
    ],
  );

  useEffect(() => {
    const handleStroke = () => commitBezier("stroke");
    const handleFill = () => commitBezier("fill");
    window.addEventListener("bezier-stroke", handleStroke);
    window.addEventListener("bezier-fill", handleFill);
    return () => {
      window.removeEventListener("bezier-stroke", handleStroke);
      window.removeEventListener("bezier-fill", handleFill);
    };
  }, [commitBezier]);

  useEffect(() => {
    if (tool !== "move" && floatingSelection) {
      stampFloatingSelection();
    }
    if (!["select-rect", "move", "pan"].includes(tool)) {
      setSelection(null);
    }
    if (tool !== "bezier" && tool !== "pan") {
      setBezierPoints([]);
    }

    // Clear interaction canvas for non-previewing tools
    const interactionCtx = interactionCanvasRef.current?.getContext("2d");
    if (interactionCtx) interactionCtx.clearRect(0, 0, 99999, 99999);
  }, [
    tool,
    floatingSelection,
    stampFloatingSelection,
    setSelection,
    setBezierPoints,
    width,
    height,
  ]);

  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = interactionCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    // Get the center of the rotated/scaled canvas in client coordinates
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Pointer coordinates relative to the center
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    
    // Get rotation angle in radians
    const rotation = useStore.getState().rotation || 0;
    const theta = (rotation * Math.PI) / 180;
    
    // Rotate back (inverse rotation)
    const cos = Math.cos(-theta);
    const sin = Math.sin(-theta);
    const rotatedDx = dx * cos - dy * sin;
    const rotatedDy = dx * sin + dy * cos;
    
    // Scale back (inverse scale)
    const zoom = useStore.getState().zoom || 100;
    const s = zoom / 100;
    let scaledDx = rotatedDx / s;
    let scaledDy = rotatedDy / s;
    
    const { flipX, flipY } = useStore.getState();
    if (flipX) scaledDx = -scaledDx;
    if (flipY) scaledDy = -scaledDy;
    
    // Map to canvas space (origin at top-left, center at width/2, height/2)
    return {
      x: width / 2 + scaledDx,
      y: height / 2 + scaledDy,
    };
  };

  const drawRulers = useCallback(() => {
    const topCanvas = topRulerCanvasRef.current;
    const leftCanvas = leftRulerCanvasRef.current;
    const container = containerRef.current;
    if (!topCanvas || !leftCanvas || !container) return;

    const tCtx = topCanvas.getContext("2d");
    const lCtx = leftCanvas.getContext("2d");
    if (!tCtx || !lCtx) return;

    const rect = container.getBoundingClientRect();
    const W_v = rect.width;
    const H_v = rect.height;

    topCanvas.width = W_v;
    topCanvas.height = 20;
    leftCanvas.width = 20;
    leftCanvas.height = H_v;

    tCtx.fillStyle = "#1e1e1e";
    tCtx.fillRect(0, 0, W_v, 20);
    lCtx.fillStyle = "#1e1e1e";
    lCtx.fillRect(0, 0, 20, H_v);

    tCtx.strokeStyle = "#444444";
    tCtx.lineWidth = 1;
    tCtx.fillStyle = "#a1a1aa";
    tCtx.font = "8px monospace";
    tCtx.textAlign = "center";

    lCtx.strokeStyle = "#444444";
    lCtx.lineWidth = 1;
    lCtx.fillStyle = "#a1a1aa";
    lCtx.font = "8px monospace";
    lCtx.textBaseline = "middle";

    const s = zoom / 100;
    const x0 = W_v / 2 + (pan?.x || 0) - (width * s) / 2;
    const y0 = H_v / 2 + (pan?.y || 0) - (height * s) / 2;

    let step = 50;
    if (zoom < 50) step = 100;
    if (zoom < 15) step = 500;
    if (zoom > 250) step = 10;
    if (zoom > 600) step = 5;

    const stepPixels = step * s;

    const startTickX = Math.floor(-x0 / stepPixels) * step;
    const endTickX = Math.ceil((W_v - x0) / stepPixels) * step;

    for (let cx = startTickX; cx <= endTickX; cx += step) {
      const sx = x0 + cx * s;
      if (sx < 0 || sx > W_v) continue;

      tCtx.beginPath();
      tCtx.moveTo(sx, 12);
      tCtx.lineTo(sx, 20);
      tCtx.stroke();

      tCtx.fillText(String(cx), sx, 9);

      const subStep = step / 5;
      for (let j = 1; j < 5; j++) {
        const msx = sx + j * subStep * s;
        if (msx >= 0 && msx <= W_v) {
          tCtx.beginPath();
          tCtx.moveTo(msx, 16);
          tCtx.lineTo(msx, 20);
          tCtx.stroke();
        }
      }
    }

    const startTickY = Math.floor(-y0 / stepPixels) * step;
    const endTickY = Math.ceil((H_v - y0) / stepPixels) * step;

    for (let cy = startTickY; cy <= endTickY; cy += step) {
      const sy = y0 + cy * s;
      if (sy < 0 || sy > H_v) continue;

      lCtx.beginPath();
      lCtx.moveTo(12, sy);
      lCtx.lineTo(20, sy);
      lCtx.stroke();

      lCtx.save();
      lCtx.translate(4, sy);
      lCtx.rotate(-Math.PI / 2);
      lCtx.fillText(String(cy), 0, 3);
      lCtx.restore();

      const subStep = step / 5;
      for (let j = 1; j < 5; j++) {
        const msy = sy + j * subStep * s;
        if (msy >= 0 && msy <= H_v) {
          lCtx.beginPath();
          lCtx.moveTo(16, msy);
          lCtx.lineTo(20, msy);
          lCtx.stroke();
        }
      }
    }

    if (cursorPos) {
      const hoverSx = x0 + cursorPos.x * s;
      const hoverSy = y0 + cursorPos.y * s;

      if (hoverSx >= 0 && hoverSx <= W_v) {
        tCtx.strokeStyle = "#4c4cff";
        tCtx.lineWidth = 1;
        tCtx.beginPath();
        tCtx.moveTo(hoverSx, 0);
        tCtx.lineTo(hoverSx, 20);
        tCtx.stroke();
      }

      if (hoverSy >= 0 && hoverSy <= H_v) {
        lCtx.strokeStyle = "#4c4cff";
        lCtx.lineWidth = 1;
        lCtx.beginPath();
        lCtx.moveTo(0, hoverSy);
        lCtx.lineTo(20, hoverSy);
        lCtx.stroke();
      }
    }
  }, [zoom, pan, width, height, cursorPos]);

  useEffect(() => {
    if (!showRulers) return;
    drawRulers();
  }, [showRulers, drawRulers]);

  useEffect(() => {
    if (!showRulers) return;
    window.addEventListener("resize", drawRulers);
    return () => window.removeEventListener("resize", drawRulers);
  }, [showRulers, drawRulers]);

  const getPinchData = (
    pointers: Map<number, { clientX: number; clientY: number }>,
  ) => {
    const pts = Array.from(pointers.values());
    const t1 = pts[0];
    const t2 = pts[1];
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return {
      dist: Math.hypot(dx, dy),
      angle: Math.atan2(dy, dx) * (180 / Math.PI),
      center: {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      },
    };
  };

  const drawShapePreview = (
    start: { x: number; y: number },
    current: { x: number; y: number },
  ) => {
    const canvas = interactionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 99999, 99999);

    const state = useStore.getState();
    const style = state.shapeStyle;
    ctx.globalAlpha = state.brushOpacity / 100;

    if (style === "fill") {
      ctx.fillStyle = color;
    } else {
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    ctx.beginPath();

    if (tool === "line") {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(current.x, current.y);
    } else if (tool === "rect") {
      const rx = Math.min(start.x, current.x);
      const ry = Math.min(start.y, current.y);
      const rw = Math.abs(current.x - start.x);
      const rh = Math.abs(current.y - start.y);
      ctx.rect(rx, ry, rw, rh);
    } else if (tool === "circle") {
      const radius = Math.hypot(current.x - start.x, current.y - start.y);
      ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
    } else if (tool === "star") {
      const radius = Math.hypot(current.x - start.x, current.y - start.y);
      const innerRadius = radius * 0.4;
      const points = state.starPoints;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / points;

      ctx.moveTo(start.x, start.y - radius);
      for (let i = 0; i < points; i++) {
        const x_outer = start.x + Math.cos(rot) * radius;
        const y_outer = start.y + Math.sin(rot) * radius;
        ctx.lineTo(x_outer, y_outer);
        rot += step;

        const x_inner = start.x + Math.cos(rot) * innerRadius;
        const y_inner = start.y + Math.sin(rot) * innerRadius;
        ctx.lineTo(x_inner, y_inner);
        rot += step;
      }
      ctx.lineTo(start.x, start.y - radius);
      ctx.closePath();
    }

    if (style === "fill") ctx.fill();
    else ctx.stroke();
  };

  const drawBezierPreview = (points: BezierPoint[]) => {
    const canvas = interactionCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 99999, 99999);
    if (points.length === 0) return;

    // Draw path
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      ctx.bezierCurveTo(
        prev.cp2x,
        prev.cp2y,
        curr.cp1x,
        curr.cp1y,
        curr.x,
        curr.y,
      );
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4f46e5"; // Indigo 600
    ctx.stroke();

    // Draw handles and points
    ctx.lineWidth = 1;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];

      // Handle lines
      ctx.strokeStyle = "#a1a1aa"; // Zinc 400
      ctx.beginPath();
      ctx.moveTo(p.cp1x, p.cp1y);
      ctx.lineTo(p.x, p.y);
      ctx.lineTo(p.cp2x, p.cp2y);
      ctx.stroke();

      // Handle points
      ctx.fillStyle = "#f43f5e"; // Rose 500
      ctx.fillRect(p.cp1x - 8, p.cp1y - 8, 16, 16);
      ctx.fillRect(p.cp2x - 8, p.cp2y - 8, 16, 16);

      // Main point
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (tool === "bezier") {
      drawBezierPreview(bezierPoints);
    }
  }, [bezierPoints, tool]);

  const drawSpeechBalloon = (cx: number, cy: number) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.ctx) return;
    const ctx = activeLayer.ctx;

    const state = useStore.getState();
    const text = state.balloonText || "Fala...";
    const style = state.balloonStyle || "oval";
    const colorVal = state.color;
    const size = state.brushSize;

    ctx.save();
    
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = colorVal;
    ctx.lineWidth = Math.max(2, size / 4);

    const rw = Math.max(30, size * 4);
    const rh = Math.max(20, size * 2.5);

    ctx.beginPath();
    if (style === "oval") {
      ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
    } else if (style === "thought") {
      ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - rw * 0.6, cy + rh * 0.6, 12, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - rw * 0.8, cy + rh * 0.9, 6, 5, 0, 0, Math.PI * 2);
    } else if (style === "shout") {
      const spikes = 16;
      for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const r = i % 2 === 0 ? rw : rw * 0.7;
        const hR = i % 2 === 0 ? rh : rh * 0.7;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * hR;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    if (style === "oval") {
      ctx.beginPath();
      ctx.moveTo(cx - 15, cy + rh - 5);
      ctx.lineTo(cx, cy + rh + 30);
      ctx.lineTo(cx + 15, cy + rh - 5);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx - 15, cy + rh - 5);
      ctx.lineTo(cx, cy + rh + 30);
      ctx.lineTo(cx + 15, cy + rh - 5);
      ctx.stroke();
    } else if (style === "shout") {
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + rh - 5);
      ctx.lineTo(cx - 5, cy + rh + 40);
      ctx.lineTo(cx + 15, cy + rh - 5);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = "#000000";
    ctx.font = `${Math.max(10, size * 0.5)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = text.split(" ");
    let line = "";
    const lines = [];
    const maxWidth = rw * 1.5;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const lineHeight = Math.max(12, size * 0.6);
    const startY = cy - ((lines.length - 1) * lineHeight) / 2;
    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k].trim(), cx, startY + k * lineHeight);
    }

    ctx.restore();
    renderDisplay();
    useStore.getState().pushHistory();
  };

  const generateFocusLines = (cx: number, cy: number) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.ctx) return;
    const ctx = activeLayer.ctx;

    const state = useStore.getState();
    const count = state.focusLinesCount || 80;
    const innerRadius = state.focusLinesInnerRadius || 120;
    const colorVal = state.color;
    const size = state.brushSize;

    ctx.save();
    ctx.strokeStyle = colorVal;
    ctx.lineWidth = Math.max(1, size / 3);

    const maxDist = Math.hypot(width, height);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.05;
      const startR = innerRadius + Math.random() * 25;
      const endR = maxDist;

      const x0 = cx + Math.cos(angle) * startR;
      const y0 = cy + Math.sin(angle) * startR;
      const x1 = cx + Math.cos(angle) * endR;
      const y1 = cy + Math.sin(angle) * endR;

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    ctx.restore();
    renderDisplay();
    useStore.getState().pushHistory();
  };

  const drawMangaPanels = (type: string) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.ctx) return;
    const ctx = activeLayer.ctx;

    const state = useStore.getState();
    const margin = state.panelMargin || 40;
    const spacing = state.panelSpacing || 15;
    const borderWidth = state.panelBorderWidth || 3;
    const colorVal = state.color;

    ctx.save();
    ctx.strokeStyle = colorVal;
    ctx.lineWidth = borderWidth;

    const drawRect = (x: number, y: number, w: number, h: number) => {
      ctx.strokeRect(x, y, w, h);
    };

    const contentW = width - 2 * margin;
    const contentH = height - 2 * margin;

    if (type === '4-grid') {
      const w = (contentW - spacing) / 2;
      const h = (contentH - spacing) / 2;
      drawRect(margin, margin, w, h);
      drawRect(margin + w + spacing, margin, w, h);
      drawRect(margin, margin + h + spacing, w, h);
      drawRect(margin + w + spacing, margin + h + spacing, w, h);
    } else if (type === 'yonkoma') {
      const h = (contentH - 3 * spacing) / 4;
      for (let i = 0; i < 4; i++) {
        drawRect(margin, margin + i * (h + spacing), contentW, h);
      }
    } else if (type === '3-horizontal') {
      const h = (contentH - 2 * spacing) / 3;
      for (let i = 0; i < 3; i++) {
        drawRect(margin, margin + i * (h + spacing), contentW, h);
      }
    }

    ctx.restore();
    renderDisplay();
    useStore.getState().pushHistory();
  };

  const insertMangaMaterial = (type: string) => {
    const state = useStore.getState();
    state.addLayer();
    
    setTimeout(() => {
      const activeL = useStore.getState().layers[0];
      if (!activeL || !activeL.ctx) return;
      const ctx = activeL.ctx;
      ctx.save();

      if (type === "effect_speedlines") {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        const cx = width / 2;
        const cy = height / 2;
        for (let angle = 0; angle < Math.PI * 2; angle += 0.04) {
          if (Math.random() > 0.4) {
            const startR = Math.min(width, height) * 0.3 + Math.random() * 50;
            const endR = Math.max(width, height);
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
            ctx.lineTo(cx + Math.cos(angle) * endR, cy + Math.sin(angle) * endR);
            ctx.stroke();
          }
        }
      } else if (type === "effect_explosion") {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.fillStyle = "#ffffff";
        const cx = width / 2;
        const cy = height / 2;
        ctx.beginPath();
        const pointsCount = 40;
        for (let i = 0; i < pointsCount; i++) {
          const angle = (i / pointsCount) * Math.PI * 2;
          const r = (i % 2 === 0 ? 180 : 100) + Math.random() * 40;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        for (let i = 0; i < 20; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r1 = 20 + Math.random() * 20;
          const r2 = 90 + Math.random() * 40;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1);
          ctx.lineTo(cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2);
          ctx.stroke();
        }
      } else if (type === "effect_screentone_grad") {
        ctx.fillStyle = "#000000";
        const spacing = 12;
        for (let y = 0; y < height; y += spacing) {
          const ratio = y / height;
          const radius = Math.max(0.5, (1 - ratio) * 4.5);
          for (let x = 0; x < width; x += spacing) {
            ctx.beginPath();
            ctx.arc(x + (y % 2 === 0 ? spacing / 2 : 0), y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (type === "effect_sparkles") {
        ctx.fillStyle = "#000000";
        const drawSparkle = (x: number, y: number, r: number) => {
          ctx.beginPath();
          ctx.moveTo(x, y - r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.quadraticCurveTo(x, y, x, y + r);
          ctx.quadraticCurveTo(x, y, x - r, y);
          ctx.quadraticCurveTo(x, y, x, y - r);
          ctx.fill();
        };
        for (let i = 0; i < 8; i++) {
          const sx = Math.random() * width;
          const sy = Math.random() * height;
          drawSparkle(sx, sy, 20 + Math.random() * 20);
        }
      } else if (type === "effect_sakura") {
        ctx.fillStyle = "#ffb7c5";
        ctx.strokeStyle = "#e899a8";
        ctx.lineWidth = 1;
        const drawPetal = (x: number, y: number, r: number, angle: number) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.bezierCurveTo(-r, -r * 1.5, -r * 1.5, r, 0, r * 1.5);
          ctx.bezierCurveTo(r * 1.5, r, r, -r * 1.5, 0, 0);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        };
        for (let i = 0; i < 15; i++) {
          drawPetal(
            Math.random() * width,
            Math.random() * height,
            10 + Math.random() * 10,
            Math.random() * Math.PI * 2
          );
        }
      } else if (type === "texture_brick") {
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.5;
        const brickW = 80;
        const brickH = 30;
        for (let y = 0; y < height; y += brickH) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();

          const isOffset = (y / brickH) % 2 === 0;
          const startX = isOffset ? -brickW / 2 : 0;
          for (let x = startX; x < width; x += brickW) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + brickH);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
      renderDisplay();
      useStore.getState().pushHistory();
    }, 100);
  };

  useEffect(() => {
    const handleGeneratePanels = (e: any) => {
      drawMangaPanels(e.detail.type);
    };
    const handleGenerateFocus = () => {
      generateFocusLines(width / 2, height / 2);
    };
    const handleInsertMaterial = (e: any) => {
      insertMangaMaterial(e.detail.type);
    };

    window.addEventListener('generate-manga-panels', handleGeneratePanels);
    window.addEventListener('generate-focus-lines', handleGenerateFocus);
    window.addEventListener('insert-manga-material', handleInsertMaterial);

    return () => {
      window.removeEventListener('generate-manga-panels', handleGeneratePanels);
      window.removeEventListener('generate-focus-lines', handleGenerateFocus);
      window.removeEventListener('insert-manga-material', handleInsertMaterial);
    };
  }, [layers, activeLayerId, width, height]);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });
    pointerStartPosRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
    });
    pointerDownTimeRef.current = Date.now();

    // 3-finger tap detection for Redo
    if (activePointersRef.current.size === 3) {
      useStore.getState().redo();
      useStore.getState().setGestureFeedback("Refazer");
      return;
    }

    // Handle gesture starts (2+ fingers)
    if (activePointersRef.current.size >= 2) {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        // Restore canvas backup to wipe any accidental drawing
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer && activeLayer.ctx && (window as any)._canvasBackup) {
          activeLayer.ctx.putImageData((window as any)._canvasBackup, 0, 0);
          renderDisplay();
        }
        if (interactionCanvasRef.current) {
          const iCtx = interactionCanvasRef.current.getContext("2d");
          iCtx?.clearRect(0, 0, 99999, 99999);
        }
      }

      // Temporarily switch active tool to 'pan'
      const currentTool = useStore.getState().tool;
      if (currentTool !== "pan" && !previousToolRef.current) {
        previousToolRef.current = currentTool;
        useStore.getState().setTool("pan");
      }

      // Gesture detection for Undo/Redo (2/3 finger tap)
      const now = Date.now();
      const pointerCount = activePointersRef.current.size;
      
      // Store the start time and position for tap detection
      (window as any)._lastGestureStartTime = now;
      (window as any)._lastGesturePointerCount = pointerCount;

      const pinchData = getPinchData(activePointersRef.current);
      setGesture({
        initialPinchDist: pinchData.dist,
        initialZoom: useStore.getState().zoom,
        initialAngle: pinchData.angle,
        initialRotation: useStore.getState().rotation || 0,
        initialCenter: pinchData.center,
        initialPan: useStore.getState().pan || { x: 0, y: 0 },
      });
      
      if (currentTool === "bezier") {
        const currentPoints = useStore.getState().bezierPoints;
        if (currentPoints.length > 0 && draggingBezierRef.current?.type === "cp2") {
          // If we just added a point in this interaction, remove it because it was actually a gesture start
          useStore.getState().setBezierPoints(currentPoints.slice(0, -1));
          draggingBezierRef.current = null;
        }
      }
      
      return;
    }

    // Ignore secondary pointers for drawing
    if (activePointersRef.current.size > 1) return;

    const coords = getCoordinates(e);
    if (!coords) return;

    // Only start drawing if we are on the canvas OR if the tool is "pan"
    const isOverCanvas =
      (e.target as HTMLElement).closest(".canvas-area") ||
      e.target === interactionCanvasRef.current ||
      (e.target as HTMLElement).classList.contains("transform-handle-point");
    if (!isOverCanvas && tool !== "pan") return;

    // Prevent drawing if we have multiple fingers down (might be starting a gesture)
    if (activePointersRef.current.size > 1) return;

    const activeLayerForBackup = layers.find((l) => l.id === activeLayerId);
    if (!activeLayerForBackup) return;

    if (activeLayerForBackup.ctx) {
      (window as any)._canvasBackup = activeLayerForBackup.ctx.getImageData(0, 0, width, height);
    }

    isDrawingRef.current = true;
    lastPosRef.current = coords;
    startPosRef.current = coords;
    currentStrokePointsRef.current = [coords];
    lastScreenPosRef.current = { x: e.clientX, y: e.clientY };
    pointsHistoryRef.current = [coords];

    if (tool === "picker") {
      pickColor(coords);
      return;
    }

    if (tool === "bezier") {
      // Check if clicking on existing point/handle
      const hitRadius = 24;
      let hit = false;

      for (let i = 0; i < bezierPoints.length; i++) {
        const p = bezierPoints[i];
        if (Math.hypot(coords.x - p.x, coords.y - p.y) < hitRadius) {
          draggingBezierRef.current = { index: i, type: "point" };
          hit = true;
          break;
        }
        if (Math.hypot(coords.x - p.cp1x, coords.y - p.cp1y) < hitRadius) {
          draggingBezierRef.current = { index: i, type: "cp1" };
          hit = true;
          break;
        }
        if (Math.hypot(coords.x - p.cp2x, coords.y - p.cp2y) < hitRadius) {
          draggingBezierRef.current = { index: i, type: "cp2" };
          hit = true;
          break;
        }
      }

      if (!hit) {
        // Add new point
        const newPoint: BezierPoint = {
          x: coords.x,
          y: coords.y,
          cp1x: coords.x,
          cp1y: coords.y,
          cp2x: coords.x,
          cp2y: coords.y,
        };
        setBezierPoints([...bezierPoints, newPoint]);
        draggingBezierRef.current = { index: bezierPoints.length, type: "cp2" };
      }
      return;
    }

    if (tool === "select-rect") {
      if (floatingSelection) stampFloatingSelection();
      const selectionType = useStore.getState().selectionType;
      if (selectionType === "lasso") {
        lassoPointsRef.current = [coords];
      } else {
        setSelection({ x: coords.x, y: coords.y, w: 0, h: 0 });
      }
      return;
    }

    if (tool === "magic_wand") {
      const displayCanvas = displayCanvasRef.current;
      if (!displayCanvas) return;
      const ctx = displayCanvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      
      const w = width;
      const h = height;
      const startX = Math.floor(coords.x);
      const startY = Math.floor(coords.y);
      
      if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;
      
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;
      
      const startPos = (startY * w + startX) * 4;
      const startR = data[startPos];
      const startG = data[startPos + 1];
      const startB = data[startPos + 2];
      const startA = data[startPos + 3];

      const threshold = 25; // Color distance tolerance

      const colorMatch = (px: number, py: number) => {
        const idx = (py * w + px) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (startA < 10 && a < 10) return true;
        
        const dist = Math.sqrt(
          (r - startR) ** 2 +
          (g - startG) ** 2 +
          (b - startB) ** 2 +
          (a - startA) ** 2
        );
        return dist <= threshold;
      };

      const visited = new Uint8Array(w * h);
      const queueX = new Int32Array(w * h);
      const queueY = new Int32Array(w * h);
      let head = 0;
      let tail = 0;
      
      queueX[tail] = startX;
      queueY[tail] = startY;
      tail++;
      visited[startY * w + startX] = 1;
      
      let minX = startX;
      let maxX = startX;
      let minY = startY;
      let maxY = startY;
      
      const maxPixels = 300000; // safety limit to prevent freeze on very large canvas selection
      
      while (head < tail && head < maxPixels) {
        const cx = queueX[head];
        const cy = queueY[head];
        head++;
        
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        
        // Check 4-connected neighbors
        const dx = [1, -1, 0, 0];
        const dy = [0, 0, 1, -1];
        
        for (let i = 0; i < 4; i++) {
          const nx = cx + dx[i];
          const ny = cy + dy[i];
          
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            const vIdx = ny * w + nx;
            if (visited[vIdx] === 0) {
              visited[vIdx] = 1;
              if (colorMatch(nx, ny)) {
                queueX[tail] = nx;
                queueY[tail] = ny;
                tail++;
              }
            }
          }
        }
      }
      
      const selWidth = maxX - minX + 1;
      const selHeight = maxY - minY + 1;

      // Create a pixel-perfect mask canvas for the magic wand
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = selWidth;
      maskCanvas.height = selHeight;
      const maskCtx = maskCanvas.getContext("2d")!;
      
      const maskImgData = maskCtx.createImageData(selWidth, selHeight);
      const maskData = maskImgData.data;

      // Draw each successfully selected pixel onto the maskCanvas
      for (let i = 0; i < tail; i++) {
        const px = queueX[i];
        const py = queueY[i];
        const rx = px - minX;
        const ry = py - minY;
        
        const idx = (ry * selWidth + rx) * 4;
        maskData[idx] = 0;     // R
        maskData[idx + 1] = 0; // G
        maskData[idx + 2] = 0; // B
        maskData[idx + 3] = 255; // A (fully opaque)
      }
      maskCtx.putImageData(maskImgData, 0, 0);

      setSelection({ 
        x: minX, 
        y: minY, 
        w: selWidth, 
        h: selHeight,
        maskCanvas: maskCanvas
      });
      return;
    }

    if (tool === "special_ruler") {
      specialRulerCenterRef.current = coords;
      const iCtx = interactionCanvasRef.current?.getContext("2d");
      if (iCtx) {
        iCtx.clearRect(0, 0, 99999, 99999);
        iCtx.strokeStyle = "#e11d48";
        iCtx.lineWidth = 2;
        iCtx.beginPath();
        iCtx.arc(coords.x, coords.y, 8, 0, Math.PI * 2);
        iCtx.moveTo(coords.x - 15, coords.y);
        iCtx.lineTo(coords.x + 15, coords.y);
        iCtx.moveTo(coords.x, coords.y - 15);
        iCtx.lineTo(coords.x, coords.y + 15);
        iCtx.stroke();
      }
      isDrawingRef.current = false;
      return;
    }

    if (tool === "speech_balloon") {
      drawSpeechBalloon(coords.x, coords.y);
      isDrawingRef.current = false;
      return;
    }

    if (tool === "move") {
      if (floatingSelection && transformPoints) {
        const hitRadius = 27;
        let hitIdx: number | null = null;
        for (let idx = 0; idx < transformPoints.length; idx++) {
          const pt = transformPoints[idx];
          if (Math.hypot(coords.x - pt.x, coords.y - pt.y) < hitRadius) {
            hitIdx = idx;
            break;
          }
        }

        if (hitIdx !== null) {
          draggingPointIndexRef.current = hitIdx;
          lastPosRef.current = coords;
          isDrawingRef.current = true;
          return;
        }
      }

      if (selection && !floatingSelection) {
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer && activeLayer.canvas && activeLayer.ctx) {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = selection.w;
          tempCanvas.height = selection.h;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(
              activeLayer.canvas,
              selection.x,
              selection.y,
              selection.w,
              selection.h,
              0,
              0,
              selection.w,
              selection.h,
            );

            // Apply mask canvas to tempCanvas if present
            if (selection.maskCanvas) {
              tempCtx.save();
              tempCtx.globalCompositeOperation = "destination-in";
              tempCtx.drawImage(selection.maskCanvas, 0, 0);
              tempCtx.restore();
            }

            // Erase the selection from the active layer
            if (selection.maskCanvas) {
              const eraseCanvas = document.createElement("canvas");
              eraseCanvas.width = width;
              eraseCanvas.height = height;
              const eraseCtx = eraseCanvas.getContext("2d");
              if (eraseCtx) {
                eraseCtx.drawImage(selection.maskCanvas, selection.x, selection.y);
                activeLayer.ctx.save();
                activeLayer.ctx.globalCompositeOperation = "destination-out";
                activeLayer.ctx.drawImage(eraseCanvas, 0, 0);
                activeLayer.ctx.restore();
              }
            } else {
              activeLayer.ctx.clearRect(
                selection.x,
                selection.y,
                selection.w,
                selection.h,
              );
            }

            setFloatingSelection({
              canvas: tempCanvas,
              x: selection.x,
              y: selection.y,
            });
            renderDisplay();
          }
        }
      } else if (!floatingSelection) {
        // Automatically isolate the whole layer directly if NO selection present
        const currentSelection = { x: 0, y: 0, w: width, h: height };
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer && activeLayer.canvas && activeLayer.ctx) {
          const tempCanvas = document.createElement("canvas");
          tempCanvas.width = currentSelection.w;
          tempCanvas.height = currentSelection.h;
          const tempCtx = tempCanvas.getContext("2d");
          if (tempCtx) {
            tempCtx.drawImage(
              activeLayer.canvas,
              currentSelection.x,
              currentSelection.y,
              currentSelection.w,
              currentSelection.h,
              0,
              0,
              currentSelection.w,
              currentSelection.h,
            );
            activeLayer.ctx.clearRect(
              currentSelection.x,
              currentSelection.y,
              currentSelection.w,
              currentSelection.h,
            );

            setSelection(currentSelection);
            setFloatingSelection({
              canvas: tempCanvas,
              x: currentSelection.x,
              y: currentSelection.y,
            });
            renderDisplay();
          }
        }
      }
      return;
    }

    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.ctx || !activeLayer.visible) return;

    // Call handlePointerMove manually so a single click draws a dot
    handlePointerMove(e);
  };

  const pickColor = (coords: { x: number; y: number }) => {
    if (!displayCanvasRef.current) return;
    const ctx = displayCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const pixel = ctx.getImageData(
      Math.floor(coords.x),
      Math.floor(coords.y),
      1,
      1,
    ).data;
    if (pixel[3] === 0) {
      useStore.getState().setColor("#ffffff");
      return;
    }
    const hex =
      "#" +
      [pixel[0], pixel[1], pixel[2]]
        .map((x) => {
          const hex = x.toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("");

    useStore.getState().setColor(hex);
  };

  const renderTextureStamp = (
    ctx: CanvasRenderingContext2D,
    texture: string,
    color: string,
    size: number,
    opacity: number,
    hardness: number = 100
  ) => {
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    const radius = size / 2;

    if (texture === 'solid' || texture === 'round') {
      if (hardness < 100) {
        const grad = ctx.createRadialGradient(0, 0, Math.max(0, radius * (hardness / 100)), 0, 0, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'soft' || texture === 'airbrush') {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'pencil' || texture === 'graphite') {
      const count = Math.max(5, Math.floor(size * 1.5));
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const dotSize = Math.max(1, size * 0.15 * Math.random());
        ctx.globalAlpha = (opacity / 100) * (0.3 + Math.random() * 0.5);
        ctx.fillRect(px - dotSize / 2, py - dotSize / 2, dotSize, dotSize);
      }
    } else if (texture === 'charcoal' || texture === 'chalk') {
      const count = Math.max(8, Math.floor(size * 2.5));
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.5) * radius;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const w = 1 + Math.random() * (size * 0.2);
        const h = 1 + Math.random() * (size * 0.2);
        ctx.globalAlpha = (opacity / 100) * Math.random();
        ctx.fillRect(px - w / 2, py - h / 2, w, h);
      }
    } else if (texture === 'watercolor' || texture === 'wet-ink') {
      const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(0.7, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = (opacity / 100) * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (texture === 'pixel-dither' || texture === 'pixel') {
      const step = Math.max(2, Math.floor(size / 6));
      const half = Math.floor(size / 2);
      for (let dx = -half; dx <= half; dx += step) {
        for (let dy = -half; dy <= half; dy += step) {
          if (dx * dx + dy * dy <= radius * radius) {
            if ((Math.abs(dx) + Math.abs(dy)) % (step * 2) === 0) {
              ctx.fillRect(dx, dy, step, step);
            }
          }
        }
      }
    } else if (texture === 'halftone' || texture === 'screentone') {
      const dotSpacing = Math.max(4, Math.floor(size / 4));
      const dotRadius = Math.max(1, dotSpacing * 0.35);
      const half = Math.floor(size / 2);
      for (let dx = -half; dx <= half; dx += dotSpacing) {
        for (let dy = -half; dy <= half; dy += dotSpacing) {
          if (dx * dx + dy * dy <= radius * radius) {
            ctx.beginPath();
            ctx.arc(dx, dy, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  const drawStamp = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const { brushHardness, brushScatter } = useStore.getState();
    let ox = x;
    let oy = y;

    if (brushScatter > 0) {
      const angle = Math.random() * Math.PI * 2;
      const radius = (Math.random() * (brushScatter / 100)) * brushSize;
      ox += Math.cos(angle) * radius;
      oy += Math.sin(angle) * radius;
    }

    if (brushTexture.startsWith("custom-")) {
      const brushId = brushTexture.substring(7);
      const brush = useStore.getState().customBrushes.find((b) => b.id === brushId);
      if (brush) {
        let img = customBrushImagesCache[brushId];
        if (!img) {
          img = new Image();
          img.src = brush.dataUrl;
          customBrushImagesCache[brushId] = img;
        }
        if (img.complete && img.naturalWidth !== 0) {
          ctx.save();
          ctx.translate(ox, oy);
          ctx.globalAlpha = brushOpacity / 100;
          
          const size = brushSize;
          const offscreen = document.createElement("canvas");
          offscreen.width = size;
          offscreen.height = size;
          const oCtx = offscreen.getContext("2d");
          if (oCtx) {
            oCtx.drawImage(img, 0, 0, size, size);
            oCtx.globalCompositeOperation = "source-in";
            oCtx.fillStyle = color;
            oCtx.fillRect(0, 0, size, size);
            ctx.drawImage(offscreen, -size / 2, -size / 2, size, size);
          } else {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
          }
          ctx.restore();
        }
      }
      return;
    }

    ctx.save();
    ctx.translate(ox, oy);
    renderTextureStamp(ctx, brushTexture, color, brushSize, brushOpacity, brushHardness);
    ctx.restore();
  };

  const drawRemoteStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, strokeData: any) => {
    const bTexture = strokeData.brushTexture || "solid";
    const bHardness = strokeData.brushHardness ?? 100;
    const bScatter = strokeData.brushScatter ?? 0;
    const bColor = strokeData.color;
    const bSize = strokeData.brushSize;
    const bOpacity = strokeData.brushOpacity;

    let ox = x;
    let oy = y;
    if (bScatter > 0) {
      const angle = Math.random() * Math.PI * 2;
      const radius = (Math.random() * (bScatter / 100)) * bSize;
      ox += Math.cos(angle) * radius;
      oy += Math.sin(angle) * radius;
    }

    if (bTexture.startsWith("custom-")) {
      const brushId = bTexture.substring(7);
      const brush = useStore.getState().customBrushes.find((b) => b.id === brushId);
      if (brush) {
        let img = customBrushImagesCache[brushId];
        if (!img) {
          img = new Image();
          img.src = brush.dataUrl;
          customBrushImagesCache[brushId] = img;
        }
        if (img.complete && img.naturalWidth !== 0) {
          ctx.save();
          ctx.translate(ox, oy);
          ctx.globalAlpha = strokeData.brushOpacity / 100;
          
          const size = strokeData.brushSize;
          const offscreen = document.createElement("canvas");
          offscreen.width = size;
          offscreen.height = size;
          const oCtx = offscreen.getContext("2d");
          if (oCtx) {
            oCtx.drawImage(img, 0, 0, size, size);
            oCtx.globalCompositeOperation = "source-in";
            oCtx.fillStyle = strokeData.color;
            oCtx.fillRect(0, 0, size, size);
            ctx.drawImage(offscreen, -size / 2, -size / 2, size, size);
          } else {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
          }
          ctx.restore();
        }
      }
      return;
    }

    ctx.save();
    ctx.translate(ox, oy);
    renderTextureStamp(ctx, bTexture, bColor, bSize, bOpacity, bHardness);
    ctx.restore();
  };

  const fitToScreen = () => {
    if (!containerRef.current) return;
    const padding = 40; // More padding for small screens
    const containerWidth = containerRef.current.clientWidth - padding * 2;
    const containerHeight = containerRef.current.clientHeight - padding * 2;

    const zoomW = (containerWidth / width) * 100;
    const zoomH = (containerHeight / height) * 100;
    let newZoom = Math.min(zoomW, zoomH);
    
    // For tiny pixel art, don't force zoom
    if (width > 128 && height > 128) {
        newZoom = Math.min(newZoom, 2000); // Cap at 2000%
        useStore.getState().setZoom(newZoom);
        useStore.getState().setPan({ x: 0, y: 0 });
        useStore.getState().setRotation(0);
    }
  };

  // Auto-fit on initial load or size change if requested
  useEffect(() => {
    // Only auto-fit if the image is reasonably large
    if (width > 128 && height > 128) {
      // Small delay to ensure container is measured
      setTimeout(fitToScreen, 100);
    }
  }, [width, height]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }

    // Handle gestures
    if (activePointersRef.current.size >= 2 && gesture) {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        // Restore canvas backup to wipe any accidental drawing
        const activeLayer = layers.find((l) => l.id === activeLayerId);
        if (activeLayer && activeLayer.ctx && (window as any)._canvasBackup) {
          activeLayer.ctx.putImageData((window as any)._canvasBackup, 0, 0);
          renderDisplay();
        }
      }
      // Clear interaction canvas if we were drawing
      if (interactionCanvasRef.current) {
        const iCtx = interactionCanvasRef.current.getContext("2d");
        iCtx?.clearRect(0, 0, 99999, 99999);
      }

      const pinchData = getPinchData(activePointersRef.current);

      // 1. Calculate zoom
      const zoomFactor = pinchData.dist / gesture.initialPinchDist;
      let newZoom = gesture.initialZoom * zoomFactor;
      newZoom = Math.max(5, Math.min(newZoom, 2000));

      // 2. Calculate rotation
      let newRotation =
        gesture.initialRotation + (pinchData.angle - gesture.initialAngle);

      // 3. Calculate pan with offset logic
      const dx = pinchData.center.x - gesture.initialCenter.x;
      const dy = pinchData.center.y - gesture.initialCenter.y;
      
      const newPan = {
        x: gesture.initialPan.x + dx,
        y: gesture.initialPan.y + dy,
      };

      if (Math.abs(newZoom - useStore.getState().zoom) > 0.01 || Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        useStore.getState().setZoom(newZoom);
        useStore.getState().setRotation(newRotation);
        useStore.getState().setPan(newPan);
      }
      return;
    }

    let coords = getCoordinates(e);
    if (coords && activeCollaborationId && user) {
      const now = Date.now();
      if (now - lastCursorUpdateRef.current > 100) {
        lastCursorUpdateRef.current = now;
        setDoc(doc(db, `collaborations/${activeCollaborationId}/cursors`, user.uid), {
          uid: user.uid,
          name: user.displayName || "Usuário",
          x: coords.x,
          y: coords.y,
          color: color,
          size: brushSize,
          tool: tool,
          timestamp: serverTimestamp(),
        }, { merge: true }).catch(() => {});
      }
    }
    if (coords && isDrawingRef.current && lastPosRef.current) {
      const state = useStore.getState();
      const isDrawingTool = ["brush", "eraser", "pixel", "screentone"].includes(tool);
      if (isDrawingTool && state.specialRulerSnapping) {
        if (state.specialRulerType === "perspective" && specialRulerCenterRef.current) {
          const VP = specialRulerCenterRef.current;
          const A = lastPosRef.current;
          const B = coords;
          const dx = A.x - VP.x;
          const dy = A.y - VP.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            const ux = dx / len;
            const uy = dy / len;
            const vx = B.x - A.x;
            const vy = B.y - A.y;
            const dot = vx * ux + vy * uy;
            coords = {
              x: A.x + ux * dot,
              y: A.y + uy * dot
            };
          }
        } else if (state.specialRulerType === "parallel") {
          const A = lastPosRef.current;
          const B = coords;
          const rad = (state.specialRulerAngle * Math.PI) / 180;
          const ux = Math.cos(rad);
          const uy = Math.sin(rad);
          const vx = B.x - A.x;
          const vy = B.y - A.y;
          const dot = vx * ux + vy * uy;
          coords = {
            x: A.x + ux * dot,
            y: A.y + uy * dot
          };
        } else if (state.specialRulerType === "radial" && specialRulerCenterRef.current) {
          const C = specialRulerCenterRef.current;
          const A = lastPosRef.current;
          const B = coords;
          const R = Math.hypot(A.x - C.x, A.y - C.y);
          const dx = B.x - C.x;
          const dy = B.y - C.y;
          const len = Math.hypot(dx, dy);
          if (len > 0) {
            coords = {
              x: C.x + (dx / len) * R,
              y: C.y + (dy / len) * R
            };
          }
        }
      }
    }

    if (coords) {
      setCursorPos(coords);

      // Update remote cursor
      if (activeCollaborationId && user) {
        // simple throttle
        if (
          !(window as any).__lastCursorSync ||
          Date.now() - (window as any).__lastCursorSync > 100
        ) {
          (window as any).__lastCursorSync = Date.now();
          setDoc(
            doc(
              db,
              `collaborations/${activeCollaborationId}/cursors`,
              user.uid,
            ),
            {
              x: coords.x,
              y: coords.y,
              name: user.displayName || "Artista",
              photo: user.photoURL || "",
              color: color || "#ff00ff",
              tool,
              updatedAt: Date.now(),
              isDrawing: isDrawingRef.current,
            },
          ).catch(console.error);
        }
      }
    }

    // Cancel drawing if we are actively gesturing
    if (activePointersRef.current.size > 1) return;

    if (!isDrawingRef.current || !lastPosRef.current || !startPosRef.current)
      return;

    if (!coords) return;

    if (tool === "picker") {
      pickColor(coords);
      lastPosRef.current = coords;
      return;
    }

    if (tool === "bezier" && draggingBezierRef.current) {
      const newPoints = [...bezierPoints];
      const p = newPoints[draggingBezierRef.current.index];
      const dx = coords.x - lastPosRef.current.x;
      const dy = coords.y - lastPosRef.current.y;

      if (draggingBezierRef.current.type === "point") {
        p.x += dx;
        p.y += dy;
        p.cp1x += dx;
        p.cp1y += dy;
        p.cp2x += dx;
        p.cp2y += dy;
      } else if (draggingBezierRef.current.type === "cp1") {
        p.cp1x = coords.x;
        p.cp1y = coords.y;
        // Symmetric handle
        p.cp2x = p.x + (p.x - p.cp1x);
        p.cp2y = p.y + (p.y - p.cp1y);
      } else if (draggingBezierRef.current.type === "cp2") {
        p.cp2x = coords.x;
        p.cp2y = coords.y;
        // Symmetric handle
        p.cp1x = p.x + (p.x - p.cp2x);
        p.cp1y = p.y + (p.y - p.cp2y);
      }
      setBezierPoints(newPoints);
      lastPosRef.current = coords;
      return;
    }

    if (tool === "select-rect") {
      const selectionType = useStore.getState().selectionType;
      if (selectionType === "lasso") {
        lassoPointsRef.current.push(coords);
        const interactionCtx = interactionCanvasRef.current?.getContext("2d");
        if (interactionCtx) {
          interactionCtx.clearRect(0, 0, 99999, 99999);
          interactionCtx.strokeStyle = "#4c4cff";
          interactionCtx.lineWidth = 1.5;
          interactionCtx.setLineDash([4, 4]);
          interactionCtx.beginPath();
          for (let i = 0; i < lassoPointsRef.current.length; i++) {
            const pt = lassoPointsRef.current[i];
            if (i === 0) interactionCtx.moveTo(pt.x, pt.y);
            else interactionCtx.lineTo(pt.x, pt.y);
          }
          interactionCtx.stroke();
          interactionCtx.setLineDash([]);
        }
      } else {
        const x = Math.min(startPosRef.current.x, coords.x);
        const y = Math.min(startPosRef.current.y, coords.y);
        const w = Math.abs(coords.x - startPosRef.current.x);
        const h = Math.abs(coords.y - startPosRef.current.y);
        setSelection({ x, y, w, h });
      }
      lastPosRef.current = coords;
      return;
    }

    if (tool === "move" && floatingSelection) {
      if (draggingPointIndexRef.current !== null && transformPoints) {
        const idx = draggingPointIndexRef.current;
        let updatedPoints = [...transformPoints];
        
        if (transformMode === "normal" && transformPoints.length === 4) {
          const targetPt = { ...transformPoints[idx], x: coords.x, y: coords.y };
          updatedPoints[idx] = targetPt;
          
          if (idx === 0) { // Top-Left
            updatedPoints[1] = { ...updatedPoints[1], y: targetPt.y };
            updatedPoints[3] = { ...updatedPoints[3], x: targetPt.x };
          } else if (idx === 1) { // Top-Right
            updatedPoints[0] = { ...updatedPoints[0], y: targetPt.y };
            updatedPoints[2] = { ...updatedPoints[2], x: targetPt.x };
          } else if (idx === 2) { // Bottom-Right
            updatedPoints[3] = { ...updatedPoints[3], y: targetPt.y };
            updatedPoints[1] = { ...updatedPoints[1], x: targetPt.x };
          } else if (idx === 3) { // Bottom-Left
            updatedPoints[2] = { ...updatedPoints[2], y: targetPt.y };
            updatedPoints[0] = { ...updatedPoints[0], x: targetPt.x };
          }
        } else {
          updatedPoints = transformPoints.map((pt, i) => {
            if (i === idx) {
              return { ...pt, x: coords.x, y: coords.y };
            }
            return pt;
          });
        }
        setTransformPoints(updatedPoints);
        lastPosRef.current = coords;
        return;
      }

      const dx = coords.x - lastPosRef.current.x;
      const dy = coords.y - lastPosRef.current.y;
      setFloatingSelection({
        ...floatingSelection,
        x: floatingSelection.x + dx,
        y: floatingSelection.y + dy,
      });
      if (transformPoints) {
        const updatedPoints = transformPoints.map((pt) => ({
          ...pt,
          x: pt.x + dx,
          y: pt.y + dy,
        }));
        setTransformPoints(updatedPoints);
      }
      if (selection) {
        setSelection({
          ...selection,
          x: selection.x + dx,
          y: selection.y + dy,
        });
      }
      lastPosRef.current = coords;
      return;
    }

    if (tool === "pan") {
      if (lastScreenPosRef.current) {
        const dx = e.clientX - lastScreenPosRef.current.x;
        const dy = e.clientY - lastScreenPosRef.current.y;
        useStore.getState().setPan({ x: pan.x + dx, y: pan.y + dy });
      }
      lastScreenPosRef.current = { x: e.clientX, y: e.clientY };
      lastPosRef.current = coords;
      return;
    }

    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.ctx || !activeLayer.visible) return;

    if (tool === "text") {
      const interactionCtx = interactionCanvasRef.current?.getContext("2d");
      if (interactionCtx) {
        interactionCtx.clearRect(0, 0, 99999, 99999);
        const state = useStore.getState();
        interactionCtx.font = `${state.brushSize * 2}px ${state.textFont}`;
        interactionCtx.globalAlpha = state.brushOpacity / 100;
        if (state.shapeStyle === "fill") {
          interactionCtx.fillStyle = state.color;
          interactionCtx.fillText(state.textContent, coords.x, coords.y);
        } else {
          interactionCtx.strokeStyle = state.color;
          interactionCtx.lineWidth = 1;
          interactionCtx.strokeText(state.textContent, coords.x, coords.y);
        }
      }
      lastPosRef.current = coords;
      return;
    }

    if (["line", "rect", "circle", "star"].includes(tool)) {
      drawShapePreview(startPosRef.current, coords);
      lastPosRef.current = coords;
      return;
    }

    const ctx = activeLayer.ctx;
    const isAlphaLocked = activeLayer.alphaLock === true;

    if (tool === "pixel" || tool === "pixel_eraser") {
      const targetLayers = (activeCollaborationId && tool === "pixel_eraser")
        ? useStore.getState().layers.filter((l) => l.visible && l.ctx)
        : [activeLayer];

      const size = showGrid ? gridSize : Math.max(1, Math.round(brushSize * (activeLayer.scale || 1)));

      targetLayers.forEach((lay) => {
        const c = lay.ctx;
        if (!c) return;
        c.save();
        c.globalCompositeOperation = tool === "pixel_eraser" ? "destination-out" : (lay.alphaLock === true ? "source-atop" : "source-over");
        c.globalAlpha = brushOpacity / 100;
        c.imageSmoothingEnabled = false;

        const drawPixelLine = (
          cx: CanvasRenderingContext2D,
          x0: number,
          y0: number,
          x1: number,
          y1: number,
          colorStr: string,
          pixelSz: number,
        ) => {
          let gx0 = Math.floor(x0 / pixelSz);
          let gy0 = Math.floor(y0 / pixelSz);
          let gx1 = Math.floor(x1 / pixelSz);
          let gy1 = Math.floor(y1 / pixelSz);

          let dx = Math.abs(gx1 - gx0);
          let dy = Math.abs(gy1 - gy0);
          let sx = gx0 < gx1 ? 1 : -1;
          let sy = gy0 < gy1 ? 1 : -1;
          let err = dx - dy;

          cx.fillStyle = colorStr;
          
          const texture = useStore.getState().brushTexture;

          while (true) {
            let draw = true;
            if (texture === "dither-50") {
              draw = (gx0 + gy0) % 2 === 0;
            } else if (texture === "dither-25") {
              draw = (gx0 % 2 === 0) && (gy0 % 2 === 0);
            } else if (texture === "dither-75") {
              draw = (gx0 % 2 === 0) || (gy0 % 2 === 0);
            } else if (texture === "dither-12") {
              draw = (gx0 % 4 === 0) && (gy0 % 4 === 0);
            } else if (texture === "dither-33") {
              draw = (gx0 + gy0 * 2) % 3 === 0;
            } else if (texture === "dither-66") {
              draw = (gx0 + gy0 * 2) % 3 !== 0;
            } else if (texture === "horizontal") {
              draw = gy0 % 2 === 0;
            } else if (texture === "vertical") {
              draw = gx0 % 2 === 0;
            } else if (texture === "crosshatch") {
              draw = (gx0 % 3 === 0) || (gy0 % 3 === 0);
            } else if (texture === "pixel-checker-dense") {
              draw = (Math.floor(gx0 / 2) + Math.floor(gy0 / 2)) % 2 === 0;
            } else if (texture === "pixel-diagonal-left") {
              draw = (gx0 + gy0) % 3 === 0;
            } else if (texture === "pixel-diagonal-right") {
              draw = (gx0 - gy0 + 1000) % 3 === 0;
            } else if (texture === "pixel-brick") {
              draw = (gy0 % 3 !== 0) && ((Math.floor(gy0 / 3) % 2 === 0 ? gx0 : gx0 + 2) % 4 !== 0);
            } else if (texture === "pixel-dots-grid") {
              draw = (gx0 % 3 === 0) && (gy0 % 3 === 0);
            } else if (texture === "pixel-stars") {
              const mx = (gx0 % 4 + 4) % 4;
              const my = (gy0 % 4 + 4) % 4;
              draw = (mx === 1 && my === 0) || (mx === 0 && my === 1) || (mx === 1 && my === 1) || (mx === 2 && my === 1) || (mx === 1 && my === 2);
            } else if (texture === "pixel-noise") {
              draw = (Math.sin(gx0 * 12.9898 + gy0 * 78.233) * 43758.5453 % 1) > 0.4;
            } else if (texture === "pixel-weave") {
              draw = ((gx0 % 4 < 2 && gy0 % 4 < 2) || (gx0 % 4 >= 2 && gy0 % 4 >= 2));
            }

            if (draw) cx.fillRect(gx0 * pixelSz, gy0 * pixelSz, pixelSz, pixelSz);

            if (gx0 === gx1 && gy0 === gy1) break;
            let e2 = 2 * err;
            if (e2 > -dy) {
              err -= dy;
              gx0 += sx;
            }
            if (e2 < dx) {
              err += dx;
              gy0 += sy;
            }
          }
        };

        drawPixelLine(
          c,
          lastPosRef.current.x,
          lastPosRef.current.y,
          coords.x,
          coords.y,
          color,
          size,
        );
        if (useStore.getState().mirrorMode) {
          drawPixelLine(
            c,
            width - lastPosRef.current.x,
            lastPosRef.current.y,
            width - coords.x,
            coords.y,
            color,
            size,
          );
        }
        c.restore();
      });

      renderDisplay();
      lastPosRef.current = coords;
      return;
    }

    // Pixel Art mode: Disable image smoothing for pixel-based tools
    ctx.imageSmoothingEnabled = (useStore.getState().toolInterpolation === "bilinear");

    // Stabilizer logic
    pointsHistoryRef.current.push(coords);
    currentStrokePointsRef.current.push(coords);
    const historyLength = Math.max(1, Math.floor((stabilizer ?? 50) / 5));
    if (pointsHistoryRef.current.length > historyLength) {
      pointsHistoryRef.current.shift();
    }

    const avgX =
      pointsHistoryRef.current.reduce((sum, p) => sum + p.x, 0) /
      pointsHistoryRef.current.length;
    const avgY =
      pointsHistoryRef.current.reduce((sum, p) => sum + p.y, 0) /
      pointsHistoryRef.current.length;
    const smoothed = { x: avgX, y: avgY };

    if (tool === "eraser") {
      const targetLayers = activeCollaborationId 
        ? useStore.getState().layers.filter((l) => l.visible && l.ctx) 
        : [activeLayer];

      targetLayers.forEach((lay) => {
        const c = lay.ctx;
        if (!c) return;
        c.save();
        c.globalCompositeOperation = "destination-out";
        
        const dist = Math.hypot(
          smoothed.x - lastPosRef.current.x,
          smoothed.y - lastPosRef.current.y,
        );
        const spacingValue = useStore.getState().brushSpacing;
        const spacing = Math.max(1, brushSize * (spacingValue / 100));
        const steps = dist === 0 ? 0 : Math.max(1, Math.floor(dist / spacing));

        for (let i = 0; i < steps; i++) {
          const t = steps === 1 ? 0.5 : i / steps;
          const x =
            lastPosRef.current.x + (smoothed.x - lastPosRef.current.x) * t;
          const y =
            lastPosRef.current.y + (smoothed.y - lastPosRef.current.y) * t;
          drawStamp(c, x, y);
          if (useStore.getState().mirrorMode) {
            drawStamp(c, width - x, y);
          }
        }
        c.restore();
      });
    } else if (tool === "brush") {
      ctx.globalCompositeOperation = isAlphaLocked ? "source-atop" : "source-over";

      // Stamp based drawing for all textures including solid
      const dist = Math.hypot(
        smoothed.x - lastPosRef.current.x,
        smoothed.y - lastPosRef.current.y,
      );
      const spacingValue = useStore.getState().brushSpacing;
      const spacing = Math.max(1, brushSize * (spacingValue / 100));
      const steps = dist === 0 ? 0 : Math.max(1, Math.floor(dist / spacing));

      for (let i = 0; i < steps; i++) {
        const t = steps === 1 ? 0.5 : i / steps;
        const x =
          lastPosRef.current.x + (smoothed.x - lastPosRef.current.x) * t;
        const y =
          lastPosRef.current.y + (smoothed.y - lastPosRef.current.y) * t;
        drawStamp(ctx, x, y);
        if (useStore.getState().mirrorMode) {
          drawStamp(ctx, width - x, y);
        }
      }
    } else if (tool === "screentone") {
      ctx.globalCompositeOperation = isAlphaLocked ? "source-atop" : "source-over";

      const dotSize = useStore.getState().screentoneDotSize || 2;
      const frequency = useStore.getState().screentoneFrequency || 10;
      const patternCanvas = document.createElement("canvas");
      patternCanvas.width = frequency;
      patternCanvas.height = frequency;
      const patternCtx = patternCanvas.getContext("2d");
      if (patternCtx) {
        patternCtx.fillStyle = color;
        patternCtx.beginPath();
        patternCtx.arc(frequency / 2, frequency / 2, dotSize, 0, Math.PI * 2);
        patternCtx.fill();
      }

      const screentonePattern = ctx.createPattern(patternCanvas, "repeat");
      if (screentonePattern) {
        ctx.strokeStyle = screentonePattern;
        ctx.globalAlpha = brushOpacity / 100;
        ctx.lineWidth = brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
        ctx.lineTo(smoothed.x, smoothed.y);
        ctx.stroke();
        if (useStore.getState().mirrorMode) {
          ctx.beginPath();
          ctx.moveTo(width - lastPosRef.current.x, lastPosRef.current.y);
          ctx.lineTo(width - smoothed.x, smoothed.y);
          ctx.stroke();
        }
      }
    } else if (tool === "blur") {
      const isAlphaLocked = activeLayer.alphaLock === true;
      const blurRadius = Math.max(1, (useStore.getState().brushOpacity / 100) * (brushSize / 3));
      
      const padding = Math.ceil(blurRadius * 3);
      const blurAreaSize = brushSize + padding * 2;

      if (blurAreaSize > 0) {
        // --- 1. Standard Position ---
        const offscreen = document.createElement("canvas");
        offscreen.width = blurAreaSize;
        offscreen.height = blurAreaSize;
        const offscreenCtx = offscreen.getContext("2d");
        if (offscreenCtx) {
          offscreenCtx.drawImage(
            activeLayer.canvas!,
            smoothed.x - blurAreaSize / 2,
            smoothed.y - blurAreaSize / 2,
            blurAreaSize,
            blurAreaSize,
            0,
            0,
            blurAreaSize,
            blurAreaSize
          );

          const blurredCanvas = document.createElement("canvas");
          blurredCanvas.width = blurAreaSize;
          blurredCanvas.height = blurAreaSize;
          const blurredCtx = blurredCanvas.getContext("2d");
          if (blurredCtx) {
            blurredCtx.filter = `blur(${blurRadius}px)`;
            blurredCtx.drawImage(offscreen, 0, 0);

            blurredCtx.filter = "none";
            blurredCtx.globalCompositeOperation = "destination-in";
            
            const grad = blurredCtx.createRadialGradient(
              blurAreaSize / 2, blurAreaSize / 2, 0,
              blurAreaSize / 2, blurAreaSize / 2, brushSize / 2
            );
            const maxOpacity = useStore.getState().brushOpacity / 100;
            grad.addColorStop(0, `rgba(0,0,0,${maxOpacity})`);
            grad.addColorStop(1, "rgba(0,0,0,0)");
            
            blurredCtx.fillStyle = grad;
            blurredCtx.fillRect(0, 0, blurAreaSize, blurAreaSize);

            ctx.save();
            ctx.globalCompositeOperation = isAlphaLocked ? "source-atop" : "source-over";
            ctx.drawImage(
              blurredCanvas,
              smoothed.x - blurAreaSize / 2,
              smoothed.y - blurAreaSize / 2
            );
            ctx.restore();
          }
        }

        // --- 2. Mirrored Position ---
        if (useStore.getState().mirrorMode) {
          const mirrorX = width - smoothed.x;
          const offscreenMirror = document.createElement("canvas");
          offscreenMirror.width = blurAreaSize;
          offscreenMirror.height = blurAreaSize;
          const offscreenMirrorCtx = offscreenMirror.getContext("2d");
          if (offscreenMirrorCtx) {
            offscreenMirrorCtx.drawImage(
              activeLayer.canvas!,
              mirrorX - blurAreaSize / 2,
              smoothed.y - blurAreaSize / 2,
              blurAreaSize,
              blurAreaSize,
              0,
              0,
              blurAreaSize,
              blurAreaSize
            );

            const blurredCanvasMirror = document.createElement("canvas");
            blurredCanvasMirror.width = blurAreaSize;
            blurredCanvasMirror.height = blurAreaSize;
            const blurredCtxMirror = blurredCanvasMirror.getContext("2d");
            if (blurredCtxMirror) {
              blurredCtxMirror.filter = `blur(${blurRadius}px)`;
              blurredCtxMirror.drawImage(offscreenMirror, 0, 0);

              blurredCtxMirror.filter = "none";
              blurredCtxMirror.globalCompositeOperation = "destination-in";

              const grad = blurredCtxMirror.createRadialGradient(
                blurAreaSize / 2, blurAreaSize / 2, 0,
                blurAreaSize / 2, blurAreaSize / 2, brushSize / 2
              );
              const maxOpacity = useStore.getState().brushOpacity / 100;
              grad.addColorStop(0, `rgba(0,0,0,${maxOpacity})`);
              grad.addColorStop(1, "rgba(0,0,0,0)");

              blurredCtxMirror.fillStyle = grad;
              blurredCtxMirror.fillRect(0, 0, blurAreaSize, blurAreaSize);

              ctx.save();
              ctx.globalCompositeOperation = isAlphaLocked ? "source-atop" : "source-over";
              ctx.drawImage(
                blurredCanvasMirror,
                mirrorX - blurAreaSize / 2,
                smoothed.y - blurAreaSize / 2
              );
              ctx.restore();
            }
          }
        }
      }
    } else if (tool === "smudge") {
      ctx.globalAlpha = 0.8;
      ctx.drawImage(
        activeLayer.canvas!,
        lastPosRef.current.x - brushSize / 2,
        lastPosRef.current.y - brushSize / 2,
        brushSize,
        brushSize,
        smoothed.x - brushSize / 2,
        smoothed.y - brushSize / 2,
        brushSize,
        brushSize,
      );
      if (useStore.getState().mirrorMode) {
        ctx.drawImage(
          activeLayer.canvas!,
          width - lastPosRef.current.x - brushSize / 2,
          lastPosRef.current.y - brushSize / 2,
          brushSize,
          brushSize,
          width - smoothed.x - brushSize / 2,
          smoothed.y - brushSize / 2,
          brushSize,
          brushSize,
        );
      }
      ctx.globalAlpha = 1.0;
    }

    renderDisplay();
    lastPosRef.current = smoothed;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const startPos = pointerStartPosRef.current.get(e.pointerId);
    const duration = Date.now() - pointerDownTimeRef.current;

    // Detect double/triple tap for undo/redo (on mobile)
    if (
      duration < 250 &&
      startPos &&
      Math.hypot(e.clientX - startPos.clientX, e.clientY - startPos.clientY) < 10
    ) {
      if (activePointersRef.current.size === 2) useStore.getState().undo();
      else if (activePointersRef.current.size === 3) useStore.getState().redo();
    }

    const now = Date.now();
    const startTime = (window as any)._lastGestureStartTime || 0;
    const pointerCount = (window as any)._lastGesturePointerCount || 0;
    
    // If it was a quick multi-finger tap (less than 250ms)
    if (now - startTime < 250 && activePointersRef.current.size === 0) {
      if (pointerCount === 2) {
        useStore.getState().undo();
        useStore.getState().setGestureFeedback('Desfazer');
      } else if (pointerCount === 3) {
        useStore.getState().redo();
        useStore.getState().setGestureFeedback('Refazer');
      }
    }
    
    (window as any)._lastGestureStartTime = 0;
    (window as any)._lastGesturePointerCount = 0;

    activePointersRef.current.delete(e.pointerId);
    pointerStartPosRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      setGesture(null);
      if (previousToolRef.current) {
        useStore.getState().setTool(previousToolRef.current);
        previousToolRef.current = null;
      }
    }

    const wasDrawing = isDrawingRef.current;
    isDrawingRef.current = false;
    const { fillMode } = useStore.getState();
    const isEraseFill = tool === "fill" && fillMode === "erase";
    
    if (wasDrawing && (tool === "fill") && duration < 500 && startPos && Math.hypot(e.clientX - startPos.clientX, e.clientY - startPos.clientY) < 10) {
      const coords = getCoordinates(e);
      const activeLayer = layers.find((l) => l.id === activeLayerId);
      if (activeLayer && activeLayer.ctx && activeLayer.visible) {
        const tolerance = useStore.getState().fillTolerance;
        if (tolerance > 85 && tolerance <= 100) {
          useStore.setState({ appFrozen: true });
        } else if (tolerance > 100) {
          // Pinte a tela inteira sem travar
          activeLayer.ctx.save();
          if (isEraseFill) {
            activeLayer.ctx.globalCompositeOperation = "destination-out";
            activeLayer.ctx.fillStyle = "#000000";
          } else {
            activeLayer.ctx.fillStyle = color;
          }
          activeLayer.ctx.globalAlpha = brushOpacity / 100;
          activeLayer.ctx.fillRect(0, 0, width, height);
          activeLayer.ctx.restore();
          renderDisplay();

          if (activeCollaborationId && user) {
            const strokeData = {
              type: isEraseFill ? "eraser_fill_all" : "fill_all",
              color: color,
              brushOpacity: brushOpacity,
              layerId: activeLayer.id,
            };
            addDoc(collection(db, `collaborations/${activeCollaborationId}/strokes`), {
              userId: user.uid,
              data: JSON.stringify(strokeData),
              createdAt: serverTimestamp(),
            }).catch((err) => console.error("Error broadcasting fill_all:", err));
          }

          if (animationEnabled) useStore.getState()._saveCurrentCels();
          setTimeout(() => useStore.getState().pushHistory(), 10);
        } else {
          const startX = Math.floor(coords.x);
          const startY = Math.floor(coords.y);
          if (startX >= 0 && startX < width && startY >= 0 && startY < height) {
            const imageData = activeLayer.ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            const startIdx = (startY * width + startX) * 4;

            const sr = data[startIdx];
            const sg = data[startIdx + 1];
            const sb = data[startIdx + 2];
            const sa = data[startIdx + 3];

            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            const fr = r, fg = g, fb = b;

            const match = (idx) => {
              if (sa === 0 && data[idx + 3] === 0) return true;
              const dist =
                Math.abs(data[idx] - sr) +
                Math.abs(data[idx + 1] - sg) +
                Math.abs(data[idx + 2] - sb) +
                Math.abs(data[idx + 3] - sa);
              return dist <= tolerance * 2.55 * 4;
            };

            if (match(startIdx)) {
              const maskData = new Uint8ClampedArray(width * height * 4);
              let filledPixels = 0;

              const queue = [{ x: startX, y: startY }];
              const visited = new Uint8Array(width * height);

              while (queue.length > 0) {
                let currX = queue[0].x;
                let y = queue[0].y;
                queue.shift();
                
                let idx = (y * width + currX) * 4;

                while (currX >= 0 && match(idx)) {
                  currX--;
                  idx -= 4;
                }
                currX++;
                idx += 4;

                let spanUp = false;
                let spanDown = false;

                while (currX < width && match(idx)) {
                  maskData[idx] = fr;
                  maskData[idx + 1] = fg;
                  maskData[idx + 2] = fb;
                  maskData[idx + 3] = 255;

                  data[idx] = 255;
                  data[idx + 1] = 255;
                  data[idx + 2] = 255;
                  data[idx + 3] = 255;
                  filledPixels++;

                  if (y > 0) {
                    const upIdx = ((y - 1) * width + currX) * 4;
                    if (!visited[(y - 1) * width + currX] && match(upIdx)) {
                      if (!spanUp) {
                        queue.push({ x: currX, y: y - 1 });
                        spanUp = true;
                      }
                    } else {
                      spanUp = false;
                    }
                  }
                  if (y < height - 1) {
                    const downIdx = ((y + 1) * width + currX) * 4;
                    if (!visited[(y + 1) * width + currX] && match(downIdx)) {
                      if (!spanDown) {
                        queue.push({ x: currX, y: y + 1 });
                        spanDown = true;
                      }
                    } else {
                      spanDown = false;
                    }
                  }
                  currX++;
                  idx += 4;
                }
              }

              if (filledPixels > 0) {
                const offscreen = document.createElement("canvas");
                offscreen.width = width;
                offscreen.height = height;
                const offCtx = offscreen.getContext("2d");
                offCtx.putImageData(new ImageData(maskData, width, height), 0, 0);
                
                activeLayer.ctx.save();
                if (isEraseFill) {
                  activeLayer.ctx.globalCompositeOperation = "destination-out";
                } else {
                  activeLayer.ctx.globalCompositeOperation = "source-over";
                }
                activeLayer.ctx.globalAlpha = brushOpacity / 100;
                activeLayer.ctx.drawImage(offscreen, 0, 0);
                activeLayer.ctx.restore();

                renderDisplay();
                useStore.getState().pushHistory();
                
                if (activeCollaborationId && user) {
                  // We would ideally broadcast the fill region here, but for now we skip broadcasting full floodfill to avoid huge payloads
                  // Same as it was before.
                }
              }
            }
          }
        }
      }
    }


    // Commit Shape
    if (
      (wasDrawing &&
        ["line", "rect", "circle", "star"].includes(tool) &&
        startPosRef.current &&
        lastPosRef.current) ||
      (tool === "text" && lastPosRef.current)
    ) {
      const state = useStore.getState();
      const activeLayer = layers.find((l) => l.id === activeLayerId);

      if (activeLayer) {
        if (activeLayer.type === "vector") {
          // Push to elements array
          let newShape: any = null;
          const start = startPosRef.current || lastPosRef.current;
          const current = lastPosRef.current;
          const baseShape = {
            color: state.color,
            thickness: state.brushSize,
            style: state.shapeStyle as "stroke" | "fill",
          };

          if (tool === "line")
            newShape = {
              type: "line",
              x1: start.x,
              y1: start.y,
              x2: current.x,
              y2: current.y,
              color: baseShape.color,
              thickness: baseShape.thickness,
            };
          else if (tool === "rect") {
            newShape = {
              ...baseShape,
              type: "rect",
              x: Math.min(start.x, current.x),
              y: Math.min(start.y, current.y),
              w: Math.abs(current.x - start.x),
              h: Math.abs(current.y - start.y),
            };
          } else if (tool === "circle") {
            newShape = {
              ...baseShape,
              type: "circle",
              x: start.x,
              y: start.y,
              r: Math.hypot(current.x - start.x, current.y - start.y),
            };
          } else if (tool === "star") {
            newShape = {
              ...baseShape,
              type: "star",
              x: start.x,
              y: start.y,
              r1: Math.hypot(current.x - start.x, current.y - start.y),
              r2: Math.hypot(current.x - start.x, current.y - start.y) * 0.4,
              points: state.starPoints,
            };
          } else if (tool === "text") {
            newShape = {
              type: "text",
              x: current.x,
              y: current.y,
              color: state.color,
              size: state.brushSize * 2,
              text: state.textContent,
              style: "fill",
              font: state.textFont,
            };
          }

          if (activeLayer.elements && newShape) {
            activeLayer.elements.push(newShape);
          }
          if (state.animationEnabled) state._saveCurrentCels();
          setTimeout(() => {
            renderDisplay();
            state.pushHistory();
          }, 10);
          const interactionCtx = interactionCanvasRef.current?.getContext("2d");
          if (interactionCtx) interactionCtx.clearRect(0, 0, 99999, 99999);
        } else if (activeLayer.ctx) {
          // Direct Draw
          const tempCanvas = interactionCanvasRef.current;
          const ctx = activeLayer.ctx;
          const currentPos = lastPosRef.current || startPosRef.current;
          if (tool === "text" && currentPos) {
            ctx.font = `${state.brushSize * 2}px ${state.textFont}`;
            ctx.fillStyle = state.color;
            ctx.fillText(state.textContent, currentPos.x, currentPos.y);
          } else if (tempCanvas) {
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
            ctx.drawImage(tempCanvas, 0, 0);
          }
          const interactionCtx = interactionCanvasRef.current?.getContext("2d");
          if (interactionCtx) interactionCtx.clearRect(0, 0, 99999, 99999);
          if (state.animationEnabled) state._saveCurrentCels();
          setTimeout(() => {
            renderDisplay();
            state.pushHistory();
          }, 10);
        }
      }
    }

    draggingPointIndexRef.current = null;
    isDrawingRef.current = false;
    lastPosRef.current = null;
    startPosRef.current = null;
    draggingBezierRef.current = null;
    pointsHistoryRef.current = [];

    if (wasDrawing && tool === "select-rect") {
      const selectionType = useStore.getState().selectionType;
      if (selectionType === "lasso" && lassoPointsRef.current.length > 2) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        lassoPointsRef.current.forEach(pt => {
          if (pt.x < minX) minX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y > maxY) maxY = pt.y;
        });

        const selWidth = Math.max(1, Math.ceil(maxX - minX));
        const selHeight = Math.max(1, Math.ceil(maxY - minY));

        // Create a mask canvas for the lasso shape
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = selWidth;
        maskCanvas.height = selHeight;
        const maskCtx = maskCanvas.getContext("2d")!;

        maskCtx.fillStyle = "black";
        maskCtx.beginPath();
        lassoPointsRef.current.forEach((pt, i) => {
          if (i === 0) maskCtx.moveTo(pt.x - minX, pt.y - minY);
          else maskCtx.lineTo(pt.x - minX, pt.y - minY);
        });
        maskCtx.closePath();
        maskCtx.fill();

        setSelection({
          x: minX,
          y: minY,
          w: selWidth,
          h: selHeight,
          maskCanvas: maskCanvas
        });
        const interactionCtx = interactionCanvasRef.current?.getContext("2d");
        if (interactionCtx) interactionCtx.clearRect(0, 0, 99999, 99999);
      }
    }

    if (
      wasDrawing &&
      ["brush", "eraser", "pixel", "pixel_eraser", "blur", "smudge", "screentone"].includes(
        tool,
      )
    ) {
      if (activeCollaborationId && user && ["brush", "eraser", "pixel", "pixel_eraser"].includes(tool) && currentStrokePointsRef.current.length > 0) {
        const strokeData = {
          type: "freehand",
          points: currentStrokePointsRef.current,
          color: color,
          brushSize: brushSize,
          brushOpacity: brushOpacity,
          brushTexture: brushTexture,
          brushHardness: useStore.getState().brushHardness,
          brushSpacing: useStore.getState().brushSpacing,
          brushScatter: useStore.getState().brushScatter,
          tool: tool,
          layerId: useStore.getState().activeLayerId,
        };
        addDoc(collection(db, `collaborations/${activeCollaborationId}/strokes`), {
          userId: user.uid,
          data: JSON.stringify(strokeData),
          createdAt: serverTimestamp(),
        }).catch((e) => console.error("Error broadcasting freehand stroke:", e));
      }

      if (animationEnabled) useStore.getState()._saveCurrentCels();
      setTimeout(() => useStore.getState().pushHistory(), 10);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] min-w-0 overflow-hidden relative">
      {/* Document Tab Bar */}
      <div className="h-7 bg-[#2d2d2d] flex items-center px-2 shrink-0 border-b border-[#1a1a1a]">
        <div className="h-full px-4 bg-[#3a3a3a] border-x border-[#1a1a1a] flex items-center gap-2 text-[11px] text-zinc-300">
          <span className="truncate max-w-[120px]">Illustration.cloud</span>
          <button 
            onClick={() => {
              if (window.confirm("Deseja realmente limpar o canvas?")) {
                useStore.getState().clearCanvas();
              }
            }}
            className="text-zinc-500 hover:text-zinc-300"
            title="Limpar Canvas"
          >
            ×
          </button>
        </div>
      </div>

      {/* Tool Options Bar */}
      {[
        "brush",
        "eraser",
        "pixel_eraser",
        "blur",
        "smudge",
        "line",
        "rect",
        "circle",
        "star",
        "bezier",
        "pixel",
      ].includes(tool) && (
        <div className="h-9 bg-[#222222] flex items-center px-4 shrink-0 border-b border-[#1a1a1a] gap-4 text-xs text-zinc-300 select-none">
          <span className="font-bold text-indigo-400 uppercase tracking-wider text-[10px] bg-[#4c4cff]/10 px-1.5 py-0.5 rounded border border-[#4c4cff]/20">
            {t("tool_" + tool)}
          </span>
          <div className="flex items-center gap-2 flex-1 max-w-[240px]">
            <span className="text-zinc-500 text-[10px] uppercase font-semibold">
              Tamanho:
            </span>
            <input
              type="range"
              min="1"
              max="200"
              value={brushSize}
              onChange={(e) =>
                useStore.getState().setBrushSize(parseInt(e.target.value))
              }
              className="flex-1 h-1 bg-zinc-800 appearance-none rounded-full accent-[#4c4cff] cursor-pointer"
            />
            <span className="font-mono text-zinc-400 min-w-[36px] text-right text-[11px]">
              {brushSize}px
            </span>
          </div>
          {["brush", "bezier", "pixel"].includes(tool) && (
            <div className="flex items-center gap-2 flex-1 max-w-[240px]">
              <span className="text-zinc-500 text-[10px] uppercase font-semibold">
                Opacidade:
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={brushOpacity}
                onChange={(e) =>
                  useStore.getState().setBrushOpacity(parseInt(e.target.value))
                }
                className="flex-1 h-1 bg-zinc-800 appearance-none rounded-full accent-[#4c4cff] cursor-pointer"
              />
              <span className="font-mono text-zinc-400 min-w-[32px] text-right text-[11px]">
                {brushOpacity}%
              </span>
            </div>
          )}

          {/* Grid Toggle on Options Bar */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => useStore.getState().setMirrorMode(!useStore.getState().mirrorMode)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all border ${useStore.getState().mirrorMode ? "bg-purple-600/20 border-purple-500/40 text-purple-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400"}`}
              title="Ferramenta Mirror (Modo Espelhado)"
            >
              Mirror: {useStore.getState().mirrorMode ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => useStore.getState().setShowRulers(!showRulers)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all border ${showRulers ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400"}`}
            >
              Régua: {showRulers ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => useStore.getState().setShowGrid(!showGrid)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all border ${showGrid ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400"}`}
            >
              Grade: {showGrid ? "ON" : "OFF"}
            </button>
            {showGrid && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-500 text-[9px] uppercase font-semibold">
                  Tam Grade:
                </span>
                <input
                  type="number"
                  min="2"
                  max="128"
                  value={gridSize}
                  onChange={(e) =>
                    useStore
                      .getState()
                      .setGridSize(
                        Math.max(
                          2,
                          Math.min(128, parseInt(e.target.value) || 16),
                        ),
                      )
                  }
                  className="w-10 bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] text-center rounded font-mono py-0.5"
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 relative bg-[#1e1e1e]">
        {/* Rulers Toggle & Status Bar */}
        {showRulers && (
          <div className="h-5 flex bg-[#222222] border-b border-[#151515] text-[9px] text-zinc-400 font-mono select-none relative z-20 shrink-0">
            <button
              onClick={() => useStore.getState().setShowRulers(false)}
              title="Desativar Régua"
              className="w-5 shrink-0 border-r border-[#151515] flex items-center justify-center text-zinc-400 font-bold bg-[#1a1a1a] hover:bg-red-950 hover:text-red-300 transition-colors cursor-pointer text-[8px]"
            >
              ✕
            </button>
            <canvas
              ref={topRulerCanvasRef}
              className="flex-1 h-5 pointer-events-none"
            />
          </div>
        )}

        <div className="flex-1 flex min-h-0 relative">
          {showRulers && (
            <div className="w-5 shrink-0 bg-[#222222] border-r border-[#151515] text-[9px] text-zinc-400 font-mono select-none relative z-20">
              <canvas
                ref={leftRulerCanvasRef}
                className="w-5 h-full pointer-events-none"
              />
            </div>
          )}

          <div
            ref={containerRef}
            className={twMerge(
              "canvas-area flex-1 min-h-0 bg-[#1a1a1a] overflow-hidden relative flex items-center justify-center transition-colors duration-300",
              width <= 128 || height <= 128 ? "" : "p-8"
            )}
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Infinite Grid Background for unlimited feel */}
            <div 
              className="absolute inset-[-10000px] pointer-events-none opacity-40" 
              style={{
                backgroundImage: `
                  linear-gradient(to right, #222 1px, transparent 1px),
                  linear-gradient(to bottom, #222 1px, transparent 1px)
                `,
                backgroundSize: '100px 100px',
                transform: `translate(${pan?.x || 0}px, ${pan?.y || 0}px) scale(${zoom / 100})`,
              }}
            />

            <div
              className="relative shadow-2xl bg-transparent origin-center"
              style={{
                width: width,
                height: height,
                minWidth: width,
                minHeight: height,
                transform: `translate(${pan?.x || 0}px, ${pan?.y || 0}px) scale(${zoom / 100}) rotate(${rotation || 0}deg)`,
              }}
            >
              <MultiplayerCursors activeCollaborationId={activeCollaborationId} user={user} zoom={zoom} />
              {/* Background checkerboard for transparency */}
              <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage:
                    "conic-gradient(#808080 25%, transparent 25%, transparent 50%, #808080 50%, #808080 75%, transparent 75%, transparent)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Display Canvas (Composited Layers) */}
              <canvas
                ref={displayCanvasRef}
                width={width}
                height={height}
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  width: "100%", 
                  height: "100%",
                  imageRendering: useStore.getState().toolInterpolation === "nearest" ? "pixelated" : "auto"
                }}
              />

              {/* Grid Overlay */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    backgroundImage: `
                linear-gradient(to right, rgba(128, 128, 128, 0.35) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(128, 128, 128, 0.35) 1px, transparent 1px)
              `,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                  }}
                />
              )}

              {/* Floating Selection Canvas Overlay */}
              {floatingSelection && (
                <WarpedSelectionOverlay
                  width={width}
                  height={height}
                  floatingSelection={floatingSelection}
                  transformPoints={transformPoints}
                  transformMode={transformMode}
                  activeLayerId={activeLayerId}
                  layers={layers}
                />
              )}
              
              <RulerOverlay width={width} height={height} />

              {/* Mesh Outlines for Transformation */}
              {floatingSelection && transformPoints && (
                <svg
                  className="absolute inset-0 pointer-events-none z-25 overflow-visible"
                  width={width}
                  height={height}
                  style={{ width: "100%", height: "100%" }}
                >
                  {/* Perspective / Normal outline */}
                  {transformPoints.length === 4 && (
                    <polygon
                      points={transformPoints.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                  )}

                  {/* Puppet Grid outline */}
                  {transformPoints.length === 9 && (
                    <>
                      {/* Rows */}
                      <path
                        d={`M ${transformPoints[0].x} ${transformPoints[0].y} Q ${transformPoints[1].x} ${transformPoints[1].y} ${transformPoints[2].x} ${transformPoints[2].y}`}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                      <path
                        d={`M ${transformPoints[3].x} ${transformPoints[3].y} Q ${transformPoints[4].x} ${transformPoints[4].y} ${transformPoints[5].x} ${transformPoints[5].y}`}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                      <path
                        d={`M ${transformPoints[6].x} ${transformPoints[6].y} Q ${transformPoints[7].x} ${transformPoints[7].y} ${transformPoints[8].x} ${transformPoints[8].y}`}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                      {/* Cols */}
                      <path
                        d={`M ${transformPoints[0].x} ${transformPoints[0].y} Q ${transformPoints[3].x} ${transformPoints[3].y} ${transformPoints[6].x} ${transformPoints[6].y}`}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                      <path
                        d={`M ${transformPoints[1].x} ${transformPoints[1].y} Q ${transformPoints[4].x} ${transformPoints[4].y} ${transformPoints[7].x} ${transformPoints[7].y}`}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                      <path
                        d={`M ${transformPoints[2].x} ${transformPoints[2].y} Q ${transformPoints[5].x} ${transformPoints[5].y} ${transformPoints[8].x} ${transformPoints[8].y}`}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                    </>
                  )}
                </svg>
              )}

              {/* Handle Points */}
              {floatingSelection && transformPoints && (
                <div className="absolute inset-0 pointer-events-none z-30">
                  {transformPoints.map((pt, idx) => {
                    const isCenter = transformPoints.length === 9 && idx === 4;
                    return (
                      <div
                        key={idx}
                        className={twMerge(
                          "transform-handle-point absolute w-14 h-14 -ml-7 -mt-7 rounded-full border-2 border-indigo-600 bg-white shadow-md cursor-pointer pointer-events-auto transition-transform hover:scale-125 active:scale-110 flex items-center justify-center",
                          isCenter && "bg-amber-400 border-amber-600"
                        )}
                        style={{
                          left: pt.x,
                          top: pt.y,
                        }}
                      >
                        {/* A small dot in the center for precise positioning */}
                        <div className={twMerge("w-3 h-3 rounded-full bg-indigo-600", isCenter && "bg-amber-800")} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selection Outline */}
              {selection && (
                <>
                  <div
                    className="absolute pointer-events-none border-dashed"
                    style={{
                      left: selection.x,
                      top: selection.y,
                      width: selection.w,
                      height: selection.h,
                      boxShadow: "0 0 0 1px white inset",
                    }}
                  />
                  {selection.maskCanvas && <SelectionMaskOverlay selection={selection} />}
                </>
              )}

              {/* Interaction Layer */}
              <canvas
                ref={interactionCanvasRef}
                width={width}
                height={height}
                className="absolute inset-0 touch-none"
                style={{ width: "100%", height: "100%", cursor: getCursorStyle(tool) }}
                onPointerLeave={() => setCursorPos(null)}
              />

              {/* Remote Cursors */}
              {Object.entries(remoteCursors).map(([id, rc]: [string, any]) => {
                if (Date.now() - rc.updatedAt > 10000) return null;
                return (
                  <div
                    key={id}
                    className="absolute pointer-events-none transition-all duration-75 ease-out z-50"
                    style={{
                      left: rc.x,
                      top: rc.y,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="w-4 h-4 rounded-full border border-white shadow-lg overflow-hidden relative"
                        style={{ backgroundColor: rc.color }}
                      >
                        {rc.photo && (
                          <img
                            src={rc.photo}
                            className="w-full h-full object-cover opacity-80"
                          />
                        )}
                      </div>
                      <div className="bg-black/85 backdrop-blur-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 shadow-md border border-white/20 whitespace-nowrap flex items-center gap-1.5">
                        <span>{rc.name}</span>
                        {rc.tool && (
                          <span className="text-indigo-300 font-extrabold bg-indigo-500/10 px-1 rounded border border-indigo-500/20 text-[8px]">
                            {getFriendlyToolName(rc.tool)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Floating Coordinates Overlay */}
            <div className="absolute bottom-3 left-3 flex gap-2 z-30">
               <button 
                 onClick={fitToScreen}
                 className="bg-[#111]/90 px-3 py-1.5 rounded-lg text-[10px] font-bold text-zinc-300 border border-zinc-800 backdrop-blur-sm shadow-lg hover:bg-zinc-800 transition-all flex items-center gap-2"
               >
                 <Maximize2 size={12} className="text-indigo-400" />
                 AJUSTAR À TELA
               </button>
            </div>

            {cursorPos && (
              <div className="absolute bottom-3 right-3 bg-[#111]/90 px-2.5 py-1 rounded text-[10px] font-mono text-zinc-300 z-30 pointer-events-none flex items-center gap-3 border border-zinc-800 backdrop-blur-sm shadow-lg">
                <span className="text-indigo-400 font-bold uppercase text-[8px] tracking-wider">
                  Régua
                </span>
                <span>
                  X:{" "}
                  <strong className="text-white">
                    {Math.round(cursorPos.x)}
                  </strong>{" "}
                  px
                </span>
                <span>
                  Y:{" "}
                  <strong className="text-white">
                    {Math.round(cursorPos.y)}
                  </strong>{" "}
                  px
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
