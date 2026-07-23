/* ==========================================================================
   ЛОГИКА ТРЕНАЖЁРА
   ========================================================================== */
"use strict";

const STORE_KEY = "geo-trainer-v1";

/* ---------- Хранилище прогресса ---------- */
const Store = {
  data: { bestStreak: 0, points: 0, topics: {}, theme: "dark", palette: "ocean", timed: false, qtime: 20, sound: true },
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) this.data = Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* игнорируем */ }
    return this.data;
  },
  save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); }
    catch (e) { /* приватный режим — просто не сохраняем */ }
  },
  topicStat(id) {
    if (!this.data.topics[id]) this.data.topics[id] = { plays: 0, best: 0 };
    return this.data.topics[id];
  },
};

/* ---------- Звуки (генерируются через Web Audio, без файлов) ---------- */
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  enabled() { return Store.data.sound !== false; },
  tone(freq, start, dur, type, gain) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(start); o.stop(start + dur + 0.02);
  },
  correct() {
    if (!this.enabled()) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    // мягкий тёплый аккорд «до-ми-соль» с плавным затуханием (колокольчик)
    this.tone(523.25, t, 0.55, "sine", 0.13);         // C5
    this.tone(659.25, t + 0.10, 0.6, "sine", 0.11);   // E5
    this.tone(783.99, t + 0.20, 0.7, "sine", 0.08);   // G5 (тихо)
  },
  wrong() {
    if (!this.enabled()) return;
    const ctx = this.ensure(); if (!ctx) return;
    const t = ctx.currentTime;
    this.tone(196, t, 0.18, "square", 0.14);        // низкий «бз-з» вниз
    this.tone(146, t + 0.15, 0.26, "square", 0.14);
  },
};

/* ---------- Утилиты ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Перемешиваем варианты внутри вопроса, сохраняя правильный ответ */
function prepareQuestion(item, topicTitle) {
  const opts = item.options.map((text, idx) => ({ text, correct: idx === item.answer }));
  const mixed = shuffle(opts);
  return {
    q: item.q,
    explain: item.explain,
    topic: topicTitle,
    img: item.img || null,
    options: mixed.map((o) => o.text),
    answer: mixed.findIndex((o) => o.correct),
  };
}

function buildQuiz(topicIds, limit) {
  let pool = [];
  topicIds.forEach((id) => {
    const t = TOPICS[id];
    t.questions.forEach((question) => pool.push(prepareQuestion(question, t.title)));
  });
  pool = shuffle(pool);
  if (limit && pool.length > limit) pool = pool.slice(0, limit);
  return pool;
}

