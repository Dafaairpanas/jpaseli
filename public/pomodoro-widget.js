// Pomodoro Floating Widget for JPASELI
// Dibuat dengan senior-level clean code & premium UI/UX, mendukung desktop & mobile (Android)

(function () {
  // Jangan inisialisasi ulang jika sudah ada
  if (window.hasOwnProperty('__pomoWidgetLoaded')) return;
  window.__pomoWidgetLoaded = true;

  // Jangan tampilkan widget jika sedang berada di halaman /pomodoro itu sendiri
  if (window.location.pathname === '/pomodoro') return;

  const TIMES = {
    pomodoro: 25 * 60,
    short: 5 * 60,
    long: 15 * 60
  };

  // State local widget
  let isRunning = false;
  let currentMode = 'pomodoro';
  let timeLeft = TIMES.pomodoro;
  let timerId = null;
  let audioCtx = null;
  let alarmInterval = null;

  // Buat style CSS secara dinamis dengan tema Glassmorphism Modern
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --pomo-primary: #ef4444;
      --pomo-primary-rgb: 239, 68, 68;
      --pomo-bg: rgba(255, 255, 255, 0.85);
      --pomo-text: #1f2937;
      --pomo-text-muted: #6b7280;
      --pomo-border: rgba(0, 0, 0, 0.08);
      --pomo-pill-bg: rgba(0, 0, 0, 0.04);
      --pomo-shadow: rgba(0, 0, 0, 0.12);
    }
    
    [data-theme="dark"] {
      --pomo-bg: rgba(26, 26, 26, 0.85);
      --pomo-text: #f3f4f6;
      --pomo-text-muted: #9ca3af;
      --pomo-border: rgba(255, 255, 255, 0.08);
      --pomo-pill-bg: rgba(255, 255, 255, 0.06);
      --pomo-shadow: rgba(0, 0, 0, 0.4);
    }

    .pomo-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      user-select: none;
      -webkit-user-select: none;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }
    
    /* Bubble (Bulatan Mengambang) */
    .pomo-widget-bubble {
      width: 62px;
      height: 62px;
      border-radius: 50%;
      background: var(--pomo-bg);
      border: 2px solid var(--pomo-primary);
      box-shadow: 0 8px 24px var(--pomo-shadow), 0 0 12px rgba(var(--pomo-primary-rgb), 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      pointer-events: auto;
      transition: transform 0.2s, opacity 0.3s, border-color 0.3s, box-shadow 0.3s;
      position: relative;
      touch-action: none;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .pomo-widget-bubble:active {
      cursor: grabbing;
      transform: scale(0.95);
    }
    .pomo-widget-bubble.idle {
      opacity: 0.65;
    }
    .pomo-widget-bubble.idle:hover {
      opacity: 1;
      transform: translateY(-2px);
    }
    
    /* Pulse Animation ketika timer berjalan */
    .pomo-widget-bubble.running {
      animation: pomoPulseGlow 2s infinite alternate;
    }
    @keyframes pomoPulseGlow {
      from { box-shadow: 0 8px 24px var(--pomo-shadow), 0 0 4px rgba(var(--pomo-primary-rgb), 0.3); }
      to { box-shadow: 0 8px 24px var(--pomo-shadow), 0 0 16px rgba(var(--pomo-primary-rgb), 0.6); }
    }
    
    .pomo-widget-time {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--pomo-text);
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
    }

    /* Modal / Panel Mini */
    .pomo-widget-panel {
      width: 250px;
      background: var(--pomo-bg);
      border: 1px solid var(--pomo-border);
      border-radius: 20px;
      padding: 1.25rem;
      box-shadow: 0 20px 40px var(--pomo-shadow);
      display: none;
      flex-direction: column;
      gap: 1rem;
      pointer-events: auto;
      margin-bottom: 12px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      animation: pomoFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      border-top: 3px solid var(--pomo-primary);
    }
    @keyframes pomoFadeIn {
      from { opacity: 0; transform: translateY(12px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    .pomo-widget-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pomo-widget-panel-title {
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--pomo-primary);
      transition: color 0.3s;
    }
    .pomo-widget-panel-close {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--pomo-text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      transition: background 0.2s, color 0.2s;
    }
    .pomo-widget-panel-close:hover {
      background: var(--pomo-pill-bg);
      color: var(--pomo-text);
    }

    /* Mode Selector Pills */
    .pomo-widget-modes {
      display: flex;
      background: var(--pomo-pill-bg);
      padding: 0.25rem;
      border-radius: 99px;
      gap: 0.15rem;
    }
    .pomo-widget-mode-btn {
      flex: 1;
      background: transparent;
      border: none;
      padding: 0.4rem 0.25rem;
      border-radius: 99px;
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--pomo-text-muted);
      cursor: pointer;
      transition: all 0.2s;
      outline: none;
      text-align: center;
      white-space: nowrap;
    }
    .pomo-widget-mode-btn:hover:not(.active) {
      color: var(--pomo-text);
    }
    .pomo-widget-mode-btn.active {
      background: var(--pomo-primary);
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(var(--pomo-primary-rgb), 0.3);
    }

    .pomo-widget-panel-time {
      font-size: 2.75rem;
      font-weight: 850;
      text-align: center;
      color: var(--pomo-text);
      font-variant-numeric: tabular-nums;
      margin: 0.15rem 0;
      letter-spacing: -0.02em;
    }

    .pomo-widget-controls {
      display: flex;
      gap: 0.5rem;
      justify-content: space-between;
    }
    .pomo-widget-btn {
      background: var(--pomo-pill-bg);
      border: 1px solid var(--pomo-border);
      color: var(--pomo-text);
      padding: 0.6rem 0.8rem;
      border-radius: 10px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }
    .pomo-widget-btn:hover {
      background: var(--pomo-text);
      color: var(--pomo-bg);
      border-color: var(--pomo-text);
    }
    .pomo-widget-btn.primary {
      background: var(--pomo-primary);
      border-color: var(--pomo-primary);
      color: #ffffff;
      flex: 1.3;
      box-shadow: 0 4px 12px rgba(var(--pomo-primary-rgb), 0.25);
    }
    .pomo-widget-btn.primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }

    /* Alarm Overlay Global */
    .pomo-widget-alarm-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 9999999;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      font-family: 'Inter', system-ui, sans-serif;
    }
    .pomo-widget-alarm-overlay.show {
      display: flex;
    }
    .pomo-widget-alarm-title {
      font-size: 2.75rem;
      font-weight: 900;
      color: var(--pomo-primary);
      text-transform: uppercase;
      text-align: center;
      letter-spacing: 0.05em;
      animation: pomoPulse 1s infinite alternate;
    }
    @keyframes pomoPulse {
      from { transform: scale(1); filter: drop-shadow(0 0 5px rgba(var(--pomo-primary-rgb), 0.4)); }
      to { transform: scale(1.08); filter: drop-shadow(0 0 20px rgba(var(--pomo-primary-rgb), 0.8)); }
    }
    .pomo-widget-alarm-btn {
      background: var(--pomo-primary);
      color: #ffffff;
      border: none;
      padding: 1.1rem 3rem;
      font-size: 1.35rem;
      font-weight: 800;
      border-radius: 14px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(var(--pomo-primary-rgb), 0.4);
      transition: all 0.2s;
    }
    .pomo-widget-alarm-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 10px 28px rgba(var(--pomo-primary-rgb), 0.5);
    }
  `;
  document.head.appendChild(style);

  // Buat DOM Element
  const container = document.createElement('div');
  container.className = 'pomo-widget-container';
  container.id = 'pomo-widget-root';

  container.innerHTML = `
    <!-- Panel detail -->
    <div class="pomo-widget-panel" id="pomo-widget-panel">
      <div class="pomo-widget-panel-header">
        <span class="pomo-widget-panel-title" id="pomo-widget-panel-title">Focus Time</span>
        <button class="pomo-widget-panel-close" id="pomo-widget-panel-close">&times;</button>
      </div>

      <!-- Mode Selector (Durasi 25m, 5m, 15m) -->
      <div class="pomo-widget-modes" id="pomo-widget-modes">
        <button class="pomo-widget-mode-btn active" data-widget-mode="pomodoro">25 Min</button>
        <button class="pomo-widget-mode-btn" data-widget-mode="short">5 Min</button>
        <button class="pomo-widget-mode-btn" data-widget-mode="long">15 Min</button>
      </div>

      <div class="pomo-widget-panel-time" id="pomo-widget-panel-time">25:00</div>
      
      <div class="pomo-widget-controls">
        <button class="pomo-widget-btn primary" id="pomo-widget-btn-toggle">START</button>
        <button class="pomo-widget-btn" id="pomo-widget-btn-reset">RESET</button>
        <a href="/pomodoro" class="pomo-widget-btn" title="Buka Detail" style="text-decoration:none; text-align:center; flex: 0.5;">
          ...
        </a>
      </div>
    </div>

    <!-- Bubble mengambang -->
    <div class="pomo-widget-bubble" id="pomo-widget-bubble">
      <span class="pomo-widget-time" id="pomo-widget-bubble-time">25:00</span>
    </div>
  `;

  // Overlay alarm global
  const alarmOverlay = document.createElement('div');
  alarmOverlay.className = 'pomo-widget-alarm-overlay';
  alarmOverlay.id = 'pomo-widget-alarm-overlay';
  alarmOverlay.innerHTML = `
    <div class="pomo-widget-alarm-title" id="pomo-widget-alarm-title">FOKUS SELESAI!</div>
    <button class="pomo-widget-alarm-btn" id="pomo-widget-alarm-close">STOP ALARM</button>
  `;

  document.body.appendChild(container);
  document.body.appendChild(alarmOverlay);

  // Ref DOM Elements
  const bubble = document.getElementById('pomo-widget-bubble');
  const panel = document.getElementById('pomo-widget-panel');
  const bubbleTime = document.getElementById('pomo-widget-bubble-time');
  const panelTime = document.getElementById('pomo-widget-panel-time');
  const panelTitle = document.getElementById('pomo-widget-panel-title');
  const btnToggle = document.getElementById('pomo-widget-btn-toggle');
  const btnReset = document.getElementById('pomo-widget-btn-reset');
  const btnPanelClose = document.getElementById('pomo-widget-panel-close');
  const btnAlarmClose = document.getElementById('pomo-widget-alarm-close');
  const modeButtons = document.querySelectorAll('[data-widget-mode]');

  // Load state
  function getStoredState() {
    const defaultState = { isRunning: false, currentMode: 'pomodoro', endTime: 0, pausedTimeLeft: TIMES.pomodoro };
    try {
      const stored = localStorage.getItem('pomo_state');
      return stored ? JSON.parse(stored) : defaultState;
    } catch (e) {
      return defaultState;
    }
  }

  function setStoredState(state) {
    localStorage.setItem('pomo_state', JSON.stringify(state));
    window.dispatchEvent(new Event('pomo_state_changed'));
  }

  // Set CSS variables based on mode
  function updateThemeColors(mode) {
    const colors = {
      pomodoro: { main: '#ef4444', rgb: '239, 68, 68' },
      short: { main: '#10b981', rgb: '16, 185, 129' },
      long: { main: '#3b82f6', rgb: '59, 130, 246' }
    };
    const c = colors[mode] || colors.pomodoro;
    container.style.setProperty('--pomo-primary', c.main);
    container.style.setProperty('--pomo-primary-rgb', c.rgb);
    alarmOverlay.style.setProperty('--pomo-primary', c.main);
    alarmOverlay.style.setProperty('--pomo-primary-rgb', c.rgb);
  }

  // Update Display
  function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    bubbleTime.textContent = timeStr;
    panelTime.textContent = timeStr;

    const modeNames = { pomodoro: 'Focus Time', short: 'Short Break', long: 'Long Break' };
    panelTitle.textContent = modeNames[currentMode] || 'Pomodoro';

    // Update active pill button
    modeButtons.forEach(btn => {
      if (btn.dataset.widgetMode === currentMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (isRunning) {
      bubble.classList.remove('idle');
      bubble.classList.add('running');
      btnToggle.textContent = 'PAUSE';
      btnToggle.classList.remove('primary');
      btnToggle.style.background = 'rgba(0, 0, 0, 0.4)';
      btnToggle.style.color = '#ffffff';
    } else {
      bubble.classList.add('idle');
      bubble.classList.remove('running');
      btnToggle.textContent = 'START';
      btnToggle.classList.add('primary');
      btnToggle.style.background = '';
      btnToggle.style.color = '';
    }
  }

  // Sync state
  function syncFromStorage() {
    const state = getStoredState();
    const prevRunning = isRunning;
    
    isRunning = state.isRunning;
    currentMode = state.currentMode;
    updateThemeColors(currentMode);

    if (isRunning) {
      timeLeft = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
      if (timeLeft <= 0) {
        timeLeft = 0;
        isRunning = false;
        if (prevRunning) {
          timerFinished();
        }
      }
    } else {
      timeLeft = state.pausedTimeLeft;
    }

    updateDisplay();
    updateInterval();
  }

  function updateInterval() {
    if (isRunning) {
      if (!timerId) {
        timerId = setInterval(() => {
          const state = getStoredState();
          timeLeft = Math.max(0, Math.round((state.endTime - Date.now()) / 1000));
          if (timeLeft <= 0) {
            timerFinished();
          } else {
            updateDisplay();
          }
        }, 1000);
      }
    } else {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    }
  }

  function toggleTimer() {
    const state = getStoredState();
    if (state.isRunning) {
      // Pause
      const newState = {
        isRunning: false,
        currentMode,
        endTime: 0,
        pausedTimeLeft: timeLeft
      };
      setStoredState(newState);
    } else {
      // Start
      const endTime = Date.now() + timeLeft * 1000;
      const newState = {
        isRunning: true,
        currentMode,
        endTime,
        pausedTimeLeft: 0
      };
      setStoredState(newState);
      requestNotificationPermission();
    }
    syncFromStorage();
  }

  function resetTimer() {
    const newState = {
      isRunning: false,
      currentMode,
      endTime: 0,
      pausedTimeLeft: TIMES[currentMode]
    };
    setStoredState(newState);
    syncFromStorage();
  }

  function switchMode(mode) {
    if (isRunning) {
      if (!confirm('Timer sedang berjalan! Yakin ingin ganti mode?')) return;
    }
    const newState = {
      isRunning: false,
      currentMode: mode,
      endTime: 0,
      pausedTimeLeft: TIMES[mode]
    };
    setStoredState(newState);
    syncFromStorage();
  }

  function timerFinished() {
    const finishedMode = currentMode;
    const newState = {
      isRunning: false,
      currentMode: finishedMode,
      endTime: 0,
      pausedTimeLeft: TIMES[finishedMode]
    };
    setStoredState(newState);
    syncFromStorage();

    if (finishedMode === 'pomodoro') {
      try {
        const history = JSON.parse(localStorage.getItem('pomo_history') || '[]');
        const now = new Date();
        history.push({
          id: Date.now(),
          date: now.toISOString().slice(0, 10),
          duration: TIMES.pomodoro / 60,
          completedAt: now.toTimeString().slice(0, 8),
          task: null
        });
        localStorage.setItem('pomo_history', JSON.stringify(history));
      } catch (e) {}
    }

    triggerAlarm(finishedMode);
  }

  function initAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }

  function playBeep() {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  function triggerAlarm(mode) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const modeNames = { pomodoro: 'Fokus Selesai!', short: 'Istirahat Selesai!', long: 'Istirahat Selesai!' };
      new Notification(modeNames[mode] || 'Pomodoro Selesai!', {
        body: 'Waktunya berpindah aktivitas!',
        icon: '/icon.svg',
        requireInteraction: true
      });
    }

    const title = document.getElementById('pomo-widget-alarm-title');
    title.textContent = mode === 'pomodoro' ? 'FOKUS SELESAI!' : 'ISTIRAHAT SELESAI!';
    alarmOverlay.classList.add('show');

    playBeep();
    alarmInterval = setInterval(playBeep, 800);
  }

  btnToggle.addEventListener('click', toggleTimer);
  btnReset.addEventListener('click', resetTimer);
  btnPanelClose.addEventListener('click', () => {
    panel.style.display = 'none';
  });
  
  btnAlarmClose.addEventListener('click', () => {
    clearInterval(alarmInterval);
    alarmOverlay.classList.remove('show');
    
    const nextMode = currentMode === 'pomodoro' ? 'short' : 'pomodoro';
    const newState = {
      isRunning: false,
      currentMode: nextMode,
      endTime: 0,
      pausedTimeLeft: TIMES[nextMode]
    };
    setStoredState(newState);
    syncFromStorage();
  });

  // Bind mode switch buttons
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchMode(btn.dataset.widgetMode);
    });
  });

  let isDragging = false;
  bubble.addEventListener('click', (e) => {
    if (isDragging) return;
    if (panel.style.display === 'flex') {
      panel.style.display = 'none';
    } else {
      panel.style.display = 'flex';
      if (!audioCtx) initAudio();
    }
  });

  let startX = 0, startY = 0;
  let initialRight = 20, initialBottom = 20;

  function onDragStart(e) {
    isDragging = false;
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    
    startX = clientX;
    startY = clientY;
    
    const style = window.getComputedStyle(container);
    initialRight = parseInt(style.right);
    initialBottom = parseInt(style.bottom);
    
    document.addEventListener(e.type.startsWith('touch') ? 'touchmove' : 'mousemove', onDragMove, { passive: false });
    document.addEventListener(e.type.startsWith('touch') ? 'touchend' : 'mouseup', onDragEnd);
  }

  function onDragMove(e) {
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    
    const deltaX = startX - clientX;
    const deltaY = startY - clientY;
    
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      isDragging = true;
    }
    
    if (isDragging) {
      e.preventDefault();
      const newRight = Math.max(10, Math.min(window.innerWidth - 70, initialRight + deltaX));
      const newBottom = Math.max(10, Math.min(window.innerHeight - 70, initialBottom + deltaY));
      
      container.style.right = `${newRight}px`;
      container.style.bottom = `${newBottom}px`;
    }
  }

  function onDragEnd() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
  }

  bubble.addEventListener('mousedown', onDragStart);
  bubble.addEventListener('touchstart', onDragStart, { passive: true });

  window.addEventListener('storage', (e) => {
    if (e.key === 'pomo_state') {
      syncFromStorage();
    }
  });

  window.addEventListener('pomo_state_changed', syncFromStorage);
  syncFromStorage();
})();
