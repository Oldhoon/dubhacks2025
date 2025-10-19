// dubhacks2025/generate_level/generateLevelData.ts
/** Mapping from variable type → sprite name */
function getSpriteForType(type) {
    if (type.includes("*") || type.includes("[]"))
        return "Catapult";
    const base = type.replace("*", "").replace("[]", "").trim();
    switch (base) {
        case "char": return "Lumberjack";
        case "short": return "Mage";
        case "int": return "Necromancer";
        default: return "Unknown";
    }
}
/** Generate grid coordinates (4×4) */
function generatePositions(n, side) {
    const coords = [];
    const startX = side === "left" ? 0 : 2;
    for (let i = 0; i < n; i++)
        coords.push([startX + (i % 2), Math.floor(i / 2)]);
    return coords;
}
/** Derive tutorial/execution steps from code lines */
function generateSteps(referenceCode) {
    return referenceCode.map(line => ({
        line,
        description: `Execute: ${line}` // Placeholder text, can be replaced with richer tutorial phrasing
    }));
}
/** Build structured LevelData for the game */
export function generateLevelData(parsed) {
    const sprites = [];
    let leftIdx = 0, rightIdx = 0;
    const leftSlots = generatePositions(4, "left");
    const rightSlots = generatePositions(8, "right");
    for (const c of parsed.characters) {
        const spriteName = getSpriteForType(c.type);
        // arrays → pointer + multiple memory tiles
        if (c.type.includes("[]")) {
            const pos = leftSlots[leftIdx++] ?? [0, 0];
            const targets = [];
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
        // normal variables
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
    // 👇 New additions here
    const steps = generateSteps(parsed.referenceCode);
    return {
        id: Math.floor(Math.random() * 10000),
        name: "Generated Level",
        referenceCode: parsed.referenceCode,
        sprites,
        steps, // 🧠 Tutorial/execution steps derived from code
        completionCondition: "All steps completed in order.",
        gridSize: [4, 4]
    };
}
