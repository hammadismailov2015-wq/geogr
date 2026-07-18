/* ==========================================================================
   ИГРА «НАЙДИ НА КАРТЕ»
   Отдельный модуль: карта мира + задания «найди материк / океан / реку …».
   Ничего из quiz-логики (app.js) здесь не используется — только показ экрана.
   ========================================================================== */
"use strict";

(function () {
  // Размер «холста» карты (условные координаты, не настоящие градусы).
  const W = 1000, H = 520;

  // --- Материки: каждый — многоугольник (список точек [x, y]) ---
  const CONTINENTS = [
    { id: "na", name: "Северная Америка", poly: [[150,90],[260,80],[300,120],[280,170],[300,200],[250,240],[200,235],[170,190],[140,150]] },
    { id: "sa", name: "Южная Америка", poly: [[270,270],[320,265],[345,310],[330,370],[300,420],[275,400],[265,340]] },
    { id: "eu", name: "Европа", poly: [[470,110],[540,100],[560,140],[520,165],[475,150]] },
    { id: "af", name: "Африка", poly: [[480,195],[575,190],[600,250],[560,330],[520,350],[495,290],[480,240]] },
    { id: "as", name: "Азия", poly: [[575,95],[760,85],[830,120],[820,170],[740,200],[660,205],[600,175],[575,140]] },
    { id: "au", name: "Австралия", poly: [[800,320],[880,315],[900,355],[860,390],[805,375]] },
    { id: "an", name: "Антарктида", poly: [[150,470],[880,470],[880,510],[150,510]] },
  ];

  // --- Океаны: невидимые зоны для клика, подпись показывается после ответа ---
  const OCEANS = [
    { id: "pac", name: "Тихий", poly: [[10,90],[120,90],[120,430],[10,430]] },
    { id: "atl", name: "Атлантический", poly: [[360,110],[465,110],[465,400],[360,400]] },
    { id: "ind", name: "Индийский", poly: [[630,300],[790,300],[790,440],[630,440]] },
    { id: "arc", name: "Северный Ледовитый", poly: [[150,15],[820,15],[820,60],[150,60]] },
    { id: "sou", name: "Южный", poly: [[150,435],[880,435],[880,462],[150,462]] },
  ];

  // --- Точечные объекты: реки, озёра, горы и т.д. ---
  const FEATURES = [
    { id: "nil",   type: "river",     name: "Нил",                x: 565, y: 225 },
    { id: "amaz",  type: "river",     name: "Амазонка",           x: 300, y: 300 },
    { id: "volga", type: "river",     name: "Волга",              x: 562, y: 158 },
    { id: "baikal",type: "lake",      name: "Байкал",             x: 725, y: 165 },
    { id: "caspi", type: "lake",      name: "Каспийское",         x: 600, y: 180 },
    { id: "swamp", type: "swamp",     name: "Васюганское болото", x: 665, y: 120 },
    { id: "vic",   type: "waterfall", name: "Виктория",           x: 538, y: 308 },
    { id: "glac",  type: "glacier",   name: "Ледник Антарктиды",  x: 470, y: 488 },
    { id: "evr",   type: "mountain",  name: "Эверест",            x: 700, y: 198 },
    { id: "klu",   type: "volcano",   name: "Ключевская Сопка",   x: 820, y: 115 },
    { id: "msk",   type: "city",      name: "Москва",             x: 520, y: 135 },
    { id: "jpn",   type: "country",   name: "Япония",             x: 860, y: 182 },
  ];

  // Как называть тип объекта в задании «Найди …»
  const WORD = {
    continent: "материк", ocean: "океан", river: "реку", lake: "озеро",
    swamp: "болото", waterfall: "водопад", glacier: "ледник",
    mountain: "гору", volcano: "вулкан", city: "город", country: "страну",
  };

  // ---------- Вспомогательные функции ----------
  const $ = (s) => document.querySelector(s);

  function centroid(poly) {
    let x = 0, y = 0;
    poly.forEach((p) => { x += p[0]; y += p[1]; });
    return { x: x / poly.length, y: y / poly.length };
  }

  // Находится ли точка внутри многоугольника (алгоритм «испускания луча»)
  function inPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0], yi = poly[i][1];
      const xj = poly[j][0], yj = poly[j][1];
      const hit = (yi > py) !== (yj > py) &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (hit) inside = !inside;
    }
    return inside;
  }

  function pointsStr(poly) { return poly.map((p) => p.join(",")).join(" "); }
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Построение SVG-карты (один раз) ----------
  function buildSVG() {
    let s = `<svg class="geomap" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Карта мира">`;
    // Океанские зоны (прозрачные, подсвечиваются только при ответе)
    OCEANS.forEach((o) => {
      s += `<polygon id="o-${o.id}" class="ocean-zone" points="${pointsStr(o.poly)}"></polygon>`;
    });
    // Материки
    CONTINENTS.forEach((c) => {
      s += `<polygon id="c-${c.id}" class="land" points="${pointsStr(c.poly)}"></polygon>`;
    });
    // Подписи материков и океанов (спрятаны, показываются после ответа)
    CONTINENTS.forEach((c) => {
      const m = centroid(c.poly);
      s += `<text id="tc-${c.id}" class="mlabel" x="${m.x}" y="${m.y}">${c.name}</text>`;
    });
    OCEANS.forEach((o) => {
      const m = centroid(o.poly);
      s += `<text id="to-${o.id}" class="mlabel ocean" x="${m.x}" y="${m.y}">${o.name}</text>`;
    });
    // Точечные объекты + подписи
    FEATURES.forEach((f) => {
      s += `<circle id="f-${f.id}" class="feat" cx="${f.x}" cy="${f.y}" r="7"></circle>`;
      s += `<text id="tf-${f.id}" class="flabel" x="${f.x}" y="${f.y - 12}">${f.name}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  // ---------- Состояние игры ----------
  const G = { queue: [], i: 0, score: 0, answered: false, finished: false };
  let svg = null;

  function buildQueue() {
    const all = []
      .concat(CONTINENTS.map((c) => ({ kind: "continent", id: c.id, name: c.name, cx: centroid(c.poly).x, cy: centroid(c.poly).y })))
      .concat(OCEANS.map((o) => ({ kind: "ocean", id: o.id, name: o.name, cx: centroid(o.poly).x, cy: centroid(o.poly).y })))
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
    if (window.showScreen) window.showScreen("map"); // функция из app.js
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
    const word = t.kind === "continent" ? WORD.continent
      : t.kind === "ocean" ? WORD.ocean : WORD[t.type];
    $("#mapPrompt").innerHTML = `Найди ${word}: <b>${t.name}</b>`;
    $("#mapCount").textContent = `${G.i + 1} / ${G.queue.length}`;
    $("#mapScore").textContent = G.score;
    $("#mapBar").style.width = `${(G.i / G.queue.length) * 100}%`;
    $("#mapFeedback").hidden = true;
    // Точки-объекты видны только на «точечных» заданиях
    svg.classList.toggle("show-feats", t.kind === "feature");
    const next = $("#mapNext");
    next.disabled = true;
    next.textContent = G.i === G.queue.length - 1 ? "Завершить ✓" : "Дальше →";
    // Хук для автотестов: где находится правильный ответ (в координатах карты)
    window.__mapTarget = { kind: t.kind, id: t.id, x: t.cx, y: t.cy };
  }

  // Перевод координат клика мыши в координаты карты
  function toMap(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function onClick(evt) {
    if (G.answered || G.finished) return;
    const p = toMap(evt);
    const t = G.queue[G.i];
    let correct = false;

    if (t.kind === "feature") {
      // Ближайшая точка к клику
      let best = null, bestD = Infinity;
      FEATURES.forEach((f) => {
        const d = (f.x - p.x) ** 2 + (f.y - p.y) ** 2;
        if (d < bestD) { bestD = d; best = f; }
      });
      correct = best && best.id === t.id;
      const chosen = $("#f-" + best.id);
      chosen.classList.add(correct ? "correct-feat" : "wrong-feat");
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
      // Всегда подсвечиваем правильное место зелёным
      $("#" + pref + t.id).classList.add("correct-shape");
      $("#" + tpref + t.id).classList.add("show");
      if (found && !correct) {
        $("#" + pref + found.id).classList.add("wrong-shape");
        $("#" + tpref + found.id).classList.add("show");
      }
    }

    G.answered = true;
    if (correct) G.score++;
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
    if (G.finished) { start(); return; }         // «Играть снова»
    if (!G.answered) return;
    if (G.i < G.queue.length - 1) { G.i++; render(); }
    else finish();
  }

  function finish() {
    G.finished = true;
    $("#mapBar").style.width = "100%";
    const total = G.queue.length, sc = G.score, pct = Math.round((sc / total) * 100);
    let msg;
    if (pct === 100) msg = "🏆 Идеально! Ты отлично знаешь карту.";
    else if (pct >= 70) msg = "🌟 Здорово! Почти всё нашла.";
    else if (pct >= 40) msg = "👍 Неплохо! Потренируйся ещё.";
    else msg = "🌱 Смелее — с каждым разом будешь находить больше!";
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
  }

  // ---------- Подключение к странице ----------
  document.addEventListener("DOMContentLoaded", () => {
    const btn = $("#mapBtn");
    if (btn) btn.addEventListener("click", start);
    $("#mapNext").addEventListener("click", next);
    const quit = $("#mapQuit");
    if (quit) quit.addEventListener("click", () => {
      if (typeof renderHome === "function") renderHome();
      if (window.showScreen) window.showScreen("home");
    });
  });
})();
