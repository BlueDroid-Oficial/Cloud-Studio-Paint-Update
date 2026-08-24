const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /const DraggablePanel = \(\{\s*id,\s*children,\s*className = ""\s*\}\: \{ id: string, children: React\.ReactNode, className\?: string \}\) => \{[\s\S]*?className=\{twMerge\(\n\s*className,\n\s*"border-2 border-dashed border-blue-500 bg-blue-500\/10 cursor-move relative z-\[9999\] hover:bg-blue-500\/20 transition-colors"\n\s*\)\}\n\s*>\n\s*<div className="absolute -top-5 left-\[-2px\] bg-blue-500 text-white text-\[10px\] font-bold px-2 py-0\.5 rounded-t pointer-events-none\">\n\s*\{id\.toUpperCase\(\)\}\n\s*<\/div>\n\s*<div className="pointer-events-none h-full w-full">\{children\}<\/div>\n\s*<\/motion\.div>\n\s*\);\n\}/,
  `const DraggablePanel = ({ id, children, className = "" }: { id: string, children: React.ReactNode, className?: string }) => {
  const { layoutEditMode, panelPositions, setPanelPosition } = useStore();
  const pos = panelPositions[id] || { x: 0, y: 0 };
  
  if (!layoutEditMode) {
    return (
      <motion.div 
        className={className} 
        animate={{ x: pos.x, y: pos.y }} transition={{ type: "spring", bounce: 0, duration: 0.2 }} initial={false}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(e, info) => {
        const snap = 20;
        const newX = Math.round((pos.x + info.offset.x) / snap) * snap;
        const newY = Math.round((pos.y + info.offset.y) / snap) * snap;
        setPanelPosition(id, { x: newX, y: newY });
      }}
      style={{ x: pos.x, y: pos.y }}
      className={twMerge(
        className,
        "border-2 border-dashed border-blue-500 bg-blue-500/10 cursor-move relative z-[9999] hover:bg-blue-500/20 transition-colors"
      )}
    >
      <div className="absolute -top-5 left-[-2px] bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t pointer-events-none">
        {id.toUpperCase()}
      </div>
      <div className="pointer-events-none h-full w-full">{children}</div>
    </motion.div>
  );
}`
);

fs.writeFileSync(path, content);
