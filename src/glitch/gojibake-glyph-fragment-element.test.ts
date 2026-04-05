import { describe, expect, it } from "bun:test";

import { GojibakeGlyphFragmentElement } from "./gojibake-glyph-fragment-element.ts";

if (!customElements.get("gojibake-glyph-fragment")) {
  customElements.define("gojibake-glyph-fragment", GojibakeGlyphFragmentElement);
}

let fixtureRoot: HTMLDivElement;

function renderFixture(markup: string): void {
  fixtureRoot = document.createElement("div");
  fixtureRoot.innerHTML = markup;
}

function getFragment(): GojibakeGlyphFragmentElement {
  return fixtureRoot.querySelector("gojibake-glyph-fragment") as GojibakeGlyphFragmentElement;
}

describe("GojibakeGlyphFragmentElement", () => {
  describe("glyph", () => {
    it("textContent があればそのまま返す", () => {
      renderFixture("<gojibake-glyph-fragment>異</gojibake-glyph-fragment>");
      const element = getFragment();

      expect(element.glyph).toBe("異");
    });

    it("textContent が空なら null を返す", () => {
      renderFixture("<gojibake-glyph-fragment></gojibake-glyph-fragment>");
      const element = getFragment();

      expect(element.glyph).toBeNull();
    });
  });

  describe("region", () => {
    describe("getter", () => {
      it("dual 用の region を受け付ける", () => {
        renderFixture('<gojibake-glyph-fragment region="bottom">片</gojibake-glyph-fragment>');
        const element = getFragment();

        expect(element.region).toBe("bottom");
      });

      it("quad 用の region を受け付ける", () => {
        renderFixture(
          '<gojibake-glyph-fragment region="bottom-right">片</gojibake-glyph-fragment>',
        );
        const element = getFragment();

        expect(element.region).toBe("bottom-right");
      });

      it("不正な region には invalid value default を返す", () => {
        renderFixture('<gojibake-glyph-fragment region="center">片</gojibake-glyph-fragment>');
        const element = getFragment();

        expect(element.region).toBe("top");
      });

      it("region 属性がなければ missing value default を返す", () => {
        renderFixture("<gojibake-glyph-fragment>片</gojibake-glyph-fragment>");
        const element = getFragment();

        expect(element.region).toBe("top");
      });

      it("region 属性が空文字なら empty value default を返す", () => {
        renderFixture('<gojibake-glyph-fragment region="">片</gojibake-glyph-fragment>');
        const element = getFragment();

        expect(element.region).toBe("top");
      });
    });

    describe("setter", () => {
      it("region 属性へ反映できる", () => {
        renderFixture("<gojibake-glyph-fragment>片</gojibake-glyph-fragment>");
        const element = getFragment();

        element.region = "bottom-right";

        expect(element.getAttribute("region")).toBe("bottom-right");
      });

      it("null を渡すと文字列として反映する", () => {
        renderFixture(
          '<gojibake-glyph-fragment region="bottom-right">片</gojibake-glyph-fragment>',
        );
        const element = getFragment();

        element.region = null;

        expect(element.getAttribute("region")).toBe("null");
      });
    });
  });

  describe("placement", () => {
    describe("getter", () => {
      it.each([
        {
          title: "same-side を受け付ける",
          value: "same-side",
          expected: "same-side",
        },
        {
          title: "opposite-side を受け付ける",
          value: "opposite-side",
          expected: "opposite-side",
        },
        {
          title: "無効な値なら invalid value default を返す",
          value: "cross",
          expected: "same-side",
        },
      ] as const)("$title", ({ value, expected }) => {
        renderFixture(`<gojibake-glyph-fragment placement="${value}"></gojibake-glyph-fragment>`);
        const element = getFragment();

        expect(element.placement).toBe(expected);
      });

      it("placement 属性がなければ missing value default を返す", () => {
        renderFixture('<gojibake-glyph-fragment region="top">片</gojibake-glyph-fragment>');
        const element = getFragment();

        expect(element.placement).toBe("same-side");
      });

      it("placement 属性が空文字なら empty value default を返す", () => {
        renderFixture(
          '<gojibake-glyph-fragment region="top" placement="">片</gojibake-glyph-fragment>',
        );
        const element = getFragment();

        expect(element.placement).toBe("same-side");
      });
    });

    describe("setter", () => {
      it("placement 属性へ反映できる", () => {
        renderFixture("<gojibake-glyph-fragment>片</gojibake-glyph-fragment>");
        const element = getFragment();

        element.placement = "opposite-side";

        expect(element.getAttribute("placement")).toBe("opposite-side");
      });

      it("null を渡すと文字列として反映する", () => {
        renderFixture(
          '<gojibake-glyph-fragment region="top" placement="opposite-side">片</gojibake-glyph-fragment>',
        );
        const element = getFragment();

        element.placement = null;

        expect(element.getAttribute("placement")).toBe("null");
      });
    });
  });
});
