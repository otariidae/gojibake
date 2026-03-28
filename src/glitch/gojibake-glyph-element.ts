import type { DualCompositePosition, QuadCompositeQuadrant } from "./composite-effect-builder.js";

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
  position: string;
};

type QuadRenderFragment = RenderFragment & {
  quadrant: string;
};

const FRAGMENT_TAG_NAME = "GOJIBAKE-GLYPH-FRAGMENT";
const DUAL_POSITIONS = ["top", "bottom", "left", "right"] as const;
const QUAD_QUADRANTS = ["top-left", "top-right", "bottom-left", "bottom-right"] as const;
const PLACEMENT_MODES = ["same-side", "opposite-side"] as const;

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

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

function hasDualRegionPair(regions: Set<string>): boolean {
  return (
    (regions.has("top") && regions.has("bottom")) || (regions.has("left") && regions.has("right"))
  );
}

/**
 * composite（dual / quad）グリッチ効果を表示するカスタム要素。
 *
 * - `textContent` に元文字を指定する
 * - 各断片は `<gojibake-glyph-fragment>` 子要素で指定する
 * - 子要素数が 2 のとき dual、4 のとき quad とみなす
 *   - dual の場合: 各子要素は `glyph`, `region`, `placement` を持つ
 *   - quad の場合: 各子要素は `glyph`, `region`, `placement` を持つ
 *
 * @example
 * // dual composite（上下分割）
 * // <gojibake-glyph>
 * //   あ
 * //   <gojibake-glyph-fragment glyph="い" region="top" placement="same-side"></gojibake-glyph-fragment>
 * //   <gojibake-glyph-fragment glyph="う" region="bottom" placement="opposite-side"></gojibake-glyph-fragment>
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

  private render(): void {
    const baseChar = this.textContent ?? "";
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

  /**
   * 子要素を読み取り、span 生成に必要な情報へ正規化する。
   * 子要素数が 2 なら dual、4 なら quad として扱う。それ以外は空配列を返す。
   *
   * 不正な構成は現段階では描画挙動を変えず、警告だけを出す。
   */
  private readRenderFragments(): RenderFragment[] {
    const children = Array.from(this.children);

    for (const node of children) {
      if (node.tagName !== FRAGMENT_TAG_NAME) {
        this.reportConfigurationWarning(
          `子要素には <gojibake-glyph-fragment> を使用してください。<${node.localName}> はサポートしていません。`,
        );
        return [];
      }
    }

    const elements = children.filter(
      (node): node is HTMLElement => node.tagName === FRAGMENT_TAG_NAME,
    );

    if (elements.length === 2) {
      const fragments = elements
        .map((el, index): DualRenderFragment | null => {
          const position = el.getAttribute("region");
          const placement = el.getAttribute("placement");
          if (!position) {
            this.reportFragmentAttributeWarning(index, "region", "region 属性は必須です。");
            return null;
          }
          if (!placement) {
            this.reportFragmentAttributeWarning(index, "placement", "placement 属性は必須です。");
            return null;
          }

          const glyph = el.getAttribute("glyph");
          if (glyph === null) {
            this.reportFragmentAttributeWarning(index, "glyph", "glyph 属性は必須です。");
            return null;
          }
          if (!isOneOf(position, DUAL_POSITIONS)) {
            this.reportFragmentAttributeWarning(
              index,
              "region",
              `dual 構成の region 属性は "top"・"bottom"・"left"・"right" のいずれかを指定してください。現在の値: "${position}"。`,
            );
            return null;
          }
          if (!isOneOf(placement, PLACEMENT_MODES)) {
            this.reportFragmentAttributeWarning(
              index,
              "placement",
              `placement 属性は "same-side" または "opposite-side" を指定してください。現在の値: "${placement}"。`,
            );
            return null;
          }

          const crossed = placement === "opposite-side";
          return {
            glyph,
            layout: "dual",
            clip: crossed ? OPPOSITE_POSITION[position] : position,
            place: crossed ? position : null,
            position,
          };
        })
        .filter((fragment): fragment is DualRenderFragment => fragment !== null);

      if (fragments.length !== 2) {
        return [];
      }

      const positions = new Set(fragments.map((fragment) => fragment.position));

      if (!hasDualRegionPair(positions)) {
        this.reportConfigurationWarning(
          'dual 構成の region 属性は "top" と "bottom"、または "left" と "right" を 1 つずつ指定してください。',
        );
        return [];
      }

      return fragments.map(({ position: _, ...fragment }) => fragment);
    }

    if (elements.length === 4) {
      const fragments = elements
        .map((el, index): QuadRenderFragment | null => {
          const quadrant = el.getAttribute("region");
          const placement = el.getAttribute("placement");
          if (!quadrant) {
            this.reportFragmentAttributeWarning(index, "region", "region 属性は必須です。");
            return null;
          }
          if (!placement) {
            this.reportFragmentAttributeWarning(index, "placement", "placement 属性は必須です。");
            return null;
          }

          const glyph = el.getAttribute("glyph");
          if (glyph === null) {
            this.reportFragmentAttributeWarning(index, "glyph", "glyph 属性は必須です。");
            return null;
          }
          if (!isOneOf(quadrant, QUAD_QUADRANTS)) {
            this.reportFragmentAttributeWarning(
              index,
              "region",
              `quad 構成の region 属性は "top-left"・"top-right"・"bottom-left"・"bottom-right" のいずれかを指定してください。現在の値: "${quadrant}"。`,
            );
            return null;
          }
          if (!isOneOf(placement, PLACEMENT_MODES)) {
            this.reportFragmentAttributeWarning(
              index,
              "placement",
              `placement 属性は "same-side" または "opposite-side" を指定してください。現在の値: "${placement}"。`,
            );
            return null;
          }

          const crossed = placement === "opposite-side";
          return {
            glyph,
            layout: "quad",
            clip: crossed ? OPPOSITE_QUADRANT[quadrant] : quadrant,
            place: crossed ? quadrant : null,
            quadrant,
          };
        })
        .filter((fragment): fragment is QuadRenderFragment => fragment !== null);

      if (fragments.length !== 4) {
        return [];
      }

      const quadrants = new Set(fragments.map((fragment) => fragment.quadrant));

      if (quadrants.size !== QUAD_QUADRANTS.length) {
        this.reportConfigurationWarning(
          'quad 構成の region 属性は "top-left"・"top-right"・"bottom-left"・"bottom-right" を 1 つずつ指定してください。',
        );
        return [];
      }

      return fragments.map(({ quadrant: _, ...fragment }) => fragment);
    }

    this.reportConfigurationWarning(
      `子要素数は 2 または 4 である必要があります。現在は ${elements.length} 個です。`,
    );
    return [];
  }

  private reportFragmentAttributeWarning(
    index: number,
    attributeName: string,
    message: string,
  ): void {
    this.reportConfigurationWarning(
      `${index + 1} 番目の <gojibake-glyph-fragment> の ${attributeName} 属性が不正です。${message}`,
    );
  }

  private reportConfigurationWarning(message: string): void {
    console.warn(`<gojibake-glyph>: ${message}`);
  }
}
