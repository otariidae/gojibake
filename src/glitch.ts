import { GlitchRenderer } from "./glitch/renderer.js";
import type { Config } from "./glitch/state-factory.js";
import { GlitchStateFactory } from "./glitch/state-factory.js";
import { pickGlyphForChar } from "./glitch/utils.js";

const config: Config = {
  // 全体のうち何割を glitch 対象候補にするか。
  mutationRate: 0.2,
  compositeProfile: {
    // glitch 候補のうち、composite を混ぜる割合。
    compositeChance: 0.8,
    // composite 断片を元文字のまま使わず、別グリフへ崩す割合。
    mutateChance: 0.5,
    // composite 化された候補のうち、4文字 2x2 合成へ振り分ける割合。
    quadChance: 0.25,
  },
};

const target = document.getElementById("glitch");

if (!(target instanceof HTMLElement)) {
  throw new Error("Glitch target elements were not found.");
}

const source = target.textContent;

const renderer = new GlitchRenderer({ target, source });
const stateFactory = new GlitchStateFactory({
  config,
  source,
  pickGlyphForChar,
});

const state = stateFactory.createDisplayState();

renderer.renderDisplayState(state);
