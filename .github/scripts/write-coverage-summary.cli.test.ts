import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const scriptPath = ".github/scripts/write-coverage-summary.ts";
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("write-coverage-summary CLI", () => {
  test("--help で usage を表示する", async () => {
    const result = await runCli(["--help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage:");
    expect(result.stdout).toContain("--lcov");
    expect(result.stdout).toContain("--source-root");
    expect(result.stdout).not.toContain("default:");
    expect(result.stderr).toBe("");
  });

  test("必須オプションがない場合は失敗する", async () => {
    const result = await runCli([]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Missing required option: --lcov");
    expect(result.stderr).toContain("Usage:");
  });

  test("LCOVとsource rootからcoverage summaryを出力する", async () => {
    const fixture = createCoverageFixture();
    const result = await runCli(["--lcov", fixture.lcovPath, "--source-root", fixture.sourceRoot]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("## Test Coverage");
    expect(result.stdout).toContain("50.00% (1/2)");
    expect(result.stdout).toContain("0.00% (0/1)");
    expect(result.stdout).toContain("covered.ts");
    expect(result.stdout).toContain("uncovered.ts");
    expect(result.stdout).toContain("テスト実行時に読み込まれていません");
  });
});

async function runCli(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const proc = Bun.spawn([process.execPath, scriptPath, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}

function createCoverageFixture(): { lcovPath: string; sourceRoot: string } {
  const root = mkdtempSync(join(tmpdir(), "gojibake-coverage-"));
  temporaryDirectories.push(root);

  const coverageDirectory = join(root, "coverage");
  const sourceDirectory = join(root, "src");
  mkdirSync(coverageDirectory);
  mkdirSync(sourceDirectory);

  writeFileSync(join(sourceDirectory, "covered.ts"), "export const covered = 1;\n");
  writeFileSync(join(sourceDirectory, "uncovered.ts"), "export const uncovered = 1;\n");

  const lcovPath = join(coverageDirectory, "lcov.info");
  writeFileSync(
    lcovPath,
    `TN:
SF:src/covered.ts
FNF:1
FNH:0
LF:2
LH:1
BRF:0
BRH:0
end_of_record
`,
  );

  return {
    lcovPath,
    sourceRoot: relative(process.cwd(), sourceDirectory),
  };
}
