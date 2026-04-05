import type { DualCompositePosition, QuadCompositeQuadrant } from "./composite-effect-builder.js";
import { type EnumRule, IDLAttributesElement } from "./idl-attributes-element.js";

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

export type FragmentRegion = (typeof ALL_FRAGMENT_REGIONS)[number];
export type PlacementMode = (typeof PLACEMENT_MODES)[number];

type FragmentProps = {
  region: EnumRule<FragmentRegion>;
  placement: EnumRule<PlacementMode>;
};

/**
 * `region` と `placement` を宣言的に扱う断片要素。
 *
 * 列挙型 IDL 属性の自動反映は基底クラスへ寄せ、要素固有ロジックだけを持つ。
 */
export class GojibakeGlyphFragmentElement extends IDLAttributesElement<FragmentProps> {
  public static readonly properties: FragmentProps = {
    region: {
      attributeName: "region",
      choices: ALL_FRAGMENT_REGIONS,
      invalidValueDefault: ALL_FRAGMENT_REGIONS[0],
      missingValueDefault: ALL_FRAGMENT_REGIONS[0],
      emptyValueDefault: ALL_FRAGMENT_REGIONS[0],
    },
    placement: {
      attributeName: "placement",
      choices: PLACEMENT_MODES,
      invalidValueDefault: PLACEMENT_MODES[0],
      missingValueDefault: PLACEMENT_MODES[0],
      emptyValueDefault: PLACEMENT_MODES[0],
    },
  };

  declare region: FragmentRegion | null;
  declare placement: PlacementMode | null;

  public get glyph(): string | null {
    return this.readValidatedTextContent({
      allowEmpty: false,
    });
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
