class Storage {
  constructor() {
    this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.dbName = 'photo-camera-queue';
    this.storeName = 'pending-uploads';
    this._initDB();
    this._processQueue();
    window.addEventListener('online', () => this._processQueue());
  }

  _initDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  async upload(blob, label) {
    const timestamp = Date.now();
    const filename = `${timestamp}.jpg`;
    const storagePath = `${label}/${filename}`;

    if (!navigator.onLine) {
      await this._enqueue({ blob, label, filename, storagePath, width: 0, height: 0 });
      return { queued: true, storagePath };
    }

    try {
      await this._doUpload(blob, label, filename, storagePath);
      return { queued: false, storagePath };
    } catch (err) {
      await this._enqueue({ blob, label, filename, storagePath, width: 0, height: 0 });
      return { queued: true, storagePath, error: err.message };
    }
  }

  async _doUpload(blob, label, filename, storagePath) {
    const { error: storageError } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false });

    if (storageError) throw storageError;

    const { error: dbError } = await this.supabase
      .from('photos')
      .insert({
        label,
        filename,
        storage_path: storagePath,
        size_bytes: blob.size
      });

    if (dbError) throw dbError;
  }

  _enqueue(item) {
    return new Promise((resolve, reject) => {
      if (!this.db) { reject(new Error('DB not ready')); return; }
      const tx = this.db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).add(item);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async _processQueue() {
    if (!navigator.onLine || !this.db) return;
    const items = await new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const req = tx.objectStore(this.storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    for (const item of items) {
      try {
        await this._doUpload(item.blob, item.label, item.filename, item.storagePath);
        await new Promise((resolve, reject) => {
          const tx = this.db.transaction(this.storeName, 'readwrite');
          tx.objectStore(this.storeName).delete(item.id);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        break; // stop processing if upload fails, try again later
      }
    }
  }

  // Label management
  async getLabels() {
    const { data, error } = await this.supabase
      .from('labels')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  }

  async createLabel(name) {
    const { data, error } = await this.supabase
      .from('labels')
      .insert({ name })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Photo queries
  async getPhotos(label) {
    let query = this.supabase
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (label) {
      query = query.eq('label', label);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getPhotoCounts() {
    const { data, error } = await this.supabase
      .from('photos')
      .select('label');
    if (error) throw error;

    const counts = {};
    for (const row of data) {
      counts[row.label] = (counts[row.label] || 0) + 1;
    }
    return counts;
  }

  getPublicUrl(storagePath) {
    const { data } = this.supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async deletePhotos(photos) {
    const paths = photos.map(p => p.storage_path);
    const ids = photos.map(p => p.id);

    const { error: storageError } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .remove(paths);
    if (storageError) throw storageError;

    const { error: dbError } = await this.supabase
      .from('photos')
      .delete()
      .in('id', ids);
    if (dbError) throw dbError;
  }
}
