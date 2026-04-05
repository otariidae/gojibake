import type { DualCompositePosition, QuadCompositeQuadrant } from "./composite-effect-builder.js";
import {
  DUAL_FRAGMENT_REGIONS,
  GojibakeGlyphFragmentElement,
  type PlacementMode,
  QUAD_FRAGMENT_REGIONS,
} from "./gojibake-glyph-fragment-element.js";

export type GojibakeGlyphLayout = "dual" | "quad" | null;

/** span 生成直前の正規化済みフラグメント */
type RenderFragment = {
  glyph: string;
  layout: "dual" | "quad";
  /** data-clip に流し込む値 */
  clip: string;
  /** data-place に流し込む値。same-side のときは null */
  place: string | null;
};

type DualRenderFragment = RenderFragment & {
  position: DualCompositePosition;
};

type QuadRenderFragment = RenderFragment & {
  quadrant: QuadCompositeQuadrant;
};

type CompositeRenderFragment<
  TLayout extends RenderFragment["layout"],
  TRegion extends string,
> = RenderFragment & {
  layout: TLayout;
  region: TRegion;
};

const OPPOSITE_POSITION: Record<DualCompositePosition, DualCompositePosition> = {
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left",
};

const OPPOSITE_QUADRANT: Record<QuadCompositeQuadrant, QuadCompositeQuadrant> = {
  "top-left": "bottom-right",
  "top-right": "bottom-left",
  "bottom-left": "top-right",
  "bottom-right": "top-left",
};

const SHADOW_CSS = `
:host {
  position: relative;
  display: inline-grid;
  place-items: center;
}

.base {
  display: block;
  text-align: center;
  opacity: 0;
}

.base--fallback {
  opacity: 1;
}

.fragment {
  --shift-x: 0em;
  --shift-y: 0em;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  color: inherit;
  text-shadow: inherit;
  transform: translate(var(--shift-x), var(--shift-y));
}

.fragment[data-layout="dual"][data-clip="left"] {
  clip-path: inset(0 50% 0 0);
}
.fragment[data-layout="dual"][data-clip="right"] {
  clip-path: inset(0 0 0 50%);
}
.fragment[data-layout="dual"][data-clip="top"] {
  clip-path: inset(0 0 50% 0);
}
.fragment[data-layout="dual"][data-clip="bottom"] {
  clip-path: inset(50% 0 0 0);
}

.fragment[data-layout="dual"][data-place="top"] {
  --shift-y: -0.5em;
}
.fragment[data-layout="dual"][data-place="bottom"] {
  --shift-y: 0.5em;
}
.fragment[data-layout="dual"][data-place="left"] {
  --shift-x: -0.5em;
}
.fragment[data-layout="dual"][data-place="right"] {
  --shift-x: 0.5em;
}

.fragment[data-layout="quad"][data-clip="top-left"] {
  clip-path: inset(0 50% 50% 0);
}
.fragment[data-layout="quad"][data-clip="top-right"] {
  clip-path: inset(0 0 50% 50%);
}
.fragment[data-layout="quad"][data-clip="bottom-left"] {
  clip-path: inset(50% 50% 0 0);
}
.fragment[data-layout="quad"][data-clip="bottom-right"] {
  clip-path: inset(50% 0 0 50%);
}

.fragment[data-layout="quad"][data-place="top-left"] {
  --shift-x: -0.5em;
  --shift-y: -0.5em;
}
.fragment[data-layout="quad"][data-place="top-right"] {
  --shift-x: 0.5em;
  --shift-y: -0.5em;
}
.fragment[data-layout="quad"][data-place="bottom-left"] {
  --shift-x: -0.5em;
  --shift-y: 0.5em;
}
.fragment[data-layout="quad"][data-place="bottom-right"] {
  --shift-x: 0.5em;
  --shift-y: 0.5em;
}
`;

const SHADOW_STYLESHEET = new CSSStyleSheet();

SHADOW_STYLESHEET.replaceSync(SHADOW_CSS);

function hasDualRegionPair(regions: Set<string>): boolean {
  return (
    (regions.has("top") && regions.has("bottom")) || (regions.has("left") && regions.has("right"))
  );
}

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

/**
 * composite（dual / quad）グリッチ効果を表示するカスタム要素。
 *
 * - `textContent` に元文字を指定する
 * - 各断片は `<gojibake-glyph-fragment>` 子要素の `textContent` で指定する
 * - 子要素数が 2 のとき dual、4 のとき quad とみなす
 *   - dual の場合: 各子要素は本文と `region`, `placement` を持つ
 *   - quad の場合: 各子要素は本文と `region`, `placement` を持つ
 *
 * @example
 * // dual composite（上下分割）
 * // <gojibake-glyph>
 * //   あ
 * //   <gojibake-glyph-fragment region="top" placement="same-side">い</gojibake-glyph-fragment>
 * //   <gojibake-glyph-fragment region="bottom" placement="opposite-side">う</gojibake-glyph-fragment>
 * // </gojibake-glyph>
 */
export class GojibakeGlyphElement extends HTMLElement {
  private readonly shadow: ShadowRoot;

