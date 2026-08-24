const fs = require('fs');
let code = fs.readFileSync('src/components/NewProjectModal.tsx', 'utf-8');

code = code.replace(
  "import { twMerge } from 'tailwind-merge';",
  "import { twMerge } from 'tailwind-merge';\nimport { translations } from '../lib/translations';"
);

code = code.replace(
  "const { setWidthHeight, reset } = useStore();",
  "const { setWidthHeight, reset, language } = useStore();\n  const t = (key: string, def: string) => translations[language]?.[key] || def;"
);

code = code.replace("title=\"Ilustração\"", "title={t('tab_illustration', 'Ilustração')}");
code = code.replace("title=\"Animação\"", "title={t('tab_animation', 'Animação')}");
code = code.replace("title=\"Webtoon / Quadrinho\"", "title={t('tab_webtoon', 'Webtoon / Quadrinho')}");

code = code.replace("NOVO PROJETO", "{t('new_project', 'Novo Projeto').toUpperCase()}");
code = code.replace("Nome do arquivo", "{t('file_name', 'Nome do arquivo')}");
code = code.replace("Dimensões ({unit})", "{t('dimensions', 'Dimensões')} ({unit})");
code = code.replace("Largura</label>", "{t('width', 'Largura')}</label>");
code = code.replace("Altura</label>", "{t('height', 'Altura')}</label>");
code = code.replace("Equivale a", "{t('equals_to', 'Equivale a')}");
code = code.replace("Resolução / DPI", "{t('resolution', 'Resolução / DPI')}");
code = code.replace("Configurações de quadros", "{t('frame_settings', 'Configurações de quadros')}");

code = code.replace("Importar Imagem", "{t('import_image', 'Importar Imagem')}");
code = code.replace(">Cancelar<", ">{t('cancel', 'Cancelar')}<");
code = code.replace(">Criar Projeto<", ">{t('create_project', 'Criar Projeto')}<");

fs.writeFileSync('src/components/NewProjectModal.tsx', code);
