import { describe, expect, it } from "bun:test";

import { buildReplacementEffects } from "./replacement-effect-builder.ts";

describe("buildReplacementEffects", () => {
  it("指定された index に replacement effect を作る", () => {
    const effects = buildReplacementEffects((char) => `${char}!`, ["A", "B", "C"], [0, 2]);

    expect(effects).toEqual(
      new Map([
        [0, { kind: "replacement", replacementChar: "A!" }],
        [2, { kind: "replacement", replacementChar: "C!" }],
      ]),
    );
  });

  it("対象 index が空なら空の map を返す", () => {
    const effects = buildReplacementEffects((char) => `${char}!`, ["A"], []);

    expect(effects.size).toBe(0);
  });
});
