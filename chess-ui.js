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
    soundOn: true,
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
        <button class="ch-sound" id="soundBtn" title="Звук вкл/выкл">🔊</button>
        <button class="ch-sw" data-theme="green" title="Зелёная доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
        <button class="ch-sw" data-theme="classic" title="Чёрно-белая доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
        <button class="ch-sw" data-theme="brown" title="Коричневая доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
      </div>

      <section id="setupScreen" class="ch-screen">
        <div class="ch-hero">
          <div class="ch-rank" id="rankBadge"></div>
          <h2>Шахматы</h2>
          <p class="ch-rank-info" id="rankInfo"></p>
          <button id="ranksBtn" class="ch-rank-btn">🏅 Посмотреть все ранги</button>
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
        <button id="tutBtn" class="ch-view">📚 Обучение</button>
      </section>

      <section id="tutorScreen" class="ch-screen" hidden>
        <div class="ch-tutor-head">
          <button class="ch-btn" id="tutBack">← Назад</button>
          <h2 id="tutTitle">📚 Обучение</h2>
        </div>
        <div id="tutMenu">
          <button class="ch-start" id="tutReview">🔁 Повторение всех тем</button>
          <div id="tutSections"></div>
        </div>
        <div id="tutLesson" hidden>
          <div class="ch-tutor-explain" id="tutExplain"></div>
          <div class="ch-board-wrap"><div class="ch-board" id="tutBoard"></div></div>
          <div class="ch-tutor-prompt" id="tutPrompt"></div>
          <div class="ch-tutor-actions" id="tutActions"></div>
        </div>
      </section>
      <div id="tutFlash"></div>

      <section id="gameScreen" class="ch-screen" hidden>
        <div class="ch-fliparea" id="flipArea">
        <div class="ch-status" id="chStatus">—</div>
        <div class="ch-gametime" id="gameTime">⏱ 0:00</div>

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
        </div><!-- /flipArea -->
        <div class="ch-history-box">
          <div class="ch-history-title">Ходы</div>
          <div class="ch-history" id="chHistory"></div>
        </div>

        <div class="ch-chat" id="chatBox" hidden>
          <div class="ch-chat-title">💬 Чат с другом</div>
          <div class="ch-chat-list" id="chatList"></div>
          <div class="ch-chat-row">
            <input id="chatInput" class="ch-chat-input" type="text" maxlength="300" placeholder="Написать другу…" autocomplete="off" />
            <button id="chatSend" class="ch-btn ch-btn-primary">➤</button>
          </div>
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
            <button class="ch-btn" id="btnViewOver">☰ В меню</button>
          </div>
        </div>
      </div>

      <div id="rematchModal" class="ch-modal" hidden>
        <div class="ch-modal-box">
          <div class="ch-modal-title">🔁 Соперник зовёт на реванш</div>
          <p class="ch-modal-text">Соперник хочет сыграть ещё одну партию с теми же настройками. Согласиться?</p>
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnRematchYes">✅ Играть</button>
            <button class="ch-btn ch-btn-warn" id="btnRematchNo">❌ Нет</button>
          </div>
        </div>
      </div>

      <div id="undoModal" class="ch-modal" hidden>
        <div class="ch-modal-box">
          <div class="ch-modal-title">↶ Соперник просит отмену</div>
          <p class="ch-modal-text">Соперник хочет отменить последний ход. Разрешить?</p>
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnUndoAllow">✅ Разрешить</button>
            <button class="ch-btn ch-btn-warn" id="btnUndoDeny">❌ Не разрешать</button>
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

      <div id="ranksModal" class="ch-modal" hidden>
        <div class="ch-modal-box ch-ranks-box">
          <div class="ch-modal-title">🏅 Ранги</div>
          <div class="ch-ranks-list" id="ranksList"></div>
          <div class="ch-modal-actions"><button class="ch-btn ch-btn-primary" id="ranksClose">Закрыть</button></div>
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
    app.soundOn = localStorage.getItem('chessSound') !== 'off';
    $('soundBtn').textContent = app.soundOn ? '🔊' : '🔇';
    $('soundBtn').addEventListener('click', () => {
      app.soundOn = !app.soundOn;
      localStorage.setItem('chessSound', app.soundOn ? 'on' : 'off');
      $('soundBtn').textContent = app.soundOn ? '🔊' : '🔇';
      if (app.soundOn) playMoveSound(false); // короткий пример
    });
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
    $('tutorScreen').hidden = true;
    updateSetupVisibility();
    renderRank();
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

    if (app.mode === 'local') { app.myColor = null; app.orientation = 'w'; initClock(); enterGameScreen(); return; }

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
    $('chatBox').hidden = !onl;
    if (onl) $('chatList').innerHTML = '';
    $('btnFlip').style.display = onl ? 'none' : '';
    $('btnUndo').style.display = (app.mode === 'friend' && !onl) ? 'none' : '';
    $('btnResign').style.display = (app.mode === 'friend' && !onl) ? 'none' : '';
    resetUndoBtn();
    resetRematchBtn();
    render();
    updateGameTime();
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
      onOpen: () => { o.connected = true; o.failed = false; o.myId = o.net.id; netSend({ t: 'hi', s: o.myId, c: o.myColor }); startPresence(); setOnlineStatus(); },
      onReconnect: () => { o.connected = false; setOnlineStatus(); },
      onClose: () => { o.connected = false; setOnlineStatus(); },
      onFail: () => { o.failed = true; setOnlineStatus(); },
      onMessage: handleNetMsg
    });
    if (!o.net) { o.failed = true; setOnlineStatus(); }
  }

  function netSend(obj) { if (app.online.net) app.online.net.publish(obj); }

  function closeOnline() {
    if (app.online && app.online.on) { try { netSend({ t: 'bye', s: app.online.myId }); } catch (e) { } }
    clearPresence();
    if (app.online && app.online.net) { try { app.online.net.close(); } catch (e) { } }
    app.online = { on: false, role: null, room: null, myColor: 'w', hostColor: 'w', myId: null, net: null, connected: false, peerReady: false, failed: false };
  }

  function handleNetMsg(o) {
    const me = app.online;
    if (!me.on) return;
    if (o.s && o.s === me.myId) return; // свои сообщения игнорируем
    me.lastSeen = Date.now();
    // соперник вышел (закрыл вкладку)
    if (o.t === 'bye') { me.peerReady = false; setOnlineStatus(); return; }
    const wasReady = me.peerReady;
    me.peerReady = true; // любое сообщение = соперник на связи
    if (o.t === 'ping') { if (!wasReady) setOnlineStatus(); return; }
    if (o.t === 'hi') {
      setOnlineStatus();
      if (me.role === 'host') sendSync();
    } else if (o.t === 'sync') {
      applySync(o); setOnlineStatus();
    } else if (o.t === 'mv') {
      applyRemoteMove(o); if (!wasReady) setOnlineStatus();
    } else if (o.t === 'end') {
      if (o.kind === 'resign') finishGame({ type: 'resign', loser: o.loser });
      else if (o.kind === 'time') finishGame({ type: 'time', loser: o.loser });
    } else if (o.t === 'chat') {
      addChatMsg('them', o.text); playChatSound();
      if (!wasReady) setOnlineStatus();
    } else if (o.t === 'undoReq') {
      onUndoRequested();
    } else if (o.t === 'undoOk') {
      onUndoAnswer(true);
    } else if (o.t === 'undoNo') {
      onUndoAnswer(false);
    } else if (o.t === 'rematchReq') {
      onRematchRequested();
    } else if (o.t === 'rematchOk') {
      onRematchAnswer(true);
    } else if (o.t === 'rematchNo') {
      onRematchAnswer(false);
    }
  }

  /* ---- Присутствие соперника: «пинги» + сторож ---- */
  function startPresence() {
    const o = app.online; clearPresence();
    o.lastSeen = Date.now();
    o.hbTimer = setInterval(() => { if (app.online.on) netSend({ t: 'ping', s: app.online.myId }); }, 3000);
    o.wdTimer = setInterval(() => {
      const a = app.online;
      if (a.on && a.peerReady && Date.now() - (a.lastSeen || 0) > 8000) { a.peerReady = false; setOnlineStatus(); }
    }, 2000);
  }
  function clearPresence() {
    const o = app.online; if (!o) return;
    if (o.hbTimer) { clearInterval(o.hbTimer); o.hbTimer = null; }
    if (o.wdTimer) { clearInterval(o.wdTimer); o.wdTimer = null; }
  }

  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function addChatMsg(who, text) {
    text = String(text || '').slice(0, 300);
    if (!text.trim()) return;
    const list = $('chatList');
    const el = document.createElement('div');
    el.className = 'ch-cmsg ' + (who === 'me' ? 'me' : 'them');
    el.innerHTML = escHtml(text);
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
  }
  function sendChat() {
    const inp = $('chatInput');
    const text = inp.value.trim();
    if (!text || !app.online.on) return;
    netSend({ t: 'chat', s: app.online.myId, text: text.slice(0, 300) });
    addChatMsg('me', text);
    inp.value = '';
    inp.focus();
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
    playMoveSound(!!capType);
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
    else if (!o.peerReady) { st.textContent = '🔴 Соперника нет'; st.classList.add('bad'); fb.hidden = true; }
    else { st.textContent = '🟢 Соперник есть'; st.classList.add('ok'); fb.hidden = true; }
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
  function closeOnlineKeepMode() { clearPresence(); if (app.online.net) { try { netSend({ t: 'bye', s: app.online.myId }); } catch (e) { } try { app.online.net.close(); } catch (e) { } app.online.net = null; } }

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
  function render() { renderBoard(); renderStatus(); renderHistory(); renderPlayerBars(); applyScreenFlip(); }

  // «Играть рядом»: игроки сидят по разные стороны телефона лицом друг к другу.
  // На ходу чёрных поворачиваем на 180° сами фигуры (лицом к тому, чей ход),
  // а доску и надписи оставляем на месте.
  function applyScreenFlip() {
    const fa = $('flipArea'); if (!fa) return;
    const flip = app.mode === 'local' && !app.over && app.state && app.state.turn === 'b';
    fa.classList.toggle('flip180', !!flip);
    app.screenFlipped = !!flip;
  }
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
      updateGameTime();
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
  // длительность партии (сколько всего шла): Ч:ММ:СС либо М:СС
  function fmtDur(ms) {
    if (!ms || ms < 0) ms = 0;
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
    const ss = (s < 10 ? '0' : '') + s;
    if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + ss;
    return m + ':' + ss;
  }
  // Таймер общей длительности партии (идёт всегда, независимо от лимита времени)
  function updateGameTime() {
    const gt = $('gameTime'); if (!gt) return;
    if ($('gameScreen').hidden || !app.gs || !app.gs.start) return;
    const ms = app.over ? (app.gameDurMs || 0) : (Date.now() - app.gs.start);
    gt.textContent = (app.over ? '⏱ Партия длилась: ' : '⏱ Идёт: ') + fmtDur(ms);
  }
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
    // касание доски убирает фокус с поля чата (иначе экран «прилипает» к чату)
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) ae.blur();
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
    window.addEventListener('pointerdown', unlockAudio, { once: true });
  }

  /* ---- Звук хода (синтез через Web Audio, без файлов) ---- */
  let audioCtx = null;
  function getAudio() {
    if (audioCtx) return audioCtx;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    return audioCtx;
  }
  function unlockAudio() { const c = getAudio(); if (c && c.state === 'suspended') c.resume(); }

  // короткая шумовая «вспышка» через фильтр
  function noiseBurst(ctx, start, dur, filtType, cutoff, gain) {
    const n = Math.max(1, Math.ceil(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = filtType; f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(start);
  }

  // низкий тон-«удар»
  function thump(ctx, start, f0, f1, gain, dur, type) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(f1, start + dur * 0.7);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(start); osc.stop(start + dur + 0.02);
  }

  // «дзинь-дзинь» при новом сообщении в чате
  function playChatSound() {
    if (!app.soundOn) return;
    const ctx = getAudio(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const note = (freq, start, dur) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(start); o.stop(start + dur + 0.02);
    };
    note(660, t, 0.12);
    note(880, t + 0.09, 0.16);
  }

  function playMoveSound(capture) {
    if (!app.soundOn) return;
    const ctx = getAudio(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    if (capture) {
      // ВЗЯТИЕ: резкий «хруст/удар» с двойным щелчком
      thump(ctx, t, 320, 80, 0.5, 0.14, 'sawtooth');
      noiseBurst(ctx, t, 0.06, 'highpass', 900, 0.4);   // хруст
      noiseBurst(ctx, t + 0.045, 0.04, 'bandpass', 2000, 0.3); // второй щелчок
    } else {
      // ХОД: мягкий деревянный «стук»
      thump(ctx, t, 190, 85, 0.4, 0.12, 'triangle');
      noiseBurst(ctx, t, 0.03, 'lowpass', 1700, 0.22);
    }
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
    // если экран повёрнут на 180° (режим «Рядом», ход чёрных) — крутим и «призрак»
    const rot = app.screenFlipped ? ' rotate(180deg)' : '';
    drag.ghost.style.transform = `translate(${x - half}px, ${y - half}px)${rot}`;
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
    playMoveSound(!!capType);
    if (hasYou()) trackMyMove(m, me, capType, fromAttacked);
    if (app.mode === 'friend' && app.online.on) publishMove();
    // «Играть рядом»: доску НЕ переворачиваем. Игроки сидят по разные стороны
    // телефона лицом друг к другу — чёрные фигуры и так наверху, рядом со вторым
    // игроком, и для него они выглядят правильно (он смотрит с другой стороны).
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
      playMoveSound(!!capType);
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
    app.gameDurMs = (app.gs && app.gs.start) ? (Date.now() - app.gs.start) : 0;
    recordResult(winnerColor);
    countGame();
    trackGameEnd(res, winnerColor);
    app.overText = ico + ' ' + title + ' — ' + text;
    updateGameTime();
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
    $('btnUndo').addEventListener('click', () => { if (app.online && app.online.on) requestUndo(); else undoLast(); });
    $('btnUndoAllow').addEventListener('click', () => answerUndo(true));
    $('btnUndoDeny').addEventListener('click', () => answerUndo(false));
    $('btnResign').addEventListener('click', () => {
      if (app.over) return;
      if (!confirm('Сдаться?')) return;
      const loser = app.online.on ? app.online.myColor : (app.mode === 'bot' ? app.myColor : app.state.turn);
      if (app.online.on) netSend({ t: 'end', s: app.online.myId, kind: 'resign', loser });
      finishGame({ type: 'resign', loser });
    });
    $('btnNewGame').addEventListener('click', () => {
      if (app.online && app.online.on) { requestRematch(); return; }
      $('overModal').hidden = true; location.hash = ''; startGame();
    });
    $('btnRematchYes').addEventListener('click', () => answerRematch(true));
    $('btnRematchNo').addEventListener('click', () => answerRematch(false));
    $('btnCopy').addEventListener('click', () => { const inp = $('shareLink'); inp.select(); copyText(inp.value).then(ok => { $('copyHint').textContent = ok ? '✓ Ссылка скопирована' : 'Скопируйте вручную (выделено выше)'; }); });
    $('btnShareEdit').addEventListener('click', () => { $('shareModal').hidden = true; app.pendingShare = false; undoLast(true); });
    $('btnOnlineCopy').addEventListener('click', () => { const inp = $('onlineLink'); inp.select(); copyText(inp.value).then(ok => { $('btnOnlineCopy').textContent = ok ? '✓ Скопировано — отправьте другу' : '📋 Выделено — скопируйте вручную'; }); });
    $('btnFallback').addEventListener('click', () => switchToCorrespondence());
    $('chatSend').addEventListener('click', sendChat);
    $('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendChat(); } });
    window.addEventListener('beforeunload', () => { if (app.online && app.online.on && app.online.net) { try { app.online.net.publish({ t: 'bye', s: app.online.myId }); } catch (e) { } } });
  }

  function undoLast(single) {
    if (app.history.length === 0 || app.over || app.online.on) return;
    const back = (app.mode === 'bot' && !single) ? 2 : 1;
    const moves = app.history.slice(0, Math.max(0, app.history.length - back));
    rebuildFrom(moves);
    app.over = false; app.pendingShare = false;
    if (app.clock.movesOn) { let w = 0, b = 0; for (let i = 0; i < app.history.length; i++)(i % 2 === 0 ? w++ : b++); app.clock.movesLeft.w = setup.moveLim - w; app.clock.movesLeft.b = setup.moveLim - b; }
    app.clock.lastTick = Date.now();
    bumpStats(s => { s.undos++; });
    render();
  }

  /* ---- Отмена хода в игре с другом (через разрешение соперника) ---- */
  // Я прошу отменить последний ход — отправляю запрос сопернику.
  function requestUndo() {
    const o = app.online;
    if (!o.on || app.over || app.history.length === 0) return;
    if (o.undoPending) return;
    o.undoPending = true;
    netSend({ t: 'undoReq', s: o.myId });
    const b = $('btnUndo'); if (b) { b.disabled = true; b.textContent = '⏳ Ждём…'; }
    o.undoTimer = setTimeout(() => { if (app.online && app.online.undoPending) { resetUndoBtn(); showInfoToast('⌛', 'Соперник не ответил', false); } }, 20000);
  }
  function resetUndoBtn() {
    if (app.online) { app.online.undoPending = false; if (app.online.undoTimer) { clearTimeout(app.online.undoTimer); app.online.undoTimer = null; } }
    const b = $('btnUndo'); if (b) { b.disabled = false; b.textContent = '↶ Отменить'; }
  }
  // Соперник прислал ответ на мой запрос
  function onUndoAnswer(allowed) {
    resetUndoBtn();
    if (allowed) { performUndoOnline(); showInfoToast('✅', 'Соперник разрешил отмену', true); }
    else { showInfoToast('❌', 'Соперник не разрешил отмену', false); }
  }
  // Мне пришёл запрос на отмену — показываю окошко «Разрешить / Не разрешать»
  function onUndoRequested() {
    if (app.over || app.history.length === 0) { netSend({ t: 'undoNo', s: app.online.myId }); return; }
    $('undoModal').hidden = false;
  }
  function answerUndo(allow) {
    $('undoModal').hidden = true;
    if (!app.online.on) return;
    if (allow) { netSend({ t: 'undoOk', s: app.online.myId }); performUndoOnline(); }
    else { netSend({ t: 'undoNo', s: app.online.myId }); }
  }
  // Откат последнего хода на обеих сторонах
  function performUndoOnline() {
    if (app.history.length === 0) return;
    const moves = app.history.slice(0, app.history.length - 1);
    rebuildFrom(moves);
    app.over = false;
    if (app.clock.movesOn) { let w = 0, b = 0; for (let i = 0; i < app.history.length; i++)(i % 2 === 0 ? w++ : b++); app.clock.movesLeft.w = setup.moveLim - w; app.clock.movesLeft.b = setup.moveLim - b; }
    app.clock.lastTick = Date.now();
    bumpStats(s => { s.undos++; });
    render();
  }
  /* ---- Реванш (новая партия с тем же соперником) ---- */
  function requestRematch() {
    const o = app.online;
    if (!o.on || o.rematchPending) return;
    if (!o.peerReady) { showInfoToast('⌛', 'Соперника нет в сети', false); return; }
    o.rematchPending = true;
    netSend({ t: 'rematchReq', s: o.myId });
    const b = $('btnNewGame'); if (b) { b.disabled = true; b.textContent = '⏳ Ждём соперника…'; }
    o.rematchTimer = setTimeout(() => { if (app.online && app.online.rematchPending) { resetRematchBtn(); showInfoToast('⌛', 'Соперник не ответил', false); } }, 25000);
  }
  function resetRematchBtn() {
    if (app.online) { app.online.rematchPending = false; if (app.online.rematchTimer) { clearTimeout(app.online.rematchTimer); app.online.rematchTimer = null; } }
    const b = $('btnNewGame'); if (b) { b.disabled = false; b.textContent = 'Новая партия'; }
  }
  function onRematchRequested() {
    if (!app.online.on) return;
    $('rematchModal').hidden = false;
  }
  function answerRematch(allow) {
    $('rematchModal').hidden = true;
    if (!app.online.on) return;
    if (allow) { netSend({ t: 'rematchOk', s: app.online.myId }); $('overModal').hidden = true; startRematch(); }
    else { netSend({ t: 'rematchNo', s: app.online.myId }); }
  }
  function onRematchAnswer(allowed) {
    resetRematchBtn();
    if (allowed) { $('overModal').hidden = true; startRematch(); }
    else { showInfoToast('❌', 'Соперник отказался от новой партии', false); }
  }
  // Новая партия с тем же соперником и настройками — соединение не рвём
  function startRematch() {
    const o = app.online;
    resetGame();
    resetGameStats();
    app.myColor = o.myColor; app.orientation = o.myColor;
    setup.timeMin = o.timeMin || 0; setup.moveLim = o.moveLim || 0;
    initClock();
    enterGameScreen();
    setOnlineStatus();
  }

  function showInfoToast(ico, text, ok) {
    if (!achToastWrap) { achToastWrap = document.createElement('div'); achToastWrap.className = 'ch-toastwrap'; document.body.appendChild(achToastWrap); }
    const el = document.createElement('div');
    el.className = 'ch-atoast' + (ok ? ' done' : '');
    el.innerHTML = `<span class="at-ico">${ico}</span><span class="at-body"><span class="at-t">${text}</span></span>`;
    achToastWrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 2400);
  }

  /* ========================================================
     ОБУЧЕНИЕ (интерактивные уроки)
     ======================================================== */
  function playGoodSound() {
    if (!app.soundOn) return; const ctx = getAudio(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const note = (f, s, d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.3, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + d); o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + d + 0.02); };
    note(523, t, 0.12); note(659, t + 0.1, 0.12); note(784, t + 0.2, 0.2);
  }
  function playBadSound() {
    if (!app.soundOn) return; const ctx = getAudio(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime; thump(ctx, t, 200, 80, 0.32, 0.28, 'sawtooth'); noiseBurst(ctx, t, 0.14, 'lowpass', 480, 0.14);
  }

  // Разделы и уроки. steps: массив задач-позиций; info:true — тема «для понимания».
  const TUT_SECTIONS = [
  {
    name: 'Движение фигур', lessons: [
      { id: 'm-pawn', title: 'Пешка', icon: '♟', explain: 'Пешка ходит только вперёд: на 1 клетку, а с начального места — сразу на 2. Ест по-другому — по диагонали на 1 клетку вперёд.', steps: [
        { board: ['e2 wp', 'a1 wk', 'h8 bk'], turn: 'w', prompt: 'Сходи пешкой вперёд.', hint: 'С начального места пешка может пойти на 2 клетки — на e4.', answers: ['e2e4'] },
        { board: ['d4 wp', 'e5 bp', 'a1 wk', 'h8 bk'], turn: 'w', prompt: 'Съешь чёрную фигуру.', hint: 'Пешка бьёт по диагонали: d4 берёт e5.', answers: ['d4e5'] },
        { board: ['d4 wp', 'a1 wr', 'h1 wb', 'c5 bp', 'e1 wk', 'h8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку — но какой фигурой?', hint: 'По диагонали её берёт только пешка: d4 на c5.', answers: ['d4c5'] } ] },
      { id: 'm-knight', title: 'Конь', icon: '♞', explain: 'Конь ходит буквой «Г»: две клетки прямо и одну вбок. Он единственный, кто перепрыгивает через другие фигуры! Ест туда же, куда ходит.', steps: [
        { board: ['e4 wn', 'a1 wk', 'h8 bk'], turn: 'w', prompt: 'Сходи конём буквой «Г».', hint: 'Например на f6: две клетки вперёд и одну вбок.', answers: ['e4f6'] },
        { board: ['e4 wn', 'f6 bp', 'a1 wk', 'a8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку.', hint: 'Конь ест туда же, куда ходит: e4 на f6.', answers: ['e4f6'] },
        { board: ['e4 wn', 'a1 wb', 'h1 wr', 'g5 bp', 'e1 wk', 'a8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку — но какой фигурой?', hint: 'Буквой «Г» до неё дойдёт только конь: e4 на g5.', answers: ['e4g5'] } ] },
      { id: 'm-bishop', title: 'Слон', icon: '♝', explain: 'Слон ходит по диагоналям на любое число клеток. Ест туда же. Каждый слон всю партию ходит по клеткам одного цвета.', steps: [
        { board: ['c1 wb', 'a1 wk', 'h8 bk'], turn: 'w', prompt: 'Сходи слоном по диагонали.', hint: 'Например на h6.', answers: ['c1h6'] },
        { board: ['c1 wb', 'g5 bp', 'a1 wk', 'a8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку.', hint: 'Слон бьёт по диагонали: c1 на g5.', answers: ['c1g5'] },
        { board: ['f1 wb', 'h1 wn', 'g2 wp', 'a6 bp', 'e1 wk', 'h8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку — но какой фигурой?', hint: 'По диагонали её достанет слон: f1 на a6.', answers: ['f1a6'] } ] },
      { id: 'm-rook', title: 'Ладья', icon: '♜', explain: 'Ладья ходит по прямым — по вертикали и горизонтали — на любое число клеток. Ест туда же.', steps: [
        { board: ['a1 wr', 'h1 wk', 'h8 bk'], turn: 'w', prompt: 'Сходи ладьёй по прямой.', hint: 'Например на a8.', answers: ['a1a8'] },
        { board: ['a1 wr', 'a6 bp', 'h1 wk', 'h8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку.', hint: 'Ладья бьёт по прямой: a1 на a6.', answers: ['a1a6'] },
        { board: ['h1 wr', 'a1 wb', 'b1 wn', 'h6 bp', 'e1 wk', 'a8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку — но какой фигурой?', hint: 'По вертикали её возьмёт ладья: h1 на h6.', answers: ['h1h6'] } ] },
      { id: 'm-queen', title: 'Ферзь', icon: '♛', explain: 'Ферзь — самая сильная фигура: ходит и как ладья, и как слон (прямо и по диагонали) на любое число клеток.', steps: [
        { board: ['d1 wq', 'h1 wk', 'h8 bk'], turn: 'w', prompt: 'Сходи ферзём.', hint: 'Ферзь ходит куда хочет — например на d7.', answers: ['d1d7'] },
        { board: ['d1 wq', 'd5 bp', 'h1 wk', 'b8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку.', hint: 'Ферзь бьёт и прямо, и по диагонали: d1 на d5.', answers: ['d1d5'] },
        { board: ['d1 wq', 'a1 wr', 'c1 wb', 'd5 bp', 'e1 wk', 'b8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку — но какой фигурой?', hint: 'Прямо по вертикали её возьмёт ферзь: d1 на d5.', answers: ['d1d5'] } ] },
      { id: 'm-king', title: 'Король', icon: '♚', explain: 'Король ходит на 1 клетку в любую сторону. Короля нельзя ставить под бой, и его нельзя съесть — ему объявляют мат.', steps: [
        { board: ['e1 wk', 'e8 bk'], turn: 'w', prompt: 'Сходи королём.', hint: 'Король ходит на 1 клетку — например на e2.', answers: ['e1e2'] },
        { board: ['d5 wk', 'e5 bp', 'a1 bk'], turn: 'w', prompt: 'Съешь чёрную пешку.', hint: 'Король ест рядом с собой: d5 на e5.', answers: ['d5e5'] },
        { board: ['d5 wk', 'a1 wr', 'e5 bp', 'h8 bk'], turn: 'w', prompt: 'Съешь чёрную пешку — но какой фигурой?', hint: 'Рядом её съест король: d5 на e5.', answers: ['d5e5'] } ] }
    ]
  },
  {
    name: 'Правила и приёмы', lessons: [
      { id: 't-defend', title: 'Защита фигур', icon: '🛡️', explain: 'Если твою фигуру атакуют — её можно защитить: поставить рядом свою фигуру, которая «съест обратно», закрыться или увести. Здесь потренируемся защищать.', steps: [
        { board: ['e4 wr', 'a1 wr', 'e8 br', 'g1 wk', 'g8 bk'], turn: 'w', prompt: 'Твою ладью e4 атакуют. Защити её.', hint: 'Поставь вторую ладью на e1 — будет кому взять обратно: a1 на e1.', answers: ['a1e1'] },
        { board: ['d4 wn', 'e2 wp', 'd8 br', 'g1 wk', 'g8 bk'], turn: 'w', prompt: 'Твоего коня d4 атакуют. Защити его.', hint: 'Подопри коня пешкой: e2 на e3.', answers: ['e2e3'] },
        { board: ['a1 wr', 'c3 wn', 'a8 br', 'g1 wk', 'g8 bk'], turn: 'w', prompt: 'Твою ладью a1 атакуют по линии. Спрячься.', hint: 'Закройся конём между ними: c3 на a4.', answers: ['c3a4'] } ] },
      { id: 't-check', title: 'Шах', icon: '⚠️', explain: 'Шах — это нападение на короля. В ответ король должен спастись: уйти, закрыться другой фигурой или съесть нападающего.', steps: [
        { board: ['c4 wq', 'h8 bk', 'a1 wk'], turn: 'w', prompt: 'Объяви шах королю соперника.', hint: 'Ферзём на линию короля: c4 на c8 или на h4.', answers: ['c4c8', 'c4h4'], goal: 'check' },
        { board: ['d1 wq', 'b1 wn', 'h8 bk', 'a4 wk'], turn: 'w', prompt: 'Дай шах — но правильной фигурой.', hint: 'Только ферзь дотянется: d1 на h1 или на d8.', answers: ['d1h1', 'd1d8'], goal: 'check' },
        { board: ['g4 wn', 'c1 wb', 'g8 bk', 'a1 wk'], turn: 'w', prompt: 'Дай шах королю.', hint: 'Конём на h6 — он бьёт клетку рядом с королём: g4 на h6.', answers: ['g4h6'], goal: 'check' } ] },
      { id: 't-mate', title: 'Мат', icon: '👑', explain: 'Мат — это шах, от которого нет спасения: король не может ни уйти, ни закрыться, ни съесть. Это победа! Защита от мата на последней линии — заранее сделать «форточку» (ход крайней пешкой).', steps: [
        { board: ['a1 wr', 'g1 wk', 'g8 bk', 'f7 bp', 'g7 bp', 'h7 bp', 'h2 wp', 'b3 wb'], turn: 'w', prompt: 'Поставь мат в 1 ход.', hint: 'Ладью на 8-ю линию: a1 на a8. Свои пешки не дают королю убежать.', answers: ['a1a8'], goal: 'mate' },
        { board: ['g1 wq', 'f6 wk', 'h8 bk', 'a1 wr', 'b2 wp'], turn: 'w', prompt: 'Поставь мат в 1 ход.', hint: 'Ферзём на g7 — король f6 его защищает: g1 на g7.', answers: ['g1g7'], goal: 'mate' },
        { board: ['h8 bk', 'f7 wk', 'b1 wq'], turn: 'w', prompt: 'Поставь мат в 2 хода!', prompt2: 'Отлично! Теперь поставь мат вторым ходом!', hint: 'Сначала шах ферзём: b1 на b8.', hint2: 'Теперь мат ферзём: b8 на h2.', plies: [ { answers: ['b1b8'], reply: 'h8h7' }, { answers: ['b8h2'] } ], goal: 'mate' } ] },
      { id: 't-draw', title: 'Ничья', icon: '🤝', explain: 'Ничья — когда никто не выиграл. Бывает: по согласию, при вечном повторении позиции, когда не хватает фигур для мата (например, остались одни короли), по правилу 50 ходов, и при пате.', steps: [
        { board: ['d4 wk', 'e5 bp', 'a8 bk'], turn: 'w', prompt: 'Сделай ничью — оставь на доске только королей.', hint: 'Съешь последнюю чёрную пешку королём: d4 на e5. Два короля — ничья.', answers: ['d4e5'], goal: 'draw' } ] },
      { id: 't-stale', title: 'Пат', icon: '😐', explain: 'Пат — у соперника нет ни одного хода, но его королю НЕ шах. Это ничья! Имея большой перевес, будь аккуратен, чтобы случайно не запатовать.', steps: [
        { board: ['a8 bk', 'a6 wk', 'b1 wq'], turn: 'w', prompt: 'Поставь пат (ничья без шаха).', hint: 'Ферзём на b6 — королю некуда пойти, но шаха нет: b1 на b6.', answers: ['b1b6'], goal: 'stalemate' },
        { board: ['h8 bk', 'g6 wk', 'c1 wq'], turn: 'w', prompt: 'Поставь пат.', hint: 'Ферзём на c4 — король заперт, но без шаха: c1 на c4.', answers: ['c1c4'], goal: 'stalemate' } ] },
      { id: 't-develop', title: 'Развитие фигур', icon: '🚀', explain: 'Развитие — вывод фигур с начальных клеток в начале партии. Выводи коней и слонов к центру, борись за центр, потом рокируйся. Не ходи одной фигурой много раз.', steps: [
        { board: ['b1 wn', 'e1 wk', 'e8 bk'], turn: 'w', prompt: 'Разви фигуру в начале партии.', hint: 'Выведи коня к центру: b1 на c3.', answers: ['b1c3'] },
        { board: ['e4 wp', 'f1 wb', 'g1 wn', 'e1 wk', 'e8 bk'], turn: 'w', prompt: 'Разви фигуру к центру.', hint: 'Слона на активную клетку: f1 на c4.', answers: ['f1c4'] },
        { board: ['e4 wp', 'g1 wn', 'e1 wk', 'e8 bk'], turn: 'w', prompt: 'Разви ещё одну фигуру.', hint: 'Второго коня в центр: g1 на f3.', answers: ['g1f3'] } ] },
      { id: 't-sac', title: 'Пожертвование', icon: '💥', explain: 'Жертва (пожертвование) — отдать свою фигуру, чтобы получить что-то важнее: мат или сильную атаку. Здесь отдадим ферзя ради красивого «спёртого мата» конём!', steps: [
        { board: ['g1 wk', 'c4 wq', 'h6 wn', 'h8 bk', 'f8 br', 'g7 bp', 'h7 bp'], turn: 'w', prompt: 'Пожертвуй ферзя и поставь мат в 2 хода!', prompt2: 'Теперь добей конём — мат!', hint: 'Отдай ферзя с шахом: c4 на g8 (его защищает конь, поэтому король не возьмёт).', hint2: 'Спёртый мат конём: h6 на f7.', plies: [ { answers: ['c4g8'], reply: 'f8g8' }, { answers: ['h6f7'] } ], goal: 'mate' } ] },
      { id: 't-promo', title: 'Превращение пешки', icon: '✨', explain: 'Когда пешка доходит до последней горизонтали — она превращается в любую фигуру. Обычно выбирают ферзя, он самый сильный!', steps: [
        { board: ['b7 wp', 'e1 wk', 'h8 bk'], turn: 'w', prompt: 'Проведи пешку в ферзи.', hint: 'Дойди до последней линии: b7 на b8.', answers: ['b7b8q', 'b7b8'] },
        { board: ['b7 wp', 'a8 br', 'e1 wk', 'h8 bk'], turn: 'w', prompt: 'Стань ферзём — со взятием!', hint: 'Пешка бьёт по диагонали на последнюю линию: b7 берёт a8.', answers: ['b7a8q', 'b7a8'] },
        { board: ['g7 wp', 'b1 wr', 'h1 wn', 'e1 wk', 'a8 bk'], turn: 'w', prompt: 'Проведи в ферзи — но какой фигурой?', hint: 'Превращается только пешка: g7 на g8.', answers: ['g7g8q', 'g7g8'] } ] },
      { id: 't-fork', title: 'Вилка', icon: '🍴', explain: 'Вилка — одна фигура нападает сразу на две (и больше). Вилку могут делать ВСЕ фигуры! Потренируемся каждой.', steps: [
        { board: ['d4 wp', 'c6 bn', 'e6 bb', 'a1 wk', 'h8 bk'], turn: 'w', prompt: 'Сделай вилку — напади сразу на две фигуры.', hint: 'Пешкой: d4 на d5 — под ударом конь и слон.', answers: ['d4d5'], goal: 'fork' },
        { board: ['e5 wn', 'h8 bk', 'd8 bq', 'a1 wk'], turn: 'w', prompt: 'Сделай вилку.', hint: 'Конём: e5 на f7 — шах королю и удар по ферзю.', answers: ['e5f7'], goal: 'fork' },
        { board: ['d3 wb', 'b1 br', 'h7 br', 'a3 wk', 'e8 bk'], turn: 'w', prompt: 'Сделай вилку.', hint: 'Слоном: d3 на e4 — под ударом обе ладьи.', answers: ['d3e4'], goal: 'fork' },
        { board: ['h5 wr', 'e8 bk', 'a5 bb', 'a1 wk'], turn: 'w', prompt: 'Сделай вилку.', hint: 'Ладьёй: h5 на e5 — шах королю и удар по слону.', answers: ['h5e5'], goal: 'fork' },
        { board: ['d2 wq', 'g7 bk', 'b2 bq', 'h3 wk'], turn: 'w', prompt: 'Сделай вилку.', hint: 'Ферзём: d2 на g2 — шах королю и удар по ферзю.', answers: ['d2g2'], goal: 'fork' } ] },
      { id: 't-pin', title: 'Связка', icon: '📌', explain: 'Связка — фигура не может уйти, потому что за ней стоит более важная (например, король). Такая фигура «приклеена» к месту.', steps: [
        { board: ['d7 bn', 'd8 bk', 'a1 wr', 'h1 wk'], turn: 'w', prompt: 'Свяжи фигуру соперника.', hint: 'Ладьёй на d1 — за конём стоит король: a1 на d1.', answers: ['a1d1'], goal: 'pin', pinAt: 'd7' },
        { board: ['f1 wb', 'd5 bn', 'a8 bk', 'h1 wk'], turn: 'w', prompt: 'Свяжи коня.', hint: 'Слоном на g2 — конь d5 «приклеится» к королю: f1 на g2.', answers: ['f1g2'], goal: 'pin', pinAt: 'd5' },
        { board: ['a1 wr', 'f3 bb', 'f8 bk', 'h3 wk'], turn: 'w', prompt: 'Свяжи слона.', hint: 'Ладьёй на f1 — за слоном король f8: a1 на f1.', answers: ['a1f1'], goal: 'pin', pinAt: 'f3' } ] },
      { id: 't-castle', title: 'Рокировка', icon: '🏰', explain: 'Рокировка — единственный ход, где двигаются сразу две фигуры: король и ладья. Король прыгает на 2 клетки к ладье, а ладья становится рядом. Условия: король и ладья ещё не ходили, между ними пусто, король не под шахом и не проходит через битое поле.', steps: [
        { board: ['e1 wk', 'h1 wr', 'e8 bk'], turn: 'w', castling: { wK: true, wQ: false, bK: false, bQ: false }, prompt: 'Сделай короткую рокировку.', hint: 'Король прыгает к ближней ладье: e1 на g1.', answers: ['e1g1'] },
        { board: ['e1 wk', 'a1 wr', 'e8 bk'], turn: 'w', castling: { wK: false, wQ: true, bK: false, bQ: false }, prompt: 'Сделай длинную рокировку.', hint: 'Король прыгает к дальней ладье: e1 на c1.', answers: ['e1c1'] } ] },
      { id: 't-deflect', title: 'Отвлечение', icon: '🎣', explain: 'Отвлечение — убрать защитника с важного поля. Если фигура защищает последнюю линию или поле мата — съешь её, и путь к мату открыт!', steps: [
        { board: ['d1 wr', 'g1 wk', 'g8 bk', 'd8 bq', 'f7 bp', 'g7 bp', 'h7 bp'], turn: 'w', prompt: 'Убери защитника последней линии — и это мат!', hint: 'Съешь чёрного ферзя ладьёй: d1 на d8. Это мат по 8-й линии.', answers: ['d1d8'], goal: 'mate' } ] },
      { id: 't-zug', title: 'Цугцванг', icon: '⛓️', explain: 'Цугцванг — положение, где ЛЮБОЙ ход только вредит, но пропустить нельзя — ходить обязан. Главный приём здесь — «оппозиция»: встать королём напротив короля соперника через одну клетку, и ему придётся уступить дорогу.', steps: [
        { board: ['e6 wk', 'e5 wp', 'd8 bk'], turn: 'w', prompt: 'Поставь соперника в цугцванг — займи оппозицию королём.', hint: 'Встань напротив короля через клетку: e6 на d6. Тогда чёрному придётся уйти с дороги пешки.', answers: ['e6d6'] } ] }
    ]
  }
];
  const TUT_BY_ID = {}; for (const sec of TUT_SECTIONS) for (const L of sec.lessons) TUT_BY_ID[L.id] = L;

  const tut = { run: null, state: null, sel: -1, legal: [], lastMove: null, locked: false, info: false };

  function tutParse(list) { const b = new Array(64).fill(null); for (const it of list) { const sp = it.split(' '); b[C.nameToSq(sp[0])] = sp[1]; } return b; }
  function tutState(step) { return { board: tutParse(step.board), turn: step.turn || 'w', castling: step.castling || { wK: false, wQ: false, bK: false, bQ: false }, ep: -1, half: 0, full: 1 }; }

  function openTutorial() { unlockAudio(); $('setupScreen').hidden = true; $('gameScreen').hidden = true; $('tutorScreen').hidden = false; showTutMenu(); }
  function showTutMenu() { tut.run = null; tut.info = false; tut.locked = true; $('tutTitle').textContent = '📚 Обучение'; $('tutMenu').hidden = false; $('tutLesson').hidden = true; renderTutMenu(); }
  function tutBackAction() { if (!$('tutLesson').hidden) { showTutMenu(); } else { $('tutorScreen').hidden = true; showSetup(); } }

  // Пройденные темы (зелёные) хранятся между запусками
  const TUT_DONE_KEY = 'chessTutDone';
  function loadTutDone() { try { const a = JSON.parse(localStorage.getItem(TUT_DONE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function markTutDone(id) { if (!id) return; const a = loadTutDone(); if (a.indexOf(id) < 0) { a.push(id); try { localStorage.setItem(TUT_DONE_KEY, JSON.stringify(a)); } catch (e) { } } }

  function renderTutMenu() {
    const done = loadTutDone();
    let total = 0, doneCount = 0;
    for (const sec of TUT_SECTIONS) for (const L of sec.lessons) { total++; if (done.indexOf(L.id) >= 0) doneCount++; }
    let html = `<div class="ch-tut-count">Пройдено тем: ${doneCount} из ${total}</div>`;
    for (const sec of TUT_SECTIONS) {
      html += `<div class="ch-ach-head">${sec.name}</div><div class="ch-tut-grid">`;
      for (const L of sec.lessons) {
        const ok = done.indexOf(L.id) >= 0;
        html += `<button class="ch-tut-card${ok ? ' done' : ''}" data-lid="${L.id}"><span class="tc-ico">${L.icon}</span><span class="tc-t">${L.title}</span><span class="tc-status">${ok ? '✅' : ''}</span></button>`;
      }
      html += '</div>';
    }
    $('tutSections').innerHTML = html;
    document.querySelectorAll('#tutSections .ch-tut-card').forEach(b => b.addEventListener('click', () => openLesson(b.dataset.lid)));
  }

  function openLesson(id) { const L = TUT_BY_ID[id]; if (!L) return; if (L.info) showTutInfo(L); else startLesson(L); }

  function showTutInfo(L) {
    tut.info = true; tut.run = null; tut.locked = true;
    $('tutTitle').textContent = L.icon + ' ' + L.title;
    $('tutMenu').hidden = true; $('tutLesson').hidden = false;
    tut.state = tutState({ board: L.demo || ['e1 wk', 'e8 bk'], turn: 'w' });
    tut.sel = -1; tut.legal = []; tut.lastMove = null;
    $('tutExplain').innerHTML = L.explain;
    $('tutPrompt').innerHTML = L.note || '📖 Тема для понимания.';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutInfoOk">Понятно →</button>`;
    $('tutInfoOk').addEventListener('click', showTutMenu);
    renderTutBoard();
  }

  function startLesson(L) {
    tut.info = false;
    tut.run = { title: L.title, icon: L.icon, explain: L.explain, lessonId: L.id, steps: L.steps.map(s => ({ ...s })), idx: 0, reviewMode: false };
    $('tutTitle').textContent = L.icon + ' ' + L.title;
    $('tutMenu').hidden = true; $('tutLesson').hidden = false;
    loadRunStep();
  }

  function startReview() {
    const steps = [];
    for (const sec of TUT_SECTIONS) for (const L of sec.lessons) if (L.steps) for (const s of L.steps) steps.push({ ...s, explain: `<b>${L.icon} ${L.title}.</b> ${L.explain}` });
    if (!steps.length) return;
    tut.info = false;
    tut.run = { title: 'Повторение', explain: '', steps, idx: 0, reviewMode: true };
    $('tutTitle').textContent = '🔁 Повторение всех тем';
    $('tutMenu').hidden = true; $('tutLesson').hidden = false;
    loadRunStep();
  }

  function loadRunStep() {
    const run = tut.run; const step = run.steps[run.idx];
    step._plies = step.plies || [{ answers: step.answers }];
    run.plyIdx = 0;
    tut.state = tutState(step); tut.sel = -1; tut.legal = []; tut.lastMove = null; tut.locked = false;
    $('tutExplain').innerHTML = step.explain || run.explain || '';
    const n = run.steps.length; const prog = n > 1 ? ` (${run.idx + 1}/${n})` : '';
    $('tutPrompt').innerHTML = `<b>Задание${prog}:</b> ${step.prompt}<br><span class="tut-hint">Твой ход белыми — нажми на фигуру, потом на клетку.</span>`;
    renderTutBoard();
    renderTaskActions();
  }

  // Кнопка «Подсказка» во время задания
  function renderTaskActions() {
    const run = tut.run; if (!run) return; const step = run.steps[run.idx];
    const hints = step._hints || (step._hints = step.hints || [step.hint || '']);
    const h = hints[run.plyIdx] || hints[0] || '';
    $('tutActions').innerHTML = h ? `<button class="ch-btn" id="tutHint">💡 Подсказка</button>` : '';
    const btn = $('tutHint');
    if (btn) btn.addEventListener('click', () => {
      const old = $('tutActions').querySelector('.tut-hintbox'); if (old) old.remove();
      const box = document.createElement('div'); box.className = 'tut-hintbox'; box.innerHTML = '💡 ' + h;
      $('tutActions').appendChild(box);
    });
  }

  function renderTutBoard() {
    const el = $('tutBoard'); if (!el) return; el.innerHTML = '';
    for (let rr = 7; rr >= 0; rr--) for (let ff = 0; ff < 8; ff++) {
      const f = ff, r = rr, s = C.sq(f, r);
      const cell = document.createElement('div');
      cell.className = 'ch-sq ' + ((f + r) % 2 === 0 ? 'dark' : 'light');
      cell.dataset.sq = s;
      if (ff === 0) { const rk = document.createElement('span'); rk.className = 'ch-coord ch-coord-rank'; rk.textContent = r + 1; cell.appendChild(rk); }
      if (rr === 0) { const fl = document.createElement('span'); fl.className = 'ch-coord ch-coord-file'; fl.textContent = FILE_LETTER(f); cell.appendChild(fl); }
      if (tut.lastMove && (tut.lastMove.from === s || tut.lastMove.to === s)) cell.classList.add('last');
      if (tut.sel === s) cell.classList.add('sel');
      const p = tut.state.board[s];
      if (p) { const pc = document.createElement('span'); pc.className = 'ch-piece ' + (C.colorOf(p) === 'w' ? 'white' : 'black'); pc.textContent = GLYPH[C.typeOf(p)]; cell.appendChild(pc); }
      if (tut.legal.some(m => m.to === s)) { const dot = document.createElement('span'); dot.className = 'ch-dot' + (tut.state.board[s] ? ' cap' : ''); cell.appendChild(dot); }
      if (p && C.typeOf(p) === 'k' && C.inCheck(tut.state, C.colorOf(p))) cell.classList.add('check');
      cell.addEventListener('pointerdown', () => onTutTap(s));
      el.appendChild(cell);
    }
  }

  function onTutTap(s) {
    if (tut.locked) return; unlockAudio();
    const st = tut.state; const p = st.board[s];
    if (tut.sel >= 0 && tut.legal.some(m => m.to === s)) { doTutMove(tut.sel, s); return; }
    if (p && C.colorOf(p) === st.turn) { tut.sel = s; tut.legal = C.legalMovesFrom(st, s); renderTutBoard(); return; }
    tut.sel = -1; tut.legal = []; renderTutBoard();
  }

  function doTutMove(from, to) {
    const st = tut.state;
    let mv = C.legalMovesFrom(st, from).find(m => m.to === to && (!m.promo || m.promo === 'q'));
    if (!mv) mv = C.legalMovesFrom(st, from).find(m => m.to === to);
    if (!mv) return;
    const code = C.sqName(from) + C.sqName(to) + (mv.promo || '');
    const run = tut.run; const step = run.steps[run.idx]; const ply = step._plies[run.plyIdx];
    const ok = ply.answers.indexOf(code) >= 0 || ply.answers.indexOf(C.sqName(from) + C.sqName(to)) >= 0;
    if (!ok) { tut.sel = -1; tut.legal = []; renderTutBoard(); tutBad(); return; }
    C.makeMove(st, mv); tut.lastMove = { from, to }; tut.sel = -1; tut.legal = []; renderTutBoard();
    const last = run.plyIdx >= step._plies.length - 1;
    if (last) { tutGood(); return; }
    // промежуточный верный ход: ответ соперника, затем продолжаем
    tut.locked = true; flashTut('good'); playGoodSound();
    $('tutPrompt').innerHTML = '✅ <b>Верно!</b> Смотри ответ соперника…';
    const reply = ply.reply;
    setTimeout(() => {
      if (reply) {
        const rf = C.nameToSq(reply.substr(0, 2)), rt = C.nameToSq(reply.substr(2, 2)), rp = reply[4] || '';
        let rm = C.legalMovesFrom(tut.state, rf).find(m => m.to === rt && (!rp || m.promo === rp)) || C.legalMovesFrom(tut.state, rf).find(m => m.to === rt);
        if (rm) { C.makeMove(tut.state, rm); tut.lastMove = { from: rf, to: rt }; }
      }
      run.plyIdx++; tut.locked = false; renderTutBoard();
      $('tutPrompt').innerHTML = `<b>Продолжай:</b> ${step.prompt2 || step.prompt}<br><span class="tut-hint">Твой ход.</span>`;
      renderTaskActions();
    }, 550);
  }

  function flashTut(kind) { const fl = $('tutFlash'); if (!fl) return; fl.className = ''; void fl.offsetWidth; fl.className = 'show ' + kind; }

  function tutGood() {
    tut.locked = true; flashTut('good'); playGoodSound();
    const run = tut.run; const last = run.idx >= run.steps.length - 1;
    $('tutPrompt').innerHTML = '✅ <b>Верно!</b> Отличный ход!';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutNext">${last ? '🎉 Готово' : 'Продолжить →'}</button>`;
    $('tutNext').addEventListener('click', () => { if (last) finishRun(); else { run.idx++; loadRunStep(); } });
  }

  function tutBad() {
    tut.locked = true; flashTut('bad'); playBadSound();
    $('tutPrompt').innerHTML = '❌ <b>Не тот ход.</b> Попробуй ещё раз!';
    $('tutActions').innerHTML = `<button class="ch-btn" id="tutRetry">↻ Ещё раз</button><button class="ch-btn ch-btn-primary" id="tutShow">💡 Показать ответ и дальше</button>`;
    $('tutRetry').addEventListener('click', () => loadRunStep());
    $('tutShow').addEventListener('click', showTutAnswer);
  }

  function showTutAnswer() {
    const run = tut.run; const step = run.steps[run.idx]; const plies = step._plies || (step._plies = step.plies || [{ answers: step.answers }]);
    tut.state = tutState(step);
    for (let i = 0; i < plies.length; i++) {
      const a = plies[i].answers[0]; const f = C.nameToSq(a.substr(0, 2)), t = C.nameToSq(a.substr(2, 2)), pr = a[4] || '';
      let mv = C.legalMovesFrom(tut.state, f).find(m => m.to === t && (!pr || m.promo === pr)) || C.legalMovesFrom(tut.state, f).find(m => m.to === t);
      if (mv) { C.makeMove(tut.state, mv); tut.lastMove = { from: f, to: t }; }
      const rep = plies[i].reply;
      if (rep && i < plies.length - 1) { const rf = C.nameToSq(rep.substr(0, 2)), rt = C.nameToSq(rep.substr(2, 2)); let rm = C.legalMovesFrom(tut.state, rf).find(m => m.to === rt); if (rm) { C.makeMove(tut.state, rm); tut.lastMove = { from: rf, to: rt }; } }
    }
    tut.sel = -1; tut.legal = []; tut.locked = true; renderTutBoard();
    const last = run.idx >= run.steps.length - 1;
    $('tutPrompt').innerHTML = '💡 Вот правильное решение. Запомни его!';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutNext2">${last ? '🎉 Готово' : 'Дальше →'}</button>`;
    $('tutNext2').addEventListener('click', () => { if (last) finishRun(); else { run.idx++; loadRunStep(); } });
  }

  function finishRun() {
    flashTut('good'); playGoodSound(); tut.locked = true;
    if (tut.run.reviewMode) { for (const sec of TUT_SECTIONS) for (const L of sec.lessons) markTutDone(L.id); }
    else markTutDone(tut.run.lessonId);
    $('tutExplain').innerHTML = tut.run.reviewMode ? '🏆 Ты повторил все темы! Ты молодец!' : '🎉 Урок пройден! Отличная работа!';
    $('tutPrompt').innerHTML = '';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutDone">← В меню обучения</button>`;
    $('tutDone').addEventListener('click', showTutMenu);
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
    const rec = { mode: app.mode, t: Date.now(), dur: app.gameDurMs || 0 };
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
      const sub = modeLabel(r.mode) + (r.dur ? ' · ⏱ ' + fmtDur(r.dur) : '');
      html += `<div class="ch-hist-item ${cls}"><span class="hi-main">${main}</span><span class="hi-sub">${sub}</span></div>`;
    }
    $('histList').innerHTML = html || '<div class="ch-hist-empty">Пока нет сыгранных партий</div>';
    $('histModal').hidden = false;
  }

  function bindHistory() {
    $('viewBtn').addEventListener('click', openHistory);
    $('btnViewOver').addEventListener('click', () => { $('overModal').hidden = true; location.hash = ''; showSetup(); });
    $('histClose').addEventListener('click', () => { $('histModal').hidden = true; });
    $('histClear').addEventListener('click', () => { if (confirm('Очистить историю партий?')) { saveHist([]); openHistory(); } });
    $('achBtn').addEventListener('click', openAch);
    $('achClose').addEventListener('click', () => { $('achModal').hidden = true; });
    $('tutBtn').addEventListener('click', openTutorial);
    $('tutBack').addEventListener('click', tutBackAction);
    $('tutReview').addEventListener('click', startReview);
    $('ranksBtn').addEventListener('click', openRanks);
    $('ranksClose').addEventListener('click', () => { $('ranksModal').hidden = true; });
  }

  /* ========================================================
     ДОСТИЖЕНИЯ (статистика игрока)
     ======================================================== */
  const STATS_KEY = 'chessStats';
  function hasYou() { return app.mode === 'bot' || (app.mode === 'friend' && app.online.on); }
  function myStatColor() { return app.mode === 'bot' ? app.myColor : (app.mode === 'friend' && app.online.on ? app.online.myColor : null); }
  function resetGameStats() { app.gs = { checks: 0, start: Date.now(), lastCapType: null, lastFrom: -1, lastTo: -1, myCaps: 0, alphaNext: 0, prevPins: new Set() }; }

  // Клетки соперника, «связанные» (абсолютный пин к своему королю) моими дальнобойными фигурами
  function pinnedSquares(board, enemyColor) {
    const res = new Set();
    let kSq = -1;
    for (let i = 0; i < 64; i++) { const p = board[i]; if (p && C.colorOf(p) === enemyColor && C.typeOf(p) === 'k') { kSq = i; break; } }
    if (kSq < 0) return res;
    const me = enemyColor === 'w' ? 'b' : 'w';
    const dirs = [[1, 0, 'r'], [-1, 0, 'r'], [0, 1, 'r'], [0, -1, 'r'], [1, 1, 'b'], [1, -1, 'b'], [-1, 1, 'b'], [-1, -1, 'b']];
    const kf = kSq % 8, kr = (kSq / 8) | 0;
    for (const d of dirs) {
      let f = kf + d[0], r = kr + d[1], firstEnemy = -1;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const s = r * 8 + f, p = board[s];
        if (p) {
          if (firstEnemy < 0) {
            if (C.colorOf(p) === enemyColor && C.typeOf(p) !== 'k') firstEnemy = s; else break;
          } else {
            const t = C.typeOf(p);
            if (C.colorOf(p) === me && (t === 'q' || t === d[2])) res.add(firstEnemy);
            break;
          }
        }
        f += d[0]; r += d[1];
      }
    }
    return res;
  }

  function ensureStats() {
    let s; try { s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch (e) { s = {}; }
    const def = { games: 0, wins: 0, losses: 0, draws: 0, checkmatesBy: 0, resigns: 0, promotions: 0, captures: 0, pawnsCaptured: 0, queensCaptured: 0, queensLost: 0, blackGames: 0, wonHardBot: false, maxChecksInGame: 0, forks: 0, escapes: 0, knightThenPawn: 0, fastMate: false, hourGame: false, repeats: 0, pins: 0, blackPins: 0, alphabet: false, freeGames: 0, castles: 0, wipeout: false, minorsCaptured: 0, undos: 0 };
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
    // рокировка: король шагнул на 2 клетки
    const castled = C.typeOf(app.state.board[m.to]) === 'k' && Math.abs(C.fileOf(m.from) - C.fileOf(m.to)) === 2;
    // новые «связки» соперника, созданные этим ходом
    const afterPins = pinnedSquares(app.state.board, enemy);
    const prevPins = (app.gs && app.gs.prevPins) || new Set();
    let newPins = 0, newBlackPins = 0;
    afterPins.forEach(sq => { if (!prevPins.has(sq)) { newPins++; if (C.colorOf(app.state.board[sq]) === 'b') newBlackPins++; } });
    if (app.gs) app.gs.prevPins = afterPins;
    // алфавитный порядок: посадка на файлы a→b→c→d→e→f подряд
    const landFile = C.fileOf(m.to);
    let alphaDone = false;
    if (app.gs) {
      if (landFile === app.gs.alphaNext) { app.gs.alphaNext++; if (app.gs.alphaNext >= 6) alphaDone = true; }
      else app.gs.alphaNext = (landFile === 0) ? 1 : 0;
    }
    // все фигуры соперника съедены за партию (15 фигур кроме короля)
    let wipeout = false;
    if (capType && app.gs) { app.gs.myCaps++; if (app.gs.myCaps >= 15) wipeout = true; }
    bumpStats(s => {
      if (capType) {
        s.captures++;
        if (capType === 'p') s.pawnsCaptured++;
        if (capType === 'q') s.queensCaptured++;
        if (capType === 'n' || capType === 'b') s.minorsCaptured++;
        if (knightThenPawn) s.knightThenPawn++;
      }
      if (m.promo) s.promotions++;
      if (gaveCheck && app.gs) { app.gs.checks++; if (app.gs.checks > s.maxChecksInGame) s.maxChecksInGame = app.gs.checks; }
      if (fc >= 2) s.forks++;
      if (escaped) s.escapes++;
      if (backForth) s.repeats++;
      if (castled) s.castles++;
      if (newPins) s.pins += newPins;
      if (newBlackPins) s.blackPins += newBlackPins;
      if (alphaDone) s.alphabet = true;
      if (wipeout) s.wipeout = true;
    });
    if (app.gs) { app.gs.lastFrom = m.from; app.gs.lastTo = m.to; if (capType) app.gs.lastCapType = capType; }
  }

  function trackGameEnd(res, winnerColor) {
    if (!hasYou()) return;
    const myC = myStatColor();
    const fast = res.type === 'checkmate' && winnerColor === myC && app.history.length <= 20;
    const hour = app.gs && app.gs.start && (Date.now() - app.gs.start) >= 3600000;
    bumpStats(s => {
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
    { t: 'Заложник', d: 'Свяжи 3 фигуры соперника', ico: '🔗', goal: 3, cur: s => s.pins },
    { t: 'Алфавитный порядок', d: 'Сходи на клетки a-b-c-d-e-f подряд', ico: '🔤', goal: 1, cur: s => s.alphabet ? 1 : 0 },
    { t: 'Свобода!', d: 'Сыграй 30 партий без ограничений', ico: '🕊️', goal: 30, cur: s => s.freeGames },
    { t: 'В укрытие!', d: 'Сделай рокировку 3 раза', ico: '🏰', goal: 3, cur: s => s.castles },
    // секретные
    { t: 'Превращение', d: 'Преврати пешку 5 раз', ico: '✨', goal: 5, cur: s => s.promotions, secret: true },
    { t: 'Убит всадник', d: 'Съешь коня и пешку подряд', ico: '🐴', goal: 1, cur: s => Math.min(s.knightThenPawn, 1), secret: true },
    { t: 'Большой брат', d: 'Уйди от преследования фигуры', ico: '👁️', goal: 1, cur: s => Math.min(s.escapes, 1), secret: true },
    { t: 'За чёрных', d: 'Сыграй за чёрных 10 партий', ico: '⚫', goal: 10, cur: s => s.blackGames, secret: true },
    { t: 'Ай, зевнул!', d: 'Потеряй 3 своих ферзей', ico: '🥱', goal: 3, cur: s => s.queensLost, secret: true },
    { t: 'Не спи!', d: 'Сыграй партию целый час', ico: '⏰', goal: 1, cur: s => s.hourGame ? 1 : 0, secret: true },
    { t: 'Братство', d: 'Сдайся 3 раза', ico: '🏳️', goal: 3, cur: s => s.resigns, secret: true },
    { t: 'Равенство', d: 'Сыграй вничью 5 раз', ico: '🤝', goal: 5, cur: s => s.draws, secret: true },
    { t: 'Убийство племя', d: 'Съешь все фигуры соперника за одну партию', ico: '💀', goal: 1, cur: s => s.wipeout ? 1 : 0, secret: true },
    { t: 'Бедные животные!', d: 'Съешь 30 коней или слонов', ico: '🐘', goal: 30, cur: s => s.minorsCaptured, secret: true },
    { t: 'Ой, не туда', d: 'Отмени ход 5 раз', ico: '🙈', goal: 5, cur: s => s.undos, secret: true },
    { t: 'Нет прав у чёрных!', d: 'Свяжи 5 чёрных фигур', ico: '⛓️', goal: 5, cur: s => s.blackPins, secret: true }
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
      if (before[i] >= a.goal) continue; // уже выполнено раньше — больше не всплывает
      const justDone = before[i] < a.goal && now >= a.goal;
      if (a.secret && !justDone) continue; // секретные не спойлим до получения
      showAchToast(a, now, justDone);
    }
  }

  /* ---- Ранг по числу сыгранных партий ---- */
  const RANKS = [
    { g: 0, name: 'Пешка', bottom: 'p' },
    { g: 5, name: 'Конь', bottom: 'n' },
    { g: 10, name: 'Слон', bottom: 'b' },
    { g: 20, name: 'Ладья', bottom: 'r' },
    { g: 30, name: 'Ферзь', bottom: 'q' },
    { g: 40, name: 'Король', bottom: 'k' },
    { g: 50, name: 'Пешка на коне', top: 'p', bottom: 'n' },
    { g: 60, name: 'Пешка на слоне', top: 'p', bottom: 'b' },
    { g: 70, name: 'Пешка на ладье', top: 'p', bottom: 'r' },
    { g: 80, name: 'Конь на ладье', top: 'n', bottom: 'r' },
    { g: 90, name: 'Слон на ладье', top: 'b', bottom: 'r' },
    { g: 100, name: 'Ферзь на ладье', top: 'q', bottom: 'r' },
    { g: 200, name: 'Король на ладье', top: 'k', bottom: 'r' }
  ];
  function rankFor(g) { let r = RANKS[0]; for (const x of RANKS) if (g >= x.g) r = x; return r; }
  function rankHtml(r) {
    return r.top
      ? `<span class="rk-bottom">${GLYPH[r.bottom]}</span><span class="rk-top">${GLYPH[r.top]}</span>`
      : `<span class="rk-single">${GLYPH[r.bottom]}</span>`;
  }
  function renderRank() {
    const badge = $('rankBadge'); if (!badge) return;
    const g = ensureStats().games || 0;
    const r = rankFor(g);
    badge.className = 'ch-rank' + (r.top ? ' combo' + (r.bottom === 'r' ? ' tower' : '') : '');
    badge.innerHTML = rankHtml(r);
    const next = RANKS.find(x => x.g > g);
    const info = $('rankInfo');
    if (info) info.innerHTML = `Ранг: <b>${r.name}</b> · сыграно партий: <b>${g}</b>` + (next ? ` · до «${next.name}»: ${next.g - g}` : '');
  }
  function openRanks() {
    const g = ensureStats().games || 0;
    const cur = rankFor(g);
    let html = '';
    for (const r of RANKS) {
      const ok = g >= r.g, isCur = r.g === cur.g;
      html += `<div class="ch-rankrow ${ok ? 'ok' : ''} ${isCur ? 'cur' : ''}">
        <span class="ch-rank mini ${r.top ? 'combo' + (r.bottom === 'r' ? ' tower' : '') : ''}">${rankHtml(r)}</span>
        <span class="rr-name">${r.name}${isCur ? ' <b>· ты здесь</b>' : ''}</span>
        <span class="rr-games">${r.g}${r.g === 200 ? '+' : ''} партий</span>
      </div>`;
    }
    $('ranksList').innerHTML = html;
    $('ranksModal').hidden = false;
  }
  function showRankToast(name) {
    if (!achToastWrap) { achToastWrap = document.createElement('div'); achToastWrap.className = 'ch-toastwrap'; document.body.appendChild(achToastWrap); }
    const el = document.createElement('div');
    el.className = 'ch-atoast done';
    el.innerHTML = `<span class="at-ico">⭐</span><span class="at-body"><span class="at-t">Новый ранг!</span><span class="at-p">${name}</span></span>`;
    achToastWrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 2800);
  }
  // считаем ВСЕ сыгранные партии (любой режим) + ранг-апы
  function countGame() {
    const beforeRank = rankFor(ensureStats().games || 0);
    const noLimits = !app.clock.timeOn && !app.clock.movesOn;
    bumpStats(s => { s.games++; if (noLimits) s.freeGames++; });
    const afterRank = rankFor(ensureStats().games || 0);
    if (afterRank.g !== beforeRank.g) showRankToast(afterRank.name);
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
