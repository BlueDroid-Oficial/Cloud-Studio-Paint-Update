import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { X, Pin, PinOff, Maximize2, Minimize2, Image as ImageIcon, Link } from 'lucide-react';
import { useStore, ReferenceImage } from '../store/useStore';

export function ReferenceWindow() {
  const { referenceImages, updateReferenceImage, removeReferenceImage, addReferenceImage, showReferenceButtons } = useStore();

  const handleAddFromUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) addReferenceImage(url);
  };

  const handleAddFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) addReferenceImage(ev.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {showReferenceButtons && (
        <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
          <button 
            onClick={handleAddFromUrl}
            className="p-3 bg-[#2d2d2d] text-zinc-300 rounded-xl hover:bg-zinc-700 shadow-2xl border border-white/10 transition-all hover:scale-110 active:scale-95"
            title="Add Reference from URL"
          >
            <Link size={20} />
          </button>
          <label className="p-3 bg-[#2d2d2d] text-zinc-300 rounded-xl hover:bg-zinc-700 shadow-2xl border border-white/10 cursor-pointer transition-all hover:scale-110 active:scale-95" title="Add Reference from Device">
            <ImageIcon size={20} />
            <input type="file" accept="image/*" className="hidden" onChange={handleAddFromFile} />
          </label>
        </div>
      )}

      {referenceImages.map((img) => (
        <ReferenceItem key={img.id} img={img} />
      ))}
    </>
  );
}

const ReferenceItem: React.FC<{ img: ReferenceImage }> = ({ img }) => {
  const { updateReferenceImage, removeReferenceImage } = useStore();
  const windowRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={windowRef}
      drag={!img.pinned}
      dragMomentum={false}
      initial={{ x: img.x, y: img.y }}
      onDragEnd={(_, info) => {
        updateReferenceImage(img.id, { x: info.point.x, y: info.point.y });
      }}
      className={`fixed z-30 bg-[#2d2d2d] border border-zinc-700 rounded-lg shadow-2xl overflow-hidden flex flex-col ${img.visible ? '' : 'hidden'}`}
      style={{ width: img.width, height: img.height, opacity: img.opacity / 100 }}
    >
      <div className="bg-[#1a1a1a] p-1 flex items-center justify-between cursor-move handle">
        <div className="flex items-center gap-2 px-2">
          <ImageIcon size={12} className="text-zinc-500" />
          <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[100px]">Reference</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => updateReferenceImage(img.id, { pinned: !img.pinned })}
            className={`p-1 hover:bg-zinc-700 rounded ${img.pinned ? 'text-indigo-400' : 'text-zinc-500'}`}
          >
            {img.pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
          <button 
            onClick={() => removeReferenceImage(img.id)}
            className="p-1 hover:bg-red-900/50 text-zinc-500 hover:text-red-400 rounded"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden bg-zinc-900/50 group">
        <img 
          src={img.url} 
          alt="Reference" 
          className="w-full h-full object-contain pointer-events-none" 
          referrerPolicy="no-referrer"
        />
        
        {/* Resize handle (simplistic) */}
        {!img.pinned && (
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-zinc-700/50 hover:bg-indigo-500 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startW = img.width;
              const startH = img.height;
              
              const onMouseMove = (moveE: MouseEvent) => {
                const newW = Math.max(100, startW + (moveE.clientX - startX));
                const newH = Math.max(100, startH + (moveE.clientY - startY));
                updateReferenceImage(img.id, { width: newW, height: newH });
              };
              
              const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
              };
              
              window.addEventListener('mousemove', onMouseMove);
              window.addEventListener('mouseup', onMouseUp);
            }}
          />
        )}
      </div>

      <div className="p-1 bg-[#1a1a1a] flex items-center gap-2">
        <input 
          type="range" 
          min="10" 
          max="100" 
          value={img.opacity} 
          onChange={(e) => updateReferenceImage(img.id, { opacity: parseInt(e.target.value) })}
          className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
      </div>
    </motion.div>
  );
}
