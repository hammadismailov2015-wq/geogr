/* ============================================================
   ШАХМАТЫ — интерфейс (экраны, доска, режимы, темы, ссылки)
   ============================================================ */
(function () {
  const C = window.Chess;

  // Юникод-глифы фигур (сплошные, цвет задаём через CSS)
  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

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
    pendingShare: false,// в режиме друга сделан ход — надо поделиться ссылкой
    botThinking: false,
    theme: 'classic'
  };

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  let elBoard, elStatus, elHistory, elCaptured;

  /* ========================================================
     ЗАПУСК
     ======================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    buildLayout();
    // тема из памяти
    app.theme = localStorage.getItem('chessTheme') || 'classic';
    applyTheme(app.theme);
    // если в ссылке есть партия — открываем режим друга
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
          <p>Выберите режим, сторону и оформление — и начинайте партию.</p>
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
        <div class="ch-board-wrap">
          <div class="ch-board" id="chBoard"></div>
        </div>
        <div class="ch-captured" id="chCaptured"></div>
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
        <div class="ch-modal-box">
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
    elCaptured = $('chCaptured');

    bindSetup();
    bindGame();
  }

  /* ========================================================
     НАСТРОЙКА
     ======================================================== */
  let setup = { mode: 'bot', side: 'w', level: 2 };

  function bindSetup() {
    $('modeCards').addEventListener('click', (e) => {
      const c = e.target.closest('.ch-card'); if (!c) return;
      setup.mode = c.dataset.mode;
      markActive('#modeCards .ch-card', c);
      // сложность показываем только для бота
      $('levelGroup').style.display = setup.mode === 'bot' ? '' : 'none';
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
    selectDefault('#themeChoices .ch-theme', `[data-theme="${app.theme}"]`);
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
    $('levelGroup').style.display = setup.mode === 'bot' ? '' : 'none';
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
    app.over = false;
    app.pendingShare = false;
    app.botThinking = false;

    if (app.mode === 'local') {
      // сидим рядом: игрок снизу — тот, чей ход; выбор стороны = стартовая ориентация
      app.myColor = null;
      app.orientation = resolveSide(setup.side);
    } else if (app.mode === 'friend') {
      app.myColor = resolveSide(setup.side);
      app.orientation = app.myColor;
    } else { // bot
      app.myColor = resolveSide(setup.side);
      app.orientation = app.myColor;
    }

    enterGameScreen();

    // Для друга: если создатель играет чёрными — он сразу отдаёт ссылку белым
    if (app.mode === 'friend' && app.myColor === 'b') {
      openShare();
    }
    // Для бота: если ход бота — пусть думает
    maybeBotMove();
  }

  function enterGameScreen() {
    $('setupScreen').hidden = true;
    $('gameScreen').hidden = false;
    // кнопки под режим
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
    app.over = false;
    app.pendingShare = false;

    // тема из памяти (у каждого своя)
    app.theme = localStorage.getItem('chessTheme') || 'classic';
    applyTheme(app.theme);

    const ok = replayMoves(encoded);
    if (!ok) { showSetup(); return; }

    // открывающий ссылку играет за того, чей сейчас ход
    app.myColor = app.state.turn;
    app.orientation = app.state.turn;

    enterGameScreen();
    checkOver();
  }

  // Восстанавливаем позицию, применяя ходы из строки
  function replayMoves(str) {
    let i = 0;
    while (i < str.length) {
      const from = C.nameToSq(str.substr(i, 2));
      const to = C.nameToSq(str.substr(i + 2, 2));
      i += 4;
      const piece = app.state.board[from];
      let promo = '';
      // если пешка идёт на последнюю горизонталь — читаем букву превращения
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
     ОТРИСОВКА ДОСКИ
     ======================================================== */
  function render() {
    renderBoard();
    renderStatus();
    renderHistory();
    renderCaptured();
  }

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

        // координаты по краю
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

        // подсветки
        if (app.lastMove && (app.lastMove.from === s || app.lastMove.to === s)) cell.classList.add('last');
        if (app.selected === s) cell.classList.add('sel');

        const p = app.state.board[s];
        if (p) {
          const pc = document.createElement('span');
          pc.className = 'ch-piece ' + (C.colorOf(p) === 'w' ? 'white' : 'black');
          pc.textContent = GLYPH[C.typeOf(p)];
          cell.appendChild(pc);
        }

        // точки допустимых ходов
        const lm = app.legalFrom.find(m => m.to === s);
        if (lm) {
          const dot = document.createElement('span');
          dot.className = 'ch-dot' + (app.state.board[s] || lm.flag === 'ep' ? ' cap' : '');
          cell.appendChild(dot);
        }

        // шах — подсветить короля
        if (p && C.typeOf(p) === 'k' && C.colorOf(p) === app.state.turn && C.inCheck(app.state, app.state.turn)) {
          cell.classList.add('check');
        }

        cell.addEventListener('click', () => onCellClick(s));
        elBoard.appendChild(cell);
      }
    }
  }

  function FILE_LETTER(f) { return 'abcdefgh'[f]; }

  function renderStatus() {
    let txt = '';
    const turnName = app.state.turn === 'w' ? 'Белые' : 'Чёрные';
    if (app.over) {
      txt = app.overText || 'Партия окончена';
    } else if (app.botThinking) {
      txt = '🤖 Бот думает…';
    } else if (app.mode === 'friend' && app.pendingShare) {
      txt = 'Ход сделан — отправьте ссылку другу';
    } else if (app.mode === 'friend') {
      txt = `Ваш ход (${turnName})`;
    } else if (app.mode === 'bot') {
      txt = app.state.turn === app.myColor ? `Ваш ход (${turnName})` : `Ход бота (${turnName})`;
    } else {
      txt = `Ход: ${turnName}`;
    }
    if (!app.over && C.inCheck(app.state, app.state.turn)) txt += ' — Шах!';
    elStatus.textContent = txt;
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

  function renderCaptured() {
    const start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const cnt = { w: {}, b: {} };
    for (const p of app.state.board) {
      if (!p || C.typeOf(p) === 'k') continue;
      cnt[C.colorOf(p)][C.typeOf(p)] = (cnt[C.colorOf(p)][C.typeOf(p)] || 0) + 1;
    }
    const capOf = (color) => {
      let s = '';
      for (const t of ['q', 'r', 'b', 'n', 'p']) {
        const lost = start[t] - (cnt[color][t] || 0);
        for (let k = 0; k < lost; k++) s += GLYPH[t];
      }
      return s;
    };
    // показываем взятые игроком фигуры соперника
    elCaptured.innerHTML =
      `<span class="cap-line white">${capOf('b')}</span>` +
      `<span class="cap-line black">${capOf('w')}</span>`;
  }

  /* ========================================================
     ХОДЫ ИГРОКА
     ======================================================== */
  function canMoveNow() {
    if (app.over || app.botThinking) return false;
    if (app.mode === 'friend' && app.pendingShare) return false;
    if (app.mode === 'bot' && app.state.turn !== app.myColor) return false;
    return true;
  }

  function onCellClick(s) {
    if (!canMoveNow()) return;
    const p = app.state.board[s];

    // выбор своей фигуры
    if (p && C.colorOf(p) === app.state.turn) {
      // в режиме бота/друга — только своими
      if ((app.mode === 'bot' || app.mode === 'friend') && C.colorOf(p) !== app.myColor) {
        // клик по чужой — попытка хода, обрабатываем ниже
      } else {
        app.selected = s;
        app.legalFrom = C.legalMovesFrom(app.state, s);
        renderBoard();
        return;
      }
    }

    // попытка сделать ход выбранной фигурой
    if (app.selected >= 0) {
      const target = app.legalFrom.filter(m => m.to === s);
      if (target.length) {
        if (target.length > 1) {
          // превращение — спросить фигуру
          askPromotion(app.state.turn, (promo) => {
            const mv = target.find(m => m.promo === promo);
            doMove(mv);
          });
        } else {
          doMove(target[0]);
        }
        return;
      }
    }
    // сброс выбора
    app.selected = -1;
    app.legalFrom = [];
    renderBoard();
  }

  function doMove(m) {
    C.makeMove(app.state, m);
    app.history.push(encodeMove(m));
    app.lastMove = { from: m.from, to: m.to };
    app.selected = -1;
    app.legalFrom = [];

    if (app.mode === 'local') {
      // переворот экрана для следующего игрока
      app.orientation = app.state.turn;
    }

    render();

    if (checkOver()) return;

    if (app.mode === 'friend') {
      openShare();          // предлагаем поделиться ссылкой
    } else if (app.mode === 'bot') {
      maybeBotMove();
    }
  }

  function maybeBotMove() {
    if (app.mode !== 'bot' || app.over) return;
    if (app.state.turn === app.myColor) return;
    app.botThinking = true;
    renderStatus();
    // задержка, чтобы был виден процесс
    setTimeout(() => {
      const m = C.botMove(app.state, app.level);
      app.botThinking = false;
      if (!m) { checkOver(); return; }
      C.makeMove(app.state, m);
      app.history.push(encodeMove(m));
      app.lastMove = { from: m.from, to: m.to };
      render();
      checkOver();
    }, 300);
  }

  /* ========================================================
     ОКОНЧАНИЕ ПАРТИИ
     ======================================================== */
  function checkOver() {
    const st = C.gameStatus(app.state);
    if (st === 'playing') return false;
    app.over = true;
    let title = '', text = '';
    if (st === 'checkmate') {
      const winner = app.state.turn === 'w' ? 'Чёрные' : 'Белые';
      title = '♚ Мат!';
      text = `${winner} победили.`;
    } else if (st === 'stalemate') {
      title = '🤝 Пат';
      text = 'Ничья — ходить нечем, но шаха нет.';
    } else {
      title = '🤝 Ничья';
      text = 'Недостаточно материала или правило 50 ходов.';
    }
    app.overText = title + ' ' + text;
    render();
    $('overTitle').textContent = title;
    $('overText').textContent = text;
    $('shareModal').hidden = true;
    $('overModal').hidden = false;
    return true;
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
     КНОПКИ ИГРОВОГО ЭКРАНА + МОДАЛКИ
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
    });

    $('btnUndo').addEventListener('click', () => {
      undoLast();
    });

    $('btnResign').addEventListener('click', () => {
      if (app.over) return;
      if (!confirm('Сдаться?')) return;
      app.over = true;
      const loser = app.mode === 'bot' ? 'Вы' : (app.state.turn === 'w' ? 'Белые' : 'Чёрные');
      $('overTitle').textContent = '🏳️ Сдача';
      $('overText').textContent = `${loser} сдались.`;
      app.overText = 'Сдача';
      renderStatus();
      $('overModal').hidden = false;
    });

    $('btnNewGame').addEventListener('click', () => {
      $('overModal').hidden = true;
      location.hash = '';
      showSetup();
    });

    // модалка ссылки
    $('btnCopy').addEventListener('click', () => {
      const inp = $('shareLink');
      inp.select();
      copyText(inp.value).then(ok => {
        $('copyHint').textContent = ok ? '✓ Ссылка скопирована' : 'Скопируйте вручную (выделено выше)';
      });
    });
    $('btnShareEdit').addEventListener('click', () => {
      // передумал ходить — отменяем последний ход и закрываем модалку
      $('shareModal').hidden = true;
      app.pendingShare = false;
      undoLast(true);
    });
  }

  function undoLast(single) {
    // Отменяем ход(ы). Для бота — два хода (свой и бота), для остальных — один.
    if (app.history.length === 0 || app.over) { if (app.over) { /* нельзя */ } return; }
    const back = (app.mode === 'bot' && !single) ? 2 : 1;
    // проще перестроить состояние с нуля из истории
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
    if (app.mode === 'local') app.orientation = app.state.turn;
    render();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    try {
      const ok = document.execCommand('copy');
      return Promise.resolve(ok);
    } catch (e) { return Promise.resolve(false); }
  }

})();
