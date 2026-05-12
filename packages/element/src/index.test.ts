import { describe, expect, it } from "bun:test";

import {
  GojibakeGlyphElement,
  GojibakeGlyphFragmentElement,
  registerGojibakeElements,
} from "./index.ts";

describe("registerGojibakeElements", () => {
  it("カスタム要素を登録する", () => {
    registerGojibakeElements();

    expect(customElements.get("gojibake-glyph-fragment")).toBe(GojibakeGlyphFragmentElement);
    expect(customElements.get("gojibake-glyph")).toBe(GojibakeGlyphElement);
  });

  it("既に登録済みなら再定義しない", () => {
    registerGojibakeElements();

    const originalDefine = customElements.define;
    const defineCalls: string[] = [];

    customElements.define = ((name, elementConstructor, options) => {
      defineCalls.push(name);
      return originalDefine.call(customElements, name, elementConstructor, options);
    }) as CustomElementRegistry["define"];

    try {
      registerGojibakeElements();
    } finally {
      customElements.define = originalDefine;
    }

    expect(defineCalls).toEqual([]);
  });
});
