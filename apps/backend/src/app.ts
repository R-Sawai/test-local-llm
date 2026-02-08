import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { chatRouter } from "./routes/chat.js";
import { ragRouter } from "./routes/rag.js";

/** Honoアプリケーション */
const app = new OpenAPIHono();

app.use("*", cors());

// OpenAPI 仕様エンドポイント
app.doc("/api/doc", {
  openapi: "3.1.0",
  info: { title: "Local LLM API", version: "1.0.0" },
});

// ルート定義 (型推論のためにチェーンで定義する)
const routes = app.route("/api/chat", chatRouter).route("/api/rag", ragRouter);

export { app };
export type AppType = typeof routes;
