import React, { useState, useEffect } from 'react';
import { X, Clock, Play, Pause, Sparkles, TrendingUp, History, Coins, PlusCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export function CreativeHoursModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { userProfile } = useStore();
  const [quota, setQuota] = useState({ used: 38.5, total: 150 });
  const [timerActive, setTimerActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [sessions, setSessions] = useState([
    { id: 1, date: 'Hoje', duration: '1h 45m', project: 'Pixel Art Paisagem', pointsEarned: 5 },
    { id: 2, date: 'Ontem', duration: '2h 10m', project: 'Estudo de Luz', pointsEarned: 8 },
    { id: 3, date: '28 Jun 2026', duration: '3h 05m', project: 'Design de Cenário', pointsEarned: 12 },
    { id: 4, date: '25 Jun 2026', duration: '45m', project: 'Rascunho Rápido', pointsEarned: 2 },
  ]);

  // Keep track of active drawing timer if turned on
  useEffect(() => {
    let interval: any = null;
    if (timerActive) {
      interval = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleToggleTimer = () => {
    if (timerActive) {
      // Save session on pause/stop
      const mins = Math.floor(secondsElapsed / 60);
      if (mins > 0) {
        const addedHours = Number((secondsElapsed / 3600).toFixed(2));
        setQuota(prev => ({ ...prev, used: Number((prev.used + addedHours).toFixed(2)) }));
        setSessions(prev => [
          {
            id: Date.now(),
            date: 'Agora mesmo',
            duration: `${mins}m`,
            project: 'Sessão Ativa Recente',
            pointsEarned: Math.max(1, Math.floor(mins / 10)),
          },
          ...prev,
        ]);
        // Award some points for drawing!
        const earned = Math.max(1, Math.floor(mins / 10));
        alert(`Sessão finalizada com sucesso! Você ganhou ${earned} pontos pelo tempo desenhado.`);
      }
      setSecondsElapsed(0);
    }
    setTimerActive(!timerActive);
  };

  const handleBuyHours = (amount: number, cost: number) => {
    const currentPoints = userProfile?.clippyPoints || 0;
    if (currentPoints < cost) {
      alert('Pontos insuficientes! Continue desenhando para acumular mais moedas.');
      return;
    }
    // We would deduct points here via Firebase, skipping for UI mockup
    setQuota(prev => ({ ...prev, total: prev.total + amount }));
    alert(`Sucesso! Adicionado +${amount} Creative Hours ao seu limite de quota.`);
  };

  const percentage = Math.min(100, (quota.used / quota.total) * 100);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="text-indigo-400" size={20} />
              My Creative Hours
            </h3>
            <p className="text-xs text-zinc-400">Acompanhe seu tempo de foco criativo e gerencie sua quota produtiva</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Main Dashboard Widget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quota Progress */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Uso Mensal</h4>
                  <p className="text-2xl font-black text-white mt-1">
                    {quota.used}h <span className="text-xs text-zinc-500 font-normal">de {quota.total}h</span>
                  </p>
                </div>
                <TrendingUp size={20} className="text-indigo-400" />
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>{percentage.toFixed(0)}% utilizado</span>
                  <span>{(quota.total - quota.used).toFixed(1)}h restantes</span>
                </div>
              </div>
            </div>

            {/* Live Focus Tracker */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cronômetro de Foco</h4>
                {timerActive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>

              <div className="text-3xl font-mono text-center font-bold text-white tracking-widest my-2">
                {formatTimer(secondsElapsed)}
              </div>

              <button
                onClick={handleToggleTimer}
                className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  timerActive
                    ? 'bg-red-500 hover:bg-red-400 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {timerActive ? (
                  <>
                    <Pause size={14} /> Pausar e Registrar Sessão
                  </>
                ) : (
                  <>
                    <Play size={14} /> Iniciar Desenho Produtivo
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Buy Quota Section */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coins size={14} className="text-amber-400" />
              Adquirir Creative Hours Adicionais
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800/60 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-zinc-300">+10 Creative Hours</h5>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Expande seu limite de foco permanente</p>
                </div>
                <button
                  onClick={() => handleBuyHours(10, 50)}
                  className="bg-zinc-800 hover:bg-zinc-700 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold text-zinc-300 flex items-center gap-1 transition-all"
                >
                  <PlusCircle size={12} className="text-amber-400" /> 50 Pontos
                </button>
              </div>

              <div className="bg-zinc-900 border border-zinc-800/60 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-zinc-300">+50 Creative Hours</h5>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Perfeito para projetos de grande escala</p>
                </div>
                <button
                  onClick={() => handleBuyHours(50, 180)}
                  className="bg-zinc-800 hover:bg-zinc-700 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold text-zinc-300 flex items-center gap-1 transition-all"
                >
                  <PlusCircle size={12} className="text-amber-400" /> 180 Pontos
                </button>
              </div>
            </div>
          </div>

          {/* Sessions Log */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <History size={14} className="text-zinc-400" />
              Registro de Sessões Recentes
            </h4>
            <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-400 font-semibold">
                    <th className="p-3">Data</th>
                    <th className="p-3">Projeto</th>
                    <th className="p-3">Duração</th>
                    <th className="p-3 text-right">Recompensa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                  {sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-3 font-medium text-zinc-400">{sess.date}</td>
                      <td className="p-3 font-semibold text-zinc-300">{sess.project}</td>
                      <td className="p-3">{sess.duration}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">+{sess.pointsEarned} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
