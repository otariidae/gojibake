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
  describe("composite 対象の同値クラス", () => {
    it("候補 index が空なら空の map を返す", () => {
      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [], {
        compositeChance: 1,
        mutateChance: 1,
        quadChance: 1,
      });

      expect(composites.size).toBe(0);
    });
  });

  describe("compositeChance の境界", () => {
    it("乱数が compositeChance と同じなら composite を作らない", () => {
      mockRandomSequence([0.5]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 0.5,
        mutateChance: 1,
        quadChance: 1,
      });

      expect(composites.size).toBe(0);
    });

    it("乱数が compositeChance 未満なら composite を作る", () => {
      mockRandomSequence([
        0.49, // compositeChance
        0.9, // quadChance: dual
        0, // vertical
        0.9, // first mutate: keep source
        0, // first placement
        0.9, // second mutate: keep source
        0, // second placement
      ]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 0.5,
        mutateChance: 0,
        quadChance: 0,
      });

      expect(composites.get(0)?.kind).toBe("dual");
    });
  });

  describe("composite 形状の同値クラス", () => {
    it("quadChance 境界と同じ乱数なら dual composite を作る", () => {
      mockRandomSequence([
        0, // compositeChance
        0.5, // quadChance: boundary means dual
        0, // vertical
        0.9, // first mutate: keep source
        0, // first placement
        0.9, // second mutate: keep source
        0, // second placement
      ]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 1,
        mutateChance: 0,
        quadChance: 0.5,
      });

      expect(composites.get(0)?.kind).toBe("dual");
    });

    it("乱数が quadChance 未満なら quad composite を作る", () => {
      mockRandomSequence([
        0, // compositeChance
        0.49, // quadChance
        0.9, // top-left mutate: keep source
        0, // top-left placement
        0.9, // top-right mutate: keep source
        0, // top-right placement
        0.9, // bottom-left mutate: keep source
        0, // bottom-left placement
        0.9, // bottom-right mutate: keep source
        0, // bottom-right placement
      ]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 1,
        mutateChance: 0,
        quadChance: 0.5,
      });

      expect(composites.get(0)).toEqual({
        kind: "quad",
        fragments: [
          { char: "A", quadrant: "top-left", placement: "same-side" },
          { char: "A", quadrant: "top-right", placement: "same-side" },
          { char: "A", quadrant: "bottom-left", placement: "same-side" },
          { char: "A", quadrant: "bottom-right", placement: "same-side" },
        ],
      });
    });

    it("dual composite は縦分割を作れる", () => {
      mockRandomSequence([
        0, // compositeChance
        0.9, // quadChance: dual
        0, // vertical
        0.9, // first mutate: keep source
        0, // first placement
        0.9, // second mutate: keep source
        0, // second placement
      ]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 1,
        mutateChance: 0,
        quadChance: 0,
      });

      expect(composites.get(0)).toEqual({
        kind: "dual",
        fragments: [
          { char: "A", position: "top", placement: "same-side" },
          { char: "A", position: "bottom", placement: "same-side" },
        ],
      });
    });

    it("dual composite は横分割を作れる", () => {
      mockRandomSequence([
        0, // compositeChance
        0.9, // quadChance: dual
        0.9, // horizontal
        0.9, // first mutate: keep source
        0, // first placement
        0.9, // second mutate: keep source
        0, // second placement
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
          { char: "A", position: "right", placement: "same-side" },
        ],
      });
    });
  });

  describe("断片の文字と配置", () => {
    it("mutateChance 境界と同じ乱数なら元文字を維持する", () => {
      mockRandomSequence([
        0, // compositeChance
        0.9, // quadChance: dual
        0, // vertical
        0.5, // first mutate: boundary means keep source
        0, // first placement
        0.5, // second mutate: boundary means keep source
        0, // second placement
      ]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 1,
        mutateChance: 0.5,
        quadChance: 0,
      });

      expect(composites.get(0)).toEqual({
        kind: "dual",
        fragments: [
          { char: "A", position: "top", placement: "same-side" },
          { char: "A", position: "bottom", placement: "same-side" },
        ],
      });
    });

    it("mutateChance 未満の乱数なら置換文字を使う", () => {
      mockRandomSequence([
        0, // compositeChance
        0.9, // quadChance: dual
        0, // vertical
        0.49, // first mutate
        0, // first placement
        0.49, // second mutate
        0, // second placement
      ]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 1,
        mutateChance: 0.5,
        quadChance: 0,
      });

      expect(composites.get(0)).toEqual({
        kind: "dual",
        fragments: [
          { char: "A!", position: "top", placement: "same-side" },
          { char: "A!", position: "bottom", placement: "same-side" },
        ],
      });
    });

    it("placement の乱数が 0.5 未満なら same-side、0.5 以上なら opposite-side にする", () => {
      mockRandomSequence([
        0, // compositeChance
        0.9, // quadChance: dual
        0, // vertical
        0.9, // first mutate: keep source
        0.49, // first placement
        0.9, // second mutate: keep source
        0.5, // second placement
      ]);

      const composites = buildCompositeEffects((char) => `${char}!`, ["A"], [0], {
        compositeChance: 1,
        mutateChance: 0,
        quadChance: 0,
      });

      expect(composites.get(0)).toEqual({
        kind: "dual",
        fragments: [
          { char: "A", position: "top", placement: "same-side" },
          { char: "A", position: "bottom", placement: "opposite-side" },
        ],
      });
    });
  });
});
