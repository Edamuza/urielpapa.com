/**
 * Loads Cloudflare Turnstile once per page, only when a widget was rendered
 * (the site key is set), and only after the visitor first scrolls, taps,
 * types or focuses something. Nobody can fill in a form without doing one of
 * those, so the widget is always ready in time, while visitors who only read
 * (and PageSpeed Insights) never download its script, iframe or cookies.
 */
export function loadTurnstileOnInteraction() {
  if (!document.querySelector(".cf-turnstile")) return;
  const events = ["scroll", "pointerdown", "keydown", "focusin"] as const;
  const load = () => {
    events.forEach(e => removeEventListener(e, load));
    if (document.querySelector('script[src*="challenges.cloudflare.com"]'))
      return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    document.head.appendChild(s);
  };
  events.forEach(e => addEventListener(e, load, { once: true, passive: true }));
}
