import React from 'react';
import { useStore } from '../store/useStore';
import { X, Sparkles, Wand2 } from 'lucide-react';

interface PinterestColoringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function createColoringTemplateDataUrl(type: string, width = 800, height = 600): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = width / 2;
  const cy = height / 2;

  if (type === 'cat') {
    ctx.beginPath();
    ctx.arc(cx, cy + 20, 120, 0, Math.PI * 2);
    ctx.moveTo(cx - 90, cy - 60);
    ctx.lineTo(cx - 130, cy - 160);
    ctx.lineTo(cx - 30, cy - 110);
    ctx.moveTo(cx + 90, cy - 60);
    ctx.lineTo(cx + 130, cy - 160);
    ctx.lineTo(cx + 30, cy - 110);
    ctx.stroke();

    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(cx - 45, cy, 12, 0, Math.PI * 2);
    ctx.arc(cx + 45, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 30);
    ctx.lineTo(cx + 10, cy + 30);
    ctx.lineTo(cx, cy + 45);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx, cy + 45);
    ctx.lineTo(cx, cy + 65);
    ctx.moveTo(cx, cy + 65);
    ctx.quadraticCurveTo(cx - 20, cy + 80, cx - 35, cy + 70);
    ctx.moveTo(cx, cy + 65);
    ctx.quadraticCurveTo(cx + 20, cy + 80, cx + 35, cy + 70);
    ctx.moveTo(cx - 60, cy + 35);
    ctx.lineTo(cx - 110, cy + 25);
    ctx.moveTo(cx - 60, cy + 50);
    ctx.lineTo(cx - 110, cy + 55);
    ctx.moveTo(cx + 60, cy + 35);
    ctx.lineTo(cx + 110, cy + 25);
    ctx.moveTo(cx + 60, cy + 50);
    ctx.lineTo(cx + 110, cy + 55);
    ctx.stroke();
  } else if (type === 'unicorn') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 160);
    ctx.lineTo(cx - 20, cy - 70);
    ctx.lineTo(cx + 20, cy - 70);
    ctx.closePath();
    ctx.arc(cx, cy + 30, 100, Math.PI * 0.8, Math.PI * 2.2);
    ctx.moveTo(cx - 60, cy + 90);
    ctx.quadraticCurveTo(cx, cy + 130, cx + 60, cy + 90);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 30, cy + 10, 8, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'car') {
    ctx.beginPath();
    ctx.roundRect(cx - 140, cy - 20, 280, 100, 30);
    ctx.roundRect(cx - 80, cy - 90, 160, 75, 25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 80, cy + 80, 35, 0, Math.PI * 2);
    ctx.arc(cx + 80, cy + 80, 35, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (type === 'flower') {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const fx = cx + Math.cos(angle) * 70;
      const fy = cy + Math.sin(angle) * 70;
      ctx.moveTo(cx, cy);
      ctx.arc(fx, fy, 45, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 35, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy + 20, 100, 0, Math.PI * 2);
    ctx.arc(cx - 80, cy - 50, 40, 0, Math.PI * 2);
    ctx.arc(cx + 80, cy - 50, 40, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 35, cy, 10, 0, Math.PI * 2);
    ctx.arc(cx + 35, cy, 10, 0, Math.PI * 2);
    ctx.arc(cx, cy + 30, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.fill();
  }

  return canvas.toDataURL('image/png');
}

export function PinterestColoringModal({ isOpen, onClose }: PinterestColoringModalProps) {
  const { addPinterestTemplate } = useStore();

  if (!isOpen) return null;

  const templates = [
    { id: 'cat', title: '🐱 Gatinho Fofo (Pinterest)', desc: 'Gatinho sorridente para colorir' },
    { id: 'unicorn', title: '🦄 Unicórnio Mágico (Pinterest)', desc: 'Unicórnio com chifre brilhante' },
    { id: 'car', title: '🏎️ Carro Divertido (Pinterest)', desc: 'Carrinho veloz e alegre' },
    { id: 'flower', title: '🌸 Florzinha Mágica (Pinterest)', desc: 'Flores lindas para colorir com muitas cores' },
    { id: 'bear', title: '🧸 Ursinho Teddy (Pinterest)', desc: 'Ursinho fofinho abraçável' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-zinc-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-[#252525]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h2 className="text-base font-black text-white">Desenhos Prontos para Pintar (Pinterest)</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-zinc-400">
            Escolha um desenho incrível estilo Pinterest para carregar na sua tela e colorir!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  const dataUrl = createColoringTemplateDataUrl(tpl.id);
                  addPinterestTemplate(tpl.title, dataUrl);
                  onClose();
                }}
                className="flex items-center gap-3 p-4 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-pink-500/50 rounded-xl transition-all text-left group cursor-pointer shadow-md"
              >
                <div className="w-12 h-12 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {tpl.title.split(' ')[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-200 group-hover:text-pink-400 transition-colors">{tpl.title}</h3>
                  <p className="text-[11px] text-zinc-500">{tpl.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-[#252525] border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
