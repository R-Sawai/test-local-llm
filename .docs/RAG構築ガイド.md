# RAG 構築ガイド

LangChain.js と Ollama を使って、RAG（Retrieval-Augmented Generation / 検索拡張生成）を構築する方法をまとめます。

---

## RAG とは

RAG は **外部のドキュメントを検索し、その情報を LLM に与えて回答を生成** する手法です。
LLM 単体では知らない社内情報やドキュメントに基づいた回答が可能になります。

```
     ドキュメント群                ユーザーの質問
          |                           |
    [① チャンク分割]            [③ クエリ埋め込み]
          |                           |
    [② ベクトル化・保存]              |
          |                           |
          +--- ベクトルDB ←── [④ 類似検索] ──+
                    |
              関連チャンク群
                    |
              [⑤ プロンプト構築]
                    |
              [⑥ LLM で回答生成]
                    |
                  応答
```

### 従来のチャットとの違い

|                  | 通常のチャット         | RAG                      |
| ---------------- | ---------------------- | ------------------------ |
| 知識ソース       | モデルの学習データのみ | 外部ドキュメントを参照   |
| 最新情報         | 学習時点で固定         | ドキュメント更新で即反映 |
| 根拠の提示       | 不可                   | 参照元を提示可能         |
| ハルシネーション | 起きやすい             | 抑制しやすい             |

---

## 前提条件

- Node.js v20 以上
- Ollama が起動済み（`http://localhost:11434`）
- チャット用モデル + 埋め込みモデルが pull 済み

---

## セットアップ

### 1. パッケージインストール

```bash
npm install langchain @langchain/ollama @langchain/core @langchain/community
```

### 2. モデルのダウンロード

```bash
# チャット用モデル
docker exec ollama ollama pull qwen3:8b

# 埋め込みモデル（ベクトル化に必須）
docker exec ollama ollama pull nomic-embed-text
```

---

## 基本的な RAG の実装

### Step 1: ドキュメントの準備とチャンク分割

```typescript
// src/rag/documents.ts
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

/**
 * テキストをチャンク（小さな断片）に分割する
 *
 * なぜ分割するのか:
 * - LLM にはコンテキスト長の制限がある
 * - 検索精度を上げるため、意味のある単位に区切る
 */
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500, // 1チャンクの最大文字数
  chunkOverlap: 50, // チャンク間の重複文字数（文脈を保つため）
  separators: ["\n\n", "\n", "。", "、", " ", ""], // 分割の優先順位
});

/**
 * サンプルドキュメント
 * 実際のプロジェクトではファイル読み込みや DB 取得に置き換える
 */
const rawDocuments = [
  new Document({
    pageContent: `
# 社内規定：リモートワークについて

当社では週3日までリモートワークが可能です。
リモートワークを行う場合は、前日までに上長へ申請が必要です。
コアタイムは10:00〜15:00で、この時間帯はオンラインである必要があります。
リモートワーク中もSlackでの応答は30分以内に行ってください。
    `.trim(),
    metadata: { source: "社内規定.md", category: "人事" },
  }),
  new Document({
    pageContent: `
# 経費精算ガイド

経費精算は月末締め、翌月15日払いです。
領収書は電子データ（写真・PDF）で提出可能です。
5,000円以上の経費は事前申請が必要です。
交通費はICカードの利用履歴でも精算可能です。
飲食を伴う会議費は1人あたり5,000円が上限です。
    `.trim(),
    metadata: { source: "経費精算ガイド.md", category: "経理" },
  }),
  new Document({
    pageContent: `
# 開発環境セットアップ手順

1. GitHubアカウントを管理者に申請する
2. VPNクライアントをインストールする（GlobalProtect推奨）
3. 開発用PCにDocker Desktopをインストールする
4. 社内GitLabからプロジェクトをcloneする
5. .env.example を .env にコピーし、必要な値を設定する
6. docker compose up -d で開発環境を起動する

