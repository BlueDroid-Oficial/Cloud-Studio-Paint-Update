import re

with open("src/components/CanvasArea.tsx", "r") as f:
    content = f.read()

# Match from 'const renderTextureStamp =' down to the closing brace before 'const drawStamp ='
pattern = r"const renderTextureStamp = \([\s\S]*?^  \};\n\n  const drawStamp"

new_func = """const renderTextureStamp = (
    ctx: CanvasRenderingContext2D,
    texture: string,
    color: string,
    size: number,
    opacity: number,
    hardness: number = 100
  ) => {
    const radius = size / 2;
    const alpha = opacity / 100;
    
    if (texture === 'solid' || texture === 'round') {
      if (hardness < 100) {
        const grad = ctx.createRadialGradient(0, 0, Math.max(0, radius * (hardness / 100)), 0, 0, radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = color;
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } 
    else if (texture === 'airbrush' || texture === 'soft') {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (texture === 'pencil' || texture === 'graphite') {
      ctx.fillStyle = color;
      const count = Math.max(10, Math.floor(size * 2));
      for (let i = 0; i < count; i++) {
        const r = (Math.random() + Math.random() + Math.random()) / 3 * radius;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const dotSize = Math.max(0.5, size * 0.08 * Math.random());
        ctx.globalAlpha = alpha * (0.2 + Math.random() * 0.4);
        ctx.fillRect(px, py, dotSize, dotSize);
      }
    }
    else if (texture === 'charcoal') {
      ctx.fillStyle = color;
      const count = Math.max(5, Math.floor(size * 1.5));
      for (let i = 0; i < count; i++) {
        const r = Math.pow(Math.random(), 0.8) * radius;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const w = size * (0.1 + Math.random() * 0.3);
        const h = size * (0.1 + Math.random() * 0.3);
        ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.6);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillRect(-w/2, -h/2, w, h);
        ctx.restore();
      }
    }
    else if (texture === 'chalk') {
      ctx.fillStyle = color;
      const count = Math.max(8, Math.floor(size * 2));
      for (let i = 0; i < count; i++) {
        const r = Math.random() * radius;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const w = size * 0.15;
        ctx.globalAlpha = alpha * 0.3;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillRect(-w/2, -w/2, w, w);
        ctx.restore();
      }
    }
    else if (texture === 'spray') {
      ctx.fillStyle = color;
      const count = Math.max(15, Math.floor(size * 4));
      for (let i = 0; i < count; i++) {
        const r = Math.pow(Math.random(), 1.5) * radius; 
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const dotSize = Math.max(0.5, size * 0.05 * Math.random());
        ctx.globalAlpha = alpha * (0.3 + Math.random() * 0.5);
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (texture === 'splatter') {
      ctx.fillStyle = color;
      const count = Math.max(3, Math.floor(size * 0.3));
      for (let i = 0; i < count; i++) {
        const r = Math.random() * radius * 1.2;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const dotSize = Math.max(1, size * 0.3 * Math.random());
        ctx.globalAlpha = alpha * (0.6 + Math.random() * 0.4);
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (texture === 'watercolor' || texture === 'wet-ink') {
      const grad = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(0.8, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, size * 0.05);
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
      ctx.stroke();
    }
    else if (texture === 'oil') {
      ctx.fillStyle = color;
      const bristles = Math.max(4, Math.floor(size * 0.8));
      for (let i = 0; i < bristles; i++) {
        const offset = (Math.random() - 0.5) * radius;
        ctx.globalAlpha = alpha * (0.4 + Math.random() * 0.4);
        ctx.beginPath();
        ctx.ellipse(offset, 0, size * 0.1, radius, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (texture === 'dry-brush') {
      ctx.fillStyle = color;
      const bristles = Math.max(3, Math.floor(size * 0.5));
      for (let i = 0; i < bristles; i++) {
        const offset = (Math.random() - 0.5) * radius * 1.5;
        ctx.globalAlpha = alpha * (0.2 + Math.random() * 0.3);
        ctx.beginPath();
        ctx.ellipse(offset, 0, size * 0.05, radius * (0.5 + Math.random() * 0.5), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (texture === 'ink') {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.95 + Math.random() * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
    else if (texture === 'crayon') {
      ctx.fillStyle = color;
      const count = Math.max(12, Math.floor(size * 3));
      for (let i = 0; i < count; i++) {
        const r = Math.pow(Math.random(), 0.7) * radius;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const dotSize = Math.max(1, size * 0.15 * Math.random());
        ctx.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
        ctx.fillRect(px, py, dotSize, dotSize);
      }
    }
    else if (texture === 'gouache') {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.85;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      
      const grad = ctx.createRadialGradient(0, 0, radius * 0.8, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = alpha * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (texture === 'pastel') {
      ctx.fillStyle = color;
      const count = Math.max(10, Math.floor(size * 2.5));
      for (let i = 0; i < count; i++) {
        const r = Math.random() * radius;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const w = size * (0.1 + Math.random() * 0.2);
        ctx.globalAlpha = alpha * 0.3 * Math.random();
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(Math.random() * Math.PI);
        ctx.fillRect(-w/2, -w/2, w, w);
        ctx.restore();
      }
    }
    else if (texture === 'marker') {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    }
    else if (texture === 'sponge') {
      ctx.fillStyle = color;
      const count = Math.max(6, Math.floor(size * 1.5));
      for (let i = 0; i < count; i++) {
        const r = Math.random() * radius * 0.8;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const dotSize = size * (0.2 + Math.random() * 0.3);
        ctx.globalAlpha = alpha * 0.2;
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (texture === 'canvas-grain') {
      ctx.fillStyle = color;
      const transform = ctx.getTransform();
      const gx = transform.e;
      const gy = transform.f;
      
      const dotSpacing = Math.max(3, Math.floor(size / 5));
      const half = Math.floor(size / 2);
      
      const offsetX = gx % dotSpacing;
      const offsetY = gy % dotSpacing;
      
      for (let dx = -half - dotSpacing; dx <= half + dotSpacing; dx += dotSpacing) {
        for (let dy = -half - dotSpacing; dy <= half + dotSpacing; dy += dotSpacing) {
          const px = dx - offsetX;
          const py = dy - offsetY;
          if (px * px + py * py <= radius * radius) {
            if (Math.abs(Math.floor((gx + px) / dotSpacing) + Math.floor((gy + py) / dotSpacing)) % 2 === 0) {
              ctx.globalAlpha = alpha * (0.3 + Math.random() * 0.3);
              ctx.fillRect(px, py, dotSpacing * 0.8, dotSpacing * 0.8);
            }
          }
        }
      }
    }
    else if (texture === 'halftone' || texture === 'screentone' || texture === 'screentone-manga') {
      ctx.fillStyle = color;
      const transform = ctx.getTransform();
      const gx = transform.e;
      const gy = transform.f;
      
      const dotSpacing = Math.max(5, Math.floor(size / 4));
      const dotRadius = Math.max(1, dotSpacing * 0.35);
      const half = Math.floor(size / 2);
      
      const offsetX = gx % dotSpacing;
      const offsetY = gy % dotSpacing;
      
      ctx.globalAlpha = alpha;
      for (let dx = -half - dotSpacing; dx <= half + dotSpacing; dx += dotSpacing) {
        for (let dy = -half - dotSpacing; dy <= half + dotSpacing; dy += dotSpacing) {
          const px = dx - offsetX;
          const py = dy - offsetY;
          if (px * px + py * py <= radius * radius) {
            ctx.beginPath();
            ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    else if (texture === 'stipple') {
      ctx.fillStyle = color;
      const count = Math.max(10, Math.floor(size * 2));
      for (let i = 0; i < count; i++) {
        const r = Math.sqrt(Math.random()) * radius;
        const a = Math.random() * Math.PI * 2;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        const dotSize = Math.max(1, size * 0.08);
        ctx.globalAlpha = alpha * 0.7;
        ctx.beginPath();
        ctx.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    else if (texture === 'pixel-dither' || texture === 'pixel') {
      ctx.fillStyle = color;
      const step = Math.max(2, Math.floor(size / 6));
      const half = Math.floor(size / 2);
      ctx.globalAlpha = alpha;
      for (let dx = -half; dx <= half; dx += step) {
        for (let dy = -half; dy <= half; dy += step) {
          if (dx * dx + dy * dy <= radius * radius) {
            if ((Math.abs(dx) + Math.abs(dy)) % (step * 2) === 0) {
              ctx.fillRect(dx, dy, step, step);
            }
          }
        }
      }
    }
    else {
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawStamp"""

new_content = re.sub(pattern, new_func, content, flags=re.MULTILINE)

with open("src/components/CanvasArea.tsx", "w") as f:
    f.write(new_content)
