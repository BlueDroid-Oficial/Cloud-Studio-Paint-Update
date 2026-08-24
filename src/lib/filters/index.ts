import { invert } from './invert';

export const applyFilter = (ctx: CanvasRenderingContext2D, width: number, height: number, filterName: string, params: any) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    if (filterName === 'invert') {
        invert(data);
    }
    // Add logic for blur, box-blur later...
    
    ctx.putImageData(imageData, 0, 0);
};

export { invert };
