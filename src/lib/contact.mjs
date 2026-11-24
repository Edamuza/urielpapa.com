// The contact form's rules in one place: its topics, how a submission is
// read and checked, and the email it becomes. Plain JavaScript with no Astro
// imports, so the page's script, the API route (src/pages/api/contact.ts)
// and the tests (tests/contact.test.mjs) all share it.

/** The topics a sender can pick, in the order the form shows them. */
export const TOPICS = [
  { value: "work", label: "Work together" },
  { value: "speaking", label: "Speaking or event" },
  { value: "question", label: "Question about a post" },
  { value: "other", label: "Something else" },
];

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A message must be at least this long. */
export const MESSAGE_MIN = 10;

/** A post picked in the form's "Which post?" search: a blog, news or event page. */
const POST_PATH = /^\/(blog|news|events)\/[\w-]+$/;

/**
 * The error for one required field, or "" when it is fine. The page shows
 * these as you type; the server sends the same ones back.
 * @param {"name" | "email" | "message"} field
 * @param {string} value
 * @returns {string}
 */
export function fieldError(field, value) {
  const v = value.trim();
  if (field === "name") return v ? "" : "Please enter your name.";
  if (field === "email")
    return EMAIL_RE.test(v) ? "" : "Please enter a valid email address.";
  return v.length >= MESSAGE_MIN
    ? ""
    : `Please write a little more (at least ${MESSAGE_MIN} characters).`;
}

// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL = /[\x00-\x1f\x7f]/g;

/**
 * @typedef {{
 *   spam: boolean,
 *   name: string,
 *   email: string,
 *   topicKey: string,
 *   topic: string,
 *   workKind: string,
 *   message: string,
 *   answers: [string, string][],
 *   callTopic: boolean,
 *   slot: string,
 *   errors: Record<string, string>,
 * }} Contact
 */

/**
 * Reads and checks a submission. `get(key)` returns a form value (FormData's
 * get, or a plain lookup in tests).
 * @param {(key: string) => unknown} get
 * @param {string} siteUrl  the site's origin, for the picked post's full link
 * @returns {Contact}
 */
export function parseContact(get, siteUrl) {
  const raw = key => String(get(key) ?? "");
  // One line per answer, so nothing can break the subject or the email layout.
  const field = (key, max = 300) =>
    raw(key).replace(CONTROL, " ").trim().slice(0, max);

  const name = raw("name").replace(CONTROL, "").trim().slice(0, 120);
  const email = raw("email").trim().slice(0, 200);
  const topicKey = TOPICS.some(t => t.value === raw("topic"))
    ? raw("topic")
    : "other";
  const topic = TOPICS.find(t => t.value === topicKey).label;
  const message = raw("message").trim().slice(0, 5000);

  // Topic questions, all optional: for "Work together", one set for a
  // business with a project and one for an employer hiring for a role; for
  // "Speaking or event", the event; for "Question about a post", the post.
  const workKind = topicKey === "work" ? field("workKind") : "";
  /** @type {[string, string][]} */
  let answers = [];
  if (workKind === "client") {
    answers = [
      ["Sender", "Business with a project"],
      ["Business", field("company", 160)],
      ["Website", field("site")],
      ["Industry", field("industry", 120)],
      ["Needs", field("need", 120)],
      ["Budget", field("budget", 120)],
      ["Timeline", field("timeline", 120)],
    ];
  } else if (workKind === "employer") {
    answers = [
      ["Sender", "Employer hiring for a role"],
      ["Company", field("employer", 160)],
      ["Role", field("role", 160)],
      ["Employment type", field("employmentType", 120)],
      ["Work setup", field("workSetup", 120)],
      ["Salary range", field("salary", 120)],
      ["Job post", field("jobPost")],
    ];
  } else if (topicKey === "speaking") {
    answers = [
      ["Event", field("eventName", 160)],
      ["Event date", field("eventDate", 20)],
      ["Format", field("eventFormat", 60)],
      ["Location", field("eventLocation", 160)],
    ];
  } else if (topicKey === "question") {
    const postUrl = field("postUrl");
    answers = [
      ["Post", field("post", 300)],
      ["Link", POST_PATH.test(postUrl) ? new URL(postUrl, siteUrl).href : ""],
    ];
  }
  // Work and speaking messages can book the free call.
  const callTopic = topicKey === "work" || topicKey === "speaking";
  if (callTopic) answers.push(["Good times for a call", field("callTimes")]);

  /** @type {Record<string, string>} */
  const errors = {};
  for (const [key, value] of Object.entries({ name, email, message })) {
    const error = fieldError(/** @type {"name"} */ (key), value);
    if (error) errors[key] = error;
  }

  return {
    // Bots fill the hidden "website" field.
    spam: raw("website") !== "",
    name,
    email,
    topicKey,
    topic,
    workKind,
    message,
    answers: answers.filter(([, v]) => v),
    callTopic,
    slot: callTopic ? field("slot", 40) : "",
    errors,
  };
}

/** The topic answers as "Key: value" lines. */
export const answerText = (/** @type {Contact} */ c) =>
  c.answers.map(([k, v]) => `${k}: ${v}`).join("\n");

/** The name of the sender's business or event, for the calendar entry. */
export const businessOf = (/** @type {Contact} */ c) =>
  (c.topicKey === "speaking"
    ? c.answers.find(([k]) => k === "Event")?.[1]
    : c.answers.find(([k]) => k === "Business" || k === "Company")?.[1]) ?? "";

/**
 * The email Uriel receives.
 * @param {Contact} c
 * @param {string} [bookingNote]  the booked or requested call, if any
 * @returns {{ subject: string, text: string }}
 */
export function composeEmail(c, bookingNote = "") {
  const kind =
    c.workKind === "employer"
      ? " (hiring)"
      : c.workKind === "client"
        ? " (project)"
        : "";
  const answers = answerText(c);
  return {
    subject: `[urielpapa.com] ${c.topic}${kind}: ${c.name}`,
    text: `Topic: ${c.topic}\nName: ${c.name}\nEmail: ${c.email}${
      bookingNote ? `\n${bookingNote}` : ""
    }${answers ? `\n${answers}` : ""}\n\n${c.message}`,
  };
}
