## プロジェクト概要

文字化け演出を再現する静的ウェブサイトです。

## ビルド・テスト・Lint コマンド

このリポジトリは、Bun の HTML bundler を使って `index.html` をエントリに開発サーバー起動と本番ビルドを行う構成です。

- セットアップ: `mise install` / `bun install`
- ビルド: `bun run build`
- 開発確認: `bun run dev`
- Lint, Format: `bun run check:fix`
- 型チェック: `bun run typecheck`

単体テストは現状存在しません。変更後は少なくとも `bun run check` を通したうえで、`bun run dev` によるブラウザ確認を行います。

## 高レベルアーキテクチャ

- `index.html`
  - サンプルテキストを表示するエントリポイント
  - 表示テキストは太宰治「走れメロス」冒頭（著作権切れ）
- `styles.css`
  - 外観、文字分割レイヤー、状態クラス、`prefers-reduced-motion` を定義する
- `src/glitch.ts`
  - TypeScript のエントリポイント
  - インスタンス生成と単発 glitch 表示のライフサイクルを管理する
- `src/glitch/`
  - `DisplayState` 型：どの位置の文字をどのように化けさせるかを表す状態
  - `GlitchStateFactory` クラス：`DisplayState` を生成する
  - `buildCompositeEffects` 関数：複数の文字をどのよう組み合わせて化けさせるかを生成する
  - `GlitchRenderer` クラス：`DisplayState` をDOMに反映する
- `dist/`
  - `bun run build` で出力される配信用ファイル群

## このコードベース固有の重要規約

- 基本的にユーザー向け説明、実装中のコミュニケーション、コードコメントは日本語で記述する。英語を使うのは外部仕様や識別子に引きずられるなど明確な理由がある場合に限る
- TypeScript の編集対象は `src/glitch.ts` と `src/glitch/` 配下とし、`dist/` は生成物として扱う
- Bun のバージョン管理は `mise` を優先し、依存関係やビルドは Bun ベースで扱う
- 開発時の動作確認は `bun run dev` を基本とする
- ツール導入を明示的に行わない限り、静的配信の構成（`index.html` / `styles.css` / `src/glitch.ts`）を維持する
- 状態を持つ責務はクラスに寄せ、純粋な計算処理は関数として保つ
- ロジック変更後は `bun run check:fix` を通す
- 変更完了後は `chrome-devtools` を使ってページを開き、見た目と挙動を実際に確認してから完了とする
  - 外部ファイル読込があるため、基本は `bun run dev` を使ってローカルHTTP配信で確認する
  - chrome-devtools 使用後は必ず close_page する
- 主要なロジックを変更した後は、ドキュメンテーションを合わせて更新する
