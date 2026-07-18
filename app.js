/* ==========================================================================
   ЛОГИКА ТРЕНАЖЁРА
   ========================================================================== */
"use strict";

const STORE_KEY = "geo-trainer-v1";

/* ---------- Хранилище прогресса ---------- */
const Store = {
  data: { bestStreak: 0, topics: {}, theme: "dark" },
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
    showScreen("quiz");
    this.render();
  },

  render() {
    const item = this.list[this.index];
    this.answered = false;
    $("#qTopic").textContent = item.topic;
    $("#qText").textContent = item.q;
    $("#qCount").textContent = `${this.index + 1} / ${this.list.length}`;
    $("#quizScore").textContent = this.score;
    $("#qbarFill").style.width = `${(this.index / this.list.length) * 100}%`;

    const explain = $("#qExplain");
    explain.hidden = true;
    explain.textContent = "";

    const combo = $("#comboBox");
    combo.hidden = this.combo < 2;
    $("#comboNum").textContent = this.combo;

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
  },

  choose(i, btn) {
    if (this.answered) return;
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
      this.combo++;
      if (this.combo > Store.data.bestStreak) {
        Store.data.bestStreak = this.combo;
        $("#bestStreak").textContent = this.combo;
      }
    } else {
      btn.classList.add("wrong");
      this.combo = 0;
      const key = item.topic;
      this.wrongTopics[key] = (this.wrongTopics[key] || 0) + 1;
    }

    $("#quizScore").textContent = this.score;
    const combo = $("#comboBox");
    combo.hidden = this.combo < 2;
    $("#comboNum").textContent = this.combo;

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
    if (this.index < this.list.length - 1) {
      this.index++;
      this.render();
    } else {
      this.finish();
    }
  },

  finish() {
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
    if (pct === 100) { badge = "🏆"; title = "Идеально!"; msg = "Ты настоящий знаток планеты! Все ответы верны."; }
    else if (pct >= 80) { badge = "🌟"; title = "Отлично!"; msg = "Очень крепкие знания. Ещё чуть-чуть до совершенства."; }
    else if (pct >= 60) { badge = "👍"; title = "Хорошо!"; msg = "Неплохо! Повтори сложные темы и стань лучше."; }
    else if (pct >= 40) { badge = "📘"; title = "Есть над чем поработать"; msg = "Загляни в «Карточки-факты» и попробуй снова."; }
    else { badge = "🌱"; title = "Начало положено"; msg = "Не переживай! Изучи факты и возвращайся — получится!"; }

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

/* ---------- Отрисовка главной ---------- */
function renderHome() {
  const grid = $("#topicGrid");
  grid.innerHTML = "";
  TOPIC_ORDER.forEach((id) => {
    const t = TOPICS[id];
    const st = Store.topicStat(id);
    const card = document.createElement("button");
    card.className = "topic-card";
    card.style.setProperty("--accent", t.color);
    card.innerHTML = `
      <div class="tc-icon">${t.icon}</div>
      <div class="tc-body">
        <h3>${t.title}</h3>
        <p>${t.desc}</p>
        <div class="tc-meta">
          <span>${t.questions.length} вопросов</span>
          ${st.best ? `<span class="tc-best">Рекорд: ${st.best}%</span>` : `<span class="tc-new">Новая</span>`}
        </div>
      </div>
      <span class="tc-go">▶</span>`;
    card.addEventListener("click", () => startTopic(id));
    grid.appendChild(card);
  });
  renderStats();
}

function renderStats() {
  const strip = $("#statsStrip");
  const totalQ = TOPIC_ORDER.reduce((s, id) => s + TOPICS[id].questions.length, 0);
  const plays = TOPIC_ORDER.reduce((s, id) => s + Store.topicStat(id).plays, 0);
  strip.innerHTML = `
    <div class="stat"><b>${totalQ}</b><span>всего вопросов</span></div>
    <div class="stat"><b>${plays}</b><span>пройдено тренировок</span></div>
    <div class="stat"><b>${Store.data.bestStreak}</b><span>лучшая серия 🔥</span></div>`;
}

function startTopic(id) {
  const list = buildQuiz([id]);
  Quiz.topicId = id;
  Quiz.start(list, TOPICS[id].title, "topic");
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

/* ---------- Инициализация ---------- */
function init() {
  Store.load();
  applyTheme(Store.data.theme || "dark");
  $("#bestStreak").textContent = Store.data.bestStreak || 0;
  renderHome();

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
      renderHome();
      showScreen("home");
    }
  });
  $("#themeBtn").addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

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
