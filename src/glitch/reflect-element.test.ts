import { describe, expect, it } from "bun:test";

import { type EnumRule, ReflectElement, type ReflectProps } from "./reflect-element.ts";

type Mode = "primary" | "secondary";

type DummyProps = {
  mode: EnumRule<Mode>;
};

class DummyReflectElement extends ReflectElement<DummyProps> {
  public static readonly properties: DummyProps = {
    mode: {
      attributeName: "mode",
      choices: ["primary", "secondary"],
      invalidValueDefault: "primary",
      missingValueDefault: "secondary",
      emptyValueDefault: "primary",
    },
  };
}

if (!customElements.get("reflect-element-dummy")) {
  customElements.define("reflect-element-dummy", DummyReflectElement);
}

DummyReflectElement.observedAttributes;

function createElement(attributeValue?: string | null): DummyReflectElement {
  const element = document.createElement("reflect-element-dummy") as DummyReflectElement;

  if (attributeValue !== undefined) {
    if (attributeValue === null) {
      element.removeAttribute("mode");
    } else {
      element.setAttribute("mode", attributeValue);
    }
  }

  return element;
}

describe("ReflectElement", () => {
  describe("observedAttributes", () => {
    it("static properties から監視属性を導出する", () => {
      expect(DummyReflectElement.observedAttributes).toEqual(["mode"]);
    });

    it("observedAttributes 参照時に getter / setter をプロトタイプへ生成する", () => {
      const descriptor = Object.getOwnPropertyDescriptor(DummyReflectElement.prototype, "mode");

      expect(descriptor?.get).toBeTypeOf("function");
      expect(descriptor?.set).toBeTypeOf("function");
    });
  });

  describe("列挙型 IDL アクセサ", () => {
    describe("getter", () => {
      it("属性が未設定なら missing value default を返す", () => {
        const element = createElement(null);

        expect(element.mode).toBe("secondary");
      });

      it("空文字なら empty value default を返す", () => {
        const element = createElement("");

        expect(element.mode).toBe("primary");
      });

      it("無効な値なら invalid value default を返す", () => {
        const element = createElement("unknown");

        expect(element.mode).toBe("primary");
      });

      it("有効な値ならその値を返す", () => {
        const element = createElement("secondary");

        expect(element.mode).toBe("secondary");
      });
    });

    describe("setter", () => {
      it("属性へ文字列として反映する", () => {
        const element = createElement();

        element.mode = "primary";

        expect(element.getAttribute("mode")).toBe("primary");
      });

      it('null を渡すと "null" として反映する', () => {
        const element = createElement();

        element.mode = null;

        expect(element.getAttribute("mode")).toBe("null");
      });
    });
  });

  describe("static properties が未定義な派生クラス", () => {
    class NoPropsElement extends ReflectElement<ReflectProps> {}

    it("observedAttributes 参照時に例外を投げる", () => {
      expect(() => NoPropsElement.observedAttributes).toThrow(
        "ReflectElement を継承する要素は static properties を定義する必要があります。",
      );
    });
  });
});
