import type { DualCompositePosition, QuadCompositeQuadrant } from "./composite-effect-builder.js";
import type { GojibakeGlyphElement, GojibakeGlyphLayout } from "./gojibake-glyph-element.js";

type EnumeratedAttributeValidationRule<T extends string> = {
  attributeName: string;
  choices: readonly T[];
  invalidValueDefault?: T;
  missingValueDefault?: T;
  emptyValueDefault?: T;
};

type TextContentValidationRule = {
  required?: boolean;
  allowEmpty?: boolean;
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
const DUAL_FRAGMENT_REGION_DEFAULT = DUAL_FRAGMENT_REGIONS[0];
const QUAD_FRAGMENT_REGION_DEFAULT = QUAD_FRAGMENT_REGIONS[0];
const FRAGMENT_REGION_DEFAULT = ALL_FRAGMENT_REGIONS[0];
const PLACEMENT_MODE_DEFAULT = PLACEMENT_MODES[0];

export type FragmentRegion = (typeof ALL_FRAGMENT_REGIONS)[number];
export type PlacementMode = (typeof PLACEMENT_MODES)[number];

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

export class GojibakeGlyphFragmentElement extends HTMLElement {
  public get glyph(): string | null {
    return this.readValidatedTextContent({
      allowEmpty: false,
    });
  }

  public get parentGlyph(): GojibakeGlyphElement | null {
    const parent = this.parentElement;

    if (parent?.tagName !== "GOJIBAKE-GLYPH") {
      return null;
    }

    return parent as GojibakeGlyphElement;
  }

  public get region(): FragmentRegion | null {
    const layout = this.resolveParentLayout();

    if (layout === "dual") {
      return this.readValidatedEnumeratedAttribute({
        attributeName: "region",
        choices: DUAL_FRAGMENT_REGIONS,
        invalidValueDefault: DUAL_FRAGMENT_REGION_DEFAULT,
        missingValueDefault: DUAL_FRAGMENT_REGION_DEFAULT,
        emptyValueDefault: DUAL_FRAGMENT_REGION_DEFAULT,
      });
    }

    if (layout === "quad") {
      return this.readValidatedEnumeratedAttribute({
        attributeName: "region",
        choices: QUAD_FRAGMENT_REGIONS,
        invalidValueDefault: QUAD_FRAGMENT_REGION_DEFAULT,
        missingValueDefault: QUAD_FRAGMENT_REGION_DEFAULT,
        emptyValueDefault: QUAD_FRAGMENT_REGION_DEFAULT,
      });
    }

    return this.readValidatedEnumeratedAttribute({
      attributeName: "region",
      choices: ALL_FRAGMENT_REGIONS,
      invalidValueDefault: FRAGMENT_REGION_DEFAULT,
      missingValueDefault: FRAGMENT_REGION_DEFAULT,
      emptyValueDefault: FRAGMENT_REGION_DEFAULT,
    });
  }

  public get placement(): PlacementMode | null {
    return this.readValidatedEnumeratedAttribute({
      attributeName: "placement",
      choices: PLACEMENT_MODES,
      invalidValueDefault: PLACEMENT_MODE_DEFAULT,
      missingValueDefault: PLACEMENT_MODE_DEFAULT,
      emptyValueDefault: PLACEMENT_MODE_DEFAULT,
    });
  }

  private resolveParentLayout(): GojibakeGlyphLayout {
    const parent = this.parentGlyph;

    if (parent === null) {
      return null;
    }

    return parent.layout;
  }

  private readValidatedEnumeratedAttribute<T extends string>(
    rule: EnumeratedAttributeValidationRule<T>,
  ): T | null {
    const { attributeName, choices, invalidValueDefault, missingValueDefault, emptyValueDefault } =
      rule;
    const value = this.getAttribute(attributeName);

    if (value === null) {
      return missingValueDefault ?? null;
    }

    if (value === "") {
      return emptyValueDefault ?? invalidValueDefault ?? null;
    }

    if (!isOneOf(value, choices)) {
      return invalidValueDefault ?? null;
    }

    return value;
  }

  private readValidatedTextContent(rule: TextContentValidationRule): string | null {
    const { required = true, allowEmpty = true } = rule;
    const value = this.textContent;

    if (value === null || (!allowEmpty && value === "")) {
      if (!required) {
        return null;
      }

      return null;
    }

    return value;
  }
}
