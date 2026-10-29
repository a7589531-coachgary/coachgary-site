// CoachGary Performance 共用程式：頁首、頁尾、連結設定

// 網站設定：申請好之後把連結貼到這裡，留空的按鈕會自動顯示「即將推出」
const SITE = {
  newebpay: {              // 藍新金流收款連結
    digital: "",           // 數位課表／電子書
    course: "",            // 線上課程
    subscription: "",      // 訓練方案訂閱
    onsite: ""             // 實體訓練／講座
  },
  forms: {
    program: "https://docs.google.com/forms/d/1UwCNmaPhEjajOgVhkwRHVAqnGkqquPNJ7tkJiG9e4XU/viewform",
    consult: "https://docs.google.com/forms/d/1bYuIWplxda3Gh30D1SnbvcnIc788ezzvxg2bt3A187k/viewform"
  },
  ga4: "",                 // Google Analytics 評估 ID，例如 G-XXXXXXXXXX
  instagram: "https://www.instagram.com/coach_gary_",
  youtube: "https://www.youtube.com/@coach_gary_sport_performance/videos"
};

const NAV = [
  ["services.html", "服務"],
  ["products.html", "產品"],
  ["about.html", "關於"],
  ["blog.html", "部落格"],
  ["faq.html", "常見問題"],
  ["contact.html", "聯絡"]
];

// 本機預覽時顯示「範例」標籤與佔位內容，上線後自動隱藏
const isLocal = ["localhost", "127.0.0.1", ""].includes(location.hostname);
if (isLocal) document.documentElement.classList.add("dev");

const page = document.body.dataset.page;

document.getElementById("site-header").innerHTML = `
  <div class="wrap">
    <a class="brand" href="index.html"><img class="brand-logo" src="assets/logo-112.png" alt="CoachGary Performance" width="40" height="40"><b>CoachGary <span>Performance</span></b></a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="開啟選單">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
    <nav id="site-menu" aria-label="主選單">
      <ul>${NAV.map(([href, label]) =>
        `<li><a href="${href}"${href.startsWith(page) ? ' aria-current="page"' : ""}>${label}</a></li>`).join("")}
      </ul>
      <a class="btn accent" href="contact.html">預約諮詢</a>
    </nav>
  </div>`;

const header = document.getElementById("site-header");
const menuBtn = header.querySelector(".menu-btn");
menuBtn.addEventListener("click", () => {
  const open = header.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
  menuBtn.setAttribute("aria-label", open ? "關閉選單" : "開啟選單");
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && header.classList.contains("open")) menuBtn.click();
});

document.getElementById("site-footer").innerHTML = `
  <div class="wrap">
    <div class="foot">
      <div>
        <a class="brand" href="index.html"><img class="brand-logo" src="assets/logo-112.png" alt="" width="56" height="56"><b>CoachGary <span>Performance</span></b></a>
        <p>運動表現訓練・肌力與體能。由職棒體能教練葉博文創立。</p>
      </div>
      <div>
        <h4>網站導覽</h4>
        <ul>
          <li><a href="services.html">服務內容</a></li>
          <li><a href="products.html">方案與產品</a></li>
          <li><a href="about.html">關於創辦人</a></li>
          <li><a href="faq.html">常見問題</a></li>
          <li><a href="contact.html">聯絡與合作</a></li>
        </ul>
      </div>
      <div>
        <h4>內容</h4>
        <ul>
          <li><a href="blog.html">部落格</a></li>
          <li><a href="blog.html#newsletter">訂閱新文章</a></li>
          <li><a href="${SITE.youtube}" target="_blank" rel="noopener">YouTube</a></li>
          <li><a href="${SITE.instagram}" target="_blank" rel="noopener">Instagram</a></li>
        </ul>
      </div>
      <div>
        <h4>付款與服務</h4>
        <ul>
          <li>藍新金流：信用卡・ATM・超商</li>
          <li>服務條款（建置中）</li>
          <li>退款政策（建置中）</li>
          <li>隱私權政策（建置中）</li>
        </ul>
      </div>
    </div>
    <div class="copy">
      <div>© 2026 CoachGary Performance 葉博文</div>
      <div>IG <a href="${SITE.instagram}" target="_blank" rel="noopener">@coach_gary_</a></div>
    </div>
  </div>`;

function setLink(el, url, soonText) {
  if (url) {
    el.href = url;
    el.target = "_blank";
    el.rel = "noopener";
  } else {
    el.removeAttribute("href");
    el.setAttribute("aria-disabled", "true");
    if (el.classList.contains("btn")) { el.classList.add("soon"); el.textContent = soonText; }
  }
}

document.querySelectorAll("[data-pay]").forEach(el => setLink(el, SITE.newebpay[el.dataset.pay], "即將推出"));
document.querySelectorAll("[data-form]").forEach(el => setLink(el, SITE.forms[el.dataset.form], "即將開放"));

// 部落格分類篩選＋搜尋：網址 blog.html?cat=分類 可直接分享
const filters = document.querySelector(".filters");
if (filters) {
  const chips = [...filters.querySelectorAll(".chip")];
  const cards = [...document.querySelectorAll(".posts-grid .card.post")];
  const feature = document.querySelector(".featured-post");
  const search = document.querySelector(".search input");
  const results = document.querySelector(".results");
  const empty = document.querySelector(".filter-empty");
  const state = { cat: "", q: "" };

  const apply = () => {
    const { cat, q } = state;
    chips.forEach(c => c.setAttribute("aria-pressed", c.dataset.filter === cat));
    // 沒有篩選時，最新文章以大卡片呈現，列表中不重複顯示
    const showFeature = !cat && !q && feature;
    if (feature) feature.hidden = !showFeature;
    let shown = 0;
    cards.forEach(c => {
      const match = (!cat || c.dataset.category === cat) && (!q || c.dataset.search.includes(q));
      c.hidden = !match || (showFeature && c.hasAttribute("data-latest"));
      if (match) shown++;
    });
    if (results) {
      results.textContent = q ? `搜尋「${q}」・共 ${shown} 篇` : cat ? `${cat}・共 ${shown} 篇` : "";
      results.hidden = !results.textContent;
    }
    if (empty) empty.hidden = shown > 0;
    const url = new URL(location.href);
    cat ? url.searchParams.set("cat", cat) : url.searchParams.delete("cat");
    history.replaceState(null, "", url);
  };

  chips.forEach(c => c.addEventListener("click", () => { state.cat = c.dataset.filter; apply(); }));
  if (search) search.addEventListener("input", () => { state.q = search.value.trim().toLowerCase(); apply(); });
  const initial = new URLSearchParams(location.search).get("cat") || "";
  state.cat = chips.some(c => c.dataset.filter === initial) ? initial : "";
  apply();
}

// 流量統計：填入 GA4 評估 ID 且不在本機時才載入
if (SITE.ga4 && !isLocal) {
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + SITE.ga4;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", SITE.ga4);
}
