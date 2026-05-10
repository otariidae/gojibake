import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { type Config, GlitchStateFactory } from "./state-factory.ts";

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

const baseConfig: Config = {
  mutationRate: 1,
  compositeProfile: {
    compositeChance: 0,
    mutateChance: 1,
    quadChance: 0,
  },
};

describe("GlitchStateFactory", () => {
  describe("target selection と effect 生成の統合", () => {
    it("対象文字がなければ effect を作らない", () => {
      const factory = new GlitchStateFactory({
        config: baseConfig,
        source: " \n",
        pickGlyphForChar: (char) => `${char}!`,
      });

      const state = factory.createDisplayState();

      expect(state.effects.size).toBe(0);
    });

    it("composite に選ばれなかった対象へ replacement effect を作る", () => {
      const factory = new GlitchStateFactory({
        config: baseConfig,
        source: "A",
        pickGlyphForChar: (char) => `${char}!`,
      });
      mockRandomSequence([0, 0]);

      const state = factory.createDisplayState();

      expect(state.effects).toEqual(new Map([[0, { kind: "replacement", replacementChar: "A!" }]]));
    });

    it("composite に選ばれた index は replacement から除外する", () => {
      const factory = new GlitchStateFactory({
        config: {
          ...baseConfig,
          compositeProfile: {
            compositeChance: 1,
            mutateChance: 1,
            quadChance: 0,
          },
        },
        source: "A",
        pickGlyphForChar: (char) => `${char}!`,
      });
      mockRandomSequence([
        0, // target selector
        0, // compositeChance
        0.9, // quadChance: dual
        0, // vertical
        0, // first mutate
        0, // first placement
        0, // second mutate
        0, // second placement
      ]);

      const state = factory.createDisplayState();

      expect(state.effects.size).toBe(1);
      expect(state.effects.get(0)?.kind).toBe("composite");
    });
  });
});
