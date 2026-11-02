"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * Runs before first paint to stamp the saved theme on <html>, so the page never
 * flashes light before switching to dark. Injected in layout.tsx as an inline
 * script — it has to execute ahead of React hydration to do its job.
 *
 * Light is the default: an unset preference resolves to light, and the system
 * preference is deliberately not consulted. This is a light-first brand.
 */
export const THEME_INIT_SCRIPT = `
(function(){try{
  var t = localStorage.getItem('qc-theme');
  if (t !== 'dark' && t !== 'light') t = 'light';
  document.documentElement.setAttribute('data-theme', t);
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
`;

export function ThemeToggle({ className = "" }: { className?: string }) {
  // Start light to match the server-rendered markup; the real value is read
  // from the DOM after mount, which the init script has already set.
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("qc-theme", next);
    } catch {
      // Private browsing or storage disabled — the toggle still works for this
      // page view, it just won't persist. Not worth surfacing to the user.
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      // aria-pressed only once mounted, so SSR markup and first client render agree.
      aria-pressed={mounted ? isDark : undefined}
      title={isDark ? "Light mode" : "Dark mode"}
      className={`grid place-items-center w-9 h-9 rounded-md border border-divider bg-surface text-mutedFg transition-colors duration-fast hover:text-ink hover:bg-accent-100 hover:border-accent-300 ${className}`}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
