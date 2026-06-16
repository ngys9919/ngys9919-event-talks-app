# BigQuery Release Notes Hub - Application Architecture & Developer Guide

This document provides a detailed breakdown of the internal workings, APIs, and components of the BigQuery Release Notes Hub & Social Sharer. It is intended for developers looking to maintain or extend this application.

---

## 🏗️ System Overview

The application is structured as a decoupled web dashboard. The backend server acts as a structured API gateway that parses, caches, and segments Google Cloud's Atom XML RSS feed. The client-side is a vanilla SPA (Single Page Application) that manages UI states, search indexes, filters, and X/Twitter share actions.

```
+-------------------------------------------------------------+
|                     Google Cloud servers                    |
|             (BigQuery XML RSS Atom Feed Stream)             |
+------------------------------+------------------------------+
                               |
                               | (HTTP GET / XML Payload)
                               v
+------------------------------+------------------------------+
|                        Flask Backend                        |
|                                                             |
|   +-----------------------------------------------------+   |
|   |                  Endpoint Controller                |   |
|   |         GET /             GET /api/notes            |   |
|   +--------------------------+--------------------------+   |
|                              |                              |
|                              v                              |
|   +--------------------------+--------------------------+   |
|   |              Memory Cache Middleware                |   |
|   |   Bypassed on ?refresh=true or if > 30 mins old     |   |
|   +--------------------------+--------------------------+   |
|                              |                              |
|                              v                              |
|   +--------------------------+--------------------------+   |
|   |              Atom Feed Parsing Engine               |   |
|   |      1. XML standard tree mapping                   |   |
|   |      2. <h3> segmentation using BeautifulSoup       |   |
|   |      3. Hashing signature card IDs                  |   |
|   +-----------------------------------------------------+   |
+------------------------------+------------------------------+
                               |
                               | (Structured JSON API response)
                               v
+------------------------------+------------------------------+
|                     Client Web Browser                      |
|                                                             |
|   +-----------------------------------------------------+   |
|   |                  State Controller                   |   |
|   |      - releaseNotes[]   - selectedNote              |   |
|   |      - activeFilter     - searchQuery               |   |
|   +--------------------------+--------------------------+   |
|                              |                              |
|                              v                              |
|   +--------------------------+--------------------------+   |
|   |                Reactive Rendering Pipeline          |   |
|   |      - Skeletons         - Filtering Logic          |   |
|   |      - DOM updates       - CSS Layout Transitions   |   |
|   +--------------------------+--------------------------+   |
|                              |                              |
|                              v                              |
|   +--------------------------+--------------------------+   |
|   |             X/Twitter Share & Web Intent            |   |
|   |      - URL matching      - Length counter (280 max) |   |
|   +-----------------------------------------------------+   |
+-------------------------------------------------------------+
```

---

## 🖥️ Backend Deep Dive (`app.py`)

The backend is built using Flask 3.1.3 and handles XML data retrieval, parsing, and caching.

### 1. In-Memory Caching
To protect Google Cloud's servers from rate-limiting and accelerate page loads, the server implements a simple in-memory caching system:
- **Cache Store**: A global dictionary `feed_cache` holds the list of parsed nodes and a `last_updated` Unix epoch.
- **Caching Logic**: The server checks the age of the cache. If `time.time() - last_updated < 1800` (30 minutes), it returns cached data.
- **Cache Bypass**: Appending `?refresh=true` to the request URL forces the cache to clear and pulls fresh data.

### 2. XML Atom Feed Parsing
The Atom feed contains namespaces. To query elements like `<entry>`, `<title>`, or `<content>` within the root tree, the parser maps the standard Atom namespace:
```python
ns = {'atom': 'http://www.w3.org/2005/Atom'}
```
It queries nodes using `root.findall('atom:entry', ns)`.

### 3. Header-based Content Segmentation
Under a single `<entry>` (usually one day's logs), Google includes a single HTML `<content>` block containing various updates separated by headers. The parsing engine processes these blocks dynamically:
- It initializes a `BeautifulSoup` instance over the HTML payload.
- It loops through the top-level HTML nodes.
- When an `<h3>` tag (e.g. `<h3>Feature</h3>`, `<h3>Breaking</h3>`) is found, the parser flushes any previously accumulated child nodes into a standalone dictionary representing that specific update, and updates the category metadata.
- Text representation is generated using `BeautifulSoup.get_text()` to provide raw snippets for tweet drafting.
- An MD5 signature ID is computed for each card using:
  ```python
  note_hash = hashlib.md5(f"{date_str}-{text_str}".encode('utf-8')).hexdigest()
  ```

---

## 📱 Frontend Deep Dive (`static/js/main.js`)

The client interface is a reactive application built using Vanilla JavaScript.

### 1. State Management
The application lifecycle is controlled by four core state properties:
- `releaseNotes`: Master array of all parsed updates returned by the server.
- `selectedNote`: The note object currently selected for tweeting (or `null` if none).
- `activeFilter`: The lowercase string representing the active category pill (`'all'`, `'feature'`, `'breaking'`, etc.).
- `searchQuery`: The search input value used for text matching.

### 2. Render Pipeline
When the page loads or state changes, `renderNotes()` runs:
1. It filters the master array against `activeFilter` and `searchQuery`.
2. Clears the card list container.
3. Maps each filtered note into a custom card HTML template.
4. Binds click event listeners to toggle selection.

### 3. X/Twitter URL Length Validation
Twitter replaces all URLs inside a tweet text with a shortened `t.co` link, which counts as exactly **23 characters** towards the 280-character limit, regardless of the URL's actual length. 

The client handles this in `updateCharCount()`:
- It isolates HTTP/HTTPS URLs using a regex: `/https?:\/\/[^\s]+/g`.
- Deducts the character lengths of found URLs from the overall string length.
- Adds 23 characters for each matched URL.
- Adds 24 characters (23 characters for the URL + 1 character space padding) to account for the release notes reference link appended upon posting.
- If the final calculated length exceeds 280, the counter class changes to `.danger` (red) and disables the submit button.

---

## 📡 API Reference

### Get Release Notes
Fetches the parsed list of release notes.

- **URL**: `/api/notes`
- **Method**: `GET`
- **Query Params**:
  - `refresh=[true|false]` (optional): Bypasses backend cache when set to `true`.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "fetched_fresh": true,
    "last_updated": 1781593364,
    "notes": [
      {
        "id": "29b3a13fed516566b4cab55a57d876bd",
        "date": "April 13, 2026",
        "type": "Feature",
        "content_html": "<p>To reduce LLM token consumption...</p>",
        "content_text": "To reduce LLM token consumption and query latency when processing...",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#April_13_2026"
      }
    ]
  }
  ```

---

## 🛠️ Development & Troubleshooting

### Local Dev Port Conflicts
If you encounter `[Errno 98] Address already in use` or similar errors when running the Flask app, a process might already be bound to port `5000`. 

To locate and stop the process on Windows:
```powershell
# Find process ID (PID) using port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess

# Terminate process
Stop-Process -Id <PID> -Force
```

### Feed Connection Failures
In the event that the server cannot reach `docs.cloud.google.com` (due to firewalls, corporate proxies, or internet outages), the backend will print an error log and fall back to serving whatever is saved in its in-memory `feed_cache`. If the cache is empty, a standard `500` error JSON payload is returned, prompting the user with a **Try Again** button on the client interface.
