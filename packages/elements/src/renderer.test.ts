import { describe, expect, it } from "bun:test";

import { GojibakeGlyphElement } from "./gojibake-glyph-element.ts";
import { GojibakeGlyphFragmentElement } from "./gojibake-glyph-fragment-element.ts";
import { GlitchRenderer } from "./renderer.ts";
import type { DisplayState } from "./state-factory.ts";

if (!customElements.get("gojibake-glyph-fragment")) {
  customElements.define("gojibake-glyph-fragment", GojibakeGlyphFragmentElement);
}

if (!customElements.get("gojibake-glyph")) {
  customElements.define("gojibake-glyph", GojibakeGlyphElement);
}

function render(source: string, state: DisplayState): HTMLElement {
  const target = document.createElement("div");
  const renderer = new GlitchRenderer({ source, target });

  renderer.renderDisplayState(state);

  return target;
}

describe("GlitchRenderer", () => {
  it("通常文字を .char と .char__base で描画する", () => {
    const target = render("AB", { effects: new Map() });

    expect(target.children).toHaveLength(2);
    expect(target.querySelectorAll(".char")).toHaveLength(2);
    expect(
      Array.from(target.querySelectorAll(".char__base")).map((node) => node.textContent),
    ).toEqual(["A", "B"]);
  });

  it("replacement effect の文字を描画する", () => {
    const target = render("AB", {
      effects: new Map([[1, { kind: "replacement", replacementChar: "Z" }]]),
    });

    expect(
      Array.from(target.querySelectorAll(".char__base")).map((node) => node.textContent),
    ).toEqual(["A", "Z"]);
  });

  it("空白を NBSP、改行を br として描画する", () => {
    const target = render("A \nB", { effects: new Map() });

    expect(target.childNodes[1].textContent).toBe("\u00a0");
    expect(target.childNodes[2]).toBeInstanceOf(HTMLBRElement);
  });

  it("dual composite effect を gojibake-glyph と fragment 群で描画する", () => {
    const target = render("A", {
      effects: new Map([
        [
          0,
          {
            kind: "composite",
            composite: {
              kind: "dual",
              fragments: [
                { char: "上", position: "top", placement: "same-side" },
                { char: "下", position: "bottom", placement: "opposite-side" },
              ],
            },
          },
        ],
      ]),
    });

    const glyph = target.firstElementChild;
    const fragments = Array.from(glyph?.children ?? []) as GojibakeGlyphFragmentElement[];

    expect(glyph?.tagName).toBe("GOJIBAKE-GLYPH");
    expect(fragments.map((fragment) => fragment.tagName)).toEqual([
      "GOJIBAKE-GLYPH-FRAGMENT",
      "GOJIBAKE-GLYPH-FRAGMENT",
    ]);
    expect(fragments.map((fragment) => fragment.textContent)).toEqual(["上", "下"]);
    expect(fragments.map((fragment) => fragment.region)).toEqual(["top", "bottom"]);
    expect(fragments.map((fragment) => fragment.placement)).toEqual(["same-side", "opposite-side"]);
  });

  it("quad composite effect を gojibake-glyph と 4 fragment で描画する", () => {
    const target = render("A", {
      effects: new Map([
        [
          0,
          {
            kind: "composite",
            composite: {
              kind: "quad",
              fragments: [
                { char: "左上", quadrant: "top-left", placement: "same-side" },
                { char: "右上", quadrant: "top-right", placement: "opposite-side" },
                { char: "左下", quadrant: "bottom-left", placement: "same-side" },
                { char: "右下", quadrant: "bottom-right", placement: "opposite-side" },
              ],
            },
          },
        ],
      ]),
    });

    const fragments = Array.from(
      target.querySelectorAll("gojibake-glyph-fragment"),
    ) as GojibakeGlyphFragmentElement[];

    expect(fragments).toHaveLength(4);
    expect(fragments.map((fragment) => fragment.region)).toEqual([
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]);
    expect(fragments.map((fragment) => fragment.textContent)).toEqual([
      "左上",
      "右上",
      "左下",
      "右下",
    ]);
  });

  it("再描画時に target の既存内容をクリアする", () => {
    const target = document.createElement("div");
    target.innerHTML = "<span>古い内容</span>";
    const renderer = new GlitchRenderer({ source: "A", target });

    renderer.renderDisplayState({ effects: new Map() });

    expect(target.children).toHaveLength(1);
    expect(target.textContent).toBe("A");
  });
});
