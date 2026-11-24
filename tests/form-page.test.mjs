import assert from "node:assert/strict";
import { test } from "node:test";
import { formReplyHtml } from "../src/lib/form-page.mjs";
import { linkProblems } from "../src/utils/linkTitles.mjs";

test("the no-JavaScript form reply escapes its text", () => {
  const html = formReplyHtml("Done <now>", 'Thanks, "Ana" & co.');
  assert.match(html, /<h1>Done &lt;now&gt;<\/h1>/);
  assert.match(html, /<p>Thanks, &quot;Ana&quot; &amp; co\.<\/p>/);
});

test("every link on the form reply has a descriptive title", () => {
  assert.deepEqual(linkProblems(formReplyHtml("Done", "Sent.")), []);
});

test("linkProblems flags missing and bare titles", () => {
  assert.deepEqual(linkProblems('<a href="/x">X</a><a href="/y" title="Y →">Y</a><a href="/z" title="Read about Z">Z</a>'), [
    { href: "/x", problem: "is missing a title" },
    { href: "/y", problem: 'has a title that only repeats its short label or URL ("Y")' },
  ]);
});
