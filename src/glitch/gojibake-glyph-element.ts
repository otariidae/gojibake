import type {
  DualCompositePosition,
  PlacementMode,
  QuadCompositeQuadrant,
} from "./composite-effect-builder.js";

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

.char__base {
  display: block;
  text-align: center;
  opacity: 0;
}

.char__half {
  --half-shift-x: 0em;
  --half-shift-y: 0em;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  color: inherit;
  text-shadow: inherit;
  transform: translate(var(--half-shift-x), var(--half-shift-y));
}

.char__half--clip-left  { clip-path: inset(0 50% 0 0); }
.char__half--clip-right { clip-path: inset(0 0 0 50%); }
.char__half--clip-top   { clip-path: inset(0 0 50% 0); }
.char__half--clip-bottom { clip-path: inset(50% 0 0 0); }

.char__half--place-top    { --half-shift-y: -0.5em; }
.char__half--place-bottom { --half-shift-y: 0.5em; }
.char__half--place-left   { --half-shift-x: -0.5em; }
.char__half--place-right  { --half-shift-x: 0.5em; }

.char__quad {
  --quad-shift-x: 0ch;
  --quad-shift-y: 0em;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  color: inherit;
  text-shadow: inherit;
  transform: translate(var(--quad-shift-x), var(--quad-shift-y));
}

.char__quad--clip-top-left    { clip-path: inset(0 50% 50% 0); }
.char__quad--clip-top-right   { clip-path: inset(0 0 50% 50%); }
.char__quad--clip-bottom-left { clip-path: inset(50% 50% 0 0); }
.char__quad--clip-bottom-right { clip-path: inset(50% 0 0 50%); }

.char__quad--place-top-left    { --quad-shift-x: -0.5em; --quad-shift-y: -0.5em; }
.char__quad--place-top-right   { --quad-shift-x: 0.5em;  --quad-shift-y: -0.5em; }
.char__quad--place-bottom-left { --quad-shift-x: -0.5em; --quad-shift-y: 0.5em; }
.char__quad--place-bottom-right { --quad-shift-x: 0.5em; --quad-shift-y: 0.5em; }
`;

type DualFragmentAttributes = {
  glyph: string;
  position: DualCompositePosition;
  placement: PlacementMode;
};

type QuadFragmentAttributes = {
  glyph: string;
  quadrant: QuadCompositeQuadrant;
  placement: PlacementMode;
};

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
  }

  public connectedCallback(): void {
    this.render();
  }

  private render(): void {
    const baseChar = this.textContent ?? "";
    const fragmentElements = this.readFragmentElements();

    const style = document.createElement("style");
    style.textContent = SHADOW_CSS;

    const base = document.createElement("span");
    base.className = "char__base";
    base.textContent = baseChar === " " ? "\u00a0" : baseChar;

    const df = document.createDocumentFragment();
    df.appendChild(style);
    df.appendChild(base);

    if (fragmentElements.length === 2) {
      for (const fragment of this.readDualFragments()) {
        const crossed = fragment.placement === "opposite-side";
        const clip = crossed ? OPPOSITE_POSITION[fragment.position] : fragment.position;
        const place = crossed ? fragment.position : null;

        const span = document.createElement("span");
        span.classList.add("char__half", `char__half--clip-${clip}`);
        if (place) {
          span.classList.add(`char__half--place-${place}`);
        }
        span.textContent = fragment.glyph;
        df.appendChild(span);
      }
    } else if (fragmentElements.length === 4) {
      for (const fragment of this.readQuadFragments()) {
        const crossed = fragment.placement === "opposite-side";
        const clip = crossed ? OPPOSITE_QUADRANT[fragment.quadrant] : fragment.quadrant;
        const place = crossed ? fragment.quadrant : null;

        const span = document.createElement("span");
        span.classList.add("char__quad", `char__quad--clip-${clip}`);
        if (place) {
          span.classList.add(`char__quad--place-${place}`);
        }
        span.textContent = fragment.glyph;
        df.appendChild(span);
      }
    }

    this.shadow.replaceChildren(df);
  }

  private readFragmentElements(): HTMLElement[] {
    return Array.from(this.children).filter(
      (node): node is HTMLElement => node.tagName === "GOJIBAKE-GLYPH-FRAGMENT",
    );
  }

  private readDualFragments(): DualFragmentAttributes[] {
    return this.readFragmentElements()
      .map((fragment) => {
        const position = fragment.getAttribute("region") as DualCompositePosition | null;
        const placement = fragment.getAttribute("placement") as PlacementMode | null;

        if (!position || !placement) {
          return null;
        }

        return {
          glyph: fragment.getAttribute("glyph") ?? "",
          position,
          placement,
        };
      })
      .filter((fragment): fragment is DualFragmentAttributes => fragment !== null);
  }

  private readQuadFragments(): QuadFragmentAttributes[] {
    return this.readFragmentElements()
      .map((fragment) => {
        const quadrant = fragment.getAttribute("region") as QuadCompositeQuadrant | null;
        const placement = fragment.getAttribute("placement") as PlacementMode | null;

        if (!quadrant || !placement) {
          return null;
        }

        return {
          glyph: fragment.getAttribute("glyph") ?? "",
          quadrant,
          placement,
        };
      })
      .filter((fragment): fragment is QuadFragmentAttributes => fragment !== null);
  }
}
