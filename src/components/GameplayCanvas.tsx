import React, { useMemo, useRef } from "react";
import PanelHeader from "./PanelHeader";

export type GameplayCanvasProps = {
  onAdd: (lines: string[] | string) => void;
  onClose: () => void;
  onClear: () => void;
};

export default function GameplayCanvas({ onAdd, onClose, onClear }: GameplayCanvasProps) {
  const ptrId = useRef(1);
  const varId = useRef(1);
  const nextPtr = () => `p${ptrId.current++}`;
  const nextVar = () => `x${varId.current++}`;

  const randInt = (a: number, b: number) =>
    Math.floor(Math.random() * (b - a + 1)) + a;
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

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
          onAdd([`    // write through pointer`, `    if (p1) *p1 = ${randInt(100, 200)};`]);
        },
      },
      {
        label: "Print value",
        run: () => {
          onAdd([`    // print a value`, `    printf("value: %d\\n", ${pick(["x1", "x2", "x3", "*p1"])} );`]);
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

      {/* Replace with your <canvas> / Three.js scene */}
      <div className="card gameplay">
        <div className="center">
          <div className="title">Gameplay Canvas</div>
          <div className="subtle">Hook your game here; call onAdd(...) on events.</div>
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
