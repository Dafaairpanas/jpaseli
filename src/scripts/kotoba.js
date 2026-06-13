let allKotoba = [];
let filteredKotoba = [];
let itemsToShow = 150;
const itemsIncrement = 100;

const loadingSpinner = document.getElementById('loading-spinner');
const kotobaGrid = document.getElementById('kotoba-grid');
const emptyState = document.getElementById('empty-state');
const statsBanner = document.getElementById('stats-banner');
const statsCount = document.getElementById('stats-count');
const loadmoreWrapper = document.getElementById('loadmore-wrapper');
const btnLoadmore = document.getElementById('btn-loadmore');
const searchInput = document.getElementById('search-input');
const filterBab = document.getElementById('filter-bab');
const chkOnlyExtra = document.getElementById('chk-only-extra');
const ttsSpeedSelect = document.getElementById('tts-speed');

// Fetch data
async function loadAllKotoba() {
  try {
    const res = await fetch('/api/flashcard-template?action=all-kotoba');
    allKotoba = await res.json();
    
    if (!Array.isArray(allKotoba)) {
      allKotoba = [];
    }
    
    // Populate filter bab options
    populateBabFilter();
    
    // Initial filter & render
    filterAndRender();
    
    loadingSpinner.style.display = 'none';
    kotobaGrid.style.display = 'grid';
    statsBanner.style.display = 'flex';
    
    // Auto-focus search input
    if (searchInput) searchInput.focus();
  } catch (e) {
    loadingSpinner.innerHTML = '<span style="color:#ef4444;">Gagal memuat data kosakata.</span>';
  }
}

function populateBabFilter() {
  const babs = {};
  allKotoba.forEach(item => {
    if (item.bab_id) {
      babs[item.bab_id] = item.bab_nama;
    }
  });
  
  const sortedBabKeys = Object.keys(babs).sort((a, b) => parseInt(a) - parseInt(b));
  sortedBabKeys.forEach(id => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = babs[id];
    filterBab.appendChild(option);
  });
}

// Kanji check
function isKanji(ch) {
  const c = ch.charCodeAt(0);
  return (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0xF900 && c <= 0xFAFF);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// Furigana HTML Generator
function generateFurigana(text, reading) {
  if (!reading || !text) return escapeHtml(text || '');
  const chars = [...text];
  if (!chars.some(isKanji)) return escapeHtml(text);
  if (chars.every(isKanji)) return `<ruby>${escapeHtml(text)}<rt>${escapeHtml(reading)}</rt></ruby>`;
  
  let result = '';
  let ti = 0, ri = 0;
  while (ti < text.length) {
    if (!isKanji(text[ti])) {
      result += escapeHtml(text[ti]);
      ti++; ri++;
    } else {
      let ks = ti;
      while (ti < text.length && isKanji(text[ti])) ti++;
      const kanji = text.slice(ks, ti);
      let re;
      if (ti < text.length) {
        re = reading.indexOf(text[ti], ri);
        if (re === -1) re = reading.length;
      } else {
        re = reading.length;
      }
      result += `<ruby>${escapeHtml(kanji)}<rt>${escapeHtml(reading.slice(ri, re))}</rt></ruby>`;
      ri = re;
    }
  }
  return result;
}

// TTS Voice synthesis
function speakText(text) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = parseFloat(ttsSpeedSelect.value) || 1.0;
  window.speechSynthesis.speak(utterance);
}

// Search and Filter Logic
function filterAndRender(resetItemsCount = true) {
  if (resetItemsCount) {
    itemsToShow = 150;
  }
  
  const query = searchInput.value.toLowerCase().trim();
  const selectedBab = filterBab.value;
  const onlyExtra = chkOnlyExtra.checked;
  
  filteredKotoba = allKotoba.filter(item => {
    // Filter by Bab
    if (selectedBab !== 'all' && String(item.bab_id) !== selectedBab) {
      return false;
    }
    
    // Filter by Extra
    if (onlyExtra && !item.isExtra) {
      return false;
    }
    
    // Filter by query (search)
    if (query) {
      const matchFront = item.front.toLowerCase().includes(query);
      const matchBack = item.back.toLowerCase().includes(query);
      const matchHint = item.hint.toLowerCase().includes(query);
      const matchExtra = item.extra.toLowerCase().includes(query);
      
      return matchFront || matchBack || matchHint || matchExtra;
    }
    
    return true;
  });
  
  // Update stats
  statsCount.textContent = `Menampilkan ${Math.min(filteredKotoba.length, itemsToShow)} dari ${filteredKotoba.length} kosakata (Total data: ${allKotoba.length})`;
  
  renderGrid();
}

// Rendering cards
function renderGrid() {
  if (filteredKotoba.length === 0) {
    kotobaGrid.style.display = 'none';
    emptyState.style.display = 'block';
    loadmoreWrapper.style.display = 'none';
    return;
  }
  
  emptyState.style.display = 'none';
  kotobaGrid.style.display = 'grid';
  
  const visibleItems = filteredKotoba.slice(0, itemsToShow);
  
  kotobaGrid.innerHTML = visibleItems.map((item, idx) => {
    const displayJp = item.hint && item.hint.trim() !== item.front.trim() 
      ? generateFurigana(item.front, item.hint)
      : escapeHtml(item.front);

    const badgeExtraHtml = item.isExtra ? '<span class="kt-badge kt-badge-extra">Ekstra</span>' : '';
    const extraHtml = item.extra ? `<div class="kt-extra">${escapeHtml(item.extra)}</div>` : '';
    const rawSpeakText = item.hint || item.front;

    return `
      <div class="kt-card">
        <button class="kt-tts-btn" data-text="${escapeHtml(rawSpeakText)}" title="Dengarkan pelafalan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
        </button>
        <div class="kt-jp-wrapper">
          <div class="kt-jp-text">${displayJp}</div>
        </div>
        <div class="kt-meaning">${escapeHtml(item.back)}</div>
        ${extraHtml}
        <div class="kt-badges">
          <span class="kt-badge kt-badge-bab">${escapeHtml(item.bab_nama)}</span>
          ${badgeExtraHtml}
        </div>
      </div>
    `;
  }).join('');
  
  // Bind TTS button events
  kotobaGrid.querySelectorAll('.kt-tts-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(btn.dataset.text);
    });
  });

  // Show/hide load more
  if (filteredKotoba.length > itemsToShow) {
    loadmoreWrapper.style.display = 'flex';
  } else {
    loadmoreWrapper.style.display = 'none';
  }
}

// Event listeners
searchInput.addEventListener('input', () => filterAndRender(true));
filterBab.addEventListener('change', () => filterAndRender(true));
chkOnlyExtra.addEventListener('change', () => filterAndRender(true));

btnLoadmore.addEventListener('click', () => {
  itemsToShow += itemsIncrement;
  filterAndRender(false);
});

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    if (searchInput) searchInput.focus();
  }
});

// Start
loadAllKotoba();
