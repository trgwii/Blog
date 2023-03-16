///<reference types="./node_modules/@types/node/index.d.ts" />
///<reference types="./node_modules/shiki-twoslash/dist/index.d.ts" />

const {
  createShikiHighlighter,
  renderCodeToHTML,
  runTwoSlash,
} = require("shiki-twoslash");

(async () => {
  const lang = process.argv[2];
  let code = "";
  process.stdin.setEncoding("utf-8");
  for await (const chunk of process.stdin) {
    code += chunk;
  }
  const highlighter = await createShikiHighlighter({ theme: "dark-plus" });
  if (lang === "zig") {
    await highlighter.loadLanguage({
      id: "zig",
      scopeName: "source.zig",
      grammar: JSON.parse(
        await (await fetch(
          "https://raw.githubusercontent.com/ziglang/vscode-zig/master/syntaxes/zig.tmLanguage.json",
        )).text(),
      ),
      aliases: ["zig", "ziglang"],
    });
  }
  if (lang === "ts") {
    const twoslash = runTwoSlash(code, lang);
    const html = renderCodeToHTML(
      twoslash.code,
      twoslash.extension,
      { twoslash: true },
      {},
      highlighter,
      twoslash,
    );

    process.stdout.write(html);
  } else {
    console.log(highlighter.codeToHtml(code, lang));
  }
})();
