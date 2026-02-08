import { pool } from "../db.js";
import type {
  DocumentChunkInsert,
  SimilarChunk,
} from "../schemas/document-chunk.js";

/**
 * pgvector を使ったドキュメントチャンクの永続化・検索リポジトリ
 */
export const documentChunkRepository = {
  /**
   * チャンクをバッチ挿入する
   */
  async insertMany(chunks: DocumentChunkInsert[]): Promise<number> {
    if (chunks.length === 0) return 0;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO document_chunks (content, source, category, embedding)
           VALUES ($1, $2, $3, $4)`,
          [
            chunk.content,
            chunk.source,
            chunk.category ?? null,
            `[${chunk.embedding.join(",")}]`,
          ],
        );
      }

      await client.query("COMMIT");
      return chunks.length;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  /**
   * コサイン類似度で上位 k 件を検索する
   *
   * pgvector の <=> 演算子はコサイン距離（1 - cosine similarity）を返す。
   * 値が小さいほど類似度が高い。
   */
  async findSimilar(
    queryEmbedding: number[],
    k: number = 3,
  ): Promise<SimilarChunk[]> {
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    const { rows } = await pool.query<SimilarChunk>(
      `SELECT
         id,
         content,
         source,
         category,
         embedding <=> $1 AS distance
       FROM document_chunks
       ORDER BY embedding <=> $1
       LIMIT $2`,
      [embeddingStr, k],
    );

    return rows;
  },

  /**
   * 全チャンクを削除する（再投入用）
   */
  async deleteAll(): Promise<void> {
    await pool.query("DELETE FROM document_chunks");
  },

  /**
   * チャンク数を取得する
   */
  async count(): Promise<number> {
    const { rows } = await pool.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM document_chunks",
    );
    return Number(rows[0].count);
  },
};
