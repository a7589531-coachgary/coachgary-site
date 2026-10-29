// CoachGary Performance 網站建置：把 content/posts 的文章轉成網頁，輸出到 dist/
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const POSTS_DIR = path.join(ROOT, "content", "posts");
// Netlify 建置時會提供 URL（正式網址）；本機建置用預設值
const SITE_URL = (process.env.URL || "https://jocular-tulumba-f558a8.netlify.app").replace(/\/$/, "");

// 不需要發佈的檔案
const SKIP = new Set(["dist", "node_modules", "content", "build.js", "package.json", "package-lock.json", "netlify.toml", "README.md", ".git", ".gitignore"]);

// 分類與卡片底色：在後台「網站設定 → 文章分類」管理
const DEFAULT_COLOR = "#eef1f4";
function loadCategoryColors() {
  const f = path.join(ROOT, "content", "settings", "categories.json");
  if (!fs.existsSync(f)) return {};
  const list = JSON.parse(fs.readFileSync(f, "utf8")).categories || [];
  return Object.fromEntries(list.filter(c => c && c.name).map(c => [c.name, c.color || DEFAULT_COLOR]));
}
const CATEGORY_COLORS = loadCategoryColors();
const CATEGORY_ORDER = Object.keys(CATEGORY_COLORS);   // 篩選按鈕依後台分類清單的順序排列
const categoryLink = c => `blog.html?cat=${encodeURIComponent(c)}`;

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// 日期一律以台灣時間顯示為 2026/10/29（建置主機是 UTC，避免跨日誤差）
function formatDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return "";
  return isoDate(date).replace(/-/g, "/");
}
function isoDate(d) {
  const date = new Date(d);
  return isNaN(date) ? "" : date.toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    if (src === ROOT && SKIP.has(name)) continue;
    if (name.startsWith(".")) continue;
    const s = path.join(src, name), d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith(".md"))
    .map(f => {
      const { data, content } = matter(fs.readFileSync(path.join(POSTS_DIR, f), "utf8"));
      const slug = f.replace(/\.md$/, "");
      return {
        slug,
        url: `blog/${encodeURIComponent(slug)}.html`,
        title: data.title || slug,
        date: data.date || "",
        category: data.category || "其他",
        summary: data.summary || "",
        cover: data.cover || "",
        draft: data.draft === true,
        html: marked.parse(content),
        // 閱讀時間：中文約每分鐘 400 字
        readMin: Math.max(1, Math.round(content.replace(/!\[.*?\]\(.*?\)|[#>*_`\-\[\]()]|\s/g, "").length / 400))
      };
    })
    .filter(p => !p.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

const colorOf = c => CATEGORY_COLORS[c] || DEFAULT_COLOR;
const searchText = p => esc(`${p.title} ${p.summary} ${p.category}`.toLowerCase());
const media = p => p.cover
  ? `<img class="thumb" src="${esc(p.cover)}" alt="" loading="lazy">`
  : `<div class="thumb thumb-text" style="background:${colorOf(p.category)}">${esc(p.category)}</div>`;
const pill = p => `<span class="cat-pill" style="--c:${colorOf(p.category)}">${esc(p.category)}</span>`;
const foot = p => `<div class="post-foot"><span>${formatDate(p.date)}</span><span>約 ${p.readMin} 分鐘閱讀</span></div>`;

function card(p, latest = false) {
  return `
        <a class="card post" href="${p.url}" data-category="${esc(p.category)}" data-search="${searchText(p)}"${latest ? " data-latest" : ""}>
          <div class="thumb-wrap">${media(p)}${pill(p)}</div>
          <div class="post-body">
            <h3>${esc(p.title)}</h3>
            ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
            ${foot(p)}
          </div>
        </a>`;
}

// 部落格頁最上方的精選（最新）文章
function featured(p) {
  return `
      <a class="featured-post" href="${p.url}" data-category="${esc(p.category)}" data-search="${searchText(p)}">
        <div class="thumb-wrap">${media(p)}</div>
        <div class="fp-body">
          <div class="fp-top"><span class="fp-label">最新文章</span>${pill(p)}</div>
          <h2>${esc(p.title)}</h2>
          ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
          ${foot(p)}
          <span class="link-arrow">閱讀文章 →</span>
        </div>
      </a>`;
}

// 分類篩選按鈕（只列出有文章的分類＋篇數）與搜尋框
function toolbar(posts) {
  const counts = {};
  for (const p of posts) counts[p.category] = (counts[p.category] || 0) + 1;
  const cats = Object.keys(counts).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  const chip = (value, label, n, on) =>
    `<button type="button" class="chip" data-filter="${esc(value)}" aria-pressed="${on}">${value ? `<i style="background:${colorOf(value)}"></i>` : ""}${esc(label)}<span>${n}</span></button>`;
  return `
      <div class="blog-toolbar">
        <div class="filters" role="group" aria-label="依分類篩選文章">
          ${chip("", "全部", posts.length, true)}
          ${cats.map(c => chip(c, c, counts[c], false)).join("\n          ")}
        </div>
        <label class="search">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input type="search" placeholder="搜尋文章" aria-label="搜尋文章">
        </label>
      </div>`;
}

function stats(posts) {
  const cats = new Set(posts.map(p => p.category)).size;
  return `
      <dl class="blog-stats">
        <div><dt>文章</dt><dd>${posts.length}</dd></div>
        <div><dt>分類</dt><dd>${cats}</dd></div>
        <div><dt>最近更新</dt><dd>${formatDate(posts[0].date)}</dd></div>
      </dl>`;
}

// 取代 <!-- NAME:START --> 與 <!-- NAME:END --> 之間的內容
function inject(file, name, html) {
  const f = path.join(DIST, file);
  const src = fs.readFileSync(f, "utf8");
  const re = new RegExp(`(<!-- ${name}:START -->)[\\s\\S]*?(<!-- ${name}:END -->)`);
  if (!re.test(src)) throw new Error(`${file} 找不到 ${name} 標記`);
  fs.writeFileSync(f, src.replace(re, `$1${html}\n      $2`));
}

function postPage(p) {
  const pageUrl = `${SITE_URL}/${p.url}`;
  const ogImage = p.cover ? (p.cover.startsWith("http") ? p.cover : SITE_URL + p.cover) : `${SITE_URL}/assets/og.jpg`;
  const desc = p.summary || p.title;
  return `<!doctype html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<base href="/">
<title>${esc(p.title)}｜CoachGary Performance</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:site_name" content="CoachGary Performance">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:url" content="${pageUrl}">
<link rel="canonical" href="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="assets/logo-112.png">
<link rel="apple-touch-icon" href="assets/logo-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;900&family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/style.css">
<script type="application/ld+json">
${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: p.title,
  datePublished: isoDate(p.date) || undefined,
  image: ogImage,
  author: { "@type": "Person", name: "葉博文", jobTitle: "職棒體能教練" },
  publisher: { "@type": "Organization", name: "CoachGary Performance" },
  mainEntityOfPage: pageUrl
}, null, 2)}
</script>
</head>
<body data-page="blog">
<a class="skip" href="#main">跳至主要內容</a>
<header class="nav" id="site-header"></header>

<main id="main">
  <section class="page-hero">
    <div class="wrap narrow">
      <div class="crumbs"><a href="index.html">首頁</a> / <a href="blog.html">部落格</a> / <a href="${categoryLink(p.category)}">${esc(p.category)}</a></div>
      <h1>${esc(p.title)}</h1>
      <p class="post-meta"><a class="tag-link" href="${categoryLink(p.category)}">${esc(p.category)}</a></p>
    </div>
  </section>

  <section class="block">
    <article class="wrap narrow">
      ${p.cover ? `<img class="post-cover" src="${esc(p.cover)}" alt="">` : ""}
      <div class="prose">
${p.html}
      </div>

      <p class="signature">葉博文, Gary, CSCS<br><time datetime="${isoDate(p.date)}">${formatDate(p.date)}</time></p>

      <aside class="author">
        <img src="assets/gary.webp" alt="" width="72" height="72">
        <div>
          <b>葉博文 Gary</b>
          <p>職棒體能教練・NSCA-CSCS。CoachGary Performance 創辦人，專注於運動員的肌力與體能訓練。</p>
          <a class="link-arrow" href="about.html">關於我 →</a>
        </div>
      </aside>

      <p style="margin-top:32px"><a class="link-arrow" href="blog.html">← 回到部落格</a></p>
    </article>
  </section>

  <section class="cta-band">
    <div class="wrap">
      <div><h2>想要專屬於你的訓練規劃？</h2><p>填寫表單，我會親自回覆並建議適合你的方案。</p></div>
      <a class="btn primary" href="contact.html">預約訓練諮詢</a>
    </div>
  </section>
</main>

<footer class="site" id="site-footer"></footer>
<script src="assets/site.js"></script>
</body>
</html>
`;
}

function sitemap(posts) {
  const pages = ["", "services.html", "products.html", "product-subscription.html", "product-digital.html", "product-course.html", "product-onsite.html", "about.html", "blog.html", "faq.html", "contact.html"];
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map(p => `  <url><loc>${SITE_URL}/${p}</loc><lastmod>${today}</lastmod></url>`)
    .concat(posts.map(p => `  <url><loc>${SITE_URL}/${p.url}</loc><lastmod>${isoDate(p.date)}</lastmod></url>`));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

// ---- 執行 ----
fs.rmSync(DIST, { recursive: true, force: true });
copyDir(ROOT, DIST);

const posts = loadPosts();
fs.mkdirSync(path.join(DIST, "blog"), { recursive: true });
for (const p of posts) {
  fs.writeFileSync(path.join(DIST, "blog", `${p.slug}.html`), postPage(p));
}

if (posts.length) {
  inject("blog.html", "STATS", stats(posts));
  inject("blog.html", "POSTS", [
    toolbar(posts),
    featured(posts[0]),
    `\n      <p class="results" aria-live="polite"></p>`,
    `\n      <div class="grid-3 posts-grid">${posts.map((p, i) => card(p, i === 0)).join("")}\n      </div>`,
    `\n      <p class="filter-empty" hidden>找不到符合的文章，換個關鍵字或分類試試。</p>`
  ].join(""));
  inject("index.html", "LATEST", `\n      <div class="grid-3">${posts.slice(0, 3).map(p => card(p)).join("")}\n      </div>`);
}
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap(posts));

console.log(`建置完成：${posts.length} 篇文章，網址 ${SITE_URL}`);
