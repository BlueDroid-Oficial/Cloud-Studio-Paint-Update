const fs = require('fs');

const path = 'src/components/StartScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldContent = `Olá, artista! Apresentamos grandes melhorias e novas funcionalidades na plataforma:

• 👤 Nova Interface de Perfil (estilo YouTube): Agora você pode acessar o perfil completo de qualquer artista. Clique no nome do autor em uma publicação para ver suas artes, animações, materiais e pincéis postados, além de seguir outros criadores.

• 🎨 Temas Funcionais: Botão de temas agora alterna entre Dia, Noite, Gradiente, Customizado e Futebol, com atualização instantânea na interface.

• 🌐 Tradução Completa: Todos os avisos e mensagens do sistema agora estão traduzidos dinamicamente para o idioma configurado no seu perfil.

• ⚙️ Meu Perfil (Configurações): A seção de Conta > Configurações > Meu Perfil foi atualizada com a nova interface de perfil, facilitando a edição e visualização de seus conteúdos.

• ⚡ Melhorias de Estabilidade: Otimizações gerais na interface para garantir uma experiência mais fluida.

-----------------------------

📜 HISTÓRICO DE VERSÕES:

• Versão 2.2.2 (Atual)
  - Nova Interface de Perfil (estilo YouTube)
  - Temas Funcionais
  - Tradução completa
  - Melhorias no Meu Perfil
  - Otimizações de estabilidade

• Versão 2.2.1
  - Publicação de animações em vídeo
  - Exclusão rápida de keyframes na timeline
  - Sincronização do Undo/Redo no multijogador

• Versão 2.3.0
  - Pincel inteligente de Flood Fill
  - Correção total no renderizador do Undo/Redo instantâneo
  - Botão de chat colaborativo arrastável (Touch/Mouse)

• Versão 2.0.0
  - Mesclagem de camadas e pastas fixas recursivas
  - Novo algoritmo real de desfoque Gaussian Blur
  - Seção de comentários na galeria de artes
  - Sistema automático de denúncia (remoção com 7 reports)
  - Tradução completa em tempo real para múltiplos idiomas
  - Ativação inteligente do Modo Pixel Art ao importar imagens

• Versão 1.0.0
  - Lançamento original da plataforma de pintura e animação`;

const newContent = `Olá, artista! Apresentamos grandes melhorias e novas funcionalidades na plataforma:

• 🖌️ Sincronização de Pincéis no Multijogador: Agora você pode ver o cursor e o pincel dos seus amigos em tempo real durante uma sessão colaborativa (Ao Vivo)!

• 🪟 Modo de Edição de Layout: Nova interface para customização! Ao editar o layout, você verá uma tela dedicada. Arraste as janelas que agora fazem "snap" e aperte ENTER ou TAB para confirmar a nova posição.

• 👤 Nova Interface de Perfil (estilo YouTube): Acesse o perfil completo de qualquer artista.

• 🎨 Temas Funcionais: Alternância de temas atualizada.

• 🎮 Minijogos Funcionais: Adicionados novos minijogos para relaxar enquanto desenha!

-----------------------------

📜 HISTÓRICO DE VERSÕES:

• Versão 2.3.0 (Atual)
  - Visualização em tempo real de pincéis no multijogador
  - Modo reformulado para customização de layout com atalhos de confirmação
  - Minijogos funcionais
  - Fixação magnética de painéis

• Versão 2.2.2
  - Nova Interface de Perfil (estilo YouTube)
  - Temas Funcionais
  - Tradução completa
  - Melhorias no Meu Perfil

• Versão 2.2.1
  - Publicação de animações em vídeo
  - Exclusão rápida de keyframes na timeline
  - Sincronização do Undo/Redo no multijogador`;

content = content.replace(oldContent, newContent);
fs.writeFileSync(path, content);