困った場合は #dev-support チャンネルで質問してください。
    `.trim(),
    metadata: { source: "開発セットアップ.md", category: "開発" },
  }),
];

/**
 * ドキュメントを分割して返す
 */
export async function loadAndSplitDocuments(): Promise<Document[]> {
  const chunks = await splitter.splitDocuments(rawDocuments);
  console.log(
    `${rawDocuments.length} 件のドキュメントを ${chunks.length} チャンクに分割しました`,
  );
  return chunks;
}
```

### Step 2: ベクトルストアの構築

```typescript
// src/rag/vectorstore.ts
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { type Document } from "@langchain/core/documents";

/**
 * Ollama の埋め込みモデルを初期化
 * テキストを数値ベクトルに変換する
 */
const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

/**
 * ドキュメントからベクトルストアを構築する
 *
 * ベクトルストアとは:
 * - テキストを数値ベクトル（埋め込み）に変換して保存する DB
 * - 類似度検索により、質問に関連するテキストを高速に見つけられる
 *
 * ここでは MemoryVectorStore（インメモリ）を使用。
 * 本番では Chroma, pgvector, Pinecone 等を使用する。
 */
export async function createVectorStore(
  documents: Document[],
): Promise<MemoryVectorStore> {
  console.log("ベクトルストアを構築中...");
  const store = await MemoryVectorStore.fromDocuments(documents, embeddings);
  console.log("ベクトルストア構築完了");
  return store;
}
```

### Step 3: RAG チェーンの構築

```typescript
// src/rag/chain.ts
import { ChatOllama } from "@langchain/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import type { MemoryVectorStore } from "langchain/vectorstores/memory";

const llm = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
  temperature: 0.3,
});

/**
 * RAG 用のプロンプトテンプレート
 *
 * ポイント:
 * - 検索結果（context）を明示的に渡す
 * - 「コンテキストに基づいて回答」と指示する
 * - 情報がない場合は「わからない」と答えさせる（ハルシネーション防止）
 */
const ragPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `あなたは社内ドキュメントに基づいて回答するアシスタントです。

以下のルールに従ってください:
- 提供されたコンテキスト（検索結果）に基づいて回答してください
- コンテキストに情報がない場合は「その情報は見つかりませんでした」と正直に答えてください
- 推測や一般知識で補完しないでください
- 回答の根拠となるドキュメント名を示してください

## コンテキスト（検索結果）
{context}`,
  ],
  new MessagesPlaceholder("chat_history"),
  ["human", "{question}"],
]);

/**
 * RAG チェーンを実行する
 */
export async function askWithRAG(
  vectorStore: MemoryVectorStore,
  question: string,
  chatHistory: { role: string; content: string }[] = [],
): Promise<{ answer: string; sources: string[] }> {
  // 1. 質問に関連するドキュメントを検索
  const relevantDocs = await vectorStore.similaritySearch(question, 3);

  // 2. 検索結果をコンテキスト文字列に変換
  const context = relevantDocs
    .map(
      (doc, i) =>
        `[${i + 1}] (出典: ${doc.metadata.source})\n${doc.pageContent}`,
    )
    .join("\n\n---\n\n");

  // 3. プロンプトを構築して LLM に送信
  const chain = ragPrompt.pipe(llm).pipe(new StringOutputParser());

  const answer = await chain.invoke({
    context,
    question,
    chat_history: chatHistory.map((m) => [m.role, m.content]).flat(),
  });

  // 4. 参照元ドキュメントを抽出
  const sources = [...new Set(relevantDocs.map((d) => d.metadata.source))];

  return { answer, sources };
}
```

### Step 4: 実行

