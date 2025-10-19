import fs from "fs";

// read the code from levels.c
export function extractLevelCode(levelName: string): string {
    const src = fs.readFileSync("levels.c", "utf-8");
  
    // Match everything between this function’s opening { and its corresponding closing }
    const match = new RegExp(
      `void\\s+${levelName}\\s*\\(\\)\\s*{([\\s\\S]*?)^}`,
      "m"
    ).exec(src);
  
    if (!match) throw new Error(`Level ${levelName} not found`);
    return match[1].trim();
  }
  

// --- Rule-based parser with variable and array detection ---
export function parseCodeToLevel(code: string) {
    const lines = code.split("\n").map(l => l.trim()).filter(Boolean);
  
    // We'll collect variable declarations here
    const characters: any[] = [];
  
    for (const line of lines) {
      // detect arrays like "short trees[4]" or "int arr[10]"
      const arrayMatch = line.match(/(\w+)\s+(\w+)\[(\d+)\]/);
      if (arrayMatch) {
        const [, type, name, size] = arrayMatch;
        characters.push({
          name,
          type: `${type}[]`,
          size: Number(size),
          value: Array(Number(size)).fill(null)
        });
        continue; // skip to next line
      }
  
      // detect pointers or normal variables like "char *p_x = &x;" or "int y = 3;"
      const varMatch = line.match(/(\w+)\s+(\*?)(\w+)\s*=?\s*(.*)?;/);
      if (varMatch) {
        const [, type, pointer, name, value] = varMatch;
        characters.push({
          name,
          type: pointer ? `${type}*` : type,
          value: value ? value.trim() : null
        });
      }
    }
  
    return {
      referenceCode: lines,
      characters
    };
  }
  
