const fs = require('fs');
let code = fs.readFileSync('src/components/FiltersDrawer.tsx', 'utf-8');
code = code.replace(
  "const { layers, activeLayerId, width, height, language } = useStore();",
  `const { layers, activeLayerId, width, height, language } = useStore();
    const previewCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);`
);

code = code.replace(
  "const handleParamChange = (filterId: string, paramKey: string, value: number) => {",
  `const handleParamChange = (filterId: string, paramKey: string, value: number) => {
        setSelectedFilterId(filterId);`
);

code = code.replace(
  "    const tabs: { id: typeof activeTab, labelKey: string, defaultLabel: string }[] = [",
  `    useEffect(() => {
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

    const tabs: { id: typeof activeTab, labelKey: string, defaultLabel: string }[] = [`
);

code = code.replace(
  "            <div className=\"flex-1 overflow-y-auto p-4 space-y-6\">",
  `            <div className="p-4 border-b border-[#1a1a1a]">
                <div className="text-white text-xs font-bold mb-2 uppercase">{getTranslation('preview', 'Preview')}</div>
                <div className="w-full h-32 bg-[#1a1a1a] rounded-lg overflow-hidden flex items-center justify-center checkered-bg">
                    <canvas 
                        ref={previewCanvasRef} 
                        width={width} 
                        height={height} 
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">`
);

fs.writeFileSync('src/components/FiltersDrawer.tsx', code);
