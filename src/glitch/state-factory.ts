import type { CompositeMap, CompositeProfile } from "./composite-effect-builder.js";
import { buildCompositeEffects } from "./composite-effect-builder.js";
import type { CharEffectMap } from "./replacement-effect-builder.js";
import { buildReplacementEffects } from "./replacement-effect-builder.js";
import { pickTargetIndices } from "./target-selector.js";

export type Config = {
  mutationRate: number;
  compositeProfile: CompositeProfile;
};

export type DisplayState = {
  effects: CharEffectMap;
};

type CompositeProfileOverrides = Partial<CompositeProfile>;

export class GlitchStateFactory {
  private readonly config: Config;
  private readonly source: string;
  private readonly pickGlyphForChar: (char: string) => string;

  public constructor({
    config,
    source,
    pickGlyphForChar,
  }: {
    config: Config;
    source: string;
    pickGlyphForChar: (char: string) => string;
  }) {
    this.config = config;
    this.source = source;
    this.pickGlyphForChar = pickGlyphForChar;
  }

  public createDisplayState(): DisplayState {
    const targetIndices = pickTargetIndices(this.source, this.config.mutationRate);
    const compositeMap = this.createCompositeMap(targetIndices, this.config.compositeProfile);
    const replacementTargetIndices = targetIndices.filter((index) => !compositeMap.has(index));
    const effects = buildReplacementEffects(
      this.pickGlyphForChar,
      [...this.source],
      replacementTargetIndices,
    );

    for (const index of targetIndices) {
      const composite = compositeMap.get(index);

      if (!composite) {
        continue;
      }

      effects.set(index, { kind: "composite", composite });
    }

    return { effects };
  }

  private createCompositeMap(
    targetIndices: number[],
    compositeProfile?: CompositeProfileOverrides,
  ): CompositeMap {
    if (compositeProfile === undefined) {
      return new Map();
    }

    const resolvedProfile: CompositeProfile = {
      ...this.config.compositeProfile,
      ...compositeProfile,
    };

    return buildCompositeEffects(
      this.pickGlyphForChar,
      [...this.source],
      targetIndices,
      resolvedProfile,
    );
  }
}
