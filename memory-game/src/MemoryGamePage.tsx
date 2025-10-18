import React, { useState } from "react";
import GameplayCanvas from "./components/GameplayCanvas";
import CodeConsole from "./components/CodeConsole";

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

  const closeProgram = () => {
    setProgramLines(prev => [...prev, "    return 0;", "}"]);
  };

  const clearProgram = () => {
    setProgramLines([
      "#include <stdio.h>",
      "#include <stdlib.h>",
      "",
      "int main() {",
      "    // Your program builds as you play →",
    ]);
  };

  return (
    <div className="app-root">
      <div className="grid">
        <div className="left">
          <GameplayCanvas onAdd={addLines} onClose={closeProgram} onClear={clearProgram} />
        </div>
        <div className="right">
          <CodeConsole lines={programLines} />
        </div>
      </div>
    </div>
  );
}
