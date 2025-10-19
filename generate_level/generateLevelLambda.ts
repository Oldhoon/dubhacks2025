import fs from "fs";
import { generateLevelData } from "./generateLevelData.js";

/**
 * Local version of the Lambda handler — behaves exactly like AWS
 */
export async function handler(event: any) {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const parsed = body;

    if (!parsed.referenceCode || !parsed.characters) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Missing required fields: referenceCode or characters."
        })
      };
    }

    const result = generateLevelData(parsed);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result)
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message })
    };
  }
}

// For direct local testing:
if (process.argv[1].includes("generateLevelLambda.ts")) {
  const testInput = fs.readFileSync("test_input.json", "utf-8");
  const event = { body: testInput };
  handler(event).then(res => console.log("Lambda Output:\n", res));
}
