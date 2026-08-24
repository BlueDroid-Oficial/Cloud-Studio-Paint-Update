import React, { useState } from 'react';
import { X, Check, Shield, Zap, Sparkles, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export function PlansModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useStore();
  const [activePlan, setActivePlan] = useState<'free' | 'pro' | 'studio'>('free');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  if (!isOpen) return null;

  const OWNER_ID = "HHBQS";
  const isOwner = user?.uid === OWNER_ID;

  const plans = [
    {
      id: 'free',
      name: 'Pixel Iniciante',
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        'Até 3 camadas por projeto',
        'Exportação básica em PNG',
        '10 Creative Hours por mês',
        'Acesso à galeria pública',
      ],
      icon: <Sparkles className="text-zinc-400" size={24} />,
      badge: 'Atual',
    },
    {
      id: 'pro',
      name: 'Artista Pro',
      priceMonthly: 250,
      priceYearly: 200,
      features: [
        'Camadas e pastas ilimitadas',
        'Exportação avançada (PSD, GIF, MP4, ZIP)',
        '150 Creative Hours por mês',
        'Assistente IA de Cores Avançado',
        'Suporte prioritário 24/7',
        'Acesso Antecipado a Novos Pincéis (Exclusivo Anual)',
      ],
      icon: <Zap className="text-amber-400 animate-pulse" size={24} />,
      badge: 'Popular',
    },
    {
      id: 'studio',
      name: 'Estúdio Criativo',
      priceMonthly: 600,
      priceYearly: 480,
      features: [
        'Tudo do plano Pro',
        'Creative Hours ilimitadas',
        'Gerenciamento de equipes (Até 10 membros)',
        'Projetos colaborativos em tempo real',
        'Marca d\'água customizável',
        'Galeria Privada do Estúdio (Exclusivo Anual)',
      ],
      icon: <Shield className="text-[#4c4cff]" size={24} />,
      badge: 'Completo',
    },
  ];

  const handleUpgrade = async (planId: 'free' | 'pro' | 'studio') => {
    if (planId === activePlan) return;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    if (isOwner) {
       setActivePlan(planId);
       alert(`Dono HHBQS! O plano ${plan.name} foi ativado de graça.`);
       return;
    }

    const cost = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    const currency = billingCycle === 'monthly' ? 'Cloudy Points' : 'Golds';
    
    // In a real app we would check if the user has enough currency here
    if (confirm(`Deseja assinar o plano ${plan.name} por ${cost} ${currency}? (O valor será enviado para a conta do Sonco Ovewrite)`)) {
      setLoadingPlan(planId);
      
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        
        await addDoc(collection(db, 'transactions'), {
          id: crypto.randomUUID(),
          userId: user?.uid || 'unknown',
          receiverId: OWNER_ID,
          amount: cost,
          currency: currency === 'Golds' ? 'gold' : 'clippy',
          description: `Assinatura de Plano ${plan.name}`,
          type: 'transfer_send',
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Failed to process transaction", err);
      }

      setTimeout(() => {
        setActivePlan(planId);
        setLoadingPlan(null);
        alert(`Parabéns! Você assinou o plano ${plan.name} com sucesso utilizando seus ${currency}! O valor foi enviado para Sonco Ovewrite.`);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="text-amber-400" size={20} />
              Gerenciamento de Planos
            </h3>
            <p className="text-xs text-zinc-400">Escolha o plano ideal para alavancar seu processo criativo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Toggle Billing */}
          <div className="flex justify-center">
            <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-lg flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
              >
                Anual <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full">Salvar 15%</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const isCurrent = activePlan === plan.id;
              const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
              return (
                <div
                  key={plan.id}
                  className={`bg-zinc-900/40 border rounded-xl p-5 flex flex-col relative transition-all ${
                    isCurrent 
                      ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] bg-indigo-950/5' 
                      : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <span className={`absolute top-4 right-4 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      isCurrent 
                        ? 'bg-indigo-600 text-white' 
                        : plan.id === 'pro' 
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                          : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {isCurrent ? 'Plano Ativo' : plan.badge}
                    </span>
                  )}

                  {/* Plan Meta */}
                  <div className="mb-4">
                    <div className="mb-2">{plan.icon}</div>
                    <h4 className="text-base font-bold text-white">{plan.name}</h4>
                  </div>

                  {/* Pricing */}
                  <div className="mb-6">
                    <span className="text-2xl font-black text-white">
                      {price} <span className="text-sm font-semibold text-zinc-400">{plan.id === 'free' ? '' : billingCycle === 'monthly' ? 'CP' : 'Golds'}</span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      /{billingCycle === 'monthly' ? 'mês' : 'ano'}
                    </span>
                  </div>

                  {/* Action Button */}
                  <button
                    disabled={isCurrent || loadingPlan !== null}
                    onClick={() => handleUpgrade(plan.id as any)}
                    className={`w-full py-2 px-4 rounded-lg text-xs font-bold transition-all mb-6 ${
                      isCurrent
                        ? 'bg-zinc-800 text-zinc-400 cursor-default'
                        : plan.id === 'pro'
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 hover:scale-[1.02]'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02]'
                    }`}
                  >
                    {loadingPlan === plan.id ? 'Processando...' : isCurrent ? 'Seu Plano Atual' : `Mudar para ${plan.name}`}
                  </button>

                  {/* Divider */}
                  <div className="border-t border-zinc-800/80 my-2" />

                  {/* Features List */}
                  <ul className="space-y-2.5 mt-2 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Bottom Info Banner */}
          <div className="bg-zinc-900 border border-zinc-800/60 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={16} />
            <div className="space-y-1">
              <h5 className="text-xs font-semibold text-white">Método de Cobrança Seguro</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Todas as assinaturas utilizam criptografia de ponta a ponta e faturamento integrado de forma transparente na sua conta de artista. Você pode cancelar ou alterar seu plano a qualquer momento sem custos adicionais.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
