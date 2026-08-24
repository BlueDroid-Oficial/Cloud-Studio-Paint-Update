const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "useStore.getState().closeProject();",
  "useStore.getState().setAppView('start');"
);
code = code.replace(
  "if (useStore.getState().isProjectOpen)",
  "if (useStore.getState().appView === 'project')"
);

fs.writeFileSync('src/App.tsx', code);