```typescript
// src/rag/index.ts
import { loadAndSplitDocuments } from "./documents.js";
import { createVectorStore } from "./vectorstore.js";
import { askWithRAG } from "./chain.js";

async function main() {
  // 1. ドキュメントを読み込み & 分割
  const chunks = await loadAndSplitDocuments();

  // 2. ベクトルストアを構築
  const vectorStore = await createVectorStore(chunks);

  // 3. 質問してみる
  console.log("\n=== RAG に質問 ===\n");

  const questions = [
    "リモートワークは何日までできますか？",
    "経費精算の締め日はいつですか？",
    "開発環境のセットアップ方法を教えてください",
    "有給休暇の申請方法は？", // ← ドキュメントにない質問
  ];

  for (const q of questions) {
    console.log(`Q: ${q}`);
    const { answer, sources } = await askWithRAG(vectorStore, q);
    console.log(`A: ${answer}`);
    console.log(`📄 参照: ${sources.join(", ")}`);
    console.log("---\n");
  }
}

main().catch(console.error);
```

### 実行コマンド

```bash
npx tsx src/rag/index.ts
```

---

## ファイルからドキュメントを読み込む

実際のプロジェクトではファイルから読み込むことが多いでしょう。

### テキスト / Markdown ファイル

```typescript
import { readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

/**
 * 指定ディレクトリ内の .md / .txt ファイルを読み込む
 */
export async function loadFromDirectory(dirPath: string): Promise<Document[]> {
  const files = readdirSync(dirPath).filter((f) => /\.(md|txt)$/.test(f));

  const documents = files.map((file) => {
    const content = readFileSync(join(dirPath, file), "utf-8");
    return new Document({
      pageContent: content,
      metadata: { source: file },
    });
  });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  return splitter.splitDocuments(documents);
}
```

### PDF ファイル（pdf-parse が必要）

```bash
npm install pdf-parse
```

```typescript
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function loadPDF(filePath: string) {
  const loader = new PDFLoader(filePath);
  const docs = await loader.load();

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  return splitter.splitDocuments(docs);
}
```

---

## 永続化するベクトルストア

インメモリでは再起動時にデータが消えるため、永続化する方法です。

### ファイルベースの簡易永続化

```typescript
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { OllamaEmbeddings } from "@langchain/ollama";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import type { Document } from "@langchain/core/documents";

const STORE_PATH = "./vectorstore.json";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

/**
 * ベクトルストアを保存
 */
export async function saveVectorStore(store: MemoryVectorStore): Promise<void> {
  const data = store.memoryVectors.map((v) => ({
    content: v.content,
    embedding: v.embedding,
    metadata: v.metadata,
  }));
  writeFileSync(STORE_PATH, JSON.stringify(data));
  console.log(`ベクトルストアを ${STORE_PATH} に保存しました`);
}

/**
 * 保存済みベクトルストアがあれば読み込み、なければ新規作成
 */
export async function loadOrCreateVectorStore(
  documents: Document[],
): Promise<MemoryVectorStore> {
  if (existsSync(STORE_PATH)) {
    console.log("保存済みベクトルストアを読み込み中...");
    const data = JSON.parse(readFileSync(STORE_PATH, "utf-8"));
    const store = new MemoryVectorStore(embeddings);
    store.memoryVectors = data;
    return store;
  }

  console.log("新規ベクトルストアを構築中...");
  const store = await MemoryVectorStore.fromDocuments(documents, embeddings);
  await saveVectorStore(store);
  return store;
}
```

### Chroma DB を使う（本格的な永続化）

```bash
# Chroma コンテナを docker-compose.yml に追加
npm install @langchain/community chromadb
```

```yaml
# docker-compose.yml に追記
services:
  ollama:
    # ... 既存の設定 ...

  chroma:
    image: chromadb/chroma:latest
    container_name: chroma
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  ollama_data:
  chroma_data:
```

```typescript
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text",
  baseUrl: "http://localhost:11434",
});

// ドキュメントを保存
const vectorStore = await Chroma.fromDocuments(documents, embeddings, {
  collectionName: "my-documents",
  url: "http://localhost:8000",
});

// 既存のコレクションに接続
const existingStore = new Chroma(embeddings, {
  collectionName: "my-documents",
  url: "http://localhost:8000",
});
```

