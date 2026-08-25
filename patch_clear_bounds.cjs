const fs = require('fs');

function patchFile(path) {
  let content = fs.readFileSync(path, 'utf-8');
  // Match any ctx.clearRect(0, 0, width, height) or state.width, state.height and replace with canvas bounds.
  // We can just regex replace:
  content = content.replace(/clearRect\(\s*0\s*,\s*0\s*,\s*state\.width\s*,\s*state\.height\s*\)/g, 'clearRect(0, 0, 99999, 99999)');
  content = content.replace(/clearRect\(\s*0\s*,\s*0\s*,\s*width\s*,\s*height\s*\)/g, 'clearRect(0, 0, 99999, 99999)');
  fs.writeFileSync(path, content);
}

patchFile('src/store/useStore.ts');
patchFile('src/components/CanvasArea.tsx');

