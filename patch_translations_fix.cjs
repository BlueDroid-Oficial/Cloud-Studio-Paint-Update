const fs = require('fs');
let code = fs.readFileSync('src/lib/translations.ts', 'utf-8');

code = code.replace(/quality_resolution:[^\n]+/, 'quality_resolution: "Quality & Resolution",');
code = code.replace(/quality_resolution:[^\n]+/, 'quality_resolution: "Qualidade e Resolução",');

fs.writeFileSync('src/lib/translations.ts', code);
