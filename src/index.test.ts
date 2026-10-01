import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Loader, LoaderContext } from "astro/loaders";
import { gitDates } from "./index.js";

test("swaps git keywords for commit dates and leaves other fields alone", async () => {
  const repo = mkdtempSync(join(tmpdir(), "astro-git-dates-"));
  const run = (args: string[], date: string) =>
    execFileSync("git", args, {
      cwd: repo,
      env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    });
  const file = join(repo, "note.md");
  run(["init", "-q"], "");
  run(["config", "user.email", "test@example.com"], "");
  run(["config", "user.name", "Test"], "");
  writeFileSync(file, "one");
  run(["add", "."], "");
  run(["commit", "-qm", "add"], "2020-01-01T00:00:00Z");
  writeFileSync(file, "two");
  run(["commit", "-qam", "edit"], "2024-06-01T00:00:00Z");

  // A fake loader that hands one entry to parseData, like glob() does
  const inner: Loader = {
    name: "fake",
    load: async (context) => {
      const data = await context.parseData({
        id: "note",
        filePath: file,
        data: { title: "Note", date: "git Last Modified", created: "git Created" },
      });
      result = data;
    },
  };
  let result: Record<string, unknown> = {};
  const context = {
    parseData: async ({ data }: { data: unknown }) => data,
  } as unknown as LoaderContext;
  await gitDates(inner).load(context);

  expect(result.title).toBe("Note");
  expect(result.date).toEqual(new Date("2024-06-01T00:00:00Z"));
  expect(result.created).toEqual(new Date("2020-01-01T00:00:00Z"));
});
