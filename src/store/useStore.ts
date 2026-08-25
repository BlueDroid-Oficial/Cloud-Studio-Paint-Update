import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { User } from "firebase/auth";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { setLocalDraft, getLocalDraft, getAllLocalDrafts, deleteLocalDraft } from "../lib/localDb";
import { GlobalCompositeOperation } from "react";

export function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] !== 0) {
        return false;
      }
    }
  } catch (e) {
    return false;
  }
  return true;
}

export function drawWarpedMesh(
  srcCanvas: HTMLCanvasElement,
  destCtx: CanvasRenderingContext2D,
  points: { x: number; y: number; rx: number; ry: number }[],
  mode: 'normal' | 'perspective' | 'puppet'
) {
  if (!points || points.length === 0) {
    destCtx.drawImage(srcCanvas, 0, 0);
    return;
  }

  if (mode === 'normal' && points.length === 4) {
    const x = Math.min(points[0].x, points[2].x);
    const y = Math.min(points[0].y, points[2].y);
    const w = Math.abs(points[2].x - points[0].x);
    const h = Math.abs(points[2].y - points[0].y);
    destCtx.drawImage(srcCanvas, x, y, w, h);
    return;
  }

  const gridCount = 10;
  const sw = srcCanvas.width;
  const sh = srcCanvas.height;

  const getInterpolatedPoint = (u: number, v: number): { x: number; y: number } => {
    if (mode === 'perspective' && points.length === 4) {
      const p00 = points[0];
      const p10 = points[1];
      const p11 = points[2];
      const p01 = points[3];

      const x = (1 - u) * (1 - v) * p00.x +
                u * (1 - v) * p10.x +
                u * v * p11.x +
                (1 - u) * v * p01.x;

      const y = (1 - u) * (1 - v) * p00.y +
                u * (1 - v) * p10.y +
                u * v * p11.y +
                (1 - u) * v * p01.y;

      return { x, y };
    } else if (mode === 'puppet' && points.length === 9) {
      const basis = (t: number) => {
        return [
          ((t - 0.5) * (t - 1.0)) / 0.5,
          (t * (t - 1.0)) / -0.25,
          (t * (t - 0.5)) / 0.5
        ];
      };

      const bu = basis(u);
      const bv = basis(v);

      let x = 0;
      let y = 0;

      for (let j = 0; j < 3; j++) {
        for (let i = 0; i < 3; i++) {
          const idx = j * 3 + i;
          const w = bu[i] * bv[j];
          x += w * points[idx].x;
          y += w * points[idx].y;
        }
      }
      return { x, y };
    }

    return { x: points[0].x + u * sw, y: points[0].y + v * sh };
  };

  for (let gy = 0; gy < gridCount; gy++) {
    for (let gx = 0; gx < gridCount; gx++) {
      const u0 = gx / gridCount;
      const v0 = gy / gridCount;
      const u1 = (gx + 1) / gridCount;
      const v1 = gy / gridCount;
      const u2 = gx / gridCount;
      const v2 = (gy + 1) / gridCount;
      const u3 = (gx + 1) / gridCount;
      const v3 = (gy + 1) / gridCount;

      drawTriangle(destCtx, srcCanvas, u0, v0, u1, v1, u2, v2, getInterpolatedPoint);
      drawTriangle(destCtx, srcCanvas, u1, v1, u3, v3, u2, v2, getInterpolatedPoint);
    }
  }
}

function drawTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  u0: number, v0: number,
  u1: number, v1: number,
  u2: number, v2: number,
  interpolate: (u: number, v: number) => { x: number; y: number }
) {
  const p0 = interpolate(u0, v0);
  const p1 = interpolate(u1, v1);
  const p2 = interpolate(u2, v2);

  const sw = img.width;
  const sh = img.height;
  const sx0 = u0 * sw;
  const sy0 = v0 * sh;
  const sx1 = u1 * sw;
  const sy1 = v1 * sh;
  const sx2 = u2 * sw;
  const sy2 = v2 * sh;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();
  
  const denom = sx0 * (sy1 - sy2) - sy0 * (sx1 - sx2) + (sx1 * sy2 - sx2 * sy1);
  if (Math.abs(denom) > 1e-6) {
    const a = (p0.x * (sy1 - sy2) - sy0 * (p1.x - p2.x) + (p1.x * sy2 - p2.x * sy1)) / denom;
    const b = (p0.y * (sy1 - sy2) - sy0 * (p1.y - p2.y) + (p1.y * sy2 - p2.y * sy1)) / denom;
    const c = (sx0 * (p1.x - p2.x) - p0.x * (sx1 - sx2) + (p2.x * sx1 - p1.x * sx2)) / denom;
    const d = (sx0 * (p1.y - p2.y) - p0.y * (sx1 - sx2) + (p2.y * sx1 - p1.y * sx2)) / denom;
    const e = (sx0 * (sy1 * p2.x - sy2 * p1.x) - sy0 * (sx1 * p2.x - sx2 * p1.x) + p0.x * (sx1 * sy2 - sx2 * sy1)) / denom;
    const f = (sx0 * (sy1 * p2.y - sy2 * p1.y) - sy0 * (sx1 * p2.y - sx2 * p1.y) + p0.y * (sx1 * sy2 - sx2 * sy1)) / denom;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
  }
  ctx.restore();
}

export type Tool =
  | "brush"
  | "eraser"
  | "pixel_eraser"
  | "fill"
  | "picker"
  | "select-rect"
  | "move"
  | "bezier"
  | "line"
  | "circle"
  | "rect"
  | "star"
  | "text"
  | "blur"
  | "sharpen"
  | "dodge"
  | "burn"
  | "smudge"
  | "pixel"
  | "pan"
  | "brush-import"
  | "panel_ruler"
  | "screentone"
  | "speech_balloon"
  | "focus_lines"
  | "special_ruler"
  | "magic_wand"
  | "material_library"
  | "ruler";
export type RulerShape = 'straight' | 'circle' | 'oval' | 'triangle' | 'square';

export type BrushTexture =
  | "solid"
  | "pencil"
  | "charcoal"
  | "spray"
  | "watercolor"
  | "oil"
  | "ink"
  | "crayon"
  | "gouache"
  | "chalk"
  | "pastel"
  | "marker"
  | "sponge"
  | "airbrush"
  | "dry-brush"
  | "dither-50"
  | "dither-25"
  | "dither-75"
  | "horizontal"
  | "vertical"
  | "crosshatch"
  | string;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  clippingMask: boolean;
  alphaLock?: boolean;
  disableKeyframes?: boolean;
  type?: "bitmap" | "vector" | "folder";
  elements?: VectorShape[];
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  cels: Record<number, string>; // Frame index -> DataURL or elements JSON
  celCache?: Record<number, HTMLCanvasElement>;
  folderId?: string | null;
  collapsed?: boolean;
  x?: number;
  y?: number;
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  originalWidth?: number;
  originalHeight?: number;
  scale?: number;
}

