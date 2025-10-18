import React, { useEffect, useMemo, useRef, useState } from "react";

export default function MemoryGameSandbox() {
  const [programLines, setProgramLines] = useState<string[]>([
    "#include <stdio.h>",
    "#include <stdlib.h>",
    "",
    "int main() {",
    "    // Your program builds as you play →",
  ]);

  const addLines = (lines: string[] | string) => {
    setProgramLines((prev) => [
      ...prev,
      ...(Array.isArray(lines) ? lines : [lines]),
    ]);
  };

  const closeProgram = () => {
    setProgramLines((prev) => [...prev, "    return 0;", "}"]);
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
          <GameplayPanel onAdd={addLines} onClose={closeProgram} onClear={clearProgram} />
        </div>
        <div className="right">
          <CodePanel lines={programLines} />
        </div>
      </div>
    </div>
  );
}

// ===== Gameplay / Controls =====
type GameplayProps = {
  onAdd: (lines: string[] | string) => void;
  onClose: () => void;
  onClear: () => void;
};

function GameplayPanel({ onAdd, onClose, onClear }: GameplayProps) {
  const ptrId = useRef(1);
  const varId = useRef(1);

  const nextPtr = () => `p${ptrId.current++}`;
  const nextVar = () => `x${varId.current++}`;

  const actions = useMemo(
    () => [
      {
        label: "Declare int variable",
        run: () => {
          const v = nextVar();
          onAdd([`    int ${v} = ${randInt(1, 99)};`]);
        },
      },
      {
        label: "Declare pointer",
        run: () => {
          const p = nextPtr();
          onAdd([`    int *${p} = NULL;`]);
        },
      },
      {
        label: "Malloc 1 int",
        run: () => {
          const p = nextPtr();
          onAdd([
            `    int *${p} = (int*)malloc(sizeof(int));`,
            `    if (!${p}) { perror("malloc"); return 1; }`,
            `    *${p} = ${randInt(10, 999)};`,
          ]);
        },
      },
      {
        label: "Assign pointer to &var",
        run: () => {
          const p = nextPtr();
          const v = nextVar();
          onAdd([`    int ${v} = ${randInt(1, 9)};`, `    int *${p} = &${v};`]);
        },
      },
      {
        label: "Write through pointer (p1)",
        run: () => {
          onAdd([
            `    // write through pointer`,
            `    if (p1) *p1 = ${randInt(100, 200)};`,
          ]);
        },
      },
      {
        label: "Print value",
        run: () => {
          onAdd([
            `    // print a value`,
            `    printf("value: %d\\n", ${pick(["x1", "x2", "x3", "*p1"])} );`,
          ]);
        },
      },
      {
        label: "Free pointer (p1)",
        run: () => {
          onAdd([`    // free if not NULL`, `    if (p1) { free(p1); p1 = NULL; }`]);
        },
      },
      {
        label: "Comment",
        run: () => onAdd([`    // TODO: avoid double-free and dangling pointers`]),
      },
    ],
    []
  );

  return (
    <div className="panel panel-col">
      <PanelHeader title="Gameplay / Controls" subtitle="Click actions → code is generated live" />

      {/* Replace this box with your <canvas>/Three.js scene */}
      <div className="card gameplay">
        <div className="center">
          <div className="title">Gameplay Canvas</div>
          <div className="subtle">Hook your game here; call onAdd(...) to emit code.</div>
        </div>
      </div>

      <div className="card pad">
        <div className="button-grid">
          {actions.map((a, i) => (
            <button key={i} className="btn" onClick={a.run}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="row">
          <button className="btn" onClick={() => onAdd(["", "    // --- frame separator ---"])}>Insert separator</button>
          <button className="btn success" onClick={onClose}>Close program</button>
          <button className="btn danger" onClick={onClear}>Reset</button>
        </div>
      </div>
    </div>
  );
}

// ===== Code Panel =====
type CodePanelProps = { lines: string[] };

function CodePanel({ lines }: CodePanelProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [lines]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch { /* empty */ }
  };

  return (
    <div className="panel panel-col">
      <PanelHeader title="Program" subtitle="Live C code output" right={<button className="btn xs" onClick={copyAll}>Copy</button>} />
      <div ref={scrollerRef} className="code">
        <pre className="code-pre">
          {lines.map((ln, i) => (
            <div key={i}>
              <span className="lineno">{i + 1}</span>
              <code>{ln}</code>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

// ===== UI bits & utils =====
function PanelHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="panel-header">
      <div>
        <div className="panel-title">{title}</div>
        {subtitle && <div className="panel-subtitle">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

function randInt(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
