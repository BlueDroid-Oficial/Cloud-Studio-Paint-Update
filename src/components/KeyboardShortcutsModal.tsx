import React from "react";
import { useStore } from "../store/useStore";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const { shortcuts, setShortcut } = useStore();
  if (!isOpen) return null;

  const handleKeyDown = (command: string, e: React.KeyboardEvent) => {
    e.preventDefault();

    // Ignore modifier keys pressed by themselves
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push("Control");
    if (e.shiftKey) parts.push("Shift");
    if (e.altKey) parts.push("Alt");

    let keyName = e.key;
    if (keyName === " ") {
      keyName = "Space";
    } else if (keyName === "ArrowLeft") {
      keyName = "ArrowLeft";
    } else if (keyName === "ArrowRight") {
      keyName = "ArrowRight";
    } else if (keyName === "ArrowUp") {
      keyName = "ArrowUp";
    } else if (keyName === "ArrowDown") {
      keyName = "ArrowDown";
    } else if (keyName.length === 1) {
      keyName = keyName.toLowerCase();
    }

    parts.push(keyName);
    const newShortcut = parts.join("+");
    setShortcut(command, newShortcut);
  };

  const handleResetDefaults = () => {
    const defaults: Record<string, string> = {
      playPause: "Space",
      prevFrame: "ArrowLeft",
      nextFrame: "ArrowRight",
      addKeyframe: "k",
      undo: "Control+z",
      redo: "Control+y",
      brush: "b",
      eraser: "e",
      pixel: "p",
      pixel_eraser: "Shift+e",
      bezier: "v",
      line: "l",
      rect: "u",
      circle: "o",
      star: "s",
      fill: "f",
      eyedropper: "i",
      blur: "d",
      smudge: "m",
      pan: "h",
      "select-rect": "w",
      move: "g",
      text: "t",
      magic_wand: "a",
      ruler: "r",
      screentone: "c",
      speech_balloon: "q",
      focus_lines: "j",
      sharpen: "Shift+s",
      dodge: "Shift+d",
      burn: "Shift+b",
      material_library: "n",
      toggle_timeline: "x"
    };
    Object.entries(defaults).forEach(([cmd, key]) => {
      setShortcut(cmd, key);
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-[#2d2d2d] border border-zinc-700 rounded-lg w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800 bg-[#333]">
          <h2 className="text-sm font-bold text-white">
            Keyboard Shortcuts (Click to Edit)
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          <div className="space-y-3">
            {Object.entries(shortcuts).map(([command, key]) => (
              <div
                key={command}
                className="flex justify-between items-center text-xs"
              >
                <span className="text-zinc-400 capitalize">{command.replace(/_/g, ' ')}</span>
                <input
                  type="text"
                  value={key}
                  onKeyDown={(e) => handleKeyDown(command, e)}
                  readOnly
                  placeholder="Press key..."
                  className="bg-zinc-800 px-2 py-1 rounded text-zinc-300 font-mono border border-zinc-700 text-center w-36 cursor-pointer hover:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 bg-[#333] border-t border-zinc-800 flex justify-between items-center">
          <button
            onClick={handleResetDefaults}
            className="text-xs text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Padrão (Reset)
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded transition-colors shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            Concluído (Done)
          </button>
        </div>
      </div>
    </div>
  );
}
