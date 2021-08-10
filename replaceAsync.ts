// From: https://gist.github.com/MKRhere/a6eb0bc813f0888c6bc48a4b433aed6d

// Copyright 2021 Feathers Studio & Muthu Kumar

// Use of this source code is governed by an MIT-style license that can be found at https://opensource.org/licenses/MIT
// SPDX-License-Identifier: MIT

type Replacer1 = (substring: string) => string | Promise<string>;
type Replacer2 = (
  ...params: [substring: string, ...ps: string[]]
) => string | Promise<string>;
type Replacer3 = (
  ...params: [substring: string, ...ps: string[], offset: number]
) => string | Promise<string>;
type Replacer4 = (
  ...params: [
    substring: string,
    ...ps: string[],
    offset: number,
    string: string,
  ]
) => string | Promise<string>;

type Replacer = string | Replacer1 | Replacer2 | Replacer3 | Replacer4;

const wrapIf = <T>(thing: T | null) => (thing ? [thing] : []);

export const matchAll = (str: string, regexp: RegExp): RegExpExecArray[] => {
  if (!regexp.global) return wrapIf(regexp.exec(str));

  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = regexp.exec(str)) !== null) matches.push(match);
  return matches;
};

export const replaceAsync = async (
  str: string,
  regexp: RegExp,
  replacer: Replacer,
): Promise<string> => {
  let lastIndex = 0;

  return await Promise.all(
    matchAll(str, regexp).map(async (execArray) => {
      const {
        index,
        0: { length },
      } = execArray;
      const replace = typeof replacer === "function"
        ? await (replacer as Replacer4)(
          ...(execArray as unknown as [substring: string, ...ps: string[]]),
          index,
          str,
        )
        : replacer;

      return { replace, index, length };
    }),
  ).then(
    (arr) =>
      arr.reduce((acc, { index, replace, length }) => {
        const ret = acc + str.slice(lastIndex, index) + replace;
        lastIndex = index + length;
        return ret;
      }, "") + str.slice(lastIndex),
  );
};