### pgvector を使う（PostgreSQL 拡張）

PostgreSQL に慣れている場合はこちらが自然。既存の DB 運用・バックアップ・認証がそのまま使える。

```bash
npm install pg @types/pg
```

```yaml
# docker-compose.yml に追記
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
      POSTGRES_DB: rag
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```typescript
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "admin",
  password: "password",
  database: "rag",
});

// pgvector 拡張を有効化 & テーブル作成
await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
await pool.query(`
  CREATE TABLE IF NOT EXISTS document_chunks (
    id        SERIAL PRIMARY KEY,
    content   TEXT NOT NULL,
    source    TEXT NOT NULL,
    category  TEXT,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);
// HNSW インデックスでコサイン距離検索を高速化
await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON document_chunks USING hnsw (embedding vector_cosine_ops)
`);

// ドキュメントを保存
const embeddingStr = `[${embedding.join(",")}]`;
await pool.query(
  "INSERT INTO document_chunks (content, source, embedding) VALUES ($1, $2, $3)",
  [text, sourceName, embeddingStr],
);

// コサイン距離で類似検索（<=> 演算子）
const { rows } = await pool.query(
  `SELECT id, content, source, embedding <=> $1 AS distance
   FROM document_chunks ORDER BY embedding <=> $1 LIMIT $2`,
  [embeddingStr, 3],
);
```

| 比較項目     | Chroma            | pgvector                          |
| ------------ | ----------------- | --------------------------------- |
| セットアップ | 専用コンテナ 1 つ | PostgreSQL + 拡張                 |
| 永続化       | 自動              | PostgreSQL のまま                 |
| 運用         | 独自の管理が必要  | 既存の PG 運用に乗る              |
| SQL          | 使えない          | フィルタ・JOIN が自由             |
| メタデータ   | JSON で柔軟       | カラムで型安全                    |
| スケール     | 中規模まで        | PG のスケーリングがそのまま使える |

---

## RAG を API エンドポイントとして公開する

```typescript
// src/routes/rag.ts
import { Hono } from "hono";
import { loadAndSplitDocuments } from "../rag/documents.js";
import { createVectorStore } from "../rag/vectorstore.js";
import { askWithRAG } from "../rag/chain.js";
import type { MemoryVectorStore } from "langchain/vectorstores/memory";

export const ragRouter = new Hono();

// 起動時にベクトルストアを構築
let vectorStore: MemoryVectorStore;

export async function initRAG() {
  const chunks = await loadAndSplitDocuments();
  vectorStore = await createVectorStore(chunks);
  console.log("RAG 初期化完了");
}

ragRouter.post("/ask", async (c) => {
  if (!vectorStore) {
    return c.json({ error: "RAG が初期化されていません" }, 503);
  }

  const { question, chatHistory } = await c.req.json<{
    question: string;
    chatHistory?: { role: string; content: string }[];
  }>();

  const { answer, sources } = await askWithRAG(
    vectorStore,
    question,
    chatHistory ?? [],
  );

  return c.json({ answer, sources });
});

