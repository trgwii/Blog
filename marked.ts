import "https://cdn.jsdelivr.net/npm/marked@2.1.3/marked.min.js";
import type * as marked from "https://cdn.jsdelivr.net/npm/@types/marked@2.0.4/index.d.ts";
export default (window as unknown as { marked: unknown }).marked as (
  src: string,
  options?: marked.MarkedOptions | undefined,
) => string;
