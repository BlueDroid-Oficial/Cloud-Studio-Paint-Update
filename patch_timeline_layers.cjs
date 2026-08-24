const fs = require('fs');
let code = fs.readFileSync('src/components/Timeline.tsx', 'utf-8');

code = code.replace(
  "<div className=\"flex flex-col flex-1 pl-2 min-w-0\">\n                <span className=\"text-xs text-zinc-300 truncate\">{layer.name}</span>\n              </div>\n            </div>",
  `<div className="flex flex-col flex-1 pl-2 min-w-0 overflow-hidden">
                <span className="text-[11px] font-semibold text-[#333] truncate whitespace-nowrap">{layer.name}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  useStore.getState().updateLayer(layer.id, { disableKeyframes: !layer.disableKeyframes });
                }}
                className={twMerge("ml-1 p-1 rounded hover:bg-black/10 text-zinc-500", layer.disableKeyframes ? "opacity-30" : "text-indigo-600")}
                title={layer.disableKeyframes ? "Keyframes Desativados" : "Keyframes Ativados"}
              >
                <Film size={12} />
              </button>
            </div>`
);
fs.writeFileSync('src/components/Timeline.tsx', code);
