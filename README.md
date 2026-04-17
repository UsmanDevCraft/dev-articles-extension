# Dev.to Un-Sticker 📌

A powerful Chrome Extension (Manifest V3) designed to help developers finally conquer their Dev.to reading lists. Instead of letting your saved list grow indefinitely, Un-Sticker helps you categorize, filter, and actively reminds you to read the articles you save!

## 🚀 The Problem it Resolves

We've all been there: you see a fantastic developer article, hit "Save for later," and it immediately vanishes into the void of a massive, unorganized reading list. Un-Sticker restores order by letting you **locally separate your collection into "Read" and "Unread" statuses**, giving you the satisfaction of officially checking things off and focusing entirely on what you haven't read yet.

## ✨ Functionality and Features

- **Local Read/Unread State** — As you browse, mark articles as read/unread directly from the popup. Switch fluidly between `All`, `Unread`, and `Read` tabs without reloading.
- **Smart Reminders System** — The extension acts as a personal reading assistant! It scans the age of unread articles and delivers native Chrome Notifications at exact age milestones: **3 days, 7 days, 2 weeks, and 1 month**.
- **Reminder Badges** — When an unread article is inside the 30-day reminder threshold, a unique ⏰ badge appears on its card. Once marked as read or aged past 31 days, it is removed from the queue.
- **Fluid UI & Infinite Scrolling** — Beautiful glassmorphism UI styled with shimmering skeleton loaders securely handling pages of hundreds of reading list items.
- **Secure Integration** — The extension communicates directly with your Dev.to account locally using your private API key (`chrome.storage.local`).

## 📂 Project Structure

```text
dev_article_ext/
├── manifest.json      # Extension configuration and MV3 permissions
├── popup.html         # User Interface layout for the popup window
├── popup.js           # Core logic: State management, infinite scroll, filtering, badge updates, settings
├── style.css          # Custom design system with tokens, glassmorphism logic, and micro-animations
├── background.js      # Service Worker handling the hourly cron-job reminder tracking and alerts
└── icons/             # Chrome extension iconography
```

## 🔮 Future Roadmap

To make managing reading lists even simpler, upcoming versions will feature:

- **Email Service Integration**: Opt-in to receive a friendly email digest of your lingering unread articles.
- **AI Analytics**: Integration with AI to automatically summarize lengthy articles right in the extension before you even open them!

## ⚙️ Installation

1. Go to `chrome://extensions/` in your browser.
2. Enable **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** and select this directory.
4. Pin the extension, open the Settings panel (⚙️), paste your Dev.to API Key, and save.

## 🔑 Getting Your API Key

Go to [dev.to/settings/extensions](https://dev.to/settings/extensions) and generate an API key under **DEV Community API Keys**.