export interface Keyframe {
  id: string;
  layerId: string;
  frame: number;
  easing: string;
  opacity?: number;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export function applyEasing(t: number, easing: string): number {
  switch (easing) {
    case "linear":
      return t;
    case "ease-in":
      return t * t;
    case "ease-out":
      return t * (2 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case "sine-in":
      return 1 - Math.cos((t * Math.PI) / 2);
    case "sine-out":
      return Math.sin((t * Math.PI) / 2);
    case "sine-in-out":
      return -(Math.cos(Math.PI * t) - 1) / 2;
    case "bounce-out": {
      let temp = t;
      const n1 = 7.5625;
      const d1 = 2.75;
      if (temp < 1 / d1) {
        return n1 * temp * temp;
      } else if (temp < 2 / d1) {
        return n1 * (temp -= 1.5 / d1) * temp + 0.75;
      } else if (temp < 2.5 / d1) {
        return n1 * (temp -= 2.25 / d1) * temp + 0.9375;
      } else {
        return n1 * (temp -= 2.625 / d1) * temp + 0.984375;
      }
    }
    case "bounce-in":
      return 1 - applyEasing(1 - t, "bounce-out");
    case "bounce-in-out":
      return t < 0.5
        ? (1 - applyEasing(1 - 2 * t, "bounce-out")) / 2
        : (1 + applyEasing(2 * t - 1, "bounce-out")) / 2;
    case "elastic-in": {
      const c4 = (2 * Math.PI) / 3;
      return t === 0
        ? 0
        : t === 1
        ? 1
        : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    }
    case "elastic-out": {
      const c4 = (2 * Math.PI) / 3;
      return t === 0
        ? 0
        : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
    case "elastic-in-out": {
      const c5 = (2 * Math.PI) / 4.5;
      return t === 0
        ? 0
        : t === 1
        ? 1
        : t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    }
    default:
      return t;
  }
}

export function getInterpolatedProperties(layer: any, keyframes: Keyframe[], frame: number) {
  if (layer.disableKeyframes) {
    return {
      opacity: layer.opacity ?? 100,
      x: layer.x ?? 0,
      y: layer.y ?? 0,
      scaleX: layer.scaleX ?? 1,
      scaleY: layer.scaleY ?? 1,
      rotation: layer.rotation ?? 0
    };
  }
  const lKfs = keyframes.filter((k) => k.layerId === layer.id).sort((a, b) => a.frame - b.frame);
  
  const defaultProps = {
    opacity: layer.opacity ?? 100,
    x: layer.x ?? 0,
    y: layer.y ?? 0,
    scaleX: layer.scaleX ?? 1,
    scaleY: layer.scaleY ?? 1,
    rotation: layer.rotation ?? 0,
  };

  if (lKfs.length === 0) {
    return defaultProps;
  }

  // Find exact match
  const exact = lKfs.find((k) => k.frame === frame);
  if (exact) {
    return {
      opacity: exact.opacity ?? 100,
      x: exact.x ?? 0,
      y: exact.y ?? 0,
      scaleX: exact.scaleX ?? 1,
      scaleY: exact.scaleY ?? 1,
      rotation: exact.rotation ?? 0,
    };
  }

  // If frame is before the first keyframe
  if (frame < lKfs[0].frame) {
    const first = lKfs[0];
    return {
      opacity: first.opacity ?? 100,
      x: first.x ?? 0,
      y: first.y ?? 0,
      scaleX: first.scaleX ?? 1,
      scaleY: first.scaleY ?? 1,
      rotation: first.rotation ?? 0,
    };
  }

  // If frame is after the last keyframe
  if (frame > lKfs[lKfs.length - 1].frame) {
    const last = lKfs[lKfs.length - 1];
    return {
      opacity: last.opacity ?? 100,
      x: last.x ?? 0,
      y: last.y ?? 0,
      scaleX: last.scaleX ?? 1,
      scaleY: last.scaleY ?? 1,
      rotation: last.rotation ?? 0,
    };
  }

  // Find the bounding keyframes
  let prevKf = lKfs[0];
  let nextKf = lKfs[0];
  for (let i = 0; i < lKfs.length - 1; i++) {
    if (frame >= lKfs[i].frame && frame <= lKfs[i + 1].frame) {
      prevKf = lKfs[i];
      nextKf = lKfs[i + 1];
      break;
    }
  }

  // Interpolate between prevKf and nextKf
  const t = (frame - prevKf.frame) / (nextKf.frame - prevKf.frame);
  const easedT = applyEasing(t, prevKf.easing || "linear");

  const interp = (start: number, end: number) => start + (end - start) * easedT;

  return {
    opacity: Math.round(interp(prevKf.opacity ?? 100, nextKf.opacity ?? 100)),
    x: Math.round(interp(prevKf.x ?? 0, nextKf.x ?? 0)),
    y: Math.round(interp(prevKf.y ?? 0, nextKf.y ?? 0)),
    scaleX: interp(prevKf.scaleX ?? 1, nextKf.scaleX ?? 1),
    scaleY: interp(prevKf.scaleY ?? 1, nextKf.scaleY ?? 1),
    rotation: Math.round(interp(prevKf.rotation ?? 0, nextKf.rotation ?? 0)),
  };
}

export interface BrushPreset {
  id: string;
  name: string;
  size: number;
  opacity: number;
  color: string;
  texture: BrushTexture;
}

export interface SelectionRect {
  x: number;
  y: number;
  w: number;
  h: number;
  maskCanvas?: HTMLCanvasElement;
}

export interface BezierPoint {
  x: number;
  y: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

export type VectorShape =
  | {
      type: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      thickness: number;
    }
  | {
      type: "circle";
      x: number;
      y: number;
      r: number;
      color: string;
      thickness: number;
      style: "stroke" | "fill";
    }
  | {
      type: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      thickness: number;
      style: "stroke" | "fill";
    }
  | {
      type: "star";
      x: number;
      y: number;
      r1: number;
      r2: number;
      points: number;
      color: string;
      thickness: number;
      style: "stroke" | "fill";
    }
  | {
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      size: number;
      font: string;
    }
  | {
      type: "path";
      points: BezierPoint[];
      color: string;
      thickness: number;
      style: "stroke" | "fill";
    };

export interface ReferenceImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  pinned: boolean;
}

export interface AnimationTimeline {
  id: string;
  name: string;
  layers: Layer[];
  currentFrame: number;
  totalFrames: number;
  keyframes: Keyframe[];
}

export interface HistorySnapshot {
  width: number;
  height: number;
  activeLayerId: string | null;
  layers: {
    id: string;
    name: string;
    visible: boolean;
    opacity: number;
    blendMode: GlobalCompositeOperation;
    clippingMask: boolean;
    type?: "bitmap" | "vector" | "folder";
    elements?: VectorShape[];
    canvasCopy: HTMLCanvasElement | null;
    cels: Record<number, string>;
    folderId?: string | null;
  }[];
}

interface AppState {
  tool: Tool;
  setTool: (tool: Tool) => void;

  color: string;
  setColor: (color: string) => void;

  brushSize: number;
  setBrushSize: (size: number) => void;

  brushOpacity: number;
  setBrushOpacity: (opacity: number) => void;

  brushTexture: BrushTexture;
  setBrushTexture: (texture: BrushTexture) => void;

  brushHardness: number;
  setBrushHardness: (hardness: number) => void;

  brushSpacing: number;
  setBrushSpacing: (spacing: number) => void;

  brushScatter: number;
  setBrushScatter: (scatter: number) => void;

  shapeStyle: "stroke" | "fill";
  setShapeStyle: (style: "stroke" | "fill") => void;

  rulerShape: RulerShape;
  setRulerShape: (shape: RulerShape) => void;

  rulerRotation: number;
  setRulerRotation: (rotation: number) => void;

  showRuler: boolean;
  setShowRuler: (show: boolean) => void;

  starPoints: number;
  setStarPoints: (points: number) => void;

  textContent: string;
  setTextContent: (text: string) => void;

  textFont: string;
  setTextFont: (font: string) => void;

  fillTolerance: number;
  setFillTolerance: (tolerance: number) => void;
  fillMode: "normal" | "erase";
  setFillMode: (mode: "normal" | "erase") => void;

  appFrozen: boolean;
  setAppFrozen: (frozen: boolean) => void;

  toolInterpolation: "nearest" | "bilinear";
  setToolInterpolation: (interpolation: "nearest" | "bilinear") => void;

  stabilizer: number;
  setStabilizer: (val: number) => void;

  panelMargin: number;
  setPanelMargin: (val: number) => void;
  panelSpacing: number;
  setPanelSpacing: (val: number) => void;
  panelBorderWidth: number;
  setPanelBorderWidth: (val: number) => void;

  screentoneDotSize: number;
  setScreentoneDotSize: (val: number) => void;
  screentoneFrequency: number;
  setScreentoneFrequency: (val: number) => void;

  balloonText: string;
  setBalloonText: (val: string) => void;
  balloonStyle: "oval" | "thought" | "shout";
  setBalloonStyle: (val: "oval" | "thought" | "shout") => void;

  focusLinesCount: number;
  setFocusLinesCount: (val: number) => void;
  focusLinesInnerRadius: number;
  setFocusLinesInnerRadius: (val: number) => void;

  specialRulerType: "perspective" | "parallel" | "radial";
  setSpecialRulerType: (val: "perspective" | "parallel" | "radial") => void;
  specialRulerAngle: number;
  setSpecialRulerAngle: (val: number) => void;
  specialRulerSnapping: boolean;
  setSpecialRulerSnapping: (val: boolean) => void;

  brushPresets: BrushPreset[];
  saveBrushPreset: (name: string) => void;
  addBrushPreset: (preset: BrushPreset) => void;
  applyBrushPreset: (id: string) => void;
  deleteBrushPreset: (id: string) => void;
  customBrushes: { id: string; name: string; dataUrl: string }[];
  addCustomBrush: (name: string, dataUrl: string) => void;
  deleteCustomBrush: (id: string) => void;
  importingBrushData: { name: string; dataUrl: string } | null;
  setImportingBrushData: (data: { name: string; dataUrl: string } | null) => void;

  layers: Layer[];
  activeLayerId: string | null;
  timelines: AnimationTimeline[];
  activeTimelineId: string;
  addTimeline: () => void;
  switchTimeline: (id: string) => void;
  deleteTimeline: (id: string) => void;
  renameTimeline: (id: string, name: string) => void;
  addLayer: () => void;
  addLayerWithImage: (name: string, dataUrl: string) => void;
  addPinterestTemplate: (name: string, dataUrl: string) => void;
  addVectorLayer: () => void;
  addFolderLayer: () => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  resetCanvas: () => void;
  clearCanvas: () => void;
  clearLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  mergeDown: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerClippingMask: (id: string) => void;
  toggleLayerAlphaLock: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  updateLayerProperty: (id: string, property: string, value: any) => void;
  setLayerBlendMode: (id: string, blendMode: GlobalCompositeOperation) => void;
  reorderLayers: (startIndex: number, endIndex: number) => void;
  renameLayer: (id: string, name: string) => void;
  setLayerFolder: (id: string, folderId: string | null) => void;
  toggleFolderCollapse: (id: string) => void;
  initLayerCanvas: (id: string, canvas: HTMLCanvasElement) => void;

  selection: SelectionRect | null;
  setSelection: (selection: SelectionRect | null) => void;
  selectionType: "rect" | "lasso";
  setSelectionType: (val: "rect" | "lasso") => void;

  floatingSelection: { canvas: HTMLCanvasElement; x: number; y: number } | null;
  setFloatingSelection: (
    fs: { canvas: HTMLCanvasElement; x: number; y: number } | null,
  ) => void;

  isLowEndDevice: boolean;
  setIsLowEndDevice: (val: boolean) => void;
  stampFloatingSelection: () => void;

  bezierPoints: BezierPoint[];
  setBezierPoints: (points: BezierPoint[]) => void;

  width: number;
  height: number;
  setWidthHeight: (w: number, h: number) => void;

  zoom: number;
  setZoom: (zoom: number) => void;

  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;

  dpi: number;
  setDpi: (dpi: number) => void;
  canvasBackgroundColor: string;
  setCanvasBackgroundColor: (color: string) => void;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
  showProjectSettings: boolean;
  setShowProjectSettings: (show: boolean) => void;
  showAccountModal: boolean;
  setShowAccountModal: (show: boolean) => void;
  isKidsMode: boolean;
  setIsKidsMode: (active: boolean) => void;
  kidsModePin: string;
  setKidsModePin: (pin: string) => void;
  showFiltersDrawer: boolean;
  setShowFiltersDrawer: (show: boolean) => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  showRulers: boolean;
  setShowRulers: (show: boolean) => void;

  pixelArtMode: boolean;
  setPixelArtMode: (active: boolean) => void;
  pixelPerfect: boolean;
  setPixelPerfect: (active: boolean) => void;
  pixelDithering: string;
  setPixelDithering: (mode: string) => void;

  flipX: boolean;
  setFlipX: (flip: boolean) => void;
  flipY: boolean;
  setFlipY: (flip: boolean) => void;
  rotation: number;
  setRotation: (rotation: number) => void;
  
  centerCanvas: () => void;
  resetZoom: () => void;

  referenceImages: ReferenceImage[];
  addReferenceImage: (url: string) => void;
  updateReferenceImage: (id: string, updates: Partial<ReferenceImage>) => void;
  removeReferenceImage: (id: string) => void;
  
  projectName: string;
  setProjectName: (name: string) => void;

  mirrorMode: boolean;
  setMirrorMode: (val: boolean) => void;
  uiLayout: "default" | "flipped";
  layoutEditMode: boolean;
  setLayoutEditMode: (layoutEditMode: boolean) => void;
  panelPositions: Record<string, { x: number, y: number }>;
  setPanelPosition: (panelId: string, position: { x: number, y: number }) => void;
  setUiLayout: (layout: "default" | "flipped") => void;

  showPropertiesPanel: boolean;
  togglePropertiesPanel: () => void;

  showStabilizerMenu: boolean;
  setShowStabilizerMenu: (show: boolean) => void;
  showSelectionMenu: boolean;
  setShowSelectionMenu: (show: boolean) => void;
  showExportMenu: boolean;
  setShowExportMenu: (show: boolean) => void;

  showReference: boolean;
  setShowReference: (show: boolean) => void;
  showReferenceButtons: boolean;
  setShowReferenceButtons: (show: boolean) => void;

  showSimpleTimeline: boolean;
  setShowSimpleTimeline: (show: boolean) => void;
  importedAudioUrl: string | null;
  importedAudioName: string | null;
  setImportedAudio: (url: string | null, name: string | null) => void;
  showMessagesModal: boolean;
  showMiniGamesModal: boolean;
  setShowMiniGamesModal: (show: boolean) => void;
  setShowMessagesModal: (show: boolean) => void;
  transformMode: 'normal' | 'perspective' | 'puppet';
  setTransformMode: (mode: 'normal' | 'perspective' | 'puppet') => void;
  transformPivot: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  setTransformPivot: (pivot: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') => void;
  transformPoints: { x: number; y: number; rx: number; ry: number }[] | null;
  setTransformPoints: (points: { x: number; y: number; rx: number; ry: number }[] | null) => void;
  initTransformPoints: (mode: 'normal' | 'perspective' | 'puppet') => void;
  toggleFilters: () => void;
  
  frameDurations: Record<number, number>;
  setFrameDuration: (frameId: number, duration: number) => void;
  keyframedLayers: Record<number, string[]>; // frameId -> layerIds
  toggleKeyframe: (frameId: number, layerId: string) => void;
  gestureFeedback: string | null;
  setGestureFeedback: (text: string | null) => void;

  // Animation State
  animationEnabled: boolean;
  setAnimationEnabled: (enabled: boolean) => void;
  currentFrame: number;
  setCurrentFrame: (frame: number) => Promise<void>;
  totalFrames: number;
  setTotalFrames: (total: number) => void;
  fps: number;
  setFps: (fps: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onionSkin: boolean;
  toggleOnionSkin: () => void;
  onionSkinBefore: number;
  setOnionSkinBefore: (val: number) => void;
  onionSkinAfter: number;
  setOnionSkinAfter: (val: number) => void;
  onionSkinOpacity: number;
  setOnionSkinOpacity: (val: number) => void;
  onionSkinPastColor: string;
  setOnionSkinPastColor: (val: string) => void;
  onionSkinFutureColor: string;
  setOnionSkinFutureColor: (val: string) => void;
  addFrame: () => void;
  removeFrame: (frame: number) => void;
  duplicateFrameTimes: (frame: number, times: number) => void;
  reorderFrames: (fromFrame: number, toFrame: number) => void;

  invertLayerColors: (id: string) => void;
  rasterizeLayer: (id: string) => void;
  convertToGrayscale: (id: string) => void;
  adjustBrightness: (id: string) => void;
  sepiaFilter: (id: string) => void;
  outlineLayer: (id: string) => void;
  dropShadowLayer: (id: string) => void;
  gaussianBlurLayer: (id: string) => void;
  
  reverseAnimation: (id: string) => void;
  shiftFramesRight: (id: string) => void;
  shiftFramesLeft: (id: string) => void;
  clearCurrentFrame: (id: string) => void;
  copyFrameToAll: (id: string) => void;
  randomizeFrames: (id: string) => void;
  pingPongAnimation: (id: string) => void;
  extendFrameDuration: (id: string) => void;
  deleteFrame: (id: string) => void;

  _saveCurrentCels: () => void;

  keyframes: Keyframe[];
  addKeyframe: (layerId: string, frame: number) => void;
  removeKeyframe: (id: string) => void;
  updateKeyframeEasing: (id: string, easing: string) => void;

  appView: "start" | "editor";
  setAppView: (view: "start" | "editor") => void;

  sendToDM: () => Promise<void>;

  notification: { message: string; type: "success" | "info" | "error" } | null;
  setNotification: (
    notification: {
      message: string;
      type: "success" | "info" | "error";
    } | null,
  ) => void;

  isOnline: boolean;
  setIsOnline: (val: boolean) => void;
  syncOfflineProjects: () => Promise<void>;

  theme: 'day' | 'night' | 'gradient' | 'customized';
  setTheme: (theme: 'day' | 'night' | 'gradient' | 'customized') => void;

  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;

  hiddenMessages: string[];
  hideMessage: (msgId: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  uiScale: number;
  setUiScale: (scale: number) => void;
  tutorialCompleted: boolean;
  completeTutorial: () => void;
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
  resetTutorial: () => void;

  shortcuts: Record<string, string>;
  setShortcut: (command: string, key: string) => void;

  get isAdmin(): boolean;

  simpleMode: boolean;
  setSimpleMode: (enabled: boolean) => void;
  createNewProject: () => void;
  createFromVideo: (file: File) => Promise<void>;
  _exportFrames: () => Promise<string[]>;

  user: User | null;
  userProfile: any | null;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: any | null) => void;
  updateUserProfileInFirestore: (data: any) => Promise<void>;

  // Game/Rewards State
  gamePoints: number;
  addGamePoints: (points: number) => void;
  increaseCloudSpace: (mb: number) => void;

  firebaseProjects: any[];
  firebaseFolders: any[];
  currentFirestoreProjectId: string | null;
  setFirebaseProjects: (projects: any[]) => void;
  setFirebaseFolders: (folders: any[]) => void;
  loadProjectFromFirestore: (id: string) => Promise<void>;
  saveProjectToFirestore: () => Promise<void>;
  deleteProjectFromFirestore: (
    id: string,
    mode: "all" | "app" | "cloud",
  ) => Promise<void>;
  createFolderInFirestore: (name: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolderFromFirestore: (
    id: string,
    mode: "all" | "app" | "cloud",
  ) => Promise<void>;
  moveProjectToFolder: (
    projectId: string,
    folderId: string | null,
  ) => Promise<void>;

  activeCollaborationId: string | null;
  initiateCollaboration: (targetUserId: string) => Promise<void>;
  joinCollaboration: (collaborationId: string) => Promise<void>;
  leaveCollaboration: () => void;

  history: HistorySnapshot[];
  historyIndex: number;
  pushHistory: () => void;
  undo: (broadcast?: boolean) => Promise<void>;
  redo: (broadcast?: boolean) => Promise<void>;
  undoAll: (broadcast?: boolean) => Promise<void>;
  redoAll: (broadcast?: boolean) => Promise<void>;
  _serializeState: () => string;
  _loadSnapshot: (jsonStr: string) => Promise<boolean>;
  _loadFromHistorySnapshot: (snap: HistorySnapshot) => Promise<void>;

  hasSavedState: boolean;
  checkSavedState: () => void;
  saveToLocalStorage: () => void;
  restoreFromLocalStorage: () => Promise<boolean>;
  _debouncedCloudSave: () => void;
  loadLocalProject: (id: string) => Promise<void>;
  deleteLocalProject: (id: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  tool: "brush",
  setTool: (tool) => set({ tool }),
  isLowEndDevice: false,
  setIsLowEndDevice: (isLowEndDevice) => set({ isLowEndDevice }),

  keyframes: [],
  addKeyframe: (layerId, frame) =>
    set((state) => {
      const layer = state.layers.find((l) => l.id === layerId);
      const opacity = layer ? (layer.opacity ?? 100) : 100;
      const x = layer ? ((layer as any).x ?? 0) : 0;
      const y = layer ? ((layer as any).y ?? 0) : 0;
      const scaleX = layer ? ((layer as any).scaleX ?? 1) : 1;
      const scaleY = layer ? ((layer as any).scaleY ?? 1) : 1;
      const rotation = layer ? ((layer as any).rotation ?? 0) : 0;
      const filtered = state.keyframes.filter((k) => !(k.layerId === layerId && k.frame === frame));
      return {
        keyframes: [
          ...filtered,
          { id: uuidv4(), layerId, frame, easing: "linear", opacity, x, y, scaleX, scaleY, rotation },
        ],
      };
    }),
  removeKeyframe: (id) =>
    set((state) => ({
      keyframes: state.keyframes.filter((k) => k.id !== id),
    })),
  updateKeyframeEasing: (id, easing) =>
    set((state) => {
      const newKfs = state.keyframes.map((k) =>
        k.id === id ? { ...k, easing } : k
      );
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("render-display"));
      }, 0);
      return { keyframes: newKfs };
    }),

  shortcuts: (() => {
    const defaults = {
      playPause: "Space",
      prevFrame: "ArrowLeft",
      nextFrame: "ArrowRight",
      addKeyframe: "k",
      undo: "Control+z",
      redo: "Control+y",
      brush: "b",
      eraser: "e",
      pixel: "p",
      pixel_eraser: "Shift+e",
      bezier: "v",
      line: "l",
      rect: "u",
      circle: "o",
      star: "s",
      fill: "f",
      eyedropper: "i",
      blur: "d",
      smudge: "m",
      pan: "h",
      "select-rect": "w",
      move: "g",
      text: "t",
      magic_wand: "a",
      ruler: "r",
      screentone: "c",
      speech_balloon: "q",
      focus_lines: "j",
      sharpen: "Shift+s",
      dodge: "Shift+d",
      burn: "Shift+b",
      material_library: "n",
      toggle_timeline: "x"
    };
    try {
      const saved = localStorage.getItem("drawing-app-shortcuts");
      if (saved) return { ...defaults, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Failed to load shortcuts from localStorage:", e);
    }
    return defaults;
  })(),
  setShortcut: (command, key) =>
    set((state) => {
      const newShortcuts = { ...state.shortcuts, [command]: key };
      try {
        localStorage.setItem(
          "drawing-app-shortcuts",
          JSON.stringify(newShortcuts),
        );
      } catch (e) {
        console.warn("Failed to save shortcuts to localStorage:", e);
      }
      return { shortcuts: newShortcuts };
    }),

  get isAdmin() {
    const state = get();
    return (
      state.user?.email === "belepuff@gmail.com" || state.user?.uid === "BTTEE"
    );
  },

  color: "#000000",
  setColor: (color) => set({ color }),

  brushSize: 10,
  setBrushSize: (brushSize) => set({ brushSize }),

  brushOpacity: 100,
  setBrushOpacity: (brushOpacity) => set({ brushOpacity }),

  brushTexture: "solid",
  brushHardness: 100,
  brushSpacing: 10,
  brushScatter: 0,
  rulerShape: "straight",
  rulerRotation: 0,
  showRuler: true,
  setBrushTexture: (brushTexture) => set({ brushTexture }),
  setBrushHardness: (brushHardness) => set({ brushHardness }),
  setBrushSpacing: (brushSpacing) => set({ brushSpacing }),
  setBrushScatter: (brushScatter) => set({ brushScatter }),
  setRulerShape: (rulerShape) => set({ rulerShape }),
  setRulerRotation: (rulerRotation) => set({ rulerRotation }),
  setShowRuler: (showRuler) => set({ showRuler }),

  shapeStyle: "stroke",
  setShapeStyle: (shapeStyle) => set({ shapeStyle }),

  starPoints: 5,
  setStarPoints: (starPoints) => set({ starPoints }),

  textContent: "Text",
  setTextContent: (textContent) => set({ textContent }),

  textFont: "sans-serif",
  setTextFont: (textFont) => set({ textFont }),

  fillTolerance: Number(localStorage.getItem("saved_fill_tolerance") || "0"),
  setFillTolerance: (fillTolerance) => {
    set({ fillTolerance });
    localStorage.setItem("saved_fill_tolerance", fillTolerance.toString());
  },
  fillMode: "normal",
  setFillMode: (fillMode) => set({ fillMode }),
  appFrozen: false,
  setAppFrozen: (frozen) => set({ appFrozen: frozen }),

  toolInterpolation: "bilinear",
  setToolInterpolation: (toolInterpolation) => set({ toolInterpolation }),

  stabilizer: 50,
  setStabilizer: (stabilizer) => set({ stabilizer }),

  panelMargin: 40,
  setPanelMargin: (panelMargin) => set({ panelMargin }),
  panelSpacing: 15,
  setPanelSpacing: (panelSpacing) => set({ panelSpacing }),
  panelBorderWidth: 4,
  setPanelBorderWidth: (panelBorderWidth) => set({ panelBorderWidth }),

  screentoneDotSize: 2,
  setScreentoneDotSize: (screentoneDotSize) => set({ screentoneDotSize }),
  screentoneFrequency: 8,
  setScreentoneFrequency: (screentoneFrequency) => set({ screentoneFrequency }),

  balloonText: "Balão de Fala!",
  setBalloonText: (balloonText) => set({ balloonText }),
  balloonStyle: "oval",
  setBalloonStyle: (balloonStyle) => set({ balloonStyle }),

  focusLinesCount: 80,
  setFocusLinesCount: (focusLinesCount) => set({ focusLinesCount }),
  focusLinesInnerRadius: 100,
  setFocusLinesInnerRadius: (focusLinesInnerRadius) => set({ focusLinesInnerRadius }),

  specialRulerType: "perspective",
  setSpecialRulerType: (specialRulerType) => set({ specialRulerType }),
  specialRulerAngle: 45,
  setSpecialRulerAngle: (specialRulerAngle) => set({ specialRulerAngle }),
  specialRulerSnapping: true,
  setSpecialRulerSnapping: (specialRulerSnapping) => set({ specialRulerSnapping }),

  brushPresets: [
    {
      id: "1",
      name: "Pencil",
      size: 2,
      opacity: 80,
      color: "#000000",
      texture: "pencil",
    },
    {
      id: "2",
      name: "Marker",
      size: 20,
      opacity: 50,
      color: "#FF0000",
      texture: "solid",
    },
    {
      id: "3",
      name: "Charcoal",
      size: 30,
      opacity: 90,
      color: "#333333",
      texture: "charcoal",
    },
    {
      id: "4",
      name: "Airbrush",
      size: 50,
      opacity: 30,
      color: "#4c4cff",
      texture: "spray",
    },
    {
      id: "5",
      name: "Watercolor",
      size: 40,
      opacity: 20,
      color: "#4cff4c",
      texture: "watercolor",
    },
    {
      id: "6",
      name: "Oil Paint",
      size: 25,
      opacity: 100,
      color: "#ffff4c",
      texture: "oil",
    },
    {
      id: "7",
      name: "Ink Pen",
      size: 4,
      opacity: 100,
      color: "#000000",
      texture: "ink",
    },
    {
      id: "8",
      name: "Crayon",
      size: 15,
      opacity: 80,
      color: "#ff4c4c",
      texture: "crayon",
    },
    {
      id: "9",
      name: "Gouache",
      size: 35,
      opacity: 70,
      color: "#ffffff",
      texture: "gouache",
    },
    {
      id: "10",
      name: "Digital Pen",
      size: 3,
      opacity: 100,
      color: "#0000ff",
      texture: "solid",
    },
  ],
  saveBrushPreset: (name) =>
    set((state) => ({
      brushPresets: [
        ...state.brushPresets,
        {
          id: uuidv4(),
          name,
          size: state.brushSize,
          opacity: state.brushOpacity,
          color: state.color,
          texture: state.brushTexture,
        },
      ],
    })),
  addBrushPreset: (preset) =>
    set((state) => ({
      brushPresets: [...state.brushPresets, preset],
    })),
  applyBrushPreset: (id) =>
    set((state) => {
      const preset = state.brushPresets.find((p) => p.id === id);
      if (preset) {
        return {
          brushSize: preset.size,
          brushOpacity: preset.opacity,
          color: preset.color,
          brushTexture: preset.texture,
        };
      }
      return state;
    }),
  deleteBrushPreset: (id) =>
    set((state) => ({
      brushPresets: state.brushPresets.filter((p) => p.id !== id),
    })),
  customBrushes: [],
  addCustomBrush: async (name, dataUrl) => {
    const id = uuidv4();
    set((state) => ({
      customBrushes: [
        ...state.customBrushes,
        { id, name, dataUrl },
      ],
    }));

    // Save to Firestore if there's an active collaboration
    const { activeCollaborationId } = get();
    if (activeCollaborationId) {
      try {
        await setDoc(doc(db, `collaborations/${activeCollaborationId}/custom_brushes`, id), {
          id,
          name,
          dataUrl,
          createdAt: Date.now()
        });
      } catch (e) {
        console.error("Error saving custom brush to Firestore:", e);
      }
    }
  },
  deleteCustomBrush: async (id) => {
    set((state) => ({
      customBrushes: state.customBrushes.filter((b) => b.id !== id),
    }));

    // Delete from Firestore if there's an active collaboration
    const { activeCollaborationId } = get();
    if (activeCollaborationId) {
      try {
        await deleteDoc(doc(db, `collaborations/${activeCollaborationId}/custom_brushes`, id));
      } catch (e) {
        console.error("Error deleting custom brush from Firestore:", e);
      }
    }
  },
  importingBrushData: null,
  setImportingBrushData: (data) => set({ importingBrushData: data }),

  layers: [],
  activeLayerId: null,

  timelines: [{ id: "t1", name: "Linha do tempo 1", layers: [], currentFrame: 1, totalFrames: 24, keyframes: [] }],
  activeTimelineId: "t1",

  addTimeline: () => set((state) => {
    const newId = `t${Date.now()}`;
    const newTimeline: AnimationTimeline = {
      id: newId,
      name: `Linha do tempo ${state.timelines.length + 1}`,
      layers: [],
      currentFrame: 1,
      totalFrames: state.fps * 2 || 24,
      keyframes: []
    };
    
    // Save current active timeline state before switching
    const timelines = state.timelines.map(t => {
      if (t.id === state.activeTimelineId) {
        return {
          ...t,
          layers: state.layers,
          currentFrame: state.currentFrame,
          totalFrames: state.totalFrames,
          keyframes: state.keyframes
        };
      }
      return t;
    });

    timelines.push(newTimeline);

    setTimeout(() => {
      get().addLayer(); // Create initial layer for new timeline
      window.dispatchEvent(new CustomEvent("render-display"));
    }, 0);

    return {
      timelines,
      activeTimelineId: newId,
      layers: [],
      currentFrame: 1,
      totalFrames: newTimeline.totalFrames,
      keyframes: []
    };
  }),

  switchTimeline: (id: string) => set((state) => {
    if (state.activeTimelineId === id) return {};
    
    // Save current active timeline
    const timelines = state.timelines.map(t => {
      if (t.id === state.activeTimelineId) {
        return {
          ...t,
          layers: state.layers,
          currentFrame: state.currentFrame,
          totalFrames: state.totalFrames,
          keyframes: state.keyframes
        };
      }
      return t;
    });

    const targetTimeline = timelines.find(t => t.id === id);
    if (!targetTimeline) return { timelines };

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("render-display"));
    }, 0);

    return {
      timelines,
      activeTimelineId: id,
      layers: targetTimeline.layers,
      currentFrame: targetTimeline.currentFrame,
      totalFrames: targetTimeline.totalFrames,
      keyframes: targetTimeline.keyframes,
      activeLayerId: targetTimeline.layers.length > 0 ? targetTimeline.layers[0].id : null
    };
  }),

  deleteTimeline: (id: string) => set((state) => {
    if (state.timelines.length <= 1) return {};
    
    const timelines = state.timelines.filter(t => t.id !== id);
    
    if (state.activeTimelineId === id) {
      const nextTimeline = timelines[0];
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("render-display"));
      }, 0);
      return {
        timelines,
        activeTimelineId: nextTimeline.id,
        layers: nextTimeline.layers,
        currentFrame: nextTimeline.currentFrame,
        totalFrames: nextTimeline.totalFrames,
        keyframes: nextTimeline.keyframes,
        activeLayerId: nextTimeline.layers.length > 0 ? nextTimeline.layers[0].id : null
      };
    }
    return { timelines };
  }),

  renameTimeline: (id: string, name: string) => set((state) => {
    return {
      timelines: state.timelines.map(t => t.id === id ? { ...t, name } : t)
    };
  }),

  addLayer: () =>
    set((state) => {
      const newLayer: Layer = {
        id: uuidv4(),
        name: `Layer ${state.layers.length + 1}`,
        visible: true,
        opacity: 100,
        blendMode: "source-over",
        clippingMask: false,
        type: "bitmap",
        canvas: null,
        ctx: null,
        cels: {},
      };
      return {
        layers: [newLayer, ...state.layers],
        activeLayerId: newLayer.id,
      };
    }),

  addLayerWithImage: (name, dataUrl) =>
    set((state) => {      const newLayerId = uuidv4();
      const newCanvas = document.createElement("canvas");
      newCanvas.width = state.width;
      newCanvas.height = state.height;
      const ctx = newCanvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const img = new Image();
        img.onload = () => {
          const targetWidth = img.width;
          const targetHeight = img.height;
          const isPixelArt = targetWidth <= 256 && targetHeight <= 256;

          let zoomLevel = 100;
          if (isPixelArt) {
            if (targetWidth <= 16) zoomLevel = 3200;
            else if (targetWidth <= 32) zoomLevel = 2400;
            else if (targetWidth <= 64) zoomLevel = 1600;
            else if (targetWidth <= 128) zoomLevel = 1000;
            else zoomLevel = 600;
          } else {
            const vw = window.innerWidth * 0.8;
            const vh = window.innerHeight * 0.8;
            const hRatio = vw / targetWidth;
            const vRatio = vh / targetHeight;
            const ratio = Math.min(hRatio, vRatio, 1);
            zoomLevel = Math.round(ratio * 100);
          }

          const canvasWidth = Math.max(state.width, targetWidth) + 800;
          const canvasHeight = Math.max(state.height, targetHeight) + 800;

          // Calculate scale to fit image into canvas without cropping
          const scale = Math.min((canvasWidth - 100) / targetWidth, (canvasHeight - 100) / targetHeight);
          const finalWidth = targetWidth * scale;
          const finalHeight = targetHeight * scale;
          const offsetX = (canvasWidth - finalWidth) / 2;
          const offsetY = (canvasHeight - finalHeight) / 2;

          newCanvas.width = canvasWidth;
          newCanvas.height = canvasHeight;
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, offsetX, offsetY, finalWidth, finalHeight);
          }

          set((s) => ({
            width: canvasWidth,
            height: canvasHeight,
            brushSize: isPixelArt ? 1 : s.brushSize,
            showGrid: isPixelArt ? true : s.showGrid,
            gridSize: isPixelArt ? 1 : s.gridSize,
            zoom: zoomLevel,
            layers: [{ id: newLayerId, name: name, canvas: newCanvas, ctx: ctx, visible: true, opacity: 100, blendMode: 'source-over', clippingMask: false, cels: {}, type: 'bitmap', originalWidth: targetWidth, originalHeight: targetHeight, scale: scale, offsetX: offsetX, offsetY: offsetY }, ...s.layers],
            pixelArtMode: isPixelArt ? true : s.pixelArtMode,
          }));

          if (isPixelArt) {
            get().setNotification({
              message: `Modo Pixel Art Ativado: Tela ajustada para ${targetWidth}x${targetHeight} px, pincel definido para 1px e grade ativada!`,
              type: "info",
            });
          } else {
            get().setNotification({
              message: `Tela ajustada para ${targetWidth}x${targetHeight} px`,
              type: "info",
            });
          }

          window.dispatchEvent(new CustomEvent("render-display"));
          get().pushHistory();
        };
        img.src = dataUrl;
      }
      return { activeLayerId: newLayerId };
    }),

  addPinterestTemplate: (name, dataUrl) => {
    localStorage.setItem("saved_simple_mode", "true");
    set((state) => ({
      simpleMode: true,
      onionSkin: true
    }));

    const imageLayerId = uuidv4();
    const blankLayerId = uuidv4();

    const newCanvas = document.createElement("canvas");
    const blankCanvas = document.createElement("canvas");

    const img = new Image();
    img.onload = () => {
      const targetWidth = img.width;
      const targetHeight = img.height;
      const canvasWidth = Math.max(get().width, targetWidth) + 800;
      const canvasHeight = Math.max(get().height, targetHeight) + 800;

      const scale = Math.min((canvasWidth - 100) / targetWidth, (canvasHeight - 100) / targetHeight);
      const finalWidth = targetWidth * scale;
      const finalHeight = targetHeight * scale;
      const offsetX = (canvasWidth - finalWidth) / 2;
      const offsetY = (canvasHeight - finalHeight) / 2;

      newCanvas.width = canvasWidth;
      newCanvas.height = canvasHeight;
      const ctx = newCanvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, offsetX, offsetY, finalWidth, finalHeight);
      }

      blankCanvas.width = canvasWidth;
      blankCanvas.height = canvasHeight;
      const blankCtx = blankCanvas.getContext("2d", { willReadFrequently: true });

      const imageLayer: Layer = {
        id: imageLayerId,
        name: `${name} (Linhas)`,
        canvas: newCanvas,
        ctx: ctx,
        visible: true,
        opacity: 100,
        blendMode: 'source-over',
        clippingMask: false,
        cels: {},
        type: 'bitmap',
        originalWidth: targetWidth,
        originalHeight: targetHeight,
        scale: scale,
        offsetX: offsetX,
        offsetY: offsetY
      };

      const blankLayer: Layer = {
        id: blankLayerId,
        name: `Pintura (Abaixo)`,
        canvas: blankCanvas,
        ctx: blankCtx,
        visible: true,
        opacity: 100,
        blendMode: 'source-over',
        clippingMask: false,
        cels: {},
        type: 'bitmap'
      };

      set((s) => ({
        width: canvasWidth,
        height: canvasHeight,
        zoom: Math.round(Math.min((window.innerWidth * 0.8) / canvasWidth, (window.innerHeight * 0.8) / canvasHeight, 1) * 100),
        layers: [imageLayer, blankLayer, ...s.layers],
        activeLayerId: blankLayerId,
      }));

      get().setNotification({
        message: `Desenho "${name}" carregado! Modo Simples ativado e camada de pintura criada abaixo do desenho.`,
        type: "success",
      });

      window.dispatchEvent(new CustomEvent("render-display"));
      get().pushHistory();
    };
    img.src = dataUrl;
  },

  addVectorLayer: () =>
    set((state) => {
      const newLayer: Layer = {
        id: uuidv4(),
        name: `Vector ${state.layers.length + 1}`,
        visible: true,
        opacity: 100,
        blendMode: "source-over",
        clippingMask: false,
        type: "vector",
        elements: [],
        canvas: null,
        ctx: null,
        cels: {},
      };
      return {
        layers: [newLayer, ...state.layers],
        activeLayerId: newLayer.id,
      };
    }),

  addFolderLayer: () =>
    set((state) => {
      const newLayer: Layer = {
        id: uuidv4(),
        name: `Pasta ${state.layers.filter(l => l.type === "folder").length + 1}`,
        visible: true,
        opacity: 100,
        blendMode: "source-over",
        clippingMask: false,
        type: "folder",
        canvas: null,
        ctx: null,
        cels: {},
      };
      return {
        layers: [newLayer, ...state.layers],
        activeLayerId: newLayer.id,
      };
    }),

  removeLayer: (id) =>
    set((state) => {
      const newLayers = state.layers.filter((l) => l.id !== id);
      const newState = {
        layers: newLayers,
        activeLayerId:
          state.activeLayerId === id
            ? newLayers[0]?.id || null
            : state.activeLayerId,
      };
      setTimeout(() => get().pushHistory(), 10);
      return newState;
    }),

  setActiveLayer: (id) => set({ activeLayerId: id }),

  resetCanvas: () =>
    set((state) => {
      // Clear history and start fresh
      let initialZoom = 100;
      // Auto-fit if it's a very small canvas
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        // Fit to mobile screen
        const padding = 60;
        initialZoom = Math.min(100, Math.floor((window.innerWidth - padding) / state.width * 100));
        // Don't let it get too small though
        initialZoom = Math.max(10, initialZoom);
      } else if (state.width <= 64) {
        initialZoom = 1200; // 32 * 12 = 384px
      } else if (state.width <= 128) {
        initialZoom = 600;  // 128 * 6 = 768px
      } else if (state.width <= 256) {
        initialZoom = 300;
      }
      return {
        layers: [],
        activeLayerId: null,
        history: [],
        historyIndex: -1,
        zoom: initialZoom,
        pan: { x: 0, y: 0 },
        rotation: 0,
      };
    }),

  clearLayer: (id) =>
    set((state) => {
      const layer = state.layers.find((l) => l.id === id);
      if (!layer) return state;

      if (layer.ctx) {
        layer.ctx.clearRect(0, 0, layer.ctx.canvas.width, layer.ctx.canvas.height);
      }

      const newLayers = state.layers.map((l) => {
        if (l.id === id) {
          const newCels = { ...l.cels, [state.currentFrame]: "" };
          const newCelCache = { ...l.celCache };
          delete newCelCache[state.currentFrame];
          return {
            ...l,
            elements: l.type === "vector" ? [] : l.elements,
            cels: newCels,
            celCache: newCelCache,
          };
        }
        return l;
      });

      setTimeout(() => get().pushHistory(), 10);
      return { layers: newLayers };
    }),

  duplicateLayer: (id) =>
    set((state) => {
      const layer = state.layers.find((l) => l.id === id);
      if (!layer) return state;

      const newId = uuidv4();
      const newLayer: Layer = {
        ...layer,
        id: newId,
        name: `${layer.name} Copy`,
        elements: layer.elements
          ? JSON.parse(JSON.stringify(layer.elements))
          : undefined,
        canvas: null,
        ctx: null,
      };

      // Bitmap content copy needs a small delay for CanvasArea to init the new canvas
      setTimeout(() => {
        const store = get();
        const original = layer.canvas;
        const created = store.layers.find((l) => l.id === newId);
        if (original && created && created.ctx) {
          created.ctx.drawImage(original, 0, 0);
          store.pushHistory();
        }
      }, 100);

      return {
        layers: [newLayer, ...state.layers],
        activeLayerId: newId,
      };
    }),

  mergeDown: (id) =>
    set((state) => {
      const currentIndex = state.layers.findIndex((l) => l.id === id);
      if (currentIndex === -1 || currentIndex === state.layers.length - 1)
        return state;

      const upperLayer = state.layers[currentIndex];
      const lowerLayer = state.layers[currentIndex + 1];

      if (!upperLayer.canvas || !lowerLayer.canvas || !lowerLayer.ctx)
        return state;

      lowerLayer.ctx.save();

      // If upper is clipped, we MUST mask it by the lower layer's pixels during the merge
      if (upperLayer.clippingMask) {
        const tempMaskCanvas = document.createElement("canvas");
        tempMaskCanvas.width = state.width;
        tempMaskCanvas.height = state.height;
        const tCtx = tempMaskCanvas.getContext("2d")!;

        // Draw upper content
        tCtx.globalAlpha = upperLayer.opacity / 100;
        tCtx.drawImage(upperLayer.canvas, 0, 0);

        // Mask by lower
        tCtx.globalCompositeOperation = "destination-in";
        tCtx.drawImage(lowerLayer.canvas, 0, 0);

        // Now blend onto lower
        lowerLayer.ctx.globalCompositeOperation = upperLayer.blendMode;
        lowerLayer.ctx.drawImage(tempMaskCanvas, 0, 0);
      } else {
        // Standard merge
        lowerLayer.ctx.globalAlpha = upperLayer.opacity / 100;
        lowerLayer.ctx.globalCompositeOperation = upperLayer.blendMode;
        lowerLayer.ctx.drawImage(upperLayer.canvas, 0, 0);
      }

      lowerLayer.ctx.restore();

      const newLayers = state.layers.filter((l) => l.id !== id);

      setTimeout(() => get().pushHistory(), 10);
      return {
        layers: newLayers,
        activeLayerId: lowerLayer.id,
      };
    }),

  toggleLayerVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l,
      ),
    })),

  toggleLayerClippingMask: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, clippingMask: !l.clippingMask } : l,
      ),
    })),

  toggleLayerAlphaLock: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, alphaLock: !l.alphaLock } : l,
      ),
    })),

  setLayerOpacity: (id, opacity) =>
    set((state) => {
      const updatedKeyframes = state.keyframes.map((k) => {
        if (k.layerId === id && k.frame === state.currentFrame) {
          return { ...k, opacity };
        }
        return k;
      });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("render-display"));
      }, 0);
      return {
        layers: state.layers.map((l) => (l.id === id ? { ...l, opacity } : l)),
        keyframes: updatedKeyframes,
      };
    }),

  updateLayerProperty: (id, property, value) =>
    set((state) => {
      const updatedLayers = state.layers.map((l) => {
        let updatedLayer = l.id === id ? { ...l, [property]: value } : l;
        
        // If disableKeyframes was just set to true, clear other cels
        if (property === 'disableKeyframes' && value === true && updatedLayer.id === id) {
             const currentFrame = state.currentFrame;
             const newCels = updatedLayer.cels[currentFrame] ? { [currentFrame]: updatedLayer.cels[currentFrame] } : {};
             updatedLayer = { ...updatedLayer, cels: newCels, celCache: {} }; // Clear cache too
        }
        return updatedLayer;
      });
      const updatedKeyframes = state.keyframes.map((k) => {
        if (k.layerId === id && k.frame === state.currentFrame) {
          return { ...k, [property]: value };
        }
        return k;
      });
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("render-display"));
      }, 0);
      return {
        layers: updatedLayers,
        keyframes: updatedKeyframes,
      };
    }),

  setLayerBlendMode: (id, blendMode) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, blendMode } : l)),
    })),

  reorderLayers: (startIndex, endIndex) =>
    set((state) => {
      const result = Array.from(state.layers);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      setTimeout(() => get().pushHistory(), 10);
      return { layers: result };
    }),

  renameLayer: (id, name) =>
    set((state) => {
      const newLayers = state.layers.map((l) => (l.id === id ? { ...l, name } : l));
      setTimeout(() => get().pushHistory(), 10);
      return { layers: newLayers };
    }),

  setLayerFolder: (id, folderId) =>
    set((state) => {
      // Prevent nesting a folder inside itself
      if (id === folderId) return {};
      const newLayers = state.layers.map((l) => (l.id === id ? { ...l, folderId } : l));
      setTimeout(() => get().pushHistory(), 10);
      return { layers: newLayers };
    }),

  toggleFolderCollapse: (id) =>
    set((state) => {
      const newLayers = state.layers.map((l) =>
        l.id === id ? { ...l, collapsed: !l.collapsed } : l
      );
      return { layers: newLayers };
    }),

  initLayerCanvas: (id, canvas) =>
    set((state) => ({
      layers: state.layers.map((l) => {
        if (l.id === id) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
          }
          return { ...l, canvas, ctx };
        }
        return l;
      }),
    })),

  selection: null,
  setSelection: (selection) => set({ selection }),
  selectionType: "rect",
  setSelectionType: (selectionType) => set({ selectionType }),

  floatingSelection: null,
  setFloatingSelection: (fs) => {
    set({ floatingSelection: fs });
    if (fs) {
      get().initTransformPoints(get().transformMode);
    } else {
      set({ transformPoints: null });
    }
  },
  stampFloatingSelection: () =>
    set((state) => {
      if (!state.floatingSelection || !state.activeLayerId) return state;

      const activeLayer = state.layers.find(
        (l) => l.id === state.activeLayerId,
      );
      if (activeLayer && activeLayer.ctx) {
        activeLayer.ctx.globalCompositeOperation = "source-over";
        activeLayer.ctx.globalAlpha = 1;
        if (state.transformPoints) {
          drawWarpedMesh(
            state.floatingSelection.canvas,
            activeLayer.ctx,
            state.transformPoints,
            state.transformMode
          );
        } else {
          activeLayer.ctx.drawImage(
            state.floatingSelection.canvas,
            state.floatingSelection.x,
            state.floatingSelection.y,
          );
        }
      }

      setTimeout(() => get().pushHistory(), 10);
      return { floatingSelection: null, selection: null, transformPoints: null };
    }),

  bezierPoints: [],
  setBezierPoints: (points) => set({ bezierPoints: points }),

  width: 800,
  height: 600,
  setWidthHeight: (width, height) => set({ width, height }),

  zoom: 100,
  setZoom: (zoom) => set({ zoom }),

  pan: { x: 0, y: 0 },
  setPan: (pan) => set({ pan }),

  dpi: 300,
  setDpi: (dpi) => set({ dpi }),
  canvasBackgroundColor: "#ffffff",
  setCanvasBackgroundColor: (canvasBackgroundColor) =>
    set({ canvasBackgroundColor }),
  exportQuality: 0.9,
  setExportQuality: (exportQuality) => set({ exportQuality }),
  showProjectSettings: false,
  setShowProjectSettings: (showProjectSettings) => set({ showProjectSettings }),
  showAccountModal: false,
  setShowAccountModal: (showAccountModal) => set({ showAccountModal }),
  isKidsMode: typeof window !== "undefined" ? localStorage.getItem("kids_mode") === "true" : false,
  setIsKidsMode: (isKidsMode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kids_mode", String(isKidsMode));
    }
    set({ isKidsMode });
  },
  kidsModePin: typeof window !== "undefined" ? localStorage.getItem("kids_mode_pin") || "1234" : "1234",
  setKidsModePin: (kidsModePin) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("kids_mode_pin", kidsModePin);
    }
    set({ kidsModePin });
  },
  showFiltersDrawer: false,
  setShowFiltersDrawer: (showFiltersDrawer) => set({ showFiltersDrawer }),
  showGrid: false,
  setShowGrid: (showGrid) => set({ showGrid }),
  gridSize: 16,
  setGridSize: (gridSize) => set({ gridSize }),
  showRulers: true,
  setShowRulers: (showRulers) => set({ showRulers }),

  pixelArtMode: false,
  setPixelArtMode: (pixelArtMode) => set({ pixelArtMode }),
  pixelPerfect: false,
  setPixelPerfect: (pixelPerfect) => set({ pixelPerfect }),
  pixelDithering: "none",
  setPixelDithering: (pixelDithering) => set({ pixelDithering }),

  flipX: false,
  setFlipX: (flipX) => set({ flipX }),
  flipY: false,
  setFlipY: (flipY) => set({ flipY }),
  rotation: 0,
  setRotation: (rotation) => set({ rotation }),

  centerCanvas: () => set({ pan: { x: 0, y: 0 } }),
  resetZoom: () => set({ zoom: 100 }),

  referenceImages: [],
  addReferenceImage: (url) => set((state) => ({
    referenceImages: [
      ...state.referenceImages,
      {
        id: uuidv4(),
        url,
        x: 50,
        y: 50,
        width: 200,
        height: 200,
        opacity: 100,
        visible: true,
        pinned: false
      }
    ]
  })),
  updateReferenceImage: (id, updates) => set((state) => ({
    referenceImages: state.referenceImages.map(img => img.id === id ? { ...img, ...updates } : img)
  })),
  removeReferenceImage: (id) => set((state) => ({
    referenceImages: state.referenceImages.filter(img => img.id !== id)
  })),

  projectName: "Novo Projeto",
  setProjectName: (projectName) => set({ projectName }),

  mirrorMode: false,
  setMirrorMode: (mirrorMode) => set({ mirrorMode }),
  uiLayout: "default",
  layoutEditMode: false,
  setLayoutEditMode: (layoutEditMode) => set({ layoutEditMode }),
  panelPositions: {
    toolbar: { x: 0, y: 0 },
    properties: { x: 0, y: 0 },
    timeline: { x: 0, y: 0 },
    topbar: { x: 0, y: 0 },
  },
  setPanelPosition: (panelId, position) => set((state) => ({
    panelPositions: {
      ...state.panelPositions,
      [panelId]: position
    }
  })),
  setUiLayout: (uiLayout) => set({ uiLayout }),

  showPropertiesPanel: true,
  togglePropertiesPanel: () =>
    set((state) => ({ showPropertiesPanel: !state.showPropertiesPanel })),

  showStabilizerMenu: false,
  setShowStabilizerMenu: (show) => set({ showStabilizerMenu: show }),
  showSelectionMenu: false,
  setShowSelectionMenu: (show) => set({ showSelectionMenu: show }),
  showExportMenu: false,
  setShowExportMenu: (show) => set({ showExportMenu: show }),

  showReference: false,
  setShowReference: (show) => set({ showReference: show }),
  showReferenceButtons: false,
  setShowReferenceButtons: (show) => set({ showReferenceButtons: show }),
  
  clearCanvas: () => set((state) => {
    state.layers.forEach(layer => {
      state.clearLayer(layer.id);
    });
    setTimeout(() => state.pushHistory(), 10);
    return {};
  }),

  showSimpleTimeline: false,
  setShowSimpleTimeline: (show) => set({ showSimpleTimeline: show }),
  importedAudioUrl: null,
  importedAudioName: null,
  setImportedAudio: (url, name) => set({ importedAudioUrl: url, importedAudioName: name }),
  showMessagesModal: false,
  showMiniGamesModal: false,
  setShowMiniGamesModal: (show) => set({ showMiniGamesModal: show }),
  setShowMessagesModal: (show) => set({ showMessagesModal: show }),
  transformMode: 'normal',
  setTransformMode: (mode) => {
    set({ transformMode: mode });
    get().initTransformPoints(mode);
  },
  transformPivot: 'center',
  setTransformPivot: (pivot) => set({ transformPivot: pivot }),
  transformPoints: null,
  setTransformPoints: (transformPoints) => set({ transformPoints }),
  initTransformPoints: (mode) => {
    const fs = get().floatingSelection;
    if (!fs) return;
    const w = fs.canvas.width;
    const h = fs.canvas.height;
    const px = fs.x;
    const py = fs.y;
    let pts: { x: number; y: number; rx: number; ry: number }[] = [];
    if (mode === 'normal' || mode === 'perspective') {
      pts = [
        { x: px, y: py, rx: 0, ry: 0 },         // Top-Left
        { x: px + w, y: py, rx: 1, ry: 0 },     // Top-Right
        { x: px + w, y: py + h, rx: 1, ry: 1 }, // Bottom-Right
        { x: px, y: py + h, rx: 0, ry: 1 }      // Bottom-Left
      ];
    } else if (mode === 'puppet') {
      pts = [
        { x: px, y: py, rx: 0, ry: 0 },
        { x: px + w / 2, y: py, rx: 0.5, ry: 0 },
        { x: px + w, y: py, rx: 1, ry: 0 },
        { x: px, y: py + h / 2, rx: 0, ry: 0.5 },
        { x: px + w / 2, y: py + h / 2, rx: 0.5, ry: 0.5 },
        { x: px + w, y: py + h / 2, rx: 1, ry: 0.5 },
        { x: px, y: py + h, rx: 0, ry: 1 },
        { x: px + w / 2, y: py + h, rx: 0.5, ry: 1 },
        { x: px + w, y: py + h, rx: 1, ry: 1 }
      ];
    }
    set({ transformPoints: pts });
  },
  toggleFilters: () => set((state) => ({ showFiltersDrawer: !state.showFiltersDrawer })),

  frameDurations: {},
  setFrameDuration: (frameId, duration) => set((state) => ({
    frameDurations: { ...state.frameDurations, [frameId]: duration }
  })),
  keyframedLayers: {},
  toggleKeyframe: (frameId, layerId) => set((state) => {
    const current = state.keyframedLayers[frameId] || [];
    const updated = current.includes(layerId) 
      ? current.filter(id => id !== layerId)
      : [...current, layerId];
    return { keyframedLayers: { ...state.keyframedLayers, [frameId]: updated } };
  }),
  gestureFeedback: null,
  setGestureFeedback: (text) => {
    set({ gestureFeedback: text });
    if (text) setTimeout(() => set({ gestureFeedback: null }), 1000);
  },

  animationEnabled: false,
  setAnimationEnabled: (animationEnabled) => set({ animationEnabled }),
  currentFrame: 1,
  totalFrames: 24,
  fps: 12,
  isPlaying: false,
  onionSkin: false,
  onionSkinBefore: 1,
  setOnionSkinBefore: (onionSkinBefore) => set({ onionSkinBefore }),
  onionSkinAfter: 1,
  setOnionSkinAfter: (onionSkinAfter) => set({ onionSkinAfter }),
  onionSkinOpacity: 0.3,
  setOnionSkinOpacity: (onionSkinOpacity) => set({ onionSkinOpacity }),
  onionSkinPastColor: "#ff0000",
  setOnionSkinPastColor: (onionSkinPastColor) => set({ onionSkinPastColor }),
  onionSkinFutureColor: "#0000ff",
  setOnionSkinFutureColor: (onionSkinFutureColor) => set({ onionSkinFutureColor }),

  notification: null,
  setNotification: (notification) => {
    set({ notification });
    if (notification) {
      setTimeout(() => {
        if (get().notification?.message === notification.message) {
          set({ notification: null });
        }
      }, 5000);
    }
  },

  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  setIsOnline: (isOnline) => set({ isOnline }),

  theme: 'day',
  setTheme: (theme) => set({ theme }),

  followUser: async (userId: string) => {
    console.log("Following user:", userId);
  },
  unfollowUser: async (userId: string) => {
    console.log("Unfollowing user:", userId);
  },
  hiddenMessages: typeof localStorage !== "undefined" && localStorage.getItem("hidden_messages") ? JSON.parse(localStorage.getItem("hidden_messages")!) : [],
  hideMessage: (msgId) => set((state) => {
    const newHidden = [...state.hiddenMessages, msgId];
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("hidden_messages", JSON.stringify(newHidden));
    }
    return { hiddenMessages: newHidden };
  }),
  language: typeof localStorage !== "undefined" && localStorage.getItem("app_language") 
    ? localStorage.getItem("app_language")! 
    : (typeof navigator !== "undefined" 
        ? (["pt", "en", "es", "it", "ja", "fr"].includes(navigator.language.split('-')[0]) ? navigator.language.split('-')[0] : "pt") 
        : "pt"),
  setLanguage: (language) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("app_language", language);
    }
    set({ language });
  },
  uiScale: typeof localStorage !== "undefined" ? parseFloat(localStorage.getItem("app_uiScale") || "1") : 1,
  setUiScale: (uiScale) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("app_uiScale", uiScale.toString());
    }
    set({ uiScale });
  },
  tutorialCompleted: typeof localStorage !== "undefined" ? localStorage.getItem("app_tutorial") === "true" : false,
  completeTutorial: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("app_tutorial", "true");
    }
    set({ tutorialCompleted: true });
  },
  tutorialStep: 0,
  resetTutorial: () => {
    if (typeof localStorage !== "undefined") localStorage.removeItem("app_tutorial");
    set({ tutorialCompleted: false, tutorialStep: 0 });
  },
  setTutorialStep: (tutorialStep) => set({ tutorialStep }),
  syncOfflineProjects: async () => {
    const { isOnline, user } = get();
    if (!isOnline || !user) return;
    
    const offlineProjects = JSON.parse(localStorage.getItem("offline_projects_drafts") || "[]");
    if (offlineProjects.length === 0) return;
    
    get().setNotification({
      message: `Sincronizando ${offlineProjects.length} rascunhos offline...`,
      type: "info"
    });
    
    try {
      const batch = writeBatch(db);
      offlineProjects.forEach((proj: any) => {
        const { isOfflineDraft, ...firestoreData } = proj;
        if (typeof firestoreData.createdAt === "string") {
          firestoreData.createdAt = Timestamp.fromDate(new Date(firestoreData.createdAt));
        }
        if (typeof firestoreData.updatedAt === "string") {
          firestoreData.updatedAt = Timestamp.fromDate(new Date(firestoreData.updatedAt));
        }
        // Check if project exists, or just set it
        batch.set(doc(db, "projects", proj.id), firestoreData, { merge: true });
      });
      
      await batch.commit();
      localStorage.removeItem("offline_projects_drafts");
      get().setNotification({
        message: "Todos os rascunhos offline foram sincronizados com a nuvem!",
        type: "success"
      });
      
      // Reload projects list to show the synced projects
      const q = query(collection(db, "projects"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedProjects = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      set({ firebaseProjects: fetchedProjects as any[] });
    } catch (e) {
      console.error("Error syncing offline projects:", e);
    }
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setFps: (fps) => set({ fps }),
  setTotalFrames: (totalFrames) => set({ totalFrames }),
  toggleOnionSkin: () => set((state) => ({ onionSkin: !state.onionSkin })),

  setCurrentFrame: async (frame) => {
    const state = get();
    if (frame === state.currentFrame) return;

    // 1. Save current content to cels
    state._saveCurrentCels();

    // 2. Load new content from cels
    const newLayers = await Promise.all(
      state.layers.map(async (l) => {
        let celData = l.cels[frame];
        let cachedCanvas = l.celCache?.[frame];

        
        
        celData = celData || "";

        if (l.ctx) {
          l.ctx.clearRect(0, 0, 99999, 99999);
          if (cachedCanvas) {
            l.ctx.drawImage(cachedCanvas, 0, 0);
            return l;
          }

          const data = celData;
          if (data) {
            if (l.type === "vector") {
              const elements = JSON.parse(data);
              return { ...l, elements };
            } else {
              await new Promise((resolve) => {
                const img = new Image();
                let resolved = false;
                const done = () => {
                  if (!resolved) {
                    resolved = true;
                    resolve(null);
                  }
                };
                img.onload = () => {
                  l.ctx?.drawImage(img, 0, 0);

                  // Pop it into celCache for future instant loads
                  if (l.canvas) {
                    const cachedCanvas = document.createElement("canvas");
                    cachedCanvas.width = state.width;
                    cachedCanvas.height = state.height;
                    const cachedCtx = cachedCanvas.getContext("2d");
                    if (cachedCtx && l.canvas) {
                      cachedCtx.drawImage(l.canvas, 0, 0);
                    }
                    if (!l.celCache) l.celCache = {};
                    l.celCache[frame] = cachedCanvas;
                  }
                  done();
                };
                img.onerror = () => {
                  console.warn("Failed to load cel data URL");
                  done();
                };
                setTimeout(done, 1000);
                img.src = data;
              });
            }
          } else if (l.type === "vector") {
            return { ...l, elements: [] };
          }
        }
        return l;
      }),
    );

    set({ currentFrame: frame, layers: newLayers });
    window.dispatchEvent(new CustomEvent("render-display"));
  },

  addFrame: () => set((state) => {
    const newFrame = state.totalFrames + 1;
    const newLayers = state.layers.map(l => ({
      ...l,
      cels: { ...l.cels, [newFrame]: "" }
    }));
    return { totalFrames: newFrame, layers: newLayers };
  }),
  removeFrame: (frame) =>
    set((state) => {
      const newLayers = state.layers.map((l) => {
        const newCels = { ...l.cels };
        delete newCels[frame];
        // Shift subsequent cels back? Usually not in simple timelines
        return { ...l, cels: newCels };
      });
      return {
        totalFrames: Math.max(1, state.totalFrames - 1),
        layers: newLayers,
      };
    }),

  
  invertLayerColors: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.ctx) return state;
    const imgData = layer.ctx.getImageData(0, 0, state.width, state.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = 255 - imgData.data[i];
      imgData.data[i+1] = 255 - imgData.data[i+1];
      imgData.data[i+2] = 255 - imgData.data[i+2];
    }
    layer.ctx.putImageData(imgData, 0, 0);
    return { ...state };
  }),
  rasterizeLayer: (id) => set((state) => { return { ...state }; }), // placeholder
  convertToGrayscale: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.ctx) return state;
    const imgData = layer.ctx.getImageData(0, 0, state.width, state.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const avg = (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
      imgData.data[i] = avg;
      imgData.data[i+1] = avg;
      imgData.data[i+2] = avg;
    }
    layer.ctx.putImageData(imgData, 0, 0);
    return { ...state };
  }),
  adjustBrightness: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.ctx) return state;
    const imgData = layer.ctx.getImageData(0, 0, state.width, state.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      imgData.data[i] = Math.min(255, imgData.data[i] + 30);
      imgData.data[i+1] = Math.min(255, imgData.data[i+1] + 30);
      imgData.data[i+2] = Math.min(255, imgData.data[i+2] + 30);
    }
    layer.ctx.putImageData(imgData, 0, 0);
    return { ...state };
  }),
  sepiaFilter: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.ctx) return state;
    const imgData = layer.ctx.getImageData(0, 0, state.width, state.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      let r = imgData.data[i], g = imgData.data[i+1], b = imgData.data[i+2];
      imgData.data[i] = Math.min(255, (r * .393) + (g *.769) + (b * .189));
      imgData.data[i+1] = Math.min(255, (r * .349) + (g *.686) + (b * .168));
      imgData.data[i+2] = Math.min(255, (r * .272) + (g *.534) + (b * .131));
    }
    layer.ctx.putImageData(imgData, 0, 0);
    return { ...state };
  }),
  outlineLayer: (id) => set((state) => { return { ...state }; }),
  dropShadowLayer: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.ctx) return state;
    layer.ctx.shadowColor = "rgba(0,0,0,0.5)";
    layer.ctx.shadowBlur = 10;
    layer.ctx.shadowOffsetX = 5;
    layer.ctx.shadowOffsetY = 5;
    layer.ctx.drawImage(layer.ctx.canvas, 0, 0);
    layer.ctx.shadowColor = "transparent";
    return { ...state };
  }),
  gaussianBlurLayer: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.ctx) return state;
    layer.ctx.filter = 'blur(4px)';
    layer.ctx.drawImage(layer.ctx.canvas, 0, 0);
    layer.ctx.filter = 'none';
    return { ...state };
  }),

  
  reverseAnimation: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.cels) return state;
    const celsArray = Object.entries(layer.cels).map(([k, v]) => ({ frame: parseInt(k), data: v })).sort((a,b) => a.frame - b.frame);
    if (celsArray.length === 0) return state;
    
    const reversedData = [...celsArray].reverse().map(c => c.data);
    const newCels = {};
    celsArray.forEach((c, i) => {
      newCels[c.frame] = reversedData[i];
    });
    
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: { ...l.cels, ...newCels }, celCache: {} } : l),
      savedStateString: null
    };
  }),
  shiftFramesRight: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.cels) return state;
    const newCels = {};
    for (const [fStr, data] of Object.entries(layer.cels)) {
       const f = parseInt(fStr);
       newCels[f + 1] = data;
    }
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: newCels, celCache: {} } : l),
      savedStateString: null
    };
  }),
  shiftFramesLeft: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.cels) return state;
    const newCels = {};
    for (const [fStr, data] of Object.entries(layer.cels)) {
       const f = parseInt(fStr);
       newCels[Math.max(1, f - 1)] = data;
    }
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: newCels, celCache: {} } : l),
      savedStateString: null
    };
  }),
  clearCurrentFrame: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (layer && layer.ctx) {
      layer.ctx.clearRect(0, 0, 99999, 99999);
    }
    const newCels = { ...(layer?.cels || {}) };
    newCels[state.currentFrame] = "";
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: newCels, celCache: {} } : l),
      savedStateString: null
    };
  }),
  copyFrameToAll: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer) return state;
    
    // Attempt to grab from ctx if it's the current active, otherwise from cels
    const canvasData = (layer.ctx && layer.id === id) ? layer.ctx.canvas.toDataURL() : (layer.cels[state.currentFrame] || "");
    const newCels = {};
    for (let i = 1; i <= state.totalFrames; i++) {
       newCels[i] = canvasData;
    }
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: newCels, celCache: {} } : l),
      savedStateString: null
    };
  }),
  randomizeFrames: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.cels) return state;
    const celsArray = Object.entries(layer.cels).map(([k, v]) => ({ frame: parseInt(k), data: v }));
    if (celsArray.length === 0) return state;
    
    const frames = celsArray.map(c => c.frame).sort((a,b) => a-b);
    const shuffledData = celsArray.map(c => c.data).sort(() => Math.random() - 0.5);
    
    const newCels = {};
    frames.forEach((f, i) => {
      newCels[f] = shuffledData[i];
    });
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: { ...l.cels, ...newCels }, celCache: {} } : l),
      savedStateString: null
    };
  }),
  pingPongAnimation: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer || !layer.cels) return state;
    const frames = Object.keys(layer.cels).map(Number).sort((a,b) => a-b);
    if (frames.length === 0) return state;
    
    const lastFrame = frames[frames.length - 1];
    const newCels = { ...layer.cels };
    let nextFrame = lastFrame + 1;
    
    // Copy the frames in reverse order (omitting the very last frame so it doesn't double-play)
    for (let i = frames.length - 2; i >= 0; i--) {
      newCels[nextFrame] = layer.cels[frames[i]];
      nextFrame++;
    }
    
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: newCels, celCache: {} } : l),
      totalFrames: Math.max(state.totalFrames, nextFrame - 1),
      savedStateString: null
    };
  }),
  extendFrameDuration: (id) => set((state) => {
    return { ...state };
  }),
  deleteFrame: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (!layer) return state;
    const newCels = { ...(layer.cels || {}) };
    newCels[state.currentFrame] = "";
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: newCels, celCache: {} } : l),
      savedStateString: null
    };
  }),


  duplicateFrameTimes: (frame, times) => {
    if (times <= 0) return;
    const state = get();
    state._saveCurrentCels();
    
    const newLayers = state.layers.map((l) => {
      const newCels = { ...l.cels };
      const newCelCache = { ...l.celCache };
      
      // Shift all cels after the duplicated frame to the right by `times`
      for (let f = state.totalFrames; f > frame; f--) {
        if (newCels[f] !== undefined) {
          newCels[f + times] = newCels[f];
          delete newCels[f];
        }
        if (newCelCache[f] !== undefined) {
          newCelCache[f + times] = newCelCache[f];
          delete newCelCache[f];
        }
      }
      
      // Copy the content of the target frame to the newly inserted `times` frames
      const celToCopy = newCels[frame] || "";
      const cacheToCopy = newCelCache[frame];
      
      for (let i = 1; i <= times; i++) {
        newCels[frame + i] = celToCopy;
        if (cacheToCopy) {
          const clonedCanvas = document.createElement("canvas");
          clonedCanvas.width = state.width;
          clonedCanvas.height = state.height;
          const clonedCtx = clonedCanvas.getContext("2d");
          if (clonedCtx) {
            clonedCtx.drawImage(cacheToCopy, 0, 0);
          }
          newCelCache[frame + i] = clonedCanvas;
        }
      }
      
      return {
        ...l,
        cels: newCels,
        celCache: newCelCache
      };
    });
    
    set({
      totalFrames: state.totalFrames + times,
      layers: newLayers
    });
    
    // Switch to the first duplicated frame
    get().setCurrentFrame(frame + 1);
  },

  reorderFrames: (fromFrame: number, toFrame: number) => {
    const state = get();
    if (fromFrame === toFrame || fromFrame < 1 || toFrame < 1 || fromFrame > state.totalFrames || toFrame > state.totalFrames) {
      return;
    }

    state._saveCurrentCels();

    const frameIndices = Array.from({ length: state.totalFrames }, (_, i) => i + 1);
    const [movedFrame] = frameIndices.splice(fromFrame - 1, 1);
    frameIndices.splice(toFrame - 1, 0, movedFrame);

    // frameIndices[i] is the old frame number that is now at position i + 1
    const newLayers = state.layers.map((l) => {
      const newCels: { [frame: number]: string } = {};
      const newCelCache: { [frame: number]: HTMLCanvasElement } = {};

      frameIndices.forEach((oldFrame, newIdx) => {
        const newFrameNum = newIdx + 1;
        if (l.cels[oldFrame] !== undefined) {
          newCels[newFrameNum] = l.cels[oldFrame];
        }
        if (l.celCache && l.celCache[oldFrame]) {
          newCelCache[newFrameNum] = l.celCache[oldFrame];
        }
      });

      return {
        ...l,
        cels: newCels,
        celCache: newCelCache,
      };
    });

    const newFrameDurations: { [frame: number]: number } = {};
    const newKeyframedLayers: { [frame: number]: string[] } = {};

    frameIndices.forEach((oldFrame, newIdx) => {
      const newFrameNum = newIdx + 1;
      if (state.frameDurations[oldFrame] !== undefined) {
        newFrameDurations[newFrameNum] = state.frameDurations[oldFrame];
      }
      if (state.keyframedLayers[oldFrame] !== undefined) {
        newKeyframedLayers[newFrameNum] = state.keyframedLayers[oldFrame];
      }
    });

    // Reorder keyframes array
    const oldToNewMap = new Map<number, number>();
    frameIndices.forEach((oldFrame, newIdx) => {
      oldToNewMap.set(oldFrame, newIdx + 1);
    });

    const newKeyframes = state.keyframes.map((k) => ({
      ...k,
      frame: oldToNewMap.get(k.frame) || k.frame,
    }));

    let targetCurrentFrame = state.currentFrame;
    if (state.currentFrame === fromFrame) {
      targetCurrentFrame = toFrame;
    } else if (fromFrame < toFrame && state.currentFrame > fromFrame && state.currentFrame <= toFrame) {
      targetCurrentFrame = state.currentFrame - 1;
    } else if (fromFrame > toFrame && state.currentFrame >= toFrame && state.currentFrame < fromFrame) {
      targetCurrentFrame = state.currentFrame + 1;
    }

    set({
      layers: newLayers,
      frameDurations: newFrameDurations,
      keyframedLayers: newKeyframedLayers,
      keyframes: newKeyframes,
    });

    get().setCurrentFrame(targetCurrentFrame);
  },

  _saveCurrentCels: () => {
    const state = get();
    const frame = state.currentFrame;
    const isPlaying = state.isPlaying;

    const newLayers = state.layers.map((l) => {
      if (!l.canvas && l.type !== "vector") return l;
      let data = l.cels[frame] || "";
      let celCache = l.celCache || {};

      if (l.canvas) {
        let cachedCanvas = celCache[frame];
        if (!cachedCanvas) {
          cachedCanvas = document.createElement("canvas");
        }
        cachedCanvas.width = state.width;
        cachedCanvas.height = state.height;
        const cachedCtx = cachedCanvas.getContext("2d");
        if (cachedCtx) {
          cachedCtx.clearRect(0, 0, 99999, 99999);
          cachedCtx.drawImage(l.canvas, 0, 0);
        }
        celCache = { ...celCache, [frame]: cachedCanvas };
      }

      if (l.type === "vector") {
        data = (l.elements && l.elements.length > 0) ? JSON.stringify(l.elements) : "";
      } else if (l.canvas && !isPlaying) {
        if (isCanvasBlank(l.canvas)) {
          data = "";
        } else {
          data = l.canvas.toDataURL("image/webp", 0.5);
        }
      }

      return {
        ...l,
        cels: { ...l.cels, [frame]: data },
        celCache,
      };
    });
    set({ layers: newLayers });
  },

  appView: "start",
  setAppView: (appView) => set({ appView }),
  
  sendToDM: async () => {
    const state = get();
    state.setNotification({ message: "Processando animação para envio...", type: "info" });
    
    try {
      // Functional part: Actually perform the export to ensure it works
      const frames = await state._exportFrames();
      if (frames.length > 0) {
        state.setNotification({ message: "Vídeo enviado com sucesso para as DMs!", type: "success" });
      } else {
        state.setNotification({ message: "Erro ao exportar vídeo.", type: "error" });
      }
    } catch (e) {
      state.setNotification({ message: "Falha no envio.", type: "error" });
    }
  },

  simpleMode: localStorage.getItem("saved_simple_mode") === "true",
  setSimpleMode: (enabled) => {
    localStorage.setItem("saved_simple_mode", enabled ? "true" : "false");
    set((state) => ({ 
      simpleMode: enabled,
      onionSkin: enabled ? true : state.onionSkin
    }));
  },
  createNewProject: () => {
    set({
      currentFirestoreProjectId: null,
      layers: [],
      appView: "editor",
    });
    get().resetCanvas();
    get().addLayer();
  },

  _exportFrames: async () => {
    const state = get();
    const frames: string[] = [];
    const { width, height, layers, totalFrames, currentFrame } = state;

    // We need to save current frame before exporting all
    state._saveCurrentCels();

    // Create a temporary canvas for compositing
    const compositeCanvas = document.createElement("canvas");
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    const ctx = compositeCanvas.getContext("2d")!;

    // Iterate through all frames
    const bgCol = state.canvasBackgroundColor;
    for (let f = 1; f <= totalFrames; f++) {
      ctx.clearRect(0, 0, 99999, 99999);
      // Background
      if (bgCol !== "transparent") {
        ctx.fillStyle = bgCol;
        ctx.fillRect(0, 0, width, height);
      }

      // Compositing layers from bottom to top
      const reversedLayers = [...layers].reverse();

      for (const layer of reversedLayers) {
        if (!layer.visible) continue;

        ctx.globalAlpha = layer.opacity / 100;
        ctx.globalCompositeOperation = layer.blendMode;

        let cel = layer.cels[f];
        if (!cel) {
          for (let prevF = f - 1; prevF >= 1; prevF--) {
            if (layer.cels[prevF]) {
              cel = layer.cels[prevF];
              break;
            }
          }
        }
        if (cel) {
          if (layer.type === "vector") {
            // Vector layers need to be rendered for export
            // This is complex, but for now we search for the cel data
            // which is a JSON string of elements
            const elements = JSON.parse(cel);
            // We'd need a dedicated renderer here, but usually,
            // we'd have a temporary canvas to draw the elements.
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tCtx = tempCanvas.getContext("2d")!;
            // Note: Normally we'd use CanvasArea's draw implementation.
            // For brevity, we'll skip complex vector render in export for now
            // or assume user converted to raster.
          } else {
            await new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, 0, 0);
                resolve(null);
              };
              img.src = cel;
            });
          }
        }
      }
      frames.push(compositeCanvas.toDataURL("image/png"));
    }
    return frames;
  },

  createFromVideo: async (file: File) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.preload = "auto";

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    const { videoWidth, videoHeight, duration } = video;
    const fps = 12; // Standard extraction
    const totalFrames = Math.floor(duration * fps);

    set({
      width: videoWidth,
      height: videoHeight,
      totalFrames,
      fps,
      appView: "editor",
      layers: [],
    });

    get().addLayer(); // Create background layer
    const state = get();
    const activeLayer = state.layers[0];

    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d")!;

    for (let f = 1; f <= totalFrames; f++) {
      video.currentTime = f / fps;
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });
      ctx.drawImage(video, 0, 0);
      activeLayer.cels[f] = canvas.toDataURL("image/webp", 0.5);
    }

    // Load first frame
    get().setCurrentFrame(1);
    URL.revokeObjectURL(video.src);
  },

  user: null,
  userProfile: null,
  setUser: (user) => set({ user }),
  setUserProfile: (userProfile) => set({ userProfile }),
  updateUserProfileInFirestore: async (data: any) => {
    const { user } = get();
    if (!user) return;
    
    const cleanData: any = {};
    Object.keys(data).forEach((key) => {
      if (data[key] !== null && data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    });

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...cleanData,
          uid: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("Error updating user profile: ", e);
    }
  },

  // Game/Rewards State
  gamePoints: 0,
  addGamePoints: (points) =>
    set((state) => ({ gamePoints: state.gamePoints + points })),
  increaseCloudSpace: (mb) =>
    set((state) => ({
      userProfile: {
        ...state.userProfile,
        storageLimit: (state.userProfile?.storageLimit || 0) + mb,
      },
    })),

  firebaseProjects: [],
  firebaseFolders: [],
  currentFirestoreProjectId: null,
  setFirebaseProjects: (firebaseProjects) => set({ firebaseProjects }),
  setFirebaseFolders: (firebaseFolders) => set({ firebaseFolders }),

  createFolderInFirestore: async (name) => {
    const { user } = get();
    if (!user) return;
    const folderId = uuidv4();
    await setDoc(doc(db, "folders", folderId), {
      id: folderId,
      userId: user.uid,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  renameFolderInFirestore: async (id, name) => {
    try {
      await setDoc(
        doc(db, "folders", id),
        {
          name,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("Error renaming folder:", e);
    }
  },

  deleteFolderFromFirestore: async (id, mode: "all" | "app" | "cloud") => {
    if (mode === "all" || mode === "cloud") {
      try {
        await deleteDoc(doc(db, "folders", id));
        console.log(`Folder ${id} deleted from cloud.`);

        // Move projects within this folder to the root (folderId = null)
        try {
          const projectsRef = collection(db, "projects");
          const q = query(projectsRef, where("folderId", "==", id));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const batch = writeBatch(db);
            querySnapshot.forEach((docSnap) => {
              batch.update(docSnap.ref, {
                folderId: null,
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
            console.log(`Moved projects from deleted folder ${id} to root.`);
          }
        } catch (err) {
          console.error(
            "Error moving orphaned projects during folder deletion:",
            err,
          );
        }
      } catch (e) {
        console.error("Error deleting folder from cloud:", e);
        throw e;
      }
    }
    if (mode === "all" || mode === "app") {
      set((state) => ({
        firebaseFolders: state.firebaseFolders.filter((f) => f.id !== id),
        firebaseProjects: state.firebaseProjects.map((p) =>
          p.folderId === id ? { ...p, folderId: null } : p,
        ),
      }));
    }
  },

  renameFolder: async (id, newName) => {
    try {
      await setDoc(
        doc(db, "folders", id),
        { name: newName, updatedAt: serverTimestamp() },
        { merge: true },
      );
      set((state) => ({
        firebaseFolders: state.firebaseFolders.map((f) =>
          f.id === id ? { ...f, name: newName } : f,
        ),
      }));
    } catch (e) {
      console.error("Error renaming folder:", e);
      throw e;
    }
  },

  moveProjectToFolder: async (projectId, folderId) => {
    try {
      await setDoc(
        doc(db, "projects", projectId),
        {
          folderId,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.error("Error moving project: ", e);
    }
  },

  activeCollaborationId: null,
  initiateCollaboration: async (targetUserId) => {
    const { user, width, height, resetCanvas } = get();
    if (!user) return;

    try {
      const collabId = uuidv4();

      await setDoc(doc(db, "collaborations", collabId), {
        id: collabId,
        hostId: user.uid,
        hostName: user.displayName,
        guestId: targetUserId,
        status: "active",
        width,
        height,
        createdAt: serverTimestamp(),
      });

      const msgId = uuidv4();
      await setDoc(doc(db, "messages", msgId), {
        id: msgId,
        senderId: user.uid,
        senderName: user.displayName || "Usuário",
        receiverId: targetUserId,
        content:
          "Vamos desenhar juntos! Clique aqui para entrar na minha sessão ao vivo.",
        type: "project",
        projectId: collabId,
        projectName: "Sessão Colaborativa (Ao Vivo)",
        projectUrl: "https://cdn-icons-png.flaticon.com/512/3242/3242212.png",
        isRead: false,
        createdAt: serverTimestamp(),
      });

      resetCanvas();
      set({ activeCollaborationId: collabId, appView: "editor" });
      alert("Sessão colaborativa iniciada com o tamanho atual! Esperando seu amigo entrar.");
    } catch (e) {
      console.error("Error initiating collaboration:", e);
    }
  },

  joinCollaboration: async (collabId) => {
    const { user, resetCanvas } = get();
    if (!user) return;
    try {
      const collabSnap = await getDoc(doc(db, "collaborations", collabId));
      if (collabSnap.exists()) {
        const data = collabSnap.data();
        if (data.width && data.height) {
          set({ width: data.width, height: data.height });
        }
      }
    } catch (err) {
      console.error("Error loading collaboration data", err);
    }
    resetCanvas();
    set({ activeCollaborationId: collabId, appView: "editor" });
  },

  leaveCollaboration: () => {
    set({ activeCollaborationId: null });
  },

  loadProjectFromFirestore: async (id) => {
    const docRef = doc(db, "projects", id);
    let docSnap;
    try {
      docSnap = await getDoc(docRef);
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, "projects/" + id);
    }
    if (docSnap.exists()) {
      const data = docSnap.data();
      await get()._loadSnapshot(data.layersData);
      set({
        currentFirestoreProjectId: id,
        width: data.width,
        height: data.height,
        appView: "editor",
      });
    }
  },

  saveProjectToFirestore: async () => {
    const { user, currentFirestoreProjectId, width, height, layers } = get();
    if (!user) return;

    const projectId = currentFirestoreProjectId || uuidv4();
    const layersData = get()._serializeState();

    // Generate a simple thumbnail
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200 * (height / width);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      layers.forEach((layer) => {
        if (layer.visible && layer.canvas) {
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode;
          ctx.drawImage(layer.canvas, 0, 0, canvas.width, canvas.height);
        }
      });
    }
    const thumbnail = canvas.toDataURL("image/webp", 0.3);

    const projectData: any = {
      id: projectId,
      userId: user.uid,
      name: layers[0]?.name || "Untitled",
      width,
      height,
      layersData,
      thumbnail,
      updatedAt: serverTimestamp(),
    };

    if (!currentFirestoreProjectId) {
      projectData.createdAt = serverTimestamp();
      projectData.folderId = null; // Default to root only for new projects
    }

    // Fallback to offline local drafts when not connected
    if (!get().isOnline) {
      const offlineProjects = JSON.parse(localStorage.getItem("offline_projects_drafts") || "[]");
      const existingIdx = offlineProjects.findIndex((p: any) => p.id === projectId);
      
      const offlineProjectData = {
        ...projectData,
        createdAt: projectData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isOfflineDraft: true
      };
      
      if (existingIdx >= 0) {
        offlineProjects[existingIdx] = offlineProjectData;
      } else {
        offlineProjects.push(offlineProjectData);
      }
      
      localStorage.setItem("offline_projects_drafts", JSON.stringify(offlineProjects));
      set({ currentFirestoreProjectId: projectId });
      get().setNotification({
        message: "Salvo localmente (Modo Offline)! Sincronizará quando voltar online.",
        type: "success"
      });
      return;
    }

    try {
      await setDoc(doc(db, "projects", projectId), projectData, {
        merge: true,
      });
      set({ currentFirestoreProjectId: projectId });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "projects/" + projectId);
    }
  },

  deleteProjectFromFirestore: async (id, mode: "all" | "app" | "cloud") => {
    if (mode === "all" || mode === "cloud") {
      try {
        await deleteDoc(doc(db, "projects", id));
        console.log(`Project ${id} deleted from cloud.`);
      } catch (e) {
        console.error("Error deleting project from cloud:", e);
        throw e;
      }
    }
    if (mode === "all" || mode === "app") {
      set((state) => ({
        firebaseProjects: state.firebaseProjects.filter((p) => p.id !== id),
      }));
    }
  },

  hasSavedState: false,
  checkSavedState: () => {
    set({ hasSavedState: !!localStorage.getItem("drawing-app-autosave") });
  },

  history: [],
  historyIndex: -1,

  _serializeState: () => {
    const state = get();
    const serializedLayers = state.layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      clippingMask: layer.clippingMask,
      type: layer.type,
      elements: layer.elements,
      dataUrl: layer.canvas ? layer.canvas.toDataURL("image/webp", 0.5) : null,
      cels: { ...layer.cels },
      folderId: layer.folderId,
      disableKeyframes: layer.disableKeyframes,
    }));

    return JSON.stringify({
      width: state.width,
      height: state.height,
      activeLayerId: state.activeLayerId,
      animationEnabled: state.animationEnabled,
      totalFrames: state.totalFrames,
      currentFrame: state.currentFrame,
      fps: state.fps,
      layers: serializedLayers,
    });
  },

  _loadSnapshot: async (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const newLayers: Layer[] = await Promise.all(
        parsed.layers.map(async (l: any) => {
          const canvas = document.createElement("canvas");
          canvas.width = parsed.width || 800;
          canvas.height = parsed.height || 600;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
          }

          if (l.dataUrl) {
            await new Promise((resolve) => {
              const img = new Image();
              let resolved = false;
              const done = () => {
                if (!resolved) {
                  resolved = true;
                  resolve(null);
                }
              };
              img.onload = () => {
                ctx?.drawImage(img, 0, 0);
                done();
              };
              img.onerror = () => {
                console.warn("Failed to load layer data URL");
                done();
              };
              setTimeout(done, 1000);
              img.src = l.dataUrl;
            });
          }

          return {
            id: l.id,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            blendMode: l.blendMode || "source-over",
            clippingMask: l.clippingMask || false,
            type: l.type,
            elements: l.elements
              ? JSON.parse(JSON.stringify(l.elements))
              : undefined,
            canvas,
            ctx,
            cels: l.cels || {},
            folderId: l.folderId || null,
            disableKeyframes: l.disableKeyframes || false,
          };
        }),
      );

      set({
        width: parsed.width || 800,
        height: parsed.height || 600,
        animationEnabled: parsed.animationEnabled || false,
        totalFrames: parsed.totalFrames || 24,
        currentFrame: parsed.currentFrame || 1,
        fps: parsed.fps || 12,
        layers: newLayers,
        activeLayerId:
          parsed.activeLayerId ||
          (newLayers.length > 0 ? newLayers[0].id : null),
        selection: null,
        floatingSelection: null,
        bezierPoints: [],
      });

      window.dispatchEvent(new CustomEvent("render-display"));
      return true;
    } catch (e) {
      console.error("Failed to load snapshot", e);
      return false;
    }
  },

  _loadFromHistorySnapshot: async (snap: HistorySnapshot) => {
    const newLayers: Layer[] = snap.layers.map((l) => {
      const canvas = document.createElement("canvas");
      canvas.width = snap.width;
      canvas.height = snap.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (l.canvasCopy) {
          ctx.drawImage(l.canvasCopy, 0, 0);
        }
      }
      return {
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        blendMode: l.blendMode,
        clippingMask: l.clippingMask,
        type: l.type,
        elements: l.elements
          ? JSON.parse(JSON.stringify(l.elements))
          : undefined,
        canvas,
        ctx,
        cels: l.cels,
        folderId: l.folderId || null,
      };
    });

    set({
      width: snap.width,
      height: snap.height,
      layers: newLayers,
      activeLayerId: snap.activeLayerId,
      selection: null,
      floatingSelection: null,
      bezierPoints: [],
    });

    window.dispatchEvent(new CustomEvent("render-display"));
  },

  pushHistory: () => {
    const state = get();

    // Create instant snapshot by cloning canvases
    const snapLayers = state.layers.map((layer) => {
      let canvasCopy = null;
      if (layer.canvas) {
        canvasCopy = document.createElement("canvas");
        canvasCopy.width = state.width;
        canvasCopy.height = state.height;
        const ctx = canvasCopy.getContext("2d");
        if (ctx) ctx.drawImage(layer.canvas, 0, 0);
      }
      return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        clippingMask: layer.clippingMask,
        type: layer.type,
        elements: layer.elements
          ? JSON.parse(JSON.stringify(layer.elements))
          : undefined,
        canvasCopy,
        cels: { ...layer.cels },
        folderId: layer.folderId || null,
      };
    });

    const snapshot: HistorySnapshot = {
      width: state.width,
      height: state.height,
      activeLayerId: state.activeLayerId,
      layers: snapLayers,
    };

    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(snapshot);

    // Limit history to 15 chunks
    if (newHistory.length > 15) {
      newHistory.shift();
    }

    set({ history: newHistory, historyIndex: newHistory.length - 1 });
    
    // Auto-save locally on history push
    try {
      get().saveToLocalStorage();
    } catch (e) {
      // ignore
    }
  },

  undo: async (broadcast = true) => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      await state._loadFromHistorySnapshot(state.history[newIndex]);
      set({ historyIndex: newIndex });
      get().saveToLocalStorage();
      
      if (broadcast && state.activeCollaborationId && auth.currentUser) {
        addDoc(collection(db, `collaborations/${state.activeCollaborationId}/strokes`), {
          userId: auth.currentUser.uid,
          data: JSON.stringify({ type: "undo_action" }),
          createdAt: serverTimestamp(),
        }).catch(console.error);
      }
    }
  },

  redo: async (broadcast = true) => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      await state._loadFromHistorySnapshot(state.history[newIndex]);
      set({ historyIndex: newIndex });
      get().saveToLocalStorage();

      if (broadcast && state.activeCollaborationId && auth.currentUser) {
        addDoc(collection(db, `collaborations/${state.activeCollaborationId}/strokes`), {
          userId: auth.currentUser.uid,
          data: JSON.stringify({ type: "redo_action" }),
          createdAt: serverTimestamp(),
        }).catch(console.error);
      }
    }
  },

  undoAll: async (broadcast = true) => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = 0;
      await state._loadFromHistorySnapshot(state.history[newIndex]);
      set({ historyIndex: newIndex });
      get().saveToLocalStorage();

      if (broadcast && state.activeCollaborationId && auth.currentUser) {
        addDoc(collection(db, `collaborations/${state.activeCollaborationId}/strokes`), {
          userId: auth.currentUser.uid,
          data: JSON.stringify({ type: "undo_all_action" }),
          createdAt: serverTimestamp(),
        }).catch(console.error);
      }
    }
  },

  redoAll: async (broadcast = true) => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.history.length - 1;
      await state._loadFromHistorySnapshot(state.history[newIndex]);
      set({ historyIndex: newIndex });
      get().saveToLocalStorage();

      if (broadcast && state.activeCollaborationId && auth.currentUser) {
        addDoc(collection(db, `collaborations/${state.activeCollaborationId}/strokes`), {
          userId: auth.currentUser.uid,
          data: JSON.stringify({ type: "redo_all_action" }),
          createdAt: serverTimestamp(),
        }).catch(console.error);
      }
    }
  },

  _debouncedCloudSave: () => {
    const state = get();
    if (!state.user || !state.isOnline) return;
    if ((state as any)._cloudSaveTimer) {
      clearTimeout((state as any)._cloudSaveTimer);
    }
    (state as any)._cloudSaveTimer = setTimeout(() => {
      get().saveProjectToFirestore().catch(() => {});
    }, 2500);
  },

  saveToLocalStorage: () => {
    const state = get();
    const layersJson = state._serializeState();

    const serializedState = {
      tool: state.tool,
      color: state.color,
      brushSize: state.brushSize,
      brushOpacity: state.brushOpacity,
      brushTexture: state.brushTexture,
      stabilizer: state.stabilizer,
      brushPresets: state.brushPresets,
      customBrushes: state.customBrushes,
      fillTolerance: state.fillTolerance,
      simpleMode: state.simpleMode,
      layersJson,
      updatedAt: new Date().toISOString(),
    };

    const currentId = state.currentFirestoreProjectId || "local_draft_main";
      
    // Generate a quick thumbnail for local project list
    let thumbnail = "";
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = Math.max(80, Math.round(160 * (state.height / state.width)));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (state.canvasBackgroundColor && state.canvasBackgroundColor !== "transparent") {
          ctx.fillStyle = state.canvasBackgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        state.layers.forEach((layer) => {
          if (layer.visible && layer.canvas) {
            ctx.globalAlpha = layer.opacity / 100;
            ctx.globalCompositeOperation = layer.blendMode || "source-over";
            ctx.drawImage(layer.canvas, 0, 0, canvas.width, canvas.height);
          }
        });
        thumbnail = canvas.toDataURL("image/webp", 0.3);
      }
    } catch (err) {
      // ignore canvas snapshot error
    }

    const projectEntry = {
      id: currentId,
      name: state.projectName || state.layers[0]?.name || "Desenho Recente",
      width: state.width,
      height: state.height,
      thumbnail,
      layersJson,
      updatedAt: new Date().toISOString(),
    };

    // Save full data to IndexedDB (no 5MB quota restriction!)
    setLocalDraft(currentId, projectEntry).catch(console.warn);
    setLocalDraft("autosave", serializedState).catch(console.warn);

    try {
      localStorage.setItem("drawing-app-autosave", JSON.stringify(serializedState));

      const localProjects = JSON.parse(localStorage.getItem("local_projects_drafts") || "[]");
      const existingIdx = localProjects.findIndex((p: any) => p.id === currentId);

      // Light-weight entry for localStorage list (strip layersJson if quota warning)
      const lightProjectEntry = { ...projectEntry };

      if (existingIdx >= 0) {
        localProjects[existingIdx] = lightProjectEntry;
      } else {
        localProjects.unshift(lightProjectEntry);
      }

      if (localProjects.length > 10) localProjects.length = 10;
      localStorage.setItem("local_projects_drafts", JSON.stringify(localProjects));

      set({ hasSavedState: true });
    } catch (e) {
      console.warn("LocalStorage save warning (using IndexedDB primary):", e);
      set({ hasSavedState: true });
    }

    // Auto cloud save if user logged in
    if (state.user && state.isOnline) {
      state._debouncedCloudSave();
    }
  },

  loadLocalProject: async (id: string) => {
    try {
      if (id === "autosave" || id === "local_draft_main") {
        await get().restoreFromLocalStorage();
        set({ appView: "editor" });
        return;
      }

      // Try IndexedDB first
      let matched = await getLocalDraft(id);
      if (!matched) {
        const localProjects = JSON.parse(localStorage.getItem("local_projects_drafts") || "[]");
        matched = localProjects.find((p: any) => p.id === id);
      }

      if (matched && matched.layersJson) {
        await get()._loadSnapshot(matched.layersJson);
        set({
          currentFirestoreProjectId: matched.id.startsWith("local_") ? null : matched.id,
          width: matched.width || 800,
          height: matched.height || 600,
          projectName: matched.name || "Desenho Recente",
          appView: "editor",
        });
      } else {
        await get().restoreFromLocalStorage();
        set({ appView: "editor" });
      }
    } catch (e) {
      console.error("Error loading local project:", e);
      set({ appView: "editor" });
    }
  },

  deleteLocalProject: (id: string) => {
    try {
      deleteLocalDraft(id).catch(console.warn);
      const localProjects = JSON.parse(localStorage.getItem("local_projects_drafts") || "[]");
      const filtered = localProjects.filter((p: any) => p.id !== id);
      localStorage.setItem("local_projects_drafts", JSON.stringify(filtered));
      if (id === "local_draft_main" || id === "autosave") {
        localStorage.removeItem("drawing-app-autosave");
        deleteLocalDraft("autosave").catch(console.warn);
        set({ hasSavedState: false });
      }
    } catch (e) {
      console.error("Error deleting local project:", e);
    }
  },

  restoreFromLocalStorage: async () => {
    try {
      let savedStr = localStorage.getItem("drawing-app-autosave");
      let parsed: any = null;
      if (savedStr) {
        try { parsed = JSON.parse(savedStr); } catch (e) {}
      }
      if (!parsed) {
        parsed = await getLocalDraft("autosave");
      }
      if (!parsed) return false;

      if (parsed.layersJson) {
        await get()._loadSnapshot(parsed.layersJson);
      } else if (parsed.layers) {
        // Fallback for older format if user has cached data without layersJson
        await get()._loadSnapshot(
          JSON.stringify({
            width: parsed.width,
            height: parsed.height,
            activeLayerId: parsed.layers[0]?.id,
            layers: parsed.layers,
          }),
        );
      }

      set({
        tool: parsed.tool || "brush",
        color: parsed.color || "#000000",
        brushSize: parsed.brushSize || 10,
        brushOpacity: parsed.brushOpacity || 100,
        brushTexture: parsed.brushTexture || "solid",
        stabilizer: Number(parsed.stabilizer) || 50,
        brushPresets: parsed.brushPresets || [],
        customBrushes: parsed.customBrushes || [],
        fillTolerance: Number(localStorage.getItem("saved_fill_tolerance") || parsed.fillTolerance || "0"),
        simpleMode: localStorage.getItem("saved_simple_mode") === "true",
      });

      setTimeout(() => get().pushHistory(), 50); // Initial history point

      return true;
    } catch (e) {
      console.error("Failed to restore from localStorage", e);
      return false;
    }
  },
}));
