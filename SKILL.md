---
name: astro-git-dates
description: "Set dates in Astro content collections from git with the astro-git-dates package: frontmatter like `date: git Last Modified` or `date: git Created` becomes the file's commit date at build time, like Eleventy's git Last Modified. Use when asked to use git dates, last-modified dates, or 'updated' dates from git in an Astro site, to port Eleventy's git Last Modified to Astro, or to work with an existing astro-git-dates setup."
---

# astro-git-dates

`gitDates()` wraps an Astro content loader. Any top-level frontmatter field set
to one of two keywords becomes a git date before the collection schema
validates it:

| Frontmatter value   | Becomes                                                  |
| ------------------- | -------------------------------------------------------- |
| `git Last Modified` | Date of the last commit that changed the file            |
| `git Created`       | Date of the commit that added the file (follows renames) |

It is opt-in per entry. Fields with any other value do not change.

## Setup

1. Install: `pnpm add astro-git-dates` (or the project's package manager).
2. Make sure each collection that needs it uses a content loader, normally
   `glob()` from `astro/loaders`. Old `type: 'content'` collections cannot use
   it: they do not give a file path. See "Moving from type: 'content'" below.
3. Wrap the loader:

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
   ```

   Keep the schema as `z.date()`. Do not add the keyword to the schema: the
   swap happens before validation.

4. Make CI fetch the full git history, or every file gets the same date. On
   GitHub Actions, add `fetch-depth: 0` under `with:` on `actions/checkout`.
   Check every workflow that builds the site.
5. Set the keyword in the entries that should use it:

   ```yaml
   date: git Last Modified
   ```

   Do not change entries in bulk unless the user asks. Only entries that use a
   keyword get git dates.

## Moving from type: 'content'

When a collection moves to `glob()`, fix every consumer of it:

- `entry.slug` → `entry.id`. A frontmatter `slug` still sets the `id`. Search
  `.astro`, `.ts` **and `.js`** files (RSS feeds are often `.js`, so the type
  check does not catch them). Look for destructuring too: `const { slug } = Astro.props`.
- `entry.render()` → `render(entry)`, imported from `astro:content`.
- `entry.body` is `string | undefined` → `entry.body ?? ""`.
- Routes shared with collections that still use `type: 'content'` need both:
  `'slug' in entry ? entry.slug : entry.id`.
- `_` files and folders are no longer skipped. Add
  `"!**/_*", "!**/_*/**"` to the glob pattern to keep drafts out.

Check the move: build before and after, then compare the list of built pages
(`find dist -name index.html | sort`) and the feed links. They must match.

## Helpers

For tools that read the markdown files themselves (search indexers, feed
scripts), which see the raw keyword text:

```ts
import { GIT_LAST_MODIFIED, GIT_CREATED, gitLastModified, gitCreated } from "astro-git-dates";

const date = data.date === GIT_LAST_MODIFIED ? gitLastModified(file) : data.date;
```

Both helpers return a `Date`, accept relative or absolute paths, and return the
current time for a file with no commits. They use Node built-ins: build time
only, never in a Worker or client bundle.

## Troubleshooting

| Symptom                                                   | Cause                                                                                                           |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Every entry has the same date in production               | CI clone is shallow. Add `fetch-depth: 0`.                                                                      |
| Many entries share one old date                           | One bulk commit (move, reformat) touched them all. Expected; use a fixed date for those entries.                |
| Schema error: expected date, received string              | The collection does not use `gitDates()`, or uses `type: 'content'`.                                            |
| Date in `astro dev` does not update after a commit        | Astro's data store cache. Change the file, or delete `node_modules/.astro`.                                     |
| Type error "excessive stack depth comparing types Loader" | Two Astro copies (often a `link:` install). Update `astro-git-dates`; current versions are typed to avoid this. |
| Search or feeds show "git Last M" as a date               | That tool parses frontmatter itself. Use the helpers above.                                                     |
