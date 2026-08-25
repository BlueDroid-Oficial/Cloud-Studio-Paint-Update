import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Wifi, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export function OfflineToast() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
      setDismissedOffline(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none max-w-md w-[92%] px-2">
      <AnimatePresence>
        {isOffline && !dismissedOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto bg-[#18181b]/95 backdrop-blur-md border border-amber-500/40 shadow-2xl shadow-amber-950/40 rounded-xl p-3.5 text-white flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <WifiOff className="text-amber-400 animate-pulse" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Você está sem conexão
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded font-medium">
                  <AlertTriangle size={10} /> Salvo Localmente
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 mt-1 leading-snug">
                Sem conexão com a internet. Não se preocupe: seu trabalho e alterações estão sendo salvos com segurança no seu navegador (IndexedDB).
              </p>
            </div>
            <button
              onClick={() => setDismissedOffline(true)}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Fechar alerta"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}

        {!isOffline && showReconnected && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="pointer-events-auto bg-[#18181b]/95 backdrop-blur-md border border-emerald-500/40 shadow-2xl shadow-emerald-950/40 rounded-xl p-3.5 text-white flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Wifi className="text-emerald-400" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <CheckCircle2 size={13} /> Conexão Reestabelecida
              </div>
              <p className="text-[11px] text-zinc-300 mt-0.5 leading-snug">
                Você voltou a ficar online! Seus rascunhos locais continuam salvos e prontos para sincronização.
              </p>
            </div>
            <button
              onClick={() => setShowReconnected(false)}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
