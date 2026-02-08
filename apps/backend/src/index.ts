import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { initDatabase } from "./db.js";
import { documentService } from "./services/document-service.js";

// DB 初期化 → サンプル投入 → サーバー起動
async function main() {
  await initDatabase();
  await documentService.ingestSampleIfEmpty();

  serve(
    {
      fetch: app.fetch,
      port: 3000,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    },
  );
}

main().catch(console.error);
