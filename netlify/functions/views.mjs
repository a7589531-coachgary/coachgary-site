// 文章觀看次數 API（Netlify Function＋Netlify Blobs）
// POST /api/views?slug=文章代稱 → 該文章 +1
// GET  /api/views               → 所有文章的觀看次數 { slug: 次數 }
import { getStore } from "@netlify/blobs";

// 只接受文章檔名格式：2026-10-29-標題
const SLUG = /^\d{4}-\d{2}-\d{2}-.{1,150}$/;
// 儲存時把中文代稱轉成純英數字的 key，避免編碼問題
const toKey = slug => Buffer.from(slug, "utf8").toString("base64url");
const fromKey = key => Buffer.from(key, "base64url").toString("utf8");

export default async (req) => {
  const store = getStore("views");

  if (req.method === "POST") {
    const slug = new URL(req.url).searchParams.get("slug") || "";
    if (!SLUG.test(slug)) return new Response("invalid slug", { status: 400 });
    const key = toKey(slug);
    const views = (Number(await store.get(key)) || 0) + 1;
    await store.set(key, String(views));
    return Response.json({ slug, views });
  }

  if (req.method === "GET") {
    const { blobs } = await store.list();
    const entries = await Promise.all(blobs.map(async b => [fromKey(b.key), Number(await store.get(b.key)) || 0]));
    return Response.json(Object.fromEntries(entries), { headers: { "cache-control": "no-store" } });
  }

  return new Response("method not allowed", { status: 405 });
};

export const config = { path: "/api/views" };
