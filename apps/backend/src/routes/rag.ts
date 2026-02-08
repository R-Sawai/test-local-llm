import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { ragService } from "../services/rag-service.js";
import { documentService } from "../services/document-service.js";
import {
  ragAskRequestSchema,
  ragAskResponseSchema,
  ragIngestRequestSchema,
  ragIngestResponseSchema,
} from "../schemas/rag.js";

// ---- Route 定義 ----

const askRoute = createRoute({
  method: "post",
  path: "/ask",
  tags: ["RAG"],
  summary: "RAG で質問に回答する",
  request: {
    body: {
      content: { "application/json": { schema: ragAskRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ragAskResponseSchema } },
      description: "回答を返却",
    },
  },
});

const ingestRoute = createRoute({
  method: "post",
  path: "/ingest",
  tags: ["RAG"],
  summary: "ドキュメントを取り込む",
  request: {
    body: {
      content: { "application/json": { schema: ragIngestRequestSchema } },
      required: true,
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ragIngestResponseSchema } },
      description: "ドキュメント取り込み完了",
    },
  },
});

// ---- Router ----

export const ragRouter = new OpenAPIHono()
  .openapi(askRoute, async (c) => {
    const { question, chatHistory } = c.req.valid("json");
    const result = await ragService.ask(question, chatHistory ?? []);
    return c.json(result, 200);
  })
  .openapi(ingestRoute, async (c) => {
    const { documents } = c.req.valid("json");
    const chunksCreated = await documentService.ingest(documents);
    return c.json(
      {
        message: "ドキュメントを取り込みました" as const,
        chunksCreated,
      },
      200,
    );
  });
