import React from 'react';
import { useStore } from '../store/useStore';
import { Palette } from 'lucide-react';
import { translations } from '../lib/translations';

export function ThemeSwitcher() {
  const { theme, setTheme, language } = useStore();
  const themes = ['day', 'night', 'gradient', 'customized'];
  const t = (key: string, defaultValue: string) => translations[language as keyof typeof translations]?.[key] || defaultValue;

  return (
    <div className="space-y-3 bg-[#3a3a3a] p-3 rounded-lg border border-zinc-700/50">
      <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px] uppercase">
         <Palette size={14} />
         Temas
      </div>
      <div className="grid grid-cols-3 gap-2">
        {themes.map(t_name => (
          <button
            key={t_name}
            onClick={() => setTheme(t_name as any)}
            className={`text-[10px] font-bold uppercase py-1.5 rounded border ${theme === t_name ? "bg-indigo-600 border-indigo-500 text-white" : "bg-black/40 border-zinc-700 text-zinc-400"}`}
          >
            {t(`theme_${t_name}`, t_name)}
          </button>
        ))}
      </div>
    </div>
  );
}
