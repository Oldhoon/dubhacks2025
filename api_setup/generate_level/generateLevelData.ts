// dubhacks2025/generate_level/generateLevelData.ts

interface ParsedCharacter {
    name: string;
    type: string;
    size?: number;
    value?: any;
    pointsTo?: string;
  }
  
  interface ParsedLevel {
    referenceCode: string[];
    characters: ParsedCharacter[];
  }
  
  interface Sprite {
    type: string;
    sprite: string;
    position: [number, number];
    value?: any;
    index?: number;
    targets?: Sprite[];
  }
  
  export interface LevelData {
    id?: number;
    name?: string;
    referenceCode: string[];
    sprites: Sprite[];
    gridSize: [number, number];
  }
  
  /** Mapping from variable type → sprite name */
  function getSpriteForType(type: string): string {
    // Pointers & arrays are always Catapults
    if (type.includes("*") || type.includes("[]")) return "Catapult";
  
    const base = type.replace("*", "").replace("[]", "").trim();
    switch (base) {
      case "char":  return "Lumberjack";
      case "short": return "Mage";
      case "int":   return "Necromancer";
      default:      return "Unknown";
    }
  }
  
  
  /** Generate grid coordinates (4×4) */
  function generatePositions(n: number, side: "left" | "right"): [number, number][] {
    const coords: [number, number][] = [];
    const startX = side === "left" ? 0 : 2;
    for (let i = 0; i < n; i++) coords.push([startX + (i % 2), Math.floor(i / 2)]);
    return coords;
  }
  
  /** Build structured LevelData for the game */
  export function generateLevelData(parsed: ParsedLevel): LevelData {
    const sprites: Sprite[] = [];
    let leftIdx = 0, rightIdx = 0;
    const leftSlots = generatePositions(4, "left");
    const rightSlots = generatePositions(8, "right");
  
    for (const c of parsed.characters) {
      const spriteName = getSpriteForType(c.type);
  
      // arrays → pointer + multiple memory tiles
      if (c.type.includes("[]")) {
        const pos = leftSlots[leftIdx++] ?? [0, 0];
        const targets: Sprite[] = [];
        const size = c.size ?? 1;
        const targetCoords = rightSlots.slice(rightIdx, rightIdx + size);
        for (let i = 0; i < size; i++) {
          targets.push({
            type: c.type.replace("[]", ""),
            sprite: getSpriteForType(c.type.replace("[]", "")),
            position: targetCoords[i],
            index: i,
            value: Array.isArray(c.value) ? c.value[i] : null
          });
        }
        rightIdx += size;
        sprites.push({ type: c.type, sprite: "Catapult", position: pos, targets });
      }
      // pointers → Catapults
      else if (c.type.includes("*")) {
        const pos = leftSlots[leftIdx++] ?? [0, 0];
        sprites.push({
          type: c.type,
          sprite: spriteName,
          position: pos,
          value: c.pointsTo
        });
      }
      // normal vars
      else {
        const pos = rightSlots[rightIdx++] ?? [2, 0];
        sprites.push({
          type: c.type,
          sprite: spriteName,
          position: pos,
          value: c.value
        });
      }
    }
  
    return {
      id: Math.floor(Math.random() * 10000),
      name: "Generated Level",
      referenceCode: parsed.referenceCode,
      sprites,
      gridSize: [4, 4]
    };
  }
  