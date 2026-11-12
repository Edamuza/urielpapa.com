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
 */
export const PROOF = [
  {
    value: "{years}+ years",
    label: "building websites, software and marketing, since 2023",
    href: "/about",
    title: "Read Uriel Papa's experience on the About page",
  },
  {
    value: "{projects} projects",
    label: "built and shipped, each with a case study",
    href: "/projects",
    title: "See all of Uriel Papa's projects and case studies",
  },
  {
    value: "22 people",
    label: "on the team I led at the agency I founded at 21",
    href: "/blog/closing-my-agency",
    title: "Read Uriel Papa's notes on founding and closing an agency",
  },
  {
    value: "33 leads",
    label: "in 5 days from Meta ads, at about US$1 each",
    href: "/blog/organic-content-vs-paid-ads",
    title: "Read how the Meta ads compared with organic content",
  },
  {
    value: "115 pages",
    label: "in the ERP I led and co-developed in under 3 months",
    href: "/projects/vite-seo-erp",
    title: "See the case study: the VITE SEO ERP",
  },
  {
    value: "5,241",
    label: "automated tests on that ERP",
    href: "/projects/vite-seo-erp",
    title: "See the case study: 5,241 automated tests on the ERP",
  },
  {
    value: "5 plugins",
    label: "in my WordPress SEO suite, about 11,700 lines",
    href: "/projects/wordpress-seo-plugins",
    title: "See the case study: the WordPress SEO plugin suite",
  },
  {
    value: "13 agents",
    label: "in the job and client CRM I built for myself",
    href: "/projects/job-client-crm",
    title: "See the case study: the job and client CRM",
  },
];

/** Show drafts with a "Draft" banner (preview builds only, never production). */
export const SHOW_DRAFTS = import.meta.env.DEV || PUBLIC_SHOW_DRAFTS === true;