/* ---------- Навигация по экранам ---------- */
function showScreen(name) {
  $$(".screen").forEach((s) => s.classList.remove("active"));
  const el = $("#screen-" + name);
  if (el) el.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------- Состояние текущего квиза ---------- */
const Quiz = {
  list: [],
  index: 0,
  score: 0,
  combo: 0,
  answered: false,
  mode: "topic",
  label: "",
  wrongTopics: {},

  start(list, label, mode) {
    this.list = list;
    this.index = 0;
    this.score = 0;
    this.combo = 0;
    this.answered = false;
    this.mode = mode || "topic";
    this.label = label || "";
    this.wrongTopics = {};
    this.timed = !!Store.data.timed;
    this.qtime = Store.data.qtime || 20;
    showScreen("quiz");
    this.render();
  },

  /* ----- Таймер (режим на время) ----- */
  stopTimer() { if (this.timerId) { clearInterval(this.timerId); this.timerId = null; } },
  startTimer() {
    this.stopTimer();
    const box = $("#quizTimer");
    if (!this.timed) { box.hidden = true; return; }
    box.hidden = false;
    this.timeLeft = this.qtime;
    this.paintTimer();
    this.timerId = setInterval(() => {
      this.timeLeft--;
      this.paintTimer();
      if (this.timeLeft <= 0) { this.stopTimer(); this.onTimeout(); }
    }, 1000);
  },
  paintTimer() {
    $("#timerNum").textContent = this.timeLeft;
    const lowAt = Math.min(5, Math.ceil(this.qtime / 2));
    $("#quizTimer").classList.toggle("low", this.timeLeft <= lowAt);
  },
  onTimeout() {
    if (this.answered) return;
    this.answered = true;
    const item = this.list[this.index];
    $$("#qOptions .opt").forEach((b, idx) => {
      b.disabled = true;
      if (idx === item.answer) b.classList.add("wrong");   // не успели — подсвечиваем красным
    });
    this.wrongTopics[item.topic] = (this.wrongTopics[item.topic] || 0) + 1;
    Sound.wrong();
    const explain = $("#qExplain");
    explain.innerHTML = `<strong>⏱ Время вышло!</strong> Правильный ответ выделен. ${item.explain}`;
    explain.hidden = false;
    explain.classList.remove("ok");
    explain.classList.add("no");
    $("#nextBtn").disabled = false;
    Store.save();
  },

  render() {
    const item = this.list[this.index];
    this.answered = false;
    $("#qTopic").textContent = item.topic;
    $("#qText").textContent = item.q;
    const pic = $("#qPic");
    if (item.img && window.PICS) { pic.innerHTML = PICS.render(item.img); pic.hidden = false; }
    else { pic.hidden = true; pic.innerHTML = ""; }
    $("#qCount").textContent = `${this.index + 1} / ${this.list.length}`;
    $("#quizScore").textContent = this.score;
    $("#qbarFill").style.width = `${(this.index / this.list.length) * 100}%`;

    const explain = $("#qExplain");
    explain.hidden = true;
    explain.textContent = "";

    const next = $("#nextBtn");
    next.disabled = true;
    next.textContent = this.index === this.list.length - 1 ? "Завершить ✓" : "Дальше →";

    const box = $("#qOptions");
    box.innerHTML = "";
    item.options.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.className = "opt";
      btn.type = "button";
      btn.innerHTML = `<span class="opt-key">${String.fromCharCode(65 + i)}</span><span>${text}</span>`;
      btn.addEventListener("click", () => this.choose(i, btn));
      box.appendChild(btn);
    });

    $("#quizCard").classList.remove("card-in");
    void $("#quizCard").offsetWidth; // перезапуск анимации
    $("#quizCard").classList.add("card-in");

    this.startTimer();
  },

  choose(i, btn) {
    if (this.answered) return;
    this.stopTimer();
    this.answered = true;
    const item = this.list[this.index];
    const correct = i === item.answer;
    const optButtons = $$("#qOptions .opt");

    optButtons.forEach((b, idx) => {
      b.disabled = true;
      if (idx === item.answer) b.classList.add("correct");
    });

    if (correct) {
      btn.classList.add("correct");
      this.score++;
      Store.data.points = (Store.data.points || 0) + 1;   // очко за правильный ответ
      $("#totalPoints").textContent = Store.data.points;
      Sound.correct();
    } else {
      btn.classList.add("wrong");
      const key = item.topic;
      this.wrongTopics[key] = (this.wrongTopics[key] || 0) + 1;
      Sound.wrong();
    }

    $("#quizScore").textContent = this.score;

    const explain = $("#qExplain");
    explain.innerHTML = `<strong>${correct ? "Верно! ✅" : "Не совсем 🤔"}</strong> ${item.explain}`;
    explain.hidden = false;
    explain.classList.toggle("ok", correct);
    explain.classList.toggle("no", !correct);

    $("#nextBtn").disabled = false;
    Store.save();
  },

  next() {
    if (!this.answered) return;
    this.stopTimer();
    if (this.index < this.list.length - 1) {
      this.index++;
      this.render();
    } else {
      this.finish();
    }
  },

  finish() {
    this.stopTimer();
    $("#qbarFill").style.width = "100%";
    const total = this.list.length;
    const score = this.score;
    const pct = Math.round((score / total) * 100);

    // Сохраняем статистику для тематических квизов и экзамена
    if (this.mode === "topic" && this.topicId) {
      const st = Store.topicStat(this.topicId);
      st.plays++;
      if (pct > st.best) st.best = pct;
      Store.save();
    }

    $("#resultScore").textContent = score;
    $("#resultTotal").textContent = total;
    $("#ringPct").textContent = pct + "%";

    const ring = $("#ring");
    const circ = 2 * Math.PI * 52;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ;
    setTimeout(() => { ring.style.strokeDashoffset = circ * (1 - pct / 100); }, 100);

    let badge, title, msg;
    if (pct === 100) { badge = "🏆"; title = "Идеально!"; msg = "Вы настоящий знаток планеты! Все ответы верны."; }
    else if (pct >= 80) { badge = "🌟"; title = "Отлично!"; msg = "Очень крепкие знания. Ещё чуть-чуть до совершенства."; }
    else if (pct >= 60) { badge = "👍"; title = "Хорошо!"; msg = "Неплохо! Повторите сложные темы и станьте лучше."; }
    else if (pct >= 40) { badge = "📘"; title = "Есть над чем поработать"; msg = "Загляните в «Карточки-факты» и попробуйте снова."; }
    else { badge = "🌱"; title = "Начало положено"; msg = "Не переживайте! Изучите факты и возвращайтесь — получится!"; }

    $("#resultBadge").textContent = badge;
    $("#resultTitle").textContent = title;
    $("#resultMsg").textContent = msg;

    const wrongEntries = Object.entries(this.wrongTopics).sort((a, b) => b[1] - a[1]);
    const meta = $("#resultMeta");
    if (wrongEntries.length) {
      meta.innerHTML = "Стоит повторить: " +
        wrongEntries.map(([t, n]) => `<span class="chip">${t} · ${n} ${plural(n)}</span>`).join(" ");
    } else {
      meta.innerHTML = `<span class="chip good">Ошибок нет — блестяще!</span>`;
    }

    showScreen("result");
  },
};

