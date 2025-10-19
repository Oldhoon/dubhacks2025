import fs from "fs";
import { generateLevelData } from "./generateLevelData.mjs";
/**
 * Unified Lambda handler for both local + AWS environments
 */
export async function handler(event) {
    try {
        // 🧠 Support both: direct JSON objects (AWS console) and stringified bodies (API Gateway)
        const body = typeof event.body === "string"
            ? JSON.parse(event.body)
            : event.body || event;
        if (!body.referenceCode || !body.characters) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    error: "Missing required fields: referenceCode or characters.",
                }),
            };
        }
        const result = generateLevelData(body);
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result, null, 2),
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: message }),
        };
    }
}
/**
 * Local testing mode — run directly with:  npx ts-node generateLevelLambda.ts
 */
if (process.argv[1].includes("generateLevelLambda.ts")) {
    const testInput = fs.readFileSync("test_input.json", "utf-8");
    const event = { body: testInput };
    handler(event).then((res) => console.log("Lambda Output:\n", res.body));
}
