# 構築手順

ローカル LLM（Ollama）を使ったチャットアプリケーションの構築手順です。

---

## 前提条件

| ツール         | バージョン目安             |
| -------------- | -------------------------- |
| Node.js        | v20 以上                   |
| Docker Desktop | 最新版                     |
| npm            | v10 以上（Node.js に同梱） |

---

## 1. リポジトリのセットアップ

```bash
# クローン後、ルートで依存パッケージをインストール
npm install
```

npm workspaces を使用しているため、ルートで `npm install` を実行すると
`apps/backend` の依存関係も一括でインストールされます。

---

## 2. Ollama を Docker で起動する

### 2-1. コンテナの起動

```bash
docker compose up -d
```

プロジェクトルートの `docker-compose.yml` により、以下が自動で構成されます。

- **イメージ**: `ollama/ollama:latest`
- **ポート**: `11434` → ホストの `11434` にマッピング
- **データ永続化**: Docker ボリューム `ollama_data` にモデルデータを保存

### 2-2. モデルのダウンロード

```bash
docker exec ollama ollama pull gemma3:4b
```

> 初回は約 3.3GB のダウンロードが発生します。

### 2-3. 動作確認

```bash
# Ollama が起動しているか確認
curl http://localhost:11434/api/tags
```

レスポンスに `gemma3:4b` が含まれていれば OK です。

```bash
# PowerShell の場合
Invoke-RestMethod -Uri "http://localhost:11434/api/tags" | ConvertTo-Json -Depth 5
```

---

## 3. バックエンドの起動

```bash
# 開発サーバー（ホットリロード付き）
npm run dev -w backend
```

サーバーが `http://localhost:3000` で起動します。

---

## 4. 使い方

ブラウザで `http://localhost:3000` にアクセスすると、チャット画面が表示されます。

- テキストエリアにメッセージを入力
- **Enter** で送信（**Shift+Enter** で改行）
- LLM からの応答がストリーミングで表示されます

---

## プロジェクト構成

```
test-local-llm/
├── docker-compose.yml        # Ollama コンテナ定義
├── package.json              # ルート（npm workspaces）
└── apps/
    └── backend/
        ├── package.json      # バックエンド依存関係
        ├── tsconfig.json
        └── src/
            ├── index.ts      # サーバーエントリーポイント
            ├── app.ts        # Hono ルーティング & Ollama 連携
            ├── views/
            │   └── index.html  # チャット画面 HTML
            └── static/
                ├── style.css   # スタイル
                └── chat.js     # クライアントサイド JS
```

---

## 環境変数

`app.ts` 内で以下の環境変数を参照しています。未指定時はデフォルト値が使われます。

| 変数名        | デフォルト値             | 説明                  |
| ------------- | ------------------------ | --------------------- |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API のホスト   |
| `MODEL_NAME`  | `gemma3:4b`              | 使用する LLM モデル名 |

例：異なるモデルを使う場合

```bash
MODEL_NAME=llama3:8b npm run dev -w backend
```

---

## よく使うコマンド

| 操作               | コマンド                                    |
| ------------------ | ------------------------------------------- |
| コンテナ起動       | `docker compose up -d`                      |
| コンテナ停止       | `docker compose down`                       |
| コンテナログ確認   | `docker compose logs -f ollama`             |
| モデル一覧         | `docker exec ollama ollama list`            |
| モデル追加         | `docker exec ollama ollama pull <モデル名>` |
| モデル削除         | `docker exec ollama ollama rm <モデル名>`   |
| バックエンド起動   | `npm run dev -w backend`                    |
| バックエンドビルド | `npm run build -w backend`                  |

---

## トラブルシューティング

### ポート 3000 が既に使われている

```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
Stop-Process -Id <プロセスID> -Force
```

### Ollama に接続できない

1. コンテナが起動しているか確認: `docker ps --filter "name=ollama"`
2. ポートが公開されているか確認: `curl http://localhost:11434`
3. モデルが pull 済みか確認: `docker exec ollama ollama list`

### モデルの応答が遅い

- CPU のみで推論しているため、モデルサイズが大きいと遅くなります
- より軽量なモデル（例: `gemma3:1b`）に切り替えることで改善できます
