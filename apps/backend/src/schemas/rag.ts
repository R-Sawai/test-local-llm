/**
 * RAG API の Zod スキーマ & 型定義
 */
import { z } from "zod";

// ---- Zod schemas ----

export const chatMessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export const ragAskRequestSchema = z.object({
  question: z.string().min(1, "question は必須です"),
  chatHistory: z.array(chatMessageSchema).optional().default([]),
});

export const ragAskResponseSchema = z.object({
  answer: z.string(),
  sources: z.array(z.string()),
});

export const ragDocumentInputSchema = z.object({
  content: z.string(),
  source: z.string(),
  category: z.string().optional(),
});

export const ragIngestRequestSchema = z.object({
  documents: z.array(ragDocumentInputSchema).min(1, "documents は必須です"),
});

export const ragIngestResponseSchema = z.object({
  message: z.string(),
  chunksCreated: z.number(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

// ---- 型エクスポート ----

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type RagAskRequest = z.infer<typeof ragAskRequestSchema>;
export type RagAskResponse = z.infer<typeof ragAskResponseSchema>;
export type RagDocumentInput = z.infer<typeof ragDocumentInputSchema>;
export type RagIngestRequest = z.infer<typeof ragIngestRequestSchema>;
export type RagIngestResponse = z.infer<typeof ragIngestResponseSchema>;
