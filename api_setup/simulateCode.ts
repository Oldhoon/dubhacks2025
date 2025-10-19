// simulateCode.ts — AWS Lambda handler
import { parseCodeToLevel } from "./parser/ruleBasedParser.js";
import type { APIGatewayProxyHandler } from "aws-lambda";

// For now we don't use extractLevelCode() — we parse raw code sent in body.
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse input payload
    const body = event.body ? JSON.parse(event.body) : {};
    const code = body.code;

    if (!code || typeof code !== "string") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing 'code' field in request body." })
      };
    }

    // Use your rule-based parser
    const parsed = parseCodeToLevel(code);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message })
    };
  }
};
