import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, X } from 'lucide-react';
import { changelog } from '../data/changelog';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionUpdateModal({ isOpen, onClose }: Props) {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[999999] p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#18181b] border border-zinc-800 rounded-xl max-w-sm w-full p-5 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
        
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">{changelog.title}</h2>
            <p className="text-[10px] text-zinc-500">{changelog.date}</p>
          </div>
        </div>

        <p className="text-[11px] text-zinc-300 mb-4">{changelog.intro}</p>

        {changelog.image && (
          <div className="relative w-full h-32 rounded-lg mb-4 overflow-hidden bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 bg-[length:200%_100%] animate-shimmer" />
            )}
            <img 
              src={changelog.image} 
              alt="Novidades da atualização" 
              className={`w-full h-32 object-cover rounded-lg transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
        )}

        <h3 className="text-[11px] font-bold text-zinc-400 mb-2.5 uppercase tracking-wider">Novidades:</h3>
        <ul className="space-y-2 mb-5 max-h-[180px] overflow-y-auto pr-1">
          {changelog.features.map((feature, i) => (
            <li key={i} className="flex gap-2 text-[11px] text-zinc-300 leading-relaxed">
              <span className="text-indigo-400 font-bold">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <h3 className="text-[11px] font-bold text-zinc-400 mb-2.5 uppercase tracking-wider">Histórico:</h3>
        <div className="space-y-4 max-h-[150px] overflow-y-auto pr-1">
          {changelog.history.map((h, i) => (
            <div key={i}>
              <h4 className="text-[10px] font-bold text-zinc-200">Versão {h.version}</h4>
              <ul className="list-disc pl-4 text-[10px] text-zinc-400">
                {h.changes.map((change, j) => <li key={j}>{change}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer text-center"
        >
          Entendido
        </button>
      </motion.div>
    </div>
  );
}
