import type { SiteConfig } from "@mrmartineau/zui-theme/nav";

/**
 * Global configuration for your docs site. This drives the header, footer,
 * page titles, and theme controls. Tweak it to match your package.
 */
export const site: SiteConfig = {
  author: "Zander Martineau",
  authorHref: "https://zander.wtf",
  description: "Set Astro content collection dates from git, like Eleventy's git Last Modified.",
  social: [
    {
      ariaLabel: "View on GitHub",
      href: "https://github.com/mrmartineau/astro-git-dates",
      icon: "github-logo",
      label: "Repo",
    },
    {
      ariaLabel: "View on npm",
      href: "https://www.npmjs.com/package/astro-git-dates",
      icon: "package",
    },
  ],
  title: "astro-git-dates",
  version: "0.0.0",
  versionHref: "/changelog",
  // Floating theme builder + header colour switcher are on by default.
  // Set to `false` to hide them:
  // themeSwitcher: false,
  // miniThemeSwitcher: false,
};
