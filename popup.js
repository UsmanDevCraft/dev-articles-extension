const API_BASE_READING_LIST = "https://dev.to/api/readinglist";
const API_BASE_USER_DATA = "https://dev.to/api/users/me";
const PER_PAGE = 50;

// ---------- DOM references ----------
const $ = (id) => document.getElementById(id);

const mainView = $("mainView");
const settingsView = $("settingsView");
const articleList = $("articleList");
const userName = $("userName");
const userFullName = $("userFullName");
const userProfileImg = $("userProfileImg");
const defaultLogo = $("defaultLogo");
const featuredTitle = $("featuredTitle");
const featuredAuthor = $("featuredAuthor");
const featuredReadBtn = $("featuredReadBtn");
const articleCount = $("articleCount");
const listHeader = $("listHeader");
const listTabs = $("listTabs");
const countAll = $("countAll");
const countUnread = $("countUnread");
const countRead = $("countRead");
const reminderStatus = $("reminderStatus");
const stateNoKey = $("stateNoKey");
const stateEmpty = $("stateEmpty");
const stateLoading = $("stateLoading");
const stateError = $("stateError");
const errorMsg = $("errorMsg");
const apiKeyInput = $("apiKeyInput");
const intervalSelector = $("intervalSelector");
const toast = $("toast");
const scrollLoader = $("scrollLoader");

let articles = [];
let featuredArticle = null;
let currentPage = 1;
let isLoading = false;
let hasMore = true;
let currentApiKey = "";
let readArticles = [];
let activeTab = "all";

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
    listHeader,
    articleList,
  ].forEach((el) => el.classList.add("hidden"));
  if (scrollLoader) scrollLoader.classList.add("hidden");
  if (stateId) {
    const el = $(stateId);
    if (el) el.classList.remove("hidden");
  }
}

// ---------- Fetch a single page ----------
async function fetchPage(apiKey, page) {
  const res = await fetch(
    `${API_BASE_READING_LIST}?page=${page}&per_page=${PER_PAGE}`,
    {
      headers: { "api-key": apiKey },
    },
  );

  if (!res.ok) {
    if (res.status === 401)
      throw new Error("Invalid API key. Please check your settings.");
    throw new Error(`API error: ${res.status}`);
  }

  return await res.json();
}

// ---------- Fetch User Data ----------
async function fetchUserData(apiKey) {
  const res = await fetch(`${API_BASE_USER_DATA}`, {
    headers: { "api-key": apiKey },
  });

  if (!res.ok) {
    if (res.status === 401)
      throw new Error("Invalid API key. Please check your settings.");
    throw new Error(`API error: ${res.status}`);
  }

  return await res.json();
}

// ---------- Initial load ----------
async function fetchReadingList(apiKey) {
  currentApiKey = apiKey;
  currentPage = 1;
  articles = [];
  hasMore = true;
  featuredArticle = null;
  articleList.querySelectorAll(".article-card").forEach((el) => el.remove());

  setVisibleState("stateLoading");

  try {
    const [data, userData] = await Promise.all([
      fetchPage(apiKey, currentPage),
      fetchUserData(apiKey).catch((err) => null),
    ]);

    if (userData) {
      if (userData.profile_image && userProfileImg && defaultLogo) {
        userProfileImg.src = userData.profile_image;
        userProfileImg.style.display = "block";
        defaultLogo.style.display = "none";
      }
      if (userData.name && userFullName) {
        userFullName.textContent = userData.name;
      }
      if (userData.username && userName) {
        userName.textContent = "@" + userData.username;
        userName.classList.add("user-link");
        userName.title = `Visit @${userData.username} on Dev.to`;
        userName.onclick = () => {
          chrome.tabs.create({ url: `https://dev.to/${userData.username}` });
        };
      }
    }

    articles = data;
    hasMore = data.length >= PER_PAGE;
    currentPage++;

    if (articles.length === 0) {
      setVisibleState("stateEmpty");
      articleCount.textContent = "0";
      return;
    }

    setVisibleState(null);
    listHeader.classList.remove("hidden");
    articleList.classList.remove("hidden");
    renderNewArticles(articles);
    updateCounts();
  } catch (err) {
    setVisibleState("stateError");
    errorMsg.textContent = err.message;
  }
}

// ---------- Load more (infinite scroll) ----------
async function loadMore() {
  if (isLoading || !hasMore || !currentApiKey) return;
  isLoading = true;
  if (scrollLoader) scrollLoader.classList.remove("hidden");

  try {
    const data = await fetchPage(currentApiKey, currentPage);
    if (data.length < PER_PAGE) hasMore = false;
    if (data.length === 0) {
      isLoading = false;
      if (scrollLoader) scrollLoader.classList.add("hidden");
      return;
    }

    articles.push(...data);
    currentPage++;
    renderNewArticles(data);
    updateCounts();
  } catch (err) {
    showToast("⚠️ Failed to load more");
  }

  isLoading = false;
  if (scrollLoader) scrollLoader.classList.add("hidden");
}

