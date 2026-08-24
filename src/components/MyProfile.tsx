import React from 'react';
import { useStore } from '../store/useStore';
import { User, UserPlus, Check } from 'lucide-react';
import { translations } from '../lib/translations';

export function MyProfile() {
  const { user, language } = useStore();
  const t = (key: string, defaultValue: string) => translations[language as keyof typeof translations]?.[key] || defaultValue;
  
  // This is a simplified version of the profile, focusing on the follow logic requested.
  // In a real scenario, this would load data from Firebase/Firestore based on user ID.
  const [isFollowing, setIsFollowing] = React.useState(false);
  
  const handleFollowToggle = () => {
    setIsFollowing(!isFollowing);
    // In a real app, we would call followUser or unfollowUser from store here
  };

  return (
    <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
      <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
         <User size={14} />
         {t('my_profile', 'Meu Perfil')}
      </div>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User size={24} className="text-zinc-400" />}
        </div>
        <div className="flex-1">
            <h4 className="text-sm font-bold text-white">{user?.displayName || "Usuário"}</h4>
            <p className="text-[10px] text-zinc-400">@{user?.email?.split('@')[0] || "usuario"}</p>
        </div>
        <button
            onClick={handleFollowToggle}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-colors ${isFollowing ? "bg-zinc-700 text-zinc-300" : "bg-white text-black"}`}
        >
            {isFollowing ? <Check size={14} /> : <UserPlus size={14} />}
            {isFollowing ? t('profile_following', 'Seguindo') : t('profile_follow', 'Seguir')}
        </button>
      </div>
    </div>
  );
}
