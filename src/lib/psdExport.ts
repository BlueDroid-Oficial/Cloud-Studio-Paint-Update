import { writePsd, Psd } from 'ag-psd';
import { useStore } from '../store/useStore';

export async function exportToPsd(width: number, height: number, layers: any[]) {
  try {
    const projectName = useStore.getState().projectName;
    const psd: Psd = {
      width,
      height,
      children: layers.map(layer => {
        // We need to ensure the canvas is valid and has content
        const canvas = layer.canvas;
        return {
          name: layer.name,
          canvas: canvas,
          opacity: layer.opacity / 100,
          visible: layer.visible,
          blendMode: mapBlendMode(layer.blendMode)
        };
      })
    };

    const buffer = writePsd(psd);
    const blob = new Blob([buffer], { type: 'image/vnd.adobe.photoshop' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.psd`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('PSD Export failed:', error);
    return false;
  }
}

function mapBlendMode(mode: string): any {
  const map: Record<string, string> = {
    'source-over': 'normal',
    'multiply': 'multiply',
    'screen': 'screen',
    'overlay': 'overlay',
    'darken': 'darken',
    'lighten': 'lighten',
    'color-dodge': 'color dodge',
    'color-burn': 'color burn',
    'hard-light': 'hard light',
    'soft-light': 'soft light',
    'difference': 'difference',
    'exclusion': 'exclusion',
    'hue': 'hue',
    'saturation': 'saturation',
    'color': 'color',
    'luminosity': 'luminosity'
  };
  return map[mode] || 'normal';
}
