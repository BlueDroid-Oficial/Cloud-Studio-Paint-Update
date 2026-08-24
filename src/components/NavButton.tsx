import React from 'react';
import { twMerge } from 'tailwind-merge';

export function NavButton({ icon, label, onClick, active = false }: { icon: React.ReactNode, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={twMerge(
        "flex flex-col items-center gap-0.5 transition-colors h-full justify-center px-4",
        active ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
