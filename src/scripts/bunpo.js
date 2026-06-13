const container = document.getElementById('bp-container');
const searchInput = document.getElementById('bp-search');
const toolbar = document.getElementById('bp-toolbar');
const statTotal = document.getElementById('stat-total');
const statShowing = document.getElementById('stat-showing');
const modal = document.getElementById('bp-modal');
const modalContent = document.getElementById('bp-modal-content');

let allData = [];
let babList = [];
let currentBab = 'all';
let filteredData = [];

async function loadData() {
  try {
    const res = await fetch('/api/bunpo-template?action=all-bunpo');
    allData = await res.json();
    if (!Array.isArray(allData)) { allData = []; }

    // Kumpulkan daftar bab
    const babSet = new Set();
    allData.forEach(d => { if (d._bab) babSet.add(d._bab); });
    babList = Array.from(babSet).sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)) || 0;
      const numB = parseInt(b.match(/\d+/)) || 0;
      return numA - numB;
    });

    // Render chips bab
    babList.forEach(bab => {
      const chip = document.createElement('button');
      chip.className = 'bp-chip';
      chip.dataset.bab = bab;
      chip.textContent = bab.split(' - ')[0]; // Ambil nama bab pendek saja agar rapi
      chip.title = bab;
      toolbar.appendChild(chip);
    });

    // Attach chip events
    toolbar.querySelectorAll('.bp-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        toolbar.querySelectorAll('.bp-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentBab = chip.dataset.bab;
        renderCards();
      });
    });

    statTotal.textContent = allData.length;
    renderCards();
  } catch (e) {
    container.innerHTML = '<div class="bp-empty"><div class="bp-empty-icon">⚠️</div><p>Gagal memuat data: ' + e.message + '</p></div>';
  }
}

