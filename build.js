// CoachGary Performance 網站建置：把 content/posts 的文章轉成網頁，輸出到 dist/
const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const POSTS_DIR = path.join(ROOT, "content", "posts");
// Netlify 建置時會提供 URL（正式網址）；本機建置用預設值
const SITE_URL = (process.env.URL || "https://wondrous-conkies-68042c.netlify.app").replace(/\/$/, "");

// 不需要發佈的檔案
const SKIP = new Set(["dist", "node_modules", "content", "build.js", "package.json", "package-lock.json", "netlify.toml", "README.md", ".git", ".gitignore"]);

const CATEGORY_COLORS = {
  "肌力訓練": "var(--accent-soft)",
  "傷害預防": "#e8eefc",
  "速度訓練": "#eaf5ee",
  "運動科學": "#f3ecfb",
  "訓練觀念": "#fdf0e6",
  "其他": "#eef1f4"
};

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function formatDate(d) {
  const date = new Date(d);
  if (isNaN(date)) return "";
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${p(date.getMonth() + 1)}.${p(date.getDate())}`;
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
        html: marked.parse(content)
      };
    })
    .filter(p => !p.draft)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function card(p) {
  const thumb = p.cover
    ? `<img class="thumb" src="${esc(p.cover)}" alt="" loading="lazy">`
    : `<div class="thumb" style="background:${CATEGORY_COLORS[p.category] || CATEGORY_COLORS["其他"]}">${esc(p.category)}</div>`;
  return `
        <a class="card post" href="${p.url}">
          ${thumb}
          <div class="meta">${esc(p.category)}・${formatDate(p.date)}</div>
          <h3>${esc(p.title)}</h3>
          ${p.summary ? `<p>${esc(p.summary)}</p>` : ""}
        </a>`;
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
  datePublished: p.date ? new Date(p.date).toISOString() : undefined,
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
      <div class="crumbs"><a href="index.html">首頁</a> / <a href="blog.html">部落格</a> / ${esc(p.category)}</div>
      <h1>${esc(p.title)}</h1>
      <p class="post-meta">${formatDate(p.date)}・${esc(p.category)}・職棒體能教練葉博文</p>
    </div>
  </section>

  <section class="block">
    <article class="wrap narrow">
      ${p.cover ? `<img class="post-cover" src="${esc(p.cover)}" alt="">` : ""}
      <div class="prose">
${p.html}
      </div>

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
    .concat(posts.map(p => `  <url><loc>${SITE_URL}/${p.url}</loc><lastmod>${new Date(p.date).toISOString().slice(0, 10)}</lastmod></url>`));
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
  inject("blog.html", "POSTS", `\n      <div class="grid-3">${posts.map(card).join("")}\n      </div>`);
  inject("index.html", "LATEST", `\n      <div class="grid-3">${posts.slice(0, 3).map(card).join("")}\n      </div>`);
}
fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemap(posts));

console.log(`建置完成：${posts.length} 篇文章，網址 ${SITE_URL}`);
