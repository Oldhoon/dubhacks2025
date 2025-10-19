import * as fs from "fs";
import * as path from "path";
import { extractLevelCode, parseCodeToLevel } from "./ruleBasedParser.js"; // ⬅️ Note the .js extension
const levelNames = ["level1", "level2", "level3", "level4"];
// ensure output folder exists
const outputDir = path.join(process.cwd(), "levels");
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    console.log("📁 Created 'levels' folder");
}
for (const name of levelNames) {
    console.log(`\n🔍 Reading ${name}...`);
    try {
        const code = extractLevelCode(name);
        const parsed = parseCodeToLevel(code);
        const outputPath = path.join(outputDir, `${name}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
        console.log(`✅ Generated ${outputPath}`);
    }
    catch (err) {
        if (err instanceof Error) {
            console.error(`❌ Failed to process ${name}: ${err.message}`);
        }
        else {
            console.error(`❌ Failed to process ${name}:`, err);
        }
    }
}
console.log("\n🎯 Done! All level JSONs generated.");
