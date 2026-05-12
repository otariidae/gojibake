## プロジェクト概要

文字化け演出を再現する1ページの静的ウェブサイトです。リポジトリはワークスペース構成で、アプリ本体と再利用候補のカスタム要素実装が分離されています。

## ディレクトリ構成

- `apps/site/` … Bun HTML bundler で配信するデモサイト（`index.html`、`styles.css`、`src/main.ts`）
- `packages/element/` … カスタム要素・レンダラー・状態生成（`gojibake-element`。npm 公開前段のパッケージ）
- `packages/element/src/` … パッケージの実装ソース。公開面は `src/index.ts` に集約し、要素・レンダラー・状態生成を同階層に置く
- `packages/element/dist/` … `gojibake-element` の配布前提ビルド成果物。`package.json` の `exports` / `types` はここを指す
- `apps/site/dist/` … `bun run build` の出力（GitHub Pages などの配信元）
- `tsconfig.base.json` … 各ワークスペースで共有する TypeScript compilerOptions

## ビルド・テスト・Lint コマンド

ルートから実行します（ワークスペースまとめてインストール）。

- セットアップ: `mise install` / `bun install`
- ビルド: `bun run build`（Bun workspace の依存順実行で `packages/element/dist/` から `apps/site/dist/` を生成する）
- 開発確認: `bun run dev`（起動前に workspace package のビルドを実行する）
- Lint, Format: `bun run check:fix`
- 型チェック: `bun run typecheck`
- 単体テスト: `bun run test`
- 総合検証: `bun run check`

単体テストは `packages/element` 内にあります。`bun run check` は lint、ビルド、型チェック、単体テストをまとめて実行します。workspace 横断の実行は Bun の `--filter` を使い、個別 package の `prebuild` には依存先 package のビルドを書かない方針です。変更後は少なくとも `bun run check` を通したうえで、描画に関わる変更では `bun run dev` によるブラウザ確認を行います。

## 高レベルアーキテクチャ

- `apps/site/index.html`
  - サンプルテキストを表示するエントリポイント
  - 表示テキストは太宰治「走れメロス」冒頭（著作権切れ）
- `apps/site/styles.css`
  - 外観、文字分割レイヤー、状態クラス、`prefers-reduced-motion` を定義する
- `apps/site/src/main.ts`
  - TypeScript のエントリポイント
  - `registerGojibakeElements()` の呼び出しと単発 glitch 表示のライフサイクルを管理する
- `packages/element/src/`（および `packages/element/src/index.ts` の公開面）
  - `DisplayState` 型：どの位置の文字をどのように化けさせるかを表す状態
  - `GlitchStateFactory` クラス：`DisplayState` を生成する
  - `buildCompositeEffects` 関数：複数の文字をどのよう組み合わせて化けさせるかを生成する
  - `GlitchRenderer` クラス：`DisplayState` をDOMに反映する
  - `GojibakeGlyphElement` クラス：文字化け演出がある1文字を表す自律カスタム要素
  - `GojibakeGlyphFragmentElement` クラス：`GojibakeGlyphElement` の子要素として文字化け演出の特定の部位を表す
- `packages/element/package.json`
  - `exports` / `types` は `dist` を指す。サイト側も公開パッケージ境界越しに `gojibake-element` を利用する
- `tsconfig.base.json` と各 `tsconfig.json`
  - 共通の TypeScript 設定は `tsconfig.base.json` に置く
  - `packages/element/tsconfig.json` は `tsc -p .` で `dist` へ配布物を生成できる設定にする
  - 型チェックでは `tsc --noEmit -p ...` を CLI 側で付ける

## コードスタイル

- 状態を持つ責務はクラスに寄せ、純粋な計算処理は関数として保つ
- カスタム要素の設計はLiving Standardに規定されるようなHTMLらしさを重視する

## ワークフロー

- 基本的にユーザー向け説明、実装中のコミュニケーション、コードコメントは日本語で記述する
  - 英語を使うのは外部仕様や識別子に引きずられるなど明確な理由がある場合に限る
- Bun のバージョン管理は `mise` を優先し、依存関係やビルドは Bun ベースで扱う
- 開発時の動作確認は `bun run dev` を基本とする
- 変更後はLint、整形、型チェック、単体テストを通す
- 描画に関わる変更後は `chrome-devtools` を使ってページを開き、見た目と挙動を実際に確認してから完了とする
  - 外部ファイル読込があるため、基本は `bun run dev` を使ってローカルHTTP配信で確認する
  - chrome-devtools 使用後は必ず close_page する
- 主要なロジックを変更した後は、ドキュメンテーションを合わせて更新する
- コミットメッセージはconventional commits形式を基本とする
