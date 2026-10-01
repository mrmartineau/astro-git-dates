# astro-git-dates

[![npm](https://img.shields.io/npm/v/astro-git-dates)](https://www.npmjs.com/package/astro-git-dates)

Set dates in Astro content collections from git, like Eleventy's [`git Last Modified`](https://www.11ty.dev/docs/dates/#setting-a-content-date-in-front-matter).

Write this in an entry's frontmatter:

```yaml
---
title: Array methods summarised
date: git Last Modified
---
```

At build time the value becomes the date of the file's last commit. Entries with a normal date are left alone, so you can switch entries over one at a time.

## Install

```sh
pnpm add astro-git-dates
```

Needs Astro 5 or later and collections that use a [content loader](https://docs.astro.build/en/guides/content-collections/#built-in-loaders) such as `glob()`.

## Usage

Wrap the loader of each collection that should support git dates with `gitDates()`. One call per collection, so you choose which collections use it.

```ts
// src/content.config.ts (or src/content/config.ts)
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { gitDates } from "astro-git-dates";

const blog = defineCollection({
  loader: gitDates(glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" })),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    modified: z.date().optional(),
  }),
});

const notes = defineCollection({
  loader: gitDates(glob({ pattern: "**/*.md", base: "./src/content/notes" })),
  schema: z.object({
    title: z.string(),
    date: z.date().optional(),
  }),
});

export const collections = { blog, notes };
```

The schema stays `z.date()`. The swap happens before validation, so the schema only ever sees a real `Date`.

### Keywords

| Frontmatter value   | Becomes                                                  |
| ------------------- | -------------------------------------------------------- |
| `git Last Modified` | Date of the last commit that changed the file            |
| `git Created`       | Date of the commit that added the file (follows renames) |

They work in any top-level field, not just `date`:

```yaml
---
title: My post
date: git Created
modified: git Last Modified
---
```

```yaml
---
title: A code note I keep updating
date: git Last Modified
---
```

```yaml
---
title: An old post with a fixed date
date: 2022-09-21
---
```

### Helpers

The functions behind the keywords are exported too, for files outside a collection:

```ts
import { gitCreated, gitLastModified } from "astro-git-dates";

gitLastModified("src/pages/about.mdx"); // Date
gitCreated("src/pages/about.mdx"); // Date
```

## Good to know

- **CI needs the full git history.** Most CI clones only the latest commit, so every file would get the same date. On GitHub Actions:

  ```yaml
  - uses: actions/checkout@v6
    with:
      fetch-depth: 0
  ```

- **Files not committed yet get the current time.** That is the date they will most likely get when you commit them.
- **Bulk commits count.** If one commit touches every file (a reformat, a move), every `git Last Modified` entry gets that date. That is why it's opt-in per entry.
- **Moving from `type: 'content'` collections:** the `glob()` loader gives entries an `id` instead of a `slug`, and you render with `render(entry)` from `astro:content` instead of `entry.render()`. Files and folders starting with `_` are no longer skipped for you; add `'!**/_*'` and `'!**/_*/**'` to the glob pattern to keep that.
- **Other tools that read your frontmatter** (search indexers, feed scripts) see the raw `git Last Modified` text, not a date. Use the helpers above in those tools.
- **Dev cache.** Astro skips re-parsing files whose content has not changed. A date can stay out of date in `astro dev` until the file changes or you delete `node_modules/.astro`. Builds in CI start clean.

## How it works

`gitDates()` wraps the loader's `parseData`. For each entry that has a `filePath`, it replaces any top-level field set to a keyword with the date from `git log`, then hands the data on to the normal schema validation. It runs one `git log` per keyword, only for entries that use one.

## Agent skill

The repo ships a skill (`SKILL.md`) that teaches coding agents how to set this package up. Install it with [`npx skills`](https://github.com/vercel-labs/skills):

```sh
npx skills add mrmartineau/astro-git-dates
```

## Development

```sh
pnpm install
pnpm run build        # tsdown → dist/
pnpm run test         # bun test
pnpm run check        # vp check --fix (format, lint, types)
```

Releases run from the **NPM Release** workflow in the Actions tab. Versions follow [conventional commits](https://www.conventionalcommits.org/): `fix:` patch, `feat:` minor, `feat!:` major.

## License

[ISC](https://choosealicense.com/licenses/isc/) © [Zander Martineau](https://zander.wtf)
