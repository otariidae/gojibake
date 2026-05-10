export type CoverageMetric = {
  hit: number;
  found: number;
};

export type LcovRecord = {
  file: string;
  lines: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
};

export function parseLcov(lcov: string): LcovRecord[] {
  return lcov
    .split("end_of_record")
    .map((record) => record.trim())
    .filter(Boolean)
    .map(parseRecord);
}

function parseRecord(record: string): LcovRecord {
  const lines = record.split("\n");
  const sourceFile = lines.find((line) => line.startsWith("SF:"))?.slice(3);

  if (!sourceFile) {
    throw new Error(`Coverage source file was not found in record:\n${record}`);
  }

  return {
    file: sourceFile,
    lines: readMetric(lines, "LH:", "LF:"),
    functions: readMetric(lines, "FNH:", "FNF:"),
    branches: readMetric(lines, "BRH:", "BRF:"),
  };
}

function readMetric(lines: string[], hitPrefix: string, foundPrefix: string): CoverageMetric {
  return {
    hit: readNumber(lines, hitPrefix),
    found: readNumber(lines, foundPrefix),
  };
}

function readNumber(lines: string[], prefix: string): number {
  const value = lines.find((line) => line.startsWith(prefix))?.slice(prefix.length);
  return value === undefined ? 0 : Number.parseInt(value, 10);
}
