const fs = require('fs');
let code = fs.readFileSync('src/components/ProjectSettingsModal.tsx', 'utf-8');

code = code.replace("import { motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';\nimport { translations } from '../lib/translations';");
code = code.replace("const {", "const { language,");
code = code.replace("const dpi = 72;", "const dpi = 72;\n  const t = (key: string, def: string) => translations[language]?.[key] || def;");

code = code.replace("CONFIGURAÇÕES AVANÇADAS", "{t('advanced_settings', 'Configurações Avançadas').toUpperCase()}");
code = code.replace("Interface", "{t('interface', 'Interface')}");
code = code.replace("Canhoto (Modo Invertido)", "{t('left_handed', 'Canhoto (Modo Invertido)')}");
code = code.replace("Direito", "{t('right', 'Direito')}");
code = code.replace("Esquerdo", "{t('left', 'Esquerdo')}");
code = code.replace("Tamanho da Interface (UI)", "{t('ui_size', 'Tamanho da Interface (UI)')}");
code = code.replace("Pequeno", "{t('small', 'Pequeno')}");
code = code.replace("Médio", "{t('medium', 'Médio')}");
code = code.replace("Grande", "{t('large', 'Grande')}");
code = code.replace("Interpolação", "{t('interpolation', 'Interpolação')}");
code = code.replace("Suavizar", "{t('smooth', 'Suavizar')}");
code = code.replace("Pixelado", "{t('pixelated', 'Pixelado')}");
code = code.replace("Dimensões do Canvas", "{t('canvas_dimensions', 'Dimensões do Canvas')}");
code = code.replace("Largura (px)", "{t('width_px', 'Largura (px)')}");
code = code.replace("Altura (px)", "{t('height_px', 'Altura (px)')}");
code = code.replace(">Animação<", ">{t('animation', 'Animação')}<");
code = code.replace("Taxa de Quadros (FPS)", "{t('framerate', 'Taxa de Quadros (FPS)')}");
code = code.replace("Total de Quadros", "{t('total_frames', 'Total de Quadros')}");
code = code.replace("Velocidade de Reprodução", "{t('playback_speed', 'Velocidade de Reprodução')}");
code = code.replace("Qualidade e Resolução", "{t('quality_resolution', 'Qualidade e Resolução')}");
code = code.replace("Resolução (DPI)", "{t('resolution_dpi', 'Resolução (DPI)')}");
code = code.replace("Qualidade de Exportação", "{t('export_quality', 'Qualidade de Exportação')}");
code = code.replace("Impressão", "{t('print', 'Impressão')}");
code = code.replace(">CONCLUÍDO<", ">{t('done', 'Concluído').toUpperCase()}<");

fs.writeFileSync('src/components/ProjectSettingsModal.tsx', code);
