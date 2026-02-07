# LangChain Agent 構築ガイド

LangChain.js と Ollama を使って、ツール呼び出しが可能な Agent を構築する方法をまとめます。

---

## Agent とは

Agent は LLM が **自律的にツール（関数）を選択・実行** して回答を生成する仕組みです。
通常のチャットとの違いは、LLM が「この質問に答えるにはどの道具を使えばいいか」を自分で判断する点です。

```
ユーザー: "今日の東京の天気は？"
    ↓
Agent (LLM): 天気を調べるには weather ツールを使おう
    ↓
Tool 実行: getWeather("東京") → "晴れ、最高気温 15℃"
    ↓
Agent (LLM): 結果をもとに回答を生成
    ↓
応答: "今日の東京は晴れで、最高気温は 15℃ です。"
```

---

## 前提条件

- Node.js v20 以上
- Ollama が起動済み（`http://localhost:11434`）
- ツール呼び出し対応モデル（`qwen3:8b` 以上推奨）

> **注意**: ツール呼び出し（Function Calling）は軽量モデルだと精度が低い場合があります。
> `qwen3:8b` や `llama3.1:8b` 以上を推奨します。

---

## セットアップ

### 1. パッケージインストール

```bash
npm install langchain @langchain/ollama @langchain/core @langchain/langgraph zod
```

### 2. モデルのダウンロード

```bash
docker exec ollama ollama pull qwen3:8b
```

---

## 基本的な Agent の作成

### Step 1: ツールを定義する

```typescript
// src/agent/tools.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 計算ツール - 数式を評価して結果を返す
 */
export const calculatorTool = tool(
  async ({ expression }): Promise<string> => {
    try {
      // 簡易的な数式評価（本番では mathjs 等を使用）
      const result = Function(`"use strict"; return (${expression})`)();
      return `計算結果: ${result}`;
    } catch {
      return `計算エラー: "${expression}" は無効な数式です`;
    }
  },
  {
    name: "calculator",
    description: "数学の計算を実行します。四則演算や数式を入力してください。",
    schema: z.object({
      expression: z
        .string()
        .describe("評価する数式。例: '2 + 3 * 4', '(10 - 3) / 2'"),
    }),
  },
);

/**
 * 現在時刻ツール
 */
export const currentTimeTool = tool(
  async ({ timezone }): Promise<string> => {
    const now = new Date();
    const formatted = now.toLocaleString("ja-JP", { timeZone: timezone });
    return `現在の日時（${timezone}）: ${formatted}`;
  },
  {
    name: "current_time",
    description: "現在の日時を取得します。タイムゾーンを指定できます。",
    schema: z.object({
      timezone: z
        .string()
        .default("Asia/Tokyo")
        .describe("タイムゾーン。例: 'Asia/Tokyo', 'America/New_York'"),
    }),
  },
);

/**
 * 文字列操作ツール
 */
export const textTool = tool(
  async ({ text, operation }): Promise<string> => {
    switch (operation) {
      case "length":
        return `文字数: ${text.length}`;
      case "reverse":
        return `反転: ${text.split("").reverse().join("")}`;
      case "uppercase":
        return `大文字: ${text.toUpperCase()}`;
      case "lowercase":
        return `小文字: ${text.toLowerCase()}`;
      default:
        return `不明な操作: ${operation}`;
    }
  },
  {
    name: "text_tool",
    description:
      "テキストの操作を行います（文字数カウント、反転、大文字/小文字変換）。",
    schema: z.object({
      text: z.string().describe("操作対象のテキスト"),
      operation: z
        .enum(["length", "reverse", "uppercase", "lowercase"])
        .describe("実行する操作"),
    }),
  },
);
```

### Step 2: Agent を構成する

```typescript
// src/agent/index.ts
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { calculatorTool, currentTimeTool, textTool } from "./tools.js";

// Ollama のモデルを初期化
const llm = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
  temperature: 0, // ツール呼び出しは temperature 低めが安定
});

// ツール一覧
const tools = [calculatorTool, currentTimeTool, textTool];

// ReAct Agent を作成
const agent = createReactAgent({
  llm,
  tools,
});

// 実行
async function main() {
  console.log("=== Agent に質問 ===\n");

  // 質問 1: ツール不要（普通の会話）
  const res1 = await agent.invoke({
    messages: [{ role: "user", content: "こんにちは！自己紹介してください。" }],
  });
  console.log("Q: こんにちは！自己紹介してください。");
  console.log("A:", res1.messages.at(-1)?.content, "\n");

  // 質問 2: 計算ツールを使用
  const res2 = await agent.invoke({
    messages: [
      { role: "user", content: "123 × 456 + 789 の計算結果を教えてください" },
    ],
  });
  console.log("Q: 123 × 456 + 789 の計算結果を教えてください");
  console.log("A:", res2.messages.at(-1)?.content, "\n");

  // 質問 3: 時刻ツールを使用
  const res3 = await agent.invoke({
    messages: [{ role: "user", content: "今何時ですか？" }],
  });
  console.log("Q: 今何時ですか？");
  console.log("A:", res3.messages.at(-1)?.content, "\n");

  // 質問 4: 複数ツールを使用
  const res4 = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "'Hello World' の文字数を数えて、さらにその文字数を2乗した値を教えてください",
      },
    ],
  });
  console.log(
    "Q: 'Hello World' の文字数を数えて、さらにその文字数を2乗した値を教えてください",
  );
  console.log("A:", res4.messages.at(-1)?.content, "\n");
}

main().catch(console.error);
```

