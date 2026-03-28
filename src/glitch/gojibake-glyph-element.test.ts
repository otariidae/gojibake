import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { installDom } from "./test-support/install-dom";

installDom();

const { GojibakeGlyphElement } = await import("./gojibake-glyph-element.ts");
const { GojibakeGlyphFragmentElement } = await import("./gojibake-glyph-fragment-element.ts");

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
  const originalWarn = console.warn;
  let warnings: string[];

  beforeEach(() => {
    warnings = [];
    fixtureRoot = document.createElement("div");
    console.warn = (message: string) => {
      warnings.push(message);
    };
  });

  afterEach(() => {
    console.warn = originalWarn;
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
          '<gojibake-glyph-fragment glyph="上" region="top" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="下" region="bottom" placement="same-side"></gojibake-glyph-fragment>',
        expected: "dual",
      },
      {
        title: "fragment が 4 個なら quad を返す",
        fragments:
          '<gojibake-glyph-fragment glyph="上" region="top" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="下" region="bottom" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="左下" region="bottom-left" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="右下" region="bottom-right" placement="same-side"></gojibake-glyph-fragment>',
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
        '<gojibake-glyph-fragment glyph="上" region="top" placement="same-side"></gojibake-glyph-fragment><span></span><gojibake-glyph-fragment glyph="下" region="bottom" placement="same-side"></gojibake-glyph-fragment>',
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
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("子要素数は 2 または 4 である必要があります。");
    });

    describe("dual 構成", () => {
      it("span 群へ正規化して描画する", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment glyph="上" region="top" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="下" region="bottom" placement="opposite-side"></gojibake-glyph-fragment>',
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
        expect(warnings).toEqual([]);
      });

      it("不正な region 組み合わせは警告してフォールバックする", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment glyph="上" region="top" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="右" region="right" placement="same-side"></gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
        expect(warnings).toEqual([
          '<gojibake-glyph>: dual 構成の region 属性は "top" と "bottom"、または "left" と "right" を 1 つずつ指定してください。',
        ]);
      });
    });

    describe("quad 構成", () => {
      it("4 象限をそれぞれ描画する", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment glyph="左上" region="top-left" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="右上" region="top-right" placement="opposite-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="左下" region="bottom-left" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="右下" region="bottom-right" placement="opposite-side"></gojibake-glyph-fragment>',
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
        expect(warnings).toEqual([]);
      });

      it("quadrant が重複していると警告してフォールバックする", () => {
        const glyph = renderGlyphFixture(
          "基",
          '<gojibake-glyph-fragment glyph="左上1" region="top-left" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="右上" region="top-right" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="左下" region="bottom-left" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="左上2" region="top-left" placement="same-side"></gojibake-glyph-fragment>',
        );

        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
        expect(warnings).toEqual([
          '<gojibake-glyph>: quad 構成の region 属性は "top-left"・"top-right"・"bottom-left"・"bottom-right" を 1 つずつ指定してください。',
        ]);
      });
    });

    describe("不正な子要素", () => {
      it("非対応の子要素が混ざると警告して描画を止める", () => {
        const glyph = renderGlyphFixture("基", "<span></span>");
        glyph.connectedCallback();

        expect(readFragments(glyph)).toHaveLength(0);
        expect(readBase(glyph).classList.contains("base--fallback")).toBe(true);
        expect(warnings).toEqual([
          "<gojibake-glyph>: 子要素には <gojibake-glyph-fragment> を使用してください。<span> はサポートしていません。",
        ]);
      });
    });
  });
});
