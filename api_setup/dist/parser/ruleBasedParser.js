"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLevelCode = extractLevelCode;
exports.parseCodeToLevel = parseCodeToLevel;
var fs_1 = require("fs");
// read the code from levels.c
function extractLevelCode(levelName) {
    var src = fs_1.default.readFileSync("levels.c", "utf-8");
    // Match everything between this function’s opening { and its corresponding closing }
    var match = new RegExp("void\\s+".concat(levelName, "\\s*\\(\\)\\s*{([\\s\\S]*?)^}"), "m").exec(src);
    if (!match)
        throw new Error("Level ".concat(levelName, " not found"));
    return match[1].trim();
}
// --- Rule-based parser with variable and array detection ---
function parseCodeToLevel(code) {
    var lines = code.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
    // We'll collect variable declarations here
    var characters = [];
    for (var _i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
        var line = lines_1[_i];
        // detect arrays like "short trees[4]" or "int arr[10]"
        var arrayMatch = line.match(/(\w+)\s+(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            var type = arrayMatch[1], name_1 = arrayMatch[2], size = arrayMatch[3];
            characters.push({
                name: name_1,
                type: "".concat(type, "[]"),
                size: Number(size),
                value: Array(Number(size)).fill(null)
            });
            continue; // skip to next line
        }
        // detect pointers or normal variables like "char *p_x = &x;" or "int y = 3;"
        var varMatch = line.match(/(\w+)\s+(\*?)(\w+)\s*=?\s*(.*)?;/);
        if (varMatch) {
            var type = varMatch[1], pointer = varMatch[2], name_2 = varMatch[3], value = varMatch[4];
            characters.push({
                name: name_2,
                type: pointer ? "".concat(type, "*") : type,
                value: value ? value.trim() : null
            });
        }
    }
    return {
        referenceCode: lines,
        characters: characters
    };
}
