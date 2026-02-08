import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { embeddingService } from "./embedding-service.js";
import { documentChunkRepository } from "../repositories/document-chunk-repository.js";
import type { DocumentChunkInsert } from "../schemas/document-chunk.js";
import type { RagDocumentInput } from "../schemas/rag.js";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", "。", "、", " ", ""],
});

/**
 * ドキュメントの取り込み（チャンク分割 → 埋め込み → DB 保存）
 */
export const documentService = {
  /**
   * ドキュメント群をチャンク分割・ベクトル化して DB に保存する
   */
  async ingest(inputs: RagDocumentInput[]): Promise<number> {
    // 1. LangChain Document に変換
    const docs = inputs.map(
      (d) =>
        new Document({
          pageContent: d.content,
          metadata: { source: d.source, category: d.category ?? "" },
        }),
    );

    // 2. チャンク分割
    const chunks = await splitter.splitDocuments(docs);
    console.log(
      `${inputs.length} 件のドキュメントを ${chunks.length} チャンクに分割`,
    );

    // 3. 埋め込みベクトルを一括生成
    const texts = chunks.map((c) => c.pageContent);
    const embeddings = await embeddingService.embedMany(texts);

    // 4. DB に保存
    const inserts: DocumentChunkInsert[] = chunks.map((chunk, i) => ({
      content: chunk.pageContent,
      source: chunk.metadata.source as string,
      category: (chunk.metadata.category as string) || undefined,
      embedding: embeddings[i],
    }));

    const count = await documentChunkRepository.insertMany(inserts);
    console.log(`${count} チャンクを DB に保存しました`);
    return count;
  },

  /**
   * サンプルドキュメントを投入する（DB が空の場合のみ）
   */
  async ingestSampleIfEmpty(): Promise<void> {
    const existing = await documentChunkRepository.count();
    if (existing > 0) {
      console.log(`既存チャンク ${existing} 件があるためスキップします`);
      return;
    }

    const sampleDocs: RagDocumentInput[] = [
      {
        source: "社内規定.md",
        category: "人事",
        content: `# 社内規定：リモートワークについて

当社では週3日までリモートワークが可能です。
リモートワークを行う場合は、前日までに上長へ申請が必要です。
コアタイムは10:00〜15:00で、この時間帯はオンラインである必要があります。
リモートワーク中もSlackでの応答は30分以内に行ってください。`,
      },
      {
        source: "経費精算ガイド.md",
        category: "経理",
        content: `# 経費精算ガイド

経費精算は月末締め、翌月15日払いです。
領収書は電子データ（写真・PDF）で提出可能です。
5,000円以上の経費は事前申請が必要です。
交通費はICカードの利用履歴でも精算可能です。
飲食を伴う会議費は1人あたり5,000円が上限です。`,
      },
      {
        source: "開発セットアップ.md",
        category: "開発",
        content: `# 開発環境セットアップ手順

1. GitHubアカウントを管理者に申請する
2. VPNクライアントをインストールする（GlobalProtect推奨）
3. 開発用PCにDocker Desktopをインストールする
4. 社内GitLabからプロジェクトをcloneする
5. .env.example を .env にコピーし、必要な値を設定する
6. docker compose up -d で開発環境を起動する

困った場合は #dev-support チャンネルで質問してください。`,
      },
    ];

    await this.ingest(sampleDocs);
    console.log("サンプルドキュメントを投入しました");
  },
};
