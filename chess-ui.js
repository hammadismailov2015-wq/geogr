/* ============================================================
   ШАХМАТЫ — интерфейс
   Экраны, доска, режимы, темы, часы/лимит, съеденные фигуры,
   статусы, анимированный фон, аккордеоны, ОНЛАЙН-игра с другом.
   ============================================================ */
(function () {
  const C = window.Chess;

  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const START = { p: 8, n: 2, b: 2, r: 2, q: 1 };

  const app = {
    state: null,
    mode: 'bot',
    myColor: 'w',
    level: 2,
    orientation: 'w',
    selected: -1,
    legalFrom: [],
    history: [],
    lastMove: null,
    over: false,
    overText: '',
    pendingShare: false,
    botThinking: false,
    paused: false,
    theme: 'classic',
    clock: { timeOn: false, movesOn: false, timeMs: { w: 0, b: 0 }, movesLeft: { w: 0, b: 0 }, lastTick: 0 },
    online: { on: false, role: null, room: null, myColor: 'w', hostColor: 'w', myId: null, net: null, connected: false, peerReady: false, failed: false }
  };

  const $ = (id) => document.getElementById(id);
  let elBoard, elStatus, elHistory;

  const netAvailable = () => typeof mqtt !== 'undefined';

  /* ========================================================
     СЕТЬ (MQTT поверх WebSocket, публичный брокер)
     ======================================================== */
  const ChessNet = {
    connect(room, handlers) {
      if (!netAvailable()) { handlers.onFail && handlers.onFail('nolib'); return null; }
      const url = 'wss://broker.emqx.io:8084/mqtt';
      const topic = 'hammadchess/' + room;
      const clientId = 'chs_' + Math.random().toString(36).slice(2, 10);
      let client, active = true, opened = false;
      try {
        client = mqtt.connect(url, { clientId, clean: true, connectTimeout: 8000, reconnectPeriod: 3000, keepalive: 30 });
      } catch (e) { handlers.onFail && handlers.onFail('err'); return null; }
      client.on('connect', () => { opened = true; client.subscribe(topic, { qos: 0 }); handlers.onOpen && handlers.onOpen(); });
      client.on('message', (t, payload) => { let o; try { o = JSON.parse(payload.toString()); } catch (e) { return; } handlers.onMessage && handlers.onMessage(o); });
      client.on('reconnect', () => handlers.onReconnect && handlers.onReconnect());
      client.on('close', () => handlers.onClose && handlers.onClose());
      client.on('error', () => { });
      // сторож: если за 15 c не подключились — сообщаем о проблеме
      setTimeout(() => { if (active && !opened) handlers.onFail && handlers.onFail('timeout'); }, 15000);
      return {
        id: clientId,
        publish(obj) { try { if (client && client.connected) client.publish(topic, JSON.stringify(obj), { qos: 0 }); } catch (e) { } },
        close() { active = false; try { client && client.end(true); } catch (e) { } }
      };
    }
  };

  /* ========================================================
     ЗАПУСК
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    app.theme = localStorage.getItem('chessTheme') || 'classic';
    applyTheme(app.theme);
    buildLayout();
    initBackground();
    startClockLoop();
    const h = location.hash;
    if (h.indexOf('room=') >= 0) startOnlineGuest(h);
    else if (h.startsWith('#g=')) startFromLink(h.slice(3));
    else showSetup();
  });

  /* ========================================================
     РАЗМЕТКА
     ======================================================== */
  function buildLayout() {
    const root = $('chessRoot');
    root.innerHTML = `
      <div class="ch-themebar" id="themeBar">
        <button class="ch-sw" data-theme="green" title="Зелёная доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
        <button class="ch-sw" data-theme="classic" title="Чёрно-белая доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
        <button class="ch-sw" data-theme="brown" title="Коричневая доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
      </div>

      <section id="setupScreen" class="ch-screen">
        <div class="ch-hero">
          <div class="ch-hero-ico">♞</div>
          <h2>Шахматы</h2>
          <p>Выберите режим и настройки — и в бой.</p>
        </div>

        <div class="ch-setup-grid">
          <div class="ch-col">
            <div class="ch-collabel">Режим игры</div>
            <div id="modeCards">
              <button class="ch-big" data-mode="bot"><span class="ch-big-ico">🤖</span><span>Играть с ботом</span></button>
              <button class="ch-big" data-mode="friend"><span class="ch-big-ico">🔗</span><span>Играть с другом</span></button>
              <button class="ch-big" data-mode="local"><span class="ch-big-ico">👥</span><span>Играть рядом</span></button>
            </div>
          </div>

          <div class="ch-col">
            <div class="ch-collabel">Настройки</div>

            <div class="ch-acc" id="accSide">
              <button class="ch-acc-head" data-acc><span class="ch-acc-ico">♟️</span><span class="ch-acc-title">Играть за</span><span class="ch-acc-val" id="valSide">—</span><span class="ch-acc-arrow">▾</span></button>
              <div class="ch-acc-body"><div class="ch-choices" id="sideChoices">
                <button class="ch-choice" data-side="w">♔ Белые</button>
                <button class="ch-choice" data-side="b">♚ Чёрные</button>
                <button class="ch-choice" data-side="r">🎲 Рандом</button>
              </div></div>
            </div>

            <div class="ch-acc" id="accLevel">
              <button class="ch-acc-head" data-acc><span class="ch-acc-ico">🤖</span><span class="ch-acc-title">Сложность бота</span><span class="ch-acc-val" id="valLevel">—</span><span class="ch-acc-arrow">▾</span></button>
              <div class="ch-acc-body"><div class="ch-choices" id="levelChoices">
                <button class="ch-choice" data-level="1">🙂 Лёгкий</button>
                <button class="ch-choice" data-level="2">😐 Средний</button>
                <button class="ch-choice" data-level="3">😈 Сложный</button>
              </div></div>
            </div>

            <div class="ch-acc" id="accClock">
              <button class="ch-acc-head" data-acc><span class="ch-acc-ico">⏱️</span><span class="ch-acc-title">Время и ходы</span><span class="ch-acc-val" id="valClock">—</span><span class="ch-acc-arrow">▾</span></button>
              <div class="ch-acc-body">
                <div class="ch-sublabel">⏱️ Время каждому игроку</div>
                <div class="ch-chips" id="timeChips">
                  <button class="ch-chip" data-min="0">Нет</button>
                  <button class="ch-chip" data-min="1">1 мин</button>
                  <button class="ch-chip" data-min="5">5 мин</button>
                  <button class="ch-chip" data-min="10">10 мин</button>
                  <button class="ch-chip" data-min="15">15 мин</button>
                  <button class="ch-chip" data-min="20">20 мин</button>
                  <button class="ch-chip" data-min="30">30 мин</button>
                </div>
                <div class="ch-sublabel" style="margin-top:12px">🔢 Ходов каждому игроку</div>
                <div class="ch-chips" id="moveChips">
                  <button class="ch-chip" data-mv="0">Нет</button>
                  <button class="ch-chip" data-mv="30">30 ходов</button>
                  <button class="ch-chip" data-mv="50">50 ходов</button>
                  <button class="ch-chip" data-mv="100">100 ходов</button>
                </div>
              </div>
            </div>

            <div class="ch-hint-line" id="friendHint" hidden>🔗 Игра с другом идёт онлайн: отправьте ссылку — и ходите в реальном времени.</div>
          </div>
        </div>

        <button id="startBtn" class="ch-start">Начать партию ▶</button>
        <button id="viewBtn" class="ch-view">📊 Посмотреть результаты</button>
        <button id="achBtn" class="ch-view">🏆 Достижения</button>
      </section>

      <section id="gameScreen" class="ch-screen" hidden>
        <div class="ch-status" id="chStatus">—</div>

        <div class="ch-online" id="onlineBar" hidden>
          <div class="ch-online-status" id="onlineStatus">Подключение…</div>
          <div class="ch-online-share" id="onlineShare">
            <input id="onlineLink" class="ch-share-input" readonly />
            <button class="ch-btn ch-btn-primary" id="btnOnlineCopy">📋 Скопировать ссылку для друга</button>
          </div>
          <button class="ch-btn" id="btnFallback" hidden>Не подключается? Играть по ссылке-ходу</button>
        </div>

        <div class="ch-playerbar" id="barTop">
          <div class="pb-info"><span class="pb-name" id="topName">Чёрные</span><span class="pb-adv" id="topAdv"></span></div>
          <div class="pb-captured" id="topCaptured"></div>
          <div class="pb-clock" id="topClock" hidden>—</div>
        </div>

        <div class="ch-board-wrap"><div class="ch-board" id="chBoard"></div></div>

        <div class="ch-playerbar" id="barBot">
          <div class="pb-info"><span class="pb-name" id="botName">Белые</span><span class="pb-adv" id="botAdv"></span></div>
          <div class="pb-captured" id="botCaptured"></div>
          <div class="pb-clock" id="botClock" hidden>—</div>
        </div>

        <div class="ch-controls">
          <button class="ch-btn" id="btnMenu">☰ Меню</button>
          <button class="ch-btn" id="btnFlip">🔄 Повернуть</button>
          <button class="ch-btn" id="btnUndo">↶ Отменить</button>
          <button class="ch-btn ch-btn-warn" id="btnResign">🏳️ Сдаться</button>
        </div>
        <div class="ch-history-box">
          <div class="ch-history-title">Ходы</div>
          <div class="ch-history" id="chHistory"></div>
        </div>
      </section>

      <div id="promoModal" class="ch-modal" hidden>
        <div class="ch-modal-box"><div class="ch-modal-title">Выберите фигуру</div><div class="ch-promo-row" id="promoRow"></div></div>
      </div>

      <div id="shareModal" class="ch-modal" hidden>
        <div class="ch-modal-box">
          <div class="ch-modal-title">Ход сделан 📨</div>
          <p class="ch-modal-text">Отправьте эту ссылку другу — он откроет её и сделает свой ход, затем пришлёт ссылку обратно.</p>
          <input id="shareLink" class="ch-share-input" readonly />
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnCopy">📋 Скопировать</button>
            <button class="ch-btn" id="btnShareEdit">↶ Переходить</button>
          </div>
          <div class="ch-share-hint" id="copyHint"></div>
        </div>
      </div>

      <div id="overModal" class="ch-modal" hidden>
        <div class="ch-modal-box ch-over-box">
          <div class="ch-over-ico" id="overIco">♚</div>
          <div class="ch-modal-title" id="overTitle">—</div>
          <p class="ch-modal-text" id="overText"></p>
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnNewGame">Новая партия</button>
            <button class="ch-btn" id="btnViewOver">📊 Результаты</button>
          </div>
        </div>
      </div>

      <div id="histModal" class="ch-modal" hidden>
        <div class="ch-modal-box ch-hist-box">
          <div class="ch-modal-title">📊 Мои партии</div>
          <div class="ch-hist-summary" id="histSummary"></div>
          <div class="ch-hist-list" id="histList"></div>
          <div class="ch-modal-actions">
            <button class="ch-btn" id="histClear">🗑 Очистить</button>
            <button class="ch-btn ch-btn-primary" id="histClose">Закрыть</button>
          </div>
        </div>
      </div>

      <div id="achModal" class="ch-modal" hidden>
        <div class="ch-modal-box ch-ach-box">
          <div class="ch-modal-title">🏆 Достижения</div>
          <div class="ch-ach-sub" id="achCount"></div>
          <div class="ch-ach-list" id="achList"></div>
          <div class="ch-modal-actions"><button class="ch-btn ch-btn-primary" id="achClose">Закрыть</button></div>
        </div>
      </div>
    `;

    elBoard = $('chBoard');
    elStatus = $('chStatus');
    elHistory = $('chHistory');

    bindSetup();
    bindGame();
    bindHistory();
    initDrag();
  }

  /* ========================================================
     ФОН — анимированная мозаика (меняется с темой)
     ======================================================== */
  const bg = { cv: null, ctx: null, T: 76, colors: null, reduce: false, raf: 0 };

  function initBackground() {
    const cv = document.createElement('canvas'); cv.id = 'chBgCanvas';
    const veil = document.createElement('div'); veil.id = 'chBgVeil';
    document.body.appendChild(cv); document.body.appendChild(veil);
    bg.cv = cv; bg.ctx = cv.getContext('2d');
    bg.reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    readBgColors(); resizeBg();
    window.addEventListener('resize', resizeBg);
    if (bg.reduce) drawBg(0); else loopBg();
  }
  function readBgColors() {
    const cs = getComputedStyle(document.body);
    bg.colors = { light: cs.getPropertyValue('--sq-light').trim() || '#eaeaea', dark: cs.getPropertyValue('--sq-dark').trim() || '#5a5f6d', accent: cs.getPropertyValue('--accent').trim() || '#6c8cff' };
  }
  function resizeBg() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    bg.W = W; bg.H = H;
    bg.cv.width = W * dpr; bg.cv.height = H * dpr;
    bg.cv.style.width = W + 'px'; bg.cv.style.height = H + 'px';
    bg.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (bg.reduce) drawBg(0);
  }
  function hash(i, j) { let n = (i * 73856093) ^ (j * 19349663); n = (n >>> 0) % 1000; return n / 1000; }
  function drawBg(t) {
    const { ctx, T, colors, W, H } = bg; if (!ctx) return;
    const offX = (t / 1000) * 7, offY = (t / 1000) * 4.2;
    const baseI = Math.floor(offX / T), baseJ = Math.floor(offY / T);
    const fracX = offX - baseI * T, fracY = offY - baseJ * T;
    const cols = Math.ceil(W / T) + 2, rows = Math.ceil(H / T) + 2;
    ctx.clearRect(0, 0, W, H);
    const gap = 3, rad = 10;
    for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
      const i = baseI + a, j = baseJ + b;
      const x = a * T - fracX, y = b * T - fracY;
      const dark = (i + j) % 2 === 0, v = hash(i, j);
      ctx.fillStyle = dark ? colors.dark : colors.light;
      roundRect(ctx, x + gap, y + gap, T - gap * 2, T - gap * 2, rad); ctx.fill();
      const d = (v - 0.5) * 0.5;
      ctx.fillStyle = d >= 0 ? `rgba(255,255,255,${d * 0.22})` : `rgba(0,0,0,${-d * 0.28})`; ctx.fill();
      if (v > 0.93) { ctx.strokeStyle = colors.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; roundRect(ctx, x + gap + 1, y + gap + 1, T - gap * 2 - 2, T - gap * 2 - 2, rad - 1); ctx.stroke(); ctx.globalAlpha = 1; }
    }
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function loopBg() { const step = (t) => { drawBg(t); bg.raf = requestAnimationFrame(step); }; bg.raf = requestAnimationFrame(step); }

  /* ========================================================
     НАСТРОЙКА
     ======================================================== */
  let setup = { mode: 'bot', side: 'w', level: 2, timeMin: 0, moveLim: 0 };

  // Сохранение/загрузка настроек между запусками
  function saveSetup() {
    try { localStorage.setItem('chessSetup', JSON.stringify({ mode: setup.mode, side: setup.side, level: setup.level, timeMin: setup.timeMin, moveLim: setup.moveLim })); } catch (e) { }
  }
  function loadSetup() {
    try {
      const s = JSON.parse(localStorage.getItem('chessSetup') || '{}');
      if (s && typeof s === 'object') {
        if (['bot', 'friend', 'local'].indexOf(s.mode) >= 0) setup.mode = s.mode;
        if (['w', 'b', 'r'].indexOf(s.side) >= 0) setup.side = s.side;
        if ([1, 2, 3].indexOf(s.level) >= 0) setup.level = s.level;
        if ([0, 1, 5, 10, 15, 20, 30].indexOf(s.timeMin) >= 0) setup.timeMin = s.timeMin;
        if ([0, 30, 50, 100].indexOf(s.moveLim) >= 0) setup.moveLim = s.moveLim;
      }
    } catch (e) { }
  }

  function bindSetup() {
    loadSetup();
    $('themeBar').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-sw'); if (!b) return;
      app.theme = b.dataset.theme; localStorage.setItem('chessTheme', app.theme); applyTheme(app.theme); markActive('#themeBar .ch-sw', b);
    });
    $('modeCards').addEventListener('click', (e) => {
      const c = e.target.closest('.ch-big'); if (!c) return;
      setup.mode = c.dataset.mode; markActive('#modeCards .ch-big', c); updateSetupVisibility(); saveSetup();
    });
    document.querySelectorAll('#setupScreen .ch-acc-head').forEach(h => h.addEventListener('click', () => { const acc = h.parentElement; if (!acc.classList.contains('disabled')) acc.classList.toggle('open'); }));
    $('sideChoices').addEventListener('click', (e) => { const b = e.target.closest('.ch-choice'); if (!b) return; setup.side = b.dataset.side; markActive('#sideChoices .ch-choice', b); updateSummaries(); saveSetup(); });
    $('levelChoices').addEventListener('click', (e) => { const b = e.target.closest('.ch-choice'); if (!b) return; setup.level = parseInt(b.dataset.level, 10); markActive('#levelChoices .ch-choice', b); updateSummaries(); saveSetup(); });
    $('timeChips').addEventListener('click', (e) => { const b = e.target.closest('.ch-chip'); if (!b) return; setup.timeMin = parseInt(b.dataset.min, 10); markActive('#timeChips .ch-chip', b); updateSummaries(); saveSetup(); });
    $('moveChips').addEventListener('click', (e) => { const b = e.target.closest('.ch-chip'); if (!b) return; setup.moveLim = parseInt(b.dataset.mv, 10); markActive('#moveChips .ch-chip', b); updateSummaries(); saveSetup(); });
    $('startBtn').addEventListener('click', startGame);

    // применяем сохранённые настройки (или значения по умолчанию)
    selectDefault('#modeCards .ch-big', `[data-mode="${setup.mode}"]`);
    selectDefault('#sideChoices .ch-choice', `[data-side="${setup.side}"]`);
    selectDefault('#levelChoices .ch-choice', `[data-level="${setup.level}"]`);
    selectDefault('#timeChips .ch-chip', `[data-min="${setup.timeMin}"]`);
    selectDefault('#moveChips .ch-chip', `[data-mv="${setup.moveLim}"]`);
    selectDefault('#themeBar .ch-sw', `[data-theme="${app.theme}"]`);
    updateSummaries(); updateSetupVisibility();
  }

  function updateSummaries() {
    $('valSide').textContent = { w: '♔ Белые', b: '♚ Чёрные', r: '🎲 Рандом' }[setup.side];
    $('valLevel').textContent = { 1: '🙂 Лёгкий', 2: '😐 Средний', 3: '😈 Сложный' }[setup.level];
    const parts = [];
    if (setup.timeMin > 0) parts.push(setup.timeMin + ' мин');
    if (setup.moveLim > 0) parts.push(setup.moveLim + ' ход.');
    $('valClock').textContent = parts.length ? parts.join(' · ') : '♾️ Без ограничения';
  }

  function updateSetupVisibility() {
    $('accLevel').style.display = setup.mode === 'bot' ? '' : 'none';
    $('friendHint').hidden = setup.mode !== 'friend';
  }

  function selectDefault(g, s) { const el = document.querySelector(g + s) || document.querySelector(g); if (el) markActive(g, el); }
  function markActive(g, el) { document.querySelectorAll(g).forEach(x => x.classList.remove('active')); el.classList.add('active'); }

  function showSetup() {
    closeOnline();
    $('setupScreen').hidden = false;
    $('gameScreen').hidden = true;
    updateSetupVisibility();
  }

  function resolveSide(side) { return side === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : side; }

  function resetGame() {
    app.state = C.newGameState();
    app.history = []; app.lastMove = null; app.selected = -1; app.legalFrom = [];
    app.over = false; app.overText = ''; app.pendingShare = false; app.botThinking = false; app.paused = false;
  }

  function startGame() {
    closeOnline();
    app.mode = setup.mode; app.level = setup.level;
    resetGame();
    resetGameStats();

    if (app.mode === 'local') { app.myColor = null; app.orientation = resolveSide(setup.side); initClock(); enterGameScreen(); return; }

    app.myColor = resolveSide(setup.side); app.orientation = app.myColor;

    if (app.mode === 'friend') {
      if (netAvailable()) { startOnlineHost(); return; }
      // запасной вариант — по ссылке-ходу
      app.online.on = false; app.clock = emptyClock();
      enterGameScreen();
      if (app.myColor === 'b') openShare();
      return;
    }

    // bot
    initClock(); enterGameScreen(); maybeBotMove();
  }

  function emptyClock() { return { timeOn: false, movesOn: false, timeMs: { w: 0, b: 0 }, movesLeft: { w: 0, b: 0 }, lastTick: Date.now() }; }

  function initClock() {
    const cl = emptyClock();
    if (setup.timeMin > 0) { cl.timeOn = true; const ms = setup.timeMin * 60000; cl.timeMs = { w: ms, b: ms }; }
    if (setup.moveLim > 0) { cl.movesOn = true; cl.movesLeft = { w: setup.moveLim, b: setup.moveLim }; }
    app.clock = cl;
  }

  function enterGameScreen() {
    $('setupScreen').hidden = true;
    $('gameScreen').hidden = false;
    const onl = app.mode === 'friend' && app.online.on;
    $('onlineBar').hidden = !onl;
    $('btnFlip').style.display = onl ? 'none' : '';
    $('btnUndo').style.display = app.mode === 'friend' ? 'none' : '';
    $('btnResign').style.display = (app.mode === 'friend' && !onl) ? 'none' : '';
    render();
    if (onl) setOnlineStatus();
  }

  /* ========================================================
     ОНЛАЙН-ИГРА С ДРУГОМ
     ======================================================== */
  function randId() { let s = ''; const a = 'abcdefghijkmnpqrstuvwxyz23456789'; for (let i = 0; i < 6; i++) s += a[(Math.random() * a.length) | 0]; return s; }

  function startOnlineHost() {
    const room = randId();
    const host = app.myColor;
    app.online = { on: true, role: 'host', room, myColor: host, hostColor: host, myId: null, net: null, connected: false, peerReady: false, failed: false, timeMin: setup.timeMin, moveLim: setup.moveLim };
    initClock();
    connectOnline();
    enterGameScreen();
  }

  function startOnlineGuest(hash) {
    const params = parseHash(hash);
    if (!params.room) { showSetup(); return; }
    app.theme = localStorage.getItem('chessTheme') || 'classic'; applyTheme(app.theme);
    if (!netAvailable()) {
      // без библиотеки живьём не подключиться
      app.mode = 'friend'; resetGame();
      alert('Чтобы играть онлайн, откройте ссылку в обычном браузере с интернетом.');
      showSetup(); return;
    }
    app.mode = 'friend';
    resetGame();
    resetGameStats();
    const hostColor = params.h === 'b' ? 'b' : 'w';
    setup.timeMin = parseInt(params.t || '0', 10) || 0;
    setup.moveLim = parseInt(params.m || '0', 10) || 0;
    app.myColor = hostColor === 'w' ? 'b' : 'w';
    app.orientation = app.myColor;
    app.online = { on: true, role: 'guest', room: params.room, myColor: app.myColor, hostColor, myId: null, net: null, connected: false, peerReady: false, failed: false, timeMin: setup.timeMin, moveLim: setup.moveLim };
    initClock();
    connectOnline();
    enterGameScreen();
  }

  function parseHash(h) {
    const out = {};
    h.replace(/^#/, '').split('&').forEach(kv => { const i = kv.indexOf('='); if (i > 0) out[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    return out;
  }

  function buildOnlineLink() {
    const o = app.online;
    return location.origin + location.pathname + '#room=' + o.room + '&h=' + o.hostColor + '&t=' + (o.timeMin || 0) + '&m=' + (o.moveLim || 0);
  }

  function connectOnline() {
    const o = app.online;
    o.net = ChessNet.connect(o.room, {
      onOpen: () => { o.connected = true; o.failed = false; o.myId = o.net.id; netSend({ t: 'hi', s: o.myId, c: o.myColor }); setOnlineStatus(); },
      onReconnect: () => { o.connected = false; setOnlineStatus(); },
      onClose: () => { o.connected = false; setOnlineStatus(); },
      onFail: () => { o.failed = true; setOnlineStatus(); },
      onMessage: handleNetMsg
    });
    if (!o.net) { o.failed = true; setOnlineStatus(); }
  }

  function netSend(obj) { if (app.online.net) app.online.net.publish(obj); }

  function closeOnline() {
    if (app.online && app.online.net) { try { app.online.net.close(); } catch (e) { } }
    app.online = { on: false, role: null, room: null, myColor: 'w', hostColor: 'w', myId: null, net: null, connected: false, peerReady: false, failed: false };
  }

  function handleNetMsg(o) {
    const me = app.online;
    if (!me.on) return;
    if (o.s && o.s === me.myId) return; // свои сообщения игнорируем
    if (o.t === 'hi') {
      me.peerReady = true; setOnlineStatus();
      if (me.role === 'host') sendSync();
    } else if (o.t === 'sync') {
      me.peerReady = true; applySync(o); setOnlineStatus();
    } else if (o.t === 'mv') {
      me.peerReady = true; applyRemoteMove(o);
    } else if (o.t === 'end') {
      me.peerReady = true;
      if (o.kind === 'resign') finishGame({ type: 'resign', loser: o.loser });
      else if (o.kind === 'time') finishGame({ type: 'time', loser: o.loser });
    }
  }

  function clockSnapshot() {
    const c = app.clock;
    return { msW: c.timeMs.w, msB: c.timeMs.b, mvW: c.movesLeft.w, mvB: c.movesLeft.b };
  }

  function sendSync() {
    netSend(Object.assign({ t: 'sync', s: app.online.myId, moves: app.history.slice(), h: app.online.hostColor, tm: app.online.timeMin || 0, mm: app.online.moveLim || 0 }, clockSnapshot()));
  }

  function applySync(o) {
    if (!o.moves || o.moves.length < app.history.length) return; // не откатываем более длинную партию
    rebuildFrom(o.moves);
    adoptClock(o);
    render();
    checkOver();
  }

  function rebuildFrom(moves) {
    app.state = C.newGameState(); app.history = []; app.lastMove = null;
    for (const code of moves) {
      const from = C.nameToSq(code.substr(0, 2)), to = C.nameToSq(code.substr(2, 2)), promo = code[4] || '';
      const lm = C.legalMoves(app.state).find(m => m.from === from && m.to === to && (!promo || m.promo === promo));
      if (!lm) break;
      C.makeMove(app.state, lm); app.history.push(encodeMove(lm)); app.lastMove = { from, to };
    }
    app.selected = -1; app.legalFrom = [];
  }

  function adoptClock(o) {
    if (app.clock.timeOn && o.msW != null) { app.clock.timeMs.w = o.msW; app.clock.timeMs.b = o.msB; }
    if (app.clock.movesOn && o.mvW != null) { app.clock.movesLeft.w = o.mvW; app.clock.movesLeft.b = o.mvB; }
    app.clock.lastTick = Date.now();
  }

  function applyRemoteMove(o) {
    const code = o.mv || '';
    const from = C.nameToSq(code.substr(0, 2)), to = C.nameToSq(code.substr(2, 2)), promo = code[4] || '';
    const lm = C.legalMoves(app.state).find(m => m.from === from && m.to === to && (!promo || m.promo === promo));
    if (!lm) return; // уже применён или не подходит
    const capType = capturedType(lm);
    C.makeMove(app.state, lm); app.history.push(encodeMove(lm)); app.lastMove = { from, to };
    if (hasYou() && capType === 'q') bumpStats(s => { s.queensLost++; });
    adoptClock(o);
    render();
    if (capType) showTaunt(lm.to, capType);
    checkOver();
  }

  function publishMove() {
    netSend(Object.assign({ t: 'mv', s: app.online.myId, mv: app.history[app.history.length - 1] }, clockSnapshot()));
  }

  function setOnlineStatus() {
    const o = app.online; if (!o.on) return;
    const st = $('onlineStatus'); const fb = $('btnFallback');
    st.classList.remove('ok', 'warn', 'bad');
    if (o.failed && !o.connected) { st.textContent = '🔴 Нет связи с сервером. Проверьте интернет — или сыграйте по ссылке-ходу.'; st.classList.add('bad'); fb.hidden = false; }
    else if (!o.connected) { st.textContent = '🟡 Подключение к серверу…'; st.classList.add('warn'); fb.hidden = true; }
    else if (!o.peerReady) { st.textContent = '🟢 Готово! Отправьте ссылку другу и ждите — соперник ещё не зашёл.'; st.classList.add('ok'); fb.hidden = true; }
    else { st.textContent = '🟢 Соперник в игре ✓'; st.classList.add('ok'); fb.hidden = true; }
    $('onlineLink').value = buildOnlineLink();
  }

  function switchToCorrespondence() {
    closeOnlineKeepMode();
    app.online.on = false;
    app.clock = emptyClock();
    resetGame();
    app.myColor = resolveSide(setup.side); app.orientation = app.myColor;
    $('onlineBar').hidden = true;
    $('btnResign').style.display = 'none';
    render();
    if (app.myColor === 'b') openShare();
  }
  function closeOnlineKeepMode() { if (app.online.net) { try { app.online.net.close(); } catch (e) { } app.online.net = null; } }

  /* ========================================================
     ССЫЛКИ (запасной режим «по ссылке-ходу»)
     ======================================================== */
  function startFromLink(encoded) {
    app.mode = 'friend'; app.online.on = false;
    resetGame();
    app.clock = emptyClock();
    app.theme = localStorage.getItem('chessTheme') || 'classic'; applyTheme(app.theme);
    if (!replayMoves(encoded)) { showSetup(); return; }
    app.myColor = app.state.turn; app.orientation = app.state.turn;
    enterGameScreen();
    checkOver();
  }

  function replayMoves(str) {
    let i = 0;
    while (i < str.length) {
      const from = C.nameToSq(str.substr(i, 2)), to = C.nameToSq(str.substr(i + 2, 2)); i += 4;
      const piece = app.state.board[from]; let promo = '';
      if (piece && C.typeOf(piece) === 'p' && (C.rankOf(to) === 0 || C.rankOf(to) === 7)) { promo = str[i]; i += 1; }
      const legal = C.legalMoves(app.state).find(m => m.from === from && m.to === to && (!promo || m.promo === promo));
      if (!legal) return false;
      C.makeMove(app.state, legal); app.history.push(encodeMove(legal)); app.lastMove = { from, to };
    }
    return true;
  }

  function encodeMove(m) { return C.sqName(m.from) + C.sqName(m.to) + (m.promo || ''); }
  function buildLink() { return location.origin + location.pathname + '#g=' + app.history.join(''); }
  function openShare() { $('shareLink').value = buildLink(); $('copyHint').textContent = ''; $('shareModal').hidden = false; app.pendingShare = true; }

  /* ========================================================
     ОТРИСОВКА
     ======================================================== */
  function render() { renderBoard(); renderStatus(); renderHistory(); renderPlayerBars(); }
  function colorName(c) { return c === 'w' ? 'Белые' : 'Чёрные'; }
  function FILE_LETTER(f) { return 'abcdefgh'[f]; }

  function renderBoard() {
    elBoard.innerHTML = '';
    const flip = app.orientation === 'b';
    for (let rr = 7; rr >= 0; rr--) for (let ff = 0; ff < 8; ff++) {
      const r = flip ? 7 - rr : rr, f = flip ? 7 - ff : ff, s = C.sq(f, r);
      const cell = document.createElement('div');
      cell.className = 'ch-sq ' + ((f + r) % 2 === 0 ? 'dark' : 'light');
      cell.dataset.sq = s;
      if (ff === 0) { const rk = document.createElement('span'); rk.className = 'ch-coord ch-coord-rank'; rk.textContent = r + 1; cell.appendChild(rk); }
      if (rr === 0) { const fl = document.createElement('span'); fl.className = 'ch-coord ch-coord-file'; fl.textContent = FILE_LETTER(f); cell.appendChild(fl); }
      if (app.lastMove && (app.lastMove.from === s || app.lastMove.to === s)) cell.classList.add('last');
      if (app.selected === s) cell.classList.add('sel');
      const p = app.state.board[s];
      if (p) { const pc = document.createElement('span'); pc.className = 'ch-piece ' + (C.colorOf(p) === 'w' ? 'white' : 'black'); pc.textContent = GLYPH[C.typeOf(p)]; cell.appendChild(pc); }
      const lm = app.legalFrom.find(m => m.to === s);
      if (lm) { const dot = document.createElement('span'); dot.className = 'ch-dot' + (app.state.board[s] || lm.flag === 'ep' ? ' cap' : ''); cell.appendChild(dot); }
      if (p && C.typeOf(p) === 'k' && C.inCheck(app.state, C.colorOf(p)) && (C.colorOf(p) === app.state.turn || app.over)) cell.classList.add('check');
      cell.addEventListener('pointerdown', (e) => onPointerDown(e, s));
      elBoard.appendChild(cell);
    }
  }

  function renderStatus() {
    const st = elStatus; st.classList.remove('check', 'over');
    const turnName = colorName(app.state.turn);
    if (app.over) { st.classList.add('over'); st.textContent = app.overText || 'Партия окончена'; return; }
    let txt;
    if (app.botThinking) txt = '🤖 Бот думает…';
    else if (app.mode === 'friend' && app.online.on) txt = (app.state.turn === app.online.myColor ? `Ваш ход · ${turnName}` : `Ход соперника · ${turnName}`);
    else if (app.mode === 'friend' && app.pendingShare) txt = 'Ход сделан — отправьте ссылку другу';
    else if (app.mode === 'friend') txt = `Ваш ход · ${turnName}`;
    else if (app.mode === 'bot') txt = app.state.turn === app.myColor ? `Ваш ход · ${turnName}` : `Ход бота · ${turnName}`;
    else txt = `Ход: ${turnName}`;
    if (C.inCheck(app.state, app.state.turn)) { txt = '⚠️ ШАХ! ' + txt; st.classList.add('check'); }
    st.textContent = txt;
  }

  function renderHistory() {
    let html = '';
    for (let i = 0; i < app.history.length; i += 2) { const n = i / 2 + 1; html += `<span class="ch-move"><b>${n}.</b> ${fmtMove(app.history[i] || '')} ${fmtMove(app.history[i + 1] || '')}</span>`; }
    elHistory.innerHTML = html || '<span class="ch-move-empty">Ходов пока нет</span>';
    elHistory.scrollTop = elHistory.scrollHeight;
  }
  function fmtMove(m) { return !m ? '' : m.slice(0, 2) + '→' + m.slice(2, 4) + (m[4] ? '=' + m[4].toUpperCase() : ''); }

  function computeMissing() {
    const cnt = { w: {}, b: {} };
    for (const p of app.state.board) { if (!p || C.typeOf(p) === 'k') continue; cnt[C.colorOf(p)][C.typeOf(p)] = (cnt[C.colorOf(p)][C.typeOf(p)] || 0) + 1; }
    const missing = { w: {}, b: {} };
    for (const c of ['w', 'b']) for (const t in START) missing[c][t] = START[t] - (cnt[c][t] || 0);
    return missing;
  }
  function capturedValue(m) { let v = 0; for (const t in m) v += m[t] * VAL[t]; return v; }

  function renderPlayerBars() {
    const missing = computeMissing();
    const bottomColor = app.orientation, topColor = bottomColor === 'w' ? 'b' : 'w';
    const advBottom = capturedValue(missing[topColor]) - capturedValue(missing[bottomColor]);
    fillBar('bot', bottomColor, missing[topColor], topColor, advBottom);
    fillBar('top', topColor, missing[bottomColor], bottomColor, -advBottom);
    updateClocks();
  }
  function fillBar(which, color, captured, capturedColor, adv) {
    $(which + 'Name').textContent = colorName(color) + (app.state && app.state.turn === color && !app.over ? ' ●' : '');
    let pcs = '';
    for (const t of ['q', 'r', 'b', 'n', 'p']) for (let k = 0; k < (captured[t] || 0); k++) pcs += `<span class="pb-piece ${capturedColor === 'w' ? 'white' : 'black'}">${GLYPH[t]}</span>`;
    $(which + 'Captured').innerHTML = pcs;
    $(which + 'Adv').textContent = adv > 0 ? '+' + adv : '';
  }

  /* ========================================================
     ЧАСЫ / ЛИМИТ
     ======================================================== */
  function startClockLoop() {
    setInterval(() => {
      const cl = app.clock;
      if (!cl.timeOn) return;
      if (app.over || app.paused || app.state == null) { cl.lastTick = Date.now(); return; }
      const now = Date.now(), dt = now - cl.lastTick; cl.lastTick = now;
      const c = app.state.turn; cl.timeMs[c] -= dt;
      if (cl.timeMs[c] <= 0) {
        cl.timeMs[c] = 0; updateClocks();
        if (!app.online.on || c === app.online.myColor) { finishGame({ type: 'time', loser: c }); if (app.online.on) netSend({ t: 'end', s: app.online.myId, kind: 'time', loser: c }); }
        return;
      }
      updateClocks();
    }, 200);
  }
  function fmtTime(ms) { if (ms < 0) ms = 0; const total = Math.ceil(ms / 1000); const m = Math.floor(total / 60), s = total % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function updateClocks() { const cl = app.clock, bottomColor = app.orientation, topColor = bottomColor === 'w' ? 'b' : 'w'; setClock('bot', bottomColor, cl); setClock('top', topColor, cl); }
  function setClock(which, color, cl) {
    const el = $(which + 'Clock');
    if (!cl.timeOn && !cl.movesOn) { el.hidden = true; return; }
    el.hidden = false; el.classList.remove('active', 'low');
    if (!app.over && app.state && app.state.turn === color) el.classList.add('active');
    const parts = []; let low = false;
    if (cl.timeOn) { parts.push('⏱️ ' + fmtTime(cl.timeMs[color])); if (cl.timeMs[color] <= 20000) low = true; }
    if (cl.movesOn) { parts.push('🔢 ' + cl.movesLeft[color]); if (cl.movesLeft[color] <= 3) low = true; }
    el.textContent = parts.join('  ·  '); if (low) el.classList.add('low');
  }

  /* ========================================================
     ХОДЫ ИГРОКА
     ======================================================== */
  function canMoveNow() {
    if (app.over || app.botThinking || app.paused) return false;
    if (app.mode === 'friend') {
      if (app.online.on) return app.state.turn === app.online.myColor;
      if (app.pendingShare) return false;
      return app.state.turn === app.myColor;
    }
    if (app.mode === 'bot' && app.state.turn !== app.myColor) return false;
    return true;
  }

  function isMyPiece(p) {
    return p && C.colorOf(p) === app.state.turn && !((app.mode === 'bot' || app.mode === 'friend') && C.colorOf(p) !== app.myColor);
  }

  // Попытка хода выбранной фигурой на клетку to. false — если так нельзя.
  function tryMoveTo(to) {
    const target = app.legalFrom.filter(m => m.to === to);
    if (!target.length) return false;
    if (target.length > 1) { app.paused = true; askPromotion(app.state.turn, (promo) => { app.paused = false; app.clock.lastTick = Date.now(); doMove(target.find(m => m.promo === promo)); }); }
    else doMove(target[0]);
    return true;
  }

  function onPointerDown(e, s) {
    if (!canMoveNow()) return;
    const p = app.state.board[s];
    if (isMyPiece(p)) {
      // выбор + начало перетаскивания
      e.preventDefault();
      app.selected = s; app.legalFrom = C.legalMovesFrom(app.state, s);
      renderBoard();
      startDrag(e, s, p);
      return;
    }
    // тап по клетке-цели, когда фигура уже выбрана
    if (app.selected >= 0) {
      e.preventDefault();
      if (tryMoveTo(s)) return;
    }
    app.selected = -1; app.legalFrom = []; renderBoard();
  }

  /* ---- Перетаскивание фигур (мышь и палец) ---- */
  const drag = { active: false, from: -1, moved: false, sx: 0, sy: 0, ghost: null };

  function initDrag() {
    const g = document.createElement('div');
    g.className = 'ch-ghost'; g.style.display = 'none';
    document.body.appendChild(g);
    drag.ghost = g;
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', cancelDrag);
  }

  function startDrag(e, s, p) {
    drag.active = true; drag.from = s; drag.moved = false; drag.sx = e.clientX; drag.sy = e.clientY;
    const size = elBoard.clientWidth / 8;
    const g = drag.ghost;
    g.style.width = size + 'px'; g.style.height = size + 'px';
    g.innerHTML = `<span class="ch-piece ${C.colorOf(p) === 'w' ? 'white' : 'black'}" style="font-size:${Math.round(size * 0.8)}px">${GLYPH[C.typeOf(p)]}</span>`;
    g.style.display = 'none';
    try { elBoard.setPointerCapture(e.pointerId); } catch (_) { }
  }

  function onPointerMove(e) {
    if (!drag.active) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      drag.moved = true;
      drag.ghost.style.display = 'flex';
      const pc = elBoard.querySelector(`.ch-sq[data-sq="${drag.from}"] .ch-piece`);
      if (pc) pc.style.visibility = 'hidden';
    }
    if (drag.moved) { e.preventDefault(); positionGhost(e.clientX, e.clientY); }
  }

  function positionGhost(x, y) {
    const half = drag.ghost.clientWidth / 2;
    drag.ghost.style.transform = `translate(${x - half}px, ${y - half}px)`;
  }

  function onPointerUp(e) {
    if (!drag.active) return;
    const moved = drag.moved;
    drag.active = false; drag.ghost.style.display = 'none';
    if (moved) {
      const to = squareUnderPointer(e.clientX, e.clientY);
      const ok = to >= 0 && tryMoveTo(to);
      if (!ok) { app.selected = -1; app.legalFrom = []; renderBoard(); } // недопустимо → вернуть на место
    }
    // если не двигали — это тап, выбор остаётся (подсказки показаны)
  }

  function cancelDrag() {
    if (!drag.active) return;
    drag.active = false; drag.ghost.style.display = 'none';
    app.selected = -1; app.legalFrom = []; renderBoard();
  }

  function squareUnderPointer(x, y) {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest ? el.closest('.ch-sq') : null;
    return cell ? parseInt(cell.dataset.sq, 10) : -1;
  }

  /* ---- Облачко-подколка при взятии фигуры ---- */
  // Фраза зависит от того, какую фигуру съели
  const TAUNT_BY = { p: 'Хочу ещё!', n: 'Я голоден 🤤', b: 'Ха-ха!', r: 'Как вкусно 😋', q: 'Лашара!' };
  let tauntEl = null, tauntTimer = 0;
  function showTaunt(sq, type) {
    const cell = elBoard.querySelector(`.ch-sq[data-sq="${sq}"]`);
    if (!cell) return;
    if (!tauntEl) { tauntEl = document.createElement('div'); tauntEl.className = 'ch-taunt'; document.body.appendChild(tauntEl); }
    const r = cell.getBoundingClientRect();
    tauntEl.textContent = TAUNT_BY[type] || 'Ам! 🍿';
    const below = r.top < 76;
    tauntEl.classList.toggle('below', below);
    tauntEl.style.left = (r.left + r.width / 2) + 'px';
    tauntEl.style.top = (below ? r.bottom + 6 : r.top - 6) + 'px';
    tauntEl.classList.remove('hide');
    tauntEl.style.display = 'block';
    tauntEl.classList.remove('pop'); void tauntEl.offsetWidth; tauntEl.classList.add('pop');
    clearTimeout(tauntTimer);
    tauntTimer = setTimeout(() => { tauntEl.classList.add('hide'); }, 1500);
  }

  function applyMove(m) {
    const mover = app.state.turn;
    C.makeMove(app.state, m); app.history.push(encodeMove(m)); app.lastMove = { from: m.from, to: m.to };
    if (app.clock.movesOn) app.clock.movesLeft[mover]--;
    app.clock.lastTick = Date.now();
  }

  function capturedType(m) {
    return m.flag === 'ep' ? 'p' : (app.state.board[m.to] ? C.typeOf(app.state.board[m.to]) : null);
  }

  function doMove(m) {
    const me = app.state.turn;
    const capType = capturedType(m);
    const fromAttacked = hasYou() && C.isAttacked(app.state.board, m.from, me === 'w' ? 'b' : 'w');
    applyMove(m);
    app.selected = -1; app.legalFrom = [];
    if (hasYou()) trackMyMove(m, me, capType, fromAttacked);
    if (app.mode === 'friend' && app.online.on) publishMove();
    render();
    if (capType) showTaunt(m.to, capType);
    if (checkOver()) return;
    if (app.mode === 'friend' && !app.online.on) openShare();
    else if (app.mode === 'bot') maybeBotMove();
  }

  function maybeBotMove() {
    if (app.mode !== 'bot' || app.over) return;
    if (app.state.turn === app.myColor) return;
    app.botThinking = true; renderStatus();
    const delay = 2000 + Math.random() * 600; // бот «думает» минимум 2 секунды
    setTimeout(() => {
      if (app.over) { app.botThinking = false; return; }
      const m = C.botMove(app.state, app.level); app.botThinking = false;
      if (!m) { checkOver(); return; }
      const capType = capturedType(m);
      applyMove(m);
      if (hasYou() && capType === 'q') bumpStats(s => { s.queensLost++; });
      render(); if (capType) showTaunt(m.to, capType); checkOver();
    }, delay);
  }

  /* ========================================================
     ОКОНЧАНИЕ
     ======================================================== */
  function checkOver() {
    const st = C.gameStatus(app.state);
    if (st === 'checkmate') { finishGame({ type: 'checkmate', winner: app.state.turn === 'w' ? 'b' : 'w' }); return true; }
    if (st === 'stalemate') { finishGame({ type: 'stalemate' }); return true; }
    if (st === 'draw') { finishGame({ type: 'draw' }); return true; }
    if (app.clock.movesOn && app.clock.movesLeft[app.state.turn] <= 0) { finishGame({ type: 'moves' }); return true; }
    return false;
  }

  function materialWinner() {
    const missing = computeMissing();
    const netW = capturedValue(missing.b) - capturedValue(missing.w);
    if (netW > 0) return { winner: 'w', adv: netW };
    if (netW < 0) return { winner: 'b', adv: -netW };
    return { winner: null, adv: 0 };
  }

  function finishGame(res) {
    if (app.over) return;
    app.over = true; app.selected = -1; app.legalFrom = []; app.pendingShare = false;
    let ico = '🤝', title = 'Ничья', text = '', winnerColor = null;
    if (res.type === 'checkmate') { ico = '♚'; title = 'Мат!'; text = `${colorName(res.winner)} выиграли! 🎉`; winnerColor = res.winner; }
    else if (res.type === 'stalemate') { ico = '🤝'; title = 'Пат — ничья'; text = 'Ходить нечем, но шаха нет. Ничья.'; }
    else if (res.type === 'time') { const w = res.loser === 'w' ? 'b' : 'w'; ico = '⏱️'; title = 'Время вышло'; text = `У ${colorName(res.loser).toLowerCase()} закончилось время. ${colorName(w)} выиграли! 🎉`; winnerColor = w; }
    else if (res.type === 'moves') { const mw = materialWinner(); ico = '🔢'; if (mw.winner) { title = 'Лимит ходов'; text = `Ходы закончились. ${colorName(mw.winner)} выиграли по материалу (+${mw.adv}). 🎉`; winnerColor = mw.winner; } else { title = 'Лимит ходов — ничья'; text = 'Ходы закончились, материал равный. Ничья.'; } }
    else if (res.type === 'resign') { const w = res.loser === 'w' ? 'b' : 'w'; ico = '🏳️'; title = 'Сдача'; text = `${colorName(res.loser)} сдались. ${colorName(w)} выиграли! 🎉`; winnerColor = w; }
    else { ico = '🤝'; title = 'Ничья'; text = 'Недостаточно материала или правило 50 ходов.'; }
    recordResult(winnerColor);
    trackGameEnd(res, winnerColor);
    app.overText = ico + ' ' + title + ' — ' + text;
    render();
    $('overIco').textContent = ico; $('overTitle').textContent = title; $('overText').textContent = text;
    $('shareModal').hidden = true; $('overModal').hidden = false;
  }

  /* ========================================================
     ПРЕВРАЩЕНИЕ
     ======================================================== */
  function askPromotion(color, cb) {
    const row = $('promoRow'); row.innerHTML = '';
    for (const t of ['q', 'r', 'b', 'n']) {
      const btn = document.createElement('button');
      btn.className = 'ch-promo ' + (color === 'w' ? 'white' : 'black');
      btn.textContent = GLYPH[t];
      btn.addEventListener('click', () => { $('promoModal').hidden = true; cb(t); });
      row.appendChild(btn);
    }
    $('promoModal').hidden = false;
  }

  /* ========================================================
     ТЕМЫ
     ======================================================== */
  function applyTheme(name) { document.body.setAttribute('data-chess-theme', name); if (bg.ctx) { readBgColors(); if (bg.reduce) drawBg(0); } }

  /* ========================================================
     КНОПКИ + МОДАЛКИ
     ======================================================== */
  function bindGame() {
    $('btnMenu').addEventListener('click', () => { if (confirm('Выйти в меню? Текущая партия будет прекращена.')) { location.hash = ''; showSetup(); } });
    $('btnFlip').addEventListener('click', () => { app.orientation = app.orientation === 'w' ? 'b' : 'w'; renderBoard(); renderPlayerBars(); });
    $('btnUndo').addEventListener('click', () => undoLast());
    $('btnResign').addEventListener('click', () => {
      if (app.over) return;
      if (!confirm('Сдаться?')) return;
      const loser = app.online.on ? app.online.myColor : (app.mode === 'bot' ? app.myColor : app.state.turn);
      if (app.online.on) netSend({ t: 'end', s: app.online.myId, kind: 'resign', loser });
      finishGame({ type: 'resign', loser });
    });
    $('btnNewGame').addEventListener('click', () => { $('overModal').hidden = true; location.hash = ''; showSetup(); });
    $('btnCopy').addEventListener('click', () => { const inp = $('shareLink'); inp.select(); copyText(inp.value).then(ok => { $('copyHint').textContent = ok ? '✓ Ссылка скопирована' : 'Скопируйте вручную (выделено выше)'; }); });
    $('btnShareEdit').addEventListener('click', () => { $('shareModal').hidden = true; app.pendingShare = false; undoLast(true); });
    $('btnOnlineCopy').addEventListener('click', () => { const inp = $('onlineLink'); inp.select(); copyText(inp.value).then(ok => { $('btnOnlineCopy').textContent = ok ? '✓ Скопировано — отправьте другу' : '📋 Выделено — скопируйте вручную'; }); });
    $('btnFallback').addEventListener('click', () => switchToCorrespondence());
  }

  function undoLast(single) {
    if (app.history.length === 0 || app.over || app.online.on) return;
    const back = (app.mode === 'bot' && !single) ? 2 : 1;
    const moves = app.history.slice(0, Math.max(0, app.history.length - back));
    rebuildFrom(moves);
    app.over = false; app.pendingShare = false;
    if (app.clock.movesOn) { let w = 0, b = 0; for (let i = 0; i < app.history.length; i++)(i % 2 === 0 ? w++ : b++); app.clock.movesLeft.w = setup.moveLim - w; app.clock.movesLeft.b = setup.moveLim - b; }
    app.clock.lastTick = Date.now();
    render();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    try { return Promise.resolve(document.execCommand('copy')); } catch (e) { return Promise.resolve(false); }
  }

  /* ========================================================
     ИСТОРИЯ ПАРТИЙ («Посмотреть»)
     ======================================================== */
  const HIST_KEY = 'chessHistory';
  function loadHist() { try { const a = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveHist(a) { try { localStorage.setItem(HIST_KEY, JSON.stringify(a.slice(-300))); } catch (e) { } }

  // Записать итог партии с точки зрения игрока
  function recordResult(winnerColor) {
    let myC = null;
    if (app.mode === 'bot') myC = app.myColor;
    else if (app.mode === 'friend' && app.online.on) myC = app.online.myColor;
    const rec = { mode: app.mode, t: Date.now() };
    if (myC) rec.r = winnerColor == null ? 'draw' : (winnerColor === myC ? 'win' : 'loss');
    else if (winnerColor == null) rec.r = 'draw';
    else { rec.r = 'side'; rec.w = winnerColor; }
    const a = loadHist(); a.push(rec); saveHist(a);
  }

  function modeLabel(m) { return m === 'bot' ? 'С ботом' : m === 'friend' ? 'С другом' : 'Рядом'; }

  function openHistory() {
    const a = loadHist();
    let win = 0, loss = 0, draw = 0;
    for (const r of a) { if (r.r === 'win') win++; else if (r.r === 'loss') loss++; else if (r.r === 'draw') draw++; }
    $('histSummary').innerHTML =
      `<span class="hs-win">🏆 Побед: ${win}</span><span class="hs-loss">❌ Поражений: ${loss}</span><span class="hs-draw">🤝 Ничьих: ${draw}</span>`;
    let html = '';
    for (let i = a.length - 1; i >= 0; i--) {
      const r = a[i];
      let cls, main;
      if (r.r === 'win') { cls = 'win'; main = 'Выиграл'; }
      else if (r.r === 'loss') { cls = 'loss'; main = 'Проиграл'; }
      else if (r.r === 'side') { cls = 'side'; main = (r.w === 'w' ? 'Белые' : 'Чёрные') + ' победили'; }
      else { cls = 'draw'; main = 'Ничья'; }
      html += `<div class="ch-hist-item ${cls}"><span class="hi-main">${main}</span><span class="hi-sub">${modeLabel(r.mode)}</span></div>`;
    }
    $('histList').innerHTML = html || '<div class="ch-hist-empty">Пока нет сыгранных партий</div>';
    $('histModal').hidden = false;
  }

  function bindHistory() {
    $('viewBtn').addEventListener('click', openHistory);
    $('btnViewOver').addEventListener('click', openHistory);
    $('histClose').addEventListener('click', () => { $('histModal').hidden = true; });
    $('histClear').addEventListener('click', () => { if (confirm('Очистить историю партий?')) { saveHist([]); openHistory(); } });
    $('achBtn').addEventListener('click', openAch);
    $('achClose').addEventListener('click', () => { $('achModal').hidden = true; });
  }

  /* ========================================================
     ДОСТИЖЕНИЯ (статистика игрока)
     ======================================================== */
  const STATS_KEY = 'chessStats';
  function hasYou() { return app.mode === 'bot' || (app.mode === 'friend' && app.online.on); }
  function myStatColor() { return app.mode === 'bot' ? app.myColor : (app.mode === 'friend' && app.online.on ? app.online.myColor : null); }
  function resetGameStats() { app.gs = { checks: 0, start: Date.now(), lastCapType: null, lastFrom: -1, lastTo: -1 }; }

  function ensureStats() {
    let s; try { s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch (e) { s = {}; }
    const def = { games: 0, wins: 0, losses: 0, draws: 0, checkmatesBy: 0, resigns: 0, promotions: 0, captures: 0, pawnsCaptured: 0, queensCaptured: 0, queensLost: 0, blackGames: 0, wonHardBot: false, maxChecksInGame: 0, forks: 0, escapes: 0, knightThenPawn: 0, fastMate: false, hourGame: false, repeats: 0 };
    for (const k in def) if (!(k in s)) s[k] = def[k];
    return s;
  }
  function saveStats(s) { try { localStorage.setItem(STATS_KEY, JSON.stringify(s)); } catch (e) { } }

  // Учёт МОЕГО хода (m — ход, me — мой цвет, capType — кого съел, fromAttacked — была ли фигура под боем до хода)
  function trackMyMove(m, me, capType, fromAttacked) {
    const enemy = me === 'w' ? 'b' : 'w';
    // вилка: сходившая фигура атакует ≥2 фигур соперника
    let fc = 0;
    for (const t of C.attacksFrom(app.state.board, m.to)) { const q = app.state.board[t]; if (q && C.colorOf(q) === enemy) fc++; }
    const gaveCheck = C.inCheck(app.state, app.state.turn);
    const escaped = fromAttacked && !C.isAttacked(app.state.board, m.to, enemy);
    const backForth = app.gs && app.gs.lastFrom === m.to && app.gs.lastTo === m.from;
    const knightThenPawn = capType === 'p' && app.gs && app.gs.lastCapType === 'n';
    bumpStats(s => {
      if (capType) {
        s.captures++;
        if (capType === 'p') s.pawnsCaptured++;
        if (capType === 'q') s.queensCaptured++;
        if (knightThenPawn) s.knightThenPawn++;
      }
      if (m.promo) s.promotions++;
      if (gaveCheck && app.gs) { app.gs.checks++; if (app.gs.checks > s.maxChecksInGame) s.maxChecksInGame = app.gs.checks; }
      if (fc >= 2) s.forks++;
      if (escaped) s.escapes++;
      if (backForth) s.repeats++;
    });
    if (app.gs) { app.gs.lastFrom = m.from; app.gs.lastTo = m.to; if (capType) app.gs.lastCapType = capType; }
  }

  function trackGameEnd(res, winnerColor) {
    if (!hasYou()) return;
    const myC = myStatColor();
    const fast = res.type === 'checkmate' && winnerColor === myC && app.history.length <= 20;
    const hour = app.gs && app.gs.start && (Date.now() - app.gs.start) >= 3600000;
    bumpStats(s => {
      s.games++;
      if (myC === 'b') s.blackGames++;
      if (winnerColor == null) s.draws++;
      else if (winnerColor === myC) s.wins++; else s.losses++;
      if (res.type === 'checkmate' && winnerColor === myC) { s.checkmatesBy++; if (fast) s.fastMate = true; }
      if (res.type === 'resign' && res.loser === myC) s.resigns++;
      if (app.mode === 'bot' && app.level === 3 && winnerColor === myC) s.wonHardBot = true;
      if (hour) s.hourGame = true;
    });
  }

  // Каждое достижение: ico — значок, goal — цель, cur(s) — прогресс, secret — секретное
  const ACHIEVEMENTS = [
    { t: 'Шахматист', d: 'Поставь 15 шахов в одной партии', ico: '⚔️', goal: 15, cur: s => s.maxChecksInGame },
    { t: 'Вилка', d: 'Сделай вилку 3 раза', ico: '🍴', goal: 3, cur: s => s.forks },
    { t: 'Выиграл ИИ', d: 'Выиграй со сложным ботом', ico: '🤖', goal: 1, cur: s => s.wonHardBot ? 1 : 0 },
    { t: 'Любитель шахмат', d: 'Сыграй 100 и более партий', ico: '♟️', goal: 100, cur: s => s.games },
    { t: 'Можно без матов?', d: 'Поставь 100 и более матов', ico: '👑', goal: 100, cur: s => s.checkmatesBy },
    { t: 'Мгновенный мат', d: 'Поставь мат за 10 ходов', ico: '⚡', goal: 1, cur: s => s.fastMate ? 1 : 0 },
    { t: 'Убит ферзь', d: 'Съешь у соперника 5 ферзей', ico: '👸', goal: 5, cur: s => s.queensCaptured },
    { t: 'Мафия', d: 'Съешь у соперника 50 фигур', ico: '🕵️', goal: 50, cur: s => s.captures },
    { t: 'Казнить!', d: 'Съешь 20 пешек', ico: '🪓', goal: 20, cur: s => s.pawnsCaptured },
    { t: 'Туда-сюда', d: 'Повтори ход 3 раза', ico: '🔄', goal: 3, cur: s => s.repeats },
    // секретные
    { t: 'Превращение', d: 'Преврати пешку 5 раз', ico: '✨', goal: 5, cur: s => s.promotions, secret: true },
    { t: 'Убит всадник', d: 'Съешь коня и пешку подряд', ico: '🐴', goal: 1, cur: s => Math.min(s.knightThenPawn, 1), secret: true },
    { t: 'Большой брат', d: 'Уйди от преследования фигуры', ico: '👁️', goal: 1, cur: s => Math.min(s.escapes, 1), secret: true },
    { t: 'За чёрных', d: 'Сыграй за чёрных 10 партий', ico: '⚫', goal: 10, cur: s => s.blackGames, secret: true },
    { t: 'Ай, зевнул!', d: 'Потеряй 3 своих ферзей', ico: '🥱', goal: 3, cur: s => s.queensLost, secret: true },
    { t: 'Не спи!', d: 'Сыграй партию целый час', ico: '⏰', goal: 1, cur: s => s.hourGame ? 1 : 0, secret: true },
    { t: 'Братство', d: 'Сдайся 3 раза', ico: '🏳️', goal: 3, cur: s => s.resigns, secret: true },
    { t: 'Равенство', d: 'Сыграй вничью 5 раз', ico: '🤝', goal: 5, cur: s => s.draws, secret: true }
  ];

  function achCard(a, s) {
    const cur = a.cur(s), ok = cur >= a.goal;
    const locked = a.secret && !ok;
    const ico = locked ? '❓' : a.ico;
    const desc = locked ? '?' : a.d;
    const prog = locked ? '?' : (Math.min(cur, a.goal) + '/' + a.goal);
    return `<div class="ch-ach-item ${ok ? 'done' : ''}"><span class="ach-ico">${ico}</span><div class="ach-txt"><span class="ach-t">${ok ? '✅ ' : '🔒 '}${a.t}</span><span class="ach-d">${desc}</span></div><span class="ach-prog">${prog}</span></div>`;
  }

  function openAch() {
    const s = ensureStats();
    let done = 0;
    const normal = [], secret = [];
    for (const a of ACHIEVEMENTS) {
      if (a.cur(s) >= a.goal) done++;
      (a.secret ? secret : normal).push(a);
    }
    let html = '<div class="ch-ach-head">Обычные</div>' + normal.map(a => achCard(a, s)).join('');
    html += '<div class="ch-ach-head">Секретные</div>' + secret.map(a => achCard(a, s)).join('');
    $('achCount').textContent = `Выполнено: ${done} из ${ACHIEVEMENTS.length}`;
    $('achList').innerHTML = html;
    $('achModal').hidden = false;
  }

  // Обновить статистику и показать всплывашки по продвинувшимся достижениям
  function bumpStats(fn) {
    const s = ensureStats();
    const before = ACHIEVEMENTS.map(a => a.cur(s));
    fn(s);
    saveStats(s);
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const a = ACHIEVEMENTS[i], now = a.cur(s);
      if (now <= before[i]) continue;
      const justDone = before[i] < a.goal && now >= a.goal;
      if (a.secret && !justDone) continue; // секретные не спойлим до получения
      showAchToast(a, now, justDone);
    }
  }

  let achToastWrap = null;
  function showAchToast(a, cur, justDone) {
    if (!achToastWrap) { achToastWrap = document.createElement('div'); achToastWrap.className = 'ch-toastwrap'; document.body.appendChild(achToastWrap); }
    const el = document.createElement('div');
    el.className = 'ch-atoast' + (justDone ? ' done' : '');
    el.innerHTML = `<span class="at-ico">${justDone ? '🏆' : '📈'}</span><span class="at-body"><span class="at-t">${a.t}${justDone ? ' — получено!' : ''}</span><span class="at-p">${Math.min(cur, a.goal)}/${a.goal}</span></span>`;
    achToastWrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, justDone ? 2600 : 1900);
  }

})();
