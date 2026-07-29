/* ============================================================
   ШАХМАТЫ — движок + интерфейс
   Один файл, без зависимостей, работает из index.html/file://
   ============================================================ */

/* ---------- Представление доски ----------
   Клетки 0..63, sq = rank*8 + file.
   file 0..7 = a..h, rank 0..7 = 1..8 (rank 0 — нижний ряд белых).
   Фигура — строка вида 'wp','wn','wb','wr','wq','wk' или 'b...'. Пусто = null.
------------------------------------------------------------- */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

function sq(file, rank) { return rank * 8 + file; }
function fileOf(s) { return s % 8; }
function rankOf(s) { return (s / 8) | 0; }
function onBoard(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }
function sqName(s) { return FILES[fileOf(s)] + (rankOf(s) + 1); }
function nameToSq(nm) { return sq(FILES.indexOf(nm[0]), parseInt(nm[1], 10) - 1); }

function colorOf(p) { return p ? p[0] : null; }
function typeOf(p) { return p ? p[1] : null; }
function opp(c) { return c === 'w' ? 'b' : 'w'; }

// Начальная расстановка
function initialBoard() {
  const b = new Array(64).fill(null);
  const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let f = 0; f < 8; f++) {
    b[sq(f, 0)] = 'w' + back[f];
    b[sq(f, 1)] = 'wp';
    b[sq(f, 6)] = 'bp';
    b[sq(f, 7)] = 'b' + back[f];
  }
  return b;
}

function newGameState() {
  return {
    board: initialBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    ep: -1,          // клетка «на проходе» или -1
    half: 0,         // счётчик 50 ходов
    full: 1
  };
}

/* ---------- Атака клетки ---------- */
const KNIGHT_D = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const KING_D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const BISHOP_D = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_D = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function isAttacked(board, s, byColor) {
  const f = fileOf(s), r = rankOf(s);

  // пешки
  const pr = byColor === 'w' ? r - 1 : r + 1; // ряд, где стоит атакующая пешка
  for (const df of [-1, 1]) {
    if (onBoard(f + df, pr)) {
      const p = board[sq(f + df, pr)];
      if (p === byColor + 'p') return true;
    }
  }
  // кони
  for (const [df, dr] of KNIGHT_D) {
    if (onBoard(f + df, r + dr)) {
      const p = board[sq(f + df, r + dr)];
      if (p === byColor + 'n') return true;
    }
  }
  // король
  for (const [df, dr] of KING_D) {
    if (onBoard(f + df, r + dr)) {
      const p = board[sq(f + df, r + dr)];
      if (p === byColor + 'k') return true;
    }
  }
  // слон/ферзь по диагоналям
  for (const [df, dr] of BISHOP_D) {
    let nf = f + df, nr = r + dr;
    while (onBoard(nf, nr)) {
      const p = board[sq(nf, nr)];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === 'b' || typeOf(p) === 'q')) return true;
        break;
      }
      nf += df; nr += dr;
    }
  }
  // ладья/ферзь по прямым
  for (const [df, dr] of ROOK_D) {
    let nf = f + df, nr = r + dr;
    while (onBoard(nf, nr)) {
      const p = board[sq(nf, nr)];
      if (p) {
        if (colorOf(p) === byColor && (typeOf(p) === 'r' || typeOf(p) === 'q')) return true;
        break;
      }
      nf += df; nr += dr;
    }
  }
  return false;
}

function kingSquare(board, color) {
  for (let i = 0; i < 64; i++) if (board[i] === color + 'k') return i;
  return -1;
}

function inCheck(state, color) {
  return isAttacked(state.board, kingSquare(state.board, color), opp(color));
}

