const fs = require('fs');
const path = 'src/components/StartScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

const additionalNotices = `                  {
                    id: 11,
                    title: "Nova atualização v2.3.0 disponível!",
                    date: "Agora mesmo",
                    img: "https://picsum.photos/seed/v230/400/200",
                  },
                  {
                    id: 12,
                    title: "Jogue os novos minijogos enquanto descansa!",
                    date: "Novidade",
                    img: "https://picsum.photos/seed/games/400/200",
                  },
                  {
                    id: 13,
                    title: "Dica: Use as novas ancoragens de layout",
                    date: "Guia Rápido",
                    img: "https://picsum.photos/seed/layout/400/200",
                  },
`;

content = content.replace(
  'id: 9,\n                    title: "Novos materiais de pintura disponíveis!",',
  additionalNotices + '                  {\n                    id: 9,\n                    title: "Novos materiais de pintura disponíveis!",'
);

fs.writeFileSync(path, content);
