import { PUBLIC_SHOW_DRAFTS } from "astro:env/client";

/**
 * Site-wide settings for urielpapa.com.
 *
 * Values marked "confirm" are defaults from the plan (plan/README.md, "To confirm
 * with Uriel") and should be checked before launch.
 */

export const SITE = {
  url: "https://urielpapa.com",
  name: "Uriel Papa",
  title: "Uriel Papa",
  /** Default meta description (home page and fallbacks). */
  description:
    "Uriel Papa is a builder and founder in the Philippines writing about AI, automation, SEO, GEO and AEO, tech stacks, marketing and the founder's journey.",
  lang: "en",
  locale: "en_PH",
  timezone: "Asia/Manila",
  /** Shown in the header, About, author box and Person schema. Confirm. */
  jobTitle: "Builder and Founder",
  location: "Philippines",
  email: "work@urielpapa.com",
  /** One-line bio used in the footer and author box. */
  bio: "Builder and founder in the Philippines. I share what I've learned building and running a company: AI, automation, tech stacks, SEO, GEO and AEO, marketing and how technology affects business, plus tech news.",
  /**
   * Public URL of the 480×480 photo, used in the Person schema. Avatar shows an
   * optimized copy (src/assets/images/uriel-papa.jpg); set null for the monogram.
   */
  photo: "/images/uriel-papa.jpg" as string | null,
} as const;

/**
 * Microsoft Clarity project (heatmaps and session recordings). The ID is
 * public; it is in Clarity's own tracking snippet. Set "" to switch it off.
 */
export const CLARITY_PROJECT_ID = "z8t4qrt0ds";

/** The Macro statement from content-network.md §1, reused on Home, About and llms.txt. */
export const MACRO =
  "urielpapa.com is where Uriel Papa, a builder and founder from the Philippines, shares the lessons from founding a company and building with technology: how AI and large language models really work, the automations behind real projects, how technology affects business, the economy and society, how search is evolving with SEO, GEO and AEO, what's new in tech stacks, the basics of marketing, and the journey of a founder. It also carries takes on the latest tech news and notes from seminars and trainings. It's written for anyone interested in the same things.";

/**
 * Profiles listed in the footer, About, Contact and Person `sameAs`.
 * Add Threads and Reddit once confirmed.
 */
export const SOCIALS: { name: string; label: string; url: string }[] = [
  {
    name: "linkedin",
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/uriel-papa-vitese01/",
  },
  { name: "github", label: "GitHub", url: "https://github.com/Edamuza" },
  { name: "x", label: "X", url: "https://x.com/its_uriel26" },
  {
    name: "tiktok",
    label: "TikTok",
    url: "https://www.tiktok.com/@its_uriel26",
  },
  {
    name: "instagram",
    label: "Instagram",
    url: "https://www.instagram.com/its_uriel26/",
  },
  {
    name: "facebook",
    label: "Facebook",
    url: "https://www.facebook.com/itsuriel26",
  },
];

/** X (Twitter) handle for twitter:site and twitter:creator, taken from the X profile above. */
export const X_HANDLE = `@${
  SOCIALS.find(s => s.name === "x")
    ?.url.replace(/\/+$/, "")
    .split("/")
    .pop() ?? "its_uriel26"
}`;

/** Third-party badges shown in the footer. Add one object per badge. */
export const TRUST_BADGES = [
  {
    name: "Website Launches",
    href: "https://websitelaunches.com/site/urielpapa.com",
    src: "https://websitelaunches.com/badge/urielpapa.com.svg",
    alt: "Established online - Public launch record",
    width: 255,
    height: 55,
  },
];

export const NEWSLETTER = {
  /** Provider default from the plan; confirm. */
  provider: "Buttondown",
  /** Confirm the frequency with Uriel. */
  frequency: "every two weeks",
  what: "new posts, news takes and one personal note",
};

