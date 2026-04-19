import { GojibakeGlyphElement } from "./glitch/gojibake-glyph-element.js";
import { GojibakeGlyphFragmentElement } from "./glitch/gojibake-glyph-fragment-element.js";
import { pickFromRanges } from "./glitch/utils.js";

customElements.define("gojibake-glyph-fragment", GojibakeGlyphFragmentElement);
customElements.define("gojibake-glyph", GojibakeGlyphElement);

// CJK統合漢字の範囲（U+4E00〜U+9FFF）
const CJK_RANGES: readonly [number, number][] = [[0x4e00, 0x9fff]];

function pickCjkChar(): string {
  return pickFromRanges(CJK_RANGES);
}

function randomPlacement(): "same-side" | "opposite-side" {
  return Math.random() < 0.5 ? "same-side" : "opposite-side";
}

function createSingleGlyph(): GojibakeGlyphElement {
  const el = document.createElement("gojibake-glyph") as GojibakeGlyphElement;
  const isQuad = Math.random() < 0.5;

  if (isQuad) {
    const quadrants = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
    for (const quadrant of quadrants) {
      const fragment = document.createElement(
        "gojibake-glyph-fragment",
      ) as GojibakeGlyphFragmentElement;
      fragment.textContent = pickCjkChar();
      fragment.region = quadrant;
      fragment.placement = randomPlacement();
      el.appendChild(fragment);
    }
  } else {
    const [firstRegion, secondRegion] =
      Math.random() < 0.5 ? (["top", "bottom"] as const) : (["left", "right"] as const);
    for (const pos of [firstRegion, secondRegion]) {
      const fragment = document.createElement(
        "gojibake-glyph-fragment",
      ) as GojibakeGlyphFragmentElement;
      fragment.textContent = pickCjkChar();
      fragment.region = pos;
      fragment.placement = randomPlacement();
      el.appendChild(fragment);
    }
  }

  return el;
}

const target = document.getElementById("single-glyph");

if (!(target instanceof HTMLElement)) {
  throw new Error("Single glyph target element was not found.");
}

target.appendChild(createSingleGlyph());
