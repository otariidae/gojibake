import { GojibakeGlyphElement } from "./gojibake-glyph-element.js";
import { GojibakeGlyphFragmentElement } from "./gojibake-glyph-fragment-element.js";

export type { GojibakeGlyphLayout } from "./gojibake-glyph-element.js";
export { GojibakeGlyphElement } from "./gojibake-glyph-element.js";
export {
  DUAL_FRAGMENT_REGIONS,
  type FragmentRegion,
  GojibakeGlyphFragmentElement,
  type PlacementMode,
  QUAD_FRAGMENT_REGIONS,
} from "./gojibake-glyph-fragment-element.js";
export { GlitchRenderer } from "./renderer.js";
export type { Config, DisplayState } from "./state-factory.js";
export { GlitchStateFactory } from "./state-factory.js";
export { pickGlyphForChar } from "./utils.js";

/** カスタム要素を document に登録する。重複登録は避ける。 */
export function registerGojibakeElements(): void {
  if (!customElements.get("gojibake-glyph-fragment")) {
    customElements.define("gojibake-glyph-fragment", GojibakeGlyphFragmentElement);
  }
  if (!customElements.get("gojibake-glyph")) {
    customElements.define("gojibake-glyph", GojibakeGlyphElement);
  }
}
