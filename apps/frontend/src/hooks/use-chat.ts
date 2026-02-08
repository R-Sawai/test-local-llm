import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { client } from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * ストリーミング対応チャット Hook
 *
 * - TanStack Query の useMutation でリクエスト状態を管理
 * - ReadableStream を逐次読み取り、メッセージを更新
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const mutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const userMsg: ChatMessage = { role: "user", content: userMessage };
      const allMessages = [...messages, userMsg];

      // ユーザーメッセージを即座に表示
      setMessages([...allMessages, { role: "assistant", content: "" }]);

      const res = await client.api.chat.$post({
        json: { messages: allMessages },
      });

      if (!res.ok) {
        throw new Error("チャットリクエストに失敗しました");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      // ストリーミング読み取り
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: fullText },
        ]);
      }

      // 最終状態を確定
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: fullText },
      ]);

      return fullText;
    },
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim() || mutation.isPending) return;
      mutation.mutate(content);
    },
    [mutation],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isStreaming: mutation.isPending,
    error: mutation.error,
  };
}
