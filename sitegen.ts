import marked from "./marked.ts";
import { replaceAsync } from "./replaceAsync.ts";
import { toFileUrl } from "https://deno.land/std@0.104.0/path/mod.ts";
import { encode } from "https://deno.land/std@0.104.0/encoding/base64.ts";

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
  replaceAsync(str, /\{(\w+:?[^}]+?)\}/g, async (_: unknown, name: string) => {
    const [f, ...args] = name.split(":");
    const arg = args.join(":");
    if (arg && f in fns) {
      return await fns[f](arg, dir, data);
    }
    return name in data ? data[name] : `{${name}}`;
  });

export const writeDocument = async (name: string, data: string) => {
  if (name.endsWith("index")) {
    await Deno.mkdir(name.split("/").slice(0, -1).join("/"), {
      recursive: true,
    });
    return Deno.writeTextFile(`${name}.html`, data);
  }
  await Deno.mkdir(name, { recursive: true });
  return Deno.writeTextFile(`${name}/index.html`, data);
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
  const upper = `${dir}/../_${dirName.slice(0, -1)}.html`;
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

const fns = {
  md: async (
    file: string,
    dir: string,
    data: Record<string, string>,
  ) =>
    marked(
      await useTemplate(
        await Deno.readTextFile(`${dir}/${file}`),
        data,
        fns,
        dir,
      ),
    )
      .trim(),
  file: async (file: string, dir: string, data: Record<string, string>) =>
    (await useTemplate(
      await Deno.readTextFile(`${dir}/${file}`),
      data,
      fns,
      dir,
    ))
      .trim(),
  dataURL: async (url: string) => {
    const res = await fetch(url);
    const contentType = res.headers.get("Content-Type") ??
      "application/octet-stream";
    return `data:${contentType};base64,${encode(await res.arrayBuffer())}`;
  },
  favicon: async (url: string) => {
    if (url.startsWith("<") && url.endsWith(">")) {
      url = url.slice(1, -1);
    }
    const res = await fetch(url);
    const html = await res.text();
    const faviconURL = html.match(
      /<link[^>]*?rel="[^-"]*?icon[^"]*?"[^>]*href="([^"]*?)"/,
    )?.[1];
    const faviconAbsURL = new URL(faviconURL ?? "/favicon.ico", url).href;
    return `![16px ${
      capitalize(new URL(url).hostname.split(".")[0])
    } logo](${await fns.dataURL(faviconAbsURL)})`;
  },
  dir: async (arg: string, dir: string, data: Record<string, string>) =>
    marked(
      await useTemplate(
        (await collect(Deno.readDir(`${dir}/${arg}`))).map((d) => d.name)
          .filter((x) => !x.startsWith("index."))
          .map((d) => {
            const x = d.split(".").slice(0, -1).join(".");
            return `[${x}](${x}/)`;
          })
          .join("\n\n"),
        data,
        fns,
        dir,
      ),
    ),
};
export const generate = async (input: string, output: string) => {
  const p: Promise<void>[] = [];
  for await (const entry of Deno.readDir(input)) {
    p.push((async () => {
      const { name } = entry;
      const noExt = name.split(".").slice(0, -1).join(".");
      const entPath = `${input}/${name}`;
      const stat = await Deno.stat(entPath);
      if (stat.isFile) {
        if (name.startsWith("_")) {
          return;
        }
        if (name.endsWith(".md")) {
          const md = await Deno.readTextFile(entPath);
          const [templateDir, template] = await findTemplate(input, noExt);
          const globals = await findGlobals(input);
          const processedMd = await useTemplate(
            md,
            {
              ...globals,
              title: capitalize(noExt),
            },
            fns,
            input,
          );
          const title = findTitle(processedMd, noExt);
          const result = await useTemplate(
            template,
            {
              ...globals,
              title,
              body: marked(processedMd).trim(),
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
        if (name.endsWith(".css")) {
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
          await Deno.mkdir(output, { recursive: true }).catch(() => {});
          await Deno.writeTextFile(`${output}/${name}`, sheet);
          return;
        }
        await Deno.mkdir(output, { recursive: true }).catch(() => {});
        await Deno.copyFile(entPath, `${output}/${name}`)
          .catch((err: Error) => console.error(err.message));
      } else if (stat.isDirectory) {
        if (name.startsWith("_")) {
          return;
        }
        await generate(entPath, `${output}/${name}`);
      }
    })());
  }
  await Promise.all(p);
};

if (import.meta.main) {
  const [input, output] = Deno.args;
  await generate(input, output);
}