### Step 3: 実行

```bash
npx tsx src/agent/index.ts
```

---

## Agent を API エンドポイントとして公開する

既存の Hono サーバーに Agent 用のエンドポイントを追加する例です。

```typescript
// src/routes/agent.ts
import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { ChatOllama } from "@langchain/ollama";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { calculatorTool, currentTimeTool, textTool } from "../agent/tools.js";

const llm = new ChatOllama({
  model: "qwen3:8b",
  baseUrl: "http://localhost:11434",
  temperature: 0,
});

const agent = createReactAgent({
  llm,
  tools: [calculatorTool, currentTimeTool, textTool],
});

export const agentRouter = new Hono();

agentRouter.post("/chat", async (c) => {
  const { message } = await c.req.json<{ message: string }>();

  const result = await agent.invoke({
    messages: [{ role: "user", content: message }],
  });

  const lastMessage = result.messages.at(-1);
  return c.json({
    response: lastMessage?.content ?? "",
    // ツール呼び出しの履歴も返す
    steps: result.messages
      .filter((m: any) => m._getType?.() === "tool")
      .map((m: any) => ({
        tool: m.name,
        result: m.content,
      })),
  });
});

// app.ts に追加:
// import { agentRouter } from "./routes/agent.js";
// app.route("/api/agent", agentRouter);
```

---

## カスタムツールの作り方

### 外部 API を呼び出すツール

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const weatherTool = tool(
  async ({ city }): Promise<string> => {
    // 外部の天気 API を呼び出す例
    const res = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
    );
    const data = await res.json();

    const current = data.current_condition[0];
    return [
      `都市: ${city}`,
      `天気: ${current.weatherDesc[0].value}`,
      `気温: ${current.temp_C}℃`,
      `湿度: ${current.humidity}%`,
    ].join("\n");
  },
  {
    name: "weather",
    description: "指定した都市の現在の天気情報を取得します。",
    schema: z.object({
      city: z.string().describe("天気を調べたい都市名（英語）。例: 'Tokyo'"),
    }),
  },
);
```

### データベースを検索するツール

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 仮のデータベース
const products = [
  { id: 1, name: "ノートPC", price: 89000, stock: 15 },
  { id: 2, name: "マウス", price: 3500, stock: 120 },
  { id: 3, name: "キーボード", price: 12000, stock: 45 },
  { id: 4, name: "モニター", price: 35000, stock: 8 },
];

export const productSearchTool = tool(
  async ({ query }): Promise<string> => {
    const results = products.filter((p) => p.name.includes(query));
    if (results.length === 0) return "該当する商品が見つかりませんでした。";
    return results
      .map(
        (p) =>
          `- ${p.name}: ¥${p.price.toLocaleString()}（在庫: ${p.stock}個）`,
      )
      .join("\n");
  },
  {
    name: "product_search",
    description: "商品名で商品を検索し、価格と在庫を確認します。",
    schema: z.object({
      query: z.string().describe("検索する商品名（部分一致）"),
    }),
  },
);
```

---

## システムプロンプトの設定

Agent の振る舞いをカスタマイズするにはシステムプロンプトを設定します。

```typescript
const agent = createReactAgent({
  llm,
  tools,
  // Agent のシステムプロンプト
  prompt: `あなたは便利なアシスタントです。
ユーザーの質問に対して、利用可能なツールを活用して正確に回答してください。

ルール:
- 計算が必要な場合は必ず calculator ツールを使ってください
- 推測で回答せず、ツールの結果に基づいて回答してください
- 日本語で回答してください`,
});
```

---

## デバッグ・トレース

Agent がどのツールをどの順序で呼び出したかを確認する方法です。

```typescript
// ストリーミングでステップごとに確認
const stream = await agent.stream(
  { messages: [{ role: "user", content: "100 * 200 は？" }] },
  { streamMode: "updates" },
);

for await (const update of stream) {
  for (const [node, values] of Object.entries(update)) {
    console.log(`--- ${node} ---`);
    console.log(JSON.stringify(values, null, 2));
  }
}
```

---

## 注意点・Tips

| 項目               | 内容                                                                               |
| ------------------ | ---------------------------------------------------------------------------------- |
| モデル選定         | ツール呼び出しには `qwen3:8b` 以上を推奨。小さいモデルはツール選択を誤りやすい     |
| temperature        | ツール呼び出しの安定性を上げるため `0` に設定するのが無難                          |
| ツール説明文       | `description` を具体的に書くほど、LLM が正しくツールを選択する                     |
| スキーマ           | Zod で入力を厳密に定義することで、不正な引数を防げる                               |
| エラーハンドリング | ツール内で例外を投げるとエージェントが止まる。try-catch で文字列として返すのが安全 |
| ループ防止         | Agent が無限にツールを呼び続ける場合、`maxIterations` で制限する                   |

---

## 参考リンク

- [LangChain.js ドキュメント](https://js.langchain.com/docs/)
- [LangGraph.js - Agent](https://langchain-ai.github.io/langgraphjs/)
- [@langchain/ollama](https://www.npmjs.com/package/@langchain/ollama)
- [Ollama Tool Calling](https://ollama.com/blog/tool-support)
