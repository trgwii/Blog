import marked from "./marked.ts";
import { toFileUrl } from "https://deno.land/std@0.97.0/path/mod.ts";

import { replaceAsync } from "https://gist.githubusercontent.com/MKRhere/a6eb0bc813f0888c6bc48a4b433aed6d/raw/26bb84186d683b22cfd13a8df1d9faac06a1a697/replaceAsyncParallel.ts";

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
    const [f, arg] = name.split(":");
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
  for await (const entry of Deno.readDir(input)) {
    const { name } = entry;
    const noExt = name.split(".").slice(0, -1).join(".");
    const entPath = `${input}/${name}`;
    const stat = await Deno.stat(entPath);
    if (stat.isFile) {
      if (name.startsWith("_")) {
        continue;
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
        continue;
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
        continue;
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
        continue;
      }
      await Deno.mkdir(output, { recursive: true }).catch(() => {});
      await Deno.copyFile(entPath, `${output}/${name}`)
        .catch((err: Error) => console.error(err.message));
    } else if (stat.isDirectory) {
      if (name.startsWith("_")) {
        continue;
      }
      await generate(entPath, `${output}/${name}`);
    }
  }
};

if (import.meta.main) {
  const [input, output] = Deno.args;
  await generate(input, output);
}
