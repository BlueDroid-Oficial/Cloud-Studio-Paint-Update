const fs = require('fs');
const path = 'src/components/StartScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'seen_whats_new_v2_2_2',
  'seen_whats_new_v2_3_0'
);

content = content.replace(
  'Novidades da Versão 2.2.2! ✨🚀',
  'Novidades da Versão 2.3.0! ✨🚀'
);

fs.writeFileSync(path, content);
