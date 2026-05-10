import { clamp, collectNonSpaceIndices, randomInt } from "./utils.js";

/**
 * 文字列中の非空白文字から一定割合だけ選び、文字化け演出を載せる位置を返す。
 *
 * @param text 候補位置を選ぶ基準テキスト。
 * @param mutationRate 文字化け対象にする割合。`0..1` の範囲で扱い、空白を除いた文字数に掛けて対象数を決める。
 */
export function pickTargetIndices(text: string, mutationRate: number): number[] {
  const chars = [...text];
  const mutableIndices = collectNonSpaceIndices(chars);
  const normalizedRate = clamp(mutationRate, 0, 1);
  const mutationCount = Math.round(mutableIndices.length * normalizedRate);
  const pickedIndices: number[] = [];

  for (let index = 0; index < mutationCount && mutableIndices.length > 0; index += 1) {
    const pick = randomInt(mutableIndices.length);
    const charIndex = mutableIndices.splice(pick, 1)[0];
    pickedIndices.push(charIndex);
  }

  return pickedIndices;
}