/* ---------- Генерация псевдоходов ---------- */
// move: {from,to,promo,flag}  flag: 'n'|'double'|'ep'|'cK'|'cQ'
function pseudoMoves(state) {
  const { board, turn } = state;
  const moves = [];
  for (let s = 0; s < 64; s++) {
    const p = board[s];
    if (!p || colorOf(p) !== turn) continue;
    const f = fileOf(s), r = rankOf(s), t = typeOf(p);

    if (t === 'p') {
      const dir = turn === 'w' ? 1 : -1;
      const startRank = turn === 'w' ? 1 : 6;
      const promoRank = turn === 'w' ? 7 : 0;
      // вперёд на 1
      if (onBoard(f, r + dir) && !board[sq(f, r + dir)]) {
        addPawn(moves, s, sq(f, r + dir), r + dir === promoRank, 'n');
        // вперёд на 2
        if (r === startRank && !board[sq(f, r + 2 * dir)]) {
          moves.push({ from: s, to: sq(f, r + 2 * dir), promo: '', flag: 'double' });
        }
      }
      // взятия
      for (const df of [-1, 1]) {
        const nf = f + df, nr = r + dir;
        if (!onBoard(nf, nr)) continue;
        const target = board[sq(nf, nr)];
        if (target && colorOf(target) !== turn) {
          addPawn(moves, s, sq(nf, nr), nr === promoRank, 'n');
        }
        if (state.ep === sq(nf, nr)) {
          moves.push({ from: s, to: sq(nf, nr), promo: '', flag: 'ep' });
        }
      }
    } else if (t === 'n') {
      for (const [df, dr] of KNIGHT_D) stepMove(board, moves, s, f + df, r + dr, turn);
    } else if (t === 'k') {
      for (const [df, dr] of KING_D) stepMove(board, moves, s, f + df, r + dr, turn);
      addCastling(state, moves, s, turn);
    } else {
      // слон / ладья / ферзь — скользящие фигуры
      const rays = t === 'b' ? BISHOP_D : t === 'r' ? ROOK_D : BISHOP_D.concat(ROOK_D);
      for (const [df, dr] of rays) {
        let nf = f + df, nr = r + dr;
        while (onBoard(nf, nr)) {
          const target = board[sq(nf, nr)];
          if (!target) moves.push({ from: s, to: sq(nf, nr), promo: '', flag: 'n' });
          else { if (colorOf(target) !== turn) moves.push({ from: s, to: sq(nf, nr), promo: '', flag: 'n' }); break; }
          nf += df; nr += dr;
        }
      }
    }
  }
  return moves;
}

function addPawn(moves, from, to, isPromo, flag) {
  if (isPromo) {
    for (const pr of ['q', 'r', 'b', 'n']) moves.push({ from, to, promo: pr, flag });
  } else {
    moves.push({ from, to, promo: '', flag });
  }
}

function stepMove(board, moves, from, nf, nr, turn) {
  if (!onBoard(nf, nr)) return;
  const target = board[sq(nf, nr)];
  if (!target || colorOf(target) !== turn) moves.push({ from, to: sq(nf, nr), promo: '', flag: 'n' });
}

function addCastling(state, moves, kingSq, turn) {
  const { board, castling } = state;
  const r = turn === 'w' ? 0 : 7;
  if (kingSq !== sq(4, r)) return;
  if (inCheck(state, turn)) return;
  const enemy = opp(turn);
  // короткая
  const canK = turn === 'w' ? castling.wK : castling.bK;
  if (canK && !board[sq(5, r)] && !board[sq(6, r)] && board[sq(7, r)] === turn + 'r') {
    if (!isAttacked(board, sq(5, r), enemy) && !isAttacked(board, sq(6, r), enemy)) {
      moves.push({ from: kingSq, to: sq(6, r), promo: '', flag: 'cK' });
    }
  }
  // длинная
  const canQ = turn === 'w' ? castling.wQ : castling.bQ;
  if (canQ && !board[sq(3, r)] && !board[sq(2, r)] && !board[sq(1, r)] && board[sq(0, r)] === turn + 'r') {
    if (!isAttacked(board, sq(3, r), enemy) && !isAttacked(board, sq(2, r), enemy)) {
      moves.push({ from: kingSq, to: sq(2, r), promo: '', flag: 'cQ' });
    }
  }
}

