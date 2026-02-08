/**
 * ドキュメントチャンクのスキーマ定義
 */

/** DB に保存されたチャンク */
export interface DocumentChunk {
  id: number;
  content: string;
  source: string;
  category: string | null;
  embedding: number[] | null;
  created_at: Date;
}

/** チャンク挿入時のデータ */
export interface DocumentChunkInsert {
  content: string;
  source: string;
  category?: string;
  embedding: number[];
}

/** 類似検索の結果 */
export interface SimilarChunk {
  id: number;
  content: string;
  source: string;
  category: string | null;
  distance: number;
}
