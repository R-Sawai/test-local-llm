import pg from "pg";

const { Pool } = pg;

/**
 * PostgreSQL コネクションプール
 */
export const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? "admin",
  password: process.env.POSTGRES_PASSWORD ?? "password",
  database: process.env.POSTGRES_DB ?? "rag",
});

/**
 * pgvector 拡張とテーブルを初期化する
 */
export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // pgvector 拡張を有効化
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");

    // ドキュメントチャンクテーブル
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id            SERIAL PRIMARY KEY,
        content       TEXT NOT NULL,
        source        TEXT NOT NULL,
        category      TEXT,
        embedding     vector(768),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ベクトル検索用の HNSW インデックス
    // cosine 距離を使用（埋め込みモデルとの相性が良い）
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
      ON document_chunks
      USING hnsw (embedding vector_cosine_ops)
    `);

    console.log("データベース初期化完了（pgvector）");
  } finally {
    client.release();
  }
}
