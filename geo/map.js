/* ==========================================================================
   ИГРА «НАЙДИ НА КАРТЕ»
   Настоящая карта мира (worldmap.svg, равнопромежуточная проекция) как фон.
   Поверх неё — невидимые кликабельные зоны материков/океанов и точки объектов,
   размещённые по реальным координатам (долгота/широта).
   Логика игры не зависит от quiz-части (app.js).
   ========================================================================== */
"use strict";

(function () {
  const W = 1000, H = 556; // размер холста карты (пропорции worldmap.svg)

  // Перевод долготы/широты в координаты карты (проекция линейная):
  const projX = (lon) => ((lon + 180) / 360) * W;
  const projY = (lat) => 286 - lat * 3.2;

  // --- Материки: контуры заданы по долготе/широте (потом переводятся в пиксели) ---
  const CONTINENTS = [
    { id: "na", name: "Северная Америка", ll: [[-168,66],[-125,70],[-80,72],[-55,60],[-52,45],[-78,24],[-105,15],[-125,30],[-160,55]] },
    { id: "sa", name: "Южная Америка", ll: [[-82,10],[-60,12],[-35,-5],[-35,-23],[-55,-40],[-70,-55],[-75,-40],[-82,-5]] },
    { id: "eu", name: "Европа", ll: [[-10,58],[-10,43],[5,36],[28,36],[40,46],[40,60],[30,71],[5,62]] },
    { id: "af", name: "Африка", ll: [[-18,35],[10,37],[35,32],[52,12],[50,-10],[35,-35],[18,-35],[10,-18],[-5,5],[-18,20]] },
    { id: "as", name: "Азия", ll: [[42,46],[60,78],[120,75],[180,68],[180,50],[140,35],[122,12],[95,5],[78,8],[60,25],[46,14],[42,30]] },
    { id: "au", name: "Австралия", ll: [[113,-11],[133,-11],[154,-20],[150,-38],[130,-33],[115,-35],[112,-22]] },
    { id: "an", name: "Антарктида", ll: [[-180,-63],[180,-63],[180,-88],[-180,-88]] },
  ];

  // --- Океаны: кликабельные зоны в открытой воде ---
  const OCEANS = [
    { id: "pac", name: "Тихий", ll: [[-160,40],[-100,40],[-100,-30],[-160,-30]] },
    { id: "atl", name: "Атлантический", ll: [[-48,48],[-18,48],[-18,-32],[-48,-32]] },
    { id: "ind", name: "Индийский", ll: [[58,2],[95,2],[95,-35],[58,-35]] },
    { id: "arc", name: "Северный Ледовитый", ll: [[-160,78],[150,78],[150,86],[-160,86]] },
    { id: "sou", name: "Южный", ll: [[-150,-56],[150,-56],[150,-62],[-150,-62]] },
  ];

  // --- Точечные объекты по реальным координатам [долгота, широта] ---
  const FEATURES = [
    { id: "nil",   type: "river",     name: "Нил",                lon: 32,   lat: 22 },
    { id: "amaz",  type: "river",     name: "Амазонка",           lon: -60,  lat: -3 },
    { id: "volga", type: "river",     name: "Волга",              lon: 47,   lat: 49 },
    { id: "baikal",type: "lake",      name: "Байкал",             lon: 108,  lat: 53 },
    { id: "caspi", type: "lake",      name: "Каспийское",         lon: 51,   lat: 42 },
    { id: "swamp", type: "swamp",     name: "Васюганское болото", lon: 78,   lat: 57 },
    { id: "vic",   type: "waterfall", name: "Виктория",           lon: 26,   lat: -18 },
    { id: "glac",  type: "glacier",   name: "Ледник Антарктиды",  lon: 15,   lat: -76 },
    { id: "evr",   type: "mountain",  name: "Эверест",            lon: 87,   lat: 28 },
    { id: "klu",   type: "volcano",   name: "Ключевская Сопка",   lon: 160,  lat: 56 },
    { id: "msk",   type: "city",      name: "Москва",             lon: 37.6, lat: 55.8 },
    { id: "jpn",   type: "country",   name: "Япония",             lon: 138,  lat: 37 },
  ];

  const WORD = {
    continent: "материк", ocean: "океан", river: "реку", lake: "озеро",
    swamp: "болото", waterfall: "водопад", glacier: "ледник",
    mountain: "гору", volcano: "вулкан", city: "город", country: "страну",
  };

  const $ = (s) => document.querySelector(s);

  // Переводим контуры материков/океанов из долготы/широты в пиксели карты
  CONTINENTS.concat(OCEANS).forEach((s) => {
    s.poly = s.ll.map(([lon, lat]) => [projX(lon), projY(lat)]);
    s.c = centroid(s.poly);
  });
  FEATURES.forEach((f) => { f.x = projX(f.lon); f.y = projY(f.lat); });

  function centroid(poly) {
    let x = 0, y = 0;
    poly.forEach((p) => { x += p[0]; y += p[1]; });
    return { x: x / poly.length, y: y / poly.length };
  }
  function inPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      const hit = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (hit) inside = !inside;
    }
    return inside;
  }
  const ptsStr = (poly) => poly.map((p) => p.join(",")).join(" ");
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Построение SVG-карты ----------
  function buildSVG() {
    let s = `<svg class="geomap" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Карта мира">`;
    // Фон — настоящая карта мира
    s += `<image href="worldmap.svg" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"></image>`;
    // Кликабельные (невидимые) зоны материков и океанов
    OCEANS.forEach((o) => { s += `<polygon id="o-${o.id}" class="zone" points="${ptsStr(o.poly)}"></polygon>`; });
    CONTINENTS.forEach((c) => { s += `<polygon id="c-${c.id}" class="zone" points="${ptsStr(c.poly)}"></polygon>`; });
    // Подписи (спрятаны, показываются после ответа)
    CONTINENTS.forEach((c) => { s += `<text id="tc-${c.id}" class="mlabel" x="${c.c.x}" y="${c.c.y}">${c.name}</text>`; });
    OCEANS.forEach((o) => { s += `<text id="to-${o.id}" class="mlabel ocean" x="${o.c.x}" y="${o.c.y}">${o.name}</text>`; });
    // Точки-объекты
    FEATURES.forEach((f) => {
      s += `<circle id="f-${f.id}" class="feat" cx="${f.x}" cy="${f.y}" r="8"></circle>`;
      s += `<text id="tf-${f.id}" class="flabel" x="${f.x}" y="${f.y - 13}">${f.name}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  // ---------- Состояние игры ----------
  const G = { queue: [], i: 0, score: 0, answered: false, finished: false };
  let svg = null;

  function buildQueue() {
    const all = []
      .concat(CONTINENTS.map((c) => ({ kind: "continent", id: c.id, name: c.name, cx: c.c.x, cy: c.c.y })))
      .concat(OCEANS.map((o) => ({ kind: "ocean", id: o.id, name: o.name, cx: o.c.x, cy: o.c.y })))
      .concat(FEATURES.map((f) => ({ kind: "feature", type: f.type, id: f.id, name: f.name, cx: f.x, cy: f.y })));
    return shuffle(all).slice(0, 12);
  }

  function start() {
    if (!svg) {
      $("#mapHost").innerHTML = buildSVG();
      svg = $(".geomap");
      svg.addEventListener("click", onClick);
    }
    G.queue = buildQueue();
    G.i = 0; G.score = 0; G.finished = false;
    if (window.showScreen) window.showScreen("map");
    render();
  }

  function clearMarks() {
    svg.querySelectorAll(".correct-shape,.wrong-shape,.correct-feat,.wrong-feat")
      .forEach((el) => el.classList.remove("correct-shape", "wrong-shape", "correct-feat", "wrong-feat"));
    svg.querySelectorAll(".mlabel.show,.flabel.show")
      .forEach((el) => el.classList.remove("show"));
  }

  function render() {
    G.answered = false;
    clearMarks();
    const t = G.queue[G.i];
    const word = t.kind === "continent" ? WORD.continent : t.kind === "ocean" ? WORD.ocean : WORD[t.type];
    $("#mapPrompt").innerHTML = `Найдите ${word}: <b>${t.name}</b>`;
    $("#mapCount").textContent = `${G.i + 1} / ${G.queue.length}`;
    $("#mapScore").textContent = G.score;
    $("#mapBar").style.width = `${(G.i / G.queue.length) * 100}%`;
    $("#mapFeedback").hidden = true;
    svg.classList.toggle("show-feats", t.kind === "feature");
    const next = $("#mapNext");
    next.disabled = true;
    next.textContent = G.i === G.queue.length - 1 ? "Завершить ✓" : "Дальше →";
    window.__mapTarget = { kind: t.kind, id: t.id, x: t.cx, y: t.cy };
    startTimer();
  }

  function toMap(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function onClick(evt) {
    if (G.answered || G.finished) return;
    stopTimer();
    const p = toMap(evt);
    const t = G.queue[G.i];
    let correct = false;

    if (t.kind === "feature") {
      let best = null, bestD = Infinity;
      FEATURES.forEach((f) => {
        const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2;
        if (d < bestD) { bestD = d; best = f; }
      });
      correct = best && best.id === t.id;
      $("#f-" + best.id).classList.add(correct ? "correct-feat" : "wrong-feat");
      $("#tf-" + best.id).classList.add("show");
      if (!correct) {
        $("#f-" + t.id).classList.add("correct-feat");
        $("#tf-" + t.id).classList.add("show");
      }
    } else {
      const set = t.kind === "continent" ? CONTINENTS : OCEANS;
      const pref = t.kind === "continent" ? "c-" : "o-";
      const tpref = t.kind === "continent" ? "tc-" : "to-";
      let found = null;
      set.forEach((sh) => { if (inPoly(p.x, p.y, sh.poly)) found = sh; });
      correct = found && found.id === t.id;
      $("#" + pref + t.id).classList.add("correct-shape");
      $("#" + tpref + t.id).classList.add("show");
      if (found && !correct) {
        $("#" + pref + found.id).classList.add("wrong-shape");
        $("#" + tpref + found.id).classList.add("show");
      }
    }

    G.answered = true;
    if (correct) {
      G.score++;
      // Очко в общий счёт ⭐ (как в викторине)
      if (typeof Store !== "undefined") {
        Store.data.points = (Store.data.points || 0) + 1;
        Store.save();
        const tp = $("#totalPoints");
        if (tp) tp.textContent = Store.data.points;
      }
    }
    if (typeof Sound !== "undefined") (correct ? Sound.correct() : Sound.wrong());
    $("#mapScore").textContent = G.score;
    const fb = $("#mapFeedback");
    fb.hidden = false;
    fb.className = "map-feedback " + (correct ? "ok" : "no");
    fb.innerHTML = correct
      ? `<strong>Верно! ✅</strong> Это <b>${t.name}</b>.`
      : `<strong>Мимо 🤔</strong> Правильное место подсвечено <span class="hl-green">зелёным</span>.`;
    $("#mapNext").disabled = false;
  }

  function next() {
    if (G.finished) { start(); return; }
    if (!G.answered) return;
    stopTimer();
    if (G.i < G.queue.length - 1) { G.i++; render(); }
    else finish();
  }

  function finish() {
    G.finished = true;
    $("#mapBar").style.width = "100%";
    const total = G.queue.length, sc = G.score, pct = Math.round((sc / total) * 100);
    let msg;
    if (pct === 100) msg = "🏆 Идеально! Вы отлично знаете карту.";
    else if (pct >= 70) msg = "🌟 Здорово! Почти всё нашли.";
    else if (pct >= 40) msg = "👍 Неплохо! Потренируйтесь ещё.";
    else msg = "🌱 Смелее — с каждым разом будете находить больше!";
    $("#mapPrompt").innerHTML = `🏁 Итог: <b>${sc} из ${total}</b>`;
    const fb = $("#mapFeedback");
    fb.hidden = false;
    fb.className = "map-feedback ok";
    fb.textContent = msg;
    clearMarks();
    svg.classList.remove("show-feats");
    const nb = $("#mapNext");
    nb.disabled = false;
    nb.textContent = "Играть снова ↻";
    window.__mapTarget = null;
    stopTimer();
    $("#mapTimer").hidden = true;
  }

  /* ----- Таймер (режим на время) ----- */
  function stopTimer() { if (G.timerId) { clearInterval(G.timerId); G.timerId = null; } }
  function startTimer() {
    stopTimer();
    const box = $("#mapTimer");
    G.timed = !!(typeof Store !== "undefined" && Store.data.timed);
    if (!G.timed || G.finished) { box.hidden = true; return; }
    G.qtime = (typeof Store !== "undefined" && Store.data.qtime) || 20;
    box.hidden = false;
    G.timeLeft = G.qtime;
    paintTimer();
    G.timerId = setInterval(() => {
      G.timeLeft--;
      paintTimer();
      if (G.timeLeft <= 0) { stopTimer(); onTimeout(); }
    }, 1000);
  }
  function paintTimer() {
    $("#mapTimerNum").textContent = G.timeLeft;
    const lowAt = Math.min(5, Math.ceil(G.qtime / 2));
    $("#mapTimer").classList.toggle("low", G.timeLeft <= lowAt);
  }
  function onTimeout() {
    if (G.answered || G.finished) return;
    G.answered = true;
    const t = G.queue[G.i];
    if (t.kind === "feature") {
      $("#f-" + t.id).classList.add("correct-feat");
      $("#tf-" + t.id).classList.add("show");
    } else {
      const pref = t.kind === "continent" ? "c-" : "o-";
      const tpref = t.kind === "continent" ? "tc-" : "to-";
      $("#" + pref + t.id).classList.add("correct-shape");
      $("#" + tpref + t.id).classList.add("show");
    }
    if (typeof Sound !== "undefined") Sound.wrong();
    const fb = $("#mapFeedback");
    fb.hidden = false;
    fb.className = "map-feedback no";
    fb.innerHTML = `<strong>⏱ Время вышло!</strong> Правильное место подсвечено <span class="hl-green">зелёным</span>.`;
    $("#mapNext").disabled = false;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const btn = $("#mapBtn");
    if (btn) btn.addEventListener("click", start);
    $("#mapNext").addEventListener("click", next);
    const quit = $("#mapQuit");
    if (quit) quit.addEventListener("click", () => {
      stopTimer();
      if (typeof renderHome === "function") renderHome();
      if (window.showScreen) window.showScreen("home");
    });
  });
})();
