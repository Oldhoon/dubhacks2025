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
      setProgramLines(prev => [...prev, event]);
      return;
    }

    if (Array.isArray(event)) {
      setProgramLines(prev => [...prev, ...event]);
      return;
    }

    if (!event) {
      return;
    }

    if (event.type === "declare") {
      setProgramLines(prev => {
        const nextLines = [...prev];
        const binding = declarationMapRef.current.get(event.id);
        const line = `    ${event.baseType} ${event.varName};`;
        if (binding) {
          nextLines[binding.index] = line;
          binding.baseType = event.baseType;
          binding.varName = event.varName;
        } else {
          nextLines.push(line);
          declarationMapRef.current.set(event.id, {
            index: nextLines.length - 1,
            baseType: event.baseType,
            varName: event.varName,
          });
        }
        return nextLines;
      });
      return;
    }

    if (event.type === "update") {
      setProgramLines(prev => {
        const binding = declarationMapRef.current.get(event.id);
        if (!binding) {
          return prev;
        }
        const nextLines = [...prev];
        const line = `    ${event.baseType} ${event.varName} = ${event.count};`;
        nextLines[binding.index] = line;
        binding.baseType = event.baseType;
        binding.varName = event.varName;
        return nextLines;
      });
      return;
    }

    if (event.type === "pointer") {
      setProgramLines(prev => {
        const declaration = declarationMapRef.current.get(event.id);
        if (!declaration) {
          const nextLines = [...prev, pointerLine(event)];
          declarationMapRef.current.set(event.id, {
            index: nextLines.length - 1,
            baseType: event.baseType,
            varName: event.pointerName,
          });
          return nextLines;
        }

        const nextLines = [...prev];
        nextLines[declaration.index] = pointerLine(event);
        declaration.baseType = event.baseType;
        declaration.varName = event.pointerName;
        return nextLines;
      });
    }
  };

  const closeProgram = () => setProgramLines(prev => [...prev, "    return 0;", "}"]);
  const clearProgram = () => setProgramLines([
    "#include <stdio.h>",
    "#include <stdlib.h>",
    "",
    "int main() {",
    "    // Your program builds as you play →",
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