/* ---------- Применение / отмена хода ---------- */
function makeMove(state, m) {
  const b = state.board;
  const piece = b[m.from];
  const color = colorOf(piece);
  const undo = {
    m, captured: b[m.to],
    castling: { ...state.castling },
    ep: state.ep, half: state.half, full: state.full,
    epCaptured: null, epSq: -1
  };

  b[m.to] = piece;
  b[m.from] = null;

  if (m.flag === 'ep') {
    const capSq = sq(fileOf(m.to), rankOf(m.from));
    undo.epCaptured = b[capSq];
    undo.epSq = capSq;
    b[capSq] = null;
  }
  if (m.promo) b[m.to] = color + m.promo;

  if (m.flag === 'cK') { const r = rankOf(m.from); b[sq(5, r)] = b[sq(7, r)]; b[sq(7, r)] = null; }
  if (m.flag === 'cQ') { const r = rankOf(m.from); b[sq(3, r)] = b[sq(0, r)]; b[sq(0, r)] = null; }

  // права рокировки
  if (typeOf(piece) === 'k') {
    if (color === 'w') { state.castling.wK = false; state.castling.wQ = false; }
    else { state.castling.bK = false; state.castling.bQ = false; }
  }
  const clr = (s) => {
    if (s === sq(0, 0)) state.castling.wQ = false;
    if (s === sq(7, 0)) state.castling.wK = false;
    if (s === sq(0, 7)) state.castling.bQ = false;
    if (s === sq(7, 7)) state.castling.bK = false;
  };
  clr(m.from); clr(m.to);

  // клетка на проходе
  state.ep = m.flag === 'double' ? sq(fileOf(m.from), (rankOf(m.from) + rankOf(m.to)) / 2) : -1;

  // 50 ходов
  if (typeOf(piece) === 'p' || undo.captured) state.half = 0; else state.half++;
  if (color === 'b') state.full++;
  state.turn = opp(color);
  return undo;
}

function undoMove(state, undo) {
  const b = state.board;
  const m = undo.m;
  const moved = b[m.to];
  const color = state.turn === 'w' ? 'b' : 'w'; // тот, кто ходил
  // вернуть фигуру (учесть превращение)
  b[m.from] = m.promo ? color + 'p' : moved;
  b[m.to] = undo.captured;

  if (m.flag === 'ep') { b[m.to] = null; b[undo.epSq] = undo.epCaptured; }
  if (m.flag === 'cK') { const r = rankOf(m.from); b[sq(7, r)] = b[sq(5, r)]; b[sq(5, r)] = null; }
  if (m.flag === 'cQ') { const r = rankOf(m.from); b[sq(0, r)] = b[sq(3, r)]; b[sq(3, r)] = null; }

  state.castling = undo.castling;
  state.ep = undo.ep;
  state.half = undo.half;
  state.full = undo.full;
  state.turn = color;
}

/* ---------- Легальные ходы ---------- */
function legalMoves(state) {
  const res = [];
  for (const m of pseudoMoves(state)) {
    const u = makeMove(state, m);
    // после хода проверяем, не под шахом ли король сходившей стороны
    const moverColor = opp(state.turn);
    if (!isAttacked(state.board, kingSquare(state.board, moverColor), state.turn)) res.push(m);
    undoMove(state, u);
  }
  return res;
}

function legalMovesFrom(state, from) {
  return legalMoves(state).filter(m => m.from === from);
}

// Статус партии: 'playing' | 'checkmate' | 'stalemate' | 'draw'
function gameStatus(state) {
  const moves = legalMoves(state);
  if (moves.length === 0) {
    return inCheck(state, state.turn) ? 'checkmate' : 'stalemate';
  }
  if (state.half >= 100) return 'draw';
  if (insufficientMaterial(state.board)) return 'draw';
  return 'playing';
}

