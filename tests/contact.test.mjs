import assert from "node:assert/strict";
import { test } from "node:test";
import { businessOf, composeEmail, fieldError, parseContact, TOPICS } from "../src/lib/contact.mjs";

const SITE = "https://urielpapa.com";
const read = values => parseContact(key => values[key] ?? null, SITE);

test("a valid project inquiry", () => {
  const c = read({
    name: "Ana Cruz",
    email: "ana@example.com",
    topic: "work",
    workKind: "client",
    company: "Cruz Bakery",
    budget: "₱50k",
    message: "We need a new website for our bakery.",
    slot: "2026-12-01T09:00:00+08:00",
  });
  assert.deepEqual(c.errors, {});
  assert.equal(c.spam, false);
  assert.equal(c.topic, "Work together");
  assert.equal(c.slot, "2026-12-01T09:00:00+08:00");
  assert.equal(businessOf(c), "Cruz Bakery");
  const mail = composeEmail(c, "Booked call: 1 Dec");
  assert.equal(mail.subject, "[urielpapa.com] Work together (project): Ana Cruz");
  assert.equal(
    mail.text,
    "Topic: Work together\nName: Ana Cruz\nEmail: ana@example.com\nBooked call: 1 Dec\nSender: Business with a project\nBusiness: Cruz Bakery\nBudget: ₱50k\n\nWe need a new website for our bakery.",
  );
});

test("invalid fields get the same messages the page shows", () => {
  const c = read({ name: "  ", email: "not-an-email", message: "short" });
  assert.deepEqual(c.errors, {
    name: fieldError("name", ""),
    email: fieldError("email", "x"),
    message: fieldError("message", ""),
  });
  assert.match(c.errors.message, /at least 10 characters/);
});

test("the honeypot marks spam", () => {
  assert.equal(read({ website: "http://spam.example" }).spam, true);
});

test("line breaks can't reach the subject, and unknown topics become other", () => {
  const c = read({ name: "Eve\r\nBcc: x@evil.test", email: "e@x.co", topic: "hack", message: "Hello there, friend" });
  assert.equal(c.topicKey, "other");
  assert.doesNotMatch(composeEmail(c).subject, /[\r\n]/);
});

test("a post question links only to real post paths", () => {
  const good = read({ topic: "question", post: "My post", postUrl: "/news/some-post" });
  assert.deepEqual(good.answers, [["Post", "My post"], ["Link", "https://urielpapa.com/news/some-post"]]);
  const bad = read({ topic: "question", post: "My post", postUrl: "https://evil.test/x" });
  assert.deepEqual(bad.answers, [["Post", "My post"]]);
});

test("only work and speaking can book a call", () => {
  assert.equal(read({ topic: "question", slot: "2026-12-01T09:00:00+08:00" }).slot, "");
  assert.equal(read({ topic: "speaking", eventName: "DevCon", slot: "x" }).callTopic, true);
  assert.equal(businessOf(read({ topic: "speaking", eventName: "DevCon" })), "DevCon");
  assert.deepEqual(TOPICS.map(t => t.value), ["work", "speaking", "question", "other"]);
});
