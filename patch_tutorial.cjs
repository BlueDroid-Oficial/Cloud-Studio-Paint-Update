const fs = require('fs');
let code = fs.readFileSync('src/components/StartScreen.tsx', 'utf-8');

code = code.replace(
  "                  <p>\n                    Nesta dica tutorial, vamos explorar as técnicas fundamentais\n                    de {showTutorialModal.title.toLowerCase()}. Desde o esboço\n                    inicial até o acabamento final, descubra como aproveitar as\n                    ferramentas do Cloud Studio para elevar sua arte.\n                  </p>\n                  <p>\n                    Aprenda a controlar a pressão da caneta, criar gradientes\n                    suaves e utilizar as ferramentas de seleção para otimizar\n                    seu fluxo de trabalho criativo.\n                  </p>\n                  <div className=\"bg-zinc-900/50 p-4 border-l-4 border-blue-600 rounded-r-lg\">\n                    <p className=\"font-bold text-white mb-1\">Dica Pro:</p>\n                    <p className=\"italic\">\n                      Use camadas de correção para ajustar as cores sem alterar\n                      permanentemente os seus pixels!\n                    </p>\n                  </div>\n                  <p>\n                    Vídeo aula disponível em nossa plataforma premium para\n                    membros de nível Bronze ou superior.\n                  </p>",
  `                  <p>
                    Em vez de apenas ler, que tal aprender na prática? Este tutorial foi atualizado para ser interativo!
                  </p>
                  <p>
                    Vamos te guiar diretamente no seu workspace de criação. Aprenda a usar os pincéis, camadas, filtros e ferramentas de animação através do nosso guia passo-a-passo interativo.
                  </p>
                  <div className="bg-zinc-900/50 p-4 border-l-4 border-blue-600 rounded-r-lg">
                    <p className="font-bold text-white mb-1">Dica Pro:</p>
                    <p className="italic">
                      Clique em "Começar Tour Interativo" abaixo para iniciar a experiência no app!
                    </p>
                  </div>`
);

code = code.replace(
  "              <button\n                onClick={() => setShowTutorialModal(null)}\n                className=\"px-8 py-2 bg-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-500 transition-all\"\n              >\n                Começar Agora\n              </button>",
  `              <button
                onClick={() => {
                  setShowTutorialModal(null);
                  useStore.getState().resetTutorial();
                  useStore.getState().createNewProject();
                }}
                className="px-8 py-2 bg-indigo-600 rounded-full text-xs font-bold hover:bg-indigo-500 transition-all"
              >
                Começar Tour Interativo
              </button>`
);

fs.writeFileSync('src/components/StartScreen.tsx', code);
