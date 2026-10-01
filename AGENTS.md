# astro-git-dates — agent & contributor guide

`CLAUDE.md` is a symlink to this file — edit one, both change.

Sets Astro content collection dates from git. `gitDates()` wraps a content
loader (usually `glob()`), and any top-level frontmatter field set to
`git Last Modified` or `git Created` becomes that git date before the schema
validates it. Modelled on Eleventy's feature of the same name. The repo is a
pnpm monorepo with two parts:

| Part        | Where              | What it is                                                                 |
| ----------- | ------------------ | -------------------------------------------------------------------------- |
| npm package | repo root (`src/`) | The publishable package (`astro-git-dates`). ESM-only output via tsdown.   |
| Docs site   | `docs/`            | Astro site using `@mrmartineau/zui-theme`, deployed to Cloudflare Workers. |

Root `package.json` is the package itself; `docs` is a private workspace
package. `pnpm-workspace.yaml` wires them together (it also holds the vite
catalog and dependency build allowlist — don't remove those).

## Commands

Run everything from the repo root. pnpm for installs, Bun as the test runner.

```sh
pnpm install              # install all workspace deps
pnpm run build            # build the package (tsdown → dist/)
pnpm run dev              # rebuild package on change
pnpm run test             # bun test (src/*.test.ts)
pnpm run check            # vp check --fix (format + lint + typecheck, whole repo)
pnpm run docs:dev         # docs dev server (portless + astro dev)
pnpm run docs:build       # build docs site
pnpm run docs:deploy      # build + wrangler deploy (needs Cloudflare auth)
```

Before committing: `pnpm run check && pnpm run build && pnpm run test`, and
`pnpm run docs:build` if you touched `docs/`.

## The package (`src/`)

- Source in `src/index.ts`, tests co-located as `src/*.test.ts` (Bun test).
- `pnpm run build` emits ESM (`index.mjs`) and `.d.mts` types into `dist/`
  (config in `tsdown.config.ts`). ESM only: Astro configs are ESM, so a CJS
  build would never load. Only `dist/` is published (`files` field).
- `gitDates()` is typed loosely on purpose (`T extends Pick<Loader, "name">`,
  returns `T`). A site and this package can hold different Astro copies, and
  TypeScript gives up ("excessive stack depth") comparing two full `Loader`
  types. Don't tighten it to `(loader: Loader): Loader`.
- `git` runs in the file's own folder (`cwd: dirname(filePath)`), so relative
  and absolute paths both work, in any repo.
- The test builds a throwaway git repo in a temp folder with fixed commit
  dates. CI clones shallow, so never test against this repo's own history.
- TypeScript config in `tsconfig.json`; lint/format/typecheck via Vite+
  (`vp check`), configured in root `vite.config.ts`.
- Releases prepend notes to `CHANGELOG.md` (via `@semantic-release/changelog`);
  the docs site renders it at `/changelog`.

## The docs site (`docs/`)

Astro + `@mrmartineau/zui-theme` (docs theme built on ZUI). Static output,
served as assets from a Cloudflare Worker.

### Writing documentation

Pages are MDX files under `docs/src/pages/<section>/`. Navigation is
file-based — the sidebar and footer build themselves from the pages; there is
no nav config to maintain.

To add a page, create `docs/src/pages/<section>/<slug>.mdx`:

```mdx
---
layout: ../../layouts/Layout.astro
title: My page
description: One-line summary shown under the heading.
order: 2
---

import { Demo } from "@mrmartineau/zui-theme/astro";

## Usage

<Demo html={`<button class="zui-button">Click me</button>`}>
  <button class="zui-button">Click me</button>
</Demo>
```

Frontmatter conventions (from the theme):

- `title` — sidebar label, page heading, `<title>`. Required.
- `description` — sub-heading + meta description.
- `order` — position within the section (ascending).
- `sectionOrder` — on a section's `index.mdx`, orders the whole section.

New top-level folders under `src/pages/` become new sidebar sections
automatically. Useful theme components: `Demo` (live preview + tabbed source),
`CopyCode`, `TokenGrid`/`TokenRow`, `Section`, `Subtitle`.

### Site chrome

- `docs/src/site.config.ts` — title, description, version badge, social links,
  theme switcher toggles. Update `version` when the package version changes.
- `docs/src/layouts/Layout.astro` — thin wrapper over the theme's
  `DocsLayout`; the `import.meta.glob` calls must stay in this file so paths
  resolve against this project's `src/pages`.
- `docs/src/pages/index.astro` — landing page (hero + section card grids).
- `docs/astro.config.mjs` — Cloudflare adapter (`output: 'static'`), MDX
  integration, Shiki code themes.

## CI & deployment (`.github/workflows/`)

- `build-test.yml` — every PR/push to main: `vp check`, package build, docs
  build, bun tests.
- `deploy-docs.yml` — push to main touching `docs/**` (or manual dispatch):
  builds docs and deploys the `astro-git-dates-docs` Worker via
  wrangler-action. Needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo
  secrets. Wrangler config: `docs/wrangler.jsonc` (assets served from
  `docs/dist/client`).
- `release.yml` — manual dispatch: semantic-release publishes the package to
  npm. Version comes from conventional commits (`fix:` patch, `feat:` minor,
  `feat!:`/`BREAKING CHANGE:` major). Needs `NPM_TOKEN` secret.
- `security.yml` — Aikido safe-chain supply-chain scan on every branch.

CI installs with `--frozen-lockfile`: if you change any `package.json`, run
`pnpm install` and commit the updated `pnpm-lock.yaml`.

## Gotchas

- **Vite+ tooling**: `vp config` (root `prepare` script) sets
  `core.hooksPath` to `.vite-hooks/_`; the `pre-commit` hook runs `vp staged`,
  which runs `vp check --fix` on staged files (see `staged` in
  `vite.config.ts`). If hooks misbehave, `git config --unset core.hooksPath`
  and rerun `pnpm exec vp config`.
- **Changelog**: `docs/src/pages/changelog.astro` imports the root
  `CHANGELOG.md` — don't delete that file; semantic-release prepends release
  notes to it.
- **Worker name** lives in `docs/wrangler.jsonc` (`astro-git-dates-docs`).
  Renaming it deploys a new Worker instead of updating the existing one.
- **Docs build output** goes to `docs/dist/client` (the Cloudflare adapter
  splits client/server); `wrangler.jsonc` points there — don't change one
  without the other.
- **semantic-release** commits the version bump back to `main` with
  `[skip ci]` — don't hand-edit `version` in root `package.json`.

## Agent skill

`SKILL.md` teaches coding agents to set the package up in an Astro site
(`npx skills add mrmartineau/astro-git-dates`). Keep it in step with the
README and docs when the API or the keywords change.
