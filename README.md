# Unlock.SBS — Smart Bypass Service

**Unlock access — the legal way.** A tiny, privacy-first helper that adds a lightweight tips panel to Google, Yandex, Bing and DuckDuckGo. It surfaces **official alternates (mirrors) or full URLs** you provide, **related bookmarks** already in your browser, and a quick link to the **Wayback Machine**—so you can reach legitimate resources when a site is down or restricted.

- ✅ No proxy / VPN, no traffic interception
- ✅ No remote code, no analytics, no tracking
- ✅ Works only on search pages (SERP)
- ✅ EN/RU UI, import/export JSON
- ✅ **Recommendation bundles**: import curated JSON lists (not limited to mirrors)

> **Legal note:** Unlock.SBS does not bypass paywalls/DRM or alter search results. It only shows lawful alternatives you choose, your own bookmarks, and links to public web archives.

---

## Features

- **SERP panel**: shows alternates you saved (domain or full URL), related bookmarks (optional), and Wayback link.
- **Brand matching**: robust tokenization with Cyrillic→Latin transliteration; sensitivity slider.
- **Bookmarks rediscovery** *(opt-in)*: locally highlights your matching bookmarks; optional toolbar badge with match count.
- **Recommendation bundles**: import curated JSON (e.g., diagnostics & utilities). You’re not limited to mirrors.
- **Privacy-by-design**: all matching runs locally; no telemetry; no remote code.
- **Import/Export**: JSON format for easy sharing across devices.

---

## Install

- **Chrome Web Store**: [Unlock.SBS on CWS](https://chromewebstore.google.com/detail/ldimjibdnbccpjgndkealkhojebhjdbh?utm_source=item-share-cb)
- **Manual (dev mode)**:
  1. Clone repo → open `chrome://extensions`
  2. Enable **Developer mode** → **Load unpacked**
  3. Select the `src/` folder

---

## Quick start

1. Open **Settings** → add a base **domain** and alternates (domain **or full URL**).  
2. Or **Import JSON** (see formats below).  
3. Search as usual—panel appears on Google/Yandex/Bing/DDG when your query matches a brand/domain.

**JSON formats supported**
```json
{
  "example.com": ["example.org", "https://help.example.com/faq"]
}