function plural(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "ошибка";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "ошибки";
  return "ошибок";
}

/* Цвет полосы прогресса по уровню знания темы */
function progColor(p) {
  if (p >= 80) return "#35c46b";   // зелёный — отлично
  if (p >= 50) return "#f4b400";   // жёлтый — неплохо
  if (p > 0) return "#ff7043";     // оранжевый — стоит подтянуть
  return "var(--border)";          // ещё не начинали
}

/* ---------- Отрисовка главной ---------- */
function renderHome() {
  const grid = $("#topicGrid");
  grid.innerHTML = "";
  topicOrder().forEach((id) => {
    const t = TOPICS[id];
    const st = Store.topicStat(id);
    const pct = st.best || 0;
    const card = document.createElement("button");
    card.className = "topic-card";
    card.dataset.id = id;
    card.style.setProperty("--accent", t.color);
    card.dataset.search = (t.title + " " + t.desc).toLowerCase().replace(/ё/g, "е");
    card.innerHTML = `
      <div class="tc-icon">${t.icon}</div>
      <div class="tc-body">
        <h3>${t.title}</h3>
        <p>${t.desc}</p>
        <div class="tc-meta">
          <span>${t.questions.length} вопросов</span>
          ${st.plays ? "" : `<span class="tc-new">Новая</span>`}
        </div>
        <div class="tc-progress">
          <div class="tcp-top">Прогресс <b>${pct}%</b></div>
          <div class="tcp-track"><div class="tcp-fill" style="width:${pct}%;background:${progColor(pct)}"></div></div>
        </div>
      </div>
      <span class="tc-go">▶</span>`;
    card.addEventListener("click", () => {
      if (DRAG.suppress) return;   // не запускаем сразу после перетаскивания
      startTopic(id);
    });
    grid.appendChild(card);
  });
  const rob = $("#resetOrderBtn");
  if (rob) rob.hidden = !(Array.isArray(Store.data.order) && Store.data.order.length);
  renderStats();
  if ($("#topicSearch") && $("#topicSearch").value) filterTopics();
}

