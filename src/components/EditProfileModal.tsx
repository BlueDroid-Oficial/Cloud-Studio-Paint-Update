import React, { useState } from 'react';
import { X, User, Lock, Mail, Plus, Camera, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { updateProfile, updatePassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { compressImage } from '../lib/imageUtils';
import { motion, AnimatePresence } from 'motion/react';

export function EditProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, setUser, userProfile, updateUserProfileInFirestore } = useStore();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || (user ? localStorage.getItem(`profile_name_${user.uid}`) : '') || user?.displayName || '');
  const [loading, setLoading] = useState(false);
  const [email] = useState(user?.email || '');
  const [password, setPassword] = useState('');

  const handlePhotoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file && auth.currentUser) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const dataUrl = event.target?.result as string;
          try {
            setLoading(true);
            const compressed = await compressImage(dataUrl);
            await updateUserProfileInFirestore({ photoURL: compressed });
          } catch (err: any) {
             console.error("Error updating photo:", err);
             alert("Erro ao atualizar foto: " + err.message);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    try {
      setLoading(true);
      if (displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName });
        setUser({ ...auth.currentUser, displayName } as any);
      }
      await updateUserProfileInFirestore({ displayName });
      if (password) await updatePassword(auth.currentUser, password);
      onClose();
    } catch (e) { 
      console.error(e);
      alert("Erro ao salvar perfil.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#1a1a1a] w-full max-w-md rounded-2xl border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#111] p-5 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                <User className="text-indigo-400" size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Configurações de Perfil</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Gerencie sua identidade de artista</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div 
                  onClick={handlePhotoUpload}
                  className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border-2 border-zinc-800 shadow-2xl overflow-hidden cursor-pointer group-hover:border-indigo-500/50 transition-all duration-300 transform group-hover:scale-[1.02]"
                >
                  {(userProfile?.photoURL || (user ? localStorage.getItem(`profile_photo_${user.uid}`) : null) || user?.photoURL) ? (
                    <img 
                      src={userProfile?.photoURL || (user ? localStorage.getItem(`profile_photo_${user.uid}`) : '') || user?.photoURL || ''} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="flex flex-col items-center text-zinc-700">
                      <Camera size={32} className="mb-1" />
                      <span className="text-[8px] font-black uppercase tracking-tighter">No Photo</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-indigo-600/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                    <Plus size={24} className="text-white drop-shadow-md" />
                  </div>
                </div>
                {userProfile?.isAdmin && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-black p-1 rounded-lg shadow-lg" title="Administrador">
                    <ShieldCheck size={16} />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-indigo-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-[#1a1a1a]">
                  <BadgeCheck size={14} />
                </div>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-sm font-bold text-white">{displayName || 'Artista Anônimo'}</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {userProfile?.shortId || user?.uid?.slice(0, 8)}</p>
              </div>
            </div>

            {/* Inputs Section */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Nome de Exibição</label>
                <div className="relative group">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Seu nome artístico" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="w-full bg-[#111] rounded-xl py-3 pl-10 pr-4 text-xs text-white border border-zinc-800 focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">E-mail (Privado)</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700" />
                  <input 
                    type="email" 
                    value={email} 
                    disabled 
                    className="w-full bg-[#111] rounded-xl py-3 pl-10 pr-4 text-xs text-zinc-600 border border-zinc-800 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider ml-1">Segurança</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input 
                    type="password" 
                    placeholder="Mudar Senha (Deixe vazio para manter)" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-[#111] rounded-xl py-3 pl-10 pr-4 text-xs text-white border border-zinc-800 focus:border-indigo-500/50 focus:outline-none transition-all placeholder:text-zinc-700"
                  />
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-4 flex flex-col gap-3">
              <button 
                disabled={loading}
                onClick={handleSave} 
                className="w-full bg-indigo-600 text-white text-xs font-bold py-3.5 rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </div>
                ) : 'Salvar Alterações'}
              </button>
              <button 
                onClick={onClose}
                className="w-full bg-zinc-800/50 text-zinc-400 text-xs font-bold py-3.5 rounded-xl hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
