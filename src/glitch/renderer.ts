import type {
  CompositeEntry,
  DualCompositeEntry,
  DualCompositePosition,
  QuadCompositeEntry,
  QuadCompositeQuadrant,
} from "./composite-effect-builder.js";
import type { CharEffectState } from "./replacement-effect-builder.js";
import type { DisplayState } from "./state-factory.js";

type HalfClip = "top" | "bottom" | "left" | "right";
type HalfPlace = HalfClip;

type CompositeLayer =
  | {
      variant: "half";
      char: string;
      clip: HalfClip;
      place?: HalfPlace;
    }
  | {
      variant: "quad";
      char: string;
      clip: QuadCompositeQuadrant;
      place?: QuadCompositeQuadrant;
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

export class GlitchRenderer {
  private readonly source: string;
  private readonly target: HTMLElement;

  /**
   * @param source グリッチ演出の元となるテキスト
   * @param target グリッチ演出を描画する対象のDOM要素
   */
  public constructor({ source, target }: { source: string; target: HTMLElement }) {
    this.source = source;
    this.target = target;
  }

  /**
   * `DisplayState` に基づいて対象DOM要素を再構築する。
   *
   * `source` の各文字を `.char` スパンに変換し、`effects` に登録された文字インデックスに対して
   * 置換文字またはcompositeレイヤーを適用する。
   * 改行文字は `<br>` 要素に変換する。
   * 空白文字にはcompositeレイヤーを適用しない。
   *
   * @example
   * // source = "AB" で A が dual composite、B が通常文字の場合:
   * // <span class="char is-composite">
   * //   <span class="char__base">A</span>
   * //   <span class="char__half char__half--top ...">あ</span>
   * //   <span class="char__half char__half--bottom ...">い</span>
   * // </span>
   * // <span class="char">
   * //   <span class="char__base">B</span>
   * // </span>
   */
  public renderDisplayState({ effects }: DisplayState): void {
    const chars = [...this.source];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < chars.length; index += 1) {
      const char = chars[index];
      const effect = effects.get(index);

      const node = this.buildCharNode(char, effect);

      fragment.appendChild(node);
    }

    this.target.textContent = "";
    this.target.appendChild(fragment);
  }

  /**
   * 1文字分のDOM要素を生成する。
   *
   * @example
   * // buildCharNode('A') が返す構造
   * // <span class="char">
   * //   <span class="char__base">A</span>
   * // </span>
   *
   * @param sourceChar 元テキストの1文字
   * @param effect 適用するエフェクト（省略時は通常表示）
   * @returns `.char` クラスを持つスパン要素、または改行の場合は `<br>` 要素
   */
  private buildCharNode(sourceChar: string, effect?: CharEffectState): HTMLElement {
    if (sourceChar === "\n") {
      return document.createElement("br");
    }

    // replacement の場合は置換後の文字、それ以外は元の文字を表示する
    const displayChar = effect?.kind === "replacement" ? effect.replacementChar : sourceChar;

    const node = document.createElement("span");
    const base = document.createElement("span");
    node.className = "char";
    base.className = "char__base";
    // 空白文字は見た目上スペースを維持するためにノーブレークスペースに置換する
    base.textContent = displayChar === " " ? "\u00a0" : displayChar;
    node.appendChild(base);

    if (effect?.kind === "composite") {
      node.classList.add("is-composite");
      this.appendCompositeLayers(node, effect.composite);
    }

    return node;
  }

  /**
   * `CompositeEntry` を共通のレイヤー定義へ正規化してからノードに追加する。
   *
   * `dual` / `quad` の差分はレイヤー定義の生成に閉じ込め、DOM 構築は共通処理に寄せる。
   *
   * @param node compositeレイヤーを追加する `.char` スパン要素
   * @param composite 適用するcompositeエントリ
   */
  private appendCompositeLayers(node: HTMLSpanElement, composite: CompositeEntry): void {
    const layers = this.buildCompositeLayers(composite);
    const df = document.createDocumentFragment();

    for (const layer of layers) {
      df.appendChild(this.createCompositeLayerNode(layer));
    }

    node.appendChild(df);
  }

  private buildCompositeLayers(composite: CompositeEntry): CompositeLayer[] {
    switch (composite.kind) {
      case "dual":
        return this.buildDualCompositeLayers(composite);
      case "quad":
        return this.buildQuadCompositeLayers(composite);
    }
  }

  /**
   * 2文字を上下または左右に分割した dual composite を共通レイヤー定義へ変換する。
   *
   * 各断片は独立して `halving` を持ち、`"aligned"`（揃え合成）か `"crossed"`（交差合成）を選ぶ。
   *
   * `halving="aligned"`（揃え合成）: 各断片の自分側のハーフをそのまま表示する。
   * - 上断片: 上半分 / 下断片: 下半分 / 左断片: 左半分 / 右断片: 右半分
   *
   * `halving="crossed"`（交差合成）: 各断片の逆側のハーフをシフトして配置することで、
   * 「2文字が衝突して1文字幅に潰れた」ような視覚効果を作る。
   * - 上断片: 下半分を上へシフト（clip-bottom + place-top）
   * - 下断片: 上半分を下へシフト（clip-top + place-bottom）
   *
   * @param composite 適用するdual compositeエントリ
   */
  private buildDualCompositeLayers(composite: DualCompositeEntry): CompositeLayer[] {
    return composite.fragments.map((fragment) => {
      const crossed = fragment.halving === "crossed";
      return {
        variant: "half",
        char: fragment.char,
        clip: crossed ? OPPOSITE_POSITION[fragment.position] : fragment.position,
        place: crossed ? fragment.position : undefined,
      };
    });
  }

  /**
   * 4象限に分割した quad composite を共通レイヤー定義へ変換する。
   *
   * 各象限のフラグメントは独立して `halving` を持ち、`"aligned"`（揃え合成）か `"crossed"`（交差合成）を選ぶ。
   *
   * `halving="aligned"`（揃え合成）: 各象限のグリフの対応する1/4領域をそのまま表示する。
   * - 左上エリア: topLeftのグリフの左上部分
   *
   * `halving="crossed"`（交差合成）: 各象限のグリフの逆側1/4領域を切り出し、placeでシフトして配置する。
   * - 左上エリア: topLeftのグリフの右下部分（clip-bottom-right + place-top-left）
   *
   * @param composite 適用するquad compositeエントリ
   */
  private buildQuadCompositeLayers(composite: QuadCompositeEntry): CompositeLayer[] {
    return composite.fragments.map((fragment) => {
      const crossed = fragment.halving === "crossed";
      return {
        variant: "quad",
        char: fragment.char,
        clip: crossed ? OPPOSITE_QUADRANT[fragment.quadrant] : fragment.quadrant,
        place: crossed ? fragment.quadrant : undefined,
      };
    });
  }

  private createCompositeLayerNode(layer: CompositeLayer): HTMLSpanElement {
    const span = document.createElement("span");
    const baseClassName = layer.variant === "half" ? "char__half" : "char__quad";
    span.classList.add(baseClassName, `${baseClassName}--clip-${layer.clip}`);

    if (layer.place) {
      span.classList.add(`${baseClassName}--place-${layer.place}`);
    }

    span.textContent = layer.char;
    return span;
  }
}
