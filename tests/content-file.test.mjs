import assert from "node:assert/strict";
import { test } from "node:test";
import { field, readEntry } from "../scripts/lib/content-file.mjs";

const post = [
  "---",
  'title: "Why \\"agents\\" fail"',
  "description: >-",
  "  First line",
  "  second line",
  "published: 2026-11-04",
  "frame: news-take",
  "author: 'Uriel''s desk'",
  "tags:",
  "  - ai",
  "  - seo",
  "sources:",
  "  - url: https://example.com/a",
  "  - url: 'https://example.com/b'",
  "draft: false",
  "---",
  "",
  "Body line one",
  "Body line two",
].join("\n");

test("reads scalars, quoting, folded blocks and lists", () => {
  const { data, body } = readEntry(post);
  assert.equal(data.title, 'Why "agents" fail');
  assert.equal(data.description, "First line second line");
  assert.equal(data.published, "2026-11-04");
  assert.equal(data.author, "Uriel's desk");
  assert.deepEqual(data.tags, ["ai", "seo"]);
  assert.deepEqual(data.sources, ["https://example.com/a", "https://example.com/b"]);
  assert.equal(data.draft, "false");
  assert.equal(body, "\nBody line one\nBody line two");
});

test("reads a CRLF file exactly like an LF file", () => {
  assert.deepEqual(readEntry(post.replace(/\n/g, "\r\n")), readEntry(post));
});

test("a file without frontmatter is all body", () => {
  assert.deepEqual(readEntry("Just text\n"), { data: {}, body: "Just text\n" });
});

test("field() returns one non-empty string field", () => {
  assert.equal(field(post, "frame"), "news-take");
  assert.equal(field(post, "missing"), undefined);
  assert.equal(field(post, "tags"), undefined);
});
