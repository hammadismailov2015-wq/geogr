/* ==========================================================================
   МАТЕМАТИКА · 6 КЛАСС — логика
   Навигация между экранами, выбор режима (объяснение / тренажёр),
   вывод теории и тренажёр с ВВОДОМ ответа + кнопкой «Проверить».
   ========================================================================== */

(function () {
  "use strict";

  var TOPICS = window.MATH_TOPICS || [];

  var $ = function (id) { return document.getElementById(id); };
  var screens = {
    home: $("screen-home"),
    mode: $("screen-mode"),
    theory: $("screen-theory"),
    quiz: $("screen-quiz"),
    result: $("screen-result"),
  };

  // --- Состояние ---
  var current = null;      // текущая тема
  var quizList = [];       // вопросы текущего теста (каждый с полем .topic)
  var order = [];          // порядок примеров
  var idx = 0;             // индекс текущего примера
  var correct = 0;         // верных в текущем тесте
  var answered = false;    // проверен ли текущий пример
  var examMode = false;    // идёт экзамен по всем темам?
  var sessionTitle = "";   // подпись теста (тема или «Экзамен»)
  var totalScore = loadScore();

  $("totalScore").textContent = totalScore;

  /* ---------- Навигация ---------- */
  function show(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("active", k === name);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- Очки ---------- */
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
      else if (block.t === "img") {
        el = document.createElement("figure");
        el.className = "th-figure";
        var svgMarkup = (typeof window.mathPic === "function") ? window.mathPic(block.k) : "";
        el.innerHTML = svgMarkup + (block.cap ? '<figcaption class="th-cap"></figcaption>' : "");
        if (block.cap) el.querySelector(".th-cap").textContent = block.cap;
      }
      else { el = document.createElement("p"); el.textContent = block.x; }
      body.appendChild(el);
    });
    show("theory");
  }

  /* ---------- Тренажёр по теме ---------- */
  function startQuiz() {
    if (!current) return;
    examMode = false;
    sessionTitle = current.title;
    quizList = current.questions.map(function (q) {
      return { q: q.q, a: q.a, accept: q.accept, hint: q.hint, explain: q.explain, topic: current.title };
    });
    beginQuiz();
  }

  /* ---------- Экзамен по всем темам ---------- */
  function startExam() {
    examMode = true;
    sessionTitle = "Экзамен";
    // Собираем по одному-двум вопросам из каждой темы, затем перемешиваем
    var pool = [];
    TOPICS.forEach(function (topic) {
      var qs = topic.questions.slice();
      shuffle(qs);
      qs.slice(0, 1).forEach(function (q) {
        pool.push({ q: q.q, a: q.a, accept: q.accept, hint: q.hint, explain: q.explain, topic: topic.title });
      });
    });
    shuffle(pool);
    quizList = pool.slice(0, 20); // 20 вопросов на экзамене
    beginQuiz();
  }

  function beginQuiz() {
    order = quizList.map(function (_, i) { return i; });
    shuffle(order);
    idx = 0;
    correct = 0;
    $("quizScore").textContent = "0";
    show("quiz");
    renderQuestion();
  }

  function renderQuestion() {
    answered = false;
    var q = quizList[order[idx]];
    $("qTopic").textContent = q.topic || sessionTitle;
    $("qText").textContent = q.q;
    $("qCount").textContent = (idx + 1) + " / " + order.length;
    $("qbarFill").style.width = (idx / order.length) * 100 + "%";
    $("nextBtn").disabled = true;
    $("nextBtn").textContent = idx + 1 < order.length ? "Дальше →" : "Итоги →";

    var exp = $("qExplain");
    exp.hidden = true;
    exp.className = "q-explain";
    exp.innerHTML = "";

    // Поле ввода + кнопка «Проверить»
    var box = $("qOptions");
    box.innerHTML = "";

    var row = document.createElement("div");
    row.className = "answer-row";

    var input = document.createElement("input");
    input.type = "text";
    input.className = "answer-input";
    input.id = "answerInput";
    input.autocomplete = "off";
    input.setAttribute("autocapitalize", "off");
    input.placeholder = q.hint ? q.hint : "Ваш ответ";
    // Для числовых ответов показываем цифровую клавиатуру
    if (!q.hint || /чис|град|раз|рубл|см|м\)|цифр/i.test(q.hint)) {
      input.setAttribute("inputmode", "decimal");
    }
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); onCheck(); }
    });

    var btn = document.createElement("button");
    btn.className = "check-btn";
    btn.id = "checkBtn";
    btn.textContent = "Проверить";
    btn.addEventListener("click", onCheck);

    row.appendChild(input);
    row.appendChild(btn);
    box.appendChild(row);

    if (q.hint) {
      var hint = document.createElement("div");
      hint.className = "answer-hint";
      hint.textContent = "Формат: " + q.hint;
      box.appendChild(hint);
    }

    // Кнопка «Правильный ответ» — показать ответ и решение
    var reveal = document.createElement("button");
    reveal.className = "reveal-btn";
    reveal.id = "revealBtn";
    reveal.type = "button";
    reveal.innerHTML = "🔑 Правильный ответ";
    reveal.addEventListener("click", revealAnswer);
    box.appendChild(reveal);

    input.focus();
  }

  function revealAnswer() {
    if (answered) return;
    answered = true;
    var q = quizList[order[idx]];

    var input = $("answerInput");
    input.value = q.a;
    input.readOnly = true;
    input.classList.add("reveal");
    $("checkBtn").disabled = true;
    var rb = $("revealBtn");
    if (rb) rb.disabled = true;

    var exp = $("qExplain");
    exp.className = "q-explain reveal";
    exp.innerHTML = "<b>Правильный ответ:</b> <b>" + q.a + "</b>. " + (q.explain || "");
    exp.hidden = false;

    $("nextBtn").disabled = false;
    $("nextBtn").focus();
  }

  function onCheck() {
    if (answered) return;
    var input = $("answerInput");
    var val = input.value;
    if (!val.trim()) { input.focus(); return; }

    answered = true;
    var q = quizList[order[idx]];
    var right = checkAnswer(val, q);

    input.readOnly = true;
    input.classList.add(right ? "ok" : "no");
    $("checkBtn").disabled = true;
    var rb = $("revealBtn");
    if (rb) rb.disabled = true;

    if (right) {
      correct++;
      totalScore++;
      saveScore();
      $("quizScore").textContent = correct;
    }

    var exp = $("qExplain");
    exp.className = "q-explain " + (right ? "ok" : "no");
    var head = right ? "<b>Верно!</b> " : ("<b>Не верно.</b> Правильный ответ: <b>" + q.a + "</b>. ");
    exp.innerHTML = head + (q.explain || "");
    exp.hidden = false;

    $("nextBtn").disabled = false;
    $("nextBtn").focus();
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

  /* ---------- Проверка ответа ----------
     Понимает: числа (5), десятичные (3,14 / 3.14), дроби (3/5),
     смешанные числа (2 1/2), произведения (2·2·3), а также слова. */
  function checkAnswer(user, q) {
    var cands = [q.a].concat(q.accept || []);
    for (var i = 0; i < cands.length; i++) {
      if (equalAnswer(user, cands[i])) return true;
    }
    return false;
  }

  function equalAnswer(u, c) {
    // 1) Совпадение как строк (слова, названия)
    if (normStr(u) === normStr(c)) return true;
    // 2) Числа / дроби / смешанные числа — сравниваем как рациональные
    var fu = parseFrac(u), fc = parseFrac(c);
    if (fu && fc) return fu[0] * fc[1] === fc[0] * fu[1];
    // 3) Произведения множителей — сравниваем как наборы чисел
    var pu = parseProduct(u), pc = parseProduct(c);
    if (pu && pc) return sameNums(pu, pc);
    return false;
  }

  function normStr(s) {
    return String(s).toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[.,;!]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Разбор числа / дроби / смешанного числа → [числитель, знаменатель] или null
  function parseFrac(s) {
    var t = String(s).trim().replace(",", ".");
    var m;
    // смешанное число: "2 1/2"
    m = t.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
    if (m) {
      var w = parseInt(m[1], 10), n = parseInt(m[2], 10), d = parseInt(m[3], 10);
      if (d === 0) return null;
      var sign = w < 0 ? -1 : 1;
      return [sign * (Math.abs(w) * d + n), d];
    }
    // обыкновенная дробь: "3/5"
    m = t.match(/^(-?\d+)\/(\d+)$/);
    if (m) {
      var d2 = parseInt(m[2], 10);
      if (d2 === 0) return null;
      return [parseInt(m[1], 10), d2];
    }
    // целое: "7"
    m = t.match(/^-?\d+$/);
    if (m) return [parseInt(t, 10), 1];
    // десятичное: "3.14"
    m = t.match(/^(-?)(\d+)\.(\d+)$/);
    if (m) {
      var whole = m[2], frac = m[3];
      var den = Math.pow(10, frac.length);
      var num = parseInt(whole + frac, 10);
      return [(m[1] === "-" ? -1 : 1) * num, den];
    }
    return null;
  }

  // Разбор произведения "2·2·3" (или через * x х) → массив чисел или null
  function parseProduct(s) {
    var t = String(s).trim().toLowerCase().replace(/[·×xх*]/g, "*").replace(/\s+/g, "");
    if (t.indexOf("*") === -1) return null;
    var parts = t.split("*");
    var nums = [];
    for (var i = 0; i < parts.length; i++) {
      if (!/^\d+$/.test(parts[i])) return null;
      nums.push(parseInt(parts[i], 10));
    }
    return nums.length >= 2 ? nums : null;
  }

  function sameNums(a, b) {
    if (a.length !== b.length) return false;
    var x = a.slice().sort(function (p, q) { return p - q; });
    var y = b.slice().sort(function (p, q) { return p - q; });
    for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
    return true;
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

    var where = examMode ? "по всем темам" : "тему «" + sessionTitle + "»";
    var badge, title, msg;
    if (pct === 100) { badge = "🏆"; title = "Идеально!"; msg = "Все ответы верные — ты отлично знаешь " + where + "!"; }
    else if (pct >= 80) { badge = "🎉"; title = "Отлично!"; msg = "Почти всё верно. Ещё немного — и будет идеально."; }
    else if (pct >= 50) { badge = "👍"; title = "Неплохо!"; msg = "Хороший результат. Повтори темы, где ошибся, и попробуй снова."; }
    else { badge = "📚"; title = "Стоит повторить"; msg = "Загляни в объяснения тем и пройди ещё раз."; }
    $("resultBadge").textContent = badge;
    $("resultTitle").textContent = title;
    $("resultMsg").textContent = msg;

    // Кнопку «Читать объяснение» показываем только для тренажёра по теме
    var toTheory = $("resultToTheory");
    if (toTheory) toTheory.hidden = examMode;

    // Заголовок «Пройти ещё раз» для экзамена
    var retry = $("retryBtn");
    if (retry) retry.textContent = examMode ? "Сдать ещё раз" : "Пройти ещё раз";
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

  var examBtn = $("examBtn");
  if (examBtn) examBtn.addEventListener("click", startExam);

  $("quizQuit").addEventListener("click", function () { show(examMode ? "home" : "mode"); });
  $("nextBtn").addEventListener("click", nextQuestion);
  $("retryBtn").addEventListener("click", function () { examMode ? startExam() : startQuiz(); });
  $("resultToTheory").addEventListener("click", openTheory);

  document.querySelectorAll('[data-nav="home"]').forEach(function (b) {
    b.addEventListener("click", function () { show("home"); });
  });

  // Enter на экране тренажёра — «Дальше», когда пример уже проверен
  document.addEventListener("keydown", function (e) {
    if (!screens.quiz.classList.contains("active")) return;
    if (e.key === "Enter" && answered && !$("nextBtn").disabled) nextQuestion();
  });

  /* ---------- Старт ---------- */
  initTheme();
  renderTopics("");
})();
