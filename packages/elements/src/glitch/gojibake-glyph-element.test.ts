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

function renderGlyphFixture(fragments = "", leadingText = ""): GojibakeGlyphElement {
  return renderFixture(`<gojibake-glyph>${leadingText}${fragments}</gojibake-glyph>`);
}

function readBase(element: GojibakeGlyphElement): HTMLSpanElement | null {
  return element.shadowRoot?.querySelector(".base") ?? null;
}

function readFragments(element: GojibakeGlyphElement): HTMLSpanElement[] {
  return Array.from(element.shadowRoot?.querySelectorAll(".fragment") ?? []);
}

function readSlot(element: GojibakeGlyphElement): HTMLSlotElement | null {
  return element.shadowRoot?.querySelector("slot") ?? null;
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
      const glyph = renderGlyphFixture(fragments, "原");

      expect(glyph.layout).toBe(expected);
    });
  });

  describe("fragments", () => {
    it("gojibake-glyph-fragment の子要素だけを返す", () => {
      const glyph = renderGlyphFixture(
        '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><span></span><gojibake-glyph-fragment region="bottom" placement="same-side">下</gojibake-glyph-fragment>',
        "基",
      );

      expect(glyph.fragments).toHaveLength(2);
      expect(glyph.fragments.map((fragment) => fragment.tagName)).toEqual([
        "GOJIBAKE-GLYPH-FRAGMENT",
        "GOJIBAKE-GLYPH-FRAGMENT",
      ]);
    });
  });

  describe("connectedCallback", () => {
    it("fragment がなければ light DOM をそのまま表示する", () => {
      const glyph = renderGlyphFixture("", " ");

      glyph.connectedCallback();

      expect(readFragments(glyph)).toHaveLength(0);
      expect(readBase(glyph)).toBeNull();
      expect(readSlot(glyph)).not.toBeNull();
    });

    describe("dual 構成", () => {
      it("span 群へ正規化して描画する", () => {
        const glyph = renderGlyphFixture(
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="opposite-side">下</gojibake-glyph-fragment>',
          "基",
        );

        glyph.connectedCallback();

        const [first, second] = readFragments(glyph);

        expect(readBase(glyph)).toBeNull();
        expect(readSlot(glyph)).toBeNull();

        expect(first.dataset.layout).toBe("dual");
        expect(first.dataset.clip).toBe("top");
        expect(first.dataset.place).toBeUndefined();
        expect(first.textContent).toBe("上");

        expect(second.dataset.layout).toBe("dual");
        expect(second.dataset.clip).toBe("top");
        expect(second.dataset.place).toBe("bottom");
        expect(second.textContent).toBe("下");
      });

      it("不正な region 組み合わせなら light DOM をそのまま表示する", () => {
        const glyph = renderGlyphFixture(
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="right" placement="same-side">右</gojibake-glyph-fragment>',
          "基",
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph)).toBeNull();
        expect(readSlot(glyph)).not.toBeNull();
      });

      it("quad 用 region が混ざると light DOM をそのまま表示する", () => {
        const glyph = renderGlyphFixture(
          '<gojibake-glyph-fragment region="top-left" placement="same-side">左上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="same-side">下</gojibake-glyph-fragment>',
          "基",
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph)).toBeNull();
        expect(readSlot(glyph)).not.toBeNull();
      });
    });

    describe("quad 構成", () => {
      it("4 象限をそれぞれ描画する", () => {
        const glyph = renderGlyphFixture(
          '<gojibake-glyph-fragment region="top-left" placement="same-side">左上</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="opposite-side">右上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">左下</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="opposite-side">右下</gojibake-glyph-fragment>',
          "基",
        );

        glyph.connectedCallback();

        const [topLeft, topRight, bottomLeft, bottomRight] = readFragments(glyph);

        expect(readBase(glyph)).toBeNull();
        expect(readSlot(glyph)).toBeNull();
        expect(readFragments(glyph)).toHaveLength(4);
        expect(topLeft.dataset.clip).toBe("top-left");
        expect(topLeft.dataset.place).toBeUndefined();
        expect(topRight.dataset.clip).toBe("bottom-left");
        expect(topRight.dataset.place).toBe("top-right");
        expect(bottomLeft.dataset.clip).toBe("bottom-left");
        expect(bottomRight.dataset.clip).toBe("top-left");
        expect(bottomRight.dataset.place).toBe("bottom-right");
      });

      it("quadrant が重複していると light DOM をそのまま表示する", () => {
        const glyph = renderGlyphFixture(
          '<gojibake-glyph-fragment region="top-left" placement="same-side">左上1</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="same-side">右上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">左下</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-left" placement="same-side">左上2</gojibake-glyph-fragment>',
          "基",
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph)).toBeNull();
        expect(readSlot(glyph)).not.toBeNull();
      });

      it("dual 用 region が混ざると light DOM をそのまま表示する", () => {
        const glyph = renderGlyphFixture(
          '<gojibake-glyph-fragment region="top" placement="same-side">上</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="same-side">右上</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">左下</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="same-side">右下</gojibake-glyph-fragment>',
          "基",
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph)).toBeNull();
        expect(readSlot(glyph)).not.toBeNull();
      });
    });

    describe("不正な子要素", () => {
      it("非対応の子要素が混ざると light DOM をそのまま表示する", () => {
        const glyph = renderGlyphFixture("<span></span>", "基");
        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph)).toBeNull();
        expect(readSlot(glyph)).not.toBeNull();
      });
    });
  });
});