// app.ts に追加:
// import { ragRouter, initRAG } from "./routes/rag.js";
// app.route("/api/rag", ragRouter);
// initRAG(); // サーバー起動時に初期化
```

---

## チューニングのポイント

### チャンク分割の調整

| パラメータ     | 小さい値                         | 大きい値                      |
| -------------- | -------------------------------- | ----------------------------- |
| `chunkSize`    | 検索精度↑ / 文脈不足になりやすい | 文脈保持↑ / ノイズが増える    |
| `chunkOverlap` | 処理速度↑ / 分割境界で情報欠損   | 情報欠損↓ / ストレージ使用量↑ |

推奨値:

- **一般的なドキュメント**: `chunkSize: 500`, `chunkOverlap: 50`
- **技術ドキュメント**: `chunkSize: 1000`, `chunkOverlap: 100`
- **FAQ・短文**: `chunkSize: 200`, `chunkOverlap: 20`

### 検索件数の調整

```typescript
// similaritySearch の第2引数で取得件数を指定
const docs = await vectorStore.similaritySearch(question, 3); // 上位3件
```

- 少なすぎると情報が不足する
- 多すぎるとノイズが増え、LLM のコンテキスト長を圧迫する
- **3〜5 件** が一般的な出発点

### 埋め込みモデルの選択

| モデル              | 特徴                          | 日本語 |
| ------------------- | ----------------------------- | :----: |
| `nomic-embed-text`  | 軽量・高速。まず試すならこれ  |   △    |
| `bge-m3`            | 多言語対応。日本語 RAG に最適 |   ◎    |
| `mxbai-embed-large` | 高精度。英語中心              |   △    |

日本語ドキュメントを扱う場合は `bge-m3` を推奨:

```bash
docker exec ollama ollama pull bge-m3
```

---

## RAG の評価と改善

### よくある問題と対策

| 問題                           | 原因                       | 対策                                |
| ------------------------------ | -------------------------- | ----------------------------------- |
| 関係ない情報が検索される       | チャンクが大きすぎる       | `chunkSize` を小さくする            |
| 回答が不完全                   | 必要な情報が分割されている | `chunkOverlap` を増やす             |
| 「情報がありません」と返される | 埋め込みの類似度が低い     | 埋め込みモデルを変更 / クエリを変換 |
| 回答が遅い                     | モデルが大きすぎる         | 軽量モデルに変更 / 検索件数を減らす |

### クエリ変換（検索精度の向上）

ユーザーの質問をそのまま検索するより、検索に適した形に変換すると精度が上がります。

```typescript
import { ChatOllama } from "@langchain/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const queryRewriter = ChatPromptTemplate.fromMessages([
  [
    "system",
    "ユーザーの質問を、ドキュメント検索に最適な短いキーワードやフレーズに変換してください。変換結果のみを出力してください。",
  ],
  ["human", "{question}"],
]);

const llm = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
});
const rewriteChain = queryRewriter.pipe(llm).pipe(new StringOutputParser());

// "有給って何日取れるんだっけ？" → "有給休暇 取得可能日数 上限"
const optimizedQuery = await rewriteChain.invoke({
  question: "有給って何日取れるんだっけ？",
});
```

---

## プロジェクト構成（RAG 追加後）

```
apps/backend/src/
├── index.ts              # サーバーエントリーポイント（DB 初期化 → サーバー起動）
├── app.ts                # Hono ルーティング
├── db.ts                 # PostgreSQL 接続 & pgvector 初期化
├── views/
│   └── index.html
├── static/
│   ├── style.css
│   └── chat.js
├── schemas/              # 型定義・スキーマ
│   ├── documentChunk.ts  # チャンクの DB 型
│   └── rag.ts            # API リクエスト / レスポンス型
├── repositories/         # データアクセス層
│   └── documentChunkRepository.ts  # pgvector CRUD・類似検索
├── services/             # ビジネスロジック層
│   ├── embeddingService.ts   # Ollama 埋め込みモデル呼び出し
│   ├── documentService.ts    # ドキュメント取り込み（分割→ベクトル化→DB保存）
│   └── ragService.ts         # RAG 質問応答（検索→プロンプト→LLM）
└── routes/               # API エンドポイント
    └── rag.ts            # POST /api/rag/ask, POST /api/rag/ingest
```

---

## 参考リンク

- [LangChain.js - RAG](https://js.langchain.com/docs/tutorials/rag/)
- [LangChain.js - Text Splitters](https://js.langchain.com/docs/concepts/text_splitters/)
- [LangChain.js - Vector Stores](https://js.langchain.com/docs/concepts/vectorstores/)
- [Ollama Embedding API](https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings)
- [Chroma DB](https://www.trychroma.com/)
- [pgvector](https://github.com/pgvector/pgvector)
