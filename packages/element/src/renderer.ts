import type { CompositeEntry } from "./composite-effect-builder.js";
import type { GojibakeGlyphFragmentElement } from "./gojibake-glyph-fragment-element.js";
import type { CharEffectState } from "./replacement-effect-builder.js";
import type { DisplayState } from "./state-factory.js";

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
   * `source` の各文字を変換して描画する。composite エフェクトは `<gojibake-glyph>` カスタム要素、
   * 通常文字と置換文字は `.char` スパンとして生成する。
   * 改行文字は `<br>` 要素に変換する。
   *
   * @example
   * // source = "AB" で A が dual composite、B が通常文字の場合:
   * // <gojibake-glyph>
   * //   <gojibake-glyph-fragment region="top" placement="same-side">い</gojibake-glyph-fragment>
   * //   <gojibake-glyph-fragment region="bottom" placement="opposite-side">う</gojibake-glyph-fragment>
   * // </gojibake-glyph>
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
   * composite エフェクトの場合は `<gojibake-glyph>` カスタム要素を返す。
   * 通常文字・置換文字は `.char` スパンを返す。
   * 改行文字は `<br>` 要素を返す。
   *
   * @param sourceChar 元テキストの1文字
   * @param effect 適用するエフェクト（省略時は通常表示）
   */
  private buildCharNode(sourceChar: string, effect?: CharEffectState): HTMLElement {
    if (sourceChar === "\n") {
      return document.createElement("br");
    }

    if (effect?.kind === "composite") {
      return this.buildCompositeCharElement(effect.composite);
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
    return node;
  }

  /**
   * composite エフェクトを表す `<gojibake-glyph>` カスタム要素を生成する。
   *
   * 各断片は `<gojibake-glyph-fragment>` 子要素として構築する。
   * 1 文字セルの寸法決定と clip/place への変換はカスタム要素側で行う。
   *
   * @param composite 適用するcompositeエントリ
   */
  private buildCompositeCharElement(composite: CompositeEntry): HTMLElement {
    const el = document.createElement("gojibake-glyph");

    if (composite.kind === "dual") {
      composite.fragments.forEach((fragment) => {
        const fragmentEl = document.createElement(
          "gojibake-glyph-fragment",
        ) as GojibakeGlyphFragmentElement;
        fragmentEl.textContent = fragment.char;
        fragmentEl.region = fragment.position;
        fragmentEl.placement = fragment.placement;
        el.appendChild(fragmentEl);
      });
    } else {
      composite.fragments.forEach((fragment) => {
        const fragmentEl = document.createElement(
          "gojibake-glyph-fragment",
        ) as GojibakeGlyphFragmentElement;
        fragmentEl.textContent = fragment.char;
        fragmentEl.region = fragment.quadrant;
        fragmentEl.placement = fragment.placement;
        el.appendChild(fragmentEl);
      });
    }

    return el;
  }
}
