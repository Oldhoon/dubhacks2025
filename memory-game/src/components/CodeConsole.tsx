import React, { useEffect, useMemo, useRef, useState } from "react";
import PanelHeader from "./PanelHeader";
import { CONSOLE_THEMES } from "./consoleThemes";
import type { ConsoleThemeId } from "./consoleThemes";

export type CodeConsoleProps = {
  lines: string[];
  grow?: boolean; // when true, this panel will flex to fill remaining height
  themeId?: ConsoleThemeId;
  onThemeChange?: (id: ConsoleThemeId) => void;
};

const KEYWORDS = [
  "auto", "break", "case", "char", "const", "continue", "default", "do", "double",
  "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long",
  "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct",
  "switch", "typedef", "union", "unsigned", "void", "volatile", "while",
];

const KEYWORD_REGEX = new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "g");
const NUMBER_REGEX = /\b\d+(?:\.\d+)?\b/g;
const IDENT_REGEX = /\b(?:NULL|malloc|free|perror)\b/g;
const STRING_REGEX = /"(?:\\.|[^"\\])*"/g;
const KEYWORD_SET = new Set(KEYWORDS);
const IDENT_SET = new Set(["NULL", "malloc", "free", "perror"]);

function highlightCodeSegment(code: string, keyPrefix: string) {
  const nodes: React.ReactNode[] = [];
  const regex = new RegExp(
    `${STRING_REGEX.source}|${KEYWORD_REGEX.source}|${NUMBER_REGEX.source}|${IDENT_REGEX.source}`,
    "g"
  );
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      nodes.push(code.slice(lastIndex, start));
    }

    const token = match[0];
    let className = "token-symbol";
    if (token.startsWith("\"")) className = "token-string";
    else if (KEYWORD_SET.has(token)) className = "token-keyword";
    else if (/^\d/.test(token)) className = "token-number";
    else if (IDENT_SET.has(token)) className = "token-ident";

    nodes.push(
      <span key={`${keyPrefix}-tok-${tokenIndex++}`} className={`token ${className}`}>
        {token}
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }

  return nodes;
}

function highlightLine(line: string, keyPrefix: string) {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("#")) {
    return <span className="token token-preproc">{line}</span>;
  }

  const commentIndex = line.indexOf("//");
  const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";

  const codeNodes = highlightCodeSegment(codePart, keyPrefix);
  if (!commentPart) return codeNodes;

  return [
    ...codeNodes,
    <span key={`${keyPrefix}-comment`} className="token token-comment">
      {commentPart}
    </span>,
  ];
}

export default function CodeConsole({ lines, grow, themeId, onThemeChange }: CodeConsoleProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const themeOptions = useMemo(() => CONSOLE_THEMES, []);
  const [fallbackTheme, setFallbackTheme] = useState<ConsoleThemeId>("monokai");

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = 0;
  }, [lines]);

  useEffect(() => {
    if (themeId) setFallbackTheme(themeId);
  }, [themeId]);

  const activeTheme = themeId ?? fallbackTheme;

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch { /* empty */ }
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value as ConsoleThemeId;
    if (onThemeChange) onThemeChange(next);
    else setFallbackTheme(next);
  };

  const rootClassName = [
    "panel",
    "panel-col",
    "code-console",
    grow ? "grow" : "",
    `console-theme-${activeTheme}`,
  ].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      <PanelHeader
        title="Program"
        subtitle="Live C code output"
        right={
          <div className="console-actions">
            <select
              className="console-theme-select"
              value={activeTheme}
              onChange={handleThemeChange}
            >
              {themeOptions.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
            <button className="btn xs" onClick={copyAll}>Copy</button>
          </div>
        }
      />
      <div
        ref={scrollerRef}
        className="code"
      >
        <pre className="code-pre">
          {lines.map((ln, i) => {
            const nodes = highlightLine(ln, `line-${i}`);
            return (
              <div key={i} className="code-line">
                <span className="lineno">{i + 1}</span>
                <code>
                  {Array.isArray(nodes)
                    ? nodes.map((node, idx) => <React.Fragment key={`line-${i}-part-${idx}`}>{node}</React.Fragment>)
                    : nodes}
                </code>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
