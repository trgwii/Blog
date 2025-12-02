import { encode } from "https://deno.land/std@0.104.0/encoding/base64.ts";
import { toFileUrl } from "https://deno.land/std@0.104.0/path/mod.ts";
import { parse } from "https://deno.land/x/frontmatter@v0.1.5/mod.ts";
import marked from "./marked.ts";
import { replaceAsync } from "./replaceAsync.ts";

const markedOpts: marked.MarkedOptions = {
  highlight: (
    code: string,
    lang: string | undefined,
    cb: (err: unknown, result?: string) => void,
  ) => {
    if (typeof lang === "undefined") {
      return cb(null, code);
    }
    (async () => {
      await Deno.mkdir("tmp", { recursive: true });
      const command = new Deno.Command("node", {
        args: [
          "--localstorage-file",
          "tmp/localStorage",
          "twoslash.node.js",
          lang,
        ],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      });
      const proc = command.spawn();
      const writer = proc.stdin.getWriter();
      await writer.write(new TextEncoder().encode(code));
      await writer.close();
      const { stdout, stderr } = await proc.output();
      const { success } = await proc.status;
      if (!success) {
        console.error(
          new Error(
            new TextDecoder().decode(stderr) ||
            new TextDecoder().decode(stdout),
          ),
        );
        return cb!(
          new Error(
            new TextDecoder().decode(stderr) ||
            new TextDecoder().decode(stdout),
          ),
        );
      }
      cb!(undefined, new TextDecoder().decode(stdout));
    })();
  },
};

const collect = async <T>(s: AsyncIterable<T>) => {
  const res = [];
  for await (const x of s) {
    res.push(x);
  }
  return res;
};

export const useTemplate = (
  str: string,
  data: Record<string, string>,
  fns: Record<
    string,
    (arg: string, dir: string, data: Record<string, string>) => Promise<string>
  >,
  dir: string,
) =>
  replaceAsync(
    str,
    /\{([\w|?]+:?[^}]+?)\}/g,
    async (_: unknown, name: string) => {
      const [f, ...args] = name.split(":");
      const arg = args.join(":");
      if (arg && f in fns) {
        // const rand = Math.random();
        // console.time(f + '_' + rand);
        const r = await fns[f](arg, dir, data);
        // console.timeEnd(f + '_' + rand);
        return r;
      }
      return name in data ? data[name] : `{${name}}`;
    },
  );

export const writeDocument = async (name: string, data: string) => {
  if (name.endsWith("index")) {
    await Deno.mkdir(name.split("/").slice(0, -1).join("/"), {
      recursive: true,
    });
    await Deno.writeTextFile(`${name}.html`, data);
    await new Deno.Command("gzip", { args: ["-kf", `${name}.html`] }).spawn()
      .status;
    return;
  }
  await Deno.mkdir(name, { recursive: true });
  await Deno.writeTextFile(`${name}/index.html`, data);
  await new Deno.Command("gzip", { args: ["-kf", `${name}/index.html`] })
    .spawn().status;
  return;
};

export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

export const findTitle = (md: string, name: string) => {
  const res = md.split(/[\r\n]/).find((l) => l.startsWith("# "));
  if (res) {
    return res.slice(2);
  }
  return capitalize(name);
};

export const findGlobals = async (
  dir: string,
): Promise<Record<string, string | unknown>> => {
  const lower = `${dir}/_globals.ts`;
  const upper = `${dir}/../_globals.ts`;
  if (
    await Deno.stat(lower).then(
      (s) => s.isFile,
      () => false,
    )
  ) {
    return import(`${toFileUrl(Deno.cwd())}/${lower}`).catch(() => ({}));
  }
  return import(`${toFileUrl(Deno.cwd())}/${upper}`).catch(() => ({}));
};

export const findTemplate = async (dir: string, name: string) => {
  const dirName = dir.split("/").slice(-1)[0];
  const lower = `${dir}/_${name}.html`;
  const upper = `${dir}/../_${dirName.endsWith("s") ? dirName.slice(0, -1) : dirName
    }.html`;
  if (
    await Deno.stat(lower).then(
      (s) => s.isFile,
      () => false,
    )
  ) {
    return [lower, await Deno.readTextFile(lower)];
  }
  return [upper, await Deno.readTextFile(upper)];
};

const Str = (x: unknown) => {
  if (x instanceof Date) return x.toISOString().split("T")[0];
  return String(x);
};

