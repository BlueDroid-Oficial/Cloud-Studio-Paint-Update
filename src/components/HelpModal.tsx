import React from 'react';
import { HelpCircle, X, Brush, Layers, Users, Zap, Info, Shield, Keyboard, MousePointer2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#252525] border border-zinc-700/50 w-full max-w-2xl rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-[#1a1a1a] p-5 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
                <HelpCircle className="text-indigo-400" size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight leading-none">Guia do Aplicativo</h2>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1.5">Centro de Ajuda & Informações</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <HelpCard 
                icon={<Brush className="text-blue-400" />}
                title="Ferramentas Criativas"
                description="Pincéis de alta precisão, pixel art dedicado, ferramentas de preenchimento e seleção inteligente."
              />
              <HelpCard 
                icon={<Layers className="text-purple-400" />}
                title="Gerenciamento de Camadas"
                description="Suporte a máscaras de corte, modos de mesclagem profissionais e organização por pastas."
              />
              <HelpCard 
                icon={<Users className="text-green-400" />}
                title="Colaboração em Tempo Real"
                description="Desenhe simultaneamente com amigos. Veja cursores ativos e alterações instantâneas."
              />
              <HelpCard 
                icon={<Zap className="text-amber-400" />}
                title="Desempenho Otimizado"
                description="Engine de renderização rápida com suporte a exportação PNG e PSD multicamadas."
              />
            </div>

            {/* Quick Tips */}
            <div className="bg-[#1a1a1a] rounded-lg p-5 border border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-300 flex items-center gap-2 mb-4">
                <Info size={16} className="text-indigo-400" />
                Dicas Rápidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] text-zinc-400">
                <div className="flex gap-3">
                  <div className="shrink-0 w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-zinc-500">
                    <Keyboard size={14} />
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold block mb-0.5">Atalhos de Teclado</span>
                    Use [B] para Pincel, [E] para Borracha e [Control+Z] para desfazer rapidamente.
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="shrink-0 w-6 h-6 bg-zinc-800 rounded flex items-center justify-center text-zinc-500">
                    <MousePointer2 size={14} />
                  </div>
                  <div>
                    <span className="text-zinc-200 font-bold block mb-0.5">Navegação</span>
                    Segure a [Barra de Espaço] para mover a tela e use o Scroll para dar zoom.
                  </div>
                </div>
              </div>
            </div>

            {/* Version Info */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                <Shield size={12} />
                Protegido por Auto-Save Local & Nuvem
              </div>
              <div className="text-[10px] text-zinc-600">
                Versão 2.4.0 • Build ID: DRAW-PREMIUM
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#1a1a1a] p-4 flex justify-end">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-indigo-500/10 transition-all active:scale-95"
            >
              Entendi
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function HelpCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-4 bg-zinc-800/30 border border-zinc-700/30 rounded-xl hover:bg-zinc-800/50 transition-all group">
      <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        {React.cloneElement(icon as React.ReactElement, { size: 16 })}
      </div>
      <h4 className="text-xs font-bold text-zinc-200 mb-1.5">{title}</h4>
      <p className="text-[10px] text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}
