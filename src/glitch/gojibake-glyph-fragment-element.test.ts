import { afterEach, beforeEach, describe, expect, it } from "bun:test";

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

  describe("glyph", () => {
    it("glyph 属性があればそのまま返す", () => {
      renderFixture('<gojibake-glyph-fragment glyph="異"></gojibake-glyph-fragment>');
      const element = getFragment();

      expect(element.glyph).toBe("異");
      expect(warnings).toEqual([]);
    });

    it("glyph 属性が欠けていると警告して null を返す", () => {
      renderFixture("<gojibake-glyph-fragment></gojibake-glyph-fragment>");
      const element = getFragment();

      expect(element.glyph).toBeNull();
      expect(warnings).toEqual([
        "<gojibake-glyph-fragment>: glyph 属性が不正です。glyph 属性は必須です。",
      ]);
    });
  });

  describe("parentGlyph", () => {
    it("gojibake-glyph 親があれば parentGlyph として返す", () => {
      renderFixture(
        '<gojibake-glyph><gojibake-glyph-fragment glyph="片"></gojibake-glyph-fragment></gojibake-glyph>',
      );
      const parent = getGlyph();
      const child = getFragment();

      expect(child.parentGlyph).toBe(parent);
    });

    it("gojibake-glyph 親でなければ null を返す", () => {
      renderFixture('<span><gojibake-glyph-fragment glyph="片"></gojibake-glyph-fragment></span>');
      const child = getFragment();

      expect(child.parentGlyph).toBeNull();
    });
  });

  describe("region", () => {
    describe("dual 親", () => {
      it.each([
        {
          title: "dual 親では top を受け付ける",
          region: "top",
          expected: "top",
          warnings: [],
        },
        {
          title: "dual 親では bottom を受け付ける",
          region: "bottom",
          expected: "bottom",
          warnings: [],
        },
        {
          title: "dual 親では quad 用 region を警告して弾く",
          region: "top-left",
          expected: null,
          warnings: [
            '<gojibake-glyph-fragment>: region 属性が不正です。dual 構成の region 属性は "top"・"bottom"・"left"・"right" のいずれかを指定してください。現在の値: "top-left"。',
          ],
        },
      ] as const)("$title", ({ region, expected, warnings: expectedWarnings }) => {
        renderFixture(
          `<gojibake-glyph><gojibake-glyph-fragment glyph="化" region="${region}"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="字" region="bottom" placement="same-side"></gojibake-glyph-fragment></gojibake-glyph>`,
        );
        const parent = getGlyph();
        const [target] = parent.fragments;

        expect(parent.layout).toBe("dual");
        expect(target.region).toBe(expected);
        expect(warnings).toEqual(expectedWarnings);
      });
    });

    describe("quad 親", () => {
      it.each([
        {
          title: "quad 親では top-left を受け付ける",
          region: "top-left",
          expected: "top-left",
          warnings: [],
        },
        {
          title: "quad 親では dual 用 region を警告して弾く",
          region: "top",
          expected: null,
          warnings: [
            '<gojibake-glyph-fragment>: region 属性が不正です。quad 構成の region 属性は "top-left"・"top-right"・"bottom-left"・"bottom-right" のいずれかを指定してください。現在の値: "top"。',
          ],
        },
      ] as const)("$title", ({ region, expected, warnings: expectedWarnings }) => {
        renderFixture(
          `<gojibake-glyph><gojibake-glyph-fragment glyph="化" region="${region}" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="字" region="top-right" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="崩" region="bottom-left" placement="same-side"></gojibake-glyph-fragment><gojibake-glyph-fragment glyph="壊" region="bottom-right" placement="same-side"></gojibake-glyph-fragment></gojibake-glyph>`,
        );
        const parent = getGlyph();
        const [target] = parent.fragments;

        expect(parent.layout).toBe("quad");
        expect(target.region).toBe(expected);
        expect(warnings).toEqual(expectedWarnings);
      });
    });

    it("親レイアウトが未確定なら全 region から検証する", () => {
      renderFixture(
        '<gojibake-glyph-fragment glyph="片" region="bottom-right"></gojibake-glyph-fragment>',
      );
      const element = getFragment();

      expect(element.region).toBe("bottom-right");
      expect(warnings).toEqual([]);
    });

    it("親レイアウトが未確定でも不正な region は警告して null を返す", () => {
      renderFixture(
        '<gojibake-glyph-fragment glyph="片" region="center"></gojibake-glyph-fragment>',
      );
      const element = getFragment();
      const region = element.region;

      expect(region).toBeNull();
      expect(warnings).toEqual([
        '<gojibake-glyph-fragment>: region 属性が不正です。region 属性は "top"・"bottom"・"left"・"right"・"top-left"・"top-right"・"bottom-left"・"bottom-right" のいずれかを指定してください。現在の値: "center"。',
        '<gojibake-glyph-fragment>: region 属性が不正です。region 属性は "top"・"bottom"・"left"・"right"・"top-left"・"top-right"・"bottom-left"・"bottom-right" のいずれかを指定してください。現在の値: "center"。',
      ]);
    });

    it("region 属性がなければ警告して null を返す", () => {
      renderFixture('<gojibake-glyph-fragment glyph="片"></gojibake-glyph-fragment>');
      const element = getFragment();

      expect(element.region).toBeNull();
      expect(warnings).toEqual([
        "<gojibake-glyph-fragment>: region 属性が不正です。region 属性は必須です。",
      ]);
    });
  });

  describe("placement", () => {
    it.each([
      {
        title: "same-side を受け付ける",
        value: "same-side",
        expected: "same-side",
        warnings: [],
      },
      {
        title: "opposite-side を受け付ける",
        value: "opposite-side",
        expected: "opposite-side",
        warnings: [],
      },
      {
        title: "無効な値なら警告して null を返す",
        value: "cross",
        expected: null,
        warnings: [
          '<gojibake-glyph-fragment>: placement 属性が不正です。placement 属性は "same-side" または "opposite-side" を指定してください。現在の値: "cross"。',
          '<gojibake-glyph-fragment>: placement 属性が不正です。placement 属性は "same-side" または "opposite-side" を指定してください。現在の値: "cross"。',
        ],
      },
    ] as const)("$title", ({ value, expected, warnings: expectedWarnings }) => {
      renderFixture(`<gojibake-glyph-fragment placement="${value}"></gojibake-glyph-fragment>`);
      const element = getFragment();
      const placement = element.placement;

      expect(placement).toBe(expected);
      expect(warnings).toEqual(expectedWarnings);
    });

    it("placement 属性がなければ警告して null を返す", () => {
      renderFixture('<gojibake-glyph-fragment glyph="片" region="top"></gojibake-glyph-fragment>');
      const element = getFragment();

      expect(element.placement).toBeNull();
      expect(warnings).toEqual([
        "<gojibake-glyph-fragment>: placement 属性が不正です。placement 属性は必須です。",
      ]);
    });
  });
});