export const CONTACT = {
  /** Draft wording; Uriel may rewrite it. */
  kindOfWork:
    "I take on a small number of projects: web apps and business systems, AI automation and chatbots, and SEO or GEO setup for websites.",
  /** Draft wording; Uriel may rewrite it. */
  replyTime: "I usually reply within a few days.",
};

/** Header navigation (ux-ui-spec.md §4). */
/** Desktop header links. "Work with me" sits after them as the one button. */
export const NAV = [
  { href: "/blog", label: "Writing" },
  { href: "/news", label: "News" },
  { href: "/projects", label: "Projects" },
  { href: "/about", label: "About" },
];

/** The phone menu lists every main page, including the ones the desktop
 * header leaves to the Writing page, About and the footer. */
export const MENU = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Writing" },
  { href: "/news", label: "News" },
  { href: "/projects", label: "Projects" },
  { href: "/topics", label: "Topics" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/** Where every "Work with me" link goes: the contact form with "Work together" picked. */
export const WORK_WITH_ME_HREF = "/contact#work";

/** The first step a "Work with me" click leads to (approved by Uriel, Nov 2026).
 * Shown under every "Work with me" button and at the top of the contact form. */
export const WORK_WITH_ME_OFFER =
  "Free 15-minute discovery call, no obligation";

/**
 * Booking for the free discovery call: the contact form shows free slots from
 * Uriel's Google Calendar and books the one picked (with a Google Meet link and
 * an invite to the visitor). Needs the GOOGLE_CALENDAR_* secrets; without them
 * the form asks for good call times instead. Hours are Philippine time.
 */
export const BOOKING = {
  timeZone: "Asia/Manila",
  /** Philippine time has no daylight saving, so a fixed offset is safe. */
  utcOffset: "+08:00",
  minutes: 15,
  /** Free time kept before and after each call. */
  bufferMinutes: 15,
  /** 0 = Sunday … 6 = Saturday. */
  days: [1, 2, 3, 4, 5],
  /** Start times run from the first hour to before the last, as [hour, minute]. */
  hours: [
    [9, 0],
    [17, 0],
  ] as [number, number][],
  /** Earliest booking, in hours from now. */
  leadHours: 12,
  /** How far ahead people can book. */
  daysAhead: 14,
};

/**
 * Business questions on the contact form when "Work together" is picked.
 * "client" is a business that needs a project; "employer" is hiring for a role.
 * The option lists can be edited freely; the form and the email follow them.
 */
export const WORK_QUESTIONS = {
  client: {
    label: "A business that needs a project",
    needs: [
      "A website or landing page",
      "Custom software or a web app",
      "AI automation or a chatbot",
      "SEO or AI search (GEO)",
      "Ads and lead generation",
      "Not sure yet",
    ],
    budgets: [
      "Under ₱50,000",
      "₱50,000 to ₱150,000",
      "₱150,000 to ₱500,000",
      "Over ₱500,000",
      "Not sure yet",
    ],
    timelines: [
      "As soon as possible",
      "In 1 to 3 months",
      "In 3 months or more",
      "Just exploring",
    ],
  },
  employer: {
    label: "An employer hiring for a role",
    types: ["Full-time", "Part-time", "Contract or freelance"],
    setups: ["Remote", "Hybrid", "On-site"],
  },
};

/**
 * Client results for the home page's results strip, next to "Work with me".
 * Only real, sourced numbers: each one links to a page that states the same
 * figure. Never add an estimate or an example figure here. Ordered like a
 * business funnel: getting leads, closing them, serving them, then money
 * saved, time saved and new revenue.
 */
export const RESULTS: {
  /** What the number is about: "Leads", "Sales", "Service", "Money", "Time" or "Revenue". */
  kind: string;
  value: string;
  /** A few words under the number on phones, where the cards sit two by two. */
  short: string;
  text: string;
  href: string;
  title: string;
}[] = [
  {
    kind: "Leads",
    value: "33 lead conversations",
    short: "in 5 days of Meta ads, about US$1 each",
    text: "in the first 5 days of Meta ads on about US$8 a day, about US$1 each",
    href: "/blog/organic-content-vs-paid-ads",
    title: "Read how a small Meta ads budget brought in 33 lead conversations",
  },
  {
    kind: "Sales",
    value: "15% to 30% close rate",
    short: "with a new sales process",
    text: "across 40 consultations, with a sales process I designed: service packages, a fit-check form and standard proposals",
    href: "/blog/closing-my-agency",
    title: "Read the story of the agency Uriel Papa built and closed",
  },
  {
    kind: "Service",
    value: "120 inquiries a month",
    short: "answered by an AI chatbot",
    text: "answered by an AI chatbot on Messenger and Instagram that also books consultations and logs leads",
    href: "/blog/n8n-messenger-instagram-chatbot",
    title: "Read how Uriel Papa built a Messenger and Instagram lead chatbot",
  },
  {
    kind: "Money",
    value: "About US$390 a month",
    short: "saved by replacing per-seat tools",
    text: "in tool fees (about ₱25,000) saved by replacing per-seat HR, CRM and project tools with one ERP, built in under 3 months",
    href: "/projects/vite-seo-erp",
    title: "Read the ERP case study and the tool fees it replaced",
  },
  {
    kind: "Time",
    value: "2 hours to 10 minutes",
    short: "for a client site SEO audit",
    text: "for a client site SEO audit, with in-house WordPress plugins that also stop posts missing SEO basics",
    href: "/projects/wordpress-seo-plugins",
    title: "Read the WordPress SEO plugin suite case study",
  },
  {
    kind: "Revenue",
    value: "150 NFC cards sold",
    short: "in the first 2 months on sale",
    text: "in the first 2 months of a new product line, sold on TikTok Shop and to business owners around Makati",
    href: "/projects/nfc-card-platform",
    title: "Read the NFC business card platform case study",
  },
];

/**
 * Short client quotes for the results strip. Empty until Uriel adds real ones
 * with the client's permission; the strip shows no quote while it is empty.
 */
export const TESTIMONIALS: {
  quote: string;
  name: string;
  role: string;
  href?: string;
}[] = [];

/** "Start here" picks in the Writing page's side rail (post slugs). */
export const START_HERE = [
  "laravel-vs-nextjs",
  "n8n-messenger-instagram-chatbot",
  "how-to-check-if-chatgpt-cites-your-site",
];

/** First paid work in the industry (résumé: marketing specialist, Feb 2023). */
export const CAREER_START = "2023-02-01";

/**
 * Proof-of-work tiles on the home page, from the résumé. `{years}` and
 * `{projects}` in a value are filled in at build time (years since
 * CAREER_START, and the number of published projects), so they stay true.
 * "50+ people" is Uriel's own count (12 Nov 2026) of everyone led, freelance
 * teams and the agency together. "8 events": the résumé's 7 seminars and
 * expos plus the AppBuildersPH hackathon; update it after each new event.
 */
export const PROOF = [
  {
    value: "{years}+ years",
    label: "in web development, software and marketing, since 2023",
    href: "/about",
    title: "Read Uriel Papa's experience on the About page",
  },
  {
    value: "{projects}+ projects",
    label: "handled, from client websites to my own products",
    href: "/projects",
    title: "See Uriel Papa's projects and case studies",
  },
  {
    value: "50+ people",
    label: "led across my career, from freelance teams to the company I built",
    href: "/about",
    title: "Read about the teams Uriel Papa has led",
  },
  {
    value: "8 events",
    label: "business expos, seminars and a hackathon attended",
    href: "/events",
    title: "See Uriel Papa's notes from seminars and events",
  },
];

/** Show drafts with a "Draft" banner (preview builds only, never production). */
export const SHOW_DRAFTS = import.meta.env.DEV || PUBLIC_SHOW_DRAFTS === true;

/**
 * Event questions on the contact form when "Speaking or event" is picked.
 * All optional; the email lists whatever is filled in.
 */
export const SPEAKING_QUESTIONS = {
  formats: ["In person", "Online", "Hybrid", "Not decided yet"],
};
