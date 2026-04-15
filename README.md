# Dev.to Un-Sticker 📌

A Chrome Extension (Manifest V3) that unsticks your Dev.to reading list — browse saved articles and get random reminders to actually read them.

## Features

- 🔑 **Auth** — Paste your Dev.to API key, stored securely in `chrome.storage.local`
- 📚 **Reading List** — Fetches your list with infinite scroll (`page=0`, `per_page=25`)
- ✨ **Random Pick** — Glassmorphism featured card with a shuffle button
- ⏰ **Reminders** — Background service worker picks a random article every 1–8 hours via `chrome.alarms` + `chrome.notifications`
- 🎨 **Design** — Dark header, amber accents, clean cards, DEV.to-style icon

## File Structure

```
dev_article_ext/
├── manifest.json      MV3 config
├── popup.html         Extension popup
├── popup.js           Fetch, render, infinite scroll, shuffle, settings
├── style.css          Full design system
├── background.js      Service worker — alarms & notifications
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Installation

1. Go to `chrome://extensions/`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** → select this folder
4. Click the extension icon → **Settings** → paste your API key → Save

## Getting Your API Key

Go to [dev.to/settings/extensions](https://dev.to/settings/extensions) and generate a key under **DEV Community API Keys**.