/* ---------- Свой порядок тем: перетаскивание + сохранение ---------- */
const DRAG = { suppress: false, el: null, on: false, clr: null, timer: null, sx: 0, sy: 0, ptype: "", startNext: null, ph: null, ox: 0, oy: 0, px: 0, py: 0, rafId: 0 };

function topicOrder() {
  const saved = Array.isArray(Store.data.order) ? Store.data.order.filter((id) => TOPICS[id]) : [];
  const rest = TOPIC_ORDER.filter((id) => !saved.includes(id));   // новые темы — в конец
  return saved.concat(rest);
}

function saveTopicOrder() {
  Store.data.order = $$("#topicGrid .topic-card").map((c) => c.dataset.id);
  Store.save();
  const rob = $("#resetOrderBtn");
  if (rob) rob.hidden = false;
}

function resetTopicOrder() {
  delete Store.data.order;
  Store.save();
  renderHome();
}

function sortTopicsByProgress() {
  // темы с самым высоким % прогресса — наверх, с самым низким — вниз
  const ids = topicOrder();
  ids.sort((a, b) => (Store.topicStat(b).best || 0) - (Store.topicStat(a).best || 0));
  Store.data.order = ids;
  Store.save();
  renderHome();
}

function setupDragReorder() {
  const grid = $("#topicGrid");
  if (!grid) return;

  function moveTo(x, y) {
    DRAG.el.style.transform = `translate(${(x - DRAG.ox).toFixed(1)}px, ${(y - DRAG.oy).toFixed(1)}px)`;
  }

  function activate() {
    if (DRAG.on || !DRAG.el) return;
    DRAG.on = true; DRAG.suppress = true;
    const el = DRAG.el, r = el.getBoundingClientRect();
    DRAG.ox = DRAG.sx - r.left; DRAG.oy = DRAG.sy - r.top;   // где схватили карточку
    // пустое место (пунктирный слот) там, где карточка стояла
    const ph = document.createElement("div");
    ph.className = "tc-placeholder";
    ph.style.height = r.height + "px";
    el.parentNode.insertBefore(ph, el);
    DRAG.ph = ph;
    // «отрываем» карточку — теперь она плывёт за пальцем
    el.classList.add("dragging");
    el.style.width = r.width + "px";
    el.style.position = "fixed";
    el.style.left = "0"; el.style.top = "0"; el.style.margin = "0";
    document.body.classList.add("drag-lock");
    DRAG.px = DRAG.sx; DRAG.py = DRAG.sy;
    moveTo(DRAG.sx, DRAG.sy);
    DRAG.rafId = requestAnimationFrame(autoScroll);   // прокрутка списка у краёв
  }

  // Когда карточка у верхнего/нижнего края экрана — список сам прокручивается
  function autoScroll() {
    if (!DRAG.on) return;
    const h = window.innerHeight, EDGE = 90, MAX = 15;
    let dy = 0;
    if (DRAG.py < EDGE) dy = -MAX * (1 - DRAG.py / EDGE);
    else if (DRAG.py > h - EDGE) dy = MAX * (1 - (h - DRAG.py) / EDGE);
    if (dy) {
      window.scrollBy(0, dy);
      reorderAt(DRAG.px, DRAG.py);   // список сдвинулся — обновляем слот
    }
    DRAG.rafId = requestAnimationFrame(autoScroll);
  }

  function reorderAt(x, y) {
    for (const c of $$("#topicGrid .topic-card")) {
      if (c === DRAG.el || c.style.display === "none") continue;
      const b = c.getBoundingClientRect();
      if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
        grid.insertBefore(DRAG.ph, (y < b.top + b.height / 2) ? c : c.nextSibling);
        return;
      }
    }
  }

  // Пока идёт перетаскивание — запрещаем прокрутку страницы касанием
  // (для тач-экранов помогает только preventDefault на touchmove).
  const onTouchMove = (e) => { if (DRAG.on && e.cancelable) e.preventDefault(); };

  function stop() {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    document.removeEventListener("touchmove", onTouchMove);
    clearTimeout(DRAG.timer);
    cancelAnimationFrame(DRAG.rafId);
  }

  const onMove = (e) => {
    if (!DRAG.el) return;
    if (!DRAG.on) {
      const dist = Math.hypot(e.clientX - DRAG.sx, e.clientY - DRAG.sy);
      if (DRAG.ptype === "mouse") {
        if (dist > 7) activate();               // мышь: тянем сразу по сдвигу
      } else if (dist > 12) {                   // палец сдвинули до «долгого нажатия» → это прокрутка
        DRAG.el = null; stop();                 // отменяем — пусть страница листается
        return;
      }
      if (!DRAG.on) return;
    }
    if (e.cancelable) e.preventDefault();
    DRAG.px = e.clientX; DRAG.py = e.clientY;
    moveTo(e.clientX, e.clientY);               // карточка следует за пальцем
    reorderAt(e.clientX, e.clientY);            // слот встаёт на нужное место
  };

  const onUp = (e) => {
    stop();
    if (DRAG.on && DRAG.el) {
      const el = DRAG.el, ph = DRAG.ph;
      const gb = grid.getBoundingClientRect();
      const inside = e.clientX >= gb.left && e.clientX <= gb.right && e.clientY >= gb.top && e.clientY <= gb.bottom;
      el.classList.remove("dragging");
      el.style.position = ""; el.style.left = ""; el.style.top = ""; el.style.width = ""; el.style.margin = ""; el.style.transform = "";
      if (inside && ph && ph.parentNode) ph.parentNode.insertBefore(el, ph);   // встаёт в слот
      else grid.insertBefore(el, DRAG.startNext);                              // за пределами — на прежнее место
      if (ph) ph.remove();
      document.body.classList.remove("drag-lock");
      if (inside) saveTopicOrder();
      clearTimeout(DRAG.clr);
      DRAG.clr = setTimeout(() => { DRAG.suppress = false; }, 300);
    }
    DRAG.on = false; DRAG.el = null; DRAG.ph = null;
  };

  grid.addEventListener("pointerdown", (e) => {
    if (e.button != null && e.button > 0) return;   // только левая кнопка
    const card = e.target.closest(".topic-card");
    if (!card) return;
    DRAG.el = card; DRAG.on = false;
    DRAG.sx = e.clientX; DRAG.sy = e.clientY;
    DRAG.ptype = e.pointerType || "mouse";
    DRAG.startNext = card.nextSibling;
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    if (DRAG.ptype !== "mouse") DRAG.timer = setTimeout(activate, 240);   // телефон: долгое нажатие
  });
}

