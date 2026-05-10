import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

import { pickTargetIndices } from "./target-selector.ts";

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

describe("pickTargetIndices", () => {
  describe("mutationRate の同値クラス", () => {
    it("0 未満なら対象を選ばない", () => {
      const picked = pickTargetIndices("ABC", -1);

      expect(picked).toEqual([]);
    });

    it("0 なら対象を選ばない", () => {
      const picked = pickTargetIndices("ABC", 0);

      expect(picked).toEqual([]);
    });

    it("0 より大きく 1 より小さいなら割合に応じて対象を選ぶ", () => {
      mockRandomSequence([0, 0]);

      const picked = pickTargetIndices("ABCD", 0.5);

      expect(picked).toEqual([0, 1]);
    });

    it("1 なら全候補を対象にする", () => {
      mockRandomSequence([0, 0, 0]);

      const picked = pickTargetIndices("ABC", 1);

      expect(picked).toEqual([0, 1, 2]);
    });

    it("1 を超えたら全候補を対象にする", () => {
      mockRandomSequence([0, 0, 0]);

      const picked = pickTargetIndices("ABC", 2);

      expect(picked).toEqual([0, 1, 2]);
    });
  });

  describe("候補文字の同値クラス", () => {
    it("空文字なら対象を選ばない", () => {
      const picked = pickTargetIndices("", 1);

      expect(picked).toEqual([]);
    });

    it("空白と改行だけなら対象を選ばない", () => {
      const picked = pickTargetIndices(" \n ", 1);

      expect(picked).toEqual([]);
    });

    it("空白と改行を候補から除外する", () => {
      mockRandomSequence([0, 0, 0]);

      const picked = pickTargetIndices("A B\nC", 1);

      expect(picked).toEqual([0, 2, 4]);
    });
  });

  describe("対象数の丸め境界", () => {
    it.each([
      { mutationRate: 0.124, expected: [] },
      { mutationRate: 0.125, expected: [0] },
      { mutationRate: 0.374, expected: [0] },
      { mutationRate: 0.375, expected: [0, 1] },
    ])("候補数 * mutationRate を四捨五入する: $mutationRate", ({ mutationRate, expected }) => {
      mockRandomSequence([0, 0]);

      const picked = pickTargetIndices("ABCD", mutationRate);

      expect(picked).toEqual(expected);
    });
  });

  describe("選択済み候補の扱い", () => {
    it("同じ index を重複して返さない", () => {
      mockRandomSequence([0.99, 0.99, 0.99]);

      const picked = pickTargetIndices("ABC", 1);

      expect(picked).toEqual([2, 1, 0]);
    });
  });
});
