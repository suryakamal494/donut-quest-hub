

# Fix Social Share Preview (OG Tags)

## Problem
WhatsApp and Google show "Lovable App / Lovable Generated Project" instead of the correct QA Platform branding because:
- The `og:image` uses a **relative path** (`/og-image.png`) which social crawlers cannot resolve
- Missing `og:url` tag
- Missing Twitter description tag
- WhatsApp/Google have **cached** the old preview data

## Solution

### Step 1: Update `index.html` meta tags with absolute URLs

Replace the current OG/Twitter meta tags with **absolute URLs** pointing to your custom domain:

```text
og:url        -> https://qa.thedonutai.com
og:image      -> https://qa.thedonutai.com/og-image.png
twitter:image -> https://qa.thedonutai.com/og-image.png
```

Also add the missing `og:description` for Twitter.

**File:** `index.html`

### Step 2: Force cache refresh

After publishing, you will need to:

1. **Facebook/WhatsApp**: Go to [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and enter `https://qa.thedonutai.com` then click "Scrape Again". This clears WhatsApp's cache too since WhatsApp uses Facebook's crawler.

2. **Google**: Google re-crawls on its own schedule (can take days). To speed it up, use [Google Search Console](https://search.google.com/search-console) and request URL inspection + re-indexing.

3. **Quick WhatsApp trick**: If WhatsApp still shows old data, try sharing the URL with a query parameter like `https://qa.thedonutai.com?v=2` to bypass cache.

## Files to Modify

| File | Change |
|---|---|
| `index.html` | Change og:image and twitter:image to absolute URLs, add og:url, add twitter:description |

## Expected Outcome
- WhatsApp preview shows: **"QA Platform - Test Smarter, Ship Confidently"** with the correct OG image and description
- Google search results show the correct title and description

