import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { collectNonSpaceIndices, getScriptRanges, pickGlyphForChar } from "./utils.ts";

const JAPANESE_RANGES = [
  [0x3040, 0x309f],
  [0x30a0, 0x30ff],
  [0x4e00, 0x9fff],
  [0xac00, 0xd7a3],
];

afterEach(() => {
  mock.restore();
});

function mockRandom(value: number): void {
  spyOn(Math, "random").mockImplementation(() => value);
}

describe("utils", () => {
  describe("getScriptRanges", () => {
    it.each([
      { codePoint: 0x3040, expected: JAPANESE_RANGES, title: "ひらがな範囲の開始" },
      { codePoint: 0x309f, expected: JAPANESE_RANGES, title: "ひらがな範囲の終了" },
      { codePoint: 0x30a0, expected: JAPANESE_RANGES, title: "カタカナ範囲の開始" },
      { codePoint: 0x30ff, expected: JAPANESE_RANGES, title: "カタカナ範囲の終了" },
      { codePoint: 0x4e00, expected: JAPANESE_RANGES, title: "CJK 統合漢字範囲の開始" },
      { codePoint: 0x9fff, expected: JAPANESE_RANGES, title: "CJK 統合漢字範囲の終了" },
      { codePoint: 0xac00, expected: [[0xac00, 0xd7a3]], title: "ハングル音節範囲の開始" },
      { codePoint: 0xd7a3, expected: [[0xac00, 0xd7a3]], title: "ハングル音節範囲の終了" },
      { codePoint: 0x0041, expected: [[0x0041, 0x005a]], title: "ASCII 大文字範囲の開始" },
      { codePoint: 0x005a, expected: [[0x0041, 0x005a]], title: "ASCII 大文字範囲の終了" },
      { codePoint: 0x0061, expected: [[0x0061, 0x007a]], title: "ASCII 小文字範囲の開始" },
      { codePoint: 0x007a, expected: [[0x0061, 0x007a]], title: "ASCII 小文字範囲の終了" },
      { codePoint: 0x0030, expected: [[0x0030, 0x0039]], title: "ASCII 数字範囲の開始" },
      { codePoint: 0x0039, expected: [[0x0030, 0x0039]], title: "ASCII 数字範囲の終了" },
    ])("$title なら対応する範囲を返す", ({ codePoint, expected }) => {
      const char = String.fromCodePoint(codePoint);

      expect(getScriptRanges(char)).toEqual(expected);
    });

    it.each([
      { codePoint: 0x303f, title: "ひらがな範囲の直前" },
      { codePoint: 0x3100, title: "カタカナ範囲の直後" },
      { codePoint: 0x4dff, title: "CJK 統合漢字範囲の直前" },
      { codePoint: 0xa000, title: "CJK 統合漢字範囲の直後" },
      { codePoint: 0xabff, title: "ハングル音節範囲の直前" },
      { codePoint: 0xd7a4, title: "ハングル音節範囲の直後" },
      { codePoint: 0x0040, title: "ASCII 大文字範囲の直前" },
      { codePoint: 0x005b, title: "ASCII 大文字範囲の直後" },
      { codePoint: 0x0060, title: "ASCII 小文字範囲の直前" },
      { codePoint: 0x007b, title: "ASCII 小文字範囲の直後" },
      { codePoint: 0x002f, title: "ASCII 数字範囲の直前" },
      { codePoint: 0x003a, title: "ASCII 数字範囲の直後" },
    ])("$title なら null を返す", ({ codePoint }) => {
      const char = String.fromCodePoint(codePoint);

      expect(getScriptRanges(char)).toBeNull();
    });
  });

  describe("pickGlyphForChar", () => {
    it("対応範囲の候補から文字を選ぶ", () => {
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
