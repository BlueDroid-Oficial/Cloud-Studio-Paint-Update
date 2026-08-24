const fs = require('fs');
let code = fs.readFileSync('src/components/Timeline.tsx', 'utf-8');

code = code.replace(
  "const hasCel = !!layer.cels[fNum];\n                    const isKeyframe = keyframes.some(k => k.layerId === layer.id && k.frame === fNum);",
  `const isKeyframe = !layer.disableKeyframes && keyframes.some(k => k.layerId === layer.id && k.frame === fNum);
                    const hasCel = layer.disableKeyframes ? (fNum === 1 || !!layer.cels[fNum]) : !!layer.cels[fNum];`
);

fs.writeFileSync('src/components/Timeline.tsx', code);
