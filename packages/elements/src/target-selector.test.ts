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
  it("mutationRate が 0 未満なら対象を選ばない", () => {
    const picked = pickTargetIndices("ABC", -1);

    expect(picked).toEqual([]);
  });

  it("mutationRate が 1 を超えたら全候補を対象にする", () => {
    mockRandomSequence([0, 0, 0]);

    const picked = pickTargetIndices("ABC", 2);

    expect(picked).toEqual([0, 1, 2]);
  });

  it("空白と改行を候補から除外する", () => {
    mockRandomSequence([0, 0, 0]);

    const picked = pickTargetIndices("A B\nC", 1);

    expect(picked).toEqual([0, 2, 4]);
  });

  it("Math.round で対象数を決める", () => {
    mockRandomSequence([0, 0]);

    const picked = pickTargetIndices("ABCD", 0.38);

    expect(picked).toEqual([0, 1]);
  });

  it("同じ index を重複して返さない", () => {
    mockRandomSequence([0.99, 0.99, 0.99]);

    const picked = pickTargetIndices("ABC", 1);

    expect(picked).toEqual([2, 1, 0]);
  });
});
