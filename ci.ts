import "./install_twoslash.ts";
import { generate } from "./sitegen.ts";

const [input, output] = Deno.args;
await generate(input, output);
