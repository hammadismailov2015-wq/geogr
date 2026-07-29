/* ============================================================
   ШАХМАТЫ — интерфейс (экраны, доска, режимы, темы, ссылки,
   часы/лимит ходов, съеденные фигуры, статусы шах/мат/пат)
   ============================================================ */
(function () {
  const C = window.Chess;

  // Юникод-глифы фигур (сплошные, цвет задаём через CSS)
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  // Ценность фигур (для перевеса по материалу)
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const START = { p: 8, n: 2, b: 2, r: 2, q: 1 };

  // ---------- Состояние приложения ----------
  const app = {
    state: null,        // игровое состояние из движка
    mode: 'bot',        // 'bot' | 'friend' | 'local'
    myColor: 'w',       // за кого играет игрок (bot/friend)
    level: 2,           // сложность бота
    orientation: 'w',   // с какой стороны показываем доску
    selected: -1,       // выбранная клетка
    legalFrom: [],      // легальные ходы из выбранной клетки
    history: [],        // список сделанных ходов (строками from+to+promo)
    lastMove: null,     // {from,to} для подсветки
    over: false,        // партия окончена
    overText: '',       // краткий текст результата для строки статуса
    pendingShare: false,// в режиме друга сделан ход — надо поделиться ссылкой
    botThinking: false,
    paused: false,      // пауза часов (открыта модалка превращения и т.п.)
    theme: 'classic',
    // Контроль игры (время и/или ходы могут быть включены одновременно):
    clock: { timeOn: false, movesOn: false, timeMs: { w: 0, b: 0 }, movesLeft: { w: 0, b: 0 }, lastTick: 0 }
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  let elBoard, elStatus, elHistory;

  /* ========================================================
     ЗАПУСК
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    buildLayout();
    app.theme = localStorage.getItem('chessTheme') || 'classic';
    applyTheme(app.theme);
    startClockLoop();
    if (location.hash.startsWith('#g=')) {
      startFromLink(location.hash.slice(3));
    } else {
      showSetup();
    }
  });

  /* ========================================================
     РАЗМЕТКА
     ======================================================== */
  function buildLayout() {
    const root = $('chessRoot');
    root.innerHTML = `
      <!-- ЭКРАН НАСТРОЙКИ -->
      <section id="setupScreen" class="ch-screen">
        <div class="ch-hero">
          <div class="ch-hero-ico">♞</div>
          <h2>Шахматы</h2>
          <p>Выберите режим, сторону, контроль и оформление — и начинайте партию.</p>
        </div>

        <div class="ch-group">
          <div class="ch-label">Режим игры</div>
          <div class="ch-cards" id="modeCards">
            <button class="ch-card" data-mode="bot">
              <span class="ch-card-ico">🤖</span>
              <span class="ch-card-title">Играть с ботом</span>
              <span class="ch-card-sub">Соперник — компьютер</span>
            </button>
            <button class="ch-card" data-mode="friend">
              <span class="ch-card-ico">🔗</span>
              <span class="ch-card-title">Играть с другом</span>
              <span class="ch-card-sub">По ссылке на партию</span>
            </button>
            <button class="ch-card" data-mode="local">
              <span class="ch-card-ico">👥</span>
              <span class="ch-card-title">Рядом друг с другом</span>
              <span class="ch-card-sub">Экран переворачивается</span>
            </button>
          </div>
        </div>

        <div class="ch-group" id="sideGroup">
          <div class="ch-label">Играть за</div>
          <div class="ch-choices" id="sideChoices">
            <button class="ch-choice" data-side="w">♔ Белые</button>
            <button class="ch-choice" data-side="b">♚ Чёрные</button>
            <button class="ch-choice" data-side="r">🎲 Рандом</button>
          </div>
        </div>

        <div class="ch-group" id="levelGroup">
          <div class="ch-label">Сложность бота</div>
          <div class="ch-choices" id="levelChoices">
            <button class="ch-choice" data-level="1">🙂 Лёгкий</button>
            <button class="ch-choice" data-level="2">😐 Средний</button>
            <button class="ch-choice" data-level="3">😈 Сложный</button>
          </div>
        </div>

        <div class="ch-group" id="limitGroup">
          <div class="ch-label">Контроль игры <span class="ch-label-note">— можно включить время и ходы вместе</span></div>
          <div class="ch-sublabel" id="timeLabel">⏱️ Время каждому игроку</div>
          <div class="ch-chips" id="timeChips">
            <button class="ch-chip" data-min="0">Нет</button>
            <button class="ch-chip" data-min="1">1 мин</button>
            <button class="ch-chip" data-min="5">5 мин</button>
            <button class="ch-chip" data-min="10">10 мин</button>
            <button class="ch-chip" data-min="15">15 мин</button>
            <button class="ch-chip" data-min="20">20 мин</button>
            <button class="ch-chip" data-min="30">30 мин</button>
          </div>
          <div class="ch-sublabel" id="moveLabel" style="margin-top:14px">🔢 Ходов каждому игроку</div>
          <div class="ch-chips" id="moveChips">
            <button class="ch-chip" data-mv="0">Нет</button>
            <button class="ch-chip" data-mv="30">30 ходов</button>
            <button class="ch-chip" data-mv="50">50 ходов</button>
            <button class="ch-chip" data-mv="100">100 ходов</button>
          </div>
          <div class="ch-hint-line" id="friendClockHint" hidden>В игре с другом по ссылке часы и лимит ходов недоступны.</div>
        </div>

        <div class="ch-group">
          <div class="ch-label">Оформление доски и фигур</div>
          <div class="ch-themes" id="themeChoices">
            <button class="ch-theme" data-theme="classic">
              <span class="ch-theme-prev tp-classic"><i></i><i></i><i></i><i></i></span>
              Чёрно-белые
            </button>
            <button class="ch-theme" data-theme="brown">
              <span class="ch-theme-prev tp-brown"><i></i><i></i><i></i><i></i></span>
              Коричнево-белые
            </button>
            <button class="ch-theme" data-theme="green">
              <span class="ch-theme-prev tp-green"><i></i><i></i><i></i><i></i></span>
              Зелёно-белые
            </button>
          </div>
        </div>

        <button id="startBtn" class="ch-start">Начать партию ▶</button>
      </section>

      <!-- ЭКРАН ИГРЫ -->
      <section id="gameScreen" class="ch-screen" hidden>
        <div class="ch-status" id="chStatus">—</div>

        <div class="ch-playerbar" id="barTop">
          <div class="pb-info">
            <span class="pb-name" id="topName">Чёрные</span>
            <span class="pb-adv" id="topAdv"></span>
          </div>
          <div class="pb-captured" id="topCaptured"></div>
          <div class="pb-clock" id="topClock" hidden>—</div>
        </div>

        <div class="ch-board-wrap">
          <div class="ch-board" id="chBoard"></div>
        </div>

        <div class="ch-playerbar" id="barBot">
          <div class="pb-info">
            <span class="pb-name" id="botName">Белые</span>
            <span class="pb-adv" id="botAdv"></span>
          </div>
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

      <!-- Модалка превращения пешки -->
      <div id="promoModal" class="ch-modal" hidden>
        <div class="ch-modal-box">
          <div class="ch-modal-title">Выберите фигуру</div>
          <div class="ch-promo-row" id="promoRow"></div>
        </div>
      </div>

      <!-- Модалка «поделиться ссылкой» -->
      <div id="shareModal" class="ch-modal" hidden>
        <div class="ch-modal-box">
          <div class="ch-modal-title">Ход сделан 📨</div>
          <p class="ch-modal-text">Отправьте эту ссылку другу — он откроет её и сделает свой ход. Затем пришлёт ссылку вам обратно.</p>
          <input id="shareLink" class="ch-share-input" readonly />
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnCopy">📋 Скопировать</button>
            <button class="ch-btn" id="btnShareEdit">↶ Переходить</button>
          </div>
          <div class="ch-share-hint" id="copyHint"></div>
        </div>
      </div>

      <!-- Модалка конца партии -->
      <div id="overModal" class="ch-modal" hidden>
        <div class="ch-modal-box ch-over-box">
          <div class="ch-over-ico" id="overIco">♚</div>
          <div class="ch-modal-title" id="overTitle">—</div>
          <p class="ch-modal-text" id="overText"></p>
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnNewGame">Новая партия</button>
          </div>
        </div>
      </div>
    `;

    elBoard = $('chBoard');
    elStatus = $('chStatus');
    elHistory = $('chHistory');

    bindSetup();
    bindGame();
  }

  /* ========================================================
     НАСТРОЙКА
     ======================================================== */
  // timeMin=0 — без часов; moveLim=0 — без лимита ходов. Можно задать оба сразу.
  let setup = { mode: 'bot', side: 'w', level: 2, timeMin: 0, moveLim: 0 };

  function bindSetup() {
    $('modeCards').addEventListener('click', (e) => {
      const c = e.target.closest('.ch-card'); if (!c) return;
      setup.mode = c.dataset.mode;
      markActive('#modeCards .ch-card', c);
      updateSetupVisibility();
    });
    $('sideChoices').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-choice'); if (!b) return;
      setup.side = b.dataset.side;
      markActive('#sideChoices .ch-choice', b);
    });
    $('levelChoices').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-choice'); if (!b) return;
      setup.level = parseInt(b.dataset.level, 10);
      markActive('#levelChoices .ch-choice', b);
    });
    $('timeChips').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-chip'); if (!b) return;
      setup.timeMin = parseInt(b.dataset.min, 10);
      markActive('#timeChips .ch-chip', b);
    });
    $('moveChips').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-chip'); if (!b) return;
      setup.moveLim = parseInt(b.dataset.mv, 10);
      markActive('#moveChips .ch-chip', b);
    });
    $('themeChoices').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-theme'); if (!b) return;
      app.theme = b.dataset.theme;
      localStorage.setItem('chessTheme', app.theme);
      applyTheme(app.theme);
      markActive('#themeChoices .ch-theme', b);
    });
    $('startBtn').addEventListener('click', startGame);

    // значения по умолчанию
    selectDefault('#modeCards .ch-card', '[data-mode="bot"]');
    selectDefault('#sideChoices .ch-choice', '[data-side="w"]');
    selectDefault('#levelChoices .ch-choice', '[data-level="2"]');
    selectDefault('#timeChips .ch-chip', '[data-min="0"]');
    selectDefault('#moveChips .ch-chip', '[data-mv="0"]');
    selectDefault('#themeChoices .ch-theme', `[data-theme="${app.theme}"]`);
    updateSetupVisibility();
  }

  function updateSetupVisibility() {
    $('levelGroup').style.display = setup.mode === 'bot' ? '' : 'none';
    // в режиме друга часы/лимит недоступны (партия асинхронная, по ссылкам)
    const friend = setup.mode === 'friend';
    for (const id of ['timeLabel', 'timeChips', 'moveLabel', 'moveChips']) {
      $(id).style.display = friend ? 'none' : '';
    }
    $('friendClockHint').hidden = !friend;
  }

  function selectDefault(groupSel, sel) {
    const el = document.querySelector(groupSel + sel) || document.querySelector(groupSel);
    if (el) markActive(groupSel, el);
  }

  function markActive(groupSel, el) {
    document.querySelectorAll(groupSel).forEach(x => x.classList.remove('active'));
    el.classList.add('active');
  }

  function showSetup() {
    $('setupScreen').hidden = false;
    $('gameScreen').hidden = true;
    updateSetupVisibility();
  }

  function resolveSide(side) {
    if (side === 'r') return Math.random() < 0.5 ? 'w' : 'b';
    return side;
  }

  function startGame() {
    app.mode = setup.mode;
    app.level = setup.level;
    app.state = C.newGameState();
    app.history = [];
    app.lastMove = null;
    app.selected = -1;
    app.legalFrom = [];
    app.over = false;
    app.overText = '';
    app.pendingShare = false;
    app.botThinking = false;
    app.paused = false;

    if (app.mode === 'local') {
      app.myColor = null;
      app.orientation = resolveSide(setup.side);
    } else {
      app.myColor = resolveSide(setup.side);
      app.orientation = app.myColor;
    }

    initClock();
    enterGameScreen();

    if (app.mode === 'friend' && app.myColor === 'b') openShare();
    maybeBotMove();
  }

  function emptyClock() {
    return { timeOn: false, movesOn: false, timeMs: { w: 0, b: 0 }, movesLeft: { w: 0, b: 0 }, lastTick: Date.now() };
  }

  function initClock() {
    const cl = emptyClock();
    if (app.mode !== 'friend') {
      if (setup.timeMin > 0) {
        cl.timeOn = true;
        const ms = setup.timeMin * 60000;
        cl.timeMs = { w: ms, b: ms };
      }
      if (setup.moveLim > 0) {
        cl.movesOn = true;
        cl.movesLeft = { w: setup.moveLim, b: setup.moveLim };
      }
    }
    app.clock = cl;
  }

  function enterGameScreen() {
    $('setupScreen').hidden = true;
    $('gameScreen').hidden = false;
    $('btnFlip').style.display = app.mode === 'local' ? 'none' : '';
    $('btnUndo').style.display = app.mode === 'friend' ? 'none' : '';
    $('btnResign').style.display = app.mode === 'friend' ? 'none' : '';
    render();
  }

  /* ========================================================
     ССЫЛКИ (режим друга)
     ======================================================== */
  function startFromLink(encoded) {
    app.mode = 'friend';
    app.state = C.newGameState();
    app.history = [];
    app.lastMove = null;
    app.selected = -1;
    app.legalFrom = [];
    app.over = false;
    app.overText = '';
    app.pendingShare = false;
    app.paused = false;
    app.clock = emptyClock();

    app.theme = localStorage.getItem('chessTheme') || 'classic';
    applyTheme(app.theme);

    const ok = replayMoves(encoded);
    if (!ok) { showSetup(); return; }

    app.myColor = app.state.turn;
    app.orientation = app.state.turn;

    enterGameScreen();
    checkOver();
  }

  function replayMoves(str) {
    let i = 0;
    while (i < str.length) {
      const from = C.nameToSq(str.substr(i, 2));
      const to = C.nameToSq(str.substr(i + 2, 2));
      i += 4;
      const piece = app.state.board[from];
      let promo = '';
      if (piece && C.typeOf(piece) === 'p' && (C.rankOf(to) === 0 || C.rankOf(to) === 7)) {
        promo = str[i]; i += 1;
      }
      const legal = C.legalMoves(app.state).find(m =>
        m.from === from && m.to === to && (!promo || m.promo === promo));
      if (!legal) return false;
      C.makeMove(app.state, legal);
      app.history.push(encodeMove(legal));
      app.lastMove = { from, to };
    }
    return true;
  }

  function encodeMove(m) {
    return C.sqName(m.from) + C.sqName(m.to) + (m.promo || '');
  }

  function buildLink() {
    const base = location.origin + location.pathname;
    return base + '#g=' + app.history.join('');
  }

  function openShare() {
    $('shareLink').value = buildLink();
    $('copyHint').textContent = '';
    $('shareModal').hidden = false;
    app.pendingShare = true;
  }

  /* ========================================================
     ОТРИСОВКА
     ======================================================== */
  function render() {
    renderBoard();
    renderStatus();
    renderHistory();
    renderPlayerBars();
  }

  function colorName(c) { return c === 'w' ? 'Белые' : 'Чёрные'; }

  function renderBoard() {
    elBoard.innerHTML = '';
    const flip = app.orientation === 'b';
    for (let rr = 7; rr >= 0; rr--) {
      for (let ff = 0; ff < 8; ff++) {
        const r = flip ? 7 - rr : rr;
        const f = flip ? 7 - ff : ff;
        const s = C.sq(f, r);
        const cell = document.createElement('div');
        cell.className = 'ch-sq ' + ((f + r) % 2 === 0 ? 'dark' : 'light');
        cell.dataset.sq = s;

        if (ff === 0) {
          const rk = document.createElement('span');
          rk.className = 'ch-coord ch-coord-rank';
          rk.textContent = r + 1;
          cell.appendChild(rk);
        }
        if (rr === 0) {
          const fl = document.createElement('span');
          fl.className = 'ch-coord ch-coord-file';
          fl.textContent = FILE_LETTER(f);
          cell.appendChild(fl);
        }

        if (app.lastMove && (app.lastMove.from === s || app.lastMove.to === s)) cell.classList.add('last');
        if (app.selected === s) cell.classList.add('sel');

        const p = app.state.board[s];
        if (p) {
          const pc = document.createElement('span');
          pc.className = 'ch-piece ' + (C.colorOf(p) === 'w' ? 'white' : 'black');
          pc.textContent = GLYPH[C.typeOf(p)];
          cell.appendChild(pc);
        }

        const lm = app.legalFrom.find(m => m.to === s);
        if (lm) {
          const dot = document.createElement('span');
          dot.className = 'ch-dot' + (app.state.board[s] || lm.flag === 'ep' ? ' cap' : '');
          cell.appendChild(dot);
        }

        // король под шахом — подсветить (в т.ч. при мате)
        if (p && C.typeOf(p) === 'k' && C.inCheck(app.state, C.colorOf(p)) &&
            (C.colorOf(p) === app.state.turn || app.over)) {
          cell.classList.add('check');
        }

        cell.addEventListener('click', () => onCellClick(s));
        elBoard.appendChild(cell);
      }
    }
  }

  function FILE_LETTER(f) { return 'abcdefgh'[f]; }

  function renderStatus() {
    const st = elStatus;
    st.classList.remove('check', 'over');
    let txt = '';
    const turnName = colorName(app.state.turn);
    if (app.over) {
      txt = app.overText || 'Партия окончена';
      st.classList.add('over');
      st.textContent = txt;
      return;
    }
    if (app.botThinking) {
      txt = '🤖 Бот думает…';
    } else if (app.mode === 'friend' && app.pendingShare) {
      txt = 'Ход сделан — отправьте ссылку другу';
    } else if (app.mode === 'friend') {
      txt = `Ваш ход · ${turnName}`;
    } else if (app.mode === 'bot') {
      txt = app.state.turn === app.myColor ? `Ваш ход · ${turnName}` : `Ход бота · ${turnName}`;
    } else {
      txt = `Ход: ${turnName}`;
    }
    if (C.inCheck(app.state, app.state.turn)) {
      txt = '⚠️ ШАХ! ' + txt;
      st.classList.add('check');
    }
    st.textContent = txt;
  }

  function renderHistory() {
    let html = '';
    for (let i = 0; i < app.history.length; i += 2) {
      const n = i / 2 + 1;
      const w = app.history[i] || '';
      const b = app.history[i + 1] || '';
      html += `<span class="ch-move"><b>${n}.</b> ${fmtMove(w)} ${fmtMove(b)}</span>`;
    }
    elHistory.innerHTML = html || '<span class="ch-move-empty">Ходов пока нет</span>';
    elHistory.scrollTop = elHistory.scrollHeight;
  }

  function fmtMove(m) {
    if (!m) return '';
    return m.slice(0, 2) + '→' + m.slice(2, 4) + (m[4] ? '=' + m[4].toUpperCase() : '');
  }

  // Сколько фигур каждого цвета осталось; missing[c] = взятые у цвета c
  function computeMissing() {
    const cnt = { w: {}, b: {} };
    for (const p of app.state.board) {
      if (!p || C.typeOf(p) === 'k') continue;
      cnt[C.colorOf(p)][C.typeOf(p)] = (cnt[C.colorOf(p)][C.typeOf(p)] || 0) + 1;
    }
    const missing = { w: {}, b: {} };
    for (const c of ['w', 'b']) for (const t in START) missing[c][t] = START[t] - (cnt[c][t] || 0);
    return missing;
  }

  function capturedValue(missingOfEnemy) {
    let v = 0;
    for (const t in missingOfEnemy) v += missingOfEnemy[t] * VAL[t];
    return v;
  }

  // Отрисовка панелей игроков: имя, съеденные фигуры, перевес, часы
  function renderPlayerBars() {
    const missing = computeMissing();
    const bottomColor = app.orientation;      // цвет снизу
    const topColor = bottomColor === 'w' ? 'b' : 'w';

    // Взятые игроком = отсутствующие фигуры соперника
    const capByBottom = missing[topColor];    // рисуем в цвете topColor
    const capByTop = missing[bottomColor];

    // Перевес по материалу
    const valBottom = capturedValue(missing[topColor]);
    const valTop = capturedValue(missing[bottomColor]);
    const advBottom = valBottom - valTop;

    fillBar('bot', bottomColor, capByBottom, topColor, advBottom);
    fillBar('top', topColor, capByTop, bottomColor, -advBottom);
    updateClocks();
  }

  function fillBar(which, color, captured, capturedColor, adv) {
    $(which + 'Name').textContent = colorName(color) + (turnIsColor(color) && !app.over ? ' ●' : '');
    // съеденные фигуры (в цвете соперника, мелко)
    let pcs = '';
    for (const t of ['q', 'r', 'b', 'n', 'p']) {
      for (let k = 0; k < (captured[t] || 0); k++) {
        pcs += `<span class="pb-piece ${capturedColor === 'w' ? 'white' : 'black'}">${GLYPH[t]}</span>`;
      }
    }
    $(which + 'Captured').innerHTML = pcs;
    $(which + 'Adv').textContent = adv > 0 ? '+' + adv : '';
  }

  function turnIsColor(c) { return app.state && app.state.turn === c; }

  /* ========================================================
     ЧАСЫ / ЛИМИТ
     ======================================================== */
  function startClockLoop() {
    setInterval(() => {
      const cl = app.clock;
      if (!cl.timeOn) return;
      if (app.over || app.paused || app.state == null) { cl.lastTick = Date.now(); return; }
      if (app.mode === 'friend') return;
      const now = Date.now();
      const dt = now - cl.lastTick;
      cl.lastTick = now;
      const c = app.state.turn;
      cl.timeMs[c] -= dt;
      if (cl.timeMs[c] <= 0) {
        cl.timeMs[c] = 0;
        updateClocks();
        finishGame({ type: 'time', loser: c });
        return;
      }
      updateClocks();
    }, 200);
  }

  function fmtTime(ms) {
    if (ms < 0) ms = 0;
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateClocks() {
    const cl = app.clock;
    const bottomColor = app.orientation;
    const topColor = bottomColor === 'w' ? 'b' : 'w';
    setClock('bot', bottomColor, cl);
    setClock('top', topColor, cl);
  }

  function setClock(which, color, cl) {
    const el = $(which + 'Clock');
    if (!cl.timeOn && !cl.movesOn) { el.hidden = true; return; }
    el.hidden = false;
    el.classList.remove('active', 'low');
    const active = !app.over && app.state && app.state.turn === color;
    if (active) el.classList.add('active');
    const parts = [];
    let low = false;
    if (cl.timeOn) {
      parts.push('⏱️ ' + fmtTime(cl.timeMs[color]));
      if (cl.timeMs[color] <= 20000) low = true;
    }
    if (cl.movesOn) {
      parts.push('🔢 ' + cl.movesLeft[color]);
      if (cl.movesLeft[color] <= 3) low = true;
    }
    el.textContent = parts.join('  ·  ');
    if (low) el.classList.add('low');
  }

  /* ========================================================
     ХОДЫ ИГРОКА
     ======================================================== */
  function canMoveNow() {
    if (app.over || app.botThinking || app.paused) return false;
    if (app.mode === 'friend' && app.pendingShare) return false;
    if (app.mode === 'bot' && app.state.turn !== app.myColor) return false;
    return true;
  }

  function onCellClick(s) {
    if (!canMoveNow()) return;
    const p = app.state.board[s];

    if (p && C.colorOf(p) === app.state.turn) {
      if ((app.mode === 'bot' || app.mode === 'friend') && C.colorOf(p) !== app.myColor) {
        // чужая фигура — ниже попытка хода
      } else {
        app.selected = s;
        app.legalFrom = C.legalMovesFrom(app.state, s);
        renderBoard();
        return;
      }
    }

    if (app.selected >= 0) {
      const target = app.legalFrom.filter(m => m.to === s);
      if (target.length) {
        if (target.length > 1) {
          app.paused = true;
          askPromotion(app.state.turn, (promo) => {
            app.paused = false;
            app.clock.lastTick = Date.now();
            const mv = target.find(m => m.promo === promo);
            doMove(mv);
          });
        } else {
          doMove(target[0]);
        }
        return;
      }
    }
    app.selected = -1;
    app.legalFrom = [];
    renderBoard();
  }

  function applyMove(m) {
    const mover = app.state.turn;
    C.makeMove(app.state, m);
    app.history.push(encodeMove(m));
    app.lastMove = { from: m.from, to: m.to };
    if (app.clock.movesOn) app.clock.movesLeft[mover]--;
    app.clock.lastTick = Date.now();
  }

  function doMove(m) {
    applyMove(m);
    app.selected = -1;
    app.legalFrom = [];
    if (app.mode === 'local') app.orientation = app.state.turn;

    render();
    if (checkOver()) return;

    if (app.mode === 'friend') openShare();
    else if (app.mode === 'bot') maybeBotMove();
  }

  function maybeBotMove() {
    if (app.mode !== 'bot' || app.over) return;
    if (app.state.turn === app.myColor) return;
    app.botThinking = true;
    renderStatus();
    setTimeout(() => {
      if (app.over) { app.botThinking = false; return; }
      const m = C.botMove(app.state, app.level);
      app.botThinking = false;
      if (!m) { checkOver(); return; }
      applyMove(m);
      render();
      checkOver();
    }, 320);
  }

  /* ========================================================
     ОКОНЧАНИЕ ПАРТИИ
     ======================================================== */
  // Проверка естественного конца (мат/пат/ничья) + лимита ходов
  function checkOver() {
    const st = C.gameStatus(app.state);
    if (st === 'checkmate') {
      finishGame({ type: 'checkmate', winner: app.state.turn === 'w' ? 'b' : 'w' });
      return true;
    }
    if (st === 'stalemate') { finishGame({ type: 'stalemate' }); return true; }
    if (st === 'draw') { finishGame({ type: 'draw', reason: 'material50' }); return true; }

    // лимит ходов: у того, чей сейчас ход, кончились ходы
    if (app.clock.movesOn && app.clock.movesLeft[app.state.turn] <= 0) {
      finishGame({ type: 'moves' });
      return true;
    }
    return false;
  }

  function materialWinner() {
    const missing = computeMissing();
    // остаток материала = стартовый минус взятый
    const netW = capturedValue(missing.b) - capturedValue(missing.w); // + => белые ведут
    if (netW > 0) return { winner: 'w', adv: netW };
    if (netW < 0) return { winner: 'b', adv: -netW };
    return { winner: null, adv: 0 };
  }

  function finishGame(res) {
    if (app.over) return;
    app.over = true;
    app.selected = -1;
    app.legalFrom = [];
    app.pendingShare = false;

    let ico = '🤝', title = 'Ничья', text = '';

    if (res.type === 'checkmate') {
      ico = '♚'; title = 'Мат!';
      text = `${colorName(res.winner)} выиграли! 🎉`;
    } else if (res.type === 'stalemate') {
      ico = '🤝'; title = 'Пат — ничья';
      text = 'Ходить нечем, но шаха нет. Ничья.';
    } else if (res.type === 'time') {
      const winner = res.loser === 'w' ? 'b' : 'w';
      ico = '⏱️'; title = 'Время вышло';
      text = `У ${colorName(res.loser).toLowerCase()} закончилось время. ${colorName(winner)} выиграли! 🎉`;
    } else if (res.type === 'moves') {
      const mw = materialWinner();
      ico = '🔢';
      if (mw.winner) { title = 'Лимит ходов'; text = `Ходы закончились. ${colorName(mw.winner)} выиграли по материалу (+${mw.adv}). 🎉`; }
      else { title = 'Лимит ходов — ничья'; text = 'Ходы закончились, материал равный. Ничья.'; }
    } else if (res.type === 'resign') {
      const winner = res.loser === 'w' ? 'b' : 'w';
      ico = '🏳️'; title = 'Сдача';
      text = `${colorName(res.loser)} сдались. ${colorName(winner)} выиграли! 🎉`;
    } else { // draw
      ico = '🤝'; title = 'Ничья';
      text = 'Недостаточно материала или правило 50 ходов.';
    }

    app.overText = ico + ' ' + title + ' — ' + text;
    render();
    $('overIco').textContent = ico;
    $('overTitle').textContent = title;
    $('overText').textContent = text;
    $('shareModal').hidden = true;
    $('overModal').hidden = false;
  }

  /* ========================================================
     ПРЕВРАЩЕНИЕ ПЕШКИ
     ======================================================== */
  function askPromotion(color, cb) {
    const row = $('promoRow');
    row.innerHTML = '';
    for (const t of ['q', 'r', 'b', 'n']) {
      const btn = document.createElement('button');
      btn.className = 'ch-promo ' + (color === 'w' ? 'white' : 'black');
      btn.textContent = GLYPH[t];
      btn.addEventListener('click', () => {
        $('promoModal').hidden = true;
        cb(t);
      });
      row.appendChild(btn);
    }
    $('promoModal').hidden = false;
  }

  /* ========================================================
     ТЕМЫ
     ======================================================== */
  function applyTheme(name) {
    document.body.setAttribute('data-chess-theme', name);
  }

  /* ========================================================
     КНОПКИ + МОДАЛКИ
     ======================================================== */
  function bindGame() {
    $('btnMenu').addEventListener('click', () => {
      if (confirm('Выйти в меню? Текущая партия будет прекращена.')) {
        location.hash = '';
        showSetup();
      }
    });

    $('btnFlip').addEventListener('click', () => {
      app.orientation = app.orientation === 'w' ? 'b' : 'w';
      renderBoard();
      renderPlayerBars();
    });

    $('btnUndo').addEventListener('click', () => undoLast());

    $('btnResign').addEventListener('click', () => {
      if (app.over) return;
      if (!confirm('Сдаться?')) return;
      const loser = app.mode === 'bot' ? app.myColor : app.state.turn;
      finishGame({ type: 'resign', loser });
    });

    $('btnNewGame').addEventListener('click', () => {
      $('overModal').hidden = true;
      location.hash = '';
      showSetup();
    });

    $('btnCopy').addEventListener('click', () => {
      const inp = $('shareLink');
      inp.select();
      copyText(inp.value).then(ok => {
        $('copyHint').textContent = ok ? '✓ Ссылка скопирована' : 'Скопируйте вручную (выделено выше)';
      });
    });
    $('btnShareEdit').addEventListener('click', () => {
      $('shareModal').hidden = true;
      app.pendingShare = false;
      undoLast(true);
    });
  }

  function undoLast(single) {
    if (app.history.length === 0 || app.over) return;
    const back = (app.mode === 'bot' && !single) ? 2 : 1;
    const target = Math.max(0, app.history.length - back);
    const moves = app.history.slice(0, target);
    app.state = C.newGameState();
    app.history = [];
    app.lastMove = null;
    for (const code of moves) {
      const from = C.nameToSq(code.substr(0, 2));
      const to = C.nameToSq(code.substr(2, 2));
      const promo = code[4] || '';
      const lm = C.legalMoves(app.state).find(m => m.from === from && m.to === to && (!promo || m.promo === promo));
      if (!lm) break;
      C.makeMove(app.state, lm);
      app.history.push(encodeMove(lm));
      app.lastMove = { from, to };
    }
    app.selected = -1; app.legalFrom = [];
    app.over = false; app.pendingShare = false;
    // пересчёт лимита ходов из истории (по времени — оставляем как есть)
    if (app.clock.movesOn) {
      let w = 0, b = 0;
      for (let i = 0; i < app.history.length; i++) (i % 2 === 0 ? w++ : b++);
      app.clock.movesLeft.w = setup.moveLim - w;
      app.clock.movesLeft.b = setup.moveLim - b;
    }
    app.clock.lastTick = Date.now();
    if (app.mode === 'local') app.orientation = app.state.turn;
    render();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    try { return Promise.resolve(document.execCommand('copy')); }
    catch (e) { return Promise.resolve(false); }
  }

})();
