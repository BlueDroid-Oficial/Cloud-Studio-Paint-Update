const fs = require('fs');
const path = 'src/components/MenuBar.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "state.setPanelPosition('topbar', { x: 0, y: 0 });",
  "state.setPanelPosition('topbar', { x: 0, y: 0 });\n        state.setPanelPosition('menubar', { x: 0, y: 0 });\n        setOpenMenu(null);"
);

fs.writeFileSync(path, content);
