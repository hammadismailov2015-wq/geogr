/* ==========================================================================
   МАТЕМАТИКА · 6 КЛАСС — логика
   Навигация между экранами, выбор режима (объяснение / тренажёр),
   вывод теории, проведение теста и подсчёт результата.
   ========================================================================== */

(function () {
  "use strict";

  var TOPICS = window.MATH_TOPICS || [];

  // --- Ссылки на DOM ---
  var $ = function (id) { return document.getElementById(id); };
  var screens = {
    home: $("screen-home"),
    mode: $("screen-mode"),
    theory: $("screen-theory"),
    quiz: $("screen-quiz"),
    result: $("screen-result"),
  };

  // --- Состояние ---
  var current = null;       // текущая тема
  var order = [];           // порядок вопросов
  var idx = 0;              // индекс текущего вопроса
  var correct = 0;          // верных в текущем тесте
  var answered = false;     // отвечен ли текущий вопрос
  var totalScore = loadScore();

  $("totalScore").textContent = totalScore;

  /* ---------- Навигация ---------- */
  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("active", k === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Тема ---------- */
  function loadScore() {
    try { return parseInt(localStorage.getItem("math6_score") || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function saveScore() {
    try { localStorage.setItem("math6_score", String(totalScore)); } catch (e) {}
    $("totalScore").textContent = totalScore;
  }

  /* ---------- Главная: сетка тем ---------- */
  function renderTopics(filter) {
    var grid = $("topicGrid");
    var empty = $("topicEmpty");
    grid.innerHTML = "";
    var q = (filter || "").trim().toLowerCase();
    var shown = 0;

    TOPICS.forEach(function (topic, i) {
      if (q && (topic.title + " " + topic.desc).toLowerCase().indexOf(q) === -1) return;
      shown++;
      var card = document.createElement("button");
      card.className = "topic-card";
      card.innerHTML =
        '<div class="tc-top">' +
          '<span class="tc-ico">' + topic.icon + "</span>" +
          '<span class="tc-num">№' + (i + 1) + "</span>" +
        "</div>" +
        '<div class="tc-title">' + topic.title + "</div>" +
        '<div class="tc-desc">' + topic.desc + "</div>";
      card.addEventListener("click", function () { openMode(topic); });
      grid.appendChild(card);
    });

    empty.hidden = shown !== 0;
  }

  /* ---------- Экран выбора режима ---------- */
  function openMode(topic) {
    current = topic;
    $("modeIco").textContent = topic.icon;
    $("modeTitle").textContent = topic.title;
    $("modeDesc").textContent = topic.desc;
    show("mode");
  }

  /* ---------- Объяснение темы ---------- */
  function openTheory() {
    if (!current) return;
    $("theoryTitle").textContent = current.title;
    var body = $("theoryBody");
    body.innerHTML = "";
    (current.theory || []).forEach(function (block) {
      var el;
      if (block.t === "h") { el = document.createElement("h3"); el.textContent = block.x; }
      else if (block.t === "f") { el = document.createElement("div"); el.className = "th-formula"; el.textContent = block.x; }
      else if (block.t === "ex") { el = document.createElement("div"); el.className = "th-example"; el.textContent = block.x; }
      else { el = document.createElement("p"); el.textContent = block.x; }
      body.appendChild(el);
    });
    show("theory");
  }

  /* ---------- Тренажёр ---------- */
  function startQuiz() {
    if (!current) return;
    order = current.questions.map(function (_, i) { return i; });
    shuffle(order);
    idx = 0;
    correct = 0;
    $("quizScore").textContent = "0";
    $("qTopic").textContent = current.title;
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    var q = current.questions[order[idx]];
    $("qText").textContent = q.q;
    $("qCount").textContent = (idx + 1) + " / " + order.length;
    $("qbarFill").style.width = (idx / order.length) * 100 + "%";
    $("nextBtn").disabled = true;
    $("nextBtn").textContent = idx + 1 < order.length ? "Дальше →" : "Итоги →";
    var exp = $("qExplain");
    exp.hidden = true;
    exp.innerHTML = "";

    var opts = $("qOptions");
    opts.innerHTML = "";
    var keys = ["А", "Б", "В", "Г", "Д"];
    q.options.forEach(function (text, i) {
      var b = document.createElement("button");
      b.className = "opt";
      b.innerHTML = '<span class="opt-key">' + (keys[i] || i + 1) + "</span><span>" + text + "</span>";
      b.addEventListener("click", function () { choose(i, b, q); });
      opts.appendChild(b);
    });
  }

  function choose(i, btn, q) {
    if (answered) return;
    answered = true;
    var buttons = $("qOptions").querySelectorAll(".opt");
    buttons.forEach(function (b, bi) {
      b.classList.add("locked");
      if (bi === q.answer) b.classList.add("correct");
      else if (bi === i) b.classList.add("wrong");
      else b.classList.add("dim");
    });

    var right = i === q.answer;
    if (right) {
      correct++;
      totalScore++;
      saveScore();
      $("quizScore").textContent = correct;
    }

    var exp = $("qExplain");
    exp.innerHTML = (right ? "<b>Верно!</b> " : "<b>Не верно.</b> ") + (q.explain || "");
    exp.hidden = false;
    $("nextBtn").disabled = false;
  }

  function nextQuestion() {
    if (!answered) return;
    if (idx + 1 < order.length) {
      idx++;
      renderQuestion();
    } else {
      showResult();
    }
  }

  /* ---------- Результат ---------- */
  function showResult() {
    show("result");
    var total = order.length;
    var pct = Math.round((correct / total) * 100);
    $("resultScore").textContent = correct;
    $("resultTotal").textContent = total;
    $("ringPct").textContent = pct + "%";

    var ring = $("ring");
    var circ = 327;
    ring.style.strokeDashoffset = circ - (circ * pct) / 100;
    ring.style.stroke = pct >= 80 ? "var(--ok)" : pct >= 50 ? "var(--train)" : "var(--bad)";

    var badge, title, msg;
    if (pct === 100) { badge = "🏆"; title = "Идеально!"; msg = "Все ответы верные — ты отлично знаешь тему «" + current.title + "»."; }
    else if (pct >= 80) { badge = "🎉"; title = "Отлично!"; msg = "Почти всё верно. Ещё немного — и будет идеально."; }
    else if (pct >= 50) { badge = "👍"; title = "Неплохо!"; msg = "Хороший результат. Загляни в объяснение и попробуй снова."; }
    else { badge = "📚"; title = "Стоит повторить"; msg = "Прочитай объяснение темы и пройди тренажёр ещё раз."; }
    $("resultBadge").textContent = badge;
    $("resultTitle").textContent = title;
    $("resultMsg").textContent = msg;
  }

  /* ---------- Утилиты ---------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- Тема оформления ---------- */
  function initTheme() {
    var saved;
    try { saved = localStorage.getItem("math6_theme"); } catch (e) {}
    if (saved === "light") document.documentElement.classList.add("light");
    updateThemeIcon();
  }
  function updateThemeIcon() {
    var light = document.documentElement.classList.contains("light");
    $("themeBtn").textContent = light ? "☀️" : "🌙";
  }
  function toggleTheme() {
    document.documentElement.classList.toggle("light");
    var light = document.documentElement.classList.contains("light");
    try { localStorage.setItem("math6_theme", light ? "light" : "dark"); } catch (e) {}
    updateThemeIcon();
  }

  /* ---------- Обработчики ---------- */
  $("topicSearch").addEventListener("input", function (e) { renderTopics(e.target.value); });
  $("themeBtn").addEventListener("click", toggleTheme);

  $("goTheory").addEventListener("click", openTheory);
  $("goTrainer").addEventListener("click", startQuiz);
  $("theoryToTrainer").addEventListener("click", startQuiz);
  $("theoryBack").addEventListener("click", function () { show("mode"); });

  $("quizQuit").addEventListener("click", function () { show("mode"); });
  $("nextBtn").addEventListener("click", nextQuestion);
  $("retryBtn").addEventListener("click", startQuiz);
  $("resultToTheory").addEventListener("click", openTheory);

  // Кнопки с data-nav="home"
  document.querySelectorAll('[data-nav="home"]').forEach(function (b) {
    b.addEventListener("click", function () { show("home"); });
  });

  // Клавиатура: 1–5 выбор ответа, Enter — дальше
  document.addEventListener("keydown", function (e) {
    if (!screens.quiz.classList.contains("active")) return;
    if (e.key === "Enter" && !$("nextBtn").disabled) { nextQuestion(); return; }
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 5 && !answered) {
      var btn = $("qOptions").querySelectorAll(".opt")[n - 1];
      if (btn) btn.click();
    }
  });

  /* ---------- Старт ---------- */
  initTheme();
  renderTopics("");
})();
