const fs = require('fs');
let store = fs.readFileSync('src/store/useStore.ts', 'utf-8');

// Fix clearCurrentFrame to set "" instead of delete
store = store.replace(
  /delete newCels\[state\.currentFrame\];/g,
  'newCels[state.currentFrame] = "";'
);

// Fix setCurrentFrame to check celData === undefined
store = store.replace(
  /if \(\!celData\) \{/g,
  'if (celData === undefined) {'
);

fs.writeFileSync('src/store/useStore.ts', store);
