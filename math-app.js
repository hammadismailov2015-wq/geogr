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
  var timedMode = false;   // отвечать на время?
  var timeLimit = 10;      // секунд на пример
  var timerId = null;      // id таймера
  var timeLeft = 0;        // осталось секунд
  var totalScore = loadScore();

  $("totalScore").textContent = totalScore;

  /* ---------- Красивый вывод дробей ----------
     Превращает "1/2" в настоящую дробь (числитель над знаменателем),
     а "1 1/2" — в смешанное число. Остальной текст не трогает. */
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function fracHtml(n, d) {
    return '<span class="frac"><span class="fr-n">' + n + '</span>' +
      '<span class="fr-bar"></span><span class="fr-d">' + d + "</span></span>";
  }
  function formatMath(str) {
    var s = escapeHtml(str);
    // смешанное число: "1 1/2" → 1 и дробь рядом
    s = s.replace(/(\d+)\s+(\d+)\/(\d+)/g, function (m, w, n, d) {
      return '<span class="mixed">' + w + fracHtml(n, d) + "</span>";
    });
    // обыкновенная дробь: "3/4"
    s = s.replace(/(\d+)\/(\d+)/g, function (m, n, d) { return fracHtml(n, d); });
    return s;
  }

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
      else if (block.t === "f") { el = document.createElement("div"); el.className = "th-formula"; el.innerHTML = formatMath(block.x); }
      else if (block.t === "ex") { el = document.createElement("div"); el.className = "th-example"; el.innerHTML = formatMath(block.x); }
      else if (block.t === "img") {
        el = document.createElement("figure");
        el.className = "th-figure";
        var svgMarkup = (typeof window.mathPic === "function") ? window.mathPic(block.k) : "";
        el.innerHTML = svgMarkup + (block.cap ? '<figcaption class="th-cap"></figcaption>' : "");
        if (block.cap) el.querySelector(".th-cap").textContent = block.cap;
      }
      else { el = document.createElement("p"); el.innerHTML = formatMath(block.x); }
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
    $("qText").innerHTML = formatMath(q.q);
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
      hint.innerHTML = "Формат: " + formatMath(q.hint);
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
    startTimer();
  }

  function revealAnswer() {
    if (answered) return;
    answered = true;
    stopTimer();
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
    exp.innerHTML = "<b>Правильный ответ:</b> <b>" + formatMath(q.a) + "</b>. " + formatMath(q.explain || "");
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
    stopTimer();
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
      playCorrect();
    } else {
      playWrong();
    }

    var exp = $("qExplain");
    exp.className = "q-explain " + (right ? "ok" : "no");
    var head = right ? "<b>Верно!</b> " : ("<b>Не верно.</b> Правильный ответ: <b>" + formatMath(q.a) + "</b>. ");
    exp.innerHTML = head + formatMath(q.explain || "");
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
    stopTimer();
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

  /* ---------- Звуки ---------- */
  var audioCtx = null;
  var soundOn = true;

  function initSound() {
    try { soundOn = localStorage.getItem("math6_sound") !== "0"; } catch (e) {}
    updateSoundIcon();
  }
  function updateSoundIcon() {
    var btn = $("soundBtn");
    if (btn) btn.textContent = soundOn ? "🔊" : "🔇";
  }
  function toggleSound() {
    soundOn = !soundOn;
    try { localStorage.setItem("math6_sound", soundOn ? "1" : "0"); } catch (e) {}
    updateSoundIcon();
    if (soundOn) playCorrect(); // короткий сигнал-подтверждение
  }
  function ensureCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    }
    if (audioCtx && audioCtx.state === "suspended") { try { audioCtx.resume(); } catch (e) {} }
    return audioCtx;
  }
  // Один «пик» заданной частоты
  function beep(freq, startAt, dur, type) {
    var ctx = ensureCtx();
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    var t = ctx.currentTime + startAt;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  function playCorrect() {
    if (!soundOn) return;
    beep(660, 0, 0.13, "sine");     // ми
    beep(880, 0.10, 0.18, "sine");  // ля (выше — «получилось!»)
  }
  function playWrong() {
    if (!soundOn) return;
    beep(196, 0, 0.30, "sawtooth");  // низкий
    beep(146, 0.12, 0.30, "sawtooth"); // ещё ниже — «неа»
  }

  /* ---------- Режим на время ---------- */
  function initTimeControls() {
    try { timedMode = localStorage.getItem("math6_timed") === "1"; } catch (e) {}
    try { timeLimit = parseInt(localStorage.getItem("math6_timelimit") || "10", 10) || 10; } catch (e) {}
    updateTimeUI();
    var chips = $("toChips");
    if (chips) chips.querySelectorAll(".to-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        timeLimit = parseInt(chip.getAttribute("data-sec"), 10);
        try { localStorage.setItem("math6_timelimit", String(timeLimit)); } catch (e) {}
        updateChips();
      });
    });
    var tog = $("timeToggle");
    if (tog) tog.addEventListener("click", function () {
      timedMode = !timedMode;
      try { localStorage.setItem("math6_timed", timedMode ? "1" : "0"); } catch (e) {}
      updateTimeUI();
    });
  }
  function updateChips() {
    var chips = $("toChips");
    if (chips) chips.querySelectorAll(".to-chip").forEach(function (chip) {
      chip.classList.toggle("on", parseInt(chip.getAttribute("data-sec"), 10) === timeLimit);
    });
  }
  function updateTimeUI() {
    var tog = $("timeToggle");
    if (!tog) return;
    tog.classList.toggle("on", timedMode);
    tog.setAttribute("aria-pressed", timedMode ? "true" : "false");
    $("timeState").textContent = timedMode ? "Вкл" : "Выкл";
    $("timeOpts").hidden = !timedMode;
    updateChips();
  }

  function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
  }
  function startTimer() {
    stopTimer();
    var box = $("quizTimer"), num = $("timerNum");
    if (!timedMode) { if (box) box.hidden = true; return; }
    timeLeft = timeLimit;
    if (box) { box.hidden = false; box.classList.remove("low"); }
    if (num) num.textContent = timeLeft;
    timerId = setInterval(function () {
      timeLeft--;
      if (num) num.textContent = Math.max(0, timeLeft);
      if (box) box.classList.toggle("low", timeLeft <= 3);
      if (timeLeft <= 0) { stopTimer(); onTimeUp(); }
    }, 1000);
  }
  function onTimeUp() {
    if (answered) return;
    answered = true;
    var q = quizList[order[idx]];
    var input = $("answerInput");
    if (input) { input.readOnly = true; input.classList.add("no"); }
    var cb = $("checkBtn"); if (cb) cb.disabled = true;
    var rb = $("revealBtn"); if (rb) rb.disabled = true;
    var exp = $("qExplain");
    exp.className = "q-explain no";
    exp.innerHTML = "<b>⏰ Время вышло!</b> Правильный ответ: <b>" + formatMath(q.a) + "</b>. " + formatMath(q.explain || "");
    exp.hidden = false;
    playWrong();
    $("nextBtn").disabled = false;
    $("nextBtn").focus();
  }

  /* ---------- Утилиты ---------- */
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- Палитра (цвет оформления) ---------- */
  var PALETTES = [
    { id: "indigo",   name: "Индиго", dot: "linear-gradient(135deg,#6366f1,#8b5cf6)" },
    { id: "ocean",    name: "Океан",  dot: "linear-gradient(135deg,#3b82f6,#06b6d4)" },
    { id: "mint",     name: "Мята",   dot: "linear-gradient(135deg,#10b981,#22c55e)" },
    { id: "rose",     name: "Роза",   dot: "linear-gradient(135deg,#f43f5e,#ec4899)" },
    { id: "amber",    name: "Янтарь", dot: "linear-gradient(135deg,#f59e0b,#f97316)" },
    { id: "graphite", name: "Графит", dot: "linear-gradient(135deg,#64748b,#475569)" },
  ];

  function currentPalette() {
    try { return localStorage.getItem("math6_palette") || "indigo"; }
    catch (e) { return "indigo"; }
  }
  function applyPalette(id) {
    document.documentElement.setAttribute("data-palette", id);
    try { localStorage.setItem("math6_palette", id); } catch (e) {}
    var grid = $("ppGrid");
    if (grid) grid.querySelectorAll(".pp-swatch").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-pal") === id);
    });
  }
  function initPalette() {
    var active = currentPalette();
    document.documentElement.setAttribute("data-palette", active);
    var grid = $("ppGrid");
    if (grid) {
      grid.innerHTML = "";
      PALETTES.forEach(function (p) {
        var b = document.createElement("button");
        b.className = "pp-swatch" + (p.id === active ? " active" : "");
        b.setAttribute("data-pal", p.id);
        b.innerHTML = '<span class="pp-dot" style="background:' + p.dot + '"></span>' +
          '<span class="pp-name">' + p.name + "</span>";
        b.addEventListener("click", function () { applyPalette(p.id); closePalette(); });
        grid.appendChild(b);
      });
    }
  }
  function togglePalette() {
    var pop = $("palettePop");
    if (pop) pop.hidden = !pop.hidden;
  }
  function closePalette() {
    var pop = $("palettePop");
    if (pop) pop.hidden = true;
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
  var soundBtn = $("soundBtn");
  if (soundBtn) soundBtn.addEventListener("click", toggleSound);

  var paletteBtn = $("paletteBtn");
  if (paletteBtn) paletteBtn.addEventListener("click", function (e) { e.stopPropagation(); togglePalette(); });
  // Закрывать палитру по клику вне её
  document.addEventListener("click", function (e) {
    var wrap = document.querySelector(".palette-wrap");
    if (wrap && !wrap.contains(e.target)) closePalette();
  });

  $("goTheory").addEventListener("click", openTheory);
  $("goTrainer").addEventListener("click", startQuiz);
  $("theoryToTrainer").addEventListener("click", startQuiz);
  $("theoryBack").addEventListener("click", function () { show("mode"); });

  var examBtn = $("examBtn");
  if (examBtn) examBtn.addEventListener("click", startExam);

  $("quizQuit").addEventListener("click", function () { stopTimer(); show(examMode ? "home" : "mode"); });
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
  initPalette();
  initTimeControls();
  initSound();
  renderTopics("");
})();
