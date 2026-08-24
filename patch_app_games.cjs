const fs = require('fs');
const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
content = content.replace(
  "import { MessagesModal } from './components/MessagesModal';",
  "import { MessagesModal } from './components/MessagesModal';\nimport { MiniGamesModal } from './components/MiniGamesModal';"
);

// Add to render
content = content.replace(
  '<MessagesModal isOpen={state.showMessagesModal} onClose={() => state.setShowMessagesModal(false)} />',
  '<MessagesModal isOpen={state.showMessagesModal} onClose={() => state.setShowMessagesModal(false)} />\n      <MiniGamesModal isOpen={state.showMiniGamesModal} onClose={() => state.setShowMiniGamesModal(false)} />'
);

fs.writeFileSync(path, content);
