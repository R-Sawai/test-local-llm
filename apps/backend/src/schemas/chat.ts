/**
 * Chat API の Zod スキーマ & 型定義
 */
import { z } from "zod";
import { chatMessageSchema } from "./rag.js";

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
