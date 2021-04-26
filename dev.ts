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

console.log("rebuilding...");
await generate(input, output);
console.log("done");

Deno.run({
  cmd: [
    "deno",
    "run",
    "-A",
    "https://deno.land/std@0.90.0/http/file_server.ts",
    output,
  ],
});

for await (const event of Deno.watchFs(input, { recursive: true })) {
  try {
    console.log("rebuilding...");
    generate(input, output);
    console.log("done!");
  } catch (err) {
    console.error(err.message);
  }
}
