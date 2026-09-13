# VerifyDesk — 審査書類確認アシスト（Portfolio MVP）

金融審査向けの **書類解析・確認支援** を想定したポートフォリオ用デモです。  
実 Google Drive / OCR API には接続せず、検出待機・差分再解析・照合・前回銀行資料比較・JSON出力・メール通知の操作フローをブラウザ上で再現します。

## Live demo

https://kingenchiato.github.io/ai-ocr-d/

## できること

1. Drive フォルダ相当の申込キュー表示（読取専用・fileId / 更新日時管理）
2. 追加完了の安定待機 → 自動解析のデモ（「Drive を検出」）
3. 請求書・銀行明細・発注書・取引証拠などの分類・項目抽出表示
4. 不鮮明 / 欠落 / 重複 / 不一致を **要確認** として提示（不正の断定なし）
5. 前回提出の銀行資料との比較（口座・残高連続・ページ順・欠落期間）
6. 解析結果 JSON の表示・コピー
7. 審査担当向けメール通知ログ

## ローカル起動

```bash
npm install
npm run dev
```

本番ビルド:

```bash
npm run build
npm run preview
```

GitHub Pages では `base: '/ai-ocr-d/'` でデプロイされます。

## 技術スタック

- React 19 + TypeScript + Vite
- サンプルデータによる OCR / 照合ロジックのフロント実装
- GitHub Actions → GitHub Pages 自動デプロイ

## 本番化メモ（参考）

| 領域 | 推奨 |
|------|------|
| OCR | Document AI / Azure Document Intelligence 等 |
| LLM 補完 | 構造化抽出・照合説明（学習利用オフ設定） |
| Drive | 読取専用サービスアカウント + Changes API |
| 状態管理 | fileId + modifiedTime の処理済みストア |
| 一時ファイル | 処理後削除・保存期間の明示 |

本リポジトリは提案内容そのものの実装ではなく、類似ドメインでの実装力を示す MVP です。
