const { extractLevelCode, parseCodeToLevel } = require("./ruleBasedParser");

const code1 = extractLevelCode("level1");
const code2 = extractLevelCode("level2");
const code3 = extractLevelCode("level3");
const code4 = extractLevelCode("level4");

console.log("----- Raw code from C file -----");
console.log(code1);

const levelJson = parseCodeToLevel(code2);

console.log("\n----- Parsed JSON skeleton -----");
console.log(levelJson);
