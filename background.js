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
  const data = await chrome.storage.local.get(["reminderEnabled"]);
  const rEnabled = data.reminderEnabled ?? true;

  // Clear any existing alarm
  await chrome.alarms.clear(ALARM_NAME);

  if (rEnabled) {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: 60,
      periodInMinutes: 60,
    });
    console.log("[Un-Sticker] Alarm set: hourly check for smart reminders.");
  } else {
    console.log("[Un-Sticker] Reminders disabled.");
  }
}

// ---------- Alarm handler ----------
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;

  console.log("[Un-Sticker] Alarm fired — checking smart reminders.");

  const data = await chrome.storage.local.get([
    "devtoApiKey",
    "readArticles",
    "notifiedStages",
  ]);
  const apiKey = data.devtoApiKey;
  const readArticles = data.readArticles || [];
  let notifiedStages = data.notifiedStages || {};

  if (!apiKey) {
    console.warn("[Un-Sticker] No API key stored. Skipping notification.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}?per_page=100`, {
      headers: { "api-key": apiKey },
    });

    if (!res.ok) {
      console.error(`[Un-Sticker] API returned ${res.status}`);
      return;
    }

    const items = await res.json();
    if (items.length === 0) {
      console.log("[Un-Sticker] Reading list is empty.");
      return;
    }

    const now = Date.now();
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    let notifiedCount = 0;

    for (const item of items) {
      const article = item.article;
      if (readArticles.includes(article.id)) continue;

      const savedAt = new Date(item.created_at).getTime();
      const daysOld = (now - savedAt) / MS_PER_DAY;

      if (daysOld > 31) continue; // Skip articles whose created at is more than a month

      let targetStage = 0;
      if (daysOld >= 30) targetStage = 30;
      else if (daysOld >= 14) targetStage = 14;
      else if (daysOld >= 7) targetStage = 7;
      else if (daysOld >= 3) targetStage = 3;

      if (targetStage > 0) {
        const currentStage = notifiedStages[article.id] || 0;
        if (targetStage > currentStage) {
          let stageLabel = "";
          if (targetStage === 30) stageLabel = "a month";
          else if (targetStage === 14) stageLabel = "2 weeks";
          else if (targetStage === 7) stageLabel = "7 days";
          else if (targetStage === 3) stageLabel = "3 days";

          // Send notification
          const notifId = `unsticker-${article.id}-${targetStage}`;
          chrome.notifications.create(notifId, {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: `📚 Saved ${stageLabel} ago!`,
            message: `"${article.title}" by ${article.user?.name || "a Dev.to author"}`,
            priority: 2,
          });

          // Store the URL specific to this notification so multiple won't override
          const urlKey = `notifUrl_${notifId}`;
          await chrome.storage.local.set({ [urlKey]: article.url });

          notifiedStages[article.id] = targetStage;
          notifiedCount++;

          // Prevent spam by capping at 5 notifications per check
          if (notifiedCount >= 5) break;
        }
      }
    }

    if (notifiedCount > 0) {
      await chrome.storage.local.set({ notifiedStages });
    }
  } catch (err) {
    console.error(
      "[Un-Sticker] Error fetching reading list for reminders:",
      err,
    );
  }
});

// ---------- Notification click handler ----------
chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (!notificationId.startsWith("unsticker-")) return;

  const urlKey = `notifUrl_${notificationId}`;
  const data = await chrome.storage.local.get(urlKey);
  if (data[urlKey]) {
    chrome.tabs.create({ url: data[urlKey] });
    chrome.storage.local.remove(urlKey); // cleanup
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
