import { describe, expect, test } from "bun:test";
import { parseLcov } from "./lcov";

describe("parseLcov", () => {
  test("複数 record の coverage metric を読む", () => {
    const records = parseLcov(`TN:
SF:src/a.ts
FNF:2
FNH:1
LF:4
LH:3
BRF:6
BRH:5
end_of_record
TN:
SF:src/b.ts
FNF:1
FNH:1
LF:2
LH:2
BRF:0
BRH:0
end_of_record`);

    expect(records).toEqual([
      {
        file: "src/a.ts",
        lines: { hit: 3, found: 4 },
        functions: { hit: 1, found: 2 },
        branches: { hit: 5, found: 6 },
      },
      {
        file: "src/b.ts",
        lines: { hit: 2, found: 2 },
        functions: { hit: 1, found: 1 },
        branches: { hit: 0, found: 0 },
      },
    ]);
  });

  test("branch metric がない record は 0 として扱う", () => {
    const [record] = parseLcov(`TN:
SF:src/no-branch.ts
FNF:1
FNH:1
LF:1
LH:1
end_of_record`);

    expect(record?.branches).toEqual({ hit: 0, found: 0 });
  });

  test("source file がない record は例外にする", () => {
    expect(() =>
      parseLcov(`TN:
LF:1
LH:1
end_of_record`),
    ).toThrow("Coverage source file was not found");
  });
});
