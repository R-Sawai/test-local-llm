import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { streamText } from "hono/streaming";
import { Ollama } from "ollama";
import { chatRequestSchema } from "../schemas/chat.js";

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const MODEL_NAME = process.env.MODEL_NAME ?? "gemma3:4b";

const ollama = new Ollama({ host: OLLAMA_HOST });

export const chatRouter = new Hono().post(
  "/",
  zValidator("json", chatRequestSchema),
  async (c) => {
    const { messages } = c.req.valid("json");

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
  },
);
