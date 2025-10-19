import * as fs from "fs";

// ✅ Extracts a specific level function’s code block from levels.c
export function extractLevelCode(levelName: string): string {
  const src = fs.readFileSync("levels.c", "utf-8");

  // Capture everything inside the braces of void levelX() { ... }
  const match = new RegExp(
    `void\\s+${levelName}\\s*\\(\\)\\s*{([\\s\\S]*?)^}`,
    "m"
  ).exec(src);

  if (!match) throw new Error(`Level ${levelName} not found`);
  return match[1].trim();
}

export function parseCodeToLevel(code: string) {
    const lines = code.split("\n").map(l => l.trim()).filter(Boolean);
  
    const characters: any[] = [];
    const pointers: Record<string, string> = {}; // e.g., { p_y: "y" }
  
    for (const line of lines) {
      // ----- arrays -----
      const arrayMatch = line.match(/(\w+)\s+(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, type, name, size] = arrayMatch;
        characters.push({
          name,
          type: `${type}[]`,
          size: Number(size),
          value: Array(Number(size)).fill(null)
        });
        continue;
      }
  
      // ----- pointer declarations -----
      // e.g.  short * p_y = &y;
      const ptrDecl = line.match(/(\w+)\s+\*\s*(\w+)\s*=\s*&(\w+)/);
      if (ptrDecl) {
        const [, type, ptrName, targetName] = ptrDecl;
        pointers[ptrName] = targetName;
        characters.push({
          name: ptrName,
          type: `${type}*`,
          pointsTo: targetName
        });
        continue;
      }
  
      // ----- simple variable declarations -----
      const varDecl = line.match(/(\w+)\s+(\w+)\s*=\s*(.+);/);
      if (varDecl) {
        const [, type, name, value] = varDecl;
        characters.push({ name, type, value: value.trim() });
        continue;
      }
  
      // ----- dereference assignment -----
      // e.g.  short z = *p_y;
      const derefDecl = line.match(/(\w+)\s+(\w+)\s*=\s*\*(\w+)/);
      if (derefDecl) {
        const [, type, name, ptrName] = derefDecl;
        const target = pointers[ptrName];
        characters.push({
          name,
          type,
          value: `*${ptrName}`,
          source: target ?? null
        });
        continue;
      }
  
      // ----- assignment to existing variable -----
      const assign = line.match(/^(\w+)\s*=\s*(.+);/);
      if (assign) {
        const [, name, value] = assign;
        const existing = characters.find(c => c.name === name);
        if (existing) existing.value = value.trim();
        continue;
      }
    }
  
    return {
      referenceCode: lines,
      characters
    };
  }
  
