await new Deno.Command("npm", {
  args: [
    "i",
    "shiki-twoslash",
    "undici",
  ],
}).spawn().status;