function insufficientMaterial(board) {
  const pieces = [];
  for (const p of board) if (p) pieces.push(typeOf(p));
  const nonKing = pieces.filter(t => t !== 'k');
  if (nonKing.length === 0) return true;                      // K vs K
  if (nonKing.length === 1 && (nonKing[0] === 'b' || nonKing[0] === 'n')) return true; // K+minor
  return false;
}

/* ============================================================
   БОТ — минимакс с альфа-бета отсечением
   ============================================================ */
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Позиционные таблицы (взгляд белых, снизу вверх по рядам 1..8)
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5, -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40, -40, -30, -30, -20, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30]
};

function evaluate(state) {
  let score = 0;
  const b = state.board;
  for (let s = 0; s < 64; s++) {
    const p = b[s];
    if (!p) continue;
    const t = typeOf(p);
    const base = VAL[t] + PST[t][colorOf(p) === 'w' ? s : mirror(s)];
    score += colorOf(p) === 'w' ? base : -base;
  }
  return score; // положительное — хорошо для белых
}

function mirror(s) { return sq(fileOf(s), 7 - rankOf(s)); }

function orderMoves(state, moves) {
  const b = state.board;
  return moves.map(m => {
    let s = 0;
    const cap = b[m.to];
    if (cap) s += 10 * VAL[typeOf(cap)] - VAL[typeOf(b[m.from])];
    if (m.promo) s += VAL[m.promo];
    return { m, s };
  }).sort((a, z) => z.s - a.s).map(x => x.m);
}

function search(state, depth, alpha, beta) {
  if (depth === 0) return evaluate(state);
  const moves = legalMoves(state);
  if (moves.length === 0) {
    if (inCheck(state, state.turn)) return state.turn === 'w' ? -100000 - depth : 100000 + depth;
    return 0; // пат
  }
  const ordered = orderMoves(state, moves);
  if (state.turn === 'w') {
    let best = -Infinity;
    for (const m of ordered) {
      const u = makeMove(state, m);
      best = Math.max(best, search(state, depth - 1, alpha, beta));
      undoMove(state, u);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of ordered) {
      const u = makeMove(state, m);
      best = Math.min(best, search(state, depth - 1, alpha, beta));
      undoMove(state, u);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// Выбор хода ботом. level: 1 (лёгкий), 2 (средний), 3 (сложный)
function botMove(state, level) {
  const depth = level === 1 ? 1 : level === 2 ? 2 : 3;
  const moves = orderMoves(state, legalMoves(state));
  if (moves.length === 0) return null;

  // Лёгкий уровень иногда ходит случайно, чтобы можно было выиграть
  if (level === 1 && Math.random() < 0.35) {
    return moves[(Math.random() * moves.length) | 0];
  }

  let bestScore = state.turn === 'w' ? -Infinity : Infinity;
  let best = [];
  for (const m of moves) {
    const u = makeMove(state, m);
    let sc = search(state, depth - 1, -Infinity, Infinity);
    sc += (Math.random() - 0.5) * (level === 3 ? 4 : 20); // немного вариативности
    undoMove(state, u);
    if (state.turn === 'w') {
      if (sc > bestScore) { bestScore = sc; best = [m]; }
      else if (sc === bestScore) best.push(m);
    } else {
      if (sc < bestScore) { bestScore = sc; best = [m]; }
      else if (sc === bestScore) best.push(m);
    }
  }
  return best[(Math.random() * best.length) | 0];
}

/* ============================================================
   Экспорт для интерфейса
   ============================================================ */
window.Chess = {
  newGameState, legalMoves, legalMovesFrom, makeMove, gameStatus,
  inCheck, botMove, sqName, nameToSq, sq, fileOf, rankOf, colorOf, typeOf,
  kingSquare
};
