import React, { useState, useEffect } from 'react';
import { X, Sliders } from 'lucide-react';
import { useStore } from '../store/useStore';
import { applyFilter } from '../lib/filters';
import { translations } from '../lib/translations';

interface FilterDef {
    id: string;
    nameKey: string;
    defaultName: string;
    category: 'adjustments' | 'blur' | 'artistic' | 'effects';
    params: Record<string, { min?: number, max?: number, default: any, step?: number, type?: 'color' | 'range' }>;
}

const AVAILABLE_FILTERS: FilterDef[] = [
    // Adjustments
    { id: 'brightness', nameKey: 'filter_brightness', defaultName: 'Brightness', category: 'adjustments', params: { level: { min: -100, max: 100, default: 20 } } },
    { id: 'contrast', nameKey: 'filter_contrast', defaultName: 'Contrast', category: 'adjustments', params: { level: { min: -100, max: 100, default: 20 } } },
    { id: 'saturation', nameKey: 'filter_saturation', defaultName: 'Saturation', category: 'adjustments', params: { level: { min: 0, max: 5, default: 1.5, step: 0.1 } } },
    { id: 'invert', nameKey: 'filter_invert', defaultName: 'Invert', category: 'adjustments', params: {} },
    { id: 'greyscale', nameKey: 'filter_greyscale', defaultName: 'Greyscale', category: 'adjustments', params: {} },
    { id: 'sepia', nameKey: 'filter_sepia', defaultName: 'Sepia', category: 'adjustments', params: {} },
    { id: 'hue-rotate', nameKey: 'filter_hue', defaultName: 'Hue Rotate', category: 'adjustments', params: { angle: { min: 0, max: 360, default: 90 } } },
    
    // Blur & Sharpen
    { id: 'blur', nameKey: 'filter_blur', defaultName: 'Blur', category: 'blur', params: { radius: { min: 1, max: 20, default: 2 }, sigma: { min: 1, max: 10, default: 1 } } },
    { id: 'box-blur', nameKey: 'filter_box_blur', defaultName: 'Box Blur', category: 'blur', params: { radius: { min: 1, max: 20, default: 2 } } },
    { id: 'sharpen', nameKey: 'filter_sharpen', defaultName: 'Sharpen', category: 'blur', params: {} },
    { id: 'edge-detect', nameKey: 'filter_edge', defaultName: 'Edge Detect', category: 'blur', params: {} },
    
    // Artistic
    { id: 'emboss', nameKey: 'filter_emboss', defaultName: 'Emboss', category: 'artistic', params: {} },
    { id: 'threshold', nameKey: 'filter_threshold', defaultName: 'Threshold', category: 'artistic', params: { level: { min: 0, max: 255, default: 128 } } },
    { id: 'posterize', nameKey: 'filter_posterize', defaultName: 'Posterize', category: 'artistic', params: { levels: { min: 2, max: 16, default: 4 } } },
    { id: 'solarize', nameKey: 'filter_solarize', defaultName: 'Solarize', category: 'artistic', params: {} },
    
    // Effects
    { id: 'chroma-key', nameKey: 'filter_chroma_key', defaultName: 'Chroma Key (Remove Color)', category: 'effects', params: { color: { default: '#00ff00', type: 'color' }, tolerance: { min: 0, max: 255, default: 90, type: 'range' } } },
    { id: 'pixelate', nameKey: 'filter_pixelate', defaultName: 'Pixelate', category: 'effects', params: { size: { min: 2, max: 64, default: 8 } } },
    { id: 'noise', nameKey: 'filter_noise', defaultName: 'Noise', category: 'effects', params: { amount: { min: 1, max: 255, default: 50 } } },
    { id: 'vignette', nameKey: 'filter_vignette', defaultName: 'Vignette', category: 'effects', params: { strength: { min: 0, max: 1, default: 0.5, step: 0.1 } } },
    { id: 'chromatic-aberration', nameKey: 'filter_chromatic_aberration', defaultName: 'Chromatic Aberration', category: 'effects', params: { offset: { min: 1, max: 50, default: 5 } } },
    { id: 'scanlines', nameKey: 'filter_scanlines', defaultName: 'Scanlines', category: 'effects', params: { intensity: { min: 0.1, max: 1, default: 0.3, step: 0.1 } } },
    { id: 'color-tint', nameKey: 'filter_color_tint', defaultName: 'Color Tint', category: 'effects', params: { color: { default: '#ff0000', type: 'color' }, intensity: { min: 0, max: 1, default: 0.5, step: 0.1, type: 'range' } } },
    { id: 'glitch', nameKey: 'filter_glitch', defaultName: 'Glitch', category: 'effects', params: { amount: { min: 1, max: 50, default: 10 } } },
];

