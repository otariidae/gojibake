import type { CompositeEntry } from "./composite-effect-builder.js";

export type CharEffectState =
  | { kind: "replacement"; replacementChar: string }
  | { kind: "composite"; composite: CompositeEntry };

export type CharEffectMap = Map<number, CharEffectState>;

export function buildReplacementEffects(
  pickGlyphForChar: (char: string) => string,
  chars: string[],
  targetIndices: number[],
): CharEffectMap {
  const effects: CharEffectMap = new Map();

  for (const index of targetIndices) {
    effects.set(index, {
      kind: "replacement",
      replacementChar: pickGlyphForChar(chars[index]),
    });
  }

  return effects;
}
