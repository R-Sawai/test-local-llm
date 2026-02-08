import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/api";

/**
 * RAG 質問応答 Hook
 */
export function useRagAsk() {
  return useMutation({
    mutationFn: async ({
      question,
      chatHistory,
    }: {
      question: string;
      chatHistory?: { role: string; content: string }[];
    }) => {
      const res = await client.api.rag.ask.$post({
        json: { question, chatHistory },
      });
      if (!res.ok) throw new Error("RAG リクエストに失敗しました");
      return res.json();
    },
  });
}

/**
 * ドキュメント取り込み Hook
 */
export function useRagIngest() {
  return useMutation({
    mutationFn: async (
      documents: { content: string; source: string; category?: string }[],
    ) => {
      const res = await client.api.rag.ingest.$post({
        json: { documents },
      });
      if (!res.ok) throw new Error("ドキュメント取り込みに失敗しました");
      return res.json();
    },
  });
}
