/* ============================================================
   ШАХМАТЫ — интерфейс
   Экраны, доска, режимы, темы, часы/лимит, съеденные фигуры,
   статусы, анимированный фон, аккордеоны, ОНЛАЙН-игра с другом.
   ============================================================ */
(function () {
  const C = window.Chess;

  const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

  /* ===== Единый набор нарисованных иконок (двухтоновые линии, currentColor) =====
     Один стиль для всего меню: тонкая обводка + мягкая заливка тем же цветом.
     Работают и на светлых карточках, и на тёмных кнопках. */
  const _svg = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const _F = 'fill="currentColor" fill-opacity=".14"';
  const ICON = {
    // Режимы игры
    bot: _svg(`<rect x="4.5" y="8" width="15" height="11" rx="3" ${_F}/><path d="M12 4.2v3.8"/><circle cx="12" cy="3.3" r="1.4" fill="currentColor" stroke="none"/><circle cx="9.2" cy="13" r="1.35" fill="currentColor" stroke="none"/><circle cx="14.8" cy="13" r="1.35" fill="currentColor" stroke="none"/><path d="M9.6 16.2h4.8"/><path d="M2.7 12v3M21.3 12v3"/>`),
    friend: _svg(`<path d="M9.6 14.4a3.5 3.5 0 0 0 5 0l2.8-2.8a3.5 3.5 0 0 0-5-5l-1.2 1.2"/><path d="M14.4 9.6a3.5 3.5 0 0 0-5 0L6.6 12.4a3.5 3.5 0 0 0 5 5l1.2-1.2"/>`),
    local: _svg(`<circle cx="9" cy="7.5" r="3.4" ${_F}/><path d="M3 20v-1.2A5 5 0 0 1 8 14h2a5 5 0 0 1 5 4.8V20"/><path d="M16 4.4a3.4 3.4 0 0 1 0 6.6"/><path d="M17.5 14.2a5 5 0 0 1 3.5 4.6V20"/>`),
    // Настройки
    side: _svg(`<circle cx="12" cy="6.2" r="2.7" ${_F}/><path d="M9.3 11.1c.7.6 1.6 1 2.7 1s2-.4 2.7-1"/><path d="M10.2 12.1 8.7 17.4h6.6l-1.5-5.3"/><path d="M7.6 20.4h8.8l-1-3H8.6z" ${_F}/>`),
    level: _svg(`<path d="M4.2 17.4a7.8 7.8 0 0 1 15.6 0z" ${_F}/><path d="M12 17.4l4.1-3.3"/><circle cx="12" cy="17.4" r="1.4" fill="currentColor" stroke="none"/><path d="M12 6.4v1.5M6.5 8.9l1 1M17.5 8.9l-1 1"/>`),
    clock: _svg(`<circle cx="12" cy="13.6" r="7.2" ${_F}/><path d="M12 9.8v3.8l2.6 1.6"/><path d="M9.4 3.4h5.2M12 3.4v2.9"/><path d="M18.6 7 19.8 5.8"/>`),
    moves: _svg(`<path d="M9.3 4 7.7 20M16.3 4 14.7 20M4 9.2h16M3.6 14.8h16"/>`),
    // Кнопки меню
    chart: _svg(`<path d="M4 20h16"/><rect x="5.4" y="11" width="3.4" height="7" rx="1" ${_F}/><rect x="10.3" y="6.4" width="3.4" height="11.6" rx="1" ${_F}/><rect x="15.2" y="13.4" width="3.4" height="4.6" rx="1" ${_F}/>`),
    trophy: _svg(`<path d="M7 4.5h10v4a5 5 0 0 1-10 0z" ${_F}/><path d="M7 6H4.7a2.6 2.6 0 0 0 2.9 3.5"/><path d="M17 6h2.3a2.6 2.6 0 0 1-2.9 3.5"/><path d="M12 13.4v3"/><path d="M8.7 20.4h6.6l-1-2.7H9.7z" ${_F}/>`),
    cap: _svg(`<path d="M12 5 21.6 9 12 13 2.4 9z" ${_F}/><path d="M6.4 10.6v4.2c0 1.6 2.5 2.9 5.6 2.9s5.6-1.3 5.6-2.9v-4.2"/><path d="M21.6 9v4.3"/>`),
    medal: _svg(`<path d="M8.4 3.4 10.6 9M15.6 3.4 13.4 9"/><circle cx="12" cy="14.6" r="5.5" ${_F}/><path d="M12 11.7l.92 1.86 2.05.3-1.48 1.44.35 2.04L12 16.87l-1.84.97.35-2.04-1.48-1.44 2.05-.3z" fill="currentColor" stroke="none"/>`),
    // --- Достижения и уроки (тот же стиль) ---
    swords: _svg(`<path d="M6 4l9 9"/><path d="M6 4h2.6M6 4v2.6"/><path d="M18 4l-9 9"/><path d="M18 4h-2.6M18 4v2.6"/><path d="M13.2 13.2l4.3 4.3M17.8 15.8l-2.6 2.6"/><path d="M10.8 13.2l-4.3 4.3M6.2 15.8l2.6 2.6"/><circle cx="18.4" cy="18.4" r="1.05" fill="currentColor" stroke="none"/><circle cx="5.6" cy="18.4" r="1.05" fill="currentColor" stroke="none"/>`),
    fork: _svg(`<path d="M9.5 3.5v4.5M12 3.5v4.5M14.5 3.5v4.5"/><path d="M9 8h6v.5a3 3 0 0 1-2.2 2.9V20.5" ${_F}/><path d="M12 11.4V20.5"/>`),
    crown: _svg(`<path d="M4 8.5l3.2 8h9.6l3.2-8-4.8 3.6L12 5 6.8 12.1z" ${_F}/><path d="M6.5 19.5h11"/>`),
    bolt: _svg(`<path d="M13 3 5.5 13H10l-1 8 8.5-11H13z" ${_F}/>`),
    queen: _svg(`<path d="M5.5 9l1.7 7.5h9.6L18.5 9l-3.3 3.2L12 7.8 8.8 12.2z" ${_F}/><path d="M7.2 19.5h9.6M6.8 16.5h10.4"/><circle cx="5.2" cy="7.7" r="1.1"/><circle cx="12" cy="6" r="1.1"/><circle cx="18.8" cy="7.7" r="1.1"/>`),
    hat: _svg(`<path d="M3 16.2c2.4-1.1 5.2-1.7 9-1.7s6.6.6 9 1.7"/><path d="M6.2 15c0-5.4 1.6-8.8 5.8-8.8s5.8 3.4 5.8 8.8" ${_F}/><path d="M7 13.2h10"/>`),
    axe: _svg(`<path d="M12.5 3.8c3.6-.4 6.7 2.1 7 5.7-2.4 1.6-5.4 2-8 .9z" ${_F}/><path d="M12.8 4.1l1.4 6.2"/><path d="M13.3 9L5.5 20"/>`),
    repeat: _svg(`<path d="M4.5 10a6 6 0 0 1 10.2-2.5L16.5 9"/><path d="M16.5 5v4h-4"/><path d="M19.5 14a6 6 0 0 1-10.2 2.5L7.5 15"/><path d="M7.5 19v-4h4"/>`),
    abc: _svg(`<path d="M3.5 16l2-6 2 6M4.1 14.2h2.8"/><path d="M10.5 10v6h1.7a1.5 1.5 0 0 0 0-3h-1.7m0 0h1.5a1.3 1.3 0 0 0 0-3h-1.5"/><path d="M20.5 11.6a2.6 2.6 0 0 0-4.2 2.1 2.6 2.6 0 0 0 4.2 2.1"/>`),
    dove: _svg(`<path d="M3.5 13c4 1 7-1 9.2-4.8 1 4 3.2 5.6 7.3 4.8-1.8 3.8-4.8 5.6-8.5 5.2-2.8-.3-5.2-2-6.8-4.6z" ${_F}/><circle cx="18.3" cy="9" r=".9" fill="currentColor" stroke="none"/><path d="M20 8.4l1.4-1"/>`),
    sparkle: _svg(`<path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" ${_F}/>`),
    knight: _svg(`<path d="M8 20.5h9c.6-6.6-1.3-11.2-6-13.2l1-2.8-2.6 1-1-2.2C6.8 4.5 5.5 7 6.3 9.6l2 1.1-3 1.8c-.3 2 1 3.4 2.7 4z" ${_F}/><path d="M6.5 20.5h11"/><circle cx="10.8" cy="9.2" r=".75" fill="currentColor" stroke="none"/>`),
    eye: _svg(`<path d="M2.5 12S6 6.2 12 6.2 21.5 12 21.5 12 18 17.8 12 17.8 2.5 12 2.5 12z" ${_F}/><circle cx="12" cy="12" r="2.6"/>`),
    circle: _svg(`<path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="8"/>`),
    zzz: _svg(`<path d="M6 8h5l-5 6.5h5"/><path d="M13.5 12.5h4l-4 5h4"/>`),
    flag: _svg(`<path d="M6 4v16.5"/><path d="M6 5h11l-2.2 3.2L17 11.5H6z" ${_F}/>`),
    handshake: _svg(`<circle cx="12" cy="12" r="8.5" ${_F}/><path d="M8 10.2h8M8 13.8h8"/>`),
    skull: _svg(`<path d="M6 11.5a6 6 0 0 1 12 0v3l-1.5 1.5v2.2h-9V16L6 14.5z" ${_F}/><circle cx="9.4" cy="11.8" r="1.35" fill="currentColor" stroke="none"/><circle cx="14.6" cy="11.8" r="1.35" fill="currentColor" stroke="none"/><path d="M11 15.6h2"/>`),
    elephant: _svg(`<ellipse cx="12" cy="15.4" rx="3.7" ry="3.1" fill="currentColor" stroke="none"/><ellipse cx="6.7" cy="11.6" rx="1.6" ry="2" fill="currentColor" stroke="none"/><ellipse cx="10.2" cy="8.7" rx="1.6" ry="2" fill="currentColor" stroke="none"/><ellipse cx="13.8" cy="8.7" rx="1.6" ry="2" fill="currentColor" stroke="none"/><ellipse cx="17.3" cy="11.6" rx="1.6" ry="2" fill="currentColor" stroke="none"/>`),
    undo: _svg(`<path d="M4.5 9.5h9a5 5 0 0 1 0 10H8.5"/><path d="M4.5 9.5l4-3.8M4.5 9.5l4 3.8"/>`),
    chain: _svg(`<path d="M9.6 14.4a3.5 3.5 0 0 0 5 0l2.8-2.8a3.5 3.5 0 0 0-5-5l-1.2 1.2"/><path d="M14.4 9.6a3.5 3.5 0 0 0-5 0L6.6 12.4a3.5 3.5 0 0 0 5 5l1.2-1.2"/>`),
    question: _svg(`<circle cx="12" cy="12" r="8.5" ${_F}/><path d="M9.4 9.6a2.6 2.6 0 0 1 4.2 2c0 1.6-1.6 1.9-1.6 3.2"/><circle cx="12" cy="16.8" r="1.05" fill="currentColor" stroke="none"/>`),
    check: _svg(`<path d="M5 12.5l4.4 4.4L19 7.3"/>`),
    lock: _svg(`<rect x="5" y="11" width="14" height="9.2" rx="2.2" ${_F}/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.4" r="1.3" fill="currentColor" stroke="none"/>`),
    shield: _svg(`<path d="M12 3l7 2.4v5.1c0 5-3 8.1-7 10-4-1.9-7-5-7-10V5.4z" ${_F}/><path d="M9.2 12l2 2 3.6-4.2"/>`),
    rocket: _svg(`<path d="M12 3c3 2.1 4.6 5.1 4.6 9.1L12 16.3l-4.6-4.2C7.4 8.1 9 5.1 12 3z" ${_F}/><circle cx="12" cy="9.2" r="1.6"/><path d="M8.8 16l-2 4.2 3.1-1.6M15.2 16l2 4.2-3.1-1.6"/>`),
    face: _svg(`<circle cx="12" cy="12" r="8.5" ${_F}/><circle cx="9" cy="10.5" r="1.05" fill="currentColor" stroke="none"/><circle cx="15" cy="10.5" r="1.05" fill="currentColor" stroke="none"/><path d="M9 15.2h6"/>`),
    pin: _svg(`<path d="M12 3.3c3.5 0 5.9 2.5 5.9 5.9 0 3.7-5.9 11-5.9 11S6.1 12.9 6.1 9.2C6.1 5.8 8.5 3.3 12 3.3z" ${_F}/><circle cx="12" cy="9.2" r="2.3"/>`),
    target: _svg(`<circle cx="12" cy="12" r="8.5" ${_F}/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>`),
    hook: _svg(`<path d="M4 6h7.5a4.5 4.5 0 0 1 4.5 4.5V17"/><path d="M12.6 13.4L16 16.8l3.4-3.4"/>`),
    warning: _svg(`<path d="M12 4.2 21 19.2H3z" ${_F}/><path d="M12 10v4"/><circle cx="12" cy="16.6" r="1.05" fill="currentColor" stroke="none"/>`),
    rook: _svg(`<path d="M6 8.5V5.5h2v1.6h2V5.5h4v1.6h2V5.5h2v3l-1.4 2v5H7.4v-5z" ${_F}/><path d="M6 19.5h12M7.5 15.5h9"/>`),
    bishop: _svg(`<path d="M12 4c2.1 1.6 3.2 3.6 3.2 5.2a3.2 3.2 0 0 1-6.4 0C8.8 7.6 9.9 5.6 12 4z" ${_F}/><path d="M8.8 16.5c0-2.1 1.3-3.7 3.2-4.2 1.9.5 3.2 2.1 3.2 4.2M7.5 19.5h9M12 8v3.2"/>`),
    king: _svg(`<path d="M12 3v4.2M9.8 5.1h4.4"/><path d="M8 12.4c0-2.3 1.8-4.1 4-4.1s4 1.8 4 4.1c0 1.6-1 2.7-2.1 3.7H10.1C9 15.1 8 14 8 12.4z" ${_F}/><path d="M7.5 19.5h9M9.2 16.1h5.6"/>`),
  };
  ICON.quiz = _svg(`<rect x="5" y="4.5" width="14" height="16" rx="2.5" ${_F}/><path d="M9 4.5V3.7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.8"/><path d="M8.5 12l2 2 4-4.4"/>`);
  ICON.play = _svg(`<path d="M8 8h8a5 5 0 0 1 5 5 3 3 0 0 1-5.4 1.8l-.6-.8H8.9l-.6.8A3 3 0 0 1 3 13a5 5 0 0 1 5-5z" ${_F}/><path d="M6.8 11.6v2M5.8 12.6h2"/><circle cx="16" cy="11.8" r=".95" fill="currentColor" stroke="none"/><circle cx="17.6" cy="13.4" r=".95" fill="currentColor" stroke="none"/>`);
  ICON.menu = _svg(`<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>`);
  ICON.hourglass = _svg(`<path d="M6.5 4h11M6.5 20h11" /><path d="M8 4c0 4 8 5 8 8s-8 4-8 8" ${_F}/><path d="M16 4c0 4-8 5-8 8s8 4 8 8" ${_F}/>`);
  ICON.progress = _svg(`<path d="M4 20h16"/><path d="M5 15l4-4 3 2 6-6"/><path d="M15 7h3v3"/>`);
  ICON.cross = _svg(`<circle cx="12" cy="12" r="8.5" ${_F}/><path d="M9 9l6 6M15 9l-6 6"/>`);
  ICON.bulb = _svg(`<path d="M8.5 15.3a5.5 5.5 0 1 1 7 0c-.85.7-1.4 1.4-1.5 2.4h-4c-.1-1-.65-1.7-1.5-2.4z" ${_F}/><path d="M9.7 20.5h4.6M9.9 18.2h4.2"/>`);
  ICON.trash = _svg(`<path d="M4.5 7h15"/><path d="M9 7V5.4A1.4 1.4 0 0 1 10.4 4h3.2A1.4 1.4 0 0 1 15 5.4V7"/><path d="M6.5 7l.8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7z" ${_F}/><path d="M10 10.5v6M14 10.5v6"/>`);
  ICON.flip = _svg(`<path d="M19.5 11.5A7.5 7.5 0 1 0 17.6 17"/><path d="M19.5 6v5.5H14"/>`);
  ICON.copy = _svg(`<rect x="8" y="8" width="11.5" height="11.5" rx="2.4" ${_F}/><path d="M15.5 8V6.4A2 2 0 0 0 13.5 4.4H6.4A2 2 0 0 0 4.4 6.4v7.1a2 2 0 0 0 2 2H8"/>`);
  ICON.chat = _svg(`<path d="M4.5 6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H6.5a2 2 0 0 1-2-2z" ${_F}/><path d="M8.5 8.5h7M8.5 11.5h4.5"/>`);
  ICON.envelope = _svg(`<rect x="3.5" y="6" width="17" height="12" rx="2.5" ${_F}/><path d="M4.2 7l7.8 5.8L19.8 7"/>`);
  ICON.soundOn = _svg(`<path d="M4 9.5h3l4-3.4v11.8l-4-3.4H4z" ${_F}/><path d="M15 9.2a4 4 0 0 1 0 5.6M17.6 6.6a7.5 7.5 0 0 1 0 10.8"/>`);
  ICON.soundOff = _svg(`<path d="M4 9.5h3l4-3.4v11.8l-4-3.4H4z" ${_F}/><path d="M15.5 10l4.5 4M20 10l-4.5 4"/>`);
  const tutTitleHTML = (svg, txt) => `<span class="tt-ico">${svg}</span>${txt}`;
  const inl = (svg) => `<span class="inl-ico">${svg}</span>`;
  // Уроки хранят символ (эмодзи/шахматный знак) — переводим в иконку того же стиля
  const LESSON_ICON = { '♟': ICON.side, '♞': ICON.knight, '♝': ICON.bishop, '♜': ICON.rook, '♛': ICON.queen, '♚': ICON.king, '🤝': ICON.handshake, '🛡️': ICON.shield, '🚀': ICON.rocket, '😐': ICON.face, '📌': ICON.pin, '👑': ICON.crown, '🏰': ICON.rook, '🎯': ICON.target, '🎣': ICON.hook, '🍴': ICON.fork, '✨': ICON.sparkle, '⛓️': ICON.chain, '⚠️': ICON.warning };
  const lessonIco = (g) => LESSON_ICON[g] || g || '';

  /* ===== Цветные нарисованные иконки достижений (единый плоский стиль) ===== */
  const _c = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const ACH = {
    swords: _c(`<path d="M4.5 5.4l9 9M19.5 5.4l-9 9" stroke="#c9cfdb" stroke-width="2.5"/><path d="M4.5 5.4l2.5.2M4.5 5.4l.2 2.5M19.5 5.4l-2.5.2M19.5 5.4l-.2 2.5" stroke="#c9cfdb" stroke-width="2"/><path d="M12.9 13.7l4.3 4.3M12.7 17.2l3.3-3.3M11.1 13.7l-4.3 4.3M11.3 17.2l-3.3-3.3" stroke="#e0a12c" stroke-width="2.1"/>`),
    fork: _c(`<path d="M9 3.6v4.6M12 3.6v4.6M15 3.6v4.6" stroke="#c2c8d4" stroke-width="1.9"/><path d="M8.6 8.2h6.8v.4c0 2-1.3 3.4-3 3.8V20.6" stroke="#c2c8d4" stroke-width="2.1"/>`),
    bot: _c(`<rect x="5" y="8" width="14" height="10.2" rx="3" fill="#8a93a6"/><path d="M12 4.4v3.6" stroke="#6a7385" stroke-width="1.8"/><circle cx="12" cy="3.9" r="1.5" fill="#e85c52"/><circle cx="9.5" cy="13" r="1.7" fill="#5b8def"/><circle cx="14.5" cy="13" r="1.7" fill="#5b8def"/><path d="M9.6 16.2h4.8" stroke="#4a5262" stroke-width="1.5"/><path d="M2.8 12v3M21.2 12v3" stroke="#6a7385" stroke-width="1.8"/>`),
    pawn: _c(`<circle cx="12" cy="6.6" r="3" fill="#4a5162"/><path d="M9.6 11.4c.7.6 1.5 1 2.4 1s1.7-.4 2.4-1l1.1 5.4H8.5z" fill="#4a5162"/><path d="M7.6 20.4h8.8l-1-3.2H8.6z" fill="#39404f"/>`),
    crown: _c(`<path d="M4 8.6l3.1 8h9.8l3.1-8-4.8 3.4L12 5.3 6.9 12z" fill="#f4c04e" stroke="#d99a2a" stroke-width="1"/><path d="M6.7 19h10.6" stroke="#d99a2a" stroke-width="2.2"/><circle cx="12" cy="10.6" r="1" fill="#e85c52"/>`),
    bolt: _c(`<path d="M13 3l-7.4 10H10l-1 8 8.4-11H13z" fill="#f4c04e" stroke="#e0a12c" stroke-width="1"/>`),
    queen: _c(`<path d="M5.5 9l1.8 7.4h9.4L18.5 9l-3.2 3-3.3-4.1L8.7 12z" fill="#a06ff2"/><circle cx="5.2" cy="7.8" r="1.2" fill="#f4c04e"/><circle cx="12" cy="6" r="1.2" fill="#f4c04e"/><circle cx="18.8" cy="7.8" r="1.2" fill="#f4c04e"/><path d="M6.7 19.4h10.6M6.4 16.6h11.2" stroke="#7d4fd0" stroke-width="1.8"/>`),
    detective: _c(`<path d="M3.4 12.6c2.3-1.2 5.1-1.8 8.6-1.8s6.3.6 8.6 1.8" stroke="#39404f" stroke-width="2.3"/><path d="M6.3 11.6c0-4.7 1.5-7.4 5.7-7.4s5.7 2.7 5.7 7.4z" fill="#39404f"/><path d="M7 9.4h9.4" stroke="#e85c52" stroke-width="1.7"/><circle cx="9.8" cy="16.4" r="3" fill="none" stroke="#9aa4b6" stroke-width="1.9"/><path d="M12 18.6l2.8 2.8" stroke="#9aa4b6" stroke-width="2.1"/>`),
    axe: _c(`<path d="M12.6 3.9c3.6-.4 6.6 2.1 6.9 5.6-2.4 1.6-5.4 2-7.9.9z" fill="#c9cfdb" stroke="#9aa4b6" stroke-width="1"/><path d="M12.6 3.9l1.3 6.1" stroke="#9aa4b6" stroke-width="1"/><path d="M13.2 9L5.6 20" stroke="#8a5632" stroke-width="2.6"/>`),
    repeat: _c(`<path d="M4.6 10a7 7 0 0 1 11.4-3.1M16.6 4.4V8h-3.6" stroke="#5b8def" stroke-width="2.2"/><path d="M19.4 14a7 7 0 0 1-11.4 3.1M7.4 19.6V16h3.6" stroke="#46c47c" stroke-width="2.2"/>`),
    chain: _c(`<rect x="3.4" y="8.6" width="9.2" height="6.8" rx="3.4" stroke="#9aa4b6" stroke-width="2.3"/><rect x="11.4" y="8.6" width="9.2" height="6.8" rx="3.4" stroke="#6a7385" stroke-width="2.3"/>`),
    abc: _c(`<path d="M3.6 16l2-6 2 6M4.2 14h2.8" stroke="#e85c52" stroke-width="1.8"/><path d="M10.4 10v6h1.7a1.4 1.4 0 0 0 0-2.9h-1.7m0 0h1.5a1.3 1.3 0 0 0 0-2.6h-1.5" stroke="#5b8def" stroke-width="1.7"/><path d="M20.4 11.6a2.6 2.6 0 0 0-4.2 2 2.6 2.6 0 0 0 4.2 2" stroke="#46c47c" stroke-width="1.8"/>`),
    dove: _c(`<ellipse cx="10.5" cy="15.5" rx="5.8" ry="2.9" fill="#eef1f7" transform="rotate(-12 10.5 15.5)"/><circle cx="16.8" cy="10.8" r="2.3" fill="#eef1f7"/><path d="M18.7 9.9 22 9 19 11.5Z" fill="#f4a83c"/><circle cx="17.4" cy="10.2" r=".7" fill="#2a2f3c"/><path d="M9 13.5C6.5 10 6.8 5.8 9 4c1.2 3 3.4 5.8 6.2 7-2 1.5-4.4 2-6.2 1.5z" fill="#f6f8fc" stroke="#c9cfdb" stroke-width=".6"/><path d="M6.5 16.5C4 15.5 2.5 13.5 2 11c2.3 1 4.6 2.6 6 4.8-.4 .5-.9 .7-1.5 .7z" fill="#f6f8fc" stroke="#c9cfdb" stroke-width=".6"/>`),
    rook: _c(`<path d="M6 8.6V5.6h2v1.6h2V5.6h4v1.6h2V5.6h2v3l-1.4 2v5H7.4v-5z" fill="#9aa4b6"/><path d="M6 19.4h12M7.5 15.4h9" stroke="#6a7385" stroke-width="1.8"/>`),
    sparkle: _c(`<path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z" fill="#f4c04e"/><circle cx="18.5" cy="6" r="1.2" fill="#f4c04e"/><circle cx="5.5" cy="17.5" r="1" fill="#f4c04e"/>`),
    horse: `<svg viewBox="0 0 45 45" fill="none" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="22.5" cy="40" rx="11.5" ry="2.2" fill="rgba(0,0,0,.22)"/><path d="M12.5,38.5 L32.5,38.5 L32.5,36.2 C32.5,34.9 31.2,34 29.8,34 L15.2,34 C13.8,34 12.5,34.9 12.5,36.2 Z" fill="#4f2f1a"/><path d="M15.5,34.5 C15.5,29.8 17.4,26.6 20.6,24.7 C16.8,23.4 14,20.1 14,16.4 C14,14.8 14.7,13.4 15.9,12.4 C14.8,13.1 13.9,13.9 13.1,14.2 C11.9,14.6 10.8,13.7 11.3,12.3 C11.9,10.3 14.4,8.6 17.1,7.9 L17.9,5.9 C18.3,4.9 19.6,4.9 20.1,6 L19.7,7.8 C22.5,7.2 25.5,8.2 27.7,10.5 C31,13.9 31.5,19.2 30,25.2 C31.3,27.5 31.9,30.5 31.9,34.5 Z" fill="#6b4225"/><ellipse cx="25.5" cy="19" rx="1.9" ry="6" fill="#8a5a34" opacity=".5"/><circle cx="15.6" cy="12.5" r="1.05" fill="#ead2ba"/></svg>`,
    eye: _c(`<path d="M2.5 12S6 6.2 12 6.2 21.5 12 21.5 12 18 17.8 12 17.8 2.5 12 2.5 12z" fill="#eef1f7" stroke="#9aa4b6" stroke-width="1.3"/><circle cx="12" cy="12" r="3" fill="#5b8def"/><circle cx="12" cy="12" r="1.3" fill="#232838"/>`),
    black: _c(`<circle cx="12" cy="12" r="8" fill="#1a1e27" stroke="#5a6478" stroke-width="1.3"/><circle cx="9.6" cy="9.6" r="1.9" fill="#3a4150"/>`),
    yawn: _c(`<circle cx="12" cy="12" r="8.5" fill="#f4c04e"/><path d="M8 10.6c.6-.8 1.9-.8 2.5 0M13.5 10.6c.6-.8 1.9-.8 2.5 0" stroke="#8a5a10" stroke-width="1.4"/><ellipse cx="12" cy="15.4" rx="2.1" ry="2.6" fill="#8a5a10"/>`),
    alarm: _c(`<circle cx="12" cy="13.6" r="7" fill="#eef1f7" stroke="#e85c52" stroke-width="2"/><path d="M12 9.8v3.8l2.6 1.6" stroke="#39404f" stroke-width="1.8"/><path d="M6 5.2L3.4 7.8M18 5.2l2.6 2.6" stroke="#e85c52" stroke-width="2.2"/>`),
    flag: _c(`<path d="M6.5 3.6v17" stroke="#8a93a6" stroke-width="2.2"/><path d="M6.5 5h11l-2.2 3.2L17.5 11.4H6.5z" fill="#eef1f7" stroke="#c9cfdb" stroke-width=".8"/>`),
    equal: _c(`<circle cx="12" cy="12" r="8.5" fill="#5b8def"/><path d="M8 10.2h8M8 13.8h8" stroke="#fff" stroke-width="2.2"/>`),
    skull: _c(`<path d="M6 11.5a6 6 0 0 1 12 0v3l-1.5 1.5v2.2h-9V16L6 14.5z" fill="#eef1f7"/><circle cx="9.4" cy="11.9" r="1.5" fill="#39404f"/><circle cx="14.6" cy="11.9" r="1.5" fill="#39404f"/><path d="M12 14.2v1.8" stroke="#39404f" stroke-width="1.2"/>`),
    paw: _c(`<ellipse cx="12" cy="15.5" rx="3.7" ry="3.1" fill="#b9784a"/><ellipse cx="6.7" cy="11.6" rx="1.6" ry="2" fill="#b9784a"/><ellipse cx="10.2" cy="8.7" rx="1.6" ry="2" fill="#b9784a"/><ellipse cx="13.8" cy="8.7" rx="1.6" ry="2" fill="#b9784a"/><ellipse cx="17.3" cy="11.6" rx="1.6" ry="2" fill="#b9784a"/>`),
    undo: _c(`<path d="M5 9.5h8.5a5 5 0 0 1 0 10H9" stroke="#5b8def" stroke-width="2.4"/><path d="M5 9.5l4-3.8M5 9.5l4 3.8" stroke="#5b8def" stroke-width="2.4"/>`),
    chains: _c(`<rect x="3.4" y="8.6" width="9.2" height="6.8" rx="3.4" stroke="#6a7385" stroke-width="2.4"/><rect x="11.4" y="8.6" width="9.2" height="6.8" rx="3.4" stroke="#39404f" stroke-width="2.4"/>`),
    check: _c(`<circle cx="12" cy="12" r="9" fill="#46c47c"/><path d="M7.8 12.3l2.7 2.7L16.2 9" stroke="#fff" stroke-width="2"/>`),
    lock: _c(`<rect x="5" y="11" width="14" height="9" rx="2.3" fill="#8a93a6"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#8a93a6" stroke-width="2"/><circle cx="12" cy="15.3" r="1.3" fill="#4a5262"/>`),
    quest: _c(`<circle cx="12" cy="12" r="9" fill="#6a7385"/><path d="M9.6 9.7a2.5 2.5 0 0 1 4.1 1.9c0 1.6-1.6 1.9-1.6 3.1" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="16.6" r="1.05" fill="#fff"/>`),
  };

  /* ===== Объёмные фигуры (SVG, стиль Стаунтон) ===== */
  // Градиенты объёма — вставляются в DOM один раз (см. buildLayout)
  const PIECE_DEFS = `<svg id="pcDefs" width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0"><defs>
    <radialGradient id="pcGW" cx="38%" cy="26%" r="80%"><stop offset="0%" stop-color="var(--pcw0)"/><stop offset="42%" stop-color="var(--pcw1)"/><stop offset="78%" stop-color="var(--pcw2)"/><stop offset="100%" stop-color="var(--pcw3)"/></radialGradient>
    <radialGradient id="pcGB" cx="38%" cy="26%" r="82%"><stop offset="0%" stop-color="var(--pcb0)"/><stop offset="34%" stop-color="var(--pcb1)"/><stop offset="72%" stop-color="var(--pcb2)"/><stop offset="100%" stop-color="var(--pcb3)"/></radialGradient>
  </defs></svg>`;
  const P_SHAPES = {
    p: `<ellipse class="pc-sh" cx="22.5" cy="40.5" rx="10.5" ry="2.4"/><path class="pc-body" d="M22.5,9 C20.29,9 18.5,10.79 18.5,13 C18.5,13.89 18.79,14.71 19.28,15.38 C17.33,16.5 16,18.59 16,21 C16,23.03 16.94,24.84 18.41,26.03 C15.41,27.09 12,31.58 12,38.5 L33,38.5 C33,31.58 29.59,27.09 26.59,26.03 C28.06,24.84 29,23.03 29,21 C29,18.59 27.67,16.5 25.72,15.38 C26.21,14.71 26.5,13.89 26.5,13 C26.5,10.79 24.71,9 22.5,9 z"/><ellipse class="pc-hl" cx="19" cy="30" rx="1.4" ry="5" opacity=".5"/>`,
    r: `<ellipse class="pc-sh" cx="22.5" cy="40.5" rx="11.5" ry="2.4"/><path class="pc-body" d="M11.5,38.5 L33.5,38.5 L33.5,36 L30.5,33 L30.5,23 L32,20.5 L32,14 L28,14 L28,17 L24.5,17 L24.5,14 L20.5,14 L20.5,17 L17,17 L17,14 L13,14 L13,20.5 L14.5,23 L14.5,33 L11.5,36 z"/><ellipse class="pc-hl" cx="16.5" cy="30" rx="1.5" ry="6" opacity=".45"/>`,
    b: `<ellipse class="pc-sh" cx="22.5" cy="40.5" rx="11" ry="2.4"/><circle class="pc-body" cx="22.5" cy="7.5" r="2.6"/><path class="pc-body" d="M22.5,10 C25,11.5 27.5,14.5 27.5,18.5 C27.5,20.7 26.4,22.4 24.8,23.6 C27,25 28.5,27.5 29.5,31 L15.5,31 C16.5,27.5 18,25 20.2,23.6 C18.6,22.4 17.5,20.7 17.5,18.5 C17.5,14.5 20,11.5 22.5,10 z"/><path class="pc-body" d="M13,38.5 C13,34 15,32 17,31 L28,31 C30,32 32,34 32,38.5 z"/><path class="pc-line" d="M20,16 L25,16 M22.5,13.5 L22.5,18.5"/><ellipse class="pc-hl" cx="19" cy="34" rx="1.5" ry="4" opacity=".5"/>`,
    q: `<ellipse class="pc-sh" cx="22.5" cy="40.5" rx="12.5" ry="2.5"/><circle class="pc-body" cx="9" cy="12" r="2.2"/><circle class="pc-body" cx="16" cy="9" r="2.2"/><circle class="pc-body" cx="22.5" cy="8" r="2.4"/><circle class="pc-body" cx="29" cy="9" r="2.2"/><circle class="pc-body" cx="36" cy="12" r="2.2"/><path class="pc-body" d="M9,12 L12,27 L33,27 L36,12 L31,20 L28.5,10.5 L25,22 L22.5,9.5 L20,22 L16.5,10.5 L14,20 z"/><path class="pc-body" d="M12,27 C10,30 10,33 12,34 L33,34 C35,33 35,30 33,27 z"/><path class="pc-body" d="M11,34 C10,36 11,37 12,38.5 L33,38.5 C34,37 35,36 34,34 z"/><ellipse class="pc-hl" cx="16.5" cy="31" rx="1.5" ry="4" opacity=".45"/>`,
    k: `<ellipse class="pc-sh" cx="22.5" cy="40.5" rx="12" ry="2.5"/><path class="pc-line" d="M22.5,4 L22.5,10 M20,6.5 L25,6.5" style="stroke-width:1.6"/><path class="pc-body" d="M22.5,11 C26,11 28,13 28,15.5 C28,17.5 26.5,19 24.5,20 L27.5,22 C30,24 31.5,30 31.5,38.5 L13.5,38.5 C13.5,30 15,24 17.5,22 L20.5,20 C18.5,19 17,17.5 17,15.5 C17,13 19,11 22.5,11 z"/><path class="pc-line" d="M14,29 C19,26 26,26 31,29 M14,33 C19,30 26,30 31,33"/><ellipse class="pc-hl" cx="19" cy="30" rx="1.5" ry="5" opacity=".5"/>`,
    n: `<ellipse class="pc-sh" cx="22.5" cy="40" rx="11.5" ry="2.3"/><path class="pc-body" d="M12.5,38.5 L32.5,38.5 L32.5,36.2 C32.5,34.9 31.2,34 29.8,34 L15.2,34 C13.8,34 12.5,34.9 12.5,36.2 Z"/><path class="pc-body" d="M15.5,34.5 C15.5,29.8 17.4,26.6 20.6,24.7 C16.8,23.4 14,20.1 14,16.4 C14,14.8 14.7,13.4 15.9,12.4 C14.8,13.1 13.9,13.9 13.1,14.2 C11.9,14.6 10.8,13.7 11.3,12.3 C11.9,10.3 14.4,8.6 17.1,7.9 L17.9,5.9 C18.3,4.9 19.6,4.9 20.1,6 L19.7,7.8 C22.5,7.2 25.5,8.2 27.7,10.5 C31,13.9 31.5,19.2 30,25.2 C31.3,27.5 31.9,30.5 31.9,34.5 Z"/><circle class="pc-eye" cx="15.5" cy="12.4" r="1.05"/><ellipse class="pc-hl" cx="25" cy="19" rx="1.7" ry="5.5" opacity=".33"/>`
  };
  function pieceSVG(color, type, par) {
    return `<svg viewBox="0 0 45 45" class="pc-svg pc-${color === 'w' ? 'w' : 'b'}" preserveAspectRatio="${par || 'xMidYMax meet'}">${P_SHAPES[type] || ''}</svg>`;
  }
  function pieceHTML(color, type) { return pieceSVG(color, type); }

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
    tutSideResolved: 'w',
    clock: { timeOn: false, movesOn: false, timeMs: { w: 0, b: 0 }, movesLeft: { w: 0, b: 0 }, lastTick: 0 },
    online: { on: false, role: null, room: null, myColor: 'w', hostColor: 'w', myId: null, net: null, connected: false, peerReady: false, failed: false }
  };

  const $ = (id) => document.getElementById(id);
  let elBoard, elStatus, elHistory, elPieceLayer, plSig = '', tutPlSig = '';

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
      client.on('message', (t, payload, packet) => { let o; try { o = JSON.parse(payload.toString()); } catch (e) { return; } handlers.onMessage && handlers.onMessage(o, !!(packet && packet.retain)); });
      client.on('reconnect', () => handlers.onReconnect && handlers.onReconnect());
      client.on('close', () => handlers.onClose && handlers.onClose());
      client.on('error', () => { });
      // сторож: если за 15 c не подключились — сообщаем о проблеме
      setTimeout(() => { if (active && !opened) handlers.onFail && handlers.onFail('timeout'); }, 15000);
      return {
        id: clientId,
        publish(obj, retain) { try { if (client && client.connected) client.publish(topic, JSON.stringify(obj), { qos: 0, retain: !!retain }); } catch (e) { } },
        close() { active = false; try { client && client.end(true); } catch (e) { } }
      };
    }
  };

  /* ========================================================
     ЗАПУСК
     ======================================================== */
  const APP_VERSION = 'v120';
  document.addEventListener('DOMContentLoaded', () => {
    app.theme = localStorage.getItem('chessTheme') || 'classic';
    applyTheme(app.theme);
    // номер версии в шапке — чтобы было видно, свежая версия загрузилась или старая из кэша
    const subP = document.querySelector('.ch-brand p');
    if (subP) subP.textContent = 'С ботом · С другом · Рядом · ' + APP_VERSION;
    buildLayout();
    initBackground();
    startClockLoop();
    const h = location.hash;
    if (h.indexOf('room=') >= 0) { (parseHash(h).w === '1') ? startOnlineWatch(h) : startOnlineGuest(h); }
    else if (h.startsWith('#g=')) startFromLink(h.slice(3));
    else showSetup();
  });

  /* ========================================================
     РАЗМЕТКА
     ======================================================== */
  function buildLayout() {
    const root = $('chessRoot');
    root.innerHTML = `
      ${PIECE_DEFS}
      <div class="ch-themebar" id="themeBar">
        <button class="ch-sound" id="soundBtn" title="Звук вкл/выкл">${ICON.soundOn}</button>
        <button class="ch-sw" data-theme="green" title="Зелёная доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
        <button class="ch-sw" data-theme="classic" title="Чёрно-белая доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
        <button class="ch-sw" data-theme="brown" title="Коричневая доска"><i class="l"></i><i class="d"></i><i class="d"></i><i class="l"></i></button>
        <span class="ch-vsep" aria-hidden="true"></span>
        <button class="ch-vw" data-view="2d" title="Плоская доска (2D)">2D</button>
        <button class="ch-vw" data-view="3d" title="Объёмная доска (3D)">3D</button>
        <span class="ch-vsep" aria-hidden="true"></span>
        <button class="ch-tx" data-tex="plain" title="Гладкая"></button>
        <button class="ch-tx" data-tex="marble" title="Мрамор"></button>
        <button class="ch-tx" data-tex="wood" title="Дерево"></button>
        <button class="ch-tx" data-tex="glass" title="Стекло"></button>
      </div>

      <section id="setupScreen" class="ch-screen">
        <div class="ch-hero">
          <div class="ch-rank" id="rankBadge"></div>
          <h2>Матшахи</h2>
          <p class="ch-rank-info" id="rankInfo"></p>
          <button id="ranksBtn" class="ch-rank-btn"><span class="ch-btn-ico">${ICON.medal}</span>Посмотреть все ранги</button>
          <p>Выберите режим и настройки — и в бой.</p>
        </div>

        <div class="ch-setup-grid">
          <div class="ch-col">
            <div class="ch-collabel">Режим игры</div>
            <div id="modeCards">
              <button class="ch-big" data-mode="bot"><span class="ch-big-ico">${ICON.bot}</span><span>Играть с ботом</span></button>
              <button class="ch-big" data-mode="friend"><span class="ch-big-ico">${ICON.friend}</span><span>Играть с другом</span></button>
              <button class="ch-big" data-mode="local"><span class="ch-big-ico">${ICON.local}</span><span>Играть рядом</span></button>
            </div>
          </div>

          <div class="ch-col">
            <div class="ch-collabel">Настройки</div>

            <div class="ch-acc" id="accSide">
              <button class="ch-acc-head" data-acc><span class="ch-acc-ico">${ICON.side}</span><span class="ch-acc-title">Играть за</span><span class="ch-acc-val" id="valSide">—</span><span class="ch-acc-arrow">▾</span></button>
              <div class="ch-acc-body"><div class="ch-choices" id="sideChoices">
                <button class="ch-choice" data-side="w">Белые</button>
                <button class="ch-choice" data-side="b">Чёрные</button>
                <button class="ch-choice" data-side="r">Рандом</button>
              </div></div>
            </div>

            <div class="ch-acc" id="accLevel">
              <button class="ch-acc-head" data-acc><span class="ch-acc-ico">${ICON.level}</span><span class="ch-acc-title">Сложность бота</span><span class="ch-acc-val" id="valLevel">—</span><span class="ch-acc-arrow">▾</span></button>
              <div class="ch-acc-body"><div class="ch-choices" id="levelChoices">
                <button class="ch-choice" data-level="1">Лёгкий</button>
                <button class="ch-choice" data-level="2">Средний</button>
                <button class="ch-choice" data-level="3">Сложный</button>
              </div></div>
            </div>

            <div class="ch-acc" id="accClock">
              <button class="ch-acc-head" data-acc><span class="ch-acc-ico">${ICON.clock}</span><span class="ch-acc-title">Время и ходы</span><span class="ch-acc-val" id="valClock">—</span><span class="ch-acc-arrow">▾</span></button>
              <div class="ch-acc-body">
                <div class="ch-sublabel"><span class="ch-sub-ico">${ICON.clock}</span>Время каждому игроку</div>
                <div class="ch-chips" id="timeChips">
                  <button class="ch-chip" data-min="0">Нет</button>
                  <button class="ch-chip" data-min="1">1 мин</button>
                  <button class="ch-chip" data-min="5">5 мин</button>
                  <button class="ch-chip" data-min="10">10 мин</button>
                  <button class="ch-chip" data-min="15">15 мин</button>
                  <button class="ch-chip" data-min="20">20 мин</button>
                  <button class="ch-chip" data-min="30">30 мин</button>
                </div>
                <div class="ch-sublabel" style="margin-top:12px"><span class="ch-sub-ico">${ICON.moves}</span>Ходов каждому игроку</div>
                <div class="ch-chips" id="moveChips">
                  <button class="ch-chip" data-mv="0">Нет</button>
                  <button class="ch-chip" data-mv="30">30 ходов</button>
                  <button class="ch-chip" data-mv="50">50 ходов</button>
                  <button class="ch-chip" data-mv="100">100 ходов</button>
                </div>
              </div>
            </div>

            <div class="ch-hint-line" id="friendHint" hidden><span class="ch-sub-ico">${ICON.friend}</span>Игра с другом идёт онлайн: отправьте ссылку — и ходите в реальном времени.</div>
          </div>
        </div>

        <button id="startBtn" class="ch-start">Начать партию ▶</button>
        <button id="viewBtn" class="ch-view"><span class="ch-btn-ico">${ICON.chart}</span>Посмотреть результаты</button>
        <button id="achBtn" class="ch-view"><span class="ch-btn-ico">${ICON.trophy}</span>Достижения</button>
        <button id="tutBtn" class="ch-view"><span class="ch-btn-ico">${ICON.cap}</span>Обучение</button>
      </section>

      <section id="tutorScreen" class="ch-screen" hidden>
        <div class="ch-tutor-head">
          <button class="ch-btn" id="tutBack">← Назад</button>
          <h2 id="tutTitle"><span class="tt-ico">${ICON.cap}</span>Обучение</h2>
        </div>
        <div id="tutMenu">
          <button class="ch-start" id="tutReview"><span class="ch-btn-ico">${ICON.quiz}</span>Проверка знаний</button>
          <button class="ch-start ch-start-game" id="tutGameBtn"><span class="ch-btn-ico">${ICON.play}</span>Игра — повторение</button>
          <div id="tutSections"></div>
        </div>
        <div id="tutLesson" hidden>
          <div class="ch-tutor-explain" id="tutExplain"></div>
          <div class="ch-board-wrap"><div class="ch-board-stack"><div class="ch-board" id="tutBoard"></div><div class="ch-piecelayer" id="tutPieceLayer"></div><div class="ch-tut-arrowlayer" id="tutArrowLayer"></div></div></div>
          <div class="ch-tutor-prompt" id="tutPrompt"></div>
          <div class="ch-tutor-actions" id="tutActions"></div>
        </div>
        <div id="tutGame" hidden>
          <div class="ch-tg-progress" id="tgProgress"></div>
          <div class="ch-tg-question" id="tgQuestion"></div>
          <div class="ch-tg-options" id="tgOptions"></div>
          <div class="ch-board-wrap"><div class="ch-board ch-tg-board" id="tgBoard"></div></div>
          <div class="ch-tg-foot" id="tgFoot"></div>
        </div>
      </section>
      <div id="tutFlash"></div>

      <section id="gameScreen" class="ch-screen" hidden>
        <div class="ch-fliparea" id="flipArea">
        <div class="ch-status" id="chStatus">—</div>
        <div class="ch-gametime" id="gameTime">${inl(ICON.clock)}0:00</div>

        <div class="ch-online" id="onlineBar" hidden>
          <div class="ch-online-status" id="onlineStatus">Подключение…</div>
          <div class="ch-watchers" id="watchers" hidden></div>
          <div class="ch-online-share" id="onlineShare">
            <div class="ch-share-col" id="oppCol">
              <button class="ch-btn ch-btn-primary" id="btnOnlineCopy">${inl(ICON.copy)}Ссылка для соперника</button>
              <input id="onlineLink" class="ch-share-input" readonly />
            </div>
            <div class="ch-share-col">
              <button class="ch-btn" id="btnWatchCopy">${inl(ICON.copy)}Ссылка для зрителя</button>
              <input id="watchLink" class="ch-share-input" readonly />
            </div>
          </div>
        </div>

        <div class="ch-playerbar" id="barTop">
          <div class="pb-info"><span class="pb-name" id="topName">Чёрные</span><span class="pb-adv" id="topAdv"></span></div>
          <div class="pb-captured" id="topCaptured"></div>
          <div class="pb-clock" id="topClock" hidden>—</div>
        </div>

        <div class="ch-board-wrap"><div class="ch-board-stack"><div class="ch-board" id="chBoard"></div><div class="ch-piecelayer" id="pieceLayer"></div></div><div id="board3d" class="ch-board3d" hidden></div></div>

        <div class="ch-playerbar" id="barBot">
          <div class="pb-info"><span class="pb-name" id="botName">Белые</span><span class="pb-adv" id="botAdv"></span></div>
          <div class="pb-captured" id="botCaptured"></div>
          <div class="pb-clock" id="botClock" hidden>—</div>
        </div>

        <div class="ch-controls">
          <button class="ch-btn" id="btnMenu">${inl(ICON.menu)}Меню</button>
          <button class="ch-btn" id="btnFlip">${inl(ICON.flip)}Повернуть</button>
          <button class="ch-btn" id="btnUndo">${inl(ICON.undo)}Отменить</button>
          <button class="ch-btn ch-btn-warn" id="btnResign">${inl(ICON.flag)}Сдаться</button>
        </div>
        <div class="ch-reacts" id="reactBar">
          <button class="ch-react" data-emo="😄">😄</button>
          <button class="ch-react" data-emo="😡">😡</button>
          <button class="ch-react" data-emo="😭">😭</button>
          <button class="ch-react" data-emo="🤯">🤯</button>
          <button class="ch-react" data-emo="😎">😎</button>
        </div>
        <div class="ch-react-layer" id="reactLayer"></div>
        </div><!-- /flipArea -->
        <div class="ch-history-box">
          <div class="ch-history-title">Ходы</div>
          <div class="ch-history" id="chHistory"></div>
        </div>

        <div class="ch-chat" id="chatBox" hidden>
          <div class="ch-chat-title">${inl(ICON.chat)}Чат с другом</div>
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
          <div class="ch-modal-title">Ход сделан${inl(ICON.envelope)}</div>
          <p class="ch-modal-text">Отправьте эту ссылку другу — он откроет её и сделает свой ход, затем пришлёт ссылку обратно.</p>
          <input id="shareLink" class="ch-share-input" readonly />
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnCopy">${inl(ICON.copy)}Скопировать</button>
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
            <button class="ch-btn" id="btnViewOver">${inl(ICON.menu)}В меню</button>
          </div>
        </div>
      </div>

      <div id="rematchModal" class="ch-modal" hidden>
        <div class="ch-modal-box">
          <div class="ch-modal-title">${inl(ICON.repeat)}Соперник зовёт на реванш</div>
          <p class="ch-modal-text">Соперник хочет сыграть ещё одну партию с теми же настройками. Согласиться?</p>
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnRematchYes">${inl(ICON.check)}Играть</button>
            <button class="ch-btn ch-btn-warn" id="btnRematchNo">${inl(ICON.cross)}Нет</button>
          </div>
        </div>
      </div>

      <div id="undoModal" class="ch-modal" hidden>
        <div class="ch-modal-box">
          <div class="ch-modal-title">${inl(ICON.undo)}Соперник просит отмену</div>
          <p class="ch-modal-text">Соперник хочет отменить последний ход. Разрешить?</p>
          <div class="ch-modal-actions">
            <button class="ch-btn ch-btn-primary" id="btnUndoAllow">${inl(ICON.check)}Разрешить</button>
            <button class="ch-btn ch-btn-warn" id="btnUndoDeny">${inl(ICON.cross)}Не разрешать</button>
          </div>
        </div>
      </div>

      <div id="histModal" class="ch-modal" hidden>
        <div class="ch-modal-box ch-hist-box">
          <div class="ch-modal-title">${inl(ICON.chart)}Мои партии</div>
          <div class="ch-hist-summary" id="histSummary"></div>
          <div class="ch-hist-list" id="histList"></div>
          <div class="ch-modal-actions">
            <button class="ch-btn" id="histClear">${inl(ICON.trash)}Очистить</button>
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
    elPieceLayer = $('pieceLayer');
    elStatus = $('chStatus');
    elHistory = $('chHistory');

    bindSetup();
    bindGame();
    bindHistory();
    bindReactions();
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
    $('soundBtn').innerHTML = app.soundOn ? ICON.soundOn : ICON.soundOff;
    $('soundBtn').addEventListener('click', () => {
      app.soundOn = !app.soundOn;
      localStorage.setItem('chessSound', app.soundOn ? 'on' : 'off');
      $('soundBtn').innerHTML = app.soundOn ? ICON.soundOn : ICON.soundOff;
      if (app.soundOn) playMoveSound(false); // короткий пример
    });
    app.view = localStorage.getItem('chessView') || '2d';
    applyView(app.view);
    $('themeBar').addEventListener('click', (e) => {
      const b = e.target.closest('.ch-sw');
      if (b) { app.theme = b.dataset.theme; localStorage.setItem('chessTheme', app.theme); applyTheme(app.theme); markActive('#themeBar .ch-sw', b);
        if (app.state && !$('gameScreen').hidden) { renderBoard(); }   // перекрасить доску/фигуры (в т.ч. 3D) под тему
        return; }
      const v = e.target.closest('.ch-vw');
      if (v) { app.view = v.dataset.view; localStorage.setItem('chessView', app.view); applyView(app.view); markActive('#themeBar .ch-vw', v);
        if (app.state && !$('gameScreen').hidden) { renderBoard(); renderPlayerBars(); updateClocks(); applyScreenFlip(); } return; }
      const tx = e.target.closest('.ch-tx');
      if (tx) { app.texture = tx.dataset.tex; localStorage.setItem('chessTexture', app.texture); applyTexture(app.texture); markActive('#themeBar .ch-tx', tx);
        if (app.state && !$('gameScreen').hidden) { renderBoard(); } }
    });
    app.texture = localStorage.getItem('chessTexture') || 'plain';
    applyTexture(app.texture);
    selectDefault('#themeBar .ch-tx', `[data-tex="${app.texture}"]`);
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
    selectDefault('#themeBar .ch-vw', `[data-view="${app.view}"]`);
    updateSummaries(); updateSetupVisibility();
  }

  // Цвет своих фигур в обучении/проверке/игре-повторении берётся из настройки «Играть за».
  // 'r' (Рандом) выбирается заново при старте каждого урока/проверки/игры.
  function resolveTutSide() { app.tutSideResolved = setup.side === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : setup.side; return app.tutSideResolved; }
  // отображаемый цвет фигуры (косметический обмен, если играем чёрными)
  function tutDispColor(actual) { return app.tutSideResolved === 'b' ? (actual === 'w' ? 'b' : 'w') : actual; }

  function updateSummaries() {
    $('valSide').textContent = { w: 'Белые', b: 'Чёрные', r: 'Рандом' }[setup.side];
    $('valLevel').textContent = { 1: 'Лёгкий', 2: 'Средний', 3: 'Сложный' }[setup.level];
    const parts = [];
    if (setup.timeMin > 0) parts.push(setup.timeMin + ' мин');
    if (setup.moveLim > 0) parts.push(setup.moveLim + ' ход.');
    $('valClock').textContent = parts.length ? parts.join(' · ') : 'Без ограничения';
  }

  function updateSetupVisibility() {
    $('accLevel').style.display = setup.mode === 'bot' ? '' : 'none';
    $('friendHint').hidden = setup.mode !== 'friend';
  }

  function selectDefault(g, s) { const el = document.querySelector(g + s) || document.querySelector(g); if (el) markActive(g, el); }
  function markActive(g, el) { document.querySelectorAll(g).forEach(x => x.classList.remove('active')); el.classList.add('active'); }

  function showSetup() {
    closeOnline();
    document.body.classList.remove('ch-watching');
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
    // зритель: не может ходить/сдаваться/отменять
    const watch = onl && app.online.role === 'watch';
    document.body.classList.toggle('ch-watching', !!watch);
    if (watch) { $('btnUndo').style.display = 'none'; $('btnResign').style.display = 'none'; }
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
    saveOnlineGame();
    connectOnline();
    enterGameScreen();
  }

  function startOnlineGuest(hash) {
    const params = parseHash(hash);
    if (!params.room) { showSetup(); return; }
    app.theme = localStorage.getItem('chessTheme') || 'classic'; applyTheme(app.theme);
    if (!netAvailable()) {
      app.mode = 'friend'; resetGame();
      alert('Чтобы играть онлайн, откройте ссылку в обычном браузере с интернетом.');
      showSetup(); return;
    }
    app.mode = 'friend';
    resetGame();
    resetGameStats();
    const saved = loadOnlineGame(params.room);
    const hostColor = params.h === 'b' ? 'b' : 'w';
    setup.timeMin = saved ? (saved.tm || 0) : (parseInt(params.t || '0', 10) || 0);
    setup.moveLim = saved ? (saved.mm || 0) : (parseInt(params.m || '0', 10) || 0);
    // если я уже играл в этой партии на этом устройстве — беру своё прежнее место
    app.myColor = (saved && saved.seat) ? saved.seat : (hostColor === 'w' ? 'b' : 'w');
    app.orientation = app.myColor;
    const role = (app.myColor === hostColor) ? 'host' : 'guest';
    app.online = { on: true, role, room: params.room, myColor: app.myColor, hostColor, myId: null, net: null, connected: false, peerReady: false, failed: false, timeMin: setup.timeMin, moveLim: setup.moveLim };
    initClock();
    // восстановить все сделанные ходы из памяти
    if (saved && saved.moves && saved.moves.length) {
      rebuildFrom(saved.moves);
      if (saved.msW != null) { app.clock.timeMs.w = saved.msW; app.clock.timeMs.b = saved.msB; }
      if (saved.mvW != null) { app.clock.movesLeft.w = saved.mvW; app.clock.movesLeft.b = saved.mvB; }
      app.clock.lastTick = Date.now();
    }
    saveOnlineGame();
    connectOnline();
    enterGameScreen();
    checkOver();
  }

  // Наблюдатель: заходит по «зрительской» ссылке, только смотрит (не ходит)
  function startOnlineWatch(hash) {
    const params = parseHash(hash);
    if (!params.room) { showSetup(); return; }
    app.theme = localStorage.getItem('chessTheme') || 'classic'; applyTheme(app.theme);
    if (!netAvailable()) { app.mode = 'friend'; resetGame(); alert('Чтобы смотреть партию онлайн, откройте ссылку в браузере с интернетом.'); showSetup(); return; }
    app.mode = 'friend'; resetGame();
    const saved = loadOnlineGame(params.room);
    const hostColor = params.h === 'b' ? 'b' : 'w';
    setup.timeMin = saved ? (saved.tm || 0) : (parseInt(params.t || '0', 10) || 0);
    setup.moveLim = saved ? (saved.mm || 0) : (parseInt(params.m || '0', 10) || 0);
    app.myColor = null; app.orientation = 'w';
    app.online = { on: true, role: 'watch', room: params.room, myColor: null, hostColor, myId: null, net: null, connected: false, peerReady: false, failed: false, timeMin: setup.timeMin, moveLim: setup.moveLim, watchers: {} };
    initClock();
    if (saved && saved.moves && saved.moves.length) {
      rebuildFrom(saved.moves);
      if (saved.msW != null) { app.clock.timeMs.w = saved.msW; app.clock.timeMs.b = saved.msB; }
      if (saved.mvW != null) { app.clock.movesLeft.w = saved.mvW; app.clock.movesLeft.b = saved.mvB; }
      app.clock.lastTick = Date.now();
    }
    document.body.classList.add('ch-watching');
    connectOnline();
    enterGameScreen();
    checkOver();
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
  function buildWatchLink() { return buildOnlineLink() + '&w=1'; }

  function connectOnline() {
    const o = app.online;
    o.net = ChessNet.connect(o.room, {
      onOpen: () => {
        o.connected = true; o.failed = false; o.myId = o.net.id;
        netSend({ t: 'hi', s: o.myId, c: o.myColor, r: o.role });
        startPresence(); setOnlineStatus();
        // Обновляем «прилипающее» состояние на сервере, но с задержкой: сначала
        // даём брокеру прислать своё сохранённое состояние (вдруг оно новее), а
        // потом публикуем самую длинную известную партию — чтобы не затереть ходы.
        if (app.history.length && o.role !== 'watch') setTimeout(() => { if (app.online.on && app.online.net) publishStateRetained(); }, 1500);
      },
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

  function handleNetMsg(o, retained) {
    const me = app.online;
    if (!me.on) return;
    if (o.s && o.s === me.myId) return; // свои сообщения игнорируем
    // Сохранённое (retained) сообщение брокера — это старое состояние партии,
    // а не признак того, что соперник сейчас на связи. Восстанавливаем ходы, но
    // НЕ помечаем соперника присутствующим (его покажет только «живой» пинг).
    if (retained) { if (o.t === 'sync') applySync(o); return; }
    // сообщение от ЗРИТЕЛЯ — учитываем в счётчике зрителей, но это не соперник
    if (o.r === 'watch') {
      me.watchers = me.watchers || {};
      if (o.t === 'bye') delete me.watchers[o.s]; else me.watchers[o.s] = Date.now();
      if (o.t === 'react') showReaction(o.e, true);
      setOnlineStatus();
      return;
    }
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
    } else if (o.t === 'react') {
      showReaction(o.e, true);
    }
  }

  /* ---- Присутствие соперника: «пинги» + сторож ---- */
  function startPresence() {
    const o = app.online; clearPresence();
    o.lastSeen = Date.now();
    o.watchers = o.watchers || {};
    o.hbTimer = setInterval(() => { if (app.online.on) netSend({ t: 'ping', s: app.online.myId, r: app.online.role }); }, 3000);
    o.wdTimer = setInterval(() => {
      const a = app.online; if (!a.on) return;
      const before = watchCount();
      if (a.peerReady && Date.now() - (a.lastSeen || 0) > 8000) { a.peerReady = false; setOnlineStatus(); }
      if (watchCount() !== before) setOnlineStatus();   // изменилось число зрителей
    }, 2000);
  }
  function watchCount() {
    const o = app.online; if (!o) return 0;
    let n = 0; const now = Date.now(); const w = o.watchers || {};
    for (const id in w) { if (now - w[id] < 8000) n++; else delete w[id]; }
    if (o.role === 'watch') n++;   // себя тоже считаю
    return n;
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
  // Полное состояние партии — «прилипающим» (retained) сообщением, чтобы оно
  // сохранялось на сервере и восстанавливалось при заходе по ссылке позже.
  function publishStateRetained() {
    const o = app.online; if (!o || !o.on || !o.net) return;
    o.net.publish(Object.assign({ t: 'sync', s: o.myId, moves: app.history.slice(), h: o.hostColor, tm: o.timeMin || 0, mm: o.moveLim || 0 }, clockSnapshot()), true);
  }

  // Сохранение партии в память телефона (по комнате из ссылки) — навсегда
  function gameKey(room) { return 'chessG:' + room; }
  function saveOnlineGame() {
    const o = app.online; if (!o || !o.on || !o.room) return;
    try {
      localStorage.setItem(gameKey(o.room), JSON.stringify({
        moves: app.history.slice(), host: o.hostColor, seat: o.myColor,
        tm: o.timeMin || 0, mm: o.moveLim || 0,
        msW: app.clock.timeMs.w, msB: app.clock.timeMs.b, mvW: app.clock.movesLeft.w, mvB: app.clock.movesLeft.b,
        t: Date.now()
      }));
    } catch (e) { }
  }
  function loadOnlineGame(room) { try { return JSON.parse(localStorage.getItem(gameKey(room)) || 'null'); } catch (e) { return null; } }

  function applySync(o) {
    if (!o.moves || o.moves.length <= app.history.length) return; // применяем, только если пришла более длинная партия
    rebuildFrom(o.moves);
    adoptClock(o);
    saveOnlineGame();
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
    saveOnlineGame();
    render();
    if (capType) showTaunt(lm.to, capType);
    checkOver();
  }

  function publishMove() {
    netSend(Object.assign({ t: 'mv', s: app.online.myId, mv: app.history[app.history.length - 1] }, clockSnapshot()));
  }

  function setOnlineStatus() {
    const o = app.online; if (!o.on) return;
    const st = $('onlineStatus');
    st.classList.remove('ok', 'warn', 'bad');
    const watch = o.role === 'watch';
    if (o.failed && !o.connected) { st.textContent = '🔴 Нет связи с сервером. Проверьте интернет.'; st.classList.add('bad'); }
    else if (!o.connected) { st.textContent = '🟡 Подключение к серверу…'; st.classList.add('warn'); }
    else if (watch) { st.textContent = '👁 Вы смотрите партию'; st.classList.add('ok'); }
    else if (!o.peerReady) { st.textContent = '🔴 Соперника нет'; st.classList.add('bad'); }
    else { st.textContent = '🟢 Соперник есть'; st.classList.add('ok'); }
    // число зрителей
    const wc = watchCount(), we = $('watchers');
    if (we) { if (wc > 0) { we.hidden = false; we.textContent = '👁 Смотрят: ' + wc; } else we.hidden = true; }
    // ссылки: соперника показываем только игрокам, зрительскую — всем
    const oppInp = $('onlineLink'); if (oppInp) oppInp.value = buildOnlineLink();
    const wl = $('watchLink'); if (wl) wl.value = buildWatchLink();
    const oppCol = $('oppCol'); if (oppCol) oppCol.hidden = watch;
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

  // «Играть рядом»: на ход чёрных переворачиваем на 180° САМИ ФИГУРЫ (как в 2D),
  // а доску и буквы a–h НЕ трогаем — поэтому не выглядит зеркально. В 3D фигуры
  // переворачиваются вверх ногами прямо на месте, по центру своей клетки.
  function applyScreenFlip() {
    const fa = $('flipArea'); if (!fa) return;
    const flip = app.mode === 'local' && !app.over && app.state && app.state.turn === 'b';
    fa.classList.toggle('flip180', !!flip);
    app.screenFlipped = !!flip;
  }
  function colorName(c) { return c === 'w' ? 'Белые' : 'Чёрные'; }
  function FILE_LETTER(f) { return 'abcdefgh'[f]; }

  function viewBottomColor() { return app.orientation; }

  function renderBoard() {
    elBoard.innerHTML = '';
    const flip = app.orientation === 'b';       // полный разворот на 180° (бот/друг за чёрных)
    // Слой стоящих фигур (3D) перестраиваем ТОЛЬКО когда позиция изменилась —
    // иначе при каждом выборе/тапе пересоздаются 32 картинки и телефон тормозит.
    let sig = flip ? 'F' : 'N'; for (let i = 0; i < 64; i++) sig += app.state.board[i] || '.';
    const rebuildPL = !!elPieceLayer && sig !== plSig;
    if (rebuildPL) { elPieceLayer.innerHTML = ''; plSig = sig; }
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
      if (p) { const pc = document.createElement('span'); pc.className = 'ch-piece ' + (C.colorOf(p) === 'w' ? 'white' : 'black'); pc.innerHTML = pieceHTML(C.colorOf(p), C.typeOf(p)); cell.appendChild(pc); }
      const lm = app.legalFrom.find(m => m.to === s);
      if (lm) { const dot = document.createElement('span'); dot.className = 'ch-dot' + (app.state.board[s] || lm.flag === 'ep' ? ' cap' : ''); cell.appendChild(dot); }
      if (p && C.typeOf(p) === 'k' && C.inCheck(app.state, C.colorOf(p)) && (C.colorOf(p) === app.state.turn || app.over)) cell.classList.add('check');
      cell.addEventListener('pointerdown', (e) => onPointerDown(e, s));
      elBoard.appendChild(cell);
      // Слой «стоящих» фигур для 3D (виден только в 3D, клики сквозь него)
      if (rebuildPL) {
        const pcell = document.createElement('div'); pcell.className = 'pl-cell';
        if (p) { const col = C.colorOf(p) === 'w' ? 'w' : 'b'; if (C.typeOf(p) === 'p') pcell.classList.add('pl-pawn'); const pi = document.createElement('div'); pi.className = 'pl-piece'; const im = document.createElement('div'); im.className = 'pl-img pt-' + col + C.typeOf(p); pi.appendChild(im); pcell.appendChild(pi); }
        elPieceLayer.appendChild(pcell);
      }
    }
    if (use3DReal()) update3D();
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
    const bottomColor = viewBottomColor(), topColor = bottomColor === 'w' ? 'b' : 'w';
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
    gt.innerHTML = inl(ICON.clock) + (app.over ? 'Партия длилась: ' : 'Идёт: ') + fmtDur(ms);
  }
  function updateClocks() { const cl = app.clock, bottomColor = viewBottomColor(), topColor = bottomColor === 'w' ? 'b' : 'w'; setClock('bot', bottomColor, cl); setClock('top', topColor, cl); }
  function setClock(which, color, cl) {
    const el = $(which + 'Clock');
    if (!cl.timeOn && !cl.movesOn) { el.hidden = true; return; }
    el.hidden = false; el.classList.remove('active', 'low');
    if (!app.over && app.state && app.state.turn === color) el.classList.add('active');
    const parts = []; let low = false;
    if (cl.timeOn) { parts.push(inl(ICON.clock) + fmtTime(cl.timeMs[color])); if (cl.timeMs[color] <= 20000) low = true; }
    if (cl.movesOn) { parts.push(inl(ICON.moves) + cl.movesLeft[color]); if (cl.movesLeft[color] <= 3) low = true; }
    el.innerHTML = parts.join('  ·  '); if (low) el.classList.add('low');
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
    // рокировка тапом по своей ладье, когда выбран король
    if (app.selected >= 0 && isMyPiece(p) && C.typeOf(p) === 'r' && app.state.board[app.selected] && C.typeOf(app.state.board[app.selected]) === 'k') {
      const want = (s % 8) === 7 ? 'cK' : ((s % 8) === 0 ? 'cQ' : null);
      const cm = want && app.legalFrom.find(m => m.flag === want);
      if (cm) { e.preventDefault(); doMove(cm); return; }
    }
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

  // Эмодзи-реакции: всплывающий эмодзи над доской
  function showReaction(emo, fromPeer) {
    const layer = $('reactLayer'); if (!layer) return;
    const el = document.createElement('div');
    el.className = 'ch-react-fly' + (fromPeer ? ' peer' : '');
    el.textContent = emo;
    el.style.left = (12 + Math.random() * 70) + '%';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  function bindReactions() {
    const bar = $('reactBar'); if (!bar || bar._bound) return; bar._bound = true;
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('.ch-react'); if (!b) return;
      const emo = b.dataset.emo;
      showReaction(emo, false);
      if (app.mode === 'friend' && app.online && app.online.on) netSend({ t: 'react', e: emo });
    });
  }

  // Звук ШАХА/МАТА — как «взятие», только громче (мат — двойной мощный удар)
  function playCheckSound(mate) {
    if (!app.soundOn) return;
    const ctx = getAudio(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    thump(ctx, t, 300, 80, 0.9, 0.18, 'sawtooth');
    noiseBurst(ctx, t, 0.08, 'highpass', 850, 0.75);
    if (mate) {
      thump(ctx, t + 0.15, 210, 60, 0.95, 0.24, 'sawtooth');
      noiseBurst(ctx, t + 0.15, 0.11, 'highpass', 650, 0.8);
    }
  }

  function startDrag(e, s, p) {
    drag.active = true; drag.from = s; drag.moved = false; drag.sx = e.clientX; drag.sy = e.clientY;
    const size = elBoard.clientWidth / 8;
    const g = drag.ghost;
    g.style.width = size + 'px'; g.style.height = size + 'px';
    g.innerHTML = `<span class="ch-piece ${C.colorOf(p) === 'w' ? 'white' : 'black'}">${pieceHTML(C.colorOf(p), C.typeOf(p))}</span>`;
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
  const TAUNT_BY = { p: 'Хочу ещё!', n: 'Я голоден!', b: 'Ха-ха!', r: 'Как вкусно!', q: 'Лашара!' };
  let tauntEl = null, tauntTimer = 0;
  function showTaunt(sq, type) {
    const cell = elBoard.querySelector(`.ch-sq[data-sq="${sq}"]`);
    if (!cell) return;
    if (!tauntEl) { tauntEl = document.createElement('div'); tauntEl.className = 'ch-taunt'; document.body.appendChild(tauntEl); }
    const r = cell.getBoundingClientRect();
    tauntEl.textContent = TAUNT_BY[type] || 'Ам!';
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
    // шах/мат — отдельный громкий звук
    if (C.inCheck(app.state, app.state.turn)) {
      const mate = C.legalMoves(app.state).length === 0;
      setTimeout(() => playCheckSound(mate), capType ? 120 : 60);
    }
    if (hasYou()) trackMyMove(m, me, capType, fromAttacked);
    if (app.mode === 'friend' && app.online.on) { publishMove(); publishStateRetained(); saveOnlineGame(); }
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
    let ico = ICON.handshake, title = 'Ничья', text = '', winnerColor = null;
    if (res.type === 'checkmate') { ico = ICON.king; title = 'Мат!'; text = `${colorName(res.winner)} выиграли!`; winnerColor = res.winner; }
    else if (res.type === 'stalemate') { ico = ICON.handshake; title = 'Пат — ничья'; text = 'Ходить нечем, но шаха нет. Ничья.'; }
    else if (res.type === 'time') { const w = res.loser === 'w' ? 'b' : 'w'; ico = ICON.clock; title = 'Время вышло'; text = `У ${colorName(res.loser).toLowerCase()} закончилось время. ${colorName(w)} выиграли!`; winnerColor = w; }
    else if (res.type === 'moves') { const mw = materialWinner(); ico = ICON.moves; if (mw.winner) { title = 'Лимит ходов'; text = `Ходы закончились. ${colorName(mw.winner)} выиграли по материалу (+${mw.adv}).`; winnerColor = mw.winner; } else { title = 'Лимит ходов — ничья'; text = 'Ходы закончились, материал равный. Ничья.'; } }
    else if (res.type === 'resign') { const w = res.loser === 'w' ? 'b' : 'w'; ico = ICON.flag; title = 'Сдача'; text = `${colorName(res.loser)} сдались. ${colorName(w)} выиграли!`; winnerColor = w; }
    else { ico = ICON.handshake; title = 'Ничья'; text = 'Недостаточно материала или правило 50 ходов.'; }
    app.gameDurMs = (app.gs && app.gs.start) ? (Date.now() - app.gs.start) : 0;
    recordResult(winnerColor);
    countGame();
    trackGameEnd(res, winnerColor);
    app.overText = title + ' — ' + text;
    updateGameTime();
    render();
    $('overIco').innerHTML = ico; $('overTitle').textContent = title; $('overText').textContent = text;
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
  function applyTexture(name) { document.body.setAttribute('data-chess-texture', name || 'plain'); }
  /* ===== Настоящий 3D (WebGL) ===== */
  let _c3dReady = false;
  function bodyTheme() { return document.body.dataset.chessTheme || 'classic'; }
  function use3DReal() { return app.view === '3d' && !!window.Chess3D; }
  function ensure3D() {
    if (_c3dReady || !window.Chess3D) return;
    const el = $('board3d'); if (!el) return;
    el.hidden = false;
    Chess3D.init(el, { onTap: boardTap, theme: bodyTheme });
    _c3dReady = true;
  }
  function boardTap(s) {
    const ae = document.activeElement; if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA')) ae.blur();
    if (!app.state || !canMoveNow()) return;
    const p = app.state.board[s];
    if (app.selected >= 0 && isMyPiece(p) && C.typeOf(p) === 'r' && app.state.board[app.selected] && C.typeOf(app.state.board[app.selected]) === 'k') {
      const want = (s % 8) === 7 ? 'cK' : ((s % 8) === 0 ? 'cQ' : null);
      const cm = want && app.legalFrom.find(m => m.flag === want);
      if (cm) { doMove(cm); return; }
    }
    if (isMyPiece(p)) { app.selected = s; app.legalFrom = C.legalMovesFrom(app.state, s); renderBoard(); return; }
    if (app.selected >= 0) { if (tryMoveTo(s)) return; }
    app.selected = -1; app.legalFrom = []; renderBoard();
  }
  function update3D() {
    if (!use3DReal() || !_c3dReady || !app.state) return;
    const localFlip = app.mode === 'local' && !app.over && app.state.turn === 'b';
    const rot = (app.orientation === 'b') !== localFlip;
    let checkSq = -1;
    if (C.inCheck(app.state, app.state.turn)) { for (let i = 0; i < 64; i++) { const p = app.state.board[i]; if (p && C.typeOf(p) === 'k' && C.colorOf(p) === app.state.turn) { checkSq = i; break; } } }
    Chess3D.update(app.state, {
      theme: bodyTheme(), texture: app.texture || 'plain', flip: rot,
      selected: app.selected, legal: app.selected >= 0 ? app.legalFrom : [],
      occupied: (sq) => !!app.state.board[sq],
      last: app.lastMove, checkSq: checkSq
    });
  }
  function applyView(v) {
    document.body.classList.toggle('ch-3d', v === '3d');
    const real = (v === '3d') && !!window.Chess3D;
    document.body.classList.toggle('ch-3dreal', real);
    const el = $('board3d');
    if (real) { ensure3D(); if (el) el.hidden = false; if (window.Chess3D) Chess3D.setVisible(true); update3D(); }
    else { if (window.Chess3D && Chess3D.setVisible) Chess3D.setVisible(false); if (el) el.hidden = true; }
  }

  /* ========================================================
     КНОПКИ + МОДАЛКИ
     ======================================================== */
  function bindGame() {
    $('btnMenu').addEventListener('click', () => { location.hash = ''; showSetup(); });
    $('btnFlip').addEventListener('click', () => { app.orientation = app.orientation === 'w' ? 'b' : 'w'; renderBoard(); renderPlayerBars(); });
    $('btnUndo').addEventListener('click', () => { if (app.online && app.online.on) requestUndo(); else undoLast(); });
    $('btnUndoAllow').addEventListener('click', () => answerUndo(true));
    $('btnUndoDeny').addEventListener('click', () => answerUndo(false));
    $('btnResign').addEventListener('click', () => {
      if (app.over) return;
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
    $('btnOnlineCopy').addEventListener('click', () => { const inp = $('onlineLink'); inp.select(); copyText(inp.value).then(ok => { $('btnOnlineCopy').innerHTML = ok ? '✓ Скопировано — отправьте другу' : inl(ICON.copy) + 'Выделено — скопируйте вручную'; }); });
    $('btnWatchCopy').addEventListener('click', () => { const inp = $('watchLink'); inp.select(); copyText(inp.value).then(ok => { $('btnWatchCopy').innerHTML = ok ? '✓ Ссылка для зрителя скопирована' : inl(ICON.copy) + 'Выделено — скопируйте вручную'; }); });
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
    o.undoTimer = setTimeout(() => { if (app.online && app.online.undoPending) { resetUndoBtn(); showInfoToast(ICON.hourglass, 'Соперник не ответил', false); } }, 20000);
  }
  function resetUndoBtn() {
    if (app.online) { app.online.undoPending = false; if (app.online.undoTimer) { clearTimeout(app.online.undoTimer); app.online.undoTimer = null; } }
    const b = $('btnUndo'); if (b) { b.disabled = false; b.textContent = '↶ Отменить'; }
  }
  // Соперник прислал ответ на мой запрос
  function onUndoAnswer(allowed) {
    resetUndoBtn();
    if (allowed) { performUndoOnline(); showInfoToast(ICON.check, 'Соперник разрешил отмену', true); }
    else { showInfoToast(ICON.cross, 'Соперник не разрешил отмену', false); }
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
    if (!o.peerReady) { showInfoToast(ICON.hourglass, 'Соперника нет в сети', false); return; }
    o.rematchPending = true;
    netSend({ t: 'rematchReq', s: o.myId });
    const b = $('btnNewGame'); if (b) { b.disabled = true; b.textContent = '⏳ Ждём соперника…'; }
    o.rematchTimer = setTimeout(() => { if (app.online && app.online.rematchPending) { resetRematchBtn(); showInfoToast(ICON.hourglass, 'Соперник не ответил', false); } }, 25000);
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
    else { showInfoToast(ICON.cross, 'Соперник отказался от новой партии', false); }
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
    // весёлый восходящий перезвон «правильно!» — средние/высокие частоты, слышно и на телефоне
    const note = (f, s, d, vol) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol || 0.45, s + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, s + d); o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + d + 0.02); };
    note(659, t, 0.12); note(880, t + 0.10, 0.12); note(1319, t + 0.20, 0.24, 0.5);
  }
  function playBadSound() {
    if (!app.soundOn) return; const ctx = getAudio(); if (!ctx) return; if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    // ясный нисходящий «зуммер» ошибки — квадратная волна в среднем диапазоне (хорошо слышно на телефоне)
    const buzz = (f, s, d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(f, s); g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.32, s + 0.012); g.gain.setValueAtTime(0.32, s + d - 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + d); o.connect(g); g.connect(ctx.destination); o.start(s); o.stop(s + d + 0.02); };
    buzz(392, t, 0.09); buzz(294, t + 0.085, 0.14);
  }

  // Разделы и уроки. steps: массив задач-позиций; info:true — тема «для понимания».
  const TUT_SECTIONS = [{"name":"Движение фигур","lessons":[{"id":"m-pawn","title":"Пешка","icon":"♟","explain":"Пешка ходит только вперёд: на 1 клетку, а с начального места — сразу на 2. Ест по-другому — по диагонали на 1 клетку вперёд.","steps":[{"board":["b3 wp","e3 wk","a4 bn","h6 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: b3 на a4.","answers":["b3a4"]},{"board":["d1 bk","f2 wp","e3 wk","g3 bp"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: f2 на g3.","answers":["f2g3"]},{"board":["b3 bk","b5 wp","a6 bn","e8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: b5 на a6.","answers":["b5a6"]},{"board":["h1 bk","f4 wp","c5 wk","g5 bb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: f4 на g5.","answers":["f4g5"]},{"board":["f2 wp","g3 bq","b5 wk","a7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: f2 на g3.","answers":["f2g3"]},{"board":["e2 wk","f4 wp","e5 bn","h5 bk","f6 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: f4 на e5.","answers":["f4e5"]},{"board":["h2 wb","b4 wk","g4 bk","g6 wp","h7 bp"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: g6 на h7.","answers":["g6h7"]},{"board":["g1 wn","d2 bk","e4 wp","f5 bb","e8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: e4 на f5.","answers":["e4f5"]},{"board":["f2 wp","e3 bn","b4 wb","d5 bk","g8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: f2 на e3.","answers":["f2e3"]},{"board":["d1 wp","e2 bb","d3 wk","h6 wb","g8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: d1 на e2.","answers":["d1e2"]},{"board":["c3 wp","d4 bb","e4 bk","g5 wb","d7 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: c3 на d4.","answers":["c3d4"]},{"board":["g2 wp","h2 wk","h3 bp","b5 bk","g6 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: g2 на h3.","answers":["g2h3"]},{"board":["c4 wp","g4 wb","d5 bb","c7 wk","e8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: c4 на d5.","answers":["c4d5"]},{"board":["d4 wp","e4 wk","h4 bk","c5 bq","h6 wn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: d4 на c5.","answers":["d4c5"]},{"board":["a3 wb","a5 wp","e5 bk","b6 bq","d7 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь пешкой: a5 на b6.","answers":["a5b6"]}]},{"id":"m-knight","title":"Конь","icon":"♞","explain":"Конь ходит буквой «Г»: две клетки прямо и одну вбок. Он единственный, кто перепрыгивает через другие фигуры! Ест туда же, куда ходит.","steps":[{"board":["a3 wk","d5 wn","b6 bp","a7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: d5 на b6.","answers":["d5b6"]},{"board":["c2 bp","h3 bk","b4 wn","h7 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: b4 на c2.","answers":["b4c2"]},{"board":["f2 bp","e4 wn","f6 wk","f8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: e4 на f2.","answers":["e4f2"]},{"board":["a6 wk","d6 bk","g6 bq","f8 wn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: f8 на g6.","answers":["f8g6"]},{"board":["c1 wk","c3 bp","e4 wn","h7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: e4 на c3.","answers":["e4c3"]},{"board":["e3 wn","h3 wr","c4 bn","h5 wk","f6 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: e3 на c4.","answers":["e3c4"]},{"board":["h2 bk","c3 wn","g4 wk","g7 wn","e8 bp"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: g7 на e8.","answers":["g7e8"]},{"board":["b2 bk","f2 wk","h5 wb","e6 bn","c7 wn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: c7 на e6.","answers":["c7e6"]},{"board":["a6 bk","d6 wn","f6 wb","d8 wk","e8 br"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: d6 на e8.","answers":["d6e8"]},{"board":["b2 wb","b4 wk","d6 bq","e6 bk","c8 wn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: c8 на d6.","answers":["c8d6"]},{"board":["d3 wn","f4 bn","g5 wk","d6 wn","h7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: d3 на f4.","answers":["d3f4"]},{"board":["f3 wn","d4 bq","a6 bk","c7 wb","b8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: f3 на d4.","answers":["f3d4"]},{"board":["d3 br","e3 bk","c4 wk","f4 wn","g6 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: f4 на d3.","answers":["f4d3"]},{"board":["f3 wn","e4 wk","e5 br","b6 wr","d7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: f3 на e5.","answers":["f3e5"]},{"board":["g1 bq","h3 wn","b5 wk","e5 wr","c8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь конём: h3 на g1.","answers":["h3g1"]}]},{"id":"m-bishop","title":"Слон","icon":"♝","explain":"Слон ходит по диагоналям на любое число клеток. Ест туда же. Каждый слон всю партию ходит по клеткам одного цвета.","steps":[{"board":["d1 bk","h2 wk","b6 wb","c7 bq"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: b6 на c7.","answers":["b6c7"]},{"board":["h1 wk","a2 wb","d2 bk","b3 bn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: a2 на b3.","answers":["a2b3"]},{"board":["a1 bk","f3 wb","e5 wk","a8 bb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: f3 на a8.","answers":["f3a8"]},{"board":["e3 bk","b4 wb","a5 wk","c5 bp"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: b4 на c5.","answers":["b4c5"]},{"board":["a4 wk","d4 bb","d6 bk","f6 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: f6 на d4.","answers":["f6d4"]},{"board":["f2 bk","c4 wk","d4 wn","b7 wb","c8 bn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: b7 на c8.","answers":["b7c8"]},{"board":["d3 wr","a4 bp","a5 bk","e5 wk","e8 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: e8 на a4.","answers":["e8a4"]},{"board":["c1 wr","a3 bk","g6 wb","h7 bn","h8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: g6 на h7.","answers":["g6h7"]},{"board":["c1 bk","g2 wk","b4 wb","c5 bp","a8 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: b4 на c5.","answers":["b4c5"]},{"board":["e1 wb","d3 wk","h4 br","c5 bk","c7 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: e1 на h4.","answers":["e1h4"]},{"board":["f3 wk","g3 bp","a4 bk","e6 wr","b8 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: b8 на g3.","answers":["b8g3"]},{"board":["a1 wb","f2 wk","h4 bp","d7 bk","d8 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: d8 на h4.","answers":["d8h4"]},{"board":["g5 bq","a6 bk","d6 wk","h6 wr","d8 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: d8 на g5.","answers":["d8g5"]},{"board":["g2 wk","d3 bk","h3 br","d7 wb","g8 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: d7 на h3.","answers":["d7h3"]},{"board":["b1 wb","d3 bq","h3 bk","h7 wk","b8 wn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь слоном: b1 на d3.","answers":["b1d3"]}]},{"id":"m-rook","title":"Ладья","icon":"♜","explain":"Ладья ходит по прямым — по вертикали и горизонтали — на любое число клеток. Ест туда же.","steps":[{"board":["c1 bb","e1 wr","h2 wk","f8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: e1 на c1.","answers":["e1c1"]},{"board":["h1 bk","a4 wk","e6 wr","f6 bn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: e6 на f6.","answers":["e6f6"]},{"board":["h1 wk","d7 bn","g7 wr","c8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: g7 на d7.","answers":["g7d7"]},{"board":["d7 wk","h7 bk","a8 br","g8 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: g8 на a8.","answers":["g8a8"]},{"board":["a7 wk","d7 bk","c8 wr","g8 bb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: c8 на g8.","answers":["c8g8"]},{"board":["f2 wr","f4 bp","c5 wk","f5 bk","e8 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: f2 на f4.","answers":["f2f4"]},{"board":["a2 bk","d3 wk","h4 wr","h6 br","f8 wn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: h4 на h6.","answers":["h4h6"]},{"board":["a1 wk","f2 wb","h2 wr","d6 bk","h8 bn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: h2 на h8.","answers":["h2h8"]},{"board":["h1 wk","e3 wn","f3 bk","d6 wr","d7 bp"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: d6 на d7.","answers":["d6d7"]},{"board":["a1 wn","h2 bk","d3 wk","d4 bq","d8 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: d8 на d4.","answers":["d8d4"]},{"board":["h2 wk","b5 bk","c6 wr","g6 bq","g8 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: c6 на g6.","answers":["c6g6"]},{"board":["a1 wk","h2 bk","g3 wn","d5 wr","e5 bn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: d5 на e5.","answers":["d5e5"]},{"board":["a1 wk","a4 wr","g4 bb","f7 bk","g7 wb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: a4 на g4.","answers":["a4g4"]},{"board":["g3 wr","h3 wk","f5 bb","h5 wr","a7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: h5 на f5.","answers":["h5f5"]},{"board":["e2 wk","c4 wb","c5 bk","a7 br","d7 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ладьёй: d7 на a7.","answers":["d7a7"]}]},{"id":"m-queen","title":"Ферзь","icon":"♛","explain":"Ферзь — самая сильная фигура: ходит и как ладья, и как слон (прямо и по диагонали) на любое число клеток.","steps":[{"board":["g1 wq","f2 bq","c5 wk","b7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: g1 на f2.","answers":["g1f2"]},{"board":["e3 bn","e4 wq","a5 bk","a7 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: e4 на e3.","answers":["e4e3"]},{"board":["a3 bq","a5 wq","f6 bk","a8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: a5 на a3.","answers":["a5a3"]},{"board":["f3 wq","e4 wk","d7 bk","f8 bb"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: f3 на f8.","answers":["f3f8"]},{"board":["e1 wq","f2 bp","g4 wk","f6 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: e1 на f2.","answers":["e1f2"]},{"board":["d2 wk","h4 bk","e5 wr","e6 wq","e7 bp"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: e6 на e7.","answers":["e6e7"]},{"board":["d1 bb","d2 wq","e4 wk","c5 wb","c8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: d2 на d1.","answers":["d2d1"]},{"board":["d1 wk","h1 wq","b6 wn","d6 bk","h8 bn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: h1 на h8.","answers":["h1h8"]},{"board":["a2 wn","h3 wk","a4 wq","a8 bq","c8 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: a4 на a8.","answers":["a4a8"]},{"board":["d1 br","e4 wn","a5 bk","d6 wq","b7 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: d6 на d1.","answers":["d6d1"]},{"board":["d2 bk","h3 br","h4 wq","e5 wk","h8 wn"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: h4 на h3.","answers":["h4h3"]},{"board":["c1 wr","a5 bk","h5 wk","f6 wq","g6 bq"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: f6 на g6.","answers":["f6g6"]},{"board":["d1 wk","a2 wq","c2 bp","g2 bk","f8 wr"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: a2 на c2.","answers":["a2c2"]},{"board":["f1 wk","a3 wb","d4 bk","c7 bq","h7 wq"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: h7 на c7.","answers":["h7c7"]},{"board":["f3 wn","g3 bk","e4 wk","f6 bp","f8 wq"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь ферзём: f8 на f6.","answers":["f8f6"]}]},{"id":"m-king","title":"Король","icon":"♚","explain":"Король ходит на 1 клетку в любую сторону. Короля нельзя ставить под бой, и его нельзя съесть — ему объявляют мат.","steps":[{"board":["b3 wk","c3 wk","a4 bb","h4 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: b3 на a4.","answers":["b3a4"]},{"board":["h6 bk","b7 br","c7 wk","a8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: a8 на b7.","answers":["a8b7"]},{"board":["g3 bk","b5 wk","b7 bb","c8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: c8 на b7.","answers":["c8b7"]},{"board":["f2 bk","g5 wk","f6 br","d8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: g5 на f6.","answers":["g5f6"]},{"board":["g4 bk","c6 bb","b7 wk","a8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: b7 на c6.","answers":["b7c6"]},{"board":["c1 wk","g2 bn","h2 wk","b3 wr","g7 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: h2 на g2.","answers":["h2g2"]},{"board":["g3 wk","d7 wb","h7 wk","a8 bk","h8 bq"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: h7 на h8.","answers":["h7h8"]},{"board":["h2 wr","e4 wk","a6 bk","f7 bn","e8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: e8 на f7.","answers":["e8f7"]},{"board":["g1 wb","e3 wk","h3 bk","f4 bq","e5 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: e3 на f4.","answers":["e3f4"]},{"board":["d1 wr","c3 bk","h4 wk","h5 bp","e7 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: h4 на h5.","answers":["h4h5"]},{"board":["g1 wk","b3 bk","a6 wb","c6 wk","c7 br"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: c6 на c7.","answers":["c6c7"]},{"board":["b1 bk","c4 wk","b5 wk","f5 wn","c6 bp"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: b5 на c6.","answers":["b5c6"]},{"board":["b1 bk","g2 wb","e5 bb","e6 wk","g8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: e6 на e5.","answers":["e6e5"]},{"board":["b1 wr","a3 wk","c6 wk","d6 bb","e6 bk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: c6 на d6.","answers":["c6d6"]},{"board":["a3 wn","a5 bk","c7 wk","e8 br","f8 wk"],"turn":"w","prompt":"Съешь чёрную фигуру.","hint":"Съешь королём: f8 на e8.","answers":["f8e8"]}]}]},{"name":"Правила и приёмы","lessons":[{"id":"t-develop","title":"Развитие фигур","icon":"🚀","explain":"Развитие — это первые ходы партии. Сначала займи центр пешками (e4 или d4), потом выведи коней и слонов к центру, и рокируйся. Не ходи одной фигурой много раз.","steps":[{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","e2 wp","f2 wp","g2 wp","h2 wp","a7 bp","b7 bp","c7 bp","d7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Разви коня к центру.","hint":"Выведи коня: g1 на f3 (или b1 на c3).","answers":["g1f3","b1c3"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","f3 wn","e4 wp","e5 bp","c6 bn","a7 bp","b7 bp","c7 bp","d7 bp","f7 bp","g7 bp","h7 bp","a8 br","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Разви слона к центру.","hint":"Выведи слона: f1 на c4.","answers":["f1c4","f1b5","f1e2","f1d3"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","e2 wp","f2 wp","g2 wp","h2 wp","a7 bp","b7 bp","c7 bp","d7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Займи центр пешкой.","hint":"Пойди пешкой в центр: e2 на e4 или d2 на d4.","answers":["e2e4","d2d4"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","h1 wr","a2 wp","b2 wp","c2 wp","e2 wp","f2 wp","g2 wp","h2 wp","f3 wn","d4 wp","d5 bp","f6 bn","a7 bp","b7 bp","c7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","h8 br"],"turn":"w","prompt":"Разви слона к центру.","hint":"Выведи слона: c1 на f4 или g5.","answers":["c1f4","c1g5"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","e4 wp","e5 bp","a7 bp","b7 bp","c7 bp","d7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Разви коня к центру.","hint":"Выведи коня: g1 на f3.","answers":["g1f3","b1c3"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","e4 wp","e6 bp","a7 bp","b7 bp","c7 bp","d7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Займи центр пешкой.","hint":"Займи центр: d2 на d4.","answers":["d2d4"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","e2 wp","f2 wp","g2 wp","h2 wp","d4 wp","d5 bp","a7 bp","b7 bp","c7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Разви коня к центру.","hint":"Выведи коня: g1 на f3.","answers":["g1f3","b1c3"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","f3 wn","e4 wp","e5 bp","f6 bn","a7 bp","b7 bp","c7 bp","d7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","h8 br"],"turn":"w","prompt":"Разви слона к центру.","hint":"Выведи слона: f1 на c4.","answers":["f1c4","f1b5","f1e2"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","e2 wp","f2 wp","g2 wp","h2 wp","f3 wn","d5 bp","a7 bp","b7 bp","c7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Займи центр пешкой.","hint":"Займи центр: d2 на d4.","answers":["d2d4","c2c4"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","e4 wp","c5 bp","a7 bp","b7 bp","d7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Разви коня к центру.","hint":"Выведи коня: g1 на f3.","answers":["g1f3","b1c3"]},{"board":["a1 wr","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","e2 wp","f2 wp","g2 wp","h2 wp","c3 wn","c4 wp","d4 wp","d5 bp","e6 bp","f6 bn","a7 bp","b7 bp","c7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","h8 br"],"turn":"w","prompt":"Разви слона к центру.","hint":"Выведи слона: c1 на g5.","answers":["c1g5","c1f4"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","f3 wn","e4 wp","c5 bp","d6 bp","a7 bp","b7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Займи центр пешкой.","hint":"Вскрой центр: d2 на d4.","answers":["d2d4"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","e4 wp","e6 bp","a7 bp","b7 bp","c7 bp","d7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","g8 bn","h8 br"],"turn":"w","prompt":"Разви коня к центру.","hint":"Выведи коня к центру.","answers":["g1f3","b1c3"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","h1 wr","a2 wp","b2 wp","c2 wp","e2 wp","f2 wp","g2 wp","h2 wp","f3 wn","d4 wp","d5 bp","f6 bn","a7 bp","b7 bp","c7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","h8 br"],"turn":"w","prompt":"Разви слона к центру.","hint":"Выведи слона: c1 на f4.","answers":["c1f4","c1g5"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","f1 wb","g1 wn","h1 wr","a2 wp","b2 wp","c2 wp","e2 wp","f2 wp","g2 wp","h2 wp","d4 wp","f6 bn","a7 bp","b7 bp","c7 bp","d7 bp","e7 bp","f7 bp","g7 bp","h7 bp","a8 br","b8 bn","c8 bb","d8 bq","e8 bk","f8 bb","h8 br"],"turn":"w","prompt":"Займи центр пешкой.","hint":"Борись за центр: c2 на c4.","answers":["c2c4"]},{"board":["a1 wr","b1 wn","c1 wb","d1 wq","e1 wk","h1 wr","a2 wp","b2 wp","c2 wp","d2 wp","f2 wp","g2 wp","h2 wp","f3 wn","c4 wb","e4 wp","c5 bb","e5 bp","c6 bn","a7 bp","b7 bp","c7 bp","d7 bp","f7 bp","g7 bp","h7 bp","a8 br","c8 bb","d8 bq","e8 bk","g8 bn","h8 br"],"turn":"w","prompt":"Разви коня к центру.","hint":"Выведи второго коня: b1 на c3.","answers":["b1c3"]}]},{"id":"t-defend","title":"Защита фигур","icon":"🛡️","explain":"Если твою фигуру атакуют — её можно защитить: поставить рядом свою фигуру, которая «съест обратно», закрыться или увести.","steps":[{"board":["f1 wb","c2 bk","e2 bb","d7 wk","e7 wr"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["f1g2","f1h3","f1e2","e7f7","e7e2"]},{"board":["g1 wb","f2 bb","d3 bk","a6 wk","b7 wn"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["g1h2","g1f2"]},{"board":["h2 wb","a3 bk","e6 wb","h7 br","f8 wk"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["h2g3","h2f4","h2e5","h2d6","h2b8","h2g1","e6h3"]},{"board":["c1 bn","b3 wr","f3 wn","d6 bk","f7 wk"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["b3c3","b3e3","b3a3","b3b4","b3b5","b3b6","b3b7","b3b8","b3b2","b3b1"]},{"board":["a2 wn","c2 bq","h4 wk","h5 wb","c8 bk"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["a2b4","h5f7"]},{"board":["a2 bk","h4 wb","d6 wb","e6 bq","d8 wk"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["h4e7","h4g3","d6e7","d6f8","d6f4","d6g3","d6h2","d6c7","d6b8","d6c5","d6b4","d8c7"]},{"board":["c1 bq","h2 bk","a3 wb","b6 wr","f8 wk"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["a3b4","a3d6","a3e7","a3b2","a3c1","b6a6","b6b3","b6b2"]},{"board":["a1 wr","c1 wk","e4 bk","a7 wb","h8 bb"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["a1b1","a1a2","a1a3","a1a4","a1a5","a1a6","a7d4"]},{"board":["h2 wn","e3 wb","e6 br","g6 bk","a8 wk"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["h2f1","h2g4","e3f4","e3f2","e3g1","e3d4","e3c5","e3a7","e3d2","e3c1"]},{"board":["g2 wk","b5 bk","f6 bb","c8 wq","d8 wr"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["d8e8","d8f8","d8g8","d8d7","d8d6","d8d5","d8d3","d8d2","d8d1"]},{"board":["c1 wr","d2 bb","h2 wk","h7 wb","e8 bk"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["c1d1","c1f1","c1g1","c1h1","c1b1","c1a1","c1c2","c1c4","c1c5","c1c6","c1c7","c1c8"]},{"board":["f3 bb","h3 bk","e5 wk","c6 wr","e7 wr"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["c6d6","c6e6","c6f6","c6g6","c6h6","c6b6","c6a6","c6c7","c6c8","c6c5","c6c4","c6c3","c6c2","c6c1"]},{"board":["f3 wr","c4 wk","a5 bk","g5 bn","a7 wb"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["f3g3","f3e3","f3d3","f3c3","f3b3","f3a3","f3f4","f3f5","f3f6","f3f8","f3f2","f3f1"]},{"board":["e6 wk","g6 wr","b8 bk","e8 wn","f8 br"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["e6e7","e6d7","e8g7","e8f6","e8d6"]},{"board":["a1 br","c1 bk","g2 wk","a4 wn","f6 wb"],"turn":"w","prompt":"Твою фигуру атакуют. Защити её.","hint":"Съешь нападающего, закройся или уведи фигуру в безопасность.","answers":["a4b6","a4c5","a4c3","a4b2","f6a1"]}]},{"id":"t-mate","title":"Мат","icon":"👑","explain":"Мат — это шах, от которого нет спасения: король не может ни уйти, ни закрыться, ни съесть. Это победа!","steps":[{"board":["e1 wr","c4 wk","h6 wq","f7 bp","g7 bp","h7 bp","g8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: e1 на e8.","answers":["e1e8"],"goal":"mate"},{"board":["e3 wr","h3 wq","h5 wk","a7 bp","b7 bp","c7 bp","b8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: e3 на e8.","answers":["e3e8"],"goal":"mate"},{"board":["e1 bk","a2 wr","a6 wk","c7 wq"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: c7 на c1.","answers":["c7c1"],"goal":"mate"},{"board":["d1 wr","f5 wk","h6 bk","g8 wr"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: d1 на h1.","answers":["d1h1"],"goal":"mate"},{"board":["a1 bk","g2 wk","h5 wr","b8 wr"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: h5 на a5.","answers":["h5a5"],"goal":"mate"},{"board":["b1 wr","a3 bk","c4 wk","e5 wq"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: b1 на a1.","answers":["b1a1","e5a1","e5a5"],"goal":"mate"},{"board":["c1 wr","c2 wk","b7 wr","f7 bp","g7 bp","h7 bp","g8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: b7 на b8.","answers":["b7b8"],"goal":"mate"},{"board":["h1 bk","e2 wr","a4 wr","a8 wk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: a4 на a1.","answers":["a4a1"],"goal":"mate"},{"board":["c3 wr","d5 wr","g5 wk","g7 bp","h7 bp","h8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: c3 на c8.","answers":["c3c8","d5d8"],"goal":"mate"},{"board":["b1 bk","h2 wr","d4 wk","g7 wr"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: g7 на g1.","answers":["g7g1"],"goal":"mate"},{"board":["b4 wk","e4 wq","a7 bp","b7 bp","a8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: e4 на e8.","answers":["e4e8"],"goal":"mate"},{"board":["g5 wq","b6 wk","b7 wr","f7 bp","g7 bp","h7 bp","g8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: g5 на d8.","answers":["g5d8","b7b8"],"goal":"mate"},{"board":["b2 wk","d2 wr","e5 wq","f7 bp","g7 bp","h7 bp","g8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: d2 на d8.","answers":["d2d8","e5b8","e5e8"],"goal":"mate"},{"board":["c3 wq","e4 bk","g5 wk","h5 wb"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: h5 на f3.","answers":["h5f3"],"goal":"mate"},{"board":["c4 wr","e5 wk","e7 wq","g7 bp","h7 bp","h8 bk"],"turn":"w","prompt":"Поставь мат в 1 ход.","hint":"Мат: c4 на c8.","answers":["c4c8","e7f8","e7d8","e7e8"],"goal":"mate"}]},{"id":"t-sac","title":"Пожертвование","icon":"🎯","explain":"Пожертвование — отдать свою фигуру ради чего-то ещё важнее: поставить мат или выиграть более ценную фигуру.<br><br>У каждой фигуры есть цена:<br>♟ Пешка — <b>1</b> балл<br>♞♝ Конь и слон — <b>3</b> балла<br>♜ Ладья — <b>5</b> баллов<br>♛ Ферзь — <b>9</b> баллов<br><br>Отдать коня (3), чтобы забрать ладью (5), — выгодно! А жертвовать ферзя ради пешки — плохо. В заданиях жертвуй смело: соперник обязан взять твою фигуру, а ты получишь мат или добычу подороже.","steps":[{"board":["e1 br","f2 wk","h3 bk","d7 wn","b8 wq","g8 wr"],"turn":"w","prompt":"Пожертвуй фигуру и поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай ферзя: b8→h2. Соперник обязан взять — и получит мат.","plies":[{"answers":["b8h2"],"reply":"h3h2"},{"answers":["g8h8"]}],"goal":"mate"},{"board":["g2 wq","c3 wr","h3 bq","b4 wk","e6 bp","a7 bk","d7 wn","h8 br"],"turn":"w","prompt":"Пожертвуй фигуру, чтобы выиграть более ценную!","prompt2":"Теперь забирай награду!","hint":"Отдай ладью (5 балл.) ходом c3→a3. Соперник возьмёт — а ты заберёшь ферзя (9 балл.).","plies":[{"answers":["c3a3"],"reply":"h3a3"},{"answers":["b4a3"]}],"goal":"win"},{"board":["b1 wr","g3 wk","g6 wq","c7 bp","d7 wr","f8 bk"],"turn":"w","prompt":"Пожертвуй фигуру и поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай ферзя: g6→g8. Соперник обязан взять — и получит мат.","plies":[{"answers":["g6g8"],"reply":"f8g8"},{"answers":["b1b8"]}],"goal":"mate"},{"board":["b1 bq","b2 wr","e2 bn","g3 wq","a4 bk","f5 wr","f8 wk"],"turn":"w","prompt":"Пожертвуй фигуру, чтобы выиграть более ценную!","prompt2":"Теперь забирай награду!","hint":"Отдай ладью (5 балл.) ходом f5→a5. Соперник возьмёт — а ты заберёшь ферзя (9 балл.).","plies":[{"answers":["f5a5"],"reply":"a4a5"},{"answers":["b2b1"]}],"goal":"win"},{"board":["g3 wr","g4 br","h5 wr","a6 wk","g6 wr","a8 bk"],"turn":"w","prompt":"Пожертвуй фигуру и поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай ладью: g6→g8. Соперник обязан взять — и получит мат.","plies":[{"answers":["g6g8"],"reply":"g4g8"},{"answers":["g3g8"]}],"goal":"mate"},{"board":["c1 br","b2 wk","b4 bk","e4 bq","f4 wn","g4 wb","a6 wq","e7 bb"],"turn":"w","prompt":"Пожертвуй фигуру, чтобы выиграть более ценную!","prompt2":"Теперь забирай награду!","hint":"Отдай коня (3 балл.) ходом f4→d3. Соперник возьмёт — а ты заберёшь ферзя (9 балл.).","plies":[{"answers":["f4d3"],"reply":"e4d3"},{"answers":["a6d3"]}],"goal":"win"},{"board":["e2 wr","g6 wk","f7 wq","g7 wr","b8 bk","f8 br"],"turn":"w","prompt":"Пожертвуй фигуру и поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай ладью: e2→e8. Соперник обязан взять — и получит мат.","plies":[{"answers":["e2e8"],"reply":"f8e8"},{"answers":["f7e8","f7b7"]}],"goal":"mate"},{"board":["b1 wb","h1 bk","b4 bp","g4 wr","c5 wk","c7 wb","e8 br"],"turn":"w","prompt":"Пожертвуй фигуру, чтобы выиграть более ценную!","prompt2":"Теперь забирай награду!","hint":"Отдай слона (3 балл.) ходом b1→e4. Соперник возьмёт — а ты заберёшь ладью (5 балл.).","plies":[{"answers":["b1e4"],"reply":"e8e4"},{"answers":["g4e4"]}],"goal":"win"},{"board":["a2 wb","b2 wq","d3 bk","d5 wk","h6 wq","c7 br"],"turn":"w","prompt":"Пожертвуй фигуру и поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай слона: a2→c4. Соперник обязан взять — и получит мат.","plies":[{"answers":["a2c4"],"reply":"c7c4"},{"answers":["b2d2","h6d2","h6h3"]}],"goal":"mate"},{"board":["c1 wk","e1 bk","f3 wq","b6 br","g6 br","c7 wb"],"turn":"w","prompt":"Пожертвуй фигуру, чтобы выиграть более ценную!","prompt2":"Теперь забирай награду!","hint":"Отдай слона (3 балл.) ходом c7→g3. Соперник возьмёт — а ты заберёшь ладью (5 балл.).","plies":[{"answers":["c7g3"],"reply":"g6g3"},{"answers":["f3g3"]}],"goal":"win"},{"board":["h1 wk","g2 wr","d3 wb","f4 wq","h5 bk","c6 br","e6 br"],"turn":"w","prompt":"Пожертвуй фигуру и поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай слона: d3→g6. Соперник обязан взять — и получит мат.","plies":[{"answers":["d3g6"],"reply":"e6g6"},{"answers":["g2h2","f4h2"]}],"goal":"mate"},{"board":["h1 bn","a2 bq","c2 br","a3 wn","a6 wp","c6 wq","b8 bk","d8 wk"],"turn":"w","prompt":"Пожертвуй фигуру, чтобы выиграть более ценную!","prompt2":"Теперь забирай награду!","hint":"Отдай пешку (1 балл.) ходом a6→a7. Соперник возьмёт — а ты заберёшь фигуру (3 балл.).","plies":[{"answers":["a6a7"],"reply":"b8a7"},{"answers":["c6h1"]}],"goal":"win"}]},{"id":"t-check","title":"Шах","icon":"⚠️","explain":"Шах — это нападение на короля. В ответ король должен спастись: уйти, закрыться другой фигурой или съесть нападающего.","steps":[{"board":["c1 wr","a5 wk","e6 bk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ладьёй: c1 на e1.","answers":["c1e1","c1c6"],"goal":"check"},{"board":["c2 wn","e2 bk","d7 wk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах конём: c2 на d4.","answers":["c2d4"],"goal":"check"},{"board":["g1 bk","a3 wq","f8 wk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ферзём: a3 на c5.","answers":["a3c5","a3c1","a3e3","a3g3","a3a7","a3a1"],"goal":"check"},{"board":["d3 bk","g4 wn","d8 wk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах конём: g4 на f2.","answers":["g4f2","g4e5"],"goal":"check"},{"board":["h4 bk","f5 wk","e7 wn"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах конём: e7 на g6.","answers":["e7g6"],"goal":"check"},{"board":["f1 wk","f4 bk","a6 wq"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ферзём: a6 на c4.","answers":["a6c4","a6d6","a6f6","a6h6","a6a4"],"goal":"check"},{"board":["a3 bk","d3 wk","b5 wr"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ладьёй: b5 на a5.","answers":["b5a5","b5b3"],"goal":"check"},{"board":["b1 wk","h1 wr","a4 bk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ладьёй: h1 на h4.","answers":["h1h4"],"goal":"check"},{"board":["f2 bk","c6 wk","h7 wq"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ферзём: h7 на f5.","answers":["h7f5","h7c2","h7f7","h7a7","h7h4","h7h2"],"goal":"check"},{"board":["e3 wk","h4 bk","b7 wq"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ферзём: b7 на e4.","answers":["b7e4","b7h1","b7e7","b7h7","b7b4"],"goal":"check"},{"board":["a3 wk","d5 bk","a6 wn"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах конём: a6 на c7.","answers":["a6c7","a6b4"],"goal":"check"},{"board":["h2 wb","g6 wk","h8 bk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах слоном: h2 на e5.","answers":["h2e5"],"goal":"check"},{"board":["d2 wb","f2 bk","c6 wk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах слоном: d2 на e3.","answers":["d2e3","d2e1"],"goal":"check"},{"board":["b2 wr","f3 bk","a7 wk"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах ладьёй: b2 на f2.","answers":["b2f2","b2b3"],"goal":"check"},{"board":["g1 wk","h3 bk","a6 wb"],"turn":"w","prompt":"Дай шах королю.","hint":"Шах слоном: a6 на c8.","answers":["a6c8","a6f1"],"goal":"check"}]},{"id":"t-fork","title":"Вилка","icon":"🍴","explain":"Вилка — одна фигура нападает сразу на две (и больше). Вилку могут делать все фигуры — даже пешка!","steps":[{"board":["e2 wr","c3 wk","g6 bk","f7 bn","e8 bb"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ладьёй: e2 на e6.","answers":["e2e6","e2e7"],"goal":"fork"},{"board":["g1 wq","e4 br","b5 bk","g6 wk","b8 br"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: g1 на b6.","answers":["g1b6","g1b1"],"goal":"fork"},{"board":["h1 bb","d2 wp","c4 bn","d4 bq","e4 bq","d6 bk","h6 wk","b7 bb"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка пешкой: d2 на d3.","answers":["d2d3"],"goal":"fork"},{"board":["f3 bq","e6 bk","b7 bn","a8 wq","c8 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: a8 на a6.","answers":["a8a6"],"goal":"fork"},{"board":["d4 bk","h6 bn","a7 wk","c8 bq","g8 wq"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: g8 на e6.","answers":["g8e6","g8c4","g8h8","g8f8","g8d8","g8g7","g8g4"],"goal":"fork"},{"board":["f2 bq","d6 bq","e7 wq","a8 bk","e8 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: e7 на f8.","answers":["e7f8","e7f6","e7d8","e7a7"],"goal":"fork"},{"board":["d1 br","f1 bk","f4 wp","e6 br","g6 bq","b7 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка пешкой: f4 на f5.","answers":["f4f5"],"goal":"fork"},{"board":["d2 wq","f3 bq","c4 bn","f6 bk","b8 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: d2 на f4.","answers":["d2f4","d2c3","d2e2","d2d3","d2d4","d2d5"],"goal":"fork"},{"board":["f1 wq","d2 wk","c4 bq","c5 bk","g7 bb"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: f1 на g1.","answers":["f1g1","f1f7","f1f8"],"goal":"fork"},{"board":["g1 wk","f4 wn","g5 bb","h7 bk","f8 br"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка конём: f4 на e6.","answers":["f4e6"],"goal":"fork"},{"board":["b1 br","g1 bb","h2 bk","d3 wr","g7 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ладьёй: d3 на d1.","answers":["d3d1"],"goal":"fork"},{"board":["c1 bb","d2 bb","f2 bk","b3 wp","c4 br","a5 bb","c5 br","f6 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка пешкой: b3 на b4.","answers":["b3b4"],"goal":"fork"},{"board":["b1 bn","a2 bk","a5 bn","e6 wk","f6 wq"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: f6 на b2.","answers":["f6b2","f6a1","f6f5"],"goal":"fork"},{"board":["a3 bk","c3 bn","b6 wq","c7 bq","f8 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: b6 на c5.","answers":["b6c5","b6a7","b6a5","b6c6","b6d6","b6b4","b6b3","b6b2"],"goal":"fork"},{"board":["a3 bk","d3 bn","c4 wq","d6 wk","d7 bn"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ферзём: c4 на b5.","answers":["c4b5","c4a6","c4b3","c4a4","c4c3"],"goal":"fork"},{"board":["b2 bq","e3 wk","f3 wr","f8 bq","h8 bk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка ладьёй: f3 на f2.","answers":["f3f2"],"goal":"fork"},{"board":["c3 wp","a5 bn","b5 bb","d5 br","f5 bk","a7 wk","c8 bb"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка пешкой: c3 на c4.","answers":["c3c4"],"goal":"fork"},{"board":["c1 wb","g3 wk","g5 bb","b6 bb","h8 bk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка слоном: c1 на e3.","answers":["c1e3"],"goal":"fork"},{"board":["a3 wn","d5 bb","d6 bk","a7 bn","b8 wk"],"turn":"w","prompt":"Сделай вилку — напади сразу на две фигуры.","hint":"Вилка конём: a3 на b5.","answers":["a3b5"],"goal":"fork"}]},{"id":"t-pin","title":"Связка","icon":"📌","explain":"Связка — фигура не может уйти, потому что за ней стоит более важная (например, король). Такая фигура «приклеена» к месту.","steps":[{"board":["h1 wq","e3 bk","g3 bn","b5 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: h1 на h3.","answers":["h1h3"],"goal":"pin","pinAt":"g3"},{"board":["h2 wb","a3 bk","c5 br","h8 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи слоном: h2 на d6.","answers":["h2d6"],"goal":"pin","pinAt":"c5"},{"board":["f1 bk","g2 br","g4 wq","d8 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: g4 на h3.","answers":["g4h3"],"goal":"pin","pinAt":"g2"},{"board":["c3 wk","h3 wr","f4 bk","g4 bb"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ладьёй: h3 на h4.","answers":["h3h4"],"goal":"pin","pinAt":"g4"},{"board":["d3 bk","e4 bn","a5 wq","g6 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: a5 на f5.","answers":["a5f5"],"goal":"pin","pinAt":"e4"},{"board":["g2 wk","a6 bk","c6 bn","d6 wq"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: d6 на e6.","answers":["d6e6"],"goal":"pin","pinAt":"c6"},{"board":["g6 wr","d7 bk","f7 bb","a8 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ладьёй: g6 на g7.","answers":["g6g7"],"goal":"pin","pinAt":"f7"},{"board":["c2 wk","d2 wb","h2 bk","g3 bn"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи слоном: d2 на f4.","answers":["d2f4"],"goal":"pin","pinAt":"g3"},{"board":["a2 bk","c2 bb","f4 wq","g8 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: f4 на d2.","answers":["f4d2"],"goal":"pin","pinAt":"c2"},{"board":["b4 wq","d4 wk","c6 br","e8 bk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: b4 на a4.","answers":["b4a4"],"goal":"pin","pinAt":"c6"},{"board":["b2 wq","d3 bb","f3 bk","b8 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: b2 на c3.","answers":["b2c3"],"goal":"pin","pinAt":"d3"},{"board":["h2 bk","h4 bb","c5 wq","a7 wk"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: c5 на h5.","answers":["c5h5"],"goal":"pin","pinAt":"h4"},{"board":["g2 bk","b4 wk","g4 bb","b6 wq"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: b6 на g6.","answers":["b6g6"],"goal":"pin","pinAt":"g4"},{"board":["f3 wq","b4 bk","h4 wk","d6 br"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: f3 на f8.","answers":["f3f8"],"goal":"pin","pinAt":"d6"},{"board":["c4 wq","d4 wk","a5 bk","b5 bb"],"turn":"w","prompt":"Свяжи фигуру соперника.","hint":"Свяжи ферзём: c4 на c5.","answers":["c4c5"],"goal":"pin","pinAt":"b5"}]},{"id":"t-promo","title":"Превращение пешки","icon":"✨","explain":"Когда пешка доходит до последней горизонтали — она превращается в любую фигуру. Обычно выбирают ферзя, он самый сильный!","steps":[{"board":["b1 bk","d7 wp","e7 wk"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: d7 на d8.","answers":["d7d8q","d7d8"]},{"board":["a5 wk","c7 wp","f8 bk"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: c7 на c8.","answers":["c7c8q","c7c8"]},{"board":["g4 wk","a7 wp","h7 bk"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: a7 на a8.","answers":["a7a8q","a7a8"]},{"board":["d1 bk","c5 wk","c7 wp","b8 bn"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: c7 на b8.","answers":["c7b8q","c7b8"]},{"board":["f2 wk","c6 bk","f7 wp","g8 bb"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: f7 на g8.","answers":["f7g8q","f7g8"]},{"board":["d2 bk","h2 wk","d7 wp"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: d7 на d8.","answers":["d7d8q","d7d8"]},{"board":["h3 bk","g6 wk","e7 wp"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: e7 на e8.","answers":["e7e8q","e7e8"]},{"board":["g2 wk","e5 bk","b7 wp"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: b7 на b8.","answers":["b7b8q","b7b8"]},{"board":["g2 wk","a7 wp","b8 bn","f8 bk"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: a7 на b8.","answers":["a7b8q","a7b8"]},{"board":["c1 bk","e1 wk","c7 wp"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: c7 на c8.","answers":["c7c8q","c7c8"]},{"board":["d3 bk","b7 wp","c8 br","f8 wk"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: b7 на c8.","answers":["b7c8q","b7c8"]},{"board":["h2 wk","h7 wp","a8 bk"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: h7 на h8.","answers":["h7h8q","h7h8"]},{"board":["a4 bk","h7 wp","g8 wk"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: h7 на h8.","answers":["h7h8q","h7h8"]},{"board":["g3 wk","b6 bk","a7 wp"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: a7 на a8.","answers":["a7a8q","a7a8"]},{"board":["e1 wk","c4 bk","b7 wp"],"turn":"w","prompt":"Проведи пешку в ферзи.","hint":"Пешка идёт в ферзи: b7 на b8.","answers":["b7b8q","b7b8"]}]},{"id":"t-castle","title":"Рокировка","icon":"🏰","explain":"Рокировка — единственный ход, где двигаются сразу две фигуры: король и ладья. Она бывает двух видов:<br><br>• <b>Короткая (0-0)</b> — в сторону королевского фланга, где фигур меньше. Король идёт на g1, ладья с h1 встаёт на f1. Короткая — потому что ладья рядом и путь маленький.<br>• <b>Длинная (0-0-0)</b> — в сторону ферзя. Король идёт на c1, ладья с a1 встаёт на d1. Длинная — потому что ладья дальше и идёт дольше.<br><br>Чтобы рокировать, между королём и ладьёй должно быть пусто — сначала убери свои фигуры с дороги! Ещё нельзя рокировать под шахом и через битое поле, а король и ладья не должны были ходить раньше.","steps":[{"board":["e1 wk","h1 wr","g6 bk"],"turn":"w","castling":{"wK":true,"wQ":false,"bK":false,"bQ":false},"prompt":"Сделай короткую рокировку.","hint":"Король идёт на g1: e1 на g1.","answers":["e1g1"]},{"board":["a1 wr","e1 wk","b6 bk"],"turn":"w","castling":{"wK":false,"wQ":true,"bK":false,"bQ":false},"prompt":"Сделай длинную рокировку.","hint":"Король идёт на c1: e1 на c1.","answers":["e1c1"]},{"board":["e1 wk","h1 wr","g1 wn","e8 bk","a7 bp"],"turn":"w","castling":{"wK":true,"wQ":false,"bK":false,"bQ":false},"prompt":"Убери коня с g1, потом рокируй в короткую сторону.","hint":"Сначала уведи коня с g1 (куда хочешь), затем нажми на короля и на ладью h1.","plies":[{"answers":["g1h3","g1e2","g1f3"],"reply":"a7a6"},{"answers":["e1g1"],"ask":"Отлично, путь свободен! Теперь рокируй: нажми на короля, потом на ладью."}],"goal":"castle"},{"board":["e1 wk","a1 wr","b1 wn","e8 bk","h7 bp"],"turn":"w","castling":{"wK":false,"wQ":true,"bK":false,"bQ":false},"prompt":"Убери коня с b1, потом рокируй в длинную сторону.","hint":"Сначала уведи коня с b1, затем нажми на короля и на ладью a1.","plies":[{"answers":["b1c3","b1d2","b1a3"],"reply":"h7h6"},{"answers":["e1c1"],"ask":"Отлично, путь свободен! Теперь рокируй: нажми на короля, потом на ладью."}],"goal":"castle"},{"board":["e1 wk","h1 wr","b6 bk"],"turn":"w","castling":{"wK":true,"wQ":false,"bK":false,"bQ":false},"prompt":"Сделай короткую рокировку.","hint":"Король идёт на g1: e1 на g1.","answers":["e1g1"]},{"board":["a1 wr","e1 wk","d7 bk"],"turn":"w","castling":{"wK":false,"wQ":true,"bK":false,"bQ":false},"prompt":"Сделай длинную рокировку.","hint":"Король идёт на c1: e1 на c1.","answers":["e1c1"]},{"board":["e1 wk","h1 wr","f1 wb","d8 bk","a7 bp"],"turn":"w","castling":{"wK":true,"wQ":false,"bK":false,"bQ":false},"prompt":"Убери слона с f1, потом рокируй в короткую сторону.","hint":"Сначала уведи слона с f1, затем нажми на короля и на ладью h1.","plies":[{"answers":["f1g2","f1h3","f1e2","f1d3","f1c4","f1b5"],"reply":"a7a6"},{"answers":["e1g1"],"ask":"Отлично, путь свободен! Теперь рокируй: нажми на короля, потом на ладью."}],"goal":"castle"},{"board":["e1 wk","a1 wr","c1 wb","g8 bk","h7 bp"],"turn":"w","castling":{"wK":false,"wQ":true,"bK":false,"bQ":false},"prompt":"Убери слона с c1, потом рокируй в длинную сторону.","hint":"Сначала уведи слона с c1, затем нажми на короля и на ладью a1.","plies":[{"answers":["c1d2","c1e3","c1f4","c1g5","c1b2","c1a3"],"reply":"h7h6"},{"answers":["e1c1"],"ask":"Отлично, путь свободен! Теперь рокируй: нажми на короля, потом на ладью."}],"goal":"castle"},{"board":["e1 wk","a1 wr","d1 wq","g8 bk","h7 bp"],"turn":"w","castling":{"wK":false,"wQ":true,"bK":false,"bQ":false},"prompt":"Убери ферзя с d1, потом рокируй в длинную сторону.","hint":"Сначала уведи ферзя с d1, затем нажми на короля и на ладью a1.","plies":[{"answers":["d1e2","d1f3","d1h5","d1c2","d1a4","d1d2","d1d3","d1d4","d1d6","d1d7"],"reply":"h7h6"},{"answers":["e1c1"],"ask":"Отлично, путь свободен! Теперь рокируй: нажми на короля, потом на ладью."}],"goal":"castle"},{"board":["e1 wk","h1 wr","a7 bk"],"turn":"w","castling":{"wK":true,"wQ":false,"bK":false,"bQ":false},"prompt":"Сделай короткую рокировку.","hint":"Король идёт на g1: e1 на g1.","answers":["e1g1"]},{"board":["a1 wr","e1 wk","c7 bk"],"turn":"w","castling":{"wK":false,"wQ":true,"bK":false,"bQ":false},"prompt":"Сделай длинную рокировку.","hint":"Король идёт на c1: e1 на c1.","answers":["e1c1"]},{"board":["e1 wk","h1 wr","g1 wn","f1 wb","d8 bk","a7 bp"],"turn":"w","castling":{"wK":true,"wQ":false,"bK":false,"bQ":false},"prompt":"Сначала убери коня с g1.","hint":"Порядок: 1) уведи коня с g1, 2) уведи слона с f1, 3) рокируй (король, потом ладья h1).","plies":[{"answers":["g1h3","g1e2","g1f3"],"reply":"a7a6"},{"answers":["f1g2","f1e2","f1d3","f1c4","f1b5"],"reply":"a6a5","ask":"Молодец! Теперь убери слона с f1."},{"answers":["e1g1"],"ask":"Отлично, путь свободен! Теперь рокируй: нажми на короля, потом на ладью."}],"goal":"castle"},{"board":["e1 wk","a1 wr","d1 wq","c1 wb","g8 bk","h7 bp"],"turn":"w","castling":{"wK":false,"wQ":true,"bK":false,"bQ":false},"prompt":"Сначала убери ферзя с d1.","hint":"Порядок: 1) уведи ферзя с d1, 2) уведи слона с c1, 3) рокируй (король, потом ладья a1).","plies":[{"answers":["d1e2","d1f3","d1c2","d1a4","d1d2","d1d3","d1d4","d1d6","d1d7"],"reply":"h7h6"},{"answers":["c1d2","c1e3","c1f4","c1g5","c1b2","c1a3"],"reply":"h6h5","ask":"Молодец! Теперь убери слона с c1."},{"answers":["e1c1"],"ask":"Отлично, путь свободен! Теперь рокируй: нажми на короля, потом на ладью."}],"goal":"castle"}]},{"id":"t-deflect","title":"Отвлечение","icon":"🎣","explain":"Отвлечение — выманить фигуру соперника с важного места. Ты отдаёшь свою фигуру (часто с шахом), соперник ВЫНУЖДЕН её съесть — и его защитник уходит со своего поста! Из-за этого ты можешь съесть его ферзя или поставить мат. Сначала приманка — потом награда!","steps":[{"board":["a1 bk","e2 wp","a3 wk","c6 wr","c7 br","g7 bq","e8 wn","f8 br"],"turn":"w","prompt":"Отвлеки защитника, потом выиграй ферзя!","prompt2":"Теперь забирай ферзя!","hint":"Отдай ладью: c6→c1. Соперник обязан взять — и ты заберёшь ферзя!","plies":[{"answers":["c6c1"],"reply":"c7c1"},{"answers":["e8g7"],"ask":"Соперник съел приманку и бросил ферзя. Теперь бей ферзя!"}],"goal":"win"},{"board":["g1 wq","e2 wn","c3 wr","b4 bq","h4 bk","a6 wk","f6 bn"],"turn":"w","prompt":"Отвлеки защитника, потом поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай ладью: c3→h3. Соперник обязан взять — защитник уйдёт, и будет мат!","plies":[{"answers":["c3h3"],"reply":"h4h3"},{"answers":["g1g3"],"ask":"Соперник съел приманку — защитник ушёл. Теперь ставь мат!"}],"goal":"mate"},{"board":["h1 bk","e2 wq","e3 wk","g4 wr","h5 bq","c7 br","h7 bn"],"turn":"w","prompt":"Отвлеки защитника, потом выиграй ферзя!","prompt2":"Теперь забирай ферзя!","hint":"Отдай ладью: g4→g1. Соперник обязан взять — и ты заберёшь ферзя!","plies":[{"answers":["g4g1"],"reply":"h1g1"},{"answers":["e2h5"],"ask":"Соперник съел приманку и бросил ферзя. Теперь бей ферзя!"}],"goal":"win"},{"board":["b5 wk","d6 bp","e6 wr","g6 bp","a7 wq","c8 bq","d8 wb","f8 bk"],"turn":"w","prompt":"Отвлеки защитника, потом поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай ладью: e6→e8. Соперник обязан взять — защитник уйдёт, и будет мат!","plies":[{"answers":["e6e8"],"reply":"f8e8"},{"answers":["a7e7"],"ask":"Соперник съел приманку — защитник ушёл. Теперь ставь мат!"}],"goal":"mate"},{"board":["e1 bk","g2 bq","e3 wk","e4 bb","g4 wn","d5 wb","b7 wr","d7 bp"],"turn":"w","prompt":"Отвлеки защитника, потом выиграй ферзя!","prompt2":"Теперь забирай ферзя!","hint":"Отдай ладью: b7→b1. Соперник обязан взять — и ты заберёшь ферзя!","plies":[{"answers":["b7b1"],"reply":"e4b1"},{"answers":["d5g2"],"ask":"Соперник съел приманку и бросил ферзя. Теперь бей ферзя!"}],"goal":"win"},{"board":["a2 bq","e3 wq","g3 wr","a6 bn","b6 wk","h7 bk","f8 wr"],"turn":"w","prompt":"Отвлеки защитника, потом поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай ладью: f8→h8. Соперник обязан взять — защитник уйдёт, и будет мат!","plies":[{"answers":["f8h8"],"reply":"h7h8"},{"answers":["e3h6"],"ask":"Соперник съел приманку — защитник ушёл. Теперь ставь мат!"}],"goal":"mate"},{"board":["e1 bq","g1 br","e2 wq","h3 bk","e5 wk","f5 wn","h5 wb","a6 bn"],"turn":"w","prompt":"Отвлеки защитника, потом выиграй ферзя!","prompt2":"Теперь забирай ферзя!","hint":"Отдай слона: h5→g4. Соперник обязан взять — и ты заберёшь ферзя!","plies":[{"answers":["h5g4"],"reply":"g1g4"},{"answers":["e2e1"],"ask":"Соперник съел приманку и бросил ферзя. Теперь бей ферзя!"}],"goal":"win"},{"board":["e2 wb","b3 bp","c4 wq","a5 bk","d5 bq","f6 wb","h7 wk"],"turn":"w","prompt":"Отвлеки защитника, потом поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай слона: f6→d8. Соперник обязан взять — защитник уйдёт, и будет мат!","plies":[{"answers":["f6d8"],"reply":"d5d8"},{"answers":["c4b5"],"ask":"Соперник съел приманку — защитник ушёл. Теперь ставь мат!"}],"goal":"mate"},{"board":["e1 wb","c2 wb","h2 bq","f4 bn","c7 wq","e8 bk","g8 wk"],"turn":"w","prompt":"Отвлеки защитника, потом выиграй ферзя!","prompt2":"Теперь забирай ферзя!","hint":"Отдай слона: c2→g6. Соперник обязан взять — и ты заберёшь ферзя!","plies":[{"answers":["c2g6"],"reply":"f4g6"},{"answers":["c7h2"],"ask":"Соперник съел приманку и бросил ферзя. Теперь бей ферзя!"}],"goal":"win"},{"board":["e1 wr","g2 wk","b3 br","e6 bq","e7 wb","f7 wq","h8 bk"],"turn":"w","prompt":"Отвлеки защитника, потом поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай слона: e7→f6. Соперник обязан взять — защитник уйдёт, и будет мат!","plies":[{"answers":["e7f6"],"reply":"e6f6"},{"answers":["e1e8"],"ask":"Соперник съел приманку — защитник ушёл. Теперь ставь мат!"}],"goal":"mate"},{"board":["h1 bk","d2 bp","d3 wr","b4 wk","g4 wq","d6 br","f6 wr","d7 bq"],"turn":"w","prompt":"Отвлеки защитника, потом выиграй ферзя!","prompt2":"Теперь забирай ферзя!","hint":"Отдай ладью: f6→h6. Соперник обязан взять — и ты заберёшь ферзя!","plies":[{"answers":["f6h6"],"reply":"d6h6"},{"answers":["d3d7","g4d7"],"ask":"Соперник съел приманку и бросил ферзя. Теперь бей ферзя!"}],"goal":"win"},{"board":["f1 bk","d2 bb","h2 wk","g3 wb","a4 bq","b4 wq","d7 wb"],"turn":"w","prompt":"Отвлеки защитника, потом поставь мат!","prompt2":"Теперь ставь мат!","hint":"Отдай слона: d7→b5. Соперник обязан взять — защитник уйдёт, и будет мат!","plies":[{"answers":["d7b5"],"reply":"a4b5"},{"answers":["b4b5"],"ask":"Соперник съел приманку — защитник ушёл. Теперь ставь мат!"}],"goal":"mate"}]},{"id":"t-zug","title":"Цугцванг","icon":"⛓️","explain":"Цугцванг — когда любой ход только вредит, но пропустить нельзя. Сделай спокойный «выжидательный» ход и передай очередь сопернику. Теперь ходить приходится ему — а каждый его ход портит позицию: он теряет фигуру или попадает под мат! Выжидать можно королём, ферзём, ладьёй — любой фигурой.","steps":[{"board":["g3 wp","g4 wk","g7 bk"],"turn":"w","prompt":"Поставь соперника в цугцванг — займи оппозицию королём.","hint":"Шагни королём вперёд, заняв оппозицию: g4 на g5.","answers":["g4g5"]},{"board":["d2 wp","d3 wk","d6 bk"],"turn":"w","prompt":"Поставь соперника в цугцванг — займи оппозицию королём.","hint":"Шагни королём вперёд, заняв оппозицию: d3 на d4.","answers":["d3d4"]},{"board":["f3 wp","f4 wk","f7 bk"],"turn":"w","prompt":"Поставь соперника в цугцванг — займи оппозицию королём.","hint":"Шагни королём вперёд, заняв оппозицию: f4 на f5.","answers":["f4f5"]},{"board":["d2 bn","f2 wk","h3 bk","f4 wr"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь ставь мат!","hint":"Тихий (выжидательный) ход: f4→b4. Дальше у соперника всё плохо.","plies":[{"answers":["f4b4"],"reply":"h3h2"},{"answers":["b4h4"],"ask":"Соперник был вынужден пойти — и попал под мат! Ставь мат."}],"goal":"zug"},{"board":["h1 wq","c4 wn","h5 bn","a7 bk","f7 wk"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь забирай фигуру!","hint":"Тихий (выжидательный) ход: h1→f3. Дальше у соперника всё плохо.","plies":[{"answers":["h1f3"],"reply":"h5g3"},{"answers":["f3g3"],"ask":"Соперник был вынужден пойти — и теряет фигуру! Забирай её."}],"goal":"zug"},{"board":["g2 bp","f4 wq","a5 bk","c6 wk","a8 bn"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь ставь мат!","hint":"Тихий (выжидательный) ход: f4→b8. Дальше у соперника всё плохо.","plies":[{"answers":["f4b8"],"reply":"g2g1q"},{"answers":["b8b5"],"ask":"Соперник был вынужден пойти — и попал под мат! Ставь мат."}],"goal":"zug"},{"board":["a3 wk","h5 wq","e6 wn","a7 bk","f7 bb"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь забирай фигуру!","hint":"Тихий (выжидательный) ход: h5→h7. Дальше у соперника всё плохо.","plies":[{"answers":["h5h7"],"reply":"a7b7"},{"answers":["h7f7"],"ask":"Соперник был вынужден пойти — и теряет фигуру! Забирай её."}],"goal":"zug"},{"board":["e3 wq","b4 wk","b5 wr","g7 bn","d8 bk"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь ставь мат!","hint":"Тихий (выжидательный) ход: e3→a7. Дальше у соперника всё плохо.","plies":[{"answers":["e3a7"],"reply":"g7h5"},{"answers":["b5b8"],"ask":"Соперник был вынужден пойти — и попал под мат! Ставь мат."}],"goal":"zug"},{"board":["e1 bb","a2 bk","c4 bb","f5 wq","c6 wk","e6 wr"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь забирай фигуру!","hint":"Тихий (выжидательный) ход: e6→e4. Дальше у соперника всё плохо.","plies":[{"answers":["e6e4"],"reply":"e1f2"},{"answers":["e4c4","f5f2"],"ask":"Соперник был вынужден пойти — и теряет фигуру! Забирай её."}],"goal":"zug"},{"board":["e1 bk","b2 bp","c4 wq","b5 bp","b7 wk","h7 wq"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь ставь мат!","hint":"Тихий (выжидательный) ход: c4→c2. Дальше у соперника всё плохо.","plies":[{"answers":["c4c2"],"reply":"e1f1"},{"answers":["h7h1"],"ask":"Соперник был вынужден пойти — и попал под мат! Ставь мат."}],"goal":"zug"},{"board":["a3 bk","f3 wk","g4 wn","b5 wq","h8 bn"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь забирай фигуру!","hint":"Тихий (выжидательный) ход: b5→e8. Дальше у соперника всё плохо.","plies":[{"answers":["b5e8"],"reply":"a3b3"},{"answers":["e8h8"],"ask":"Соперник был вынужден пойти — и теряет фигуру! Забирай её."}],"goal":"zug"},{"board":["f2 bp","g3 wq","h5 bk","a7 wk","h8 wn"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь ставь мат!","hint":"Тихий (выжидательный) ход: h8→f7. Дальше у соперника всё плохо.","plies":[{"answers":["h8f7"],"reply":"f2f1q"},{"answers":["g3g5"],"ask":"Соперник был вынужден пойти — и попал под мат! Ставь мат."}],"goal":"zug"},{"board":["a1 bk","f2 bn","f3 wk","b6 bn","e6 wr"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь забирай фигуру!","hint":"Тихий (выжидательный) ход: f3→e2. Дальше у соперника всё плохо.","plies":[{"answers":["f3e2"],"reply":"a1b1"},{"answers":["e2f2","e6b6"],"ask":"Соперник был вынужден пойти — и теряет фигуру! Забирай её."}],"goal":"zug"},{"board":["a1 bk","c3 wk","g3 bp","b6 wn","c7 wr"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь ставь мат!","hint":"Тихий (выжидательный) ход: c3→c2. Дальше у соперника всё плохо.","plies":[{"answers":["c3c2"],"reply":"a1a2"},{"answers":["c7a7"],"ask":"Соперник был вынужден пойти — и попал под мат! Ставь мат."}],"goal":"zug"},{"board":["a2 wk","b4 wr","f6 wq","f7 bn","c8 bk"],"turn":"w","prompt":"Цугцванг! Сделай выжидательный ход — у соперника не будет хороших ходов.","prompt2":"Теперь забирай фигуру!","hint":"Тихий (выжидательный) ход: b4→d4. Дальше у соперника всё плохо.","plies":[{"answers":["b4d4"],"reply":"f7h8"},{"answers":["f6h8"],"ask":"Соперник был вынужден пойти — и теряет фигуру! Забирай её."}],"goal":"zug"}]},{"id":"t-stale","title":"Пат","icon":"😐","explain":"Пат — у соперника нет ни одного хода, но его королю НЕ шах. Это ничья! Запатовать можно любой фигурой: ладьёй, ферзём, конём, слоном и даже пешкой, а иногда — в несколько ходов. Имея перевес, будь аккуратен, чтобы случайно не сделать пат.","steps":[{"board":["a1 bk","a3 wk","b6 wr"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи ладьёй: b6 на b7 — королю некуда, но шаха нет.","answers":["b6b7","b6b8","b6b5","b6b4","b6b3","b6b2"],"goal":"stalemate"},{"board":["e3 wq","e7 wk","g8 bk"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи ферзём: e3 на h6 — королю некуда, но шаха нет.","answers":["e3h6"],"goal":"stalemate"},{"board":["a1 bk","g1 wk","e3 wn","b5 wn","b7 wq"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи конём: b5 на c3 — королю некуда, но шаха нет.","answers":["b5c3"],"goal":"stalemate"},{"board":["c1 wk","e1 bk","f4 wq","d7 wb","f7 wb"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи слоном: d7 на g4 — королю некуда, но шаха нет.","answers":["d7g4","d7b5","f7h5","f7c4"],"goal":"stalemate"},{"board":["e3 wp","b7 wq","f7 wq","d8 wk","h8 bk"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи пешкой: e3 на e4 — королю некуда, но шаха нет.","answers":["e3e4"],"goal":"stalemate"},{"board":["a1 bk","e2 wq","f2 wq","b4 wr","c4 wk"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи ладьёй: b4 на b5 — королю некуда, но шаха нет.","answers":["b4b5","b4b6","b4b7","b4b8","b4b3","b4b2"],"goal":"stalemate"},{"board":["h1 bk","b2 wq","h5 wn","d6 wk","h6 wn"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи ферзём: b2 на f2 — королю некуда, но шаха нет.","answers":["b2f2"],"goal":"stalemate"},{"board":["g1 bk","b3 wr","h3 wk","a4 wr","f8 wr"],"turn":"w","prompt":"Поставь пат в 2 хода.","hint":"Сначала b3—c3, затем поставь пат.","plies":[{"answers":["b3c3"],"reply":"g1h1"},{"answers":["c3g3","a4g4","f8g8"]}],"goal":"stalemate"},{"board":["e1 bk","b2 wk","h2 wr","b3 wn","a4 wq"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи конём: b3 на d2 — королю некуда, но шаха нет.","answers":["b3d2"],"goal":"stalemate"},{"board":["g1 bk","d2 wq","e5 wk","b7 wq","c8 wb"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи слоном: c8 на h3 — королю некуда, но шаха нет.","answers":["c8h3"],"goal":"stalemate"},{"board":["e1 wb","c2 wp","e2 wq","h3 bk","g8 wk"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи пешкой: c2 на c3 — королю некуда, но шаха нет.","answers":["c2c3","c2c4"],"goal":"stalemate"},{"board":["g1 bk","c2 wr","g3 wk","h3 wr","a4 wq"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи ладьёй: c2 на f2 — королю некуда, но шаха нет.","answers":["c2f2"],"goal":"stalemate"},{"board":["b2 wq","h4 bk","d5 wp","f6 wr","g6 wk"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи ферзём: b2 на g2 — королю некуда, но шаха нет.","answers":["b2g2"],"goal":"stalemate"},{"board":["b6 wq","b7 wb","c7 wk","h7 bk"],"turn":"w","prompt":"Поставь пат в 2 хода.","hint":"Сначала b6—f6, затем поставь пат.","plies":[{"answers":["b6f6"],"reply":"h7g8"},{"answers":["b7e4"]}],"goal":"stalemate"},{"board":["a1 bk","g2 wr","h3 wb","c6 wr","c8 wk"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи слоном: h3 на f5 — королю некуда, но шаха нет.","answers":["h3f5"],"goal":"stalemate"},{"board":["g1 bk","b2 wk","d5 wq","f6 wr","e7 wr"],"turn":"w","prompt":"Поставь пат (ничья без шаха).","hint":"Сходи ладьёй: e7 на h7 — королю некуда, но шаха нет.","answers":["e7h7","e7e2"],"goal":"stalemate"},{"board":["f1 wk","b3 wb","g4 wq","b8 bk","g8 wb"],"turn":"w","prompt":"Поставь пат в 2 хода.","hint":"Сначала g4—d7, затем поставь пат.","plies":[{"answers":["g4d7"],"reply":"b8a8"},{"answers":["d7c7"]}],"goal":"stalemate"}]},{"id":"t-draw","title":"Ничья","icon":"🤝","explain":"Ничья — когда никто не выиграл. Бывает: по согласию, при повторении позиции, когда не хватает фигур для мата (например, одни короли), по правилу 50 ходов, и при пате.","steps":[{"board":["a3 bp","f3 bk","a4 wk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: a4 на a3. Два короля — ничья.","answers":["a4a3"],"goal":"draw"},{"board":["c6 wk","b7 bn","e8 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: c6 на b7. Два короля — ничья.","answers":["c6b7"],"goal":"draw"},{"board":["a2 bk","d4 wk","c5 bn"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: d4 на c5. Два короля — ничья.","answers":["d4c5"],"goal":"draw"},{"board":["c5 bk","e6 bb","e7 wk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: e7 на e6. Два короля — ничья.","answers":["e7e6"],"goal":"draw"},{"board":["b1 wk","a2 bn","b8 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: b1 на a2. Два короля — ничья.","answers":["b1a2"],"goal":"draw"},{"board":["e1 bb","f1 wk","a6 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: f1 на e1. Два короля — ничья.","answers":["f1e1"],"goal":"draw"},{"board":["c1 bp","b2 wk","f6 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: b2 на c1. Два короля — ничья.","answers":["b2c1"],"goal":"draw"},{"board":["h3 wk","g4 bp","e7 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: h3 на g4. Два короля — ничья.","answers":["h3g4"],"goal":"draw"},{"board":["b2 wk","b3 bp","d5 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: b2 на b3. Два короля — ничья.","answers":["b2b3"],"goal":"draw"},{"board":["a1 bp","b1 wk","d2 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: b1 на a1. Два короля — ничья.","answers":["b1a1"],"goal":"draw"},{"board":["d5 bk","g7 bp","g8 wk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: g8 на g7. Два короля — ничья.","answers":["g8g7"],"goal":"draw"},{"board":["c2 bp","c3 wk","c6 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: c3 на c2. Два короля — ничья.","answers":["c3c2"],"goal":"draw"},{"board":["c1 wk","b2 bn","h3 bk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: c1 на b2. Два короля — ничья.","answers":["c1b2"],"goal":"draw"},{"board":["g1 bn","a2 bk","f2 wk"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: f2 на g1. Два короля — ничья.","answers":["f2g1"],"goal":"draw"},{"board":["b3 bk","f7 wk","g8 bn"],"turn":"w","prompt":"Сделай ничью — оставь на доске только королей.","hint":"Съешь последнюю фигуру королём: f7 на g8. Два короля — ничья.","answers":["f7g8"],"goal":"draw"}]}]}];
  const TUT_BY_ID = {}; for (const sec of TUT_SECTIONS) for (const L of sec.lessons) TUT_BY_ID[L.id] = L;

  const tut = { run: null, state: null, sel: -1, legal: [], lastMove: null, locked: false, info: false };

  function tutParse(list) { const b = new Array(64).fill(null); for (const it of list) { const sp = it.split(' '); b[C.nameToSq(sp[0])] = sp[1]; } return b; }
  function tutState(step) { return { board: tutParse(step.board), turn: step.turn || 'w', castling: step.castling || { wK: false, wQ: false, bK: false, bQ: false }, ep: -1, half: 0, full: 1 }; }

  function openTutorial() { unlockAudio(); $('setupScreen').hidden = true; $('gameScreen').hidden = true; $('tutorScreen').hidden = false; showTutMenu(); }
  function showTutMenu() { tut.run = null; tut.info = false; tut.locked = true; tg.on = false; $('tutTitle').innerHTML = tutTitleHTML(ICON.cap, 'Обучение'); $('tutMenu').hidden = false; $('tutLesson').hidden = true; $('tutGame').hidden = true; renderTutMenu(); }
  function tutBackAction() { if (!$('tutLesson').hidden || !$('tutGame').hidden) { showTutMenu(); } else { $('tutorScreen').hidden = true; showSetup(); } }

  // Пройденные темы (зелёные) хранятся между запусками
  const TUT_DONE_KEY = 'chessTutDone';
  function loadTutDone() { try { const a = JSON.parse(localStorage.getItem(TUT_DONE_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function markTutDone(id) { if (!id) return; const a = loadTutDone(); if (a.indexOf(id) < 0) { a.push(id); try { localStorage.setItem(TUT_DONE_KEY, JSON.stringify(a)); } catch (e) { } } }

  // ===== Задача дня (мат в 1 ход) =====
  const DAILY = [
    { board: ['a1 wr', 'g1 wk', 'g8 bk', 'f7 bp', 'g7 bp', 'h7 bp'], ans: 'a1a8', hint: 'Ладья на последнюю линию: a1 → a8.' },
    { board: ['d1 wq', 'g1 wk', 'g8 bk', 'f7 bp', 'g7 bp', 'h7 bp'], ans: 'd1d8', hint: 'Ферзь на последнюю линию: d1 → d8.' },
    { board: ['a7 wr', 'b1 wr', 'e1 wk', 'e8 bk'], ans: 'b1b8', hint: 'Вторая ладья держит 7-ю линию — ставь мат: b1 → b8.' },
    { board: ['h1 wr', 'a1 wk', 'a8 bk', 'a7 bp', 'b7 bp'], ans: 'h1h8', hint: 'Ладья на 8-ю линию: h1 → h8.' },
    { board: ['h1 wr', 'a1 wk', 'c8 bk', 'b7 bp', 'c7 bp', 'd7 bp'], ans: 'h1h8', hint: 'Ладья на 8-ю линию: h1 → h8.' },
    { board: ['e1 wq', 'a1 wk', 'b8 bk', 'a7 bp', 'b7 bp', 'c7 bp'], ans: 'e1e8', hint: 'Ферзь на 8-ю линию: e1 → e8.' },
    { board: ['c1 wr', 'h5 wk', 'h8 bk', 'g7 bp', 'h7 bp'], ans: 'c1c8', hint: 'Ладья на 8-ю линию: c1 → c8.' },
    { board: ['a1 wq', 'g1 wk', 'h8 bk', 'g7 bp', 'h7 bp'], ans: 'a1a8', hint: 'Ферзь на 8-ю линию: a1 → a8.' },
    { board: ['h4 wq', 'a3 wk', 'a8 bk', 'a7 bp', 'b7 bp'], ans: 'h4h8', hint: 'Ферзь на 8-ю линию: h4 → h8.' },
    { board: ['e1 wr', 'g1 wk', 'c8 bk', 'b7 bp', 'c7 bp', 'd7 bp'], ans: 'e1e8', hint: 'Ладья на 8-ю линию: e1 → e8.' },
  ];
  function dailyIndex() {
    const d = new Date();
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return ((day % DAILY.length) + DAILY.length) % DAILY.length;
  }
  function dailyKey() { const d = new Date(); return 'daily-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function openDaily() {
    const p = DAILY[dailyIndex()];
    const L = {
      id: dailyKey(), title: 'Задача дня', icon: '🎯', explain: 'Поставь мат в 1 ход!',
      steps: [{ board: p.board.slice(), turn: 'w', prompt: 'Поставь мат в 1 ход!', hint: p.hint, answers: [p.ans] }],
    };
    startLesson(L);
  }

  function renderTutMenu() {
    const done = loadTutDone();
    const dailyDone = done.indexOf(dailyKey()) >= 0;
    let total = 0, doneCount = 0;
    for (const sec of TUT_SECTIONS) for (const L of sec.lessons) { total++; if (done.indexOf(L.id) >= 0) doneCount++; }
    let html = `<button class="ch-daily${dailyDone ? ' done' : ''}" id="dailyCard">
      <span class="cd-ico">${ICON.target}</span>
      <span class="cd-txt"><span class="cd-t">Задача дня</span><span class="cd-d">${dailyDone ? 'Решено сегодня — молодец!' : 'Поставь мат в 1 ход'}</span></span>
      <span class="cd-st">${dailyDone ? ICON.check : '→'}</span></button>`;
    html += `<div class="ch-tut-count">Пройдено тем: ${doneCount} из ${total}</div>`;
    for (const sec of TUT_SECTIONS) {
      html += `<div class="ch-ach-head">${sec.name}</div><div class="ch-tut-grid">`;
      for (const L of sec.lessons) {
        const ok = done.indexOf(L.id) >= 0;
        html += `<button class="ch-tut-card${ok ? ' done' : ''}" data-lid="${L.id}"><span class="tc-ico">${lessonIco(L.icon)}</span><span class="tc-t">${L.title}</span><span class="tc-status">${ok ? ICON.check : ''}</span></button>`;
      }
      html += '</div>';
    }
    $('tutSections').innerHTML = html;
    const dc = $('dailyCard'); if (dc) dc.addEventListener('click', openDaily);
    document.querySelectorAll('#tutSections .ch-tut-card').forEach(b => b.addEventListener('click', () => openLesson(b.dataset.lid)));
  }

  function openLesson(id) { const L = TUT_BY_ID[id]; if (!L) return; if (L.info) showTutInfo(L); else startLesson(L); }

  function showTutInfo(L) {
    tut.info = true; tut.run = null; tut.locked = true;
    $('tutTitle').innerHTML = tutTitleHTML(lessonIco(L.icon), L.title);
    $('tutMenu').hidden = true; $('tutLesson').hidden = false;
    tut.state = tutState({ board: L.demo || ['e1 wk', 'e8 bk'], turn: 'w' });
    tut.sel = -1; tut.legal = []; tut.lastMove = null;
    $('tutExplain').innerHTML = L.explain; $('tutExplain').hidden = false;
    $('tutPrompt').innerHTML = L.note || '📖 Тема для понимания.';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutInfoOk">Понятно →</button>`;
    $('tutInfoOk').addEventListener('click', showTutMenu);
    renderTutBoard();
  }

  function startLesson(L) {
    tut.info = false; resolveTutSide();
    tut.run = { title: L.title, icon: L.icon, explain: L.explain, lessonId: L.id, steps: L.steps.map(s => ({ ...s })), idx: 0, reviewMode: false };
    $('tutTitle').innerHTML = tutTitleHTML(lessonIco(L.icon), L.title);
    $('tutMenu').hidden = true; $('tutLesson').hidden = false;
    loadRunStep();
  }

  function startReview() {
    let steps = [];
    // без объяснения темы — только задание (это проверка, а не урок)
    for (const sec of TUT_SECTIONS) for (const L of sec.lessons) if (L.steps) for (const s of L.steps) steps.push({ ...s, explain: '' });
    if (!steps.length) return;
    steps = shuffleArr(steps).slice(0, 30);   // 30 заданий вперемешку
    tut.info = false; resolveTutSide();
    tut.run = { title: 'Проверка знаний', explain: '', steps, idx: 0, reviewMode: true };
    $('tutTitle').innerHTML = tutTitleHTML(ICON.quiz, 'Проверка знаний');
    $('tutMenu').hidden = true; $('tutLesson').hidden = false;
    loadRunStep();
  }

  function loadRunStep() {
    const run = tut.run; const step = run.steps[run.idx];
    step._plies = step.plies || [{ answers: step.answers }];
    run.plyIdx = 0;
    tut.state = tutState(step); tut.sel = -1; tut.legal = []; tut.lastMove = null; tut.locked = false; tut.hintArrow = false;
    const ex = step.explain || run.explain || '';
    $('tutExplain').innerHTML = ex; $('tutExplain').hidden = !ex;
    const n = run.steps.length; const prog = n > 1 ? ` (${run.idx + 1}/${n})` : '';
    $('tutPrompt').innerHTML = `<b>Задание${prog}:</b> ${step.prompt}<br><span class="tut-hint">Твой ход ${app.tutSideResolved === 'b' ? 'чёрными' : 'белыми'} — нажми на фигуру, потом на клетку.</span>`;
    renderTutBoard();
    renderTaskActions();
  }

  // Кнопка «Подсказка» во время задания
  function renderTaskActions() {
    const run = tut.run; if (!run) return; const step = run.steps[run.idx];
    // в режиме повторения подсказок нет
    if (run.reviewMode) { $('tutActions').innerHTML = ''; return; }
    const hints = step._hints || (step._hints = step.hints || [step.hint || '']);
    const h = hints[run.plyIdx] || hints[0] || '';
    $('tutActions').innerHTML = h ? `<button class="ch-btn" id="tutHint">${inl(ICON.bulb)}Подсказка</button>` : '';
    const btn = $('tutHint');
    if (btn) btn.addEventListener('click', () => {
      const old = $('tutActions').querySelector('.tut-hintbox'); if (old) old.remove();
      const box = document.createElement('div'); box.className = 'tut-hintbox'; box.innerHTML = inl(ICON.bulb) + h;
      $('tutActions').appendChild(box);
      tut.hintArrow = true; renderTutBoard();   // показать стрелку «куда ходить»
    });
  }

  function renderTutBoard() {
    const el = $('tutBoard'); if (!el) return; el.innerHTML = '';
    // слой стоящих фигур (3D) — перестраиваем только при смене позиции/цвета (иначе тормозит)
    const elTPL = $('tutPieceLayer');
    let sig = (app.tutSideResolved || 'w'); for (let i = 0; i < 64; i++) sig += tut.state.board[i] || '.';
    const rebuildPL = !!elTPL && sig !== tutPlSig;
    if (rebuildPL) { elTPL.innerHTML = ''; tutPlSig = sig; }
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
      if (p) { const dc = tutDispColor(C.colorOf(p)); const pc = document.createElement('span'); pc.className = 'ch-piece ' + (dc === 'w' ? 'white' : 'black'); pc.innerHTML = pieceHTML(dc, C.typeOf(p)); cell.appendChild(pc); }
      if (tut.legal.some(m => m.to === s)) { const dot = document.createElement('span'); dot.className = 'ch-dot' + (tut.state.board[s] ? ' cap' : ''); cell.appendChild(dot); }
      if (p && C.typeOf(p) === 'k' && C.inCheck(tut.state, C.colorOf(p))) cell.classList.add('check');
      cell.addEventListener('pointerdown', () => onTutTap(s));
      el.appendChild(cell);
      // слой стоящих фигур для 3D (клики проходят сквозь него)
      if (rebuildPL) {
        const pcell = document.createElement('div'); pcell.className = 'pl-cell';
        if (p) { const col = tutDispColor(C.colorOf(p)); if (C.typeOf(p) === 'p') pcell.classList.add('pl-pawn'); const pi = document.createElement('div'); pi.className = 'pl-piece'; const im = document.createElement('div'); im.className = 'pl-img pt-' + col + C.typeOf(p); pi.appendChild(im); pcell.appendChild(pi); }
        elTPL.appendChild(pcell);
      }
    }
    maybeDrawTutArrow(el);
  }

  // Стрелка-подсказка «куда ходить» — в ПЕРВОМ задании урока (до первого хода) и когда нажали «Подсказку».
  function maybeDrawTutArrow(el) {
    const al = $('tutArrowLayer'); if (al) al.innerHTML = '';   // отдельный слой стрелки (поверх фигур в 3D)
    const run = tut.run; if (!run || run.reviewMode || !al) return;
    const firstAuto = run.idx === 0 && run.plyIdx === 0 && !tut.lastMove;
    if (!firstAuto && !tut.hintArrow) return;
    const step = run.steps[run.idx]; if (!step) return;
    const plies = step._plies || (step.plies) || [{ answers: step.answers }];
    const ply = plies[run.plyIdx] || plies[0];
    const code = ply && ply.answers && ply.answers[0];
    if (!code || code.length < 4) return;
    const from = C.nameToSq(code.substr(0, 2)), to = C.nameToSq(code.substr(2, 2));
    if (from == null || to == null) return;
    const fx = (from % 8) + 0.5, fy = (7 - ((from / 8) | 0)) + 0.5;
    const tx = (to % 8) + 0.5, ty = (7 - ((to / 8) | 0)) + 0.5;
    let dx = tx - fx, dy = ty - fy; const len = Math.hypot(dx, dy) || 1; const ux = dx / len, uy = dy / len;
    const sx = fx + ux * 0.30, sy = fy + uy * 0.30;          // старт чуть в стороне от фигуры
    const hbx = tx - ux * 0.34, hby = ty - uy * 0.34;         // основание наконечника
    const tipx = tx - ux * 0.06, tipy = ty - uy * 0.06;       // остриё у центра клетки
    const px = -uy, py = ux, hw = 0.24;                       // половина ширины наконечника
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'tut-arrow'); svg.setAttribute('viewBox', '0 0 8 8'); svg.setAttribute('preserveAspectRatio', 'none');
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', sx); line.setAttribute('y1', sy); line.setAttribute('x2', hbx); line.setAttribute('y2', hby);
    line.setAttribute('class', 'tut-arrow-line');
    const head = document.createElementNS(ns, 'polygon');
    head.setAttribute('points', `${tipx},${tipy} ${hbx + px * hw},${hby + py * hw} ${hbx - px * hw},${hby - py * hw}`);
    head.setAttribute('class', 'tut-arrow-head');
    svg.appendChild(line); svg.appendChild(head);
    al.appendChild(svg);
  }

  function onTutTap(s) {
    if (tut.locked) return; unlockAudio();
    const st = tut.state; const p = st.board[s];
    if (tut.sel >= 0 && tut.legal.some(m => m.to === s)) { doTutMove(tut.sel, s); return; }
    // рокировка тапом по своей ладье, когда выбран король
    if (tut.sel >= 0 && p && C.typeOf(p) === 'r' && C.colorOf(p) === st.turn && st.board[tut.sel] && C.typeOf(st.board[tut.sel]) === 'k') {
      const want = (s % 8) === 7 ? 'cK' : ((s % 8) === 0 ? 'cQ' : null);
      const cm = want && tut.legal.find(m => m.flag === want);
      if (cm) { doTutMove(tut.sel, cm.to); return; }
    }
    if (p && C.colorOf(p) === st.turn) { tut.sel = s; tut.legal = C.legalMovesFrom(st, s); renderTutBoard(); return; }
    tut.sel = -1; tut.legal = []; renderTutBoard();
  }

  function doTutMove(from, to) {
    const st = tut.state; tut.hintArrow = false;
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
    $('tutPrompt').innerHTML = inl(ICON.check) + '<b>Верно!</b> Смотри ответ соперника…';
    const reply = ply.reply;
    setTimeout(() => {
      if (reply) {
        const rf = C.nameToSq(reply.substr(0, 2)), rt = C.nameToSq(reply.substr(2, 2)), rp = reply[4] || '';
        let rm = C.legalMovesFrom(tut.state, rf).find(m => m.to === rt && (!rp || m.promo === rp)) || C.legalMovesFrom(tut.state, rf).find(m => m.to === rt);
        if (rm) { C.makeMove(tut.state, rm); tut.lastMove = { from: rf, to: rt }; }
      }
      run.plyIdx++; tut.locked = false; renderTutBoard();
      const np = step._plies[run.plyIdx];
      const ask = (np && np.ask) || step.prompt2 || step.prompt;
      $('tutPrompt').innerHTML = `<b>Продолжай:</b> ${ask}<br><span class="tut-hint">Твой ход.</span>`;
      renderTaskActions();
    }, 550);
  }

  function flashTut(kind) { const fl = $('tutFlash'); if (!fl) return; fl.className = ''; void fl.offsetWidth; fl.className = 'show ' + kind; }

  function tutGood() {
    tut.locked = true; flashTut('good'); playGoodSound();
    const run = tut.run; const last = run.idx >= run.steps.length - 1;
    $('tutPrompt').innerHTML = inl(ICON.check) + '<b>Верно!</b> Отличный ход!';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutNext">${last ? inl(ICON.check) + 'Готово' : 'Продолжить →'}</button>`;
    $('tutNext').addEventListener('click', () => { if (last) finishRun(); else { run.idx++; loadRunStep(); } });
  }

  function tutBad() {
    tut.locked = true; flashTut('bad'); playBadSound();
    $('tutPrompt').innerHTML = inl(ICON.cross) + '<b>Не тот ход.</b> Попробуй ещё раз!';
    $('tutActions').innerHTML = `<button class="ch-btn" id="tutRetry">↻ Ещё раз</button><button class="ch-btn ch-btn-primary" id="tutShow">${inl(ICON.bulb)}Показать ответ и дальше</button>`;
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
    $('tutPrompt').innerHTML = inl(ICON.bulb) + 'Вот правильное решение. Запомни его!';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutNext2">${last ? inl(ICON.check) + 'Готово' : 'Дальше →'}</button>`;
    $('tutNext2').addEventListener('click', () => { if (last) finishRun(); else { run.idx++; loadRunStep(); } });
  }

  function finishRun() {
    flashTut('good'); playGoodSound(); tut.locked = true;
    if (tut.run.reviewMode) { for (const sec of TUT_SECTIONS) for (const L of sec.lessons) markTutDone(L.id); }
    else markTutDone(tut.run.lessonId);
    $('tutExplain').innerHTML = tut.run.reviewMode ? inl(ICON.trophy) + 'Проверка знаний пройдена! Ты молодец!' : inl(ICON.sparkle) + 'Урок пройден! Отличная работа!'; $('tutExplain').hidden = false;
    $('tutPrompt').innerHTML = '';
    $('tutActions').innerHTML = `<button class="ch-btn ch-btn-primary" id="tutDone">← В меню обучения</button>`;
    $('tutDone').addEventListener('click', showTutMenu);
  }

  /* ========================================================
     ИГРА-ПОВТОРЕНИЕ (викторина: пешка идёт в ферзи)
     ======================================================== */
  // a — правильный ответ, w — неправильные
  const TG_QUIZ = [
    { q: 'Цель игры в шахматы это —', a: 'Мат королю', w: ['Съесть все фигуры', 'Связка'] },
    { q: 'Как ходит ладья?', a: 'По прямой линии', w: ['Буквой «Г»', 'По диагонали'] },
    { q: 'Как ходит слон?', a: 'По диагонали', w: ['По прямой', 'Буквой «Г»'] },
    { q: 'Как ходит конь?', a: 'Буквой «Г»', w: ['По диагонали', 'По прямой'] },
    { q: 'Самая сильная фигура?', a: 'Ферзь', w: ['Пешка', 'Конь'] },
    { q: 'Что делает пешка на последней линии?', a: 'Превращается в фигуру', w: ['Исчезает', 'Ходит назад'] },
    { q: 'Что такое «шах»?', a: 'Королю угрожают', w: ['Ничья', 'Конец игры'] },
    { q: 'Что такое «мат»?', a: 'Шах и нет спасения', w: ['Просто шах', 'Ничья'] },
    { q: 'Что такое «пат»?', a: 'Нет ходов, но нет шаха', w: ['Это мат', 'Шах королю'] },
    { q: 'Сколько клеток на доске?', a: '64', w: ['32', '100'] },
    { q: 'Ход королём и ладьёй сразу это —', a: 'Рокировка', w: ['Вилка', 'Связка'] },
    { q: '«Вилка» — это нападение на —', a: 'Две фигуры сразу', w: ['Одну пешку', 'Своего короля'] },
    { q: 'Король может пойти под бой?', a: 'Нет, нельзя', w: ['Да, можно', 'Только с ферзём'] },
    { q: 'Сколько пешек у игрока в начале?', a: '8', w: ['16', '4'] },
    { q: 'Пешка первым ходом идёт на —', a: 'Одну или две клетки', w: ['Только одну', 'Три клетки'] },
    { q: 'Какая фигура ходит и прямо, и наискосок?', a: 'Ферзь', w: ['Ладья', 'Конь'] },
    { q: 'Что важно в начале партии?', a: 'Развить фигуры', w: ['Съесть пешку', 'Спрятать короля в угол'] },
    { q: '«Связка» — это когда фигуре —', a: 'Нельзя уйти (за ней король)', w: ['Дают приз', 'Можно ходить дважды'] }
  ];
  const tg = { on: false, order: [], qi: 0, step: 0, opts: [], correct: '', locked: false, delta: 0 };
  const TG_FILE = 4;   // вертикаль e
  const TG_GOAL = 8;   // столько верных ответов — и пешка станет ферзём

  function shuffleArr(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function startTutGame() {
    unlockAudio(); resolveTutSide();
    tut.run = null; tut.info = false;
    tg.on = true; tg.step = 0; tg.qi = 0; tg.locked = false; tg.delta = 0;
    tg.order = shuffleArr(TG_QUIZ.map((_, i) => i));
    $('tutTitle').innerHTML = tutTitleHTML(ICON.play, 'Игра — повторение');
    $('tutMenu').hidden = true; $('tutLesson').hidden = true; $('tutGame').hidden = false;
    $('tgFoot').innerHTML = '';
    nextTgQuestion();
  }

  function nextTgQuestion() {
    if (tg.step >= TG_GOAL) { tgWin(); return; }
    const q = TG_QUIZ[tg.order[tg.qi % tg.order.length]];
    tg.correct = q.a;
    tg.opts = shuffleArr([q.a].concat(q.w));
    tg.locked = false; tg.delta = 0;
    $('tgQuestion').innerHTML = q.q;
    renderTgBoard(false);
    renderTgOptions();
    updateTgProgress();
  }

  function updateTgProgress() {
    $('tgProgress').innerHTML = `Ступенька ${Math.min(tg.step, TG_GOAL)} из ${TG_GOAL} · пешка идёт в ферзи ♟&nbsp;→&nbsp;♛`;
  }

  function renderTgOptions() {
    const box = $('tgOptions'); if (!box) return; box.innerHTML = '';
    tg.opts.forEach(val => {
      const b = document.createElement('button');
      b.className = 'ch-tg-opt'; b.textContent = val;
      b.addEventListener('click', () => onTgAnswer(val, b));
      box.appendChild(b);
    });
  }

  function renderTgBoard(promoted) {
    const el = $('tgBoard'); if (!el) return; el.innerHTML = '';
    const pRank = promoted ? 7 : Math.min(tg.step, 7);
    for (let rr = 7; rr >= 0; rr--) for (let ff = 0; ff < 8; ff++) {
      const cell = document.createElement('div');
      cell.className = 'ch-sq ' + ((ff + rr) % 2 === 0 ? 'dark' : 'light');
      if (ff === 0) { const rk = document.createElement('span'); rk.className = 'ch-coord ch-coord-rank'; rk.textContent = rr + 1; cell.appendChild(rk); }
      if (rr === 0) { const fl = document.createElement('span'); fl.className = 'ch-coord ch-coord-file'; fl.textContent = FILE_LETTER(ff); cell.appendChild(fl); }
      if (ff === TG_FILE && rr === pRank) {
        if (tg.delta > 0) cell.classList.add('tg-up');
        else if (tg.delta < 0) cell.classList.add('tg-down');
        const pc = document.createElement('span');
        const dc = tutDispColor('w');
        pc.className = 'ch-piece ' + (dc === 'w' ? 'white' : 'black') + (promoted ? ' tg-promote' : '');
        pc.innerHTML = pieceHTML(dc, promoted ? 'q' : 'p');
        cell.appendChild(pc);
      }
      el.appendChild(cell);
    }
  }

  function onTgAnswer(val, btn) {
    if (tg.locked) return; tg.locked = true; unlockAudio();
    if (val === tg.correct) {
      btn.classList.add('ok'); flashTut('good'); playGoodSound();
      tg.step++; tg.delta = 1;
      renderTgBoard(false); updateTgProgress();
      setTimeout(() => { if (tg.on) { tg.qi++; nextTgQuestion(); } }, 800);
    } else {
      btn.classList.add('bad'); flashTut('bad'); playBadSound();
      Array.from($('tgOptions').children).forEach(b => { if (b.textContent === tg.correct) b.classList.add('ok'); });
      tg.delta = -1; if (tg.step > 0) tg.step--;
      renderTgBoard(false); updateTgProgress();
      setTimeout(() => { if (tg.on) { tg.qi++; nextTgQuestion(); } }, 1200);
    }
  }

  function tgWin() {
    tg.locked = true; flashTut('good'); playGoodSound();
    renderTgBoard(true);
    $('tgQuestion').innerHTML = inl(ICON.queen) + 'Пешка дошла до конца и стала ферзём!';
    $('tgOptions').innerHTML = '';
    $('tgProgress').innerHTML = inl(ICON.trophy) + 'Победа! Ты ответил на все вопросы!';
    $('tgFoot').innerHTML = `<button class="ch-btn ch-btn-primary" id="tgAgain">↻ Играть ещё</button><button class="ch-btn" id="tgMenu">← В меню обучения</button>`;
    $('tgAgain').addEventListener('click', startTutGame);
    $('tgMenu').addEventListener('click', showTutMenu);
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
      `<span class="hs-win">${inl(ICON.trophy)}Побед: ${win}</span><span class="hs-loss">${inl(ICON.cross)}Поражений: ${loss}</span><span class="hs-draw">${inl(ICON.handshake)}Ничьих: ${draw}</span>`;
    let html = '';
    for (let i = a.length - 1; i >= 0; i--) {
      const r = a[i];
      let cls, main;
      if (r.r === 'win') { cls = 'win'; main = 'Выиграл'; }
      else if (r.r === 'loss') { cls = 'loss'; main = 'Проиграл'; }
      else if (r.r === 'side') { cls = 'side'; main = (r.w === 'w' ? 'Белые' : 'Чёрные') + ' победили'; }
      else { cls = 'draw'; main = 'Ничья'; }
      const sub = modeLabel(r.mode) + (r.dur ? ' · ' + inl(ICON.clock) + fmtDur(r.dur) : '');
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
    $('tutGameBtn').addEventListener('click', startTutGame);
    $('ranksBtn').addEventListener('click', openRanks);
    $('ranksClose').addEventListener('click', () => { $('ranksModal').hidden = true; });
  }

  /* ========================================================
     ДОСТИЖЕНИЯ (статистика игрока)
     ======================================================== */
  const STATS_KEY = 'chessStats';
  function hasYou() { return app.mode === 'bot' || (app.mode === 'friend' && app.online.on && app.online.role !== 'watch'); }
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
    { t: 'Шахматист', d: 'Поставь 15 шахов в одной партии', ico: ACH.swords, goal: 15, cur: s => s.maxChecksInGame },
    { t: 'Вилка', d: 'Сделай вилку 3 раза', ico: ACH.fork, goal: 3, cur: s => s.forks },
    { t: 'Выиграл ИИ', d: 'Выиграй со сложным ботом', ico: ACH.bot, goal: 1, cur: s => s.wonHardBot ? 1 : 0 },
    { t: 'Любитель шахмат', d: 'Сыграй 100 и более партий', ico: ACH.pawn, goal: 100, cur: s => s.games },
    { t: 'Можно без матов?', d: 'Поставь 100 и более матов', ico: ACH.crown, goal: 100, cur: s => s.checkmatesBy },
    { t: 'Мгновенный мат', d: 'Поставь мат за 10 ходов', ico: ACH.bolt, goal: 1, cur: s => s.fastMate ? 1 : 0 },
    { t: 'Убит ферзь', d: 'Съешь у соперника 5 ферзей', ico: ACH.queen, goal: 5, cur: s => s.queensCaptured },
    { t: 'Мафия', d: 'Съешь у соперника 50 фигур', ico: ACH.detective, goal: 50, cur: s => s.captures },
    { t: 'Казнить!', d: 'Съешь 20 пешек', ico: ACH.axe, goal: 20, cur: s => s.pawnsCaptured },
    { t: 'Туда-сюда', d: 'Повтори ход 3 раза', ico: ACH.repeat, goal: 3, cur: s => s.repeats },
    { t: 'Заложник', d: 'Свяжи 3 фигуры соперника', ico: ACH.chain, goal: 3, cur: s => s.pins },
    { t: 'Алфавитный порядок', d: 'Сходи на клетки a-b-c-d-e-f подряд', ico: ACH.abc, goal: 1, cur: s => s.alphabet ? 1 : 0 },
    { t: 'Свобода!', d: 'Сыграй 30 партий без ограничений', ico: ACH.dove, goal: 30, cur: s => s.freeGames },
    { t: 'В укрытие!', d: 'Сделай рокировку 3 раза', ico: ACH.rook, goal: 3, cur: s => s.castles },
    // секретные
    { t: 'Превращение', d: 'Преврати пешку 5 раз', ico: ACH.sparkle, goal: 5, cur: s => s.promotions, secret: true },
    { t: 'Убит всадник', d: 'Съешь коня и пешку подряд', ico: ACH.horse, goal: 1, cur: s => Math.min(s.knightThenPawn, 1), secret: true },
    { t: 'Большой брат', d: 'Уйди от преследования фигуры', ico: ACH.eye, goal: 1, cur: s => Math.min(s.escapes, 1), secret: true },
    { t: 'За чёрных', d: 'Сыграй за чёрных 10 партий', ico: ACH.black, goal: 10, cur: s => s.blackGames, secret: true },
    { t: 'Ай, зевнул!', d: 'Потеряй 3 своих ферзей', ico: ACH.yawn, goal: 3, cur: s => s.queensLost, secret: true },
    { t: 'Не спи!', d: 'Сыграй партию целый час', ico: ACH.alarm, goal: 1, cur: s => s.hourGame ? 1 : 0, secret: true },
    { t: 'Братство', d: 'Сдайся 3 раза', ico: ACH.flag, goal: 3, cur: s => s.resigns, secret: true },
    { t: 'Равенство', d: 'Сыграй вничью 5 раз', ico: ACH.equal, goal: 5, cur: s => s.draws, secret: true },
    { t: 'Убийство племя', d: 'Съешь все фигуры соперника за одну партию', ico: ACH.skull, goal: 1, cur: s => s.wipeout ? 1 : 0, secret: true },
    { t: 'Бедные животные!', d: 'Съешь 30 коней или слонов', ico: ACH.paw, goal: 30, cur: s => s.minorsCaptured, secret: true },
    { t: 'Ой, не туда', d: 'Отмени ход 5 раз', ico: ACH.undo, goal: 5, cur: s => s.undos, secret: true },
    { t: 'Нет прав у чёрных!', d: 'Свяжи 5 чёрных фигур', ico: ACH.chains, goal: 5, cur: s => s.blackPins, secret: true }
  ];

  function achCard(a, s) {
    const cur = a.cur(s), ok = cur >= a.goal;
    const locked = a.secret && !ok;
    const ico = locked ? ACH.quest : a.ico;
    const desc = locked ? '?' : a.d;
    const prog = Math.min(cur, a.goal) + '/' + a.goal;
    return `<div class="ch-ach-item ${ok ? 'done' : ''}"><span class="ach-ico">${ico}</span><div class="ach-txt"><span class="ach-t"><span class="ach-mark">${ok ? ACH.check : ACH.lock}</span>${a.t}</span><span class="ach-d">${desc}</span></div><span class="ach-prog">${prog}</span></div>`;
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
    if (info) {
      const plGames = (n) => { const a = n % 10, b = n % 100; if (a === 1 && b !== 11) return 'партия'; if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return 'партии'; return 'партий'; };
      const line1 = `Сыграно партий — <b>${g}</b>`;
      const left = next ? next.g - g : 0;
      const line2 = next
        ? `Ранг — <b>${r.name}</b>, до «${next.name}» — <b>${left}</b> ${plGames(left)}`
        : `Ранг — <b>${r.name}</b> (максимальный!)`;
      info.innerHTML = line1 + '<br>' + line2;
    }
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
