import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { collectNonSpaceIndices, getScriptRanges, pickGlyphForChar } from "./utils.ts";

afterEach(() => {
  mock.restore();
});

function mockRandom(value: number): void {
  spyOn(Math, "random").mockImplementation(() => value);
}

describe("utils", () => {
  describe("getScriptRanges", () => {
    it.each([
      {
        char: "あ",
        expected: [
          [0x3040, 0x309f],
          [0x30a0, 0x30ff],
          [0x4e00, 0x9fff],
          [0xac00, 0xd7a3],
        ],
      },
      {
        char: "漢",
        expected: [
          [0x3040, 0x309f],
          [0x30a0, 0x30ff],
          [0x4e00, 0x9fff],
          [0xac00, 0xd7a3],
        ],
      },
      { char: "한", expected: [[0xac00, 0xd7a3]] },
      { char: "A", expected: [[0x0041, 0x005a]] },
      { char: "a", expected: [[0x0061, 0x007a]] },
      { char: "1", expected: [[0x0030, 0x0039]] },
    ])("$char のスクリプト範囲を返す", ({ char, expected }) => {
      expect(getScriptRanges(char)).toEqual(expected);
    });

    it("非対応文字なら null を返す", () => {
      expect(getScriptRanges("。")).toBeNull();
    });
  });

  describe("pickGlyphForChar", () => {
    it("対応範囲からランダムに文字を選ぶ", () => {
      mockRandom(0);

      const glyph = pickGlyphForChar("A");

      expect(glyph).toBe("A");
    });

    it("非対応文字はそのまま返す", () => {
      expect(pickGlyphForChar("。")).toBe("。");
    });
  });

  describe("collectNonSpaceIndices", () => {
    it("半角空白と改行を除いた index を返す", () => {
      expect(collectNonSpaceIndices(["A", " ", "B", "\n", "C"])).toEqual([0, 2, 4]);
    });
  });
});