  public constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.adoptedStyleSheets = [SHADOW_STYLESHEET];
  }

  public connectedCallback(): void {
    this.render();
  }

  public get fragments(): GojibakeGlyphFragmentElement[] {
    return Array.from(this.children).filter((node) => node instanceof GojibakeGlyphFragmentElement);
  }

  public get layout(): GojibakeGlyphLayout {
    const fragmentCount = this.fragments.length;

    if (fragmentCount === 2) {
      return "dual";
    }

    if (fragmentCount === 4) {
      return "quad";
    }

    return null;
  }

  private render(): void {
    const baseChar = this.readBaseChar();
    const fragments = this.readRenderFragments();

    const base = document.createElement("span");
    base.className = "base";
    if (fragments.length === 0) {
      base.classList.add("base--fallback");
    }
    base.textContent = baseChar === " " ? "\u00a0" : baseChar;

    const df = document.createDocumentFragment();
    df.appendChild(base);

    for (const fragment of fragments) {
      const span = document.createElement("span");
      span.className = "fragment";
      span.dataset.layout = fragment.layout;
      span.dataset.clip = fragment.clip;
      if (fragment.place !== null) {
        span.dataset.place = fragment.place;
      }
      span.textContent = fragment.glyph;
      df.appendChild(span);
    }

    this.shadow.replaceChildren(df);
  }

  private readBaseChar(): string {
    return Array.from(this.childNodes)
      .filter((node): node is Text => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.data)
      .join("");
  }

  /**
   * 子要素を読み取り、span 生成に必要な情報へ正規化する。
   * 子要素数が 2 なら dual、4 なら quad として扱う。それ以外は空配列を返す。
   *
   * 不正な構成は現段階では描画挙動を変えず、警告だけを出す。
   */
  private readRenderFragments(): RenderFragment[] {
    if (this.layout === "dual") {
      const fragments = this.readDualRenderFragments(this.fragments);

      if (fragments.length !== 2) {
        return [];
      }

      const positions = new Set(fragments.map((fragment) => fragment.position));

      if (!hasDualRegionPair(positions)) {
        return [];
      }

      return fragments.map(({ position: _, ...fragment }) => fragment);
    }

    if (this.layout === "quad") {
      const fragments = this.readQuadRenderFragments(this.fragments);

      if (fragments.length !== 4) {
        return [];
      }

      const quadrants = new Set(fragments.map((fragment) => fragment.quadrant));

      if (quadrants.size !== QUAD_FRAGMENT_REGIONS.length) {
        return [];
      }

      return fragments.map(({ quadrant: _, ...fragment }) => fragment);
    }

    return [];
  }

  private readDualRenderFragments(elements: GojibakeGlyphFragmentElement[]): DualRenderFragment[] {
    const fragments = this.readCompositeRenderFragments({
      elements,
      layout: "dual",
      validRegions: DUAL_FRAGMENT_REGIONS,
      oppositeRegions: OPPOSITE_POSITION,
    });

    return fragments.map((fragment) => ({
      ...fragment,
      position: fragment.region,
    }));
  }

  private readQuadRenderFragments(elements: GojibakeGlyphFragmentElement[]): QuadRenderFragment[] {
    const fragments = this.readCompositeRenderFragments({
      elements,
      layout: "quad",
      validRegions: QUAD_FRAGMENT_REGIONS,
      oppositeRegions: OPPOSITE_QUADRANT,
    });

    return fragments.map((fragment) => ({
      ...fragment,
      quadrant: fragment.region,
    }));
  }

  private readCompositeRenderFragments<
    TLayout extends RenderFragment["layout"],
    TRegion extends string,
  >({
    elements,
    layout,
    validRegions,
    oppositeRegions,
  }: {
    elements: GojibakeGlyphFragmentElement[];
    layout: TLayout;
    validRegions: readonly TRegion[];
    oppositeRegions: Record<TRegion, TRegion>;
  }): CompositeRenderFragment<TLayout, TRegion>[] {
    return elements
      .map((element): CompositeRenderFragment<TLayout, TRegion> | null => {
        const glyph = element.glyph;
        if (glyph === null) {
          return null;
        }

        const region = element.region;
        if (region === null) {
          return null;
        }

        if (!isOneOf(region, validRegions)) {
          return null;
        }

        const placement = element.placement;
        if (placement === null) {
          return null;
        }

        return this.createCompositeRenderFragment(
          layout,
          glyph,
          region,
          placement,
          oppositeRegions,
        );
      })
      .filter(
        (fragment): fragment is CompositeRenderFragment<TLayout, TRegion> => fragment !== null,
      );
  }

  private createCompositeRenderFragment<
    TLayout extends RenderFragment["layout"],
    TRegion extends string,
  >(
    layout: TLayout,
    glyph: string,
    region: TRegion,
    placement: PlacementMode,
    oppositeRegions: Record<TRegion, TRegion>,
  ): CompositeRenderFragment<TLayout, TRegion> {
    const crossed = placement === "opposite-side";

    return {
      glyph,
      layout,
      clip: crossed ? oppositeRegions[region] : region,
      place: crossed ? region : null,
      region,
    };
  }
}
