import { generateLevelData } from "./generateLevelData.js";
const parsed = {
    referenceCode: [
        "char trees[4] = {0,1,2,3};",
        "trees[1] = trees[3];",
        "trees[3] = 1;"
    ],
    characters: [
        { name: "trees", type: "char[]", size: 4, value: [0, 1, 2, 3] }
    ]
};
console.log(JSON.stringify(generateLevelData(parsed), null, 2));
