// The plain HTML page a visitor gets after sending a form without JavaScript.
// Kept free of Astro imports so tests/form-page.test.mjs can check its links.

const esc = s =>
  s.replace(
    /[&<>"]/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]
  );

/**
 * The page's HTML.
 * @param {string} title
 * @param {string} message
 * @returns {string}
 */
export function formReplyHtml(title, message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>body{font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1rem;color:#0a0a0a;background:#fff}a{color:inherit}</style></head><body><h1>${esc(title)}</h1><p>${esc(message)}</p><p><a href="javascript:history.back()" title="Go back to the form you sent">Go back</a> · <a href="/" title="Go to the urielpapa.com home page">Home</a></p></body></html>`;
}
