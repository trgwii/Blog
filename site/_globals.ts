export const siteName = "TRGWII's blog";

export const titleFont = "Gilda Display";
export const titleFontWeight = 400;
export const titleFontSlug = titleFont.replaceAll(" ", "+") +
  (titleFontWeight === 400 ? "" : `:wght@${titleFontWeight}`);

export const bodyFont = "Open Sans";
export const bodyFontWeight = 400;
export const bodyFontSlug = bodyFont.replaceAll(" ", "+") +
  (bodyFontWeight === 400 ? "" : `:wght@${bodyFontWeight}`);

export const codeFont = 'Inconsolata';
export const codeFontWeight = 400;
export const codeFontSlug = codeFont.replaceAll(" ", "+") +
  (codeFontWeight === 400 ? "" : `:wght@${codeFontWeight}`);
