import { GojibakeGlyphElement } from "./glitch/gojibake-glyph-element.js";
import { GojibakeGlyphFragmentElement } from "./glitch/gojibake-glyph-fragment-element.js";

export type { GojibakeGlyphLayout } from "./glitch/gojibake-glyph-element.js";
export { GojibakeGlyphElement } from "./glitch/gojibake-glyph-element.js";
export {
  DUAL_FRAGMENT_REGIONS,
  type FragmentRegion,
  GojibakeGlyphFragmentElement,
  type PlacementMode,
  QUAD_FRAGMENT_REGIONS,
} from "./glitch/gojibake-glyph-fragment-element.js";
export { GlitchRenderer } from "./glitch/renderer.js";
export type { Config, DisplayState } from "./glitch/state-factory.js";
export { GlitchStateFactory } from "./glitch/state-factory.js";
export { pickGlyphForChar } from "./glitch/utils.js";

/** カスタム要素を document に登録する。重複登録は避ける。 */
export function registerGojibakeElements(): void {
  if (!customElements.get("gojibake-glyph-fragment")) {
    customElements.define("gojibake-glyph-fragment", GojibakeGlyphFragmentElement);
  }
  if (!customElements.get("gojibake-glyph")) {
    customElements.define("gojibake-glyph", GojibakeGlyphElement);
  }
}
