const fs = require('fs');
let store = fs.readFileSync('src/store/useStore.ts', 'utf-8');

const replacement = `
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
    delete newCels[state.currentFrame];
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
    delete newCels[state.currentFrame];
    return {
      layers: state.layers.map(l => l.id === id ? { ...l, cels: newCels, celCache: {} } : l),
      savedStateString: null
    };
  }),
`;

// Regex replace the previous block of these functions:
store = store.replace(/reverseAnimation: \(id\) => set\(\(state\) => \{[\s\S]*?deleteFrame: \(id\) => set\(\(state\) => \{[\s\S]*?\}\),/g, replacement);

fs.writeFileSync('src/store/useStore.ts', store);
