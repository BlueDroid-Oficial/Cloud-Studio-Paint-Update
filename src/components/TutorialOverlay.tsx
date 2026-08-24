import React from 'react';
import { useStore } from '../store/useStore';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ChevronRight, X } from 'lucide-react';

const steps = [
  {
    title: "Bem-vindo ao Cloud Studio Paint!",
    content: "Este é o seu painel de desenho e animação. Vamos fazer um tour rápido pelas ferramentas essenciais.",
    target: null
  },
  {
    title: "Barra de Ferramentas",
    content: "Aqui você encontra o pincel, borracha, laço, balde de tinta e muito mais. Use o atalho (B) para pincel e (E) para borracha.",
    target: "toolbar"
  },
  {
    title: "Propriedades e Camadas",
    content: "Altere cores, tamanho do pincel e gerencie as camadas do seu desenho neste painel.",
    target: "properties"
  },
  {
    title: "Linha do Tempo",
    content: "Você também pode criar animações quadro a quadro! Ative a linha do tempo no menu 'Animation'.",
    target: "timeline"
  },
  {
    title: "Pronto para criar!",
    content: "Você está pronto para começar. Lembre-se, você pode ver os atalhos no menu 'Help'. Divirta-se!",
    target: null
  }
];

export function TutorialOverlay() {
  const { tutorialCompleted, completeTutorial, tutorialStep, setTutorialStep } = useStore();
  const [highlightStyle, setHighlightStyle] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (tutorialCompleted) return;
    const step = steps[tutorialStep];
    if (step.target) {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightStyle({
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          opacity: 1
        });
      } else {
        setHighlightStyle({ opacity: 0 });
      }
    } else {
      setHighlightStyle({ opacity: 0 });
    }
  }, [tutorialStep, tutorialCompleted]);

  if (tutorialCompleted) return null;

  const step = steps[tutorialStep];

  const handleNext = () => {
    if (tutorialStep < steps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      {/* Background Dimming */}
      <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={handleSkip} />

      {/* Highlight Box */}
      <div 
        className="absolute border-2 border-indigo-500 rounded-lg pointer-events-none transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" 
        style={highlightStyle} 
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={tutorialStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="bg-[#2d2d2d] border border-zinc-700 shadow-2xl rounded-2xl w-80 p-5 relative pointer-events-auto flex flex-col gap-4 z-[10000]"
        >
          <button 
            onClick={handleSkip}
            className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300"
          >
            <X size={16} />
          </button>
          
          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-white text-lg">{step.title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              {step.content}
            </p>
          </div>

          <div className="flex items-center justify-between mt-2 pt-4 border-t border-zinc-800">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-colors ${i === tutorialStep ? 'bg-indigo-500' : 'bg-zinc-700'}`} 
                />
              ))}
            </div>
            
            <button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-4 rounded-full flex items-center gap-1 transition-colors"
            >
              {tutorialStep === steps.length - 1 ? (
                <>Concluir <CheckCircle2 size={14} /></>
              ) : (
                <>Próximo <ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
