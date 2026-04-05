import type { DualCompositePosition, QuadCompositeQuadrant } from "./composite-effect-builder.js";

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

  public get region(): FragmentRegion | null {
    return this.readValidatedEnumeratedAttribute({
      attributeName: "region",
      choices: ALL_FRAGMENT_REGIONS,
      invalidValueDefault: FRAGMENT_REGION_DEFAULT,
      missingValueDefault: FRAGMENT_REGION_DEFAULT,
      emptyValueDefault: FRAGMENT_REGION_DEFAULT,
    });
  }

  public set region(value: FragmentRegion) {
    this.setAttribute("region", value);
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

  public set placement(value: PlacementMode) {
    this.setAttribute("placement", value);
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
