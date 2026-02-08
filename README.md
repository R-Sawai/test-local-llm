# Test Local LLM & RAG

このリポジトリは、ローカル環境で Ollama を使用して大規模言語モデル（LLM）を動作させ、RAG (Retrieval-Augmented Generation) を実現するためのフルスタックサンプルプロジェクトです。

## 特徴

- **Frontend**: React, Vite, TailwindCSS, shadcn/ui
- **Backend**: Hono, LangChain, Postgres (pgvector)
- **AI/LLM**: Ollama (Local LLM)
- **Architecture**: Monorepo (npm workspaces)

---

## 前提条件

| ツール         | バージョン目安             |
| -------------- | -------------------------- |
| Node.js        | v20 以上                   |
| Docker Desktop | 最新版                     |
| npm            | v10 以上（Node.js に同梱） |

## 動作確認環境

| 項目       | スペック                                             |
| ---------- | ---------------------------------------------------- |
| OS         | Windows 11                                           |
| CPU        | i5-14400F                                            |
| メモリ     | 32GB                                                 |
| ストレージ | SSD                                                  |
| GPU        | RTX 4060Ti 16GB （CPUのみでも動作可能ですがGPU推奨） |

---

## 1. リポジトリのセットアップ

プロジェクトルートで依存パッケージを一括インストールします。

```bash
npm install
```

---

## 2. インフラの起動 (Docker)

Ollama と PostgreSQL (pgvector) を起動します。

### 2-1. コンテナの起動

```bash
docker compose up -d
```

以下のサービスが起動します。

- **ollama**: LLM実行エンジン (Port: `11434`)
- **postgres**: ベクトル検索対応データベース (Port: `5432`)

### 2-2. モデルのダウンロード

使用するLLMモデルをダウンロードします。

```bash
docker exec ollama ollama pull gemma3:4b
```

※ 初回およびモデル変更時はダウンロードに時間がかかります。

### 2-3. インフラ動作確認

```bash
curl http://localhost:11434/api/tags
```

レスポンスにモデル情報が含まれていれば準備完了です。

---

## 3. アプリケーションの起動

ターミナルを2つ開き、バックエンドとフロントエンドをそれぞれ起動してください。

### Terminal 1: バックエンド

```bash
npm run dev -w backend
```

- サーバー: `http://localhost:3000`
- 起動時にデータベースの初期化とサンプルデータの投入が自動的に行われます。

### Terminal 2: フロントエンド

```bash
npm run dev -w frontend
```

- クライアント: `http://localhost:5173` (ポート番号は状況により変わる場合があります)

---

## 4. 使い方

1. ブラウザでフロントエンドのURL (例: `http://localhost:5173`) にアクセスします。
2. チャット画面が表示されます。
3. メッセージを入力して送信すると、ローカルLLMからの応答が表示されます。
   - RAG機能により、バックエンドに登録されたドキュメント情報を踏まえた回答が生成される場合があります。

---

## プロジェクト構成

```
test-local-llm/
├── docker-compose.yml        # インフラ定義 (Ollama, Postgres)
├── package.json              # ルート設定 (npm workspaces)
└── apps/
    ├── backend/              # バックエンド (Hono, LangChain)
    │   ├── src/
    │   │   ├── index.ts      # エントリーポイント
    │   │   ├── services/     # ビジネスロジック (RAG, Embedding)
    │   │   └── repositories/ # DBアクセス
    │   └── ...
    └── frontend/             # フロントエンド (React, Vite)
        ├── src/
        │   ├── components/   # UIコンポーネント (shadcn/ui他)
        │   ├── hooks/        # カスタムフック (API連携)
        │   └── ...
        └── ...
```

---

## 環境変数

各アプリケーションのデフォルト設定です。必要に応じて `.env` ファイル等で上書き設定を行ってください。

| アプリ   | 変数名          | デフォルト値             | 説明                            |
| -------- | --------------- | ------------------------ | ------------------------------- |
| Backend  | `OLLAMA_HOST`   | `http://localhost:11434` | Ollama API ホスト               |
| Backend  | `POSTGRES_DB`   | `rag`                    | データベース名                  |
| Backend  | `POSTGRES_USER` | `admin`                  | DBユーザー                      |
| Frontend | `VITE_API_BASE` | `/api` (Proxy)           | バックエンドAPIのエンドポイント |

---

## よく使うコマンド

| 操作             | コマンド                         |
| ---------------- | -------------------------------- |
| インフラ一式起動 | `docker compose up -d`           |
| 停止             | `docker compose down`            |
| Backend 起動     | `npm run dev -w backend`         |
| Frontend 起動    | `npm run dev -w frontend`        |
| モデル一覧       | `docker exec ollama ollama list` |
