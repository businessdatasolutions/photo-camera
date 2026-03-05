# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based photo capture app for collecting object detection training data. Optimized for tablets in manufacturing environments. Uses Supabase for storage and database.

## Development

No build step. Serve with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

No test framework is configured.

## Architecture

Plain vanilla JS app — no framework, no bundler, no npm dependencies. All JS is loaded via `<script>` tags in `index.html`. External dependencies (Supabase JS client, JSZip) are loaded from CDN.

**Key modules (all global scope, order matters in index.html):**

- `config.js` — Supabase URL, anon key, storage bucket name, JPEG quality constant
- `camera.js` — `Camera` class: webcam access via MediaDevices API, front/back switching, canvas-based JPEG capture
- `storage.js` — `Storage` class: Supabase client init, file upload to Storage bucket, photo/label CRUD against Postgres, IndexedDB-based offline upload queue
- `gallery.js` — `Gallery` class: photo grid with multi-select, ZIP download via JSZip, batch delete
- `app.js` — Entry point: wires up DOM event listeners, manages view switching (camera ↔ gallery), label dropdown

**Two views** toggled via `view-hidden` CSS class: `#camera-view` and `#gallery-view`.

**Offline support:** When offline, `Storage._enqueue()` saves blobs to IndexedDB. `_processQueue()` retries on reconnect (`online` event).

**Backend:** Supabase with two tables (`photos`, `labels`) and a `photos` storage bucket. All access is anonymous (anon key). Schema SQL is in README.md.

## Configuration

`config.js` contains Supabase credentials. It is gitignored via `.env` pattern but the file itself is committed. `config.js.example` provides the template.
