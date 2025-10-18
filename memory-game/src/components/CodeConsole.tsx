import React, { useEffect, useRef } from "react";
import PanelHeader from "./PanelHeader";

export type CodeConsoleProps = { lines: string[] };

export default function CodeConsole({ lines }: CodeConsoleProps) {
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
      <PanelHeader
        title="Program"
        subtitle="Live C code output"
        right={<button className="btn xs" onClick={copyAll}>Copy</button>}
      />
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
