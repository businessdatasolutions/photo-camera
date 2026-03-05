let camera, storage, gallery;
let currentLabel = null;
let sessionCount = 0;

async function init() {
  storage = new Storage();
  camera = new Camera(document.getElementById('viewfinder'));
  gallery = new Gallery(storage, document.getElementById('gallery-view'));

  setupEventListeners();

  try {
    await camera.start();
  } catch (err) {
    document.getElementById('camera-error').textContent =
      'Camera access denied. Please allow camera permissions and reload.';
    document.getElementById('camera-error').hidden = false;
  }

  await loadLabels();
}

async function loadLabels() {
  try {
    const labels = await storage.getLabels();
    renderLabelDropdown(labels);
    renderGalleryTabs(labels);
  } catch (err) {
    console.error('Failed to load labels:', err);
  }
}

function renderLabelDropdown(labels) {
  const select = document.getElementById('label-select');
  const current = select.value;
  select.innerHTML = '<option value="" disabled>Select label...</option>';
  for (const label of labels) {
    const opt = document.createElement('option');
    opt.value = label.name;
    opt.textContent = label.name;
    select.appendChild(opt);
  }
  if (current) select.value = current;
}

function renderGalleryTabs(labels) {
  const tabs = document.getElementById('gallery-tabs');
  tabs.innerHTML = '';

  const allTab = document.createElement('button');
  allTab.className = 'tab' + (!gallery.currentLabel ? ' active' : '');
  allTab.textContent = 'All';
  allTab.addEventListener('click', () => {
    gallery.load(null);
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    allTab.classList.add('active');
  });
  tabs.appendChild(allTab);

  for (const label of labels) {
    const tab = document.createElement('button');
    tab.className = 'tab' + (gallery.currentLabel === label.name ? ' active' : '');
    tab.textContent = label.name;
    tab.addEventListener('click', () => {
      gallery.load(label.name);
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
    tabs.appendChild(tab);
  }
}

function setupEventListeners() {
  // Capture
  document.getElementById('capture-btn').addEventListener('click', capturePhoto);

  // Switch camera
  document.getElementById('switch-cam-btn').addEventListener('click', () => camera.switchCamera());

  // Label selection
  document.getElementById('label-select').addEventListener('change', (e) => {
    currentLabel = e.target.value;
  });

  // New label
  document.getElementById('new-label-btn').addEventListener('click', createNewLabel);
  document.getElementById('new-label-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createNewLabel();
  });

  // View switching
  document.getElementById('gallery-btn').addEventListener('click', showGallery);
  document.getElementById('camera-btn').addEventListener('click', showCamera);

  // Gallery actions
  document.getElementById('select-all-btn').addEventListener('click', () => gallery.selectAll());
  document.getElementById('deselect-btn').addEventListener('click', () => gallery.deselectAll());
  document.getElementById('download-btn').addEventListener('click', () => gallery.downloadSelected());
  document.getElementById('delete-btn').addEventListener('click', () => gallery.deleteSelected());
}

async function capturePhoto() {
  if (!currentLabel) {
    flashMessage('Select a label first');
    return;
  }

  const blob = await camera.capture();
  sessionCount++;
  document.getElementById('photo-count').textContent = `${sessionCount} photo${sessionCount !== 1 ? 's' : ''} taken`;

  // Flash effect
  const flash = document.getElementById('flash');
  flash.classList.add('active');
  setTimeout(() => flash.classList.remove('active'), 150);

  // Upload in background
  storage.upload(blob, currentLabel).catch(err => {
    console.error('Upload failed:', err);
  });
}

async function createNewLabel() {
  const input = document.getElementById('new-label-input');
  const name = input.value.trim().toLowerCase();
  if (!name) return;

  try {
    await storage.createLabel(name);
    input.value = '';
    currentLabel = name;
    await loadLabels();
    document.getElementById('label-select').value = name;
    document.getElementById('new-label-form').hidden = true;
  } catch (err) {
    if (err.message?.includes('duplicate')) {
      flashMessage('Label already exists');
    } else {
      flashMessage('Failed to create label');
      console.error(err);
    }
  }
}

function showGallery() {
  document.getElementById('camera-view').classList.add('view-hidden');
  document.getElementById('gallery-view').classList.remove('view-hidden');
  gallery.load(gallery.currentLabel);
  loadLabels();
}

function showCamera() {
  document.getElementById('gallery-view').classList.add('view-hidden');
  document.getElementById('camera-view').classList.remove('view-hidden');
}

function flashMessage(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 2000);
}

document.addEventListener('DOMContentLoaded', init);
