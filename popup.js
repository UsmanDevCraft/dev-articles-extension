const API_BASE = "https://dev.to/api/readinglist";

// ---------- DOM references ----------
const $ = (id) => document.getElementById(id);

const mainView = $("mainView");
const settingsView = $("settingsView");
const articleList = $("articleList");
const featuredCard = $("featuredCard");
const featuredTitle = $("featuredTitle");
const featuredAuthor = $("featuredAuthor");
const featuredReadBtn = $("featuredReadBtn");
const articleCount = $("articleCount");
const listHeader = $("listHeader");
const listCount = $("listCount");
const reminderStatus = $("reminderStatus");
const stateNoKey = $("stateNoKey");
const stateEmpty = $("stateEmpty");
const stateLoading = $("stateLoading");
const stateError = $("stateError");
const errorMsg = $("errorMsg");
const apiKeyInput = $("apiKeyInput");
const intervalSelector = $("intervalSelector");
const toast = $("toast");

let articles = [];
let featuredArticle = null;

// ---------- Toast helper ----------
function showToast(message, duration = 2200) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), duration);
}

// ---------- View switching ----------
function showMain() {
  settingsView.classList.remove("active");
  mainView.classList.remove("hidden");
}

function showSettings() {
  mainView.classList.add("hidden");
  settingsView.classList.add("active");
}

// ---------- State helpers ----------
function setVisibleState(stateId) {
  [
    stateNoKey,
    stateEmpty,
    stateLoading,
    stateError,
    featuredCard,
    listHeader,
    articleList,
  ].forEach((el) => el.classList.add("hidden"));
  if (stateId) {
    const el = $(stateId);
    if (el) el.classList.remove("hidden");
  }
}

// ---------- Fetch reading list ----------
async function fetchReadingList(apiKey) {
  setVisibleState("stateLoading");

  try {
    const allArticles = [];
    let page = 1;
    const perPage = 30;
    let hasMore = true;

    // Fetch up to 5 pages (150 articles max)
    while (hasMore && page <= 5) {
      const res = await fetch(`${API_BASE}?page=${page}&per_page=${perPage}`, {
        headers: { "api-key": apiKey },
      });

      if (!res.ok) {
        if (res.status === 401)
          throw new Error("Invalid API key. Please check your settings.");
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      allArticles.push(...data);

      if (data.length < perPage) {
        hasMore = false;
      }

      page++;
    }

    articles = allArticles;
    renderArticles();
  } catch (err) {
    setVisibleState("stateError");
    errorMsg.textContent = err.message;
  }
}

// ---------- Render ----------
function renderArticles() {
  if (articles.length === 0) {
    setVisibleState("stateEmpty");
    articleCount.textContent = "0";
    return;
  }

  setVisibleState(null); // hide all states

  // Update counts
  articleCount.textContent = articles.length;
  listCount.textContent = `${articles.length} articles`;
  listHeader.classList.remove("hidden");
  articleList.classList.remove("hidden");

  // Show featured card
  if (!featuredArticle) shuffleFeatured();
  renderFeatured();
  featuredCard.classList.remove("hidden");

  // Render list (exclude featured)
  articleList.innerHTML = "";
  articles.forEach((item, idx) => {
    const article = item.article;
    if (featuredArticle && article.id === featuredArticle.article.id) return;

    const card = document.createElement("div");
    card.className = "article-card";
    card.style.animationDelay = `${idx * 0.04}s`;

    const initial = (article.user?.name || "U").charAt(0).toUpperCase();
    const avatarHTML = article.user?.profile_image_90
      ? `<img class="article-avatar" src="${article.user.profile_image_90}" alt="${article.user.name}" />`
      : `<div class="article-avatar-placeholder">${initial}</div>`;

    card.innerHTML = `
      ${avatarHTML}
      <div class="article-body">
        <div class="article-title">${escapeHTML(article.title)}</div>
        <div class="article-author">by ${escapeHTML(article.user?.name || "Unknown")}</div>
        <button class="article-read-btn" data-url="${article.url}">Read Now →</button>
      </div>
    `;
    articleList.appendChild(card);
  });

  // Attach click handlers
  articleList.querySelectorAll(".article-read-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      chrome.tabs.create({ url: btn.dataset.url });
    });
  });
}

function renderFeatured() {
  if (!featuredArticle) return;
  const a = featuredArticle.article;
  featuredTitle.textContent = a.title;
  featuredAuthor.textContent = a.user?.name || "Unknown";
  featuredReadBtn.onclick = () => chrome.tabs.create({ url: a.url });
}

function shuffleFeatured() {
  if (articles.length === 0) return;
  const idx = Math.floor(Math.random() * articles.length);
  featuredArticle = articles[idx];
}

// ---------- Utility ----------
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  // Load stored data
  const data = await chrome.storage.local.get(["devtoApiKey", "reminderHours"]);
  const apiKey = data.devtoApiKey || "";
  const hours = data.reminderHours ?? 4;

  // Update reminder status
  reminderStatus.textContent = hours > 0 ? `${hours}h` : "off";

  // Pre-fill settings
  apiKeyInput.value = apiKey;
  intervalSelector.querySelectorAll(".interval-option").forEach((btn) => {
    btn.classList.toggle("active", parseInt(btn.dataset.hours) === hours);
  });

  if (!apiKey) {
    setVisibleState("stateNoKey");
  } else {
    fetchReadingList(apiKey);
  }
});

// ---------- Event listeners ----------

// Settings toggle
$("btnSettings").addEventListener("click", showSettings);
$("stateNoKeyBtn").addEventListener("click", showSettings);
$("btnBack").addEventListener("click", () => {
  showMain();
  // Re-fetch if key was possibly changed
  chrome.storage.local.get("devtoApiKey", (data) => {
    if (data.devtoApiKey) fetchReadingList(data.devtoApiKey);
  });
});

// Refresh
$("btnRefresh").addEventListener("click", () => {
  chrome.storage.local.get("devtoApiKey", (data) => {
    if (data.devtoApiKey) {
      featuredArticle = null;
      fetchReadingList(data.devtoApiKey);
      showToast("Refreshing…");
    } else {
      showToast("Add your API key first");
    }
  });
});

// Shuffle
$("btnShuffle").addEventListener("click", () => {
  shuffleFeatured();
  renderFeatured();
  renderArticles();
  showToast("🔀 Shuffled!");
});

// Retry
$("retryBtn").addEventListener("click", () => {
  chrome.storage.local.get("devtoApiKey", (data) => {
    if (data.devtoApiKey) fetchReadingList(data.devtoApiKey);
  });
});

// Interval selection
intervalSelector.addEventListener("click", (e) => {
  const btn = e.target.closest(".interval-option");
  if (!btn) return;
  intervalSelector
    .querySelectorAll(".interval-option")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
});

// Save Settings
$("btnSave").addEventListener("click", async () => {
  const key = apiKeyInput.value.trim();
  const activeInterval = intervalSelector.querySelector(
    ".interval-option.active",
  );
  const hours = activeInterval ? parseInt(activeInterval.dataset.hours) : 4;

  if (!key) {
    showToast("⚠️ Please enter an API key");
    apiKeyInput.focus();
    return;
  }

  await chrome.storage.local.set({ devtoApiKey: key, reminderHours: hours });

  // Update alarm via background
  chrome.runtime.sendMessage({ type: "UPDATE_ALARM", hours });

  reminderStatus.textContent = hours > 0 ? `${hours}h` : "off";
  showToast("✅ Settings saved!");

  // Switch back and refresh
  showMain();
  fetchReadingList(key);
});
