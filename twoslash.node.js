///<reference types="./node_modules/@types/node/index.d.ts" />
///<reference types="./node_modules/shiki-twoslash/dist/index.d.ts" />

const {
  createShikiHighlighter,
  renderCodeToHTML,
  runTwoSlash,
} = require("shiki-twoslash");

(async () => {
  let code = "";
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) {
    code += chunk;
  }
  const highlighter = await createShikiHighlighter({ theme: "dark-plus" });
  const twoslash = runTwoSlash(code, process.argv[2]);
  const html = renderCodeToHTML(
    twoslash.code,
    twoslash.extension,
    { twoslash: true },
    {},
    highlighter,
    twoslash,
  );

  process.stdout.write(html);
})();
