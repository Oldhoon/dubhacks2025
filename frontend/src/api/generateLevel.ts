// api/generateLevel.ts
export async function generateLevelFromCode(code: string) {
    const simulateUrl = "https://YOUR-SIMULATE-ENDPOINT/simulate";
    const generateUrl = "https://YOUR-GENERATE-ENDPOINT/generate";
  
    // 1️⃣ Call simulateCode Lambda
    const simRes = await fetch(simulateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const parsed = await simRes.json();
  
    // 2️⃣ Call generateLevelLambda Lambda
    const genRes = await fetch(generateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    return await genRes.json();
  }
  