export const changelog = {
  version: "2.3.7",
  date: "2026-08-25",
  title: "O que há de novo? - Versão 2.3.7 ✨🚀",
  intro: "Olá, artista! Apresentamos a versão 2.3.7 com grandes melhorias em persistência offline, notificações de rede e compatibilidade:",
  image: "https://picsum.photos/seed/changelog/400/200",
  features: [
    "Notificação de Conexão Offline: Alerta Toast e Banner automático que avisa quando a internet cai e confirma que seu trabalho está sendo salvo com segurança no seu dispositivo (IndexedDB).",
    "Correção para Browsers Antigos: Eliminação total da tela branca durante o carregamento inicial em navegadores legados ou conexões lentas.",
    "Salvamento Local Sem Limite de Cota: Armazenamento contínuo de rascunhos e projetos usando banco de dados local IndexedDB.",
    "Interface Limpa e Responsiva: Remoção de botões redundantes e ajuste dinâmico de ferramentas de animação conforme o modo de projeto ativo."
  ],
  history: [
    { version: "2.3.7 (Atual)", changes: ["Notificações de rede offline com aviso de salvamento local", "Remoção de tela branca para browsers antigos com splash screen dark", "Limpeza de botões não utilizados na interface"] },
    { version: "2.3.0", changes: ["Visualização em tempo real de pincéis no multijogador", "Modo reformulado para customização de layout com atalhos de confirmação", "Fixação magnética de painéis"] },
    { version: "2.2.2", changes: ["Nova Interface de Perfil (estilo YouTube)", "Temas Funcionais", "Tradução completa", "Melhorias no Meu Perfil", "Otimizações de estabilidade"] },
    { version: "2.2.1", changes: ["Publicação de animações em vídeo", "Exclusão rápida de keyframes na timeline", "Sincronização do Undo/Redo no multijogador"] },
    { version: "2.1.1", changes: ["Pincel inteligente de Flood Fill", "Correção total no renderizador do Undo/Redo instantâneo", "Botão de chat colaborativo arrastável (Touch/Mouse)"] },
    { version: "2.0.0", changes: ["Mesclagem de camadas e pastas fixas recursivas", "Novo algoritmo real de desfoque Gaussian Blur", "Seção de comentários na galeria de artes", "Sistema automático de denúncia (remoção com 7 reports)", "Tradução completa em tempo real para múltiplos idiomas", "Ativação inteligente do Modo Pixel Art ao importar imagens"] },
    { version: "1.0.0", changes: ["Lançamento original da plataforma de pintura e animação."] }
  ]
};
