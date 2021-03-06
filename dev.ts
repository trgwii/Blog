import { generate } from "./sitegen.ts";

const [input, output] = Deno.args;

if (typeof input !== "string") {
  console.error("Missing input folder argument");
  Deno.exit(1);
}
if (typeof output !== "string") {
  console.error("Missing output folder argument");
  Deno.exit(1);
}

import "./install_twoslash.ts";

console.log("rebuilding...");
await generate(input, output);
console.log("done!");

Deno.run({
  cmd: [
    "deno",
    "run",
    "-A",
    "https://deno.land/std@0.104.0/http/file_server.ts",
    output,
  ],
});

for await (const _event of Deno.watchFs(input, { recursive: true })) {
  const start = Date.now();
  try {
    console.log("rebuilding...");
    await generate(input, output);
    console.log("done! (" + (Date.now() - start) + "ms)");
  } catch (err) {
    console.error(err.message);
  }
}
