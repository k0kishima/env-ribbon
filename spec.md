# env-ribbon — 実装仕様書

このファイルは新規リポジトリで npm パッケージ `env-ribbon` をゼロから実装するための自己完結した仕様書である。元となる実装は別プロジェクト（blindfold-chess）の `EnvironmentRibbon` コンポーネントで、そこで実運用により検証済みの判定ロジックと設計判断をこの仕様に転記してある。**このファイル以外の参照は不要**。

## 1. パッケージ概要

- **名前**: `env-ribbon`（unscoped、npm レジストリで空きであることは確認済み）
- **公開アカウント**: [k0kishima](https://www.npmjs.com/~k0kishima)
- **ライセンス**: MIT
- **初期バージョン**: 0.1.0
- **What**: Next.js App Router アプリの画面右上（または左上）に、現在のデプロイ環境を示す斜めリボン（LOCAL / PREVIEW）を表示するコンポーネント。本番環境では絶対に表示されない。開発者向けツールなので表示は英語固定、i18n なし。
- **Why**: 「今見ているのは本番か、preview か、ローカルか」を一目で判別するため。Vercel の preview は本番と URL 以外見分けがつかず、誤操作事故のもとになる。
- **ランタイム依存**: `react` のみ（peerDependency）。`next` は import しない（環境変数を読むだけなので依存不要 — これはパッケージの売りであり README に明記する）。CSS フレームワーク非依存（Tailwind 不要）。

## 2. アーキテクチャ

React Server Components 前提の 2 コンポーネント分割。この分割は意図的な設計であり崩さないこと:

- **`EnvironmentRibbon`（Server Component、ディレクティブなし）** — `process.env.VERCEL_ENV` / `process.env.NODE_ENV` を読んで表示可否と variant を決定する。環境変数の読み取りはサーバでのみ確実なので、ここで解決する。`VERCEL_ENV` を `NEXT_PUBLIC_*` 経由でクライアントに漏らさず、解決済みの小さな `variant` 文字列だけを client に渡す。
- **`EnvironmentRibbonClient`（Client Component、`"use client"` 必須）** — dismiss 状態（`useState`）と interactive な `<button>` を持つ描画側。

利用者はルートレイアウトの `<body>` 内に `<EnvironmentRibbon />` を 1 行置くだけ。

## 3. 環境判定ロジック（このパッケージの価値の中心）

以下の順序・条件は実運用で罠を踏んで固まったものであり、**一言一句この通りに実装する**こと:

1. `VERCEL_ENV === 'production'` → **非表示**（本番では絶対に表示しない。ハードゲート）
2. `NODE_ENV === 'test'` → **非表示**（Playwright / E2E テストへの干渉を防ぐ）
3. `VERCEL_ENV === 'preview'` → **`PREVIEW`**（黄色リボン）
   - ⚠️ Vercel の preview ビルドは `NODE_ENV === 'production'` で動く。よってここで NODE_ENV を条件に加えてはならない — preview と production を区別できるのは `VERCEL_ENV` だけ。
4. `(VERCEL_ENV === 'development' || VERCEL_ENV === undefined) && NODE_ENV !== 'production'` → **`LOCAL`**（緑リボン）
   - `NODE_ENV !== 'production'` ガードの理由: self-hosted / 非 Vercel の本番ビルドは `VERCEL_ENV` 未設定 + `NODE_ENV=production` になる。このガードがないとそこで「LOCAL」が誤表示される。
5. 上記以外 → **非表示**（フェイルセーフ: 判定できないときは出さない）

### 3.1 `./detect` サブパス（純粋関数 core）

判定ロジックは環境変数を直接読まない**純粋関数**として独立モジュールに置き、サブパス export する。将来の React Native 版パッケージ（別パッケージとして出す予定）がこの関数だけを再利用するため:

```ts
// src/detect.ts — 依存ゼロ、プラットフォーム非依存
export type DetectedVariant = 'LOCAL' | 'PREVIEW';

export interface EnvSignals {
  vercelEnv?: string; // process.env.VERCEL_ENV
  nodeEnv?: string;   // process.env.NODE_ENV
}

export function detectEnvironmentVariant(signals: EnvSignals): DetectedVariant | null;
```

Server Component 側は `detectEnvironmentVariant({ vercelEnv: process.env.VERCEL_ENV, nodeEnv: process.env.NODE_ENV })` を呼ぶ薄いラッパになる。

## 4. Public API

```tsx
export function EnvironmentRibbon(props?: {
  /**
   * 明示指定。指定すると auto 検出を完全にバイパスして常に表示する
   * （production ハードゲートも NODE_ENV=test ガードも効かない —
   * 表示責任は利用者に移る）。非 Vercel ホスト（Netlify / Cloudflare /
   * self-hosted）で staging 等を表示するための口。
   * 例: <EnvironmentRibbon variant="STAGING" />
   * 表示ラベル = この文字列そのもの（大文字化などの加工はしない）。
   */
  variant?: string;

  /**
   * variant 名 → 背景色のマップ。デフォルトにマージされる。
   * デフォルト: { LOCAL: '#22c55e', PREVIEW: '#facc15' }
   * マップにない variant（明示指定の 'STAGING' 等）は '#6b7280'（グレー）。
   */
  colors?: Record<string, string>;

  position?: 'top-right' | 'top-left'; // デフォルト 'top-right'
  zIndex?: number;                     // デフォルト 60
});
```

- 文字色は常に white（黄色地に白はコントラスト的に弱いが、deploy-preview リボンの業界慣習に合わせた意図的な選択。元実装から踏襲）。
- dismiss は常に有効（props で無効化できなくてよい）。クリック/タップ/Enter/Space で消える。**状態は React メモリのみ** — リロードで復活する。storage 永続化はしない（意図的）。
- `variant` prop 未指定かつ検出結果 null のときは `null` を返す（DOM に何も出さない）。

### 4.1 DOM 上の公開契約

- ルート要素はセマンティックな `<button type="button">`（キーボード操作を無料で得るため。div+onClick にしない）
- `data-testid="environment-ribbon"` — **E2E から参照される公開契約**。README に明記し、変更は semver major とする
- `aria-label={"Dismiss " + variant + " environment indicator"}`

## 5. スタイリング

**Tailwind 依存を外し、インライン style + 最小の `<style>` タグ**で実装する。利用側リポジトリの CSS 設定（Tailwind の有無・バージョン・content スキャン設定）に一切要求を出さないため。

### 5.1 ジオメトリ（元実装の Tailwind クラスからの換算値）

`<button>`（ヒットエリア兼クリッピングボックス）:

```
position: fixed; top: 0; right: 0（top-left 時は left: 0）;
width: 96px; height: 96px; overflow: hidden;
background: transparent; border: 0; padding: 0; cursor: pointer;
z-index: {props.zIndex ?? 60};
```

`<span>`（斜め帯本体）:

```
position: absolute; top: 18px; right: -36px; width: 140px;
transform: rotate(45deg);
（top-left 時: left: -36px; transform: rotate(-45deg);）
text-align: center; font-size: 11px; font-weight: 700;
letter-spacing: 0.1em; padding: 4px 0; color: #fff;
background: {resolved color};
```

### 5.2 インライン style で書けないもの（重要）

media query と擬似クラスはインライン style 属性で表現できない。以下の 2 つは退行させないこと:

- **`@media print { display: none }`** — これがないと印刷物にリボンが刷り込まれる
- **`:focus-visible { outline: 2px solid #fff; outline-offset: 2px }`** — キーボードフォーカスの可視化（a11y）

対応: client component が固定クラス名（例 `env-ribbon`）を持ち、同コンポーネントが小さな `<style>` タグを 1 つ描画してこの 2 ルールだけをそこに置く。想定利用は 1 アプリ 1 インスタンスなので `<style>` の重複除去機構は不要（複数マウント時に `<style>` が重複しても実害なし、とコメントに書いておく）。

### 5.3 既知の制約（README に記載）

strict CSP（`style-src` / `style-src-attr` で `unsafe-inline` を禁止している環境）ではインライン style と `<style>` タグが弾かれる。開発/preview 専用の表示なので実害はほぼないが、制約として一行明記する。

## 6. ビルド・パッケージング

- **ビルドは素の `tsc`**（バンドラ不使用）。理由: tsup 等のバンドラは `"use client"` ディレクティブを落とす罠がある。依存ゼロ・数ファイルのパッケージにバンドラは不要で、tsc は directive をそのまま保持する。
- **ESM only** + `.d.ts` 生成。CJS 併売はしない。
- tsconfig: `"jsx": "react-jsx"`, `"module"`/`"moduleResolution"` は ESM 出力になるよう設定（例: `NodeNext`）。`declaration: true`。
- 出力は JSX コンパイル済みの平易な JS になるので、利用側に `transpilePackages` を要求しない。

### 6.1 package.json 要点

```jsonc
{
  "name": "env-ribbon",
  "version": "0.1.0",
  "license": "MIT",
  "author": "k0kishima",
  "type": "module",
  "sideEffects": false,
  "files": ["dist"],
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./detect": { "types": "./dist/detect.d.ts", "default": "./dist/detect.js" }
  },
  "peerDependencies": { "react": "^18.0.0 || ^19.0.0" },
  "keywords": ["nextjs", "vercel", "environment", "ribbon", "badge", "preview", "banner", "react-server-components"]
  // repository / bugs / homepage は新リポジトリの URL 確定後に記入
}
```

### 6.2 ソース構成

```
src/
  detect.ts                    // 純粋関数（§3.1）。React import なし
  EnvironmentRibbon.tsx        // Server Component。ディレクティブなし。detect を呼ぶ薄いラッパ
  EnvironmentRibbonClient.tsx  // "use client" を 1 行目に。dismiss 状態と描画
  index.ts                     // EnvironmentRibbon と型を re-export（Client は直接 export しない）
```

## 7. テスト（vitest）

1. **`detect.ts` の全組み合わせマトリクス** — §3 の 5 条件を表形式（`it.each`）で網羅。特に「Vercel preview は NODE_ENV=production で来る」「self-hosted 本番（VERCEL_ENV 未設定 + NODE_ENV=production）で LOCAL を出さない」の 2 ケースは必ず含める。
2. **Client コンポーネント**（@testing-library/react + jsdom）— 描画されること、クリックで消えること、`data-testid` / `aria-label` / `type="button"` の存在、position/colors/zIndex props の反映。
3. **ビルド出力の directive 検査**（静的テスト）— `dist/EnvironmentRibbonClient.js` の先頭が `"use client"` で始まることを assert する。ビルド設定変更でディレクティブが落ちる退行の回帰ガード（これが落ちると利用側で実行時エラーになり、原因究明が難しい）。

## 8. README（英語で書く）の必須項目

1. What / Why（スクリーンショットまたは GIF プレースホルダ）
2. Install + Quick start（Next.js App Router のルートレイアウト `<body>` 内に置く例）
3. **複数ルートレイアウトを持つアプリへの注意**: `<html>`/`<body>` を出すレイアウトが複数ある場合（route group ごとの root layout 等）、**全部**にマウントしないと一部 URL でリボンが消える。元プロジェクトで実際に起きたバグなので Tips として書く
4. 検出ルールの表（§3。Vercel preview の NODE_ENV 罠も注記）
5. 非 Vercel ホストでの使い方（`variant` prop 明示。フェイルセーフがバイパスされ表示責任が利用者に移ることを明記）
6. Props リファレンス
7. `env-ribbon/detect` サブパスの説明（プラットフォーム非依存の純粋関数であること）
8. Testing: `data-testid="environment-ribbon"` が公開契約であること、`NODE_ENV=test` で自動非表示になること
9. strict CSP の制約（§5.3）
10. Scope: Next.js / React (RSC) 向けであること。React Native は対象外（将来別パッケージ予定）と明記
11. Server Component としてマウントすること（client component ツリーに import すると環境変数が読めず動作しない）

## 9. Definition of Done

- [ ] `pnpm build`（tsc）が通り、`dist/` に ESM + `.d.ts` が出る
- [ ] `dist/EnvironmentRibbonClient.js` の 1 行目に `"use client"` が保持されている
- [ ] `pnpm test` 全パス（§7 の 3 種）
- [ ] `npm pack --dry-run` で tarball に `dist/` と README/LICENSE のみ含まれることを確認
- [ ] README が §8 の項目を満たす
- [ ] publish はしない（ユーザーが `k0kishima` アカウントで手動実行する）

## 10. スコープ外（やらないこと）

- React Native 対応（将来 `env-ribbon-native` として別パッケージで出す方針が確定済み。その際 `./detect` だけを再利用する）
- dismiss 状態の永続化（storage 不使用は意図的）
- i18n（開発者向けツールなので英語固定）
- CJS ビルド
- 検出結果 variant の追加（LOCAL / PREVIEW の 2 値。それ以外は `variant` prop 明示で対応）
