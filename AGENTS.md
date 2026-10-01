# astro-git-dates — agent & contributor guide

`CLAUDE.md` is a symlink to this file — edit one, both change.

Sets Astro content collection dates from git. `gitDates()` wraps a content
loader (usually `glob()`), and any top-level frontmatter field set to
`git Last Modified` or `git Created` becomes that git date before the schema
validates it. Modelled on Eleventy's feature of the same name.

The repo is a single npm package (`astro-git-dates`): source in `src/`,
ESM-only output via tsdown. `pnpm-workspace.yaml` holds the vite catalog and
dependency build allowlist — don't remove it.

## Commands

Run everything from the repo root. pnpm for installs, Bun as the test runner.

```sh
pnpm install              # install deps
pnpm run build            # build the package (tsdown → dist/)
pnpm run dev              # rebuild package on change
pnpm run test             # bun test (src/*.test.ts)
pnpm run check            # vp check --fix (format + lint + typecheck, whole repo)
```

Before committing: `pnpm run check && pnpm run build && pnpm run test`.

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
- Releases prepend notes to `CHANGELOG.md` (via `@semantic-release/changelog`).

## CI & deployment (`.github/workflows/`)

- `build-test.yml` — every PR/push to main: `vp check`, package build, bun
  tests.
- `release.yml` — manual dispatch: semantic-release publishes the package to
  npm. Version comes from conventional commits (`fix:` patch, `feat:` minor,
  `feat!:`/`BREAKING CHANGE:` major). npm auth is trusted publishing (OIDC),
  so there is no `NPM_TOKEN` secret. The first version must be published by
  hand (`npm publish`), then link the repo with `npm trust github <name>
--repo <owner>/<repo> --file release.yml --allow-publish`.
- `security.yml` — Aikido safe-chain supply-chain scan on every branch.

CI installs with `--frozen-lockfile`: if you change any `package.json`, run
`pnpm install` and commit the updated `pnpm-lock.yaml`.

## Gotchas

- **Vite+ tooling**: `vp config` (root `prepare` script) sets
  `core.hooksPath` to `.vite-hooks/_`; the `pre-commit` hook runs `vp staged`,
  which runs `vp check --fix` on staged files (see `staged` in
  `vite.config.ts`). If hooks misbehave, `git config --unset core.hooksPath`
  and rerun `pnpm exec vp config`.
- **Changelog**: semantic-release prepends release notes to `CHANGELOG.md` —
  don't delete it.
- **semantic-release** commits the version bump back to `main` with
  `[skip ci]` — don't hand-edit `version` in root `package.json`.

## Agent skill

`SKILL.md` teaches coding agents to set the package up in an Astro site
(`npx skills add mrmartineau/astro-git-dates`). Keep it in step with the
README when the API or the keywords change.
