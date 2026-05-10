import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { type CoverageMetric, parseLcov } from "./lcov";

type CliOptions = {
  lcovPath: string;
  sourceRoot: string;
};

if (import.meta.main) {
  main(process.argv.slice(2));
}

function parseCliArgs(args: string[]): CliOptions | null {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    options: {
      help: {
        type: "boolean",
        short: "h",
      },
      lcov: {
        type: "string",
      },
      "source-root": {
        type: "string",
      },
    },
    strict: true,
  });

  if (values.help) {
    return null;
  }

  if (!values.lcov) {
    throw new Error("Missing required option: --lcov");
  }

  if (!values["source-root"]) {
    throw new Error("Missing required option: --source-root");
  }

  return {
    lcovPath: values.lcov,
    sourceRoot: values["source-root"],
  };
}

function main(args: string[]): void {
  try {
    const options = parseCliArgs(args);

    if (!options) {
      console.log(usage());
      return;
    }

    console.log(buildCoverageSummary(options));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    console.error(usage());
    process.exitCode = 1;
  }
}

function buildCoverageSummary(options: CliOptions): string {
  const { lcovPath, sourceRoot } = options;
  const workspaceRoot = process.cwd();
  const packageRoot = resolve(dirname(lcovPath), "..");
  const sourceRootAbsolutePath = resolve(workspaceRoot, sourceRoot);
  const toWorkspacePath = (sourceFile: string): string => {
    const absolutePath = isAbsolute(sourceFile) ? sourceFile : resolve(packageRoot, sourceFile);
    return relative(workspaceRoot, absolutePath);
  };

  const lcov = readFileSync(lcovPath, "utf8");
  const records = parseLcov(lcov)
    .map((record) => ({
      ...record,
      file: toWorkspacePath(record.file),
    }))
    .filter((record) => record.file.startsWith(`${sourceRoot}/`));

  if (records.length === 0) {
    throw new Error(`Coverage record for ${sourceRoot} was not found in ${lcovPath}`);
  }

  const totals = records.reduce(
    (summary, record) => ({
      lines: addMetric(summary.lines, record.lines),
      functions: addMetric(summary.functions, record.functions),
      branches: addMetric(summary.branches, record.branches),
    }),
    {
      lines: { hit: 0, found: 0 },
      functions: { hit: 0, found: 0 },
      branches: { hit: 0, found: 0 },
    },
  );

  const rows = records
    .toSorted((left, right) => metricPercent(left.lines) - metricPercent(right.lines))
    .map((record) =>
      formatRow([
        `\`${record.file}\``,
        formatMetric(record.lines),
        formatMetric(record.functions),
        formatMetric(record.branches),
      ]),
    );
  const coveredFiles = new Set(records.map((record) => record.file));
  const uncollectedFiles = collectSourceFiles(sourceRootAbsolutePath)
    .map((file) => relative(workspaceRoot, file))
    .filter((file) => !coveredFiles.has(file));

  return [
    "## Test Coverage",
    "",
    `Source: \`${lcovPath}\``,
    `Scope: \`${sourceRoot}\``,
    "",
    "Bun の coverage は、テスト実行中に読み込まれたファイルだけを収集します。テストから読み込まれていない source file は、未収集として下に表示します。",
    "",
    "| Scope | Lines | Functions | Branches |",
    "| --- | ---: | ---: | ---: |",
    formatRow([
      "**Total**",
      formatMetric(totals.lines),
      formatMetric(totals.functions),
      formatMetric(totals.branches),
    ]),
    ...rows,
    "",
    "### Coverage に収集されていない source files",
    "",
    ...formatUncollectedFiles(uncollectedFiles),
    "",
  ].join("\n");
}

function usage(): string {
  return [
    "Usage: bun .github/scripts/write-coverage-summary.ts [options]",
    "",
    "Options:",
    "  --lcov <path>         LCOV file path",
    "  --source-root <path>  Source root to summarize",
    "  -h, --help           Show this help",
  ].join("\n");
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const file = join(directory, entry);

      if (statSync(file).isDirectory()) {
        return collectSourceFiles(file);
      }

      return file;
    })
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && !file.endsWith(".d.ts"))
    .toSorted();
}

function addMetric(left: CoverageMetric, right: CoverageMetric): CoverageMetric {
  return {
    hit: left.hit + right.hit,
    found: left.found + right.found,
  };
}

function formatRow(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function formatUncollectedFiles(files: string[]): string[] {
  if (files.length === 0) {
    return ["すべての source file が coverage に収集されています。"];
  }

  return [
    "| File | Status |",
    "| --- | --- |",
    ...files.map((file) => formatRow([`\`${file}\``, "テスト実行時に読み込まれていません"])),
  ];
}

function formatMetric(metric: CoverageMetric): string {
  if (metric.found === 0) {
    return "n/a";
  }

  return `${metricPercent(metric).toFixed(2)}% (${metric.hit}/${metric.found})`;
}

function metricPercent(metric: CoverageMetric): number {
  if (metric.found === 0) {
    return 100;
  }

  return (metric.hit / metric.found) * 100;
}