/* Поиск (фильтр) тем по названию и описанию */
function filterTopics() {
  const q = ($("#topicSearch").value || "").trim().toLowerCase().replace(/ё/g, "е");
  // Ищем по основе слова, чтобы «море» находило «Моря», «гора» — «Горы» и т.п.
  const stem = q.length >= 4 ? q.slice(0, -1) : q;
  let shown = 0;
  $$("#topicGrid .topic-card").forEach((card) => {
    const match = !q || card.dataset.search.includes(stem);
    card.style.display = match ? "" : "none";
    if (match) shown++;
  });
  const empty = $("#topicEmpty");
  if (empty) empty.hidden = shown !== 0;
}

function renderStats() {
  const strip = $("#statsStrip");
  const totalQ = TOPIC_ORDER.reduce((s, id) => s + TOPICS[id].questions.length, 0);
  const plays = TOPIC_ORDER.reduce((s, id) => s + Store.topicStat(id).plays, 0);
  strip.innerHTML = `
    <div class="stat"><b>${totalQ}</b><span>всего вопросов</span></div>
    <div class="stat"><b>${plays}</b><span>пройдено тренировок</span></div>
    <div class="stat"><b>${Store.data.points || 0}</b><span>очки ⭐</span></div>`;
}

function startTopic(id) {
  const list = buildQuiz([id]);
  // Вопросы с картинками ставим в начало, чтобы их всегда было видно
  const withPic = list.filter((q) => q.img);
  const rest = list.filter((q) => !q.img);
  const ordered = withPic.concat(rest);
  Quiz.topicId = id;
  Quiz.start(ordered, TOPICS[id].title, "topic");
}

