/**
 * The seven topic hubs (content-network.md §2). The id is the URL slug under
 * /topics and the value of `hub` in every post's frontmatter. Intro passages
 * and "Start here" picks live in src/content/hubs/ (editable in Keystatic).
 */
export const HUBS = [
  { id: "ai", name: "AI, in Depth", short: "AI" },
  { id: "automation", name: "Automation", short: "Automation" },
  {
    id: "tech-and-business",
    name: "Technology and Business",
    short: "Tech & Business",
  },
  { id: "seo-geo-aeo", name: "SEO, GEO and AEO", short: "SEO, GEO, AEO" },
  { id: "tech-stacks", name: "Tech Stacks", short: "Tech Stacks" },
  { id: "marketing", name: "Marketing", short: "Marketing" },
  {
    id: "founder-journey",
    name: "The Founder's Journey",
    short: "Founder's Journey",
  },
] as const;

export type HubId = (typeof HUBS)[number]["id"];

export const HUB_IDS = HUBS.map(h => h.id) as [HubId, ...HubId[]];

export const hubName = (id: string) => HUBS.find(h => h.id === id)?.name ?? id;

/** Post frames (formats). news-take routes to /news, event-note to /events. */
export const FRAMES = [
  { id: "guide", label: "Guide" },
  { id: "comparison", label: "Comparison" },
  { id: "best-of", label: "Best-of" },
  { id: "why", label: "Why" },
  { id: "explainer", label: "Explainer" },
  { id: "build-story", label: "Build story" },
  { id: "news-take", label: "News take" },
  { id: "event-note", label: "Event note" },
] as const;

export type FrameId = (typeof FRAMES)[number]["id"];

export const FRAME_IDS = FRAMES.map(f => f.id) as [FrameId, ...FrameId[]];

export const frameLabel = (id: string) =>
  FRAMES.find(f => f.id === id)?.label ?? id;

export const STACK_GROUPS = [
  { id: "languages-frameworks", label: "Languages and frameworks" },
  { id: "databases", label: "Databases" },
  { id: "ai", label: "AI models, harnesses and tools" },
  { id: "automation", label: "Automation" },
  { id: "seo-marketing", label: "SEO and marketing" },
  { id: "infrastructure", label: "Infrastructure and tools" },
] as const;

export type StackGroupId = (typeof STACK_GROUPS)[number]["id"];

export const STACK_GROUP_IDS = STACK_GROUPS.map(g => g.id) as [
  StackGroupId,
  ...StackGroupId[],
];

export const SYNDICATION_NETWORKS = [
  "linkedin",
  "facebook",
  "instagram",
  "threads",
  "x",
  "reddit",
  "devto",
] as const;
