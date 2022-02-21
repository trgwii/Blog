await Deno.run({
  cmd: [
    ...Deno.build.os === "windows" ? ["cmd.exe", "/c"] : [],
    "npm",
    "i",
    "shiki-twoslash",
    "undici",
  ],
}).status();
