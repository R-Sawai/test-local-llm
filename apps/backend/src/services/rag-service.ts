import { ChatOllama } from "@langchain/ollama";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { embeddingService } from "./embedding-service.js";
import { documentChunkRepository } from "../repositories/document-chunk-repository.js";
import type { ChatMessage, RagAskResponse } from "../schemas/rag.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const MODEL_NAME = process.env.MODEL_NAME ?? "gemma3:4b";

const llm = new ChatOllama({
  model: MODEL_NAME,
  baseUrl: OLLAMA_BASE_URL,
  temperature: 0.3,
});

/**
 * RAG 用プロンプト
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
 * RAG 質問応答サービス
 */
export const ragService = {
  /**
   * 質問に対して RAG で回答を生成する
   *
   * 1. 質問をベクトル化
   * 2. pgvector で類似チャンクを検索
   * 3. コンテキスト付きプロンプトで LLM に回答させる
   */
  async ask(
    question: string,
    chatHistory: ChatMessage[] = [],
  ): Promise<RagAskResponse> {
    // 1. 質問を埋め込みベクトルに変換
    const queryEmbedding = await embeddingService.embed(question);

    // 2. pgvector で類似検索
    const relevantChunks = await documentChunkRepository.findSimilar(
      queryEmbedding,
      3,
    );

    // 3. コンテキスト文字列を構築
    const context = relevantChunks
      .map(
        (chunk, i) =>
          `[${i + 1}] (出典: ${chunk.source}, 距離: ${Number(chunk.distance).toFixed(4)})\n${chunk.content}`,
      )
      .join("\n\n---\n\n");

    // 4. チャット履歴を LangChain メッセージに変換
    const messages = chatHistory.map((m) =>
      m.role === "assistant"
        ? new AIMessage(m.content)
        : new HumanMessage(m.content),
    );

    // 5. LLM で回答を生成
    const chain = ragPrompt.pipe(llm).pipe(new StringOutputParser());
    const answer = await chain.invoke({
      context,
      question,
      chat_history: messages,
    });

    // 6. 参照元を抽出
    const sources = [...new Set(relevantChunks.map((c) => c.source))];

    return { answer, sources };
  },
};
