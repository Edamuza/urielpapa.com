import slugify from "slugify";

export const slugifyStr = (str: string): string =>
  slugify(str, { lower: true, strict: true });
