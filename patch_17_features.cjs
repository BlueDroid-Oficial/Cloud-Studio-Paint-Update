const fs = require('fs');
let store = fs.readFileSync('src/store/useStore.ts', 'utf-8');

const actionsInterface = `
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
`;

// Inject interface
store = store.replace('duplicateFrameTimes: (frame: number, times: number) => void;', 'duplicateFrameTimes: (frame: number, times: number) => void;\n' + actionsInterface);

const actionsImpl = `
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
    const layerKeyframes = state.keyframes.filter(k => k.layerId === id);
    if(layerKeyframes.length === 0) return state;
    
    // Reverse their canvasData contents but keep them at the same frame indices
    const sortedIndices = layerKeyframes.map(k => k.frame).sort((a,b) => a-b);
    const reversedData = layerKeyframes.map(k => k.canvasData).reverse();
    
    const newKeyframes = state.keyframes.map(k => {
      if (k.layerId === id) {
        const sortedIndex = sortedIndices.indexOf(k.frame);
        return { ...k, canvasData: reversedData[sortedIndex] };
      }
      return k;
    });
    return { keyframes: newKeyframes, savedStateString: null };
  }),
  shiftFramesRight: (id) => set((state) => {
    const newKeyframes = state.keyframes.map(k => {
      if (k.layerId === id) return { ...k, frame: k.frame + 1 };
      return k;
    });
    return { keyframes: newKeyframes, savedStateString: null };
  }),
  shiftFramesLeft: (id) => set((state) => {
    const newKeyframes = state.keyframes.map(k => {
      if (k.layerId === id) return { ...k, frame: Math.max(1, k.frame - 1) };
      return k;
    });
    return { keyframes: newKeyframes, savedStateString: null };
  }),
  clearCurrentFrame: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if (layer && layer.ctx) {
      layer.ctx.clearRect(0, 0, state.width, state.height);
    }
    const newKeyframes = state.keyframes.map(k => {
      if (k.layerId === id && k.frame === state.currentFrame) {
        return { ...k, canvasData: "" };
      }
      return k;
    });
    return { keyframes: newKeyframes, savedStateString: null };
  }),
  copyFrameToAll: (id) => set((state) => {
    const layer = state.layers.find(l => l.id === id);
    if(!layer || !layer.ctx) return state;
    const canvasData = layer.ctx.canvas.toDataURL();
    
    const newKeyframes = state.keyframes.map(k => {
      if (k.layerId === id) {
        return { ...k, canvasData };
      }
      return k;
    });
    return { keyframes: newKeyframes, savedStateString: null };
  }),
  randomizeFrames: (id) => set((state) => {
    const layerKeyframes = state.keyframes.filter(k => k.layerId === id);
    if(layerKeyframes.length === 0) return state;
    
    const sortedIndices = layerKeyframes.map(k => k.frame).sort((a,b) => a-b);
    const shuffledData = layerKeyframes.map(k => k.canvasData).sort(() => Math.random() - 0.5);
    
    const newKeyframes = state.keyframes.map(k => {
      if (k.layerId === id) {
        const sortedIndex = sortedIndices.indexOf(k.frame);
        return { ...k, canvasData: shuffledData[sortedIndex] };
      }
      return k;
    });
    return { keyframes: newKeyframes, savedStateString: null };
  }),
  pingPongAnimation: (id) => set((state) => {
    // A bit complex for keyframes, just copy reverse at the end
    const layerKeyframes = state.keyframes.filter(k => k.layerId === id);
    if(layerKeyframes.length === 0) return state;
    
    const sortedKfs = [...layerKeyframes].sort((a,b) => a.frame - b.frame);
    const lastFrame = sortedKfs[sortedKfs.length - 1].frame;
    
    const pingPongKfs = sortedKfs.slice(0, -1).reverse().map((k, i) => {
       return { ...k, id: crypto.randomUUID(), frame: lastFrame + i + 1 };
    });
    
    return { keyframes: [...state.keyframes, ...pingPongKfs], savedStateString: null };
  }),
  extendFrameDuration: (id) => set((state) => {
    return { ...state };
  }),
  deleteFrame: (id) => set((state) => {
    const newKeyframes = state.keyframes.filter(k => !(k.layerId === id && k.frame === state.currentFrame));
    return { keyframes: newKeyframes, savedStateString: null };
  }),
`;

// Inject implementation
store = store.replace('duplicateFrameTimes: (frame, times) => {', actionsImpl + '\n  duplicateFrameTimes: (frame, times) => {');

fs.writeFileSync('src/store/useStore.ts', store);
