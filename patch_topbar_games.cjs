const fs = require('fs');
const path = 'src/components/TopBar.tsx';
let content = fs.readFileSync(path, 'utf8');

// Ensure Gamepad2 is imported
if (!content.includes('Gamepad2')) {
  content = content.replace(
    'import { Download,',
    'import { Gamepad2, Download,'
  );
}

// Add the button
content = content.replace(
  '<Settings size={16} />\n        </button>',
  '<Settings size={16} />\n        </button>\n        <button\n          onClick={() => useStore.getState().setShowMiniGamesModal(true)}\n          className="p-1.5 hover:bg-zinc-700 rounded text-amber-400"\n          title="Minijogos"\n        >\n          <Gamepad2 size={16} />\n        </button>'
);

fs.writeFileSync(path, content);
