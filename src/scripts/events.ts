/**
 * Measurement events (schema-and-technical.md §5). Any element with
 * data-event="name" sends that event on click; data-event-* attributes become
 * parameters. Does nothing unless analytics is configured.
 */
type Gtag = (...args: unknown[]) => void;

document.addEventListener("click", e => {
  const el = (e.target as Element | null)?.closest<HTMLElement>("[data-event]");
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!el || !gtag) return;
  const params: Record<string, string> = { page: location.pathname };
  for (const [key, value] of Object.entries(el.dataset)) {
    if (key.startsWith("event") && key !== "event" && value) {
      params[key.slice(5).toLowerCase()] = value;
    }
  }
  gtag("event", el.dataset.event, params);
});

export function track(name: string, params: Record<string, string> = {}) {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  gtag?.("event", name, { page: location.pathname, ...params });
}
