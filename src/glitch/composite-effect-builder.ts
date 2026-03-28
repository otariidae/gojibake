/** 2分割時の各断片の位置。"top"/"bottom" は縦分割、"left"/"right" は横分割に対応する */
export type DualCompositePosition = "top" | "bottom" | "left" | "right";

/**
 * クリップ方向と配置の対応関係。dual・quad どちらの断片にも共通して使う。
 * - "same-side": クリップ側と表示位置が一致する
 *   - dual 例: 上側をクリップして上に表示
 *   - quad 例: 左上象限をクリップして左上に表示
 * - "opposite-side": クリップ側と表示位置が反転する（対辺・対角へシフト配置）
 *   - dual 例: 下側をクリップして上にシフト配置
 *   - quad 例: 右下象限をクリップして左上にシフト配置
 */
export type PlacementMode = "same-side" | "opposite-side";

/** 4分割時の各象限 */
export type QuadCompositeQuadrant = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/** composite 生成の確率パラメータ */
export type CompositeProfile = {
  /** 候補インデックスのうち composite に変換する確率 */
  compositeChance: number;
  /** 各断片の文字を元文字から別グリフへ変換する確率 */
  mutateChance: number;
  /** composite を quad（2×2 の 4 分割）にする確率。それ以外は dual（2 分割）になる */
  quadChance: number;
};

/** 2 分割合成の 1 断片 */
export type DualCompositeFragment = {
  char: string;
  /** この断片が占める位置。縦分割なら "top"/"bottom"、横分割なら "left"/"right" */
  position: DualCompositePosition;
  /** クリップと配置の対応関係 */
  placement: PlacementMode;
};

/**
 * 文字セルを 2 分割して 2 つのグリフを重ねる合成エントリ。
 * 縦軸（上下）か横軸（左右）のどちらかで分割する。
 * 各断片の position・placement によってクリップ方向と配置がレンダラ側で決まる。
 */
export type DualCompositeEntry = {
  kind: "dual";
  /** 2 断片。position が "top"/"bottom" なら縦分割、"left"/"right" なら横分割 */
  fragments: [DualCompositeFragment, DualCompositeFragment];
};

/** 4 分割合成の 1 象限分の断片 */
export type QuadCompositeFragment = {
  char: string;
  /** この断片が占める象限 */
  quadrant: QuadCompositeQuadrant;
  /** クリップと配置の対応関係 */
  placement: PlacementMode;
};

/**
 * 文字セルを 2×2 の 4 象限に分割して 4 つのグリフを重ねる合成エントリ。
 * 各象限の placement によってクリップ方向と配置がレンダラ側で決まる。
 */
export type QuadCompositeEntry = {
  kind: "quad";
  /** 4 象限それぞれの断片。各要素の quadrant フィールドで象限を識別する */
  fragments: [
    QuadCompositeFragment,
    QuadCompositeFragment,
    QuadCompositeFragment,
    QuadCompositeFragment,
  ];
};

/** 文字セルへの合成エントリ（dual または quad）*/
export type CompositeEntry = DualCompositeEntry | QuadCompositeEntry;
/** テキスト内の文字インデックスから CompositeEntry へのマップ */
export type CompositeMap = Map<number, CompositeEntry>;

/**
 * mutateChance の確率で char を別グリフへ変換し、それ以外はそのまま返す。
 * composite の各断片に適用することで、一部の断片だけ字形が化ける演出を作る。
 */
function pickGlyph(
  pickGlyphForChar: (char: string) => string,
  char: string,
  mutateChance: number,
): string {
  return Math.random() < mutateChance ? pickGlyphForChar(char) : char;
}

/** "same-side" か "opposite-side" をランダムに選ぶ */
function randomPlacement(): PlacementMode {
  return Math.random() < 0.5 ? "same-side" : "opposite-side";
}

/**
 * 文字セルを縦か横の 2 分割で重ねる DualCompositeEntry を生成する。
 * 分割軸・各断片の文字・placement はすべてランダムに決まる。
 */
function createDualComposite(
  pickGlyphForChar: (char: string) => string,
  sourceChar: string,
  mutateChance: number,
): DualCompositeEntry {
  const vertical = Math.random() < 0.5;
  const [posA, posB]: [DualCompositePosition, DualCompositePosition] = vertical
    ? ["top", "bottom"]
    : ["left", "right"];

  return {
    kind: "dual",
    fragments: [
      {
        char: pickGlyph(pickGlyphForChar, sourceChar, mutateChance),
        position: posA,
        placement: randomPlacement(),
      },
      {
        char: pickGlyph(pickGlyphForChar, sourceChar, mutateChance),
        position: posB,
        placement: randomPlacement(),
      },
    ],
  };
}

/**
 * 文字セルを 2×2 の 4 象限で重ねる QuadCompositeEntry を生成する。
 * 各象限の文字・placement はランダムに決まる。
 */
function createQuadComposite(
  pickGlyphForChar: (char: string) => string,
  sourceChar: string,
  mutateChance: number,
): QuadCompositeEntry {
  return {
    kind: "quad",
    fragments: [
      {
        char: pickGlyph(pickGlyphForChar, sourceChar, mutateChance),
        quadrant: "top-left",
        placement: randomPlacement(),
      },
      {
        char: pickGlyph(pickGlyphForChar, sourceChar, mutateChance),
        quadrant: "top-right",
        placement: randomPlacement(),
      },
      {
        char: pickGlyph(pickGlyphForChar, sourceChar, mutateChance),
        quadrant: "bottom-left",
        placement: randomPlacement(),
      },
      {
        char: pickGlyph(pickGlyphForChar, sourceChar, mutateChance),
        quadrant: "bottom-right",
        placement: randomPlacement(),
      },
    ],
  };
}

/**
 * candidateIndices の中から確率的に composite 効果を割り当て、CompositeMap を返す。
 *
 * @param pickGlyphForChar - 元の文字を別グリフへ変換する関数
 * @param chars - テキスト全体を文字配列に分解したもの
 * @param candidateIndices - composite の候補となる文字インデックス群（呼び出し元で絞り込み済み）
 * @param profile - composite 生成の確率パラメータ
 * @returns インデックスから CompositeEntry へのマップ（選ばれなかったインデックスは含まない）
 */
export function buildCompositeEffects(
  pickGlyphForChar: (char: string) => string,
  chars: string[],
  candidateIndices: number[],
  profile: CompositeProfile,
): CompositeMap {
  if (candidateIndices.length === 0) {
    return new Map();
  }

  const { compositeChance: chance, mutateChance, quadChance } = profile;
  // シャッフルして処理順をランダム化することで、毎回異なる文字が composite になる
  const shuffled = candidateIndices.slice().sort(() => Math.random() - 0.5);
  const composites: CompositeMap = new Map();

  for (const index of shuffled) {
    if (Math.random() >= chance) {
      continue;
    }

    const sourceChar = chars[index];
    const composite: CompositeEntry =
      Math.random() < quadChance
        ? createQuadComposite(pickGlyphForChar, sourceChar, mutateChance)
        : createDualComposite(pickGlyphForChar, sourceChar, mutateChance);

    composites.set(index, composite);
  }

  return composites;
}
