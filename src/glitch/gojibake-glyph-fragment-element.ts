import type { DualCompositePosition, QuadCompositeQuadrant } from "./composite-effect-builder.js";
import type { GojibakeGlyphLayout } from "./gojibake-glyph-element.js";

type AttributeValidationRule = {
  attributeName: string;
  required?: boolean;
  allowEmpty?: boolean;
};

type EnumeratedAttributeValidationRule<T extends string> = AttributeValidationRule & {
  choices: readonly T[];
  createInvalidMessage: (value: string) => string;
};

type FreeformAttributeValidationRule = AttributeValidationRule & {
  choices?: undefined;
  createInvalidMessage?: undefined;
};

export const DUAL_FRAGMENT_REGIONS = [
  "top",
  "bottom",
  "left",
  "right",
] as const satisfies readonly DualCompositePosition[];

export const QUAD_FRAGMENT_REGIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
] as const satisfies readonly QuadCompositeQuadrant[];

const ALL_FRAGMENT_REGIONS = [...DUAL_FRAGMENT_REGIONS, ...QUAD_FRAGMENT_REGIONS] as const;
const PLACEMENT_MODES = ["same-side", "opposite-side"] as const;

export type FragmentRegion = (typeof ALL_FRAGMENT_REGIONS)[number];
export type PlacementMode = (typeof PLACEMENT_MODES)[number];

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

function hasChoices<T extends string>(
  rule: FreeformAttributeValidationRule | EnumeratedAttributeValidationRule<T>,
): rule is EnumeratedAttributeValidationRule<T> {
  return rule.choices !== undefined;
}

export class GojibakeGlyphFragmentElement extends HTMLElement {
  public get glyph(): string | null {
    return this.readValidatedAttribute({
      attributeName: "glyph",
    });
  }

  public get region(): FragmentRegion | null {
    const layout = this.resolveParentLayout();

    if (layout === "dual") {
      return this.readValidatedAttribute({
        attributeName: "region",
        allowEmpty: false,
        choices: DUAL_FRAGMENT_REGIONS,
        createInvalidMessage(value: string): string {
          return `dual 構成の region 属性は "top"・"bottom"・"left"・"right" のいずれかを指定してください。現在の値: "${value}"。`;
        },
      });
    }

    if (layout === "quad") {
      return this.readValidatedAttribute({
        attributeName: "region",
        allowEmpty: false,
        choices: QUAD_FRAGMENT_REGIONS,
        createInvalidMessage(value: string): string {
          return `quad 構成の region 属性は "top-left"・"top-right"・"bottom-left"・"bottom-right" のいずれかを指定してください。現在の値: "${value}"。`;
        },
      });
    }

    return this.readValidatedAttribute({
      attributeName: "region",
      allowEmpty: false,
      choices: ALL_FRAGMENT_REGIONS,
      createInvalidMessage(value: string): string {
        return `region 属性は "top"・"bottom"・"left"・"right"・"top-left"・"top-right"・"bottom-left"・"bottom-right" のいずれかを指定してください。現在の値: "${value}"。`;
      },
    });
  }

  public get placement(): PlacementMode | null {
    return this.readValidatedAttribute({
      attributeName: "placement",
      allowEmpty: false,
      choices: PLACEMENT_MODES,
      createInvalidMessage(value: string): string {
        return `placement 属性は "same-side" または "opposite-side" を指定してください。現在の値: "${value}"。`;
      },
    });
  }

  private resolveParentLayout(): GojibakeGlyphLayout {
    const parent = this.parentElement;

    if (
      parent?.tagName !== "GOJIBAKE-GLYPH" ||
      !("layout" in parent) ||
      typeof parent.layout !== "string"
    ) {
      return null;
    }

    if (parent.layout === "dual" || parent.layout === "quad") {
      return parent.layout;
    }

    return null;
  }

  private readValidatedAttribute<T extends string>(
    rule: FreeformAttributeValidationRule,
  ): string | null;
  private readValidatedAttribute<T extends string>(
    rule: EnumeratedAttributeValidationRule<T>,
  ): T | null;
  private readValidatedAttribute<T extends string>(
    rule: FreeformAttributeValidationRule | EnumeratedAttributeValidationRule<T>,
  ): string | T | null {
    const { attributeName, required = true, allowEmpty = true } = rule;
    const value = this.getAttribute(attributeName);

    if (value === null || (!allowEmpty && value === "")) {
      if (!required) {
        return null;
      }

      this.reportAttributeWarning(attributeName, `${attributeName} 属性は必須です。`);
      return null;
    }

    if (hasChoices(rule) && !isOneOf(value, rule.choices)) {
      this.reportAttributeWarning(rule.attributeName, rule.createInvalidMessage(value));
      return null;
    }

    return value;
  }

  private reportAttributeWarning(attributeName: string, message: string): void {
    console.warn(`<gojibake-glyph-fragment>: ${attributeName} 属性が不正です。${message}`);
  }
}