const fns = {
  md: async (
    file: string,
    dir: string,
    data: Record<string, string>,
  ) => {
    console.log("-> md", file, dir);
    const doc = await Deno.readTextFile(`${dir}/${file}`);
    const { data: locals = {}, content } = parse(doc);
    const r = (await marked(
      await useTemplate(
        content,
        { ...data, ...locals as Record<string, string> },
        fns,
        dir,
      ),
      markedOpts,
    )).trim();
    console.log("<- md", file, dir);
    return r;
  },
  css: async (file: string, dir: string, data: Record<string, string>) => {
    const r = await fns.file(file, dir, data);
    return r
      .replaceAll(/\n\s+/g, "")
      .replaceAll("\n", "")
      .replaceAll("\t", "")
      .replaceAll(" {", "{")
      .replaceAll("/* ", "/*")
      .replaceAll(" */", "*/")
      .replaceAll(": ", ":")
      .replaceAll(", ", ",")
      .replaceAll(" !", "!")
      .replaceAll(" (", "(");
  },
  "?": (str: string, _: string, data: Record<string, string>) => {
    const [x, ...rest] = str.split(":");
    const r = rest.join(":");
    return Promise.resolve(x in data ? r.replaceAll(x, Str(data[x])) : "");
  },
  file: async (file: string, dir: string, data: Record<string, string>) => {
    console.log("-> file ", file, dir);
    const r = (await useTemplate(
      await Deno.readTextFile(`${dir}/${file}`),
      data,
      fns,
      dir,
    ))
      .trim();
    console.log("<- file ", file, dir);
    return r;
  },
  dataURL: async (url: string) => {
    const res = await fetch(url);
    const contentType = res.headers.get("Content-Type") ??
      "application/octet-stream";
    return `data:${contentType};base64,${encode(await res.arrayBuffer())}`;
  },
  favicon: async (url: string) => {
    console.log("-> favicon", url);
    if (url.startsWith("<") && url.endsWith(">")) {
      url = url.slice(1, -1);
    }
    const res = await fetch(url);
    const html = await res.text();
    const faviconURL = html.match(
      /<link[^>]*?rel="[^-"]*?icon[^"]*?"[^>]*href="([^"]*?)"/,
    )?.[1] || html.match(
      /<link[^>]*?href="([^"]*?)"[^>]*rel="[^-"]*?icon[^"]*?"/,
    )?.[1];
    const faviconAbsURL = new URL(faviconURL ?? "/favicon.ico", url).href;
    const r = `![16px ${capitalize(new URL(url).hostname.split(".")[0])
      } logo](${await fns.dataURL(faviconAbsURL)})`;
    console.log("<- favicon", url);
    return r;
  },
  dir: async (arg: string, dir: string, data: Record<string, string>) => {
    console.log("-> dir", dir);
    const r = marked(
      await useTemplate(
        (await Promise.all(
          (await collect(Deno.readDir(`${dir}/${arg}`))).map((d) => d.name)
            .filter((x) => !x.startsWith("index.") && !x.startsWith("_"))
            .map(async (d) => {
              const x = d.split(".").slice(0, -1).join(".");
              const { data: fields = {} } = parse(
                await Deno.readTextFile(`${dir}//${d}`),
              ) as { data: Record<string, string> };
              return `${"date" in fields ? (Str(fields.date) + " ") : ""}${"author" in fields ? (fields.author + " ") : ""
                }[${x}](${x}/)`;
            }),
        ))
          .sort((a, b) => {
            if (!/\d{4}/.test(a) && !/\d{4}/.test(b)) {
              return a < b ? -1 : a > b ? 1 : 0;
            }
            if (!/\d{4}/.test(a)) return 1;
            if (!/\d{4}/.test(b)) return -1;
            return a < b ? 1 : a > b ? -1 : 0;
          })
          .join("\n\n"),
        data,
        fns,
        dir,
      ),
      markedOpts,
    );
    console.log("<- dir", dir);
    return r;
  },
};
export const generate = async (input: string, output: string) => {
  const p: Promise<void>[] = [];
  for await (const entry of Deno.readDir(input)) {
    p.push((async () => {
      const { name } = entry;
      const noExt = name.split(".").slice(0, -1).join(".");
      const entPath = `${input}/${name}`;
      console.log("->", entPath);
      const stat = await Deno.stat(entPath);
      if (stat.isFile) {
        if (name.startsWith("_")) {
          return;
        }
        if (name.endsWith(".md")) {
          const md = await Deno.readTextFile(entPath);
          const [templateDir, template] = await findTemplate(input, noExt);
          const globals = await findGlobals(input);
          const { data: _locals = {} } = parse(md);
          const processedMd = await useTemplate(
            md,
            {
              ...globals,
              title: capitalize(noExt),
              ..._locals as Record<string, string>,
            },
            fns,
            input,
          );
          const title = findTitle(processedMd, noExt);
          const { data: locals = {}, content } = parse(processedMd);
          const result = await useTemplate(
            template,
            {
              ...globals,
              title,
              ...locals as Record<string, string>,
              body: (await marked(content, markedOpts)).trim(),
            },
            fns,
            templateDir.split("/").pop()?.includes(".")
              ? templateDir.split("/").slice(0, -1).join("/")
              : templateDir,
          );
          await writeDocument(`${output}/${noExt}`, result);
          return;
        }
        if (name.endsWith(".html")) {
          const file = await Deno.readTextFile(entPath);
          const globals = await findGlobals(input);
          const doc = await useTemplate(
            file,
            {
              ...globals,
              title: capitalize(noExt),
            },
            fns,
            input,
          );
          await writeDocument(`${output}/${noExt}`, doc);
          return;
        }
        if (name.endsWith(".css") || name.endsWith(".js")) {
          const file = await Deno.readTextFile(entPath);
          const globals = await findGlobals(input);
          const sheet = await useTemplate(
            file,
            {
              ...globals,
              title: capitalize(noExt),
            },
            fns,
            input,
          );
          await Deno.mkdir(output, { recursive: true }).catch(() => { });
          await Deno.writeTextFile(`${output}/${name}`, sheet);
          await new Deno.Command("gzip", { args: ["-kf", `${output}/${name}`] })
            .spawn().status;
          return;
        }
        await Deno.mkdir(output, { recursive: true }).catch(() => { });
        await Deno.copyFile(entPath, `${output}/${name}`)
          .catch((err: Error) => console.error(err.message));
      } else if (stat.isDirectory) {
        if (name.startsWith("_")) {
          return;
        }
        await generate(entPath, `${output}/${name}`);
      }
      console.log("<-", entPath);
    })());
  }
  await Promise.all(p);
};

if (import.meta.main) {
  const [input, output] = Deno.args;
  await generate(input, output);
}
