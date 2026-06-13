const container = document.getElementById('card-container');
const cards = Array.from(document.querySelectorAll('.kj-card[data-hari]'));
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const sortBtns = document.querySelectorAll('.sort-btn');

let currentFilter = 'all';

// Tandai card yang hari-nya sudah learned
cards.forEach(card => {
  const hari = card.getAttribute('data-hari');
  if (localStorage.getItem('learned_day_' + hari) === 'true') {
    card.classList.add('learned');
  }
});

// Fungsi utama: filter + search
function applyFilter() {
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
  cards.forEach(card => {
    const isLearned = card.classList.contains('learned');
    const text = card.innerText.toLowerCase();
    let show = true;

    if (currentFilter === 'learned' && !isLearned) show = false;
    if (currentFilter === 'not-learned' && isLearned) show = false;
    if (searchVal && !text.includes(searchVal)) show = false;

    card.style.display = show ? 'flex' : 'none';
  });
}

// Fungsi sort: urutkan DOM
function applySort(type) {
  const sorted = [...cards];
  if (type === 'day-asc') {
    sorted.sort((a, b) => parseInt(a.dataset.hari) - parseInt(b.dataset.hari));
  } else if (type === 'day-desc') {
    sorted.sort((a, b) => parseInt(b.dataset.hari) - parseInt(a.dataset.hari));
  } else if (type === 'az') {
    sorted.sort((a, b) => (a.dataset.arti || '').localeCompare(b.dataset.arti || '', 'id'));
  } else if (type === 'za') {
    sorted.sort((a, b) => (b.dataset.arti || '').localeCompare(a.dataset.arti || '', 'id'));
  }
  sorted.forEach(card => container.appendChild(card));
  applyFilter();
}

// Highlight tombol aktif
function setActiveBtn(group, activeBtn) {
  group.forEach(b => {
    b.classList.remove('active');
    b.style.backgroundColor = 'transparent';
    if (b.dataset.filter === 'learned') {
      b.style.color = 'var(--accent)';
    } else {
      b.style.color = 'var(--text-main)';
    }
  });
  activeBtn.classList.add('active');
  if (activeBtn.dataset.filter === 'learned') {
    activeBtn.style.backgroundColor = 'var(--accent)';
    activeBtn.style.color = 'var(--bg-primary)';
  } else {
    activeBtn.style.backgroundColor = 'var(--text-main)';
    activeBtn.style.color = 'var(--bg-secondary)';
  }
}

// Event: filter
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    setActiveBtn(filterBtns, btn);
    applyFilter();
  });
});

// Event: sort
sortBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sortBtns.forEach(b => {
      b.classList.remove('active');
      b.style.backgroundColor = 'transparent';
      b.style.color = 'var(--text-main)';
    });
    btn.classList.add('active');
    btn.style.backgroundColor = 'var(--text-main)';
    btn.style.color = 'var(--bg-secondary)';
    applySort(btn.dataset.sort);
  });
});

// Event: search
if (searchInput) {
  searchInput.addEventListener('input', () => applyFilter());
}

// Keyboard shortcut
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    if (searchInput) searchInput.focus();
  }
});
