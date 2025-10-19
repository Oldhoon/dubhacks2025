import { useRef, useState } from "react";
import GameplayCanvas from "./components/GameplayCanvas";
import CodeConsole from "./components/CodeConsole";
import LevelInfo from "./components/LevelInfo";
import type { ConsoleThemeId } from "./components/consoleThemes";
import type { CodeEvent } from "./types";

export default function MemoryGamePage() {
  const [programLines, setProgramLines] = useState<string[]>([
    "#include <stdio.h>",
    "#include <stdlib.h>",
    "",
    "int main() {",
    "    // Your program builds as you play →",
    "    return 0;",
    "}",
  ]);
  const declarationMapRef = useRef(new Map<string, { index: number; baseType: string; varName: string }>());

const pointerLine = (event: Extract<CodeEvent, { type: "pointer" }>) => {
  if (!event.hasTarget) {
    return `    void* ${event.pointerName};`;
  }
  return `    ${event.baseType}* ${event.pointerName} = &${event.targetVarName};`;
};

const handleCodeEvent = (event: CodeEvent) => {
  if (typeof event === "string") {
    setProgramLines(prev => {
      const body = prev.slice(0, -2);
      const closing = prev.slice(-2);
      return [...body, event, ...closing];
    });
    return;
  }

  if (Array.isArray(event)) {
    setProgramLines(prev => {
      const body = prev.slice(0, -2);
      const closing = prev.slice(-2);
      return [...body, ...event, ...closing];
    });
    return;
  }

    if (!event) {
      return;
    }

  if (event.type === "declare") {
    setProgramLines(prev => {
      const body = prev.slice(0, -2);
      const closing = prev.slice(-2);
      const binding = declarationMapRef.current.get(event.id);
      const line = `    ${event.baseType} ${event.varName};`;
      if (binding) {
        body[binding.index] = line;
        binding.baseType = event.baseType;
        binding.varName = event.varName;
      } else {
        body.push(line);
        declarationMapRef.current.set(event.id, {
          index: body.length - 1,
          baseType: event.baseType,
          varName: event.varName,
        });
      }
      return [...body, ...closing];
    });
    return;
  }

  if (event.type === "update") {
    setProgramLines(prev => {
      const body = prev.slice(0, -2);
      const closing = prev.slice(-2);
      const binding = declarationMapRef.current.get(event.id);
      if (!binding) {
        return prev;
      }
      const line = `    ${event.baseType} ${event.varName} = ${event.count};`;
      body[binding.index] = line;
      binding.baseType = event.baseType;
      binding.varName = event.varName;
      return [...body, ...closing];
    });
    return;
  }

  if (event.type === "pointer") {
    setProgramLines(prev => {
      const body = prev.slice(0, -2);
      const closing = prev.slice(-2);
      const declaration = declarationMapRef.current.get(event.id);
      if (!declaration) {
        body.push(pointerLine(event));
        declarationMapRef.current.set(event.id, {
          index: body.length - 1,
          baseType: event.baseType,
          varName: event.pointerName,
        });
        return [...body, ...closing];
      }

      body[declaration.index] = pointerLine(event);
      declaration.baseType = event.baseType;
      declaration.varName = event.pointerName;
      return [...body, ...closing];
    });
  }
};

const closeProgram = () => {};
const clearProgram = () => setProgramLines([
  "#include <stdio.h>",
  "#include <stdlib.h>",
  "",
  "int main() {",
  "    // Your program builds as you play →",
  "    return 0;",
  "}",
]);

  const handleClearProgram = () => {
    declarationMapRef.current.clear();
    clearProgram();
  };

  // Example level content — you can wire this to game state later
  const levelTitle = "Level 1 — Heap Basics";
  const levelDesc = "Allocate an int on the heap, write a value through a pointer, then free it safely (no leaks, no double-free).";
  const [consoleTheme, setConsoleTheme] = useState<ConsoleThemeId>("monokai");

  return (
    <div className="app-root">
      <div className="grid">
        <div className="left">
          <GameplayCanvas onAdd={handleCodeEvent} onClose={closeProgram} onClear={handleClearProgram} />
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
