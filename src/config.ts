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
    "Uriel Papa is a technical founder in Metro Manila writing about AI, automation, SEO, GEO and AEO, tech stacks, marketing and the founder's journey.",
  lang: "en",
  locale: "en_PH",
  timezone: "Asia/Manila",
  /** Shown in the header, About, author box and Person schema. Confirm. */
  jobTitle: "Technical Founder",
  location: "Metro Manila, Philippines",
  email: "work@urielpapa.com",
  /** One-line bio used in the footer and author box. */
  bio: "Technical founder in Metro Manila. I share what I've learned building and running a company: AI, automation, tech stacks, SEO, GEO and AEO, marketing and how technology affects business, plus tech news.",
  /**
   * Public URL of the 480×480 photo, used in the Person schema. Avatar shows an
   * optimized copy (src/assets/images/uriel-papa.jpg); set null for the monogram.
   */
  photo: "/images/uriel-papa.jpg" as string | null,
} as const;

/** The Macro statement from content-network.md §1, reused on Home, About and llms.txt. */
export const MACRO =
  "urielpapa.com is where Uriel Papa, a technical founder from Metro Manila, shares the lessons from founding a company and building with technology: how AI and large language models really work, the automations behind real projects, how technology affects business, the economy and society, how search is evolving with SEO, GEO and AEO, what's new in tech stacks, the basics of marketing, and the journey of a founder. It also carries takes on the latest tech news and notes from seminars and trainings. It's written for anyone interested in the same things.";

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
export const NAV = [
  { href: "/blog", label: "Writing" },
  { href: "/news", label: "News" },
  { href: "/topics", label: "Topics" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];

/** Show drafts with a "Draft" banner (preview builds only, never production). */
export const SHOW_DRAFTS = import.meta.env.DEV || PUBLIC_SHOW_DRAFTS === true;
