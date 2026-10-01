import { execFileSync } from "node:child_process";
import { basename, dirname } from "node:path";
import type { Loader, LoaderContext } from "astro/loaders";

/** Frontmatter value that becomes the date of the file's last commit. */
export const GIT_LAST_MODIFIED = "git Last Modified";
/** Frontmatter value that becomes the date of the commit that added the file. */
export const GIT_CREATED = "git Created";

// Runs in the file's own folder, so it works for any path and any repo
function git(args: string[], filePath: string): string {
  return execFileSync("git", [...args, "--", basename(filePath)], {
    cwd: dirname(filePath),
    encoding: "utf8",
  }).trim();
}

/** Date of the file's last commit. A file not committed yet is being edited now. */
export function gitLastModified(filePath: string): Date {
  const iso = git(["log", "-1", "--format=%cI"], filePath);
  return iso ? new Date(iso) : new Date();
}

/** Date of the commit that added the file, following renames. */
export function gitCreated(filePath: string): Date {
  // Oldest commit is listed last
  const iso = git(["log", "--diff-filter=A", "--follow", "--format=%cI"], filePath)
    .split("\n")
    .at(-1);
  return iso ? new Date(iso) : new Date();
}

const resolvers: Record<string, (filePath: string) => Date> = {
  [GIT_LAST_MODIFIED]: gitLastModified,
  [GIT_CREATED]: gitCreated,
};

/**
 * Wrap a content loader (usually `glob()`) so any top-level frontmatter field
 * set to `git Last Modified` or `git Created` is replaced with that git date
 * before the collection schema validates it.
 */
export function gitDates<T extends Pick<Loader, "name">>(loader: T): T {
  // Typed loosely on purpose: the site's copy of Astro and ours may differ, and
  // TypeScript gives up comparing two copies of the full Loader type
  const inner = loader as unknown as Loader;
  return {
    ...loader,
    load: (context: LoaderContext) =>
      inner.load({
        ...context,
        parseData: (props) => {
          const data = props.data as Record<string, unknown>;
          const { filePath } = props;
          if (filePath) {
            for (const [key, value] of Object.entries(data)) {
              const resolve = typeof value === "string" ? resolvers[value] : undefined;
              if (resolve) data[key] = resolve(filePath);
            }
          }
          return context.parseData(props);
        },
      }),
  } as T;
}
