import { describe, expect, it } from "bun:test";

import { GojibakeGlyphElement } from "./gojibake-glyph-element.ts";
import { GojibakeGlyphFragmentElement } from "./gojibake-glyph-fragment-element.ts";

if (!customElements.get("gojibake-glyph-fragment")) {
  customElements.define("gojibake-glyph-fragment", GojibakeGlyphFragmentElement);
}

if (!customElements.get("gojibake-glyph")) {
  customElements.define("gojibake-glyph", GojibakeGlyphElement);
}

let fixtureRoot: HTMLDivElement;

function renderFixture(markup: string): void {
  fixtureRoot = document.createElement("div");
  fixtureRoot.innerHTML = markup;
}

function getFragment(): GojibakeGlyphFragmentElement {
  return fixtureRoot.querySelector("gojibake-glyph-fragment") as GojibakeGlyphFragmentElement;
}

function getGlyph(): GojibakeGlyphElement {
  return fixtureRoot.querySelector("gojibake-glyph") as GojibakeGlyphElement;
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

  describe("parentGlyph", () => {
    it("gojibake-glyph 親があれば parentGlyph として返す", () => {
      renderFixture(
        "<gojibake-glyph><gojibake-glyph-fragment>片</gojibake-glyph-fragment></gojibake-glyph>",
      );
      const parent = getGlyph();
      const child = getFragment();

      expect(child.parentGlyph).toBe(parent);
    });

    it("gojibake-glyph 親でなければ null を返す", () => {
      renderFixture("<span><gojibake-glyph-fragment>片</gojibake-glyph-fragment></span>");
      const child = getFragment();

      expect(child.parentGlyph).toBeNull();
    });
  });

  describe("region", () => {
    describe("getter", () => {
      describe("dual 親", () => {
        it.each([
          {
            title: "dual 親では top を受け付ける",
            region: "top",
            expected: "top",
          },
          {
            title: "dual 親では bottom を受け付ける",
            region: "bottom",
            expected: "bottom",
          },
          {
            title: "dual 親では quad 用 region に invalid value default を適用する",
            region: "top-left",
            expected: "top",
          },
        ] as const)("$title", ({ region, expected }) => {
          renderFixture(
            `<gojibake-glyph><gojibake-glyph-fragment region="${region}">化</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="same-side">字</gojibake-glyph-fragment></gojibake-glyph>`,
          );
          const parent = getGlyph();
          const [target] = parent.fragments;

          expect(parent.layout).toBe("dual");
          expect(target.region).toBe(expected);
        });

        it("dual 親では region 属性がなければ missing value default を返す", () => {
          renderFixture(
            '<gojibake-glyph><gojibake-glyph-fragment placement="same-side">化</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="same-side">字</gojibake-glyph-fragment></gojibake-glyph>',
          );
          const parent = getGlyph();
          const [target] = parent.fragments;

          expect(target.region).toBe("top");
        });

        it("dual 親では空文字 region に empty value default を返す", () => {
          renderFixture(
            '<gojibake-glyph><gojibake-glyph-fragment region="" placement="same-side">化</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom" placement="same-side">字</gojibake-glyph-fragment></gojibake-glyph>',
          );
          const parent = getGlyph();
          const [target] = parent.fragments;

          expect(target.region).toBe("top");
        });
      });

      describe("quad 親", () => {
        it.each([
          {
            title: "quad 親では top-left を受け付ける",
            region: "top-left",
            expected: "top-left",
          },
          {
            title: "quad 親では dual 用 region に invalid value default を適用する",
            region: "top",
            expected: "top-left",
          },
        ] as const)("$title", ({ region, expected }) => {
          renderFixture(
            `<gojibake-glyph><gojibake-glyph-fragment region="${region}" placement="same-side">化</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="same-side">字</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">崩</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="same-side">壊</gojibake-glyph-fragment></gojibake-glyph>`,
          );
          const parent = getGlyph();
          const [target] = parent.fragments;

          expect(parent.layout).toBe("quad");
          expect(target.region).toBe(expected);
        });

        it("quad 親では region 属性がなければ missing value default を返す", () => {
          renderFixture(
            '<gojibake-glyph><gojibake-glyph-fragment placement="same-side">化</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="same-side">字</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">崩</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="same-side">壊</gojibake-glyph-fragment></gojibake-glyph>',
          );
          const parent = getGlyph();
          const [target] = parent.fragments;

          expect(target.region).toBe("top-left");
        });

        it("quad 親では空文字 region に empty value default を返す", () => {
          renderFixture(
            '<gojibake-glyph><gojibake-glyph-fragment region="" placement="same-side">化</gojibake-glyph-fragment><gojibake-glyph-fragment region="top-right" placement="same-side">字</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-left" placement="same-side">崩</gojibake-glyph-fragment><gojibake-glyph-fragment region="bottom-right" placement="same-side">壊</gojibake-glyph-fragment></gojibake-glyph>',
          );
          const parent = getGlyph();
          const [target] = parent.fragments;

          expect(target.region).toBe("top-left");
        });
      });

      it("親レイアウトが未確定なら全 region から検証する", () => {
        renderFixture(
          '<gojibake-glyph-fragment region="bottom-right">片</gojibake-glyph-fragment>',
        );
        const element = getFragment();

        expect(element.region).toBe("bottom-right");
      });

      it("親レイアウトが未確定でも不正な region には invalid value default を返す", () => {
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
