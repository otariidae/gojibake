import type {
  DualCompositePosition,
  PlacementMode,
  QuadCompositeQuadrant,
} from "./composite-effect-builder.js";

/** span 生成直前の正規化済みフラグメント */
type RenderFragment = {
  glyph: string;
  layout: "dual" | "quad";
  /** data-clip に流し込む値 */
  clip: string;
  /** data-place に流し込む値。same-side のときは null */
  place: string | null;
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

    const base = document.createElement("span");
    base.className = "base";
    base.textContent = baseChar === " " ? "\u00a0" : baseChar;

    const df = document.createDocumentFragment();
    df.appendChild(base);

    for (const fragment of this.readRenderFragments()) {
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
   */
  private readRenderFragments(): RenderFragment[] {
    const elements = Array.from(this.children).filter(
      (node): node is HTMLElement => node.tagName === "GOJIBAKE-GLYPH-FRAGMENT",
    );

    if (elements.length === 2) {
      return elements
        .map((el): RenderFragment | null => {
          const position = el.getAttribute("region") as DualCompositePosition | null;
          const placement = el.getAttribute("placement") as PlacementMode | null;
          if (!position || !placement) {
            return null;
          }
          const crossed = placement === "opposite-side";
          return {
            glyph: el.getAttribute("glyph") ?? "",
            layout: "dual",
            clip: crossed ? OPPOSITE_POSITION[position] : position,
            place: crossed ? position : null,
          };
        })
        .filter((f): f is RenderFragment => f !== null);
    }

    if (elements.length === 4) {
      return elements
        .map((el): RenderFragment | null => {
          const quadrant = el.getAttribute("region") as QuadCompositeQuadrant | null;
          const placement = el.getAttribute("placement") as PlacementMode | null;
          if (!quadrant || !placement) {
            return null;
          }
          const crossed = placement === "opposite-side";
          return {
            glyph: el.getAttribute("glyph") ?? "",
            layout: "quad",
            clip: crossed ? OPPOSITE_QUADRANT[quadrant] : quadrant,
            place: crossed ? quadrant : null,
          };
        })
        .filter((f): f is RenderFragment => f !== null);
    }

    return [];
  }
}
