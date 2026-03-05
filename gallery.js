class Gallery {
  constructor(storage, containerEl) {
    this.storage = storage;
    this.container = containerEl;
    this.photos = [];
    this.selected = new Set();
    this.currentLabel = null;
  }

  async load(label) {
    this.currentLabel = label || null;
    this.photos = await this.storage.getPhotos(label);
    this.selected.clear();
    this.render();
  }

  render() {
    const grid = this.container.querySelector('.gallery-grid');
    grid.innerHTML = '';

    for (const photo of this.photos) {
      const url = this.storage.getPublicUrl(photo.storage_path);
      const item = document.createElement('div');
      item.className = 'gallery-item' + (this.selected.has(photo.id) ? ' selected' : '');
      item.innerHTML = `<img src="${url}" loading="lazy" alt="${photo.label}">
        <div class="gallery-check">${this.selected.has(photo.id) ? '✓' : ''}</div>`;
      item.addEventListener('click', () => this._toggle(photo.id));
      grid.appendChild(item);
    }

    this.container.querySelector('.gallery-count').textContent =
      `${this.photos.length} photo${this.photos.length !== 1 ? 's' : ''}` +
      (this.currentLabel ? ` (${this.currentLabel})` : '');

    this.container.querySelector('.gallery-selection-count').textContent =
      this.selected.size > 0 ? `${this.selected.size} selected` : '';
  }

  _toggle(id) {
    if (this.selected.has(id)) {
      this.selected.delete(id);
    } else {
      this.selected.add(id);
    }
    this.render();
  }

  selectAll() {
    for (const p of this.photos) this.selected.add(p.id);
    this.render();
  }

  deselectAll() {
    this.selected.clear();
    this.render();
  }

  async downloadSelected() {
    const toDownload = this.photos.filter(p => this.selected.has(p.id));
    if (toDownload.length === 0) return;

    if (toDownload.length === 1) {
      const url = this.storage.getPublicUrl(toDownload[0].storage_path);
      const a = document.createElement('a');
      a.href = url;
      a.download = toDownload[0].filename;
      a.click();
      return;
    }

    // Multiple files — use JSZip
    const zip = new JSZip();
    const statusEl = this.container.querySelector('.gallery-status');
    statusEl.textContent = 'Preparing download...';

    for (let i = 0; i < toDownload.length; i++) {
      const photo = toDownload[i];
      statusEl.textContent = `Downloading ${i + 1} of ${toDownload.length}...`;
      const url = this.storage.getPublicUrl(photo.storage_path);
      const resp = await fetch(url);
      const blob = await resp.blob();
      const folder = photo.label || 'unlabeled';
      zip.file(`${folder}/${photo.filename}`, blob);
    }

    statusEl.textContent = 'Creating ZIP...';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = `photos-${this.currentLabel || 'all'}-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    statusEl.textContent = '';
  }

  async deleteSelected() {
    const toDelete = this.photos.filter(p => this.selected.has(p.id));
    if (toDelete.length === 0) return;
    if (!confirm(`Delete ${toDelete.length} photo(s)? This cannot be undone.`)) return;

    await this.storage.deletePhotos(toDelete);
    await this.load(this.currentLabel);
  }
}
