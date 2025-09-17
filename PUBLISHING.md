# Publishing (Chrome Web Store)

## Build ZIP
- Archive the contents of `src/` (rooted at manifest.json).

## Listing
- **Category**: Search Tools
- **Short description**: Shows official mirrors and your related bookmarks right on search pages. Smart hints when websites are blocked.
- **Full description**: Use README hero + features (legal, privacy-first).
- **Screenshots**: 1280×800 (SERP panel, Options, Badge).
- **Privacy**:
  - bookmarks — read-only, local matching
  - scripting — render tips panel on SERP
  - storage — save settings/mirrors
  - tabs — open links/settings, update badge
  - webNavigation — refresh panel on SPA URL changes
  - **No remote code** — only static resources
- **Data practices**: no collection, no sharing, no sale.

## Testing instructions
1) Add `example.com → example.org`.  
2) Search “example” on Google — panel shows mirror pill.  
3) Enable/disable bookmarks and badge — SERP updates.  
4) Import JSON (starter pack) — pills render accordingly.

## Recommended bundles
Provide **static JSON** on your site (e.g., diagnostics/utilities). Users import manually—no auto-fetch.
