#!/bin/bash

# Insert useEffect for layoutEditMode
sed -i '/const handleGlobalKeyDown = (e: KeyboardEvent) => {/i \
  useEffect(() => {\
    if (!useStore.getState().layoutEditMode) return;\
    const handleEditModeKeys = (e: KeyboardEvent) => {\
      if (e.key === "Enter" || e.key === "Tab") {\
        e.preventDefault();\
        useStore.getState().setLayoutEditMode(false);\
      }\
    };\
    window.addEventListener("keydown", handleEditModeKeys);\
    return () => window.removeEventListener("keydown", handleEditModeKeys);\
  }, [useStore.getState().layoutEditMode]);\
' src/App.tsx

# Insert the layout overlay in the render block
sed -i '/{layoutEditMode && (/d' src/App.tsx
sed -i '/<\/div>$/,/.*<TutorialOverlay \/>.*/!b; /<TutorialOverlay \/>/!d' src/App.tsx # wait this isn't right

# actually just use a simple insert before the closing </div> of App.tsx
sed -i 's/{tutorialCompleted && showUpdateModal && (/{useStore.getState().layoutEditMode && (\n        <div \n          className="absolute inset-0 z-[9998] bg-black\/50 backdrop-blur-sm pointer-events-none flex items-center justify-center"\n        >\n          <div className="bg-zinc-900 border border-zinc-700 text-white px-6 py-4 rounded-xl shadow-2xl pointer-events-auto text-center flex flex-col items-center max-w-sm">\n            <h2 className="text-xl font-bold mb-2">Modo de Edição de Layout<\/h2>\n            <p className="text-zinc-400 text-sm mb-4">\n              Arraste as interfaces para reposicioná-las. As janelas farão "snap" a cada 20 pixels.\n            <\/p>\n            <div className="text-xs font-mono bg-black\/50 px-3 py-2 rounded text-zinc-300">\n              Pressione <kbd className="bg-zinc-800 border border-zinc-600 px-1 rounded mx-1">ENTER<\/kbd> ou <kbd className="bg-zinc-800 border border-zinc-600 px-1 rounded mx-1">TAB<\/kbd> para salvar\n            <\/div>\n          <\/div>\n        <\/div>\n      )}\n      {tutorialCompleted && showUpdateModal && (/g' src/App.tsx

