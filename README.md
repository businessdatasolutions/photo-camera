# Photo Camera

Browser-based photo capture app for collecting object detection training data. Optimized for tablets in manufacturing environments.

## Features

- Continuous rapid capture — tap, tap, tap with no interruptions
- Organize photos by label/category (e.g., "bolt", "bracket", "defect")
- Full native camera resolution (JPEG)
- Auto-upload to Supabase Storage
- Offline support — queues uploads when disconnected
- Gallery with filtering, multi-select, ZIP download, and delete

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run the SQL schema

In the Supabase SQL Editor, run:

```sql
create table photos (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  filename text not null,
  storage_path text not null,
  width integer,
  height integer,
  size_bytes integer,
  created_at timestamptz default now()
);

create index idx_photos_label on photos(label);

create table labels (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);
```

### 3. Create a storage bucket

In Supabase Dashboard > Storage:
1. Create a new bucket named `photos`
2. Set it to **Public**
3. Add a storage policy to allow anonymous uploads:

```sql
create policy "Allow anonymous uploads"
on storage.objects for insert
to anon
with check (bucket_id = 'photos');

create policy "Allow anonymous reads"
on storage.objects for select
to anon
using (bucket_id = 'photos');

create policy "Allow anonymous deletes"
on storage.objects for delete
to anon
using (bucket_id = 'photos');
```

### 4. Enable RLS policies for tables

```sql
alter table photos enable row level security;
alter table labels enable row level security;

create policy "Allow anonymous access to photos"
on photos for all to anon using (true) with check (true);

create policy "Allow anonymous access to labels"
on labels for all to anon using (true) with check (true);
```

### 5. Configure the app

Edit `config.js` and replace with your Supabase project URL and anon key:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 6. Serve the app

Any static file server works. For example:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Open the URL on your tablet and start capturing.

## File Structure

```
index.html    — Main entry point
style.css     — Tablet-optimized styles
config.js     — Supabase configuration
camera.js     — Camera access and capture
storage.js    — Supabase uploads and offline queue
gallery.js    — Gallery view and download
app.js        — Main application logic
```
