import { handler } from "./simulateCode.js";

const testEvent = {
  body: JSON.stringify({
    code: "char x = 1; char *p_x = &x; *p_x = 4; x = 2;"
  })
};

(async () => {
  const res = await handler(testEvent as any, {} as any, () => {});
  console.log("Lambda output:");
  console.log(res);
})();
