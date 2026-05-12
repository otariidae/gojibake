export function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function pickFrom<T>(list: readonly T[]): T {
  return list[randomInt(list.length)];
}

// Unicode範囲の配列からランダムに1文字選ぶ（範囲は [始点, 終点] の包含区間）
export function pickFromRanges(ranges: readonly [number, number][]): string {
  const sizes = ranges.map(([start, end]) => end - start + 1);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  let offset = randomInt(total);
  for (let i = 0; i < ranges.length; i++) {
    if (offset < sizes[i]) {
      return String.fromCodePoint(ranges[i][0] + offset);
    }
    offset -= sizes[i];
  }
  return String.fromCodePoint(ranges[0][0]);
}

// 日本語（ひらがな・カタカナ・漢字）の変異先: CJK全域（ひらがな/カタカナ/漢字/ハングル）
// 同一スクリプト内に収めると単なるミスタイプに見えるため、意図的に広域へ化かす。
const JAPANESE_RANGES: readonly [number, number][] = [
  [0x3040, 0x309f], // ひらがな
  [0x30a0, 0x30ff], // カタカナ
  [0x4e00, 0x9fff], // CJK統合漢字
  [0xac00, 0xd7a3], // ハングル音節
];

// 文字のUnicodeスクリプトブロックに対応する範囲を返す。
// 対応ブロックがなければ null を返す（変異非対象）。
export function getScriptRanges(char: string): readonly [number, number][] | null {
  const cp = char.codePointAt(0);
  if (cp === undefined) return null;

  if (cp >= 0x3040 && cp <= 0x30ff) return JAPANESE_RANGES; // ひらがな・カタカナ
  if (cp >= 0x4e00 && cp <= 0x9fff) return JAPANESE_RANGES; // CJK統合漢字
  if (cp >= 0xac00 && cp <= 0xd7a3) return [[0xac00, 0xd7a3]]; // ハングル音節
  if (cp >= 0x0041 && cp <= 0x005a) return [[0x0041, 0x005a]]; // ASCII大文字
  if (cp >= 0x0061 && cp <= 0x007a) return [[0x0061, 0x007a]]; // ASCII小文字
  if (cp >= 0x0030 && cp <= 0x0039) return [[0x0030, 0x0039]]; // ASCII数字

  return null;
}

// 元文字のUnicodeスクリプトブロックと同じ範囲からランダムに1文字選ぶ。
// 対応ブロックがない文字（句読点など）はそのまま返す。
export function pickGlyphForChar(char: string): string {
  const ranges = getScriptRanges(char);
  if (!ranges) return char;
  return pickFromRanges(ranges);
}

export function collectNonSpaceIndices(chars: string[]): number[] {
  return chars
    .map((char, index) => ({ char, index }))
    .filter(({ char }) => char !== " " && char !== "\n")
    .map(({ index }) => index);
}
