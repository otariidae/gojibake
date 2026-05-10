import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { buildCompositeEffects } from "./composite-effect-builder.ts";

afterEach(() => {
  mock.restore();
});

function mockRandomSequence(values: number[]): void {
  let index = 0;

  spyOn(Math, "random").mockImplementation(() => {
    const value = values[index];
    index += 1;
    return value ?? 0;
  });
}

describe("buildCompositeEffects", () => {
  it("candidateIndices が空なら空の map を返す", () => {
    const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [], {
      compositeChance: 1,
      mutateChance: 1,
      quadChance: 1,
    });

    expect(composites.size).toBe(0);
  });

  it("compositeChance が 0 なら composite を作らない", () => {
    mockRandomSequence([0]);

    const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
      compositeChance: 0,
      mutateChance: 1,
      quadChance: 1,
    });

    expect(composites.size).toBe(0);
  });

  it("dual composite を縦分割で作る", () => {
    mockRandomSequence([
      0, // compositeChance
      0.9, // quadChance: dual
      0, // vertical
      0, // first mutate
      0, // first placement
      0, // second mutate
      0.9, // second placement
    ]);

    const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
      compositeChance: 1,
      mutateChance: 1,
      quadChance: 0,
    });

    expect(composites.get(0)).toEqual({
      kind: "dual",
      fragments: [
        { char: "A!", position: "top", placement: "same-side" },
        { char: "A!", position: "bottom", placement: "opposite-side" },
      ],
    });
  });

  it("dual composite を横分割で作る", () => {
    mockRandomSequence([
      0, // compositeChance
      0.9, // quadChance: dual
      0.9, // horizontal
      0.9, // first mutate: keep source
      0, // first placement
      0.9, // second mutate: keep source
      0.9, // second placement
    ]);

    const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
      compositeChance: 1,
      mutateChance: 0,
      quadChance: 0,
    });

    expect(composites.get(0)).toEqual({
      kind: "dual",
      fragments: [
        { char: "A", position: "left", placement: "same-side" },
        { char: "A", position: "right", placement: "opposite-side" },
      ],
    });
  });

  it("quad composite を 4 象限で作る", () => {
    mockRandomSequence([
      0, // compositeChance
      0, // quadChance
      0, // top-left mutate
      0, // top-left placement
      0, // top-right mutate
      0.9, // top-right placement
      0, // bottom-left mutate
      0, // bottom-left placement
      0, // bottom-right mutate
      0.9, // bottom-right placement
    ]);

    const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
      compositeChance: 1,
      mutateChance: 1,
      quadChance: 1,
    });

    expect(composites.get(0)).toEqual({
      kind: "quad",
      fragments: [
        { char: "A!", quadrant: "top-left", placement: "same-side" },
        { char: "A!", quadrant: "top-right", placement: "opposite-side" },
        { char: "A!", quadrant: "bottom-left", placement: "same-side" },
        { char: "A!", quadrant: "bottom-right", placement: "opposite-side" },
      ],
    });
  });
});
