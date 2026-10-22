const THEME_KEY = "theme";

type Theme = "light" | "dark";

let theme: Theme =
  ((window as unknown as { __theme?: { value: Theme } }).__theme
    ?.value as Theme) ??
  (window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");

function reflect(): void {
  document.documentElement.setAttribute("data-theme", theme);
  // The button's label stays "Toggle dark theme"; aria-pressed carries the state.
  document
    .querySelector("#theme-btn")
    ?.setAttribute("aria-pressed", String(theme === "dark"));
}

function persist(): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked; the theme still applies for this page view.
  }
  reflect();
}

reflect();

document.querySelector("#theme-btn")?.addEventListener("click", () => {
  theme = theme === "light" ? "dark" : "light";
  persist();
});

// Follow OS-level changes unless the reader picked a theme.
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches }) => {
    let stored: string | null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      stored = null;
    }
    if (stored) return;
    theme = matches ? "dark" : "light";
    reflect();
  });
