const fs = require('fs');

const path = 'src/components/StartScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

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
  - Sincronização do Undo/Redo no multijogador
`;

const regex = /content:\s*`Olá, artista![\s\S]*?(?=`\n\s*\}\))/m;
content = content.replace(regex, 'content: `' + newContent);

fs.writeFileSync(path, content);
