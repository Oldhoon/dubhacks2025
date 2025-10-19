import { useState } from "react";
import GameplayCanvas from "./components/GameplayCanvas";
import CodeConsole from "./components/CodeConsole";
import LevelInfo from "./components/LevelInfo";
import type { ConsoleThemeId } from "./components/consoleThemes";

export default function MemoryGamePage() {
  const [programLines, setProgramLines] = useState<string[]>([
    "#include <stdio.h>",
    "#include <stdlib.h>",
    "",
    "int main() {",
    "    // Your program builds as you play →",
  ]);

  const addLines = (lines: string[] | string) => {
    setProgramLines(prev => [...prev, ...(Array.isArray(lines) ? lines : [lines])]);
  };

  const closeProgram = () => setProgramLines(prev => [...prev, "    return 0;", "}"]);
  const clearProgram = () => setProgramLines([
    "#include <stdio.h>",
    "#include <stdlib.h>",
    "",
    "int main() {",
    "    // Your program builds as you play →",
  ]);

  // Example level content — you can wire this to game state later
  const levelTitle = "Level 1 — Heap Basics";
  const levelDesc = "Allocate an int on the heap, write a value through a pointer, then free it safely (no leaks, no double-free).";
  const [consoleTheme, setConsoleTheme] = useState<ConsoleThemeId>("monokai");

  return (
    <div className="app-root">
      <div className="grid">
        <div className="left">
          <GameplayCanvas onAdd={addLines} onClose={closeProgram} onClear={clearProgram} />
        </div>

        <div className="right">
          <LevelInfo title={levelTitle} description={levelDesc} />
          <CodeConsole
            lines={programLines}
            grow
            themeId={consoleTheme}
            onThemeChange={setConsoleTheme}
          />
        </div>

      </div>
    </div>
  );
}
