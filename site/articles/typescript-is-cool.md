---
author: Thomas
---

# TypeScript is cool

```ts
type Join<T extends unknown[], D extends string> = T extends [] ? ""
  : T extends [string | number | boolean | bigint] ? `${T[0]}`
  : T extends [string | number | boolean | bigint, ...infer U]
    ? `${T[0]}${D}${Join<U, D>}`
  : string;
type T30 = Join<[1, 2, 3, 4], ".">; // '1.2.3.4'
type T31 = Join<["foo", "bar", "baz"], "-">; // 'foo-bar-baz'
type T32 = Join<[], ".">; // ''

type Split<S extends string, D extends string> = string extends S ? string[]
  : S extends "" ? []
  : S extends `${infer T}${D}${infer U}` ? [T, ...Split<U, D>]
  : [S];

type T40 = Split<"foo", ".">; // ['foo']
type T41 = Split<"foo.bar.baz", ".">; // ['foo', 'bar', 'baz']
type T42 = Split<"foo.bar", "">; // ['f', 'o', 'o', '.', 'b', 'a', 'r']
type T43 = Split<any, ".">; // string[]
```

Yep. TS can do that now.