function startExam() {
  const list = buildQuiz(TOPIC_ORDER, 20);
  Quiz.topicId = null;
  Quiz.start(list, "Экзамен", "exam");
}

/* ---------- Экран фактов ---------- */
let factsTopic = "oceans";
function renderFacts() {
  const tabs = $("#factsTabs");
  tabs.innerHTML = "";
  TOPIC_ORDER.forEach((id) => {
    const t = TOPICS[id];
    const b = document.createElement("button");
    b.className = "facts-tab" + (id === factsTopic ? " active" : "");
    b.style.setProperty("--accent", t.color);
    b.innerHTML = `${t.icon} ${t.title}`;
    b.addEventListener("click", () => { factsTopic = id; renderFacts(); });
    tabs.appendChild(b);
  });

  const t = TOPICS[factsTopic];
  const list = $("#factsList");
  list.innerHTML = "";
  t.facts.forEach((f, i) => {
    const card = document.createElement("div");
    card.className = "fact-card";
    card.style.setProperty("--accent", t.color);
    card.style.animationDelay = (i * 40) + "ms";
    card.innerHTML = `<span class="fact-num">${i + 1}</span><p>${f}</p>`;
    list.appendChild(card);
  });

  const start = document.createElement("button");
  start.className = "primary-btn full";
  start.textContent = `Тренироваться: ${t.title} ${t.icon}`;
  start.addEventListener("click", () => startTopic(factsTopic));
  list.appendChild(start);
}

/* ---------- Тема оформления ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("#themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
  Store.data.theme = theme;
  Store.save();
}

/* ---------- Цвет фона (палитры) ---------- */
const PALETTES = [
  { id: "ocean",    name: "Небо",    light: "#dfeaff", dark: "#0b1220" },
  { id: "mint",     name: "Мята",    light: "#d5f2e2", dark: "#0a1a14" },
  { id: "lavender", name: "Сирень",  light: "#e7dcfb", dark: "#140e22" },
  { id: "peach",    name: "Персик",  light: "#fbe0d6", dark: "#1f1012" },
  { id: "honey",    name: "Мёд",     light: "#fbeecb", dark: "#1b1608" },
  { id: "graphite", name: "Графит",  light: "#e3e7ef", dark: "#0e1013" },
];

function applyPalette(id) {
  if (!PALETTES.some((p) => p.id === id)) id = "ocean";
  document.documentElement.setAttribute("data-palette", id);
  Store.data.palette = id;
  Store.save();
  $$("#ppGrid .pp-swatch").forEach((el) => el.classList.toggle("active", el.dataset.id === id));
}

function buildPalette() {
  const grid = $("#ppGrid");
  if (!grid) return;
  grid.innerHTML = "";
  PALETTES.forEach((p) => {
    const b = document.createElement("button");
    b.className = "pp-swatch" + (p.id === Store.data.palette ? " active" : "");
    b.type = "button";
    b.dataset.id = p.id;
    b.title = p.name;
    b.innerHTML = `<span class="pp-dot" style="background:linear-gradient(135deg, ${p.light} 0 50%, ${p.dark} 50% 100%)"></span><span class="pp-name">${p.name}</span>`;
    b.addEventListener("click", () => {
      applyPalette(p.id);
      $("#palettePop").hidden = true;
    });
    grid.appendChild(b);
  });
}

