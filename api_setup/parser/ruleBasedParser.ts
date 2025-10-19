import fs from "fs";

// read the code from levels.c
export function extractLevelCode(levelName: string): string {
  const src = fs.readFileSync("levels.c", "utf-8");
  const match = new RegExp(`void\\s+${levelName}\\s*\\(\\)\\s*{([\\s\\S]*?)}`, "m").exec(src);
  if (!match) throw new Error(`Level ${levelName} not found`);
  return match[1].trim();
}

// temporary parser stub – Phase 1 will expand this
export function parseCodeToLevel(code: string) {
  const lines = code.split("\n").map(l => l.trim()).filter(Boolean);
  return { referenceCode: lines, characters: [] };
}
