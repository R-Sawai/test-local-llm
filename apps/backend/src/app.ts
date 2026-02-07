import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { Ollama } from "ollama";

// ---- 設定 ----
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const MODEL_NAME = process.env.MODEL_NAME ?? "gemma3:4b";

const ollama = new Ollama({ host: OLLAMA_HOST });

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- HTMLテンプレート読み込み ----
const indexHtml = readFileSync(
  resolve(__dirname, "views", "index.html"),
  "utf-8",
);

// ---- App ----
export const app = new Hono();

// 静的ファイル配信 (CSS / JS)
app.get("/static/:file", (c) => {
  const file = c.req.param("file");
  const ext = file.split(".").pop();
  const mimeTypes: Record<string, string> = {
    css: "text/css",
    js: "application/javascript",
  };
  try {
    const content = readFileSync(join(__dirname, "static", file), "utf-8");
    return c.body(content, 200, {
      "Content-Type": mimeTypes[ext ?? ""] ?? "text/plain",
    });
  } catch {
    return c.notFound();
  }
});

// チャットUI
app.get("/", (c) => c.html(indexHtml));

// チャットAPI（ストリーミング）
app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json<{
    messages: { role: string; content: string }[];
  }>();

  const response = await ollama.chat({
    model: MODEL_NAME,
    messages,
    stream: true,
  });

  return streamText(c, async (stream) => {
    for await (const chunk of response) {
      await stream.write(chunk.message.content);
    }
  });
});
