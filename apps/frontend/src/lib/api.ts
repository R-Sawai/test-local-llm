import { hc } from "hono/client";
import type { AppType } from "@backend/app";

/**
 * 型安全な API クライアント
 *
 * 開発時は Vite proxy 経由、本番では同一オリジン想定
 */
export const client = hc<AppType>("/");
