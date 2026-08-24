const fs = require('fs');
let code = fs.readFileSync('src/store/useStore.ts', 'utf-8');

code = code.replace(
  "export function getInterpolatedProperties(layer: any, keyframes: Keyframe[], frame: number) {",
  `export function getInterpolatedProperties(layer: any, keyframes: Keyframe[], frame: number) {
  if (layer.disableKeyframes) {
    return {
      opacity: layer.opacity ?? 100,
      x: layer.x ?? 0,
      y: layer.y ?? 0,
      scaleX: layer.scaleX ?? 1,
      scaleY: layer.scaleY ?? 1,
      rotation: layer.rotation ?? 0
    };
  }`
);

fs.writeFileSync('src/store/useStore.ts', code);
