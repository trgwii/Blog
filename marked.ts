import "https://cdn.jsdelivr.net/npm/marked@2.1.3/marked.min.js";
import type * as marked from "https://cdn.jsdelivr.net/npm/@types/marked@2.0.4/index.d.ts";
const _marked = (window as unknown as { marked: unknown }).marked as (
  src: string,
  options?: marked.MarkedOptions | undefined,
  callback?: (error: unknown, parseResult: string) => void,
) => string;

export default (src: string, options?: marked.MarkedOptions) =>
  new Promise<string>((resolve, reject) =>
    _marked(
      src,
      options,
      (err: unknown, html: string) => err ? reject(err) : resolve(html),
    )
  );