function renderCards() {
  const query = searchInput.value.toLowerCase().trim();
  let filtered = allData;

  // Filter bab
  if (currentBab !== 'all') {
    filtered = filtered.filter(d => d._bab === currentBab);
  }

  // Filter search
  if (query) {
    filtered = filtered.filter(d => {
      const searchable = [
        d.pola || '', d.arti || '', d.penjelasan || '',
        d.kapan_digunakan || '', d.catatan || '', d.larangan || ''
      ];
      if (d.contoh && Array.isArray(d.contoh)) {
        d.contoh.forEach(c => {
          searchable.push(c.jp || '', c.romaji || '', c.arti || '', c.catatan || '');
        });
      }
      return searchable.some(s => s.toLowerCase().includes(query));
    });
  }

  filteredData = filtered;
  statShowing.textContent = filtered.length;

  if (filtered.length === 0) {
    container.className = "bp-grid";
    container.innerHTML = '<div class="bp-empty"><div class="bp-empty-icon">📭</div><p>Tidak ada pola tata bahasa yang ditemukan.</p></div>';
    return;
  }

  container.className = "bp-grid";
  container.innerHTML = filtered.map((item, idx) => {
    let previewHint = '';
    if (item.contoh && item.contoh.length > 0) {
      previewHint = item.contoh[0].jp + ' (' + item.contoh[0].arti + ')';
    }

    return `
      <div class="bp-preview-card" onclick="openModal(${idx})">
        <div class="bp-card-top">
          <div class="bp-card-pola">${escapeHtml(item.pola || '')}</div>
          <div class="bp-card-arti">${escapeHtml(item.arti || '')}</div>
        </div>
        ${previewHint ? `<div class="bp-card-hint">Cth: ${escapeHtml(previewHint)}</div>` : ''}
        <div class="bp-card-badges">
          ${item._bab ? `<span class="bp-card-badge bab">${escapeHtml(item._bab.split(' - ')[0])}</span>` : ''}
          ${item.level ? `<span class="bp-card-badge">${escapeHtml(item.level)}</span>` : ''}
          ${item.kategori ? `<span class="bp-card-badge">${escapeHtml(item.kategori)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML.replace(/\n/g, '<br />');
}

window.openModal = function(idx) {
  const item = filteredData[idx];
  if (!item) return;

  let bentoHtml = `
    <div class="bento-grid">
      <!-- Bento 1: Main (Pola, Arti, Penjelasan, Rumus) -->
      <div class="bento-item bento-main">
        <div class="bento-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          Tata Bahasa / Pola Kalimat
        </div>
        <div class="bento-pola">${escapeHtml(item.pola || '')}</div>
        <div class="bento-arti">${escapeHtml(item.arti || '')}</div>
        
        ${item.penjelasan ? `
          <div style="margin-top: 1rem;">
            <div class="bento-title" style="margin-bottom:0.4rem;">Penjelasan</div>
            <div class="bento-exp-text">${escapeHtml(item.penjelasan)}</div>
          </div>
        ` : ''}

        ${item.kapan_digunakan ? `
          <div style="margin-top: 1rem; margin-bottom: 1rem;">
            <div class="bento-title" style="margin-bottom:0.4rem;">Kapan Digunakan</div>
            <div class="bento-exp-text" style="font-size:0.95rem;">${escapeHtml(item.kapan_digunakan)}</div>
          </div>
        ` : ''}

        ${item.rumus ? `
          <div style="margin-top: auto;">
            <div class="bento-title" style="margin-bottom:0.5rem;">Struktur / Rumus Kalimat</div>
            <div class="bento-rumus-block">${escapeHtml(item.rumus)}</div>
          </div>
        ` : ''}
      </div>

      <!-- Bento 2: Meta Info (Bab, Level, Partikel) -->
      <div class="bento-item bento-meta">
        <div class="bento-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          Informasi Pola
        </div>
        
        <div class="bento-meta-item" title="${escapeHtml(item._bab || '')}">
          <span class="bento-meta-label">Bab</span>
          <span class="bento-meta-value accent">${escapeHtml(item._bab ? item._bab.split(' - ')[0] : '-')}</span>
        </div>

        <div class="bento-meta-item">
          <span class="bento-meta-label">Level JLPT</span>
          <span class="bento-meta-value">${escapeHtml(item.level || 'N5')}</span>
        </div>

        <div class="bento-meta-item" title="${escapeHtml(item.kategori || '')}">
          <span class="bento-meta-label">Kategori</span>
          <span class="bento-meta-value" style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: right;">${escapeHtml(item.kategori || '-')}</span>
        </div>

        <div class="bento-meta-item">
          <span class="bento-meta-label">Partikel</span>
          <span class="bento-meta-value accent">${escapeHtml(item.partikel || 'Tidak ada')}</span>
        </div>
      </div>

      <!-- Bento 3: Catatan Penting -->
      ${item.catatan ? `
        <div class="bento-item bento-note">
          <div class="bento-title" style="color: var(--accent);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Catatan Penting
          </div>
          <div class="bento-note-text"><strong>Perhatikan:</strong> ${escapeHtml(item.catatan)}</div>
        </div>
      ` : ''}

      <!-- Bento 4: Larangan / Warning -->
      ${item.larangan ? `
        <div class="bento-item bento-warning">
          <div class="bento-title" style="color: #ff5252;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Kesalahan Umum / Larangan
          </div>
          <div class="bento-warn-text">${escapeHtml(item.larangan)}</div>
        </div>
      ` : ''}

      <!-- Bento 5: Contoh Kalimat -->
      <div class="bento-item bento-examples" style="${(!item.catatan && !item.larangan) ? 'grid-column: span 3;' : 'grid-column: span 3;'}">
        <div class="bento-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Contoh Kalimat (例文)
        </div>
        
        <div class="bento-ex-list">
          ${(item.contoh && Array.isArray(item.contoh) && item.contoh.length > 0) ? 
            item.contoh.map((c, cIdx) => `
              <div class="bento-ex-card">
                <div style="flex: 1;">
                  <div class="bento-ex-jp">${escapeHtml(c.jp || '')}</div>
                  ${c.romaji ? `<div class="bento-ex-romaji">${escapeHtml(c.romaji)}</div>` : ''}
                  <div class="bento-ex-id">→ ${escapeHtml(c.arti || '')}</div>
                  ${c.catatan ? `<div class="bento-ex-note">💡 ${escapeHtml(c.catatan)}</div>` : ''}
                </div>
                <button class="card-tts-btn" onclick="speakText('${escapeHtml(c.jp).replace(/'/g, "\\'")}', event)" title="Dengarkan pengucapan">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                </button>
              </div>
            `).join('')
            : `<p style="color:var(--text-muted); font-style:italic;">Tidak ada contoh kalimat untuk pola ini.</p>`
          }
        </div>
      </div>
    </div>
  `;

  modalContent.innerHTML = bentoHtml;
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
};

window.closeModal = function() {
  modal.classList.remove('show');
  document.body.style.overflow = '';
};

window.closeModalOnBackdrop = function(e) {
  if (e.target === modal) {
    closeModal();
  }
};

// Text to Speech
window.speakText = function(text, event) {
  if (event) event.stopPropagation();
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  } else {
    alert('Browser Anda tidak mendukung Text-to-Speech.');
  }
};

// Close on Esc
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
  }
});

// Search input
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderCards, 200);
});

// Keyboard shortcut to focus search
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInput.focus();
  }
});

loadData();
