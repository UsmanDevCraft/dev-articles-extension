const ALARM_NAME = "devto-unsticker-reminder";
const API_BASE = "https://dev.to/api/readinglist";

// ---------- Install / Start-up ---------------
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Un-Sticker] Extension installed.");
  await setupAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await setupAlarm();
});

// ---------- Set up alarm based on stored interval ----------
async function setupAlarm() {
  const data = await chrome.storage.local.get([
    "reminderValue",
    "reminderUnit",
    "reminderEnabled",
  ]);
  const rValue = data.reminderValue ?? 4;
  const rUnit = data.reminderUnit || "hours";
  const rEnabled = data.reminderEnabled ?? true;

  // Clear any existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  if (rEnabled) {
    let multiplier = 60; // default hours
    switch (rUnit) {
      case "minutes":
        multiplier = 1;
        break;
      case "hours":
        multiplier = 60;
        break;
      case "days":
        multiplier = 60 * 24;
        break;
      case "weeks":
        multiplier = 60 * 24 * 7;
        break;
      case "months":
        multiplier = 60 * 24 * 30;
        break;
    }

    const minutes = rValue * multiplier;

    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: minutes,
      periodInMinutes: minutes,
    });
    console.log(
      `[Un-Sticker] Alarm set: every ${rValue} ${rUnit} (${minutes} mins).`,
    );
  } else {
    console.log("[Un-Sticker] Reminders disabled.");
  }
}

// ---------- Alarm handler ----------
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  console.log("[Un-Sticker] Alarm fired — picking a random article.");

  const data = await chrome.storage.local.get("devtoApiKey");
  const apiKey = data.devtoApiKey;
  if (!apiKey) {
    console.warn("[Un-Sticker] No API key stored. Skipping notification.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}?per_page=30`, {
      headers: { "api-key": apiKey },
    });

    if (!res.ok) {
      console.error(`[Un-Sticker] API returned ${res.status}`);
      return;
    }

    const articles = await res.json();
    if (articles.length === 0) {
      console.log("[Un-Sticker] Reading list is empty.");
      return;
    }

    // Pick a random article
    const randomItem = articles[Math.floor(Math.random() * articles.length)];
    const article = randomItem.article;

    // Send notification
    chrome.notifications.create(`unsticker-${Date.now()}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "📚 Time to Read!",
      message: `"${article.title}" by ${article.user?.name || "a Dev.to author"}`,
      priority: 2,
    });

    // Store the URL so we can open it when clicked
    await chrome.storage.local.set({ lastNotifUrl: article.url });
  } catch (err) {
    console.error("[Un-Sticker] Error fetching reading list:", err);
  }
});

// ---------- Notification click handler ----------
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith("unsticker-")) return;

  const data = await chrome.storage.local.get("lastNotifUrl");
  if (data.lastNotifUrl) {
    chrome.tabs.create({ url: data.lastNotifUrl });
  }

  chrome.notifications.clear(notificationId);
});

// ---------- Message handler (from popup) ----------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "UPDATE_ALARM") {
    setupAlarm().then(() => sendResponse({ ok: true }));
    return true; // keeps the message channel open for async
  }
});