/* ---------- Инициализация ---------- */
function init() {
  Store.load();
  applyTheme(Store.data.theme || "dark");
  buildPalette();
  applyPalette(Store.data.palette || "ocean");
  $("#totalPoints").textContent = Store.data.points || 0;
  renderHome();
  setupDragReorder();
  const resetBtn = $("#resetOrderBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetTopicOrder);
  const sortBtn = $("#sortProgressBtn");
  if (sortBtn) sortBtn.addEventListener("click", sortTopicsByProgress);

  const search = $("#topicSearch");
  if (search) search.addEventListener("input", filterTopics);

  $("#examBtn").addEventListener("click", startExam);
  $("#factsBtn").addEventListener("click", () => { renderFacts(); showScreen("facts"); });
  $("#nextBtn").addEventListener("click", () => Quiz.next());
  $("#retryBtn").addEventListener("click", () => {
    if (Quiz.mode === "exam") startExam();
    else if (Quiz.topicId) startTopic(Quiz.topicId);
    else showScreen("home");
  });
  $("#quitBtn").addEventListener("click", () => {
    if (confirm("Выйти из тренировки? Прогресс этого квиза не сохранится.")) {
      Quiz.stopTimer();
      renderHome();
      showScreen("home");
    }
  });

  const timeToggle = $("#timeToggle");
  if (timeToggle) {
    const chips = $$("#toChips .to-chip");
    const paintChips = () => {
      const sec = Store.data.qtime || 20;
      chips.forEach((c) => c.classList.toggle("on", Number(c.dataset.sec) === sec));
    };
    const paintToggle = () => {
      const on = !!Store.data.timed;
      timeToggle.classList.toggle("on", on);
      timeToggle.setAttribute("aria-pressed", on ? "true" : "false");
      $("#timeState").textContent = on ? "Вкл" : "Выкл";
      $("#timeOpts").hidden = !on;            // выбор секунд — только когда режим включён
    };
    paintChips();
    paintToggle();
    timeToggle.addEventListener("click", () => {
      Store.data.timed = !Store.data.timed;
      Store.save();
      paintToggle();
    });
    chips.forEach((c) => c.addEventListener("click", () => {
      Store.data.qtime = Number(c.dataset.sec);
      Store.save();
      paintChips();
    }));
  }
  $("#themeBtn").addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  const soundBtn = $("#soundBtn");
  if (soundBtn) {
    const paintSound = () => { soundBtn.textContent = Store.data.sound === false ? "🔇" : "🔊"; };
    paintSound();
    soundBtn.addEventListener("click", () => {
      Store.data.sound = Store.data.sound === false ? true : false;
      Store.save();
      paintSound();
      if (Store.data.sound) Sound.correct();     // короткий пример при включении
    });
  }

  const palBtn = $("#paletteBtn"), palPop = $("#palettePop");
  if (palBtn && palPop) {
    palBtn.addEventListener("click", (e) => { e.stopPropagation(); palPop.hidden = !palPop.hidden; });
    document.addEventListener("click", (e) => {
      if (!palPop.hidden && !palPop.contains(e.target) && e.target !== palBtn) palPop.hidden = true;
    });
  }

  $$("[data-nav]").forEach((b) =>
    b.addEventListener("click", () => { renderHome(); showScreen(b.dataset.nav); })
  );

  // Клавиатура: 1-4 для ответа, Enter для «Дальше»
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-quiz").classList.contains("active")) return;
    if (["1", "2", "3", "4"].includes(e.key)) {
      const btns = $$("#qOptions .opt");
      const idx = Number(e.key) - 1;
      if (btns[idx] && !Quiz.answered) btns[idx].click();
    } else if (e.key === "Enter" && !$("#nextBtn").disabled) {
      Quiz.next();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