export function FiltersDrawer({ onClose }: { onClose: () => void }) {
    const { layers, activeLayerId, width, height, language } = useStore();
    const previewCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'adjustments' | 'blur' | 'artistic' | 'effects'>('adjustments');
    const [filterParams, setFilterParams] = useState<Record<string, Record<string, any>>>({});

    const getTranslation = (key: string, defaultText: string) => {
        return translations[language]?.[key] || defaultText;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleApply = (filter: FilterDef) => {
        const layer = layers.find(l => l.id === activeLayerId);
        if (layer && layer.ctx) {
            const params = filterParams[filter.id] || {};
            // Fill with defaults if missing
            Object.entries(filter.params).forEach(([key, def]) => {
                if (params[key] === undefined) params[key] = def.default;
            });
            applyFilter(layer.ctx, width, height, filter.id, params);
            window.dispatchEvent(new CustomEvent('render-display'));
            useStore.getState().pushHistory();
        }
    };

    const handleParamChange = (filterId: string, paramKey: string, value: any) => {
        setSelectedFilterId(filterId);
        setFilterParams(prev => ({
            ...prev,
            [filterId]: {
                ...(prev[filterId] || {}),
                [paramKey]: value
            }
        }));
    };

    useEffect(() => {
        const layer = layers.find(l => l.id === activeLayerId);
        const canvas = previewCanvasRef.current;
        if (!layer || !layer.ctx || !canvas || !selectedFilterId) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw original
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(layer.ctx.canvas, 0, 0);

        // Apply filter to preview
        const filter = AVAILABLE_FILTERS.find(f => f.id === selectedFilterId);
        if (filter) {
            const params = filterParams[filter.id] || {};
            const activeParams = { ...params };
            Object.entries(filter.params).forEach(([key, def]) => {
                if (activeParams[key] === undefined) activeParams[key] = def.default;
            });
            applyFilter(ctx, width, height, filter.id, activeParams);
        }
    }, [selectedFilterId, filterParams, layers, activeLayerId, width, height]);

    const tabs: { id: typeof activeTab, labelKey: string, defaultLabel: string }[] = [
        { id: 'adjustments', labelKey: 'tab_adjustments', defaultLabel: 'Adjustments' },
        { id: 'blur', labelKey: 'tab_blur', defaultLabel: 'Blur & Sharpen' },
        { id: 'artistic', labelKey: 'tab_artistic', defaultLabel: 'Artistic' },
        { id: 'effects', labelKey: 'tab_effects', defaultLabel: 'Effects' }
    ];

    return (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col pt-safe">
            <div className="h-10 bg-[#2d2d2d] flex items-center justify-between px-4 border-b border-[#1a1a1a]">
                <span className="text-white font-bold text-sm">{getTranslation('filter', 'FILTERS')}</span>
                <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-full text-white font-bold text-xs uppercase transition-colors">
                    <X size={14}/> {getTranslation('close', 'Close')}
                </button>
            </div>
            
            <div className="flex bg-[#2d2d2d] border-b border-[#1a1a1a] px-2 overflow-x-auto scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-[#4c4cff] text-[#4c4cff]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    >
                        {getTranslation(tab.labelKey, tab.defaultLabel)}
                    </button>
                ))}
            </div>

            <div className="p-4 border-b border-[#1a1a1a]">
                <div className="text-white text-xs font-bold mb-2 uppercase">{getTranslation('preview', 'Preview')}</div>
                <div className="w-full h-32 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                    <canvas 
                        ref={previewCanvasRef} 
                        width={width} 
                        height={height} 
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {AVAILABLE_FILTERS.filter(f => f.category === activeTab).map(filter => (
                    <div key={filter.id} className="bg-[#2d2d2d] p-4 rounded-lg space-y-4">
                        <div className="flex items-center gap-2">
                            <Sliders size={16} className="text-[#4c4cff]"/>
                            <span className="text-white font-semibold text-sm">{getTranslation(filter.nameKey, filter.defaultName)}</span>
                        </div>
                        {Object.entries(filter.params).map(([key, def]) => {
                            const val = filterParams[filter.id]?.[key] ?? def.default;
                            return (
                                <div key={key} className="space-y-1">
                                    <div className="flex justify-between items-center text-zinc-500 text-[10px] uppercase font-bold">
                                        <label>{key}</label>
                                        <span>{def.type === 'color' ? val : val}</span>
                                    </div>
                                    {def.type === 'color' ? (
                                        <input 
                                            type="color" 
                                            value={val}
                                            onChange={(e) => handleParamChange(filter.id, key, e.target.value)}
                                            className="w-full h-8 rounded cursor-pointer"
                                        />
                                    ) : (
                                        <input 
                                            type="range" 
                                            min={def.min} 
                                            max={def.max} 
                                            step={def.step || 1}
                                            value={val}
                                            onChange={(e) => handleParamChange(filter.id, key, parseFloat(e.target.value))}
                                            className="w-full h-1 accent-[#4c4cff]"
                                        />
                                    )}
                                </div>
                            );
                        })}
                        <button 
                            onClick={() => { setSelectedFilterId(filter.id); handleApply(filter); }}
                            className="w-full bg-[#4c4cff] text-white text-[11px] py-2 rounded uppercase font-bold hover:bg-[#3a3aff] transition-colors"
                        >{getTranslation('apply', 'Apply')}</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
