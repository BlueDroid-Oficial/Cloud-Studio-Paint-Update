import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { X, User, UserPlus, Check, Loader2, Palette, Film, Book, PenTool } from 'lucide-react';
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
  const { user: currentUser, language } = useStore();
  const targetUserId = userId || currentUser?.uid;
  
  const [profile, setProfile] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'arts' | 'animations' | 'materials' | 'brushes'>('arts');
  
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
            {activeTab !== 'arts' && (
                <p className="text-center text-zinc-600 py-20 uppercase font-bold text-sm tracking-widest">Em breve...</p>
            )}
        </div>

        {isCurrentUser && (
            <div className="border-t border-zinc-800 pt-6 mt-6">
            <ThemeSwitcher />
            </div>
        )}
      </motion.div>
    </div>
  );
}
