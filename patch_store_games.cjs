const fs = require('fs');
const path = 'src/store/useStore.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'showMessagesModal: boolean;',
  'showMessagesModal: boolean;\n  showMiniGamesModal: boolean;\n  setShowMiniGamesModal: (show: boolean) => void;'
);

content = content.replace(
  'showMessagesModal: false,',
  'showMessagesModal: false,\n  showMiniGamesModal: false,\n  setShowMiniGamesModal: (show) => set({ showMiniGamesModal: show }),'
);

fs.writeFileSync(path, content);
