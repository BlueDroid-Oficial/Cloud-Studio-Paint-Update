/**
 * Utility functions for image processing on Canvas 2D context
 */

export const applyFilter = (
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number, 
  filterType: string,
  options: any = {}
) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  switch (filterType) {
    case 'invert':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      break;

    case 'greyscale':
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i + 1] = data[i + 2] = avg;
      }
      break;

    case 'sepia':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
        data[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
        data[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
      }
      break;

    case 'threshold':
      const threshold = options.level || 128;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const val = avg >= threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = val;
      }
      break;

    case 'posterize':
      const levels = options.levels || 4;
      const step = 255 / (levels - 1);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.round(data[i] / step) * step;
        data[i + 1] = Math.round(data[i + 1] / step) * step;
        data[i + 2] = Math.round(data[i + 2] / step) * step;
      }
      break;

    case 'solarize':
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 128) data[i] = 255 - data[i];
        if (data[i + 1] < 128) data[i + 1] = 255 - data[i + 1];
        if (data[i + 2] < 128) data[i + 2] = 255 - data[i + 2];
      }
      break;

    case 'pixelate':
      const size = options.size || 8;
      for (let y = 0; y < height; y += size) {
        for (let x = 0; x < width; x += size) {
          const p = (x + y * width) * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const a = data[p + 3];

          for (let py = 0; py < size && y + py < height; py++) {
            for (let px = 0; px < size && x + px < width; px++) {
              const pp = (x + px + (y + py) * width) * 4;
              data[pp] = r;
              data[pp + 1] = g;
              data[pp + 2] = b;
              data[pp + 3] = a;
            }
          }
        }
      }
      break;

    case 'noise':
      const amount = options.amount || 50;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * amount;
        data[i] = Math.min(255, Math.max(0, data[i] + n));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
      }
      break;

    case 'hue-rotate':
      const angle = (options.angle || 90) * (Math.PI / 180);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const matrix = [
        0.213 + cosA * 0.787 - sinA * 0.213, 0.715 - cosA * 0.715 - sinA * 0.715, 0.072 - cosA * 0.072 + sinA * 0.928,
        0.213 - cosA * 0.213 + sinA * 0.143, 0.715 + cosA * 0.285 + sinA * 0.140, 0.072 - cosA * 0.072 - sinA * 0.283,
        0.213 - cosA * 0.213 - sinA * 0.787, 0.715 - cosA * 0.715 + sinA * 0.715, 0.072 + cosA * 0.928 + sinA * 0.072
      ];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        data[i]   = r * matrix[0] + g * matrix[1] + b * matrix[2];
        data[i+1] = r * matrix[3] + g * matrix[4] + b * matrix[5];
        data[i+2] = r * matrix[6] + g * matrix[7] + b * matrix[8];
      }
      break;

    case 'blur':
      const radius = options.radius || 2;
      const sigma = options.sigma || radius / 2;
      
      const tempData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, a = 0, weightSum = 0;
          for (let cy = -radius; cy <= radius; cy++) {
            for (let cx = -radius; cx <= radius; cx++) {
              const nx = x + cx;
              const ny = y + cy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const distSq = cx * cx + cy * cy;
                const weight = Math.exp(-distSq / (2 * sigma * sigma));
                const p = (nx + ny * width) * 4;
                r += tempData[p] * weight;
                g += tempData[p + 1] * weight;
                b += tempData[p + 2] * weight;
                a += tempData[p + 3] * weight;
                weightSum += weight;
              }
            }
          }
          const i = (x + y * width) * 4;
          data[i] = r / weightSum;
          data[i + 1] = g / weightSum;
          data[i + 2] = b / weightSum;
          data[i + 3] = a / weightSum;
        }
      }
      break;

    case 'box-blur':
      const boxSize = options.radius || 2;
      const boxData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0, g = 0, b = 0, a = 0, count = 0;
          for (let cy = -boxSize; cy <= boxSize; cy++) {
            for (let cx = -boxSize; cx <= boxSize; cx++) {
              const nx = x + cx;
              const ny = y + cy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const p = (nx + ny * width) * 4;
                r += boxData[p];
                g += boxData[p + 1];
                b += boxData[p + 2];
                a += boxData[p + 3];
                count++;
              }
            }
          }
          const i = (x + y * width) * 4;
          data[i] = r / count;
          data[i + 1] = g / count;
          data[i + 2] = b / count;
          data[i + 3] = a / count;
        }
      }
      break;

    case 'sharpen':
      const kernel = [
         0, -1,  0,
        -1,  5, -1,
         0, -1,  0
      ];
      const side = Math.round(Math.sqrt(kernel.length));
      const halfSide = Math.floor(side / 2);
      const src = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dstOff = (y * width + x) * 4;
          let r = 0, g = 0, b = 0;
          for (let cy = 0; cy < side; cy++) {
            for (let cx = 0; cx < side; cx++) {
              const scy = y + cy - halfSide;
              const scx = x + cx - halfSide;
              if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                const srcOff = (scy * width + scx) * 4;
                const wt = kernel[cy * side + cx];
                r += src[srcOff] * wt;
                g += src[srcOff + 1] * wt;
                b += src[srcOff + 2] * wt;
              }
            }
          }
          data[dstOff] = Math.min(255, Math.max(0, r));
          data[dstOff + 1] = Math.min(255, Math.max(0, g));
          data[dstOff + 2] = Math.min(255, Math.max(0, b));
        }
      }
      break;

    case 'vignette':
      const strength = options.strength || 0.5;
      const centerX = width / 2;
      const centerY = height / 2;
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ratio = dist / maxDist;
          const factor = 1 - (ratio * strength);
          const p = (x + y * width) * 4;
          data[p] *= factor;
          data[p+1] *= factor;
          data[p+2] *= factor;
        }
      }
      break;
    case 'brightness':
      const bright = options.level || 20;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, data[i] + bright));
        data[i+1] = Math.min(255, Math.max(0, data[i+1] + bright));
        data[i+2] = Math.min(255, Math.max(0, data[i+2] + bright));
      }
      break;
    case 'contrast':
      const cont = options.level || 20;
      const factor = (259 * (cont + 255)) / (255 * (259 - cont));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
        data[i+1] = Math.min(255, Math.max(0, factor * (data[i+1] - 128) + 128));
        data[i+2] = Math.min(255, Math.max(0, factor * (data[i+2] - 128) + 128));
      }
      break;
    case 'saturation':
      const sat = options.level || 1.5;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]; const g = data[i+1]; const b = data[i+2];
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        data[i] = Math.min(255, Math.max(0, gray + sat * (r - gray)));
        data[i+1] = Math.min(255, Math.max(0, gray + sat * (g - gray)));
        data[i+2] = Math.min(255, Math.max(0, gray + sat * (b - gray)));
      }
      break;
    case 'edge-detect':
      const edgeKernel = [
         -1, -1, -1,
         -1,  8, -1,
         -1, -1, -1
      ];
      const edgeSrc = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dstOff = (y * width + x) * 4;
          let r = 0, g = 0, b = 0;
          for (let cy = 0; cy < 3; cy++) {
            for (let cx = 0; cx < 3; cx++) {
              const scy = y + cy - 1;
              const scx = x + cx - 1;
              if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                const srcOff = (scy * width + scx) * 4;
                const wt = edgeKernel[cy * 3 + cx];
                r += edgeSrc[srcOff] * wt;
                g += edgeSrc[srcOff + 1] * wt;
                b += edgeSrc[srcOff + 2] * wt;
              }
            }
          }
          data[dstOff] = Math.min(255, Math.max(0, r));
          data[dstOff + 1] = Math.min(255, Math.max(0, g));
          data[dstOff + 2] = Math.min(255, Math.max(0, b));
        }
      }
      break;
    case 'chroma-key':
      const targetColorHex = options.color || '#00ff00';
      const tolerance = options.tolerance !== undefined ? options.tolerance : 90;
      
      const rTarget = parseInt(targetColorHex.slice(1, 3), 16) || 0;
      const gTarget = parseInt(targetColorHex.slice(3, 5), 16) || 255;
      const bTarget = parseInt(targetColorHex.slice(5, 7), 16) || 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const distance = Math.sqrt(
          (r - rTarget) * (r - rTarget) +
          (g - gTarget) * (g - gTarget) +
          (b - bTarget) * (b - bTarget)
        );

        if (distance < tolerance) {
          const alphaFade = Math.max(0, (distance - (tolerance * 0.5)) / (tolerance * 0.5));
          data[i + 3] = data[i + 3] * alphaFade;
        }
      }
      break;
    case 'emboss':
      const embossKernel = [
         -2, -1,  0,
         -1,  1,  1,
          0,  1,  2
      ];
      const embossSrc = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dstOff = (y * width + x) * 4;
          let r = 0, g = 0, b = 0;
          for (let cy = 0; cy < 3; cy++) {
            for (let cx = 0; cx < 3; cx++) {
              const scy = y + cy - 1;
              const scx = x + cx - 1;
              if (scy >= 0 && scy < height && scx >= 0 && scx < width) {
                const srcOff = (scy * width + scx) * 4;
                const wt = embossKernel[cy * 3 + cx];
                r += embossSrc[srcOff] * wt;
                g += embossSrc[srcOff + 1] * wt;
                b += embossSrc[srcOff + 2] * wt;
              }
            }
          }
          data[dstOff] = Math.min(255, Math.max(0, r + 128));
          data[dstOff + 1] = Math.min(255, Math.max(0, g + 128));
          data[dstOff + 2] = Math.min(255, Math.max(0, b + 128));
        }
      }
      break;
    case 'chromatic-aberration':
      const offset = options.offset || 5;
      const caData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const rOff = (y * width + Math.max(0, x - offset)) * 4;
          const bOff = (y * width + Math.min(width - 1, x + offset)) * 4;
          data[i] = caData[rOff];
          data[i+2] = caData[bOff+2];
        }
      }
      break;
    case 'scanlines':
      const slIntensity = options.intensity !== undefined ? options.intensity : 0.3;
      for (let y = 0; y < height; y++) {
        if (y % 2 === 0) {
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            data[i] = Math.max(0, data[i] - 255 * slIntensity);
            data[i+1] = Math.max(0, data[i+1] - 255 * slIntensity);
            data[i+2] = Math.max(0, data[i+2] - 255 * slIntensity);
          }
        }
      }
      break;
    case 'color-tint':
      const tintHex = options.color || '#ff0000';
      const tintIntensity = options.intensity !== undefined ? options.intensity : 0.5;
      const tr = parseInt(tintHex.slice(1, 3), 16) || 0;
      const tg = parseInt(tintHex.slice(3, 5), 16) || 0;
      const tb = parseInt(tintHex.slice(5, 7), 16) || 0;
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] + (tr - data[i]) * tintIntensity;
        data[i+1] = data[i+1] + (tg - data[i+1]) * tintIntensity;
        data[i+2] = data[i+2] + (tb - data[i+2]) * tintIntensity;
      }
      break;
    case 'glitch':
      const glitchAmount = options.amount || 10;
      const gData = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y++) {
        const shift = Math.floor((Math.random() - 0.5) * glitchAmount);
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const srcX = Math.min(width - 1, Math.max(0, x + shift));
          const srcI = (y * width + srcX) * 4;
          data[i] = gData[srcI];
          data[i+1] = gData[srcI+1];
          data[i+2] = gData[srcI+2];
          data[i+3] = gData[srcI+3];
        }
      }
      break;
  }

  ctx.putImageData(imageData, 0, 0);
};
export const addMissingFilters = () => {};
