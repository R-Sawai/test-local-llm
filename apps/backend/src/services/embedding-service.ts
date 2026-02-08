import { OllamaEmbeddings } from "@langchain/ollama";

const OLLAMA_BASE_URL = process.env.OLLAMA_HOST ?? "http://localhost:11434";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";

/**
 * Ollama 埋め込みモデルのシングルトン
 */
const embeddings = new OllamaEmbeddings({
  model: EMBEDDING_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

/**
 * テキストをベクトルに変換するサービス
 */
export const embeddingService = {
  /**
   * 単一テキストを埋め込みベクトルに変換
   */
  async embed(text: string): Promise<number[]> {
    return embeddings.embedQuery(text);
  },

  /**
   * 複数テキストを一括で埋め込みベクトルに変換
   */
  async embedMany(texts: string[]): Promise<number[][]> {
    return embeddings.embedDocuments(texts);
  },
};