// ---------- Render new batch of articles ----------
function renderNewArticles(items) {
  const startIdx = articleList.querySelectorAll(".article-card").length;

  items.forEach((item, i) => {
    const article = item.article;
    if (featuredArticle && article.id === featuredArticle.article.id) return;

    const isRead = readArticles.includes(article.id);
    const card = document.createElement("div");
    card.className = "article-card";
    card.dataset.status = isRead ? "read" : "unread";
    card.dataset.id = article.id;
    card.style.animationDelay = `${(startIdx + i) * 0.04}s`;

    const initial = (article.user?.name || "U").charAt(0).toUpperCase();
    const avatarHTML = article.user?.profile_image_90
      ? `<img class="article-avatar" src="${article.user.profile_image_90}" alt="${article.user.name}" />`
      : `<div class="article-avatar-placeholder">${initial}</div>`;

    card.innerHTML = `
      <div class="article-status-badge">✓</div>
      ${avatarHTML}
      <div class="article-body">
        <div class="article-title">${escapeHTML(article.title)}</div>
        <div class="article-author">by ${escapeHTML(article.user?.name || "Unknown")}</div>
        <div class="article-actions">
          <button class="article-read-btn" data-url="${article.url}">Read Now →</button>
          <button class="article-toggle-read" title="Mark Read/Unread">
            <span class="read-icon">✓</span> <span class="read-text">${isRead ? "Read" : "Mark as Read"}</span>
          </button>
        </div>
      </div>
    `;

    card.querySelector(".article-read-btn").addEventListener("click", () => {
      chrome.tabs.create({ url: article.url });
      if (!readArticles.includes(article.id)) {
        toggleReadStatus(article.id, card);
      }
    });

    card.querySelector(".article-toggle-read").addEventListener("click", () => {
      toggleReadStatus(article.id, card);
    });

    articleList.insertBefore(card, scrollLoader);
  });

  checkScrollState();
}

async function toggleReadStatus(id, cardNode) {
  const isRead = readArticles.includes(id);
  const toggleText = cardNode.querySelector(".read-text");

  if (isRead) {
    readArticles = readArticles.filter((num) => num !== id);
    cardNode.dataset.status = "unread";
    if (toggleText) toggleText.textContent = "Mark as Read";
  } else {
    readArticles.push(id);
    cardNode.dataset.status = "read";
    if (toggleText) toggleText.textContent = "Read";
  }
  await chrome.storage.local.set({ readArticles });
  updateCounts();
  checkScrollState();
}

function updateCounts() {
  const readCount = articles.filter((item) =>
    readArticles.includes(item.article.id),
  ).length;
  const unreadCount = articles.length - readCount;

  if (hasMore) {
    articleCount.textContent = `${articles.length}+`;
    if (countAll) countAll.textContent = `${articles.length}+`;
    if (countUnread) countUnread.textContent = `${unreadCount}+`;
    if (countRead) countRead.textContent = `${readCount}+`;
  } else {
    articleCount.textContent = articles.length;
    if (countAll) countAll.textContent = articles.length;
    if (countUnread) countUnread.textContent = unreadCount;
    if (countRead) countRead.textContent = readCount;
  }
}

function checkScrollState() {
  if (!isLoading && hasMore) {
    if (articleList.scrollHeight <= articleList.clientHeight + 60) {
      loadMore();
    }
  }
}

// ---------- Utility ----------
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Infinite scroll listener ----------
articleList.addEventListener("scroll", () => {
  const { scrollTop, scrollHeight, clientHeight } = articleList;
  if (scrollTop + clientHeight >= scrollHeight - 60) {
    loadMore();
  }
});

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.local.get([
    "devtoApiKey",
    "reminderHours",
    "readArticles",
  ]);
  const apiKey = data.devtoApiKey || "";
  const hours = data.reminderHours ?? 4;
  readArticles = data.readArticles || [];

  reminderStatus.textContent = hours > 0 ? `${hours}h` : "off";

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

if (listTabs) {
  listTabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (!btn) return;

    listTabs
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    activeTab = btn.dataset.tab;
    articleList.dataset.activeTab = activeTab;
    checkScrollState();
  });
}

// Settings toggle
$("btnSettings").addEventListener("click", showSettings);
$("stateNoKeyBtn").addEventListener("click", showSettings);
$("btnBack").addEventListener("click", () => {
  showMain();
  chrome.storage.local.get("devtoApiKey", (data) => {
    if (data.devtoApiKey) fetchReadingList(data.devtoApiKey);
  });
});

// Refresh
$("btnRefresh").addEventListener("click", () => {
  chrome.storage.local.get("devtoApiKey", (data) => {
    if (data.devtoApiKey) {
      fetchReadingList(data.devtoApiKey);
      showToast("Refreshing…");
    } else {
      showToast("Add your API key first");
    }
  });
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

  chrome.runtime.sendMessage({ type: "UPDATE_ALARM", hours });

  reminderStatus.textContent = hours > 0 ? `${hours}h` : "off";
  showToast("✅ Settings saved!");

  showMain();
  fetchReadingList(key);
});
