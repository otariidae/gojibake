import { beforeEach, describe, expect, it } from "bun:test";

import { GojibakeGlyphElement } from "./gojibake-glyph-element.ts";
import { GojibakeGlyphFragmentElement } from "./gojibake-glyph-fragment-element.ts";

if (!customElements.get("gojibake-glyph-fragment")) {
  customElements.define("gojibake-glyph-fragment", GojibakeGlyphFragmentElement);
}

if (!customElements.get("gojibake-glyph")) {
  customElements.define("gojibake-glyph", GojibakeGlyphElement);
}

let fixtureRoot: HTMLDivElement;

function renderFixture(markup: string): GojibakeGlyphElement {
  fixtureRoot = document.createElement("div");
  fixtureRoot.innerHTML = markup;
  return fixtureRoot.querySelector("gojibake-glyph") as GojibakeGlyphElement;
}

function renderGlyphFixture(baseChar: string, fragments = ""): GojibakeGlyphElement {
  return renderFixture(`<gojibake-glyph>${baseChar}${fragments}</gojibake-glyph>`);
}

function readBase(element: GojibakeGlyphElement): HTMLSpanElement {
  return element.shadowRoot?.querySelector(".base") as HTMLSpanElement;
}

function readFragments(element: GojibakeGlyphElement): HTMLSpanElement[] {
  return Array.from(element.shadowRoot?.querySelectorAll(".fragment") ?? []);
}

describe("GojibakeGlyphElement", () => {
  beforeEach(() => {
    fixtureRoot = document.createElement("div");
  });

  describe("layout", () => {
    it.each([
      {
        title: "fragment が 0 個なら null を返す",
        fragments: "",
        expected: null,
      },
      {
        title: "fragment が 2 個なら dual を返す",
        fragments:
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="same-side">下</gojibake-glyph-fragment>',
        expected: "dual",
      },
      {
        title: "fragment が 4 個なら quad を返す",
        fragments:
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="same-side">下</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">左下</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="same-side">右下</gojibake-glyph-fragment>',
        expected: "quad",
      },
    ] as const)("$title", ({ fragments, expected }) => {
      const glyph = renderGlyphFixture("原", fragments);

      expect(glyph.layout).toBe(expected);
    });
  });

  describe("fragments", () => {
    it("gojibake-glyph-fragment の子要素だけを返す", () => {
      const glyph = renderGlyphFixture(
        "基",
        '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><span></span><gojibake-glyph-fragment region="bottom" placement="same-side">下</gojibake-glyph-fragment>',
      );

      expect(glyph.fragments).toHaveLength(2);
      expect(glyph.fragments.map((fragment) => fragment.tagName)).toEqual([
        "GOJIBAKE-GLYPH-FRAGMENT",
        "GOJIBAKE-GLYPH-FRAGMENT",
      ]);
    });
  });

  describe("connectedCallback", () => {
    it("fragment がなければフォールバック文字だけを描画する", () => {
      const glyph = renderGlyphFixture(" ");

      glyph.connectedCallback();

      const base = readBase(glyph);

      expect(readFragments(glyph)).toHaveLength(0);
      expect(base.classList.contains("base--fallback")).toBe(true);
      expect(base.textContent).toBe("\u00a0");
    });

    describe("dual 構成", () => {
      it("span 群へ正規化して描画する", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="opposite-side">下</gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        const [first, second] = readFragments(glyph);

        expect(readBase(glyph).textContent).toBe("基");

        expect(first.dataset.layout).toBe("dual");
        expect(first.dataset.clip).toBe("top");
        expect(first.dataset.place).toBeUndefined();
        expect(first.textContent).toBe("上");

        expect(second.dataset.layout).toBe("dual");
        expect(second.dataset.clip).toBe("top");
        expect(second.dataset.place).toBe("bottom");
        expect(second.textContent).toBe("下");
      });

      it("不正な region 組み合わせはフォールバックする", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="right" placement="same-side">右</gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
      });

      it("quad 用 region が混ざるとフォールバックする", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment region="top-left" placement="same-side">左上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="same-side">下</gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
      });
    });

    describe("quad 構成", () => {
      it("4 象限をそれぞれ描画する", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment region="top-left" placement="same-side">左上</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="opposite-side">右上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">左下</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="opposite-side">右下</gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        const [topLeft, topRight, bottomLeft, bottomRight] = readFragments(glyph);

        expect(readFragments(glyph)).toHaveLength(4);
        expect(topLeft.dataset.clip).toBe("top-left");
        expect(topLeft.dataset.place).toBeUndefined();
        expect(topRight.dataset.clip).toBe("bottom-left");
        expect(topRight.dataset.place).toBe("top-right");
        expect(bottomLeft.dataset.clip).toBe("bottom-left");
        expect(bottomRight.dataset.clip).toBe("top-left");
        expect(bottomRight.dataset.place).toBe("bottom-right");
      });

      it("quadrant が重複しているとフォールバックする", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment region="top-left" placement="same-side">左上1</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="same-side">右上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">左下</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-left" placement="same-side">左上2</gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
      });

      it("dual 用 region が混ざるとフォールバックする", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="same-side">右上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">左下</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="same-side">右下</gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
      });
    });

    describe("不正な子要素", () => {
      it("非対応の子要素が混ざると描画を止める", () => {
        const glyph = renderGlyphFixture("基", "<span></span>");
        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
      });
    });
  });
});
