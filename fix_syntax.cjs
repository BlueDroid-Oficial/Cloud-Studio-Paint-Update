const fs = require('fs');
const path = 'src/components/StartScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  '                {[\n                  {\n                                      {\n                    id: 11,',
  '                {[\n                  {\n                    id: 11,'
);

fs.writeFileSync(path, content);
