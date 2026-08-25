const fs = require('fs');
let store = fs.readFileSync('src/store/useStore.ts', 'utf-8');

// Remove the fallback loop
const fallbackPattern = /if \(celData === undefined\) \{[\s\S]*?for \(let prevF = frame - 1; prevF >= 1; prevF--\) \{[\s\S]*?if \(l\.cels\[prevF\]\) \{[\s\S]*?celData = l\.cels\[prevF\];[\s\S]*?cachedCanvas = l\.celCache\?\.\[prevF\];[\s\S]*?break;[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/;

store = store.replace(fallbackPattern, '');

// Also fix addFrame to actually create a blank frame
store = store.replace(
  'addFrame: () => set((state) => ({ totalFrames: state.totalFrames + 1 })),',
  'addFrame: () => set((state) => {\n    const newFrame = state.totalFrames + 1;\n    const newLayers = state.layers.map(l => ({\n      ...l,\n      cels: { ...l.cels, [newFrame]: "" }\n    }));\n    return { totalFrames: newFrame, layers: newLayers };\n  }),'
);

// We should also look at toggleKeyframe and similar places
fs.writeFileSync('src/store/useStore.ts', store);
