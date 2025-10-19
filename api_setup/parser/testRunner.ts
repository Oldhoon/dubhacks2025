const fs = require("fs");
const path = require("path");
const { extractLevelCode, parseCodeToLevel } = require("./ruleBasedParser");

// list of all level function names in levels.c
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
    // 1. Read the C code for this level
    const code = extractLevelCode(name);

    // 2. Parse into structured JSON
    const parsed = parseCodeToLevel(code);

    // 3. Write to a JSON file
    const outputPath = path.join(outputDir, `${name}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));

    console.log(`✅ Generated ${outputPath}`);
} catch (err) {
    if (err instanceof Error) {
      console.error(`❌ Failed to process ${name}: ${err.message}`);
    } else {
      console.error(`❌ Failed to process ${name}:`, err);
    }
  }
  
}

console.log("\n🎯 Done! All level JSONs generated.");
