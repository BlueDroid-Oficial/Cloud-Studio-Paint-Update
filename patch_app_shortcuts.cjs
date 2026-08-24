const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "useEffect(() => {",
  `useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.ctrlKey && e.key === 'h')) {
        // If we are in the project (isProjectOpen) we can return to start screen
        if (useStore.getState().isProjectOpen) {
          e.preventDefault();
          useStore.getState().closeProject();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);

  useEffect(() => {`
);

fs.writeFileSync('src/App.tsx', code);
