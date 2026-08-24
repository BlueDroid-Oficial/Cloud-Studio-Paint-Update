import React, { useState, useEffect } from 'react';
import { 
  X, Wallet, TrendingUp, History, Gift, Zap, Crown, CheckCircle2, User, 
  Search, Send, Package, PackageOpen, Star, Sparkles, Trophy, Award, Lock, ArrowLeftRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { 
  collection, query, where, onSnapshot, orderBy, doc, setDoc, 
  serverTimestamp, updateDoc, increment, limit, getDocs, writeBatch
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: string;
  userId: string;
  receiverId?: string;
  senderId?: string;
  amount: number;
  currency: 'clippy' | 'gold';
  description: string;
  type: 'earn' | 'spend' | 'transfer_send' | 'transfer_receive';
  createdAt: any;
}

const BOX_TYPES = {
  bronze: { name: 'Caixa de Bronze', icon: <Package className="text-orange-500" />, color: 'text-orange-500' },
  silver: { name: 'Caixa de Prata', icon: <Package className="text-zinc-400" />, color: 'text-zinc-400' },
  gold: { name: 'Caixa de Ouro', icon: <Package className="text-amber-400" />, color: 'text-amber-400' },
  netherite: { name: 'Caixa de Netherite', icon: <Package className="text-purple-600" />, color: 'text-purple-600' },
  fullstack: { name: 'Caixa Full Stack', icon: <Sparkles className="text-blue-400" />, color: 'text-blue-400' },
  bestartist: { name: 'Caixa de Melhor Artista', icon: <Trophy className="text-pink-500" />, color: 'text-pink-500' },
  beginner: { name: 'Caixa de Iniciante', icon: <History className="text-green-400" />, color: 'text-green-400' },
};

export function PointsWalletModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, userProfile } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'balance' | 'history' | 'rewards' | 'transfer'>('balance');
  
  // Transfer state
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!transferEmail || transferEmail.length < 3) {
      setTargetUser(null);
      return;
    }

    const searchUser = async () => {
      setSearching(true);
      try {
        const usersRef = collection(db, 'users');
        const snap = await getDocs(query(usersRef, limit(100)));
        const match = snap.docs.find(d => 
          (d.data().displayName?.toLowerCase().includes(transferEmail.toLowerCase()) || 
           d.data().shortId?.toUpperCase() === transferEmail.toUpperCase() ||
           d.id === transferEmail)
        );
        if (match) {
          setTargetUser({ ...match.data(), uid: match.id });
        } else {
          setTargetUser(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    };

    const timer = setTimeout(searchUser, 500);
    return () => clearTimeout(timer);
  }, [transferEmail, user]);

  useEffect(() => {
    if (!user || !isOpen) return;

    // Listen to transactions where user is involved
    // To properly catch both send and receive, we might need two listeners or a more complex query if we had P2P in mind
    // For now, we list those where userId matches (which includes both for the current user's perspective in this setup)
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Transaction[];
      setTransactions(txs);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  const claimDailyPoints = async () => {
    if (!user || loading) return;
    
    const lastClaim = userProfile?.lastClaimDate?.toDate ? userProfile.lastClaimDate.toDate() : null;
    const now = new Date();
    const isSameDay = lastClaim && lastClaim.toDateString() === now.toDateString();
    
    if (isSameDay) {
      alert("Você já resgatou seu bônus hoje! Volte amanhã.");
      return;
    }

    setLoading(true);
    try {
      const isConsecutive = lastClaim && (now.getTime() - lastClaim.getTime()) < 86400000 * 2;
      const newStreak = isConsecutive ? (userProfile?.claimStreak || 0) + 1 : 1;
      
      const rewards = [
        { type: 'points', amount: 50, desc: 'Cloudy Points' },
        { box: 'bronze' },
        { box: 'silver' },
        { box: 'gold' },
        { box: 'netherite' },
        { box: 'fullstack' },
        { box: 'bestartist' },
        { box: 'beginner' },
      ];
      
      const randomReward = rewards[Math.floor(Math.random() * rewards.length)];
      const txId = uuidv4();
      
      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      const txRef = doc(db, 'transactions', txId);

      if (randomReward.type === 'points') {
        const amount = (randomReward.amount as number) * newStreak;
        batch.set(txRef, {
          id: txId,
          userId: user.uid,
          amount,
          currency: 'clippy',
          description: `Bônus Diário (Dia ${newStreak})`,
          type: 'earn',
          createdAt: serverTimestamp()
        });
        batch.update(userRef, {
          clippyPoints: increment(amount),
          lastClaimDate: serverTimestamp(),
          claimStreak: newStreak,
          updatedAt: serverTimestamp()
        });
      } else {
        const boxKey = randomReward.box as string;
        batch.set(txRef, {
          id: txId,
          userId: user.uid,
          amount: 0,
          currency: 'clippy',
          description: `Ganhou ${BOX_TYPES[boxKey as keyof typeof BOX_TYPES].name}!`,
          type: 'earn',
          createdAt: serverTimestamp()
        });
        
        const currentInventory = userProfile?.inventory || [];
        batch.update(userRef, {
          inventory: [...currentInventory, boxKey],
          lastClaimDate: serverTimestamp(),
          claimStreak: newStreak,
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      alert(`Parabéns! Você recebeu: ${randomReward.type === 'points' ? randomReward.amount + ' Cloudy Points' : BOX_TYPES[randomReward.box as keyof typeof BOX_TYPES].name}`);
    } catch (e) {
      console.error("Error claiming points:", e);
    } finally {
      setLoading(false);
    }
  };

  const openBox = async (boxId: string, index: number) => {
    if (!user || loading) return;
    setLoading(true);

    try {
      const rewards: Record<string, { clippy: [number, number], gold: [number, number], msg: string }> = {
        bronze: { clippy: [20, 100], gold: [0, 0], msg: 'Cloudy Points básicos!' },
        silver: { clippy: [100, 300], gold: [0, 0], msg: 'Cloudy Points de Prata!' },
        gold: { clippy: [300, 1000], gold: [5, 20], msg: 'Uma fortuna em pontos!' },
        netherite: { clippy: [1000, 5000], gold: [50, 100], msg: 'O tesouro secreto de Netherite!' },
        fullstack: { clippy: [0, 0], gold: [100, 300], msg: 'Poder total Full Stack!' },
        bestartist: { clippy: [5000, 10000], gold: [500, 1000], msg: 'O prêmio do Grande Mestre!' },
        beginner: { clippy: [200, 500], gold: [1, 2], msg: 'Bem-vindo à jornada!' },
      };

      const config = rewards[boxId] || rewards.bronze;
      const clippyWin = Math.floor(Math.random() * (config.clippy[1] - config.clippy[0] + 1)) + config.clippy[0];
      const goldWin = Math.floor(Math.random() * (config.gold[1] - config.gold[0] + 1)) + config.gold[0];

      const batch = writeBatch(db);
      const userRef = doc(db, 'users', user.uid);
      const txId = uuidv4();

      const newInventory = [...(userProfile?.inventory || [])];
      newInventory.splice(index, 1);

      batch.update(userRef, {
        clippyPoints: increment(clippyWin),
        goldPoints: increment(goldWin),
        inventory: newInventory,
        updatedAt: serverTimestamp()
      });

      batch.set(doc(db, 'transactions', txId), {
        id: txId,
        userId: user.uid,
        amount: clippyWin > 0 ? clippyWin : goldWin,
        currency: clippyWin > 0 ? 'clippy' : 'gold',
        description: `Abriu ${BOX_TYPES[boxId as keyof typeof BOX_TYPES]?.name || boxId}`,
        type: 'earn',
        createdAt: serverTimestamp()
      });

      await batch.commit();
      alert(`🎉 ${BOX_TYPES[boxId as keyof typeof BOX_TYPES]?.name} Aberta!\n\nVocê ganhou:\n+ ${clippyWin} Cloudy Points\n+ ${goldWin} Gold Points\n\n${config.msg}`);
    } catch (e) {
      console.error("Error opening box:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!user || loading || !transferEmail || !transferAmount) return;
    const amount = parseInt(transferAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setTransferError("Valor inválido.");
      return;
    }
    
    if ((userProfile?.clippyPoints || 0) < amount) {
      setTransferError("Saldo insuficiente.");
      return;
    }

    setLoading(true);
    setTransferError(null);
    
    try {
      if (!targetUser) {
        setTransferError("Selecione um usuário válido primeiro.");
        return;
      }

      if (targetUser.uid === user.uid) {
        setTransferError("Você não pode transferir pontos para si mesmo.");
        return;
      }

      const batch = writeBatch(db);
      const senderTxId = uuidv4();
      const receiverTxId = uuidv4();

      // 1. Sender Transaction
      batch.set(doc(db, 'transactions', senderTxId), {
        id: senderTxId,
        userId: user.uid,
        receiverId: targetUser.uid,
        amount: -amount,
        currency: 'clippy',
        description: `Enviado para ${targetUser.displayName || 'Usuário'}`,
        type: 'transfer_send',
        createdAt: serverTimestamp()
      });

      // 2. Receiver Transaction
      batch.set(doc(db, 'transactions', receiverTxId), {
        id: receiverTxId,
        userId: targetUser.uid,
        senderId: user.uid,
        amount: amount,
        currency: 'clippy',
        description: `Recebido de ${userProfile?.displayName || 'Usuário'}`,
        type: 'transfer_receive',
        createdAt: serverTimestamp()
      });

      // 3. Update Balances
      batch.update(doc(db, 'users', user.uid), {
        clippyPoints: increment(-amount),
        updatedAt: serverTimestamp()
      });

      batch.update(doc(db, 'users', targetUser.uid), {
        clippyPoints: increment(amount),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      setTransferSuccess(true);
      setTransferAmount('');
      setTransferEmail('');
      setTargetUser(null);
      setTimeout(() => setTransferSuccess(false), 3000);
    } catch (e) {
      console.error("Transfer error:", e);
      setTransferError("Erro ao processar transferência.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#1a1a1a] w-full max-w-xl rounded-2xl flex flex-col h-[650px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-zinc-800"
      >
        {/* Header */}
        <div className="relative h-48 bg-gradient-to-br from-indigo-900 to-black p-6 flex flex-col justify-between shrink-0">
          <div className="absolute top-0 right-0 p-4">
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl">
                <Wallet className="text-indigo-400" size={32} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Cloudy Bank</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="px-2 py-0.5 bg-indigo-500/20 rounded text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/30">
                      Standard Economy
                   </div>
                   <div className="px-2 py-0.5 bg-amber-500/20 rounded text-[9px] font-black text-amber-400 uppercase tracking-widest border border-amber-500/30">
                      Streak: {userProfile?.claimStreak || 0} Dias
                   </div>
                </div>
             </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
             {[
                { id: 'balance', name: 'Saldo', icon: <Zap size={14} /> },
                { id: 'rewards', name: 'Recompensas', icon: <Gift size={14} /> },
                { id: 'transfer', name: 'Transferir', icon: <ArrowLeftRight size={14} /> },
                { id: 'history', name: 'Histórico', icon: <History size={14} /> }
             ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                >
                  {tab.icon}
                  {tab.name}
                </button>
             ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#121212]">
           <AnimatePresence mode="wait">
              {activeTab === 'balance' && (
                <motion.div 
                  key="balance"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4 relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500">
                         <div className="absolute -top-6 -right-6 text-zinc-800/10 group-hover:text-indigo-500/10 transition-colors transform group-hover:scale-110 duration-700">
                            <Zap size={120} />
                         </div>
                         <div className="flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-widest">
                            <div className="w-6 h-6 bg-indigo-600/20 rounded flex items-center justify-center">
                               <Zap size={14} />
                            </div>
                            <span>Cloudy Points</span>
                         </div>
                         <div>
                            <div className="text-4xl font-black text-white tracking-tighter tabular-nums">
                               {userProfile?.clippyPoints || 0}
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Sua economia básica</p>
                         </div>
                      </div>

                      <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 space-y-4 relative overflow-hidden group hover:border-amber-500/50 transition-all duration-500">
                         <div className="absolute -top-6 -right-6 text-amber-500/5 group-hover:text-amber-500/10 transition-colors transform group-hover:scale-110 duration-700">
                            <Crown size={120} />
                         </div>
                         <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-[10px] tracking-widest">
                            <div className="w-6 h-6 bg-amber-600/20 rounded flex items-center justify-center">
                               <Crown size={14} />
                            </div>
                            <span>Gold Points</span>
                         </div>
                         <div>
                            <div className="text-4xl font-black text-white tracking-tighter tabular-nums">
                               {userProfile?.goldPoints || 0}
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Créditos de prestígio</p>
                         </div>
                      </div>
                   </div>

                   {/* Inventory Preview */}
                   <div className="space-y-3">
                      <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                         <Package size={14} />
                         Inventário de Recompensas
                      </h3>
                      <div className="grid grid-cols-4 gap-3 pb-4">
                        {(userProfile?.inventory || []).length === 0 ? (
                           <div className="col-span-4 py-8 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center opacity-20">
                              <Lock size={20} />
                              <p className="text-[9px] font-black uppercase mt-2">Nenhum item desbloqueado</p>
                           </div>
                        ) : (
                          userProfile.inventory.map((item: string, i: number) => {
                            const box = BOX_TYPES[item as keyof typeof BOX_TYPES];
                            return (
                              <button 
                                key={`${item}-${i}`} 
                                onClick={() => openBox(item, i)}
                                disabled={loading}
                                className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex flex-col items-center text-center group hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all active:scale-95 disabled:opacity-50"
                              >
                                 <div className="mb-2 transform group-hover:scale-110 group-hover:rotate-12 transition-transform">
                                    {box?.icon || <Package />}
                                 </div>
                                 <p className={`text-[8px] font-black uppercase leading-tight ${box?.color || 'text-zinc-400'}`}>
                                    {box?.name || item}
                                 </p>
                                 <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black px-2 py-0.5 rounded-[4px] text-[6px] font-black uppercase">
                                    Abrir
                                 </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'rewards' && (
                <motion.div 
                  key="rewards"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                   <div className="bg-indigo-600/10 rounded-2xl border border-indigo-500/30 p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500/30"></div>
                      <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.4)] transform rotate-3 active:-rotate-3 transition-transform">
                         <PackageOpen className="text-white" size={48} />
                      </div>
                      <div className="space-y-2">
                         <h3 className="text-2xl font-black text-white tracking-widest uppercase italic leading-none">Bônus Diário</h3>
                         <p className="text-[10px] text-zinc-400 font-bold uppercase max-w-[280px] mx-auto">
                            Abra uma caixa misteriosa todos os dias e ganhe prêmios incríveis!
                         </p>
                      </div>
                      
                      <div className="flex gap-2 w-full max-w-[300px]">
                        {[1, 2, 3, 4, 5, 6, 7].map(d => (
                          <div 
                            key={d} 
                            className={`flex-1 h-1 rounded-full ${d <= (userProfile?.claimStreak || 0) % 7 ? 'bg-indigo-500' : 'bg-zinc-800'}`}
                          />
                        ))}
                      </div>

                      <button 
                        onClick={claimDailyPoints}
                        disabled={loading}
                        className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                      >
                         {loading ? 'Aguarde...' : 'Resgatar Recompensa'}
                      </button>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
                         <TrendingUp className="text-green-400" size={20} />
                         <div>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Multiplicador</p>
                            <p className="text-xs font-black text-white">x{(1 + (userProfile?.claimStreak || 0) * 0.1).toFixed(1)} streak bonus</p>
                         </div>
                      </div>
                      <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-3">
                         <Star className="text-amber-400" size={20} />
                         <div>
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Próxima Meta</p>
                            <p className="text-xs font-black text-white">{7 - ((userProfile?.claimStreak || 0) % 7)} dias p/ Raro</p>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'transfer' && (
                <motion.div 
                  key="transfer"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Usuário de Destino (Nome ou ID)</label>
                        <div className="relative">
                           <Search className="absolute left-4 top-4 text-zinc-600" size={16} />
                           <input 
                              placeholder="Nome do usuário ou ID..."
                              value={transferEmail}
                              onChange={(e) => setTransferEmail(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 pl-12 text-sm text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                           />
                        </div>

                        {/* User Search Preview */}
                        <AnimatePresence>
                          {(searching || (transferEmail.length >= 3)) && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between"
                            >
                               <div className="flex items-center gap-3">
                                  {searching ? (
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 animate-pulse" />
                                  ) : targetUser ? (
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/50">
                                       <img 
                                          src={targetUser.photoURL || `https://picsum.photos/seed/${targetUser.uid}/100/100`} 
                                          className="w-full h-full object-cover" 
                                          referrerPolicy="no-referrer" 
                                       />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-700">
                                      <User size={20} />
                                    </div>
                                  )}
                                  
                                  <div className="space-y-1">
                                    {searching ? (
                                       <div className="h-4 w-32 bg-zinc-800 animate-pulse rounded" />
                                    ) : targetUser ? (
                                       <>
                                          <p className="text-sm font-black text-indigo-400 tracking-tight leading-none">{targetUser.displayName}</p>
                                          <p className="text-[10px] text-zinc-500 font-mono font-bold tracking-widest uppercase">ID: {targetUser.shortId}</p>
                                       </>
                                    ) : (
                                       <p className="text-xs font-black text-zinc-600 uppercase tracking-widest italic">Usuário não encontrado</p>
                                    )}
                                  </div>
                               </div>

                               <div className="flex flex-col items-center">
                                  <div className="text-xl">
                                     {targetUser ? (targetUser.uid === user?.uid ? '❌' : '✅') : '❌'}
                                  </div>
                                  <span className="text-[8px] font-black uppercase text-zinc-600 mt-1">
                                     {targetUser ? (targetUser.uid === user?.uid ? 'Você' : 'Válido') : 'Inválido'}
                                  </span>
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Quantidade de Cloudy</label>
                        <div className="relative">
                           <Zap className="absolute left-4 top-4 text-indigo-400" size={16} />
                           <input 
                              type="number"
                              placeholder="0"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 pl-12 text-xl font-black text-white focus:outline-none focus:border-indigo-500 transition-all tabular-nums"
                           />
                        </div>
                      </div>

                      {transferError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 text-[10px] font-bold uppercase text-center animate-shake">
                           {transferError}
                        </div>
                      )}

                      {transferSuccess && (
                        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-500 text-[10px] font-bold uppercase text-center flex items-center justify-center gap-2">
                           <CheckCircle2 size={14} />
                           Sucesso! Pontos enviados.
                        </div>
                      )}

                      <button 
                        onClick={handleTransfer}
                        disabled={loading || !transferEmail || !transferAmount}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
                      >
                         <Send size={16} />
                         {loading ? 'Processando Transação...' : 'Confirmar Transferência'}
                      </button>
                   </div>

                   <p className="text-[9px] text-zinc-600 font-bold uppercase text-center leading-relaxed">
                      * As transferências de Cloudy Points são instantâneas e permanentes. Certifique-se de que o destinatário está correto.
                   </p>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-2 pb-4"
                >
                   {transactions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 py-24 grayscale">
                         <History size={48} />
                         <p className="text-[10px] font-black uppercase tracking-widest mt-4">Nenhuma atividade registrada</p>
                      </div>
                   ) : (
                      transactions.map(tx => (
                        <div key={tx.id} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-all">
                           <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                tx.type === 'earn' ? 'bg-green-500/10 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 
                                tx.type === 'spend' ? 'bg-red-500/10 text-red-500' :
                                tx.type === 'transfer_send' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                 {tx.type === 'earn' ? <TrendingUp size={20} /> : 
                                  tx.type === 'spend' ? <Zap size={20} /> :
                                  tx.type === 'transfer_send' ? <Send size={20} /> : <TrendingUp size={20} />}
                              </div>
                              <div>
                                 <h4 className="text-sm font-black text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2">
                                   {tx.description}
                                   {tx.type.includes('transfer') && <ArrowLeftRight size={12} className="opacity-40" />}
                                 </h4>
                                 <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">
                                    {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Processando...'}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className={`text-base font-black tracking-tighter tabular-nums ${
                                (tx.amount || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                 {(tx.amount || 0) >= 0 ? '+' : ''}{tx.amount}
                              </div>
                              <div className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-600 italic">
                                 {tx.currency}
                              </div>
                           </div>
                        </div>
                      ))
                   )}
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="py-4 px-6 bg-[#1a1a1a] border-t border-zinc-800 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-2 text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em]">
              <CheckCircle2 size={12} className="text-indigo-500" />
              <span>Verificado por Cloudy Protocol</span>
           </div>
           <div className="flex items-center gap-4">
              <button className="text-[9px] text-zinc-500 hover:text-white font-black uppercase tracking-widest transition-colors">Suporte</button>
              <button className="text-[9px] text-zinc-500 hover:text-white font-black uppercase tracking-widest transition-colors">Termos</button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}
