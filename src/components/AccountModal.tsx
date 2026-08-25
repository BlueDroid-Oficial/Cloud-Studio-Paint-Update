import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { X, User, UserPlus, Check, Loader2, Palette, Film, Book, PenTool, Baby, ShieldCheck, Lock, KeyRound, Sparkles, Settings } from 'lucide-react';
import { translations } from '../lib/translations';
import { ThemeSwitcher } from './ThemeSwitcher';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';

interface AccountModalProps {
  userId?: string;
  onClose: () => void;
}

export function AccountModal({ userId, onClose }: AccountModalProps) {
  const { user: currentUser, language, isKidsMode, setIsKidsMode, kidsModePin, setKidsModePin } = useStore();
  const targetUserId = userId || currentUser?.uid;
  
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'arts' | 'animations' | 'materials' | 'brushes'>('arts');
  const [showPinModal, setShowPinModal] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [pinAction, setPinAction] = useState<'disable' | 'change_pin' | null>(null);
  const [pinError, setPinError] = useState('');
  const [newPin, setNewPin] = useState('');

  const t = (key: string, defaultValue: string) => translations[language as keyof typeof translations]?.[key] || defaultValue;
  
  const [isFollowing, setIsFollowing] = useState(false);
  
  useEffect(() => {
    async function fetchData() {
      if (!targetUserId) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', targetUserId));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
            setProfile({ displayName: "Usuário", email: "" });
        }
        
        const projectsQuery = query(collection(db, 'published'), where('userId', '==', targetUserId));
        const projectsSnap = await getDocs(projectsQuery);
        setProjects(projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [targetUserId]);
  
  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
  };

  if (loading) {
      return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-6">
            <Loader2 className="animate-spin text-white" size={48} />
        </div>
      );
  }

  const isCurrentUser = currentUser?.uid === targetUserId;

  const tabs = [
    { id: 'arts', label: 'Artes', icon: Palette },
    { id: 'animations', label: 'Animações', icon: Film },
    { id: 'materials', label: 'Materiais', icon: Book },
    { id: 'brushes', label: 'Brushes', icon: PenTool },
  ];

  if (isCurrentUser) {
    // tabs.push({ id: 'settings', label: 'Config.', icon: Settings });
  }

  const handleKidsModeToggle = () => {
    if (isKidsMode) {
      setPinAction('disable');
      setInputPin('');
      setPinError('');
      setShowPinModal(true);
    } else {
      setIsKidsMode(true);
    }
  };

  const handlePinSubmit = () => {
    if (pinAction === 'disable') {
      if (inputPin === kidsModePin) {
        setIsKidsMode(false);
        setShowPinModal(false);
        setInputPin('');
        setPinError('');
      } else {
        setPinError('Senha incorreta!');
      }
    } else if (pinAction === 'change_pin') {
      if (inputPin === kidsModePin) {
        if (newPin.length >= 4) {
          setKidsModePin(newPin);
          setShowPinModal(false);
          setInputPin('');
          setNewPin('');
          setPinError('');
          alert('Senha alterada com sucesso!');
        } else {
          setPinError('A nova senha deve ter pelo menos 4 dígitos');
        }
      } else {
        setPinError('Senha atual incorreta!');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-zinc-700">
                {profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover" /> : <User size={48} className="text-zinc-600" />}
            </div>
            <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{profile?.displayName || "Usuário"}</h2>
                
                {!isCurrentUser && (
                    <button
                        onClick={handleFollowToggle}
                        className={`mt-4 flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold uppercase transition-all ${isFollowing ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-white text-black hover:bg-zinc-200"}`}
                    >
                        {isFollowing ? <Check size={18} /> : <UserPlus size={18} />}
                        {isFollowing ? t('profile_following', 'Seguindo') : t('profile_follow', 'Seguir')}
                    </button>
                )}
            </div>
        </div>

        <div className="flex border-b border-zinc-800 mb-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 pb-3 text-xs font-bold uppercase transition-colors ${activeTab === tab.id ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="h-64 overflow-y-auto scrollbar-hide">
            {activeTab === 'arts' && (
                <div className="grid grid-cols-3 gap-4">
                    {projects.map((proj) => (
                        <div key={proj.id} className="aspect-square bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                            {proj.thumbnail && <img src={proj.thumbnail} className="w-full h-full object-cover" alt={proj.name} />}
                        </div>
                    ))}
                    {projects.length === 0 && <p className="col-span-3 text-center text-zinc-600 py-10">Nenhuma arte encontrada.</p>}
                </div>
            )}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    <div className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center">
                                <Baby size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-zinc-200">Modo Infantil</h3>
                                <p className="text-xs text-zinc-400">Interface simplificada para pintar e colorir.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleKidsModeToggle}
                            className={`w-12 h-6 rounded-full relative transition-colors ${isKidsMode ? 'bg-pink-500' : 'bg-zinc-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isKidsMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-zinc-200">Senha dos Responsáveis</h3>
                                <p className="text-xs text-zinc-400">Protege a saída do modo infantil.</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                setPinAction('change_pin');
                                setInputPin('');
                                setNewPin('');
                                setPinError('');
                                setShowPinModal(true);
                            }}
                            className="text-xs font-bold bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg transition-colors"
                        >
                            Alterar Senha
                        </button>
                    </div>
                </div>
            )}
            {activeTab !== 'arts' && activeTab !== 'settings' && (
                <p className="text-center text-zinc-600 py-20 uppercase font-bold text-sm tracking-widest">Em breve...</p>
            )}
        </div>

        {isCurrentUser && (
            <div className="border-t border-zinc-800 pt-6 mt-6">
            <ThemeSwitcher />
            </div>
        )}
      </motion.div>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[2000] p-6">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#1a1a1a] border border-zinc-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative"
            >
                <button 
                    onClick={() => setShowPinModal(false)}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white"
                >
                    <X size={20} />
                </button>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-amber-400 border border-zinc-700">
                        <Lock size={28} />
                    </div>
                    <h2 className="text-xl font-bold">
                        {pinAction === 'disable' ? 'Desativar Modo Infantil' : 'Alterar Senha'}
                    </h2>
                    <p className="text-sm text-zinc-400 mt-2">
                        {pinAction === 'disable' 
                            ? 'Digite a senha dos responsáveis para sair do modo infantil.' 
                            : 'Digite a senha atual e a nova senha.'}
                    </p>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                            Senha Atual
                        </label>
                        <input 
                            type="password" 
                            maxLength={4}
                            value={inputPin}
                            onChange={e => setInputPin(e.target.value)}
                            placeholder="****"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-indigo-500 outline-none transition-colors"
                        />
                    </div>

                    {pinAction === 'change_pin' && (
                        <div>
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 block">
                                Nova Senha (4 dígitos)
                            </label>
                            <input 
                                type="password" 
                                maxLength={4}
                                value={newPin}
                                onChange={e => setNewPin(e.target.value)}
                                placeholder="****"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-indigo-500 outline-none transition-colors"
                            />
                        </div>
                    )}

                    {pinError && <p className="text-red-400 text-xs text-center font-medium">{pinError}</p>}

                    <button 
                        onClick={handlePinSubmit}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2"
                    >
                        Confirmar
                    </button>
                </div>
            </motion.div>
        </div>
      )}
    </div>
  );
}
