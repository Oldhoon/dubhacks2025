// api/generateLevel.ts
export async function generateLevelFromCode(code: string) {
    const simulateUrl = "https://t5rshcbk4m.execute-api.us-east-2.amazonaws.com/default/simulateCode";
    const generateUrl = "https://5gdaryoaul.execute-api.us-east-2.amazonaws.com/default/generateLevel";
  
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
  